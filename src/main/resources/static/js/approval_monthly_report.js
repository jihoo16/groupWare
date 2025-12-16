// 월간업무보고 작성 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    let currentUser = null; // 현재 로그인한 사용자 정보

    // 프로젝트 목록 로드
    loadProjects();

    // 현재 사용자 정보 로드
    loadCurrentUser();

    // 제출 버튼 이벤트
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitMonthlyReport);
    }

    // 현재 사용자 정보 로드
    async function loadCurrentUser() {
        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                currentUser = await response.json();
                console.log('현재 사용자 정보:', currentUser);

                // 폼에 사용자 정보 채우기
                const formTable = document.querySelector('.form-table');
                if (formTable) {
                    const inputs = formTable.querySelectorAll('input');
                    // 보고자와 부서 필드 찾기
                    inputs.forEach((input, index) => {
                        if (input.value === '홍길동') {
                            input.value = currentUser.empName || '-';
                        } else if (input.value === '개발팀') {
                            input.value = currentUser.empDeptName || '-';
                        }
                    });
                }
            } else {
                console.error('사용자 정보 로드 실패');
                if (response.status === 401) {
                    alert('로그인이 필요합니다.');
                    window.location.href = '/login';
                }
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
                const projects = await response.json();
                const projectSelect = document.getElementById('projectName');

                if (projectSelect) {
                    // 기존 옵션 제거 (첫 번째 "선택 안함" 옵션 제외)
                    while (projectSelect.options.length > 1) {
                        projectSelect.remove(1);
                    }

                    // 프로젝트 목록 추가
                    projects.forEach(project => {
                        const option = document.createElement('option');
                        option.value = project.idx;
                        option.textContent = project.projectName;
                        option.dataset.projectName = project.projectName;
                        projectSelect.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('프로젝트 로드 오류:', error);
        }
    }

    // 월간업무보고 제출
    async function submitMonthlyReport() {
        // 폼 데이터 수집
        const projectSelect = document.getElementById('projectName');
        const selectedOption = projectSelect.options[projectSelect.selectedIndex];
        const selectedProjectIdx = projectSelect.value === '' ? null : parseInt(projectSelect.value);
        const selectedProjectName = selectedOption.dataset.projectName || null;

        const reportMonth = document.getElementById('reportMonth').value;
        const mainTasks = document.getElementById('mainTasks').value;
        const performance = document.getElementById('performance').value;
        const improvements = document.getElementById('improvements').value;
        const nextMonthPlan = document.getElementById('nextMonthPlan').value;

        // 유효성 검사
        if (!reportMonth) {
            alert('보고 월을 입력해주세요.');
            return;
        }

        if (!mainTasks) {
            alert('월간 주요 업무를 입력해주세요.');
            return;
        }

        // 사용자 정보 확인
        if (!currentUser || !currentUser.idx) {
            alert('사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.');
            window.location.href = '/login';
            return;
        }

        // 요청 데이터 구성
        const requestData = {
            userIdx: currentUser.idx,
            projectIdx: selectedProjectIdx,
            projectName: selectedProjectName,
            reportMonth: reportMonth,
            mainTasks: mainTasks,
            performance: performance,
            improvements: improvements,
            nextMonthPlan: nextMonthPlan
        };

        console.log('월간업무보고 제출 데이터:', requestData);

        try {
            const response = await fetch('/api/document/monthly-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('월간업무보고 저장 성공:', result);
                alert('월간업무보고가 등록되었습니다.');
                window.location.href = '/approval';
            } else {
                const errorText = await response.text();
                console.error('월간업무보고 저장 실패:', errorText);
                alert('월간업무보고 등록에 실패했습니다.');
            }
        } catch (error) {
            console.error('월간업무보고 제출 오류:', error);
            alert('월간업무보고 제출 중 오류가 발생했습니다.');
        }
    }
});
