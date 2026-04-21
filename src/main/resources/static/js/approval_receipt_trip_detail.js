/**
 * 연구비증빙 출장 상세보기 JavaScript
 */
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    // documentIdx = approval_documents.idx, id = receipt_trips.idx
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
        const response = await fetch(`/api/receipt-trips/${receiptIdx}`);
        if (!response.ok) throw new Error('출장 조회 실패');
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
        const listRes = await fetch('/api/receipt-trips');
        if (!listRes.ok) throw new Error('출장 목록 조회 실패');
        const list = await listRes.json();

        const found = list.find(item => String(item.documentIdx) === String(documentIdx));
        if (!found) throw new Error('해당 문서를 찾을 수 없습니다.');

        const response = await fetch(`/api/receipt-trips/${found.idx}`);
        if (!response.ok) throw new Error('출장 조회 실패');
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
            window.location.href = '/approval/receipt-trip?id=' + data.idx;
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
                const res = await fetch(`/api/receipt-trips/${data.idx}`, { method: 'DELETE' });
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
}

function renderDocument(data) {
    const projectName = data.projectName || '';
    const tripDate = data.tripDate || '';
    const duration = data.duration || 0;
    const location = data.location || '';
    const purpose = data.purpose || '';
    const content = data.content || '';
    const totalFee = data.totalFee ? Number(data.totalFee) : 0;
    const totalFeeStr = totalFee.toLocaleString() + ' 원';

    // 날짜 범위 계산
    let dateRange = tripDate;
    let reportDateStr = '';
    if (tripDate) {
        const startDate = new Date(tripDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + duration);

        const formatDate = (d) => d.getFullYear() + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + String(d.getDate()).padStart(2,'0');
        if (duration > 0) {
            dateRange = formatDate(startDate) + ' ~ ' + formatDate(endDate);
        } else {
            dateRange = formatDate(startDate);
        }
        reportDateStr = endDate.getFullYear() + '년 ' + String(endDate.getMonth()+1).padStart(2,'0') + '월 ' + String(endDate.getDate()).padStart(2,'0') + '일';
    }

    // 품의서 작성일
    setText('doc_write_date', data.requisitionDate || tripDate);

    // 품의서 섹션
    setText('doc_project', projectName);
    setText('doc_location', location);
    setText('doc_date_range', dateRange);
    setText('doc_purpose', purpose);
    setText('doc_request_amount', totalFeeStr);

    // 복명서 섹션
    setText('doc_project2', projectName);
    setText('doc_report_date', reportDateStr);
    setText('doc_reporter', data.authorUserName || '');
    setText('doc_date_range2', dateRange);
    setText('doc_location2', location);
    setText('doc_result', content);
    setText('doc_request_amount2', totalFeeStr);
    setText('doc_total_amount', totalFeeStr);
    setText('doc_difference', '0');

    // 프로젝트 매니저 정보
    loadProjectManager(data.projectIdx);

    // 출장인원 행
    renderTripPersons(data.attendees || []);

    // 일별 비용 행
    renderDailyExpenses(data.dailyExpenses || [], totalFee);
}

async function loadProjectManager(projectIdx) {
    if (!projectIdx) return;
    try {
        const res = await fetch(`/api/projects/${projectIdx}`);
        if (res.ok) {
            const proj = await res.json();
            setText('doc_pi', proj.projectManagerName || '');
        }
    } catch (e) {
        console.warn('프로젝트 매니저 조회 실패:', e);
    }
}

function renderTripPersons(attendees) {
    const tbody = document.getElementById('proposalPersonBody');
    if (!tbody) return;

    let html = '';
    const maxRows = Math.max(attendees.length, 1);

    for (let i = 0; i < maxRows; i++) {
        const a = attendees[i];
        if (a) {
            html += `<tr>
                <td style="text-align:center;">${a.department || ''}</td>
                <td style="text-align:center;">${a.position || ''}</td>
                <td style="text-align:center;">${a.name || ''}</td>
            </tr>`;
        } else {
            html += `<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;
        }
    }

    tbody.innerHTML = html;
}

function renderDailyExpenses(expenses, totalFee) {
    const proposalBody = document.getElementById('proposalExpenseBody');
    const reportBody = document.getElementById('reportExpenseBody');

    let proposalHtml = '';
    let reportHtml = '';

    if (expenses.length === 0) {
        proposalHtml = '<tr><td colspan="6" style="text-align:center; padding:10px;">비용 정보 없음</td></tr>';
        reportHtml = proposalHtml;
    } else {
        expenses.forEach(exp => {
            const date = exp.expenseDate || '';
            const transport = exp.transportationFee ? Number(exp.transportationFee) : 0;
            const lodging = exp.accommodationFee ? Number(exp.accommodationFee) : 0;
            const meal = exp.mealFee ? Number(exp.mealFee) : 0;
            const other = exp.otherFee ? Number(exp.otherFee) : 0;
            const dayTotal = transport + lodging + meal + other;

            let dateDisplay = date;
            if (date) {
                const parts = date.split('-');
                if (parts.length === 3) dateDisplay = parts[1] + '/' + parts[2];
            }

            const row = `<tr>
                <td style="text-align:center;">${dateDisplay}</td>
                <td style="text-align:center;">${transport.toLocaleString()}</td>
                <td style="text-align:center;">${lodging.toLocaleString()}</td>
                <td style="text-align:center;">${meal.toLocaleString()}</td>
                <td style="text-align:center;">${other.toLocaleString()}</td>
                <td style="text-align:center;">${dayTotal.toLocaleString()}</td>
            </tr>`;
            proposalHtml += row;
            reportHtml += row;
        });
    }

    if (proposalBody) proposalBody.innerHTML = proposalHtml;
    if (reportBody) reportBody.innerHTML = reportHtml;
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
}
