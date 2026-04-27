/**
 * 연구비증빙 출장+회의 상세보기 JavaScript
 */
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    // documentIdx = approval_documents.idx, id = receipt_trip_meetings.idx
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
        const response = await fetch(`/api/receipt-trip-meetings/${receiptIdx}`);
        if (!response.ok) throw new Error('출장+회의 조회 실패');
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
        // 백엔드 getReceiptTripMeetingById 는 documentIdx/receipt idx 둘 다 polymorphic 지원
        const response = await fetch(`/api/receipt-trip-meetings/${documentIdx}`);
        if (!response.ok) throw new Error('출장+회의 조회 실패');
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
    const docIdx = data.documentIdx || data.idx;
    if (printBtn && docIdx) {
        printBtn.style.display = '';
        try {
            const sigRes = await fetch(`/api/signature/document/${docIdx}/complete`);
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
            const receiptIdx = data.receiptTripMeetingIdx || data.idx;
            window.location.href = '/approval/receipt-trip-meeting?id=' + receiptIdx;
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
                const receiptIdx = data.receiptTripMeetingIdx || data.idx;
                const res = await fetch(`/api/receipt-trip-meetings/${receiptIdx}`, { method: 'DELETE' });
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
                console.error('[삭제 실패] 출장·회의 증빙', e);
                showDeleteFailure('출장·회의 증빙');
            }
        });
    }
}

function renderDocument(data) {
    const tripDate = data.tripDate || '';
    const duration = data.duration || 0;
    const location = data.location || '';
    const purpose = data.purpose || '';
    const content = data.content || '';
    const totalFee = data.totalFee ? Number(data.totalFee) : 0;
    const meetingAmount = data.meetingAmount ? Number(data.meetingAmount) : 0;

    // 다중 회의 세션의 총 회의비 계산
    const sessions = data.meetingSessions || [];
    let totalMeetingAmount = meetingAmount;
    if (sessions.length > 0) {
        totalMeetingAmount = sessions.reduce((sum, s) => sum + (s.meetingAmount ? Number(s.meetingAmount) : 0), 0);
    }

    const grandTotal = totalFee + totalMeetingAmount;
    const grandTotalStr = grandTotal.toLocaleString() + ' 원';

    // 프로젝트명 가져오기 (비동기)
    loadProjectInfo(data.projectIdx, data);

    // 날짜 범위 계산
    let dateRange = tripDate;
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
    }

    // 품의서 작성일
    setText('doc_write_date', data.requisitionDate || tripDate);

    // 품의서 섹션
    setText('doc_location', location);
    setText('doc_date_range', dateRange);
    setText('doc_purpose', purpose);
    setText('doc_grand_total', grandTotalStr);

    // 복명서 섹션
    setText('doc_date_range2', dateRange);
    setText('doc_location2', location);
    setText('doc_result', content);
    setText('doc_request_amount', grandTotalStr);
    setText('doc_total_amount', grandTotalStr);
    setText('doc_difference', '0');

    // 출장인원 행
    renderTripPersons(data.tripAttendees || [], data);

    // 일별 비용 행 (회의비는 실제 회의 일자에 배분)
    renderDailyExpenses(data.dailyExpenses || [], totalMeetingAmount, data.meetingSessions || []);

    // 회의 세션들 렌더링
    renderMeetingSessions(data);
}

async function loadProjectInfo(projectIdx, data) {
    if (!projectIdx) return;
    try {
        const res = await fetch(`/api/projects/${projectIdx}`);
        if (res.ok) {
            const proj = await res.json();
            const name = proj.projectName || '';
            setText('doc_project', name);
            setText('doc_project2', name);

            // 회의 문서 블록에도 프로젝트명 채우기
            document.querySelectorAll('.meeting-doc-project').forEach(el => {
                el.textContent = name;
            });
        }
    } catch (e) {
        console.warn('프로젝트 조회 실패:', e);
    }
}

function renderTripPersons(attendees, data) {
    // tripPersonHeaderRow 바로 아래에 인원 행을 삽입.
    // tbody 래퍼를 쓰면 rowspan이 tbody 경계에 막혀 출장지/기간/목적 셀이 1행만 차지.
    const anchorRow = document.getElementById('tripPersonHeaderRow');
    if (!anchorRow) return;

    document.querySelectorAll('tr.trip-person-row').forEach(row => row.remove());

    const maxRows = Math.max(attendees.length, 1);

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

    // 복명자 설정
    if (attendees.length > 0) {
        const drafter = attendees.find(a => data.drafterUserIdx && Number(a.userIdx) === Number(data.drafterUserIdx));
        setText('doc_reporter', drafter ? drafter.name : attendees[0].name || '');
    }
}

