// 연구비 증빙 - 재료비/장비비 페이지 JavaScript
document.addEventListener('DOMContentLoaded', async function() {

    // 검색 유틸리티 (공통, XSS 방지를 위해 escapeHtml 옵션 사용)
    const searchUtils = new SearchUtils();
    const matchesSearch = (text, keyword) => searchUtils.matchesSearch(text, keyword);
    const highlightText = (text, keyword) => searchUtils.highlightText(text, keyword, { escapeHtml: true });

    // ============================================
    // 전역 변수
    // ============================================
    let selectedReceiptFiles = [];
    let selectedDocumentFiles = [];
    let selectedEstimateFiles = [];
    let selectedBankCopyFiles = [];
    let projects = [];
    let selectedProject = null;
    let projectCards = [];
    let projectMembers = [];
    let selectedCard = null;
    let selectedApplicant = null;
    let employees = [];
    let itemRowCount = 0;

    // 수정 모드
    let isEditMode = false;
    let editingIdx = null;
    let existingReceiptAttachments = [];
    let existingDocumentAttachments = [];
    let existingEstimateAttachments = [];
    let existingBankCopyAttachments = [];
    let deletedAttachmentIds = [];

    // 클립보드 paste 활성 슬롯 (setupClipboardPasteForPurchase 초기 호출보다 먼저 선언 필요)
    let activePurchaseSlot = 'receipt';

    // PURCHASE_TYPE은 Thymeleaf 인라인 스크립트로 주입됨 (layout에서)
    // 없을 경우 URL 파라미터에서 읽기
    const purchaseType = (typeof PURCHASE_TYPE !== 'undefined' ? PURCHASE_TYPE : null)
        || new URLSearchParams(window.location.search).get('type')
        || 'material';
    const purchaseTypeLabel = (typeof PURCHASE_TYPE_LABEL !== 'undefined' ? PURCHASE_TYPE_LABEL : null)
        || (purchaseType === 'equipment' ? '장비비' : '재료비');

    // ============================================
    // DOM 요소
    // ============================================
    const submitBtn = document.getElementById('submitBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const printBtn = document.getElementById('printDocumentBtn');
    const receiptInput = document.getElementById('receiptInput');
    const receiptFileList = document.getElementById('receiptFileList');
    const receiptUploadArea = document.getElementById('receiptUploadArea');
    const documentInput = document.getElementById('documentInput');
    const documentFileList = document.getElementById('documentFileList');
    const documentUploadArea = document.getElementById('documentUploadArea');
    const estimateInput = document.getElementById('estimateInput');
    const estimateFileList = document.getElementById('estimateFileList');
    const estimateUploadArea = document.getElementById('estimateUploadArea');
    const estimateSection = document.getElementById('estimateSection');
    const attachmentGrid = document.getElementById('attachmentGrid');
    const toggleBtn = document.getElementById('documentFormToggle');
    const formWrapper = document.querySelector('.document-form-wrapper');
    const itemTableBody = document.getElementById('itemTableBody');
    const docItemTableBody = document.getElementById('docItemTableBody');

    // ============================================
    // 품의 내역서 행 추가/제거 (초기화보다 먼저 정의)
    // ============================================
    window.addItemRow = function() {
        const idx = itemRowCount++;
        const tr = document.createElement('tr');
        tr.dataset.rowIdx = idx;
        tr.innerHTML = `
            <td><input type="date" class="item-input item-date" placeholder="날짜"></td>
            <td><input type="text" class="item-input item-desc" placeholder="품명/내역 입력"></td>
            <td><input type="number" class="item-input num-input item-qty" placeholder="0" min="0"></td>
            <td><input type="text" class="item-input num-input item-payment" placeholder="0"></td>
            <td><input type="text" class="item-input num-input item-supply" placeholder="0"></td>
            <td><input type="text" class="item-input num-input item-tax" placeholder="0"></td>
            <td>
                <select class="item-input item-taxtype">
                    <option value="과세">과세</option>
                    <option value="면세">면세</option>
                </select>
            </td>
            <td><input type="text" class="item-input item-remark" placeholder="비고"></td>
            <td><button type="button" class="btn-remove-row" onclick="removeItemRow(this)" data-tip="행 삭제">
                <i class="fas fa-times"></i>
            </button></td>
        `;

        const paymentEl = tr.querySelector('.item-payment');
        const supplyEl  = tr.querySelector('.item-supply');
        const taxEl     = tr.querySelector('.item-tax');
        const taxtypeEl = tr.querySelector('.item-taxtype');

        // 세액 편집 가능 여부 갱신 (값 있을 때만 편집 허용)
        function updateTaxEditable() {
            if (parseNumber(taxEl.value) > 0) {
                taxEl.removeAttribute('readonly');
            } else {
                taxEl.setAttribute('readonly', '');
            }
        }

        // 총 결제금액 → 공급가액·세액 자동 계산
        function recalcFromPayment() {
            const payment = parseNumber(paymentEl.value);
            const taxType = taxtypeEl.value;
            let supply, tax;
            if (taxType === '과세') {
                supply = Math.round(payment / 1.1);
                tax = payment - supply;
            } else {
                supply = payment;
                tax = 0;
            }
            supplyEl.value = supply > 0 ? supply.toLocaleString() : '';
            taxEl.value    = tax > 0 ? tax.toLocaleString() : (payment > 0 ? '0' : '');
            updateTaxEditable();
            updateItemTotals();
        }

        // 공급가액 → 세액·총 결제금액 역산
        function recalcFromSupply() {
            const supply  = parseNumber(supplyEl.value);
            const taxType = taxtypeEl.value;
            const tax     = (taxType === '과세') ? Math.round(supply * 0.1) : 0;
            const payment = supply + tax;
            taxEl.value     = tax > 0 ? tax.toLocaleString() : (supply > 0 ? '0' : '');
            paymentEl.value = payment > 0 ? payment.toLocaleString() : '';
            updateTaxEditable();
            updateItemTotals();
        }

        // 수량 기본값 1
        tr.querySelector('.item-qty').value = 1;
        taxEl.setAttribute('readonly', '');  // 초기 세액 readonly

        paymentEl.addEventListener('input', function() {
            this.value = formatNumberInput(this.value);
            recalcFromPayment();
        });

        taxtypeEl.addEventListener('change', function() {
            if (parseNumber(paymentEl.value) > 0) recalcFromPayment();
            else if (parseNumber(supplyEl.value) > 0) recalcFromSupply();
        });

        supplyEl.addEventListener('input', function() {
            this.value = formatNumberInput(this.value);
            recalcFromSupply();
        });

        // 세액 — 값 있을 때만 편집 가능, 공급가액 = 결제금액 - 세액
        taxEl.addEventListener('input', function() {
            this.value = formatNumberInput(this.value);
            const payment = parseNumber(paymentEl.value);
            const tax     = parseNumber(this.value);
            supplyEl.value = (payment - tax) >= 0 ? (payment - tax).toLocaleString() : '0';
            updateItemTotals();
        });
        tr.querySelector('.item-qty').addEventListener('input', updateItemTotals);
        const dateInput = tr.querySelector('.item-date');
        const approvalDate = document.getElementById('pu_approval_date').value || '';
        dateInput.value = approvalDate;
        dateInput.max = approvalDate;
        dateInput.addEventListener('change', updateOfficialDocument);
        dateInput.addEventListener('click', function() {
            try { this.showPicker(); } catch(e) {}
        });
        tr.querySelector('.item-desc').addEventListener('input', updateOfficialDocument);
        tr.querySelector('.item-remark').addEventListener('input', updateOfficialDocument);
        itemTableBody.appendChild(tr);
        updateItemTotals();
    };

    window.removeItemRow = function(btn) {
        const tr = btn.closest('tr');
        tr.remove();
        updateItemTotals();
    };

    // ============================================
    // 초기화
    // ============================================
    setTodayDate();
    addItemRow(); // 첫 행 자동 추가

    // 장비비일 때: 견적서 영역 표시
    if (purchaseType === 'equipment') {
        if (estimateSection) estimateSection.style.display = 'block';
    }

    setupFileUpload();
    setupClipboardPasteForPurchase();
    setupToggle();
    setupProjectInput();

    // 수정 모드 확인
    const urlParams = new URLSearchParams(window.location.search);
    const documentIdx = urlParams.get('documentIdx');

    // 신규 작성 모드: 지급종류 기본값을 '연구비카드'로 강제 설정 (BFCache 복원 방지)
    if (!documentIdx) {
        const defaultCardRadio = document.querySelector('input[name="paymentType"][value="card"]');
        if (defaultCardRadio) defaultCardRadio.checked = true;
    }

    setupPaymentTypeChange();
    toggleBankCopySection(); // 초기 그리드 열 수 + 통장사본 영역 설정

    if (documentIdx) {
        isEditMode = true;
        editingIdx = documentIdx;
        await loadDocument(documentIdx);
    }

    // 데이터 로드
    await Promise.all([loadEmployees(), loadMyProjects()]);

    // ============================================
    // 오늘 날짜 기본값
    // ============================================
    function setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('pu_approval_date').value = today;
    }

    document.getElementById('pu_approval_date')?.addEventListener('click', function() {
        try { this.showPicker(); } catch(e) {}
    });

    // ============================================
    // 직원 데이터 로드
    // ============================================
    async function loadEmployees() {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const users = await res.json();
                employees = users.map(u => ({
                    id: u.idx,
                    name: u.empName,
                    position: u.empPosition || '직급 미지정',
                    dept: u.empDept || '부서 미지정'
                }));
            }
        } catch (e) {
            console.error('직원 데이터 로드 오류:', e);
        }
    }

    // ============================================
    // 프로젝트 목록 로드
    // ============================================
    async function loadMyProjects() {
        try {
            const res = await fetch('/api/projects');
            if (res.ok) {
                projects = await res.json();
            }
        } catch (e) {
            console.error('프로젝트 로드 오류:', e);
        }
    }

    // ============================================
    // 참여기간 검증 헬퍼 (재료비/장비비 — 단일 날짜 검증)
    // ============================================

    function isMemberActiveOnDate(member, dateStr) {
        if (!dateStr) return true;
        if (!member || !member.participationStartDate) return false;
        if (member.participationStartDate > dateStr) return false;
        const end = member.participationEndDate;
        if (end && end < dateStr) return false;
        return true;
    }

    function formatMemberPeriod(member) {
        if (!member) return '';
        const s = member.participationStartDate || '?';
        const e = member.participationEndDate || '종료 미정';
        return `${s} ~ ${e}`;
    }

    function buildInactiveMemberHtml(member, dateLabel, dateValue, roleContext) {
        const name = member.name || member.employeeName || '(이름 없음)';
        const period = formatMemberPeriod(member);
        return `
            <div style="text-align:left; line-height:1.6;">
                <p style="margin-bottom:12px;">
                    <strong>${name}</strong> 님은
                    <strong>${dateValue}</strong> 에 본 프로젝트의 활성 참여연구원이 아닙니다.
                </p>
                <div style="background:#f1f5f9; padding:10px 14px; border-radius:6px; font-size:13px;">
                    <div>· ${dateLabel}: <strong>${dateValue}</strong></div>
                    <div>· ${name} 님 참여기간: <strong>${period}</strong></div>
                </div>
                <p style="margin-top:14px; margin-bottom:6px; font-weight:600;">다음 중 하나를 진행해주세요:</p>
                <ol style="margin:0; padding-left:20px; font-size:13px;">
                    <li>다른 ${roleContext}를 선택</li>
                    <li>${dateLabel}을 ${name} 님의 참여기간 내로 변경</li>
                    <li>프로젝트 관리에서 ${name} 님의 참여기간을 연장 (관리자 권한 필요)</li>
                </ol>
            </div>
        `;
    }

    async function showInactiveMemberAlert(member, dateLabel, dateValue, roleContext) {
        return Swal.fire({
            icon: 'warning',
            title: '참여기간 외 인원',
            html: buildInactiveMemberHtml(member, dateLabel, dateValue, roleContext),
            confirmButtonText: '확인',
            width: 540
        });
    }

    /**
     * 지출일 변경 시 현재 선택된 작성자(신청자) 가 새 날짜에 활성인지 재검증.
     * 비활성이 되었으면 사용자 안내 + 작성자 필드 비움.
     */
    async function revalidateApplicantAgainstApprovalDate() {
        const approvalDateStr = document.getElementById('pu_approval_date')?.value || '';
        if (!approvalDateStr) return;
        const currentApplicantIdx = document.getElementById('selectedApplicantIdx')?.value || '';
        if (!currentApplicantIdx) return;
        if (!projectMembers || projectMembers.length === 0) return;

        const memberRaw = projectMembers.find(m =>
            String(m.employeeIdx || m.userIdx || m.idx) === String(currentApplicantIdx)
        );
        if (!memberRaw) return;

        const memberObj = {
            name: memberRaw.employeeName || memberRaw.name || '',
            participationStartDate: memberRaw.participationStartDate || null,
            participationEndDate: memberRaw.participationEndDate || null
        };
        if (isMemberActiveOnDate(memberObj, approvalDateStr)) return;

        // 비활성 — 안내 후 작성자 필드 비움
        await showInactiveMemberAlert(memberObj, '지출일', approvalDateStr, '작성자');
        selectedApplicant = null;
        const applicantInput = document.getElementById('pu_applicant');
        const applicantIdxInput = document.getElementById('selectedApplicantIdx');
        if (applicantInput) applicantInput.value = '';
        if (applicantIdxInput) applicantIdxInput.value = '';
    }

    // ============================================
    // 프로젝트 참여인원 로드
    // ============================================
    async function loadProjectMembers(projectIdx) {
        if (!projectIdx) { projectMembers = []; return; }
        try {
            const res = await fetch(`/api/projects/${projectIdx}`);
            if (res.ok) {
                const project = await res.json();
                projectMembers = project.projectMembers || [];
            } else {
                projectMembers = [];
            }
        } catch (e) {
            console.error('프로젝트 참여인원 로드 오류:', e);
            projectMembers = [];
        }
    }

    // ============================================
    // 프로젝트 입력 클릭 → 모달 오픈
    // ============================================
    function setupProjectInput() {
        const projectInput = document.getElementById('pu_project');
        if (projectInput) {
            projectInput.addEventListener('click', () => window.openProjectModal());
        }
    }

    // ============================================
    // 지급종류 변경 → 공식문서 업데이트
    // ============================================
    function setupPaymentTypeChange() {
        document.querySelectorAll('input[name="paymentType"]').forEach(radio => {
            radio.addEventListener('change', function() {
                updateOfficialDocument();
                toggleBankCopySection();
            });
        });
    }

    /** 연구비이체 선택 시 통장사본 업로드 영역 표시/숨김 + 그리드 열 수 조정 */
    function toggleBankCopySection() {
        const isTransfer = document.querySelector('input[name="paymentType"]:checked')?.value === 'transfer';
        const bankCopySection = document.getElementById('bankCopySection');
        const attachmentGrid = document.getElementById('attachmentGrid');

        if (bankCopySection) bankCopySection.style.display = isTransfer ? '' : 'none';

        if (attachmentGrid) {
            let cols = 2; // 기본: 영수증 + 공식문서
            if (purchaseType === 'equipment') cols++;  // + 견적서
            if (isTransfer) cols++;                    // + 통장사본
            attachmentGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        }
    }

    // ============================================
    // 프로젝트 모달 (초성 검색 + 연도 필터)
    // ============================================
    let selectedYear = new Date().getFullYear();
    let currentSearchKeyword = '';
    const projectListEl = document.getElementById('projectList');
    const projectSearch = document.getElementById('projectSearch');

    function renderYearButtons() {
        const SERVICE_START = 2026;
        const currentYear = new Date().getFullYear();
        const recentStart = Math.max(currentYear - 2, SERVICE_START);
        const existing = document.getElementById('projectYearFilter');
        if (existing) existing.remove();
        const container = document.createElement('div');
        container.id = 'projectYearFilter';
        container.style.cssText = 'display:flex;gap:6px;padding:8px 0;border-bottom:1px solid #eee;flex-wrap:wrap;align-items:center;margin-bottom:10px;';
        const allBtn = document.createElement('button');
        allBtn.type = 'button';
        allBtn.textContent = '전체';
        const allActive = selectedYear === null;
        allBtn.style.cssText = `padding:3px 10px;border-radius:12px;border:1px solid ${allActive ? '#667eea' : '#ddd'};background:${allActive ? '#667eea' : 'white'};color:${allActive ? 'white' : '#555'};cursor:pointer;font-size:12px;`;
        allBtn.addEventListener('click', () => { selectedYear = null; renderYearButtons(); applyProjectFilters(); });
        container.appendChild(allBtn);
        for (let year = recentStart; year <= currentYear; year++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = year + '년';
            const isActive = selectedYear === year;
            btn.style.cssText = `padding:3px 10px;border-radius:12px;border:1px solid ${isActive ? '#667eea' : '#ddd'};background:${isActive ? '#667eea' : 'white'};color:${isActive ? 'white' : '#555'};cursor:pointer;font-size:12px;`;
            btn.addEventListener('click', () => { selectedYear = year; renderYearButtons(); applyProjectFilters(); });
            container.appendChild(btn);
        }
        if (projectListEl && projectListEl.parentNode) {
            projectListEl.parentNode.insertBefore(container, projectListEl);
        }
    }

    function applyProjectFilters() {
        let filtered = projects;
        if (selectedYear !== null) {
            filtered = filtered.filter(proj => {
                const s = proj.startDate ? new Date(proj.startDate).getFullYear() : null;
                const e = proj.endDate ? new Date(proj.endDate).getFullYear() : null;
                if (s !== null && e !== null) return s <= selectedYear && e >= selectedYear;
                if (s !== null) return s <= selectedYear;
                if (e !== null) return e >= selectedYear;
                return true;
            });
        }
        if (currentSearchKeyword) {
            filtered = filtered.filter(proj =>
                matchesSearch(proj.projectName || '', currentSearchKeyword) ||
                matchesSearch(proj.projectManagerName || '', currentSearchKeyword)
            );
        }
        renderProjectList(filtered, currentSearchKeyword);
    }

    function renderProjectList(list, keyword = '') {
        if (!projectListEl) return;
        projectListEl.innerHTML = '';
        if (!list || list.length === 0) {
            projectListEl.innerHTML = `<div class="modal-empty-state"><i class="fas fa-folder-open"></i><p>${keyword ? '검색 결과가 없습니다' : '등록된 프로젝트가 없습니다'}</p></div>`;
            return;
        }
        list.forEach(proj => {
            const item = document.createElement('div');
            item.className = 'modal-item';
            if (selectedProject && selectedProject.idx === proj.idx) item.classList.add('selected');
            const leader = proj.projectManagerName || '-';
            const memberCount = proj.memberCount != null ? proj.memberCount : (proj.projectMembers ? proj.projectMembers.length : 0);
            const startDate = proj.startDate ? new Date(proj.startDate).toLocaleDateString('ko-KR') : '-';
            const endDate = proj.endDate ? new Date(proj.endDate).toLocaleDateString('ko-KR') : '-';
            const budget = purchaseType === 'equipment' ? (proj.equipmentBudget || 0) : (proj.materialBudget || 0);
            const used = purchaseType === 'equipment' ? (proj.equipmentUsed || 0) : (proj.materialUsed || 0);
            const remaining = budget - used;
            const remainingFormatted = remaining.toLocaleString('ko-KR') + '원';
            const remainingStyle = remaining < 0 || (budget > 0 && remaining < budget * 0.1) ? 'color:#e03131;font-weight:600;' : 'color:#4361ee;font-weight:600;';
            item.innerHTML = `
                <div class="modal-item-info">
                    <div class="modal-item-name">${highlightText(proj.projectName, keyword)}</div>
                    <div class="modal-item-detail">
                        <div><i class="fas fa-user"></i> ${escapeHtml(leader)} (${memberCount}명)</div>
                        <div><i class="fas fa-calendar"></i> ${startDate} ~ ${endDate}</div>
                        <div><i class="fas fa-wallet"></i> 잔여 ${purchaseTypeLabel} : <span style="${remainingStyle}">${remainingFormatted}</span></div>
                    </div>
                </div>`;
            item.addEventListener('click', async function() {
                selectedProject = proj;
                document.getElementById('pu_project').value = proj.projectName;
                document.getElementById('selectedProjectIdx').value = proj.idx;
                await loadProjectMembers(proj.idx);
                await loadProjectCards(proj.idx);
                await setDefaultApplicant();
                closeProjectModal();
                updateOfficialDocument();
            });
            projectListEl.appendChild(item);
        });
    }

    if (projectSearch) {
        projectSearch.addEventListener('input', function() {
            currentSearchKeyword = this.value.trim();
            applyProjectFilters();
        });
    }

    window.openProjectModal = function() {
        const modal = document.getElementById('projectModal');
        if (modal) {
            selectedYear = new Date().getFullYear();
            currentSearchKeyword = '';
            modal.classList.add('show');
            if (projectSearch) projectSearch.value = '';
            renderYearButtons();
            applyProjectFilters();
        }
    };

    window.closeProjectModal = function() {
        const modal = document.getElementById('projectModal');
        if (modal) {
            modal.classList.remove('show');
            if (projectSearch) projectSearch.value = '';
        }
    };

    document.getElementById('projectModal')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeProjectModal();
    });

    // ============================================
    // 카드 목록 로드
    // ============================================
    async function loadProjectCards(projectIdx) {
        try {
            const res = await fetch(`/api/projects/${projectIdx}/cards`);
            if (res.ok) {
                projectCards = await res.json();
                if (projectCards.length > 0) {
                    selectedCard = projectCards[0];
                    const puCard = document.getElementById('pu_card');
                    puCard.value = selectedCard.cardName || selectedCard.cardAlias || selectedCard.cardNumber || '카드';
                    document.getElementById('selectedCardIdx').value = selectedCard.idx;
                } else {
                    selectedCard = null;
                    document.getElementById('pu_card').value = '';
                    document.getElementById('selectedCardIdx').value = '';
                    document.getElementById('pu_card').placeholder = '클릭하여 카드 선택';
                }
            } else {
                projectCards = [];
            }
        } catch (e) {
            console.error('카드 로드 오류:', e);
            projectCards = [];
        }
    }

    // ============================================
    // 카드 모달
    // ============================================
    function renderCardList(list, keyword = '') {
        const container = document.getElementById('cardList');
        if (!container) return;
        container.innerHTML = '';
        if (!list || list.length === 0) {
            container.innerHTML = `<div class="modal-empty-state"><i class="fas fa-credit-card"></i><p>${keyword ? '검색 결과가 없습니다' : '등록된 카드가 없습니다'}</p></div>`;
            return;
        }
        list.forEach(card => {
            const item = document.createElement('div');
            item.className = 'employee-item';
            if (selectedCard && selectedCard.idx === card.idx) item.classList.add('selected');
            const cardName = card.cardName || card.cardAlias || card.cardNumber || '카드';
            item.innerHTML = `
                <div class="employee-info">
                    <div class="employee-name"><i class="fas fa-credit-card" style="margin-right:6px;color:#667eea;"></i>${escapeHtml(cardName)}</div>
                    <div class="employee-detail">${escapeHtml(card.cardNumber || '')}</div>
                </div>`;
            item.addEventListener('click', function() {
                selectedCard = card;
                const puCard = document.getElementById('pu_card');
                puCard.value = cardName;
                document.getElementById('selectedCardIdx').value = card.idx;
                closeCardModal();
                updateOfficialDocument();
            });
            container.appendChild(item);
        });
    }

    // 카드 모달 내 프로젝트 목록 렌더링 (프로젝트 미선택 시)
    function renderProjectListInCardModal(searchText) {
        const container = document.getElementById('cardList');
        if (!container) return;

        let filtered = projects;
        if (searchText) {
            filtered = projects.filter(proj =>
                matchesSearch(proj.projectName || '', searchText)
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-search" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                    ${searchText ? '검색 결과가 없습니다.' : '등록된 프로젝트가 없습니다.'}
                </div>
            `;
            return;
        }

        const header = `
            <div class="convenience-notice">
                <div class="notice-icon"><i class="fas fa-lightbulb"></i></div>
                <div class="notice-content">
                    <div class="notice-title">프로젝트를 먼저 선택해주세요</div>
                    <div class="notice-desc">프로젝트를 선택하면 카드 목록이 표시됩니다</div>
                </div>
            </div>
        `;

        const items = filtered.map(proj => `
            <div class="project-item-in-attendee" data-project-idx="${proj.idx}">
                <div class="project-item-icon"><i class="fas fa-folder"></i></div>
                <div class="project-item-info">
                    <div class="project-item-name">${highlightText(proj.projectName || '', searchText)}</div>
                </div>
                <div class="project-item-arrow"><i class="fas fa-chevron-right"></i></div>
            </div>
        `).join('');

        container.innerHTML = header + items;

        container.querySelectorAll('.project-item-in-attendee').forEach(item => {
            item.addEventListener('click', async function() {
                const projectIdx = this.getAttribute('data-project-idx');
                const proj = projects.find(p => String(p.idx) === String(projectIdx));
                if (!proj) return;

                selectedProject = proj;
                document.getElementById('pu_project').value = proj.projectName;
                document.getElementById('selectedProjectIdx').value = proj.idx;

                await loadProjectMembers(proj.idx);
                await loadProjectCards(proj.idx);
                await setDefaultApplicant();

                updateOfficialDocument();
                renderCardList(projectCards);
                const cardSearchEl = document.getElementById('cardSearch');
                if (cardSearchEl) cardSearchEl.value = '';
            });
        });
    }

    window.openCardModal = function() {
        const modal = document.getElementById('cardModal');
        if (!modal) return;
        modal.classList.add('show');
        const cardSearchEl = document.getElementById('cardSearch');
        if (cardSearchEl) cardSearchEl.value = '';

        if (!selectedProject) {
            renderProjectListInCardModal('');
        } else {
            renderCardList(projectCards);
        }
    };

    window.closeCardModal = function() {
        document.getElementById('cardModal')?.classList.remove('show');
    };

    document.getElementById('cardModal')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeCardModal();
    });

    // 카드 모달 검색 — 프로젝트 미선택 시 프로젝트 필터, 선택 시 카드 필터
    const cardSearchInput = document.getElementById('cardSearch');
    if (cardSearchInput) {
        cardSearchInput.addEventListener('input', function() {
            const keyword = this.value.trim();
            if (!selectedProject) {
                renderProjectListInCardModal(keyword);
            } else {
                const filtered = projectCards.filter(c =>
                    matchesSearch(c.cardName || c.cardAlias || '', keyword) ||
                    matchesSearch(c.cardNumber || '', keyword)
                );
                renderCardList(filtered, keyword);
            }
        });
    }

    // ============================================
    // 신청자 모달
    // ============================================
    // 신청자 중복 체크 헬퍼
    async function checkApplicantDuplicate(applicantId, date, projectIdx) {
        try {
            let url = `/api/receipt-common/check-duplicate?date=${date}&attendeeIdx=${applicantId}&projectIdx=${projectIdx}`;
            if (editingIdx) {
                const docType = purchaseType === 'equipment' ? 'EQP' : 'MAT';
                url += `&excludeReceiptIdx=${editingIdx}&excludeDocumentType=${docType}`;
            }
            const response = await fetch(url);
            if (!response.ok) return false;
            const data = await response.json();
            return Array.isArray(data) && data.length > 0;
        } catch { return false; }
    }

    // 신청자 설정 공통 헬퍼
    function applyApplicant(memberId, memberName) {
        selectedApplicant = { idx: memberId, name: memberName };
        document.getElementById('pu_applicant').value = memberName;
        document.getElementById('selectedApplicantIdx').value = memberId;
    }

    // 참여인력 중 default 신청자 자동 선택
    async function setDefaultApplicant() {
        if (!projectMembers || projectMembers.length === 0) return;

        // 1순위: 로그인 사용자가 프로젝트 참여인력인 경우
        const loggedInUserIdx = window.CURRENT_USER?.idx;
        if (loggedInUserIdx) {
            const loggedInMember = projectMembers.find(m =>
                String(m.employeeIdx || m.userIdx || m.idx) === String(loggedInUserIdx)
            );
            if (loggedInMember) {
                const dateInput = document.getElementById('pu_approval_date');
                const projectIdx = document.getElementById('selectedProjectIdx')?.value;
                let available = true;
                if (dateInput?.value && projectIdx) {
                    const isDup = await checkApplicantDuplicate(loggedInUserIdx, dateInput.value, projectIdx);
                    if (isDup) available = false;
                }
                if (available) {
                    applyApplicant(
                        loggedInMember.employeeIdx || loggedInMember.userIdx || loggedInMember.idx,
                        loggedInMember.employeeName || loggedInMember.name || ''
                    );
                    return;
                }
            }
        }

        // 2순위: 밑에서 5번째 직급
        const sorted = [...projectMembers].sort((a, b) =>
            (a.employeePositionSortOrder || 999) - (b.employeePositionSortOrder || 999)
        );
        const targetIdx = sorted.length > 5 ? sorted.length - 5 : sorted.length - 1;
        const member = sorted[targetIdx];
        if (!member) return;

        applyApplicant(
            member.employeeIdx || member.userIdx || member.idx,
            member.employeeName || member.name || ''
        );
    }

    function getProjectMembers() {
        if (!selectedProject) return [];
        if (projectMembers.length > 0) {
            return projectMembers.map(m => ({
                id: m.employeeIdx || m.userIdx || m.idx,
                name: m.employeeName || m.userName || m.empName || m.name,
                dept: m.employeeDeptName || m.dept || m.empDept || '',
                position: m.employeePositionName || m.position || m.empPosition || '',
                participationStartDate: m.participationStartDate || null,
                participationEndDate: m.participationEndDate || null
            }));
        }
        return employees;
    }

    function renderApplicantList(list, keyword = '') {
        const container = document.getElementById('applicantList');
        if (!container) return;
        container.innerHTML = '';
        if (!list || list.length === 0) {
            container.innerHTML = `<div class="modal-empty-state"><i class="fas fa-user"></i><p>${keyword ? '검색 결과가 없습니다' : '프로젝트 참여인원이 없습니다'}</p></div>`;
            return;
        }
        const approvalDateStr = document.getElementById('pu_approval_date')?.value || '';
        list.forEach(member => {
            const item = document.createElement('div');
            item.className = 'employee-item';
            const isSelected = selectedApplicant && selectedApplicant.idx === member.id;
            if (isSelected) item.classList.add('selected');

            // 참여기간 검증 (지출일 기준)
            const isInactive = !isMemberActiveOnDate(member, approvalDateStr);
            let inactiveBadge = '';
            if (isInactive && approvalDateStr) {
                const tip = `참여기간: ${formatMemberPeriod(member)}`;
                inactiveBadge = `<span style="background:#e5e7eb; color:#4b5563; padding:2px 8px; border-radius:4px; font-size:11px; margin-left:8px; white-space:nowrap;" data-tip="${tip}"><i class="fas fa-calendar-times"></i> 참여기간 외</span>`;
            }
            if (isInactive) {
                item.classList.add('duplicate-disabled');
                item.style.cssText = 'opacity:0.6; cursor:not-allowed;';
            }

            item.innerHTML = `
                <div class="employee-info">
                    <div class="employee-name"><i class="fas fa-user" style="margin-right:6px;color:#667eea;"></i>${escapeHtml(member.name)}${inactiveBadge}</div>
                    <div class="employee-detail">${escapeHtml(member.dept || '')} · ${escapeHtml(member.position || '')}</div>
                </div>
                ${isSelected ? '<i class="fas fa-check-circle" style="color: #10b981; font-size: 18px; margin-left: auto;"></i>' : ''}`;

            item.addEventListener('click', async function() {
                // 참여기간 검증
                if (!approvalDateStr) {
                    await Swal.fire({ icon: 'warning', title: '지출일을 먼저 입력해주세요.' });
                    return;
                }
                if (isInactive) {
                    await showInactiveMemberAlert(member, '지출일', approvalDateStr, '작성자');
                    return;
                }
                selectedApplicant = { idx: member.id, name: member.name };
                document.getElementById('pu_applicant').value = member.name;
                document.getElementById('selectedApplicantIdx').value = member.id;
                closeApplicantModal();
                updateOfficialDocument();
            });
            container.appendChild(item);
        });
    }

    // 신청자 모달 내 프로젝트 목록 렌더링 (프로젝트 미선택 시)
    function renderProjectListInApplicantModal(searchText) {
        const container = document.getElementById('applicantList');
        if (!container) return;

        let filtered = projects;
        if (searchText) {
            filtered = projects.filter(proj =>
                matchesSearch(proj.projectName || '', searchText)
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-search" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                    ${searchText ? '검색 결과가 없습니다.' : '등록된 프로젝트가 없습니다.'}
                </div>
            `;
            return;
        }

        const header = `
            <div class="convenience-notice">
                <div class="notice-icon"><i class="fas fa-lightbulb"></i></div>
                <div class="notice-content">
                    <div class="notice-title">프로젝트를 먼저 선택해주세요</div>
                    <div class="notice-desc">프로젝트를 선택하면 신청자 목록이 표시됩니다</div>
                </div>
            </div>
        `;

        const items = filtered.map(proj => `
            <div class="project-item-in-attendee" data-project-idx="${proj.idx}">
                <div class="project-item-icon"><i class="fas fa-folder"></i></div>
                <div class="project-item-info">
                    <div class="project-item-name">${highlightText(proj.projectName || '', searchText)}</div>
                </div>
                <div class="project-item-arrow"><i class="fas fa-chevron-right"></i></div>
            </div>
        `).join('');

        container.innerHTML = header + items;

        container.querySelectorAll('.project-item-in-attendee').forEach(item => {
            item.addEventListener('click', async function() {
                const projectIdx = this.getAttribute('data-project-idx');
                const proj = projects.find(p => String(p.idx) === String(projectIdx));
                if (!proj) return;

                selectedProject = proj;
                document.getElementById('pu_project').value = proj.projectName;
                document.getElementById('selectedProjectIdx').value = proj.idx;

                await loadProjectMembers(proj.idx);
                await loadProjectCards(proj.idx);
                await setDefaultApplicant();

                updateOfficialDocument();
                renderApplicantList(getProjectMembers());
                const applicantSearchEl = document.getElementById('applicantSearch');
                if (applicantSearchEl) applicantSearchEl.value = '';
            });
        });
    }

    window.openApplicantModal = function() {
        const modal = document.getElementById('applicantModal');
        if (!modal) return;
        modal.classList.add('show');
        const applicantSearchEl = document.getElementById('applicantSearch');
        if (applicantSearchEl) applicantSearchEl.value = '';

        if (!selectedProject) {
            renderProjectListInApplicantModal('');
        } else {
            renderApplicantList(getProjectMembers());
        }
    };

    window.closeApplicantModal = function() {
        document.getElementById('applicantModal')?.classList.remove('show');
    };

    document.getElementById('applicantModal')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeApplicantModal();
    });

    // 신청자 모달 검색 — 프로젝트 미선택 시 프로젝트 필터, 선택 시 신청자 필터
    const applicantSearchInput = document.getElementById('applicantSearch');
    if (applicantSearchInput) {
        applicantSearchInput.addEventListener('input', function() {
            const keyword = this.value.trim();
            if (!selectedProject) {
                renderProjectListInApplicantModal(keyword);
            } else {
                const members = getProjectMembers();
                const filtered = members.filter(m =>
                    matchesSearch((m.name || '') + (m.dept || '') + (m.position || ''), keyword)
                );
                renderApplicantList(filtered, keyword);
            }
        });
    }

    function formatNumberInput(val) {
        const num = val.replace(/[^0-9]/g, '');
        if (!num) return '';
        return Number(num).toLocaleString();
    }

    function parseNumber(val) {
        if (!val) return 0;
        return parseInt(val.replace(/,/g, ''), 10) || 0;
    }

    function updateItemTotals() {
        let totalPayment = 0;
        let totalSupply = 0;
        let totalTax = 0;

        itemTableBody.querySelectorAll('tr').forEach(tr => {
            totalPayment += parseNumber(tr.querySelector('.item-payment')?.value);
            totalSupply += parseNumber(tr.querySelector('.item-supply')?.value);
            totalTax += parseNumber(tr.querySelector('.item-tax')?.value);
        });

        const totalPaymentEl = document.getElementById('totalPaymentAmount');
        if (totalPaymentEl) totalPaymentEl.textContent = totalPayment.toLocaleString();
        document.getElementById('totalSupplyAmount').textContent = totalSupply.toLocaleString();
        document.getElementById('totalTaxAmount').textContent = totalTax.toLocaleString();

        // 총 공급대가 = 결제대금 합계
        document.getElementById('pu_amount').value = totalPayment > 0 ? totalPayment.toLocaleString() + '원' : '';

        updateOfficialDocument();
    }

    function collectItems() {
        const items = [];
        itemTableBody.querySelectorAll('tr').forEach((tr, i) => {
            const itemDate = tr.querySelector('.item-date')?.value || null;
            const itemDesc = tr.querySelector('.item-desc')?.value || '';
            const quantity = parseInt(tr.querySelector('.item-qty')?.value) || null;
            const taxType = tr.querySelector('.item-taxtype')?.value || '과세';
            const paymentAmount = parseNumber(tr.querySelector('.item-payment')?.value);
            const supplyAmount = parseNumber(tr.querySelector('.item-supply')?.value);
            const taxAmount = parseNumber(tr.querySelector('.item-tax')?.value);
            const remark = tr.querySelector('.item-remark')?.value || '';

            if (itemDesc || paymentAmount > 0 || supplyAmount > 0) {
                items.push({
                    itemDate: itemDate || null,
                    itemDesc,
                    quantity,
                    taxType,
                    paymentAmount: paymentAmount || null,
                    supplyAmount: supplyAmount || null,
                    taxAmount: taxAmount || null,
                    remark,
                    sortOrder: i
                });
            }
        });
        return items;
    }

    // ============================================
    // 공식 문서 자동 업데이트
    // ============================================
    function updateOfficialDocument() {
        const projectName = document.getElementById('pu_project').value || '';
        const managerName = (selectedProject && selectedProject.projectManagerName) ? selectedProject.projectManagerName : '';
        const applicantName = (selectedApplicant && selectedApplicant.name) || document.getElementById('pu_applicant').value || '';
        const approvalDate = document.getElementById('pu_approval_date').value || '';
        const title = document.getElementById('pu_title').value || '';
        const content = document.getElementById('pu_content').value || '';

        // 지급종류
        const paymentType = document.querySelector('input[name="paymentType"]:checked')?.value || 'card';
        const isCard = paymentType === 'card';

        // 결재란 — 서명칸은 자필서명용으로 비워둠

        // 기본 필드 자동입력
        document.querySelectorAll('.pu-auto-project').forEach(el => {
            el.textContent = projectName;
            const len = (projectName || '').length;
            if (len > 35) { el.style.fontSize = '8px'; }
            else if (len > 25) { el.style.fontSize = '9px'; }
            else if (len > 15) { el.style.fontSize = '10px'; }
            else { el.style.fontSize = ''; }
        });
        document.querySelectorAll('.pu-auto-manager').forEach(el => el.textContent = managerName);
        document.querySelectorAll('.pu-auto-applicant').forEach(el => el.textContent = applicantName);
        document.querySelectorAll('.pu-auto-title').forEach(el => el.textContent = title);
        document.querySelectorAll('.pu-auto-content').forEach(el => el.textContent = content);

        // 품의일자 포맷
        if (approvalDate) {
            const d = new Date(approvalDate);
            const formatted = `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`;
            document.querySelectorAll('.pu-auto-approval-date').forEach(el => el.textContent = formatted);
        } else {
            document.querySelectorAll('.pu-auto-approval-date').forEach(el => el.textContent = '');
        }

        // 지급종류
        document.querySelectorAll('.pu-auto-payment-card').forEach(el => el.textContent = isCard ? '○' : '　');
        document.querySelectorAll('.pu-auto-payment-transfer').forEach(el => el.textContent = isCard ? '　' : '○');

        // 품의 내역서 공식문서 테이블 업데이트
        updateDocItemTable();

        // 인쇄 버튼 표시 여부 (필수필드 검증과 동일한 로직 사용)
        validateRequiredFields();
    }

    function updateDocItemTable() {
        if (!docItemTableBody) return;

        const rows = itemTableBody.querySelectorAll('tr');
        let totalSupply = 0;
        let totalTax = 0;
        let html = '';

        rows.forEach(tr => {
            const itemDate = tr.querySelector('.item-date')?.value || '';
            const itemDesc = tr.querySelector('.item-desc')?.value || '';
            const qty = tr.querySelector('.item-qty')?.value || '';
            const supply = parseNumber(tr.querySelector('.item-supply')?.value);
            const tax = parseNumber(tr.querySelector('.item-tax')?.value);
            const remark = tr.querySelector('.item-remark')?.value || '';

            if (itemDesc || supply > 0) {
                totalSupply += supply;
                totalTax += tax;
                const rowTotal = supply + tax;
                const dateFormatted = itemDate ? formatDateSlash(itemDate) : '';
                html += `
                    <tr>
                        <td style="text-align:center; height:40px; font-size:12px;">${escapeHtml(dateFormatted)}</td>
                        <td style="padding:8px;">${escapeHtml(itemDesc)}</td>
                        <td style="text-align:center;">${escapeHtml(qty)}</td>
                        <td style="text-align:right; padding-right:8px;">${supply > 0 ? supply.toLocaleString() : ''}</td>
                        <td style="text-align:right; padding-right:8px;">${tax > 0 ? tax.toLocaleString() : (supply > 0 ? '0' : '')}</td>
                        <td style="text-align:right; padding-right:8px; font-weight:600;">${rowTotal > 0 ? rowTotal.toLocaleString() : ''}</td>
                        <td style="padding:8px; font-size:12px;">${escapeHtml(remark)}</td>
                    </tr>
                `;
            }
        });

        docItemTableBody.innerHTML = html;

        const totalPayment = totalSupply + totalTax;
        document.querySelectorAll('.pu-auto-total-supply').forEach(el => {
            el.textContent = totalSupply > 0 ? totalSupply.toLocaleString() : '';
        });
        document.querySelectorAll('.pu-auto-total-tax').forEach(el => {
            el.textContent = totalTax > 0 ? totalTax.toLocaleString() : '';
        });
        document.querySelectorAll('.pu-auto-total-payment').forEach(el => {
            el.textContent = totalPayment > 0 ? totalPayment.toLocaleString() : '';
        });
    }

    function formatDateSlash(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    }

    // 폼 입력 change/input 이벤트 → 공식문서 업데이트
    ['pu_approval_date', 'pu_content'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateOfficialDocument);
            el.addEventListener('change', updateOfficialDocument);
        }
    });

    // ============================================
    // 파일 업로드 설정
    // ============================================
    function setupFileUpload() {
        setupSingleFileArea(receiptInput, receiptFileList, receiptUploadArea, selectedReceiptFiles, 'receipt');
        setupSingleFileArea(documentInput, documentFileList, documentUploadArea, selectedDocumentFiles, 'document');
        if (purchaseType === 'equipment') {
            setupSingleFileArea(estimateInput, estimateFileList, estimateUploadArea, selectedEstimateFiles, 'estimate');
        }
        const bankCopyInput = document.getElementById('bankCopyInput');
        const bankCopyFileList = document.getElementById('bankCopyFileList');
        const bankCopyUploadArea = document.getElementById('bankCopyUploadArea');
        if (bankCopyInput && bankCopyFileList && bankCopyUploadArea) {
            setupSingleFileArea(bankCopyInput, bankCopyFileList, bankCopyUploadArea, selectedBankCopyFiles, 'bankCopy');
        }
    }

    function setupSingleFileArea(input, listEl, area, fileArray, type) {
        input.addEventListener('change', function() {
            Array.from(this.files).forEach(f => addFileToList(f, fileArray, listEl));
            this.value = '';
        });

        area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
        area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
        area.addEventListener('drop', e => {
            e.preventDefault();
            area.classList.remove('drag-over');
            Array.from(e.dataTransfer.files).forEach(f => addFileToList(f, fileArray, listEl));
        });
    }

    // ============================================
    // 클립보드 이미지 붙여넣기 (패턴 D — 다중 슬롯 활성 추적)
    // 영수증/견적서/통장사본 3개 슬롯 paste 가능, 영수증이 기본 활성
    // 공식문서는 paste 비대상 (PDF/HWP)
    // ============================================

    function getPasteSlots() {
        // 슬롯 정의 — 가시 상태인 슬롯만 반환
        const slots = {
            receipt: {
                area: document.getElementById('receiptUploadArea'),
                list: receiptFileList,
                files: selectedReceiptFiles,
                label: '영수증',
            },
        };
        if (purchaseType === 'equipment') {
            const estArea = document.getElementById('estimateUploadArea');
            if (estArea && estArea.offsetParent !== null) {
                slots.estimate = {
                    area: estArea,
                    list: estimateFileList,
                    files: selectedEstimateFiles,
                    label: '견적서',
                };
            }
        }
        const bankArea = document.getElementById('bankCopyUploadArea');
        const bankList = document.getElementById('bankCopyFileList');
        if (bankArea && bankArea.offsetParent !== null && bankList) {
            slots.bankCopy = {
                area: bankArea,
                list: bankList,
                files: selectedBankCopyFiles,
                label: '거래처 통장사본',
            };
        }
        return slots;
    }

    function setActivePurchaseSlot(slotKey) {
        const slots = getPasteSlots();
        if (!slots[slotKey]) return;
        activePurchaseSlot = slotKey;
        // 모든 paste 가능 슬롯에서 .paste-active 제거 후 현재 슬롯에만 추가
        ['receipt', 'estimate', 'bankCopy'].forEach(k => {
            const a = document.getElementById(
                k === 'receipt' ? 'receiptUploadArea' :
                k === 'estimate' ? 'estimateUploadArea' :
                'bankCopyUploadArea'
            );
            if (a) a.classList.remove('paste-active');
        });
        slots[slotKey].area.classList.add('paste-active');
    }

    function setupClipboardPasteForPurchase() {
        // 활성 슬롯 전환 click 리스너
        const wireSlot = (key, areaId) => {
            const area = document.getElementById(areaId);
            if (!area) return;
            area.addEventListener('click', () => setActivePurchaseSlot(key));
        };
        wireSlot('receipt', 'receiptUploadArea');
        wireSlot('estimate', 'estimateUploadArea');
        wireSlot('bankCopy', 'bankCopyUploadArea');

        // 공식문서 영역 click → 안내 토스트 (활성 변경 X) — §7-3 매번 표시
        const docArea = document.getElementById('documentUploadArea');
        if (docArea) {
            docArea.addEventListener('click', () => {
                if (typeof window.showToast === 'function') {
                    window.showToast('공식문서는 이미지 붙여넣기 대상이 아닙니다. PDF/HWP는 파일 선택으로 업로드하세요.', 'info');
                }
            });
        }

        // paste 힌트 뱃지 — 3개 슬롯 각각에 주입
        if (typeof window.ensurePasteHint === 'function') {
            ['receiptUploadArea', 'estimateUploadArea', 'bankCopyUploadArea'].forEach(id => {
                const el = document.getElementById(id);
                if (el) window.ensurePasteHint(el, { text: '여기에 Ctrl+V 붙여넣기' });
            });
        }

        // 페이지 진입 시 영수증 기본 활성
        setActivePurchaseSlot('receipt');

        if (typeof window.setupClipboardImagePaste !== 'function') return;

        window.setupClipboardImagePaste({
            resolveTarget: () => {
                const slots = getPasteSlots();
                const slot = slots[activePurchaseSlot] || slots.receipt;
                if (!slot) return null;
                return {
                    addFile: (file) => {
                        const before = slot.files.length;
                        addFileToList(file, slot.files, slot.list);
                        const added = slot.files.length > before;
                        if (added) {
                            slot.area.classList.remove('paste-flash');
                            void slot.area.offsetWidth;
                            slot.area.classList.add('paste-flash');
                        }
                        return added;
                    },
                    label: slot.label,
                };
            },
        });
    }

    function addFileToList(file, fileArray, listEl) {
        if (file.size > 10 * 1024 * 1024) {
            Swal.fire({ icon: 'warning', title: '파일 크기 초과', text: '10MB 이하의 파일만 업로드 가능합니다.' });
            return;
        }
        if (fileArray.length >= 5) {
            Swal.fire({ icon: 'warning', title: '파일 수 초과', text: '최대 5개까지 업로드 가능합니다.' });
            return;
        }
        fileArray.push(file);
        renderFileList(fileArray, listEl);
    }

    function renderFileList(fileArray, listEl) {
        // 기존 첨부파일도 함께 렌더링
        const bankCopyFileList = document.getElementById('bankCopyFileList');
        let existingArr = [];
        let type = '';
        if (listEl === receiptFileList) {
            existingArr = existingReceiptAttachments; type = 'receipt';
        } else if (listEl === estimateFileList) {
            existingArr = existingEstimateAttachments; type = 'estimate';
        } else if (listEl === bankCopyFileList) {
            existingArr = existingBankCopyAttachments; type = 'bankCopy';
        } else if (listEl === documentFileList) {
            existingArr = existingDocumentAttachments; type = 'document';
        }
        renderExistingFileList(existingArr, listEl, fileArray, type);
    }

    window.removeNewFile = function(idx, listId) {
        let arr, listEl;
        if (listId === 'receiptFileList') {
            arr = selectedReceiptFiles; listEl = receiptFileList;
        } else if (listId === 'estimateFileList') {
            arr = selectedEstimateFiles; listEl = estimateFileList;
        } else if (listId === 'bankCopyFileList') {
            arr = selectedBankCopyFiles; listEl = document.getElementById('bankCopyFileList');
        } else {
            arr = selectedDocumentFiles; listEl = documentFileList;
        }
        arr.splice(idx, 1);
        renderFileList(arr, listEl);
    };

    function renderExistingFiles() {
        renderExistingFileList(existingReceiptAttachments, receiptFileList, selectedReceiptFiles, 'receipt');
        renderExistingFileList(existingDocumentAttachments, documentFileList, selectedDocumentFiles, 'document');
        if (purchaseType === 'equipment') {
            renderExistingFileList(existingEstimateAttachments, estimateFileList, selectedEstimateFiles, 'estimate');
        }
        const bankCopyFileList = document.getElementById('bankCopyFileList');
        if (bankCopyFileList) {
            renderExistingFileList(existingBankCopyAttachments, bankCopyFileList, selectedBankCopyFiles, 'bankCopy');
        }
    }

    function renderExistingFileList(existingArr, listEl, newArr, type) {
        if (typeof window.revokeChipThumbs === 'function') window.revokeChipThumbs(listEl);
        listEl.innerHTML = '';
        existingArr.forEach(a => {
            const item = document.createElement('div');
            item.className = 'file-item existing-file';
            item.dataset.attachmentId = a.idx;
            item.innerHTML = `
                <div class="file-name" style="cursor:pointer;" onclick="downloadPurchaseAttachment(${a.idx})">
                    <i class="fas fa-file"></i>
                    <span>${escapeHtml(a.originalFilename)}</span>
                </div>
                <span class="file-size">${formatFileSize(a.fileSize)}</span>
                <button class="btn-download-file" onclick="downloadPurchaseAttachment(${a.idx})"><i class="fas fa-download"></i></button>
                <button class="btn-remove-file" onclick="removeExistingFile(${a.idx}, '${type}')"><i class="fas fa-times"></i></button>
            `;
            if (typeof window.attachThumbToFileItem === 'function') {
                window.attachThumbToFileItem(item, `/api/receipt-purchases/attachments/${a.idx}/download`, a.originalFilename);
            }
            listEl.appendChild(item);
        });
        newArr.forEach((f, i) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <div class="file-name">
                    <i class="fas fa-file"></i>
                    <span>${escapeHtml(f.name)}</span>
                </div>
                <span class="file-size">${formatFileSize(f.size)}</span>
                <button class="btn-remove-file" onclick="removeNewFile(${i}, '${listEl.id}')"><i class="fas fa-times"></i></button>
            `;
            if (typeof window.attachThumbToFileItem === 'function') {
                window.attachThumbToFileItem(item, f);
            }
            listEl.appendChild(item);
        });
    }

    window.downloadPurchaseAttachment = function(attachmentIdx) {
        window.location.href = `/api/receipt-purchases/attachments/${attachmentIdx}/download`;
    };

    window.removeExistingFile = function(attachmentId, type) {
        if (!deletedAttachmentIds.includes(attachmentId)) {
            deletedAttachmentIds.push(attachmentId);
        }
        if (type === 'receipt') {
            existingReceiptAttachments = existingReceiptAttachments.filter(a => a.idx !== attachmentId);
            renderExistingFileList(existingReceiptAttachments, receiptFileList, selectedReceiptFiles, 'receipt');
        } else if (type === 'document') {
            existingDocumentAttachments = existingDocumentAttachments.filter(a => a.idx !== attachmentId);
            renderExistingFileList(existingDocumentAttachments, documentFileList, selectedDocumentFiles, 'document');
        } else if (type === 'estimate') {
            existingEstimateAttachments = existingEstimateAttachments.filter(a => a.idx !== attachmentId);
            renderExistingFileList(existingEstimateAttachments, estimateFileList, selectedEstimateFiles, 'estimate');
        } else if (type === 'bankCopy') {
            existingBankCopyAttachments = existingBankCopyAttachments.filter(a => a.idx !== attachmentId);
            const bankCopyFileList = document.getElementById('bankCopyFileList');
            if (bankCopyFileList) {
                renderExistingFileList(existingBankCopyAttachments, bankCopyFileList, selectedBankCopyFiles, 'bankCopy');
            }
        }
    };

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + 'B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
        return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
    }

    // ============================================
    // 미리보기 토글
    // ============================================
    function setupToggle() {
        if (!toggleBtn || !formWrapper) return;
        toggleBtn.addEventListener('click', function() {
            formWrapper.classList.toggle('collapsed');
            toggleBtn.classList.toggle('active');
        });
    }

    // ============================================
    // 저장하기
    // ============================================
    submitBtn.addEventListener('click', async function() {
        if (!validateForm()) return;

        const confirmed = await Swal.fire({
            title: isEditMode ? '수정하시겠습니까?' : '저장하시겠습니까?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: isEditMode ? '수정' : '저장',
            cancelButtonText: '취소',
            confirmButtonColor: '#667eea'
        });
        if (!confirmed.isConfirmed) return;

        const formData = buildFormData();

        try {
            showLoading();
            let res;
            if (isEditMode) {
                res = await fetch(`/api/receipt-purchases/${editingIdx}`, {
                    method: 'PUT',
                    body: formData
                });
            } else {
                res = await fetch('/api/receipt-purchases', {
                    method: 'POST',
                    body: formData
                });
            }

            if (res.ok) {
                const data = await res.json();
                hideLoading();
                if (window.SignatureRender && !isEditMode) {
                    SignatureRender.afterSave({
                        documentIdx: data.documentIdx || data.idx,
                        redirectUrl: '/project/documents',
                        successMessage: `${purchaseTypeLabel} 증빙이 저장되었습니다.`
                    });
                } else {
                    await Swal.fire({
                        icon: 'success',
                        title: isEditMode ? '수정 완료' : '저장 완료',
                        text: `${purchaseTypeLabel} 증빙이 ${isEditMode ? '수정' : '저장'}되었습니다.`,
                        confirmButtonColor: '#667eea'
                    });

                    window.location.href = '/project/documents';
                }
            } else {
                hideLoading();
                const err = await res.json().catch(() => ({}));
                console.error('[저장 실패] 구매 증빙 서버 응답', res.status, err);
                showSaveFailure('구매 증빙');
            }
        } catch (e) {
            hideLoading();
            console.error('[저장 실패] 구매 증빙', e);
            showSaveFailure('구매 증빙');
        }
    });

    function buildFormData() {
        const items = collectItems();
        const paymentType = document.querySelector('input[name="paymentType"]:checked')?.value || 'card';
        const totalPaymentEl = document.getElementById('totalPaymentAmount');
        const totalPayment = totalPaymentEl
            ? parseNumber(totalPaymentEl.textContent)
            : parseNumber(document.getElementById('totalSupplyAmount').textContent);

        const data = {
            projectIdx: parseInt(document.getElementById('selectedProjectIdx').value) || null,
            cardIdx: parseInt(document.getElementById('selectedCardIdx').value) || null,
            authorIdx: parseInt(document.getElementById('selectedApplicantIdx').value) || null,
            purchaseType: purchaseType,
            approvalDate: document.getElementById('pu_approval_date').value || null,
            documentTitle: document.getElementById('pu_title').value || null,
            documentContent: document.getElementById('pu_content').value || null,
            paymentType: paymentType,
            totalAmount: totalPayment || null,
            documentIdx: parseInt(document.getElementById('pu_document_idx').value) || null,
            items: items
        };

        const formData = new FormData();
        formData.append('data', JSON.stringify(data));

        selectedReceiptFiles.forEach(f => formData.append('receiptFiles', f));
        selectedDocumentFiles.forEach(f => formData.append('documentFiles', f));
        if (purchaseType === 'equipment') {
            selectedEstimateFiles.forEach(f => formData.append('estimateFiles', f));
        }
        if (paymentType === 'transfer') {
            selectedBankCopyFiles.forEach(f => formData.append('bankCopyFiles', f));
        }

        if (isEditMode && deletedAttachmentIds.length > 0) {
            formData.append('deletedAttachmentIds', JSON.stringify(deletedAttachmentIds));
        }

        return formData;
    }

    function validateForm() {
        validateRequiredFields();

        // 1) .error 클래스 검증 (레거시 catch-all)
        const hasError = document.querySelector(
            '.form-input.error, .form-textarea.error, .item-table.error, .item-desc.error, .item-payment.error'
        );
        if (hasError) {
            const firstError = document.querySelector('.form-input.error, .form-textarea.error, .item-desc.error, .item-payment.error');
            if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                Swal.fire({ icon: 'warning', title: '입력 오류', text: '필수 항목을 모두 입력해주세요.' });
            }, 150);
            return false;
        }

        // 2) 필드별 개별 검증 (위→아래 순서, 사용자 친화 메시지)
        // 과제명
        if (!document.getElementById('selectedProjectIdx').value) {
            document.getElementById('pu_project')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            Swal.fire({ icon: 'warning', title: '과제명을 선택해주세요', text: '과제명은 필수 입력 항목입니다.' });
            return false;
        }

        // 사용카드
        if (!document.getElementById('selectedCardIdx').value) {
            document.getElementById('pu_card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            Swal.fire({ icon: 'warning', title: '사용카드를 선택해주세요', text: '사용카드는 필수 입력 항목입니다.' });
            return false;
        }

        // 신청자
        if (!document.getElementById('selectedApplicantIdx').value) {
            document.getElementById('pu_applicant')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            Swal.fire({ icon: 'warning', title: '신청자를 선택해주세요', text: '신청자는 필수 입력 항목입니다.' });
            return false;
        }

        // 품의 내용
        const contentInput = document.getElementById('pu_content');
        if (!contentInput?.value?.trim()) {
            contentInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            Swal.fire({ icon: 'warning', title: '품의 내용을 입력해주세요', text: '품의 내용은 필수 입력 항목입니다.' });
            return false;
        }

        // 품의 내역서 행 존재 여부
        const rows = itemTableBody.querySelectorAll('tr');
        if (rows.length === 0) {
            itemTableBody.closest('.item-table-wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            Swal.fire({ icon: 'warning', title: '품의 내역을 입력해주세요', text: '항목 추가 버튼을 눌러 내역을 입력해주세요.' });
            return false;
        }

        // 적요 (각 행의 item-desc)
        for (const tr of rows) {
            const descEl = tr.querySelector('.item-desc');
            if (!descEl?.value?.trim()) {
                descEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                Swal.fire({ icon: 'warning', title: '적요를 입력해주세요', text: '품의 내역서의 적요는 필수 입력 항목입니다.' });
                return false;
            }
        }

        // 3) 남은 필수 필드(.field-empty) 검증 - 품의일자·수량 등 상기 개별 검증에서 누락된 항목 대응
        const firstEmpty = document.querySelector(
            '.form-input.field-empty, .form-textarea.field-empty, .item-desc.field-empty, .item-qty.field-empty, .item-payment.field-empty'
        );
        if (firstEmpty) {
            firstEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                Swal.fire({ icon: 'warning', title: '입력 오류', text: '필수 항목을 모두 입력해주세요.' });
            }, 150);
            return false;
        }

        // 총 결제금액 (행별 item-payment 합산이 0이면 오류)
        const totalPaymentEl = document.getElementById('totalPaymentAmount');
        const totalPayment = parseNumber(totalPaymentEl?.textContent);
        if (!totalPayment || totalPayment <= 0) {
            totalPaymentEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            Swal.fire({ icon: 'warning', title: '총 결제금액을 입력해주세요', text: '품의 내역서에 결제금액을 입력해주세요.' });
            return false;
        }

        // 4) 연구비이체 선택 시 통장사본 필수 검증 (가장 하단이므로 마지막에 체크)
        const isTransfer = document.querySelector('input[name="paymentType"]:checked')?.value === 'transfer';
        if (isTransfer) {
            const hasBankCopy = selectedBankCopyFiles.length > 0 || existingBankCopyAttachments.length > 0;
            if (!hasBankCopy) {
                const bankCopyArea = document.getElementById('bankCopyUploadArea');
                if (bankCopyArea) bankCopyArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    Swal.fire({ icon: 'warning', title: '통장사본 필요', text: '연구비이체 시 거래처 통장사본을 첨부해주세요.' });
                }, 150);
                return false;
            }
        }

        return true;
    }

    // ============================================
    // 실시간 필수 필드 유효성 검사
    // ============================================
    function validateRequiredFields() {
        const printBtn = document.getElementById('printDocumentBtn');

        const projectInput = document.getElementById('pu_project');
        const cardInput = document.getElementById('pu_card');
        const applicantInput = document.getElementById('pu_applicant');
        const dateInput = document.getElementById('pu_approval_date');
        const contentInput = document.getElementById('pu_content');
        const itemTable = document.getElementById('itemTable');

        let allFilled = true;

        // 과제명
        if (!document.getElementById('selectedProjectIdx').value) {
            projectInput?.classList.add('field-empty');
            allFilled = false;
        } else {
            projectInput?.classList.remove('field-empty');
        }

        // 사용 카드
        if (!document.getElementById('selectedCardIdx').value) {
            cardInput?.classList.add('field-empty');
            allFilled = false;
        } else {
            cardInput?.classList.remove('field-empty');
        }

        // 신청자
        if (!document.getElementById('selectedApplicantIdx').value) {
            applicantInput?.classList.add('field-empty');
            allFilled = false;
        } else {
            applicantInput?.classList.remove('field-empty');
        }

        // 품의일자
        if (!dateInput?.value) {
            dateInput?.classList.add('field-empty');
            allFilled = false;
        } else {
            dateInput?.classList.remove('field-empty');
        }

        // 품의 내용
        if (!contentInput?.value?.trim()) {
            contentInput?.classList.add('field-empty');
            allFilled = false;
        } else {
            contentInput?.classList.remove('field-empty');
        }

        // 품의 내역서 항목별 검증
        const items = collectItems();

        // 항목별 필수값 검증 (적요 · 수량 · 결제대금)
        itemTableBody.querySelectorAll('tr').forEach(tr => {
            const descEl    = tr.querySelector('.item-desc');
            const qtyEl     = tr.querySelector('.item-qty');
            const paymentEl = tr.querySelector('.item-payment');

            const descEmpty    = !descEl?.value?.trim();
            const qtyEmpty     = !qtyEl?.value || parseInt(qtyEl.value) <= 0;
            const paymentEmpty = parseNumber(paymentEl?.value) <= 0;

            descEl?.classList.toggle('field-empty', descEmpty);
            qtyEl?.classList.toggle('field-empty', qtyEmpty);
            paymentEl?.classList.toggle('field-empty', paymentEmpty);

            if (descEmpty || qtyEmpty || paymentEmpty) allFilled = false;
        });

        // 연구비이체 선택 시 통장사본 필수
        const isTransfer = document.querySelector('input[name="paymentType"]:checked')?.value === 'transfer';
        const bankCopyUploadArea = document.getElementById('bankCopyUploadArea');
        if (isTransfer) {
            const hasBankCopy = selectedBankCopyFiles.length > 0 || existingBankCopyAttachments.length > 0;
            if (!hasBankCopy) {
                bankCopyUploadArea?.classList.add('field-empty');
                allFilled = false;
            } else {
                bankCopyUploadArea?.classList.remove('field-empty');
            }
        } else {
            bankCopyUploadArea?.classList.remove('field-empty');
        }

        // 인쇄 버튼 표시/숨김
        if (printBtn) {
            printBtn.style.display = allFilled ? 'inline-flex' : 'none';
        }
    }

    // 품의일자 변경 시 모든 항목 날짜의 max 갱신 + 작성자 참여기간 재검증
    document.getElementById('pu_approval_date')?.addEventListener('change', async function() {
        const newMax = this.value || '';
        // 작성자 참여기간 재검증
        await revalidateApplicantAgainstApprovalDate();
        itemTableBody.querySelectorAll('.item-date').forEach(dateEl => {
            dateEl.max = newMax;
            // 이미 입력된 날짜가 품의일자보다 미래이면 품의일자로 보정
            if (newMax && dateEl.value && dateEl.value > newMax) {
                dateEl.value = newMax;
            }
        });
    });

    // ============================================
    // 삭제하기
    // ============================================
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function() {
            const confirmed = await Swal.fire({
                title: `${purchaseTypeLabel} 삭제`,
                html: `${purchaseTypeLabel} 문서를 삭제하시겠습니까?<br>이 작업은 되돌릴 수 없습니다.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: '삭제',
                cancelButtonText: '취소',
                confirmButtonColor: '#ef4444'
            });
            if (!confirmed.isConfirmed) return;

            try {
                showLoading();
                const res = await fetch(`/api/receipt-purchases/${editingIdx}`, { method: 'DELETE' });
                hideLoading();
                if (res.ok) {
                    await Swal.fire({
                        icon: 'success',
                        title: '삭제 완료',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    window.location.href = '/project/documents';
                } else {
                    console.error('[삭제 실패] 구매 증빙 HTTP', res?.status);
                    showDeleteFailure('구매 증빙');
                }
            } catch (e) {
                hideLoading();
                console.error('[삭제 실패] 구매 증빙', e);
                showDeleteFailure('구매 증빙');
            }
        });
    }

    // ============================================
    // 인쇄
    // ============================================
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            // 미리보기 펼치기
            if (formWrapper.classList.contains('collapsed')) {
                formWrapper.classList.remove('collapsed');
                toggleBtn.classList.add('active');
            }
            setTimeout(() => window.print(), 300);
        });
    }

    // ============================================
    // 문서 로드 (수정 모드)
    // ============================================
    async function loadDocument(idx) {
        try {
            const res = await fetch(`/api/receipt-purchases/${idx}`);
            if (!res.ok) {
                window.location.href = '/error';
                return;
            }
            const data = await res.json();
            populateForm(data);

            document.documentElement.classList.add('data-loaded');
            document.querySelector('.container').classList.add('data-loaded');

            const overlay = document.getElementById('pageLoadingOverlay');
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.style.display = 'none'; }, 300);
            }

            // 전자서명 현황 로드 (approval_documents.idx 기준)
            if (window.SignatureRender && data.documentIdx) {
                SignatureRender.load(data.documentIdx);
            }
        } catch (e) {
            console.error('문서 로드 오류:', e);
            window.location.href = '/error';
        }
    }

    async function populateForm(data) {
        // 기본 필드
        if (data.approvalDate) document.getElementById('pu_approval_date').value = data.approvalDate;
        if (data.documentTitle) document.getElementById('pu_title').value = data.documentTitle;
        if (data.documentContent) document.getElementById('pu_content').value = data.documentContent;
        if (data.documentIdx) document.getElementById('pu_document_idx').value = data.documentIdx;

        // 지급종류
        if (data.paymentType) {
            const radio = document.querySelector(`input[name="paymentType"][value="${data.paymentType}"]`);
            if (radio) radio.checked = true;
        }

        // 프로젝트 선택
        if (data.projectIdx) {
            document.getElementById('selectedProjectIdx').value = data.projectIdx;
            document.getElementById('pu_project').value = data.projectName || '';
            await loadProjectCards(data.projectIdx);
            await loadProjectMembers(data.projectIdx);

            // 프로젝트 데이터에서 매니저 정보 가져오기
            const proj = projects.find(p => p.idx === data.projectIdx);
            if (proj) {
                selectedProject = proj;
            }
        }

        // 카드 선택
        if (data.cardIdx) {
            document.getElementById('selectedCardIdx').value = data.cardIdx;
            const card = projectCards.find(c => c.idx === data.cardIdx);
            if (card) {
                const puCard = document.getElementById('pu_card');
                puCard.value = card.cardAlias || card.cardNumber || '카드';
            }
        }

        // 신청자 (authorIdx)
        if (data.authorIdx) {
            document.getElementById('selectedApplicantIdx').value = data.authorIdx;
            const emp = employees.find(e => e.id === data.authorIdx);
            if (emp) {
                selectedApplicant = { idx: data.authorIdx, name: emp.name };
                document.getElementById('pu_applicant').value = emp.name;
            } else if (data.authorUserName) {
                document.getElementById('pu_applicant').value = data.authorUserName;
            }
        }

        // 품의 내역서 행 복원
        itemTableBody.innerHTML = '';
        itemRowCount = 0;
        if (data.items && data.items.length > 0) {
            data.items.forEach(item => {
                addItemRow();
                const lastRow = itemTableBody.querySelector('tr:last-child');
                if (item.itemDate) lastRow.querySelector('.item-date').value = item.itemDate;
                if (item.itemDesc) lastRow.querySelector('.item-desc').value = item.itemDesc;
                if (item.quantity != null) lastRow.querySelector('.item-qty').value = item.quantity;
                if (item.taxType) {
                    const sel = lastRow.querySelector('.item-taxtype');
                    if (sel) sel.value = item.taxType;
                }
                if (item.paymentAmount != null) lastRow.querySelector('.item-payment').value = Number(item.paymentAmount).toLocaleString();
                if (item.supplyAmount != null) lastRow.querySelector('.item-supply').value = Number(item.supplyAmount).toLocaleString();
                if (item.taxAmount != null) {
                    const taxEl = lastRow.querySelector('.item-tax');
                    taxEl.value = Number(item.taxAmount).toLocaleString();
                    if (item.taxAmount > 0) taxEl.removeAttribute('readonly');
                }
                if (item.remark) lastRow.querySelector('.item-remark').value = item.remark;
            });
        } else {
            addItemRow();
        }

        // 첨부파일 복원
        if (data.attachments) {
            existingReceiptAttachments   = data.attachments.filter(a => a.attachmentType === 'RECEIPT');
            existingDocumentAttachments  = data.attachments.filter(a => a.attachmentType === 'DOCUMENT');
            existingEstimateAttachments  = data.attachments.filter(a => a.attachmentType === 'ESTIMATE');
            existingBankCopyAttachments  = data.attachments.filter(a => a.attachmentType === 'BANK_COPY');
            renderExistingFiles();
        }

        // 연구비이체인 경우 통장사본 영역 표시
        toggleBankCopySection();

        updateItemTotals();
        updateOfficialDocument();
        updateButtonsForEditMode();

        // 수정 모드 진입 즉시 — 작성자가 현재 지출일에 활성인지 재검증
        try {
            await revalidateApplicantAgainstApprovalDate();
        } catch (e) {
            console.warn('[populateForm] 작성자 참여기간 재검증 오류:', e);
        }
    }

    function updateButtonsForEditMode() {
        submitBtn.innerHTML = '<i class="fas fa-edit"></i> 수정하기';
        deleteBtn.style.display = 'flex';
    }

    // ============================================
    // 로딩 오버레이
    // ============================================
    function showLoading() {
        const overlay = document.getElementById('pageLoadingOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.style.opacity = '1';
        }
    }

    function hideLoading() {
        const overlay = document.getElementById('pageLoadingOverlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.style.display = 'none'; }, 300);
        }
    }

    // ============================================
    // 유틸
    // ============================================
    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }


    // 초기 공식문서 업데이트 (내부에서 validateRequiredFields 호출되어 필수 필드 강조까지 처리)
    updateOfficialDocument();

    // ============================================
    // 템플릿 사이드바 접기/펼치기
    // ============================================
    const toggleAllBtn = document.getElementById('toggleAllBtn');
    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', function() {
            const categories = document.querySelectorAll('.menu-category');
            const allExpanded = Array.from(categories).every(cat => cat.classList.contains('expanded'));
            categories.forEach(cat => {
                if (allExpanded) cat.classList.remove('expanded');
                else cat.classList.add('expanded');
            });
            const icon = this.querySelector('i');
            icon.className = allExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        });
    }

    document.querySelectorAll('.category-header').forEach(header => {
        header.addEventListener('click', function(e) {
            e.preventDefault();
            this.closest('.menu-category').classList.toggle('expanded');
        });
    });

});
