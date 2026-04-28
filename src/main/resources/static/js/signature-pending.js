/**
 * 서명 관리 페이지 — 필터 + 페이징 + 정렬 + 일괄 서명
 */
let pendingItems = [];
let completedItems = [];
let requestedItems = [];
let filteredPending = [];
let filteredCompleted = [];
let filteredRequested = [];
let sortState = { key: null, asc: true };
let pendingPage = 1;
let completedPage = 1;
let requestedPage = 1;
const PAGE_SIZE = 10;
let currentTab = 'pending';
let searchKeyword = '';
const searchUtils = typeof SearchUtils !== 'undefined' ? new SearchUtils() : null;

document.addEventListener('DOMContentLoaded', function() {
    window.showPageLoadingOverlay();

    // 탭 전환
    document.querySelectorAll('.sig-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });


    // 전체 선택
    document.getElementById('selectAllHeader').addEventListener('change', toggleSelectAll);

    // 일괄 서명
    document.getElementById('bulkSignBtn').addEventListener('click', handleBulkSign);

    // 필터 — 칩 클릭
    document.querySelectorAll('.type-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const type = chip.dataset.type;
            if (type === 'all') {
                // 전체 클릭 → 나머지 해제
                document.querySelectorAll('.type-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            } else {
                // 개별 클릭 → 전체 해제 + 토글
                document.querySelector('.type-chip[data-type="all"]').classList.remove('active');
                chip.classList.toggle('active');
                // 아무것도 선택 안 되면 전체 활성
                if (!document.querySelector('.type-chip.active')) {
                    document.querySelector('.type-chip[data-type="all"]').classList.add('active');
                }
            }
            applyFilters();
        });
    });
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('periodFilter').addEventListener('change', applyFilters);

    // 컬럼 정렬
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => handleSort(th));
    });

    // 데이터 로드
    Promise.all([loadPendingList(), loadCompletedList(), loadRequestedList()])
        .finally(() => window.hidePageLoadingOverlay());
});

function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.sig-tab').forEach(t => {
        const isActive = t.dataset.tab === tabName;
        t.classList.toggle('active', isActive);
    });
    document.getElementById('tabPendingContent').style.display = tabName === 'pending' ? '' : 'none';
    document.getElementById('tabCompletedContent').style.display = tabName === 'completed' ? '' : 'none';
    document.getElementById('tabRequestedContent').style.display = tabName === 'requested' ? '' : 'none';
    applyFilters();
}

const DETAIL_URLS = {
    'C0401': '/approval/expense/detail', 'C0402': '/approval/requisition/detail',
    'C0403': '/approval/receipt-overtime/detail', 'C0404': '/approval/receipt-trip/detail',
    'C0405': '/approval/receipt-trip-meeting/detail', 'C0406': '/approval/receipt-meeting/detail',
    'C0407': '/approval/receipt-purchase/detail', 'C0408': '/approval/receipt-purchase/detail',
    'C0410': '/approval/project-weekly-report/detail', 'C0411': '/approval/monthly-report/detail',
    'C0412': '/approval/meeting/detail', 'C0413': '/approval/vacation/detail'
};

const TYPE_ICONS = {
    'C0401': 'fa-won-sign', 'C0402': 'fa-file-invoice', 'C0403': 'fa-moon',
    'C0404': 'fa-car', 'C0405': 'fa-plane', 'C0406': 'fa-comments',
    'C0407': 'fa-flask', 'C0408': 'fa-tools', 'C0410': 'fa-calendar-week',
    'C0411': 'fa-calendar-alt', 'C0412': 'fa-users', 'C0413': 'fa-umbrella-beach'
};

// 문서 카테고리 — "비용 결재" vs "일반 서명요청" 구분 (받은요청 화면의 구분 컬럼)
//   비용: 개인경비, 지출품의서, 재료비, 장비비
//   일반: 그 외 (야근식대·출장·회의·연차·보고서 등)
const DOC_CATEGORY_MONEY = new Set(['C0401', 'C0402', 'C0407', 'C0408']);

function getDocCategory(docType) {
    return DOC_CATEGORY_MONEY.has(docType) ? 'money' : 'general';
}

