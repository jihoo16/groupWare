// 연구비 증빙 - 출장 페이지 JavaScript

function getTodayString() {
    return new Date().toISOString().slice(0, 10);
}

document.addEventListener('DOMContentLoaded', async function() {
    // 전역 변수
    let selectedApprovers = [];
    let selectedReceiptFiles = [];
    let selectedDocumentFiles = [];
    let existingReceiptAttachments = [];   // RECEIPT 타입 기존 파일
    let existingDocumentAttachments = [];  // DOCUMENT 타입 기존 파일
    let deletedAttachmentIds = [];         // 삭제 예정 첨부파일 ID 목록
    let selectedEmployee = null;
    let currentUser = null; // 현재 로그인한 사용자
    let projects = []; // 프로젝트 목록
    let projectMembers = []; // 선택된 프로젝트의 팀원 목록
    let projectExpenseSettings = []; // 선택된 프로젝트의 직급별 경비 설정 (출장비)
    let fixedExpenses = {}; // 기초정보관리의 직급별 고정경비 (출장비)
    let fixedMealExpenses = {}; // 기초정보관리의 직급별 고정경비 (중식비)
    let currentProject = null; // 현재 선택된 프로젝트 전체 정보
    window.currentTripPersons = []; // 현재 추가된 출장 인원 목록 (전역)
    let duplicateTripPersonsInfo = {}; // 중복된 출장인원 정보 {personId: {tripDate, projectName}}
    let tempTripSelectedIds = new Set(); // 출장인원 모달에서 임시 선택 상태
    let tripReporter = null; // 작성자 필드 (템플릿 로드 후 설정)
    let currentReceiptTripIdx = null; // 수정 모드 시 receipt_trip.idx (중복 체크 제외용)
    let isLoadingTripData = false;    // populateForm 실행 중 플래그 (textarea 덮어쓰기 방지)
    let projectCards = []; // 선택된 프로젝트의 카드 목록
    let selectedCard = null; // 선택된 카드
    let guideMealTotal = 0; // 선택 인원 기준 식비 합계
    let guideDailyTotal = 0; // 선택 인원 기준 일비 합계
    let hasExpenseOverflow = false; // 기준 금액 초과 여부 (저장 차단용)
    let holidays = {}; // 공휴일 캐시 { 'YYYY-MM-DD': '공휴일명', ... }
    let loadedHolidayYears = new Set(); // 이미 로드한 년도

    // DOM 요소
    const templateTreeHeaders = document.querySelectorAll('.tree-node-header[data-template]');
    const categoryNodes = document.querySelectorAll('.tree-node-header.category-node');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const documentForm = document.getElementById('documentForm');
    const approverChips = document.getElementById('approverChips');
    let receiptInput = document.getElementById('receiptInput');
    let receiptFileList = document.getElementById('receiptFileList');
    let receiptUploadArea = document.getElementById('receiptUploadArea');
    let documentInput = document.getElementById('documentInput');
    let documentFileList = document.getElementById('documentFileList');
    let documentUploadArea = document.getElementById('documentUploadArea');
    const approverModal = document.getElementById('approverModal');
    const employeeList = document.getElementById('employeeList');
    const approverSearch = document.getElementById('approverSearch');
    const submitBtn = document.getElementById('submitBtn');

    // 직원 데이터 (API로 로드)
    let employees = [];

    async function loadEmployees() {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const users = await response.json();
                employees = users.map(user => ({
                    id: user.idx,
                    name: user.empName,
                    position: user.empPositionName || user.empPosition || '직급 미지정',
                    dept: user.empDept || '부서 미지정'
                }));
            } else {
                console.error('직원 데이터 로드 실패:', response.status);
                showError('직원 데이터를 불러오는데 실패했습니다. 관리자에게 문의하세요.');
            }
        } catch (error) {
            console.error('직원 데이터 로드 오류:', error);
            showError('직원 데이터를 불러오는데 오류가 발생했습니다.');
        }
    }

    // 현재 사용자 정보 로드
    async function loadCurrentUser() {
        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                currentUser = await response.json();
            } else {
                console.error('사용자 정보 로드 실패');
            }
        } catch (error) {
            console.error('사용자 정보 로드 오류:', error);
        }
    }

    // 프로젝트 목록 로드
    async function loadProjects() {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                projects = await response.json();
                // 최근 등록된 순서로 정렬 (createdAt 기준 내림차순)
                projects.sort((a, b) => {
                    const dateA = new Date(a.createdAt);
                    const dateB = new Date(b.createdAt);
                    return dateB - dateA; // 최신순
                });
            } else {
                console.error('프로젝트 목록 로드 실패');
            }
        } catch (error) {
            console.error('프로젝트 목록 로드 오류:', error);
        }
    }

    // 프로젝트 팀원 목록 로드
    // ============================================
    // 참여기간 검증 헬퍼 (출장은 기간 검증 — 전 기간 활성)
    // ============================================

    /**
     * 멤버가 출장 전 기간 [startDateStr, endDateStr] 동안 모두 활성인지 검사한다.
     * - startDateStr 또는 endDateStr 가 비어있으면 true (날짜 미입력은 별도 검증)
     * - participationEndDate 가 null 이면 종료 미정 (무한)
     */
    function isMemberActiveDuringRange(member, startDateStr, endDateStr) {
        if (!startDateStr || !endDateStr) return true;
        if (!member || !member.participationStartDate) return false;
        if (member.participationStartDate > startDateStr) return false;
        const end = member.participationEndDate;
        if (end && end < endDateStr) return false;
        return true;
    }

    /** 멤버 참여기간을 사용자 표시용 문자열로 포맷 */
    function formatMemberPeriod(member) {
        if (!member) return '';
        const s = member.participationStartDate || '?';
        const e = member.participationEndDate || '종료 미정';
        return `${s} ~ ${e}`;
    }

    /**
     * 비활성 인원 안내 — 단일 날짜 또는 기간 케이스 모두 처리.
     * 무엇이 잘못되었는지 + 다음 액션 안내.
     */
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
     * 출장 기간(trip_date / trip_duration) 변경 또는 수정 모드 진입 시
     * 현재 선택된 작성자(reporter) 가 출장 전 기간에 활성인지 재검증.
     * 비활성이면 사용자 안내 + 작성자 필드 비움.
     */
    async function revalidateReporterAgainstTripRange() {
        const tripRange = getCurrentTripRange();
        if (!tripRange.start) return;
        const reporterEl = document.getElementById('trip_reporter');
        if (!reporterEl) return;
        const reporterId = reporterEl.getAttribute('data-reporter-id');
        if (!reporterId) return;
        if (!projectMembers || projectMembers.length === 0) return;

        const memberRaw = projectMembers.find(m => String(m.employeeIdx) === String(reporterId));
        if (!memberRaw) return;

        const memberObj = {
            name: memberRaw.employeeName,
            participationStartDate: memberRaw.participationStartDate || null,
            participationEndDate: memberRaw.participationEndDate || null
        };
        if (isMemberActiveDuringRange(memberObj, tripRange.start, tripRange.end)) return;

        // 비활성 — 안내 + 작성자 필드 비움
        await showInactiveMemberAlert(memberObj, '출장 기간', `${tripRange.start} ~ ${tripRange.end}`, '작성자');
        reporterEl.value = '';
        reporterEl.setAttribute('data-reporter-id', '');
        document.querySelectorAll('.trip-auto-reporter').forEach(field => {
            field.textContent = '';
        });
    }

    /**
     * 현재 입력된 trip_date 와 trip_duration 으로 출장 기간을 [start, end] 로 계산.
     * - duration 은 박 수 (0=당일)
     * - 출장 종료일 = tripDate + duration
     * - 둘 중 하나라도 비어있으면 [null, null] 반환
     */
    function getCurrentTripRange() {
        const dateInput = document.getElementById('trip_date');
        const durationInput = document.getElementById('trip_duration');
        const startDateStr = dateInput?.value || '';
        if (!startDateStr) return { start: null, end: null };
        const nights = parseInt(durationInput?.value || '0', 10);
        if (isNaN(nights) || nights < 0) return { start: startDateStr, end: startDateStr };
        // YYYY-MM-DD 문자열 산술: Date 객체 사용
        const startDate = new Date(startDateStr + 'T00:00:00');
        const endDate = new Date(startDate.getTime());
        endDate.setDate(endDate.getDate() + nights);
        const yyyy = endDate.getFullYear();
        const mm = String(endDate.getMonth() + 1).padStart(2, '0');
        const dd = String(endDate.getDate()).padStart(2, '0');
        return { start: startDateStr, end: `${yyyy}-${mm}-${dd}` };
    }

    async function loadProjectMembers(projectIdx) {
        if (!projectIdx) {
            projectMembers = [];
            projectExpenseSettings = [];
            currentProject = null;
            return;
        }

        try {
            const response = await fetch(`/api/projects/${projectIdx}`);

            // Content-Type 확인
            const contentType = response.headers.get('content-type');

            if (response.ok && contentType && contentType.includes('application/json')) {
                const project = await response.json();
                projectMembers = project.projectMembers || [];
                projectExpenseSettings = project.projectExpenseSettings || [];
                currentProject = project; // 전체 프로젝트 정보 저장
            } else {
                console.error('프로젝트 팀원 로드 실패 - Status:', response.status, 'Content-Type:', contentType);
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    console.error('응답 내용 (처음 200자):', text.substring(0, 200));
                }
                projectMembers = [];
                projectExpenseSettings = [];
                currentProject = null;
            }
        } catch (error) {
            console.error('프로젝트 팀원 로드 오류:', error);
            projectMembers = [];
            projectExpenseSettings = [];
            currentProject = null;
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

    // 카드 자동 선택 (첫 번째 카드) - 공통 함수
    function autoSelectCard() {
        const tripCardField = document.getElementById('trip_card');
        const selectedCardIdxInput = document.getElementById('selectedCardIdx');
        if (projectCards && projectCards.length > 0) {
            selectedCard = projectCards[0];
            if (tripCardField) {
                tripCardField.value = projectCards[0].cardName;
                tripCardField.placeholder = '클릭하여 카드 선택';
                tripCardField.classList.remove('field-empty');
            }
            if (selectedCardIdxInput) selectedCardIdxInput.value = projectCards[0].idx;
        } else {
            selectedCard = null;
            if (tripCardField) {
                tripCardField.value = '';
                tripCardField.placeholder = '등록된 카드가 없습니다';
            }
            if (selectedCardIdxInput) selectedCardIdxInput.value = '';
        }
    }

    // 기초정보관리에서 직급별 고정경비 로드 (출장비, 중식비)
    async function loadFixedExpenses() {
        try {
            const response = await fetch('/api/fixed-expense-policies');
            if (response.ok) {
                const data = await response.json();
                // 직급별로 출장비와 중식비 매핑
                fixedExpenses = {};
                fixedMealExpenses = {};
                data.forEach(item => {
                    if (!item.amount) return;
                    // positionCode(코드값)와 positionName(한글명) 둘 다 키로 저장
                    // → 어느 쪽으로 조회해도 매칭되도록
                    if (item.expenseItemName === '출장비') {
                        if (item.positionCode) fixedExpenses[item.positionCode] = item.amount;
                        if (item.positionName)  fixedExpenses[item.positionName]  = item.amount;
                    } else if (item.expenseItemName === '중식비') {
                        if (item.positionCode) fixedMealExpenses[item.positionCode] = item.amount;
                        if (item.positionName)  fixedMealExpenses[item.positionName]  = item.amount;
                    }
                });
            } else {
                console.error('직급별 고정경비 로드 실패:', response.status);
            }
        } catch (error) {
            console.error('직급별 고정경비 로드 오류:', error);
        }
    }

    // ============================================
    // SweetAlert2 유틸리티 함수들
    // ============================================

    async function showSuccess(message) {
        await Swal.fire({
            icon: 'success',
            title: '성공',
            text: message,
            timer: 2000,
            timerProgressBar: true,
            confirmButtonText: '확인'
        });
    }

    function showWarning(message) {
        return Swal.fire({
            icon: 'warning',
            title: '경고',
            html: message,
            confirmButtonText: '확인'
        });
    }

    function showError(message) {
        return Swal.fire({
            icon: 'error',
            title: '오류',
            html: message,
            confirmButtonText: '확인'
        });
    }

    function showConfirm(message, title = '확인', options = {}) {
        return Swal.fire({
            icon: options.icon || 'question',
            title: title,
            html: message,
            showCancelButton: true,
            confirmButtonText: options.confirmText || '확인',
            cancelButtonText: options.cancelText || '취소',
            confirmButtonColor: options.confirmColor || '#667eea',
            cancelButtonColor: options.cancelColor || '#94a3b8'
        }).then(result => result.isConfirmed);
    }

    function showDeleteConfirm(itemName = '이 항목') {
        return Swal.fire({
            icon: 'warning',
            title: `${itemName} 삭제`,
            html: `${itemName} 문서를 삭제하시겠습니까?<br>이 작업은 되돌릴 수 없습니다.`,
            showCancelButton: true,
            confirmButtonText: '삭제',
            cancelButtonText: '취소',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8'
        }).then(result => result.isConfirmed);
    }

    // ============================================
    // 프로젝트 선택 모달
    // ============================================
    const projectModal = document.getElementById('projectModal');
    const projectSearch = document.getElementById('projectSearch');
    const projectList = document.getElementById('projectList');

    // 검색 유틸리티 (공통)
    const searchUtils = new SearchUtils();
    const matchesSearch = (text, keyword) => searchUtils.matchesSearch(text, keyword);
    const highlightText = (text, keyword) => searchUtils.highlightText(text, keyword);

    // 프로젝트 목록 렌더링
    function renderProjectList(projectsToShow, keyword = '') {
        if (!projectList) return;

        if (!projectsToShow || projectsToShow.length === 0) {
            projectList.innerHTML = '<div class="empty-state">프로젝트가 없습니다.</div>';
            return;
        }

        projectList.innerHTML = '';

        projectsToShow.forEach(proj => {
            const projectName = proj.projectName || '이름 없음';
            const leader = proj.projectManagerName || '-';
            const memberCount = proj.memberCount || 0;
            const startDate = proj.startDate ? new Date(proj.startDate).toLocaleDateString('ko-KR') : '-';
            const endDate = proj.endDate ? new Date(proj.endDate).toLocaleDateString('ko-KR') : '-';

            const item = document.createElement('div');
            item.className = 'modal-item';
            item.innerHTML = `
                <div class="modal-item-info">
                    <div class="modal-item-name">${projectName}</div>
                    <div class="modal-item-detail">
                        <div><i class="fas fa-user"></i> ${leader} (${memberCount}명)</div>
                        <div><i class="fas fa-calendar"></i> ${startDate} ~ ${endDate}</div>
                    </div>
                </div>
            `;

            // 클릭 이벤트 리스너 추가
            item.addEventListener('click', async function() {
                await selectProject(proj.idx);
            });

            projectList.appendChild(item);
        });
    }

    // 프로젝트 선택
    window.selectProject = async function(projectIdx) {
        const proj = projects.find(p => p.idx == projectIdx);
        if (!proj) {
            console.error('프로젝트를 찾을 수 없습니다:', projectIdx);
            showError(`프로젝트를 찾을 수 없습니다. (ID: ${projectIdx})<br>페이지를 새로고침해주세요.`);
            return;
        }


        // 프로젝트 변경 시 출장인원 초기화
        window.currentTripPersons = [];

        // 프로젝트 팀원 & 카드 로드
        await Promise.all([
            loadProjectMembers(projectIdx),
            loadProjectCards(projectIdx)
        ]);

        // 카드 자동 선택 (첫 번째 카드)
        autoSelectCard();

        // 프로젝트 입력 필드에 표시
        const tripProject = document.getElementById('trip_project');
        if (tripProject) {
            tripProject.value = proj.projectName;
            tripProject.style.borderColor = '';
            tripProject.classList.remove('field-empty');
        }
        const selectedProjectIdx = document.getElementById('selectedProjectIdx');
        if (selectedProjectIdx) {
            selectedProjectIdx.value = proj.idx;
        }

        // 출장복명서의 과제명 자동 채우기
        document.querySelectorAll('.trip-auto-project').forEach(field => {
            field.textContent = proj.projectName || '';
        });

        // 연구책임자명 자동 채우기
        document.querySelectorAll('.trip-auto-pi').forEach(field => {
            field.textContent = proj.projectManagerName || '';
        });

        // 프로젝트 변경 시 중복 검증 먼저 실행 후 작성자 설정 (중복 인원 제외)
        await window.checkAllTripPersonsForDuplicates();
        await setDefaultReporter();

        // 날짜가 선택된 경우, 선택 가능한 인원이 있는지 확인
        const dateInput = document.getElementById('trip_date');
        if (dateInput && dateInput.value && projectMembers && projectMembers.length > 0) {
            // 프로젝트 팀원 전체 ID 목록
            const allMemberIds = projectMembers.map(m => m.employeeIdx);

            // 중복된 인원 ID 목록
            const duplicateIds = Object.keys(duplicateTripPersonsInfo).map(id => parseInt(id));

            // 선택 가능한 인원 수 = 전체 인원 - 중복 인원
            const availableCount = allMemberIds.filter(id => !duplicateIds.includes(id)).length;

            if (availableCount === 0) {
                await Swal.fire({
                    icon: 'warning',
                    title: '선택 가능한 인원이 없습니다',
                    html: `
                        <div style="text-align: left; line-height: 1.8;">
                            <p style="margin-bottom: 12px;">
                                <strong>${dateInput.value}</strong> 날짜에는<br>
                                모든 프로젝트 팀원이 이미 다른 일정에 참여 중입니다.
                            </p>
                            <p style="color: #64748b; font-size: 14px; margin-bottom: 8px;">
                                ▪ 회의, 야근, 출장 중 하나 이상에 참석
                            </p>
                            <p style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 6px; font-size: 14px;">
                                💡 <strong>해결 방법:</strong><br>
                                출장 날짜를 다른 날짜로 변경해주세요.
                            </p>
                        </div>
                    `,
                    confirmButtonText: '확인',
                    confirmButtonColor: '#667eea'
                });

                // 출장인원 초기화
                window.currentTripPersons = [];
                if (typeof window.renderTripPersonListInTemplate === 'function') {
                    window.renderTripPersonListInTemplate();
                }

                // 작성자 필드 초기화
                const tripReporter = document.getElementById('trip_reporter');
                if (tripReporter) {
                    tripReporter.value = '';
                    tripReporter.setAttribute('data-reporter-id', '');
                }
            }
        }

        // 직급별 경비 툴팁 갱신
        updateExpenseTooltip();

        closeProjectModal();

        // setDefaultReporter 내 setTimeout(100ms) 완료 후 검증
        setTimeout(() => {
            window._tripLoadingData = false;
            validateRequiredFields();
        }, 300);
    };

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
                matchesSearch(proj.projectManagerName || '', currentSearchKeyword)
            );
        }
        renderProjectList(filtered, currentSearchKeyword);
    }

    // 프로젝트 검색
    if (projectSearch) {
        projectSearch.addEventListener('input', function() {
            currentSearchKeyword = this.value.trim();
            applyProjectFilters();
        });
    }

    // 프로젝트 모달 열기
    window.openProjectModal = async function() {
        if (!projectModal) {
            console.error('projectModal 요소를 찾을 수 없습니다.');
            showError('프로젝트 선택 모달을 찾을 수 없습니다. 페이지를 새로고침해주세요.');
            return;
        }

        // 프로젝트 목록이 비어있으면 다시 로드
        if (!projects || projects.length === 0) {
            await loadProjects();
        }

        selectedYear = new Date().getFullYear();
        currentSearchKeyword = '';
        projectModal.classList.add('show');
        if (projectSearch) projectSearch.value = '';
        renderYearButtons();
        applyProjectFilters();
    };

    // 프로젝트 모달 닫기
    window.closeProjectModal = function() {
        if (projectModal) {
            projectModal.classList.remove('show');
            if (projectSearch) projectSearch.value = '';
        }
    };

    // 모달 외부 클릭 시 닫기
    if (projectModal) {
        projectModal.addEventListener('click', function(e) {
            if (e.target === projectModal) {
                closeProjectModal();
            }
        });
    }

    // ============================================
    // 카드 선택 모달
    // ============================================
    const cardModal  = document.getElementById('cardModal');
    const cardList   = document.getElementById('cardList');
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
            if (selectedCard && selectedCard.idx === card.idx) {
                item.classList.add('selected');
            }
            item.innerHTML = `
                <i class="fas fa-credit-card"></i>
                <div class="modal-item-info">
                    <div class="modal-item-name">${card.cardName}</div>
                    <div class="modal-item-detail">${card.cardNumber || '카드번호 없음'}</div>
                </div>`;
            item.addEventListener('click', function() {
                selectedCard = card;
                const tripCardField = document.getElementById('trip_card');
                if (tripCardField) {
                    tripCardField.value = card.cardName;
                    tripCardField.classList.remove('field-empty');
                }
                const selectedCardIdxInput = document.getElementById('selectedCardIdx');
                if (selectedCardIdxInput) selectedCardIdxInput.value = card.idx;
                closeCardModal();
                validateRequiredFields();
            });
            cardList.appendChild(item);
        });
    }

    window.openCardModal = function() {
        if (!cardModal) return;
        cardModal.classList.add('show');
        if (cardSearch) cardSearch.value = '';

        const projectIdxInput = document.getElementById('selectedProjectIdx');
        if (!projectIdxInput || !projectIdxInput.value) {
            renderProjectListInCardModal('');
        } else {
            renderCardList(projectCards);
        }
    };

    // 카드 모달 - 프로젝트 미선택 시 프로젝트 목록 렌더링
    function renderProjectListInCardModal(searchText = '') {
        if (!cardList) return;

        let filtered = projects;
        if (searchText) {
            filtered = projects.filter(p => matchesSearch(p.projectName || '', searchText));
        }

        if (filtered.length === 0) {
            cardList.innerHTML = `<div class="modal-empty-state"><i class="fas fa-search"></i><p>${searchText ? '검색 결과가 없습니다' : '등록된 프로젝트가 없습니다'}</p></div>`;
            return;
        }

        const header = `
            <div class="convenience-notice">
                <div class="notice-icon"><i class="fas fa-lightbulb"></i></div>
                <div class="notice-content">
                    <div class="notice-title">과제를 먼저 선택해주세요</div>
                    <div class="notice-desc">과제를 선택하면 카드 목록이 표시됩니다</div>
                </div>
            </div>`;

        const items = filtered.map(proj => `
            <div class="project-item-in-attendee" data-project-idx="${proj.idx}">
                <div class="project-item-icon"><i class="fas fa-folder"></i></div>
                <div class="project-item-info">
                    <div class="project-item-name">${highlightText(proj.projectName || '이름 없음', searchText)}</div>
                </div>
                <div class="project-item-arrow"><i class="fas fa-chevron-right"></i></div>
            </div>`).join('');

        cardList.innerHTML = header + items;

        cardList.querySelectorAll('.project-item-in-attendee').forEach(item => {
            item.addEventListener('click', async function() {
                const projectIdx = this.getAttribute('data-project-idx');
                const proj = projects.find(p => String(p.idx) === String(projectIdx));
                if (!proj) return;

                // 과제 필드 채우기
                const tripProjectEl = document.getElementById('trip_project');
                if (tripProjectEl) {
                    tripProjectEl.value = proj.projectName;
                    tripProjectEl.classList.remove('field-empty');
                }
                const selectedProjectIdxEl = document.getElementById('selectedProjectIdx');
                if (selectedProjectIdxEl) selectedProjectIdxEl.value = proj.idx;

                document.querySelectorAll('.trip-auto-project').forEach(el => {
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = proj.projectName;
                    else el.textContent = proj.projectName;
                });

                document.querySelectorAll('.trip-auto-pi').forEach(el => {
                    el.textContent = proj.projectManagerName || '';
                });

                // 참여인원 + 카드 로드
                await Promise.all([
                    loadProjectMembers(proj.idx),
                    loadProjectCards(proj.idx)
                ]);

                // 카드 자동 선택 후 카드 목록으로 전환
                autoSelectCard();
                updateExpenseTooltip();
                if (cardSearch) cardSearch.value = '';
                renderCardList(projectCards);
                setTimeout(() => validateRequiredFields(), 100);
            });
        });
    }

    window.closeCardModal = function() {
        if (cardModal) {
            cardModal.classList.remove('show');
            if (cardSearch) cardSearch.value = '';
        }
    };

    if (cardSearch) {
        cardSearch.addEventListener('input', function() {
            const projectIdxInput = document.getElementById('selectedProjectIdx');
            if (!projectIdxInput || !projectIdxInput.value) {
                renderProjectListInCardModal(this.value.trim());
                return;
            }
            const keyword = this.value.trim().toLowerCase();
            const filtered = projectCards.filter(card =>
                card.cardName.toLowerCase().includes(keyword) ||
                (card.cardNumber || '').toLowerCase().includes(keyword)
            );
            renderCardList(filtered, keyword);
        });
    }

    if (cardModal) {
        cardModal.addEventListener('click', function(e) {
            if (e.target === cardModal) closeCardModal();
        });
    }

    // ============================================
    // 작성자 선택 모달
    // ============================================
    const reporterModal = document.getElementById('reporterModal');
    const reporterList = document.getElementById('reporterList');
    const reporterSearch = document.getElementById('reporterSearch');

    // 작성자 선택 모달 열기
    window.openReporterModal = function() {

        if (!reporterModal) {
            console.error('❌ reporterModal 요소를 찾을 수 없습니다.');
            return;
        }

        reporterModal.classList.add('show');
        if (reporterSearch) reporterSearch.value = '';
        if (reporterSearch) reporterSearch.focus();

        // 프로젝트 미선택 시 모달 안에서 프로젝트 목록 표시
        const projectIdxInput = document.getElementById('selectedProjectIdx');
        if (!projectIdxInput || !projectIdxInput.value) {
            renderProjectListInReporterModal('');
        } else {
            renderReporterList('');
        }
    };

    // 작성자 모달 - 프로젝트 미선택 시 프로젝트 목록 렌더링
    function renderProjectListInReporterModal(searchText = '') {
        if (!reporterList) return;

        let filtered = projects;
        if (searchText) {
            filtered = projects.filter(p => matchesSearch(p.projectName || '', searchText));
        }

        if (filtered.length === 0) {
            reporterList.innerHTML = `<div class="modal-empty-state"><i class="fas fa-search"></i><p>${searchText ? '검색 결과가 없습니다' : '등록된 프로젝트가 없습니다'}</p></div>`;
            return;
        }

        const header = `
            <div class="convenience-notice">
                <div class="notice-icon"><i class="fas fa-lightbulb"></i></div>
                <div class="notice-content">
                    <div class="notice-title">과제를 먼저 선택해주세요</div>
                    <div class="notice-desc">과제를 선택하면 작성자 목록이 표시됩니다</div>
                </div>
            </div>`;

        const items = filtered.map(proj => `
            <div class="project-item-in-attendee" data-project-idx="${proj.idx}">
                <div class="project-item-icon"><i class="fas fa-folder"></i></div>
                <div class="project-item-info">
                    <div class="project-item-name">${highlightText(proj.projectName || '이름 없음', searchText)}</div>
                </div>
                <div class="project-item-arrow"><i class="fas fa-chevron-right"></i></div>
            </div>`).join('');

        reporterList.innerHTML = header + items;

        reporterList.querySelectorAll('.project-item-in-attendee').forEach(item => {
            item.addEventListener('click', async function() {
                const projectIdx = this.getAttribute('data-project-idx');
                const proj = projects.find(p => String(p.idx) === String(projectIdx));
                if (!proj) return;

                // 과제 필드 채우기
                const tripProjectEl = document.getElementById('trip_project');
                if (tripProjectEl) {
                    tripProjectEl.value = proj.projectName;
                    tripProjectEl.classList.remove('field-empty');
                }
                const selectedProjectIdxEl = document.getElementById('selectedProjectIdx');
                if (selectedProjectIdxEl) selectedProjectIdxEl.value = proj.idx;

                document.querySelectorAll('.trip-auto-project').forEach(el => {
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = proj.projectName;
                    else el.textContent = proj.projectName;
                });

                // PI(연구책임자) 정보 채우기
                document.querySelectorAll('.trip-auto-pi').forEach(el => {
                    el.textContent = proj.projectManagerName || '';
                });

                // 참여인원 + 카드 로드 (projectExpenseSettings은 loadProjectMembers 내부에서 함께 로드됨)
                await Promise.all([
                    loadProjectMembers(proj.idx),
                    loadProjectCards(proj.idx)
                ]);

                // 카드 자동 선택 (첫 번째 카드)
                autoSelectCard();

                // 직급별 경비 툴팁 갱신
                updateExpenseTooltip();

                // 작성자 목록으로 전환
                if (reporterSearch) reporterSearch.value = '';
                renderReporterList('');
                setTimeout(() => validateRequiredFields(), 100);
            });
        });
    }

    // 작성자 선택 모달 닫기
    window.closeReporterModal = function() {
        if (reporterModal) {
            reporterModal.classList.remove('show');
            if (reporterSearch) reporterSearch.value = '';
        }
    };

    // 작성자 목록 렌더링
    function renderReporterList(searchText = '') {
        if (!reporterList) return;

        // 항상 프로젝트 팀원 전체 표시 (출장인원은 "참석중" 뱃지로 구분)
        let personsToShow = [];
        if (projectMembers && projectMembers.length > 0) {
            personsToShow = projectMembers.map(member => ({
                id: member.employeeIdx,
                name: member.employeeName,
                position: member.employeePositionName || '직급 미지정',
                positionCode: member.employeePositionCode || '',
                dept: member.employeeDeptName || '부서 미지정',
                participationStartDate: member.participationStartDate || null,
                participationEndDate: member.participationEndDate || null
            }));
        }

        if (personsToShow.length === 0) {
            reporterList.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">선택 가능한 인원이 없습니다.</div>';
            return;
        }

        // 직급 높은순 정렬 후 검색 필터링
        const sortedPersons = sortByPosition([...personsToShow]).reverse();
        const keyword = searchText.trim().toLowerCase();
        const filtered = keyword
            ? sortedPersons.filter(p =>
                p.name.toLowerCase().includes(keyword) ||
                (p.dept || '').toLowerCase().includes(keyword) ||
                (p.position || '').toLowerCase().includes(keyword))
            : sortedPersons;

        if (filtered.length === 0) {
            reporterList.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">검색 결과가 없습니다.</div>';
            return;
        }

        // 현재 선택된 작성자 ID
        const currentReporterId = tripReporter ? tripReporter.getAttribute('data-reporter-id') : null;
        // 출장 기간 (작성자 참여기간 검증용)
        const tripRange = getCurrentTripRange();

        reporterList.innerHTML = filtered.map(person => {
            const isSelected = String(person.id) === String(currentReporterId);
            const selectedClass = isSelected ? 'selected' : '';
            const checkIcon = isSelected
                ? '<i class="fas fa-check-circle" style="color: #10b981; margin-left: auto;"></i>'
                : '';

            // 이미 출장인원 목록에 있으면 "출장 참여중" 뱃지 표시
            const isTripPerson = (window.currentTripPersons || []).some(p => String(p.id) === String(person.id));
            const attendeeBadge = isTripPerson
                ? `<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; white-space: nowrap;"><i class="fas fa-plane"></i> 출장 참여중</span>`
                : '';

            // 중복 출장 경고 뱃지
            const isDuplicate = duplicateTripPersonsInfo[person.id];
            let duplicateBadge = '';
            if (isDuplicate) {
                let tooltipText = `이미 ${isDuplicate.date}에 ${isDuplicate.projectName} 프로젝트 ${isDuplicate.type}`;
                if (isDuplicate.startTime && isDuplicate.endTime) {
                    tooltipText += ` (${isDuplicate.startTime} ~ ${isDuplicate.endTime})`;
                }
                tooltipText += '이 있습니다.';
                duplicateBadge = `<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; white-space: nowrap;" data-tip="${tooltipText}"><i class="fas fa-exclamation-triangle"></i> 시간 중복</span>`;
            }

            // 참여기간 외 검증
            const isInactive = tripRange.start && !isMemberActiveDuringRange(person, tripRange.start, tripRange.end);
            let inactiveBadge = '';
            if (isInactive) {
                const tip = `참여기간: ${formatMemberPeriod(person)}`;
                inactiveBadge = `<span style="background:#e5e7eb; color:#4b5563; padding:2px 8px; border-radius:4px; font-size:11px; margin-left:8px; white-space:nowrap;" data-tip="${tip}"><i class="fas fa-calendar-times"></i> 참여기간 외</span>`;
            }
            const isLocked = isInactive || !!isDuplicate;
            const lockedStyle = isLocked ? 'opacity:0.55; cursor:not-allowed;' : '';
            const onclickAttr = isLocked ? '' : `onclick="selectReporter(${person.id}, '${person.name.replace(/'/g, "\\'")}', '${(person.position || '').replace(/'/g, "\\'")}', '${(person.dept || '').replace(/'/g, "\\'")}', '${(person.positionCode || '').replace(/'/g, "\\'")}')"`;

            return `
                <div class="employee-item ${selectedClass}" data-id="${person.id}" data-inactive="${isInactive}" data-dup="${isDuplicate ? 'true' : 'false'}" ${onclickAttr} style="${lockedStyle}">
                    <div class="employee-info">
                        <div class="employee-name">${person.name}${attendeeBadge}${inactiveBadge}${duplicateBadge}</div>
                        <div class="employee-details">${person.dept} · ${person.position}</div>
                    </div>
                    ${checkIcon}
                </div>
            `;
        }).join('');
    }

    // 검색 입력 이벤트
    if (reporterSearch) {
        reporterSearch.addEventListener('input', function() {
            const projectIdxInput = document.getElementById('selectedProjectIdx');
            if (!projectIdxInput || !projectIdxInput.value) {
                renderProjectListInReporterModal(this.value);
                return;
            }
            renderReporterList(this.value);
        });
    }

    // 작성자 선택
    window.selectReporter = async function(reporterId, reporterName, position, dept, positionCode) {
        // 참여기간 검증 — 출장 전 기간 활성이어야 함
        const tripRange = getCurrentTripRange();
        if (!tripRange.start) {
            await Swal.fire({ icon: 'warning', title: '출장 시작일을 먼저 입력해주세요.' });
            return;
        }
        const reporterMember = (projectMembers || []).find(m => String(m.employeeIdx) === String(reporterId));
        if (reporterMember) {
            const memberObj = {
                name: reporterName,
                participationStartDate: reporterMember.participationStartDate,
                participationEndDate: reporterMember.participationEndDate
            };
            if (!isMemberActiveDuringRange(memberObj, tripRange.start, tripRange.end)) {
                const dateLabel = '출장 기간';
                const dateValue = `${tripRange.start} ~ ${tripRange.end}`;
                await showInactiveMemberAlert(memberObj, dateLabel, dateValue, '작성자');
                return;
            }
        }

        // 중복 출장 차단 — 시간 중복된 인원은 작성자 선택 불가 (UI에서도 disabled 처리됨)
        const dupInfo = duplicateTripPersonsInfo[reporterId];
        if (dupInfo) {
            await ReceiptCommon.showTimeConflictBlock({
                personName: reporterName,
                projectName: dupInfo.projectName,
                startTime: dupInfo.startTime,
                endTime: dupInfo.endTime,
                type: dupInfo.type
            });
            return;
        }

        // 이전 작성자를 출장인원에서 제거 (새 작성자와 다른 경우)
        const previousReporterId = tripReporter ? tripReporter.getAttribute('data-reporter-id') : null;
        if (previousReporterId && String(previousReporterId) !== String(reporterId)) {
            window.currentTripPersons = window.currentTripPersons.filter(
                p => String(p.id) !== String(previousReporterId)
            );
        }

        if (tripReporter) {
            tripReporter.value = reporterName;
            tripReporter.setAttribute('data-reporter-id', reporterId);
        }

        // 출장복명서의 복명자 필드도 업데이트
        document.querySelectorAll('.trip-auto-reporter').forEach(field => {
            field.textContent = reporterName || '';
        });

        // 작성자를 출장인원에 자동 추가 (아직 없는 경우)
        if (!window.currentTripPersons.some(p => String(p.id) === String(reporterId))) {
            const posName = position || '직급 미지정';
            const posCode = positionCode || '';

            // 일비(출장비): 1순위 projectExpenseSettings, 2순위 fixedExpenses
            let tripExpense = 0;
            if (projectExpenseSettings && projectExpenseSettings.length > 0 && posCode) {
                const projectSetting = projectExpenseSettings.find(s =>
                    s.positionCode === posCode && s.expenseItemName === '출장비'
                );
                if (projectSetting && projectSetting.amount) {
                    tripExpense = projectSetting.amount;
                } else {
                    tripExpense = fixedExpenses[posCode] || fixedExpenses[posName] || 0;
                }
            } else {
                tripExpense = fixedExpenses[posCode] || fixedExpenses[posName] || 0;
            }

            // 식비(중식비): 1순위 projectExpenseSettings, 2순위 fixedMealExpenses
            let mealExpense = 0;
            if (projectExpenseSettings && projectExpenseSettings.length > 0 && posCode) {
                const mealSetting = projectExpenseSettings.find(s =>
                    s.positionCode === posCode && s.expenseItemName === '중식비'
                );
                if (mealSetting && mealSetting.amount) {
                    mealExpense = mealSetting.amount;
                }
            }
            if (!mealExpense) {
                mealExpense = fixedMealExpenses[posCode] || fixedMealExpenses[posName] || 0;
            }

            window.currentTripPersons.push({
                id: String(reporterId),
                name: reporterName,
                position: posName,
                dept: dept || '부서 미지정',
                mealExpense: mealExpense,
                tripExpense: tripExpense
            });
        }

        // 작성자 변경 → 뱃지·제거버튼 즉시 갱신 (이미 목록에 있어도 반드시 재렌더)
        if (typeof renderTripPersonListInTemplate === 'function') {
            renderTripPersonListInTemplate();
        }

        closeReporterModal();
        validateRequiredFields();
    };

    // 모달 외부 클릭 시 닫기
    if (reporterModal) {
        reporterModal.addEventListener('click', function(e) {
            if (e.target === reporterModal) {
                closeReporterModal();
            }
        });
    }

    // 페이지 로드 시 데이터 로드
    Promise.all([loadCurrentUser(), loadProjects(), loadEmployees(), loadFixedExpenses()]).then(() => {
        // 고정경비 로드 완료 후 툴팁·출장인원 목록 재갱신
        updateExpenseTooltip();
        if (window.currentTripPersons && window.currentTripPersons.length > 0) {
            if (typeof window.renderTripPersonListInTemplate === 'function') {
                window.renderTripPersonListInTemplate();
            }
        }
    });

    // 직책 목록
    const positions = ['상무', '연구위원', '부장', '수석', '차장', '책임', '과장', '선임', '대리', '사원', '연구원'];

    // 작성자 기본 선택용 직급 순서 (낮은 직급부터)
    const authorPositionOrder = {
        '사원': 1,
        '주임': 2,
        '대리': 3,
        '과장': 4,
        '차장': 5,
        '부장': 6,
        '이사': 7,
        '상무': 8,
        '전무': 9,
        '부사장': 10,
        '사장': 11,
        '대표': 12,
        '대표이사': 12,
        // 연구원 직급
        '연구원': 1,
        '주임연구원': 2,
        '선임연구원': 3,
        '책임연구원': 4,
        '수석연구원': 5
    };

    // 직급으로 정렬 (낮은 직급부터)
    function sortByPosition(persons) {
        return persons.sort((a, b) => {
            const orderA = authorPositionOrder[a.position] || 999;
            const orderB = authorPositionOrder[b.position] || 999;
            return orderA - orderB;
        });
    }

    // 기본 작성자 설정 (출장인원 중 가장 낮은 직급)
    async function setDefaultReporter() {
        // 이미 작성자가 설정되어 있고, 출장인원에 포함되어 있으며, 중복이 없는 경우 변경하지 않음
        const existingReporter = document.getElementById('trip_reporter');
        const existingReporterId = existingReporter ? existingReporter.getAttribute('data-reporter-id') : null;
        if (existingReporterId &&
            window.currentTripPersons.some(p => String(p.id) === String(existingReporterId)) &&
            !duplicateTripPersonsInfo[existingReporterId]) {
            return;
        }

        // 프로젝트 팀원이 없으면 현재 사용자로 설정
        if (!projectMembers || projectMembers.length === 0) {
            const tripReporter = document.getElementById('trip_reporter');
            if (tripReporter && currentUser) {
                tripReporter.value = currentUser.empName || '';
                tripReporter.setAttribute('data-reporter-id', currentUser.idx || '');

                // 출장복명서의 복명자 필드도 업데이트
                document.querySelectorAll('.trip-auto-reporter').forEach(field => {
                    field.textContent = currentUser.empName || '';
                });
            }
            return;
        }

        // 프로젝트 팀원을 직급순으로 정렬 (높은 직급부터)
        const allMembers = projectMembers.map(member => ({
            id: member.employeeIdx,
            name: member.employeeName,
            position: member.employeePositionName || '직급 미지정',
            positionCode: member.employeePositionCode,
            dept: member.employeeDeptName || '부서 미지정'
        }));

        // 공통 모듈로 기본 작성자 선택 (1순위 로그인 사용자, 2순위 직급 기반)
        // rank 전략: 원래 코드는 "낮은 직급 정렬 후 reverse → 높은 직급 3번째(index 2) or 마지막"
        //   → 공통 모듈의 sortedAsc(낮은 직급→높은 직급) 기준으로 뒤에서 3번째 or 첫 번째
        const rankStrategy = (sortedAsc) => {
            const pool = sortedAsc;
            if (pool.length >= 3) return pool[pool.length - 3];
            return pool[0]; // 3명 미만이면 가장 낮은 직급
        };

        const { author: defaultReporter } = await ReceiptCommon.pickDefaultAuthor({
            candidates: allMembers,
            getPositionOrder: (m) => authorPositionOrder[m.position] || 999,
            loggedInUserIdx: currentUser?.idx,
            duplicateMap: duplicateTripPersonsInfo,
            rankStrategy
        });

        if (defaultReporter) {
            const tripReporter = document.getElementById('trip_reporter');
            if (tripReporter) {
                tripReporter.value = defaultReporter.name;
                tripReporter.setAttribute('data-reporter-id', defaultReporter.id);
            }

            // 출장복명서의 복명자 필드도 업데이트
            document.querySelectorAll('.trip-auto-reporter').forEach(field => {
                field.textContent = defaultReporter.name || '';
            });

            // 작성자를 출장인원에 자동 추가 (아직 없는 경우)
            if (!window.currentTripPersons.some(p => String(p.id) === String(defaultReporter.id))) {
                // 경비 정보 계산 - 1순위: projectExpenseSettings, 2순위: fixedExpenses
                const rptCode = defaultReporter.positionCode;
                const rptName = defaultReporter.position;
                const rptMealSetting  = projectExpenseSettings.find(s => s.positionCode === rptCode && s.expenseItemName === '중식비');
                const rptTripSetting  = projectExpenseSettings.find(s => s.positionCode === rptCode && s.expenseItemName === '출장비');
                defaultReporter.mealExpense = (rptMealSetting?.amount) || fixedMealExpenses[rptCode] || fixedMealExpenses[rptName] || 0;
                defaultReporter.tripExpense  = (rptTripSetting?.amount) || fixedExpenses[rptCode]     || fixedExpenses[rptName]     || 0;
                window.currentTripPersons.push(defaultReporter);
            }

            // 작성자 변경 후 인원 목록 갱신 (뱃지·제거버튼 즉시 반영)
            if (typeof window.renderTripPersonListInTemplate === 'function') {
                window.renderTripPersonListInTemplate();
            }
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

    // 템플릿 로드
    function loadTemplate(templateKey) {
        const templateElement = document.getElementById('template-' + templateKey);
        if (templateElement) {
            documentForm.innerHTML = templateElement.innerHTML;
            if (templateKey === 'receipt-trip') {
                // DOM이 완전히 렌더링된 후 초기화 함수 호출
                setTimeout(() => {
                    setupTripAutoFill();
                    setupDocumentFormToggle();
                    // 템플릿 로드 후 documentForm 내 실제 DOM 요소로 재할당
                    receiptInput = document.getElementById('receiptInput');
                    receiptFileList = document.getElementById('receiptFileList');
                    receiptUploadArea = document.getElementById('receiptUploadArea');
                    documentInput = document.getElementById('documentInput');
                    documentFileList = document.getElementById('documentFileList');
                    documentUploadArea = document.getElementById('documentUploadArea');
                    // 실제 visible 요소에 파일 업로드 이벤트 재등록
                    if (receiptInput && receiptUploadArea) {
                        setupUpload(receiptInput, receiptUploadArea, selectedReceiptFiles, updateReceiptFileList);
                        // paste 활성 표시 + 뱃지 (항상 단일 슬롯이므로 상시 활성)
                        receiptUploadArea.classList.add('paste-active');
                        if (typeof window.ensurePasteHint === 'function') {
                            window.ensurePasteHint(receiptUploadArea, { text: '여기에 Ctrl+V 붙여넣기' });
                        }
                    }
                    if (documentInput && documentUploadArea) {
                        setupUpload(documentInput, documentUploadArea, selectedDocumentFiles, updateDocumentFileList);
                    }
                }, 0);
            }
        }
    }

    // 출장 자동 채우기 기능
    function setupTripAutoFill() {

        const tripProject = document.getElementById('trip_project');
        const tripLocation = document.getElementById('trip_location');
        const tripDate = document.getElementById('trip_date');
        const tripDuration = document.getElementById('trip_duration');
        const tripPurpose = document.getElementById('trip_purpose');
        tripReporter = document.getElementById('trip_reporter'); // 전역 변수에 할당
        const tripResult = document.getElementById('trip_result');
        const tripPersonArea = document.getElementById('tripPersonArea');
        const tripPersonList = document.getElementById('tripPersonList');
        const dailyExpenseBody = document.getElementById('dailyExpenseBody');


        let tripPersons = [];
        let dailyExpenses = [];

        // 프로젝트 input 클릭 시 모달 열기 이벤트 리스너 추가
        if (tripProject) {
            tripProject.addEventListener('click', openProjectModal);
        }

        // 작성자 필드 클릭 시 모달 열기 이벤트 리스너 추가
        if (tripReporter) {
            tripReporter.style.cursor = 'pointer';

            // 클릭 시 모달 열기
            tripReporter.addEventListener('click', function(e) {
                e.stopPropagation();
                openReporterModal();
            });

            // 직접 입력 방지 (복사/붙여넣기 포함)
            tripReporter.addEventListener('keydown', function(e) {
                e.preventDefault();
            });
            tripReporter.addEventListener('paste', function(e) {
                e.preventDefault();
            });
            tripReporter.addEventListener('cut', function(e) {
                e.preventDefault();
            });
        } else {
            console.error('❌ tripReporter 요소를 찾을 수 없습니다!');
        }

        // 프로젝트 선택 시 팀원 로드 및 과제명 자동 채우기
        if (tripProject) {
            tripProject.addEventListener('change', async function() {
                const projectIdx = this.value;

                if (projectIdx) {
                    // 프로젝트 팀원 로드 (currentProject도 함께 저장됨)
                    await loadProjectMembers(projectIdx);

                    // 과제명 자동 채우기 (currentProject에서 가져오기)
                    if (currentProject) {
                        document.querySelectorAll('.trip-auto-project').forEach(field => {
                            field.textContent = currentProject.projectName || '';
                        });

                        // 연구책임자명 자동 채우기
                        document.querySelectorAll('.trip-auto-pi').forEach(field => {
                            field.textContent = currentProject.projectManagerName || '';
                        });
                    }
                } else {
                    projectMembers = [];
                    currentProject = null;
                    // 과제명, 연구책임자명 초기화
                    document.querySelectorAll('.trip-auto-project').forEach(field => {
                        field.textContent = '';
                    });
                    document.querySelectorAll('.trip-auto-pi').forEach(field => {
                        field.textContent = '';
                    });
                }
            });
        }

        // 출장품의서 인원 테이블 동적 생성 (행 수 = 실제 인원, 최소 1행)
        function updateTripPersonDisplay() {
            const headerRow = document.getElementById('tripPersonHeaderRow');
            if (!headerRow) return;

            const table = headerRow.closest('table');
            if (!table) return;

            // 기존 인원 행 모두 제거
            table.querySelectorAll('.trip-person-row').forEach(r => r.remove());

            const persons = window.currentTripPersons || [];
            const count = Math.max(1, persons.length);

            // rowspan 업데이트 (헤더 행 1 + 인원 행 N)
            ['tripLocationCell', 'tripDateCell', 'tripPurposeCell'].forEach(id => {
                const cell = document.getElementById(id);
                if (cell) cell.rowSpan = count + 1;
            });

            // 인원 행 삽입
            let insertAfter = headerRow;
            for (let i = 0; i < count; i++) {
                const person = persons[i];
                const dept = person ? (person.dept || '') : '';
                const deptFontSize = dept.length >= 5 ? '9px' : '11px';
                const tr = document.createElement('tr');
                tr.className = 'trip-person-row';
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

        // 출장인원 영역 클릭 시 모달 열기
        if (tripPersonArea) {
            tripPersonArea.addEventListener('click', function(e) {
                // 제거 버튼 클릭은 무시
                if (e.target.closest('.trip-person-remove')) {
                    return;
                }
                // 출장인원 항목이나 추가 버튼 클릭은 무시
                if (e.target.closest('.trip-person-item') || e.target.closest('.add-more-persons-btn')) {
                    return;
                }
                // 출장인원이 있을 경우 영역 클릭으로 모달 열지 않음
                if (window.currentTripPersons.length > 0) {
                    return;
                }
                openTripPersonModal();
            });
        }

        // 직급 순서 정의
        const positionOrder = {
            '대표이사': 1,
            '이사': 2,
            '수석연구원': 3,
            '책임연구원': 4,
            '선임연구원': 5,
            '연구원': 6,
            '주임연구원': 7,
            '사원': 8
        };

        // 출장인원 정렬 함수
        function sortTripPersons(persons) {
            return [...persons].sort((a, b) => {
                // 1. 내부/외부 구분 (내부 우선)
                const typeA = a.type || 'internal';
                const typeB = b.type || 'internal';

                if (typeA === 'internal' && typeB === 'external') return -1;
                if (typeA === 'external' && typeB === 'internal') return 1;

                // 2. 내부: 직급 순으로 정렬
                if (typeA === 'internal' && typeB === 'internal') {
                    const orderA = positionOrder[a.position] || 999;
                    const orderB = positionOrder[b.position] || 999;
                    return orderA - orderB;
                }

                // 3. 외부: 회사명 순, 같은 회사면 직급 순
                if (typeA === 'external' && typeB === 'external') {
                    const deptA = a.dept || '';
                    const deptB = b.dept || '';
                    if (deptA !== deptB) {
                        return deptA.localeCompare(deptB, 'ko');
                    }
                    const orderA = positionOrder[a.position] || 999;
                    const orderB = positionOrder[b.position] || 999;
                    return orderA - orderB;
                }

                return 0;
            });
        }

        // 출장인원 목록 렌더링 함수 (모달 방식)
        window.renderTripPersonListInTemplate = function() {
            if (!tripPersonList) return;

            // tripPersonArea에 has-attendees 클래스 추가/제거
            if (tripPersonArea) {
                if (window.currentTripPersons.length > 0) {
                    tripPersonArea.classList.add('has-attendees');
                } else {
                    tripPersonArea.classList.remove('has-attendees');
                }
            }

            if (window.currentTripPersons.length === 0) {
                tripPersonList.innerHTML = `
                    <div class="empty-attendee-state">
                        <i class="fas fa-user-plus"></i>
                        <div>클릭하여 출장인원 추가</div>
                    </div>
                `;
                hideAddPersonButton();
            } else {
                // 출장인원 정렬
                const sortedPersons = sortTripPersons(window.currentTripPersons);

                // 현재 작성자 ID 가져오기
                const currentReporterId = tripReporter ? tripReporter.getAttribute('data-reporter-id') : null;

                tripPersonList.innerHTML = sortedPersons.map(person => {
                    const externalBadge = person.type === 'external'
                        ? '<span class="external-badge">외부</span>'
                        : '';

                    // 작성자인지 확인
                    const isReporter = currentReporterId && String(person.id) === String(currentReporterId) && person.type !== 'external';
                    const reporterBadge = isReporter ? '<span class="author-badge">작성자</span>' : '';

                    // 경비 정보 계산 (내부 인원만)
                    let expenseDisplay = '';
                    if (person.type !== 'external') {
                        const positionName = person.position;
                        const mealExpense  = person.mealExpense  || fixedMealExpenses[positionName] || 0;
                        const dailyExpense = person.tripExpense  || fixedExpenses[positionName]     || 0;
                        const totalExpense = mealExpense + dailyExpense;
                        if (totalExpense > 0) {
                            expenseDisplay = `<span class="expense-tag">일비 ${dailyExpense.toLocaleString()}원 · 식비 ${mealExpense.toLocaleString()}원</span>`;
                        }
                    }

                    const personClass = [
                        'trip-person-item',
                        person.type === 'external' ? 'external-attendee' : '',
                        isReporter ? 'is-author' : ''
                    ].filter(Boolean).join(' ');

                    // 중복 검증 결과 확인
                    const isDuplicate = duplicateTripPersonsInfo[person.id];
                    let duplicateWarning = '';
                    if (isDuplicate) {
                        let tooltipText = `이미 ${isDuplicate.date}에 ${isDuplicate.projectName} 프로젝트 ${isDuplicate.type}`;
                        if (isDuplicate.startTime && isDuplicate.endTime) {
                            tooltipText += ` (${isDuplicate.startTime} ~ ${isDuplicate.endTime})`;
                        }
                        tooltipText += '이 있습니다.';

                        duplicateWarning = `<i class="fas fa-exclamation-triangle duplicate-warning"
                                              data-tip="${tooltipText}"
                                              style="color: #f59e0b; margin-left: 8px; cursor: help;"></i>`;
                    }

                    const removeButton = isReporter
                        ? `<span class="cannot-remove-text"><i class="fas fa-lock"></i> 삭제 불가</span>`
                        : `<button type="button" class="trip-person-remove" onclick="removeTripPersonInTemplate('${person.id}')"><i class="fas fa-times"></i> 삭제</button>`;

                    return `
                        <div class="${personClass}" onclick="event.stopPropagation();">
                            <div class="trip-person-info">
                                <span class="name">${person.name}${reporterBadge}${externalBadge}${duplicateWarning}</span>
                                <span>${person.dept}</span>
                                <span>${person.position}</span>
                                ${expenseDisplay}
                            </div>
                            ${removeButton}
                        </div>
                    `;
                }).join('');

                showAddPersonButton();
            }

            updateTripPersonDisplay();
            updateTripPersonCount();

            // 가이드 행 + 소요경비내역 업데이트 (경비 테이블이 있을 때만)
            if (dailyExpenseBody) {
                updateTotalExpenses();
            }

            // 출장인원 변경 시 출장 내용 및 결과 자동 갱신
            updateTripResult();
        }

        // 출장인원 추가 버튼 표시
        function showAddPersonButton() {
            if (!tripPersonArea) return;

            let addButton = tripPersonArea.querySelector('.add-more-persons-btn');
            if (!addButton) {
                addButton = document.createElement('button');
                addButton.type = 'button';
                addButton.className = 'add-more-persons-btn';
                addButton.onclick = openTripPersonModal;
                addButton.innerHTML = '<i class="fas fa-user-plus"></i> 출장인원 추가';
                tripPersonArea.appendChild(addButton);
            }
            addButton.style.display = 'flex';
        }

        // 출장인원 추가 버튼 숨기기
        function hideAddPersonButton() {
            if (!tripPersonArea) return;

            const addButton = tripPersonArea.querySelector('.add-more-persons-btn');
            if (addButton) {
                addButton.style.display = 'none';
            }
        }

        // 템플릿 내에서 출장인원 제거
        window.removeTripPersonInTemplate = async function(personId) {
            // 작성자는 제거 불가
            const currentReporterId = tripReporter ? tripReporter.getAttribute('data-reporter-id') : null;
            if (currentReporterId && String(personId) === String(currentReporterId)) return;

            window.currentTripPersons = window.currentTripPersons.filter(p => String(p.id) !== String(personId));
            // tempTripSelectedIds도 동기화
            tempTripSelectedIds.delete(String(personId));
            renderTripPersonListInTemplate();

            // 중복 검증 실행
            await window.checkAllTripPersonsForDuplicates();

            // 모달이 열려있으면 모달도 업데이트
            const tripPersonModalEl = document.getElementById('tripPersonModal');
            if (tripPersonModalEl && tripPersonModalEl.classList.contains('show')) {
                renderTripPersonList2(tripPersonSearchInput ? tripPersonSearchInput.value : '');
            }
        };

        // 전역 함수로 등록하여 모달에서 접근 가능하게
        window.addTripPersonsToTrip = async function(persons) {
            persons.forEach(person => {
                if (!window.currentTripPersons.some(p => p.id === person.id)) {
                    window.currentTripPersons.push(person);
                }
            });
            renderTripPersonListInTemplate();
            // 작성자 자동 설정 (출장인원 중 가장 낮은 직급)
            await setDefaultReporter();
            // 중복 검증 실행
            await window.checkAllTripPersonsForDuplicates();
        };

        // 출장인원 중복 검증 함수 (전체 - 회의/야근/출장 모두 체크)
        window.checkAllTripPersonsForDuplicates = async function() {
            duplicateTripPersonsInfo = {}; // 초기화

            const date = document.getElementById('trip_date')?.value;
            const projectIdx = document.getElementById('selectedProjectIdx')?.value;
            if (!date || !projectIdx) return;

            const tripPersons = getTripPersons();
            const personIds = tripPersons
                .map(p => parseInt(p.id))
                .filter(id => !isNaN(id) && id > 0);
            if (personIds.length === 0) {
                renderTripPersonListInTemplate();
                return;
            }

            const scan = await ReceiptCommon.scanDuplicatesForPersons({
                persons: personIds.map(id => ({ id })),
                date,
                projectIdx,
                excludeReceiptIdx: currentReceiptTripIdx || undefined,
                excludeDocumentType: currentReceiptTripIdx ? 'RCT' : undefined
            });

            Object.keys(scan).forEach(id => {
                const info = scan[id];
                if (info) {
                    duplicateTripPersonsInfo[id] = {
                        date: info.date,
                        projectName: info.projectName,
                        type: info.type,
                        startTime: info.startTime,
                        endTime: info.endTime
                    };
                }
            });

            renderTripPersonListInTemplate();
        }

        // 출장인원 중복 검증 재실행 함수 (날짜 변경 시)
        window.recheckTripPersons = async function() {
            // 출장인원이 없으면 스킵
            if (!window.currentTripPersons || window.currentTripPersons.length === 0) return;

            try {
                await window.checkAllTripPersonsForDuplicates();
                // 날짜 변경 후 작성자가 중복이면 다른 인원으로 재설정
                await setDefaultReporter();
            } catch (error) {
                console.error('중복 검증 재실행 오류:', error);
            }
        };

        // 과제명 자동 채우기
        if (tripProject) {
            tripProject.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.trip-auto-project').forEach(field => {
                    field.textContent = value;
                });
            });
        }

        // 출장지 자동 채우기
        if (tripLocation) {
            tripLocation.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.trip-auto-location').forEach(field => {
                    field.textContent = value;
                });
            });
        }

        // 날짜별 비용 입력 행 생성 함수
        function generateDailyExpenseRows() {

            if (!tripDate || !tripDate.value || !dailyExpenseBody) {
                return;
            }

            const startDate = new Date(tripDate.value);
            const duration = parseInt(tripDuration ? tripDuration.value : '0');
            const days = duration + 1; // 당일(0박) = 1일, 1박 = 2일


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

            // 날짜별 행 생성
            for (let i = 0; i < days; i++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(currentDate.getDate() + i);

                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                const dateStr = `${year}.${month}.${day}`;

                dailyExpenses.push({
                    date: dateStr,
                    transport: 0,
                    lodging: 0,
                    meal: 0,
                    other: 0
                });

                const isLastDay = i === days - 1;
                const lodgingCell = isDayTrip
                    ? `<td style="display:none;"><input type="text" inputmode="numeric" class="expense-input" data-index="${i}" data-type="lodging" placeholder="0"></td>`
                    : `<td style="text-align: center;"><input type="text" inputmode="numeric" class="expense-input" data-index="${i}" data-type="lodging" value="${isLastDay ? '0' : ''}" placeholder="0" ${isLastDay ? 'disabled' : ''} style="width: 100%; text-align: right; padding: 5px; ${isLastDay ? 'background: #f1f5f9; color: #94a3b8; cursor: not-allowed;' : ''}"></td>`;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="text-align: center; background: white; font-weight: 500;">${dateStr}</td>
                    <td style="text-align: center;">
                        <input type="text" inputmode="numeric" class="expense-input" data-index="${i}" data-type="transport"
                               placeholder="0" style="width: 100%; text-align: right; padding: 5px;">
                    </td>
                    ${lodgingCell}
                    <td style="text-align: center;">
                        <input type="text" inputmode="numeric" class="expense-input" data-index="${i}" data-type="meal"
                               placeholder="0" style="width: 100%; text-align: right; padding: 5px;">
                    </td>
                    <td style="text-align: center;">
                        <input type="text" inputmode="numeric" class="expense-input" data-index="${i}" data-type="other"
                               placeholder="0" style="width: 100%; text-align: right; padding: 5px;">
                    </td>
                `;
                dailyExpenseBody.appendChild(row);
            }

            // 가이드 행 추가 (선택된 출장인원 합계)
            addExpenseGuideRow();

            // 입력 이벤트 리스너 추가
            document.querySelectorAll('.expense-input').forEach(input => {
                input.addEventListener('input', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    const type = this.getAttribute('data-type');

                    // 숫자만 추출 (-, 소수점, 문자 제거)
                    const raw = this.value.replace(/[^0-9]/g, '');
                    const numValue = parseInt(raw) || 0;

                    // 콤마 포맷 적용
                    this.value = numValue > 0 ? numValue.toLocaleString('ko-KR') : '';

                    dailyExpenses[index][type] = numValue;
                    updateTotalExpenses();
                });

                input.addEventListener('keydown', function(e) {
                    // -, +, e, E, . 입력 차단
                    if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                        e.preventDefault();
                    }
                });
            });

            updateTotalExpenses();
        }

        // 출장인원 합계 가이드 행 추가
        function addExpenseGuideRow() {
            if (!dailyExpenseBody) return;

            // 기존 가이드 행 제거
            const existingGuide = dailyExpenseBody.querySelector('.expense-guide-row');
            if (existingGuide) {
                existingGuide.remove();
            }

            // 선택된 출장인원이 없으면 기준 금액 리셋 후 종료
            if (!window.currentTripPersons || window.currentTripPersons.length === 0) {
                guideMealTotal = 0;
                guideDailyTotal = 0;
                return;
            }

            // 출장인원별 식비(중식비)와 일비(출장비) 합계 계산
            let totalMealGuide = 0;
            let totalDailyGuide = 0;

            let internalPersonCount = 0;

            window.currentTripPersons.forEach(person => {
                if (person.type !== 'external') { // 내부 인원만 계산
                    internalPersonCount++;

                    // 중식비(식비) / 출장비(일비) — 0이면 falsy로 처리하여 fixedExpenses fallback
                    totalMealGuide  += person.mealExpense  || fixedMealExpenses[person.position] || 0;
                    totalDailyGuide += person.tripExpense  || fixedExpenses[person.position]     || 0;
                }
            });

            // 교통비/숙박비: 내부 인원수 × 100,000원
            const transportGuide = internalPersonCount * 100000;
            const lodgingGuide = internalPersonCount * 100000;

            // 전역 변수에 저장 (검증용)
            guideMealTotal = totalMealGuide;
            guideDailyTotal = totalDailyGuide;

            const guideIsDayTrip = (parseInt(tripDuration ? tripDuration.value : '0') === 0);
            const guideLodgingCell = guideIsDayTrip
                ? `<td style="display:none; text-align: center; color: #1e40af; font-weight: 600;">${lodgingGuide.toLocaleString()}원</td>`
                : `<td style="text-align: center; color: #1e40af; font-weight: 600;">${lodgingGuide.toLocaleString()}원</td>`;

            // 가이드 행 생성
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
                <td style="text-align: center; color: #1e40af; font-weight: 600;">
                    ${transportGuide.toLocaleString()}원
                </td>
                ${guideLodgingCell}
                <td style="text-align: center; color: #1e40af; font-weight: 600;">
                    ${totalMealGuide.toLocaleString()}원
                </td>
                <td style="text-align: center; color: #1e40af; font-weight: 600;">
                    ${totalDailyGuide.toLocaleString()}원
                </td>
            `;

            // 테이블 맨 위에 삽입
            dailyExpenseBody.insertBefore(guideRow, dailyExpenseBody.firstChild);
        }

        // 합계 업데이트 함수
        function updateTotalExpenses() {
            // 가이드 행(기준금액) 재계산 — 인원 변경 시에도 최신 값 유지
            addExpenseGuideRow();

            // 각 input placeholder에 최대(가이드) 금액 표시
            const internalCount = (window.currentTripPersons || []).filter(p => p.type !== 'external').length;
            const totalDays = dailyExpenses.length;
            document.querySelectorAll('.expense-input').forEach(input => {
                const type = input.getAttribute('data-type');
                const idx  = parseInt(input.getAttribute('data-index'));
                const isLast = idx === totalDays - 1;
                let max = 0;
                if (type === 'transport')     max = internalCount * 100000;
                else if (type === 'lodging')  max = isLast ? 0 : internalCount * 100000;
                else if (type === 'meal')     max = guideMealTotal;
                else if (type === 'other')    max = guideDailyTotal;
                input.placeholder = max > 0 ? `최대 ${max.toLocaleString()}` : '0';
            });

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

            const grandTotal = totalTransport + totalLodging + totalMeal + totalOther;

            // 합계 표시 (공통 입력칸)
            document.getElementById('totalTransport').textContent = totalTransport.toLocaleString();
            document.getElementById('totalLodging').textContent = totalLodging.toLocaleString();
            document.getElementById('totalMeal').textContent = totalMeal.toLocaleString();
            document.getElementById('totalOther').textContent = totalOther.toLocaleString();

            // 기준 금액 초과 검증 (날짜·항목별 셀 단위 검증)
            const internalCountForVal = (window.currentTripPersons || []).filter(p => p.type !== 'external').length;
            const totalDaysForVal = dailyExpenses.length;
            hasExpenseOverflow = false;

            document.querySelectorAll('.expense-input').forEach(input => {
                const type  = input.getAttribute('data-type');
                const idx   = parseInt(input.getAttribute('data-index'));
                const isLast = idx === totalDaysForVal - 1;
                const value  = parseInt(input.value.replace(/[^0-9]/g, '')) || 0;

                let limit = 0;
                if (type === 'transport')    limit = internalCountForVal * 100000;
                else if (type === 'lodging') limit = internalCountForVal * 100000;
                else if (type === 'meal')    limit = guideMealTotal;
                else if (type === 'other')   limit = guideDailyTotal;

                // 숙박비 마지막 날: 인원이 있으면 0원 초과 자체가 오류 (퇴실일 숙박비는 0이어야 함)
                const isLastDayLodging = type === 'lodging' && isLast && internalCountForVal > 0;
                const isOverflow = isLastDayLodging ? value > 0 : (limit > 0 && value > limit);

                const td = input.closest('td');
                let errorEl = td ? td.querySelector('.expense-over-msg') : null;

                if (isOverflow) {
                    input.style.border = '2px solid #ef4444';
                    input.style.backgroundColor = '#fee2e2';
                    if (td && !errorEl) {
                        errorEl = document.createElement('div');
                        errorEl.className = 'expense-over-msg';
                        errorEl.style.cssText = 'color: #ef4444; font-size: 11px; margin-top: 2px; text-align: center;';
                        errorEl.textContent = '기준 금액을 초과하였습니다.';
                        td.appendChild(errorEl);
                    }
                    hasExpenseOverflow = true;
                } else {
                    input.style.border = '';
                    input.style.backgroundColor = '';
                    if (errorEl) errorEl.remove();
                }
            });

            // 저장/수정 버튼 활성/비활성
            if (submitBtn) {
                submitBtn.disabled = hasExpenseOverflow;
                submitBtn.style.opacity = hasExpenseOverflow ? '0.5' : '';
                submitBtn.style.cursor  = hasExpenseOverflow ? 'not-allowed' : '';
            }
            const updateBtnEl = document.getElementById('updateBtn');
            if (updateBtnEl) {
                updateBtnEl.disabled = hasExpenseOverflow;
                updateBtnEl.style.opacity = hasExpenseOverflow ? '0.5' : '';
                updateBtnEl.style.cursor  = hasExpenseOverflow ? 'not-allowed' : '';
            }

            // 인쇄 버튼 갱신 (비용 입력 여부 반영)
            validateRequiredFields();

            // 품의서 소요경비 내역 (선택 인원 기준 금액)
            let proposalTotal = 0; // 소요경비내역 합계 (출장신청금액으로 사용)
            const proposalExpenseBody = document.getElementById('proposalExpenseBody');
            if (proposalExpenseBody) {
                proposalExpenseBody.innerHTML = '';

                // 내부 인원수 × 100,000원 (교통비/숙박비 가이드)
                const internalCount = (window.currentTripPersons || []).filter(p => p.type !== 'external').length;

                // 날짜별 행 생성 (dailyExpenses 배열 기준)
                dailyExpenses.forEach((expense, index) => {
                    const isLastDay = index === dailyExpenses.length - 1;

                    // 교통비: 매일 인원수 × 100,000원, 숙박비: 마지막날 0원
                    const dayTransport = internalCount * 100000;
                    const dayLodging   = isLastDay ? 0 : internalCount * 100000;
                    const dayMeal      = guideMealTotal;
                    const dayDaily     = guideDailyTotal;
                    const dayTotal     = dayTransport + dayLodging + dayMeal + dayDaily;

                    proposalTotal += dayTotal;

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td style="text-align: center; padding: 10px;">${expense.date}</td>
                        <td style="text-align: center; padding: 10px;">${dayTransport.toLocaleString()}</td>
                        <td style="text-align: center; padding: 10px;">${dayLodging.toLocaleString()}</td>
                        <td style="text-align: center; padding: 10px;">${dayMeal.toLocaleString()}</td>
                        <td style="text-align: center; padding: 10px;">${dayDaily.toLocaleString()}</td>
                        <td style="text-align: center; padding: 10px;">${dayTotal.toLocaleString()}</td>
                    `;
                    proposalExpenseBody.appendChild(row);
                });
            }

            // 복명서 정산 세부내역에 날짜별 행 생성
            const reportExpenseBody = document.getElementById('reportExpenseBody');
            if (reportExpenseBody) {
                reportExpenseBody.innerHTML = '';

                // 헤더 행
                const headerRow = document.createElement('tr');
                const rowspan = dailyExpenses.length * 4 + 1; // 각 날짜당 4행(교통비, 숙박비, 식비, 기타) + 헤더
                headerRow.innerHTML = `
                    <th colspan="2" rowspan="${rowspan}">정산<br>세부내역</th>
                    <th>날짜</th>
                    <th colspan="2" style="text-align: center; background: #fafafa;">구분</th>
                    <th style="text-align: center; background: #f0f0f0;">금액</th>
                `;
                reportExpenseBody.appendChild(headerRow);

                // 날짜별 상세 내역
                dailyExpenses.forEach((expense, index) => {
                    // 교통비
                    const transportRow = document.createElement('tr');
                    transportRow.innerHTML = `
                        <td rowspan="4" style="text-align: center;background: white; font-weight: 500; vertical-align: middle;">${expense.date}</td>
                        <td colspan="2" style="background: white; padding: 8px; text-align: center">교통비</td>
                        <td style="text-align: center; padding: 8px; background: white;">${expense.transport.toLocaleString()}원</td>
                    `;
                    reportExpenseBody.appendChild(transportRow);

                    // 숙박비
                    const lodgingRow = document.createElement('tr');
                    lodgingRow.innerHTML = `
                        <td colspan="2" style="background: white; padding: 8px; text-align: center">숙박비</td>
                        <td style="text-align: center; padding: 8px;">${expense.lodging.toLocaleString()}원</td>
                    `;
                    reportExpenseBody.appendChild(lodgingRow);

                    // 식비
                    const mealRow = document.createElement('tr');
                    mealRow.innerHTML = `
                        <td colspan="2" style="background: white; padding: 8px; text-align: center">식비</td>
                        <td style="text-align: center; padding: 8px;">${expense.meal.toLocaleString()}원</td>
                    `;
                    reportExpenseBody.appendChild(mealRow);

                    // 기타(일비)
                    const otherRow = document.createElement('tr');
                    otherRow.innerHTML = `
                        <td colspan="2" style="background: white; padding: 8px; text-align: center">기타(일비)</td>
                        <td style="text-align: center; padding: 8px;">${expense.other.toLocaleString()}원</td>
                    `;
                    reportExpenseBody.appendChild(otherRow);
                });
            }

            // 복명서 레이아웃 조정 (출장 일수 기반)
            adjustTripReportLayout(dailyExpenses.length);

            // 합계 금액 표시
            document.querySelectorAll('.trip-auto-grand-total').forEach(field => {
                field.textContent = grandTotal.toLocaleString();
            });
            document.querySelectorAll('.trip-auto-total').forEach(field => {
                field.textContent = grandTotal.toLocaleString();
            });
            document.querySelectorAll('.trip-auto-request-amount').forEach(field => {
                field.textContent = proposalTotal.toLocaleString(); // 소요경비내역 합계와 동일
            });
            document.querySelectorAll('.trip-auto-difference').forEach(field => {
                field.textContent = (proposalTotal - grandTotal).toLocaleString(); // 차액 = 출장신청금액 - 실집행금액
            });
        }

        // 출장 기간 계산 함수
        async function ensureHolidaysLoaded(year) {
            if (loadedHolidayYears.has(year)) return;
            try {
                const res = await fetch(`/api/holidays?year=${year}`);
                if (res.ok) Object.assign(holidays, await res.json());
            } catch (e) {
                console.warn(`[Trip] ${year}년 공휴일 로드 실패:`, e);
            }
            loadedHolidayYears.add(year);
        }

        async function getNextBusinessDay(date) {
            const next = new Date(date);
            next.setDate(next.getDate() + 1);
            // 필요한 년도 공휴일 사전 로드
            await ensureHolidaysLoaded(next.getFullYear());
            while (true) {
                const dow = next.getDay();
                const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
                if (dow !== 0 && dow !== 6 && !holidays[key]) break;
                next.setDate(next.getDate() + 1);
                // 년도가 바뀌면 해당 년도 공휴일 추가 로드
                await ensureHolidaysLoaded(next.getFullYear());
            }
            return next;
        }

        async function updateTripDateRange() {
            if (!tripDate || !tripDate.value) {
                return;
            }

            const startDate = new Date(tripDate.value);
            const duration = parseInt(tripDuration ? tripDuration.value : '0');

            const [year, month, day] = tripDate.value.split('-');

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
            document.querySelectorAll('.trip-auto-date').forEach(field => {
                field.textContent = dateRangeText;
            });

            // 출장복명서 출장기간
            document.querySelectorAll('.trip-auto-date-range').forEach(field => {
                field.textContent = dateRangeText;
            });

            // 소요경비내역 일시 (시작일만)
            const dateDotFormatted = `${year}.${month}.${day}`;
            document.querySelectorAll('.trip-auto-date-dot').forEach(field => {
                field.textContent = dateDotFormatted;
            });

            // 작성일 계산 (출장기간 -1일, 주말 제외)
            const tripDateObj = new Date(tripDate.value);
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

            document.querySelectorAll('.trip-auto-write-date').forEach(field => {
                field.textContent = writeFormatted;
            });

            // 품의서 작성날짜 입력 필드 연동 (default = writeDate, max = writeDate)
            const requisitionInput = document.getElementById('trip_requisition_date');
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

            document.querySelectorAll('.trip-auto-report-year').forEach(field => {
                field.textContent = reportYear;
            });
            document.querySelectorAll('.trip-auto-report-month').forEach(field => {
                field.textContent = reportMonth.replace(/^0/, '');
            });
            document.querySelectorAll('.trip-auto-report-day').forEach(field => {
                field.textContent = reportDay.replace(/^0/, '');
            });
        }

        // 출장기간 자동 채우기 및 작성일/복명일자 계산
        if (tripDate) {
            tripDate.addEventListener('change', async function() {
                await updateTripDateRange();

                // 날짜 변경 시 출장인원 초기화
                if (!window._tripLoadingData && tripPersons.length > 0) {
                    Swal.fire({
                        icon: 'warning',
                        title: '출장인원 초기화',
                        text: '날짜 변경 시 출장인원이 초기화됩니다.',
                        confirmButtonText: '확인',
                        confirmButtonColor: '#667eea'
                    });
                    tripPersons = [];
                    if (typeof window.renderTripPersonListInTemplate === 'function') {
                        window.renderTripPersonListInTemplate();
                    }
                }

                // 날짜 변경 시 출장인원 중복 재검증
                await window.recheckTripPersons();

                // 날짜 변경 시 작성자(reporter) 참여기간 재검증
                await revalidateReporterAgainstTripRange();

                // 프로젝트가 선택된 경우, 선택 가능한 인원이 있는지 확인
                const selectedProjectIdx = document.getElementById('selectedProjectIdx');
                if (selectedProjectIdx && selectedProjectIdx.value && projectMembers && projectMembers.length > 0) {
                    // 프로젝트 팀원 전체 ID 목록
                    const allMemberIds = projectMembers.map(m => m.employeeIdx);

                    // 중복된 인원 ID 목록
                    const duplicateIds = Object.keys(duplicateTripPersonsInfo).map(id => parseInt(id));

                    // 선택 가능한 인원 수
                    const availableCount = allMemberIds.filter(id => !duplicateIds.includes(id)).length;

                    if (availableCount === 0) {
                        await Swal.fire({
                            icon: 'warning',
                            title: '선택 가능한 인원이 없습니다',
                            html: `
                                <div style="text-align: left; line-height: 1.8;">
                                    <p style="margin-bottom: 12px;">
                                        <strong>${this.value}</strong> 날짜에는<br>
                                        모든 프로젝트 팀원이 이미 다른 일정에 참여 중입니다.
                                    </p>
                                    <p style="color: #64748b; font-size: 14px; margin-bottom: 8px;">
                                        ▪ 회의, 야근, 출장 중 하나 이상에 참석
                                    </p>
                                    <p style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 6px; font-size: 14px;">
                                        💡 <strong>해결 방법:</strong><br>
                                        출장 날짜를 다른 날짜로 변경해주세요.
                                    </p>
                                </div>
                            `,
                            confirmButtonText: '확인',
                            confirmButtonColor: '#667eea'
                        });

                        // 출장인원 초기화
                        window.currentTripPersons = [];
                        if (typeof window.renderTripPersonListInTemplate === 'function') {
                            window.renderTripPersonListInTemplate();
                        }

                        // 작성자 필드 초기화
                        const tripReporter = document.getElementById('trip_reporter');
                        if (tripReporter) {
                            tripReporter.value = '';
                            tripReporter.setAttribute('data-reporter-id', '');
                        }
                    }
                }
            });
        } else {
        }

        // 출장 기간 셀렉트 박스 이벤트
        if (tripDuration) {
            tripDuration.addEventListener('change', async function() {
                if (!window._tripLoadingData && tripPersons.length > 0) {
                    Swal.fire({
                        icon: 'warning',
                        title: '출장인원 초기화',
                        text: '기간 변경 시 출장인원이 초기화됩니다.',
                        confirmButtonText: '확인',
                        confirmButtonColor: '#667eea'
                    });
                    tripPersons = [];
                    if (typeof window.renderTripPersonListInTemplate === 'function') {
                        window.renderTripPersonListInTemplate();
                    }
                }
                await updateTripDateRange();
                // 기간 변경 시 작성자(reporter) 재검증
                await revalidateReporterAgainstTripRange();
            });
        } else {
        }

        // 출장목적 자동 채우기
        if (tripPurpose) {
            tripPurpose.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.trip-auto-purpose').forEach(field => {
                    field.textContent = value;
                });
            });
        }

        // 복명자 자동 채우기
        if (tripReporter) {
            tripReporter.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.trip-auto-reporter').forEach(field => {
                    field.textContent = value;
                });

                // 출장내용 및 결과에 자동 추가
                updateTripResult();
            });

            // 초기값 설정
            if (tripReporter.value) {
                document.querySelectorAll('.trip-auto-reporter').forEach(field => {
                    field.textContent = tripReporter.value;
                });
                updateTripResult();
            }
        }

        // 출장내용 및 결과 업데이트 (출장인원 변경 시 자동 반영)
        function updateTripResult() {
            const personNames = (window.currentTripPersons || [])
                .filter(p => p.name && p.name.trim())
                .map(p => p.name.trim());

            const attendeeLine = '- 참석인원 :' + (personNames.length > 0 ? ` ${personNames.join(', ')}(파인씨앤아이)` : '');
            const contentMarker = '\n- 출장 내용 :';

            if (tripResult && !isLoadingTripData) {
                if (!tripResult.dataset.userModified) {
                    // 신규 작성: 전체 자동 채우기
                    tripResult.value = attendeeLine + contentMarker;
                } else {
                    // 편집 모드: 참석인원 줄만 교체, 출장 내용 이후 보존
                    const cur = tripResult.value;
                    const idx = cur.indexOf('- 출장 내용 :');
                    const preserved = idx !== -1 ? cur.slice(idx - (cur[idx - 1] === '\n' ? 1 : 0)) : contentMarker;
                    tripResult.value = attendeeLine + preserved;
                }
            }

            // 복명서 미리보기 동기화
            const displayText = tripResult ? tripResult.value : (attendeeLine + contentMarker);
            document.querySelectorAll('.trip-auto-result').forEach(field => {
                field.innerHTML = displayText.trimEnd().replace(/\n/g, '<br>');
            });
        }

        // 사용자가 직접 수정하면 자동 업데이트 중지
        if (tripResult) {
            tripResult.addEventListener('input', function() {
                this.dataset.userModified = 'true';
                document.querySelectorAll('.trip-auto-result').forEach(field => {
                    field.innerHTML = this.value.trimEnd().replace(/\n/g, '<br>');
                });
            });
        }

        // 작성일 자동 채우기
        const today = new Date();
        const writeDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}.`;
        document.querySelectorAll('.trip-auto-write-date').forEach(field => {
            field.textContent = writeDate;
        });

        // 초기 인원 설정
        window.currentTripPersons = [];
        renderTripPersonListInTemplate();
    }

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

    // 결재자 영역 클릭 시 모달 열기
    if (approverChips) {
        approverChips.addEventListener('click', function(e) {
            // 제거 버튼 클릭은 무시
            if (e.target.closest('.btn-remove-approver')) {
                return;
            }
            loadEmployeeList();
            approverModal.classList.add('show');
        });
    }

    // 직원 목록 로드
    function loadEmployeeList() {
        employeeList.innerHTML = '';
        employees.forEach(emp => {
            const item = document.createElement('div');
            item.className = 'employee-item';
            item.innerHTML = `
                <i class="fas fa-user-circle"></i>
                <div class="employee-info">
                    <div class="employee-name">${emp.name}</div>
                    <div class="employee-detail">${emp.dept} ${emp.position}</div>
                </div>
            `;
            item.addEventListener('click', function() {
                document.querySelectorAll('.employee-item').forEach(i => i.classList.remove('selected'));
                this.classList.add('selected');
                selectedEmployee = emp;
            });
            employeeList.appendChild(item);
        });
    }

    // 직원 검색
    approverSearch.addEventListener('input', function() {
        const term = this.value.toLowerCase();
        document.querySelectorAll('.employee-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(term) ? '' : 'none';
        });
    });

    // 결재자 추가
    window.addApprover = function() {
        if (!selectedEmployee) {
            showWarning('결재자를 선택해주세요.');
            return;
        }

        if (selectedApprovers.find(a => a.id === selectedEmployee.id)) {
            showWarning('이미 추가된 결재자입니다.');
            return;
        }

        selectedApprovers.push(selectedEmployee);
        updateApproverChips();
        closeModal();
        selectedEmployee = null;
    };

    // 결재자 칩 업데이트
    function updateApproverChips() {
        if (selectedApprovers.length === 0) {
            approverChips.innerHTML = `
                <div style="text-align: center; color: #94a3b8; font-size: 13px; width: 100%;">
                    <i class="fas fa-user-plus" style="font-size: 20px; margin-bottom: 6px; display: block;"></i>
                    <div>클릭하여 결재자 추가</div>
                </div>
            `;
            return;
        }

        approverChips.innerHTML = '';
        selectedApprovers.forEach((approver, index) => {
            const chip = document.createElement('div');
            chip.className = 'approver-chip';
            chip.innerHTML = `
                <span class="order">${index + 1}</span>
                <span>${approver.name} ${approver.position}</span>
                <button class="btn-remove btn-remove-approver" onclick="removeApprover(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            approverChips.appendChild(chip);
        });
    }

    // 결재자 제거
    window.removeApprover = function(index) {
        selectedApprovers.splice(index, 1);
        updateApproverChips();
    };

    // 모달 닫기
    window.closeModal = function() {
        approverModal.classList.remove('show');
        approverSearch.value = '';
        loadEmployeeList();
    };

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
        input.addEventListener('change', function(e) {
            Array.from(e.target.files).forEach(file => {
                if (filesArr.length >= 5) { showWarning('최대 5개까지만 첨부 가능합니다.'); return; }
                if (file.size > 10 * 1024 * 1024) { showWarning('파일 크기는 10MB를 초과할 수 없습니다.'); return; }
                filesArr.push(file);
            });
            updateFn();
            input.value = '';
        });
        area.addEventListener('dragover', function(e) { e.preventDefault(); this.style.borderColor = '#667eea'; this.style.background = '#f5f7ff'; });
        area.addEventListener('dragleave', function() { this.style.borderColor = '#ddd'; this.style.background = 'white'; });
        area.addEventListener('drop', function(e) {
            e.preventDefault(); this.style.borderColor = '#ddd'; this.style.background = 'white';
            Array.from(e.dataTransfer.files).forEach(file => {
                if (filesArr.length >= 5) { showWarning('최대 5개까지만 첨부 가능합니다.'); return; }
                if (file.size > 10 * 1024 * 1024) { showWarning('파일 크기는 10MB를 초과할 수 없습니다.'); return; }
                filesArr.push(file);
            });
            updateFn();
        });
    }

    function updateReceiptFileList() {
        const listEl = documentForm.querySelector('#receiptFileList');
        if (!listEl) return;
        if (typeof window.revokeChipThumbs === 'function') window.revokeChipThumbs(listEl);
        listEl.innerHTML = '';
        // 기존 RECEIPT 파일 표시 (삭제 예정 제외)
        existingReceiptAttachments.forEach(att => {
            if (deletedAttachmentIds.includes(att.idx)) return;
            const item = document.createElement('div');
            item.className = 'file-item existing-file';
            item.innerHTML = `
                <i class="fas ${getFileIcon(att.originalFilename)}"></i>
                <span>${att.originalFilename}</span>
                <button class="btn-download-file" onclick="downloadExistingAttachment(${att.idx}, '${att.originalFilename.replace(/'/g, "\\'")}')" data-tip="다운로드">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn-remove-file" onclick="removeExistingAttachment(${att.idx})" data-tip="삭제">
                    <i class="fas fa-times"></i>
                </button>
            `;
            if (typeof window.attachThumbToFileItem === 'function') {
                window.attachThumbToFileItem(item, `/api/receipt-trips/attachments/${att.idx}/download`, att.originalFilename);
            }
            listEl.appendChild(item);
        });
        // 새로 선택한 영수증 파일 표시
        selectedReceiptFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <i class="fas ${getFileIcon(file.name)}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <button class="btn-remove-file" onclick="removeReceiptFile(${index})"><i class="fas fa-times"></i></button>
            `;
            if (typeof window.attachThumbToFileItem === 'function') {
                window.attachThumbToFileItem(item, file);
            }
            listEl.appendChild(item);
        });
    }

    function updateDocumentFileList() {
        const listEl = documentForm.querySelector('#documentFileList');
        if (!listEl) return;
        listEl.innerHTML = '';
        // 기존 DOCUMENT 파일 표시 (삭제 예정 제외)
        existingDocumentAttachments.forEach(att => {
            if (deletedAttachmentIds.includes(att.idx)) return;
            const item = document.createElement('div');
            item.className = 'file-item existing-file';
            item.innerHTML = `
                <i class="fas ${getFileIcon(att.originalFilename)}"></i>
                <span>${att.originalFilename}</span>
                <button class="btn-download-file" onclick="downloadExistingAttachment(${att.idx}, '${att.originalFilename.replace(/'/g, "\\'")}')" data-tip="다운로드">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn-remove-file" onclick="removeExistingAttachment(${att.idx})" data-tip="삭제">
                    <i class="fas fa-times"></i>
                </button>
            `;
            listEl.appendChild(item);
        });
        // 새로 선택한 공식문서 파일 표시
        selectedDocumentFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <i class="fas ${getFileIcon(file.name)}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <button class="btn-remove-file" onclick="removeDocumentFile(${index})"><i class="fas fa-times"></i></button>
            `;
            listEl.appendChild(item);
        });
    }

    // setupUpload은 loadTemplate 내 setTimeout에서 실제 DOM 요소 할당 후 호출됨

    // 클립보드 이미지 붙여넣기 — 영수증 슬롯에만 적용
    // 출장 화면은 템플릿이 동적 로드되므로 receiptUploadArea를 paste 시점에 동적으로 조회
    if (typeof window.setupClipboardImagePaste === 'function') {
        window.setupClipboardImagePaste({
            resolveTarget: () => {
                const area = document.getElementById('receiptUploadArea');
                if (!area) return null;  // 템플릿 미로드 상태 — 활성 슬롯 없음
                return {
                    addFile: (file) => {
                        if (selectedReceiptFiles.length >= 5) {
                            showWarning('최대 5개까지만 첨부 가능합니다.');
                            return false;
                        }
                        if (file.size > 10 * 1024 * 1024) {
                            showWarning('파일 크기는 10MB를 초과할 수 없습니다.');
                            return false;
                        }
                        selectedReceiptFiles.push(file);
                        updateReceiptFileList();
                        area.classList.remove('paste-flash');
                        void area.offsetWidth;
                        area.classList.add('paste-flash');
                        return true;
                    },
                    label: '영수증',
                };
            },
        });
    }

    window.removeReceiptFile = function(index) { selectedReceiptFiles.splice(index, 1); updateReceiptFileList(); };
    window.removeDocumentFile = function(index) { selectedDocumentFiles.splice(index, 1); updateDocumentFileList(); };

    // 기존 첨부파일 다운로드
    window.downloadExistingAttachment = function(fileId, fileName) {
        const link = document.createElement('a');
        link.href = `/api/receipt-trips/attachments/${fileId}/download`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 기존 첨부파일 삭제 예약 (저장/수정 시 실제 삭제)
    window.removeExistingAttachment = function(attachmentIdx) {
        if (!deletedAttachmentIds.includes(attachmentIdx)) {
            deletedAttachmentIds.push(attachmentIdx);
        }
        updateReceiptFileList();
        updateDocumentFileList();
    };

    // 기존 첨부파일 다운로드 (하위 호환)
    window.downloadAttachment = window.downloadExistingAttachment;

    // 기존 첨부파일 상태 변수에 로드 (상세보기/수정 모드)
    function displayExistingAttachments(attachments) {
        if (!attachments || attachments.length === 0) return;
        existingReceiptAttachments   = attachments.filter(a => a.attachmentType !== 'DOCUMENT');
        existingDocumentAttachments  = attachments.filter(a => a.attachmentType === 'DOCUMENT');
        deletedAttachmentIds = [];
        updateReceiptFileList();
        updateDocumentFileList();
    }

    // 저장
    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            // 필수 필드 검증 (화면 순서대로)
            const selectedProjectIdxInput = document.getElementById('selectedProjectIdx');
            const tripCardInput = document.getElementById('trip_card');
            const selectedCardIdxInput = document.getElementById('selectedCardIdx');
            const tripReporterInput = document.getElementById('trip_reporter');
            const locationInput = document.getElementById('trip_location');
            const dateInput = document.getElementById('trip_date');
            const tripPurposeInput = document.getElementById('trip_purpose');
            const tripResultEl = document.getElementById('trip_result');

            if (!selectedProjectIdxInput?.value) {
                showWarning('프로젝트를 선택해주세요.');
                document.getElementById('trip_project')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!selectedCardIdxInput?.value) {
                showWarning('사용 카드를 선택해주세요.');
                tripCardInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!tripReporterInput?.value?.trim()) {
                showWarning('작성자를 선택해주세요.');
                tripReporterInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!locationInput?.value?.trim()) {
                showWarning('출장지를 입력해주세요.');
                locationInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                locationInput?.focus({ preventScroll: true });
                return;
            }
            if (!dateInput?.value) {
                showWarning('출장 일자를 입력해주세요.');
                dateInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!window.currentTripPersons || window.currentTripPersons.length === 0) {
                showWarning('출장인원을 선택해주세요.');
                document.getElementById('tripPersonArea')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!tripPurposeInput?.value?.trim()) {
                showWarning('출장목적을 입력해주세요.');
                tripPurposeInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                tripPurposeInput?.focus({ preventScroll: true });
                return;
            }
            const marker = '- 출장 내용 :';
            const tripResultVal = tripResultEl?.value || '';
            const markerIdx = tripResultVal.indexOf(marker);
            const hasResultContent = markerIdx !== -1
                ? tripResultVal.slice(markerIdx + marker.length).trim().length > 0
                : tripResultVal.trim().length > 0;
            if (!hasResultContent) {
                showWarning('출장 내용 및 결과를 입력해주세요.');
                tripResultEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                tripResultEl?.focus({ preventScroll: true });
                return;
            }

            // 참석자 목록 변환 (현재 페이지의 전역 변수 사용)
            const attendeeDTOs = (window.currentTripPersons || []).map((person, index) => ({
                department: person.dept || null,
                name: person.name,
                userIdx: parseInt(person.id),
                position: person.position || null,
                displayOrder: index
            }));

            // 비용 합계 계산 (날짜별 비용에서)
            const expenseInputs = document.querySelectorAll('.expense-input');
            let totalTransportFee = 0;
            let totalAccommodationFee = 0;
            let totalMealFee = 0;
            let totalOtherFee = 0;

            expenseInputs.forEach(input => {
                const type = input.getAttribute('data-type');
                const value = parseFloat(input.value.replace(/,/g, '')) || 0;

                if (type === 'transport') totalTransportFee += value;
                else if (type === 'lodging') totalAccommodationFee += value;
                else if (type === 'meal') totalMealFee += value;
                else if (type === 'other') totalOtherFee += value;
            });

            // 날짜별 비용 미입력 검증
            const totalAllFee = totalTransportFee + totalAccommodationFee + totalMealFee + totalOtherFee;
            if (totalAllFee === 0) {
                showWarning('날짜별 사용금액을 입력해주세요.');
                document.getElementById('dailyExpenseTable')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            // 비용 기준 금액 초과 시 저장 차단 (인라인 검증으로 이미 표시됨)
            if (hasExpenseOverflow) {
                showWarning('기준 금액을 초과한 항목이 있습니다. 비용을 조정해주세요.');
                return;
            }

            // 활동비 초과 여부 확인 (경고만, 차단 없음)
            const projIdxForBudget = parseInt(selectedProjectIdxInput.value);
            if (projIdxForBudget) {
                try {
                    const budgetRes = await fetch(`/api/projects/${projIdxForBudget}/activity-usage`);
                    if (budgetRes.ok) {
                        const budgetData = await budgetRes.json();
                        const currentTotalFee = totalTransportFee + totalAccommodationFee + totalMealFee + totalOtherFee;
                        const newTotalSpent = (budgetData.totalSpent || 0) + currentTotalFee;
                        if (newTotalSpent > (budgetData.activityBudget || 0)) {
                            const excessAmount = newTotalSpent - (budgetData.activityBudget || 0);
                            const budgetResult = await Swal.fire({
                                icon: 'warning',
                                title: '활동비 초과 경고',
                                html: `현재 등록하려는 금액(<b>${currentTotalFee.toLocaleString()}원</b>)을 포함하면<br>활동비 예산을 <b style="color:#ef4444;">${excessAmount.toLocaleString()}원</b> 초과합니다.<br><br>그래도 저장하시겠습니까?`,
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

            if (!(await showConfirm('출장 정보를 저장하시겠습니까?'))) {
                return;
            }

            // 일별 비용 명세 배열 구성
            const dailyExpenseBodyEl = document.getElementById('dailyExpenseBody');
            const dailyExpensesPayload = [];
            if (dailyExpenseBodyEl) {
                Array.from(dailyExpenseBodyEl.children)
                    .filter(r => !r.classList.contains('expense-guide-row'))
                    .forEach(row => {
                        const dateCell = row.querySelector('td:first-child');
                        const dateStr = dateCell ? dateCell.textContent.trim().replace(/\./g, '-') : null;
                        if (!dateStr) return;
                        const toNum = sel => parseInt((row.querySelector(sel)?.value || '0').replace(/,/g, '')) || 0;
                        dailyExpensesPayload.push({
                            expenseDate:       dateStr,
                            transportationFee: toNum('[data-type="transport"]'),
                            accommodationFee:  toNum('[data-type="lodging"]'),
                            mealFee:           toNum('[data-type="meal"]'),
                            otherFee:          toNum('[data-type="other"]')
                        });
                    });
            }

            // 저장 데이터 생성
            const tripDurationEl = document.getElementById('trip_duration');
            const reporterElSave = document.getElementById('trip_reporter');
            const drafterIdxSave = reporterElSave
                ? parseInt(reporterElSave.getAttribute('data-reporter-id')) || null
                : null;
            const saveData = {
                projectIdx: parseInt(selectedProjectIdxInput.value),
                drafterUserIdx: drafterIdxSave,
                tripDate: dateInput.value,
                requisitionDate: document.getElementById('trip_requisition_date')?.value || null,
                duration: tripDurationEl ? parseInt(tripDurationEl.value) || 0 : 0,
                location: locationInput.value,
                transportationFee: totalTransportFee || null,
                accommodationFee: totalAccommodationFee || null,
                mealFee: totalMealFee || null,
                otherFee: totalOtherFee || null,
                purpose: document.getElementById('trip_purpose') ? document.getElementById('trip_purpose').value : null,
                content: document.getElementById('trip_result')?.value || null,
                cardIdx: selectedCard ? selectedCard.idx : null,
                attendees: attendeeDTOs,
                dailyExpenses: dailyExpensesPayload
            };


            try {
                // FormData 생성 (첨부파일 지원)
                const formData = new FormData();
                formData.append('data', JSON.stringify(saveData));

                // 첨부파일 추가
                selectedReceiptFiles.forEach(file  => formData.append('receiptFiles',  file));
                selectedDocumentFiles.forEach(file => formData.append('documentFiles', file));

                const response = await fetch('/api/receipt-trips', {
                    method: 'POST',
                    body: formData
                    // Content-Type 헤더는 자동으로 설정됨 (multipart/form-data)
                });

                if (response.ok) {
                    await Swal.fire({
                        icon: 'success',
                        title: '저장 완료',
                        text: '출장 정보가 저장되었습니다.',
                        timer: 3000,
                        timerProgressBar: true,
                        showConfirmButton: true,
                        confirmButtonText: '확인',
                        allowOutsideClick: false
                    });
                    popupAwareRedirect('/project/documents');
                } else {
                    let errorMessage = '출장 저장에 실패했습니다.';
                    try {
                        const contentType = response.headers.get('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            const errorJson = await response.json();
                            if (errorJson.error) {
                                errorMessage += '\n\n에러 상세:\n' + errorJson.error;
                            }
                        } else {
                            const errorText = await response.text();
                            if (errorText) {
                                errorMessage += '\n\n에러 상세:\n' + errorText;
                            }
                        }
                    } catch (e) {
                        console.error('에러 메시지 파싱 실패:', e);
                    }
                    console.error('저장 실패:', response.status, errorMessage);
                    showError(errorMessage);
                }
            } catch (error) {
                console.error('저장 오류:', error);
                showError('출장 저장 중 오류가 발생했습니다.');
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
            const loadingModal = document.getElementById('pdfLoadingModal');
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');

            // 진행도 업데이트 함수
            function updateProgress(percent, message) {
                if (progressFill) progressFill.style.width = percent + '%';
                if (progressText) progressText.textContent = `${message} (${percent}%)`;
            }

            try {

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

                allDivs = documentForm.querySelectorAll(':scope > div');

                originalDisplays = Array.from(allDivs).map(div => div.style.display);

                if (allDivs.length < 3) {
                    showError('문서 구조를 찾을 수 없습니다. 영수증 처리(출장) 템플릿을 선택했는지 확인해주세요.');
                    if (loadingModal) loadingModal.classList.remove('active');
                    return;
                }

                updateProgress(30, '페이지 준비 중...');

                // 공통 정보 입력 영역 숨기고, 출장품의서와 출장복명서만 표시
                allDivs[0].style.display = 'none';
                allDivs[1].style.display = 'block';
                allDivs[2].style.display = 'block';

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

                updateProgress(40, '출장품의서 렌더링 중...');

                // 1. 출장품의서 페이지
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

                updateProgress(55, '출장품의서 이미지 변환 중...');

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

                updateProgress(70, '출장복명서 렌더링 중...');

                // 2. 출장복명서 페이지
                const reportDiv = allDivs[2];

                if (!reportDiv) {
                    throw new Error('출장복명서를 찾을 수 없습니다.');
                }

                pdf.addPage();
                const reportCanvas = await window.html2canvas(reportDiv, renderOptions);

                const reportCanvasWidth = reportCanvas.width;
                const reportCanvasHeight = reportCanvas.height;

                updateProgress(85, '출장복명서 이미지 변환 중...');

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

                updateProgress(95, 'PDF 파일 생성 중...');

                // 파일명 생성
                const dateInput = document.getElementById('trip_date');
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
                const fileName = `${dateStr}_출장.pdf`;

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
            }
        });
    }

    // 출장인원 모달 관련
    const tripPersonModal = document.getElementById('tripPersonModal');
    const tripPersonSearchInput = document.getElementById('tripPersonSearchInput');

    // 출장인원 목록 데이터 (직원 데이터와 동일하게 사용)
    // employees 배열을 직접 사용

    // 모달 열기 함수
    window.openTripPersonModal = async function() {
        if (tripPersonModal) {
            // 프로젝트 목록이 비어있으면 다시 로드
            if (!projects || projects.length === 0) {
                await loadProjects();
            }

            // 모달 열 때 중복 검증 실행 (날짜와 출장인원이 있는 경우)
            await window.checkAllTripPersonsForDuplicates();

            // 현재 출장인원을 임시 선택 상태로 초기화
            tempTripSelectedIds = new Set(window.currentTripPersons.map(p => String(p.id)));

            tripPersonModal.classList.add('show');
            if (tripPersonSearchInput) tripPersonSearchInput.value = '';
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

    // 프로젝트 팀원 가져오기 (출장인원 선택용)
    function getTripPersons() {
        if (!projectMembers || projectMembers.length === 0) {
            return [];
        }

        return projectMembers.map(member => {
            const positionName = member.employeePositionName || '직급 미지정';
            const positionCode = member.employeePositionCode; // 직급 코드
            let tripExpense = 0;
            let mealExpense = 0;
            let isDefault = false; // 기본 경비 사용 여부

            // 출장비(일비) 계산
            // 1순위: 프로젝트별 경비 설정에서 출장비 찾기
            if (projectExpenseSettings && projectExpenseSettings.length > 0 && positionCode) {
                const projectSetting = projectExpenseSettings.find(setting =>
                    setting.positionCode === positionCode &&
                    setting.expenseItemName === '출장비'  // 정확히 '출장비'와 매칭
                );
                if (projectSetting && projectSetting.amount) {
                    tripExpense = projectSetting.amount;
                } else {
                    // 2순위: 기초정보관리의 직급별 고정경비 사용 (코드값 우선, 한글명 fallback)
                    tripExpense = fixedExpenses[positionCode] || fixedExpenses[positionName] || 0;
                    if (tripExpense) {
                        isDefault = true;
                    }
                }
            } else {
                // 프로젝트 경비 설정이 없는 경우 바로 기본 경비 사용 (코드값 우선, 한글명 fallback)
                tripExpense = fixedExpenses[positionCode] || fixedExpenses[positionName] || 0;
                if (tripExpense) {
                    isDefault = true;
                }
            }

            // 중식비(식비) - 1순위: projectExpenseSettings, 2순위: fixedMealExpenses
            if (projectExpenseSettings && projectExpenseSettings.length > 0 && positionCode) {
                const mealSetting = projectExpenseSettings.find(s =>
                    s.positionCode === positionCode && s.expenseItemName === '중식비'
                );
                if (mealSetting && mealSetting.amount) {
                    mealExpense = mealSetting.amount;
                }
            }
            if (!mealExpense) {
                mealExpense = fixedMealExpenses[positionCode] || fixedMealExpenses[positionName] || 0;
            }

            return {
                id: member.employeeIdx,
                name: member.employeeName,
                position: positionName,
                dept: member.employeeDeptName || '부서 미지정',
                tripExpense: tripExpense,
                mealExpense: mealExpense,
                isDefaultExpense: isDefault,
                participationStartDate: member.participationStartDate || null,
                participationEndDate: member.participationEndDate || null
            };
        });
    }

    // 프로젝트 목록 렌더링 (출장인원 모달 내)
    function renderProjectListInTripPersonModal(searchText = '') {
        const tripPersonList2El = document.getElementById('tripPersonList2');
        if (!tripPersonList2El) return;

        // 검색 필터링
        let filtered = projects;
        if (searchText) {
            filtered = projects.filter(proj =>
                matchesSearch(proj.projectName || '', searchText) ||
                matchesSearch(proj.projectManagerName || '', searchText)
            );
        }

        if (filtered.length === 0) {
            tripPersonList2El.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-search" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                    ${searchText ? '검색 결과가 없습니다.' : '등록된 프로젝트가 없습니다.'}
                </div>
            `;
            return;
        }

        // 헤더 메시지 (warning card)
        const headerMessage = `
            <div class="convenience-notice">
                <div class="notice-icon">
                    <i class="fas fa-lightbulb"></i>
                </div>
                <div class="notice-content">
                    <div class="notice-title">프로젝트를 먼저 선택해주세요</div>
                    <div class="notice-desc">프로젝트를 선택하면 해당 팀원 목록이 표시됩니다</div>
                </div>
            </div>
        `;

        // 프로젝트 목록
        const projectItems = filtered.map(proj => {
            const projectName = proj.projectName || '이름 없음';
            const leader = proj.projectManagerName || '-';
            const memberCount = proj.memberCount || 0;
            const startDate = proj.startDate ? new Date(proj.startDate).toLocaleDateString('ko-KR') : '-';
            const endDate = proj.endDate ? new Date(proj.endDate).toLocaleDateString('ko-KR') : '-';

            return `
                <div class="project-item-in-attendee" data-project-idx="${proj.idx}">
                    <div class="project-item-icon">
                        <i class="fas fa-folder"></i>
                    </div>
                    <div class="project-item-info">
                        <div class="project-item-name">${projectName}</div>
                        <div class="project-item-details">
                            <div><i class="fas fa-user"></i> ${leader} (${memberCount}명)</div>
                            <div><i class="fas fa-calendar"></i> ${startDate} ~ ${endDate}</div>
                        </div>
                    </div>
                    <div class="project-item-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            `;
        }).join('');

        tripPersonList2El.innerHTML = headerMessage + projectItems;

        // 프로젝트 항목 클릭 이벤트
        tripPersonList2El.querySelectorAll('.project-item-in-attendee').forEach(item => {
            item.addEventListener('click', async function() {
                const projectIdx = this.getAttribute('data-project-idx');
                await selectProjectInTripPersonModal(projectIdx);
            });
        });
    }

    // 출장인원 모달에서 프로젝트 선택
    async function selectProjectInTripPersonModal(projectIdx) {
        const proj = projects.find(p => p.idx == projectIdx);
        if (!proj) return;

        // 프로젝트 선택
        await selectProject(projectIdx);

        // 검색 초기화 후 인원 목록 다시 렌더링
        if (tripPersonSearchInput) {
            tripPersonSearchInput.value = '';
        }
        renderTripPersonList2('');
    }

    // 출장인원 목록 렌더링
    function renderTripPersonList2(searchText = '') {
        const tripPersonList2El = document.getElementById('tripPersonList2');
        if (!tripPersonList2El) return;

        // 프로젝트가 선택되지 않았으면 프로젝트 목록 표시
        const selectedProjectIdxInput = document.getElementById('selectedProjectIdx');
        if (!selectedProjectIdxInput || !selectedProjectIdxInput.value) {
            renderProjectListInTripPersonModal(searchText);
            return;
        }

        const tripPersons = getTripPersons(); // 프로젝트 팀원에서 가져오기

        if (tripPersons.length === 0) {
            tripPersonList2El.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">프로젝트 팀원이 없습니다.</div>';
            return;
        }

        const filtered = tripPersons.filter(person =>
            matchesSearch(person.name + person.dept + person.position, searchText)
        );

        // 시간 중복 인원을 하단으로 정렬
        filtered.sort((a, b) => {
            const aDup = !!duplicateTripPersonsInfo[a.id];
            const bDup = !!duplicateTripPersonsInfo[b.id];
            return aDup - bDup;
        });

        if (filtered.length === 0) {
            tripPersonList2El.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;"><i class="fas fa-search" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>검색 결과가 없습니다.</div>';
            return;
        }

        const reporterId = tripReporter?.getAttribute('data-reporter-id') || '';
        const tripRange = getCurrentTripRange();
        tripPersonList2El.innerHTML = filtered.map(person => {
            // tempTripSelectedIds 기반으로 선택 상태 확인
            const isSelected = tempTripSelectedIds.has(String(person.id));
            const isReporter = String(person.id) === String(reporterId);

            // 중복 검증 결과 확인 (회의/야근/출장)
            const isDuplicate = duplicateTripPersonsInfo[person.id];

            // 출장 기간 외 검증 (전 기간 활성이어야 함)
            const isInactive = tripRange.start && !isMemberActiveDuringRange(person, tripRange.start, tripRange.end);

            const isLocked = isReporter || isDuplicate || isInactive;
            const disabledClass = isLocked ? ' disabled' : '';
            const selectedClass = isSelected ? ' added' : '';

            const onclickAttr = isLocked ? '' : `onclick="selectTripPerson(${person.id})"`;
            const disabledStyle = isLocked ? 'opacity: 0.6; cursor: not-allowed;' : '';

            // 참여기간 외 뱃지
            let inactiveBadge = '';
            if (isInactive) {
                const tip = `참여기간: ${formatMemberPeriod(person)}`;
                inactiveBadge = `<span style="background:#e5e7eb; color:#4b5563; padding:2px 8px; border-radius:4px; font-size:11px; margin-left:8px; white-space:nowrap;" data-tip="${tip}"><i class="fas fa-calendar-times"></i> 참여기간 외</span>`;
            }

            // 하이라이트 적용
            const highlightedName = highlightText(person.name, searchText);
            const highlightedDept = highlightText(person.dept, searchText);
            const highlightedPosition = highlightText(person.position, searchText);

            // 식비와 일비 표시
            const mealExpenseText = person.mealExpense ? person.mealExpense.toLocaleString('ko-KR') : '0';
            const tripExpenseText = person.tripExpense ? person.tripExpense.toLocaleString('ko-KR') : '0';
            let formattedExpense = `<div style="text-align: right; font-size: 0.9em;">
                <div style="color: #64748b;">식비: ${mealExpenseText}원</div>
                <div style="color: #64748b; margin-top: 2px;">일비: ${tripExpenseText}원</div>
            </div>`;
            if (person.isDefaultExpense && person.tripExpense > 0) {
                formattedExpense += ' <span class="default-expense-badge">(기본)</span>';
            }

            // 중복 경고 메시지
            let duplicateWarning = '';
            if (isDuplicate) {
                let tooltipText = `이미 ${isDuplicate.date}에 ${isDuplicate.projectName} 프로젝트 ${isDuplicate.type}`;
                if (isDuplicate.startTime && isDuplicate.endTime) {
                    tooltipText += ` (${isDuplicate.startTime} ~ ${isDuplicate.endTime})`;
                }
                tooltipText += '이 있어 선택할 수 없습니다.';

                duplicateWarning = `<i class="fas fa-exclamation-triangle"
                                      data-tip="${tooltipText}"
                                      style="color: #f59e0b; margin-left: 6px; cursor: help;"></i>`;
            }

            // 우측 아이콘/내용
            let rightContent = '';
            if (isReporter) {
                rightContent = `<i class="fas fa-check-circle" style="color:#94a3b8; font-size:18px; margin-left:auto; flex-shrink:0;"></i>`;
            } else if (isSelected) {
                rightContent = `<i class="fas fa-check-circle" style="color:#10b981; font-size:18px; margin-left:auto; flex-shrink:0;"></i>`;
            } else if (isDuplicate) {
                rightContent = `<div class="employee-expense" style="color: #9ca3af;">${formattedExpense}</div>`;
            } else {
                rightContent = `<div class="employee-expense">${formattedExpense}</div>`;
            }

            return `
            <div class="employee-item${selectedClass}${disabledClass}" data-id="${person.id}" ${onclickAttr} style="${disabledStyle}">
                <div class="employee-info">
                    <div class="employee-name">${highlightedName}${isReporter ? '<span style="background:#e0e7ff; color:#4338ca; padding:2px 8px; border-radius:4px; font-size:11px; margin-left:8px; white-space:nowrap;"><i class="fas fa-user-check"></i> 작성자</span>' : ''}${inactiveBadge}${duplicateWarning}</div>
                    <div class="employee-detail">${highlightedPosition} · ${highlightedDept}</div>
                </div>
                ${rightContent}
            </div>
        `;
        }).join('');

        // 렌더링 후 선택된 인원 합계 업데이트
        updateTripPersonSelectionSummary();
    }

    // 선택된 출장인원 합계 업데이트
    function updateTripPersonSelectionSummary() {
        const summaryEl = document.getElementById('tripPersonSummary');
        const countEl = document.getElementById('selectedPersonCount');
        const mealTotalEl = document.getElementById('selectedMealTotal');
        const dailyTotalEl = document.getElementById('selectedDailyTotal');

        if (!summaryEl || !countEl || !mealTotalEl || !dailyTotalEl) return;

        if (tempTripSelectedIds.size === 0) {
            summaryEl.style.display = 'none';
            return;
        }

        const allPersons = getTripPersons();
        let totalMeal = 0;
        let totalDaily = 0;

        tempTripSelectedIds.forEach(personId => {
            const person = allPersons.find(p => String(p.id) === String(personId));
            if (person) {
                totalMeal += person.mealExpense || 0;
                totalDaily += person.tripExpense || 0;
            }
        });

        countEl.textContent = tempTripSelectedIds.size;
        mealTotalEl.textContent = totalMeal.toLocaleString();
        dailyTotalEl.textContent = totalDaily.toLocaleString();
        summaryEl.style.display = 'block';
    }

    // 출장인원 선택 (토글)
    window.selectTripPerson = async function(personId) {
        const item = document.querySelector(`#tripPersonList2 .employee-item[data-id="${personId}"]`);
        if (item?.classList.contains('disabled')) return;

        const id = String(personId);
        const reporterId = tripReporter?.getAttribute('data-reporter-id') || '';

        // 작성자는 렌더링에서 클릭 차단됨 (안전장치)
        if (id === String(reporterId)) return;

        if (tempTripSelectedIds.has(id)) {
            tempTripSelectedIds.delete(id);
        } else {
            // 참여기간 검증 — 출장 전 기간 활성이어야 함
            const tripRange = getCurrentTripRange();
            if (!tripRange.start) {
                await Swal.fire({ icon: 'warning', title: '출장 시작일을 먼저 입력해주세요.' });
                return;
            }
            const tripPersonsList = getTripPersons();
            const person = tripPersonsList.find(p => String(p.id) === id);
            if (person && !isMemberActiveDuringRange(person, tripRange.start, tripRange.end)) {
                await showInactiveMemberAlert(person, '출장 기간', `${tripRange.start} ~ ${tripRange.end}`, '인원');
                return;
            }
            tempTripSelectedIds.add(id);
        }
        renderTripPersonList2(tripPersonSearchInput?.value || '');
    };

    // 검색 기능
    if (tripPersonSearchInput) {
        tripPersonSearchInput.addEventListener('input', function(e) {
            renderTripPersonList2(e.target.value);
        });
    }

    // 선택된 출장인원 확정 (기존 목록 교체)
    window.addSelectedTripPersons = async function() {
        if (tempTripSelectedIds.size === 0) {
            showWarning('출장인원을 선택해주세요.');
            return;
        }

        const allPersons = getTripPersons();
        const newPersons = [];

        tempTripSelectedIds.forEach(personId => {
            const person = allPersons.find(p => String(p.id) === String(personId));
            if (person) {
                newPersons.push({
                    id: String(personId),
                    name: person.name,
                    dept: person.dept,
                    position: person.position,
                    mealExpense: person.mealExpense,
                    tripExpense: person.tripExpense
                });
            }
        });

        // 기존 목록을 선택된 목록으로 교체
        window.currentTripPersons = newPersons;
        renderTripPersonListInTemplate();

        // 작성자가 새 목록에서 빠진 경우 재설정
        const currentReporterId = tripReporter ? tripReporter.getAttribute('data-reporter-id') : null;
        const reporterStillIn = currentReporterId && newPersons.some(p => String(p.id) === String(currentReporterId));
        if (!reporterStillIn) {
            await setDefaultReporter();
        }

        // 중복 검증
        await window.checkAllTripPersonsForDuplicates();
        if (typeof validateRequiredFields === 'function') validateRequiredFields();

        closeTripPersonModal();
    };

    // 초기 템플릿 로드 (출장)
    loadTemplate('receipt-trip');

    // 템플릿 전환 비활성화
    templateTreeHeaders.forEach(header => {
        header.style.pointerEvents = 'none';
    });

    // ============================================
    // 상세보기 모드: URL에서 ID 파라미터 확인 및 데이터 로드
    // ============================================
    function getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    async function loadReceiptTripData(id) {
        try {
            const data = await window.fetchWithErrorHandling(`/api/receipt-trips/${id}`);

            if (!data) {
                // Error already handled by fetchWithErrorHandling (404, 403, 500)
                return;
            }


            // receipt_trip.idx 저장 (중복 체크 제외용)
            currentReceiptTripIdx = data.idx;

            // 데이터 로드 중 초기화 방지
            window._tripLoadingData = true;

            // 폼에 데이터 채우기
            await populateForm(data);

            // 저장 버튼 숨기기, 수정/삭제 버튼 표시 (상세보기 모드)
            if (submitBtn) {
                submitBtn.style.display = 'none';
            }
            const updateBtn = document.getElementById('updateBtn');
            const deleteBtn = document.getElementById('deleteBtn');
            if (updateBtn) {
                updateBtn.style.display = 'inline-block';
            }
            if (deleteBtn) {
                deleteBtn.style.display = 'inline-block';
            }

            // 로딩 오버레이 숨김
            window.hidePageLoadingOverlay();

            return data;
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            showError('데이터를 불러오는데 실패했습니다.');
            window.hidePageLoadingOverlay();
        }
    }

    async function populateForm(data) {
        isLoadingTripData = true;
        // 수정 시 활동비 비교를 위해 원래 totalFee 저장
        window._originalTotalFee = data.totalFee || 0;

        // 프로젝트 선택
        const tripProject = document.getElementById('trip_project');
        const selectedProjectIdxInput = document.getElementById('selectedProjectIdx');
        if (data.projectIdx) {
            const proj = projects.find(p => String(p.idx) === String(data.projectIdx));
            if (proj) {
                if (tripProject) {
                    tripProject.value = proj.projectName;
                    tripProject.style.borderColor = '';
                    tripProject.classList.remove('field-empty');
                }
                if (selectedProjectIdxInput) selectedProjectIdxInput.value = proj.idx;
                document.querySelectorAll('.trip-auto-project').forEach(f => {
                    const name = proj.projectName || '';
                    f.textContent = name;
                    if (name.length > 35) { f.style.fontSize = '8px'; }
                    else if (name.length > 25) { f.style.fontSize = '9px'; }
                    else if (name.length > 15) { f.style.fontSize = '10px'; }
                    else { f.style.fontSize = ''; }
                });
                document.querySelectorAll('.trip-auto-pi').forEach(f => { f.textContent = proj.projectManagerName || ''; });
                await loadProjectMembers(proj.idx);
                loadProjectCards(proj.idx);
                updateExpenseTooltip();
            } else if (data.projectName) {
                if (tripProject) tripProject.value = data.projectName;
                if (selectedProjectIdxInput) selectedProjectIdxInput.value = data.projectIdx;
                await loadProjectMembers(data.projectIdx);
                loadProjectCards(data.projectIdx);
                updateExpenseTooltip();
            }
        }

        // 출장 일자
        const tripDate = document.getElementById('trip_date');
        if (tripDate && data.tripDate) {
            tripDate.value = data.tripDate;
        }

        // 품의서 날짜 복원
        const requisitionDateInputPop = document.getElementById('trip_requisition_date');
        if (requisitionDateInputPop) {
            requisitionDateInputPop.value = data.requisitionDate || getTodayString();
        }

        // 출장 기간 (duration) 복원
        const tripDuration = document.getElementById('trip_duration');
        if (tripDuration) {
            tripDuration.value = data.duration != null ? data.duration : 0;
        }

        // 출장지
        const tripLocation = document.getElementById('trip_location');
        if (tripLocation && data.location) {
            tripLocation.value = data.location;
        }

        // 출장 목적
        const tripPurpose = document.getElementById('trip_purpose');
        if (tripPurpose && data.purpose) {
            tripPurpose.value = data.purpose;
        }

        // 작성자
        const tripReporter = document.getElementById('trip_reporter');
        if (tripReporter && data.authorUserName) {
            tripReporter.value = data.authorUserName;
            if (data.drafterUserIdx) {
                tripReporter.setAttribute('data-reporter-id', data.drafterUserIdx);
            }
        }

        // 사용 카드 복원
        if (data.cardIdx) {
            const tripCardField = document.getElementById('trip_card');
            const selectedCardIdxInput = document.getElementById('selectedCardIdx');
            if (selectedCardIdxInput) selectedCardIdxInput.value = data.cardIdx;
            if (tripCardField) {
                if (data.cardName) {
                    tripCardField.value = data.cardName;
                } else {
                    // 카드 목록에서 이름 조회
                    const found = projectCards.find(c => c.idx === data.cardIdx);
                    tripCardField.value = found ? found.cardName : `카드 #${data.cardIdx}`;
                }
                tripCardField.classList.remove('field-empty');
            }
            selectedCard = { idx: data.cardIdx, cardName: data.cardName || '' };
        }

        // 출장 내용 및 결과
        const tripResult = document.getElementById('trip_result');
        if (tripResult && data.content) {
            tripResult.value = data.content;
            tripResult.dataset.userModified = 'true'; // 자동 업데이트 방지
        }

        // 출장인원 로드
        if (data.attendees && data.attendees.length > 0) {
            window.currentTripPersons = data.attendees.map(attendee => {
                const posName = attendee.position || '';
                const posCode = attendee.positionCode || '';

                // 일비 계산 (1순위: projectExpenseSettings, 2순위: fixedExpenses)
                let tripExpense = 0;
                if (projectExpenseSettings && projectExpenseSettings.length > 0 && posCode) {
                    const ps = projectExpenseSettings.find(s => s.positionCode === posCode && s.expenseItemName === '출장비');
                    tripExpense = ps ? ps.amount : (fixedExpenses[posCode] || fixedExpenses[posName] || 0);
                } else {
                    tripExpense = fixedExpenses[posCode] || fixedExpenses[posName] || 0;
                }

                // 식비 계산 (1순위: projectExpenseSettings, 2순위: fixedMealExpenses)
                let mealExpense = 0;
                if (projectExpenseSettings && projectExpenseSettings.length > 0 && posCode) {
                    const ms = projectExpenseSettings.find(s => s.positionCode === posCode && s.expenseItemName === '중식비');
                    mealExpense = ms ? ms.amount : (fixedMealExpenses[posCode] || fixedMealExpenses[posName] || 0);
                } else {
                    mealExpense = fixedMealExpenses[posCode] || fixedMealExpenses[posName] || 0;
                }

                return {
                    id: String(attendee.userIdx),
                    name: attendee.name,
                    dept: attendee.department || '',
                    position: posName,
                    posCode: posCode,
                    mealExpense: mealExpense,
                    tripExpense: tripExpense
                };
            });
            if (typeof window.renderTripPersonListInTemplate === 'function') {
                window.renderTripPersonListInTemplate();
            }
        }

        // 모든 input 이벤트 트리거하여 자동 채우기 활성화
        setTimeout(async () => {
            // 날짜 자동 채우기
            if (tripDate) {
                tripDate.dispatchEvent(new Event('change'));
            }

            // 출장지 자동 채우기
            if (tripLocation) {
                tripLocation.dispatchEvent(new Event('input'));
            }

            // 출장 목적 자동 채우기
            if (tripPurpose) {
                tripPurpose.dispatchEvent(new Event('input'));
            }

            // 작성자 자동 채우기
            if (tripReporter) {
                tripReporter.dispatchEvent(new Event('input'));
            }

            // 출장 내용 및 결과 자동 채우기
            if (tripResult) {
                document.querySelectorAll('.trip-auto-result').forEach(field => {
                    field.innerHTML = tripResult.value.trimEnd().replace(/\n/g, '<br>');
                });
            }

            // 일별 비용 명세 복원 (날짜 기준 매칭)
            if (data.dailyExpenses && data.dailyExpenses.length > 0) {
                const dailyExpenseBody = document.getElementById('dailyExpenseBody');
                if (dailyExpenseBody) {
                    const dataRows = Array.from(dailyExpenseBody.children)
                        .filter(r => !r.classList.contains('expense-guide-row'));

                    data.dailyExpenses.forEach(expense => {
                        // 서버 날짜 "2026-03-09" → "2026.03.09" 변환
                        const expenseDateDot = expense.expenseDate
                            ? String(expense.expenseDate).replace(/-/g, '.')
                            : null;
                        if (!expenseDateDot) return;

                        const row = dataRows.find(r => {
                            const dateCell = r.querySelector('td:first-child');
                            return dateCell && dateCell.textContent.trim() === expenseDateDot;
                        });
                        if (!row) return;

                        const setInput = (type, value) => {
                            const input = row.querySelector(`[data-type="${type}"]`);
                            if (input && value != null && Number(value) > 0) {
                                input.value = Number(value).toLocaleString('ko-KR');
                                input.dispatchEvent(new Event('input'));
                            }
                        };
                        setInput('transport', expense.transportationFee);
                        setInput('lodging',   expense.accommodationFee);
                        setInput('meal',      expense.mealFee);
                        setInput('other',     expense.otherFee);
                    });
                }
            }

            // 출장인원 목록 렌더링
            const tripPersonList = document.getElementById('tripPersonList');
            if (tripPersonList && window.currentTripPersons && window.currentTripPersons.length > 0) {
                tripPersonList.innerHTML = window.currentTripPersons.map(person => `
                    <div class="trip-person-item">
                        <div class="trip-person-info">
                            <span class="name">${person.name}</span>
                            <span>${person.dept}</span>
                            <span>${person.position || ''}</span>
                        </div>
                        <button type="button" class="trip-person-remove" onclick="removeTripPersonInTemplate('${person.id}')">
                            <i class="fas fa-times"></i> 제거
                        </button>
                    </div>
                `).join('');

            }

            // 데이터 로드 완료 — 이후 updateTripResult는 textarea도 갱신
            isLoadingTripData = false;

            // 수정 모드 진입 즉시 검증 — 작성자가 출장 기간에 활성인지
            try {
                await revalidateReporterAgainstTripRange();
            } catch (e) {
                console.warn('[populateForm] reporter 재검증 오류:', e);
            }

        }, 200);

        // 첨부파일 로드 및 표시
        if (data.attachments && data.attachments.length > 0) {
            displayExistingAttachments(data.attachments);
        }
    }

    // ============================================
    // 직급별 경비 기준 툴팁 업데이트
    // ============================================
    function updateExpenseTooltip() {
        const content = document.getElementById('expenseTooltipContent');
        if (!content) return;

        if (!projectMembers || projectMembers.length === 0) {
            content.innerHTML = '<div class="expense-tooltip-loading" style="line-height:1.4;">프로젝트 선택 시<br>직급별 출장비 정보를<br>확인하실 수 있습니다</div>';
            return;
        }

        // 프로젝트 팀원의 고유 직급 목록
        const seen = new Set();
        const positions = projectMembers
            .map(m => ({ name: m.employeePositionName || '직급 미지정', code: m.employeePositionCode }))
            .filter(p => { if (seen.has(p.name)) return false; seen.add(p.name); return true; });

        const rows = positions.map(pos => {
            let meal = 0;
            if (projectExpenseSettings && projectExpenseSettings.length > 0 && pos.code) {
                const ms = projectExpenseSettings.find(s => s.positionCode === pos.code && s.expenseItemName === '중식비');
                if (ms && ms.amount) meal = ms.amount;
            }
            if (!meal) meal = fixedMealExpenses[pos.code] || fixedMealExpenses[pos.name] || 0;

            let daily = 0;
            if (projectExpenseSettings && projectExpenseSettings.length > 0 && pos.code) {
                const ds = projectExpenseSettings.find(s => s.positionCode === pos.code && s.expenseItemName === '출장비');
                if (ds && ds.amount) daily = ds.amount;
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

    function updateTripPersonCount() {
        const badge = document.getElementById('tripPersonCountBadge');
        if (!badge) return;
        const count = (window.currentTripPersons || []).length;
        if (count > 0) {
            badge.textContent = `${count}명`;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    // ============================================
    // 필수 필드 검증 (빨간색 + shake 애니메이션)
    // ============================================
    function validateRequiredFields() {
        const requiredIds = ['trip_project', 'trip_reporter', 'trip_card', 'trip_location', 'trip_purpose'];
        let allFilled = true;

        requiredIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (!el.value || !el.value.trim()) {
                el.classList.add('field-empty');
                allFilled = false;
            } else {
                el.classList.remove('field-empty');
            }
        });

        // 출장 내용 및 결과 — "- 출장 내용 :" 이후에 실제 텍스트가 있는지 검증
        const tripResultEl = document.getElementById('trip_result');
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

        // 출장 인원 영역 검증
        const tripPersonArea = document.getElementById('tripPersonArea');
        const persons = window.currentTripPersons || [];
        if (tripPersonArea) {
            if (persons.length === 0) {
                tripPersonArea.classList.add('field-empty');
                allFilled = false;
            } else {
                tripPersonArea.classList.remove('field-empty');
            }
        }

        // 날짜별 비용 검증 — 합계 > 0 (날짜 입력 후 비용 행이 생성된 경우에만)
        const expenseTable = document.getElementById('dailyExpenseTable');
        const expenseInputs = document.querySelectorAll('.expense-input');
        if (expenseTable && expenseInputs.length > 0) {
            const totalFee = Array.from(expenseInputs)
                .reduce((s, inp) => s + (parseInt(inp.value.replace(/[^0-9]/g, '')) || 0), 0);
            if (totalFee === 0) {
                expenseTable.classList.add('field-empty');
                allFilled = false;
            } else {
                expenseTable.classList.remove('field-empty');
            }
        } else if (expenseTable) {
            expenseTable.classList.remove('field-empty');
        }

        // 인쇄 버튼 표시/숨김: 비용 1개 이상 입력 AND 초과 오류 없을 때만 표시
        const hasAnyExpense = Array.from(document.querySelectorAll('.expense-input'))
            .some(inp => (parseInt(inp.value.replace(/[^0-9]/g, '')) || 0) > 0);
        const printBtn = document.getElementById('printDocumentBtn');
        if (printBtn) {
            printBtn.style.display = (hasAnyExpense && !hasExpenseOverflow) ? 'inline-flex' : 'none';
        }
    }

    // 공식문서 인쇄
    window.printTripDocument = function() {
        // 공식문서 미리보기가 닫혀있으면 열기
        const wrapper = document.querySelector('.document-form-wrapper');
        if (wrapper && wrapper.classList.contains('collapsed')) {
            wrapper.classList.remove('collapsed');
            const toggle = document.getElementById('documentFormToggle');
            if (toggle) toggle.classList.add('active');
        }

        // 잠시 대기 후 인쇄 (DOM 렌더링 완료 후)
        setTimeout(function() {
            window.print();
        }, 300);
    };

    // 복명서 레이아웃 동적 조정 (출장 일수에 따라 CSS 클래스 적용)
    function adjustTripReportLayout(dayCount) {
        const reportFormDiv = document.getElementById('tripReportFormDiv');
        if (!reportFormDiv) return;
        // 결재 서명칸은 항상 78px 고정
        const signRow = document.getElementById('tripReportSignRow');
        if (signRow) signRow.querySelectorAll('td').forEach(td => { td.style.height = '78px'; });
        reportFormDiv.classList.remove('trip-1day', 'trip-2day', 'trip-3day', 'trip-4day');
        if      (dayCount <= 1) reportFormDiv.classList.add('trip-1day');
        else if (dayCount === 2) reportFormDiv.classList.add('trip-2day');
        else if (dayCount === 3) reportFormDiv.classList.add('trip-3day');
        else                     reportFormDiv.classList.add('trip-4day');
    }

    // 필드 변경 시 재검증
    ['trip_project', 'trip_location', 'trip_date', 'trip_purpose', 'trip_result'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', validateRequiredFields);
            el.addEventListener('change', validateRequiredFields);
        }
    });

    // 출장 인원 추가/제거 시 재검증 (전역 함수 래핑)
    const _origAddTripPersons = window.addTripPersonsToTrip;
    window.addTripPersonsToTrip = function(...args) {
        if (_origAddTripPersons) _origAddTripPersons(...args);
        validateRequiredFields();
    };
    const _origRemoveTripPerson = window.removeTripPersonInTemplate;
    window.removeTripPersonInTemplate = function(...args) {
        if (_origRemoveTripPerson) _origRemoveTripPerson(...args);
        validateRequiredFields();
    };

    // 오늘 날짜 자동 설정 (상세보기 모드가 아닐 때만)
    const receiptTripId = getUrlParameter('documentIdx') || getUrlParameter('id');
    if (!receiptTripId) {
        // 신규 작성 모드 - 로딩 오버레이 숨김
        window.hidePageLoadingOverlay();

        setTimeout(() => {
            const tripDate = document.getElementById('trip_date');
            if (tripDate && !tripDate.value) {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                tripDate.value = `${yyyy}-${mm}-${dd}`;
                // 날짜 설정 후 자동 채우기 트리거
                tripDate.dispatchEvent(new Event('change'));
            }

            // 날짜 입력 필드 전체 영역 클릭 시 날짜 선택기 열기
            if (tripDate) {
                tripDate.addEventListener('click', function() {
                    if (this.showPicker) {
                        this.showPicker();
                    }
                });
            }

            // 초기 필수 필드 강조
            validateRequiredFields();
        }, 200);
    } else {
        // URL에 ID 파라미터가 있으면 데이터 로드
        window.showPageLoadingOverlay();
        setTimeout(async () => {
            await loadReceiptTripData(receiptTripId);
        }, 500);
    }

    // 수정 버튼 이벤트
    const updateBtn = document.getElementById('updateBtn');
    if (updateBtn) {
        updateBtn.addEventListener('click', async function() {
            if (!currentReceiptTripIdx) {
                showError('문서 ID를 찾을 수 없습니다.');
                return;
            }

            // 필수 필드 검증 (화면 순서대로)
            const selectedProjectIdxInput = document.getElementById('selectedProjectIdx');
            const tripCardInputUpd = document.getElementById('trip_card');
            const selectedCardIdxInputUpd = document.getElementById('selectedCardIdx');
            const tripReporterInputUpd = document.getElementById('trip_reporter');
            const locationInput = document.getElementById('trip_location');
            const dateInput = document.getElementById('trip_date');
            const tripPurposeInputUpd = document.getElementById('trip_purpose');
            const tripResultElUpd = document.getElementById('trip_result');

            if (!selectedProjectIdxInput?.value) {
                showWarning('프로젝트를 선택해주세요.');
                document.getElementById('trip_project')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!selectedCardIdxInputUpd?.value) {
                showWarning('사용 카드를 선택해주세요.');
                tripCardInputUpd?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!tripReporterInputUpd?.value?.trim()) {
                showWarning('작성자를 선택해주세요.');
                tripReporterInputUpd?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!locationInput?.value?.trim()) {
                showWarning('출장지를 입력해주세요.');
                locationInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                locationInput?.focus({ preventScroll: true });
                return;
            }
            if (!dateInput?.value) {
                showWarning('출장 일자를 입력해주세요.');
                dateInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!window.currentTripPersons || window.currentTripPersons.length === 0) {
                showWarning('출장인원을 선택해주세요.');
                document.getElementById('tripPersonArea')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!tripPurposeInputUpd?.value?.trim()) {
                showWarning('출장목적을 입력해주세요.');
                tripPurposeInputUpd?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                tripPurposeInputUpd?.focus({ preventScroll: true });
                return;
            }
            const markerUpd = '- 출장 내용 :';
            const tripResultValUpd = tripResultElUpd?.value || '';
            const markerIdxUpd = tripResultValUpd.indexOf(markerUpd);
            const hasResultContentUpd = markerIdxUpd !== -1
                ? tripResultValUpd.slice(markerIdxUpd + markerUpd.length).trim().length > 0
                : tripResultValUpd.trim().length > 0;
            if (!hasResultContentUpd) {
                showWarning('출장 내용 및 결과를 입력해주세요.');
                tripResultElUpd?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                tripResultElUpd?.focus({ preventScroll: true });
                return;
            }

            // 날짜별 비용 미입력 검증
            const expInputsCheck = document.querySelectorAll('.expense-input');
            const totalFeeCheck = Array.from(expInputsCheck).reduce((s, inp) => s + (parseFloat(inp.value.replace(/,/g, '')) || 0), 0);
            if (totalFeeCheck === 0) {
                showWarning('날짜별 사용금액을 입력해주세요.');
                document.getElementById('dailyExpenseTable')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            // 기준 금액 초과 시 수정 차단
            if (hasExpenseOverflow) {
                showWarning('기준 금액을 초과한 항목이 있습니다. 비용을 조정해주세요.');
                document.getElementById('dailyExpenseTable')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            // 활동비 초과 여부 확인 (경고만, 차단 없음)
            const projIdxForBudgetUpd = parseInt(selectedProjectIdxInput?.value);
            if (projIdxForBudgetUpd) {
                try {
                    const budgetResUpd = await fetch(`/api/projects/${projIdxForBudgetUpd}/activity-usage`);
                    if (budgetResUpd.ok) {
                        const budgetDataUpd = await budgetResUpd.json();
                        // 수정 시: 기존 이 문서의 금액은 이미 totalSpent에 포함되어 있으므로
                        // 새로 입력한 금액과 비교하기 위해 기존 금액을 제외한 후 새 금액을 더함
                        const expInputsUpd = document.querySelectorAll('.expense-input');
                        let newTotalFeeUpd = 0;
                        expInputsUpd.forEach(inp => { newTotalFeeUpd += parseFloat(inp.value.replace(/,/g, '')) || 0; });
                        // 기존 문서의 totalFee를 제외하고 새 금액 추가
                        const oldTotalFee = window._originalTotalFee || 0;
                        const adjustedSpent = (budgetDataUpd.totalSpent || 0) - oldTotalFee + newTotalFeeUpd;
                        if (adjustedSpent > (budgetDataUpd.activityBudget || 0)) {
                            const excessAmountUpd = adjustedSpent - (budgetDataUpd.activityBudget || 0);
                            const budgetResultUpd = await Swal.fire({
                                icon: 'warning',
                                title: '활동비 초과 경고',
                                html: `수정 금액(<b>${newTotalFeeUpd.toLocaleString()}원</b>)을 포함하면<br>활동비 예산을 <b style="color:#ef4444;">${excessAmountUpd.toLocaleString()}원</b> 초과합니다.<br><br>그래도 수정하시겠습니까?`,
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

            if (!(await showConfirm('출장 정보를 수정하시겠습니까?'))) {
                return;
            }

            // 참석자 목록 변환
            const attendeeDTOs = (window.currentTripPersons || []).map((person, index) => ({
                department: person.dept || null,
                name: person.name,
                userIdx: parseInt(person.id),
                position: person.position || null,
                displayOrder: index
            }));

            // 비용 합계 계산
            const expenseInputs = document.querySelectorAll('.expense-input');
            let totalTransportFee = 0;
            let totalAccommodationFee = 0;
            let totalMealFee = 0;
            let totalOtherFee = 0;

            expenseInputs.forEach(input => {
                const type = input.getAttribute('data-type');
                const value = parseFloat(input.value.replace(/,/g, '')) || 0;

                if (type === 'transport') totalTransportFee += value;
                else if (type === 'lodging') totalAccommodationFee += value;
                else if (type === 'meal') totalMealFee += value;
                else if (type === 'other') totalOtherFee += value;
            });

            // 일별 비용 명세 배열 구성
            const dailyExpenseBodyElUpd = document.getElementById('dailyExpenseBody');
            const dailyExpensesPayloadUpd = [];
            if (dailyExpenseBodyElUpd) {
                Array.from(dailyExpenseBodyElUpd.children)
                    .filter(r => !r.classList.contains('expense-guide-row'))
                    .forEach(row => {
                        const dateCell = row.querySelector('td:first-child');
                        const dateStr = dateCell ? dateCell.textContent.trim().replace(/\./g, '-') : null;
                        if (!dateStr) return;
                        const toNum = sel => parseInt((row.querySelector(sel)?.value || '0').replace(/,/g, '')) || 0;
                        dailyExpensesPayloadUpd.push({
                            expenseDate:       dateStr,
                            transportationFee: toNum('[data-type="transport"]'),
                            accommodationFee:  toNum('[data-type="lodging"]'),
                            mealFee:           toNum('[data-type="meal"]'),
                            otherFee:          toNum('[data-type="other"]')
                        });
                    });
            }

            const tripDurationEl = document.getElementById('trip_duration');
            const reporterElUpd = document.getElementById('trip_reporter');
            const drafterIdxUpd = reporterElUpd
                ? parseInt(reporterElUpd.getAttribute('data-reporter-id')) || null
                : null;
            const updateData = {
                projectIdx: parseInt(selectedProjectIdxInput?.value) || null,
                drafterUserIdx: drafterIdxUpd,
                tripDate: dateInput.value,
                requisitionDate: document.getElementById('trip_requisition_date')?.value || null,
                duration: tripDurationEl ? parseInt(tripDurationEl.value) || 0 : 0,
                location: locationInput.value,
                transportationFee: totalTransportFee || null,
                accommodationFee: totalAccommodationFee || null,
                mealFee: totalMealFee || null,
                otherFee: totalOtherFee || null,
                purpose: document.getElementById('trip_purpose')?.value || null,
                content: document.getElementById('trip_result')?.value || null,
                cardIdx: selectedCard ? selectedCard.idx : null,
                paymentMethod: '카드로 결제',
                attendees: attendeeDTOs,
                dailyExpenses: dailyExpensesPayloadUpd
            };

            try {
                // 1. 삭제 예정 첨부파일 순차 삭제
                for (const id of deletedAttachmentIds) {
                    const delRes = await fetch(`/api/receipt-trips/attachments/${id}`, { method: 'DELETE' });
                    if (!delRes.ok) console.warn(`첨부파일(ID: ${id}) 삭제 실패`);
                }

                // 2. FormData로 수정 요청 (신규 파일 포함)
                const formData = new FormData();
                formData.append('data', JSON.stringify(updateData));
                selectedReceiptFiles.forEach(file  => formData.append('receiptFiles',  file));
                selectedDocumentFiles.forEach(file => formData.append('documentFiles', file));

                const response = await fetch(`/api/receipt-trips/${currentReceiptTripIdx}`, {
                    method: 'PUT',
                    body: formData
                });

                if (response.ok) {
                    await Swal.fire({
                        icon: 'success',
                        title: '수정 완료',
                        text: '출장 정보가 수정되었습니다.',
                        timer: 3000,
                        timerProgressBar: true,
                        showConfirmButton: true,
                        confirmButtonText: '확인',
                        allowOutsideClick: false
                    });
                    window.location.reload();
                } else {
                    showError('출장 수정에 실패했습니다.');
                }
            } catch (error) {
                console.error('수정 오류:', error);
                showError('출장 수정 중 오류가 발생했습니다.');
            }
        });
    }

    // 삭제 버튼 이벤트
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function() {
            if (!currentReceiptTripIdx) {
                showError('문서 ID를 찾을 수 없습니다.');
                return;
            }

            if (!(await showDeleteConfirm('출장 정보'))) {
                return;
            }

            try {
                const response = await fetch(`/api/receipt-trips/${currentReceiptTripIdx}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    await Swal.fire({ icon: 'success', title: '삭제 완료', timer: 1500, showConfirmButton: false });
                    popupAwareRedirect('/project/documents');
                } else {
                    showError('출장 삭제에 실패했습니다.');
                }
            } catch (error) {
                console.error('삭제 오류:', error);
                showError('출장 삭제 중 오류가 발생했습니다.');
            }
        });
    }

    // 과제명이 비어있을 때 빨간색 테두리 표시
    setTimeout(() => {
        const tripProject = document.getElementById('trip_project');
        if (tripProject && !tripProject.value) {
            tripProject.style.borderColor = '#ef5350';
        }
    }, 500);

    // 품의서 날짜: 신규 작성 시 오늘 날짜 기본 세팅
    const requisitionDateInput = document.getElementById('trip_requisition_date');
    if (requisitionDateInput && !requisitionDateInput.value) {
        requisitionDateInput.value = getTodayString();
    }
});
