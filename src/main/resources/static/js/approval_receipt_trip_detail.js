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
        // 백엔드 getReceiptTripById 는 documentIdx/receipt idx 둘 다 polymorphic 지원
        const response = await fetch(`/api/receipt-trips/${documentIdx}`);
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
                html: '서명 내역을 포함한 모든 기록이 함께 삭제되며,<br><strong>되돌릴 수 없습니다.</strong>',
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
                    window.location.href = '/project/documents';
                } else {
                    throw new Error();
                }
            } catch (e) {
                console.error('[삭제 실패] 출장 증빙', e);
                showDeleteFailure('출장 증빙');
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
    // tripPersonHeaderRow 바로 아래에 인원 행을 삽입.
    // tbody 래퍼를 쓰면 rowspan이 tbody 경계에 막혀 출장지/기간/목적 셀이 1행만 차지.
    const anchorRow = document.getElementById('tripPersonHeaderRow');
    if (!anchorRow) return;

    // 기존 동적 삽입 인원 행 제거
    document.querySelectorAll('tr.trip-person-row').forEach(row => row.remove());

    const maxRows = Math.max(attendees.length, 1);

    // 출장지/기간/목적 rowspan = 헤더행 1 + 인원 행 N
    ['proposalLocationCell', 'proposalDateCell', 'proposalPurposeCell'].forEach(id => {
        const cell = document.getElementById(id);
        if (cell) cell.rowSpan = 1 + maxRows;
    });

    let insertAfter = anchorRow;
    for (let i = 0; i < maxRows; i++) {
        const a = attendees[i];
        const tr = document.createElement('tr');
        tr.className = 'trip-person-row';
        if (a) {
            tr.innerHTML = `
                <td style="text-align:center;">${a.department || ''}</td>
                <td style="text-align:center;">${a.position || ''}</td>
                <td style="text-align:center;">${a.name || ''}</td>`;
        } else {
            tr.innerHTML = `<td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>`;
        }
        insertAfter.parentNode.insertBefore(tr, insertAfter.nextSibling);
        insertAfter = tr;
    }
}

