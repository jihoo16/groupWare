/**
 * 전자서명 QR 모달 — 전역 API
 *
 * 사용 예 (문서별 JS에서):
 *   SignatureModal.open({
 *       documentIdx: 500,
 *       signatureSlot: 'C1602',   // HTML의 data-slot 값
 *       onComplete: (event) => {
 *           // event.signatureImageDataUrl 을 해당 data-slot 셀에 주입
 *           // event.signedDocumentSignatureIdxList 는 연동 서명된 document_signatures.idx 목록
 *       }
 *   });
 *
 * 이벤트 흐름:
 *   1. POST /api/signature/session → QR 이미지 + 토큰 수신
 *   2. WebSocket /topic/signature/session/{token} 구독
 *   3. SCANNED / VERIFIED / VERIFY_FAILED / COMPLETED / EXPIRED / CANCELLED 수신 시 UI 갱신
 *   4. COMPLETED 시 onComplete 콜백 호출 + 자동 닫힘
 *
 * 네이밍:
 *   - 전역 객체: window.SignatureModal
 *   - DOM ID: sig-modal-*
 *   - CSS class: sig-*
 */
(function() {
    'use strict';

    // ============================================================
    // 내부 상태
    // ============================================================
    const state = {
        sessionToken: null,
        documentIdx: null,
        signatureSlot: null,
        externalPersonIdx: null,   // 외부 세션일 때만 set
        mode: 'internal',           // 'internal' | 'external'
        expiresAtMs: 0,
        countdownTimer: null,
        stompClient: null,
        sockJs: null,
        onCompleteCallback: null,
        onCloseCallback: null,
        completed: false,
        isOpen: false
    };

    // ============================================================
    // 공개 API
    // ============================================================
    const SignatureModal = {
        /**
         * 모달 열기 + QR 생성
         * @param {Object} options
         * @param {number} options.documentIdx - 문서 IDX
         * @param {string} options.signatureSlot - 서명 위치 코드 (C16, HTML data-slot 값)
         * @param {Function} [options.onComplete] - 서명 완료 시 호출 (event 객체 전달)
         * @param {Function} [options.onClose] - 모달 닫힐 때 호출 (완료 여부와 무관)
         */
        open(options) {
            if (state.isOpen) {
                console.warn('[SignatureModal] 이미 열려있습니다');
                return;
            }
            if (!options || !options.documentIdx || !options.signatureSlot) {
                console.error('[SignatureModal] documentIdx, signatureSlot 필수');
                return;
            }

            state.mode = 'internal';
            state.documentIdx = options.documentIdx;
            state.signatureSlot = options.signatureSlot;
            state.externalPersonIdx = null;
            state.onCompleteCallback = options.onComplete || null;
            state.onCloseCallback = options.onClose || null;
            state.completed = false;
            state.isOpen = true;

            _showModal();
            _setState('loading');

            _createSession()
                .then((data) => _onSessionCreated(data))
                .catch((err) => {
                    console.error('[서명] 세션 생성 실패', err);
                    const msg = err.message || '';
                    const isGuide = msg.includes('서명칸') || msg.includes('차례')
                        || msg.includes('완료된') || msg.includes('연동')
                        || msg.includes('대상자') || msg.includes('서명 순서');
                    if (isGuide) {
                        _showErrorState('서명 안내', msg);
                    } else {
                        _showErrorState(
                            '서명 QR을 만들지 못했습니다',
                            '서버와 잠시 연결되지 않아 QR 코드를 만들지 못했습니다.<br>' +
                            '창을 닫고 <b>다시 서명 버튼</b>을 눌러 주세요.<br>' +
                            '같은 문제가 계속되면 관리자에게 문의해 주세요.'
                        );
                    }
                });
        },

        /**
         * 외부인 서명용 모달 열기 (연구비증빙 외부 참석자 셀 클릭 시)
         * @param {Object} options
         * @param {number} options.documentIdx - 문서 IDX
         * @param {number} options.externalPersonIdx - external_person.idx
         * @param {Function} [options.onComplete]
         * @param {Function} [options.onClose]
         */
        openExternal(options) {
            if (state.isOpen) {
                console.warn('[SignatureModal] 이미 열려있습니다');
                return;
            }
            if (!options || !options.documentIdx || !options.externalPersonIdx) {
                console.error('[SignatureModal] documentIdx, externalPersonIdx 필수');
                return;
            }

            state.mode = 'external';
            state.documentIdx = options.documentIdx;
            state.externalPersonIdx = options.externalPersonIdx;
            state.signatureSlot = 'C1601'; // 외부는 항상 참석자 슬롯
            state.onCompleteCallback = options.onComplete || null;
            state.onCloseCallback = options.onClose || null;
            state.completed = false;
            state.isOpen = true;

            _showModal();
            _setState('loading');

            _createExternalSession()
                .then((data) => _onSessionCreated(data))
                .catch((err) => {
                    console.error('[서명] 외부 세션 생성 실패', err);
                    _showErrorState(
                        '서명 QR을 만들지 못했습니다',
                        '서버와 잠시 연결되지 않아 QR 코드를 만들지 못했습니다.<br>' +
                        '창을 닫고 <b>다시 서명 버튼</b>을 눌러 주세요.<br>' +
                        '같은 문제가 계속되면 관리자에게 문의해 주세요.'
                    );
                });
        },

        /**
         * 모달 닫기 + 리소스 정리
         */
        close() {
            _closeModal();
        }
    };

    // ============================================================
    // 세션 생성 + 초기 렌더
    // ============================================================
    async function _createSession() {
        const response = await fetch('/api/signature/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documentIdx: state.documentIdx,
                signatureSlot: state.signatureSlot
            })
        });
        if (!response.ok) {
            const err = await _safeJson(response);
            throw new Error(err?.message || 'SIGNATURE_SESSION_FAILED');
        }
        return response.json();
    }

    async function _createExternalSession() {
        const response = await fetch('/api/signature/external/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documentIdx: state.documentIdx,
                externalPersonIdx: state.externalPersonIdx
            })
        });
        if (!response.ok) {
            const err = await _safeJson(response);
            throw new Error(err?.message || 'SIGNATURE_SESSION_FAILED');
        }
        return response.json();
    }

    function _onSessionCreated(data) {
        state.sessionToken = data.sessionToken;
        state.expiresAtMs = data.expiresAt ? new Date(data.expiresAt).getTime() : 0;

        // 정보 바인딩
        _setText('sig-modal-doc-title',
                 (data.documentNo ? `${data.documentNo} · ` : '') + (data.documentTitle || '-'));
        _setText('sig-modal-slot-label', data.signatureSlotLabel || data.signatureSlot || '-');
        _setText('sig-modal-signer-name', data.signerNameMasked || data.signerNameFull || '-');

        const qrImg = document.getElementById('sig-modal-qr-image');
        if (qrImg) qrImg.src = data.qrDataUrl || '';

        _setState('qr');
        _startCountdown();
        _connectWebSocket(state.sessionToken);
    }

    // ============================================================
    // WebSocket 구독
    // ============================================================
    function _connectWebSocket(token) {
        if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') {
            console.error('[SignatureModal] SockJS/Stomp 미로드 — 폴링 폴백 필요');
            return;
        }

        state.sockJs = new SockJS('/ws/signature');
        state.stompClient = Stomp.over(state.sockJs);
        state.stompClient.debug = null; // 콘솔 스팸 방지

        state.stompClient.connect({}, () => {
            state.stompClient.subscribe('/topic/signature/session/' + token, (message) => {
                let body;
                try {
                    body = JSON.parse(message.body);
                } catch (e) {
                    console.error('[SignatureModal] 메시지 파싱 실패', e);
                    return;
                }
                _handleSessionEvent(body);
            });
        }, (err) => {
            console.warn('[SignatureModal] WebSocket 연결 실패, 폴링 폴백 활성화', err);
            _startPollingFallback();
        });
    }

    function _handleSessionEvent(event) {
        switch (event.eventType) {
            case 'SCANNED':
                _markProgress('scanned');
                break;

            case 'VERIFIED':
                _markProgress('verified');
                break;

            case 'VERIFY_FAILED':
                // 진행 단계 유지, 토스트만 표시해도 됨 (현재는 UI 변경 없음)
                break;

            case 'COMPLETED':
                _markProgress('completed');
                _handleCompleted(event);
                break;

            case 'EXPIRED':
                _showExpiredOverlay();
                break;

            case 'CANCELLED':
                _closeModal();
                break;
        }
    }

    // ============================================================
    // 폴링 폴백 (WebSocket 실패 시)
    // ============================================================
    let pollingIntervalId = null;
    function _startPollingFallback() {
        if (pollingIntervalId) return;
        pollingIntervalId = setInterval(async () => {
            if (!state.sessionToken || !state.isOpen) {
                _stopPolling();
                return;
            }
            try {
                const resp = await fetch(`/api/signature/session/${state.sessionToken}/status`);
                if (!resp.ok) return;
                const data = await resp.json();
                // 상태 변화 감지
                if (data.status === 'C1302') _markProgress('scanned');
                if (data.status === 'C1303') _markProgress('verified');
                if (data.status === 'C1304') {
                    _markProgress('completed');
                    // 완료 시 상세 이미지는 document API에서 재조회 필요하므로 onComplete는 간략화
                    _handleCompleted({
                        eventType: 'COMPLETED',
                        sessionToken: state.sessionToken,
                        documentIdx: state.documentIdx,
                        signatureSlot: state.signatureSlot,
                        signatureImageDataUrl: null // 폴링은 이미지 안 줌 → 호출자가 재조회
                    });
                }
                if (data.status === 'C1305') _showExpiredOverlay();
                if (data.status === 'C1306') _closeModal();
            } catch (e) {
                console.warn('[SignatureModal] 폴링 실패', e);
            }
        }, 2000);
    }
    function _stopPolling() {
        if (pollingIntervalId) {
            clearInterval(pollingIntervalId);
            pollingIntervalId = null;
        }
    }

    // ============================================================
    // 완료 처리
    // ============================================================
    function _handleCompleted(event) {
        state.completed = true;
        try {
            if (typeof state.onCompleteCallback === 'function') {
                state.onCompleteCallback(event);
            }
        } catch (e) {
            console.error('[SignatureModal] onComplete 콜백 에러', e);
        }

        _setState('done');
        // 2초 후 자동 닫힘
        setTimeout(() => _closeModal(), 2000);
    }

    // ============================================================
    // 카운트다운
    // ============================================================
    function _startCountdown() {
        _stopCountdown();
        const timerEl = document.getElementById('sig-modal-countdown');
        const boxEl = timerEl ? timerEl.parentElement : null;
        if (!timerEl || !state.expiresAtMs) return;

        const update = () => {
            const remaining = Math.max(0, state.expiresAtMs - Date.now());
            if (remaining <= 0) {
                timerEl.textContent = '00:00';
                if (boxEl) boxEl.classList.add('expired');
                _showExpiredOverlay();
                _stopCountdown();
                return;
            }
            const totalSec = Math.floor(remaining / 1000);
            const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
            const ss = String(totalSec % 60).padStart(2, '0');
            timerEl.textContent = `${mm}:${ss}`;
        };
        update();
        state.countdownTimer = setInterval(update, 1000);
    }
    function _stopCountdown() {
        if (state.countdownTimer) {
            clearInterval(state.countdownTimer);
            state.countdownTimer = null;
        }
    }

    // ============================================================
    // UI 상태 전환
    // ============================================================
    function _setState(key) {
        const map = { loading: '.sig-loading', qr: '.sig-qr', done: '.sig-done', error: '.sig-error' };
        const modal = document.getElementById('signatureModal');
        if (!modal) return;
        Object.values(map).forEach(sel => {
            const el = modal.querySelector(sel);
            if (el) el.style.display = 'none';
        });
        const target = modal.querySelector(map[key]);
        if (target) target.style.display = 'block';
    }

    function _markProgress(step) {
        const progress = document.getElementById('sig-modal-progress');
        if (!progress) return;
        const order = ['qr', 'scanned', 'verified', 'completed'];
        const currentIdx = order.indexOf(step);
        order.forEach((s, idx) => {
            const el = progress.querySelector(`.sig-progress-step[data-step="${s}"]`);
            if (!el) return;
            el.classList.remove('active', 'done');
            if (idx < currentIdx) el.classList.add('done');
            else if (idx === currentIdx) el.classList.add('active');
        });
    }

    function _showExpiredOverlay() {
        const wrap = document.querySelector('#signatureModal .sig-qr-wrap');
        const overlay = document.getElementById('sig-modal-qr-overlay');
        if (wrap) wrap.classList.add('expired');
        if (overlay) overlay.style.display = 'flex';
    }

    function _showErrorState(title, message) {
        _setText('sig-modal-error-title', title);
        const msgEl = document.getElementById('sig-modal-error-message');
        if (msgEl) msgEl.innerHTML = (message || '').replace(/\n/g, '<br>');
        // 안내 메시지인 경우 하단 힌트를 다르게 표시
        const hintEl = document.getElementById('sig-modal-error-hint');
        if (hintEl) {
            const isGuide = title === '서명 안내';
            hintEl.textContent = isGuide
                ? '확인 후 모달을 닫아주세요.'
                : '모달을 닫고 상세 페이지에서 다시 시도할 수 있습니다.';
        }
        _setState('error');
    }

    // ============================================================
    // 모달 open/close (내부)
    // ============================================================
    function _showModal() {
        const modal = document.getElementById('signatureModal');
        if (!modal) {
            console.error('[SignatureModal] #signatureModal 엘리먼트가 없습니다. 프래그먼트 include를 확인하세요.');
            return;
        }
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function _closeModal() {
        if (!state.isOpen) return;
        state.isOpen = false;

        const modal = document.getElementById('signatureModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
        document.body.style.overflow = '';

        _stopCountdown();
        _stopPolling();

        // WebSocket 정리
        if (state.stompClient && state.stompClient.connected) {
            try { state.stompClient.disconnect(); } catch (e) { /* ignore */ }
        }
        state.stompClient = null;
        state.sockJs = null;

        // 세션 취소 (토큰 있으면 서버에 알림)
        if (state.sessionToken) {
            fetch(`/api/signature/session/${state.sessionToken}`, { method: 'DELETE' })
                .catch(() => { /* 무시 */ });
        }

        // onClose 콜백 호출 (서명 완료 여부와 무관)
        const onClose = state.onCloseCallback;
        const wasCompleted = state.completed;

        // 상태 초기화
        state.sessionToken = null;
        state.documentIdx = null;
        state.signatureSlot = null;
        state.expiresAtMs = 0;
        state.onCompleteCallback = null;
        state.onCloseCallback = null;
        state.completed = false;

        // onClose 콜백 — 상태 초기화 후 호출
        if (typeof onClose === 'function') {
            try { onClose({ completed: wasCompleted }); }
            catch (e) { console.error('[SignatureModal] onClose 콜백 에러', e); }
        }

        // UI 초기화
        const qrImg = document.getElementById('sig-modal-qr-image');
        if (qrImg) qrImg.src = '';
        const overlay = document.getElementById('sig-modal-qr-overlay');
        if (overlay) overlay.style.display = 'none';
        const wrap = document.querySelector('#signatureModal .sig-qr-wrap');
        if (wrap) wrap.classList.remove('expired');
        const countBox = document.querySelector('#signatureModal .sig-countdown');
        if (countBox) countBox.classList.remove('expired');
    }

    // ============================================================
    // 이벤트 바인딩 (모달 닫기 버튼들, ESC)
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
        const modal = document.getElementById('signatureModal');
        if (!modal) return;

        modal.addEventListener('click', (e) => {
            const target = e.target.closest('[data-close="true"]');
            if (target) _closeModal();
        });

        // QR 재생성 버튼
        const regenBtn = document.getElementById('sig-modal-regenerate-btn');
        if (regenBtn) {
            regenBtn.addEventListener('click', () => {
                // 현재 옵션으로 재시도
                const docIdx = state.documentIdx;
                const slot = state.signatureSlot;
                const cb = state.onCompleteCallback;
                if (!docIdx || !slot) {
                    _closeModal();
                    return;
                }
                // 기존 세션 정리하고 다시 열기
                _closeModal();
                setTimeout(() => {
                    SignatureModal.open({
                        documentIdx: docIdx,
                        signatureSlot: slot,
                        onComplete: cb
                    });
                }, 100);
            });
        }

        // ESC 키로 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isOpen) _closeModal();
        });
    });

    // ============================================================
    // 헬퍼
    // ============================================================
    function _setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }
    async function _safeJson(response) {
        try { return await response.json(); }
        catch { return null; }
    }

    // 전역 공개
    window.SignatureModal = SignatureModal;
})();
