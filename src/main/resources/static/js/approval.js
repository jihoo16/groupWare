// 전자 문서 메인 페이지 JavaScript
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
    const sortSelect = document.getElementById('sortSelect');
    const viewBtns = document.querySelectorAll('.view-btn');

    let currentCategory = 'all';
    let allDocuments = []; // 전체 문서 데이터 (원본)
    let weeklyReports = []; // 주간보고서 데이터
    let monthlyReports = []; // 월간보고서 데이터
    let meetingMinutes = []; // 회의록 데이터
    let vacationRequests = []; // 연차신청서 데이터

    // 페이징 관련 변수
    let currentPage = 1;
    const itemsPerPage = 10;
    let filteredRows = []; // 필터링된 행들

    // 사이드바 메뉴 클릭
    sidebarMenuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();

            // 문서함 선택
            const category = this.getAttribute('data-category');

            // 미구현 기능 알림
            const notImplementedCategories = ['weekly-report', 'monthly-report', 'purchase', 'meeting', 'general'];
            if (notImplementedCategories.includes(category)) {
                Swal.fire({
                    icon: 'info',
                    title: '추후 구현 예정',
                    text: '해당 기능은 현재 개발 중입니다.',
                    confirmButtonText: '확인'
                });
                return;
            }

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
            'weekly-report': '주간 보고',
            'monthly-report': '월간 보고',
            'vacation': '휴가 신청',
            'expense': '지출승인서',
            'requisition': '지출품의서',
            'purchase': '구매 요청',
            'meeting': '회의록',
            'general': '일반 기안'
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

    // 문서 필터링
    function filterDocuments() {
        const searchKeyword = searchInput.value.trim();
        const docRows = documentList.querySelectorAll('.doc-row');
        filteredRows = [];

        docRows.forEach(row => {
            const category = row.getAttribute('data-category');

            let show = true;

            // 문서함 필터
            if (currentCategory && currentCategory !== 'all') {
                show = category === currentCategory;
            }

            // 검색 필터 (초성 검색 지원)
            if (searchKeyword) {
                const titleCell = row.querySelector('.doc-title-cell');
                const title = titleCell ? titleCell.querySelector('.title-wrap').textContent : '';
                const desc = titleCell ? titleCell.querySelector('.desc-wrap').textContent : '';
                const drafterName = row.querySelector('td:nth-child(3)')?.textContent || '';
                const deptName = row.querySelector('td:nth-child(4)')?.textContent || '';

                show = show && searchUtils.matchesAny(
                    searchKeyword,
                    title,
                    desc,
                    drafterName,
                    deptName
                );
            }

            if (show) {
                filteredRows.push(row);

                // 하이라이트 적용
                if (searchKeyword) {
                    const titleCell = row.querySelector('.doc-title-cell');
                    if (titleCell) {
                        const titleWrap = titleCell.querySelector('.title-wrap');
                        const descWrap = titleCell.querySelector('.desc-wrap');

                        if (titleWrap) {
                            const originalTitle = titleWrap.textContent;
                            titleWrap.innerHTML = searchUtils.highlightText(originalTitle, searchKeyword);
                        }
                        if (descWrap) {
                            const originalDesc = descWrap.textContent;
                            descWrap.innerHTML = searchUtils.highlightText(originalDesc, searchKeyword);
                        }
                    }

                    // 작성자, 부서명 하이라이트
                    const drafterCell = row.querySelector('td:nth-child(3)');
                    const deptCell = row.querySelector('td:nth-child(4)');

                    if (drafterCell) {
                        const originalDrafter = drafterCell.textContent;
                        drafterCell.innerHTML = searchUtils.highlightText(originalDrafter, searchKeyword);
                    }
                    if (deptCell) {
                        const originalDept = deptCell.textContent;
                        deptCell.innerHTML = searchUtils.highlightText(originalDept, searchKeyword);
                    }
                }
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
        const pagination = document.querySelector('.pagination');
        if (!pagination) return;

        const totalPages = Math.ceil(filteredRows.length / itemsPerPage);

        // 페이지가 1페이지 이하면 페이지네이션 숨김
        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        // 페이지가 2페이지 이상이면 페이지네이션 표시
        pagination.style.display = 'flex';

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

            if (category === 'weekly-report' && reportId) {
                window.location.href = `/approval/weekly-report/detail?id=${reportId}`;
            } else if (category === 'monthly-report' && reportId) {
                window.location.href = `/approval/monthly-report/detail?id=${reportId}`;
            } else if (category === 'report' && reportId) {
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
            } else if (category === 'vacation' && reportId) {
                // 연차신청서 상세페이지로 이동 (documentIdx 사용)
                window.location.href = `/approval/vacation/detail?documentIdx=${reportId}`;
            } else if (category === 'expense' && reportId) {
                window.location.href = `/approval/expense/detail?idx=${reportId}`;
            } else if (category === 'requisition' && reportId) {
                window.location.href = `/approval/requisition/detail?idx=${reportId}`;
            } else {
                const title = docRow.querySelector('.title-wrap').textContent;
                showWarning(`"${title}" 상세보기 기능은 추후 구현됩니다.`);
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

            if (category === 'weekly-report' && reportId) {
                window.location.href = `/approval/weekly-report/detail?id=${reportId}`;
            } else if (category === 'monthly-report' && reportId) {
                window.location.href = `/approval/monthly-report/detail?id=${reportId}`;
            } else if (category === 'report' && reportId) {
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
            } else if (category === 'vacation' && reportId) {
                // 연차신청서 상세페이지로 이동 (documentIdx 사용)
                window.location.href = `/approval/vacation/detail?documentIdx=${reportId}`;
            } else if (category === 'expense' && reportId) {
                window.location.href = `/approval/expense/detail?idx=${reportId}`;
            } else if (category === 'requisition' && reportId) {
                window.location.href = `/approval/requisition/detail?idx=${reportId}`;
            } else {
                const title = titleWrap.textContent;
                showWarning(`"${title}" 상세보기 기능은 추후 구현됩니다.`);
            }
        }
    });

    // ============================================
    // 첨부파일 모달
    // ============================================

    let attachModal = null;

    function getAttachModal() {
        if (attachModal) return attachModal;

        const el = document.createElement('div');
        el.id = 'approvalAttachModal';
        el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);display:none;align-items:center;justify-content:center;z-index:10000;';
        el.innerHTML = `
            <div style="background:#fff;border-radius:14px;width:460px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.25);overflow:hidden;">
                <div style="padding:18px 20px 14px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;">
                    <h3 id="attachModalTitle" style="margin:0;font-size:15px;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-paperclip" style="color:#7c3aed;"></i> 첨부파일
                    </h3>
                    <button id="attachModalClose" style="background:none;border:none;font-size:18px;color:#94a3b8;cursor:pointer;padding:2px 6px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="attachModalBody" style="padding:16px 20px;overflow-y:auto;flex:1;"></div>
            </div>
        `;
        document.body.appendChild(el);

        el.addEventListener('click', function(e) {
            if (e.target === el) closeAttachModal();
        });
        el.querySelector('#attachModalClose').addEventListener('click', closeAttachModal);

        attachModal = el;
        return el;
    }

    function openAttachModal(title, bodyHtml) {
        const modal = getAttachModal();
        modal.querySelector('#attachModalTitle').innerHTML = `<i class="fas fa-paperclip" style="color:#7c3aed;"></i> ${title}`;
        modal.querySelector('#attachModalBody').innerHTML = bodyHtml;
        modal.style.display = 'flex';
    }

    function closeAttachModal() {
        if (attachModal) attachModal.style.display = 'none';
    }

    function formatFileSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // 지출승인서 paperclip → 첨부파일 모달
    document.addEventListener('click', async function(e) {
        const btn = e.target.closest('.btn-expense-attach');
        if (!btn) return;
        e.stopPropagation();
        const id = btn.getAttribute('data-id');

        openAttachModal('첨부파일 — 지출승인서', `
            <div style="text-align:center;padding:20px 0;color:#64748b;font-size:13px;">
                <i class="fas fa-spinner fa-spin" style="font-size:22px;margin-bottom:10px;display:block;color:#7c3aed;"></i>
                불러오는 중...
            </div>
        `);

        try {
            const res = await fetch(`/api/approval/expense/${id}/attachments`);
            if (res.status === 404 || res.status === 204) {
                renderExpenseAttachModal(id, { receiptFiles: [], signedDocFiles: [] });
                return;
            }
            if (!res.ok) throw new Error();
            const data = await res.json();
            renderExpenseAttachModal(id, data);
        } catch (_) {
            renderExpenseAttachModal(id, null);
        }
    });

    function renderExpenseAttachModal(id, data) {
        const receiptFiles  = data?.receiptFiles  || [];
        const signedFiles   = data?.signedDocFiles || [];
        const total = receiptFiles.length + signedFiles.length;

        if (total === 0) {
            openAttachModal('첨부파일 — 지출승인서', `
                <div style="text-align:center;padding:28px 0;color:#94a3b8;font-size:13px;">
                    <i class="fas fa-paperclip" style="font-size:28px;display:block;margin-bottom:10px;"></i>
                    첨부된 파일이 없습니다.
                </div>
                <div style="text-align:center;margin-top:4px;">
                    <a href="/approval/expense/detail?idx=${id}" style="font-size:12px;color:#7c3aed;text-decoration:none;">
                        <i class="fas fa-external-link-alt"></i> 상세페이지에서 파일 업로드
                    </a>
                </div>
            `);
            return;
        }

        function fileRow(file) {
            const icon = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.originalFileName || file.name)
                ? 'fa-file-image' : /\.pdf$/i.test(file.originalFileName || file.name)
                ? 'fa-file-pdf' : 'fa-file';
            const name = file.originalFileName || file.name || '-';
            const size = formatFileSize(file.fileSize);
            const downloadBtn = file.idx
                ? `<a href="/api/approval/expense/attachments/${file.idx}/download" style="color:#7c3aed;font-size:13px;padding:3px 5px;" title="다운로드"><i class="fas fa-download"></i></a>`
                : '';
            return `
                <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:#fafafa;border:1px solid #e8edf2;border-radius:8px;margin-bottom:6px;">
                    <i class="fas ${icon}" style="color:#7c3aed;font-size:15px;"></i>
                    <span style="flex:1;font-size:12px;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</span>
                    <span style="font-size:11px;color:#94a3b8;white-space:nowrap;">${size}</span>
                    ${downloadBtn}
                </div>
            `;
        }

        let html = '';
        if (receiptFiles.length) {
            html += `<p style="font-size:12px;font-weight:600;color:#475569;margin:0 0 6px;">영수증 (${receiptFiles.length})</p>`;
            html += receiptFiles.map(fileRow).join('');
        }
        if (signedFiles.length) {
            html += `<p style="font-size:12px;font-weight:600;color:#475569;margin:${receiptFiles.length ? '12px' : '0'} 0 6px;">서명완료 공식문서 (${signedFiles.length})</p>`;
            html += signedFiles.map(fileRow).join('');
        }

        openAttachModal('첨부파일 — 지출승인서', html);
    }

    // 연차신청서 paperclip → PDF 목록 모달
    document.addEventListener('click', async function(e) {
        const btn = e.target.closest('.btn-pdf-download');
        if (!btn) return;
        e.stopPropagation();
        const id = btn.getAttribute('data-id');

        openAttachModal('연차신청서 PDF', `
            <div style="text-align:center;padding:20px 0;color:#64748b;font-size:13px;">
                <i class="fas fa-spinner fa-spin" style="font-size:22px;margin-bottom:10px;display:block;color:#7c3aed;"></i>
                불러오는 중...
            </div>
        `);

        try {
            const res = await fetch(`/api/vacation/detail?documentIdx=${id}`);
            if (!res.ok) throw new Error();
            const detail = await res.json();
            const attachments = detail.attachments || [];

            if (attachments.length === 0) {
                openAttachModal('연차신청서 PDF', `
                    <div style="text-align:center;padding:28px 0;color:#94a3b8;font-size:13px;">
                        <i class="fas fa-file-pdf" style="font-size:28px;display:block;margin-bottom:10px;"></i>
                        생성된 PDF가 없습니다.
                    </div>
                `);
                return;
            }

            const rows = attachments.map(f => `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fafafa;border:1px solid #e8edf2;border-radius:8px;margin-bottom:6px;">
                    <i class="fas fa-file-pdf" style="color:#ef4444;font-size:16px;"></i>
                    <span style="flex:1;font-size:12px;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${f.originalFileName || 'vacation.pdf'}</span>
                    <span style="font-size:11px;color:#94a3b8;white-space:nowrap;">${formatFileSize(f.fileSize)}</span>
                    <a href="/api/vacation/download/${f.idx}" style="background:#f3e8ff;color:#7c3aed;border:none;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;text-decoration:none;white-space:nowrap;">
                        <i class="fas fa-download"></i> 다운로드
                    </a>
                </div>
            `).join('');

            openAttachModal('연차신청서 PDF', rows);
        } catch (_) {
            openAttachModal('연차신청서 PDF', `
                <div style="text-align:center;padding:28px 0;color:#ef4444;font-size:13px;">
                    <i class="fas fa-exclamation-circle" style="font-size:24px;display:block;margin-bottom:8px;"></i>
                    파일 정보를 불러오는 데 실패했습니다.
                </div>
            `);
        }
    });

    // ============================================
    // API: approval_documents 통합 조회
    // ============================================
    async function loadAllDocuments() {
        try {
            console.log('전체 문서 API 호출 시작: /api/approval/documents');
            const response = await fetch('/api/approval/documents');
            console.log('API 응답 상태:', response.status, response.statusText);

            if (response.ok) {
                const documents = await response.json();
                console.log('전체 문서 로드 성공:', documents.length + '건');
                console.log('첫 번째 데이터:', documents[0]);

                // 프로젝트 관련 문서 타입 제외
                const PROJECT_DOCUMENT_TYPES = [
                    'C0403', // 야근식대
                    'C0404', // 단독출장
                    'C0405', // 출장+회의
                    'C0406', // 연구비증빙-회의록
                    'C0407', // 재료비
                    'C0408', // 장비비
                    'C0410'  // 프로젝트 주간업무보고
                ];

                // 전체 문서 저장 (프로젝트 문서 제외)
                allDocuments = documents.filter(doc =>
                    !PROJECT_DOCUMENT_TYPES.includes(doc.documentType)
                );

                console.log('프로젝트 문서 제외 후:', allDocuments.length + '건');

                // 문서 타입별로 분류
                weeklyReports = allDocuments.filter(doc => doc.documentType === 'C0409');
                monthlyReports = allDocuments.filter(doc => doc.documentType === 'C0411');
                meetingMinutes = allDocuments.filter(doc => doc.documentType === 'C0412');
                vacationRequests = allDocuments.filter(doc => doc.documentType === 'C0413');

                console.log('주간보고서:', weeklyReports.length + '건');
                console.log('월간보고서:', monthlyReports.length + '건');
                console.log('회의록:', meetingMinutes.length + '건');
                console.log('연차신청서:', vacationRequests.length + '건');
            } else {
                const errorText = await response.text();
                console.error('문서 로드 실패 - 상태:', response.status);
                console.error('에러 응답:', errorText);
            }
        } catch (error) {
            console.error('문서 로드 오류:', error);
            console.error('오류 상세:', error.message, error.stack);
        }
    }

    // 텍스트 자르기 유틸리티
    function truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    // documentType을 sidebar category로 매핑
    function getCategoryFromDocumentType(documentType) {
        const categoryMap = {
            'C0409': 'weekly-report',   // 주간업무보고
            'C0411': 'monthly-report',  // 월간업무보고
            'C0412': 'meeting',         // 회의록
            'C0413': 'vacation',        // 연차신청서
            'C0401': 'expense',         // 지출승인서
            'C0402': 'requisition'      // 지출품의서
        };
        return categoryMap[documentType] || 'general';
    }

    // documentType별 아이콘 매핑
    function getIconFromDocumentType(documentType) {
        const iconMap = {
            'C0409': 'fa-calendar-week',    // 주간업무보고
            'C0411': 'fa-calendar-alt',     // 월간업무보고
            'C0412': 'fa-users',            // 회의록
            'C0413': 'fa-umbrella-beach',   // 연차신청서
            'C0401': 'fa-won-sign',         // 지출승인서
            'C0402': 'fa-file-invoice'      // 지출품의서
        };
        return iconMap[documentType] || 'fa-file-alt';
    }

    // 모든 문서를 합쳐서 렌더링 (approval_documents 기반)
    function renderAllDocuments() {
        const tbody = documentList.querySelector('tbody');
        if (!tbody) return;

        // 기존 문서 행 제거
        const existingRows = tbody.querySelectorAll('.doc-row');
        existingRows.forEach(row => row.remove());

        // 전체 문서가 없으면 종료
        if (!allDocuments || allDocuments.length === 0) {
            console.log('렌더링할 문서가 없습니다.');
            return;
        }

        // 생성일 기준 최신순 정렬
        const sortedDocuments = [...allDocuments].sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return dateB - dateA; // 내림차순 (최신순)
        });

        // 정렬된 문서를 테이블에 렌더링
        sortedDocuments.forEach(doc => {
            const tr = document.createElement('tr');
            tr.className = 'doc-row';

            let category = getCategoryFromDocumentType(doc.documentType);

            tr.setAttribute('data-category', category);

            const createdDate = new Date(doc.createdAt);
            const formattedDate = `${createdDate.getFullYear()}.${String(createdDate.getMonth() + 1).padStart(2, '0')}.${String(createdDate.getDate()).padStart(2, '0')} ${String(createdDate.getHours()).padStart(2, '0')}:${String(createdDate.getMinutes()).padStart(2, '0')}`;

            const icon = getIconFromDocumentType(doc.documentType);

            const docId = doc.sourceDocumentId || doc.idx;
            const attachBtn = (category === 'vacation')
                ? `<button class="btn-icon btn-attach btn-pdf-download" data-id="${docId}" title="PDF 다운로드"><i class="fas fa-paperclip"></i></button>`
                : (category === 'expense')
                ? `<button class="btn-icon btn-attach btn-expense-attach" data-id="${docId}" title="첨부파일"><i class="fas fa-paperclip"></i></button>`
                : '';

            tr.innerHTML = `
                <td>
                    <span class="doc-type">
                        <i class="fas ${icon}"></i>
                        ${doc.documentTypeName || doc.documentType}
                    </span>
                </td>
                <td class="doc-title-cell">
                    <div class="title-wrap">${doc.title}</div>
                    <div class="desc-wrap">${truncateText(doc.content, 100)}</div>
                </td>
                <td>${doc.drafterName || '-'}</td>
                <td>${doc.drafterDeptName || '-'}</td>
                <td>${formattedDate}</td>
                <td>
                    <div class="table-actions">
                        ${attachBtn}
                        <button class="btn-icon btn-view" data-id="${docId}" data-type="${category}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });

        filterDocuments();
    }

    // 페이지 로드 시 approval_documents 통합 조회
    async function init() {
        console.log('문서함 초기화 시작');
        console.log('사이드바 메뉴 아이템 개수:', sidebarMenuItems.length);

        // 초기 상태: "전체 문서" 메뉴를 active로 설정
        sidebarMenuItems.forEach(item => {
            const category = item.getAttribute('data-category');
            if (category === 'all') {
                item.classList.add('active');
                console.log('✅ "전체 문서" 메뉴 active 설정됨');
            } else {
                item.classList.remove('active');
            }
        });

        await loadAllDocuments();
        renderAllDocuments(); // 모든 문서를 합쳐서 렌더링
    }

    init();

    // 초기 필터링
    filterDocuments();
});
