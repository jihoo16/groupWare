// 신규 팀 생성 페이지 스크립트
document.addEventListener('DOMContentLoaded', function() {
    // 상태 변수
    let allEmployees = [];
    let selectedEmployees = new Map(); // key: memberIdx, value: employee object
    let teamMembers = []; // 테이블에 추가된 팀원 목록

    // DOM 요소
    const teamForm = document.getElementById('teamForm');
    const teamLeaderSelect = document.getElementById('teamLeader');
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
        populateTeamLeaderSelect();
    }

    // 전체 직원 목록 로드
    async function loadEmployees() {
        try {
            const response = await fetch('/api/users');
            if (!response.ok) {
                throw new Error('직원 목록 로드 실패');
            }
            allEmployees = await response.json();
            console.log('Loaded employees:', allEmployees.length);
        } catch (error) {
            console.error('직원 목록 로드 중 오류:', error);
            alert('직원 목록을 불러오는데 실패했습니다.');
        }
    }

    // 팀 리더 선택 옵션 채우기
    function populateTeamLeaderSelect() {
        teamLeaderSelect.innerHTML = '<option value="">선택하세요</option>';

        // 직급 순서 정의 (높은 순서대로)
        const positionOrder = {
            '대표이사': 1,
            '이사': 2,
            '부장': 3,
            '차장': 4,
            '과장': 5,
            '대리': 6,
            '주임': 7,
            '사원': 8
        };

        // 직급으로 정렬
        const sortedEmployees = [...allEmployees].sort((a, b) => {
            const posA = positionOrder[a.empPosition] || 999;
            const posB = positionOrder[b.empPosition] || 999;
            if (posA !== posB) return posA - posB;
            return (a.empName || '').localeCompare(b.empName || '');
        });

        sortedEmployees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.idx;
            option.textContent = `${emp.empName} (${emp.empDept || '미지정'} / ${emp.empPosition || '미지정'})`;
            teamLeaderSelect.appendChild(option);
        });
    }

    // 팀원 선택 모달 열기
    async function openEmployeeSelectionModal() {
        selectedEmployees.clear();
        renderEmployeeTree();
        updateSelectedEmployeesList();
        employeeSelectionModal.classList.add('active');
    }

    // 모달 닫기
    function closeModal() {
        employeeSelectionModal.classList.remove('active');
        employeeSearch.value = '';
    }

    // 조직도 트리 렌더링
    function renderEmployeeTree() {
        // 부서별로 그룹화
        const employeesByDept = {};

        allEmployees.forEach(emp => {
            const dept = emp.empDept || '미지정';
            if (!employeesByDept[dept]) {
                employeesByDept[dept] = [];
            }
            employeesByDept[dept].push(emp);
        });

        // 부서 정렬
        const sortedDepts = Object.keys(employeesByDept).sort((a, b) => {
            if (a === '미지정') return 1;
            if (b === '미지정') return -1;
            return a.localeCompare(b);
        });

        // HTML 생성
        let html = '';
        sortedDepts.forEach(dept => {
            const employees = employeesByDept[dept];

            html += `
                <div class="tree-department">
                    <div class="tree-department-header" onclick="toggleDepartment(this)">
                        <span class="toggle-icon">
                            <i class="fas fa-chevron-right"></i>
                        </span>
                        <span class="dept-name">${dept}</span>
                        <span class="dept-count">${employees.length}명</span>
                    </div>
                    <div class="tree-employees">
                        ${employees.map(emp => `
                            <div class="tree-employee" data-emp-idx="${emp.idx}">
                                <input type="checkbox"
                                    id="emp-${emp.idx}"
                                    data-emp-idx="${emp.idx}"
                                    onchange="toggleEmployeeSelection(${emp.idx})">
                                <label for="emp-${emp.idx}" class="emp-info">
                                    <div class="emp-name">${emp.empName}</div>
                                    <div class="emp-position">${emp.empPosition || '직급 미지정'}</div>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        employeeOrgTree.innerHTML = html;
    }

    // 부서 펼치기/접기
    window.toggleDepartment = function(header) {
        const department = header.parentElement;
        const employees = department.querySelector('.tree-employees');
        const icon = header.querySelector('.toggle-icon i');

        if (employees.classList.contains('expanded')) {
            employees.classList.remove('expanded');
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-right');
        } else {
            employees.classList.add('expanded');
            icon.classList.remove('fa-chevron-right');
            icon.classList.add('fa-chevron-down');
        }
    };

    // 직원 선택/해제
    window.toggleEmployeeSelection = function(empIdx) {
        const employee = allEmployees.find(emp => emp.idx === empIdx);
        if (!employee) return;

        const checkbox = document.getElementById(`emp-${empIdx}`);
        const treeEmployee = document.querySelector(`.tree-employee[data-emp-idx="${empIdx}"]`);

        if (checkbox.checked) {
            selectedEmployees.set(empIdx, employee);
            treeEmployee.classList.add('selected');
        } else {
            selectedEmployees.delete(empIdx);
            treeEmployee.classList.remove('selected');
        }

        updateSelectedEmployeesList();
    };

    // 선택된 팀원 목록 업데이트
    function updateSelectedEmployeesList() {
        selectedCount.textContent = selectedEmployees.size;

        if (selectedEmployees.size === 0) {
            selectedEmployeesList.innerHTML = '<p class="empty-message">선택된 팀원이 없습니다.</p>';
            return;
        }

        const html = Array.from(selectedEmployees.values()).map(emp => `
            <div class="selected-employee-item">
                <div class="selected-employee-avatar">${getInitial(emp.empName)}</div>
                <div class="selected-employee-info">
                    <div class="selected-employee-name">${emp.empName}</div>
                    <div class="selected-employee-dept">${emp.empDept || '부서 미지정'} · ${emp.empPosition || '직급 미지정'}</div>
                </div>
                <button type="button" class="btn-remove-selected" onclick="removeSelectedEmployee(${emp.idx})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        selectedEmployeesList.innerHTML = html;
    }

    // 선택된 팀원 제거
    window.removeSelectedEmployee = function(empIdx) {
        selectedEmployees.delete(empIdx);
        const checkbox = document.getElementById(`emp-${empIdx}`);
        if (checkbox) {
            checkbox.checked = false;
        }
        const treeEmployee = document.querySelector(`.tree-employee[data-emp-idx="${empIdx}"]`);
        if (treeEmployee) {
            treeEmployee.classList.remove('selected');
        }
        updateSelectedEmployeesList();
    };

    // 직원 검색 필터
    function filterEmployees() {
        const searchTerm = employeeSearch.value.toLowerCase().trim();

        const departments = employeeOrgTree.querySelectorAll('.tree-department');

        departments.forEach(dept => {
            const employees = dept.querySelectorAll('.tree-employee');
            let hasVisibleEmployee = false;

            employees.forEach(empEl => {
                const empIdx = parseInt(empEl.getAttribute('data-emp-idx'));
                const employee = allEmployees.find(e => e.idx === empIdx);

                if (!employee) {
                    empEl.style.display = 'none';
                    return;
                }

                const nameMatch = (employee.empName || '').toLowerCase().includes(searchTerm);
                const deptMatch = (employee.empDept || '').toLowerCase().includes(searchTerm);
                const posMatch = (employee.empPosition || '').toLowerCase().includes(searchTerm);

                if (searchTerm === '' || nameMatch || deptMatch || posMatch) {
                    empEl.style.display = 'flex';
                    hasVisibleEmployee = true;
                } else {
                    empEl.style.display = 'none';
                }
            });

            // 부서에 보이는 직원이 있으면 자동으로 펼치기
            if (hasVisibleEmployee && searchTerm !== '') {
                dept.querySelector('.tree-employees').classList.add('expanded');
                dept.querySelector('.toggle-icon i').classList.remove('fa-chevron-right');
                dept.querySelector('.toggle-icon i').classList.add('fa-chevron-down');
                dept.style.display = 'block';
            } else if (!hasVisibleEmployee) {
                dept.style.display = searchTerm === '' ? 'block' : 'none';
            }
        });
    }

    // 전체 선택
    function selectAllEmployees() {
        const visibleCheckboxes = Array.from(employeeOrgTree.querySelectorAll('.tree-employee'))
            .filter(el => el.style.display !== 'none')
            .map(el => el.querySelector('input[type="checkbox"]'));

        const allChecked = visibleCheckboxes.every(cb => cb.checked);

        visibleCheckboxes.forEach(checkbox => {
            const empIdx = parseInt(checkbox.getAttribute('data-emp-idx'));
            const employee = allEmployees.find(emp => emp.idx === empIdx);

            if (allChecked) {
                checkbox.checked = false;
                selectedEmployees.delete(empIdx);
                checkbox.closest('.tree-employee').classList.remove('selected');
            } else {
                checkbox.checked = true;
                selectedEmployees.set(empIdx, employee);
                checkbox.closest('.tree-employee').classList.add('selected');
            }
        });

        updateSelectedEmployeesList();
    }

    // 전체 펼치기/접기
    function toggleExpandAll() {
        const departments = employeeOrgTree.querySelectorAll('.tree-department');
        const allExpanded = Array.from(departments).every(dept =>
            dept.querySelector('.tree-employees').classList.contains('expanded')
        );

        departments.forEach(dept => {
            const employees = dept.querySelector('.tree-employees');
            const icon = dept.querySelector('.toggle-icon i');

            if (allExpanded) {
                employees.classList.remove('expanded');
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-right');
            } else {
                employees.classList.add('expanded');
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-down');
            }
        });

        expandAllBtn.innerHTML = allExpanded
            ? '<i class="fas fa-plus-square"></i> 전체 펼치기'
            : '<i class="fas fa-minus-square"></i> 전체 접기';
    }

    // 전체 선택 해제
    function clearAllSelected() {
        selectedEmployees.clear();

        employeeOrgTree.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        employeeOrgTree.querySelectorAll('.tree-employee').forEach(emp => {
            emp.classList.remove('selected');
        });

        updateSelectedEmployeesList();
    }

    // 선택 완료
    function confirmSelection() {
        selectedEmployees.forEach((employee, empIdx) => {
            // 이미 추가된 팀원인지 확인
            if (!teamMembers.find(m => m.idx === empIdx)) {
                teamMembers.push({
                    idx: employee.idx,
                    empName: employee.empName,
                    empDept: employee.empDept,
                    empPosition: employee.empPosition,
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
