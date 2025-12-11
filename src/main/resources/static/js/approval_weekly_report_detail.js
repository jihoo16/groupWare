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

    // 수정 모드 활성화
    function enableEditMode() {
        // 과제명 - 셀렉트박스로 변경
        const projectNameInput = document.getElementById('projectName');
        const currentProjectName = projectNameInput.value;

        const projectSelect = document.createElement('select');
        projectSelect.id = 'projectName';
        projectSelect.className = 'form-control';
        projectSelect.innerHTML = '<option value="">선택 안함</option>';

        // 프로젝트 목록 로드 (임시로 하드코딩, 추후 API 연동)
        projectSelect.innerHTML += `<option value="${currentProjectName}" selected>${currentProjectName}</option>`;

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

        // 보고 기간
        const reportPeriodInput = document.getElementById('reportPeriod');
        reportPeriodInput.removeAttribute('readonly');
        reportPeriodInput.style.border = '1px solid #ddd';
        reportPeriodInput.style.background = 'white';
        reportPeriodInput.style.padding = '8px';

        // textarea들을 편집 가능하게 변경
        const textareas = ['mainTasks', 'achievements', 'issues', 'nextWeekPlan'];
        textareas.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.removeAttribute('readonly');
                element.style.border = '1px solid #ddd';
                element.style.background = 'white';
                element.style.padding = '8px';
            }
        });

        console.log('수정 모드 활성화');
    }

    // 수정 내용 저장
    async function saveWeeklyReport() {
        const projectName = document.getElementById('projectName').value;
        const achievementRate = document.getElementById('weeklyAchievementRate').value;
        const reportPeriod = document.getElementById('reportPeriod').value;
        const mainTasks = document.getElementById('mainTasks').value;
        const achievements = document.getElementById('achievements').value;
        const issues = document.getElementById('issues').value;
        const nextWeekPlan = document.getElementById('nextWeekPlan').value;

        console.log('수정 데이터:', {
            projectName,
            achievementRate,
            reportPeriod,
            mainTasks,
            achievements,
            issues,
            nextWeekPlan
        });

        // TODO: API 호출하여 수정 내용 저장
        alert('수정 완료! (실제 저장 기능은 추후 구현 예정)');

        // 페이지 새로고침
        location.reload();
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

        // 보고자 및 부서 (현재는 하드코딩, 추후 API에서 가져와야 함)
        document.getElementById('userName').value = '홍길동';
        document.getElementById('userDept').value = '개발팀';

        // 보고 기간
        document.getElementById('reportPeriod').value = report.reportPeriod || '';

        // 금주 주요 업무 (textarea)
        document.getElementById('mainTasks').textContent = report.mainTasks || '';

        // 주요 성과 (textarea)
        document.getElementById('achievements').textContent = report.achievements || '';

        // 주요 이슈 (textarea)
        document.getElementById('issues').textContent = report.issues || '';

        // 차주 계획 (textarea)
        document.getElementById('nextWeekPlan').textContent = report.nextWeekPlan || '';
    }
});
