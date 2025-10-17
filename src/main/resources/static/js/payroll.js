// 급여 관리 페이지 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const deptFilter = document.getElementById('deptFilter');
    const statusFilter = document.getElementById('statusFilter');
    const employeeSearch = document.getElementById('employeeSearch');
    const monthSelector = document.getElementById('monthSelector');
    const generatePayrollBtn = document.getElementById('generatePayrollBtn');
    const payrollRows = document.querySelectorAll('.payroll-table tbody tr');

    // 부서 필터
    if (deptFilter) {
        deptFilter.addEventListener('change', function() {
            filterPayrollTable();
        });
    }

    // 상태 필터
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            filterPayrollTable();
        });
    }

    // 검색
    if (employeeSearch) {
        employeeSearch.addEventListener('input', function() {
            filterPayrollTable();
        });
    }

    // 필터링 함수
    function filterPayrollTable() {
        const selectedDept = deptFilter?.value || 'all';
        const selectedStatus = statusFilter?.value || 'all';
        const searchTerm = employeeSearch?.value.toLowerCase() || '';

        payrollRows.forEach(row => {
            const dept = row.getAttribute('data-dept');
            const status = row.getAttribute('data-status');
            const text = row.textContent.toLowerCase();

            const deptMatch = selectedDept === 'all' || dept === selectedDept;
            const statusMatch = selectedStatus === 'all' || status === selectedStatus;
            const searchMatch = text.includes(searchTerm);

            if (deptMatch && statusMatch && searchMatch) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });

        // 결과 카운트 업데이트
        updateResultCount();
    }

    // 결과 카운트 업데이트
    function updateResultCount() {
        const visibleRows = Array.from(payrollRows).filter(row => row.style.display !== 'none');
        console.log(`필터링 결과: ${visibleRows.length}명`);
    }

    // 월 선택
    if (monthSelector) {
        monthSelector.addEventListener('change', function() {
            const selectedMonth = this.value;
            console.log('선택된 월:', selectedMonth);
            showAlert(`${selectedMonth} 급여 데이터를 불러옵니다.`, 'info');
            // TODO: 서버에서 해당 월 데이터 로드
        });
    }

    // 급여 명세서 생성
    if (generatePayrollBtn) {
        generatePayrollBtn.addEventListener('click', function() {
            console.log('급여 명세서 생성');
            showAlert('급여 명세서를 생성합니다.\n각 직원의 이메일로 전송됩니다.', 'info');
            // TODO: 급여 명세서 일괄 생성 및 전송
        });
    }

    // 명세서 보기 버튼
    const viewButtons = document.querySelectorAll('.btn-icon');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const icon = this.querySelector('i');
            const row = this.closest('tr');
            const employeeName = row.querySelector('.employee-name span').textContent;

            if (icon.classList.contains('fa-file-alt')) {
                console.log('명세서 보기:', employeeName);
                showPayrollDetail(employeeName, row);
            } else if (icon.classList.contains('fa-download')) {
                console.log('다운로드:', employeeName);
                downloadPayroll(employeeName);
            }
        });
    });

    // 급여 명세서 상세 표시
    function showPayrollDetail(name, row) {
        const baseSalary = row.querySelectorAll('.amount')[0]?.textContent || '0';
        const allowance = row.querySelectorAll('.amount')[1]?.textContent || '0';
        const deduction = row.querySelectorAll('.amount')[2]?.textContent || '0';
        const netPay = row.querySelectorAll('.amount')[3]?.textContent || '0';

        const detailMessage = `
[${name}님 급여 명세서]

기본급: ${baseSalary}원
수당: ${allowance}원
공제액: ${deduction}원
─────────────────
실지급액: ${netPay}원
        `;

        showAlert(detailMessage, 'info');
        // TODO: 실제 명세서 모달 구현
    }

    // 급여 명세서 다운로드
    function downloadPayroll(name) {
        showAlert(`${name}님의 급여 명세서를 다운로드합니다.`, 'info');
        // TODO: PDF 다운로드 구현
    }

    // 금액 포맷팅 (천 단위 콤마)
    function formatCurrency(value) {
        return new Intl.NumberFormat('ko-KR').format(value);
    }

    // 테이블 행 클릭 시 상세보기
    payrollRows.forEach(row => {
        row.addEventListener('click', function() {
            const employeeName = this.querySelector('.employee-name span').textContent;
            showPayrollDetail(employeeName, this);
        });
    });
});