function renderCategoryBadge(docType) {
    const cat = getDocCategory(docType);
    if (cat === 'money') {
        return '<span class="doc-category-badge category-money" title="비용 결재 — 개인경비/지출품의/재료비/장비비"><i class="fas fa-won-sign"></i> 비용</span>';
    }
    return '<span class="doc-category-badge category-general" title="일반 서명요청"><i class="fas fa-pen"></i> 일반</span>';
}

// ============================================================
// 데이터 로드
// ============================================================
async function loadPendingList() {
    try {
        const res = await fetch('/api/signature/pending-list');
        if (!res.ok) throw new Error();
        pendingItems = await res.json();
        const badge = document.getElementById('tabPendingCount');
        if (badge) badge.textContent = pendingItems.length;
        applyFilters();
    } catch (e) {
        document.getElementById('emptyPending').style.display = '';
    }
}

async function loadCompletedList() {
    try {
        const res = await fetch('/api/signature/completed-list');
        if (!res.ok) throw new Error();
        completedItems = await res.json();
        const completedBadge = document.getElementById('tabCompletedCount');
        if (completedBadge) completedBadge.textContent = completedItems.length;
        applyFilters();
    } catch (e) {
        document.getElementById('emptyCompleted').style.display = '';
    }
}

// ============================================================
// 필터링
// ============================================================
function applyFilters() {
    const activeChips = Array.from(document.querySelectorAll('.type-chip.active')).map(c => c.dataset.type);
    const isAll = activeChips.includes('all') || activeChips.length === 0;
    searchKeyword = (document.getElementById('searchInput').value || '').trim();

    // 기간 필터
    const periodVal = document.getElementById('periodFilter').value;
    let periodCutoff = null;
    if (periodVal !== 'all') {
        periodCutoff = new Date();
        if (periodVal === '1m') periodCutoff.setMonth(periodCutoff.getMonth() - 1);
        else if (periodVal === '3m') periodCutoff.setMonth(periodCutoff.getMonth() - 3);
        else if (periodVal === '6m') periodCutoff.setMonth(periodCutoff.getMonth() - 6);
        else if (periodVal === '1y') periodCutoff.setFullYear(periodCutoff.getFullYear() - 1);
    }

    const filterFn = item => {
        if (!isAll && !activeChips.includes(item.documentType)) return false;
        if (searchKeyword) {
            const targets = [item.documentTitle || '', item.drafterName || ''];
            const matched = targets.some(t =>
                searchUtils ? searchUtils.matchesSearch(t, searchKeyword) : t.toLowerCase().includes(searchKeyword.toLowerCase())
            );
            if (!matched) return false;
        }
        // 기간 필터 — 날짜 필드가 있는 항목만 적용
        if (periodCutoff) {
            const dateStr = item.requestedAt || item.signedAt || item.createdAt;
            if (dateStr && new Date(dateStr) < periodCutoff) return false;
        }
        return true;
    };

    // 받은/보낸 요청은 기간 필터 제외
    const baseFilterFn = item => {
        if (!isAll && !activeChips.includes(item.documentType)) return false;
        if (searchKeyword) {
            const targets = [item.documentTitle || '', item.drafterName || ''];
            const matched = targets.some(t =>
                searchUtils ? searchUtils.matchesSearch(t, searchKeyword) : t.toLowerCase().includes(searchKeyword.toLowerCase())
            );
            if (!matched) return false;
        }
        return true;
    };

    filteredPending = pendingItems.filter(baseFilterFn);
    filteredCompleted = completedItems.filter(filterFn);
    filteredRequested = requestedItems.filter(baseFilterFn);

    // 기본 정렬: 받은/보낸 요청은 오래된 순, 이력은 최신 순
    filteredPending.sort((a, b) => new Date(a.requestedAt || 0) - new Date(b.requestedAt || 0));
    filteredRequested.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    filteredCompleted.sort((a, b) => new Date(b.signedAt || 0) - new Date(a.signedAt || 0));

    // 탭 배지 건수 업데이트
    const pendingBadge = document.getElementById('tabPendingCount');
    const requestedBadge = document.getElementById('tabRequestedCount');
    const completedBadge = document.getElementById('tabCompletedCount');
    if (pendingBadge) pendingBadge.textContent = filteredPending.length;
    if (requestedBadge) requestedBadge.textContent = filteredRequested.length;
    if (completedBadge) completedBadge.textContent = filteredCompleted.length;

    pendingPage = 1;
    completedPage = 1;
    requestedPage = 1;

    renderCurrentTab();
}

