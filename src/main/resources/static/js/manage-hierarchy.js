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
    const deptFilter = document.getElementById('deptFilter');
    const levelFilter = document.getElementById('levelFilter');
    const statusFilter = document.getElementById('statusFilter');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    const saveAllBtn = document.getElementById('saveAllBtn');
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

    // 데이터 저장소
    let employeesData = [];
    let changedEmployees = new Set();
    let currentEditingEmployee = null;

    // 초기화
    init();

    function init() {
        loadEmployees();
        setupEventListeners();
        loadDepartmentFilters();
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
                employeesData = data;
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
                organizationalLevel: 1,
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
                organizationalLevel: 2,
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
                organizationalLevel: 2,
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
                organizationalLevel: 3,
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
                organizationalLevel: 4,
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
                organizationalLevel: 3,
                isTeamLeader: true,
                managerIdx: 2,
                managerName: '박CMO',
                managerStartDate: '2022-06-01',
                status: 'completed'
            }
        ];
    }

    // 테이블 렌더링
    function renderEmployeeTable(data) {
        if (!data || data.length === 0) {
            hierarchyTableBody.innerHTML = '';
            showEmptyState(true);
            return;
        }

        showEmptyState(false);

        const html = data.map(emp => `
            <tr data-emp-idx="${emp.idx}" class="${changedEmployees.has(emp.idx) ? 'mh-changed' : ''}">
                <td>${emp.empId}</td>
                <td><strong>${emp.empName}</strong></td>
                <td>${emp.empDeptName || emp.empDept}</td>
                <td>${emp.empPositionName || emp.empPosition}</td>
                <td>
                    <select class="mh-level-select" data-emp-idx="${emp.idx}" data-field="organizationalLevel">
                        <option value="">미설정</option>
                        <option value="1" ${emp.organizationalLevel === 1 ? 'selected' : ''}>레벨 1 (대표)</option>
                        <option value="2" ${emp.organizationalLevel === 2 ? 'selected' : ''}>레벨 2 (상무/이사)</option>
                        <option value="3" ${emp.organizationalLevel === 3 ? 'selected' : ''}>레벨 3 (부장)</option>
                        <option value="4" ${emp.organizationalLevel === 4 ? 'selected' : ''}>레벨 4 (그 이하)</option>
                    </select>
                </td>
                <td class="mh-leader-checkbox">
                    <input type="checkbox" data-emp-idx="${emp.idx}" data-field="isTeamLeader" ${emp.isTeamLeader ? 'checked' : ''}>
                </td>
                <td>${emp.managerName || '<span style="color: #999;">미설정</span>'}</td>
                <td>
                    <select class="mh-manager-select" data-emp-idx="${emp.idx}" data-field="managerIdx">
                        <option value="">선택하세요</option>
                        ${generateManagerOptions(emp)}
                    </select>
                </td>
                <td>${emp.managerStartDate || '-'}</td>
                <td>
                    <span class="mh-status-badge ${emp.status === 'completed' ? 'mh-completed' : 'mh-incomplete'}">
                        ${emp.status === 'completed' ? '설정완료' : '미설정'}
                    </span>
                </td>
                <td>
                    <div class="mh-action-buttons">
                        <button class="mh-btn-icon mh-btn-edit" onclick="openChangeManagerModal(${emp.idx})">
                            <i class="fas fa-edit"></i> 수정
                        </button>
                        <button class="mh-btn-icon mh-btn-history" onclick="openHistoryModal(${emp.idx})">
                            <i class="fas fa-history"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        hierarchyTableBody.innerHTML = html;

        // 인라인 편집 이벤트 바인딩
        attachInlineEditEvents();
    }

    // 상위보고자 옵션 생성 (본인 제외, 한글명 표시)
    function generateManagerOptions(employee) {
        return employeesData
            .filter(emp => emp.idx !== employee.idx) // 본인 제외
            .map(emp => `
                <option value="${emp.idx}" ${emp.idx === employee.managerIdx ? 'selected' : ''}>
                    ${emp.empName} (${emp.empPositionName || emp.empPosition} / ${emp.empDeptName || emp.empDept})
                </option>
            `)
            .join('');
    }

    // 인라인 편집 이벤트 바인딩
    function attachInlineEditEvents() {
        // 조직 레벨 변경
        document.querySelectorAll('.mh-level-select').forEach(select => {
            select.addEventListener('change', function() {
                const empIdx = parseInt(this.dataset.empIdx);
                const field = this.dataset.field;
                const value = parseInt(this.value);
                updateEmployeeField(empIdx, field, value);
            });
        });

        // 팀장 여부 변경
        document.querySelectorAll('.mh-leader-checkbox input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const empIdx = parseInt(this.dataset.empIdx);
                const field = this.dataset.field;
                const value = this.checked;
                updateEmployeeField(empIdx, field, value);
            });
        });

        // 상위보고자 변경
        document.querySelectorAll('.mh-manager-select').forEach(select => {
            select.addEventListener('change', function() {
                const empIdx = parseInt(this.dataset.empIdx);
                const field = this.dataset.field;
                const value = this.value ? parseInt(this.value) : null;
                updateEmployeeField(empIdx, field, value);
                this.classList.add('mh-changed');
            });
        });
    }

    // 직원 필드 업데이트
    function updateEmployeeField(empIdx, field, value) {
        const employee = employeesData.find(emp => emp.idx === empIdx);
        if (employee) {
            employee[field] = value;

            // 상위보고자 이름 업데이트
            if (field === 'managerIdx') {
                const manager = employeesData.find(emp => emp.idx === value);
                employee.managerName = manager ? manager.empName : null;
                employee.status = value ? 'completed' : 'incomplete';
            }

            changedEmployees.add(empIdx);

            // 테이블 행에 changed 클래스 추가
            const row = document.querySelector(`tr[data-emp-idx="${empIdx}"]`);
            if (row) {
                row.classList.add('mh-changed');
            }

            updateStatistics();
        }
    }

    // 통계 업데이트
    function updateStatistics() {
        const totalEmployees = employeesData.length;
        const totalLeaders = employeesData.filter(emp => emp.isTeamLeader).length;
        const completedCount = employeesData.filter(emp => emp.status === 'completed').length;
        const incompleteCount = totalEmployees - completedCount;

        document.getElementById('totalEmployees').textContent = totalEmployees;
        document.getElementById('totalLeaders').textContent = totalLeaders;
        document.getElementById('completedCount').textContent = completedCount;
        document.getElementById('incompleteCount').textContent = incompleteCount;
    }

    // 부서 필터 로드
    function loadDepartmentFilters() {
        const departments = [...new Set(employeesData.map(emp => emp.empDept))];
        const html = departments.map(dept => `<option value="${dept}">${dept}</option>`).join('');
        deptFilter.innerHTML = '<option value="">전체 부서</option>' + html;
    }

    // 필터링
    function applyFilters() {
        const searchTerm = hierarchySearch.value.toLowerCase();
        const selectedDept = deptFilter.value;
        const selectedLevel = levelFilter.value;
        const selectedStatus = statusFilter.value;

        const filtered = employeesData.filter(emp => {
            const matchSearch = !searchTerm ||
                emp.empName.toLowerCase().includes(searchTerm) ||
                emp.empDept.toLowerCase().includes(searchTerm);

            const matchDept = !selectedDept || emp.empDept === selectedDept;
            const matchLevel = !selectedLevel || emp.organizationalLevel === parseInt(selectedLevel);
            const matchStatus = !selectedStatus || emp.status === selectedStatus;

            return matchSearch && matchDept && matchLevel && matchStatus;
        });

        renderEmployeeTable(filtered);
    }

    // 이벤트 리스너 설정
    function setupEventListeners() {
        // 검색 및 필터
        hierarchySearch.addEventListener('input', applyFilters);
        deptFilter.addEventListener('change', applyFilters);
        levelFilter.addEventListener('change', applyFilters);
        statusFilter.addEventListener('change', applyFilters);

        // 필터 초기화
        resetFilterBtn.addEventListener('click', function() {
            hierarchySearch.value = '';
            deptFilter.value = '';
            levelFilter.value = '';
            statusFilter.value = '';
            renderEmployeeTable(employeesData);
        });

        // 전체 저장
        saveAllBtn.addEventListener('click', saveAllChanges);

        // 조직도 보기
        viewOrgChartBtn.addEventListener('click', function() {
            window.location.href = '/organization';
        });

        // 모달 닫기
        closeChangeManagerModal.addEventListener('click', () => closeModal(changeManagerModal));
        cancelChangeBtn.addEventListener('click', () => closeModal(changeManagerModal));
        closeBulkChangeModal.addEventListener('click', () => closeModal(bulkChangeModal));
        cancelBulkBtn.addEventListener('click', () => closeModal(bulkChangeModal));
        closeHistoryModal.addEventListener('click', () => closeModal(historyModal));
        closeHistoryBtn.addEventListener('click', () => closeModal(historyModal));

        // 모달 배경 클릭 시 닫기
        window.addEventListener('click', function(e) {
            if (e.target === changeManagerModal) closeModal(changeManagerModal);
            if (e.target === bulkChangeModal) closeModal(bulkChangeModal);
            if (e.target === historyModal) closeModal(historyModal);
        });

        // 상위보고자 변경 확인
        confirmChangeBtn.addEventListener('click', confirmManagerChange);
    }

    // 상위보고자 변경 모달 열기
    window.openChangeManagerModal = function(empIdx) {
        currentEditingEmployee = employeesData.find(emp => emp.idx === empIdx);
        if (!currentEditingEmployee) return;

        document.getElementById('modalEmpName').textContent = currentEditingEmployee.empName;
        document.getElementById('modalEmpDept').textContent = currentEditingEmployee.empDeptName || currentEditingEmployee.empDept;
        document.getElementById('modalEmpPosition').textContent = currentEditingEmployee.empPositionName || currentEditingEmployee.empPosition;
        document.getElementById('modalCurrentManager').textContent = currentEditingEmployee.managerName || '미설정';
        document.getElementById('changeEmpIdx').value = empIdx;

        // 상위보고자 드롭다운 옵션 생성 (한글명 표시)
        const newManagerSelect = document.getElementById('newManager');
        const options = employeesData
            .filter(emp => emp.idx !== empIdx)
            .map(emp => `<option value="${emp.idx}">${emp.empName} (${emp.empPositionName || emp.empPosition} / ${emp.empDeptName || emp.empDept})</option>`)
            .join('');
        newManagerSelect.innerHTML = '<option value="">선택하세요</option>' + options;

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

            changedEmployees.add(empIdx);

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

        // Mock 이력 데이터
        const historyHtml = `
            <div class="mh-history-item">
                <div class="mh-history-date">2025-11-28 14:30</div>
                <div class="mh-history-content">상위보고자 변경</div>
                <div class="mh-history-from-to">
                    <span class="mh-from">변경 전: 미설정</span>
                    <span class="mh-arrow">→</span>
                    <span class="mh-to">변경 후: ${employee.managerName || '미설정'}</span>
                </div>
            </div>
            <div class="mh-history-item">
                <div class="mh-history-date">2023-01-15 10:00</div>
                <div class="mh-history-content">조직 레벨 설정</div>
                <div class="mh-history-from-to">
                    <span class="mh-to">레벨 ${employee.organizationalLevel}</span>
                </div>
            </div>
        `;

        document.getElementById('historyTimeline').innerHTML = historyHtml;

        openModal(historyModal);
    };

    // 전체 저장
    function saveAllChanges() {
        if (changedEmployees.size === 0) {
            alert('변경된 내용이 없습니다.');
            return;
        }

        const changedData = Array.from(changedEmployees).map(idx => {
            const emp = employeesData.find(e => e.idx === idx);
            return {
                empIdx: emp.idx,
                organizationalLevel: emp.organizationalLevel,
                isTeamLeader: emp.isTeamLeader,
                managerIdx: emp.managerIdx,
                managerStartDate: emp.managerStartDate
            };
        });

        // API 호출하여 일괄 저장
        fetch('/api/hierarchy/bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(changedData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to bulk update');
            }
            return response.text();
        })
        .then(() => {
            console.log('전체 저장 성공');
            alert(`${changedEmployees.size}명의 보고체계 정보가 저장되었습니다.`);
            changedEmployees.clear();

            // changed 클래스 제거
            document.querySelectorAll('tr.mh-changed').forEach(row => {
                row.classList.remove('mh-changed');
            });
        })
        .catch(error => {
            console.error('Error saving bulk changes:', error);
            alert('일괄 저장에 실패했습니다.');
        });
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
