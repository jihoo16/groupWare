// 일정 수정 페이지 스크립트
document.addEventListener('DOMContentLoaded', function() {
    // URL에서 일정 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const scheduleId = urlParams.get('id');

    if (!scheduleId) {
        alert('일정 ID가 없습니다.');
        window.location.href = '/calendar';
        return;
    }

    // 현재 사용자 정보 (실제로는 세션에서 가져와야 함)
    const currentUser = '사용자'; // TODO: 실제 로그인 사용자 정보로 변경
    const currentUserIdx = 1; // TODO: 실제 로그인 사용자 IDX로 변경

    // 참여자 관련 변수 (객체 배열: { id, name, department, rank })
    let selectedParticipants = [];

    // 알림 관련 변수
    let notificationEnabled = false;
    let notificationTime = 10;

    // DOM 요소
    const scheduleForm = document.getElementById('editScheduleForm');
    const backBtn = document.getElementById('backBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const deleteBtn = document.getElementById('deleteScheduleBtn');
    const saveBtn = document.getElementById('saveScheduleBtn');

    // 종일 체크박스 관련 요소
    const isAllDayCheckbox = document.getElementById('isAllDayCheckbox');
    const timeInputRow = document.getElementById('timeInputRow');
    const scheduleStartTime = document.getElementById('scheduleStartTime');
    const scheduleEndTime = document.getElementById('scheduleEndTime');

    // 알림 관련 요소
    const notificationToggleBtn = document.getElementById('notificationToggleBtn');
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

    // 직급별 뱃지 스타일 클래스 반환 (hr.css와 동일)
    function getPositionBadgeClass(position) {
        if (position === '대표이사') {
            return 'ceo';
        }
        if (['부사장', '전무', '상무'].includes(position)) {
            return 'seniorExec'; // 보라색
        }
        if (position === '이사') {
            return 'executive'; // 파란색
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
        return 'staff'; // 기본값
    }

    // 사용자 배열을 조직도 데이터 구조로 변환 (부서별로만 그룹화, 직급순 정렬)
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
                // 같은 직급이면 이름순
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
            // 종일로 변경 시 시간 필드 초기화
            scheduleStartTime.value = '';
            scheduleEndTime.value = '';
        } else {
            // 시간 일정으로 변경 시 기본값 설정
            if (!scheduleStartTime.value) scheduleStartTime.value = '09:00';
            if (!scheduleEndTime.value) scheduleEndTime.value = '18:00';
        }
    });

    // 날짜 입력 필드 클릭 시 날짜 선택 UI 즉시 열기
    const scheduleStartDate = document.getElementById('scheduleStartDate');
    const scheduleEndDate = document.getElementById('scheduleEndDate');

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

    // 시작 날짜 변경 시 종료 날짜의 최소값 설정
    scheduleStartDate.addEventListener('change', function() {
        const startDate = this.value;
        if (startDate) {
            // 종료 날짜의 최소값을 시작 날짜로 설정
            scheduleEndDate.min = startDate;

            // 종료 날짜가 시작 날짜보다 이전이면 시작 날짜로 자동 조정
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

    // 시간 입력 필드 클릭 시 시간 선택 UI 즉시 열기
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

    // 시간 입력 필드 활성화/비활성화 함수
    function toggleTimeInputs(enabled) {
        scheduleStartTime.disabled = !enabled;
        scheduleEndTime.disabled = !enabled;

        if (enabled) {
            timeInputRow.style.opacity = '1';
            scheduleStartTime.style.cursor = 'text';
            scheduleEndTime.style.cursor = 'text';
        } else {
            timeInputRow.style.opacity = '0.5';
            scheduleStartTime.style.cursor = 'not-allowed';
            scheduleEndTime.style.cursor = 'not-allowed';
        }
    }

    // 페이지 초기화
    async function initializePage() {
        // HTML에 이미 로딩 UI가 있음 (참석자 섹션)

        // 1. 사용자 데이터 먼저 로드
        await loadUserData();

        // 2. 일정 데이터 로드 (완료 후 renderParticipantsList()가 호출되어 로딩 UI 대체)
        await loadScheduleData(scheduleId);
    }

    // 페이지 로드 시 초기화
    initializePage();

    // 일정 정보 로드 함수
    async function loadScheduleData(id) {
        try {
            const response = await fetch(`/api/calendar/events/${id}`);
            const data = await response.json();

            if (data.success) {
                const schedule = data.event;

                // 폼 필드에 값 설정
                document.getElementById('scheduleTitle').value = schedule.eventTitle || '';
                document.getElementById('scheduleType').value = schedule.eventType || 'business';
                document.getElementById('scheduleStartDate').value = schedule.startDate || '';
                document.getElementById('scheduleEndDate').value = schedule.endDate || '';
                document.getElementById('scheduleLocation').value = schedule.location || '';
                document.getElementById('scheduleDescription').value = schedule.eventDescription || '';

                // 종일 일정 체크
                const isAllDay = schedule.isAllDay || (!schedule.startTime && !schedule.endTime);
                isAllDayCheckbox.checked = isAllDay;

                if (isAllDay) {
                    // 종일 일정이면 시간 입력 비활성화
                    scheduleStartTime.value = '';
                    scheduleEndTime.value = '';
                    toggleTimeInputs(false);
                } else {
                    // 시간 일정이면 시간 값 설정
                    scheduleStartTime.value = schedule.startTime || '09:00';
                    scheduleEndTime.value = schedule.endTime || '18:00';
                    toggleTimeInputs(true);
                }

                // 참석자 목록 설정
                if (schedule.participants && Array.isArray(schedule.participants)) {
                    selectedParticipants = schedule.participants.map(p => {
                        const participantName = typeof p === 'string' ? p : (p.userName || p.name || '');

                        // allUsers 배열에서 참석자 정보 찾기
                        const user = allUsers.find(u => u.empName === participantName);

                        if (user) {
                            return {
                                id: user.idx,
                                name: user.empName,
                                department: user.empDeptName || '미지정',
                                rank: user.empPositionName || '미지정'
                            };
                        }

                        // 찾지 못한 경우 기본값
                        return {
                            id: Date.now() + Math.random(), // 임시 ID
                            name: participantName,
                            department: '미지정',
                            rank: '미지정'
                        };
                    }).filter(p => p.name !== '');
                } else {
                    selectedParticipants = [];
                }
                renderParticipantsList();

                // 알림 설정
                notificationEnabled = schedule.notificationYn === 'Y';
                notificationTime = schedule.notificationMinutes || 10;
                updateNotificationButton();

                // 알림 시간 버튼 설정
                notificationTimeBtns.forEach(btn => {
                    btn.classList.remove('active');
                    if (parseInt(btn.getAttribute('data-time')) === notificationTime) {
                        btn.classList.add('active');
                    }
                });
            } else {
                alert('일정 정보를 불러올 수 없습니다: ' + data.message);
                window.location.href = '/calendar';
            }
        } catch (error) {
            console.error('일정 로드 중 오류:', error);
            alert('일정 정보를 불러오는 중 오류가 발생했습니다.');
            window.location.href = '/calendar';
        }
    }

    // 알림 토글 버튼 이벤트
    notificationToggleBtn.addEventListener('click', function() {
        notificationEnabled = !notificationEnabled;
        updateNotificationButton();
    });

    // 알림 버튼 상태 업데이트
    function updateNotificationButton() {
        const icon = notificationToggleBtn.querySelector('i');
        const statusText = notificationToggleBtn.querySelector('.notification-status');

        if (notificationEnabled) {
            notificationToggleBtn.classList.add('active');
            icon.className = 'fas fa-bell';
            statusText.textContent = '알림 켜짐';
            notificationTimeButtons.style.display = 'flex';
        } else {
            notificationToggleBtn.classList.remove('active');
            icon.className = 'far fa-bell-slash';
            statusText.textContent = '알림 꺼짐';
            notificationTimeButtons.style.display = 'none';
        }
    }

    // 알림 시간 버튼 이벤트
    notificationTimeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 모든 버튼에서 active 클래스 제거
            notificationTimeBtns.forEach(b => b.classList.remove('active'));

            // 클릭된 버튼에 active 클래스 추가
            this.classList.add('active');

            // 알림 시간 저장
            notificationTime = parseInt(this.getAttribute('data-time'));
        });
    });

    // Open employee selection modal
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
        console.log('Close button clicked');
        closeEmployeeSelectionModalFn();
    });

    cancelEmployeeSelection.addEventListener('click', function() {
        console.log('Cancel button clicked');
        closeEmployeeSelectionModalFn();
    });

    // Close modal when clicking outside
    employeeSelectionModal.addEventListener('click', function(e) {
        if (e.target === employeeSelectionModal) {
            console.log('Clicked outside modal');
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
        console.log('Clear all button clicked');
        tempSelectedEmployees = [];
        updateSelectedEmployeesList();
        updateOrgTreeCheckboxes();
        updateSelectAllButtonState();
    });

    // Select all employees (toggle)
    const selectAllBtn = document.getElementById('selectAllBtn');
    selectAllBtn.addEventListener('click', function() {
        console.log('Select all/deselect all button clicked');

        // 전체 직원 수 계산
        let totalEmployees = 0;
        organizationData.departments.forEach(dept => {
            if (dept.members && dept.members.length > 0) {
                totalEmployees += dept.members.length;
            }
        });

        // 현재 모든 직원이 선택되어 있는지 확인
        const allSelected = tempSelectedEmployees.length === totalEmployees;

        if (allSelected) {
            // 전체 해제
            console.log('Deselecting all employees');
            tempSelectedEmployees = [];
            this.innerHTML = '<i class="fas fa-check-double"></i> 전체 선택';
        } else {
            // 전체 선택
            console.log('Selecting all employees');
            tempSelectedEmployees = [];

            // organizationData의 모든 departments를 순회하며 직원 추가
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

        console.log('Selected employees count:', tempSelectedEmployees.length);
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

        // Expand first department
        setTimeout(() => {
            const firstDept = employeeOrgTree.querySelector('.tree-node.department');
            if (firstDept) firstDept.classList.add('expanded');
        }, 100);
    }

    // Create department node (직급 레벨 제거, 부서 아래 바로 직원 표시)
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
        console.log("``````````member``````````")
        console.log(member)
        node.setAttribute('data-id', member.id);
        node.setAttribute('data-member', JSON.stringify(member));

        const isChecked = tempSelectedEmployees.some(emp => emp.id === member.id);

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
            // data-member 속성에서 member 정보 가져오기
            const memberData = JSON.parse(node.getAttribute('data-member'));
            console.log('Checkbox changed for:', memberData.name, 'checked:', this.checked);

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
        const toggle = header.querySelector('.tree-toggle');

        if (!toggle || toggle.classList.contains('invisible')) return;

        // Make the entire header clickable for department and position nodes
        header.addEventListener('click', (e) => {
            // Don't toggle if clicking on checkbox
            if (e.target.classList.contains('employee-checkbox')) {
                return;
            }
            e.stopPropagation();
            node.classList.toggle('expanded');
        });
    }

    // Update select all button text based on selection state
    function updateSelectAllButtonState() {
        const selectAllBtn = document.getElementById('selectAllBtn');
        if (!selectAllBtn) return;

        // 전체 직원 수 계산
        let totalEmployees = 0;
        organizationData.departments.forEach(dept => {
            if (dept.members && dept.members.length > 0) {
                totalEmployees += dept.members.length;
            }
        });

        // 현재 모든 직원이 선택되어 있는지 확인
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
            selectedEmployeesList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">선택된 직원이 없습니다.</p>';
        } else {
            selectedEmployeesList.innerHTML = tempSelectedEmployees.map(emp => `
                <div class="selected-employee-item">
                    <span class="employee-name">${emp.name} (${emp.department})</span>
                    <button type="button" class="remove-employee-btn" data-id="${emp.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');

            // Attach remove button events
            selectedEmployeesList.querySelectorAll('.remove-employee-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.getAttribute('data-id'));
                    console.log('Remove button clicked for id:', id);
                    tempSelectedEmployees = tempSelectedEmployees.filter(emp => emp.id !== id);
                    updateSelectedEmployeesList();
                    updateOrgTreeCheckboxes();
                    updateSelectAllButtonState();
                });
            });
        }

        // 버튼 상태 업데이트
        updateSelectAllButtonState();
    }

    // Update org tree checkboxes based on selected employees
    function updateOrgTreeCheckboxes() {
        const checkboxes = employeeOrgTree.querySelectorAll('.employee-checkbox');
        checkboxes.forEach(checkbox => {
            const id = parseInt(checkbox.getAttribute('data-id'));
            checkbox.checked = tempSelectedEmployees.some(emp => emp.id === id);
        });
    }

    // Expand/collapse all
    expandAllBtn.addEventListener('click', function() {
        console.log('Expand/collapse all button clicked');
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
        console.log('Search input:', this.value);
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

                    // Expand parent nodes
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

    // 참여자 목록 렌더링 (테이블 형태)
    function renderParticipantsList() {
        console.log('renderParticipantsList called, selectedParticipants:', selectedParticipants);
        if (!participantsList) return;

        participantsList.innerHTML = '';

        const tableContainer = document.createElement('div');
        tableContainer.className = 'participants-table-container';

        const table = document.createElement('table');
        table.className = 'participants-table';

        // 테이블 헤더
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

        // 테이블 바디
        const tbody = document.createElement('tbody');

        if (selectedParticipants.length === 0) {
            // 참석자가 없을 때 empty row 표시
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
            // 참석자 목록 표시
            selectedParticipants.forEach((participant, index) => {
                console.log(`Participant ${index}:`, participant);
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

            // 삭제 버튼 이벤트
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

        // 참석자 추가 버튼 - 참석자가 있을 때만 테이블 외부에 표시
        if (selectedParticipants.length > 0) {
            const addButtonWrapper = document.createElement('div');
            addButtonWrapper.className = 'participants-add-button-wrapper';
            addButtonWrapper.innerHTML = `
                <button type="button" class="btn-add-participant-external" id="addParticipantBtnInline">
                    <i class="fas fa-user-plus"></i> 참석자 추가
                </button>
            `;
            participantsList.appendChild(addButtonWrapper);

            // 버튼 이벤트
            addButtonWrapper.querySelector('#addParticipantBtnInline').addEventListener('click', function() {
                addParticipantBtn.click();
            });
        }
    }

    // 뒤로가기/취소 버튼 이벤트
    backBtn.addEventListener('click', function() {
        if (confirm('일정 목록으로 돌아가시겠습니까? 저장하지 않은 변경사항은 사라집니다.')) {
            window.location.href = '/calendar';
        }
    });

    cancelBtn.addEventListener('click', function() {
        if (confirm('일정 목록으로 돌아가시겠습니까? 저장하지 않은 변경사항은 사라집니다.')) {
            window.location.href = '/calendar';
        }
    });

    // 삭제 버튼 이벤트
    deleteBtn.addEventListener('click', async function() {
        if (!confirm('이 일정을 삭제하시겠습니까?')) {
            return;
        }

        try {
            const response = await fetch(`/api/calendar/events/${scheduleId}?userId=${currentUserIdx}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                alert('일정이 삭제되었습니다.');
                window.location.href = '/calendar';
            } else {
                alert('일정 삭제 실패: ' + data.message);
            }
        } catch (error) {
            console.error('일정 삭제 중 오류:', error);
            alert('일정 삭제 중 오류가 발생했습니다.');
        }
    });

    // 저장 버튼 클릭 시 폼 제출
    saveBtn.addEventListener('click', function() {
        scheduleForm.requestSubmit();
    });

    // 저장 버튼 이벤트 (폼 제출)
    scheduleForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // 유효성 검사
        if (!scheduleForm.checkValidity()) {
            scheduleForm.reportValidity();
            return;
        }

        const title = document.getElementById('scheduleTitle').value.trim();
        const type = document.getElementById('scheduleType').value;
        const startDate = document.getElementById('scheduleStartDate').value;
        const endDate = document.getElementById('scheduleEndDate').value;
        const isAllDay = isAllDayCheckbox.checked;
        const startTime = isAllDay ? null : (document.getElementById('scheduleStartTime').value || null);
        const endTime = isAllDay ? null : (document.getElementById('scheduleEndTime').value || null);
        const location = document.getElementById('scheduleLocation').value.trim() || null;
        const description = document.getElementById('scheduleDescription').value.trim() || null;

        // 추가 유효성 검사
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
            notificationYn: notificationEnabled ? 'Y' : 'N',
            notificationMinutes: notificationTime,
            participants: selectedParticipants.map(participant => ({
                userName: participant.name,
                userIdx: participant.id, // member ID를 userIdx로 사용
                receiveNotification: 'Y'
            }))
        };

        try {
            const response = await fetch(`/api/calendar/events/${scheduleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });

            const data = await response.json();

            if (data.success) {
                alert('일정이 성공적으로 수정되었습니다.');
                window.location.href = '/calendar';
            } else {
                alert('일정 수정 실패: ' + data.message);
            }
        } catch (error) {
            console.error('일정 수정 중 오류:', error);
            alert('일정 수정 중 오류가 발생했습니다.');
        }
    });

    // 초기 알림 버튼 상태 설정
    updateNotificationButton();
});
