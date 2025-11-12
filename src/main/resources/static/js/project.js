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

    // 신규 프로젝트 페이지 요소
    const projectForm = document.getElementById('projectForm');
    const addMemberBtn = document.getElementById('addMemberBtn');
    const memberSelectModal = document.getElementById('memberSelectModal');
    const memberSearchInput = document.getElementById('memberSearchInput');
    const teamTableBody = document.getElementById('teamTableBody');
    const teamTableFooter = document.getElementById('teamTableFooter');
    const addCardBtn = document.getElementById('addCardBtn');
    const cardModal = document.getElementById('cardModal');
    const cardList = document.getElementById('cardList');
    const progressRange = document.getElementById('progressRange');
    const progressNumber = document.getElementById('progressNumber');
    const projectFiles = document.getElementById('projectFiles');
    const fileList = document.getElementById('fileList');

    // 선택된 팀원 목록
    let selectedMemberList = [];
    let memberIdCounter = 0;

    // 카드 목록
    let cardListData = [];
    let cardIdCounter = 0;

    // 연계 프로젝트 목록
    let relatedProjectList = [];
    let relatedProjectIdCounter = 0;

    // 프로젝트 목록 페이지 기능
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
                            <span>PM: ${project.projectManagerName || '-'}</span>
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
        fetch('/api/projects')
            .then(response => {
                if (!response.ok) {
                    throw new Error('프로젝트 목록을 불러오는데 실패했습니다.');
                }
                return response.json();
            })
            .then(projects => {
                // 진행중이 아닌 프로젝트만 과거 프로젝트로 표시
                const pastProjects = projects.filter(p => p.projectStatus !== 'IN_PROGRESS');

                allPastProjectsData = pastProjects.map((project, index) => ({
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
            currentProjects.forEach(project => {
                const row = document.createElement('tr');
                row.setAttribute('data-status', project.status);
                row.setAttribute('data-project-name', project.name);
                row.setAttribute('data-project-id', project.projectId);
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

    // 신규 프로젝트 페이지 기능

    // 연구 책임자 드롭다운 요소
    const projectManagerSelect = document.getElementById('projectManager');

    // 연구 책임자 목록 로드
    if (projectManagerSelect) {
        loadProjectManagers();
    }

    // 연구 책임자 목록 로드 함수
    function loadProjectManagers() {
        fetch('/api/users')
            .then(response => {
                if (!response.ok) {
                    throw new Error('사용자 목록을 불러오는데 실패했습니다.');
                }
                return response.json();
            })
            .then(users => {
                // 기존 옵션 제거 (첫 번째 "선택하세요" 제외)
                while (projectManagerSelect.options.length > 1) {
                    projectManagerSelect.remove(1);
                }

                // 활성 사용자만 필터링하여 드롭다운에 추가
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.idx;
                    option.textContent = `${user.empName} (${user.empDept} / ${user.empPosition})`;
                    projectManagerSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error loading project managers:', error);
                // 에러 발생 시에도 기본 옵션은 유지
            });
    }

    // 팀원 추가 버튼 클릭 시 모달 열기 (tfoot의 버튼과 empty-row 클릭 모두 처리)
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openMemberModal();
        });
    }

    // 빈 테이블 클릭 시 팀원 추가 모달 열기
    document.addEventListener('click', function(e) {
        if (e.target.closest('.empty-row')) {
            openMemberModal();
        }
    });

    // 모달 열기
    function openMemberModal() {
        if (!memberSelectModal) return;

        // 인력 목록을 먼저 로드한 후 모달 표시
        loadMembersForModal();
    }

    // 인력 목록 로드 함수
    function loadMembersForModal() {
        fetch('/api/users')
            .then(response => {
                if (!response.ok) {
                    throw new Error('인력 목록을 불러오는데 실패했습니다.');
                }
                return response.json();
            })
            .then(users => {
                renderMemberSelectTable(users);

                // 모달 표시
                memberSelectModal.classList.add('active');

                // 이미 추가된 팀원들의 체크박스 상태 유지
                updateCheckboxStates();
            })
            .catch(error => {
                console.error('Error loading members:', error);
                alert('인력 목록을 불러올 수 없습니다.');
            });
    }

    // 인력 선택 테이블 렌더링
    function renderMemberSelectTable(users) {
        const memberSelectTableBody = document.getElementById('memberSelectTableBody');
        if (!memberSelectTableBody) return;

        // 테이블 초기화
        memberSelectTableBody.innerHTML = '';

        if (users.length === 0) {
            memberSelectTableBody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding: 40px;">등록된 인력이 없습니다.</td></tr>';
            return;
        }

        // 활성 상태 사용자만 표시
        const activeUsers = users.filter(user => user.empStatus === '재직' || !user.empStatus);

        activeUsers.forEach(user => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', user.idx);
            row.setAttribute('data-name', user.empName);
            row.setAttribute('data-dept', user.empDept || '-');
            row.setAttribute('data-position', user.empPosition || '-');

            row.innerHTML = `
                <td><input type="checkbox" class="member-checkbox" value="${user.idx}"></td>
                <td>${user.empName}</td>
                <td>${user.empDept || '-'}</td>
                <td>${user.empPosition || '-'}</td>
            `;

            memberSelectTableBody.appendChild(row);
        });
    }

    // 모달 닫기 (전역 함수)
    window.closeMemberModal = function() {
        if (!memberSelectModal) return;
        memberSelectModal.classList.remove('active');

        // 검색 초기화
        if (memberSearchInput) {
            memberSearchInput.value = '';
            filterMembers();
        }
    };

    // 체크박스 상태 업데이트
    function updateCheckboxStates() {
        const checkboxes = document.querySelectorAll('.member-checkbox');
        checkboxes.forEach(checkbox => {
            const memberId = checkbox.value;
            const isSelected = selectedMemberList.some(m => m.id === memberId);
            checkbox.checked = isSelected;

            // 행 선택 스타일
            const row = checkbox.closest('tr');
            if (isSelected) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
    }

    // 팀원 검색
    if (memberSearchInput) {
        memberSearchInput.addEventListener('input', filterMembers);
    }

    function filterMembers() {
        const searchValue = memberSearchInput ? memberSearchInput.value.toLowerCase() : '';
        const rows = document.querySelectorAll('#memberSelectTableBody tr');

        rows.forEach(row => {
            const name = row.getAttribute('data-name') || '';
            if (name.toLowerCase().includes(searchValue)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // 체크박스 클릭 시 행 선택 스타일 토글
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('member-checkbox')) {
            const row = e.target.closest('tr');
            if (e.target.checked) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        }
    });

    // 프로젝트 역할 옵션
    const PROJECT_ROLES = [
        { value: '', label: '선택하세요' },
        { value: 'PM', label: 'PM (프로젝트 관리자)' },
        { value: 'PL', label: 'PL (프로젝트 리더)' },
        { value: 'DEVELOPER', label: '개발자' },
        { value: 'SENIOR_RESEARCHER', label: '선임연구원' },
        { value: 'RESEARCHER', label: '연구원' },
        { value: 'ASSISTANT_RESEARCHER', label: '보조연구원' },
        { value: 'QA', label: 'QA/테스터' }
    ];

    // 선택 완료 (전역 함수)
    window.addSelectedMembers = function() {
        const checkboxes = document.querySelectorAll('.member-checkbox:checked');
        const projectStartDate = document.getElementById('startDate').value;
        const projectEndDate = document.getElementById('endDate').value;

        checkboxes.forEach(checkbox => {
            const row = checkbox.closest('tr');
            const memberId = checkbox.value;
            const memberName = row.getAttribute('data-name');
            const memberDept = row.getAttribute('data-dept');
            const memberPosition = row.getAttribute('data-position');

            // 중복 체크
            if (!selectedMemberList.some(m => m.id === memberId)) {
                selectedMemberList.push({
                    id: memberId,
                    name: memberName,
                    dept: memberDept,
                    position: memberPosition,
                    role: '', // 역할 기본값
                    startDate: projectStartDate || '',
                    endDate: projectEndDate || ''
                });
            }
        });

        renderTeamTable();
        closeMemberModal();
    };

    // 팀원 테이블 렌더링
    function renderTeamTable() {
        if (!teamTableBody) return;

        teamTableBody.innerHTML = '';

        if (selectedMemberList.length === 0) {
            // 팀원이 없을 때: empty-row 표시, tfoot 숨김
            teamTableBody.innerHTML = '<tr class="empty-row"><td colspan="8" class="text-center">팀원을 추가해주세요</td></tr>';
            if (teamTableFooter) {
                teamTableFooter.style.display = 'none';
            }
            return;
        }

        // 팀원이 있을 때: 목록 표시, tfoot 표시
        selectedMemberList.forEach((member, index) => {
            const row = document.createElement('tr');

            // 역할 select 옵션 생성
            const roleOptions = PROJECT_ROLES.map(role =>
                `<option value="${role.value}" ${member.role === role.value ? 'selected' : ''}>${role.label}</option>`
            ).join('');

            row.innerHTML = `
                <td class="text-center">${index + 1}</td>
                <td>${member.name}</td>
                <td>${member.dept}</td>
                <td>${member.position}</td>
                <td>
                    <select class="form-control" onchange="updateMemberRole('${member.id}', this.value)" style="width: 100%; padding: 4px;">
                        ${roleOptions}
                    </select>
                </td>
                <td>
                    <input type="date" value="${member.startDate}"
                           onchange="updateMemberDate('${member.id}', 'startDate', this.value)">
                </td>
                <td>
                    <input type="date" value="${member.endDate}"
                           onchange="updateMemberDate('${member.id}', 'endDate', this.value)">
                </td>
                <td class="text-center">
                    <button type="button" class="btn-delete" onclick="removeMember('${member.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            teamTableBody.appendChild(row);
        });

        // tfoot 표시
        if (teamTableFooter) {
            teamTableFooter.style.display = '';
        }
    }

    // 팀원 참여기간 업데이트 (전역 함수)
    window.updateMemberDate = function(memberId, field, value) {
        const member = selectedMemberList.find(m => m.id === memberId);
        if (member) {
            member[field] = value;
        }
    };

    // 팀원 역할 업데이트 (전역 함수)
    window.updateMemberRole = function(memberId, value) {
        const member = selectedMemberList.find(m => m.id === memberId);
        if (member) {
            member.role = value;
        }
    };

    // 팀원 제거 (전역 함수)
    window.removeMember = function(memberId) {
        selectedMemberList = selectedMemberList.filter(m => m.id !== memberId);
        renderTeamTable();
        updateCheckboxStates();
    };

    // 진행률 슬라이더와 숫자 입력 동기화
    if (progressRange && progressNumber) {
        progressRange.addEventListener('input', function() {
            progressNumber.value = this.value;
        });

        progressNumber.addEventListener('input', function() {
            const value = Math.max(0, Math.min(100, this.value));
            this.value = value;
            progressRange.value = value;
        });
    }

    // 파일 선택
    if (projectFiles) {
        projectFiles.addEventListener('change', function() {
            renderFileList();
        });
    }

    // 파일 목록 렌더링
    function renderFileList() {
        if (!fileList || !projectFiles.files.length) {
            fileList.innerHTML = '';
            return;
        }

        fileList.innerHTML = '';

        Array.from(projectFiles.files).forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <span><i class="fas fa-file"></i> ${file.name} (${formatFileSize(file.size)})</span>
                <button type="button" onclick="removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(item);
        });
    }

    // 파일 크기 포맷팅
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // 파일 제거 (전역 함수)
    window.removeFile = function(index) {
        const dt = new DataTransfer();
        const files = Array.from(projectFiles.files);

        files.forEach((file, i) => {
            if (i !== index) {
                dt.items.add(file);
            }
        });

        projectFiles.files = dt.files;
        renderFileList();
    };

    // 폼 제출
    if (projectForm) {
        projectForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // 유효성 검사
            if (!validateForm()) {
                return;
            }

            // 폼 데이터 수집
            const formData = {
                projectName: document.getElementById('projectName').value,
                projectStatus: document.getElementById('projectStatus').value,
                clientName: document.getElementById('clientName').value,
                projectManager: document.getElementById('projectManager').value,
                startDate: document.getElementById('startDate').value,
                endDate: document.getElementById('endDate').value,
                projectDescription: document.getElementById('projectDescription').value,
                teamMembers: selectedMemberList,
                cards: cardListData
            };

            console.log('프로젝트 데이터:', formData);

            // 백엔드 API 연동
            const createData = {
                projectName: formData.projectName,
                clientName: formData.clientName,
                projectStatus: formData.projectStatus,
                projectManagerIdx: parseInt(formData.projectManager),
                startDate: formData.startDate,
                endDate: formData.endDate,
                description: formData.projectDescription,

                // 연구비 카드 데이터 추가 (DTO 구조에 맞게 변환)
                projectCards: cardListData.map(card => ({
                    cardCompany: card.company,
                    cardLastDigits: card.number,
                    cardNickname: card.name
                })),

                // 팀원 데이터 추가 (DTO 구조에 맞게 변환)
                teamMembers: selectedMemberList.map(member => ({
                    employeeIdx: parseInt(member.id),
                    participationStartDate: member.startDate,
                    participationEndDate: member.endDate,
                    role: member.role || null
                }))
            };

            fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(createData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('프로젝트 등록에 실패했습니다.');
                }
                return response.json();
            })
            .then(data => {
                alert('프로젝트가 등록되었습니다.');
                window.location.href = '/project';
            })
            .catch(error => {
                console.error('Error creating project:', error);
                alert('프로젝트 등록 중 오류가 발생했습니다.');
            });
        });
    }

    // 폼 유효성 검사
    function validateForm() {
        const projectName = document.getElementById('projectName').value.trim();
        const projectStatus = document.getElementById('projectStatus').value;
        const projectManager = document.getElementById('projectManager').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const projectDescription = document.getElementById('projectDescription').value.trim();

        if (!projectName) {
            alert('프로젝트명을 입력해주세요.');
            return false;
        }

        if (!projectStatus) {
            alert('프로젝트 상태를 선택해주세요.');
            return false;
        }

        if (!projectManager) {
            alert('프로젝트 매니저를 선택해주세요.');
            return false;
        }

        if (!startDate) {
            alert('시작일을 선택해주세요.');
            return false;
        }

        if (!endDate) {
            alert('종료일을 선택해주세요.');
            return false;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert('종료일은 시작일 이후여야 합니다.');
            return false;
        }

        if (!projectDescription) {
            alert('프로젝트 설명을 입력해주세요.');
            return false;
        }

        return true;
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
        // TODO: 백엔드 연동 후 수정 페이지로 이동
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

    // 팀원 선택 모달 배경 클릭 시 닫기
    if (memberSelectModal) {
        memberSelectModal.addEventListener('click', function(e) {
            if (e.target === memberSelectModal) {
                closeMemberModal();
            }
        });
    }

    // 카드 추가 버튼 클릭
    if (addCardBtn) {
        addCardBtn.addEventListener('click', function() {
            openCardModal();
        });
    }

    // 카드 모달 열기
    function openCardModal() {
        if (!cardModal) return;
        cardModal.classList.add('active');

        // 입력 필드 초기화
        document.getElementById('cardCompany').value = '';
        document.getElementById('cardNumber').value = '';
    }

    // 카드 모달 닫기 (전역 함수)
    window.closeCardModal = function() {
        if (!cardModal) return;
        cardModal.classList.remove('active');
    };

    // 카드 저장 (전역 함수)
    window.saveCard = function() {
        const cardCompany = document.getElementById('cardCompany').value;
        const cardNumber = document.getElementById('cardNumber').value;
        const cardName = document.getElementById('cardName').value;

        // 유효성 검사
        if (!cardCompany) {
            alert('카드사를 선택해주세요.');
            return;
        }

        if (!cardNumber || cardNumber.length !== 4 || !/^\d{4}$/.test(cardNumber)) {
            alert('카드 뒷 4자리를 정확히 입력해주세요.');
            return;
        }

        if (!cardName) {
            alert('카드 닉네임을 입력해주세요.');
            return;
        }

        // 카드 추가
        cardIdCounter++;
        cardListData.push({
            id: cardIdCounter,
            company: cardCompany,
            number: cardNumber,
            name: cardName
        });

        renderCardList();
        closeCardModal();
    };

    // 카드 목록 렌더링
    function renderCardList() {
        if (!cardList) return;

        cardList.innerHTML = '';

        if (cardListData.length === 0) {
            cardList.innerHTML = '<p style="color: #868e96; font-size: 13px; margin-top: 8px;">등록된 카드가 없습니다.</p>';
            return;
        }

        cardListData.forEach(card => {
            const item = document.createElement('div');
            item.className = 'card-item';
            item.innerHTML = `
                <div class="card-item-info">
                    <i class="fas fa-credit-card"></i>
                    <div class="card-item-details">
                        <div class="card-company">${card.company}</div>
                        <div class="card-number">**** **** **** ${card.number}</div>
                    </div>
                </div>
                <button type="button" onclick="removeCard(${card.id})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            cardList.appendChild(item);
        });
    }

    // 카드 제거 (전역 함수)
    window.removeCard = function(cardId) {
        cardListData = cardListData.filter(card => card.id !== cardId);
        renderCardList();
    };

    // 카드 모달 배경 클릭 시 닫기
    if (cardModal) {
        cardModal.addEventListener('click', function(e) {
            if (e.target === cardModal) {
                closeCardModal();
            }
        });
    }

    // 연계 프로젝트 관련 기능
    const addRelatedProjectBtn = document.getElementById('addRelatedProjectBtn');
    const relatedProjectModal = document.getElementById('relatedProjectModal');
    const relatedProjectSearchInput = document.getElementById('relatedProjectSearchInput');
    const relatedProjectListElement = document.getElementById('relatedProjectList');

    // 연계 프로젝트 추가 버튼 클릭
    if (addRelatedProjectBtn) {
        addRelatedProjectBtn.addEventListener('click', function() {
            openRelatedProjectModal();
        });
    }

    // 연계 프로젝트 모달 열기
    function openRelatedProjectModal() {
        if (!relatedProjectModal) return;

        // 프로젝트 목록을 먼저 로드한 후 모달 표시
        loadRelatedProjects();
    }

    // 연계 프로젝트 목록 로드
    function loadRelatedProjects() {
        fetch('/api/projects')
            .then(response => {
                if (!response.ok) {
                    throw new Error('프로젝트 목록을 불러오는데 실패했습니다.');
                }
                return response.json();
            })
            .then(projects => {
                renderRelatedProjectTable(projects);

                // 모달 표시
                relatedProjectModal.classList.add('active');

                // 이미 추가된 프로젝트들의 체크박스 상태 유지
                updateRelatedProjectCheckboxStates();
            })
            .catch(error => {
                console.error('Error loading related projects:', error);
                alert('프로젝트 목록을 불러올 수 없습니다.');
            });
    }

    // 연계 프로젝트 테이블 렌더링
    function renderRelatedProjectTable(projects) {
        const relatedProjectTableBody = document.getElementById('relatedProjectTableBody');
        if (!relatedProjectTableBody) return;

        // 테이블 초기화
        relatedProjectTableBody.innerHTML = '';

        if (projects.length === 0) {
            relatedProjectTableBody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 40px;">등록된 프로젝트가 없습니다.</td></tr>';
            return;
        }

        projects.forEach(project => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', project.idx);
            row.setAttribute('data-name', project.projectName);
            row.setAttribute('data-status', getStatusLabel(project.projectStatus));
            row.setAttribute('data-pm', project.projectManagerName || '-');
            row.setAttribute('data-period', `${project.startDate} ~ ${project.endDate}`);

            row.innerHTML = `
                <td><input type="checkbox" class="related-project-checkbox" value="${project.idx}"></td>
                <td>${project.projectName}</td>
                <td><span class="status-badge ${getStatusClass(project.projectStatus)}">${getStatusLabel(project.projectStatus)}</span></td>
                <td>${project.projectManagerName || '-'}</td>
                <td>${project.startDate} ~ ${project.endDate}</td>
            `;

            relatedProjectTableBody.appendChild(row);
        });
    }

    // 연계 프로젝트 모달 닫기 (전역 함수)
    window.closeRelatedProjectModal = function() {
        if (!relatedProjectModal) return;
        relatedProjectModal.classList.remove('active');

        // 검색 초기화
        if (relatedProjectSearchInput) {
            relatedProjectSearchInput.value = '';
            filterRelatedProjects();
        }
    };

    // 연계 프로젝트 체크박스 상태 업데이트
    function updateRelatedProjectCheckboxStates() {
        const checkboxes = document.querySelectorAll('.related-project-checkbox');
        checkboxes.forEach(checkbox => {
            const projectId = checkbox.value;
            const isSelected = relatedProjectList.some(p => p.id === projectId);
            checkbox.checked = isSelected;

            // 행 선택 스타일
            const row = checkbox.closest('tr');
            if (isSelected) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
    }

    // 연계 프로젝트 검색
    if (relatedProjectSearchInput) {
        relatedProjectSearchInput.addEventListener('input', filterRelatedProjects);
    }

    function filterRelatedProjects() {
        const searchValue = relatedProjectSearchInput ? relatedProjectSearchInput.value.toLowerCase() : '';
        const rows = document.querySelectorAll('#relatedProjectTableBody tr');

        rows.forEach(row => {
            const name = row.getAttribute('data-name') || '';
            if (name.toLowerCase().includes(searchValue)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // 연계 프로젝트 체크박스 클릭 시 행 선택 스타일 토글
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('related-project-checkbox')) {
            const row = e.target.closest('tr');
            if (e.target.checked) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        }
    });

    // 연계 프로젝트 선택 완료 (전역 함수)
    window.addSelectedRelatedProjects = function() {
        const checkboxes = document.querySelectorAll('.related-project-checkbox:checked');

        checkboxes.forEach(checkbox => {
            const row = checkbox.closest('tr');
            const projectId = checkbox.value;
            const projectName = row.getAttribute('data-name');
            const projectStatus = row.getAttribute('data-status');
            const projectPM = row.getAttribute('data-pm');
            const projectPeriod = row.getAttribute('data-period');

            // 중복 체크
            if (!relatedProjectList.some(p => p.id === projectId)) {
                relatedProjectList.push({
                    id: projectId,
                    name: projectName,
                    status: projectStatus,
                    pm: projectPM,
                    period: projectPeriod
                });
            }
        });

        renderRelatedProjectList();
        closeRelatedProjectModal();
    };

    // 연계 프로젝트 목록 렌더링
    function renderRelatedProjectList() {
        if (!relatedProjectListElement) return;

        relatedProjectListElement.innerHTML = '';

        if (relatedProjectList.length === 0) {
            relatedProjectListElement.innerHTML = '<p style="color: #868e96; font-size: 13px; margin-top: 8px;">연계 프로젝트가 없습니다.</p>';
            return;
        }

        relatedProjectList.forEach(project => {
            const item = document.createElement('div');
            item.className = 'related-project-item';
            item.innerHTML = `
                <div class="related-project-info">
                    <div class="related-project-name">
                        <i class="fas fa-link"></i>
                        ${project.name}
                    </div>
                    <div class="related-project-details">
                        <span><i class="fas fa-circle"></i> ${project.status}</span>
                        <span><i class="fas fa-user"></i> PM: ${project.pm}</span>
                        <span><i class="fas fa-calendar"></i> ${project.period}</span>
                    </div>
                </div>
                <button type="button" onclick="removeRelatedProject('${project.id}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            relatedProjectListElement.appendChild(item);
        });
    }

    // 연계 프로젝트 제거 (전역 함수)
    window.removeRelatedProject = function(projectId) {
        relatedProjectList = relatedProjectList.filter(p => p.id !== projectId);
        renderRelatedProjectList();
        updateRelatedProjectCheckboxStates();
    };

    // 연계 프로젝트 모달 배경 클릭 시 닫기
    if (relatedProjectModal) {
        relatedProjectModal.addEventListener('click', function(e) {
            if (e.target === relatedProjectModal) {
                closeRelatedProjectModal();
            }
        });
    }

    // 프로젝트 정보 모달 관련 기능
    const projectInfoModal = document.getElementById('projectInfoModal');

    // 프로젝트 정보 보기 (전역 함수)
    window.showProjectInfo = function(projectId) {
        fetch(`/api/projects/${projectId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('프로젝트 정보를 불러오는데 실패했습니다.');
                }
                return response.json();
            })
            .then(project => {
                // 모달에 데이터 채우기
                document.getElementById('infoProjectName').textContent = project.projectName;

                const statusBadge = document.getElementById('infoProjectStatus');
                statusBadge.textContent = getStatusLabel(project.projectStatus);
                statusBadge.className = 'status-badge ' + getStatusClass(project.projectStatus);

                document.getElementById('infoProjectManager').textContent = project.projectManagerName || '-';
                document.getElementById('infoProjectPeriod').textContent = `${project.startDate} ~ ${project.endDate}`;
                document.getElementById('infoProjectDescription').textContent = project.description || '설명이 없습니다.';

                // 팀원 목록 렌더링 (현재는 ProjectDTO에 팀원 목록이 없으므로 TODO)
                const teamMembersBody = document.getElementById('infoTeamMembers');
                teamMembersBody.innerHTML = '<tr><td colspan="6" class="text-center">팀원 목록은 추후 구현 예정입니다.</td></tr>';

                // TODO: 팀원 목록 API가 구현되면 아래 코드 활성화
                // if (project.teamMembers && project.teamMembers.length > 0) {
                //     project.teamMembers.forEach(member => {
                //         const row = document.createElement('tr');
                //         row.innerHTML = `
                //             <td>${member.name}</td>
                //             <td>${member.dept}</td>
                //             <td>${member.position}</td>
                //             <td>${member.startDate}</td>
                //             <td>${member.endDate}</td>
                //             <td><span class="member-status-active">참여중</span></td>
                //         `;
                //         teamMembersBody.appendChild(row);
                //     });
                // }

                // 모달 열기
                if (projectInfoModal) {
                    projectInfoModal.classList.add('active');
                }
            })
            .catch(error => {
                console.error('Error loading project info:', error);
                alert('프로젝트 정보를 찾을 수 없습니다.');
            });
    };

    // 프로젝트 정보 모달 닫기 (전역 함수)
    window.closeProjectInfoModal = function() {
        if (projectInfoModal) {
            projectInfoModal.classList.remove('active');
        }
    };

    // 프로젝트 정보 모달 배경 클릭 시 닫기
    if (projectInfoModal) {
        projectInfoModal.addEventListener('click', function(e) {
            if (e.target === projectInfoModal) {
                closeProjectInfoModal();
            }
        });
    }

    // 연구비 카드 페이지 필터링 기능
    const cardCompanyFilter = document.getElementById('cardCompanyFilter');
    const cardSearchInput = document.getElementById('searchInput');
    const cardItems = document.querySelectorAll('.research-card-item');

    // 카드사 필터
    if (cardCompanyFilter) {
        cardCompanyFilter.addEventListener('change', function() {
            filterCards();
        });
    }

    // 검색
    if (cardSearchInput) {
        cardSearchInput.addEventListener('input', function() {
            filterCards();
        });
    }

    // 카드 필터링
    function filterCards() {
        const companyValue = cardCompanyFilter ? cardCompanyFilter.value : '';
        const searchValue = cardSearchInput ? cardSearchInput.value.toLowerCase() : '';

        cardItems.forEach(card => {
            const cardCompany = card.getAttribute('data-company') || '';
            const cardNumber = card.getAttribute('data-number') || '';
            const cardProject = card.getAttribute('data-project') || '';

            const companyMatch = !companyValue || cardCompany === companyValue;
            const searchMatch = !searchValue ||
                cardNumber.includes(searchValue) ||
                cardProject.toLowerCase().includes(searchValue);

            if (companyMatch && searchMatch) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // 카드 수정/삭제 (전역 함수)
    window.editCard = function(cardId) {
        // TODO: 백엔드 연동 후 카드 수정 기능 구현
        alert(`카드 ID ${cardId} 수정 기능은 백엔드 연동 후 구현됩니다.`);
    };

    window.deleteCard = function(cardId) {
        if (confirm('정말 이 카드를 삭제하시겠습니까?')) {
            // TODO: 백엔드 연동 후 카드 삭제 기능 구현
            alert(`카드 ID ${cardId} 삭제 기능은 백엔드 연동 후 구현됩니다.`);
        }
    };

    // ===========================
    // 직급별 경비 설정 기능
    // ===========================
    const resetExpensesBtn = document.getElementById('resetExpensesBtn');
    const loadDefaultExpensesBtn = document.getElementById('loadDefaultExpensesBtn');

    // 기본값 데이터
    const defaultExpenseValues = {
        '사원': { daily: 30000, meal: 30000, meeting: 15000, overtime: 10000 },
        '대리': { daily: 35000, meal: 35000, meeting: 20000, overtime: 12000 },
        '과장': { daily: 40000, meal: 40000, meeting: 25000, overtime: 15000 },
        '차장': { daily: 50000, meal: 50000, meeting: 30000, overtime: 18000 },
        '부장': { daily: 60000, meal: 60000, meeting: 40000, overtime: 20000 }
    };

    // 기본값으로 초기화
    if (resetExpensesBtn) {
        resetExpensesBtn.addEventListener('click', function() {
            if (confirm('경비 설정을 기본값으로 초기화하시겠습니까?')) {
                resetExpensesToDefault();
            }
        });
    }

    function resetExpensesToDefault() {
        Object.keys(defaultExpenseValues).forEach(position => {
            const values = defaultExpenseValues[position];
            const row = document.querySelector(`tr[data-position="${position}"]`);

            if (row) {
                const inputs = row.querySelectorAll('.expense-input-sm');
                if (inputs.length >= 4) {
                    inputs[0].value = values.daily;
                    inputs[1].value = values.meal;
                    inputs[2].value = values.meeting;
                    inputs[3].value = values.overtime;
                }
            }
        });

        alert('경비 설정이 기본값으로 초기화되었습니다.');
    }

    // 기초정보관리 설정값 불러오기
    if (loadDefaultExpensesBtn) {
        loadDefaultExpensesBtn.addEventListener('click', function() {
            // TODO: 실제로는 /api/basic-info/expenses API를 호출하여 데이터를 가져옴
            // 현재는 시뮬레이션
            loadExpensesFromBasicInfo();
        });
    }

    function loadExpensesFromBasicInfo() {
        // TODO: 백엔드 API 연동 시 실제 데이터 가져오기
        // 현재는 기본값과 동일한 데이터를 사용 (시뮬레이션)
        const basicInfoData = {
            '사원': { daily: 30000, meal: 30000, meeting: 15000, overtime: 10000 },
            '대리': { daily: 35000, meal: 35000, meeting: 20000, overtime: 12000 },
            '과장': { daily: 40000, meal: 40000, meeting: 25000, overtime: 15000 },
            '차장': { daily: 50000, meal: 50000, meeting: 30000, overtime: 18000 },
            '부장': { daily: 60000, meal: 60000, meeting: 40000, overtime: 20000 }
        };

        Object.keys(basicInfoData).forEach(position => {
            const values = basicInfoData[position];
            const row = document.querySelector(`tr[data-position="${position}"]`);

            if (row) {
                const inputs = row.querySelectorAll('.expense-input-sm');
                if (inputs.length >= 4) {
                    inputs[0].value = values.daily;
                    inputs[1].value = values.meal;
                    inputs[2].value = values.meeting;
                    inputs[3].value = values.overtime;
                }
            }
        });

        alert('기초정보관리 설정값을 불러왔습니다.');
    }

    // 경비 설정 데이터 수집 함수 (프로젝트 등록 시 사용)
    function getExpenseSettingsData() {
        const expenseData = {};

        const rows = document.querySelectorAll('#expenseSettingsBody tr');
        rows.forEach(row => {
            const position = row.getAttribute('data-position');
            const inputs = row.querySelectorAll('.expense-input-sm');

            if (inputs.length >= 4) {
                expenseData[position] = {
                    dailyAllowance: parseInt(inputs[0].value) || 0,
                    mealAllowance: parseInt(inputs[1].value) || 0,
                    meetingAllowance: parseInt(inputs[2].value) || 0,
                    overtimeMeal: parseInt(inputs[3].value) || 0
                };
            }
        });

        return expenseData;
    }

    // 프로젝트 폼 제출 시 경비 설정 데이터 포함
    if (projectForm) {
        const originalSubmitHandler = projectForm.onsubmit;

        projectForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // 기본 폼 데이터 수집
            const formData = new FormData(projectForm);

            // 경비 설정 데이터 추가
            const expenseSettings = getExpenseSettingsData();
            formData.append('expenseSettings', JSON.stringify(expenseSettings));

            // 팀원 목록 추가
            formData.append('teamMembers', JSON.stringify(selectedMemberList));

            // 카드 목록 추가
            formData.append('cards', JSON.stringify(cardListData));

            // 연계 프로젝트 목록 추가
            formData.append('relatedProjects', JSON.stringify(relatedProjectList));

            console.log('프로젝트 등록 데이터:', {
                formData: Object.fromEntries(formData),
                expenseSettings: expenseSettings,
                teamMembers: selectedMemberList,
                cards: cardListData,
                relatedProjects: relatedProjectList
            });

            // 임시로 목록 페이지로 이동
            // window.location.href = '/project';
        });
    }

    // 숫자 입력 필드 포맷팅
    document.querySelectorAll('.expense-input-sm').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
            }
        });
    });
});
