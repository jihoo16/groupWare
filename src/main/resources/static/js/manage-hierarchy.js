/**
 * 보고체계 관리 페이지
 * - 상위보고자 설정 및 수정
 * - 조직 레벨 관리
 * - 팀장 여부 설정
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소
    const hierarchyTableBody = document.getElementById('hierarchyTableBody');
    const hierarchySearch = document.getElementById('hierarchySearch');
    const nameFilter = document.getElementById('nameFilter');
    const deptFilter = document.getElementById('deptFilter');
    const positionFilter = document.getElementById('positionFilter');
    const levelFilter = document.getElementById('levelFilter');
    const statusFilter = document.getElementById('statusFilter');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    const viewOrgChartBtn = document.getElementById('viewOrgChartBtn');
    const loadingContainer = document.getElementById('loadingContainer');
    const emptyState = document.getElementById('emptyState');

    // 모달
    const changeManagerModal = document.getElementById('changeManagerModal');
    const closeChangeManagerModal = document.getElementById('closeChangeManagerModal');
    const cancelChangeBtn = document.getElementById('cancelChangeBtn');
    const confirmChangeBtn = document.getElementById('confirmChangeBtn');

    const bulkChangeModal = document.getElementById('bulkChangeModal');
    const closeBulkChangeModal = document.getElementById('closeBulkChangeModal');
    const cancelBulkBtn = document.getElementById('cancelBulkBtn');

    const historyModal = document.getElementById('historyModal');
    const closeHistoryModal = document.getElementById('closeHistoryModal');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');

    const employeeListModal = document.getElementById('employeeListModal');
    const closeEmployeeListModal = document.getElementById('closeEmployeeListModal');
    const closeEmployeeListBtn = document.getElementById('closeEmployeeListBtn');

    // 데이터 저장소
    let employeesData = [];
    let currentEditingEmployee = null;

    // 정렬 상태
    let currentSortColumn = null;
    let currentSortOrder = 'asc'; // 'asc' or 'desc'

    // 초기화
    init();

    function init() {
        loadEmployees();
        setupEventListeners();
    }

    // 직원 데이터 로드
    function loadEmployees() {
        showLoading(true);

        fetch('/api/hierarchy/employees')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load employees');
                }
                return response.json();
            })
            .then(data => {
                // 각 직원 데이터에 조직 레벨 추가
                employeesData = data.map(emp => ({
                    ...emp,
                    organizationalLevel: getOrganizationalLevel(emp.empPositionSortOrder)
                }));
                loadDepartmentFilters(); // 데이터 로드 후 부서 필터 로드
                loadPositionFilters(); // 직급 필터 로드 (sort_order 순)
                renderEmployeeTable(employeesData);
                updateStatistics();
                showLoading(false);
            })
            .catch(error => {
                console.error('Error loading employees:', error);
                alert('직원 정보를 불러오는데 실패했습니다.');
                showLoading(false);
            });
    }

    // Mock 데이터 생성
    function generateMockData() {
        return [
            {
                idx: 1,
                empId: 'EMP001',
                empName: '김대표',
                empDept: '경영지원',
                empPosition: '대표이사',
                empPositionSortOrder: 1,
                isTeamLeader: true,
                managerIdx: null,
                managerName: null,
                managerStartDate: null,
                status: 'completed'
            },
            {
                idx: 2,
                empId: 'EMP002',
                empName: '박CMO',
                empDept: '마케팅',
                empPosition: '상무',
                empPositionSortOrder: 3,
                isTeamLeader: true,
                managerIdx: 1,
                managerName: '김대표',
                managerStartDate: '2021-03-01',
                status: 'completed'
            },
            {
                idx: 3,
                empId: 'EMP003',
                empName: '이CTO',
                empDept: '개발',
                empPosition: '상무',
                empPositionSortOrder: 3,
                isTeamLeader: true,
                managerIdx: 1,
                managerName: '김대표',
                managerStartDate: '2021-03-01',
                status: 'completed'
            },
            {
                idx: 4,
                empId: 'EMP004',
                empName: '정지원',
                empDept: '개발',
                empPosition: '부장',
                empPositionSortOrder: 5,
                isTeamLeader: true,
                managerIdx: 3,
                managerName: '이CTO',
                managerStartDate: '2022-01-01',
                status: 'completed'
            },
            {
                idx: 5,
                empId: 'EMP005',
                empName: '김직원',
                empDept: '개발',
                empPosition: '대리',
                empPositionSortOrder: 10,
                isTeamLeader: false,
                managerIdx: null,
                managerName: null,
                managerStartDate: null,
                status: 'incomplete'
            },
            {
                idx: 6,
                empId: 'EMP006',
                empName: '최팀장',
                empDept: '마케팅',
                empPosition: '차장',
                empPositionSortOrder: 6,
                isTeamLeader: true,
                managerIdx: 2,
                managerName: '박CMO',
                managerStartDate: '2022-06-01',
                status: 'completed'
            }
        ];
    }

    // 직급 sortOrder를 기반으로 조직 레벨 계산
    function getOrganizationalLevel(sortOrder) {
        if (!sortOrder || sortOrder === Number.MAX_VALUE) return 4;
        if (sortOrder === 1) return 1; // 대표
        if (sortOrder <= 3) return 2; // 상무, 이사
        if (sortOrder <= 6) return 3; // 부장, 차장, 과장
        return 4; // 대리, 주임, 사원
    }

    // 조직 레벨 텍스트 변환
    function getLevelText(sortOrder) {
        const level = getOrganizationalLevel(sortOrder);
        const levelMap = {
            1: '레벨 1 (대표)',
            2: '레벨 2 (상무/이사)',
            3: '레벨 3 (부장/차장/과장)',
            4: '레벨 4 (대리 이하)'
        };
        return levelMap[level] || '-';
    }

    // 테이블 렌더링
    function renderEmployeeTable(data) {
        if (!data || data.length === 0) {
            hierarchyTableBody.innerHTML = '';
            showEmptyState(true);
            return;
        }

        showEmptyState(false);

        const html = data.map(emp => {
            // 대표이사 여부 확인
            const isCEO = emp.empPositionSortOrder === 1;

            // 상태 표시
            let statusClass, statusText;
            if (isCEO) {
                statusClass = 'mh-not-required';
                statusText = '설정불필요';
            } else if (emp.status === 'completed') {
                statusClass = 'mh-completed';
                statusText = '설정완료';
            } else {
                statusClass = 'mh-incomplete';
                statusText = '미설정';
            }

            return `
            <tr data-emp-idx="${emp.idx}">
                <td>${emp.empId}</td>
                <td><strong>${emp.empName}</strong></td>
                <td>${emp.empDeptName || emp.empDept}</td>
                <td>${emp.empPositionName || emp.empPosition}</td>
                <td>${getLevelText(emp.empPositionSortOrder)}</td>
                <td>${emp.isTeamLeader ? '예' : '아니오'}</td>
                <td>${isCEO ? '-' : (emp.managerName || '<span style="color: #999;">미설정</span>')}</td>
                <td>${isCEO ? '-' : (emp.managerStartDate || '-')}</td>
                <td>
                    <span class="mh-status-badge ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td>
                    ${isCEO ? '<span style="color: #999;">-</span>' : `
                    <div class="mh-action-buttons">
                        <button class="mh-btn-icon mh-btn-edit" onclick="openChangeManagerModal(${emp.idx})">
                            <i class="fas fa-edit"></i> 수정
                        </button>
                        <button class="mh-btn-icon mh-btn-history" onclick="openHistoryModal(${emp.idx})">
                            <i class="fas fa-history"></i>
                        </button>
                    </div>
                    `}
                </td>
            </tr>
            `;
        }).join('');

        hierarchyTableBody.innerHTML = html;
    }

    // 통계 업데이트
    function updateStatistics() {
        const totalEmployees = employeesData.length;
        const totalLeaders = employeesData.filter(emp => emp.isTeamLeader).length;

        // 대표이사(sortOrder === 1) 제외하고 카운트
        const nonCEOEmployees = employeesData.filter(emp => emp.empPositionSortOrder !== 1);
        const completedCount = nonCEOEmployees.filter(emp => emp.status === 'completed').length;
        const incompleteCount = nonCEOEmployees.length - completedCount;

        document.getElementById('totalEmployees').textContent = totalEmployees;
        document.getElementById('totalLeaders').textContent = totalLeaders;
        document.getElementById('completedCount').textContent = completedCount;
        document.getElementById('incompleteCount').textContent = incompleteCount;
    }

    // 부서 필터 로드
    function loadDepartmentFilters() {
        const departments = [...new Set(employeesData.map(emp => emp.empDeptName || emp.empDept))];
        const html = departments.map(dept => `<option value="${dept}">${dept}</option>`).join('');
        deptFilter.innerHTML = '<option value="">전체 부서</option>' + html;
    }

    // 직급 필터 로드 (sort_order 순)
    function loadPositionFilters() {
        fetch('/api/codes/ranks?activeOnly=true')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load positions');
                }
                return response.json();
            })
            .then(positions => {
                // sort_order 순으로 이미 정렬되어 있음
                const html = positions.map(pos =>
                    `<option value="${pos.codeName}">${pos.codeName}</option>`
                ).join('');
                positionFilter.innerHTML = '<option value="">전체 직급</option>' + html;
                console.log('직급 필터 로드 완료 (sort_order 순):', positions.length);
            })
            .catch(error => {
                console.error('Error loading positions:', error);
            });
    }

    // 필터링
    function applyFilters() {
        const searchTerm = hierarchySearch.value.toLowerCase();
        const nameTerm = nameFilter.value.toLowerCase();
        const selectedDept = deptFilter.value;
        const selectedPosition = positionFilter.value;
        const selectedLevel = levelFilter.value;
        const selectedStatus = statusFilter.value;

        let filtered = employeesData.filter(emp => {
            const deptName = emp.empDeptName || emp.empDept;
            const positionName = emp.empPositionName || emp.empPosition;

            const matchSearch = !searchTerm ||
                emp.empName.toLowerCase().includes(searchTerm) ||
                emp.empId.toLowerCase().includes(searchTerm) ||
                deptName.toLowerCase().includes(searchTerm);

            const matchName = !nameTerm || emp.empName.toLowerCase().includes(nameTerm);

            const matchDept = !selectedDept || deptName === selectedDept;
            const matchPosition = !selectedPosition || positionName === selectedPosition;
            const matchLevel = !selectedLevel || getOrganizationalLevel(emp.empPositionSortOrder) === parseInt(selectedLevel);
            const matchStatus = !selectedStatus || emp.status === selectedStatus;

            return matchSearch && matchName && matchDept && matchPosition && matchLevel && matchStatus;
        });

        // 정렬 적용
        filtered = sortData(filtered);

        renderEmployeeTable(filtered);
    }

    // 이벤트 리스너 설정
    function setupEventListeners() {
        // 검색 및 필터
        hierarchySearch.addEventListener('input', applyFilters);
        nameFilter.addEventListener('input', applyFilters);
        deptFilter.addEventListener('change', applyFilters);
        positionFilter.addEventListener('change', applyFilters);
        levelFilter.addEventListener('change', applyFilters);
        statusFilter.addEventListener('change', applyFilters);

        // 필터 초기화
        resetFilterBtn.addEventListener('click', function() {
            hierarchySearch.value = '';
            nameFilter.value = '';
            deptFilter.value = '';
            positionFilter.value = '';
            levelFilter.value = '';
            statusFilter.value = '';
            currentSortColumn = null;
            currentSortOrder = 'asc';
            updateSortIcons();
            renderEmployeeTable(employeesData);
        });

        // 조직도 보기
        viewOrgChartBtn.addEventListener('click', function() {
            window.location.href = '/organization';
        });

        // 테이블 헤더 정렬
        document.querySelectorAll('.mh-hierarchy-table th[data-sort]').forEach(th => {
            th.addEventListener('click', function() {
                const sortColumn = this.getAttribute('data-sort');
                handleSort(sortColumn);
            });
        });

        // 모달 닫기
        closeChangeManagerModal.addEventListener('click', () => {
            document.getElementById('newManager').disabled = false; // 드롭다운 재활성화
            closeModal(changeManagerModal);
        });
        cancelChangeBtn.addEventListener('click', () => {
            document.getElementById('newManager').disabled = false; // 드롭다운 재활성화
            closeModal(changeManagerModal);
        });
        closeBulkChangeModal.addEventListener('click', () => closeModal(bulkChangeModal));
        cancelBulkBtn.addEventListener('click', () => closeModal(bulkChangeModal));
        closeHistoryModal.addEventListener('click', () => closeModal(historyModal));
        closeHistoryBtn.addEventListener('click', () => closeModal(historyModal));
        closeEmployeeListModal.addEventListener('click', () => closeModal(employeeListModal));
        closeEmployeeListBtn.addEventListener('click', () => closeModal(employeeListModal));

        // 모달 배경 클릭 시 닫기
        window.addEventListener('click', function(e) {
            if (e.target === changeManagerModal) closeModal(changeManagerModal);
            if (e.target === bulkChangeModal) closeModal(bulkChangeModal);
            if (e.target === historyModal) closeModal(historyModal);
            if (e.target === employeeListModal) closeModal(employeeListModal);
        });

        // 통계 카드 클릭 이벤트
        document.querySelectorAll('.mh-stat-clickable').forEach(card => {
            card.addEventListener('click', function() {
                const statType = this.getAttribute('data-stat-type');
                openEmployeeListModal(statType);
            });
        });

        // 상위보고자 변경 확인
        confirmChangeBtn.addEventListener('click', confirmManagerChange);
    }

    // 정렬 처리
    function handleSort(column) {
        if (currentSortColumn === column) {
            // 같은 컬럼 클릭 시 정렬 순서 토글
            currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            // 다른 컬럼 클릭 시 오름차순으로 시작
            currentSortColumn = column;
            currentSortOrder = 'asc';
        }

        updateSortIcons();
        applyFilters(); // 필터링된 데이터에 정렬 적용
    }

    // 정렬 아이콘 업데이트
    function updateSortIcons() {
        document.querySelectorAll('.mh-hierarchy-table th[data-sort]').forEach(th => {
            const icon = th.querySelector('i');
            const column = th.getAttribute('data-sort');

            if (column === currentSortColumn) {
                icon.className = currentSortOrder === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
            } else {
                icon.className = 'fas fa-sort';
            }
        });
    }

    // 데이터 정렬
    function sortData(data) {
        if (!currentSortColumn) {
            return data;
        }

        return [...data].sort((a, b) => {
            let aVal = a[currentSortColumn];
            let bVal = b[currentSortColumn];

            // null/undefined 처리
            if (aVal == null) aVal = (currentSortColumn === 'empPositionSortOrder' || currentSortColumn === 'organizationalLevel') ? Number.MAX_VALUE : '';
            if (bVal == null) bVal = (currentSortColumn === 'empPositionSortOrder' || currentSortColumn === 'organizationalLevel') ? Number.MAX_VALUE : '';

            // 숫자 비교 (직급 sortOrder, 조직 레벨)
            if (currentSortColumn === 'empPositionSortOrder' || currentSortColumn === 'organizationalLevel') {
                return currentSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
            }

            // 상태 정렬 (우선순위: 설정불필요 < 설정완료 < 미설정)
            if (currentSortColumn === 'status') {
                const statusPriority = {
                    'not-required': 0,  // 대표이사
                    'completed': 1,      // 설정완료
                    'incomplete': 2      // 미설정
                };

                // 대표이사 여부로 상태 판단
                const aIsCEO = a.empPositionSortOrder === 1;
                const bIsCEO = b.empPositionSortOrder === 1;

                const aStatus = aIsCEO ? 'not-required' : aVal;
                const bStatus = bIsCEO ? 'not-required' : bVal;

                const aPriority = statusPriority[aStatus] ?? 3;
                const bPriority = statusPriority[bStatus] ?? 3;

                return currentSortOrder === 'asc' ? aPriority - bPriority : bPriority - aPriority;
            }

            // 문자열 비교
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) {
                return currentSortOrder === 'asc' ? -1 : 1;
            }
            if (aVal > bVal) {
                return currentSortOrder === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    // 상위보고자 변경 모달 열기
    window.openChangeManagerModal = function(empIdx) {
        currentEditingEmployee = employeesData.find(emp => emp.idx === empIdx);
        if (!currentEditingEmployee) return;

        // 레벨 1 (대표): 상위보고자 설정 불가
        if (currentEditingEmployee.empPositionSortOrder === 1) {
            alert('대표이사는 상위보고자를 설정할 수 없습니다.');
            return;
        }

        document.getElementById('modalEmpName').textContent = currentEditingEmployee.empName;
        document.getElementById('modalEmpDept').textContent = currentEditingEmployee.empDeptName || currentEditingEmployee.empDept;
        document.getElementById('modalEmpPosition').textContent = currentEditingEmployee.empPositionName || currentEditingEmployee.empPosition;
        document.getElementById('modalCurrentManager').textContent = currentEditingEmployee.managerName || '미설정';
        document.getElementById('changeEmpIdx').value = empIdx;

        const newManagerSelect = document.getElementById('newManager');

        // 레벨 2 (상무/이사, sortOrder 2-3): 무조건 대표이사만
        if (currentEditingEmployee.empPositionSortOrder >= 2 && currentEditingEmployee.empPositionSortOrder <= 3) {
            const ceo = employeesData.find(emp => emp.empPositionSortOrder === 1);

            if (ceo) {
                newManagerSelect.innerHTML = `<option value="${ceo.idx}" selected>${ceo.empName} (${ceo.empPositionName || ceo.empPosition} / ${ceo.empDeptName || ceo.empDept})</option>`;
                newManagerSelect.disabled = true; // 변경 불가
            } else {
                alert('대표이사를 찾을 수 없습니다.');
                return;
            }
        } else {
            // 레벨 3, 4: 같은 부서의 상급자만
            newManagerSelect.disabled = false;

            const superiors = employeesData
                .filter(emp =>
                    emp.idx !== empIdx && // 본인 제외
                    emp.empDept === currentEditingEmployee.empDept && // 같은 부서
                    emp.empPositionSortOrder < currentEditingEmployee.empPositionSortOrder // 상급자만
                )
                .sort((a, b) => a.empPositionSortOrder - b.empPositionSortOrder); // 직급 높은 순 정렬

            const options = superiors
                .map(emp => `<option value="${emp.idx}">${emp.empName} (${emp.empPositionName || emp.empPosition} / ${emp.empDeptName || emp.empDept})</option>`)
                .join('');

            newManagerSelect.innerHTML = '<option value="">선택하세요</option>' + options;

            // 가장 높은 직급을 기본값으로 선택
            if (superiors.length > 0) {
                newManagerSelect.value = superiors[0].idx;
            }
        }

        // 오늘 날짜로 초기화
        document.getElementById('managerStartDate').value = new Date().toISOString().split('T')[0];

        openModal(changeManagerModal);
    };

    // 상위보고자 변경 확인
    function confirmManagerChange() {
        const empIdx = parseInt(document.getElementById('changeEmpIdx').value);
        const newManagerIdx = parseInt(document.getElementById('newManager').value);
        const startDate = document.getElementById('managerStartDate').value;
        const reason = document.getElementById('changeReason').value;

        if (!newManagerIdx || !startDate) {
            alert('필수 항목을 입력해주세요.');
            return;
        }

        // 데이터 업데이트
        const employee = employeesData.find(emp => emp.idx === empIdx);
        const newManager = employeesData.find(emp => emp.idx === newManagerIdx);

        if (employee && newManager) {
            employee.managerIdx = newManagerIdx;
            employee.managerName = newManager.empName;
            employee.managerStartDate = startDate;
            employee.status = 'completed';

            // API 호출하여 서버에 저장
            const updateData = {
                empIdx: empIdx,
                managerIdx: newManagerIdx,
                managerStartDate: startDate,
                changeReason: reason
            };

            fetch(`/api/hierarchy/employees/${empIdx}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update hierarchy');
                }
                return response.json();
            })
            .then(data => {
                console.log('상위보고자 변경 성공:', data);
                alert(`${employee.empName}의 상위보고자가 ${newManager.empName}으로 변경되었습니다.`);

                renderEmployeeTable(employeesData);
                updateStatistics();
                document.getElementById('newManager').disabled = false; // 드롭다운 재활성화
                closeModal(changeManagerModal);
            })
            .catch(error => {
                console.error('Error updating hierarchy:', error);
                alert('상위보고자 변경에 실패했습니다.');
            });
        }
    }

    // 변경 이력 모달 열기
    window.openHistoryModal = function(empIdx) {
        const employee = employeesData.find(emp => emp.idx === empIdx);
        if (!employee) return;

        document.getElementById('historyEmpName').textContent = employee.empName;
        document.getElementById('historyEmpInfo').textContent = `${employee.empPositionName || employee.empPosition} / ${employee.empDeptName || employee.empDept}`;

        // 실제 이력 데이터 로드
        fetch(`/api/hierarchy/history/${empIdx}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load history');
                }
                return response.json();
            })
            .then(histories => {
                let historyHtml = '';

                if (histories.length === 0) {
                    historyHtml = '<div class="mh-history-empty">변경 이력이 없습니다.</div>';
                } else {
                    historyHtml = histories.map(history => {
                        const changeDate = new Date(history.changeDate).toLocaleString('ko-KR');
                        return `
                            <div class="mh-history-item">
                                <div class="mh-history-date">${changeDate}</div>
                                <div class="mh-history-content">상위보고자 변경</div>
                                <div class="mh-history-from-to">
                                    <span class="mh-from">변경 전: ${history.previousManagerName || '미설정'}</span>
                                    <span class="mh-arrow">→</span>
                                    <span class="mh-to">변경 후: ${history.newManagerName || '미설정'}</span>
                                </div>
                                ${history.changeReason ? `<div class="mh-history-reason">사유: ${history.changeReason}</div>` : ''}
                                ${history.changedByUserName ? `<div class="mh-history-user">변경자: ${history.changedByUserName}</div>` : ''}
                            </div>
                        `;
                    }).join('');
                }

                document.getElementById('historyTimeline').innerHTML = historyHtml;
                openModal(historyModal);
            })
            .catch(error => {
                console.error('Error loading history:', error);
                document.getElementById('historyTimeline').innerHTML = '<div class="mh-history-empty">이력을 불러오는데 실패했습니다.</div>';
                openModal(historyModal);
            });
    };

    // 직원 목록 모달 열기
    function openEmployeeListModal(statType) {
        let filteredEmployees = [];
        let modalTitle = '';

        switch(statType) {
            case 'all':
                filteredEmployees = employeesData;
                modalTitle = '전체 직원';
                break;
            case 'leaders':
                filteredEmployees = employeesData.filter(emp => emp.isTeamLeader);
                modalTitle = '팀장급 이상 직원';
                break;
            case 'completed':
                // 대표이사 제외하고 설정완료된 사람만
                filteredEmployees = employeesData.filter(emp =>
                    emp.empPositionSortOrder !== 1 && emp.status === 'completed'
                );
                modalTitle = '보고체계 설정 완료';
                break;
            case 'incomplete':
                // 대표이사 제외하고 미설정된 사람만
                filteredEmployees = employeesData.filter(emp =>
                    emp.empPositionSortOrder !== 1 && emp.status !== 'completed'
                );
                modalTitle = '보고체계 미설정';
                break;
            default:
                filteredEmployees = employeesData;
                modalTitle = '직원 목록';
        }

        // 모달 제목 설정
        document.getElementById('employeeListTitle').textContent = modalTitle;

        // 직원 목록 테이블 렌더링
        const employeeListBody = document.getElementById('employeeListBody');

        if (filteredEmployees.length === 0) {
            employeeListBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #999;">
                        해당하는 직원이 없습니다.
                    </td>
                </tr>
            `;
        } else {
            const html = filteredEmployees.map(emp => {
                const isCEO = emp.empPositionSortOrder === 1;
                let statusClass, statusText;

                if (isCEO) {
                    statusClass = 'mh-not-required';
                    statusText = '설정불필요';
                } else if (emp.status === 'completed') {
                    statusClass = 'mh-completed';
                    statusText = '설정완료';
                } else {
                    statusClass = 'mh-incomplete';
                    statusText = '미설정';
                }

                return `
                    <tr>
                        <td>${emp.empId}</td>
                        <td><strong>${emp.empName}</strong></td>
                        <td>${emp.empDeptName || emp.empDept}</td>
                        <td>${emp.empPositionName || emp.empPosition}</td>
                        <td>${isCEO ? '-' : (emp.managerName || '<span style="color: #999;">미설정</span>')}</td>
                        <td>
                            <span class="mh-status-badge ${statusClass}">
                                ${statusText}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');

            employeeListBody.innerHTML = html;
        }

        openModal(employeeListModal);
    }

    // 모달 열기/닫기
    function openModal(modal) {
        modal.style.display = 'block';
    }

    function closeModal(modal) {
        modal.style.display = 'none';
    }

    // 로딩/빈 상태 표시
    function showLoading(show) {
        loadingContainer.style.display = show ? 'block' : 'none';
        document.querySelector('.mh-hierarchy-table-wrapper').style.display = show ? 'none' : 'block';
    }

    function showEmptyState(show) {
        emptyState.style.display = show ? 'block' : 'none';
        document.querySelector('.mh-hierarchy-table-wrapper').style.display = show ? 'none' : 'block';
    }
});
