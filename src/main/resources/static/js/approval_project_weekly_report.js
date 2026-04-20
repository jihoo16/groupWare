// 주간업무보고 작성 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 검색 유틸리티 (공통)
    const searchUtils = new SearchUtils();
    const matchesSearch = (text, keyword) => searchUtils.matchesSearch(text, keyword);
    const highlightText = (text, keyword) => searchUtils.highlightText(text, keyword);

    // 전역 변수
    const currentUserIdx = window.CURRENT_USER?.idx || null;
    const currentUserName = window.CURRENT_USER?.empName || '';
    const currentUserDept = window.CURRENT_USER?.empDeptName || '';

    let selectedFiles = [];
    let existingFiles = []; // 서버에서 로드한 기존 파일 목록
    let deletedFileIds = []; // 삭제 예정인 파일 ID 목록 (저장 시에만 실제 삭제)
    let projects = [];
    let projectMembers = []; // 프로젝트 참여인원 목록 (참고인 선택용)
    let selectedReferences = []; // 참고인 목록 {idx, name, dept, position}
    let selectedEmployee = null;
    let selectedProject = null; // 선택된 프로젝트
    let employees = []; // 전체 직원 목록 (결재자 자동 설정용)
    let selectedApprovers = []; // 선택된 결재자 목록
    let currentDocumentIdx = null; // 수정 모드일 때 현재 문서의 documentIdx

    // DOM 요소
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const submitBtn = document.getElementById('submitBtn');
    const projectInput = document.getElementById('projectInput');
    const selectedProjectIdx = document.getElementById('selectedProjectIdx');
    const weeklyAchievementRateInput = document.getElementById('weeklyAchievementRate');
    const reportPeriodDisplay = document.getElementById('reportPeriodDisplay');
    const reportStartDate = document.getElementById('reportStartDate');
    const reportEndDate = document.getElementById('reportEndDate');
    const applicantName = document.getElementById('applicantName');
    const applicantDept = document.getElementById('applicantDept');

    // 달력 관련 DOM
    const calendarDays = document.getElementById('calendarDays');
    const calendarTitle = document.getElementById('calendarTitle');
    const prevMonth = document.getElementById('prevMonth');
    const nextMonth = document.getElementById('nextMonth');

    // 달력 상태 변수
    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth();
    let selectedWeekDates = []; // 선택된 주의 평일들 (월~금)

    // 공휴일 데이터 (서버에서 동적으로 로드)
    let holidaysCache = {}; // { '2024': { '2024-01-01': '신정', ... }, '2025': { ... } }

    // 공휴일 데이터 로드 (API 사용)
    async function loadHolidays(year) {
        // 이미 로드된 경우 캐시 사용
        if (holidaysCache[year]) {
            return holidaysCache[year];
        }

        try {
            const response = await fetch(`/api/holidays?year=${year}`);
            if (response.ok) {
                const holidays = await response.json();
                holidaysCache[year] = holidays;
                return holidays;
            } else {
                console.error(`${year}년 공휴일 로드 실패`);
                return {};
            }
        } catch (error) {
            console.error(`${year}년 공휴일 로드 오류:`, error);
            return {};
        }
    }

    // 공휴일 확인 함수
    function isPublicHoliday(dateStr) {
        const year = dateStr.split('-')[0];
        const yearHolidays = holidaysCache[year];
        if (!yearHolidays) {
            return false;
        }
        return yearHolidays[dateStr] ? true : false;
    }

    // 입력 필드
    const achievements = document.getElementById('achievements');
    const issues = document.getElementById('issues');
    const nextWeekPlan = document.getElementById('nextWeekPlan');
    const remarks = document.getElementById('remarks');

    // ============================================
    // 사용자 정보 채우기
    // ============================================
    // window.CURRENT_USER가 없으면 경고 표시
    if (!window.CURRENT_USER || !currentUserIdx) {
        console.warn('경고: window.CURRENT_USER가 설정되지 않았습니다. 사용자 정보를 표시할 수 없습니다.');
        console.warn('현재 window.CURRENT_USER:', window.CURRENT_USER);
    }

    if (applicantName) applicantName.textContent = currentUserName || '-';
    if (applicantDept) applicantDept.textContent = currentUserDept || '-';

    // 문서 미리보기 영역도 채우기
    const autoReporter = document.querySelector('.auto-reporter');
    const autoDept = document.querySelector('.auto-dept');
    if (autoReporter) autoReporter.textContent = currentUserName || '-';
    if (autoDept) autoDept.textContent = currentUserDept || '-';

    // ============================================
    // 템플릿 사이드바 접기/펼치기
    // ============================================
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

            const icon = this.querySelector('i');
            if (allExpanded) {
                icon.className = 'fas fa-chevron-up';
            } else {
                icon.className = 'fas fa-chevron-down';
            }
        });
    }

    const categoryHeaders = document.querySelectorAll('.category-header');
    categoryHeaders.forEach(header => {
        header.addEventListener('click', function(e) {
            e.preventDefault();
            const category = this.closest('.menu-category');
            category.classList.toggle('expanded');
        });
    });

    // ============================================
    // 초기화: 수정 모드 확인
    // ============================================
    const urlParams = new URLSearchParams(window.location.search);
    const reportId = urlParams.get('id');
    const isEditMode = !!reportId;

    // ============================================
    // 초기화: 코드 상수 로드
    // ============================================
    loadCodeConstants();

    // ============================================
    // 수정 모드: 기존 데이터 로드
    // ============================================
    if (isEditMode) {
        loadReportForEdit(reportId);
    }

    // ============================================
    // 직원 목록 로드 (결재자 자동 설정용)
    // ============================================
    async function loadEmployees() {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                employees = await response.json();
                console.log('직원 데이터 로드 완료:', employees.length + '명');
            } else {
                console.error('직원 데이터 로드 실패:', response.status);
            }
        } catch (error) {
            console.error('직원 데이터 로드 오류:', error);
        }
    }

    // ============================================
    // 프로젝트 목록 로드 및 모달
    // ============================================
    const projectModal = document.getElementById('projectModal');
    const projectSearch = document.getElementById('projectSearch');
    const projectList = document.getElementById('projectList');

    async function loadProjects() {
        try {
            // 현재 사용자가 참여중인 프로젝트만 조회
            const response = await fetch(`/api/projects?memberIdx=${currentUserIdx}`);
            if (response.ok) {
                projects = await response.json();

                // URL 파라미터에서 projectIdx 확인 후 자동 선택
                const urlParams = new URLSearchParams(window.location.search);
                const projectIdx = urlParams.get('projectIdx');
                if (projectIdx) {
                    await autoSelectProject(parseInt(projectIdx));
                }
            }
        } catch (error) {
            console.error('프로젝트 로드 오류:', error);
        }
    }

    // URL 파라미터로 전달된 프로젝트 자동 선택
    async function autoSelectProject(projectIdx) {
        const project = projects.find(p => p.idx === projectIdx);
        if (!project) {
            console.warn('프로젝트를 찾을 수 없습니다:', projectIdx);
            return;
        }

        selectedProject = project;

        // 프로젝트 입력 필드에 표시
        if (projectInput) {
            projectInput.value = project.projectName;
            // 프로젝트 선택 시 필수 표시 제거
            projectInput.classList.remove('required-missing');
        }
        if (selectedProjectIdx) {
            selectedProjectIdx.value = project.idx;
        }

        // 마지막 달성률 표시
        const currentProgressRate = document.getElementById('currentProgressRate');
        if (currentProgressRate) {
            const progressRate = project.progressRate ?? 0;
            currentProgressRate.textContent = progressRate + '%';
            console.log('프로젝트 달성률 자동 설정:', project.projectName, '→', progressRate + '%');

            // 추가 달성률의 최소값 및 기본값 설정
            updateInputProgressMin(progressRate);
        }

        // 미리보기 업데이트
        const autoProject = document.querySelector('.auto-project');
        if (autoProject) {
            autoProject.textContent = project.projectName;
        }

        // 결재자 자동 설정: 프로젝트 책임자
        await autoSetApprovers(project);
    }

    // 페이지 로드 시 데이터 로드
    loadEmployees();
    loadProjects();

    // 초기 로드 시 프로젝트 미선택 상태 표시
    if (!selectedProject && projectInput) {
        projectInput.classList.add('required-missing');
    }

    // 프로젝트 목록 렌더링
    function renderProjectList(list, keyword = '') {
        if (!projectList) return;

        projectList.innerHTML = '';

        // 목록이 비어있을 때
        if (list.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'modal-empty-state';
            emptyMessage.innerHTML = `
                <i class="fas fa-folder-open"></i>
                <p>${keyword ? '검색 결과가 없습니다' : '등록된 프로젝트가 없습니다'}</p>
            `;
            projectList.appendChild(emptyMessage);
            return;
        }

        list.forEach(proj => {
            const item = document.createElement('div');
            item.className = 'modal-item';
            if (selectedProject && selectedProject.idx === proj.idx) {
                item.classList.add('selected');
            }

            const highlightedName = highlightText(proj.projectName, keyword);
            const highlightedDesc = highlightText(proj.description || '설명 없음', keyword);

            item.innerHTML = `
                <i class="fas fa-folder"></i>
                <div class="modal-item-info">
                    <div class="modal-item-name">${highlightedName}</div>
                    <div class="modal-item-detail">${highlightedDesc}</div>
                </div>
            `;

            item.addEventListener('click', async function() {
                selectedProject = proj;

                // 프로젝트 입력 필드에 표시
                if (projectInput) {
                    projectInput.value = selectedProject.projectName;
                    // 프로젝트 선택 시 필수 표시 제거
                    projectInput.classList.remove('required-missing');
                }
                if (selectedProjectIdx) {
                    selectedProjectIdx.value = selectedProject.idx;
                }

                // 마지막 달성률 표시
                const currentProgressRate = document.getElementById('currentProgressRate');
                if (currentProgressRate) {
                    const progressRate = selectedProject.progressRate ?? 0;
                    currentProgressRate.textContent = progressRate + '%';
                    console.log('프로젝트 달성률 업데이트:', selectedProject.projectName, '→', progressRate + '%');

                    // 추가 달성률의 최소값 및 기본값 설정
                    updateInputProgressMin(progressRate);
                }

                // 미리보기 업데이트
                const autoProject = document.querySelector('.auto-project');
                if (autoProject) {
                    autoProject.textContent = selectedProject.projectName;
                }

                // 결재자 자동 설정: 프로젝트 책임자
                await autoSetApprovers(selectedProject);

                // 주간 선택된 경우 이전주 차주계획 체크
                if (selectedWeekDates.length > 0) {
                    checkPrevWeekPlan();
                }

                closeProjectModal();
            });

            projectList.appendChild(item);
        });
    }

    // 프로젝트 검색
    if (projectSearch) {
        projectSearch.addEventListener('input', function() {
            const keyword = this.value.trim();
            const filtered = projects.filter(proj =>
                matchesSearch(proj.projectName, keyword) ||
                matchesSearch(proj.description, keyword)
            );
            renderProjectList(filtered, keyword);
        });
    }

    // 프로젝트 입력 필드 클릭 시 모달 열기
    if (projectInput) {
        projectInput.addEventListener('click', function() {
            openProjectModal();
        });
    }

    window.openProjectModal = function() {
        if (projectModal) {
            projectModal.classList.add('show');
            renderProjectList(projects);
        }
    };

    window.closeProjectModal = function() {
        if (projectModal) {
            projectModal.classList.remove('show');
            if (projectSearch) projectSearch.value = '';
        }
    };

    window.selectProject = async function() {
        if (!selectedProject) {
            showWarning('프로젝트를 선택해주세요.');
            return;
        }

        // 프로젝트 입력 필드에 표시
        if (projectInput) {
            projectInput.value = selectedProject.projectName;
            // 프로젝트 선택 시 필수 표시 제거
            projectInput.classList.remove('required-missing');
        }
        if (selectedProjectIdx) {
            selectedProjectIdx.value = selectedProject.idx;
        }

        // 현재 전체 달성률 표시
        const currentProgressRate = document.getElementById('currentProgressRate');
        if (currentProgressRate && selectedProject.progressRate !== undefined) {
            const progressRate = selectedProject.progressRate || 0;
            currentProgressRate.textContent = progressRate + '%';

            // 추가 달성률의 최소값 및 기본값 설정
            updateInputProgressMin(progressRate);
        }

        // 미리보기 업데이트
        const autoProject = document.querySelector('.auto-project');
        if (autoProject) {
            autoProject.textContent = selectedProject.projectName;
        }

        // 결재자 자동 설정: 프로젝트 책임자
        await autoSetApprovers(selectedProject);

        closeProjectModal();
    };

    // 결재자 자동 설정 함수
    async function autoSetApprovers(project) {
        try {
            // 직원 목록이 없으면 먼저 로드
            if (employees.length === 0) {
                await loadEmployees();
            }

            // 결재자 초기화
            selectedApprovers = [];

            // 1. 담당 (현재 로그인 사용자) 추가
            console.log('1. 본인(담당) 검색 - currentUserIdx:', currentUserIdx);
            if (currentUserIdx) {
                const currentUser = employees.find(emp => emp.idx === currentUserIdx);
                console.log('1. 본인(담당) 결과:', currentUser ? currentUser.empName : '없음');
                if (currentUser) {
                    selectedApprovers.push({
                        idx: currentUser.idx,
                        name: currentUser.empName,
                        dept: currentUser.empDeptName || '',
                        position: currentUser.empPositionName || '',
                        isCurrentUser: true,  // 본인 플래그
                        isProjectManager: false
                    });
                }
            } else {
                console.error('1. 본인(담당) 오류: currentUserIdx가 null입니다.');
            }

            // 2. 연구책임자 (프로젝트의 projectManagerIdx) 추가
            console.log('2. 연구책임자 검색 - project.projectManagerIdx:', project.projectManagerIdx);
            if (project.projectManagerIdx) {
                const manager = employees.find(emp => emp.idx === project.projectManagerIdx);
                console.log('2. 연구책임자 결과:', manager ? manager.empName : '없음');
                if (manager) {
                    selectedApprovers.push({
                        idx: manager.idx,
                        name: manager.empName,
                        dept: manager.empDeptName || '',
                        position: manager.empPositionName || '',
                        isCurrentUser: false,
                        isProjectManager: true  // 연구책임자 플래그
                    });
                }
            } else {
                console.error('2. 연구책임자 오류: project.projectManagerIdx가 없습니다.');
            }

            console.log('최종 결재자 목록:', selectedApprovers);

            // 결재자 UI 업데이트
            renderApproverTags();
            updateApprovalLine();
        } catch (error) {
            console.error('결재자 자동 설정 오류:', error);
        }
    }

    // 결재자 태그 렌더링 함수 (미리보기 영역 업데이트)
    function renderApproverTags() {
        // 미리보기 영역의 결재자 이름 업데이트
        const approverNames = document.querySelectorAll('.approver-name');

        // 초기화
        approverNames.forEach(el => {
            el.textContent = '-';
        });

        // 결재자 정보 업데이트
        selectedApprovers.forEach((approver, index) => {
            const nameEl = document.querySelector(`.auto-approver-${index + 1}`);
            if (nameEl) {
                nameEl.textContent = approver.name || '-';
            }
        });
    }

    // 결재라인 업데이트 함수 (결재 서명 셀에 데이터 속성 설정)
    function updateApprovalLine() {
        // 결재 셀에 데이터 속성 설정
        const signCells = document.querySelectorAll('.approval-sign-cell');

        selectedApprovers.forEach((approver, index) => {
            if (signCells[index]) {
                signCells[index].setAttribute('data-approver-id', approver.idx);
                signCells[index].setAttribute('data-approver-name', approver.name);
            }
        });
    }

    // ============================================
    // 달력 관련 함수
    // ============================================

    // 날짜 포맷 (YYYY-MM-DD)
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 날짜 포맷 (YYYY.MM.DD 표시용)
    function formatDateDisplay(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    }

    // 오늘 날짜 확인
    function isToday(date) {
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
               date.getMonth() === today.getMonth() &&
               date.getDate() === today.getDate();
    }

    // 날짜가 선택된 주에 포함되는지 확인
    function isDateInSelectedWeek(dateStr) {
        return selectedWeekDates.includes(dateStr);
    }

    // 주의 평일(월~금) 가져오기
    function getWeekdaysInWeek(date) {
        const selected = new Date(date);
        const day = selected.getDay();
        // 일요일(0)인 경우 -6, 다른 날은 1-day로 월요일 계산
        let mondayOffset = day === 0 ? -6 : 1 - day;

        const monday = new Date(selected);
        monday.setDate(selected.getDate() + mondayOffset);

        const weekdays = [];
        for (let i = 0; i < 5; i++) { // 월~금 (5일)
            const weekday = new Date(monday);
            weekday.setDate(monday.getDate() + i);
            weekdays.push(formatDate(weekday));
        }

        return weekdays;
    }

    // 달력 렌더링
    async function renderCalendar() {
        if (!calendarDays || !calendarTitle) return;

        // 현재 표시 중인 년도의 공휴일 데이터 로드
        await loadHolidays(currentYear);

        // 이전/다음 달이 다른 년도인 경우 해당 년도도 로드
        const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        if (prevMonthYear !== currentYear) await loadHolidays(prevMonthYear);
        if (nextMonthYear !== currentYear) await loadHolidays(nextMonthYear);

        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const prevLastDay = new Date(currentYear, currentMonth, 0);

        const firstDayOfWeek = firstDay.getDay();
        const lastDate = lastDay.getDate();
        const prevLastDate = prevLastDay.getDate();

        calendarTitle.textContent = `${currentYear}년 ${currentMonth + 1}월`;
        calendarDays.innerHTML = '';

        // 이전 달 날짜
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = prevLastDate - i;
            const prevMonthDate = new Date(currentYear, currentMonth - 1, day);
            const dateStr = formatDate(prevMonthDate);
            const dayOfWeek = prevMonthDate.getDay();

            let classes = 'other-month';
            if (dayOfWeek === 0) classes += ' sunday';
            if (dayOfWeek === 6) classes += ' saturday';
            if (isPublicHoliday(dateStr)) classes += ' holiday';
            if (isDateInSelectedWeek(dateStr)) classes += ' selected';

            const dayEl = createDayElement(day, classes, dateStr);
            calendarDays.appendChild(dayEl);
        }

        // 현재 달 날짜
        for (let day = 1; day <= lastDate; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const dateStr = formatDate(date);
            const dayOfWeek = date.getDay();

            let classes = '';
            if (isToday(date)) classes += ' today';
            if (dayOfWeek === 0) classes += ' sunday';
            if (dayOfWeek === 6) classes += ' saturday';
            if (isPublicHoliday(dateStr)) classes += ' holiday';
            if (isDateInSelectedWeek(dateStr)) classes += ' selected';

            const dayEl = createDayElement(day, classes, dateStr);
            calendarDays.appendChild(dayEl);
        }

        // 다음 달 날짜
        const remainingCells = 42 - calendarDays.children.length;
        for (let day = 1; day <= remainingCells; day++) {
            const nextMonthDate = new Date(currentYear, currentMonth + 1, day);
            const dateStr = formatDate(nextMonthDate);
            const dayOfWeek = nextMonthDate.getDay();

            let classes = 'other-month';
            if (dayOfWeek === 0) classes += ' sunday';
            if (dayOfWeek === 6) classes += ' saturday';
            if (isPublicHoliday(dateStr)) classes += ' holiday';
            if (isDateInSelectedWeek(dateStr)) classes += ' selected';

            const dayEl = createDayElement(day, classes, dateStr);
            calendarDays.appendChild(dayEl);
        }
    }

    // 날짜 요소 생성
    function createDayElement(day, classes, dateStr = null) {
        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${classes}`;
        dayEl.textContent = day;

        if (dateStr) {
            // 다음 주 말(일요일)까지 선택 허용 (string 비교로 타임존 버그 방지)
            const today = new Date();
            const todayDay = today.getDay(); // 0=일, 1=월, ..., 6=토
            const daysUntilNextWeekEnd = todayDay === 0 ? 13 : (7 - todayDay) + 7;
            const nextWeekEnd = new Date(today);
            nextWeekEnd.setDate(today.getDate() + daysUntilNextWeekEnd);
            const nextWeekEndStr = formatDate(nextWeekEnd);

            if (dateStr > nextWeekEndStr) {
                // 다음 주 이후는 비활성화
                dayEl.classList.add('future-disabled');
            } else {
                dayEl.addEventListener('click', () => selectWeek(dateStr));
            }
        }

        return dayEl;
    }

    // 주 선택 (클릭한 날짜가 속한 주의 평일들을 자동 선택)
    function selectWeek(dateStr) {
        // 다음 주 말까지만 허용 (string 비교로 타임존 버그 방지)
        const today = new Date();
        const todayDay = today.getDay();
        const daysUntilNextWeekEnd = todayDay === 0 ? 13 : (7 - todayDay) + 7;
        const nextWeekEnd = new Date(today);
        nextWeekEnd.setDate(today.getDate() + daysUntilNextWeekEnd);
        const nextWeekEndStr = formatDate(nextWeekEnd);

        if (dateStr > nextWeekEndStr) {
            showWarning('다음 주를 초과하는 주간보고서는 작성할 수 없습니다.');
            return;
        }

        const clickedDate = new Date(dateStr.replace(/-/g, '/'));
        selectedWeekDates = getWeekdaysInWeek(clickedDate);

        // hidden input에 시작일과 종료일 저장
        if (selectedWeekDates.length > 0) {
            if (reportStartDate) reportStartDate.value = selectedWeekDates[0];
            if (reportEndDate) reportEndDate.value = selectedWeekDates[selectedWeekDates.length - 1];

            // 표시용 텍스트 업데이트
            const startDate = new Date(selectedWeekDates[0]);
            const endDate = new Date(selectedWeekDates[selectedWeekDates.length - 1]);
            const periodText = `${formatDateDisplay(startDate)} ~ ${formatDateDisplay(endDate)}`;

            if (reportPeriodDisplay) {
                reportPeriodDisplay.textContent = periodText;
            }

            // 미리보기 업데이트
            const autoPeriod = document.querySelector('.auto-period');
            if (autoPeriod) autoPeriod.textContent = periodText;
        }

        renderCalendar();

        // 이전주 차주계획 체크 (프로젝트가 선택된 경우)
        if (selectedProject) {
            checkPrevWeekPlan();
        }
    }

    // 월 네비게이션
    if (prevMonth) {
        prevMonth.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar();
        });
    }

    if (nextMonth) {
        nextMonth.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar();
        });
    }

    // 달력 초기화
    if (calendarDays && calendarTitle) {
        // 이번 주의 평일로 초기화
        const today = new Date();
        selectedWeekDates = getWeekdaysInWeek(today);

        if (selectedWeekDates.length > 0) {
            if (reportStartDate) reportStartDate.value = selectedWeekDates[0];
            if (reportEndDate) reportEndDate.value = selectedWeekDates[selectedWeekDates.length - 1];

            const startDate = new Date(selectedWeekDates[0]);
            const endDate = new Date(selectedWeekDates[selectedWeekDates.length - 1]);
            const periodText = `${formatDateDisplay(startDate)} ~ ${formatDateDisplay(endDate)}`;

            if (reportPeriodDisplay) {
                reportPeriodDisplay.textContent = periodText;
            }

            // 미리보기 업데이트
            const autoPeriod = document.querySelector('.auto-period');
            if (autoPeriod) autoPeriod.textContent = periodText;
        }

        renderCalendar();
    }

    // ============================================
    // 달성률 슬라이더 기능
    // ============================================
    const weeklyAchievementValueInput = document.getElementById('weeklyAchievementValue');
    const inputProgressRateSlider = document.getElementById('inputProgressRate');
    const inputProgressValueInput = document.getElementById('inputProgressValue');
    let currentProgressRateValue = 0; // 현재 마지막 달성률 저장

    // 5% 단위 근처에서 자석처럼 붙는 기능
    function magneticSnapToFive(value) {
        const nearest5 = Math.round(value / 5) * 5;
        const diff = Math.abs(value - nearest5);

        // 5% 단위 ±1.2 범위 내에 있으면 자동으로 5% 단위로 스냅
        // 예: 3.8~6.2 → 5%, 8.8~11.2 → 10%
        if (diff <= 1.2) {
            return nearest5;
        }

        return value;
    }

    // 미리보기와 슬라이더 UI 업데이트 함수
    function updateAchievementDisplay(value) {
        const displayValue = Math.round(value);

        // 숫자 입력 필드 업데이트
        if (weeklyAchievementValueInput && weeklyAchievementValueInput !== document.activeElement) {
            weeklyAchievementValueInput.value = displayValue;
        }

        // 미리보기 업데이트
        const autoAchievement = document.querySelector('.auto-achievement');
        if (autoAchievement) {
            autoAchievement.textContent = displayValue;
        }

        // 슬라이더 진행 바 색상 업데이트 (주간 달성률은 0에서 시작)
        if (weeklyAchievementRateInput) {
            weeklyAchievementRateInput.style.setProperty('--slider-min', '0%');
            weeklyAchievementRateInput.style.setProperty('--slider-value', displayValue + '%');
        }
    }

    if (weeklyAchievementRateInput) {
        // 슬라이더 이동 시 숫자 입력 필드 업데이트
        weeklyAchievementRateInput.addEventListener('input', function() {
            const rawValue = parseFloat(this.value) || 0;
            const snappedValue = magneticSnapToFive(rawValue);

            // 자석 효과가 있으면 슬라이더 값도 업데이트
            if (snappedValue !== rawValue) {
                this.value = snappedValue;
            }

            updateAchievementDisplay(snappedValue);
        });

        // 초기 CSS 변수 설정 (기본값 0%)
        const initialValue = parseInt(weeklyAchievementRateInput.value) ?? 0;
        weeklyAchievementRateInput.style.setProperty('--slider-min', '0%');
        weeklyAchievementRateInput.style.setProperty('--slider-value', initialValue + '%');

        // 초기 표시값 업데이트
        if (weeklyAchievementValueInput) {
            weeklyAchievementValueInput.value = initialValue;
        }
        const autoAchievement = document.querySelector('.auto-achievement');
        if (autoAchievement) {
            autoAchievement.textContent = initialValue;
        }
    }

    if (weeklyAchievementValueInput) {
        // 숫자 입력 필드 수정 시 슬라이더 업데이트
        weeklyAchievementValueInput.addEventListener('input', function() {
            let value = parseInt(this.value);

            // 숫자가 아니거나 빈 값이면 입력 허용 (지우는 중)
            if (isNaN(value) || this.value === '') {
                return;
            }

            // 100 초과 입력 즉시 차단
            if (value > 100) {
                this.value = 100;
                value = 100;
            }

            // 유효한 범위 (0~100)일 때만 슬라이더 업데이트
            if (value >= 0 && value <= 100) {
                // 슬라이더 위치 업데이트
                if (weeklyAchievementRateInput) {
                    weeklyAchievementRateInput.value = value;
                    // CSS 변수 업데이트
                    weeklyAchievementRateInput.style.setProperty('--slider-min', '0%');
                    weeklyAchievementRateInput.style.setProperty('--slider-value', value + '%');
                }

                // 미리보기 업데이트
                const autoAchievement = document.querySelector('.auto-achievement');
                if (autoAchievement) {
                    autoAchievement.textContent = value;
                }
            }
        });

        // 범위 벗어난 값 방지 (포커스 해제 시)
        weeklyAchievementValueInput.addEventListener('blur', function() {
            let value = parseInt(this.value) || 0;
            if (value < 0) value = 0;
            if (value > 100) value = 100;
            this.value = value;

            if (weeklyAchievementRateInput) {
                weeklyAchievementRateInput.value = value;
            }

            updateAchievementDisplay(value);
        });
    }

    // ============================================
    // 추가 달성률 슬라이더 기능
    // ============================================

    // 추가 달성률의 최소값을 마지막 달성률로 설정하는 함수
    function updateInputProgressMin(minValue) {
        currentProgressRateValue = minValue;

        if (inputProgressRateSlider) {
            // CRITICAL: min은 반드시 0으로 유지 (thumb 위치 = value/100)
            inputProgressRateSlider.min = 0;
            inputProgressRateSlider.max = 100;
            inputProgressRateSlider.value = minValue;

            // CSS 변수: 시작점과 현재값
            inputProgressRateSlider.style.setProperty('--slider-min', minValue + '%');
            inputProgressRateSlider.style.setProperty('--slider-value', minValue + '%');
        }

        if (inputProgressValueInput) {
            inputProgressValueInput.min = minValue;
            inputProgressValueInput.value = minValue;
        }
    }

    if (inputProgressRateSlider) {
        // 슬라이더 이동 시 숫자 입력 필드 업데이트
        inputProgressRateSlider.addEventListener('input', function(e) {
            // 1단계: 즉시 최소값 체크
            let currentValue = parseFloat(this.value);
            if (currentValue < currentProgressRateValue) {
                this.value = currentProgressRateValue;
                currentValue = currentProgressRateValue;
            }

            // 2단계: 자석 스냅 적용
            const snappedValue = magneticSnapToFive(currentValue);
            const finalValue = Math.max(snappedValue, currentProgressRateValue);

            // 3단계: 스냅된 값으로 슬라이더 값 업데이트
            if (finalValue !== currentValue) {
                this.value = finalValue;
            }

            const displayValue = Math.round(finalValue);

            // 숫자 입력 필드 업데이트
            if (inputProgressValueInput && inputProgressValueInput !== document.activeElement) {
                inputProgressValueInput.value = displayValue;
            }

                // CSS 변수 업데이트: 시작점과 현재값
            this.style.setProperty('--slider-min', currentProgressRateValue + '%');
            this.style.setProperty('--slider-value', displayValue + '%');
        }, false);

        // 초기 CSS 변수 설정
        inputProgressRateSlider.style.setProperty('--slider-min', '0%');
        inputProgressRateSlider.style.setProperty('--slider-value', '0%');
    }

    if (inputProgressValueInput) {
        // 숫자 입력 필드 수정 시 슬라이더 업데이트
        inputProgressValueInput.addEventListener('input', function() {
            let value = parseInt(this.value);

            // 숫자가 아니거나 빈 값이면 입력 허용 (지우는 중)
            if (isNaN(value) || this.value === '') {
                return;
            }

            // 100 초과 입력 즉시 차단
            if (value > 100) {
                this.value = 100;
                value = 100;
            }

            // 유효한 범위 (마지막 달성률~100)일 때만 슬라이더 업데이트
            if (value >= currentProgressRateValue && value <= 100) {
                // 슬라이더 위치 업데이트
                if (inputProgressRateSlider) {
                    inputProgressRateSlider.value = value;
                    // CSS 변수 업데이트
                    inputProgressRateSlider.style.setProperty('--slider-min', currentProgressRateValue + '%');
                    inputProgressRateSlider.style.setProperty('--slider-value', value + '%');
                }
            }
        });

        // 범위 벗어난 값 방지 (포커스 해제 시)
        inputProgressValueInput.addEventListener('blur', function() {
            let value = parseInt(this.value) || currentProgressRateValue;
            if (value < currentProgressRateValue) value = currentProgressRateValue;
            if (value > 100) value = 100;
            this.value = value;

            if (inputProgressRateSlider) {
                inputProgressRateSlider.value = value;
                // CSS 변수 업데이트
                inputProgressRateSlider.style.setProperty('--slider-min', currentProgressRateValue + '%');
                inputProgressRateSlider.style.setProperty('--slider-value', value + '%');
            }
        });
    }

    // ============================================
    // 업무 내용 입력 시 미리보기 자동 업데이트
    // ============================================
    if (achievements) {
        achievements.addEventListener('input', function() {
            const autoAchievements = document.querySelector('.auto-achievements');
            if (autoAchievements) autoAchievements.textContent = this.value || '-';
        });
    }

    if (issues) {
        issues.addEventListener('input', function() {
            const autoIssues = document.querySelector('.auto-issues');
            if (autoIssues) autoIssues.textContent = this.value || '-';
        });
    }

    if (nextWeekPlan) {
        nextWeekPlan.addEventListener('input', function() {
            const autoNextPlan = document.querySelector('.auto-next-plan');
            if (autoNextPlan) autoNextPlan.textContent = this.value || '-';
        });
    }

    if (remarks) {
        remarks.addEventListener('input', function() {
            const autoRemarks = document.querySelector('.auto-remarks');
            if (autoRemarks) autoRemarks.textContent = this.value || '-';
        });
    }

    // ============================================
    // 참고인 선택 모달
    // ============================================
    const approverSelectionModal = document.getElementById('approverSelectionModal');
    const closeApproverModalBtn = document.getElementById('closeApproverModal');
    const cancelApproverSelection = document.getElementById('cancelApproverSelection');
    const confirmApproverSelection = document.getElementById('confirmApproverSelection');
    const approverSearch = document.getElementById('approverSearch');
    const approverOrgTree = document.getElementById('approverOrgTree');
    const selectedApproversPanel = document.getElementById('selectedApproversPanel');
    const selectedApproverCount = document.getElementById('selectedApproverCount');
    const clearSelectedApproversBtn = document.getElementById('clearSelectedApproversBtn');

    // 모달 닫기
    function closeApproverModalFunc() {
        if (approverSelectionModal) {
            approverSelectionModal.classList.remove('show');
        }
    }

    if (closeApproverModalBtn) {
        closeApproverModalBtn.addEventListener('click', closeApproverModalFunc);
    }

    if (cancelApproverSelection) {
        cancelApproverSelection.addEventListener('click', closeApproverModalFunc);
    }

    // 선택 완료
    if (confirmApproverSelection) {
        confirmApproverSelection.addEventListener('click', function() {
            // 참고인 선택 완료
            selectedReferences = [...tempSelectedReferences];
            renderReferenceTags();
            updateReferenceList();
            closeApproverModalFunc();
        });
    }

    // 프로젝트 멤버 목록 렌더링 (참고인 선택용)
    function renderApproverTree(list, keyword = '') {
        if (!approverOrgTree) return;

        approverOrgTree.innerHTML = '';

        if (list.length === 0) {
            approverOrgTree.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">프로젝트 참여인원이 없습니다.</div>';
            return;
        }

        // 결재자(본인, 연구책임자) 제외
        const filteredList = list.filter(emp => {
            const isCurrentUser = emp.idx === currentUserIdx;
            const isProjectManager = selectedProject && emp.idx === selectedProject.projectManagerIdx;
            return !isCurrentUser && !isProjectManager;
        });

        if (filteredList.length === 0) {
            approverOrgTree.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">선택 가능한 참고인이 없습니다.</div>';
            return;
        }

        filteredList.forEach(emp => {
            const item = document.createElement('div');
            item.className = 'selected-employee-item';

            const initials = emp.empName.substring(0, 1);

            // 선택 여부 확인
            const isSelected = tempSelectedReferences.some(a => a.idx === emp.idx);

            // 검색 하이라이트 적용
            const highlightedName = keyword ? highlightText(emp.empName, keyword) : emp.empName;
            const highlightedDept = keyword ? highlightText(emp.empDeptName || '-', keyword) : (emp.empDeptName || '-');
            const highlightedPosition = keyword ? highlightText(emp.empPositionName || '-', keyword) : (emp.empPositionName || '-');

            item.style.cursor = 'pointer';

            item.innerHTML = `
                <div class="selected-employee-info">
                    <div class="selected-employee-avatar">${initials}</div>
                    <div class="selected-employee-details">
                        <div class="selected-employee-name">${highlightedName}</div>
                        <div class="selected-employee-detail">${highlightedDept} | ${highlightedPosition}</div>
                    </div>
                </div>
                <i class="fas fa-${isSelected ? 'check-circle' : 'circle'}" style="color: ${isSelected ? '#667eea' : '#ddd'}; font-size: 20px;"></i>
            `;

            item.addEventListener('click', function() {
                toggleReferenceSelection(emp);
            });

            approverOrgTree.appendChild(item);
        });
    }

    // 프로젝트 멤버 목록 로드
    async function loadProjectMembers(projectIdx) {
        try {
            const response = await fetch(`/api/projects/${projectIdx}/members`);
            if (response.ok) {
                const members = await response.json();
                // ProjectMemberDTO를 UserSimpleDTO 형식으로 변환하여 projectMembers에 저장
                projectMembers = members.map(member => ({
                    idx: member.employeeIdx,
                    empName: member.employeeName,
                    empDeptName: member.employeeDeptName,
                    empPositionName: member.employeePositionName,
                    empPositionSortOrder: member.employeePositionSortOrder
                }));
                return projectMembers;
            } else {
                console.error('프로젝트 멤버 로드 실패');
                throw new Error('프로젝트 참여인원을 불러올 수 없습니다.');
            }
        } catch (error) {
            console.error('프로젝트 멤버 로드 오류:', error);
            throw error;
        }
    }

    // 미리보기 영역 업데이트 함수
    function updatePreview() {
        // 프로젝트명
        const autoProject = document.querySelector('.auto-project');
        if (autoProject && selectedProject) {
            autoProject.textContent = selectedProject.projectName || '-';
        }

        // 주간 달성률
        const autoAchievement = document.querySelector('.auto-achievement');
        if (autoAchievement && weeklyAchievementRateInput) {
            autoAchievement.textContent = weeklyAchievementRateInput.value || '0';
        }

        // 보고 기간
        const autoPeriod = document.querySelector('.auto-period');
        if (autoPeriod && reportPeriodDisplay) {
            autoPeriod.textContent = reportPeriodDisplay.textContent || '-';
        }

        // 금주 주요 업무
        updateTaskPreview();

        // 주요 성과
        const autoAchievements = document.querySelector('.auto-achievements');
        if (autoAchievements && achievements) {
            autoAchievements.textContent = achievements.value || '-';
        }

        // 주요 이슈
        const autoIssues = document.querySelector('.auto-issues');
        if (autoIssues && issues) {
            autoIssues.textContent = issues.value || '-';
        }

        // 차주 계획
        const autoNextPlan = document.querySelector('.auto-next-plan');
        if (autoNextPlan && nextWeekPlan) {
            autoNextPlan.textContent = nextWeekPlan.value || '-';
        }

        // 기타
        const autoRemarks = document.querySelector('.auto-remarks');
        if (autoRemarks && remarks) {
            autoRemarks.textContent = remarks.value || '-';
        }

        // 참조자 (updateReferenceList 함수 사용)
        updateReferenceList();
    }

    // 참고인 선택/해제 토글
    function toggleReferenceSelection(emp) {
        const index = tempSelectedReferences.findIndex(a => a.idx === emp.idx);

        if (index > -1) {
            tempSelectedReferences.splice(index, 1);
        } else {
            tempSelectedReferences.push({
                idx: emp.idx,
                name: emp.empName,
                dept: emp.empDeptName || '',
                position: emp.empPositionName || ''
            });
        }

        renderApproverTree(projectMembers);
        renderTempReferences();
    }


    // 참고인 전체 해제
    if (clearSelectedApproversBtn) {
        clearSelectedApproversBtn.addEventListener('click', function() {
            tempSelectedReferences = [];
            renderApproverTree(projectMembers);
            renderTempReferences();
        });
    }

    // 참고인 검색 기능
    if (approverSearch) {
        approverSearch.addEventListener('input', function() {
            const keyword = this.value.trim();

            if (!keyword) {
                renderApproverTree(projectMembers, '');
                return;
            }

            // 초성 검색 포함
            const filtered = projectMembers.filter(emp =>
                matchesSearch(emp.empName, keyword) ||
                matchesSearch(emp.empDeptName, keyword) ||
                matchesSearch(emp.empPositionName, keyword)
            );

            renderApproverTree(filtered, keyword);
        });
    }


    // ============================================
    // 참고인 선택
    // ============================================
    const openReferenceModalBtn = document.getElementById('openReferenceModalBtn');
    const selectedReferencesList = document.getElementById('selectedReferencesList');

    let tempSelectedReferences = []; // 모달 내 임시 선택 목록

    // 참고인 선택 모달 열기
    if (openReferenceModalBtn) {
        openReferenceModalBtn.addEventListener('click', async function() {
            // 프로젝트가 선택되지 않은 경우
            if (!selectedProject || !selectedProject.idx) {
                showWarning('프로젝트를 먼저 선택해주세요.');
                return;
            }

            tempSelectedReferences = [...selectedReferences]; // 기존 선택 복사
            if (approverSelectionModal) {
                approverSelectionModal.classList.add('show');
                // 모달 제목 설정
                const modalTitle = document.getElementById('approverModalTitle');
                if (modalTitle) modalTitle.textContent = '참고인 선택';

                // 프로젝트 멤버 목록 로드
                try {
                    await loadProjectMembers(selectedProject.idx);
                    renderApproverTree(projectMembers);
                    renderTempReferences();
                } catch (error) {
                    showError('프로젝트 참여인원을 불러오는 중 오류가 발생했습니다.');
                }
            }
        });
    }

    // 임시 참고인 목록 렌더링
    function renderTempReferences() {
        if (!selectedApproversPanel) return;

        selectedApproverCount.textContent = tempSelectedReferences.length;

        if (tempSelectedReferences.length === 0) {
            selectedApproversPanel.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">선택된 참고인이 없습니다.</div>';
            return;
        }

        selectedApproversPanel.innerHTML = '';
        tempSelectedReferences.forEach((reference, index) => {
            const item = document.createElement('div');
            item.className = 'selected-employee-item';

            const initials = reference.name.substring(0, 1);

            item.innerHTML = `
                <div class="selected-employee-info">
                    <div class="selected-employee-avatar">${initials}</div>
                    <div class="selected-employee-details">
                        <div class="selected-employee-name">${reference.name}</div>
                        <div class="selected-employee-detail">${reference.dept} | ${reference.position}</div>
                    </div>
                </div>
                <button class="btn-remove-employee" onclick="removeTempReference(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;

            selectedApproversPanel.appendChild(item);
        });
    }

    // 임시 참고인 제거
    window.removeTempReference = function(index) {
        tempSelectedReferences.splice(index, 1);
        renderApproverTree(employees);
        renderTempReferences();
    };

    // 참고인 태그 렌더링 (메인 화면)
    function renderReferenceTags() {
        if (!selectedReferencesList) return;

        selectedReferencesList.innerHTML = '';
        selectedReferences.forEach((reference, index) => {
            const tag = document.createElement('div');
            tag.className = 'reference-tag';

            tag.innerHTML = `
                <span class="order">${index + 1}</span>
                <span>${reference.name}</span>
                <button class="reference-remove" onclick="removeReference(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            selectedReferencesList.appendChild(tag);
        });

        // 미리보기 영역도 업데이트
        updateReferenceList();
    }

    // 참고인 삭제
    window.removeReference = function(index) {
        selectedReferences.splice(index, 1);
        renderReferenceTags();
    };

    // 참조 목록 업데이트 (공식문서)
    function updateReferenceList() {
        const autoReferences = document.querySelector('.auto-references');
        if (autoReferences) {
            if (selectedReferences.length === 0) {
                autoReferences.textContent = '-';
            } else {
                autoReferences.textContent = selectedReferences.map(r => r.name).join(', ');
            }
        }
    }

    // ============================================
    // 문서 미리보기 토글
    // ============================================
    const documentFormToggle = document.getElementById('documentFormToggle');
    const documentFormWrapper = document.querySelector('.document-form-wrapper');

    if (documentFormToggle && documentFormWrapper) {
        documentFormToggle.addEventListener('click', function() {
            documentFormWrapper.classList.toggle('collapsed');
            this.classList.toggle('active');
        });
    }

    // ============================================
    // 금주 주요업무 다중 항목 관리
    // ============================================
    function addTaskItem(value = '') {
        const list = document.getElementById('mainTasksList');
        if (!list) return;

        const item = document.createElement('div');
        item.className = 'main-task-item';
        item.innerHTML = `
            <span class="task-number">1</span>
            <textarea class="form-textarea main-task-input" rows="2" placeholder="업무 내용 입력"></textarea>
            <button type="button" class="btn-remove-task" title="항목 삭제">
                <i class="fas fa-minus"></i>
            </button>
        `;
        item.querySelector('.main-task-input').value = value;
        item.querySelector('.main-task-input').addEventListener('input', updateTaskPreview);
        item.querySelector('.btn-remove-task').addEventListener('click', function() {
            removeTaskItem(item);
        });
        list.appendChild(item);
        updateTaskNumbers();
        updateTaskPreview();
    }

    function removeTaskItem(item) {
        const list = document.getElementById('mainTasksList');
        if (!list || list.children.length <= 1) {
            // 마지막 항목은 삭제 대신 초기화
            const input = item.querySelector('.main-task-input');
            if (input) { input.value = ''; updateTaskPreview(); }
            return;
        }
        item.remove();
        updateTaskNumbers();
        updateTaskPreview();
    }

    function updateTaskNumbers() {
        const items = document.querySelectorAll('.main-task-item');
        items.forEach((item, i) => {
            const num = item.querySelector('.task-number');
            if (num) num.textContent = i + 1;
        });
    }

    function getMainTasksArray() {
        return Array.from(document.querySelectorAll('.main-task-input'))
            .map(inp => inp.value.trim())
            .filter(v => v !== '');
    }

    function getMainTasksValue() {
        const arr = getMainTasksArray();
        if (arr.length === 0) return '';
        return arr.length === 1 ? arr[0] : JSON.stringify(arr);
    }

    function setMainTasksFromValue(value) {
        const list = document.getElementById('mainTasksList');
        if (!list) return;
        list.innerHTML = '';
        if (!value) { addTaskItem(''); return; }
        try {
            const arr = JSON.parse(value);
            if (Array.isArray(arr) && arr.length > 0) {
                arr.forEach(v => addTaskItem(v));
                return;
            }
        } catch (e) {}
        addTaskItem(value);
    }

    function updateTaskPreview() {
        const arr = getMainTasksArray();
        const autoTasks = document.querySelector('.auto-tasks');
        if (!autoTasks) return;
        if (arr.length === 0) { autoTasks.textContent = '-'; return; }
        autoTasks.textContent = arr.length === 1 ? arr[0] : arr.map((t, i) => `${i + 1}. ${t}`).join('\n');
    }

    // 항목 추가 버튼
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => addTaskItem(''));
    }

    // 초기 항목 1개 생성
    addTaskItem('');

    // ============================================
    // 파일 업로드
    // ============================================
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                if (selectedFiles.length >= 5) {
                    showWarning('최대 5개까지만 첨부 가능합니다.');
                    return;
                }
                if (file.size > 50 * 1024 * 1024) {
                    showWarning('파일 크기는 50MB를 초과할 수 없습니다.');
                    return;
                }
                selectedFiles.push(file);
            });
            updateFileList();
            fileInput.value = '';
        });
    }

    if (fileUploadArea) {
        fileUploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderColor = '#667eea';
            this.style.background = '#f0f4ff';
        });

        fileUploadArea.addEventListener('dragleave', function() {
            this.style.borderColor = '#cbd5e1';
            this.style.background = '#f8fafc';
        });

        fileUploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.borderColor = '#cbd5e1';
            this.style.background = '#f8fafc';

            const files = Array.from(e.dataTransfer.files);
            files.forEach(file => {
                if (selectedFiles.length >= 5) {
                    showWarning('최대 5개까지만 첨부 가능합니다.');
                    return;
                }
                if (file.size > 50 * 1024 * 1024) {
                    showWarning('파일 크기는 50MB를 초과할 수 없습니다.');
                    return;
                }
                selectedFiles.push(file);
            });
            updateFileList();
        });
    }

    function updateFileList() {
        if (!fileList) return;

        fileList.innerHTML = '';

        // 기존 파일 표시 (서버에서 로드한 파일, 삭제 예정인 파일 제외)
        existingFiles.forEach(file => {
            // 삭제 예정 목록에 있는 파일은 표시하지 않음
            if (deletedFileIds.includes(file.idx)) {
                return;
            }

            const item = document.createElement('div');
            item.className = 'file-item';

            let icon = 'fa-file';
            const filename = file.originalFilename.toLowerCase();
            if (filename.match(/\.(jpg|jpeg|png|gif)$/i)) icon = 'fa-file-image';
            else if (filename.match(/\.(pdf)$/i)) icon = 'fa-file-pdf';
            else if (filename.match(/\.(doc|docx)$/i)) icon = 'fa-file-word';
            else if (filename.match(/\.(xls|xlsx)$/i)) icon = 'fa-file-excel';

            const fileSizeKB = (file.fileSize / 1024).toFixed(1);

            item.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${file.originalFilename} (${fileSizeKB} KB)</span>
                <a href="/api/files/download/${file.idx}" class="btn-download-file" download>
                    <i class="fas fa-download"></i>
                </a>
                <button class="btn-remove-file" onclick="removeExistingFile(${file.idx})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(item);
        });

        // 새로 선택한 파일 표시
        selectedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';

            let icon = 'fa-file';
            if (file.name.match(/\.(jpg|jpeg|png|gif)$/i)) icon = 'fa-file-image';
            else if (file.name.match(/\.(pdf)$/i)) icon = 'fa-file-pdf';
            else if (file.name.match(/\.(doc|docx)$/i)) icon = 'fa-file-word';
            else if (file.name.match(/\.(xls|xlsx)$/i)) icon = 'fa-file-excel';

            item.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB) <span style="color: #667eea; font-size: 11px;">[신규]</span></span>
                <button class="btn-remove-file" onclick="removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(item);
        });

        // 파일이 하나도 없을 때 메시지 표시
        const visibleExistingFiles = existingFiles.filter(f => !deletedFileIds.includes(f.idx));
        if (visibleExistingFiles.length === 0 && selectedFiles.length === 0) {
            fileList.innerHTML = '<p style="color: #999; font-size: 12px; padding: 10px 0;">첨부된 파일이 없습니다.</p>';
        }
    }

    window.removeFile = function(index) {
        selectedFiles.splice(index, 1);
        updateFileList();
    };

    // ============================================
    // 파일 업로드 (서버로 전송)
    // ============================================
    async function uploadFilesToServer(documentIdx) {
        if (!selectedFiles || selectedFiles.length === 0) {
            console.log('업로드할 파일이 없습니다.');
            return true; // 파일이 없어도 성공으로 처리
        }

        try {
            for (const file of selectedFiles) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('documentIdx', documentIdx);
                formData.append('uploadUserIdx', currentUserIdx);

                const response = await fetch('/api/files/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const error = await response.text();
                    console.error(`파일 업로드 실패 (${file.name}):`, error);
                    throw new Error(`파일 업로드 실패: ${file.name}`);
                }

                console.log(`파일 업로드 성공: ${file.name}`);
            }

            return true;
        } catch (error) {
            console.error('파일 업로드 오류:', error);
            showError('파일 업로드 중 오류가 발생했습니다: ' + error.message);
            return false;
        }
    }

    // ============================================
    // 기존 파일 로드 (수정 모드)
    // ============================================
    async function loadExistingFiles(documentIdx) {
        if (!documentIdx) {
            console.log('documentIdx가 없어 파일을 로드하지 않습니다.');
            existingFiles = [];
            updateFileList();
            return;
        }

        try {
            const response = await fetch(`/api/files/document/${documentIdx}`);

            if (!response.ok) {
                console.error('파일 목록 조회 실패');
                existingFiles = [];
                updateFileList();
                return;
            }

            const files = await response.json();

            if (!files || files.length === 0) {
                console.log('첨부된 파일이 없습니다.');
                existingFiles = [];
            } else {
                existingFiles = files;
                console.log(`${files.length}개의 파일을 로드했습니다.`);
            }

            updateFileList();
        } catch (error) {
            console.error('파일 로드 오류:', error);
            existingFiles = [];
            updateFileList();
        }
    }

    // ============================================
    // 기존 파일 삭제 (저장 시에만 실제 삭제)
    // ============================================
    window.removeExistingFile = async function(fileIdx) {
        const confirmed = await showDeleteConfirm('이 파일을 삭제하시겠습니까?');
        if (!confirmed) {
            return;
        }

        // 삭제 예정 목록에 추가
        if (!deletedFileIds.includes(fileIdx)) {
            deletedFileIds.push(fileIdx);
        }

        // 화면 업데이트
        updateFileList();
    };

    // ============================================
    // 수정 모드: 기존 보고서 데이터 로드 함수
    // ============================================
    async function loadReportForEdit(reportId) {
        try {
            // 삭제 예정 목록 초기화
            deletedFileIds = [];

            const response = await fetch(`/api/document/weekly-report/${reportId}`);

            if (!response.ok) {
                showError('보고서를 불러올 수 없습니다.');
                popupAwareRedirect('/project/documents');
                return;
            }

            const data = await response.json();

            // 프로젝트 선택
            if (data.projectIdx) {
                // 프로젝트 목록 로드 후 선택
                await loadProjects();

                const project = projects.find(p => p.idx === data.projectIdx);

                if (project) {
                    selectedProject = project;
                    selectedProjectIdx.value = project.idx;
                    if (projectInput) {
                        projectInput.value = project.projectName;
                        // 프로젝트 선택 시 필수 표시 제거
                        projectInput.classList.remove('required-missing');
                    }

                    // 프로젝트 전체 달성률 표시
                    const currentProgressRate = document.getElementById('currentProgressRate');
                    if (currentProgressRate) {
                        const progressRate = project.progressRate ?? 0;
                        currentProgressRate.textContent = progressRate + '%';
                        updateInputProgressMin(progressRate);
                    }

                    // 프로젝트 선택 후 참여인원 로드
                    await loadProjectMembers(project.idx);

                    // 결재자 자동 설정
                    await autoSetApprovers(project);
                }
            }

            // 보고 기간 설정 및 달력 반영
            if (data.reportPeriod && reportPeriodDisplay) {
                reportPeriodDisplay.textContent = data.reportPeriod;

                // 보고 기간 파싱 (예: "2026.01.12 ~ 2026.01.16")
                const periodParts = data.reportPeriod.split('~').map(p => p.trim());
                if (periodParts.length === 2) {
                    const startParts = periodParts[0].split('.');
                    const endParts = periodParts[1].split('.');

                    if (startParts.length === 3 && endParts.length === 3) {
                        const startYear = parseInt(startParts[0]);
                        const startMonth = parseInt(startParts[1]) - 1;
                        const startDay = parseInt(startParts[2]);

                        const endYear = parseInt(endParts[0]);
                        const endMonth = parseInt(endParts[1]) - 1;
                        const endDay = parseInt(endParts[2]);

                        const startDate = new Date(startYear, startMonth, startDay);
                        const endDate = new Date(endYear, endMonth, endDay);

                        // 주의 평일 날짜들 계산
                        selectedWeekDates = getWeekdaysInWeek(startDate);

                        // hidden input에 값 설정
                        if (reportStartDate) reportStartDate.value = formatDate(startDate);
                        if (reportEndDate) reportEndDate.value = formatDate(endDate);

                        // 달력 월/년도를 해당 날짜로 이동
                        currentYear = startYear;
                        currentMonth = startMonth;

                        // 달력 다시 렌더링
                        renderCalendar();
                    }
                }
            }

            // 주간 달성률
            if (data.weeklyAchievementRate !== null && weeklyAchievementRateInput) {
                weeklyAchievementRateInput.value = data.weeklyAchievementRate;
                updateAchievementDisplay(data.weeklyAchievementRate);
            }

            // 입력 필드 채우기
            setMainTasksFromValue(data.mainTasks || '');
            if (achievements) achievements.value = data.achievements || '';
            if (issues) issues.value = data.issues || '';
            if (nextWeekPlan) nextWeekPlan.value = data.nextWeekPlan || '';
            if (remarks) remarks.value = data.remarks || '';

            // 참조자 복원
            if (data.referenceNames) {
                const referenceNameList = data.referenceNames.split(',').map(name => name.trim());

                // 프로젝트 멤버에서 이름으로 찾아서 참조자 목록에 추가
                selectedReferences = projectMembers.filter(member =>
                    referenceNameList.includes(member.empName)
                ).map(member => ({
                    idx: member.idx,
                    name: member.empName,
                    dept: member.empDeptName || '',
                    position: member.empPositionName || ''
                }));

                renderReferenceTags();
            }

            // 미리보기 영역 업데이트
            updatePreview();

            // 첨부 파일 로드
            if (data.documentIdx) {
                currentDocumentIdx = data.documentIdx; // 전역 변수에 저장
                await loadExistingFiles(data.documentIdx);
            }

        } catch (error) {
            console.error('보고서 로드 오류:', error);
            showError('보고서를 불러오는 중 오류가 발생했습니다: ' + error.message);
            popupAwareRedirect('/project/documents');
        }
    }


    // ============================================
    // 폼 제출
    // ============================================
    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            const reportPeriod = reportPeriodDisplay?.textContent || '';
            const mainTasks = getMainTasksValue();
            const achievementsVal = achievements?.value || '';
            const issuesVal = issues?.value || '';
            const nextWeekPlanVal = nextWeekPlan?.value || '';
            const remarksVal = remarks?.value || '';
            const achievementRate = weeklyAchievementRateInput?.value ? parseInt(weeklyAchievementRateInput.value) : null;

            // 필수 항목 유효성 검사
            // 프로젝트 선택 확인
            if (!selectedProject || !selectedProjectIdx.value) {
                showError('프로젝트를 선택해주세요.');
                // 프로젝트 입력 필드 강조
                if (projectInput) {
                    projectInput.classList.add('required-missing');
                    projectInput.focus();
                }
                return;
            }

            if (!reportPeriod.trim()) {
                showError('보고 기간을 선택해주세요.');
                return;
            }

            if (!mainTasks.trim()) {
                showError('필수 입력 항목\n\n금주 주요 업무를 입력해주세요.');
                const firstInput = document.querySelector('.main-task-input');
                if (firstInput) {
                    firstInput.focus();
                    firstInput.style.border = '2px solid #ef5350';
                    setTimeout(() => { firstInput.style.border = ''; }, 2000);
                }
                return;
            }

            // 주간 달성률 확인 (0이면 확인 요청)
            if (achievementRate === null || achievementRate === 0) {
                // 주간 달성률 영역으로 스크롤 및 포커스
                if (weeklyAchievementRateInput) {
                    weeklyAchievementRateInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // 숫자 입력 필드 강조
                    if (weeklyAchievementValueInput) {
                        weeklyAchievementValueInput.focus();
                        weeklyAchievementValueInput.style.border = '2px solid #ff9800';
                        weeklyAchievementValueInput.style.boxShadow = '0 0 0 3px rgba(255, 152, 0, 0.2)';
                        setTimeout(() => {
                            weeklyAchievementValueInput.style.border = '';
                            weeklyAchievementValueInput.style.boxShadow = '';
                        }, 2000);
                    }
                }

                const confirmed = await showConfirm(
                    '주간 달성률이 0%입니다.\n\n이대로 저장하시겠습니까?',
                    '확인',
                    { icon: 'warning', confirmColor: '#ff9800' }
                );
                if (!confirmed) {
                    return;
                }
            }

            // 프로젝트 전체 달성률 변화 확인
            const inputProgressRateValue = inputProgressRateSlider && inputProgressRateSlider.value ?
                parseInt(inputProgressRateSlider.value) : null;

            if (inputProgressRateValue !== null && inputProgressRateValue === currentProgressRateValue) {
                // 프로젝트 전체 달성률 영역으로 스크롤 및 포커스
                if (inputProgressRateSlider) {
                    inputProgressRateSlider.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // 숫자 입력 필드 강조
                    if (inputProgressValueInput) {
                        inputProgressValueInput.focus();
                        inputProgressValueInput.style.border = '2px solid #ff9800';
                        inputProgressValueInput.style.boxShadow = '0 0 0 3px rgba(255, 152, 0, 0.2)';
                        setTimeout(() => {
                            inputProgressValueInput.style.border = '';
                            inputProgressValueInput.style.boxShadow = '';
                        }, 2000);
                    }
                }

                const confirmed = await showConfirm(
                    '프로젝트 전체 달성률에 변화가 없습니다.\n\n이대로 저장하시겠습니까?',
                    '확인',
                    { icon: 'warning', confirmColor: '#ff9800' }
                );
                if (!confirmed) {
                    return;
                }
            }

            // 수정 모드 확인
            const urlParams = new URLSearchParams(window.location.search);
            const editingReportId = urlParams.get('id');
            const isEditMode = !!editingReportId;

            const saveConfirmed = await showSaveConfirm(
                isEditMode ? '프로젝트 주간업무보고를 수정하시겠습니까?' : '프로젝트 주간업무보고를 저장하시겠습니까?'
            );
            if (!saveConfirmed) {
                return;
            }

            // 로딩 스피너 표시
            Swal.fire({
                title: '저장 중...',
                html: '보고서를 저장하고 있습니다.<br>잠시만 기다려주세요.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                const projectIdx = selectedProjectIdx.value ? parseInt(selectedProjectIdx.value) : null;
                const projectName = selectedProject ? selectedProject.projectName : null;

                // 참조자 이름 목록을 쉼표로 구분된 문자열로 변환
                const referenceNamesStr = selectedReferences.map(r => r.name).join(', ');

                const requestData = {
                    userIdx: currentUserIdx,
                    projectIdx: projectIdx,
                    projectName: projectName,
                    reportPeriod: reportPeriod,
                    mainTasks: mainTasks,
                    achievements: achievementsVal,
                    issues: issuesVal,
                    nextWeekPlan: nextWeekPlanVal,
                    remarks: remarksVal,
                    referenceNames: referenceNamesStr,
                    weeklyAchievementRate: achievementRate,
                    inputProgressRate: inputProgressRateValue
                };

                console.log('전송 데이터:', requestData);

                let response;
                if (isEditMode) {
                    // 수정 모드: PUT 요청
                    response = await fetch(`/api/document/weekly-report/${editingReportId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestData)
                    });
                } else {
                    // 생성 모드: POST 요청
                    response = await fetch('/api/document/weekly-report', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestData)
                    });
                }

                if (response.ok) {
                    const responseData = await response.json();
                    console.log('보고서 저장 성공:', responseData);

                    // 파일 업로드 (documentIdx가 있는 경우만)
                    if (responseData.documentIdx && selectedFiles.length > 0) {
                        console.log(`파일 업로드 시작 (documentIdx: ${responseData.documentIdx})`);
                        const uploadSuccess = await uploadFilesToServer(responseData.documentIdx);

                        if (!uploadSuccess) {
                            await showWarning('보고서는 저장되었으나 파일 업로드에 실패했습니다.');
                            popupAwareRedirect('/project/documents');
                            return;
                        }
                    }

                    // 로딩 스피너 닫기
                    Swal.close();

                    // 삭제 예정인 파일들을 실제로 삭제
                    if (deletedFileIds.length > 0) {
                        console.log(`${deletedFileIds.length}개의 파일 삭제 시작`);
                        for (const fileIdx of deletedFileIds) {
                            try {
                                const deleteResponse = await fetch(`/api/files/${fileIdx}?deletedUserIdx=${currentUserIdx}`, {
                                    method: 'DELETE'
                                });
                                if (!deleteResponse.ok) {
                                    console.error(`파일 삭제 실패 (fileIdx: ${fileIdx})`);
                                }
                            } catch (error) {
                                console.error(`파일 삭제 오류 (fileIdx: ${fileIdx}):`, error);
                            }
                        }
                        console.log('파일 삭제 완료');
                    }

                    const successMessage = isEditMode ?
                        '프로젝트 주간업무보고가 수정되었습니다.' :
                        '프로젝트 주간업무보고가 저장되었습니다.';
                    await showSuccess(successMessage);
                    popupAwareRedirect('/project/documents');
                } else {
                    Swal.close();
                    const error = await response.text();
                    console.error('저장 실패:', error);
                    showError('저장에 실패했습니다.');
                }
            } catch (error) {
                Swal.close();
                console.error('API 호출 오류:', error);
                showError('저장 중 오류가 발생했습니다: ' + error.message);
            }
        });
    }

    // ============================================
    // 이전주 차주계획 불러오기
    // ============================================
    let prevWeekPlanData = null; // 이전주 보고서 데이터 캐시

    // 이전주 월요일 날짜 문자열 계산 (YYYY.MM.DD 형식)
    function getPrevWeekMondayDisplay(currentWeekMondayStr) {
        const parts = currentWeekMondayStr.split('-');
        const monday = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        monday.setDate(monday.getDate() - 7);
        const y = monday.getFullYear();
        const m = String(monday.getMonth() + 1).padStart(2, '0');
        const d = String(monday.getDate()).padStart(2, '0');
        return `${y}.${m}.${d}`;
    }

    // 이전주 차주계획 체크 (프로젝트 + 주간 모두 선택된 경우 호출)
    async function checkPrevWeekPlan() {
        const banner = document.getElementById('prevWeekPlanBanner');
        if (!banner) return;

        if (!selectedWeekDates || selectedWeekDates.length === 0 || !selectedProject) {
            banner.style.display = 'none';
            return;
        }

        const prevWeekMonday = getPrevWeekMondayDisplay(selectedWeekDates[0]);

        try {
            const response = await fetch(`/api/document/weekly-report/project/${selectedProject.idx}/prev-week?weekStart=${encodeURIComponent(prevWeekMonday)}`);

            if (response.status === 204 || !response.ok) {
                prevWeekPlanData = null;
                banner.style.display = 'none';
                return;
            }

            const data = await response.json();

            if (!data.nextWeekPlan || data.nextWeekPlan.trim() === '') {
                prevWeekPlanData = null;
                banner.style.display = 'none';
                return;
            }

            prevWeekPlanData = data;

            // 배너 미리보기 업데이트
            const preview = document.getElementById('prevWeekPlanPreview');
            if (preview) {
                const previewText = data.nextWeekPlan.length > 80
                    ? data.nextWeekPlan.substring(0, 80) + '...'
                    : data.nextWeekPlan;
                preview.textContent = previewText;
            }

            banner.style.display = 'flex';

        } catch (error) {
            console.error('이전주 차주계획 조회 오류:', error);
            banner.style.display = 'none';
        }
    }

    // 이전주 차주계획을 금주 주요업무에 추가
    window.applyPrevWeekPlan = function() {
        if (!prevWeekPlanData || !prevWeekPlanData.nextWeekPlan) return;

        const plan = prevWeekPlanData.nextWeekPlan.trim();
        // 마지막 항목이 비어있으면 채우고, 아니면 새 항목 추가
        const inputs = document.querySelectorAll('.main-task-input');
        const last = inputs[inputs.length - 1];
        if (last && last.value.trim() === '') {
            last.value = plan;
            updateTaskPreview();
        } else {
            addTaskItem(plan);
        }

        const banner = document.getElementById('prevWeekPlanBanner');
        if (banner) banner.style.display = 'none';
    };

    // 배너의 "추가" 버튼
    const prevWeekPlanViewBtn = document.getElementById('prevWeekPlanViewBtn');
    if (prevWeekPlanViewBtn) {
        prevWeekPlanViewBtn.addEventListener('click', applyPrevWeekPlan);
    }

    // ============================================
    // 취소 버튼
    // ============================================
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', async function() {
            // 변경사항이 있는지 확인
            const hasChanges = selectedFiles.length > 0 || deletedFileIds.length > 0;

            if (hasChanges) {
                const confirmed = await showConfirm(
                    '변경사항이 저장되지 않습니다. 취소하시겠습니까?',
                    '확인',
                    { icon: 'warning' }
                );
                if (!confirmed) {
                    return;
                }
            }

            // 프로젝트 문서함으로 이동
            popupAwareRedirect('/project/documents');
        });
    }
});
