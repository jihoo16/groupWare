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

    // 글로벌 메뉴 검색
    initGlobalSearch();

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
        '연구비증빙-단독 출장',
        '연구비증빙-출장+회의',
        '연구비증빙(야근식대)'
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

    // 알림 표시 (요소가 존재하는 경우만)
    const detailNotificationElement = document.getElementById('detailNotification');
    if (detailNotificationElement) {
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
        detailNotificationElement.textContent = notificationText;
    }

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

// ══════════════════════════════════════════════════════
// 글로벌 메뉴 검색
// ══════════════════════════════════════════════════════

// 메뉴 항목 + 검색 키워드(동의어) 정의
const MENU_ITEMS = [
    // ── 전자 문서 ──
    {
        category: '전자 문서', label: '전자 문서함', url: '/approval', icon: 'fa-inbox',
        keywords: ['결재함','문서함','내문서','결재대기','결재목록','승인대기','전자결재']
    },
    {
        category: '전자 문서', label: '연차신청서', url: '/approval/vacation', icon: 'fa-umbrella-beach',
        keywords: ['연차','휴가','월차','반차','연차신청','휴가신청','반차신청','연가','연차관리',
                   '휴가신청서','반차신청서','월차신청','연차신청서작성','연차관리','반차','유급휴가']
    },
    {
        category: '전자 문서', label: '개인경비 청구서', url: '/approval/expense', icon: 'fa-receipt',
        keywords: ['개인경비','경비청구','개인경비청구','교통비','식비청구','경비','개인비용','청구서','경비신청']
    },
    {
        category: '전자 문서', label: '구매요청서', url: '/approval/receipt-purchase', icon: 'fa-shopping-cart',
        keywords: ['구매','구매요청','물품구매','구매신청','비품','소모품','구매품의','자재구매','물품신청']
    },
    // ── 프로젝트 문서함 ──
    {
        category: '프로젝트 문서함', label: '프로젝트 주간보고', url: '/approval/project-weekly-report', icon: 'fa-chart-line',
        keywords: ['주간보고','주간업무','주간업무보고','주간보고서','위클리','weekly','보고서']
    },
    {
        category: '프로젝트 문서함', label: '회의비 증빙', url: '/approval/receipt-meeting', icon: 'fa-users',
        keywords: ['회의비','회의록','연구비회의','회의비청구','회의증빙','회의비신청','회의','회의비신청서']
    },
    {
        category: '프로젝트 문서함', label: '단독 출장 증빙', url: '/approval/receipt-trip', icon: 'fa-plane',
        keywords: ['출장','출장비','출장증빙','단독출장','출장신청','출장비청구','출장비증빙','연구비출장','출장신청서']
    },
    {
        category: '프로젝트 문서함', label: '출장+회의 증빙', url: '/approval/receipt-trip-meeting', icon: 'fa-plane-arrival',
        keywords: ['출장회의','출장+회의','출장및회의','출장회의증빙','출장+회의증빙','출장회의신청']
    },
    {
        category: '프로젝트 문서함', label: '야근식대 증빙', url: '/approval/receipt-overtime', icon: 'fa-moon',
        keywords: ['야근','야근식대','저녁식사','야근비','시간외','야근식비','초과근무식대','야근식대청구','야근신청']
    },
    // ── 프로젝트 관리 ──
    {
        category: '프로젝트 관리', label: '프로젝트 목록', url: '/project', icon: 'fa-project-diagram',
        keywords: ['프로젝트','과제','프로젝트목록','프로젝트현황','연구과제','과제목록']
    },
    {
        category: '프로젝트 관리', label: '신규 프로젝트', url: '/project/new', icon: 'fa-plus-circle',
        keywords: ['프로젝트등록','신규과제','프로젝트생성','과제등록','신규프로젝트등록']
    },
    // ── 공통 메뉴 ──
    {
        category: '공통', label: '조직도', url: '/organization', icon: 'fa-sitemap',
        keywords: ['조직','부서','직원','조직현황','회사구조','팀구성','org']
    },
    {
        category: '공통', label: '일정관리', url: '/calendar', icon: 'fa-calendar-alt',
        keywords: ['일정','캘린더','스케줄','회의실예약','일정등록','calendar','일정추가']
    },
    {
        category: '공통', label: '외부인원 관리', url: '/external-person', icon: 'fa-user-tie',
        keywords: ['외부인원','외부인력','협력사','외부인','외부직원','외부인원등록']
    },
    {
        category: '공통', label: '설정', url: '/settings', icon: 'fa-user-cog',
        keywords: ['설정','내정보','프로필','비밀번호변경','계정','마이페이지','개인설정']
    },
    // ── 관리 ──
    {
        category: '관리', label: '전체 연차관리', url: '/admin/vacation-management', icon: 'fa-users-cog',
        keywords: ['연차관리','전체연차','직원연차','연차현황','연차승인','연차승인관리','연차현황관리']
    },
    {
        category: '관리', label: '연차신청서 관리', url: '/admin/vacation-documents', icon: 'fa-file-alt',
        keywords: ['연차신청관리','연차문서관리','휴가관리','연차문서']
    },
    {
        category: '관리', label: '사용자 관리', url: '/hr', icon: 'fa-users',
        keywords: ['직원관리','인사관리','임직원관리','계정관리','hr']
    },
    {
        category: '관리', label: '보고체계 관리', url: '/manage-hierarchy', icon: 'fa-sitemap',
        keywords: ['보고체계','결재라인','결재선','보고구조','결재체계']
    },
    {
        category: '관리', label: '기초정보관리', url: '/basic-info', icon: 'fa-database',
        keywords: ['기초정보','경비기준','직급별경비','기준경비','기초설정','비용기준']
    },
];

