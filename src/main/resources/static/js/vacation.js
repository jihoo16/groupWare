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

    // 전역 변수
    let currentUserIdx = null;
    let vacationInfo = null;
    let vacationHistory = [];
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

    // 총 연차 카드 하단에 근속가산 예정 정보 표시 (표시 연도 기준, 해당자만)
    function updateTotalDaysSubInfo() {
        const totalSubInfoEl = document.querySelector('.summary-card.total .sub-info');
        if (!totalSubInfoEl || !vacationInfo) return;

        if (!vacationInfo.empJoinDate) {
            totalSubInfoEl.textContent = '';
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const joinDate  = new Date(vacationInfo.empJoinDate + 'T00:00:00');
        const year      = currentCalendarYear;
        const todayYear = today.getFullYear();

        // 과거 연도는 표시 불필요
        if (year < todayYear) {
            totalSubInfoEl.textContent = '';
            return;
        }

        // 표시 연도 안에 있는 근속가산 milestone 탐색 (만 3·5·7…21년, 최대 누적 10일)
        let accumulated = 0;
        let milestone   = null;
        for (let sy = 3; sy <= 21; sy += 2) {
            const milestoneDate = new Date(joinDate);
            milestoneDate.setFullYear(milestoneDate.getFullYear() + sy);
            const mYear = milestoneDate.getFullYear();

            if (mYear < year) {
                // 표시 연도 이전 → 누적만
                accumulated++;
                if (accumulated >= 10) break;
            } else if (mYear === year) {
                // 표시 연도 안에 있는 milestone
                if (accumulated < 10) {
                    // 현재 연도 조회 시: 이미 지난 날짜는 제외
                    if (year === todayYear && milestoneDate <= today) {
                        accumulated++;
                        if (accumulated >= 10) break;
                        continue; // 이미 달성 → 다음 milestone 탐색
                    }
                    milestone = { years: sy, date: milestoneDate };
                }
                break;
            } else {
                // 표시 연도 이후 → 없음
                break;
            }
        }

        if (milestone) {
            const m = milestone.date.getMonth() + 1;
            const d = milestone.date.getDate();
            totalSubInfoEl.textContent = `만 ${milestone.years}년 달성 (${m}월 ${d}일) 이후 +1일`;
        } else {
            totalSubInfoEl.textContent = '';
        }
    }

    // 연차 사용 내역 테이블 업데이트
    function updateVacationHistoryTable(history) {
        const tbody = document.querySelector('.history-table tbody');
        if (!tbody) return;

        if (!history || history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">연차 사용 내역이 없습니다.</td></tr>';
            return;
        }

        // days > 0인 레코드만 표시 (경조사만 있는 레코드는 제외)
        const filteredHistory = history.filter(item => item.days && parseFloat(item.days) > 0);

        if (filteredHistory.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">연차 사용 내역이 없습니다.</td></tr>';
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
            const approvalBadge = item.isApproved
                ? `<span class="status-badge approved"><i class="fas fa-check"></i> 승인</span>`
                : `<span class="status-badge pending"><i class="fas fa-clock"></i> 대기</span>`;

            return `
                <tr data-document-idx="${documentIdx}" onclick="location.href='/approval/vacation/detail?documentIdx=${documentIdx}'">
                    <td>${applyDateWithDay}</td>
                    <td>${vacType}</td>
                    <td>${startDateWithDay}</td>
                    <td>${endDateWithDay}</td>
                    <td>${days}일</td>
                    <td>${approvalBadge}</td>
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

        // 2. 연차 정보 조회 (vacation_balance 기반)
        vacationInfo = await fetchVacationInfo(currentUserIdx, currentYear);
        if (vacationInfo) {
            updateVacationSummaryCards(vacationInfo);
        }

        // 3. 연차 사용 내역 조회
        vacationHistory = await fetchVacationHistory(currentUserIdx, currentYear);
        console.log('[DEBUG] 로드된 연차 내역:', vacationHistory);
        updateVacationHistoryTable(vacationHistory);

        // 4. 연간 달력 렌더링
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

        // 2. 연차 정보 조회 (vacation_balance 기반)
        vacationInfo = await fetchVacationInfo(currentUserIdx, year);

        if (vacationInfo) {
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

    // 총 연차 모달 열기 및 데이터 채우기 (vacation_balance 기반)
    function openTotalLeaveModal() {
        const breakdownEl = document.getElementById('totalLeaveBreakdown');

        if (!vacationInfo) {
            breakdownEl.innerHTML = `
                <div class="lb-no-data">
                    <i class="fas fa-exclamation-circle" style="font-size: 36px; margin-bottom: 12px; color: #ff9800; display: block;"></i>
                    연차 정보를 불러올 수 없습니다.
                </div>
            `;
            totalLeaveModal.classList.add('show');
            return;
        }

        // 숫자 변환 헬퍼 (BigDecimal → float, null/undefined → 0)
        const n = (val) => (val !== null && val !== undefined) ? parseFloat(val) : 0;

        const year             = vacationInfo.year || new Date().getFullYear();
        const annualLeaveDays  = n(vacationInfo.annualLeaveDays);
        const monthlyLeaveDays = n(vacationInfo.monthlyLeaveDays);
        const proportionalDays = n(vacationInfo.proportionalDays);
        const compensatoryDays = n(vacationInfo.compensatoryDays);
        const expiredMonthlyDays = n(vacationInfo.expiredMonthlyDays);
        const totalDays        = n(vacationInfo.totalDays);
        const usedDays         = n(vacationInfo.usedDays);
        const remainingDays    = n(vacationInfo.remainingDays);

        const today     = new Date(); today.setHours(0, 0, 0, 0);
        const yearStart = new Date(year, 0, 1);  // 표시 연도 1월 1일

        // ─── 부여 연차 내역 rows ─────────────────────────────────────────
        let accrualRows = '';

        // Case 1: 1년 초과 근속자 — 기본연차 + 근속가산 상세
        if (annualLeaveDays > 0) {
            accrualRows += `
                <div class="lb-row">
                    <span><i class="fas fa-check-circle lb-icon-green"></i>기본연차</span>
                    <span>+15일</span>
                </div>`;

            if (vacationInfo.empJoinDate) {
                const joinDate = new Date(vacationInfo.empJoinDate + 'T00:00:00');

                // milestone을 3가지로 분류: 연초 이전 누적 / 올해 획득 / 올해 예정
                const pastMilestones   = [];  // milestone < yearStart (Jan 1)
                const earnedThisYear   = [];  // yearStart <= milestone <= today, 표시연도 내
                const upcomingThisYear = [];  // today < milestone, 표시연도 내

                let totalCounted = 0;
                for (let sy = 3; sy <= 21; sy += 2) {
                    if (totalCounted >= 10) break;
                    const mDate = new Date(joinDate);
                    mDate.setFullYear(joinDate.getFullYear() + sy);
                    const mStr = formatDate(mDate);

                    if (mDate < yearStart) {
                        pastMilestones.push({ years: sy, dateStr: mStr });
                        totalCounted++;
                    } else if (mDate.getFullYear() === year) {
                        if (mDate <= today) {
                            earnedThisYear.push({ years: sy, dateStr: mStr });
                        } else {
                            upcomingThisYear.push({ years: sy, dateStr: mStr });
                        }
                        totalCounted++;
                    }
                }

                // 연초 기준 누적 근속가산
                if (pastMilestones.length > 0) {
                    accrualRows += `<div class="lb-seniority-group">`;
                    accrualRows += `
                        <div class="lb-seniority-header">
                            <i class="fas fa-history lb-icon-blue"></i>근속가산 누적 (연초 기준 +${pastMilestones.length}일)
                        </div>`;
                    pastMilestones.forEach(m => {
                        accrualRows += `
                            <div class="lb-row lb-seniority-item">
                                <span><i class="fas fa-check lb-icon-green"></i>만 ${m.years}년 달성 (${m.dateStr})</span>
                                <span>+1일</span>
                            </div>`;
                    });
                    accrualRows += `</div>`;
                }

                // 올해 이미 획득한 근속가산
                earnedThisYear.forEach(m => {
                    accrualRows += `
                        <div class="lb-row lb-seniority-new">
                            <span>🎉 만 ${m.years}년 달성 (${m.dateStr}) <span class="lb-tag lb-tag-new">올해 추가</span></span>
                            <span>+1일</span>
                        </div>`;
                });

                // 올해 아직 미획득 (예정)
                upcomingThisYear.forEach(m => {
                    accrualRows += `
                        <div class="lb-row lb-seniority-upcoming">
                            <span>⏳ 만 ${m.years}년 예정 (${m.dateStr}) <span class="lb-tag lb-tag-upcoming">이번 연도 예정</span></span>
                            <span>+1일</span>
                        </div>`;
                });

            } else if (annualLeaveDays > 15) {
                // empJoinDate 없으면 lump sum 표시
                accrualRows += `
                    <div class="lb-row">
                        <span><i class="fas fa-history lb-icon-blue"></i>근속가산 연차</span>
                        <span>+${annualLeaveDays - 15}일</span>
                    </div>`;
            }
        }

        // 비례연차 (입사연도)
        if (proportionalDays > 0) {
            accrualRows += `
                <div class="lb-row">
                    <span><i class="fas fa-calculator lb-icon-blue"></i>비례연차 (입사연도)</span>
                    <span>+${proportionalDays}일</span>
                </div>`;
        }

        // 유효 월차
        if (monthlyLeaveDays > 0) {
            accrualRows += `<div class="lb-row"><span>월차</span><span>+${monthlyLeaveDays}일</span></div>`;
        }

        // 보상휴가
        if (compensatoryDays > 0) {
            accrualRows += `<div class="lb-row"><span>보상휴가</span><span>+${compensatoryDays}일</span></div>`;
        }

        if (!accrualRows) {
            accrualRows = `<div class="lb-row"><span style="color:#aaa;">부여된 연차가 없습니다</span></div>`;
        }

        // ─── 차감/잔여 ────────────────────────────────────────────────────
        const expiredRow = expiredMonthlyDays > 0
            ? `<div class="lb-row negative"><span>소멸 월차</span><span>-${expiredMonthlyDays}일</span></div>`
            : '';
        const remainingClass = remainingDays < 0 ? 'remaining-row negative' : 'remaining-row';

        // ─── 다음 발생 예정 섹션 ─────────────────────────────────────────
        const nextAccrualItems = [];

        // 표시 연도 이후 첫 번째 근속가산 milestone
        if (vacationInfo.empJoinDate && annualLeaveDays > 0) {
            const joinDate = new Date(vacationInfo.empJoinDate + 'T00:00:00');
            let counted = 0;
            let found   = false;
            for (let sy = 3; sy <= 21 && !found; sy += 2) {
                if (counted >= 10) break;
                const mDate = new Date(joinDate);
                mDate.setFullYear(joinDate.getFullYear() + sy);

                if (mDate < yearStart) { counted++; continue; }
                if (mDate.getFullYear() === year) { counted++; continue; }

                // 표시 연도 이후 → 첫 번째 미래 milestone
                nextAccrualItems.push(`
                    <div class="lb-row next-accrual">
                        <span>📅 만 ${sy}년 근속가산 (${formatDate(mDate)})</span>
                        <span>+1일 예정</span>
                    </div>`);
                found = true;
            }
        }

        // vacation_balance의 nextAccrual (월차, 비례연차 등 — 근속 제외)
        if (vacationInfo.nextAccrualDate) {
            const type = vacationInfo.nextAccrualType || '';
            if (!type.includes('근속')) {
                const d    = new Date(vacationInfo.nextAccrualDate + 'T00:00:00');
                const days = n(vacationInfo.nextAccrualDays);
                nextAccrualItems.push(`
                    <div class="lb-row next-accrual">
                        <span>📅 ${formatDate(d)}</span>
                        <span>${type}&nbsp;+${days}일</span>
                    </div>`);
            }
        }

        const nextAccrualSectionHtml = nextAccrualItems.length > 0 ? `
            <div class="lb-section">
                <div class="lb-section-title">다음 발생 예정</div>
                ${nextAccrualItems.join('')}
            </div>
        ` : '';

        breakdownEl.innerHTML = `
            <div class="lb-year-title">${year}년 연차 현황</div>

            <div class="lb-section">
                <div class="lb-section-title">부여 연차 내역</div>
                ${accrualRows}
                <div class="lb-divider"></div>
                <div class="lb-row total-row">
                    <span>부여 합계</span>
                    <strong>${totalDays}일</strong>
                </div>
            </div>

            <div class="lb-section">
                <div class="lb-section-title">차감 / 잔여</div>
                ${expiredRow}
                <div class="lb-row"><span>사용 연차</span><span>-${usedDays}일</span></div>
                <div class="lb-divider"></div>
                <div class="lb-row ${remainingClass}">
                    <span>현재 잔여</span>
                    <strong>${remainingDays}일</strong>
                </div>
            </div>

            ${nextAccrualSectionHtml}
        `;

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
            const remaining = parseFloat(vacationInfo.remainingDays);
            console.log('[잔여연차 모달] remainingDays:', remaining, 'type:', typeof vacationInfo.remainingDays);

            // 음수일 경우 빨간색으로 표시
            if (remaining < 0) {
                remainingLeaveSummary.innerHTML = `<span style="color: #dc3545; font-weight: bold;">${remaining}일</span>`;
            } else {
                remainingLeaveSummary.textContent = `${remaining}일`;
            }
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
