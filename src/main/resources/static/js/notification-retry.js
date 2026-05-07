/* =========================================================
 * /notifications/{idx}/retry — 수동 재시도 페이지 (실 API)
 * GET  /api/notifications/{idx}/retry-info
 * POST /api/notifications/{idx}/retry
 * ========================================================= */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        const root = document.getElementById('notifRetryRoot');
        if (!root) return;

        const idx = parseIdxFromUrl();
        if (idx == null) {
            renderError('URL 에서 알림 번호를 찾지 못했습니다.');
            return;
        }
        load(idx);
        bindActions(idx);
    });

    function parseIdxFromUrl() {
        const m = window.location.pathname.match(/\/notifications\/(\d+)\/retry/);
        if (!m) return null;
        const n = parseInt(m[1], 10);
        return Number.isFinite(n) ? n : null;
    }

    function load(idx) {
        fetch('/api/notifications/' + idx + '/retry-info', { credentials: 'same-origin' })
            .then(function (res) {
                if (res.status === 401) throw new Error('UNAUTH');
                if (res.status === 403) throw new Error('FORBIDDEN');
                if (res.status === 404) throw new Error('NOT_FOUND');
                if (!res.ok) throw new Error('LOAD_FAILED');
                return res.json();
            })
            .then(render)
            .catch(function (err) {
                if (err.message === 'UNAUTH')   return renderError('로그인이 필요합니다.');
                if (err.message === 'FORBIDDEN') return renderError('이 알림을 재시도할 권한이 없습니다.');
                if (err.message === 'NOT_FOUND') return renderError('알림을 찾을 수 없습니다.');
                console.error('[Retry] 조회 실패', err);
                renderError('알림 정보를 불러오지 못했습니다.');
            });
    }

    function render(t) {
        const recipientCell = document.getElementById('retryRecipient');
        if (recipientCell) {
            const meta = [t.recipientDept, t.recipientEmpId].filter(Boolean).join(', ');
            recipientCell.innerHTML = escapeHtml(t.recipientName || '-') +
                (meta ? ' <span class="recipient-detail">(' + escapeHtml(meta) + ')</span>' : '');
        }

        setText('retryTypeName', t.notificationTypeName || t.notificationType || '-');

        const docEl = document.getElementById('retryDocument');
        if (docEl) {
            if (t.documentTitle || t.documentNo) {
                docEl.innerHTML = '📄 ' + escapeHtml(t.documentTitle || '문서') +
                    (t.documentNo ? ' (' + escapeHtml(t.documentNo) + ')' : '');
            } else {
                docEl.innerHTML = '-';
            }
        }

        setText('retryCreatedAt', formatTime(t.createdAt));

        const reason = document.getElementById('retryFailureReason');
        if (reason) reason.textContent = t.failureReason || '(사유 미기재)';

        const attempt = document.getElementById('retryAttemptLine');
        if (attempt) {
            attempt.textContent =
                '최초 발생: ' + formatTime(t.createdAt) +
                (t.lastAttemptAt ? ' / 마지막 시도: ' + formatTime(t.lastAttemptAt) : '') +
                (t.attemptedRetryCount != null ? ' (자동 재시도 ' + t.attemptedRetryCount + '회 실패)' : '');
        }

        const userCounter = document.getElementById('retryUserCount');
        if (userCounter) {
            userCounter.textContent = '같은 원본에 대해 ' + t.userRetryMax + '회까지 재시도 가능 (현재 ' +
                t.userRetryCount + '/' + t.userRetryMax + ')';
        }

        const btn = document.getElementById('btnRetry');
        if (btn) {
            btn.disabled = !t.canRetry;
            if (!t.canRetry) btn.title = '재시도 한도 초과';
        }

        // 더미 미리보기 카드 제거 (페이지에 남아있을 경우)
        document.querySelectorAll('.retry-card').forEach(function (el) {
            const txt = el.textContent || '';
            if (txt.indexOf('미리보기 화면') !== -1) el.style.display = 'none';
        });
    }

    function renderError(msg) {
        const card = document.querySelector('.retry-card');
        if (!card) return;
        card.innerHTML =
            '<h1 class="retry-title">알림 다시 보내기</h1>' +
            '<div class="retry-section">' +
            '  <p style="padding:24px 0;color:#b91c1c;text-align:center;">' + escapeHtml(msg) + '</p>' +
            '</div>' +
            '<div class="retry-actions" style="justify-content:center;">' +
            '  <button class="btn-close" onclick="history.length>1?history.back():location.href=\'/home\'">' +
            '    <i class="fas fa-times"></i> 닫기' +
            '  </button>' +
            '</div>';
    }

    function bindActions(idx) {
        document.getElementById('btnRetry')?.addEventListener('click', async function () {
            const result = await Swal.fire({
                title: '알림을 다시 보낼까요?',
                text: '같은 내용으로 다시 발송합니다.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: '다시 보내기',
                cancelButtonText: '취소',
                confirmButtonColor: '#1a73e8'
            });
            if (!result.isConfirmed) return;

            try {
                const res = await fetch('/api/notifications/' + idx + '/retry', {
                    method: 'POST',
                    credentials: 'same-origin'
                });
                if (res.status === 409) {
                    const json = await res.json().catch(function () { return null; });
                    Swal.fire({ icon: 'warning', title: '재시도 한도를 모두 사용했습니다',
                        text: (json && json.message) || '메신저로 직접 연락해 주세요.' });
                    return;
                }
                if (!res.ok) throw new Error('RETRY_FAILED');
                const json = await res.json();
                Swal.fire({
                    icon: 'success',
                    title: '다시 보냈습니다',
                    text: '결과는 잠시 후 알림으로 안내됩니다 (사용자 수동 재시도 ' +
                          json.userRetryCount + '/' + json.userRetryMax + ').',
                    timer: 2400,
                    showConfirmButton: false
                });
                // 정보 갱신
                load(idx);
            } catch (e) {
                Swal.fire({ icon: 'error', title: '재시도에 실패했습니다',
                    text: '잠시 후 다시 시도해 주세요.' });
                console.error('[Retry] POST 실패', e);
            }
        });

        document.getElementById('btnClose')?.addEventListener('click', function () {
            window.history.length > 1 ? window.history.back() : (window.location.href = '/home');
        });
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val == null ? '-' : val;
    }

    function formatTime(iso) {
        if (!iso) return '-';
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
