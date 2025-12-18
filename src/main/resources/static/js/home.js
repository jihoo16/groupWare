// 메뉴 토글 기능
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');

    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
        });
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

    // 검색 기능 (추후 구현)
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                console.log('검색:', this.value);
                // 검색 로직 추가
            }
        });
    }

    // 알림 버튼 클릭 이벤트 (추후 구현)
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            console.log('알림 클릭');
            // 알림 패널 표시 로직 추가
        });
    }

    // 잔여 연차 데이터 로드
    loadRemainingVacation();

    // 오늘 일정 데이터 로드
    loadTodaySchedule();

    // 이번 주 일정 로드
    loadWeeklySchedule();

    // 진행 중인 프로젝트 로드
    loadMyProjects();

    // 잔여 연차 카드 클릭 이벤트
    const vacationCard = document.getElementById('vacationCard');
    if (vacationCard) {
        vacationCard.addEventListener('click', function() {
            window.location.href = '/vacation';
        });
    }

    // 오늘 일정 카드 클릭 이벤트
    const todayScheduleCard = document.getElementById('todayScheduleCard');
    if (todayScheduleCard) {
        todayScheduleCard.addEventListener('click', function() {
            window.location.href = '/calendar';
        });
    }
});

// 잔여 연차 로드 함수
function loadRemainingVacation() {
    const currentYear = new Date().getFullYear();

    fetch(`/api/vacation/user-info?year=${currentYear}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('연차 데이터 로드 실패');
            }
            return response.json();
        })
        .then(data => {
            const remainingElement = document.getElementById('remainingVacation');
            if (remainingElement && data.remainingDays !== undefined) {
                remainingElement.innerHTML = `${data.remainingDays}<span>일</span>`;
            }
        })
        .catch(error => {
            console.error('잔여 연차 로드 오류:', error);
            const remainingElement = document.getElementById('remainingVacation');
            if (remainingElement) {
                remainingElement.innerHTML = `-<span>일</span>`;
            }
        });
}

// 오늘 일정 로드 함수
function loadTodaySchedule() {
    const today = new Date().toISOString().split('T')[0];

    fetch(`/api/calendar/events?startDate=${today}&endDate=${today}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('일정 데이터 로드 실패');
            }
            return response.json();
        })
        .then(data => {
            const countElement = document.getElementById('todayScheduleCount');
            if (countElement) {
                const events = data.events || [];
                countElement.innerHTML = `${events.length}<span>건</span>`;
            }
        })
        .catch(error => {
            console.error('오늘 일정 로드 오류:', error);
            const countElement = document.getElementById('todayScheduleCount');
            if (countElement) {
                countElement.innerHTML = `-<span>건</span>`;
            }
        });
}

