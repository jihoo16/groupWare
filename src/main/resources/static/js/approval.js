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

    let currentBox = 'pending';
    let currentCategory = 'all';

    // 사이드바 메뉴 클릭
    sidebarMenuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();

            // 활성화 상태 변경
            sidebarMenuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            // 결재함 또는 문서함 선택
            const box = this.getAttribute('data-box');
            const category = this.getAttribute('data-category');

            if (box) {
                currentBox = box;
                currentCategory = 'all';
                updateContentTitle(box);
            } else if (category) {
                currentCategory = category;
                currentBox = null;
                updateContentTitle(null, category);
            }

            filterDocuments();
        });
    });

    // 제목 업데이트
    function updateContentTitle(box, category) {
        const titles = {
            'pending': '결재 대기',
            'in-progress': '결재 진행중',
            'approved': '결재 완료',
            'rejected': '반려',
            'reference': '참조/수신',
            'all': '전체 문서',
            'report': '주간/월간 보고',
            'vacation': '휴가 신청',
            'expense': '지출 결의',
            'purchase': '구매 요청',
            'meeting': '회의록',
            'general': '일반 기안'
        };

        contentTitle.textContent = titles[box || category] || '문서 목록';
    }

    // 문서 필터링
    function filterDocuments() {
        const docRows = documentList.querySelectorAll('.doc-row');
        let visibleCount = 0;

        docRows.forEach(row => {
            const status = row.getAttribute('data-status');
            const category = row.getAttribute('data-category');

            let show = true;

            // 결재함 필터
            if (currentBox) {
                show = status === currentBox;
            }

            // 문서함 필터
            if (currentCategory && currentCategory !== 'all') {
                show = show && category === currentCategory;
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
    searchInput.addEventListener('input', filterDocuments);

    // 정렬
    sortSelect.addEventListener('change', function() {
        const value = this.value;
        const tbody = documentList.querySelector('tbody');
        if (!tbody) return;

        const docRows = Array.from(tbody.querySelectorAll('.doc-row'));

        docRows.sort((a, b) => {
            if (value === 'date-desc' || value === 'date-asc') {
                const dateA = a.cells[7].textContent.trim(); // 기안일시 컬럼
                const dateB = b.cells[7].textContent.trim();
                return value === 'date-desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
            } else if (value === 'title') {
                const titleA = a.querySelector('.title-wrap').textContent.trim();
                const titleB = b.querySelector('.title-wrap').textContent.trim();
                return titleA.localeCompare(titleB);
            } else if (value === 'drafter') {
                const drafterA = a.cells[4].textContent.trim(); // 기안자 컬럼
                const drafterB = b.cells[4].textContent.trim();
                return drafterA.localeCompare(drafterB);
            }
            return 0;
        });

        docRows.forEach(row => tbody.appendChild(row));
    });

    // 문서 액션 버튼들
    document.addEventListener('click', function(e) {
        const approveBtn = e.target.closest('.btn-approve');
        const rejectBtn = e.target.closest('.btn-reject');
        const viewBtn = e.target.closest('.btn-view');

        if (approveBtn) {
            e.stopPropagation();
            const docRow = approveBtn.closest('.doc-row');
            const title = docRow.querySelector('.title-wrap').textContent;

            if (confirm(`"${title}" 문서를 승인하시겠습니까?`)) {
                alert('승인되었습니다.');
                // 실제로는 API 호출
            }
        }

        if (rejectBtn) {
            e.stopPropagation();
            const docRow = rejectBtn.closest('.doc-row');
            const title = docRow.querySelector('.title-wrap').textContent;

            const reason = prompt(`"${title}" 문서를 반려하시겠습니까?\n반려 사유를 입력해주세요:`);
            if (reason) {
                alert('반려되었습니다.');
                // 실제로는 API 호출
            }
        }

        if (viewBtn) {
            e.stopPropagation();
            const docRow = viewBtn.closest('.doc-row');
            const title = docRow.querySelector('.title-wrap').textContent;
            alert(`"${title}" 상세보기 기능은 추후 구현됩니다.`);
            // 실제로는 상세 모달 표시
        }
    });

    // 문서 제목 클릭 (상세보기)
    document.addEventListener('click', function(e) {
        const titleWrap = e.target.closest('.title-wrap');
        if (titleWrap) {
            const title = titleWrap.textContent;
            alert(`"${title}" 상세보기 기능은 추후 구현됩니다.`);
        }
    });

    // 초기 필터링
    filterDocuments();
});
