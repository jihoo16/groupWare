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
    const relationDetailsModal = document.getElementById('relationDetailsModal');
    const relationDetailsContainer = document.getElementById('relationDetailsContainer');

    // 선택된 팀원 목록
    let selectedMemberList = [];
    let memberIdCounter = 0;

    // 카드 목록
    let cardListData = [];
    let cardIdCounter = 0;

    // 연계 프로젝트 목록
    let relatedProjectList = [];

    // 일정 목록
    let scheduleList = [
        { startDate: '2024-01-01', endDate: '2024-01-07', content: '요구사항 분석 및 기본 설계 완료', achievement: 100 },
        { startDate: '2024-01-08', endDate: '2024-01-14', content: '데이터베이스 스키마 설계 및 API 개발 착수', achievement: 60 },
        { startDate: '2024-01-15', endDate: '2024-01-21', content: '프론트엔드 개발 진행 중', achievement: 30 }
    ];
    let editingScheduleIndex = -1;

    // 기존 파일 목록
    let existingFiles = [];

    // 연구 책임자 드롭다운 요소
    const projectManagerSelect = document.getElementById('projectManager');

    // 직급 목록 저장 변수
    let positionList = [];

    // 페이지 로드 시 직급 목록과 연구 책임자 목록을 먼저 로드
    Promise.all([
        loadPositions(),
        projectManagerSelect ? loadProjectManagers() : Promise.resolve()
    ]).then(() => {
        // 모든 기본 데이터 로드 완료 후 프로젝트 데이터 로드
        loadProjectData(projectId);
    }).catch(error => {
        console.error('초기 데이터 로드 실패:', error);
        alert('페이지 로드 중 오류가 발생했습니다.');
    });

    // 직급 목록 로드 함수
    function loadPositions() {
        return fetch('/api/codes/ranks?activeOnly=true')
            .then(response => {
                if (!response.ok) {
                    throw new Error('직급 목록을 불러오는데 실패했습니다.');
                }
                return response.json();
            })
            .then(positions => {
                positionList = positions;
                console.log('직급 목록 로드 완료:', positionList);

                // 경비 설정 테이블 생성
                renderExpenseSettingsTable();
            })
            .catch(error => {
                console.error('Error loading positions:', error);
                throw error;
            });
    }

    // 경비 설정 테이블 동적 생성
    function renderExpenseSettingsTable() {
        const expenseSettingsBody = document.getElementById('expenseSettingsBody');
        if (!expenseSettingsBody) return;

        expenseSettingsBody.innerHTML = '';

        if (positionList.length === 0) {
            expenseSettingsBody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 20px;">등록된 직급이 없습니다.</td></tr>';
            return;
        }

        positionList.forEach(position => {
            const row = document.createElement('tr');
            row.setAttribute('data-position', position.codeName);
            row.setAttribute('data-position-code', position.code);

            row.innerHTML = `
                <td class="position-name-cell">${position.codeName}</td>
                <td><input type="number" class="expense-input-sm" name="daily_allowance_${position.code}" value="0" min="0" step="1000" placeholder="일비"></td>
                <td><input type="number" class="expense-input-sm" name="meal_allowance_${position.code}" value="0" min="0" step="1000" placeholder="식비"></td>
                <td><input type="number" class="expense-input-sm" name="meeting_allowance_${position.code}" value="0" min="0" step="1000" placeholder="회의비"></td>
                <td><input type="number" class="expense-input-sm" name="overtime_meal_${position.code}" value="0" min="0" step="1000" placeholder="야근식대"></td>
            `;

            expenseSettingsBody.appendChild(row);
        });

        // 숫자 입력 필드 포맷팅 이벤트 추가
        document.querySelectorAll('.expense-input-sm').forEach(input => {
            input.addEventListener('keypress', function(e) {
                if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                }
            });
        });

        console.log('경비 설정 테이블 생성 완료');
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
                    // 사용자 정보를 data 속성에 저장
                    option.dataset.empName = user.empName;
                    option.dataset.empDeptName = deptName;
                    option.dataset.empPositionName = positionName;
                    option.dataset.empPositionCode = user.empPositionCode || '';
                    projectManagerSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error loading project managers:', error);
                // 에러 발생 시에도 기본 옵션은 유지
            });
    }

    // 연구책임자 선택 시 팀원에 자동 추가
    if (projectManagerSelect) {
        projectManagerSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const piIdx = this.value;

            if (!piIdx || piIdx === '') {
                // 연구책임자가 선택 해제된 경우, 기존 PI 역할 팀원 제거
                selectedMemberList = selectedMemberList.filter(m => m.role !== 'PI');
                renderTeamTable();
                return;
            }

            const piName = selectedOption.dataset.empName;
            const piDept = selectedOption.dataset.empDeptName;
            const piPosition = selectedOption.dataset.empPositionName;
            const projectStartDate = document.getElementById('startDate').value;
            const projectEndDate = document.getElementById('endDate').value;

            // 기존 PI 역할 제거
            selectedMemberList = selectedMemberList.filter(m => m.role !== 'PI');

            // 새 PI 추가 (이미 팀원 목록에 있는 경우 역할만 변경)
            const existingMember = selectedMemberList.find(m => m.id === piIdx);
            if (existingMember) {
                existingMember.role = 'PI';
            } else {
                selectedMemberList.unshift({
                    id: piIdx,
                    name: piName,
                    dept: piDept,
                    position: piPosition,
                    role: 'PI',
                    startDate: projectStartDate || '',
                    endDate: projectEndDate || ''
                });
            }

            renderTeamTable();
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
                document.getElementById('activityBudget').value = project.activityBudget || 0;
                document.getElementById('equipmentBudget').value = project.equipmentBudget || 0;

                // 팀원 목록 로드
                if (project.projectMembers && project.projectMembers.length > 0) {
                    selectedMemberList = project.projectMembers.map(member => ({
                        id: member.employeeIdx.toString(),
                        name: member.employeeName || '-',
                        dept: member.employeeDeptName || '-',
                        position: member.employeePositionName || '-',
                        role: member.role || '',
                        startDate: member.participationStartDate || '',
                        endDate: member.participationEndDate || ''
                    }));
                } else {
                    selectedMemberList = [];
                }
                renderTeamTable();

                // 연구비 카드 목록 로드
                loadProjectCards(project.idx);

                // 연계 프로젝트 목록 로드
                if (project.projectRelations && project.projectRelations.length > 0) {
                    relatedProjectList = project.projectRelations.map(relation => ({
                        id: relation.targetProjectIdx,
                        name: relation.targetProjectName,
                        status: relation.targetProjectStatus,
                        pm: relation.targetProjectManager,
                        period: relation.targetPeriod,
                        relationType: relation.relationType,
                        description: relation.description
                    }));
                    console.log('연계 프로젝트 목록 로드:', relatedProjectList);
                } else {
                    relatedProjectList = [];
                }
                renderRelatedProjectList();

                // 직급별 경비 설정 로드
                if (project.projectExpenseSettings && project.projectExpenseSettings.length > 0) {
                    loadExpenseSettings(project.projectExpenseSettings);
                }

                existingFiles = [];
                renderExistingFileList();
            })
            .catch(error => {
                console.error('Error loading project data:', error);
                alert('프로젝트 정보를 불러올 수 없습니다.');
                location.href = '/project';
            });
    }

    // 직급별 경비 설정 로드 함수 (새 구조: expenseItemName + amount)
    function loadExpenseSettings(expenseSettings) {
        if (!expenseSettings || expenseSettings.length === 0) {
            console.log('경비 설정 데이터가 없습니다.');
            return;
        }

        // 경비 항목명 매핑 (한글 → 인덱스)
        const expenseItemIndexMap = {
            '출장비': 0,
            '중식비': 1,
            '회의비': 2,
            '야근석식대': 3
        };

        // 직급별 데이터 그룹화
        const groupedByPosition = {};

        expenseSettings.forEach((setting, index) => {
            const positionCode = setting.positionCode;

            if (!groupedByPosition[positionCode]) {
                groupedByPosition[positionCode] = {
                    positionCode: setting.positionCode,
                    amounts: [0, 0, 0, 0] // [출장비, 중식비, 회의비, 야근석식대]
                };
            }

            const itemIndex = expenseItemIndexMap[setting.expenseItemName];
            if (itemIndex !== undefined) {
                groupedByPosition[positionCode].amounts[itemIndex] = setting.amount || 0;
            } else {
                console.warn(`  알 수 없는 경비 항목: ${setting.expenseItemName}`);
            }
        });


        // 각 직급 행에 데이터 설정
        Object.keys(groupedByPosition).forEach(positionCode => {
            const row = document.querySelector(`tr[data-position-code="${positionCode}"]`);

            if (row) {
                const data = groupedByPosition[positionCode];
                const inputs = row.querySelectorAll('.expense-input-sm');


                if (inputs.length >= 4) {
                    inputs[0].value = data.amounts[0]; // 출장비
                    inputs[1].value = data.amounts[1]; // 중식비
                    inputs[2].value = data.amounts[2]; // 회의비
                    inputs[3].value = data.amounts[3]; // 야근석식대
                } else {
                    console.warn('  → input 개수 부족!');
                }

                // 직급 코드도 data 속성에 저장 (나중에 전송 시 사용)
                row.setAttribute('data-position-code', data.positionCode);
            } else {
                console.warn(`  → 행을 찾을 수 없음! (data-position-code="${positionCode}")`);
            }
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

    // 직급 순서 반환 함수 (정렬용)
    function getPositionOrder(positionName) {
        if (!positionName) {
            return 999; // 직급 정보 없는 경우 맨 뒤로
        }

        switch (positionName) {
            case '대표':
            case '대표이사':
                return 1;
            case '상무':
            case '상무이사':
                return 2;
            case '이사':
                return 3;
            case '부장':
                return 4;
            case '차장':
                return 5;
            case '과장':
                return 6;
            case '대리':
                return 7;
            case '사원':
                return 8;
            default:
                return 999; // 알 수 없는 직급은 맨 뒤로
        }
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

        // 현재 선택된 연구책임자 ID 가져오기
        const currentPiIdx = projectManagerSelect ? projectManagerSelect.value : '';

        // 활성 상태 사용자만 표시하고, 연구책임자는 제외
        const activeUsers = users.filter(user => {
            const isActive = user.empStatus === '재직' || !user.empStatus;
            const isNotPI = user.idx != currentPiIdx || !currentPiIdx;
            return isActive && isNotPI;
        });

        // 이미 선택된 사용자와 미선택 사용자로 분리
        const selectedUsers = activeUsers.filter(user =>
            selectedMemberList.some(m => m.id === user.idx.toString())
        );
        const unselectedUsers = activeUsers.filter(user =>
            !selectedMemberList.some(m => m.id === user.idx.toString())
        );

        // 각 그룹을 직급 순으로 정렬 (대표 > 상무 > 이사 > 부장 > 차장 > 과장 > 대리 > 사원)
        selectedUsers.sort((a, b) => {
            const orderA = getPositionOrder(a.empPositionName);
            const orderB = getPositionOrder(b.empPositionName);
            return orderA - orderB;
        });

        unselectedUsers.sort((a, b) => {
            const orderA = getPositionOrder(a.empPositionName);
            const orderB = getPositionOrder(b.empPositionName);
            return orderA - orderB;
        });

        // 선택된 사용자를 상단에, 미선택 사용자를 하단에 배치
        const sortedUsers = [...selectedUsers, ...unselectedUsers];

        sortedUsers.forEach(user => {
            const row = document.createElement('tr');
            const deptName = user.empDeptName || user.empDept || '-';
            const positionName = user.empPositionName || user.empPosition || '-';
            const positionCode = user.empPositionCode || '';

            row.setAttribute('data-id', user.idx);
            row.setAttribute('data-name', user.empName);
            row.setAttribute('data-dept', deptName);
            row.setAttribute('data-position', positionName);
            row.setAttribute('data-position-code', positionCode);

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
                // 직급에 따라 자동으로 역할 할당
                const autoRole = getAutoRole(memberPosition);

                selectedMemberList.push({
                    id: memberId,
                    name: memberName,
                    dept: memberDept,
                    position: memberPosition,
                    role: autoRole, // 직급에 따라 자동 할당된 역할
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
        { value: 'PI', label: '연구책임자' },
        { value: 'PRACTITIONER', label: '실무자' },
        { value: 'RESEARCHER', label: '연구원' }
    ];

    // 직급명을 기준으로 역할 자동 할당 함수
    function getAutoRole(positionName) {
        // 부장 이상은 실무자
        const seniorPositions = ['부장', '이사', '상무', '전무', '부사장', '사장', '대표이사'];
        if (seniorPositions.some(pos => positionName && positionName.includes(pos))) {
            return 'PRACTITIONER';
        }

        // 차장 이하는 연구원
        return 'RESEARCHER';
    }

    // 팀원 테이블 렌더링
    function renderTeamTable() {
        if (!teamTableBody) return;

        const teamAddButtonWrapper = document.getElementById('teamAddButtonWrapper');

        teamTableBody.innerHTML = '';

        if (selectedMemberList.length === 0) {
            // 팀원이 없을 때: empty-row 표시, 버튼 래퍼 숨김
            teamTableBody.innerHTML = '<tr class="empty-row text-center"><td colspan="8" class="text-center">팀원을 추가해주세요</td></tr>';
            if (teamAddButtonWrapper) {
                teamAddButtonWrapper.style.display = 'none';
            }
            return;
        }

        // 팀원 정렬: PI(연구책임자)를 맨 위에, 나머지는 직급 순으로 정렬
        const sortedMembers = [...selectedMemberList].sort((a, b) => {
            // PI는 항상 맨 위
            if (a.role === 'PI') return -1;
            if (b.role === 'PI') return 1;

            // 나머지는 직급 순으로 정렬 (대표 > 상무 > 이사 > 부장 > 차장 > 과장 > 대리 > 사원)
            const orderA = getPositionOrder(a.position);
            const orderB = getPositionOrder(b.position);
            return orderA - orderB;
        });

        // 팀원이 있을 때: 목록 표시, 버튼 래퍼 표시
        sortedMembers.forEach((member, index) => {
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

        // 버튼 래퍼 표시
        if (teamAddButtonWrapper) {
            teamAddButtonWrapper.style.display = '';
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

    // 프로젝트 시작일/종료일 변경 시 팀원 참여일 자동 업데이트
    const projectStartDateInput = document.getElementById('startDate');
    const projectEndDateInput = document.getElementById('endDate');

    if (projectStartDateInput) {
        projectStartDateInput.addEventListener('change', function() {
            const newStartDate = this.value;
            // 모든 팀원의 참여 시작일을 프로젝트 시작일로 업데이트
            selectedMemberList.forEach(member => {
                member.startDate = newStartDate;
            });
            renderTeamTable();
        });
    }

    if (projectEndDateInput) {
        projectEndDateInput.addEventListener('change', function() {
            const newEndDate = this.value;
            // 모든 팀원의 참여 종료일을 프로젝트 종료일로 업데이트
            selectedMemberList.forEach(member => {
                member.endDate = newEndDate;
            });
            renderTeamTable();
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
            console.log('폼 제출 - 현재 projectId:', projectId);
            console.log('현재 cardListData:', cardListData);
            console.log('현재 relatedProjectList:', relatedProjectList);

            // 카드 데이터 변환 (기존 카드는 idx 포함, 신규 카드는 idx null)
            const projectCards = cardListData.map(card => ({
                idx: card.id > 0 ? card.id : null,  // 양수면 기존 카드 idx, 음수면 null (신규)
                cardCompany: card.company,
                cardLastDigits: card.number,
                cardNickname: card.name || null
            }));
            console.log("변환된 projectCards:", projectCards);

            // 연계 프로젝트 데이터 변환
            const projectRelations = relatedProjectList.map(project => ({
                targetProjectIdx: project.id,
                relationType: project.relationType || 'RELATED',
                description: project.description || null
            }));
            console.log("변환된 projectRelations:", projectRelations);

            // 팀원 데이터 변환
            const projectMembers = selectedMemberList.map(member => ({
                employeeIdx: parseInt(member.id),
                role: member.role || null,
                participationStartDate: member.startDate || null,
                participationEndDate: member.endDate || null
            }));
            console.log("변환된 projectMembers:", projectMembers);

            // 직급별 경비 설정 데이터 수집 (새 구조: expenseItemName + amount)
            const projectExpenseSettings = [];
            const expenseRows = document.querySelectorAll('#expenseSettingsBody tr[data-position]');

            // 경비 항목 정의
            const expenseItems = [
                { name: '출장비', nameEn: 'businessTripAllowance' },
                { name: '중식비', nameEn: 'lunchAllowance' },
                { name: '회의비', nameEn: 'businessMealAllowance' },
                { name: '야근석식대', nameEn: 'nightMealAllowance' }
            ];


            expenseRows.forEach(row => {
                const positionCode = row.getAttribute('data-position-code');
                const inputs = row.querySelectorAll('.expense-input-sm');

                if (inputs.length >= 4) {
                    // 각 경비 항목을 별도의 레코드로 저장
                    expenseItems.forEach((item, index) => {
                        const amount = parseInt(inputs[index].value) || 0;
                        projectExpenseSettings.push({
                            positionCode: positionCode || null,
                            expenseItemName: item.name,
                            expenseItemNameEn: item.nameEn,
                            amount: amount
                        });
                    });
                }
            });
            console.log("변환된 projectExpenseSettings:", projectExpenseSettings);

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
                activityBudget: parseFloat(document.getElementById('activityBudget').value) || 0,
                equipmentBudget: parseFloat(document.getElementById('equipmentBudget').value) || 0,
                projectCards: projectCards,
                projectRelations: projectRelations,
                projectMembers: projectMembers,
                projectExpenseSettings: projectExpenseSettings
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

        // 현재 수정 중인 프로젝트 제외
        const filteredProjects = projects.filter(project => project.idx != projectId);

        if (filteredProjects.length === 0) {
            relatedProjectTableBody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 40px;">등록된 프로젝트가 없습니다.</td></tr>';
            return;
        }

        filteredProjects.forEach(project => {
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

    // 연계 정보 입력 모달 표시 (전역 함수)
    window.showRelationDetailsModal = function() {
        const checkboxes = document.querySelectorAll('.related-project-checkbox:checked');

        if (checkboxes.length === 0) {
            alert('연계할 프로젝트를 선택해주세요.');
            return;
        }

        // 선택된 프로젝트 정보 수집
        const selectedProjects = [];
        checkboxes.forEach(checkbox => {
            const row = checkbox.closest('tr');
            selectedProjects.push({
                id: checkbox.value,
                name: row.getAttribute('data-name'),
                status: row.getAttribute('data-status'),
                pm: row.getAttribute('data-pm'),
                period: row.getAttribute('data-period')
            });
        });

        // 상세 정보 입력 폼 생성
        relationDetailsContainer.innerHTML = '';
        selectedProjects.forEach((project, index) => {
            const formSection = document.createElement('div');
            formSection.className = 'form-section';
            formSection.style.marginBottom = '20px';
            formSection.style.padding = '15px';
            formSection.style.border = '1px solid #dee2e6';
            formSection.style.borderRadius = '4px';

            formSection.innerHTML = `
                <h3 style="font-size: 14px; margin-bottom: 15px; color: #495057;">
                    <i class="fas fa-link"></i> ${project.name}
                </h3>
                <input type="hidden" id="relationProjectId_${index}" value="${project.id}">
                <input type="hidden" id="relationProjectName_${index}" value="${project.name}">
                <input type="hidden" id="relationProjectStatus_${index}" value="${project.status}">
                <input type="hidden" id="relationProjectPM_${index}" value="${project.pm}">
                <input type="hidden" id="relationProjectPeriod_${index}" value="${project.period}">

                <div class="form-group" style="margin-bottom: 15px;">
                    <label for="relationType_${index}" style="display: block; margin-bottom: 5px; font-weight: 500;">
                        연계 유형 <span class="required">*</span>
                    </label>
                    <select id="relationType_${index}" class="form-control" required>
                        <option value="">선택하세요</option>
                        <option value="RELATED">RELATED</option>
                        <option value="DEPENDENT">DEPENDENT</option>
                        <option value="PREREQUISITE">PREREQUISITE</option>
                        <option value="SUCCESSOR">SUCCESSOR</option>
                        <option value="COLLABORATION">COLLABORATION</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="relationDescription_${index}" style="display: block; margin-bottom: 5px; font-weight: 500;">
                        설명
                    </label>
                    <textarea id="relationDescription_${index}" class="form-control" rows="2"
                              placeholder="연계 프로젝트와의 관계를 간단히 설명해주세요"></textarea>
                </div>
            `;

            relationDetailsContainer.appendChild(formSection);
        });

        // 모달 전환
        relatedProjectModal.classList.remove('active');
        relationDetailsModal.classList.add('active');
    };

    // 연계 정보 저장 (전역 함수)
    window.saveRelatedProjects = function() {
        const formSections = relationDetailsContainer.querySelectorAll('.form-section');
        const newRelations = [];

        // 각 폼에서 데이터 수집 및 유효성 검사
        for (let i = 0; i < formSections.length; i++) {
            const relationType = document.getElementById(`relationType_${i}`).value;
            const description = document.getElementById(`relationDescription_${i}`).value;
            const projectId = document.getElementById(`relationProjectId_${i}`).value;
            const projectName = document.getElementById(`relationProjectName_${i}`).value;
            const projectStatus = document.getElementById(`relationProjectStatus_${i}`).value;
            const projectPM = document.getElementById(`relationProjectPM_${i}`).value;
            const projectPeriod = document.getElementById(`relationProjectPeriod_${i}`).value;

            if (!relationType) {
                alert(`"${projectName}" 프로젝트의 연계 유형을 선택해주세요.`);
                return;
            }

            // 중복 체크
            if (!relatedProjectList.some(p => p.id === projectId)) {
                newRelations.push({
                    id: projectId,
                    name: projectName,
                    status: projectStatus,
                    pm: projectPM,
                    period: projectPeriod,
                    relationType: relationType,
                    description: description
                });
            }
        }

        // 연계 프로젝트 목록에 추가
        relatedProjectList.push(...newRelations);
        renderRelatedProjectList();

        // 모달 닫기
        closeRelationDetailsModal();
        closeRelatedProjectModal();
    };

    // 연계 정보 입력 모달 닫기 (전역 함수)
    window.closeRelationDetailsModal = function() {
        if (!relationDetailsModal) return;
        relationDetailsModal.classList.remove('active');
    };

    // 프로젝트 선택으로 돌아가기 (전역 함수)
    window.backToProjectSelection = function() {
        closeRelationDetailsModal();
        relatedProjectModal.classList.add('active');
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
            const statusLabel = getStatusLabel(project.status);
            const statusClass = getStatusClass(project.status);
            item.innerHTML = `
                <div class="related-project-info">
                    <div class="related-project-name">
                        <i class="fas fa-link"></i>
                        ${project.name || '-'}
                    </div>
                    <div class="related-project-details">
                        <span><span class="status-badge ${statusClass}">${statusLabel}</span></span>
                        <span><i class="fas fa-user"></i> 연구 책임자: ${project.pm || '-'}</span>
                        <span><i class="fas fa-calendar"></i> ${project.period || '-'}</span>
                        <span><i class="fas fa-link"></i>연계 타입: ${project.relationType || '-'}</span>
                        <span><i class="fas fa-comment-alt"></i>설명: ${project.description || '-'}</span>
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

    // 연계 정보 입력 모달 배경 클릭 시 닫기
    if (relationDetailsModal) {
        relationDetailsModal.addEventListener('click', function(e) {
            if (e.target === relationDetailsModal) {
                closeRelationDetailsModal();
            }
        });
    }

    // 직급별 경비 설정 기능
    const resetExpensesBtn = document.getElementById('resetExpensesBtn');
    const loadDefaultExpensesBtn = document.getElementById('loadDefaultExpensesBtn');

    // 기본값으로 초기화
    if (resetExpensesBtn) {
        resetExpensesBtn.addEventListener('click', function() {
            if (confirm('경비 설정을 0원으로 초기화하시겠습니까?')) {
                resetExpensesToDefault();
            }
        });
    }

    function resetExpensesToDefault() {
        const expenseRows = document.querySelectorAll('#expenseSettingsBody tr[data-position]');

        expenseRows.forEach(row => {
            const inputs = row.querySelectorAll('.expense-input-sm');
            inputs.forEach(input => {
                input.value = 0;
            });
        });

        alert('경비 설정이 0원으로 초기화되었습니다.');
    }

    // 기초정보관리 설정값 불러오기
    if (loadDefaultExpensesBtn) {
        loadDefaultExpensesBtn.addEventListener('click', function() {
            fetch('/api/fixed-expense-policies')
                .then(res => res.json())
                .then(policies => {
                    console.log("===== 기초정보관리 데이터 불러오기 =====");
                    console.log("policies 원본 데이터:", policies);
                    console.log("데이터 개수:", policies.length);

                    loadExpenseSettings(policies);

                    alert('기초정보관리의 설정값을 불러왔습니다.');
                })
                .catch(error => {
                    console.error('고정경비 정책 조회 실패:', error);
                    alert('설정값을 불러오는데 실패했습니다.');
                });
        });
    }

    // 삭제 버튼 이벤트
    const deleteProjectBtn = document.getElementById('deleteProjectBtn');
    if (deleteProjectBtn) {
        deleteProjectBtn.addEventListener('click', function() {
            // 삭제 확인 대화상자
            if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까?\n삭제된 프로젝트는 복구할 수 없습니다.')) {
                return;
            }

            // 추가 확인
            const projectName = document.getElementById('projectName').value;
            const confirmMessage = `프로젝트명: ${projectName}\n\n위 프로젝트를 삭제하시려면 "삭제"를 입력하세요.`;
            const userInput = prompt(confirmMessage);

            if (userInput !== '삭제') {
                alert('삭제가 취소되었습니다.');
                return;
            }

            // 삭제 API 호출
            deleteProjectBtn.disabled = true;
            deleteProjectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 삭제 중...';

            fetch(`/api/projects/${projectId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(text || '프로젝트 삭제에 실패했습니다.');
                    });
                }
                return response.text();
            })
            .then(() => {
                alert('프로젝트가 삭제되었습니다.');
                window.location.href = '/project';
            })
            .catch(error => {
                console.error('프로젝트 삭제 실패:', error);
                alert('프로젝트 삭제에 실패했습니다.\n' + error.message);
                deleteProjectBtn.disabled = false;
                deleteProjectBtn.innerHTML = '<i class="fas fa-trash"></i> 삭제';
            });
        });
    }

    // ==================== 상세 일정 관리 ====================

    const scheduleModal = document.getElementById('scheduleModal');
    const addScheduleBtn = document.getElementById('addScheduleBtn');

    // 일정 추가 버튼
    if (addScheduleBtn) {
        addScheduleBtn.addEventListener('click', function() {
            openScheduleModal();
        });
    }

    // 일정 모달 열기
    window.openScheduleModal = function(index = -1) {
        editingScheduleIndex = index;

        if (index >= 0) {
            // 수정 모드
            const schedule = scheduleList[index];
            document.getElementById('scheduleModalTitle').textContent = '일정 수정';
            document.getElementById('scheduleStartDate').value = schedule.startDate;
            document.getElementById('scheduleEndDate').value = schedule.endDate;
            document.getElementById('scheduleContent').value = schedule.content;
            document.getElementById('scheduleAchievement').value = schedule.achievement;
        } else {
            // 추가 모드
            document.getElementById('scheduleModalTitle').textContent = '일정 추가';
            document.getElementById('scheduleStartDate').value = '';
            document.getElementById('scheduleEndDate').value = '';
            document.getElementById('scheduleContent').value = '';
            document.getElementById('scheduleAchievement').value = 0;
        }

        scheduleModal.classList.add('active');
    };

    // 일정 모달 닫기
    window.closeScheduleModal = function() {
        scheduleModal.classList.remove('active');
        editingScheduleIndex = -1;
    };

    // 일정 저장
    window.saveSchedule = function() {
        const startDate = document.getElementById('scheduleStartDate').value;
        const endDate = document.getElementById('scheduleEndDate').value;
        const content = document.getElementById('scheduleContent').value.trim();
        const achievement = parseInt(document.getElementById('scheduleAchievement').value);

        // 유효성 검사
        if (!startDate || !endDate || !content) {
            alert('모든 필수 항목을 입력해주세요.');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert('종료일은 시작일 이후여야 합니다.');
            return;
        }

        if (achievement < 0 || achievement > 100) {
            alert('달성률은 0~100 사이의 값이어야 합니다.');
            return;
        }

        const scheduleData = {
            startDate,
            endDate,
            content,
            achievement
        };

        if (editingScheduleIndex >= 0) {
            // 수정
            scheduleList[editingScheduleIndex] = scheduleData;
        } else {
            // 추가
            scheduleList.push(scheduleData);
        }

        renderScheduleTable();
        closeScheduleModal();
    };

    // 일정 수정
    window.editSchedule = function(index) {
        openScheduleModal(index);
    };

    // 일정 삭제
    window.deleteSchedule = function(index) {
        if (!confirm('이 일정을 삭제하시겠습니까?')) {
            return;
        }

        scheduleList.splice(index, 1);
        renderScheduleTable();
    };

    // 일정 테이블 렌더링
    function renderScheduleTable() {
        const tbody = document.getElementById('scheduleTableBody');

        if (scheduleList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 40px; color: #868e96;">등록된 일정이 없습니다.</td></tr>';
            return;
        }

        tbody.innerHTML = scheduleList.map((item, index) => {
            const achievementClass =
                item.achievement >= 80 ? 'achievement-high' :
                item.achievement >= 50 ? 'achievement-medium' : 'achievement-low';

            return `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${item.startDate} ~ ${item.endDate}</td>
                    <td>${item.content}</td>
                    <td class="text-center">
                        <span class="achievement-badge ${achievementClass}">${item.achievement}%</span>
                    </td>
                    <td class="text-center action-cell">
                        <button type="button" class="btn btn-sm btn-secondary" onclick="editSchedule(${index})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-delete" onclick="deleteSchedule(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // 초기 렌더링
    renderScheduleTable();
});