function renderDailyExpenses(expenses, totalMeetingAmount, meetingSessions) {
    // 품의서 측: 날짜 1행/일 7칸 (회의비 포함)
    // 복명서 측: "정산 세부내역 / 날짜 / 구분 / 금액" 확장 구조
    //            각 날짜당 4행 + 회의 일자엔 회의비 1행 추가 (총 5행)
    const proposalAnchor = document.getElementById('proposalExpenseAnchor');
    const reportAnchor = document.getElementById('reportExpenseAnchor');

    // 기존 동적 삽입 행 제거
    document.querySelectorAll('tr.proposal-expense-row, tr.report-expense-row').forEach(row => row.remove());

    const formatDot = (iso) => {
        if (!iso) return '';
        const parts = iso.split('-');
        return parts.length === 3 ? `${parts[0]}.${parts[1]}.${parts[2]}` : iso;
    };

    // 회의 일자별 회의비 합계 — 세션에 meetingDate 가 있으면 해당 일자에 배분
    const meetingByDate = {}; // { "2026.04.23": 30000, ... }
    (meetingSessions || []).forEach(s => {
        const key = formatDot(s.meetingDate || '');
        const amt = s.meetingAmount ? Number(s.meetingAmount) : 0;
        if (key && amt > 0) {
            meetingByDate[key] = (meetingByDate[key] || 0) + amt;
        }
    });
    const sessionMeetingTotal = Object.values(meetingByDate).reduce((a, b) => a + b, 0);
    // 세션 정보가 없거나 합계가 0 이면 fallback: 첫 일자에 totalMeetingAmount 몰아주기
    const useFallback = sessionMeetingTotal === 0 && totalMeetingAmount > 0;

    const normalized = expenses.map((exp, idx) => {
        const dateDot = formatDot(exp.expenseDate || '');
        const sessionMeeting = meetingByDate[dateDot] || 0;
        const fallbackMeeting = (useFallback && idx === 0) ? totalMeetingAmount : 0;
        return {
            date: dateDot,
            transport: exp.transportationFee ? Number(exp.transportationFee) : 0,
            lodging:   exp.accommodationFee ? Number(exp.accommodationFee)   : 0,
            meal:      exp.mealFee          ? Number(exp.mealFee)            : 0,
            other:     exp.otherFee         ? Number(exp.otherFee)           : 0,
            meeting:   sessionMeeting + fallbackMeeting
        };
    });

    // ==========================
    // 품의서 소요경비 내역 (간단, 7칸)
    // ==========================
    if (proposalAnchor) {
        if (normalized.length === 0) {
            const tr = document.createElement('tr');
            tr.className = 'proposal-expense-row';
            tr.innerHTML = `<td colspan="7" style="text-align:center; padding:10px;">비용 정보 없음</td>`;
            proposalAnchor.parentNode.insertBefore(tr, proposalAnchor);
        } else {
            normalized.forEach(d => {
                const dayTotal = d.transport + d.lodging + d.meal + d.other + d.meeting;
                const tr = document.createElement('tr');
                tr.className = 'proposal-expense-row';
                tr.innerHTML = `
                    <td style="text-align: center; padding: 10px;">${d.date}</td>
                    <td style="text-align: center; padding: 10px;">${d.transport.toLocaleString()}</td>
                    <td style="text-align: center; padding: 10px;">${d.lodging.toLocaleString()}</td>
                    <td style="text-align: center; padding: 10px;">${d.meal.toLocaleString()}</td>
                    <td style="text-align: center; padding: 10px;">${d.other.toLocaleString()}</td>
                    <td style="text-align: center; padding: 10px;">${d.meeting > 0 ? d.meeting.toLocaleString() : ''}</td>
                    <td style="text-align: center; padding: 10px;">${dayTotal.toLocaleString()}</td>`;
                proposalAnchor.parentNode.insertBefore(tr, proposalAnchor);
            });
        }
    }

    // ==========================
    // 복명서 정산 세부내역 (확장 구조)
    // ==========================
    if (reportAnchor) {
        if (normalized.length === 0) {
            const tr = document.createElement('tr');
            tr.className = 'report-expense-row';
            tr.innerHTML = `<td colspan="6" style="text-align:center; padding:10px;">비용 정보 없음</td>`;
            reportAnchor.parentNode.insertBefore(tr, reportAnchor);
            return;
        }

        // 회의 일자의 회의비 행 개수 계산 (회의비 > 0 일자만)
        const meetingDayCount = normalized.filter(d => d.meeting > 0).length;
        // 전체 rowspan = 날짜당 4행 + 회의비 추가 행 + 헤더 1행
        const totalRowspan = normalized.length * 4 + meetingDayCount + 1;

        // 헤더: [정산세부내역(rowspan=전체)] [날짜] [구분(colspan=3)] [금액]
        const headerRow = document.createElement('tr');
        headerRow.className = 'report-expense-row';
        headerRow.innerHTML = `
            <th colspan="1" rowspan="${totalRowspan}" style="text-align: center; background: #f5f5f5;">정산<br>세부내역</th>
            <th style="text-align: center; background: #fafafa;">날짜</th>
            <th colspan="3" style="text-align: center; background: #fafafa;">구분</th>
            <th style="text-align: center; background: #f0f0f0;">금액</th>`;
        reportAnchor.parentNode.insertBefore(headerRow, reportAnchor);

        normalized.forEach(d => {
            const hasMeeting = d.meeting > 0;
            const rowsForDay = hasMeeting ? 5 : 4;

            // 교통비 — 첫 행에 날짜 rowspan
            const transportRow = document.createElement('tr');
            transportRow.className = 'report-expense-row';
            transportRow.innerHTML = `
                <td rowspan="${rowsForDay}" style="text-align: center; background: white; font-weight: 500; vertical-align: middle;">${d.date}</td>
                <td colspan="3" style="background: white; padding: 8px; text-align: center;">교통비</td>
                <td style="text-align: center; padding: 8px; background: white;">${d.transport.toLocaleString()}원</td>`;
            reportAnchor.parentNode.insertBefore(transportRow, reportAnchor);

            // 숙박비
            const lodgingRow = document.createElement('tr');
            lodgingRow.className = 'report-expense-row';
            lodgingRow.innerHTML = `
                <td colspan="3" style="background: white; padding: 8px; text-align: center;">숙박비</td>
                <td style="text-align: center; padding: 8px;">${d.lodging.toLocaleString()}원</td>`;
            reportAnchor.parentNode.insertBefore(lodgingRow, reportAnchor);

            // 식비
            const mealRow = document.createElement('tr');
            mealRow.className = 'report-expense-row';
            mealRow.innerHTML = `
                <td colspan="3" style="background: white; padding: 8px; text-align: center;">식비</td>
                <td style="text-align: center; padding: 8px;">${d.meal.toLocaleString()}원</td>`;
            reportAnchor.parentNode.insertBefore(mealRow, reportAnchor);

            // 기타(일비)
            const otherRow = document.createElement('tr');
            otherRow.className = 'report-expense-row';
            otherRow.innerHTML = `
                <td colspan="3" style="background: white; padding: 8px; text-align: center;">기타(일비)</td>
                <td style="text-align: center; padding: 8px;">${d.other.toLocaleString()}원</td>`;
            reportAnchor.parentNode.insertBefore(otherRow, reportAnchor);

            // 회의비 (있는 날짜만)
            if (hasMeeting) {
                const meetingRow = document.createElement('tr');
                meetingRow.className = 'report-expense-row';
                meetingRow.innerHTML = `
                    <td colspan="3" style="background: white; padding: 8px; text-align: center;">회의비</td>
                    <td style="text-align: center; padding: 8px;">${d.meeting.toLocaleString()}원</td>`;
                reportAnchor.parentNode.insertBefore(meetingRow, reportAnchor);
            }
        });
    }
}

