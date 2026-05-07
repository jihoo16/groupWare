/* =========================================================
 * /admin/notifications/logs — 발송 이력 (Phase 1)
 * ========================================================= */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        const root = document.getElementById('notifLogsRoot');
        if (!root) return;

        renderFilterOptions();
        renderTable(window.NOTIF_DUMMY.LOGS);
        bindActions();
    });

    function renderFilterOptions() {
        const typeSel = document.getElementById('flType');
        if (typeSel) {
            const opts = ['<option value="">전체 알림 종류</option>']
                .concat(window.NOTIF_DUMMY.TYPES.map(function (t) {
                    return '<option value="' + t.code + '">' + escapeHtml(t.name) + '</option>';
                }));
            typeSel.innerHTML = opts.join('');
        }
        const statusSel = document.getElementById('flStatus');
        if (statusSel) {
            const opts = ['<option value="">전체 상태</option>'];
            Object.keys(window.NOTIF_DUMMY.STATUSES).forEach(function (k) {
                opts.push('<option value="' + k + '">' + escapeHtml(window.NOTIF_DUMMY.STATUSES[k].name) + '</option>');
            });
            statusSel.innerHTML = opts.join('');
        }
    }

    function renderTable(rows) {
        const tbody = document.getElementById('logsTbody');
        const empty = document.getElementById('logsEmpty');
        if (!tbody) return;

        if (!rows || rows.length === 0) {
            tbody.innerHTML = '';
            if (empty) empty.style.display = '';
            return;
        }
        if (empty) empty.style.display = 'none';

        const STATUSES = window.NOTIF_DUMMY.STATUSES;

        tbody.innerHTML = rows.map(function (r) {
            const st = STATUSES[r.status] || { name: r.status, cssClass: '' };
            const recipient = r.recipient.name +
                (r.recipient.empId ? ' <span style="color:#9ca3af;font-size:11px;">(' + r.recipient.empId + ')</span>' : '');
            const actorBadge = r.actorNotified
                ? '<span class="actor-notified-badge notified"><i class="fas fa-bell"></i> 발송됨</span>'
                : (isPermanentFailure(r.status) ? '<span class="actor-notified-badge"><i class="fas fa-bell-slash"></i> 미발송</span>' : '<span style="color:#d1d5db;">-</span>');

            const errorCell = r.lastError
                ? '<span style="color:#b91c1c;font-size:12px;" title="' + escapeHtml(r.lastError) + '">' + escapeHtml(truncate(r.lastError, 24)) + '</span>'
                : '<span style="color:#d1d5db;">-</span>';

            return (
                '<tr>' +
                '  <td>' + r.idx + '</td>' +
                '  <td>' + escapeHtml(r.typeName) + '</td>' +
                '  <td>' + recipient + '</td>' +
                '  <td>' + escapeHtml(r.actor.name) + '</td>' +
                '  <td>' + escapeHtml(r.documentNo) + '</td>' +
                '  <td><span class="status-badge ' + st.cssClass + '">' + escapeHtml(st.name) + '</span></td>' +
                '  <td style="text-align:center;">' + r.retryCount + '</td>' +
                '  <td>' + errorCell + '</td>' +
                '  <td>' + actorBadge + '</td>' +
                '  <td style="white-space:nowrap;font-size:12px;color:#6b7280;">' + escapeHtml(r.sentAt || r.createdAt || '-') + '</td>' +
                '  <td>' +
                '    <button class="notif-btn" data-action="detail" data-idx="' + r.idx + '"><i class="fas fa-search"></i></button>' +
                (canRetry(r.status) ? '    <button class="notif-btn notif-btn-primary" data-action="retry" data-idx="' + r.idx + '"><i class="fas fa-redo"></i></button>' : '') +
                (canCancel(r.status) ? '    <button class="notif-btn notif-btn-danger" data-action="cancel" data-idx="' + r.idx + '"><i class="fas fa-times"></i></button>' : '') +
                '  </td>' +
                '</tr>'
            );
        }).join('');
    }

    function canRetry(status)  { return status === 'C2004' || status === 'C2006'; }
    function canCancel(status) { return status === 'C2001' || status === 'C2005'; }
    function isPermanentFailure(status) { return status === 'C2004' || status === 'C2006'; }

    function bindActions() {
        document.getElementById('logsTbody')?.addEventListener('click', function (e) {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const idx = btn.dataset.idx;

            if (action === 'detail') {
                Swal.fire({
                    title: '#' + idx + ' 알림 상세',
                    html: '<p style="text-align:left;">미리보기 화면입니다. 실제 상세 정보 조회는 다음 작업 단계에서 연결됩니다.</p>',
                    icon: 'info'
                });
            } else if (action === 'retry') {
                Swal.fire({
                    title: '재시도하시겠습니까?',
                    text: '#' + idx + ' 알림을 다시 큐에 넣습니다.',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: '재시도'
                }).then(function (r) {
                    if (r.isConfirmed) {
                        Swal.fire({ icon: 'success', title: '재시도 큐 등록됨 (더미)', timer: 1500, showConfirmButton: false });
                    }
                });
            } else if (action === 'cancel') {
                Swal.fire({
                    title: '취소하시겠습니까?',
                    text: '#' + idx + ' 미발송 알림을 취소합니다.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: '취소 처리',
                    confirmButtonColor: '#dc2626'
                }).then(function (r) {
                    if (r.isConfirmed) {
                        Swal.fire({ icon: 'success', title: '취소 처리됨 (더미)', timer: 1500, showConfirmButton: false });
                    }
                });
            }
        });

        document.getElementById('btnApplyFilter')?.addEventListener('click', function () {
            const type   = document.getElementById('flType')?.value || '';
            const status = document.getElementById('flStatus')?.value || '';
            const kw     = document.getElementById('flKeyword')?.value?.trim() || '';

            const filtered = window.NOTIF_DUMMY.LOGS.filter(function (r) {
                if (type && r.type !== type) return false;
                if (status && r.status !== status) return false;
                if (kw) {
                    const blob = (r.recipient.name + ' ' + r.actor.name + ' ' + r.documentNo + ' ' + (r.lastError || '')).toLowerCase();
                    if (blob.indexOf(kw.toLowerCase()) === -1) return false;
                }
                return true;
            });
            renderTable(filtered);
        });

        document.getElementById('btnResetFilter')?.addEventListener('click', function () {
            ['flType', 'flStatus', 'flKeyword', 'flFrom', 'flTo'].forEach(function (id) {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            renderTable(window.NOTIF_DUMMY.LOGS);
        });

        document.getElementById('btnExportCsv')?.addEventListener('click', function () {
            Swal.fire({
                icon: 'info',
                title: '미리보기 화면',
                text: '현재 필터 조건의 이력을 CSV 로 내려받는 자리입니다. 실제 다운로드는 다음 작업 단계에서 연결됩니다.'
            });
        });
    }

    function truncate(s, n) {
        s = String(s || '');
        return s.length > n ? s.slice(0, n - 1) + '…' : s;
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
