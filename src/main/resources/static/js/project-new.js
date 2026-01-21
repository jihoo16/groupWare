document.addEventListener('DOMContentLoaded', function() {
    // 신규 프로젝트 페이지 요소
    const projectForm = document.getElementById('projectForm');
    const addMemberBtn = document.getElementById('addMemberBtn');
    const memberSelectModal = document.getElementById('memberSelectModal');
    const memberSearchInput = document.getElementById('memberSearchInput');
    const teamTableBody = document.getElementById('teamTableBody');
    const teamAddButtonWrapper = document.getElementById('teamAddButtonWrapper');
    const memberOrgTree = document.getElementById('memberOrgTree');
    const selectedMemberCount = document.getElementById('selectedMemberCount');
    const selectedMembersList = document.getElementById('selectedMembersList');
    const selectAllMembersBtn = document.getElementById('selectAllMembersBtn');
    const expandAllMembersBtn = document.getElementById('expandAllMembersBtn');
    const clearSelectedMembersBtn = document.getElementById('clearSelectedMembersBtn');
    const addCardBtn = document.getElementById('addCardBtn');
    const cardModal = document.getElementById('cardModal');
    const cardList = document.getElementById('cardList');
    const projectFiles = document.getElementById('projectFiles');
    const fileList = document.getElementById('fileList');
    const fileUploadArea = document.getElementById('fileUploadArea');

    // 파일 관련 변수
    let selectedFiles = [];
    const addRelatedProjectBtn = document.getElementById('addRelatedProjectBtn');
    const relatedProjectModal = document.getElementById('relatedProjectModal');
    const relatedProjectSearchInput = document.getElementById('relatedProjectSearchInput');
    const relatedProjectListElement = document.getElementById('relatedProjectList');
    const relationDetailsModal = document.getElementById('relationDetailsModal');
    const relationDetailsContainer = document.getElementById('relationDetailsContainer');

    // 선택된 팀원 목록
    let selectedMemberList = [];
    let memberIdCounter = 0;

    // 조직도 트리 관련 변수
    let tempSelectedMembers = []; // 모달 내 임시 선택 목록
    let organizationData = { departments: [] }; // 조직도 데이터

    // 카드 목록
    let cardListData = [];
    let cardIdCounter = 0;

    // 연계 프로젝트 목록
    let relatedProjectList = [];
    let relatedProjectIdCounter = 0;

    // 연구 책임자 요소
    const projectManagerInput = document.getElementById('projectManager');
    const projectManagerIdxInput = document.getElementById('projectManagerIdx');
    const managerSelectModal = document.getElementById('managerSelectModal');
    const managerSearchInput = document.getElementById('managerSearch');
    const managerListElement = document.getElementById('managerList');

    // 연구책임자 관련 변수
    let allManagers = []; // 대표이사/상무/이사급 사용자 목록
    let selectedManager = null;

    // 직급 목록 저장 변수
    let positionList = [];

    // 페이지 로드 시 직급 목록 로드
    Promise.all([
        loadPositions(),
        loadManagers()
    ]).then(() => {
        console.log('초기 데이터 로드 완료');
    }).catch(error => {
        console.error('초기 데이터 로드 실패:', error);
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
                <td><input type="text" class="expense-input-sm currency-input-sm" name="daily_allowance_${position.code}" value="0" placeholder="일비"></td>
                <td><input type="text" class="expense-input-sm currency-input-sm" name="meal_allowance_${position.code}" value="0" placeholder="식비"></td>
                <td><input type="text" class="expense-input-sm currency-input-sm" name="meeting_allowance_${position.code}" value="0" placeholder="회의비"></td>
                <td><input type="text" class="expense-input-sm currency-input-sm" name="overtime_meal_${position.code}" value="0" placeholder="야근식대"></td>
            `;

            expenseSettingsBody.appendChild(row);
        });

        // 금액 포맷팅 적용
        applyCurrencyFormatting();

        console.log('경비 설정 테이블 생성 완료');
    }

    // 연구책임자 목록 로드 함수 (대표이사/상무/이사급만)
    function loadManagers() {
        return fetch('/api/users/high-rank-managers')
            .then(response => {
                if (!response.ok) {
                    throw new Error('연구책임자 목록을 불러오는데 실패했습니다.');
                }
                return response.json();
            })
            .then(managers => {
                allManagers = managers;
                console.log('연구책임자 후보 로드 완료:', allManagers.length + '명');
            })
            .catch(error => {
                console.error('Error loading managers:', error);
                throw error;
            });
    }

    // 연구책임자 input 클릭 시 modal 열기
    if (projectManagerInput) {
        projectManagerInput.addEventListener('click', function() {
            openManagerModal();
        });
    }

    // 연구책임자 선택 modal 열기
    function openManagerModal() {
        if (managerSelectModal) {
            renderManagerList(allManagers);
            managerSelectModal.classList.add('active');
        }
    }

    // 연구책임자 목록 렌더링
    function renderManagerList(managers) {
        if (!managerListElement) return;

        managerListElement.innerHTML = '';

        if (managers.length === 0) {
            managerListElement.innerHTML = '<div class="text-center" style="padding: 40px; color: #868e96;">등록된 연구책임자 후보가 없습니다.</div>';
            return;
        }

        managers.forEach(manager => {
            const item = document.createElement('div');
            item.className = 'manager-employee-item';
            if (selectedManager && selectedManager.idx === manager.idx) {
                item.classList.add('selected');
            }

            item.innerHTML = `
                <div class="manager-employee-info">
                    <div class="manager-employee-name">${manager.empName}</div>
                    <div class="manager-employee-details">${manager.empDeptName || '-'} · ${manager.empPositionName || '-'}</div>
                </div>
            `;

            item.addEventListener('click', function() {
                // 기존 선택 해제
                managerListElement.querySelectorAll('.manager-employee-item').forEach(el => {
                    el.classList.remove('selected');
                });
                // 새로운 선택
                item.classList.add('selected');
                selectedManager = manager;
            });

            managerListElement.appendChild(item);
        });
    }

    // 연구책임자 검색
    if (managerSearchInput) {
        managerSearchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const filtered = allManagers.filter(manager => {
                return manager.empName.toLowerCase().includes(searchTerm);
            });
            renderManagerList(filtered);
        });
    }

    // 연구책임자 선택 확정
    window.selectManager = function() {
        if (!selectedManager) {
            alert('연구책임자를 선택해주세요.');
            return;
        }

        if (projectManagerInput) {
            projectManagerInput.value = `${selectedManager.empName} (${selectedManager.empDeptName || '-'} / ${selectedManager.empPositionName || '-'})`;
        }
        if (projectManagerIdxInput) {
            projectManagerIdxInput.value = selectedManager.idx;
        }

        // 팀원에 자동 추가
        addManagerToTeam(selectedManager);

        closeManagerModal();
    };

    // 연구책임자 modal 닫기
    window.closeManagerModal = function() {
        if (managerSelectModal) {
            managerSelectModal.classList.remove('active');
            selectedManager = null;
            if (managerSearchInput) {
                managerSearchInput.value = '';
            }
        }
    };

    // 연구책임자를 팀원에 자동 추가
    function addManagerToTeam(manager) {
        // 기존 PI 역할 제거
        selectedMemberList = selectedMemberList.filter(m => m.role !== 'PI');

        // 이미 팀원으로 추가되어 있는지 확인 (idx 또는 id로 체크)
        const existingMember = selectedMemberList.find(m => {
            const memberId = parseInt(m.idx || m.id);
            return memberId === manager.idx;
        });

        if (!existingMember) {
            // 새로 추가
            selectedMemberList.push({
                id: memberIdCounter++,
                idx: manager.idx,
                name: manager.empName,
                dept: manager.empDeptName || '-',
                position: manager.empPositionName || '-',
                role: 'PI'
            });
        } else {
            // 기존 멤버의 역할을 PI로 변경
            existingMember.role = 'PI';
            // idx가 없는 경우 추가 (일반 팀원에서 PI로 변경된 경우)
            if (!existingMember.idx) {
                existingMember.idx = parseInt(existingMember.id);
            }
        }

        renderTeamTable();
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

        // 임시 선택 목록 초기화 (기존 선택된 팀원들로 초기화, PI 제외)
        tempSelectedMembers = selectedMemberList
            .filter(m => m.role !== 'PI')
            .map(m => ({
                id: parseInt(m.id || m.idx),
                name: m.name,
                department: m.dept,
                rank: m.position
            }));

        // 인력 목록을 먼저 로드한 후 모달 표시
        loadMembersForModal();
    }

    // 인력 목록 로드 함수 (조직도 구조로 변환)
    function loadMembersForModal() {
        fetch('/api/users')
            .then(response => {
                if (!response.ok) {
                    throw new Error('인력 목록을 불러오는데 실패했습니다.');
                }
                return response.json();
            })
            .then(users => {
                // 부서별로 그룹화
                const deptMap = {};

                // 현재 선택된 연구책임자 ID 가져오기
                const currentPiIdx = projectManagerIdxInput ? parseInt(projectManagerIdxInput.value) : null;

                users.forEach(user => {
                    // 활성 사용자만, 연구책임자 제외
                    const isActive = user.empStatus === '재직' || !user.empStatus;
                    const isNotPI = !currentPiIdx || user.idx !== currentPiIdx;

                    if (!isActive || !isNotPI) return;

                    const dept = user.empDeptName || '부서 미지정';
                    if (!deptMap[dept]) {
                        deptMap[dept] = [];
                    }
                    deptMap[dept].push({
                        id: user.idx,
                        name: user.empName,
                        department: dept,
                        rank: user.empPositionName || '직급 미지정'
                    });
                });

                // 조직도 데이터 구조 생성
                organizationData.departments = Object.keys(deptMap).map(deptName => ({
                    id: deptName,
                    name: deptName,
                    members: deptMap[deptName].sort((a, b) =>
                        getPositionOrder(a.rank) - getPositionOrder(b.rank)
                    )
                }));

                buildMemberOrgTree();
                updateSelectedMembersList();

                // 모달 표시
                memberSelectModal.classList.add('active');
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

    // 조직도 트리 생성
    function buildMemberOrgTree() {
        if (!memberOrgTree) return;

        memberOrgTree.innerHTML = '';

        if (!organizationData.departments || organizationData.departments.length === 0) {
            memberOrgTree.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">조직도 데이터가 없습니다.</p>';
            return;
        }

        organizationData.departments.forEach(dept => {
            const deptNode = createDepartmentNode(dept);
            memberOrgTree.appendChild(deptNode);
        });

        setTimeout(() => {
            const firstDept = memberOrgTree.querySelector('.tree-node.department');
            if (firstDept) firstDept.classList.add('expanded');
        }, 100);
    }

    // 부서 노드 생성
    function createDepartmentNode(dept) {
        const node = document.createElement('div');
        node.className = 'tree-node department';
        node.setAttribute('data-id', dept.id);

        const totalMembers = dept.members ? dept.members.length : 0;

        node.innerHTML = `
            <div class="tree-node-header">
                <span class="tree-toggle">
                    <i class="fas fa-chevron-right"></i>
                </span>
                <span class="tree-icon">
                    <i class="fas fa-building"></i>
                </span>
                <span class="tree-label">${dept.name}</span>
                <span class="tree-count">${totalMembers}명</span>
            </div>
            <div class="tree-children"></div>
        `;

        const children = node.querySelector('.tree-children');
        if (dept.members && dept.members.length > 0) {
            dept.members.forEach(member => {
                const memberNode = createMemberNode(member);
                children.appendChild(memberNode);
            });
        }

        // 부서 인원수 뱃지 클릭 시 해당 부서 전체 선택
        const treeCount = node.querySelector('.tree-count');
        if (treeCount && dept.members && dept.members.length > 0) {
            treeCount.style.cursor = 'pointer';
            treeCount.addEventListener('click', function(e) {
                e.stopPropagation();

                // 해당 부서의 모든 팀원이 이미 선택되어 있는지 확인
                const allSelected = dept.members.every(member =>
                    tempSelectedMembers.some(emp => emp.id === member.id)
                );

                if (allSelected) {
                    // 전체 해제
                    dept.members.forEach(member => {
                        tempSelectedMembers = tempSelectedMembers.filter(emp => emp.id !== member.id);
                    });
                } else {
                    // 전체 선택
                    dept.members.forEach(member => {
                        if (!tempSelectedMembers.some(emp => emp.id === member.id)) {
                            tempSelectedMembers.push({
                                id: member.id,
                                name: member.name,
                                department: member.department,
                                rank: member.rank
                            });
                        }
                    });
                }

                // 체크박스 상태 및 목록 업데이트
                updateOrgTreeCheckboxes();
                updateSelectedMembersList();
            });
        }

        attachToggleEvent(node);
        return node;
    }

    // 팀원 노드 생성
    function createMemberNode(member) {
        const node = document.createElement('div');
        node.className = 'tree-node member';
        node.setAttribute('data-id', member.id);
        node.setAttribute('data-member', JSON.stringify(member));

        const isChecked = tempSelectedMembers.some(emp => emp.id === member.id);
        const badgeClass = getPositionBadgeClass(member.rank);

        node.innerHTML = `
            <div class="tree-node-header">
                <span class="tree-toggle invisible">
                    <i class="fas fa-chevron-right"></i>
                </span>
                <input type="checkbox" class="employee-checkbox" data-id="${member.id}" ${isChecked ? 'checked' : ''}>
                <span class="tree-icon">
                    <i class="fas fa-user"></i>
                </span>
                <span class="tree-label">
                    ${member.name}
                    <span class="position-badge ${badgeClass}">${member.rank}</span>
                </span>
            </div>
        `;

        const checkbox = node.querySelector('.employee-checkbox');
        const header = node.querySelector('.tree-node-header');

        checkbox.addEventListener('change', function() {
            const memberData = JSON.parse(node.getAttribute('data-member'));

            if (this.checked) {
                if (!tempSelectedMembers.some(emp => emp.id === memberData.id)) {
                    tempSelectedMembers.push({
                        id: memberData.id,
                        name: memberData.name,
                        department: memberData.department,
                        rank: memberData.rank
                    });
                }
            } else {
                tempSelectedMembers = tempSelectedMembers.filter(emp => emp.id !== memberData.id);
            }
            updateSelectedMembersList();
            updateSelectAllButtonState();
        });

        header.addEventListener('click', function(e) {
            if (e.target === checkbox) {
                return;
            }
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        });

        header.style.cursor = 'pointer';

        return node;
    }

    // 토글 이벤트 추가
    function attachToggleEvent(node) {
        const header = node.querySelector('.tree-node-header');
        const toggle = header.querySelector('.tree-toggle');

        if (!toggle || toggle.classList.contains('invisible')) return;

        header.addEventListener('click', (e) => {
            if (e.target.classList.contains('employee-checkbox')) {
                return;
            }
            e.stopPropagation();
            node.classList.toggle('expanded');
        });
    }

    // 직급 뱃지 클래스 반환
    function getPositionBadgeClass(rank) {
        if (!rank) return 'staff';

        if (rank.includes('대표') || rank.includes('사장')) return 'ceo';
        if (rank.includes('상무') || rank.includes('전무')) return 'seniorExec';
        if (rank.includes('이사')) return 'executive';
        if (rank.includes('부장') || rank.includes('차장')) return 'manager';
        return 'staff';
    }

    // 선택된 팀원 목록 업데이트
    function updateSelectedMembersList() {
        if (!selectedMemberCount || !selectedMembersList) return;

        selectedMemberCount.textContent = tempSelectedMembers.length;

        if (tempSelectedMembers.length === 0) {
            selectedMembersList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">선택된 팀원이 없습니다.</p>';
        } else {
            selectedMembersList.innerHTML = tempSelectedMembers.map(emp => `
                <div class="selected-employee-item">
                    <div class="selected-employee-avatar">${getInitial(emp.name)}</div>
                    <div class="selected-employee-info">
                        <div class="selected-employee-name">${emp.name}</div>
                        <div class="selected-employee-dept">${emp.department || '부서 미지정'} · ${emp.rank || '직급 미지정'}</div>
                    </div>
                    <button type="button" class="remove-employee-btn" data-id="${emp.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');

            selectedMembersList.querySelectorAll('.remove-employee-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.getAttribute('data-id'));
                    tempSelectedMembers = tempSelectedMembers.filter(emp => emp.id !== id);
                    updateSelectedMembersList();
                    updateOrgTreeCheckboxes();
                    updateSelectAllButtonState();
                });
            });
        }

        updateSelectAllButtonState();
    }

    // 이름의 첫 글자 가져오기
    function getInitial(name) {
        if (!name) return '?';
        return name.charAt(0);
    }

    // 조직도 트리 체크박스 업데이트
    function updateOrgTreeCheckboxes() {
        const checkboxes = memberOrgTree.querySelectorAll('.employee-checkbox');
        checkboxes.forEach(checkbox => {
            const id = parseInt(checkbox.getAttribute('data-id'));
            checkbox.checked = tempSelectedMembers.some(emp => emp.id === id);
        });
    }

    // 전체 선택 버튼 상태 업데이트
    function updateSelectAllButtonState() {
        if (!selectAllMembersBtn) return;

        let totalEmployees = 0;
        organizationData.departments.forEach(dept => {
            if (dept.members && dept.members.length > 0) {
                totalEmployees += dept.members.length;
            }
        });

        const allSelected = tempSelectedMembers.length === totalEmployees && totalEmployees > 0;

        if (allSelected) {
            selectAllMembersBtn.innerHTML = '<i class="fas fa-times-circle"></i> 전체 해제';
        } else {
            selectAllMembersBtn.innerHTML = '<i class="fas fa-check-double"></i> 전체 선택';
        }
    }

    // 모달 닫기 (전역 함수)
    window.closeMemberModal = function() {
        if (!memberSelectModal) return;
        memberSelectModal.classList.remove('active');

        // 검색 초기화
        if (memberSearchInput) {
            memberSearchInput.value = '';
        }
    };

    // 팀원 검색
    if (memberSearchInput) {
        memberSearchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const nodes = memberOrgTree.querySelectorAll('.tree-node.member');

            nodes.forEach(node => {
                const memberData = JSON.parse(node.getAttribute('data-member'));
                const matches = memberData.name.toLowerCase().includes(searchTerm) ||
                               (memberData.department && memberData.department.toLowerCase().includes(searchTerm)) ||
                               (memberData.rank && memberData.rank.toLowerCase().includes(searchTerm));

                if (matches || searchTerm === '') {
                    node.style.display = '';
                } else {
                    node.style.display = 'none';
                }
            });
        });
    }

    // 전체 선택/해제 버튼
    if (selectAllMembersBtn) {
        selectAllMembersBtn.addEventListener('click', function() {
            let totalEmployees = 0;
            organizationData.departments.forEach(dept => {
                if (dept.members && dept.members.length > 0) {
                    totalEmployees += dept.members.length;
                }
            });

            const allSelected = tempSelectedMembers.length === totalEmployees && totalEmployees > 0;

            if (allSelected) {
                // 전체 해제
                tempSelectedMembers = [];
            } else {
                // 전체 선택
                tempSelectedMembers = [];
                organizationData.departments.forEach(dept => {
                    if (dept.members) {
                        dept.members.forEach(member => {
                            tempSelectedMembers.push({
                                id: member.id,
                                name: member.name,
                                department: member.department,
                                rank: member.rank
                            });
                        });
                    }
                });
            }

            updateOrgTreeCheckboxes();
            updateSelectedMembersList();
        });
    }

    // 전체 펼치기 버튼
    if (expandAllMembersBtn) {
        expandAllMembersBtn.addEventListener('click', function() {
            const deptNodes = memberOrgTree.querySelectorAll('.tree-node.department');
            const allExpanded = Array.from(deptNodes).every(node => node.classList.contains('expanded'));

            deptNodes.forEach(node => {
                if (allExpanded) {
                    node.classList.remove('expanded');
                    this.innerHTML = '<i class="fas fa-plus-square"></i> 전체 펼치기';
                } else {
                    node.classList.add('expanded');
                    this.innerHTML = '<i class="fas fa-minus-square"></i> 전체 접기';
                }
            });
        });
    }

    // 선택 해제 버튼
    if (clearSelectedMembersBtn) {
        clearSelectedMembersBtn.addEventListener('click', function() {
            tempSelectedMembers = [];
            updateOrgTreeCheckboxes();
            updateSelectedMembersList();
        });
    }

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

    // 선택 완료 (전역 함수)
    window.addSelectedMembers = function() {
        const projectStartDate = document.getElementById('startDate').value;
        const projectEndDate = document.getElementById('endDate').value;

        // 기존 선택 목록 초기화 (PI 제외)
        selectedMemberList = selectedMemberList.filter(m => m.role === 'PI');

        tempSelectedMembers.forEach(member => {
            // 중복 체크 (PI 제외)
            if (!selectedMemberList.some(m => m.id === member.id.toString())) {
                // 직급에 따라 자동으로 역할 할당
                const autoRole = getAutoRole(member.rank);

                selectedMemberList.push({
                    id: member.id.toString(),
                    name: member.name,
                    dept: member.department,
                    position: member.rank,
                    role: autoRole, // 직급에 따라 자동 할당된 역할
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
            // 팀원이 없을 때: empty-row 표시, 버튼 wrapper 숨김
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

        // 팀원이 있을 때: 목록 표시, tfoot 표시
        sortedMembers.forEach((member, index) => {
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

        // 버튼 wrapper 표시
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
            if (!newStartDate) return;

            // 모든 팀원의 참여 시작일을 프로젝트 시작일로 업데이트
            selectedMemberList.forEach(member => {
                member.startDate = newStartDate;
            });
            renderTeamTable();

            // 시작일의 년도의 마지막 영업일로 종료일 자동 설정
            const year = new Date(newStartDate).getFullYear();
            const lastBusinessDay = getLastBusinessDayOfYear(year);
            if (projectEndDateInput) {
                projectEndDateInput.value = lastBusinessDay;

                // 모든 팀원의 참여 종료일도 업데이트
                selectedMemberList.forEach(member => {
                    member.endDate = lastBusinessDay;
                });
                renderTeamTable();
            }
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

    /**
     * 해당 년도의 마지막 영업일 계산
     * 주말(토,일)과 공휴일을 제외한 12월의 마지막 근무일
     */
    function getLastBusinessDayOfYear(year) {
        // 한국 공휴일 (12월에 해당하는 것)
        const holidays = getKoreanHolidays(year);

        // 12월 31일부터 역순으로 검사
        let date = new Date(year, 11, 31); // 12월 31일

        while (date.getMonth() === 11) { // 12월인 동안
            const dayOfWeek = date.getDay();
            const dateString = formatDateToString(date);

            // 주말이 아니고 공휴일이 아니면 영업일
            const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6); // 일요일(0) 또는 토요일(6)
            const isHoliday = holidays.includes(dateString);

            if (!isWeekend && !isHoliday) {
                return dateString;
            }

            // 하루 전으로 이동
            date.setDate(date.getDate() - 1);
        }

        // 만약 12월에 영업일이 없으면 (거의 불가능) 12월 31일 반환
        return `${year}-12-31`;
    }

    /**
     * 한국 공휴일 목록 반환 (12월 관련)
     */
    function getKoreanHolidays(year) {
        const holidays = [];

        // 고정 공휴일
        holidays.push(`${year}-12-25`); // 크리스마스

        // 대체공휴일 처리: 크리스마스가 일요일이면 12/26이 대체공휴일
        const christmas = new Date(year, 11, 25);
        if (christmas.getDay() === 0) { // 일요일
            holidays.push(`${year}-12-26`);
        }

        return holidays;
    }

    /**
     * Date 객체를 YYYY-MM-DD 형식 문자열로 변환
     */
    function formatDateToString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // ============================================
    // 파일 관련 로직
    // ============================================

    // 파일 선택 이벤트
    if (projectFiles) {
        projectFiles.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                // 파일 크기 체크 (50MB)
                if (file.size > 50 * 1024 * 1024) {
                    alert(`파일 크기가 너무 큽니다: ${file.name} (최대 50MB)`);
                    return;
                }
                selectedFiles.push(file);
            });
            projectFiles.value = ''; // 입력 초기화
            renderFileList();
        });
    }

    // 드래그 앤 드롭 이벤트
    if (fileUploadArea) {
        fileUploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderColor = '#667eea';
            this.style.background = '#f0f4ff';
        });

        fileUploadArea.addEventListener('dragleave', function() {
            this.style.borderColor = '#cbd5e1';
            this.style.background = '#f8fafc';
        });

        fileUploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.borderColor = '#cbd5e1';
            this.style.background = '#f8fafc';

            const files = Array.from(e.dataTransfer.files);
            files.forEach(file => {
                if (file.size > 50 * 1024 * 1024) {
                    alert(`파일 크기가 너무 큽니다: ${file.name} (최대 50MB)`);
                    return;
                }
                selectedFiles.push(file);
            });
            renderFileList();
        });
    }

    // 파일 목록 렌더링
    function renderFileList() {
        if (!fileList) return;

        fileList.innerHTML = '';

        if (selectedFiles.length === 0) {
            fileList.innerHTML = '<p style="color: #999; font-size: 12px; padding: 10px 0;">첨부된 파일이 없습니다.</p>';
            return;
        }

        selectedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';

            // 파일 확장자에 따른 아이콘
            let icon = 'fa-file';
            if (file.name.match(/\.(jpg|jpeg|png|gif)$/i)) icon = 'fa-file-image';
            else if (file.name.match(/\.(pdf)$/i)) icon = 'fa-file-pdf';
            else if (file.name.match(/\.(doc|docx)$/i)) icon = 'fa-file-word';
            else if (file.name.match(/\.(xls|xlsx)$/i)) icon = 'fa-file-excel';

            item.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <button class="btn-remove-file" type="button" onclick="removeFile(${index})">
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
        selectedFiles.splice(index, 1);
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
                projectManagerIdx: projectManagerIdxInput.value,
                startDate: document.getElementById('startDate').value,
                endDate: document.getElementById('endDate').value,
                totalPeriodStart: document.getElementById('totalPeriodStart').value || null,
                totalPeriodEnd: document.getElementById('totalPeriodEnd').value || null,
                projectDescription: document.getElementById('projectDescription').value,
                receiptUrl: document.getElementById('receiptUrl').value,
                activityBudget: parseCurrencyValue(document.getElementById('activityBudget').value),
                equipmentBudget: parseCurrencyValue(document.getElementById('equipmentBudget').value),
                materialBudget: parseCurrencyValue(document.getElementById('materialBudget').value),
                teamMembers: selectedMemberList,
                cards: cardListData
            };

            console.log('프로젝트 데이터:', formData);

            // 직급별 경비 설정 데이터 수집 (새 구조: expenseItemName + amount)
            const expenseSettings = [];
            const expenseRows = document.querySelectorAll('#expenseSettingsBody tr[data-position]');

            // 경비 항목 정의
            const expenseItems = [
                { name: '출장비', nameEn: 'dailyAllowance' },
                { name: '중식비', nameEn: 'mealAllowance' },
                { name: '회의비', nameEn: 'meetingAllowance' },
                { name: '야근석식대', nameEn: 'overtimeMealAllowance' }
            ];

            expenseRows.forEach(row => {
                const positionCode = row.getAttribute('data-position-code');
                const inputs = row.querySelectorAll('.expense-input-sm');

                if (inputs.length >= 4) {
                    // 각 경비 항목을 별도의 레코드로 저장
                    expenseItems.forEach((item, index) => {
                        const amount = parseCurrencyValue(inputs[index].value);
                        expenseSettings.push({
                            positionCode: positionCode || null,
                            expenseItemName: item.name,
                            expenseItemNameEn: item.nameEn,
                            amount: amount
                        });
                    });
                }
            });

            // 백엔드 API 연동
            const createData = {
                projectName: formData.projectName,
                clientName: formData.clientName,
                projectStatus: formData.projectStatus,
                projectManagerIdx: parseInt(formData.projectManagerIdx),
                startDate: formData.startDate,
                endDate: formData.endDate,
                totalPeriodStart: formData.totalPeriodStart,
                totalPeriodEnd: formData.totalPeriodEnd,
                description: formData.projectDescription,
                receiptUrl: formData.receiptUrl,
                activityBudget: formData.activityBudget,
                equipmentBudget: formData.equipmentBudget,
                materialBudget: formData.materialBudget,

                // 연구비 카드 데이터 추가 (DTO 구조에 맞게 변환)
                projectCards: cardListData.map(card => ({
                    cardCompany: card.company,
                    cardLastDigits: card.number,
                    cardNickname: card.name
                })),

                // 팀원 데이터 추가 (DTO 구조에 맞게 변환)
                projectMembers: selectedMemberList.map(member => ({
                    employeeIdx: parseInt(member.idx || member.id),
                    participationStartDate: member.startDate,
                    participationEndDate: member.endDate,
                    role: member.role || null
                })),

                // 연계 프로젝트 데이터 추가 (각 프로젝트의 개별 타입/설명 사용)
                projectRelations: relatedProjectList.map(project => ({
                    targetProjectIdx: parseInt(project.id),
                    relationType: project.relationType,
                    description: project.description || null
                })),

                // 직급별 경비 설정 데이터 추가
                expenseSettings: expenseSettings

            };

            // 프로젝트 생성 및 파일 업로드
            createProjectWithFiles(createData);
        });
    }

    /**
     * 프로젝트 생성 및 파일 업로드
     */
    async function createProjectWithFiles(createData) {
        try {
            // 1. 프로젝트 생성
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(createData)
            });

            if (!response.ok) {
                throw new Error('프로젝트 등록에 실패했습니다.');
            }

            const project = await response.json();
            const projectIdx = project.idx;
            console.log('프로젝트 생성 완료:', projectIdx);

            // 2. 첨부파일 업로드
            if (selectedFiles.length > 0) {
                console.log(`${selectedFiles.length}개 파일 업로드 시작...`);

                // 현재 사용자 IDX (임시로 1 사용, 실제로는 로그인 사용자 정보 사용)
                const uploadUserIdx = 1;

                for (const file of selectedFiles) {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('projectIdx', projectIdx);
                    formData.append('uploadUserIdx', uploadUserIdx);

                    try {
                        const uploadResponse = await fetch('/api/project-files/upload', {
                            method: 'POST',
                            body: formData
                        });

                        if (!uploadResponse.ok) {
                            console.error(`파일 업로드 실패 (${file.name})`);
                        } else {
                            console.log(`파일 업로드 성공: ${file.name}`);
                        }
                    } catch (uploadError) {
                        console.error(`파일 업로드 오류 (${file.name}):`, uploadError);
                    }
                }
            }

            alert('프로젝트가 등록되었습니다.');
            window.location.href = '/project';

        } catch (error) {
            console.error('Error creating project:', error);
            alert('프로젝트 등록 중 오류가 발생했습니다.');
        }
    }

    // 폼 유효성 검사
    function validateForm() {
        const projectName = document.getElementById('projectName').value.trim();
        const projectStatus = document.getElementById('projectStatus').value;
        const projectManagerIdx = projectManagerIdxInput.value;
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

        if (!projectManagerIdx) {
            alert('연구책임자를 선택해주세요.');
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

    // 연계 정보 입력 모달 표시 (전역 함수)
    window.showRelationDetailsModal = function() {
        const checkboxes = document.querySelectorAll('.related-project-checkbox:checked');

        if (checkboxes.length === 0) {
            alert('연계할 프로젝트를 선택해주세요.');
            return;
        }

        // 선택된 프로젝트 정보 수집 (이미 등록된 프로젝트는 제외)
        const selectedProjects = [];
        checkboxes.forEach(checkbox => {
            const projectId = checkbox.value;

            // 이미 등록된 프로젝트인지 확인
            const alreadyAdded = relatedProjectList.some(p => p.id === projectId);
            if (alreadyAdded) return; // 이미 등록된 프로젝트는 건너뜀

            const row = checkbox.closest('tr');
            selectedProjects.push({
                id: projectId,
                name: row.getAttribute('data-name'),
                status: row.getAttribute('data-status'),
                pm: row.getAttribute('data-pm'),
                period: row.getAttribute('data-period')
            });
        });

        // 새로 추가할 프로젝트가 없으면 알림
        if (selectedProjects.length === 0) {
            alert('새로 추가할 프로젝트가 없습니다. 선택한 프로젝트는 이미 등록되어 있습니다.');
            return;
        }

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
        const wasEmpty = relatedProjectList.length === 0;
        relatedProjectList.push(...newRelations);
        renderRelatedProjectList();

        // 첫 번째 연계 프로젝트가 추가된 경우, 해당 프로젝트 정보를 폼에 자동 입력
        if (wasEmpty && newRelations.length > 0) {
            loadProjectInfoToForm(newRelations[0].id);
        }

        // 모달 닫기
        closeRelationDetailsModal();
        closeRelatedProjectModal();
    };

    // n차 패턴을 찾아 n+1차로 변환하거나, 없으면 2차 추가
    function generateNextProjectName(projectName) {
        // n차 패턴 확인 (예: "1차", "2차", "10차" 등)
        const pattern = /(\d+)차/;
        const match = projectName.match(pattern);

        if (match) {
            // n차가 있으면 n+1차로 변환
            const currentNum = parseInt(match[1], 10);
            const nextNum = currentNum + 1;
            return projectName.replace(pattern, nextNum + '차');
        } else {
            // n차가 없으면 뒤에 2차 추가
            return projectName + ' 2차';
        }
    }

    // 연계 프로젝트 정보를 폼에 자동 입력
    function loadProjectInfoToForm(projectId) {
        // 프로젝트 상세 정보와 연구비 카드를 병렬로 조회
        Promise.all([
            fetch(`/api/projects/${projectId}`).then(res => res.ok ? res.json() : Promise.reject('프로젝트 조회 실패')),
            fetch(`/api/projects/${projectId}/cards`).then(res => res.ok ? res.json() : [])
        ])
        .then(([project, cards]) => {
            console.log('연계 프로젝트 데이터:', project);
            console.log('연구비 카드 데이터:', cards);

            // === 가져오는 필드들 (연계프로젝트, 상태, 현재차수 시작일/종료일 제외) ===

            // 1. 프로젝트명 설정 (n차 → n+1차, 없으면 2차 추가)
            const projectNameInput = document.getElementById('projectName');
            if (projectNameInput && !projectNameInput.value) {
                projectNameInput.value = generateNextProjectName(project.projectName);
            }

            // 2. 발주사 설정
            const clientNameInput = document.getElementById('clientName');
            if (clientNameInput && !clientNameInput.value) {
                clientNameInput.value = project.clientName || '';
            }

            // 3. 총 프로젝트 시작일 설정
            const totalPeriodStartInput = document.getElementById('totalPeriodStart');
            if (totalPeriodStartInput && !totalPeriodStartInput.value) {
                totalPeriodStartInput.value = project.totalPeriodStart || project.startDate || '';
            }

            // 4. 총 프로젝트 종료일 설정
            const totalPeriodEndInput = document.getElementById('totalPeriodEnd');
            if (totalPeriodEndInput && !totalPeriodEndInput.value) {
                totalPeriodEndInput.value = project.totalPeriodEnd || project.endDate || '';
            }

            // 5. 프로젝트 설명 설정
            const projectDescriptionInput = document.getElementById('projectDescription');
            if (projectDescriptionInput && !projectDescriptionInput.value) {
                projectDescriptionInput.value = project.description || '';
            }

            // 6. 영수증 등록 페이지 URL 설정
            const receiptUrlInput = document.getElementById('receiptUrl');
            if (receiptUrlInput && !receiptUrlInput.value) {
                receiptUrlInput.value = project.receiptUrl || '';
            }

            // 7. 활동비 예산 설정
            const activityBudgetInput = document.getElementById('activityBudget');
            if (activityBudgetInput && (!activityBudgetInput.value || activityBudgetInput.value === '0')) {
                activityBudgetInput.value = formatCurrencyValue(project.activityBudget || 0);
            }

            // 8. 장비비 예산 설정
            const equipmentBudgetInput = document.getElementById('equipmentBudget');
            if (equipmentBudgetInput && (!equipmentBudgetInput.value || equipmentBudgetInput.value === '0')) {
                equipmentBudgetInput.value = formatCurrencyValue(project.equipmentBudget || 0);
            }

            // 9. 재료비 예산 설정
            const materialBudgetInput = document.getElementById('materialBudget');
            if (materialBudgetInput && (!materialBudgetInput.value || materialBudgetInput.value === '0')) {
                materialBudgetInput.value = formatCurrencyValue(project.materialBudget || 0);
            }

            // 10. 연구책임자 설정
            if (project.projectManagerIdx && project.projectManagerName) {
                // allManagers 목록에서 해당 연구책임자 찾기
                const manager = allManagers.find(m => m.idx === project.projectManagerIdx);
                if (manager) {
                    selectedManager = manager;
                    if (projectManagerInput && !projectManagerInput.value) {
                        projectManagerInput.value = `${manager.empName} (${manager.empDeptName || '-'} / ${manager.empPositionName || '-'})`;
                    }
                    if (projectManagerIdxInput && !projectManagerIdxInput.value) {
                        projectManagerIdxInput.value = manager.idx;
                    }

                    // 팀원에 자동 추가
                    addManagerToTeam(manager);
                }
            }

            // 11. 연구비 카드 설정 (별도 API에서 조회)
            if (cards && cards.length > 0 && cardListData.length === 0) {
                cards.forEach(card => {
                    cardIdCounter++;
                    cardListData.push({
                        id: cardIdCounter,
                        company: card.cardCompany,
                        number: card.cardLastDigits,
                        name: card.cardNickname || ''
                    });
                });
                renderCardList();
            }

            // 12. 참여연구원 설정 (PI 제외, 기존 팀원이 없을 때만)
            if (project.projectMembers && project.projectMembers.length > 0 && selectedMemberList.filter(m => m.role !== 'PI').length === 0) {
                loadTeamMembersFromProject(project.projectMembers);
            }

            // 13. 직급별 경비 설정
            if (project.projectExpenseSettings && project.projectExpenseSettings.length > 0) {
                loadExpenseSettingsFromProject(project.projectExpenseSettings);
            }

            console.log('연계 프로젝트 정보를 폼에 자동 입력했습니다:', project);
        })
        .catch(error => {
            console.error('Error loading project info:', error);
            // 에러가 발생해도 사용자 작업을 방해하지 않음
        });
    }

    // 프로젝트 참여연구원을 팀원 목록에 추가
    function loadTeamMembersFromProject(projectMembers) {
        const projectStartDate = document.getElementById('startDate').value;
        const projectEndDate = document.getElementById('endDate').value;

        projectMembers.forEach(member => {
            // PI는 이미 연구책임자로 추가되어 있으므로 제외
            if (member.role === 'PI') return;

            // 중복 체크
            const exists = selectedMemberList.some(m =>
                parseInt(m.idx || m.id) === member.employeeIdx
            );

            if (!exists) {
                selectedMemberList.push({
                    id: member.employeeIdx.toString(),
                    idx: member.employeeIdx,
                    name: member.employeeName || '',
                    dept: member.employeeDeptName || '-',
                    position: member.employeePositionName || '-',
                    role: member.role || 'RESEARCHER',
                    startDate: projectStartDate || member.participationStartDate || '',
                    endDate: projectEndDate || member.participationEndDate || ''
                });
            }
        });

        renderTeamTable();
    }

    // 프로젝트 경비 설정을 폼에 적용
    function loadExpenseSettingsFromProject(expenseSettings) {
        // 경비 항목명 매핑
        const expenseItemIndexMap = {
            '출장비': 0,
            '중식비': 1,
            '회의비': 2,
            '야근석식대': 3
        };

        // 직급별 데이터 그룹화
        const groupedByPosition = {};

        expenseSettings.forEach(setting => {
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
            }
        });

        // 각 직급 행에 데이터 설정
        Object.keys(groupedByPosition).forEach(positionCode => {
            const row = document.querySelector(`tr[data-position-code="${positionCode}"]`);

            if (row) {
                const data = groupedByPosition[positionCode];
                const inputs = row.querySelectorAll('.expense-input-sm');

                if (inputs.length >= 4) {
                    inputs[0].value = formatCurrencyValue(data.amounts[0]); // 출장비
                    inputs[1].value = formatCurrencyValue(data.amounts[1]); // 중식비
                    inputs[2].value = formatCurrencyValue(data.amounts[2]); // 회의비
                    inputs[3].value = formatCurrencyValue(data.amounts[3]); // 야근석식대
                }
            }
        });
    }

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
            item.innerHTML = `
                <div class="related-project-info form-grid">
                    <div class="related-project-name">
                        <i class="fas fa-link"></i>
                        ${project.name}
                    </div>
                    <div class="related-project-details">
                        <span><i class="fas fa-circle"></i> ${project.status}</span>
                        <span><i class="fas fa-user"></i> 연구 책임자: ${project.pm}</span>
                        <span><i class="fas fa-calendar"></i> ${project.period}</span>
                         <span><i class="fas fa-link"></i>연계 타입: ${project.relationType || '-'}</span>
                        <span><i class="fas fa-comment-alt"></i>설명: ${project.description || '-'}</span>
                    </div>
                </div>

                <button type="button" onclick="removeRelatedProject('${project.id}')" style="align-self: flex-start;">
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

        // 필드 초기화 후 남은 프로젝트 데이터 로드
        clearRelatedProjectFields();

        // 남은 연계 프로젝트가 있으면 첫 번째 프로젝트 데이터 로드
        if (relatedProjectList.length > 0) {
            loadProjectInfoToForm(relatedProjectList[0].id);
        }
    };

    // 연계 프로젝트 관련 필드 초기화
    function clearRelatedProjectFields() {
        // 1. 프로젝트명 초기화
        const projectNameInput = document.getElementById('projectName');
        if (projectNameInput) {
            projectNameInput.value = '';
        }

        // 2. 발주사 초기화
        const clientNameInput = document.getElementById('clientName');
        if (clientNameInput) {
            clientNameInput.value = '';
        }

        // 3. 총 프로젝트 시작일 초기화
        const totalPeriodStartInput = document.getElementById('totalPeriodStart');
        if (totalPeriodStartInput) {
            totalPeriodStartInput.value = '';
        }

        // 4. 총 프로젝트 종료일 초기화
        const totalPeriodEndInput = document.getElementById('totalPeriodEnd');
        if (totalPeriodEndInput) {
            totalPeriodEndInput.value = '';
        }

        // 5. 프로젝트 설명 초기화
        const projectDescriptionInput = document.getElementById('projectDescription');
        if (projectDescriptionInput) {
            projectDescriptionInput.value = '';
        }

        // 6. 영수증 등록 페이지 URL 초기화
        const receiptUrlInput = document.getElementById('receiptUrl');
        if (receiptUrlInput) {
            receiptUrlInput.value = '';
        }

        // 7. 활동비 예산 초기화
        const activityBudgetInput = document.getElementById('activityBudget');
        if (activityBudgetInput) {
            activityBudgetInput.value = '0';
        }

        // 8. 장비비 예산 초기화
        const equipmentBudgetInput = document.getElementById('equipmentBudget');
        if (equipmentBudgetInput) {
            equipmentBudgetInput.value = '0';
        }

        // 9. 재료비 예산 초기화
        const materialBudgetInput = document.getElementById('materialBudget');
        if (materialBudgetInput) {
            materialBudgetInput.value = '0';
        }

        // 10. 연구책임자 초기화
        if (projectManagerInput) {
            projectManagerInput.value = '';
        }
        if (projectManagerIdxInput) {
            projectManagerIdxInput.value = '';
        }

        // 선택된 연구책임자 초기화
        selectedManager = null;

        // 11. 전체 팀원 초기화 (PI 포함)
        selectedMemberList = [];
        renderTeamTable();

        // 12. 연구비 카드 초기화
        cardListData = [];
        cardIdCounter = 0;
        renderCardList();

        // 13. 직급별 경비 설정 초기화
        resetExpenseSettingsToZero();
    }

    // 직급별 경비 설정을 0으로 초기화
    function resetExpenseSettingsToZero() {
        const expenseRows = document.querySelectorAll('#expenseSettingsBody tr[data-position]');
        expenseRows.forEach(row => {
            const inputs = row.querySelectorAll('.expense-input-sm');
            inputs.forEach(input => {
                input.value = '0';
            });
        });
    }

    // 연계 프로젝트 타입 업데이트 (전역 함수)
    window.updateRelatedProjectType = function(projectId, value) {
        const project = relatedProjectList.find(p => p.id === projectId);
        if (project) {
            project.relationType = value;
        }
    };

    // 연계 프로젝트 설명 업데이트 (전역 함수)
    window.updateRelatedProjectDescription = function(projectId, value) {
        const project = relatedProjectList.find(p => p.id === projectId);
        if (project) {
            project.description = value;
        }
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
                    console.log("policies 원본 데이터:");
                    console.log(policies);

                    // 경비 항목명 매핑 (기초정보관리 → 프로젝트 생성)
                    const expenseItemIndexMap = {
                        '출장비': 0,
                        '중식비': 1,
                        '회의비': 2,
                        '야근석식대': 3
                    };

                    // 직급별 데이터 그룹화
                    const groupedByPosition = {};

                    policies.forEach(policy => {
                        const positionCode = policy.positionCode;

                        if (!groupedByPosition[positionCode]) {
                            groupedByPosition[positionCode] = {
                                positionCode: policy.positionCode,
                                amounts: [0, 0, 0, 0] // [출장비, 중식비, 회의비, 야근석식대]
                            };
                        }

                        const itemIndex = expenseItemIndexMap[policy.expenseItemName];
                        if (itemIndex !== undefined) {
                            groupedByPosition[positionCode].amounts[itemIndex] = policy.amount || 0;
                        }
                    });

                    // 각 직급 행에 데이터 설정
                    Object.keys(groupedByPosition).forEach(positionCode => {
                        const row = document.querySelector(`tr[data-position-code="${positionCode}"]`);

                        if (row) {
                            const data = groupedByPosition[positionCode];
                            const inputs = row.querySelectorAll('.expense-input-sm');

                            if (inputs.length >= 4) {
                                inputs[0].value = formatCurrencyValue(data.amounts[0]); // 출장비
                                inputs[1].value = formatCurrencyValue(data.amounts[1]); // 중식비
                                inputs[2].value = formatCurrencyValue(data.amounts[2]); // 회의비
                                inputs[3].value = formatCurrencyValue(data.amounts[3]); // 야근석식대
                            }

                            // 직급 코드도 data 속성에 저장
                            row.setAttribute('data-position-code', data.positionCode);
                        }
                    });

                    alert('기초정보관리의 설정값을 불러왔습니다.');
                })
                .catch(error => {
                    console.error('고정경비 정책 조회 실패:', error);
                    alert('설정값을 불러오는데 실패했습니다.');
                });
        });
    }

    // 연구책임자 선택 모달 배경 클릭 시 닫기
    if (managerSelectModal) {
        managerSelectModal.addEventListener('click', function(e) {
            if (e.target === managerSelectModal) {
                closeManagerModal();
            }
        });
    }

    // ===========================
    // 금액 포맷팅 기능
    // ===========================

    /**
     * 입력 필드에서 금액을 파싱하여 숫자로 변환
     */
    function parseCurrencyValue(value) {
        if (!value) return 0;
        // 콤마 제거 후 숫자로 변환
        return parseInt(value.replace(/,/g, ''), 10) || 0;
    }

    /**
     * 숫자를 천단위 콤마 형식으로 포맷팅
     */
    function formatCurrencyValue(value) {
        const num = parseCurrencyValue(value.toString());
        return num.toLocaleString('ko-KR');
    }

    /**
     * 모든 금액 입력 필드에 포맷팅 적용
     */
    function applyCurrencyFormatting() {
        // 예산 입력 필드
        const currencyInputs = document.querySelectorAll('.currency-input');
        currencyInputs.forEach(input => {
            applyCurrencyInput(input);
        });

        // 직급별 경비 입력 필드
        const currencyInputsSm = document.querySelectorAll('.currency-input-sm');
        currencyInputsSm.forEach(input => {
            applyCurrencyInput(input);
        });
    }

    /**
     * 개별 입력 필드에 금액 포맷팅 이벤트 적용
     */
    function applyCurrencyInput(input) {
        // 초기값 포맷팅
        if (input.value) {
            input.value = formatCurrencyValue(input.value);
        }

        // 입력 중 실시간 포맷팅
        input.addEventListener('input', function(e) {
            const cursorPosition = this.selectionStart;
            const oldValue = this.value;
            const oldLength = oldValue.length;

            // 숫자만 추출
            const numericValue = this.value.replace(/\D/g, '');

            // 빈 값 처리
            if (numericValue === '') {
                this.value = '';
                return;
            }

            // 포맷팅 적용
            const formattedValue = parseInt(numericValue, 10).toLocaleString('ko-KR');
            this.value = formattedValue;

            // 커서 위치 계산 (콤마 개수 차이 고려)
            const newLength = formattedValue.length;
            const commasBefore = (oldValue.substring(0, cursorPosition).match(/,/g) || []).length;
            const commasAfter = (formattedValue.substring(0, cursorPosition).match(/,/g) || []).length;
            const newCursorPosition = cursorPosition + (commasAfter - commasBefore) + (newLength - oldLength);

            // 커서 위치 복원
            this.setSelectionRange(newCursorPosition, newCursorPosition);
        });

        // 블러 시: 빈 값이면 0으로 설정
        input.addEventListener('blur', function() {
            if (this.value === '') {
                this.value = '0';
            }
        });

        // 포커스 시: 0이면 빈 값으로
        input.addEventListener('focus', function() {
            if (this.value === '0') {
                this.value = '';
            }
        });

        // 키 입력 시: 숫자만 허용
        input.addEventListener('keypress', function(e) {
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
            }
        });

        // 붙여넣기 시: 숫자만 허용하고 실시간 포맷팅
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const numericValue = pastedText.replace(/\D/g, '');
            if (numericValue) {
                const cursorPosition = this.selectionStart;
                const currentValue = this.value.replace(/\D/g, '');
                const newValue = currentValue.substring(0, this.selectionStart) + numericValue + currentValue.substring(this.selectionEnd);

                // input 이벤트를 트리거하여 포맷팅 적용
                this.value = newValue;
                this.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    }

    // 페이지 로드 시 금액 포맷팅 적용
    applyCurrencyFormatting();
});
