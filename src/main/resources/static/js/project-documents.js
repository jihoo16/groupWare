// 프로젝트 문서함 메인 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 검색 유틸리티 초기화
    const searchUtils = new SearchUtils();

    // DOM 요소
    const sidebarMenuItems = document.querySelectorAll('.approval-sidebar .sidebar-menu .menu-item');
    const documentList = document.getElementById('documentList');
    const emptyState = document.getElementById('emptyState');
    const contentTitle = document.querySelector('.content-title');
    const documentCountBadge = document.getElementById('documentCountBadge');
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
    let selectedProjectIdx = null; // 선택된 프로젝트 IDX
    let customStartDate = null;
    let customEndDate = null;
    let allDocuments = []; // 전체 문서 데이터 (원본)
    let allProjects = []; // 전체 프로젝트 목록
    let currentSortColumn = 'date';
    let currentSortOrder = 'desc'; // 'asc' or 'desc'

    // 페이징 관련 변수
    let currentPage = 1;
    const itemsPerPage = 10;
    let filteredRows = []; // 필터링된 행들

    // 프로젝트 관련 문서 타입 정의
    const PROJECT_DOCUMENT_TYPES = [
        '프로젝트 주간업무보고',
        '연구비증빙-회의록',
        '연구비증빙-단독출장',
        '연구비증빙-출장+회의',
        '연구비증빙-야근식대',
        '재료비',
        '장비비'
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

            // 문서함 선택
            const category = this.getAttribute('data-category');

            // 활성화 상태 변경
            sidebarMenuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

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
            'receipt-trip': '단독 출장 증빙',
            'receipt-trip-meeting': '출장+회의 증빙',
            'receipt-overtime': '야근식대 증빙',
            'receipt-purchase-material': '재료비 증빙',
            'receipt-purchase-equipment': '장비비 증빙'
        };

        const titleText = titles[category] || '문서 목록';

        // 뱃지를 유지하면서 제목만 변경
        if (contentTitle.firstChild && contentTitle.firstChild.nodeType === Node.TEXT_NODE) {
            // 첫 번째 텍스트 노드만 변경
            contentTitle.firstChild.nodeValue = titleText + ' ';
        } else {
            // 텍스트 노드가 없으면 생성해서 맨 앞에 추가
            const textNode = document.createTextNode(titleText + ' ');
            contentTitle.insertBefore(textNode, contentTitle.firstChild);
        }
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
            const projectIdx = row.getAttribute('data-project-idx');

            let show = true;

            // 문서함 필터
            if (currentCategory && currentCategory !== 'all') {
                if (currentCategory === 'all-expense') {
                    show = category !== 'project-weekly-report';
                } else {
                    show = category === currentCategory;
                }
            }

            // 프로젝트 필터 (선택된 프로젝트가 있을 경우)
            if (selectedProjectIdx !== null) {
                show = show && projectIdx === String(selectedProjectIdx);
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
                const projectName = row.querySelector('td:nth-child(2)').textContent;
                const drafterName = row.querySelector('td:nth-child(4)').textContent;
                const deptName = row.querySelector('td:nth-child(5)').textContent;

                show = show && (
                    searchUtils.matchesSearch(title, searchKeyword) ||
                    searchUtils.matchesSearch(projectName, searchKeyword) ||
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

    // 문서 총 건수 업데이트
    function updateDocumentCount() {
        if (documentCountBadge) {
            documentCountBadge.textContent = filteredRows.length;
        }
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

        // 문서 총 건수 업데이트
        updateDocumentCount();

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

        // 문서 타입 표시 이름 매핑 (실제 저장값이 한글이므로 별도 변환 불필요)
        const displayNameMap = {};

        // allDocuments 배열을 정렬
        allDocuments.sort((a, b) => {
            let valueA, valueB;

            switch (column) {
                case 'type':
                    valueA = a.documentTypeName || a.documentType || '';
                    valueB = b.documentTypeName || b.documentType || '';
                    break;
                case 'project':
                    valueA = a.projectName || '';
                    valueB = b.projectName || '';
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
            'C0410': 'project-weekly-report',
            'C0406': 'receipt-meeting',
            'C0404': 'receipt-trip',
            'C0405': 'receipt-trip-meeting',
            'C0403': 'receipt-overtime',
            'C0407': 'receipt-purchase-material',
            'C0408': 'receipt-purchase-equipment'
        };
        return categoryMap[documentType] || 'unknown';
    }

    // 문서 타입별 아이콘 매핑
    function getIconFromDocumentType(documentType) {
        const iconMap = {
            'C0410': 'fa-calendar-week',
            'C0406': 'fa-utensils',
            'C0404': 'fa-plane',
            'C0405': 'fa-suitcase',
            'C0403': 'fa-moon',
            'C0407': 'fa-box',
            'C0408': 'fa-tools'
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

    // 문서 타입별 표시 제목 생성 (타입 태그 + 내용)
    function buildDisplayTitle(doc) {
        const fmtDate = (dateStr) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (isNaN(d)) return dateStr;
            return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
        };
        const type = doc.documentType;
        const location = doc.location || '';
        const purpose = doc.purpose || '';
        const date = fmtDate(doc.eventDate);

let text;
        if (type === 'C0406') {
            text = [purpose, date].filter(Boolean).join(' - ');
        } else if (type === 'C0404') {
            text = [location, date].filter(Boolean).join(' - ');
        } else if (type === 'C0405') {
            text = [location, date, purpose].filter(Boolean).join(' - ');
        } else if (type === 'C0407' || type === 'C0408') {
            text = [purpose, date].filter(Boolean).join(' - ');
        } else if (type === 'C0403') {
            text = date || doc.title || '-';
        } else {
            text = doc.title || '-';
        }

        return `<span class="title-text" data-tip="${text}">${text}</span>`;
    }

    // 연구비증빙 첨부파일 누락 시 행 배경 클래스 반환
    function getRowMissingClass(doc) {
        const receiptTypes = ['C0403', 'C0404', 'C0405', 'C0406', 'C0407', 'C0408'];
        if (!receiptTypes.includes(doc.documentType)) return '';

        const atts = doc.attachments || [];
        const isTripMeeting = doc.documentType === 'C0405';
        const isPurchase = doc.documentType === 'C0407' || doc.documentType === 'C0408';
        const isEquipment = doc.documentType === 'C0408';

        let checks;
        if (isTripMeeting) {
            checks = [
                atts.some(a => a.attachmentType === 'MEETING_RECEIPT'),
                atts.some(a => a.attachmentType === 'MEETING_DOCUMENT'),
                atts.some(a => a.attachmentType === 'TRIP_RECEIPT'),
                atts.some(a => a.attachmentType === 'TRIP_DOCUMENT'),
            ];
        } else if (isPurchase) {
            checks = [
                atts.some(a => a.attachmentType === 'RECEIPT'),
                atts.some(a => a.attachmentType === 'DOCUMENT'),
            ];
            if (isEquipment) checks.push(atts.some(a => a.attachmentType === 'ESTIMATE'));
            if (doc.paymentType === 'transfer') checks.push(atts.some(a => a.attachmentType === 'BANK_COPY'));
        } else {
            checks = [
                atts.some(a => a.attachmentType !== 'DOCUMENT'),
                atts.some(a => a.attachmentType === 'DOCUMENT'),
            ];
        }

        const filled = checks.filter(Boolean).length;
        return filled < checks.length ? ' row-missing-attachment' : '';
    }

    // 문서 행 생성
    function createDocumentRow(doc, keyword = '') {
        const tr = document.createElement('tr');
        tr.className = 'doc-row' + getRowMissingClass(doc);
        tr.setAttribute('data-category', getCategoryFromDocumentType(doc.documentType));
        tr.setAttribute('data-created-at', doc.createdAt);
        tr.setAttribute('data-event-date', doc.eventDate || doc.createdAt);
        tr.setAttribute('data-document-idx', doc.idx);
        tr.setAttribute('data-project-idx', doc.projectIdx || '');
        // 문서종류
        const typeCell = document.createElement('td');
        typeCell.className = 'doc-type-cell';
        const icon = getIconFromDocumentType(doc.documentType);
        const documentType = doc.documentTypeName || doc.documentType || '-';
        const highlightedDocType = keyword ? searchUtils.highlightText(documentType, keyword) : documentType;
        typeCell.innerHTML = `
            <span class="doc-type">
                <i class="fas ${icon}"></i>
                ${highlightedDocType}
            </span>
        `;
        tr.appendChild(typeCell);

        // 프로젝트
        const projectCell = document.createElement('td');
        const projectName = doc.projectName || '-';
        const maxLength = 12;

        // 12글자 초과 시 말줄임표 처리 및 툴팁 추가
        if (projectName !== '-' && projectName.length > maxLength) {
            const displayName = projectName.substring(0, maxLength) + '...';
            const highlightedProject = keyword ? searchUtils.highlightText(displayName, keyword) : displayName;

            projectCell.innerHTML = `
                <span class="project-name-wrapper" data-tip="${projectName}">
                    ${highlightedProject}
                </span>
            `;
        } else {
            const highlightedProject = keyword ? searchUtils.highlightText(projectName, keyword) : projectName;
            projectCell.innerHTML = highlightedProject;
        }

        tr.appendChild(projectCell);

        // 제목
        const titleCell = document.createElement('td');
        titleCell.className = 'doc-title-cell';
        titleCell.style.cursor = 'pointer';
        const displayTitle = buildDisplayTitle(doc);
        const highlightedTitle = keyword ? searchUtils.highlightText(displayTitle, keyword) : displayTitle;
        const amountBadge = doc.amount != null
            ? `<span class="doc-amount-badge">${Number(doc.amount).toLocaleString()}원</span>`
            : '';
        const participantLine = doc.participantNames
            ? `<div class="desc-wrap">참석인원: ${doc.participantNames}</div>`
            : '';
        titleCell.innerHTML = `
            <div class="title-wrap">${highlightedTitle}${amountBadge}</div>
            ${participantLine}
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
        const isReceiptType = ['C0403', 'C0404', 'C0405', 'C0406', 'C0407', 'C0408'].includes(doc.documentType);
        const isWeeklyReport = doc.documentType === 'C0410';

        // 첨부파일 누락 체크: 필수 항목별 존재 여부 → 전체 누락(빨강) / 일부 누락(주황)
        let missingCls = '';
        let missingTitle = '첨부파일 관리';
        if (isReceiptType) {
            const atts = doc.attachments || [];
            const isPurchase = doc.documentType === 'C0407' || doc.documentType === 'C0408';
            const isEquipment = doc.documentType === 'C0408';
            const isTripMeeting = doc.documentType === 'C0405';

            let checks = []; // true=있음, false=없음
            if (isTripMeeting) {
                checks = [
                    atts.some(a => a.attachmentType === 'MEETING_RECEIPT'),
                    atts.some(a => a.attachmentType === 'MEETING_DOCUMENT'),
                    atts.some(a => a.attachmentType === 'TRIP_RECEIPT'),
                    atts.some(a => a.attachmentType === 'TRIP_DOCUMENT'),
                ];
            } else if (isPurchase) {
                checks = [
                    atts.some(a => a.attachmentType === 'RECEIPT'),
                    atts.some(a => a.attachmentType === 'DOCUMENT'),
                ];
                if (isEquipment) checks.push(atts.some(a => a.attachmentType === 'ESTIMATE'));
            } else {
                checks = [
                    atts.some(a => a.attachmentType !== 'DOCUMENT'),
                    atts.some(a => a.attachmentType === 'DOCUMENT'),
                ];
            }

            const filled = checks.filter(Boolean).length;
            const total  = checks.length;
            if (filled === 0) {
                missingCls = ' missing-all';
                missingTitle = '첨부파일 전체 누락';
            } else if (filled < total) {
                missingCls = ' missing-partial';
                missingTitle = '첨부파일 일부 누락';
            }
        }

        actionCell.innerHTML = `
            ${isReceiptType ? `<button class="btn-icon attachment-modal-btn${missingCls}" data-tip="${missingTitle}" style="margin: 0 2px; display: inline-block;">
                <i class="fas fa-paperclip"></i>
            </button>` : ''}
            ${isWeeklyReport ? `<button class="btn-icon weekly-pdf-btn" data-tip="PDF 다운로드" style="margin: 0 2px; display: inline-block;">
                <i class="fas fa-paperclip"></i>
            </button>` : ''}
            <button class="btn-icon view-btn" data-tip="상세보기" style="margin: 0 2px; display: inline-block;">
                <i class="fas fa-eye"></i>
            </button>
        `;
        tr.appendChild(actionCell);

        // 상세보기 버튼 이벤트
        const viewBtn = actionCell.querySelector('.view-btn');
        viewBtn.addEventListener('click', () => viewDocument(doc));

        // 첨부파일 모달 버튼 이벤트
        if (isReceiptType) {
            actionCell.querySelector('.attachment-modal-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openAttachmentModal(doc);
            });
        }

        // 주간업무보고 PDF 모달 이벤트
        if (isWeeklyReport) {
            actionCell.querySelector('.weekly-pdf-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openWeeklyPdfModal(doc);
            });
        }

        return tr;
    }

    // 문서 상세보기
    function viewDocument(doc) {
        // 문서 타입에 따라 다른 상세 페이지로 이동
        const urls = {
            'C0410': '/approval/project-weekly-report/detail',  // 프로젝트 주간업무보고
            'C0406': '/approval/receipt-meeting',               // 연구비증빙-회의록
            'C0404': '/approval/receipt-trip',                  // 단독출장
            'C0405': '/approval/receipt-trip-meeting',          // 출장+회의
            'C0403': '/approval/receipt-overtime',              // 야근식대
            'C0407': '/approval/receipt-purchase?type=material',// 재료비
            'C0408': '/approval/receipt-purchase?type=equipment'// 장비비
        };

        const url = urls[doc.documentType];
        if (url) {
            // 출장+회의는 receiptTripMeeting.idx(sourceDocumentId)를 ?id= 파라미터로 전달
            const isTripMeetingType = doc.documentType === 'C0405';
            // 재료비/장비비는 receipt_purchase.idx(sourceDocumentId)를 documentIdx로 전달
            const isPurchaseType = doc.documentType === 'C0407' || doc.documentType === 'C0408';
            if (isTripMeetingType) {
                window.location.href = `${url}?id=${doc.sourceDocumentId}`;
            } else if (isPurchaseType) {
                window.location.href = `${url}&documentIdx=${doc.sourceDocumentId}`;
            } else {
                window.location.href = `${url}?documentIdx=${doc.idx}`;
            }
        } else {
            showWarning('해당 문서 타입의 상세 페이지가 구현되지 않았습니다.');
        }
    }

    // ================================================
    // 첨부파일 모달
    // ================================================
    let attachmentModalEl = null;
    let pendingReceiptFiles = [];          // 저장 전 추가할 영수증 파일 (RCM/RCT/RCO/Purchase)
    let pendingDocumentFiles = [];         // 저장 전 추가할 공식문서 파일 (RCM/RCT/RCO/Purchase)
    let pendingEstimateFiles = [];         // 저장 전 추가할 견적서 파일 (장비비 전용)
    let pendingBankCopyFiles = [];         // 저장 전 추가할 통장사본 파일 (연구비이체 전용)
    let pendingMeetingReceiptFilesBySession  = []; // RCTM 전용: [[s0 파일들], [s1 파일들], ...]
    let pendingMeetingDocumentFilesBySession = []; // RCTM 전용: [[s0 파일들], [s1 파일들], ...]
    let pendingTripReceiptFiles  = [];             // RCTM 출장 전용
    let pendingTripDocumentFiles = [];             // RCTM 출장 전용
    let pendingDeleteIds = [];             // 저장 전 삭제할 첨부파일 ID 목록

    function getAttachmentModal() {
        if (attachmentModalEl) return attachmentModalEl;

        // 모달 스타일 주입
        const style = document.createElement('style');
        style.textContent = `
            #attachmentModal { font-family: inherit; }
            .att-modal-inner {
                background: #fff;
                border-radius: 14px;
                width: 580px;
                max-height: 82vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 24px 64px rgba(0,0,0,0.28);
                animation: attModalIn .18s ease;
            }
            @keyframes attModalIn {
                from { opacity:0; transform:translateY(-10px) scale(.98); }
                to   { opacity:1; transform:translateY(0) scale(1); }
            }
            .att-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 18px 22px 16px;
                border-bottom: 1px solid #f0f0f0;
            }
            .att-modal-header h3 {
                margin: 0;
                font-size: 15px;
                font-weight: 700;
                color: #1a1a1a;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .att-modal-header h3 i { color: #7c3aed; font-size: 14px; }
            .att-close-btn {
                background: none;
                border: none;
                cursor: pointer;
                color: #9ca3af;
                font-size: 20px;
                line-height: 1;
                padding: 4px;
                border-radius: 6px;
                transition: background .15s, color .15s;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 30px;
                height: 30px;
            }
            .att-close-btn:hover { background: #f3f4f6; color: #374151; }
            #modalBody { flex: 1; overflow-y: auto; padding: 20px 22px; }
            .att-section { margin-bottom: 24px; }
            .att-section:last-child { margin-bottom: 0; }
            .att-section-badge {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 700;
                margin-bottom: 11px;
                letter-spacing: .01em;
            }
            .att-badge-receipt { background: #fef9c3; color: #a16207; }
            .att-badge-document { background: #eff6ff; color: #1d4ed8; }
            .att-badge-estimate { background: #f0fdf4; color: #15803d; }
            .att-badge-bank { background: #faf5ff; color: #7c3aed; }
            .att-existing-list { margin-bottom: 10px; }
            .att-file-row {
                display: flex;
                align-items: center;
                gap: 9px;
                padding: 7px 11px;
                background: #f8fafc;
                border: 1px solid #e8ecf0;
                border-radius: 8px;
                margin-bottom: 5px;
                transition: background .12s;
                cursor: pointer;
            }
            .att-file-row:hover { background: #e8f0fe; border-color: #93c5fd; }
            .att-file-row .att-file-icon { color: #94a3b8; font-size: 13px; flex-shrink: 0; }
            .att-file-row .att-file-name {
                flex: 1;
                font-size: 13px;
                color: #334155;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-weight: 500;
            }
            .att-dl-btn {
                flex-shrink: 0;
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 4px 10px;
                cursor: pointer;
                color: #64748b;
                font-size: 12px;
                transition: background .12s, border-color .12s, color .12s;
            }
            .att-dl-btn:hover { background: #f5f3ff; border-color: #c4b5fd; color: #7c3aed; }
            .att-del-btn {
                flex-shrink: 0;
                background: none;
                border: none;
                padding: 3px 6px;
                cursor: pointer;
                color: #cbd5e1;
                font-size: 15px;
                line-height: 1;
                border-radius: 4px;
                transition: color .12s, background .12s;
            }
            .att-del-btn:hover { color: #ef4444; background: #fff1f2; }
            .att-file-row.deleted { opacity: 0.4; text-decoration: line-through; pointer-events: none; }
            .att-empty-msg { margin: 0 0 10px; color: #b0b8c4; font-size: 13px; }
            .att-drop-zone {
                border: 2px dashed #d1d5db;
                border-radius: 10px;
                padding: 18px 16px;
                text-align: center;
                cursor: pointer;
                transition: border-color .15s, background .15s;
                background: #fafafa;
                position: relative;
            }
            .att-drop-zone:hover, .att-drop-zone.drag-over {
                border-color: #7c3aed;
                background: #f5f3ff;
            }
            .att-drop-zone.drag-over .att-drop-icon { color: #7c3aed; }
            .att-drop-zone input[type=file] {
                position: absolute;
                inset: 0;
                opacity: 0;
                cursor: pointer;
                width: 100%;
                height: 100%;
            }
            .att-drop-icon { font-size: 22px; color: #94a3b8; margin-bottom: 6px; transition: color .15s; }
            .att-drop-text { font-size: 13px; color: #6b7280; line-height: 1.5; }
            .att-drop-text strong { color: #374151; }
            .att-pending-list { margin-top: 10px; }
            .att-pending-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 10px;
                background: #f0fdf4;
                border: 1px solid #bbf7d0;
                border-radius: 7px;
                margin-bottom: 4px;
            }
            .att-pending-item i { color: #16a34a; font-size: 12px; flex-shrink: 0; }
            .att-pending-item span { flex: 1; font-size: 13px; color: #166534; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .att-pending-remove {
                background: none;
                border: none;
                cursor: pointer;
                color: #86efac;
                font-size: 14px;
                line-height: 1;
                padding: 0;
                flex-shrink: 0;
                transition: color .12s;
            }
            .att-pending-remove:hover { color: #dc2626; }
            .att-modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                padding: 14px 22px;
                border-top: 1px solid #f0f0f0;
            }
            .att-btn-cancel {
                padding: 8px 20px;
                background: #f3f4f6;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                color: #374151;
                font-weight: 500;
                transition: background .12s;
            }
            .att-btn-cancel:hover { background: #e9ecef; }
            .att-btn-save {
                padding: 8px 22px;
                background: #7c3aed;
                color: #fff;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: background .12s;
            }
            .att-btn-save:hover { background: #6d28d9; }
            .att-btn-save:disabled { background: #c4b5fd; cursor: not-allowed; }
        `;
        document.head.appendChild(style);

        const modal = document.createElement('div');
        modal.id = 'attachmentModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(2px);';
        modal.innerHTML = `
            <div class="att-modal-inner">
                <div class="att-modal-header">
                    <h3><i class="fas fa-paperclip"></i> 첨부파일 관리</h3>
                    <button class="att-close-btn" id="modalCloseBtn"><i class="fas fa-times"></i></button>
                </div>
                <div id="modalBody"></div>
                <div class="att-modal-footer">
                    <button class="att-btn-cancel" id="modalCancelBtn">닫기</button>
                    <button class="att-btn-save" id="modalSaveBtn">저장</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('modalCloseBtn').addEventListener('click', closeAttachmentModal);
        document.getElementById('modalCancelBtn').addEventListener('click', closeAttachmentModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeAttachmentModal(); });
        attachmentModalEl = modal;
        return modal;
    }

    function closeAttachmentModal() {
        if (attachmentModalEl) attachmentModalEl.style.display = 'none';
        pendingReceiptFiles = [];
        pendingDocumentFiles = [];
        pendingBankCopyFiles = [];
        pendingMeetingReceiptFilesBySession  = [];
        pendingMeetingDocumentFilesBySession = [];
        pendingTripReceiptFiles  = [];
        pendingTripDocumentFiles = [];
        pendingDeleteIds = [];
    }

    function openAttachmentModal(doc) {
        pendingReceiptFiles = [];
        pendingDocumentFiles = [];
        pendingEstimateFiles = [];
        pendingBankCopyFiles = [];
        // 세션 수만큼 빈 배열 준비 (renderModalContent에서 setupDropZone이 참조)
        const sessionCount = (doc.meetingSessionCount || 1);
        pendingMeetingReceiptFilesBySession  = Array.from({ length: sessionCount }, () => []);
        pendingMeetingDocumentFilesBySession = Array.from({ length: sessionCount }, () => []);
        pendingTripReceiptFiles  = [];
        pendingTripDocumentFiles = [];
        pendingDeleteIds = [];
        const modal = getAttachmentModal();

        // 모달 헤더에 문서 타입명 표시
        const typeNames = { 'C0403': '야근식대', 'C0404': '단독출장', 'C0405': '출장+회의', 'C0406': '회의록', 'C0407': '재료비', 'C0408': '장비비' };
        const typeName = typeNames[doc.documentType] || '';
        const headerH3 = modal.querySelector('.att-modal-header h3');
        if (headerH3) headerH3.innerHTML = `<i class="fas fa-paperclip"></i> 첨부파일 관리 — ${typeName}`;

        renderModalContent(doc);
        modal.style.display = 'flex';
        // 저장 버튼 이벤트 (중복 방지: 교체)
        const saveBtn = document.getElementById('modalSaveBtn');
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', () => saveModalAttachments(doc));
    }

    function renderModalContent(doc) {
        const isTripMeeting = doc.documentType === 'C0405';
        const isPurchase = doc.documentType === 'C0407' || doc.documentType === 'C0408';
        const isEquipment = doc.documentType === 'C0408';

        function buildExistingRow(a) {
            const safe = a.originalFilename.replace(/"/g, '&quot;');
            return `
                <div class="att-file-row modal-download-row" data-url="${a.downloadUrl}" data-filename="${safe}" data-att-id="${a.idx}" data-tip="클릭하여 다운로드">
                    <i class="fas fa-file att-file-icon"></i>
                    <span class="att-file-name">${safe}</span>
                    <i class="fas fa-download" style="color:#93c5fd; font-size:12px; margin-left:auto; flex-shrink:0;"></i>
                    <button class="att-del-btn" data-att-id="${a.idx}" data-tip="삭제">&times;</button>
                </div>`;
        }

        function buildSection(sectionId, badgeClass, iconClass, label, existingFiles, dzId, inputId, pendingListId) {
            const existingHtml = existingFiles.length === 0
                ? `<p class="att-empty-msg">업로드된 파일이 없습니다.</p>`
                : existingFiles.map(buildExistingRow).join('');
            return `
                <div class="att-section" id="${sectionId}">
                    <div class="att-section-badge ${badgeClass}">
                        <i class="${iconClass}"></i> ${label}
                    </div>
                    <div class="att-existing-list">${existingHtml}</div>
                    <div class="att-drop-zone" id="${dzId}">
                        <input type="file" id="${inputId}" multiple>
                        <div class="att-drop-icon"><i class="fas fa-cloud-upload-alt"></i></div>
                        <div class="att-drop-text">
                            <strong>드래그하여 파일 추가</strong><br>또는 클릭하여 선택
                        </div>
                    </div>
                    <div class="att-pending-list" id="${pendingListId}"></div>
                </div>`;
        }

        if (isTripMeeting) {
            const sessionCount   = doc.meetingSessionCount || 1;
            const sessionIds     = doc.meetingSessionIds   || [];
            const allAttachments = doc.attachments         || [];

            const existingTripReceipt  = allAttachments.filter(a => a.attachmentType === 'TRIP_RECEIPT');
            const existingTripDocument = allAttachments.filter(a => a.attachmentType === 'TRIP_DOCUMENT');

            // 세션별 회의 첨부파일 섹션
            let meetingHtml = '';
            for (let s = 0; s < sessionCount; s++) {
                const sessionLabel = sessionCount > 1 ? ` (${s + 1}번째 회의)` : '';
                const sessionDbPk  = sessionIds[s] ?? null;
                // sessionIdx가 일치하는 파일. s===0 일 때는 null(구버전 데이터)도 포함
                const existingReceipt  = allAttachments.filter(a =>
                    a.attachmentType === 'MEETING_RECEIPT'  &&
                    (a.sessionIdx === sessionDbPk || (s === 0 && a.sessionIdx == null)));
                const existingDocument = allAttachments.filter(a =>
                    a.attachmentType === 'MEETING_DOCUMENT' &&
                    (a.sessionIdx === sessionDbPk || (s === 0 && a.sessionIdx == null)));
                meetingHtml +=
                    `<div style="font-weight:600;color:#667eea;padding:${s === 0 ? '4px' : '12px'} 0 8px;${s > 0 ? 'border-top:1px solid #f0f0f0;margin-top:8px;' : ''}"><i class="fas fa-users"></i> 회의 첨부파일${sessionLabel}</div>` +
                    buildSection(`sectionMeetingReceipt_${s}`,  'att-badge-receipt',  'fas fa-receipt',  '회의 영수증',  existingReceipt,  `dzMeetingReceipt_${s}`,  `inputMeetingReceipt_${s}`,  `pendingMeetingReceipt_${s}`) +
                    buildSection(`sectionMeetingDocument_${s}`, 'att-badge-document', 'fas fa-file-alt', '회의 공식문서', existingDocument, `dzMeetingDocument_${s}`, `inputMeetingDocument_${s}`, `pendingMeetingDocument_${s}`);
            }

            document.getElementById('modalBody').innerHTML =
                meetingHtml +
                `<div style="font-weight:600;color:#e86c2c;padding:12px 0 8px;border-top:1px solid #f0f0f0;margin-top:8px;"><i class="fas fa-plane"></i> 출장 첨부파일</div>` +
                buildSection('sectionTripReceipt',  'att-badge-receipt',  'fas fa-receipt',  '출장 영수증',  existingTripReceipt,  'dzTripReceipt',  'inputTripReceipt',  'pendingTripReceipt') +
                buildSection('sectionTripDocument', 'att-badge-document', 'fas fa-file-alt', '출장 공식문서', existingTripDocument, 'dzTripDocument', 'inputTripDocument', 'pendingTripDocument');

            for (let s = 0; s < sessionCount; s++) {
                setupDropZone(`dzMeetingReceipt_${s}`,  `inputMeetingReceipt_${s}`,  `pendingMeetingReceipt_${s}`,  pendingMeetingReceiptFilesBySession[s]);
                setupDropZone(`dzMeetingDocument_${s}`, `inputMeetingDocument_${s}`, `pendingMeetingDocument_${s}`, pendingMeetingDocumentFilesBySession[s]);
            }
            setupDropZone('dzTripReceipt',  'inputTripReceipt',  'pendingTripReceipt',  pendingTripReceiptFiles);
            setupDropZone('dzTripDocument', 'inputTripDocument', 'pendingTripDocument', pendingTripDocumentFiles);
        } else if (isPurchase) {
            const isTransfer = doc.paymentType === 'transfer';
            const withDownloadUrl = (attachments) => attachments.map(a => ({
                ...a,
                downloadUrl: `/api/receipt-purchases/attachments/${a.idx}/download`
            }));
            const receiptLabel = isEquipment ? '영수증' : '거래명세서 (영수증)';
            const existingReceipt   = withDownloadUrl((doc.attachments || []).filter(a => a.attachmentType === 'RECEIPT'));
            const existingDocument  = withDownloadUrl((doc.attachments || []).filter(a => a.attachmentType === 'DOCUMENT'));
            const existingEstimate  = withDownloadUrl((doc.attachments || []).filter(a => a.attachmentType === 'ESTIMATE'));
            const existingBankCopy  = withDownloadUrl((doc.attachments || []).filter(a => a.attachmentType === 'BANK_COPY'));

            let bodyHtml =
                buildSection('sectionReceipt',  'att-badge-receipt',  'fas fa-receipt',       receiptLabel, existingReceipt,  'dzReceipt',  'inputReceipt',  'pendingReceipt') +
                buildSection('sectionDocument', 'att-badge-document', 'fas fa-file-alt',      '공식문서',    existingDocument, 'dzDocument', 'inputDocument', 'pendingDocument');
            if (isEquipment) {
                bodyHtml += buildSection('sectionEstimate', 'att-badge-estimate', 'fas fa-file-invoice', '견적서', existingEstimate, 'dzEstimate', 'inputEstimate', 'pendingEstimate');
            }
            if (isTransfer) {
                bodyHtml += buildSection('sectionBankCopy', 'att-badge-bank', 'fas fa-university', '거래처 통장사본', existingBankCopy, 'dzBankCopy', 'inputBankCopy', 'pendingBankCopy');
            }

            document.getElementById('modalBody').innerHTML = bodyHtml;

            setupDropZone('dzReceipt',  'inputReceipt',  'pendingReceipt',  pendingReceiptFiles);
            setupDropZone('dzDocument', 'inputDocument', 'pendingDocument', pendingDocumentFiles);
            if (isEquipment) {
                setupDropZone('dzEstimate', 'inputEstimate', 'pendingEstimate', pendingEstimateFiles);
            }
            if (isTransfer) {
                setupDropZone('dzBankCopy', 'inputBankCopy', 'pendingBankCopy', pendingBankCopyFiles);
            }
        } else {
            const existingReceipt  = (doc.attachments || []).filter(a => a.attachmentType !== 'DOCUMENT');
            const existingDocument = (doc.attachments || []).filter(a => a.attachmentType === 'DOCUMENT');

            document.getElementById('modalBody').innerHTML =
                buildSection('sectionReceipt',  'att-badge-receipt',  'fas fa-receipt',  '영수증',  existingReceipt,  'dzReceipt',  'inputReceipt',  'pendingReceipt') +
                buildSection('sectionDocument', 'att-badge-document', 'fas fa-file-alt', '공식문서', existingDocument, 'dzDocument', 'inputDocument', 'pendingDocument');

            setupDropZone('dzReceipt',  'inputReceipt',  'pendingReceipt',  pendingReceiptFiles);
            setupDropZone('dzDocument', 'inputDocument', 'pendingDocument', pendingDocumentFiles);
        }

        // 파일 행 클릭 → 다운로드 (삭제 버튼 클릭은 제외)
        document.getElementById('modalBody').querySelectorAll('.modal-download-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('.att-del-btn')) return;
                downloadSingleFile(row.dataset.url, row.dataset.filename);
            });
        });

        // 삭제 버튼 클릭 → pendingDeleteIds에 추가 후 행 비활성화
        document.getElementById('modalBody').querySelectorAll('.att-del-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.attId);
                if (!pendingDeleteIds.includes(id)) pendingDeleteIds.push(id);
                btn.closest('.att-file-row').classList.add('deleted');
            });
        });
    }

    function setupDropZone(dzId, inputId, pendingListId, fileArray) {
        const dz    = document.getElementById(dzId);
        const input = document.getElementById(inputId);
        let dragCounter = 0;

        function addFiles(newFiles) {
            Array.from(newFiles).forEach(f => {
                if (!fileArray.find(x => x.name === f.name && x.size === f.size)) {
                    fileArray.push(f);
                }
            });
            renderPendingList(pendingListId, fileArray);
        }

        dz.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            dz.classList.add('drag-over');
        });
        dz.addEventListener('dragleave', () => {
            dragCounter--;
            if (dragCounter === 0) dz.classList.remove('drag-over');
        });
        dz.addEventListener('dragover', (e) => { e.preventDefault(); });
        dz.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            dz.classList.remove('drag-over');
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        });
        input.addEventListener('change', () => {
            if (input.files.length) addFiles(input.files);
            input.value = ''; // 동일 파일 재선택 허용
        });
    }

    function renderPendingList(pendingListId, fileArray) {
        const container = document.getElementById(pendingListId);
        if (!container) return;
        if (fileArray.length === 0) { container.innerHTML = ''; return; }
        container.innerHTML = fileArray.map((f, i) => `
            <div class="att-pending-item">
                <i class="fas fa-check-circle"></i>
                <span data-tip="${f.name}">${f.name}</span>
                <button class="att-pending-remove" data-index="${i}" data-tip="제거">&times;</button>
            </div>`).join('');
        container.querySelectorAll('.att-pending-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                fileArray.splice(parseInt(btn.dataset.index), 1);
                renderPendingList(pendingListId, fileArray);
            });
        });
    }

    async function saveModalAttachments(doc) {
        const swalAboveModal = {
            didOpen: () => {
                const container = document.querySelector('.swal2-container');
                if (container) container.style.zIndex = '20001';
            }
        };

        const isTripMeeting = doc.documentType === 'C0405';
        const isPurchase = doc.documentType === 'C0407' || doc.documentType === 'C0408';
        const isEquipment = doc.documentType === 'C0408';
        const hasNewFiles = isTripMeeting
            ? (pendingMeetingReceiptFilesBySession.some(arr => arr.length > 0) ||
               pendingMeetingDocumentFilesBySession.some(arr => arr.length > 0) ||
               pendingTripReceiptFiles.length || pendingTripDocumentFiles.length)
            : isPurchase
                ? (pendingReceiptFiles.length || pendingDocumentFiles.length || pendingEstimateFiles.length || pendingBankCopyFiles.length)
                : (pendingReceiptFiles.length || pendingDocumentFiles.length);

        if (!pendingDeleteIds.length && !hasNewFiles) {
            closeAttachmentModal();
            return;
        }

        const isMeeting = doc.documentType === 'C0406';
        const isTrip = doc.documentType === 'C0404';
        const deleteBaseUrl = isPurchase
            ? `/api/receipt-purchases/attachments`
            : isTripMeeting
                ? `/api/receipt-trip-meetings/attachments`
                : isMeeting
                    ? `/api/receipt-meetings/attachments`
                    : isTrip
                        ? `/api/receipt-trips/attachments`
                        : `/api/receipt-overtimes/attachments`;
        const uploadUrl = isPurchase
            ? `/api/receipt-purchases/${doc.sourceDocumentId}/attachments`
            : isTripMeeting
                ? `/api/receipt-trip-meetings/${doc.sourceDocumentId}/attachments`
                : isMeeting
                    ? `/api/receipt-meetings/${doc.sourceDocumentId}/attachments`
                    : isTrip
                        ? `/api/receipt-trips/${doc.sourceDocumentId}/attachments`
                        : `/api/receipt-overtimes/${doc.sourceDocumentId}/attachments`;
        const saveBtn = document.getElementById('modalSaveBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = '저장 중...';

        try {
            // 1. 삭제 요청된 첨부파일 순차 삭제
            for (const id of pendingDeleteIds) {
                const res = await fetch(`${deleteBaseUrl}/${id}`, { method: 'DELETE' });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || `첨부파일(ID: ${id}) 삭제에 실패했습니다.`);
                }
            }

            // 2. 새 파일 업로드
            if (isTripMeeting) {
                const hasMeetingFiles = pendingMeetingReceiptFilesBySession.some(arr => arr.length > 0) ||
                                        pendingMeetingDocumentFilesBySession.some(arr => arr.length > 0);
                if (hasMeetingFiles || pendingTripReceiptFiles.length || pendingTripDocumentFiles.length) {
                    const formData = new FormData();
                    // 세션0 → 'meetingReceiptFiles' (extractSessionFiles backward compat)
                    // 세션1+ → 'meetingReceiptFiles_1', 'meetingReceiptFiles_2', ...
                    pendingMeetingReceiptFilesBySession.forEach((files, s) => {
                        const key = s === 0 ? 'meetingReceiptFiles' : `meetingReceiptFiles_${s}`;
                        files.forEach(f => formData.append(key, f));
                    });
                    pendingMeetingDocumentFilesBySession.forEach((files, s) => {
                        const key = s === 0 ? 'meetingDocumentFiles' : `meetingDocumentFiles_${s}`;
                        files.forEach(f => formData.append(key, f));
                    });
                    pendingTripReceiptFiles.forEach(f  => formData.append('tripReceiptFiles',  f));
                    pendingTripDocumentFiles.forEach(f => formData.append('tripDocumentFiles', f));

                    const res = await fetch(uploadUrl, { method: 'POST', body: formData });
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || '파일 업로드에 실패했습니다.');
                    }
                }
            } else if (isPurchase && (pendingReceiptFiles.length || pendingDocumentFiles.length || pendingEstimateFiles.length || pendingBankCopyFiles.length)) {
                const formData = new FormData();
                pendingReceiptFiles.forEach(f  => formData.append('receiptFiles',  f));
                pendingDocumentFiles.forEach(f => formData.append('documentFiles', f));
                if (isEquipment) {
                    pendingEstimateFiles.forEach(f => formData.append('estimateFiles', f));
                }
                pendingBankCopyFiles.forEach(f => formData.append('bankCopyFiles', f));

                const res = await fetch(uploadUrl, { method: 'POST', body: formData });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || '파일 업로드에 실패했습니다.');
                }
            } else if (pendingReceiptFiles.length || pendingDocumentFiles.length) {
                const formData = new FormData();
                pendingReceiptFiles.forEach(f  => formData.append('receiptFiles',  f));
                pendingDocumentFiles.forEach(f => formData.append('documentFiles', f));

                const res = await fetch(uploadUrl, { method: 'POST', body: formData });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || '파일 업로드에 실패했습니다.');
                }
            }

            closeAttachmentModal();
            await loadAllDocuments();
            Swal.fire({ icon: 'success', title: '저장 완료', text: '첨부파일이 저장되었습니다.', timer: 1800, showConfirmButton: false });
        } catch (err) {
            Swal.fire({ ...swalAboveModal, icon: 'error', title: '저장 실패', text: err.message });
        } finally {
            const btn = document.getElementById('modalSaveBtn');
            if (btn) { btn.disabled = false; btn.textContent = '저장'; }
        }
    }

    async function downloadSingleFile(url, filename) {
        const swalAboveModal = {
            didOpen: () => {
                const container = document.querySelector('.swal2-container');
                if (container) container.style.zIndex = '20001';
            }
        };
        try {
            const response = await fetch(url);
            if (!response.ok) {
                Swal.fire({ ...swalAboveModal, icon: 'error', title: '다운로드 실패', text: `파일을 찾을 수 없습니다: ${filename}` });
                return;
            }
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            Swal.fire({ ...swalAboveModal, icon: 'error', title: '다운로드 오류', text: `파일 다운로드 중 오류가 발생했습니다: ${filename}` });
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

    // ================================================
    // 프로젝트 필터 기능
    // ================================================
    const projectFilterInput = document.getElementById('projectFilterInput');
    const projectSearchInput = document.getElementById('projectSearchInput');
    const projectDropdown = document.getElementById('projectDropdown');
    const projectSearchBox = document.getElementById('projectSearchBox');
    const activeProjectsContainer = document.getElementById('activeProjects');
    const completedProjectsContainer = document.getElementById('completedProjects');
    const pausedProjectsContainer = document.getElementById('pausedProjects');

    // 프로젝트 목록 로드
    async function loadProjects() {
        try {
            const response = await fetch('/api/projects/filter');
            if (response.ok) {
                allProjects = await response.json();
                console.log('프로젝트 목록 로드 성공:', allProjects);
                renderProjectDropdown();
            } else {
                console.error('프로젝트 목록 로드 실패:', response.status);
                allProjects = [];
            }
        } catch (error) {
            console.error('프로젝트 목록 로드 중 오류:', error);
            allProjects = [];
        }
    }

    // 프로젝트 드롭다운 렌더링
    function renderProjectDropdown(searchKeyword = '') {
        const activeProjects = allProjects.filter(p => p.status === 'ACTIVE');
        const completedProjects = allProjects.filter(p => p.status === 'COMPLETED');
        const pausedProjects = allProjects.filter(p => p.status === 'PAUSED');

        function filterProjects(projects) {
            if (!searchKeyword) return projects;
            return projects.filter(p =>
                p.projectName.toLowerCase().includes(searchKeyword.toLowerCase())
            );
        }

        // 전체 프로젝트 옵션 업데이트
        const projectAllOption = document.getElementById('projectAllOption');
        const allProjectCount = document.getElementById('allProjectCount');
        const allProjectItem = projectAllOption ? projectAllOption.querySelector('.project-item') : null;

        if (projectAllOption) {
            // 검색어가 있으면 전체 프로젝트 옵션 숨김
            if (searchKeyword) {
                projectAllOption.style.display = 'none';
            } else {
                projectAllOption.style.display = 'block';

                // 총 문서 개수 업데이트
                if (allProjectCount) {
                    const totalDocCount = allProjects.reduce((sum, p) => sum + p.documentCount, 0);
                    allProjectCount.textContent = totalDocCount;
                }

                // 선택 상태 업데이트
                if (allProjectItem) {
                    if (selectedProjectIdx === null) {
                        allProjectItem.classList.add('selected');
                    } else {
                        allProjectItem.classList.remove('selected');
                    }

                    // 클릭 이벤트 (중복 방지를 위해 기존 리스너 제거 후 추가)
                    allProjectItem.replaceWith(allProjectItem.cloneNode(true));
                    const newAllProjectItem = projectAllOption.querySelector('.project-item');
                    if (newAllProjectItem) {
                        newAllProjectItem.addEventListener('click', selectAllProjects);
                    }
                }
            }
        }

        renderProjectGroup(activeProjectsContainer, filterProjects(activeProjects), '진행중인 프로젝트가 없습니다.');
        renderProjectGroup(completedProjectsContainer, filterProjects(completedProjects), '완료된 프로젝트가 없습니다.');
        renderProjectGroup(pausedProjectsContainer, filterProjects(pausedProjects), '보류된 프로젝트가 없습니다.');
    }

    function renderProjectGroup(container, projects, emptyMessage) {
        if (projects.length === 0) {
            container.innerHTML = `<div class="project-empty">${emptyMessage}</div>`;
            return;
        }

        let html = '';
        projects.forEach(project => {
            const isSelected = selectedProjectIdx === project.idx;
            html += `
                <div class="project-item ${isSelected ? 'selected' : ''}" data-project-idx="${project.idx}">
                    <span class="project-item-name">${project.projectName}</span>
                    <span class="project-item-count">${project.documentCount}</span>
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.project-item').forEach(item => {
            item.addEventListener('click', function() {
                const projectIdx = parseInt(this.dataset.projectIdx);
                selectProject(projectIdx);
            });
        });
    }

    function selectProject(projectIdx) {
        const project = allProjects.find(p => p.idx === projectIdx);
        if (!project) return;

        selectedProjectIdx = projectIdx;
        projectSearchInput.value = project.projectName;
        closeProjectDropdown();
        currentPage = 1;
        filterDocuments();
    }

    function selectAllProjects() {
        selectedProjectIdx = null;
        projectSearchInput.value = '전체 프로젝트';
        closeProjectDropdown();
        currentPage = 1;
        filterDocuments();
    }

    function toggleProjectDropdown() {
        const isOpen = projectDropdown.style.display === 'block';
        if (isOpen) {
            closeProjectDropdown();
        } else {
            openProjectDropdown();
        }
    }

    function openProjectDropdown() {
        projectDropdown.style.display = 'block';
        projectFilterInput.classList.add('active');
        projectSearchBox.value = '';
        projectSearchBox.focus();
        renderProjectDropdown();
    }

    function closeProjectDropdown() {
        projectDropdown.style.display = 'none';
        projectFilterInput.classList.remove('active');
    }

    if (projectFilterInput) {
        projectFilterInput.addEventListener('click', toggleProjectDropdown);
    }

    if (projectSearchBox) {
        projectSearchBox.addEventListener('input', function() {
            renderProjectDropdown(this.value.trim());
        });
    }

    document.addEventListener('click', function(e) {
        if (!projectFilterInput?.contains(e.target) && !projectDropdown?.contains(e.target)) {
            closeProjectDropdown();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && projectDropdown?.style.display === 'block') {
            closeProjectDropdown();
        }
    });

    // 초기 로드
    loadAllDocuments().then(() => {
        setTimeout(() => selectTabFromUrl(), 100);
    });

    loadProjects();

    // 프로젝트 필터 초기값 설정
    if (projectSearchInput) {
        projectSearchInput.value = '전체 프로젝트';
    }

    // ============================================
    // 주간업무보고 PDF 모달
    // ============================================

    let weeklyPdfModal = null;

    function getWeeklyPdfModal() {
        if (weeklyPdfModal) return weeklyPdfModal;

        if (!document.getElementById('weeklyPdfModalStyle')) {
            const style = document.createElement('style');
            style.id = 'weeklyPdfModalStyle';
            style.textContent = `
                #weeklyPdfModal { font-family: inherit; }
                .wpdf-modal-inner { background:#fff; border-radius:14px; width:460px; max-height:80vh; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,0.25); overflow:hidden; animation:wpdfIn .18s ease; }
                @keyframes wpdfIn { from{opacity:0;transform:translateY(-10px) scale(.98);} to{opacity:1;transform:translateY(0) scale(1);} }
                .wpdf-modal-header { padding:18px 20px 14px; border-bottom:1px solid #f0f0f0; display:flex; align-items:center; justify-content:space-between; }
                .wpdf-modal-header h3 { margin:0; font-size:15px; font-weight:700; color:#1e293b; display:flex; align-items:center; gap:8px; }
                .wpdf-modal-header h3 i { color:#7c3aed; }
                .wpdf-close-btn { background:none; border:none; font-size:18px; color:#94a3b8; cursor:pointer; padding:2px 6px; border-radius:6px; transition:background .15s,color .15s; }
                .wpdf-close-btn:hover { background:#f3f4f6; color:#374151; }
                #weeklyPdfBody { padding:16px 20px; overflow-y:auto; flex:1; }
                .wpdf-file-row { display:flex; align-items:center; gap:10px; padding:10px 12px; background:#fafafa; border:1px solid #e8edf2; border-radius:8px; margin-bottom:6px; transition:background .12s; cursor:pointer; }
                .wpdf-file-row:hover { background:#e8f0fe; border-color:#93c5fd; }
                .wpdf-file-row i.pdf-icon { color:#ef4444; font-size:16px; }
                .wpdf-file-row span { flex:1; font-size:12px; color:#334155; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
                .wpdf-file-row .wpdf-size { font-size:11px; color:#94a3b8; white-space:nowrap; }
                .wpdf-dl-btn { background:#f3e8ff; color:#7c3aed; border:none; border-radius:6px; padding:4px 10px; font-size:12px; cursor:pointer; text-decoration:none; white-space:nowrap; transition:background .12s; }
                .wpdf-dl-btn:hover { background:#e9d5ff; }
            `;
            document.head.appendChild(style);
        }

        const modal = document.createElement('div');
        modal.id = 'weeklyPdfModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);display:none;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(2px);';
        modal.innerHTML = `
            <div class="wpdf-modal-inner">
                <div class="wpdf-modal-header">
                    <h3><i class="fas fa-paperclip"></i> PDF — 프로젝트 주간업무보고</h3>
                    <button class="wpdf-close-btn" id="weeklyPdfCloseBtn"><i class="fas fa-times"></i></button>
                </div>
                <div id="weeklyPdfBody"></div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeWeeklyPdfModal(); });
        modal.querySelector('#weeklyPdfCloseBtn').addEventListener('click', closeWeeklyPdfModal);
        weeklyPdfModal = modal;
        return modal;
    }

    function closeWeeklyPdfModal() {
        if (weeklyPdfModal) weeklyPdfModal.style.display = 'none';
    }

    function fmtFileSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    async function openWeeklyPdfModal(doc) {
        const modal = getWeeklyPdfModal();
        document.getElementById('weeklyPdfBody').innerHTML = `
            <div style="text-align:center;padding:20px 0;color:#64748b;font-size:13px;">
                <i class="fas fa-spinner fa-spin" style="font-size:22px;margin-bottom:10px;display:block;color:#7c3aed;"></i>
                불러오는 중...
            </div>`;
        modal.style.display = 'flex';

        const docIdx = doc.idx; // approval_documents.idx (API가 기대하는 값)
        try {
            const res = await fetch(`/api/document/weekly-report/official-pdf/${docIdx}`);
            if (!res.ok) throw new Error();
            const pdfList = await res.json();

            if (!pdfList || pdfList.length === 0) {
                document.getElementById('weeklyPdfBody').innerHTML = `
                    <div style="text-align:center;padding:28px 0;color:#94a3b8;font-size:13px;">
                        <i class="fas fa-file-pdf" style="font-size:28px;display:block;margin-bottom:10px;"></i>
                        생성된 PDF가 없습니다.
                    </div>`;
                return;
            }

            document.getElementById('weeklyPdfBody').innerHTML = pdfList.map(f => `
                <div class="wpdf-file-row" data-url="/api/document/weekly-report/download/${f.idx}">
                    <i class="fas fa-file-pdf pdf-icon"></i>
                    <span>${f.fileName || 'weekly-report.pdf'}</span>
                    <span class="wpdf-size">${fmtFileSize(f.fileSize)}</span>
                    <a href="/api/document/weekly-report/download/${f.idx}" class="wpdf-dl-btn" onclick="event.stopPropagation();">
                        <i class="fas fa-download"></i> 다운로드
                    </a>
                </div>
            `).join('');

            document.getElementById('weeklyPdfBody').querySelectorAll('.wpdf-file-row').forEach(row => {
                row.addEventListener('click', () => {
                    window.location.href = row.dataset.url;
                });
            });
        } catch (_) {
            document.getElementById('weeklyPdfBody').innerHTML = `
                <div style="text-align:center;padding:28px 0;color:#ef4444;font-size:13px;">
                    <i class="fas fa-exclamation-circle" style="font-size:24px;display:block;margin-bottom:8px;"></i>
                    파일 정보를 불러오는 데 실패했습니다.
                </div>`;
        }
    }
});

