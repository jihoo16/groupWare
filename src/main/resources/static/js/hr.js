// 인사 관리 페이지 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const deptButtons = document.querySelectorAll('.dept-btn');
    const employeeRows = document.querySelectorAll('.employee-table tbody tr');
    const searchInput = document.getElementById('employeeSearch');
    const addEmployeeBtn = document.getElementById('addEmployeeBtn');

    // 부서 필터 버튼 클릭
    deptButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const dept = this.getAttribute('data-dept');

            // 버튼 활성화
            deptButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // 직원 필터링
            employeeRows.forEach(row => {
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

            employeeRows.forEach(row => {
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
            console.log('직원 등록');
            // TODO: 직원 등록 모달 구현
            alert('직원 등록 기능은 추후 구현됩니다.');
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
