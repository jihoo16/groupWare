// 연구비 증빙 - 출장+회의 통합 페이지 JavaScript

function getTodayString() {
    return new Date().toISOString().slice(0, 10);
}

document.addEventListener('DOMContentLoaded', function() {
    // 검색 유틸리티 (공통)
    const searchUtils = new SearchUtils();
    const matchesSearch = (text, keyword) => searchUtils.matchesSearch(text, keyword);
    const highlightText = (text, keyword) => searchUtils.highlightText(text, keyword);

    // 전역 변수
    let selectedMeetingReceiptFiles = [];
    let selectedMeetingDocumentFiles = [];
    let selectedTripReceiptFiles = [];
    let selectedTripDocumentFiles = [];
    // 기존 첨부파일 (수정 모드)
    let existingTripReceiptAttachments = [];
    let existingTripDocumentAttachments = [];
    let existingMeetingReceiptAttachments = [];  // { sessionIdx, ...att }
    let existingMeetingDocumentAttachments = []; // { sessionIdx, ...att }
    let deletedAttachmentIds = [];
    let selectedEmployee = null;
    let projects = []; // 프로젝트 목록
    let projectCards = []; // 선택된 프로젝트의 카드 목록
    let selectedCard = null; // 선택된 카드
    let projectMembers = []; // 선택된 프로젝트의 참여인원
    let positionCodes = []; // 직급 코드 목록 (C02, sortOrder 기준)
    let projectExpenseSettings = []; // 선택된 프로젝트의 직급별 경비 설정
    let fixedExpenses = {}; // 기초정보관리 직급별 출장비
    let fixedMealExpenses = {}; // 기초정보관리 직급별 중식비
    let allExternalPersons = []; // 외부인력 목록
    let tempSelectedExternalIds = new Set(); // 모달 내 임시 선택 상태
    let authorPersonId = null; // 현재 출장 작성자 ID
    let meetingAuthorPersonId = null; // 현재 회의 작성자 ID
    let attendees = []; // 회의 참석자 목록 (validateRequiredFields 등에서 공유)
    let tripPersons = []; // 출장 인원 목록 (validateRequiredFields 등에서 공유)
    let meetingTripPersons = []; // 회의 참석 내부인원 (출장인원 중 선택된 subset)
    let tempInternalAttendeeIds = new Set(); // 참석자 모달 내 내부인원 임시 선택 상태
    let dailyExpenses = []; // 일별 비용 목록 (submit 핸들러에서 공유)

    // 다중 회의 지원
    let currentMeetingIdx = 0;   // 현재 열린 모달이 어느 회의 블록용인지
    let meetingBlockCount = 1;   // 지금까지 생성된 최대 회의 인덱스+1
    let extraMeetings = [];      // 추가 회의 상태 (idx 1~): [{ idx, receiptFiles:[], documentFiles:[], authorPersonId:null, attendees:[], tripPersonsForMeeting:[] }]
    let isPopulatingForm = false; // populateForm() 실행 중 여부 (setDefaultAuthor 자동실행 차단용)
    let loadedReceiptTripMeetingIdx = null; // 상세보기 모드에서 로드된 출장+회의 자체 idx
    let holidays = {}; // 공휴일 캐시 { 'YYYY-MM-DD': '공휴일명', ... }
    let loadedHolidayYears = new Set(); // 이미 로드한 년도

    async function ensureHolidaysLoaded(year) {
        if (loadedHolidayYears.has(year)) return;
        try {
            const res = await fetch(`/api/holidays?year=${year}`);
            if (res.ok) Object.assign(holidays, await res.json());
        } catch (e) {
            console.warn(`[TripMeeting] ${year}년 공휴일 로드 실패:`, e);
        }
        loadedHolidayYears.add(year);
    }

    async function getNextBusinessDay(date) {
        const next = new Date(date);
        next.setDate(next.getDate() + 1);
        await ensureHolidaysLoaded(next.getFullYear());
        while (true) {
            const dow = next.getDay();
            const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
            if (dow !== 0 && dow !== 6 && !holidays[key]) break;
            next.setDate(next.getDate() + 1);
            await ensureHolidaysLoaded(next.getFullYear());
        }
        return next;
    }

    // DOM 요소
    const templateTreeHeaders = document.querySelectorAll('.tree-node-header[data-template]');
    const categoryNodes = document.querySelectorAll('.tree-node-header.category-node');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const documentForm = document.getElementById('documentForm');
    const meetingReceiptInput = document.getElementById('meetingReceiptInput_0');
    const meetingReceiptFileList = document.getElementById('meetingReceiptFileList_0');
    const meetingReceiptUploadArea = document.getElementById('meetingReceiptUploadArea_0');
    const meetingDocumentInput = document.getElementById('meetingDocumentInput_0');
    const meetingDocumentFileList = document.getElementById('meetingDocumentFileList_0');
    const meetingDocumentUploadArea = document.getElementById('meetingDocumentUploadArea_0');
    const tripReceiptInput = document.getElementById('tripReceiptInput');
    const tripReceiptFileList = document.getElementById('tripReceiptFileList');
    const tripReceiptUploadArea = document.getElementById('tripReceiptUploadArea');
    const tripDocumentInput = document.getElementById('tripDocumentInput');
    const tripDocumentFileList = document.getElementById('tripDocumentFileList');
    const tripDocumentUploadArea = document.getElementById('tripDocumentUploadArea');
    const submitBtn = document.getElementById('submitBtn');

    // 직원 데이터 (API에서 로드)
    let employees = [];

    // 직원 데이터 로드 함수
    async function loadEmployees() {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const users = await response.json();
                employees = users.map(user => ({
                    id: user.idx,
                    name: user.empName,
                    position: user.empPositionName || user.empPosition || '직급 미지정',
                    dept: user.empDeptName || user.empDept || '부서 미지정'
                }));
                console.log('직원 데이터 로드 완료:', employees.length + '명');
            } else {
                console.error('직원 데이터 로드 실패:', response.status);
                showError('직원 데이터를 불러오는데 실패했습니다. 관리자에게 문의하세요.');
            }
        } catch (error) {
            console.error('직원 데이터 로드 오류:', error);
            showError('직원 데이터를 불러오는데 오류가 발생했습니다.');
        }
    }

    // 외부인력 목록 로드
    async function loadExternalPersons() {
        try {
            const response = await fetch('/api/external-persons');
            if (response.ok) {
                allExternalPersons = await response.json();
            } else {
                console.error('외부인력 목록 로드 실패');
            }
        } catch (error) {
            console.error('외부인력 목록 로드 오류:', error);
        }
    }

    // 프로젝트 목록 로드
    async function loadProjects() {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                projects = await response.json();
                console.log('프로젝트 목록 로드 성공:', projects.length + '건');
            } else {
                console.error('프로젝트 목록 로드 실패');
            }
        } catch (error) {
            console.error('프로젝트 목록 로드 오류:', error);
        }
    }

    // 프로젝트 카드 목록 로드
    async function loadProjectCards(projectIdx) {
        try {
            const response = await fetch(`/api/projects/${projectIdx}/cards`);
            if (response.ok) {
                projectCards = await response.json();
            } else {
                projectCards = [];
            }
        } catch (error) {
            console.error('카드 목록 로드 오류:', error);
            projectCards = [];
        }
    }

    // 프로젝트 참여인원 로드 (프로젝트 이름도 캐싱하여 populateForm 에서 사용)
    let loadedProjectName = ''; // loadProjectMembers 에서 얻은 프로젝트 이름 캐시
    // ============================================
    // 참여기간 검증 헬퍼
    // - 출장 인원: 출장 전 기간 [tripDate, tripDate + duration] 활성
    // - 회의 참석자: 해당 회의 날짜 단일 활성
    // ============================================

    function isMemberActiveOnDate(member, dateStr) {
        if (!dateStr) return true;
        if (!member || !member.participationStartDate) return false;
        if (member.participationStartDate > dateStr) return false;
        const end = member.participationEndDate;
        if (end && end < dateStr) return false;
        return true;
    }

    function isMemberActiveDuringRange(member, startDateStr, endDateStr) {
        if (!startDateStr || !endDateStr) return true;
        if (!member || !member.participationStartDate) return false;
        if (member.participationStartDate > startDateStr) return false;
        const end = member.participationEndDate;
        if (end && end < endDateStr) return false;
        return true;
    }

    function formatMemberPeriod(member) {
        if (!member) return '';
        const s = member.participationStartDate || '?';
        const e = member.participationEndDate || '종료 미정';
        return `${s} ~ ${e}`;
    }

    function buildInactiveMemberHtml(member, dateLabel, dateValue, roleContext) {
        const name = member.name || member.employeeName || '(이름 없음)';
        const period = formatMemberPeriod(member);
        return `
            <div style="text-align:left; line-height:1.6;">
                <p style="margin-bottom:12px;">
                    <strong>${name}</strong> 님은
                    <strong>${dateValue}</strong> 에 본 프로젝트의 활성 참여연구원이 아닙니다.
                </p>
                <div style="background:#f1f5f9; padding:10px 14px; border-radius:6px; font-size:13px;">
                    <div>· ${dateLabel}: <strong>${dateValue}</strong></div>
                    <div>· ${name} 님 참여기간: <strong>${period}</strong></div>
                </div>
                <p style="margin-top:14px; margin-bottom:6px; font-weight:600;">다음 중 하나를 진행해주세요:</p>
                <ol style="margin:0; padding-left:20px; font-size:13px;">
                    <li>다른 ${roleContext}를 선택</li>
                    <li>${dateLabel}을 ${name} 님의 참여기간 내로 변경</li>
                    <li>프로젝트 관리에서 ${name} 님의 참여기간을 연장 (관리자 권한 필요)</li>
                </ol>
            </div>
        `;
    }

    async function showInactiveMemberAlert(member, dateLabel, dateValue, roleContext) {
        return Swal.fire({
            icon: 'warning',
            title: '참여기간 외 인원',
            html: buildInactiveMemberHtml(member, dateLabel, dateValue, roleContext),
            confirmButtonText: '확인',
            width: 540
        });
    }

    /**
     * RTM 통합 재검증.
     * - 출장 작성자 + 출장 인원 → 출장 전 기간
     * - 회의별 작성자 + 회의별 참석자 → 해당 회의 날짜
     * 비활성이 발견되면 사용자에게 한 번에 안내 + confirm 후 자동 정리.
     *
     * 호출 시점:
     *  - 수정 모드 진입 직후 (populateForm 마지막)
     *  - common_date / common_duration 변경
     *  - common_meeting_date / meeting_date_{idx} 변경
     */
    async function revalidateRtmAgainstDates() {
        if (!projectMembers || projectMembers.length === 0) return;

        const memberByIdx = new Map();
        getAuthorPersons().forEach(p => memberByIdx.set(String(p.id), p));

        const inactive = []; // {id, name, role, period, scope: 'trip' | 'meeting-{idx}'}

        // 1) 출장 작성자 + 출장 인원 — 출장 기간
        const tripRange = getCurrentTripRange();
        if (tripRange.start) {
            // 출장 작성자
            if (authorPersonId) {
                const m = memberByIdx.get(String(authorPersonId));
                if (m && !isMemberActiveDuringRange(m, tripRange.start, tripRange.end)) {
                    inactive.push({ id: authorPersonId, name: m.name, role: '출장 작성자', period: formatMemberPeriod(m), scope: 'trip' });
                }
            }
            // 출장 인원
            if (Array.isArray(tripPersons)) {
                tripPersons.forEach(p => {
                    const m = memberByIdx.get(String(p.id));
                    if (m && !isMemberActiveDuringRange(m, tripRange.start, tripRange.end)) {
                        inactive.push({ id: p.id, name: m.name, role: '출장 인원', period: formatMemberPeriod(m), scope: 'trip' });
                    }
                });
            }
        }

        // 2) 회의별 작성자 + 참석자 — 회의 날짜
        // meeting-0 (기본)
        const m0Date = getMeetingDateForIdx(0);
        if (m0Date) {
            if (meetingAuthorPersonId) {
                const m = memberByIdx.get(String(meetingAuthorPersonId));
                if (m && !isMemberActiveOnDate(m, m0Date)) {
                    inactive.push({ id: meetingAuthorPersonId, name: m.name, role: '회의 작성자 (회의 1)', period: formatMemberPeriod(m), scope: 'meeting-0' });
                }
            }
            (attendees || []).forEach(a => {
                if (a.isExternal === true) return;
                const m = memberByIdx.get(String(a.id));
                if (m && !isMemberActiveOnDate(m, m0Date)) {
                    inactive.push({ id: a.id, name: m.name, role: '회의 참석자 (회의 1)', period: formatMemberPeriod(m), scope: 'meeting-0' });
                }
            });
        }

        // extra meetings
        if (Array.isArray(extraMeetings)) {
            extraMeetings.forEach((mtg, i) => {
                const mDate = getMeetingDateForIdx(mtg.idx);
                if (!mDate) return;
                const meetingLabel = `회의 ${i + 2}`;
                if (mtg.authorPersonId) {
                    const m = memberByIdx.get(String(mtg.authorPersonId));
                    if (m && !isMemberActiveOnDate(m, mDate)) {
                        inactive.push({ id: mtg.authorPersonId, name: m.name, role: `회의 작성자 (${meetingLabel})`, period: formatMemberPeriod(m), scope: `meeting-${mtg.idx}` });
                    }
                }
                (mtg.attendees || []).forEach(a => {
                    if (a.isExternal === true) return;
                    const m = memberByIdx.get(String(a.id));
                    if (m && !isMemberActiveOnDate(m, mDate)) {
                        inactive.push({ id: a.id, name: m.name, role: `회의 참석자 (${meetingLabel})`, period: formatMemberPeriod(m), scope: `meeting-${mtg.idx}` });
                    }
                });
            });
        }

        if (inactive.length === 0) return;

        const list = inactive
            .map(i => `<li><strong>${i.name}</strong> <span style="color:#64748b;">(${i.role})</span> — 참여기간: ${i.period}</li>`)
            .join('');
        await Swal.fire({
            icon: 'warning',
            title: '참여기간 외 인원',
            html: `
                <div style="text-align:left; line-height:1.6; max-height:50vh; overflow-y:auto;">
                    <p>현재 입력된 출장 기간 또는 회의 날짜에 본 프로젝트 참여 중이 아닌 인원이 있습니다:</p>
                    <ul style="margin:8px 0 12px 16px;">${list}</ul>
                    <p style="margin-top:10px; font-weight:600;">다음 중 하나를 진행해주세요:</p>
                    <ol style="margin:0; padding-left:20px; font-size:13px;">
                        <li>해당 인원을 직접 제거하거나 다른 인원으로 교체</li>
                        <li>출장/회의 날짜를 해당 인원의 참여기간 내로 변경</li>
                        <li>프로젝트 관리에서 해당 인원의 참여기간을 연장 (관리자 권한)</li>
                    </ol>
                    <p style="margin-top:10px; color:#dc2626; font-size:12px;">
                        ⚠ 이 상태로 저장 시도하면 서버에서 거부됩니다.
                    </p>
                </div>
            `,
            confirmButtonText: '확인',
            width: 600
        });
    }

    /**
     * 현재 입력된 common_date / common_duration 으로 출장 기간 [start, end] 계산.
     * duration 은 박 수 (0=당일).
     */
    function getCurrentTripRange() {
        const startDateStr = document.getElementById('common_date')?.value || '';
        if (!startDateStr) return { start: null, end: null };
        const nights = parseInt(document.getElementById('common_duration')?.value || '0', 10);
        if (isNaN(nights) || nights < 0) return { start: startDateStr, end: startDateStr };
        const startDate = new Date(startDateStr + 'T00:00:00');
        const endDate = new Date(startDate.getTime());
        endDate.setDate(endDate.getDate() + nights);
        const yyyy = endDate.getFullYear();
        const mm = String(endDate.getMonth() + 1).padStart(2, '0');
        const dd = String(endDate.getDate()).padStart(2, '0');
        return { start: startDateStr, end: `${yyyy}-${mm}-${dd}` };
    }

    /**
     * 회의 idx 에 해당하는 회의 날짜 input ID:
     * - meeting-0 (기본): common_meeting_date
     * - extra meetings (idx >= 1): meeting_date_{idx}
     */
    function getMeetingDateForIdx(meetingIdx) {
        if (meetingIdx === 0 || meetingIdx === undefined || meetingIdx === null) {
            return document.getElementById('common_meeting_date')?.value || '';
        }
        return document.getElementById(`meeting_date_${meetingIdx}`)?.value || '';
    }

    async function loadProjectMembers(projectIdx) {
        if (!projectIdx) { projectMembers = []; loadedProjectName = ''; return; }
        try {
            const response = await fetch(`/api/projects/${projectIdx}`);
            const contentType = response.headers.get('content-type');
            if (response.ok && contentType && contentType.includes('application/json')) {
                const project = await response.json();
                projectMembers = project.projectMembers || [];
                loadedProjectName = project.projectName || '';
            } else {
                projectMembers = [];
                loadedProjectName = '';
            }
        } catch (e) {
            console.error('프로젝트 참여인원 로드 오류:', e);
            projectMembers = [];
            loadedProjectName = '';
        }
    }

    // 기초정보관리 직급별 고정경비 로드
    async function loadFixedExpenses() {
        try {
            const response = await fetch('/api/fixed-expense-policies');
            if (response.ok) {
                const data = await response.json();
                fixedExpenses = {};
                fixedMealExpenses = {};
                data.forEach(item => {
                    if (!item.amount) return;
                    if (item.expenseItemName === '출장비') {
                        if (item.positionCode) fixedExpenses[item.positionCode] = item.amount;
                        if (item.positionName)  fixedExpenses[item.positionName]  = item.amount;
                    } else if (item.expenseItemName === '중식비') {
                        if (item.positionCode) fixedMealExpenses[item.positionCode] = item.amount;
                        if (item.positionName)  fixedMealExpenses[item.positionName]  = item.amount;
                    }
                });
            }
        } catch (e) {
            console.error('고정경비 로드 오류:', e);
        }
    }

    // 프로젝트 직급별 경비 설정 로드
    async function loadProjectExpenseSettings(projectIdx) {
        if (!projectIdx) { projectExpenseSettings = []; return; }
        try {
            const response = await fetch(`/api/projects/${projectIdx}/expense-settings`);
            if (response.ok) {
                projectExpenseSettings = await response.json();
            } else {
                projectExpenseSettings = [];
            }
        } catch (e) {
            projectExpenseSettings = [];
        }
    }

    // 직급명 기준으로 개인 경비(일비/식비) 계산
    function getPersonExpense(person) {
        const codeEntry = positionCodes.find(p => p.codeName === person.position);
        const code = codeEntry?.code || '';

        let meal = 0;
        if (projectExpenseSettings.length > 0 && code) {
            const ms = projectExpenseSettings.find(s => s.positionCode === code && s.expenseItemName === '중식비');
            if (ms?.amount) meal = ms.amount;
        }
        if (!meal) meal = fixedMealExpenses[code] || fixedMealExpenses[person.position] || 0;

        let daily = 0;
        if (projectExpenseSettings.length > 0 && code) {
            const ds = projectExpenseSettings.find(s => s.positionCode === code && s.expenseItemName === '출장비');
            if (ds?.amount) daily = ds.amount;
        }
        if (!daily) daily = fixedExpenses[code] || fixedExpenses[person.position] || 0;

        return { meal, daily };
    }

    // 직급명 기준으로 개인 회의비 계산 (외부인원은 고정 30,000원)
    function getPersonMeetingExpense(person) {
        if (person.isExternal) return 30000;
        // positionCode 직접 사용, 없으면 positionCodes 배열에서 이름으로 탐색
        let code = person.positionCode || '';
        if (!code) {
            const codeEntry = positionCodes.find(p => p.codeName === person.position);
            code = codeEntry?.code || '';
        }
        let meeting = 0;
        if (projectExpenseSettings.length > 0) {
            if (code) {
                const ms = projectExpenseSettings.find(s => s.positionCode === code && (s.expenseItemName || '').includes('회의'));
                if (ms?.amount) meeting = ms.amount;
            }
            // code로 못 찾은 경우 position 이름으로 fallback
            if (!meeting && person.position) {
                const ms = projectExpenseSettings.find(s => s.positionName === person.position && (s.expenseItemName || '').includes('회의'));
                if (ms?.amount) meeting = ms.amount;
            }
        }
        return meeting;
    }

    // 출장인원 툴팁: 직급별 식비/일비
    function updateTripExpenseTooltip() {
        const content = document.getElementById('expenseTooltipContent');
        if (!content) return;
        if (!projectMembers || projectMembers.length === 0) {
            content.innerHTML = '<div class="expense-tooltip-loading" style="line-height:1.4;">프로젝트 선택 시<br>직급별 출장비 정보를<br>확인하실 수 있습니다</div>';
            return;
        }
        const seen = new Set();
        const positions = projectMembers
            .map(m => ({ name: m.employeePositionName || '직급 미지정', code: m.employeePositionCode }))
            .filter(p => { if (seen.has(p.name)) return false; seen.add(p.name); return true; });

        const rows = positions.map(pos => {
            let meal = 0;
            if (projectExpenseSettings.length > 0 && pos.code) {
                const ms = projectExpenseSettings.find(s => s.positionCode === pos.code && s.expenseItemName === '중식비');
                if (ms?.amount) meal = ms.amount;
            }
            if (!meal) meal = fixedMealExpenses[pos.code] || fixedMealExpenses[pos.name] || 0;

            let daily = 0;
            if (projectExpenseSettings.length > 0 && pos.code) {
                const ds = projectExpenseSettings.find(s => s.positionCode === pos.code && s.expenseItemName === '출장비');
                if (ds?.amount) daily = ds.amount;
            }
            if (!daily) daily = fixedExpenses[pos.code] || fixedExpenses[pos.name] || 0;

            return `<div class="expense-tooltip-item">
                <span class="expense-tooltip-position">${pos.name}</span>
                <span class="expense-tooltip-amount">식비 ${meal.toLocaleString()}원 / 일비 ${daily.toLocaleString()}원</span>
            </div>`;
        }).join('');

        content.innerHTML = `
            <div class="expense-tooltip-header">직급별 경비 기준 (1일)</div>
            ${rows || '<div class="expense-tooltip-loading">경비 기준 정보가 없습니다</div>'}
        `;
    }

    // 회의참석자 툴팁: 직급별 회의비 — contentId 요소에 내용을 채움
    function fillMeetingExpenseTooltipContent(contentId) {
        const content = document.getElementById(contentId);
        if (!content) return;
        if (!projectExpenseSettings || projectExpenseSettings.length === 0) {
            content.innerHTML = '<div class="expense-tooltip-loading" style="line-height:1.4;">프로젝트 선택 시<br>직급별 회의비 정보를<br>확인하실 수 있습니다</div>';
            return;
        }
        const meetingExpenses = projectExpenseSettings.filter(s => (s.expenseItemName || '').toLowerCase().includes('회의'));
        if (meetingExpenses.length === 0) {
            content.innerHTML = '<div class="expense-tooltip-empty">회의비 설정이 없습니다</div>';
            return;
        }
        let html = '<div class="expense-tooltip-header">직급별 회의비</div>';
        meetingExpenses.forEach(s => {
            html += `<div class="expense-tooltip-item">
                <span class="expense-tooltip-position">${s.positionName || s.positionCode}</span>
                <span class="expense-tooltip-amount">${(s.amount || 0).toLocaleString()}원</span>
            </div>`;
        });
        content.innerHTML = html;
    }

    // meeting-0 + 모든 추가 회의 tooltip 갱신
    function updateMeetingExpenseTooltip() {
        fillMeetingExpenseTooltipContent('meetingExpenseTooltipContent');
        extraMeetings.forEach(m => fillMeetingExpenseTooltipContent(`meetingExpenseTooltipContent_${m.idx}`));
    }

    // 직급 코드 로드 (C02, sortOrder 오름차순 = 낮은 직급 먼저)
    async function loadPositionCodes() {
        try {
            const response = await fetch('/api/codes/ranks?activeOnly=true');
            if (response.ok) {
                positionCodes = await response.json();
                // sortOrder 오름차순 정렬 (낮은 직급 먼저)
                positionCodes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            }
        } catch (e) {
            console.error('직급 코드 로드 오류:', e);
        }
    }

    // positionCode(code값) → sortOrder 반환
    function getPositionSortOrder(positionCode) {
        if (!positionCode) return 9999;
        const found = positionCodes.find(p => p.code === positionCode);
        return found ? (found.sortOrder || 9999) : 9999;
    }

    // 프로젝트 멤버를 낮은 직급(작은 sortOrder)부터 정렬
    function sortByPositionAsc(members) {
        return [...members].sort((a, b) =>
            getPositionSortOrder(a.positionCode) - getPositionSortOrder(b.positionCode)
        );
    }

    // 작성자 중복 검증 (공통 모듈 래퍼)
    async function checkAuthorDuplicate(empIdx, date, startTime, endTime, projectIdx, excludeReceiptIdx, excludeDocumentType, isExternal) {
        return await ReceiptCommon.hasDuplicate({
            date, attendeeIdx: empIdx, projectIdx, startTime, endTime,
            excludeReceiptIdx: excludeReceiptIdx || undefined,
            excludeDocumentType: excludeReceiptIdx ? (excludeDocumentType || 'RCTM') : undefined,
            isExternal: !!isExternal
        });
    }

    function isTimeOverlap(s1, e1, s2, e2) {
        return s1 < e2 && s2 < e1;
    }

    // 로그인 사용자 우선 작성자 선택 헬퍼 (후보 목록에서 로그인 사용자가 중복 없으면 반환)
    async function pickLoggedInAuthor(candidates, date, startTime, endTime, projectIdx, excludeReceiptIdx, excludeDocType) {
        const loggedInUserIdx = window.CURRENT_USER?.idx;
        if (!loggedInUserIdx) return null;
        const loggedIn = candidates.find(m => String(m.id) === String(loggedInUserIdx));
        if (!loggedIn) return null;
        if (!date || !startTime || !endTime || !projectIdx) return loggedIn;
        const isDup = await checkAuthorDuplicate(loggedIn.id, date, startTime, endTime, projectIdx, excludeReceiptIdx, excludeDocType);
        return isDup ? null : loggedIn;
    }

    // ── 회의 참석자 중복 검증 공통 헬퍼 ──────────────────────────────

    /** meeting-block 순서 번호 반환 (DOM 기준) */
    function getMeetingBlockNum(meetingIdx) {
        const blockEl = document.getElementById(`meeting-block-${meetingIdx}`);
        return blockEl
            ? [...(document.getElementById('meetingBlocksContainer') || document)
                .querySelectorAll('.meeting-block[data-meeting-idx]')].indexOf(blockEl) + 1
            : meetingIdx + 1;
    }

    /** meeting-0 참석자 목록 수집 ({id, name, isExternal}) */
    function collectMeeting0Persons() {
        return [
            ...tripPersons.filter(p => !p.isExternal).map(p => ({ id: p.id, name: p.name, isExternal: false })),
            ...attendees.filter(a => a.isExternal && a.id).map(a => ({ id: a.id, name: a.name, isExternal: true }))
        ];
    }

    /** extraMeeting 참석자 목록 수집 ({id, name, isExternal}) */
    function collectExtraMeetingPersons(m) {
        return [
            ...(m.tripPersonsForMeeting || []).map(p => ({ id: p.id, name: p.name, isExternal: false })),
            ...(m.attendees || []).filter(a => a.id).map(a => ({ id: a.id, name: a.name, isExternal: Boolean(a.isExternal) }))
        ];
    }

    /**
     * 특정 세션 참석자들의 시간 중복 여부를 검증합니다.
     * @param {Array}  persons           [{id, name, isExternal}, ...]
     * @param {string} date              'YYYY-MM-DD'
     * @param {string} start             'HH:mm'
     * @param {string} end               'HH:mm'
     * @param {string} projectIdx
     * @param {string|null} sessionLabel 경고 메시지 접두어 (null이면 생략)
     * @param {*}      excludeReceiptIdx 수정 시 자기 자신 제외 ID (null=신규)
     * @param {string} excludeDocType    제외 문서 타입 ('RCTM' 등)
     * @returns {Promise<boolean>} 충돌이 있으면 true (호출부에서 return 처리)
     */
    async function checkSessionAttendeeDuplicates(persons, date, start, end, projectIdx, sessionLabel, excludeReceiptIdx, excludeDocType) {
        if (!persons.length || !date || !start || !end || !projectIdx) return false;
        const dupResults = await Promise.all(
            persons.map(p => checkAuthorDuplicate(p.id, date, start, end, projectIdx, excludeReceiptIdx ?? null, excludeDocType ?? null, p.isExternal))
        );
        const conflicts = persons.filter((_, i) => dupResults[i]);
        if (conflicts.length === 0) return false;
        const names  = conflicts.map(p => p.name).join(', ');
        const prefix = sessionLabel ? `${sessionLabel} 참석자 중 ` : '다음 ';
        await showWarning(`${prefix}참석자가 해당 시간대(${start}~${end})에 이미 다른 회의에 참석 중입니다.\n\n${names}\n\n회의 시간 또는 참석자를 수정해주세요.`);
        return true;
    }

    /**
     * 전체 회의 세션(meeting-0 + extraMeetings)의 참석자 시간 중복을 일괄 검증합니다.
     * @param {string} projectIdx
     * @param {*}      excludeReceiptIdx  수정 시 자기 자신 제외 ID (null=신규)
     * @param {string} excludeDocType     제외 문서 타입
     * @returns {Promise<boolean>} 충돌이 있으면 true (호출부에서 return 처리)
     */
    async function checkAllMeetingAttendeeDuplicates(projectIdx, excludeReceiptIdx, excludeDocType) {
        const date  = document.getElementById('common_meeting_date')?.value;
        const start = document.getElementById('common_start_time')?.value;
        const end   = document.getElementById('common_end_time')?.value;

        if (date && start && end) {
            if (await checkSessionAttendeeDuplicates(collectMeeting0Persons(), date, start, end, projectIdx, null, excludeReceiptIdx, excludeDocType)) return true;
        }

        for (const m of extraMeetings) {
            const mDate  = document.getElementById(`meeting_date_${m.idx}`)?.value;
            const mStart = document.getElementById(`meeting_start_time_${m.idx}`)?.value;
            const mEnd   = document.getElementById(`meeting_end_time_${m.idx}`)?.value;
            if (!mDate || !mStart || !mEnd) continue;
            const label = `${getMeetingBlockNum(m.idx)}번째 회의`;
            if (await checkSessionAttendeeDuplicates(collectExtraMeetingPersons(m), mDate, mStart, mEnd, projectIdx, label, excludeReceiptIdx, excludeDocType)) return true;
        }

        return false;
    }

    async function setDefaultAuthor() {
        if (isPopulatingForm) return; // 데이터 로드 중에는 자동 설정 차단
        if (projectMembers.length === 0) return;

        const date = document.getElementById('common_meeting_date')?.value;
        const startTime = document.getElementById('common_start_time')?.value;
        const endTime = document.getElementById('common_end_time')?.value;
        const projectIdx = document.getElementById('selectedProjectIdx')?.value;
        const startInput = document.getElementById('common_start_time');

        // 중복 검증에 필요한 값이 아직 없으면 작성자 자동 설정 안 함
        // (date/time/project이 채워지는 시점에 다시 호출되어야 함)
        if (!date || !startTime || !endTime || !projectIdx) return;

        // 이미 작성자가 설정된 경우: 현재 조건 하에서 여전히 유효한지 재검증
        if (authorPersonId) {
            const stillDup = await checkAuthorDuplicate(authorPersonId, date, startTime, endTime, projectIdx);
            if (!stillDup) return; // 유효 → 그대로 유지
            // 중복이면 초기화 후 재선택 로직으로 진행
            authorPersonId = null;
        }

        const members = projectMembers.map(m => ({
            id: m.employeeIdx || m.id,
            name: m.employeeName || m.name,
            dept: m.employeeDeptName || m.dept || '',
            position: m.employeePositionName || m.position || '',
            positionCode: m.employeePositionCode || m.positionCode || ''
        }));

        const { author, allBlocked } = await ReceiptCommon.pickDefaultAuthor({
            candidates: members,
            getPositionOrder: (m) => getPositionSortOrder(m.positionCode),
            loggedInUserIdx: window.CURRENT_USER?.idx,
            duplicateProbe: async (cand) => await checkAuthorDuplicate(cand.id, date, startTime, endTime, projectIdx),
            rankStrategy: 'ascStep4'
        });

        if (allBlocked) {
            await Swal.fire({
                icon: 'warning',
                title: '시간 중복',
                html: `선택하신 시간대(<strong>${startTime} ~ ${endTime}</strong>)에<br>참여 가능한 프로젝트 멤버가 없습니다.<br><br>회의 시간을 변경해주세요.`,
                confirmButtonText: '확인'
            });
            if (startInput) startInput.focus();
            return;
        }

        if (author && window.setAuthorInTemplate) {
            window.setAuthorInTemplate(author);
        }
    }


    // ============================================
    // 템플릿 사이드바 접기/펼치기 기능
    // ============================================

    // 전체 접기/펼치기 버튼
    const toggleAllBtn = document.getElementById('toggleAllBtn');
    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', function() {
            const categories = document.querySelectorAll('.menu-category');
            const allExpanded = Array.from(categories).every(cat => cat.classList.contains('expanded'));

            categories.forEach(category => {
                if (allExpanded) {
                    category.classList.remove('expanded');
                } else {
                    category.classList.add('expanded');
                }
            });

            // 버튼 아이콘 변경
            const icon = this.querySelector('i');
            if (allExpanded) {
                icon.className = 'fas fa-chevron-up';
            } else {
                icon.className = 'fas fa-chevron-down';
            }
        });
    }

    // 각 카테고리 헤더 클릭 시 토글
    const categoryHeaders = document.querySelectorAll('.category-header');
    categoryHeaders.forEach(header => {
        header.addEventListener('click', function(e) {
            // 링크 클릭 방지
            e.preventDefault();

            const category = this.closest('.menu-category');
            category.classList.toggle('expanded');

            // 전체 버튼 상태 업데이트
            updateToggleAllButton();
        });
    });

    // 전체 버튼 상태 업데이트
    function updateToggleAllButton() {
        if (!toggleAllBtn) return;

        const categories = document.querySelectorAll('.menu-category');
        const allExpanded = Array.from(categories).every(cat => cat.classList.contains('expanded'));
        const allCollapsed = Array.from(categories).every(cat => !cat.classList.contains('expanded'));

        const icon = toggleAllBtn.querySelector('i');
        if (allCollapsed) {
            icon.className = 'fas fa-chevron-up';
        } else if (allExpanded) {
            icon.className = 'fas fa-chevron-down';
        }
    }

    // 템플릿 선택
    templateTreeHeaders.forEach(header => {
        header.addEventListener('click', function() {
            templateTreeHeaders.forEach(h => h.classList.remove('active'));
            this.classList.add('active');

            const template = this.getAttribute('data-template');
            loadTemplate(template);
        });
    });

    // 클립보드 paste 상태 변수 — loadTemplate → setupTripAutoFill 에서 사용하므로 먼저 선언
    let activeReceiptBlock = { kind: 'trip', idx: null };
    let _pasteRegistered = false;

    // 템플릿 로드
    function loadTemplate(templateKey) {
        const templateElement = document.getElementById('template-' + templateKey);
        if (templateElement) {
            documentForm.innerHTML = templateElement.innerHTML;
            if (templateKey === 'receipt-trip') {
                setupTripAutoFill();
                setupDocumentFormToggle();
            }
        }
    }

    // 출장+회의 자동 채우기 기능
    function setupTripAutoFill() {
        const commonProject = document.getElementById('common_project');
        const commonAuthor = document.getElementById('common_author');
        const commonLocation = document.getElementById('common_location');
        const commonDate = document.getElementById('common_date');
        const commonDuration = document.getElementById('common_duration');
        const commonPurpose = document.getElementById('common_purpose');
        const commonTripResult = document.getElementById('common_trip_result');
        const commonMeetingContent = document.getElementById('common_meeting_content');
        const commonMeetingPurpose = document.getElementById('common_meeting_purpose');
        const tripPersonArea = document.getElementById('tripPersonArea');
        const tripPersonList = document.getElementById('tripPersonList');
        const attendeeArea = document.getElementById('attendeeArea');
        const addAttendeeBtn = document.getElementById('addAttendeeBtn');
        const removeAttendeeBtn = document.getElementById('removeAttendeeBtn');
        const attendeeList = document.getElementById('attendeeList');
        const dailyExpenseBody = document.getElementById('dailyExpenseBody');

        dailyExpenses = [];
        attendees = [];

        // 출장 인원 모달 초기화
        if (tripPersonArea) {
            tripPersonArea.addEventListener('click', function(e) {
                if (e.target.closest('.trip-person-remove')) return;
                if (e.target.closest('.trip-person-item') || e.target.closest('.add-more-persons-btn')) return;
                if (tripPersons.length > 0) return;
                openTripPersonModal();
            });
        }

        // 회의 참석자 모달 초기화 — 전체 영역 클릭 제거, 명시적 버튼으로 대체

        // 출장 인원 추가 버튼 표시/숨김
        function showAddPersonButton() {
            if (!tripPersonArea) return;
            let btn = tripPersonArea.querySelector('.add-more-persons-btn');
            if (!btn) {
                btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'add-more-persons-btn';
                btn.onclick = openTripPersonModal;
                btn.innerHTML = '<i class="fas fa-user-plus"></i> 출장인원 추가';
                tripPersonArea.appendChild(btn);
            }
            btn.style.display = 'flex';
        }

        function hideAddPersonButton() {
            if (!tripPersonArea) return;
            const btn = tripPersonArea.querySelector('.add-more-persons-btn');
            if (btn) btn.style.display = 'none';
        }

        // 출장 인원 목록 렌더링 함수
        function renderTripPersonListInTemplate() {
            if (!tripPersonList) return;

            if (tripPersons.length === 0) {
                tripPersonArea && tripPersonArea.classList.remove('has-persons');
                tripPersonList.innerHTML = `
                    <div class="empty-attendee-state">
                        <i class="fas fa-user-plus"></i>
                        <div>클릭하여 출장 인원 추가</div>
                    </div>
                `;
                hideAddPersonButton();
            } else {
                tripPersonArea && tripPersonArea.classList.add('has-persons');
                // 최저직급(사원) 먼저 정렬
                const sortedTripPersons = [...tripPersons].sort((a, b) => {
                    const codeA = positionCodes.find(pc => pc.codeName === a.position)?.code || '';
                    const codeB = positionCodes.find(pc => pc.codeName === b.position)?.code || '';
                    return getPositionSortOrder(codeB) - getPositionSortOrder(codeA);
                });
                tripPersonList.innerHTML = sortedTripPersons.map(person => {
                    const { meal, daily } = getPersonExpense(person);
                    const expenseTag = (meal || daily)
                        ? `<span class="expense-tag">일비 ${daily.toLocaleString()}원 · 식비 ${meal.toLocaleString()}원</span>`
                        : '';
                    const isAuthor = authorPersonId && String(person.id) === authorPersonId;
                    const authorBadge = isAuthor ? '<span class="author-badge">작성자</span>' : '';
                    const deleteButton = isAuthor
                        ? `<span class="cannot-remove-text"><i class="fas fa-lock"></i> 삭제 불가</span>`
                        : `<button type="button" class="trip-person-remove" onclick="removeTripPersonInTemplate('${person.id}')"><i class="fas fa-times"></i> 삭제</button>`;
                    return `
                    <div class="trip-person-item${isAuthor ? ' is-author' : ''}" onclick="event.stopPropagation();">
                        <div class="trip-person-info">
                            <span class="name">${person.name}${authorBadge}</span>
                            <span>${person.dept}</span>
                            <span>${person.position}</span>
                            ${expenseTag}
                        </div>
                        ${deleteButton}
                    </div>`;
                }).join('');
                showAddPersonButton();
            }

            // 출장인원 수 뱃지 업데이트
            const tripCountBadge = document.getElementById('tripPersonCount');
            if (tripCountBadge) {
                if (tripPersons.length > 0) {
                    tripCountBadge.textContent = `${tripPersons.length}명`;
                    tripCountBadge.style.display = 'inline-flex';
                } else {
                    tripCountBadge.style.display = 'none';
                }
            }

            updateTripPersonDisplay();
            updateTotalExpenses();
        }

        // 템플릿 내에서 인원 제거
        window.removeTripPersonInTemplate = function(personId) {
            if (authorPersonId && String(personId) === authorPersonId) return; // 작성자 제거 불가
            tripPersons = tripPersons.filter(p => p.id !== personId);
            meetingTripPersons = meetingTripPersons.filter(p => String(p.id) !== String(personId));
            renderTripPersonListInTemplate();
            renderAttendeeListInTemplate();
        };

        // 출장 인원 테이블 업데이트 (품의서 인원 목록 동적 생성)
        function updateTripPersonDisplay() {
            const headerRow = document.getElementById('proposalPersonHeaderRow');
            if (!headerRow) return;

            const table = headerRow.closest('table');
            if (!table) return;

            // 기존 인원 행 모두 제거
            table.querySelectorAll('.proposal-trip-person-row').forEach(r => r.remove());

            const count = Math.max(1, tripPersons.length);

            // rowspan 업데이트 (헤더 행 1 + 인원 행 N)
            ['proposalLocationCell', 'proposalDateCell', 'proposalPurposeCell'].forEach(id => {
                const cell = document.getElementById(id);
                if (cell) cell.rowSpan = count + 1;
            });

            // 인원 행 삽입
            let insertAfter = headerRow;
            for (let i = 0; i < count; i++) {
                const person = tripPersons[i];
                const dept = person ? (person.dept || '') : '';
                const deptFontSize = dept.length >= 5 ? '9px' : '11px';
                const tr = document.createElement('tr');
                tr.className = 'proposal-trip-person-row';
                tr.innerHTML = `
                    <td style="text-align: center; padding: 4px 6px; font-size: ${deptFontSize};">${dept}</td>
                    <td style="text-align: center; padding: 4px 6px;">${person ? (person.position || '') : ''}</td>
                    <td style="text-align: center; padding: 4px 6px;">${person ? (person.name || '') : ''}</td>
                `;
                insertAfter.insertAdjacentElement('afterend', tr);
                insertAfter = tr;
            }

            // 출장내용 및 결과 업데이트
            updateTripResult();
        }

        // 전역 함수로 등록하여 모달에서 접근 가능하게
        window.addPersonsToTrip = function(persons) {
            persons.forEach(person => {
                if (!tripPersons.some(p => p.id === person.id)) {
                    tripPersons.push(person);
                }
                // 회의-0 참석자에도 자동 포함
                if (!meetingTripPersons.some(p => String(p.id) === String(person.id))) {
                    meetingTripPersons.push(person);
                }
                // 추가 회의 블록에도 자동 포함
                extraMeetings.forEach(m => {
                    if (!m.tripPersonsForMeeting.some(p => String(p.id) === String(person.id))) {
                        m.tripPersonsForMeeting.push(person);
                    }
                });
            });
            renderTripPersonListInTemplate();
            renderAttendeeListInTemplate();
            extraMeetings.forEach(m => renderExtraMeetingAttendees(m.idx));
        };

        window.getTripPersons = function() { return tripPersons; };
        window.getExternalAttendees = function() { return attendees; };
        window.refreshTripPersonBadges = function() { renderTripPersonListInTemplate(); };

        // 출장인원 목록을 교체 (모달에서 선택 확정 시 사용)
        window.replaceTripPersons = function(persons) {
            tripPersons = persons;
            // 작성자가 인원 목록에서 빠진 경우 작성자 필드도 초기화
            // (단, 데이터 로드 중에는 초기화하지 않음 - populateForm에서 별도 복원함)
            if (!isPopulatingForm && authorPersonId && !persons.some(p => String(p.id) === authorPersonId)) {
                authorPersonId = null;
                const authorField = document.getElementById('common_author');
                if (authorField) authorField.value = '';
                document.querySelectorAll('.auto-author').forEach(el => { el.value = ''; });
                document.querySelectorAll('.auto-reporter').forEach(el => { el.textContent = ''; });
            }
            // meetingTripPersons 동기화
            const tripIds = new Set(persons.map(p => String(p.id)));
            meetingTripPersons = meetingTripPersons.filter(p => tripIds.has(String(p.id)));
            persons.forEach(p => {
                if (!meetingTripPersons.some(mp => String(mp.id) === String(p.id))) {
                    meetingTripPersons.push(p);
                }
            });
            // 추가 회의 블록 동기화
            extraMeetings.forEach(m => {
                m.tripPersonsForMeeting = m.tripPersonsForMeeting.filter(p => tripIds.has(String(p.id)));
                persons.forEach(p => {
                    if (!m.tripPersonsForMeeting.some(mp => String(mp.id) === String(p.id))) {
                        m.tripPersonsForMeeting.push(p);
                    }
                });
            });
            renderTripPersonListInTemplate();
            renderAttendeeListInTemplate();
            extraMeetings.forEach(m => renderExtraMeetingAttendees(m.idx));
        };

        window.setAuthorInTemplate = function(person) {
            const prevAuthorId = authorPersonId; // 기존 작성자 ID 보관
            authorPersonId = String(person.id); // 작성자 ID 기록
            meetingAuthorPersonId = String(person.id); // 회의 작성자 ID도 동기화
            const authorField = document.getElementById('common_author');
            if (authorField) {
                authorField.value = person.name;
                document.querySelectorAll('.auto-author').forEach(el => { el.value = person.name; });
                document.querySelectorAll('.auto-reporter').forEach(el => { el.textContent = person.name; });
            }

            // 회의 작성자 연동 (출장 작성자 변경 시 항상 동기화)
            const meetingAuthorField = document.getElementById('common_meeting_author');
            if (meetingAuthorField) {
                const label = person.position || person.dept || '';
                meetingAuthorField.value = label ? `${person.name} (${label})` : person.name;
            }

            // 기존 작성자가 회의 작성자로도 쓰이지 않는다면 출장인원에서 제거
            if (prevAuthorId && prevAuthorId !== String(person.id)) {
                const isStillMeetingAuthor =
                    String(meetingAuthorPersonId) === prevAuthorId ||
                    extraMeetings.some(m => m.authorPersonId && String(m.authorPersonId) === prevAuthorId);
                if (!isStillMeetingAuthor) {
                    tripPersons = tripPersons.filter(p => String(p.id) !== prevAuthorId);
                    meetingTripPersons = meetingTripPersons.filter(p => String(p.id) !== prevAuthorId);
                    extraMeetings.forEach(m => {
                        m.tripPersonsForMeeting = m.tripPersonsForMeeting.filter(p => String(p.id) !== prevAuthorId);
                    });
                }
            }

            // 새 작성자를 출장인원에 자동 등록 (내부인원은 회의참석자로 자동 표시됨)
            const personEntry = {
                id: String(person.id),
                name: person.name,
                dept: person.dept || '',
                position: person.position || '',
                positionCode: person.positionCode || ''
            };
            if (window.addPersonsToTrip) window.addPersonsToTrip([personEntry]);
        };

        // 기존 버튼 방식은 제거됨 - 이제 모달 방식으로 작동

        // 회의 참석자 목록 렌더링 함수 (내부=meetingTripPersons, 외부=attendees 배열)
        function renderAttendeeListInTemplate() {
            if (!attendeeList) return;

            // 최저직급(사원) 먼저 정렬
            const internalPersons = [...meetingTripPersons].sort((a, b) => {
                const codeA = positionCodes.find(pc => pc.codeName === a.position)?.code || '';
                const codeB = positionCodes.find(pc => pc.codeName === b.position)?.code || '';
                return getPositionSortOrder(codeB) - getPositionSortOrder(codeA);
            });
            const externalAttendees = attendees;

            if (internalPersons.length === 0 && externalAttendees.length === 0) {
                attendeeList.innerHTML = `
                    <div class="empty-attendee-state">
                        <i class="fas fa-user-plus"></i>
                        <div>외부 참석자를 추가해주세요</div>
                    </div>
                `;
            } else {
                const internalHtml = internalPersons.map(person => {
                    const meeting = getPersonMeetingExpense(person);
                    const expenseTag = meeting > 0
                        ? `<span class="expense-tag">회의비 ${meeting.toLocaleString()}원</span>`
                        : '';
                    return `
                    <div class="trip-person-item">
                        <div class="trip-person-info">
                            <span class="name">${person.name}</span>
                            <span>${person.dept}</span>
                            <span>${person.position}</span>
                            <span class="attendee-internal-badge"><i class="fas fa-building"></i> 내부</span>
                            ${expenseTag}
                        </div>
                    </div>`;
                }).join('');

                const externalHtml = externalAttendees.map(attendee => {
                    const meeting = getPersonMeetingExpense(attendee);
                    const expenseTag = meeting > 0
                        ? `<span class="expense-tag">회의비 ${meeting.toLocaleString()}원</span>`
                        : '';
                    return `
                    <div class="trip-person-item">
                        <div class="trip-person-info">
                            <span class="name">${attendee.name}<span class="external-badge">외부</span></span>
                            <span>${attendee.dept}</span>
                            <span>${attendee.position}</span>
                            ${expenseTag}
                        </div>
                        <button type="button" class="trip-person-remove attendee-remove" onclick="removeAttendeeInTemplate('${attendee.id}')">
                            <i class="fas fa-times"></i> 제거
                        </button>
                    </div>`;
                }).join('');

                attendeeList.innerHTML = internalHtml + externalHtml;
            }

            // 회의참석자 수 뱃지 업데이트 (내부+외부 합계)
            const attendeeCountBadge = document.getElementById('attendeeCount');
            if (attendeeCountBadge) {
                const total = tripPersons.length + attendees.length;
                if (total > 0) {
                    const parts = [];
                    if (tripPersons.length > 0) parts.push(`내부 ${tripPersons.length}`);
                    if (attendees.length > 0) parts.push(`외부 ${attendees.length}`);
                    attendeeCountBadge.textContent = `총 ${total}명 (${parts.join(' · ')})`;
                    attendeeCountBadge.style.display = 'inline-flex';
                } else {
                    attendeeCountBadge.style.display = 'none';
                }
            }

            // 회의록 참석자 금액합계 업데이트 (내부 + 외부 합산)
            {
                let meetingTotal = 0;
                meetingTripPersons.forEach(p => { meetingTotal += getPersonMeetingExpense(p); });
                attendees.forEach(p => { meetingTotal += getPersonMeetingExpense(p); }); // 외부 1인 30,000원
                const totalText = meetingTotal > 0 ? `${meetingTotal.toLocaleString()}원` : '-';
                const formEl = document.getElementById('minutesMeetingExpenseTotal');
                if (formEl) formEl.textContent = totalText;
                document.querySelectorAll('.auto-minutes-meeting-expense-total').forEach(el => { el.textContent = totalText; });
            }

            updateAttendeeDisplay();
            updateTotalExpenses();
        }

        window.renderAttendeeListInTemplate = renderAttendeeListInTemplate;

        // 템플릿 내에서 참석자 제거
        window.removeAttendeeInTemplate = function(attendeeId) {
            attendees = attendees.filter(a => a.id !== attendeeId);
            renderAttendeeListInTemplate();
        };

        // 전역 함수로 등록하여 모달에서 접근 가능하게
        window.addAttendeesToMeeting = function(persons) {
            persons.forEach(person => {
                if (!attendees.some(a => a.id === person.id)) {
                    attendees.push(person);
                }
            });
            renderAttendeeListInTemplate();
        };

        // 참석자 명단 테이블 업데이트
        function updateAttendeeDisplay() {
            // 내부 인원 = 출장인원, 외부 인원 = attendees 배열 (isExternal: true)
            const internalAttendees = tripPersons.filter(p => p.name && p.name.trim());
            const externalAttendees = attendees.filter(a => a.name && a.name.trim());

            // 참여자(참여기관) 텍스트 생성 - 회의록용 (내부 + 외부 모두 포함)
            let allAttendeesText = '';
            const internalNames = internalAttendees.map(a => a.name.trim());
            const externalParts = externalAttendees.map(a => `${a.name.trim()}(${(a.dept || '외부').trim()})`);

            if (internalNames.length > 0 && externalParts.length > 0) {
                allAttendeesText = internalNames.join(', ') + '(파인씨앤아이), ' + externalParts.join(', ');
            } else if (internalNames.length > 0) {
                allAttendeesText = internalNames.join(', ') + '(파인씨앤아이)';
            } else if (externalParts.length > 0) {
                allAttendeesText = externalParts.join(', ');
            }

            document.querySelectorAll('.auto-all-attendees').forEach(field => {
                field.textContent = allAttendeesText;
            });

            // 참석자 명단 서명 테이블 업데이트 (외부 선순위, 내부 직급 오름차순)
            const sortedInternal = [...internalAttendees].sort((a, b) => {
                const codeA = positionCodes.find(pc => pc.codeName === a.position)?.code || '';
                const codeB = positionCodes.find(pc => pc.codeName === b.position)?.code || '';
                return getPositionSortOrder(codeA) - getPositionSortOrder(codeB);
            });
            const sortedAll = [...externalAttendees, ...sortedInternal];

            const sigBody = document.getElementById('attendeeSignatureBody');
            if (sigBody) {
                sigBody.innerHTML = sortedAll.map(attendee => {
                    const type = attendee.isExternal ? '외부' : '내부';
                    const dept = attendee.isExternal ? (attendee.dept || '') : '파인씨앤아이';
                    const sigAttr = !attendee.isExternal && attendee.idx ? ` data-slot="C1601" data-signer-idx="${attendee.idx}"` : '';
                    return `<tr style="height: 50px;">
                        <td style="text-align: center;">${type}</td>
                        <td style="text-align: center;">${dept}</td>
                        <td style="text-align: center;">${attendee.name}</td>
                        <td${sigAttr}></td>
                    </tr>`;
                }).join('');
                adjustAttendeeLayout(sortedAll.length);
            }

            // 출장품의서 출장인원 테이블 업데이트 (외부 인원 제외)
            const personRows = document.querySelectorAll('.person-row');

            // 모든 행 초기화
            personRows.forEach(row => {
                const cells = row.querySelectorAll('td');
                cells[0].textContent = '';
                cells[1].textContent = '';
                cells[2].textContent = '';
            });

            // 내부 인원만 출장품의서에 표시 (최대 5명)
            internalAttendees.forEach((attendee, index) => {
                if (index < 5 && personRows[index]) {
                    const cells = personRows[index].querySelectorAll('td');
                    cells[0].textContent = attendee.dept || '';
                    cells[1].textContent = attendee.position || '';
                    cells[2].textContent = attendee.name || '';
                }
            });

            // 회의 관련 필드 업데이트
            updateMeetingFields();

            // 출장내용 및 결과 업데이트
            updateTripResult();
        }

        // 참석자명단 동적 레이아웃 축소 (12명 이상 시 A4 한 쪽 인쇄 유지)
        function adjustAttendeeLayout(count) {
            const sigTable   = document.getElementById('attendee-signature-table');
            const infoRow1   = document.getElementById('attendeeInfoRow1');
            const infoRow2   = document.getElementById('attendeeInfoRow2');
            if (!sigTable) return;

            let rowH, infoRowH, fontSize, sigHeaderH;
            if (count <= 10) {
                rowH = '50px'; infoRowH = '64px'; sigHeaderH = '40px'; fontSize = '';
            } else if (count <= 15) {
                rowH = '38px'; infoRowH = '48px'; sigHeaderH = '32px'; fontSize = '12px';
            } else if (count <= 20) {
                rowH = '30px'; infoRowH = '40px'; sigHeaderH = '26px'; fontSize = '11px';
            } else {
                rowH = '24px'; infoRowH = '34px'; sigHeaderH = '22px'; fontSize = '10px';
            }

            // info 테이블 행 높이
            if (infoRow1) infoRow1.style.height = infoRowH;
            if (infoRow2) infoRow2.style.height = infoRowH;

            // 서명 테이블 헤더 높이
            const sigHeaderRow = sigTable.querySelector('thead tr');
            if (sigHeaderRow) sigHeaderRow.style.height = sigHeaderH;

            // 서명 테이블 폰트
            sigTable.style.fontSize = fontSize;

            // 각 서명 행 높이 재적용
            sigTable.querySelectorAll('tbody tr').forEach(row => {
                row.style.height = rowH;
            });
        }

        // 회의록 주요 내용 동적 폰트 크기 조정 (A4 한 쪽 인쇄 유지)
        function adjustContentFontSize(el, text) {
            const len = text.length;
            let fontSize, lineHeight;
            if (len <= 100) {
                fontSize = '20px'; lineHeight = '1.9';
            } else if (len <= 200) {
                fontSize = '18px'; lineHeight = '1.8';
            } else if (len <= 350) {
                fontSize = '16px'; lineHeight = '1.7';
            } else if (len <= 520) {
                fontSize = '14px'; lineHeight = '1.6';
            } else if (len <= 750) {
                fontSize = '12px'; lineHeight = '1.5';
            } else if (len <= 1100) {
                fontSize = '10px'; lineHeight = '1.4';
            } else {
                fontSize = '8px'; lineHeight = '1.3';
            }
            el.style.fontSize = fontSize;
            el.style.lineHeight = lineHeight;
        }

        // 출장복명서 레이아웃 동적 축소 (2박 이상 시 A4 한 쪽 인쇄 유지)
        // 스타일은 CSS의 .trip-Nday 클래스가 담당 — JS는 class 추가/제거만 수행
        function adjustReportLayout(dayCount) {
            const reportFormDiv = document.getElementById('reportFormDiv');
            if (!reportFormDiv) return;

            // 결재 서명칸은 항상 78px 고정 (CSS로 제어 불가한 절대 규칙)
            const approvalRow = document.getElementById('reportApprovalSignRow');
            if (approvalRow) approvalRow.querySelectorAll('td').forEach(td => { td.style.height = '78px'; });

            // 박수에 맞는 class 추가 → print CSS의 .trip-Nday 규칙이 스타일 적용
            reportFormDiv.classList.remove('trip-1day', 'trip-2day', 'trip-3day', 'trip-4day');
            if      (dayCount <= 1) reportFormDiv.classList.add('trip-1day');
            else if (dayCount === 2) reportFormDiv.classList.add('trip-2day');
            else if (dayCount === 3) reportFormDiv.classList.add('trip-3day');
            else                     reportFormDiv.classList.add('trip-4day');
        }

        // 회의 관련 필드 업데이트
        function updateMeetingFields() {
            // 작성자 (회의록, 참석자명단) - 회의 작성자 사용
            const meetingAuthorEl = document.getElementById('common_meeting_author');
            const meetingAuthorText = meetingAuthorEl ? (meetingAuthorEl.value || '').split(' (')[0] : '';
            document.querySelectorAll('.auto-author').forEach(field => {
                field.value = meetingAuthorText;
            });

            // 복명자 (출장 작성자와 동일하게)
            const authorText = commonAuthor ? commonAuthor.value : '';
            document.querySelectorAll('.auto-reporter').forEach(field => {
                field.textContent = authorText;
            });

            // 일시 (회의록, 참석자 명단 공통) - 회의 날짜 + 시작~종료 시간
            {
                const meetingDateEl = document.getElementById('common_meeting_date');
                const startTimeEl = document.getElementById('common_start_time');
                const endTimeEl = document.getElementById('common_end_time');
                const dateVal = meetingDateEl ? meetingDateEl.value : '';
                const startVal = startTimeEl ? startTimeEl.value : '';
                const endVal = endTimeEl ? endTimeEl.value : '';

                let dateTimeText = '';
                if (dateVal) {
                    const [year, month, day] = dateVal.split('-');
                    dateTimeText = `${year}.${month}.${day}`;
                    if (startVal && endVal) {
                        dateTimeText += ` ${startVal} ~ ${endVal}`;
                    } else if (startVal) {
                        dateTimeText += ` ${startVal}`;
                    }
                }

                document.querySelectorAll('.auto-datetime').forEach(field => {
                    field.value = dateTimeText;
                });
            }

            // 주제 (회의 제목 사용)
            const subjectText = commonMeetingPurpose ? commonMeetingPurpose.value : '';
            document.querySelectorAll('.auto-subject').forEach(field => {
                field.textContent = subjectText;
            });

            // 주요 내용 (회의 내용 사용)
            const contentText = commonMeetingContent ? commonMeetingContent.value : '';
            document.querySelectorAll('.auto-content').forEach(field => {
                field.textContent = contentText;
                adjustContentFontSize(field, contentText);
            });

            // 회의 장소 (회의록 문서 - 회의-0)
            const meetingLocationEl = document.getElementById('common_meeting_location');
            const docMeetingLocationEl = document.getElementById('doc_meeting_location_0');
            if (meetingLocationEl && docMeetingLocationEl) {
                docMeetingLocationEl.value = meetingLocationEl.value;
            }
        }
        window.updateMeetingFields = updateMeetingFields;

        // 기존 버튼 방식은 제거됨 - 이제 모달 방식으로 작동
        // 참석자 추가 버튼
        if (addAttendeeBtn) {
            addAttendeeBtn.addEventListener('click', function() {
                if (attendees.length >= 10) {
                    showWarning('최대 10명까지만 추가할 수 있습니다.');
                    return;
                }
                attendees.push({ dept: '', position: '', name: '', isExternal: false });
                updateAttendeeList();
            });
        }

        // 회의 참석자 제거 버튼
        if (removeAttendeeBtn) {
            removeAttendeeBtn.addEventListener('click', function() {
                const checkboxes = document.querySelectorAll('.attendee-checkbox:checked');
                if (checkboxes.length === 0) {
                    showWarning('제거할 참석자를 선택해주세요.');
                    return;
                }

                const indicesToRemove = Array.from(checkboxes)
                    .map(cb => parseInt(cb.getAttribute('data-index')))
                    .sort((a, b) => b - a);

                indicesToRemove.forEach(index => {
                    attendees.splice(index, 1);
                });

                updateAttendeeList();
            });
        }

        // 과제명 자동 채우기
        if (commonProject) {
            commonProject.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-project').forEach(field => {
                    if (field.tagName === 'INPUT') { field.value = value; }
                    else { field.textContent = value; }
                    if (value && value.length > 35) { field.style.fontSize = '8px'; }
                    else if (value && value.length > 25) { field.style.fontSize = '9px'; }
                    else if (value && value.length > 15) { field.style.fontSize = '10px'; }
                    else { field.style.fontSize = ''; }
                });
            });
        }

        // 작성자 자동 채우기
        if (commonAuthor) {
            commonAuthor.addEventListener('input', function() {
                updateMeetingFields();
            });
        }

        // 출장지 자동 채우기
        if (commonLocation) {
            commonLocation.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-location').forEach(field => {
                    // input 요소면 value 속성, 아니면 textContent 설정
                    if (field.tagName === 'INPUT') {
                        field.value = value;
                        field.style.fontSize = value.length > 15 ? '10px' : '';
                    } else {
                        field.textContent = value;
                    }
                });
            });
        }

        // 회의 장소 자동 채우기 (회의록 문서 - 회의-0)
        const commonMeetingLocationEl = document.getElementById('common_meeting_location');
        if (commonMeetingLocationEl) {
            commonMeetingLocationEl.addEventListener('input', function() {
                updateMeetingFields();
                validateRequiredFields();
            });
        }

        // 날짜별 비용 입력 행 생성 함수
        function generateDailyExpenseRows() {
            if (!commonDate || !commonDate.value || !dailyExpenseBody) return;

            const startDate = new Date(commonDate.value);
            const duration = parseInt(commonDuration ? commonDuration.value : '0');
            const days = duration + 1; // 당일(0박) = 1일, 1박 = 2일

            // 기존 입력값 스냅샷 보존 (박수 변경 시 날짜별 금액 유지)
            const prevExpenses = dailyExpenses.slice();

            // 기존 데이터 초기화
            dailyExpenses = [];
            dailyExpenseBody.innerHTML = '';

            // 당일출장 여부 - 숙박비 열 표시 제어
            const isDayTrip = (duration === 0);
            const lodgingTh = document.querySelector('#dailyExpenseTable thead tr:nth-child(2) th:nth-child(3)');
            if (lodgingTh) lodgingTh.style.display = isDayTrip ? 'none' : '';
            const lodgingFootTd = document.querySelector('#dailyExpenseTable tfoot tr td:nth-child(3)');
            if (lodgingFootTd) lodgingFootTd.style.display = isDayTrip ? 'none' : '';
            const titleTh = document.querySelector('#dailyExpenseTable thead tr:first-child th');
            if (titleTh) titleTh.colSpan = isDayTrip ? 4 : 5;
            // 4분할/5분할 너비 재조정
            const colHeaders = document.querySelectorAll('#dailyExpenseTable thead tr:nth-child(2) th');
            if (isDayTrip) {
                // 날짜 20%, 나머지 3개 각 26.67%
                colHeaders[0].style.width = '20%';
                colHeaders[1].style.width = '26.67%';
                colHeaders[3].style.width = '26.67%';
                colHeaders[4].style.width = '26.67%';
            } else {
                colHeaders[0].style.width = '15%';
                colHeaders[1].style.width = '20%';
                colHeaders[2].style.width = '20%';
                colHeaders[3].style.width = '20%';
                colHeaders[4].style.width = '20%';
            }

            // 날짜별 행 생성
            for (let i = 0; i < days; i++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(currentDate.getDate() + i);

                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                const dateStr = `${year}.${month}.${day}`;

                // 이전 값 복원 (박수 변경 시 기존 입력 유지)
                const prev = prevExpenses[i] || {};

                dailyExpenses.push({
                    date: dateStr,
                    transport: prev.transport || 0,
                    lodging:   prev.lodging   || 0,
                    meal:      0, // 출장+회의 규정: 회의비 사용 시 식비 불가
                    other:     0  // 출장+회의 규정: 회의비 사용 시 일비 불가
                });

                const fmt = v => (v && v > 0) ? v.toLocaleString('ko-KR') : '';
                const lodgingCell = isDayTrip
                    ? `<td style="display:none;"><input type="text" inputmode="numeric" class="expense-input" data-index="${i}" data-type="lodging" placeholder="0" value="${fmt(prev.lodging)}"></td>`
                    : `<td><input type="text" inputmode="numeric" class="expense-input" data-index="${i}" data-type="lodging" placeholder="0" value="${fmt(prev.lodging)}"></td>`;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${dateStr}</td>
                    <td><input type="text" inputmode="numeric" class="expense-input" data-index="${i}" data-type="transport" placeholder="0" value="${fmt(prev.transport)}"></td>
                    ${lodgingCell}
                    <td class="expense-restricted"><input type="text" class="expense-input" data-index="${i}" data-type="meal" placeholder="-" disabled></td>
                    <td class="expense-restricted"><input type="text" class="expense-input" data-index="${i}" data-type="other" placeholder="-" disabled></td>
                `;
                dailyExpenseBody.appendChild(row);
            }

            // 입력 이벤트 리스너 추가
            document.querySelectorAll('.expense-input').forEach(input => {
                input.addEventListener('input', function() {
                    // 숫자 외 문자(대시, 음수기호 포함) 제거
                    let raw = this.value.replace(/[^\d]/g, '');
                    const numeric = parseInt(raw) || 0;
                    // 콤마 포매팅
                    this.value = raw === '' ? '' : numeric.toLocaleString('ko-KR');

                    const index = parseInt(this.getAttribute('data-index'));
                    const type = this.getAttribute('data-type');
                    dailyExpenses[index][type] = numeric;
                    updateTotalExpenses();
                    if (typeof validateRequiredFields === 'function') validateRequiredFields();
                });
                // 붙여넣기도 처리
                input.addEventListener('paste', function(e) {
                    e.preventDefault();
                    const pasted = (e.clipboardData || window.clipboardData).getData('text');
                    const numeric = parseInt(pasted.replace(/[^\d]/g, '')) || 0;
                    this.value = numeric > 0 ? numeric.toLocaleString('ko-KR') : '';
                    this.dispatchEvent(new Event('input'));
                });
            });

            updateTotalExpenses();
        }

        // 합계 업데이트 함수
        function addExpenseGuideRow() {
            if (!dailyExpenseBody) return;

            const existingGuide = dailyExpenseBody.querySelector('.expense-guide-row');
            if (existingGuide) existingGuide.remove();

            if (!tripPersons || tripPersons.length === 0) return;

            let totalMealGuide = 0;
            let totalDailyGuide = 0;
            let internalPersonCount = 0;

            tripPersons.forEach(person => {
                if (person.type !== 'external') {
                    internalPersonCount++;
                    const { meal, daily } = getPersonExpense(person);
                    totalMealGuide  += meal;
                    totalDailyGuide += daily;
                }
            });

            const transportGuide = internalPersonCount * 100000;
            const lodgingGuide   = internalPersonCount * 100000;

            const duration = parseInt(commonDuration ? commonDuration.value : '0');
            const isDayTrip = (duration === 0);
            const lodgingCell = isDayTrip
                ? `<td style="display:none; text-align: center; color: #1e40af; font-weight: 600;">${lodgingGuide.toLocaleString()}원</td>`
                : `<td style="text-align: center; color: #1e40af; font-weight: 600;">${lodgingGuide.toLocaleString()}원</td>`;

            const guideRow = document.createElement('tr');
            guideRow.className = 'expense-guide-row';
            guideRow.style.backgroundColor = '#f0f9ff';
            guideRow.style.borderTop = '2px solid #3b82f6';
            guideRow.innerHTML = `
                <td style="text-align: center; font-weight: 600; color: #1e40af; padding: 10px;">
                    1일 기준 인원 금액
                    <i class="fas fa-info-circle" style="color: #64748b; cursor: help; font-size: 0.9em; margin-left: 8px;"
                       data-tip="선택한 출장인원 기준으로 산정된 1일당 최대 사용가능 비용입니다"></i>
                </td>
                <td style="text-align: center; color: #1e40af; font-weight: 600;">${transportGuide.toLocaleString()}원</td>
                ${lodgingCell}
                <td style="text-align: center; color: #1e40af; font-weight: 600;">${totalMealGuide.toLocaleString()}원</td>
                <td style="text-align: center; color: #1e40af; font-weight: 600;">${totalDailyGuide.toLocaleString()}원</td>
            `;

            dailyExpenseBody.insertBefore(guideRow, dailyExpenseBody.firstChild);
        }

        // 각 항목의 1일 최대 허용 금액 반환
        function getExpenseLimits() {
            let totalMealGuide = 0;
            let totalDailyGuide = 0;
            let internalPersonCount = 0;
            tripPersons.forEach(person => {
                if (person.type !== 'external') {
                    internalPersonCount++;
                    const { meal, daily } = getPersonExpense(person);
                    totalMealGuide  += meal;
                    totalDailyGuide += daily;
                }
            });
            return {
                transport: internalPersonCount * 100000,
                lodging:   internalPersonCount * 100000,
                meal:      totalMealGuide,
                other:     totalDailyGuide
            };
        }
        window.getExpenseLimits = getExpenseLimits;

        // 초과 입력 시 빨간색 표시
        function validateExpenseInputColors() {
            const limits = getExpenseLimits();
            document.querySelectorAll('.expense-input').forEach(input => {
                const type  = input.getAttribute('data-type');
                const limit = limits[type] || 0;
                const val   = parseInt(input.value.replace(/[^\d]/g, '')) || 0;
                if (limit > 0 && val > limit) {
                    input.style.color       = '#dc2626';
                    input.style.borderColor = '#dc2626';
                    input.style.fontWeight  = '700';
                } else {
                    input.style.color       = '';
                    input.style.borderColor = '';
                    input.style.fontWeight  = '';
                }
            });
        }

        function updateTotalExpenses() {
            addExpenseGuideRow();
            let totalTransport = 0;
            let totalLodging = 0;
            let totalMeal = 0;
            let totalOther = 0;

            dailyExpenses.forEach(expense => {
                totalTransport += expense.transport;
                totalLodging += expense.lodging;
                totalMeal += expense.meal;
                totalOther += expense.other;
            });

            const tripTotal = totalTransport + totalLodging + totalMeal + totalOther;

            // 회의비 계산 (회의 참석 내부인원 + 외부 참석자 합산)
            let totalMeetingExpense = 0;
            meetingTripPersons.forEach(p => { totalMeetingExpense += getPersonMeetingExpense(p); });
            attendees.forEach(p => { totalMeetingExpense += getPersonMeetingExpense(p); });

            // 회의 날짜 (yyyy-MM-dd → yyyy.MM.dd, dailyExpenses.date 포맷과 일치)
            const meetingDateRaw = document.getElementById('common_meeting_date')?.value;
            const meetingDateDot = meetingDateRaw ? meetingDateRaw.replace(/-/g, '.') : null;

            const grandTotal = tripTotal + totalMeetingExpense;

            // 합계 표시 (공통 입력칸)
            const tTransport = document.getElementById('totalTransport');
            const tLodging = document.getElementById('totalLodging');
            const tMeal = document.getElementById('totalMeal');
            const tOther = document.getElementById('totalOther');
            if (tTransport) tTransport.textContent = totalTransport.toLocaleString();
            if (tLodging) tLodging.textContent = totalLodging.toLocaleString();
            if (tMeal) tMeal.textContent = totalMeal.toLocaleString();
            if (tOther) tOther.textContent = totalOther.toLocaleString();

            // 품의서 소요경비 내역 - 인원별 max 허용 경비 기준
            // 교통비·숙박비: 내부인원 × 100,000원 / 식비·일비: tripPersons × 직급별 설정값
            const proposalInternalCount = tripPersons.filter(p => p.type !== 'external').length;
            const maxTransportPerDay = proposalInternalCount * 100000;
            const maxLodgingPerDay   = proposalInternalCount * 100000;
            const maxMealPerDay = tripPersons.reduce((sum, p) => sum + getPersonExpense(p).meal, 0);
            const maxDailyPerDay = tripPersons.reduce((sum, p) => sum + getPersonExpense(p).daily, 0);
            const proposalDays = dailyExpenses.length;
            const proposalGrandTotal = (maxTransportPerDay + maxLodgingPerDay + maxMealPerDay + maxDailyPerDay) * proposalDays + totalMeetingExpense;

            // 품의서 합계 (예상 max 금액 기준)
            document.querySelectorAll('.auto-grand-total').forEach(field => {
                field.textContent = proposalGrandTotal.toLocaleString();
            });

            const proposalExpenseBody = document.getElementById('proposalExpenseBody');
            if (proposalExpenseBody) {
                proposalExpenseBody.innerHTML = '';
                dailyExpenses.forEach((expense) => {
                    const hasMeeting = !!(meetingDateDot && expense.date === meetingDateDot && totalMeetingExpense > 0);
                    const meetingFeeForDay = hasMeeting ? totalMeetingExpense : 0;
                    const dayTotal = maxTransportPerDay + maxLodgingPerDay + maxMealPerDay + maxDailyPerDay + meetingFeeForDay;
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td style="text-align: center; padding: 10px;">${expense.date}</td>
                        <td style="text-align: center; padding: 10px;">${maxTransportPerDay.toLocaleString()}</td>
                        <td style="text-align: center; padding: 10px;">${maxLodgingPerDay.toLocaleString()}</td>
                        <td style="text-align: center; padding: 10px;">${maxMealPerDay.toLocaleString()}</td>
                        <td style="text-align: center; padding: 10px;">${maxDailyPerDay.toLocaleString()}</td>
                        <td style="text-align: center; padding: 10px; ${hasMeeting ? 'color:#c2410c; font-weight:500;' : 'color:#aaa;'}">${hasMeeting ? meetingFeeForDay.toLocaleString() : '-'}</td>
                        <td style="text-align: center; padding: 10px; font-weight: 600;">${dayTotal.toLocaleString()}</td>
                    `;
                    proposalExpenseBody.appendChild(row);
                });
            }

            // 복명서 실집행금액: 사용자 입력 출장비 합계 + common_amount (실제 회의비 입력값)
            const commonAmountValue = parseInt((document.getElementById('common_amount')?.value || '0').replace(/,/g, '')) || 0;

            // 복명서 정산 세부내역에 날짜별 행 생성 (회의비 행 포함)
            const reportExpenseBody = document.getElementById('reportExpenseBody');
            if (reportExpenseBody) {
                reportExpenseBody.innerHTML = '';

                // rowspan: 각 날짜 4행 기본 + 회의 날짜에 1행 추가 + 헤더 1행
                const meetingDayCount = (meetingDateDot && commonAmountValue > 0)
                    ? dailyExpenses.filter(e => e.date === meetingDateDot).length
                    : 0;
                const rowspan = dailyExpenses.length * 4 + meetingDayCount + 1;

                const headerRow = document.createElement('tr');
                headerRow.innerHTML = `
                    <th colspan="1" rowspan="${rowspan}">정산<br>세부내역</th>
                    <th>날짜</th>
                    <th colspan="3" style="text-align: center; background: #fafafa;">구분</th>
                    <td style="text-align: center; font-weight: bold;">금액</td>
                `;
                reportExpenseBody.appendChild(headerRow);

                // 날짜별 상세 내역
                dailyExpenses.forEach((expense) => {
                    const hasMeeting = !!(meetingDateDot && expense.date === meetingDateDot && commonAmountValue > 0);
                    const rowsForDay = hasMeeting ? 5 : 4;

                    // 교통비
                    const transportRow = document.createElement('tr');
                    transportRow.innerHTML = `
                        <td rowspan="${rowsForDay}" style="text-align: center; background: white; font-weight: 500; vertical-align: middle;">${expense.date}</td>
                        <td colspan="3" style="background: white; padding: 8px; text-align: center">교통비</td>
                        <td style="text-align: center; padding: 8px; background: white;">${expense.transport.toLocaleString()}원</td>
                    `;
                    reportExpenseBody.appendChild(transportRow);

                    // 숙박비
                    const lodgingRow = document.createElement('tr');
                    lodgingRow.innerHTML = `
                        <td colspan="3" style="background: white; padding: 8px; text-align: center">숙박비</td>
                        <td style="text-align: center; padding: 8px;">${expense.lodging.toLocaleString()}원</td>
                    `;
                    reportExpenseBody.appendChild(lodgingRow);

                    // 식비
                    const mealRow = document.createElement('tr');
                    mealRow.innerHTML = `
                        <td colspan="3" style="background: white; padding: 8px; text-align: center">식비</td>
                        <td style="text-align: center; padding: 8px;">${expense.meal.toLocaleString()}원</td>
                    `;
                    reportExpenseBody.appendChild(mealRow);

                    // 기타(일비)
                    const otherRow = document.createElement('tr');
                    otherRow.innerHTML = `
                        <td colspan="3" style="background: white; padding: 8px; text-align: center">기타(일비)</td>
                        <td style="text-align: center; padding: 8px;">${expense.other.toLocaleString()}원</td>
                    `;
                    reportExpenseBody.appendChild(otherRow);

                    // 회의비 (회의 날짜에만, 실제 입력금액 표시)
                    if (hasMeeting) {
                        const meetingRow = document.createElement('tr');
                        meetingRow.innerHTML = `
                            <td colspan="3" style="background: white; padding: 8px; text-align: center;">회의비</td>
                            <td style="text-align: center; padding: 8px;">${commonAmountValue.toLocaleString()}원</td>
                        `;
                        reportExpenseBody.appendChild(meetingRow);
                    }
                });

                // 일수에 따라 복명서 레이아웃 동적 축소
                adjustReportLayout(dailyExpenses.length);
            }
            const actualTotal = tripTotal + commonAmountValue;

            // 복명서 출장신청금액: 최대 허용 경비 합계 (품의 기준)
            // 복명서 차액: 출장신청금액 - 실집행금액
            const difference = proposalGrandTotal - actualTotal;

            document.querySelectorAll('.auto-request-amount').forEach(field => {
                field.textContent = proposalGrandTotal.toLocaleString();
            });
            document.querySelectorAll('.auto-total').forEach(field => {
                field.textContent = actualTotal.toLocaleString();
            });
            document.querySelectorAll('.auto-difference').forEach(field => {
                field.textContent = difference.toLocaleString();
            });

            // 초과 입력 색상 갱신 (인원 변경 시에도 재검증)
            validateExpenseInputColors();
        }

        // 출장 날짜 목록으로 회의 일자 selectbox 업데이트
        function updateMeetingDateSelect() {
            if (!commonDate || !commonDate.value) return;

            const startDate = new Date(commonDate.value);
            const duration = parseInt(commonDuration ? commonDuration.value : '0');
            const days = ['일', '월', '화', '수', '목', '금', '토'];

            // 날짜 옵션 생성 헬퍼
            function buildDateOptions(sel) {
                if (!sel) return;
                const prevVal = sel.value;
                sel.innerHTML = '';
                for (let i = 0; i <= duration; i++) {
                    const d = new Date(startDate);
                    d.setDate(d.getDate() + i);
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const day = days[d.getDay()];
                    const val = `${yyyy}-${mm}-${dd}`;
                    const opt = document.createElement('option');
                    opt.value = val;
                    opt.textContent = `${yyyy}.${mm}.${dd} (${day})`;
                    sel.appendChild(opt);
                }
                if (prevVal && [...sel.options].some(o => o.value === prevVal)) sel.value = prevVal;
            }

            // 회의-0 + 추가 회의 블록 날짜 셀렉트 모두 업데이트
            buildDateOptions(document.getElementById('common_meeting_date'));
            extraMeetings.forEach(m => {
                buildDateOptions(document.getElementById(`meeting_date_${m.idx}`));
            });
        }

        async function updateTripDateRange() {
            if (!commonDate || !commonDate.value) return;

            const startDate = new Date(commonDate.value);
            const duration = parseInt(commonDuration ? commonDuration.value : '0');

            const [year, month, day] = commonDate.value.split('-');

            let dateRangeText = '';
            if (duration === 0) {
                // 당일
                dateRangeText = `${year}.${month}.${day}`;
            } else {
                // 1박 이상
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + duration);

                const endYear = endDate.getFullYear();
                const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
                const endDay = String(endDate.getDate()).padStart(2, '0');

                dateRangeText = `${year}.${month}.${day} ~ ${endYear}.${endMonth}.${endDay}`;
            }

            // 출장기간 표시
            document.querySelectorAll('.auto-date').forEach(field => {
                field.textContent = dateRangeText;
            });

            // 출장복명서 출장기간
            document.querySelectorAll('.auto-date-range').forEach(field => {
                field.textContent = dateRangeText;
            });

            // 소요경비내역 일시 (시작일만)
            const dateDotFormatted = `${year}.${month}.${day}`;
            document.querySelectorAll('.auto-date-dot').forEach(field => {
                field.textContent = dateDotFormatted;
            });

            // 회의일시 표시 (YYYY.MM.DD 형식)
            document.querySelectorAll('.auto-meeting-date').forEach(field => {
                field.textContent = dateDotFormatted;
            });

            // 작성일 계산 (출장기간 -1일, 주말 제외)
            const tripDateObj = new Date(commonDate.value);
            const dayOfWeek = tripDateObj.getDay();

            let writeDate = new Date(tripDateObj);
            if (dayOfWeek === 1) { // 월요일이면 -3일 (금요일)
                writeDate.setDate(writeDate.getDate() - 3);
            } else if (dayOfWeek === 0) { // 일요일이면 -2일 (금요일)
                writeDate.setDate(writeDate.getDate() - 2);
            } else {
                writeDate.setDate(writeDate.getDate() - 1);
            }

            const writeYear = writeDate.getFullYear();
            const writeMonth = String(writeDate.getMonth() + 1).padStart(2, '0');
            const writeDay = String(writeDate.getDate()).padStart(2, '0');
            const writeFormatted = `${writeYear} 년 ${writeMonth} 월 ${writeDay} 일`;

            document.querySelectorAll('.auto-write-date').forEach(field => {
                field.textContent = writeFormatted;
            });

            // 품의서 작성날짜 입력 필드 연동 (default = writeDate, max = writeDate)
            const requisitionInput = document.getElementById('common_requisition_date');
            if (requisitionInput) {
                const writeDateStr = `${writeYear}-${writeMonth}-${writeDay}`;
                requisitionInput.value = writeDateStr;
                requisitionInput.max = writeDateStr;
            }

            // 날짜별 비용 입력 테이블 생성 (동기 — await 이전에 실행해야 복원 로직과 순서 보장)
            generateDailyExpenseRows();

            // 복명일자 계산 (출장 종료일 다음 영업일) — 공휴일 API 비동기 호출
            let tripEndDate = new Date(startDate);
            if (duration > 0) {
                tripEndDate.setDate(tripEndDate.getDate() + duration);
            }
            const reportDate = await getNextBusinessDay(tripEndDate);

            const reportYear = reportDate.getFullYear();
            const reportMonth = String(reportDate.getMonth() + 1).padStart(2, '0');
            const reportDay = String(reportDate.getDate()).padStart(2, '0');

            document.querySelectorAll('.auto-report-year').forEach(field => {
                field.textContent = reportYear;
            });
            document.querySelectorAll('.auto-report-month').forEach(field => {
                field.textContent = reportMonth.replace(/^0/, '');
            });
            document.querySelectorAll('.auto-report-day').forEach(field => {
                field.textContent = reportDay.replace(/^0/, '');
            });

            // 회의 날짜 selectbox 업데이트
            updateMeetingDateSelect();

            // 출장 기간 변경 시 현재 작성자/출장인원 겹침 재검증
            revalidateAuthorAfterTripDateChange();
        }

        // 출장 기간 변경 후 작성자/출장인원 겹침 재검증
        async function revalidateAuthorAfterTripDateChange() {
            if (isPopulatingForm) return; // 데이터 로드 중에는 재검증 차단
            const projectIdx = document.getElementById('selectedProjectIdx')?.value;
            if (!projectIdx || !commonDate?.value) return;

            // 수정 페이지에서는 현재 문서 자체를 중복 검사에서 제외
            const excludeIdx = getUrlParameter('documentIdx') || getUrlParameter('id') || null;

            // ── 작성자 재검증 ──
            if (authorPersonId) {
                const isDup = await checkTripPersonConflicts(authorPersonId, projectIdx, excludeIdx);
                if (isDup) {
                    // 현재 작성자 겹침 → 재선택: 1순위 로그인 사용자, 2순위 직급 기반
                    const persons = getAuthorPersons();
                    let newAuthor = null;

                    // 1순위: 로그인 사용자
                    const loggedInUserIdx = window.CURRENT_USER?.idx;
                    if (loggedInUserIdx) {
                        const loggedIn = persons.find(p => String(p.id) === String(loggedInUserIdx));
                        if (loggedIn) {
                            const loggedInDup = await checkTripPersonConflicts(loggedIn.id, projectIdx, excludeIdx);
                            if (!loggedInDup) newAuthor = loggedIn;
                        }
                    }

                    // 2순위: 직급 기반
                    if (!newAuthor) {
                        const sorted = sortByPositionAsc(persons);
                        for (const p of sorted) {
                            const dup = await checkTripPersonConflicts(p.id, projectIdx, excludeIdx);
                            if (!dup) { newAuthor = p; break; }
                        }
                    }

                    authorPersonId = null;
                    const authorField = document.getElementById('common_author');
                    if (authorField) authorField.value = '';
                    if (newAuthor && window.setAuthorInTemplate) {
                        window.setAuthorInTemplate(newAuthor);
                    }
                }
            }

            // ── 출장인원 중 겹치는 인원 제거 ──
            if (tripPersons.length > 0) {
                const dupChecks = await Promise.all(
                    tripPersons.map(p => checkTripPersonConflicts(p.id, projectIdx, excludeIdx))
                );
                const valid = tripPersons.filter((_, i) => !dupChecks[i]);
                if (valid.length !== tripPersons.length && window.replaceTripPersons) {
                    window.replaceTripPersons(valid);
                }
            }

            // ── 회의 외부 참석자 초기화 (날짜 변경 시 중복검증 불가 → 전체 초기화) ──
            // meeting-0
            if (attendees.length > 0) {
                attendees = [];
                renderAttendeeListInTemplate();
            }
            // 추가 회의 블록
            extraMeetings.forEach(m => {
                if (m.attendees.length > 0) {
                    m.attendees = [];
                    renderExtraMeetingAttendees(m.idx);
                }
            });
            // 회의 작성자 → 출장 작성자와 동기화 (출장 작성자가 없으면 초기화)
            const finalAuthorName = document.getElementById('common_author')?.value || '';
            meetingAuthorPersonId = authorPersonId || null;
            const mtgAuthorField = document.getElementById('common_meeting_author');
            if (mtgAuthorField) mtgAuthorField.value = finalAuthorName;
            extraMeetings.forEach(m => {
                m.authorPersonId = authorPersonId || null;
                const f = document.getElementById(`meeting_author_${m.idx}`);
                if (f) f.value = finalAuthorName;
            });
        }

        // 출장 날짜/기간 변경 전 확인 (수정 모드 + 출장인원 있을 때)
        async function confirmTripDateChangeIfNeeded(revertFn) {
            if (!!(getUrlParameter('documentIdx') || getUrlParameter('id')) && tripPersons.length > 0) {
                const confirmed = await showConfirm(
                    '날짜/기간 변경 시 출장과 회의 작성자 및 참석인원이<br>모두 초기화 됩니다.<br>(참석인원 중복 등록 방지)<br>계속하시겠습니까?',
                    '출장 기간 변경',
                    { icon: 'warning', confirmText: '변경', cancelText: '취소' }
                );
                if (!confirmed) { revertFn(); return false; }
            }
            return true;
        }

        // 출장 날짜/기간 변경 → 날짜별 비용 테이블 재생성
        if (commonDate) {
            let prevDateValue = commonDate.value;
            commonDate.addEventListener('focus', function() { prevDateValue = this.value; });
            commonDate.addEventListener('change', async function() {
                const ok = await confirmTripDateChangeIfNeeded(() => { commonDate.value = prevDateValue; });
                if (!ok) return;
                prevDateValue = this.value;
                await updateTripDateRange();
                updateMeetingFields();
                // 출장 날짜 변경 시 참여기간 재검증 (출장 작성자/인원 + 회의별)
                if (!isPopulatingForm) await revalidateRtmAgainstDates();
                // meeting_date가 프로그램적으로 채워졌을 수 있으므로 작성자 재검증
                if (!isPopulatingForm) await setDefaultAuthor();
            });
            commonDate.addEventListener('click', function() {
                if (this.showPicker) { try { this.showPicker(); } catch(e) {} }
            });
        }
        if (commonDuration) {
            let prevDurationValue = commonDuration.value;
            commonDuration.addEventListener('focus', function() { prevDurationValue = this.value; });
            commonDuration.addEventListener('change', async function() {
                const ok = await confirmTripDateChangeIfNeeded(() => { commonDuration.value = prevDurationValue; });
                if (!ok) return;
                prevDurationValue = this.value;
                await updateTripDateRange();
                // 기간 변경 시 참여기간 재검증
                if (!isPopulatingForm) await revalidateRtmAgainstDates();
                if (!isPopulatingForm) await setDefaultAuthor();
            });
        }

        // 회의 일자 변경 → 문서 자동채우기 (출장 날짜와 독립)
        const meetingDateInput = document.getElementById('common_meeting_date');
        if (meetingDateInput) {
            meetingDateInput.addEventListener('change', function() {
                updateMeetingFields();
                updateTotalExpenses();
            });
        }

        // 출장목적 자동 채우기
        // (이미 위에서 commonPurpose 이벤트 리스너 추가됨 - updateMeetingFields 호출)

        // 복명자 초기값 설정 (작성자와 동일하게)
        // updateMeetingFields에서 자동으로 복명자도 업데이트됨

        // 회의 날짜·시간 변경 시 기본 작성자 재설정 + 1번째 회의 참석자 초기화
        const meetingDateEl = document.getElementById('common_meeting_date');
        const startTimeEl = document.getElementById('common_start_time');
        const endTimeEl = document.getElementById('common_end_time');

        [meetingDateEl, startTimeEl, endTimeEl].forEach(el => {
            if (el) el.addEventListener('change', async function() {
                setDefaultAuthor();
                // 1번째 회의 참석자 초기화 (중복 방지, 데이터 로드 중에는 스킵)
                if (!isPopulatingForm && attendees.length > 0) {
                    attendees = [];
                    renderAttendeeListInTemplate();
                    Swal.fire({
                        icon: 'info',
                        title: '참석자 초기화',
                        text: '회의 일자/시간 변경으로 참석자가 초기화되었습니다.',
                        confirmButtonText: '확인',
                        confirmButtonColor: '#667eea',
                        timer: 3000,
                        timerProgressBar: true
                    });
                }
                // 회의 날짜 변경 시 참여기간 재검증 (회의 작성자/참석자)
                if (!isPopulatingForm && el === meetingDateEl) {
                    await revalidateRtmAgainstDates();
                }
            });
        });
        [startTimeEl, endTimeEl].forEach(el => {
            if (el) el.addEventListener('change', function() { updateMeetingFields(); });
        });

        // 회의 내용 바이트 카운터
        const MIN_MEETING_CONTENT_BYTES = 400;
        function getMeetingContentBytes() {
            return new TextEncoder().encode(commonMeetingContent ? (commonMeetingContent.value || '') : '').length;
        }
        function updateMeetingContentByteCounter() {
            const statusEl = document.getElementById('meetingContentByteStatus');
            if (!statusEl || !commonMeetingContent) return;
            const bytes = getMeetingContentBytes();
            if (bytes === 0) {
                statusEl.className = '';
                statusEl.textContent = '';
                return;
            }
            if (bytes >= MIN_MEETING_CONTENT_BYTES) {
                statusEl.className = 'byte-status-sufficient';
                statusEl.textContent = `✓ 조건 충족 · ${bytes} bytes 입력됨`;
            } else {
                statusEl.className = 'byte-status-insufficient';
                statusEl.textContent = `최소 ${MIN_MEETING_CONTENT_BYTES} bytes 필요 · 현재 ${bytes} bytes (${MIN_MEETING_CONTENT_BYTES - bytes} bytes 부족)`;
            }
        }

        // 회의 관련 입력 필드 이벤트 리스너
        if (commonMeetingContent) {
            commonMeetingContent.addEventListener('input', function() {
                updateMeetingFields();
                updateMeetingContentByteCounter();
            });
        }

        if (commonPurpose) {
            commonPurpose.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-purpose').forEach(field => {
                    field.textContent = value;
                });
                updateMeetingFields();
            });
        }

        if (commonMeetingPurpose) {
            commonMeetingPurpose.addEventListener('input', function() {
                document.querySelectorAll('.auto-subject').forEach(field => {
                    field.textContent = this.value;
                });
            });
        }

        // 사용 금액(회의비) 변경 시 복명서 실집행금액·차액 재계산 + 초과 경고
        const commonAmountEl = document.getElementById('common_amount');
        if (commonAmountEl) {
            commonAmountEl.addEventListener('input', function() {
                updateTotalExpenses();
                validateMeetingAmount();
            });
        }

        function validateMeetingAmount() { validateMeetingAmountForBlock(null); }

        // 출장내용 및 결과 업데이트
        window.updateTripResult = function updateTripResult() {
            if (isPopulatingForm) return; // 데이터 로드 중에는 자동 덮어쓰기 차단
            const personNames = tripPersons.filter(p => p.name && p.name.trim()).map(p => p.name.trim());

            const attendeeLine = '- 참석인원 :' + (personNames.length > 0 ? ` ${personNames.join(', ')}(파인씨앤아이)` : '');
            const contentMarker = '\n- 출장 내용 :';

            if (commonTripResult) {
                if (!commonTripResult.dataset.userModified) {
                    // 사용자 미수정 — 전체 자동 생성
                    commonTripResult.value = attendeeLine + contentMarker;
                } else {
                    // 사용자 수정 후 — 참석인원 줄만 교체, 출장 내용 이후 보존
                    const cur = commonTripResult.value;
                    const idx = cur.indexOf('- 출장 내용 :');
                    const preserved = idx !== -1 ? cur.slice(idx - (cur[idx - 1] === '\n' ? 1 : 0)) : contentMarker;
                    commonTripResult.value = attendeeLine + preserved;
                }
            }

            // 복명서 반영
            const displayText = commonTripResult ? commonTripResult.value : attendeeLine + contentMarker;
            document.querySelectorAll('.auto-trip-result').forEach(field => {
                field.textContent = displayText.trimEnd();
            });
        }

        // 사용자가 직접 수정하면 자동 업데이트 중지
        if (commonTripResult) {
            commonTripResult.addEventListener('input', function() {
                this.dataset.userModified = 'true';
                // 수정된 내용을 복명서에 바로 반영
                document.querySelectorAll('.auto-trip-result').forEach(field => {
                    field.textContent = this.value.trimEnd();
                });
            });
        }

        // 초기 인원 설정
        tripPersons = [];
        renderTripPersonListInTemplate();

        // 초기 참석자 설정
        attendees = [];
        renderAttendeeListInTemplate();

        // 초기 날짜 설정
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        if (commonDate && !commonDate.value) commonDate.value = todayStr;
        updateTripDateRange(); // updateMeetingDateSelect()도 내부에서 호출됨
        updateMeetingFields();

        // 파일 업로드 이벤트 등록 (innerHTML 복사 후 새 요소에 등록해야 drag-drop 동작)
        const mReceiptInput = document.getElementById('meetingReceiptInput_0');
        const mReceiptList  = document.getElementById('meetingReceiptFileList_0');
        const mReceiptArea  = document.getElementById('meetingReceiptUploadArea_0');
        const mDocInput     = document.getElementById('meetingDocumentInput_0');
        const mDocList      = document.getElementById('meetingDocumentFileList_0');
        const mDocArea      = document.getElementById('meetingDocumentUploadArea_0');
        const tReceiptInput = document.getElementById('tripReceiptInput');
        const tReceiptList  = document.getElementById('tripReceiptFileList');
        const tReceiptArea  = document.getElementById('tripReceiptUploadArea');
        const tDocInput     = document.getElementById('tripDocumentInput');
        const tDocList      = document.getElementById('tripDocumentFileList');
        const tDocArea      = document.getElementById('tripDocumentUploadArea');

        const updMReceiptList  = makeUpdateFileList(mReceiptList,  selectedMeetingReceiptFiles,  'removeMeetingReceiptFile',
            () => existingMeetingReceiptAttachments.filter(a => a._sessionOrder === 0));
        const updMDocList      = makeUpdateFileList(mDocList,      selectedMeetingDocumentFiles, 'removeMeetingDocumentFile',
            () => existingMeetingDocumentAttachments.filter(a => a._sessionOrder === 0));
        const updTReceiptList  = makeUpdateFileList(tReceiptList,  selectedTripReceiptFiles,     'removeTripReceiptFile',
            () => existingTripReceiptAttachments);
        const updTDocList      = makeUpdateFileList(tDocList,      selectedTripDocumentFiles,    'removeTripDocumentFile',
            () => existingTripDocumentAttachments);

        setupUpload(mReceiptInput, mReceiptArea, selectedMeetingReceiptFiles,  updMReceiptList);
        setupUpload(mDocInput,     mDocArea,     selectedMeetingDocumentFiles, updMDocList);
        setupUpload(tReceiptInput, tReceiptArea, selectedTripReceiptFiles,     updTReceiptList);
        setupUpload(tDocInput,     tDocArea,     selectedTripDocumentFiles,    updTDocList);

        window.removeMeetingReceiptFile  = function(i) { selectedMeetingReceiptFiles.splice(i, 1);  updMReceiptList(); };
        window.removeMeetingDocumentFile = function(i) { selectedMeetingDocumentFiles.splice(i, 1); updMDocList(); };
        window.removeTripReceiptFile     = function(i) { selectedTripReceiptFiles.splice(i, 1);     updTReceiptList(); };
        window.removeTripDocumentFile    = function(i) { selectedTripDocumentFiles.splice(i, 1);    updTDocList(); };

        // 클립보드 paste 활성 블록 초기화 (트립 영수증을 기본 활성으로)
        if (typeof setupReceiptPasteForTripMeeting === 'function') {
            setupReceiptPasteForTripMeeting();
        }
    }

    // 파일 아이콘 헬퍼
    function getFileIcon(name) {
        if (name.match(/\.(jpg|jpeg|png|gif)$/i)) return 'fa-file-image';
        if (name.match(/\.(pdf)$/i)) return 'fa-file-pdf';
        if (name.match(/\.(doc|docx)$/i)) return 'fa-file-word';
        if (name.match(/\.(xls|xlsx)$/i)) return 'fa-file-excel';
        return 'fa-file';
    }

    // 업로드 영역 공통 셋업
    function setupUpload(input, area, filesArr, updateFn) {
        function processFiles(files) {
            const before = filesArr.length;
            Array.from(files).forEach(file => {
                if (filesArr.length >= 5) { showWarning('최대 5개까지만 첨부 가능합니다.'); return; }
                if (file.size > 10 * 1024 * 1024) { showWarning('파일 크기는 10MB를 초과할 수 없습니다.'); return; }
                filesArr.push(file);
            });
            updateFn();
            return filesArr.length - before;
        }
        // 클립보드 paste에서 area를 통해 processFiles를 재사용할 수 있도록 expando로 저장
        if (area) area._processPasteFiles = processFiles;
        input.addEventListener('change', function(e) { processFiles(e.target.files); input.value = ''; });
        area.addEventListener('dragover', function(e) { e.preventDefault(); area.style.borderColor = '#667eea'; area.style.background = '#f5f7ff'; });
        area.addEventListener('dragleave', function(e) { if (!area.contains(e.relatedTarget)) { area.style.borderColor = '#ddd'; area.style.background = 'white'; } });
        area.addEventListener('drop', function(e) { e.preventDefault(); area.style.borderColor = '#ddd'; area.style.background = 'white'; processFiles(e.dataTransfer.files); });
        // label이 area 전체를 덮고 있어 drag 이벤트가 label 위에서 발생하므로 label에도 직접 처리
        const label = area.querySelector('label');
        if (label) {
            label.addEventListener('dragover', function(e) { e.preventDefault(); area.style.borderColor = '#667eea'; area.style.background = '#f5f7ff'; });
            label.addEventListener('dragleave', function(e) { if (!area.contains(e.relatedTarget)) { area.style.borderColor = '#ddd'; area.style.background = 'white'; } });
            label.addEventListener('drop', function(e) { e.preventDefault(); e.stopPropagation(); area.style.borderColor = '#ddd'; area.style.background = 'white'; processFiles(e.dataTransfer.files); });
        }
    }

    function makeUpdateFileList(fileList, filesArr, removeFnName, existingAttsGetter) {
        return function() {
            if (typeof window.revokeChipThumbs === 'function') window.revokeChipThumbs(fileList);
            fileList.innerHTML = '';
            // 기존 첨부파일 (수정 모드)
            if (existingAttsGetter) {
                const atts = existingAttsGetter();
                atts.forEach(att => {
                    if (deletedAttachmentIds.includes(att.idx)) return;
                    const item = document.createElement('div');
                    item.className = 'file-item';
                    const sizeKB = att.fileSize ? `(${(att.fileSize / 1024).toFixed(1)} KB)` : '';
                    item.innerHTML = `
                        <i class="fas ${getFileIcon(att.originalFilename || '')}"></i>
                        <span>${att.originalFilename} ${sizeKB}</span>
                        <button class="btn-remove-file" onclick="removeExistingAttachment(${att.idx})" data-tip="삭제"><i class="fas fa-times"></i></button>
                    `;
                    if (typeof window.attachThumbToFileItem === 'function') {
                        window.attachThumbToFileItem(item, `/api/receipt-trip-meetings/attachments/${att.idx}/download`, att.originalFilename);
                    }
                    fileList.appendChild(item);
                });
            }
            // 신규 파일
            filesArr.forEach((file, index) => {
                const item = document.createElement('div');
                item.className = 'file-item';
                const badge = existingAttsGetter ? ' <span style="color:#667eea;font-size:11px;">[신규]</span>' : '';
                item.innerHTML = `
                    <i class="fas ${getFileIcon(file.name)}"></i>
                    <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)${badge}</span>
                    <button class="btn-remove-file" onclick="${removeFnName}(${index})"><i class="fas fa-times"></i></button>
                `;
                if (typeof window.attachThumbToFileItem === 'function') {
                    window.attachThumbToFileItem(item, file);
                }
                fileList.appendChild(item);
            });
        };
    }


    // ══════════════════════════════════════════════════════════════
    // 기존 첨부파일 표시/삭제 (수정 모드)
    // ══════════════════════════════════════════════════════════════

    function displayExistingAttachments(attachments, meetingSessions) {
        if (!attachments || attachments.length === 0) return;
        deletedAttachmentIds = [];

        existingTripReceiptAttachments = attachments.filter(a => a.attachmentType === 'TRIP_RECEIPT');
        existingTripDocumentAttachments = attachments.filter(a => a.attachmentType === 'TRIP_DOCUMENT');
        existingMeetingReceiptAttachments = attachments.filter(a => a.attachmentType === 'MEETING_RECEIPT');
        existingMeetingDocumentAttachments = attachments.filter(a => a.attachmentType === 'MEETING_DOCUMENT');

        // sessionIdx → displayOrder 매핑 (세션별 파일 구분) + 각 첨부파일에 _sessionOrder 태깅
        const sessionOrderMap = {};
        if (meetingSessions && meetingSessions.length > 0) {
            meetingSessions.forEach((s, i) => {
                if (s.sessionIdx) sessionOrderMap[s.sessionIdx] = i;
            });
        }
        [...existingMeetingReceiptAttachments, ...existingMeetingDocumentAttachments].forEach(a => {
            a._sessionOrder = (a.sessionIdx && sessionOrderMap[a.sessionIdx] !== undefined)
                ? sessionOrderMap[a.sessionIdx] : 0;
        });

        // 출장 파일 목록 렌더
        renderExistingFileList('tripReceiptFileList', existingTripReceiptAttachments, selectedTripReceiptFiles, 'removeTripReceiptFile');
        renderExistingFileList('tripDocumentFileList', existingTripDocumentAttachments, selectedTripDocumentFiles, 'removeTripDocumentFile');

        // 회의-0 파일 목록 렌더
        const m0ReceiptAtts = existingMeetingReceiptAttachments.filter(a => !a.sessionIdx || sessionOrderMap[a.sessionIdx] === 0);
        const m0DocumentAtts = existingMeetingDocumentAttachments.filter(a => !a.sessionIdx || sessionOrderMap[a.sessionIdx] === 0);
        renderExistingFileList('meetingReceiptFileList_0', m0ReceiptAtts, selectedMeetingReceiptFiles, 'removeMeetingReceiptFile');
        renderExistingFileList('meetingDocumentFileList_0', m0DocumentAtts, selectedMeetingDocumentFiles, 'removeMeetingDocumentFile');

        // 추가 회의 파일 목록 렌더
        extraMeetings.forEach((m, order) => {
            const sessionOrder = order + 1;
            const sessionIdxForOrder = Object.keys(sessionOrderMap).find(k => sessionOrderMap[k] === sessionOrder);
            const mReceiptAtts = existingMeetingReceiptAttachments.filter(a => a.sessionIdx && String(a.sessionIdx) === String(sessionIdxForOrder));
            const mDocumentAtts = existingMeetingDocumentAttachments.filter(a => a.sessionIdx && String(a.sessionIdx) === String(sessionIdxForOrder));
            // 기존 파일을 extraMeeting 상태에 저장 (렌더 시 참조용)
            m._existingReceiptAtts = mReceiptAtts;
            m._existingDocumentAtts = mDocumentAtts;
            renderExistingFileListForExtra(`meetingReceiptFileList_${m.idx}`, mReceiptAtts, m.receiptFiles, m.idx, 'receipt');
            renderExistingFileListForExtra(`meetingDocumentFileList_${m.idx}`, mDocumentAtts, m.documentFiles, m.idx, 'document');
        });
    }

    function renderExistingFileList(listElId, existingAtts, newFiles, removeFnName) {
        const listEl = document.getElementById(listElId);
        if (!listEl) return;
        if (typeof window.revokeChipThumbs === 'function') window.revokeChipThumbs(listEl);
        listEl.innerHTML = '';

        // 기존 파일 (삭제 예정 제외)
        existingAtts.forEach(att => {
            if (deletedAttachmentIds.includes(att.idx)) return;
            const item = document.createElement('div');
            item.className = 'file-item';
            const sizeKB = att.fileSize ? `(${(att.fileSize / 1024).toFixed(1)} KB)` : '';
            item.innerHTML = `
                <i class="fas ${getFileIcon(att.originalFilename || '')}"></i>
                <span>${att.originalFilename} ${sizeKB}</span>
                <button class="btn-remove-file" onclick="removeExistingAttachment(${att.idx})" data-tip="삭제"><i class="fas fa-times"></i></button>
            `;
            if (typeof window.attachThumbToFileItem === 'function') {
                window.attachThumbToFileItem(item, `/api/receipt-trip-meetings/attachments/${att.idx}/download`, att.originalFilename);
            }
            listEl.appendChild(item);
        });

        // 신규 파일
        newFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <i class="fas ${getFileIcon(file.name)}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB) <span style="color:#667eea;font-size:11px;">[신규]</span></span>
                <button class="btn-remove-file" onclick="${removeFnName}(${index})" data-tip="삭제"><i class="fas fa-times"></i></button>
            `;
            if (typeof window.attachThumbToFileItem === 'function') {
                window.attachThumbToFileItem(item, file);
            }
            listEl.appendChild(item);
        });
    }

    function renderExistingFileListForExtra(listElId, existingAtts, newFiles, meetingIdx, type) {
        const listEl = document.getElementById(listElId);
        if (!listEl) return;
        if (typeof window.revokeChipThumbs === 'function') window.revokeChipThumbs(listEl);
        listEl.innerHTML = '';

        existingAtts.forEach(att => {
            if (deletedAttachmentIds.includes(att.idx)) return;
            const item = document.createElement('div');
            item.className = 'file-item';
            const sizeKB = att.fileSize ? `(${(att.fileSize / 1024).toFixed(1)} KB)` : '';
            item.innerHTML = `
                <i class="fas ${getFileIcon(att.originalFilename || '')}"></i>
                <span>${att.originalFilename} ${sizeKB}</span>
                <button class="btn-remove-file" onclick="removeExistingAttachment(${att.idx})" data-tip="삭제"><i class="fas fa-times"></i></button>
            `;
            if (typeof window.attachThumbToFileItem === 'function') {
                window.attachThumbToFileItem(item, `/api/receipt-trip-meetings/attachments/${att.idx}/download`, att.originalFilename);
            }
            listEl.appendChild(item);
        });

        newFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <i class="fas ${getFileIcon(file.name)}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB) <span style="color:#667eea;font-size:11px;">[신규]</span></span>
                <button class="btn-remove-file" onclick="removeExtraMeetingFile(${meetingIdx},'${type}',${index})" data-tip="삭제"><i class="fas fa-times"></i></button>
            `;
            if (typeof window.attachThumbToFileItem === 'function') {
                window.attachThumbToFileItem(item, file);
            }
            listEl.appendChild(item);
        });
    }

    // 기존 첨부파일 삭제 (소프트 딜리트 예약)
    window.removeExistingAttachment = function(attIdx) {
        if (!deletedAttachmentIds.includes(attIdx)) {
            deletedAttachmentIds.push(attIdx);
        }
        // 전체 파일 목록 리렌더
        renderExistingFileList('tripReceiptFileList', existingTripReceiptAttachments, selectedTripReceiptFiles, 'removeTripReceiptFile');
        renderExistingFileList('tripDocumentFileList', existingTripDocumentAttachments, selectedTripDocumentFiles, 'removeTripDocumentFile');
        renderExistingFileList('meetingReceiptFileList_0',
            existingMeetingReceiptAttachments.filter(a => a._sessionOrder === 0),
            selectedMeetingReceiptFiles, 'removeMeetingReceiptFile');
        renderExistingFileList('meetingDocumentFileList_0',
            existingMeetingDocumentAttachments.filter(a => a._sessionOrder === 0),
            selectedMeetingDocumentFiles, 'removeMeetingDocumentFile');
        extraMeetings.forEach(m => {
            if (m._existingReceiptAtts) {
                renderExistingFileListForExtra(`meetingReceiptFileList_${m.idx}`, m._existingReceiptAtts, m.receiptFiles, m.idx, 'receipt');
            }
            if (m._existingDocumentAtts) {
                renderExistingFileListForExtra(`meetingDocumentFileList_${m.idx}`, m._existingDocumentAtts, m.documentFiles, m.idx, 'document');
            }
        });
    };

    // ══════════════════════════════════════════════════════════════
    // 다중 회의 상태 헬퍼
    // ══════════════════════════════════════════════════════════════
    function getExtraMtg(idx) { return extraMeetings.find(m => m.idx === idx); }
    function getMtgAttendees(idx) { return idx === 0 ? attendees : (getExtraMtg(idx)?.attendees || []); }
    function getMtgTripPersons(idx) { return idx === 0 ? meetingTripPersons : (getExtraMtg(idx)?.tripPersonsForMeeting || []); }
    function getMtgAuthorId(idx) { return idx === 0 ? meetingAuthorPersonId : (getExtraMtg(idx)?.authorPersonId || null); }
    function setMtgAttendees(idx, v) { if (idx === 0) attendees = v; else { const m = getExtraMtg(idx); if (m) m.attendees = v; } }
    function setMtgTripPersons(idx, v) { if (idx === 0) meetingTripPersons = v; else { const m = getExtraMtg(idx); if (m) m.tripPersonsForMeeting = v; } }
    function setMtgAuthorId(idx, v) { if (idx === 0) meetingAuthorPersonId = v; else { const m = getExtraMtg(idx); if (m) m.authorPersonId = v; } }

    // 추가 회의 참석자 렌더링
    function renderExtraMeetingAttendees(idx) {
        const m = getExtraMtg(idx);
        if (!m) return;
        const listEl = document.getElementById(`attendeeList_${idx}`);
        const countEl = document.getElementById(`attendeeCount_${idx}`);
        const totalEl = document.getElementById(`minutesMeetingExpenseTotal_${idx}`);
        if (!listEl) return;
        const internal = [...m.tripPersonsForMeeting];
        const external = [...m.attendees];
        if (internal.length === 0 && external.length === 0) {
            listEl.innerHTML = '<div class="empty-attendee-state"><i class="fas fa-user-plus"></i><div>외부 참석자를 추가해주세요</div></div>';
        } else {
            const html = [
                ...internal.map(p => {
                    const exp = getPersonMeetingExpense(p);
                    const expTag = exp > 0 ? `<span class="expense-tag">회의비 ${exp.toLocaleString()}원</span>` : '';
                    return `<div class="trip-person-item"><div class="trip-person-info"><span class="name">${p.name}</span><span>${p.dept}</span><span>${p.position}</span><span class="attendee-internal-badge"><i class="fas fa-building"></i> 내부</span>${expTag}</div></div>`;
                }),
                ...external.map(a => {
                    const exp = getPersonMeetingExpense(a);
                    const expTag = exp > 0 ? `<span class="expense-tag">회의비 ${exp.toLocaleString()}원</span>` : '';
                    return `<div class="trip-person-item"><div class="trip-person-info"><span class="name">${a.name}<span class="external-badge">외부</span></span><span>${a.dept}</span><span>${a.position}</span>${expTag}</div><button type="button" class="trip-person-remove attendee-remove" onclick="removeExtraMeetingAttendee(${idx},'${a.id}')"><i class="fas fa-times"></i> 제거</button></div>`;
                })
            ].join('');
            listEl.innerHTML = html;
        }
        if (countEl) {
            const total = internal.length + external.length;
            if (total > 0) {
                const parts = [];
                if (internal.length > 0) parts.push(`내부 ${internal.length}`);
                if (external.length > 0) parts.push(`외부 ${external.length}`);
                countEl.textContent = `총 ${total}명 (${parts.join(' · ')})`;
                countEl.style.display = 'inline-flex';
            } else { countEl.style.display = 'none'; }
        }
        if (totalEl) {
            let total = 0;
            internal.forEach(p => { total += getPersonMeetingExpense(p); });
            external.forEach(p => { total += getPersonMeetingExpense(p); });
            totalEl.textContent = total > 0 ? `${total.toLocaleString()}원` : '-';
        }
        // 금액 초과 재검증
        validateExtraMeetingAmount(idx);
    }

    // idx=null → 기본 회의(meeting-0), idx=number → 추가 회의
    function validateMeetingAmountForBlock(idx) {
        const amountId = idx == null ? 'common_amount'                : `meeting_amount_${idx}`;
        const totalId  = idx == null ? 'minutesMeetingExpenseTotal'   : `minutesMeetingExpenseTotal_${idx}`;
        const warnId   = idx == null ? 'amountExceedWarning'          : `amountExceedWarning_${idx}`;
        const amountEl = document.getElementById(amountId);
        const warnEl   = document.getElementById(warnId);
        if (!amountEl) return;
        const limitVal = parseInt((document.getElementById(totalId)?.textContent || '0').replace(/[^\d]/g, '')) || 0;
        const entered  = parseInt((amountEl.value || '0').replace(/[^\d]/g, '')) || 0;
        if (limitVal > 0 && entered > limitVal) {
            amountEl.style.borderColor = '#dc2626';
            amountEl.style.color       = '#dc2626';
            if (warnEl) {
                warnEl.textContent   = `참석자 금액 합계(${limitVal.toLocaleString()}원)를 초과했습니다.`;
                warnEl.style.display = 'block';
            }
        } else {
            amountEl.style.borderColor = '';
            amountEl.style.color       = '';
            if (warnEl) warnEl.style.display = 'none';
        }
    }
    function validateExtraMeetingAmount(idx) { validateMeetingAmountForBlock(idx); }
    window.validateExtraMeetingAmount = validateExtraMeetingAmount;

    function updateExtraMeetingExpenseTooltip(idx) {
        fillMeetingExpenseTooltipContent(`meetingExpenseTooltipContent_${idx}`);
    }

    window.removeExtraMeetingAttendee = function(idx, attendeeId) {
        const m = getExtraMtg(idx);
        if (!m) return;
        m.attendees = m.attendees.filter(a => String(a.id) !== String(attendeeId));
        renderExtraMeetingAttendees(idx);
    };

    // ══════════════════════════════════════════════════════════════
    // 회의 블록 추가 / 제거
    // ══════════════════════════════════════════════════════════════
    window.addMeetingBlock = function() {
        const idx = meetingBlockCount++;
        // 회의 날짜 옵션 복사 (meeting-0의 select 옵션 기준)
        const srcSel = document.getElementById('common_meeting_date');
        const dateOptionsHtml = srcSel
            ? Array.from(srcSel.options).map(o => `<option value="${o.value}">${o.textContent}</option>`).join('')
            : '<option value="">출장기간 선택 후 자동 표시</option>';

        const blockHtml = `
<div class="meeting-block" data-meeting-idx="${idx}" id="meeting-block-${idx}">
<div class="common-info-section">
    <div class="section-header">
        <h3><i class="fas fa-comments"></i> 회의 정보 <span class="meeting-block-badge">${idx + 1}번째 회의</span></h3>
        <button type="button" class="btn-remove-meeting" onclick="removeMeetingBlock(${idx})">
            <i class="fas fa-minus"></i> 회의 삭제
        </button>
    </div>
    <div class="form-group full-width">
        <label for="meeting_purpose_${idx}"><i class="fas fa-bullseye"></i> 회의 목적 <span class="required-mark">*</span></label>
        <input type="text" id="meeting_purpose_${idx}" class="form-input" placeholder="회의 목적을 입력하세요">
    </div>
    <div class="form-grid">
        <div class="form-group">
            <label for="meeting_author_${idx}"><i class="fas fa-user-edit"></i> 회의 작성자 <span class="required-mark">*</span></label>
            <input type="text" id="meeting_author_${idx}" class="form-input clickable-input" placeholder="출장인원 추가 후 선택" readonly onclick="openMeetingAuthorModal(${idx})">
        </div>
        <div class="form-group">
            <label for="meeting_date_${idx}"><i class="fas fa-calendar-day"></i> 회의 일자 <span class="required-mark">*</span></label>
            <select id="meeting_date_${idx}" class="form-input"><option value="">날짜를 선택하세요</option>${dateOptionsHtml}</select>
        </div>
    </div>
    <div class="form-grid">
        <div class="form-group">
            <label for="meeting_start_time_${idx}"><i class="fas fa-clock"></i> 시작 시간 <span class="required-mark">*</span></label>
            <input type="time" id="meeting_start_time_${idx}" class="form-input">
        </div>
        <div class="form-group">
            <label for="meeting_end_time_${idx}"><i class="fas fa-clock"></i> 종료 시간 <span class="required-mark">*</span></label>
            <input type="time" id="meeting_end_time_${idx}" class="form-input">
        </div>
    </div>
    <div class="form-group full-width">
        <label for="meeting_location_${idx}"><i class="fas fa-map-marker-alt"></i> 회의 장소 <span class="required-mark">*</span></label>
        <input type="text" id="meeting_location_${idx}" class="form-input" placeholder="회의 장소를 입력하세요">
    </div>
    <div class="form-group full-width">
        <label>
            <i class="fas fa-users"></i> 참석자 <span class="required-mark">*</span>
            <span id="attendeeCount_${idx}" class="person-count-badge" style="display:none;"></span>
            <span class="expense-tooltip-wrapper">
                <i class="fas fa-info-circle expense-tooltip-icon"></i>
                <div class="expense-tooltip-content" id="meetingExpenseTooltipContent_${idx}">
                    <div class="expense-tooltip-loading" style="line-height:1.4;">프로젝트 선택 시<br>직급별 회의비 정보를<br>확인하실 수 있습니다</div>
                </div>
            </span>
        </label>
        <div class="attendee-area" id="attendeeArea_${idx}">
            <div id="attendeeList_${idx}" class="attendee-list">
                <div class="empty-attendee-state"><i class="fas fa-user-plus"></i><div>출장인원이 자동으로 추가됩니다</div></div>
            </div>
            <button type="button" class="add-more-persons-btn" onclick="openAttendeeModal(${idx})">
                <i class="fas fa-user-plus"></i> 외부인원 추가
            </button>
            <div id="externalAttendeeWarning_${idx}" class="external-attendee-warning" style="display:none;">
                <i class="fas fa-exclamation-triangle"></i> 외부인원이 없습니다. 외부인원을 1명 이상 추가해주세요.
            </div>
        </div>
    </div>
    <div class="form-grid">
        <div class="form-group">
            <label for="meeting_amount_${idx}"><i class="fas fa-won-sign"></i> 사용 금액 (원) <span class="required-mark">*</span></label>
            <input type="text" id="meeting_amount_${idx}" class="form-input" placeholder="사용 금액을 입력하세요">
            <div class="amount-buttons">
                <button type="button" class="amount-btn" onclick="addExtraMeetingAmount(${idx},100000)"><i class="fas fa-plus-circle"></i> 10만원</button>
                <button type="button" class="amount-btn" onclick="addExtraMeetingAmount(${idx},10000)"><i class="fas fa-plus-circle"></i> 1만원</button>
                <button type="button" class="amount-btn" onclick="addExtraMeetingAmount(${idx},1000)"><i class="fas fa-plus-circle"></i> 1천원</button>
                <button type="button" class="amount-reset-btn" onclick="document.getElementById('meeting_amount_${idx}').value=''; validateExtraMeetingAmount(${idx});"><i class="fas fa-redo"></i> 초기화</button>
            </div>
            <div id="amountExceedWarning_${idx}" style="display:none; margin-top:4px; font-size:12px; color:#dc2626;"></div>
        </div>
        <div class="form-group">
            <label><i class="fas fa-calculator"></i> 참석자 금액 합계</label>
            <div class="total-amount-display"><span id="minutesMeetingExpenseTotal_${idx}">0원</span></div>
        </div>
    </div>
    <div class="form-group full-width">
        <label for="meeting_content_${idx}"><i class="fas fa-comments"></i> 주요 내용 <span class="required-mark">*</span></label>
        <div class="meeting-content-notice"><i class="fas fa-exclamation-triangle"></i> 회의록은 업무 관련 비용임을 입증하는 필수 증빙자료입니다. 논의 내용·결정 사항·참석자별 발언 등을 구체적으로 작성해주세요. 형식적으로만 작성된 경우 <strong>정산 시 반려</strong>될 수 있습니다.</div>
        <textarea id="meeting_content_${idx}" class="form-textarea" rows="6" placeholder="회의록은 단순 형식 요건이 아닌, 업무 관련 비용임을 입증하는 필수 증빙자료입니다.&#10;업무 목적이 명확히 드러나도록 상세히 작성해 주시기 바랍니다.&#10;&#10;⚠  구체적인 논의 내용 없이 형식적으로 작성된 경우, 추후 비용 적정성 검토 과정에서 추가 소명이 요청될 수 있습니다."></textarea>
        <div id="meetingContentByteStatus_${idx}" class="byte-status"></div>
    </div>
</div>
</div><!-- close meeting-block-${idx} -->`;

        const container = document.getElementById('meetingBlocksContainer');
        if (container) container.insertAdjacentHTML('beforeend', blockHtml);

        // 첨부파일 블록을 하단 meetingAttachmentBlocks에 추가
        const attachHtml = `
<div class="attachment-group meeting-attachment-group" data-attachment-meeting-idx="${idx}" id="meeting-attachment-block-${idx}">
    <div class="section-header" style="margin-bottom: 8px;">
        <h4 style="color:#667eea;"><i class="fas fa-users"></i> 회의 첨부파일 <span class="meeting-block-badge">${idx + 1}번째 회의</span></h4>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div>
            <div class="section-header"><h4><i class="fas fa-receipt"></i> 회의 영수증</h4></div>
            <div class="file-upload-area" id="meetingReceiptUploadArea_${idx}">
                <input type="file" id="meetingReceiptInput_${idx}" multiple hidden>
                <label for="meetingReceiptInput_${idx}" class="file-upload-label">
                    <i class="fas fa-cloud-upload-alt"></i><span>파일을 선택하거나 드래그하세요</span><small>최대 10MB, 최대 5개 · 클릭 후 📋 Ctrl+V 가능</small>
                </label>
            </div>
            <div class="file-list" id="meetingReceiptFileList_${idx}"></div>
        </div>
        <div>
            <div class="section-header"><h4><i class="fas fa-file-alt"></i> 회의 공식문서</h4></div>
            <div class="file-upload-area" id="meetingDocumentUploadArea_${idx}">
                <input type="file" id="meetingDocumentInput_${idx}" multiple hidden>
                <label for="meetingDocumentInput_${idx}" class="file-upload-label">
                    <i class="fas fa-cloud-upload-alt"></i><span>파일을 선택하거나 드래그하세요</span><small>최대 10MB, 최대 5개</small>
                </label>
            </div>
            <div class="file-list" id="meetingDocumentFileList_${idx}"></div>
        </div>
    </div>
</div>`;
        const attachContainer = document.getElementById('meetingAttachmentBlocks');
        if (attachContainer) attachContainer.insertAdjacentHTML('beforeend', attachHtml);

        // 상태 추가
        const mtgState = {
            idx,
            receiptFiles: [],
            documentFiles: [],
            authorPersonId: null,
            attendees: [],
            tripPersonsForMeeting: [...(window.getTripPersons ? window.getTripPersons() : [])]
        };
        extraMeetings.push(mtgState);
        renderExtraMeetingAttendees(idx);

        // 파일 업로드 설정
        const receiptInput = document.getElementById(`meetingReceiptInput_${idx}`);
        const receiptList = document.getElementById(`meetingReceiptFileList_${idx}`);
        const receiptArea = document.getElementById(`meetingReceiptUploadArea_${idx}`);
        const docInput = document.getElementById(`meetingDocumentInput_${idx}`);
        const docList = document.getElementById(`meetingDocumentFileList_${idx}`);
        const docArea = document.getElementById(`meetingDocumentUploadArea_${idx}`);

        const updateReceiptList = makeUpdateFileListForExtra(receiptList, mtgState.receiptFiles, idx, 'receipt');
        const updateDocList = makeUpdateFileListForExtra(docList, mtgState.documentFiles, idx, 'document');

        setupUpload(receiptInput, receiptArea, mtgState.receiptFiles, updateReceiptList);
        setupUpload(docInput, docArea, mtgState.documentFiles, updateDocList);

        // 새 회의 영수증 영역에 paste click wiring + 새 회의를 활성으로
        if (typeof window.__rtmRefreshPasteWiring === 'function') {
            window.__rtmRefreshPasteWiring();
        }

        // 문서 미리보기 블록 추가
        addMeetingDocBlock(idx);

        // 뱃지 재번호
        renumberMeetingBadges();

        // 필드 변경 시 유효성 재검증 이벤트
        [`meeting_purpose_${idx}`, `meeting_date_${idx}`, `meeting_start_time_${idx}`, `meeting_end_time_${idx}`].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', validateRequiredFields);
                el.addEventListener('change', validateRequiredFields);
            }
        });

        // 추가 회의 일자/시간 변경 시 해당 회의 참석자 초기화 + 참여기간 재검증
        [`meeting_date_${idx}`, `meeting_start_time_${idx}`, `meeting_end_time_${idx}`].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', async function() {
                    if (isPopulatingForm) return;
                    const m = extraMeetings.find(em => em.idx === idx);
                    if (m && m.attendees.length > 0) {
                        m.attendees = [];
                        renderExtraMeetingAttendees(idx);
                        const blockNum = getMeetingBlockNum(idx);
                        Swal.fire({
                            icon: 'info',
                            title: '참석자 초기화',
                            text: `${blockNum}번째 회의 일자/시간 변경으로 참석자가 초기화되었습니다.`,
                            confirmButtonText: '확인',
                            confirmButtonColor: '#667eea',
                            timer: 3000,
                            timerProgressBar: true
                        });
                    }
                    // 회의 날짜 변경 시 참여기간 재검증 (특히 회의 작성자 검사)
                    if (id === `meeting_date_${idx}`) {
                        await revalidateRtmAgainstDates();
                    }
                });
            }
        });

        // 시간 input 전체 클릭 시 picker 열기
        [`meeting_start_time_${idx}`, `meeting_end_time_${idx}`].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', function() { if (this.showPicker) { try { this.showPicker(); } catch(e) {} } });
        });

        // 사용금액 입력 시 초과 검증 + 유효성 검증
        const amountInputEl = document.getElementById(`meeting_amount_${idx}`);
        if (amountInputEl) {
            amountInputEl.addEventListener('input', function() {
                // 숫자만 입력되도록 포맷
                const raw = this.value.replace(/[^\d]/g, '');
                this.value = raw ? parseInt(raw, 10).toLocaleString('ko-KR') : '';
                validateExtraMeetingAmount(idx);
                validateRequiredFields();
            });
        }

        // 회의 장소 → 문서 미리보기 자동 동기화
        const meetingLocInput = document.getElementById(`meeting_location_${idx}`);
        const docMeetingLocInput = document.getElementById(`doc_meeting_location_${idx}`);
        if (meetingLocInput && docMeetingLocInput) {
            meetingLocInput.addEventListener('input', function() {
                docMeetingLocInput.value = this.value;
                validateRequiredFields();
            });
        }

        // 바이트 카운터 이벤트 설정 + 독자적 필수값 검증
        const contentTextarea = document.getElementById(`meeting_content_${idx}`);
        if (contentTextarea) {
            contentTextarea.addEventListener('input', () => {
                updateExtraMeetingByteCounter(idx);
                validateRequiredFields();
            });
        }

        // 직급별 회의비 tooltip 초기화
        updateExtraMeetingExpenseTooltip(idx);

        // 기본 작성자 자동 설정
        setDefaultAuthorForExtra(idx);

        // 빈 필수 필드 즉시 빨간색 표시
        validateRequiredFields();

        // 새 회의 블록으로 스크롤
        const newBlock = document.getElementById(`meeting-block-${idx}`);
        if (newBlock) newBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    function makeUpdateFileListForExtra(listEl, filesArr, meetingIdx, type) {
        return function() {
            if (!listEl) return;
            listEl.innerHTML = '';
            filesArr.forEach((file, index) => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.innerHTML = `
                    <i class="fas ${getFileIcon(file.name)}"></i>
                    <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                    <button class="btn-remove-file" onclick="removeExtraMeetingFile(${meetingIdx},'${type}',${index})"><i class="fas fa-times"></i></button>
                `;
                listEl.appendChild(item);
            });
        };
    }

    window.removeExtraMeetingFile = function(meetingIdx, type, i) {
        const m = getExtraMtg(meetingIdx);
        if (!m) return;
        const arr = type === 'receipt' ? m.receiptFiles : m.documentFiles;
        arr.splice(i, 1);
        const listEl = document.getElementById(type === 'receipt' ? `meetingReceiptFileList_${meetingIdx}` : `meetingDocumentFileList_${meetingIdx}`);
        if (listEl) {
            const updateFn = makeUpdateFileListForExtra(listEl, arr, meetingIdx, type);
            updateFn();
        }
    };

    window.addExtraMeetingAmount = function(idx, amount) {
        const el = document.getElementById(`meeting_amount_${idx}`);
        if (!el) return;
        const current = parseInt((el.value || '0').replace(/,/g, '')) || 0;
        el.value = (current + amount).toLocaleString('ko-KR');
        validateExtraMeetingAmount(idx);
        validateRequiredFields();
    };

    function addMeetingDocBlock(idx) {
        const container = document.getElementById('meetingDocumentBlocks');
        if (!container) return;
        const docHtml = `
<div class="meeting-doc-block" data-doc-meeting-idx="${idx}" id="meeting-doc-block-${idx}">
    <div style="background:#f0f4ff; border:1px solid #c7d2fe; border-radius:6px; padding:8px 16px; margin: 0 auto 16px; max-width:881px;">
        <strong style="color:#667eea;"><i class="fas fa-comments"></i> ${idx + 1}번째 회의</strong>
    </div>
    <div style="background: white; border: 2px solid #e0e0e0; border-radius: 8px; padding: 30px; max-width: 881px; margin: 0 auto 30px">
        <h2 class="doc-title" style="margin: 0">회 의 록</h2>
        <table class="form-table">
            <colgroup><col style="width: 15%;"><col style="width: 44%;"><col style="width: 14%;"><col style="width: 27%;"></colgroup>
            <tr><th style="height:64px">과제명</th><td><input type="text" class="auto-project" readonly style="background:#f9f9f9;text-align:center;font-size:12px;"></td><th>작성자</th><td><input type="text" id="doc_meeting_author_${idx}" readonly style="background:#f9f9f9;text-align:center;width:100%;padding:4px;border:1px solid #ddd;"></td></tr>
            <tr><th style="height:64px">일시</th><td><input type="text" id="doc_meeting_datetime_${idx}" readonly style="background:#f9f9f9;text-align:center;width:100%;padding:4px;border:1px solid #ddd;"></td><th>장소</th><td><input type="text" id="doc_meeting_location_${idx}" readonly style="background:#f9f9f9;text-align:center;width:100%;padding:4px;border:1px solid #ddd;"></td></tr>
            <tr><th>참여자</th><td colspan="3" id="doc_meeting_attendees_${idx}" style="padding:10px;height:80px;white-space:pre-wrap;"></td></tr>
            <tr><th colspan="4" style="background:#f0f0f0;padding:15px;">내용</th></tr>
            <tr><th style="vertical-align:middle;padding-top:15px;">주제</th><td colspan="3" id="doc_meeting_subject_${idx}" style="padding:10px;text-align:left;font-size:18px;height:64px"></td></tr>
            <tr><th style="padding-top:15px;">주요 내용</th><td colspan="3" id="doc_meeting_content_${idx}" style="padding:10px;min-height:150px;text-align:left;white-space:pre-wrap;"></td></tr>
        </table>
    </div>
    <div style="background: white; border: 2px solid #e0e0e0; border-radius: 8px; padding: 30px; margin: 0 auto 30px; max-width: 881px">
        <h2 class="doc-title" style="margin: 0">참 석 자 명 단</h2>
        <table class="form-table">
            <colgroup><col style="width:15%;"><col style="width:44%;"><col style="width:14%;"><col style="width:27%;"></colgroup>
            <tr><th style="height:64px">과제</th><td><input type="text" class="auto-project" readonly style="background:#f9f9f9;text-align:center;font-size:12px;"></td><th>작성자</th><td><input type="text" id="doc_attendee_author_${idx}" readonly style="background:#f9f9f9;text-align:center;width:100%;padding:4px;border:1px solid #ddd;"></td></tr>
            <tr><th style="height:64px">일시</th><td><input type="text" id="doc_attendee_datetime_${idx}" readonly style="background:#f9f9f9;text-align:center;width:100%;padding:4px;border:1px solid #ddd;"></td><th>장소</th><td><input type="text" class="auto-location" readonly style="background:#f9f9f9;text-align:center;"></td></tr>
        </table>
        <table class="form-table" style="margin-top:20px;">
            <thead><tr style="height:40px;"><th style="width:70px;">구분</th><th>소속</th><th>성명</th><th style="width:100px;">서명</th></tr></thead>
            <tbody id="attendeeSignatureBody_${idx}"></tbody>
        </table>
    </div>
</div><!-- close meeting-doc-block-${idx} -->`;
        container.insertAdjacentHTML('beforeend', docHtml);
    }

    window.removeMeetingBlock = function(idx) {
        // 회의 정보 블록 제거
        const block = document.getElementById(`meeting-block-${idx}`);
        if (block) block.remove();
        // 첨부파일 블록 제거
        const attachBlock = document.getElementById(`meeting-attachment-block-${idx}`);
        if (attachBlock) attachBlock.remove();
        // 문서 미리보기 블록 제거
        const docBlock = document.getElementById(`meeting-doc-block-${idx}`);
        if (docBlock) docBlock.remove();
        // 상태 제거
        const pos = extraMeetings.findIndex(m => m.idx === idx);
        if (pos !== -1) extraMeetings.splice(pos, 1);
        // 남은 블록 뱃지 재번호
        renumberMeetingBadges();
        // 활성 블록이 사라졌으면 출장으로 폴백
        if (typeof window.__rtmRefreshPasteWiring === 'function') {
            window.__rtmRefreshPasteWiring();
        }
    };

    // 회의 블록 뱃지를 DOM 순서 기준으로 재번호 매기기 + 첨부/문서 블록 순서도 동기화
    function renumberMeetingBadges() {
        const meetingContainer = document.getElementById('meetingBlocksContainer');
        const attachContainer  = document.getElementById('meetingAttachmentBlocks');
        const docContainer     = document.getElementById('meetingDocumentBlocks');
        if (!meetingContainer) return;

        // meetingBlocksContainer 내부의 블록만 선택 (document 전체 탐색 방지)
        const allBlocks = meetingContainer.querySelectorAll('.meeting-block[data-meeting-idx]');

        allBlocks.forEach((block, i) => {
            const label      = `${i + 1}번째 회의`;
            const meetingIdx = block.getAttribute('data-meeting-idx');

            // 회의 정보 블록 뱃지
            const badge = block.querySelector('.meeting-block-badge');
            if (badge) badge.textContent = label;

            // 첨부파일 블록 — 뱃지 갱신 후 컨테이너 끝으로 이동 (순서 재정렬)
            const attachBlock = document.getElementById(`meeting-attachment-block-${meetingIdx}`);
            if (attachBlock) {
                const attachBadge = attachBlock.querySelector('.meeting-block-badge');
                if (attachBadge) attachBadge.textContent = label;
                if (attachContainer) attachContainer.appendChild(attachBlock);
            }

            // 문서 미리보기 블록 — 라벨 갱신 후 컨테이너 끝으로 이동 (순서 재정렬)
            const docBlock = document.getElementById(`meeting-doc-block-${meetingIdx}`);
            if (docBlock) {
                const docLabel = docBlock.querySelector('strong');
                if (docLabel) docLabel.innerHTML = `<i class="fas fa-comments"></i> ${label}`;
                if (docContainer) docContainer.appendChild(docBlock);
            }
        });
    }

    // 추가된 회의 바이트 카운터 업데이트
    const MIN_MEETING_CONTENT_BYTES = 400;
    function updateExtraMeetingByteCounter(idx) {
        const textarea = document.getElementById(`meeting_content_${idx}`);
        const statusEl = document.getElementById(`meetingContentByteStatus_${idx}`);
        if (!statusEl || !textarea) return;
        const bytes = new TextEncoder().encode(textarea.value || '').length;
        if (bytes === 0) {
            statusEl.className = '';
            statusEl.textContent = '';
        } else if (bytes >= MIN_MEETING_CONTENT_BYTES) {
            statusEl.className = 'byte-status-sufficient';
            statusEl.textContent = `✓ 조건 충족 · ${bytes} bytes 입력됨`;
        } else {
            statusEl.className = 'byte-status-insufficient';
            statusEl.textContent = `최소 ${MIN_MEETING_CONTENT_BYTES} bytes 필요 · 현재 ${bytes} bytes (${MIN_MEETING_CONTENT_BYTES - bytes} bytes 부족)`;
        }
    }

    // 추가된 회의 기본 작성자 자동 설정
    async function setDefaultAuthorForExtra(idx) {
        const mtgState = extraMeetings.find(m => m.idx === idx);
        if (!mtgState || mtgState.authorPersonId) return;
        if (tripPersons.length === 0) return; // 출장 인원이 없으면 자동 설정 안 함

        // 출장 참석인원 중에서만 작성자 후보 선정
        const members = tripPersons.map(p => ({
            id: p.id,
            name: p.name,
            dept: p.dept || '',
            position: p.position || '',
            positionCode: p.positionCode || ''
        }));
        const dateVal  = document.getElementById(`meeting_date_${idx}`)?.value;
        const startVal = document.getElementById(`meeting_start_time_${idx}`)?.value;
        const endVal   = document.getElementById(`meeting_end_time_${idx}`)?.value;
        const projVal  = document.getElementById('selectedProjectIdx')?.value;
        const excludeId = getUrlParameter('documentIdx') || getUrlParameter('id') || null;

        const { author } = await ReceiptCommon.pickDefaultAuthor({
            candidates: members,
            getPositionOrder: (m) => getPositionSortOrder(m.positionCode),
            loggedInUserIdx: window.CURRENT_USER?.idx,
            duplicateProbe: async (cand) => {
                if (!dateVal || !startVal || !endVal || !projVal) return false;
                return await checkAuthorDuplicate(cand.id, dateVal, startVal, endVal, projVal, excludeId, 'RCTM');
            },
            rankStrategy: 'ascStep4'
        });

        if (author) {
            mtgState.authorPersonId = author.id;
            const authorField = document.getElementById(`meeting_author_${idx}`);
            const docAuthorField = document.getElementById(`doc_meeting_author_${idx}`);
            if (authorField) { authorField.value = author.name; authorField.classList.remove('field-empty'); }
            if (docAuthorField) docAuthorField.value = author.name;
        }
    }

    // 모든 회의 세션 payload 구성
    function buildMeetingSessionsPayload() {
        const sessions = [];

        // 회의-0 (기존 필드)
        const internalM0 = meetingTripPersons.map((p, i) => ({
            isExternal: false, department: p.dept, name: p.name,
            userIdx: parseInt(p.id), position: p.position, displayOrder: i
        }));
        const externalM0 = attendees.map((p, i) => ({
            isExternal: true, department: p.dept, name: p.name,
            userIdx: parseInt(p.id), position: p.position, displayOrder: meetingTripPersons.length + i
        }));
        sessions.push({
            displayOrder: 0,
            meetingDate:     document.getElementById('common_meeting_date')?.value || null,
            startTime:       document.getElementById('common_start_time')?.value || null,
            endTime:         document.getElementById('common_end_time')?.value || null,
            meetingLocation: document.getElementById('common_meeting_location')?.value || null,
            meetingPurpose:  document.getElementById('common_meeting_purpose')?.value || null,
            meetingContent:  document.getElementById('common_meeting_content')?.value || null,
            meetingDrafterUserIdx: meetingAuthorPersonId ? parseInt(meetingAuthorPersonId) : null,
            meetingAmount:   parseInt((document.getElementById('common_amount')?.value || '0').replace(/,/g, '')) || 0,
            meetingAttendees: [...internalM0, ...externalM0]
        });

        // 추가 회의 (idx 1+)
        extraMeetings.forEach((m, order) => {
            const idx = m.idx;
            const internalMn = m.tripPersonsForMeeting.map((p, i) => ({
                isExternal: false, department: p.dept, name: p.name,
                userIdx: parseInt(p.id), position: p.position, displayOrder: i
            }));
            const externalMn = m.attendees.map((p, i) => ({
                isExternal: true, department: p.dept, name: p.name,
                userIdx: parseInt(p.id), position: p.position, displayOrder: m.tripPersonsForMeeting.length + i
            }));
            sessions.push({
                displayOrder: order + 1,
                meetingDate:     document.getElementById(`meeting_date_${idx}`)?.value || null,
                startTime:       document.getElementById(`meeting_start_time_${idx}`)?.value || null,
                endTime:         document.getElementById(`meeting_end_time_${idx}`)?.value || null,
                meetingLocation: document.getElementById(`meeting_location_${idx}`)?.value || null,
                meetingPurpose:  document.getElementById(`meeting_purpose_${idx}`)?.value || null,
                meetingContent:  document.getElementById(`meeting_content_${idx}`)?.value || null,
                meetingDrafterUserIdx: m.authorPersonId ? parseInt(m.authorPersonId) : null,
                meetingAmount:   parseInt((document.getElementById(`meeting_amount_${idx}`)?.value || '0').replace(/,/g, '')) || 0,
                meetingAttendees: [...internalMn, ...externalMn]
            });
        });

        return sessions;
    }

    // 제출
    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            // 필수 필드 개별 검증 (화면 상단부터 순서대로)
            if (!document.getElementById('selectedProjectIdx')?.value) {
                await showWarning('과제를 선택해주세요.');
                document.getElementById('common_project')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!document.getElementById('selectedCardIdx')?.value) {
                await showWarning('사용 카드를 선택해주세요.');
                document.getElementById('common_card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            const tripDateEl = document.getElementById('common_date');
            if (!tripDateEl?.value) {
                await showWarning('출장기간을 입력해주세요.');
                tripDateEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            const locationEl2 = document.getElementById('common_location');
            if (!locationEl2?.value?.trim()) {
                await showWarning('출장지를 입력해주세요.');
                locationEl2?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                locationEl2?.focus({ preventScroll: true });
                return;
            }
            if (tripPersons.length === 0) {
                await showWarning('출장인원을 추가해주세요.');
                document.getElementById('tripPersonArea')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            const purposeEl2 = document.getElementById('common_purpose');
            if (!purposeEl2?.value?.trim()) {
                await showWarning('출장목적을 입력해주세요.');
                purposeEl2?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                purposeEl2?.focus({ preventScroll: true });
                return;
            }
            const tripResultEl2 = document.getElementById('common_trip_result');
            {
                const marker2 = '- 출장 내용 :';
                const val2 = tripResultEl2?.value || '';
                const markerIdx2 = val2.indexOf(marker2);
                const hasContent2 = markerIdx2 !== -1
                    ? val2.slice(markerIdx2 + marker2.length).trim().length > 0
                    : val2.trim().length > 0;
                if (!hasContent2) {
                    await showWarning('출장 내용 및 결과를 입력해주세요.');
                    tripResultEl2?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    tripResultEl2?.focus({ preventScroll: true });
                    return;
                }
            }
            const totalTripExpense = dailyExpenses.reduce((s, e) => s + (e.transport||0) + (e.lodging||0) + (e.meal||0) + (e.other||0), 0);
            if (totalTripExpense === 0) {
                await showWarning('날짜별 사용금액을 입력해주세요.');
                document.getElementById('dailyExpenseTable')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            // 1일 기준 인원 금액 초과 검증
            const expenseLimits = window.getExpenseLimits ? window.getExpenseLimits() : {};
            const exceededTypes = { transport: '교통비', lodging: '숙박비', meal: '식비', other: '기타(일비)' };
            let exceededLabel = null;
            outer: for (const expense of dailyExpenses) {
                for (const [type, label] of Object.entries(exceededTypes)) {
                    const limit = expenseLimits[type] || 0;
                    if (limit > 0 && (expense[type] || 0) > limit) {
                        exceededLabel = label;
                        break outer;
                    }
                }
            }
            if (exceededLabel) {
                await showWarning(`1일 기준 인원 금액을 초과한 항목(${exceededLabel})이 있습니다.\n빨간색으로 표시된 항목을 수정해주세요.`);
                document.getElementById('dailyExpenseTable')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            // ── 1번째 회의 필수 필드 검증 (화면 위→아래 순서) ──────────────
            if (!document.getElementById('common_meeting_purpose')?.value?.trim()) {
                await showWarning('1번째 회의 목적을 입력해주세요.');
                document.getElementById('common_meeting_purpose')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                document.getElementById('common_meeting_purpose')?.focus({ preventScroll: true });
                return;
            }
            if (!document.getElementById('common_meeting_author')?.value?.trim()) {
                await showWarning('1번째 회의 작성자를 선택해주세요.');
                document.getElementById('common_meeting_author')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!document.getElementById('common_meeting_date')?.value) {
                await showWarning('1번째 회의 일자를 선택해주세요.');
                document.getElementById('common_meeting_date')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!document.getElementById('common_start_time')?.value) {
                await showWarning('1번째 회의 시작 시간을 입력해주세요.');
                document.getElementById('common_start_time')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                document.getElementById('common_start_time')?.focus({ preventScroll: true });
                return;
            }
            if (!document.getElementById('common_end_time')?.value) {
                await showWarning('1번째 회의 종료 시간을 입력해주세요.');
                document.getElementById('common_end_time')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                document.getElementById('common_end_time')?.focus({ preventScroll: true });
                return;
            }
            if (!document.getElementById('common_meeting_location')?.value?.trim()) {
                await showWarning('1번째 회의 장소를 입력해주세요.');
                document.getElementById('common_meeting_location')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                document.getElementById('common_meeting_location')?.focus({ preventScroll: true });
                return;
            }
            if (attendees.length === 0) {
                await showWarning('1번째 회의에 외부 참석자를 1명 이상 추가해주세요.');
                document.getElementById('attendeeArea')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            const amountEl = document.getElementById('common_amount');
            const amountVal = parseInt((amountEl?.value || '0').replace(/[^\d]/g, '')) || 0;
            if (!amountVal || amountVal <= 0) {
                await showWarning('1번째 회의 사용 금액을 입력해주세요.');
                amountEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                amountEl?.focus({ preventScroll: true });
                return;
            }
            {
                let m0LimitVal = 0;
                meetingTripPersons.forEach(p => { m0LimitVal += getPersonMeetingExpense(p); });
                attendees.forEach(p => { m0LimitVal += getPersonMeetingExpense(p); });
                if (m0LimitVal > 0 && amountVal > m0LimitVal) {
                    await showWarning(`1번째 회의 사용 금액(${amountVal.toLocaleString()}원)이 참석자 금액 합계(${m0LimitVal.toLocaleString()}원)를 초과합니다.\n금액을 수정해주세요.`);
                    amountEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    amountEl?.focus({ preventScroll: true });
                    return;
                }
            }
            const MIN_BYTES = 400;
            {
                const meetingContentEl = document.getElementById('common_meeting_content');
                if (meetingContentEl) {
                    const contentBytes = new TextEncoder().encode(meetingContentEl.value.trim()).length;
                    if (contentBytes < MIN_BYTES) {
                        await Swal.fire({
                            icon: 'warning',
                            title: '1번째 회의 내용을 더 상세히 작성해주세요',
                            html: `현재 <b>${contentBytes}bytes</b> 입력되었습니다.<br><br>
                                   회의 내용이 부실하게 작성된 경우 <b>정산 시 반려</b>될 수 있습니다.<br>
                                   논의된 내용, 결정 사항, 참석자별 발언 등을 구체적으로 작성해주세요.<br><br>
                                   <span style="color:#888;font-size:13px;">최소 ${MIN_BYTES}bytes 이상 입력 필요 (${MIN_BYTES - contentBytes}bytes 더 필요)</span>`,
                            confirmButtonText: '다시 작성하기'
                        });
                        meetingContentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        meetingContentEl.focus();
                        return;
                    }
                }
            }

            // ── 추가된 회의 필수 필드 검증 (회의별, 화면 위→아래 순서) ────────
            for (const m of extraMeetings) {
                const blockNum = getMeetingBlockNum(m.idx);
                const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const focusEl  = (id) => document.getElementById(id)?.focus({ preventScroll: true });

                if (!document.getElementById(`meeting_purpose_${m.idx}`)?.value?.trim()) {
                    await showWarning(`${blockNum}번째 회의 목적을 입력해주세요.`);
                    scrollTo(`meeting_purpose_${m.idx}`); focusEl(`meeting_purpose_${m.idx}`); return;
                }
                if (!document.getElementById(`meeting_author_${m.idx}`)?.value?.trim()) {
                    await showWarning(`${blockNum}번째 회의 작성자를 선택해주세요.`);
                    scrollTo(`meeting_author_${m.idx}`); return;
                }
                if (!document.getElementById(`meeting_date_${m.idx}`)?.value) {
                    await showWarning(`${blockNum}번째 회의 일자를 선택해주세요.`);
                    scrollTo(`meeting_date_${m.idx}`); return;
                }
                if (!document.getElementById(`meeting_start_time_${m.idx}`)?.value) {
                    await showWarning(`${blockNum}번째 회의 시작 시간을 입력해주세요.`);
                    scrollTo(`meeting_start_time_${m.idx}`); focusEl(`meeting_start_time_${m.idx}`); return;
                }
                if (!document.getElementById(`meeting_end_time_${m.idx}`)?.value) {
                    await showWarning(`${blockNum}번째 회의 종료 시간을 입력해주세요.`);
                    scrollTo(`meeting_end_time_${m.idx}`); focusEl(`meeting_end_time_${m.idx}`); return;
                }
                if (!document.getElementById(`meeting_location_${m.idx}`)?.value?.trim()) {
                    await showWarning(`${blockNum}번째 회의 장소를 입력해주세요.`);
                    scrollTo(`meeting_location_${m.idx}`); focusEl(`meeting_location_${m.idx}`); return;
                }
                if (m.attendees.length === 0) {
                    await showWarning(`${blockNum}번째 회의에 외부 참석자를 1명 이상 추가해주세요.`);
                    scrollTo(`attendeeArea_${m.idx}`); return;
                }
                const mAmountEl = document.getElementById(`meeting_amount_${m.idx}`);
                const mAmountVal = parseInt((mAmountEl?.value || '0').replace(/[^\d]/g, '')) || 0;
                if (!mAmountVal || mAmountVal <= 0) {
                    await showWarning(`${blockNum}번째 회의 사용 금액을 입력해주세요.`);
                    scrollTo(`meeting_amount_${m.idx}`); focusEl(`meeting_amount_${m.idx}`); return;
                }
                {
                    let mLimitVal = 0;
                    (m.tripPersonsForMeeting || []).forEach(p => { mLimitVal += getPersonMeetingExpense(p); });
                    m.attendees.forEach(p => { mLimitVal += getPersonMeetingExpense(p); });
                    if (mLimitVal > 0 && mAmountVal > mLimitVal) {
                        await showWarning(`${blockNum}번째 회의 사용 금액(${mAmountVal.toLocaleString()}원)이 참석자 금액 합계(${mLimitVal.toLocaleString()}원)를 초과합니다.\n금액을 수정해주세요.`);
                        scrollTo(`meeting_amount_${m.idx}`); focusEl(`meeting_amount_${m.idx}`); return;
                    }
                }
                {
                    const mContentEl = document.getElementById(`meeting_content_${m.idx}`);
                    if (mContentEl) {
                        const bytes = new TextEncoder().encode(mContentEl.value.trim()).length;
                        if (bytes < MIN_BYTES) {
                            await Swal.fire({
                                icon: 'warning',
                                title: `${blockNum}번째 회의 내용을 더 상세히 작성해주세요`,
                                html: `현재 <b>${bytes}bytes</b> 입력되었습니다.<br><br>
                                       논의된 내용, 결정 사항, 참석자별 발언 등을 구체적으로 작성해주세요.<br><br>
                                       <span style="color:#888;font-size:13px;">최소 ${MIN_BYTES}bytes 이상 입력 필요 (${MIN_BYTES - bytes}bytes 더 필요)</span>`,
                                confirmButtonText: '다시 작성하기'
                            });
                            mContentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            mContentEl.focus();
                            return;
                        }
                    }
                }
            }

            // 회의 간 시간 중복 검증
            {
                const allMeetings = [
                    { date: document.getElementById('common_meeting_date')?.value,
                      start: document.getElementById('common_start_time')?.value,
                      end:   document.getElementById('common_end_time')?.value,
                      label: '1번째 회의' },
                    ...extraMeetings.map(m => ({
                        date:  document.getElementById(`meeting_date_${m.idx}`)?.value,
                        start: document.getElementById(`meeting_start_time_${m.idx}`)?.value,
                        end:   document.getElementById(`meeting_end_time_${m.idx}`)?.value,
                        label: `${getMeetingBlockNum(m.idx)}번째 회의`
                    }))
                ].filter(m => m.date && m.start && m.end);

                for (let i = 0; i < allMeetings.length; i++) {
                    for (let j = i + 1; j < allMeetings.length; j++) {
                        const a = allMeetings[i], b = allMeetings[j];
                        if (a.date !== b.date) continue;
                        if (a.start < b.end && b.start < a.end) {
                            await showWarning(`${a.label}(${a.start}~${a.end})과 ${b.label}(${b.start}~${b.end})의 시간이 겹칩니다.\n회의 시간을 조정해주세요.`);
                            return;
                        }
                    }
                }
            }

            // 회의 참석자 전원 시간대 중복 사전 검증 (전체 세션, 신규)
            {
                const chkProj = document.getElementById('selectedProjectIdx')?.value;
                if (chkProj && await checkAllMeetingAttendeeDuplicates(chkProj, null, null)) return;
            }

            // 활동비 초과 여부 확인 (경고만, 차단 없음)
            const projIdxForBudget = document.getElementById('selectedProjectIdx')?.value;
            if (projIdxForBudget) {
                try {
                    const budgetRes = await fetch(`/api/projects/${projIdxForBudget}/activity-usage`);
                    if (budgetRes.ok) {
                        const budgetData = await budgetRes.json();
                        const tripFee = dailyExpenses.reduce((s, e) => s + (e.transport||0) + (e.lodging||0) + (e.meal||0) + (e.other||0), 0);
                        const meetingFee = parseInt((document.getElementById('common_amount')?.value || '0').replace(/,/g, '')) || 0;
                        const currentTotalFee = tripFee + meetingFee;
                        const newTotalSpent = (budgetData.totalSpent || 0) + currentTotalFee;
                        if (newTotalSpent > (budgetData.activityBudget || 0)) {
                            const excessAmount = newTotalSpent - (budgetData.activityBudget || 0);
                            const budgetResult = await Swal.fire({
                                icon: 'warning',
                                title: '활동비 초과 경고',
                                html: `등록하려는 금액(<b>${currentTotalFee.toLocaleString()}원</b>)을 포함하면<br>활동비 예산을 <b style="color:#ef4444;">${excessAmount.toLocaleString()}원</b> 초과합니다.<br><br>그래도 저장하시겠습니까?`,
                                showCancelButton: true,
                                confirmButtonText: '저장',
                                cancelButtonText: '취소',
                                confirmButtonColor: '#667eea'
                            });
                            if (!budgetResult.isConfirmed) return;
                        }
                    }
                } catch (e) {
                    console.warn('활동비 조회 실패:', e);
                }
            }

            if (!await showConfirm('저장하시겠습니까?')) return;

            // [1] 공통 값 수집
            const projectIdx  = document.getElementById('selectedProjectIdx')?.value;
            const cardIdx     = document.getElementById('selectedCardIdx')?.value;
            const tripDate    = document.getElementById('common_date')?.value;
            const duration    = parseInt(document.getElementById('common_duration')?.value || '0');
            const meetingDate = document.getElementById('common_meeting_date')?.value;
            const usageAmount = parseInt((document.getElementById('common_amount')?.value || '0').replace(/,/g, '')) || 0;

            // [2] 출장 일별 비용 + 회의 사용금액을 합산하여 payload 구성
            const dailyExpensesPayload = dailyExpenses.map(e => ({
                expenseDate:       e.date.replace(/\./g, '-'),
                transportationFee: e.transport || 0,
                accommodationFee:  e.lodging   || 0,
                mealFee:           e.meal      || 0,
                otherFee:          e.other     || 0
            }));
            // 회의 사용금액을 meeting 날짜의 otherFee에 추가
            if (meetingDate && usageAmount > 0) {
                const existing = dailyExpensesPayload.find(e => e.expenseDate === meetingDate);
                if (existing) {
                    existing.otherFee += usageAmount;
                } else {
                    dailyExpensesPayload.push({ expenseDate: meetingDate, transportationFee: 0, accommodationFee: 0, mealFee: 0, otherFee: usageAmount });
                }
            }

            // [3] 회의 참석자 수집 (내부 + 외부)
            const internalMeetingAttendees = tripPersons.map((p, i) => ({
                isExternal:   false,
                department:   p.dept,
                name:         p.name,
                userIdx:      parseInt(p.id),
                position:     p.position,
                displayOrder: i
            }));
            const externalMeetingAttendees = attendees.map((p, i) => ({
                isExternal:   true,
                department:   p.dept,
                name:         p.name,
                userIdx:      parseInt(p.id),
                position:     p.position,
                displayOrder: tripPersons.length + i
            }));
            const allMeetingAttendees = [...internalMeetingAttendees, ...externalMeetingAttendees];

            // [4] 통합 DTO 구성
            const saveData = {
                projectIdx:       parseInt(projectIdx),
                cardIdx:          cardIdx ? parseInt(cardIdx) : null,
                drafterUserIdx:        authorPersonId ? parseInt(authorPersonId) : null,
                meetingDrafterUserIdx: meetingAuthorPersonId ? parseInt(meetingAuthorPersonId) : null,
                tripDate:         tripDate,
                requisitionDate:  document.getElementById('common_requisition_date')?.value || null,
                duration:         duration,
                location:         document.getElementById('common_location')?.value,
                dailyExpenses:    dailyExpensesPayload,
                purpose:          document.getElementById('common_purpose')?.value,
                tripContent:      document.getElementById('common_trip_result')?.value || '',
                tripAttendees: tripPersons.map((p, i) => ({
                    attendeeType: '내부',
                    department:   p.dept,
                    name:         p.name,
                    userIdx:      parseInt(p.id),
                    position:     p.position,
                    displayOrder: i
                })),
                meetingPurpose:   document.getElementById('common_meeting_purpose')?.value,
                meetingDate:      meetingDate,
                meetingAmount:    usageAmount,
                startTime:        document.getElementById('common_start_time')?.value,
                endTime:          document.getElementById('common_end_time')?.value,
                meetingContent:   document.getElementById('common_meeting_content')?.value,
                meetingAttendees: allMeetingAttendees,
                meetingSessions:  buildMeetingSessionsPayload()
            };

            // [5] multipart FormData 구성
            const formData = new FormData();
            formData.append('data', JSON.stringify(saveData));
            // 회의-0 파일 (세션 position 0 → 키 접미사 없음)
            selectedMeetingReceiptFiles.forEach(f  => formData.append('meetingReceiptFiles',  f));
            selectedMeetingDocumentFiles.forEach(f => formData.append('meetingDocumentFiles', f));
            // 추가 회의 파일 (세션 position 1,2,... → _1, _2, ...)
            // m.idx 는 JS 블록 생성 순서라 삭제 시 불연속할 수 있으므로
            // extraMeetings 배열 내 순서(order+1)를 키로 사용
            extraMeetings.forEach((m, order) => {
                const sessionPos = order + 1;
                m.receiptFiles.forEach(f  => formData.append(`meetingReceiptFiles_${sessionPos}`,  f));
                m.documentFiles.forEach(f => formData.append(`meetingDocumentFiles_${sessionPos}`, f));
            });
            selectedTripReceiptFiles.forEach(f     => formData.append('tripReceiptFiles',     f));
            selectedTripDocumentFiles.forEach(f    => formData.append('tripDocumentFiles',    f));

            // [6] API 호출
            try {
                const response = await fetch('/api/receipt-trip-meetings', {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || '저장에 실패했습니다.');
                }
                const result = await response.json();
                if (window.SignatureRender) {
                    SignatureRender.afterSave({
                        documentIdx: result.documentIdx,
                        redirectUrl: '/project/documents',
                        successMessage: '저장이 완료되었습니다.'
                    });
                } else {
                    await Swal.fire({
                        icon: 'success',
                        title: '저장 완료',
                        text: '저장이 완료되었습니다.',
                        timer: 1500,
                        timerProgressBar: true,
                        showConfirmButton: true,
                        confirmButtonText: '확인'
                    });
                    popupAwareRedirect('/project/documents');
                }
            } catch (e) {
                showWarning('저장 중 오류가 발생했습니다.\n' + e.message);
            }
        });
    }

    // PDF 저장 버튼 이벤트
    const savePdfBtn = document.getElementById('savePdfBtn');
    if (savePdfBtn) {
        savePdfBtn.addEventListener('click', async function(e) {
            e.preventDefault();

            let allDivs = null;
            let originalDisplays = [];
            let wasCollapsed = false;
            const loadingModal = document.getElementById('pdfLoadingModal');
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');

            // 진행도 업데이트 함수
            function updateProgress(percent, message) {
                if (progressFill) progressFill.style.width = percent + '%';
                if (progressText) progressText.textContent = `${message} (${percent}%)`;
            }

            try {
                console.log('PDF 저장 시작 - 출장+회의 통합 페이지');

                // 로딩 모달 표시
                if (loadingModal) loadingModal.classList.add('active');
                updateProgress(0, '준비 중...');

                if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
                    showWarning('PDF 라이브러리를 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
                    if (loadingModal) loadingModal.classList.remove('active');
                    return;
                }

                updateProgress(10, 'PDF 초기화 중...');

                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({
                    orientation: 'p',
                    unit: 'mm',
                    format: 'a4',
                    compress: false,
                    precision: 16
                });

                updateProgress(20, '문서 구조 확인 중...');

                // 접힌 문서 양식을 임시로 펼치기
                const documentFormWrapper = document.querySelector('.document-form-wrapper');
                if (documentFormWrapper && documentFormWrapper.classList.contains('collapsed')) {
                    wasCollapsed = true;
                    documentFormWrapper.classList.remove('collapsed');
                }

                allDivs = documentForm.querySelectorAll(':scope > div');
                console.log('찾은 div 개수:', allDivs.length);

                originalDisplays = Array.from(allDivs).map(div => div.style.display);

                if (allDivs.length < 5) {
                    showError('문서 구조를 찾을 수 없습니다. 영수증 처리(출장+회의) 템플릿을 선택했는지 확인해주세요.');
                    if (loadingModal) loadingModal.classList.remove('active');
                    // 접혔던 문서 양식을 다시 접기
                    if (documentFormWrapper && wasCollapsed) {
                        documentFormWrapper.classList.add('collapsed');
                    }
                    return;
                }

                updateProgress(30, '페이지 준비 중...');

                // 공통 정보 입력 영역 숨기고, 4개 문서 표시
                allDivs[0].style.display = 'none'; // 공통 입력
                allDivs[1].style.display = 'block'; // 출장품의서
                allDivs[2].style.display = 'block'; // 출장복명서
                allDivs[3].style.display = 'block'; // 회의록
                allDivs[4].style.display = 'block'; // 참석자 명단

                await new Promise(resolve => setTimeout(resolve, 300));

                const renderOptions = {
                    scale: 5,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    imageTimeout: 0,
                    removeContainer: true,
                    windowWidth: 2560,
                    windowHeight: 1440,
                    letterRendering: true,
                    foreignObjectRendering: false,
                    onclone: function(clonedDoc) {
                        const style = clonedDoc.createElement('style');
                        style.textContent = `
                            * {
                                -webkit-font-smoothing: antialiased !important;
                                -moz-osx-font-smoothing: grayscale !important;
                                text-rendering: optimizeLegibility !important;
                                font-smoothing: antialiased !important;
                            }
                        `;
                        clonedDoc.head.appendChild(style);
                    }
                };

                const pdfWidth = 210;
                const pdfHeight = 297;
                const margin = 5;
                const contentWidth = pdfWidth - (margin * 2);
                const contentHeight = pdfHeight - (margin * 2);

                updateProgress(35, '출장품의서 렌더링 중...');

                // 1. 출장품의서 페이지
                console.log('출장품의서 렌더링 중...');
                const proposalDiv = allDivs[1];

                if (!proposalDiv) {
                    throw new Error('출장품의서를 찾을 수 없습니다.');
                }

                const proposalCanvas = await window.html2canvas(proposalDiv, renderOptions);
                const canvasWidth = proposalCanvas.width;
                const canvasHeight = proposalCanvas.height;

                if (canvasWidth === 0 || canvasHeight === 0) {
                    throw new Error('Canvas 크기가 0입니다. 문서가 화면에 표시되어 있는지 확인하세요.');
                }

                updateProgress(45, '출장품의서 이미지 변환 중...');

                const proposalImgData = proposalCanvas.toDataURL('image/png');

                let imgWidth = contentWidth;
                let imgHeight = (canvasHeight * contentWidth) / canvasWidth;

                if (imgHeight > contentHeight) {
                    imgHeight = contentHeight;
                    imgWidth = (canvasWidth * contentHeight) / canvasHeight;
                }

                const xOffset = margin + (contentWidth - imgWidth) / 2;
                const yOffset = margin + (contentHeight - imgHeight) / 2;

                pdf.addImage(proposalImgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
                console.log('출장품의서 페이지 완료');

                updateProgress(55, '출장복명서 렌더링 중...');

                // 2. 출장복명서 페이지
                console.log('출장복명서 렌더링 중...');
                const reportDiv = allDivs[2];

                if (!reportDiv) {
                    throw new Error('출장복명서를 찾을 수 없습니다.');
                }

                pdf.addPage();
                const reportCanvas = await window.html2canvas(reportDiv, renderOptions);

                const reportCanvasWidth = reportCanvas.width;
                const reportCanvasHeight = reportCanvas.height;

                updateProgress(65, '출장복명서 이미지 변환 중...');

                const reportImgData = reportCanvas.toDataURL('image/png');

                let reportImgWidth = contentWidth;
                let reportImgHeight = (reportCanvasHeight * contentWidth) / reportCanvasWidth;

                if (reportImgHeight > contentHeight) {
                    reportImgHeight = contentHeight;
                    reportImgWidth = (reportCanvasWidth * contentHeight) / reportCanvasHeight;
                }

                const reportXOffset = margin + (contentWidth - reportImgWidth) / 2;
                const reportYOffset = margin + (contentHeight - reportImgHeight) / 2;

                pdf.addImage(reportImgData, 'PNG', reportXOffset, reportYOffset, reportImgWidth, reportImgHeight);
                console.log('출장복명서 페이지 완료');

                updateProgress(75, '회의록 렌더링 중...');

                // 3. 회의록 페이지
                console.log('회의록 렌더링 중...');
                const minutesDiv = allDivs[3];

                if (!minutesDiv) {
                    throw new Error('회의록을 찾을 수 없습니다.');
                }

                pdf.addPage();
                const minutesCanvas = await window.html2canvas(minutesDiv, renderOptions);

                const minutesCanvasWidth = minutesCanvas.width;
                const minutesCanvasHeight = minutesCanvas.height;

                updateProgress(82, '회의록 이미지 변환 중...');

                const minutesImgData = minutesCanvas.toDataURL('image/png');

                let minutesImgWidth = contentWidth;
                let minutesImgHeight = (minutesCanvasHeight * contentWidth) / minutesCanvasWidth;

                if (minutesImgHeight > contentHeight) {
                    minutesImgHeight = contentHeight;
                    minutesImgWidth = (minutesCanvasWidth * contentHeight) / minutesCanvasHeight;
                }

                const minutesXOffset = margin + (contentWidth - minutesImgWidth) / 2;
                const minutesYOffset = margin + (contentHeight - minutesImgHeight) / 2;

                pdf.addImage(minutesImgData, 'PNG', minutesXOffset, minutesYOffset, minutesImgWidth, minutesImgHeight);
                console.log('회의록 페이지 완료');

                updateProgress(89, '참석자 명단 렌더링 중...');

                // 4. 참석자 명단 페이지
                console.log('참석자 명단 렌더링 중...');
                const attendeesDiv = allDivs[4];

                if (!attendeesDiv) {
                    throw new Error('참석자 명단을 찾을 수 없습니다.');
                }

                pdf.addPage();
                const attendeesCanvas = await window.html2canvas(attendeesDiv, renderOptions);

                const attendeesCanvasWidth = attendeesCanvas.width;
                const attendeesCanvasHeight = attendeesCanvas.height;

                updateProgress(95, '참석자 명단 이미지 변환 중...');

                const attendeesImgData = attendeesCanvas.toDataURL('image/png');

                let attendeesImgWidth = contentWidth;
                let attendeesImgHeight = (attendeesCanvasHeight * contentWidth) / attendeesCanvasWidth;

                if (attendeesImgHeight > contentHeight) {
                    attendeesImgHeight = contentHeight;
                    attendeesImgWidth = (attendeesCanvasWidth * contentHeight) / attendeesCanvasHeight;
                }

                const attendeesXOffset = margin + (contentWidth - attendeesImgWidth) / 2;
                const attendeesYOffset = margin + (contentHeight - attendeesImgHeight) / 2;

                pdf.addImage(attendeesImgData, 'PNG', attendeesXOffset, attendeesYOffset, attendeesImgWidth, attendeesImgHeight);
                console.log('참석자 명단 페이지 완료');

                updateProgress(98, 'PDF 파일 생성 중...');

                // 파일명 생성
                const dateInput = document.getElementById('common_date');
                let dateStr;
                if (dateInput && dateInput.value) {
                    dateStr = dateInput.value.replace(/-/g, '').slice(2); // YYMMDD 형식
                } else {
                    const today = new Date();
                    const yy = String(today.getFullYear()).slice(2);
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    dateStr = `${yy}${mm}${dd}`;
                }
                const fileName = `${dateStr}_출장+회의.pdf`;

                console.log('PDF 저장:', fileName);
                pdf.save(fileName);

                updateProgress(100, '완료!');

                // 잠시 후 모달 닫기
                setTimeout(() => {
                    if (loadingModal) loadingModal.classList.remove('active');
                    showSuccess('PDF가 저장되었습니다.');
                }, 500);
            } catch (error) {
                console.error('PDF 생성 오류:', error);
                if (loadingModal) loadingModal.classList.remove('active');
                showError('PDF 생성 중 오류가 발생했습니다.\n' + error.message + '\n\n브라우저 콘솔(F12)을 확인해주세요.');
            } finally {
                if (allDivs && originalDisplays.length > 0) {
                    allDivs.forEach((div, index) => {
                        div.style.display = originalDisplays[index];
                    });
                }
                // 접혔던 문서 양식을 다시 접기
                const documentFormWrapper = document.querySelector('.document-form-wrapper');
                if (documentFormWrapper && wasCollapsed) {
                    documentFormWrapper.classList.add('collapsed');
                }
            }
        });
    }

    // 출장 인원 모달 관련
    const tripPersonModal = document.getElementById('tripPersonModal');
    const tripPersonSearchInput = document.getElementById('tripPersonSearchInput');

    // 출장인원 모달 내 임시 선택 상태 (검색 시 초기화 방지)
    let tempTripSelectedIds = new Set();

    // 출장 기간의 모든 날짜에 대해 중복 여부 확인 (공통 모듈 래퍼)
    async function checkTripPersonConflicts(empIdx, projectIdx, excludeIdx) {
        const startDateVal = document.getElementById('common_date')?.value;
        const duration = parseInt(document.getElementById('common_duration')?.value || '0');
        return await ReceiptCommon.hasAnyDuplicateOverDateRange({
            empIdx,
            projectIdx,
            startDate: startDateVal,
            durationDays: duration + 1, // 출장 시작일 포함
            excludeReceiptIdx: excludeIdx || undefined,
            excludeDocumentType: excludeIdx ? 'RCTM' : undefined
        });
    }

    // 출장인원 모달 - 프로젝트 미선택 시 프로젝트 목록 렌더링
    function renderProjectListInTripPersonModal(searchText = '') {
        const listEl = document.getElementById('tripPersonList2');
        const summaryEl = document.getElementById('tripPersonExpenseSummary');
        if (!listEl) return;
        if (summaryEl) summaryEl.style.display = 'none';

        let filtered = projects;
        if (searchText) {
            filtered = projects.filter(p => matchesSearch(p.projectName || '', searchText));
        }

        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="modal-empty-state"><i class="fas fa-search"></i><p>${searchText ? '검색 결과가 없습니다' : '등록된 프로젝트가 없습니다'}</p></div>`;
            return;
        }

        const header = `
            <div class="convenience-notice">
                <div class="notice-icon"><i class="fas fa-lightbulb"></i></div>
                <div class="notice-content">
                    <div class="notice-title">과제를 먼저 선택해주세요</div>
                    <div class="notice-desc">과제를 선택하면 출장인원 목록이 표시됩니다</div>
                </div>
            </div>`;

        const items = filtered.map(proj => `
            <div class="project-item-in-card" data-project-idx="${proj.idx}">
                <div class="project-item-icon"><i class="fas fa-folder"></i></div>
                <div class="project-item-name">${highlightText(proj.projectName || '이름 없음', searchText)}</div>
                <div class="project-item-arrow"><i class="fas fa-chevron-right"></i></div>
            </div>`).join('');

        listEl.innerHTML = header + items;

        listEl.querySelectorAll('.project-item-in-card').forEach(item => {
            item.addEventListener('click', async function() {
                const proj = projects.find(p => String(p.idx) === this.getAttribute('data-project-idx'));
                if (!proj) return;

                await applyProjectSelection(proj);

                // 인원 목록으로 전환
                if (tripPersonSearchInput) tripPersonSearchInput.value = '';
                renderTripPersonList2('');
            });
        });
    }

    // 모달 열기 함수
    window.openTripPersonModal = function() {
        if (tripPersonModal) {
            tripPersonModal.classList.add('show');
            if (tripPersonSearchInput) tripPersonSearchInput.value = '';
            // 현재 출장인원을 임시 선택 상태로 초기화
            tempTripSelectedIds = new Set(tripPersons.map(p => String(p.id)));
            const projectIdxInput = document.getElementById('selectedProjectIdx');
            if (!projectIdxInput || !projectIdxInput.value) {
                renderProjectListInTripPersonModal('');
            } else {
                renderTripPersonList2();
            }
        }
    };

    // 모달 닫기 함수
    window.closeTripPersonModal = function() {
        if (tripPersonModal) {
            tripPersonModal.classList.remove('show');
            if (tripPersonSearchInput) tripPersonSearchInput.value = '';
            tempTripSelectedIds = new Set();
        }
    };

    // 모달 외부 클릭 시 닫기
    if (tripPersonModal) {
        tripPersonModal.addEventListener('click', function(e) {
            if (e.target === tripPersonModal) {
                closeTripPersonModal();
            }
        });
    }

    // 출장 인원 목록 렌더링 (프로젝트 참여인원 사용)
    async function renderTripPersonList2(searchText = '') {
        const tripPersonList2El = document.getElementById('tripPersonList2');
        if (!tripPersonList2El) return;

        const filtered = getAuthorPersons()
            .filter(person => searchUtils.matchesAny(searchText, person.name, person.dept, person.position))
            .sort((a, b) => {
                const codeA = positionCodes.find(pc => pc.codeName === a.position)?.code || '';
                const codeB = positionCodes.find(pc => pc.codeName === b.position)?.code || '';
                return getPositionSortOrder(codeA) - getPositionSortOrder(codeB);
            });

        if (filtered.length === 0) {
            tripPersonList2El.innerHTML = `<div class="modal-empty-state"><i class="fas fa-search"></i><p>검색 결과가 없습니다</p></div>`;
            updateTripPersonModalSummary();
            return;
        }

        // 출장 기간 겹침 여부 병렬 체크
        const projectIdx = document.getElementById('selectedProjectIdx')?.value;
        const startDateVal = document.getElementById('common_date')?.value;
        const canCheckDup = !!(startDateVal && projectIdx);
        const excludeIdx = getUrlParameter('documentIdx') || getUrlParameter('id') || null;
        const dupResults = canCheckDup
            ? await Promise.all(filtered.map(p => checkTripPersonConflicts(p.id, projectIdx, excludeIdx)))
            : filtered.map(() => false);

        // 겹치는 사람을 맨 아래로
        const paired = filtered.map((p, i) => ({ person: p, isDup: dupResults[i] }));
        paired.sort((a, b) => (a.isDup ? 1 : 0) - (b.isDup ? 1 : 0));

        const tripRange = getCurrentTripRange();
        tripPersonList2El.innerHTML = paired.map(({ person, isDup }) => {
            const isSelected = tempTripSelectedIds.has(String(person.id));
            const isAuthor = String(person.id) === String(authorPersonId);
            const isInactive = tripRange.start && !isMemberActiveDuringRange(person, tripRange.start, tripRange.end);
            const isLocked = isAuthor || isDup || isInactive;
            const { meal, daily } = getPersonExpense(person);
            const expenseRow = (meal || daily)
                ? `<div class="employee-expense-row">일비 ${daily.toLocaleString()}원 · 식비 ${meal.toLocaleString()}원</div>`
                : '';
            const authorBadge = isAuthor ? '<span style="background:#e0e7ff; color:#4338ca; padding:2px 8px; border-radius:4px; font-size:11px; margin-left:8px; white-space:nowrap;"><i class="fas fa-user-check"></i> 작성자</span>' : '';
            const dupBadge = isDup
                ? `<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; white-space: nowrap;"><i class="fas fa-exclamation-triangle"></i> 기간 겹침</span>`
                : '';
            let inactiveBadge = '';
            if (isInactive) {
                const tip = `참여기간: ${formatMemberPeriod(person)}`;
                inactiveBadge = `<span style="background:#e5e7eb; color:#4b5563; padding:2px 8px; border-radius:4px; font-size:11px; margin-left:8px; white-space:nowrap;" data-tip="${tip}"><i class="fas fa-calendar-times"></i> 참여기간 외</span>`;
            }
            const disabledStyle = isLocked ? 'opacity: 0.6; cursor: not-allowed;' : '';
            const onclickAttr = isLocked ? '' : `onclick="selectTripPerson(${person.id})"`;
            const checkIcon = isAuthor
                ? '<i class="fas fa-check-circle" style="color:#94a3b8; font-size:18px; margin-left:auto; flex-shrink:0;"></i>'
                : (isSelected ? '<i class="fas fa-check-circle" style="color:#10b981; font-size:18px; margin-left:auto; flex-shrink:0;"></i>' : '');
            return `
            <div class="employee-item${isSelected ? ' selected' : ''}" data-id="${person.id}" data-dup="${isDup}" data-inactive="${isInactive}" ${onclickAttr} style="${disabledStyle}">
                <div class="employee-info">
                    <div class="employee-name">${searchUtils.highlightText(person.name, searchText)}${authorBadge}${inactiveBadge}${dupBadge}</div>
                    <div class="employee-detail">${searchUtils.highlightText(person.position, searchText)} · ${searchUtils.highlightText(person.dept, searchText)}</div>
                    ${expenseRow}
                </div>
                ${checkIcon}
            </div>`;
        }).join('');

        updateTripPersonModalSummary();
    }

    // 출장 인원 선택 (토글) - 기간 겹침 / 참여기간 외 인원 선택 불가
    window.selectTripPerson = async function(personId) {
        const item = document.querySelector(`#tripPersonList2 .employee-item[data-id="${personId}"]`);
        if (item?.getAttribute('data-dup') === 'true') return; // 겹침 인원 차단
        if (item?.getAttribute('data-inactive') === 'true') return; // 참여기간 외 차단

        const id = String(personId);

        // 작성자는 렌더링에서 클릭 차단됨 (안전장치)
        if (id === String(authorPersonId)) return;

        if (tempTripSelectedIds.has(id)) {
            tempTripSelectedIds.delete(id);
        } else {
            // 참여기간 검증 (백업)
            const tripRange = getCurrentTripRange();
            if (!tripRange.start) {
                await showWarning('출장 시작일을 먼저 입력해주세요.');
                return;
            }
            const person = getAuthorPersons().find(p => String(p.id) === id);
            if (person && !isMemberActiveDuringRange(person, tripRange.start, tripRange.end)) {
                await showInactiveMemberAlert(person, '출장 기간', `${tripRange.start} ~ ${tripRange.end}`, '출장 인원');
                return;
            }
            tempTripSelectedIds.add(id);
        }
        // 현재 검색어 유지하며 재렌더링
        renderTripPersonList2(tripPersonSearchInput?.value || '');
    };

    // 선택된 인원의 일비/식비 합계 표시
    function updateTripPersonModalSummary() {
        const summaryEl = document.getElementById('tripPersonSummary');
        const countEl = document.getElementById('selectedPersonCount');
        const mealTotalEl = document.getElementById('selectedMealTotal');
        const dailyTotalEl = document.getElementById('selectedDailyTotal');
        if (!summaryEl || !countEl || !mealTotalEl || !dailyTotalEl) return;

        if (tempTripSelectedIds.size === 0) {
            summaryEl.style.display = 'none';
            return;
        }

        let totalDaily = 0, totalMeal = 0;
        tempTripSelectedIds.forEach(personId => {
            const person = getAuthorPersons().find(p => String(p.id) === String(personId));
            if (person) {
                const { meal, daily } = getPersonExpense(person);
                totalDaily += daily;
                totalMeal += meal;
            }
        });

        countEl.textContent = tempTripSelectedIds.size;
        mealTotalEl.textContent = totalMeal.toLocaleString();
        dailyTotalEl.textContent = totalDaily.toLocaleString();
        summaryEl.style.display = 'block';
    }

    // 검색 기능 (프로젝트 미선택 시 프로젝트 검색, 선택 시 인원 검색)
    if (tripPersonSearchInput) {
        tripPersonSearchInput.addEventListener('input', function(e) {
            const projectIdxInput = document.getElementById('selectedProjectIdx');
            if (!projectIdxInput || !projectIdxInput.value) {
                renderProjectListInTripPersonModal(e.target.value);
            } else {
                renderTripPersonList2(e.target.value);
            }
        });
    }

    // 선택된 인원 확정 (기존 목록 교체)
    window.addSelectedPersons = async function() {
        const newPersons = [];

        tempTripSelectedIds.forEach(personId => {
            const person = getAuthorPersons().find(p => String(p.id) === String(personId));
            if (person) {
                newPersons.push({
                    id: String(personId),
                    name: person.name,
                    dept: person.dept,
                    position: person.position,
                    positionCode: person.positionCode || ''
                });
            }
        });

        // 기존 목록을 선택된 목록으로 교체
        if (window.replaceTripPersons) {
            window.replaceTripPersons(newPersons);
        }

        // 작성자가 새 목록에 없으면 재선택: 1순위 로그인 사용자, 2순위 최저직급
        if (newPersons.length > 0) {
            const authorStillIn = authorPersonId && newPersons.some(p => String(p.id) === String(authorPersonId));
            if (!authorStillIn) {
                const membersForPick = newPersons.map(p => ({
                    id: p.id, name: p.name, dept: p.dept || '',
                    position: p.position || '', positionCode: p.positionCode || ''
                }));
                const dateVal = document.getElementById('common_meeting_date')?.value;
                const startVal = document.getElementById('common_start_time')?.value;
                const endVal = document.getElementById('common_end_time')?.value;
                const projVal = document.getElementById('selectedProjectIdx')?.value;
                let newAuthor = await pickLoggedInAuthor(membersForPick, dateVal, startVal, endVal, projVal);
                if (!newAuthor) {
                    const sorted = sortByPositionAsc(membersForPick);
                    newAuthor = sorted[sorted.length - 1];
                }
                if (newAuthor && window.setAuthorInTemplate) {
                    window.setAuthorInTemplate(newAuthor);
                }
            }
        }

        if (typeof validateRequiredFields === 'function') validateRequiredFields();

        closeTripPersonModal();
    };

    // 회의 참석자 모달 관련
    const attendeeModal = document.getElementById('attendeeModal');
    const attendeeSearchInput = document.getElementById('attendeeSearchInput');

    // 모달 열기 함수
    window.openAttendeeModal = async function(meetingIdxParam) {
        currentMeetingIdx = meetingIdxParam !== undefined ? meetingIdxParam : 0;
        if (attendeeModal) {
            attendeeModal.classList.add('show');
            // 외부 참석자 임시 선택 상태 초기화
            const currentExternal = getMtgAttendees(currentMeetingIdx);
            tempSelectedExternalIds = new Set(currentExternal.map(a => String(a.id)));
            // 내부 참석자 임시 선택 상태 초기화
            const savedInternal = getMtgTripPersons(currentMeetingIdx);
            const currentInternal = savedInternal.length > 0 ? savedInternal : (window.getTripPersons ? window.getTripPersons() : []);
            tempInternalAttendeeIds = new Set(currentInternal.map(p => String(p.id)));
            await loadExternalPersons();
            renderAttendeeInternalSummary();
            await renderAttendeeList2();
            renderAttendeeModalBadges();
        }
    };

    // 모달 닫기 함수
    window.closeAttendeeModal = function() {
        if (attendeeModal) {
            attendeeModal.classList.remove('show');
            if (attendeeSearchInput) attendeeSearchInput.value = '';
            cancelNewExternal();
        }
    };

    // 모달 외부 클릭 시 닫기
    if (attendeeModal) {
        attendeeModal.addEventListener('click', function(e) {
            if (e.target === attendeeModal) {
                closeAttendeeModal();
            }
        });
    }

    // 내부 출장인원 요약 렌더링 (모달 좌측 패널) - 체크 가능
    function renderAttendeeInternalSummary() {
        const summaryEl = document.getElementById('attendeeInternalSummary');
        const countEl = document.getElementById('attendeeInternalCount');
        const totalEl = document.getElementById('attendeeInternalTotal');
        const persons = window.getTripPersons ? window.getTripPersons() : [];

        if (!summaryEl) return;

        if (countEl) countEl.textContent = persons.length > 0 ? `${persons.length}명` : '';

        if (persons.length === 0) {
            summaryEl.innerHTML = '<div class="modal-empty-state"><i class="fas fa-user-plus"></i><p>출장인원을 먼저 등록해주세요</p></div>';
            if (totalEl) totalEl.textContent = '';
            return;
        }

        let totalMeeting = 0;
        const mtgAuthorId = String(currentMeetingIdx === 0 ? meetingAuthorPersonId : (extraMeetings.find(m => m.idx === currentMeetingIdx)?.authorPersonId || ''));
        const meetingDateStr = getMeetingDateForIdx(currentMeetingIdx);
        // 참여기간 검증을 위해 projectMembers 를 employeeIdx 키로 매핑
        const memberByIdx = new Map();
        getAuthorPersons().forEach(p => memberByIdx.set(String(p.id), p));

        summaryEl.innerHTML = persons.map(person => {
            const meeting = getPersonMeetingExpense(person);
            const isChecked = tempInternalAttendeeIds.has(String(person.id));
            const isMtgAuthor = String(person.id) === mtgAuthorId;
            const memberSrc = memberByIdx.get(String(person.id));
            const isInactive = meetingDateStr && memberSrc && !isMemberActiveOnDate(memberSrc, meetingDateStr);
            if (isChecked) totalMeeting += meeting;
            const expenseText = meeting > 0 ? `회의비 ${meeting.toLocaleString()}원` : '회의비 미설정';
            const authorBadge = isMtgAuthor ? '<span style="background:#e0e7ff; color:#4338ca; padding:2px 8px; border-radius:4px; font-size:11px; margin-left:8px; white-space:nowrap;"><i class="fas fa-user-check"></i> 작성자</span>' : '';
            let inactiveBadge = '';
            if (isInactive) {
                const tip = `참여기간: ${formatMemberPeriod(memberSrc)}`;
                inactiveBadge = `<span style="background:#e5e7eb; color:#4b5563; padding:2px 8px; border-radius:4px; font-size:11px; margin-left:8px; white-space:nowrap;" data-tip="${tip}"><i class="fas fa-calendar-times"></i> 참여기간 외</span>`;
            }
            const isLocked = isMtgAuthor || isInactive;
            const checkIcon = isMtgAuthor
                ? `<i class="fas fa-check-circle" style="color:#94a3b8; font-size:18px; flex-shrink:0;"></i>`
                : (isChecked
                    ? `<i class="fas fa-check-circle" style="color:#10b981; font-size:18px; flex-shrink:0;"></i>`
                    : `<i class="far fa-circle" style="color:#d1d5db; font-size:18px; flex-shrink:0;"></i>`);
            const onclickAttr = isLocked ? '' : `onclick="selectInternalAttendee('${person.id}')"`;
            const lockedStyle = isLocked ? 'opacity: 0.6; cursor: not-allowed;' : 'cursor:pointer;';
            return `
            <div class="employee-item${isChecked ? ' selected' : ''}" ${onclickAttr} style="${lockedStyle}">
                <i class="far fa-user"></i>
                <div class="employee-info">
                    <div class="employee-name">${person.name}${authorBadge}${inactiveBadge}</div>
                    <div class="employee-detail">${person.position} · ${person.dept}</div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; margin-left:auto;">
                    <span style="font-size:11px; color:#667eea; font-weight:600; white-space:nowrap;">${expenseText}</span>
                    ${checkIcon}
                </div>
            </div>`;
        }).join('');

        if (totalEl) {
            totalEl.textContent = totalMeeting > 0 ? `합계: ${totalMeeting.toLocaleString()}원` : '';
        }
    }

    // 내부인원 선택 토글
    window.selectInternalAttendee = async function(personId) {
        const id = String(personId);

        // 작성자는 렌더링에서 클릭 차단됨 (안전장치)
        const currentMeetingAuthorId = String(currentMeetingIdx === 0 ? meetingAuthorPersonId : (extraMeetings.find(m => m.idx === currentMeetingIdx)?.authorPersonId || ''));
        if (id === currentMeetingAuthorId) return;

        if (tempInternalAttendeeIds.has(id)) {
            tempInternalAttendeeIds.delete(id);
        } else {
            // 참여기간 검증 — 회의 날짜 기준
            const meetingDateStr = getMeetingDateForIdx(currentMeetingIdx);
            if (!meetingDateStr) {
                await showWarning('회의 날짜를 먼저 입력해주세요.');
                return;
            }
            const memberSrc = getAuthorPersons().find(p => String(p.id) === id);
            if (memberSrc && !isMemberActiveOnDate(memberSrc, meetingDateStr)) {
                await showInactiveMemberAlert(memberSrc, '회의 날짜', meetingDateStr, '회의 참석자');
                return;
            }
            tempInternalAttendeeIds.add(id);
        }
        renderAttendeeInternalSummary();
        renderAttendeeModalBadges();
    };

    // 모달 하단 뱃지 영역 렌더링
    function renderAttendeeModalBadges() {
        const badgesEl = document.getElementById('attendeeModalBadges');
        const countEl = document.getElementById('attendeeModalCount');
        const totalEl = document.getElementById('attendeeModalTotalAmount');
        if (!badgesEl) return;

        const allTripPersons = window.getTripPersons ? window.getTripPersons() : [];
        const internalPersons = allTripPersons.filter(p => tempInternalAttendeeIds.has(String(p.id)));
        const externalPersons = allExternalPersons.filter(p => tempSelectedExternalIds.has(String(p.idx)));

        const totalCount = internalPersons.length + externalPersons.length;
        if (countEl) countEl.textContent = totalCount;

        let meetingTotal = 0;
        internalPersons.forEach(p => { meetingTotal += getPersonMeetingExpense(p); });
        meetingTotal += externalPersons.length * 30000;
        if (totalEl) totalEl.textContent = meetingTotal > 0 ? meetingTotal.toLocaleString() : '0';

        if (totalCount === 0) {
            badgesEl.innerHTML = '<div class="empty-state"><i class="fas fa-user-plus"></i><span>출장인원을 등록하거나 외부인원을 선택해주세요</span></div>';
            return;
        }

        const internalBadges = internalPersons.map(p =>
            `<span class="attendee-badge" data-tip="${p.position} · ${p.dept}"><i class="fas fa-building"></i> ${p.name}</span>`
        ).join('');

        const externalBadges = externalPersons.map(p =>
            `<span class="attendee-badge external" data-tip="${p.position || ''} · ${p.companyName || ''}">
                <i class="fas fa-user-tie"></i> ${p.name}
                <button class="badge-remove" onclick="removeExternalFromModalSelection(${p.idx})" data-tip="선택 해제">×</button>
            </span>`
        ).join('');

        badgesEl.innerHTML = internalBadges + externalBadges;

        // 참석자 한도 변경 시 사용금액 초과 여부 재검증
        if (typeof validateMeetingAmount === 'function') validateMeetingAmount();
    }

    // 외부인원 목록 렌더링 (외부인력만)
    async function renderAttendeeList2(searchText = '') {
        const attendeeList2El = document.getElementById('attendeeList2');
        if (!attendeeList2El) return;

        if (!allExternalPersons || allExternalPersons.length === 0) {
            attendeeList2El.innerHTML = `<div class="modal-empty-state"><i class="fas fa-user-plus"></i><p>등록된 외부인력이 없습니다<br><small>신규 등록 버튼을 클릭하세요</small></p></div>`;
            return;
        }

        const filtered = allExternalPersons.filter(person =>
            searchUtils.matchesAny(searchText, person.name, person.companyName, person.position)
        );

        if (filtered.length === 0) {
            attendeeList2El.innerHTML = `<div class="modal-empty-state"><i class="fas fa-search"></i><p>검색 결과가 없습니다</p></div>`;
            return;
        }

        // 회의 시간이 설정된 경우 시간대 중복 병렬 체크
        const isExtraMeeting = currentMeetingIdx > 0;
        const dateVal    = isExtraMeeting
            ? document.getElementById(`meeting_date_${currentMeetingIdx}`)?.value
            : document.getElementById('common_meeting_date')?.value;
        const startVal   = isExtraMeeting
            ? document.getElementById(`meeting_start_time_${currentMeetingIdx}`)?.value
            : document.getElementById('common_start_time')?.value;
        const endVal     = isExtraMeeting
            ? document.getElementById(`meeting_end_time_${currentMeetingIdx}`)?.value
            : document.getElementById('common_end_time')?.value;
        const projectVal = document.getElementById('selectedProjectIdx')?.value;
        const canCheckDup = !!(dateVal && startVal && endVal && projectVal);

        const excludeId = getUrlParameter('documentIdx') || getUrlParameter('id') || null;
        const dupResults = canCheckDup
            ? await Promise.all(filtered.map(p => checkAuthorDuplicate(String(p.idx), dateVal, startVal, endVal, projectVal, excludeId, 'RCTM', true)))
            : filtered.map(() => false);

        attendeeList2El.innerHTML = filtered.map((person, i) => {
            const isSelected = tempSelectedExternalIds.has(String(person.idx));
            const isDup = dupResults[i];
            const dupBadge = isDup
                ? `<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:4px;font-size:11px;margin-left:6px;white-space:nowrap;"><i class="fas fa-exclamation-triangle"></i> 시간 중복</span>`
                : '';
            const disabledStyle = isDup ? 'opacity:0.6;cursor:not-allowed;' : '';
            const clickHandler  = isDup ? '' : `onclick="selectExternalAttendee(${person.idx})"`;
            return `
            <div class="employee-item${isSelected ? ' selected' : ''}" data-id="${person.idx}" ${clickHandler} style="${disabledStyle}">
                <i class="far fa-user"></i>
                <div class="employee-info">
                    <div class="employee-name">${searchUtils.highlightText(person.name, searchText)}</div>
                    <div class="employee-detail">${searchUtils.highlightText(person.position || '직급 미지정', searchText)} · ${searchUtils.highlightText(person.companyName || '', searchText)}</div>
                </div>
                <span class="expense-tag" style="margin-left:auto; white-space:nowrap;">회의비 30,000원</span>
                ${dupBadge}
            </div>`;
        }).join('');
    }

    // 외부인원 선택 토글
    window.selectExternalAttendee = function(personIdx) {
        const idStr = String(personIdx);
        if (tempSelectedExternalIds.has(idStr)) {
            tempSelectedExternalIds.delete(idStr);
        } else {
            tempSelectedExternalIds.add(idStr);
        }
        // 목록 아이템 선택 상태 업데이트
        const items = document.querySelectorAll('#attendeeList2 .employee-item');
        items.forEach(item => {
            if (parseInt(item.getAttribute('data-id')) === personIdx) {
                item.classList.toggle('selected', tempSelectedExternalIds.has(idStr));
            }
        });
        renderAttendeeModalBadges();
    };

    // 모달 내 외부인원 전체 해제
    window.clearAllExternalAttendees = async function() {
        tempSelectedExternalIds.clear();
        await renderAttendeeList2(attendeeSearchInput ? attendeeSearchInput.value : '');
        renderAttendeeModalBadges();
    };

    // 모달 내 특정 외부인원 선택 해제
    window.removeExternalFromModalSelection = async function(personIdx) {
        tempSelectedExternalIds.delete(String(personIdx));
        await renderAttendeeList2(attendeeSearchInput ? attendeeSearchInput.value : '');
        renderAttendeeModalBadges();
    };

    // 검색 기능
    if (attendeeSearchInput) {
        attendeeSearchInput.addEventListener('input', async function(e) {
            await renderAttendeeList2(e.target.value);
        });
    }

    // 외부인원 신규 등록 폼 토글
    window.toggleNewExternalForm = function() {
        const form = document.getElementById('newExternalForm');
        if (!form) return;
        const isVisible = form.style.display !== 'none';
        form.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            const nameInput = document.getElementById('extName');
            if (nameInput) { nameInput.value = ''; }
            const companyInput = document.getElementById('extCompany');
            if (companyInput) { companyInput.value = ''; }
            const posInput = document.getElementById('extPosition');
            if (posInput) { posInput.value = ''; }
            setTimeout(() => { if (nameInput) nameInput.focus(); }, 100);
        }
    };

    window.cancelNewExternal = function() {
        const form = document.getElementById('newExternalForm');
        if (form) form.style.display = 'none';
    };

    window.saveNewExternal = async function() {
        const name = (document.getElementById('extName')?.value || '').trim();
        const company = (document.getElementById('extCompany')?.value || '').trim();
        const position = (document.getElementById('extPosition')?.value || '').trim();

        if (!name) {
            Swal.fire({ icon: 'warning', title: '입력 오류', text: '이름을 입력하세요.' });
            document.getElementById('extName').focus();
            return;
        }
        if (!company) {
            Swal.fire({ icon: 'warning', title: '입력 오류', text: '회사명을 입력하세요.' });
            document.getElementById('extCompany').focus();
            return;
        }

        try {
            const response = await fetch('/api/external-persons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, companyName: company, position })
            });

            if (response.ok) {
                const newPerson = await response.json();
                showSuccess('외부인력이 등록되었습니다.');
                window.cancelNewExternal();
                await loadExternalPersons();
                // 신규 등록된 외부인원을 자동으로 임시 선택 상태에 추가
                tempSelectedExternalIds.add(String(newPerson.idx));
                await renderAttendeeList2(attendeeSearchInput ? attendeeSearchInput.value : '');
                renderAttendeeModalBadges();
            } else {
                showError('외부인력 등록에 실패했습니다.');
            }
        } catch (e) {
            console.error('외부인력 등록 오류:', e);
            showError('외부인력 등록 중 오류가 발생했습니다.');
        }
    };

    // 선택된 참석자 확정 (내부 subset + 외부 선택 → 해당 회의 상태 교체)
    window.addSelectedAttendees = function() {
        // 내부 참석자 확정 (출장인원 중 체크된 인원만)
        const allTripPersons = window.getTripPersons ? window.getTripPersons() : [];
        const newInternal = allTripPersons.filter(p => tempInternalAttendeeIds.has(String(p.id)));
        setMtgTripPersons(currentMeetingIdx, newInternal);

        // 외부 참석자 확정
        const newExternalAttendees = allExternalPersons
            .filter(p => tempSelectedExternalIds.has(String(p.idx)))
            .map(p => ({
                id: String(p.idx),
                name: p.name,
                dept: p.companyName || '',
                position: p.position || '',
                isExternal: true
            }));
        setMtgAttendees(currentMeetingIdx, newExternalAttendees);

        if (currentMeetingIdx === 0) {
            if (typeof window.renderAttendeeListInTemplate === 'function') window.renderAttendeeListInTemplate();
        } else {
            renderExtraMeetingAttendees(currentMeetingIdx);
        }
        if (typeof validateRequiredFields === 'function') validateRequiredFields();

        closeAttendeeModal();
    };

    // 공식 문서 양식 토글 기능
    function setupDocumentFormToggle() {
        const documentFormToggle = document.getElementById('documentFormToggle');
        const documentFormWrapper = document.querySelector('.document-form-wrapper');

        if (documentFormToggle && documentFormWrapper) {
            documentFormToggle.addEventListener('click', function() {
                documentFormWrapper.classList.toggle('collapsed');
                documentFormToggle.classList.toggle('active');
            });
        }
    }

    // 초기화: 직원 데이터 로드
    loadEmployees();
    loadProjects();
    loadPositionCodes();
    loadFixedExpenses();
    loadExternalPersons();

    // 초기 템플릿 로드 (출장+회의)
    loadTemplate('receipt-trip');

    // 날짜/시간 입력 필드 클릭 시 선택기 열기
    setTimeout(() => {
        ['common_date', 'common_start_time', 'common_end_time'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', function() {
                    if (this.showPicker) { try { this.showPicker(); } catch(e) {} }
                });
            }
        });
    }, 0);

    // ============================================
    // 필수 필드 검증 (빨간색 + shake 애니메이션)
    // ============================================
    function validateRequiredFields() {
        if (isPopulatingForm) return; // 데이터 로드 중에는 검증 건너뜀
        // 출장 + 회의 공통 필수 텍스트 필드
        const requiredIds = ['common_project', 'common_card', 'common_author', 'common_location',
                             'common_purpose', 'common_meeting_purpose', 'common_meeting_author',
                             'common_meeting_location', 'common_meeting_content'];
        let allFilled = true;

        requiredIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            // 카드 필드: selectedCard 변수가 설정되어 있으면 자동 선택된 것이므로 유효
            const isFilled = (id === 'common_card')
                ? (selectedCard || (el.value && el.value.trim()))
                : (el.value && el.value.trim());
            if (!isFilled) {
                el.classList.add('field-empty');
                allFilled = false;
            } else {
                el.classList.remove('field-empty');
            }
        });

        // 출장 내용 및 결과 — "- 출장 내용 :" 이후에 실제 텍스트가 있는지 검증
        const tripResultEl = document.getElementById('common_trip_result');
        if (tripResultEl) {
            const marker = '- 출장 내용 :';
            const val = tripResultEl.value;
            const idx = val.indexOf(marker);
            const hasContent = idx !== -1
                ? val.slice(idx + marker.length).trim().length > 0
                : val.trim().length > 0;
            if (!hasContent) {
                tripResultEl.classList.add('field-empty');
                allFilled = false;
            } else {
                tripResultEl.classList.remove('field-empty');
            }
        }

        // 출장인원 검증
        const tripPersonArea = document.getElementById('tripPersonArea');
        if (tripPersonArea) {
            if (tripPersons.length === 0) {
                tripPersonArea.classList.add('field-empty');
                allFilled = false;
            } else {
                tripPersonArea.classList.remove('field-empty');
            }
        }

        // 날짜별 비용 검증 — 합계 > 0
        const expenseTable = document.getElementById('dailyExpenseTable');
        if (expenseTable) {
            const totalFee = dailyExpenses.reduce((s, e) => s + (e.transport||0) + (e.lodging||0) + (e.meal||0) + (e.other||0), 0);
            if (totalFee === 0) {
                expenseTable.classList.add('field-empty');
                allFilled = false;
            } else {
                expenseTable.classList.remove('field-empty');
            }
        }

        // 사용 금액 검증 (회의 카드 결제)
        const amountEl = document.getElementById('common_amount');
        if (amountEl) {
            const amountVal = parseInt((amountEl.value || '0').replace(/,/g, '')) || 0;
            if (amountVal <= 0) {
                amountEl.classList.add('field-empty');
                allFilled = false;
            } else {
                amountEl.classList.remove('field-empty');
            }
        }

        // 회의 참석자 검증 (외부인원 필수)
        const attendeeAreaEl = document.getElementById('attendeeArea');
        const externalWarningEl = document.getElementById('externalAttendeeWarning');
        if (attendeeAreaEl) {
            if (attendees.length === 0) {
                attendeeAreaEl.classList.add('field-empty');
                if (externalWarningEl) externalWarningEl.style.display = 'block';
                allFilled = false;
            } else {
                attendeeAreaEl.classList.remove('field-empty');
                if (externalWarningEl) externalWarningEl.style.display = 'none';
            }
        }

        // 추가된 회의 블록 검증
        extraMeetings.forEach(m => {
            const extraRequiredIds = [
                `meeting_purpose_${m.idx}`,
                `meeting_date_${m.idx}`,
                `meeting_start_time_${m.idx}`,
                `meeting_end_time_${m.idx}`,
                `meeting_location_${m.idx}`,
                `meeting_author_${m.idx}`
            ];
            extraRequiredIds.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                if (!el.value || !el.value.trim()) {
                    el.classList.add('field-empty');
                    allFilled = false;
                } else {
                    el.classList.remove('field-empty');
                }
            });

            // 주요 내용 — 빈칸 또는 400bytes 미만이면 red border
            const contentEl = document.getElementById(`meeting_content_${m.idx}`);
            if (contentEl) {
                const bytes = new TextEncoder().encode(contentEl.value || '').length;
                if (bytes < 400) {
                    contentEl.classList.add('field-empty');
                    allFilled = false;
                } else {
                    contentEl.classList.remove('field-empty');
                }
            }

            // 사용 금액 검증
            const amountEl = document.getElementById(`meeting_amount_${m.idx}`);
            if (amountEl) {
                const val = parseInt((amountEl.value || '0').replace(/,/g, '')) || 0;
                if (val <= 0) { amountEl.classList.add('field-empty'); allFilled = false; }
                else amountEl.classList.remove('field-empty');
            }

            // 외부 참석자 검증
            const areaEl = document.getElementById(`attendeeArea_${m.idx}`);
            const warnEl = document.getElementById(`externalAttendeeWarning_${m.idx}`);
            if (areaEl) {
                if (m.attendees.length === 0) {
                    areaEl.classList.add('field-empty');
                    if (warnEl) warnEl.style.display = 'block';
                    allFilled = false;
                } else {
                    areaEl.classList.remove('field-empty');
                    if (warnEl) warnEl.style.display = 'none';
                }
            }
        });

        // 인쇄 버튼 표시/숨김: 필수값 모두 충족 AND 초과 입력 없을 때
        const hasExpenseOverflow = document.querySelector('.expense-input[style*="color: rgb(220, 38, 38)"]') !== null;
        const printBtn = document.getElementById('printDocumentBtn');
        if (printBtn) {
            printBtn.style.display = (allFilled && !hasExpenseOverflow) ? 'inline-flex' : 'none';
        }

        return allFilled;
    }

    function scrollToFirstEmptyField() {
        const first = document.querySelector('.field-empty');
        if (first) {
            first.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const focusable = first.querySelector('input, textarea, select') || (first.matches('input, textarea, select') ? first : null);
            if (focusable) focusable.focus({ preventScroll: true });
        }
    }

    // 필드 변경 시 재검증
    ['common_project', 'common_card', 'common_location', 'common_date', 'common_purpose',
     'common_trip_result', 'common_meeting_purpose', 'common_meeting_date', 'common_amount',
     'common_start_time', 'common_end_time', 'common_meeting_location', 'common_meeting_content'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', validateRequiredFields);
            el.addEventListener('change', validateRequiredFields);
        }
    });

    // 인원/참석자 추가·제거 후 재검증 (전역 함수 래핑)
    const _origRemoveTripPerson = window.removeTripPersonInTemplate;
    window.removeTripPersonInTemplate = function(...args) {
        if (_origRemoveTripPerson) _origRemoveTripPerson(...args);
        validateRequiredFields();
    };
    const _origRemoveAttendee = window.removeAttendeeInTemplate;
    window.removeAttendeeInTemplate = function(...args) {
        if (_origRemoveAttendee) _origRemoveAttendee(...args);
        validateRequiredFields();
    };
    const _origAddPersonsToTrip = window.addPersonsToTrip;
    window.addPersonsToTrip = function(...args) {
        if (_origAddPersonsToTrip) _origAddPersonsToTrip(...args);
        validateRequiredFields();
    };
    const _origAddAttendeesToMeeting = window.addAttendeesToMeeting;
    window.addAttendeesToMeeting = function(...args) {
        if (_origAddAttendeesToMeeting) _origAddAttendeesToMeeting(...args);
        validateRequiredFields();
    };

    // 인쇄하기
    window.printDocuments = function() {
        // 문서 미리보기가 접혀 있으면 먼저 펼치기
        const wrapper = document.querySelector('.document-form-wrapper');
        const toggleIcon = document.querySelector('#documentFormToggle .toggle-icon');
        if (wrapper && wrapper.classList.contains('collapsed')) {
            wrapper.classList.remove('collapsed');
            if (toggleIcon) toggleIcon.style.transform = 'rotate(180deg)';
        }
        setTimeout(() => window.print(), 300);
    };

    // 인쇄 시 A4 맞춤 자동 조정 (beforeprint/afterprint)
    (function() {
        let savedThHeight = null;

        window.addEventListener('beforeprint', function() {
            // 참석자 수에 따라 many-attendees 클래스 적용 (4페이지 서명 테이블 축소용)
            const content = document.getElementById('documentFormContent');
            const sigRows = document.querySelectorAll('#attendee-signature-table tbody tr').length;
            if (content && sigRows > 12) content.classList.add('many-attendees');

            // 출장복명서 (2페이지): 출장내용 행을 A4에 맞게 자동 확장
            const reportPage = document.querySelector('#documentFormContent > div:nth-child(2)');
            if (!reportPage) return;
            const resultTh = reportPage.querySelector('table tr:has(.auto-trip-result) th')
                || reportPage.querySelector('table tr:last-child th');
            if (!resultTh) return;

            savedThHeight = resultTh.style.height;
            resultTh.style.setProperty('height', 'auto', 'important');

            const pxPerMm = 96 / 25.4;
            const targetPx = Math.floor(267 * pxPerMm); // 297mm - 15mm×2 padding
            const extraPx = targetPx - reportPage.scrollHeight;
            if (extraPx > 5) {
                const currentPx = resultTh.closest('tr').offsetHeight;
                resultTh.style.setProperty('height', (currentPx + extraPx) + 'px', 'important');
            }
        });

        window.addEventListener('afterprint', function() {
            const content = document.getElementById('documentFormContent');
            if (content) content.classList.remove('many-attendees');

            const reportPage = document.querySelector('#documentFormContent > div:nth-child(2)');
            if (!reportPage) return;
            const resultTh = reportPage.querySelector('table tr:has(.auto-trip-result) th')
                || reportPage.querySelector('table tr:last-child th');
            if (!resultTh) return;
            if (savedThHeight !== null) resultTh.style.height = savedThHeight;
            else resultTh.style.removeProperty('height');
            savedThHeight = null;
        });
    })();

    // 초기 필수 필드 강조 제거 — 저장/수정 버튼 클릭 시에만 빨간 테두리 표시

    // ============================================
    // 작성자 선택 모달
    // ============================================
    const authorModal = document.getElementById('authorModal');
    const authorListEl = document.getElementById('authorList');
    const authorSearchInput = document.getElementById('authorSearchInput');

    // projectMembers 원시 데이터를 person 객체로 변환
    function getAuthorPersons() {
        return projectMembers.map(m => ({
            id: m.employeeIdx || m.id,
            name: m.employeeName || m.name,
            dept: m.employeeDeptName || m.dept || '',
            position: m.employeePositionName || m.position || '',
            positionCode: m.employeePositionCode || m.positionCode || '',
            participationStartDate: m.participationStartDate || null,
            participationEndDate: m.participationEndDate || null
        }));
    }

    window.openAuthorModal = async function() {
        if (!authorModal) return;
        authorModal.classList.add('show');
        if (authorSearchInput) authorSearchInput.value = '';

        const projectIdxInput = document.getElementById('selectedProjectIdx');
        if (!projectIdxInput || !projectIdxInput.value) {
            renderProjectListInAuthorModal('');
        } else {
            if (projectMembers.length === 0) {
                await loadProjectMembers(projectIdxInput.value);
            }
            await renderAuthorList('');
        }
    };

    window.closeAuthorModal = function() {
        if (authorModal) authorModal.classList.remove('show');
        if (authorSearchInput) authorSearchInput.value = '';
    };

    // 회의 작성자 선택 모달
    const meetingAuthorModal = document.getElementById('meetingAuthorModal');
    const meetingAuthorSearchInput = document.getElementById('meetingAuthorSearchInput');
    const meetingAuthorList = document.getElementById('meetingAuthorList');

    function renderMeetingAuthorList(searchText = '') {
        if (!meetingAuthorList) return;
        const filtered = tripPersons.filter(p => {
            if (!searchText) return true;
            return (p.name || '').includes(searchText) || (p.dept || '').includes(searchText);
        });

        if (filtered.length === 0) {
            meetingAuthorList.innerHTML = `
                <div style="text-align:center; padding:40px; color:#94a3b8;">
                    <i class="fas fa-user-slash" style="font-size:32px; margin-bottom:12px; display:block;"></i>
                    ${tripPersons.length === 0 ? '출장인원을 먼저 추가해주세요.' : '검색 결과가 없습니다.'}
                </div>`;
            return;
        }

        const currentVal = document.getElementById('common_meeting_author')?.value?.split(' (')[0];
        // 회의 작성자는 해당 회의 날짜에 활성이어야 함
        const meetingDateStr = getMeetingDateForIdx(currentMeetingIdx);
        const memberByIdx = new Map();
        getAuthorPersons().forEach(p => memberByIdx.set(String(p.id), p));

        meetingAuthorList.innerHTML = filtered.map(p => {
            const isSelected = currentVal && currentVal === p.name;
            const memberSrc = memberByIdx.get(String(p.id));
            const isInactive = meetingDateStr && memberSrc && !isMemberActiveOnDate(memberSrc, meetingDateStr);
            let inactiveBadge = '';
            if (isInactive) {
                const tip = `참여기간: ${formatMemberPeriod(memberSrc)}`;
                inactiveBadge = `<span style="background:#e5e7eb; color:#4b5563; padding:2px 8px; border-radius:4px; font-size:11px; margin-left:8px; white-space:nowrap;" data-tip="${tip}"><i class="fas fa-calendar-times"></i> 참여기간 외</span>`;
            }
            const lockedStyle = isInactive ? 'opacity:0.55; cursor:not-allowed;' : '';
            const onclickAttr = isInactive ? '' : `onclick="selectMeetingAuthor('${p.id}', '${p.name}', '${p.dept || ''}', '${p.position || ''}')"`;
            return `
                <div class="employee-item${isSelected ? ' selected' : ''}" data-id="${p.id}" data-inactive="${isInactive}" ${onclickAttr} style="${lockedStyle}">
                    <i class="far fa-user"></i>
                    <div class="employee-info">
                        <div class="employee-name">${p.name}${inactiveBadge}${isSelected ? ' <i class="fas fa-check" style="color:#667eea; margin-left:4px;"></i>' : ''}</div>
                        <div class="employee-detail">${p.position || ''} · ${p.dept || ''}</div>
                    </div>
                </div>`;
        }).join('');
    }

    window.openMeetingAuthorModal = async function(meetingIdxParam) {
        currentMeetingIdx = meetingIdxParam !== undefined ? meetingIdxParam : 0;
        if (tripPersons.length === 0) {
            await showWarning('출장인원을 먼저 추가해주세요.');
            return;
        }
        if (meetingAuthorModal) meetingAuthorModal.classList.add('show');
        if (meetingAuthorSearchInput) meetingAuthorSearchInput.value = '';
        renderMeetingAuthorList('');
    };

    window.closeMeetingAuthorModal = function() {
        if (meetingAuthorModal) meetingAuthorModal.classList.remove('show');
        if (meetingAuthorSearchInput) meetingAuthorSearchInput.value = '';
    };

    if (meetingAuthorModal) {
        meetingAuthorModal.addEventListener('click', function(e) {
            if (e.target === meetingAuthorModal) closeMeetingAuthorModal();
        });
    }

    if (meetingAuthorSearchInput) {
        meetingAuthorSearchInput.addEventListener('input', function() {
            renderMeetingAuthorList(this.value);
        });
    }

    window.selectMeetingAuthor = async function(id, name, dept, position) {
        // 참여기간 검증 — 해당 회의 날짜에 활성이어야 함
        const meetingDateStr = getMeetingDateForIdx(currentMeetingIdx);
        if (!meetingDateStr) {
            await showWarning('회의 날짜를 먼저 입력해주세요.');
            return;
        }
        const memberSrc = getAuthorPersons().find(p => String(p.id) === String(id));
        if (memberSrc && !isMemberActiveOnDate(memberSrc, meetingDateStr)) {
            await showInactiveMemberAlert(memberSrc, '회의 날짜', meetingDateStr, '회의 작성자');
            return;
        }

        const oldAuthorId = getMtgAuthorId(currentMeetingIdx);
        setMtgAuthorId(currentMeetingIdx, id ? String(id) : null);
        const authorFieldId = currentMeetingIdx === 0 ? 'common_meeting_author' : `meeting_author_${currentMeetingIdx}`;
        const el = document.getElementById(authorFieldId);
        if (el) el.value = name ? `${name} (${position || dept || ''})` : '';

        // 기존 작성자가 다른 회의 블록의 작성자가 아니라면 출장인원에서 제거
        if (oldAuthorId && String(oldAuthorId) !== String(id)) {
            const isStillMeetingAuthor =
                (currentMeetingIdx !== 0 && meetingAuthorPersonId && String(meetingAuthorPersonId) === String(oldAuthorId)) ||
                extraMeetings.some(m => m.idx !== currentMeetingIdx && m.authorPersonId && String(m.authorPersonId) === String(oldAuthorId));

            if (!isStillMeetingAuthor) {
                const newTripPersons = tripPersons.filter(p => String(p.id) !== String(oldAuthorId));
                if (newTripPersons.length !== tripPersons.length && window.replaceTripPersons) {
                    // 출장 작성자가 동일인이면 함께 초기화
                    if (authorPersonId && String(authorPersonId) === String(oldAuthorId)) {
                        authorPersonId = null;
                        const authorField = document.getElementById('common_author');
                        if (authorField) authorField.value = '';
                        document.querySelectorAll('.auto-author').forEach(ae => { ae.value = ''; });
                        document.querySelectorAll('.auto-reporter').forEach(ae => { ae.textContent = ''; });
                    }
                    window.replaceTripPersons(newTripPersons);
                }
            }
        }

        if (window.updateMeetingFields) window.updateMeetingFields();
        closeMeetingAuthorModal();
    };

    if (authorModal) {
        authorModal.addEventListener('click', function(e) {
            if (e.target === authorModal) closeAuthorModal();
        });
    }

    if (authorSearchInput) {
        authorSearchInput.addEventListener('input', async function() {
            const keyword = this.value.trim();
            const projectIdxInput = document.getElementById('selectedProjectIdx');
            if (!projectIdxInput || !projectIdxInput.value) {
                renderProjectListInAuthorModal(keyword);
            } else {
                await renderAuthorList(keyword);
            }
        });
    }

    // 작성자 모달 내 프로젝트 목록 렌더링 (프로젝트 미선택 시)
    function renderProjectListInAuthorModal(searchText = '') {
        if (!authorListEl) return;

        let filtered = projects;
        if (searchText) {
            filtered = projects.filter(p => matchesSearch(p.projectName || '', searchText));
        }

        if (filtered.length === 0) {
            authorListEl.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-search" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                    ${searchText ? '검색 결과가 없습니다.' : '등록된 프로젝트가 없습니다.'}
                </div>`;
            return;
        }

        const header = `
            <div class="convenience-notice">
                <div class="notice-icon"><i class="fas fa-lightbulb"></i></div>
                <div class="notice-content">
                    <div class="notice-title">프로젝트를 먼저 선택해주세요</div>
                    <div class="notice-desc">프로젝트를 선택하면 해당 팀원 목록이 표시됩니다</div>
                </div>
            </div>`;

        const items = filtered.map(proj => `
            <div class="project-item-in-card" data-project-idx="${proj.idx}">
                <div class="project-item-icon"><i class="fas fa-folder"></i></div>
                <div class="project-item-name">${highlightText(proj.projectName || '이름 없음', searchText)}</div>
                <div class="project-item-arrow"><i class="fas fa-chevron-right"></i></div>
            </div>`).join('');

        authorListEl.innerHTML = header + items;

        authorListEl.querySelectorAll('.project-item-in-card').forEach(item => {
            item.addEventListener('click', async function() {
                const proj = projects.find(p => String(p.idx) === this.getAttribute('data-project-idx'));
                if (!proj) return;

                await applyProjectSelection(proj);

                // 검색창 비우기 후 인원 목록 렌더링
                if (authorSearchInput) authorSearchInput.value = '';
                await renderAuthorList('');
            });
        });
    }

    async function renderAuthorList(searchText = '') {
        if (!authorListEl) return;

        const persons = getAuthorPersons();

        if (persons.length === 0) {
            // 프로젝트 미선택 → 프로젝트 목록 표시
            renderProjectListInAuthorModal(searchText);
            return;
        }

        // 직급순 정렬 (높은 직급 → 낮은 직급)
        const sortedPersons = sortByPositionAsc([...persons]);

        // 검색 필터링
        const filteredPersons = searchText
            ? sortedPersons.filter(p =>
                (p.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
                (p.dept || '').toLowerCase().includes(searchText.toLowerCase()) ||
                (p.position || '').toLowerCase().includes(searchText.toLowerCase())
            )
            : sortedPersons;

        if (filteredPersons.length === 0) {
            authorListEl.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px; display: block;"></i>
                    <p>검색 결과가 없습니다.</p>
                </div>`;
            return;
        }

        // 회의 시간/날짜/프로젝트가 설정된 경우 타 문서 시간 중복 병렬 체크
        const dateVal    = document.getElementById('common_meeting_date')?.value;
        const startVal   = document.getElementById('common_start_time')?.value;
        const endVal     = document.getElementById('common_end_time')?.value;
        const projectVal = document.getElementById('selectedProjectIdx')?.value;
        const canCheckDup = !!(dateVal && startVal && endVal && projectVal);

        const excludeId = getUrlParameter('documentIdx') || getUrlParameter('id') || null;
        const dupResults = canCheckDup
            ? await Promise.all(filteredPersons.map(p => checkAuthorDuplicate(p.id, dateVal, startVal, endVal, projectVal, excludeId, 'RCTM')))
            : filteredPersons.map(() => false);

        // 겹치는 사람을 맨 아래로
        const paired = filteredPersons.map((p, i) => ({ person: p, isDup: dupResults[i] }));
        paired.sort((a, b) => (a.isDup ? 1 : 0) - (b.isDup ? 1 : 0));

        // 출장 작성자는 출장 전 기간 활성이어야 함
        const tripRange = getCurrentTripRange();

        authorListEl.innerHTML = paired.map(({ person, isDup }) => {
            const isSelected = authorPersonId && String(person.id) === String(authorPersonId);
            const selectedClass = isSelected ? 'selected' : '';
            const checkIcon = isSelected ? '<i class="fas fa-check-circle" style="color: #10b981; margin-left: auto;"></i>' : '';

            // 출장 참여 여부
            const isTripPerson = tripPersons.some(p => String(p.id) === String(person.id));
            const tripBadge = isTripPerson
                ? `<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; white-space: nowrap;"><i class="fas fa-plane"></i> 출장 참여중</span>`
                : '';

            // 회의 참석 여부
            const isMeetingAttendee = attendees.some(a => String(a.id) === String(person.id));
            const meetingBadge = isMeetingAttendee
                ? `<span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; white-space: nowrap;"><i class="fas fa-user-check"></i> 회의 참석중</span>`
                : '';

            // 타 문서 시간 중복 여부
            const dupBadge = isDup
                ? `<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; white-space: nowrap;"><i class="fas fa-exclamation-triangle"></i> 시간 중복</span>`
                : '';

            // 참여기간 외 검증 (출장 전 기간 활성)
            const isInactive = tripRange.start && !isMemberActiveDuringRange(person, tripRange.start, tripRange.end);
            let inactiveBadge = '';
            if (isInactive) {
                const tip = `참여기간: ${formatMemberPeriod(person)}`;
                inactiveBadge = `<span style="background:#e5e7eb; color:#4b5563; padding:2px 8px; border-radius:4px; font-size:11px; margin-left:8px; white-space:nowrap;" data-tip="${tip}"><i class="fas fa-calendar-times"></i> 참여기간 외</span>`;
            }

            const isLocked = isDup || isInactive;
            const disabledStyle = isLocked ? 'opacity: 0.6; cursor: not-allowed;' : '';
            const onclickAttr = isLocked ? '' : `onclick="selectAuthor(${person.id})"`;

            return `
                <div class="employee-item ${selectedClass}" data-id="${person.id}" data-dup="${isDup}" data-inactive="${isInactive}" ${onclickAttr} style="${disabledStyle}">
                    <div class="employee-info">
                        <div class="employee-name">${person.name}${tripBadge}${meetingBadge}${inactiveBadge}${dupBadge}</div>
                        <div class="employee-details">${person.dept} · ${person.position}</div>
                    </div>
                    ${checkIcon}
                </div>
            `;
        }).join('');
    }

    window.selectAuthor = async function(personId) {
        const item = document.querySelector(`#authorList .employee-item[data-id="${personId}"]`);
        if (item?.getAttribute('data-dup') === 'true') return; // 시간 중복 인원 차단
        if (item?.getAttribute('data-inactive') === 'true') return; // 참여기간 외 차단

        const person = getAuthorPersons().find(p => String(p.id) === String(personId));
        if (!person) return;

        // 참여기간 검증 (출장 전 기간) — 백업
        const tripRange = getCurrentTripRange();
        if (!tripRange.start) {
            await showWarning('출장 시작일을 먼저 입력해주세요.');
            return;
        }
        if (!isMemberActiveDuringRange(person, tripRange.start, tripRange.end)) {
            await showInactiveMemberAlert(person, '출장 기간', `${tripRange.start} ~ ${tripRange.end}`, '작성자');
            return;
        }

        if (window.setAuthorInTemplate) window.setAuthorInTemplate(person);
        closeAuthorModal();
    };

    // ============================================
    // 사용 금액 버튼
    // ============================================
    window.addAmount = function(value) {
        const el = document.getElementById('common_amount');
        if (!el) return;
        const current = parseInt(el.value.replace(/,/g, '') || '0');
        el.value = (current + value).toLocaleString();
        el.dispatchEvent(new Event('input'));
    };

    window.resetAmount = function() {
        const el = document.getElementById('common_amount');
        if (!el) return;
        el.value = '';
        el.dispatchEvent(new Event('input'));
    };

    // ============================================
    // 카드 선택 모달
    // ============================================
    const cardModal = document.getElementById('cardModal');
    const cardList = document.getElementById('cardList');
    const cardSearch = document.getElementById('cardSearch');

    function renderCardList(list, keyword = '') {
        if (!cardList) return;
        cardList.innerHTML = '';
        if (list.length === 0) {
            cardList.innerHTML = `
                <div class="modal-empty-state">
                    <i class="fas fa-credit-card"></i>
                    <p>${keyword ? '검색 결과가 없습니다' : '등록된 카드가 없습니다'}</p>
                </div>`;
            return;
        }
        list.forEach(card => {
            const item = document.createElement('div');
            item.className = 'modal-item';
            if (selectedCard && selectedCard.idx === card.idx) item.classList.add('selected');
            item.innerHTML = `
                <i class="fas fa-credit-card"></i>
                <div class="modal-item-info">
                    <div class="modal-item-name">${highlightText(card.cardName, keyword)}</div>
                    <div class="modal-item-detail">${highlightText(card.cardNumber || '카드번호 없음', keyword)}</div>
                </div>`;
            item.addEventListener('click', function() {
                selectedCard = card;
                const cardField = document.getElementById('common_card');
                if (cardField) { cardField.value = card.cardName; cardField.classList.remove('field-empty'); }
                const selectedCardIdxInput = document.getElementById('selectedCardIdx');
                if (selectedCardIdxInput) selectedCardIdxInput.value = card.idx;
                closeCardModal();
                validateRequiredFields();
            });
            cardList.appendChild(item);
        });
    }

    /**
     * 과제 선택 공통 처리 (카드 모달 / 작성자 모달 공용)
     * - 과제 필드 채우기 + field-empty 제거
     * - 관련 데이터 로드 (멤버, 경비, 카드)
     * - 첫 번째 카드 자동 선택 + field-empty 제거
     * - 기본 작성자 설정
     * - 필수 필드 재검증
     */
    async function applyProjectSelection(proj) {
        const commonProjectEl  = document.getElementById('common_project');
        const selectedProjectIdxEl = document.getElementById('selectedProjectIdx');
        const commonCardEl     = document.getElementById('common_card');
        const selectedCardIdxEl = document.getElementById('selectedCardIdx');

        if (commonProjectEl) {
            commonProjectEl.value = proj.projectName;
            commonProjectEl.classList.remove('field-empty');
        }
        if (selectedProjectIdxEl) selectedProjectIdxEl.value = proj.idx;

        document.querySelectorAll('.auto-project').forEach(el => {
            const name = proj.projectName || '';
            if (el.tagName === 'INPUT') el.value = name;
            else el.textContent = name;
            if (name.length > 35) { el.style.fontSize = '8px'; }
            else if (name.length > 25) { el.style.fontSize = '9px'; }
            else if (name.length > 15) { el.style.fontSize = '10px'; }
            else { el.style.fontSize = ''; }
        });

        await Promise.all([
            loadProjectMembers(proj.idx),
            loadProjectExpenseSettings(proj.idx)
        ]);
        updateTripExpenseTooltip();
        updateMeetingExpenseTooltip();
        if (window.refreshTripPersonBadges) window.refreshTripPersonBadges();

        await loadProjectCards(proj.idx);
        if (projectCards.length > 0) {
            const firstCard = projectCards[0];
            selectedCard = firstCard;
            if (commonCardEl) { commonCardEl.value = firstCard.cardName; commonCardEl.classList.remove('field-empty'); }
            if (selectedCardIdxEl) selectedCardIdxEl.value = firstCard.idx;
        } else {
            selectedCard = null;
            if (commonCardEl) { commonCardEl.value = ''; commonCardEl.placeholder = '클릭하여 카드 선택'; }
            if (selectedCardIdxEl) selectedCardIdxEl.value = '';
        }

        await setDefaultAuthor();
        validateRequiredFields();
    }

    function renderProjectListInCardModal(searchText = '') {
        if (!cardList) return;
        let filtered = projects;
        if (searchText) {
            filtered = projects.filter(p => matchesSearch(p.projectName || '', searchText));
        }

        if (filtered.length === 0) {
            cardList.innerHTML = `
                <div class="modal-empty-state">
                    <i class="fas fa-search"></i>
                    <p>${searchText ? '검색 결과가 없습니다' : '등록된 프로젝트가 없습니다'}</p>
                </div>`;
            return;
        }

        const header = `
            <div class="convenience-notice">
                <div class="notice-icon"><i class="fas fa-lightbulb"></i></div>
                <div class="notice-content">
                    <div class="notice-title">과제를 먼저 선택해주세요</div>
                    <div class="notice-desc">과제를 선택하면 사용 카드 목록이 표시됩니다</div>
                </div>
            </div>`;

        const items = filtered.map(proj => `
            <div class="project-item-in-card" data-project-idx="${proj.idx}">
                <div class="project-item-icon"><i class="fas fa-folder"></i></div>
                <div class="project-item-name">${highlightText(proj.projectName || '이름 없음', searchText)}</div>
                <div class="project-item-arrow"><i class="fas fa-chevron-right"></i></div>
            </div>`).join('');

        cardList.innerHTML = header + items;

        cardList.querySelectorAll('.project-item-in-card').forEach(item => {
            item.addEventListener('click', async function() {
                const proj = projects.find(p => String(p.idx) === this.getAttribute('data-project-idx'));
                if (!proj) return;

                await applyProjectSelection(proj);

                // 카드 목록으로 전환 (사용자가 원하는 카드로 변경 가능)
                renderCardList(projectCards);
                if (cardSearch) cardSearch.value = '';
            });
        });
    }

    window.openCardModal = function() {
        if (!cardModal) return;
        cardModal.classList.add('show');
        const projectIdxInput = document.getElementById('selectedProjectIdx');
        if (!projectIdxInput || !projectIdxInput.value) {
            renderProjectListInCardModal('');
        } else {
            renderCardList(projectCards);
        }
        if (cardSearch) cardSearch.value = '';
    };

    window.closeCardModal = function() {
        if (cardModal) {
            cardModal.classList.remove('show');
            if (cardSearch) cardSearch.value = '';
        }
    };

    if (cardSearch) {
        cardSearch.addEventListener('input', function() {
            const keyword = this.value.trim();
            const projectIdxInput = document.getElementById('selectedProjectIdx');
            if (!projectIdxInput || !projectIdxInput.value) {
                renderProjectListInCardModal(keyword);
            } else {
                const filtered = projectCards.filter(card =>
                    matchesSearch(card.cardName, keyword) ||
                    matchesSearch(card.cardNumber || '', keyword)
                );
                renderCardList(filtered, keyword);
            }
        });
    }

    if (cardModal) {
        cardModal.addEventListener('click', function(e) {
            if (e.target === cardModal) closeCardModal();
        });
    }

    // ============================================
    // 프로젝트 선택 모달
    // ============================================
    const projectModal = document.getElementById('projectModal');
    const projectSearchInput = document.getElementById('projectSearchInput');
    const projectList = document.getElementById('projectList');
    const commonProject = document.getElementById('common_project');

    // ── 프로젝트 연도 필터 ──────────────────────────────────────
    let selectedYear = null;
    let currentSearchKeyword = '';

    function renderYearButtons() {
        const SERVICE_START = 2026;
        const currentYear = new Date().getFullYear();
        const recentStart = Math.max(currentYear - 2, SERVICE_START);
        const existing = document.getElementById('projectYearFilter');
        if (existing) existing.remove();
        const container = document.createElement('div');
        container.id = 'projectYearFilter';
        container.style.cssText = 'display:flex; gap:6px; padding:8px 0; border-bottom:1px solid #eee; flex-wrap:wrap; align-items:center;';
        // 전체 버튼
        const allBtn = document.createElement('button');
        allBtn.type = 'button';
        allBtn.textContent = '전체';
        const allActive = selectedYear === null;
        allBtn.style.cssText = `padding:3px 10px; border-radius:12px; border:1px solid ${allActive ? '#667eea' : '#ddd'}; background:${allActive ? '#667eea' : 'white'}; color:${allActive ? 'white' : '#555'}; cursor:pointer; font-size:12px;`;
        allBtn.addEventListener('click', () => { selectedYear = null; renderYearButtons(); applyProjectFilters(); });
        container.appendChild(allBtn);
        // 오래된 연도 드롭다운 (서비스 시작연도 ~ 최근 3개년 이전)
        if (recentStart > SERVICE_START) {
            const select = document.createElement('select');
            const hasOldSelected = selectedYear !== null && selectedYear < recentStart;
            select.style.cssText = `padding:3px 8px; border-radius:12px; border:1px solid ${hasOldSelected ? '#667eea' : '#ddd'}; background:${hasOldSelected ? '#eef0ff' : 'white'}; color:#555; cursor:pointer; font-size:12px; outline:none;`;
            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = '연도선택';
            select.appendChild(defaultOpt);
            for (let y = SERVICE_START; y < recentStart; y++) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y + '년';
                if (selectedYear === y) opt.selected = true;
                select.appendChild(opt);
            }
            select.addEventListener('change', function() {
                if (this.value) { selectedYear = parseInt(this.value); renderYearButtons(); applyProjectFilters(); }
            });
            container.appendChild(select);
        }
        // 최근 3개년 버튼 (서비스 시작연도부터 최대 3개)
        for (let year = recentStart; year <= currentYear; year++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = year + '년';
            const isActive = selectedYear === year;
            btn.style.cssText = `padding:3px 10px; border-radius:12px; border:1px solid ${isActive ? '#667eea' : '#ddd'}; background:${isActive ? '#667eea' : 'white'}; color:${isActive ? 'white' : '#555'}; cursor:pointer; font-size:12px;`;
            btn.addEventListener('click', () => { selectedYear = year; renderYearButtons(); applyProjectFilters(); });
            container.appendChild(btn);
        }
        if (projectList && projectList.parentNode) {
            projectList.parentNode.insertBefore(container, projectList.parentNode.firstElementChild);
        }
    }

    function applyProjectFilters() {
        let filtered = projects;
        if (selectedYear !== null) {
            filtered = filtered.filter(proj => {
                const s = proj.startDate ? new Date(proj.startDate).getFullYear() : null;
                const e = proj.endDate ? new Date(proj.endDate).getFullYear() : null;
                if (s !== null && e !== null) return s <= selectedYear && e >= selectedYear;
                if (s !== null) return s <= selectedYear;
                if (e !== null) return e >= selectedYear;
                return true;
            });
        }
        if (currentSearchKeyword) {
            filtered = filtered.filter(proj =>
                matchesSearch(proj.projectName || '', currentSearchKeyword) ||
                matchesSearch(proj.projectManagerName || proj.projectLeader || '', currentSearchKeyword)
            );
        }
        renderProjectList(filtered, currentSearchKeyword);
    }

    // 프로젝트 목록 렌더링
    function renderProjectList(projectsToShow, keyword = '') {
        if (!projectList) return;

        if (!projectsToShow || projectsToShow.length === 0) {
            projectList.innerHTML = '<div class="modal-empty-state"><i class="fas fa-folder-open"></i><p>등록된 프로젝트가 없습니다</p></div>';
            return;
        }

        projectList.innerHTML = projectsToShow.map(proj => {
            const projectName = highlightText(proj.projectName || '이름 없음', keyword);
            const leader = proj.projectManagerName || proj.projectLeader || '-';
            const memberCount = proj.memberCount != null ? proj.memberCount : (proj.projectMembers ? proj.projectMembers.length : 0);
            const startDate = proj.startDate ? new Date(proj.startDate).toLocaleDateString('ko-KR') : (proj.projectStartDate ? new Date(proj.projectStartDate).toLocaleDateString('ko-KR') : '-');
            const endDate = proj.endDate ? new Date(proj.endDate).toLocaleDateString('ko-KR') : (proj.projectEndDate ? new Date(proj.projectEndDate).toLocaleDateString('ko-KR') : '-');

            return `
                <div class="modal-item" onclick="selectProject(${proj.idx})">
                    <div class="modal-item-info">
                        <div class="modal-item-name">${projectName}</div>
                        <div class="modal-item-detail">
                            <div><i class="fas fa-user"></i> ${leader} (${memberCount}명)</div>
                            <div><i class="fas fa-calendar"></i> ${startDate} ~ ${endDate}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 프로젝트 선택
    window.selectProject = function(projectIdx) {
        const proj = projects.find(p => p.idx === projectIdx);
        if (!proj) return;

        // 과제명 필드에 표시
        if (commonProject) {
            commonProject.value = proj.projectName;
            commonProject.style.borderColor = '';
            commonProject.classList.remove('field-empty');
        }

        const selectedProjectIdx = document.getElementById('selectedProjectIdx');
        if (selectedProjectIdx) {
            selectedProjectIdx.value = proj.idx;
        }

        // 자동 채우기
        document.querySelectorAll('.auto-project').forEach(field => {
            const name = proj.projectName || '';
            if (field.tagName === 'INPUT') field.value = name;
            else field.textContent = name;
            if (name.length > 30) { field.style.fontSize = '9px'; }
            else if (name.length > 20) { field.style.fontSize = '10px'; }
            else { field.style.fontSize = ''; }
        });

        // 참여인원 + 경비 설정 로드 → 툴팁 갱신 + 기본 작성자 자동 설정
        Promise.all([
            loadProjectMembers(proj.idx),
            loadProjectExpenseSettings(proj.idx)
        ]).then(() => {
            updateTripExpenseTooltip();
            updateMeetingExpenseTooltip();
            if (window.refreshTripPersonBadges) window.refreshTripPersonBadges();
            setDefaultAuthor();
        });

        // 카드 목록 로드 후 자동 선택
        loadProjectCards(proj.idx).then(() => {
            const cardField = document.getElementById('common_card');
            const selectedCardIdxInput = document.getElementById('selectedCardIdx');
            if (projectCards && projectCards.length > 0) {
                selectedCard = projectCards[0];
                if (cardField) {
                    cardField.value = projectCards[0].cardName;
                    cardField.placeholder = '클릭하여 카드 선택';
                    cardField.classList.remove('field-empty');
                }
                if (selectedCardIdxInput) selectedCardIdxInput.value = projectCards[0].idx;
            } else {
                selectedCard = null;
                if (cardField) {
                    cardField.value = '';
                    cardField.placeholder = '등록된 카드가 없습니다';
                }
                if (selectedCardIdxInput) selectedCardIdxInput.value = '';
            }
            validateRequiredFields();
        });

        closeProjectModal();
    };

    // 프로젝트 모달 열기
    window.openProjectModal = function() {
        if (projectModal) {
            selectedYear = new Date().getFullYear();
            currentSearchKeyword = '';
            projectModal.classList.add('show');
            if (projectSearchInput) projectSearchInput.value = '';
            renderYearButtons();
            applyProjectFilters();
        }
    };

    // 프로젝트 모달 닫기
    window.closeProjectModal = function() {
        if (projectModal) {
            projectModal.classList.remove('show');
        }
    };

    // 프로젝트 검색
    if (projectSearchInput) {
        projectSearchInput.addEventListener('input', function() {
            currentSearchKeyword = this.value.trim();
            applyProjectFilters();
        });
    }

    // 과제명 필드 클릭 이벤트
    if (commonProject) {
        commonProject.addEventListener('click', openProjectModal);
    }

    // 모달 외부 클릭 시 닫기
    if (projectModal) {
        projectModal.addEventListener('click', function(e) {
            if (e.target === projectModal) {
                closeProjectModal();
            }
        });
    }

    // 과제명이 비어있을 때 빨간색 테두리 표시 (신규 작성 모드에서만)
    if (!(getUrlParameter('documentIdx') || getUrlParameter('id'))) {
        setTimeout(() => {
            if (commonProject && !commonProject.value) {
                commonProject.style.borderColor = '#ef5350';
            }
        }, 500);
    }

    // ============================================
    // URL 파라미터 유틸리티
    // ============================================
    function getUrlParameter(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    // ============================================
    // 기존 데이터 로드 (상세보기/수정 모드)
    // ============================================
    async function loadReceiptTripMeetingData(id) {
        try {
            const data = await window.fetchWithErrorHandling(`/api/receipt-trip-meetings/${id}`);
            if (!data) return;
            loadedReceiptTripMeetingIdx = data.receiptTripMeetingIdx || null;
            await populateForm(data);
            const submitBtnEl = document.getElementById('submitBtn');
            if (submitBtnEl) submitBtnEl.style.display = 'none';
            const updateBtnEl = document.getElementById('updateBtn');
            if (updateBtnEl) updateBtnEl.style.display = 'inline-flex';
            const deleteBtnEl = document.getElementById('deleteBtn');
            if (deleteBtnEl) deleteBtnEl.style.display = 'inline-flex';
            window.hidePageLoadingOverlay();

            // 전자서명 현황 로드
            const sigDocIdx = getUrlParameter('documentIdx') || getUrlParameter('id');
            if (window.SignatureRender && sigDocIdx) {
                SignatureRender.load(sigDocIdx);
            }
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            showError('데이터를 불러오는데 실패했습니다.');
            window.hidePageLoadingOverlay();
        }
    }

    async function populateForm(data) {
        isPopulatingForm = true;
        // 수정 시 활동비 비교를 위해 원래 totalFee 저장
        window._originalTripMeetingFee = data.totalFee || 0;
        try {
        // 출장내용 자동 업데이트 방지 (userModified 먼저 설정)
        const tripResultEl = document.getElementById('common_trip_result');
        if (tripResultEl) tripResultEl.dataset.userModified = 'true';

        // 1. 프로젝트
        if (data.projectIdx) {
            const selectedProjectIdxEl = document.getElementById('selectedProjectIdx');
            if (selectedProjectIdxEl) selectedProjectIdxEl.value = data.projectIdx;

            // 먼저 참여인원/카드/경비 설정을 로드 (loadProjectMembers 가 projectName 도 캐싱)
            await Promise.all([
                loadProjectMembers(data.projectIdx),
                loadProjectCards(data.projectIdx),
                loadProjectExpenseSettings(data.projectIdx)
            ]);

            // projects 캐시에서 이름을 찾고, 없으면 loadProjectMembers 가 캐싱한 이름 사용
            const proj = projects.find(p => String(p.idx) === String(data.projectIdx));
            const projName = (proj ? proj.projectName : null) || loadedProjectName;
            console.log('[DEBUG] populateForm - projectIdx:', data.projectIdx, '/ projName:', projName);
            if (projName) {
                const pEl = document.getElementById('common_project');
                if (pEl) { pEl.value = projName; pEl.style.borderColor = ''; pEl.classList.remove('field-empty'); }
                document.querySelectorAll('.auto-project').forEach(el => {
                    if (el.tagName === 'INPUT') el.value = projName;
                    else el.textContent = projName;
                });
            }
        }

        // 2. 카드
        if (data.cardIdx) {
            const cardIdxEl = document.getElementById('selectedCardIdx');
            if (cardIdxEl) cardIdxEl.value = data.cardIdx;
            const card = projectCards.find(c => String(c.idx) === String(data.cardIdx));
            selectedCard = card || { idx: data.cardIdx, cardName: `카드 #${data.cardIdx}` };
            const cardEl = document.getElementById('common_card');
            if (cardEl) cardEl.value = selectedCard.cardName;
        }

        // 3. 박수 먼저 설정 (날짜 변경 시 row 생성에 사용)
        if (data.duration != null) {
            const durationEl = document.getElementById('common_duration');
            if (durationEl) durationEl.value = data.duration;
        }

        // 4. 출장 날짜 → 일별 경비 행 생성 + 회의 날짜 select 채우기
        if (data.tripDate) {
            const dateEl = document.getElementById('common_date');
            if (dateEl) {
                dateEl.value = data.tripDate;
                dateEl.dispatchEvent(new Event('change'));
            }
        }

        // 품의서 날짜 복원
        const requisitionDateInputPop = document.getElementById('common_requisition_date');
        if (requisitionDateInputPop) {
            requisitionDateInputPop.value = data.requisitionDate || getTodayString();
        }

        // 5. 회의 날짜 (select)
        if (data.eventDate) {
            const meetingDateEl = document.getElementById('common_meeting_date');
            if (meetingDateEl) {
                meetingDateEl.value = data.eventDate;
                meetingDateEl.dispatchEvent(new Event('change'));
            }
        }

        // 6. 회의 시작/종료 시간
        if (data.startTime) {
            const el = document.getElementById('common_start_time');
            if (el) { el.value = String(data.startTime).substring(0, 5); el.dispatchEvent(new Event('change')); }
        }
        if (data.endTime) {
            const el = document.getElementById('common_end_time');
            if (el) { el.value = String(data.endTime).substring(0, 5); el.dispatchEvent(new Event('change')); }
        }

        // 7. 텍스트 필드
        [
            { id: 'common_location',         val: data.location },
            { id: 'common_purpose',          val: data.purpose },
            { id: 'common_trip_result',      val: data.content },
            { id: 'common_meeting_purpose',  val: data.meetingPurpose },
            { id: 'common_meeting_location', val: data.meetingSessions?.[0]?.meetingLocation },
            { id: 'common_meeting_content',  val: data.minutesNotes }
        ].forEach(({ id, val }) => {
            if (!val) return;
            const el = document.getElementById(id);
            if (el) { el.value = val; el.dispatchEvent(new Event('input')); }
        });

        // 8. 회의비 금액 복원
        const meetingAmountVal = data.meetingAmount != null ? Number(data.meetingAmount) : 0;
        if (meetingAmountVal > 0) {
            const amountEl = document.getElementById('common_amount');
            if (amountEl) {
                amountEl.value = meetingAmountVal.toLocaleString('ko-KR');
                amountEl.dispatchEvent(new Event('input'));
            }
        }

        // 9. 출장 인원 복원
        // 작성자 ID를 replaceTripPersons 렌더 전에 설정해야 '삭제 불가' 뱃지가 즉시 표시됨
        if (data.drafterUserIdx) {
            authorPersonId = String(data.drafterUserIdx);
        }

        if (data.tripAttendees && data.tripAttendees.length > 0) {
            const persons = data.tripAttendees.map(att => {
                const emp = employees.find(e => String(e.id) === String(att.userIdx));
                return {
                    id: String(att.userIdx),
                    name: att.name || (emp ? emp.name : ''),
                    dept: emp ? emp.dept : '',
                    position: emp ? emp.position : ''
                };
            });
            if (window.replaceTripPersons) window.replaceTripPersons(persons);
        }

        // 작성자 UI 필드 복원 (출장인원 목록 유무와 무관하게 항상 수행)
        // replaceTripPersons 이후에도 authorPersonId를 재설정해 덮어씌우기 방지
        if (data.drafterUserIdx) {
            authorPersonId = String(data.drafterUserIdx); // replaceTripPersons가 null로 초기화했을 경우 재설정
            // employees가 아직 안 로드됐을 수 있으므로 tripAttendees.name을 우선 fallback으로 사용
            const emp = employees.find(e => String(e.id) === String(data.drafterUserIdx));
            const tripAtt = data.tripAttendees?.find(a => String(a.userIdx) === String(data.drafterUserIdx));
            const authorName = (emp ? emp.name : null) || (tripAtt ? tripAtt.name : null);
            console.log('[DEBUG] 작성자 복원 - drafterUserIdx:', data.drafterUserIdx,
                '/ emp:', emp ? emp.name : 'null(employees 미로드?)',
                '/ tripAtt.name:', tripAtt ? tripAtt.name : 'null(tripAttendees에 없음?)',
                '/ 최종 authorName:', authorName);
            const authorField = document.getElementById('common_author');
            if (authorField && authorName) {
                authorField.value = authorName;
                authorField.classList.remove('field-empty');
            }
        } else {
            console.log('[DEBUG] 작성자 복원 SKIP - drafterUserIdx 없음:', data.drafterUserIdx);
        }

        // 10. 회의 작성자 설정
        if (data.meetingDrafterUserIdx) {
            meetingAuthorPersonId = String(data.meetingDrafterUserIdx);
            const emp = employees.find(e => String(e.id) === String(data.meetingDrafterUserIdx));
            if (emp) {
                const meetingAuthorEl = document.getElementById('common_meeting_author');
                if (meetingAuthorEl) {
                    meetingAuthorEl.value = emp.position ? `${emp.name} (${emp.position})` : emp.name;
                }
            }
        }

        // 11. 회의 참석자 복원
        if (data.meetingAttendees && data.meetingAttendees.length > 0) {
            meetingTripPersons = data.meetingAttendees
                .filter(a => !a.isExternal)
                .map(att => {
                    const emp = employees.find(e => String(e.id) === String(att.userIdx));
                    const member = projectMembers.find(m => String(m.employeeIdx || m.id) === String(att.userIdx));
                    const posName = emp ? emp.position : '';
                    const posCode = member?.employeePositionCode || member?.positionCode
                        || (positionCodes.find(p => p.codeName === posName)?.code || '');
                    return {
                        id: String(att.userIdx),
                        name: att.name || (emp ? emp.name : ''),
                        dept: emp ? emp.dept : '',
                        position: posName,
                        positionCode: posCode
                    };
                });

            attendees = data.meetingAttendees
                .filter(a => a.isExternal)
                .map(att => {
                    const extPerson = allExternalPersons.find(p => String(p.idx) === String(att.userIdx));
                    return {
                        id: String(att.userIdx),
                        name: extPerson ? extPerson.name : '',
                        dept: extPerson ? (extPerson.companyName || '') : '',
                        position: extPerson ? (extPerson.position || '') : '',
                        isExternal: true
                    };
                });

            if (typeof window.renderAttendeeListInTemplate === 'function') {
                window.renderAttendeeListInTemplate();
            }
        }

        // 12. 일별 경비 복원 (DOM 렌더링 후) — await 로 isPopulatingForm 을 유지한 채 실행
        await new Promise(resolve => setTimeout(() => {
            if (data.dailyExpenses && data.dailyExpenses.length > 0) {
                const dailyExpenseBodyEl = document.getElementById('dailyExpenseBody');
                if (dailyExpenseBodyEl) {
                    const dataRows = Array.from(dailyExpenseBodyEl.children)
                        .filter(r => !r.classList.contains('expense-guide-row'));

                    data.dailyExpenses.forEach(expense => {
                        const expenseDateDot = expense.expenseDate
                            ? String(expense.expenseDate).replace(/-/g, '.') : null;
                        if (!expenseDateDot) return;
                        const row = dataRows.find(r => {
                            const dc = r.querySelector('td:first-child');
                            return dc && dc.textContent.trim() === expenseDateDot;
                        });
                        if (!row) return;

                        // 회의 날짜의 otherFee는 회의비를 빼고 표시 (수정 시 이중 합산 방지)
                        const isEventDate = data.eventDate &&
                            String(expense.expenseDate) === String(data.eventDate);
                        const otherFee = Number(expense.otherFee) || 0;
                        const displayOther = isEventDate
                            ? Math.max(0, otherFee - meetingAmountVal) : otherFee;

                        const setInput = (type, value) => {
                            if (value == null || Number(value) <= 0) return;
                            const input = row.querySelector(`[data-type="${type}"]`);
                            if (input) {
                                input.value = Number(value).toLocaleString('ko-KR');
                                input.dispatchEvent(new Event('input'));
                            }
                        };
                        setInput('transport', expense.transportationFee);
                        setInput('lodging',   expense.accommodationFee);
                        // meal·other는 출장+회의 규정상 회의비 사용 시 사용 불가 — disabled 처리됨
                    });
                }
            }

            // 공식 문서 자동 채우기 갱신
            if (window.updateMeetingFields) window.updateMeetingFields();

            // 추가 회의 세션 복원 (meetingSessions[1+])
            if (data.meetingSessions && data.meetingSessions.length > 1) {
                for (let si = 1; si < data.meetingSessions.length; si++) {
                    window.addMeetingBlock();
                    const session = data.meetingSessions[si];
                    // 추가된 블록의 idx는 meetingBlockCount - 1
                    const newIdx = meetingBlockCount - 1;
                    // 필드 복원
                    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val) { el.value = val; } };
                    setVal(`meeting_purpose_${newIdx}`, session.meetingPurpose);
                    setVal(`meeting_date_${newIdx}`, session.meetingDate);
                    setVal(`meeting_start_time_${newIdx}`, session.startTime ? String(session.startTime).substring(0, 5) : null);
                    setVal(`meeting_end_time_${newIdx}`, session.endTime ? String(session.endTime).substring(0, 5) : null);
                    setVal(`meeting_location_${newIdx}`, session.meetingLocation);
                    // 문서 미리보기 장소 동기화
                    setVal(`doc_meeting_location_${newIdx}`, session.meetingLocation);
                    setVal(`meeting_content_${newIdx}`, session.meetingContent);
                    if (session.meetingAmount) setVal(`meeting_amount_${newIdx}`, Number(session.meetingAmount).toLocaleString('ko-KR'));
                    // 작성자 복원
                    if (session.meetingDrafterUserIdx) {
                        const emp = employees.find(e => String(e.id) === String(session.meetingDrafterUserIdx));
                        setMtgAuthorId(newIdx, String(session.meetingDrafterUserIdx));
                        if (emp) setVal(`meeting_author_${newIdx}`, emp.position ? `${emp.name} (${emp.position})` : emp.name);
                    }
                    // 참석자 복원
                    if (session.meetingAttendees) {
                        const intAtt = session.meetingAttendees.filter(a => !a.isExternal).map(att => {
                            const emp = employees.find(e => String(e.id) === String(att.userIdx));
                            const member = projectMembers.find(m => String(m.employeeIdx || m.id) === String(att.userIdx));
                            const posName = emp?.position || '';
                            const posCode = member?.employeePositionCode || member?.positionCode
                                || (positionCodes.find(p => p.codeName === posName)?.code || '');
                            return { id: String(att.userIdx), name: att.name || (emp?.name||''), dept: emp?.dept||'', position: posName, positionCode: posCode };
                        });
                        const extAtt = session.meetingAttendees.filter(a => a.isExternal).map(att => {
                            const ep = allExternalPersons.find(p => String(p.idx) === String(att.userIdx));
                            return { id: String(att.userIdx), name: ep?.name||att.name||'', dept: ep?.companyName||'', position: ep?.position||'', isExternal: true };
                        });
                        setMtgTripPersons(newIdx, intAtt);
                        setMtgAttendees(newIdx, extAtt);
                        renderExtraMeetingAttendees(newIdx);
                    }
                }
            }

            // ── 최종 출장 작성자 복원 ──────────────────────────────────────────
            // 모든 데이터 복원이 끝난 뒤 마지막으로 작성자를 재설정해
            // setTimeout 내부 코드나 이벤트 핸들러가 작성자를 덮어쓰는 것을 방지한다.
            if (data.drafterUserIdx) {
                authorPersonId = String(data.drafterUserIdx);
                const finalEmp = employees.find(e => String(e.id) === String(data.drafterUserIdx));
                const finalAtt = data.tripAttendees?.find(a => String(a.userIdx) === String(data.drafterUserIdx));
                const finalName = (finalEmp ? finalEmp.name : null) || (finalAtt ? finalAtt.name : null);
                const authorField = document.getElementById('common_author');
                if (authorField && finalName) {
                    authorField.value = finalName;
                    authorField.classList.remove('field-empty');
                }
            }

            // ── 기존 첨부파일 로드 ──
            if (data.attachments && data.attachments.length > 0) {
                displayExistingAttachments(data.attachments, data.meetingSessions || []);
            }

            resolve();
        }, 300));
        } finally {
            isPopulatingForm = false;
            // isPopulatingForm 해제 후 검증 및 출장 내용 갱신
            if (typeof validateRequiredFields === 'function') validateRequiredFields();
            if (window.updateTripResult) window.updateTripResult();
            // 수정 모드 진입 즉시 — 출장/회의 작성자 + 참석자가 모든 날짜에 활성인지 재검증
            try {
                await revalidateRtmAgainstDates();
            } catch (e) {
                console.warn('[populateForm] RTM 참여기간 재검증 오류:', e);
            }
        }
    }

    // ============================================
    // 수정 버튼
    // ============================================
    const updateBtn = document.getElementById('updateBtn');
    if (updateBtn) {
        updateBtn.addEventListener('click', async function() {
            const id = loadedReceiptTripMeetingIdx || getUrlParameter('documentIdx') || getUrlParameter('id');
            if (!id) { showError('문서 ID를 찾을 수 없습니다.'); return; }

            // 필수 필드 검증 (submit과 동일)
            if (!document.getElementById('selectedProjectIdx')?.value) {
                await showWarning('과제를 선택해주세요.');
                document.getElementById('common_project')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!document.getElementById('selectedCardIdx')?.value) {
                await showWarning('사용 카드를 선택해주세요.');
                document.getElementById('common_card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            const tripDateElU = document.getElementById('common_date');
            if (!tripDateElU?.value) {
                await showWarning('출장기간을 입력해주세요.');
                tripDateElU?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!document.getElementById('common_location')?.value?.trim()) {
                await showWarning('출장지를 입력해주세요.');
                document.getElementById('common_location')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (tripPersons.length === 0) {
                await showWarning('출장인원을 추가해주세요.');
                document.getElementById('tripPersonArea')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            const purposeElU = document.getElementById('common_purpose');
            if (!purposeElU?.value?.trim()) {
                await showWarning('출장목적을 입력해주세요.');
                purposeElU?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                purposeElU?.focus({ preventScroll: true });
                return;
            }
            // 출장 내용 및 결과 검증 (수정 모드)
            {
                const tripResultElU = document.getElementById('common_trip_result');
                const markerU = '- 출장 내용 :';
                const valU = tripResultElU?.value || '';
                const markerIdxU = valU.indexOf(markerU);
                const hasContentU = markerIdxU !== -1
                    ? valU.slice(markerIdxU + markerU.length).trim().length > 0
                    : valU.trim().length > 0;
                if (!hasContentU) {
                    await showWarning('출장 내용 및 결과를 입력해주세요.');
                    tripResultElU?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    tripResultElU?.focus({ preventScroll: true });
                    return;
                }
            }
            // 날짜별 사용금액 합계 검증 (수정 모드)
            {
                const totalTripExpenseU = dailyExpenses.reduce((s, e) => s + (e.transport||0) + (e.lodging||0) + (e.meal||0) + (e.other||0), 0);
                if (totalTripExpenseU === 0) {
                    await showWarning('날짜별 사용금액을 입력해주세요.');
                    document.getElementById('dailyExpenseTable')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }
            // 1일 기준 인원 금액 초과 검증 (수정 모드)
            {
                const expenseLimitsU = window.getExpenseLimits ? window.getExpenseLimits() : {};
                const exceededTypesU = { transport: '교통비', lodging: '숙박비', meal: '식비', other: '기타(일비)' };
                let exceededLabelU = null;
                outerU: for (const expense of dailyExpenses) {
                    for (const [type, label] of Object.entries(exceededTypesU)) {
                        const limit = expenseLimitsU[type] || 0;
                        if (limit > 0 && (expense[type] || 0) > limit) {
                            exceededLabelU = label;
                            break outerU;
                        }
                    }
                }
                if (exceededLabelU) {
                    await showWarning(`1일 기준 인원 금액을 초과한 항목(${exceededLabelU})이 있습니다.\n빨간색으로 표시된 항목을 수정해주세요.`);
                    document.getElementById('dailyExpenseTable')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }
            const amountElU = document.getElementById('common_amount');
            const amountValU = parseInt((amountElU?.value || '0').replace(/[^\d]/g, '')) || 0;

            // ── 1번째 회의 필수 필드 검증 (화면 위→아래 순서, 수정 모드) ──────
            if (!document.getElementById('common_meeting_purpose')?.value?.trim()) {
                await showWarning('1번째 회의 목적을 입력해주세요.');
                document.getElementById('common_meeting_purpose')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                document.getElementById('common_meeting_purpose')?.focus({ preventScroll: true });
                return;
            }
            if (!document.getElementById('common_meeting_author')?.value?.trim()) {
                await showWarning('1번째 회의 작성자를 선택해주세요.');
                document.getElementById('common_meeting_author')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!document.getElementById('common_meeting_date')?.value) {
                await showWarning('1번째 회의 일자를 선택해주세요.');
                document.getElementById('common_meeting_date')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!document.getElementById('common_start_time')?.value) {
                await showWarning('1번째 회의 시작 시간을 입력해주세요.');
                document.getElementById('common_start_time')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                document.getElementById('common_start_time')?.focus({ preventScroll: true });
                return;
            }
            if (!document.getElementById('common_end_time')?.value) {
                await showWarning('1번째 회의 종료 시간을 입력해주세요.');
                document.getElementById('common_end_time')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                document.getElementById('common_end_time')?.focus({ preventScroll: true });
                return;
            }
            if (!document.getElementById('common_meeting_location')?.value?.trim()) {
                await showWarning('1번째 회의 장소를 입력해주세요.');
                document.getElementById('common_meeting_location')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                document.getElementById('common_meeting_location')?.focus({ preventScroll: true });
                return;
            }
            if (attendees.length === 0) {
                await showWarning('1번째 회의에 외부 참석자를 1명 이상 추가해주세요.');
                document.getElementById('attendeeArea')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!amountValU || amountValU <= 0) {
                await showWarning('1번째 회의 사용 금액을 입력해주세요.');
                amountElU?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                amountElU?.focus({ preventScroll: true });
                return;
            }
            // 참석자 금액 합계 초과 검증 (수정 모드 - 1번째 회의, JS 변수로 직접 계산)
            {
                let limitValU = 0;
                meetingTripPersons.forEach(p => { limitValU += getPersonMeetingExpense(p); });
                attendees.forEach(p => { limitValU += getPersonMeetingExpense(p); });
                if (limitValU > 0 && amountValU > limitValU) {
                    await showWarning(`1번째 회의 사용 금액(${amountValU.toLocaleString()}원)이 참석자 금액 합계(${limitValU.toLocaleString()}원)를 초과합니다.\n금액을 수정해주세요.`);
                    amountElU?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    amountElU?.focus({ preventScroll: true });
                    return;
                }
            }
            {
                const MIN_BYTES_UPD = 400;
                const contentElU = document.getElementById('common_meeting_content');
                if (contentElU) {
                    const bytes = new TextEncoder().encode(contentElU.value.trim()).length;
                    if (bytes < MIN_BYTES_UPD) {
                        await Swal.fire({
                            icon: 'warning',
                            title: '1번째 회의 내용을 더 상세히 작성해주세요',
                            html: `현재 <b>${bytes}bytes</b> 입력되었습니다.<br><br>
                                   회의 내용이 부실하게 작성된 경우 <b>정산 시 반려</b>될 수 있습니다.<br>
                                   논의된 내용, 결정 사항, 참석자별 발언 등을 구체적으로 작성해주세요.<br><br>
                                   <span style="color:#888;font-size:13px;">최소 ${MIN_BYTES_UPD}bytes 이상 입력 필요 (${MIN_BYTES_UPD - bytes}bytes 더 필요)</span>`,
                            confirmButtonText: '다시 작성하기'
                        });
                        contentElU.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        contentElU.focus();
                        return;
                    }
                }
            }

            // ── 추가된 회의 필수 필드 검증 (회의별, 화면 위→아래 순서, 수정 모드) ──
            {
                const MIN_BYTES_UPD = 400;
                for (const m of extraMeetings) {
                    const blockNum = getMeetingBlockNum(m.idx);
                    const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const focusEl  = (id) => document.getElementById(id)?.focus({ preventScroll: true });

                    if (!document.getElementById(`meeting_purpose_${m.idx}`)?.value?.trim()) {
                        await showWarning(`${blockNum}번째 회의 목적을 입력해주세요.`);
                        scrollTo(`meeting_purpose_${m.idx}`); focusEl(`meeting_purpose_${m.idx}`); return;
                    }
                    if (!document.getElementById(`meeting_author_${m.idx}`)?.value?.trim()) {
                        await showWarning(`${blockNum}번째 회의 작성자를 선택해주세요.`);
                        scrollTo(`meeting_author_${m.idx}`); return;
                    }
                    if (!document.getElementById(`meeting_date_${m.idx}`)?.value) {
                        await showWarning(`${blockNum}번째 회의 일자를 선택해주세요.`);
                        scrollTo(`meeting_date_${m.idx}`); return;
                    }
                    if (!document.getElementById(`meeting_start_time_${m.idx}`)?.value) {
                        await showWarning(`${blockNum}번째 회의 시작 시간을 입력해주세요.`);
                        scrollTo(`meeting_start_time_${m.idx}`); focusEl(`meeting_start_time_${m.idx}`); return;
                    }
                    if (!document.getElementById(`meeting_end_time_${m.idx}`)?.value) {
                        await showWarning(`${blockNum}번째 회의 종료 시간을 입력해주세요.`);
                        scrollTo(`meeting_end_time_${m.idx}`); focusEl(`meeting_end_time_${m.idx}`); return;
                    }
                    if (!document.getElementById(`meeting_location_${m.idx}`)?.value?.trim()) {
                        await showWarning(`${blockNum}번째 회의 장소를 입력해주세요.`);
                        scrollTo(`meeting_location_${m.idx}`); focusEl(`meeting_location_${m.idx}`); return;
                    }
                    if (m.attendees.length === 0) {
                        await showWarning(`${blockNum}번째 회의에 외부 참석자를 1명 이상 추가해주세요.`);
                        scrollTo(`attendeeArea_${m.idx}`); return;
                    }
                    const mAmountElU = document.getElementById(`meeting_amount_${m.idx}`);
                    const mAmountValU = parseInt((mAmountElU?.value || '0').replace(/[^\d]/g, '')) || 0;
                    if (!mAmountValU || mAmountValU <= 0) {
                        await showWarning(`${blockNum}번째 회의 사용 금액을 입력해주세요.`);
                        scrollTo(`meeting_amount_${m.idx}`); focusEl(`meeting_amount_${m.idx}`); return;
                    }
                    {
                        let mLimitValU = 0;
                        (m.tripPersonsForMeeting || []).forEach(p => { mLimitValU += getPersonMeetingExpense(p); });
                        m.attendees.forEach(p => { mLimitValU += getPersonMeetingExpense(p); });
                        if (mLimitValU > 0 && mAmountValU > mLimitValU) {
                            await showWarning(`${blockNum}번째 회의 사용 금액(${mAmountValU.toLocaleString()}원)이 참석자 금액 합계(${mLimitValU.toLocaleString()}원)를 초과합니다.\n금액을 수정해주세요.`);
                            scrollTo(`meeting_amount_${m.idx}`); focusEl(`meeting_amount_${m.idx}`); return;
                        }
                    }
                    {
                        const mContentEl = document.getElementById(`meeting_content_${m.idx}`);
                        if (mContentEl) {
                            const bytes = new TextEncoder().encode(mContentEl.value.trim()).length;
                            if (bytes < MIN_BYTES_UPD) {
                                await Swal.fire({
                                    icon: 'warning',
                                    title: `${blockNum}번째 회의 내용을 더 상세히 작성해주세요`,
                                    html: `현재 <b>${bytes}bytes</b> 입력되었습니다.<br><br>
                                           논의된 내용, 결정 사항, 참석자별 발언 등을 구체적으로 작성해주세요.<br><br>
                                           <span style="color:#888;font-size:13px;">최소 ${MIN_BYTES_UPD}bytes 이상 입력 필요 (${MIN_BYTES_UPD - bytes}bytes 더 필요)</span>`,
                                    confirmButtonText: '다시 작성하기'
                                });
                                mContentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                mContentEl.focus();
                                return;
                            }
                        }
                    }
                }
            }

            // 회의 간 시간 중복 검증 (수정 모드)
            {
                const allMtgsUpd = [
                    { date: document.getElementById('common_meeting_date')?.value, start: document.getElementById('common_start_time')?.value, end: document.getElementById('common_end_time')?.value, label: '1번째 회의' },
                    ...extraMeetings.map(m => ({
                        date:  document.getElementById(`meeting_date_${m.idx}`)?.value,
                        start: document.getElementById(`meeting_start_time_${m.idx}`)?.value,
                        end:   document.getElementById(`meeting_end_time_${m.idx}`)?.value,
                        label: `${getMeetingBlockNum(m.idx)}번째 회의`
                    }))
                ].filter(m => m.date && m.start && m.end);
                for (let i = 0; i < allMtgsUpd.length; i++) {
                    for (let j = i + 1; j < allMtgsUpd.length; j++) {
                        const a = allMtgsUpd[i], b = allMtgsUpd[j];
                        if (a.date !== b.date) continue;
                        if (a.start < b.end && b.start < a.end) { await showWarning(`${a.label}(${a.start}~${a.end})과 ${b.label}(${b.start}~${b.end})의 시간이 겹칩니다.`); return; }
                    }
                }
            }

            // 회의 참석자 전원 시간대 중복 사전 검증 (전체 세션, 현재 문서 제외)
            {
                const chkProjUpd = document.getElementById('selectedProjectIdx')?.value;
                if (chkProjUpd && await checkAllMeetingAttendeeDuplicates(chkProjUpd, id, 'RCTM')) return;
            }

            // 활동비 초과 여부 확인 (경고만, 차단 없음)
            const projIdxForBudgetUpd = document.getElementById('selectedProjectIdx')?.value;
            if (projIdxForBudgetUpd) {
                try {
                    const budgetResUpd = await fetch(`/api/projects/${projIdxForBudgetUpd}/activity-usage`);
                    if (budgetResUpd.ok) {
                        const budgetDataUpd = await budgetResUpd.json();
                        const tripFeeUpd = dailyExpenses.reduce((s, e) => s + (e.transport||0) + (e.lodging||0) + (e.meal||0) + (e.other||0), 0);
                        const meetingFeeUpd = parseInt((document.getElementById('common_amount')?.value || '0').replace(/,/g, '')) || 0;
                        const newTotalFeeUpd = tripFeeUpd + meetingFeeUpd;
                        const oldFee = window._originalTripMeetingFee || 0;
                        const adjustedSpent = (budgetDataUpd.totalSpent || 0) - oldFee + newTotalFeeUpd;
                        if (adjustedSpent > (budgetDataUpd.activityBudget || 0)) {
                            const excessAmount = adjustedSpent - (budgetDataUpd.activityBudget || 0);
                            const budgetResultUpd = await Swal.fire({
                                icon: 'warning',
                                title: '활동비 초과 경고',
                                html: `수정 금액(<b>${newTotalFeeUpd.toLocaleString()}원</b>)을 포함하면<br>활동비 예산을 <b style="color:#ef4444;">${excessAmount.toLocaleString()}원</b> 초과합니다.<br><br>그래도 수정하시겠습니까?`,
                                showCancelButton: true,
                                confirmButtonText: '수정',
                                cancelButtonText: '취소',
                                confirmButtonColor: '#667eea'
                            });
                            if (!budgetResultUpd.isConfirmed) return;
                        }
                    }
                } catch (e) {
                    console.warn('활동비 조회 실패:', e);
                }
            }

            if (!await showConfirm('수정하시겠습니까?')) return;

            // 데이터 수집 (submit과 동일)
            const projectIdxU  = document.getElementById('selectedProjectIdx')?.value;
            const cardIdxU     = document.getElementById('selectedCardIdx')?.value;
            const tripDateU    = document.getElementById('common_date')?.value;
            const durationU    = parseInt(document.getElementById('common_duration')?.value || '0');
            const meetingDateU = document.getElementById('common_meeting_date')?.value;
            const usageAmountU = parseInt((document.getElementById('common_amount')?.value || '0').replace(/,/g, '')) || 0;

            const dailyExpensesPayloadU = dailyExpenses.map(e => ({
                expenseDate:       e.date.replace(/\./g, '-'),
                transportationFee: e.transport || 0,
                accommodationFee:  e.lodging   || 0,
                mealFee:           e.meal      || 0,
                otherFee:          e.other     || 0
            }));
            if (meetingDateU && usageAmountU > 0) {
                const existing = dailyExpensesPayloadU.find(e => e.expenseDate === meetingDateU);
                if (existing) {
                    existing.otherFee += usageAmountU;
                } else {
                    dailyExpensesPayloadU.push({ expenseDate: meetingDateU, transportationFee: 0, accommodationFee: 0, mealFee: 0, otherFee: usageAmountU });
                }
            }

            const internalMeetingU = tripPersons.map((p, i) => ({
                isExternal: false, department: p.dept, name: p.name,
                userIdx: parseInt(p.id), position: p.position, displayOrder: i
            }));
            const externalMeetingU = attendees.map((p, i) => ({
                isExternal: true, department: p.dept, name: p.name,
                userIdx: parseInt(p.id), position: p.position, displayOrder: tripPersons.length + i
            }));

            const updateData = {
                projectIdx:            parseInt(projectIdxU),
                cardIdx:               cardIdxU ? parseInt(cardIdxU) : null,
                drafterUserIdx:        authorPersonId ? parseInt(authorPersonId) : null,
                meetingDrafterUserIdx: meetingAuthorPersonId ? parseInt(meetingAuthorPersonId) : null,
                tripDate:    tripDateU,
                requisitionDate: document.getElementById('common_requisition_date')?.value || null,
                duration:    durationU,
                location:    document.getElementById('common_location')?.value,
                dailyExpenses: dailyExpensesPayloadU,
                purpose:     document.getElementById('common_purpose')?.value,
                tripContent: document.getElementById('common_trip_result')?.value || '',
                tripAttendees: tripPersons.map((p, i) => ({
                    attendeeType: '내부', department: p.dept, name: p.name,
                    userIdx: parseInt(p.id), position: p.position, displayOrder: i
                })),
                meetingPurpose:   document.getElementById('common_meeting_purpose')?.value,
                meetingDate:      meetingDateU,
                meetingAmount:    usageAmountU,
                startTime:        document.getElementById('common_start_time')?.value,
                endTime:          document.getElementById('common_end_time')?.value,
                meetingContent:   document.getElementById('common_meeting_content')?.value,
                meetingAttendees: [...internalMeetingU, ...externalMeetingU],
                meetingSessions:  buildMeetingSessionsPayload()
            };

            // 삭제 예정 기존 첨부파일 순차 삭제
            for (const attId of deletedAttachmentIds) {
                try {
                    await fetch(`/api/receipt-trip-meetings/attachments/${attId}`, { method: 'DELETE' });
                } catch (e) {
                    console.warn(`첨부파일(ID: ${attId}) 삭제 실패`, e);
                }
            }

            const formDataU = new FormData();
            formDataU.append('data', JSON.stringify(updateData));
            // 회의-0 파일 (세션 position 0 → 키 접미사 없음)
            selectedMeetingReceiptFiles.forEach(f  => formDataU.append('meetingReceiptFiles',  f));
            selectedMeetingDocumentFiles.forEach(f => formDataU.append('meetingDocumentFiles', f));
            // 추가 회의 파일 (세션 position 1,2,... → _1, _2, ...)
            // m.idx 는 JS 블록 생성 순서라 삭제 시 불연속할 수 있으므로
            // extraMeetings 배열 내 순서(order+1)를 키로 사용
            extraMeetings.forEach((m, order) => {
                const sessionPos = order + 1;
                m.receiptFiles.forEach(f  => formDataU.append(`meetingReceiptFiles_${sessionPos}`,  f));
                m.documentFiles.forEach(f => formDataU.append(`meetingDocumentFiles_${sessionPos}`, f));
            });
            selectedTripReceiptFiles.forEach(f     => formDataU.append('tripReceiptFiles',     f));
            selectedTripDocumentFiles.forEach(f    => formDataU.append('tripDocumentFiles',    f));

            try {
                const response = await fetch(`/api/receipt-trip-meetings/${id}`, {
                    method: 'PUT',
                    body: formDataU
                });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || '수정에 실패했습니다.');
                }
                await Swal.fire({
                    icon: 'success',
                    title: '수정 완료',
                    text: '수정이 완료되었습니다. 잠시 후 목록으로 이동합니다.',
                    timer: 2000,
                    timerProgressBar: true,
                    showConfirmButton: true,
                    confirmButtonText: '확인'
                });
                popupAwareRedirect('/project/documents');
            } catch (e) {
                showWarning('수정 중 오류가 발생했습니다.\n' + e.message);
            }
        });
    }

    // ============================================
    // 삭제 버튼
    // ============================================
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function() {
            const id = loadedReceiptTripMeetingIdx || getUrlParameter('documentIdx') || getUrlParameter('id');
            if (!id) { showError('문서 ID를 찾을 수 없습니다.'); return; }

            const result = await Swal.fire({
                icon: 'warning',
                title: '출장+회의 삭제',
                html: '출장+회의 문서를 삭제하시겠습니까?<br>이 작업은 되돌릴 수 없습니다.',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                confirmButtonText: '삭제',
                cancelButtonText: '취소'
            });
            if (!result.isConfirmed) return;

            try {
                const response = await fetch(`/api/receipt-trip-meetings/${id}`, { method: 'DELETE' });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || '삭제에 실패했습니다.');
                }
                await Swal.fire({
                    icon: 'success',
                    title: '삭제 완료',
                    timer: 1500,
                    showConfirmButton: false
                });
                popupAwareRedirect('/project/documents');
            } catch (e) {
                showWarning('삭제 중 오류가 발생했습니다.\n' + e.message);
            }
        });
    }

    // ============================================
    // 초기화 - 상세보기/수정 모드 체크
    // ============================================
    const receiptTripMeetingId = getUrlParameter('documentIdx') || getUrlParameter('id');
    if (receiptTripMeetingId) {
        isPopulatingForm = true; // 초기 validateRequiredFields(300ms) 가 빨간테두리 찍지 않도록 선제 차단
        window.showPageLoadingOverlay();
        setTimeout(async () => {
            await loadReceiptTripMeetingData(receiptTripMeetingId);
        }, 500);
    } else {
        // 신규작성 시 초기 필수 필드 빨간색 표시
        setTimeout(() => validateRequiredFields(), 300);
        // 품의서 날짜: 신규 작성 시 오늘 날짜 기본 세팅
        const requisitionDateInput = document.getElementById('common_requisition_date');
        if (requisitionDateInput && !requisitionDateInput.value) {
            requisitionDateInput.value = getTodayString();
        }
    }

    // ============================================
    // 클립보드 이미지 붙여넣기 (패턴 C — 멀티 블록)
    // 활성 블록: 출장 영수증 OR 회의 영수증 (idx 0/1+)
    // (activeReceiptBlock, _pasteRegistered 는 loadTemplate보다 앞에서 선언됨)
    // ============================================

    function setActiveReceiptBlock(kind, idx) {
        // 모든 paste 가능 영역에서 .paste-active 제거
        document.querySelectorAll('.file-upload-area.paste-active').forEach(el => {
            el.classList.remove('paste-active');
        });
        let area = null;
        if (kind === 'trip') {
            area = document.getElementById('tripReceiptUploadArea');
        } else if (kind === 'meeting') {
            area = document.getElementById(`meetingReceiptUploadArea_${idx}`);
        }
        if (!area) return;
        area.classList.add('paste-active');
        activeReceiptBlock = { kind, idx };
    }

    function getActiveReceiptArea() {
        if (activeReceiptBlock.kind === 'trip') {
            return document.getElementById('tripReceiptUploadArea');
        }
        if (activeReceiptBlock.kind === 'meeting') {
            return document.getElementById(`meetingReceiptUploadArea_${activeReceiptBlock.idx}`);
        }
        return null;
    }

    function getActiveReceiptLabel() {
        if (activeReceiptBlock.kind === 'trip') return '출장 영수증';
        if (activeReceiptBlock.kind === 'meeting') {
            const blockNum = activeReceiptBlock.idx === 0 ? 1 :
                (typeof getMeetingBlockNum === 'function' ? getMeetingBlockNum(activeReceiptBlock.idx) : activeReceiptBlock.idx + 1);
            return `${blockNum}번째 회의 영수증`;
        }
        return '영수증';
    }

    function wireReceiptAreaClick(area, kind, idx) {
        if (!area || area._pasteWired) return;
        area._pasteWired = true;
        area.addEventListener('click', () => setActiveReceiptBlock(kind, idx));
        // paste 안내 뱃지 주입 (활성 슬롯에서만 CSS로 표시)
        if (typeof window.ensurePasteHint === 'function') {
            window.ensurePasteHint(area, { text: '여기에 Ctrl+V 붙여넣기' });
        }
    }

    function setupReceiptPasteForTripMeeting() {
        // 출장 영수증 영역
        wireReceiptAreaClick(document.getElementById('tripReceiptUploadArea'), 'trip', null);
        // 회의-0 영수증 영역
        wireReceiptAreaClick(document.getElementById('meetingReceiptUploadArea_0'), 'meeting', 0);
        // 추가 회의 영역들
        extraMeetings.forEach(m => {
            wireReceiptAreaClick(document.getElementById(`meetingReceiptUploadArea_${m.idx}`), 'meeting', m.idx);
        });

        // 출장 영수증을 기본 활성 (페이지 진입/템플릿 로드 시)
        if (!activeReceiptBlock || !getActiveReceiptArea()) {
            setActiveReceiptBlock('trip', null);
        } else {
            // 활성 블록 area가 사라지지 않은 경우 — 클래스만 다시 부착
            setActiveReceiptBlock(activeReceiptBlock.kind, activeReceiptBlock.idx);
        }

        // paste 핸들러는 한 번만 등록
        if (_pasteRegistered) return;
        if (typeof window.setupClipboardImagePaste !== 'function') return;
        _pasteRegistered = true;

        window.setupClipboardImagePaste({
            resolveTarget: () => {
                let area = getActiveReceiptArea();
                if (!area) {
                    // 폴백: 출장 → 회의-0
                    setActiveReceiptBlock('trip', null);
                    area = getActiveReceiptArea();
                    if (!area) {
                        setActiveReceiptBlock('meeting', 0);
                        area = getActiveReceiptArea();
                    }
                    if (!area) return null;
                }
                if (typeof area._processPasteFiles !== 'function') return null;
                const label = getActiveReceiptLabel();
                return {
                    addFile: (file) => {
                        const added = area._processPasteFiles([file]);
                        if (added > 0) {
                            area.classList.remove('paste-flash');
                            void area.offsetWidth;
                            area.classList.add('paste-flash');
                            return true;
                        }
                        return false;
                    },
                    label,
                };
            },
        });
    }

    // 회의 추가/삭제 시 click 리스너 재배선 + 활성 블록 보정
    // (addMeetingBlock / removeMeetingBlock 흐름과 연결)
    window.__rtmRefreshPasteWiring = function() {
        if (typeof setupReceiptPasteForTripMeeting === 'function') {
            setupReceiptPasteForTripMeeting();
        }
    };
});
