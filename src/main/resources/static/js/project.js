document.addEventListener('DOMContentLoaded', function() {
    // 프로젝트 목록 페이지 요소
    const newProjectBtn = document.getElementById('newProjectBtn');
    const searchCurrentInput = document.getElementById('searchCurrentInput');
    const currentProjectCards = document.querySelectorAll('#currentProjectGrid .project-card');

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

        currentProjectCards.forEach(card => {
            const cardName = card.getAttribute('data-project-name').toLowerCase();
            const searchMatch = !searchValue || cardName.includes(searchValue);

            if (searchMatch) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
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
        allPastProjects = Array.from(pastProjectRows).map((row, index) => {
            return {
                no: index + 1,
                name: row.getAttribute('data-project-name'),
                status: row.getAttribute('data-status'),
                statusBadge: row.querySelector('.status-badge').outerHTML,
                pm: row.cells[3].textContent,
                teamSize: row.cells[4].textContent,
                period: row.cells[5].textContent,
                progress: row.querySelector('.table-progress').innerHTML,
                projectId: parseInt(row.getAttribute('data-project-id'))
            };
        });
        filteredPastProjects = [...allPastProjects];
        currentPage = 1;
        renderPastProjects();
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
                    <td>${project.statusBadge}</td>
                    <td>${project.pm}</td>
                    <td class="text-center">${project.teamSize}</td>
                    <td>${project.period}</td>
                    <td>${project.progress}</td>
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
    if (pastProjectTableBody) {
        loadPastProjects();
    }

    // 신규 프로젝트 페이지 기능

    // 팀원 추가 버튼 클릭 시 모달 열기
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', function() {
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
        memberSelectModal.classList.add('active');

        // 이미 추가된 팀원들의 체크박스 상태 유지
        updateCheckboxStates();
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
            teamTableBody.innerHTML = '<tr class="empty-row"><td colspan="7" class="text-center">팀원을 추가해주세요</td></tr>';
            return;
        }

        selectedMemberList.forEach((member, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-center">${index + 1}</td>
                <td>${member.name}</td>
                <td>${member.dept}</td>
                <td>${member.position}</td>
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
    }

    // 팀원 참여기간 업데이트 (전역 함수)
    window.updateMemberDate = function(memberId, field, value) {
        const member = selectedMemberList.find(m => m.id === memberId);
        if (member) {
            member[field] = value;
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
                projectManager: document.getElementById('projectManager').value,
                startDate: document.getElementById('startDate').value,
                endDate: document.getElementById('endDate').value,
                projectDescription: document.getElementById('projectDescription').value,
                teamMembers: selectedMemberList,
                cards: cardListData,
                budget: document.getElementById('budget').value,
                progress: document.getElementById('progressNumber').value
            };

            console.log('프로젝트 데이터:', formData);

            // TODO: 백엔드 API 연동
            alert('프로젝트가 등록되었습니다.');
            window.location.href = '/project';
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
        // TODO: 백엔드에서 프로젝트 상세 정보 가져오기
        // 임시 데이터
        const projectData = {
            1: {
                name: 'ERP 시스템 개발',
                status: '진행중',
                pm: '김철수',
                teamSize: '5명',
                startDate: '2025-01-01',
                endDate: '2025-12-31',
                description: '통합 ERP 시스템 개발 프로젝트. 인사, 회계, 영업 등 전사적 업무 프로세스 통합.',
                progress: 45
            },
            2: {
                name: '모바일 앱 개발',
                status: '기획',
                pm: '이영희',
                teamSize: '3명',
                startDate: '2025-03-01',
                endDate: '2025-08-31',
                description: '고객용 모바일 애플리케이션 개발. iOS 및 Android 플랫폼 지원.',
                progress: 10
            },
            3: {
                name: '홈페이지 리뉴얼',
                status: '완료',
                pm: '박민수',
                teamSize: '4명',
                startDate: '2024-10-01',
                endDate: '2024-12-31',
                description: '회사 공식 홈페이지 전면 리뉴얼. 반응형 웹 디자인 적용.',
                progress: 100
            }
        };

        const project = projectData[projectId];
        if (!project) return;

        // 모달에 데이터 채우기
        document.getElementById('detailProjectName').textContent = project.name;
        document.getElementById('detailStatus').textContent = project.status;
        document.getElementById('detailPM').textContent = project.pm;
        document.getElementById('detailTeamSize').textContent = project.teamSize;
        document.getElementById('detailStartDate').textContent = project.startDate;
        document.getElementById('detailEndDate').textContent = project.endDate;
        document.getElementById('detailDescription').textContent = project.description;
        document.getElementById('detailProgressBar').style.width = project.progress + '%';
        document.getElementById('detailProgressText').textContent = project.progress + '%';

        // 모달 열기
        if (projectDetailModal) {
            projectDetailModal.classList.add('active');
        }
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

        // 유효성 검사
        if (!cardCompany) {
            alert('카드사를 선택해주세요.');
            return;
        }

        if (!cardNumber || cardNumber.length !== 4 || !/^\d{4}$/.test(cardNumber)) {
            alert('카드 뒷 4자리를 정확히 입력해주세요.');
            return;
        }

        // 카드 추가
        cardIdCounter++;
        cardListData.push({
            id: cardIdCounter,
            company: cardCompany,
            number: cardNumber
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
        relatedProjectModal.classList.add('active');

        // 이미 추가된 프로젝트들의 체크박스 상태 유지
        updateRelatedProjectCheckboxStates();
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
        // TODO: 백엔드에서 프로젝트 상세 정보 가져오기
        // 임시 데이터
        const projectData = {
            1: {
                name: 'ERP 시스템 개발',
                status: '진행중',
                statusClass: 'status-in-progress',
                manager: '김철수 (개발팀, 팀장)',
                startDate: '2025-01-01',
                endDate: '2025-12-31',
                description: '통합 ERP 시스템 개발 프로젝트. 인사, 회계, 영업 등 전사적 업무 프로세스를 통합하여 업무 효율성을 극대화합니다. Spring Boot 기반의 웹 애플리케이션으로 개발되며, 마이크로서비스 아키텍처를 적용하여 확장성과 유지보수성을 확보합니다.',
                teamMembers: [
                    { name: '김철수', dept: '개발팀', position: '팀장', startDate: '2025-01-01', endDate: '2025-12-31', status: 'active' },
                    { name: '이영희', dept: '개발팀', position: '선임연구원', startDate: '2025-01-01', endDate: '2025-12-31', status: 'active' },
                    { name: '박민수', dept: '개발팀', position: '연구원', startDate: '2025-01-15', endDate: '2025-12-31', status: 'active' },
                    { name: '최지훈', dept: 'UI/UX팀', position: '디자이너', startDate: '2025-01-01', endDate: '2025-06-30', status: 'active' },
                    { name: '정수진', dept: 'QA팀', position: '연구원', startDate: '2025-03-01', endDate: '2025-12-31', status: 'active' }
                ]
            },
            2: {
                name: '모바일 앱 개발',
                status: '기획',
                statusClass: 'status-planning',
                manager: '이영희 (개발팀, 선임연구원)',
                startDate: '2025-03-01',
                endDate: '2025-08-31',
                description: '고객용 모바일 애플리케이션 개발 프로젝트. iOS 및 Android 플랫폼을 모두 지원하며, React Native를 활용한 크로스 플랫폼 개발을 진행합니다. 사용자 편의성을 최우선으로 하는 직관적인 UI/UX를 제공합니다.',
                teamMembers: [
                    { name: '이영희', dept: '개발팀', position: '선임연구원', startDate: '2025-03-01', endDate: '2025-08-31', status: 'active' },
                    { name: '박민수', dept: '개발팀', position: '연구원', startDate: '2025-03-01', endDate: '2025-08-31', status: 'active' },
                    { name: '최지훈', dept: 'UI/UX팀', position: '디자이너', startDate: '2025-03-01', endDate: '2025-05-31', status: 'active' }
                ]
            },
            3: {
                name: '홈페이지 리뉴얼',
                status: '완료',
                statusClass: 'status-completed',
                manager: '박민수 (개발팀, 연구원)',
                startDate: '2024-10-01',
                endDate: '2024-12-31',
                description: '회사 공식 홈페이지 전면 리뉴얼 프로젝트. 반응형 웹 디자인을 적용하여 모바일, 태블릿, 데스크톱 등 다양한 디바이스에서 최적화된 사용자 경험을 제공합니다.',
                teamMembers: [
                    { name: '박민수', dept: '개발팀', position: '연구원', startDate: '2024-10-01', endDate: '2024-12-31', status: 'completed' },
                    { name: '최지훈', dept: 'UI/UX팀', position: '디자이너', startDate: '2024-10-01', endDate: '2024-12-15', status: 'completed' },
                    { name: '강동원', dept: '마케팅팀', position: '대리', startDate: '2024-10-01', endDate: '2024-11-30', status: 'completed' },
                    { name: '윤서연', dept: '기획팀', position: '주임', startDate: '2024-10-01', endDate: '2024-12-31', status: 'completed' }
                ]
            }
        };

        const project = projectData[projectId];
        if (!project) {
            alert('프로젝트 정보를 찾을 수 없습니다.');
            return;
        }

        // 모달에 데이터 채우기
        document.getElementById('infoProjectName').textContent = project.name;

        const statusBadge = document.getElementById('infoProjectStatus');
        statusBadge.textContent = project.status;
        statusBadge.className = 'status-badge ' + project.statusClass;

        document.getElementById('infoProjectManager').textContent = project.manager;
        document.getElementById('infoProjectPeriod').textContent = `${project.startDate} ~ ${project.endDate}`;
        document.getElementById('infoProjectDescription').textContent = project.description;

        // 팀원 목록 렌더링
        const teamMembersBody = document.getElementById('infoTeamMembers');
        teamMembersBody.innerHTML = '';

        if (project.teamMembers && project.teamMembers.length > 0) {
            project.teamMembers.forEach(member => {
                const row = document.createElement('tr');
                const statusClass = member.status === 'active' ? 'member-status-active' : 'member-status-completed';
                const statusText = member.status === 'active' ? '참여중' : '참여완료';

                row.innerHTML = `
                    <td>${member.name}</td>
                    <td>${member.dept}</td>
                    <td>${member.position}</td>
                    <td>${member.startDate}</td>
                    <td>${member.endDate}</td>
                    <td><span class="${statusClass}">${statusText}</span></td>
                `;
                teamMembersBody.appendChild(row);
            });
        } else {
            teamMembersBody.innerHTML = '<tr><td colspan="6" class="text-center">참여연구원 정보가 없습니다.</td></tr>';
        }

        // 모달 열기
        if (projectInfoModal) {
            projectInfoModal.classList.add('active');
        }
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
});
