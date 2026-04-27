document.addEventListener('DOMContentLoaded', function() {

    // 검색 유틸리티 (공통)
    const searchUtils = new SearchUtils();
    const matchesKoreanSearch = (text, searchTerm) => searchUtils.matchesSearch(text, searchTerm);
    const highlightText = (text, searchTerm) => searchUtils.highlightText(text, searchTerm, 'highlight-text');

    let allDocuments = [];
    let filteredDocuments = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentSortField = 'createdAt';
    let currentSortOrder = 'desc';
    let selectedSettlementMonth = null; // null = 전체, 'YYYY-MM' = 특정 정산월

    // DOM 요소
    const userSearchInput = document.getElementById('userSearchInput');
    const statusFilter = document.getElementById('statusFilter');
    const yearFilter = document.getElementById('yearFilter');
    const searchInput = document.getElementById('searchInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const documentsList = document.getElementById('documentsList');

    // 초기 데이터 로드
    loadDocuments();

    // 이벤트 리스너
    refreshBtn.addEventListener('click', loadDocuments);
    userSearchInput.addEventListener('input', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    yearFilter.addEventListener('change', () => { selectedSettlementMonth = null; applyFilters(); });
    searchInput.addEventListener('input', applyFilters);

    async function loadDocuments() {
        try {
            showLoading();
            const response = await fetch('/api/approval/expense/admin/documents');
            if (!response.ok) throw new Error('문서 목록 조회 실패');
            allDocuments = await response.json();
            populateYearFilter();
            applyFilters();
        } catch (error) {
            console.error('[사용자 지출 내역 불러오기 실패]', error);
            showError('사용자 지출 내역을 불러오지 못했습니다.');
            showLoadFailure('사용자 지출 내역');
        }
    }

    function populateYearFilter() {
        // 정산연도 기준 — getSettlementMonth('YYYY-MM') 의 YYYY
        const years = [...new Set(allDocuments.map(doc => {
            const sm = getSettlementMonth(doc.createdAt);
            return sm ? parseInt(sm.split('-')[0]) : null;
        }))].filter(Boolean).sort((a, b) => b - a);

        yearFilter.innerHTML = '<option value="">전체</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}년`;
            yearFilter.appendChild(option);
        });
    }

    // ── 정산월 계산 (14일 기준) ─────────────────────────────────

    /** createdAt → 정산월 'YYYY-MM' (14일 이후 작성 → 익월, 13일 이하 → 당월) */
    function getSettlementMonth(dateStr) {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        if (d.getDate() >= 14) {
            d.setMonth(d.getMonth() + 1);
        }
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    /** 정산월 key → 실제 기간 { start, end } */
    function getSettlementPeriod(monthKey) {
        const [year, month] = monthKey.split('-').map(Number);
        // 정산월 M → 전월 14일 ~ 당월 13일
        const prev = new Date(year, month - 2, 14);
        const end = new Date(year, month - 1, 13, 23, 59, 59);
        const currentYear = new Date().getFullYear();
        // 현재 연도가 아니면 '25.12월 형식으로 연도 노출
        const label = (year === currentYear)
            ? `${month}월`
            : `'${String(year).slice(-2)}.${month}월`;
        // 기간 툴팁: 연도 경계를 정확히 표현
        const rangeText =
            `${prev.getFullYear()}.${prev.getMonth() + 1}/14` +
            ` ~ ${end.getFullYear()}.${end.getMonth() + 1}/13`;
        return {
            start: prev,
            end: end,
            label,
            range: rangeText
        };
    }

    /**
     * 정산월 뱃지 목록 계산 (정산연도 기준)
     * - 연도 필터 선택: 해당 연도의 정산월만
     * - 연도 필터 미선택(전체): 오늘 기준 최근 6개월만 (롤링 윈도우)
     */
    function getMonthBadges() {
        const selectedYear = yearFilter.value;

        // 최근 6개월 키 집합 계산 (오늘의 정산월부터 5개월 과거까지)
        const recentKeys = new Set();
        if (!selectedYear) {
            const todayKey = getSettlementMonth(new Date().toISOString());
            if (todayKey) {
                const [ty, tm] = todayKey.split('-').map(Number);
                for (let i = 0; i < 6; i++) {
                    const d = new Date(ty, tm - 1 - i, 1);
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    recentKeys.add(key);
                }
            }
        }

        const monthMap = {};
        allDocuments.filter(doc => !doc.deleted).forEach(doc => {
            const sm = getSettlementMonth(doc.createdAt);
            if (!sm) return;
            const smYear = sm.split('-')[0];

            if (selectedYear) {
                if (smYear !== selectedYear) return;
            } else {
                if (!recentKeys.has(sm)) return;
            }

            if (!monthMap[sm]) monthMap[sm] = 0;
            monthMap[sm]++;
        });

        return Object.entries(monthMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, count]) => ({ key, count, ...getSettlementPeriod(key) }));
    }

    function renderMonthBadges() {
        const badges = getMonthBadges();
        if (badges.length === 0) return '';

        return `
            <div class="settlement-month-bar">
                <span class="settlement-label"><i class="fas fa-calendar-check"></i> 정산월</span>
                <div class="settlement-badges">
                    <button class="settlement-badge ${selectedSettlementMonth === null ? 'active' : ''}"
                            onclick="selectSettlementMonth(null)">
                        전체
                    </button>
                    ${badges.map(b => `
                        <button class="settlement-badge ${selectedSettlementMonth === b.key ? 'active' : ''}"
                                onclick="selectSettlementMonth('${b.key}')"
                                data-tip="${b.range}">
                            ${b.label} <span class="settlement-count">${b.count}</span>
                        </button>
                    `).join('')}
                </div>
            </div>`;
    }

    window.selectSettlementMonth = function(monthKey) {
        selectedSettlementMonth = monthKey;
        applyFilters();
    };

    // ── 필터 / 정렬 ──────────────────────────────────────────

    function applyFilters() {
        const userSearch = userSearchInput.value.trim();
        const selectedStatus = statusFilter.value;
        const selectedYear = yearFilter.value;
        const searchTerm = searchInput.value.trim();

        filteredDocuments = allDocuments.filter(doc => {
            if (userSearch && !matchesKoreanSearch(doc.userName, userSearch)) return false;

            if (selectedStatus === 'active' && doc.deleted) return false;
            if (selectedStatus === 'deleted' && !doc.deleted) return false;

            // 정산연도 / 정산월 필터 (createdAt 이 아니라 정산월 기준)
            const docSettlementMonth = getSettlementMonth(doc.createdAt);
            if (selectedYear) {
                const docSettlementYear = docSettlementMonth ? docSettlementMonth.split('-')[0] : null;
                if (docSettlementYear !== selectedYear) return false;
            }
            if (selectedSettlementMonth) {
                if (docSettlementMonth !== selectedSettlementMonth) return false;
            }

            if (searchTerm) {
                const searchable = [doc.userDeptName, doc.userDept, doc.documentNumber].filter(Boolean).join(' ').toLowerCase();
                if (!searchable.includes(searchTerm.toLowerCase())) return false;
            }

            return true;
        });

        currentPage = 1;
        sortDocuments();
        renderDocuments();
    }

    /**
     * 문서 정렬 — 삭제 건은 뒤로, 나머지는 최신순
     */
    function sortDocuments() {
        filteredDocuments.sort((a, b) => {
            if (!!a.deleted !== !!b.deleted) return a.deleted ? 1 : -1;
            const aDate = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const bDate = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return bDate - aDate;
        });
    }

    window.changeSortOrder = function(field) {
        if (currentSortField === field) {
            currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortField = field;
            currentSortOrder = 'desc';
        }
        currentPage = 1;
        sortDocuments();
        renderDocuments();
    };

    // ── 렌더링 ───────────────────────────────────────────────

    function renderDocuments() {
        if (filteredDocuments.length === 0) { showEmpty(); return; }

        const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const currentDocuments = filteredDocuments.slice(startIndex, startIndex + itemsPerPage);

        const getSortIcon = (field) => {
            if (currentSortField !== field) return '<i class="fas fa-sort sort-icon"></i>';
            return currentSortOrder === 'asc'
                ? '<i class="fas fa-sort-up sort-icon active"></i>'
                : '<i class="fas fa-sort-down sort-icon active"></i>';
        };

        const userSearch = userSearchInput.value.trim();

        const table = `
            <div class="table-header-info">
                <div class="total-count">
                    <i class="fas fa-file-alt"></i>
                    총 <strong>${filteredDocuments.length}</strong>건
                </div>
            </div>
            ${renderMonthBadges()}
            <table class="documents-table">
                <thead>
                    <tr>
                        <th class="sortable" onclick="changeSortOrder('createdAt')">
                            작성일 ${getSortIcon('createdAt')}
                        </th>
                        <th class="sortable" onclick="changeSortOrder('userName')">
                            사용자 ${getSortIcon('userName')}
                        </th>
                        <th class="sortable" onclick="changeSortOrder('userDeptName')">
                            부서 ${getSortIcon('userDeptName')}
                        </th>
                        <th>문서번호</th>
                        <th class="sortable" onclick="changeSortOrder('totalAmount')">
                            합계금액 ${getSortIcon('totalAmount')}
                        </th>
                        <th>영수증</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody id="documentsTableBody">
                    ${currentDocuments.map(doc => {
                        const isDeleted = doc.deleted;
                        const rowClass = isDeleted ? 'class="deleted-row"' : '';
                        const userName = userSearch ? highlightText(doc.userName || '-', userSearch) : (doc.userName || '-');

                        // 첨부 개수 표시 (완료/누락 판정 없음 — 작성 도구 모드)
                        const attachCount = doc.receiptAttachedCount || 0;
                        const receiptStatus = attachCount > 0
                            ? `<span class="badge badge-neutral">${attachCount}건</span>`
                            : `<span class="badge badge-neutral">-</span>`;

                        return `
                        <tr ${rowClass} onclick="viewDocument(${doc.idx})" style="cursor: pointer;">
                            <td>${formatDateTime(doc.createdAt)}</td>
                            <td><strong>${userName}</strong><br><small style="color:#94a3b8;">${doc.userPosition || ''}</small></td>
                            <td>${doc.userDeptName || doc.userDept || '-'}</td>
                            <td><code style="font-size:12px;">${doc.documentNumber || '-'}</code></td>
                            <td style="text-align:right;font-weight:600;font-variant-numeric:tabular-nums;">${formatAmount(doc.totalAmount)}</td>
                            <td style="text-align:center;" onclick="event.stopPropagation(); showFileModal(${doc.idx}, 'receipt')" class="badge-cell">${receiptStatus}</td>
                            <td onclick="event.stopPropagation()">
                                <div class="action-buttons">
                                    <button class="btn-view" onclick="viewDocument(${doc.idx})">
                                        <i class="fas fa-eye"></i> 보기
                                    </button>
                                    <button class="btn-delete ${isDeleted ? 'disabled' : ''}"
                                            onclick="${isDeleted ? 'return false;' : `deleteDocument(${doc.idx}, '${doc.userName}')`}"
                                            ${isDeleted ? 'disabled data-tip="이미 삭제된 문서입니다."' : ''}>
                                        <i class="fas fa-trash"></i> 삭제
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
            ${totalPages > 1 ? renderPagination(totalPages) : ''}
        `;

        documentsList.innerHTML = table;
    }

    // ── 페이지네이션 ─────────────────────────────────────────

    function renderPagination(totalPages) {
        let pagination = '<div class="pagination">';
        if (currentPage > 1) {
            pagination += `<button class="page-btn" onclick="goToPage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
        }
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

        if (startPage > 1) {
            pagination += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
            if (startPage > 2) pagination += `<span class="page-dots">...</span>`;
        }
        for (let i = startPage; i <= endPage; i++) {
            pagination += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) pagination += `<span class="page-dots">...</span>`;
            pagination += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
        }
        if (currentPage < totalPages) {
            pagination += `<button class="page-btn" onclick="goToPage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
        }
        pagination += '</div>';
        return pagination;
    }

    window.goToPage = function(page) {
        currentPage = page;
        renderDocuments();
    };

    // ── 문서 액션 ────────────────────────────────────────────

    window.viewDocument = function(idx) {
        window.location.href = `/approval/expense/detail?idx=${idx}`;
    };

    window.deleteDocument = async function(idx, userName) {
        const confirmed = await Swal.fire({
            title: '개인경비청구 삭제',
            text: `${userName}님의 개인경비청구를 삭제하시겠습니까?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '삭제',
            cancelButtonText: '취소'
        });

        if (!confirmed.isConfirmed) return;

        try {
            const response = await fetch(`/api/approval/expense/admin/documents/${idx}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '삭제 실패');
            }
            await Swal.fire({
                icon: 'success',
                title: '삭제 완료',
                text: '개인경비청구가 삭제되었습니다.',
                timer: 1500,
                showConfirmButton: false
            });
            loadDocuments();
        } catch (error) {
            console.error('[지출결의서 삭제 실패]', error);
            showDeleteFailure('지출결의서');
        }
    };

    // ── 파일 정보 모달 ─────────────────────────────────────────

    // 모달 안에서 파일을 클릭하면 미리보기를 띄우기 위해, 현재 모달의 파일 메타를 임시 저장
    let currentModalFiles = [];

    window.showFileModal = async function(idx, type) {
        try {
            const response = await fetch(`/api/approval/expense/${idx}`);
            if (!response.ok) throw new Error('문서 상세 조회 실패');
            const data = await response.json();

            let title, body;
            currentModalFiles = [];

            if (type === 'receipt') {
                title = '<i class="fas fa-receipt"></i> 항목별 영수증 현황';
                if (!data.expenseDetails || data.expenseDetails.length === 0) {
                    body = '<div class="file-modal-empty"><i class="fas fa-inbox"></i><p>지출 항목이 없습니다.</p></div>';
                } else {
                    // 모든 항목 첨부를 한 배열로 평탄화 — 모달 안에서 전후 네비게이션 가능
                    // 각 영수증에는 해당 지출 항목의 메타정보(지출일/적요/금액)를 같이 첨부 →
                    // 미리보기 모달에서 실제 영수증 이미지와 신청 내용을 한 화면에서 비교 가능
                    data.expenseDetails.forEach(d => {
                        const detailMeta = [
                            { label: '지출일', value: d.expenseDate || '-' },
                            { label: '적요',   value: d.description || '-' },
                            { label: '금액',   value: formatAmount(d.amount) },
                        ];
                        (d.attachments || []).forEach(a => {
                            currentModalFiles.push({
                                url: `/api/approval/expense/attachments/${a.idx}/download`,
                                filename: a.originalFilename,
                                meta: detailMeta,
                            });
                        });
                    });

                    // 속성값에 들어갈 파일명 escape (data-tip 등)
                    const escAttr = (s) => String(s || '')
                        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

                    // 관리자 업로드 안내
                    const guide = `<div class="admin-upload-guide">` +
                        `<div class="admin-upload-guide-line">` +
                            `<i class="fas fa-circle-info"></i>` +
                            `직원이 누락한 영수증을 관리자 권한으로 첨부할 수 있습니다.` +
                        `</div>` +
                        `<div class="admin-upload-guide-line sub">` +
                            `행 클릭 후 <kbd>Ctrl</kbd>+<kbd>V</kbd>, 드래그&드롭, 또는 ` +
                            `<i class="fas fa-plus-circle"></i> 버튼을 사용하세요.` +
                        `</div>` +
                    `</div>`;

                    body = guide + `<table class="file-modal-table">
                        <thead><tr><th>지출일</th><th>적요</th><th>상호</th><th>금액</th><th>영수증</th></tr></thead>
                        <tbody>${data.expenseDetails.map(d => {
                            const hasFiles = d.attachments && d.attachments.length > 0;
                            const fileList = hasFiles
                                ? d.attachments.map(a => {
                                    const flatIdx = currentModalFiles.findIndex(f => f.filename === a.originalFilename
                                        && f.url === `/api/approval/expense/attachments/${a.idx}/download`);
                                    return `<button type="button" class="receipt-clip-btn attached file-preview-trigger" data-preview-idx="${flatIdx}" data-tip="${escAttr(a.originalFilename)}" aria-label="${escAttr(a.originalFilename)}"><i class="fas fa-paperclip"></i></button>`;
                                }).join('')
                                : '<span class="receipt-clip-btn missing" data-tip="미첨부" aria-label="영수증 미첨부"><i class="fas fa-paperclip"></i></span>';
                            // 관리자 대리 업로드 버튼 — 첨부 유무 무관 항상 노출
                            const adminAddBtn = `<button type="button" class="admin-upload-btn" data-detail-idx="${d.idx}" data-tip="영수증 관리자 업로드"><i class="fas fa-plus-circle"></i></button>`;
                            return `<tr class="receipt-detail-row" data-detail-idx="${d.idx}">
                                <td>${d.expenseDate || '-'}</td>
                                <td>${d.description || '-'}</td>
                                <td>${d.shopName || '-'}</td>
                                <td style="text-align:right;font-variant-numeric:tabular-nums;">${formatAmount(d.amount)}</td>
                                <td class="receipt-cell">${fileList}${adminAddBtn}</td>
                            </tr>`;
                        }).join('')}</tbody>
                    </table>
                    <input type="file" id="adminReceiptHiddenInput" multiple hidden accept="image/*,.pdf">`;

                    // 모달 컨텍스트 메타 저장 (paste 핸들러가 참조)
                    currentReceiptModalDocIdx = idx;
                }
            } else {
                title = '<i class="fas fa-file-signature"></i> 서명완료 공식문서';
                const docFiles = (data.attachments || []).filter(a => a.attachmentType === 'DOCUMENT');
                if (docFiles.length === 0) {
                    body = '<div class="file-modal-empty"><i class="fas fa-file-excel"></i><p>공식문서가 첨부되지 않았습니다.</p></div>';
                } else {
                    docFiles.forEach(a => {
                        currentModalFiles.push({
                            url: `/api/approval/expense/attachments/${a.idx}/download`,
                            filename: a.originalFilename,
                        });
                    });

                    body = `<div class="file-modal-list">${docFiles.map((a, i) => `
                        <button type="button" class="file-modal-item file-preview-trigger" data-preview-idx="${i}">
                            <div class="file-icon"><i class="${getFileIcon(a.originalFilename)}"></i></div>
                            <div class="file-info">
                                <span class="file-name">${a.originalFilename}</span>
                                <span class="file-size">${formatFileSize(a.fileSize)}</span>
                            </div>
                            <i class="fas fa-eye file-download-icon"></i>
                        </button>
                    `).join('')}</div>`;
                }
            }

            openFileModal(title, body);

            // 미리보기 트리거 바인딩
            const modalBody = document.getElementById('fileModalBody');
            if (modalBody) {
                modalBody.querySelectorAll('.file-preview-trigger').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const previewIdx = parseInt(btn.dataset.previewIdx, 10);
                        if (Number.isNaN(previewIdx) || previewIdx < 0) return;
                        if (typeof window.openFilePreview !== 'function') {
                            console.error('file-preview-modal.js 가 로드되지 않았습니다.');
                            return;
                        }
                        window.openFilePreview(currentModalFiles, previewIdx);
                    });
                });

                // 관리자 대리 업로드 — 영수증 모달에만 적용
                if (type === 'receipt') {
                    setupAdminReceiptUpload(modalBody, idx);
                }
            }
        } catch (error) {
            console.error('파일 정보 조회 오류:', error);
            Swal.fire({ icon: 'error', title: '조회 실패', text: '파일 정보를 불러올 수 없습니다.' });
        }
    };

    // ============================================
    // 관리자 대리 영수증 업로드 (모달 안에서)
    // 파일 탐색기 / drag&drop / 클립보드 paste 3가지 모두 지원
    // ============================================
    let currentReceiptModalDocIdx = null;
    let activeAdminUploadRow = null;
    let _adminPasteRegistered = false;

    function setActiveAdminUploadRow(rowEl) {
        if (!rowEl) return;
        document.querySelectorAll('.receipt-detail-row.paste-active').forEach(el => {
            el.classList.remove('paste-active');
        });
        rowEl.classList.add('paste-active');
        activeAdminUploadRow = rowEl;
    }

    /** detail row에 영수증 파일 즉시 업로드 (관리자 대리) */
    async function uploadAdminReceiptFiles(detailIdx, fileList) {
        if (!detailIdx || !fileList || fileList.length === 0) return;
        const validFiles = Array.from(fileList).filter(f => {
            if (f.size > 50 * 1024 * 1024) {
                Swal.fire({ icon: 'warning', title: '파일 크기 초과', text: `50MB를 초과합니다: ${f.name}` });
                return false;
            }
            return true;
        });
        if (validFiles.length === 0) return;

        const formData = new FormData();
        validFiles.forEach(f => formData.append('files', f));

        try {
            const res = await fetch(`/api/approval/expense/detail/${detailIdx}/attachments`, {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                if (typeof window.showToast === 'function') {
                    window.showToast(`영수증 ${validFiles.length}개 관리자 업로드 완료`, 'success');
                }
                // 모달 새로고침: 같은 문서로 모달 다시 열기 + 백그라운드 리스트도 새로고침
                const docIdx = currentReceiptModalDocIdx;
                if (docIdx) {
                    await window.showFileModal(docIdx, 'receipt');
                }
                loadDocuments();
            } else {
                const errBody = await res.json().catch(() => ({}));
                console.error('[관리자 영수증 업로드 거부]', res.status, errBody);
                if (res.status === 403) {
                    showPermissionDenied('영수증 대리 업로드');
                } else {
                    showUploadFailure('영수증');
                }
            }
        } catch (err) {
            console.error('[관리자 영수증 업로드 실패]', err);
            showUploadFailure('영수증');
        }
    }

    function setupAdminReceiptUpload(modalBody, docIdx) {
        currentReceiptModalDocIdx = docIdx;
        activeAdminUploadRow = null;

        const rows = modalBody.querySelectorAll('.receipt-detail-row');

        // 1. 행 클릭 → 활성 row 전환
        rows.forEach(row => {
            row.addEventListener('click', function(e) {
                // 미리보기 버튼/+ 버튼 클릭은 활성 전환만 (이벤트 진행은 막지 않음)
                setActiveAdminUploadRow(this);
            });
            // paste 안내 뱃지 (활성 row에서만 CSS로 표시)
            const rcell = row.querySelector('td:last-child') || row.querySelector('td');
            if (rcell && typeof window.ensurePasteHint === 'function') {
                window.ensurePasteHint(rcell, { text: 'Ctrl+V', position: 'append' });
            }

            // 2. drag & drop — 각 row에 핸들러
            row.addEventListener('dragover', function(e) {
                e.preventDefault();
                row.classList.add('drag-over');
            });
            row.addEventListener('dragleave', function(e) {
                if (!row.contains(e.relatedTarget)) row.classList.remove('drag-over');
            });
            row.addEventListener('drop', function(e) {
                e.preventDefault();
                row.classList.remove('drag-over');
                const detailIdx = row.dataset.detailIdx;
                if (!detailIdx) return;
                uploadAdminReceiptFiles(detailIdx, e.dataTransfer.files);
            });
        });

        // 첫 행 기본 활성
        if (rows.length > 0) setActiveAdminUploadRow(rows[0]);

        // 3. + 버튼 → hidden file input click (활성 row의 detailIdx 사용)
        const hiddenInput = modalBody.querySelector('#adminReceiptHiddenInput');
        modalBody.querySelectorAll('.admin-upload-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const row = this.closest('.receipt-detail-row');
                if (row) setActiveAdminUploadRow(row);
                if (hiddenInput) hiddenInput.click();
            });
        });
        if (hiddenInput) {
            hiddenInput.addEventListener('change', function() {
                if (!activeAdminUploadRow || this.files.length === 0) return;
                const detailIdx = activeAdminUploadRow.dataset.detailIdx;
                uploadAdminReceiptFiles(detailIdx, this.files);
                this.value = '';
            });
        }

        // 4. 클립보드 paste — 페이지 전체에서 한 번만 등록
        if (_adminPasteRegistered) return;
        if (typeof window.setupClipboardImagePaste !== 'function') return;
        _adminPasteRegistered = true;

        // batch 디바운스: 같은 paste 이벤트 내 여러 이미지를 한 번에 업로드
        let pasteBuffer = [];
        let pasteTimer = null;
        let pasteTargetIdx = null;

        function flushPasteBuffer() {
            pasteTimer = null;
            if (!pasteTargetIdx || pasteBuffer.length === 0) {
                pasteBuffer = [];
                pasteTargetIdx = null;
                return;
            }
            const dt = new DataTransfer();
            pasteBuffer.forEach(f => dt.items.add(f));
            const idx2 = pasteTargetIdx;
            pasteBuffer = [];
            pasteTargetIdx = null;
            uploadAdminReceiptFiles(idx2, dt.files);
        }

        window.setupClipboardImagePaste({
            resolveTarget: () => {
                // 모달이 열려 있을 때만 활성 (아니면 일반 paste 통과)
                const overlay = document.getElementById('fileModalOverlay');
                if (!overlay || !overlay.classList.contains('active')) return null;
                if (!activeAdminUploadRow || !document.body.contains(activeAdminUploadRow)) return null;
                const detailIdx = activeAdminUploadRow.dataset.detailIdx;
                if (!detailIdx) return null;
                return {
                    addFile: (file) => {
                        if (file.size > 50 * 1024 * 1024) {
                            Swal.fire({ icon: 'warning', title: '파일 크기 초과', text: `50MB를 초과합니다: ${file.name}` });
                            return false;
                        }
                        pasteTargetIdx = detailIdx;
                        pasteBuffer.push(file);
                        if (pasteTimer === null) {
                            pasteTimer = setTimeout(flushPasteBuffer, 0);
                        }
                        return true;
                    },
                    label: '영수증 (관리자 업로드)',
                };
            },
        });
    }

    function openFileModal(title, body) {
        let overlay = document.getElementById('fileModalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'fileModalOverlay';
            overlay.className = 'file-modal-overlay';
            overlay.innerHTML = `
                <div class="file-modal">
                    <div class="file-modal-header">
                        <h3 id="fileModalTitle"></h3>
                        <button class="file-modal-close" id="fileModalCloseBtn"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="file-modal-body" id="fileModalBody"></div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFileModal(); });
            document.getElementById('fileModalCloseBtn').addEventListener('click', closeFileModal);
        }
        document.getElementById('fileModalTitle').innerHTML = title;
        document.getElementById('fileModalBody').innerHTML = body;
        overlay.classList.add('active');
    }

    function closeFileModal() {
        const overlay = document.getElementById('fileModalOverlay');
        if (overlay) overlay.classList.remove('active');
    }

    function truncateFilename(name, maxLen) {
        if (!name || name.length <= maxLen) return name || '';
        const ext = name.lastIndexOf('.') > -1 ? name.substring(name.lastIndexOf('.')) : '';
        return name.substring(0, maxLen - ext.length - 2) + '..' + ext;
    }

    function getFileIcon(filename) {
        if (!filename) return 'fas fa-file';
        const ext = filename.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'fas fa-file-image';
        if (['pdf'].includes(ext)) return 'fas fa-file-pdf';
        if (['doc', 'docx'].includes(ext)) return 'fas fa-file-word';
        if (['xls', 'xlsx'].includes(ext)) return 'fas fa-file-excel';
        if (['zip', 'rar', '7z'].includes(ext)) return 'fas fa-file-archive';
        return 'fas fa-file';
    }

    function formatFileSize(bytes) {
        if (!bytes) return '-';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // ── 유틸리티 ─────────────────────────────────────────────

    function formatDateTime(dateTimeString) {
        if (!dateTimeString) return '-';
        const d = new Date(dateTimeString);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }

    function formatAmount(amount) {
        if (amount == null) return '-';
        return '₩ ' + Number(amount).toLocaleString();
    }

    function showLoading() {
        documentsList.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>데이터를 불러오는 중...</p>
            </div>`;
    }

    function showEmpty() {
        documentsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>개인경비청구 문서가 없습니다.</p>
            </div>`;
    }

    function showError(message) {
        documentsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>`;
    }
});
