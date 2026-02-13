document.addEventListener('DOMContentLoaded', function() {
    let allDocuments = [];
    let filteredDocuments = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentSortField = 'startDate';
    let currentSortOrder = 'desc'; // desc: 최신순(미래→과거), asc: 오래된순(과거→미래)

    // DOM 요소
    const userSearchInput = document.getElementById('userSearchInput');
    const statusFilter = document.getElementById('statusFilter');
    const yearFilter = document.getElementById('yearFilter');
    const searchInput = document.getElementById('searchInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const documentsList = document.getElementById('documentsList');

    // 초기 데이터 로드
    loadDocuments();

    // 이벤트 리스너
    refreshBtn.addEventListener('click', loadDocuments);
    userSearchInput.addEventListener('input', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    yearFilter.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters);

    /**
     * 연차신청서 목록 조회
     */
    async function loadDocuments() {
        try {
            showLoading();

            const response = await fetch('/api/vacation/admin/documents');

            if (!response.ok) {
                throw new Error('연차신청서 목록 조회 실패');
            }

            allDocuments = await response.json();
            populateYearFilter();
            applyFilters();

        } catch (error) {
            console.error('연차신청서 목록 조회 오류:', error);
            showError('데이터를 불러오는 중 오류가 발생했습니다.');
        }
    }

    /**
     * 연도 필터 옵션 채우기 (문서에 존재하는 연도만)
     */
    function populateYearFilter() {
        const years = [...new Set(allDocuments.map(doc => {
            if (doc.createdAt) {
                return new Date(doc.createdAt).getFullYear();
            }
            return null;
        }))]
            .filter(Boolean)
            .sort((a, b) => b - a); // 최신 연도부터

        yearFilter.innerHTML = '<option value="">전체</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}년`;
            yearFilter.appendChild(option);
        });
    }

    /**
     * 한글 초성 추출
     */
    function getKoreanInitials(text) {
        const initials = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
        let result = '';

        for (let char of text) {
            const code = char.charCodeAt(0);
            if (code >= 0xAC00 && code <= 0xD7A3) {
                // 한글 유니코드 범위
                const initialIndex = Math.floor((code - 0xAC00) / 588);
                result += initials[initialIndex];
            } else {
                result += char;
            }
        }

        return result;
    }

    /**
     * 초성 검색 매칭
     */
    function matchesKoreanSearch(text, searchTerm) {
        if (!text || !searchTerm) return true;

        const lowerText = text.toLowerCase();
        const lowerSearch = searchTerm.toLowerCase();

        // 일반 검색 (포함 여부)
        if (lowerText.includes(lowerSearch)) {
            return true;
        }

        // 초성 검색
        const initials = getKoreanInitials(text);
        if (initials.includes(searchTerm)) {
            return true;
        }

        return false;
    }

    /**
     * 텍스트 하이라이트
     */
    function highlightText(text, searchTerm) {
        if (!text || !searchTerm) return text;

        // 일반 검색 하이라이트
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        let highlighted = text.replace(regex, '<mark class="highlight-text">$1</mark>');

        // 초성 검색인 경우 해당 글자 하이라이트
        if (!regex.test(text)) {
            const initials = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
            let result = '';
            let searchIndex = 0;

            for (let char of text) {
                if (searchIndex >= searchTerm.length) {
                    result += char;
                    continue;
                }

                const code = char.charCodeAt(0);
                if (code >= 0xAC00 && code <= 0xD7A3) {
                    const initialIndex = Math.floor((code - 0xAC00) / 588);
                    const initial = initials[initialIndex];

                    if (initial === searchTerm[searchIndex]) {
                        result += `<mark class="highlight-text">${char}</mark>`;
                        searchIndex++;
                    } else {
                        result += char;
                    }
                } else {
                    if (char.toLowerCase() === searchTerm[searchIndex].toLowerCase()) {
                        result += `<mark class="highlight-text">${char}</mark>`;
                        searchIndex++;
                    } else {
                        result += char;
                    }
                }
            }

            highlighted = result;
        }

        return highlighted;
    }

    /**
     * 필터 적용
     */
    function applyFilters() {
        const userSearch = userSearchInput.value.trim();
        const selectedStatus = statusFilter.value;
        const selectedYear = yearFilter.value;
        const searchTerm = searchInput.value.trim();

        filteredDocuments = allDocuments.filter(doc => {
            // 사용자 검색 (초성 검색 포함)
            if (userSearch && !matchesKoreanSearch(doc.userName, userSearch)) {
                return false;
            }

            // 문서 상태 필터
            if (selectedStatus === 'active' && doc.deletedAt != null) {
                return false;
            }
            if (selectedStatus === 'deleted' && doc.deletedAt == null) {
                return false;
            }

            // 연도 필터
            if (selectedYear) {
                const docYear = doc.createdAt ? new Date(doc.createdAt).getFullYear() : null;
                if (docYear !== parseInt(selectedYear)) {
                    return false;
                }
            }

            // 기타 검색 (부서, 사유)
            if (searchTerm) {
                const searchableText = [
                    doc.userDeptName,
                    doc.userDept,
                    doc.reason,
                    doc.vacationType
                ].filter(Boolean).join(' ').toLowerCase();

                if (!searchableText.includes(searchTerm.toLowerCase())) {
                    return false;
                }
            }

            return true;
        });

        currentPage = 1; // 필터 변경 시 첫 페이지로
        sortDocuments();
        renderDocuments();
    }

    /**
     * 문서 정렬
     */
    function sortDocuments() {
        filteredDocuments.sort((a, b) => {
            let aVal, bVal;

            switch (currentSortField) {
                case 'createdAt':
                    aVal = a.createdAt ? new Date(a.createdAt) : new Date(0);
                    bVal = b.createdAt ? new Date(b.createdAt) : new Date(0);
                    break;
                case 'userName':
                    aVal = a.userName || '';
                    bVal = b.userName || '';
                    break;
                case 'userDeptName':
                    aVal = a.userDeptName || a.userDept || '';
                    bVal = b.userDeptName || b.userDept || '';
                    break;
                case 'vacationType':
                    aVal = a.vacationType || '';
                    bVal = b.vacationType || '';
                    break;
                case 'startDate':
                    aVal = a.startDate ? new Date(a.startDate) : new Date(0);
                    bVal = b.startDate ? new Date(b.startDate) : new Date(0);
                    break;
                case 'endDate':
                    aVal = a.endDate ? new Date(a.endDate) : new Date(0);
                    bVal = b.endDate ? new Date(b.endDate) : new Date(0);
                    break;
                case 'days':
                    aVal = parseFloat(a.days) || 0;
                    bVal = parseFloat(b.days) || 0;
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return currentSortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return currentSortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * 정렬 변경
     */
    window.changeSortOrder = function(field) {
        if (currentSortField === field) {
            // 같은 필드 클릭 시 정렬 순서 토글
            currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            // 다른 필드 클릭 시 해당 필드로 변경하고 내림차순으로 시작
            currentSortField = field;
            currentSortOrder = 'desc';
        }
        currentPage = 1; // 정렬 변경 시 첫 페이지로
        sortDocuments();
        renderDocuments();
    }

    /**
     * 문서 목록 렌더링
     */
    function renderDocuments() {
        if (filteredDocuments.length === 0) {
            showEmpty();
            return;
        }

        // 페이지네이션 계산
        const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentDocuments = filteredDocuments.slice(startIndex, endIndex);

        const getSortIcon = (field) => {
            if (currentSortField !== field) {
                return '<i class="fas fa-sort sort-icon"></i>';
            }
            return currentSortOrder === 'asc'
                ? '<i class="fas fa-sort-up sort-icon active"></i>'
                : '<i class="fas fa-sort-down sort-icon active"></i>';
        };

        const table = `
            <div class="table-header-info">
                <div class="total-count">
                    <i class="fas fa-file-alt"></i>
                    총 <strong>${filteredDocuments.length}</strong>건
                </div>
            </div>
            <table class="documents-table">
                <thead>
                    <tr>
                        <th class="sortable" onclick="changeSortOrder('createdAt')">
                            신청일 ${getSortIcon('createdAt')}
                        </th>
                        <th class="sortable" onclick="changeSortOrder('userName')">
                            사용자 ${getSortIcon('userName')}
                        </th>
                        <th class="sortable" onclick="changeSortOrder('userDeptName')">
                            부서 ${getSortIcon('userDeptName')}
                        </th>
                        <th class="sortable" onclick="changeSortOrder('vacationType')">
                            연차 유형 ${getSortIcon('vacationType')}
                        </th>
                        <th class="sortable" onclick="changeSortOrder('startDate')">
                            시작일 ${getSortIcon('startDate')}
                        </th>
                        <th class="sortable" onclick="changeSortOrder('endDate')">
                            종료일 ${getSortIcon('endDate')}
                        </th>
                        <th class="sortable" onclick="changeSortOrder('days')">
                            일수 ${getSortIcon('days')}
                        </th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody id="documentsTableBody">
                    ${currentDocuments.map(doc => {
                        const isDeleted = doc.deletedAt != null;
                        const rowClass = isDeleted ? 'class="deleted-row"' : '';
                        const userSearch = userSearchInput.value.trim();
                        const userName = userSearch ? highlightText(doc.userName || '-', userSearch) : (doc.userName || '-');

                        return `
                        <tr ${rowClass} onclick="viewDocument(${doc.documentIdx})" style="cursor: pointer;">
                            <td>${formatDateTime(doc.createdAt)}</td>
                            <td><strong>${userName}</strong></td>
                            <td>${doc.userDeptName || doc.userDept || '-'}</td>
                            <td>${doc.vacationType || '-'}</td>
                            <td>${formatDate(doc.startDate)}</td>
                            <td>${formatDate(doc.endDate)}</td>
                            <td><strong>${doc.days}</strong>일</td>
                            <td onclick="event.stopPropagation()">
                                <div class="action-buttons">
                                    <button class="btn-view" onclick="viewDocument(${doc.documentIdx})">
                                        <i class="fas fa-eye"></i>
                                        보기
                                    </button>
                                    <button class="btn-delete ${isDeleted ? 'disabled' : ''}"
                                            onclick="${isDeleted ? 'return false;' : `deleteDocument(${doc.documentIdx}, '${doc.userName}')`}"
                                            ${isDeleted ? 'disabled data-tooltip="이미 삭제된 문서입니다."' : ''}>
                                        <i class="fas fa-trash"></i>
                                        삭제
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
            ${totalPages > 1 ? renderPagination(totalPages) : ''}
        `;

        documentsList.innerHTML = table;
    }

    /**
     * 페이지네이션 렌더링
     */
    function renderPagination(totalPages) {
        let pagination = '<div class="pagination">';

        // 이전 버튼
        if (currentPage > 1) {
            pagination += `<button class="page-btn" onclick="goToPage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
        }

        // 페이지 번호
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            pagination += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
            if (startPage > 2) {
                pagination += `<span class="page-dots">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pagination += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pagination += `<span class="page-dots">...</span>`;
            }
            pagination += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
        }

        // 다음 버튼
        if (currentPage < totalPages) {
            pagination += `<button class="page-btn" onclick="goToPage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
        }

        pagination += '</div>';
        return pagination;
    }

    /**
     * 페이지 이동
     */
    window.goToPage = function(page) {
        currentPage = page;
        renderDocuments();
    };

    /**
     * 문서 상세보기
     */
    window.viewDocument = function(documentIdx) {
        window.location.href = `/approval/vacation/detail?documentIdx=${documentIdx}`;
    };

    /**
     * 문서 삭제
     */
    window.deleteDocument = async function(documentIdx, userName) {
        const confirmed = await Swal.fire({
            title: '연차신청서 삭제',
            text: `${userName}님의 연차신청서를 삭제하시겠습니까?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '삭제',
            cancelButtonText: '취소'
        });

        if (!confirmed.isConfirmed) {
            return;
        }

        try {
            const response = await fetch(`/api/vacation/admin/documents/${documentIdx}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '삭제 실패');
            }

            await Swal.fire({
                icon: 'success',
                title: '삭제 완료',
                text: '연차신청서가 삭제되었습니다.',
                timer: 1500,
                showConfirmButton: false
            });

            loadDocuments();

        } catch (error) {
            console.error('삭제 오류:', error);
            Swal.fire({
                icon: 'error',
                title: '삭제 실패',
                text: error.message
            });
        }
    };

    /**
     * 로딩 표시
     */
    function showLoading() {
        documentsList.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>데이터를 불러오는 중...</p>
            </div>
        `;
    }

    /**
     * 빈 상태 표시
     */
    function showEmpty() {
        documentsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>연차신청서가 없습니다.</p>
            </div>
        `;
    }

    /**
     * 오류 표시
     */
    function showError(message) {
        documentsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    }

    /**
     * 날짜 포맷 (YYYY-MM-DD)
     */
    function formatDate(dateString) {
        if (!dateString) return '-';
        return dateString;
    }

    /**
     * 날짜시간 포맷 (YYYY-MM-DD HH:mm)
     */
    function formatDateTime(dateTimeString) {
        if (!dateTimeString) return '-';
        const date = new Date(dateTimeString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
});
