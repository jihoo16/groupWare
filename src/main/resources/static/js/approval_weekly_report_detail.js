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

        // 금주 주요 업무
        document.getElementById('mainTasks').value = report.mainTasks || '';

        // 주요 성과
        document.getElementById('achievements').value = report.achievements || '';

        // 주요 이슈
        document.getElementById('issues').value = report.issues || '';

        // 차주 계획
        document.getElementById('nextWeekPlan').value = report.nextWeekPlan || '';
    }
});
