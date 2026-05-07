/* =========================================================
 * 알림 인박스 페이지 (/notifications)
 * - [받은 알림]:  GET /api/me/inbox  (?page=&size=&unreadOnly=&type=)
 * - [보낸 알림]:  GET /api/me/inbox/sent (?page=&size=&channel=&type=&status=)
 * - 자동 읽음:    PUT /api/me/inbox/{idx}/read
 * - 모두 읽음:    PUT /api/me/inbox/read-all
 * ========================================================= */

document.addEventListener('DOMContentLoaded', function () {

    const ICONS = {
        C1901: '📝', C1902: '🖊', C1903: '✅', C1904: '✍️',
        C1905: '✅', C1906: '❌', C1907: '🗑',
        C1908: '📅', C1909: '🔄', C1910: '🚫',
        C1911: '👥', C1912: '🔄', C1913: '🚫',
        C1914: '⚠️', C1915: '📢'
    };

    const STATUS_LABEL = {
        C2001: { name: '대기중',     cls: 'status-pending' },
        C2002: { name: '발송성공',   cls: 'status-sent' },
        C2003: { name: '발송제외',   cls: 'status-skipped' },
        C2004: { name: '발송실패',   cls: 'status-failed' },
        C2005: { name: '재시도대기', cls: 'status-retry-wait' },
        C2006: { name: '만료',       cls: 'status-expired' }
    };

    const PAGE_SIZE = 20;

    let currentTab  = 'received';
    let currentPage = 0;
    let unreadOnly  = false;
    let filterType  = '';

    /* ─── DOM ─── */
    const subtitleEl   = document.getElementById('inboxSubtitle');
    const listEl       = document.getElementById('inboxList');
    const emptyEl      = document.getElementById('inboxEmpty');
    const totalEl      = document.getElementById('inboxTotalCount');
    const sentTotalEl  = document.getElementById('sentTotalCount');
    const unreadEl     = document.getElementById('inboxUnreadCount');
    const pagiEl       = document.getElementById('inboxPagination');
    const unreadOnlyChk = document.getElementById('inboxUnreadOnly');
    const typeFilterSel = document.getElementById('inboxTypeFilter');
    const markAllBtn   = document.getElementById('inboxMarkAllReadBtn');
    const sidebarBadge = document.getElementById('sidebarNotifBadge');
    const countsReceived = document.getElementById('inboxCountsReceived');
    const countsSent     = document.getElementById('inboxCountsSent');

    /* ─── 탭 전환 ─── */
    function bindTabs() {
        document.querySelectorAll('.inbox-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                const next = tab.dataset.tab;
                if (next === currentTab) return;
                currentTab = next;
                currentPage = 0;
                applyTabUI();
                load();
            });
        });
    }

    function applyTabUI() {
        document.querySelectorAll('.inbox-tab').forEach(function (tab) {
            const active = tab.dataset.tab === currentTab;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
            tab.style.color = active ? '#1a73e8' : '#6b7280';
            tab.style.borderBottomColor = active ? '#1a73e8' : 'transparent';
            tab.style.fontWeight = active ? '600' : '500';
        });
        const isSent = currentTab === 'sent';
        if (subtitleEl) subtitleEl.textContent = isSent
                ? '내 행동(승인·일정 등록·서명 등) 으로 발생해 다른 사람에게 발송된 알림입니다.'
                : '그룹웨어에서 받은 알림 목록입니다. 클릭하면 자동으로 읽음 처리됩니다.';
        if (countsReceived) countsReceived.hidden = isSent;
        if (countsSent)     countsSent.hidden     = !isSent;
        if (markAllBtn)     markAllBtn.style.display = isSent ? 'none' : '';
        if (unreadOnlyChk)  unreadOnlyChk.parentElement.style.display = isSent ? 'none' : '';
    }

    /* ─── 데이터 로드 ─── */
    function load() {
        if (currentTab === 'sent') return loadSent();
        return loadReceived();
    }

    function loadReceived() {
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
            .then(renderReceived)
            .catch(function (err) {
                console.error('[Inbox] 받은 알림 조회 실패', err);
                Swal.fire({ icon: 'error', title: '알림을 불러오지 못했습니다',
                    text: '잠시 후 다시 시도해 주세요.' });
            });
    }

    function loadSent() {
        const params = new URLSearchParams({
            page: String(currentPage),
            size: String(PAGE_SIZE)
        });
        if (filterType) params.set('type', filterType);

        fetch('/api/me/inbox/sent?' + params.toString(), { credentials: 'same-origin' })
            .then(function (res) {
                if (!res.ok) throw new Error('LOAD_FAILED');
                return res.json();
            })
            .then(renderSent)
            .catch(function (err) {
                console.error('[Inbox] 보낸 알림 조회 실패', err);
                Swal.fire({ icon: 'error', title: '알림을 불러오지 못했습니다',
                    text: '잠시 후 다시 시도해 주세요.' });
            });
    }

    /* ─── 받은 알림 렌더 ─── */
    function renderReceived(data) {
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
            emptyEl.querySelector('p').textContent = '받은 알림이 없습니다.';
        } else {
            emptyEl.hidden = true;
            rows.forEach(function (row) { listEl.appendChild(buildReceivedRow(row)); });
        }

        renderPagination(data.totalPages, data.page);
    }

    function buildReceivedRow(row) {
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

    /* ─── 보낸 알림 렌더 ─── */
    function renderSent(data) {
        if (sentTotalEl) sentTotalEl.textContent = data.totalElements;

        Array.from(listEl.querySelectorAll('.inbox-row')).forEach(function (el) { el.remove(); });

        const rows = data.content || [];
        if (rows.length === 0) {
            emptyEl.hidden = false;
            emptyEl.querySelector('p').textContent = '보낸 알림이 없습니다.';
        } else {
            emptyEl.hidden = true;
            rows.forEach(function (row) { listEl.appendChild(buildSentRow(row)); });
        }

        renderPagination(data.totalPages, data.page);
    }

    function buildSentRow(row) {
        const el = document.createElement('div');
        el.className = 'inbox-row';
        el.dataset.idx = row.idx;

        const stat = STATUS_LABEL[row.status] || { name: row.statusName || row.status || '', cls: '' };
        const recipient = row.recipientName
                ? escapeHtml(row.recipientName) +
                  (row.recipientEmpId ? ' <span style="color:#9ca3af;font-size:12px;">(' + escapeHtml(row.recipientEmpId) + ')</span>' : '')
                : '<span style="color:#9ca3af;">(수신자 없음)</span>';
        const channelChip = row.channelLabel
                ? '<span style="background:#eef2ff;color:#3730a3;font-size:11px;padding:2px 8px;border-radius:10px;margin-left:6px;">' +
                  escapeHtml(row.channelLabel) + '</span>'
                : '';
        const errorLine = row.lastError
                ? '<div style="color:#b91c1c;font-size:12px;margin-top:4px;">' + escapeHtml(row.lastError) + '</div>'
                : '';

        el.innerHTML =
            '<span class="row-icon">' + (ICONS[row.notificationType] || '🔔') + '</span>' +
            '<div class="row-body">' +
            '  <h3 class="row-title">' + escapeHtml(row.title) + channelChip +
            '    <span class="status-badge ' + stat.cls + '" style="margin-left:8px;font-size:11px;padding:2px 8px;border-radius:10px;">' +
            escapeHtml(stat.name) + '</span>' +
            '  </h3>' +
            '  <p class="row-text">받는 사람: ' + recipient + '</p>' +
                 errorLine +
            '</div>' +
            '<span class="row-time">' + formatTime(row.sentAt || row.createdAt) + '</span>';

        if (row.linkUrl) {
            el.style.cursor = 'pointer';
            el.addEventListener('click', function () {
                window.location.href = row.linkUrl;
            });
        }
        return el;
    }

    /* ─── 페이지네이션 ─── */
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
            if (currentTab !== 'received') return;
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
    bindTabs();
    applyTabUI();
    load();
});
