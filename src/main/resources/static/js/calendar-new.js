// 일정 추가 페이지 스크립트
document.addEventListener('DOMContentLoaded', function() {
    // 현재 사용자 정보 (실제로는 세션에서 가져와야 함)
    const currentUser = '사용자'; // TODO: 실제 로그인 사용자 정보로 변경
    const currentUserIdx = 1; // TODO: 실제 로그인 사용자 IDX로 변경

    // 참여자 관련 변수 (객체 배열: { id, name, department, rank })
    let selectedParticipants = [];

    // 알림 관련 변수
    let notificationEnabled = false;
    let notificationTime = 10;

    // 탭 및 팀 관련 변수
    let currentEventTab = 'personal'; // 'personal' or 'team'
    let selectedTeam = null; // { idx, teamName, teamColor }
    let teamsList = []; // 팀 목록

    // DOM 요소
    const scheduleForm = document.getElementById('newScheduleForm');
    const backBtn = document.getElementById('backBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveBtn = document.getElementById('saveScheduleBtn');

    // 탭 관련 요소
    const eventTypeTabs = document.querySelectorAll('.event-type-tab');
    const teamSelect = document.getElementById('teamSelect');
    const teamColorPreview = document.querySelector('.team-color-preview');
    const teamColorBox = document.querySelector('.team-color-box');
    const teamNamePreview = document.querySelector('.team-name-preview');

    // 종일 체크박스 관련 요소
    const isAllDayCheckbox = document.getElementById('isAllDayCheckbox');
    const timeInputRow = document.getElementById('timeInputRow');
    const scheduleStartTime = document.getElementById('scheduleStartTime');
    const scheduleEndTime = document.getElementById('scheduleEndTime');

    // 알림 관련 요소
    const notificationToggleCheckbox = document.getElementById('notificationToggleCheckbox');
    const notificationTimeButtons = document.getElementById('notificationTimeButtons');
    const notificationTimeBtns = document.querySelectorAll('.notification-time-btn');

    // 참여자 관련 요소
    const addParticipantBtn = document.getElementById('addParticipantBtn');
    const participantsList = document.getElementById('participantsList');

    // Employee selection modal elements
    const employeeSelectionModal = document.getElementById('employeeSelectionModal');
    const closeEmployeeModal = document.getElementById('closeEmployeeModal');
    const cancelEmployeeSelection = document.getElementById('cancelEmployeeSelection');
    const confirmEmployeeSelection = document.getElementById('confirmEmployeeSelection');
    const employeeOrgTree = document.getElementById('employeeOrgTree');
    const employeeSearch = document.getElementById('employeeSearch');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const selectedEmployeesList = document.getElementById('selectedEmployeesList');
    const selectedCount = document.getElementById('selectedCount');
    const clearSelectedBtn = document.getElementById('clearSelectedBtn');

    // Employee selection state
    let tempSelectedEmployees = [];
    let isAllExpanded = false;

    // Organization data - 백엔드에서 로드
    let organizationData = {
        departments: []
    };
    let allUsers = []; // 전체 사용자 목록 (평탄화된 배열)

    // 사용자 데이터 로드
    async function loadUserData() {
        try {
            const response = await fetch('/api/users');
            if (!response.ok) {
                throw new Error('사용자 데이터 로드 실패');
            }
            const users = await response.json();
            allUsers = users;
            console.log('Loaded users from API:', users);

            // organizationData 형식으로 변환
            organizationData = transformUsersToOrgData(users);
            console.log('Transformed organization data:', organizationData);
            return true;
        } catch (error) {
            console.error('사용자 데이터 로드 중 오류:', error);
            showEmployeeLoadError();
            return false;
        }
    }

    // 팀 목록 로드
    async function loadTeamsList() {
        try {
            const response = await fetch('/api/teams');
            if (!response.ok) {
                throw new Error('팀 목록 로드 실패');
            }
            const teams = await response.json();
            teamsList = teams;
            console.log('Loaded teams from API:', teams);

            // 팀 선택 드롭다운 렌더링
            renderTeamSelect();
            return true;
        } catch (error) {
            console.error('팀 목록 로드 중 오류:', error);
            teamSelect.innerHTML = '<option value="">팀 목록을 불러올 수 없습니다</option>';
            return false;
        }
    }

    // 팀 선택 드롭다운 렌더링
    function renderTeamSelect() {
        if (!teamSelect) return;

        teamSelect.innerHTML = '<option value="">팀을 선택하세요</option>';

        teamsList.forEach(team => {
            const option = document.createElement('option');
            option.value = team.idx;
            option.textContent = team.teamName;
            option.dataset.teamColor = team.teamColor;
            teamSelect.appendChild(option);
        });
    }

    // 탭 전환
    function switchEventTab(tabType) {
        currentEventTab = tabType;

        // 탭 버튼 활성화 상태 변경
        eventTypeTabs.forEach(tab => {
            if (tab.dataset.tab === tabType) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // 필드 표시/숨김
        const teamFields = document.querySelectorAll('.team-only');

        if (tabType === 'personal') {
            teamFields.forEach(field => field.style.display = 'none');
            selectedTeam = null;
        } else if (tabType === 'team') {
            teamFields.forEach(field => field.style.display = 'block');
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
        return orderMap[position] || 50; // 정의되지 않은 직급은 중간 순서
    }

    // 직급별 뱃지 스타일 클래스 반환
    function getPositionBadgeClass(position) {
        if (position === '대표이사') return 'ceo';
        if (['부사장', '전무', '상무'].includes(position)) return 'seniorExec';
        if (position === '이사') return 'executive';
        if (position === '부장') return 'director';
        if (position === '차장') return 'seniorManager';
        if (position === '과장') return 'manager';
        if (position === '대리') return 'assistant';
        if (['주임', '사원', '인턴'].includes(position)) return 'staff';
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

    // 종일 체크박스 이벤트
    isAllDayCheckbox.addEventListener('change', function() {
        toggleTimeInputs(!this.checked);

        if (this.checked) {
            scheduleStartTime.value = '';
            scheduleEndTime.value = '';
        } else {
            if (!scheduleStartTime.value) scheduleStartTime.value = '09:00';
            if (!scheduleEndTime.value) scheduleEndTime.value = '18:00';
        }
    });

    // 날짜 입력 필드
    const scheduleStartDate = document.getElementById('scheduleStartDate');
    const scheduleEndDate = document.getElementById('scheduleEndDate');

    // 날짜 필드 클릭 시 picker 열기
    scheduleStartDate.addEventListener('click', function() {
        if (!this.disabled && this.showPicker) {
            this.showPicker();
        }
    });

    scheduleEndDate.addEventListener('click', function() {
        if (!this.disabled && this.showPicker) {
            this.showPicker();
        }
    });

    // 시작 날짜 변경 시 종료 날짜 최소값 설정
    scheduleStartDate.addEventListener('change', function() {
        const startDate = this.value;
        if (startDate) {
            scheduleEndDate.min = startDate;

            if (scheduleEndDate.value && scheduleEndDate.value < startDate) {
                scheduleEndDate.value = startDate;
            }
        }
    });

    // 종료 날짜 변경 시 유효성 검사
    scheduleEndDate.addEventListener('change', function() {
        const startDate = scheduleStartDate.value;
        const endDate = this.value;

        if (startDate && endDate && endDate < startDate) {
            alert('종료 날짜는 시작 날짜보다 이전일 수 없습니다.');
            this.value = startDate;
        }
    });

    // 시간 입력 필드 클릭 시 picker 열기
    scheduleStartTime.addEventListener('click', function() {
        if (!this.disabled && this.showPicker) {
            this.showPicker();
        }
    });

    scheduleEndTime.addEventListener('click', function() {
        if (!this.disabled && this.showPicker) {
            this.showPicker();
        }
    });

    // 시간 입력 필드 활성화/비활성화
    function toggleTimeInputs(enabled) {
        scheduleStartTime.disabled = !enabled;
        scheduleEndTime.disabled = !enabled;

        if (enabled) {
            timeInputRow.style.display = '';
            scheduleStartTime.style.cursor = 'text';
            scheduleEndTime.style.cursor = 'text';
        } else {
            timeInputRow.style.display = 'none';
            scheduleStartTime.style.cursor = 'not-allowed';
            scheduleEndTime.style.cursor = 'not-allowed';
        }
    }

    // 페이지 초기화
    async function initializePage() {
        // 사용자 데이터 로드
        await loadUserData();

        // 오늘 날짜를 기본값으로 설정
        const today = new Date().toISOString().split('T')[0];
        scheduleStartDate.value = today;
        scheduleEndDate.value = today;

        // 참석자 목록 초기 렌더링
        renderParticipantsList();
    }

    // 페이지 로드 시 초기화
    initializePage();

    // 알림 토글 체크박스 이벤트
    if (notificationToggleCheckbox) {
        notificationToggleCheckbox.addEventListener('change', function() {
            notificationEnabled = this.checked;
            if (notificationEnabled) {
                notificationTimeButtons.style.display = 'flex';
            } else {
                notificationTimeButtons.style.display = 'none';
            }
        });
    }

    // 알림 시간 버튼 이벤트
    notificationTimeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            notificationTimeBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            notificationTime = parseInt(this.getAttribute('data-time'));
        });
    });

    // 직원 선택 모달 열기
    addParticipantBtn.addEventListener('click', function() {
        console.log('Opening employee selection modal');
        tempSelectedEmployees = [...selectedParticipants];
        openEmployeeSelectionModal();
    });

    // Employee selection modal functions
    function openEmployeeSelectionModal() {
        console.log('Modal opening...');
        employeeSelectionModal.classList.add('active');
        buildOrgTree();
        updateSelectedEmployeesList();
        updateSelectAllButtonState();
    }

    function closeEmployeeSelectionModalFn() {
        console.log('Modal closing...');
        employeeSelectionModal.classList.remove('active');
        tempSelectedEmployees = [];
        isAllExpanded = false;
    }

    // Modal close handlers
    closeEmployeeModal.addEventListener('click', function() {
        closeEmployeeSelectionModalFn();
    });

    cancelEmployeeSelection.addEventListener('click', function() {
        closeEmployeeSelectionModalFn();
    });

    employeeSelectionModal.addEventListener('click', function(e) {
        if (e.target === employeeSelectionModal) {
            closeEmployeeSelectionModalFn();
        }
    });

    // Confirm employee selection
    confirmEmployeeSelection.addEventListener('click', function() {
        console.log('Confirm button clicked, selected:', tempSelectedEmployees);
        selectedParticipants = [...tempSelectedEmployees];
        renderParticipantsList();
        closeEmployeeSelectionModalFn();
    });

    // Clear all selected employees
    clearSelectedBtn.addEventListener('click', function() {
        tempSelectedEmployees = [];
        updateSelectedEmployeesList();
        updateOrgTreeCheckboxes();
        updateSelectAllButtonState();
    });

    // Select all employees
    const selectAllBtn = document.getElementById('selectAllBtn');
    selectAllBtn.addEventListener('click', function() {
        let totalEmployees = 0;
        organizationData.departments.forEach(dept => {
            if (dept.members && dept.members.length > 0) {
                totalEmployees += dept.members.length;
            }
        });

        const allSelected = tempSelectedEmployees.length === totalEmployees;

        if (allSelected) {
            tempSelectedEmployees = [];
            this.innerHTML = '<i class="fas fa-check-double"></i> 전체 선택';
        } else {
            tempSelectedEmployees = [];
            organizationData.departments.forEach(dept => {
                if (dept.members && dept.members.length > 0) {
                    dept.members.forEach(member => {
                        tempSelectedEmployees.push({
                            id: member.id,
                            name: member.name,
                            department: member.department,
                            rank: member.rank
                        });
                    });
                }
            });
            this.innerHTML = '<i class="fas fa-times-circle"></i> 전체 해제';
        }

        updateSelectedEmployeesList();
        updateOrgTreeCheckboxes();
    });

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

        attachToggleEvent(node);
        return node;
    }

    // Create member node with checkbox
    function createMemberNode(member) {
        const node = document.createElement('div');
        node.className = 'tree-node member';
        node.setAttribute('data-id', member.id);
        node.setAttribute('data-member', JSON.stringify(member));

        const isChecked = tempSelectedEmployees.some(emp => emp.id === member.id);
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
                if (!tempSelectedEmployees.some(emp => emp.id === memberData.id)) {
                    tempSelectedEmployees.push({
                        id: memberData.id,
                        name: memberData.name,
                        department: memberData.department,
                        rank: memberData.rank
                    });
                }
            } else {
                tempSelectedEmployees = tempSelectedEmployees.filter(emp => emp.id !== memberData.id);
            }
            updateSelectedEmployeesList();
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

    // Attach toggle event to node
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

    // Update select all button state
    function updateSelectAllButtonState() {
        const selectAllBtn = document.getElementById('selectAllBtn');
        if (!selectAllBtn) return;

        let totalEmployees = 0;
        organizationData.departments.forEach(dept => {
            if (dept.members && dept.members.length > 0) {
                totalEmployees += dept.members.length;
            }
        });

        const allSelected = tempSelectedEmployees.length === totalEmployees && totalEmployees > 0;

        if (allSelected) {
            selectAllBtn.innerHTML = '<i class="fas fa-times-circle"></i> 전체 해제';
        } else {
            selectAllBtn.innerHTML = '<i class="fas fa-check-double"></i> 전체 선택';
        }
    }

    // Update selected employees list
    function updateSelectedEmployeesList() {
        selectedCount.textContent = tempSelectedEmployees.length;

        if (tempSelectedEmployees.length === 0) {
            selectedEmployeesList.innerHTML = '<p class="empty-message">선택된 직원이 없습니다.</p>';
        } else {
            selectedEmployeesList.innerHTML = tempSelectedEmployees.map(emp => `
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

            selectedEmployeesList.querySelectorAll('.remove-employee-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.getAttribute('data-id'));
                    tempSelectedEmployees = tempSelectedEmployees.filter(emp => emp.id !== id);
                    updateSelectedEmployeesList();
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

    // Update org tree checkboxes
    function updateOrgTreeCheckboxes() {
        const checkboxes = employeeOrgTree.querySelectorAll('.employee-checkbox');
        checkboxes.forEach(checkbox => {
            const id = parseInt(checkbox.getAttribute('data-id'));
            checkbox.checked = tempSelectedEmployees.some(emp => emp.id === id);
        });
    }

    // Expand/collapse all
    expandAllBtn.addEventListener('click', function() {
        const allNodes = employeeOrgTree.querySelectorAll('.tree-node.department, .tree-node.position');

        if (isAllExpanded) {
            allNodes.forEach(node => node.classList.remove('expanded'));
            expandAllBtn.innerHTML = '<i class="fas fa-plus-square"></i> 전체 펼치기';
            isAllExpanded = false;
        } else {
            allNodes.forEach(node => node.classList.add('expanded'));
            expandAllBtn.innerHTML = '<i class="fas fa-minus-square"></i> 전체 접기';
            isAllExpanded = true;
        }
    });

    // Search employees
    employeeSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const allMemberNodes = employeeOrgTree.querySelectorAll('.tree-node.member');

        if (searchTerm === '') {
            allMemberNodes.forEach(node => {
                node.style.display = '';
            });
            return;
        }

        allMemberNodes.forEach(node => {
            try {
                const memberData = JSON.parse(node.getAttribute('data-member'));
                const name = (memberData.name || '').toLowerCase();
                const department = (memberData.department || '').toLowerCase();
                const position = (memberData.position || '').toLowerCase();
                const rank = (memberData.rank || '').toLowerCase();

                if (name.includes(searchTerm) ||
                    department.includes(searchTerm) ||
                    position.includes(searchTerm) ||
                    rank.includes(searchTerm)) {
                    node.style.display = '';

                    let parent = node.parentElement;
                    while (parent) {
                        if (parent.classList.contains('tree-node')) {
                            parent.classList.add('expanded');
                        }
                        parent = parent.parentElement;
                    }
                } else {
                    node.style.display = 'none';
                }
            } catch (error) {
                console.error('Search error:', error);
            }
        });
    });

    // 참여자 목록 렌더링
    function renderParticipantsList() {
        if (!participantsList) return;

        participantsList.innerHTML = '';

        const tableContainer = document.createElement('div');
        tableContainer.className = 'participants-table-container';

        const table = document.createElement('table');
        table.className = 'participants-table';

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th width="60">No</th>
                <th>이름</th>
                <th>부서</th>
                <th width="100">삭제</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        if (selectedParticipants.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-row';
            emptyRow.innerHTML = `
                <td colspan="4">
                    <i class="fas fa-users"></i> 참석자를 추가해주세요
                </td>
            `;
            emptyRow.addEventListener('click', function() {
                addParticipantBtn.click();
            });
            tbody.appendChild(emptyRow);
        } else {
            selectedParticipants.forEach((participant, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${participant.name || 'undefined'}</td>
                    <td>${participant.department || 'undefined'}</td>
                    <td>
                        <button type="button" class="btn-delete" data-id="${participant.id}">
                            <i class="fas fa-trash"></i> 삭제
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            tbody.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.getAttribute('data-id'));
                    selectedParticipants = selectedParticipants.filter(p => p.id !== id);
                    renderParticipantsList();
                });
            });
        }

        table.appendChild(tbody);
        tableContainer.appendChild(table);
        participantsList.appendChild(tableContainer);

        if (selectedParticipants.length > 0) {
            const addButtonWrapper = document.createElement('div');
            addButtonWrapper.className = 'participants-add-button-wrapper';
            addButtonWrapper.innerHTML = `
                <button type="button" class="btn-add-participant-external" id="addParticipantBtnInline">
                    <i class="fas fa-user-plus"></i> 참석자 추가
                </button>
            `;
            participantsList.appendChild(addButtonWrapper);

            addButtonWrapper.querySelector('#addParticipantBtnInline').addEventListener('click', function() {
                addParticipantBtn.click();
            });
        }
    }

    // 뒤로가기/취소 버튼 이벤트
    backBtn.addEventListener('click', function() {
        if (confirm('일정 목록으로 돌아가시겠습니까? 작성 중인 내용은 사라집니다.')) {
            window.location.href = '/calendar';
        }
    });

    cancelBtn.addEventListener('click', function() {
        if (confirm('일정 목록으로 돌아가시겠습니까? 작성 중인 내용은 사라집니다.')) {
            window.location.href = '/calendar';
        }
    });

    // 저장 버튼 클릭 시 폼 제출
    saveBtn.addEventListener('click', function() {
        scheduleForm.requestSubmit();
    });

    // 저장 버튼 이벤트 (폼 제출)
    scheduleForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!scheduleForm.checkValidity()) {
            scheduleForm.reportValidity();
            return;
        }

        const title = document.getElementById('scheduleTitle').value.trim();
        const startDate = document.getElementById('scheduleStartDate').value;
        const endDate = document.getElementById('scheduleEndDate').value;
        const isAllDay = isAllDayCheckbox.checked;
        const startTime = isAllDay ? null : (document.getElementById('scheduleStartTime').value || null);
        const endTime = isAllDay ? null : (document.getElementById('scheduleEndTime').value || null);
        const location = document.getElementById('scheduleLocation').value.trim() || null;
        const description = document.getElementById('scheduleDescription').value.trim() || null;

        // 탭별 유효성 검사 및 데이터 수집
        const type = document.getElementById('scheduleType').value;
        let teamIdx = null;

        if (currentEventTab === 'team') {
            const selectedTeamIdx = teamSelect.value;
            if (!selectedTeamIdx) {
                alert('팀을 선택하세요.');
                return;
            }
            teamIdx = parseInt(selectedTeamIdx);
        }

        // 유효성 검사
        if (!title) {
            alert('일정 제목을 입력하세요.');
            return;
        }

        if (new Date(endDate) < new Date(startDate)) {
            alert('종료 날짜는 시작 날짜보다 이전일 수 없습니다.');
            return;
        }

        // API 요청 데이터 생성
        const eventData = {
            eventTitle: title,
            eventType: type,
            eventDescription: description,
            startDate: startDate,
            endDate: endDate,
            startTime: startTime,
            endTime: endTime,
            isAllDay: isAllDay,
            location: location,
            creatorIdx: currentUserIdx,
            creatorName: currentUser,
            teamIdx: teamIdx, // 팀 일정인 경우 팀 ID, 개인 일정인 경우 null
            notificationYn: notificationEnabled ? 'Y' : 'N',
            notificationMinutes: notificationTime,
            participants: selectedParticipants.map(participant => ({
                userName: participant.name,
                userIdx: participant.id,
                receiveNotification: 'Y'
            }))
        };

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';

            const response = await fetch('/api/calendar/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });

            const data = await response.json();

            if (data.success) {
                alert('일정이 성공적으로 추가되었습니다.');
                window.location.href = '/calendar';
            } else {
                alert('일정 추가 실패: ' + data.message);
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-check"></i> 저장';
            }
        } catch (error) {
            console.error('일정 추가 중 오류:', error);
            alert('일정 추가 중 오류가 발생했습니다.');
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-check"></i> 저장';
        }
    });

    // 탭 클릭 이벤트
    eventTypeTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabType = this.dataset.tab;
            switchEventTab(tabType);
        });
    });

    // 팀 선택 이벤트
    if (teamSelect) {
        teamSelect.addEventListener('change', async function() {
            const selectedIdx = this.value;
            if (!selectedIdx) {
                selectedTeam = null;
                teamColorPreview.style.display = 'none';
                return;
            }

            const team = teamsList.find(t => t.idx === parseInt(selectedIdx));
            if (team) {
                selectedTeam = team;
                teamColorBox.style.backgroundColor = team.teamColor;
                teamNamePreview.textContent = team.teamName;
                teamColorPreview.style.display = 'flex';

                // 팀 멤버 자동 추가
                await loadTeamMembersAsParticipants(parseInt(selectedIdx));
            }
        });
    }

    // 팀 멤버를 참석자로 추가
    async function loadTeamMembersAsParticipants(teamIdx) {
        try {
            const response = await fetch(`/api/teams/${teamIdx}`);
            if (!response.ok) {
                throw new Error('팀 정보 로드 실패');
            }
            const teamData = await response.json();

            if (teamData.members && teamData.members.length > 0) {
                // 기존 참석자 목록 초기화 (중복 방지)
                selectedParticipants = [];

                // 팀 멤버들을 참석자 형식으로 변환하여 추가
                teamData.members.forEach(member => {
                    selectedParticipants.push({
                        id: member.memberIdx,
                        name: member.memberName,
                        department: member.memberDeptName || member.memberDept || '미지정',
                        rank: member.memberPositionName || member.memberPosition || '미지정'
                    });
                });

                // 참석자 목록 UI 업데이트
                renderParticipantsList();

                console.log('팀 멤버 자동 추가:', selectedParticipants);
            }
        } catch (error) {
            console.error('팀 멤버 로드 중 오류:', error);
        }
    }

    // 초기화: 팀 목록 로드
    loadTeamsList();

    // 알림 초기 상태 설정 (기본: 꺼짐)
    if (notificationToggleCheckbox) {
        notificationToggleCheckbox.checked = false;
        notificationTimeButtons.style.display = 'none';
    }
});
