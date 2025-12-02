document.addEventListener('DOMContentLoaded', function() {
    // 프로젝트 목록 페이지 요소
    const newProjectBtn = document.getElementById('newProjectBtn');
    const searchCurrentInput = document.getElementById('searchCurrentInput');
    const currentProjectGrid = document.getElementById('currentProjectGrid');

    // 프로젝트 데이터
    let allCurrentProjects = [];
    let allPastProjectsData = [];

    // 과거 프로젝트 테이블 요소
    const pastStatusFilter = document.getElementById('pastStatusFilter');
    const searchPastInput = document.getElementById('searchPastInput');
    const pastProjectTableBody = document.getElementById('pastProjectTableBody');
    const pastProjectRows = document.querySelectorAll('#pastProjectTable tbody tr');

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

    // 신규 프로젝트 페이지로 이동
    if (newProjectBtn) {
        newProjectBtn.addEventListener('click', function() {
            window.location.href = '/project/new';
        });
    }

    // 현재 진행중인 프로젝트 검색
    if (searchCurrentInput) {
        searchCurrentInput.addEventListener('input', function() {
            filterCurrentProjects();
        });
    }

    // 현재 프로젝트 필터링
    function filterCurrentProjects() {
        const searchValue = searchCurrentInput.value.toLowerCase();

        const filteredProjects = allCurrentProjects.filter(project => {
            return !searchValue || project.projectName.toLowerCase().includes(searchValue);
        });

        renderCurrentProjects(filteredProjects);
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

        currentProjectGrid.innerHTML = projects.map(project => `
            <div class="project-card" data-project-name="${project.projectName}" data-project-id="${project.idx}">
                <div class="project-header">
                    <h3>${project.projectName}</h3>
                    <span class="status-badge ${getStatusClass(project.projectStatus)}">${getStatusLabel(project.projectStatus)}</span>
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
                    <div class="project-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${project.progress}%;"></div>
                        </div>
                        <span class="progress-text">${project.progress}%</span>
                    </div>
                    <p class="project-description">
                        ${project.description || '프로젝트 설명이 없습니다.'}
                    </p>
                </div>
                <div class="project-footer">
                    <button class="btn btn-sm btn-primary" onclick="editProject(${project.idx})">
                        <i class="fas fa-edit"></i> 수정
                    </button>
                </div>
            </div>
        `).join('');
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

    // 과거 프로젝트 상태 필터
    if (pastStatusFilter) {
        pastStatusFilter.addEventListener('change', function() {
            filterPastProjects();
        });
    }

    // 과거 프로젝트 검색
    if (searchPastInput) {
        searchPastInput.addEventListener('input', function() {
            filterPastProjects();
        });
    }

    // 초기 데이터 로드
    function loadPastProjects() {
        // 최적화된 과거 프로젝트 전용 API 사용
        fetch('/api/projects/past')
            .then(response => {
                if (!response.ok) {
                    throw new Error('프로젝트 목록을 불러오는데 실패했습니다.');
                }
                return response.json();
            })
            .then(projects => {
                // 이미 백엔드에서 필터링된 과거 프로젝트만 반환됨
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
                    progress: project.progress,
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
        const statusValue = pastStatusFilter ? pastStatusFilter.value : '';
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

                // 시작일이 오늘 이후인지 확인
                const startDate = new Date(project.period.split(' ~ ')[0]);
                startDate.setHours(0, 0, 0, 0);
                const isFutureProject = startDate > today;

                // 미래 프로젝트인 경우 클래스 추가
                if (isFutureProject) {
                    row.classList.add('future-project');
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

    // 초기 로드
    if (currentProjectGrid) {
        loadCurrentProjects();
    }

    if (pastProjectTableBody) {
        loadPastProjects();
    }

    // 프로젝트 상세보기 (전역 함수)
    window.viewProject = function(projectId) {
        fetch(`/api/projects/${projectId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('프로젝트 정보를 불러오는데 실패했습니다.');
                }
                return response.json();
            })
            .then(project => {
                // 모달에 데이터 채우기
                document.getElementById('detailProjectName').textContent = project.projectName;
                document.getElementById('detailStatus').textContent = getStatusLabel(project.projectStatus);
                document.getElementById('detailPM').textContent = project.projectManagerName || '-';
                document.getElementById('detailTeamSize').textContent = project.memberCount + '명';
                document.getElementById('detailStartDate').textContent = project.startDate;
                document.getElementById('detailEndDate').textContent = project.endDate;
                document.getElementById('detailDescription').textContent = project.description || '설명이 없습니다.';
                document.getElementById('detailProgressBar').style.width = project.progress + '%';
                document.getElementById('detailProgressText').textContent = project.progress + '%';

                // 모달 열기
                if (projectDetailModal) {
                    projectDetailModal.classList.add('active');
                }
            })
            .catch(error => {
                console.error('Error loading project details:', error);
                alert('프로젝트 정보를 불러올 수 없습니다.');
            });
    };

    // 프로젝트 수정 (전역 함수)
    window.editProject = function(projectId) {
        window.location.href = `/project/edit/${projectId}`;
    };

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
});
