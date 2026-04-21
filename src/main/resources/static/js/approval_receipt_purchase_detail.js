/**
 * 연구비증빙 구매품의(재료비/장비비) 상세보기 JavaScript
 */
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    // documentIdx = approval_documents.idx, id = receipt_purchases.idx
    const documentIdx = urlParams.get('documentIdx');
    const receiptId = urlParams.get('id');

    if (!documentIdx && !receiptId) {
        history.back();
        return;
    }

    window.showPageLoadingOverlay();

    if (receiptId) {
        loadByReceiptIdx(receiptId);
    } else {
        loadByDocumentIdx(documentIdx);
    }
});

async function loadByReceiptIdx(receiptIdx) {
    try {
        const response = await fetch(`/api/receipt-purchases/${receiptIdx}`);
        if (!response.ok) throw new Error('구매품의 조회 실패');
        const data = await response.json();

        renderDocument(data);

        // 서명 현황 로드 (approval_documents.idx 기준)
        if (window.SignatureRender && data.documentIdx) {
            SignatureRender.load(data.documentIdx);
        }

        setupButtons(data);
        window.hidePageLoadingOverlay();
    } catch (e) {
        console.error(e);
        window.hidePageLoadingOverlay();
        Swal.fire({ icon: 'error', title: '오류', text: '문서를 불러오는데 실패했습니다.' })
            .then(() => history.back());
    }
}

async function loadByDocumentIdx(documentIdx) {
    try {
        // 전체 목록에서 documentIdx가 일치하는 건을 찾기
        const listRes = await fetch('/api/receipt-purchases');
        if (!listRes.ok) throw new Error('구매품의 목록 조회 실패');
        const list = await listRes.json();

        const found = list.find(item => String(item.documentIdx) === String(documentIdx));
        if (!found) throw new Error('해당 문서를 찾을 수 없습니다.');

        const response = await fetch(`/api/receipt-purchases/${found.idx}`);
        if (!response.ok) throw new Error('구매품의 조회 실패');
        const data = await response.json();

        renderDocument(data);

        // 서명 현황 로드
        if (window.SignatureRender) SignatureRender.load(documentIdx);

        setupButtons(data);
        window.hidePageLoadingOverlay();
    } catch (e) {
        console.error(e);
        window.hidePageLoadingOverlay();
        Swal.fire({ icon: 'error', title: '오류', text: '문서를 불러오는데 실패했습니다.' })
            .then(() => history.back());
    }
}

async function setupButtons(data) {
    // 인쇄 버튼 — 서명 완료 시에만 활성
    const printBtn = document.getElementById('printBtn');
    if (printBtn && data.documentIdx) {
        printBtn.style.display = '';
        try {
            const sigRes = await fetch(`/api/signature/document/${data.documentIdx}/complete`);
            const sigData = sigRes.ok ? await sigRes.json() : { complete: false };
            if (sigData.complete) {
                printBtn.addEventListener('click', () => window.print());
            } else {
                printBtn.disabled = true;
                printBtn.style.opacity = '0.5';
                printBtn.style.cursor = 'not-allowed';
                printBtn.dataset.tip = '전자서명이 모두 완료된 후 인쇄할 수 있습니다.';
            }
        } catch (e) {
            printBtn.addEventListener('click', () => window.print());
        }
    }

    // 수정 버튼
    const editBtn = document.getElementById('editBtn');
    if (editBtn) {
        editBtn.style.display = '';
        editBtn.addEventListener('click', () => {
            window.location.href = '/approval/receipt-purchase?documentIdx=' + (data.documentIdx || data.idx);
        });
    }

    // 삭제 버튼
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.style.display = '';
        deleteBtn.addEventListener('click', async () => {
            const result = await Swal.fire({
                title: '문서를 삭제하시겠습니까?',
                html: '삭제된 문서는 <strong>복구할 수 없습니다.</strong>',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: '삭제',
                cancelButtonText: '취소',
                confirmButtonColor: '#d33'
            });
            if (!result.isConfirmed) return;

            try {
                const res = await fetch(`/api/receipt-purchases/${data.idx}`, { method: 'DELETE' });
                if (res.ok || res.status === 204) {
                    await Swal.fire({
                        icon: 'success',
                        title: '문서가 삭제되었습니다',
                        text: '목록으로 이동합니다.',
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    window.location.href = '/approval/receipt';
                } else {
                    throw new Error();
                }
            } catch (_) {
                Swal.fire({ icon: 'error', title: '삭제 실패', text: '잠시 후 다시 시도해 주세요.' });
            }
        });
    }

    // 제목 업데이트
    const typeLabel = data.purchaseType === 'equipment' ? '장비비' : '재료비';
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
        pageTitle.innerHTML = '<i class="fas fa-file-alt"></i> 연구비증빙 ' + typeLabel + ' 상세';
    }
}

