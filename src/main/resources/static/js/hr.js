// 인사 관리 페이지 JavaScript (jQuery + Ajax)

// 전역 변수
let allUsers = []; // 전체 사용자 데이터 캐시
let currentFilter = 'all'; // 현재 부서 필터

// jQuery Ready
$(document).ready(function() {
    // 초기 데이터 로드
    loadDepartments(); // 부서 목록 로드 후 직원 목록 로드
    loadEmployees();
    loadDepartmentOptions(); // 모달 폼 부서 옵션 로드
    loadPositionOptions(); // 모달 폼 직급 옵션 로드

    // 부서 필터 버튼 클릭 (이벤트 위임 방식)
    $('.department-filters').on('click', '.dept-btn', function() {
        const dept = $(this).data('dept');
        currentFilter = dept;

        // 버튼 활성화
        $('.dept-btn').removeClass('active');
        $(this).addClass('active');

        // 직원 필터링
        filterEmployees();
    });

    // 검색 기능
    $('#employeeSearch').on('input', function() {
        const searchTerm = $(this).val().toLowerCase();
        searchEmployees(searchTerm);
    });

    // 직원 등록 버튼
    $('#addEmployeeBtn').on('click', function() {
        openEmployeeModal();
    });

    // 모달 닫기 버튼들
    $('#closeEmployeeModal, #cancelEmployee').on('click', function() {
        closeEmployeeModal();
    });

    // 모달 외부 클릭 시 닫기
    $('#employeeModal').on('click', function(e) {
        if (e.target === this) {
            closeEmployeeModal();
        }
    });

    // 직원 등록 폼 제출
    $('#employeeForm').on('submit', function(e) {
        e.preventDefault();
        saveEmployee();
    });
});

/**
 * Ajax: 부서 목록 조회 및 필터 버튼 생성
 */
function loadDepartments() {
    $.ajax({
        url: '/api/codes/departments?activeOnly=true',
        method: 'GET',
        dataType: 'json',
        success: function(response) {
            console.log('부서 목록 조회 성공:', response);
            renderDepartmentFilters(response);
        },
        error: function(xhr, status, error) {
            console.error('부서 목록 조회 실패:', error);
            // 에러 발생 시 기본 필터만 표시
            renderDepartmentFilters([]);
        }
    });
}

/**
 * 부서 필터 버튼 동적 생성
 */
function renderDepartmentFilters(departments) {
    const $container = $('.department-filters');
    $container.empty();

    // "전체" 버튼 추가
    $container.append(`
        <button class="dept-btn active" data-dept="all">전체</button>
    `);

    // 부서 버튼 추가 (sortOrder 순서대로)
    departments.forEach(function(dept) {
        $container.append(`
            <button class="dept-btn" data-dept="${dept.code}">${dept.codeName}</button>
        `);
    });
}

/**
 * Ajax: 전체 활성 사용자 목록 조회
 */
function loadEmployees() {
    $.ajax({
        url: '/api/users',
        method: 'GET',
        dataType: 'json',
        success: function(response) {
            console.log('사용자 목록 조회 성공:', response);
            allUsers = response; // 전역 변수에 저장
            renderEmployeeTable(response);
            updateStatistics(response);
        },
        error: function(xhr, status, error) {
            console.error('사용자 목록 조회 실패:', error);
            showAlert('직원 목록을 불러오는데 실패했습니다.', 'error');

            // 에러 발생 시 빈 테이블 표시
            $('#employeeTableBody').html(`
                <tr class="empty-message">
                    <td colspan="9" style="text-align: center; padding: 40px; color: #999;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; display: block; color: #ff6b6b;"></i>
                        <p style="font-size: 16px; font-weight: 500; color: #ff6b6b;">직원 목록을 불러오는데 실패했습니다.</p>
                        <p style="font-size: 14px; margin-top: 8px; color: #bbb;">서버 연결을 확인하거나 잠시 후 다시 시도해주세요.</p>
                    </td>
                </tr>
            `);
        }
    });
}

