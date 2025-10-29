// 연구비 증빙 - 출장+회의 통합 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    let selectedApprovers = [];
    let selectedFiles = [];
    let selectedEmployee = null;

    // DOM 요소
    const templateTreeHeaders = document.querySelectorAll('.tree-node-header[data-template]');
    const categoryNodes = document.querySelectorAll('.tree-node-header.category-node');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const documentForm = document.getElementById('documentForm');
    const addApproverBtn = document.getElementById('addApproverBtn');
    const approverChips = document.getElementById('approverChips');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const approverModal = document.getElementById('approverModal');
    const employeeList = document.getElementById('employeeList');
    const approverSearch = document.getElementById('approverSearch');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const submitBtn = document.getElementById('submitBtn');

    // 샘플 직원 데이터
    const employees = [
        { id: 1, name: '김철수', position: '전무', dept: '경영지원본부' },
        { id: 2, name: '박영희', position: '부장', dept: '경영지원본부 인사팀' },
        { id: 3, name: '이민수', position: '부장', dept: '경영지원본부 총무팀' },
        { id: 4, name: '장현우', position: '상무', dept: '개발본부' },
        { id: 5, name: '임지훈', position: '부장', dept: '개발본부 Frontend팀' },
        { id: 6, name: '한소희', position: '부장', dept: '개발본부 Backend팀' },
        { id: 7, name: '권민재', position: '상무', dept: '영업본부' },
        { id: 8, name: '유재석', position: '부장', dept: '영업본부 영업1팀' }
    ];

    // 직책 목록
    const positions = ['상무', '연구위원', '부장', '수석', '차장', '책임', '과장', '선임', '대리', '사원', '연구원'];

    // 전체 접기/열기 버튼
    let allExpanded = true;
    if (expandAllBtn) {
        expandAllBtn.addEventListener('click', function() {
            const treeNodes = document.querySelectorAll('.tree-node');

            if (allExpanded) {
                treeNodes.forEach(node => node.classList.remove('expanded'));
                this.innerHTML = '<i class="fas fa-plus-square"></i> 전체 펼치기';
                allExpanded = false;
            } else {
                treeNodes.forEach(node => node.classList.add('expanded'));
                this.innerHTML = '<i class="fas fa-minus-square"></i> 전체 접기';
                allExpanded = true;
            }
        });
    }

    // 카테고리 노드 토글
    categoryNodes.forEach(categoryNode => {
        categoryNode.addEventListener('click', function(e) {
            const treeNode = this.closest('.tree-node');
            treeNode.classList.toggle('expanded');
            updateExpandAllButton();
        });
    });

    // 전체 펼치기/접기 버튼 상태 업데이트
    function updateExpandAllButton() {
        if (!expandAllBtn) return;

        const treeNodes = document.querySelectorAll('.tree-node');
        const expandedNodes = document.querySelectorAll('.tree-node.expanded');

        if (expandedNodes.length === treeNodes.length) {
            expandAllBtn.innerHTML = '<i class="fas fa-minus-square"></i> 전체 접기';
            allExpanded = true;
        } else if (expandedNodes.length === 0) {
            expandAllBtn.innerHTML = '<i class="fas fa-plus-square"></i> 전체 펼치기';
            allExpanded = false;
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
        const addAttendeeBtn = document.getElementById('addAttendeeBtn');
        const removeAttendeeBtn = document.getElementById('removeAttendeeBtn');
        const attendeeList = document.getElementById('attendeeList');
        const dailyExpenseBody = document.getElementById('dailyExpenseBody');

        let dailyExpenses = [];
        let attendees = [];

        // 참석자 목록 업데이트 함수
        function updateAttendeeList() {
            attendeeList.innerHTML = '';
            attendees.forEach((attendee, index) => {
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;';

                const positionOptions = positions.map(pos =>
                    `<option value="${pos}" ${attendee.position === pos ? 'selected' : ''}>${pos}</option>`
                ).join('');

                row.innerHTML = `
                    <input type="checkbox" data-index="${index}" class="attendee-checkbox" style="width: 18px; height: 18px; cursor: pointer;">
                    <input type="text" data-index="${index}" class="attendee-dept" placeholder="부서명" value="${attendee.dept || ''}" style="flex: 1; padding: 5px;">
                    <select data-index="${index}" class="attendee-position" style="flex: 1; padding: 5px;">
                        <option value="">직책 선택</option>
                        ${positionOptions}
                    </select>
                    <input type="text" data-index="${index}" class="attendee-name" placeholder="성명" value="${attendee.name || ''}" style="flex: 1; padding: 5px;">
                    <label style="display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                        <input type="checkbox" data-index="${index}" class="attendee-external" ${attendee.isExternal ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                        외부
                    </label>
                `;
                attendeeList.appendChild(row);
            });

            // 이벤트 리스너 추가
            document.querySelectorAll('.attendee-dept, .attendee-position, .attendee-name').forEach(el => {
                el.addEventListener('input', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    if (this.classList.contains('attendee-dept')) {
                        attendees[index].dept = this.value;
                    } else if (this.classList.contains('attendee-position')) {
                        attendees[index].position = this.value;
                    } else if (this.classList.contains('attendee-name')) {
                        attendees[index].name = this.value;
                    }
                    updateAttendeeDisplay();
                });

                el.addEventListener('change', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    if (this.classList.contains('attendee-position')) {
                        attendees[index].position = this.value;
                        updateAttendeeDisplay();
                    }
                });
            });

            // 외부 체크박스 이벤트 리스너
            document.querySelectorAll('.attendee-external').forEach(el => {
                el.addEventListener('change', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    attendees[index].isExternal = this.checked;
                    updateAttendeeDisplay();
                });
            });

            updateAttendeeDisplay();
        }

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
            const authorText = commonAuthor ? commonAuthor.value : '홍길동';
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

        // 참석자 추가 버튼
        if (addAttendeeBtn) {
            addAttendeeBtn.addEventListener('click', function() {
                if (attendees.length >= 10) {
                    alert('최대 10명까지만 추가할 수 있습니다.');
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
                    alert('제거할 참석자를 선택해주세요.');
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

        // 초기 참석자 설정
        attendees = [
            { dept: '', position: '', name: '', isExternal: false }
        ];
        updateAttendeeList();

        // 초기 회의 관련 필드 설정 (작성자, 복명자 등)
        updateMeetingFields();
    }

    // 파일 업로드
    fileInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (selectedFiles.length >= 5) {
                alert('최대 5개까지만 첨부 가능합니다.');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                alert('파일 크기는 10MB를 초과할 수 없습니다.');
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
                alert('최대 5개까지만 첨부 가능합니다.');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                alert('파일 크기는 10MB를 초과할 수 없습니다.');
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

    // 임시저장
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', function() {
            alert('문서가 임시저장되었습니다.');
        });
    }

    // 제출
    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            if (selectedApprovers.length === 0) {
                alert('결재자를 지정해주세요.');
                return;
            }

            if (confirm('결재를 요청하시겠습니까?')) {
                alert('결재 요청이 완료되었습니다.');
                window.location.href = '/approval';
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
                console.log('PDF 저장 시작 - 출장+회의 통합 페이지');

                // 로딩 모달 표시
                if (loadingModal) loadingModal.classList.add('active');
                updateProgress(0, '준비 중...');

                if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
                    alert('PDF 라이브러리를 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
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

                if (allDivs.length < 5) {
                    alert('문서 구조를 찾을 수 없습니다. 영수증 처리(출장+회의) 템플릿을 선택했는지 확인해주세요.');
                    if (loadingModal) loadingModal.classList.remove('active');
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
                    alert('PDF가 저장되었습니다.');
                }, 500);
            } catch (error) {
                console.error('PDF 생성 오류:', error);
                if (loadingModal) loadingModal.classList.remove('active');
                alert('PDF 생성 중 오류가 발생했습니다.\n' + error.message + '\n\n브라우저 콘솔(F12)을 확인해주세요.');
            } finally {
                if (allDivs && originalDisplays.length > 0) {
                    allDivs.forEach((div, index) => {
                        div.style.display = originalDisplays[index];
                    });
                }
            }
        });
    }

    // 초기 템플릿 로드 (출장+회의)
    loadTemplate('receipt-trip');
});
