// 인사 관리 페이지 JavaScript

// 직원 ID 카운터
let employeeIdCounter = 1001;

document.addEventListener('DOMContentLoaded', function() {
    const deptButtons = document.querySelectorAll('.dept-btn');
    const employeeRows = document.querySelectorAll('.employee-table tbody tr');
    const searchInput = document.getElementById('employeeSearch');
    const addEmployeeBtn = document.getElementById('addEmployeeBtn');
    const employeeModal = document.getElementById('employeeModal');
    const employeeForm = document.getElementById('employeeForm');
    const modalCloseBtn = document.querySelector('#employeeModal .modal-close');
    const cancelBtn = document.querySelector('#employeeModal .btn-secondary');
    const saveBtn = document.querySelector('#employeeModal .btn-primary');

    // 부서 필터 버튼 클릭
    deptButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const dept = this.getAttribute('data-dept');

            // 버튼 활성화
            deptButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // 직원 필터링
            const allRows = document.querySelectorAll('.employee-table tbody tr');
            allRows.forEach(row => {
                const rowDept = row.getAttribute('data-dept');
                if (dept === 'all' || rowDept === dept) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    });

    // 검색 기능
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const allRows = document.querySelectorAll('.employee-table tbody tr');

            allRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // 직원 등록 버튼
    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', function() {
            openEmployeeModal();
        });
    }

    // 모달 닫기 버튼들
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeEmployeeModal);
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeEmployeeModal);
    }

    // 모달 외부 클릭 시 닫기
    if (employeeModal) {
        employeeModal.addEventListener('click', function(e) {
            if (e.target === employeeModal) {
                closeEmployeeModal();
            }
        });
    }

    // 직원 등록 폼 제출
    if (employeeForm) {
        employeeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveEmployee();
        });
    }

    // 저장 버튼 클릭
    if (saveBtn) {
        saveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            saveEmployee();
        });
    }

    // 상세보기 버튼
    const viewButtons = document.querySelectorAll('.btn-icon');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const icon = this.querySelector('i');

            if (icon.classList.contains('fa-eye')) {
                console.log('상세보기');
                alert('직원 상세정보 기능은 추후 구현됩니다.');
            } else if (icon.classList.contains('fa-edit')) {
                console.log('수정');
                alert('직원 정보 수정 기능은 추후 구현됩니다.');
            }
        });
    });
});

// 직원 등록 모달 열기
function openEmployeeModal() {
    const modal = document.getElementById('employeeModal');
    const form = document.getElementById('employeeForm');

    // 폼 초기화
    if (form) {
        form.reset();
        // 자동 사번 생성
        document.getElementById('empId').value = 'EMP' + employeeIdCounter;
    }

    if (modal) {
        modal.classList.add('show');
    }
}

// 직원 등록 모달 닫기
function closeEmployeeModal() {
    const modal = document.getElementById('employeeModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// 직원 저장
function saveEmployee() {
    const form = document.getElementById('employeeForm');

    // 필수 필드 검증
    const empName = document.getElementById('empName').value.trim();
    const empId = document.getElementById('empId').value.trim();
    const department = document.getElementById('empDept').value;
    const position = document.getElementById('empPosition').value;

    if (!empName || !empId || !department || !position) {
        alert('필수 항목을 모두 입력해주세요.');
        return;
    }

    // 직원 데이터 수집
    const employeeData = {
        name: empName,
        id: empId,
        birthDate: document.getElementById('empBirth').value,
        gender: document.getElementById('empGender').value,
        email: document.getElementById('empEmail').value,
        phone: document.getElementById('empPhone').value,
        address: document.getElementById('empAddress').value,
        department: department,
        position: position,
        joinDate: document.getElementById('empJoinDate').value,
        status: document.getElementById('empStatus').value,
        salary: document.getElementById('empSalary').value,
        workType: document.getElementById('empWorkType').value,
        notes: document.getElementById('empNotes').value
    };

    // 테이블에 직원 추가
    addEmployeeToTable(employeeData);

    // 사번 카운터 증가
    employeeIdCounter++;

    // 모달 닫기
    closeEmployeeModal();

    // 성공 메시지
    alert('직원이 성공적으로 등록되었습니다.');
}

// 테이블에 직원 추가
function addEmployeeToTable(data) {
    const tbody = document.querySelector('.employee-table tbody');
    if (!tbody) return;

    // 이니셜 생성
    const initial = data.name.charAt(0);

    // 직급별 뱃지 클래스
    const positionClass = {
        '팀장': 'leader',
        '과장': 'manager',
        '대리': 'senior',
        '사원': 'staff'
    };

    // 상태별 뱃지 클래스와 텍스트
    const statusMap = {
        '재직': { class: 'active', text: '재직' },
        '휴직': { class: 'vacation', text: '휴직' },
        '퇴사': { class: 'inactive', text: '퇴사' }
    };

    const statusInfo = statusMap[data.status] || { class: 'active', text: '재직' };

    // 새 행 생성
    const newRow = document.createElement('tr');
    newRow.setAttribute('data-dept', data.department);

    newRow.innerHTML = `
        <td>
            <div class="employee-name">
                <div class="emp-avatar new">${initial}</div>
                <span>${data.name}</span>
            </div>
        </td>
        <td>${data.id}</td>
        <td>${data.department}</td>
        <td>
            <span class="position-badge ${positionClass[data.position] || 'staff'}">${data.position}</span>
        </td>
        <td>${data.email || '-'}</td>
        <td>${data.phone || '-'}</td>
        <td>${data.joinDate || '-'}</td>
        <td>
            <span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>
        </td>
        <td>
            <button class="btn-icon" title="상세보기">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn-icon" title="수정">
                <i class="fas fa-edit"></i>
            </button>
        </td>
    `;

    // 테이블 맨 위에 추가
    tbody.insertBefore(newRow, tbody.firstChild);

    // 새 버튼에 이벤트 리스너 추가
    const newButtons = newRow.querySelectorAll('.btn-icon');
    newButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const icon = this.querySelector('i');

            if (icon.classList.contains('fa-eye')) {
                alert('직원 상세정보 기능은 추후 구현됩니다.');
            } else if (icon.classList.contains('fa-edit')) {
                alert('직원 정보 수정 기능은 추후 구현됩니다.');
            }
        });
    });

    // 통계 업데이트
    updateStats();
}

// 통계 업데이트
function updateStats() {
    const allRows = document.querySelectorAll('.employee-table tbody tr');
    const totalCount = allRows.length;

    // 부서별 카운트
    const deptCounts = {};
    allRows.forEach(row => {
        const dept = row.getAttribute('data-dept');
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    // 전체 직원 수 업데이트 (있다면)
    const totalStatCard = document.querySelector('.stat-card .stat-value');
    if (totalStatCard) {
        totalStatCard.textContent = totalCount;
    }
}
