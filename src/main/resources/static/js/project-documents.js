// 프로젝트 문서함 메인 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 검색 유틸리티 초기화
    const searchUtils = new SearchUtils();

    // DOM 요소
    const sidebarMenuItems = document.querySelectorAll('.approval-sidebar .sidebar-menu .menu-item');
    const documentList = document.getElementById('documentList');
    const emptyState = document.getElementById('emptyState');
    const contentTitle = document.querySelector('.content-title');
    const searchInput = document.getElementById('searchInput');
    const periodFilter = document.getElementById('periodFilter');
    const dateRangeContainer = document.getElementById('dateRangeContainer');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const btnDateSearch = document.getElementById('btnDateSearch');
    const btnDateReset = document.getElementById('btnDateReset');
    const sortableHeaders = document.querySelectorAll('.document-table thead th.sortable');

    let currentCategory = 'all';
    let selectedPeriod = 'all';
    let customStartDate = null;
    let customEndDate = null;
    let allDocuments = []; // 전체 문서 데이터 (원본)
    let currentSortColumn = 'date';
    let currentSortOrder = 'desc'; // 'asc' or 'desc'

    // 페이징 관련 변수
    let currentPage = 1;
    const itemsPerPage = 10;
    let filteredRows = []; // 필터링된 행들

    // 프로젝트 관련 문서 타입 정의 (한글 + 영문 enum)
    const PROJECT_DOCUMENT_TYPES = [
        '프로젝트 주간업무보고',
        '연구비증빙-회의록',
        '연구비증빙-출장',
        '연구비증빙-출장+회의',
        '연구비증빙(야근식대)',
        'WEEKLY_REPORT',
        'MEETING_MINUTES',
        'BUSINESS_TRIP',
        'RECEIPT_MEETING'
    ];

    // 새 문서 작성 드롭다운
    const newDocumentBtn = document.getElementById('newDocumentBtn');
    const documentTypeMenu = document.getElementById('documentTypeMenu');

    if (newDocumentBtn && documentTypeMenu) {
        newDocumentBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            documentTypeMenu.classList.toggle('show');
        });

        // 드롭다운 외부 클릭 시 닫기
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.dropdown-container')) {
                documentTypeMenu.classList.remove('show');
            }
        });
    }

    // 사이드바 메뉴 클릭
    sidebarMenuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();

            // 활성화 상태 변경
            sidebarMenuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            // 문서함 선택
            const category = this.getAttribute('data-category');

            if (category) {
                currentCategory = category;
                updateContentTitle(category);
            }

            currentPage = 1; // 카테고리 변경 시 첫 페이지로
            filterDocuments();
        });
    });

    // 제목 업데이트
    function updateContentTitle(category) {
        const titles = {
            'all': '전체 문서',
            'project-weekly-report': '프로젝트 주간보고',
            'receipt-meeting': '회의비 증빙',
            'receipt-trip': '여비 증빙',
            'receipt-trip-meeting': '여비+회의비 증빙',
            'receipt-overtime': '야근식대 증빙'
        };

        contentTitle.textContent = titles[category] || '문서 목록';
    }

    // 문서 필터링
    function filterDocuments() {
        const searchKeyword = searchInput.value.trim();

        // 검색어가 변경되었으면 문서 테이블 다시 렌더링 (하이라이트 적용)
        if (searchKeyword) {
            renderDocumentTableWithHighlight(searchKeyword);
        } else {
            // 검색어가 없으면 일반 렌더링
            renderDocumentTable();
        }

        const docRows = documentList.querySelectorAll('.doc-row');
        filteredRows = [];

        docRows.forEach(row => {
            const category = row.getAttribute('data-category');
            const createdAt = row.getAttribute('data-created-at');
            const eventDate = row.getAttribute('data-event-date');

            let show = true;

            // 문서함 필터
            if (currentCategory && currentCategory !== 'all') {
                if (currentCategory === 'all-expense') {
                    show = category !== 'project-weekly-report';
                } else {
                    show = category === currentCategory;
                }
            }

            // 기간 필터 - eventDate 우선 사용, 없으면 createdAt 사용
            if (selectedPeriod !== 'all' && (eventDate || createdAt)) {
                const dateToCompare = eventDate || createdAt;
                const docDate = new Date(dateToCompare);
                const dateRange = getDateRangeForPeriod(selectedPeriod);

                if (dateRange) {
                    // 시간을 00:00:00으로 정규화하여 날짜만 비교
                    const docDateOnly = new Date(docDate.getFullYear(), docDate.getMonth(), docDate.getDate());
                    show = show && docDateOnly >= dateRange.start && docDateOnly <= dateRange.end;
                }
            }

            // 검색 필터 (초성 검색 지원)
            if (searchKeyword) {
                const titleCell = row.querySelector('.doc-title-cell');
                const title = titleCell ? titleCell.querySelector('.title-wrap').textContent : '';
                const desc = titleCell ? titleCell.querySelector('.desc-wrap').textContent : '';
                const drafterName = row.querySelector('td:nth-child(3)').textContent;
                const deptName = row.querySelector('td:nth-child(4)').textContent;

                show = show && (
                    searchUtils.matchesSearch(title, searchKeyword) ||
                    searchUtils.matchesSearch(desc, searchKeyword) ||
                    searchUtils.matchesSearch(drafterName, searchKeyword) ||
                    searchUtils.matchesSearch(deptName, searchKeyword)
                );
            }

            if (show) {
                filteredRows.push(row);
            }
        });

        // 페이징 적용
        applyPagination();
    }

    // 페이징 적용
    function applyPagination() {
        const table = documentList.querySelector('.document-table');
        const tbody = documentList.querySelector('tbody');

        // 모든 행 숨기기
        const allRows = tbody.querySelectorAll('.doc-row');
        allRows.forEach(row => row.style.display = 'none');

        // 현재 페이지에 해당하는 행만 표시
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageRows = filteredRows.slice(startIndex, endIndex);

        pageRows.forEach(row => {
            row.style.display = '';
        });

        // 빈 상태 표시
        if (filteredRows.length === 0) {
            if (table) table.style.display = 'none';
            emptyState.style.display = 'flex';
        } else {
            if (table) table.style.display = 'table';
            emptyState.style.display = 'none';
        }

        // 페이지네이션 UI 업데이트
        updatePagination();
    }

    // 페이지네이션 UI 업데이트
    function updatePagination() {
        const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
        const paginationContainer = document.querySelector('.pagination');

        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';
        paginationContainer.innerHTML = '';

        // 이전 버튼
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                applyPagination();
            }
        });
        paginationContainer.appendChild(prevBtn);

        // 페이지 번호
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                const pageBtn = document.createElement('button');
                pageBtn.className = 'page-btn' + (i === currentPage ? ' active' : '');
                pageBtn.textContent = i;
                pageBtn.addEventListener('click', () => {
                    currentPage = i;
                    applyPagination();
                });
                paginationContainer.appendChild(pageBtn);
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                const dots = document.createElement('span');
                dots.className = 'page-dots';
                dots.textContent = '...';
                paginationContainer.appendChild(dots);
            }
        }

        // 다음 버튼
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                applyPagination();
            }
        });
        paginationContainer.appendChild(nextBtn);
    }

    // 검색 입력
    searchInput.addEventListener('input', function() {
        currentPage = 1;
        filterDocuments();
    });

    // 기간 필터 변경
    periodFilter.addEventListener('change', function() {
        selectedPeriod = this.value;

        // 직접입력 선택 시 날짜 범위 컨테이너 표시
        if (selectedPeriod === 'custom') {
            dateRangeContainer.style.display = 'block';
            // 오늘 날짜를 기본값으로 설정
            const today = new Date().toISOString().split('T')[0];
            if (!startDateInput.value) startDateInput.value = today;
            if (!endDateInput.value) endDateInput.value = today;
        } else {
            dateRangeContainer.style.display = 'none';
            customStartDate = null;
            customEndDate = null;
            currentPage = 1;
            filterDocuments();
        }
    });

    // 날짜 조회 버튼
    btnDateSearch.addEventListener('click', function() {
        if (!startDateInput.value || !endDateInput.value) {
            Swal.fire({
                icon: 'warning',
                title: '날짜를 선택해주세요',
                text: '시작일과 종료일을 모두 선택해주세요.'
            });
            return;
        }

        const start = new Date(startDateInput.value);
        const end = new Date(endDateInput.value);

        if (start > end) {
            Swal.fire({
                icon: 'error',
                title: '잘못된 날짜 범위',
                text: '시작일은 종료일보다 이전이어야 합니다.'
            });
            return;
        }

        customStartDate = startDateInput.value;
        customEndDate = endDateInput.value;
        currentPage = 1;
        filterDocuments();
    });

    // 날짜 초기화 버튼
    btnDateReset.addEventListener('click', function() {
        startDateInput.value = '';
        endDateInput.value = '';
        customStartDate = null;
        customEndDate = null;
        selectedPeriod = 'all';
        periodFilter.value = 'all';
        dateRangeContainer.style.display = 'none';
        currentPage = 1;
        filterDocuments();
    });

    // 테이블 헤더 클릭 정렬
    console.log('정렬 가능한 헤더 수:', sortableHeaders.length);
    sortableHeaders.forEach(header => {
        // 클릭 가능한 스타일 추가
        header.style.cursor = 'pointer';
        header.style.userSelect = 'none';

        header.addEventListener('click', function() {
            const sortColumn = this.getAttribute('data-sort');
            console.log('헤더 클릭:', sortColumn);

            // 같은 컬럼을 클릭하면 정렬 순서 변경
            if (currentSortColumn === sortColumn) {
                currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumn = sortColumn;
                currentSortOrder = sortColumn === 'date' ? 'desc' : 'asc'; // 날짜는 기본 내림차순, 나머지는 오름차순
            }

            console.log('정렬:', sortColumn, currentSortOrder);

            // 정렬 수행
            sortDocumentsByColumn(sortColumn, currentSortOrder);

            // 정렬 아이콘 업데이트
            updateSortIcons();
        });
    });

    // 컬럼별 문서 정렬 (테이블 헤더 클릭용)
    function sortDocumentsByColumn(column, order) {
        console.log('sortDocumentsByColumn 호출:', column, order);

        // 문서 타입 표시 이름 매핑
        const displayNameMap = {
            'WEEKLY_REPORT': '프로젝트 주간업무보고',
            'RECEIPT_MEETING': '연구비증빙-회의록',
            'BUSINESS_TRIP': '연구비증빙-출장',
            'MEETING_MINUTES': '연구비증빙-회의록',
            'RECEIPT_OVERTIME': '연구비증빙(야근식대)'
        };

        // allDocuments 배열을 정렬
        allDocuments.sort((a, b) => {
            let valueA, valueB;

            switch (column) {
                case 'type':
                    valueA = displayNameMap[a.documentType] || a.documentType || '';
                    valueB = displayNameMap[b.documentType] || b.documentType || '';
                    break;
                case 'title':
                    valueA = a.title || '';
                    valueB = b.title || '';
                    break;
                case 'drafter':
                    valueA = a.drafterName || '';
                    valueB = b.drafterName || '';
                    break;
                case 'department':
                    valueA = a.drafterDeptName || '';
                    valueB = b.drafterDeptName || '';
                    break;
                case 'date':
                    valueA = new Date(a.createdAt);
                    valueB = new Date(b.createdAt);
                    break;
                default:
                    return 0;
            }

            // 날짜는 Date 객체 비교, 나머지는 문자열 비교
            if (column === 'date') {
                return order === 'asc' ? valueA - valueB : valueB - valueA;
            } else {
                const comparison = valueA.localeCompare(valueB, 'ko');
                return order === 'asc' ? comparison : -comparison;
            }
        });

        console.log('정렬 완료, 테이블 재렌더링');

        // 테이블 재렌더링
        renderDocumentTable();

        // 필터링 다시 적용
        filterDocuments();
    }

    // 정렬 아이콘 업데이트
    function updateSortIcons() {
        sortableHeaders.forEach(header => {
            const icon = header.querySelector('i');
            const column = header.getAttribute('data-sort');

            if (column === currentSortColumn) {
                // 현재 정렬 중인 컬럼
                icon.className = currentSortOrder === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
            } else {
                // 정렬 중이 아닌 컬럼
                icon.className = 'fas fa-sort';
            }
        });
    }

    // 문서 카테고리 매핑
    function getCategoryFromDocumentType(documentType) {
        const categoryMap = {
            '프로젝트 주간업무보고': 'project-weekly-report',
            'WEEKLY_REPORT': 'project-weekly-report',
            '연구비증빙-회의록': 'receipt-meeting',
            'RECEIPT_MEETING': 'receipt-meeting',
            '연구비증빙-출장': 'receipt-trip',
            'BUSINESS_TRIP': 'receipt-trip',
            '연구비증빙-출장+회의': 'receipt-trip-meeting',
            'MEETING_MINUTES': 'receipt-meeting',
            '연구비증빙(야근식대)': 'receipt-overtime',
            'RECEIPT_OVERTIME': 'receipt-overtime'
        };
        return categoryMap[documentType] || 'unknown';
    }

    // 문서 타입별 아이콘 매핑
    function getIconFromDocumentType(documentType) {
        const iconMap = {
            '프로젝트 주간업무보고': 'fa-calendar-week',
            'WEEKLY_REPORT': 'fa-calendar-week',
            '연구비증빙-회의록': 'fa-utensils',
            'RECEIPT_MEETING': 'fa-utensils',
            '연구비증빙-출장': 'fa-plane',
            'BUSINESS_TRIP': 'fa-plane',
            '연구비증빙-출장+회의': 'fa-suitcase',
            'MEETING_MINUTES': 'fa-utensils',
            '연구비증빙(야근식대)': 'fa-moon',
            'RECEIPT_OVERTIME': 'fa-moon'
        };
        return iconMap[documentType] || 'fa-file-alt';
    }

    // 기간별 날짜 범위 계산
    function getDateRangeForPeriod(period) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let start, end;

        switch (period) {
            case 'today':
                start = new Date(today);
                end = new Date(today);
                break;
            case 'week':
                start = new Date(today);
                start.setDate(start.getDate() - 7);
                end = new Date(today);
                break;
            case 'month':
                start = new Date(today);
                start.setMonth(start.getMonth() - 1);
                end = new Date(today);
                break;
            case '3months':
                start = new Date(today);
                start.setMonth(start.getMonth() - 3);
                end = new Date(today);
                break;
            case '6months':
                start = new Date(today);
                start.setMonth(start.getMonth() - 6);
                end = new Date(today);
                break;
            case 'year':
                start = new Date(today);
                start.setFullYear(start.getFullYear() - 1);
                end = new Date(today);
                break;
            case 'custom':
                if (customStartDate && customEndDate) {
                    start = new Date(customStartDate);
                    end = new Date(customEndDate);
                    // 종료일은 23:59:59까지 포함
                    end.setHours(23, 59, 59, 999);
                } else {
                    return null;
                }
                break;
            case 'all':
            default:
                return null;
        }

        return { start, end };
    }

    // 문서 로드
    async function loadAllDocuments() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const projectId = urlParams.get('projectId');

            let apiUrl;
            if (projectId) {
                // projectId가 있으면 해당 프로젝트 문서만 조회
                apiUrl = `/api/approval/documents/project/${projectId}`;
                console.log('프로젝트별 문서 API 호출:', apiUrl);
            } else {
                // 프로젝트 문서 전체 조회 (is_project = true)
                apiUrl = '/api/approval/documents/projects';
                console.log('프로젝트 문서 전체 API 호출:', apiUrl);
            }

            const response = await fetch(apiUrl);
            console.log('API 응답 상태:', response.status, response.statusText);

            if (response.ok) {
                const documents = await response.json();
                console.log('문서 로드 성공:', documents.length + '건');

                // 서버에서 is_project = true로 필터링하므로 클라이언트 측 추가 필터링 불필요
                allDocuments = documents;
                console.log('프로젝트 문서 설정 완료:', allDocuments.length + '건');

                renderDocumentTable();

                // 초기 필터링 적용
                filterDocuments();

                // 정렬 아이콘 초기화
                updateSortIcons();
            } else {
                console.error('문서 로드 실패:', response.status, response.statusText);
                showError('문서 목록을 불러올 수 없습니다.');
            }
        } catch (error) {
            console.error('문서 로드 중 오류:', error);
            showError('문서 목록을 불러오는 중 오류가 발생했습니다.');
        }
    }

    // 문서 테이블 렌더링
    function renderDocumentTable() {
        const tbody = documentList.querySelector('tbody');
        tbody.innerHTML = '';

        if (allDocuments.length === 0) {
            emptyState.style.display = 'flex';
            documentList.querySelector('.document-table').style.display = 'none';
            return;
        }

        allDocuments.forEach(doc => {
            const row = createDocumentRow(doc);
            tbody.appendChild(row);
        });

        // 초기 필터링 적용
        // filterDocuments(); // 무한 루프 방지를 위해 주석 처리
    }

    // 하이라이트 적용된 문서 테이블 렌더링
    function renderDocumentTableWithHighlight(keyword) {
        const tbody = documentList.querySelector('tbody');
        tbody.innerHTML = '';

        if (allDocuments.length === 0) {
            emptyState.style.display = 'flex';
            documentList.querySelector('.document-table').style.display = 'none';
            return;
        }

        allDocuments.forEach(doc => {
            const row = createDocumentRow(doc, keyword);
            tbody.appendChild(row);
        });
    }

    // 문서 행 생성
    function createDocumentRow(doc, keyword = '') {
        const tr = document.createElement('tr');
        tr.className = 'doc-row';
        tr.setAttribute('data-category', getCategoryFromDocumentType(doc.documentType));
        tr.setAttribute('data-created-at', doc.createdAt);
        tr.setAttribute('data-event-date', doc.eventDate || doc.createdAt);
        tr.setAttribute('data-document-idx', doc.idx);
        // 문서종류
        const typeCell = document.createElement('td');
        typeCell.className = 'doc-type-cell';
        const icon = getIconFromDocumentType(doc.documentType);
        const displayNameMap = {
            'WEEKLY_REPORT': '프로젝트 주간업무보고',
            'RECEIPT_MEETING': '연구비증빙-회의록',
            'BUSINESS_TRIP': '연구비증빙-출장',
            'MEETING_MINUTES': '연구비증빙-회의록',
            'RECEIPT_OVERTIME': '연구비증빙(야근식대)'
        };
        const documentType = displayNameMap[doc.documentType] || doc.documentType || '-';
        const highlightedDocType = keyword ? searchUtils.highlightText(documentType, keyword) : documentType;
        typeCell.innerHTML = `
            <span class="doc-type">
                <i class="fas ${icon}"></i>
                ${highlightedDocType}
            </span>
        `;
        tr.appendChild(typeCell);

        // 제목
        const titleCell = document.createElement('td');
        titleCell.className = 'doc-title-cell';
        titleCell.style.cursor = 'pointer';
        const title = doc.title || '제목 없음';
        const content = doc.content ? doc.content.substring(0, 50) : '';
        const highlightedTitle = keyword ? searchUtils.highlightText(title, keyword) : title;
        const highlightedContent = keyword ? searchUtils.highlightText(content, keyword) : content;
        titleCell.innerHTML = `
            <div class="title-wrap">${highlightedTitle}</div>
            <div class="desc-wrap">${highlightedContent}</div>
        `;
        titleCell.addEventListener('click', () => viewDocument(doc));
        tr.appendChild(titleCell);

        // 작성자
        const drafterCell = document.createElement('td');
        const drafterName = doc.drafterName || '-';
        const highlightedDrafter = keyword ? searchUtils.highlightText(drafterName, keyword) : drafterName;
        drafterCell.innerHTML = highlightedDrafter;
        tr.appendChild(drafterCell);

        // 부서
        const deptCell = document.createElement('td');
        const deptName = doc.drafterDeptName || '-';
        const highlightedDept = keyword ? searchUtils.highlightText(deptName, keyword) : deptName;
        deptCell.innerHTML = highlightedDept;
        tr.appendChild(deptCell);

        // 작성일시
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDateTime(doc.createdAt);
        tr.appendChild(dateCell);

        // 관리
        const actionCell = document.createElement('td');
        actionCell.style.textAlign = 'center';
        actionCell.style.verticalAlign = 'middle';
        actionCell.innerHTML = `
            <button class="btn-icon view-btn" title="상세보기" style="margin: 0 auto; display: inline-block;">
                <i class="fas fa-eye"></i>
            </button>
        `;
        tr.appendChild(actionCell);

        // 상세보기 버튼 이벤트
        const viewBtn = actionCell.querySelector('.view-btn');
        viewBtn.addEventListener('click', () => viewDocument(doc));

        return tr;
    }

    // 문서 상세보기
    function viewDocument(doc) {
        // 문서 타입에 따라 다른 상세 페이지로 이동
        const urls = {
            '프로젝트 주간업무보고': '/approval/project-weekly-report/detail',
            'WEEKLY_REPORT': '/approval/project-weekly-report/detail',
            '연구비증빙-회의록': '/approval/receipt-meeting',
            'RECEIPT_MEETING': '/approval/receipt-meeting',
            '연구비증빙-출장': '/approval/receipt-trip',
            'BUSINESS_TRIP': '/approval/receipt-trip',
            '연구비증빙-출장+회의': '/approval/receipt-trip-meeting',
            'MEETING_MINUTES': '/approval/receipt-meeting',
            'RECEIPT_OVERTIME': '/approval/receipt-overtime',
            '연구비증빙(야근식대)': '/approval/receipt-overtime'
        };

        const url = urls[doc.documentType];
        if (url) {
            const documentId = doc.idx;
            window.location.href = `${url}?documentIdx=${documentId}`;
        } else {
            showWarning('해당 문서 타입의 상세 페이지가 구현되지 않았습니다.');
        }
    }

    // 날짜 포맷팅
    function formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return '-';

        const date = new Date(dateTimeStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    // 에러 표시
    function showError(message) {
        const tbody = documentList.querySelector('tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #999;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 32px; margin-bottom: 10px;"></i>
                    <p>${message}</p>
                </td>
            </tr>
        `;
    }

    // URL 파라미터에서 탭 선택
    function selectTabFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab');

        if (tab) {
            if (tab === 'expense') {
                // 연구비증빙: 모든 증빙 카테고리 표시
                currentCategory = 'all-expense';
                contentTitle.textContent = '연구비증빙';
                currentPage = 1;
                filterDocuments();
                return;
            }

            // tab 파라미터를 category로 매핑
            const tabToCategoryMap = {
                'weekly': 'project-weekly-report',
                'receipt-meeting': 'receipt-meeting',
                'receipt-trip': 'receipt-trip',
                'receipt-trip-meeting': 'receipt-trip-meeting',
                'receipt-overtime': 'receipt-overtime'
            };

            const category = tabToCategoryMap[tab] || tab;

            // 해당 카테고리 메뉴 아이템 찾아서 클릭
            const menuItem = document.querySelector(`.sidebar-menu .menu-item[data-category="${category}"]`);
            if (menuItem) {
                menuItem.click();
            }
        }
    }

    // 초기 로드
    loadAllDocuments().then(() => {
        // 문서 로드 후 URL 파라미터에 따라 탭 선택
        setTimeout(() => selectTabFromUrl(), 100);
    });
});
