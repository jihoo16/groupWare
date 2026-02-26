document.addEventListener('DOMContentLoaded', function() {
    // 페이지 로드 시 프로젝트 ID 가져오기
    const pathParts = window.location.pathname.split('/');
    const projectId = pathParts[pathParts.length - 1];

    // 폼 요소
    const projectEditForm = document.getElementById('projectEditForm');
    const addMemberBtn = document.getElementById('addMemberBtn');
    const memberSelectModal = document.getElementById('memberSelectModal');
    const memberSearchInput = document.getElementById('memberSearchInput');
    const memberOrgTree = document.getElementById('memberOrgTree');
    const selectedMemberCount = document.getElementById('selectedMemberCount');
    const selectedMembersList = document.getElementById('selectedMembersList');
    const selectAllMembersBtn = document.getElementById('selectAllMembersBtn');
    const expandAllMembersBtn = document.getElementById('expandAllMembersBtn');
    const clearSelectedMembersBtn = document.getElementById('clearSelectedMembersBtn');
    const teamTableBody = document.getElementById('teamTableBody');
    const cardList = document.getElementById('cardList');
    const projectFiles = document.getElementById('projectFiles');
    const fileList = document.getElementById('fileList');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const addRelatedProjectBtn = document.getElementById('addRelatedProjectBtn');
    const relatedProjectModal = document.getElementById('relatedProjectModal');
    const relatedProjectSearchInput = document.getElementById('relatedProjectSearchInput');
    const relatedProjectListElement = document.getElementById('relatedProjectList');

    // 선택된 팀원 목록
    let selectedMemberList = [];
    let memberIdCounter = 0;
    let tempSelectedMembers = []; // 모달 내 임시 선택 목록
    let organizationData = { departments: [] }; // 조직도 데이터

    // 카드 목록
    let cardListData = [];
    let cardIdCounter = 0;

    // 연계 프로젝트 목록
    let relatedProjectList = [];

    // 파일 관련 변수
    let existingFiles = [];      // 서버에서 로드한 기존 파일 목록
    let selectedFiles = [];      // 새로 추가할 파일 목록
    let deletedFileIds = [];     // 삭제 예정인 파일 ID 목록

    // 연구 책임자 드롭다운 요소
    const projectManagerSelect = document.getElementById('projectManager');

    // 직급 목록 저장 변수
    let positionList = [];

    // 페이지 로드 시 수정 권한 확인 후 데이터 로드
    checkEditPermission(projectId).then(hasPermission => {
        if (!hasPermission) return;

        Promise.all([
            loadPositions(),
            projectManagerSelect ? loadProjectManagers() : Promise.resolve()
        ]).then(() => {
            // 모든 기본 데이터 로드 완료 후 프로젝트 데이터 로드
            window.showPageLoadingOverlay();
            loadProjectData(projectId);
        }).catch(async error => {
            console.error('초기 데이터 로드 실패:', error);
            await showError('페이지 로드 중 오류가 발생했습니다.');
        });
    });

    // 수정 권한 확인 함수
    async function checkEditPermission(projectId) {
        const currentUserIdx = window.CURRENT_USER?.idx || null;
        const isAdmin = window.CURRENT_USER?.isAdmin || false;

        if (isAdmin) return true;

        if (!currentUserIdx) {
            await showError('로그인이 필요합니다.');
            location.href = '/login';
            return false;
        }

        try {
            const response = await fetch(`/api/projects/${projectId}/members`);
            if (!response.ok) throw new Error('멤버 조회 실패');

            const members = await response.json();
            const currentMember = members.find(m =>
                m.employeeIdx === currentUserIdx || m.empIdx === currentUserIdx
            );

            if (!currentMember || (currentMember.role !== 'PI' && currentMember.role !== 'PRACTITIONER')) {
                await showError('프로젝트 수정 권한이 없습니다.\n연구책임자 또는 실무자만 수정할 수 있습니다.');
                location.href = `/project/detail?projectId=${projectId}`;
                return false;
            }

            return true;
        } catch (error) {
            console.error('권한 확인 오류:', error);
            await showError('권한 확인 중 오류가 발생했습니다.');
            location.href = '/project';
            return false;
        }
    }

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

        // 실시간 금액 포맷팅 적용
        applyCurrencyFormatting();

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
    async function loadProjectData(id) {
        try {
            const project = await window.fetchWithErrorHandling(`/api/projects/${id}`);

            if (!project) {
                // Error already handled by fetchWithErrorHandling (404, 403, 500)
                return;
            }
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
                document.getElementById('totalPeriodStart').value = project.totalPeriodStart || '';
                document.getElementById('totalPeriodEnd').value = project.totalPeriodEnd || '';
                document.getElementById('receiptUrl').value = project.receiptUrl || '';
                document.getElementById('projectDescription').value = project.description || '';
                document.getElementById('activityBudget').value = formatCurrencyValue(project.activityBudget || 0);
                document.getElementById('equipmentBudget').value = formatCurrencyValue(project.equipmentBudget || 0);
                document.getElementById('materialBudget').value = formatCurrencyValue(project.materialBudget || 0);

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
                        totalStart: relation.targetTotalPeriodStart || '',
                        totalEnd: relation.targetTotalPeriodEnd || ''
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

                // 프로젝트 파일 목록 로드
                loadProjectFiles(project.idx);

                // 로딩 오버레이 숨김
                window.hidePageLoadingOverlay();
        } catch (error) {
            console.error('Error loading project data:', error);
            await showError('프로젝트 정보를 불러올 수 없습니다.');
            window.hidePageLoadingOverlay();
            location.href = '/project';
        }
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
                } else {
                }

                // 직급 코드도 data 속성에 저장 (나중에 전송 시 사용)
                row.setAttribute('data-position-code', data.positionCode);
            } else {
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
                const currentPiIdx = projectManagerSelect ? parseInt(projectManagerSelect.value) : null;

                users.forEach(user => {
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
            .catch(async error => {
                console.error('Error loading members:', error);
                await showError('인력 목록을 불러올 수 없습니다.');
            });
    }

    // 직급 순서 반환 함수 (정렬용)
    function getPositionOrder(positionName) {
        if (!positionName) return 999;
        switch (positionName) {
            case '대표': case '대표이사': return 1;
            case '상무': case '상무이사': return 2;
            case '이사': return 3;
            case '부장': return 4;
            case '차장': return 5;
            case '과장': return 6;
            case '대리': return 7;
            case '사원': return 8;
            default: return 999;
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

        // 부서 인원수 뱃지 클릭 시 해당 부서 전체 선택/해제
        const treeCount = node.querySelector('.tree-count');
        if (treeCount && dept.members && dept.members.length > 0) {
            treeCount.style.cursor = 'pointer';
            treeCount.addEventListener('click', function(e) {
                e.stopPropagation();
                const allSelected = dept.members.every(member =>
                    tempSelectedMembers.some(emp => emp.id === member.id)
                );
                if (allSelected) {
                    dept.members.forEach(member => {
                        tempSelectedMembers = tempSelectedMembers.filter(emp => emp.id !== member.id);
                    });
                } else {
                    dept.members.forEach(member => {
                        if (!tempSelectedMembers.some(emp => emp.id === member.id)) {
                            tempSelectedMembers.push({ id: member.id, name: member.name, department: member.department, rank: member.rank });
                        }
                    });
                }
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
                    tempSelectedMembers.push({ id: memberData.id, name: memberData.name, department: memberData.department, rank: memberData.rank });
                }
            } else {
                tempSelectedMembers = tempSelectedMembers.filter(emp => emp.id !== memberData.id);
            }
            updateSelectedMembersList();
            updateSelectAllButtonState();
        });

        header.addEventListener('click', function(e) {
            if (e.target === checkbox) return;
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
            if (e.target.classList.contains('employee-checkbox')) return;
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
        if (!memberOrgTree) return;
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
            if (dept.members) totalEmployees += dept.members.length;
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
        if (memberSearchInput) memberSearchInput.value = '';
    };

    // 팀원 검색 (자동 펼치기 포함)
    if (memberSearchInput) {
        memberSearchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const memberNodes = memberOrgTree.querySelectorAll('.tree-node.member');
            const deptNodes = memberOrgTree.querySelectorAll('.tree-node.department');

            if (searchTerm === '') {
                memberNodes.forEach(node => { node.style.display = ''; });
                deptNodes.forEach((node, index) => {
                    if (index === 0) node.classList.add('expanded');
                    else node.classList.remove('expanded');
                });
                return;
            }

            const deptNodesToExpand = new Set();
            memberNodes.forEach(node => {
                const memberData = JSON.parse(node.getAttribute('data-member'));
                const matches = memberData.name.toLowerCase().includes(searchTerm) ||
                               (memberData.department && memberData.department.toLowerCase().includes(searchTerm)) ||
                               (memberData.rank && memberData.rank.toLowerCase().includes(searchTerm));
                node.style.display = matches ? '' : 'none';
                if (matches) {
                    const parentDept = node.closest('.tree-node.department');
                    if (parentDept) deptNodesToExpand.add(parentDept);
                }
            });

            deptNodes.forEach(deptNode => {
                if (deptNodesToExpand.has(deptNode)) deptNode.classList.add('expanded');
                else deptNode.classList.remove('expanded');
            });
        });
    }

    // 전체 선택/해제 버튼
    if (selectAllMembersBtn) {
        selectAllMembersBtn.addEventListener('click', function() {
            let totalEmployees = 0;
            organizationData.departments.forEach(dept => {
                if (dept.members) totalEmployees += dept.members.length;
            });
            const allSelected = tempSelectedMembers.length === totalEmployees && totalEmployees > 0;
            if (allSelected) {
                tempSelectedMembers = [];
            } else {
                tempSelectedMembers = [];
                organizationData.departments.forEach(dept => {
                    if (dept.members) {
                        dept.members.forEach(member => {
                            tempSelectedMembers.push({ id: member.id, name: member.name, department: member.department, rank: member.rank });
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

    // 전체 해제 버튼
    if (clearSelectedMembersBtn) {
        clearSelectedMembersBtn.addEventListener('click', function() {
            tempSelectedMembers = [];
            updateOrgTreeCheckboxes();
            updateSelectedMembersList();
        });
    }

    // 선택 완료 (전역 함수)
    window.addSelectedMembers = function() {
        const projectStartDate = document.getElementById('startDate').value;
        const projectEndDate = document.getElementById('endDate').value;

        // 선택된 팀원 ID 목록
        const selectedMemberIds = new Set(tempSelectedMembers.map(m => m.id.toString()));

        // 1. 선택 해제된 팀원 제거 (PI는 유지)
        selectedMemberList = selectedMemberList.filter(member => {
            if (member.role === 'PI') return true;
            return selectedMemberIds.has(member.id) || selectedMemberIds.has(String(member.idx));
        });

        // 2. 새로운 팀원만 추가
        tempSelectedMembers.forEach(member => {
            const existingMember = selectedMemberList.find(m =>
                m.id === member.id.toString() || (m.idx && m.idx === member.id)
            );
            if (!existingMember) {
                selectedMemberList.push({
                    id: member.id.toString(),
                    name: member.name,
                    dept: member.department,
                    position: member.rank,
                    role: getAutoRole(member.rank),
                    startDate: projectStartDate || '',
                    endDate: projectEndDate || ''
                });
            }
        });

        renderTeamTable();
        closeMemberModal();
    };

    // 프로젝트 역할 옵션 (PI 제외 - 연구책임자는 별도 선택)
    const PROJECT_ROLES = [
        { value: 'PRACTITIONER', label: '실무자' },
        { value: 'RESEARCHER', label: '연구원' }
    ];

    // 역할 자동 할당 함수 - 기본 연구원
    function getAutoRole(positionName) {
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
            const countEl = document.getElementById('teamMemberCount');
            if (countEl) { countEl.textContent = ''; countEl.style.display = 'none'; }
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

            // PI(연구책임자)는 역할 변경 불가
            let roleCell;
            if (member.role === 'PI') {
                roleCell = `<span style="font-weight: 600; color: #4361ee;">연구책임자</span>`;
            } else {
                const roleOptions = PROJECT_ROLES.map(role =>
                    `<option value="${role.value}" ${(member.role || '') === role.value ? 'selected' : ''}>${role.label}</option>`
                ).join('');
                roleCell = `<select class="form-control" onchange="updateMemberRole('${member.id}', this.value)" style="width: 100%; padding: 4px;">${roleOptions}</select>`;
            }

            // PI는 삭제 불가
            const deleteCell = member.role === 'PI'
                ? ''
                : `<button type="button" class="btn-delete" onclick="removeMember('${member.id}')"><i class="fas fa-trash"></i></button>`;

            row.innerHTML = `
                <td class="text-center">${index + 1}</td>
                <td>${member.name}</td>
                <td>${member.dept}</td>
                <td>${member.position}</td>
                <td>${roleCell}</td>
                <td>
                    <div class="date-input-wrapper" onclick="document.getElementById('startDate_${member.id}').showPicker()">
                        <input type="date" id="startDate_${member.id}" value="${member.startDate}"
                               onchange="updateMemberDate('${member.id}', 'startDate', this.value)">
                        <i class="fas fa-calendar-alt date-icon"></i>
                    </div>
                </td>
                <td>
                    <div class="date-input-wrapper" onclick="document.getElementById('endDate_${member.id}').showPicker()">
                        <input type="date" id="endDate_${member.id}" value="${member.endDate}"
                               onchange="updateMemberDate('${member.id}', 'endDate', this.value)">
                        <i class="fas fa-calendar-alt date-icon"></i>
                    </div>
                </td>
                <td class="text-center">${deleteCell}</td>
            `;
            teamTableBody.appendChild(row);
        });

        // 버튼 래퍼 표시
        if (teamAddButtonWrapper) {
            teamAddButtonWrapper.style.display = '';
        }

        // 총인원 표시
        const countEl = document.getElementById('teamMemberCount');
        if (countEl) { countEl.textContent = selectedMemberList.length + '명'; countEl.style.display = ''; }
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
        if (!member) return;

        // 실무자는 1명만 허용 - 기존 실무자를 연구원으로 변경
        if (value === 'PRACTITIONER') {
            selectedMemberList.forEach(m => {
                if (m.id !== memberId && m.role === 'PRACTITIONER') {
                    m.role = 'RESEARCHER';
                }
            });
        }

        member.role = value;
        renderTeamTable();
    };

    // 팀원 제거 (전역 함수)
    window.removeMember = function(memberId) {
        selectedMemberList = selectedMemberList.filter(m => m.id !== memberId);
        tempSelectedMembers = tempSelectedMembers.filter(emp => emp.id.toString() !== memberId.toString());
        renderTeamTable();
    };

    // 프로젝트 시작일/종료일 변경 시 팀원 참여일 자동 업데이트
    const projectStartDateInput = document.getElementById('startDate');
    const projectEndDateInput = document.getElementById('endDate');

    if (projectStartDateInput) {
        projectStartDateInput.addEventListener('change', async function() {
            const newStartDate = this.value;
            if (!newStartDate) return;

            // 연계 프로젝트가 없을 때만 총 프로젝트 기간 자동 설정
            if (relatedProjectList.length === 0) {
                const totalPeriodStartInput = document.getElementById('totalPeriodStart');
                if (totalPeriodStartInput) {
                    totalPeriodStartInput.value = newStartDate;
                }

                const startYear = new Date(newStartDate).getFullYear();
                const autoTotalEnd = getLastBusinessDayOfYear(startYear + 3);
                const totalPeriodEndInput = document.getElementById('totalPeriodEnd');
                if (totalPeriodEndInput) {
                    totalPeriodEndInput.value = autoTotalEnd;
                }
            }

            const totalPeriodEnd = document.getElementById('totalPeriodEnd').value;
            const endDate = projectEndDateInput ? projectEndDateInput.value : '';

            // 총 프로젝트 종료일보다 뒤에 설정 불가
            if (totalPeriodEnd && new Date(newStartDate) > new Date(totalPeriodEnd)) {
                await showWarning('현재 차수 시작일은 총 프로젝트 종료일보다 뒤에 설정할 수 없습니다.');
                this.value = '';
                return;
            }

            // 현재 차수 종료일보다 뒤에 설정 불가
            if (endDate && new Date(newStartDate) > new Date(endDate)) {
                await showWarning('현재 차수 시작일은 차수 종료일보다 뒤에 설정할 수 없습니다.');
                this.value = '';
                return;
            }

            // 모든 팀원의 참여 시작일을 프로젝트 시작일로 업데이트
            selectedMemberList.forEach(member => {
                member.startDate = newStartDate;
            });
            renderTeamTable();
        });
    }

    if (projectEndDateInput) {
        projectEndDateInput.addEventListener('change', async function() {
            const newEndDate = this.value;
            if (!newEndDate) return;

            const totalPeriodEnd = document.getElementById('totalPeriodEnd').value;
            const startDate = projectStartDateInput ? projectStartDateInput.value : '';

            // 총 프로젝트 종료일보다 뒤에 설정 불가
            if (totalPeriodEnd && new Date(newEndDate) > new Date(totalPeriodEnd)) {
                await showWarning('현재 차수 종료일은 총 프로젝트 종료일보다 뒤에 설정할 수 없습니다.');
                this.value = '';
                return;
            }

            // 현재 차수 시작일보다 앞에 설정 불가
            if (startDate && new Date(newEndDate) < new Date(startDate)) {
                await showWarning('현재 차수 종료일은 차수 시작일보다 앞에 설정할 수 없습니다.');
                this.value = '';
                return;
            }

            // 모든 팀원의 참여 종료일을 프로젝트 종료일로 업데이트
            selectedMemberList.forEach(member => {
                member.endDate = newEndDate;
            });
            renderTeamTable();
        });
    }

    // 카드 목록 렌더링 (읽기 전용)
    function renderCardList() {
        if (!cardList) return;

        cardList.innerHTML = '';

        if (cardListData.length === 0) {
            cardList.innerHTML = '<div class="card-empty-state"><i class="fas fa-credit-card"></i><p>현재 등록된 카드가 없습니다.</p></div>';
            return;
        }

        cardListData.forEach(card => {
            const item = document.createElement('div');
            item.className = 'card-item';
            item.innerHTML = `
                <div class="card-item-info">
                    <i class="fas fa-credit-card"></i>
                    <div class="card-item-details">
                        <div class="card-company">${card.company} / ${card.name}</div>
                        <div class="card-number">**** **** **** ${card.number}</div>
                    </div>
                </div>
            `;
            cardList.appendChild(item);
        });
    }

    /**
     * 해당 년도의 마지막 영업일 계산
     * 주말(토,일)과 공휴일을 제외한 12월의 마지막 근무일
     */
    function getLastBusinessDayOfYear(year) {
        const holidays = getKoreanHolidays(year);
        let date = new Date(year, 11, 31);

        while (date.getMonth() === 11) {
            const dayOfWeek = date.getDay();
            const dateString = formatDateToString(date);
            const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
            const isHoliday = holidays.includes(dateString);
            if (!isWeekend && !isHoliday) {
                return dateString;
            }
            date.setDate(date.getDate() - 1);
        }
        return `${year}-12-31`;
    }

    function getKoreanHolidays(year) {
        const holidays = [];
        holidays.push(`${year}-12-25`);
        const christmas = new Date(year, 11, 25);
        if (christmas.getDay() === 0) {
            holidays.push(`${year}-12-26`);
        }
        return holidays;
    }

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
        projectFiles.addEventListener('change', async function(e) {
            const files = Array.from(e.target.files);
            for (const file of files) {
                // 파일 크기 체크 (50MB)
                if (file.size > 50 * 1024 * 1024) {
                    await showWarning(`파일 크기가 너무 큽니다: ${file.name} (최대 50MB)`);
                    continue;
                }
                selectedFiles.push(file);
            }
            projectFiles.value = ''; // 입력 초기화
            updateFileList();
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

        fileUploadArea.addEventListener('drop', async function(e) {
            e.preventDefault();
            this.style.borderColor = '#cbd5e1';
            this.style.background = '#f8fafc';

            const files = Array.from(e.dataTransfer.files);
            for (const file of files) {
                if (file.size > 50 * 1024 * 1024) {
                    await showWarning(`파일 크기가 너무 큽니다: ${file.name} (최대 50MB)`);
                    continue;
                }
                selectedFiles.push(file);
            }
            updateFileList();
        });
    }

    // 프로젝트 파일 목록 로드
    async function loadProjectFiles(projectIdx) {
        try {
            const response = await fetch(`/api/project-files/project/${projectIdx}`);
            if (!response.ok) {
                console.error('프로젝트 파일 목록 조회 실패');
                return;
            }

            const files = await response.json();
            existingFiles = files || [];
            console.log(`프로젝트 파일 ${existingFiles.length}개 로드 완료`);
            updateFileList();
        } catch (error) {
            console.error('프로젝트 파일 로드 오류:', error);
            existingFiles = [];
        }
    }

    // 파일 목록 렌더링 (기존 파일 + 새 파일)
    function updateFileList() {
        if (!fileList) return;

        fileList.innerHTML = '';

        // 기존 파일 표시 (삭제 예정인 파일 제외)
        existingFiles.forEach(file => {
            if (deletedFileIds.includes(file.idx)) {
                return;
            }

            const item = document.createElement('div');
            item.className = 'file-item';

            let icon = 'fa-file';
            const filename = file.originalFilename.toLowerCase();
            if (filename.match(/\.(jpg|jpeg|png|gif)$/i)) icon = 'fa-file-image';
            else if (filename.match(/\.(pdf)$/i)) icon = 'fa-file-pdf';
            else if (filename.match(/\.(doc|docx)$/i)) icon = 'fa-file-word';
            else if (filename.match(/\.(xls|xlsx)$/i)) icon = 'fa-file-excel';

            const fileSizeKB = (file.fileSize / 1024).toFixed(1);

            item.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${file.originalFilename} (${fileSizeKB} KB)</span>
                <a href="/api/project-files/download/${file.idx}" class="btn-download-file" download>
                    <i class="fas fa-download"></i>
                </a>
                <button type="button" class="btn-remove-file" onclick="removeExistingFile(${file.idx})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(item);
        });

        // 새로 선택한 파일 표시
        selectedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';

            let icon = 'fa-file';
            if (file.name.match(/\.(jpg|jpeg|png|gif)$/i)) icon = 'fa-file-image';
            else if (file.name.match(/\.(pdf)$/i)) icon = 'fa-file-pdf';
            else if (file.name.match(/\.(doc|docx)$/i)) icon = 'fa-file-word';
            else if (file.name.match(/\.(xls|xlsx)$/i)) icon = 'fa-file-excel';

            item.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB) <span style="color: #667eea; font-size: 11px;">[신규]</span></span>
                <button type="button" class="btn-remove-file" onclick="removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(item);
        });

        // 파일이 하나도 없을 때 메시지 표시
        const visibleExistingFiles = existingFiles.filter(f => !deletedFileIds.includes(f.idx));
        if (visibleExistingFiles.length === 0 && selectedFiles.length === 0) {
            fileList.innerHTML = '<p style="color: #999; font-size: 12px; padding: 10px 0;">첨부된 파일이 없습니다.</p>';
        }
    }

    // 파일 크기 포맷팅
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // 새 파일 제거 (전역 함수)
    window.removeFile = function(index) {
        selectedFiles.splice(index, 1);
        updateFileList();
    };

    // 기존 파일 삭제 예약 (전역 함수) - 저장 시에만 실제 삭제
    window.removeExistingFile = async function(fileIdx) {
        const confirmed = await showConfirm('이 파일을 삭제하시겠습니까?\n(저장 버튼을 눌러야 실제로 삭제됩니다)');
        if (confirmed) {
            if (!deletedFileIds.includes(fileIdx)) {
                deletedFileIds.push(fileIdx);
            }
            updateFileList();
        }
    };

    // 파일 업로드 (서버로 전송)
    async function uploadFilesToServer(projectIdx) {
        if (!selectedFiles || selectedFiles.length === 0) {
            console.log('업로드할 파일이 없습니다.');
            return true;
        }

        const uploadUserIdx = 1; // 임시로 1 사용, 실제로는 로그인 사용자 정보 사용

        try {
            for (const file of selectedFiles) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('projectIdx', projectIdx);
                formData.append('uploadUserIdx', uploadUserIdx);

                const response = await fetch('/api/project-files/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    console.error(`파일 업로드 실패 (${file.name})`);
                } else {
                    console.log(`파일 업로드 성공: ${file.name}`);
                }
            }
            return true;
        } catch (error) {
            console.error('파일 업로드 오류:', error);
            return false;
        }
    }

    // 삭제 예정 파일 실제 삭제
    async function deleteFilesFromServer() {
        if (!deletedFileIds || deletedFileIds.length === 0) {
            return true;
        }

        const deletedUserIdx = 1; // 임시로 1 사용

        try {
            for (const fileIdx of deletedFileIds) {
                const response = await fetch(`/api/project-files/${fileIdx}?deletedUserIdx=${deletedUserIdx}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    console.error(`파일 삭제 실패 (fileIdx: ${fileIdx})`);
                } else {
                    console.log(`파일 삭제 성공: ${fileIdx}`);
                }
            }
            return true;
        } catch (error) {
            console.error('파일 삭제 오류:', error);
            return false;
        }
    };

    // 폼 제출
    if (projectEditForm) {
        projectEditForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // 유효성 검사
            const isValid = await validateForm();
            if (!isValid) {
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
                targetProjectIdx: project.id
            }));
            console.log("변환된 projectRelations:", projectRelations);

            // 팀원 데이터 변환
            const projectMembers = selectedMemberList.map(member => ({
                employeeIdx: parseInt(member.idx || member.id),
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
                        const amount = parseCurrencyValue(inputs[index].value);
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
                totalPeriodStart: document.getElementById('totalPeriodStart').value || null,
                totalPeriodEnd: document.getElementById('totalPeriodEnd').value || null,
                projectStatus: document.getElementById('projectStatus').value,
                description: document.getElementById('projectDescription').value,
                receiptUrl: document.getElementById('receiptUrl').value || null,
                activityBudget: parseCurrencyValue(document.getElementById('activityBudget').value),
                equipmentBudget: parseCurrencyValue(document.getElementById('equipmentBudget').value),
                materialBudget: parseCurrencyValue(document.getElementById('materialBudget').value),
                projectCards: projectCards,
                projectRelations: projectRelations,
                projectMembers: projectMembers,
                projectExpenseSettings: projectExpenseSettings
            };

            console.log('수정된 프로젝트 데이터:', updateData);
            console.log('프로젝트 ID:', projectId);
            console.log('요청 URL:', `/api/projects/${projectId}`);

            // 프로젝트 수정 및 파일 처리
            updateProjectWithFiles(updateData, projectId);
        });
    }

    /**
     * 프로젝트 수정 및 파일 업로드/삭제 처리
     */
    async function updateProjectWithFiles(updateData, projectId) {
        try {
            // 1. 프로젝트 수정
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (response.status === 403) {
                const errorData = await response.json();
                await showError(errorData.error || '프로젝트 수정 권한이 없습니다.');
                return;
            }

            if (!response.ok) {
                throw new Error('프로젝트 수정에 실패했습니다.');
            }

            const project = await response.json();
            console.log('프로젝트 수정 완료:', project.idx);

            // 2. 새 파일 업로드
            if (selectedFiles.length > 0) {
                console.log(`${selectedFiles.length}개 파일 업로드 시작...`);
                await uploadFilesToServer(projectId);
            }

            // 3. 삭제 예정 파일 실제 삭제
            if (deletedFileIds.length > 0) {
                console.log(`${deletedFileIds.length}개 파일 삭제 시작...`);
                await deleteFilesFromServer();
            }

            await showSuccess('프로젝트가 수정되었습니다.');
            window.location.href = '/project';

        } catch (error) {
            console.error('Error updating project:', error);
            await showError('프로젝트 수정 중 오류가 발생했습니다.');
        }
    }

    // SweetAlert2 경고 + 모달이 완전히 닫힌 후 포커스 이동
    function warnAndFocus(message, element) {
        return Swal.fire({
            title: '경고',
            html: message.replace(/\n/g, '<br>'),
            icon: 'warning',
            confirmButtonText: '확인',
            confirmButtonColor: '#ff9800',
            didClose: () => {
                if (element) element.focus();
            }
        });
    }

    // 폼 유효성 검사
    async function validateForm() {
        const projectNameInput = document.getElementById('projectName');
        const clientNameInput = document.getElementById('clientName');
        const projectStatusInput = document.getElementById('projectStatus');
        const projectManagerInput = document.getElementById('projectManager');
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        const projectDescriptionInput = document.getElementById('projectDescription');

        if (!projectNameInput.value.trim()) {
            await warnAndFocus('프로젝트명을 입력해주세요.', projectNameInput);
            return false;
        }

        if (!clientNameInput.value.trim()) {
            await warnAndFocus('발주사를 입력해주세요.', clientNameInput);
            return false;
        }

        if (!projectStatusInput.value) {
            await warnAndFocus('프로젝트 상태를 선택해주세요.', projectStatusInput);
            return false;
        }

        if (!projectManagerInput.value) {
            await warnAndFocus('연구 책임자를 선택해주세요.', projectManagerInput);
            return false;
        }

        if (!startDateInput.value) {
            await warnAndFocus('현재 차수 시작일을 선택해주세요.', startDateInput);
            return false;
        }

        if (!endDateInput.value) {
            await warnAndFocus('현재 차수 종료일을 선택해주세요.', endDateInput);
            return false;
        }

        if (new Date(startDateInput.value) > new Date(endDateInput.value)) {
            await warnAndFocus('종료일은 시작일 이후여야 합니다.', endDateInput);
            return false;
        }

        if (!projectDescriptionInput.value.trim()) {
            await warnAndFocus('프로젝트 설명을 입력해주세요.', projectDescriptionInput);
            return false;
        }

        if (selectedMemberList.length === 0) {
            await showWarning('참여 연구원을 1명 이상 추가해주세요.');
            return false;
        }

        // 실무자 역할 검사
        const hasPractitioner = selectedMemberList.some(m => m.role === 'PRACTITIONER');
        if (!hasPractitioner) {
            await showWarning('실무자를 선택해주세요.\n참여연구원 중 1명 이상을 실무자로 지정해야 합니다.');
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
            .catch(async (error) => {
                console.error('Error loading related projects:', error);
                await showError('프로젝트 목록을 불러올 수 없습니다.');
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
            relatedProjectTableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 40px;">등록된 프로젝트가 없습니다.</td></tr>';
            return;
        }

        filteredProjects.forEach(project => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', project.idx);
            row.setAttribute('data-name', project.projectName);
            row.setAttribute('data-status', project.projectStatus);
            row.setAttribute('data-pm', project.projectManagerName || '-');
            row.setAttribute('data-period', `${project.startDate} ~ ${project.endDate}`);
            row.setAttribute('data-total-start', project.totalPeriodStart || '');
            row.setAttribute('data-total-end', project.totalPeriodEnd || '');

            row.innerHTML = `
                <td><input type="checkbox" class="related-project-checkbox" value="${project.idx}"></td>
                <td>${project.projectName}</td>
                <td><span class="status-badge ${getStatusClass(project.projectStatus)}">${getStatusLabel(project.projectStatus)}</span></td>
                <td>${project.projectManagerName || '-'}</td>
                <td>${project.startDate}<br>~ ${project.endDate}</td>
                <td>${project.totalPeriodStart ? `${project.totalPeriodStart}<br>~ ${project.totalPeriodEnd || '-'}` : '-'}</td>
            `;

            row.style.cursor = 'pointer';
            row.addEventListener('click', function(e) {
                if (e.target.type === 'checkbox') return;
                const checkbox = this.querySelector('.related-project-checkbox');
                checkbox.checked = !checkbox.checked;
                if (checkbox.checked) {
                    this.classList.add('selected');
                } else {
                    this.classList.remove('selected');
                }
            });

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
            const isSelected = relatedProjectList.some(p => String(p.id) === String(projectId));
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

    // 연계 프로젝트 저장 (전역 함수)
    window.saveSelectedRelatedProjects = async function() {
        const checkedCheckboxes = document.querySelectorAll('.related-project-checkbox:checked');

        if (checkedCheckboxes.length === 0) {
            await showWarning('연계할 프로젝트를 선택해주세요.');
            return;
        }

        // 체크된 항목으로 새 목록 구성 (기존 데이터 유지 + 신규 추가 + 해제된 항목 제거)
        const newList = [];
        checkedCheckboxes.forEach(checkbox => {
            const projectId = checkbox.value;
            const existing = relatedProjectList.find(p => String(p.id) === String(projectId));
            if (existing) {
                newList.push(existing);
            } else {
                const row = checkbox.closest('tr');
                newList.push({
                    id: projectId,
                    name: row.getAttribute('data-name'),
                    status: row.getAttribute('data-status'),
                    pm: row.getAttribute('data-pm'),
                    period: row.getAttribute('data-period'),
                    totalStart: row.getAttribute('data-total-start') || '',
                    totalEnd: row.getAttribute('data-total-end') || ''
                });
            }
        });

        relatedProjectList = newList;
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
                        <span><i class="fas fa-calendar"></i> 현재 차수 기간: ${project.period || '-'}</span>
                        ${(project.totalStart || project.totalEnd) ? `<span><i class="fas fa-calendar-alt"></i> 총 프로젝트 기간: ${project.totalStart || '-'} ~ ${project.totalEnd || '-'}</span>` : ''}
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
        // 타입 불일치 방지를 위해 == 사용 (숫자와 문자열 비교)
        relatedProjectList = relatedProjectList.filter(p => p.id != projectId);
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

    // 기본값으로 초기화
    if (resetExpensesBtn) {
        resetExpensesBtn.addEventListener('click', async function() {
            const confirmed = await showConfirm('경비 설정을 0원으로 초기화하시겠습니까?');
            if (confirmed) {
                resetExpensesToDefault();
            }
        });
    }

    async function resetExpensesToDefault() {
        const expenseRows = document.querySelectorAll('#expenseSettingsBody tr[data-position]');

        expenseRows.forEach(row => {
            const inputs = row.querySelectorAll('.expense-input-sm');
            inputs.forEach(input => {
                input.value = 0;
            });
        });

        await showSuccess('경비 설정이 0원으로 초기화되었습니다.');
    }

    // 기초정보관리 설정값 불러오기
    if (loadDefaultExpensesBtn) {
        loadDefaultExpensesBtn.addEventListener('click', function() {
            fetch('/api/fixed-expense-policies')
                .then(res => res.json())
                .then(async policies => {
                    console.log("===== 기초정보관리 데이터 불러오기 =====");
                    console.log("policies 원본 데이터:", policies);
                    console.log("데이터 개수:", policies.length);

                    loadExpenseSettings(policies);

                    await showSuccess('기초정보관리의 설정값을 불러왔습니다.');
                })
                .catch(async error => {
                    console.error('고정경비 정책 조회 실패:', error);
                    await showError('설정값을 불러오는데 실패했습니다.');
                });
        });
    }

    // 삭제 버튼 이벤트
    const deleteProjectBtn = document.getElementById('deleteProjectBtn');
    if (deleteProjectBtn) {
        deleteProjectBtn.addEventListener('click', async function() {
            // 삭제 확인 대화상자
            const confirmed = await showDeleteConfirm('정말로 이 프로젝트를 삭제하시겠습니까?\n삭제된 프로젝트는 복구할 수 없습니다.');
            if (!confirmed) {
                return;
            }

            // 추가 확인
            const projectName = document.getElementById('projectName').value;
            const confirmMessage = `프로젝트명: ${projectName}\n\n위 프로젝트를 삭제하시려면 "삭제"를 입력하세요.`;
            const userInput = await showInput(confirmMessage, '삭제 확인을 위해 "삭제"를 입력하세요');

            if (userInput !== '삭제') {
                await showWarning('삭제가 취소되었습니다.');
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
            .then(async () => {
                await showSuccess('프로젝트가 삭제되었습니다.');
                window.location.href = '/project';
            })
            .catch(async (error) => {
                console.error('프로젝트 삭제 실패:', error);
                await showError('프로젝트 삭제에 실패했습니다.\n' + error.message);
                deleteProjectBtn.disabled = false;
                deleteProjectBtn.innerHTML = '<i class="fas fa-trash"></i> 삭제';
            });
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

    // 상단으로 이동 버튼
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    const mainContent = document.querySelector('.main-content');
    if (scrollToTopBtn && mainContent) {
        mainContent.addEventListener('scroll', function () {
            scrollToTopBtn.classList.toggle('visible', mainContent.scrollTop > 300);
        });
        scrollToTopBtn.addEventListener('click', function () {
            mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});