function renderCurrentTab() {
    if (currentTab === 'pending') renderPendingTab();
    else if (currentTab === 'completed') renderCompletedTab();
    else if (currentTab === 'requested') renderRequestedTab();
}

// ============================================================
// 대기 탭 렌더
// ============================================================
function renderPendingTab() {
    const empty = document.getElementById('emptyPending');
    const wrapper = document.getElementById('pendingTableWrapper');
    const bulk = document.getElementById('bulkActions');

    if (filteredPending.length === 0) {
        empty.style.display = '';
        wrapper.style.display = 'none';
        bulk.style.display = 'none';
        document.getElementById('pendingPagination').innerHTML = '';
        return;
    }

    empty.style.display = 'none';
    wrapper.style.display = '';
    bulk.style.display = 'flex';

    const start = (pendingPage - 1) * PAGE_SIZE;
    const pageItems = filteredPending.slice(start, start + PAGE_SIZE);

    document.getElementById('pendingTableBody').innerHTML = pageItems.map((item, i) => {
        const icon = TYPE_ICONS[item.documentType] || 'fa-file';
        const href = getDetailUrl(item);
        const dateStr = item.requestedAt ? formatDateTime(item.requestedAt) : '-';
        const dsIdx = item.documentSignatureIdx || '';
        const fullTitle = item.documentTitle || '-';
        const title = hl(truncate(fullTitle, 20));
        const tipAttr = fullTitle.length > 20 ? ` data-tip="${fullTitle.replace(/"/g, '&quot;')}"` : '';
        const drafter = hl(item.drafterName || '-');

        const progressText = item.progress || '-';

        return `<tr>
            <td><input type="checkbox" class="sig-check" data-idx="${dsIdx}" data-index="${start + i}"></td>
            <td>${renderCategoryBadge(item.documentType)}</td>
            <td><span class="doc-type-label"><i class="fas ${icon}"></i> ${item.documentTypeName || item.documentType}</span></td>
            <td style="font-size:11px; color:#64748b;">${item.documentNo || '-'}</td>
            <td class="doc-title-cell" onclick="window.location.href='${href}'"${tipAttr}>${title}</td>
            <td>${statusBadge(item.statusCode, item.statusName, item.documentType)}</td>
            <td><span class="progress-badge clickable" onclick="event.stopPropagation(); showSignerDetail(${item.documentIdx}, 'pending')">${progressText}</span></td>
            <td>${drafter}</td>
            <td>${dateStr}</td>
            <td><button class="btn-go" onclick="window.location.href='${href}'"><i class="fas fa-arrow-right"></i></button></td>
        </tr>`;
    }).join('');

    // 체크박스 이벤트
    document.querySelectorAll('.sig-check').forEach(cb => cb.addEventListener('change', updateSelectedCount));
    document.getElementById('selectAllHeader').checked = false;
    updateSelectedCount();

    renderPagination('pendingPagination', filteredPending.length, pendingPage, p => { pendingPage = p; renderPendingTab(); });
}

// ============================================================
// 이력 탭 렌더
// ============================================================
function renderCompletedTab() {
    const empty = document.getElementById('emptyCompleted');
    const wrapper = document.getElementById('completedTableWrapper');

    if (filteredCompleted.length === 0) {
        empty.style.display = '';
        wrapper.style.display = 'none';
        document.getElementById('completedPagination').innerHTML = '';
        return;
    }

    empty.style.display = 'none';
    wrapper.style.display = '';

    const start = (completedPage - 1) * PAGE_SIZE;
    const pageItems = filteredCompleted.slice(start, start + PAGE_SIZE);

    document.getElementById('completedTableBody').innerHTML = pageItems.map(item => {
        const icon = TYPE_ICONS[item.documentType] || 'fa-file';
        const href = getDetailUrl(item);
        const dateStr = item.signedAt ? formatDateTime(item.signedAt) : '-';
        const fullTitle = item.documentTitle || '-';
        const title = hl(truncate(fullTitle, 20));
        const tipAttr = fullTitle.length > 20 ? ` data-tip="${fullTitle.replace(/"/g, '&quot;')}"` : '';
        const drafter = hl(item.drafterName || '-');

        return `<tr style="cursor:pointer;" onclick="window.location.href='${href}'">
            <td>${renderCategoryBadge(item.documentType)}</td>
            <td><span class="doc-type-label completed"><i class="fas ${icon}"></i> ${item.documentTypeName || item.documentType}</span></td>
            <td style="font-size:11px; color:#64748b;">${item.documentNo || '-'}</td>
            <td class="doc-title-cell"${tipAttr}>${title}</td>
            <td>${statusBadge(item.statusCode, item.statusName, item.documentType)}</td>
            <td>${drafter}</td>
            <td>${dateStr}</td>
            <td><button class="btn-go completed" onclick="event.stopPropagation(); window.location.href='${href}';"><i class="fas fa-arrow-right"></i></button></td>
        </tr>`;
    }).join('');

    renderPagination('completedPagination', filteredCompleted.length, completedPage, p => { completedPage = p; renderCompletedTab(); });
}

