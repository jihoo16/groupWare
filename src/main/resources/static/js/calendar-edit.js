// 일정 수정 페이지 스크립트
document.addEventListener('DOMContentLoaded', function() {
    // URL에서 일정 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const scheduleId = urlParams.get('id');

    if (!scheduleId) {
        alert('일정 ID가 없습니다.');
        window.location.href = '/calendar';
        return;
    }

    // 현재 사용자 정보 (실제로는 세션에서 가져와야 함)
    const currentUser = '사용자'; // TODO: 실제 로그인 사용자 정보로 변경
    const currentUserIdx = 1; // TODO: 실제 로그인 사용자 IDX로 변경

    // 참여자 관련 변수
    let selectedParticipants = [];

    // 알림 관련 변수
    let notificationEnabled = false;
    let notificationTime = 10;

    // DOM 요소
    const scheduleForm = document.getElementById('editScheduleForm');
    const backBtn = document.getElementById('backBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const deleteBtn = document.getElementById('deleteScheduleBtn');
    const saveBtn = document.getElementById('saveScheduleBtn');

    // 종일 체크박스 관련 요소
    const isAllDayCheckbox = document.getElementById('isAllDayCheckbox');
    const timeInputRow = document.getElementById('timeInputRow');
    const scheduleStartTime = document.getElementById('scheduleStartTime');
    const scheduleEndTime = document.getElementById('scheduleEndTime');

    // 알림 관련 요소
    const notificationToggleBtn = document.getElementById('notificationToggleBtn');
    const notificationTimeButtons = document.getElementById('notificationTimeButtons');
    const notificationTimeBtns = document.querySelectorAll('.notification-time-btn');

    // 참여자 관련 요소
    const participantInput = document.getElementById('participantInput');
    const addParticipantBtn = document.getElementById('addParticipantBtn');
    const participantsList = document.getElementById('participantsList');

    // 종일 체크박스 이벤트
    isAllDayCheckbox.addEventListener('change', function() {
        toggleTimeInputs(!this.checked);

        if (this.checked) {
            // 종일로 변경 시 시간 필드 초기화
            scheduleStartTime.value = '';
            scheduleEndTime.value = '';
        } else {
            // 시간 일정으로 변경 시 기본값 설정
            if (!scheduleStartTime.value) scheduleStartTime.value = '09:00';
            if (!scheduleEndTime.value) scheduleEndTime.value = '18:00';
        }
    });

    // 시간 입력 필드 활성화/비활성화 함수
    function toggleTimeInputs(enabled) {
        scheduleStartTime.disabled = !enabled;
        scheduleEndTime.disabled = !enabled;

        if (enabled) {
            timeInputRow.style.opacity = '1';
            scheduleStartTime.style.cursor = 'text';
            scheduleEndTime.style.cursor = 'text';
        } else {
            timeInputRow.style.opacity = '0.5';
            scheduleStartTime.style.cursor = 'not-allowed';
            scheduleEndTime.style.cursor = 'not-allowed';
        }
    }

    // 페이지 로드 시 일정 정보 가져오기
    loadScheduleData(scheduleId);

    // 일정 정보 로드 함수
    async function loadScheduleData(id) {
        try {
            const response = await fetch(`/api/calendar/events/${id}`);
            const data = await response.json();

            if (data.success) {
                const schedule = data.event;

                // 폼 필드에 값 설정
                document.getElementById('scheduleTitle').value = schedule.eventTitle || '';
                document.getElementById('scheduleType').value = schedule.eventType || 'business';
                document.getElementById('scheduleStartDate').value = schedule.startDate || '';
                document.getElementById('scheduleEndDate').value = schedule.endDate || '';
                document.getElementById('scheduleLocation').value = schedule.location || '';
                document.getElementById('scheduleDescription').value = schedule.eventDescription || '';

                // 종일 일정 체크
                const isAllDay = schedule.isAllDay || (!schedule.startTime && !schedule.endTime);
                isAllDayCheckbox.checked = isAllDay;

                if (isAllDay) {
                    // 종일 일정이면 시간 입력 비활성화
                    scheduleStartTime.value = '';
                    scheduleEndTime.value = '';
                    toggleTimeInputs(false);
                } else {
                    // 시간 일정이면 시간 값 설정
                    scheduleStartTime.value = schedule.startTime || '09:00';
                    scheduleEndTime.value = schedule.endTime || '18:00';
                    toggleTimeInputs(true);
                }

                // 참석자 목록 설정
                if (schedule.participants && Array.isArray(schedule.participants)) {
                    selectedParticipants = schedule.participants.map(p =>
                        typeof p === 'string' ? p : (p.userName || p.name || '')
                    ).filter(name => name !== '');
                } else {
                    selectedParticipants = [];
                }
                renderParticipantsList();

                // 알림 설정
                notificationEnabled = schedule.notificationYn === 'Y';
                notificationTime = schedule.notificationMinutes || 10;
                updateNotificationButton();

                // 알림 시간 버튼 설정
                notificationTimeBtns.forEach(btn => {
                    btn.classList.remove('active');
                    if (parseInt(btn.getAttribute('data-time')) === notificationTime) {
                        btn.classList.add('active');
                    }
                });
            } else {
                alert('일정 정보를 불러올 수 없습니다: ' + data.message);
                window.location.href = '/calendar';
            }
        } catch (error) {
            console.error('일정 로드 중 오류:', error);
            alert('일정 정보를 불러오는 중 오류가 발생했습니다.');
            window.location.href = '/calendar';
        }
    }

    // 알림 토글 버튼 이벤트
    notificationToggleBtn.addEventListener('click', function() {
        notificationEnabled = !notificationEnabled;
        updateNotificationButton();
    });

    // 알림 버튼 상태 업데이트
    function updateNotificationButton() {
        const icon = notificationToggleBtn.querySelector('i');
        const statusText = notificationToggleBtn.querySelector('.notification-status');

        if (notificationEnabled) {
            notificationToggleBtn.classList.add('active');
            icon.className = 'fas fa-bell';
            statusText.textContent = '알림 켜짐';
            notificationTimeButtons.style.display = 'flex';
        } else {
            notificationToggleBtn.classList.remove('active');
            icon.className = 'far fa-bell-slash';
            statusText.textContent = '알림 꺼짐';
            notificationTimeButtons.style.display = 'none';
        }
    }

    // 알림 시간 버튼 이벤트
    notificationTimeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 모든 버튼에서 active 클래스 제거
            notificationTimeBtns.forEach(b => b.classList.remove('active'));

            // 클릭된 버튼에 active 클래스 추가
            this.classList.add('active');

            // 알림 시간 저장
            notificationTime = parseInt(this.getAttribute('data-time'));
        });
    });

    // 참여자 추가 버튼
    addParticipantBtn.addEventListener('click', function() {
        const name = participantInput.value.trim();

        if (name && !selectedParticipants.includes(name)) {
            selectedParticipants.push(name);
            renderParticipantsList();
            participantInput.value = '';
        }
    });

    // 참여자 입력란에서 엔터키 처리
    participantInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addParticipantBtn.click();
        }
    });

    // 참여자 목록 렌더링
    function renderParticipantsList() {
        participantsList.innerHTML = '';

        selectedParticipants.forEach(name => {
            const tag = document.createElement('div');
            tag.className = 'participant-tag';
            tag.innerHTML = `
                ${name}
                <button type="button" class="participant-remove" data-name="${name}">×</button>
            `;
            participantsList.appendChild(tag);
        });

        // 삭제 버튼 이벤트
        participantsList.querySelectorAll('.participant-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                const name = this.getAttribute('data-name');
                selectedParticipants = selectedParticipants.filter(p => p !== name);
                renderParticipantsList();
            });
        });
    }

    // 뒤로가기/취소 버튼 이벤트
    backBtn.addEventListener('click', function() {
        if (confirm('일정 목록으로 돌아가시겠습니까? 저장하지 않은 변경사항은 사라집니다.')) {
            window.location.href = '/calendar';
        }
    });

    cancelBtn.addEventListener('click', function() {
        if (confirm('일정 목록으로 돌아가시겠습니까? 저장하지 않은 변경사항은 사라집니다.')) {
            window.location.href = '/calendar';
        }
    });

    // 삭제 버튼 이벤트
    deleteBtn.addEventListener('click', async function() {
        if (!confirm('이 일정을 삭제하시겠습니까?')) {
            return;
        }

        try {
            const response = await fetch(`/api/calendar/events/${scheduleId}?userId=${currentUserIdx}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                alert('일정이 삭제되었습니다.');
                window.location.href = '/calendar';
            } else {
                alert('일정 삭제 실패: ' + data.message);
            }
        } catch (error) {
            console.error('일정 삭제 중 오류:', error);
            alert('일정 삭제 중 오류가 발생했습니다.');
        }
    });

    // 저장 버튼 이벤트 (폼 제출)
    scheduleForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // 유효성 검사
        if (!scheduleForm.checkValidity()) {
            scheduleForm.reportValidity();
            return;
        }

        const title = document.getElementById('scheduleTitle').value.trim();
        const type = document.getElementById('scheduleType').value;
        const startDate = document.getElementById('scheduleStartDate').value;
        const endDate = document.getElementById('scheduleEndDate').value;
        const isAllDay = isAllDayCheckbox.checked;
        const startTime = isAllDay ? null : (document.getElementById('scheduleStartTime').value || null);
        const endTime = isAllDay ? null : (document.getElementById('scheduleEndTime').value || null);
        const location = document.getElementById('scheduleLocation').value.trim() || null;
        const description = document.getElementById('scheduleDescription').value.trim() || null;

        // 추가 유효성 검사
        if (!title) {
            alert('일정 제목을 입력하세요.');
            return;
        }

        if (new Date(endDate) < new Date(startDate)) {
            alert('종료 날짜는 시작 날짜보다 이전일 수 없습니다.');
            return;
        }

        // API 요청 데이터 생성
        const eventData = {
            eventTitle: title,
            eventType: type,
            eventDescription: description,
            startDate: startDate,
            endDate: endDate,
            startTime: startTime,
            endTime: endTime,
            isAllDay: isAllDay,
            location: location,
            creatorIdx: currentUserIdx,
            creatorName: currentUser,
            notificationYn: notificationEnabled ? 'Y' : 'N',
            notificationMinutes: notificationTime,
            participants: selectedParticipants.map(name => ({
                userName: name,
                userIdx: null, // TODO: 실제 사용자 IDX 매핑 필요
                receiveNotification: 'Y'
            }))
        };

        try {
            const response = await fetch(`/api/calendar/events/${scheduleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });

            const data = await response.json();

            if (data.success) {
                alert('일정이 성공적으로 수정되었습니다.');
                window.location.href = '/calendar';
            } else {
                alert('일정 수정 실패: ' + data.message);
            }
        } catch (error) {
            console.error('일정 수정 중 오류:', error);
            alert('일정 수정 중 오류가 발생했습니다.');
        }
    });

    // 초기 알림 버튼 상태 설정
    updateNotificationButton();
});