/**
 * 테이블에 직원 목록 렌더링
 */
function renderEmployeeTable(users) {
    const $tbody = $('#employeeTableBody');
    $tbody.empty();

    if (users.length === 0) {
        $tbody.html(`
            <tr class="empty-message">
                <td colspan="9" style="text-align: center; padding: 40px; color: #999;">
                    <i class="fas fa-users" style="font-size: 48px; margin-bottom: 16px; display: block;"></i>
                    <p style="font-size: 16px; font-weight: 500;">등록된 직원이 없습니다.</p>
                    <p style="font-size: 14px; margin-top: 8px; color: #bbb;">상단의 "직원 등록" 버튼을 클릭하여 직원을 추가해주세요.</p>
                </td>
            </tr>
        `);
        return;
    }

    users.forEach(function(user) {
        const row = createEmployeeRow(user);
        $tbody.append(row);
    });

    // 버튼 이벤트 바인딩
    bindEmployeeButtons();
}

/**
 * 직원 행(TR) 생성
 */
function createEmployeeRow(user) {
    // 이름 첫 글자 (아바타용)
    const initial = user.empName ? user.empName.charAt(0) : '?';

    // 직급별 뱃지 클래스 매핑
    const positionClassMap = {
        '사원': 'staff',
        '대리': 'assistant',
        '과장': 'manager',
        '차장': 'seniorManager',
        '부장': 'director',
        '이사': 'executive',
        '전무': 'executive',
        '상무': 'seniorExec',
        '대표이사': 'ceo',
        '대표': 'ceo'
    };
    const positionClass = positionClassMap[user.empPositionName] || 'staff';

    // 상태별 뱃지 클래스 매핑
    const statusClassMap = {
        '재직': 'active',
        '휴직': 'vacation',
        '퇴사': 'inactive'
    };
    const statusClass = statusClassMap[user.empStatus] || 'active';

    // 이번달 입사자 체크 (신규 뱃지용)
    const isNewEmployee = checkNewEmployee(user.empJoinDate);
    const newBadge = isNewEmployee ? 'new' : '';

    return `
        <tr data-idx="${user.idx}" data-dept="${user.empDept}">
            <td>${user.empId || '-'}</td>
            <td>
                <div class="employee-name">
                    <div class="emp-avatar ${newBadge}">${initial}</div>
                    <span>${user.empName || '-'}</span>
                </div>
            </td>
            <td>${user.empDeptName || '-'}</td>
            <td><span class="position-badge ${positionClass}">${user.empPositionName || '-'}</span></td>
            <td>${user.empEmail || '-'}</td>
            <td>${user.empPhone || '-'}</td>
            <td>${user.empJoinDate || '-'}</td>
            <td><span class="status-badge ${statusClass}">${user.empStatus || '-'}</span></td>
            <td>
                <button class="btn-icon btn-view" data-idx="${user.idx}" title="상세정보">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon btn-edit" data-idx="${user.idx}" title="수정">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `;
}

/**
 * 이번달 입사자인지 체크
 */
function checkNewEmployee(joinDate) {
    if (!joinDate) return false;

    const today = new Date();
    const join = new Date(joinDate);

    return today.getFullYear() === join.getFullYear() &&
           today.getMonth() === join.getMonth();
}

/**
 * 직원 버튼 이벤트 바인딩
 */
function bindEmployeeButtons() {
    // 상세보기 버튼
    $('.btn-view').on('click', function() {
        const idx = $(this).data('idx');
        viewEmployeeDetail(idx);
    });

    // 수정 버튼
    $('.btn-edit').on('click', function() {
        const idx = $(this).data('idx');
        editEmployee(idx);
    });
}

/**
 * 직원 상세보기
 */
function viewEmployeeDetail(idx) {
    $.ajax({
        url: `/api/users/${idx}`,
        method: 'GET',
        dataType: 'json',
        success: function(user) {
            console.log('직원 상세 조회 성공:', user);
            // TODO: 상세보기 모달 구현
            showAlert('직원 상세정보 기능은 추후 구현됩니다.', 'info');
        },
        error: function(xhr, status, error) {
            console.error('직원 상세 조회 실패:', error);
            showAlert('직원 정보를 불러오는데 실패했습니다.', 'error');
        }
    });
}

