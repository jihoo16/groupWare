/**
 * 관리자 연구비증빙관리 페이지
 *
 * - 카드사용일자 기준 월별 조회
 * - 과제별 / 카드별 / 문서종류별 / 첨부상태별 필터
 * - 한글 초성 검색 (과제명, 카드명, 작성자, 내용)
 * - 통계 카드 (총 건수, 총 금액, 첨부 완/누락)
 * - 카드사용일자 내림차순 정렬 (고정)
 * - 첨부파일 일괄 다운로드 (문서 단위, 개별 파일 순차 다운로드)
 * - 첨부 누락 행 배경색 강조
 */
document.addEventListener('DOMContentLoaded', function() {
    const searchUtils = new SearchUtils();

    // ============================================
    // 상수
    // ============================================
    const TYPE_NAMES = {
        'C0403': '야근식대',
        'C0404': '단독출장',
        'C0405': '출장+회의',
        'C0406': '회의록',
        'C0407': '재료비',
        'C0408': '장비비'
    };

    // 첨부 누락 판정 (project-documents.js의 getRowMissingClass와 동일 로직)
    function isMissingAttachment(doc) {
        const atts = doc.attachments || [];
        const type = doc.documentType;
        let checks;
        if (type === 'C0405') {
            checks = [
                atts.some(a => a.attachmentType === 'MEETING_RECEIPT'),
                atts.some(a => a.attachmentType === 'MEETING_DOCUMENT'),
                atts.some(a => a.attachmentType === 'TRIP_RECEIPT'),
                atts.some(a => a.attachmentType === 'TRIP_DOCUMENT'),
            ];
        } else if (type === 'C0407' || type === 'C0408') {
            checks = [
                atts.some(a => a.attachmentType === 'RECEIPT'),
                atts.some(a => a.attachmentType === 'DOCUMENT'),
            ];
            if (type === 'C0408') checks.push(atts.some(a => a.attachmentType === 'ESTIMATE'));
            if (doc.paymentType === 'transfer') checks.push(atts.some(a => a.attachmentType === 'BANK_COPY'));
        } else {
            // C0403/C0404/C0406: 영수증 + 공식문서
            checks = [
                atts.some(a => a.attachmentType !== 'DOCUMENT'),
                atts.some(a => a.attachmentType === 'DOCUMENT'),
            ];
        }
        return checks.some(c => !c);
    }

    /** 문서타입별 첨부파일 표시 아이콘 정의: [라벨, 매칭 attachmentType, 필수여부] */
    function getAttachmentSlots(doc) {
        const type = doc.documentType;
        if (type === 'C0405') {
            return [
                { label: '회의영수증', match: 'MEETING_RECEIPT', required: true },
                { label: '회의공식문서', match: 'MEETING_DOCUMENT', required: true },
                { label: '출장영수증', match: 'TRIP_RECEIPT', required: true },
                { label: '출장공식문서', match: 'TRIP_DOCUMENT', required: true },
            ];
        }
        if (type === 'C0407' || type === 'C0408') {
            const slots = [
                { label: type === 'C0408' ? '영수증' : '거래명세서', match: 'RECEIPT', required: true },
                { label: '공식문서', match: 'DOCUMENT', required: true },
            ];
            if (type === 'C0408') slots.push({ label: '견적서', match: 'ESTIMATE', required: true });
            if (doc.paymentType === 'transfer') {
                slots.push({ label: '통장사본', match: 'BANK_COPY', required: true });
            }
            return slots;
        }
        // C0403/C0404/C0406
        return [
            { label: '영수증', match: 'RECEIPT_NON_DOCUMENT', required: true },
            { label: '공식문서', match: 'DOCUMENT', required: true },
        ];
    }

    function hasAttachmentInSlot(doc, slot) {
        return getAttachmentsForSlot(doc, slot).length > 0;
    }

    /** 슬롯에 매칭되는 모든 첨부파일 반환 */
    function getAttachmentsForSlot(doc, slot) {
        const atts = doc.attachments || [];
        if (slot.match === 'RECEIPT_NON_DOCUMENT') {
            return atts.filter(a => a.attachmentType !== 'DOCUMENT');
        }
        return atts.filter(a => a.attachmentType === slot.match);
    }

    // ============================================
    // 상태
    // ============================================
    let allDocuments = [];      // 서버에서 받은 원본 (해당 월 전체)
    let filteredDocuments = []; // 필터/검색 적용 후
    let currentPage = 1;
    const PAGE_SIZE = 10;

    // ============================================
    // DOM 참조
    // ============================================
    const monthInput = document.getElementById('monthInput');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const projectFilter = document.getElementById('projectFilter');
    const cardFilter = document.getElementById('cardFilter');
    const typeFilter = document.getElementById('typeFilter');
    const attachmentFilter = document.getElementById('attachmentFilter');
    const searchInput = document.getElementById('searchInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const tableBody = document.getElementById('documentsTableBody');
    const paginationWrapper = document.getElementById('paginationWrapper');
    const statTotal = document.getElementById('statTotal');
    const statAmount = document.getElementById('statAmount');
    const statComplete = document.getElementById('statComplete');
    const statMissing = document.getElementById('statMissing');

    // ============================================
    // 초기화: 이번 달
    // ============================================
    const today = new Date();
    const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    monthInput.value = ym;

    loadDocuments();

    // ============================================
    // 이벤트
    // ============================================
    monthInput.addEventListener('change', loadDocuments);
    prevMonthBtn.addEventListener('click', () => shiftMonth(-1));
    nextMonthBtn.addEventListener('click', () => shiftMonth(1));
    refreshBtn.addEventListener('click', loadDocuments);

    projectFilter.addEventListener('change', () => {
        rebuildCardOptions();
        applyFilters();
    });
    cardFilter.addEventListener('change', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
    attachmentFilter.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters);

    function shiftMonth(delta) {
        const [y, m] = monthInput.value.split('-').map(Number);
        const d = new Date(y, m - 1 + delta, 1);
        monthInput.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        loadDocuments();
    }

    // ============================================
    // 데이터 로드
    // ============================================
    async function loadDocuments() {
        showLoading();
        const [year, month] = monthInput.value.split('-').map(Number);
        try {
            const res = await fetch(`/api/approval/documents/admin/receipts?year=${year}&month=${month}`);
            if (!res.ok) {
                throw new Error('데이터 조회 실패: ' + res.status);
            }
            allDocuments = await res.json();
            // 카드사용일자 내림차순 (서버에서도 정렬되지만 안전하게 한 번 더)
            allDocuments.sort((a, b) => {
                const da = a.cardUsageDate || '';
                const db = b.cardUsageDate || '';
                return db.localeCompare(da);
            });

            rebuildProjectOptions();
            rebuildCardOptions();
            applyFilters();
        } catch (err) {
            console.error(err);
            tableBody.innerHTML = `
                <tr><td colspan="9">
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>데이터를 불러오지 못했습니다.</p>
                    </div>
                </td></tr>`;
        }
    }

    function showLoading() {
        tableBody.innerHTML = `
            <tr class="loading-row"><td colspan="9">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>데이터를 불러오는 중...</p>
                </div>
            </td></tr>`;
    }

    // ============================================
    // 필터 옵션 재구성
    // ============================================
    function rebuildProjectOptions() {
        const map = new Map();
        allDocuments.forEach(d => {
            if (d.projectIdx && d.projectName) {
                map.set(d.projectIdx, d.projectName);
            }
        });
        const prevValue = projectFilter.value;
        projectFilter.innerHTML = '<option value="all">전체</option>';
        const sorted = Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'ko'));
        sorted.forEach(([idx, name]) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = name;
            projectFilter.appendChild(opt);
        });
        if (prevValue && projectFilter.querySelector(`option[value="${prevValue}"]`)) {
            projectFilter.value = prevValue;
        }
    }

    function rebuildCardOptions() {
        const projectVal = projectFilter.value;
        // 선택된 과제(또는 전체)의 카드만 모음
        const map = new Map();
        allDocuments.forEach(d => {
            if (projectVal !== 'all' && String(d.projectIdx) !== projectVal) return;
            if (d.cardIdx) {
                const label = formatCardLabel(d);
                map.set(d.cardIdx, label);
            }
        });
        const prevValue = cardFilter.value;
        cardFilter.innerHTML = '<option value="all">전체</option>';
        const sorted = Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'ko'));
        sorted.forEach(([idx, label]) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = label;
            cardFilter.appendChild(opt);
        });
        // 이전 선택값이 새 옵션에 없으면 전체로 리셋
        if (prevValue && cardFilter.querySelector(`option[value="${prevValue}"]`)) {
            cardFilter.value = prevValue;
        } else {
            cardFilter.value = 'all';
        }
    }

    function formatCardLabel(doc) {
        const parts = [];
        if (doc.cardNickname) parts.push(doc.cardNickname);
        else if (doc.cardCompany) parts.push(doc.cardCompany);
        if (doc.cardLastDigits) parts.push(`****${doc.cardLastDigits}`);
        return parts.join(' ') || '카드';
    }

    // ============================================
    // 필터 적용 + 렌더
    // ============================================
    function applyFilters() {
        const projectVal = projectFilter.value;
        const cardVal = cardFilter.value;
        const typeVal = typeFilter.value;
        const attVal = attachmentFilter.value;
        const keyword = (searchInput.value || '').trim();

        filteredDocuments = allDocuments.filter(d => {
            if (projectVal !== 'all' && String(d.projectIdx) !== projectVal) return false;
            if (cardVal !== 'all' && String(d.cardIdx) !== cardVal) return false;
            if (typeVal !== 'all' && d.documentType !== typeVal) return false;

            if (attVal !== 'all') {
                const missing = isMissingAttachment(d);
                if (attVal === 'complete' && missing) return false;
                if (attVal === 'missing' && !missing) return false;
            }

            if (keyword) {
                const haystack = [
                    d.projectName,
                    formatCardLabel(d),
                    d.drafterName,
                    d.purpose,
                    d.content,
                    d.location
                ].filter(Boolean).join(' ');
                if (!searchUtils.matchesSearch(haystack, keyword)) return false;
            }
            return true;
        });

        currentPage = 1;
        renderStats();
        renderTable();
        renderPagination();
    }

    // ============================================
    // 통계 렌더링
    // ============================================
    function renderStats() {
        const total = filteredDocuments.length;
        const totalAmount = filteredDocuments.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
        const completeCount = filteredDocuments.filter(d => !isMissingAttachment(d)).length;
        const missingCount = total - completeCount;

        statTotal.textContent = `${total.toLocaleString()}건`;
        statAmount.textContent = `${totalAmount.toLocaleString()}원`;
        statComplete.textContent = `${completeCount.toLocaleString()}건`;
        statMissing.textContent = `${missingCount.toLocaleString()}건`;
    }

    // ============================================
    // 테이블 렌더링
    // ============================================
    function renderTable() {
        if (filteredDocuments.length === 0) {
            tableBody.innerHTML = `
                <tr><td colspan="9">
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>조건에 맞는 문서가 없습니다.</p>
                    </div>
                </td></tr>`;
            return;
        }

        const start = (currentPage - 1) * PAGE_SIZE;
        const pageItems = filteredDocuments.slice(start, start + PAGE_SIZE);

        tableBody.innerHTML = pageItems.map(doc => buildRowHtml(doc)).join('');

        // 다운로드 버튼 이벤트 바인딩
        tableBody.querySelectorAll('.btn-download').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const idx = btn.dataset.docIdx;
                const doc = filteredDocuments.find(d => String(d.idx) === idx);
                if (doc) await downloadAllAttachments(doc, btn);
            });
        });

        // 첨부 아이콘 클릭 → 해당 종류의 파일을 미리보기 모달로 표시
        // (다운로드는 모달 안의 다운로드 버튼으로, 또는 행의 전체 다운로드 버튼으로 가능)
        tableBody.querySelectorAll('.att-icon.clickable').forEach(icon => {
            icon.addEventListener('click', async (e) => {
                e.stopPropagation();
                const idx = icon.dataset.docIdx;
                const slotIdx = parseInt(icon.dataset.slotIdx);
                const doc = filteredDocuments.find(d => String(d.idx) === idx);
                if (!doc) return;
                const slots = getAttachmentSlots(doc);
                const slot = slots[slotIdx];
                if (!slot) return;
                const files = getAttachmentsForSlot(doc, slot);
                if (!files || files.length === 0) {
                    Swal.fire({ icon: 'info', title: '첨부파일 없음', text: '미리보기할 파일이 없습니다.' });
                    return;
                }
                if (typeof window.openFilePreview !== 'function') {
                    console.error('file-preview-modal.js 가 로드되지 않았습니다.');
                    await downloadFiles(files, icon);
                    return;
                }
                const previewFiles = files
                    .filter(f => f.downloadUrl)
                    .map(f => ({ url: f.downloadUrl, filename: f.originalFilename }));
                window.openFilePreview(previewFiles, 0);
            });
        });

        // 상세 보기 버튼
        tableBody.querySelectorAll('.btn-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = btn.dataset.docIdx;
                const doc = filteredDocuments.find(d => String(d.idx) === idx);
                if (doc) openDocumentDetail(doc);
            });
        });
    }

    function buildRowHtml(doc) {
        const missing = isMissingAttachment(doc);
        const rowClass = missing ? 'row-missing-attachment' : '';
        const typeName = TYPE_NAMES[doc.documentType] || doc.documentType;
        const typeBadge = `<span class="type-badge type-${doc.documentType}">${typeName}</span>`;

        const cardLabel = formatCardLabel(doc);
        const cardHtml = doc.cardIdx ? `
            <div class="card-info">
                <span class="card-info-name">${escapeHtml(doc.cardNickname || doc.cardCompany || '카드')}</span>
                <span class="card-info-digits">${doc.cardLastDigits ? '****' + escapeHtml(doc.cardLastDigits) : ''}</span>
            </div>` : '<span style="color:#cbd5e1;">-</span>';

        const dateStr = doc.cardUsageDate ? formatDate(doc.cardUsageDate) : '-';
        const amount = Number(doc.amount) || 0;
        const amountStr = amount > 0 ? amount.toLocaleString() + '원' : '-';

        const isPurchase = doc.documentType === 'C0407' || doc.documentType === 'C0408';
        let paymentBadge = '<span style="color:#cbd5e1;">-</span>';
        if (isPurchase && doc.paymentType) {
            const isCard = doc.paymentType === 'card';
            paymentBadge = `<span class="payment-badge ${isCard ? 'pay-card' : 'pay-transfer'}">${isCard ? '카드' : '이체'}</span>`;
        }

        const slots = getAttachmentSlots(doc);
        const attHtml = `<div class="att-icons">${slots.map((slot, i) => {
            const matched = getAttachmentsForSlot(doc, slot);
            const has = matched.length > 0;
            const cls = has ? 'has clickable' : (slot.required ? 'missing-required' : '');
            const iconClass = getSlotIcon(slot.match);
            const titleSuffix = has ? ` · 클릭하여 다운로드 (${matched.length}개)` : ' (누락)';
            const dataAttr = has ? `data-doc-idx="${doc.idx}" data-slot-idx="${i}"` : '';
            return `<span class="att-icon ${cls}" ${dataAttr} data-tip="${escapeHtml(slot.label)}${titleSuffix}"><i class="${iconClass}"></i></span>`;
        }).join('')}</div>`;

        const fileCount = (doc.attachments || []).length;
        const downloadDisabled = fileCount === 0 ? 'disabled' : '';

        return `
            <tr class="${rowClass}">
                <td>${typeBadge}</td>
                <td><span data-tip="${escapeHtml(doc.projectName || '')}">${escapeHtml(doc.projectName || '-')}</span></td>
                <td>${cardHtml}</td>
                <td>${escapeHtml(doc.drafterName || '-')}</td>
                <td>${dateStr}</td>
                <td class="col-amount">${amountStr}</td>
                <td>${paymentBadge}</td>
                <td>${attHtml}</td>
                <td>
                    <div class="row-actions">
                        <button class="btn-row btn-detail" data-doc-idx="${doc.idx}" data-tip="상세 보기">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-row btn-download" data-doc-idx="${doc.idx}" data-tip="모든 첨부 다운로드 (${fileCount}개)" ${downloadDisabled}>
                            <i class="fas fa-download"></i> ${fileCount}
                        </button>
                    </div>
                </td>
            </tr>`;
    }

    function getSlotIcon(matchType) {
        switch (matchType) {
            case 'RECEIPT':
            case 'RECEIPT_NON_DOCUMENT':
            case 'MEETING_RECEIPT':
            case 'TRIP_RECEIPT':
                return 'fas fa-receipt';
            case 'DOCUMENT':
            case 'MEETING_DOCUMENT':
            case 'TRIP_DOCUMENT':
                return 'fas fa-file-alt';
            case 'ESTIMATE':
                return 'fas fa-file-invoice';
            case 'BANK_COPY':
                return 'fas fa-university';
            default:
                return 'fas fa-file';
        }
    }

    // ============================================
    // 페이징
    // ============================================
    function renderPagination() {
        const totalPages = Math.ceil(filteredDocuments.length / PAGE_SIZE);
        if (totalPages <= 1) {
            paginationWrapper.innerHTML = '';
            return;
        }

        let html = `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}"><i class="fas fa-chevron-left"></i></button>`;

        const maxButtons = 7;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        for (let p = startPage; p <= endPage; p++) {
            html += `<button class="${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
        }

        html += `<button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}"><i class="fas fa-chevron-right"></i></button>`;

        paginationWrapper.innerHTML = html;
        paginationWrapper.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (!isNaN(page) && page !== currentPage) {
                    currentPage = page;
                    renderTable();
                    renderPagination();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    // ============================================
    // 다운로드 (개별 파일 순차 다운로드)
    // ============================================
    async function downloadAllAttachments(doc, btn) {
        await downloadFiles(doc.attachments || [], btn);
    }

    /**
     * 파일 배열을 받아 순차적으로 개별 다운로드.
     * trigger 요소가 있으면 진행 중 spinner로 시각 피드백.
     */
    async function downloadFiles(files, triggerEl) {
        if (!files || files.length === 0) {
            Swal.fire({ icon: 'info', title: '첨부파일 없음', text: '다운로드할 파일이 없습니다.' });
            return;
        }

        let originalHtml = null;
        if (triggerEl) {
            triggerEl.classList.add('downloading');
            if (!triggerEl.disabled) triggerEl.disabled = true;
            originalHtml = triggerEl.innerHTML;
            triggerEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        try {
            for (const att of files) {
                if (!att.downloadUrl) continue;
                triggerDownload(att.downloadUrl, att.originalFilename);
                // 브라우저가 빠른 연속 다운로드를 차단할 수 있으므로 약간 간격
                await sleep(250);
            }
        } catch (err) {
            console.error(err);
            Swal.fire({ icon: 'error', title: '다운로드 실패', text: err.message || '오류가 발생했습니다.' });
        } finally {
            if (triggerEl) {
                triggerEl.classList.remove('downloading');
                triggerEl.disabled = false;
                if (originalHtml != null) triggerEl.innerHTML = originalHtml;
            }
        }
    }

    function triggerDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        if (filename) a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============================================
    // 상세 보기
    // ============================================
    function openDocumentDetail(doc) {
        const url = buildDetailUrl(doc);
        if (url) {
            // noopener: 새 탭에서 window.opener가 없으므로 popup-mode(사이드바 숨김) 미적용
            window.open(url, '_blank', 'noopener');
        }
    }

    function buildDetailUrl(doc) {
        const t = doc.documentType;
        const id = doc.idx;  // approval_documents.idx (by-document API가 기대하는 값)
        if (!id) return null;
        switch (t) {
            case 'C0403': return `/approval/receipt-overtime?documentIdx=${id}`;
            case 'C0404': return `/approval/receipt-trip?documentIdx=${id}`;
            case 'C0405': return `/approval/receipt-trip-meeting?documentIdx=${id}`;
            case 'C0406': return `/approval/receipt-meeting?documentIdx=${id}`;
            case 'C0407': return `/approval/receipt-purchase?type=material&documentIdx=${id}`;
            case 'C0408': return `/approval/receipt-purchase?type=equipment&documentIdx=${id}`;
            default: return null;
        }
    }

    // ============================================
    // 유틸
    // ============================================
    function formatDate(dateStr) {
        if (!dateStr) return '';
        // ISO date "YYYY-MM-DD" 또는 datetime
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
});
