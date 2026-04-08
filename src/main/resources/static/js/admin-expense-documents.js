document.addEventListener('DOMContentLoaded', function() {

    // 검색 유틸리티 (공통)
    const searchUtils = new SearchUtils();
    const matchesKoreanSearch = (text, searchTerm) => searchUtils.matchesSearch(text, searchTerm);
    const highlightText = (text, searchTerm) => searchUtils.highlightText(text, searchTerm, 'highlight-text');

    let allDocuments = [];
    let filteredDocuments = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentSortField = 'createdAt';
    let currentSortOrder = 'desc';
    let selectedSettlementMonth = null; // null = 전체, 'YYYY-MM' = 특정 정산월

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
    yearFilter.addEventListener('change', () => { selectedSettlementMonth = null; applyFilters(); });
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

    // ── 정산월 계산 (14일 기준) ─────────────────────────────────

    /** createdAt → 정산월 'YYYY-MM' (14일 이후 작성 → 익월, 13일 이하 → 당월) */
    function getSettlementMonth(dateStr) {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        if (d.getDate() >= 14) {
            d.setMonth(d.getMonth() + 1);
        }
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    /** 정산월 key → 실제 기간 { start, end } */
    function getSettlementPeriod(monthKey) {
        const [year, month] = monthKey.split('-').map(Number);
        // 정산월 M → 전월 14일 ~ 당월 13일
        const prev = new Date(year, month - 2, 14);
        const end = new Date(year, month - 1, 13, 23, 59, 59);
        return {
            start: prev,
            end: end,
            label: `${month}월`,
            range: `${prev.getMonth() + 1}/14 ~ ${end.getMonth() + 1}/13`
        };
    }

    /** 현재 연도 필터에 맞는 정산월 뱃지 목록 계산 */
    function getMonthBadges() {
        const selectedYear = yearFilter.value;
        const docs = selectedYear
            ? allDocuments.filter(d => d.createdAt && new Date(d.createdAt).getFullYear() === parseInt(selectedYear))
            : allDocuments;

        const monthMap = {};
        docs.filter(doc => !doc.deleted).forEach(doc => {
            const sm = getSettlementMonth(doc.createdAt);
            if (!sm) return;
            if (!monthMap[sm]) monthMap[sm] = 0;
            monthMap[sm]++;
        });

        return Object.entries(monthMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, count]) => ({ key, count, ...getSettlementPeriod(key) }));
    }

    function renderMonthBadges() {
        const badges = getMonthBadges();
        if (badges.length === 0) return '';

        return `
            <div class="settlement-month-bar">
                <span class="settlement-label"><i class="fas fa-calendar-check"></i> 정산월</span>
                <div class="settlement-badges">
                    <button class="settlement-badge ${selectedSettlementMonth === null ? 'active' : ''}"
                            onclick="selectSettlementMonth(null)">
                        전체
                    </button>
                    ${badges.map(b => `
                        <button class="settlement-badge ${selectedSettlementMonth === b.key ? 'active' : ''}"
                                onclick="selectSettlementMonth('${b.key}')"
                                data-tip="${b.range}">
                            ${b.label} <span class="settlement-count">${b.count}</span>
                        </button>
                    `).join('')}
                </div>
            </div>`;
    }

    window.selectSettlementMonth = function(monthKey) {
        selectedSettlementMonth = monthKey;
        applyFilters();
    };

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

            // 정산월 필터
            if (selectedSettlementMonth) {
                const docMonth = getSettlementMonth(doc.createdAt);
                if (docMonth !== selectedSettlementMonth) return false;
            }

            const receiptDone = doc.detailCount > 0 && doc.receiptAttachedCount >= doc.detailCount;
            if (selectedReceipt === 'allComplete' && !(receiptDone && doc.hasOfficialDocument)) return false;
            if (selectedReceipt === 'complete' && !receiptDone) return false;
            if (selectedReceipt === 'incomplete' && receiptDone) return false;
            if (selectedReceipt === 'noDocument' && doc.hasOfficialDocument) return false;

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

    /**
     * 문서 정렬 — 고정 우선순위
     * 1) 첨부 완료 + 제출완료 (오래된순 → 위)
     * 2) 제출완료 + 파일 누락 (오래된순 → 위)
     * 3) 작성중 (최신순 → 위)
     * 4) 그 외 상태 (제출확인/반려/정산완료 등, 최신순)
     * 5) 삭제된 건 (최신순)
     */
    function sortDocuments() {
        filteredDocuments.sort((a, b) => {
            const aGroup = getExpenseSortGroup(a);
            const bGroup = getExpenseSortGroup(b);

            if (aGroup !== bGroup) return aGroup - bGroup;

            const aDate = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const bDate = b.createdAt ? new Date(b.createdAt) : new Date(0);

            // 그룹 1,2: 오래된순 (과거 → 위)
            if (aGroup <= 2) return aDate - bDate;
            // 그룹 3,4,5: 최신순
            return bDate - aDate;
        });
    }

    function getExpenseSortGroup(doc) {
        if (doc.deleted) return 5;
        const st = doc.settlementStatus || 'C1001';
        const complete = doc.detailCount > 0
            && doc.receiptAttachedCount >= doc.detailCount
            && doc.hasOfficialDocument;

        if (st === 'C1002' && complete) return 1;  // 제출완료 + 첨부완료
        if (st === 'C1002' && !complete) return 2;  // 제출완료 + 누락
        if (st === 'C1001') return 3;                // 작성중
        return 4;                                     // 제출확인/반려/정산완료
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
            ${renderMonthBadges()}
            <div class="batch-action-bar" id="batchActionBar">
                <div class="batch-left">
                    <input type="checkbox" id="checkAll" onchange="toggleCheckAll(this)">
                    <span class="batch-selected-count" id="batchSelectedCount">전체 선택</span>
                    <span class="batch-notice"><i class="fas fa-lock"></i> 필수문서 누락 시 선택 불가</span>
                </div>
                <div class="batch-right" id="batchControls">
                    <span class="batch-hint" id="batchHint"><i class="fas fa-info-circle"></i> 체크박스로 문서를 선택하세요</span>
                    <select id="batchStatusSelect" class="batch-status-select" disabled>
                        <option value="">변경할 상태 선택</option>
                        <option value="C1002">제출완료</option>
                        <option value="C1003">제출확인</option>
                        <option value="C1004">반려</option>
                        <option value="C1005">정산완료</option>
                    </select>
                    <button class="btn-batch-apply" onclick="applyBatchStatus()" disabled id="batchApplyBtn">
                        <i class="fas fa-check-double"></i> 일괄 적용
                    </button>
                </div>
            </div>
            <table class="documents-table">
                <thead>
                    <tr>
                        <th style="width:40px;"></th>
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
                        <th>영수증</th>
                        <th>공식문서</th>
                        <th>정산상태</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody id="documentsTableBody">
                    ${currentDocuments.map(doc => {
                        const isDeleted = doc.deleted;
                        const receiptComplete = doc.detailCount > 0 && doc.receiptAttachedCount >= doc.detailCount;
                        const allComplete = receiptComplete && doc.hasOfficialDocument;
                        const rowClass = isDeleted ? 'class="deleted-row"'
                            : !allComplete ? 'class="incomplete-row"' : '';
                        const userName = userSearch ? highlightText(doc.userName || '-', userSearch) : (doc.userName || '-');

                        let receiptStatus;
                        if (doc.detailCount === 0) {
                            receiptStatus = '<span class="badge badge-neutral">항목 없음</span>';
                        } else if (receiptComplete) {
                            receiptStatus = `<span class="badge badge-complete">${doc.receiptAttachedCount}/${doc.detailCount} 완료</span>`;
                        } else {
                            receiptStatus = `<span class="badge badge-incomplete">${doc.receiptAttachedCount}/${doc.detailCount} 일부 누락</span>`;
                        }

                        const docStatus = doc.hasOfficialDocument
                            ? '<span class="badge badge-complete">업로드 완료</span>'
                            : '<span class="badge badge-incomplete">누락</span>';

                        const stCode = doc.settlementStatus || 'C1001';
                        const stName = doc.settlementStatusName || '작성중';
                        const stBadge = renderSettlementBadge(stCode, stName);

                        return `
                        <tr ${rowClass} onclick="viewDocument(${doc.idx})" style="cursor: pointer;">
                            <td onclick="event.stopPropagation();">
                                <div class="check-cell">
                                    <input type="checkbox" class="row-check" value="${doc.idx}" onchange="updateBatchUI()" ${(isDeleted || !allComplete) ? 'disabled' : ''}>
                                    ${(!isDeleted && !allComplete) ? '<span class="check-disabled-icon" data-tip="영수증 또는 공식문서 누락으로\n선택할 수 없습니다"><i class="fas fa-exclamation-circle"></i></span>' : ''}
                                </div>
                            </td>
                            <td>${formatDateTime(doc.createdAt)}</td>
                            <td><strong>${userName}</strong><br><small style="color:#94a3b8;">${doc.userPosition || ''}</small></td>
                            <td>${doc.userDeptName || doc.userDept || '-'}</td>
                            <td><code style="font-size:12px;">${doc.documentNumber || '-'}</code></td>
                            <td style="text-align:right;font-weight:600;font-variant-numeric:tabular-nums;">${formatAmount(doc.totalAmount)}</td>
                            <td style="text-align:center;" onclick="event.stopPropagation(); showFileModal(${doc.idx}, 'receipt')" class="badge-cell">${receiptStatus}</td>
                            <td style="text-align:center;" onclick="event.stopPropagation(); showFileModal(${doc.idx}, 'document')" class="badge-cell">${docStatus}</td>
                            <td style="text-align:center;" onclick="event.stopPropagation(); showStatusChangeModal(${doc.idx}, '${stCode}', '${doc.userName}')"
                                class="badge-cell">${stBadge}</td>
                            <td onclick="event.stopPropagation()">
                                <div class="action-buttons">
                                    <button class="btn-view" onclick="viewDocument(${doc.idx})">
                                        <i class="fas fa-eye"></i> 보기
                                    </button>
                                    <button class="btn-delete ${isDeleted ? 'disabled' : ''}"
                                            onclick="${isDeleted ? 'return false;' : `deleteDocument(${doc.idx}, '${doc.userName}')`}"
                                            ${isDeleted ? 'disabled data-tip="이미 삭제된 문서입니다."' : ''}>
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

    // ── 정산상태 뱃지 ────────────────────────────────────────────

    const SETTLEMENT_STYLES = {
        C1001: { label: '작성중',   cls: 'st-drafting' },
        C1002: { label: '제출완료', cls: 'st-submitted' },
        C1003: { label: '제출확인', cls: 'st-confirmed' },
        C1004: { label: '반려', cls: 'st-rejected' },
        C1005: { label: '정산완료', cls: 'st-settled' },
    };

    function renderSettlementBadge(code, name) {
        const style = SETTLEMENT_STYLES[code] || { cls: 'st-drafting' };
        return `<span class="badge settlement-badge ${style.cls}">${name || style.label}</span>`;
    }

    // ── 체크박스 / 일괄 변경 ─────────────────────────────────────

    window.toggleCheckAll = function(el) {
        document.querySelectorAll('.row-check:not(:disabled)').forEach(cb => { cb.checked = el.checked; });
        updateBatchUI();
    };

    window.updateBatchUI = function() {
        const checked = document.querySelectorAll('.row-check:checked');
        const countEl = document.getElementById('batchSelectedCount');
        const hint = document.getElementById('batchHint');
        const select = document.getElementById('batchStatusSelect');
        const applyBtn = document.getElementById('batchApplyBtn');

        if (checked.length > 0) {
            countEl.textContent = `${checked.length}건 선택`;
            countEl.classList.add('has-selection');
            if (hint) hint.style.display = 'none';
            select.disabled = false;
            applyBtn.disabled = false;
        } else {
            countEl.textContent = '전체 선택';
            countEl.classList.remove('has-selection');
            if (hint) hint.style.display = '';
            select.disabled = true;
            select.value = '';
            applyBtn.disabled = true;
        }
    };

    window.applyBatchStatus = async function() {
        const select = document.getElementById('batchStatusSelect');
        const statusCode = select.value;
        if (!statusCode) {
            Swal.fire({ icon: 'warning', title: '변경할 상태를 선택해주세요.' });
            return;
        }

        const checked = document.querySelectorAll('.row-check:checked');
        const idxList = Array.from(checked).map(cb => parseInt(cb.value));

        // 전이 규칙에 따라 변경 가능한 문서만 필터링
        const targetList = idxList.filter(id => {
            const doc = allDocuments.find(d => d.idx === id);
            return doc && canTransition(doc, statusCode);
        });

        if (targetList.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: '변경 불가',
                text: `선택한 문서 중 "${SETTLEMENT_STYLES[statusCode]?.label}"(으)로 변경 가능한 문서가 없습니다.`,
            });
            return;
        }

        const statusName = SETTLEMENT_STYLES[statusCode]?.label || statusCode;
        const skippedCount = idxList.length - targetList.length;
        const skippedMsg = skippedCount > 0 ? `\n(변경 불가 ${skippedCount}건 제외)` : '';

        let comment = '';
        if (statusCode === 'C1004') {
            const result = await Swal.fire({
                title: '반려 사유 입력',
                html: `<p style="margin-bottom:8px;color:#475569;font-size:14px;">${targetList.length}건 → "${statusName}"${skippedMsg ? '<br><small style="color:#ef4444;">' + skippedMsg.trim() + '</small>' : ''}</p>`,
                input: 'textarea',
                inputPlaceholder: '반려 사유를 입력해주세요...',
                showCancelButton: true,
                confirmButtonText: '적용',
                cancelButtonText: '취소',
                inputValidator: (value) => { if (!value) return '반려 사유를 입력해주세요.'; }
            });
            if (!result.isConfirmed) return;
            comment = result.value;
        } else {
            const confirmed = await Swal.fire({
                title: `${targetList.length}건 → "${statusName}"`,
                text: `선택한 문서의 정산상태를 변경합니다.${skippedMsg}`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: '변경',
                cancelButtonText: '취소'
            });
            if (!confirmed.isConfirmed) return;
        }

        try {
            const response = await fetch('/api/approval/expense/admin/documents/batch-status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idxList: targetList, statusCode, comment })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || '일괄 변경 실패');
            }
            const data = await response.json();
            await Swal.fire({ icon: 'success', title: '변경 완료', text: data.message, timer: 1500, showConfirmButton: false });
            loadDocuments();
        } catch (error) {
            console.error('일괄 변경 오류:', error);
            Swal.fire({ icon: 'error', title: '변경 실패', text: error.message });
        }
    };

    // ── 단건 상태 변경 모달 ──────────────────────────────────────

    /** 문서 첨부 완전성 체크 */
    function isDocumentComplete(doc) {
        const receiptComplete = doc.detailCount > 0 && doc.receiptAttachedCount >= doc.detailCount;
        return receiptComplete && doc.hasOfficialDocument;
    }

    function getMissingReasons(doc) {
        const reasons = [];
        if (doc.detailCount === 0) {
            reasons.push('지출 항목 없음');
        } else if (doc.receiptAttachedCount < doc.detailCount) {
            reasons.push(`영수증 ${doc.detailCount - doc.receiptAttachedCount}건 미첨부`);
        }
        if (!doc.hasOfficialDocument) reasons.push('공식문서 미첨부');
        return reasons;
    }

    /** 현재 상태에서 변경 가능한 상태 목록 반환 */
    function getAvailableTransitions(currentStatus, doc) {
        const complete = isDocumentComplete(doc);

        switch (currentStatus) {
            case 'C1002': // 제출완료
                return [
                    { code: 'C1003', label: '제출확인', disabled: !complete },
                    { code: 'C1004', label: '반려' },
                    { code: 'C1005', label: '정산완료', disabled: !complete },
                ];
            case 'C1003': // 제출확인
                return [
                    { code: 'C1002', label: '제출완료' },
                    { code: 'C1004', label: '반려' },
                    { code: 'C1005', label: '정산완료' },
                ];
            case 'C1004': // 반려
                return [
                    { code: 'C1003', label: '제출확인', disabled: !complete },
                    { code: 'C1005', label: '정산완료', disabled: !complete },
                ];
            case 'C1005': // 정산완료
                return [
                    { code: 'C1003', label: '제출확인' },
                    { code: 'C1004', label: '반려' },
                ];
            default: // C1001 작성중
                return [];
        }
    }

    /** 특정 문서가 대상 상태로 전이 가능한지 확인 */
    function canTransition(doc, targetStatus) {
        const transitions = getAvailableTransitions(doc.settlementStatus, doc);
        const match = transitions.find(t => t.code === targetStatus);
        return match && !match.disabled;
    }

    window.showStatusChangeModal = async function(idx, currentStatus, userName) {
        const currentName = SETTLEMENT_STYLES[currentStatus]?.label || currentStatus;
        const doc = allDocuments.find(d => d.idx === idx);
        const transitions = getAvailableTransitions(currentStatus, doc);

        // 변경 가능한 상태가 없으면 안내만
        if (transitions.length === 0) {
            Swal.fire({
                icon: 'info',
                title: `현재: ${currentName}`,
                text: '"작성중" 상태는 사용자가 제출해야 변경할 수 있습니다.',
            });
            return;
        }

        // 첫 번째 enabled 항목을 기본 선택
        const firstEnabled = transitions.find(t => !t.disabled);
        const options = transitions.map(t => {
            const selected = (firstEnabled && t.code === firstEnabled.code) ? 'selected' : '';
            const disabled = t.disabled ? 'disabled' : '';
            return `<option value="${t.code}" ${selected} ${disabled}>${t.label}</option>`;
        }).join('');

        // 첨부파일 누락 안내 메시지
        const complete = isDocumentComplete(doc);
        const missingNotice = !complete
            ? `<div id="swalMissingNotice" style="margin-top:12px;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e;">
                    <i class="fas fa-exclamation-triangle" style="margin-right:6px;color:#f59e0b;"></i>
                    <strong>첨부파일 미비로 일부 상태를 선택할 수 없습니다.</strong>
                    <ul style="margin:6px 0 0 18px;padding:0;line-height:1.8;">
                        ${getMissingReasons(doc).map(r => `<li>${r}</li>`).join('')}
                    </ul>
                    <p style="margin:6px 0 0;font-size:12px;color:#a16207;">위 항목 보완 후 "제출확인" 또는 "정산완료"로 변경할 수 있습니다.</p>
               </div>`
            : '';

        // 가장 최근 반려 사유 노출 (관리부가 이력 추적용으로 참고)
        // - 현재 상태가 반려(C1004)면 "현재 반려 사유"로, 그 외 상태면 "최근 반려 사유"로 표시
        // - 새 반려가 발생하면 그냥 덮어쓰기 — 별도 이력 보존 없음
        const escapeHtml = (s) => String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const latestLabel = currentStatus === 'C1004' ? '현재 반려 사유' : '최근 반려 사유';
        const currentRejectBlock = (doc.settlementComment && doc.settlementComment.trim())
            ? `<div style="margin-top:12px;padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:13px;color:#b91c1c;line-height:1.6;">
                    <i class="fas fa-comment-dots" style="margin-right:6px;color:#ef4444;"></i>
                    <strong>${latestLabel}:</strong> ${escapeHtml(doc.settlementComment)}
               </div>`
            : '';

        const result = await Swal.fire({
            title: '정산상태 변경',
            html: `
                <div style="text-align:left;">
                    <p style="margin-bottom:14px;color:#475569;font-size:14px;">
                        <strong>${userName}</strong> 님 · 현재 <span style="color:#2563eb;font-weight:600;">${currentName}</span>
                    </p>
                    ${currentRejectBlock}
                    <label style="font-size:13px;font-weight:600;color:#334155;display:block;margin-top:14px;margin-bottom:6px;">변경할 상태</label>
                    <select id="swalStatusSelect" style="display:block;width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;box-sizing:border-box;">
                        ${options}
                    </select>
                    ${missingNotice}
                    <div id="swalCommentWrap" style="display:none;margin-top:14px;">
                        <label style="font-size:13px;font-weight:600;color:#334155;display:block;margin-bottom:6px;">반려 사유 <span style="color:#ef4444;">*</span></label>
                        <textarea id="swalStatusComment" placeholder="반려 사유를 입력해주세요..."
                            style="display:block;width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;min-height:80px;resize:vertical;box-sizing:border-box;"></textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '변경',
            cancelButtonText: '취소',
            didOpen: () => {
                const sel = document.getElementById('swalStatusSelect');
                const wrap = document.getElementById('swalCommentWrap');
                const updateCommentVisibility = () => { wrap.style.display = sel.value === 'C1004' ? '' : 'none'; };
                sel.addEventListener('change', updateCommentVisibility);
                updateCommentVisibility(); // 초기값 체크
            },
            preConfirm: () => {
                const code = document.getElementById('swalStatusSelect').value;
                if (!code) { Swal.showValidationMessage('상태를 선택해주세요.'); return false; }
                const comment = (document.getElementById('swalStatusComment')?.value || '').trim();
                if (code === 'C1004' && !comment) {
                    Swal.showValidationMessage('반려 사유를 입력해주세요.');
                    return false;
                }
                return { statusCode: code, comment: code === 'C1004' ? comment : '' };
            }
        });

        if (!result.isConfirmed) return;

        try {
            const response = await fetch(`/api/approval/expense/admin/documents/${idx}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result.value)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || '상태 변경 실패');
            }
            await Swal.fire({ icon: 'success', title: '변경 완료', timer: 1200, showConfirmButton: false });
            loadDocuments();
        } catch (error) {
            console.error('상태 변경 오류:', error);
            Swal.fire({ icon: 'error', title: '변경 실패', text: error.message });
        }
    };

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

    // ── 파일 정보 모달 ─────────────────────────────────────────

    // 모달 안에서 파일을 클릭하면 미리보기를 띄우기 위해, 현재 모달의 파일 메타를 임시 저장
    let currentModalFiles = [];

    window.showFileModal = async function(idx, type) {
        try {
            const response = await fetch(`/api/approval/expense/${idx}`);
            if (!response.ok) throw new Error('문서 상세 조회 실패');
            const data = await response.json();

            let title, body;
            currentModalFiles = [];

            if (type === 'receipt') {
                title = '<i class="fas fa-receipt"></i> 항목별 영수증 현황';
                if (!data.expenseDetails || data.expenseDetails.length === 0) {
                    body = '<div class="file-modal-empty"><i class="fas fa-inbox"></i><p>지출 항목이 없습니다.</p></div>';
                } else {
                    // 모든 항목 첨부를 한 배열로 평탄화 — 모달 안에서 전후 네비게이션 가능
                    data.expenseDetails.forEach(d => {
                        (d.attachments || []).forEach(a => {
                            currentModalFiles.push({
                                url: `/api/approval/expense/attachments/${a.idx}/download`,
                                filename: a.originalFilename,
                            });
                        });
                    });

                    // 속성값에 들어갈 파일명 escape (data-tip 등)
                    const escAttr = (s) => String(s || '')
                        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

                    body = `<table class="file-modal-table">
                        <thead><tr><th>지출일</th><th>적요</th><th>상호</th><th>금액</th><th>영수증</th></tr></thead>
                        <tbody>${data.expenseDetails.map(d => {
                            const hasFiles = d.attachments && d.attachments.length > 0;
                            const fileList = hasFiles
                                ? d.attachments.map(a => {
                                    const flatIdx = currentModalFiles.findIndex(f => f.filename === a.originalFilename
                                        && f.url === `/api/approval/expense/attachments/${a.idx}/download`);
                                    return `<button type="button" class="receipt-clip-btn attached file-preview-trigger" data-preview-idx="${flatIdx}" data-tip="${escAttr(a.originalFilename)}" aria-label="${escAttr(a.originalFilename)}"><i class="fas fa-paperclip"></i></button>`;
                                }).join('')
                                : '<span class="receipt-clip-btn missing" data-tip="미첨부" aria-label="영수증 미첨부"><i class="fas fa-paperclip"></i></span>';
                            return `<tr>
                                <td>${d.expenseDate || '-'}</td>
                                <td>${d.description || '-'}</td>
                                <td>${d.shopName || '-'}</td>
                                <td style="text-align:right;font-variant-numeric:tabular-nums;">${formatAmount(d.amount)}</td>
                                <td class="receipt-cell">${fileList}</td>
                            </tr>`;
                        }).join('')}</tbody>
                    </table>`;
                }
            } else {
                title = '<i class="fas fa-file-signature"></i> 서명완료 공식문서';
                const docFiles = (data.attachments || []).filter(a => a.attachmentType === 'DOCUMENT');
                if (docFiles.length === 0) {
                    body = '<div class="file-modal-empty"><i class="fas fa-file-excel"></i><p>공식문서가 첨부되지 않았습니다.</p></div>';
                } else {
                    docFiles.forEach(a => {
                        currentModalFiles.push({
                            url: `/api/approval/expense/attachments/${a.idx}/download`,
                            filename: a.originalFilename,
                        });
                    });

                    body = `<div class="file-modal-list">${docFiles.map((a, i) => `
                        <button type="button" class="file-modal-item file-preview-trigger" data-preview-idx="${i}">
                            <div class="file-icon"><i class="${getFileIcon(a.originalFilename)}"></i></div>
                            <div class="file-info">
                                <span class="file-name">${a.originalFilename}</span>
                                <span class="file-size">${formatFileSize(a.fileSize)}</span>
                            </div>
                            <i class="fas fa-eye file-download-icon"></i>
                        </button>
                    `).join('')}</div>`;
                }
            }

            openFileModal(title, body);

            // 미리보기 트리거 바인딩
            const modalBody = document.getElementById('fileModalBody');
            if (modalBody) {
                modalBody.querySelectorAll('.file-preview-trigger').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const previewIdx = parseInt(btn.dataset.previewIdx, 10);
                        if (Number.isNaN(previewIdx) || previewIdx < 0) return;
                        if (typeof window.openFilePreview !== 'function') {
                            console.error('file-preview-modal.js 가 로드되지 않았습니다.');
                            return;
                        }
                        window.openFilePreview(currentModalFiles, previewIdx);
                    });
                });
            }
        } catch (error) {
            console.error('파일 정보 조회 오류:', error);
            Swal.fire({ icon: 'error', title: '조회 실패', text: '파일 정보를 불러올 수 없습니다.' });
        }
    };

    function openFileModal(title, body) {
        let overlay = document.getElementById('fileModalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'fileModalOverlay';
            overlay.className = 'file-modal-overlay';
            overlay.innerHTML = `
                <div class="file-modal">
                    <div class="file-modal-header">
                        <h3 id="fileModalTitle"></h3>
                        <button class="file-modal-close" id="fileModalCloseBtn"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="file-modal-body" id="fileModalBody"></div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFileModal(); });
            document.getElementById('fileModalCloseBtn').addEventListener('click', closeFileModal);
        }
        document.getElementById('fileModalTitle').innerHTML = title;
        document.getElementById('fileModalBody').innerHTML = body;
        overlay.classList.add('active');
    }

    function closeFileModal() {
        const overlay = document.getElementById('fileModalOverlay');
        if (overlay) overlay.classList.remove('active');
    }

    function truncateFilename(name, maxLen) {
        if (!name || name.length <= maxLen) return name || '';
        const ext = name.lastIndexOf('.') > -1 ? name.substring(name.lastIndexOf('.')) : '';
        return name.substring(0, maxLen - ext.length - 2) + '..' + ext;
    }

    function getFileIcon(filename) {
        if (!filename) return 'fas fa-file';
        const ext = filename.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'fas fa-file-image';
        if (['pdf'].includes(ext)) return 'fas fa-file-pdf';
        if (['doc', 'docx'].includes(ext)) return 'fas fa-file-word';
        if (['xls', 'xlsx'].includes(ext)) return 'fas fa-file-excel';
        if (['zip', 'rar', '7z'].includes(ext)) return 'fas fa-file-archive';
        return 'fas fa-file';
    }

    function formatFileSize(bytes) {
        if (!bytes) return '-';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

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
