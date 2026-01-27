// 연구비 증빙 - 출장 페이지 JavaScript
document.addEventListener('DOMContentLoaded', async function() {
    // 전역 변수
    let selectedApprovers = [];
    let selectedFiles = [];
    let selectedEmployee = null;
    let currentUser = null; // 현재 로그인한 사용자
    let projects = []; // 프로젝트 목록
    let projectMembers = []; // 선택된 프로젝트의 팀원 목록
    let currentProject = null; // 현재 선택된 프로젝트 전체 정보
    window.currentTripPersons = []; // 현재 추가된 출장 인원 목록 (전역)

    // DOM 요소
    const templateTreeHeaders = document.querySelectorAll('.tree-node-header[data-template]');
    const categoryNodes = document.querySelectorAll('.tree-node-header.category-node');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const documentForm = document.getElementById('documentForm');
    const approverChips = document.getElementById('approverChips');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const approverModal = document.getElementById('approverModal');
    const employeeList = document.getElementById('employeeList');
    const approverSearch = document.getElementById('approverSearch');
    const submitBtn = document.getElementById('submitBtn');

    // 직원 데이터 (API로 로드)
    let employees = [];

    async function loadEmployees() {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const users = await response.json();
                employees = users.map(user => ({
                    id: user.idx,
                    name: user.empName,
                    position: user.empPositionName || user.empPosition || '직급 미지정',
                    dept: user.empDept || '부서 미지정'
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

    // 현재 사용자 정보 로드
    async function loadCurrentUser() {
        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                currentUser = await response.json();
                console.log('현재 사용자 정보:', currentUser);

                // 공통정보입력의 작성자 필드 채우기
                const tripReporter = document.getElementById('trip_reporter');
                if (tripReporter) {
                    tripReporter.value = currentUser.empName || '';
                }

                // 출장복명서의 복명자 필드 채우기
                document.querySelectorAll('.trip-auto-reporter').forEach(field => {
                    field.textContent = currentUser.empName || '';
                });
            } else {
                console.error('사용자 정보 로드 실패');
            }
        } catch (error) {
            console.error('사용자 정보 로드 오류:', error);
        }
    }

    // 프로젝트 목록 로드
    async function loadProjects() {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                projects = await response.json();
                console.log('프로젝트 목록 로드 성공:', projects.length + '건');

                // 프로젝트 셀렉트박스 채우기
                const projectSelect = document.getElementById('trip_project');
                if (projectSelect && projects.length > 0) {
                    projectSelect.innerHTML = '<option value="">과제를 선택하세요</option>' +
                        projects.map(project =>
                            `<option value="${project.idx}">${project.projectName}</option>`
                        ).join('');
                }
            } else {
                console.error('프로젝트 목록 로드 실패');
            }
        } catch (error) {
            console.error('프로젝트 목록 로드 오류:', error);
        }
    }

    // 프로젝트 팀원 목록 로드
    async function loadProjectMembers(projectIdx) {
        if (!projectIdx) {
            projectMembers = [];
            currentProject = null;
            return;
        }

        try {
            const response = await fetch(`/api/projects/${projectIdx}`);

            // Content-Type 확인
            const contentType = response.headers.get('content-type');

            if (response.ok && contentType && contentType.includes('application/json')) {
                const project = await response.json();
                projectMembers = project.projectMembers || [];
                currentProject = project; // 전체 프로젝트 정보 저장
                console.log('프로젝트 팀원 로드 성공:', projectMembers.length + '명');
                console.log('팀원 데이터:', projectMembers);
                console.log('프로젝트 정보:', currentProject);
            } else {
                console.error('프로젝트 팀원 로드 실패 - Status:', response.status, 'Content-Type:', contentType);
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    console.error('응답 내용 (처음 200자):', text.substring(0, 200));
                }
                projectMembers = [];
                currentProject = null;
            }
        } catch (error) {
            console.error('프로젝트 팀원 로드 오류:', error);
            projectMembers = [];
            currentProject = null;
        }
    }

    // 페이지 로드 시 데이터 로드
    Promise.all([loadCurrentUser(), loadProjects(), loadEmployees()]).then(() => {
        console.log('초기 데이터 로드 완료');
    });

    // 직책 목록
    const positions = ['상무', '연구위원', '부장', '수석', '차장', '책임', '과장', '선임', '대리', '사원', '연구원'];

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
                // DOM이 완전히 렌더링된 후 초기화 함수 호출
                setTimeout(() => {
                    setupTripAutoFill();
                    setupDocumentFormToggle();
                }, 0);
            }
        }
    }

    // 출장 자동 채우기 기능
    function setupTripAutoFill() {
        console.log('setupTripAutoFill 시작');

        const tripProject = document.getElementById('trip_project');
        const tripLocation = document.getElementById('trip_location');
        const tripDate = document.getElementById('trip_date');
        const tripDuration = document.getElementById('trip_duration');
        const tripPurpose = document.getElementById('trip_purpose');
        const tripReporter = document.getElementById('trip_reporter');
        const tripResult = document.getElementById('trip_result');
        const tripPersonArea = document.getElementById('tripPersonArea');
        const tripPersonList = document.getElementById('tripPersonList');
        const dailyExpenseBody = document.getElementById('dailyExpenseBody');

        console.log('엘리먼트 확인:');
        console.log('- tripDate:', tripDate);
        console.log('- tripDuration:', tripDuration);
        console.log('- dailyExpenseBody:', dailyExpenseBody);

        let tripPersons = [];
        let dailyExpenses = [];

        // 프로젝트 선택 시 팀원 로드 및 과제명 자동 채우기
        if (tripProject) {
            tripProject.addEventListener('change', async function() {
                const projectIdx = this.value;

                if (projectIdx) {
                    // 프로젝트 팀원 로드 (currentProject도 함께 저장됨)
                    await loadProjectMembers(projectIdx);
                    console.log('프로젝트 선택:', projectIdx, '팀원 수:', projectMembers.length);

                    // 과제명 자동 채우기 (currentProject에서 가져오기)
                    if (currentProject) {
                        document.querySelectorAll('.trip-auto-project').forEach(field => {
                            field.textContent = currentProject.projectName || '';
                        });

                        // 연구책임자명 자동 채우기
                        document.querySelectorAll('.trip-auto-pi').forEach(field => {
                            field.textContent = currentProject.projectManagerName || '';
                        });
                    }
                } else {
                    projectMembers = [];
                    currentProject = null;
                    // 과제명, 연구책임자명 초기화
                    document.querySelectorAll('.trip-auto-project').forEach(field => {
                        field.textContent = '';
                    });
                    document.querySelectorAll('.trip-auto-pi').forEach(field => {
                        field.textContent = '';
                    });
                }
            });
        }

        // 출장 인원 테이블 업데이트
        function updateTripPersonDisplay() {
            const personRows = document.querySelectorAll('.trip-person-row');

            // 모든 행의 첫 3개 셀 업데이트 (최대 5명까지 지원)
            personRows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                if (index < window.currentTripPersons.length) {
                    cells[0].textContent = window.currentTripPersons[index].dept || '';
                    cells[1].textContent = window.currentTripPersons[index].position || '';
                    cells[2].textContent = window.currentTripPersons[index].name || '';
                } else {
                    cells[0].textContent = '';
                    cells[1].textContent = '';
                    cells[2].textContent = '';
                }
            });

            // 출장내용 및 결과 업데이트
            updateTripResult();
        }

        // 출장인원 영역 클릭 시 모달 열기
        if (tripPersonArea) {
            tripPersonArea.addEventListener('click', function(e) {
                // 제거 버튼 클릭은 무시
                if (e.target.closest('.trip-person-remove')) {
                    return;
                }
                // 출장인원 항목이나 추가 버튼 클릭은 무시
                if (e.target.closest('.trip-person-item') || e.target.closest('.add-more-persons-btn')) {
                    return;
                }
                // 출장인원이 있을 경우 영역 클릭으로 모달 열지 않음
                if (window.currentTripPersons.length > 0) {
                    return;
                }
                openTripPersonModal();
            });
        }

        // 직급 순서 정의
        const positionOrder = {
            '대표이사': 1,
            '이사': 2,
            '수석연구원': 3,
            '책임연구원': 4,
            '선임연구원': 5,
            '연구원': 6,
            '주임연구원': 7,
            '사원': 8
        };

        // 출장인원 정렬 함수
        function sortTripPersons(persons) {
            return [...persons].sort((a, b) => {
                // 1. 내부/외부 구분 (내부 우선)
                const typeA = a.type || 'internal';
                const typeB = b.type || 'internal';

                if (typeA === 'internal' && typeB === 'external') return -1;
                if (typeA === 'external' && typeB === 'internal') return 1;

                // 2. 내부: 직급 순으로 정렬
                if (typeA === 'internal' && typeB === 'internal') {
                    const orderA = positionOrder[a.position] || 999;
                    const orderB = positionOrder[b.position] || 999;
                    return orderA - orderB;
                }

                // 3. 외부: 회사명 순, 같은 회사면 직급 순
                if (typeA === 'external' && typeB === 'external') {
                    const deptA = a.dept || '';
                    const deptB = b.dept || '';
                    if (deptA !== deptB) {
                        return deptA.localeCompare(deptB, 'ko');
                    }
                    const orderA = positionOrder[a.position] || 999;
                    const orderB = positionOrder[b.position] || 999;
                    return orderA - orderB;
                }

                return 0;
            });
        }

        // 출장인원 목록 렌더링 함수 (모달 방식)
        function renderTripPersonListInTemplate() {
            if (!tripPersonList) return;

            // tripPersonArea에 has-persons 클래스 추가/제거
            if (tripPersonArea) {
                if (window.currentTripPersons.length > 0) {
                    tripPersonArea.classList.add('has-persons');
                } else {
                    tripPersonArea.classList.remove('has-persons');
                }
            }

            if (window.currentTripPersons.length === 0) {
                tripPersonList.innerHTML = `
                    <div class="empty-attendee-state">
                        <i class="fas fa-user-plus"></i>
                        <div>클릭하여 출장인원 추가</div>
                    </div>
                `;
                hideAddPersonButton();
            } else {
                // 출장인원 정렬
                const sortedPersons = sortTripPersons(window.currentTripPersons);

                tripPersonList.innerHTML = sortedPersons.map(person => {
                    const externalBadge = person.type === 'external'
                        ? '<span class="external-badge">외부</span>'
                        : '';

                    const personClass = person.type === 'external'
                        ? 'trip-person-item external-person'
                        : 'trip-person-item';

                    return `
                        <div class="${personClass}" onclick="event.stopPropagation();">
                            <div class="trip-person-info">
                                <span class="name">${person.name}${externalBadge}</span>
                                <span>${person.dept}</span>
                                <span>${person.position}</span>
                            </div>
                            <button type="button" class="trip-person-remove" onclick="removeTripPersonInTemplate('${person.id}')">
                                <i class="fas fa-times"></i> 제거
                            </button>
                        </div>
                    `;
                }).join('');

                showAddPersonButton();
            }

            updateTripPersonDisplay();
        }

        // 출장인원 추가 버튼 표시
        function showAddPersonButton() {
            if (!tripPersonArea) return;

            let addButton = tripPersonArea.querySelector('.add-more-persons-btn');
            if (!addButton) {
                addButton = document.createElement('button');
                addButton.type = 'button';
                addButton.className = 'add-more-persons-btn';
                addButton.onclick = openTripPersonModal;
                addButton.innerHTML = '<i class="fas fa-user-plus"></i> 출장인원 추가';
                tripPersonArea.appendChild(addButton);
            }
            addButton.style.display = 'flex';
        }

        // 출장인원 추가 버튼 숨기기
        function hideAddPersonButton() {
            if (!tripPersonArea) return;

            const addButton = tripPersonArea.querySelector('.add-more-persons-btn');
            if (addButton) {
                addButton.style.display = 'none';
            }
        }

        // 템플릿 내에서 출장인원 제거
        window.removeTripPersonInTemplate = function(personId) {
            window.currentTripPersons = window.currentTripPersons.filter(p => p.id !== personId);
            renderTripPersonListInTemplate();

            // 모달이 열려있으면 모달도 업데이트
            const tripPersonModal = document.getElementById('tripPersonModal');
            if (tripPersonModal && tripPersonModal.classList.contains('show')) {
                renderTripPersonList2();
            }
        };

        // 전역 함수로 등록하여 모달에서 접근 가능하게
        window.addTripPersonsToTrip = function(persons) {
            persons.forEach(person => {
                if (!window.currentTripPersons.some(p => p.id === person.id)) {
                    window.currentTripPersons.push(person);
                }
            });
            renderTripPersonListInTemplate();
        };

        // 과제명 자동 채우기
        if (tripProject) {
            tripProject.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.trip-auto-project').forEach(field => {
                    field.textContent = value;
                });
            });
        }

        // 출장지 자동 채우기
        if (tripLocation) {
            tripLocation.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.trip-auto-location').forEach(field => {
                    field.textContent = value;
                });
            });
        }

        // 날짜별 비용 입력 행 생성 함수
        function generateDailyExpenseRows() {
            console.log('generateDailyExpenseRows 호출됨');
            console.log('tripDate:', tripDate);
            console.log('tripDate.value:', tripDate ? tripDate.value : 'tripDate 없음');
            console.log('dailyExpenseBody:', dailyExpenseBody);

            if (!tripDate || !tripDate.value || !dailyExpenseBody) {
                console.log('early return - 조건 불충족');
                return;
            }

            const startDate = new Date(tripDate.value);
            const duration = parseInt(tripDuration ? tripDuration.value : '0');
            const days = duration + 1; // 당일(0박) = 1일, 1박 = 2일

            console.log('날짜별 행 생성 시작 - days:', days);

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
                    <td style="text-align: center; background: white; font-weight: 500;">${dateStr}</td>
                    <td style="text-align: center;">
                        <input type="number" class="expense-input" data-index="${i}" data-type="transport"
                               placeholder="0" style="width: 100%; text-align: right; padding: 5px;" min="0">
                    </td>
                    <td style="text-align: center;">
                        <input type="number" class="expense-input" data-index="${i}" data-type="lodging"
                               placeholder="0" style="width: 100%; text-align: right; padding: 5px;" min="0">
                    </td>
                    <td style="text-align: center;">
                        <input type="number" class="expense-input" data-index="${i}" data-type="meal"
                               placeholder="0" style="width: 100%; text-align: right; padding: 5px;" min="0">
                    </td>
                    <td style="text-align: center;">
                        <input type="number" class="expense-input" data-index="${i}" data-type="other"
                               placeholder="0" style="width: 100%; text-align: right; padding: 5px;" min="0">
                    </td>
                `;
                dailyExpenseBody.appendChild(row);
            }

            // 입력 이벤트 리스너 추가
            document.querySelectorAll('.expense-input').forEach(input => {
                input.addEventListener('input', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    const type = this.getAttribute('data-type');
                    const value = parseInt(this.value) || 0;

                    dailyExpenses[index][type] = value;
                    updateTotalExpenses();
                });
            });

            updateTotalExpenses();
        }

        // 합계 업데이트 함수
        function updateTotalExpenses() {
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
            document.getElementById('totalTransport').textContent = totalTransport.toLocaleString();
            document.getElementById('totalLodging').textContent = totalLodging.toLocaleString();
            document.getElementById('totalMeal').textContent = totalMeal.toLocaleString();
            document.getElementById('totalOther').textContent = totalOther.toLocaleString();

            // 품의서 소요경비 내역에 날짜별 행 생성
            const proposalExpenseBody = document.getElementById('proposalExpenseBody');
            if (proposalExpenseBody) {
                proposalExpenseBody.innerHTML = '';
                dailyExpenses.forEach((expense, index) => {
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
                    const otherRow = document.createElement('tr');
                    otherRow.innerHTML = `
                        <td colspan="2" style="background: white; padding: 8px; text-align: center">기타(일비)</td>
                        <td style="text-align: center; padding: 8px;">${expense.other.toLocaleString()}원</td>
                    `;
                    reportExpenseBody.appendChild(otherRow);
                });
            }

            // 합계 금액 표시
            document.querySelectorAll('.trip-auto-grand-total').forEach(field => {
                field.textContent = grandTotal.toLocaleString();
            });
            document.querySelectorAll('.trip-auto-total').forEach(field => {
                field.textContent = grandTotal.toLocaleString();
            });
            document.querySelectorAll('.trip-auto-request-amount').forEach(field => {
                field.textContent = grandTotal.toLocaleString();
            });
        }

        // 출장 기간 계산 함수
        function updateTripDateRange() {
            console.log('updateTripDateRange 호출됨');
            if (!tripDate || !tripDate.value) {
                console.log('updateTripDateRange early return');
                return;
            }

            const startDate = new Date(tripDate.value);
            const duration = parseInt(tripDuration ? tripDuration.value : '0');

            const [year, month, day] = tripDate.value.split('-');

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
            document.querySelectorAll('.trip-auto-date').forEach(field => {
                field.textContent = dateRangeText;
            });

            // 출장복명서 출장기간
            document.querySelectorAll('.trip-auto-date-range').forEach(field => {
                field.textContent = dateRangeText;
            });

            // 소요경비내역 일시 (시작일만)
            const dateDotFormatted = `${year}.${month}.${day}`;
            document.querySelectorAll('.trip-auto-date-dot').forEach(field => {
                field.textContent = dateDotFormatted;
            });

            // 작성일 계산 (출장기간 -1일, 주말 제외)
            const tripDateObj = new Date(tripDate.value);
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

            document.querySelectorAll('.trip-auto-write-date').forEach(field => {
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

            document.querySelectorAll('.trip-auto-report-year').forEach(field => {
                field.textContent = reportYear;
            });
            document.querySelectorAll('.trip-auto-report-month').forEach(field => {
                field.textContent = reportMonth.replace(/^0/, '');
            });
            document.querySelectorAll('.trip-auto-report-day').forEach(field => {
                field.textContent = reportDay.replace(/^0/, '');
            });

            // 날짜별 비용 입력 테이블 생성
            generateDailyExpenseRows();
        }

        // 출장기간 자동 채우기 및 작성일/복명일자 계산
        if (tripDate) {
            console.log('tripDate 이벤트 리스너 추가');
            tripDate.addEventListener('change', function() {
                console.log('tripDate change 이벤트 발생');
                updateTripDateRange();
            });
        } else {
            console.log('tripDate 엘리먼트를 찾을 수 없음!');
        }

        // 출장 기간 셀렉트 박스 이벤트
        if (tripDuration) {
            console.log('tripDuration 이벤트 리스너 추가');
            tripDuration.addEventListener('change', function() {
                console.log('tripDuration change 이벤트 발생');
                updateTripDateRange();
            });
        } else {
            console.log('tripDuration 엘리먼트를 찾을 수 없음!');
        }

        // 출장목적 자동 채우기
        if (tripPurpose) {
            tripPurpose.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.trip-auto-purpose').forEach(field => {
                    field.textContent = value;
                });
            });
        }

        // 복명자 자동 채우기
        if (tripReporter) {
            tripReporter.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.trip-auto-reporter').forEach(field => {
                    field.textContent = value;
                });

                // 출장내용 및 결과에 자동 추가
                updateTripResult();
            });

            // 초기값 설정
            if (tripReporter.value) {
                document.querySelectorAll('.trip-auto-reporter').forEach(field => {
                    field.textContent = tripReporter.value;
                });
                updateTripResult();
            }
        }

        // 출장내용 및 결과 업데이트
        function updateTripResult() {
            // 출장인원에서 이름만 가져오기 (복명자는 제외)
            const personNames = window.currentTripPersons
                .filter(person => person.name && person.name.trim())
                .map(person => person.name.trim());

            let resultText = '- 참석인원 :\n';

            if (personNames.length > 0) {
                resultText += `- ${personNames.join(', ')}(파인씨앤아이)`;
            }

            // textarea에 자동 생성된 내용 채우기 (사용자가 수정하지 않았을 때만)
            if (tripResult && !tripResult.dataset.userModified) {
                tripResult.value = resultText;
            }

            // 복명서의 출장내용 및 결과에 반영
            const displayText = tripResult ? tripResult.value : resultText;
            document.querySelectorAll('.trip-auto-result').forEach(field => {
                field.textContent = displayText;
            });
        }

        // 사용자가 직접 수정하면 자동 업데이트 중지
        if (tripResult) {
            tripResult.addEventListener('input', function() {
                this.dataset.userModified = 'true';
                // 수정된 내용을 복명서에 바로 반영
                document.querySelectorAll('.trip-auto-result').forEach(field => {
                    field.textContent = this.value;
                });
            });
        }

        // 작성일 자동 채우기
        const today = new Date();
        const writeDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}.`;
        document.querySelectorAll('.trip-auto-write-date').forEach(field => {
            field.textContent = writeDate;
        });

        // 초기 인원 설정
        window.currentTripPersons = [];
        renderTripPersonListInTemplate();
    }

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

    // 결재자 영역 클릭 시 모달 열기
    if (approverChips) {
        approverChips.addEventListener('click', function(e) {
            // 제거 버튼 클릭은 무시
            if (e.target.closest('.btn-remove-approver')) {
                return;
            }
            loadEmployeeList();
            approverModal.classList.add('show');
        });
    }

    // 직원 목록 로드
    function loadEmployeeList() {
        employeeList.innerHTML = '';
        employees.forEach(emp => {
            const item = document.createElement('div');
            item.className = 'employee-item';
            item.innerHTML = `
                <i class="fas fa-user-circle"></i>
                <div class="employee-info">
                    <div class="employee-name">${emp.name}</div>
                    <div class="employee-detail">${emp.dept} ${emp.position}</div>
                </div>
            `;
            item.addEventListener('click', function() {
                document.querySelectorAll('.employee-item').forEach(i => i.classList.remove('selected'));
                this.classList.add('selected');
                selectedEmployee = emp;
            });
            employeeList.appendChild(item);
        });
    }

    // 직원 검색
    approverSearch.addEventListener('input', function() {
        const term = this.value.toLowerCase();
        document.querySelectorAll('.employee-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(term) ? '' : 'none';
        });
    });

    // 결재자 추가
    window.addApprover = function() {
        if (!selectedEmployee) {
            showWarning('결재자를 선택해주세요.');
            return;
        }

        if (selectedApprovers.find(a => a.id === selectedEmployee.id)) {
            showWarning('이미 추가된 결재자입니다.');
            return;
        }

        selectedApprovers.push(selectedEmployee);
        updateApproverChips();
        closeModal();
        selectedEmployee = null;
    };

    // 결재자 칩 업데이트
    function updateApproverChips() {
        if (selectedApprovers.length === 0) {
            approverChips.innerHTML = `
                <div style="text-align: center; color: #94a3b8; font-size: 13px; width: 100%;">
                    <i class="fas fa-user-plus" style="font-size: 20px; margin-bottom: 6px; display: block;"></i>
                    <div>클릭하여 결재자 추가</div>
                </div>
            `;
            return;
        }

        approverChips.innerHTML = '';
        selectedApprovers.forEach((approver, index) => {
            const chip = document.createElement('div');
            chip.className = 'approver-chip';
            chip.innerHTML = `
                <span class="order">${index + 1}</span>
                <span>${approver.name} ${approver.position}</span>
                <button class="btn-remove btn-remove-approver" onclick="removeApprover(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            approverChips.appendChild(chip);
        });
    }

    // 결재자 제거
    window.removeApprover = function(index) {
        selectedApprovers.splice(index, 1);
        updateApproverChips();
    };

    // 모달 닫기
    window.closeModal = function() {
        approverModal.classList.remove('show');
        approverSearch.value = '';
        loadEmployeeList();
    };

    // 파일 업로드
    fileInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (selectedFiles.length >= 5) {
                showWarning('최대 5개까지만 첨부 가능합니다.');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                showWarning('파일 크기는 10MB를 초과할 수 없습니다.');
                return;
            }
            selectedFiles.push(file);
        });
        updateFileList();
        fileInput.value = '';
    });

    // 드래그 앤 드롭
    fileUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = '#667eea';
        this.style.background = '#f5f7ff';
    });

    fileUploadArea.addEventListener('dragleave', function() {
        this.style.borderColor = '#ddd';
        this.style.background = 'white';
    });

    fileUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '#ddd';
        this.style.background = 'white';

        const files = Array.from(e.dataTransfer.files);
        files.forEach(file => {
            if (selectedFiles.length >= 5) {
                showWarning('최대 5개까지만 첨부 가능합니다.');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                showWarning('파일 크기는 10MB를 초과할 수 없습니다.');
                return;
            }
            selectedFiles.push(file);
        });
        updateFileList();
    });

    // 파일 목록 업데이트
    function updateFileList() {
        if (selectedFiles.length === 0) {
            fileList.innerHTML = '';
            return;
        }

        fileList.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';

            let icon = 'fa-file';
            if (file.name.match(/\.(jpg|jpeg|png|gif)$/i)) icon = 'fa-file-image';
            else if (file.name.match(/\.(pdf)$/i)) icon = 'fa-file-pdf';
            else if (file.name.match(/\.(doc|docx)$/i)) icon = 'fa-file-word';
            else if (file.name.match(/\.(xls|xlsx)$/i)) icon = 'fa-file-excel';

            item.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <button class="btn-remove-file" onclick="removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(item);
        });
    }

    // 파일 제거
    window.removeFile = function(index) {
        selectedFiles.splice(index, 1);
        updateFileList();
    };

    // 저장
    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            // 필수 필드 검증
            const projectSelect = document.getElementById('trip_project');
            const dateInput = document.getElementById('trip_date');
            const startTimeInput = document.getElementById('trip_start_time');
            const endTimeInput = document.getElementById('trip_end_time');
            const locationInput = document.getElementById('trip_location');

            if (!projectSelect || !projectSelect.value) {
                showWarning('프로젝트를 선택해주세요.');
                return;
            }

            if (!dateInput || !dateInput.value) {
                showWarning('출장 일자를 입력해주세요.');
                return;
            }

            // 시작/종료 시간은 선택사항 (HTML에 필드가 없을 수 있음)
            // if (!startTimeInput || !startTimeInput.value) {
            //     alert('시작 시간을 입력해주세요.');
            //     return;
            // }

            // if (!endTimeInput || !endTimeInput.value) {
            //     alert('종료 시간을 입력해주세요.');
            //     return;
            // }

            if (!locationInput || !locationInput.value) {
                showWarning('출장지를 입력해주세요.');
                return;
            }

            if (!(await showConfirm('출장 정보를 저장하시겠습니까?'))) {
                return;
            }

            // 참석자 목록 변환 (현재 페이지의 전역 변수 사용)
            const attendeeDTOs = (window.currentTripPersons || []).map((person, index) => {
                const isExternal = String(person.id).startsWith('ext_');
                return {
                    attendeeType: isExternal ? '외부' : '내부',
                    department: person.dept || null,
                    name: person.name,
                    userIdx: isExternal ? parseInt(String(person.id).replace('ext_', '')) : parseInt(person.id),
                    position: person.position || null,
                    displayOrder: index
                };
            });

            // 비용 합계 계산 (날짜별 비용에서)
            const expenseInputs = document.querySelectorAll('.expense-input');
            let totalTransportFee = 0;
            let totalAccommodationFee = 0;
            let totalMealFee = 0;
            let totalOtherFee = 0;

            expenseInputs.forEach(input => {
                const type = input.getAttribute('data-type');
                const value = parseFloat(input.value) || 0;

                if (type === 'transport') totalTransportFee += value;
                else if (type === 'lodging') totalAccommodationFee += value;
                else if (type === 'meal') totalMealFee += value;
                else if (type === 'other') totalOtherFee += value;
            });

            // 저장 데이터 생성
            const saveData = {
                projectIdx: parseInt(projectSelect.value),
                authorIdx: currentUser ? currentUser.idx : null,
                authorName: currentUser ? currentUser.empName : null,
                tripDate: dateInput.value,
                location: locationInput.value,
                transportationFee: totalTransportFee || null,
                accommodationFee: totalAccommodationFee || null,
                mealFee: totalMealFee || null,
                otherFee: totalOtherFee || null,
                purpose: document.getElementById('trip_purpose') ? document.getElementById('trip_purpose').value : null,
                content: document.getElementById('trip_result') ? document.getElementById('trip_result').value : null,
                paymentMethod: '카드로 결제',
                attendees: attendeeDTOs
            };

            console.log('저장 데이터:', saveData);

            try {
                const response = await fetch('/api/receipt-trips', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(saveData)
                });

                if (response.ok) {
                    const result = await response.json();
                    showSuccess('출장 정보가 저장되었습니다.');
                    console.log('저장 결과:', result);
                    // 저장 후 목록 페이지로 이동
                    window.location.href = '/project/documents';
                } else {
                    let errorMessage = '출장 저장에 실패했습니다.';
                    try {
                        const contentType = response.headers.get('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            const errorJson = await response.json();
                            if (errorJson.error) {
                                errorMessage += '\n\n에러 상세:\n' + errorJson.error;
                            }
                        } else {
                            const errorText = await response.text();
                            if (errorText) {
                                errorMessage += '\n\n에러 상세:\n' + errorText;
                            }
                        }
                    } catch (e) {
                        console.error('에러 메시지 파싱 실패:', e);
                    }
                    console.error('저장 실패:', response.status, errorMessage);
                    showError(errorMessage);
                }
            } catch (error) {
                console.error('저장 오류:', error);
                showError('출장 저장 중 오류가 발생했습니다.');
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
            const loadingModal = document.getElementById('pdfLoadingModal');
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');

            // 진행도 업데이트 함수
            function updateProgress(percent, message) {
                if (progressFill) progressFill.style.width = percent + '%';
                if (progressText) progressText.textContent = `${message} (${percent}%)`;
            }

            try {
                console.log('PDF 저장 시작 - 출장 페이지');

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

                allDivs = documentForm.querySelectorAll(':scope > div');
                console.log('찾은 div 개수:', allDivs.length);

                originalDisplays = Array.from(allDivs).map(div => div.style.display);

                if (allDivs.length < 3) {
                    showError('문서 구조를 찾을 수 없습니다. 영수증 처리(출장) 템플릿을 선택했는지 확인해주세요.');
                    if (loadingModal) loadingModal.classList.remove('active');
                    return;
                }

                updateProgress(30, '페이지 준비 중...');

                // 공통 정보 입력 영역 숨기고, 출장품의서와 출장복명서만 표시
                allDivs[0].style.display = 'none';
                allDivs[1].style.display = 'block';
                allDivs[2].style.display = 'block';

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

                updateProgress(40, '출장품의서 렌더링 중...');

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

                updateProgress(55, '출장품의서 이미지 변환 중...');

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

                updateProgress(70, '출장복명서 렌더링 중...');

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

                updateProgress(85, '출장복명서 이미지 변환 중...');

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

                updateProgress(95, 'PDF 파일 생성 중...');

                // 파일명 생성
                const dateInput = document.getElementById('trip_date');
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
                const fileName = `${dateStr}_출장.pdf`;

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
            }
        });
    }

    // 출장인원 모달 관련
    const tripPersonModal = document.getElementById('tripPersonModal');
    const tripPersonSearchInput = document.getElementById('tripPersonSearchInput');

    // 출장인원 목록 데이터 (직원 데이터와 동일하게 사용)
    // employees 배열을 직접 사용

    // 모달 열기 함수
    window.openTripPersonModal = function() {
        if (tripPersonModal) {
            tripPersonModal.classList.add('show');
            renderTripPersonList2();
        }
    };

    // 모달 닫기 함수
    window.closeTripPersonModal = function() {
        if (tripPersonModal) {
            tripPersonModal.classList.remove('show');
            // 검색 초기화
            if (tripPersonSearchInput) {
                tripPersonSearchInput.value = '';
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

    // 프로젝트 팀원 가져오기 (출장인원 선택용)
    function getTripPersons() {
        if (!projectMembers || projectMembers.length === 0) {
            return [];
        }

        return projectMembers.map(member => ({
            id: member.employeeIdx,
            name: member.employeeName,
            position: member.employeePositionName || '직급 미지정',
            dept: member.employeeDeptName || '부서 미지정'
        }));
    }

    // 출장인원 목록 렌더링
    function renderTripPersonList2(searchText = '') {
        const tripPersonList2El = document.getElementById('tripPersonList2');
        if (!tripPersonList2El) return;

        const tripPersons = getTripPersons(); // 프로젝트 팀원에서 가져오기

        if (tripPersons.length === 0) {
            tripPersonList2El.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">프로젝트를 선택하면 팀원 목록이 표시됩니다.</div>';
            return;
        }

        const filtered = tripPersons.filter(person => {
            const searchStr = (person.name + person.dept + person.position).toLowerCase();
            return searchStr.includes(searchText.toLowerCase());
        });

        tripPersonList2El.innerHTML = filtered.map(person => {
            // 이미 추가된 출장인원인지 확인
            const isAdded = window.currentTripPersons.some(p => String(p.id) === String(person.id));
            const addedClass = isAdded ? ' added' : '';
            const onclickAttr = isAdded ? '' : `onclick="selectTripPerson(${person.id})"`;

            return `
            <div class="employee-item${addedClass}" data-id="${person.id}" ${onclickAttr}>
                <div class="employee-info">
                    <div class="employee-name">${person.name}</div>
                    <div class="employee-detail">${person.position} · ${person.dept}</div>
                </div>
            </div>
        `;
        }).join('');
    }

    // 출장인원 선택
    window.selectTripPerson = function(personId) {
        const items = document.querySelectorAll('#tripPersonList2 .employee-item');
        items.forEach(item => {
            if (parseInt(item.getAttribute('data-id')) === personId) {
                // 이미 추가된 인원은 선택 불가
                if (item.classList.contains('added')) {
                    return;
                }
                item.classList.toggle('selected');
            }
        });
    };

    // 검색 기능
    if (tripPersonSearchInput) {
        tripPersonSearchInput.addEventListener('input', function(e) {
            renderTripPersonList2(e.target.value);
        });
    }

    // 선택된 출장인원 추가
    window.addSelectedTripPersons = function() {
        const selectedItems = document.querySelectorAll('#tripPersonList2 .employee-item.selected');

        if (selectedItems.length === 0) {
            showWarning('출장인원을 선택해주세요.');
            return;
        }

        const tripPersons = getTripPersons();
        const personsToAdd = [];

        selectedItems.forEach(item => {
            const personId = item.getAttribute('data-id');
            const person = tripPersons.find(p => String(p.id) === String(personId));

            if (person) {
                personsToAdd.push({
                    id: String(personId),
                    name: person.name,
                    dept: person.dept,
                    position: person.position
                });
            }
        });

        console.log('추가할 출장인원:', personsToAdd);

        // setupTripAutoFill에서 정의된 함수 호출
        if (window.addTripPersonsToTrip) {
            window.addTripPersonsToTrip(personsToAdd);
        }

        console.log('추가 후 currentTripPersons:', window.currentTripPersons);

        // 모달 목록 새로고침 (추가된 출장인원에 체크마크 표시)
        renderTripPersonList2();

        // 모달 닫기
        closeTripPersonModal();
    };

    // 초기 템플릿 로드 (출장)
    loadTemplate('receipt-trip');

    // 템플릿 전환 비활성화
    templateTreeHeaders.forEach(header => {
        header.style.pointerEvents = 'none';
    });

    // ============================================
    // 상세보기 모드: URL에서 ID 파라미터 확인 및 데이터 로드
    // ============================================
    function getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    async function loadReceiptTripData(id) {
        try {
            console.log('연구비증빙 출장 데이터 로드 시작 - ID:', id);
            const response = await fetch(`/api/receipt-trips/${id}`);

            if (!response.ok) {
                throw new Error(`데이터 로드 실패: ${response.status}`);
            }

            const data = await response.json();
            console.log('로드된 데이터:', data);

            // 폼에 데이터 채우기
            populateForm(data);

            // 저장 버튼 숨기기, 수정/삭제 버튼 표시 (상세보기 모드)
            if (submitBtn) {
                submitBtn.style.display = 'none';
            }
            const updateBtn = document.getElementById('updateBtn');
            const deleteBtn = document.getElementById('deleteBtn');
            if (updateBtn) {
                updateBtn.style.display = 'inline-block';
            }
            if (deleteBtn) {
                deleteBtn.style.display = 'inline-block';
            }

            return data;
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            showError('데이터를 불러오는데 실패했습니다.');
        }
    }

    function populateForm(data) {
        console.log('폼 데이터 채우기 시작');

        // 프로젝트 선택
        const projectSelect = document.getElementById('trip_project');
        if (projectSelect && data.projectIdx) {
            projectSelect.value = data.projectIdx;
            // 프로젝트 변경 이벤트 트리거 (프로젝트명 자동 채우기)
            const changeEvent = new Event('change');
            projectSelect.dispatchEvent(changeEvent);
        }

        // 출장 일자
        const tripDate = document.getElementById('trip_date');
        if (tripDate && data.tripDate) {
            tripDate.value = data.tripDate;
        }

        // 출장 기간 (duration)은 기본값 0박으로 설정
        const tripDuration = document.getElementById('trip_duration');
        if (tripDuration) {
            tripDuration.value = '0'; // 당일
        }

        // 출장지
        const tripLocation = document.getElementById('trip_location');
        if (tripLocation && data.location) {
            tripLocation.value = data.location;
        }

        // 출장 목적
        const tripPurpose = document.getElementById('trip_purpose');
        if (tripPurpose && data.purpose) {
            tripPurpose.value = data.purpose;
        }

        // 작성자
        const tripReporter = document.getElementById('trip_reporter');
        if (tripReporter && data.authorName) {
            tripReporter.value = data.authorName;
        }

        // 출장 내용 및 결과
        const tripResult = document.getElementById('trip_result');
        if (tripResult && data.content) {
            tripResult.value = data.content;
            tripResult.dataset.userModified = 'true'; // 자동 업데이트 방지
        }

        // 출장인원 로드
        if (data.attendees && data.attendees.length > 0) {
            window.currentTripPersons = data.attendees.map(attendee => {
                let position = attendee.position || '';
                let dept = attendee.department || '';

                // 내부 참석자인 경우
                if (attendee.attendeeType === '내부' && attendee.userIdx) {
                    dept = attendee.department || '파인씨앤아이';
                }

                // ID 생성: 외부는 ext_ 접두사, 내부는 userIdx
                const id = attendee.attendeeType === '외부'
                    ? `ext_${attendee.userIdx}`
                    : String(attendee.userIdx);

                return {
                    id: id,
                    name: attendee.name,
                    dept: dept,
                    position: position,
                    isExternal: attendee.attendeeType === '외부'
                };
            });

            console.log('로드된 출장인원:', window.currentTripPersons);
        }

        // 모든 input 이벤트 트리거하여 자동 채우기 활성화
        setTimeout(() => {
            // 날짜 자동 채우기
            if (tripDate) {
                tripDate.dispatchEvent(new Event('change'));
            }

            // 출장지 자동 채우기
            if (tripLocation) {
                tripLocation.dispatchEvent(new Event('input'));
            }

            // 출장 목적 자동 채우기
            if (tripPurpose) {
                tripPurpose.dispatchEvent(new Event('input'));
            }

            // 작성자 자동 채우기
            if (tripReporter) {
                tripReporter.dispatchEvent(new Event('input'));
            }

            // 출장 내용 및 결과 자동 채우기
            if (tripResult) {
                document.querySelectorAll('.trip-auto-result').forEach(field => {
                    field.textContent = tripResult.value;
                });
            }

            // 비용 데이터를 날짜별 입력 테이블의 첫 번째 행에 설정
            const dailyExpenseBody = document.getElementById('dailyExpenseBody');
            if (dailyExpenseBody && dailyExpenseBody.children.length > 0) {
                const firstRow = dailyExpenseBody.children[0];

                // 교통비
                const transportInput = firstRow.querySelector('[data-type="transport"]');
                if (transportInput && data.transportationFee) {
                    transportInput.value = data.transportationFee;
                    transportInput.dispatchEvent(new Event('input'));
                }

                // 숙박비
                const lodgingInput = firstRow.querySelector('[data-type="lodging"]');
                if (lodgingInput && data.accommodationFee) {
                    lodgingInput.value = data.accommodationFee;
                    lodgingInput.dispatchEvent(new Event('input'));
                }

                // 식비
                const mealInput = firstRow.querySelector('[data-type="meal"]');
                if (mealInput && data.mealFee) {
                    mealInput.value = data.mealFee;
                    mealInput.dispatchEvent(new Event('input'));
                }

                // 기타(일비)
                const otherInput = firstRow.querySelector('[data-type="other"]');
                if (otherInput && data.otherFee) {
                    otherInput.value = data.otherFee;
                    otherInput.dispatchEvent(new Event('input'));
                }
            }

            // 출장인원 목록 렌더링
            const tripPersonList = document.getElementById('tripPersonList');
            if (tripPersonList && window.currentTripPersons && window.currentTripPersons.length > 0) {
                tripPersonList.innerHTML = window.currentTripPersons.map(person => `
                    <div class="trip-person-item">
                        <div class="trip-person-info">
                            <span class="name">${person.name}</span>
                            <span>${person.dept}</span>
                            <span>${person.position || ''}</span>
                        </div>
                        <button type="button" class="trip-person-remove" onclick="removeTripPersonInTemplate('${person.id}')">
                            <i class="fas fa-times"></i> 제거
                        </button>
                    </div>
                `).join('');

                // 출장인원 테이블 업데이트 (공식 문서의 출장품의서)
                const personRows = document.querySelectorAll('.trip-person-row');
                personRows.forEach((row, index) => {
                    const cells = row.querySelectorAll('td');
                    if (index < window.currentTripPersons.length) {
                        cells[0].textContent = window.currentTripPersons[index].dept || '';
                        cells[1].textContent = window.currentTripPersons[index].position || '';
                        cells[2].textContent = window.currentTripPersons[index].name || '';
                    } else {
                        cells[0].textContent = '';
                        cells[1].textContent = '';
                        cells[2].textContent = '';
                    }
                });
            }

            console.log('폼 데이터 채우기 완료');
        }, 200);
    }

    // 오늘 날짜 자동 설정 (상세보기 모드가 아닐 때만)
    const receiptTripId = getUrlParameter('id');
    if (!receiptTripId) {
        setTimeout(() => {
            const tripDate = document.getElementById('trip_date');
            if (tripDate && !tripDate.value) {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                tripDate.value = `${yyyy}-${mm}-${dd}`;
                // 날짜 설정 후 자동 채우기 트리거
                tripDate.dispatchEvent(new Event('change'));
            }

            // 날짜 입력 필드 전체 영역 클릭 시 날짜 선택기 열기
            if (tripDate) {
                tripDate.addEventListener('click', function() {
                    if (this.showPicker) {
                        this.showPicker();
                    }
                });
            }
        }, 200);
    }

    // URL에 ID 파라미터가 있으면 데이터 로드
    if (receiptTripId) {
        console.log('상세보기 모드 - ID:', receiptTripId);
        setTimeout(async () => {
            await loadReceiptTripData(receiptTripId);
        }, 500);
    }

    // 수정 버튼 이벤트
    const updateBtn = document.getElementById('updateBtn');
    if (updateBtn) {
        updateBtn.addEventListener('click', async function() {
            const receiptTripId = getUrlParameter('id');
            if (!receiptTripId) {
                showError('문서 ID를 찾을 수 없습니다.');
                return;
            }

            const projectSelect = document.getElementById('trip_project');
            const dateInput = document.getElementById('trip_date');
            const locationInput = document.getElementById('trip_location');

            if (!projectSelect || !projectSelect.value) {
                showWarning('프로젝트를 선택해주세요.');
                return;
            }
            if (!dateInput || !dateInput.value) {
                showWarning('출장 일자를 입력해주세요.');
                return;
            }
            if (!locationInput || !locationInput.value) {
                showWarning('출장지를 입력해주세요.');
                return;
            }

            if (!(await showConfirm('출장 정보를 수정하시겠습니까?'))) {
                return;
            }

            // 참석자 목록 변환
            const attendeeDTOs = (window.currentTripPersons || []).map((person, index) => {
                const isExternal = String(person.id).startsWith('ext_');
                return {
                    attendeeType: isExternal ? '외부' : '내부',
                    department: person.dept || null,
                    name: person.name,
                    userIdx: isExternal ? parseInt(String(person.id).replace('ext_', '')) : parseInt(person.id),
                    position: person.position || null,
                    displayOrder: index
                };
            });

            // 비용 합계 계산
            const expenseInputs = document.querySelectorAll('.expense-input');
            let totalTransportFee = 0;
            let totalAccommodationFee = 0;
            let totalMealFee = 0;
            let totalOtherFee = 0;

            expenseInputs.forEach(input => {
                const type = input.getAttribute('data-type');
                const value = parseFloat(input.value) || 0;

                if (type === 'transport') totalTransportFee += value;
                else if (type === 'lodging') totalAccommodationFee += value;
                else if (type === 'meal') totalMealFee += value;
                else if (type === 'other') totalOtherFee += value;
            });

            const updateData = {
                projectIdx: parseInt(projectSelect.value),
                tripDate: dateInput.value,
                location: locationInput.value,
                transportationFee: totalTransportFee || null,
                accommodationFee: totalAccommodationFee || null,
                mealFee: totalMealFee || null,
                otherFee: totalOtherFee || null,
                purpose: document.getElementById('trip_purpose')?.value || null,
                content: document.getElementById('trip_result')?.value || null,
                paymentMethod: '카드로 결제',
                attendees: attendeeDTOs
            };

            try {
                const response = await fetch(`/api/receipt-trips/${receiptTripId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                });

                if (response.ok) {
                    showSuccess('출장 정보가 수정되었습니다.');
                    window.location.reload();
                } else {
                    showError('출장 수정에 실패했습니다.');
                }
            } catch (error) {
                console.error('수정 오류:', error);
                showError('출장 수정 중 오류가 발생했습니다.');
            }
        });
    }

    // 삭제 버튼 이벤트
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function() {
            const receiptTripId = getUrlParameter('id');
            if (!receiptTripId) {
                showError('문서 ID를 찾을 수 없습니다.');
                return;
            }

            if (!(await showDeleteConfirm('출장 정보'))) {
                return;
            }

            try {
                const response = await fetch(`/api/receipt-trips/${receiptTripId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    showSuccess('출장 정보가 삭제되었습니다.');
                    window.location.href = '/project/documents';
                } else {
                    showError('출장 삭제에 실패했습니다.');
                }
            } catch (error) {
                console.error('삭제 오류:', error);
                showError('출장 삭제 중 오류가 발생했습니다.');
            }
        });
    }
});
