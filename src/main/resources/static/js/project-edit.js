document.addEventListener('DOMContentLoaded', function() {
    // 페이지 로드 시 프로젝트 ID 가져오기
    const pathParts = window.location.pathname.split('/');
    const projectId = pathParts[pathParts.length - 1];

    // 폼 요소
    const projectEditForm = document.getElementById('projectEditForm');
    const addMemberBtn = document.getElementById('addMemberBtn');
    const memberSelectModal = document.getElementById('memberSelectModal');
    const memberSearchInput = document.getElementById('memberSearchInput');
    const teamTableBody = document.getElementById('teamTableBody');
    const addCardBtn = document.getElementById('addCardBtn');
    const cardModal = document.getElementById('cardModal');
    const cardList = document.getElementById('cardList');
    const projectFiles = document.getElementById('projectFiles');
    const fileList = document.getElementById('fileList');
    const existingFileList = document.getElementById('existingFileList');
    const addRelatedProjectBtn = document.getElementById('addRelatedProjectBtn');
    const relatedProjectModal = document.getElementById('relatedProjectModal');
    const relatedProjectSearchInput = document.getElementById('relatedProjectSearchInput');
    const relatedProjectListElement = document.getElementById('relatedProjectList');

    // 선택된 팀원 목록
    let selectedMemberList = [];
    let memberIdCounter = 0;

    // 카드 목록
    let cardListData = [];
    let cardIdCounter = 0;

    // 연계 프로젝트 목록
    let relatedProjectList = [];

    // 기존 파일 목록
    let existingFiles = [];

    // 연구 책임자 드롭다운 요소
    const projectManagerSelect = document.getElementById('projectManager');

    // 연구 책임자 목록 로드 후 프로젝트 데이터 로드
    if (projectManagerSelect) {
        loadProjectManagers().then(() => {
            // 연구 책임자 목록 로드 완료 후 프로젝트 데이터 로드
            loadProjectData(projectId);
        });
    } else {
        // projectManager 요소가 없으면 바로 프로젝트 데이터 로드
        loadProjectData(projectId);
    }

    // 연구 책임자 목록 로드 함수
    function loadProjectManagers() {
        return fetch('/api/users')
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

    // 프로젝트 데이터 로드 함수
    function loadProjectData(id) {
        // TODO: 백엔드에서 프로젝트 데이터 가져오기
        // 임시 데이터
        const projectData = {
            1: {
                name: 'ERP 시스템 개발',
                status: '진행중',
                client: 'ABC 주식회사',
                manager: '1',
                startDate: '2025-01-01',
                endDate: '2025-12-31',
                description: '통합 ERP 시스템 개발 프로젝트. 인사, 회계, 영업 등 전사적 업무 프로세스를 통합하여 업무 효율성을 극대화합니다.',
                teamMembers: [
                    { id: '1', name: '김철수', dept: '개발팀', position: '선임연구원', startDate: '2025-01-01', endDate: '2025-12-31' },
                    { id: '2', name: '이영희', dept: '기획팀', position: '주임', startDate: '2025-01-01', endDate: '2025-12-31' },
                    { id: '3', name: '박민수', dept: '디자인팀', position: '대리', startDate: '2025-01-15', endDate: '2025-12-31' }
                ],
                cards: [
                    { id: 1, company: '신한카드', number: '1234' },
                    { id: 2, company: 'KB국민카드', number: '5678' }
                ],
                relatedProjects: [
                    { id: '3', name: '홈페이지 리뉴얼', status: '완료', pm: '박민수', period: '2024-10-01 ~ 2024-12-31' },
                    { id: '4', name: '전자결재 시스템 구축', status: '완료', pm: '정지훈', period: '2024-07-01 ~ 2024-09-30' }
                ],
                files: [
                    { id: 1, name: '프로젝트_기획서.pdf', size: 1024000 },
                    { id: 2, name: '요구사항_정의서.docx', size: 512000 }
                ]
            },
            2: {
                name: '모바일 앱 개발',
                status: '기획',
                client: 'XYZ 컴퍼니',
                manager: '2',
                startDate: '2025-03-01',
                endDate: '2025-08-31',
                description: '고객용 모바일 애플리케이션 개발 프로젝트. iOS 및 Android 플랫폼을 모두 지원합니다.',
                teamMembers: [
                    { id: '2', name: '이영희', dept: '기획팀', position: '주임', startDate: '2025-03-01', endDate: '2025-08-31' },
                    { id: '3', name: '박민수', dept: '디자인팀', position: '대리', startDate: '2025-03-01', endDate: '2025-08-31' }
                ],
                cards: [
                    { id: 1, company: '삼성카드', number: '9012' }
                ],
                relatedProjects: [],
                files: []
            }
        };

        const project = projectData[id];
        if (!project) {
            alert('프로젝트 정보를 찾을 수 없습니다.');
            location.href = '/project';
            return;
        }

        // 폼 필드 채우기
        document.getElementById('projectId').value = id;
        document.getElementById('projectName').value = project.name;
        document.getElementById('projectStatus').value = project.client;
        document.getElementById('projectManager').value = project.manager;
        document.getElementById('startDate').value = project.startDate;
        document.getElementById('endDate').value = project.endDate;
        document.getElementById('projectDescription').value = project.description;

        // 팀원 목록 로드
        selectedMemberList = project.teamMembers.map(member => ({
            id: member.id,
            name: member.name,
            dept: member.dept,
            position: member.position,
            startDate: member.startDate,
            endDate: member.endDate
        }));
        renderTeamTable();

        // 카드 목록 로드
        cardListData = project.cards.map((card, index) => ({
            id: index + 1,
            company: card.company,
            number: card.number
        }));
        cardIdCounter = cardListData.length;
        renderCardList();

        // 연계 프로젝트 목록 로드
        relatedProjectList = project.relatedProjects || [];
        renderRelatedProjectList();

        // 기존 파일 목록 로드
        existingFiles = project.files || [];
        renderExistingFileList();
    }

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

    // 파일 선택
    if (projectFiles) {
        projectFiles.addEventListener('change', function() {
            renderFileList();
        });
    }

    // 새 파일 목록 렌더링
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

    // 기존 파일 목록 렌더링
    function renderExistingFileList() {
        if (!existingFileList || existingFiles.length === 0) {
            existingFileList.innerHTML = '';
            return;
        }

        existingFileList.innerHTML = '<h4 style="font-size: 14px; color: #495057; margin-bottom: 8px;">기존 파일</h4>';

        existingFiles.forEach(file => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.style.background = 'linear-gradient(to right, #e7f1ff, #f0f4ff)';
            item.innerHTML = `
                <span><i class="fas fa-file"></i> ${file.name} (${formatFileSize(file.size)})</span>
                <button type="button" onclick="removeExistingFile(${file.id})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            existingFileList.appendChild(item);
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

    // 기존 파일 제거 (전역 함수)
    window.removeExistingFile = function(fileId) {
        if (confirm('이 파일을 삭제하시겠습니까?')) {
            existingFiles = existingFiles.filter(file => file.id !== fileId);
            renderExistingFileList();
        }
    };

    // 폼 제출
    if (projectEditForm) {
        projectEditForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // 유효성 검사
            if (!validateForm()) {
                return;
            }

            // 폼 데이터 수집
            const formData = {
                projectId: document.getElementById('projectId').value,
                projectName: document.getElementById('projectName').value,
                projectStatus: document.getElementById('projectStatus').value,
                projectManager: document.getElementById('projectManager').value,
                startDate: document.getElementById('startDate').value,
                endDate: document.getElementById('endDate').value,
                projectDescription: document.getElementById('projectDescription').value,
                teamMembers: selectedMemberList,
                cards: cardListData,
                deletedFiles: existingFiles.filter(f => !existingFiles.includes(f)).map(f => f.id)
            };

            console.log('수정된 프로젝트 데이터:', formData);

            // TODO: 백엔드 API 연동
            alert('프로젝트가 수정되었습니다.');
            window.location.href = '/project';
        });
    }

    // 폼 유효성 검사
    function validateForm() {
        const projectName = document.getElementById('projectName').value.trim();
        const projectStatus = document.getElementById('projectStatus').value.trim();
        const projectManager = document.getElementById('projectManager').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const projectDescription = document.getElementById('projectDescription').value.trim();

        if (!projectName) {
            alert('프로젝트명을 입력해주세요.');
            return false;
        }

        if (!projectStatus) {
            alert('발주사를 입력해주세요.');
            return false;
        }

        if (!projectManager) {
            alert('연구 책임자를 선택해주세요.');
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

    // 모달 배경 클릭 시 닫기
    if (memberSelectModal) {
        memberSelectModal.addEventListener('click', function(e) {
            if (e.target === memberSelectModal) {
                closeMemberModal();
            }
        });
    }

    if (cardModal) {
        cardModal.addEventListener('click', function(e) {
            if (e.target === cardModal) {
                closeCardModal();
            }
        });
    }

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
});