// ============================================================
// 요청 탭
// ============================================================
async function loadRequestedList() {
    try {
        const res = await fetch('/api/signature/requested-list');
        if (!res.ok) throw new Error();
        requestedItems = await res.json();
        const badge = document.getElementById('tabRequestedCount');
        if (badge) badge.textContent = requestedItems.length;
        applyFilters();
    } catch (e) {
        document.getElementById('emptyRequested').style.display = '';
    }
}

function renderRequestedTab() {
    const empty = document.getElementById('emptyRequested');
    const wrapper = document.getElementById('requestedTableWrapper');

    if (filteredRequested.length === 0) {
        empty.style.display = '';
        wrapper.style.display = 'none';
        document.getElementById('requestedPagination').innerHTML = '';
        return;
    }

    empty.style.display = 'none';
    wrapper.style.display = '';

    const start = (requestedPage - 1) * PAGE_SIZE;
    const pageItems = filteredRequested.slice(start, start + PAGE_SIZE);

    document.getElementById('requestedTableBody').innerHTML = pageItems.map(item => {
        const icon = TYPE_ICONS[item.documentType] || 'fa-file';
        const href = getDetailUrl(item);
        const dateStr = item.createdAt ? formatDateTime(item.createdAt) : '-';
        const fullTitle = item.documentTitle || '-';
        const title = hl(truncate(fullTitle, 20));
        const tipAttr = fullTitle.length > 20 ? ` data-tip="${fullTitle.replace(/"/g, '&quot;')}"` : '';
        const progressText = item.progress || '-';
        const pendingCell = renderPendingSignersCell(item);

        return `<tr style="cursor:pointer;" onclick="window.location.href='${href}'">
            <td>${renderCategoryBadge(item.documentType)}</td>
            <td><span class="doc-type-label"><i class="fas ${icon}"></i> ${item.documentTypeName || item.documentType}</span></td>
            <td style="font-size:11px; color:#64748b;">${item.documentNo || '-'}</td>
            <td class="doc-title-cell"${tipAttr}>${title}</td>
            <td>${statusBadge(item.statusCode, item.statusName, item.documentType)}</td>
            <td><span class="progress-badge clickable" onclick="event.stopPropagation(); showSignerDetail(${item.documentIdx}, 'requested')">${progressText}</span></td>
            <td onclick="event.stopPropagation(); showSignerDetail(${item.documentIdx}, 'requested')" style="cursor:pointer;">${pendingCell}</td>
            <td>${dateStr}</td>
            <td><button class="btn-go" onclick="event.stopPropagation(); window.location.href='${href}';"><i class="fas fa-arrow-right"></i></button></td>
        </tr>`;
    }).join('');

    renderPagination('requestedPagination', filteredRequested.length, requestedPage, p => { requestedPage = p; renderRequestedTab(); });
}

// ============================================================
// 페이징
// ============================================================
function renderPagination(wrapperId, totalItems, currentPage, onPageChange) {
    const wrapper = document.getElementById(wrapperId);
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    if (totalPages <= 1) { wrapper.innerHTML = ''; return; }

    let html = `<button ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}"><i class="fas fa-chevron-left"></i></button>`;
    const maxBtns = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxBtns / 2));
    let endPage = Math.min(totalPages, startPage + maxBtns - 1);
    if (endPage - startPage < maxBtns - 1) startPage = Math.max(1, endPage - maxBtns + 1);

    for (let p = startPage; p <= endPage; p++) {
        html += `<button class="${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}"><i class="fas fa-chevron-right"></i></button>`;

    wrapper.innerHTML = html;
    wrapper.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page);
            if (page >= 1 && page <= totalPages) onPageChange(page);
        });
    });
}

