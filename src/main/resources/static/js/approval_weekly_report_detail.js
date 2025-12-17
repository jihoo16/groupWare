// 주간업무보고 상세 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // URL에서 ID 추출
    const urlParams = new URLSearchParams(window.location.search);
    const reportId = urlParams.get('id');

    if (!reportId) {
        alert('잘못된 접근입니다.');
        history.back();
        return;
    }

    // 주간업무보고 데이터 로드
    loadWeeklyReportDetail(reportId);

    // 전역 변수
    let projects = []; // 프로젝트 목록
    let currentReport = null; // 현재 보고서 데이터

    // 프로젝트 목록 로드
    loadProjects();

    // textarea 자동 높이 조절 함수
    function autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    // 모든 textarea에 자동 높이 조절 적용
    function applyAutoResize() {
        const textareas = document.querySelectorAll('.form-table textarea');
        textareas.forEach(textarea => {
            autoResizeTextarea(textarea);
            // input 이벤트에 자동 높이 조절 추가
            textarea.addEventListener('input', function() {
                autoResizeTextarea(this);
            });
        });
    }

    // ============================================
    // 버튼 이벤트 핸들러
    // ============================================

    // 수정 모드 상태
    let isEditMode = false;

    // 수정 버튼
    const editBtn = document.getElementById('editReportBtn');
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            if (!isEditMode) {
                // 수정 모드 활성화
                enableEditMode();
                isEditMode = true;
                editBtn.innerHTML = '<i class="fas fa-save"></i> 수정 완료';
            } else {
                // 수정 완료 (저장)
                saveWeeklyReport();
            }
        });
    }

    // 프로젝트 목록 로드
    async function loadProjects() {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                projects = await response.json();
                console.log('프로젝트 목록 로드 성공:', projects.length + '건');
            }
        } catch (error) {
            console.error('프로젝트 로드 오류:', error);
        }
    }

    // 수정 모드 활성화
    function enableEditMode() {
        // 과제명 - 셀렉트박스로 변경
        const projectNameInput = document.getElementById('projectName');
        const currentProjectIdx = currentReport ? currentReport.projectIdx : null;

        const projectSelect = document.createElement('select');
        projectSelect.id = 'projectName';
        projectSelect.className = 'form-control';

        // "선택 안함" 옵션
        const noneOption = document.createElement('option');
        noneOption.value = '';
        noneOption.textContent = '선택 안함';
        if (!currentProjectIdx) {
            noneOption.selected = true;
        }
        projectSelect.appendChild(noneOption);

        // 프로젝트 목록 추가
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.idx;
            option.textContent = project.projectName;
            option.dataset.projectName = project.projectName;

            // 저장된 프로젝트가 있으면 선택
            if (currentProjectIdx && project.idx === currentProjectIdx) {
                option.selected = true;
            }

            projectSelect.appendChild(option);
        });

        projectNameInput.parentNode.replaceChild(projectSelect, projectNameInput);

        // 달성률
        const achievementInput = document.getElementById('weeklyAchievementRate');
        achievementInput.removeAttribute('readonly');
        achievementInput.type = 'text';
        const currentValue = achievementInput.value.replace('%', '');
        achievementInput.value = currentValue;
        achievementInput.style.border = '1px solid #ddd';
        achievementInput.style.background = 'white';
        achievementInput.style.padding = '8px';

        // 보고 기간은 input으로 유지
        const reportPeriodInput = document.getElementById('reportPeriod');
        reportPeriodInput.removeAttribute('readonly');
        reportPeriodInput.style.border = '1px solid #ddd';
        reportPeriodInput.style.background = 'white';
        reportPeriodInput.style.padding = '8px';

        // 금주 주요 업무, 주요 성과, 주요 이슈, 차주 계획은 textarea로 변경
        const textFields = ['mainTasks', 'achievements', 'issues', 'nextWeekPlan'];
        textFields.forEach(id => {
            const inputElement = document.getElementById(id);
            if (inputElement) {
                // 현재 값 저장
                const currentValue = inputElement.value;

                // textarea 생성
                const textarea = document.createElement('textarea');
                textarea.id = id;
                textarea.value = currentValue;
                textarea.style.height = '155px';
                textarea.style.resize = 'none';
                textarea.style.border = '1px solid #ddd';
                textarea.style.background = 'white';
                textarea.style.padding = '8px';
                textarea.style.width = '100%';

                // input을 textarea로 교체
                inputElement.parentNode.replaceChild(textarea, inputElement);
            }
        });

        // textarea 자동 높이 조절 적용
        setTimeout(() => applyAutoResize(), 100);

        console.log('수정 모드 활성화');
    }

    // 수정 내용 저장
    async function saveWeeklyReport() {
        const projectSelect = document.getElementById('projectName');
        const selectedOption = projectSelect.options[projectSelect.selectedIndex];
        const projectIdx = projectSelect.value === '' ? null : parseInt(projectSelect.value);
        const projectName = selectedOption.dataset.projectName || null;

        const achievementRate = document.getElementById('weeklyAchievementRate').value;
        const reportPeriod = document.getElementById('reportPeriod').value;
        const mainTasks = document.getElementById('mainTasks').value;
        const achievements = document.getElementById('achievements').value;
        const issues = document.getElementById('issues').value;
        const nextWeekPlan = document.getElementById('nextWeekPlan').value;

        // 수정 요청 데이터 구성
        const updateData = {
            projectIdx: projectIdx,
            projectName: projectName,
            weeklyAchievementRate: achievementRate ? parseInt(achievementRate) : null,
            reportPeriod: reportPeriod,
            mainTasks: mainTasks,
            achievements: achievements,
            issues: issues,
            nextWeekPlan: nextWeekPlan
        };

        console.log('수정 데이터:', updateData);

        try {
            const response = await fetch(`/api/document/weekly-report/${reportId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                alert('수정이 완료되었습니다.');
                location.reload();
            } else {
                const errorText = await response.text();
                console.error('수정 실패:', errorText);
                alert('수정에 실패했습니다.');
            }
        } catch (error) {
            console.error('수정 오류:', error);
            alert('수정 중 오류가 발생했습니다.');
        }
    }

    // 삭제 버튼
    const deleteBtn = document.getElementById('deleteReportBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function() {
            if (!confirm('정말로 이 주간업무보고를 삭제하시겠습니까?')) {
                return;
            }

            try {
                const response = await fetch(`/api/document/weekly-report/${reportId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    alert('주간업무보고가 삭제되었습니다.');
                    window.location.href = '/approval';
                } else {
                    const errorText = await response.text();
                    console.error('삭제 실패:', errorText);
                    alert('삭제에 실패했습니다.');
                }
            } catch (error) {
                console.error('삭제 오류:', error);
                alert('삭제 중 오류가 발생했습니다.');
            }
        });
    }

    // ============================================
    // API: 주간업무보고 상세 조회
    // ============================================
    async function loadWeeklyReportDetail(id) {
        try {
            console.log('주간업무보고 상세 API 호출:', id);
            const response = await fetch(`/api/document/weekly-report/${id}`);

            if (response.ok) {
                const report = await response.json();
                console.log('주간업무보고 상세 로드 성공:', report);
                currentReport = report; // 전역 변수에 저장
                renderWeeklyReportDetail(report);
            } else {
                const errorText = await response.text();
                console.error('주간업무보고 상세 로드 실패:', errorText);
                alert('주간업무보고를 불러오는데 실패했습니다.');
                history.back();
            }
        } catch (error) {
            console.error('주간업무보고 상세 로드 오류:', error);
            alert('주간업무보고를 불러오는 중 오류가 발생했습니다.');
            history.back();
        }
    }

    // 주간업무보고 상세 렌더링
    function renderWeeklyReportDetail(report) {
        // 과제명
        document.getElementById('projectName').value = report.projectName || '선택 안함';

        // 달성률
        if (report.weeklyAchievementRate !== null && report.weeklyAchievementRate !== undefined) {
            document.getElementById('weeklyAchievementRate').value = report.weeklyAchievementRate + '%';
        } else {
            document.getElementById('weeklyAchievementRate').value = '';
        }

        // 보고자 및 부서
        document.getElementById('userName').value = report.userName || '-';
        document.getElementById('userDept').value = report.userDeptName || '-';

        // 보고 기간
        document.getElementById('reportPeriod').value = report.reportPeriod || '';

        // 금주 주요 업무
        document.getElementById('mainTasks').value = report.mainTasks || '';

        // 주요 성과
        document.getElementById('achievements').value = report.achievements || '';

        // 주요 이슈
        document.getElementById('issues').value = report.issues || '';

        // 차주 계획
        document.getElementById('nextWeekPlan').value = report.nextWeekPlan || '';

        // textarea 자동 높이 조절 적용
        setTimeout(() => applyAutoResize(), 100);
    }
});
