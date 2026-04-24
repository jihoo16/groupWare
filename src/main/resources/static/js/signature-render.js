/**
 * 전자서명 렌더 공통 모듈
 *
 * 모든 문서 상세/작성 페이지에서 사용.
 * signature-modal.js 와 함께 로드되어야 함.
 *
 * 사용 예:
 *   SignatureRender.load(documentIdx);
 *
 * 기능:
 *   1. 서명 현황 조회 + 모든 [data-slot] 셀에 렌더링 (완료 이미지 / can-sign / waiting)
 *   2. /topic/signature/{documentIdx} 구독 → 다른 사용자가 서명해도 실시간 반영
 *   3. 맞춤 토스트: 내 차례 도래 vs 외부 서명 완료 구분
 */
(function () {
    'use strict';

    const SLOT_ROLE_MAP = {
        C1601: '참석자',
        C1602: '담당',
        C1603: '연구책임자',
        C1604: '부서장',
        C1605: '대표이사'
    };

    // 실시간 구독 상태 — 같은 페이지 내에서 중복 구독 방지
    const state = {
        currentDocumentIdx: null,
        lastSignatures: [],
        subscribedDocumentIdx: null,
        stompClient: null,
        sockJs: null
    };

    async function load(documentIdx) {
        try {
            // no-store: 서명 완료 직후 브라우저가 이전 응답을 재사용해
            // DOM에 새 서명이 즉시 반영되지 않는 문제 방지
            const resp = await fetch(`/api/signature/document/${documentIdx}`, { cache: 'no-store' });
            if (!resp.ok) return null;
            const signatures = await resp.json();
            state.currentDocumentIdx = documentIdx;
            render(documentIdx, signatures);
            state.lastSignatures = signatures;
            // 첫 호출 시 한 번만 WebSocket 구독 시도 (다른 사용자 서명 실시간 반영)
            subscribeDocumentEvents(documentIdx);
            return signatures;
        } catch (e) {
            console.error('[SignatureRender] 조회 오류', e);
            return null;
        }
    }

    function render(documentIdx, signatures) {
        // idx → sig 맵 (연동 행이 main을 참조할 때 사용)
        const byIdx = new Map();
        signatures.forEach(s => byIdx.set(s.idx, s));

        // 같은 서명자가 복수 슬롯을 가질 때 "실질 메인" 결정:
        //   - sig 자체가 canSign=true면 그 자신이 main
        //   - sig가 linked면 linked_signature_idx로 main을 찾아 그 main의 canSign을 사용
        //   → 사용자가 linked 셀(예: 참석자 행)을 클릭해도 main 슬롯으로 모달 열 수 있게 함
        function effectiveMainFor(sig) {
            if (!sig) return null;
            if (!sig.linkedSignatureIdx) return sig;
            const main = byIdx.get(sig.linkedSignatureIdx);
            return main || sig;
        }

        // 1. 참석자(C1601) — signer별로 매칭
        //    외부/내부 cell은 data-external 속성으로 구분 (external_person.idx ↔ users.idx 충돌 방지)
        const attendeeSigs = signatures.filter(s => s.signatureSlot === 'C1601');
        attendeeSigs.forEach(sig => {
            const selector = sig.isExternal
                ? `[data-slot="C1601"][data-external="true"][data-signer-idx="${sig.signerUserIdx}"]`
                : `[data-slot="C1601"]:not([data-external="true"])[data-signer-idx="${sig.signerUserIdx}"]`;
            const cells = document.querySelectorAll(selector);
            const main = effectiveMainFor(sig);
            cells.forEach(cell => applyToCell(cell, sig, documentIdx, main));
        });

        // 2. 나머지 슬롯 — 슬롯당 대표 1개 (기존 로직)
        const bySlot = new Map();
        signatures.filter(s => s.signatureSlot !== 'C1601').forEach(s => {
            const prev = bySlot.get(s.signatureSlot);
            if (!prev) {
                bySlot.set(s.signatureSlot, s);
            } else if (s.signatureImageDataUrl && !prev.signatureImageDataUrl) {
                bySlot.set(s.signatureSlot, s);
            } else if (s.canSign && !prev.canSign && !prev.signatureImageDataUrl) {
                bySlot.set(s.signatureSlot, s);
            }
        });

        bySlot.forEach((sig, slot) => {
            const main = effectiveMainFor(sig);
            document.querySelectorAll(`[data-slot="${slot}"]`).forEach(cell => {
                applyToCell(cell, sig, documentIdx, main);
            });
        });

        // 결재라인 이름 바인딩
        signatures.forEach(s => {
            const role = SLOT_ROLE_MAP[s.signatureSlot];
            if (!role) return;
            document.querySelectorAll(`.approver-name[data-role="${role}"]`).forEach(el => {
                el.textContent = s.signerName || '-';
            });
        });
    }

    function applyToCell(cell, sig, documentIdx, mainSig) {
        // mainSig: linked 행인 경우 main 행을 가리킴. main/linked 구분 없는 경우 sig와 동일.
        //          이 셀을 클릭했을 때 실제 서명을 걸 슬롯/상태의 기준이 됨.
        const effective = mainSig || sig;

        // footer-signature (하단 서명 영역)
        if (cell.classList.contains('footer-signature')) {
            if (sig.signatureImageDataUrl) {
                const seal = cell.querySelector('.signature-seal');
                if (seal) seal.innerHTML = `<img class="sign-image" src="${sig.signatureImageDataUrl}" alt="서명" style="height:40px;">`;
            }
            return;
        }

        const signArea = cell.querySelector('.sign-area');
        if (!signArea) return;

        cell.classList.remove('signed', 'can-sign', 'waiting');

        // 이미지는 셀 자신의 sig 기준 (linked 행도 완료되면 이미지가 주입됨)
        if (sig.signatureImageDataUrl) {
            signArea.innerHTML = `<img class="sign-image" src="${sig.signatureImageDataUrl}" alt="서명">`;
            cell.classList.add('signed');
            return;
        }

        // 클릭 가능 여부는 effective(main) 기준 — linked 셀도 main이 canSign이면 클릭 가능
        // 단, 오프라인 셀은 제외
        if (effective.canSign && !cell.classList.contains('signature-offline')) {
            cell.classList.add('can-sign');
            signArea.innerHTML = '<span class="sign-placeholder"></span>';
            if (cell.dataset.sigBound === '1') return;
            cell.dataset.sigBound = '1';

            const isExternal = Boolean(effective.isExternal);

            cell.addEventListener('click', () => {
                if (cell.classList.contains('signed') || !cell.classList.contains('can-sign')) return;
                if (!window.SignatureModal) return;

                // 본인이 서명한 사실은 모달의 '완료' 화면에서 이미 확인됨.
                // 별도 토스트는 중복 소음이라 onClose 콜백 생략.
                const onCompleteCb = () => load(documentIdx);

                if (isExternal) {
                    SignatureModal.openExternal({
                        documentIdx: documentIdx,
                        externalPersonIdx: effective.signerUserIdx,
                        onComplete: onCompleteCb
                    });
                } else {
                    SignatureModal.open({
                        documentIdx: documentIdx,
                        signatureSlot: effective.signatureSlot,
                        onComplete: onCompleteCb
                    });
                }
            });
        } else if (!cell.classList.contains('signature-offline')) {
            cell.classList.add('waiting');
            signArea.innerHTML = '<span class="sign-placeholder"></span>';
        }
    }

    // ============================================================
    // 실시간 외부 서명 반영 (/topic/signature/{documentIdx} 구독)
    // ============================================================
    function subscribeDocumentEvents(documentIdx) {
        if (state.subscribedDocumentIdx === documentIdx) return; // 중복 구독 방지
        if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') {
            // 라이브러리 미로드 (signature-modal fragment 미포함 페이지). 실시간 미지원이지만 에러는 안 남.
            return;
        }

        // 다른 문서에서 이어온 연결이 있으면 정리
        disconnectStomp();

        try {
            state.sockJs = new SockJS('/ws/signature');
            state.stompClient = Stomp.over(state.sockJs);
            state.stompClient.debug = null;

            state.stompClient.connect({}, () => {
                state.stompClient.subscribe('/topic/signature/' + documentIdx, (message) => {
                    let body;
                    try { body = JSON.parse(message.body); } catch (e) { return; }
                    handleDocumentEvent(body);
                });
                state.subscribedDocumentIdx = documentIdx;
            }, (err) => {
                console.warn('[SignatureRender] WebSocket 연결 실패 — 실시간 반영 비활성', err);
                state.subscribedDocumentIdx = null;
            });
        } catch (e) {
            console.warn('[SignatureRender] WebSocket 초기화 오류', e);
        }
    }

    function disconnectStomp() {
        if (state.stompClient && state.stompClient.connected) {
            try { state.stompClient.disconnect(); } catch (e) { /* ignore */ }
        }
        state.stompClient = null;
        state.sockJs = null;
        state.subscribedDocumentIdx = null;
    }

    async function handleDocumentEvent(event) {
        if (event.eventType !== 'COMPLETED') return;
        if (!state.currentDocumentIdx) return;

        // 본인이 QR 모달 열고 있는 상태면 signature-modal이 처리
        const modalEl = document.getElementById('signatureModal');
        const modalActive = modalEl && modalEl.classList.contains('active');

        // 이전 상태에서 "내 차례"였던 슬롯 snapshot (UI 리로드 전에 계산)
        const myIdx = window.CURRENT_USER && window.CURRENT_USER.idx;
        const myTurnsBefore = new Set(
            (state.lastSignatures || [])
                .filter(s => s.canSign && myIdx && s.signerUserIdx === myIdx)
                .map(s => s.signatureSlot)
        );

        // 최신 상태 리로드 — 모달이 열려있어도 DOM은 갱신해야 서명 이미지 반영
        const signatures = await load(state.currentDocumentIdx);
        if (!signatures) return;

        // 본인이 모달 안에서 방금 서명한 경우는 signature-modal 완료 화면이 피드백을 줌 — 토스트 생략
        if (modalActive) return;

        // 새로 내 차례가 된 슬롯이 있는지 확인
        const myTurnsAfter = new Set(
            signatures
                .filter(s => s.canSign && myIdx && s.signerUserIdx === myIdx)
                .map(s => s.signatureSlot)
        );
        const newMyTurn = [...myTurnsAfter].find(slot => !myTurnsBefore.has(slot));
        if (newMyTurn) {
            showToast({
                icon: 'info',
                title: '서명 차례가 되었습니다',
                text: '상단 결재란을 클릭해 서명해 주세요.',
                timer: 4500
            });
            return;
        }

        // 이번 이벤트로 새로 완료된 서명이 외부인(모바일 참석자) 것인지 확인.
        //   내부 사용자 서명은 본인/타인 모두 토스트 생략 — 결재란 이미지로 이미 확인 가능하고,
        //   운영자 PC에서 실시간 알림이 유의미한 경우는 외부인이 원격으로 서명한 경우가 유일.
        const idxSet = new Set(event.signedDocumentSignatureIdxList || []);
        const externalDone = signatures.some(s => idxSet.has(s.idx) && s.isExternal);
        if (!externalDone) return;

        const name = event.signerName || '';
        showToast({
            icon: 'success',
            title: name ? `${name} 외부 참석자 서명이 완료되었습니다` : '외부 참석자 서명이 완료되었습니다',
            timer: 2500
        });
    }

    function showToast({ icon, title, text, timer }) {
        if (!window.Swal) return;
        Swal.fire({
            icon,
            title,
            text: text || undefined,
            toast: true,
            position: 'top-end',
            timer: timer || 2500,
            showConfirmButton: false,
            timerProgressBar: true
        });
    }

    // 페이지 이탈 시 WebSocket 정리 (메모리 누수 방지)
    window.addEventListener('beforeunload', disconnectStomp);

    /**
     * 저장 성공 후 서명 플로우 (전 문서 공통)
     * @param {Object} opts
     * @param {number} opts.documentIdx - 저장된 문서 IDX
     * @param {string} [opts.signatureSlot='C1602'] - 본인 서명 슬롯
     * @param {string} opts.redirectUrl - 서명 완료/취소 후 이동할 URL
     * @param {string} [opts.successMessage] - 저장 성공 메시지
     */
    async function afterSave(opts) {
        const docIdx = opts.documentIdx;
        const redirectUrl = opts.redirectUrl || '/approval';
        const msg = opts.successMessage || '문서가 저장되었습니다.';

        if (!docIdx || !window.SignatureModal) {
            showSaveSuccess(msg, redirectUrl);
            return;
        }

        // 서명 현황 조회 → 본인이 서명 가능한 슬롯이 있는지 확인
        try {
            const resp = await fetch(`/api/signature/document/${docIdx}`);
            if (!resp.ok) {
                showSaveSuccess(msg, redirectUrl);
                return;
            }
            const signatures = await resp.json();
            const mySlot = signatures.find(s => s.canSign && !s.linkedSignatureIdx);

            if (!mySlot) {
                // 본인이 서명 가능한 슬롯이 없는 이유 분석
                const myLinked = signatures.find(s =>
                    s.signerUserIdx && s.linkedSignatureIdx
                    && window.CURRENT_USER && s.signerUserIdx === window.CURRENT_USER.idx);
                const myWaiting = signatures.find(s =>
                    s.signerUserIdx && !s.linkedSignatureIdx && !s.canSign && s.requestedAt === null
                    && window.CURRENT_USER && s.signerUserIdx === window.CURRENT_USER.idx);

                let guide = '';
                if (myLinked) {
                    guide = '\n본인 서명칸은 다른 결재란과 연동되어 있어,\n해당 단계에서 자동으로 서명됩니다.';
                } else if (myWaiting) {
                    guide = '\n이전 단계 서명이 완료되면 본인 서명 차례가 됩니다.';
                } else {
                    guide = '\n서명 대상자에게 서명 요청이 전달되었습니다.';
                }
                showSaveSuccess(msg + guide, redirectUrl);
                return;
            }

            // 본인 서명 가능 → QR 모달 오픈
            if (window.Swal) Swal.close();
            SignatureModal.open({
                documentIdx: docIdx,
                signatureSlot: mySlot.signatureSlot,
                onComplete: () => {},
                onClose: (ev) => {
                    if (ev.completed) {
                        window.location.href = redirectUrl;
                    } else {
                        showSaveSuccess(msg + '\n상세 페이지에서 서명을 진행할 수 있습니다.', redirectUrl);
                    }
                }
            });
        } catch (e) {
            console.error('[SignatureRender] afterSave 오류', e);
            showSaveSuccess(msg, redirectUrl);
        }
    }

    function showSaveSuccess(msg, redirectUrl) {
        if (window.Swal) {
            Swal.fire({
                icon: 'success',
                title: '저장 완료',
                html: (msg || '').replace(/\n/g, '<br>'),
                confirmButtonText: '확인'
            }).then(() => { window.location.href = redirectUrl; });
        } else {
            setTimeout(() => { window.location.href = redirectUrl; }, 2000);
        }
    }

    window.SignatureRender = { load: load, afterSave: afterSave };
})();
