// 일정관리 페이지 스크립트
document.addEventListener('DOMContentLoaded', function() {
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthTitle = document.getElementById('currentMonthTitle');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const todayBtn = document.getElementById('todayBtn');

    let currentDate = new Date();
    const currentUser = '사용자'; // 실제로는 로그인한 사용자 정보

    // 드래그 선택 관련 변수
    let isDragging = false;
    let dragStartDate = null;
    let dragEndDate = null;
    let selectedCells = [];

    // 샘플 일정 데이터 (실제로는 서버에서 가져와야 함)
    const schedules = [
        // 연차
        {
            id: 1,
            date: '2025-10-20',
            type: 'leave',
            title: '정지원 연차',
            participants: ['정지원'],
            creator: '정지원',
            time: '종일',
            location: '-',
            description: '개인 휴가',
            createdAt: '2025-10-10 09:00',
            startDate: '2025-10-20',
            endDate: '2025-10-21',
            groupId: 'schedule-group-1'
        },
        {
            id: 1,
            date: '2025-10-21',
            type: 'leave',
            title: '정지원 연차',
            participants: ['정지원'],
            creator: '정지원',
            time: '종일',
            location: '-',
            description: '개인 휴가',
            createdAt: '2025-10-10 09:00',
            startDate: '2025-10-20',
            endDate: '2025-10-21',
            groupId: 'schedule-group-1'
        },
        {
            id: 2,
            date: '2025-10-22',
            type: 'leave',
            title: '박CMO 연차',
            participants: ['박CMO'],
            creator: '박CMO',
            time: '종일',
            location: '-',
            description: '가족 행사',
            createdAt: '2025-10-12 14:30',
            startDate: '2025-10-22',
            endDate: '2025-10-22',
            groupId: 'schedule-group-2'
        },
        {
            id: 3,
            date: '2025-10-15',
            type: 'leave',
            title: '사용자 반차(오전)',
            participants: ['사용자'],
            creator: '사용자',
            time: '09:00 - 13:00',
            location: '-',
            description: '병원 진료',
            createdAt: '2025-10-08 10:15',
            startDate: '2025-10-15',
            endDate: '2025-10-15',
            groupId: 'schedule-group-3'
        },
        // 업무 일정
        {
            id: 4,
            date: '2025-10-16',
            type: 'business',
            title: '전체 회의',
            participants: ['사용자', '김대표', '박CMO', '이CTO'],
            creator: '김대표',
            time: '14:00 - 16:00',
            location: '대회의실',
            description: '월간 전체 회의 - 10월 실적 검토 및 11월 계획 수립',
            createdAt: '2025-10-05 11:20',
            startDate: '2025-10-16',
            endDate: '2025-10-16',
            groupId: 'schedule-group-4'
        },
        {
            id: 5,
            date: '2025-10-17',
            type: 'business',
            title: '고객사 미팅',
            participants: ['사용자', '박CMO'],
            creator: '박CMO',
            time: '10:00 - 12:00',
            location: 'A 고객사 본사',
            description: '신규 프로젝트 제안 및 견적 논의',
            createdAt: '2025-10-10 16:45',
            startDate: '2025-10-17',
            endDate: '2025-10-17',
            groupId: 'schedule-group-5'
        },
        {
            id: 6,
            date: '2025-10-18',
            type: 'business',
            title: '기술 세미나',
            participants: ['이CTO', '김개발'],
            creator: '이CTO',
            time: '15:00 - 17:00',
            location: '소회의실',
            description: '최신 기술 트렌드 공유 - AI 및 클라우드',
            createdAt: '2025-10-11 09:30',
            startDate: '2025-10-18',
            endDate: '2025-10-18',
            groupId: 'schedule-group-6'
        },
        {
            id: 7,
            date: '2025-10-23',
            type: 'business',
            title: '프로젝트 진행회의',
            participants: ['사용자', '김개발', '이개발'],
            creator: '사용자',
            time: '13:00 - 14:30',
            location: '개발팀 회의실',
            description: 'ERP 시스템 개발 현황 점검 및 이슈 논의',
            createdAt: '2025-10-15 13:00',
            startDate: '2025-10-23',
            endDate: '2025-10-23',
            groupId: 'schedule-group-7'
        },
        {
            id: 8,
            date: '2025-10-25',
            type: 'business',
            title: '월말 결산 회의',
            participants: ['김대표', '박CMO', '사용자'],
            creator: '김대표',
            time: '16:00 - 18:00',
            location: '대회의실',
            description: '10월 결산 보고 및 분석',
            createdAt: '2025-10-18 10:00',
            startDate: '2025-10-25',
            endDate: '2025-10-25',
            groupId: 'schedule-group-8'
        },
        {
            id: 9,
            date: '2025-10-28',
            type: 'business',
            title: 'Q4 전략 회의',
            participants: ['김대표', '박CMO', '이CTO', '사용자'],
            creator: '김대표',
            time: '09:00 - 12:00',
            location: '대회의실',
            description: '4분기 전략 수립 및 목표 설정',
            createdAt: '2025-10-20 15:30',
            startDate: '2025-10-28',
            endDate: '2025-10-28',
            groupId: 'schedule-group-9'
        },
        {
            id: 10,
            date: '2025-10-27',
            type: 'leave',
            title: 'test 연차',
            participants: ['test'],
            creator: 'test',
            time: '종일',
            location: '-',
            description: '개인 휴가',
            createdAt: '2025-10-10 09:00',
            startDate: '2025-10-27',
            endDate: '2025-10-31',
            groupId: 'schedule-group-10'
        },
        {
            id: 11,
            date: '2025-10-28',
            type: 'leave',
            title: 'test 연차',
            participants: ['test'],
            creator: 'test',
            time: '종일',
            location: '-',
            description: '개인 휴가',
            createdAt: '2025-10-10 09:00',
            startDate: '2025-10-27',
            endDate: '2025-10-31',
            groupId: 'schedule-group-10'
        },
        {
            id: 12,
            date: '2025-10-29',
            type: 'leave',
            title: 'test 연차',
            participants: ['test'],
            creator: 'test',
            time: '종일',
            location: '-',
            description: '개인 휴가',
            createdAt: '2025-10-10 09:00',
            startDate: '2025-10-27',
            endDate: '2025-10-31',
            groupId: 'schedule-group-10'
        },
        {
            id: 13,
            date: '2025-10-30',
            type: 'leave',
            title: 'test 연차',
            participants: ['test'],
            creator: 'test',
            time: '종일',
            location: '-',
            description: '개인 휴가',
            createdAt: '2025-10-10 09:00',
            startDate: '2025-10-27',
            endDate: '2025-10-31',
            groupId: 'schedule-group-10'
        },
        {
            id: 14,
            date: '2025-10-31',
            type: 'leave',
            title: 'test 연차',
            participants: ['test'],
            creator: 'test',
            time: '종일',
            location: '-',
            description: '개인 휴가',
            createdAt: '2025-10-10 09:00',
            startDate: '2025-10-27',
            endDate: '2025-10-31',
            groupId: 'schedule-group-10'
        }
    ];

    // 이전 달 버튼
    prevMonthBtn.addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    // 다음 달 버튼
    nextMonthBtn.addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // 연/월 제목 클릭 이벤트
    currentMonthTitle.addEventListener('click', function() {
        openYearMonthSelectorModal();
    });

    // 오늘 버튼 클릭 이벤트
    todayBtn.addEventListener('click', function() {
        currentDate = new Date();

        // 현재 뷰에 맞게 렌더링
        switch(currentView) {
            case 'day':
                renderDayView();
                break;
            case 'week':
                renderWeekView();
                break;
            case 'month':
            default:
                renderCalendar();
                break;
        }
    });

    // 마우스 휠 스크롤 이벤트 (달력 영역에서)
    let isScrolling = false;
    const scrollDebounceTime = 300; // 300ms 디바운스

    calendarGrid.addEventListener('wheel', function(e) {
        e.preventDefault();

        // 이미 스크롤 중이면 무시
        if (isScrolling) return;

        isScrolling = true;

        // 스크롤 방향 감지
        if (e.deltaY > 0) {
            // 하향 스크롤 - 다음달
            currentDate.setMonth(currentDate.getMonth() + 1);
        } else if (e.deltaY < 0) {
            // 상향 스크롤 - 이전달
            currentDate.setMonth(currentDate.getMonth() - 1);
        }

        renderCalendar();

        // 디바운스: 일정 시간 후 다시 스크롤 가능
        setTimeout(() => {
            isScrolling = false;
        }, scrollDebounceTime);
    }, { passive: false });

    // 달력 렌더링
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // 월 타이틀 설정
        currentMonthTitle.textContent = `${year}년 ${month + 1}월`;

        // 첫날과 마지막날
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const prevLastDay = new Date(year, month, 0);

        const firstDayWeek = firstDay.getDay();
        const lastDate = lastDay.getDate();
        const prevLastDate = prevLastDay.getDate();

        let calendarHTML = '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 오늘 버튼 표시/숨김 처리
        const isCurrentMonth = (year === today.getFullYear() && month === today.getMonth());
        if (isCurrentMonth) {
            todayBtn.classList.remove('show');
        } else {
            todayBtn.classList.add('show');
        }

        // 이전 달 날짜
        for (let i = firstDayWeek - 1; i >= 0; i--) {
            const day = prevLastDate - i;
            calendarHTML += createCalendarCell(year, month - 1, day, true);
        }

        // 현재 달 날짜
        for (let day = 1; day <= lastDate; day++) {
            calendarHTML += createCalendarCell(year, month, day, false);
        }

        // 다음 달 날짜 (6주 채우기)
        const totalCells = Math.ceil((firstDayWeek + lastDate) / 7) * 7;
        const remainingCells = totalCells - (firstDayWeek + lastDate);
        for (let day = 1; day <= remainingCells; day++) {
            calendarHTML += createCalendarCell(year, month + 1, day, true);
        }

        calendarGrid.innerHTML = calendarHTML;

        // 일정 클릭 이벤트 추가
        attachScheduleClickEvents();

        // 날짜 셀 클릭 이벤트 추가
        attachDateCellClickEvents();
    }

    // 달력 셀 생성
    function createCalendarCell(year, month, day, isOtherMonth) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);
        const dayOfWeek = date.getDay();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let classes = ['calendar-cell'];

        if (isOtherMonth) {
            classes.push('other-month');
        }

        if (date.getTime() === today.getTime() && !isOtherMonth) {
            classes.push('today');
        }

        // 지나간 날짜 체크
        if (date.getTime() < today.getTime()) {
            classes.push('past-date');
        }

        if (dayOfWeek === 0) {
            classes.push('weekend');
        } else if (dayOfWeek === 6) {
            classes.push('saturday');
        }

        // 해당 날짜의 일정 가져오기
        const daySchedules = schedules.filter(s => s.date === dateStr);

        // 연속 일정을 상단에 정렬 (연속 일정 여부 -> groupId 순)
        daySchedules.sort((a, b) => {
            const aDayDiff = Math.ceil((new Date(a.endDate) - new Date(a.startDate)) / (1000 * 60 * 60 * 24));
            const bDayDiff = Math.ceil((new Date(b.endDate) - new Date(b.startDate)) / (1000 * 60 * 60 * 24));
            const aIsMultiDay = aDayDiff >= 1;
            const bIsMultiDay = bDayDiff >= 1;

            // 연속 일정을 먼저
            if (aIsMultiDay && !bIsMultiDay) return -1;
            if (!aIsMultiDay && bIsMultiDay) return 1;

            // 같은 타입이면 groupId로 정렬 (같은 연속 일정끼리 붙어있도록)
            if (aIsMultiDay && bIsMultiDay) {
                return a.groupId.localeCompare(b.groupId);
            }

            return 0;
        });

        // 내 일정이 있는지 확인
        const hasMySchedule = daySchedules.some(s => s.participants.includes(currentUser));
        if (hasMySchedule) {
            classes.push('has-my-schedule');
        }

        // 일정 HTML 생성
        let schedulesHTML = '';
        const maxDisplay = 3; // 최대 표시 개수

        daySchedules.slice(0, maxDisplay).forEach(schedule => {
            const isMySchedule = schedule.participants.includes(currentUser);
            let scheduleClasses = [schedule.type];
            if (isMySchedule) {
                scheduleClasses.push('my-schedule');
            }

            // 연속 일정인지 확인 (2일 이상인 일정)
            const startDateObj = new Date(schedule.startDate);
            const endDateObj = new Date(schedule.endDate);
            const dayDiff = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
            const isMultiDay = dayDiff >= 1; // 2일 이상인 일정

            if (isMultiDay) {
                // 시작일, 중간일, 종료일 구분
                if (dateStr === schedule.startDate) {
                    scheduleClasses.push('multi-day-start');
                } else if (dateStr === schedule.endDate) {
                    scheduleClasses.push('multi-day-end');
                } else {
                    scheduleClasses.push('multi-day-middle');
                }
            } else {
                scheduleClasses.push('single-day');
            }

            schedulesHTML += `<div class="schedule-item ${scheduleClasses.join(' ')}" data-schedule-id="${schedule.id}" data-group-id="${schedule.groupId}">${schedule.title}</div>`;
        });

        if (daySchedules.length > maxDisplay) {
            schedulesHTML += `<div class="more-schedules">+${daySchedules.length - maxDisplay}개 더보기</div>`;
        }

        return `
            <div class="${classes.join(' ')}" data-date="${dateStr}">
                <div class="cell-header">
                    <div class="cell-date">${day}</div>
                </div>
                <div class="schedule-list">
                    ${schedulesHTML}
                </div>
            </div>
        `;
    }

    // 날짜 포맷 함수
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 일정 유형 한글 변환
    function getTypeText(type) {
        const typeMap = {
            'leave': '연차/휴가',
            'business': '업무 일정',
            'etc': '기타'
        };
        return typeMap[type] || type;
    }

    // 일정 클릭 이벤트 연결
    function attachScheduleClickEvents() {
        const scheduleItems = document.querySelectorAll('.schedule-item[data-schedule-id]');
        scheduleItems.forEach(item => {
            // 클릭 이벤트
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                const scheduleId = parseInt(this.getAttribute('data-schedule-id'));
                const groupId = this.getAttribute('data-group-id');
                openScheduleModal(scheduleId, groupId);
            });

            // Hover 이벤트 - 같은 그룹 하이라이트
            item.addEventListener('mouseenter', function() {
                const groupId = this.getAttribute('data-group-id');
                const sameGroupItems = document.querySelectorAll(`[data-group-id="${groupId}"]`);
                sameGroupItems.forEach(groupItem => {
                    groupItem.classList.add('group-hover');
                });
            });

            item.addEventListener('mouseleave', function() {
                const groupId = this.getAttribute('data-group-id');
                const sameGroupItems = document.querySelectorAll(`[data-group-id="${groupId}"]`);
                sameGroupItems.forEach(groupItem => {
                    groupItem.classList.remove('group-hover');
                });
            });
        });
    }

    // 일정 상세 모달 열기
    function openScheduleModal(scheduleId, groupId) {
        const schedule = schedules.find(s => s.id === scheduleId);
        if (!schedule) return;

        // 현재 일정 저장 (수정/삭제를 위해)
        currentEditingSchedule = schedule;

        // 모달 요소
        const modal = document.getElementById('scheduleDetailModal');

        // 날짜 표시 (연속 일정인지 확인)
        let dateDisplay = schedule.date;
        const startDateObj = new Date(schedule.startDate);
        const endDateObj = new Date(schedule.endDate);
        const dayDiff = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
        if (dayDiff >= 1) {
            dateDisplay = `${schedule.startDate} ~ ${schedule.endDate}`;
        }

        // 알림 상태 표시
        let notificationText = '꺼짐';
        if (schedule.notification !== false) {
            const timeMap = {
                10: '10분 전',
                30: '30분 전',
                60: '1시간 전'
            };
            const timeText = timeMap[schedule.notificationTime] || '10분 전';
            notificationText = `켜짐 (${timeText})`;
        }

        // 모달 데이터 설정
        document.getElementById('modalTitle').textContent = schedule.title;
        document.getElementById('modalType').textContent = getTypeText(schedule.type);
        document.getElementById('modalDate').textContent = dateDisplay;
        document.getElementById('modalTime').textContent = schedule.time;
        document.getElementById('modalLocation').textContent = schedule.location;
        document.getElementById('modalCreator').textContent = schedule.creator;
        document.getElementById('modalParticipants').textContent = schedule.participants.join(', ');
        document.getElementById('modalCreatedAt').textContent = schedule.createdAt;
        document.getElementById('modalDescription').textContent = schedule.description;
        document.getElementById('modalNotification').textContent = notificationText;

        // 모달 표시
        modal.classList.add('show');
    }

    // 모달 닫기 함수
    function closeScheduleModal() {
        const modal = document.getElementById('scheduleDetailModal');
        modal.classList.remove('show');
    }

    // 모달 닫기 이벤트
    document.getElementById('closeModal').addEventListener('click', closeScheduleModal);
    document.getElementById('closeModalBtn').addEventListener('click', closeScheduleModal);

    // 모달 배경 클릭 시 닫기
    document.getElementById('scheduleDetailModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeScheduleModal();
        }
    });

    // 일정 수정 버튼 클릭
    document.getElementById('editScheduleBtn').addEventListener('click', function() {
        if (!currentEditingSchedule) return;

        // 상세 모달 닫기
        closeScheduleModal();

        // 추가 모달 열기 (수정 모드)
        openEditScheduleModal(currentEditingSchedule);
    });

    // 일정 삭제 버튼 클릭
    document.getElementById('deleteScheduleBtn').addEventListener('click', function() {
        if (!currentEditingSchedule) return;

        if (confirm('이 일정을 삭제하시겠습니까?')) {
            // 같은 그룹의 모든 일정 삭제
            const groupId = currentEditingSchedule.groupId;
            for (let i = schedules.length - 1; i >= 0; i--) {
                if (schedules[i].groupId === groupId) {
                    schedules.splice(i, 1);
                }
            }

            // 달력 다시 렌더링
            renderCalendar();

            // 모달 닫기
            closeScheduleModal();

            showAlert('일정이 삭제되었습니다.', 'success');
        }
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeScheduleModal();
            closeAddScheduleModal();
            closeYearMonthSelectorModal();
        }
    });

    // 일정 추가 모달 관련 변수
    let selectedParticipants = [];
    let notificationEnabled = false; // 기본값: 알림 꺼짐
    let notificationTime = 10; // 기본값: 10분 전
    let currentEditingSchedule = null; // 현재 수정 중인 일정

    // 알림 토글 버튼 이벤트
    const notificationToggleBtn = document.getElementById('notificationToggleBtn');
    const notificationTimeButtons = document.getElementById('notificationTimeButtons');

    notificationToggleBtn.addEventListener('click', function() {
        notificationEnabled = !notificationEnabled;
        updateNotificationButton();
    });

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
    const notificationTimeBtns = document.querySelectorAll('.notification-time-btn');

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

    // 상세 설정 토글 체크박스 이벤트
    const enableDetailSettings = document.getElementById('enableDetailSettings');
    const detailSettingsSection = document.getElementById('detailSettingsSection');

    enableDetailSettings.addEventListener('change', function() {
        if (this.checked) {
            detailSettingsSection.style.display = 'block';
        } else {
            detailSettingsSection.style.display = 'none';
        }
    });

    // 반복 설정 select 이벤트
    const recurringTypeSelect = document.getElementById('recurringType');
    const recurringEndDateGroup = document.getElementById('recurringEndDateGroup');

    recurringTypeSelect.addEventListener('change', function() {
        if (this.value !== 'none') {
            recurringEndDateGroup.style.display = 'block';
        } else {
            recurringEndDateGroup.style.display = 'none';
        }
    });

    // 날짜 셀 클릭 이벤트 연결
    function attachDateCellClickEvents() {
        const calendarCells = document.querySelectorAll('.calendar-cell');
        calendarCells.forEach(cell => {
            // 클릭 이벤트 (드래그가 아닌 경우만)
            cell.addEventListener('click', function(e) {
                // 일정 아이템 클릭은 제외
                if (e.target.closest('.schedule-item')) return;

                // 드래그 후 클릭은 무시
                if (selectedCells.length > 0) return;

                const dateStr = this.getAttribute('data-date');
                openAddScheduleModal(dateStr);
            });

            // 마우스 다운 이벤트 (드래그 시작)
            cell.addEventListener('mousedown', function(e) {
                // 일정 아이템 클릭은 제외
                if (e.target.closest('.schedule-item')) return;

                // 다른 달의 날짜는 드래그 불가
                if (this.classList.contains('other-month')) return;

                e.preventDefault();
                isDragging = true;
                dragStartDate = this.getAttribute('data-date');
                selectedCells = [this];
                this.classList.add('drag-selecting');
            });

            // 마우스 엔터 이벤트 (드래그 중)
            cell.addEventListener('mouseenter', function(e) {
                if (!isDragging) return;

                // 다른 달의 날짜는 드래그 불가
                if (this.classList.contains('other-month')) return;

                dragEndDate = this.getAttribute('data-date');
                updateDragSelection();
            });
        });

        // 마우스 업 이벤트 (드래그 종료)
        document.addEventListener('mouseup', function(e) {
            if (!isDragging) return;

            isDragging = false;

            // 선택된 셀이 있으면 모달 열기
            if (selectedCells.length > 0) {
                const dates = selectedCells.map(cell => cell.getAttribute('data-date')).sort();
                const startDate = dates[0];
                const endDate = dates[dates.length - 1];

                // 선택 효과 제거
                clearDragSelection();

                // 일정 추가 모달 열기 (시작일과 종료일 설정)
                openAddScheduleModalWithRange(startDate, endDate);
            }

            dragStartDate = null;
            dragEndDate = null;
        });
    }

    // 드래그 선택 업데이트
    function updateDragSelection() {
        // 모든 선택 효과 제거
        document.querySelectorAll('.calendar-cell').forEach(cell => {
            cell.classList.remove('drag-selecting', 'drag-selected');
        });

        if (!dragStartDate || !dragEndDate) return;

        const start = new Date(dragStartDate);
        const end = new Date(dragEndDate);

        // 시작일과 종료일 정렬
        const [minDate, maxDate] = start <= end ? [start, end] : [end, start];

        // 범위 내의 모든 셀 선택
        selectedCells = [];
        document.querySelectorAll('.calendar-cell:not(.other-month)').forEach(cell => {
            const cellDate = new Date(cell.getAttribute('data-date'));
            if (cellDate >= minDate && cellDate <= maxDate) {
                cell.classList.add('drag-selecting');
                selectedCells.push(cell);
            }
        });
    }

    // 드래그 선택 효과 제거
    function clearDragSelection() {
        document.querySelectorAll('.calendar-cell').forEach(cell => {
            cell.classList.remove('drag-selecting', 'drag-selected');
        });
        selectedCells = [];
    }

    // 날짜 범위로 일정 추가 모달 열기
    function openAddScheduleModalWithRange(startDate, endDate) {
        const modal = document.getElementById('addScheduleModal');
        currentEditingSchedule = null; // 수정 모드 아님

        // 폼 초기화
        document.getElementById('addScheduleForm').reset();
        document.getElementById('scheduleStartDate').value = startDate;
        document.getElementById('scheduleEndDate').value = endDate;

        // 알림 버튼 초기화 (기본: 꺼짐)
        notificationEnabled = false;
        notificationTime = 10;
        updateNotificationButton();

        // 알림 시간 버튼 초기화
        notificationTimeBtns.forEach(b => b.classList.remove('active'));
        notificationTimeBtns[0].classList.add('active'); // 첫 번째 버튼(10분) 활성화

        // 상세 설정 토글 초기화
        enableDetailSettings.checked = false;
        detailSettingsSection.style.display = 'none';

        // 반복 설정 초기화
        recurringTypeSelect.value = 'none';
        recurringEndDateGroup.style.display = 'none';

        // 참여자 목록 초기화
        selectedParticipants = [currentUser]; // 생성자는 기본 참여자
        renderParticipantsList();

        // 모달 타이틀 변경
        document.querySelector('#addScheduleModal .modal-title').textContent = '일정 추가';
        document.getElementById('saveScheduleBtn').innerHTML = '<i class="fas fa-check"></i> 저장';

        // 모달 표시
        modal.classList.add('show');
    }

    // 일정 추가 버튼 클릭
    document.getElementById('addScheduleBtn').addEventListener('click', function() {
        const today = new Date();
        const dateStr = formatDate(today);
        openAddScheduleModal(dateStr);
    });

    // 일정 추가 모달 열기
    function openAddScheduleModal(dateStr) {
        const modal = document.getElementById('addScheduleModal');
        currentEditingSchedule = null; // 수정 모드 아님

        // 폼 초기화
        document.getElementById('addScheduleForm').reset();
        document.getElementById('scheduleStartDate').value = dateStr;
        document.getElementById('scheduleEndDate').value = dateStr;

        // 알림 버튼 초기화 (기본: 꺼짐)
        notificationEnabled = false;
        notificationTime = 10;
        updateNotificationButton();

        // 알림 시간 버튼 초기화
        notificationTimeBtns.forEach(b => b.classList.remove('active'));
        notificationTimeBtns[0].classList.add('active'); // 첫 번째 버튼(10분) 활성화

        // 상세 설정 토글 초기화
        enableDetailSettings.checked = false;
        detailSettingsSection.style.display = 'none';

        // 반복 설정 초기화
        recurringTypeSelect.value = 'none';
        recurringEndDateGroup.style.display = 'none';

        // 참여자 목록 초기화
        selectedParticipants = [currentUser]; // 생성자는 기본 참여자
        renderParticipantsList();

        // 모달 타이틀 변경
        document.querySelector('#addScheduleModal .modal-title').textContent = '일정 추가';
        document.getElementById('saveScheduleBtn').innerHTML = '<i class="fas fa-check"></i> 저장';

        // 모달 표시
        modal.classList.add('show');
    }

    // 일정 수정 모달 열기
    function openEditScheduleModal(schedule) {
        const modal = document.getElementById('addScheduleModal');

        // 폼에 기존 데이터 설정
        document.getElementById('scheduleTitle').value = schedule.title;
        document.getElementById('scheduleType').value = schedule.type;
        document.getElementById('scheduleStartDate').value = schedule.startDate;
        document.getElementById('scheduleEndDate').value = schedule.endDate;
        document.getElementById('scheduleDescription').value = schedule.description || '';

        // 알림 상태 설정
        notificationEnabled = schedule.notification !== false;
        notificationTime = schedule.notificationTime || 10;
        updateNotificationButton();

        // 알림 시간 버튼 설정
        notificationTimeBtns.forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.getAttribute('data-time')) === notificationTime) {
                btn.classList.add('active');
            }
        });

        // 장소와 시간이 있으면 상세 설정 열기
        const hasDetails = schedule.location && schedule.location !== '-';
        const hasTime = schedule.time && schedule.time !== '종일';

        if (hasDetails || hasTime || schedule.isRecurring) {
            enableDetailSettings.checked = true;
            detailSettingsSection.style.display = 'block';

            // 장소 설정
            if (hasDetails) {
                document.getElementById('scheduleLocation').value = schedule.location;
            }

            // 시간 설정
            if (hasTime) {
                const timeMatch = schedule.time.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
                if (timeMatch) {
                    document.getElementById('scheduleStartTime').value = timeMatch[1];
                    document.getElementById('scheduleEndTime').value = timeMatch[2];
                }
            }

            // 반복 설정
            if (schedule.isRecurring && schedule.recurringType) {
                recurringTypeSelect.value = schedule.recurringType;
                recurringEndDateGroup.style.display = 'block';
            }
        } else {
            enableDetailSettings.checked = false;
            detailSettingsSection.style.display = 'none';
        }

        // 참여자 목록 설정
        selectedParticipants = [...schedule.participants];
        renderParticipantsList();

        // 모달 타이틀 변경
        document.querySelector('#addScheduleModal .modal-title').textContent = '일정 수정';
        document.getElementById('saveScheduleBtn').innerHTML = '<i class="fas fa-check"></i> 수정';

        // 모달 표시
        modal.classList.add('show');
    }

    // 일정 추가 모달 닫기
    function closeAddScheduleModal() {
        const modal = document.getElementById('addScheduleModal');
        modal.classList.remove('show');
        selectedParticipants = [];
    }

    // 참여자 추가 버튼
    document.getElementById('addParticipantBtn').addEventListener('click', function() {
        const input = document.getElementById('participantInput');
        const name = input.value.trim();

        if (name && !selectedParticipants.includes(name)) {
            selectedParticipants.push(name);
            renderParticipantsList();
            input.value = '';
        }
    });

    // 참여자 입력란에서 엔터키 처리
    document.getElementById('participantInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('addParticipantBtn').click();
        }
    });

    // 참여자 목록 렌더링
    function renderParticipantsList() {
        const listContainer = document.getElementById('participantsList');
        listContainer.innerHTML = '';

        selectedParticipants.forEach(name => {
            const tag = document.createElement('div');
            tag.className = 'participant-tag';
            tag.innerHTML = `
                ${name}
                ${name !== currentUser ? `<button type="button" class="participant-remove" data-name="${name}">×</button>` : ''}
            `;
            listContainer.appendChild(tag);
        });

        // 삭제 버튼 이벤트
        listContainer.querySelectorAll('.participant-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                const name = this.getAttribute('data-name');
                selectedParticipants = selectedParticipants.filter(p => p !== name);
                renderParticipantsList();
            });
        });
    }

    // 일정 저장 버튼
    document.getElementById('saveScheduleBtn').addEventListener('click', function() {
        const form = document.getElementById('addScheduleForm');

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // 수정 모드인 경우
        if (currentEditingSchedule) {
            updateSchedule();
            return;
        }

        const title = document.getElementById('scheduleTitle').value;
        const type = document.getElementById('scheduleType').value;
        const startDate = document.getElementById('scheduleStartDate').value;
        const endDate = document.getElementById('scheduleEndDate').value;
        const location = document.getElementById('scheduleLocation').value || '-';
        const description = document.getElementById('scheduleDescription').value || '-';
        const recurringType = recurringTypeSelect.value;
        const recurringEndDate = document.getElementById('recurringEndDate').value;

        // 날짜 유효성 검사
        if (new Date(endDate) < new Date(startDate)) {
            showAlert('종료 날짜는 시작 날짜보다 이전일 수 없습니다.', 'warning');
            return;
        }

        // 반복 종료일 유효성 검사
        if (recurringType !== 'none' && recurringEndDate) {
            if (new Date(recurringEndDate) < new Date(startDate)) {
                showAlert('반복 종료일은 시작 날짜보다 이전일 수 없습니다.', 'warning');
                return;
            }
        }

        // 시간 포맷 (상세 설정이 체크된 경우만)
        let timeStr = '종일';
        if (enableDetailSettings.checked) {
            const startTime = document.getElementById('scheduleStartTime').value;
            const endTime = document.getElementById('scheduleEndTime').value;
            if (startTime && endTime) {
                timeStr = `${startTime} - ${endTime}`;
            } else if (startTime) {
                timeStr = `${startTime}부터`;
            }
        }

        // 현재 시간
        const now = new Date();
        const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // 날짜 범위에 대한 일정 생성
        const start = new Date(startDate);
        const end = new Date(endDate);
        const scheduleId = schedules.length + 1;

        // 연속 일정 그룹 ID 생성
        const groupId = `schedule-group-${scheduleId}`;

        // 반복 종료일 설정 (기본값: 1년 후)
        let finalEndDate = end;
        if (recurringType !== 'none') {
            if (recurringEndDate) {
                finalEndDate = new Date(recurringEndDate);
            } else {
                finalEndDate = new Date(start);
                finalEndDate.setFullYear(finalEndDate.getFullYear() + 1);
            }
        }

        const currentLoopDate = new Date(start);

        while (currentLoopDate <= finalEndDate) {
            const dateStr = formatDate(currentLoopDate);

            // 새 일정 객체
            const newSchedule = {
                id: scheduleId,
                date: dateStr,
                type: type,
                title: title,
                participants: [...selectedParticipants],
                creator: currentUser,
                time: timeStr,
                location: location,
                description: description,
                createdAt: createdAt,
                startDate: startDate,
                endDate: endDate,
                groupId: groupId,
                isRecurring: recurringType !== 'none',
                recurringType: recurringType,
                notification: notificationEnabled,
                notificationTime: notificationTime
            };

            // 일정 배열에 추가
            schedules.push(newSchedule);

            // 다음 날짜로 이동 (반복 타입에 따라)
            if (recurringType === 'none') {
                // 반복 없음: 시작일~종료일 범위만
                currentLoopDate.setDate(currentLoopDate.getDate() + 1);
                if (currentLoopDate > end) break;
            } else if (recurringType === 'daily') {
                // 매일: 하루씩 증가
                currentLoopDate.setDate(currentLoopDate.getDate() + 1);
            } else if (recurringType === 'weekly') {
                // 매주: 7일씩 증가
                currentLoopDate.setDate(currentLoopDate.getDate() + 7);
            } else if (recurringType === 'monthly') {
                // 매월: 한 달씩 증가
                currentLoopDate.setMonth(currentLoopDate.getMonth() + 1);
            } else if (recurringType === 'yearly') {
                // 매년: 1년씩 증가
                currentLoopDate.setFullYear(currentLoopDate.getFullYear() + 1);
            }
        }

        // 달력 다시 렌더링
        renderCalendar();

        // 모달 닫기
        closeAddScheduleModal();

        showAlert('일정이 성공적으로 추가되었습니다.', 'success');
    });

    // 모달 닫기 이벤트
    document.getElementById('closeAddModal').addEventListener('click', closeAddScheduleModal);
    document.getElementById('cancelAddBtn').addEventListener('click', closeAddScheduleModal);

    // 모달 배경 클릭 시 닫기
    document.getElementById('addScheduleModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeAddScheduleModal();
        }
    });

    // 연/월 선택 모달 관련 변수
    let selectedYear = null;
    let selectedMonth = null;

    // 연/월 선택 모달 열기
    function openYearMonthSelectorModal() {
        const modal = document.getElementById('yearMonthSelectorModal');
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        const today = new Date();
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth();

        // 선택 초기화
        selectedYear = currentYear;
        selectedMonth = currentMonth;

        // 연도 선택기 생성 (현재 연도 ±5년)
        const yearSelector = document.getElementById('yearSelector');
        yearSelector.innerHTML = '';
        for (let i = currentYear - 5; i <= currentYear + 5; i++) {
            const yearItem = document.createElement('div');
            yearItem.className = 'year-item';
            if (i === currentYear) yearItem.classList.add('selected');
            if (i === todayYear) yearItem.classList.add('current');
            yearItem.textContent = `${i}년`;
            yearItem.dataset.year = i;
            yearItem.addEventListener('click', function() {
                selectedYear = parseInt(this.dataset.year);
                document.querySelectorAll('.year-item').forEach(item => {
                    item.classList.remove('selected');
                });
                this.classList.add('selected');
            });
            yearSelector.appendChild(yearItem);
        }

        // 월 선택기 생성
        const monthSelector = document.getElementById('monthSelector');
        monthSelector.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            const monthItem = document.createElement('div');
            monthItem.className = 'month-item';
            if (i === currentMonth) monthItem.classList.add('selected');
            if (i === todayMonth && currentYear === todayYear) monthItem.classList.add('current');
            monthItem.textContent = `${i + 1}월`;
            monthItem.dataset.month = i;
            monthItem.addEventListener('click', function() {
                selectedMonth = parseInt(this.dataset.month);
                document.querySelectorAll('.month-item').forEach(item => {
                    item.classList.remove('selected');
                });
                this.classList.add('selected');
            });
            monthSelector.appendChild(monthItem);
        }

        // 모달 표시
        modal.classList.add('show');
    }

    // 연/월 선택 모달 닫기
    function closeYearMonthSelectorModal() {
        const modal = document.getElementById('yearMonthSelectorModal');
        modal.classList.remove('show');
    }

    // 연/월 선택 확인 버튼
    document.getElementById('confirmYearMonthBtn').addEventListener('click', function() {
        if (selectedYear !== null && selectedMonth !== null) {
            currentDate = new Date(selectedYear, selectedMonth, 1);
            renderCalendar();
            closeYearMonthSelectorModal();
        }
    });

    // 연/월 선택 모달 닫기 이벤트
    document.getElementById('closeYearMonthModal').addEventListener('click', closeYearMonthSelectorModal);
    document.getElementById('cancelYearMonthBtn').addEventListener('click', closeYearMonthSelectorModal);

    // 연/월 선택 모달 배경 클릭 시 닫기
    document.getElementById('yearMonthSelectorModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeYearMonthSelectorModal();
        }
    });

    // 일정 수정 함수
    function updateSchedule() {
        const title = document.getElementById('scheduleTitle').value;
        const type = document.getElementById('scheduleType').value;
        const startDate = document.getElementById('scheduleStartDate').value;
        const endDate = document.getElementById('scheduleEndDate').value;
        const location = document.getElementById('scheduleLocation').value || '-';
        const description = document.getElementById('scheduleDescription').value || '-';
        const recurringType = recurringTypeSelect.value;

        // 날짜 유효성 검사
        if (new Date(endDate) < new Date(startDate)) {
            showAlert('종료 날짜는 시작 날짜보다 이전일 수 없습니다.', 'warning');
            return;
        }

        // 시간 포맷 (상세 설정이 체크된 경우만)
        let timeStr = '종일';
        if (enableDetailSettings.checked) {
            const startTime = document.getElementById('scheduleStartTime').value;
            const endTime = document.getElementById('scheduleEndTime').value;
            if (startTime && endTime) {
                timeStr = `${startTime} - ${endTime}`;
            } else if (startTime) {
                timeStr = `${startTime}부터`;
            }
        }

        // 같은 그룹의 모든 일정 업데이트
        const groupId = currentEditingSchedule.groupId;
        schedules.forEach(schedule => {
            if (schedule.groupId === groupId) {
                schedule.title = title;
                schedule.type = type;
                schedule.time = timeStr;
                schedule.location = location;
                schedule.description = description;
                schedule.participants = [...selectedParticipants];
                schedule.notification = notificationEnabled;
                schedule.notificationTime = notificationTime;
                schedule.isRecurring = recurringType !== 'none';
                schedule.recurringType = recurringType;
            }
        });

        // 달력 다시 렌더링
        renderCalendar();

        // 모달 닫기
        closeAddScheduleModal();

        showAlert('일정이 수정되었습니다.', 'success');
    }

    // 알림 메시지 표시 함수
    function showAlert(message, type = 'info') {
        alert(message);
    }

    // 페이지 로드 시 달력 렌더링
    renderCalendar();

    // 알림 버튼 초기 상태 설정
    updateNotificationButton();

    // 현재 페이지에 맞는 메뉴 활성화
    const currentPath = window.location.pathname;
    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(item => {
        const link = item.querySelector('a');
        if (link && link.getAttribute('href') === currentPath) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // ===== 뷰 전환 버튼 기능 =====
    const viewButtons = document.querySelectorAll('.view-btn');
    let currentView = 'month'; // 기본값: 월간 뷰

    viewButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.getAttribute('data-view');

            // 버튼 활성화 상태 변경
            viewButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // 뷰 변경
            currentView = view;

            // 뷰에 맞는 캘린더 렌더링
            switch(view) {
                case 'day':
                    console.log('일간 뷰로 전환');
                    document.getElementById('monthView').style.display = 'none';
                    document.getElementById('weekView').style.display = 'none';
                    document.getElementById('dayView').style.display = 'flex';
                    renderDayView();
                    break;
                case 'week':
                    console.log('주간 뷰로 전환');
                    document.getElementById('monthView').style.display = 'none';
                    document.getElementById('weekView').style.display = 'flex';
                    document.getElementById('dayView').style.display = 'none';
                    renderWeekView();
                    break;
                case 'month':
                    console.log('월간 뷰로 전환');
                    document.getElementById('monthView').style.display = 'flex';
                    document.getElementById('weekView').style.display = 'none';
                    document.getElementById('dayView').style.display = 'none';
                    renderCalendar();
                    break;
            }
        });
    });

    // ===== 팀별 필터 체크박스 기능 =====
    const teamCheckboxes = document.querySelectorAll('.team-checkbox');
    const typeCheckboxes = document.querySelectorAll('.type-checkbox');
    const selectAllTeamsCheckbox = document.getElementById('selectAllTeams');
    const selectAllTypesCheckbox = document.getElementById('selectAllTypes');

    // 팀별 일정 - 전체 선택/해제
    if (selectAllTeamsCheckbox) {
        selectAllTeamsCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            teamCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            filterSchedules();
        });
    }

    // 개별 팀 체크박스 변경 시
    teamCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            // 모든 개별 체크박스가 체크되면 전체도 체크
            const allChecked = Array.from(teamCheckboxes).every(cb => cb.checked);
            const noneChecked = Array.from(teamCheckboxes).every(cb => !cb.checked);

            if (selectAllTeamsCheckbox) {
                if (allChecked) {
                    selectAllTeamsCheckbox.checked = true;
                    selectAllTeamsCheckbox.indeterminate = false;
                } else if (noneChecked) {
                    selectAllTeamsCheckbox.checked = false;
                    selectAllTeamsCheckbox.indeterminate = false;
                } else {
                    selectAllTeamsCheckbox.indeterminate = true;
                }
            }

            filterSchedules();
        });
    });

    // 일정 유형 - 전체 선택/해제
    if (selectAllTypesCheckbox) {
        selectAllTypesCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            typeCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            filterSchedules();
        });
    }

    // 개별 유형 체크박스 변경 시
    typeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            // 모든 개별 체크박스가 체크되면 전체도 체크
            const allChecked = Array.from(typeCheckboxes).every(cb => cb.checked);
            const noneChecked = Array.from(typeCheckboxes).every(cb => !cb.checked);

            if (selectAllTypesCheckbox) {
                if (allChecked) {
                    selectAllTypesCheckbox.checked = true;
                    selectAllTypesCheckbox.indeterminate = false;
                } else if (noneChecked) {
                    selectAllTypesCheckbox.checked = false;
                    selectAllTypesCheckbox.indeterminate = false;
                } else {
                    selectAllTypesCheckbox.indeterminate = true;
                }
            }

            filterSchedules();
        });
    });

    // 필터링 함수
    function filterSchedules() {
        // 선택된 팀 목록
        const selectedTeams = Array.from(teamCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        // 선택된 유형 목록
        const selectedTypes = Array.from(typeCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        console.log('선택된 팀:', selectedTeams);
        console.log('선택된 유형:', selectedTypes);

        // TODO: 필터링된 일정만 표시
        // 실제로는 schedules 배열을 필터링하여 다시 렌더링해야 함
        renderCalendar();
    }

    // 팀별 일정 개수 업데이트 함수 (TODO: 실제 데이터와 연동)
    function updateTeamCounts() {
        const teamCounts = {
            dev: 5,
            design: 3,
            marketing: 2,
            sales: 4,
            hr: 1
        };

        document.querySelectorAll('.team-filter-item').forEach(item => {
            const checkbox = item.querySelector('.team-checkbox');
            const countSpan = item.querySelector('.team-count');
            if (checkbox && countSpan) {
                const team = checkbox.value;
                if (teamCounts[team] !== undefined) {
                    countSpan.textContent = `(${teamCounts[team]})`;
                }
            }
        });
    }

    // 초기 개수 업데이트
    updateTeamCounts();

    // ===== 주간 뷰 렌더링 함수 =====
    function renderWeekView() {
        const weekDaysContainer = document.getElementById('weekDays');
        const weekGridContainer = document.getElementById('weekGrid');
        const weekEventsContainer = document.getElementById('weekEvents');

        // 현재 주의 시작일 (일요일) 구하기
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - day);

        // 오늘 버튼 표시/숨김 처리
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        const isCurrentWeek = (today >= startOfWeek && today <= endOfWeek);
        if (isCurrentWeek) {
            todayBtn.classList.remove('show');
        } else {
            todayBtn.classList.add('show');
        }

        // 주간 헤더 생성 (7일)
        let headerHTML = '';
        const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(dayDate.getDate() + i);
            const isToday = dayDate.getTime() === today.getTime();
            const dateStr = dayDate.getDate();

            headerHTML += `
                <div class="week-day-header ${isToday ? 'today' : ''}" data-date="${formatDate(dayDate)}">
                    <div class="day-name">${weekDays[i]}</div>
                    <div class="day-date">${dateStr}</div>
                </div>
            `;
        }
        weekDaysContainer.innerHTML = headerHTML;

        // 시간 그리드 생성 (7일 × 24시간)
        let gridHTML = '';
        for (let hour = 0; hour < 24; hour++) {
            for (let day = 0; day < 7; day++) {
                const dayDate = new Date(startOfWeek);
                dayDate.setDate(dayDate.getDate() + day);
                gridHTML += `<div class="grid-cell" data-date="${formatDate(dayDate)}" data-hour="${hour}"></div>`;
            }
        }
        weekGridContainer.innerHTML = gridHTML;

        // 이벤트 렌더링
        let eventsHTML = '';
        for (let day = 0; day < 7; day++) {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(dayDate.getDate() + day);
            const dateStr = formatDate(dayDate);

            // 해당 날짜의 일정 필터링
            const daySchedules = schedules.filter(s => s.date === dateStr);

            daySchedules.forEach(schedule => {
                const position = calculateEventPosition(schedule, day);
                if (position) {
                    const typeClass = schedule.type;
                    eventsHTML += `
                        <div class="week-event ${typeClass}"
                             style="left: ${position.left}%; width: ${position.width}%; top: ${position.top}px; height: ${position.height}px;"
                             data-schedule-id="${schedule.id}"
                             data-group-id="${schedule.groupId}">
                            <div class="event-time">${schedule.time}</div>
                            <div class="event-title">${schedule.title}</div>
                        </div>
                    `;
                }
            });
        }
        weekEventsContainer.innerHTML = eventsHTML;

        // 이벤트 클릭 핸들러 연결
        attachWeekEventHandlers();

        // 현재 시간 표시선 업데이트
        updateCurrentTimeLine('week');

        // 현재 시간으로 스크롤
        scrollToCurrentTime('week');
    }

    // ===== 일간 뷰 렌더링 함수 =====
    function renderDayView() {
        const dayHeaderContainer = document.getElementById('dayTitle');
        const dayGridContainer = document.getElementById('dayGrid');
        const dayEventsContainer = document.getElementById('dayEvents');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isToday = currentDate.getTime() === today.getTime();
        const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
        const dayOfWeek = currentDate.getDay();

        // 오늘 버튼 표시/숨김 처리
        if (isToday) {
            todayBtn.classList.remove('show');
        } else {
            todayBtn.classList.add('show');
        }

        // 일간 헤더 생성
        dayHeaderContainer.innerHTML = `
            <div class="day-header-info ${isToday ? 'today' : ''}">
                <div class="day-name">${weekDays[dayOfWeek]}</div>
                <div class="day-date">${currentDate.getDate()}</div>
            </div>
        `;

        // 시간 그리드 생성 (24시간)
        let gridHTML = '';
        for (let hour = 0; hour < 24; hour++) {
            gridHTML += `<div class="grid-cell" data-hour="${hour}"></div>`;
        }
        dayGridContainer.innerHTML = gridHTML;

        // 이벤트 렌더링
        const dateStr = formatDate(currentDate);
        const daySchedules = schedules.filter(s => s.date === dateStr);

        let eventsHTML = '';
        daySchedules.forEach(schedule => {
            const position = calculateEventPosition(schedule, 0, true);
            if (position) {
                const typeClass = schedule.type;
                eventsHTML += `
                    <div class="day-event ${typeClass}"
                         style="top: ${position.top}px; height: ${position.height}px;"
                         data-schedule-id="${schedule.id}"
                         data-group-id="${schedule.groupId}">
                        <div class="event-time">${schedule.time}</div>
                        <div class="event-title">${schedule.title}</div>
                    </div>
                `;
            }
        });
        dayEventsContainer.innerHTML = eventsHTML;

        // 이벤트 클릭 핸들러 연결
        attachDayEventHandlers();

        // 현재 시간 표시선 업데이트
        updateCurrentTimeLine('day');

        // 현재 시간으로 스크롤
        scrollToCurrentTime('day');
    }

    // ===== 이벤트 위치 계산 함수 =====
    function calculateEventPosition(schedule, dayIndex, isDayView = false) {
        // 종일 이벤트는 상단에 별도 표시 (현재는 skip)
        if (schedule.time === '종일') {
            return null;
        }

        // 시간 파싱 (예: "14:00 - 16:00")
        const timeMatch = schedule.time.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
        if (!timeMatch) {
            return null;
        }

        const startHour = parseInt(timeMatch[1]);
        const startMinute = parseInt(timeMatch[2]);
        const endHour = parseInt(timeMatch[3]);
        const endMinute = parseInt(timeMatch[4]);

        // 위치 계산 (1시간 = 40px)
        const top = startHour * 40 + (startMinute * 40 / 60);
        const endPosition = endHour * 40 + (endMinute * 40 / 60);
        const height = endPosition - top;

        // 주간 뷰의 경우 가로 위치 계산
        const left = isDayView ? 0 : (dayIndex * 100 / 7);
        const width = isDayView ? 100 : (100 / 7);

        return {
            top,
            height,
            left,
            width
        };
    }

    // ===== 현재 시간 표시선 업데이트 =====
    function updateCurrentTimeLine(view) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTop = currentHour * 40 + (currentMinute * 40 / 60);

        const timeLine = view === 'week'
            ? document.querySelector('#weekView .current-time-line')
            : document.querySelector('#dayView .current-time-line');

        if (timeLine) {
            // 오늘 날짜인 경우만 표시
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (view === 'week') {
                // 주간 뷰: 현재 주에 오늘이 포함되어 있는지 확인
                const startOfWeek = new Date(currentDate);
                const day = startOfWeek.getDay();
                startOfWeek.setDate(startOfWeek.getDate() - day);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(endOfWeek.getDate() + 6);

                if (today >= startOfWeek && today <= endOfWeek) {
                    timeLine.style.top = currentTop + 'px';
                    timeLine.style.display = 'block';
                } else {
                    timeLine.style.display = 'none';
                }
            } else {
                // 일간 뷰: 현재 날짜가 오늘인지 확인
                const viewDate = new Date(currentDate);
                viewDate.setHours(0, 0, 0, 0);

                if (viewDate.getTime() === today.getTime()) {
                    timeLine.style.top = currentTop + 'px';
                    timeLine.style.display = 'block';
                } else {
                    timeLine.style.display = 'none';
                }
            }
        }
    }

    // ===== 현재 시간으로 스크롤 =====
    function scrollToCurrentTime(view) {
        const now = new Date();
        const currentHour = now.getHours();

        // 현재 시간보다 1시간 앞으로 스크롤 (여유 공간 확보)
        const scrollTarget = Math.max(0, (currentHour - 1) * 40);

        const bodyWrapper = view === 'week'
            ? document.querySelector('.week-body-wrapper')
            : document.querySelector('.day-body-wrapper');

        if (bodyWrapper) {
            setTimeout(() => {
                bodyWrapper.scrollTop = scrollTarget;
            }, 100);
        }
    }

    // ===== 주간 뷰 이벤트 핸들러 =====
    function attachWeekEventHandlers() {
        const weekEvents = document.querySelectorAll('.week-event');
        weekEvents.forEach(event => {
            event.addEventListener('click', function(e) {
                e.stopPropagation();
                const scheduleId = parseInt(this.getAttribute('data-schedule-id'));
                const groupId = this.getAttribute('data-group-id');
                openScheduleModal(scheduleId, groupId);
            });

            // Hover 이벤트 - 같은 그룹 하이라이트
            event.addEventListener('mouseenter', function() {
                const groupId = this.getAttribute('data-group-id');
                const sameGroupItems = document.querySelectorAll(`[data-group-id="${groupId}"]`);
                sameGroupItems.forEach(groupItem => {
                    groupItem.classList.add('group-hover');
                });
            });

            event.addEventListener('mouseleave', function() {
                const groupId = this.getAttribute('data-group-id');
                const sameGroupItems = document.querySelectorAll(`[data-group-id="${groupId}"]`);
                sameGroupItems.forEach(groupItem => {
                    groupItem.classList.remove('group-hover');
                });
            });
        });
    }

    // ===== 일간 뷰 이벤트 핸들러 =====
    function attachDayEventHandlers() {
        const dayEvents = document.querySelectorAll('.day-event');
        dayEvents.forEach(event => {
            event.addEventListener('click', function(e) {
                e.stopPropagation();
                const scheduleId = parseInt(this.getAttribute('data-schedule-id'));
                const groupId = this.getAttribute('data-group-id');
                openScheduleModal(scheduleId, groupId);
            });

            // Hover 이벤트 - 같은 그룹 하이라이트
            event.addEventListener('mouseenter', function() {
                const groupId = this.getAttribute('data-group-id');
                const sameGroupItems = document.querySelectorAll(`[data-group-id="${groupId}"]`);
                sameGroupItems.forEach(groupItem => {
                    groupItem.classList.add('group-hover');
                });
            });

            event.addEventListener('mouseleave', function() {
                const groupId = this.getAttribute('data-group-id');
                const sameGroupItems = document.querySelectorAll(`[data-group-id="${groupId}"]`);
                sameGroupItems.forEach(groupItem => {
                    groupItem.classList.remove('group-hover');
                });
            });
        });
    }

    // 현재 시간 표시선 주기적 업데이트 (1분마다)
    setInterval(() => {
        if (currentView === 'week') {
            updateCurrentTimeLine('week');
        } else if (currentView === 'day') {
            updateCurrentTimeLine('day');
        }
    }, 60000); // 1분마다 업데이트
});
