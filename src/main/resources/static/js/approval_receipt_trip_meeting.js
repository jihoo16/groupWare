// 연구비 증빙 - 회의+출장 통합 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    let selectedReceiptFiles = [];
    let selectedDocumentFiles = [];
    let selectedEmployee = null;
    let projects = []; // 프로젝트 목록
    let projectCards = []; // 선택된 프로젝트의 카드 목록
    let selectedCard = null; // 선택된 카드
    let projectMembers = []; // 선택된 프로젝트의 참여인원
    let positionCodes = []; // 직급 코드 목록 (C02, sortOrder 기준)
    let projectExpenseSettings = []; // 선택된 프로젝트의 직급별 경비 설정
    let fixedExpenses = {}; // 기초정보관리 직급별 출장비
    let fixedMealExpenses = {}; // 기초정보관리 직급별 중식비
    let allExternalPersons = []; // 외부인력 목록
    let tempSelectedExternalIds = new Set(); // 모달 내 임시 선택 상태
    let authorPersonId = null; // 현재 작성자 ID (제거 불가 처리용)
    let attendees = []; // 회의 참석자 목록 (validateRequiredFields 등에서 공유)
    let tripPersons = []; // 출장 인원 목록 (validateRequiredFields 등에서 공유)
    let dailyExpenses = []; // 일별 비용 목록 (submit 핸들러에서 공유)

    // DOM 요소
    const templateTreeHeaders = document.querySelectorAll('.tree-node-header[data-template]');
    const categoryNodes = document.querySelectorAll('.tree-node-header.category-node');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const documentForm = document.getElementById('documentForm');
    const receiptInput = document.getElementById('receiptInput');
    const receiptFileList = document.getElementById('receiptFileList');
    const receiptUploadArea = document.getElementById('receiptUploadArea');
    const documentInput = document.getElementById('documentInput');
    const documentFileList = document.getElementById('documentFileList');
    const documentUploadArea = document.getElementById('documentUploadArea');
    const submitBtn = document.getElementById('submitBtn');

    // 직원 데이터 (API에서 로드)
    let employees = [];

    // 직원 데이터 로드 함수
    async function loadEmployees() {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const users = await response.json();
                employees = users.map(user => ({
                    id: user.idx,
                    name: user.empName,
                    position: user.empPositionName || user.empPosition || '직급 미지정',
                    dept: user.empDeptName || user.empDept || '부서 미지정'
                }));
                console.log('직원 데이터 로드 완료:', employees.length + '명');
            } else {
                console.error('직원 데이터 로드 실패:', response.status);
                showError('직원 데이터를 불러오는데 실패했습니다. 관리자에게 문의하세요.');
            }
        } catch (error) {
            console.error('직원 데이터 로드 오류:', error);
            showError('직원 데이터를 불러오는데 오류가 발생했습니다.');
        }
    }

    // 외부인력 목록 로드
    async function loadExternalPersons() {
        try {
            const response = await fetch('/api/external-persons');
            if (response.ok) {
                allExternalPersons = await response.json();
            } else {
                console.error('외부인력 목록 로드 실패');
            }
        } catch (error) {
            console.error('외부인력 목록 로드 오류:', error);
        }
    }

    // 프로젝트 목록 로드
    async function loadProjects() {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                projects = await response.json();
                console.log('프로젝트 목록 로드 성공:', projects.length + '건');
            } else {
                console.error('프로젝트 목록 로드 실패');
            }
        } catch (error) {
            console.error('프로젝트 목록 로드 오류:', error);
        }
    }

    // 프로젝트 카드 목록 로드
    async function loadProjectCards(projectIdx) {
        try {
            const response = await fetch(`/api/projects/${projectIdx}/cards`);
            if (response.ok) {
                projectCards = await response.json();
            } else {
                projectCards = [];
            }
        } catch (error) {
            console.error('카드 목록 로드 오류:', error);
            projectCards = [];
        }
    }

    // 프로젝트 참여인원 로드
    async function loadProjectMembers(projectIdx) {
        if (!projectIdx) { projectMembers = []; return; }
        try {
            const response = await fetch(`/api/projects/${projectIdx}`);
            const contentType = response.headers.get('content-type');
            if (response.ok && contentType && contentType.includes('application/json')) {
                const project = await response.json();
                projectMembers = project.projectMembers || [];
            } else {
                projectMembers = [];
            }
        } catch (e) {
            console.error('프로젝트 참여인원 로드 오류:', e);
            projectMembers = [];
        }
    }

    // 기초정보관리 직급별 고정경비 로드
    async function loadFixedExpenses() {
        try {
            const response = await fetch('/api/fixed-expense-policies');
            if (response.ok) {
                const data = await response.json();
                fixedExpenses = {};
                fixedMealExpenses = {};
                data.forEach(item => {
                    if (!item.amount) return;
                    if (item.expenseItemName === '출장비') {
                        if (item.positionCode) fixedExpenses[item.positionCode] = item.amount;
                        if (item.positionName)  fixedExpenses[item.positionName]  = item.amount;
                    } else if (item.expenseItemName === '중식비') {
                        if (item.positionCode) fixedMealExpenses[item.positionCode] = item.amount;
                        if (item.positionName)  fixedMealExpenses[item.positionName]  = item.amount;
                    }
                });
            }
        } catch (e) {
            console.error('고정경비 로드 오류:', e);
        }
    }

    // 프로젝트 직급별 경비 설정 로드
    async function loadProjectExpenseSettings(projectIdx) {
        if (!projectIdx) { projectExpenseSettings = []; return; }
        try {
            const response = await fetch(`/api/projects/${projectIdx}/expense-settings`);
            if (response.ok) {
                projectExpenseSettings = await response.json();
            } else {
                projectExpenseSettings = [];
            }
        } catch (e) {
            projectExpenseSettings = [];
        }
    }

    // 직급명 기준으로 개인 경비(일비/식비) 계산
    function getPersonExpense(person) {
        const codeEntry = positionCodes.find(p => p.codeName === person.position);
        const code = codeEntry?.code || '';

        let meal = 0;
        if (projectExpenseSettings.length > 0 && code) {
            const ms = projectExpenseSettings.find(s => s.positionCode === code && s.expenseItemName === '중식비');
            if (ms?.amount) meal = ms.amount;
        }
        if (!meal) meal = fixedMealExpenses[code] || fixedMealExpenses[person.position] || 0;

        let daily = 0;
        if (projectExpenseSettings.length > 0 && code) {
            const ds = projectExpenseSettings.find(s => s.positionCode === code && s.expenseItemName === '출장비');
            if (ds?.amount) daily = ds.amount;
        }
        if (!daily) daily = fixedExpenses[code] || fixedExpenses[person.position] || 0;

        return { meal, daily };
    }

    // 직급명 기준으로 개인 회의비 계산
    function getPersonMeetingExpense(person) {
        const codeEntry = positionCodes.find(p => p.codeName === person.position);
        const code = codeEntry?.code || '';
        let meeting = 0;
        if (projectExpenseSettings.length > 0 && code) {
            const ms = projectExpenseSettings.find(s => s.positionCode === code && (s.expenseItemName || '').includes('회의'));
            if (ms?.amount) meeting = ms.amount;
        }
        return meeting;
    }

    // 출장인원 툴팁: 직급별 식비/일비
    function updateTripExpenseTooltip() {
        const content = document.getElementById('tripExpenseTooltipContent');
        if (!content) return;
        if (!projectMembers || projectMembers.length === 0) {
            content.innerHTML = '<div class="expense-tooltip-loading" style="line-height:1.4;">프로젝트 선택 시<br>직급별 출장비 정보를<br>확인하실 수 있습니다</div>';
            return;
        }
        const seen = new Set();
        const positions = projectMembers
            .map(m => ({ name: m.employeePositionName || '직급 미지정', code: m.employeePositionCode }))
            .filter(p => { if (seen.has(p.name)) return false; seen.add(p.name); return true; });

        const rows = positions.map(pos => {
            let meal = 0;
            if (projectExpenseSettings.length > 0 && pos.code) {
                const ms = projectExpenseSettings.find(s => s.positionCode === pos.code && s.expenseItemName === '중식비');
                if (ms?.amount) meal = ms.amount;
            }
            if (!meal) meal = fixedMealExpenses[pos.code] || fixedMealExpenses[pos.name] || 0;

            let daily = 0;
            if (projectExpenseSettings.length > 0 && pos.code) {
                const ds = projectExpenseSettings.find(s => s.positionCode === pos.code && s.expenseItemName === '출장비');
                if (ds?.amount) daily = ds.amount;
            }
            if (!daily) daily = fixedExpenses[pos.code] || fixedExpenses[pos.name] || 0;

            return `<div class="expense-tooltip-item">
                <span class="expense-tooltip-position">${pos.name}</span>
                <span class="expense-tooltip-amount">식비 ${meal.toLocaleString()}원 / 일비 ${daily.toLocaleString()}원</span>
            </div>`;
        }).join('');

        content.innerHTML = `
            <div class="expense-tooltip-header">직급별 경비 기준 (1일)</div>
            ${rows || '<div class="expense-tooltip-loading">경비 기준 정보가 없습니다</div>'}
        `;
    }

    // 회의참석자 툴팁: 직급별 회의비
    function updateMeetingExpenseTooltip() {
        const content = document.getElementById('meetingExpenseTooltipContent');
        if (!content) return;
        if (!projectExpenseSettings || projectExpenseSettings.length === 0) {
            content.innerHTML = '<div class="expense-tooltip-loading" style="line-height:1.4;">프로젝트 선택 시<br>직급별 회의비 정보를<br>확인하실 수 있습니다</div>';
            return;
        }
        const meetingExpenses = projectExpenseSettings.filter(s => {
            const name = (s.expenseItemName || '').toLowerCase();
            return name.includes('회의');
        });
        if (meetingExpenses.length === 0) {
            content.innerHTML = '<div class="expense-tooltip-empty">회의비 설정이 없습니다</div>';
            return;
        }
        let html = '<div class="expense-tooltip-header">직급별 회의비</div>';
        meetingExpenses.forEach(s => {
            html += `<div class="expense-tooltip-item">
                <span class="expense-tooltip-position">${s.positionName || s.positionCode}</span>
                <span class="expense-tooltip-amount">${(s.amount || 0).toLocaleString()}원</span>
            </div>`;
        });
        content.innerHTML = html;
    }

    // 직급 코드 로드 (C02, sortOrder 오름차순 = 낮은 직급 먼저)
    async function loadPositionCodes() {
        try {
            const response = await fetch('/api/codes/ranks?activeOnly=true');
            if (response.ok) {
                positionCodes = await response.json();
                // sortOrder 오름차순 정렬 (낮은 직급 먼저)
                positionCodes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            }
        } catch (e) {
            console.error('직급 코드 로드 오류:', e);
        }
    }

    // positionCode(code값) → sortOrder 반환
    function getPositionSortOrder(positionCode) {
        if (!positionCode) return 9999;
        const found = positionCodes.find(p => p.code === positionCode);
        return found ? (found.sortOrder || 9999) : 9999;
    }

    // 프로젝트 멤버를 낮은 직급(작은 sortOrder)부터 정렬
    function sortByPositionAsc(members) {
        return [...members].sort((a, b) =>
            getPositionSortOrder(a.positionCode) - getPositionSortOrder(b.positionCode)
        );
    }

    async function checkAuthorDuplicate(empIdx, date, startTime, endTime, projectIdx) {
        try {
            const url = `/api/receipt-common/check-duplicate?date=${date}&attendeeIdx=${empIdx}&projectIdx=${projectIdx}&startTime=${startTime}&endTime=${endTime}`;
            const response = await fetch(url);
            if (!response.ok) return false;
            const data = await response.json();
            if (!Array.isArray(data) || data.length === 0) return false;
            for (const doc of data) {
                const s = doc.startTime?.substring(0, 5);
                const e = doc.endTime?.substring(0, 5);
                if (s && e && isTimeOverlap(s, e, startTime, endTime)) return true;
            }
            return false;
        } catch { return false; }
    }

    function isTimeOverlap(s1, e1, s2, e2) {
        return s1 < e2 && s2 < e1;
    }

    async function setDefaultAuthor() {
        if (projectMembers.length === 0) return;

        const members = projectMembers.map(m => ({
            id: m.employeeIdx || m.id,
            name: m.employeeName || m.name,
            dept: m.employeeDeptName || m.dept || '',
            position: m.employeePositionName || m.position || '',
            positionCode: m.employeePositionCode || m.positionCode || ''
        }));

        const sorted = sortByPositionAsc(members);

        const dateInput = document.getElementById('common_meeting_date');
        const startInput = document.getElementById('common_start_time');
        const endInput = document.getElementById('common_end_time');
        const projectIdxInput = document.getElementById('selectedProjectIdx');

        let author = null;

        if (dateInput?.value && startInput?.value && endInput?.value && projectIdxInput?.value) {
            const date = dateInput.value;
            const startTime = startInput.value;
            const endTime = endInput.value;
            const projectIdx = projectIdxInput.value;

            // 낮은 직급에서 4번째가 기본 후보
            const candidate = sorted[3] || sorted[0];
            const isDup = await checkAuthorDuplicate(candidate.id, date, startTime, endTime, projectIdx);

            if (!isDup) {
                author = candidate;
            } else {
                for (const person of sorted) {
                    const dup = await checkAuthorDuplicate(person.id, date, startTime, endTime, projectIdx);
                    if (!dup) { author = person; break; }
                }
                if (!author) {
                    await Swal.fire({
                        icon: 'warning',
                        title: '시간 중복',
                        html: `선택하신 시간대(<strong>${startTime} ~ ${endTime}</strong>)에<br>참여 가능한 프로젝트 멤버가 없습니다.<br><br>회의 시간을 변경해주세요.`,
                        confirmButtonText: '확인'
                    });
                    if (startInput) startInput.focus();
                    return;
                }
            }
        } else {
            author = sorted[3] || sorted[0];
        }

        if (author && window.setAuthorInTemplate) {
            window.setAuthorInTemplate(author);
        }
    }


    // ============================================
    // 템플릿 사이드바 접기/펼치기 기능
    // ============================================

    // 전체 접기/펼치기 버튼
    const toggleAllBtn = document.getElementById('toggleAllBtn');
    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', function() {
            const categories = document.querySelectorAll('.menu-category');
            const allExpanded = Array.from(categories).every(cat => cat.classList.contains('expanded'));

            categories.forEach(category => {
                if (allExpanded) {
                    category.classList.remove('expanded');
                } else {
                    category.classList.add('expanded');
                }
            });

            // 버튼 아이콘 변경
            const icon = this.querySelector('i');
            if (allExpanded) {
                icon.className = 'fas fa-chevron-up';
            } else {
                icon.className = 'fas fa-chevron-down';
            }
        });
    }

    // 각 카테고리 헤더 클릭 시 토글
    const categoryHeaders = document.querySelectorAll('.category-header');
    categoryHeaders.forEach(header => {
        header.addEventListener('click', function(e) {
            // 링크 클릭 방지
            e.preventDefault();

            const category = this.closest('.menu-category');
            category.classList.toggle('expanded');

            // 전체 버튼 상태 업데이트
            updateToggleAllButton();
        });
    });

    // 전체 버튼 상태 업데이트
    function updateToggleAllButton() {
        if (!toggleAllBtn) return;

        const categories = document.querySelectorAll('.menu-category');
        const allExpanded = Array.from(categories).every(cat => cat.classList.contains('expanded'));
        const allCollapsed = Array.from(categories).every(cat => !cat.classList.contains('expanded'));

        const icon = toggleAllBtn.querySelector('i');
        if (allCollapsed) {
            icon.className = 'fas fa-chevron-up';
        } else if (allExpanded) {
            icon.className = 'fas fa-chevron-down';
        }
    }

    // 템플릿 선택
    templateTreeHeaders.forEach(header => {
        header.addEventListener('click', function() {
            templateTreeHeaders.forEach(h => h.classList.remove('active'));
            this.classList.add('active');

            const template = this.getAttribute('data-template');
            loadTemplate(template);
        });
    });

    // 템플릿 로드
    function loadTemplate(templateKey) {
        const templateElement = document.getElementById('template-' + templateKey);
        if (templateElement) {
            documentForm.innerHTML = templateElement.innerHTML;
            if (templateKey === 'receipt-trip') {
                setupTripAutoFill();
                setupDocumentFormToggle();
            }
        }
    }

    // 회의+출장 자동 채우기 기능
    function setupTripAutoFill() {
        const commonProject = document.getElementById('common_project');
        const commonAuthor = document.getElementById('common_author');
        const commonLocation = document.getElementById('common_location');
        const commonDate = document.getElementById('common_date');
        const commonDuration = document.getElementById('common_duration');
        const commonPurpose = document.getElementById('common_purpose');
        const commonTripResult = document.getElementById('common_trip_result');
        const commonMeetingContent = document.getElementById('common_meeting_content');
        const tripPersonArea = document.getElementById('tripPersonArea');
        const tripPersonList = document.getElementById('tripPersonList');
        const attendeeArea = document.getElementById('attendeeArea');
        const addAttendeeBtn = document.getElementById('addAttendeeBtn');
        const removeAttendeeBtn = document.getElementById('removeAttendeeBtn');
        const attendeeList = document.getElementById('attendeeList');
        const dailyExpenseBody = document.getElementById('dailyExpenseBody');

        dailyExpenses = [];
        attendees = [];

        // 출장 인원 모달 초기화
        if (tripPersonArea) {
            tripPersonArea.addEventListener('click', function(e) {
                if (e.target.closest('.trip-person-remove')) return;
                if (e.target.closest('.trip-person-item') || e.target.closest('.add-more-persons-btn')) return;
                if (tripPersons.length > 0) return;
                openTripPersonModal();
            });
        }

        // 회의 참석자 모달 초기화 — 전체 영역 클릭 제거, 명시적 버튼으로 대체

        // 출장 인원 추가 버튼 표시/숨김
        function showAddPersonButton() {
            if (!tripPersonArea) return;
            let btn = tripPersonArea.querySelector('.add-more-persons-btn');
            if (!btn) {
                btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'add-more-persons-btn';
                btn.onclick = openTripPersonModal;
                btn.innerHTML = '<i class="fas fa-user-plus"></i> 출장인원 추가';
                tripPersonArea.appendChild(btn);
            }
            btn.style.display = 'flex';
        }

        function hideAddPersonButton() {
            if (!tripPersonArea) return;
            const btn = tripPersonArea.querySelector('.add-more-persons-btn');
            if (btn) btn.style.display = 'none';
        }

        // 출장 인원 목록 렌더링 함수
        function renderTripPersonListInTemplate() {
            if (!tripPersonList) return;

            if (tripPersons.length === 0) {
                tripPersonArea && tripPersonArea.classList.remove('has-persons');
                tripPersonList.innerHTML = `
                    <div class="empty-attendee-state">
                        <i class="fas fa-user-plus"></i>
                        <div>클릭하여 출장 인원 추가</div>
                    </div>
                `;
                hideAddPersonButton();
            } else {
                tripPersonArea && tripPersonArea.classList.add('has-persons');
                // 최저직급(사원) 먼저 정렬
                const sortedTripPersons = [...tripPersons].sort((a, b) => {
                    const codeA = positionCodes.find(pc => pc.codeName === a.position)?.code || '';
                    const codeB = positionCodes.find(pc => pc.codeName === b.position)?.code || '';
                    return getPositionSortOrder(codeB) - getPositionSortOrder(codeA);
                });
                tripPersonList.innerHTML = sortedTripPersons.map(person => {
                    const { meal, daily } = getPersonExpense(person);
                    const expenseTag = (meal || daily)
                        ? `<span class="expense-tag">일비 ${daily.toLocaleString()}원 · 식비 ${meal.toLocaleString()}원</span>`
                        : '';
                    const isAuthor = authorPersonId && String(person.id) === authorPersonId;
                    const authorBadge = isAuthor ? '<span class="author-badge">작성자</span>' : '';
                    const deleteButton = isAuthor
                        ? `<span class="cannot-remove-text"><i class="fas fa-lock"></i> 삭제 불가</span>`
                        : `<button type="button" class="trip-person-remove" onclick="removeTripPersonInTemplate('${person.id}')"><i class="fas fa-times"></i> 삭제</button>`;
                    return `
                    <div class="trip-person-item${isAuthor ? ' is-author' : ''}" onclick="event.stopPropagation();">
                        <div class="trip-person-info">
                            <span class="name">${person.name}${authorBadge}</span>
                            <span>${person.dept}</span>
                            <span>${person.position}</span>
                            ${expenseTag}
                        </div>
                        ${deleteButton}
                    </div>`;
                }).join('');
                showAddPersonButton();
            }

            // 출장인원 수 뱃지 업데이트
            const tripCountBadge = document.getElementById('tripPersonCount');
            if (tripCountBadge) {
                if (tripPersons.length > 0) {
                    tripCountBadge.textContent = `${tripPersons.length}명`;
                    tripCountBadge.style.display = 'inline-flex';
                } else {
                    tripCountBadge.style.display = 'none';
                }
            }

            updateTripPersonDisplay();
            addExpenseGuideRow();
        }

        // 템플릿 내에서 인원 제거
        window.removeTripPersonInTemplate = function(personId) {
            if (authorPersonId && String(personId) === authorPersonId) return; // 작성자 제거 불가
            tripPersons = tripPersons.filter(p => p.id !== personId);
            renderTripPersonListInTemplate();
            renderAttendeeListInTemplate();
        };

        // 출장 인원 테이블 업데이트
        function updateTripPersonDisplay() {
            const personRows = document.querySelectorAll('.trip-person-row');

            // 모든 행의 첫 3개 셀 업데이트 (최대 5명까지 지원)
            personRows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                if (index < tripPersons.length) {
                    cells[0].textContent = tripPersons[index].dept || '';
                    cells[1].textContent = tripPersons[index].position || '';
                    cells[2].textContent = tripPersons[index].name || '';
                } else {
                    cells[0].textContent = '';
                    cells[1].textContent = '';
                    cells[2].textContent = '';
                }
            });

            // 출장내용 및 결과 업데이트
            updateTripResult();
        }

        // 전역 함수로 등록하여 모달에서 접근 가능하게
        window.addPersonsToTrip = function(persons) {
            persons.forEach(person => {
                if (!tripPersons.some(p => p.id === person.id)) {
                    tripPersons.push(person);
                }
            });
            renderTripPersonListInTemplate();
            renderAttendeeListInTemplate();
        };

        window.getTripPersons = function() { return tripPersons; };
        window.getExternalAttendees = function() { return attendees; };
        window.refreshTripPersonBadges = function() { renderTripPersonListInTemplate(); };

        // 출장인원 목록을 교체 (모달에서 선택 확정 시 사용)
        window.replaceTripPersons = function(persons) {
            tripPersons = persons;
            // 작성자가 인원 목록에서 빠진 경우 작성자 필드도 초기화
            if (authorPersonId && !persons.some(p => String(p.id) === authorPersonId)) {
                authorPersonId = null;
                const authorField = document.getElementById('common_author');
                if (authorField) authorField.value = '';
                document.querySelectorAll('.auto-author').forEach(el => { el.value = ''; });
                document.querySelectorAll('.auto-reporter').forEach(el => { el.textContent = ''; });
            }
            renderTripPersonListInTemplate();
            renderAttendeeListInTemplate();
        };

        window.setAuthorInTemplate = function(person) {
            authorPersonId = String(person.id); // 작성자 ID 기록
            const authorField = document.getElementById('common_author');
            if (authorField) {
                authorField.value = person.name;
                document.querySelectorAll('.auto-author').forEach(el => { el.value = person.name; });
                document.querySelectorAll('.auto-reporter').forEach(el => { el.textContent = person.name; });
            }

            // 작성자를 출장인원에 자동 등록 (내부인원은 회의참석자로 자동 표시됨)
            const personEntry = {
                id: String(person.id),
                name: person.name,
                dept: person.dept || '',
                position: person.position || ''
            };
            if (window.addPersonsToTrip) window.addPersonsToTrip([personEntry]);
        };

        // 기존 버튼 방식은 제거됨 - 이제 모달 방식으로 작동

        // 회의 참석자 목록 렌더링 함수 (내부=출장인원 자동, 외부=attendees 배열)
        function renderAttendeeListInTemplate() {
            if (!attendeeList) return;

            // 최저직급(사원) 먼저 정렬
            const internalPersons = [...tripPersons].sort((a, b) => {
                const codeA = positionCodes.find(pc => pc.codeName === a.position)?.code || '';
                const codeB = positionCodes.find(pc => pc.codeName === b.position)?.code || '';
                return getPositionSortOrder(codeB) - getPositionSortOrder(codeA);
            });
            const externalAttendees = attendees;

            if (internalPersons.length === 0 && externalAttendees.length === 0) {
                attendeeList.innerHTML = `
                    <div class="empty-attendee-state">
                        <i class="fas fa-user-plus"></i>
                        <div>외부 참석자를 추가해주세요</div>
                    </div>
                `;
            } else {
                const internalHtml = internalPersons.map(person => `
                    <div class="trip-person-item">
                        <div class="trip-person-info">
                            <span class="name">${person.name}</span>
                            <span>${person.dept}</span>
                            <span>${person.position}</span>
                            <span class="attendee-internal-badge"><i class="fas fa-building"></i> 내부</span>
                        </div>
                    </div>
                `).join('');

                const externalHtml = externalAttendees.map(attendee => `
                    <div class="trip-person-item">
                        <div class="trip-person-info">
                            <span class="name">${attendee.name}<span class="external-badge">외부</span></span>
                            <span>${attendee.dept}</span>
                            <span>${attendee.position}</span>
                        </div>
                        <button type="button" class="trip-person-remove attendee-remove" onclick="removeAttendeeInTemplate('${attendee.id}')">
                            <i class="fas fa-times"></i> 제거
                        </button>
                    </div>
                `).join('');

                attendeeList.innerHTML = internalHtml + externalHtml;
            }

            // 회의참석자 수 뱃지 업데이트 (내부+외부 합계)
            const attendeeCountBadge = document.getElementById('attendeeCount');
            if (attendeeCountBadge) {
                const total = tripPersons.length + attendees.length;
                if (total > 0) {
                    const parts = [];
                    if (tripPersons.length > 0) parts.push(`내부 ${tripPersons.length}`);
                    if (attendees.length > 0) parts.push(`외부 ${attendees.length}`);
                    attendeeCountBadge.textContent = `총 ${total}명 (${parts.join(' · ')})`;
                    attendeeCountBadge.style.display = 'inline-flex';
                } else {
                    attendeeCountBadge.style.display = 'none';
                }
            }

            // 회의록 참석자 금액합계 업데이트
            const minutesExpTotalEl = document.getElementById('minutesMeetingExpenseTotal');
            if (minutesExpTotalEl) {
                let meetingTotal = 0;
                tripPersons.forEach(p => { meetingTotal += getPersonMeetingExpense(p); });
                minutesExpTotalEl.textContent = meetingTotal > 0 ? `${meetingTotal.toLocaleString()}원` : '-';
            }

            updateAttendeeDisplay();
        }

        window.renderAttendeeListInTemplate = renderAttendeeListInTemplate;

        // 템플릿 내에서 참석자 제거
        window.removeAttendeeInTemplate = function(attendeeId) {
            attendees = attendees.filter(a => a.id !== attendeeId);
            renderAttendeeListInTemplate();
        };

        // 전역 함수로 등록하여 모달에서 접근 가능하게
        window.addAttendeesToMeeting = function(persons) {
            persons.forEach(person => {
                if (!attendees.some(a => a.id === person.id)) {
                    attendees.push(person);
                }
            });
            renderAttendeeListInTemplate();
        };

        // 참석자 명단 테이블 업데이트
        function updateAttendeeDisplay() {
            // 내부 인원 = 출장인원, 외부 인원 = attendees 배열 (isExternal: true)
            const internalAttendees = tripPersons.filter(p => p.name && p.name.trim());
            const externalAttendees = attendees.filter(a => a.name && a.name.trim());

            // 참여자(참여기관) 텍스트 생성 - 회의록용 (내부 + 외부 모두 포함)
            let allAttendeesText = '';
            const internalNames = internalAttendees.map(a => a.name.trim());
            const externalNames = externalAttendees.map(a => a.name.trim());

            if (internalNames.length > 0 && externalNames.length > 0) {
                allAttendeesText = internalNames.join(', ') + '(파인씨앤아이), ' + externalNames.join(', ') + '(외부)';
            } else if (internalNames.length > 0) {
                allAttendeesText = internalNames.join(', ') + '(파인씨앤아이)';
            } else if (externalNames.length > 0) {
                allAttendeesText = externalNames.join(', ') + '(외부)';
            }

            document.querySelectorAll('.auto-all-attendees').forEach(field => {
                field.textContent = allAttendeesText;
            });

            // 참석자 명단 서명 테이블 업데이트 (외부 먼저, 내부 나중)
            const nameFields = document.querySelectorAll('.attendee-sig-name');
            const deptFields = document.querySelectorAll('.attendee-sig-dept');

            // 모든 필드 초기화
            nameFields.forEach(field => field.value = '');
            deptFields.forEach(field => field.value = '');

            // 외부 인원 먼저, 내부 인원 나중에 정렬
            const sortedAttendees = [...externalAttendees, ...internalAttendees];

            // 참석자 채우기 (왼쪽 열부터, 그 다음 오른쪽 열)
            const totalFields = nameFields.length;
            const rowCount = totalFields / 2;

            sortedAttendees.forEach((attendee, idx) => {
                if (attendee.name && attendee.name.trim()) {
                    let fieldIndex;
                    if (idx < rowCount) {
                        // 왼쪽 열
                        fieldIndex = idx * 2;
                    } else {
                        // 오른쪽 열
                        fieldIndex = (idx - rowCount) * 2 + 1;
                    }

                    if (nameFields[fieldIndex]) {
                        nameFields[fieldIndex].value = attendee.name;
                    }
                    if (deptFields[fieldIndex]) {
                        // 외부 체크시 부서명 사용, 아니면 "파인씨앤아이"
                        const deptValue = attendee.isExternal ? (attendee.dept || '') : '파인씨앤아이';
                        deptFields[fieldIndex].value = deptValue;
                    }
                }
            });

            // 출장품의서 출장인원 테이블 업데이트 (외부 인원 제외)
            const personRows = document.querySelectorAll('.person-row');

            // 모든 행 초기화
            personRows.forEach(row => {
                const cells = row.querySelectorAll('td');
                cells[0].textContent = '';
                cells[1].textContent = '';
                cells[2].textContent = '';
            });

            // 내부 인원만 출장품의서에 표시 (최대 5명)
            internalAttendees.forEach((attendee, index) => {
                if (index < 5 && personRows[index]) {
                    const cells = personRows[index].querySelectorAll('td');
                    cells[0].textContent = attendee.dept || '';
                    cells[1].textContent = attendee.position || '';
                    cells[2].textContent = attendee.name || '';
                }
            });

            // 회의 관련 필드 업데이트
            updateMeetingFields();

            // 출장내용 및 결과 업데이트
            updateTripResult();
        }

        // 회의 관련 필드 업데이트
        function updateMeetingFields() {
            // 작성자 (회의록, 참석자명단)
            const authorText = commonAuthor ? commonAuthor.value : '';
            document.querySelectorAll('.auto-author').forEach(field => {
                field.value = authorText;
            });

            // 복명자 (작성자와 동일하게)
            document.querySelectorAll('.auto-reporter').forEach(field => {
                field.textContent = authorText;
            });

            // 일시 (회의록, 참석자 명단 공통)
            if (commonDate && commonDate.value) {
                const [year, month, day] = commonDate.value.split('-');
                const dateTimeText = `${year}.${month}.${day}`;

                document.querySelectorAll('.auto-datetime').forEach(field => {
                    field.value = dateTimeText;
                });
            }

            // 주제 (회의 목적 사용)
            const subjectText = commonPurpose ? commonPurpose.value : '';
            document.querySelectorAll('.auto-subject').forEach(field => {
                field.textContent = subjectText;
            });

            // 주요 내용 (회의 내용 사용)
            const contentText = commonMeetingContent ? commonMeetingContent.value : '';
            document.querySelectorAll('.auto-content').forEach(field => {
                field.textContent = contentText;
            });
        }

        // 기존 버튼 방식은 제거됨 - 이제 모달 방식으로 작동
        // 참석자 추가 버튼
        if (addAttendeeBtn) {
            addAttendeeBtn.addEventListener('click', function() {
                if (attendees.length >= 10) {
                    showWarning('최대 10명까지만 추가할 수 있습니다.');
                    return;
                }
                attendees.push({ dept: '', position: '', name: '', isExternal: false });
                updateAttendeeList();
            });
        }

        // 회의 참석자 제거 버튼
        if (removeAttendeeBtn) {
            removeAttendeeBtn.addEventListener('click', function() {
                const checkboxes = document.querySelectorAll('.attendee-checkbox:checked');
                if (checkboxes.length === 0) {
                    showWarning('제거할 참석자를 선택해주세요.');
                    return;
                }

                const indicesToRemove = Array.from(checkboxes)
                    .map(cb => parseInt(cb.getAttribute('data-index')))
                    .sort((a, b) => b - a);

                indicesToRemove.forEach(index => {
                    attendees.splice(index, 1);
                });

                updateAttendeeList();
            });
        }

        // 과제명 자동 채우기
        if (commonProject) {
            commonProject.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-project').forEach(field => {
                    // input 요소면 value 속성, 아니면 textContent 설정
                    if (field.tagName === 'INPUT') {
                        field.value = value;
                    } else {
                        field.textContent = value;
                    }
                });
            });
        }

        // 작성자 자동 채우기
        if (commonAuthor) {
            commonAuthor.addEventListener('input', function() {
                updateMeetingFields();
            });
        }

        // 출장지 자동 채우기
        if (commonLocation) {
            commonLocation.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-location').forEach(field => {
                    // input 요소면 value 속성, 아니면 textContent 설정
                    if (field.tagName === 'INPUT') {
                        field.value = value;
                    } else {
                        field.textContent = value;
                    }
                });
            });
        }

        // 날짜별 비용 입력 행 생성 함수
        function generateDailyExpenseRows() {
            if (!commonDate || !commonDate.value || !dailyExpenseBody) return;

            const startDate = new Date(commonDate.value);
            const duration = parseInt(commonDuration ? commonDuration.value : '0');
            const days = duration + 1; // 당일(0박) = 1일, 1박 = 2일

            // 기존 데이터 초기화
            dailyExpenses = [];
            dailyExpenseBody.innerHTML = '';

            // 날짜별 행 생성
            for (let i = 0; i < days; i++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(currentDate.getDate() + i);

                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                const dateStr = `${year}.${month}.${day}`;

                dailyExpenses.push({
                    date: dateStr,
                    transport: 0,
                    lodging: 0,
                    meal: 0,
                    other: 0
                });

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${dateStr}</td>
                    <td><input type="text" inputmode="numeric" class="expense-input" data-index="${i}" data-type="transport" placeholder="0"></td>
                    <td><input type="text" inputmode="numeric" class="expense-input" data-index="${i}" data-type="lodging" placeholder="0"></td>
                    <td><input type="text" inputmode="numeric" class="expense-input" data-index="${i}" data-type="meal" placeholder="0"></td>
                    <td><input type="text" inputmode="numeric" class="expense-input" data-index="${i}" data-type="other" placeholder="0"></td>
                `;
                dailyExpenseBody.appendChild(row);
            }

            // 입력 이벤트 리스너 추가
            document.querySelectorAll('.expense-input').forEach(input => {
                input.addEventListener('input', function() {
                    // 숫자 외 문자(대시, 음수기호 포함) 제거
                    let raw = this.value.replace(/[^\d]/g, '');
                    const numeric = parseInt(raw) || 0;
                    // 콤마 포매팅
                    this.value = raw === '' ? '' : numeric.toLocaleString('ko-KR');

                    const index = parseInt(this.getAttribute('data-index'));
                    const type = this.getAttribute('data-type');
                    dailyExpenses[index][type] = numeric;
                    updateTotalExpenses();
                    if (typeof validateRequiredFields === 'function') validateRequiredFields();
                });
                // 붙여넣기도 처리
                input.addEventListener('paste', function(e) {
                    e.preventDefault();
                    const pasted = (e.clipboardData || window.clipboardData).getData('text');
                    const numeric = parseInt(pasted.replace(/[^\d]/g, '')) || 0;
                    this.value = numeric > 0 ? numeric.toLocaleString('ko-KR') : '';
                    this.dispatchEvent(new Event('input'));
                });
            });

            updateTotalExpenses();
        }

        // 합계 업데이트 함수
        function addExpenseGuideRow() {
            if (!dailyExpenseBody) return;

            const existingGuide = dailyExpenseBody.querySelector('.expense-guide-row');
            if (existingGuide) existingGuide.remove();

            if (!tripPersons || tripPersons.length === 0) return;

            let totalMealGuide = 0;
            let totalDailyGuide = 0;
            let internalPersonCount = 0;

            tripPersons.forEach(person => {
                if (person.type !== 'external') {
                    internalPersonCount++;
                    totalMealGuide  += person.mealExpense  || fixedMealExpenses[person.position] || 0;
                    totalDailyGuide += person.tripExpense  || fixedExpenses[person.position]     || 0;
                }
            });

            const transportGuide = internalPersonCount * 100000;
            const lodgingGuide   = internalPersonCount * 100000;

            const guideRow = document.createElement('tr');
            guideRow.className = 'expense-guide-row';
            guideRow.style.backgroundColor = '#f0f9ff';
            guideRow.style.borderTop = '2px solid #3b82f6';
            guideRow.innerHTML = `
                <td style="text-align: center; font-weight: 600; color: #1e40af; padding: 10px;">
                    1일 기준 인원 금액
                    <span class="info-tooltip info-tooltip-top" style="margin-left: 8px;">
                        <i class="fas fa-info-circle" style="color: #64748b; cursor: help; font-size: 0.9em;"></i>
                        <span class="tooltip-text">선택한 출장인원 기준으로 산정된 1일당 최대 사용가능 비용입니다</span>
                    </span>
                </td>
                <td style="text-align: center; color: #1e40af; font-weight: 600;">${transportGuide.toLocaleString()}원</td>
                <td style="text-align: center; color: #1e40af; font-weight: 600;">${lodgingGuide.toLocaleString()}원</td>
                <td style="text-align: center; color: #1e40af; font-weight: 600;">${totalMealGuide.toLocaleString()}원</td>
                <td style="text-align: center; color: #1e40af; font-weight: 600;">${totalDailyGuide.toLocaleString()}원</td>
            `;

            dailyExpenseBody.insertBefore(guideRow, dailyExpenseBody.firstChild);
        }

        function updateTotalExpenses() {
            addExpenseGuideRow();
            let totalTransport = 0;
            let totalLodging = 0;
            let totalMeal = 0;
            let totalOther = 0;

            dailyExpenses.forEach(expense => {
                totalTransport += expense.transport;
                totalLodging += expense.lodging;
                totalMeal += expense.meal;
                totalOther += expense.other;
            });

            const grandTotal = totalTransport + totalLodging + totalMeal + totalOther;

            // 합계 표시 (공통 입력칸)
            const tTransport = document.getElementById('totalTransport');
            const tLodging = document.getElementById('totalLodging');
            const tMeal = document.getElementById('totalMeal');
            const tOther = document.getElementById('totalOther');
            if (tTransport) tTransport.textContent = totalTransport.toLocaleString();
            if (tLodging) tLodging.textContent = totalLodging.toLocaleString();
            if (tMeal) tMeal.textContent = totalMeal.toLocaleString();
            if (tOther) tOther.textContent = totalOther.toLocaleString();

            // 품의서 전체 합계 표시
            document.querySelectorAll('.auto-grand-total').forEach(field => {
                field.textContent = grandTotal.toLocaleString();
            });

            // 품의서 소요경비 내역에 날짜별 행 생성
            const proposalExpenseBody = document.getElementById('proposalExpenseBody');
            if (proposalExpenseBody) {
                proposalExpenseBody.innerHTML = '';
                dailyExpenses.forEach((expense, index) => {
                    // 첫 번째 줄은 회의비 제외하고 계산
                    const dayTotal = expense.transport + expense.lodging + expense.meal + expense.other;
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td style="text-align: center; padding: 10px;">${expense.date}</td>
                        <td style="text-align: center; padding: 10px;">${expense.transport.toLocaleString()}</td>
                        <td style="text-align: center; padding: 10px;">${expense.lodging.toLocaleString()}</td>
                        <td style="text-align: center; padding: 10px;">${expense.meal.toLocaleString()}</td>
                        <td style="text-align: center; padding: 10px;">${expense.other.toLocaleString()}</td>
                        <td style="text-align: center; padding: 10px;">${dayTotal.toLocaleString()}</td>
                    `;
                    proposalExpenseBody.appendChild(row);

                });
            }

            // 복명서 정산 세부내역에 날짜별 행 생성
            const reportExpenseBody = document.getElementById('reportExpenseBody');
            if (reportExpenseBody) {
                reportExpenseBody.innerHTML = '';

                // 헤더 행
                const headerRow = document.createElement('tr');
                const rowspan = dailyExpenses.length * 4 + 1; // 각 날짜당 4행(교통비, 숙박비, 식비, 기타) + 헤더
                headerRow.innerHTML = `
                    <th colspan="2" rowspan="${rowspan}">정산<br>세부내역</th>
                    <th>날짜</th>
                    <th colspan="2" style="text-align: center; background: #fafafa;">구분</th>
                    <td style="text-align: center; font-weight: bold;">금액</td>
                `;
                reportExpenseBody.appendChild(headerRow);

                // 날짜별 상세 내역
                dailyExpenses.forEach((expense, index) => {
                    // 교통비
                    const transportRow = document.createElement('tr');
                    transportRow.innerHTML = `
                        <td rowspan="4" style="text-align: center;background: white; font-weight: 500; vertical-align: middle;">${expense.date}</td>
                        <td colspan="2" style="background: white; padding: 8px; text-align: center">교통비</td>
                        <td style="text-align: center; padding: 8px; background: white;">${expense.transport.toLocaleString()}원</td>
                    `;
                    reportExpenseBody.appendChild(transportRow);

                    // 숙박비
                    const lodgingRow = document.createElement('tr');
                    lodgingRow.innerHTML = `
                        <td colspan="2" style="background: white; padding: 8px; text-align: center">숙박비</td>
                        <td style="text-align: center; padding: 8px;">${expense.lodging.toLocaleString()}원</td>
                    `;
                    reportExpenseBody.appendChild(lodgingRow);

                    // 식비
                    const mealRow = document.createElement('tr');
                    mealRow.innerHTML = `
                        <td colspan="2" style="background: white; padding: 8px; text-align: center">식비</td>
                        <td style="text-align: center; padding: 8px;">${expense.meal.toLocaleString()}원</td>
                    `;
                    reportExpenseBody.appendChild(mealRow);

                    // 기타(일비)
                    const otherDisplay = `${expense.other.toLocaleString()}원`;

                    const otherRow = document.createElement('tr');
                    otherRow.innerHTML = `
                        <td colspan="2" style="background: white; padding: 8px; text-align: center">기타(일비)</td>
                        <td style="text-align: center; padding: 8px;">${otherDisplay}</td>
                    `;
                    reportExpenseBody.appendChild(otherRow);
                });
            }

            // 합계 금액 표시
            document.querySelectorAll('.trip-auto-grand-total').forEach(field => {
                field.textContent = grandTotal.toLocaleString();
            });

            // 복명서 실집행금액 표시
            document.querySelectorAll('.auto-total').forEach(field => {
                field.textContent = grandTotal.toLocaleString();
            });

            // 복명서 출장신청금액 표시
            document.querySelectorAll('.auto-request-amount').forEach(field => {
                field.textContent = grandTotal.toLocaleString();
            });
        }

        // 출장 날짜 목록으로 회의 일자 selectbox 업데이트
        function updateMeetingDateSelect() {
            const sel = document.getElementById('common_meeting_date');
            if (!sel || !commonDate || !commonDate.value) return;

            const startDate = new Date(commonDate.value);
            const duration = parseInt(commonDuration ? commonDuration.value : '0');
            const prevVal = sel.value;

            sel.innerHTML = '';
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            for (let i = 0; i <= duration; i++) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const day = days[d.getDay()];
                const val = `${yyyy}-${mm}-${dd}`;
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = `${yyyy}.${mm}.${dd} (${day})`;
                sel.appendChild(opt);
            }
            // 이전 선택값 유지 가능하면 유지
            if (prevVal && [...sel.options].some(o => o.value === prevVal)) {
                sel.value = prevVal;
            }
        }

        function updateTripDateRange() {
            if (!commonDate || !commonDate.value) return;

            const startDate = new Date(commonDate.value);
            const duration = parseInt(commonDuration ? commonDuration.value : '0');

            const [year, month, day] = commonDate.value.split('-');

            let dateRangeText = '';
            if (duration === 0) {
                // 당일
                dateRangeText = `${year}.${month}.${day}`;
            } else {
                // 1박 이상
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + duration);

                const endYear = endDate.getFullYear();
                const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
                const endDay = String(endDate.getDate()).padStart(2, '0');

                dateRangeText = `${year}.${month}.${day} ~ ${endYear}.${endMonth}.${endDay}`;
            }

            // 출장기간 표시
            document.querySelectorAll('.auto-date').forEach(field => {
                field.textContent = dateRangeText;
            });

            // 출장복명서 출장기간
            document.querySelectorAll('.auto-date-range').forEach(field => {
                field.textContent = dateRangeText;
            });

            // 소요경비내역 일시 (시작일만)
            const dateDotFormatted = `${year}.${month}.${day}`;
            document.querySelectorAll('.auto-date-dot').forEach(field => {
                field.textContent = dateDotFormatted;
            });

            // 회의일시 표시 (YYYY.MM.DD 형식)
            document.querySelectorAll('.auto-meeting-date').forEach(field => {
                field.textContent = dateDotFormatted;
            });

            // 작성일 계산 (출장기간 -1일, 주말 제외)
            const tripDateObj = new Date(commonDate.value);
            const dayOfWeek = tripDateObj.getDay();

            let writeDate = new Date(tripDateObj);
            if (dayOfWeek === 1) { // 월요일이면 -3일 (금요일)
                writeDate.setDate(writeDate.getDate() - 3);
            } else if (dayOfWeek === 0) { // 일요일이면 -2일 (금요일)
                writeDate.setDate(writeDate.getDate() - 2);
            } else {
                writeDate.setDate(writeDate.getDate() - 1);
            }

            const writeYear = writeDate.getFullYear();
            const writeMonth = String(writeDate.getMonth() + 1).padStart(2, '0');
            const writeDay = String(writeDate.getDate()).padStart(2, '0');
            const writeFormatted = `${writeYear} 년 ${writeMonth} 월 ${writeDay} 일`;

            document.querySelectorAll('.auto-write-date').forEach(field => {
                field.textContent = writeFormatted;
            });

            // 복명일자 계산 (출장 종료일 기준, YYYY년 MM월 DD일 형식)
            let reportDate = startDate;
            if (duration > 0) {
                reportDate = new Date(startDate);
                reportDate.setDate(reportDate.getDate() + duration);
            }

            const reportYear = reportDate.getFullYear();
            const reportMonth = String(reportDate.getMonth() + 1).padStart(2, '0');
            const reportDay = String(reportDate.getDate()).padStart(2, '0');

            document.querySelectorAll('.auto-report-year').forEach(field => {
                field.textContent = reportYear;
            });
            document.querySelectorAll('.auto-report-month').forEach(field => {
                field.textContent = reportMonth.replace(/^0/, '');
            });
            document.querySelectorAll('.auto-report-day').forEach(field => {
                field.textContent = reportDay.replace(/^0/, '');
            });

            // 날짜별 비용 입력 테이블 생성
            generateDailyExpenseRows();

            // 회의 날짜 selectbox 업데이트
            updateMeetingDateSelect();
        }

        // 출장 날짜/기간 변경 → 날짜별 비용 테이블 재생성
        if (commonDate) {
            commonDate.addEventListener('change', function() {
                updateTripDateRange();
                updateMeetingFields();
            });
            commonDate.addEventListener('click', function() {
                if (this.showPicker) this.showPicker();
            });
        }
        if (commonDuration) {
            commonDuration.addEventListener('change', function() {
                updateTripDateRange();
            });
        }

        // 회의 일자 변경 → 문서 자동채우기 (출장 날짜와 독립)
        const meetingDateInput = document.getElementById('common_meeting_date');
        if (meetingDateInput) {
            meetingDateInput.addEventListener('change', function() {
                updateMeetingFields();
            });
            meetingDateInput.addEventListener('click', function() {
                if (this.showPicker) this.showPicker();
            });
        }

        // 출장목적 자동 채우기
        // (이미 위에서 commonPurpose 이벤트 리스너 추가됨 - updateMeetingFields 호출)

        // 복명자 초기값 설정 (작성자와 동일하게)
        // updateMeetingFields에서 자동으로 복명자도 업데이트됨

        // 회의 날짜·시간 변경 시 기본 작성자 재설정
        const meetingDateEl = document.getElementById('common_meeting_date');
        const startTimeEl = document.getElementById('common_start_time');
        const endTimeEl = document.getElementById('common_end_time');

        [meetingDateEl, startTimeEl, endTimeEl].forEach(el => {
            if (el) el.addEventListener('change', function() { setDefaultAuthor(); });
        });

        // 회의 내용 바이트 카운터
        const MIN_MEETING_CONTENT_BYTES = 400;
        function getMeetingContentBytes() {
            return new TextEncoder().encode(commonMeetingContent ? (commonMeetingContent.value || '') : '').length;
        }
        function updateMeetingContentByteCounter() {
            const statusEl = document.getElementById('meetingContentByteStatus');
            if (!statusEl || !commonMeetingContent) return;
            const bytes = getMeetingContentBytes();
            if (bytes === 0) {
                statusEl.className = '';
                statusEl.textContent = '';
                return;
            }
            if (bytes >= MIN_MEETING_CONTENT_BYTES) {
                statusEl.className = 'byte-status-sufficient';
                statusEl.textContent = `✓ 조건 충족 · ${bytes} bytes 입력됨`;
            } else {
                statusEl.className = 'byte-status-insufficient';
                statusEl.textContent = `최소 ${MIN_MEETING_CONTENT_BYTES} bytes 필요 · 현재 ${bytes} bytes (${MIN_MEETING_CONTENT_BYTES - bytes} bytes 부족)`;
            }
        }

        // 회의 관련 입력 필드 이벤트 리스너
        if (commonMeetingContent) {
            commonMeetingContent.addEventListener('input', function() {
                updateMeetingFields();
                updateMeetingContentByteCounter();
            });
        }

        if (commonPurpose) {
            commonPurpose.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-purpose').forEach(field => {
                    field.textContent = value;
                });
                updateMeetingFields();
            });
        }

        // 출장내용 및 결과 업데이트
        function updateTripResult() {
            const personNames = tripPersons.filter(p => p.name && p.name.trim()).map(p => p.name.trim());

            const attendeeLine = '- 참석인원 :' + (personNames.length > 0 ? ` ${personNames.join(', ')}(파인씨앤아이)` : '');
            const contentMarker = '\n- 출장 내용 :';

            if (commonTripResult) {
                if (!commonTripResult.dataset.userModified) {
                    // 사용자 미수정 — 전체 자동 생성
                    commonTripResult.value = attendeeLine + contentMarker;
                } else {
                    // 사용자 수정 후 — 참석인원 줄만 교체, 출장 내용 이후 보존
                    const cur = commonTripResult.value;
                    const idx = cur.indexOf('- 출장 내용 :');
                    const preserved = idx !== -1 ? cur.slice(idx - (cur[idx - 1] === '\n' ? 1 : 0)) : contentMarker;
                    commonTripResult.value = attendeeLine + preserved;
                }
            }

            // 복명서 반영
            const displayText = commonTripResult ? commonTripResult.value : attendeeLine + contentMarker;
            document.querySelectorAll('.auto-trip-result').forEach(field => {
                field.textContent = displayText;
            });
        }

        // 사용자가 직접 수정하면 자동 업데이트 중지
        if (commonTripResult) {
            commonTripResult.addEventListener('input', function() {
                this.dataset.userModified = 'true';
                // 수정된 내용을 복명서에 바로 반영
                document.querySelectorAll('.auto-trip-result').forEach(field => {
                    field.textContent = this.value;
                });
            });
        }

        // 초기 인원 설정
        tripPersons = [];
        renderTripPersonListInTemplate();

        // 초기 참석자 설정
        attendees = [];
        renderAttendeeListInTemplate();

        // 초기 날짜 설정
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        if (commonDate && !commonDate.value) commonDate.value = todayStr;
        updateTripDateRange(); // updateMeetingDateSelect()도 내부에서 호출됨
        updateMeetingFields();
    }

    // 파일 아이콘 헬퍼
    function getFileIcon(name) {
        if (name.match(/\.(jpg|jpeg|png|gif)$/i)) return 'fa-file-image';
        if (name.match(/\.(pdf)$/i)) return 'fa-file-pdf';
        if (name.match(/\.(doc|docx)$/i)) return 'fa-file-word';
        if (name.match(/\.(xls|xlsx)$/i)) return 'fa-file-excel';
        return 'fa-file';
    }

    // 업로드 영역 공통 셋업
    function setupUpload(input, area, filesArr, updateFn) {
        input.addEventListener('change', function(e) {
            Array.from(e.target.files).forEach(file => {
                if (filesArr.length >= 5) { showWarning('최대 5개까지만 첨부 가능합니다.'); return; }
                if (file.size > 10 * 1024 * 1024) { showWarning('파일 크기는 10MB를 초과할 수 없습니다.'); return; }
                filesArr.push(file);
            });
            updateFn();
            input.value = '';
        });
        area.addEventListener('dragover', function(e) { e.preventDefault(); this.style.borderColor = '#667eea'; this.style.background = '#f5f7ff'; });
        area.addEventListener('dragleave', function() { this.style.borderColor = '#ddd'; this.style.background = 'white'; });
        area.addEventListener('drop', function(e) {
            e.preventDefault(); this.style.borderColor = '#ddd'; this.style.background = 'white';
            Array.from(e.dataTransfer.files).forEach(file => {
                if (filesArr.length >= 5) { showWarning('최대 5개까지만 첨부 가능합니다.'); return; }
                if (file.size > 10 * 1024 * 1024) { showWarning('파일 크기는 10MB를 초과할 수 없습니다.'); return; }
                filesArr.push(file);
            });
            updateFn();
        });
    }

    function updateReceiptFileList() {
        receiptFileList.innerHTML = '';
        selectedReceiptFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <i class="fas ${getFileIcon(file.name)}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <button class="btn-remove-file" onclick="removeReceiptFile(${index})"><i class="fas fa-times"></i></button>
            `;
            receiptFileList.appendChild(item);
        });
    }

    function updateDocumentFileList() {
        documentFileList.innerHTML = '';
        selectedDocumentFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <i class="fas ${getFileIcon(file.name)}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <button class="btn-remove-file" onclick="removeDocumentFile(${index})"><i class="fas fa-times"></i></button>
            `;
            documentFileList.appendChild(item);
        });
    }

    setupUpload(receiptInput, receiptUploadArea, selectedReceiptFiles, updateReceiptFileList);
    setupUpload(documentInput, documentUploadArea, selectedDocumentFiles, updateDocumentFileList);

    window.removeReceiptFile = function(index) { selectedReceiptFiles.splice(index, 1); updateReceiptFileList(); };
    window.removeDocumentFile = function(index) { selectedDocumentFiles.splice(index, 1); updateDocumentFileList(); };

    // 제출
    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            // 필수 필드 개별 검증 (화면 상단부터 순서대로)
            if (!document.getElementById('selectedProjectIdx')?.value) {
                await showWarning('과제를 선택해주세요.');
                document.getElementById('common_project')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!document.getElementById('selectedCardIdx')?.value) {
                await showWarning('사용 카드를 선택해주세요.');
                document.getElementById('common_card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            const tripDateEl = document.getElementById('common_date');
            if (!tripDateEl?.value) {
                await showWarning('출장기간을 입력해주세요.');
                tripDateEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            const locationEl2 = document.getElementById('common_location');
            if (!locationEl2?.value?.trim()) {
                await showWarning('출장지를 입력해주세요.');
                locationEl2?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                locationEl2?.focus({ preventScroll: true });
                return;
            }
            if (tripPersons.length === 0) {
                await showWarning('출장인원을 추가해주세요.');
                document.getElementById('tripPersonArea')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            const purposeEl2 = document.getElementById('common_purpose');
            if (!purposeEl2?.value?.trim()) {
                await showWarning('출장목적을 입력해주세요.');
                purposeEl2?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                purposeEl2?.focus({ preventScroll: true });
                return;
            }
            const tripResultEl2 = document.getElementById('common_trip_result');
            if (!tripResultEl2?.value?.trim() || tripResultEl2.value.trim() === '- 참석인원 :\n- 출장 내용 :') {
                await showWarning('출장 내용 및 결과를 입력해주세요.');
                tripResultEl2?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                tripResultEl2?.focus({ preventScroll: true });
                return;
            }
            const totalTripExpense = dailyExpenses.reduce((s, e) => s + (e.transport||0) + (e.lodging||0) + (e.meal||0) + (e.other||0), 0);
            if (totalTripExpense === 0) {
                await showWarning('날짜별 사용금액을 입력해주세요.');
                document.getElementById('dailyExpenseTable')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            const meetingDateEl = document.getElementById('common_meeting_date');
            if (!meetingDateEl?.value) {
                await showWarning('회의 일자를 입력해주세요.');
                meetingDateEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (attendees.length === 0 && tripPersons.length === 0) {
                await showWarning('참석자를 추가해주세요.');
                document.getElementById('attendeeArea')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            const amountEl = document.getElementById('common_amount');
            const amountVal = parseInt((amountEl?.value || '0').replace(/,/g, ''));
            if (!amountVal || amountVal <= 0) {
                await showWarning('사용 금액을 입력해주세요.');
                amountEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                amountEl?.focus({ preventScroll: true });
                return;
            }
            // 회의 내용 바이트 검증
            const meetingContentEl = document.getElementById('common_meeting_content');
            const MIN_BYTES = 400;
            if (meetingContentEl) {
                const contentBytes = new TextEncoder().encode(meetingContentEl.value.trim()).length;
                if (contentBytes < MIN_BYTES) {
                    await Swal.fire({
                        icon: 'warning',
                        title: '회의 내용을 더 상세히 작성해주세요',
                        html: `현재 <b>${contentBytes}bytes</b> 입력되었습니다.<br><br>
                               회의 내용이 부실하게 작성된 경우 <b>정산 시 반려</b>될 수 있습니다.<br>
                               논의된 내용, 결정 사항, 참석자별 발언 등을 구체적으로 작성해주세요.<br><br>
                               <span style="color:#888;font-size:13px;">최소 ${MIN_BYTES}bytes 이상 입력 필요 (${MIN_BYTES - contentBytes}bytes 더 필요)</span>`,
                        confirmButtonText: '다시 작성하기'
                    });
                    meetingContentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    meetingContentEl.focus();
                    return;
                }
            }

            if (!await showConfirm('저장하시겠습니까?')) return;

            // [1] 공통 값 수집
            const projectIdx  = document.getElementById('selectedProjectIdx')?.value;
            const cardIdx     = document.getElementById('selectedCardIdx')?.value;
            const tripDate    = document.getElementById('common_date')?.value;
            const duration    = parseInt(document.getElementById('common_duration')?.value || '0');
            const meetingDate = document.getElementById('common_meeting_date')?.value;
            const usageAmount = parseInt((document.getElementById('common_amount')?.value || '0').replace(/,/g, '')) || 0;

            // [2] 출장 일별 비용 + 회의 사용금액을 합산하여 payload 구성
            const dailyExpensesPayload = dailyExpenses.map(e => ({
                expenseDate:       e.date,
                transportationFee: e.transport || 0,
                accommodationFee:  e.lodging   || 0,
                mealFee:           e.meal      || 0,
                otherFee:          e.other     || 0
            }));
            // 회의 사용금액을 meeting 날짜의 otherFee에 추가
            if (meetingDate && usageAmount > 0) {
                const existing = dailyExpensesPayload.find(e => e.expenseDate === meetingDate);
                if (existing) {
                    existing.otherFee += usageAmount;
                } else {
                    dailyExpensesPayload.push({ expenseDate: meetingDate, transportationFee: 0, accommodationFee: 0, mealFee: 0, otherFee: usageAmount });
                }
            }

            // [3] 회의 참석자 수집 (내부 + 외부)
            const internalMeetingAttendees = tripPersons.map((p, i) => ({
                isExternal:   false,
                department:   p.dept,
                name:         p.name,
                userIdx:      parseInt(p.id),
                position:     p.position,
                displayOrder: i
            }));
            const externalMeetingAttendees = attendees.map((p, i) => ({
                isExternal:   true,
                department:   p.dept,
                name:         p.name,
                userIdx:      parseInt(p.id),
                position:     p.position,
                displayOrder: tripPersons.length + i
            }));
            const allMeetingAttendees = [...internalMeetingAttendees, ...externalMeetingAttendees];

            // [4] 통합 DTO 구성
            const saveData = {
                projectIdx:       parseInt(projectIdx),
                cardIdx:          cardIdx ? parseInt(cardIdx) : null,
                drafterUserIdx:   authorPersonId ? parseInt(authorPersonId) : null,
                tripDate:         tripDate,
                duration:         duration,
                location:         document.getElementById('common_location')?.value,
                dailyExpenses:    dailyExpensesPayload,
                purpose:          document.getElementById('common_purpose')?.value,
                tripContent:      '',
                tripAttendees: tripPersons.map((p, i) => ({
                    attendeeType: '내부',
                    department:   p.dept,
                    name:         p.name,
                    userIdx:      parseInt(p.id),
                    position:     p.position,
                    displayOrder: i
                })),
                meetingDate:      meetingDate,
                startTime:        document.getElementById('common_start_time')?.value,
                endTime:          document.getElementById('common_end_time')?.value,
                meetingContent:   document.getElementById('common_meeting_content')?.value,
                meetingAttendees: allMeetingAttendees
            };

            // [5] multipart FormData 구성
            const formData = new FormData();
            formData.append('data', JSON.stringify(saveData));
            selectedReceiptFiles.forEach(f  => formData.append('receiptFiles',  f));
            selectedDocumentFiles.forEach(f => formData.append('documentFiles', f));

            // [6] API 호출
            try {
                const response = await fetch('/api/receipt-trip-meetings', {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || '저장에 실패했습니다.');
                }
                showSuccess('저장이 완료되었습니다.');
                popupAwareRedirect('/project/documents');
            } catch (e) {
                showWarning('저장 중 오류가 발생했습니다.\n' + e.message);
            }
        });
    }

    // PDF 저장 버튼 이벤트
    const savePdfBtn = document.getElementById('savePdfBtn');
    if (savePdfBtn) {
        savePdfBtn.addEventListener('click', async function(e) {
            e.preventDefault();

            let allDivs = null;
            let originalDisplays = [];
            let wasCollapsed = false;
            const loadingModal = document.getElementById('pdfLoadingModal');
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');

            // 진행도 업데이트 함수
            function updateProgress(percent, message) {
                if (progressFill) progressFill.style.width = percent + '%';
                if (progressText) progressText.textContent = `${message} (${percent}%)`;
            }

            try {
                console.log('PDF 저장 시작 - 회의+출장 통합 페이지');

                // 로딩 모달 표시
                if (loadingModal) loadingModal.classList.add('active');
                updateProgress(0, '준비 중...');

                if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
                    showWarning('PDF 라이브러리를 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
                    if (loadingModal) loadingModal.classList.remove('active');
                    return;
                }

                updateProgress(10, 'PDF 초기화 중...');

                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({
                    orientation: 'p',
                    unit: 'mm',
                    format: 'a4',
                    compress: false,
                    precision: 16
                });

                updateProgress(20, '문서 구조 확인 중...');

                // 접힌 문서 양식을 임시로 펼치기
                const documentFormWrapper = document.querySelector('.document-form-wrapper');
                if (documentFormWrapper && documentFormWrapper.classList.contains('collapsed')) {
                    wasCollapsed = true;
                    documentFormWrapper.classList.remove('collapsed');
                }

                allDivs = documentForm.querySelectorAll(':scope > div');
                console.log('찾은 div 개수:', allDivs.length);

                originalDisplays = Array.from(allDivs).map(div => div.style.display);

                if (allDivs.length < 5) {
                    showError('문서 구조를 찾을 수 없습니다. 영수증 처리(회의+출장) 템플릿을 선택했는지 확인해주세요.');
                    if (loadingModal) loadingModal.classList.remove('active');
                    // 접혔던 문서 양식을 다시 접기
                    if (documentFormWrapper && wasCollapsed) {
                        documentFormWrapper.classList.add('collapsed');
                    }
                    return;
                }

                updateProgress(30, '페이지 준비 중...');

                // 공통 정보 입력 영역 숨기고, 4개 문서 표시
                allDivs[0].style.display = 'none'; // 공통 입력
                allDivs[1].style.display = 'block'; // 출장품의서
                allDivs[2].style.display = 'block'; // 출장복명서
                allDivs[3].style.display = 'block'; // 회의록
                allDivs[4].style.display = 'block'; // 참석자 명단

                await new Promise(resolve => setTimeout(resolve, 300));

                const renderOptions = {
                    scale: 5,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    imageTimeout: 0,
                    removeContainer: true,
                    windowWidth: 2560,
                    windowHeight: 1440,
                    letterRendering: true,
                    foreignObjectRendering: false,
                    onclone: function(clonedDoc) {
                        const style = clonedDoc.createElement('style');
                        style.textContent = `
                            * {
                                -webkit-font-smoothing: antialiased !important;
                                -moz-osx-font-smoothing: grayscale !important;
                                text-rendering: optimizeLegibility !important;
                                font-smoothing: antialiased !important;
                            }
                        `;
                        clonedDoc.head.appendChild(style);
                    }
                };

                const pdfWidth = 210;
                const pdfHeight = 297;
                const margin = 5;
                const contentWidth = pdfWidth - (margin * 2);
                const contentHeight = pdfHeight - (margin * 2);

                updateProgress(35, '출장품의서 렌더링 중...');

                // 1. 출장품의서 페이지
                console.log('출장품의서 렌더링 중...');
                const proposalDiv = allDivs[1];

                if (!proposalDiv) {
                    throw new Error('출장품의서를 찾을 수 없습니다.');
                }

                const proposalCanvas = await window.html2canvas(proposalDiv, renderOptions);
                const canvasWidth = proposalCanvas.width;
                const canvasHeight = proposalCanvas.height;

                if (canvasWidth === 0 || canvasHeight === 0) {
                    throw new Error('Canvas 크기가 0입니다. 문서가 화면에 표시되어 있는지 확인하세요.');
                }

                updateProgress(45, '출장품의서 이미지 변환 중...');

                const proposalImgData = proposalCanvas.toDataURL('image/png');

                let imgWidth = contentWidth;
                let imgHeight = (canvasHeight * contentWidth) / canvasWidth;

                if (imgHeight > contentHeight) {
                    imgHeight = contentHeight;
                    imgWidth = (canvasWidth * contentHeight) / canvasHeight;
                }

                const xOffset = margin + (contentWidth - imgWidth) / 2;
                const yOffset = margin + (contentHeight - imgHeight) / 2;

                pdf.addImage(proposalImgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
                console.log('출장품의서 페이지 완료');

                updateProgress(55, '출장복명서 렌더링 중...');

                // 2. 출장복명서 페이지
                console.log('출장복명서 렌더링 중...');
                const reportDiv = allDivs[2];

                if (!reportDiv) {
                    throw new Error('출장복명서를 찾을 수 없습니다.');
                }

                pdf.addPage();
                const reportCanvas = await window.html2canvas(reportDiv, renderOptions);

                const reportCanvasWidth = reportCanvas.width;
                const reportCanvasHeight = reportCanvas.height;

                updateProgress(65, '출장복명서 이미지 변환 중...');

                const reportImgData = reportCanvas.toDataURL('image/png');

                let reportImgWidth = contentWidth;
                let reportImgHeight = (reportCanvasHeight * contentWidth) / reportCanvasWidth;

                if (reportImgHeight > contentHeight) {
                    reportImgHeight = contentHeight;
                    reportImgWidth = (reportCanvasWidth * contentHeight) / reportCanvasHeight;
                }

                const reportXOffset = margin + (contentWidth - reportImgWidth) / 2;
                const reportYOffset = margin + (contentHeight - reportImgHeight) / 2;

                pdf.addImage(reportImgData, 'PNG', reportXOffset, reportYOffset, reportImgWidth, reportImgHeight);
                console.log('출장복명서 페이지 완료');

                updateProgress(75, '회의록 렌더링 중...');

                // 3. 회의록 페이지
                console.log('회의록 렌더링 중...');
                const minutesDiv = allDivs[3];

                if (!minutesDiv) {
                    throw new Error('회의록을 찾을 수 없습니다.');
                }

                pdf.addPage();
                const minutesCanvas = await window.html2canvas(minutesDiv, renderOptions);

                const minutesCanvasWidth = minutesCanvas.width;
                const minutesCanvasHeight = minutesCanvas.height;

                updateProgress(82, '회의록 이미지 변환 중...');

                const minutesImgData = minutesCanvas.toDataURL('image/png');

                let minutesImgWidth = contentWidth;
                let minutesImgHeight = (minutesCanvasHeight * contentWidth) / minutesCanvasWidth;

                if (minutesImgHeight > contentHeight) {
                    minutesImgHeight = contentHeight;
                    minutesImgWidth = (minutesCanvasWidth * contentHeight) / minutesCanvasHeight;
                }

                const minutesXOffset = margin + (contentWidth - minutesImgWidth) / 2;
                const minutesYOffset = margin + (contentHeight - minutesImgHeight) / 2;

                pdf.addImage(minutesImgData, 'PNG', minutesXOffset, minutesYOffset, minutesImgWidth, minutesImgHeight);
                console.log('회의록 페이지 완료');

                updateProgress(89, '참석자 명단 렌더링 중...');

                // 4. 참석자 명단 페이지
                console.log('참석자 명단 렌더링 중...');
                const attendeesDiv = allDivs[4];

                if (!attendeesDiv) {
                    throw new Error('참석자 명단을 찾을 수 없습니다.');
                }

                pdf.addPage();
                const attendeesCanvas = await window.html2canvas(attendeesDiv, renderOptions);

                const attendeesCanvasWidth = attendeesCanvas.width;
                const attendeesCanvasHeight = attendeesCanvas.height;

                updateProgress(95, '참석자 명단 이미지 변환 중...');

                const attendeesImgData = attendeesCanvas.toDataURL('image/png');

                let attendeesImgWidth = contentWidth;
                let attendeesImgHeight = (attendeesCanvasHeight * contentWidth) / attendeesCanvasWidth;

                if (attendeesImgHeight > contentHeight) {
                    attendeesImgHeight = contentHeight;
                    attendeesImgWidth = (attendeesCanvasWidth * contentHeight) / attendeesCanvasHeight;
                }

                const attendeesXOffset = margin + (contentWidth - attendeesImgWidth) / 2;
                const attendeesYOffset = margin + (contentHeight - attendeesImgHeight) / 2;

                pdf.addImage(attendeesImgData, 'PNG', attendeesXOffset, attendeesYOffset, attendeesImgWidth, attendeesImgHeight);
                console.log('참석자 명단 페이지 완료');

                updateProgress(98, 'PDF 파일 생성 중...');

                // 파일명 생성
                const dateInput = document.getElementById('common_date');
                let dateStr;
                if (dateInput && dateInput.value) {
                    dateStr = dateInput.value.replace(/-/g, '').slice(2); // YYMMDD 형식
                } else {
                    const today = new Date();
                    const yy = String(today.getFullYear()).slice(2);
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    dateStr = `${yy}${mm}${dd}`;
                }
                const fileName = `${dateStr}_회의+출장.pdf`;

                console.log('PDF 저장:', fileName);
                pdf.save(fileName);

                updateProgress(100, '완료!');

                // 잠시 후 모달 닫기
                setTimeout(() => {
                    if (loadingModal) loadingModal.classList.remove('active');
                    showSuccess('PDF가 저장되었습니다.');
                }, 500);
            } catch (error) {
                console.error('PDF 생성 오류:', error);
                if (loadingModal) loadingModal.classList.remove('active');
                showError('PDF 생성 중 오류가 발생했습니다.\n' + error.message + '\n\n브라우저 콘솔(F12)을 확인해주세요.');
            } finally {
                if (allDivs && originalDisplays.length > 0) {
                    allDivs.forEach((div, index) => {
                        div.style.display = originalDisplays[index];
                    });
                }
                // 접혔던 문서 양식을 다시 접기
                const documentFormWrapper = document.querySelector('.document-form-wrapper');
                if (documentFormWrapper && wasCollapsed) {
                    documentFormWrapper.classList.add('collapsed');
                }
            }
        });
    }

    // 출장 인원 모달 관련
    const tripPersonModal = document.getElementById('tripPersonModal');
    const personSearchInput = document.getElementById('personSearchInput');

    // 출장인원 모달 - 프로젝트 미선택 시 프로젝트 목록 렌더링
    function renderProjectListInTripPersonModal(searchText = '') {
        const listEl = document.getElementById('tripPersonList2');
        const summaryEl = document.getElementById('tripPersonExpenseSummary');
        if (!listEl) return;
        if (summaryEl) summaryEl.style.display = 'none';

        let filtered = projects;
        if (searchText) {
            filtered = projects.filter(p => matchesSearch(p.projectName || '', searchText));
        }

        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="modal-empty-state"><i class="fas fa-search"></i><p>${searchText ? '검색 결과가 없습니다' : '등록된 프로젝트가 없습니다'}</p></div>`;
            return;
        }

        const header = `
            <div class="convenience-notice">
                <div class="notice-icon"><i class="fas fa-lightbulb"></i></div>
                <div class="notice-content">
                    <div class="notice-title">과제를 먼저 선택해주세요</div>
                    <div class="notice-desc">과제를 선택하면 출장인원 목록이 표시됩니다</div>
                </div>
            </div>`;

        const items = filtered.map(proj => `
            <div class="project-item-in-card" data-project-idx="${proj.idx}">
                <div class="project-item-icon"><i class="fas fa-folder"></i></div>
                <div class="project-item-name">${highlightText(proj.projectName || '이름 없음', searchText)}</div>
                <div class="project-item-arrow"><i class="fas fa-chevron-right"></i></div>
            </div>`).join('');

        listEl.innerHTML = header + items;

        listEl.querySelectorAll('.project-item-in-card').forEach(item => {
            item.addEventListener('click', async function() {
                const projectIdx = this.getAttribute('data-project-idx');
                const proj = projects.find(p => String(p.idx) === String(projectIdx));
                if (!proj) return;

                // 과제 필드 채우기
                const commonProjectEl = document.getElementById('common_project');
                if (commonProjectEl) {
                    commonProjectEl.value = proj.projectName;
                    commonProjectEl.classList.remove('field-empty');
                }
                const selectedProjectIdxEl = document.getElementById('selectedProjectIdx');
                if (selectedProjectIdxEl) selectedProjectIdxEl.value = proj.idx;

                document.querySelectorAll('.auto-project').forEach(el => {
                    if (el.tagName === 'INPUT') el.value = proj.projectName;
                    else el.textContent = proj.projectName;
                });

                // 참여인원 + 경비 설정 로드
                await Promise.all([
                    loadProjectMembers(proj.idx),
                    loadProjectExpenseSettings(proj.idx)
                ]);
                updateTripExpenseTooltip();
                updateMeetingExpenseTooltip();
                if (window.refreshTripPersonBadges) window.refreshTripPersonBadges();
                setDefaultAuthor();

                // 인원 목록으로 전환
                if (personSearchInput) personSearchInput.value = '';
                renderTripPersonList2('');
            });
        });
    }

    // 모달 열기 함수
    window.openTripPersonModal = function() {
        if (tripPersonModal) {
            tripPersonModal.classList.add('show');
            if (personSearchInput) personSearchInput.value = '';
            const projectIdxInput = document.getElementById('selectedProjectIdx');
            if (!projectIdxInput || !projectIdxInput.value) {
                renderProjectListInTripPersonModal('');
            } else {
                renderTripPersonList2();
            }
        }
    };

    // 모달 닫기 함수
    window.closeTripPersonModal = function() {
        if (tripPersonModal) {
            tripPersonModal.classList.remove('show');
            // 검색 초기화
            if (personSearchInput) {
                personSearchInput.value = '';
                renderTripPersonList2('');
            }
            // 선택 초기화
            const selectedItems = document.querySelectorAll('#tripPersonList2 .employee-item.selected');
            selectedItems.forEach(item => item.classList.remove('selected'));
        }
    };

    // 모달 외부 클릭 시 닫기
    if (tripPersonModal) {
        tripPersonModal.addEventListener('click', function(e) {
            if (e.target === tripPersonModal) {
                closeTripPersonModal();
            }
        });
    }

    // 검색 유틸리티 인스턴스
    const searchUtils = new SearchUtils();

    // 출장 인원 목록 렌더링 (employees 배열 사용 - /api/users에서 로드)
    function renderTripPersonList2(searchText = '') {
        const tripPersonList2El = document.getElementById('tripPersonList2');
        if (!tripPersonList2El) return;

        const filtered = employees
            .filter(person => searchUtils.matchesAny(searchText, person.name, person.dept, person.position))
            .sort((a, b) => {
                const codeA = positionCodes.find(pc => pc.codeName === a.position)?.code || '';
                const codeB = positionCodes.find(pc => pc.codeName === b.position)?.code || '';
                return getPositionSortOrder(codeA) - getPositionSortOrder(codeB);
            });

        if (filtered.length === 0) {
            tripPersonList2El.innerHTML = `<div class="modal-empty-state"><i class="fas fa-search"></i><p>검색 결과가 없습니다</p></div>`;
            updateTripPersonModalSummary();
            return;
        }

        const selectedIds = new Set(tripPersons.map(p => String(p.id)));

        tripPersonList2El.innerHTML = filtered.map(person => {
            const isSelected = selectedIds.has(String(person.id));
            const { meal, daily } = getPersonExpense(person);
            const expenseRow = (meal || daily)
                ? `<div class="employee-expense-row">일비 ${daily.toLocaleString()}원 · 식비 ${meal.toLocaleString()}원</div>`
                : '';
            return `
            <div class="employee-item${isSelected ? ' selected' : ''}" data-id="${person.id}" onclick="selectTripPerson(${person.id})">
                <div class="employee-info">
                    <div class="employee-name">${searchUtils.highlightText(person.name, searchText)}</div>
                    <div class="employee-detail">${searchUtils.highlightText(person.position, searchText)} · ${searchUtils.highlightText(person.dept, searchText)}</div>
                    ${expenseRow}
                </div>
                ${isSelected ? '<i class="fas fa-check-circle" style="color:#10b981; font-size:18px; margin-left:auto; flex-shrink:0;"></i>' : ''}
            </div>`;
        }).join('');

        updateTripPersonModalSummary();
    }

    // 출장 인원 선택
    window.selectTripPerson = function(personId) {
        const items = document.querySelectorAll('#tripPersonList2 .employee-item');
        items.forEach(item => {
            if (parseInt(item.getAttribute('data-id')) === personId) {
                item.classList.toggle('selected');
            }
        });
        updateTripPersonModalSummary();
    };

    // 선택된 인원의 일비/식비 합계 표시
    function updateTripPersonModalSummary() {
        const summaryEl = document.getElementById('tripPersonExpenseSummary');
        if (!summaryEl) return;

        const selectedItems = document.querySelectorAll('#tripPersonList2 .employee-item.selected');
        if (selectedItems.length === 0) {
            summaryEl.style.display = 'none';
            return;
        }

        let totalDaily = 0, totalMeal = 0;
        selectedItems.forEach(item => {
            const personId = parseInt(item.getAttribute('data-id'));
            const person = employees.find(p => p.id === personId);
            if (person) {
                const { meal, daily } = getPersonExpense(person);
                totalDaily += daily;
                totalMeal += meal;
            }
        });

        summaryEl.style.display = 'flex';
        summaryEl.innerHTML = `<i class="fas fa-calculator"></i> 선택 ${selectedItems.length}명 합계 (1일): 일비 ${totalDaily.toLocaleString()}원 · 식비 ${totalMeal.toLocaleString()}원`;
    }

    // 검색 기능 (프로젝트 미선택 시 프로젝트 검색, 선택 시 인원 검색)
    if (personSearchInput) {
        personSearchInput.addEventListener('input', function(e) {
            const projectIdxInput = document.getElementById('selectedProjectIdx');
            if (!projectIdxInput || !projectIdxInput.value) {
                renderProjectListInTripPersonModal(e.target.value);
            } else {
                renderTripPersonList2(e.target.value);
            }
        });
    }

    // 선택된 인원 확정 (기존 목록 교체)
    window.addSelectedPersons = function() {
        const selectedItems = document.querySelectorAll('#tripPersonList2 .employee-item.selected');
        const newPersons = [];

        selectedItems.forEach(item => {
            const personId = item.getAttribute('data-id');
            const person = employees.find(p => p.id === parseInt(personId));
            if (person) {
                newPersons.push({
                    id: personId,
                    name: person.name,
                    dept: person.dept,
                    position: person.position
                });
            }
        });

        // 기존 목록을 선택된 목록으로 교체
        if (window.replaceTripPersons) {
            window.replaceTripPersons(newPersons);
        }

        // 작성자가 새 목록에 없으면 최저직급자(사원)로 작성자 업데이트
        if (newPersons.length > 0) {
            const authorStillIn = authorPersonId && newPersons.some(p => String(p.id) === String(authorPersonId));
            if (!authorStillIn) {
                const sorted = [...newPersons].sort((a, b) => {
                    const codeA = positionCodes.find(pc => pc.codeName === a.position)?.code || '';
                    const codeB = positionCodes.find(pc => pc.codeName === b.position)?.code || '';
                    return getPositionSortOrder(codeA) - getPositionSortOrder(codeB);
                });
                // sorted[0] = 최고직급, sorted[last] = 최저직급(사원)
                const newAuthor = sorted[sorted.length - 1];
                if (newAuthor && window.setAuthorInTemplate) {
                    window.setAuthorInTemplate(newAuthor);
                }
            }
        }

        if (typeof validateRequiredFields === 'function') validateRequiredFields();

        closeTripPersonModal();
    };

    // 회의 참석자 모달 관련
    const attendeeModal = document.getElementById('attendeeModal');
    const attendeeSearchInput = document.getElementById('attendeeSearchInput');

    // 모달 열기 함수
    window.openAttendeeModal = async function() {
        if (attendeeModal) {
            attendeeModal.classList.add('show');
            // 현재 외부 참석자를 임시 선택 상태로 초기화
            const currentExternal = window.getExternalAttendees ? window.getExternalAttendees() : [];
            tempSelectedExternalIds = new Set(currentExternal.map(a => String(a.id)));
            await loadExternalPersons();
            renderAttendeeInternalSummary();
            renderAttendeeList2();
            renderAttendeeModalBadges();
        }
    };

    // 모달 닫기 함수
    window.closeAttendeeModal = function() {
        if (attendeeModal) {
            attendeeModal.classList.remove('show');
            if (attendeeSearchInput) attendeeSearchInput.value = '';
            cancelNewExternal();
        }
    };

    // 모달 외부 클릭 시 닫기
    if (attendeeModal) {
        attendeeModal.addEventListener('click', function(e) {
            if (e.target === attendeeModal) {
                closeAttendeeModal();
            }
        });
    }

    // 내부 출장인원 요약 렌더링 (모달 좌측 패널)
    function renderAttendeeInternalSummary() {
        const summaryEl = document.getElementById('attendeeInternalSummary');
        const countEl = document.getElementById('attendeeInternalCount');
        const totalEl = document.getElementById('attendeeInternalTotal');
        const persons = window.getTripPersons ? window.getTripPersons() : [];

        if (!summaryEl) return;

        if (countEl) countEl.textContent = persons.length > 0 ? `${persons.length}명` : '';

        if (persons.length === 0) {
            summaryEl.innerHTML = '<div class="modal-empty-state"><i class="fas fa-user-plus"></i><p>출장인원을 먼저 등록해주세요</p></div>';
            if (totalEl) totalEl.textContent = '';
            return;
        }

        let totalMeeting = 0;
        summaryEl.innerHTML = persons.map(person => {
            const meeting = getPersonMeetingExpense(person);
            totalMeeting += meeting;
            const expenseText = meeting > 0 ? `회의비 ${meeting.toLocaleString()}원` : '회의비 미설정';
            return `
            <div class="employee-item no-select">
                <i class="far fa-user"></i>
                <div class="employee-info">
                    <div class="employee-name">${person.name}</div>
                    <div class="employee-detail">${person.position} · ${person.dept}</div>
                </div>
                <span style="font-size:11px; color:#667eea; font-weight:600; white-space:nowrap;">${expenseText}</span>
            </div>`;
        }).join('');

        if (totalEl) {
            totalEl.textContent = totalMeeting > 0 ? `합계: ${totalMeeting.toLocaleString()}원` : '';
        }
    }

    // 모달 하단 뱃지 영역 렌더링
    function renderAttendeeModalBadges() {
        const badgesEl = document.getElementById('attendeeModalBadges');
        const countEl = document.getElementById('attendeeModalCount');
        const totalEl = document.getElementById('attendeeModalTotalAmount');
        if (!badgesEl) return;

        const internalPersons = window.getTripPersons ? window.getTripPersons() : [];
        const externalPersons = allExternalPersons.filter(p => tempSelectedExternalIds.has(String(p.idx)));

        const totalCount = internalPersons.length + externalPersons.length;
        if (countEl) countEl.textContent = totalCount;

        let meetingTotal = 0;
        internalPersons.forEach(p => { meetingTotal += getPersonMeetingExpense(p); });
        externalPersons.forEach(p => { meetingTotal += getPersonMeetingExpense(p); });
        if (totalEl) totalEl.textContent = meetingTotal > 0 ? meetingTotal.toLocaleString() : '0';

        if (totalCount === 0) {
            badgesEl.innerHTML = '<div class="empty-state"><i class="fas fa-user-plus"></i><span>출장인원을 등록하거나 외부인원을 선택해주세요</span></div>';
            return;
        }

        const internalBadges = internalPersons.map(p =>
            `<span class="attendee-badge" title="${p.position} · ${p.dept}"><i class="fas fa-building"></i> ${p.name}</span>`
        ).join('');

        const externalBadges = externalPersons.map(p =>
            `<span class="attendee-badge external" title="${p.position || ''} · ${p.companyName || ''}">
                <i class="fas fa-user-tie"></i> ${p.name}
                <button class="badge-remove" onclick="removeExternalFromModalSelection(${p.idx})" title="선택 해제">×</button>
            </span>`
        ).join('');

        badgesEl.innerHTML = internalBadges + externalBadges;
    }

    // 외부인원 목록 렌더링 (외부인력만)
    function renderAttendeeList2(searchText = '') {
        const attendeeList2El = document.getElementById('attendeeList2');
        if (!attendeeList2El) return;

        if (!allExternalPersons || allExternalPersons.length === 0) {
            attendeeList2El.innerHTML = `<div class="modal-empty-state"><i class="fas fa-user-plus"></i><p>등록된 외부인력이 없습니다<br><small>신규 등록 버튼을 클릭하세요</small></p></div>`;
            return;
        }

        const filtered = allExternalPersons.filter(person =>
            searchUtils.matchesAny(searchText, person.name, person.companyName, person.position)
        );

        if (filtered.length === 0) {
            attendeeList2El.innerHTML = `<div class="modal-empty-state"><i class="fas fa-search"></i><p>검색 결과가 없습니다</p></div>`;
            return;
        }

        attendeeList2El.innerHTML = filtered.map(person => {
            const isSelected = tempSelectedExternalIds.has(String(person.idx));
            return `
            <div class="employee-item${isSelected ? ' selected' : ''}" data-id="${person.idx}" onclick="selectExternalAttendee(${person.idx})">
                <i class="far fa-user"></i>
                <div class="employee-info">
                    <div class="employee-name">${searchUtils.highlightText(person.name, searchText)}</div>
                    <div class="employee-detail">${searchUtils.highlightText(person.position || '직급 미지정', searchText)} · ${searchUtils.highlightText(person.companyName || '', searchText)}</div>
                </div>
            </div>`;
        }).join('');
    }

    // 외부인원 선택 토글
    window.selectExternalAttendee = function(personIdx) {
        const idStr = String(personIdx);
        if (tempSelectedExternalIds.has(idStr)) {
            tempSelectedExternalIds.delete(idStr);
        } else {
            tempSelectedExternalIds.add(idStr);
        }
        // 목록 아이템 선택 상태 업데이트
        const items = document.querySelectorAll('#attendeeList2 .employee-item');
        items.forEach(item => {
            if (parseInt(item.getAttribute('data-id')) === personIdx) {
                item.classList.toggle('selected', tempSelectedExternalIds.has(idStr));
            }
        });
        renderAttendeeModalBadges();
    };

    // 모달 내 외부인원 전체 해제
    window.clearAllExternalAttendees = function() {
        tempSelectedExternalIds.clear();
        renderAttendeeList2(attendeeSearchInput ? attendeeSearchInput.value : '');
        renderAttendeeModalBadges();
    };

    // 모달 내 특정 외부인원 선택 해제
    window.removeExternalFromModalSelection = function(personIdx) {
        tempSelectedExternalIds.delete(String(personIdx));
        renderAttendeeList2(attendeeSearchInput ? attendeeSearchInput.value : '');
        renderAttendeeModalBadges();
    };

    // 검색 기능
    if (attendeeSearchInput) {
        attendeeSearchInput.addEventListener('input', function(e) {
            renderAttendeeList2(e.target.value);
        });
    }

    // 외부인원 신규 등록 폼 토글
    window.toggleNewExternalForm = function() {
        const form = document.getElementById('newExternalForm');
        if (!form) return;
        const isVisible = form.style.display !== 'none';
        form.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            const nameInput = document.getElementById('extName');
            if (nameInput) { nameInput.value = ''; }
            const companyInput = document.getElementById('extCompany');
            if (companyInput) { companyInput.value = ''; }
            const posInput = document.getElementById('extPosition');
            if (posInput) { posInput.value = ''; }
            setTimeout(() => { if (nameInput) nameInput.focus(); }, 100);
        }
    };

    window.cancelNewExternal = function() {
        const form = document.getElementById('newExternalForm');
        if (form) form.style.display = 'none';
    };

    window.saveNewExternal = async function() {
        const name = (document.getElementById('extName')?.value || '').trim();
        const company = (document.getElementById('extCompany')?.value || '').trim();
        const position = (document.getElementById('extPosition')?.value || '').trim();

        if (!name) {
            Swal.fire({ icon: 'warning', title: '입력 오류', text: '이름을 입력하세요.' });
            document.getElementById('extName').focus();
            return;
        }
        if (!company) {
            Swal.fire({ icon: 'warning', title: '입력 오류', text: '회사명을 입력하세요.' });
            document.getElementById('extCompany').focus();
            return;
        }

        try {
            const response = await fetch('/api/external-persons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, companyName: company, position })
            });

            if (response.ok) {
                const newPerson = await response.json();
                showSuccess('외부인력이 등록되었습니다.');
                window.cancelNewExternal();
                await loadExternalPersons();
                // 신규 등록된 외부인원을 자동으로 임시 선택 상태에 추가
                tempSelectedExternalIds.add(String(newPerson.idx));
                renderAttendeeList2(attendeeSearchInput ? attendeeSearchInput.value : '');
                renderAttendeeModalBadges();
            } else {
                showError('외부인력 등록에 실패했습니다.');
            }
        } catch (e) {
            console.error('외부인력 등록 오류:', e);
            showError('외부인력 등록 중 오류가 발생했습니다.');
        }
    };

    // 선택된 외부 참석자 확정 (tempSelectedExternalIds → attendees 교체)
    window.addSelectedAttendees = function() {
        const newExternalAttendees = allExternalPersons
            .filter(p => tempSelectedExternalIds.has(String(p.idx)))
            .map(p => ({
                id: String(p.idx),
                name: p.name,
                dept: p.companyName || '',
                position: p.position || '',
                isExternal: true
            }));

        // attendees 배열을 교체 (내부인원 제외, 외부만)
        attendees = newExternalAttendees;
        if (typeof window.renderAttendeeListInTemplate === 'function') window.renderAttendeeListInTemplate();
        if (typeof validateRequiredFields === 'function') validateRequiredFields();

        closeAttendeeModal();
    };

    // 공식 문서 양식 토글 기능
    function setupDocumentFormToggle() {
        const documentFormToggle = document.getElementById('documentFormToggle');
        const documentFormWrapper = document.querySelector('.document-form-wrapper');

        if (documentFormToggle && documentFormWrapper) {
            documentFormToggle.addEventListener('click', function() {
                documentFormWrapper.classList.toggle('collapsed');
                documentFormToggle.classList.toggle('active');
            });
        }
    }

    // 초기화: 직원 데이터 로드
    loadEmployees();
    loadProjects();
    loadPositionCodes();
    loadFixedExpenses();
    loadExternalPersons();

    // 초기 템플릿 로드 (회의+출장)
    loadTemplate('receipt-trip');

    // 날짜/시간 입력 필드 클릭 시 선택기 열기
    setTimeout(() => {
        ['common_date', 'common_start_time', 'common_end_time'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', function() {
                    if (this.showPicker) this.showPicker();
                });
            }
        });
    }, 0);

    // ============================================
    // 필수 필드 검증 (빨간색 + shake 애니메이션)
    // ============================================
    function validateRequiredFields() {
        // 출장 + 회의 공통 필수 텍스트 필드
        const requiredIds = ['common_project', 'common_card', 'common_location', 'common_date',
                             'common_purpose', 'common_meeting_date', 'common_start_time',
                             'common_end_time', 'common_meeting_content'];
        let allFilled = true;

        requiredIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (!el.value || !el.value.trim()) {
                el.classList.add('field-empty');
                allFilled = false;
            } else {
                el.classList.remove('field-empty');
            }
        });

        // 출장 내용 및 결과 — "- 출장 내용 :" 이후에 실제 텍스트가 있는지 검증
        const tripResultEl = document.getElementById('common_trip_result');
        if (tripResultEl) {
            const marker = '- 출장 내용 :';
            const val = tripResultEl.value;
            const idx = val.indexOf(marker);
            const hasContent = idx !== -1
                ? val.slice(idx + marker.length).trim().length > 0
                : val.trim().length > 0;
            if (!hasContent) {
                tripResultEl.classList.add('field-empty');
                allFilled = false;
            } else {
                tripResultEl.classList.remove('field-empty');
            }
        }

        // 출장인원 검증
        const tripPersonArea = document.getElementById('tripPersonArea');
        if (tripPersonArea) {
            if (tripPersons.length === 0) {
                tripPersonArea.classList.add('field-empty');
                allFilled = false;
            } else {
                tripPersonArea.classList.remove('field-empty');
            }
        }

        // 날짜별 비용 검증 — 합계 > 0
        const expenseTable = document.getElementById('dailyExpenseTable');
        if (expenseTable) {
            const totalFee = dailyExpenses.reduce((s, e) => s + (e.transport||0) + (e.lodging||0) + (e.meal||0) + (e.other||0), 0);
            if (totalFee === 0) {
                expenseTable.classList.add('field-empty');
                allFilled = false;
            } else {
                expenseTable.classList.remove('field-empty');
            }
        }

        // 사용 금액 검증 (회의 카드 결제)
        const amountEl = document.getElementById('common_amount');
        if (amountEl) {
            const amountVal = parseInt((amountEl.value || '0').replace(/,/g, '')) || 0;
            if (amountVal <= 0) {
                amountEl.classList.add('field-empty');
                allFilled = false;
            } else {
                amountEl.classList.remove('field-empty');
            }
        }

        // 참석자 검증 (출장인원 = 내부 참석자이므로 tripPersons로 판단)
        const attendeeAreaEl = document.getElementById('attendeeArea');
        if (attendeeAreaEl) {
            const hasAttendees = attendees.length > 0 || tripPersons.length > 0;
            if (!hasAttendees) {
                attendeeAreaEl.classList.add('field-empty');
                allFilled = false;
            } else {
                attendeeAreaEl.classList.remove('field-empty');
            }
        }

        // 인쇄 버튼 표시/숨김
        const printBtn = document.getElementById('printDocumentBtn');
        if (printBtn) {
            printBtn.style.display = allFilled ? 'inline-flex' : 'none';
        }

        return allFilled;
    }

    function scrollToFirstEmptyField() {
        const first = document.querySelector('.field-empty');
        if (first) {
            first.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const focusable = first.querySelector('input, textarea, select') || (first.matches('input, textarea, select') ? first : null);
            if (focusable) focusable.focus({ preventScroll: true });
        }
    }

    // 필드 변경 시 재검증
    ['common_project', 'common_card', 'common_location', 'common_date', 'common_purpose',
     'common_trip_result', 'common_meeting_date', 'common_amount',
     'common_start_time', 'common_end_time', 'common_meeting_content'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', validateRequiredFields);
            el.addEventListener('change', validateRequiredFields);
        }
    });

    // 인원/참석자 추가·제거 후 재검증 (전역 함수 래핑)
    const _origRemoveTripPerson = window.removeTripPersonInTemplate;
    window.removeTripPersonInTemplate = function(...args) {
        if (_origRemoveTripPerson) _origRemoveTripPerson(...args);
        validateRequiredFields();
    };
    const _origRemoveAttendee = window.removeAttendeeInTemplate;
    window.removeAttendeeInTemplate = function(...args) {
        if (_origRemoveAttendee) _origRemoveAttendee(...args);
        validateRequiredFields();
    };
    const _origAddPersonsToTrip = window.addPersonsToTrip;
    window.addPersonsToTrip = function(...args) {
        if (_origAddPersonsToTrip) _origAddPersonsToTrip(...args);
        validateRequiredFields();
    };
    const _origAddAttendeesToMeeting = window.addAttendeesToMeeting;
    window.addAttendeesToMeeting = function(...args) {
        if (_origAddAttendeesToMeeting) _origAddAttendeesToMeeting(...args);
        validateRequiredFields();
    };

    // 인쇄하기
    window.printDocuments = function() {
        // 문서 미리보기가 접혀 있으면 먼저 펼치기
        const wrapper = document.querySelector('.document-form-wrapper');
        const toggleIcon = document.querySelector('#documentFormToggle .toggle-icon');
        if (wrapper && wrapper.classList.contains('collapsed')) {
            wrapper.classList.remove('collapsed');
            if (toggleIcon) toggleIcon.style.transform = 'rotate(180deg)';
        }
        setTimeout(() => window.print(), 300);
    };

    // 초기 필수 필드 강조 (신규 작성 시)
    setTimeout(() => { validateRequiredFields(); }, 300);

    // ============================================
    // 작성자 선택 모달
    // ============================================
    const authorModal = document.getElementById('authorModal');
    const authorListEl = document.getElementById('authorList');
    const authorSearchInput = document.getElementById('authorSearchInput');

    // projectMembers 원시 데이터를 person 객체로 변환
    function getAuthorPersons() {
        return projectMembers.map(m => ({
            id: m.employeeIdx || m.id,
            name: m.employeeName || m.name,
            dept: m.employeeDeptName || m.dept || '',
            position: m.employeePositionName || m.position || '',
            positionCode: m.employeePositionCode || m.positionCode || ''
        }));
    }

    window.openAuthorModal = async function() {
        if (!authorModal) return;
        authorModal.classList.add('show');
        if (authorSearchInput) authorSearchInput.value = '';

        // 프로젝트가 선택됐는데 팀원이 로드 안 된 경우 로드
        const projectIdxInput = document.getElementById('selectedProjectIdx');
        if (projectIdxInput?.value && projectMembers.length === 0) {
            await loadProjectMembers(projectIdxInput.value);
        }

        await renderAuthorList('');
    };

    window.closeAuthorModal = function() {
        if (authorModal) authorModal.classList.remove('show');
        if (authorSearchInput) authorSearchInput.value = '';
    };

    // 회의 작성자 선택 모달
    const meetingAuthorModal = document.getElementById('meetingAuthorModal');
    const meetingAuthorSearchInput = document.getElementById('meetingAuthorSearchInput');
    const meetingAuthorList = document.getElementById('meetingAuthorList');

    function renderMeetingAuthorList(searchText = '') {
        if (!meetingAuthorList) return;
        const filtered = tripPersons.filter(p => {
            if (!searchText) return true;
            return (p.name || '').includes(searchText) || (p.dept || '').includes(searchText);
        });

        if (filtered.length === 0) {
            meetingAuthorList.innerHTML = `
                <div style="text-align:center; padding:40px; color:#94a3b8;">
                    <i class="fas fa-user-slash" style="font-size:32px; margin-bottom:12px; display:block;"></i>
                    ${tripPersons.length === 0 ? '출장인원을 먼저 추가해주세요.' : '검색 결과가 없습니다.'}
                </div>`;
            return;
        }

        const currentVal = document.getElementById('common_meeting_author')?.value?.split(' (')[0];
        meetingAuthorList.innerHTML = filtered.map(p => {
            const isSelected = currentVal && currentVal === p.name;
            return `
                <div class="employee-item${isSelected ? ' selected' : ''}" onclick="selectMeetingAuthor('${p.id}', '${p.name}', '${p.dept || ''}', '${p.position || ''}')">
                    <i class="far fa-user"></i>
                    <div class="employee-info">
                        <div class="employee-name">${p.name}${isSelected ? ' <i class="fas fa-check" style="color:#667eea; margin-left:4px;"></i>' : ''}</div>
                        <div class="employee-detail">${p.position || ''} · ${p.dept || ''}</div>
                    </div>
                </div>`;
        }).join('');
    }

    window.openMeetingAuthorModal = async function() {
        if (tripPersons.length === 0) {
            await showWarning('출장인원을 먼저 추가해주세요.');
            return;
        }
        if (meetingAuthorModal) meetingAuthorModal.classList.add('show');
        if (meetingAuthorSearchInput) meetingAuthorSearchInput.value = '';
        renderMeetingAuthorList('');
    };

    window.closeMeetingAuthorModal = function() {
        if (meetingAuthorModal) meetingAuthorModal.classList.remove('show');
        if (meetingAuthorSearchInput) meetingAuthorSearchInput.value = '';
    };

    if (meetingAuthorModal) {
        meetingAuthorModal.addEventListener('click', function(e) {
            if (e.target === meetingAuthorModal) closeMeetingAuthorModal();
        });
    }

    if (meetingAuthorSearchInput) {
        meetingAuthorSearchInput.addEventListener('input', function() {
            renderMeetingAuthorList(this.value);
        });
    }

    window.selectMeetingAuthor = function(id, name, dept, position) {
        const el = document.getElementById('common_meeting_author');
        if (el) el.value = name ? `${name} (${position || dept || ''})` : '';
        closeMeetingAuthorModal();
    };

    if (authorModal) {
        authorModal.addEventListener('click', function(e) {
            if (e.target === authorModal) closeAuthorModal();
        });
    }

    if (authorSearchInput) {
        authorSearchInput.addEventListener('input', async function() {
            // 프로젝트 미선택 시 프로젝트 검색, 선택 시 인원 검색
            if (projectMembers.length === 0) {
                renderProjectListInAuthorModal(this.value);
            } else {
                await renderAuthorList(this.value);
            }
        });
    }

    // 작성자 모달 내 프로젝트 목록 렌더링 (프로젝트 미선택 시)
    function renderProjectListInAuthorModal(searchText = '') {
        if (!authorListEl) return;

        let filtered = projects;
        if (searchText) {
            filtered = projects.filter(p => matchesSearch(p.projectName || '', searchText));
        }

        if (filtered.length === 0) {
            authorListEl.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-search" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                    ${searchText ? '검색 결과가 없습니다.' : '등록된 프로젝트가 없습니다.'}
                </div>`;
            return;
        }

        const header = `
            <div class="convenience-notice">
                <div class="notice-icon"><i class="fas fa-lightbulb"></i></div>
                <div class="notice-content">
                    <div class="notice-title">프로젝트를 먼저 선택해주세요</div>
                    <div class="notice-desc">프로젝트를 선택하면 해당 팀원 목록이 표시됩니다</div>
                </div>
            </div>`;

        const items = filtered.map(proj => `
            <div class="project-item-in-card" data-project-idx="${proj.idx}">
                <div class="project-item-icon"><i class="fas fa-folder"></i></div>
                <div class="project-item-name">${highlightText(proj.projectName || '이름 없음', searchText)}</div>
                <div class="project-item-arrow"><i class="fas fa-chevron-right"></i></div>
            </div>`).join('');

        authorListEl.innerHTML = header + items;

        authorListEl.querySelectorAll('.project-item-in-card').forEach(item => {
            item.addEventListener('click', async function() {
                const projectIdx = this.getAttribute('data-project-idx');
                const proj = projects.find(p => String(p.idx) === String(projectIdx));
                if (!proj) return;

                // 과제 필드 채우기
                const commonProjectEl = document.getElementById('common_project');
                if (commonProjectEl) {
                    commonProjectEl.value = proj.projectName;
                    commonProjectEl.classList.remove('field-empty');
                }
                const selectedProjectIdxEl = document.getElementById('selectedProjectIdx');
                if (selectedProjectIdxEl) selectedProjectIdxEl.value = proj.idx;

                document.querySelectorAll('.auto-project').forEach(el => {
                    if (el.tagName === 'INPUT') el.value = proj.projectName;
                    else el.textContent = proj.projectName;
                });

                // 참여인원 + 경비 설정 로드
                await Promise.all([
                    loadProjectMembers(proj.idx),
                    loadProjectExpenseSettings(proj.idx)
                ]);
                updateTripExpenseTooltip();
                updateMeetingExpenseTooltip();
                if (window.refreshTripPersonBadges) window.refreshTripPersonBadges();

                // 카드 로드 및 첫 번째 카드 자동 선택
                await loadProjectCards(proj.idx);
                const commonCard = document.getElementById('common_card');
                const selectedCardIdx = document.getElementById('selectedCardIdx');
                if (projectCards.length > 0) {
                    const firstCard = projectCards[0];
                    selectedCard = firstCard;
                    if (commonCard) commonCard.value = firstCard.cardName;
                    if (selectedCardIdx) selectedCardIdx.value = firstCard.idx;
                } else {
                    selectedCard = null;
                    if (commonCard) { commonCard.value = ''; commonCard.placeholder = '클릭하여 카드 선택'; }
                    if (selectedCardIdx) selectedCardIdx.value = '';
                }

                // 기본 작성자 설정
                await setDefaultAuthor();

                // 검색창 비우기 후 인원 목록 렌더링
                if (authorSearchInput) authorSearchInput.value = '';
                await renderAuthorList('');
            });
        });
    }

    async function renderAuthorList(searchText = '') {
        if (!authorListEl) return;

        const persons = getAuthorPersons();

        if (persons.length === 0) {
            // 프로젝트 미선택 → 프로젝트 목록 표시
            renderProjectListInAuthorModal(searchText);
            return;
        }

        // 직급순 정렬 (높은 직급 → 낮은 직급)
        const sortedPersons = sortByPositionAsc([...persons]);

        // 검색 필터링
        const filteredPersons = searchText
            ? sortedPersons.filter(p =>
                (p.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
                (p.dept || '').toLowerCase().includes(searchText.toLowerCase()) ||
                (p.position || '').toLowerCase().includes(searchText.toLowerCase())
            )
            : sortedPersons;

        if (filteredPersons.length === 0) {
            authorListEl.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px; display: block;"></i>
                    <p>검색 결과가 없습니다.</p>
                </div>`;
            return;
        }

        authorListEl.innerHTML = filteredPersons.map(person => {
            const isSelected = authorPersonId && String(person.id) === String(authorPersonId);
            const selectedClass = isSelected ? 'selected' : '';
            const checkIcon = isSelected ? '<i class="fas fa-check-circle" style="color: #10b981; margin-left: auto;"></i>' : '';

            // 출장 참여 여부
            const isTripPerson = tripPersons.some(p => String(p.id) === String(person.id));
            const tripBadge = isTripPerson
                ? `<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; white-space: nowrap;"><i class="fas fa-plane"></i> 출장 참여중</span>`
                : '';

            // 회의 참석 여부
            const isMeetingAttendee = attendees.some(a => String(a.id) === String(person.id));
            const meetingBadge = isMeetingAttendee
                ? `<span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; white-space: nowrap;"><i class="fas fa-user-check"></i> 회의 참석중</span>`
                : '';

            return `
                <div class="employee-item ${selectedClass}" data-id="${person.id}" onclick="selectAuthor(${person.id})">
                    <div class="employee-info">
                        <div class="employee-name">${person.name}${tripBadge}${meetingBadge}</div>
                        <div class="employee-details">${person.dept} · ${person.position}</div>
                    </div>
                    ${checkIcon}
                </div>
            `;
        }).join('');
    }

    window.selectAuthor = async function(personId) {
        const person = getAuthorPersons().find(p => String(p.id) === String(personId));
        if (!person) return;

        // 회의 날짜/시간이 설정된 경우 시간 중복 체크
        const dateInput = document.getElementById('common_meeting_date');
        const startInput = document.getElementById('common_start_time');
        const endInput = document.getElementById('common_end_time');
        const projectIdxInput = document.getElementById('selectedProjectIdx');

        if (dateInput?.value && startInput?.value && endInput?.value && projectIdxInput?.value) {
            const isDup = await checkAuthorDuplicate(
                person.id, dateInput.value, startInput.value, endInput.value, projectIdxInput.value
            );
            if (isDup) {
                const result = await Swal.fire({
                    icon: 'warning',
                    title: '시간 중복 경고',
                    html: `<strong>${person.name}</strong>님은 해당 시간대에<br>이미 다른 회의에 참석 중입니다.<br><br>그래도 작성자로 선택하시겠습니까?`,
                    showCancelButton: true,
                    confirmButtonText: '계속 진행',
                    cancelButtonText: '취소',
                    confirmButtonColor: '#ff9800'
                });
                if (!result.isConfirmed) return;
            }
        }

        if (window.setAuthorInTemplate) window.setAuthorInTemplate(person);
        closeAuthorModal();
    };

    // ============================================
    // 사용 금액 버튼
    // ============================================
    window.addAmount = function(value) {
        const el = document.getElementById('common_amount');
        if (!el) return;
        const current = parseInt(el.value.replace(/,/g, '') || '0');
        el.value = (current + value).toLocaleString();
    };

    window.resetAmount = function() {
        const el = document.getElementById('common_amount');
        if (el) el.value = '';
    };

    // ============================================
    // 카드 선택 모달
    // ============================================
    const cardModal = document.getElementById('cardModal');
    const cardList = document.getElementById('cardList');
    const cardSearch = document.getElementById('cardSearch');

    function renderCardList(list, keyword = '') {
        if (!cardList) return;
        cardList.innerHTML = '';
        if (list.length === 0) {
            cardList.innerHTML = `
                <div class="modal-empty-state">
                    <i class="fas fa-credit-card"></i>
                    <p>${keyword ? '검색 결과가 없습니다' : '등록된 카드가 없습니다'}</p>
                </div>`;
            return;
        }
        list.forEach(card => {
            const item = document.createElement('div');
            item.className = 'modal-item';
            if (selectedCard && selectedCard.idx === card.idx) item.classList.add('selected');
            item.innerHTML = `
                <i class="fas fa-credit-card"></i>
                <div class="modal-item-info">
                    <div class="modal-item-name">${highlightText(card.cardName, keyword)}</div>
                    <div class="modal-item-detail">${highlightText(card.cardNumber || '카드번호 없음', keyword)}</div>
                </div>`;
            item.addEventListener('click', function() {
                selectedCard = card;
                const cardField = document.getElementById('common_card');
                if (cardField) cardField.value = card.cardName;
                const selectedCardIdxInput = document.getElementById('selectedCardIdx');
                if (selectedCardIdxInput) selectedCardIdxInput.value = card.idx;
                closeCardModal();
            });
            cardList.appendChild(item);
        });
    }

    function renderProjectListInCardModal(searchText = '') {
        if (!cardList) return;
        let filtered = projects;
        if (searchText) {
            filtered = projects.filter(p => matchesSearch(p.projectName || '', searchText));
        }

        if (filtered.length === 0) {
            cardList.innerHTML = `
                <div class="modal-empty-state">
                    <i class="fas fa-search"></i>
                    <p>${searchText ? '검색 결과가 없습니다' : '등록된 프로젝트가 없습니다'}</p>
                </div>`;
            return;
        }

        const header = `
            <div class="convenience-notice">
                <div class="notice-icon"><i class="fas fa-lightbulb"></i></div>
                <div class="notice-content">
                    <div class="notice-title">과제를 먼저 선택해주세요</div>
                    <div class="notice-desc">과제를 선택하면 사용 카드 목록이 표시됩니다</div>
                </div>
            </div>`;

        const items = filtered.map(proj => `
            <div class="project-item-in-card" data-project-idx="${proj.idx}">
                <div class="project-item-icon"><i class="fas fa-folder"></i></div>
                <div class="project-item-name">${highlightText(proj.projectName || '이름 없음', searchText)}</div>
                <div class="project-item-arrow"><i class="fas fa-chevron-right"></i></div>
            </div>`).join('');

        cardList.innerHTML = header + items;

        cardList.querySelectorAll('.project-item-in-card').forEach(item => {
            item.addEventListener('click', async function() {
                const projectIdx = this.getAttribute('data-project-idx');
                const proj = projects.find(p => String(p.idx) === String(projectIdx));
                if (!proj) return;

                // 과제 필드 채우기
                const commonProject = document.getElementById('common_project');
                if (commonProject) {
                    commonProject.value = proj.projectName;
                    commonProject.classList.remove('field-empty');
                }
                const selectedProjectIdx = document.getElementById('selectedProjectIdx');
                if (selectedProjectIdx) selectedProjectIdx.value = proj.idx;

                document.querySelectorAll('.auto-project').forEach(el => {
                    if (el.tagName === 'INPUT') el.value = proj.projectName;
                    else el.textContent = proj.projectName;
                });


                // 참여인원 + 경비 설정 로드 → 툴팁 갱신 + 기본 작성자 자동 설정
                await Promise.all([
                    loadProjectMembers(proj.idx),
                    loadProjectExpenseSettings(proj.idx)
                ]);
                updateTripExpenseTooltip();
                updateMeetingExpenseTooltip();
                if (window.refreshTripPersonBadges) window.refreshTripPersonBadges();
                setDefaultAuthor();

                // 카드 로드 후 카드 목록으로 전환
                await loadProjectCards(proj.idx);
                renderCardList(projectCards);
                if (cardSearch) cardSearch.value = '';
            });
        });
    }

    window.openCardModal = function() {
        if (!cardModal) return;
        cardModal.classList.add('show');
        const projectIdxInput = document.getElementById('selectedProjectIdx');
        if (!projectIdxInput || !projectIdxInput.value) {
            renderProjectListInCardModal('');
        } else {
            renderCardList(projectCards);
        }
        if (cardSearch) cardSearch.value = '';
    };

    window.closeCardModal = function() {
        if (cardModal) {
            cardModal.classList.remove('show');
            if (cardSearch) cardSearch.value = '';
        }
    };

    if (cardSearch) {
        cardSearch.addEventListener('input', function() {
            const keyword = this.value.trim();
            const projectIdxInput = document.getElementById('selectedProjectIdx');
            if (!projectIdxInput || !projectIdxInput.value) {
                renderProjectListInCardModal(keyword);
            } else {
                const filtered = projectCards.filter(card =>
                    matchesSearch(card.cardName, keyword) ||
                    matchesSearch(card.cardNumber || '', keyword)
                );
                renderCardList(filtered, keyword);
            }
        });
    }

    if (cardModal) {
        cardModal.addEventListener('click', function(e) {
            if (e.target === cardModal) closeCardModal();
        });
    }

    // ============================================
    // 프로젝트 선택 모달
    // ============================================
    const projectModal = document.getElementById('projectModal');
    const projectSearchInput = document.getElementById('projectSearchInput');
    const projectList = document.getElementById('projectList');
    const commonProject = document.getElementById('common_project');

    // 초성 검색 유틸리티
    const CHO_HANGUL = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

    function getChosung(str) {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i) - 44032;
            if (code > -1 && code < 11172) {
                result += CHO_HANGUL[Math.floor(code / 588)];
            } else {
                result += str.charAt(i);
            }
        }
        return result;
    }

    function matchesSearch(text, keyword) {
        if (!text || !keyword) return true;
        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();
        if (lowerText.includes(lowerKeyword)) return true;
        // 초성 검색
        const chosung = getChosung(text);
        return chosung.includes(keyword);
    }

    function highlightText(text, keyword) {
        if (!keyword || !text) return text;
        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();
        if (lowerText.includes(lowerKeyword)) {
            const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            return text.replace(regex, '<mark class="search-highlight">$1</mark>');
        }
        const chosung = getChosung(text);
        if (chosung.includes(keyword)) {
            let result = '';
            let keywordIndex = 0;
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const code = text.charCodeAt(i) - 44032;
                if (code > -1 && code < 11172) {
                    const cho = CHO_HANGUL[Math.floor(code / 588)];
                    if (keywordIndex < keyword.length && cho === keyword[keywordIndex]) {
                        result += `<mark class="search-highlight">${char}</mark>`;
                        keywordIndex++;
                    } else {
                        result += char;
                    }
                } else {
                    result += char;
                }
            }
            return result;
        }
        return text;
    }

    // ── 프로젝트 연도 필터 ──────────────────────────────────────
    let selectedYear = null;
    let currentSearchKeyword = '';

    function renderYearButtons() {
        const SERVICE_START = 2026;
        const currentYear = new Date().getFullYear();
        const recentStart = Math.max(currentYear - 2, SERVICE_START);
        const existing = document.getElementById('projectYearFilter');
        if (existing) existing.remove();
        const container = document.createElement('div');
        container.id = 'projectYearFilter';
        container.style.cssText = 'display:flex; gap:6px; padding:8px 0; border-bottom:1px solid #eee; flex-wrap:wrap; align-items:center;';
        // 전체 버튼
        const allBtn = document.createElement('button');
        allBtn.type = 'button';
        allBtn.textContent = '전체';
        const allActive = selectedYear === null;
        allBtn.style.cssText = `padding:3px 10px; border-radius:12px; border:1px solid ${allActive ? '#667eea' : '#ddd'}; background:${allActive ? '#667eea' : 'white'}; color:${allActive ? 'white' : '#555'}; cursor:pointer; font-size:12px;`;
        allBtn.addEventListener('click', () => { selectedYear = null; renderYearButtons(); applyProjectFilters(); });
        container.appendChild(allBtn);
        // 오래된 연도 드롭다운 (서비스 시작연도 ~ 최근 3개년 이전)
        if (recentStart > SERVICE_START) {
            const select = document.createElement('select');
            const hasOldSelected = selectedYear !== null && selectedYear < recentStart;
            select.style.cssText = `padding:3px 8px; border-radius:12px; border:1px solid ${hasOldSelected ? '#667eea' : '#ddd'}; background:${hasOldSelected ? '#eef0ff' : 'white'}; color:#555; cursor:pointer; font-size:12px; outline:none;`;
            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = '연도선택';
            select.appendChild(defaultOpt);
            for (let y = SERVICE_START; y < recentStart; y++) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y + '년';
                if (selectedYear === y) opt.selected = true;
                select.appendChild(opt);
            }
            select.addEventListener('change', function() {
                if (this.value) { selectedYear = parseInt(this.value); renderYearButtons(); applyProjectFilters(); }
            });
            container.appendChild(select);
        }
        // 최근 3개년 버튼 (서비스 시작연도부터 최대 3개)
        for (let year = recentStart; year <= currentYear; year++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = year + '년';
            const isActive = selectedYear === year;
            btn.style.cssText = `padding:3px 10px; border-radius:12px; border:1px solid ${isActive ? '#667eea' : '#ddd'}; background:${isActive ? '#667eea' : 'white'}; color:${isActive ? 'white' : '#555'}; cursor:pointer; font-size:12px;`;
            btn.addEventListener('click', () => { selectedYear = year; renderYearButtons(); applyProjectFilters(); });
            container.appendChild(btn);
        }
        if (projectList && projectList.parentNode) {
            projectList.parentNode.insertBefore(container, projectList.parentNode.firstElementChild);
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
                matchesSearch(proj.projectManagerName || proj.projectLeader || '', currentSearchKeyword)
            );
        }
        renderProjectList(filtered, currentSearchKeyword);
    }

    // 프로젝트 목록 렌더링
    function renderProjectList(projectsToShow, keyword = '') {
        if (!projectList) return;

        if (!projectsToShow || projectsToShow.length === 0) {
            projectList.innerHTML = '<div class="modal-empty-state"><i class="fas fa-folder-open"></i><p>등록된 프로젝트가 없습니다</p></div>';
            return;
        }

        projectList.innerHTML = projectsToShow.map(proj => {
            const projectName = highlightText(proj.projectName || '이름 없음', keyword);
            const leader = proj.projectManagerName || proj.projectLeader || '-';
            const memberCount = proj.memberCount != null ? proj.memberCount : (proj.projectMembers ? proj.projectMembers.length : 0);
            const startDate = proj.startDate ? new Date(proj.startDate).toLocaleDateString('ko-KR') : (proj.projectStartDate ? new Date(proj.projectStartDate).toLocaleDateString('ko-KR') : '-');
            const endDate = proj.endDate ? new Date(proj.endDate).toLocaleDateString('ko-KR') : (proj.projectEndDate ? new Date(proj.projectEndDate).toLocaleDateString('ko-KR') : '-');

            return `
                <div class="modal-item" onclick="selectProject(${proj.idx})">
                    <div class="modal-item-info">
                        <div class="modal-item-name">${projectName}</div>
                        <div class="modal-item-detail">
                            <div><i class="fas fa-user"></i> ${leader} (${memberCount}명)</div>
                            <div><i class="fas fa-calendar"></i> ${startDate} ~ ${endDate}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 프로젝트 선택
    window.selectProject = function(projectIdx) {
        const proj = projects.find(p => p.idx === projectIdx);
        if (!proj) return;

        // 과제명 필드에 표시
        if (commonProject) {
            commonProject.value = proj.projectName;
            commonProject.style.borderColor = '';
            commonProject.classList.remove('field-empty');
        }

        const selectedProjectIdx = document.getElementById('selectedProjectIdx');
        if (selectedProjectIdx) {
            selectedProjectIdx.value = proj.idx;
        }

        // 자동 채우기
        document.querySelectorAll('.auto-project').forEach(field => {
            field.textContent = proj.projectName || '';
        });

        // 참여인원 + 경비 설정 로드 → 툴팁 갱신 + 기본 작성자 자동 설정
        Promise.all([
            loadProjectMembers(proj.idx),
            loadProjectExpenseSettings(proj.idx)
        ]).then(() => {
            updateTripExpenseTooltip();
            updateMeetingExpenseTooltip();
            if (window.refreshTripPersonBadges) window.refreshTripPersonBadges();
            setDefaultAuthor();
        });

        // 카드 목록 로드 후 자동 선택
        loadProjectCards(proj.idx).then(() => {
            const cardField = document.getElementById('common_card');
            const selectedCardIdxInput = document.getElementById('selectedCardIdx');
            if (projectCards && projectCards.length > 0) {
                selectedCard = projectCards[0];
                if (cardField) {
                    cardField.value = projectCards[0].cardName;
                    cardField.placeholder = '클릭하여 카드 선택';
                }
                if (selectedCardIdxInput) selectedCardIdxInput.value = projectCards[0].idx;
            } else {
                selectedCard = null;
                if (cardField) {
                    cardField.value = '';
                    cardField.placeholder = '등록된 카드가 없습니다';
                }
                if (selectedCardIdxInput) selectedCardIdxInput.value = '';
            }
        });

        closeProjectModal();
        setTimeout(() => validateRequiredFields(), 100);
    };

    // 프로젝트 모달 열기
    window.openProjectModal = function() {
        if (projectModal) {
            selectedYear = new Date().getFullYear();
            currentSearchKeyword = '';
            projectModal.classList.add('show');
            if (projectSearchInput) projectSearchInput.value = '';
            renderYearButtons();
            applyProjectFilters();
        }
    };

    // 프로젝트 모달 닫기
    window.closeProjectModal = function() {
        if (projectModal) {
            projectModal.classList.remove('show');
        }
    };

    // 프로젝트 검색
    if (projectSearchInput) {
        projectSearchInput.addEventListener('input', function() {
            currentSearchKeyword = this.value.trim();
            applyProjectFilters();
        });
    }

    // 과제명 필드 클릭 이벤트
    if (commonProject) {
        commonProject.addEventListener('click', openProjectModal);
    }

    // 모달 외부 클릭 시 닫기
    if (projectModal) {
        projectModal.addEventListener('click', function(e) {
            if (e.target === projectModal) {
                closeProjectModal();
            }
        });
    }

    // 과제명이 비어있을 때 빨간색 테두리 표시
    setTimeout(() => {
        if (commonProject && !commonProject.value) {
            commonProject.style.borderColor = '#ef5350';
        }
    }, 500);
});
