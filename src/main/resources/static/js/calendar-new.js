// 일정 추가 페이지 스크립트
document.addEventListener('DOMContentLoaded', function() {
    // 검색 유틸리티 (공통)
    const searchUtils = new SearchUtils();

    // 전역 변수 CURRENT_USER 사용 (layout.html에서 주입됨)
    if (!window.CURRENT_USER || !window.CURRENT_USER.idx) {
        console.warn('세션 정보가 없습니다.');
        window.location.href = '/login';
        return;
    }

    const currentUserIdx = window.CURRENT_USER.idx;
    const currentUser = window.CURRENT_USER.empName;
    console.log('현재 로그인 사용자:', currentUser, '(idx:', currentUserIdx, ')');

    // 참여자 관련 변수 (객체 배열: { id, name, department, rank })
    let selectedParticipants = [];

    // 직원 자동완성 관련 변수
    let allEmployees = []; // 전체 직원 목록
    let employeeDropdown = null;
    let participantInput = null;

    // 알림 관련 변수
    let notificationEnabled = false;
    let notificationTime = 10;

    // 탭 및 팀 관련 변수
    let currentEventTab = 'personal'; // 'personal' or 'team'
    let selectedTeam = null; // { idx, teamName, teamColor }
    let teamsList = []; // 팀 목록

    // 팀 색상 맵
    const teamColors = {
        'dev': '#1e88e5',
        'design': '#ec407a',
        'marketing': '#fb8c00',
        'sales': '#43a047',
        'hr': '#8e24aa'
    };

    // DOM 요소
    const scheduleForm = document.getElementById('newScheduleForm');
    const backBtn = document.getElementById('backBtn');
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
            allEmployees = users; // 자동완성용 직원 목록
            console.log('Loaded users from API:', users);

            // organizationData 형식으로 변환
            organizationData = transformUsersToOrgData(users);
            console.log('Transformed organization data:', organizationData);
            return true;
        } catch (error) {
            console.error('사용자 데이터 로드 중 오류:', error);
            allEmployees = [];
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

    // 팀 선택 모달 렌더링
    function renderTeamSelectModal() {
        const teamSelectList = document.getElementById('teamSelectList');
        if (!teamSelectList) return;

        teamSelectList.innerHTML = '';

        // 이미 선택한 팀 제외
        const availableTeams = teamsList.filter(team => {
            return !selectedTeam || selectedTeam.idx !== team.idx;
        });

        if (availableTeams.length === 0) {
            teamSelectList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">선택 가능한 팀이 없습니다.</p>';
            return;
        }

        availableTeams.forEach(team => {
            const teamItem = document.createElement('div');
            teamItem.className = 'team-select-item';
            teamItem.dataset.teamIdx = team.idx;
            teamItem.dataset.teamName = team.teamName;

            // 팀 색상 (팀 이름을 소문자로 변환해서 매칭)
            const teamKey = team.teamName.toLowerCase();
            const teamColor = teamColors[teamKey] || '#667eea'; // 기본 색상

            // 팀 멤버 목록 생성
            let membersHtml = '';
            if (team.members && team.members.length > 0) {
                const memberNames = team.members.slice(0, 5).map(m => {
                    // 멤버가 문자열인지 객체인지 확인
                    if (typeof m === 'string') {
                        return m;
                    }
                    return m.memberName || m.empName || m.name || '이름 없음';
                });

                const displayMembers = memberNames.join(', ');
                const moreCount = team.members.length > 5 ? ` 외 ${team.members.length - 5}명` : '';
                membersHtml = `<div class="team-select-members"><i class="fas fa-users"></i> ${displayMembers}${moreCount}</div>`;
            } else {
                membersHtml = `<div class="team-select-members" style="color: #999;"><i class="fas fa-users"></i> 멤버 없음</div>`;
            }

            teamItem.innerHTML = `
                <div class="team-select-color" style="background: ${teamColor};"></div>
                <div class="team-select-info">
                    <div class="team-select-name">${team.teamName}</div>
                    ${membersHtml}
                </div>
                <i class="fas fa-check team-select-check"></i>
            `;

            // 팀 선택 이벤트
            teamItem.addEventListener('click', function() {
                selectTeam(team, teamColor);
            });

            teamSelectList.appendChild(teamItem);
        });
    }

    // 팀 선택 처리
    function selectTeam(team, color) {
        selectedTeam = {
            idx: team.idx,
            name: team.teamName,
            color: color
        };

        // 선택된 팀 태그 표시
        renderSelectedTeamTag();

        // 팀 멤버 자동 추가
        loadTeamMembersAsParticipants(team.idx);

        // 모달 닫기
        const teamSelectModal = document.getElementById('teamSelectModal');
        teamSelectModal.classList.remove('active');
    }

    // 선택된 팀 태그 렌더링
    function renderSelectedTeamTag() {
        const selectedTeamTagContainer = document.getElementById('selectedTeamTagContainer');
        if (!selectedTeamTagContainer) return;

        if (!selectedTeam) {
            selectedTeamTagContainer.innerHTML = '';
            return;
        }

        // 색상을 16진수 형식으로 변환하여 투명도 추가
        const bgColor = selectedTeam.color + '20'; // 20 = 12% opacity

        selectedTeamTagContainer.innerHTML = `
            <div class="participant-tag team-tag" style="background: ${bgColor}; color: ${selectedTeam.color}; border: 2px solid ${selectedTeam.color};">
                <i class="fas fa-users"></i>
                <span class="team-tag-name">${selectedTeam.name}</span>
                <button type="button" class="participant-remove team-tag-remove" style="color: ${selectedTeam.color};">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // 제거 버튼 이벤트
        const removeBtn = selectedTeamTagContainer.querySelector('.participant-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                selectedTeam = null;
                renderSelectedTeamTag();
                // 참석자 목록도 초기화
                selectedParticipants = [];
                renderParticipantsList();
            });
        }
    }

    // 팀 선택 드롭다운 렌더링 (기존 함수 - 사용 안함)
    function renderTeamSelect() {
        // 팀 선택 모달로 대체
        renderTeamSelectModal();
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
    scheduleEndDate.addEventListener('change', async function() {
        const startDate = scheduleStartDate.value;
        const endDate = this.value;

        if (startDate && endDate && endDate < startDate) {
            await showWarning('종료 날짜는 시작 날짜보다 이전일 수 없습니다.');
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

    // 참석자 입력 필드 및 자동완성
    participantInput = document.getElementById('participantInput');
    employeeDropdown = document.getElementById('employeeDropdown');

    // 키보드 네비게이션 관련 변수
    let filteredEmployees = [];
    let selectedDropdownIndex = -1;

    // 직원 드롭다운 표시
    function showEmployeeDropdown(searchText) {
        if (!employeeDropdown) {
            employeeDropdown = document.getElementById('employeeDropdown');
        }

        if (!searchText || searchText.length === 0) {
            employeeDropdown.style.display = 'none';
            filteredEmployees = [];
            selectedDropdownIndex = -1;
            return;
        }

        // 검색어로 필터링 (이름, 부서, 직급 + 초성 검색 — SearchUtils 공통)
        filteredEmployees = allEmployees.filter(emp => {
            const name = emp.empName || '';
            const dept = emp.empDeptName || '';
            const position = emp.empPositionName || '';

            // 이미 추가된 내부 직원은 제외
            const isAlreadyAdded = selectedParticipants.some(p => p.id === emp.idx);
            if (isAlreadyAdded) {
                return false;
            }

            return searchUtils.matchesAny(searchText, name, dept, position);
        }).slice(0, 10); // 최대 10개

        if (filteredEmployees.length === 0) {
            employeeDropdown.style.display = 'none';
            selectedDropdownIndex = -1;
            return;
        }

        // 선택 인덱스 초기화
        selectedDropdownIndex = -1;

        // 드롭다운 렌더링
        employeeDropdown.innerHTML = '';
        filteredEmployees.forEach((emp, index) => {
            const item = document.createElement('div');
            item.className = 'employee-dropdown-item';
            item.dataset.index = index;

            const initials = emp.empName ? emp.empName.substring(0, 1) : '?';

            item.innerHTML = `
                <div class="employee-avatar">${initials}</div>
                <div class="employee-info">
                    <div class="employee-name">${emp.empName || '이름 없음'}</div>
                    <div class="employee-detail">${emp.empDeptName || '부서 없음'} · ${emp.empPositionName || '직급 없음'}</div>
                </div>
            `;

            item.addEventListener('click', function() {
                addParticipantByEmployee(emp);
                participantInput.value = '';
                employeeDropdown.style.display = 'none';
                filteredEmployees = [];
                selectedDropdownIndex = -1;
            });

            item.addEventListener('mouseenter', function() {
                selectedDropdownIndex = index;
                updateDropdownSelection();
            });

            employeeDropdown.appendChild(item);
        });

        employeeDropdown.style.display = 'block';
    }

    // 드롭다운 선택 상태 업데이트
    function updateDropdownSelection() {
        const items = employeeDropdown.querySelectorAll('.employee-dropdown-item');
        items.forEach((item, index) => {
            if (index === selectedDropdownIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // 직원으로 참석자 추가
    function addParticipantByEmployee(emp) {
        const participant = {
            id: emp.idx,
            name: emp.empName,
            department: emp.empDeptName || '미지정',
            rank: emp.empPositionName || '미지정'
        };

        // 중복 체크 (id 기준)
        if (!selectedParticipants.find(p => p.id === participant.id)) {
            selectedParticipants.push(participant);
            renderParticipantsList();
        }
    }

    // 외부인원 직접 추가
    function addExternalParticipant(name) {
        const participant = {
            id: null,
            name: name,
            department: '외부',
            rank: '외부인원'
        };

        // 중복 체크 (외부 참석자끼리만 이름 중복 방지)
        if (!selectedParticipants.find(p => p.id === null && p.name === name)) {
            selectedParticipants.push(participant);
            renderParticipantsList();
        }
    }

    // 참여자 입력란 이벤트
    if (participantInput) {
        // 입력 시 자동완성
        participantInput.addEventListener('input', function(e) {
            const searchText = e.target.value.trim();
            showEmployeeDropdown(searchText);
        });

        // 포커스 시 드롭다운 표시
        participantInput.addEventListener('focus', function(e) {
            const searchText = e.target.value.trim();
            if (searchText) {
                showEmployeeDropdown(searchText);
            }
        });

        // 키보드 네비게이션
        participantInput.addEventListener('keydown', function(e) {
            const isDropdownOpen = employeeDropdown.style.display === 'block' && filteredEmployees.length > 0;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (isDropdownOpen) {
                    selectedDropdownIndex = Math.min(selectedDropdownIndex + 1, filteredEmployees.length - 1);
                    updateDropdownSelection();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (isDropdownOpen) {
                    selectedDropdownIndex = Math.max(selectedDropdownIndex - 1, 0);
                    updateDropdownSelection();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (isDropdownOpen && selectedDropdownIndex >= 0) {
                    // 드롭다운에서 선택된 직원 추가
                    const selectedEmp = filteredEmployees[selectedDropdownIndex];
                    addParticipantByEmployee(selectedEmp);
                    participantInput.value = '';
                    employeeDropdown.style.display = 'none';
                    filteredEmployees = [];
                    selectedDropdownIndex = -1;
                } else {
                    // 외부인원 추가
                    const name = participantInput.value.trim();
                    if (name) {
                        addExternalParticipant(name);
                        participantInput.value = '';
                        employeeDropdown.style.display = 'none';
                    }
                }
            } else if (e.key === 'Escape') {
                employeeDropdown.style.display = 'none';
                filteredEmployees = [];
                selectedDropdownIndex = -1;
            }
        });
    }

    // 추가 버튼 클릭 - 입력값 있으면 외부인원으로 추가, 없으면 모달 열기
    const addParticipantBtn = document.getElementById('addParticipantBtn');
    if (addParticipantBtn) {
        addParticipantBtn.addEventListener('click', function() {
            const name = participantInput ? participantInput.value.trim() : '';
            if (name) {
                addExternalParticipant(name);
                participantInput.value = '';
                if (employeeDropdown) employeeDropdown.style.display = 'none';
            } else {
                openParticipantSelectionModal();
            }
        });
    }

    // 드롭다운 외부 클릭 시 닫기
    document.addEventListener('click', function(e) {
        if (employeeDropdown && participantInput) {
            if (!participantInput.contains(e.target) && !employeeDropdown.contains(e.target)) {
                employeeDropdown.style.display = 'none';
            }
        }
    });

    // 참석자 추가 공통 함수 (직원 선택 모달 열기)
    function openParticipantSelectionModal() {
        console.log('직원 선택 모달 열기');
        tempSelectedEmployees = [...selectedParticipants]; // 현재 참석자 목록을 임시 선택 목록으로 복사
        openEmployeeSelectionModal();
    }

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

    // Modal close handlers (직원 선택 모달이 있는 경우에만)
    if (closeEmployeeModal) {
        closeEmployeeModal.addEventListener('click', function() {
            closeEmployeeSelectionModalFn();
        });
    }

    if (cancelEmployeeSelection) {
        cancelEmployeeSelection.addEventListener('click', function() {
            closeEmployeeSelectionModalFn();
        });
    }

    if (employeeSelectionModal) {
        employeeSelectionModal.addEventListener('click', function(e) {
            if (e.target === employeeSelectionModal) {
                closeEmployeeSelectionModalFn();
            }
        });
    }

    // Confirm employee selection
    if (confirmEmployeeSelection) {
        confirmEmployeeSelection.addEventListener('click', function() {
            console.log('Confirm button clicked, selected:', tempSelectedEmployees);
            selectedParticipants = [...tempSelectedEmployees];
            renderParticipantsList();
            closeEmployeeSelectionModalFn();
        });
    }

    // Clear all selected employees
    if (clearSelectedBtn) {
        clearSelectedBtn.addEventListener('click', function() {
            tempSelectedEmployees = [];
            updateSelectedEmployeesList();
            updateOrgTreeCheckboxes();
            updateSelectAllButtonState();
        });
    }

    // Select all employees
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
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

        // 부서 인원수 뱃지 클릭 시 해당 부서 전체 선택
        const treeCount = node.querySelector('.tree-count');
        if (treeCount && dept.members && dept.members.length > 0) {
            treeCount.style.cursor = 'pointer';
            treeCount.addEventListener('click', function(e) {
                e.stopPropagation();

                // 해당 부서의 모든 팀원이 이미 선택되어 있는지 확인
                const allSelected = dept.members.every(member =>
                    tempSelectedEmployees.some(emp => emp.id === member.id)
                );

                if (allSelected) {
                    // 전체 해제
                    dept.members.forEach(member => {
                        tempSelectedEmployees = tempSelectedEmployees.filter(emp => emp.id !== member.id);
                    });
                } else {
                    // 전체 선택
                    dept.members.forEach(member => {
                        if (!tempSelectedEmployees.some(emp => emp.id === member.id)) {
                            tempSelectedEmployees.push({
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
                updateSelectedEmployeesList();
                updateSelectAllButtonState();
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
        if (!selectedCount || !selectedEmployeesList) return;

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
        if (!employeeOrgTree) return;
        const checkboxes = employeeOrgTree.querySelectorAll('.employee-checkbox');
        checkboxes.forEach(checkbox => {
            const id = parseInt(checkbox.getAttribute('data-id'));
            checkbox.checked = tempSelectedEmployees.some(emp => emp.id === id);
        });
    }

    // Expand/collapse all
    if (expandAllBtn) {
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
    }

    // Search employees
    if (employeeSearch) {
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
    }

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
                openParticipantSelectionModal();
            });
            tbody.appendChild(emptyRow);
        } else {
            selectedParticipants.forEach((participant, index) => {
                const row = document.createElement('tr');
                const isExternal = participant.id === null;
                const nameWithBadge = isExternal
                    ? `${participant.name || 'undefined'} <span class="external-badge">외부</span>`
                    : `${participant.name || 'undefined'}`;

                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${nameWithBadge}</td>
                    <td>${participant.department || 'undefined'}</td>
                    <td>
                        <button type="button" class="btn-delete" data-index="${index}">
                            <i class="fas fa-trash"></i> 삭제
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            tbody.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', function() {
                    const idx = parseInt(this.getAttribute('data-index'));
                    selectedParticipants.splice(idx, 1);
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
                openParticipantSelectionModal();
            });
        }
    }

    // 뒤로가기/취소 버튼 이벤트
    backBtn.addEventListener('click', async function() {
        const confirmed = await showConfirm('일정 목록으로 돌아가시겠습니까? 작성 중인 내용은 사라집니다.');
        if (confirmed) {
            window.location.href = '/calendar';
        }
    });


    // 저장 버튼 클릭 시 폼 제출
    saveBtn.addEventListener('click', async function() {
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
            if (!selectedTeam || !selectedTeam.idx) {
                await showWarning('팀을 선택하세요.');
                return;
            }
            teamIdx = selectedTeam.idx;
        }

        // 유효성 검사
        if (!title) {
            await showWarning('일정 제목을 입력하세요.');
            return;
        }

        if (new Date(endDate) < new Date(startDate)) {
            await showWarning('종료 날짜는 시작 날짜보다 이전일 수 없습니다.');
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
                await showSuccess('일정이 성공적으로 추가되었습니다.');
                window.location.href = '/calendar';
            } else {
                await showError('일정 추가 실패: ' + data.message);
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-check"></i> 저장';
            }
        } catch (error) {
            console.error('일정 추가 중 오류:', error);
            await showError('일정 추가 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.');
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

    // 팀 선택 모달 열기 버튼
    const openTeamSelectModalBtn = document.getElementById('openTeamSelectModalBtn');
    if (openTeamSelectModalBtn) {
        openTeamSelectModalBtn.addEventListener('click', function(e) {
            e.preventDefault(); // form submit 방지
            e.stopPropagation(); // 이벤트 전파 방지
            console.log('팀 선택 모달 열기 버튼 클릭됨');
            const teamSelectModal = document.getElementById('teamSelectModal');
            if (teamSelectModal) {
                console.log('팀 선택 모달 찾음, active 클래스 추가');
                teamSelectModal.classList.add('active');
                renderTeamSelectModal();
            } else {
                console.error('팀 선택 모달을 찾을 수 없습니다');
            }
        });
    } else {
        console.error('openTeamSelectModalBtn 요소를 찾을 수 없습니다');
    }

    // 팀 선택 모달 닫기 버튼들
    const closeTeamSelectModalBtn = document.getElementById('closeTeamSelectModal');
    const cancelTeamSelectBtn = document.getElementById('cancelTeamSelectBtn');

    if (closeTeamSelectModalBtn) {
        closeTeamSelectModalBtn.addEventListener('click', function() {
            const teamSelectModal = document.getElementById('teamSelectModal');
            teamSelectModal.classList.remove('active');
        });
    }

    if (cancelTeamSelectBtn) {
        cancelTeamSelectBtn.addEventListener('click', function() {
            const teamSelectModal = document.getElementById('teamSelectModal');
            teamSelectModal.classList.remove('active');
        });
    }

    // 팀 선택 모달 배경 클릭 시 닫기
    const teamSelectModal = document.getElementById('teamSelectModal');
    if (teamSelectModal) {
        teamSelectModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
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
                console.log('팀 멤버 데이터:', teamData.members);

                // 기존 참석자 목록 초기화 (중복 방지)
                selectedParticipants = [];

                // 팀 멤버들을 참석자 형식으로 변환하여 추가
                teamData.members.forEach(member => {
                    // member가 문자열인 경우 (이름만 있는 경우)
                    if (typeof member === 'string') {
                        // allEmployees에서 이름으로 직원 찾기
                        const employee = allEmployees.find(emp => emp.empName === member);

                        if (employee) {
                            // 내부 직원으로 추가
                            selectedParticipants.push({
                                id: employee.idx,
                                name: employee.empName,
                                department: employee.empDeptName || '미지정',
                                rank: employee.empPositionName || '미지정'
                            });
                        } else {
                            // 직원을 찾지 못한 경우 외부인원으로 추가
                            selectedParticipants.push({
                                id: null,
                                name: member,
                                department: '외부',
                                rank: '외부인원'
                            });
                        }
                    } else {
                        // member가 객체인 경우
                        selectedParticipants.push({
                            id: member.memberIdx || member.idx || member.empIdx,
                            name: member.memberName || member.empName || member.name || '이름 없음',
                            department: member.memberDeptName || member.empDeptName || member.memberDept || member.empDept || '미지정',
                            rank: member.memberPositionName || member.empPositionName || member.memberPosition || member.empPosition || '미지정'
                        });
                    }
                });

                // 참석자 목록 UI 업데이트
                renderParticipantsList();

                console.log('팀 멤버 자동 추가:', selectedParticipants);
            }
        } catch (error) {
            console.error('팀 멤버 로드 중 오류:', error);
        }
    }

    // ============================================
    // 달력 날짜 선택 기능
    // ============================================

    // 달력 상태 변수
    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth();
    let selectedDates = [];
    let holidays = {}; // 공휴일 데이터 (년도별 캐시)
    let loadedYears = new Set(); // 로드된 년도 추적

    // 달력 DOM 요소 (scheduleStartDate, scheduleEndDate는 이미 위에서 선언됨)
    const scheduleCalendarTitle = document.getElementById('scheduleCalendarTitle');
    const scheduleCalendarDays = document.getElementById('scheduleCalendarDays');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const selectedPeriodText = document.getElementById('selectedPeriodText');

    // 특정 년도 공휴일 데이터 로드
    async function loadHolidaysByYear(year) {
        try {
            const response = await fetch(`/api/holidays?year=${year}`);
            if (!response.ok) {
                throw new Error(`${year}년 공휴일 데이터를 불러오는데 실패했습니다.`);
            }

            const yearHolidays = await response.json();
            console.log(`[Calendar] ${year}년 공휴일 로드 완료:`, Object.keys(yearHolidays).length, '건');
            return yearHolidays;
        } catch (error) {
            console.error(`[Calendar] ${year}년 공휴일 로드 실패:`, error);
            return {};
        }
    }

    // 특정 년도 공휴일 보장 (없으면 로드)
    async function ensureYearHolidaysLoaded(year) {
        if (!loadedYears.has(year)) {
            const yearHolidays = await loadHolidaysByYear(year);
            Object.assign(holidays, yearHolidays); // 기존 holidays 객체에 병합
            loadedYears.add(year);
            console.log(`[Calendar] ${year}년 공휴일 캐시 추가`);
        }
    }

    // 달력 렌더링
    async function renderCalendar() {
        if (!scheduleCalendarDays) {
            console.error('scheduleCalendarDays element not found');
            return;
        }

        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const prevLastDay = new Date(currentYear, currentMonth, 0);

        // 이전달, 현재달, 다음달의 년도 공휴일 로드 (다른 년도일 수 있음)
        const prevMonthYear = new Date(currentYear, currentMonth - 1, 1).getFullYear();
        const nextMonthYear = new Date(currentYear, currentMonth + 1, 1).getFullYear();

        await Promise.all([
            ensureYearHolidaysLoaded(prevMonthYear),
            ensureYearHolidaysLoaded(currentYear),
            ensureYearHolidaysLoaded(nextMonthYear)
        ]);

        const firstDayOfWeek = firstDay.getDay();
        const lastDate = lastDay.getDate();
        const prevLastDate = prevLastDay.getDate();

        scheduleCalendarTitle.textContent = `${currentYear}년 ${currentMonth + 1}월`;
        scheduleCalendarDays.innerHTML = '';

        console.log('[Calendar] 렌더링:', currentYear, currentMonth + 1);
        console.log('[Calendar] 공휴일 데이터 개수:', Object.keys(holidays).length);

        // 이전 달 날짜
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = prevLastDate - i;
            const prevMonthDate = new Date(currentYear, currentMonth - 1, day);
            const dateStr = formatDate(prevMonthDate);
            const dayOfWeek = prevMonthDate.getDay();

            let classes = 'other-month';
            if (dayOfWeek === 0) classes += ' sunday';
            if (dayOfWeek === 6) classes += ' saturday';
            if (holidays[dateStr]) classes += ' holiday';

            if (isDateSelected(dateStr)) classes += ' selected';
            if (isDateInRange(dateStr)) classes += ' in-range';
            if (selectedDates.length > 0 && dateStr === selectedDates[0]) classes += ' range-start';
            if (selectedDates.length > 1 && dateStr === selectedDates[selectedDates.length - 1]) classes += ' range-end';

            const dayEl = createDayElement(day, classes, dateStr);
            scheduleCalendarDays.appendChild(dayEl);
        }

        // 현재 달 날짜
        let holidayCount = 0;
        for (let day = 1; day <= lastDate; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const dateStr = formatDate(date);
            const dayOfWeek = date.getDay();

            let classes = '';

            if (isToday(date)) classes += ' today';
            if (dayOfWeek === 0) classes += ' sunday';
            if (dayOfWeek === 6) classes += ' saturday';
            if (holidays[dateStr]) {
                classes += ' holiday';
                holidayCount++;
                if (day <= 5) { // 초반 5일만 로그
                    console.log(`[Calendar] 공휴일 발견: ${dateStr} = ${holidays[dateStr]}`);
                }
            }
            if (isDateSelected(dateStr)) classes += ' selected';
            if (isDateInRange(dateStr)) classes += ' in-range';
            if (selectedDates.length > 0 && dateStr === selectedDates[0]) classes += ' range-start';
            if (selectedDates.length > 1 && dateStr === selectedDates[selectedDates.length - 1]) classes += ' range-end';

            const dayEl = createDayElement(day, classes, dateStr);
            scheduleCalendarDays.appendChild(dayEl);
        }
        console.log(`[Calendar] 이번 달 공휴일 수: ${holidayCount}`);

        // 다음 달 날짜
        const remainingCells = 42 - scheduleCalendarDays.children.length;
        for (let day = 1; day <= remainingCells; day++) {
            const nextMonthDate = new Date(currentYear, currentMonth + 1, day);
            const dateStr = formatDate(nextMonthDate);
            const dayOfWeek = nextMonthDate.getDay();

            let classes = 'other-month';
            if (dayOfWeek === 0) classes += ' sunday';
            if (dayOfWeek === 6) classes += ' saturday';
            if (holidays[dateStr]) classes += ' holiday';

            if (isDateSelected(dateStr)) classes += ' selected';
            if (isDateInRange(dateStr)) classes += ' in-range';
            if (selectedDates.length > 0 && dateStr === selectedDates[0]) classes += ' range-start';
            if (selectedDates.length > 1 && dateStr === selectedDates[selectedDates.length - 1]) classes += ' range-end';

            const dayEl = createDayElement(day, classes, dateStr);
            scheduleCalendarDays.appendChild(dayEl);
        }
    }

    // 날짜 요소 생성
    function createDayElement(day, classes, dateStr = null) {
        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${classes}`;
        dayEl.textContent = day;

        // dateStr이 있으면 클릭 가능
        if (dateStr) {
            dayEl.addEventListener('click', () => selectDate(dateStr));
        }

        return dayEl;
    }

    // 날짜 선택
    function selectDate(dateStr) {
        if (selectedDates.length === 0) {
            // 첫 번째 날짜 선택 (시작일)
            selectedDates = [dateStr];
            scheduleStartDate.value = dateStr;
            scheduleEndDate.value = dateStr;
        } else if (selectedDates.length === 1) {
            // 두 번째 날짜 선택 (종료일)
            const startDate = new Date(selectedDates[0]);
            const endDate = new Date(dateStr);

            if (endDate < startDate) {
                // 역순 선택시 시작일과 종료일 교체
                selectedDates = fillDateRange(dateStr, selectedDates[0]);
                scheduleStartDate.value = dateStr;
                scheduleEndDate.value = selectedDates[selectedDates.length - 1];
            } else {
                selectedDates = fillDateRange(selectedDates[0], dateStr);
                scheduleEndDate.value = dateStr;
            }
        } else {
            // 이미 범위가 선택된 경우 초기화 후 새로 선택
            selectedDates = [dateStr];
            scheduleStartDate.value = dateStr;
            scheduleEndDate.value = dateStr;
        }

        renderCalendar();
        updateSelectedPeriodDisplay();
    }

    // 날짜 범위 채우기
    function fillDateRange(startStr, endStr) {
        const dates = [];
        const start = new Date(startStr);
        const end = new Date(endStr);

        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            dates.push(formatDate(date));
        }

        return dates;
    }

    // 선택된 기간 표시 업데이트
    function updateSelectedPeriodDisplay() {
        if (selectedDates.length === 0) {
            selectedPeriodText.textContent = '날짜를 선택해주세요';
        } else if (selectedDates.length === 1) {
            const date = new Date(selectedDates[0]);
            selectedPeriodText.textContent = formatDateDisplay(date);
        } else {
            const startDate = new Date(selectedDates[0]);
            const endDate = new Date(selectedDates[selectedDates.length - 1]);
            selectedPeriodText.textContent = `${formatDateDisplay(startDate)} ~ ${formatDateDisplay(endDate)}`;
        }
    }

    // 날짜를 표시 형식으로 포맷 (YYYY.MM.DD)
    function formatDateDisplay(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    }

    // 날짜가 선택되었는지 확인
    function isDateSelected(dateStr) {
        return selectedDates.length > 0 && (
            dateStr === selectedDates[0] ||
            dateStr === selectedDates[selectedDates.length - 1]
        );
    }

    // 날짜가 범위 내에 있는지 확인
    function isDateInRange(dateStr) {
        if (selectedDates.length <= 1) return false;
        const start = selectedDates[0];
        const end = selectedDates[selectedDates.length - 1];
        return dateStr > start && dateStr < end;
    }

    // 오늘 날짜 확인
    function isToday(date) {
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
               date.getMonth() === today.getMonth() &&
               date.getDate() === today.getDate();
    }

    // 날짜 포맷 (YYYY-MM-DD)
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 이전 달 버튼
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar();
        });
    }

    // 다음 달 버튼
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar();
        });
    }

    // 초기화: 공휴일 로드 후 달력 렌더링
    if (scheduleCalendarDays) {
        (async function() {
            console.log('[Calendar] 초기화 시작');

            // 현재 년도 기준 전/현재/후년도 공휴일 로드 (3년치)
            const thisYear = new Date().getFullYear();
            await Promise.all([
                ensureYearHolidaysLoaded(thisYear - 1),
                ensureYearHolidaysLoaded(thisYear),
                ensureYearHolidaysLoaded(thisYear + 1)
            ]);

            console.log('[Calendar] 초기 공휴일 로드 완료:', Object.keys(holidays).length, '건');

            // 오늘 날짜 기본 선택
            const today = new Date();
            const todayStr = formatDate(today);
            selectedDates = [todayStr];
            scheduleStartDate.value = todayStr;
            scheduleEndDate.value = todayStr;
            updateSelectedPeriodDisplay();

            console.log('[Calendar] 오늘 날짜:', todayStr);
            console.log('[Calendar] 달력 렌더링 시작');

            // 달력 렌더링
            await renderCalendar();
        })();
    }

    // 초기화: 참석자 목록 렌더링 (빈 상태 표시)
    renderParticipantsList();

    // 초기화: 팀 목록 로드
    loadTeamsList();

    // 알림 초기 상태 설정 (기본: 꺼짐)
    if (notificationToggleCheckbox) {
        notificationToggleCheckbox.checked = false;
        notificationTimeButtons.style.display = 'none';
    }
});
