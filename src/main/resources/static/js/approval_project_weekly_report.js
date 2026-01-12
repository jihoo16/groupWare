// 주간업무보고 작성 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    const currentUserIdx = window.CURRENT_USER?.idx || null;
    const currentUserName = window.CURRENT_USER?.empName || '';
    const currentUserDept = window.CURRENT_USER?.empDeptName || '';

    let selectedFiles = [];
    let projects = [];
    let projectMembers = []; // 프로젝트 참여인원 목록 (참고인 선택용)
    let selectedReferences = []; // 참고인 목록 {idx, name, dept, position}
    let selectedEmployee = null;
    let selectedProject = null; // 선택된 프로젝트
    let employees = []; // 전체 직원 목록 (결재자 자동 설정용)
    let selectedApprovers = []; // 선택된 결재자 목록

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

    // 입력 필드
    const weeklyTasks = document.getElementById('weeklyTasks');
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
    // 초기화: 코드 상수 로드
    // ============================================
    loadCodeConstants();

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

        // 결재자 자동 설정: 프로젝트 책임자 & 대표이사
        await autoSetApprovers(project);
    }

    // 페이지 로드 시 데이터 로드
    loadEmployees();
    loadProjects();

    // 텍스트 하이라이트 함수
    function highlightText(text, keyword) {
        if (!text || !keyword) return text;

        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();

        // 일반 텍스트 매칭
        if (lowerText.includes(lowerKeyword)) {
            const regex = new RegExp(`(${keyword})`, 'gi');
            return text.replace(regex, '<mark class="search-highlight">$1</mark>');
        }

        // 초성 매칭
        const chosung = getChosung(text);
        if (chosung.includes(keyword)) {
            let result = '';
            let chosungIndex = 0;
            let keywordIndex = 0;

            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const code = text.charCodeAt(i) - 44032;

                if (code > -1 && code < 11172) {
                    const cho = CHO_HANGUL[Math.floor(code / 588)];
                    if (keywordIndex < keyword.length && cho === keyword[keywordIndex]) {
                        result += `<mark class="search-highlight">${char}</mark>`;
                        keywordIndex++;
                    } else {
                        result += char;
                    }
                } else {
                    result += char;
                }
            }
            return result;
        }

        return text;
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

                // 결재자 자동 설정: 프로젝트 책임자 & 대표이사
                await autoSetApprovers(selectedProject);

                closeProjectModal();
            });

            projectList.appendChild(item);
        });
    }

    // ============================================
    // 초성 검색 유틸리티
    // ============================================
    const CHO_HANGUL = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

    function getChosung(str) {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i) - 44032;
            if (code > -1 && code < 11172) {
                result += CHO_HANGUL[Math.floor(code / 588)];
            } else {
                result += str.charAt(i);
            }
        }
        return result;
    }

    function matchesSearch(text, keyword) {
        if (!text || !keyword) return true;

        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();

        // 일반 검색
        if (lowerText.includes(lowerKeyword)) return true;

        // 초성 검색
        const chosung = getChosung(text);
        return chosung.includes(keyword);
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
            selectedProject = null;
            if (projectSearch) projectSearch.value = '';
        }
    };

    window.selectProject = async function() {
        if (!selectedProject) {
            alert('프로젝트를 선택해주세요.');
            return;
        }

        // 프로젝트 입력 필드에 표시
        if (projectInput) {
            projectInput.value = selectedProject.projectName;
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

        // 결재자 자동 설정: 프로젝트 책임자 & 대표이사
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
                        isProjectManager: false,
                        isCEO: false
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
                        isProjectManager: true,  // 연구책임자 플래그
                        isCEO: false
                    });
                }
            } else {
                console.error('2. 연구책임자 오류: project.projectManagerIdx가 없습니다.');
            }

            // 3. 대표이사 추가
            const ceoSortOrder = getCeoSortOrder();
            console.log('3. 대표이사 검색 - ceoSortOrder:', ceoSortOrder);
            const ceo = employees.find(emp => emp.empPositionSortOrder === ceoSortOrder);
            console.log('3. 대표이사 결과:', ceo ? ceo.empName : '없음');
            if (ceo) {
                selectedApprovers.push({
                    idx: ceo.idx,
                    name: ceo.empName,
                    dept: ceo.empDeptName || '',
                    position: ceo.empPositionName || '',
                    isCurrentUser: false,
                    isProjectManager: false,
                    isCEO: true  // 대표이사 플래그
                });
            } else {
                console.error('3. 대표이사 오류: empPositionSortOrder=' + ceoSortOrder + '인 사용자가 없습니다.');
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
    function renderCalendar() {
        if (!calendarDays || !calendarTitle) return;

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
            dayEl.addEventListener('click', () => selectWeek(dateStr));
        }

        return dayEl;
    }

    // 주 선택 (클릭한 날짜가 속한 주의 평일들을 자동 선택)
    function selectWeek(dateStr) {
        const clickedDate = new Date(dateStr);
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

        // 초기 CSS 변수 설정 (기본값 100%)
        const initialValue = parseInt(weeklyAchievementRateInput.value) || 100;
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
    if (weeklyTasks) {
        weeklyTasks.addEventListener('input', function() {
            const autoTasks = document.querySelector('.auto-tasks');
            if (autoTasks) autoTasks.textContent = this.value || '-';
        });
    }

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

    // 대표이사 sortOrder 반환 (대표이사 = 1)
    function getCeoSortOrder() {
        return 1;
    }

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

        // 결재자(본인, 연구책임자, 대표이사) 제외
        const filteredList = list.filter(emp => {
            const isCurrentUser = emp.idx === currentUserIdx;
            const isProjectManager = selectedProject && emp.idx === selectedProject.projectManagerIdx;
            const isCEO = emp.empPositionSortOrder === getCeoSortOrder();
            return !isCurrentUser && !isProjectManager && !isCEO;
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
                alert('프로젝트를 먼저 선택해주세요.');
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
                    const response = await fetch(`/api/projects/${selectedProject.idx}/members`);
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
                        renderApproverTree(projectMembers);
                        renderTempReferences();
                    } else {
                        console.error('프로젝트 멤버 로드 실패');
                        alert('프로젝트 참여인원을 불러올 수 없습니다.');
                    }
                } catch (error) {
                    console.error('프로젝트 멤버 로드 오류:', error);
                    alert('프로젝트 참여인원을 불러오는 중 오류가 발생했습니다.');
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
    }

    // 참고인 삭제
    window.removeReference = function(index) {
        selectedReferences.splice(index, 1);
        renderReferenceTags();
        updateReferenceList();
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
    // 파일 업로드
    // ============================================
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                if (selectedFiles.length >= 5) {
                    alert('최대 5개까지만 첨부 가능합니다.');
                    return;
                }
                if (file.size > 10 * 1024 * 1024) {
                    alert('파일 크기는 10MB를 초과할 수 없습니다.');
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
                    alert('최대 5개까지만 첨부 가능합니다.');
                    return;
                }
                if (file.size > 10 * 1024 * 1024) {
                    alert('파일 크기는 10MB를 초과할 수 없습니다.');
                    return;
                }
                selectedFiles.push(file);
            });
            updateFileList();
        });
    }

    function updateFileList() {
        if (!fileList) return;

        if (selectedFiles.length === 0) {
            fileList.innerHTML = '';
            return;
        }

        fileList.innerHTML = '';
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
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <button class="btn-remove-file" onclick="removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(item);
        });
    }

    window.removeFile = function(index) {
        selectedFiles.splice(index, 1);
        updateFileList();
    };

    // ============================================
    // PDF 저장
    // ============================================
    const savePdfBtn = document.getElementById('savePdfBtn');
    if (savePdfBtn) {
        savePdfBtn.addEventListener('click', function() {
            alert('PDF 저장 기능은 준비 중입니다.');
        });
    }

    // ============================================
    // 폼 제출
    // ============================================
    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            const reportPeriod = reportPeriodDisplay?.textContent || '';
            const mainTasks = weeklyTasks?.value || '';
            const achievementsVal = achievements?.value || '';
            const issuesVal = issues?.value || '';
            const nextWeekPlanVal = nextWeekPlan?.value || '';
            const remarksVal = remarks?.value || '';
            const achievementRate = weeklyAchievementRateInput?.value ? parseInt(weeklyAchievementRateInput.value) : null;

            if (!reportPeriod.trim()) {
                alert('보고 기간을 선택해주세요.');
                return;
            }

            if (!mainTasks.trim()) {
                alert('금주 주요 업무를 입력해주세요.');
                return;
            }

            if (!confirm('주간업무보고를 저장하시겠습니까?')) {
                return;
            }

            try {
                const projectIdx = selectedProjectIdx.value ? parseInt(selectedProjectIdx.value) : null;
                const projectName = selectedProject ? selectedProject.projectName : null;

                // 입력 달성률 가져오기
                const inputProgressRateValue = inputProgressRateSlider && inputProgressRateSlider.value ?
                    parseInt(inputProgressRateSlider.value) : null;

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

                const response = await fetch('/api/document/weekly-report', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });

                if (response.ok) {
                    alert('주간업무보고가 저장되었습니다.');
                    window.location.href = '/approval';
                } else {
                    const error = await response.text();
                    console.error('저장 실패:', error);
                    alert('저장에 실패했습니다.');
                }
            } catch (error) {
                console.error('API 호출 오류:', error);
                alert('저장 중 오류가 발생했습니다: ' + error.message);
            }
        });
    }
});
