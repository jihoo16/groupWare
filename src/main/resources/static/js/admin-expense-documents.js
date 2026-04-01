document.addEventListener('DOMContentLoaded', function() {
    let allDocuments = [];
    let filteredDocuments = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentSortField = 'createdAt';
    let currentSortOrder = 'desc';

    // DOM 요소
    const userSearchInput = document.getElementById('userSearchInput');
    const statusFilter = document.getElementById('statusFilter');
    const yearFilter = document.getElementById('yearFilter');
    const receiptFilter = document.getElementById('receiptFilter');
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
    receiptFilter.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters);

    async function loadDocuments() {
        try {
            showLoading();
            const response = await fetch('/api/approval/expense/admin/documents');
            if (!response.ok) throw new Error('문서 목록 조회 실패');
            allDocuments = await response.json();
            populateYearFilter();
            applyFilters();
        } catch (error) {
            console.error('문서 목록 조회 오류:', error);
            showError('데이터를 불러오는 중 오류가 발생했습니다.');
        }
    }

    function populateYearFilter() {
        const years = [...new Set(allDocuments.map(doc => {
            if (doc.createdAt) return new Date(doc.createdAt).getFullYear();
            return null;
        }))].filter(Boolean).sort((a, b) => b - a);

        yearFilter.innerHTML = '<option value="">전체</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}년`;
            yearFilter.appendChild(option);
        });
    }

    // ── 한글 초성 검색 ────────────────────────────────────────

    function getKoreanInitials(text) {
        const initials = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
        let result = '';
        for (let char of text) {
            const code = char.charCodeAt(0);
            if (code >= 0xAC00 && code <= 0xD7A3) {
                result += initials[Math.floor((code - 0xAC00) / 588)];
            } else {
                result += char;
            }
        }
        return result;
    }

    function matchesKoreanSearch(text, searchTerm) {
        if (!text || !searchTerm) return true;
        if (text.toLowerCase().includes(searchTerm.toLowerCase())) return true;
        if (getKoreanInitials(text).includes(searchTerm)) return true;
        return false;
    }

    function highlightText(text, searchTerm) {
        if (!text || !searchTerm) return text;
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        if (regex.test(text)) {
            return text.replace(regex, '<mark class="highlight-text">$1</mark>');
        }
        // 초성 검색 하이라이트
        const initials = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
        let result = '';
        let searchIndex = 0;
        for (let char of text) {
            if (searchIndex >= searchTerm.length) { result += char; continue; }
            const code = char.charCodeAt(0);
            if (code >= 0xAC00 && code <= 0xD7A3) {
                const initial = initials[Math.floor((code - 0xAC00) / 588)];
                if (initial === searchTerm[searchIndex]) {
                    result += `<mark class="highlight-text">${char}</mark>`;
                    searchIndex++;
                } else { result += char; }
            } else {
                if (char.toLowerCase() === searchTerm[searchIndex].toLowerCase()) {
                    result += `<mark class="highlight-text">${char}</mark>`;
                    searchIndex++;
                } else { result += char; }
            }
        }
        return result;
    }

    // ── 필터 / 정렬 ──────────────────────────────────────────

    function applyFilters() {
        const userSearch = userSearchInput.value.trim();
        const selectedStatus = statusFilter.value;
        const selectedYear = yearFilter.value;
        const selectedReceipt = receiptFilter.value;
        const searchTerm = searchInput.value.trim();

        filteredDocuments = allDocuments.filter(doc => {
            if (userSearch && !matchesKoreanSearch(doc.userName, userSearch)) return false;

            if (selectedStatus === 'active' && doc.deleted) return false;
            if (selectedStatus === 'deleted' && !doc.deleted) return false;

            if (selectedYear) {
                const docYear = doc.createdAt ? new Date(doc.createdAt).getFullYear() : null;
                if (docYear !== parseInt(selectedYear)) return false;
            }

            if (selectedReceipt === 'complete' && (doc.detailCount === 0 || doc.receiptAttachedCount < doc.detailCount)) return false;
            if (selectedReceipt === 'incomplete' && doc.detailCount > 0 && doc.receiptAttachedCount >= doc.detailCount) return false;

            if (searchTerm) {
                const searchable = [doc.userDeptName, doc.userDept, doc.documentNumber].filter(Boolean).join(' ').toLowerCase();
                if (!searchable.includes(searchTerm.toLowerCase())) return false;
            }

            return true;
        });

        currentPage = 1;
        sortDocuments();
        renderDocuments();
    }

    function sortDocuments() {
        filteredDocuments.sort((a, b) => {
            let aVal, bVal;
            switch (currentSortField) {
                case 'createdAt':
                    aVal = a.createdAt ? new Date(a.createdAt) : new Date(0);
                    bVal = b.createdAt ? new Date(b.createdAt) : new Date(0);
                    break;
                case 'userName':
                    aVal = a.userName || ''; bVal = b.userName || '';
                    break;
                case 'userDeptName':
                    aVal = a.userDeptName || ''; bVal = b.userDeptName || '';
                    break;
                case 'totalAmount':
                    aVal = a.totalAmount || 0; bVal = b.totalAmount || 0;
                    break;
                case 'detailCount':
                    aVal = a.detailCount || 0; bVal = b.detailCount || 0;
                    break;
                default: return 0;
            }
            if (aVal < bVal) return currentSortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return currentSortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    window.changeSortOrder = function(field) {
        if (currentSortField === field) {
            currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortField = field;
            currentSortOrder = 'desc';
        }
        currentPage = 1;
        sortDocuments();
        renderDocuments();
    };

    // ── 렌더링 ───────────────────────────────────────────────

    function renderDocuments() {
        if (filteredDocuments.length === 0) { showEmpty(); return; }

        const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const currentDocuments = filteredDocuments.slice(startIndex, startIndex + itemsPerPage);

        const getSortIcon = (field) => {
            if (currentSortField !== field) return '<i class="fas fa-sort sort-icon"></i>';
            return currentSortOrder === 'asc'
                ? '<i class="fas fa-sort-up sort-icon active"></i>'
                : '<i class="fas fa-sort-down sort-icon active"></i>';
        };

        const userSearch = userSearchInput.value.trim();

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
                        <th>문서번호</th>
                        <th class="sortable" onclick="changeSortOrder('totalAmount')">
                            합계금액 ${getSortIcon('totalAmount')}
                        </th>
                        <th class="sortable" onclick="changeSortOrder('detailCount')">
                            항목수 ${getSortIcon('detailCount')}
                        </th>
                        <th>영수증</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody id="documentsTableBody">
                    ${currentDocuments.map(doc => {
                        const isDeleted = doc.deleted;
                        const rowClass = isDeleted ? 'class="deleted-row"' : '';
                        const userName = userSearch ? highlightText(doc.userName || '-', userSearch) : (doc.userName || '-');

                        const receiptStatus = doc.detailCount === 0
                            ? '<span class="badge badge-neutral">-</span>'
                            : doc.receiptAttachedCount >= doc.detailCount
                                ? `<span class="badge badge-complete">${doc.receiptAttachedCount}/${doc.detailCount}</span>`
                                : `<span class="badge badge-incomplete">${doc.receiptAttachedCount}/${doc.detailCount}</span>`;

                        return `
                        <tr ${rowClass} onclick="viewDocument(${doc.idx})" style="cursor: pointer;">
                            <td>${formatDateTime(doc.createdAt)}</td>
                            <td><strong>${userName}</strong><br><small style="color:#94a3b8;">${doc.userPosition || ''}</small></td>
                            <td>${doc.userDeptName || doc.userDept || '-'}</td>
                            <td><code style="font-size:12px;">${doc.documentNumber || '-'}</code></td>
                            <td style="text-align:right;font-weight:600;font-variant-numeric:tabular-nums;">${formatAmount(doc.totalAmount)}</td>
                            <td style="text-align:center;">${doc.detailCount}건</td>
                            <td style="text-align:center;">${receiptStatus}</td>
                            <td onclick="event.stopPropagation()">
                                <div class="action-buttons">
                                    <button class="btn-view" onclick="viewDocument(${doc.idx})">
                                        <i class="fas fa-eye"></i> 보기
                                    </button>
                                    <button class="btn-delete ${isDeleted ? 'disabled' : ''}"
                                            onclick="${isDeleted ? 'return false;' : `deleteDocument(${doc.idx}, '${doc.userName}')`}"
                                            ${isDeleted ? 'disabled data-tooltip="이미 삭제된 문서입니다."' : ''}>
                                        <i class="fas fa-trash"></i> 삭제
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

    // ── 페이지네이션 ─────────────────────────────────────────

    function renderPagination(totalPages) {
        let pagination = '<div class="pagination">';
        if (currentPage > 1) {
            pagination += `<button class="page-btn" onclick="goToPage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
        }
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

        if (startPage > 1) {
            pagination += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
            if (startPage > 2) pagination += `<span class="page-dots">...</span>`;
        }
        for (let i = startPage; i <= endPage; i++) {
            pagination += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) pagination += `<span class="page-dots">...</span>`;
            pagination += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
        }
        if (currentPage < totalPages) {
            pagination += `<button class="page-btn" onclick="goToPage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
        }
        pagination += '</div>';
        return pagination;
    }

    window.goToPage = function(page) {
        currentPage = page;
        renderDocuments();
    };

    // ── 문서 액션 ────────────────────────────────────────────

    window.viewDocument = function(idx) {
        window.location.href = `/approval/expense/detail?idx=${idx}`;
    };

    window.deleteDocument = async function(idx, userName) {
        const confirmed = await Swal.fire({
            title: '개인경비청구 삭제',
            text: `${userName}님의 개인경비청구를 삭제하시겠습니까?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '삭제',
            cancelButtonText: '취소'
        });

        if (!confirmed.isConfirmed) return;

        try {
            const response = await fetch(`/api/approval/expense/admin/documents/${idx}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '삭제 실패');
            }
            await Swal.fire({
                icon: 'success',
                title: '삭제 완료',
                text: '개인경비청구가 삭제되었습니다.',
                timer: 1500,
                showConfirmButton: false
            });
            loadDocuments();
        } catch (error) {
            console.error('삭제 오류:', error);
            Swal.fire({ icon: 'error', title: '삭제 실패', text: error.message });
        }
    };

    // ── 유틸리티 ─────────────────────────────────────────────

    function formatDateTime(dateTimeString) {
        if (!dateTimeString) return '-';
        const d = new Date(dateTimeString);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }

    function formatAmount(amount) {
        if (amount == null) return '-';
        return '₩ ' + Number(amount).toLocaleString();
    }

    function showLoading() {
        documentsList.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>데이터를 불러오는 중...</p>
            </div>`;
    }

    function showEmpty() {
        documentsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>개인경비청구 문서가 없습니다.</p>
            </div>`;
    }

    function showError(message) {
        documentsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>`;
    }
});
