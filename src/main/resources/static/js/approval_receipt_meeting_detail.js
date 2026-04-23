/**
 * 연구비증빙 회의록 상세보기 JavaScript
 */
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    // documentIdx = approval_documents.idx, id = receipt_meetings.idx
    const documentIdx = urlParams.get('documentIdx');
    const receiptId = urlParams.get('id');

    if (!documentIdx && !receiptId) {
        history.back();
        return;
    }

    window.showPageLoadingOverlay();

    if (receiptId) {
        // receipt idx로 직접 조회
        loadByReceiptIdx(receiptId);
    } else {
        // documentIdx로 조회 - 전체 목록에서 찾기
        loadByDocumentIdx(documentIdx);
    }
});

async function loadByReceiptIdx(receiptIdx) {
    try {
        const response = await fetch(`/api/receipt-meetings/${receiptIdx}`);
        if (!response.ok) throw new Error('회의록 조회 실패');
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
        // 전체 회의록 목록을 조회하여 documentIdx가 일치하는 건을 찾기
        const listRes = await fetch('/api/receipt-meetings');
        if (!listRes.ok) throw new Error('회의록 목록 조회 실패');
        const list = await listRes.json();

        const found = list.find(item => String(item.documentIdx) === String(documentIdx));
        if (!found) throw new Error('해당 문서를 찾을 수 없습니다.');

        // 상세 조회
        const response = await fetch(`/api/receipt-meetings/${found.idx}`);
        if (!response.ok) throw new Error('회의록 조회 실패');
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
            window.location.href = '/approval/receipt-meeting?id=' + data.idx;
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
                const res = await fetch(`/api/receipt-meetings/${data.idx}`, { method: 'DELETE' });
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
                console.error('[삭제 실패] 회의 증빙', e);
                showDeleteFailure('회의 증빙');
            }
        });
    }
}

function renderDocument(data) {
    // 날짜/시간 포맷
    const meetingDate = data.meetingDate || '';
    const startTime = data.startTime ? String(data.startTime).substring(0, 5) : '';
    const endTime = data.endTime ? String(data.endTime).substring(0, 5) : '';
    const datetimeStr = meetingDate + '\n' + startTime + ' ~ ' + endTime;
    const amount = data.amount ? Number(data.amount).toLocaleString() + '원' : '0원';

    // 프로젝트명
    const projectName = data.projectName || '';

    // 품의서 섹션
    setText('proposal_date', meetingDate);
    setText('doc_project', projectName);
    setText('doc_location', data.location || '');
    setText('doc_datetime_proposal', datetimeStr);
    setText('doc_purpose', data.purpose || '');
    setText('doc_datetime_display', datetimeStr);
    setText('doc_amount_display', amount);

    // 문서번호 (공식문서 형식: 회의록-YYYYMMDD-01)
    const docNumber = meetingDate ? '회의록-' + meetingDate.replace(/-/g, '') + '-01' : '';

    // 회의록 섹션
    setText('doc_number_proposal', docNumber);
    setText('doc_project2', projectName);
    setText('doc_author', data.authorUserName || '');
    setText('doc_datetime', datetimeStr);
    setText('doc_location2', data.location || '');
    setText('doc_subject', data.purpose || '');
    setText('doc_content', data.content || '');

    // 참석자 명단 섹션
    setText('doc_number_attendee', docNumber);
    setText('doc_project3', projectName);
    setText('doc_author2', data.authorUserName || '');
    setText('doc_datetime2', datetimeStr);
    setText('doc_location3', data.location || '');

    // 참석자 목록 렌더링
    const attendees = data.attendees || [];

    // 품의서 참석자 행
    renderProposalAttendees(attendees);

    // 참여자 텍스트 (회의록용)
    renderAllAttendeesText(attendees);

    // 참석자 명단 테이블
    renderAttendeeSignatureTable(attendees);
}

function renderProposalAttendees(attendees) {
    // meeting_purpose_row 바로 아래에 .attendee-row들을 삽입.
    // tbody 래퍼를 쓰면 rowspan="6"이 tbody 경계에 막히므로 형제 <tr>로 둠.
    const anchorRow = document.getElementById('meeting_purpose_row');
    const purposeHeader = document.getElementById('meeting_purpose_header');
    const purposeCell = document.querySelector('.meeting-purpose-cell');
    if (!anchorRow) return;

    // 기존 attendee-row 전부 제거
    document.querySelectorAll('.attendee-row').forEach(row => row.remove());

    const maxRows = Math.max(attendees.length, 5);

    // 회의 목적 rowspan = 1(meeting_purpose_row 자체) + 참석자 행 수
    const totalRowspan = 1 + maxRows;
    if (purposeHeader) purposeHeader.setAttribute('rowspan', totalRowspan);
    if (purposeCell)   purposeCell.setAttribute('rowspan', totalRowspan);

    let insertAfter = anchorRow;
    for (let i = 0; i < maxRows; i++) {
        const a = attendees[i];
        const tr = document.createElement('tr');
        tr.className = 'attendee-row';
        if (a) {
            const typeLabel = a.isExternal ? '외부' : '내부';
            tr.innerHTML = `
                <td style="text-align:center;">${typeLabel}</td>
                <td style="text-align:center;">${a.department || ''}</td>
                <td style="text-align:center;">${a.name || ''}</td>`;
        } else {
            tr.innerHTML = `<td colspan="3">&nbsp;</td>`;
        }
        insertAfter.parentNode.insertBefore(tr, insertAfter.nextSibling);
        insertAfter = tr;
    }
}

function renderAllAttendeesText(attendees) {
    const el = document.getElementById('doc_all_attendees');
    if (!el) return;

    const internal = attendees.filter(a => !a.isExternal);
    const external = attendees.filter(a => a.isExternal);

    let text = '';
    if (internal.length > 0) {
        text += '[내부] ' + internal.map(a => a.name + (a.department ? '(' + a.department + ')' : '')).join(', ');
    }
    if (external.length > 0) {
        if (text) text += '\n';
        text += '[외부] ' + external.map(a => a.name + (a.department ? '(' + a.department + ')' : '')).join(', ');
    }
    el.textContent = text;
}

function renderAttendeeSignatureTable(attendees) {
    const tbody = document.getElementById('attendee-signature-tbody');
    if (!tbody) return;

    let html = '';
    attendees.forEach(a => {
        const typeLabel = a.isExternal ? '외부' : '내부';
        // 외부인도 서명 가능 (사번 인증 스킵 경로)
        let sigAttr = '';
        let sigInner = '';
        if (a.userIdx) {
            const ext = a.isExternal ? ' data-external="true"' : '';
            sigAttr = ` data-slot="C1601"${ext} data-signer-idx="${a.userIdx}"`;
            sigInner = '<div class="sign-area"><span class="sign-placeholder"></span></div>';
        }
        html += `<tr style="height: 70px;">
            <td style="text-align:center;">${typeLabel}</td>
            <td style="text-align:center;">${a.department || ''}</td>
            <td style="text-align:center;">${a.name || ''}</td>
            <td style="text-align:center;"${sigAttr}>${sigInner}</td>
        </tr>`;
    });

    // 최소 5행 보장
    const remaining = Math.max(0, 5 - attendees.length);
    for (let i = 0; i < remaining; i++) {
        html += `<tr style="height: 70px;">
            <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
        </tr>`;
    }

    tbody.innerHTML = html;
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
}
