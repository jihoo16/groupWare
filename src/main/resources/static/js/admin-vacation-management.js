// 관리자 전체 연차관리 페이지 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소
    const searchInput = document.getElementById('searchInput');
    const departmentFilter = document.getElementById('departmentFilter');
    const sortFilter = document.getElementById('sortFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const vacationTableBody = document.getElementById('vacationTableBody');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const noData = document.getElementById('noData');
    const detailModal = document.getElementById('detailModal');
    const closeDetailModal = document.getElementById('closeDetailModal');
    const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');

    // 전역 변수
    let allEmployees = [];
    let filteredEmployees = [];
    let currentSortField = null;
    let currentSortOrder = 'asc'; // 'asc' or 'desc'

    // 초기화
    init();

    function init() {
        loadVacationData();
        attachEventListeners();
    }

    // 이벤트 리스너 연결
    function attachEventListeners() {
        // 검색
        searchInput.addEventListener('input', filterData);

        // 필터
        departmentFilter.addEventListener('change', filterData);
        sortFilter.addEventListener('change', filterData);

        // 새로고침
        refreshBtn.addEventListener('click', function() {
            loadVacationData();
        });

        // Excel 다운로드
        exportExcelBtn.addEventListener('click', function() {
            exportToExcel();
        });

        // 모달 닫기
        closeDetailModal.addEventListener('click', closeModal);
        closeDetailModalBtn.addEventListener('click', closeModal);

        // 모달 외부 클릭 시 닫기
        detailModal.addEventListener('click', function(e) {
            if (e.target === detailModal) {
                closeModal();
            }
        });

        // 테이블 헤더 정렬
        document.querySelectorAll('.vacation-table th.sortable').forEach(header => {
            header.addEventListener('click', function() {
                const sortField = this.getAttribute('data-sort');
                handleSort(sortField);
            });
        });
    }

    // 연차 데이터 로드
    async function loadVacationData() {
        showLoading();

        try {
            const response = await fetch('/api/vacation/admin/all');

            if (!response.ok) {
                throw new Error('데이터를 불러오는데 실패했습니다.');
            }

            const data = await response.json();

            // 데이터 변환
            allEmployees = data.map((item, index) => ({
                id: item.userIdx,
                name: item.empName,
                department: item.empDeptName || item.empDept || '-',
                position: item.empPositionName || item.empPosition || '-',
                totalLeave: item.totalDays || 0,
                usedLeave: item.usedDays || 0,
                remainingLeave: item.remainingDays || 0,
                usageRate: item.totalDays > 0
                    ? Math.round((item.usedDays / item.totalDays) * 100)
                    : 0,
                hireDate: item.empJoinDate || '-',
                leaveHistory: [] // TODO: 연차 사용 이력 API 추가 필요
            }));

            filteredEmployees = [...allEmployees];
            hideLoading();
            renderTable();
            updateStatistics();
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            hideLoading();
            noData.style.display = 'block';
            Swal.fire({
                icon: 'error',
                title: '데이터 로드 실패',
                text: error.message || '데이터를 불러오는데 실패했습니다.'
            });
        }
    }

    // 더미 데이터 생성 함수 (사용 안함 - 제거됨)

    // 통계 업데이트
    function updateStatistics() {
        const totalEmployees = allEmployees.length;
        const avgTotalLeave = (allEmployees.reduce((sum, emp) => sum + emp.totalLeave, 0) / totalEmployees).toFixed(1);
        const avgUsedLeave = (allEmployees.reduce((sum, emp) => sum + emp.usedLeave, 0) / totalEmployees).toFixed(1);
        const avgRemainingLeave = (allEmployees.reduce((sum, emp) => sum + emp.remainingLeave, 0) / totalEmployees).toFixed(1);

        document.getElementById('totalEmployees').textContent = `${totalEmployees}명`;
        document.getElementById('avgTotalLeave').textContent = `${avgTotalLeave}일`;
        document.getElementById('avgUsedLeave').textContent = `${avgUsedLeave}일`;
        document.getElementById('avgRemainingLeave').textContent = `${avgRemainingLeave}일`;
    }

    // 한글 초성 추출
    function getChosung(str) {
        const CHOSUNG_LIST = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
        let result = '';
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i) - 0xAC00;
            if (code > -1 && code < 11172) {
                result += CHOSUNG_LIST[Math.floor(code / 588)];
            } else {
                result += str.charAt(i);
            }
        }
        return result;
    }

    // 초성 검색 매칭
    function matchChosung(str, search) {
        return getChosung(str.toLowerCase()).includes(search);
    }

    // 테이블 헤더 정렬 처리
    function handleSort(sortField) {
        // 같은 필드를 다시 클릭하면 정렬 순서 반전
        if (currentSortField === sortField) {
            currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortField = sortField;
            currentSortOrder = 'asc';
        }

        // 정렬 실행
        sortDataByField(sortField, currentSortOrder);

        // 정렬 아이콘 업데이트
        updateSortIcons();

        // 테이블 렌더링
        renderTable();
    }

    // 정렬 아이콘 업데이트
    function updateSortIcons() {
        document.querySelectorAll('.vacation-table th.sortable').forEach(header => {
            const sortField = header.getAttribute('data-sort');
            const icon = header.querySelector('.sort-icon');

            if (sortField === currentSortField) {
                if (currentSortOrder === 'asc') {
                    icon.className = 'fas fa-sort-up sort-icon active';
                } else {
                    icon.className = 'fas fa-sort-down sort-icon active';
                }
            } else {
                icon.className = 'fas fa-sort sort-icon';
            }
        });
    }

    // 필드별 정렬
    function sortDataByField(field, order) {
        filteredEmployees.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];

            // 숫자 필드 처리
            if (field === 'totalLeave' || field === 'usedLeave' || field === 'remainingLeave' || field === 'usageRate') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            }
            // 날짜 필드 처리
            else if (field === 'hireDate') {
                aVal = aVal === '-' ? '' : aVal;
                bVal = bVal === '-' ? '' : bVal;
            }
            // 문자열 필드 처리
            else {
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
            }

            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // 데이터 필터링
    function filterData() {
        const searchTerm = searchInput.value.trim();
        const searchLower = searchTerm.toLowerCase();
        const departmentValue = departmentFilter.value;
        const sortValue = sortFilter.value;

        // 검색 및 부서 필터
        filteredEmployees = allEmployees.filter(emp => {
            const matchSearch = !searchTerm ||
                emp.name.toLowerCase().includes(searchLower) ||
                emp.department.toLowerCase().includes(searchLower) ||
                emp.position.toLowerCase().includes(searchLower) ||
                matchChosung(emp.name, searchLower) ||
                matchChosung(emp.department, searchLower) ||
                matchChosung(emp.position, searchLower);

            const matchDepartment = !departmentValue || emp.department === departmentValue;

            return matchSearch && matchDepartment;
        });

        // 정렬
        sortData(sortValue);

        renderTable(searchTerm);
    }

    // 데이터 정렬
    function sortData(sortBy) {
        switch(sortBy) {
            case 'name':
                filteredEmployees.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'total':
                filteredEmployees.sort((a, b) => b.totalLeave - a.totalLeave);
                break;
            case 'used':
                filteredEmployees.sort((a, b) => b.usedLeave - a.usedLeave);
                break;
            case 'remaining':
                filteredEmployees.sort((a, b) => b.remainingLeave - a.remainingLeave);
                break;
        }
    }

    // 텍스트 하이라이트 함수
    function highlightText(text, searchTerm) {
        if (!searchTerm || !text) return text;

        const searchLower = searchTerm.toLowerCase();
        const textLower = text.toLowerCase();

        // 일반 문자열 검색
        if (textLower.includes(searchLower)) {
            const regex = new RegExp(`(${searchTerm})`, 'gi');
            return text.replace(regex, '<mark class="highlight-text">$1</mark>');
        }

        // 초성 검색 (매칭되지만 표시는 전체 텍스트)
        if (matchChosung(text, searchLower)) {
            return `<mark class="highlight-text">${text}</mark>`;
        }

        return text;
    }

    // 테이블 렌더링
    function renderTable(searchTerm = '') {
        if (filteredEmployees.length === 0) {
            vacationTableBody.innerHTML = '';
            noData.style.display = 'block';
            return;
        }

        noData.style.display = 'none';

        const html = filteredEmployees.map((emp, index) => {
            const usageClass = emp.usageRate < 50 ? 'low' : emp.usageRate < 80 ? 'medium' : 'high';

            // 검색어가 있으면 텍스트 하이라이트
            const nameHtml = searchTerm ? highlightText(emp.name, searchTerm) : emp.name;
            const departmentHtml = searchTerm ? highlightText(emp.department, searchTerm) : emp.department;
            const positionHtml = searchTerm ? highlightText(emp.position, searchTerm) : emp.position;

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td class="employee-name">${nameHtml}</td>
                    <td>${departmentHtml}</td>
                    <td>${positionHtml}</td>
                    <td><strong>${emp.totalLeave}일</strong></td>
                    <td>${emp.usedLeave}일</td>
                    <td><strong>${emp.remainingLeave}일</strong></td>
                    <td><span class="usage-rate ${usageClass}">${emp.usageRate}%</span></td>
                    <td>${emp.hireDate}</td>
                    <td><button class="btn-detail" onclick="showDetail(${emp.id})">상세보기</button></td>
                </tr>
            `;
        }).join('');

        vacationTableBody.innerHTML = html;
    }

    // 상세보기 모달 표시
    window.showDetail = async function(employeeId) {
        const employee = allEmployees.find(emp => emp.id === employeeId);
        if (!employee) return;

        // 직원 정보
        document.getElementById('detailName').textContent = employee.name;
        document.getElementById('detailDepartment').textContent = employee.department;
        document.getElementById('detailPosition').textContent = employee.position;
        document.getElementById('detailHireDate').textContent = employee.hireDate;

        // 연차 현황
        document.getElementById('detailTotalLeave').textContent = `${employee.totalLeave}일`;
        document.getElementById('detailUsedLeave').textContent = `${employee.usedLeave}일`;
        document.getElementById('detailRemainingLeave').textContent = `${employee.remainingLeave}일`;

        // 연차 사용 이력 로드
        try {
            const year = new Date().getFullYear();
            const response = await fetch(`/api/vacation/history?userIdx=${employee.id}&year=${year}`);

            let leaveHistory = [];
            if (response.ok) {
                leaveHistory = await response.json();
            }

            // days > 0인 레코드만 필터링 (경조사만 있는 레코드 제외)
            const filteredHistory = leaveHistory.filter(item => item.days && parseFloat(item.days) > 0);

            // 연차 사용 이력 표시
            const historyHtml = filteredHistory.map(history => {
                const startDate = history.startDate || '';
                const endDate = history.endDate || '';
                const days = parseFloat(history.days) || 0;
                const vacationType = history.vacationType || '연차';

                // 날짜 포맷팅 (YYYY-MM-DD -> YYYY.MM.DD)
                const formatDate = (dateStr) => {
                    if (!dateStr) return '';
                    return dateStr.replace(/-/g, '.');
                };

                return `
                    <div class="history-item">
                        <div class="history-date">${formatDate(startDate)} ~ ${formatDate(endDate)}</div>
                        <div class="history-content">${days}일 사용 - ${vacationType}</div>
                    </div>
                `;
            }).join('');

            document.getElementById('leaveHistoryList').innerHTML = historyHtml || '<p style="text-align: center; color: #999;">연차 사용 이력이 없습니다</p>';
        } catch (error) {
            console.error('연차 사용 이력 조회 실패:', error);
            document.getElementById('leaveHistoryList').innerHTML = '<p style="text-align: center; color: #e74c3c;">이력 조회 중 오류가 발생했습니다</p>';
        }

        // 모달 표시
        detailModal.classList.add('show');
    };

    // 모달 닫기
    function closeModal() {
        detailModal.classList.remove('show');
    }

    // Excel 다운로드
    function exportToExcel() {
        Swal.fire({
            icon: 'info',
            title: '준비 중',
            text: 'Excel 다운로드 기능은 준비 중입니다.',
            confirmButtonText: '확인'
        });
    }

    // 로딩 표시
    function showLoading() {
        loadingSpinner.style.display = 'block';
        vacationTableBody.innerHTML = '';
        noData.style.display = 'none';
    }

    // 로딩 숨김
    function hideLoading() {
        loadingSpinner.style.display = 'none';
    }
});
