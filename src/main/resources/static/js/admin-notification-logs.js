/* =========================================================
 * /admin/notifications/logs — 발송 이력 (실 API)
 * GET /api/admin/notifications/logs
 * ========================================================= */

(function () {
    'use strict';

    const PAGE_SIZE = 30;

    const TYPES = [
        ['C1901', '서명요청'],   ['C1902', '서명진행'],   ['C1903', '서명완료'],
        ['C1904', '외부참석자서명완료'],
        ['C1905', '연차승인'],   ['C1906', '연차반려'],   ['C1907', '연차관리자삭제'],
        ['C1908', '일정초대'],   ['C1909', '일정변경'],   ['C1910', '일정취소'],
        ['C1911', '프로젝트참여'], ['C1912', '프로젝트정보변경'], ['C1913', '프로젝트제외'],
        ['C1914', '알림발송실패'], ['C1915', '시스템공지']
    ];
    const STATUSES = [
        ['C2001', '발송대기',     'status-pending'],
        ['C2002', '발송성공',     'status-sent'],
        ['C2003', '발송제외',     'status-skipped'],
        ['C2004', '발송실패',     'status-failed'],
        ['C2005', '재시도대기',   'status-retry-wait'],
        ['C2006', '만료',         'status-expired']
    ];
    const STATUS_BY_CODE = (function () {
        const m = {};
        STATUSES.forEach(function (s) { m[s[0]] = { name: s[1], cls: s[2] }; });
        return m;
    })();

    let currentPage = 0;
    let totalPages = 1;
    let lastQueryString = '';

    document.addEventListener('DOMContentLoaded', function () {
        const root = document.getElementById('notifLogsRoot');
        if (!root) return;
        renderFilterOptions();
        bindActions();
        load();
    });

    function renderFilterOptions() {
        const typeSel = document.getElementById('flType');
        if (typeSel) {
            typeSel.innerHTML = '<option value="">전체 알림 종류</option>' +
                TYPES.map(function (t) {
                    return '<option value="' + t[0] + '">' + escapeHtml(t[1]) + '</option>';
                }).join('');
        }
        const statusSel = document.getElementById('flStatus');
        if (statusSel) {
            statusSel.innerHTML = '<option value="">전체 상태</option>' +
                STATUSES.map(function (s) {
                    return '<option value="' + s[0] + '">' + escapeHtml(s[1]) + '</option>';
                }).join('');
        }
    }

    function buildFilterParams() {
        const params = new URLSearchParams();
        const t = document.getElementById('flType');     if (t && t.value) params.set('type',    t.value);
        const s = document.getElementById('flStatus');   if (s && s.value) params.set('status',  s.value);
        const k = document.getElementById('flKeyword');  if (k && k.value.trim()) params.set('keyword', k.value.trim());
        const f = document.getElementById('flFrom');     if (f && f.value) params.set('from',    f.value);
        const o = document.getElementById('flTo');       if (o && o.value) params.set('to',      o.value);
        return params;
    }

    function load() {
        const params = buildFilterParams();
        params.set('page', String(currentPage));
        params.set('size', String(PAGE_SIZE));
        lastQueryString = params.toString();

        fetch('/api/admin/notifications/logs?' + params.toString(), { credentials: 'same-origin' })
            .then(function (res) {
                if (res.status === 403) throw new Error('FORBIDDEN');
                if (!res.ok) throw new Error('LOAD_FAILED');
                return res.json();
            })
            .then(render)
            .catch(function (err) {
                console.error('[Logs] 조회 실패', err);
                Swal.fire({ icon: 'error', title: '발송 이력을 불러오지 못했습니다',
                    text: '잠시 후 다시 시도해 주세요.' });
            });
    }

    function render(data) {
        const tbody = document.getElementById('logsTbody');
        const empty = document.getElementById('logsEmpty');
        const rows = data.content || [];

        totalPages = data.totalPages || 1;
        renderPagination(data.totalElements || 0);

        if (rows.length === 0) {
            tbody.innerHTML = '';
            if (empty) empty.style.display = '';
            return;
        }
        if (empty) empty.style.display = 'none';

        tbody.innerHTML = rows.map(function (r) {
            const st = STATUS_BY_CODE[r.status] || { name: r.statusName || r.status, cls: '' };

            const recipient = (r.recipientName || '-') +
                (r.recipientEmpId ? ' <span style="color:#9ca3af;font-size:11px;">(' + escapeHtml(r.recipientEmpId) + ')</span>' : '');

            const actorBadge = isPermanentFailure(r.status)
                ? (r.actorFallbackEmitted
                        ? '<span class="actor-notified-badge notified"><i class="fas fa-bell"></i> 발송됨</span>'
                        : '<span class="actor-notified-badge"><i class="fas fa-bell-slash"></i> 미발송</span>')
                : '<span style="color:#d1d5db;">-</span>';

            const errorCell = r.lastError
                ? '<span style="color:#b91c1c;font-size:12px;" title="' + escapeHtml(r.lastError) + '">' +
                  escapeHtml(truncate(r.lastError, 24)) + '</span>'
                : '<span style="color:#d1d5db;">-</span>';

            const whenStr = r.sentAt ? formatTime(r.sentAt) : (r.createdAt ? formatTime(r.createdAt) : '-');
            const canCancel = r.status === 'C2001' || r.status === 'C2005';
            const canRetry  = r.status === 'C2004' || r.status === 'C2006' || r.status === 'C2003';

            const actions =
                '<button class="notif-btn" data-action="detail" data-idx="' + r.idx + '" title="상세"><i class="fas fa-search"></i></button>' +
                (canRetry  ? '<button class="notif-btn notif-btn-primary" data-action="retry" data-idx="' + r.idx + '" title="재시도"><i class="fas fa-redo"></i></button>' : '') +
                (canCancel ? '<button class="notif-btn notif-btn-danger" data-action="cancel" data-idx="' + r.idx + '" title="취소"><i class="fas fa-times"></i></button>' : '');

            return (
                '<tr>' +
                '  <td>' + r.idx + '</td>' +
                '  <td>' + escapeHtml(r.notificationTypeName || r.notificationType) + '</td>' +
                '  <td>' + recipient + '</td>' +
                '  <td>' + escapeHtml(r.actorName || '-') + '</td>' +
                '  <td>' + escapeHtml(r.documentNo || '-') + '</td>' +
                '  <td><span class="status-badge ' + st.cls + '">' + escapeHtml(st.name) + '</span></td>' +
                '  <td style="text-align:center;">' + (r.retryCount != null ? r.retryCount : 0) + '</td>' +
                '  <td>' + errorCell + '</td>' +
                '  <td>' + actorBadge + '</td>' +
                '  <td style="white-space:nowrap;font-size:12px;color:#6b7280;">' + escapeHtml(whenStr) + '</td>' +
                '  <td style="white-space:nowrap;">' + actions + '</td>' +
                '</tr>'
            );
        }).join('');
    }

    function renderPagination(totalElements) {
        // 페이지 정보 + 버튼 모두 채움. 기존 정적 더미 마크업 위에 덧씀.
        const wrapInfo = document.querySelector('.logs-pagination .page-info');
        const wrapBtns = document.querySelector('.logs-pagination .page-buttons');
        if (wrapInfo) {
            wrapInfo.innerHTML = '총 <strong>' + totalElements + '</strong>건 · ' +
                (currentPage + 1) + ' / ' + Math.max(totalPages, 1) + ' 페이지';
        }
        if (!wrapBtns) return;
        wrapBtns.innerHTML = '';

        const mk = function (html, page, opts) {
            opts = opts || {};
            const b = document.createElement('button');
            b.innerHTML = html;
            if (opts.disabled) b.disabled = true;
            else b.addEventListener('click', function () { currentPage = page; load(); });
            if (opts.active) b.classList.add('active');
            return b;
        };

        wrapBtns.appendChild(mk('<i class="fas fa-angle-double-left"></i>', 0,
                { disabled: currentPage <= 0 }));
        wrapBtns.appendChild(mk('<i class="fas fa-angle-left"></i>', currentPage - 1,
                { disabled: currentPage <= 0 }));

        // 가운데 페이지 번호 (현재 ± 2)
        const start = Math.max(0, currentPage - 2);
        const end   = Math.min(totalPages - 1, currentPage + 2);
        for (let p = start; p <= end; p++) {
            wrapBtns.appendChild(mk(String(p + 1), p, { active: p === currentPage }));
        }

        wrapBtns.appendChild(mk('<i class="fas fa-angle-right"></i>', currentPage + 1,
                { disabled: currentPage >= totalPages - 1 }));
        wrapBtns.appendChild(mk('<i class="fas fa-angle-double-right"></i>', totalPages - 1,
                { disabled: currentPage >= totalPages - 1 }));
    }

    function bindActions() {
        document.getElementById('btnApplyFilter')?.addEventListener('click', function () {
            currentPage = 0;
            load();
        });
        document.getElementById('btnResetFilter')?.addEventListener('click', function () {
            ['flType', 'flStatus', 'flKeyword', 'flFrom', 'flTo'].forEach(function (id) {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            currentPage = 0;
            load();
        });
        document.getElementById('btnExportCsv')?.addEventListener('click', function () {
            const params = buildFilterParams();
            window.location.href = '/api/admin/notifications/logs/export?' + params.toString();
        });

        // 행 액션 버튼
        const tbody = document.getElementById('logsTbody');
        if (tbody) {
            tbody.addEventListener('click', function (e) {
                const btn = e.target.closest('button[data-action]');
                if (!btn) return;
                const action = btn.dataset.action;
                const idx = btn.dataset.idx;
                if (action === 'detail') showDetail(idx);
                else if (action === 'retry')  doRetry(idx);
                else if (action === 'cancel') doCancel(idx);
            });
        }
    }

    function showDetail(idx) {
        fetch('/api/admin/notifications/logs/' + idx, { credentials: 'same-origin' })
            .then(function (res) { if (!res.ok) throw new Error('NOT_FOUND'); return res.json(); })
            .then(function (r) {
                const lines = [
                    '<dl style="display:grid;grid-template-columns:120px 1fr;gap:6px 12px;font-size:13px;text-align:left;">',
                    '  <dt>알림 종류</dt><dd>' + escapeHtml(r.notificationTypeName || r.notificationType) + '</dd>',
                    '  <dt>채널</dt><dd>' + escapeHtml(r.channel) + '</dd>',
                    '  <dt>상태</dt><dd>' + escapeHtml(r.statusName || r.status) + '</dd>',
                    '  <dt>수신자</dt><dd>' + escapeHtml(r.recipientName || '-') +
                        (r.recipientEmpId ? ' (' + escapeHtml(r.recipientEmpId) + ')' : '') + '</dd>',
                    '  <dt>처리자</dt><dd>' + escapeHtml(r.actorName || '-') + '</dd>',
                    '  <dt>문서번호</dt><dd>' + escapeHtml(r.documentNo || '-') + '</dd>',
                    '  <dt>재시도</dt><dd>' + (r.retryCount != null ? r.retryCount : 0) + '회</dd>',
                    '  <dt>생성</dt><dd>' + escapeHtml(formatTime(r.createdAt)) + '</dd>',
                    '  <dt>발송</dt><dd>' + escapeHtml(r.sentAt ? formatTime(r.sentAt) : '-') + '</dd>',
                    r.lastError ? '  <dt>마지막 에러</dt><dd style="color:#b91c1c;">' + escapeHtml(r.lastError) + '</dd>' : '',
                    r.mmPostId ? '  <dt>MM Post ID</dt><dd style="font-family:monospace;font-size:12px;">' + escapeHtml(r.mmPostId) + '</dd>' : '',
                    '</dl>'
                ].filter(Boolean).join('');
                Swal.fire({ title: '#' + idx + ' 알림 상세', html: lines, width: 600 });
            })
            .catch(function () {
                Swal.fire({ icon: 'error', title: '상세를 불러오지 못했습니다' });
            });
    }

    function doRetry(idx) {
        Swal.fire({
            title: '재시도하시겠습니까?',
            text: '#' + idx + ' 알림을 같은 내용으로 새 큐에 넣습니다.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '재시도',
            cancelButtonText: '취소'
        }).then(function (r) {
            if (!r.isConfirmed) return;
            fetch('/api/admin/notifications/logs/' + idx + '/retry', {
                method: 'POST', credentials: 'same-origin'
            })
                .then(function (res) { if (!res.ok) throw new Error('FAIL'); return res.json(); })
                .then(function () {
                    Swal.fire({ icon: 'success', title: '재시도 큐에 등록됐습니다',
                        timer: 1500, showConfirmButton: false });
                    load();
                })
                .catch(function () {
                    Swal.fire({ icon: 'error', title: '재시도 등록에 실패했습니다' });
                });
        });
    }

    function doCancel(idx) {
        Swal.fire({
            title: '취소하시겠습니까?',
            text: '#' + idx + ' 미발송 알림을 발송하지 않도록 처리합니다.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '취소 처리',
            cancelButtonText: '닫기',
            confirmButtonColor: '#dc2626'
        }).then(function (r) {
            if (!r.isConfirmed) return;
            fetch('/api/admin/notifications/logs/' + idx + '/cancel', {
                method: 'POST', credentials: 'same-origin'
            })
                .then(function (res) {
                    if (res.status === 409) {
                        Swal.fire({ icon: 'warning', title: '이미 처리된 알림입니다',
                            text: '대기중 / 재시도대기 상태에서만 취소할 수 있습니다.' });
                        throw new Error('CONFLICT');
                    }
                    if (!res.ok) throw new Error('FAIL');
                    return res.json();
                })
                .then(function () {
                    Swal.fire({ icon: 'success', title: '취소 처리됐습니다',
                        timer: 1500, showConfirmButton: false });
                    load();
                })
                .catch(function (err) {
                    if (err.message === 'CONFLICT') return;
                    Swal.fire({ icon: 'error', title: '취소에 실패했습니다' });
                });
        });
    }

    function isPermanentFailure(status) {
        return status === 'C2004' || status === 'C2006';
    }

    function truncate(s, n) {
        s = String(s == null ? '' : s);
        return s.length > n ? s.slice(0, n - 1) + '…' : s;
    }

    function formatTime(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        const pad = function (n) { return String(n).padStart(2, '0'); };
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
               ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    function escapeHtml(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
})();
