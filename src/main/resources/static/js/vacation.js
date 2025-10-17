// 연차관리 페이지 스크립트
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('leaveModal');
    const openModalBtn = document.getElementById('openLeaveModal');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const leaveForm = document.getElementById('leaveForm');
    const leaveTypeRadios = document.querySelectorAll('input[name="leaveType"]');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const calculatedDaysSpan = document.getElementById('calculatedDays');
    const remainingDaysSpan = document.getElementById('remainingDays');
    const reasonTextarea = document.getElementById('reason');
    const calendarDays = document.getElementById('calendarDays');
    const currentMonthSpan = document.getElementById('currentMonth');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const warningMessage = document.getElementById('warningMessage');
    const submitBtn = document.getElementById('submitBtn');
    const modalContent = document.querySelector('#leaveModal .modal-content');
    const usedLeaveCard = document.getElementById('usedLeaveCard');
    const usedLeaveModal = document.getElementById('usedLeaveModal');
    const closeUsedModal = document.getElementById('closeUsedModal');
    const usedLeaveTableBody = document.getElementById('usedLeaveTableBody');

    // 현재 잔여 연차 (실제로는 서버에서 가져와야 함)
    const currentRemainingDays = 7;

    // 달력 상태
    let currentDate = new Date();
    let selectedStartDate = null;
    let selectedEndDate = null;
    let isSelectingRange = false;

    // 대한민국 공휴일 (2025년 기준)
    // 실제로는 서버에서 API로 가져오거나 공공데이터포털 API 사용 권장
    const publicHolidays = {
        '2025': [
            { date: '2025-01-01', name: '신정' },
            { date: '2025-01-28', name: '설날 연휴' },
            { date: '2025-01-29', name: '설날' },
            { date: '2025-01-30', name: '설날 연휴' },
            { date: '2025-03-01', name: '삼일절' },
            { date: '2025-03-03', name: '대체공휴일(삼일절)' },
            { date: '2025-05-05', name: '어린이날' },
            { date: '2025-05-06', name: '석가탄신일' },
            { date: '2025-06-06', name: '현충일' },
            { date: '2025-08-15', name: '광복절' },
            { date: '2025-10-03', name: '개천절' },
            { date: '2025-10-05', name: '추석 연휴' },
            { date: '2025-10-06', name: '추석' },
            { date: '2025-10-07', name: '추석 연휴' },
            { date: '2025-10-08', name: '대체공휴일(추석)' },
            { date: '2025-10-09', name: '한글날' },
            { date: '2025-12-25', name: '크리스마스' }
        ],
        '2026': [
            { date: '2026-01-01', name: '신정' },
            { date: '2026-02-16', name: '설날 연휴' },
            { date: '2026-02-17', name: '설날' },
            { date: '2026-02-18', name: '설날 연휴' },
            { date: '2026-03-01', name: '삼일절' },
            { date: '2026-05-05', name: '어린이날' },
            { date: '2026-05-24', name: '석가탄신일' },
            { date: '2026-06-06', name: '현충일' },
            { date: '2026-08-15', name: '광복절' },
            { date: '2026-09-24', name: '추석 연휴' },
            { date: '2026-09-25', name: '추석' },
            { date: '2026-09-26', name: '추석 연휴' },
            { date: '2026-10-03', name: '개천절' },
            { date: '2026-10-09', name: '한글날' },
            { date: '2026-12-25', name: '크리스마스' }
        ]
    };

    // 공휴일 확인 함수
    function isPublicHoliday(dateStr) {
        const year = dateStr.split('-')[0];
        const holidays = publicHolidays[year] || [];
        return holidays.find(h => h.date === dateStr);
    }

    // 연차 사용 내역 데이터 (실제로는 서버에서 가져와야 함)
    const leaveRecords = [
        { startDate: '2025-03-20', endDate: '2025-03-22', status: 'approved', type: 'full' },
        { startDate: '2025-03-12', endDate: '2025-03-12', status: 'approved', type: 'half-am' },
        { startDate: '2025-03-11', endDate: '2025-03-11', status: 'approved', type: 'full' },
        { startDate: '2025-03-06', endDate: '2025-03-06', status: 'approved', type: 'half-pm' },
        { startDate: '2025-02-25', endDate: '2025-02-27', status: 'approved', type: 'full' },
        { startDate: '2025-04-10', endDate: '2025-04-10', status: 'pending', type: 'full' }
    ];

    // 날짜가 연차 기간에 포함되는지 확인
    function getLeaveStatus(dateStr) {
        for (let record of leaveRecords) {
            const date = new Date(dateStr);
            const start = new Date(record.startDate);
            const end = new Date(record.endDate);

            if (date >= start && date <= end) {
                // 주말이나 공휴일은 제외
                const dayOfWeek = date.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) continue;
                if (isPublicHoliday(dateStr)) continue;

                return {
                    status: record.status,
                    type: record.type
                };
            }
        }
        return null;
    }

    // 모달 열기
    openModalBtn.addEventListener('click', function() {
        modal.classList.add('show');
        currentDate = new Date();
        selectedStartDate = null;
        selectedEndDate = null;
        isSelectingRange = false;
        // 기본 사유 설정 (연차가 기본 선택)
        reasonTextarea.value = '연차 사용';
        // 에러 상태 초기화
        warningMessage.style.display = 'none';
        modalContent.classList.remove('error');
        submitBtn.disabled = false;
        renderCalendar();
    });

    // 모달 닫기
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // 모달 배경 클릭 시 닫기
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    function closeModal() {
        modal.classList.remove('show');
        leaveForm.reset();
    }

    // 연차/반차 선택 시 처리
    leaveTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const leaveType = this.value;

            // 날짜 선택 초기화
            selectedStartDate = null;
            selectedEndDate = null;
            isSelectingRange = (leaveType === 'full');

            if (leaveType === 'full') {
                reasonTextarea.value = '연차 사용';
            } else {
                reasonTextarea.value = '반차 사용';
            }

            renderCalendar();
            calculateDays();
        });
    });

    // 달력 네비게이션
    prevMonthBtn.addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // 달력 렌더링
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // 월 표시
        currentMonthSpan.textContent = `${year}년 ${month + 1}월`;

        // 첫날과 마지막날
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const prevLastDay = new Date(year, month, 0);

        const firstDayWeek = firstDay.getDay();
        const lastDate = lastDay.getDate();
        const prevLastDate = prevLastDay.getDate();

        // 달력 날짜 생성
        let daysHTML = '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 이전 달 날짜
        for (let i = firstDayWeek - 1; i >= 0; i--) {
            const day = prevLastDate - i;
            daysHTML += `<div class="calendar-day other-month">${day}</div>`;
        }

        // 현재 달 날짜
        for (let day = 1; day <= lastDate; day++) {
            const date = new Date(year, month, day);
            date.setHours(0, 0, 0, 0);
            const dayOfWeek = date.getDay();

            let classes = ['calendar-day'];

            // 과거 날짜 비활성화
            if (date < today) {
                classes.push('disabled');
            }

            // 주말 표시 및 비활성화
            if (dayOfWeek === 0) {
                classes.push('weekend');
                classes.push('disabled');
            } else if (dayOfWeek === 6) {
                classes.push('saturday');
                classes.push('disabled');
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // 공휴일 확인 및 표시
            const holiday = isPublicHoliday(dateStr);
            let dayContent = day;
            if (holiday) {
                classes.push('holiday');
                classes.push('disabled');
                dayContent = `<div class="day-number">${day}</div><div class="holiday-name">${holiday.name}</div>`;
            }

            // 오늘 표시
            if (date.getTime() === today.getTime()) {
                classes.push('today');
            }

            // 선택된 날짜 표시
            if (selectedStartDate && date.getTime() === selectedStartDate.getTime()) {
                classes.push('start-date');
            }
            if (selectedEndDate && date.getTime() === selectedEndDate.getTime()) {
                classes.push('end-date');
            }

            // 범위 내 날짜 표시
            if (selectedStartDate && selectedEndDate &&
                date > selectedStartDate && date < selectedEndDate) {
                classes.push('in-range');
            }

            daysHTML += `<div class="${classes.join(' ')}" data-date="${dateStr}">${dayContent}</div>`;
        }

        // 다음 달 날짜
        const totalCells = Math.ceil((firstDayWeek + lastDate) / 7) * 7;
        const remainingCells = totalCells - (firstDayWeek + lastDate);
        for (let day = 1; day <= remainingCells; day++) {
            daysHTML += `<div class="calendar-day other-month">${day}</div>`;
        }

        calendarDays.innerHTML = daysHTML;

        // 날짜 클릭 이벤트
        document.querySelectorAll('.calendar-day:not(.disabled):not(.other-month)').forEach(dayEl => {
            dayEl.addEventListener('click', function() {
                handleDateClick(this.dataset.date);
            });
        });
    }

    // 날짜 클릭 처리
    function handleDateClick(dateStr) {
        const clickedDate = new Date(dateStr);
        clickedDate.setHours(0, 0, 0, 0);

        const leaveType = document.querySelector('input[name="leaveType"]:checked').value;

        if (leaveType === 'full') {
            // 연차: 범위 선택
            if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
                // 새로운 범위 시작
                selectedStartDate = clickedDate;
                selectedEndDate = null;
                startDateInput.value = dateStr;
                endDateInput.value = dateStr;
            } else {
                // 범위 종료
                if (clickedDate < selectedStartDate) {
                    selectedEndDate = selectedStartDate;
                    selectedStartDate = clickedDate;
                    startDateInput.value = dateStr;
                    endDateInput.value = formatDate(selectedEndDate);
                } else {
                    selectedEndDate = clickedDate;
                    endDateInput.value = dateStr;
                }
            }
        } else {
            // 반차: 단일 날짜 선택
            selectedStartDate = clickedDate;
            selectedEndDate = clickedDate;
            startDateInput.value = dateStr;
            endDateInput.value = dateStr;
        }

        renderCalendar();
        calculateDays();
    }

    // 날짜 포맷 함수
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 사용 일수 계산
    function calculateDays() {
        if (!startDateInput.value || !endDateInput.value) {
            calculatedDaysSpan.textContent = '0';
            remainingDaysSpan.textContent = currentRemainingDays;
            return;
        }

        const leaveType = document.querySelector('input[name="leaveType"]:checked').value;
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        let usedDays = 0;

        if (leaveType === 'full') {
            // 연차: 일수 계산 (주말 및 공휴일 제외)
            let days = 0;
            let currentDateCalc = new Date(startDate);

            while (currentDateCalc <= endDate) {
                const dayOfWeek = currentDateCalc.getDay();
                const dateStr = formatDate(currentDateCalc);

                // 주말(토:6, 일:0) 제외
                const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
                // 공휴일 제외
                const isHoliday = isPublicHoliday(dateStr);

                if (!isWeekend && !isHoliday) {
                    days++;
                }
                currentDateCalc.setDate(currentDateCalc.getDate() + 1);
            }
            calculatedDaysSpan.textContent = days;
            usedDays = days;
        } else {
            // 반차: 0.5일 (단, 선택한 날짜가 주말이나 공휴일이 아닌 경우만)
            const dateStr = startDateInput.value;
            const date = new Date(dateStr);
            const dayOfWeek = date.getDay();
            const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
            const isHoliday = isPublicHoliday(dateStr);

            if (isWeekend || isHoliday) {
                calculatedDaysSpan.textContent = '0';
                usedDays = 0;
            } else {
                calculatedDaysSpan.textContent = '0.5';
                usedDays = 0.5;
            }
        }

        // 사용 후 잔여 연차 계산
        const remaining = currentRemainingDays - usedDays;
        remainingDaysSpan.textContent = remaining;

        // 잔여 연차 초과 검증
        if (remaining < 0) {
            // 경고 표시
            warningMessage.style.display = 'flex';
            modalContent.classList.add('error');
            submitBtn.disabled = true;
        } else {
            // 정상 상태
            warningMessage.style.display = 'none';
            modalContent.classList.remove('error');
            submitBtn.disabled = false;
        }
    }

    // 폼 제출
    leaveForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = {
            leaveType: document.querySelector('input[name="leaveType"]:checked').value,
            startDate: startDateInput.value,
            endDate: endDateInput.value,
            days: calculatedDaysSpan.textContent,
            reason: document.getElementById('reason').value
        };

        console.log('연차 신청 데이터:', formData);

        // 실제 API 호출 시 여기에 구현
        // fetch('/api/leave/apply', { ... })

        showAlert('연차 신청이 완료되었습니다.', 'success');
        closeModal();

        // 페이지 새로고침 (실제로는 데이터 다시 로드)
        // location.reload();
    });

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

    // 필터 기능
    const filterSelects = document.querySelectorAll('.filter-select');
    filterSelects.forEach(select => {
        select.addEventListener('change', function() {
            console.log('필터 변경:', this.value);
            // 실제 필터링 로직 구현
            // 여기서는 콘솔 로그만 출력
        });
    });

    // 연간 달력 렌더링
    function renderAnnualCalendar() {
        const annualCalendar = document.getElementById('annualCalendar');
        const currentYear = new Date().getFullYear();
        let calendarHTML = '';

        for (let month = 0; month < 12; month++) {
            calendarHTML += renderMonthCalendar(currentYear, month);
        }

        annualCalendar.innerHTML = calendarHTML;
    }

    // 월별 달력 렌더링
    function renderMonthCalendar(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const prevLastDay = new Date(year, month, 0);

        const firstDayWeek = firstDay.getDay();
        const lastDate = lastDay.getDate();
        const prevLastDate = prevLastDay.getDate();

        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

        let html = `
            <div class="month-calendar">
                <div class="month-header">${year}년 ${monthNames[month]}</div>
                <div class="month-weekdays">
                    <div>일</div>
                    <div>월</div>
                    <div>화</div>
                    <div>수</div>
                    <div>목</div>
                    <div>금</div>
                    <div>토</div>
                </div>
                <div class="month-days">
        `;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 이전 달 날짜
        for (let i = firstDayWeek - 1; i >= 0; i--) {
            const day = prevLastDate - i;
            html += `<div class="month-day other-month">${day}</div>`;
        }

        // 현재 달 날짜
        for (let day = 1; day <= lastDate; day++) {
            const date = new Date(year, month, day);
            date.setHours(0, 0, 0, 0);
            const dayOfWeek = date.getDay();
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            let classes = ['month-day'];

            // 주말 표시
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                classes.push('weekend');
            }

            // 오늘 표시
            if (date.getTime() === today.getTime()) {
                classes.push('today');
            }

            // 연차 상태 확인
            const leaveStatus = getLeaveStatus(dateStr);
            if (leaveStatus) {
                if (leaveStatus.type === 'full') {
                    classes.push(leaveStatus.status === 'approved' ? 'leave-approved' : 'leave-pending');
                } else {
                    // 반차는 대각선 표시
                    classes.push('half-leave');
                }
            }

            html += `<div class="${classes.join(' ')}">${day}</div>`;
        }

        // 다음 달 날짜
        const totalCells = Math.ceil((firstDayWeek + lastDate) / 7) * 7;
        const remainingCells = totalCells - (firstDayWeek + lastDate);
        for (let day = 1; day <= remainingCells; day++) {
            html += `<div class="month-day other-month">${day}</div>`;
        }

        html += `
                </div>
            </div>
        `;

        return html;
    }

    // 페이지 로드 시 연간 달력 렌더링
    renderAnnualCalendar();

    // 사용 연차 카드 클릭
    usedLeaveCard.addEventListener('click', function() {
        openUsedLeaveModal();
    });

    // 사용 연차 모달 닫기
    closeUsedModal.addEventListener('click', function() {
        usedLeaveModal.classList.remove('show');
    });

    // 사용 연차 모달 배경 클릭 시 닫기
    usedLeaveModal.addEventListener('click', function(e) {
        if (e.target === usedLeaveModal) {
            usedLeaveModal.classList.remove('show');
        }
    });

    // 사용 연차 모달 열기 및 데이터 채우기
    function openUsedLeaveModal() {
        // 승인된 연차만 필터링
        const approvedLeaves = leaveRecords.filter(record => record.status === 'approved');

        let tableHTML = '';

        approvedLeaves.forEach(record => {
            const startDate = new Date(record.startDate);
            const endDate = new Date(record.endDate);
            const currentDateLoop = new Date(startDate);

            // 날짜 범위 내의 각 날짜 처리
            while (currentDateLoop <= endDate) {
                const dateStr = formatDate(currentDateLoop);
                const dayOfWeek = currentDateLoop.getDay();

                // 주말과 공휴일 제외
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isPublicHoliday(dateStr)) {
                    let badgeClass = '';
                    let badgeText = '';

                    if (record.type === 'full') {
                        badgeClass = 'badge-full';
                        badgeText = '연차';
                    } else if (record.type === 'half-am') {
                        badgeClass = 'badge-half';
                        badgeText = '반차(오전)';
                    } else if (record.type === 'half-pm') {
                        badgeClass = 'badge-half';
                        badgeText = '반차(오후)';
                    }

                    tableHTML += `
                        <tr>
                            <td>${dateStr}</td>
                            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                            <td>${getReason(record)}</td>
                            <td>${getApprovalDate(record)}</td>
                        </tr>
                    `;
                }

                currentDateLoop.setDate(currentDateLoop.getDate() + 1);
            }
        });

        usedLeaveTableBody.innerHTML = tableHTML;
        usedLeaveModal.classList.add('show');
    }

    // 사유 가져오기 (실제로는 서버 데이터에서)
    function getReason(record) {
        const reasons = {
            '2025-03-20': '개인 사유',
            '2025-03-12': '병원 진료',
            '2025-03-11': '가족 행사',
            '2025-03-06': '개인 사유',
            '2025-02-25': '여행'
        };
        return reasons[record.startDate] || '개인 사유';
    }

    // 승인일 가져오기 (실제로는 서버 데이터에서)
    function getApprovalDate(record) {
        const approvalDates = {
            '2025-03-20': '2025-03-15',
            '2025-03-12': '2025-03-10',
            '2025-03-11': '2025-03-08',
            '2025-03-06': '2025-03-05',
            '2025-02-25': '2025-02-20'
        };
        return approvalDates[record.startDate] || '-';
    }
});
