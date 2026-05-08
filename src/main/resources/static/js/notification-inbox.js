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

    const PAGE_SIZE = 10;

    let currentTab     = 'received';
    let currentPage    = 0;
    let unreadOnly     = false;
    let filterType     = '';
    let filterChannel  = '';

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
    const channelFilterEl = document.getElementById('inboxChannelFilter');

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
        if (channelFilterEl) channelFilterEl.hidden = !isSent;
        if (!isSent && filterChannel) {
            filterChannel = '';
            updateChannelChipUI();
        }
    }

    function updateChannelChipUI() {
        if (!channelFilterEl) return;
        channelFilterEl.querySelectorAll('.channel-chip').forEach(function (chip) {
            chip.classList.toggle('active', (chip.dataset.channel || '') === filterChannel);
        });
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
        if (filterType)    params.set('type', filterType);
        if (filterChannel) params.set('channel', filterChannel);

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
        if (typeof window.applySidebarNotifCount === 'function') {
            window.applySidebarNotifCount(data.totalUnread);
        } else if (sidebarBadge) {
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

        let sigBadge = '';
        if (row.signatureStatus === 'COMPLETED') {
            sigBadge = '<span class="sig-status-badge completed"><i class="fas fa-check"></i> 처리됨</span>';
        } else if (row.signatureStatus === 'PENDING') {
            sigBadge = '<span class="sig-status-badge pending"><i class="fas fa-clock"></i> 처리대기</span>';
        }

        el.innerHTML =
            '<span class="row-icon">' + (ICONS[row.notificationType] || '🔔') + '</span>' +
            '<div class="row-body">' +
            '  <h3 class="row-title">' + escapeHtml(row.title) + sigBadge + '</h3>' +
            '  <p class="row-text">' + escapeHtml(row.body) + '</p>' +
            '</div>' +
            '<span class="row-time">' + formatTime(row.createdAt) + '</span>';

        el.addEventListener('click', function () {
            // 안 읽음 → 자동 읽음 처리 (백그라운드, 모달 동시 표시)
            if (isUnread) {
                fetch('/api/me/inbox/' + row.idx + '/read', {
                    method: 'PUT',
                    credentials: 'same-origin'
                }).then(function () {
                    el.classList.remove('unread');
                    const cur = sidebarBadge ? parseInt(sidebarBadge.dataset.count || '0', 10) : 0;
                    const next = Math.max(0, cur - 1);
                    if (typeof window.applySidebarNotifCount === 'function') {
                        window.applySidebarNotifCount(next);
                    } else if (sidebarBadge) {
                        sidebarBadge.textContent = next;
                        sidebarBadge.dataset.count = String(next);
                        sidebarBadge.hidden = next === 0;
                    }
                    if (unreadEl) unreadEl.textContent =
                            Math.max(0, (parseInt(unreadEl.textContent, 10) || 0) - 1);
                });
            }
            openReceivedModal(row);
        });
        return el;
    }

    function openReceivedModal(row) {
        let sigStatusRow = '';
        if (row.signatureStatus === 'COMPLETED') {
            sigStatusRow = '  <dt>서명 상태</dt><dd><span class="sig-status-badge completed"><i class="fas fa-check"></i> 처리됨</span></dd>';
        } else if (row.signatureStatus === 'PENDING') {
            sigStatusRow = '  <dt>서명 상태</dt><dd><span class="sig-status-badge pending"><i class="fas fa-clock"></i> 처리대기</span></dd>';
        }

        const html =
            '<dl class="notif-detail">' +
            '  <dt>알림 종류</dt><dd>' + escapeHtml(row.notificationTypeName || row.notificationType) + '</dd>' +
            sigStatusRow +
            '  <dt>받은 시각</dt><dd>' + escapeHtml(formatTime(row.createdAt)) + '</dd>' +
            (row.readAt
                ? '  <dt>읽은 시각</dt><dd>' + escapeHtml(formatTime(row.readAt)) + '</dd>'
                : '') +
            '</dl>' +
            '<div class="notif-body-preview">' + markdownLite(row.body) + '</div>';

        Swal.fire({
            title: row.title,
            html: html,
            width: 720,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: '닫기',
            customClass: { popup: 'notif-detail-popup' }
        });
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

        el.style.cursor = 'pointer';
        el.addEventListener('click', function () {
            openSentModal(row);
        });
        return el;
    }

    function openSentModal(row) {
        const stat = STATUS_LABEL[row.status] || { name: row.statusName || row.status || '', cls: '' };
        const recipient = row.recipientName
                ? escapeHtml(row.recipientName) +
                  (row.recipientEmpId ? ' <span style="color:#9ca3af;">(' + escapeHtml(row.recipientEmpId) + ')</span>' : '')
                : '<span style="color:#9ca3af;">(수신자 없음)</span>';

        const html =
            '<dl class="notif-detail">' +
            '  <dt>알림 종류</dt><dd>' + escapeHtml(row.notificationTypeName || row.notificationType) + '</dd>' +
            '  <dt>받는 사람</dt><dd>' + recipient + '</dd>' +
            '  <dt>채널</dt><dd>' + escapeHtml(row.channelLabel || row.channel) + '</dd>' +
            '  <dt>상태</dt><dd><span class="status-badge ' + stat.cls + '">' + escapeHtml(stat.name) + '</span></dd>' +
            (row.retryCount != null ? '  <dt>재시도</dt><dd>' + row.retryCount + '회</dd>' : '') +
            '  <dt>생성 시각</dt><dd>' + escapeHtml(formatTime(row.createdAt)) + '</dd>' +
            (row.sentAt
                ? '  <dt>발송 시각</dt><dd>' + escapeHtml(formatTime(row.sentAt)) + '</dd>'
                : '') +
            (row.lastError
                ? '  <dt>실패 사유</dt><dd style="color:#b91c1c;">' + escapeHtml(row.lastError) + '</dd>'
                : '') +
            '</dl>' +
            '<div class="notif-body-preview">' + markdownLite(row.body) + '</div>';

        Swal.fire({
            title: row.title,
            html: html,
            width: 720,
            showConfirmButton: true,
            confirmButtonText: '<i class="fas fa-redo"></i> 재발송',
            confirmButtonColor: '#1a73e8',
            showCancelButton: true,
            cancelButtonText: '닫기',
            customClass: { popup: 'notif-detail-popup' }
        }).then(function (r) {
            if (r.isConfirmed) resendNotification(row);
        });
    }

    function resendNotification(row) {
        Swal.fire({
            title: '같은 메시지를 다시 보낼까요?',
            html:
                '<div style="text-align:left;font-size:13px;color:#4b5563;">' +
                '  <strong>' + escapeHtml(row.recipientName || '수신자') + '</strong>' +
                (row.recipientEmpId ? ' (' + escapeHtml(row.recipientEmpId) + ')' : '') +
                '  님께 같은 내용으로 다시 발송합니다.<br>' +
                '  <span style="color:#9ca3af;">한 알림당 최대 5회까지 다시 보낼 수 있고, 메시지 앞에 \"📬 알림을 놓치신 것 같아 다시 보내드려요!\" 안내가 자동으로 붙어요.</span>' +
                '</div>',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '재발송',
            cancelButtonText: '취소',
            confirmButtonColor: '#1a73e8'
        }).then(function (c) {
            if (!c.isConfirmed) return;
            fetch('/api/notifications/' + row.idx + '/retry', {
                method: 'POST',
                credentials: 'same-origin'
            })
                .then(function (res) {
                    if (res.status === 409) {
                        return res.json().catch(function () { return null; })
                                .then(function (json) {
                                    Swal.fire({
                                        icon: 'warning',
                                        title: '재발송 한도를 모두 사용했습니다',
                                        text: (json && json.message) ||
                                              '같은 알림에 대한 재발송 한도(5회) 를 다 썼습니다. 메신저로 직접 연락해 주세요.'
                                    });
                                    throw new Error('LIMIT');
                                });
                    }
                    if (res.status === 403) throw new Error('FORBIDDEN');
                    if (!res.ok) throw new Error('FAIL');
                    return res.json();
                })
                .then(function (json) {
                    if (!json) return;
                    Swal.fire({
                        icon: 'success',
                        title: '재발송 큐에 등록됐습니다',
                        text: '결과는 잠시 후 [보낸 알림] 에 반영됩니다 (' +
                              json.userRetryCount + '/' + json.userRetryMax + ').',
                        timer: 2200,
                        showConfirmButton: false
                    });
                    load();
                })
                .catch(function (err) {
                    if (err.message === 'LIMIT') return;
                    if (err.message === 'FORBIDDEN') {
                        Swal.fire({ icon: 'error', title: '재발송 권한이 없습니다',
                            text: '본인이 일으킨 알림만 재발송 가능합니다.' });
                    } else {
                        Swal.fire({ icon: 'error', title: '재발송에 실패했습니다',
                            text: '잠시 후 다시 시도해 주세요.' });
                    }
                    console.error('[Inbox/sent] 재발송 실패', err);
                });
        });
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
    if (channelFilterEl) {
        channelFilterEl.addEventListener('click', function (ev) {
            const chip = ev.target.closest('.channel-chip');
            if (!chip || !channelFilterEl.contains(chip)) return;
            const next = chip.dataset.channel || '';
            if (next === filterChannel) return;
            filterChannel = next;
            updateChannelChipUI();
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

    // 본문 Markdown 렌더는 markdown-lite.js 의 MarkdownLite.render() 를 사용
    function markdownLite(text) {
        return window.MarkdownLite ? window.MarkdownLite.render(text) : escapeHtml(text || '');
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
