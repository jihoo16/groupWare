/* =========================================================
 * /notifications/{idx}/retry — 알림 재시도 페이지 (Phase 1)
 * C1914 메시지의 [🔄 다시 보내기] 링크가 도착하는 화면.
 * ========================================================= */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        const root = document.getElementById('notifRetryRoot');
        if (!root) return;

        const t = window.NOTIF_DUMMY.RETRY_TARGET;
        renderTarget(t);
        bindActions(t);
    });

    function renderTarget(t) {
        // 받을 사람
        const recipientCell = document.getElementById('retryRecipient');
        if (recipientCell) {
            recipientCell.innerHTML =
                escapeHtml(t.recipient.name) +
                ' <span class="recipient-detail">(' +
                escapeHtml(t.recipient.dept) + ', ' + escapeHtml(t.recipient.empId || '-') +
                ')</span>';
        }

        setText('retryTypeName', t.typeName);
        const docEl = document.getElementById('retryDocument');
        if (docEl) {
            docEl.innerHTML = '📄 ' + escapeHtml(t.documentTitle) + ' (' + escapeHtml(t.documentNo) + ')';
        }
        setText('retryCreatedAt', t.createdAt);

        // 실패 사유
        const reason = document.getElementById('retryFailureReason');
        if (reason) reason.textContent = t.failureReason;

        const attempt = document.getElementById('retryAttemptLine');
        if (attempt) {
            attempt.textContent =
                '첫 시도 실패: ' + (t.firstAttemptAt || '-') +
                ' / 마지막 시도: ' + (t.lastAttemptAt || '-') +
                ' (' + (t.retryCount || 0) + '회 실패)';
        }

        // 사용자 재시도 횟수
        const retryCounter = document.getElementById('retryUserCount');
        if (retryCounter) {
            retryCounter.textContent = '같은 원본에 대해 ' + t.userRetryMax + '회까지 재시도 가능 (현재 ' + t.userRetryCount + '/' + t.userRetryMax + ')';
        }

        // 권한·재시도 가능 여부
        const btn = document.getElementById('btnRetry');
        if (btn) {
            const blocked = !t.canRetry || (t.userRetryCount >= t.userRetryMax);
            btn.disabled = blocked;
            if (blocked) btn.title = '재시도 한도 초과 또는 차단됨';
        }
    }

    function bindActions(t) {
        document.getElementById('btnRetry')?.addEventListener('click', function () {
            Swal.fire({
                title: '알림을 다시 보낼까요?',
                html: '<p style="text-align:left;"><strong>' + escapeHtml(t.recipient.name) + '</strong>님께<br>「' + escapeHtml(t.typeName) + ' — ' + escapeHtml(t.documentTitle) + '」 을 다시 발송합니다.</p>',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: '다시 보내기',
                cancelButtonText: '취소',
                confirmButtonColor: '#1a73e8'
            }).then(function (r) {
                if (!r.isConfirmed) return;
                // Phase 4 에서 POST /api/notifications/{idx}/retry
                Swal.fire({
                    icon: 'success',
                    title: '다시 보냈습니다',
                    text: '결과는 잠시 후 알림으로 안내됩니다. (재시도가 또 실패하면 새 C1914 알림이 도착합니다.)',
                    timer: 2400,
                    showConfirmButton: false
                });
            });
        });

        document.getElementById('btnClose')?.addEventListener('click', function () {
            window.history.length > 1 ? window.history.back() : (window.location.href = '/home');
        });
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = (text == null ? '-' : text);
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
