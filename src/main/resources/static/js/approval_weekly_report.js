// 주간업무보고 작성 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    const currentUserIdx = window.CURRENT_USER?.idx || null;
    const currentUserName = window.CURRENT_USER?.empName || '';
    const currentUserDept = window.CURRENT_USER?.empDeptName || '';
    console.log('현재 로그인 사용자:', currentUserName, '(idx:', currentUserIdx, ')');

    let selectedFiles = [];
    let projects = [];
    let selectedProject = null; // 선택된 프로젝트

    // DOM 요소
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const submitBtn = document.getElementById('submitBtn');
    const projectInput = document.getElementById('projectInput');
    const selectedProjectIdx = document.getElementById('selectedProjectIdx');
    const weeklyAchievementRateInput = document.getElementById('weeklyAchievementRate');
    const reportDatePicker = document.getElementById('reportDatePicker');
    const reportPeriodDisplay = document.getElementById('reportPeriodDisplay');
    const applicantName = document.getElementById('applicantName');
    const applicantDept = document.getElementById('applicantDept');

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
            }
        } catch (error) {
            console.error('프로젝트 로드 오류:', error);
        }
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

    window.selectProject = function() {
        if (!selectedProject) {
            alert('프로젝트를 선택해주세요.');
            return;
        }

        // 프로젝트 입력 필드에 표시
        if (projectInput) {
            projectInput.textContent = selectedProject.projectName;
        }
        if (selectedProjectIdx) {
            selectedProjectIdx.value = selectedProject.idx;
        }

        // 현재 전체 달성률 표시
        const currentProgressRateValue = document.getElementById('currentProgressRateValue');
        if (currentProgressRateValue && selectedProject.progressRate !== undefined) {
            currentProgressRateValue.textContent = (selectedProject.progressRate || 0).toFixed(2) + '%';
        }

        // 미리보기 업데이트
        const autoProject = document.querySelector('.auto-project');
        if (autoProject) {
            autoProject.textContent = selectedProject.projectName;
        }

        closeProjectModal();
    };

    // ============================================
    // 보고 기간 자동 계산
    // ============================================
    function getWeekdayRange(date) {
        const selected = new Date(date);
        const day = selected.getDay();
        let mondayOffset = day === 0 ? -6 : 1 - day;

        const monday = new Date(selected);
        monday.setDate(selected.getDate() + mondayOffset);

        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);

        return { monday, friday };
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    }

    if (reportDatePicker) {
        reportDatePicker.addEventListener('change', function() {
            if (this.value) {
                const { monday, friday } = getWeekdayRange(this.value);
                const mondayStr = formatDate(monday);
                const fridayStr = formatDate(friday);
                const periodStr = `${mondayStr} ~ ${fridayStr}`;

                reportPeriodDisplay.value = periodStr;

                // 미리보기 업데이트
                const autoPeriod = document.querySelector('.auto-period');
                if (autoPeriod) autoPeriod.textContent = periodStr;
            } else {
                reportPeriodDisplay.value = '';
                const autoPeriod = document.querySelector('.auto-period');
                if (autoPeriod) autoPeriod.textContent = '-';
            }
        });

        // 오늘 날짜로 초기화
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        reportDatePicker.value = `${yyyy}-${mm}-${dd}`;
        reportDatePicker.dispatchEvent(new Event('change'));
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
            const reportPeriod = reportPeriodDisplay?.value || '';
            const mainTasks = weeklyTasks?.value || '';
            const achievementsVal = achievements?.value || '';
            const issuesVal = issues?.value || '';
            const nextWeekPlanVal = nextWeekPlan?.value || '';
            const achievementRate = weeklyAchievementRateInput?.value ? parseInt(weeklyAchievementRateInput.value) : null;

            if (!reportPeriod.trim()) {
                alert('보고 기간을 입력해주세요.');
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
