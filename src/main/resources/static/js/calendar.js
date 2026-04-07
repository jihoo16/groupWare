// 일정관리 페이지 스크립트
document.addEventListener('DOMContentLoaded', function() {
    // 검색 유틸리티 (공통)
    const searchUtils = new SearchUtils();

    // 전역 변수 CURRENT_USER 사용 (layout.html에서 주입됨)
    if (!window.CURRENT_USER || !window.CURRENT_USER.idx) {
        console.warn('세션 정보가 없습니다.');
        window.location.href = '/login';
        return;
    }

    const currentUserIdx = window.CURRENT_USER.idx;
    const currentUser = window.CURRENT_USER.empName;
    console.log('현재 로그인 사용자:', currentUser, '(idx:', currentUserIdx, ')');

    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthTitle = document.getElementById('currentMonthTitle');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const todayBtn = document.getElementById('todayBtn');

    let currentDate = new Date();
    let currentView = 'month'; // 기본값: 월간 뷰

    // 공휴일 데이터 (년도별 캐시)
    let holidays = {};
    let loadedYears = new Set(); // 로드된 년도 추적

    // 필터링된 유형/팀을 저장하는 전역 변수
    let activeTypeFilters = ['business', 'meeting-room', 'leave', 'etc'];
    let activeTeamFilters = [];

    // 드래그 선택 관련 변수
    let isDragging = false;
    let dragStartDate = null;
    let dragEndDate = null;
    let selectedCells = [];

    // 일정 데이터 (서버에서 로드)
    let schedules = [];

    // 디버깅을 위한 전역 접근 (개발용)
    window.DEBUG_getSchedules = () => ({
        schedules: schedules,
        activeTypeFilters: activeTypeFilters,
        activeTeamFilters: activeTeamFilters,
        count: schedules.length,
        leaveCount: schedules.filter(s => s.type === 'leave').length
    });

    // 탭 및 팀 관련 변수
    let currentQuickEventTab = 'personal'; // 'personal' or 'team'
    let quickTeamsList = []; // 팀 목록
    let selectedTeam = null; // 선택된 팀 정보

    // 팀 색상 맵
    const teamColors = {
        'dev': '#1e88e5',
        'design': '#ec407a',
        'marketing': '#fb8c00',
        'sales': '#43a047',
        'hr': '#8e24aa'
    };

    // 일정 데이터 로드 함수
    async function loadSchedules(startDate, endDate) {
        try {
            const response = await fetch(`/api/calendar/events?startDate=${startDate}&endDate=${endDate}`);
            const data = await response.json();

            if (data.success) {
                // API 응답을 프론트엔드 포맷으로 변환
                schedules = data.events.map(event => {
                    // participants가 객체 배열인 경우 이름만 추출
                    let participantNames = [];
                    if (event.participants && Array.isArray(event.participants)) {
                        participantNames = event.participants.map(p =>
                            typeof p === 'string' ? p : (p.userName || p.name || '')
                        ).filter(name => name !== '');
                    }

                    return {
                        id: event.idx,
                        idx: event.idx,
                        date: event.startDate,
                        type: event.eventType,
                        title: event.eventTitle,
                        participants: participantNames,
                        creator: event.creatorName,
                        creatorIdx: event.creatorIdx,
                        time: event.startTime && event.endTime ?
                              `${event.startTime} - ${event.endTime}` : '종일',
                        location: event.location || '-',
                        description: event.eventDescription || '-',
                        startDate: event.startDate,
                        endDate: event.endDate,
                        startTime: event.startTime,
                        endTime: event.endTime,
                        groupId: event.groupId,
                        isAllDay: event.isAllDay
                    };
                });
                console.log(`일정 ${schedules.length}개 로드됨`);
            } else {
                console.error('일정 조회 실패:', data.message);
                schedules = [];
            }
        } catch (error) {
            console.error('일정 로드 중 오류:', error);
            schedules = [];
        }
    }

    // 특정 년도 공휴일 데이터 로드
    async function loadHolidaysByYear(year) {
        try {
            const response = await fetch(`/api/holidays?year=${year}`);
            if (!response.ok) {
                throw new Error(`${year}년 공휴일 데이터를 불러오는데 실패했습니다.`);
            }

            const yearHolidays = await response.json();
            console.log(`[CalendarMain] ${year}년 공휴일 로드 완료:`, Object.keys(yearHolidays).length, '건');
            return yearHolidays;
        } catch (error) {
            console.error(`[CalendarMain] ${year}년 공휴일 로드 실패:`, error);
            return {};
        }
    }

    // 특정 년도 공휴일 보장 (없으면 로드)
    async function loadHolidays(year) {
        if (!loadedYears.has(year)) {
            const yearHolidays = await loadHolidaysByYear(year);
            Object.assign(holidays, yearHolidays); // 기존 holidays 객체에 병합
            loadedYears.add(year);
            console.log(`[CalendarMain] ${year}년 공휴일 캐시 추가`);
        }
    }

    // 특정 날짜가 공휴일인지 확인
    function isHoliday(date) {
        const dateStr = formatDate(date);
        return !!holidays[dateStr];
    }

    // 특정 날짜의 공휴일 정보 가져오기
    function getHolidayInfo(date) {
        const dateStr = formatDate(date);
        if (holidays[dateStr]) {
            return {
                holidayDate: dateStr,
                holidayName: holidays[dateStr]
            };
        }
        return null;
    }

    // 날짜를 YYYY-MM-DD 형식으로 변환
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 현재 뷰 새로고침
    async function reloadCurrentView() {
        switch(currentView) {
            case 'day':
                await renderDayView();
                break;
            case 'week':
                await renderWeekView();
                break;
            case 'month':
            default:
                await renderCalendar();
                break;
        }
    }

    // 이전 버튼
    prevMonthBtn.addEventListener('click', async function() {
        switch(currentView) {
            case 'day':
                currentDate.setDate(currentDate.getDate() - 1);
                await renderDayView();
                break;
            case 'week':
                currentDate.setDate(currentDate.getDate() - 7);
                await renderWeekView();
                break;
            case 'month':
            default:
                currentDate.setMonth(currentDate.getMonth() - 1);
                await renderCalendar();
                break;
        }
    });

    // 다음 버튼
    nextMonthBtn.addEventListener('click', async function() {
        switch(currentView) {
            case 'day':
                currentDate.setDate(currentDate.getDate() + 1);
                await renderDayView();
                break;
            case 'week':
                currentDate.setDate(currentDate.getDate() + 7);
                await renderWeekView();
                break;
            case 'month':
            default:
                currentDate.setMonth(currentDate.getMonth() + 1);
                await renderCalendar();
                break;
        }
    });

    // 연/월 제목 클릭 이벤트
    currentMonthTitle.addEventListener('click', function() {
        openYearMonthSelectorModal();
    });

    // 오늘 버튼 클릭 이벤트
    todayBtn.addEventListener('click', async function() {
        currentDate = new Date();

        // 현재 뷰에 맞게 렌더링
        switch(currentView) {
            case 'day':
                await renderDayView();
                break;
            case 'week':
                await renderWeekView();
                break;
            case 'month':
            default:
                await renderCalendar();
                break;
        }
    });

    // 마우스 휠 스크롤 이벤트 - 공통 함수
    let isScrolling = false;
    const scrollDebounceTime = 300; // 300ms 디바운스

    function handleWheelNavigation(e) {
        // 스크롤바 영역에서의 스크롤은 제외 (세로 스크롤만 허용)
        const target = e.target;
        const bodyWrapper = target.closest('.week-body-wrapper, .day-body-wrapper');

        // 주간/일간 뷰의 body-wrapper 내부에서는 세로 스크롤 허용
        if (bodyWrapper) {
            // Shift 키를 누른 경우만 날짜 이동
            if (!e.shiftKey) {
                return; // 일반 스크롤 허용
            }
        }

        e.preventDefault();

        // 이미 스크롤 중이면 무시
        if (isScrolling) return;

        isScrolling = true;

        // 현재 뷰에 따라 다른 동작
        switch(currentView) {
            case 'day':
                // 하루씩 이동
                if (e.deltaY > 0) {
                    currentDate.setDate(currentDate.getDate() + 1);
                } else if (e.deltaY < 0) {
                    currentDate.setDate(currentDate.getDate() - 1);
                }
                renderDayView();
                break;
            case 'week':
                // 일주일씩 이동
                if (e.deltaY > 0) {
                    currentDate.setDate(currentDate.getDate() + 7);
                } else if (e.deltaY < 0) {
                    currentDate.setDate(currentDate.getDate() - 7);
                }
                renderWeekView();
                break;
            case 'month':
            default:
                // 한달씩 이동
                if (e.deltaY > 0) {
                    currentDate.setMonth(currentDate.getMonth() + 1);
                } else if (e.deltaY < 0) {
                    currentDate.setMonth(currentDate.getMonth() - 1);
                }
                renderCalendar();
                break;
        }

        // 디바운스: 일정 시간 후 다시 스크롤 가능
        setTimeout(() => {
            isScrolling = false;
        }, scrollDebounceTime);
    }

    // 월간 뷰 - 마우스 휠 이벤트
    calendarGrid.addEventListener('wheel', handleWheelNavigation, { passive: false });

    // 일정이 필터를 통과하는지 확인하는 함수
    function shouldShowSchedule(schedule) {
        // 유형 필터 체크 (선택된 유형만 표시)
        const typeMatch = activeTypeFilters.length > 0 && activeTypeFilters.includes(schedule.type);

        // 팀 필터 체크 (팀 필터가 있는 경우에만)
        let teamMatch = true;
        if (activeTeamFilters.length > 0 && schedule.teamIdx) {
            teamMatch = activeTeamFilters.includes(schedule.teamIdx.toString());
        }

        return typeMatch && teamMatch;
    }

    // 전체 일정에 track 할당 (multi-day 일정이 같은 줄에 연속되도록)
    function assignTracksToSchedules() {
        // multi-day 일정만 필터링
        const multiDaySchedules = schedules.filter(s => {
            const dayDiff = Math.ceil((new Date(s.endDate) - new Date(s.startDate)) / (1000 * 60 * 60 * 24));
            return dayDiff >= 1;
        });

        // groupId로 그룹화 (같은 일정은 하나로 취급)
        const scheduleGroups = new Map();
        multiDaySchedules.forEach(schedule => {
            const groupId = schedule.groupId || schedule.id;
            if (!scheduleGroups.has(groupId)) {
                scheduleGroups.set(groupId, schedule);
            }
        });

        // 고유한 multi-day 일정들만 추출하고 시작일 순으로 정렬
        const uniqueSchedules = Array.from(scheduleGroups.values());
        uniqueSchedules.sort((a, b) => {
            const aStart = new Date(a.startDate).getTime();
            const bStart = new Date(b.startDate).getTime();
            if (aStart !== bStart) return aStart - bStart;
            const aEnd = new Date(a.endDate).getTime();
            const bEnd = new Date(b.endDate).getTime();
            return bEnd - aEnd; // 종료일이 늦은 것이 먼저
        });

        // track 할당 (겹치는 일정들을 다른 track에 배치)
        const tracks = []; // 각 track에 배치된 일정들

        uniqueSchedules.forEach(schedule => {
            const scheduleStart = new Date(schedule.startDate);
            const scheduleEnd = new Date(schedule.endDate);

            // 배치 가능한 track 찾기
            let assignedTrack = -1;
            for (let i = 0; i < tracks.length; i++) {
                const trackSchedules = tracks[i];
                let canPlace = true;

                // 이 track의 모든 일정과 겹치지 않는지 확인
                for (const trackSchedule of trackSchedules) {
                    const trackStart = new Date(trackSchedule.startDate);
                    const trackEnd = new Date(trackSchedule.endDate);

                    const overlaps = !(scheduleEnd < trackStart || scheduleStart > trackEnd);
                    if (overlaps) {
                        canPlace = false;
                        break;
                    }
                }

                if (canPlace) {
                    assignedTrack = i;
                    break;
                }
            }

            if (assignedTrack === -1) {
                assignedTrack = tracks.length;
                tracks.push([]);
            }

            // track에 추가
            tracks[assignedTrack].push(schedule);

            // 같은 groupId의 모든 일정에 track 할당
            const groupId = schedule.groupId || schedule.id;
            schedules.forEach(s => {
                const sGroupId = s.groupId || s.id;
                if (sGroupId === groupId) {
                    s.track = assignedTrack;
                }
            });
        });
    }

    // 달력 렌더링
    // 달력 그리드 HTML 빌드 (공통 함수 - 현재 schedules/holidays 상태 기준으로 렌더링)
    function buildMonthGridHTML(year, month, firstDayWeek, lastDate, prevLastDate, remainingCells) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 오늘 버튼 표시/숨김 처리
        const isCurrentMonth = (year === today.getFullYear() && month === today.getMonth());
        if (isCurrentMonth) {
            todayBtn.classList.remove('show');
        } else {
            todayBtn.classList.add('show');
        }

        let html = '';

        // 이전 달 날짜
        for (let i = firstDayWeek - 1; i >= 0; i--) {
            html += createCalendarCell(year, month - 1, prevLastDate - i, true);
        }

        // 현재 달 날짜
        for (let day = 1; day <= lastDate; day++) {
            html += createCalendarCell(year, month, day, false);
        }

        // 다음 달 날짜
        for (let day = 1; day <= remainingCells; day++) {
            html += createCalendarCell(year, month + 1, day, true);
        }

        return html;
    }

    async function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const prevLastDay = new Date(year, month, 0);

        const prevMonthYear = new Date(year, month - 1, 1).getFullYear();
        const nextMonthYear = new Date(year, month + 1, 1).getFullYear();

        const firstDayWeek = firstDay.getDay();
        const calendarStartDate = new Date(year, month, 1);
        calendarStartDate.setDate(calendarStartDate.getDate() - firstDayWeek);

        const totalCells = Math.ceil((firstDayWeek + lastDay.getDate()) / 7) * 7;
        const remainingCells = totalCells - (firstDayWeek + lastDay.getDate());
        const calendarEndDate = new Date(year, month + 1, remainingCells);

        const lastDate = lastDay.getDate();
        const prevLastDate = prevLastDay.getDate();

        // Phase 1: 월 타이틀 + 빈 그리드 즉시 렌더링 (API 기다리지 않음)
        currentMonthTitle.textContent = `${year}년 ${month + 1}월`;
        schedules = [];
        calendarGrid.innerHTML = buildMonthGridHTML(year, month, firstDayWeek, lastDate, prevLastDate, remainingCells);
        calendarGrid.classList.add('loading');

        // Phase 2: 공휴일 + 일정 병렬 로드
        const startDate = formatDate(calendarStartDate);
        const endDate = formatDate(calendarEndDate);
        await Promise.all([
            loadHolidays(prevMonthYear),
            loadHolidays(year),
            loadHolidays(nextMonthYear),
            loadSchedules(startDate, endDate)
        ]);

        // Phase 3: 일정/공휴일 포함 재렌더링
        assignTracksToSchedules();
        calendarGrid.innerHTML = buildMonthGridHTML(year, month, firstDayWeek, lastDate, prevLastDate, remainingCells);
        calendarGrid.classList.remove('loading');
        attachScheduleClickEvents();
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

        // 공휴일 체크
        const holidayInfo = getHolidayInfo(date);
        if (holidayInfo) {
            classes.push('holiday'); // 공휴일 클래스 적용 (현재달/이전달/다음달 모두)
            if (!isOtherMonth) {
                classes.push('weekend'); // 현재달 공휴일은 weekend도 추가 (빨간색)
            }
        } else if (dayOfWeek === 0) {
            classes.push('weekend');
        } else if (dayOfWeek === 6) {
            classes.push('saturday');
        }

        // 해당 날짜의 일정 가져오기 (시작일~종료일 사이에 포함되는 일정 모두)
        const daySchedules = schedules.filter(s => {
            const scheduleStart = new Date(s.startDate);
            const scheduleEnd = new Date(s.endDate);
            const currentDate = new Date(dateStr);
            const dateMatch = currentDate >= scheduleStart && currentDate <= scheduleEnd;

            // 필터링 조건 추가
            return dateMatch && shouldShowSchedule(s);
        });

        // 연속 일정을 상단에 정렬 (시작일이 빠른 순 -> 종료일이 늦은 순)
        daySchedules.sort((a, b) => {
            const aDayDiff = Math.ceil((new Date(a.endDate) - new Date(a.startDate)) / (1000 * 60 * 60 * 24));
            const bDayDiff = Math.ceil((new Date(b.endDate) - new Date(b.startDate)) / (1000 * 60 * 60 * 24));
            const aIsMultiDay = aDayDiff >= 1;
            const bIsMultiDay = bDayDiff >= 1;

            // 연속 일정을 먼저
            if (aIsMultiDay && !bIsMultiDay) return -1;
            if (!aIsMultiDay && bIsMultiDay) return 1;

            // 연속 일정들 사이에서는 시작일이 빠른 것을 먼저
            if (aIsMultiDay && bIsMultiDay) {
                const startCompare = a.startDate.localeCompare(b.startDate);
                if (startCompare !== 0) return startCompare;

                // 시작일이 같으면 종료일이 늦은 것을 먼저 (더 긴 일정이 위로)
                return b.endDate.localeCompare(a.endDate);
            }

            return 0;
        });

        // 내 일정이 있는지 확인 (연속 일정 시작/중간/종료 구분)
        const mySchedules = daySchedules.filter(s => s.participants.includes(currentUser));
        if (mySchedules.length > 0) {
            // 연속 일정이 있는지 확인
            const hasMultiDayStart = mySchedules.some(s => {
                const dayDiff = Math.ceil((new Date(s.endDate) - new Date(s.startDate)) / (1000 * 60 * 60 * 24));
                return dayDiff >= 1 && dateStr === s.startDate;
            });
            const hasMultiDayEnd = mySchedules.some(s => {
                const dayDiff = Math.ceil((new Date(s.endDate) - new Date(s.startDate)) / (1000 * 60 * 60 * 24));
                return dayDiff >= 1 && dateStr === s.endDate;
            });
            const hasMultiDayMiddle = mySchedules.some(s => {
                const dayDiff = Math.ceil((new Date(s.endDate) - new Date(s.startDate)) / (1000 * 60 * 60 * 24));
                return dayDiff >= 1 && dateStr !== s.startDate && dateStr !== s.endDate;
            });
            const hasSingleDay = mySchedules.some(s => {
                const dayDiff = Math.ceil((new Date(s.endDate) - new Date(s.startDate)) / (1000 * 60 * 60 * 24));
                return dayDiff < 1;
            });

            // 클래스 추가
            if (hasMultiDayStart) classes.push('has-my-schedule-start');
            if (hasMultiDayMiddle) classes.push('has-my-schedule-middle');
            if (hasMultiDayEnd) classes.push('has-my-schedule-end');
            if (hasSingleDay) classes.push('has-my-schedule');
        }

        // 일정 HTML 생성 - multi-day와 시간 일정을 분리
        let multiDayHTML = '';
        let timeSchedulesHTML = '';
        const maxDisplay = 5; // 최대 표시 개수 (multi-day 겹침 고려하여 증가)

        // track 순서대로 정렬 (같은 track끼리 묶이도록)
        daySchedules.sort((a, b) => {
            const aTrack = a.track !== undefined ? a.track : 999;
            const bTrack = b.track !== undefined ? b.track : 999;
            return aTrack - bTrack;
        });

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
            const isAllDay = schedule.time === '종일';

            let trackStyle = '';
            if (isMultiDay) {
                // 시작일, 중간일, 종료일 구분
                if (dateStr === schedule.startDate) {
                    scheduleClasses.push('multi-day-start');
                } else if (dateStr === schedule.endDate) {
                    scheduleClasses.push('multi-day-end');
                } else {
                    scheduleClasses.push('multi-day-middle');
                }

                // 전역적으로 할당된 track 번호 사용
                const trackIndex = schedule.track !== undefined ? schedule.track : 0;
                trackStyle = ` style="--track: ${trackIndex};"`;

                // 일정 제목에 종일 표시 추가
                let displayTitle = `[종일] ${schedule.title}`;
                multiDayHTML += `<div class="schedule-item ${scheduleClasses.join(' ')}"${trackStyle} data-schedule-id="${schedule.id}" data-group-id="${schedule.groupId}">${displayTitle}</div>`;
            } else {
                // 단일 일정
                if (!isAllDay) {
                    // 단일 시간 일정 - 점으로 표시
                    scheduleClasses.push('time-dot');
                    const timeMatch = schedule.time.match(/(\d{2}:\d{2})/);
                    const startTime = timeMatch ? timeMatch[1] : '';
                    timeSchedulesHTML += `<div class="schedule-item ${scheduleClasses.join(' ')}" data-schedule-id="${schedule.id}" data-group-id="${schedule.groupId}" data-tip="${startTime} ${schedule.title}">
                        <span class="dot-time">${startTime}</span>
                        <span class="dot-title">${schedule.title}</span>
                    </div>`;
                } else {
                    // 단일 종일 일정
                    scheduleClasses.push('single-day');
                    let displayTitle = `[종일] ${schedule.title}`;
                    timeSchedulesHTML += `<div class="schedule-item ${scheduleClasses.join(' ')}" data-schedule-id="${schedule.id}" data-group-id="${schedule.groupId}">${displayTitle}</div>`;
                }
            }
        });

        // multi-day와 시간 일정 합치기
        let schedulesHTML = multiDayHTML;
        if (timeSchedulesHTML) {
            schedulesHTML += `<div class="time-schedules-wrapper">${timeSchedulesHTML}</div>`;
        }

        if (daySchedules.length > maxDisplay) {
            schedulesHTML += `<div class="more-schedules" data-date="${dateStr}" data-total="${daySchedules.length}">+${daySchedules.length - maxDisplay}개 더보기</div>`;
        }

        // multi-day 일정들의 최대 track 번호 계산 (시간 일정을 위한 offset 확보)
        let maxTrack = -1;
        daySchedules.forEach(schedule => {
            const startDateObj = new Date(schedule.startDate);
            const endDateObj = new Date(schedule.endDate);
            const dayDiff = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
            if (dayDiff >= 1 && schedule.track !== undefined) {
                maxTrack = Math.max(maxTrack, schedule.track);
            }
        });
        const multidayOffset = maxTrack >= 0 ? `--multiday-offset: ${(maxTrack + 1) * 24}px;` : '';

        // 공휴일 표시 (이전달/다음달도 포함)
        let holidayHTML = '';
        if (holidayInfo) {
            holidayHTML = `<span class="holiday-name">${holidayInfo.holidayName}</span>`;
        }

        return `
            <div class="${classes.join(' ')}" data-date="${dateStr}">
                <div class="cell-header">
                    <div class="cell-date">${day}${holidayHTML}</div>
                </div>
                <div class="schedule-list" style="${multidayOffset}">
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

        // 더보기 클릭 이벤트
        const moreSchedulesItems = document.querySelectorAll('.more-schedules');
        moreSchedulesItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                const dateStr = this.getAttribute('data-date');
                const cell = this.closest('.calendar-cell');
                openMoreSchedulesPopup(dateStr, cell);
            }, true);
        });
    }

    // 더보기 팝업 열기
    function openMoreSchedulesPopup(dateStr, cellElement) {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        // 팝업 타이틀 설정
        document.getElementById('moreSchedulesTitle').textContent = `${month}월 ${day}일`;

        // 해당 날짜의 모든 일정 가져오기
        const daySchedules = schedules.filter(s => {
            const scheduleStart = new Date(s.startDate);
            const scheduleEnd = new Date(s.endDate);
            const currentDate = new Date(dateStr);
            return currentDate >= scheduleStart && currentDate <= scheduleEnd;
        });

        // 일정 목록 HTML 생성
        let listHTML = '';
        if (daySchedules.length === 0) {
            listHTML = '<p style="text-align: center; color: #999; padding: 20px;">일정이 없습니다.</p>';
        } else {
            listHTML = '<div class="more-schedules-list">';
            daySchedules.forEach(schedule => {
                const isMySchedule = schedule.participants.includes(currentUser);
                const typeClass = schedule.type;
                const myClass = isMySchedule ? 'my-schedule' : '';

                listHTML += `
                    <div class="more-schedule-item ${typeClass} ${myClass}" data-schedule-id="${schedule.id}" data-group-id="${schedule.groupId}">
                        <div class="more-schedule-time">${schedule.time}</div>
                        <div class="more-schedule-title">${schedule.title}</div>
                        <div class="more-schedule-meta">${schedule.location}</div>
                    </div>
                `;
            });
            listHTML += '</div>';
        }

        document.getElementById('moreSchedulesList').innerHTML = listHTML;

        // 일정 클릭 이벤트 추가
        const scheduleItems = document.querySelectorAll('.more-schedule-item[data-schedule-id]');
        scheduleItems.forEach(item => {
            item.addEventListener('click', function() {
                const scheduleId = parseInt(this.getAttribute('data-schedule-id'));
                const groupId = this.getAttribute('data-group-id');
                closeMoreSchedulesPopup();
                openScheduleModal(scheduleId, groupId);
            });
        });

        // 팝업 위치 계산 및 표시
        const popup = document.getElementById('moreSchedulesPopup');
        const rect = cellElement.getBoundingClientRect();

        // 팝업을 일단 표시해서 크기를 알아냄
        popup.style.display = 'block';
        const popupRect = popup.getBoundingClientRect();

        // 기본 위치: 셀의 오른쪽 하단
        let left = rect.right + 10;
        let top = rect.top;

        // 화면 오른쪽을 넘어가면 왼쪽에 표시
        if (left + popupRect.width > window.innerWidth) {
            left = rect.left - popupRect.width - 10;
        }

        // 화면 하단을 넘어가면 위로 조정
        if (top + popupRect.height > window.innerHeight) {
            top = window.innerHeight - popupRect.height - 10;
        }

        // 화면 상단을 넘어가지 않도록
        if (top < 10) {
            top = 10;
        }

        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
    }

    // 더보기 팝업 닫기
    function closeMoreSchedulesPopup() {
        document.getElementById('moreSchedulesPopup').style.display = 'none';
    }

    // 더보기 팝업 닫기 이벤트
    document.getElementById('closeMoreSchedulesPopup').addEventListener('click', closeMoreSchedulesPopup);

    // 외부 클릭 시 팝업 닫기
    document.addEventListener('click', function(e) {
        const popup = document.getElementById('moreSchedulesPopup');
        if (popup.style.display === 'block' && !popup.contains(e.target) && !e.target.closest('.more-schedules')) {
            closeMoreSchedulesPopup();
        }
    });

    // 일정 모달 열기 (상세보기 모드)
    function openScheduleModal(scheduleId, groupId) {
        const schedule = schedules.find(s => s.id === scheduleId);
        if (!schedule) return;

        // 현재 일정 저장 (수정/삭제를 위해)
        currentEditingSchedule = schedule;

        // 모달 타이틀 설정
        document.getElementById('scheduleModalTitle').textContent = '일정 상세정보';

        // 상세 정보 표시
        document.getElementById('detailTitle').textContent = schedule.title;

        // 일정 유형 한글 변환
        const typeMap = {
            'leave': '연차/휴가',
            'business': '업무 일정',
            'meeting-room': '회의실 예약',
            'etc': '기타'
        };
        document.getElementById('detailType').textContent = typeMap[schedule.type] || schedule.type;

        // 기간 표시
        const startDate = new Date(schedule.startDate);
        const endDate = new Date(schedule.endDate);
        const startDateStr = `${startDate.getFullYear()}.${String(startDate.getMonth() + 1).padStart(2, '0')}.${String(startDate.getDate()).padStart(2, '0')}`;
        const endDateStr = `${endDate.getFullYear()}.${String(endDate.getMonth() + 1).padStart(2, '0')}.${String(endDate.getDate()).padStart(2, '0')}`;

        if (schedule.startDate === schedule.endDate) {
            document.getElementById('detailPeriod').textContent = startDateStr;
        } else {
            document.getElementById('detailPeriod').textContent = `${startDateStr} ~ ${endDateStr}`;
        }

        // 시간 표시
        document.getElementById('detailTime').textContent = schedule.time;

        // 장소 표시
        document.getElementById('detailLocation').textContent = schedule.location || '-';

        // 참석자 표시
        document.getElementById('detailParticipants').textContent = schedule.participants.length > 0
            ? schedule.participants.join(', ')
            : '-';

        // 설명 표시
        document.getElementById('detailDescription').textContent = schedule.description || '-';

        // 수정/삭제 버튼 표시 여부 결정
        const editBtn = document.getElementById('editScheduleBtn');
        const deleteBtn = document.getElementById('deleteScheduleBtn');

        // 1. 휴가/연차 일정은 수정/삭제 불가
        // 2. 본인이 생성한 일정만 수정/삭제 가능
        const isLeaveSchedule = schedule.type === 'leave';
        const isMySchedule = schedule.creatorIdx === currentUserIdx;

        if (isLeaveSchedule) {
            // 휴가는 전자결재 문서와 연동되므로 수정/삭제 불가
            editBtn.style.display = 'none';
            deleteBtn.style.display = 'none';
        } else if (!isMySchedule) {
            // 내가 생성한 일정이 아니면 수정/삭제 불가
            editBtn.style.display = 'none';
            deleteBtn.style.display = 'none';
        } else {
            // 내가 생성한 일반 일정은 수정/삭제 가능
            editBtn.style.display = 'inline-flex';
            deleteBtn.style.display = 'inline-flex';
        }

        // 모달 표시
        document.getElementById('scheduleDetailModal').classList.add('show');
    }

    // 수정 버튼 클릭 이벤트
    document.getElementById('editScheduleBtn').addEventListener('click', function() {
        if (!currentEditingSchedule) return;

        // 일정 수정 페이지로 이동 (일정 ID를 쿼리 파라미터로 전달)
        window.location.href = `/calendar/edit?id=${currentEditingSchedule.idx}`;
    });

    // 모달 닫기 함수
    function closeScheduleModal() {
        const modal = document.getElementById('scheduleDetailModal');
        modal.classList.remove('show');
    }

    // 일정 추가 모달 닫기 함수
    function closeAddScheduleModal() {
        const modal = document.getElementById('scheduleAddModal');
        modal.classList.remove('show');
    }

    // 상세보기 모달 닫기 이벤트
    document.getElementById('closeModal').addEventListener('click', closeScheduleModal);
    document.getElementById('closeModalBtn').addEventListener('click', closeScheduleModal);

    // 상세보기 모달 배경 클릭 시 닫기
    document.getElementById('scheduleDetailModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeScheduleModal();
        }
    });

    // 일정 추가 모달 닫기 이벤트
    document.getElementById('closeAddModal').addEventListener('click', closeAddScheduleModal);
    document.getElementById('closeAddModalBtn').addEventListener('click', closeAddScheduleModal);

    // 일정 추가 모달 배경 클릭 시 닫기
    document.getElementById('scheduleAddModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeAddScheduleModal();
        }
    });

    // 일정 삭제 버튼 클릭
    document.getElementById('deleteScheduleBtn').addEventListener('click', async function() {
        if (!currentEditingSchedule) return;

        const confirmed = await showDeleteConfirm('이 일정을 삭제하시겠습니까?');
        if (confirmed) {
            try {
                const response = await fetch(`/api/calendar/events/${currentEditingSchedule.idx}?userId=${currentUserIdx}`, {
                    method: 'DELETE'
                });

                const data = await response.json();

                if (data.success) {
                    showAlert('일정이 삭제되었습니다.', 'success');

                    // 달력 새로고침
                    await reloadCurrentView();

                    // 모달 닫기
                    closeScheduleModal();
                } else {
                    showAlert('일정 삭제 실패: ' + data.message, 'error');
                }
            } catch (error) {
                console.error('일정 삭제 중 오류:', error);
                showAlert('일정 삭제 중 오류가 발생했습니다.', 'error');
            }
        }
    });

    // ESC 키로 모달/팝업 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeScheduleModal();
            closeAddScheduleModal();
            closeYearMonthSelectorModal();
            closeMoreSchedulesPopup();
        }
    });

    // 일정 모달 관련 변수
    let selectedParticipants = [];
    let currentEditingSchedule = null; // 현재 수정 중인 일정 (null이면 추가 모드)

    // 직원 자동완성 관련 변수
    let allEmployees = []; // 전체 직원 목록
    let employeeDropdown = null;
    let participantInput = null;

    // 종일 체크박스 관련 요소
    const isAllDayCheckbox = document.getElementById('isAllDayCheckbox');
    const timeInputRow = document.getElementById('timeInputRow');
    const addScheduleStartTime = document.getElementById('scheduleStartTime');
    const addScheduleEndTime = document.getElementById('scheduleEndTime');

    // 종일 체크박스 이벤트
    if (isAllDayCheckbox) {
        isAllDayCheckbox.addEventListener('change', function() {
            toggleAddTimeInputs(!this.checked);

            if (this.checked) {
                // 종일로 변경 시 시간 필드 초기화
                addScheduleStartTime.value = '';
                addScheduleEndTime.value = '';
            } else {
                // 시간 일정으로 변경 시 기본값 설정
                if (!addScheduleStartTime.value) addScheduleStartTime.value = '09:00';
                if (!addScheduleEndTime.value) addScheduleEndTime.value = '18:00';
            }
        });
    }

    // 시간 입력 필드 활성화/비활성화 함수 (일정 추가용)
    function toggleAddTimeInputs(enabled) {
        if (!addScheduleStartTime || !addScheduleEndTime) return;

        addScheduleStartTime.disabled = !enabled;
        addScheduleEndTime.disabled = !enabled;

        if (enabled) {
            timeInputRow.style.opacity = '1';
            addScheduleStartTime.style.cursor = 'text';
            addScheduleEndTime.style.cursor = 'text';
        } else {
            timeInputRow.style.opacity = '0.5';
            addScheduleStartTime.style.cursor = 'not-allowed';
            addScheduleEndTime.style.cursor = 'not-allowed';
        }
    }

    // 날짜 셀 클릭 이벤트 연결 (이벤트 위임 방식)
    function attachDateCellClickEvents() {
        // 클릭 이벤트 (이벤트 위임)
        calendarGrid.addEventListener('click', function(e) {
            const cell = e.target.closest('.calendar-cell');
            if (!cell) return;

            // 일정 아이템 클릭은 제외
            if (e.target.closest('.schedule-item')) return;

            // 더보기 클릭은 제외
            if (e.target.closest('.more-schedules')) return;

            // 드래그 후 클릭은 무시
            if (selectedCells.length > 0) return;

            const dateStr = cell.getAttribute('data-date');
            openAddScheduleModal(dateStr);
        });

        // 마우스 다운 이벤트 (이벤트 위임)
        calendarGrid.addEventListener('mousedown', function(e) {
            const cell = e.target.closest('.calendar-cell');
            if (!cell) return;

            // 일정 아이템 클릭은 제외
            if (e.target.closest('.schedule-item')) return;

            // 더보기 클릭은 제외
            if (e.target.closest('.more-schedules')) return;

            // 다른 달의 날짜는 드래그 불가
            if (cell.classList.contains('other-month')) return;

            e.preventDefault();
            isDragging = true;
            dragStartDate = cell.getAttribute('data-date');
            selectedCells = [cell];
            cell.classList.add('drag-selecting');
        });

        // 마우스 엔터 이벤트 (이벤트 위임)
        calendarGrid.addEventListener('mouseenter', function(e) {
            if (!isDragging) return;

            const cell = e.target.closest('.calendar-cell');
            if (!cell) return;

            // 다른 달의 날짜는 드래그 불가
            if (cell.classList.contains('other-month')) return;

            dragEndDate = cell.getAttribute('data-date');
            updateDragSelection();
        }, true);

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
        // 폼 초기화
        document.getElementById('scheduleForm').reset();
        document.getElementById('scheduleStartDate').value = startDate;
        document.getElementById('scheduleEndDate').value = endDate;

        // 종일 체크박스 초기화
        if (isAllDayCheckbox) {
            isAllDayCheckbox.checked = false;
            toggleAddTimeInputs(true);
        }

        // 참여자 목록 초기화 (현재 사용자를 기본 참여자로 추가)
        selectedParticipants = [{
            id: currentUserIdx,
            name: currentUser,
            department: window.CURRENT_USER.empDeptName || '미지정',
            rank: window.CURRENT_USER.empPositionName || '미지정'
        }];
        renderParticipantsList();

        // 팀 선택 초기화
        selectedTeam = null;
        renderSelectedTeamTag();

        // 모달 표시
        document.getElementById('scheduleAddModal').classList.add('show');
    }

    // 일정 추가 버튼 클릭
    document.getElementById('addScheduleBtn').addEventListener('click', function() {
        // 상세한 일정 추가 페이지로 이동
        window.location.href = '/calendar/new';
    });

    // 일정 추가 모달 열기
    function openAddScheduleModal(dateStr) {
        // 폼 초기화
        document.getElementById('scheduleForm').reset();
        document.getElementById('scheduleStartDate').value = dateStr;
        document.getElementById('scheduleEndDate').value = dateStr;

        // 종일 체크박스 초기화
        if (isAllDayCheckbox) {
            isAllDayCheckbox.checked = false;
            toggleAddTimeInputs(true);
        }

        // 참여자 목록 초기화 (현재 사용자를 기본 참여자로 추가)
        selectedParticipants = [{
            id: currentUserIdx,
            name: currentUser,
            department: window.CURRENT_USER.empDeptName || '미지정',
            rank: window.CURRENT_USER.empPositionName || '미지정'
        }];
        renderParticipantsList();

        // 팀 선택 초기화
        selectedTeam = null;
        renderSelectedTeamTag();

        // 모달 표시
        document.getElementById('scheduleAddModal').classList.add('show');
    }

    // 직원 목록 로드
    async function loadEmployees() {
        try {
            const response = await fetch('/api/users');
            if (!response.ok) {
                throw new Error('직원 목록 로드 실패');
            }
            allEmployees = await response.json();
            console.log('직원 목록 로드 완료:', allEmployees.length, '명');
        } catch (error) {
            console.error('직원 목록 로드 중 오류:', error);
            allEmployees = [];
        }
    }

    // 키보드 네비게이션 관련 변수
    let filteredEmployees = [];
    let selectedDropdownIndex = -1;

    // 직원 드롭다운 표시
    function showEmployeeDropdown(searchText) {
        if (!employeeDropdown) {
            employeeDropdown = document.getElementById('employeeDropdown');
        }

        if (!searchText || searchText.length === 0) {
            employeeDropdown.style.display = 'none';
            filteredEmployees = [];
            selectedDropdownIndex = -1;
            return;
        }

        // 검색어로 필터링 (이름, 부서, 직급 + 초성 검색 — SearchUtils 공통)
        filteredEmployees = allEmployees.filter(emp => {
            const name = emp.empName || '';
            const dept = emp.empDeptName || '';
            const position = emp.empPositionName || '';

            // 이미 추가된 내부 직원은 제외
            const isAlreadyAdded = selectedParticipants.some(p => p.id === emp.idx);
            if (isAlreadyAdded) {
                return false;
            }

            return searchUtils.matchesAny(searchText, name, dept, position);
        }).slice(0, 10); // 최대 10개

        if (filteredEmployees.length === 0) {
            employeeDropdown.style.display = 'none';
            selectedDropdownIndex = -1;
            return;
        }

        // 선택 인덱스 초기화
        selectedDropdownIndex = -1;

        // 드롭다운 렌더링
        employeeDropdown.innerHTML = '';
        filteredEmployees.forEach((emp, index) => {
            const item = document.createElement('div');
            item.className = 'employee-dropdown-item';
            item.dataset.index = index;

            const initials = emp.empName ? emp.empName.substring(0, 1) : '?';

            item.innerHTML = `
                <div class="employee-avatar">${initials}</div>
                <div class="employee-info">
                    <div class="employee-name">${emp.empName || '이름 없음'}</div>
                    <div class="employee-detail">${emp.empDeptName || '부서 없음'} · ${emp.empPositionName || '직급 없음'}</div>
                </div>
            `;

            item.addEventListener('click', function() {
                addParticipantByEmployee(emp);
                participantInput.value = '';
                employeeDropdown.style.display = 'none';
                filteredEmployees = [];
                selectedDropdownIndex = -1;
            });

            item.addEventListener('mouseenter', function() {
                selectedDropdownIndex = index;
                updateDropdownSelection();
            });

            employeeDropdown.appendChild(item);
        });

        employeeDropdown.style.display = 'block';
    }

    // 드롭다운 선택 상태 업데이트
    function updateDropdownSelection() {
        const items = employeeDropdown.querySelectorAll('.employee-dropdown-item');
        items.forEach((item, index) => {
            if (index === selectedDropdownIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // 내부 직원으로 참석자 추가
    function addParticipantByEmployee(emp) {
        const participant = {
            id: emp.idx,
            name: emp.empName,
            department: emp.empDeptName || '미지정',
            rank: emp.empPositionName || '미지정'
        };

        // 중복 체크 (id 기준)
        if (!selectedParticipants.find(p => p.id === participant.id)) {
            selectedParticipants.push(participant);
            renderParticipantsList();
        }
    }

    // 외부인원으로 참석자 추가
    function addExternalParticipant(name) {
        const participant = {
            id: null,
            name: name,
            department: '외부',
            rank: '외부인원'
        };

        // 중복 체크 (외부 참석자끼리만 이름 중복 방지)
        if (!selectedParticipants.find(p => p.id === null && p.name === name)) {
            selectedParticipants.push(participant);
            renderParticipantsList();
        }
    }

    // 참석자 추가 (중복 체크) - 하위 호환성
    function addParticipant(name) {
        addExternalParticipant(name);
    }

    // 참여자 입력란 이벤트
    participantInput = document.getElementById('participantInput');
    employeeDropdown = document.getElementById('employeeDropdown');

    if (participantInput) {
        // 입력 시 자동완성
        participantInput.addEventListener('input', function(e) {
            const searchText = e.target.value.trim();
            showEmployeeDropdown(searchText);
        });

        // 포커스 시 드롭다운 표시
        participantInput.addEventListener('focus', function(e) {
            const searchText = e.target.value.trim();
            if (searchText) {
                showEmployeeDropdown(searchText);
            }
        });

        // 키보드 네비게이션
        participantInput.addEventListener('keydown', function(e) {
            const isDropdownOpen = employeeDropdown.style.display === 'block' && filteredEmployees.length > 0;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (isDropdownOpen) {
                    selectedDropdownIndex = Math.min(selectedDropdownIndex + 1, filteredEmployees.length - 1);
                    updateDropdownSelection();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (isDropdownOpen) {
                    selectedDropdownIndex = Math.max(selectedDropdownIndex - 1, 0);
                    updateDropdownSelection();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (isDropdownOpen && selectedDropdownIndex >= 0) {
                    // 드롭다운에서 선택된 직원 추가
                    const selectedEmp = filteredEmployees[selectedDropdownIndex];
                    addParticipantByEmployee(selectedEmp);
                    participantInput.value = '';
                    employeeDropdown.style.display = 'none';
                    filteredEmployees = [];
                    selectedDropdownIndex = -1;
                } else {
                    // 외부인원 추가
                    const name = participantInput.value.trim();
                    if (name) {
                        addExternalParticipant(name);
                        participantInput.value = '';
                        employeeDropdown.style.display = 'none';
                    }
                }
            } else if (e.key === 'Escape') {
                employeeDropdown.style.display = 'none';
                filteredEmployees = [];
                selectedDropdownIndex = -1;
            }
        });
    }

    // 참여자 추가 버튼 (외부인원 직접 입력용)
    document.getElementById('addParticipantBtn').addEventListener('click', function() {
        const name = participantInput.value.trim();
        if (name) {
            addParticipant(name);
            participantInput.value = '';
            employeeDropdown.style.display = 'none';
        }
    });

    // 드롭다운 외부 클릭 시 닫기
    document.addEventListener('click', function(e) {
        if (employeeDropdown && participantInput) {
            if (!participantInput.contains(e.target) && !employeeDropdown.contains(e.target)) {
                employeeDropdown.style.display = 'none';
            }
        }
    });

    // 참여자 목록 렌더링
    function renderParticipantsList() {
        const listContainer = document.getElementById('participantsList');
        listContainer.innerHTML = '';

        selectedParticipants.forEach(participant => {
            const tag = document.createElement('div');
            tag.className = 'participant-tag';
            const isExternal = participant.id === null;
            const badge = isExternal ? ' <span class="external-badge">외부</span>' : '';
            const canRemove = participant.id !== currentUserIdx;

            tag.innerHTML = `
                ${participant.name}${badge}
                ${canRemove ? `<button type="button" class="participant-remove" data-id="${participant.id}" data-name="${participant.name}">×</button>` : ''}
            `;
            listContainer.appendChild(tag);
        });

        // 삭제 버튼 이벤트
        listContainer.querySelectorAll('.participant-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const name = this.getAttribute('data-name');
                if (id === 'null') {
                    // 외부인원 (id가 null)
                    selectedParticipants = selectedParticipants.filter(p => p.name !== name || p.id !== null);
                } else {
                    // 내부 직원
                    selectedParticipants = selectedParticipants.filter(p => p.id !== parseInt(id));
                }
                renderParticipantsList();
            });
        });
    }

    // 일정 저장 버튼 (추가 모드 전용)
    document.getElementById('saveScheduleBtn').addEventListener('click', async function() {
        const form = document.getElementById('scheduleForm');

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // 추가 모드만 처리
        await addNewSchedule();
    });

    // 새 일정 추가 함수
    async function addNewSchedule() {
        const title = document.getElementById('scheduleTitle').value;
        const startDate = document.getElementById('scheduleStartDate').value;
        const endDate = document.getElementById('scheduleEndDate').value;
        const isAllDay = isAllDayCheckbox ? isAllDayCheckbox.checked : false;
        const startTime = isAllDay ? null : (document.getElementById('scheduleStartTime').value || null);
        const endTime = isAllDay ? null : (document.getElementById('scheduleEndTime').value || null);
        const location = document.getElementById('scheduleLocation').value || null;
        const description = document.getElementById('scheduleDescription').value || null;

        // 탭별 유효성 검사 및 데이터 수집
        const type = document.getElementById('scheduleType').value;
        let teamIdx = null;

        if (currentQuickEventTab === 'team') {
            if (!selectedTeam || !selectedTeam.idx) {
                showAlert('팀을 선택하세요.', 'warning');
                return;
            }
            teamIdx = selectedTeam.idx;
        }

        // 날짜 유효성 검사
        if (new Date(endDate) < new Date(startDate)) {
            showAlert('종료 날짜는 시작 날짜보다 이전일 수 없습니다.', 'warning');
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
            teamIdx: teamIdx, // 팀 일정인 경우 팀 ID, 개인 일정인 경우 null
            participants: selectedParticipants.map(participant => ({
                userName: participant.name,
                userIdx: participant.id
            }))
        };

        try {
            const response = await fetch('/api/calendar/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });

            const data = await response.json();

            if (data.success) {
                showAlert('일정이 성공적으로 추가되었습니다.', 'success');

                // 달력 새로고침
                await reloadCurrentView();

                // 모달 닫기
                closeAddScheduleModal();
            } else {
                showAlert('일정 추가 실패: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('일정 추가 중 오류:', error);
            showAlert('일정 추가 중 오류가 발생했습니다.', 'error');
        }
    }

    // 일정 수정 함수는 제거 - 이제 별도 페이지에서 처리

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
    document.getElementById('confirmYearMonthBtn').addEventListener('click', async function() {
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


    // ===== SweetAlert2 알림 함수들 =====

    function showInfo(message) {
        return Swal.fire({
            icon: 'info',
            title: '알림',
            html: message,
            confirmButtonText: '확인'
        });
    }

    function showSuccess(message) {
        return Swal.fire({
            icon: 'success',
            title: '성공',
            html: message,
            confirmButtonText: '확인',
            confirmButtonColor: '#28a745',
            timer: 2000,
            timerProgressBar: true
        });
    }

    function showWarning(message) {
        return Swal.fire({
            icon: 'warning',
            title: '경고',
            html: message,
            confirmButtonText: '확인'
        });
    }

    function showError(message) {
        return Swal.fire({
            icon: 'error',
            title: '오류',
            html: message,
            confirmButtonText: '확인'
        });
    }

    function showDeleteConfirm(message) {
        return Swal.fire({
            icon: 'warning',
            title: '삭제 확인',
            text: message,
            showCancelButton: true,
            confirmButtonText: '삭제',
            cancelButtonText: '취소',
            confirmButtonColor: '#dc2626'
        }).then(result => result.isConfirmed);
    }

    // 알림 메시지 표시 함수 (type에 따라 다른 알림 표시)
    async function showAlert(message, type = 'info') {
        switch(type) {
            case 'success':
                await showSuccess(message);
                break;
            case 'warning':
                await showWarning(message);
                break;
            case 'error':
                await showError(message);
                break;
            default:
                await showInfo(message);
        }
    }

    // 페이지 로드 시 달력 렌더링
    renderCalendar();

    // 날짜 셀 클릭 이벤트 연결 (한 번만 실행)
    attachDateCellClickEvents();

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

    viewButtons.forEach(btn => {
        btn.addEventListener('click', async function() {
            const view = this.getAttribute('data-view');

            // 버튼 활성화 상태 변경
            viewButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // 뷰 변경
            currentView = view;

            // 뷰에 맞는 캘린더 렌더링
            switch(view) {
                case 'day':
                    document.getElementById('monthView').style.display = 'none';
                    document.getElementById('weekView').style.display = 'none';
                    document.getElementById('dayView').style.display = 'flex';
                    await renderDayView();
                    break;
                case 'week':
                    document.getElementById('monthView').style.display = 'none';
                    document.getElementById('weekView').style.display = 'flex';
                    document.getElementById('dayView').style.display = 'none';
                    await renderWeekView();
                    break;
                case 'month':
                    document.getElementById('monthView').style.display = 'flex';
                    document.getElementById('weekView').style.display = 'none';
                    document.getElementById('dayView').style.display = 'none';
                    await renderCalendar();
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
        selectAllTeamsCheckbox.addEventListener('change', async function() {
            const isChecked = this.checked;
            teamCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            await filterSchedules();
        });
    }

    // 개별 팀 체크박스 변경 시
    teamCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', async function() {
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

            await filterSchedules();
        });
    });

    // 일정 유형 - 전체 선택/해제
    if (selectAllTypesCheckbox) {
        selectAllTypesCheckbox.addEventListener('change', async function() {
            const isChecked = this.checked;
            typeCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            await filterSchedules();
        });
    }

    // 개별 유형 체크박스 변경 시
    typeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', async function() {
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

            await filterSchedules();
        });
    });

    // 필터링 함수
    async function filterSchedules() {
        // 선택된 팀 목록
        const selectedTeams = Array.from(teamCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        // 선택된 유형 목록
        const selectedTypes = Array.from(typeCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        activeTypeFilters = selectedTypes;
        activeTeamFilters = selectedTeams;

        // 달력 다시 렌더링
        await renderCalendar();
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
    async function renderWeekView() {
        const weekDaysContainer = document.getElementById('weekDays');
        const weekGridContainer = document.getElementById('weekGrid');
        const weekEventsContainer = document.getElementById('weekEvents');
        const weekAllDayContainer = document.getElementById('weekAllDayEvents');

        // 현재 주의 시작일 (일요일) 구하기
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - day);

        // 종료일 (토요일)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);

        // 공휴일 + 일정 데이터 병렬 로드
        const startDate = formatDate(startOfWeek);
        const endDate = formatDate(endOfWeek);
        await Promise.all([
            loadHolidays(startOfWeek.getFullYear()),
            loadSchedules(startDate, endDate)
        ]);

        // 주간 타이틀 설정
        const startMonth = startOfWeek.getMonth() + 1;
        const endMonth = endOfWeek.getMonth() + 1;
        const startDay = startOfWeek.getDate();
        const endDay = endOfWeek.getDate();

        if (startMonth === endMonth) {
            currentMonthTitle.textContent = `${startOfWeek.getFullYear()}년 ${startMonth}월 ${startDay}일 - ${endDay}일`;
        } else {
            currentMonthTitle.textContent = `${startOfWeek.getFullYear()}년 ${startMonth}월 ${startDay}일 - ${endMonth}월 ${endDay}일`;
        }

        // 오늘 버튼 표시/숨김 처리
        const today = new Date();
        today.setHours(0, 0, 0, 0);
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

            // 공휴일 확인
            const holidayInfo = getHolidayInfo(dayDate);

            let dayNameClass = '';
            let dayNameText = weekDays[i];
            let holidayHTML = '';

            if (holidayInfo) {
                dayNameClass = 'holiday';
                holidayHTML = ` <span class="holiday-name">${holidayInfo.holidayName}</span>`;
            } else if (i === 0) {
                dayNameClass = 'sunday';
            } else if (i === 6) {
                dayNameClass = 'saturday';
            }

            headerHTML += `
                <div class="week-day-header ${isToday ? 'today' : ''} ${dayNameClass}" data-date="${formatDate(dayDate)}">
                    <div class="week-day-combined">${dateStr} (${dayNameText})${holidayHTML}</div>
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

        // 종일 일정과 시간 일정 분리
        const allDaySchedules = [];
        const timedSchedules = [];

        schedules.forEach(schedule => {
            if (schedule.time === '종일' || schedule.isAllDay) {
                allDaySchedules.push(schedule);
            } else {
                timedSchedules.push(schedule);
            }
        });

        // 종일 일정 렌더링 (상단 영역) - 레이아웃 계산
        if (weekAllDayContainer) {
            let allDayHTML = '';
            const processedSchedules = new Set(); // 중복 처리 방지
            const rows = []; // 각 행에 배치된 일정들

            allDaySchedules.forEach(schedule => {
                // 이미 처리한 일정은 건너뛰기
                if (processedSchedules.has(schedule.id)) {
                    return;
                }
                processedSchedules.add(schedule.id);

                const scheduleStart = new Date(schedule.startDate);
                const scheduleEnd = new Date(schedule.endDate);

                // 주간 범위 내에서 일정이 시작하는 날과 끝나는 날 계산
                const displayStart = scheduleStart < startOfWeek ? new Date(startOfWeek) : scheduleStart;
                const displayEnd = scheduleEnd > endOfWeek ? new Date(endOfWeek) : scheduleEnd;

                // 시작 요일과 종료 요일 계산
                const startDayIdx = displayStart.getDay();
                const endDayIdx = displayEnd.getDay();

                // 일정이 걸치는 일수 계산
                const spanDays = Math.ceil((displayEnd - displayStart) / (1000 * 60 * 60 * 24)) + 1;

                // 겹치지 않는 행 찾기
                let rowIndex = 0;
                while (rowIndex < rows.length) {
                    const row = rows[rowIndex];
                    let canPlace = true;

                    // 현재 행에 이미 배치된 일정과 겹치는지 확인
                    for (const placed of row) {
                        if (!(endDayIdx < placed.startDayIdx || startDayIdx > placed.endDayIdx)) {
                            canPlace = false;
                            break;
                        }
                    }

                    if (canPlace) {
                        break;
                    }
                    rowIndex++;
                }

                // 새 행 추가가 필요한 경우
                if (rowIndex === rows.length) {
                    rows.push([]);
                }

                // 일정 정보를 행에 추가
                rows[rowIndex].push({
                    schedule,
                    startDayIdx,
                    endDayIdx,
                    spanDays
                });
            });

            // HTML 생성
            rows.forEach((row, rowIdx) => {
                row.forEach(({ schedule, startDayIdx, spanDays }) => {
                    const scheduleStart = new Date(schedule.startDate);
                    const scheduleEnd = new Date(schedule.endDate);

                    const typeClass = schedule.type;
                    const left = (startDayIdx * 100 / 7);
                    const width = (spanDays * 100 / 7);
                    const top = rowIdx * 28 + 4; // 각 행의 높이 28px

                    // 연속 일정 클래스 추가
                    let eventClasses = `week-allday-event ${typeClass}`;
                    if (schedule.startDate !== schedule.endDate) {
                        eventClasses += ' multi-day';

                        // 주 범위를 벗어나는지 체크
                        if (scheduleStart < startOfWeek) {
                            eventClasses += ' continues-from-prev';
                        }
                        if (scheduleEnd > endOfWeek) {
                            eventClasses += ' continues-to-next';
                        }
                    }

                    allDayHTML += `
                        <div class="${eventClasses}"
                             style="position: absolute; left: ${left}%; width: calc(${width}% - 8px); top: ${top}px;"
                             data-schedule-id="${schedule.id}"
                             data-group-id="${schedule.groupId}">
                            [종일] ${schedule.title}
                        </div>
                    `;
                });
            });

            // 컨테이너 높이 조정
            const totalHeight = Math.max(36, rows.length * 28 + 8);
            weekAllDayContainer.style.minHeight = totalHeight + 'px';
            weekAllDayContainer.innerHTML = allDayHTML;
        }

        // 시간 일정 렌더링
        let eventsHTML = '';
        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(dayDate.getDate() + dayIdx);
            const dateStr = formatDate(dayDate);

            // 해당 날짜의 시간 일정 필터링
            const daySchedules = timedSchedules.filter(s => {
                const scheduleStart = new Date(s.startDate);
                const scheduleEnd = new Date(s.endDate);
                const currentDate = new Date(dateStr);
                return currentDate >= scheduleStart && currentDate <= scheduleEnd;
            });

            daySchedules.forEach(schedule => {
                const position = calculateEventPosition(schedule, dayIdx);
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

        // 주간 뷰 - 마우스 휠 이벤트
        const weekView = document.getElementById('weekView');
        const weekHeader = weekView.querySelector('.week-header');
        const weekAllDaySection = weekView.querySelector('.week-allday-section');
        const weekBodyWrapper = weekView.querySelector('.week-body-wrapper');

        // 기존 이벤트 리스너 제거 후 추가
        weekHeader.removeEventListener('wheel', handleWheelNavigation);
        weekHeader.addEventListener('wheel', handleWheelNavigation, { passive: false });

        weekAllDaySection.removeEventListener('wheel', handleWheelNavigation);
        weekAllDaySection.addEventListener('wheel', handleWheelNavigation, { passive: false });

        weekBodyWrapper.removeEventListener('wheel', handleWheelNavigation);
        weekBodyWrapper.addEventListener('wheel', handleWheelNavigation, { passive: false });
    }

    // ===== 일간 뷰 렌더링 함수 =====
    async function renderDayView() {
        const dayHeaderContainer = document.getElementById('dayTitle');
        const dayGridContainer = document.getElementById('dayGrid');
        const dayEventsContainer = document.getElementById('dayEvents');
        const dayAllDayContainer = document.getElementById('dayAllDayEvents');

        // 공휴일 + 일정 데이터 병렬 로드
        const dayDate = formatDate(currentDate);
        await Promise.all([
            loadHolidays(currentDate.getFullYear()),
            loadSchedules(dayDate, dayDate)
        ]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isToday = currentDate.getTime() === today.getTime();
        const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
        const dayOfWeek = currentDate.getDay();

        // 일간 타이틀 설정
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const date = currentDate.getDate();

        // 공휴일 확인
        const holidayInfo = getHolidayInfo(currentDate);
        let titleText = `${year}년 ${month}월 ${date}일 (${weekDays[dayOfWeek]})`;
        if (holidayInfo) {
            titleText += ` - ${holidayInfo.holidayName}`;
        }
        currentMonthTitle.textContent = titleText;

        // 오늘 버튼 표시/숨김 처리
        if (isToday) {
            todayBtn.classList.remove('show');
        } else {
            todayBtn.classList.add('show');
        }

        // 일간 헤더 생성
        let dayHeaderClass = isToday ? 'today' : '';
        let holidayHTML = '';

        if (holidayInfo) {
            dayHeaderClass += ' holiday';
            holidayHTML = ` <span class="holiday-name">${holidayInfo.holidayName}</span>`;
        } else if (dayOfWeek === 0) {
            dayHeaderClass += ' sunday';
        } else if (dayOfWeek === 6) {
            dayHeaderClass += ' saturday';
        }

        dayHeaderContainer.innerHTML = `
            <div class="day-header-info ${dayHeaderClass}">
                <div class="day-date-combined">${currentDate.getDate()} (${weekDays[dayOfWeek]})${holidayHTML}</div>
            </div>
        `;

        // 시간 그리드 생성 (24시간)
        let gridHTML = '';
        for (let hour = 0; hour < 24; hour++) {
            gridHTML += `<div class="grid-cell" data-hour="${hour}"></div>`;
        }
        dayGridContainer.innerHTML = gridHTML;

        // 이벤트 렌더링 (시작일~종료일 사이에 포함되는 일정 모두)
        const dateStr = formatDate(currentDate);
        const daySchedules = schedules.filter(s => {
            const scheduleStart = new Date(s.startDate);
            const scheduleEnd = new Date(s.endDate);
            const viewDate = new Date(dateStr);
            return viewDate >= scheduleStart && viewDate <= scheduleEnd;
        });

        // 종일 일정과 시간 일정 분리
        const allDaySchedules = daySchedules.filter(s => s.time === '종일' || s.isAllDay);
        const timedSchedules = daySchedules.filter(s => s.time !== '종일' && !s.isAllDay);

        // 종일 일정 렌더링 (상단 영역)
        if (dayAllDayContainer) {
            let allDayHTML = '';
            allDaySchedules.forEach(schedule => {
                const typeClass = schedule.type;
                allDayHTML += `
                    <div class="day-allday-event ${typeClass}"
                         data-schedule-id="${schedule.id}"
                         data-group-id="${schedule.groupId}">
                        [종일] ${schedule.title}
                    </div>
                `;
            });
            dayAllDayContainer.innerHTML = allDayHTML;
        }

        // 시간 일정 렌더링
        let eventsHTML = '';
        timedSchedules.forEach(schedule => {
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

        // 일간 뷰 - 마우스 휠 이벤트
        const dayView = document.getElementById('dayView');
        const dayHeader = dayView.querySelector('.day-header');
        const dayAllDaySection = dayView.querySelector('.day-allday-section');
        const dayBodyWrapper = dayView.querySelector('.day-body-wrapper');

        // 기존 이벤트 리스너 제거 후 추가
        dayHeader.removeEventListener('wheel', handleWheelNavigation);
        dayHeader.addEventListener('wheel', handleWheelNavigation, { passive: false });

        dayAllDaySection.removeEventListener('wheel', handleWheelNavigation);
        dayAllDaySection.addEventListener('wheel', handleWheelNavigation, { passive: false });

        dayBodyWrapper.removeEventListener('wheel', handleWheelNavigation);
        dayBodyWrapper.addEventListener('wheel', handleWheelNavigation, { passive: false });
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
                    // 오늘의 요일 계산 (0: 일요일 ~ 6: 토요일)
                    const todayDayOfWeek = today.getDay();

                    // 주간 그리드 컨테이너의 너비 가져오기
                    const weekGridContainer = document.querySelector('.week-grid-container');
                    if (weekGridContainer) {
                        const gridWidth = weekGridContainer.offsetWidth;
                        const columnWidth = gridWidth / 7; // 한 열의 너비 (px)

                        // 시간선 위치 및 크기 설정 (오늘 날짜 열에만 표시)
                        timeLine.style.top = currentTop + 'px';
                        timeLine.style.left = (60 + todayDayOfWeek * columnWidth) + 'px'; // 60px(시간열) + 요일 오프셋
                        timeLine.style.width = columnWidth + 'px';
                        timeLine.style.display = 'block';
                    }
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
        // 시간 일정 이벤트
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

        // 종일 일정 이벤트
        const allDayEvents = document.querySelectorAll('.week-allday-event');
        allDayEvents.forEach(event => {
            event.addEventListener('click', function(e) {
                e.stopPropagation();
                const scheduleId = parseInt(this.getAttribute('data-schedule-id'));
                const groupId = this.getAttribute('data-group-id');
                openScheduleModal(scheduleId, groupId);
            });

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
        // 시간 일정 이벤트
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

        // 종일 일정 이벤트
        const allDayEvents = document.querySelectorAll('.day-allday-event');
        allDayEvents.forEach(event => {
            event.addEventListener('click', function(e) {
                e.stopPropagation();
                const scheduleId = parseInt(this.getAttribute('data-schedule-id'));
                const groupId = this.getAttribute('data-group-id');
                openScheduleModal(scheduleId, groupId);
            });

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

    // 팀 목록 로드 (간략한 모달용)
    async function loadQuickTeamsList() {
        try {
            const response = await fetch('/api/teams?active=Y');
            if (!response.ok) {
                console.warn('[팀 목록 로드] API 응답 실패:', response.status, response.statusText);
                throw new Error(`팀 목록 로드 실패 (${response.status})`);
            }

            const teams = await response.json();
            quickTeamsList = teams;

            // 팀 선택 드롭다운 렌더링
            renderQuickTeamSelect();
            return true;
        } catch (error) {
            console.error('[팀 목록 로드] 오류:', error);
            quickTeamsList = [];
            return false;
        }
    }

    // 팀 선택 모달 렌더링
    function renderTeamSelectModal() {
        const teamSelectList = document.getElementById('teamSelectList');
        if (!teamSelectList) return;

        teamSelectList.innerHTML = '';

        // 팀 목록이 아예 없는 경우
        if (!quickTeamsList || quickTeamsList.length === 0) {
            teamSelectList.innerHTML = `
                <div class="team-select-empty">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p class="empty-message">등록된 팀이 없습니다</p>
                    <p class="empty-submessage">먼저 팀을 생성해주세요</p>
                </div>
            `;
            return;
        }

        // 선택 가능한 팀 필터링
        const availableTeams = quickTeamsList.filter(team => {
            // 이미 선택된 팀은 제외
            return !(selectedTeam && selectedTeam.idx === team.idx);
        });

        // 선택 가능한 팀이 없는 경우 (이미 선택함)
        if (availableTeams.length === 0) {
            teamSelectList.innerHTML = `
                <div class="team-select-empty">
                    <i class="fas fa-users-slash"></i>
                    <p class="empty-message">선택할 수 있는 팀이 없습니다</p>
                    <p class="empty-submessage">이미 팀을 선택하셨습니다</p>
                </div>
            `;
            return;
        }

        availableTeams.forEach(team => {
            const teamItem = document.createElement('div');
            teamItem.className = 'team-select-item';
            teamItem.dataset.teamIdx = team.idx;
            teamItem.dataset.teamName = team.teamName;

            // 팀 색상 (팀 이름을 소문자로 변환해서 매칭)
            const teamKey = team.teamName.toLowerCase();
            const teamColor = teamColors[teamKey] || '#667eea'; // 기본 색상

            teamItem.innerHTML = `
                <div class="team-select-color" style="background: ${teamColor};"></div>
                <div class="team-select-name">${team.teamName}</div>
                <i class="fas fa-check team-select-check"></i>
            `;

            // 팀 선택 이벤트
            teamItem.addEventListener('click', function() {
                selectTeam(team, teamColor);
            });

            teamSelectList.appendChild(teamItem);
        });
    }

    // 팀 선택 처리
    function selectTeam(team, color) {
        selectedTeam = {
            idx: team.idx,
            name: team.teamName,
            color: color
        };

        // 선택된 팀 태그 표시
        renderSelectedTeamTag();

        // 팀 멤버 자동 추가
        loadQuickTeamMembersAsParticipants(team.idx);

        // 모달 닫기
        const teamSelectModal = document.getElementById('teamSelectModal');
        teamSelectModal.classList.remove('show');
    }

    // 선택된 팀 태그 렌더링
    function renderSelectedTeamTag() {
        const selectedTeamTag = document.getElementById('selectedTeamTag');
        if (!selectedTeamTag) return;

        if (!selectedTeam) {
            selectedTeamTag.innerHTML = '';
            return;
        }

        selectedTeamTag.innerHTML = `
            <div class="participant-tag" style="background: ${selectedTeam.color}20; color: ${selectedTeam.color}; border: 2px solid ${selectedTeam.color};">
                <i class="fas fa-users"></i>
                ${selectedTeam.name}
                <button type="button" class="participant-remove" style="color: ${selectedTeam.color};">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // 제거 버튼 이벤트
        const removeBtn = selectedTeamTag.querySelector('.participant-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                selectedTeam = null;
                renderSelectedTeamTag();
                // 참석자 목록도 초기화
                selectedParticipants = [];
                renderParticipantsList();
            });
        }
    }

    // 팀 선택 드롭다운 렌더링 (기존 함수 - 사용 안함)
    function renderQuickTeamSelect() {
        // 팀 선택 모달로 대체
        renderTeamSelectModal();
    }

    // 간략한 탭 전환
    function switchQuickEventTab(tabType) {
        currentQuickEventTab = tabType;

        // 탭 버튼 활성화 상태 변경
        const quickTabs = document.querySelectorAll('.quick-tab');
        quickTabs.forEach(tab => {
            if (tab.dataset.tab === tabType) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // 필드 표시/숨김
        const teamFields = document.querySelectorAll('.quick-team-only');

        if (tabType === 'personal') {
            teamFields.forEach(field => field.style.display = 'none');
        } else if (tabType === 'team') {
            teamFields.forEach(field => field.style.display = 'block');
        }
    }

    // 간략한 탭 클릭 이벤트
    document.querySelectorAll('.quick-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabType = this.dataset.tab;
            switchQuickEventTab(tabType);
        });
    });

    // 팀 선택 모달 열기 버튼
    const openTeamSelectModalBtn = document.getElementById('openTeamSelectModal');
    if (openTeamSelectModalBtn) {
        openTeamSelectModalBtn.addEventListener('click', function() {
            const teamSelectModal = document.getElementById('teamSelectModal');
            teamSelectModal.classList.add('show');
            renderTeamSelectModal();
        });
    }

    // 팀 선택 모달 닫기 버튼들
    const closeTeamSelectModalBtn = document.getElementById('closeTeamSelectModal');
    const cancelTeamSelectBtn = document.getElementById('cancelTeamSelectBtn');

    if (closeTeamSelectModalBtn) {
        closeTeamSelectModalBtn.addEventListener('click', function() {
            const teamSelectModal = document.getElementById('teamSelectModal');
            teamSelectModal.classList.remove('show');
        });
    }

    if (cancelTeamSelectBtn) {
        cancelTeamSelectBtn.addEventListener('click', function() {
            const teamSelectModal = document.getElementById('teamSelectModal');
            teamSelectModal.classList.remove('show');
        });
    }

    // 팀 선택 모달 배경 클릭 시 닫기
    const teamSelectModal = document.getElementById('teamSelectModal');
    if (teamSelectModal) {
        teamSelectModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    }

    // 간략한 모달 - 팀 멤버를 참석자로 추가
    async function loadQuickTeamMembersAsParticipants(teamIdx) {
        try {
            const response = await fetch(`/api/teams/${teamIdx}/members?active=Y`);

            if (!response.ok) {
                throw new Error(`팀 멤버 목록 로드 실패 (${response.status})`);
            }

            const members = await response.json();

            if (!members || members.length === 0) {
                selectedParticipants = [];
                renderParticipantsList();
                return;
            }

            // 기존 참석자 목록 초기화 (중복 방지)
            selectedParticipants = [];

            // 팀 멤버들을 참석자 형식으로 변환하여 추가
            members.forEach(member => {
                selectedParticipants.push({
                    id: member.memberIdx,
                    name: member.memberName || '이름 없음',
                    department: member.memberDeptName || member.memberDept || '미지정',
                    rank: member.memberPositionName || member.memberPosition || '미지정'
                });
            });

            // 참석자 목록 UI 업데이트
            renderParticipantsList();

            // 세부설정 자동으로 펼치기 (참석자 확인을 위해)
            const detailSettingsArea = document.getElementById('detailSettingsArea');
            const toggleDetailSettingsBtn = document.getElementById('toggleDetailSettings');

            if (detailSettingsArea && toggleDetailSettingsBtn) {
                const isAlreadyExpanded = detailSettingsArea.classList.contains('show');

                if (!isAlreadyExpanded) {
                    detailSettingsArea.style.display = 'block';
                    setTimeout(() => {
                        detailSettingsArea.classList.add('show');
                    }, 10);
                    toggleDetailSettingsBtn.classList.add('expanded');
                    toggleDetailSettingsBtn.innerHTML = '<i class="fas fa-chevron-up"></i> 세부설정 접기';
                }
            }

        } catch (error) {
            console.error('[팀 멤버 로드] 오류 발생:', error);
            await showError('팀 멤버를 불러오는 중 오류가 발생했습니다.\n참석자를 수동으로 추가해주세요.');
            // 오류 발생 시 빈 참석자 목록으로 초기화
            selectedParticipants = [];
            renderParticipantsList();
        }
    }

    // 세부설정 토글 버튼
    const toggleDetailSettingsBtn = document.getElementById('toggleDetailSettings');
    const detailSettingsArea = document.getElementById('detailSettingsArea');

    if (toggleDetailSettingsBtn && detailSettingsArea) {
        toggleDetailSettingsBtn.addEventListener('click', function() {
            const isExpanded = detailSettingsArea.classList.contains('show');

            if (isExpanded) {
                // 접기
                detailSettingsArea.classList.remove('show');
                toggleDetailSettingsBtn.classList.remove('expanded');
                toggleDetailSettingsBtn.innerHTML = '<i class="fas fa-chevron-down"></i> 세부설정';
            } else {
                // 펼치기
                detailSettingsArea.style.display = 'block';
                // 약간의 딜레이 후 애니메이션 적용
                setTimeout(() => {
                    detailSettingsArea.classList.add('show');
                }, 10);
                toggleDetailSettingsBtn.classList.add('expanded');
                toggleDetailSettingsBtn.innerHTML = '<i class="fas fa-chevron-up"></i> 세부설정 접기';
            }
        });
    }

    // 초기화: 팀 목록 및 직원 목록 로드
    loadQuickTeamsList();
    loadEmployees();

    // 초기 렌더링
    renderCalendar();

    // 현재 시간 표시선 주기적 업데이트 (1분마다)
    setInterval(() => {
        if (currentView === 'week') {
            updateCurrentTimeLine('week');
        } else if (currentView === 'day') {
            updateCurrentTimeLine('day');
        }
    }, 60000); // 1분마다 업데이트
});