// ============================================================
// 정렬
// ============================================================
function handleSort(th) {
    const key = th.dataset.sort;
    const tabType = th.dataset.tab || 'pending';

    if (sortState.key === key) { sortState.asc = !sortState.asc; }
    else { sortState.key = key; sortState.asc = true; }

    th.closest('thead').querySelectorAll('.sort-icon').forEach(icon => { icon.className = 'fas fa-sort sort-icon'; });
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.className = `fas fa-sort-${sortState.asc ? 'up' : 'down'} sort-icon`;

    const items = tabType === 'completed' ? filteredCompleted : tabType === 'requested' ? filteredRequested : filteredPending;
    const STATUS_ORDER = { C0501: 1, C0506: 2, C0507: 3, C0508: 4, C0504: 5, C0505: 6 };

    items.sort((a, b) => {
        let va, vb;
        if (key === 'statusName') {
            va = STATUS_ORDER[a.statusCode] || 99;
            vb = STATUS_ORDER[b.statusCode] || 99;
        } else if (key === 'docCategory') {
            // 비용(money) 먼저, 일반(general) 다음
            va = getDocCategory(a.documentType);
            vb = getDocCategory(b.documentType);
        } else {
            va = a[key] || '';
            vb = b[key] || '';
            if (typeof va === 'string') va = va.toLowerCase();
            if (typeof vb === 'string') vb = vb.toLowerCase();
        }
        if (va < vb) return sortState.asc ? -1 : 1;
        if (va > vb) return sortState.asc ? 1 : -1;
        return 0;
    });

    if (tabType === 'completed') renderCompletedTab();
    else if (tabType === 'requested') renderRequestedTab();
    else renderPendingTab();
}

// ============================================================
// 체크박스 + 일괄 서명
// ============================================================
function toggleSelectAll(e) {
    document.querySelectorAll('.sig-check').forEach(cb => { cb.checked = e.target.checked; });
    updateSelectedCount();
}

function updateSelectedCount() {
    const count = document.querySelectorAll('.sig-check:checked').length;
    document.getElementById('selectedCount').textContent = count;
    document.getElementById('bulkSignBtn').style.display = count > 0 ? '' : 'none';
}

async function handleBulkSign() {
    const selectedIdxList = Array.from(document.querySelectorAll('.sig-check:checked'))
        .map(cb => parseInt(cb.dataset.idx)).filter(idx => !isNaN(idx));
    if (selectedIdxList.length === 0) return;

    const confirm = await Swal.fire({
        icon: 'question', title: `${selectedIdxList.length}건 일괄 서명`,
        html: '선택한 문서에 동일한 서명을 적용합니다.<br>QR 스캔 후 한 번의 서명으로 모두 처리됩니다.',
        showCancelButton: true, confirmButtonText: '서명 진행', cancelButtonText: '취소', confirmButtonColor: '#4f46e5'
    });
    if (!confirm.isConfirmed) return;

    const firstItem = pendingItems.find(item => selectedIdxList.includes(item.documentSignatureIdx));
    if (!firstItem || !window.SignatureModal) return;

    SignatureModal.open({
        documentIdx: firstItem.documentIdx, signatureSlot: firstItem.signatureSlot,
        onComplete: async (event) => {
            let imageDataUrl = event.signatureImageDataUrl;
            const remainingIdx = selectedIdxList.filter(idx => idx !== firstItem.documentSignatureIdx);

            // 폴링 폴백으로 이미지가 없는 경우 서명 API에서 재조회
            if (!imageDataUrl && remainingIdx.length > 0) {
                try {
                    const sigRes = await fetch(`/api/signature/document/${firstItem.documentIdx}`);
                    if (sigRes.ok) {
                        const sigs = await sigRes.json();
                        const mySig = sigs.find(s => s.signatureImageDataUrl);
                        if (mySig) imageDataUrl = mySig.signatureImageDataUrl;
                    }
                } catch (e) { /* 무시 */ }
            }

            if (remainingIdx.length > 0 && imageDataUrl) {
                try {
                    Swal.fire({ title: '일괄 서명 처리 중...', html: `나머지 ${remainingIdx.length}건 적용 중`, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                    const res = await fetch('/api/signature/bulk-apply', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ documentSignatureIdxList: remainingIdx, signatureImageBase64: imageDataUrl })
                    });
                    const result = await res.json();
                    await Swal.fire({ icon: 'success', title: '일괄 서명 완료', html: `총 <strong>${1 + (result.applied || 0)}건</strong> 서명 완료`, timer: 2000, showConfirmButton: false });
                } catch (e) { console.error('일괄 서명 오류:', e); }
            }
            location.reload();
        },
        onClose: (ev) => { if (!ev.completed) Swal.fire({ icon: 'info', title: '서명 취소', text: '일괄 서명이 취소되었습니다.' }); }
    });
}

