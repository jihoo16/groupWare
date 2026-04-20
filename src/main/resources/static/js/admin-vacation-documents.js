document.addEventListener('DOMContentLoaded', function() {
    // 검색 유틸리티 (공통)
    const searchUtils = new SearchUtils();
    const matchesKoreanSearch = (text, searchTerm) => searchUtils.matchesSearch(text, searchTerm);
    const highlightText = (text, searchTerm) => searchUtils.highlightText(text, searchTerm, 'highlight-text');

    let allDocuments = [];
    let filteredDocuments = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentSortField = 'startDate';
    let currentSortOrder = 'desc'; // desc: 최신순(미래→과거), asc: 오래된순(과거→미래)

    // 대리 등록 모달 상태
    let allActiveUsers = [];        // /api/users 캐시
    let proxySelectedUserIdx = null;
    let proxySelectedUserName = '';

    // 캘린더 상태
    let proxyCalYear = new Date().getFullYear();
    let proxyCalMonth = new Date().getMonth();   // 0-based
    let proxyRequestedDates = new Set();         // 선택된 사용자의 기존 신청 날짜
    let proxyHolidays = {};                      // YYYY-MM-DD: 공휴일명
    let proxyHolidaysLoaded = new Set();         // 로드된 연도
    let proxySelectedStart = null;               // YYYY-MM-DD
    let proxySelectedEnd = null;                 // YYYY-MM-DD

    // DOM 요소
    const userSearchInput = document.getElementById('userSearchInput');
    const statusFilter = document.getElementById('statusFilter');
    const yearFilter = document.getElementById('yearFilter');
    const approvalFilter = document.getElementById('approvalFilter');
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
    approvalFilter.addEventListener('change', applyFilters);
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
     * 필터 적용
     */
    function applyFilters() {
        const userSearch = userSearchInput.value.trim();
        const selectedStatus = statusFilter.value;
        const selectedYear = yearFilter.value;
        const selectedApproval = approvalFilter.value;
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

            // 승인 상태 필터
            if (selectedApproval === 'approved' && !doc.isApproved) {
                return false;
            }
            if (selectedApproval === 'pending' && doc.isApproved) {
                return false;
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
     * 문서 정렬 — 그룹 우선순위 유지 + 그룹 내부는 사용자 선택 컬럼/방향으로 정렬
     * 그룹: 1) 정상 + 미승인, 2) 정상 + 승인완료, 3) 삭제된 건
     */
    function sortDocuments() {
        const dateFields = new Set(['createdAt', 'startDate', 'endDate']);
        const numberFields = new Set(['days']);

        const compareByField = (a, b) => {
            const aVal = a[currentSortField];
            const bVal = b[currentSortField];
            const aNull = aVal == null;
            const bNull = bVal == null;
            if (aNull && bNull) return 0;
            if (aNull) return 1;
            if (bNull) return -1;

            let diff;
            if (dateFields.has(currentSortField)) {
                diff = new Date(aVal) - new Date(bVal);
            } else if (numberFields.has(currentSortField)) {
                diff = Number(aVal) - Number(bVal);
            } else {
                diff = String(aVal).localeCompare(String(bVal), 'ko');
            }
            return currentSortOrder === 'asc' ? diff : -diff;
        };

        filteredDocuments.sort((a, b) => {
            const aGroup = a.deletedAt != null ? 2 : (a.isApproved ? 1 : 0);
            const bGroup = b.deletedAt != null ? 2 : (b.isApproved ? 1 : 0);
            if (aGroup !== bGroup) return aGroup - bGroup;
            return compareByField(a, b);
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

                        const proxyBadge = doc.isProxyRequest
                            ? `<span class="proxy-badge" data-tip="관리자 권한으로 직접 등록된 연차"><i class="fas fa-user-shield"></i> 관리자등록</span>`
                            : '';

                        return `
                        <tr ${rowClass} onclick="viewDocument(${doc.documentIdx})" style="cursor: pointer;">
                            <td>${formatDateTime(doc.createdAt)}</td>
                            <td><strong>${userName}</strong>${proxyBadge}</td>
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
                                    ${doc.isApproved
                                        ? `<button class="btn-revoke ${isDeleted ? 'disabled' : ''}"
                                                onclick="${isDeleted ? 'return false;' : `approveDocument(${doc.documentIdx}, '${doc.userName}', false)`}"
                                                ${isDeleted ? 'disabled' : ''}>
                                                <i class="fas fa-undo"></i>
                                                승인철회
                                           </button>`
                                        : `<button class="btn-approve ${isDeleted ? 'disabled' : ''}"
                                                onclick="${isDeleted ? 'return false;' : `approveDocument(${doc.documentIdx}, '${doc.userName}', true)`}"
                                                ${isDeleted ? 'disabled' : ''}>
                                                <i class="fas fa-check"></i>
                                                승인
                                           </button>`
                                    }
                                    <button class="btn-delete ${isDeleted ? 'disabled' : ''}"
                                            onclick="${isDeleted ? 'return false;' : `deleteDocument(${doc.documentIdx}, '${doc.userName}')`}"
                                            ${isDeleted ? 'disabled data-tip="이미 삭제된 문서입니다."' : ''}>
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
     * 연차신청서 승인 / 승인철회
     * @param {number} documentIdx - 문서 IDX
     * @param {string} userName    - 사용자 이름 (확인창용)
     * @param {boolean} approve    - true: 승인, false: 승인철회
     */
    window.approveDocument = async function(documentIdx, userName, approve) {
        const action = approve ? '승인' : '승인 철회';
        const confirmed = await Swal.fire({
            title: `연차신청서 ${action}`,
            text: `${userName}님의 연차신청서를 ${action}하시겠습니까?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: approve ? '#10b981' : '#f59e0b',
            cancelButtonColor: '#6c757d',
            confirmButtonText: action,
            cancelButtonText: '취소'
        });

        if (!confirmed.isConfirmed) return;

        try {
            const response = await fetch(
                `/api/vacation/admin/documents/${documentIdx}/approve?approve=${approve}`,
                { method: 'PATCH' }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `${action} 실패`);
            }

            await Swal.fire({
                icon: 'success',
                title: `${action} 완료`,
                text: approve
                    ? '승인되었습니다. 캘린더 일정이 등록되었습니다.'
                    : '승인이 철회되었습니다. 캘린더 일정이 삭제되었습니다.',
                timer: 2000,
                showConfirmButton: false
            });

            loadDocuments();

        } catch (error) {
            console.error(`${action} 오류:`, error);
            Swal.fire({
                icon: 'error',
                title: `${action} 실패`,
                text: error.message
            });
        }
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

    // ============================================================
    // 대리 등록 모달
    // ============================================================
    const proxyModal = document.getElementById('proxyModal');
    const openProxyModalBtn = document.getElementById('openProxyModalBtn');
    const closeProxyModalBtn = document.getElementById('closeProxyModalBtn');
    const proxyCancelBtn = document.getElementById('proxyCancelBtn');
    const proxySubmitBtn = document.getElementById('proxySubmitBtn');
    const proxyUserSearchInput = document.getElementById('proxyUserSearchInput');
    const proxyUserDropdown = document.getElementById('proxyUserDropdown');
    const proxySelectedUser = document.getElementById('proxySelectedUser');
    const proxySelectedUserText = document.getElementById('proxySelectedUserText');
    const proxyClearUserBtn = document.getElementById('proxyClearUserBtn');
    const proxyVacationType = document.getElementById('proxyVacationType');
    const proxyDaysDisplay = document.getElementById('proxyDaysDisplay');
    const proxyReason = document.getElementById('proxyReason');

    // 캘린더 DOM
    const proxyCalPrev = document.getElementById('proxyCalPrev');
    const proxyCalNext = document.getElementById('proxyCalNext');
    const proxyCalTitle = document.getElementById('proxyCalTitle');
    const proxyCalGrid = document.getElementById('proxyCalGrid');
    const proxyCalRange = document.getElementById('proxyCalRange');
    const proxyCalHint = document.getElementById('proxyCalHint');

    openProxyModalBtn.addEventListener('click', openProxyModal);
    closeProxyModalBtn.addEventListener('click', closeProxyModal);
    proxyCancelBtn.addEventListener('click', closeProxyModal);
    proxyModal.addEventListener('click', (e) => {
        if (e.target === proxyModal) closeProxyModal();
    });
    proxyUserSearchInput.addEventListener('input', renderProxyUserDropdown);
    proxyUserSearchInput.addEventListener('focus', renderProxyUserDropdown);
    proxyClearUserBtn.addEventListener('click', clearProxySelectedUser);
    proxyVacationType.addEventListener('change', onProxyTypeChange);
    proxyCalPrev.addEventListener('click', () => navigateProxyCalendar(-1));
    proxyCalNext.addEventListener('click', () => navigateProxyCalendar(1));
    proxySubmitBtn.addEventListener('click', submitProxyRequest);

    // 모달 외부 클릭 시 사용자 드롭다운 닫기
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.proxy-form-group') && proxyUserDropdown) {
            proxyUserDropdown.style.display = 'none';
        }
    });

    async function openProxyModal() {
        resetProxyModal();
        proxyModal.classList.add('show');

        // 사용자 목록 로드 (1회 캐시)
        if (allActiveUsers.length === 0) {
            try {
                const res = await fetch('/api/users');
                if (!res.ok) throw new Error('사용자 목록 조회 실패');
                allActiveUsers = await res.json();
            } catch (err) {
                console.error('사용자 목록 조회 오류:', err);
                Swal.fire({ icon: 'error', title: '사용자 목록 조회 실패', text: err.message });
            }
        }

        // 현재 월의 공휴일 미리 로드 + 빈 캘린더 렌더
        const now = new Date();
        proxyCalYear = now.getFullYear();
        proxyCalMonth = now.getMonth();
        await ensureProxyHolidaysLoaded(proxyCalYear);
        renderProxyCalendar();
    }

    function closeProxyModal() {
        proxyModal.classList.remove('show');
    }

    function resetProxyModal() {
        proxySelectedUserIdx = null;
        proxySelectedUserName = '';
        proxyUserSearchInput.value = '';
        proxyUserSearchInput.style.display = '';
        proxyUserDropdown.innerHTML = '';
        proxyUserDropdown.style.display = 'none';
        proxySelectedUser.style.display = 'none';
        proxyVacationType.value = '연차';
        proxyDaysDisplay.textContent = '0';
        proxyReason.value = '연차 사용';
        proxyRequestedDates = new Set();
        proxySelectedStart = null;
        proxySelectedEnd = null;
        proxyCalRange.textContent = '날짜 미선택';
        proxyCalHint.textContent = '먼저 사용자를 선택해주세요';
    }

    function renderProxyUserDropdown() {
        const keyword = proxyUserSearchInput.value.trim();
        const filtered = allActiveUsers.filter(u => {
            if (!keyword) return true;
            return searchUtils.matchesSearch(u.empName || '', keyword)
                || searchUtils.matchesSearch(u.empDeptName || '', keyword)
                || searchUtils.matchesSearch(u.empId || '', keyword);
        }).slice(0, 30);

        if (filtered.length === 0) {
            proxyUserDropdown.innerHTML = '<div class="proxy-user-empty">검색 결과 없음</div>';
        } else {
            proxyUserDropdown.innerHTML = filtered.map(u => {
                const nameDisplay = keyword
                    ? searchUtils.highlightText(u.empName || '', keyword, 'highlight-text')
                    : (u.empName || '');
                const deptDisplay = u.empDeptName || u.empDept || '-';
                const posDisplay = u.empPositionName || u.empPosition || '';
                return `
                    <div class="proxy-user-item" data-user-idx="${u.idx}" data-user-name="${u.empName || ''}">
                        <strong>${nameDisplay}</strong>
                        <span class="proxy-user-meta">${deptDisplay}${posDisplay ? ' · ' + posDisplay : ''}</span>
                    </div>
                `;
            }).join('');

            // 클릭 핸들러
            proxyUserDropdown.querySelectorAll('.proxy-user-item').forEach(item => {
                item.addEventListener('click', () => {
                    selectProxyUser(parseInt(item.dataset.userIdx, 10), item.dataset.userName);
                });
            });
        }
        proxyUserDropdown.style.display = 'block';
    }

    async function selectProxyUser(userIdx, userName) {
        proxySelectedUserIdx = userIdx;
        proxySelectedUserName = userName;
        proxySelectedUserText.textContent = userName;
        proxySelectedUser.style.display = 'flex';
        proxyUserSearchInput.style.display = 'none';
        proxyUserDropdown.style.display = 'none';

        // 선택된 사용자의 기존 신청 날짜 로드
        proxyCalHint.textContent = '신청 내역 로드 중...';
        proxyRequestedDates = new Set();
        proxySelectedStart = null;
        proxySelectedEnd = null;
        try {
            const res = await fetch(`/api/vacation/requested-dates?userIdx=${userIdx}&year=${proxyCalYear}`);
            if (res.ok) {
                const dates = await res.json();
                dates.forEach(d => proxyRequestedDates.add(d));
            }
        } catch (err) {
            console.error('신청 날짜 로드 실패:', err);
        }
        proxyCalHint.textContent = `${userName}님의 신청 내역 표시 중`;
        proxyCalRange.textContent = '날짜 미선택';
        proxyDaysDisplay.textContent = '0';
        renderProxyCalendar();
    }

    function clearProxySelectedUser() {
        proxySelectedUserIdx = null;
        proxySelectedUserName = '';
        proxySelectedUser.style.display = 'none';
        proxyUserSearchInput.style.display = '';
        proxyUserSearchInput.value = '';
        proxyRequestedDates = new Set();
        proxySelectedStart = null;
        proxySelectedEnd = null;
        proxyCalHint.textContent = '먼저 사용자를 선택해주세요';
        proxyCalRange.textContent = '날짜 미선택';
        proxyDaysDisplay.textContent = '0';
        renderProxyCalendar();
        proxyUserSearchInput.focus();
    }

    function onProxyTypeChange() {
        // 유형 변경 시 선택 초기화
        proxySelectedStart = null;
        proxySelectedEnd = null;
        proxyCalRange.textContent = '날짜 미선택';
        proxyDaysDisplay.textContent = '0';
        renderProxyCalendar();
    }

    // ============================================================
    // 커스텀 캘린더
    // ============================================================
    async function ensureProxyHolidaysLoaded(year) {
        if (proxyHolidaysLoaded.has(year)) return;
        try {
            const res = await fetch(`/api/holidays?year=${year}`);
            if (res.ok) {
                const data = await res.json();
                Object.assign(proxyHolidays, data);
            }
        } catch (err) {
            console.warn(`${year}년 공휴일 로드 실패:`, err);
        }
        proxyHolidaysLoaded.add(year);
    }

    async function navigateProxyCalendar(delta) {
        proxyCalMonth += delta;
        if (proxyCalMonth < 0) {
            proxyCalMonth = 11;
            proxyCalYear--;
        } else if (proxyCalMonth > 11) {
            proxyCalMonth = 0;
            proxyCalYear++;
        }
        await ensureProxyHolidaysLoaded(proxyCalYear);

        // 다른 연도로 이동했고 사용자가 선택돼 있으면 신청 내역 재로드
        if (proxySelectedUserIdx) {
            try {
                const res = await fetch(`/api/vacation/requested-dates?userIdx=${proxySelectedUserIdx}&year=${proxyCalYear}`);
                if (res.ok) {
                    const dates = await res.json();
                    // 기존 다른 연도 데이터 유지하며 병합 (Set이라 중복 자동 제거)
                    dates.forEach(d => proxyRequestedDates.add(d));
                }
            } catch (err) {
                console.error('신청 날짜 로드 실패:', err);
            }
        }
        renderProxyCalendar();
    }

    function pad2(n) { return String(n).padStart(2, '0'); }
    function fmtDate(y, m, d) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }

    function renderProxyCalendar() {
        proxyCalTitle.textContent = `${proxyCalYear}년 ${proxyCalMonth + 1}월`;

        const firstDay = new Date(proxyCalYear, proxyCalMonth, 1);
        const lastDay = new Date(proxyCalYear, proxyCalMonth + 1, 0);
        const startWeekday = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        const todayStr = (() => {
            const t = new Date();
            return fmtDate(t.getFullYear(), t.getMonth(), t.getDate());
        })();
        const isHalf = proxyVacationType.value.includes('반차');

        let html = '';

        // 이전달 빈칸
        for (let i = 0; i < startWeekday; i++) {
            html += '<div class="proxy-cal-cell empty"></div>';
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = fmtDate(proxyCalYear, proxyCalMonth, d);
            const date = new Date(proxyCalYear, proxyCalMonth, d);
            const dow = date.getDay();
            const isWeekend = dow === 0 || dow === 6;
            const isHoliday = !!proxyHolidays[dateStr];
            const isRequested = proxyRequestedDates.has(dateStr);
            const isToday = dateStr === todayStr;
            const isStart = proxySelectedStart === dateStr;
            const isEnd = proxySelectedEnd === dateStr;
            const isInRange = proxySelectedStart && proxySelectedEnd
                && dateStr > proxySelectedStart && dateStr < proxySelectedEnd;

            const disabled = !proxySelectedUserIdx || isWeekend || isHoliday || isRequested;

            const classes = ['proxy-cal-cell'];
            if (dow === 0) classes.push('sun');
            if (dow === 6) classes.push('sat');
            if (isHoliday) classes.push('holiday');
            if (isRequested) classes.push('requested');
            if (isToday) classes.push('today');
            if (isStart) classes.push('selected', 'range-start');
            if (isEnd) classes.push('selected', 'range-end');
            if (isInRange) classes.push('in-range');
            if (disabled) classes.push('disabled');

            const tip = isHoliday ? proxyHolidays[dateStr] : (isRequested ? '이미 신청됨' : '');
            const tipAttr = tip ? ` data-tip="${tip}"` : '';

            html += `<div class="${classes.join(' ')}" data-date="${dateStr}"${tipAttr}>${d}</div>`;
        }

        proxyCalGrid.innerHTML = html;

        // 클릭 핸들러 (disabled 제외)
        proxyCalGrid.querySelectorAll('.proxy-cal-cell:not(.empty):not(.disabled)').forEach(cell => {
            cell.addEventListener('click', () => onProxyCellClick(cell.dataset.date, isHalf));
        });
    }

    function onProxyCellClick(dateStr, isHalf) {
        if (isHalf) {
            // 반차: 한 날짜만 선택, start=end
            proxySelectedStart = dateStr;
            proxySelectedEnd = dateStr;
            updateProxySelectionDisplay(true);
            renderProxyCalendar();
            return;
        }

        // 연차: start → end → reset
        if (!proxySelectedStart || (proxySelectedStart && proxySelectedEnd)) {
            // 새 시작
            proxySelectedStart = dateStr;
            proxySelectedEnd = null;
        } else {
            // end 선택
            if (dateStr < proxySelectedStart) {
                // 더 이른 날짜를 누른 경우 → 시작으로 변경
                proxySelectedStart = dateStr;
                proxySelectedEnd = null;
            } else {
                // 범위 내 이미 신청된 날짜 검사
                const conflict = checkRangeConflict(proxySelectedStart, dateStr);
                if (conflict) {
                    Swal.fire({
                        icon: 'warning',
                        title: '선택 불가',
                        text: `선택 범위에 이미 신청된 날짜(${conflict})가 포함되어 있습니다.`
                    });
                    return;
                }
                proxySelectedEnd = dateStr;
            }
        }
        updateProxySelectionDisplay(false);
        renderProxyCalendar();
    }

    function checkRangeConflict(startStr, endStr) {
        const start = new Date(startStr);
        const end = new Date(endStr);
        const cur = new Date(start);
        while (cur <= end) {
            const ds = fmtDate(cur.getFullYear(), cur.getMonth(), cur.getDate());
            if (proxyRequestedDates.has(ds)) return ds;
            cur.setDate(cur.getDate() + 1);
        }
        return null;
    }

    function updateProxySelectionDisplay(isHalf) {
        if (isHalf) {
            proxyCalRange.textContent = `${proxySelectedStart} (${proxyVacationType.value})`;
            proxyDaysDisplay.textContent = '0.5';
            return;
        }
        if (proxySelectedStart && !proxySelectedEnd) {
            proxyCalRange.textContent = `${proxySelectedStart} ~ (종료일 선택)`;
            proxyDaysDisplay.textContent = '0';
            return;
        }
        if (proxySelectedStart && proxySelectedEnd) {
            // 평일 수 계산 (주말/공휴일 제외)
            let days = 0;
            const cur = new Date(proxySelectedStart);
            const end = new Date(proxySelectedEnd);
            while (cur <= end) {
                const dow = cur.getDay();
                const ds = fmtDate(cur.getFullYear(), cur.getMonth(), cur.getDate());
                if (dow !== 0 && dow !== 6 && !proxyHolidays[ds]) days++;
                cur.setDate(cur.getDate() + 1);
            }
            proxyCalRange.textContent = `${proxySelectedStart} ~ ${proxySelectedEnd}`;
            proxyDaysDisplay.textContent = String(days);
        } else {
            proxyCalRange.textContent = '날짜 미선택';
            proxyDaysDisplay.textContent = '0';
        }
    }

    async function submitProxyRequest() {
        // 입력 검증
        if (!proxySelectedUserIdx) {
            Swal.fire({ icon: 'warning', title: '대상 사용자 미선택', text: '연차를 등록할 사용자를 선택해주세요.' });
            return;
        }
        if (!proxySelectedStart || !proxySelectedEnd) {
            Swal.fire({ icon: 'warning', title: '날짜 미선택', text: '캘린더에서 날짜를 선택해주세요.' });
            return;
        }
        const days = parseFloat(proxyDaysDisplay.textContent);
        if (!days || days <= 0) {
            Swal.fire({ icon: 'warning', title: '일수 오류', text: '선택된 일수가 0입니다. 평일을 포함해주세요.' });
            return;
        }
        const reasonValue = proxyReason.value.trim();
        if (!reasonValue) {
            Swal.fire({ icon: 'warning', title: '사유 미입력', text: '사유는 필수입니다. 입력해주세요.' });
            proxyReason.focus();
            return;
        }

        const confirmed = await Swal.fire({
            title: '관리자 권한 연차 등록 확인',
            html: `<strong>${proxySelectedUserName}</strong>님의 연차를 등록합니다.<br>` +
                  `<div style="margin: 10px 0; font-size: 14px; color: #475569;">` +
                  `${proxySelectedStart}${proxySelectedStart !== proxySelectedEnd ? ' ~ ' + proxySelectedEnd : ''} (<strong>${days}일</strong>)` +
                  `</div>` +
                  `<small style="color: #94a3b8;">등록 즉시 자동 승인 + 캘린더 일정이 생성됩니다.</small>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '등록',
            cancelButtonText: '취소'
        });
        if (!confirmed.isConfirmed) return;

        const payload = {
            targetUserIdx: proxySelectedUserIdx,
            vacationType: proxyVacationType.value,
            startDate: proxySelectedStart,
            endDate: proxySelectedEnd,
            days: days,
            reason: reasonValue
        };

        // PDF 생성에 시간이 걸릴 수 있으므로 진행 표시
        Swal.fire({
            title: '관리자 권한 연차 등록 처리 중',
            html: '<div style="margin-top: 10px; font-size: 13px; color: #64748b;">' +
                  '연차 신청서 저장 → PDF 생성 → 자동 승인 → 캘린더 등록<br>' +
                  '<strong style="color: #10b981;">잠시만 기다려주세요. 오류가 아닙니다.</strong></div>',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            proxySubmitBtn.disabled = true;
            const res = await fetch('/api/vacation/admin/proxy-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || '관리자 권한 연차 등록 실패');
            }

            await Swal.fire({
                icon: 'success',
                title: '관리자 권한 연차 등록 완료',
                text: data.message || '등록되었습니다.',
                timer: 2000,
                showConfirmButton: false
            });
            closeProxyModal();
            loadDocuments();
        } catch (err) {
            console.error('관리자 권한 연차 등록 오류:', err);
            Swal.fire({ icon: 'error', title: '관리자 권한 연차 등록 실패', text: err.message });
        } finally {
            proxySubmitBtn.disabled = false;
        }
    }
});
