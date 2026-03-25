// 연구비 증빙 - 재료비/장비비 페이지 JavaScript
document.addEventListener('DOMContentLoaded', async function() {

    // ============================================
    // 전역 변수
    // ============================================
    let selectedReceiptFiles = [];
    let selectedDocumentFiles = [];
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
    let deletedAttachmentIds = [];

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
            <td>
                <select class="item-input item-taxtype">
                    <option value="과세">과세</option>
                    <option value="면세">면세</option>
                </select>
            </td>
            <td><input type="text" class="item-input num-input item-payment" placeholder="0"></td>
            <td><input type="text" class="item-input num-input item-supply" placeholder="0"></td>
            <td><input type="text" class="item-input num-input item-tax" placeholder="0"></td>
            <td><input type="text" class="item-input item-remark" placeholder="비고"></td>
            <td><button type="button" class="btn-remove-row" onclick="removeItemRow(this)" title="행 삭제">
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
            this.classList.toggle('error', parseNumber(this.value) <= 0);
            recalcFromPayment();
            validateRequiredFields();
        });

        taxtypeEl.addEventListener('change', function() {
            if (parseNumber(paymentEl.value) > 0) recalcFromPayment();
            else if (parseNumber(supplyEl.value) > 0) recalcFromSupply();
        });

        supplyEl.addEventListener('input', function() {
            this.value = formatNumberInput(this.value);
            recalcFromSupply();
            updateOfficialDocument();
        });

        // 세액 — 값 있을 때만 편집 가능, 공급가액 = 결제금액 - 세액
        taxEl.addEventListener('input', function() {
            this.value = formatNumberInput(this.value);
            const payment = parseNumber(paymentEl.value);
            const tax     = parseNumber(this.value);
            supplyEl.value = (payment - tax) >= 0 ? (payment - tax).toLocaleString() : '0';
            updateItemTotals();
            updateOfficialDocument();
        });
        tr.querySelector('.item-qty').addEventListener('input', function() {
            this.classList.toggle('error', !this.value || parseInt(this.value) <= 0);
            updateItemTotals();
        });
        const dateInput = tr.querySelector('.item-date');
        const approvalDate = document.getElementById('pu_approval_date').value || '';
        dateInput.value = approvalDate;
        dateInput.max = approvalDate;
        dateInput.addEventListener('change', updateOfficialDocument);
        dateInput.addEventListener('click', function() {
            try { this.showPicker(); } catch(e) {}
        });
        tr.querySelector('.item-desc').addEventListener('input', function() {
            this.classList.toggle('error', !this.value.trim());
            updateOfficialDocument();
            validateRequiredFields();
        });
        tr.querySelector('.item-remark').addEventListener('input', updateOfficialDocument);
        itemTableBody.appendChild(tr);
        updateItemTotals();
    };

    window.removeItemRow = function(btn) {
        const tr = btn.closest('tr');
        tr.remove();
        updateItemTotals();
        updateOfficialDocument();
        validateRequiredFields();
    };

    // ============================================
    // 초기화
    // ============================================
    setTodayDate();
    addItemRow(); // 첫 행 자동 추가
    setupFileUpload();
    setupToggle();
    setupProjectInput();
    setupPaymentTypeChange();

    // 수정 모드 확인
    const urlParams = new URLSearchParams(window.location.search);
    const documentIdx = urlParams.get('documentIdx');
    if (documentIdx) {
        isEditMode = true;
        editingIdx = documentIdx;
        await loadDocument(documentIdx);
    }

    // 데이터 로드
    await Promise.all([loadEmployees(), loadMyProjects()]);

    // 신규 작성 모드: 초기 필수 필드 강조
    if (!documentIdx) {
        validateRequiredFields();
    }

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
            radio.addEventListener('change', updateOfficialDocument);
        });
    }

    // ============================================
    // 프로젝트 모달 (초성 검색 + 연도 필터)
    // ============================================
    const CHO_HANGUL = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

    function getChosung(str) {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i) - 44032;
            if (code > -1 && code < 11172) result += CHO_HANGUL[Math.floor(code / 588)];
            else result += str.charAt(i);
        }
        return result;
    }

    function matchesSearch(text, keyword) {
        if (!text || !keyword) return true;
        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();
        if (lowerText.includes(lowerKeyword)) return true;
        return getChosung(text).includes(keyword);
    }

    function highlightText(text, keyword) {
        if (!keyword || !text) return escapeHtml(text);
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
            const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            return escapeHtml(text).replace(regex, '<mark class="search-highlight">$1</mark>');
        }
        return escapeHtml(text);
    }

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
                setDefaultApplicant();
                closeProjectModal();
                updateOfficialDocument();
                validateRequiredFields();
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
                    document.getElementById('pu_card').value = selectedCard.cardName || selectedCard.cardAlias || selectedCard.cardNumber || '카드';
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
                document.getElementById('pu_card').value = cardName;
                document.getElementById('selectedCardIdx').value = card.idx;
                closeCardModal();
                updateOfficialDocument();
                validateRequiredFields();
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
                setDefaultApplicant();

                updateOfficialDocument();
                renderCardList(projectCards);
                const cardSearchEl = document.getElementById('cardSearch');
                if (cardSearchEl) cardSearchEl.value = '';
                validateRequiredFields();
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
    // 참여인력 중 밑에서 5번째 직급 default 신청자 자동 선택
    function setDefaultApplicant() {
        if (!projectMembers || projectMembers.length === 0) return;

        // employeePositionSortOrder 오름차순 정렬 (낮은 값 = 높은 직급)
        const sorted = [...projectMembers].sort((a, b) =>
            (a.employeePositionSortOrder || 999) - (b.employeePositionSortOrder || 999)
        );

        // 밑에서 5번째 (5명 이하이면 가장 아래 직급)
        const targetIdx = sorted.length > 5 ? sorted.length - 5 : sorted.length - 1;
        const member = sorted[targetIdx];
        if (!member) return;

        const memberName = member.employeeName || member.name || '';
        const memberPosition = member.employeePositionName || member.position || '';
        const memberId = member.employeeIdx || member.userIdx || member.idx;

        selectedApplicant = { idx: memberId, name: memberName };
        document.getElementById('pu_applicant').value = memberName;
        document.getElementById('selectedApplicantIdx').value = memberId;
    }

    function getProjectMembers() {
        if (!selectedProject) return [];
        if (projectMembers.length > 0) {
            return projectMembers.map(m => ({
                id: m.employeeIdx || m.userIdx || m.idx,
                name: m.employeeName || m.userName || m.empName || m.name,
                dept: m.employeeDeptName || m.dept || m.empDept || '',
                position: m.employeePositionName || m.position || m.empPosition || ''
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
        list.forEach(member => {
            const item = document.createElement('div');
            item.className = 'employee-item';
            if (selectedApplicant && selectedApplicant.idx === member.id) item.classList.add('selected');
            item.innerHTML = `
                <div class="employee-info">
                    <div class="employee-name"><i class="fas fa-user" style="margin-right:6px;color:#667eea;"></i>${escapeHtml(member.name)}</div>
                    <div class="employee-detail">${escapeHtml(member.dept || '')} ${escapeHtml(member.position || '')}</div>
                </div>`;
            item.addEventListener('click', function() {
                selectedApplicant = { idx: member.id, name: member.name };
                document.getElementById('pu_applicant').value = member.name;
                document.getElementById('selectedApplicantIdx').value = member.id;
                closeApplicantModal();
                updateOfficialDocument();
                validateRequiredFields();
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
                setDefaultApplicant();

                updateOfficialDocument();
                renderApplicantList(getProjectMembers());
                const applicantSearchEl = document.getElementById('applicantSearch');
                if (applicantSearchEl) applicantSearchEl.value = '';
                validateRequiredFields();
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
                    matchesSearch(m.name || '', keyword)
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
        if (typeof validateRequiredFields === 'function') validateRequiredFields();
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
        document.querySelectorAll('.pu-auto-project').forEach(el => el.textContent = projectName);
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

        // 인쇄 버튼 표시 여부
        checkPrintButton();
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

    function checkPrintButton() {
        const hasProject = !!document.getElementById('selectedProjectIdx').value;
        const hasApplicant = !!document.getElementById('selectedApplicantIdx').value;
        const hasDate = !!document.getElementById('pu_approval_date').value;
        const hasContent = !!document.getElementById('pu_content').value.trim();
        const hasItems = collectItems().length > 0;

        if (hasProject && hasApplicant && hasDate && hasContent && hasItems) {
            printBtn.style.display = 'flex';
        } else {
            printBtn.style.display = 'none';
        }
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
        listEl.innerHTML = '';
        fileArray.forEach((f, i) => {
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
            listEl.appendChild(item);
        });
    }

    window.removeNewFile = function(idx, listId) {
        const isReceipt = listId === 'receiptFileList';
        const arr = isReceipt ? selectedReceiptFiles : selectedDocumentFiles;
        arr.splice(idx, 1);
        renderFileList(arr, isReceipt ? receiptFileList : documentFileList);
    };

    function renderExistingFiles() {
        renderExistingFileList(existingReceiptAttachments, receiptFileList, selectedReceiptFiles, 'receipt');
        renderExistingFileList(existingDocumentAttachments, documentFileList, selectedDocumentFiles, 'document');
    }

    function renderExistingFileList(existingArr, listEl, newArr, type) {
        listEl.innerHTML = '';
        existingArr.forEach(a => {
            const item = document.createElement('div');
            item.className = 'file-item existing-file';
            item.dataset.attachmentId = a.idx;
            item.innerHTML = `
                <div class="file-name">
                    <i class="fas fa-file"></i>
                    <span>${escapeHtml(a.originalFilename)}</span>
                </div>
                <span class="file-size">${formatFileSize(a.fileSize)}</span>
                <button class="btn-remove-file" onclick="removeExistingFile(${a.idx}, '${type}')"><i class="fas fa-times"></i></button>
            `;
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
            listEl.appendChild(item);
        });
    }

    window.removeExistingFile = function(attachmentId, type) {
        if (!deletedAttachmentIds.includes(attachmentId)) {
            deletedAttachmentIds.push(attachmentId);
        }
        if (type === 'receipt') {
            existingReceiptAttachments = existingReceiptAttachments.filter(a => a.idx !== attachmentId);
            renderExistingFileList(existingReceiptAttachments, receiptFileList, selectedReceiptFiles, 'receipt');
        } else {
            existingDocumentAttachments = existingDocumentAttachments.filter(a => a.idx !== attachmentId);
            renderExistingFileList(existingDocumentAttachments, documentFileList, selectedDocumentFiles, 'document');
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
                await Swal.fire({
                    icon: 'success',
                    title: isEditMode ? '수정 완료' : '저장 완료',
                    text: `${purchaseTypeLabel} 증빙이 ${isEditMode ? '수정' : '저장'}되었습니다.`,
                    confirmButtonColor: '#667eea'
                });

                window.location.href = '/project/documents';
            } else {
                hideLoading();
                const err = await res.json().catch(() => ({}));
                Swal.fire({ icon: 'error', title: '저장 실패', text: err.message || '저장에 실패했습니다.' });
            }
        } catch (e) {
            hideLoading();
            console.error('저장 오류:', e);
            Swal.fire({ icon: 'error', title: '오류', text: '저장 중 오류가 발생했습니다.' });
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

        if (isEditMode && deletedAttachmentIds.length > 0) {
            formData.append('deletedAttachmentIds', JSON.stringify(deletedAttachmentIds));
        }

        return formData;
    }

    function validateForm() {
        validateRequiredFields();

        const valid = !document.querySelector(
            '.form-input.error, .form-textarea.error, .item-table.error'
        );

        if (!valid) {
            const firstError = document.querySelector('.form-input.error, .form-textarea.error');
            if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                Swal.fire({ icon: 'warning', title: '입력 오류', text: '필수 항목을 모두 입력해주세요.' });
            }, 150);
        }

        return valid;
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
            projectInput?.classList.add('error');
            allFilled = false;
        } else {
            projectInput?.classList.remove('error');
        }

        // 사용 카드
        if (!document.getElementById('selectedCardIdx').value) {
            cardInput?.classList.add('error');
            allFilled = false;
        } else {
            cardInput?.classList.remove('error');
        }

        // 신청자
        if (!document.getElementById('selectedApplicantIdx').value) {
            applicantInput?.classList.add('error');
            allFilled = false;
        } else {
            applicantInput?.classList.remove('error');
        }

        // 품의일자
        if (!dateInput?.value) {
            dateInput?.classList.add('error');
            allFilled = false;
        } else {
            dateInput?.classList.remove('error');
        }

        // 품의 내용
        if (!contentInput?.value?.trim()) {
            contentInput?.classList.add('error');
            allFilled = false;
        } else {
            contentInput?.classList.remove('error');
        }

        // 품의 내역서 (최소 1항목)
        const items = collectItems();
        if (items.length === 0) {
            itemTable?.classList.add('error');
            allFilled = false;
        } else {
            itemTable?.classList.remove('error');
        }

        // 항목별 필수값 검증 (적요 · 수량 · 결제대금)
        itemTableBody.querySelectorAll('tr').forEach(tr => {
            const descEl    = tr.querySelector('.item-desc');
            const qtyEl     = tr.querySelector('.item-qty');
            const paymentEl = tr.querySelector('.item-payment');

            const descEmpty    = !descEl?.value?.trim();
            const qtyEmpty     = !qtyEl?.value || parseInt(qtyEl.value) <= 0;
            const paymentEmpty = parseNumber(paymentEl?.value) <= 0;

            descEl?.classList.toggle('error', descEmpty);
            qtyEl?.classList.toggle('error', qtyEmpty);
            paymentEl?.classList.toggle('error', paymentEmpty);

            if (descEmpty || qtyEmpty || paymentEmpty) allFilled = false;
        });

        // 인쇄 버튼 표시/숨김
        if (printBtn) {
            printBtn.style.display = allFilled ? 'inline-flex' : 'none';
        }
    }

    // 필수 입력 필드 - 입력/변경 시 실시간 검증
    ['pu_approval_date', 'pu_content'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', validateRequiredFields);
            el.addEventListener('change', validateRequiredFields);
        }
    });

    // 품의일자 변경 시 모든 항목 날짜의 max 갱신
    document.getElementById('pu_approval_date')?.addEventListener('change', function() {
        const newMax = this.value || '';
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
                title: '삭제하시겠습니까?',
                text: '삭제된 문서는 복구할 수 없습니다.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: '삭제',
                cancelButtonText: '취소',
                confirmButtonColor: '#dc2626'
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
                        text: `${purchaseTypeLabel} 증빙이 삭제되었습니다.`,
                        confirmButtonColor: '#667eea'
                    });
                    window.location.href = '/project/documents';
                } else {
                    Swal.fire({ icon: 'error', title: '삭제 실패', text: '삭제에 실패했습니다.' });
                }
            } catch (e) {
                hideLoading();
                Swal.fire({ icon: 'error', title: '오류', text: '삭제 중 오류가 발생했습니다.' });
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
                document.getElementById('pu_card').value = card.cardAlias || card.cardNumber || '카드';
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
            existingReceiptAttachments = data.attachments.filter(a => a.attachmentType === 'RECEIPT');
            existingDocumentAttachments = data.attachments.filter(a => a.attachmentType === 'DOCUMENT');
            renderExistingFiles();
        }

        updateItemTotals();
        updateOfficialDocument();
        updateButtonsForEditMode();
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


    // 초기 공식문서 업데이트
    updateOfficialDocument();

    // 신규 작성 시 필수 필드 빨간색 표시
    if (!isEditMode) {
        validateRequiredFields();
    }

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

    // ============================================
    // 테이블 헤더 플로팅 툴팁
    // ============================================
    const floatingTooltip = document.getElementById('th-floating-tooltip');
    document.querySelectorAll('.th-tooltip').forEach(th => {
        const text = th.querySelector('.th-tooltip-text')?.textContent?.trim();
        if (!text || !floatingTooltip) return;
        th.addEventListener('mouseenter', function(e) {
            floatingTooltip.textContent = text;
            floatingTooltip.style.display = 'block';
        });
        th.addEventListener('mousemove', function(e) {
            floatingTooltip.style.left = e.clientX + 'px';
            floatingTooltip.style.top = (e.clientY - 36) + 'px';
        });
        th.addEventListener('mouseleave', function() {
            floatingTooltip.style.display = 'none';
        });
    });
});
