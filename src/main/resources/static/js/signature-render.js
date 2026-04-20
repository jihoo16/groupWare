/**
 * 전자서명 렌더 공통 모듈
 *
 * 모든 문서 상세/작성 페이지에서 사용.
 * signature-modal.js 와 함께 로드되어야 함.
 *
 * 사용 예:
 *   SignatureRender.load(documentIdx);
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

    async function load(documentIdx) {
        try {
            const resp = await fetch(`/api/signature/document/${documentIdx}`);
            if (!resp.ok) return;
            const signatures = await resp.json();
            render(documentIdx, signatures);
        } catch (e) {
            console.error('[SignatureRender] 조회 오류', e);
        }
    }

    function render(documentIdx, signatures) {
        const bySlot = new Map();
        signatures.forEach(s => {
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
            document.querySelectorAll(`[data-slot="${slot}"]`).forEach(cell => {
                applyToCell(cell, sig, documentIdx);
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

    function applyToCell(cell, sig, documentIdx) {
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

        if (sig.signatureImageDataUrl) {
            signArea.innerHTML = `<img class="sign-image" src="${sig.signatureImageDataUrl}" alt="서명">`;
            cell.classList.add('signed');
            return;
        }

        if (sig.canSign && !cell.classList.contains('signature-offline')) {
            cell.classList.add('can-sign');
            signArea.innerHTML = '<span class="sign-placeholder"></span>';
            if (cell.dataset.sigBound === '1') return;
            cell.dataset.sigBound = '1';
            cell.addEventListener('click', () => {
                if (cell.classList.contains('signed') || !cell.classList.contains('can-sign')) return;
                if (!window.SignatureModal) return;
                SignatureModal.open({
                    documentIdx: documentIdx,
                    signatureSlot: cell.getAttribute('data-slot'),
                    onComplete: () => load(documentIdx)
                });
            });
        } else if (!cell.classList.contains('signature-offline')) {
            cell.classList.add('waiting');
            signArea.innerHTML = '<span class="sign-placeholder"></span>';
        }
    }

    /**
     * 저장 성공 후 서명 플로우 (전 문서 공통)
     * @param {Object} opts
     * @param {number} opts.documentIdx - 저장된 문서 IDX
     * @param {string} [opts.signatureSlot='C1602'] - 본인 서명 슬롯
     * @param {string} opts.redirectUrl - 서명 완료/취소 후 이동할 URL
     * @param {string} [opts.successMessage] - 저장 성공 메시지
     */
    function afterSave(opts) {
        const docIdx = opts.documentIdx;
        const slot = opts.signatureSlot || 'C1602';
        const redirectUrl = opts.redirectUrl || '/approval';
        const msg = opts.successMessage || '문서가 저장되었습니다.';

        if (!docIdx || !window.SignatureModal) {
            if (window.Swal) {
                Swal.fire({ icon: 'success', title: '저장 완료', text: msg, timer: 2000, showConfirmButton: true });
            }
            setTimeout(() => { window.location.href = redirectUrl; }, 2000);
            return;
        }

        if (window.Swal) Swal.close();

        SignatureModal.open({
            documentIdx: docIdx,
            signatureSlot: slot,
            onComplete: () => {},
            onClose: (ev) => {
                if (ev.completed) {
                    window.location.href = redirectUrl;
                } else {
                    if (window.Swal) {
                        Swal.fire({
                            icon: 'info',
                            title: '저장 완료',
                            html: msg + '<br>상세 페이지에서 서명을 진행할 수 있습니다.',
                            confirmButtonText: '확인'
                        }).then(() => { window.location.href = redirectUrl; });
                    } else {
                        window.location.href = redirectUrl;
                    }
                }
            }
        });
    }

    window.SignatureRender = { load: load, afterSave: afterSave };
})();
