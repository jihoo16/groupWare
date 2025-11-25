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
                    // 한글 이름 사용 (empDeptName, empPositionName)
                    const deptName = user.empDeptName || user.empDept || '-';
                    const positionName = user.empPositionName || user.empPosition || '-';
                    option.textContent = `${user.empName} (${deptName} / ${positionName})`;
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
        fetch(`/api/projects/${id}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('프로젝트 정보를 불러오는데 실패했습니다.');
                }
                return response.json();
            })
            .then(project => {
                console.log('프로젝트 데이터:', project);

                // 폼 필드 채우기
                document.getElementById('projectId').value = project.idx;
                document.getElementById('projectName').value = project.projectName || '';
                document.getElementById('clientName').value = project.clientName || '';
                document.getElementById('projectStatus').value = project.projectStatus || '';

                // 연구 책임자 선택 (프로젝트 매니저 목록이 로드된 후에 설정)
                if (projectManagerSelect) {
                    projectManagerSelect.value = project.projectManagerIdx || '';
                }

                document.getElementById('startDate').value = project.startDate || '';
                document.getElementById('endDate').value = project.endDate || '';
                document.getElementById('receiptUrl').value = project.receiptUrl || '';
                document.getElementById('projectDescription').value = project.description || '';

                // TODO: 팀원, 연계 프로젝트, 파일 목록은 별도 API로 조회 필요
                // 현재는 빈 배열로 초기화
                selectedMemberList = [];
                renderTeamTable();

                // 연구비 카드 목록 로드
                loadProjectCards(project.idx);

                // cardListData = [];
                // cardIdCounter = 0;
                // renderCardList();

                relatedProjectList = [];
                renderRelatedProjectList();

                existingFiles = [];
                renderExistingFileList();
            })
            .catch(error => {
                console.error('Error loading project data:', error);
                alert('프로젝트 정보를 불러올 수 없습니다.');
                location.href = '/project';
            });
    }

    // 연구비 카드 목록 로드 함수
    function loadProjectCards(projectId) {
        fetch(`/api/projects/${projectId}/cards`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('연구비 카드 목록을 불러오는데 실패했습니다.');
                }
                return response.json();
            })
            .then(cards => {
                console.log('연구비 카드 데이터:', cards);

                // 카드 데이터 변환 및 저장
                cardListData = cards.map((card, index) => ({
                    id: card.idx,  // 서버에서 받은 idx 사용
                    company: card.cardCompany,
                    number: card.cardLastDigits,
                    name: card.cardNickname || ''
                }));

                // 다음 카드 ID는 기존 카드 중 최대값 + 1
                if (cardListData.length > 0) {
                    cardIdCounter = Math.max(...cardListData.map(c => c.id));
                } else {
                    cardIdCounter = 0;
                }

                renderCardList();
            })
            .catch(error => {
                console.error('Error loading project cards:', error);
                // 에러 발생 시 빈 배열로 초기화
                cardListData = [];
                cardIdCounter = 0;
                renderCardList();
            });
    }

    // 팀원 추가 버튼 클릭 시 모달 열기
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', function() {
            openMemberModal();
        });
    }

    // tfoot의 추가 버튼 (팀원이 있을 때 하단 버튼)
    const addMemberBtn2 = document.getElementById('addMemberBtn2');
    if (addMemberBtn2) {
        addMemberBtn2.addEventListener('click', function(e) {
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
            const deptName = user.empDeptName || user.empDept || '-';
            const positionName = user.empPositionName || user.empPosition || '-';

            row.setAttribute('data-id', user.idx);
            row.setAttribute('data-name', user.empName);
            row.setAttribute('data-dept', deptName);
            row.setAttribute('data-position', positionName);

            row.innerHTML = `
                <td><input type="checkbox" class="member-checkbox" value="${user.idx}"></td>
                <td>${user.empName}</td>
                <td>${deptName}</td>
                <td>${positionName}</td>
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

    // 팀원 테이블 렌더링
    function renderTeamTable() {
        if (!teamTableBody) return;

        const teamTableFooter = document.getElementById('teamTableFooter');

        teamTableBody.innerHTML = '';

        if (selectedMemberList.length === 0) {
            // 팀원이 없을 때: empty-row 표시, tfoot 숨김
            teamTableBody.innerHTML = '<tr class="empty-row text-center"><td colspan="8" class="text-center">팀원을 추가해주세요</td></tr>';
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
                `<option value="${role.value}" ${(member.role || '') === role.value ? 'selected' : ''}>${role.label}</option>`
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
        const cardNameInput = document.getElementById('cardName');
        if (cardNameInput) {
            cardNameInput.value = '';
        }
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
        console.log("cardIdCounter : "+cardIdCounter)
        // 카드 추가 (신규 카드는 음수 ID 사용)
        cardIdCounter--;
        cardListData.push({
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
            const displayName = card.name ? `${card.name} (${card.company})` : card.company;
            item.innerHTML = `
                <div class="card-item-info">
                    <i class="fas fa-credit-card"></i>
                    <div class="card-item-details">
                        <div class="card-company">${displayName}</div>
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

            // URL에서 가져온 projectId 사용 (hidden input 값 대신)
            // const projectId = document.getElementById('projectId').value;
            console.log(cardListData.id)
            // 카드 데이터 변환 (기존 카드는 idx 포함, 신규 카드는 idx null)
            const projectCards = cardListData.map(card => ({
                idx: card.id > 0 ? card.id : null,  // 양수면 기존 카드 idx, 음수면 null (신규)
                cardCompany: card.company,
                cardLastDigits: card.number,
                cardNickname: card.name || null
            }));
            console.log("projectCards : "+projectCards.values());

            // ProjectUpdateDTO 형식에 맞게 데이터 수집
            const updateData = {
                projectName: document.getElementById('projectName').value,
                clientName: document.getElementById('clientName').value,
                projectManagerIdx: parseInt(document.getElementById('projectManager').value),
                startDate: document.getElementById('startDate').value,
                endDate: document.getElementById('endDate').value,
                projectStatus: document.getElementById('projectStatus').value,
                description: document.getElementById('projectDescription').value,
                receiptUrl: document.getElementById('receiptUrl').value || null,
                projectCards: projectCards
            };

            console.log('수정된 프로젝트 데이터:', updateData);

            // 백엔드 API 연동
            fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('프로젝트 수정에 실패했습니다.');
                }
                return response.json();
            })
            .then(data => {
                 alert('프로젝트가 수정되었습니다.');
                window.location.href = '/project';
            })
            .catch(error => {
                console.error('Error updating project:', error);
                alert('프로젝트 수정 중 오류가 발생했습니다.');
            });
        });
    }

    // 폼 유효성 검사
    function validateForm() {
        const projectName = document.getElementById('projectName').value.trim();
        const clientName = document.getElementById('clientName').value.trim();
        const projectStatus = document.getElementById('projectStatus').value;
        const projectManager = document.getElementById('projectManager').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const projectDescription = document.getElementById('projectDescription').value.trim();

        if (!projectName) {
            alert('프로젝트명을 입력해주세요.');
            return false;
        }

        if (!clientName) {
            alert('발주사를 입력해주세요.');
            return false;
        }

        if (!projectStatus) {
            alert('프로젝트 상태를 선택해주세요.');
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

    // 직급별 경비 설정 기능
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

    // 숫자 입력 필드 포맷팅
    document.querySelectorAll('.expense-input-sm').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
            }
        });
    });
});
