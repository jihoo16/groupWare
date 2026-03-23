// 지출품의서 JavaScript
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
        const formatted = `${yyyy}-${mm}-${dd}`;
        const docDateEl = document.getElementById('documentDate');
        if (docDateEl) docDateEl.textContent = formatted;

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

    document.getElementById('addRowBtn').addEventListener('click', function() {
        itemCount++;
        const container = document.getElementById('requisitionItemsContainer');
        const item = document.createElement('div');
        item.className = 'expense-item';
        item.innerHTML = `
            <div class="expense-item-header">
                <span class="expense-item-number">${itemCount}</span>
                <button type="button" class="btn-remove-item" onclick="removeRequisitionItem(this)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="expense-item-body">
                <div class="form-row">
                    <div class="form-group" style="flex: 0 0 160px;">
                        <label><i class="fas fa-calendar-day"></i> 날짜</label>
                        <input type="text" class="form-input date-input req-date-picker" value="${todayStr()}" readonly>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label><i class="fas fa-edit"></i> 적요</label>
                        <input type="text" class="form-input desc-input" placeholder="내용 입력">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex: 1;">
                        <label><i class="fas fa-won-sign"></i> 금액</label>
                        <input type="text" class="form-input amount-input" placeholder="금액 입력" inputmode="numeric">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label><i class="fas fa-store"></i> 상대처</label>
                        <input type="text" class="form-input vendor-input" placeholder="상대처 입력">
                    </div>
                    <div class="form-group" style="flex: 0 0 150px;">
                        <label><i class="fas fa-sticky-note"></i> 비고</label>
                        <input type="text" class="form-input note-input" placeholder="">
                    </div>
                </div>
            </div>
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
        });

        // 나머지 필드 → 미리보기 갱신
        ['desc-input', 'vendor-input', 'note-input'].forEach(cls => {
            item.querySelector(`.${cls}`)?.addEventListener('input', updatePreview);
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
        const docDate = document.getElementById('documentDate')?.textContent || '-';
        const applicant = document.getElementById('applicantName')?.textContent || '-';
        const content = document.getElementById('requisitionContent')?.value || '';
        const specialNote = document.getElementById('specialNote')?.value || '';
        const payType = document.querySelector('input[name="paymentType"]:checked')?.value || null;

        // 지급 종류 표시 (○ 마킹)
        const cashMark    = payType === '현금'      ? '○' : '&nbsp;&nbsp;';
        const bizMark     = payType === '사업비카드' ? '○' : '&nbsp;&nbsp;';
        const personalMark = payType === '개인카드'  ? '○' : '&nbsp;&nbsp;';
        const payTypeHtml = `현금(${cashMark}) / 사업비카드(${bizMark}) / 개인카드(${personalMark})`;

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        const setHtml = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };

        set('previewDocDate', docDate);
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
            const desc   = item.querySelector('.desc-input')?.value || '';
            const amtRaw = (item.querySelector('.amount-input')?.value || '').replace(/,/g, '');
            const vendor = item.querySelector('.vendor-input')?.value || '';
            const note   = item.querySelector('.note-input')?.value || '';
            const amt    = Number(amtRaw) || 0;
            totalAmount += amt;

            rows += `<tr>
                <td>${date}</td>
                <td style="text-align:left;">${desc}</td>
                <td style="text-align:right;">${amt ? amt.toLocaleString('ko-KR') : ''}</td>
                <td>${vendor}</td>
                <td>${note}</td>
            </tr>`;
        });

        tbody.innerHTML = rows || '<tr><td class="empty-row" colspan="5">내역이 없습니다</td></tr>';
        set('previewTotalAmount', totalAmount ? totalAmount.toLocaleString('ko-KR') : '-');

        // 인쇄 버튼 가시성
        const hasRequired = content.trim() && payType && totalAmount > 0;
        const printBtn = document.getElementById('printBtn');
        if (printBtn) printBtn.style.display = hasRequired ? 'flex' : 'none';
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
            const itemDesc = item.querySelector('.desc-input')?.value?.trim() || '';
            const amtRaw = (item.querySelector('.amount-input')?.value || '').replace(/,/g, '');
            const amount = amtRaw ? parseFloat(amtRaw) : null;
            const vendor = item.querySelector('.vendor-input')?.value?.trim() || '';
            const remark = item.querySelector('.note-input')?.value?.trim() || '';
            items.push({ itemDate: itemDate || null, itemDesc, amount, vendor, remark, sortOrder: sortOrder++ });
        });

        return { content, paymentType, specialNote, items };
    }

    // ==========================================
    // 저장 버튼
    // ==========================================
    document.getElementById('submitBtn')?.addEventListener('click', async function() {
        const content = document.getElementById('requisitionContent')?.value?.trim();
        const payType = document.querySelector('input[name="paymentType"]:checked')?.value;

        if (!content) {
            Swal.fire({ icon: 'warning', title: '입력 필요', text: '품의 내용을 입력해주세요.' });
            document.getElementById('requisitionContent')?.focus();
            return;
        }
        if (!payType) {
            Swal.fire({ icon: 'warning', title: '입력 필요', text: '지급 종류를 선택해주세요.' });
            return;
        }
        let hasAmount = false;
        document.querySelectorAll('.amount-input').forEach(input => {
            if (Number(input.value.replace(/,/g, '')) > 0) hasAmount = true;
        });
        if (!hasAmount) {
            Swal.fire({ icon: 'warning', title: '입력 필요', text: '지출 예정 내역에 금액을 입력해주세요.' });
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
                throw new Error(err.message || `서버 오류 (${res.status})`);
            }

            const data = await res.json();
            editingIdx = data.idx;

            // URL 업데이트 (신규 → 수정 모드로 전환, 새로고침 없이)
            if (!isEdit) {
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set('idx', data.idx);
                window.history.replaceState({}, '', newUrl.toString());
            }

            // 미리보기 열기
            if (formWrapper && !formWrapper.classList.contains('expanded')) {
                formWrapper.classList.add('expanded');
                formWrapper.classList.remove('collapsed');
                if (toggleBtn) toggleBtn.classList.add('active');
                updatePreview();
            }

            // 삭제 버튼 표시
            const deleteBtn = document.getElementById('deleteBtn');
            if (deleteBtn) deleteBtn.style.display = 'flex';

            Swal.fire({
                icon: 'success',
                title: isEdit ? '수정 완료' : '저장 완료',
                text: isEdit ? '품의서가 수정되었습니다.' : '품의서가 저장되었습니다. 인쇄하기 버튼으로 출력하세요.',
                confirmButtonColor: '#667eea'
            });
        } catch (e) {
            Swal.fire({ icon: 'error', title: '저장 실패', text: e.message });
        }
    });

    // ==========================================
    // 삭제 버튼
    // ==========================================
    document.getElementById('deleteBtn')?.addEventListener('click', async function() {
        if (!editingIdx) return;

        const result = await Swal.fire({
            title: '품의서 삭제',
            text: '삭제된 품의서는 복구할 수 없습니다. 삭제하시겠습니까?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e53e3e',
            cancelButtonColor: '#718096',
            confirmButtonText: '삭제',
            cancelButtonText: '취소'
        });

        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`/api/approval/requisition/${editingIdx}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || `서버 오류 (${res.status})`);
            }
            await Swal.fire({ icon: 'success', title: '삭제 완료', text: '품의서가 삭제되었습니다.', confirmButtonColor: '#667eea' });
            history.back();
        } catch (e) {
            Swal.fire({ icon: 'error', title: '삭제 실패', text: e.message });
        }
    });

    // ==========================================
    // 인쇄
    // ==========================================
    document.getElementById('printBtn')?.addEventListener('click', function() {
        updatePreview();
        window.print();
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
            if (isFutureDate(d.getFullYear(), d.getMonth(), day)) cls += ' future-date';

            const el = document.createElement('div');
            el.className = cls;
            el.textContent = day;
            if (!isFutureDate(d.getFullYear(), d.getMonth(), day) && !vacationDates.includes(dateStr)) {
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
            if (isFutureDate(calendarYear, calendarMonth, day)) cls += ' future-date';
            if (dateStr === selectedDateStr) cls += ' selected';

            const el = document.createElement('div');
            el.className = cls;
            el.textContent = day;
            if (!isFutureDate(calendarYear, calendarMonth, day) && !vacationDates.includes(dateStr)) {
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
            if (isFutureDate(d.getFullYear(), d.getMonth(), day)) cls += ' future-date';

            const el = document.createElement('div');
            el.className = cls;
            el.textContent = day;
            if (!isFutureDate(d.getFullYear(), d.getMonth(), day) && !vacationDates.includes(dateStr)) {
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
        currentDateInput.value = dateStr;
        closeDateModal();
        updatePreview();
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
                    <div class="expense-item-header">
                        <span class="expense-item-number">${itemCount}</span>
                        <button type="button" class="btn-remove-item" onclick="removeRequisitionItem(this)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="expense-item-body">
                        <div class="form-row">
                            <div class="form-group" style="flex: 0 0 160px;">
                                <label><i class="fas fa-calendar-day"></i> 날짜</label>
                                <input type="text" class="form-input date-input req-date-picker" value="${item.itemDate || ''}" readonly>
                            </div>
                            <div class="form-group" style="flex: 1;">
                                <label><i class="fas fa-edit"></i> 적요</label>
                                <input type="text" class="form-input desc-input" placeholder="내용 입력" value="${item.itemDesc || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex: 1;">
                                <label><i class="fas fa-won-sign"></i> 금액</label>
                                <input type="text" class="form-input amount-input" placeholder="금액 입력" inputmode="numeric"
                                    value="${item.amount != null ? Number(item.amount).toLocaleString('ko-KR') : ''}">
                            </div>
                            <div class="form-group" style="flex: 1;">
                                <label><i class="fas fa-store"></i> 상대처</label>
                                <input type="text" class="form-input vendor-input" placeholder="상대처 입력" value="${item.vendor || ''}">
                            </div>
                            <div class="form-group" style="flex: 0 0 160px;">
                                <label><i class="fas fa-sticky-note"></i> 비고</label>
                                <input type="text" class="form-input note-input" placeholder="" value="${item.remark || ''}">
                            </div>
                        </div>
                    </div>
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
    }

    async function loadDocument(idx) {
        try {
            const res = await fetch(`/api/approval/requisition/${idx}`);
            if (!res.ok) throw new Error(`불러오기 실패 (${res.status})`);
            const data = await res.json();
            populateForm(data);
        } catch (e) {
            Swal.fire({ icon: 'error', title: '불러오기 실패', text: e.message });
        }
    }

    if (editingIdx) {
        loadDocument(editingIdx);
    }

});
