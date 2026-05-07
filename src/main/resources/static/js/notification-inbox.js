/* =========================================================
 * 알림 인박스 페이지 (/notifications)
 * Phase 1: 더미 데이터로 게시판 mock 렌더. AJAX 없음.
 * Phase 4 에서 GET /api/notifications/me/inbox 등 실제 API 호출로 대체.
 * ========================================================= */

document.addEventListener('DOMContentLoaded', function () {

    /* 더미 인박스 데이터 (안 읽은 3건 + 읽은 7건) */
    const ICONS = {
        C1901: '📝', C1902: '🖊', C1903: '✅', C1904: '✍️',
        C1905: '✅', C1906: '❌', C1907: '🗑',
        C1908: '📅', C1909: '🔄', C1910: '🚫',
        C1911: '👥', C1912: '🔄', C1913: '🚫',
        C1914: '⚠️', C1915: '📢'
    };

    const DUMMY_INBOX = [
        { idx: 1023, type: 'C1901', typeName: '서명요청',         title: '📝 서명 요청이 도착했습니다',
          body: '휴가신청서 (VAC-20260506-001) 의 부서장 위치 서명이 필요합니다. 기안자: 김철수',
          createdAt: '2026-05-06 09:45', readAt: null,                  link: '/approval/vacation/123' },
        { idx: 1019, type: 'C1905', typeName: '연차승인',         title: '✅ 연차가 승인되었습니다',
          body: '휴가신청서 (VAC-20260505-007) — 2026-05-10 ~ 2026-05-12 (3일). 처리자: 김부서장',
          createdAt: '2026-05-06 09:20', readAt: null,                  link: '/vacation' },
        { idx: 1015, type: 'C1914', typeName: '알림발송실패',     title: '⚠️ 알림이 상대방에게 전달되지 않았습니다',
          body: '김철수님께 보낸 서명 요청이 전달되지 않았습니다. 사유: 상대방이 알림 봇을 차단함.',
          createdAt: '2026-05-06 09:10', readAt: null,                  link: '/notifications/1010/retry' },
        { idx: 1010, type: 'C1903', typeName: '서명완료알림',      title: '✅ 서명이 모두 완료되었습니다',
          body: '휴가신청서 (VAC-20260505-007) — 결재 완료. 모든 서명 단계가 끝났습니다.',
          createdAt: '2026-05-05 18:30', readAt: '2026-05-05 18:35',    link: '/approval/vacation/120' },
        { idx: 1008, type: 'C1908', typeName: '일정초대',          title: '📅 일정에 초대되었습니다',
          body: '주간 회의 — 2026-05-06 10:00 ~ 11:00, 회의실 A. 등록자: 박팀장',
          createdAt: '2026-05-05 14:00', readAt: '2026-05-05 14:05',    link: '/calendar?date=2026-05-06' },
        { idx: 1005, type: 'C1907', typeName: '연차관리자삭제',    title: '🗑 연차 신청이 관리자에 의해 삭제되었습니다',
          body: '연차신청서 (VAC-20260504-002) — 2026-05-15 (1일). 삭제자: 김부서장. 잔여 연차는 자동 복구되었습니다.',
          createdAt: '2026-05-05 11:20', readAt: '2026-05-05 11:30',    link: '/vacation' },
        { idx: 1002, type: 'C1902', typeName: '서명진행',          title: '🖊 서명이 진행 중입니다 (2/4 단계)',
          body: '휴가신청서 (VAC-20260503-009) — 박팀장(팀장)님이 서명했습니다. 다음 차례: 김부서장(부서장)',
          createdAt: '2026-05-04 16:50', readAt: '2026-05-04 17:00',    link: '/approval/vacation/118' },
        { idx: 998,  type: 'C1906', typeName: '연차반려',          title: '❌ 연차가 반려되었습니다',
          body: '연차신청서 (VAC-20260502-003) — 2026-05-08 (1일). 반려사유: 동일 부서 동시 휴가 불가. 처리자: 김부서장',
          createdAt: '2026-05-03 10:15', readAt: '2026-05-03 10:20',    link: '/vacation' },
        { idx: 991,  type: 'C1908', typeName: '일정초대',          title: '📅 일정에 초대되었습니다',
          body: '월간 전체 회의 — 2026-05-08 14:00 ~ 16:00, 대회의실. 등록자: 인사팀',
          createdAt: '2026-05-02 09:00', readAt: '2026-05-02 09:05',    link: '/calendar?date=2026-05-08' },
        { idx: 985,  type: 'C1901', typeName: '서명요청',         title: '📝 서명 요청이 도착했습니다',
          body: '연구비증빙 (RTM-20260501-002) — 참석자 위치 서명이 필요합니다. 기안자: 이연구원',
          createdAt: '2026-05-01 17:30', readAt: '2026-05-01 17:45',    link: '/approval/receipt/87' }
    ];

    const PAGE_SIZE = 20;
    let currentPage = 1;
    let unreadOnly = false;
    let filterType = '';

    /* ─── DOM ─── */
    const listEl = document.getElementById('inboxList');
    const emptyEl = document.getElementById('inboxEmpty');
    const totalEl = document.getElementById('inboxTotalCount');
    const unreadEl = document.getElementById('inboxUnreadCount');
    const pagiEl = document.getElementById('inboxPagination');
    const unreadOnlyChk = document.getElementById('inboxUnreadOnly');
    const typeFilterSel = document.getElementById('inboxTypeFilter');
    const markAllBtn = document.getElementById('inboxMarkAllReadBtn');
    const sidebarBadge = document.getElementById('sidebarNotifBadge');

    /* ─── 렌더 ─── */
    function applyFilters(rows) {
        return rows.filter(r => {
            if (unreadOnly && r.readAt !== null) return false;
            if (filterType && r.type !== filterType) return false;
            return true;
        }).sort((a, b) => {
            // 안 읽은 것 우선, 그다음 최신순
            const ar = a.readAt === null ? 0 : 1;
            const br = b.readAt === null ? 0 : 1;
            if (ar !== br) return ar - br;
            return b.createdAt.localeCompare(a.createdAt);
        });
    }

    function render() {
        const filtered = applyFilters(DUMMY_INBOX);
        const totalUnread = DUMMY_INBOX.filter(r => r.readAt === null).length;

        totalEl.textContent = filtered.length;
        unreadEl.textContent = totalUnread;
        if (sidebarBadge) {
            sidebarBadge.textContent = totalUnread;
            sidebarBadge.dataset.count = String(totalUnread);
        }

        // 페이지 슬라이스
        const start = (currentPage - 1) * PAGE_SIZE;
        const pageRows = filtered.slice(start, start + PAGE_SIZE);

        // 기존 행 제거 (empty 는 유지)
        Array.from(listEl.querySelectorAll('.inbox-row')).forEach(el => el.remove());

        if (pageRows.length === 0) {
            emptyEl.hidden = false;
        } else {
            emptyEl.hidden = true;
            pageRows.forEach(row => listEl.appendChild(buildRowEl(row)));
        }

        renderPagination(filtered.length);
    }

    function buildRowEl(row) {
        const el = document.createElement('div');
        el.className = 'inbox-row' + (row.readAt === null ? ' unread' : '');
        el.dataset.idx = row.idx;
        el.innerHTML = `
            <span class="row-icon">${ICONS[row.type] || '🔔'}</span>
            <div class="row-body">
                <h3 class="row-title">${escapeHtml(row.title)}</h3>
                <p class="row-text">${escapeHtml(row.body)}</p>
            </div>
            <span class="row-time">${row.createdAt}</span>
        `;
        el.addEventListener('click', () => {
            // 자동 읽음 처리 (Phase 4: PUT /api/notifications/{idx}/read)
            if (row.readAt === null) {
                row.readAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
            }
            // link 로 이동
            if (row.link) window.location.href = row.link;
        });
        return el;
    }

    function renderPagination(total) {
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        pagiEl.innerHTML = '';
        if (totalPages <= 1) return;

        const mkBtn = (label, page, opts = {}) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = label;
            if (opts.active) btn.classList.add('active');
            if (opts.disabled) btn.disabled = true;
            else btn.addEventListener('click', () => { currentPage = page; render(); });
            return btn;
        };

        pagiEl.appendChild(mkBtn('◀', currentPage - 1, { disabled: currentPage <= 1 }));
        for (let p = 1; p <= totalPages; p++) {
            pagiEl.appendChild(mkBtn(String(p), p, { active: p === currentPage }));
        }
        pagiEl.appendChild(mkBtn('▶', currentPage + 1, { disabled: currentPage >= totalPages }));
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str ?? '';
        return div.innerHTML;
    }

    /* ─── 인터랙션 ─── */
    unreadOnlyChk.addEventListener('change', () => { unreadOnly = unreadOnlyChk.checked; currentPage = 1; render(); });
    typeFilterSel.addEventListener('change', () => { filterType = typeFilterSel.value; currentPage = 1; render(); });

    markAllBtn.addEventListener('click', async () => {
        const totalUnread = DUMMY_INBOX.filter(r => r.readAt === null).length;
        if (totalUnread === 0) {
            await Swal.fire({ icon: 'info', title: '안 읽은 알림이 없습니다', confirmButtonText: '확인' });
            return;
        }
        const result = await Swal.fire({
            icon: 'question',
            title: '모두 읽음 처리할까요?',
            text: `안 읽은 알림 ${totalUnread}건을 모두 읽음으로 표시합니다.`,
            showCancelButton: true,
            confirmButtonText: '예',
            cancelButtonText: '취소'
        });
        if (!result.isConfirmed) return;

        // Phase 4: PUT /api/notifications/me/read-all
        const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
        DUMMY_INBOX.forEach(r => { if (r.readAt === null) r.readAt = now; });
        render();

        Swal.fire({ icon: 'success', title: '모두 읽음 처리됨', timer: 1500, showConfirmButton: false });
    });

    /* ─── 초기 렌더 ─── */
    render();
});
