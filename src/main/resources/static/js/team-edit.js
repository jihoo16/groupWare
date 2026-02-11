// 팀 수정 페이지 스크립트
document.addEventListener('DOMContentLoaded', async function() {
    // URL에서 팀 ID 추출
    const pathParts = window.location.pathname.split('/');
    const teamIdx = parseInt(pathParts[pathParts.length - 1]);

    if (!teamIdx || isNaN(teamIdx)) {
        showError('잘못된 팀 ID입니다.');
        window.location.href = '/team';
        return;
    }

    // 전역 변수 CURRENT_USER 사용 (layout.html에서 주입됨)
    if (!window.CURRENT_USER || !window.CURRENT_USER.idx) {
        console.warn('세션 정보가 없습니다.');
        window.location.href = '/login';
        return;
    }

    const currentUserIdx = window.CURRENT_USER.idx;
    console.log('현재 로그인 사용자:', window.CURRENT_USER.empName, '(idx:', currentUserIdx, ')');

    // 상태 변수
    let currentTeam = null;
    let allEmployees = [];
    let selectedEmployees = new Map();
    let teamMembers = [];

    // DOM 요소
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const formContent = document.getElementById('formContent');
    const retryBtn = document.getElementById('retryBtn');

    const teamForm = document.getElementById('teamForm');
    const teamNameInput = document.getElementById('teamName');
    const teamLeaderSearch = document.getElementById('teamLeaderSearch');
    const teamLeaderHidden = document.getElementById('teamLeader');
    const teamLeaderDropdown = document.getElementById('teamLeaderDropdown');
    const isActiveSelect = document.getElementById('isActive');
    const teamDescriptionInput = document.getElementById('teamDescription');
    const teamTableBody = document.getElementById('teamTableBody');

    const backBtn = document.getElementById('backBtn');
    const submitBtn = document.getElementById('submitBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const addMemberBtn = document.getElementById('addMemberBtn');

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

    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const closeDeleteModal = document.getElementById('closeDeleteModal');
    const cancelDeleteBtnModal = document.getElementById('cancelDeleteBtnModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    // 초기화
    window.showPageLoadingOverlay();
    init();

    // 이벤트 리스너
    backBtn.addEventListener('click', () => {
        window.location.href = '/team';
    });


    deleteBtn.addEventListener('click', () => {
        deleteConfirmModal.classList.add('active');
    });

    closeDeleteModal.addEventListener('click', () => {
        deleteConfirmModal.classList.remove('active');
    });

    cancelDeleteBtnModal.addEventListener('click', () => {
        deleteConfirmModal.classList.remove('active');
    });

    confirmDeleteBtn.addEventListener('click', handleDelete);

    retryBtn.addEventListener('click', () => {
        init();
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

    deleteConfirmModal.addEventListener('click', (e) => {
        if (e.target === deleteConfirmModal) {
            deleteConfirmModal.classList.remove('active');
        }
    });

    // 초기화 함수
    async function init() {
        showLoading();

        try {
            await Promise.all([
                loadEmployees(),
                loadTeamData()
            ]);

            initTeamLeaderDropdown();
            initColorPicker();
            populateForm();
            showForm();

            // 로딩 오버레이 숨김
            window.hidePageLoadingOverlay();
        } catch (error) {
            console.error('초기화 중 오류:', error);
            showError();
            window.hidePageLoadingOverlay();
        }
    }

    // 전체 직원 목록 로드
    async function loadEmployees() {
        const response = await fetch('/api/users');
        if (!response.ok) {
            throw new Error('직원 목록 로드 실패');
        }
        allEmployees = await response.json();
        console.log('Loaded employees:', allEmployees.length);
    }

    // 팀 데이터 로드
    async function loadTeamData() {
        const currentTeam = await window.fetchWithErrorHandling(`/api/teams/${teamIdx}`);

        if (!currentTeam) {
            // Error already handled by fetchWithErrorHandling (404, 403, 500)
            throw new Error('팀 정보 로드 실패');
        }

        window.currentTeam = currentTeam;
        console.log('Loaded team:', currentTeam);

        // 팀원 목록 변환
        if (currentTeam.members && currentTeam.members.length > 0) {
            teamMembers = currentTeam.members.map(member => ({
                idx: member.memberIdx,
                empName: member.memberName,
                empDept: member.memberDeptName,
                empPosition: member.memberPositionName,
                role: member.role || '',
                teamMemberIdx: member.idx // 팀 멤버 고유 ID
            }));
        }
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

    // 직급 순서 정의
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

    // 팀 리더 드롭다운 렌더링
    function renderTeamLeaderDropdown(searchTerm) {
        // 직급으로 정렬
        let sortedEmployees = [...allEmployees].sort((a, b) => {
            const posA = getPositionOrder(a.empPositionName || a.empPosition || '미지정');
            const posB = getPositionOrder(b.empPositionName || b.empPosition || '미지정');
            if (posA !== posB) return posA - posB;
            return (a.empName || '').localeCompare(b.empName || '');
        });

        // 검색어로 필터링
        if (searchTerm) {
            sortedEmployees = sortedEmployees.filter(emp => {
                const name = (emp.empName || '').toLowerCase();
                const dept = (emp.empDeptName || emp.empDept || '').toLowerCase();
                const position = (emp.empPositionName || emp.empPosition || '').toLowerCase();
                return name.includes(searchTerm) || dept.includes(searchTerm) || position.includes(searchTerm);
            });
        }

        if (sortedEmployees.length === 0) {
            teamLeaderDropdown.innerHTML = '<div class="team-leader-dropdown-empty">검색 결과가 없습니다.</div>';
            return;
        }

        const html = sortedEmployees.map(emp => {
            const isSelected = teamLeaderHidden.value == emp.idx;
            const deptName = emp.empDeptName || emp.empDept || '미지정';
            const positionName = emp.empPositionName || emp.empPosition || '미지정';
            return `
                <div class="team-leader-item ${isSelected ? 'selected' : ''}" data-idx="${emp.idx}" data-name="${emp.empName}">
                    <div class="team-leader-item-name">${emp.empName}</div>
                    <div class="team-leader-item-info">${deptName} · ${positionName}</div>
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
                empDept: employee.empDeptName || employee.empDept,
                empPosition: employee.empPositionName || employee.empPosition,
                role: '팀장'
            });
        }

        // 테이블 재렌더링
        renderTeamMembersTable();
    }

    // 폼에 데이터 채우기
    function populateForm() {
        teamNameInput.value = currentTeam.teamName || '';
        teamLeaderHidden.value = currentTeam.teamLeaderIdx || '';

        // 팀 리더 이름 표시
        if (currentTeam.teamLeaderIdx) {
            const leader = allEmployees.find(emp => emp.idx === currentTeam.teamLeaderIdx);
            if (leader) {
                teamLeaderSearch.value = leader.empName;
            }
        }

        isActiveSelect.value = currentTeam.isActive || 'Y';
        teamDescriptionInput.value = currentTeam.teamDescription || '';

        // 팀 색상 설정
        const teamColor = currentTeam.teamColor || '#FFD1DC';
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

        teamColorInput.value = teamColor;
        colorPreviewBox.style.backgroundColor = teamColor;
        colorPreviewName.textContent = colorNames[teamColor] || '파스텔 핑크';

        // 해당 색상 옵션 선택 표시
        document.querySelectorAll('.color-option').forEach(option => {
            if (option.getAttribute('data-color') === teamColor) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });

        renderTeamMembersTable();
    }

    // 상태 표시 함수들
    function showLoading() {
        loadingState.style.display = 'block';
        errorState.style.display = 'none';
        formContent.style.display = 'none';
    }

    function showError() {
        loadingState.style.display = 'none';
        errorState.style.display = 'block';
        formContent.style.display = 'none';
    }

    function showForm() {
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
        formContent.style.display = 'block';
        formActions.style.display = 'flex';
    }

    // 팀원 선택 모달 열기
    async function openEmployeeSelectionModal() {
        selectedEmployees.clear();

        // 이미 추가된 팀원들을 선택 목록에 추가
        teamMembers.forEach(member => {
            selectedEmployees.set(member.idx, {
                empName: member.empName,
                empDept: member.empDept || '미지정',
                empPosition: member.empPosition || '미지정',
                idx: member.idx
            });
        });

        renderEmployeeTree(); // 이 안에서 updateEmployeeTreeCheckboxes() 호출됨
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
        const employeesByDept = {};

        allEmployees.forEach(emp => {
            const dept = emp.empDept || '미지정';
            if (!employeesByDept[dept]) {
                employeesByDept[dept] = [];
            }
            employeesByDept[dept].push(emp);
        });

        const sortedDepts = Object.keys(employeesByDept).sort((a, b) => {
            if (a === '미지정') return 1;
            if (b === '미지정') return -1;
            return a.localeCompare(b);
        });

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

        // 이미 선택된 직원들의 체크박스 체크
        updateEmployeeTreeCheckboxes();
    }

    // 직원 트리 체크박스 상태 업데이트
    function updateEmployeeTreeCheckboxes() {
        selectedEmployees.forEach((employee, empIdx) => {
            const checkbox = document.getElementById(`emp-${empIdx}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
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
            if (!teamMembers.find(m => m.idx === empIdx)) {
                teamMembers.push({
                    idx: employee.idx,
                    empName: employee.empName,
                    empDept: employee.empDept,
                    empPosition: employee.empPosition,
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
        const teamName = teamNameInput.value.trim();
        const teamLeaderIdx = teamLeaderHidden.value;
        const teamDescription = teamDescriptionInput.value.trim();
        const isActive = isActiveSelect.value;

        if (!teamName) {
            await showWarning('팀 이름을 입력해주세요.');
            return;
        }

        // 팀 색상 가져오기
        const teamColor = document.getElementById('teamColor').value || '#FFD1DC';

        // 팀 수정 데이터 준비
        const teamData = {
            teamName: teamName,
            teamLeaderIdx: teamLeaderIdx ? parseInt(teamLeaderIdx) : null,
            teamDescription: teamDescription,
            teamColor: teamColor,
            isActive: isActive,
            createdUserIdx: currentUserIdx,
            members: teamMembers.map(member => ({
                memberIdx: member.idx,
                role: member.role || null
            }))
        };

        console.log('Updating team:', teamData);

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';

            const response = await fetch(`/api/teams/${teamIdx}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(teamData)
            });

            if (!response.ok) {
                throw new Error('팀 수정 실패');
            }

            const result = await response.json();
            console.log('Team updated:', result);

            await showSuccess('팀이 성공적으로 수정되었습니다.');
            window.location.href = '/team';

        } catch (error) {
            console.error('팀 수정 중 오류:', error);
            await showError('팀 수정에 실패했습니다. 다시 시도해주세요.');

            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> 저장';
        }
    }

    // 팀 삭제 처리
    async async function handleDelete() {
        try {
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 삭제 중...';

            const response = await fetch(`/api/teams/${teamIdx}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('팀 삭제 실패');
            }

            await showSuccess('팀이 삭제되었습니다.');
            window.location.href = '/team';

        } catch (error) {
            console.error('팀 삭제 중 오류:', error);
            await showError('팀 삭제에 실패했습니다. 다시 시도해주세요.');

            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = '<i class="fas fa-trash"></i> 삭제';
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