/**
 * 직원 수정
 */
function editEmployee(idx) {
    $.ajax({
        url: `/api/users/${idx}`,
        method: 'GET',
        dataType: 'json',
        success: function(user) {
            console.log('직원 정보 조회 성공:', user);
            // TODO: 수정 모달에 데이터 채우기
            showAlert('직원 정보 수정 기능은 추후 구현됩니다.', 'info');
        },
        error: function(xhr, status, error) {
            console.error('직원 정보 조회 실패:', error);
            showAlert('직원 정보를 불러오는데 실패했습니다.', 'error');
        }
    });
}

/**
 * 통계 업데이트
 */
function updateStatistics(users) {
    const totalCount = users.length;

    // 재직 중인 직원 수
    const activeCount = users.filter(u => u.empStatus === '재직').length;

    // 휴직 중인 직원 수
    const onLeaveCount = users.filter(u => u.empStatus === '휴직').length;

    // 이번달 입사자 수
    const today = new Date();
    const newCount = users.filter(u => {
        if (!u.empJoinDate) return false;
        const joinDate = new Date(u.empJoinDate);
        return joinDate.getFullYear() === today.getFullYear() &&
               joinDate.getMonth() === today.getMonth();
    }).length;

    // 통계 카드 업데이트
    $('#totalCount').text(totalCount);
    $('#activeCount').text(activeCount);
    $('#onLeaveCount').text(onLeaveCount);
    $('#newCount').text(newCount);
}

/**
 * 부서별 필터링
 */