// 쿼리와 메뉴 항목 매칭 (점수 기반)
function searchMenuItems(query) {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();

    return MENU_ITEMS
        .map(item => {
            const label    = item.label.toLowerCase();
            const category = item.category.toLowerCase();
            const keywords = item.keywords.map(k => k.toLowerCase());
            let score = 0;

            if (label === q)                               score = 100;
            else if (label.startsWith(q))                  score = 80;
            else if (label.includes(q))                    score = 60;
            else if (keywords.some(k => k === q))          score = 75;
            else if (keywords.some(k => k.startsWith(q)))  score = 55;
            else if (keywords.some(k => k.includes(q)))    score = 35;
            else if (category.includes(q))                 score = 20;

            return { item, score };
        })
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 7)
        .map(x => x.item);
}

// 쿼리 부분을 <mark>로 하이라이트
function highlightSearchText(text, query) {
    if (!query || !query.trim()) return escapeHtml(text);
    const q = query.trim();
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    return escapeHtml(text.substring(0, idx))
        + `<mark>${escapeHtml(text.substring(idx, idx + q.length))}</mark>`
        + escapeHtml(text.substring(idx + q.length));
}

// 검색 기능 초기화
function initGlobalSearch() {
    const input    = document.getElementById('globalSearchInput');
    const box      = document.getElementById('globalSearchBox');
    const dropdown = document.getElementById('searchDropdown');
    if (!input || !dropdown) return;

    let kbdIdx = -1; // 키보드 선택 인덱스

    function showDropdown(items, query) {
        kbdIdx = -1;
        if (items.length === 0) {
            dropdown.innerHTML = `
                <div class="search-dropdown-empty">
                    <i class="fas fa-search"></i>
                    '<strong>${escapeHtml(query)}</strong>'에 대한 결과가 없습니다
                </div>`;
        } else {
            dropdown.innerHTML = items.map((item, i) => `
                <div class="search-dropdown-item" data-url="${item.url}" data-i="${i}">
                    <div class="search-dropdown-icon"><i class="fas ${item.icon}"></i></div>
                    <div class="search-dropdown-info">
                        <div class="search-dropdown-label">${highlightSearchText(item.label, query)}</div>
                        <div class="search-dropdown-breadcrumb">
                            <span>${escapeHtml(item.category)}</span>
                            <i class="fas fa-chevron-right" style="font-size:9px;"></i>
                            <span>${escapeHtml(item.label)}</span>
                        </div>
                    </div>
                    <i class="fas fa-arrow-right search-dropdown-arrow"></i>
                </div>
            `).join('');

            // 클릭 이벤트 위임
            dropdown.querySelectorAll('.search-dropdown-item').forEach(el => {
                el.addEventListener('click', () => {
                    window.location.href = el.getAttribute('data-url');
                });
            });
        }
        dropdown.classList.add('visible');
    }

    function hideDropdown() {
        dropdown.classList.remove('visible');
        kbdIdx = -1;
    }

    function updateKbdHighlight() {
        dropdown.querySelectorAll('.search-dropdown-item').forEach((el, i) => {
            el.classList.toggle('kbd-active', i === kbdIdx);
        });
    }

    input.addEventListener('input', function () {
        const q = this.value.trim();
        if (!q) { hideDropdown(); return; }
        const results = searchMenuItems(q);
        showDropdown(results, q);
    });

    input.addEventListener('keydown', function (e) {
        const items = dropdown.querySelectorAll('.search-dropdown-item');
        if (!dropdown.classList.contains('visible')) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            kbdIdx = Math.min(kbdIdx + 1, items.length - 1);
            updateKbdHighlight();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            kbdIdx = Math.max(kbdIdx - 1, -1);
            updateKbdHighlight();
        } else if (e.key === 'Enter') {
            if (kbdIdx >= 0 && items[kbdIdx]) {
                window.location.href = items[kbdIdx].getAttribute('data-url');
            }
        } else if (e.key === 'Escape') {
            hideDropdown();
            this.blur();
        }
    });

    input.addEventListener('focus', function () {
        if (this.value.trim()) {
            const results = searchMenuItems(this.value.trim());
            showDropdown(results, this.value.trim());
        }
    });

    // 검색박스 외부 클릭 시 닫기
    document.addEventListener('click', function (e) {
        if (box && !box.contains(e.target)) hideDropdown();
    });
}
