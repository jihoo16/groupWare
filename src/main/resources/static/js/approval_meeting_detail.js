// 회의록 상세 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // URL에서 ID 추출
    const urlParams = new URLSearchParams(window.location.search);
    const meetingId = urlParams.get('id');

    if (!meetingId) {
        showError('잘못된 접근입니다.');
        history.back();
        return;
    }

    // 회의록 데이터 로드
    window.showPageLoadingOverlay();
    loadMeetingDetail(meetingId);

    // 전역 변수
    let projects = []; // 프로젝트 목록
    let currentMeeting = null; // 현재 회의록 데이터

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
    const editBtn = document.getElementById('editMeetingBtn');
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            if (!isEditMode) {
                // 수정 모드 활성화
                enableEditMode();
                isEditMode = true;
                editBtn.innerHTML = '<i class="fas fa-save"></i> 수정 완료';
            } else {
                // 수정 완료 (저장)
                saveMeeting();
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
        const currentProjectIdx = currentMeeting ? currentMeeting.projectIdx : null;

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

        // 회의명
        const meetingTitleInput = document.getElementById('meetingTitle');
        meetingTitleInput.removeAttribute('readonly');
        meetingTitleInput.style.border = '1px solid #ddd';
        meetingTitleInput.style.background = 'white';
        meetingTitleInput.style.padding = '8px';

        // 일시 - datetime-local로 변경
        const meetingDatetimeInput = document.getElementById('meetingDatetime');
        const currentDatetimeValue = currentMeeting && currentMeeting.meetingDatetime
            ? new Date(currentMeeting.meetingDatetime).toISOString().slice(0, 16)
            : '';

        const datetimeInput = document.createElement('input');
        datetimeInput.type = 'datetime-local';
        datetimeInput.id = 'meetingDatetime';
        datetimeInput.value = currentDatetimeValue;
        datetimeInput.style.border = '1px solid #ddd';
        datetimeInput.style.background = 'white';
        datetimeInput.style.padding = '8px';
        datetimeInput.style.width = '100%';

        meetingDatetimeInput.parentNode.replaceChild(datetimeInput, meetingDatetimeInput);

        // 장소, 참석자
        const textInputFields = ['location', 'participants'];
        textInputFields.forEach(id => {
            const inputElement = document.getElementById(id);
            if (inputElement) {
                inputElement.removeAttribute('readonly');
                inputElement.style.border = '1px solid #ddd';
                inputElement.style.background = 'white';
                inputElement.style.padding = '8px';
            }
        });

        // 회의 목적, 회의 내용, 결정 사항, Action Items - textarea
        const textareaFields = ['purpose', 'content', 'decisions', 'actionItems'];
        textareaFields.forEach(id => {
            const textarea = document.getElementById(id);
            if (textarea) {
                textarea.removeAttribute('readonly');
                textarea.style.border = '1px solid #ddd';
                textarea.style.background = 'white';
                textarea.style.padding = '8px';
            }
        });

        // textarea 자동 높이 조절 적용
        setTimeout(() => applyAutoResize(), 100);

        console.log('수정 모드 활성화');
    }

    // 수정 내용 저장
    async function saveMeeting() {
        const projectSelect = document.getElementById('projectName');
        const selectedOption = projectSelect.options[projectSelect.selectedIndex];
        const projectIdx = projectSelect.value === '' ? null : parseInt(projectSelect.value);
        const projectName = selectedOption.dataset.projectName || null;

        const meetingTitle = document.getElementById('meetingTitle').value.trim();
        const meetingDatetime = document.getElementById('meetingDatetime').value;
        const locationValue = document.getElementById('location').value.trim() || null;
        const participants = document.getElementById('participants').value.trim() || null;
        const purpose = document.getElementById('purpose').value.trim() || null;
        const content = document.getElementById('content').value.trim() || null;
        const decisions = document.getElementById('decisions').value.trim() || null;
        const actionItems = document.getElementById('actionItems').value.trim() || null;

        // 수정자 정보 가져오기
        const updatedUserIdx = document.getElementById('updatedUserIdx').value;

        // 유효성 검사
        if (!meetingTitle) {
            showWarning('회의명을 입력해주세요.');
            return;
        }

        if (!meetingDatetime) {
            showWarning('회의 일시를 입력해주세요.');
            return;
        }

        // 수정 요청 데이터 구성
        const updateData = {
            projectIdx: projectIdx,
            projectName: projectName,
            meetingTitle: meetingTitle,
            meetingDatetime: new Date(meetingDatetime).toISOString(),
            location: locationValue,
            participants: participants,
            purpose: purpose,
            content: content,
            decisions: decisions,
            actionItems: actionItems
        };

        console.log('수정 데이터:', updateData);

        try {
            const response = await fetch(`/api/document/meeting-minutes/${meetingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            console.log('응답 상태:', response.status, response.statusText);

            if (response.ok) {
                const result = await response.json();
                console.log('수정 성공:', result);
                await showSuccess('수정이 완료되었습니다.');
                location.reload();
            } else {
                const errorText = await response.text();
                console.error('수정 실패 - 상태:', response.status);
                console.error('에러 응답:', errorText);
                showError(`수정에 실패했습니다. (상태 코드: ${response.status})`);
            }
        } catch (error) {
            console.error('수정 오류:', error);
            console.error('오류 상세:', error.message, error.stack);
            showError('수정 중 오류가 발생했습니다: ' + error.message);
        }
    }

    // 삭제 버튼 동적 생성 (작성자만)
    function createDeleteButton() {
        const actionButtons = document.getElementById('actionButtons');
        const editBtn = document.getElementById('editMeetingBtn');

        if (actionButtons && editBtn && !document.getElementById('deleteMeetingBtn')) {
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn btn-danger';
            deleteBtn.id = 'deleteMeetingBtn';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> 삭제';

            deleteBtn.addEventListener('click', async function() {
                const confirmed = await showDeleteConfirm('이 회의록을 삭제하시겠습니까?');
                if (!confirmed) {
                    return;
                }

                try {
                    const response = await fetch(`/api/document/meeting-minutes/${meetingId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        await showSuccess('회의록이 삭제되었습니다.');
                        window.location.href = '/approval';
                    } else {
                        const errorText = await response.text();
                        console.error('삭제 실패:', errorText);
                        showError('삭제에 실패했습니다.');
                    }
                } catch (error) {
                    console.error('삭제 오류:', error);
                    showError('삭제 중 오류가 발생했습니다.');
                }
            });

            // 수정 버튼 앞에 삽입
            actionButtons.insertBefore(deleteBtn, editBtn);
            console.log('작성자이므로 삭제 버튼을 생성합니다.');
        }
    }

    // ============================================
    // API: 회의록 상세 조회
    // ============================================
    async function loadMeetingDetail(id) {
        try {
            console.log('회의록 상세 API 호출:', id);
            const meeting = await window.fetchWithErrorHandling(`/api/document/meeting-minutes/${id}`);

            if (!meeting) {
                // Error already handled by fetchWithErrorHandling (404, 403, 500)
                return;
            }

            console.log('회의록 상세 로드 성공:', meeting);
            currentMeeting = meeting; // 전역 변수에 저장
            renderMeetingDetail(meeting);

            // 전자서명 현황 로드
            if (window.SignatureRender && meeting.documentIdx) SignatureRender.load(meeting.documentIdx);

            // 로딩 오버레이 숨김
            window.hidePageLoadingOverlay();
        } catch (error) {
            console.error('회의록 상세 로드 오류:', error);
            showError('회의록을 불러오는 중 오류가 발생했습니다.');
            window.hidePageLoadingOverlay();
            // history.back() 대신 목록 페이지로 이동하여 무한 루프 방지
            setTimeout(() => {
                window.location.href = '/approval';
            }, 1500);
        }
    }

    // 회의록 상세 렌더링
    function renderMeetingDetail(meeting) {
        // 과제명
        document.getElementById('projectName').value = meeting.projectName || '선택 안함';

        // 회의명
        document.getElementById('meetingTitle').value = meeting.meetingTitle || '';

        // 작성자 (이름과 부서 함께 표시)
        const userInfo = meeting.userName || '-';
        const userDept = meeting.userDeptName || '';
        document.getElementById('userName').value = userDept ? `${userInfo} (${userDept})` : userInfo;

        // 일시
        if (meeting.meetingDatetime) {
            const meetingDate = new Date(meeting.meetingDatetime);
            const formattedDate = `${meetingDate.getFullYear()}-${String(meetingDate.getMonth() + 1).padStart(2, '0')}-${String(meetingDate.getDate()).padStart(2, '0')} ${String(meetingDate.getHours()).padStart(2, '0')}:${String(meetingDate.getMinutes()).padStart(2, '0')}`;
            document.getElementById('meetingDatetime').value = formattedDate;
        } else {
            document.getElementById('meetingDatetime').value = '';
        }

        // 장소
        document.getElementById('location').value = meeting.location || '';

        // 참석자
        document.getElementById('participants').value = meeting.participants || '';

        // 회의 목적
        document.getElementById('purpose').value = meeting.purpose || '';

        // 회의 내용
        document.getElementById('content').value = meeting.content || '';

        // 결정 사항
        document.getElementById('decisions').value = meeting.decisions || '';

        // Action Items
        document.getElementById('actionItems').value = meeting.actionItems || '';

        // textarea 자동 높이 조절 적용
        setTimeout(() => applyAutoResize(), 100);

        // 작성자 확인 후 삭제 버튼 생성
        const currentUserIdx = window.CURRENT_USER ? window.CURRENT_USER.idx : null;
        if (meeting.userIdx && currentUserIdx && meeting.userIdx === currentUserIdx) {
            createDeleteButton();
        }
    }
});
