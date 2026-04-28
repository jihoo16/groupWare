/**
 * 연구비증빙 야근식대 상세보기 JavaScript
 */
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    // documentIdx = approval_documents.idx, id = receipt_overtimes.idx
    const documentIdx = urlParams.get('documentIdx');
    const receiptId = urlParams.get('id');

    if (!documentIdx && !receiptId) {
        history.back();
        return;
    }

    window.showPageLoadingOverlay();

    if (documentIdx) {
        // by-document 엔드포인트 사용 (존재함)
        loadByDocumentIdx(documentIdx);
    } else {
        loadByReceiptIdx(receiptId);
    }
});

async function loadByDocumentIdx(documentIdx) {
    try {
        const response = await fetch(`/api/receipt-overtimes/by-document/${documentIdx}`);
        if (!response.ok) throw new Error('야근식대 조회 실패');
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

async function loadByReceiptIdx(receiptIdx) {
    try {
        const response = await fetch(`/api/receipt-overtimes/${receiptIdx}`);
        if (!response.ok) throw new Error('야근식대 조회 실패');
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
            window.location.href = '/approval/receipt-overtime?documentIdx=' + (data.documentIdx || '');
        });
    }

    // 삭제 버튼
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.style.display = '';
        deleteBtn.addEventListener('click', async () => {
            const result = await Swal.fire({
                title: '문서를 삭제하시겠습니까?',
                html: '서명 내역을 포함한 모든 기록이 함께 삭제되며,<br><strong>되돌릴 수 없습니다.</strong>',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: '삭제',
                cancelButtonText: '취소',
                confirmButtonColor: '#d33'
            });
            if (!result.isConfirmed) return;

            try {
                const res = await fetch(`/api/receipt-overtimes/${data.idx}`, { method: 'DELETE' });
                if (res.ok || res.status === 204) {
                    await Swal.fire({
                        icon: 'success',
                        title: '문서가 삭제되었습니다',
                        text: '목록으로 이동합니다.',
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    window.location.href = '/project/documents';
                } else {
                    throw new Error();
                }
            } catch (e) {
                console.error('[삭제 실패] 야근 증빙', e);
                showDeleteFailure('야근 증빙');
            }
        });
    }
}

function renderDocument(data) {
    const projectName = data.projectName || '';
    const amount = data.totalAmount ? Number(data.totalAmount).toLocaleString() + '원' : '0원';
    const approvalDate = data.approvalDate || '';

    // 날짜 포맷
    let dateSlash = '';
    let dateFull = '';
    if (approvalDate) {
        const parts = approvalDate.split('-');
        if (parts.length === 3) {
            dateSlash = parts[1] + '/' + parts[2];
            dateFull = parts[0] + '년 ' + parseInt(parts[1]) + '월 ' + parseInt(parts[2]) + '일';
        }
    }

    // 품의서 섹션
    setText('doc_project', projectName);
    setText('doc_approval_date', approvalDate);
    setText('doc_applicant', data.authorUserName || '');
    setText('doc_title', data.documentTitle || '야근 식대');
    setText('doc_content', data.documentContent || '');
    setText('doc_date_slash', dateSlash);
    setText('doc_desc', '야근 식대');
    setText('doc_amount', amount);
    setText('doc_amount_total', amount);
    setText('doc_payment_card', 'V');
    setText('doc_payment_transfer', '');

    // 야근 및 특근 신청서
    setText('doc_project2', projectName);
    setText('doc_date', approvalDate);
    setText('doc_actual_amount', amount);
    setText('doc_date_full', dateFull);

    // 프로젝트 매니저 정보 가져오기
    loadProjectManager(data.projectIdx);

    // 야근 인원 테이블
    renderOvertimePersons(data.attendees || []);
}

async function loadProjectManager(projectIdx) {
    if (!projectIdx) return;
    try {
        const res = await fetch(`/api/projects/${projectIdx}`);
        if (res.ok) {
            const proj = await res.json();
            const managerName = proj.projectManagerName || '';
            setText('doc_manager', managerName);
            setText('doc_manager2', managerName);
            setText('doc_manager3', managerName);
        }
    } catch (e) {
        console.warn('프로젝트 매니저 조회 실패:', e);
    }
}

function renderOvertimePersons(attendees) {
    const tbody = document.getElementById('otPersonTableBody');
    if (!tbody) return;

    let html = '';
    attendees.forEach((a, index) => {
        const sigAttr = a.userIdx
            ? ` data-slot="C1601"${a.isExternal ? ' data-external="true"' : ''} data-signer-idx="${a.userIdx}"`
            : '';
        const sigInner = a.userIdx
            ? '<div class="sign-area"><span class="sign-placeholder"></span></div>'
            : '';
        // attendee-row 클래스 — signature-cell.css 의 행높이 보존 룰 (max-height:40px) 매칭
        html += `<tr class="attendee-row">
            <td style="text-align:center;">${index + 1}</td>
            <td style="text-align:center;">${a.userName || ''}</td>
            <td style="text-align:center;">${a.workTime || ''}</td>
            <td style="text-align:center;">${a.workTask || ''}</td>
            <td style="text-align:center;"${sigAttr}>${sigInner}</td>
            <td style="text-align:center;"></td>
        </tr>`;
    });

    // 최소 5행 보장
    const remaining = Math.max(0, 5 - attendees.length);
    for (let i = 0; i < remaining; i++) {
        html += `<tr class="attendee-row">
            <td style="text-align:center;">${attendees.length + i + 1}</td>
            <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
        </tr>`;
    }

    tbody.innerHTML = html;
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
}
