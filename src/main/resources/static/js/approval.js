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
            'general': '일반 기안'
        };

        contentTitle.textContent = titles[category] || '문서 목록';
    }

    // 문서 필터링
    function filterDocuments() {
        const docRows = documentList.querySelectorAll('.doc-row');
        let visibleCount = 0;

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
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        // 빈 상태 표시
        const table = documentList.querySelector('.document-table');
        if (visibleCount === 0) {
            if (table) table.style.display = 'none';
            emptyState.style.display = 'flex';
        } else {
            if (table) table.style.display = 'table';
            emptyState.style.display = 'none';
        }
    }

    // 검색
    if (searchInput) {
        searchInput.addEventListener('input', filterDocuments);
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
                // 주간보고서 상세페이지로 이동
                window.location.href = `/approval/weekly-report/detail?id=${reportId}`;
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
                // 주간보고서 상세페이지로 이동
                window.location.href = `/approval/weekly-report/detail?id=${reportId}`;
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
                renderWeeklyReports();
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

    // 주간보고서 렌더링
    function renderWeeklyReports() {
        const tbody = documentList.querySelector('tbody');
        if (!tbody) return;

        // 기존 더미 데이터 제거
        const existingRows = tbody.querySelectorAll('.doc-row[data-category="report"]');
        existingRows.forEach(row => row.remove());

        // 주간보고서 데이터로 테이블 행 생성
        weeklyReports.forEach(report => {
            const tr = document.createElement('tr');
            tr.className = 'doc-row';
            tr.setAttribute('data-category', 'report');

            const createdDate = new Date(report.createdAt);
            const formattedDate = `${createdDate.getFullYear()}.${String(createdDate.getMonth() + 1).padStart(2, '0')}.${String(createdDate.getDate()).padStart(2, '0')} ${String(createdDate.getHours()).padStart(2, '0')}:${String(createdDate.getMinutes()).padStart(2, '0')}`;

            tr.innerHTML = `
                <td>
                    <span class="doc-type">
                        <i class="fas fa-calendar-week"></i>
                        주간업무보고
                    </span>
                </td>
                <td class="doc-title-cell">
                    <div class="title-wrap">${report.projectName ? '[' + report.projectName + '] ' : ''}${truncateText(report.mainTasks, 50)}</div>
                    <div class="desc-wrap">${report.reportPeriod || '제목 없음'}</div>
                </td>
                <td>홍길동</td>
                <td>개발팀</td>
                <td>${formattedDate}</td>
                <td>
                    <button class="btn-view" data-id="${report.id}">
                        <i class="fas fa-eye"></i>
                    </button>
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

    // 페이지 로드 시 주간보고서 목록 가져오기
    loadWeeklyReports();

    // 초기 필터링
    filterDocuments();
});