function renderDocument(data) {
    const approvalDate = data.approvalDate || '';
    const paymentType = data.paymentType || 'card';

    // 기본 정보
    setText('doc_approval_date', approvalDate);
    setText('doc_applicant', data.authorUserName || '');
    setText('doc_title', data.documentTitle || '');
    setText('doc_content', data.documentContent || '');

    // 지급종류
    setText('doc_payment_card', paymentType === 'card' ? 'V' : '');
    setText('doc_payment_transfer', paymentType === 'transfer' ? 'V' : '');

    // 프로젝트 정보
    setText('doc_project', data.projectName || '');

    // 프로젝트 매니저 정보 가져오기
    loadProjectManager(data.projectIdx);

    // 품의 내역서
    renderItems(data.items || []);
}

async function loadProjectManager(projectIdx) {
    if (!projectIdx) return;
    try {
        const res = await fetch(`/api/projects/${projectIdx}`);
        if (res.ok) {
            const proj = await res.json();
            setText('doc_manager', proj.projectManagerName || '');
        }
    } catch (e) {
        console.warn('프로젝트 매니저 조회 실패:', e);
    }
}

function renderItems(items) {
    const tbody = document.getElementById('docItemTableBody');
    if (!tbody) return;

    let totalSupply = 0;
    let totalTax = 0;
    let totalPayment = 0;

    let html = '';
    if (items.length === 0) {
        html = '<tr><td colspan="7" style="text-align:center; padding:10px;">내역 정보 없음</td></tr>';
    } else {
        items.forEach(item => {
            const supply = item.supplyAmount ? Number(item.supplyAmount) : 0;
            const tax = item.taxAmount ? Number(item.taxAmount) : 0;
            const payment = item.paymentAmount ? Number(item.paymentAmount) : 0;

            totalSupply += supply;
            totalTax += tax;
            totalPayment += payment;

            // 날짜 포맷 (MM/DD)
            let dateDisplay = item.itemDate || '';
            if (dateDisplay) {
                const parts = dateDisplay.split('-');
                if (parts.length === 3) dateDisplay = parts[1] + '/' + parts[2];
            }

            html += `<tr>
                <td style="text-align:center;">${dateDisplay}</td>
                <td style="text-align:center;">${escapeHtml(item.itemDesc || '')}</td>
                <td style="text-align:center;">${item.quantity || ''}</td>
                <td style="text-align:right; padding-right:8px;">${supply.toLocaleString()}</td>
                <td style="text-align:right; padding-right:8px;">${tax.toLocaleString()}</td>
                <td style="text-align:right; padding-right:8px;">${payment.toLocaleString()}</td>
                <td style="text-align:center;">${escapeHtml(item.remark || '')}</td>
            </tr>`;
        });
    }

    tbody.innerHTML = html;

    // 합계
    setText('doc_total_supply', totalSupply.toLocaleString());
    setText('doc_total_tax', totalTax.toLocaleString());
    setText('doc_total_payment', totalPayment.toLocaleString());
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
}