function renderMeetingSessions(data) {
    const container = document.getElementById('meetingDocumentBlocks');
    if (!container) return;

    let sessions = data.meetingSessions || [];

    // 세션이 없으면 레거시 단일 회의 데이터 사용
    if (sessions.length === 0 && data.meetingPurpose) {
        sessions.push({
            meetingDate: data.eventDate,
            startTime: data.startTime,
            endTime: data.endTime,
            meetingPurpose: data.meetingPurpose,
            meetingContent: data.minutesNotes,
            meetingLocation: data.location,
            meetingAttendees: data.meetingAttendees || []
        });
    }

    let html = '';
    sessions.forEach((session, idx) => {
        const meetingDate = session.meetingDate || '';
        const startTime = session.startTime ? String(session.startTime).substring(0, 5) : '';
        const endTime = session.endTime ? String(session.endTime).substring(0, 5) : '';
        const datetimeStr = meetingDate + ' ' + startTime + ' ~ ' + endTime;
        const attendees = session.meetingAttendees || [];
        const meetingLocation = session.meetingLocation || data.location || '';
        const badgeLabel = sessions.length > 1 ? '<div style="text-align:center; margin:8px 0; color:#667eea; font-weight:600;">' + (idx + 1) + '번째 회의</div>' : '';
        // 회의 작성자 이름 — 세션별 meetingDrafterUserName 우선, 없으면 top-level drafterUserName fallback
        const drafterName = session.meetingDrafterUserName || data.drafterUserName || '';

        // 회의록
        html += `<div style="background: white; border: 2px solid #e0e0e0; border-radius: 8px; padding: 30px; max-width: 881px; margin: 0 auto 30px">
            <h2 class="doc-title" style="margin: 0">회 의 록</h2>
            ${badgeLabel}
            <table class="form-table">
                <colgroup>
                    <col style="width: 15%;">
                    <col style="width: 44%;">
                    <col style="width: 14%;">
                    <col style="width: 27%;">
                </colgroup>
                <tr>
                    <th style="height: 64px">과제명</th>
                    <td class="meeting-doc-project" style="text-align:center; font-size: 12px;"></td>
                    <th>작성자</th>
                    <td style="text-align:center;">${escapeHtml(drafterName)}</td>
                </tr>
                <tr>
                    <th style="height: 64px">일시</th>
                    <td style="text-align:center;">${escapeHtml(datetimeStr)}</td>
                    <th>장소</th>
                    <td style="text-align:center;">${escapeHtml(meetingLocation)}</td>
                </tr>
                <tr>
                    <th>참여자<br>(참여기관)</th>
                    <td colspan="3" style="padding: 10px; height: 80px; white-space: pre-wrap;">${formatAttendeesText(attendees)}</td>
                </tr>
                <tr>
                    <th colspan="4" style="background: #f0f0f0; padding: 15px;">내용</th>
                </tr>
                <tr>
                    <th style="vertical-align: middle; padding-top: 15px;">주제</th>
                    <td colspan="3" style="padding: 10px; text-align: left; font-size: 18px; height: 64px">${escapeHtml(session.meetingPurpose || '')}</td>
                </tr>
                <tr>
                    <th style="padding-top: 15px;">주요 내용</th>
                    <td colspan="3" style="padding: 10px; min-height: 150px; text-align: left; white-space: pre-wrap;">${escapeHtml(session.meetingContent || '')}</td>
                </tr>
                <tr>
                    <th>비고</th>
                    <td colspan="3" style="padding: 10px;"></td>
                </tr>
            </table>
        </div>`;

        // 참석자 명단
        html += `<div style="background: white; border: 2px solid #e0e0e0; border-radius: 8px; padding: 30px; margin: 0 auto 30px; max-width: 881px">
            <h2 class="doc-title" style="margin: 0">참 석 자 명 단</h2>
            ${badgeLabel}
            <table class="form-table">
                <colgroup>
                    <col style="width: 15%;">
                    <col style="width: 44%;">
                    <col style="width: 14%;">
                    <col style="width: 27%;">
                </colgroup>
                <tr>
                    <th style="height: 64px">과제</th>
                    <td class="meeting-doc-project" style="text-align:center; font-size: 12px;"></td>
                    <th>작성자</th>
                    <td style="text-align:center;">${escapeHtml(drafterName)}</td>
                </tr>
                <tr>
                    <th style="height: 64px">일시</th>
                    <td style="text-align:center;">${escapeHtml(datetimeStr)}</td>
                    <th>장소</th>
                    <td style="text-align:center;">${escapeHtml(meetingLocation)}</td>
                </tr>
            </table>
            <table class="form-table" style="margin-top: 20px;">
                <thead>
                    <tr style="height: 40px;">
                        <th style="width: 70px;">구분</th>
                        <th>소속</th>
                        <th>성명</th>
                        <th style="width: 100px;">서명</th>
                    </tr>
                </thead>
                <tbody>
                    ${renderAttendeeRows(attendees)}
                </tbody>
            </table>
        </div>`;
    });

    container.innerHTML = html;
}

function formatAttendeesText(attendees) {
    const internal = attendees.filter(a => !a.isExternal);
    const external = attendees.filter(a => a.isExternal);

    const fmt = a => (a.name || '') + (a.department ? '(' + a.department + ')' : '');

    let text = '';
    if (internal.length > 0) {
        text += '[내부] ' + internal.map(fmt).join(', ');
    }
    if (external.length > 0) {
        if (text) text += '\n';
        text += '[외부] ' + external.map(fmt).join(', ');
    }
    return escapeHtml(text);
}

function renderAttendeeRows(attendees) {
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
        html += `<tr style="height: 40px;">
            <td style="text-align:center;">${typeLabel}</td>
            <td style="text-align:center;">${escapeHtml(a.department || '')}</td>
            <td style="text-align:center;">${escapeHtml(a.name || '')}</td>
            <td style="text-align:center;"${sigAttr}>${sigInner}</td>
        </tr>`;
    });

    // 최소 5행 보장
    const remaining = Math.max(0, 5 - attendees.length);
    for (let i = 0; i < remaining; i++) {
        html += `<tr style="height: 40px;"><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;
    }
    return html;
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