// ============================================================
// 유틸
// ============================================================
// 승인 단계가 있는 문서 (연차만)
const APPROVAL_TYPES = ['C0413'];

const FLOW_STEPS = [
    { codes: ['C0501', 'C0506'], label: '서명 요청' },
    { codes: ['C0507'], label: '일부 서명' },
    { codes: ['C0508'], label: '완료' }
];

function statusBadge(code, name, docType) {
    // 연차 승인/반려 → 흐름 뒤에 별도 배지
    const isVacation = APPROVAL_TYPES.includes(docType);
    let approvalBadge = '';
    if (isVacation) {
        if (code === 'C0504') approvalBadge = ' <span class="flow-step step-approved">승인</span>';
        else if (code === 'C0505') approvalBadge = ' <span class="flow-step step-rejected">반려</span>';
        else approvalBadge = ' <span class="flow-step step-inactive">승인</span>';
    }
    if (code === 'C0505') {
        // 반려 시 흐름은 마지막 도달 단계까지 표시 + 반려 배지
        const lastIdx = FLOW_STEPS.length - 1;
        return `<div class="status-flow">${FLOW_STEPS.map((s, i) => {
            return `<span class="flow-step ${i <= lastIdx ? 'step-done' : 'step-inactive'}">${s.label}</span>`;
        }).join('<span class="flow-arrow">›</span>')}${approvalBadge}</div>`;
    }

    const currentIdx = FLOW_STEPS.findIndex(s => s.codes.includes(code));
    // 승인(C0504)이면 흐름은 전부 완료 + 승인 배지
    const effectiveIdx = code === 'C0504' ? FLOW_STEPS.length : currentIdx;

    return `<div class="status-flow">${FLOW_STEPS.map((s, i) => {
        let cls = 'step-inactive';
        if (i < effectiveIdx) cls = 'step-done';
        else if (i === effectiveIdx) cls = 'step-current';
        return `<span class="flow-step ${cls}">${s.label}</span>`;
    }).join('<span class="flow-arrow">›</span>')}${approvalBadge}</div>`;
}

function truncate(text, max) {
    if (!text || text.length <= max) return text;
    return text.substring(0, max) + '…';
}

function hl(text) {
    if (!searchKeyword || !searchUtils) return text;
    return searchUtils.highlightText(text, searchKeyword);
}

