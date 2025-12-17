// 신규 팀 생성 페이지 스크립트
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수 CURRENT_USER 사용 (layout.html에서 주입됨)
    if (!window.CURRENT_USER || !window.CURRENT_USER.idx) {
        console.warn('세션 정보가 없습니다.');
        window.location.href = '/login';
        return;
    }

    const currentUserIdx = window.CURRENT_USER.idx;
    console.log('현재 로그인 사용자:', window.CURRENT_USER.empName, '(idx:', currentUserIdx, ')');

    // 상태 변수
    let allEmployees = [];
    let organizationData = { departments: [] }; // 조직도 데이터
    let selectedEmployees = new Map(); // key: memberIdx, value: employee object
    let teamMembers = []; // 테이블에 추가된 팀원 목록

    // DOM 요소
    const teamForm = document.getElementById('teamForm');
    const teamLeaderSearch = document.getElementById('teamLeaderSearch');
    const teamLeaderHidden = document.getElementById('teamLeader');
    const teamLeaderDropdown = document.getElementById('teamLeaderDropdown');
    const backBtn = document.getElementById('backBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitBtn');
    const addMemberBtn = document.getElementById('addMemberBtn');
    const teamTableBody = document.getElementById('teamTableBody');

    // 모달 요소
    const employeeSelectionModal = document.getElementById('employeeSelectionModal');
    const closeEmployeeModal = document.getElementById('closeEmployeeModal');
    const cancelEmployeeSelection = document.getElementById('cancelEmployeeSelection');
    const confirmEmployeeSelection = document.getElementById('confirmEmployeeSelection');
    const employeeSearch = document.getElementById('employeeSearch');
    const employeeOrgTree = document.getElementById('employeeOrgTree');
    const selectedEmployeesList = document.getElementById('selectedEmployeesList');
    const selectedCount = document.getElementById('selectedCount');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const clearSelectedBtn = document.getElementById('clearSelectedBtn');

    // 초기화
    init();

    // 이벤트 리스너
    backBtn.addEventListener('click', () => {
        window.location.href = '/team';
    });

    cancelBtn.addEventListener('click', () => {
        if (confirm('작성 중인 내용이 있습니다. 정말 취소하시겠습니까?')) {
            window.location.href = '/team';
        }
    });

    teamForm.addEventListener('submit', handleSubmit);

    submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        teamForm.dispatchEvent(new Event('submit'));
    });

    addMemberBtn.addEventListener('click', openEmployeeSelectionModal);

    closeEmployeeModal.addEventListener('click', closeModal);
    cancelEmployeeSelection.addEventListener('click', closeModal);
    confirmEmployeeSelection.addEventListener('click', confirmSelection);

    employeeSearch.addEventListener('input', filterEmployees);

    selectAllBtn.addEventListener('click', selectAllEmployees);
    expandAllBtn.addEventListener('click', toggleExpandAll);
    clearSelectedBtn.addEventListener('click', clearAllSelected);

    employeeSelectionModal.addEventListener('click', (e) => {
        if (e.target === employeeSelectionModal) {
            closeModal();
        }
    });

    // 초기화 함수
    async function init() {
        await loadEmployees();
        initTeamLeaderDropdown();
        initColorPicker();
        renderTeamMembersTable(); // 초기 빈 행에 클릭 이벤트 추가
    }

    // 전체 직원 목록 로드
    async function loadEmployees() {
        try {
            const response = await fetch('/api/users');
            if (!response.ok) {
                throw new Error('직원 목록 로드 실패');
            }
            const users = await response.json();
            allEmployees = users;
            console.log('Loaded employees:', allEmployees.length);

            // organizationData 형식으로 변환
            organizationData = transformUsersToOrgData(users);
            console.log('Transformed organization data:', organizationData);
        } catch (error) {
            console.error('직원 목록 로드 중 오류:', error);
            showEmployeeLoadError();
        }
    }

    // 직원 로드 에러 UI 표시
    function showEmployeeLoadError() {
        if (employeeOrgTree) {
            employeeOrgTree.innerHTML = `
                <div style="padding: 40px 20px; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc3545; margin-bottom: 16px;"></i>
                    <p style="color: #6c757d; font-size: 14px; margin-bottom: 12px;">사용자 데이터를 불러오는데 실패했습니다.</p>
                    <button class="btn btn-primary btn-sm" onclick="location.reload()">
                        <i class="fas fa-redo"></i> 새로고침
                    </button>
                </div>
            `;
        }
    }

    // 직급 순서 정의 (높은 직급부터)
    function getPositionOrder(position) {
        const orderMap = {
            '대표이사': 1,
            '부사장': 2,
            '전무': 3,
            '상무': 4,
            '이사': 5,
            '부장': 6,
            '차장': 7,
            '과장': 8,
            '대리': 9,
            '주임': 10,
            '사원': 11,
            '인턴': 12,
            '미지정': 99
        };
        return orderMap[position] || 50;
    }

    // 직급별 뱃지 스타일 클래스 반환
    function getPositionBadgeClass(position) {
        if (position === '대표이사') {
            return 'ceo';
        }
        if (['부사장', '전무', '상무'].includes(position)) {
            return 'seniorExec';
        }
        if (position === '이사') {
            return 'executive';
        }
        if (position === '부장') {
            return 'director';
        }
        if (position === '차장') {
            return 'seniorManager';
        }
        if (position === '과장') {
            return 'manager';
        }
        if (position === '대리') {
            return 'assistant';
        }
        if (['주임', '사원', '인턴'].includes(position)) {
            return 'staff';
        }
        return 'staff';
    }

    // 사용자 배열을 조직도 데이터 구조로 변환
    function transformUsersToOrgData(users) {
        const deptMap = new Map();

        users.forEach(user => {
            const deptName = user.empDeptName || '미지정';

            if (!deptMap.has(deptName)) {
                deptMap.set(deptName, []);
            }

            deptMap.get(deptName).push({
                id: user.idx,
                name: user.empName,
                position: user.empPositionName || '미지정',
                rank: user.empPositionName || '미지정',
                department: deptName
            });
        });

        const departments = [];
        let deptId = 1;

        deptMap.forEach((members, deptName) => {
            // 직급 순으로 정렬
            members.sort((a, b) => {
                const orderA = getPositionOrder(a.rank);
                const orderB = getPositionOrder(b.rank);
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                return a.name.localeCompare(b.name, 'ko');
            });

            departments.push({
                id: deptId,
                name: deptName,
                members: members
            });
            deptId++;
        });

        return { departments };
    }

    // 팀 리더 검색 드롭다운 초기화
    function initTeamLeaderDropdown() {
        // 검색창 포커스 시 드롭다운 표시
        teamLeaderSearch.addEventListener('focus', function() {
            renderTeamLeaderDropdown('');
            teamLeaderDropdown.classList.add('active');
        });

        // 검색창 입력 시 필터링
        teamLeaderSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            renderTeamLeaderDropdown(searchTerm);
        });

        // 외부 클릭 시 드롭다운 닫기
        document.addEventListener('click', function(e) {
            if (!teamLeaderSearch.contains(e.target) && !teamLeaderDropdown.contains(e.target)) {
                teamLeaderDropdown.classList.remove('active');
            }
        });
    }

    // 팀 리더 드롭다운 렌더링
    function renderTeamLeaderDropdown(searchTerm) {
        // 직급으로 정렬
        let sortedEmployees = [...allEmployees].sort((a, b) => {
            const posA = getPositionOrder(a.empPositionName || '미지정');
            const posB = getPositionOrder(b.empPositionName || '미지정');
            if (posA !== posB) return posA - posB;
            return (a.empName || '').localeCompare(b.empName || '');
        });

        // 검색어로 필터링
        if (searchTerm) {
            sortedEmployees = sortedEmployees.filter(emp => {
                const name = (emp.empName || '').toLowerCase();
                const dept = (emp.empDeptName || '').toLowerCase();
                const position = (emp.empPositionName || '').toLowerCase();
                return name.includes(searchTerm) || dept.includes(searchTerm) || position.includes(searchTerm);
            });
        }

        if (sortedEmployees.length === 0) {
            teamLeaderDropdown.innerHTML = '<div class="team-leader-dropdown-empty">검색 결과가 없습니다.</div>';
            return;
        }

        const html = sortedEmployees.map(emp => {
            const isSelected = teamLeaderHidden.value == emp.idx;
            return `
                <div class="team-leader-item ${isSelected ? 'selected' : ''}" data-idx="${emp.idx}" data-name="${emp.empName}">
                    <div class="team-leader-item-name">${emp.empName}</div>
                    <div class="team-leader-item-info">${emp.empDeptName || '미지정'} · ${emp.empPositionName || '미지정'}</div>
                </div>
            `;
        }).join('');

        teamLeaderDropdown.innerHTML = html;

        // 항목 클릭 이벤트
        teamLeaderDropdown.querySelectorAll('.team-leader-item').forEach(item => {
            item.addEventListener('click', function() {
                const idx = parseInt(this.getAttribute('data-idx'));
                const name = this.getAttribute('data-name');

                teamLeaderHidden.value = idx;
                teamLeaderSearch.value = name;
                teamLeaderDropdown.classList.remove('active');

                // 선택 상태 업데이트
                teamLeaderDropdown.querySelectorAll('.team-leader-item').forEach(i => i.classList.remove('selected'));
                this.classList.add('selected');

                // 팀원 목록에 자동 추가/업데이트
                addTeamLeaderToMembers(idx);
            });
        });
    }

    // 팀 리더를 팀원 목록에 자동 추가
    function addTeamLeaderToMembers(leaderIdx) {
        // 전체 직원 목록에서 해당 직원 찾기
        const employee = allEmployees.find(emp => emp.idx === leaderIdx);
        if (!employee) return;

        // 이미 팀원 목록에 있는지 확인
        const existingMember = teamMembers.find(m => m.idx === leaderIdx);

        if (existingMember) {
            // 이미 있으면 역할만 팀장으로 변경
            existingMember.role = '팀장';
        } else {
            // 없으면 팀장으로 추가
            teamMembers.unshift({
                idx: employee.idx,
                empName: employee.empName,
                empDept: employee.empDeptName,
                empPosition: employee.empPositionName,
                role: '팀장'
            });
        }

        // 테이블 재렌더링
        renderTeamMembersTable();
    }

    // 팀원 선택 모달 열기
    async function openEmployeeSelectionModal() {
        selectedEmployees.clear();

        // 이미 추가된 팀원들을 선택 목록에 추가
        teamMembers.forEach(member => {
            selectedEmployees.set(member.idx, {
                name: member.empName,
                department: member.empDept || '미지정',
                rank: member.empPosition || '미지정',
                id: member.idx
            });
        });

        buildOrgTree();
        updateOrgTreeCheckboxes(); // 체크박스 상태 업데이트
        updateSelectedEmployeesList();
        employeeSelectionModal.classList.add('active');
    }

    // 모달 닫기
    function closeModal() {
        employeeSelectionModal.classList.remove('active');
        employeeSearch.value = '';
    }

    // Build organizational tree
    function buildOrgTree() {
        if (!employeeOrgTree) return;

        employeeOrgTree.innerHTML = '';

        if (!organizationData.departments || organizationData.departments.length === 0) {
            employeeOrgTree.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">조직도 데이터가 없습니다.</p>';
            return;
        }

        organizationData.departments.forEach(dept => {
            const deptNode = createDepartmentNode(dept);
            employeeOrgTree.appendChild(deptNode);
        });

        // Expand first department
        setTimeout(() => {
            const firstDept = employeeOrgTree.querySelector('.tree-node.department');
            if (firstDept) firstDept.classList.add('expanded');
        }, 100);
    }

    // Create department node
    function createDepartmentNode(dept) {
        const node = document.createElement('div');
        node.className = 'tree-node department';
        node.setAttribute('data-id', dept.id);
        node.setAttribute('data-dept', JSON.stringify(dept));

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

        // 부서 이름 클릭 시 해당 부서의 모든 직원 선택
        const treeLabel = node.querySelector('.tree-label');
        treeLabel.style.cursor = 'pointer';
        treeLabel.addEventListener('click', function(e) {
            e.stopPropagation();

            const deptData = JSON.parse(node.getAttribute('data-dept'));
            if (!deptData.members || deptData.members.length === 0) return;

            // 현재 부서의 모든 직원이 선택되어 있는지 확인
            const allSelected = deptData.members.every(member => selectedEmployees.has(member.id));

            if (allSelected) {
                // 모두 선택되어 있으면 해제
                deptData.members.forEach(member => {
                    selectedEmployees.delete(member.id);
                });
            } else {
                // 하나라도 선택 안 되어 있으면 모두 선택
                deptData.members.forEach(member => {
                    selectedEmployees.set(member.id, member);
                });
            }

            updateSelectedEmployeesList();
            updateOrgTreeCheckboxes();
        });

        attachToggleEvent(node);
        return node;
    }

    // Create member node with checkbox
    function createMemberNode(member) {
        const node = document.createElement('div');
        node.className = 'tree-node member';
        node.setAttribute('data-id', member.id);
        node.setAttribute('data-member', JSON.stringify(member));

        const isChecked = selectedEmployees.has(member.id);

        // 직급별 뱃지 색상
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
                if (!selectedEmployees.has(memberData.id)) {
                    selectedEmployees.set(memberData.id, memberData);
                }
            } else {
                selectedEmployees.delete(memberData.id);
            }

            updateSelectedEmployeesList();
        });

        // 행 전체 클릭 시 체크박스 토글
        header.addEventListener('click', function(e) {
            // 체크박스 자체를 클릭한 경우는 이미 change 이벤트가 발생하므로 무시
            if (e.target === checkbox) {
                return;
            }
            // 다른 영역 클릭 시 체크박스 토글
            checkbox.checked = !checkbox.checked;
            // change 이벤트 수동 발생
            checkbox.dispatchEvent(new Event('change'));
        });

        // 마우스 커서 변경으로 클릭 가능함을 표시
        header.style.cursor = 'pointer';

        return node;
    }

    // Attach toggle event to node
    function attachToggleEvent(node) {
        const header = node.querySelector('.tree-node-header');
        const toggle = node.querySelector('.tree-toggle');

        if (toggle && !toggle.classList.contains('invisible')) {
            toggle.addEventListener('click', function(e) {
                e.stopPropagation();
                node.classList.toggle('expanded');
            });

            header.addEventListener('click', function(e) {
                if (e.target.tagName !== 'INPUT' && !e.target.closest('.tree-toggle')) {
                    node.classList.toggle('expanded');
                }
            });
        }
    }

    // 선택된 팀원 목록 업데이트
    function updateSelectedEmployeesList() {
        selectedCount.textContent = selectedEmployees.size;

        if (selectedEmployees.size === 0) {
            selectedEmployeesList.innerHTML = '<p class="empty-message">선택된 팀원이 없습니다.</p>';
            return;
        }

        const html = Array.from(selectedEmployees.values()).map(emp => `
            <div class="selected-employee-item">
                <div class="selected-employee-avatar">${getInitial(emp.name)}</div>
                <div class="selected-employee-info">
                    <div class="selected-employee-name">${emp.name}</div>
                    <div class="selected-employee-dept">${emp.department || '부서 미지정'} · ${emp.rank || '직급 미지정'}</div>
                </div>
                <button type="button" class="btn-remove-selected" onclick="removeSelectedEmployee(${emp.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        selectedEmployeesList.innerHTML = html;
    }

    // 선택된 팀원 제거
    window.removeSelectedEmployee = function(memberId) {
        selectedEmployees.delete(memberId);
        updateSelectedEmployeesList();
        updateOrgTreeCheckboxes();
    };

    // 직원 검색 필터
    function filterEmployees() {
        const searchTerm = employeeSearch.value.toLowerCase().trim();

        const departments = employeeOrgTree.querySelectorAll('.tree-node.department');

        departments.forEach(dept => {
            const members = dept.querySelectorAll('.tree-node.member');
            let hasVisibleMember = false;

            members.forEach(memberEl => {
                const memberData = JSON.parse(memberEl.getAttribute('data-member'));

                const nameMatch = (memberData.name || '').toLowerCase().includes(searchTerm);
                const deptMatch = (memberData.department || '').toLowerCase().includes(searchTerm);
                const rankMatch = (memberData.rank || '').toLowerCase().includes(searchTerm);

                if (searchTerm === '' || nameMatch || deptMatch || rankMatch) {
                    memberEl.style.display = 'block';
                    hasVisibleMember = true;
                } else {
                    memberEl.style.display = 'none';
                }
            });

            // 부서에 보이는 직원이 있으면 자동으로 펼치기
            if (hasVisibleMember && searchTerm !== '') {
                dept.classList.add('expanded');
                dept.style.display = 'block';
            } else if (!hasVisibleMember) {
                dept.style.display = searchTerm === '' ? 'block' : 'none';
            }
        });
    }

    // 전체 선택
    function selectAllEmployees() {
        // 전체 직원 수 계산
        let totalEmployees = 0;
        organizationData.departments.forEach(dept => {
            if (dept.members && dept.members.length > 0) {
                totalEmployees += dept.members.length;
            }
        });

        // 현재 모든 직원이 선택되어 있는지 확인
        const allSelected = selectedEmployees.size === totalEmployees;

        if (allSelected) {
            // 전체 해제
            selectedEmployees.clear();
            selectAllBtn.innerHTML = '<i class="fas fa-check-double"></i> 전체 선택';
        } else {
            // 전체 선택
            selectedEmployees.clear();

            organizationData.departments.forEach(dept => {
                if (dept.members && dept.members.length > 0) {
                    dept.members.forEach(member => {
                        selectedEmployees.set(member.id, member);
                    });
                }
            });
            selectAllBtn.innerHTML = '<i class="fas fa-times-circle"></i> 전체 해제';
        }

        updateSelectedEmployeesList();
        updateOrgTreeCheckboxes();
    }

    // 조직도 체크박스 상태 업데이트
    function updateOrgTreeCheckboxes() {
        const checkboxes = employeeOrgTree.querySelectorAll('.employee-checkbox');
        checkboxes.forEach(checkbox => {
            const memberId = parseInt(checkbox.getAttribute('data-id'));
            checkbox.checked = selectedEmployees.has(memberId);
        });
    }

    // 전체 펼치기/접기
    function toggleExpandAll() {
        const departments = employeeOrgTree.querySelectorAll('.tree-node.department');
        const allExpanded = Array.from(departments).every(dept => dept.classList.contains('expanded'));

        departments.forEach(dept => {
            if (allExpanded) {
                dept.classList.remove('expanded');
            } else {
                dept.classList.add('expanded');
            }
        });

        expandAllBtn.innerHTML = allExpanded
            ? '<i class="fas fa-plus-square"></i> 전체 펼치기'
            : '<i class="fas fa-minus-square"></i> 전체 접기';
    }

    // 전체 선택 해제
    function clearAllSelected() {
        selectedEmployees.clear();
        updateSelectedEmployeesList();
        updateOrgTreeCheckboxes();
    }

    // 선택 완료
    function confirmSelection() {
        selectedEmployees.forEach((memberData, memberId) => {
            // 이미 추가된 팀원인지 확인
            if (!teamMembers.find(m => m.idx === memberId)) {
                teamMembers.push({
                    idx: memberId,
                    empName: memberData.name,
                    empDept: memberData.department,
                    empPosition: memberData.rank,
                    role: '팀원'
                });
            }
        });

        renderTeamMembersTable();
        closeModal();
    }

    // 팀원 테이블 렌더링
    function renderTeamMembersTable() {
        if (teamMembers.length === 0) {
            teamTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="6" class="text-center">
                        <i class="fas fa-users"></i> 팀원을 추가해주세요
                    </td>
                </tr>
            `;

            // 팀원 추가 버튼 숨기기
            addMemberBtn.style.display = 'none';

            // 빈 행 클릭 이벤트
            const emptyRow = teamTableBody.querySelector('.empty-row');
            emptyRow.addEventListener('click', openEmployeeSelectionModal);
            return;
        }

        // 팀원 추가 버튼 보이기
        addMemberBtn.style.display = 'flex';

        const html = teamMembers.map((member, index) => `
            <tr data-member-idx="${member.idx}">
                <td>${index + 1}</td>
                <td>${member.empName}</td>
                <td>${member.empDept || '미지정'}</td>
                <td>${member.empPosition || '미지정'}</td>
                <td>
                    <select class="member-role-select" data-member-idx="${member.idx}">
                        <option value="">역할 선택</option>
                        <option value="팀장" ${member.role === '팀장' ? 'selected' : ''}>팀장</option>
                        <option value="팀원" ${member.role === '팀원' ? 'selected' : ''}>팀원</option>
                    </select>
                </td>
                <td>
                    <button type="button" class="btn-remove-member" data-member-idx="${member.idx}">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                </td>
            </tr>
        `).join('');

        teamTableBody.innerHTML = html;

        // 역할 선택 이벤트 리스너
        teamTableBody.querySelectorAll('.member-role-select').forEach(select => {
            select.addEventListener('change', function() {
                const memberIdx = parseInt(this.getAttribute('data-member-idx'));
                const member = teamMembers.find(m => m.idx === memberIdx);
                if (member) {
                    member.role = this.value;
                }
            });
        });

        // 삭제 버튼 이벤트 리스너
        teamTableBody.querySelectorAll('.btn-remove-member').forEach(btn => {
            btn.addEventListener('click', function() {
                const memberIdx = parseInt(this.getAttribute('data-member-idx'));
                removeMemberFromTable(memberIdx);
            });
        });
    }

    // 테이블에서 팀원 제거
    function removeMemberFromTable(memberIdx) {
        teamMembers = teamMembers.filter(m => m.idx !== memberIdx);
        renderTeamMembersTable();
    }

    // 폼 제출 처리
    async function handleSubmit(e) {
        e.preventDefault();

        // 유효성 검사
        const teamName = document.getElementById('teamName').value.trim();
        const teamLeaderIdx = teamLeaderHidden.value;
        const teamDescription = document.getElementById('teamDescription').value.trim();

        if (!teamName) {
            alert('팀 이름을 입력해주세요.');
            return;
        }

        // 팀 색상 가져오기
        const teamColor = document.getElementById('teamColor').value || '#FFD1DC';

        // 팀 생성 데이터 준비
        const teamData = {
            teamName: teamName,
            teamLeaderIdx: teamLeaderIdx ? parseInt(teamLeaderIdx) : null,
            teamDescription: teamDescription,
            teamColor: teamColor,
            createdUserIdx: currentUserIdx,
            members: teamMembers.map(member => ({
                memberIdx: member.idx,
                role: member.role || null
            }))
        };

        console.log('Creating team:', teamData);

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 생성 중...';

            const response = await fetch('/api/teams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(teamData)
            });

            if (!response.ok) {
                throw new Error('팀 생성 실패');
            }

            const result = await response.json();
            console.log('Team created:', result);

            alert('팀이 성공적으로 생성되었습니다.');
            window.location.href = '/team';

        } catch (error) {
            console.error('팀 생성 중 오류:', error);
            alert('팀 생성에 실패했습니다. 다시 시도해주세요.');

            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> 팀 생성';
        }
    }

    // 색상 선택 초기화
    function initColorPicker() {
        const colorOptions = document.querySelectorAll('.color-option');
        const teamColorInput = document.getElementById('teamColor');
        const colorPreviewBox = document.querySelector('.color-preview-box');
        const colorPreviewName = document.querySelector('.color-preview-name');

        const colorNames = {
            '#FFD1DC': '파스텔 핑크',
            '#FFB3BA': '파스텔 코랄',
            '#FFDFBA': '파스텔 피치',
            '#FFFFBA': '파스텔 옐로우',
            '#BAFFC9': '파스텔 민트',
            '#C1E1C1': '파스텔 그린',
            '#D4F1F4': '파스텔 티파니',
            '#BAE1FF': '파스텔 스카이블루',
            '#D6EAF8': '파스텔 블루',
            '#C9C9FF': '파스텔 라벤더',
            '#E8DFF5': '파스텔 라일락',
            '#E0BBE4': '파스텔 퍼플',
            '#FCE4EC': '파스텔 로즈',
            '#FFDFD3': '파스텔 아프리콧',
            '#F7D9C4': '파스텔 베이지'
        };

        colorOptions.forEach(option => {
            option.addEventListener('click', function() {
                // 모든 옵션의 selected 클래스 제거
                colorOptions.forEach(opt => opt.classList.remove('selected'));

                // 클릭한 옵션에 selected 클래스 추가
                this.classList.add('selected');

                // hidden input 값 업데이트
                const selectedColor = this.getAttribute('data-color');
                teamColorInput.value = selectedColor;

                // 미리보기 업데이트
                colorPreviewBox.style.backgroundColor = selectedColor;
                colorPreviewName.textContent = colorNames[selectedColor] || '알 수 없음';
            });
        });
    }

    // 유틸리티 함수
    function getInitial(name) {
        if (!name) return '?';
        return name.charAt(0);
    }
});