// 이번 주 일정 로드 함수
function loadWeeklySchedule() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = endOfWeek.toISOString().split('T')[0];

    fetch(`/api/calendar/events?startDate=${startDate}&endDate=${endDate}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('일정 데이터 로드 실패');
            }
            return response.json();
        })
        .then(data => {
            const listElement = document.getElementById('weeklyScheduleList');
            if (!listElement) return;

            const events = data.events || [];

            if (events.length === 0) {
                listElement.innerHTML = `
                    <div class="empty-message">
                        <i class="fas fa-calendar-times"></i>
                        <p>이번 주 일정이 없습니다</p>
                    </div>
                `;
                return;
            }

            // 최대 5개만 표시
            const schedules = events.slice(0, 5);
            listElement.innerHTML = schedules.map(schedule => {
                const dateStr = formatScheduleDateFromStrings(schedule.startDate, schedule.endDate);
                const timeStr = schedule.isAllDay ? '종일' : formatScheduleTimeFromStrings(schedule.startTime, schedule.endTime);

                return `
                    <div class="schedule-item" onclick="window.location.href='/calendar'">
                        <div class="schedule-item-header">
                            <span class="schedule-title">${escapeHtml(schedule.eventTitle)}</span>
                            <span class="schedule-time">${timeStr}</span>
                        </div>
                        <div class="schedule-date">${dateStr}</div>
                    </div>
                `;
            }).join('');
        })
        .catch(error => {
            console.error('이번 주 일정 로드 오류:', error);
            const listElement = document.getElementById('weeklyScheduleList');
            if (listElement) {
                listElement.innerHTML = `
                    <div class="empty-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>일정을 불러오는데 실패했습니다</p>
                    </div>
                `;
            }
        });
}

// 진행 중인 프로젝트 로드 함수
function loadMyProjects() {
    fetch('/api/projects')
        .then(response => {
            if (!response.ok) {
                throw new Error('프로젝트 데이터 로드 실패');
            }
            return response.json();
        })
        .then(data => {
            const listElement = document.getElementById('myProjectsList');
            if (!listElement) return;

            // 진행 중인 프로젝트만 필터링
            const activeProjects = data.filter(p =>
                p.projectStatus === 'ACTIVE' || p.projectStatus === 'PLANNING'
            );

            if (activeProjects.length === 0) {
                listElement.innerHTML = `
                    <div class="empty-message">
                        <i class="fas fa-project-diagram"></i>
                        <p>진행 중인 프로젝트가 없습니다</p>
                    </div>
                `;
                return;
            }

            // 최대 5개만 표시
            const projects = activeProjects.slice(0, 5);
            listElement.innerHTML = projects.map(project => {
                const statusClass = project.projectStatus === 'ACTIVE' ? 'active' : 'planning';
                const statusText = project.projectStatus === 'ACTIVE' ? '진행중' : '기획중';
                const period = formatProjectPeriod(project.projectStartDate, project.projectEndDate);

                return `
                    <div class="project-item" onclick="window.location.href='/project/edit/${project.idx}'">
                        <div class="project-item-header">
                            <span class="project-title">${escapeHtml(project.projectName)}</span>
                            <span class="project-status ${statusClass}">${statusText}</span>
                        </div>
                        <div class="project-period">${period}</div>
                        ${project.clientName ? `<div class="project-team">고객사: ${escapeHtml(project.clientName)}</div>` : ''}
                    </div>
                `;
            }).join('');
        })
        .catch(error => {
            console.error('프로젝트 로드 오류:', error);
            const listElement = document.getElementById('myProjectsList');
            if (listElement) {
                listElement.innerHTML = `
                    <div class="empty-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>프로젝트를 불러오는데 실패했습니다</p>
                    </div>
                `;
            }
        });
}

// 유틸리티 함수들
function formatScheduleDateFromStrings(startDateStr, endDateStr) {
    if (!startDateStr) return '';

    const start = new Date(startDateStr);
    const startStr = `${start.getMonth() + 1}/${start.getDate()}`;

    if (!endDateStr || startDateStr === endDateStr) {
        return `${startStr} (${getDayOfWeek(start)})`;
    } else {
        const end = new Date(endDateStr);
        const endStr = `${end.getMonth() + 1}/${end.getDate()}`;
        return `${startStr} - ${endStr}`;
    }
}

function formatScheduleTimeFromStrings(startTimeStr, endTimeStr) {
    if (!startTimeStr || !endTimeStr) return '';
    return `${startTimeStr} - ${endTimeStr}`;
}

function formatProjectPeriod(startDate, endDate) {
    if (!startDate || !endDate) return '기간 미정';

    const start = new Date(startDate);
    const end = new Date(endDate);

    const startStr = `${start.getFullYear()}.${String(start.getMonth() + 1).padStart(2, '0')}.${String(start.getDate()).padStart(2, '0')}`;
    const endStr = `${end.getFullYear()}.${String(end.getMonth() + 1).padStart(2, '0')}.${String(end.getDate()).padStart(2, '0')}`;

    return `${startStr} ~ ${endStr}`;
}

function getDayOfWeek(date) {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[date.getDay()];
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
