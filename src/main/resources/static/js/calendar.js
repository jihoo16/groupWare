// 일정관리 페이지 스크립트
document.addEventListener('DOMContentLoaded', function() {
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthTitle = document.getElementById('currentMonthTitle');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');

    let currentDate = new Date();
    const currentUser = '사용자'; // 실제로는 로그인한 사용자 정보

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

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeScheduleModal();
            closeAddScheduleModal();
        }
    });

    // 일정 추가 모달 관련 변수
    let selectedParticipants = [];

    // 날짜 셀 클릭 이벤트 연결
    function attachDateCellClickEvents() {
        const calendarCells = document.querySelectorAll('.calendar-cell');
        calendarCells.forEach(cell => {
            cell.addEventListener('click', function(e) {
                // 일정 아이템 클릭은 제외
                if (e.target.closest('.schedule-item')) return;

                const dateStr = this.getAttribute('data-date');
                openAddScheduleModal(dateStr);
            });
        });
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

        // 폼 초기화
        document.getElementById('addScheduleForm').reset();
        document.getElementById('scheduleStartDate').value = dateStr;
        document.getElementById('scheduleEndDate').value = dateStr;

        // 참여자 목록 초기화
        selectedParticipants = [currentUser]; // 생성자는 기본 참여자
        renderParticipantsList();

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

        const title = document.getElementById('scheduleTitle').value;
        const type = document.getElementById('scheduleType').value;
        const startDate = document.getElementById('scheduleStartDate').value;
        const endDate = document.getElementById('scheduleEndDate').value;
        const startTime = document.getElementById('scheduleStartTime').value;
        const endTime = document.getElementById('scheduleEndTime').value;
        const location = document.getElementById('scheduleLocation').value || '-';
        const description = document.getElementById('scheduleDescription').value || '-';

        // 날짜 유효성 검사
        if (new Date(endDate) < new Date(startDate)) {
            showAlert('종료 날짜는 시작 날짜보다 이전일 수 없습니다.', 'warning');
            return;
        }

        // 시간 포맷
        let timeStr = '종일';
        if (startTime && endTime) {
            timeStr = `${startTime} - ${endTime}`;
        } else if (startTime) {
            timeStr = `${startTime}부터`;
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

        const currentLoopDate = new Date(start);

        while (currentLoopDate <= end) {
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
                groupId: groupId
            };

            // 일정 배열에 추가
            schedules.push(newSchedule);

            // 다음 날짜로 이동
            currentLoopDate.setDate(currentLoopDate.getDate() + 1);
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

    // 페이지 로드 시 달력 렌더링
    renderCalendar();

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
});
