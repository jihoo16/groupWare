// 연차관리 페이지 스크립트
document.addEventListener('DOMContentLoaded', async function() {
    const totalLeaveCard = document.getElementById('totalLeaveCard');
    const usedLeaveCard = document.getElementById('usedLeaveCard');
    const remainingLeaveCard = document.getElementById('remainingLeaveCard');
    const totalLeaveModal = document.getElementById('totalLeaveModal');
    const usedLeaveModal = document.getElementById('usedLeaveModal');
    const remainingLeaveModal = document.getElementById('remainingLeaveModal');
    const closeTotalModal = document.getElementById('closeTotalModal');
    const closeUsedModal = document.getElementById('closeUsedModal');
    const closeRemainingModal = document.getElementById('closeRemainingModal');
    const usedLeaveTableBody = document.getElementById('usedLeaveTableBody');
    const usedLeaveSummary = document.getElementById('usedLeaveSummary');
    const remainingLeaveTableBody = document.getElementById('remainingLeaveTableBody');
    const remainingLeaveSummary = document.getElementById('remainingLeaveSummary');
    const calculationDetailContent = document.getElementById('calculationDetailContent');

    // 전역 변수
    let currentUserIdx = null;
    let vacationInfo = null;
    let vacationHistory = [];
    let calculationDetail = null;
    let currentCalendarYear = new Date().getFullYear(); // 연차 캘린더 표시 연도

    // 대한민국 공휴일 (2024~2026년)
    // 실제로는 서버에서 API로 가져오거나 공공데이터포털 API 사용 권장
    const publicHolidays = {
        '2024': [
            { date: '2024-01-01', name: '신정' },
            { date: '2024-02-09', name: '설날 연휴' },
            { date: '2024-02-10', name: '설날' },
            { date: '2024-02-11', name: '설날 연휴' },
            { date: '2024-02-12', name: '대체공휴일(설날)' },
            { date: '2024-03-01', name: '삼일절' },
            { date: '2024-04-10', name: '국회의원 선거일' },
            { date: '2024-05-05', name: '어린이날' },
            { date: '2024-05-06', name: '대체공휴일(어린이날)' },
            { date: '2024-05-15', name: '석가탄신일' },
            { date: '2024-06-06', name: '현충일' },
            { date: '2024-08-15', name: '광복절' },
            { date: '2024-09-16', name: '추석 연휴' },
            { date: '2024-09-17', name: '추석' },
            { date: '2024-09-18', name: '추석 연휴' },
            { date: '2024-10-03', name: '개천절' },
            { date: '2024-10-09', name: '한글날' },
            { date: '2024-12-25', name: '크리스마스' }
        ],
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

    // API: 사용자 연차 정보 조회
    async function fetchVacationInfo(userIdx, year = new Date().getFullYear()) {
        try {
            const response = await fetch(`/api/vacation/user-info?userIdx=${userIdx}&year=${year}`);
            if (!response.ok) throw new Error('Failed to fetch vacation info');
            return await response.json();
        } catch (error) {
            console.error('연차 정보 조회 실패:', error);
            return null;
        }
    }

    // API: 연차 사용 내역 조회
    async function fetchVacationHistory(userIdx, year = new Date().getFullYear()) {
        try {
            const response = await fetch(`/api/vacation/history?userIdx=${userIdx}&year=${year}`);

            // 401 Unauthorized - 세션 만료
            if (response.status === 401) {
                console.error('세션이 만료되었습니다. 로그인 페이지로 이동합니다.');
                await showError('세션이 만료되었습니다. 다시 로그인해주세요.');
                window.location.href = '/login';
                return [];
            }

            // 응답 타입 확인
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error('JSON이 아닌 응답을 받았습니다:', contentType);
                console.error('응답 상태:', response.status);
                const text = await response.text();
                console.error('응답 내용 (처음 200자):', text.substring(0, 200));
                return [];
            }

            if (!response.ok) throw new Error(`Failed to fetch vacation history: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('연차 내역 조회 실패:', error);
            return [];
        }
    }

    // API: 연차 계산 상세 조회
    async function fetchCalculationDetail(userIdx, year = new Date().getFullYear()) {
        try {
            const response = await fetch(`/api/vacation/calculation-detail?userIdx=${userIdx}&year=${year}`);
            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error('Failed to fetch calculation detail');
            }
            return await response.json();
        } catch (error) {
            console.error('연차 계산 상세 조회 실패:', error);
            return null;
        }
    }

    // 전역 변수 CURRENT_USER 사용 (layout.html에서 주입됨)
    function getCurrentUser() {
        if (!window.CURRENT_USER || !window.CURRENT_USER.idx) {
            console.warn('세션 정보가 없습니다.');
            window.location.href = '/login';
            return null;
        }
        return window.CURRENT_USER;
    }

    // 연차 정보 카드 업데이트
    function updateVacationSummaryCards(info) {
        if (!info) return;

        const totalDaysEl = document.querySelector('.summary-card.total .number');
        const usedDaysEl = document.querySelector('.summary-card.used .number');
        const remainingDaysEl = document.querySelector('.summary-card.remaining .number');
        const subInfoEl = document.querySelector('.summary-card.used .sub-info');

        // 서버에서 계산된 값을 그대로 사용 (VIEW에서 이미 경조사 제외하고 계산함)
        if (totalDaysEl) totalDaysEl.innerHTML = `${info.totalDays}<span>일</span>`;
        if (usedDaysEl) usedDaysEl.innerHTML = `${info.usedDays}<span>일</span>`;
        if (remainingDaysEl) remainingDaysEl.innerHTML = `${info.remainingDays}<span>일</span>`;

        // 반차 카운트 (연차 내역의 days 필드를 보고 판단)
        const halfDayCount = vacationHistory.filter(v => {
            // days가 0.5인 경우 또는 vacationType에 반차가 포함된 경우
            return (v.days === 0.5 || v.days === '0.5') ||
                   (v.vacationType && (v.vacationType.includes('반차') || v.vacationType.includes('HALF')));
        }).length;

        if (subInfoEl && halfDayCount > 0) {
            subInfoEl.textContent = `반차 ${halfDayCount}회 포함`;
        } else if (subInfoEl) {
            subInfoEl.textContent = '';
        }

        // 총 연차 카드 하단에 근속연차 예정 정보 표시
        updateTotalDaysSubInfo();
    }

    // 총 연차 카드 하단에 근속연차 예정 정보 표시
    function updateTotalDaysSubInfo() {
        const totalSubInfoEl = document.querySelector('.summary-card.total .sub-info');
        if (!totalSubInfoEl || !calculationDetail) return;

        // 해당 연도에 새로 발생하는 근속가산이 있는 경우만 표시
        if (calculationDetail.serviceBonusAccrualDate) {
            const bonusDate = new Date(calculationDetail.serviceBonusAccrualDate + 'T00:00:00');
            const month = bonusDate.getMonth() + 1;
            const day = bonusDate.getDate();
            totalSubInfoEl.textContent = `${month}월 ${day}일 이후 +1일`;
        } else {
            totalSubInfoEl.textContent = '';
        }
    }

    // 연차 사용 내역 테이블 업데이트
    function updateVacationHistoryTable(history) {
        const tbody = document.querySelector('.history-table tbody');
        if (!tbody) return;

        if (!history || history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">연차 사용 내역이 없습니다.</td></tr>';
            return;
        }

        // days > 0인 레코드만 표시 (경조사만 있는 레코드는 제외)
        const filteredHistory = history.filter(item => item.days && parseFloat(item.days) > 0);

        if (filteredHistory.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">연차 사용 내역이 없습니다.</td></tr>';
            return;
        }

        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

        const rows = filteredHistory.map(item => {
            const vacType = getVacationTypeBadge(item.vacationType);

            // 신청일에 요일 추가
            let applyDateWithDay = '-';
            if (item.applyDate || item.createdAt) {
                const applyDateStr = item.applyDate || item.createdAt.substring(0, 10);
                const applyDateObj = new Date(applyDateStr + 'T00:00:00');
                const applyDayOfWeek = applyDateObj.getDay();
                applyDateWithDay = `${applyDateStr} (${dayNames[applyDayOfWeek]})`;
            }

            // 시작일에 요일 추가
            let startDateWithDay = '-';
            if (item.startDate) {
                const startDateObj = new Date(item.startDate + 'T00:00:00');
                const startDayOfWeek = startDateObj.getDay();
                startDateWithDay = `${item.startDate} (${dayNames[startDayOfWeek]})`;
            }

            // 종료일에 요일 추가
            let endDateWithDay = '-';
            if (item.endDate) {
                const endDateObj = new Date(item.endDate + 'T00:00:00');
                const endDayOfWeek = endDateObj.getDay();
                endDateWithDay = `${item.endDate} (${dayNames[endDayOfWeek]})`;
            }

            const days = item.days || 0;
            const reason = item.reason || item.content || '개인 사유';
            const documentIdx = item.documentIdx || '';

            return `
                <tr data-document-idx="${documentIdx}" onclick="location.href='/approval/vacation/detail?documentIdx=${documentIdx}'">
                    <td>${applyDateWithDay}</td>
                    <td>${vacType}</td>
                    <td>${startDateWithDay}</td>
                    <td>${endDateWithDay}</td>
                    <td>${days}일</td>
                    <td>${reason}</td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rows;
    }

    // 연차 타입 뱃지 생성
    function getVacationTypeBadge(vacationType) {
        // 경조사는 별도 스타일로 표시
        if (vacationType && vacationType.includes('경조사')) {
            return `<span class="badge" style="background: #2196F3; color: white;">${vacationType}</span>`;
        }

        const typeMap = {
            'FULL': '<span class="badge badge-full">연차</span>',
            'HALF_AM': '<span class="badge badge-half">반차(오전)</span>',
            'HALF_PM': '<span class="badge badge-half">반차(오후)</span>',
            '연차': '<span class="badge badge-full">연차</span>',
            '반차(오전)': '<span class="badge badge-half">반차(오전)</span>',
            '반차(오후)': '<span class="badge badge-half">반차(오후)</span>'
        };
        return typeMap[vacationType] || `<span class="badge badge-full">${vacationType}</span>`;
    }

    // 날짜가 연차 기간에 포함되는지 확인
    function getLeaveStatus(dateStr) {
        for (let record of vacationHistory) {
            // days가 0이면 경조사만 있는 레코드이므로 달력에 표시하지 않음
            if (!record.days || parseFloat(record.days) === 0) {
                continue;
            }

            // 날짜 문자열을 직접 비교 (타임존 문제 방지)
            // dateStr: "2025-03-15", record.startDate: "2025-03-15"
            if (dateStr >= record.startDate && dateStr <= record.endDate) {
                console.log(`[DEBUG] 연차 매칭: ${dateStr}, 기간: ${record.startDate} ~ ${record.endDate}`);

                // 주말이나 공휴일 체크 (표시는 하되 스타일만 다르게)
                const date = new Date(dateStr + 'T00:00:00');  // 로컬 타임존으로 파싱
                const dayOfWeek = date.getDay();

                // 주말이나 공휴일이더라도 연차 기간이면 표시
                // 다만 주말/공휴일은 실제 연차 차감 대상이 아님을 표시

                // vacationType에서 타입 결정
                let type = 'full';
                if (record.vacationType && record.vacationType.includes('HALF')) {
                    type = record.vacationType.includes('AM') ? 'half-am' : 'half-pm';
                } else if (record.vacationType && record.vacationType.includes('반차')) {
                    type = record.vacationType.includes('오전') ? 'half-am' : 'half-pm';
                }

                return {
                    status: 'approved',
                    type: type
                };
            }
        }
        return null;
    }

    // 데이터 초기화
    async function initializeVacationPage() {
        // 1. 현재 로그인한 사용자 정보 조회 (전역 변수 사용)
        const currentUser = getCurrentUser();
        if (!currentUser) {
            console.error('로그인 정보를 가져올 수 없습니다.');
            return;
        }

        currentUserIdx = currentUser.idx;
        console.log('현재 로그인 사용자:', currentUser.empName, '(idx:', currentUserIdx, ')');

        const currentYear = new Date().getFullYear();

        // 2. 연차 정보 조회
        vacationInfo = await fetchVacationInfo(currentUserIdx, currentYear);
        if (vacationInfo) {
            updateVacationSummaryCards(vacationInfo);
        }

        // 3. 연차 계산 상세 조회
        calculationDetail = await fetchCalculationDetail(currentUserIdx, currentYear);

        // 4. 연차 사용 내역 조회
        vacationHistory = await fetchVacationHistory(currentUserIdx, currentYear);
        console.log('[DEBUG] 로드된 연차 내역:', vacationHistory);
        updateVacationHistoryTable(vacationHistory);

        // 5. 연간 달력 렌더링
        console.log('[DEBUG] 연간 달력 렌더링 시작');
        renderAnnualCalendar();
    }


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

    // 특정 연도 데이터 전체 로드
    async function loadYearData(year) {
        console.log(`[DEBUG] ${year}년 데이터 전체 로드 시작`);

        // 1. 연차 사용 내역 조회 (먼저 로드하여 반차 카운트에 사용)
        vacationHistory = await fetchVacationHistory(currentUserIdx, year);
        updateVacationHistoryTable(vacationHistory);
        console.log(`[DEBUG] ${year}년 연차 사용 내역 로드 완료:`, vacationHistory);

        // 2. 연차 계산 상세 조회 (먼저 로드하여 총 연차 카드에 사용)
        calculationDetail = await fetchCalculationDetail(currentUserIdx, year);
        console.log(`[DEBUG] ${year}년 연차 계산 상세 로드 완료:`, calculationDetail);

        // 3. 연차 정보 조회 (총 연차, 사용 연차, 잔여 연차)
        // 미래 연도의 경우 vacationInfo가 null일 수 있으므로 calculationDetail에서 가져옴
        vacationInfo = await fetchVacationInfo(currentUserIdx, year);

        if (vacationInfo || calculationDetail) {
            // vacationInfo가 없거나 totalDays가 0이면 calculationDetail로부터 생성
            if ((!vacationInfo || vacationInfo.totalDays == 0) && calculationDetail) {
                console.log(`[DEBUG] ${year}년 VacationBalance 없음, calculationDetail로 생성`);
                vacationInfo = {
                    totalDays: calculationDetail.totalVacationDays,
                    usedDays: 0,
                    remainingDays: calculationDetail.totalVacationDays
                };
            }
            updateVacationSummaryCards(vacationInfo);
            console.log(`[DEBUG] ${year}년 연차 정보 로드 완료:`, vacationInfo);
        } else {
            console.warn(`[DEBUG] ${year}년 연차 정보 없음`);
            // 데이터가 없을 경우 초기화
            const totalDaysEl = document.querySelector('.summary-card.total .number');
            const usedDaysEl = document.querySelector('.summary-card.used .number');
            const remainingDaysEl = document.querySelector('.summary-card.remaining .number');
            const subInfoEl = document.querySelector('.summary-card.used .sub-info');
            const totalSubInfoEl = document.querySelector('.summary-card.total .sub-info');

            if (totalDaysEl) totalDaysEl.innerHTML = '-<span>일</span>';
            if (usedDaysEl) usedDaysEl.innerHTML = '-<span>일</span>';
            if (remainingDaysEl) remainingDaysEl.innerHTML = '-<span>일</span>';
            if (subInfoEl) subInfoEl.textContent = '';
            if (totalSubInfoEl) totalSubInfoEl.textContent = '';
        }

        // 4. 캘린더 렌더링
        renderAnnualCalendar(year);
    }

    // 연간 달력 렌더링
    function renderAnnualCalendar(year = currentCalendarYear) {
        const annualCalendar = document.getElementById('annualCalendar');
        const currentYearDisplay = document.getElementById('currentCalendarYear');

        // 연도 표시 업데이트
        if (currentYearDisplay) {
            currentYearDisplay.textContent = year;
        }

        let calendarHTML = '';

        for (let month = 0; month < 12; month++) {
            calendarHTML += renderMonthCalendar(year, month);
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

            // 공휴일 체크
            const holiday = isPublicHoliday(dateStr);
            if (holiday) {
                classes.push('holiday');
            }

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
                    classes.push('leave-approved');
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

    // 총 연차 카드 클릭
    totalLeaveCard.addEventListener('click', function() {
        openTotalLeaveModal();
    });

    // 사용 연차 카드 클릭
    usedLeaveCard.addEventListener('click', function() {
        openUsedLeaveModal();
    });

    // 잔여 연차 카드 클릭
    remainingLeaveCard.addEventListener('click', function() {
        openRemainingLeaveModal();
    });

    // 총 연차 모달 닫기
    closeTotalModal.addEventListener('click', function() {
        totalLeaveModal.classList.remove('show');
    });

    // 사용 연차 모달 닫기
    closeUsedModal.addEventListener('click', function() {
        usedLeaveModal.classList.remove('show');
    });

    // 잔여 연차 모달 닫기
    closeRemainingModal.addEventListener('click', function() {
        remainingLeaveModal.classList.remove('show');
    });

    // 총 연차 모달 배경 클릭 시 닫기
    totalLeaveModal.addEventListener('click', function(e) {
        if (e.target === totalLeaveModal) {
            totalLeaveModal.classList.remove('show');
        }
    });

    // 사용 연차 모달 배경 클릭 시 닫기
    usedLeaveModal.addEventListener('click', function(e) {
        if (e.target === usedLeaveModal) {
            usedLeaveModal.classList.remove('show');
        }
    });

    // 잔여 연차 모달 배경 클릭 시 닫기
    remainingLeaveModal.addEventListener('click', function(e) {
        if (e.target === remainingLeaveModal) {
            remainingLeaveModal.classList.remove('show');
        }
    });

    // 총 연차 모달 열기 및 데이터 채우기
    function openTotalLeaveModal() {
        if (!calculationDetail) {
            calculationDetailContent.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 16px; color: #ff9800;"></i>
                    <p style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">연차 계산 상세 내역이 없습니다.</p>
                    <p style="font-size: 14px; color: #999;">연차를 먼저 계산해주세요.</p>
                </div>
            `;
            totalLeaveModal.classList.add('show');
            return;
        }

        let contentHtml = '';

        // 입사 첫해 여부에 따른 계산 상세 표시
        if (calculationDetail.isFirstYear) {
            // 입사 첫해: 월차 계산
            contentHtml = `
                <div class="calc-section">
                    <div class="calc-title">📅 입사 정보</div>
                    <div class="calc-value">${calculationDetail.joinDate}</div>
                    <div class="calc-description">계산 기준일: ${calculationDetail.calculationBaseDate}</div>
                </div>

                <div class="calc-section">
                    <div class="calc-title">⏱️ 근속 기간</div>
                    <div class="calc-value">${calculationDetail.yearsOfService}년 ${calculationDetail.monthsOfService}개월</div>
                    <div class="calc-description">입사 1년 미만 근무자입니다</div>
                </div>

                <div class="calc-section">
                    <div class="calc-title">📊 월차 계산</div>
                    <div class="calc-value">${calculationDetail.monthlyVacationDays || 0}일</div>
                    <div class="calc-description">
                        ${calculationDetail.monthlyStartMonth && calculationDetail.monthlyEndMonth
                            ? `${calculationDetail.monthlyStartMonth}월 ~ ${calculationDetail.monthlyEndMonth}월 근무 기간<br>`
                            : '1개월 미만 근무 (월차 미발생)<br>'}
                        월차는 매월 1일씩 발생하며, 최대 11일까지 부여됩니다
                    </div>
                </div>

                <div style="margin: 20px 0; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #2196f3;">
                    <div style="font-size: 14px; font-weight: 600; color: #1976d2; margin-bottom: 12px;">
                        📌 월차 계산 방식 (개인별 상세)
                    </div>
                    <div style="font-size: 13px; color: #555; line-height: 1.8;">
                        <strong>✓ 귀하의 입사일: ${calculationDetail.joinDate}</strong><br>
                        <strong>✓ 현재 근속: ${calculationDetail.yearsOfService}년 ${calculationDetail.monthsOfService}개월</strong><br>
                        <br>
                        <strong style="color: #2196f3;">🔹 1년 미만 근로자 월차 계산</strong><br>
                        • 입사 후 <strong>매월 1일씩 월차 발생</strong> (최대 11일)<br>
                        • 귀하의 경우: <strong>${calculationDetail.monthlyStartMonth || ''}${calculationDetail.monthlyEndMonth ? '월 ~ ' + calculationDetail.monthlyEndMonth + '월' : ''}</strong> 근무 기간<br>
                        • 발생 월차: <strong>${calculationDetail.monthlyVacationDays || 0}일</strong><br>
                        • 근로기준법 제60조 제2항에 따른 규정<br>
                        <br>
                        <strong style="color: #f57c00;">💡 참고</strong><br>
                        • 1년 미만 근로자는 연차가 아닌 <strong>월차만</strong> 발생<br>
                        • 1년일 도래 시 <strong>전년도 근로일수 비례하여 연차 부여</strong><br>
                        • 월차는 1년일 이후 연차로 전환됨<br>
                    </div>
                </div>

                <div class="total-result">
                    <div class="result-label">총 연차 일수</div>
                    <div class="result-value">${calculationDetail.totalVacationDays || 0}<span>일</span></div>
                </div>
            `;
        } else {
            // 일반 연차 계산
            contentHtml = `
                <div class="calc-section">
                    <div class="calc-title">📅 입사 정보</div>
                    <div class="calc-value">${calculationDetail.joinDate}</div>
                    <div class="calc-description">계산 기준일: ${calculationDetail.calculationBaseDate}</div>
                </div>

                <div class="calc-section">
                    <div class="calc-title">⏱️ 근속 기간</div>
                    <div class="calc-value">${calculationDetail.yearsOfService}년 ${calculationDetail.monthsOfService}개월</div>
                    <div class="calc-description">재직 기간 기준으로 연차가 계산됩니다</div>
                </div>

                <div class="calc-section" style="border-left-color: #388e3c;">
                    <div class="calc-title">✓ 기본 연차</div>
                    <div class="calc-value" style="color: #388e3c;">${calculationDetail.baseVacationDays || 0}일</div>
                    <div class="calc-description">근로기준법에 따른 기본 연차 일수</div>
                </div>

                ${(calculationDetail.serviceBonusDays || 0) > 0 ? `
                <div class="calc-section" style="border-left-color: #f57c00;">
                    <div class="calc-title">🎁 근속 가산 연차</div>
                    <div class="calc-value" style="color: #f57c00;">+${calculationDetail.serviceBonusDays || 0}일</div>
                    <div class="calc-description">
                        ${calculationDetail.serviceBonusAccrualDate
                            ? `<strong style="color: #f57c00;">${formatAccrualDate(calculationDetail.serviceBonusAccrualDate)} 발생 예정</strong><br>`
                            : ''}
                        ${calculationDetail.serviceBonusDescription || '매 만2년마다 1일씩 가산'}<br>
                        (기본연차 합산 최대 25일, 근속가산 최대 10일)
                    </div>
                </div>
                ` : ''}

                <div style="margin: 20px 0; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e0e0e0;">
                    <div style="font-size: 13px; color: #666; margin-bottom: 8px;">💡 계산식</div>
                    <div style="font-size: 15px; font-weight: 600; color: #333; text-align: center;">
                        ${calculationDetail.proportionalVacationDays
                            ? `${calculationDetail.monthlyVacationDays || 0}일 (월차) + ${calculationDetail.baseVacationDays || 0}일 (비례연차)`
                            : `${calculationDetail.baseVacationDays || 0}일 (기본)`}
                        ${(calculationDetail.serviceBonusDays || 0) > 0 ? ` + ${calculationDetail.serviceBonusDays || 0}일 (가산)` : ''}
                        = <span style="color: #1976d2; font-size: 18px;">${calculationDetail.totalVacationDays || 0}일</span>
                    </div>
                </div>

                <div style="margin: 20px 0; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #388e3c;">
                    <div style="font-size: 14px; font-weight: 600; color: #388e3c; margin-bottom: 12px;">
                        📌 연차 계산 상세 (개인별)
                    </div>
                    <div style="font-size: 13px; color: #555; line-height: 1.8;">
                        <strong>✓ 귀하의 입사일: ${calculationDetail.joinDate}</strong><br>
                        <strong>✓ 현재 근속: ${calculationDetail.yearsOfService}년 ${calculationDetail.monthsOfService}개월</strong><br>
                        <br>
                        ${calculationDetail.proportionalVacationDays ? `
                        <strong style="color: #2196f3;">🔹 월차 (${calculationDetail.monthlyVacationDays || 0}일)</strong><br>
                        ${calculationDetail.monthlyStartMonth && calculationDetail.monthlyEndMonth
                            ? `• <strong>${calculationDetail.monthlyStartMonth}월 ~ ${calculationDetail.monthlyEndMonth}월</strong> 근무 기간<br>`
                            : ''}
                        • 매월 1일씩 발생 (입사일부터 1년일 전월까지)<br>
                        • 귀하의 경우: <strong>${calculationDetail.monthlyVacationDays || 0}일 발생</strong><br>
                        <br>
                        <strong style="color: #388e3c;">🔹 비례 연차 (${calculationDetail.baseVacationDays || 0}일)</strong><br>
                        • 1년일 도래: <strong>${calculationDetail.proportionalStartDate ? formatAccrualDate(calculationDetail.proportionalStartDate) : ''}</strong><br>
                        • <strong>전년도 근로일수 비례 지급</strong><br>
                        • 계산식: (전년도 근로일수 / 전년도 전체일수) × 15일 (반올림)<br>
                        • 귀하의 경우: <strong>${calculationDetail.baseVacationDays}일 부여</strong><br>
                        • 근로기준법 제60조 제1항에 따른 규정<br>
                        <br>
                        ` : `
                        <strong style="color: #388e3c;">🔹 기본 연차 (${calculationDetail.baseVacationDays || 0}일)</strong><br>
                        • 1년 이상 근속 시 <strong>15일 부여</strong><br>
                        • 근로기준법 제60조 제1항에 따른 규정<br>
                        <br>
                        `}
                        ${(calculationDetail.serviceBonusDays || 0) > 0 ? `
                        <strong style="color: #f57c00;">🔹 근속 가산 연차 (${calculationDetail.serviceBonusDays}일)</strong><br>
                        • <strong>만 2년마다 1일씩 누적 추가</strong><br>
                        • 귀하의 경우: <strong>${calculationDetail.serviceBonusDays}일 가산</strong><br>
                        ${calculationDetail.serviceBonusAccrualDate ? `• <strong>${formatAccrualDate(calculationDetail.serviceBonusAccrualDate)}</strong>에 1일 추가 예정<br>` : ''}
                        • 기본연차와 합산하여 <strong>최대 25일</strong> (15일 + 10일)<br>
                        • 근로기준법 제60조 제2항에 따른 규정<br>
                        <br>
                        ` : ''}
                        <strong style="color: #1976d2;">💡 귀하의 ${calculationDetail.year}년 총 연차</strong><br>
                        ${calculationDetail.proportionalVacationDays ? `• 월차: ${calculationDetail.monthlyVacationDays || 0}일<br>• 비례연차: ${calculationDetail.baseVacationDays || 0}일<br>` : `• 기본연차: ${calculationDetail.baseVacationDays || 0}일<br>`}
                        ${(calculationDetail.serviceBonusDays || 0) > 0 ? `• 근속가산: ${calculationDetail.serviceBonusDays}일<br>` : ''}
                        • <strong>합계: ${calculationDetail.totalVacationDays || 0}일</strong><br>
                    </div>
                </div>

                <div class="total-result">
                    <div class="result-label">총 연차 일수</div>
                    <div class="result-value">${calculationDetail.totalVacationDays || 0}<span>일</span></div>
                </div>
            `;
        }

        calculationDetailContent.innerHTML = contentHtml;
        totalLeaveModal.classList.add('show');
    }

    // 사용 연차 모달 열기 및 데이터 채우기
    function openUsedLeaveModal() {
        // 사용 연차 요약 업데이트 (서버 값 사용)
        if (vacationInfo && vacationInfo.usedDays !== undefined) {
            const usedDays = parseFloat(vacationInfo.usedDays);
            const halfDayCount = vacationHistory ? vacationHistory.filter(v =>
                (v.days === 0.5 || v.days === '0.5') ||
                (v.vacationType && (v.vacationType.includes('반차') || v.vacationType.includes('HALF')))
            ).length : 0;

            usedLeaveSummary.textContent = halfDayCount > 0
                ? `${usedDays}일 (반차 ${halfDayCount}회 포함)`
                : `${usedDays}일`;
        } else {
            usedLeaveSummary.textContent = '-';
        }

        if (!vacationHistory || vacationHistory.length === 0) {
            usedLeaveTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 40px;">연차 사용 내역이 없습니다.</td></tr>';
            usedLeaveModal.classList.add('show');
            return;
        }

        let tableHTML = '';

        vacationHistory.forEach(record => {
            // days가 0이면 경조사만 있는 레코드이므로 스킵
            // days > 0이면 연차가 포함된 레코드이므로 표시
            if (!record.days || parseFloat(record.days) === 0) {
                return;
            }

            const startDate = new Date(record.startDate);
            const endDate = new Date(record.endDate);
            const currentDateLoop = new Date(startDate);

            // 날짜 범위 내의 각 날짜 처리
            while (currentDateLoop <= endDate) {
                const dateStr = formatDate(currentDateLoop);
                const dayOfWeek = currentDateLoop.getDay();

                // 주말과 공휴일 제외
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isPublicHoliday(dateStr)) {
                    const badgeHtml = getVacationTypeBadge(record.vacationType);
                    const reason = record.reason || record.content || '개인 사유';

                    // 요일 추가
                    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                    const dateWithDay = `${dateStr} (${dayNames[dayOfWeek]})`;

                    tableHTML += `
                        <tr>
                            <td>${dateWithDay}</td>
                            <td>${badgeHtml}</td>
                            <td>${reason}</td>
                        </tr>
                    `;
                }

                currentDateLoop.setDate(currentDateLoop.getDate() + 1);
            }
        });

        usedLeaveTableBody.innerHTML = tableHTML || '<tr><td colspan="3" style="text-align: center; padding: 40px;">연차 사용 내역이 없습니다.</td></tr>';
        usedLeaveModal.classList.add('show');
    }

    // 잔여 연차 모달 열기 및 데이터 채우기
    function openRemainingLeaveModal() {
        // 현재 잔여 연차 요약
        if (vacationInfo && vacationInfo.remainingDays !== undefined) {
            remainingLeaveSummary.textContent = `${vacationInfo.remainingDays}일`;
        } else {
            remainingLeaveSummary.textContent = '-';
        }

        if (!vacationHistory || vacationHistory.length === 0 || !vacationInfo) {
            remainingLeaveTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">연차 사용 내역이 없습니다.</td></tr>';
            remainingLeaveModal.classList.add('show');
            return;
        }

        // days > 0인 레코드만 필터링하고, 날짜별로 펼치기
        const usageDates = [];
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

        vacationHistory.forEach(record => {
            // days가 0이면 경조사만 있는 레코드이므로 스킵
            if (!record.days || parseFloat(record.days) === 0) {
                return;
            }

            const startDate = new Date(record.startDate);
            const endDate = new Date(record.endDate);
            const currentDateLoop = new Date(startDate);

            // 날짜 범위 내의 각 영업일 처리
            while (currentDateLoop <= endDate) {
                const dateStr = formatDate(currentDateLoop);
                const dayOfWeek = currentDateLoop.getDay();

                // 주말과 공휴일 제외
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isPublicHoliday(dateStr)) {
                    // 경조사는 차감하지 않음 (0일), 반차는 0.5일, 연차는 1일
                    let usageDays = 1; // 기본값: 연차 1일
                    if (record.vacationType && record.vacationType.includes('경조사')) {
                        usageDays = 0; // 경조사는 차감 안함
                    } else if (record.vacationType && (record.vacationType.includes('반차') || record.vacationType.includes('HALF'))) {
                        usageDays = 0.5; // 반차
                    }

                    usageDates.push({
                        date: dateStr,
                        dateWithDay: `${dateStr} (${dayNames[dayOfWeek]})`,
                        vacationType: record.vacationType,
                        reason: record.reason || record.content || '개인 사유',
                        days: usageDays
                    });
                }

                currentDateLoop.setDate(currentDateLoop.getDate() + 1);
            }
        });

        // 날짜순으로 정렬 (오래된 날짜부터)
        usageDates.sort((a, b) => a.date.localeCompare(b.date));

        // 초기 잔여 연차 계산 (총 연차에서 모든 사용 일수를 뺀 후 다시 더해가는 방식)
        const totalDays = parseFloat(vacationInfo.totalDays);
        const totalUsedDays = usageDates.reduce((sum, item) => sum + item.days, 0);
        let currentRemaining = totalDays; // 사용 전 초기 잔여

        let tableHTML = '';

        usageDates.forEach((usage, index) => {
            const beforeRemaining = currentRemaining;
            const afterRemaining = currentRemaining - usage.days;
            currentRemaining = afterRemaining;

            const badgeHtml = getVacationTypeBadge(usage.vacationType);

            // 음수 잔여는 빨간색으로 표시
            const beforeStyle = beforeRemaining < 0 ? 'color: #dc3545; font-weight: bold;' : '';
            const afterStyle = afterRemaining < 0 ? 'color: #dc3545; font-weight: bold;' : '';

            tableHTML += `
                <tr>
                    <td>${usage.dateWithDay}</td>
                    <td>${badgeHtml}</td>
                    <td style="${beforeStyle}">${beforeRemaining}일</td>
                    <td>${usage.days}일</td>
                    <td style="${afterStyle}">${afterRemaining}일</td>
                </tr>
            `;
        });

        remainingLeaveTableBody.innerHTML = tableHTML || '<tr><td colspan="5" style="text-align: center; padding: 40px;">연차 사용 내역이 없습니다.</td></tr>';
        remainingLeaveModal.classList.add('show');
    }

    // 날짜 포맷팅 함수 추가
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 발생 예정일 포맷팅 함수 (예: "2026년 7월 1일")
    function formatAccrualDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}년 ${month}월 ${day}일`;
    }

    // 연차 캘린더 연도 변경 버튼
    const prevYearBtn = document.getElementById('prevYearBtn');
    const nextYearBtn = document.getElementById('nextYearBtn');

    if (prevYearBtn) {
        prevYearBtn.addEventListener('click', async function() {
            currentCalendarYear--;
            console.log(`[DEBUG] 이전 연도로 이동: ${currentCalendarYear}`);
            await loadYearData(currentCalendarYear);
        });
    }

    if (nextYearBtn) {
        nextYearBtn.addEventListener('click', async function() {
            currentCalendarYear++;
            console.log(`[DEBUG] 다음 연도로 이동: ${currentCalendarYear}`);
            await loadYearData(currentCalendarYear);
        });
    }

    // 페이지 초기화
    initializeVacationPage();
});
