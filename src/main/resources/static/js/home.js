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

    // 전자 문서 건수 로드
    loadPendingApprovals();

    // 프로젝트 문서 건수 로드
    loadProjectDocuments();

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

    // 전자 문서 카드 클릭 이벤트
    const approvalCard = document.getElementById('approvalCard');
    if (approvalCard) {
        approvalCard.addEventListener('click', function() {
            window.location.href = '/approval';
        });
    }

    // 프로젝트 문서 카드 클릭 이벤트
    const projectDocCard = document.getElementById('projectDocCard');
    if (projectDocCard) {
        projectDocCard.addEventListener('click', function() {
            window.location.href = '/project/documents';
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

// 전자 문서 건수 로드 함수
function loadPendingApprovals() {
    const PROJECT_DOCUMENT_TYPES = [
        '프로젝트 주간업무보고',
        '연구비증빙-회의록',
        '연구비증빙-출장',
        '연구비증빙-출장+회의',
        '연구비증빙-야근식대'
    ];

    fetch('/api/approval/documents')
        .then(response => {
            if (!response.ok) {
                throw new Error('전자 문서 로드 실패');
            }
            return response.json();
        })
        .then(data => {
            const countElement = document.getElementById('pendingApprovalCount');
            if (countElement) {
                // 프로젝트 문서 제외
                const approvalDocs = data.filter(doc =>
                    !PROJECT_DOCUMENT_TYPES.includes(doc.documentType)
                );
                const totalCount = approvalDocs.length || 0;
                countElement.innerHTML = `${totalCount}<span>건</span>`;
            }
        })
        .catch(error => {
            console.error('전자 문서 로드 오류:', error);
            const countElement = document.getElementById('pendingApprovalCount');
            if (countElement) {
                countElement.innerHTML = `-<span>건</span>`;
            }
        });
}

// 프로젝트 문서 건수 로드 함수
function loadProjectDocuments() {
    // 프로젝트 문서 전용 API 사용
    fetch('/api/approval/documents/projects')
        .then(response => {
            if (!response.ok) {
                throw new Error('프로젝트 문서 로드 실패');
            }
            return response.json();
        })
        .then(data => {
            const countElement = document.getElementById('projectDocCount');
            if (countElement) {
                const totalCount = data.length || 0;
                countElement.innerHTML = `${totalCount}<span>건</span>`;
            }
        })
        .catch(error => {
            console.error('프로젝트 문서 로드 오류:', error);
            const countElement = document.getElementById('projectDocCount');
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
    const todayStr = today.toISOString().split('T')[0];

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

            let events = data.events || [];

            if (events.length === 0) {
                listElement.innerHTML = `
                    <div class="empty-message">
                        <i class="fas fa-calendar-times"></i>
                        <p>이번 주 일정이 없습니다</p>
                    </div>
                `;
                return;
            }

            // 오늘 일정인지 판별하는 함수
            const isToday = (schedule) => {
                const startDate = schedule.startDate;
                const endDate = schedule.endDate || schedule.startDate;
                return startDate <= todayStr && todayStr <= endDate;
            };

            // 오늘 일정을 상단으로 정렬
            events.sort((a, b) => {
                const aTodayFlag = isToday(a) ? 1 : 0;
                const bTodayFlag = isToday(b) ? 1 : 0;
                if (aTodayFlag !== bTodayFlag) {
                    return bTodayFlag - aTodayFlag; // 오늘 일정이 먼저
                }
                return new Date(a.startDate) - new Date(b.startDate); // 날짜순
            });

            // 최대 5개만 표시
            const schedules = events.slice(0, 5);
            listElement.innerHTML = schedules.map(schedule => {
                const dateStr = formatScheduleDateFromStrings(schedule.startDate, schedule.endDate);
                const timeStr = schedule.isAllDay ? '종일' : formatScheduleTimeFromStrings(schedule.startTime, schedule.endTime);
                const todayClass = isToday(schedule) ? 'today-schedule' : '';

                return `
                    <div class="schedule-item ${todayClass}" onclick="openScheduleModal(${schedule.idx})">
                        <div class="schedule-item-header">
                            <span class="schedule-title">${escapeHtml(schedule.eventTitle)}</span>
                            <span class="schedule-time">${timeStr}</span>
                        </div>
                        <div class="schedule-date">${dateStr}</div>
                    </div>
                `;
            }).join('');

            // 일정 데이터를 전역 변수에 저장 (모달에서 사용)
            window.weeklySchedules = events;
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
                p.projectStatus === 'IN_PROGRESS'
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
                const statusClass = 'active';
                const statusText = '진행중';
                const period = formatProjectPeriod(project.startDate, project.endDate);

                return `
                    <div class="project-item" onclick="window.location.href='/project/detail?projectId=${project.idx}'">
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
    const startStr = `${start.getMonth() + 1}/${start.getDate()} (${getDayOfWeek(start)})`;

    if (!endDateStr || startDateStr === endDateStr) {
        return startStr;
    } else {
        const end = new Date(endDateStr);
        const endStr = `${end.getMonth() + 1}/${end.getDate()} (${getDayOfWeek(end)})`;
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

// 일정 상세 모달 열기
function openScheduleModal(scheduleIdx) {
    const schedule = window.weeklySchedules?.find(s => s.idx === scheduleIdx);
    if (!schedule) return;

    // 상세 정보 표시
    document.getElementById('detailTitle').textContent = schedule.eventTitle || '-';

    // 일정 유형 한글 변환
    const typeMap = {
        'leave': '연차/휴가',
        'business': '업무 일정',
        'meeting-room': '회의실 예약',
        'etc': '기타'
    };
    document.getElementById('detailType').textContent = typeMap[schedule.eventType] || schedule.eventType || '-';

    // 기간 표시
    const startDate = new Date(schedule.startDate);
    const endDate = new Date(schedule.endDate || schedule.startDate);
    const startDateStr = `${startDate.getFullYear()}.${String(startDate.getMonth() + 1).padStart(2, '0')}.${String(startDate.getDate()).padStart(2, '0')}`;
    const endDateStr = `${endDate.getFullYear()}.${String(endDate.getMonth() + 1).padStart(2, '0')}.${String(endDate.getDate()).padStart(2, '0')}`;

    if (schedule.startDate === schedule.endDate || !schedule.endDate) {
        document.getElementById('detailPeriod').textContent = startDateStr;
    } else {
        document.getElementById('detailPeriod').textContent = `${startDateStr} ~ ${endDateStr}`;
    }

    // 시간 표시
    if (schedule.isAllDay) {
        document.getElementById('detailTime').textContent = '종일';
    } else {
        const timeStr = formatScheduleTimeFromStrings(schedule.startTime, schedule.endTime);
        document.getElementById('detailTime').textContent = timeStr || '-';
    }

    // 장소 표시
    document.getElementById('detailLocation').textContent = schedule.eventLocation || '-';

    // 참석자 표시
    if (schedule.participants && schedule.participants.length > 0) {
        // 참석자가 객체 배열인 경우와 문자열 배열인 경우 모두 처리
        const participantNames = schedule.participants.map(p => {
            if (typeof p === 'string') {
                return p;
            } else if (p && p.name) {
                return p.name;
            } else if (p && p.employeeName) {
                return p.employeeName;
            } else {
                return '';
            }
        }).filter(name => name).join(', ');
        document.getElementById('detailParticipants').textContent = participantNames || '-';
    } else {
        document.getElementById('detailParticipants').textContent = '-';
    }

    // 설명 표시
    document.getElementById('detailDescription').textContent = schedule.eventDescription || '-';

    // 알림 표시
    let notificationText = '-';
    if (schedule.notification) {
        const minutes = schedule.notificationTime || 10;
        if (minutes >= 60) {
            notificationText = `${minutes / 60}시간 전`;
        } else {
            notificationText = `${minutes}분 전`;
        }
    } else {
        notificationText = '알림 없음';
    }
    document.getElementById('detailNotification').textContent = notificationText;

    // 모달 표시
    document.getElementById('scheduleDetailModal').classList.add('show');
}

// 모달 닫기 함수
function closeScheduleModal() {
    const modal = document.getElementById('scheduleDetailModal');
    modal.classList.remove('show');
}

// 모달 닫기 이벤트 리스너
document.getElementById('closeModal').addEventListener('click', closeScheduleModal);
document.getElementById('closeModalBtn').addEventListener('click', closeScheduleModal);

// 모달 배경 클릭 시 닫기
document.getElementById('scheduleDetailModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeScheduleModal();
    }
});

// 캘린더에서 보기 버튼
document.getElementById('goToCalendarBtn').addEventListener('click', function() {
    window.location.href = '/calendar';
});
