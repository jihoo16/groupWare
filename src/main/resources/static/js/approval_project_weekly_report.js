// 주간업무보고 작성 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    const currentUserIdx = window.CURRENT_USER?.idx || null;
    const currentUserName = window.CURRENT_USER?.empName || '';
    const currentUserDept = window.CURRENT_USER?.empDeptName || '';
    console.log('현재 로그인 사용자:', currentUserName, '(idx:', currentUserIdx, ')');

    let selectedFiles = [];
    let projects = [];
    let employees = [];
    let selectedApprovers = []; // {idx, name, dept, position}
    let selectedEmployee = null;
    let selectedProject = null; // 선택된 프로젝트

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

    // ============================================
    // 사용자 정보 채우기
    // ============================================
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
    // 프로젝트 목록 로드 및 모달
    // ============================================
    const projectModal = document.getElementById('projectModal');
    const projectSearch = document.getElementById('projectSearch');
    const projectList = document.getElementById('projectList');

    async function loadProjects() {
        try {
            const response = await fetch('/api/projects');
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

        // 현재 전체 달성률 표시
        const currentProgressRate = document.getElementById('currentProgressRate');
        if (currentProgressRate && project.progressRate !== undefined) {
            currentProgressRate.value = (project.progressRate || 0) + '%';
        }

        // 미리보기 업데이트
        const autoProject = document.querySelector('.auto-project');
        if (autoProject) {
            autoProject.textContent = project.projectName;
        }

        // 결재자 자동 설정: 프로젝트 책임자 & 대표이사
        await autoSetApprovers(project);
    }

    loadProjects();

    // 프로젝트 목록 렌더링
    function renderProjectList(list) {
        if (!projectList) return;

        projectList.innerHTML = '';
        list.forEach(proj => {
            const item = document.createElement('div');
            item.className = 'employee-item';
            if (selectedProject && selectedProject.idx === proj.idx) {
                item.classList.add('selected');
            }

            item.innerHTML = `
                <i class="fas fa-folder"></i>
                <div class="employee-info">
                    <div class="employee-name">${proj.projectName}</div>
                    <div class="employee-detail">${proj.description || '설명 없음'}</div>
                </div>
            `;

            item.addEventListener('click', function() {
                document.querySelectorAll('#projectList .employee-item').forEach(i => i.classList.remove('selected'));
                this.classList.add('selected');
                selectedProject = proj;
            });

            projectList.appendChild(item);
        });
    }

    // 프로젝트 검색
    if (projectSearch) {
        projectSearch.addEventListener('input', function() {
            const keyword = this.value.toLowerCase();
            const filtered = projects.filter(proj =>
                proj.projectName.toLowerCase().includes(keyword)
            );
            renderProjectList(filtered);
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
            currentProgressRate.value = (selectedProject.progressRate || 0) + '%';
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

            // 1. 프로젝트 책임자 추가 (managerIdx)
            if (project.managerIdx) {
                const manager = employees.find(emp => emp.idx === project.managerIdx);
                if (manager) {
                    selectedApprovers.push({
                        idx: manager.idx,
                        name: manager.empName,
                        dept: manager.empDeptName || '',
                        position: manager.empPosition || ''
                    });
                }
            }

            // 2. 대표이사 추가 (직급 sortOrder = 1인 사용자)
            // 대표이사 정보를 가져오기 위해 API 호출
            const ceoResponse = await fetch('/api/users');
            if (ceoResponse.ok) {
                const allUsers = await ceoResponse.json();
                // 직급 정보를 가져오기 위해 각 사용자의 empPosition을 확인
                // sortOrder는 code 테이블에 있으므로, empPosition이 대표이사인 사용자를 찾음
                const ceo = allUsers.find(user => {
                    // empPosition이 C0201 (대표이사)인 경우
                    return user.empPosition === 'C0201';
                });

                if (ceo && !selectedApprovers.find(a => a.idx === ceo.idx)) {
                    selectedApprovers.push({
                        idx: ceo.idx,
                        name: ceo.empName,
                        dept: ceo.empDeptName || '',
                        position: ceo.empPosition || ''
                    });
                }
            }

            // 결재자 UI 업데이트
            renderApproverChips();
            updateApprovalLine();
        } catch (error) {
            console.error('결재자 자동 설정 오류:', error);
        }
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
    // 달성률 입력 시 미리보기 업데이트
    // ============================================
    if (weeklyAchievementRateInput) {
        weeklyAchievementRateInput.addEventListener('input', function() {
            const autoAchievement = document.querySelector('.auto-achievement');
            if (autoAchievement) {
                autoAchievement.textContent = this.value || '0';
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

    // ============================================
    // 결재자 선택 모달
    // ============================================
    const approverModal = document.getElementById('approverModal');
    const approverChips = document.getElementById('approverChips');
    const approverSearch = document.getElementById('approverSearch');
    const employeeList = document.getElementById('employeeList');

    // 직원 목록 로드
    async function loadEmployees() {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                employees = await response.json();
                renderEmployeeList(employees);
            }
        } catch (error) {
            console.error('직원 목록 로드 오류:', error);
        }
    }

    function renderEmployeeList(list) {
        if (!employeeList) return;

        employeeList.innerHTML = '';
        list.forEach(emp => {
            const item = document.createElement('div');
            item.className = 'employee-item';
            if (selectedEmployee && selectedEmployee.idx === emp.idx) {
                item.classList.add('selected');
            }

            item.innerHTML = `
                <i class="fas fa-user-circle"></i>
                <div class="employee-info">
                    <div class="employee-name">${emp.empName}</div>
                    <div class="employee-detail">${emp.empDeptName || ''} | ${emp.empPosition || ''}</div>
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

    // 검색 기능
    if (approverSearch) {
        approverSearch.addEventListener('input', function() {
            const keyword = this.value.toLowerCase();
            const filtered = employees.filter(emp =>
                emp.empName.toLowerCase().includes(keyword) ||
                (emp.empDeptName && emp.empDeptName.toLowerCase().includes(keyword))
            );
            renderEmployeeList(filtered);
        });
    }

    // 결재자 영역 클릭 시 모달 열기
    if (approverChips) {
        approverChips.addEventListener('click', function() {
            openApproverModal();
        });
    }

    window.openApproverModal = function() {
        if (approverModal) {
            approverModal.classList.add('show');
            loadEmployees();
        }
    };

    window.closeApproverModal = function() {
        if (approverModal) {
            approverModal.classList.remove('show');
            selectedEmployee = null;
            if (approverSearch) approverSearch.value = '';
        }
    };

    window.addApprover = function() {
        if (!selectedEmployee) {
            alert('결재자를 선택해주세요.');
            return;
        }

        // 중복 확인
        if (selectedApprovers.find(a => a.idx === selectedEmployee.idx)) {
            alert('이미 추가된 결재자입니다.');
            return;
        }

        selectedApprovers.push({
            idx: selectedEmployee.idx,
            name: selectedEmployee.empName,
            dept: selectedEmployee.empDeptName || '',
            position: selectedEmployee.empPosition || ''
        });

        renderApproverChips();
        updateApprovalLine();
        closeApproverModal();
    };

    function renderApproverChips() {
        if (!approverChips) return;

        if (selectedApprovers.length === 0) {
            approverChips.innerHTML = `
                <div style="text-align: center; color: #94a3b8; font-size: 13px; width: 100%; padding: 20px;">
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
                <span>${approver.name}</span>
                <button class="btn-remove" onclick="removeApprover(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            approverChips.appendChild(chip);
        });
    }

    window.removeApprover = function(index) {
        selectedApprovers.splice(index, 1);
        renderApproverChips();
        updateApprovalLine();
    };

    function updateApprovalLine() {
        const approver1 = document.querySelector('.auto-approver-1');
        const approver2 = document.querySelector('.auto-approver-2');
        const approver3 = document.querySelector('.auto-approver-3');

        if (approver1) approver1.textContent = selectedApprovers[0]?.name || '-';
        if (approver2) approver2.textContent = selectedApprovers[1]?.name || '-';
        if (approver3) approver3.textContent = selectedApprovers[2]?.name || '-';
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
                const inputProgressRateInput = document.getElementById('inputProgressRate');
                const inputProgressRateValue = inputProgressRateInput && inputProgressRateInput.value ?
                    parseFloat(inputProgressRateInput.value) : null;

                const requestData = {
                    userIdx: currentUserIdx,
                    projectIdx: projectIdx,
                    projectName: projectName,
                    reportPeriod: reportPeriod,
                    mainTasks: mainTasks,
                    achievements: achievementsVal,
                    issues: issuesVal,
                    nextWeekPlan: nextWeekPlanVal,
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
