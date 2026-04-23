// 지출품의서 JavaScript

const KOR_UNITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const KOR_TENS  = ['', '십', '백', '천'];
const KOR_MEGA  = ['', '만', '억', '조'];

function chunkToKorean(n) {
    let result = '';
    for (let i = 3; i >= 0; i--) {
        const digit = Math.floor(n / Math.pow(10, i)) % 10;
        if (digit > 0) result += KOR_UNITS[digit] + KOR_TENS[i];
    }
    return result;
}

function toKoreanAmount(num) {
    if (!num || num === 0) return '영';
    let result = '';
    let megaIdx = 0;
    while (num > 0) {
        const chunk = num % 10000;
        if (chunk > 0) result = chunkToKorean(chunk) + KOR_MEGA[megaIdx] + result;
        num = Math.floor(num / 10000);
        megaIdx++;
    }
    return result;
}

document.addEventListener('DOMContentLoaded', function() {

    // ==========================================
    // 편집 상태
    // ==========================================
    let editingIdx = null;

    const urlParams = new URLSearchParams(window.location.search);
    const idxParam = urlParams.get('idx');
    if (idxParam) {
        editingIdx = parseInt(idxParam, 10);
    }

    // ==========================================
    // 날짜 모달 상태
    // ==========================================
    let currentDateInput = null;
    let calendarYear = new Date().getFullYear();
    let calendarMonth = new Date().getMonth();

    // ==========================================
    // 기본 정보 초기화
    // ==========================================
    function initBasicInfo() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const isoDate = `${yyyy}-${mm}-${dd}`;
        const display = `${yyyy}. ${mm}. ${dd}`;
        const docDateEl = document.getElementById('documentDate');
        if (docDateEl) {
            docDateEl.textContent = display;
            docDateEl.dataset.isoDate = isoDate;
        }

        if (window.CURRENT_USER) {
            const user = window.CURRENT_USER;
            const deptEl = document.getElementById('applicantDept');
            const nameEl = document.getElementById('applicantName');
            if (deptEl) deptEl.textContent = user.empDeptName || user.empDept || '-';
            if (nameEl) nameEl.textContent = user.empName || '-';
        }
    }

    initBasicInfo();

    // 개인카드 기본 선택 (신규 작성 시에만)
    if (!editingIdx) {
        const payTypePersonalCard = document.getElementById('payTypePersonalCard');
        if (payTypePersonalCard) {
            payTypePersonalCard.checked = true;
            updatePreview(); // 미리보기 반영
        }
    }

    // 첫 번째 항목 날짜 오늘 기본값 (신규 작성 시에만)
    function todayStr() {
        const t = new Date();
        return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
    }
    if (!editingIdx) {
        const firstDateInput = document.querySelector('.req-date-picker');
        if (firstDateInput) firstDateInput.value = todayStr();
    }

    // ==========================================
    // 템플릿 사이드바 카테고리 토글
    // ==========================================
    const toggleAllBtn = document.getElementById('toggleAllBtn');
    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', function() {
            const categories = document.querySelectorAll('.menu-category');
            const allExpanded = Array.from(categories).every(c => c.classList.contains('expanded'));
            categories.forEach(c => {
                if (allExpanded) c.classList.remove('expanded');
                else c.classList.add('expanded');
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

    // ==========================================
    // 품의 내역 아이템 관리
    // ==========================================
    let itemCount = 1;

    document.getElementById('addRowBtnBottom')?.addEventListener('click', function() {
        document.getElementById('addRowBtn').click();
    });

    document.getElementById('addRowBtn').addEventListener('click', function() {
        itemCount++;
        const container = document.getElementById('requisitionItemsContainer');
        const item = document.createElement('div');
        item.className = 'expense-item';

        // 이전 항목의 날짜를 새 항목에 복사
        const allItems = container.querySelectorAll('.expense-item');
        const prevItem = allItems[allItems.length - 1];
        const prevDate = prevItem?.querySelector('.date-input')?.value || todayStr();

        item.innerHTML = `
            <span class="expense-item-number">${itemCount}</span>
            <div class="expense-item-body">
                <div class="form-row">
                    <div class="form-group" style="flex: 0 0 180px;">
                        <label><i class="fas fa-calendar-day"></i> 날짜 <span class="required-mark">*</span></label>
                        <input type="text" class="form-input date-input req-date-picker" value="${prevDate}" readonly>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label><i class="fas fa-edit"></i> 적요 <span class="required-mark">*</span></label>
                        <input type="text" class="form-input description-input" placeholder="지출 예정 내역 입력">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex: 1;">
                        <label><i class="fas fa-store"></i> 상호</label>
                        <input type="text" class="form-input shop-input" placeholder="상호명 입력">
                    </div>
                    <div class="form-group" style="flex: 0 0 180px;">
                        <label><i class="fas fa-won-sign"></i> 금액 <span class="required-mark">*</span></label>
                        <input type="text" class="form-input amount-input" placeholder="금액 입력" inputmode="numeric">
                    </div>
                    <div class="form-group" style="flex: 0 0 150px;">
                        <label><i class="fas fa-sticky-note"></i> 비고</label>
                        <input type="text" class="form-input note-input" placeholder="">
                    </div>
                </div>
            </div>
            <button type="button" class="btn-remove-item" onclick="removeRequisitionItem(this)">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(item);
        bindItemEvents(item);
        reNumberItems();
    });

    window.removeRequisitionItem = function(btn) {
        const container = document.getElementById('requisitionItemsContainer');
        if (container.querySelectorAll('.expense-item').length <= 1) {
            Swal.fire({ icon: 'warning', title: '삭제 불가', text: '최소 1개의 항목이 필요합니다.' });
            return;
        }
        btn.closest('.expense-item').remove();
        reNumberItems();
        updateTotals();
        updatePreview();
        validateRequiredFields();
    };

    function reNumberItems() {
        document.querySelectorAll('.expense-item-number').forEach((el, i) => {
            el.textContent = i + 1;
        });
    }

    // ==========================================
    // 아이템 이벤트 바인딩
    // ==========================================
    function bindItemEvents(item) {
        // 날짜 picker
        item.querySelector('.req-date-picker')?.addEventListener('click', function() {
            openDateModal(this);
        });

        // 금액 — 숫자/콤마
        item.querySelector('.amount-input')?.addEventListener('input', function() {
            const raw = this.value.replace(/[^0-9]/g, '');
            this.value = raw ? Number(raw).toLocaleString('ko-KR') : '';
            updateTotals();
            updatePreview();
            validateRequiredFields();
        });

        // 나머지 텍스트 필드 → 미리보기 갱신 + 검증
        ['description-input', 'shop-input', 'note-input'].forEach(cls => {
            item.querySelector(`.${cls}`)?.addEventListener('input', function() {
                updatePreview();
                validateRequiredFields();
            });
        });

        // 날짜 변경 시 검증
        item.querySelector('.req-date-picker')?.addEventListener('change', validateRequiredFields);

        // 날짜 picker: Enter/Space 키로 열기
        item.querySelector('.req-date-picker')?.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openDateModal(this);
            }
        });
    }

    // 초기 아이템 이벤트 바인딩
    document.querySelectorAll('.expense-item').forEach(bindItemEvents);

    // ==========================================
    // 합계 계산
    // ==========================================
    function updateTotals() {
        let total = 0;
        document.querySelectorAll('.amount-input').forEach(input => {
            total += Number(input.value.replace(/,/g, '')) || 0;
        });
        const el = document.getElementById('totalAmountDisplay');
        if (el) el.textContent = '₩ ' + total.toLocaleString('ko-KR');
    }

    // ==========================================
    // 공식 문서 미리보기 갱신
    // ==========================================
    function updatePreview() {
        const isoDate = document.getElementById('documentDate')?.dataset?.isoDate || '';
        let docDate = '-';
        if (isoDate) {
            const d = new Date(isoDate);
            docDate = d.getFullYear() + '. ' +
                      String(d.getMonth() + 1).padStart(2, '0') + '. ' +
                      String(d.getDate()).padStart(2, '0');
        }
        const applicant = document.getElementById('applicantName')?.textContent || '-';
        const content = document.getElementById('requisitionContent')?.value || '';
        const specialNote = document.getElementById('specialNote')?.value || '';
        const payType = document.querySelector('input[name="paymentType"]:checked')?.value || null;

        // 지급 종류 표시 (✓ 마킹)
        const cashMark    = payType === '현금'      ? '✓' : '&nbsp;&nbsp;';
        const bizMark     = payType === '사업비카드' ? '✓' : '&nbsp;&nbsp;';
        const personalMark = payType === '개인카드'  ? '✓' : '&nbsp;&nbsp;';
        const payTypeHtml = `현금( ${cashMark} ) / 사업비카드( ${bizMark} ) / 개인카드( ${personalMark} )`;

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        const setHtml = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };

        set('previewDocDate', docDate);
        set('previewDocDateTop', docDate);
        set('previewApplicant', applicant);
        set('previewContent', content || '-');
        set('previewSpecialNote', specialNote);
        setHtml('previewPaymentType', payTypeHtml);

        // 내역 테이블
        const tbody = document.getElementById('reqPreviewBody');
        if (!tbody) return;

        let totalAmount = 0;
        let rows = '';

        document.querySelectorAll('.expense-item').forEach(item => {
            const rawDate = item.querySelector('.req-date-picker')?.value || '';
            const date = rawDate ? rawDate.slice(5).replace('-', '/') : ''; // MM/DD 표시
            const desc   = item.querySelector('.description-input')?.value || '';
            const shop   = item.querySelector('.shop-input')?.value || '';
            const amtRaw = (item.querySelector('.amount-input')?.value || '').replace(/,/g, '');
            const note   = item.querySelector('.note-input')?.value || '';
            const amt    = Number(amtRaw) || 0;
            totalAmount += amt;

            rows += `<tr>
                <td>${date}</td>
                <td style="text-align:left;">${desc}</td>
                <td>${shop}</td>
                <td style="text-align:right;">${amt ? '₩ ' + amt.toLocaleString('ko-KR') : ''}</td>
                <td>${note}</td>
            </tr>`;
        });

        tbody.innerHTML = rows || '<tr><td class="empty-row" colspan="5">내역이 없습니다</td></tr>';
        set('previewTotalAmount', totalAmount
            ? '일금 ' + toKoreanAmount(totalAmount) + '원정  (₩ ' + totalAmount.toLocaleString('ko-KR') + ')'
            : '-');

    }

    // 입력 이벤트 연결
    ['requisitionContent', 'specialNote'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updatePreview);
    });
    document.querySelectorAll('input[name="paymentType"]').forEach(r => r.addEventListener('change', updatePreview));

    updatePreview();

    // ==========================================
    // 미리보기 토글
    // ==========================================
    const toggleBtn = document.getElementById('documentFormToggle');
    const formWrapper = document.querySelector('.document-form-wrapper');
    if (toggleBtn && formWrapper) {
        toggleBtn.addEventListener('click', function() {
            const isExpanded = formWrapper.classList.contains('expanded');
            formWrapper.classList.toggle('expanded', !isExpanded);
            formWrapper.classList.toggle('collapsed', isExpanded);
            this.classList.toggle('active', !isExpanded);
            updatePreview();
        });
    }

    // ==========================================
    // 페이로드 수집
    // ==========================================
    function buildPayload() {
        const content = document.getElementById('requisitionContent')?.value?.trim() || '';
        const paymentType = document.querySelector('input[name="paymentType"]:checked')?.value || '';
        const specialNote = document.getElementById('specialNote')?.value?.trim() || '';

        const items = [];
        let sortOrder = 0;
        document.querySelectorAll('.expense-item').forEach(item => {
            const itemDate = item.querySelector('.req-date-picker')?.value || null;
            const itemDesc = item.querySelector('.description-input')?.value?.trim() || '';
            const amtRaw = (item.querySelector('.amount-input')?.value || '').replace(/,/g, '');
            const amount = amtRaw ? parseFloat(amtRaw) : null;
            const vendor = item.querySelector('.shop-input')?.value?.trim() || '';
            const remark = item.querySelector('.note-input')?.value?.trim() || '';
            items.push({ itemDate: itemDate || null, itemDesc, amount, vendor, remark, sortOrder: sortOrder++ });
        });

        return { content, paymentType, specialNote, items };
    }

    // ==========================================
    // 필수값 검증
    // ==========================================
    function validateRequiredFields() {
        let allFilled = true;

        // 품의 내용
        const contentEl = document.getElementById('requisitionContent');
        if (contentEl) {
            if (!contentEl.value.trim()) {
                contentEl.classList.add('field-empty');
                allFilled = false;
            } else {
                contentEl.classList.remove('field-empty');
            }
        }

        // 지출 예정 내역 — 날짜·적요·금액 필수
        document.querySelectorAll('.expense-item').forEach(item => {
            const dateInput   = item.querySelector('.req-date-picker');
            const descInput   = item.querySelector('.description-input');
            const amountInput = item.querySelector('.amount-input');

            const dateFilled   = !!(dateInput?.value);
            const descFilled   = !!(descInput?.value?.trim());
            const amountFilled = !!(amountInput?.value?.replace(/,/g, ''));

            if (!dateFilled) { dateInput?.classList.add('field-empty');    allFilled = false; }
            else              { dateInput?.classList.remove('field-empty'); }

            if (!descFilled)  { descInput?.classList.add('field-empty');    allFilled = false; }
            else              { descInput?.classList.remove('field-empty'); }

            if (!amountFilled){ amountInput?.classList.add('field-empty');   allFilled = false; }
            else              { amountInput?.classList.remove('field-empty'); }
        });

        // 지급 종류
        const payType = document.querySelector('input[name="paymentType"]:checked')?.value;
        const payGroup = document.querySelector('.payment-type-group');
        if (!payType) {
            payGroup?.classList.add('field-empty');
            allFilled = false;
        } else {
            payGroup?.classList.remove('field-empty');
        }

        // 인쇄 버튼 표시
        const printBtn = document.getElementById('printBtn');
        if (printBtn) printBtn.style.display = allFilled ? 'flex' : 'none';

        return allFilled;
    }

    // 실시간 검증 — 품의 내용·지급 종류
    document.getElementById('requisitionContent')?.addEventListener('input', validateRequiredFields);
    document.querySelectorAll('input[name="paymentType"]').forEach(r =>
        r.addEventListener('change', validateRequiredFields)
    );

    // 항목 추가 후 재검증
    document.getElementById('addRowBtn')?.addEventListener('click', () =>
        setTimeout(validateRequiredFields, 0)
    );

    // ==========================================
    // 저장 버튼
    // ==========================================
    document.getElementById('submitBtn')?.addEventListener('click', async function() {
        const isValid = validateRequiredFields();
        if (!isValid) {
            showWarning('필수값을 모두 입력해주세요.<br>필수값은 빨간 테두리로 표시 됩니다.');
            const firstEmpty = document.querySelector('.field-empty');
            if (firstEmpty) firstEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const payload = buildPayload();
        const isEdit = !!editingIdx;
        const url = isEdit ? `/api/approval/requisition/${editingIdx}` : '/api/approval/requisition';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const errObj = new Error('SAVE_FAILED');
                errObj.serverMessage = err.message;
                throw errObj;
            }

            const data = await res.json();
            if (window.SignatureRender && !isEdit) {
                SignatureRender.afterSave({
                    documentIdx: data.documentIdx || data.idx,
                    redirectUrl: '/approval',
                    successMessage: '저장이 완료되었습니다.'
                });
            } else {
                await showSuccess('저장이 완료되었습니다.');
                window.location.href = '/approval';
            }
        } catch (e) {
            console.error('[저장 실패] 품의서', e, e.serverMessage);
            showSaveFailure('품의서');
        }
    });

    // ==========================================
    // 삭제 버튼
    // ==========================================
    document.getElementById('deleteBtn')?.addEventListener('click', async function() {
        if (!editingIdx) return;

        const confirmed = await showDeleteConfirm('삭제된 품의서는 복구할 수 없습니다. 삭제하시겠습니까?', '품의서 삭제');
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/approval/requisition/${editingIdx}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const errObj = new Error('DELETE_FAILED');
                errObj.serverMessage = err.message;
                throw errObj;
            }
            await showSuccess('품의서가 삭제되었습니다.');
            window.location.href = '/approval';
        } catch (e) {
            console.error('[삭제 실패] 품의서', e, e.serverMessage);
            showDeleteFailure('품의서');
        }
    });

    // ==========================================
    // 인쇄
    // ==========================================
    document.getElementById('printBtn')?.addEventListener('click', function() {
        updatePreview();
        if (formWrapper && formWrapper.classList.contains('collapsed')) {
            formWrapper.classList.remove('collapsed');
            formWrapper.classList.add('expanded');
            if (toggleBtn) toggleBtn.classList.add('active');
        }
        setTimeout(() => window.print(), 200);
    });

    // ==========================================
    // 날짜 선택 모달 (approval_expense 동일: 공휴일·휴가 표시)
    // ==========================================

    let holidays = {};
    let loadedYears = new Set();
    let vacationDates = [];

    const dateModal = document.getElementById('dateModal');
    const dateCalendarTitle = document.getElementById('dateCalendarTitle');
    const dateCalendarDays = document.getElementById('dateCalendarDays');

    // 공휴일 로드
    async function loadHolidaysByYear(year) {
        try {
            const response = await fetch(`/api/holidays?year=${year}`);
            if (!response.ok) throw new Error(`${year}년 공휴일 로드 실패`);
            return await response.json();
        } catch (e) {
            console.error('[Requisition] 공휴일 로드 실패:', e);
            return {};
        }
    }

    async function ensureHolidaysLoaded(year) {
        if (!loadedYears.has(year)) {
            const data = await loadHolidaysByYear(year);
            Object.assign(holidays, data);
            loadedYears.add(year);
        }
    }

    // 휴가 날짜 로드
    async function loadVacationDates() {
        try {
            if (!window.CURRENT_USER?.idx) return [];
            const year = new Date().getFullYear();
            const res = await fetch(`/api/vacation/requested-dates?userIdx=${window.CURRENT_USER.idx}&year=${year}`);
            if (!res.ok) throw new Error('휴가 날짜 로드 실패');
            return await res.json();
        } catch (e) {
            console.error('[Requisition] 휴가 날짜 로드 실패:', e);
            return [];
        }
    }

    function formatDateForInput(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    function isFutureDate(year, month, day) {
        const check = new Date(year, month, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        check.setHours(0, 0, 0, 0);
        return check > today;
    }

    function isToday(year, month, day) {
        const t = new Date();
        return year === t.getFullYear() && month === t.getMonth() && day === t.getDate();
    }

    // 공휴일·휴가 클래스 후처리
    function updateCalendarHolidays() {
        const allDays = dateCalendarDays.querySelectorAll('.date-calendar-day');
        allDays.forEach(dayEl => {
            const day = parseInt(dayEl.textContent);
            let dateStr;
            if (dayEl.classList.contains('other-month')) {
                const firstDow = new Date(calendarYear, calendarMonth, 1).getDay();
                if (day > 15) {
                    const pm = calendarMonth - 1, py = pm < 0 ? calendarYear - 1 : calendarYear;
                    dateStr = formatDateForInput(py, pm < 0 ? 11 : pm, day);
                } else {
                    const nm = calendarMonth + 1, ny = nm > 11 ? calendarYear + 1 : calendarYear;
                    dateStr = formatDateForInput(ny, nm > 11 ? 0 : nm, day);
                }
            } else {
                dateStr = formatDateForInput(calendarYear, calendarMonth, day);
            }

            if (holidays[dateStr] && !dayEl.classList.contains('holiday')) {
                dayEl.classList.add('holiday');
            }
            if (vacationDates.includes(dateStr) && !dayEl.classList.contains('vacation-day')) {
                dayEl.classList.add('vacation-day');
            }
        });
    }

    // 달력 렌더링
    async function renderDateCalendar() {
        const firstDay = new Date(calendarYear, calendarMonth, 1);
        const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
        const prevLastDay = new Date(calendarYear, calendarMonth, 0);

        const prevMonthYear = new Date(calendarYear, calendarMonth - 1, 1).getFullYear();
        const nextMonthYear = new Date(calendarYear, calendarMonth + 1, 1).getFullYear();

        // 백그라운드로 공휴일·휴가 로드 후 업데이트
        Promise.all([
            ensureHolidaysLoaded(prevMonthYear),
            ensureHolidaysLoaded(calendarYear),
            ensureHolidaysLoaded(nextMonthYear),
            loadVacationDates().then(d => { vacationDates = d; })
        ]).then(() => updateCalendarHolidays());

        const firstDow = firstDay.getDay();
        const lastDate = lastDay.getDate();
        const prevLastDate = prevLastDay.getDate();
        const selectedDateStr = currentDateInput ? currentDateInput.value : '';

        dateCalendarTitle.textContent = `${calendarYear}년 ${calendarMonth + 1}월`;
        dateCalendarDays.innerHTML = '';

        // 이전달 날짜
        for (let i = firstDow - 1; i >= 0; i--) {
            const day = prevLastDate - i;
            const d = new Date(calendarYear, calendarMonth - 1, day);
            const dateStr = formatDateForInput(d.getFullYear(), d.getMonth(), day);
            const dow = d.getDay();
            let cls = 'date-calendar-day other-month';
            if (dow === 0) cls += ' sunday';
            if (dow === 6) cls += ' saturday';
            if (dateStr === selectedDateStr) cls += ' selected';

            const el = document.createElement('div');
            el.className = cls;
            el.textContent = day;
            if (!vacationDates.includes(dateStr)) {
                el.addEventListener('click', () => selectCalendarDate(d.getFullYear(), d.getMonth(), day));
            }
            dateCalendarDays.appendChild(el);
        }

        // 이번달 날짜
        for (let day = 1; day <= lastDate; day++) {
            const dow = new Date(calendarYear, calendarMonth, day).getDay();
            const dateStr = formatDateForInput(calendarYear, calendarMonth, day);
            let cls = 'date-calendar-day';
            if (isToday(calendarYear, calendarMonth, day)) cls += ' today';
            if (dow === 0) cls += ' sunday';
            if (dow === 6) cls += ' saturday';
            if (dateStr === selectedDateStr) cls += ' selected';

            const el = document.createElement('div');
            el.className = cls;
            el.textContent = day;
            if (!vacationDates.includes(dateStr)) {
                el.addEventListener('click', () => selectCalendarDate(calendarYear, calendarMonth, day));
            }
            dateCalendarDays.appendChild(el);
        }

        // 다음달 날짜 (42칸 채우기)
        const remaining = 42 - dateCalendarDays.children.length;
        for (let day = 1; day <= remaining; day++) {
            const d = new Date(calendarYear, calendarMonth + 1, day);
            const dateStr = formatDateForInput(d.getFullYear(), d.getMonth(), day);
            const dow = d.getDay();
            let cls = 'date-calendar-day other-month';
            if (dow === 0) cls += ' sunday';
            if (dow === 6) cls += ' saturday';
            if (dateStr === selectedDateStr) cls += ' selected';

            const el = document.createElement('div');
            el.className = cls;
            el.textContent = day;
            if (!vacationDates.includes(dateStr)) {
                el.addEventListener('click', () => selectCalendarDate(d.getFullYear(), d.getMonth(), day));
            }
            dateCalendarDays.appendChild(el);
        }
    }

    function selectCalendarDate(year, month, day) {
        if (!currentDateInput) return;
        const dateStr = formatDateForInput(year, month, day);
        if (vacationDates.includes(dateStr)) {
            Swal.fire({ icon: 'warning', title: '선택 불가', text: '휴가 기간에는 지출을 신청할 수 없습니다.' });
            return;
        }
        const targetInput = currentDateInput;
        targetInput.value = dateStr;
        closeDateModal();
        updatePreview();
        // 날짜 선택 후 같은 항목의 적요 필드로 포커스 이동
        const item = targetInput.closest('.expense-item');
        const descInput = item?.querySelector('.description-input');
        if (descInput) setTimeout(() => descInput.focus(), 50);
    }

    window.closeDateModal = function() {
        dateModal?.classList.remove('show');
        currentDateInput = null;
    };

    async function openDateModal(inputEl) {
        currentDateInput = inputEl;
        if (inputEl.value) {
            const [y, m] = inputEl.value.split('-');
            calendarYear = parseInt(y);
            calendarMonth = parseInt(m) - 1;
        } else {
            calendarYear = new Date().getFullYear();
            calendarMonth = new Date().getMonth();
        }
        dateModal.classList.add('show');
        await renderDateCalendar();
    }

    document.getElementById('datePrevMonth')?.addEventListener('click', async function() {
        calendarMonth--;
        if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
        await renderDateCalendar();
    });

    document.getElementById('dateNextMonth')?.addEventListener('click', async function() {
        calendarMonth++;
        if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
        await renderDateCalendar();
    });

    dateModal?.addEventListener('click', function(e) {
        if (e.target === this) closeDateModal();
    });

    document.querySelectorAll('.req-date-picker').forEach(el => {
        el.addEventListener('click', function() { openDateModal(this); });
    });

    // ==========================================
    // 편집 모드: 기존 데이터 불러오기
    // ==========================================
    function populateForm(data) {
        // 기본 정보 (작성자는 CURRENT_USER 그대로 유지)
        if (data.content) {
            const el = document.getElementById('requisitionContent');
            if (el) el.value = data.content;
        }
        if (data.specialNote) {
            const el = document.getElementById('specialNote');
            if (el) el.value = data.specialNote;
        }
        if (data.paymentType) {
            const radio = document.querySelector(`input[name="paymentType"][value="${data.paymentType}"]`);
            if (radio) radio.checked = true;
        }

        // 항목 목록 재구성
        const container = document.getElementById('requisitionItemsContainer');
        if (container && data.items && data.items.length > 0) {
            container.innerHTML = '';
            itemCount = 0;
            data.items.forEach((item, idx) => {
                itemCount++;
                const div = document.createElement('div');
                div.className = 'expense-item';
                div.innerHTML = `
                    <span class="expense-item-number">${itemCount}</span>
                    <div class="expense-item-body">
                        <div class="form-row">
                            <div class="form-group" style="flex: 0 0 180px;">
                                <label><i class="fas fa-calendar-day"></i> 날짜 <span class="required-mark">*</span></label>
                                <input type="text" class="form-input date-input req-date-picker" value="${item.itemDate || ''}" readonly>
                            </div>
                            <div class="form-group" style="flex: 1;">
                                <label><i class="fas fa-edit"></i> 적요 <span class="required-mark">*</span></label>
                                <input type="text" class="form-input description-input" placeholder="지출 예정 내역 입력" value="${item.itemDesc || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex: 1;">
                                <label><i class="fas fa-store"></i> 상호</label>
                                <input type="text" class="form-input shop-input" placeholder="상호명 입력" value="${item.vendor || ''}">
                            </div>
                            <div class="form-group" style="flex: 0 0 180px;">
                                <label><i class="fas fa-won-sign"></i> 금액 <span class="required-mark">*</span></label>
                                <input type="text" class="form-input amount-input" placeholder="금액 입력" inputmode="numeric"
                                    value="${item.amount != null ? Number(item.amount).toLocaleString('ko-KR') : ''}">
                            </div>
                            <div class="form-group" style="flex: 0 0 150px;">
                                <label><i class="fas fa-sticky-note"></i> 비고</label>
                                <input type="text" class="form-input note-input" placeholder="" value="${item.remark || ''}">
                            </div>
                        </div>
                    </div>
                    <button type="button" class="btn-remove-item" onclick="removeRequisitionItem(this)">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                container.appendChild(div);
                bindItemEvents(div);
            });
        }

        // 삭제 버튼 표시
        const deleteBtn = document.getElementById('deleteBtn');
        if (deleteBtn) deleteBtn.style.display = 'flex';

        updateTotals();
        updatePreview();
        validateRequiredFields();
    }

    async function loadDocument(idx) {
        try {
            const res = await fetch(`/api/approval/requisition/${idx}`);
            if (!res.ok) throw new Error('LOAD_FAILED');
            const data = await res.json();
            populateForm(data);
        } catch (e) {
            console.error('[불러오기 실패] 품의서', e);
            showLoadFailure('품의서');
        }
    }

    if (editingIdx) {
        loadDocument(editingIdx);
    }

    // 페이지 로드 후 초기 검증
    setTimeout(validateRequiredFields, 300);

    // ==========================================
    // 키보드 탭 내비게이션 — Enter 키로 다음 필드 이동
    // ==========================================
    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter') return;
        const active = document.activeElement;
        if (!active) return;
        // textarea는 Enter로 줄바꿈 유지
        if (active.tagName === 'TEXTAREA') return;
        // 버튼/라디오는 기본 동작 유지
        if (active.tagName === 'BUTTON' || active.type === 'radio') return;

        // 포커스 가능한 폼 요소 순서대로 수집
        const focusable = Array.from(document.querySelectorAll(
            '.input-area .form-input:not([type="hidden"]), .input-area .form-textarea, .payment-type-group input[type="radio"]'
        )).filter(el => !el.disabled && el.closest('.input-area'));

        const idx = focusable.indexOf(active);
        if (idx !== -1 && idx < focusable.length - 1) {
            e.preventDefault();
            const next = focusable[idx + 1];
            next.focus();
            // readonly date picker는 calendar 열기
            if (next.classList.contains('req-date-picker')) {
                openDateModal(next);
            }
        }
    });

});
