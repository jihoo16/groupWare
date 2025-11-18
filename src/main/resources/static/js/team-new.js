// 신규 팀 생성 페이지 스크립트
document.addEventListener('DOMContentLoaded', function() {
    // 상태 변수
    let allEmployees = [];
    let organizationData = { departments: [] }; // 조직도 데이터
    let selectedEmployees = new Map(); // key: memberIdx, value: employee object
    let teamMembers = []; // 테이블에 추가된 팀원 목록

    // DOM 요소
    const teamForm = document.getElementById('teamForm');
    const teamLeaderSelect = document.getElementById('teamLeader');
    const backBtn = document.getElementById('backBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitBtn');
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
        populateTeamLeaderSelect();
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

    // 팀 리더 선택 옵션 채우기
    function populateTeamLeaderSelect() {
        teamLeaderSelect.innerHTML = '<option value="">선택하세요</option>';

        // 직급으로 정렬
        const sortedEmployees = [...allEmployees].sort((a, b) => {
            const posA = getPositionOrder(a.empPositionName || '미지정');
            const posB = getPositionOrder(b.empPositionName || '미지정');
            if (posA !== posB) return posA - posB;
            return (a.empName || '').localeCompare(b.empName || '');
        });

        sortedEmployees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.idx;
            option.textContent = `${emp.empName} (${emp.empDeptName || '미지정'} / ${emp.empPositionName || '미지정'})`;
            teamLeaderSelect.appendChild(option);
        });
    }

    // 팀원 선택 모달 열기
    async function openEmployeeSelectionModal() {
        selectedEmployees.clear();
        buildOrgTree();
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
                    role: ''
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

            // 빈 행 클릭 이벤트
            const emptyRow = teamTableBody.querySelector('.empty-row');
            emptyRow.addEventListener('click', openEmployeeSelectionModal);
            return;
        }

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
                        <option value="부팀장" ${member.role === '부팀장' ? 'selected' : ''}>부팀장</option>
                        <option value="팀원" ${member.role === '팀원' ? 'selected' : ''}>팀원</option>
                        <option value="서기" ${member.role === '서기' ? 'selected' : ''}>서기</option>
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
        const teamType = document.getElementById('teamType').value;
        const teamLeaderIdx = teamLeaderSelect.value;
        const teamDescription = document.getElementById('teamDescription').value.trim();

        if (!teamName) {
            alert('팀 이름을 입력해주세요.');
            return;
        }

        if (!teamType) {
            alert('팀 유형을 선택해주세요.');
            return;
        }

        // 팀 생성 데이터 준비
        const teamData = {
            teamName: teamName,
            teamType: teamType,
            teamLeaderIdx: teamLeaderIdx ? parseInt(teamLeaderIdx) : null,
            teamDescription: teamDescription,
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

    // 유틸리티 함수
    function getInitial(name) {
        if (!name) return '?';
        return name.charAt(0);
    }
});
