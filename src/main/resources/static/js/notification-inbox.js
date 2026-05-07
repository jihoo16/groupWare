/* =========================================================
 * 알림 인박스 페이지 (/notifications)
 * - GET    /api/me/inbox  (?page=&size=&unreadOnly=&type=)
 * - PUT    /api/me/inbox/{idx}/read
 * - PUT    /api/me/inbox/read-all
 * ========================================================= */

document.addEventListener('DOMContentLoaded', function () {

    const ICONS = {
        C1901: '📝', C1902: '🖊', C1903: '✅', C1904: '✍️',
        C1905: '✅', C1906: '❌', C1907: '🗑',
        C1908: '📅', C1909: '🔄', C1910: '🚫',
        C1911: '👥', C1912: '🔄', C1913: '🚫',
        C1914: '⚠️', C1915: '📢'
    };

    const PAGE_SIZE = 20;

    let currentPage = 0;
    let unreadOnly  = false;
    let filterType  = '';

    /* ─── DOM ─── */
    const listEl       = document.getElementById('inboxList');
    const emptyEl      = document.getElementById('inboxEmpty');
    const totalEl      = document.getElementById('inboxTotalCount');
    const unreadEl     = document.getElementById('inboxUnreadCount');
    const pagiEl       = document.getElementById('inboxPagination');
    const unreadOnlyChk = document.getElementById('inboxUnreadOnly');
    const typeFilterSel = document.getElementById('inboxTypeFilter');
    const markAllBtn   = document.getElementById('inboxMarkAllReadBtn');
    const sidebarBadge = document.getElementById('sidebarNotifBadge');

    /* ─── 데이터 로드 ─── */
    function load() {
        const params = new URLSearchParams({
            page: String(currentPage),
            size: String(PAGE_SIZE),
            unreadOnly: String(unreadOnly)
        });
        if (filterType) params.set('type', filterType);

        fetch('/api/me/inbox?' + params.toString(), { credentials: 'same-origin' })
            .then(function (res) {
                if (!res.ok) throw new Error('LOAD_FAILED');
                return res.json();
            })
            .then(render)
            .catch(function (err) {
                console.error('[Inbox] 조회 실패', err);
                Swal.fire({ icon: 'error', title: '알림을 불러오지 못했습니다',
                    text: '잠시 후 다시 시도해 주세요.' });
            });
    }

    function render(data) {
        if (totalEl)  totalEl.textContent  = data.totalElements;
        if (unreadEl) unreadEl.textContent = data.totalUnread;
        if (sidebarBadge) {
            sidebarBadge.textContent = data.totalUnread;
            sidebarBadge.dataset.count = String(data.totalUnread);
            sidebarBadge.hidden = data.totalUnread === 0;
        }

        Array.from(listEl.querySelectorAll('.inbox-row')).forEach(function (el) { el.remove(); });

        const rows = data.content || [];
        if (rows.length === 0) {
            emptyEl.hidden = false;
        } else {
            emptyEl.hidden = true;
            rows.forEach(function (row) { listEl.appendChild(buildRowEl(row)); });
        }

        renderPagination(data.totalPages, data.page);
    }

    function buildRowEl(row) {
        const el = document.createElement('div');
        const isUnread = !row.readAt;
        el.className = 'inbox-row' + (isUnread ? ' unread' : '');
        el.dataset.idx = row.idx;
        el.innerHTML =
            '<span class="row-icon">' + (ICONS[row.notificationType] || '🔔') + '</span>' +
            '<div class="row-body">' +
            '  <h3 class="row-title">' + escapeHtml(row.title) + '</h3>' +
            '  <p class="row-text">' + escapeHtml(row.body) + '</p>' +
            '</div>' +
            '<span class="row-time">' + formatTime(row.createdAt) + '</span>';

        el.addEventListener('click', function () {
            const proceed = function () {
                if (row.linkUrl) window.location.href = row.linkUrl;
            };
            if (isUnread) {
                fetch('/api/me/inbox/' + row.idx + '/read', {
                    method: 'PUT',
                    credentials: 'same-origin'
                }).finally(proceed);
            } else {
                proceed();
            }
        });
        return el;
    }

    function renderPagination(totalPages, currentZero) {
        pagiEl.innerHTML = '';
        if (totalPages <= 1) return;

        const mkBtn = function (label, page, opts) {
            opts = opts || {};
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = label;
            if (opts.active) btn.classList.add('active');
            if (opts.disabled) btn.disabled = true;
            else btn.addEventListener('click', function () { currentPage = page; load(); });
            return btn;
        };

        pagiEl.appendChild(mkBtn('◀', currentZero - 1, { disabled: currentZero <= 0 }));
        for (let p = 0; p < totalPages; p++) {
            pagiEl.appendChild(mkBtn(String(p + 1), p, { active: p === currentZero }));
        }
        pagiEl.appendChild(mkBtn('▶', currentZero + 1, { disabled: currentZero >= totalPages - 1 }));
    }

    /* ─── 인터랙션 ─── */
    if (unreadOnlyChk) {
        unreadOnlyChk.addEventListener('change', function () {
            unreadOnly = unreadOnlyChk.checked;
            currentPage = 0;
            load();
        });
    }
    if (typeFilterSel) {
        typeFilterSel.addEventListener('change', function () {
            filterType = typeFilterSel.value;
            currentPage = 0;
            load();
        });
    }

    if (markAllBtn) {
        markAllBtn.addEventListener('click', async function () {
            const result = await Swal.fire({
                icon: 'question',
                title: '모두 읽음 처리할까요?',
                text: '안 읽은 알림을 모두 읽음으로 표시합니다.',
                showCancelButton: true,
                confirmButtonText: '예',
                cancelButtonText: '취소'
            });
            if (!result.isConfirmed) return;

            try {
                const res = await fetch('/api/me/inbox/read-all', {
                    method: 'PUT',
                    credentials: 'same-origin'
                });
                if (!res.ok) throw new Error('READ_ALL_FAILED');
                const json = await res.json();
                Swal.fire({
                    icon: 'success',
                    title: (json.updated > 0 ? json.updated + '건 ' : '') + '읽음 처리됨',
                    timer: 1200,
                    showConfirmButton: false
                });
                load();
            } catch (e) {
                Swal.fire({ icon: 'error', title: '처리에 실패했습니다',
                    text: '잠시 후 다시 시도해 주세요.' });
                console.error('[Inbox] read-all 실패', e);
            }
        });
    }

    /* ─── 유틸 ─── */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : str;
        return div.innerHTML;
    }

    function formatTime(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        const pad = function (n) { return String(n).padStart(2, '0'); };
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
               ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    /* ─── 초기 ─── */
    load();
});
