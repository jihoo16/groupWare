// 프로젝트 주간업무보고 상세 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // URL에서 보고서 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const reportId = urlParams.get('id');

    if (!reportId) {
        alert('보고서 ID가 없습니다.');
        history.back();
        return;
    }

    // 보고서 데이터 로드
    loadReportData(reportId);

    // 수정 버튼 이벤트
    const editReportBtn = document.getElementById('editReportBtn');
    if (editReportBtn) {
        editReportBtn.addEventListener('click', function() {
            // 수정 페이지로 이동 (데이터를 query parameter로 전달)
            window.location.href = `/approval/project-weekly-report?id=${reportId}`;
        });
    }

    // 삭제 버튼 이벤트
    const deleteReportBtn = document.getElementById('deleteReportBtn');
    if (deleteReportBtn) {
        deleteReportBtn.addEventListener('click', function() {
            deleteReport(reportId);
        });
    }
});

// 보고서 데이터 로드
async function loadReportData(reportId) {
    try {
        const response = await fetch(`/api/document/weekly-report/${reportId}`);

        if (!response.ok) {
            throw new Error('보고서를 불러올 수 없습니다.');
        }

        const data = await response.json();
        console.log('보고서 데이터:', data);

        // 데이터 화면에 표시
        displayReportData(data);

    } catch (error) {
        console.error('보고서 로드 오류:', error);
        alert('보고서를 불러오는 중 오류가 발생했습니다: ' + error.message);
        history.back();
    }
}

// 보고서 데이터 화면에 표시
function displayReportData(data) {
    // 프로젝트명
    const projectNameEl = document.getElementById('projectName');
    if (projectNameEl) {
        projectNameEl.textContent = data.projectName || '-';
    }

    // 주간 달성률
    const weeklyAchievementRateEl = document.getElementById('weeklyAchievementRate');
    if (weeklyAchievementRateEl) {
        weeklyAchievementRateEl.textContent = data.weeklyAchievementRate !== null ? data.weeklyAchievementRate : '0';
    }

    // 보고자
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = data.userName || '-';
    }

    // 부서
    const userDeptEl = document.getElementById('userDept');
    if (userDeptEl) {
        userDeptEl.textContent = data.userDeptName || '-';
    }

    // 보고 기간
    const reportPeriodEl = document.getElementById('reportPeriod');
    if (reportPeriodEl) {
        reportPeriodEl.textContent = data.reportPeriod || '-';
    }

    // 금주 주요 업무
    const mainTasksEl = document.getElementById('mainTasks');
    if (mainTasksEl) {
        mainTasksEl.textContent = data.mainTasks || '-';
    }

    // 주요 성과
    const achievementsEl = document.getElementById('achievements');
    if (achievementsEl) {
        achievementsEl.textContent = data.achievements || '-';
    }

    // 주요 이슈
    const issuesEl = document.getElementById('issues');
    if (issuesEl) {
        issuesEl.textContent = data.issues || '-';
    }

    // 차주 계획
    const nextWeekPlanEl = document.getElementById('nextWeekPlan');
    if (nextWeekPlanEl) {
        nextWeekPlanEl.textContent = data.nextWeekPlan || '-';
    }

    // 기타
    const remarksEl = document.getElementById('remarks');
    if (remarksEl) {
        remarksEl.textContent = data.remarks || '-';
    }

    // 참조자
    const referenceNamesEl = document.getElementById('referenceNames');
    if (referenceNamesEl) {
        referenceNamesEl.textContent = data.referenceNames || '-';
    }

    // 결재자 정보 설정 (프로젝트 기반)
    if (data.projectIdx) {
        loadApproversForProject(data.projectIdx, data.userName);
    } else {
        // 프로젝트가 없는 경우 보고자만 담당으로 설정
        const approver1El = document.getElementById('approver1');
        if (approver1El) {
            approver1El.textContent = data.userName || '-';
        }
    }
}

// 프로젝트의 결재자 정보 로드
async function loadApproversForProject(projectIdx, reporterName) {
    try {
        // 프로젝트 정보 조회
        const projectResponse = await fetch(`/api/projects/${projectIdx}`);
        if (!projectResponse.ok) {
            console.error('프로젝트 정보 조회 실패');
            // 실패 시에도 담당자는 보고서 작성자로 설정
            const approver1El = document.getElementById('approver1');
            if (approver1El) {
                approver1El.textContent = reporterName || '-';
            }
            return;
        }

        const project = await projectResponse.json();

        // 직원 목록 조회 (대표이사 찾기 위함)
        const employeesResponse = await fetch('/api/users');
        const employees = employeesResponse.ok ? await employeesResponse.json() : [];

        // 결재자 자동 설정
        const approver1El = document.getElementById('approver1');
        const approver2El = document.getElementById('approver2');
        const approver3El = document.getElementById('approver3');

        // 담당: 보고서 작성자
        if (approver1El) {
            approver1El.textContent = reporterName || '-';
        }

        // 연구책임자: 프로젝트 PM
        if (approver2El) {
            if (project.projectManagerName) {
                approver2El.textContent = project.projectManagerName;
            } else {
                approver2El.textContent = '-';
            }
        }

        // 대표이사: 직급 정렬순서가 1인 사람 (최고 직급)
        if (approver3El) {
            const ceo = employees.find(emp => emp.empPositionSortOrder === 1);
            if (ceo) {
                approver3El.textContent = ceo.empName;
            } else {
                approver3El.textContent = '-';
            }
        }

    } catch (error) {
        console.error('결재자 정보 로드 오류:', error);
        // 에러 발생 시에도 담당자는 보고서 작성자로 설정
        const approver1El = document.getElementById('approver1');
        if (approver1El) {
            approver1El.textContent = reporterName || '-';
        }
    }
}

// 보고서 삭제
async function deleteReport(reportId) {
    if (!confirm('정말로 이 보고서를 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch(`/api/document/weekly-report/${reportId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('보고서가 삭제되었습니다.');
            window.location.href = '/approval';
        } else {
            throw new Error('삭제 실패');
        }
    } catch (error) {
        console.error('삭제 오류:', error);
        alert('보고서 삭제 중 오류가 발생했습니다.');
    }
}
