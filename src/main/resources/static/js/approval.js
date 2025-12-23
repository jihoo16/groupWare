// 전자결재 메인 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소
    const sidebarMenuItems = document.querySelectorAll('.approval-sidebar .menu-item');
    const documentList = document.getElementById('documentList');
    const emptyState = document.getElementById('emptyState');
    const contentTitle = document.querySelector('.content-title');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const viewBtns = document.querySelectorAll('.view-btn');

    let currentCategory = 'all';
    let weeklyReports = []; // 주간보고서 데이터
    let monthlyReports = []; // 월간보고서 데이터
    let meetingMinutes = []; // 회의록 데이터
    let receiptMeetings = []; // 연구비증빙 회의록 데이터
    let receiptTrips = []; // 연구비증빙 출장 데이터

    // 페이징 관련 변수
    let currentPage = 1;
    const itemsPerPage = 10;
    let filteredRows = []; // 필터링된 행들

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
            'report': '주간/월간 보고',
            'vacation': '휴가 신청',
            'expense': '지출 결의',
            'purchase': '구매 요청',
            'meeting': '회의록',
            'general': '일반 기안',
            'receipt': '연구비증빙'
        };

        contentTitle.textContent = titles[category] || '문서 목록';
    }

    // 문서 필터링
    function filterDocuments() {
        const docRows = documentList.querySelectorAll('.doc-row');
        filteredRows = [];

        docRows.forEach(row => {
            const category = row.getAttribute('data-category');

            let show = true;

            // 문서함 필터
            if (currentCategory && currentCategory !== 'all') {
                show = category === currentCategory;
            }

            // 검색 필터
            if (searchInput.value.trim()) {
                const searchTerm = searchInput.value.toLowerCase();
                const titleCell = row.querySelector('.doc-title-cell');
                const title = titleCell ? titleCell.querySelector('.title-wrap').textContent.toLowerCase() : '';
                const desc = titleCell ? titleCell.querySelector('.desc-wrap').textContent.toLowerCase() : '';
                const allText = row.textContent.toLowerCase();

                show = show && (title.includes(searchTerm) || desc.includes(searchTerm) || allText.includes(searchTerm));
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
        const pagination = document.querySelector('.pagination');
        if (!pagination) return;

        const totalPages = Math.ceil(filteredRows.length / itemsPerPage);

        // 페이지네이션 초기화
        pagination.innerHTML = '';

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
        pagination.appendChild(prevBtn);

        // 페이지 번호 버튼
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        // 시작 페이지 조정
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // 첫 페이지와 ... 추가
        if (startPage > 1) {
            const firstPageBtn = document.createElement('button');
            firstPageBtn.className = 'page-btn';
            firstPageBtn.textContent = '1';
            firstPageBtn.addEventListener('click', () => {
                currentPage = 1;
                applyPagination();
            });
            pagination.appendChild(firstPageBtn);

            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.style.padding = '0 8px';
                dots.style.color = '#999';
                pagination.appendChild(dots);
            }
        }

        // 페이지 번호
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'page-btn';
            if (i === currentPage) {
                pageBtn.classList.add('active');
            }
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                applyPagination();
            });
            pagination.appendChild(pageBtn);
        }

        // 마지막 페이지와 ... 추가
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                dots.style.padding = '0 8px';
                dots.style.color = '#999';
                pagination.appendChild(dots);
            }

            const lastPageBtn = document.createElement('button');
            lastPageBtn.className = 'page-btn';
            lastPageBtn.textContent = totalPages;
            lastPageBtn.addEventListener('click', () => {
                currentPage = totalPages;
                applyPagination();
            });
            pagination.appendChild(lastPageBtn);
        }

        // 다음 버튼
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                applyPagination();
            }
        });
        pagination.appendChild(nextBtn);
    }

    // 검색
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            currentPage = 1; // 검색 시 첫 페이지로
            filterDocuments();
        });
    }

    // 정렬
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            const value = this.value;
            const tbody = documentList.querySelector('tbody');
            if (!tbody) return;

            const docRows = Array.from(tbody.querySelectorAll('.doc-row'));

            docRows.sort((a, b) => {
                if (value === 'date-desc' || value === 'date-asc') {
                    const dateA = a.cells[4].textContent.trim(); // 작성일시 컬럼
                    const dateB = b.cells[4].textContent.trim();
                    return value === 'date-desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
                } else if (value === 'title') {
                    const titleA = a.querySelector('.title-wrap').textContent.trim();
                    const titleB = b.querySelector('.title-wrap').textContent.trim();
                    return titleA.localeCompare(titleB);
                } else if (value === 'drafter') {
                    const drafterA = a.cells[2].textContent.trim(); // 작성자 컬럼
                    const drafterB = b.cells[2].textContent.trim();
                    return drafterA.localeCompare(drafterB);
                }
                return 0;
            });

            docRows.forEach(row => tbody.appendChild(row));

            // 정렬 후 필터링과 페이징 재적용
            currentPage = 1;
            filterDocuments();
        });
    }

    // 문서 액션 버튼들
    document.addEventListener('click', function(e) {
        const viewBtn = e.target.closest('.btn-view');

        if (viewBtn) {
            e.stopPropagation();
            const reportId = viewBtn.getAttribute('data-id');
            const docRow = viewBtn.closest('.doc-row');
            const category = docRow.getAttribute('data-category');

            if (category === 'report' && reportId) {
                // 보고서 타입에 따라 상세페이지 분기
                const docType = viewBtn.getAttribute('data-type');
                if (docType === 'weekly') {
                    window.location.href = `/approval/weekly-report/detail?id=${reportId}`;
                } else if (docType === 'monthly') {
                    window.location.href = `/approval/monthly-report/detail?id=${reportId}`;
                }
            } else if (category === 'meeting' && reportId) {
                // 회의록 상세페이지로 이동
                window.location.href = `/approval/meeting/detail?id=${reportId}`;
            } else if (category === 'receipt' && reportId) {
                // 연구비증빙 타입에 따라 상세페이지 분기
                const docType = viewBtn.getAttribute('data-type');
                if (docType === 'receipt-meeting') {
                    window.location.href = `/approval/receipt-meeting?id=${reportId}`;
                } else if (docType === 'receipt-trip') {
                    window.location.href = `/approval/receipt-trip?id=${reportId}`;
                }
            } else {
                const title = docRow.querySelector('.title-wrap').textContent;
                alert(`"${title}" 상세보기 기능은 추후 구현됩니다.`);
            }
        }
    });

    // 문서 제목 클릭 (상세보기)
    document.addEventListener('click', function(e) {
        const titleWrap = e.target.closest('.title-wrap');
        if (titleWrap) {
            const docRow = titleWrap.closest('.doc-row');
            const category = docRow.getAttribute('data-category');
            const viewBtn = docRow.querySelector('.btn-view');
            const reportId = viewBtn ? viewBtn.getAttribute('data-id') : null;

            if (category === 'report' && reportId) {
                // 보고서 타입에 따라 상세페이지 분기
                const docType = viewBtn ? viewBtn.getAttribute('data-type') : null;
                if (docType === 'weekly') {
                    window.location.href = `/approval/weekly-report/detail?id=${reportId}`;
                } else if (docType === 'monthly') {
                    window.location.href = `/approval/monthly-report/detail?id=${reportId}`;
                }
            } else if (category === 'meeting' && reportId) {
                // 회의록 상세페이지로 이동
                window.location.href = `/approval/meeting/detail?id=${reportId}`;
            } else if (category === 'receipt' && reportId) {
                // 연구비증빙 타입에 따라 상세페이지 분기
                const docType = viewBtn ? viewBtn.getAttribute('data-type') : null;
                if (docType === 'receipt-meeting') {
                    window.location.href = `/approval/receipt-meeting?id=${reportId}`;
                } else if (docType === 'receipt-trip') {
                    window.location.href = `/approval/receipt-trip?id=${reportId}`;
                }
            } else {
                const title = titleWrap.textContent;
                alert(`"${title}" 상세보기 기능은 추후 구현됩니다.`);
            }
        }
    });

    // ============================================
    // API: 주간보고서 목록 로드
    // ============================================
    async function loadWeeklyReports() {
        try {
            console.log('주간보고서 API 호출 시작: /api/document/weekly-report');
            const response = await fetch('/api/document/weekly-report');
            console.log('API 응답 상태:', response.status, response.statusText);

            if (response.ok) {
                weeklyReports = await response.json();
                console.log('주간보고서 로드 성공:', weeklyReports.length + '건');
                console.log('첫 번째 데이터:', weeklyReports[0]);
            } else {
                const errorText = await response.text();
                console.error('주간보고서 로드 실패 - 상태:', response.status);
                console.error('에러 응답:', errorText);
            }
        } catch (error) {
            console.error('주간보고서 로드 오류:', error);
            console.error('오류 상세:', error.message, error.stack);
        }
    }

    // 주간보고서와 월간보고서를 합쳐서 렌더링
    function renderWeeklyReports() {
        const tbody = documentList.querySelector('tbody');
        if (!tbody) return;

        // 기존 더미 데이터 제거
        const existingRows = tbody.querySelectorAll('.doc-row[data-category="report"]');
        existingRows.forEach(row => row.remove());

        // 주간보고서와 월간보고서를 합치고 타입 표시 추가
        const allReports = [
            ...weeklyReports.map(report => ({ ...report, reportType: 'weekly' })),
            ...monthlyReports.map(report => ({ ...report, reportType: 'monthly' }))
        ];

        // 생성일 기준 최신순 정렬
        allReports.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return dateB - dateA; // 내림차순 (최신순)
        });

        // 정렬된 보고서를 테이블에 렌더링
        allReports.forEach(report => {
            const tr = document.createElement('tr');
            tr.className = 'doc-row';
            tr.setAttribute('data-category', 'report');

            const createdDate = new Date(report.createdAt);
            const formattedDate = `${createdDate.getFullYear()}.${String(createdDate.getMonth() + 1).padStart(2, '0')}.${String(createdDate.getDate()).padStart(2, '0')} ${String(createdDate.getHours()).padStart(2, '0')}:${String(createdDate.getMinutes()).padStart(2, '0')}`;

            // 주간/월간 구분
            const isWeekly = report.reportType === 'weekly';
            const docTypeIcon = isWeekly ? 'fa-calendar-week' : 'fa-calendar-alt';
            const docTypeName = isWeekly ? '주간업무보고' : '월간업무보고';
            const descText = isWeekly ? (report.reportPeriod || '제목 없음') : (report.reportMonth || '제목 없음');

            tr.innerHTML = `
                <td>
                    <span class="doc-type">
                        <i class="fas ${docTypeIcon}"></i>
                        ${docTypeName}
                    </span>
                </td>
                <td class="doc-title-cell">
                    <div class="title-wrap">${report.projectName ? '[' + report.projectName + '] ' : ''}${truncateText(report.mainTasks, 50)}</div>
                    <div class="desc-wrap">${descText}</div>
                </td>
                <td>${report.userName || '-'}</td>
                <td>${report.userDeptName || '-'}</td>
                <td>${formattedDate}</td>
                <td>
                <div class="table-actions">
                    <button class="btn-icon btn-view" data-id="${report.id}" data-type="${report.reportType}">
                        <i class="fas fa-eye"></i>
                    </button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });

        filterDocuments();
    }

    // 텍스트 자르기 유틸리티
    function truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    // ============================================
    // API: 월간보고서 목록 로드
    // ============================================
    async function loadMonthlyReports() {
        try {
            console.log('월간보고서 API 호출 시작: /api/document/monthly-report');
            const response = await fetch('/api/document/monthly-report');
            console.log('API 응답 상태:', response.status, response.statusText);

            if (response.ok) {
                monthlyReports = await response.json();
                console.log('월간보고서 로드 성공:', monthlyReports.length + '건');
                console.log('첫 번째 데이터:', monthlyReports[0]);
            } else {
                const errorText = await response.text();
                console.error('월간보고서 로드 실패 - 상태:', response.status);
                console.error('에러 응답:', errorText);
            }
        } catch (error) {
            console.error('월간보고서 로드 오류:', error);
            console.error('오류 상세:', error.message, error.stack);
        }
    }

    // ============================================
    // API: 회의록 목록 로드
    // ============================================
    async function loadMeetingMinutes() {
        try {
            console.log('회의록 API 호출 시작: /api/document/meeting-minutes');
            const response = await fetch('/api/document/meeting-minutes');
            console.log('API 응답 상태:', response.status, response.statusText);

            if (response.ok) {
                meetingMinutes = await response.json();
                console.log('회의록 로드 성공:', meetingMinutes.length + '건');
                console.log('첫 번째 데이터:', meetingMinutes[0]);
            } else {
                const errorText = await response.text();
                console.error('회의록 로드 실패 - 상태:', response.status);
                console.error('에러 응답:', errorText);
            }
        } catch (error) {
            console.error('회의록 로드 오류:', error);
            console.error('오류 상세:', error.message, error.stack);
        }
    }

    // 회의록 렌더링
    function renderMeetingMinutes() {
        const tbody = documentList.querySelector('tbody');
        if (!tbody) return;

        // 기존 더미 데이터 제거
        const existingRows = tbody.querySelectorAll('.doc-row[data-category="meeting"]');
        existingRows.forEach(row => row.remove());

        // 생성일 기준 최신순 정렬
        meetingMinutes.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return dateB - dateA; // 내림차순 (최신순)
        });

        // 회의록을 테이블에 렌더링
        meetingMinutes.forEach(meeting => {
            const tr = document.createElement('tr');
            tr.className = 'doc-row';
            tr.setAttribute('data-category', 'meeting');

            const createdDate = new Date(meeting.createdAt);
            const formattedDate = `${createdDate.getFullYear()}.${String(createdDate.getMonth() + 1).padStart(2, '0')}.${String(createdDate.getDate()).padStart(2, '0')} ${String(createdDate.getHours()).padStart(2, '0')}:${String(createdDate.getMinutes()).padStart(2, '0')}`;

            // 회의 일시 포맷팅
            const meetingDate = new Date(meeting.meetingDatetime);
            const meetingDateStr = `${meetingDate.getFullYear()}.${String(meetingDate.getMonth() + 1).padStart(2, '0')}.${String(meetingDate.getDate()).padStart(2, '0')}`;

            // 설명 텍스트 생성
            let descText = meetingDateStr;
            if (meeting.location) {
                descText += ` | ${meeting.location}`;
            }
            if (meeting.participants) {
                const participantCount = meeting.participants.split(',').length;
                descText += ` | 참석 ${participantCount}명`;
            }

            tr.innerHTML = `
                <td>
                    <span class="doc-type">
                        <i class="fas fa-users"></i>
                        회의록
                    </span>
                </td>
                <td class="doc-title-cell">
                    <div class="title-wrap">${meeting.projectName ? '[' + meeting.projectName + '] ' : ''}${meeting.meetingTitle || '제목 없음'}</div>
                    <div class="desc-wrap">${descText}</div>
                </td>
                <td>${meeting.userName || '-'}</td>
                <td>${meeting.userDeptName || '-'}</td>
                <td>${formattedDate}</td>
                <td>
                <div class="table-actions">
                    <button class="btn-icon btn-view" data-id="${meeting.idx}" data-type="meeting">
                        <i class="fas fa-eye"></i>
                    </button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });

        filterDocuments();
    }

    // ============================================
    // API: 연구비증빙 회의록 목록 로드
    // ============================================
    async function loadReceiptMeetings() {
        try {
            console.log('연구비증빙 회의록 API 호출 시작: /api/receipt-meetings');
            const response = await fetch('/api/receipt-meetings');
            console.log('API 응답 상태:', response.status, response.statusText);

            if (response.ok) {
                receiptMeetings = await response.json();
                console.log('연구비증빙 회의록 로드 성공:', receiptMeetings.length + '건');
                console.log('첫 번째 데이터:', receiptMeetings[0]);
            } else {
                const errorText = await response.text();
                console.error('연구비증빙 회의록 로드 실패 - 상태:', response.status);
                console.error('에러 응답:', errorText);
            }
        } catch (error) {
            console.error('연구비증빙 회의록 로드 오류:', error);
            console.error('오류 상세:', error.message, error.stack);
        }
    }

    // ============================================
    // API: 연구비증빙 출장 목록 로드
    // ============================================
    async function loadReceiptTrips() {
        try {
            console.log('연구비증빙 출장 API 호출 시작: /api/receipt-trips');
            const response = await fetch('/api/receipt-trips');
            console.log('API 응답 상태:', response.status, response.statusText);

            if (response.ok) {
                receiptTrips = await response.json();
                console.log('연구비증빙 출장 로드 성공:', receiptTrips.length + '건');
                console.log('첫 번째 데이터:', receiptTrips[0]);
            } else {
                const errorText = await response.text();
                console.error('연구비증빙 출장 로드 실패 - 상태:', response.status);
                console.error('에러 응답:', errorText);
            }
        } catch (error) {
            console.error('연구비증빙 출장 로드 오류:', error);
            console.error('오류 상세:', error.message, error.stack);
        }
    }

    // 모든 문서를 합쳐서 렌더링 (주간/월간/회의록/연구비증빙)
    function renderAllDocuments() {
        const tbody = documentList.querySelector('tbody');
        if (!tbody) return;

        // 기존 문서 행 제거
        const existingRows = tbody.querySelectorAll('.doc-row[data-category="report"], .doc-row[data-category="meeting"], .doc-row[data-category="receipt"]');
        existingRows.forEach(row => row.remove());

        // 모든 문서를 하나의 배열로 합치기
        const allDocuments = [
            ...weeklyReports.map(report => ({ ...report, docType: 'weekly', category: 'report' })),
            ...monthlyReports.map(report => ({ ...report, docType: 'monthly', category: 'report' })),
            ...meetingMinutes.map(meeting => ({ ...meeting, docType: 'meeting', category: 'meeting' })),
            ...receiptMeetings.map(receipt => ({ ...receipt, docType: 'receipt-meeting', category: 'receipt' })),
            ...receiptTrips.map(trip => ({ ...trip, docType: 'receipt-trip', category: 'receipt' }))
        ];

        // 생성일 기준 최신순 정렬
        allDocuments.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return dateB - dateA; // 내림차순 (최신순)
        });

        // 정렬된 문서를 테이블에 렌더링
        allDocuments.forEach(doc => {
            const tr = document.createElement('tr');
            tr.className = 'doc-row';
            tr.setAttribute('data-category', doc.category);

            const createdDate = new Date(doc.createdAt);
            const formattedDate = `${createdDate.getFullYear()}.${String(createdDate.getMonth() + 1).padStart(2, '0')}.${String(createdDate.getDate()).padStart(2, '0')} ${String(createdDate.getHours()).padStart(2, '0')}:${String(createdDate.getMinutes()).padStart(2, '0')}`;

            if (doc.docType === 'weekly' || doc.docType === 'monthly') {
                // 주간/월간 보고서
                const isWeekly = doc.docType === 'weekly';
                const docTypeIcon = isWeekly ? 'fa-calendar-week' : 'fa-calendar-alt';
                const docTypeName = isWeekly ? '주간업무보고' : '월간업무보고';
                const descText = isWeekly ? (doc.reportPeriod || '제목 없음') : (doc.reportMonth || '제목 없음');

                tr.innerHTML = `
                    <td>
                        <span class="doc-type">
                            <i class="fas ${docTypeIcon}"></i>
                            ${docTypeName}
                        </span>
                    </td>
                    <td class="doc-title-cell">
                        <div class="title-wrap">${doc.projectName ? '[' + doc.projectName + '] ' : ''}${truncateText(doc.mainTasks, 50)}</div>
                        <div class="desc-wrap">${descText}</div>
                    </td>
                    <td>${doc.userName || '-'}</td>
                    <td>${doc.userDeptName || '-'}</td>
                    <td>${formattedDate}</td>
                    <td>
                    <div class="table-actions">
                        <button class="btn-icon btn-view" data-id="${doc.id}" data-type="${doc.docType}">
                            <i class="fas fa-eye"></i>
                        </button>
                        </div>
                    </td>
                `;
            } else if (doc.docType === 'meeting') {
                // 회의록
                const meetingDate = new Date(doc.meetingDatetime);
                const meetingDateStr = `${meetingDate.getFullYear()}.${String(meetingDate.getMonth() + 1).padStart(2, '0')}.${String(meetingDate.getDate()).padStart(2, '0')}`;

                let descText = meetingDateStr;
                if (doc.location) {
                    descText += ` | ${doc.location}`;
                }
                if (doc.participants) {
                    const participantCount = doc.participants.split(',').length;
                    descText += ` | 참석 ${participantCount}명`;
                }

                tr.innerHTML = `
                    <td>
                        <span class="doc-type">
                            <i class="fas fa-users"></i>
                            회의록
                        </span>
                    </td>
                    <td class="doc-title-cell">
                        <div class="title-wrap">${doc.projectName ? '[' + doc.projectName + '] ' : ''}${doc.meetingTitle || '제목 없음'}</div>
                        <div class="desc-wrap">${descText}</div>
                    </td>
                    <td>${doc.userName || '-'}</td>
                    <td>${doc.userDeptName || '-'}</td>
                    <td>${formattedDate}</td>
                    <td>
                    <div class="table-actions">
                        <button class="btn-icon btn-view" data-id="${doc.idx}">
                            <i class="fas fa-eye"></i>
                        </button>
                        </div>
                    </td>
                `;
            } else if (doc.docType === 'receipt-meeting') {
                // 연구비증빙 회의록
                const meetingDate = new Date(doc.meetingDate);
                const meetingDateStr = `${meetingDate.getFullYear()}.${String(meetingDate.getMonth() + 1).padStart(2, '0')}.${String(meetingDate.getDate()).padStart(2, '0')}`;

                let descText = meetingDateStr;
                if (doc.location) {
                    descText += ` | ${doc.location}`;
                }
                if (doc.amount) {
                    const formattedAmount = Number(doc.amount).toLocaleString('ko-KR');
                    descText += ` | ${formattedAmount}원`;
                }

                tr.innerHTML = `
                    <td>
                        <span class="doc-type">
                            <i class="fas fa-receipt"></i>
                            연구비증빙 - 회의록
                        </span>
                    </td>
                    <td class="doc-title-cell">
                        <div class="title-wrap">${doc.projectName ? '[' + doc.projectName + '] ' : ''}${doc.purpose || '회의록'}</div>
                        <div class="desc-wrap">${descText}</div>
                    </td>
                    <td>${doc.authorName || '-'}</td>
                    <td>${doc.authorDeptName || '-'}</td>
                    <td>${formattedDate}</td>
                    <td>
                    <div class="table-actions">
                        <button class="btn-icon btn-view" data-id="${doc.idx}" data-type="receipt-meeting">
                            <i class="fas fa-eye"></i>
                        </button>
                        </div>
                    </td>
                `;
            } else if (doc.docType === 'receipt-trip') {
                // 연구비증빙 출장
                const tripDate = new Date(doc.tripDate);
                const tripDateStr = `${tripDate.getFullYear()}.${String(tripDate.getMonth() + 1).padStart(2, '0')}.${String(tripDate.getDate()).padStart(2, '0')}`;

                let descText = tripDateStr;
                if (doc.location) {
                    descText += ` | ${doc.location}`;
                }
                const sumAmount = doc.accommodationFee + doc.mealFee + doc.otherFee + doc.transportationFee;
                if (sumAmount !== 0) {
                    const formattedAmount = Number(sumAmount).toLocaleString('ko-KR');
                    descText += ` | ${formattedAmount}원`;
                }

                tr.innerHTML = `
                    <td>
                        <span class="doc-type">
                            <i class="fas fa-plane"></i>
                            연구비증빙 - 출장
                        </span>
                    </td>
                    <td class="doc-title-cell">
                        <div class="title-wrap">${doc.projectName ? '[' + doc.projectName + '] ' : ''}${doc.purpose || doc.location || '출장'}</div>
                        <div class="desc-wrap">${descText}</div>
                    </td>
                    <td>${doc.authorName || '-'}</td>
                    <td>${doc.authorDeptName || '-'}</td>
                    <td>${formattedDate}</td>
                    <td>
                    <div class="table-actions">
                        <button class="btn-icon btn-view" data-id="${doc.idx}" data-type="receipt-trip">
                            <i class="fas fa-eye"></i>
                        </button>
                        </div>
                    </td>
                `;
            }

            tbody.appendChild(tr);
        });

        filterDocuments();
    }

    // 페이지 로드 시 주간/월간보고서, 회의록, 연구비증빙 목록 가져오기
    async function loadAllReports() {
        await Promise.all([
            loadWeeklyReports(),
            loadMonthlyReports(),
            loadMeetingMinutes(),
            loadReceiptMeetings(),
            loadReceiptTrips()
        ]);
        renderAllDocuments(); // 모든 문서를 합쳐서 렌더링
    }

    loadAllReports();

    // 초기 필터링
    filterDocuments();
});
