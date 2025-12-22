// 주간업무보고 작성 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수 CURRENT_USER 사용 (layout.html에서 주입됨)
    const currentUserIdx = window.CURRENT_USER?.idx || null;
    const currentUserName = window.CURRENT_USER?.empName || '';
    const currentUserDept = window.CURRENT_USER?.empDeptName || '';
    console.log('현재 로그인 사용자:', window.CURRENT_USER?.empName, '(idx:', currentUserIdx, ')');


    // ============================================
    // 사용자 정보 채우기
    // ============================================
    const formTable = document.querySelector('.form-table');
    if (formTable) {
        const inputs = formTable.querySelectorAll('input');
        // 보고자 (index 1)
        if (inputs[1]) {
            inputs[1].value = currentUserName || '-';
        }
        // 부서 (index 2)
        if (inputs[2]) {
            inputs[2].value = currentUserDept || '-';
        }
    }
    // 전역 변수
    let selectedFiles = [];
    let projects = []; // 프로젝트 목록

    // DOM 요소
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const submitBtn = document.getElementById('submitBtn');
    const projectSelect = document.getElementById('projectSelect');
    const weeklyAchievementRateInput = document.getElementById('weeklyAchievementRate');
    const reportDatePicker = document.getElementById('reportDatePicker');
    const reportPeriodDisplay = document.getElementById('reportPeriodDisplay');

    // ============================================
    // 템플릿 사이드바 접기/펼치기 기능
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
            e.preventDefault();
            const category = this.closest('.menu-category');
            category.classList.toggle('expanded');
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

    // ============================================
    // 보고 기간 자동 계산 (해당 주의 평일 월~금)
    // ============================================
    function getWeekdayRange(date) {
        const selected = new Date(date);
        const day = selected.getDay(); // 0(일) ~ 6(토)

        // 월요일까지의 거리 계산
        let mondayOffset = day === 0 ? -6 : 1 - day; // 일요일이면 -6, 그 외는 1-day

        // 월요일 날짜 계산
        const monday = new Date(selected);
        monday.setDate(selected.getDate() + mondayOffset);

        // 금요일 날짜 계산 (월요일 + 4일)
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

    // 날짜 선택 시 해당 주의 평일 범위 자동 계산
    if (reportDatePicker) {
        reportDatePicker.addEventListener('change', function() {
            if (this.value) {
                const { monday, friday } = getWeekdayRange(this.value);
                const mondayStr = formatDate(monday);
                const fridayStr = formatDate(friday);
                reportPeriodDisplay.value = `${mondayStr} ~ ${fridayStr}`;
            } else {
                reportPeriodDisplay.value = '';
            }
        });

        // 페이지 로드 시 현재 주의 평일로 초기화
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        reportDatePicker.value = `${yyyy}-${mm}-${dd}`;

        // 초기값 계산
        const { monday, friday } = getWeekdayRange(reportDatePicker.value);
        reportPeriodDisplay.value = `${formatDate(monday)} ~ ${formatDate(friday)}`;
    }

    // ============================================
    // 프로젝트 목록 로드
    // ============================================
    async function loadProjects() {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                projects = await response.json();
                updateProjectSelect();
            } else {
                console.error('프로젝트 목록 로드 실패');
            }
        } catch (error) {
            console.error('프로젝트 목록 로드 오류:', error);
        }
    }

    // 프로젝트 셀렉트박스 업데이트
    function updateProjectSelect() {
        if (!projectSelect) return;

        // 기존 옵션 제거 (첫 번째 "선택 안함" 제외)
        while (projectSelect.options.length > 1) {
            projectSelect.remove(1);
        }

        // 프로젝트 목록 추가
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.idx;
            option.textContent = `${project.projectName}`;
            option.dataset.projectName = project.projectName;
            projectSelect.appendChild(option);
        });
    }

    // 페이지 로드 시 프로젝트 목록 가져오기
    loadProjects();

    // ============================================
    // 파일 업로드 기능
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

    // 드래그 앤 드롭
    if (fileUploadArea) {
        fileUploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderColor = '#667eea';
            this.style.background = '#f5f7ff';
        });

        fileUploadArea.addEventListener('dragleave', function() {
            this.style.borderColor = '#ddd';
            this.style.background = 'white';
        });

        fileUploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.borderColor = '#ddd';
            this.style.background = 'white';

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

    // 파일 목록 업데이트
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

    // 파일 제거
    window.removeFile = function(index) {
        selectedFiles.splice(index, 1);
        updateFileList();
    };

    // ============================================
    // 폼 제출 기능
    // ============================================


    // 제출 (저장)
    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            // 폼 데이터 수집
            const formTable = document.querySelector('.form-table');
            if (!formTable) {
                alert('문서 양식을 찾을 수 없습니다.');
                return;
            }

            // 각 필드 값 추출
            const inputs = formTable.querySelectorAll('textarea');
            const reportPeriod = reportPeriodDisplay?.value || ''; // 보고 기간
            const mainTasks = inputs[0]?.value || ''; // 금주 주요 업무
            const achievements = inputs[1]?.value || ''; // 주요 성과
            const issues = inputs[2]?.value || ''; // 주요 이슈
            const nextWeekPlan = inputs[3]?.value || ''; // 차주 계획
            const weeklyAchievementRate = weeklyAchievementRateInput?.value ? parseInt(weeklyAchievementRateInput.value) : null; // 주차별 달성률

            // 필수 필드 검증
            if (!reportPeriod.trim()) {
                alert('보고 기간을 입력해주세요.');
                return;
            }

            if (!mainTasks.trim()) {
                alert('금주 주요 업무를 입력해주세요.');
                return;
            }

            if (confirm('주간업무보고를 저장하시겠습니까?')) {
                try {
                    // 선택된 프로젝트 정보 추출
                    const selectedProjectIdx = projectSelect.value ? parseInt(projectSelect.value) : null;
                    const selectedProjectName = projectSelect.value
                        ? projectSelect.options[projectSelect.selectedIndex].dataset.projectName
                        : null;

                    // API 요청 데이터 구성
                    const requestData = {
                        userIdx: currentUserIdx,
                        projectIdx: selectedProjectIdx,
                        projectName: selectedProjectName,
                        reportPeriod: reportPeriod,
                        mainTasks: mainTasks,
                        achievements: achievements,
                        issues: issues,
                        nextWeekPlan: nextWeekPlan,
                        weeklyAchievementRate: weeklyAchievementRate
                    };

                    console.log('전송 데이터:', requestData);

                    // API 호출
                    const response = await fetch('/api/document/weekly-report', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestData)
                    });

                    if (response.ok) {
                        const result = await response.json();
                        console.log('저장 성공:', result);
                        alert('주간업무보고가 저장되었습니다.');

                        // 폼 초기화
                        projectSelect.value = ''; // 과제명
                        reportDatePicker.value = ''; // 날짜 선택
                        reportPeriodDisplay.value = ''; // 보고 기간
                        inputs[0].value = ''; // 금주 주요 업무
                        inputs[1].value = ''; // 주요 성과
                        inputs[2].value = ''; // 주요 이슈
                        inputs[3].value = ''; // 차주 계획
                        if (weeklyAchievementRateInput) weeklyAchievementRateInput.value = ''; // 주차별 달성률

                        // 목록으로 이동 (필요시 주석 해제)
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
            }
        });
    }
});