function filterEmployees() {
    const $tbody = $('#employeeTableBody');
    const $rows = $tbody.find('tr').not('.empty-message');

    // 빈 메시지 제거
    $tbody.find('.empty-message').remove();

    if (currentFilter === 'all') {
        $rows.show();
    } else {
        $rows.each(function() {
            const dept = $(this).data('dept');
            if (dept === currentFilter) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    }

    // 필터링 후 보이는 행이 없으면 빈 메시지 표시
    const visibleRows = $rows.filter(':visible').length;
    if (visibleRows === 0) {
        $tbody.append(`
            <tr class="empty-message">
                <td colspan="9" style="text-align: center; padding: 40px; color: #999;">
                    <i class="fas fa-user-slash" style="font-size: 48px; margin-bottom: 16px; display: block;"></i>
                    <p style="font-size: 16px; font-weight: 500;">${currentFilter === 'all' ? '등록된 직원이 없습니다.' : currentFilter + '에 소속된 직원이 없습니다.'}</p>
                    <p style="font-size: 14px; margin-top: 8px; color: #bbb;">다른 부서를 선택하거나 직원을 등록해주세요.</p>
                </td>
            </tr>
        `);
    }
}

/**
 * 검색 기능
 */
function searchEmployees(searchTerm) {
    const $tbody = $('#employeeTableBody');
    const $rows = $tbody.find('tr').not('.empty-message');

    // 빈 메시지 제거
    $tbody.find('.empty-message').remove();

    if (!searchTerm) {
        // 검색어가 없으면 현재 필터만 적용
        filterEmployees();
        return;
    }

    $rows.each(function() {
        const text = $(this).text().toLowerCase();
        const dept = $(this).data('dept');

        // 부서 필터와 검색어 둘 다 만족해야 함
        const matchDept = (currentFilter === 'all' || dept === currentFilter);
        const matchSearch = text.includes(searchTerm);

        if (matchDept && matchSearch) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });

    // 검색 후 보이는 행이 없으면 빈 메시지 표시
    const visibleRows = $rows.filter(':visible').length;
    if (visibleRows === 0) {
        const deptText = currentFilter === 'all' ? '전체' : currentFilter;
        $tbody.append(`
            <tr class="empty-message">
                <td colspan="9" style="text-align: center; padding: 40px; color: #999;">
                    <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px; display: block;"></i>
                    <p style="font-size: 16px; font-weight: 500;">"${searchTerm}" 검색 결과가 없습니다.</p>
                    <p style="font-size: 14px; margin-top: 8px; color: #bbb;">
                        ${deptText}에서 해당하는 직원을 찾을 수 없습니다.<br>
                        검색어를 다시 확인하거나 부서 필터를 변경해주세요.
                    </p>
                </td>
            </tr>
        `);
    }
}

/**
 * 직원 등록 모달 열기
 */
function openEmployeeModal() {
    $('#employeeModal').addClass('show');
    $('#employeeForm')[0].reset();
    $('#modalTitle').text('직원 등록');
}

/**
 * 직원 등록 모달 닫기
 */
function closeEmployeeModal() {
    $('#employeeModal').removeClass('show');
}

/**
 * 직원 저장 (생성)
 */
function saveEmployee() {
    // 폼 데이터 수집
    const employeeData = {
        empId: $('#empId').val().trim(),
        empName: $('#empName').val().trim(),
        empBirth: $('#empBirth').val(),
        empGender: $('#empGender').val(),
        empEmail: $('#empEmail').val().trim(),
        externalEmail: $('#externalEmail').val().trim(),
        empPhone: $('#empPhone').val().trim(),
        emergencyContact: $('#emergencyContact').val().trim(),
        empAddress: $('#empAddress').val().trim(),
        empDept: $('#empDept').val(),
        empPosition: $('#empPosition').val(),
        empJoinDate: $('#empJoinDate').val(),
        empStatus: $('#empStatus').val(),
        empWorkType: $('#empWorkType').val(),
        empNotes: $('#empNotes').val().trim(),
        password: 'temp1234' // 임시 비밀번호 (실제로는 별도 입력 받아야 함)
    };

    // 필수 필드 검증
    if (!employeeData.empName || !employeeData.empId || !employeeData.empEmail) {
        showAlert('필수 항목을 모두 입력해주세요.', 'warning');
        return;
    }

    // Ajax: 직원 생성 API 호출
    $.ajax({
        url: '/api/users',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(employeeData),
        success: function(response) {
            console.log('직원 등록 성공:', response);
            showAlert('직원이 성공적으로 등록되었습니다.', 'success');
            closeEmployeeModal();
            loadEmployees(); // 목록 새로고침
        },
        error: function(xhr, status, error) {
            console.error('직원 등록 실패:', xhr.responseJSON);
            const errorMsg = xhr.responseJSON?.error || '직원 등록에 실패했습니다.';
            showAlert(errorMsg, 'error');
        }
    });
}

/**
 * 모달 폼 부서 옵션 동적 로드
 */
function loadDepartmentOptions() {
    $.ajax({
        url: '/api/codes/departments?activeOnly=true',
        method: 'GET',
        dataType: 'json',
        success: function(response) {
            console.log('부서 옵션 로드 성공:', response);
            const $select = $('#empDept');
            $select.empty();
            $select.append('<option value="">선택하세요</option>');

            response.forEach(function(dept) {
                $select.append(`<option value="${dept.code}">${dept.codeName}</option>`);
            });
        },
        error: function(xhr, status, error) {
            console.error('부서 옵션 로드 실패:', error);
        }
    });
}

/**
 * 모달 폼 직급 옵션 동적 로드
 */
function loadPositionOptions() {
    $.ajax({
        url: '/api/codes/ranks?activeOnly=true',
        method: 'GET',
        dataType: 'json',
        success: function(response) {
            console.log('직급 옵션 로드 성공:', response);
            const $select = $('#empPosition');
            $select.empty();
            $select.append('<option value="">선택하세요</option>');

            response.forEach(function(position) {
                $select.append(`<option value="${position.code}">${position.codeName}</option>`);
            });
        },
        error: function(xhr, status, error) {
            console.error('직급 옵션 로드 실패:', error);
        }
    });
}
