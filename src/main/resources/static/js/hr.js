// 사용자 관리 페이지 JavaScript (jQuery + Ajax)

// SearchUtils 초기화
const searchUtils = new SearchUtils();

// 전역 변수
let allUsers = []; // 전체 사용자 데이터 캐시
let currentFilter = 'all'; // 현재 부서 필터
let sortColumn = null; // 현재 정렬 컬럼
let sortDirection = 'asc'; // 현재 정렬 방향 (asc/desc)
let currentSearchKeyword = ''; // 현재 검색어

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
        const searchTerm = $(this).val().trim();
        currentSearchKeyword = searchTerm;
        searchEmployees(searchTerm);
    });

    // 정렬 헤더 클릭 (이벤트 위임 방식)
    $('.employee-table thead').on('click', 'th.sortable', function() {
        const column = $(this).data('sort');
        sortEmployees(column);
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

    // 상세보기 모달 닫기 버튼들
    $('#closeEmployeeViewModal, #closeEmployeeViewModal2').on('click', function() {
        $('#employeeViewModal').removeClass('show');
    });

    // 상세보기 모달 외부 클릭 시 닫기
    $('#employeeViewModal').on('click', function(e) {
        if (e.target === this) {
            $('#employeeViewModal').removeClass('show');
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

            // 현재 정렬 상태가 있으면 정렬 적용, 없으면 그대로 렌더링
            if (sortColumn) {
                applySortAndRender();
            } else {
                renderEmployeeTable(response);
            }

            updateStatistics(response);
        },
        error: function(xhr, status, error) {
            console.error('사용자 목록 조회 실패:', error);
            showError('직원 목록을 불러오는데 실패했습니다.', '조회 실패');

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
 * 직원 행(TR) 생성 (SearchUtils 하이라이트 적용)
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

    // 하이라이트 적용
    const empId = currentSearchKeyword ?
        searchUtils.highlightText(user.empId || '-', currentSearchKeyword) :
        (user.empId || '-');

    const empName = currentSearchKeyword ?
        searchUtils.highlightText(user.empName || '-', currentSearchKeyword) :
        (user.empName || '-');

    const empDeptName = currentSearchKeyword ?
        searchUtils.highlightText(user.empDeptName || '-', currentSearchKeyword) :
        (user.empDeptName || '-');

    const empPositionName = currentSearchKeyword ?
        searchUtils.highlightText(user.empPositionName || '-', currentSearchKeyword) :
        (user.empPositionName || '-');

    const empEmail = currentSearchKeyword ?
        searchUtils.highlightText(user.empEmail || '-', currentSearchKeyword) :
        (user.empEmail || '-');

    const empPhone = currentSearchKeyword ?
        searchUtils.highlightText(user.empPhone || '-', currentSearchKeyword) :
        (user.empPhone || '-');

    return `
        <tr data-idx="${user.idx}" data-dept="${user.empDept}">
            <td>${empId}</td>
            <td>
                <div class="employee-name">
                    <div class="emp-avatar ${newBadge}">${initial}</div>
                    <span>${empName}</span>
                </div>
            </td>
            <td>${empDeptName}</td>
            <td><span class="position-badge ${positionClass}">${empPositionName}</span></td>
            <td>${empEmail}</td>
            <td>${empPhone}</td>
            <td>${user.empJoinDate || '-'}</td>
            <td><span class="status-badge ${statusClass}">${user.empStatus || '-'}</span></td>
            <td>
                <button class="btn-icon btn-view" data-idx="${user.idx}" data-tip="상세정보">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon btn-edit" data-idx="${user.idx}" data-tip="수정">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" data-idx="${user.idx}" data-tip="삭제">
                    <i class="fas fa-trash"></i>
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

    // 삭제 버튼
    $('.btn-delete').on('click', function() {
        const idx = $(this).data('idx');
        deleteEmployee(idx);
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

            // 상세보기 모달 열기
            $('#employeeViewModal').addClass('show');

            // 데이터 채우기 (텍스트 형식)
            $('#view-empId').text(user.empId || '-');
            $('#view-empName').text(user.empName || '-');
            $('#view-empBirth').text(user.empBirth || '-');
            $('#view-empGender').text(user.empGender || '-');
            $('#view-empEmail').text(user.empEmail || '-');
            $('#view-externalEmail').text(user.externalEmail || '-');
            $('#view-empPhone').text(user.empPhone || '-');
            $('#view-emergencyContact').text(user.emergencyContact || '-');
            $('#view-empAddress').text(user.empAddress || '-');
            $('#view-empDept').text(user.empDeptName || user.empDept || '-');
            $('#view-empPosition').text(user.empPositionName || user.empPosition || '-');
            $('#view-empJoinDate').text(user.empJoinDate || '-');
            $('#view-empStatus').text(user.empStatus || '-');
            $('#view-empWorkType').text(user.empWorkType || '-');
            $('#view-empNotes').text(user.empNotes || '-');
        },
        error: function(xhr, status, error) {
            console.error('직원 상세 조회 실패:', error);
            showError('직원 정보를 불러오는데 실패했습니다.', '조회 실패');
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

            // 모달 열기
            $('#employeeModal').addClass('show');
            $('#modalTitle').text('직원 정보 수정');

            // 부서 및 직급 옵션 로드
            loadDepartmentOptions();
            loadPositionOptions();

            // 숨겨진 필드에 idx 저장 (수정 모드 식별용)
            $('#employeeId').val(user.idx);

            // 모든 입력 필드 활성화 (상세보기 모드에서 넘어올 수 있으므로)
            $('#employeeForm input, #employeeForm select, #employeeForm textarea').prop('disabled', false);

            // 버튼 원상복구
            $('#saveEmployee').show();
            $('#cancelEmployee').text('취소');

            // 폼에 데이터 채우기
            $('#empId').val(user.empId).prop('readonly', true); // 사번은 수정 불가
            $('#empName').val(user.empName);
            $('#empBirth').val(user.empBirth);
            $('#empGender').val(user.empGender);
            $('#empEmail').val(user.empEmail);
            $('#externalEmail').val(user.externalEmail || '');
            $('#empPhone').val(user.empPhone);
            $('#emergencyContact').val(user.emergencyContact || '');
            $('#empAddress').val(user.empAddress || '');

            // 부서와 직급은 옵션 로드 후 설정 (약간의 딜레이 필요)
            setTimeout(function() {
                $('#empDept').val(user.empDept);
                $('#empPosition').val(user.empPosition);
            }, 100);

            $('#empJoinDate').val(user.empJoinDate);
            $('#empStatus').val(user.empStatus);
            $('#empWorkType').val(user.empWorkType);
            $('#empNotes').val(user.empNotes || '');
        },
        error: function(xhr, status, error) {
            console.error('직원 정보 조회 실패:', error);
            showError('직원 정보를 불러오는데 실패했습니다.', '조회 실패');
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
 * 검색 기능 (SearchUtils 사용 - 초성 검색 지원)
 */
function searchEmployees(searchTerm) {
    const $tbody = $('#employeeTableBody');
    const $rows = $tbody.find('tr').not('.empty-message');

    // 빈 메시지 제거
    $tbody.find('.empty-message').remove();

    if (!searchTerm) {
        // 검색어가 없으면 현재 필터만 적용
        currentSearchKeyword = '';
        filterEmployees();
        return;
    }

    $rows.each(function() {
        const $row = $(this);
        const idx = $row.data('idx');
        const dept = $row.data('dept');

        // 전역 allUsers에서 해당 사용자 데이터 찾기
        const user = allUsers.find(u => u.idx === idx);

        if (!user) {
            $row.hide();
            return;
        }

        // 부서 필터와 검색어 둘 다 만족해야 함
        const matchDept = (currentFilter === 'all' || dept === currentFilter);

        // SearchUtils를 사용한 초성 검색
        const matchSearch = searchUtils.matchesObject(
            user,
            searchTerm,
            ['empId', 'empName', 'empDeptName', 'empPositionName', 'empEmail', 'empPhone']
        );

        if (matchDept && matchSearch) {
            // 하이라이트 적용하여 행 다시 렌더링
            const highlightedRow = createEmployeeRow(user);
            $row.replaceWith(highlightedRow);
        } else {
            $row.hide();
        }
    });

    // 검색 후 보이는 행이 없으면 빈 메시지 표시 (replaceWith 후 재조회)
    const visibleRows = $tbody.find('tr').not('.empty-message').filter(':visible').length;
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
 * 현재 정렬 상태 적용 및 렌더링 (방향 토글 없이)
 */
function applySortAndRender() {
    if (!sortColumn) {
        renderEmployeeTable(allUsers);
        filterEmployees(); // 필터 재적용
        return;
    }

    const sortedUsers = [...allUsers].sort((a, b) => {
        let valueA, valueB;

        switch(sortColumn) {
            case 'empId':
                valueA = a.empId || '';
                valueB = b.empId || '';
                break;
            case 'empName':
                valueA = a.empName || '';
                valueB = b.empName || '';
                break;
            case 'empDept':
                // 부서는 코드명으로 정렬 (가나다순)
                valueA = a.empDeptName || a.empDept || '';
                valueB = b.empDeptName || b.empDept || '';
                break;
            case 'empPosition':
                // 직급은 코드 값으로 정렬 (C0201=사원이 가장 낮음, 코드 값이 클수록 높은 직급)
                // 오름차순 = 직급 높은 순 = 코드 값 역순
                valueA = a.empPosition || '';
                valueB = b.empPosition || '';
                // 직급만 정렬 방향 반대로 적용
                if (sortDirection === 'asc') {
                    return valueB.localeCompare(valueA, 'ko'); // 역순 (높은 직급부터)
                } else {
                    return valueA.localeCompare(valueB, 'ko'); // 정순 (낮은 직급부터)
                }
            default:
                return 0;
        }

        // 직급 외의 컬럼은 일반 정렬
        if (sortDirection === 'asc') {
            return valueA.localeCompare(valueB, 'ko');
        } else {
            return valueB.localeCompare(valueA, 'ko');
        }
    });

    renderEmployeeTable(sortedUsers);
    updateSortIndicators();
    filterEmployees(); // 정렬 후 필터 재적용
}

/**
 * 직원 정렬 (컬럼 헤더 클릭 시)
 */
function sortEmployees(column) {
    // 같은 컬럼 클릭 시 정렬 방향 토글, 다른 컬럼 클릭 시 오름차순으로 초기화
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }

    // 정렬 적용 및 렌더링
    applySortAndRender();
}

/**
 * 정렬 표시 업데이트
 */
function updateSortIndicators() {
    // 모든 정렬 가능한 헤더의 클래스 초기화
    $('.employee-table th.sortable').removeClass('sorted-asc sorted-desc');

    // 현재 정렬된 컬럼에 클래스 추가
    if (sortColumn) {
        $(`.employee-table th.sortable[data-sort="${sortColumn}"]`)
            .addClass(`sorted-${sortDirection}`);
    }
}

/**
 * 직원 등록 모달 열기
 */
function openEmployeeModal() {
    $('#employeeModal').addClass('show');
    $('#employeeForm')[0].reset();
    $('#modalTitle').text('직원 등록');

    // 등록 모드: employeeId 비우기 (수정 모드와 구분)
    $('#employeeId').val('');

    // 모든 입력 필드 활성화 (상세보기/수정 모드에서 넘어올 수 있으므로)
    $('#employeeForm input, #employeeForm select, #employeeForm textarea').prop('disabled', false);

    // 사번 필드 readonly 해제 (등록 모드에서는 자동 생성)
    $('#empId').prop('readonly', false);

    // 버튼 원상복구
    $('#saveEmployee').show();
    $('#cancelEmployee').text('취소');

    // 부서 및 직급 옵션 로드 (모달 열 때마다)
    loadDepartmentOptions();
    loadPositionOptions();

    // 생년월일 기본값 설정 (1990-01-01)
    $('#empBirth').val('1990-01-01');

    // 입사일 기본값 설정 (오늘 날짜)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    $('#empJoinDate').val(todayStr);

    // 백엔드 API를 통해 사번 자동 생성
    $.ajax({
        url: '/api/users/next-employee-id',
        method: 'GET',
        dataType: 'json',
        success: function(response) {
            console.log('다음 사번 조회 성공:', response);
            $('#empId').val(response.empId);
        },
        error: function(xhr, status, error) {
            console.error('사번 생성 실패:', error);
            // 실패 시 기본값 설정 (날짜 + 01)
            const fallbackEmpId = `${year}${month}${day}01`;
            $('#empId').val(fallbackEmpId);
            showWarning('사번 생성 중 오류가 발생했습니다. 기본값이 설정되었습니다.', '사번 생성 오류');
        }
    });
}

/**
 * 직원 등록 모달 닫기
 */
function closeEmployeeModal() {
    $('#employeeModal').removeClass('show');
}

/**
 * 직원 저장 (생성 또는 수정)
 */
function saveEmployee() {
    const employeeId = $('#employeeId').val(); // 수정 모드인지 확인
    const isEditMode = employeeId && employeeId.length > 0;

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
        empNotes: $('#empNotes').val().trim()
    };

    // 등록 모드일 때만 password 추가
    if (!isEditMode) {
        employeeData.password = 'temp1234'; // 임시 비밀번호
    }

    // 필수 필드 검증
    if (!employeeData.empName || !employeeData.empId || !employeeData.empEmail) {
        showWarning('필수 항목을 모두 입력해주세요.', '입력 오류');
        return;
    }

    // 수정 모드와 등록 모드 분기
    if (isEditMode) {
        // 수정: PUT /api/users/{idx}
        $.ajax({
            url: `/api/users/${employeeId}`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(employeeData),
            success: function(response) {
                console.log('직원 수정 성공:', response);
                showSuccess('직원 정보가 성공적으로 수정되었습니다.', '수정 완료');
                closeEmployeeModal();
                loadEmployees(); // 목록 새로고침
            },
            error: function(xhr, status, error) {
                console.error('직원 수정 실패:', xhr.responseJSON);
                const errorMsg = xhr.responseJSON?.error || '직원 정보 수정에 실패했습니다.';
                showError(errorMsg, '수정 실패');
            }
        });
    } else {
        // 등록: POST /api/users
        $.ajax({
            url: '/api/users',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(employeeData),
            success: function(response) {
                console.log('직원 등록 성공:', response);
                showSuccess('직원이 성공적으로 등록되었습니다.', '등록 완료');
                closeEmployeeModal();
                loadEmployees(); // 목록 새로고침
            },
            error: function(xhr, status, error) {
                console.error('직원 등록 실패:', xhr.responseJSON);
                const errorMsg = xhr.responseJSON?.error || '직원 등록에 실패했습니다.';
                showError(errorMsg, '등록 실패');
            }
        });
    }
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

            response.forEach(function(position) {
                $select.append(`<option value="${position.code}">${position.codeName}</option>`);
            });
        },
        error: function(xhr, status, error) {
            console.error('직급 옵션 로드 실패:', error);
        }
    });
}

/**
 * 직원 삭제 (Soft Delete)
 */
function deleteEmployee(idx) {
    // 삭제할 직원 정보 조회
    const user = allUsers.find(u => u.idx === idx);
    if (!user) {
        showError('직원 정보를 찾을 수 없습니다.', '오류');
        return;
    }

    // SweetAlert2로 삭제 확인
    Swal.fire({
        title: '직원 삭제',
        html: `<strong>${user.empName}</strong> (${user.empId}) 직원을 삭제하시겠습니까?<br><br>` ,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#999',
        confirmButtonText: '삭제',
        cancelButtonText: '취소'
    }).then((result) => {
        if (result.isConfirmed) {
            // 삭제 API 호출
            $.ajax({
                url: `/api/users/${idx}`,
                method: 'DELETE',
                success: function(response) {
                    console.log('직원 삭제 성공:', response);
                    Swal.fire({
                        icon: 'success',
                        title: '삭제 완료',
                        text: '직원이 성공적으로 삭제되었습니다.',
                        confirmButtonText: '확인'
                    });
                    loadEmployees(); // 목록 새로고침
                },
                error: function(xhr, status, error) {
                    console.error('직원 삭제 실패:', xhr.responseJSON);
                    const errorMsg = xhr.responseJSON?.error || '직원 삭제에 실패했습니다.';
                    Swal.fire({
                        icon: 'error',
                        title: '삭제 실패',
                        text: errorMsg,
                        confirmButtonText: '확인'
                    });
                }
            });
        }
    });
}
