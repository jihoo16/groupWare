/**
 * 서명 관리 페이지 — 필터 + 페이징 + 정렬 + 일괄 서명
 */
let pendingItems = [];
let completedItems = [];
let filteredPending = [];
let filteredCompleted = [];
let sortState = { key: null, asc: true };
let pendingPage = 1;
let completedPage = 1;
const PAGE_SIZE = 15;
let currentTab = 'pending';
let searchKeyword = '';
const searchUtils = typeof SearchUtils !== 'undefined' ? new SearchUtils() : null;

document.addEventListener('DOMContentLoaded', function() {
    window.showPageLoadingOverlay();

    // 탭 전환
    document.querySelectorAll('.sig-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // 카드 클릭 → 탭 전환
    document.getElementById('statPendingCard').addEventListener('click', () => switchTab('pending'));
    document.getElementById('statCompletedCard').addEventListener('click', () => switchTab('completed'));

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

    // 컬럼 정렬
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => handleSort(th));
    });

    // 데이터 로드
    Promise.all([loadPendingList(), loadCompletedList()])
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

// ============================================================
// 데이터 로드
// ============================================================
async function loadPendingList() {
    try {
        const res = await fetch('/api/signature/pending-list');
        if (!res.ok) throw new Error();
        pendingItems = await res.json();
        document.getElementById('statPending').innerHTML = `${pendingItems.length}<em>건</em>`;
        const badge = document.getElementById('tabPendingCount');
        if (badge) badge.textContent = pendingItems.length > 0 ? pendingItems.length : '';
        applyFilters();
    } catch (e) {
        document.getElementById('statPending').innerHTML = `0<em>건</em>`;
        document.getElementById('emptyPending').style.display = '';
    }
}

async function loadCompletedList() {
    try {
        const res = await fetch('/api/signature/completed-list');
        if (!res.ok) throw new Error();
        completedItems = await res.json();
        document.getElementById('statCompleted').innerHTML = `${completedItems.length}<em>건</em>`;
        applyFilters();
    } catch (e) {
        document.getElementById('statCompleted').innerHTML = `0<em>건</em>`;
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

    const filterFn = item => {
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

    filteredPending = pendingItems.filter(filterFn);
    filteredCompleted = completedItems.filter(filterFn);

    pendingPage = 1;
    completedPage = 1;

    renderCurrentTab();
}

function renderCurrentTab() {
    if (currentTab === 'pending') {
        renderPendingTab();
    } else {
        renderCompletedTab();
    }
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
        const title = hl(item.documentTitle || '-');
        const drafter = hl(item.drafterName || '-');

        return `<tr>
            <td><input type="checkbox" class="sig-check" data-idx="${dsIdx}" data-index="${start + i}"></td>
            <td><span class="doc-type-label"><i class="fas ${icon}"></i> ${item.documentTypeName || item.documentType}</span></td>
            <td class="doc-title-link" onclick="window.location.href='${href}'">${title}</td>
            <td><span class="slot-badge pending">${item.signatureSlotLabel || '-'}</span></td>
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
        const title = hl(item.documentTitle || '-');
        const drafter = hl(item.drafterName || '-');

        return `<tr style="cursor:pointer;" onclick="window.location.href='${href}'">
            <td><span class="doc-type-label completed"><i class="fas ${icon}"></i> ${item.documentTypeName || item.documentType}</span></td>
            <td class="doc-title-link">${title}</td>
            <td><span class="slot-badge completed">${item.signatureSlotLabel || '-'}</span></td>
            <td>${drafter}</td>
            <td>${dateStr}</td>
            <td><button class="btn-go completed" onclick="event.stopPropagation(); window.location.href='${href}';"><i class="fas fa-arrow-right"></i></button></td>
        </tr>`;
    }).join('');

    renderPagination('completedPagination', filteredCompleted.length, completedPage, p => { completedPage = p; renderCompletedTab(); });
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
    const isCompleted = th.dataset.tab === 'completed';

    if (sortState.key === key) { sortState.asc = !sortState.asc; }
    else { sortState.key = key; sortState.asc = true; }

    th.closest('thead').querySelectorAll('.sort-icon').forEach(icon => { icon.className = 'fas fa-sort sort-icon'; });
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.className = `fas fa-sort-${sortState.asc ? 'up' : 'down'} sort-icon`;

    const items = isCompleted ? filteredCompleted : filteredPending;
    items.sort((a, b) => {
        let va = a[key] || '', vb = b[key] || '';
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return sortState.asc ? -1 : 1;
        if (va > vb) return sortState.asc ? 1 : -1;
        return 0;
    });

    if (isCompleted) renderCompletedTab(); else renderPendingTab();
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
            const imageDataUrl = event.signatureImageDataUrl;
            const remainingIdx = selectedIdxList.filter(idx => idx !== firstItem.documentSignatureIdx);
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
function hl(text) {
    if (!searchKeyword || !searchUtils) return text;
    return searchUtils.highlightText(text, searchKeyword);
}

function getDetailUrl(item) {
    const base = DETAIL_URLS[item.documentType];
    return base ? `${base}?documentIdx=${item.documentIdx}` : '#';
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
