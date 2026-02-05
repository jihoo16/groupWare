// 월간업무보고 상세 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // URL에서 reportId 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const reportId = urlParams.get('id');

    if (!reportId) {
        showError('보고서 ID가 없습니다.');
        window.location.href = '/approval';
        return;
    }

    // 전역 변수 CURRENT_USER 사용 (layout.html에서 주입됨)
    if (!window.CURRENT_USER || !window.CURRENT_USER.idx) {
        console.warn('세션 정보가 없습니다.');
        window.location.href = '/login';
        return;
    }

    const currentUserIdx = window.CURRENT_USER.idx;
    const currentUser = window.CURRENT_USER;
    console.log('현재 로그인 사용자:', currentUser.empName, '(idx:', currentUserIdx, ')');

    // DOM 요소
    const editBtn = document.getElementById('editReportBtn');
    let deleteBtn = null; // 작성자인 경우에만 동적으로 생성됨
    let isEditMode = false;
    let originalData = {}; // 수정 취소를 위한 원본 데이터

    // 전역 변수
    let projects = []; // 프로젝트 목록
    let currentReport = null; // 현재 보고서 데이터

    // 프로젝트 목록 로드
    loadProjects();

    // 페이지 로드 시 월간업무보고 데이터 가져오기
    loadMonthlyReportDetail();

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

    // 월간업무보고 상세 조회
    async function loadMonthlyReportDetail() {
        try {
            console.log(`월간업무보고 상세 조회 API 호출: /api/document/monthly-report/${reportId}`);
            const report = await window.fetchWithErrorHandling(`/api/document/monthly-report/${reportId}`);

            if (!report) {
                // Error already handled by fetchWithErrorHandling (404, 403, 500)
                return;
            }

            console.log('월간업무보고 상세 조회 성공:', report);
            currentReport = report; // 전역 변수에 저장
            displayReportDetail(report);
            originalData = { ...report }; // 원본 데이터 저장

            // 로딩 오버레이 숨김
            window.hidePageLoadingOverlay();
        } catch (error) {
            console.error('월간업무보고 상세 조회 오류:', error);
            showError('월간업무보고 조회 중 오류가 발생했습니다.');
            window.hidePageLoadingOverlay();
            window.location.href = '/approval';
        }
    }

    // 화면에 데이터 표시
    function displayReportDetail(report) {
        // 과제명
        document.getElementById('projectName').value = report.projectName || '선택 안함';

        // 보고자
        document.getElementById('userName').value = currentUser.empName || '';

        // 부서
        document.getElementById('userDept').value = currentUser.empDeptName || '';

        // 보고 월
        document.getElementById('reportMonth').value = report.reportMonth || '';

        // 월간 주요 업무
        document.getElementById('mainTasks').value = report.mainTasks || '';

        // 목표 대비 실적
        document.getElementById('performance').value = report.performance || '';

        // 개선사항
        document.getElementById('improvements').value = report.improvements || '';

        // 차월 계획
        document.getElementById('nextMonthPlan').value = report.nextMonthPlan || '';

        // textarea 자동 높이 조절 적용
        setTimeout(() => applyAutoResize(), 100);

        // 작성자 확인 후 삭제 버튼 생성
        if (report.userIdx && currentUserIdx && report.userIdx === currentUserIdx) {
            createDeleteButton();
        }
    }

    // 삭제 버튼 동적 생성
    function createDeleteButton() {
        const actionButtons = document.getElementById('actionButtons');
        const editButton = document.getElementById('editReportBtn');

        if (actionButtons && editButton && !deleteBtn) {
            deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn btn-danger';
            deleteBtn.id = 'deleteReportBtn';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> 삭제';
            deleteBtn.addEventListener('click', async function() {
                const confirmed = await showDeleteConfirm('이 월간업무보고를 삭제하시겠습니까?');
                if (confirmed) {
                    await deleteMonthlyReport();
                }
            });

            // 수정 버튼 앞에 삽입
            actionButtons.insertBefore(deleteBtn, editButton);
            console.log('작성자이므로 삭제 버튼을 생성합니다.');
        }
    }

    // 수정 버튼 클릭
    editBtn.addEventListener('click', function() {
        if (!isEditMode) {
            // 수정 모드 진입
            enableEditMode();
            editBtn.innerHTML = '<i class="fas fa-save"></i> 저장';
            isEditMode = true;
        } else {
            // 저장
            saveMonthlyReport();
        }
    });

    // 삭제 버튼은 작성자인 경우에만 동적으로 생성되므로 여기서는 이벤트 리스너를 추가하지 않음

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

        // 보고 월
        const reportMonthInput = document.getElementById('reportMonth');
        reportMonthInput.type = 'month';
        reportMonthInput.removeAttribute('readonly');
        reportMonthInput.style.border = '1px solid #ddd';
        reportMonthInput.style.background = 'white';
        reportMonthInput.style.padding = '8px';

        // 텍스트 필드들을 textarea로 변경
        const textFields = ['mainTasks', 'performance', 'improvements', 'nextMonthPlan'];
        textFields.forEach(fieldId => {
            const input = document.getElementById(fieldId);
            const textarea = document.createElement('textarea');
            textarea.id = fieldId;
            textarea.value = input.value;
            textarea.rows = 6;
            textarea.style.width = '100%';
            textarea.style.border = '1px solid #ddd';
            textarea.style.padding = '8px';
            textarea.style.resize = 'none';
            input.parentNode.replaceChild(textarea, input);
        });

        // textarea 자동 높이 조절 적용
        setTimeout(() => applyAutoResize(), 100);
    }

    // 수정 모드 비활성화 (취소)
    function disableEditMode() {
        // 보고 월
        const reportMonthInput = document.getElementById('reportMonth');
        reportMonthInput.type = 'text';
        reportMonthInput.setAttribute('readonly', true);
        reportMonthInput.style.border = '';
        reportMonthInput.style.background = '';
        reportMonthInput.style.padding = '';
        reportMonthInput.value = originalData.reportMonth || '';

        // textarea를 readonly로 되돌림
        const textFields = ['mainTasks', 'performance', 'improvements', 'nextMonthPlan'];
        const rowsMap = {
            'mainTasks': 6,
            'performance': 5,
            'improvements': 4,
            'nextMonthPlan': 5
        };

        textFields.forEach(fieldId => {
            const editableTextarea = document.getElementById(fieldId);
            const readonlyTextarea = document.createElement('textarea');
            readonlyTextarea.id = fieldId;
            readonlyTextarea.value = originalData[fieldId] || '';
            readonlyTextarea.setAttribute('readonly', true);
            readonlyTextarea.rows = rowsMap[fieldId];
            editableTextarea.parentNode.replaceChild(readonlyTextarea, editableTextarea);
        });

        // 버튼 상태 복원
        editBtn.innerHTML = '<i class="fas fa-edit"></i> 수정';
        editBtn.classList.remove('btn-success');
        editBtn.classList.add('btn-primary');
        isEditMode = false;
    }

    // 월간업무보고 저장
    async function saveMonthlyReport() {
        // 폼 데이터 수집
        const projectSelect = document.getElementById('projectName');
        const selectedOption = projectSelect.options[projectSelect.selectedIndex];
        const projectIdx = projectSelect.value === '' ? null : parseInt(projectSelect.value);
        const projectName = selectedOption.dataset.projectName || null;

        const reportMonth = document.getElementById('reportMonth').value;
        const mainTasks = document.getElementById('mainTasks').value;
        const performance = document.getElementById('performance').value;
        const improvements = document.getElementById('improvements').value;
        const nextMonthPlan = document.getElementById('nextMonthPlan').value;

        // 유효성 검사
        if (!reportMonth) {
            showWarning('보고 월을 입력해주세요.');
            return;
        }

        if (!mainTasks) {
            showWarning('월간 주요 업무를 입력해주세요.');
            return;
        }

        // 요청 데이터 구성
        const updateData = {
            projectIdx: projectIdx,
            projectName: projectName,
            reportMonth: reportMonth,
            mainTasks: mainTasks,
            performance: performance,
            improvements: improvements,
            nextMonthPlan: nextMonthPlan
        };

        console.log('월간업무보고 수정 데이터:', updateData);

        try {
            const response = await fetch(`/api/document/monthly-report/${reportId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                const updatedReport = await response.json();
                console.log('월간업무보고 수정 성공:', updatedReport);
                await showSuccess('월간업무보고가 수정되었습니다.');

                // 원본 데이터 업데이트
                originalData = { ...updatedReport };

                // 수정 모드 비활성화
                disableEditMode();

                // 화면 갱신
                displayReportDetail(updatedReport);
                window.location.reload();
            } else {
                const errorText = await response.text();
                console.error('월간업무보고 수정 실패:', errorText);
                showError('월간업무보고 수정에 실패했습니다.');
            }
        } catch (error) {
            console.error('월간업무보고 수정 오류:', error);
            showError('월간업무보고 수정 중 오류가 발생했습니다.');
        }
    }

    // 월간업무보고 삭제
    async function deleteMonthlyReport() {
        try {
            const response = await fetch(`/api/document/monthly-report/${reportId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                console.log('월간업무보고 삭제 성공');
                await showSuccess('월간업무보고가 삭제되었습니다.');
                window.location.href = '/approval';
            } else {
                const errorText = await response.text();
                console.error('월간업무보고 삭제 실패:', errorText);
                showError('월간업무보고 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('월간업무보고 삭제 오류:', error);
            showError('월간업무보고 삭제 중 오류가 발생했습니다.');
        }
    }
});