function renderDailyExpenses(expenses, totalFee) {
    // 품의서 측(proposalExpenseAnchor): 날짜 1행/일 간단 구조 (6칸)
    // 복명서 측(reportExpenseAnchor): "정산 세부내역 / 날짜 / 구분 / 금액" 확장 구조
    //   각 날짜당 4행(교통비/숙박비/식비/기타) + 정산세부내역 rowspan
    const proposalAnchor = document.getElementById('proposalExpenseAnchor');
    const reportAnchor = document.getElementById('reportExpenseAnchor');

    // 기존 동적 삽입 행 제거
    document.querySelectorAll('tr.trip-expense-row').forEach(row => row.remove());

    const formatDot = (iso) => {
        if (!iso) return '';
        const parts = iso.split('-');
        return parts.length === 3 ? `${parts[0]}.${parts[1]}.${parts[2]}` : iso;
    };

    const normalized = expenses.map(exp => ({
        date: formatDot(exp.expenseDate || ''),
        transport: exp.transportationFee ? Number(exp.transportationFee) : 0,
        lodging:   exp.accommodationFee ? Number(exp.accommodationFee)   : 0,
        meal:      exp.mealFee          ? Number(exp.mealFee)            : 0,
        other:     exp.otherFee         ? Number(exp.otherFee)           : 0
    }));

    // ==========================
    // 품의서 소요경비 내역 (간단)
    // ==========================
    if (proposalAnchor) {
        if (normalized.length === 0) {
            const tr = document.createElement('tr');
            tr.className = 'trip-expense-row';
            tr.innerHTML = `<td colspan="6" style="text-align:center; padding:10px;">비용 정보 없음</td>`;
            proposalAnchor.parentNode.insertBefore(tr, proposalAnchor);
        } else {
            normalized.forEach(d => {
                const dayTotal = d.transport + d.lodging + d.meal + d.other;
                const tr = document.createElement('tr');
                tr.className = 'trip-expense-row';
                tr.innerHTML = `
                    <td style="text-align: center; padding: 10px;">${d.date}</td>
                    <td style="text-align: center; padding: 10px;">${d.transport.toLocaleString()}</td>
                    <td style="text-align: center; padding: 10px;">${d.lodging.toLocaleString()}</td>
                    <td style="text-align: center; padding: 10px;">${d.meal.toLocaleString()}</td>
                    <td style="text-align: center; padding: 10px;">${d.other.toLocaleString()}</td>
                    <td style="text-align: center; padding: 10px;">${dayTotal.toLocaleString()}</td>`;
                proposalAnchor.parentNode.insertBefore(tr, proposalAnchor);
            });
        }
    }

    // ==========================
    // 복명서 정산 세부내역 (확장 — 정산세부내역 rowspan + 날짜별 4행)
    // ==========================
    if (reportAnchor) {
        if (normalized.length === 0) {
            const tr = document.createElement('tr');
            tr.className = 'trip-expense-row';
            tr.innerHTML = `<td colspan="6" style="text-align:center; padding:10px;">비용 정보 없음</td>`;
            reportAnchor.parentNode.insertBefore(tr, reportAnchor);
            return;
        }

        // 전체 rowspan = 날짜당 4행 + 헤더 1행
        const totalRowspan = normalized.length * 4 + 1;

        // 헤더: [정산세부내역(colspan=2, rowspan=전체)] [날짜] [구분(colspan=2)] [금액]
        const headerRow = document.createElement('tr');
        headerRow.className = 'trip-expense-row';
        headerRow.innerHTML = `
            <th colspan="2" rowspan="${totalRowspan}" style="text-align: center; background: #f5f5f5;">정산<br>세부내역</th>
            <th style="text-align: center; background: #fafafa;">날짜</th>
            <th colspan="2" style="text-align: center; background: #fafafa;">구분</th>
            <th style="text-align: center; background: #f0f0f0;">금액</th>`;
        reportAnchor.parentNode.insertBefore(headerRow, reportAnchor);

        // 날짜별 4행 (교통비/숙박비/식비/기타)
        normalized.forEach(d => {
            // 교통비 — 첫 행은 날짜 rowspan=4 셀을 포함
            const transportRow = document.createElement('tr');
            transportRow.className = 'trip-expense-row';
            transportRow.innerHTML = `
                <td rowspan="4" style="text-align: center; background: white; font-weight: 500; vertical-align: middle;">${d.date}</td>
                <td colspan="2" style="background: white; padding: 8px; text-align: center;">교통비</td>
                <td style="text-align: center; padding: 8px; background: white;">${d.transport.toLocaleString()}원</td>`;
            reportAnchor.parentNode.insertBefore(transportRow, reportAnchor);

            // 숙박비
            const lodgingRow = document.createElement('tr');
            lodgingRow.className = 'trip-expense-row';
            lodgingRow.innerHTML = `
                <td colspan="2" style="background: white; padding: 8px; text-align: center;">숙박비</td>
                <td style="text-align: center; padding: 8px;">${d.lodging.toLocaleString()}원</td>`;
            reportAnchor.parentNode.insertBefore(lodgingRow, reportAnchor);

            // 식비
            const mealRow = document.createElement('tr');
            mealRow.className = 'trip-expense-row';
            mealRow.innerHTML = `
                <td colspan="2" style="background: white; padding: 8px; text-align: center;">식비</td>
                <td style="text-align: center; padding: 8px;">${d.meal.toLocaleString()}원</td>`;
            reportAnchor.parentNode.insertBefore(mealRow, reportAnchor);

            // 기타(일비)
            const otherRow = document.createElement('tr');
            otherRow.className = 'trip-expense-row';
            otherRow.innerHTML = `
                <td colspan="2" style="background: white; padding: 8px; text-align: center;">기타(일비)</td>
                <td style="text-align: center; padding: 8px;">${d.other.toLocaleString()}원</td>`;
            reportAnchor.parentNode.insertBefore(otherRow, reportAnchor);
        });
    }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
}
