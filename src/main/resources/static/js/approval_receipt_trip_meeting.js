// 연구비 증빙 - 출장+회의 통합 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    let selectedApprovers = [];
    let selectedFiles = [];
    let selectedEmployee = null;
    let projects = []; // 프로젝트 목록

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
                    position: user.empPosition || '직급없음',
                    dept: user.empDept || '부서없음'
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

    // 직책 목록 (코드 테이블에서 가져와야 하지만 임시로 유지)
    // TODO: /api/codes/C02 API로 직급 목록 가져오기
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
                setupTripAutoFill();
                setupDocumentFormToggle();
            }
        }
    }

    // 출장+회의 자동 채우기 기능
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

        let dailyExpenses = [];
        let attendees = [];

        // 출장 인원 모달 초기화
        if (tripPersonArea) {
            tripPersonArea.addEventListener('click', function(e) {
                // 제거 버튼 클릭은 무시
                if (e.target.closest('.trip-person-remove')) {
                    return;
                }
                openTripPersonModal();
            });
        }

        // 회의 참석자 모달 초기화
        if (attendeeArea) {
            attendeeArea.addEventListener('click', function(e) {
                // 제거 버튼 클릭은 무시
                if (e.target.closest('.attendee-remove')) {
                    return;
                }
                openAttendeeModal();
            });
        }

        // 출장 인원 목록 렌더링 함수
        function renderTripPersonListInTemplate() {
            if (!tripPersonList) return;

            if (tripPersons.length === 0) {
                tripPersonList.innerHTML = `
                    <div style="text-align: center; color: #94a3b8; font-size: 13px;">
                        <i class="fas fa-user-plus" style="font-size: 20px; margin-bottom: 6px;"></i>
                        <div>클릭하여 출장 인원 추가</div>
                    </div>
                `;
            } else {
                tripPersonList.innerHTML = tripPersons.map(person => `
                    <div class="trip-person-item">
                        <div class="trip-person-info">
                            <span class="name">${person.name}</span>
                            <span>${person.dept}</span>
                            <span>${person.position}</span>
                        </div>
                        <button type="button" class="trip-person-remove" onclick="removeTripPersonInTemplate('${person.id}')">
                            <i class="fas fa-times"></i> 제거
                        </button>
                    </div>
                `).join('');
            }

            updateTripPersonDisplay();
        }

        // 템플릿 내에서 인원 제거
        window.removeTripPersonInTemplate = function(personId) {
            tripPersons = tripPersons.filter(p => p.id !== personId);
            renderTripPersonListInTemplate();
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
        };

        // 기존 버튼 방식은 제거됨 - 이제 모달 방식으로 작동

        // 회의 참석자 목록 렌더링 함수
        function renderAttendeeListInTemplate() {
            if (!attendeeList) return;

            if (attendees.length === 0) {
                attendeeList.innerHTML = `
                    <div style="text-align: center; color: #94a3b8; font-size: 13px;">
                        <i class="fas fa-user-plus" style="font-size: 20px; margin-bottom: 6px;"></i>
                        <div>클릭하여 회의 참석자 추가</div>
                    </div>
                `;
            } else {
                attendeeList.innerHTML = attendees.map(attendee => `
                    <div class="trip-person-item">
                        <div class="trip-person-info">
                            <span class="name">${attendee.name}</span>
                            <span>${attendee.dept}</span>
                            <span>${attendee.position}</span>
                        </div>
                        <button type="button" class="trip-person-remove attendee-remove" onclick="removeAttendeeInTemplate('${attendee.id}')">
                            <i class="fas fa-times"></i> 제거
                        </button>
                    </div>
                `).join('');
            }

            updateAttendeeDisplay();
        }

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
            // 내부 인원과 외부 인원 분리
            const internalAttendees = attendees.filter(a => a.name && a.name.trim() && !a.isExternal);
            const externalAttendees = attendees.filter(a => a.name && a.name.trim() && a.isExternal);

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
            let authorText = commonAuthor ? commonAuthor.value : '';
            if (!authorText && window.CURRENT_USER && window.CURRENT_USER.empName) {
                authorText = window.CURRENT_USER.empName;
            }
            if (!authorText) {
                console.warn('작성자 정보를 가져올 수 없습니다. 로그인 정보를 확인하세요.');
                authorText = '작성자 미지정';
            }
            document.querySelectorAll('.auto-author').forEach(field => {
                field.value = authorText;
                if (authorText === '작성자 미지정') {
                    field.style.color = '#d32f2f';
                }
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
                    meeting: 0,
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
                        <input type="number" class="expense-input" data-index="${i}" data-type="meeting"
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
            let totalMeeting = 0;
            let totalOther = 0;

            dailyExpenses.forEach(expense => {
                totalTransport += expense.transport;
                totalLodging += expense.lodging;
                totalMeal += expense.meal;
                totalMeeting += expense.meeting;
                totalOther += expense.other;
            });

            const grandTotal = totalTransport + totalLodging + totalMeal + totalMeeting + totalOther;

            // 합계 표시 (공통 입력칸)
            document.getElementById('totalTransport').textContent = totalTransport.toLocaleString();
            document.getElementById('totalLodging').textContent = totalLodging.toLocaleString();
            document.getElementById('totalMeal').textContent = totalMeal.toLocaleString();
            document.getElementById('totalMeeting').textContent = totalMeeting.toLocaleString();
            document.getElementById('totalOther').textContent = totalOther.toLocaleString();

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

                    // 회의비가 있을 경우 별도 행 추가
                    if (expense.meeting > 0) {
                        const meetingRow = document.createElement('tr');
                        meetingRow.innerHTML = `
                            <td style="text-align: center; padding: 10px;">${expense.date}</td>
                            <td style="text-align: center; padding: 10px;">0</td>
                            <td style="text-align: center; padding: 10px;">0</td>
                            <td style="text-align: center; padding: 10px;">0</td>
                            <td style="text-align: center; padding: 10px;">${expense.meeting.toLocaleString()}(회의비)</td>
                            <td style="text-align: center; padding: 10px;">${expense.meeting.toLocaleString()}</td>
                        `;
                        proposalExpenseBody.appendChild(meetingRow);
                    }
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

                    // 기타(일비) - 회의비 포함
                    const otherTotal = expense.other + expense.meeting;
                    let otherDisplay = '';
                    if (expense.meeting > 0 && expense.other > 0) {
                        otherDisplay = `${otherTotal.toLocaleString()}원 (회의비: ${expense.meeting.toLocaleString()}원)`;
                    } else if (expense.meeting > 0) {
                        otherDisplay = `${otherTotal.toLocaleString()}원 (회의비)`;
                    } else {
                        otherDisplay = `${otherTotal.toLocaleString()}원`;
                    }

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

        // 출장 기간 계산 함수
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
        }

        // 출장기간 자동 채우기 및 작성일/복명일자 계산
        // (이미 위에서 commonDate 이벤트 리스너 추가됨 - updateTripDateRange와 updateMeetingFields 모두 호출)

        // 출장 기간 셀렉트 박스 이벤트
        if (commonDuration) {
            commonDuration.addEventListener('change', function() {
                updateTripDateRange();
            });
        }

        // 출장목적 자동 채우기
        // (이미 위에서 commonPurpose 이벤트 리스너 추가됨 - updateMeetingFields 호출)

        // 복명자 초기값 설정 (작성자와 동일하게)
        // updateMeetingFields에서 자동으로 복명자도 업데이트됨

        // 회의 관련 입력 필드 이벤트 리스너
        if (commonMeetingContent) {
            commonMeetingContent.addEventListener('input', function() {
                updateMeetingFields();
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

        if (commonDate) {
            commonDate.addEventListener('input', function() {
                updateTripDateRange();
                updateMeetingFields();
            });
        }

        // 출장내용 및 결과 업데이트
        function updateTripResult() {
            // 내부 인원(외부 제외)에서 이름만 가져오기
            const internalAttendees = attendees.filter(a => a.name && a.name.trim() && !a.isExternal);
            const personNames = internalAttendees.map(a => a.name.trim());

            let resultText = '- 참석인원 :\n';

            if (personNames.length > 0) {
                resultText += `- ${personNames.join(', ')}(파인씨앤아이)`;
            }

            // textarea에 자동 생성된 내용 채우기 (사용자가 수정하지 않았을 때만)
            if (commonTripResult && !commonTripResult.dataset.userModified) {
                commonTripResult.value = resultText;
            }

            // 복명서의 출장내용 및 결과에 반영
            const displayText = commonTripResult ? commonTripResult.value : resultText;
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

        // 초기 회의 관련 필드 설정 (작성자, 복명자 등)
        updateMeetingFields();
    }

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

    // 결재자 모달 관련
    // 모달 열기
    window.openModal = function() {
        if (approverModal) {
            approverModal.classList.add('show');
            renderEmployeeList();
        }
    };

    // 모달 닫기
    window.closeModal = function() {
        if (approverModal) {
            approverModal.classList.remove('show');
            if (approverSearch) {
                approverSearch.value = '';
            }
        }
    };

    // 결재자 영역 클릭 시 모달 열기
    if (approverChips) {
        approverChips.addEventListener('click', function(e) {
            // 제거 버튼 클릭은 무시
            if (e.target.closest('.btn-remove-approver')) {
                return;
            }
            openModal();
        });
    }

    // 모달 외부 클릭 시 닫기
    if (approverModal) {
        approverModal.addEventListener('click', function(e) {
            if (e.target === approverModal) {
                closeModal();
            }
        });
    }

    // 직원 목록 렌더링
    function renderEmployeeList(searchText = '') {
        if (!employeeList) return;

        const filtered = employees.filter(emp => {
            const searchStr = (emp.name + emp.dept + emp.position).toLowerCase();
            return searchStr.includes(searchText.toLowerCase());
        });

        employeeList.innerHTML = filtered.map(emp => `
            <div class="employee-item" data-id="${emp.id}" onclick="selectEmployee(${emp.id})">
                <div class="employee-info">
                    <div class="employee-name">${emp.name}</div>
                    <div class="employee-detail">${emp.position} · ${emp.dept}</div>
                </div>
            </div>
        `).join('');
    }

    // 직원 선택
    window.selectEmployee = function(employeeId) {
        const items = document.querySelectorAll('.employee-item');
        items.forEach(item => {
            if (parseInt(item.getAttribute('data-id')) === employeeId) {
                item.classList.toggle('selected');
            }
        });
    };

    // 검색 기능
    if (approverSearch) {
        approverSearch.addEventListener('input', function(e) {
            renderEmployeeList(e.target.value);
        });
    }

    // 결재자 추가
    window.addApprover = function() {
        const selectedItems = document.querySelectorAll('.employee-item.selected');

        selectedItems.forEach(item => {
            const empId = parseInt(item.getAttribute('data-id'));
            const employee = employees.find(e => e.id === empId);

            if (employee && !selectedApprovers.some(a => a.id === empId)) {
                selectedApprovers.push(employee);
            }
        });

        renderApprovers();
        closeModal();
    };

    // 결재자 목록 렌더링
    function renderApprovers() {
        if (!approverChips) return;

        if (selectedApprovers.length === 0) {
            approverChips.innerHTML = `
                <div style="text-align: center; color: #94a3b8; font-size: 13px; width: 100%;">
                    <i class="fas fa-user-plus" style="font-size: 20px; margin-bottom: 6px; display: block;"></i>
                    <div>클릭하여 결재자 추가</div>
                </div>
            `;
        } else {
            approverChips.innerHTML = selectedApprovers.map((approver, index) => `
                <div class="approver-chip">
                    <span class="approver-order">${index + 1}</span>
                    <span class="approver-name">${approver.name}</span>
                    <span class="approver-position">${approver.position}</span>
                    <button class="btn-remove-approver" onclick="removeApprover(${approver.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }
    }

    // 결재자 제거
    window.removeApprover = function(approverId) {
        selectedApprovers = selectedApprovers.filter(a => a.id !== approverId);
        renderApprovers();
    };

    // 제출
    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            if (selectedApprovers.length === 0) {
                showWarning('결재자를 지정해주세요.');
                return;
            }

            if (await showConfirm('결재를 요청하시겠습니까?')) {
                showSuccess('결재 요청이 완료되었습니다.');
                popupAwareRedirect('/project/documents');
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
                console.log('PDF 저장 시작 - 출장+회의 통합 페이지');

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
                    showError('문서 구조를 찾을 수 없습니다. 영수증 처리(출장+회의) 템플릿을 선택했는지 확인해주세요.');
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
                const fileName = `${dateStr}_출장+회의.pdf`;

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

    // 출장 인원 목록 데이터 (결재자와 동일한 데이터 사용)
    const tripPersons2 = [
        { id: 1, name: '김철수', position: '전무', dept: '경영지원본부' },
        { id: 2, name: '박영희', position: '부장', dept: '경영지원본부 인사팀' },
        { id: 3, name: '이민수', position: '부장', dept: '경영지원본부 총무팀' },
        { id: 4, name: '최지원', position: '차장', dept: '경영지원본부 인사팀' },
        { id: 5, name: '정수연', position: '차장', dept: '경영지원본부 총무팀' },
        { id: 6, name: '강민호', position: '과장', dept: '경영지원본부 인사팀' },
        { id: 7, name: '윤서영', position: '과장', dept: '경영지원본부 총무팀' },
        { id: 8, name: '한동훈', position: '대리', dept: '경영지원본부 인사팀' },
        { id: 9, name: '임채린', position: '대리', dept: '경영지원본부 총무팀' },
        { id: 10, name: '송재현', position: '사원', dept: '경영지원본부 인사팀' }
    ];

    // 출장 인원 목록 렌더링
    function renderTripPersonList2(searchText = '') {
        const tripPersonList2El = document.getElementById('tripPersonList2');
        if (!tripPersonList2El) return;

        const filtered = tripPersons2.filter(person => {
            const searchStr = (person.name + person.dept + person.position).toLowerCase();
            return searchStr.includes(searchText.toLowerCase());
        });

        tripPersonList2El.innerHTML = filtered.map(person => `
            <div class="employee-item" data-id="${person.id}" onclick="selectTripPerson(${person.id})">
                <div class="employee-info">
                    <div class="employee-name">${person.name}</div>
                    <div class="employee-detail">${person.position} · ${person.dept}</div>
                </div>
            </div>
        `).join('');
    }

    // 출장 인원 선택
    window.selectTripPerson = function(personId) {
        const items = document.querySelectorAll('#tripPersonList2 .employee-item');
        items.forEach(item => {
            if (parseInt(item.getAttribute('data-id')) === personId) {
                item.classList.toggle('selected');
            }
        });
    };

    // 검색 기능
    if (personSearchInput) {
        personSearchInput.addEventListener('input', function(e) {
            renderTripPersonList2(e.target.value);
        });
    }

    // 선택된 인원 추가
    window.addSelectedPersons = function() {
        const selectedItems = document.querySelectorAll('#tripPersonList2 .employee-item.selected');
        const personsToAdd = [];

        selectedItems.forEach(item => {
            const personId = item.getAttribute('data-id');
            const person = tripPersons2.find(p => p.id === parseInt(personId));

            if (person) {
                personsToAdd.push({
                    id: personId,
                    name: person.name,
                    dept: person.dept,
                    position: person.position
                });
            }
        });

        // setupTripAutoFill에서 정의된 함수 호출
        if (window.addPersonsToTrip) {
            window.addPersonsToTrip(personsToAdd);
        }

        // 모달 닫기
        closeTripPersonModal();
    };

    // 회의 참석자 모달 관련
    const attendeeModal = document.getElementById('attendeeModal');
    const attendeeSearchInput = document.getElementById('attendeeSearchInput');

    // 회의 참석자 목록 데이터
    const attendeePersons = [
        { id: 1, name: '김철수', position: '전무', dept: '경영지원본부' },
        { id: 2, name: '박영희', position: '부장', dept: '경영지원본부 인사팀' },
        { id: 3, name: '이민수', position: '부장', dept: '경영지원본부 총무팀' },
        { id: 4, name: '최지원', position: '차장', dept: '경영지원본부 인사팀' },
        { id: 5, name: '정수연', position: '차장', dept: '경영지원본부 총무팀' },
        { id: 6, name: '강민호', position: '과장', dept: '경영지원본부 인사팀' },
        { id: 7, name: '윤서영', position: '과장', dept: '경영지원본부 총무팀' },
        { id: 8, name: '한동훈', position: '대리', dept: '경영지원본부 인사팀' },
        { id: 9, name: '임채린', position: '대리', dept: '경영지원본부 총무팀' },
        { id: 10, name: '송재현', position: '사원', dept: '경영지원본부 인사팀' }
    ];

    // 모달 열기 함수
    window.openAttendeeModal = function() {
        if (attendeeModal) {
            attendeeModal.classList.add('show');
            renderAttendeeList2();
        }
    };

    // 모달 닫기 함수
    window.closeAttendeeModal = function() {
        if (attendeeModal) {
            attendeeModal.classList.remove('show');
            // 검색 초기화
            if (attendeeSearchInput) {
                attendeeSearchInput.value = '';
                renderAttendeeList2('');
            }
            // 선택 초기화
            const selectedItems = document.querySelectorAll('#attendeeList2 .employee-item.selected');
            selectedItems.forEach(item => item.classList.remove('selected'));
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

    // 회의 참석자 목록 렌더링
    function renderAttendeeList2(searchText = '') {
        const attendeeList2El = document.getElementById('attendeeList2');
        if (!attendeeList2El) return;

        const filtered = attendeePersons.filter(person => {
            const searchStr = (person.name + person.dept + person.position).toLowerCase();
            return searchStr.includes(searchText.toLowerCase());
        });

        attendeeList2El.innerHTML = filtered.map(person => `
            <div class="employee-item" data-id="${person.id}" onclick="selectAttendee(${person.id})">
                <div class="employee-info">
                    <div class="employee-name">${person.name}</div>
                    <div class="employee-detail">${person.position} · ${person.dept}</div>
                </div>
            </div>
        `).join('');
    }

    // 회의 참석자 선택
    window.selectAttendee = function(personId) {
        const items = document.querySelectorAll('#attendeeList2 .employee-item');
        items.forEach(item => {
            if (parseInt(item.getAttribute('data-id')) === personId) {
                item.classList.toggle('selected');
            }
        });
    };

    // 검색 기능
    if (attendeeSearchInput) {
        attendeeSearchInput.addEventListener('input', function(e) {
            renderAttendeeList2(e.target.value);
        });
    }

    // 선택된 참석자 추가
    window.addSelectedAttendees = function() {
        const selectedItems = document.querySelectorAll('#attendeeList2 .employee-item.selected');
        const personsToAdd = [];

        selectedItems.forEach(item => {
            const personId = item.getAttribute('data-id');
            const person = attendeePersons.find(p => p.id === parseInt(personId));

            if (person) {
                personsToAdd.push({
                    id: personId,
                    name: person.name,
                    dept: person.dept,
                    position: person.position
                });
            }
        });

        // setupTripAutoFill에서 정의된 함수 호출
        if (window.addAttendeesToMeeting) {
            window.addAttendeesToMeeting(personsToAdd);
        }

        // 모달 닫기
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

    // 초기 템플릿 로드 (출장+회의)
    loadTemplate('receipt-trip');

    // 오늘 날짜 자동 설정
    setTimeout(() => {
        const commonDate = document.getElementById('common_date');
        if (commonDate && !commonDate.value) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            commonDate.value = `${yyyy}-${mm}-${dd}`;
            // 날짜 설정 후 자동 채우기 트리거
            commonDate.dispatchEvent(new Event('change'));
        }

        // 날짜 입력 필드 전체 영역 클릭 시 날짜 선택기 열기
        if (commonDate) {
            commonDate.addEventListener('click', function() {
                if (this.showPicker) {
                    this.showPicker();
                }
            });
        }
    }, 200);

    // ============================================
    // 프로젝트 선택 모달
    // ============================================
    const projectModal = document.getElementById('projectModal');
    const projectSearchInput = document.getElementById('projectSearchInput');
    const projectList = document.getElementById('projectList');
    const commonProject = document.getElementById('common_project');

    // 프로젝트 목록 렌더링
    function renderProjectList(projectsToShow, keyword = '') {
        if (!projectList) return;

        if (!projectsToShow || projectsToShow.length === 0) {
            projectList.innerHTML = '<div class="empty-state">프로젝트가 없습니다.</div>';
            return;
        }

        projectList.innerHTML = projectsToShow.map(proj => {
            const projectName = proj.projectName || '이름 없음';
            const leader = proj.projectLeader || '-';
            const startDate = proj.projectStartDate ? new Date(proj.projectStartDate).toLocaleDateString() : '-';
            const endDate = proj.projectEndDate ? new Date(proj.projectEndDate).toLocaleDateString() : '-';

            return `
                <div class="modal-item" onclick="selectProject(${proj.idx})">
                    <div class="item-main">
                        <strong>${projectName}</strong>
                    </div>
                    <div class="item-details">
                        <span><i class="fas fa-user"></i> ${leader}</span>
                        <span><i class="fas fa-calendar"></i> ${startDate} ~ ${endDate}</span>
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
            commonProject.style.borderColor = ''; // 빨간색 제거
        }

        const selectedProjectIdx = document.getElementById('selectedProjectIdx');
        if (selectedProjectIdx) {
            selectedProjectIdx.value = proj.idx;
        }

        // 자동 채우기
        document.querySelectorAll('.auto-project').forEach(field => {
            field.textContent = proj.projectName || '';
        });

        closeProjectModal();
    };

    // 프로젝트 모달 열기
    window.openProjectModal = function() {
        if (projectModal) {
            projectModal.classList.add('show');
            renderProjectList(projects);
            if (projectSearchInput) projectSearchInput.value = '';
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
            const keyword = this.value.trim().toLowerCase();
            if (!keyword) {
                renderProjectList(projects);
                return;
            }

            const filtered = projects.filter(proj =>
                (proj.projectName && proj.projectName.toLowerCase().includes(keyword)) ||
                (proj.projectLeader && proj.projectLeader.toLowerCase().includes(keyword))
            );

            renderProjectList(filtered, keyword);
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
