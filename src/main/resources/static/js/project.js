document.addEventListener('DOMContentLoaded', function() {
    // 현재 로그인한 사용자 정보
    const currentUserIdx = window.CURRENT_USER?.idx || null;
    console.log('현재 로그인 사용자:', window.CURRENT_USER?.empName, '(idx:', currentUserIdx, ')');

    // 프로젝트 목록 페이지 요소
    const newProjectBtn = document.getElementById('newProjectBtn');
    const currentProjectGrid = document.getElementById('currentProjectGrid');

    // 프로젝트 데이터
    let allCurrentProjects = [];
    let allPastProjectsData = [];
    let myProjectIds = []; // 내가 참여한 프로젝트 ID 목록

    // 과거 프로젝트 테이블 요소
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchPastInput = document.getElementById('searchPastInput');
    const pastProjectTableBody = document.getElementById('pastProjectTableBody');
    const pastProjectRows = document.querySelectorAll('#pastProjectTable tbody tr');

    // 현재 선택된 필터 상태
    let currentStatusFilter = '';

    // 페이지네이션 요소
    const firstPageBtn = document.getElementById('firstPageBtn');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const lastPageBtn = document.getElementById('lastPageBtn');
    const paginationNumbers = document.getElementById('paginationNumbers');
    const pageInfo = document.getElementById('pageInfo');

    // 페이지네이션 상태
    let currentPage = 1;
    const itemsPerPage = 10;
    let allPastProjects = [];
    let filteredPastProjects = [];

    const projectDetailModal = document.getElementById('projectDetailModal');

    // 현재 상세보기 중인 프로젝트 ID
    let currentDetailProjectId = null;

    // 신규 프로젝트 페이지로 이동
    if (newProjectBtn) {
        newProjectBtn.addEventListener('click', function() {
            window.location.href = '/project/new';
        });
    }

    // 현재 진행중인 프로젝트 로드
    function loadCurrentProjects() {
        fetch('/api/projects?status=IN_PROGRESS')
            .then(response => {
                if (!response.ok) {
                    throw new Error('프로젝트 목록을 불러오는데 실패했습니다.');
                }
                return response.json();
            })
            .then(projects => {
                allCurrentProjects = projects;
                renderCurrentProjects(projects);
            })
            .catch(error => {
                console.error('Error loading current projects:', error);
                if (currentProjectGrid) {
                    currentProjectGrid.innerHTML = '<p class="text-center" style="padding: 40px; color: #868e96;">프로젝트를 불러올 수 없습니다.</p>';
                }
            });
    }

    // 현재 프로젝트 렌더링
    function renderCurrentProjects(projects) {
        if (!currentProjectGrid) return;

        if (projects.length === 0) {
            currentProjectGrid.innerHTML = '<p class="text-center" style="grid-column: 1/-1; padding: 40px; color: #868e96;">진행중인 프로젝트가 없습니다.</p>';
            return;
        }

        currentProjectGrid.innerHTML = projects.map(project => {
            const formatBudgetBox = (used, budget) => {
                const usedAmount = used || 0;
                const budgetAmount = budget || 0;
                const remaining = budgetAmount - usedAmount;
                return {
                    used: formatCurrency(usedAmount),
                    total: formatCurrency(budgetAmount),
                    remaining: formatCurrency(remaining)
                };
            };

            const activity = formatBudgetBox(project.activityUsed, project.activityBudget);
            const equipment = formatBudgetBox(project.equipmentUsed, project.equipmentBudget);
            const material = formatBudgetBox(project.materialUsed, project.materialBudget);

            // 내가 참여한 프로젝트인지 확인
            const isMyProject = myProjectIds.includes(project.idx);
            const myProjectClass = isMyProject ? ' my-project-card' : '';
            const myProjectIcon = isMyProject ? '<i class="fas fa-user-check my-project-icon" title="내가 참여한 프로젝트"></i>' : '';

            return `
            <div class="project-card${myProjectClass}" data-project-name="${project.projectName}" data-project-id="${project.idx}">
                <div class="project-header">
                    <h3>${project.projectName}</h3>
                    <div class="header-badges">
                        ${myProjectIcon}
                        <span class="status-badge ${getStatusClass(project.projectStatus)}">${getStatusLabel(project.projectStatus)}</span>
                    </div>
                </div>
                <div class="project-body">
                    <div class="project-info">
                        <div class="info-item">
                            <i class="fas fa-user"></i>
                            <span>연구책임자: ${project.projectManagerName || '-'}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-users"></i>
                            <span>팀원: ${project.memberCount}명</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-calendar"></i>
                            <span>${project.startDate} ~ ${project.endDate}</span>
                        </div>
                    </div>
                    <div class="project-budget-section">
                        <div class="budget-boxes">
                            <div class="budget-box">
                                <div class="budget-box-header">활동비</div>
                                <div class="budget-box-body">
                                    <div class="budget-row">
                                        <span class="budget-label">사용금액</span>
                                        <span class="budget-value">${activity.used}</span>
                                    </div>
                                    <div class="budget-row">
                                        <span class="budget-label">총 금액</span>
                                        <span class="budget-value">${activity.total}</span>
                                    </div>
                                    <div class="budget-row">
                                        <span class="budget-label">잔여금액</span>
                                        <span class="budget-value budget-remaining">${activity.remaining}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="budget-box">
                                <div class="budget-box-header">장비비</div>
                                <div class="budget-box-body">
                                    <div class="budget-row">
                                        <span class="budget-label">사용금액</span>
                                        <span class="budget-value">${equipment.used}</span>
                                    </div>
                                    <div class="budget-row">
                                        <span class="budget-label">총 금액</span>
                                        <span class="budget-value">${equipment.total}</span>
                                    </div>
                                    <div class="budget-row">
                                        <span class="budget-label">잔여금액</span>
                                        <span class="budget-value budget-remaining">${equipment.remaining}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="budget-box">
                                <div class="budget-box-header">재료비</div>
                                <div class="budget-box-body">
                                    <div class="budget-row">
                                        <span class="budget-label">사용금액</span>
                                        <span class="budget-value">${material.used}</span>
                                    </div>
                                    <div class="budget-row">
                                        <span class="budget-label">총 금액</span>
                                        <span class="budget-value">${material.total}</span>
                                    </div>
                                    <div class="budget-row">
                                        <span class="budget-label">잔여금액</span>
                                        <span class="budget-value budget-remaining">${material.remaining}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="project-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${project.progressRate || 0}%;"></div>
                        </div>
                        <span class="progress-text">${project.progressRate || 0}%</span>
                    </div>
                    <p class="project-description">
                        ${project.description || '프로젝트 설명이 없습니다.'}
                    </p>
                </div>
            </div>
        `;
        }).join('');

        // 프로젝트 카드 클릭 이벤트 추가
        document.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', function() {
                const projectId = this.getAttribute('data-project-id');
                viewProject(projectId);
            });
        });
    }

    // 상태 코드 → CSS 클래스
    function getStatusClass(status) {
        const statusMap = {
            'PLANNING': 'status-planning',
            'IN_PROGRESS': 'status-in-progress',
            'COMPLETED': 'status-completed',
            'ON_HOLD': 'status-on-hold',
            'CANCELLED': 'status-cancelled'
        };
        return statusMap[status] || 'status-badge';
    }

    // 상태 코드 → 한글 라벨
    function getStatusLabel(status) {
        const labelMap = {
            'PLANNING': '기획',
            'IN_PROGRESS': '진행중',
            'COMPLETED': '완료',
            'ON_HOLD': '보류',
            'CANCELLED': '취소'
        };
        return labelMap[status] || status;
    }

    // 숫자를 천 단위 콤마 형식으로 변환
    function formatCurrency(amount) {
        if (amount === null || amount === undefined || amount === '') {
            return '0';
        }
        return Number(amount).toLocaleString('ko-KR');
    }

    // 예산 대비 사용 현황 포맷 (사용액 / 예산액)
    function formatBudgetUsage(used, budget) {
        const usedAmount = used || 0;
        const budgetAmount = budget || 0;
        const remaining = budgetAmount - usedAmount;

        return `사용 금액 : ${formatCurrency(usedAmount)} / 총 금액 : ${formatCurrency(budgetAmount)} / 잔여 금액 : <span style="font-weight: bold">${formatCurrency(remaining)}</span> 원`;
    }

    // 필터 버튼 클릭 이벤트
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 모든 버튼에서 active 클래스 제거
            filterButtons.forEach(btn => btn.classList.remove('active'));

            // 클릭한 버튼에 active 클래스 추가
            this.classList.add('active');

            // 현재 필터 상태 업데이트
            currentStatusFilter = this.getAttribute('data-status');

            // 필터 적용
            filterPastProjects();
        });
    });

    // 과거 프로젝트 검색
    if (searchPastInput) {
        searchPastInput.addEventListener('input', function() {
            filterPastProjects();
        });
    }

    // 내가 참여한 프로젝트 ID 목록 로드
    async function loadMyProjects() {
        if (!currentUserIdx) return;

        try {
            const response = await fetch(`/api/projects?memberIdx=${currentUserIdx}`);
            if (response.ok) {
                const projects = await response.json();
                myProjectIds = projects.map(p => p.idx);
                console.log('내가 참여한 프로젝트 IDs:', myProjectIds);
            }
        } catch (error) {
            console.error('내 프로젝트 로드 오류:', error);
        }
    }

    // 초기 데이터 로드
    function loadPastProjects() {
        // 모든 프로젝트 조회 (진행중인 프로젝트 포함)
        fetch('/api/projects')
            .then(response => {
                if (!response.ok) {
                    throw new Error('프로젝트 목록을 불러오는데 실패했습니다.');
                }
                return response.json();
            })
            .then(projects => {
                // 모든 프로젝트 매핑
                allPastProjectsData = projects.map((project, index) => ({
                    no: index + 1,
                    idx: project.idx,
                    name: project.projectName,
                    status: project.projectStatus,
                    statusLabel: getStatusLabel(project.projectStatus),
                    statusClass: getStatusClass(project.projectStatus),
                    pm: project.projectManagerName || '-',
                    teamSize: project.memberCount + '명',
                    period: `${project.startDate} ~ ${project.endDate}`,
                    progress: project.progressRate || 0,
                    projectId: project.idx
                }));

                allPastProjects = allPastProjectsData;
                filteredPastProjects = [...allPastProjects];
                currentPage = 1;
                renderPastProjects();
            })
            .catch(error => {
                console.error('Error loading past projects:', error);
                if (pastProjectTableBody) {
                    pastProjectTableBody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 40px;">프로젝트를 불러올 수 없습니다.</td></tr>';
                }
            });
    }

    // 과거 프로젝트 필터링
    function filterPastProjects() {
        const statusValue = currentStatusFilter;
        const searchValue = searchPastInput ? searchPastInput.value.toLowerCase() : '';

        filteredPastProjects = allPastProjects.filter(project => {
            const statusMatch = !statusValue || project.status === statusValue;
            const searchMatch = !searchValue || project.name.toLowerCase().includes(searchValue);
            return statusMatch && searchMatch;
        });

        currentPage = 1;
        renderPastProjects();
    }

    // 과거 프로젝트 렌더링
    function renderPastProjects() {
        if (!pastProjectTableBody) return;

        const totalPages = Math.ceil(filteredPastProjects.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredPastProjects.length);
        const currentProjects = filteredPastProjects.slice(startIndex, endIndex);

        // 테이블 렌더링
        pastProjectTableBody.innerHTML = '';

        if (currentProjects.length === 0) {
            pastProjectTableBody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 40px;">검색 결과가 없습니다.</td></tr>';
        } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // 시간 정보 제거

            currentProjects.forEach(project => {
                const row = document.createElement('tr');
                row.setAttribute('data-status', project.status);
                row.setAttribute('data-project-name', project.name);
                row.setAttribute('data-project-id', project.projectId);

                // 현재 로그인한 사용자가 참여한 프로젝트인지 확인
                const isMyProject = myProjectIds.includes(project.projectId);

                // 내가 참여한 프로젝트인 경우 클래스 추가
                if (isMyProject) {
                    row.classList.add('my-project');
                }

                row.innerHTML = `
                    <td class="text-center">${project.no}</td>
                    <td><strong>${project.name}</strong></td>
                    <td><span class="status-badge ${project.statusClass}">${project.statusLabel}</span></td>
                    <td>${project.pm}</td>
                    <td class="text-center">${project.teamSize}</td>
                    <td>${project.period}</td>
                    <td>
                        <div class="table-progress">
                            <div class="progress-bar-small">
                                <div class="progress-fill" style="width: ${project.progress}%;"></div>
                            </div>
                            <span class="progress-text-small">${project.progress}%</span>
                        </div>
                    </td>
                    <td class="text-center action-cell">
                        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); editProject(${project.projectId})" title="수정">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                `;

                // 행 클릭 이벤트 추가 (상세보기)
                row.addEventListener('click', function() {
                    viewProject(project.projectId);
                });

                pastProjectTableBody.appendChild(row);
            });
        }

        // 페이지네이션 렌더링
        renderPagination(totalPages);
    }

    // 페이지네이션 렌더링
    function renderPagination(totalPages) {
        if (!paginationNumbers) return;

        // 버튼 상태 업데이트
        if (firstPageBtn) firstPageBtn.disabled = currentPage === 1;
        if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
        if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
        if (lastPageBtn) lastPageBtn.disabled = currentPage === totalPages || totalPages === 0;

        // 페이지 번호 렌더링
        paginationNumbers.innerHTML = '';

        if (totalPages === 0) {
            if (pageInfo) pageInfo.textContent = '0 / 0';
            return;
        }

        // 페이지 범위 계산 (최대 5개 페이지 번호 표시)
        const maxPageNumbers = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPageNumbers / 2));
        let endPage = Math.min(totalPages, startPage + maxPageNumbers - 1);

        if (endPage - startPage < maxPageNumbers - 1) {
            startPage = Math.max(1, endPage - maxPageNumbers + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'page-number';
            if (i === currentPage) {
                pageBtn.classList.add('active');
            }
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                renderPastProjects();
            });
            paginationNumbers.appendChild(pageBtn);
        }

        // 페이지 정보 업데이트
        if (pageInfo) {
            const startItem = (currentPage - 1) * itemsPerPage + 1;
            const endItem = Math.min(currentPage * itemsPerPage, filteredPastProjects.length);
            pageInfo.textContent = `${startItem}-${endItem} / ${filteredPastProjects.length}건`;
        }
    }

    // 페이지네이션 버튼 이벤트
    if (firstPageBtn) {
        firstPageBtn.addEventListener('click', () => {
            currentPage = 1;
            renderPastProjects();
        });
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPastProjects();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredPastProjects.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderPastProjects();
            }
        });
    }

    if (lastPageBtn) {
        lastPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredPastProjects.length / itemsPerPage);
            currentPage = totalPages;
            renderPastProjects();
        });
    }

    // 초기 로드 (내 프로젝트 목록을 먼저 로드한 후 전체 프로젝트 로드)
    loadMyProjects().then(() => {
        if (currentProjectGrid) {
            loadCurrentProjects();
        }

        if (pastProjectTableBody) {
            loadPastProjects();
        }
    });

    // 프로젝트 상세보기 (전역 함수)
    window.viewProject = function(projectId) {
        // 프로젝트 상세 페이지로 이동
        location.href = `/project/detail?projectId=${projectId}`;
    };

    // 프로젝트별 보고서 조회 및 렌더링
    function loadProjectReports(projectIdx) {
        // 주간보고서만 조회
        fetch(`/api/document/weekly-report/project/${projectIdx}`)
            .then(res => res.ok ? res.json() : [])
            .then(weeklyReports => {
                // 주간보고서에 분류 추가
                const weeklyData = weeklyReports.map(report => ({
                    ...report,
                    reportType: '주간',
                    period: report.reportPeriod,
                    content: report.mainTasks || '-',
                    achievement: report.weeklyAchievementRate
                }));

                // 기간 순으로 정렬 (최신순)
                weeklyData.sort((a, b) => {
                    if (a.period && b.period) {
                        return b.period.localeCompare(a.period);
                    }
                    return 0;
                });

                // 테이블 렌더링
                renderProjectSchedule(weeklyData);
            })
            .catch(error => {
                console.error('Error loading project reports:', error);
                renderProjectSchedule([]);
            });
    }

    // 프로젝트 일정 테이블 렌더링
    function renderProjectSchedule(reports) {
        const tbody = document.getElementById('detailScheduleTableBody');

        if (!tbody) return;

        if (reports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 40px; color: #868e96;">등록된 보고서가 없습니다.</td></tr>';
            return;
        }

        tbody.innerHTML = reports.map((report, index) => {
            const achievementBadge = report.achievement !== null && report.achievement !== undefined
                ? `<span class="achievement-badge ${getAchievementClass(report.achievement)}">${report.achievement}%</span>`
                : '-';

            // No는 역순으로 표시 (맨 아래가 1)
            const rowNumber = reports.length - index;

            return `
                <tr style="cursor: pointer;" onclick="viewWeeklyReportDetail(${report.id})">
                    <td class="text-center">${rowNumber}</td>
                    <td class="text-center"><span class="status-badge ${report.reportType === '주간' ? 'status-in-progress' : 'status-completed'}">${report.reportType}</span></td>
                    <td>${report.period || '-'}</td>
                    <td>${report.content}</td>
                    <td class="text-center">${achievementBadge}</td>
                </tr>
            `;
        }).join('');
    }

    // 주간보고서 상세 페이지로 이동 (전역 함수)
    window.viewWeeklyReportDetail = function(reportId) {
        window.location.href = `/approval/project-weekly-report/detail?id=${reportId}`;
    };

    // 달성률에 따른 클래스 반환
    function getAchievementClass(rate) {
        if (rate >= 80) return 'achievement-high';
        if (rate >= 50) return 'achievement-medium';
        return 'achievement-low';
    }

    // 프로젝트 수정 (전역 함수)
    window.editProject = function(projectId) {
        window.location.href = `/project/edit/${projectId}`;
    };

    // 현재 상세보기 중인 프로젝트 수정 (전역 함수)
    window.editCurrentProject = function() {
        if (currentDetailProjectId) {
            window.location.href = `/project/edit/${currentDetailProjectId}`;
        }
    };

    // 주간업무보고 작성 버튼 이벤트
    const createWeeklyReportBtn = document.getElementById('createWeeklyReportBtn');
    if (createWeeklyReportBtn) {
        createWeeklyReportBtn.addEventListener('click', function() {
            // 프로젝트 주간업무보고 작성 페이지로 이동 (프로젝트 ID 전달)
            if (currentDetailProjectId) {
                window.location.href = `/approval/project-weekly-report?projectIdx=${currentDetailProjectId}`;
            } else {
                window.location.href = '/approval/project-weekly-report';
            }
        });
    }

    // 프로젝트 상세 모달 닫기 (전역 함수)
    window.closeProjectDetailModal = function() {
        if (projectDetailModal) {
            projectDetailModal.classList.remove('active');
        }
    };

    // 모달 배경 클릭 시 닫기
    if (projectDetailModal) {
        projectDetailModal.addEventListener('click', function(e) {
            if (e.target === projectDetailModal) {
                closeProjectDetailModal();
            }
        });
    }

    // 프로젝트 상세 모달 탭 전환 (전역 함수)
    window.switchDetailTab = function(tabName) {
        // 모달 내의 탭 버튼에서만 active 클래스 제거
        document.querySelectorAll('#projectDetailModal .modal-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // 모달 내의 탭 컨텐츠만 숨기기
        document.getElementById('infoTabContent').style.display = 'none';
        document.getElementById('scheduleTabContent').style.display = 'none';

        // 선택된 탭 버튼 활성화
        const selectedTabButton = document.querySelector(`#projectDetailModal .modal-tab[data-tab="${tabName}"]`);
        if (selectedTabButton) {
            selectedTabButton.classList.add('active');
        }

        // 선택된 탭 컨텐츠 표시
        const selectedTabContent = document.getElementById(`${tabName}TabContent`);
        if (selectedTabContent) {
            selectedTabContent.style.display = 'block';
        }
    };
});
