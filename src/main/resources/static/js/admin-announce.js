/* ============================================================
 * 공지 보내기 (/admin/announce)
 * - 좌측 작성 폼 + 우측 실시간 미리보기
 * - POST /api/admin/notifications/announce 호출
 * ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    /* ─── DOM ─── */
    const titleEl     = document.getElementById('annTitle');
    const bodyEl      = document.getElementById('annBody');
    const titleCount  = document.getElementById('annTitleCount');
    const bodyCount   = document.getElementById('annBodyCount');
    const alsoInboxEl = document.getElementById('annAlsoInbox');
    const sendBtn     = document.getElementById('btnAnnSend');
    const resetBtn    = document.getElementById('btnAnnReset');
    const resultEl    = document.getElementById('annResult');

    const prevTitleEl   = document.getElementById('prevTitle');
    const prevBodyEl    = document.getElementById('prevBody');
    const prevTimeEl    = document.getElementById('prevTime');
    const prevChannelEl = document.getElementById('prevChannelLabel');

    /* ─── 미리보기 ─── */
    function refreshPreview() {
        const title = titleEl.value.trim();
        const body  = bodyEl.value;

        prevTitleEl.textContent = title || '제목이 여기에 표시됩니다';
        prevTitleEl.style.color = title ? '#111827' : '#cbd5e0';

        if (body.trim()) {
            prevBodyEl.classList.remove('empty');
            prevBodyEl.innerHTML = window.MarkdownLite
                    ? window.MarkdownLite.render(body, { block: true })
                    : escapeHtml(body);
        } else {
            prevBodyEl.classList.add('empty');
            prevBodyEl.textContent = '본문 내용이 여기에 미리보기로 렌더됩니다.';
        }

        prevChannelEl.textContent = alsoInboxEl.checked ? '채널 + 인박스' : '채널만';

        if (titleCount) titleCount.textContent = titleEl.value.length;
        if (bodyCount)  bodyCount.textContent  = bodyEl.value.length;

        toggleCounterOver(titleEl, titleCount, 100);
        toggleCounterOver(bodyEl, bodyCount, 4000);
    }

    function toggleCounterOver(input, counter, max) {
        if (!counter) return;
        const parent = counter.parentElement;
        if (input.value.length >= max) parent.classList.add('over');
        else parent.classList.remove('over');
    }

    function setCurrentTime() {
        const d = new Date();
        const pad = n => String(n).padStart(2, '0');
        prevTimeEl.textContent =
                d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
                ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    setCurrentTime();
    setInterval(setCurrentTime, 30000);

    // Markdown 렌더는 markdown-lite.js 의 MarkdownLite.render(text, { block: true }) 사용

    function escapeHtml(s) {
        const div = document.createElement('div');
        div.textContent = s == null ? '' : s;
        return div.innerHTML;
    }

    /* ─── 발송 ─── */
    async function handleSend() {
        const title = titleEl.value.trim();
        const body  = bodyEl.value.trim();
        const alsoInbox = alsoInboxEl.checked;

        if (!title) {
            Swal.fire({ icon: 'info', title: '제목을 입력해 주세요' });
            titleEl.focus();
            return;
        }
        if (!body) {
            Swal.fire({ icon: 'info', title: '본문을 입력해 주세요' });
            bodyEl.focus();
            return;
        }

        const confirm = await Swal.fire({
            icon: 'question',
            title: '이대로 공지를 보낼까요?',
            html:
                '<div style="text-align:left;font-size:13px;color:#4b5563;line-height:1.6;">' +
                '  <strong style="color:#111827;">' + escapeHtml(title) + '</strong><br>' +
                '  <span style="color:#9ca3af;font-size:12px;">' +
                (alsoInbox
                    ? '메신저 공지 채널 + 모든 직원 인박스에 발송됩니다.'
                    : '메신저 공지 채널에만 발송됩니다.') +
                '  </span>' +
                '</div>',
            showCancelButton: true,
            confirmButtonText: '발송',
            cancelButtonText: '취소',
            confirmButtonColor: '#1a73e8'
        });
        if (!confirm.isConfirmed) return;

        sendBtn.disabled = true;
        const originalLabel = sendBtn.innerHTML;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 발송 중';
        showResult(null);

        try {
            const res = await fetch('/api/admin/notifications/announce', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, body, alsoInbox })
            });
            if (res.status === 403) throw new Error('FORBIDDEN');
            if (!res.ok) {
                let msg = '발송에 실패했어요.';
                try { const j = await res.json(); if (j && j.message) msg = j.message; } catch (_) {}
                throw new Error(msg);
            }
            const json = await res.json();
            const inboxNote = json.inboxEnqueued > 0
                    ? ' + 직원 인박스 ' + json.inboxEnqueued + '건'
                    : '';
            showResult({
                ok: true,
                msg: '공지를 발송 큐에 등록했습니다 — 메신저 채널 1건' + inboxNote +
                     '. 결과는 [발송 이력] 에서 확인할 수 있어요.'
            });
            Swal.fire({
                icon: 'success',
                title: '공지를 보냈습니다',
                timer: 1600,
                showConfirmButton: false
            });
            resetForm();
        } catch (err) {
            const msg = err.message === 'FORBIDDEN'
                    ? '공지 발송 권한이 없습니다. (관리자 전용)'
                    : (err.message || '발송에 실패했어요. 잠시 후 다시 시도해 주세요.');
            showResult({ ok: false, msg });
            console.error('[Announce] 실패', err);
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = originalLabel;
        }
    }

    function showResult(state) {
        if (!resultEl) return;
        if (!state) {
            resultEl.hidden = true;
            resultEl.className = 'announce-result';
            resultEl.innerHTML = '';
            return;
        }
        resultEl.hidden = false;
        resultEl.className = 'announce-result ' + (state.ok ? 'success' : 'error');
        const icon = state.ok ? 'fa-check-circle' : 'fa-exclamation-circle';
        resultEl.innerHTML = '<i class="fas ' + icon + '"></i><span>' + escapeHtml(state.msg) + '</span>';
    }

    function resetForm() {
        titleEl.value = '';
        bodyEl.value = '';
        alsoInboxEl.checked = true;
        refreshPreview();
        titleEl.focus();
    }

    /* ─── 바인딩 ─── */
    titleEl.addEventListener('input', refreshPreview);
    bodyEl.addEventListener('input', refreshPreview);
    alsoInboxEl.addEventListener('change', refreshPreview);
    sendBtn.addEventListener('click', handleSend);
    resetBtn.addEventListener('click', async function () {
        if (!titleEl.value && !bodyEl.value) return;
        const c = await Swal.fire({
            icon: 'question',
            title: '입력한 내용을 모두 비울까요?',
            showCancelButton: true,
            confirmButtonText: '비우기',
            cancelButtonText: '취소',
            confirmButtonColor: '#dc2626'
        });
        if (c.isConfirmed) {
            resetForm();
            showResult(null);
        }
    });

    refreshPreview();
});