function showSignerDetail(documentIdx, source) {
    const list = source === 'pending' ? pendingItems : requestedItems;
    const item = list.find(r => r.documentIdx === documentIdx);
    if (!item || !item.signers) return;

    const rows = item.signers.map(s => {
        const icon = s.signed
            ? '<i class="fas fa-check-circle" style="color:#059669; font-size:16px;"></i>'
            : '<i class="fas fa-hourglass-half" style="color:#f59e0b; font-size:14px;"></i>';
        const statusText = s.signed
            ? '<span style="color:#059669; font-weight:600;">완료</span>'
            : (s.requestedAt ? '<span style="color:#2563eb; font-weight:600;">요청됨</span>' : '<span style="color:#94a3b8;">순서 대기</span>');
        const reqDate = s.requestedAt ? formatDateTime(s.requestedAt) : '-';
        const signDate = s.signedAt ? formatDateTime(s.signedAt) : '-';

        return `<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="text-align:center; padding:12px 8px;">${icon}</td>
            <td style="padding:12px 8px; font-weight:500;">${s.signerName}</td>
            <td style="text-align:center; padding:12px 8px;"><span class="slot-badge ${s.signed ? 'completed' : 'pending'}" style="font-size:11px;">${s.slotLabel}</span></td>
            <td style="text-align:center; padding:12px 8px;">${statusText}</td>
            <td style="text-align:center; padding:12px 8px; font-size:11px; color:#64748b;">${reqDate}</td>
            <td style="text-align:center; padding:12px 8px; font-size:11px; color:#64748b;">${signDate}</td>
        </tr>`;
    }).join('');

    const docNo = item.documentNo || '';
    const docType = item.documentTypeName || '';
    const signed = item.signers.filter(s => s.signed).length;
    const total = item.signers.length;
    const progressColor = signed === total ? '#059669' : '#f59e0b';

    Swal.fire({
        title: '',
        html: `
            <div style="text-align:left; margin-bottom:20px;">
                <div style="font-size:16px; font-weight:700; color:#1e293b; margin-bottom:8px;">서명 현황</div>
                <div style="display:flex; gap:16px; align-items:center; padding:14px 16px; background:#f8fafc; border-radius:8px;">
                    <div style="flex:1;">
                        <div style="font-size:11px; color:#94a3b8; margin-bottom:2px;">${docType} · ${docNo}</div>
                        <div style="font-size:13px; font-weight:600; color:#1e293b;">${item.documentTitle || '-'}</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:24px; font-weight:700; color:${progressColor};">${signed}/${total}</div>
                        <div style="font-size:10px; color:#94a3b8;">서명 완료</div>
                    </div>
                </div>
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <thead>
                    <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                        <th style="padding:10px 8px; width:36px;"></th>
                        <th style="padding:10px 8px; text-align:left;">서명자</th>
                        <th style="padding:10px 8px;">위치</th>
                        <th style="padding:10px 8px;">상태</th>
                        <th style="padding:10px 8px;">요청 일시</th>
                        <th style="padding:10px 8px;">서명 일시</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `,
        width: 640,
        showConfirmButton: true,
        confirmButtonText: '확인',
        confirmButtonColor: '#4f46e5',
        customClass: { popup: 'swal-no-padding-top' }
    });
}

function getDetailUrl(item) {
    const base = DETAIL_URLS[item.documentType];
    return base ? `${base}?documentIdx=${item.documentIdx}` : '#';
}

/**
 * "보낸 요청" 행의 미서명자 셀 — 누가 막고 있는지 한눈에.
 * - 현재 차례에 도착(요청됨, 미서명) → 진하게 + 호박색 점
 * - 순서 대기                     → 옅은 회색
 * - 모두 서명 완료                → "전원 완료"
 * 길면 앞 2명 + "외 N명" 으로 줄이고, 전체 명단은 셀 클릭 시 모달.
 */
function renderPendingSignersCell(item) {
    if (!item || !Array.isArray(item.signers)) return '<span style="color:#94a3b8;">-</span>';
    const unsigned = item.signers.filter(s => !s.signed);
    if (unsigned.length === 0) {
        return '<span style="color:#059669; font-weight:600;">전원 완료</span>';
    }
    const active = unsigned.filter(s => s.requestedAt);
    const queued = unsigned.filter(s => !s.requestedAt);

    const fmt = (s, isActive) => {
        const dot = isActive
            ? '<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#f59e0b; margin-right:5px; vertical-align:middle;"></span>'
            : '';
        const color = isActive ? '#b45309' : '#94a3b8';
        const weight = isActive ? '600' : '400';
        const slot = s.slotLabel ? ` <span style="font-size:10px; color:#94a3b8;">(${s.slotLabel})</span>` : '';
        return `<span style="color:${color}; font-weight:${weight};">${dot}${s.signerName || '-'}${slot}</span>`;
    };

    const ordered = [...active, ...queued];
    const max = 2;
    const head = ordered.slice(0, max).map((s, i) => fmt(s, i < active.length)).join(', ');
    const more = ordered.length > max ? ` <span style="color:#64748b; font-size:11px;">외 ${ordered.length - max}명</span>` : '';
    return head + more;
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
