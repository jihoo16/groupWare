/**
 * 모바일 전자서명 페이지 스크립트
 *
 * 플로우:
 *   1. DOMContentLoaded → POST /scan (QR 스캔 확인)
 *   2. Step 1: 사번 입력 → POST /verify
 *   3. Step 2: Signature Pad → POST /submit
 *   4. Step 3: 완료 화면
 *
 * 카운트다운:
 *   세션 expires_at 기준, 1초마다 갱신. 만료 시 캔버스 비활성화 + 안내.
 */
(function() {
    'use strict';

    const token = window.SESSION_TOKEN;
    if (!token) {
        showError('토큰이 없습니다', '잘못된 경로로 접근했습니다.');
        return;
    }

    // QR URL에서 vh(사번 해시) 파라미터 추출
    const urlParams = new URLSearchParams(window.location.search);
    const verifyHash = urlParams.get('vh') || '';

    // 상태
    let sessionData = null;
    let signaturePad = null;
    let countdownTimer = null;
    let expiresAtMs = 0;

    // ============================================================
    // 초기 진입: QR 스캔 확인
    // ============================================================
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const response = await fetch(`/api/signature/session/${token}/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const error = await safeJson(response);
                showError('세션을 찾을 수 없습니다', error?.message || '만료되었거나 잘못된 링크일 수 있습니다.');
                return;
            }

            sessionData = await response.json();
            renderDocInfo();
            startCountdown();
            routeByStatus(sessionData.status, sessionData.verified);
        } catch (err) {
            console.error(err);
            showError('연결 오류', '서버에 접근할 수 없습니다. 네트워크를 확인해주세요.');
        }
    });

    // ============================================================
    // 상태별 화면 라우팅
    // ============================================================
    function routeByStatus(status, verified) {
        // C1305 만료 / C1306 취소 / C1304 서명완료 → 에러 또는 완료
        if (status === 'C1305') {
            showError('세션이 만료되었습니다', 'PC에서 QR 코드를 다시 생성해주세요.');
            return;
        }
        if (status === 'C1306') {
            showError('세션이 취소되었습니다', '서명 요청이 취소되었습니다.');
            return;
        }
        if (status === 'C1304') {
            showStep('step-complete');
            return;
        }

        // C1303 본인인증완료 → 바로 서명 단계
        if (verified || status === 'C1303') {
            showStep('step-sign');
            initSignaturePad();
            return;
        }

        // C1302 스캔완료 → 사번 입력
        showStep('step-verify');
        bindVerifyStep();
    }

    // ============================================================
    // STEP 1: 사번 인증
    // ============================================================
    function bindVerifyStep() {
        const input = document.getElementById('emp-id-input');
        const btn = document.getElementById('verify-btn');
        const notice = document.getElementById('verify-fail-notice');

        input.focus();

        const doVerify = async () => {
            const empId = input.value.trim();
            if (!empId) {
                notice.style.display = 'block';
                notice.textContent = '사번을 입력해주세요';
                return;
            }
            btn.disabled = true;
            try {
                const response = await fetch(`/api/signature/session/${token}/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ empId, verifyHash })
                });
                const data = await safeJson(response);

                if (data?.sessionExpired) {
                    showError('세션이 만료되었습니다', data.message || 'PC에서 QR을 다시 생성해주세요.');
                    return;
                }

                if (data?.success) {
                    sessionData.verified = true;
                    sessionData.status = data.status;
                    sessionData.signerNameFull = data.signerNameFull;
                    // 문서 정보 재렌더 (이름 전체 공개)
                    document.getElementById('signer-name').textContent = data.signerNameFull || '-';
                    document.getElementById('verified-badge').style.display = 'inline-flex';
                    showStep('step-sign');
                    initSignaturePad();
                } else {
                    notice.style.display = 'block';
                    notice.textContent = data?.message || '사번이 일치하지 않습니다';
                    input.value = '';
                    input.focus();
                }
            } catch (err) {
                console.error(err);
                Swal.fire({ icon: 'error', title: '오류', text: '인증 처리 중 오류가 발생했습니다.' });
            } finally {
                btn.disabled = false;
            }
        };

        btn.addEventListener('click', doVerify);
        input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') doVerify();
        });
    }

    // ============================================================
    // STEP 2: 손서명
    // ============================================================
    function initSignaturePad() {
        const canvas = document.getElementById('signature-canvas');
        const placeholder = document.getElementById('canvas-placeholder');
        const wrapper = canvas.parentElement;

        // 고해상도 대응
        resizeCanvas(canvas);
        window.addEventListener('resize', () => resizeCanvas(canvas));
        window.addEventListener('orientationchange', () => setTimeout(() => resizeCanvas(canvas), 300));

        signaturePad = new SignaturePad(canvas, {
            backgroundColor: 'rgba(255,255,255,0)',
            penColor: '#000000',
            minWidth: 1,
            maxWidth: 3
        });

        signaturePad.addEventListener('beginStroke', () => {
            wrapper.classList.add('drawn');
        });

        document.getElementById('clear-btn').addEventListener('click', () => {
            signaturePad.clear();
            wrapper.classList.remove('drawn');
        });

        document.getElementById('submit-btn').addEventListener('click', submitSignature);
    }

    function resizeCanvas(canvas) {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        const ctx = canvas.getContext('2d');
        ctx.scale(ratio, ratio);
        if (signaturePad) signaturePad.clear();
    }

    async function submitSignature() {
        if (!signaturePad || signaturePad.isEmpty()) {
            Swal.fire({ icon: 'warning', title: '서명 필요', text: '서명을 입력한 후 제출해주세요.' });
            return;
        }
        // 만료 체크
        if (Date.now() >= expiresAtMs) {
            showError('세션이 만료되었습니다', 'PC에서 QR을 다시 생성해주세요.');
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 제출 중...';

        try {
            const dataUrl = signaturePad.toDataURL('image/png');
            const response = await fetch(`/api/signature/session/${token}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signatureImageBase64: dataUrl })
            });

            if (!response.ok) {
                const error = await safeJson(response);
                throw new Error(error?.message || '서명 제출 실패');
            }

            if (countdownTimer) clearInterval(countdownTimer);
            showStep('step-complete');
        } catch (err) {
            console.error(err);
            Swal.fire({ icon: 'error', title: '제출 실패', text: err.message || '다시 시도해주세요.' });
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 제출';
        }
    }

    // ============================================================
    // 공통 UI 헬퍼
    // ============================================================
    function renderDocInfo() {
        document.getElementById('sig-loading').style.display = 'none';
        document.getElementById('sig-doc-info').style.display = 'block';
        document.getElementById('doc-no').textContent = sessionData.documentNo || '-';
        document.getElementById('doc-title').textContent = sessionData.documentTitle || '-';
        document.getElementById('slot-label').textContent = sessionData.signatureSlotLabel || '-';
        const nameEl = document.getElementById('signer-name');
        if (sessionData.verified && sessionData.signerNameFull) {
            nameEl.textContent = sessionData.signerNameFull;
            document.getElementById('verified-badge').style.display = 'inline-flex';
        } else {
            nameEl.textContent = sessionData.signerNameMasked || '-';
        }
    }

    function showStep(id) {
        ['step-verify', 'step-sign', 'step-complete'].forEach(s => {
            const el = document.getElementById(s);
            if (el) el.style.display = (s === id) ? 'flex' : 'none';
        });
    }

    function showError(title, message) {
        document.getElementById('sig-loading').style.display = 'none';
        document.getElementById('sig-doc-info').style.display = 'none';
        ['step-verify', 'step-sign', 'step-complete'].forEach(s => {
            const el = document.getElementById(s);
            if (el) el.style.display = 'none';
        });
        document.getElementById('sig-error-title').textContent = title;
        document.getElementById('sig-error-message').textContent = message;
        document.getElementById('sig-error').style.display = 'block';
        if (countdownTimer) clearInterval(countdownTimer);
    }

    function startCountdown() {
        if (!sessionData.expiresAt) return;
        expiresAtMs = new Date(sessionData.expiresAt).getTime();
        const timerEl = document.getElementById('countdown-timer');
        const boxEl = timerEl.parentElement;

        const update = () => {
            const remaining = Math.max(0, expiresAtMs - Date.now());
            if (remaining <= 0) {
                timerEl.textContent = '00:00';
                boxEl.classList.add('expired');
                clearInterval(countdownTimer);
                // 서명 캔버스 비활성화
                const submitBtn = document.getElementById('submit-btn');
                if (submitBtn) submitBtn.disabled = true;
                return;
            }
            const totalSec = Math.floor(remaining / 1000);
            const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
            const ss = String(totalSec % 60).padStart(2, '0');
            timerEl.textContent = `${mm}:${ss}`;
        };

        update();
        countdownTimer = setInterval(update, 1000);
    }

    async function safeJson(response) {
        try {
            return await response.json();
        } catch {
            return null;
        }
    }
})();
