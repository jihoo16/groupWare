// 문서 작성 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    let selectedApprovers = [];
    let selectedFiles = [];
    let selectedEmployee = null;
    let userVacationInfo = null; // 사용자 연차 정보 (API에서 가져옴)
    let requestedDates = []; // 이미 신청된 연차 날짜 목록 (YYYY-MM-DD 형식)
    let initialRequestedDates = []; // 서버에서 로드한 초기 신청 날짜 (수정 불가)

    // DOM 요소
    const documentForm = document.getElementById('documentForm');
    const addApproverBtn = document.getElementById('addApproverBtn');
    const approverChips = document.getElementById('approverChips');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const approverModal = document.getElementById('approverModal');
    const employeeList = document.getElementById('employeeList');
    const approverSearch = document.getElementById('approverSearch');
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

    // ============================================
    // 사용자 연차 정보 API 조회
    // ============================================

    /**
     * 현재 로그인한 사용자 정보를 가져옴 (전역 변수 CURRENT_USER 사용)
     * @returns {Object} 로그인한 사용자 정보
     */
    function getCurrentUser() {
        if (!window.CURRENT_USER || !window.CURRENT_USER.idx) {
            console.warn('세션 정보가 없습니다.');
            window.location.href = '/login';
            return null;
        }
        console.log('현재 로그인 사용자:', window.CURRENT_USER);
        return window.CURRENT_USER;
    }

    /**
     * 사용자 연차 정보를 서버에서 가져옴
     * @returns {Promise<Object>} 사용자 정보 + 연차 잔액 정보
     */
    async function fetchUserVacationInfo() {
        try {
            // 현재 로그인한 사용자 정보 가져오기
            const currentUser = await getCurrentUser();
            if (!currentUser || !currentUser.idx) {
                throw new Error('로그인 정보가 없습니다.');
            }

            // 현재 사용자의 연차 정보 조회
            const response = await fetch(`/api/vacation/user-info?userIdx=${currentUser.idx}`);
            if (!response.ok) {
                throw new Error('사용자 연차 정보를 가져오는데 실패했습니다.');
            }
            const data = await response.json();
            console.log('사용자 연차 정보 로드 완료:', data);
            return data;
        } catch (error) {
            console.error('사용자 연차 정보 조회 실패:', error);
            showError('사용자 정보를 불러오는데 실패했습니다. 다시 로그인해주세요.');
            // 로그인 페이지로 리다이렉트
            window.location.href = '/login';
            return null;
        }
    }

    /**
     * 사용자의 이미 신청된 연차 날짜 목록을 서버에서 가져옴
     * @returns {Promise<Array<string>>} 신청된 날짜 목록 (YYYY-MM-DD 형식)
     */
    async function fetchRequestedDates() {
        try {
            // 현재 로그인한 사용자 정보 가져오기
            const currentUser = await getCurrentUser();
            if (!currentUser || !currentUser.idx) {
                throw new Error('로그인 정보가 없습니다.');
            }

            // 현재 연도의 신청된 연차 날짜 조회
            const response = await fetch(`/api/vacation/requested-dates?userIdx=${currentUser.idx}&year=${currentYear}`);
            if (!response.ok) {
                throw new Error('신청된 연차 날짜를 가져오는데 실패했습니다.');
            }
            const dates = await response.json();
            console.log('신청된 연차 날짜 로드 완료:', dates.length + '건');
            return dates;
        } catch (error) {
            console.error('신청된 연차 날짜 조회 실패:', error);
            return []; // 실패 시 빈 배열 반환
        }
    }

    // 3영업일 후 날짜 계산 (주말만 제외)
    function getBusinessDaysLater(businessDays) {
        let date = new Date();
        let count = 0;
        let attempts = 0;
        const maxAttempts = 365; // 무한루프 방지

        while (count < businessDays && attempts < maxAttempts) {
            date.setDate(date.getDate() + 1);
            attempts++;

            const dayOfWeek = date.getDay();

            // 주말만 제외하고 카운트 (공휴일/이미신청된날짜는 나중에 체크)
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            if (!isWeekend) {
                count++;
            }
        }

        return date.toISOString().split('T')[0];
    }

    // 다음 신청 가능한 영업일 찾기 (주말, 공휴일, 이미 신청된 날짜 제외)
    function getNextAvailableBusinessDay(startDate, alreadyRequestedDates) {
        let date = new Date(startDate);
        const maxAttempts = 365; // 무한루프 방지 (최대 1년)
        let attempts = 0;

        // startDate의 다음날부터 검색
        date.setDate(date.getDate() + 1);

        while (attempts < maxAttempts) {
            const dateStr = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay();

            // 영업일 체크: 주말 아니고, 공휴일 아니고, 이미 신청된 날짜 아님
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = holidays[dateStr];
            const isAlreadyRequested = alreadyRequestedDates.includes(dateStr);

            if (!isWeekend && !isHoliday && !isAlreadyRequested) {
                return dateStr;
            }

            // 다음 날로 이동
            date.setDate(date.getDate() + 1);
            attempts++;
        }

        // 찾지 못한 경우 원래 날짜 반환
        return startDate;
    }

    // 연차신청서 기본 날짜 설정 (3영업일 후, 이미 신청된 날이면 다음 영업일)
    async function setupVacationDefaultDates() {
        // 공휴일 데이터 먼저 로드 (기본 날짜 계산에 필요)
        await ensureHolidaysLoaded(currentYear);
        // 다음 년도도 미리 로드 (연말일 경우 대비)
        await ensureHolidaysLoaded(currentYear + 1);

        console.log('[DEBUG] 기본 날짜 설정 시점 - holidays 객체:', holidays);
        console.log('[DEBUG] holidays 키 개수:', Object.keys(holidays).length);

        // 3영업일 후 날짜 계산 (주말만 제외)
        let defaultDate = getBusinessDaysLater(3);

        console.log('[DEBUG] 계산된 기본 날짜 (3영업일 후):', defaultDate);

        // 그 날짜가 공휴일이거나 이미 신청된 날짜라면 → 바로 다음 영업일로 이동
        const isHoliday = holidays[defaultDate];
        const isAlreadyRequested = requestedDates.includes(defaultDate);

        if (isHoliday || isAlreadyRequested) {
            const reason = isHoliday ? '공휴일' : '이미 신청됨';
            console.log(`[DEBUG] 3영업일 후 날짜(${defaultDate})가 ${reason}이므로 다음 영업일로 이동`);
            defaultDate = getNextAvailableBusinessDay(defaultDate, requestedDates);
            console.log('[DEBUG] 최종 기본 날짜:', defaultDate);
        }

        const startDateInput = document.getElementById('vif_start_date');
        const endDateInput = document.getElementById('vif_end_date');

        if (startDateInput && endDateInput) {
            // 달력을 해당 날짜의 년/월로 이동
            const dateObj = new Date(defaultDate);
            currentYear = dateObj.getFullYear();
            currentMonth = dateObj.getMonth();

            // 선택된 날짜 배열 업데이트
            selectedDates = [defaultDate];

            // 달력 UI 업데이트
            if (typeof renderCalendar === 'function') {
                renderCalendar();
            }

            // 날짜 표시 (formatDateWithDay 함수 사용)
            startDateInput.textContent = formatDateWithDay(defaultDate);
            endDateInput.textContent = formatDateWithDay(defaultDate);

            // 일수 계산 (마이너스 연차 체크 포함)
            if (typeof calculateVacationDays === 'function') {
                await calculateVacationDays();
            }

            console.log('기본 날짜 자동 설정 완료:', defaultDate);
        }
    }

    // 템플릿 로드 (제거된 트리 토글 기능)
    function loadTemplate(templateKey) {
        const templateElement = document.getElementById('template-' + templateKey);
        if (templateElement) {
            // HTML에서 템플릿을 복사
            documentForm.innerHTML = templateElement.innerHTML;

            // 오늘 날짜 자동 입력
            const today = new Date().toISOString().split('T')[0];
            const todayFields = documentForm.querySelectorAll('.auto-today');
            todayFields.forEach(field => {
                field.value = today;
            });

            // 현재 월 자동 입력
            const currentMonth = new Date().toISOString().slice(0, 7);
            const monthFields = documentForm.querySelectorAll('.auto-month');
            monthFields.forEach(field => {
                field.value = currentMonth;
            });

            // 영수증 처리 템플릿인 경우 자동 채우기 이벤트 리스너 추가
            if (templateKey === 'receipt-meeting' || templateKey === 'receipt-trip') {
                setupReceiptAutoFill();
            } else if (templateKey === 'receipt-overtime') {
                setupOvertimeAutoFill();
            }
        }
    }

    // 영수증 처리 자동 채우기 기능
    function setupReceiptAutoFill() {
        const commonProject = document.getElementById('common_project');
        const commonDate = document.getElementById('common_date');
        const commonStartTime = document.getElementById('common_start_time');
        const commonEndTime = document.getElementById('common_end_time');
        const commonLocation = document.getElementById('common_location');
        const commonAmount = document.getElementById('common_amount');
        const addAttendeeBtn = document.getElementById('addAttendeeBtn');
        const removeAttendeeBtn = document.getElementById('removeAttendeeBtn');
        const attendeeList = document.getElementById('attendeeList');

        let attendees = [];

        // 참석자 목록 업데이트 함수
        function updateAttendeeList() {
            attendeeList.innerHTML = '';
            attendees.forEach((attendee, index) => {
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;';
                row.innerHTML = `
                    <input type="checkbox" data-index="${index}" class="attendee-checkbox" style="width: 18px; height: 18px; cursor: pointer;">
                    <select data-index="${index}" class="attendee-type" style="padding: 5px; width: 80px;">
                        <option value="내부" ${attendee.type === '내부' ? 'selected' : ''}>내부</option>
                        <option value="외부" ${attendee.type === '외부' ? 'selected' : ''}>외부</option>
                    </select>
                    <input type="text" data-index="${index}" class="attendee-dept" placeholder="소속" value="${attendee.dept || ''}" style="flex: 2; padding: 5px;">
                    <input type="text" data-index="${index}" class="attendee-name" placeholder="성명" value="${attendee.name || ''}" style="flex: 1; padding: 5px;">
                `;
                attendeeList.appendChild(row);
            });

            // 이벤트 리스너 추가
            document.querySelectorAll('.attendee-type, .attendee-dept, .attendee-name').forEach(el => {
                el.addEventListener('input', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    if (this.classList.contains('attendee-type')) {
                        attendees[index].type = this.value;
                    } else if (this.classList.contains('attendee-dept')) {
                        attendees[index].dept = this.value;
                    } else if (this.classList.contains('attendee-name')) {
                        attendees[index].name = this.value;
                    }
                    updateProposalAttendees();
                    updateMeetingMinutesAttendees();
                });
            });

            // 참석자 타입 변경 이벤트 (내부 선택 시 소속 자동 입력)
            document.querySelectorAll('.attendee-type').forEach(el => {
                el.addEventListener('change', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    attendees[index].type = this.value;

                    // 내부 선택 시 소속을 "파인씨앤아이"로 자동 설정
                    if (this.value === '내부') {
                        attendees[index].dept = '파인씨앤아이';
                        // 해당 행의 소속 input 필드도 업데이트
                        const deptInput = document.querySelector(`.attendee-dept[data-index="${index}"]`);
                        if (deptInput) {
                            deptInput.value = '파인씨앤아이';
                        }
                    }

                    updateProposalAttendees();
                    updateMeetingMinutesAttendees();
                });
            });

            updateProposalAttendees();
            updateMeetingMinutesAttendees();
        }

        // 회의록 참석자 정보 업데이트
        function updateMeetingMinutesAttendees() {
            // 외부와 내부 참석자 분리
            const externalAttendees = {};
            const internalAttendees = [];

            attendees.forEach(attendee => {
                if (attendee.type === '외부' && attendee.name) {
                    if (!externalAttendees[attendee.dept]) {
                        externalAttendees[attendee.dept] = [];
                    }
                    externalAttendees[attendee.dept].push(attendee.name);
                } else if (attendee.type === '내부' && attendee.name) {
                    internalAttendees.push(attendee.name);
                }
            });

            // 전체 참석자 문자열 생성 (외부 먼저, 내부 나중)
            let allAttendeesText = '';

            // 외부 참석자 추가
            const externalOrgs = Object.keys(externalAttendees);
            if (externalOrgs.length > 0) {
                externalOrgs.forEach((org, index) => {
                    const names = externalAttendees[org];
                    allAttendeesText += names.map(name => `${name}(${org})`).join(', ');
                    if (index < externalOrgs.length - 1) {
                        allAttendeesText += ', ';
                    }
                });
            }

            // 내부 참석자 추가
            if (internalAttendees.length > 0) {
                if (allAttendeesText) {
                    allAttendeesText += '\n';  // 외부와 내부 사이 줄바꿈
                }
                allAttendeesText += internalAttendees.join(', ') + '(파인씨앤아이)';
            }

            // 참석자 칸에 표시
            document.querySelectorAll('.auto-all-attendees').forEach(field => {
                field.textContent = allAttendeesText;
            });

            // 참석자 명단 테이블 업데이트 (외부 먼저, 내부 나중)
            const orderedAttendees = [];

            // 외부 참석자 먼저 추가
            attendees.forEach(attendee => {
                if (attendee.type === '외부' && attendee.name) {
                    orderedAttendees.push({
                        name: attendee.name,
                        dept: attendee.dept
                    });
                }
            });

            // 내부 참석자 나중에 추가
            attendees.forEach(attendee => {
                if (attendee.type === '내부' && attendee.name) {
                    orderedAttendees.push({
                        name: attendee.name,
                        dept: attendee.dept
                    });
                }
            });

            // 참석자 명단 입력 필드에 채우기 (왼쪽 열 먼저, 오른쪽 열 나중)
            const nameFields = document.querySelectorAll('.attendee-sig-name');
            const deptFields = document.querySelectorAll('.attendee-sig-dept');

            // 총 필드 수 (20개)
            const totalFields = nameFields.length;
            const rowCount = totalFields / 2; // 10행

            // 먼저 모든 필드 초기화
            nameFields.forEach(field => field.value = '');
            deptFields.forEach(field => field.value = '');

            // 참석자를 왼쪽 열부터 채우기
            orderedAttendees.forEach((attendee, idx) => {
                let fieldIndex;
                if (idx < rowCount) {
                    // 왼쪽 열 (0, 2, 4, 6, 8, 10, 12, 14, 16, 18)
                    fieldIndex = idx * 2;
                } else {
                    // 오른쪽 열 (1, 3, 5, 7, 9, 11, 13, 15, 17, 19)
                    fieldIndex = (idx - rowCount) * 2 + 1;
                }

                if (nameFields[fieldIndex]) {
                    nameFields[fieldIndex].value = attendee.name;
                }
                if (deptFields[fieldIndex]) {
                    deptFields[fieldIndex].value = attendee.dept;
                }
            });
        }

        // 회의 품의서 참석인원 업데이트
        function updateProposalAttendees() {
            const meetingPurposeRow = document.getElementById('meeting_purpose_row');
            if (!meetingPurposeRow) return;

            // 회의 목적 셀과 헤더 찾기
            const meetingPurposeCell = document.querySelector('.meeting-purpose-cell');
            const meetingPurposeHeader = document.getElementById('meeting_purpose_header');

            // 기존 참석자 행들 제거
            const existingRows = document.querySelectorAll('.attendee-row');
            existingRows.forEach(row => row.remove());

            // 참석자를 타입과 소속별로 그룹화
            const grouped = {};
            attendees.forEach(attendee => {
                const key = `${attendee.type}_${attendee.dept}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        type: attendee.type,
                        dept: attendee.dept,
                        names: []
                    };
                }
                if (attendee.name) {
                    grouped[key].names.push(attendee.name);
                }
            });

            // 그룹화된 데이터를 배열로 변환
            const groupedArray = Object.values(grouped);

            // 참석자가 없으면 최소 2행 유지
            const minRows = 2;
            const rowsToAdd = Math.max(groupedArray.length, minRows);

            // 회의 목적 셀의 rowspan 업데이트 (헤더 행 포함 총 rowsToAdd + 1)
            const totalRowspan = rowsToAdd + 1;
            if (meetingPurposeCell) {
                meetingPurposeCell.setAttribute('rowspan', totalRowspan);
            }
            if (meetingPurposeHeader) {
                meetingPurposeHeader.setAttribute('rowspan', totalRowspan);
            }

            // 참석자 행 추가 (meeting_purpose_row 다음에 삽입)
            let insertAfter = meetingPurposeRow;
            for (let i = 0; i < rowsToAdd; i++) {
                const row = document.createElement('tr');
                row.className = 'attendee-row';

                if (i < groupedArray.length) {
                    // 그룹화된 참석자 데이터 표시
                    const group = groupedArray[i];
                    let nameDisplay = '';

                    if (group.names.length > 0) {
                        nameDisplay = group.names[0];
                        if (group.names.length > 1) {
                            nameDisplay += ` 외${group.names.length - 1}명`;
                        }
                    }

                    row.innerHTML = `
                        <td style="border: 1px solid #ddd; padding: 5px; text-align: center;">
                            <span>${group.type}</span>
                        </td>
                        <td style="border: 1px solid #ddd; padding: 5px; text-align: center;"><span>${group.dept || ''}</span></td>
                        <td style="border: 1px solid #ddd; padding: 5px; text-align: center;"><span>${nameDisplay}</span></td>
                    `;
                } else {
                    // 빈 행 추가
                    row.innerHTML = `
                        <td style="border: 1px solid #ddd; padding: 5px;">&nbsp;</td>
                        <td style="border: 1px solid #ddd; padding: 5px;">&nbsp;</td>
                        <td style="border: 1px solid #ddd; padding: 5px;">&nbsp;</td>
                    `;
                }

                // insertAfter 다음에 삽입하고, insertAfter 업데이트
                insertAfter.parentNode.insertBefore(row, insertAfter.nextSibling);
                insertAfter = row;
            }
        }

        // 참석자 추가 버튼
        if (addAttendeeBtn) {
            addAttendeeBtn.addEventListener('click', function() {
                attendees.push({ type: '내부', dept: '파인씨앤아이', name: '' });
                updateAttendeeList();
            });
        }

        // 참석자 제거 버튼 - 체크된 항목만 제거
        if (removeAttendeeBtn) {
            removeAttendeeBtn.addEventListener('click', function() {
                const checkboxes = document.querySelectorAll('.attendee-checkbox:checked');
                if (checkboxes.length === 0) {
                    showWarning('제거할 참석자를 선택해주세요.');
                    return;
                }

                // 체크된 인덱스를 역순으로 정렬하여 제거 (뒤에서부터 제거해야 인덱스 꼬임 방지)
                const indicesToRemove = Array.from(checkboxes)
                    .map(cb => parseInt(cb.getAttribute('data-index')))
                    .sort((a, b) => b - a);

                indicesToRemove.forEach(index => {
                    attendees.splice(index, 1);
                });

                updateAttendeeList();
            });
        }

        // 사용 금액 기반 자동 참석자 계산
        if (commonAmount) {
            commonAmount.addEventListener('input', function() {
                const amount = parseInt(this.value) || 0;

                if (amount > 0) {
                    // 1인당 30,000원 기준으로 인원 계산
                    const totalPeople = Math.ceil(amount / 30000);

                    // 외부 1명 + 내부 나머지
                    const externalCount = 1;
                    const internalCount = totalPeople - externalCount;

                    // 참석자 배열 초기화
                    attendees = [];

                    // 내부 인원 먼저 추가
                    for (let i = 0; i < internalCount; i++) {
                        attendees.push({ type: '내부', dept: '파인씨앤아이', name: '' });
                    }

                    // 외부 1명 추가
                    attendees.push({ type: '외부', dept: '', name: '' });

                    updateAttendeeList();
                }
            });
        }

        // 과제명 자동 채우기
        if (commonProject) {
            commonProject.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-project').forEach(field => {
                    field.value = value;
                });
            });
        }

        // 날짜/시간 자동 채우기
        function updateDateTime() {
            const dateValue = commonDate ? commonDate.value : '';
            const startTimeValue = commonStartTime ? commonStartTime.value : '';
            const endTimeValue = commonEndTime ? commonEndTime.value : '';

            if (dateValue) {
                // 날짜를 "YYYY.MM.DD." 형식으로 변환
                const [year, month, day] = dateValue.split('-');
                let formattedDate = `${year}.${month}.${day}.`;
                let formattedDateProposal = `${year}.${month}.${day}.`; // 회의 품의서용

                // 시작시간과 종료시간을 24시간 형태로 변환 (00:00~24:00)
                if (startTimeValue && endTimeValue) {
                    // 종료시간이 00:00이면 24:00으로 표시
                    const endTimeDisplay = endTimeValue === '00:00' ? '24:00' : endTimeValue;
                    formattedDate += ` ${startTimeValue}~${endTimeDisplay}`;
                    formattedDateProposal += `\n${startTimeValue} ~ ${endTimeDisplay}`; // 줄바꿈 + 공백
                } else if (startTimeValue) {
                    formattedDate += ` ${startTimeValue}`;
                    formattedDateProposal += `\n${startTimeValue}`;
                }

                // 일반 일시 필드에 입력 (회의록, 참석자 명단)
                document.querySelectorAll('.auto-datetime').forEach(field => {
                    field.value = formattedDate;
                });

                // 회의 품의서용 일시 필드에 입력 (줄바꿈 포함)
                document.querySelectorAll('.auto-datetime-proposal').forEach(field => {
                    field.textContent = formattedDateProposal;
                });

                // 회의 품의서 작성일 = 날짜 - 1일 (월요일이면 금요일로)
                const proposalDateElement = document.getElementById('proposal_date');
                if (proposalDateElement) {
                    const date = new Date(dateValue);
                    const dayOfWeek = date.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일

                    if (dayOfWeek === 1) {
                        // 월요일이면 3일 전(금요일)
                        date.setDate(date.getDate() - 3);
                    } else {
                        // 그 외에는 1일 전
                        date.setDate(date.getDate() - 1);
                    }

                    const propYear = date.getFullYear();
                    const propMonth = String(date.getMonth() + 1).padStart(2, '0');
                    const propDay = String(date.getDate()).padStart(2, '0');
                    proposalDateElement.textContent = `${propYear}년 ${propMonth}월 ${propDay}일`;
                }
            }
        }

        if (commonDate) {
            commonDate.addEventListener('input', updateDateTime);
        }
        if (commonStartTime) {
            commonStartTime.addEventListener('input', updateDateTime);
        }
        if (commonEndTime) {
            commonEndTime.addEventListener('input', updateDateTime);
        }

        // 장소 자동 채우기
        if (commonLocation) {
            commonLocation.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-location').forEach(field => {
                    field.value = value;
                });
            });
        }

        // 회의 목적 자동 채우기
        const commonPurpose = document.getElementById('common_purpose');
        if (commonPurpose) {
            commonPurpose.addEventListener('input', function() {
                const value = this.value;
                // 회의 품의서에 회의 목적 반영
                document.querySelectorAll('.auto-purpose').forEach(field => {
                    field.value = value;
                });
                // 회의록 주제에도 회의 목적 반영
                document.querySelectorAll('.auto-subject').forEach(field => {
                    field.textContent = value;
                });
            });
        }

        // 특기사항 자동 채우기
        const commonNotes = document.getElementById('common_notes');
        if (commonNotes) {
            commonNotes.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-notes').forEach(field => {
                    field.value = value;
                });
            });
        }

        // 주요 내용 자동 채우기
        const commonContent = document.getElementById('common_content');
        if (commonContent) {
            commonContent.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-content').forEach(field => {
                    field.textContent = value;
                });
            });
        }

        // 결제 방법 자동 채우기
        const commonPayment = document.getElementById('common_payment');
        if (commonPayment) {
            commonPayment.addEventListener('change', function() {
                const value = this.value;
                document.querySelectorAll('.auto-payment').forEach(field => {
                    field.value = value;
                });
            });
        }

        // 회의록 비고 자동 채우기
        const commonMinutesNotes = document.getElementById('common_minutes_notes');
        if (commonMinutesNotes) {
            commonMinutesNotes.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-minutes-notes').forEach(field => {
                    field.value = value;
                });
            });
        }

        // 사용 금액 표시 자동 채우기
        if (commonAmount) {
            commonAmount.addEventListener('input', function() {
                const amount = parseInt(this.value) || 0;

                // 회의비와 사용 금액 모두 30,000원 단위로 올림
                const roundedAmount = Math.ceil(amount / 30000) * 30000;
                const formattedRoundedAmount = roundedAmount.toLocaleString('ko-KR') + '원';

                document.querySelectorAll('.auto-amount-display, .auto-amount-display-2').forEach(field => {
                    field.textContent = formattedRoundedAmount;
                });
            });
        }

        // 날짜를 일시 표시로 자동 채우기 (연월일만)
        function updateDateTimeDisplay() {
            const dateValue = commonDate ? commonDate.value : '';

            if (dateValue) {
                const [year, month, day] = dateValue.split('-');
                const formattedDate = `${year}.${month}.${day}.`;

                document.querySelectorAll('.auto-datetime-display').forEach(field => {
                    field.textContent = formattedDate;
                });
            }
        }

        if (commonDate) {
            commonDate.addEventListener('input', updateDateTimeDisplay);
        }

        // 초기값 설정 함수
        function initializeDefaultValues() {
            if (commonLocation && commonLocation.value) {
                document.querySelectorAll('.auto-location').forEach(field => {
                    field.value = commonLocation.value;
                });
            }

            if (commonPayment) {
                document.querySelectorAll('.auto-payment').forEach(field => {
                    field.value = commonPayment.value;
                });
            }
        }

        // 페이지 로드 시 초기값 설정
        setTimeout(initializeDefaultValues, 100);

        // 초기화 - 빈 목록으로 시작 (금액 입력 시 자동 생성)
        updateAttendeeList();
    }

    // 야근식대 자동 채우기 기능
    function setupOvertimeAutoFill() {
        const otProject = document.getElementById('ot_project');
        const otManager = document.getElementById('ot_manager');
        const otApplicant = document.getElementById('ot_applicant');
        const otApprovalDate = document.getElementById('ot_approval_date');
        const otDate = document.getElementById('ot_date');
        const otTitle = document.getElementById('ot_title');
        const otAmount = document.getElementById('ot_amount');
        const otContent = document.getElementById('ot_content');
        const addOvertimePersonBtn = document.getElementById('addOvertimePersonBtn');
        const removeOvertimePersonBtn = document.getElementById('removeOvertimePersonBtn');
        const overtimePersonList = document.getElementById('overtimePersonList');

        let overtimePersons = [];

        // 야근 인원 목록 업데이트 함수
        function updateOvertimePersonList() {
            overtimePersonList.innerHTML = '';
            overtimePersons.forEach((person, index) => {
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;';
                row.innerHTML = `
                    <input type="checkbox" data-index="${index}" class="overtime-checkbox" style="width: 18px; height: 18px; cursor: pointer;">
                    <input type="text" data-index="${index}" class="overtime-name" placeholder="성명" value="${person.name || ''}" style="flex: 1; padding: 5px;">
                    <input type="time" data-index="${index}" class="overtime-time" placeholder="시간" value="${person.time || ''}" style="flex: 1; padding: 5px;">
                    <input type="text" data-index="${index}" class="overtime-task" placeholder="업무 내용" value="${person.task || ''}" style="flex: 2; padding: 5px;">
                `;
                overtimePersonList.appendChild(row);
            });

            // 이벤트 리스너 추가
            document.querySelectorAll('.overtime-name, .overtime-time, .overtime-task').forEach(el => {
                el.addEventListener('input', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    if (this.classList.contains('overtime-name')) {
                        overtimePersons[index].name = this.value;
                    } else if (this.classList.contains('overtime-time')) {
                        overtimePersons[index].time = this.value;
                    } else if (this.classList.contains('overtime-task')) {
                        overtimePersons[index].task = this.value;
                    }
                    updateOvertimeTable();
                    updateContentText();
                });
            });

            updateOvertimeTable();
            updateContentText();
        }

        // 야근 신청서 테이블 업데이트
        function updateOvertimeTable() {
            const personRows = document.querySelectorAll('.ot-person-row');

            personRows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                if (index < overtimePersons.length) {
                    const person = overtimePersons[index];
                    cells[1].textContent = person.name || '';
                    cells[2].textContent = person.time || '';
                    cells[3].textContent = person.task || '';
                } else {
                    cells[1].innerHTML = '&nbsp;';
                    cells[2].innerHTML = '&nbsp;';
                    cells[3].innerHTML = '&nbsp;';
                }
            });
        }

        // 품의 내용 텍스트 자동 업데이트
        function updateContentText() {
            if (!otContent) return;

            const names = overtimePersons
                .filter(p => p.name)
                .map(p => p.name)
                .join(', ');

            otContent.value = `야근식대\n- 인원 : ${names}`;
        }

        // 인원 추가 버튼
        if (addOvertimePersonBtn) {
            addOvertimePersonBtn.addEventListener('click', function() {
                overtimePersons.push({ name: '', time: '', task: '' });
                updateOvertimePersonList();
            });
        }

        // 인원 제거 버튼 - 체크된 항목만 제거
        if (removeOvertimePersonBtn) {
            removeOvertimePersonBtn.addEventListener('click', function() {
                const checkboxes = document.querySelectorAll('.overtime-checkbox:checked');
                if (checkboxes.length === 0) {
                    showWarning('제거할 인원을 선택해주세요.');
                    return;
                }

                // 체크된 인덱스를 역순으로 정렬하여 제거
                const indicesToRemove = Array.from(checkboxes)
                    .map(cb => parseInt(cb.getAttribute('data-index')))
                    .sort((a, b) => b - a);

                indicesToRemove.forEach(index => {
                    overtimePersons.splice(index, 1);
                });

                updateOvertimePersonList();
            });
        }

        // 금액 기반 자동 인원 계산 (1인당 63,900원)
        if (otAmount) {
            otAmount.addEventListener('input', function() {
                const amount = parseInt(this.value) || 0;

                if (amount > 0) {
                    const totalPeople = Math.round(amount / 63900);

                    // 인원 배열 초기화
                    overtimePersons = [];

                    for (let i = 0; i < totalPeople; i++) {
                        overtimePersons.push({ name: '', time: '18:00 ~ 20:30', task: '카프카 헬름 차트 UI 개발 확인' });
                    }

                    updateOvertimePersonList();
                }

                // 금액 자동 채우기
                updateAmountDisplay();
            });
        }

        // 과제명 자동 채우기
        if (otProject) {
            otProject.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.ot-auto-project').forEach(field => {
                    field.textContent = value;
                });
            });
        }

        // 연구책임자 자동 채우기
        if (otManager) {
            otManager.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.ot-auto-manager').forEach(field => {
                    field.textContent = value;
                });
            });
        }

        // 신청자 자동 채우기
        if (otApplicant) {
            otApplicant.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.ot-auto-applicant').forEach(field => {
                    field.textContent = value;
                });
            });
        }

        // 품의일자 자동 채우기
        if (otApprovalDate) {
            otApprovalDate.addEventListener('input', function() {
                const value = this.value;
                if (value) {
                    const [year, month, day] = value.split('-');
                    const formatted = `${year}년 ${month}월 ${day}일`;
                    document.querySelectorAll('.ot-auto-approval-date').forEach(field => {
                        field.textContent = formatted;
                    });
                }
            });
        }

        // 야근 일자 자동 채우기
        if (otDate) {
            otDate.addEventListener('input', function() {
                const value = this.value;
                if (value) {
                    const [year, month, day] = value.split('-');
                    const formatted = `${year}/${month}/${day}`;
                    document.querySelectorAll('.ot-auto-date').forEach(field => {
                        field.textContent = formatted;
                    });

                    // 전체 날짜 형식 (야근 신청서용)
                    const fullFormatted = `${year}. ${month}. ${day}`;
                    document.querySelectorAll('.ot-auto-date-full').forEach(field => {
                        field.textContent = fullFormatted;
                    });
                }
            });
        }

        // 품의명 자동 채우기
        if (otTitle) {
            otTitle.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.ot-auto-title').forEach(field => {
                    field.textContent = value;
                });
                // 적요에도 동일하게 입력
                document.querySelectorAll('.ot-auto-desc').forEach(field => {
                    field.textContent = value;
                });
            });

            // 초기값 설정
            if (otTitle.value) {
                document.querySelectorAll('.ot-auto-title').forEach(field => {
                    field.textContent = otTitle.value;
                });
                document.querySelectorAll('.ot-auto-desc').forEach(field => {
                    field.textContent = otTitle.value;
                });
            }
        }

        // 지급종류 자동 채우기
        const payTypeRadios = document.querySelectorAll('input[name="ot_pay_type"]');
        payTypeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    document.querySelectorAll('.ot-auto-pay-type').forEach(field => {
                        field.textContent = this.value;
                    });
                }
            });
        });

        // 초기 지급종류 설정
        const checkedRadio = document.querySelector('input[name="ot_pay_type"]:checked');
        if (checkedRadio) {
            document.querySelectorAll('.ot-auto-pay-type').forEach(field => {
                field.textContent = checkedRadio.value;
            });
        }

        // 금액 표시 업데이트
        function updateAmountDisplay() {
            const amount = parseInt(otAmount.value) || 0;
            const formattedAmount = amount.toLocaleString('ko-KR');

            document.querySelectorAll('.ot-auto-amount').forEach(field => {
                field.textContent = formattedAmount;
            });

            // 수량 = 인원 수
            const quantity = overtimePersons.length;
            document.querySelectorAll('.ot-auto-quantity').forEach(field => {
                field.textContent = quantity;
            });
        }

        // 초기화
        updateOvertimePersonList();
    }

    // 결재자 추가 버튼 (연차신청서에는 없음)
    if (addApproverBtn) {
        addApproverBtn.addEventListener('click', function() {
            loadEmployeeList();
            approverModal.classList.add('show');
        });
    }

    // 직원 목록 로드
    function loadEmployeeList() {
        if (!employeeList) return;

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
    if (approverSearch) {
        approverSearch.addEventListener('input', function() {
            const term = this.value.toLowerCase();
            document.querySelectorAll('.employee-item').forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(term) ? '' : 'none';
            });
        });
    }

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
        if (!approverChips) return;

        if (selectedApprovers.length === 0) {
            approverChips.innerHTML = '<div class="empty-message">결재자를 추가해주세요</div>';
            return;
        }

        approverChips.innerHTML = '';
        selectedApprovers.forEach((approver, index) => {
            const chip = document.createElement('div');
            chip.className = 'approver-chip';
            chip.innerHTML = `
                <span class="order">${index + 1}</span>
                <span>${approver.name} ${approver.position}</span>
                <button class="btn-remove" onclick="removeApprover(${index})">
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
        if (approverModal) {
            approverModal.classList.remove('show');
        }
        if (approverSearch) {
            approverSearch.value = '';
        }
        loadEmployeeList();
    };

    // 파일 업로드
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                if (selectedFiles.length >= 5) {
                    showAlert('최대 5개까지만 첨부 가능합니다.');
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
    }

    // 드래그 앤 드롭
    if (fileUploadArea) {
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
                showAlert('최대 5개까지만 첨부 가능합니다.');
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
    }

    // 파일 목록 업데이트
    function updateFileList() {
        if (!fileList) return;

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

    // 제출
    // ============================================
    // 렌더링된 HTML/CSS 수집 함수 (PDF 생성용)
    // ============================================
    function captureRenderedDocument() {
        // 문서 양식 영역의 HTML 가져오기
        const documentForm = document.querySelector('.document-form');
        if (!documentForm) {
            console.error('문서 양식을 찾을 수 없습니다.');
            return { html: '', css: '' };
        }

        // HTML 복사 및 정리
        const clonedForm = documentForm.cloneNode(true);

        // 불필요한 요소 제거 (편집 관련 요소 등)
        clonedForm.querySelectorAll('button, input[type="button"]').forEach(el => el.remove());

        const documentHtml = clonedForm.outerHTML;

        // CSS 수집 (approval_vacation.css만)
        let collectedCss = '';
        try {
            // 페이지의 모든 스타일시트 순회
            Array.from(document.styleSheets).forEach(sheet => {
                try {
                    // approval_vacation.css 파일만 선택
                    if (sheet.href && sheet.href.includes('approval_vacation.css')) {
                        const rules = Array.from(sheet.cssRules || sheet.rules);
                        rules.forEach(rule => {
                            collectedCss += rule.cssText + '\n';
                        });
                    }
                } catch (e) {
                    // CORS 에러 등으로 접근 불가능한 스타일시트는 무시
                    console.warn('스타일시트 접근 불가:', sheet.href, e);
                }
            });
        } catch (error) {
            console.error('CSS 수집 중 오류:', error);
        }

        return {
            html: documentHtml,
            css: collectedCss
        };
    }

    submitBtn.addEventListener('click', async function() {
        // 휴가기간 표시 영역 확인
        const vacationPeriodDisplay = document.getElementById('vacation_period_display');
        if (!vacationPeriodDisplay || !vacationPeriodDisplay.innerHTML.trim()) {
            showWarning('휴가 기간을 추가해주세요.');
            return;
        }

        // 연차 신청 데이터 수집
        const reasonInput = document.getElementById('vif_reason');
        const minusCheckbox = document.getElementById('allow_minus_vacation');
        const specialReasonTextarea = document.getElementById('special_approval_reason');
        const etcAddToCalendarCheckbox = document.getElementById('etc_add_to_calendar');
        const vacationType = vifVacationType ? vifVacationType.value : '';

        // 사유 필수 검증 (모든 연차 유형)
        const reason = reasonInput ? reasonInput.value.trim() : '';
        if (!reason) {
            let errorMessage = '휴가 신청 사유를 입력해주세요.';
            if (vacationType === '기타') {
                errorMessage = '기타 휴가는 사유를 반드시 입력해야 합니다.\n\n무급/유급 여부와 휴가 사유를 구체적으로 작성해주세요.\n\n예시: "09~11시 무급휴가 - 통원 치료 등"';
            }
            await showError(errorMessage);
            // 사유 입력 필드로 포커스 이동
            if (reasonInput) {
                reasonInput.focus();
                reasonInput.style.border = '2px solid #ff5252';
                setTimeout(() => {
                    reasonInput.style.border = '';
                }, 2000);
            }
            return;
        }

        // 사유 병합 (마이너스 연차일 경우 특별 사유 포함)
        let fullReason = reasonInput ? reasonInput.value : '';
        if (minusCheckbox && minusCheckbox.checked && specialReasonTextarea && specialReasonTextarea.value.trim()) {
            fullReason = `${fullReason}\n\n[마이너스연차 특별 요청 사유]\n${specialReasonTextarea.value.trim()}`;
        }

        // 렌더링된 문서 HTML/CSS 캡처
        const { html, css } = captureRenderedDocument();

        const saveData = {
            reason: fullReason,  // 특별 사유가 병합된 전체 사유
            allowMinusVacation: minusCheckbox ? minusCheckbox.checked : false,
            specialApprovalReason: specialReasonTextarea ? specialReasonTextarea.value : '',
            etcAddToCalendar: (vacationType === '기타' && etcAddToCalendarCheckbox) ? etcAddToCalendarCheckbox.checked : false,  // 기타 유형일 때만 캘린더 등록 여부
            periods: vacationPeriods.map(period => ({
                vacationType: period.type,  // type -> vacationType 매핑
                startDate: period.startDate,
                endDate: period.endDate,
                days: period.days
            })),
            renderedHtml: html,
            renderedCss: css
        };

        // 저장 확인 메시지
        const confirmResult = await Swal.fire({
            icon: 'warning',
            title: '연차신청서 저장',
            html: '신청서는 <strong>PDF 파일로 저장</strong>되며,<br>저장 후에는 <strong>문서 내용을 수정할 수 없습니다.</strong><br><br>수정을 원하실 경우 삭제 후 재생성해야 합니다.<br><br>저장하시겠습니까?',
            showCancelButton: true,
            confirmButtonText: '저장',
            cancelButtonText: '취소',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33'
        });

        // 취소를 누른 경우 종료
        if (!confirmResult.isConfirmed) {
            return;
        }

        // 로딩 표시
        Swal.fire({
            title: '저장 중...',
            html: '연차 신청서를 저장하고 있습니다.',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const response = await fetch('/api/vacation/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(saveData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // 성공 메시지 표시
                await Swal.fire({
                    icon: 'success',
                    title: '저장 완료',
                    text: '연차 신청서가 저장되었습니다.',
                    timer: 2000,
                    timerProgressBar: true,
                    showConfirmButton: true,
                    confirmButtonText: '확인'
                });
                window.location.href = '/approval';
            } else {
                // 서버에서 온 사용자 친화적인 에러 메시지 표시
                Swal.close();
                showError(result.message || '연차 신청서 저장에 실패했습니다.\n잠시 후 다시 시도해주세요.');
            }
        } catch (error) {
            // 네트워크 오류 등 예상치 못한 에러
            console.error('연차 신청서 저장 중 오류:', error);
            Swal.close();
            showError('네트워크 오류가 발생했습니다.\n인터넷 연결을 확인하고 다시 시도해주세요.');
        }
    });

    // 인쇄 버튼 이벤트
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            // 휴가 기간이 추가되었는지 확인
            if (vacationPeriods.length === 0) {
                showWarning('휴가 기간을 먼저 추가해주세요.');
                return;
            }

            // 문서가 접혀있으면 펼치기
            const documentFormWrapper = document.querySelector('.document-form-wrapper');
            const documentFormToggle = document.getElementById('documentFormToggle');
            const wasCollapsed = documentFormWrapper && documentFormWrapper.classList.contains('collapsed');

            if (wasCollapsed) {
                documentFormWrapper.classList.remove('collapsed');
                if (documentFormToggle) {
                    documentFormToggle.classList.add('active');
                }
            }

            // 인쇄 실행
            window.print();

            // 인쇄 후 원래 상태로 되돌리기 (사용자가 접어놨던 경우)
            if (wasCollapsed) {
                // 인쇄 다이얼로그가 닫힌 후 실행되도록 약간의 지연
                setTimeout(() => {
                    documentFormWrapper.classList.add('collapsed');
                    if (documentFormToggle) {
                        documentFormToggle.classList.remove('active');
                    }
                }, 100);
            }
        });
    }


    loadTemplate('vacation');

    // ============================================
    // 경조사 섹션 토글 기능
    // ============================================
    document.addEventListener('click', function(e) {
        if (e.target.closest('.gyeongjo-toggle')) {
            const toggle = e.target.closest('.gyeongjo-toggle');
            const targetId = toggle.dataset.target;
            const itemsContainer = document.getElementById(targetId);

            if (itemsContainer) {
                toggle.classList.toggle('collapsed');
                itemsContainer.classList.toggle('collapsed');
            }
        }
    });

    // ============================================
    // 연차 신청 인터랙티브 폼 기능
    // ============================================

    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const calendarTitle = document.getElementById('calendarTitle');
    const calendarDays = document.getElementById('calendarDays');
    const vifStartDate = document.getElementById('vif_start_date');
    const vifEndDate = document.getElementById('vif_end_date');
    const vifCalculatedDays = document.getElementById('vif_calculated_days');
    const vifVacationType = document.getElementById('vif_vacation_type');
    const resetSelectionBtn = document.getElementById('resetSelectionBtn');

    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth();
    let selectedDates = [];
    let selectionMode = null; // 'start' or 'range'

    // 공휴일 데이터 (API에서 로드)
    let holidays = {}; // 공휴일 데이터 (년도별 캐시)
    let loadedYears = new Set(); // 로드된 년도 추적

    // 여러 기간 관리
    let vacationPeriods = []; // 추가된 휴가 기간 목록
    let currentSelectionDays = 0; // 현재 선택 중인 기간의 일수

    // 영업일 구간으로 분리하는 함수
    function splitIntoBusinessDayPeriods(startDate, endDate, vacationType, paidType = null, reason = null) {
        const periods = [];
        let currentPeriodStart = null;
        let currentPeriodEnd = null;
        let currentDays = 0;

        const start = new Date(startDate);
        const end = new Date(endDate);

        // 반차는 분리하지 않음
        if (vacationType.includes('반차')) {
            return [{
                type: vacationType,
                startDate: startDate,
                endDate: endDate,
                days: 0.5,
                startDateFormatted: formatDateDisplay(new Date(startDate)),
                endDateFormatted: formatDateDisplay(new Date(endDate)),
                paidType: paidType,
                reason: reason
            }];
        }

        // 기타는 전체 기간을 하나로 반환 (영업일 계산)
        if (vacationType === '기타') {
            let businessDays = 0;
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = formatDate(d);
                const dayOfWeek = d.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isHoliday = holidays[dateStr];
                if (!isWeekend && !isHoliday) {
                    businessDays++;
                }
            }
            return [{
                type: vacationType,
                startDate: startDate,
                endDate: endDate,
                days: businessDays,
                startDateFormatted: formatDateDisplay(new Date(startDate)),
                endDateFormatted: formatDateDisplay(new Date(endDate)),
                paidType: paidType,
                reason: reason
            }];
        }

        // 경조사 (배우자출산 제외)는 전체 기간을 하나로 반환 (공휴일/주말 포함)
        if (vacationType.includes('경조사') && !vacationType.includes('배우자출산')) {
            const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
            return [{
                type: vacationType,
                startDate: startDate,
                endDate: endDate,
                days: totalDays,
                startDateFormatted: formatDateDisplay(new Date(startDate)),
                endDateFormatted: formatDateDisplay(new Date(endDate)),
                paidType: paidType,
                reason: reason
            }];
        }

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = formatDate(d);
            const dayOfWeek = d.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = holidays[dateStr];
            const isAlreadyRequested = requestedDates.includes(dateStr);

            if (!isWeekend && !isHoliday && !isAlreadyRequested) {
                // 영업일 (주말, 공휴일, 이미 신청한 날짜 제외)
                if (!currentPeriodStart) {
                    currentPeriodStart = new Date(d);
                }
                currentPeriodEnd = new Date(d);
                currentDays++;
            } else {
                // 주말, 공휴일, 또는 이미 신청한 날짜 - 현재 구간 저장
                if (currentPeriodStart && currentDays > 0) {
                    periods.push({
                        type: vacationType,
                        startDate: formatDate(currentPeriodStart),
                        endDate: formatDate(currentPeriodEnd),
                        days: currentDays,
                        startDateFormatted: formatDateDisplay(currentPeriodStart),
                        endDateFormatted: formatDateDisplay(currentPeriodEnd),
                        paidType: paidType,
                        reason: reason
                    });
                    currentPeriodStart = null;
                    currentPeriodEnd = null;
                    currentDays = 0;
                }
            }
        }

        // 마지막 구간 저장
        if (currentPeriodStart && currentDays > 0) {
            periods.push({
                type: vacationType,
                startDate: formatDate(currentPeriodStart),
                endDate: formatDate(currentPeriodEnd),
                days: currentDays,
                startDateFormatted: formatDateDisplay(currentPeriodStart),
                endDateFormatted: formatDateDisplay(currentPeriodEnd),
                paidType: paidType,
                reason: reason
            });
        }

        return periods;
    }

    // 날짜를 표시 형식으로 포맷 (YYYY.MM.DD)
    function formatDateDisplay(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    }

    // 날짜를 "YYYY.MM.DD (요일)" 형식으로 변환
    function formatDateWithDay(dateStr) {
        const date = new Date(dateStr);
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dayName = dayNames[date.getDay()];
        return `${year}.${month}.${day} (${dayName})`;
    }

    // "YYYY.MM.DD (요일)" 형식을 "YYYY-MM-DD"로 역변환
    function parseDateFromDisplay(displayStr) {
        if (!displayStr || displayStr === '-') return null;
        // "2025.01.15 (수)" -> "2025-01-15"
        const dateOnly = displayStr.split(' ')[0]; // "2025.01.15"
        return dateOnly.replace(/\./g, '-'); // "2025-01-15"
    }

    // 특정 년도 공휴일 데이터 로드
    async function loadHolidaysByYear(year) {
        try {
            const response = await fetch(`/api/holidays?year=${year}`);
            if (!response.ok) {
                throw new Error(`${year}년 공휴일 데이터를 불러오는데 실패했습니다.`);
            }

            const yearHolidays = await response.json();
            console.log(`[Vacation] ${year}년 공휴일 로드 완료:`, Object.keys(yearHolidays).length, '건');
            return yearHolidays;
        } catch (error) {
            console.error(`[Vacation] ${year}년 공휴일 로드 실패:`, error);
            return {};
        }
    }

    // 특정 년도 공휴일 보장 (없으면 로드)
    async function ensureHolidaysLoaded(year) {
        if (!loadedYears.has(year)) {
            const yearHolidays = await loadHolidaysByYear(year);
            Object.assign(holidays, yearHolidays); // 기존 holidays 객체에 병합
            loadedYears.add(year);
            console.log(`[Vacation] ${year}년 공휴일 캐시 추가`);
        }
    }

    // 날짜가 추가된 기간에 포함되는지 체크
    function isDateInAddedPeriods(dateStr) {
        const checkDate = new Date(dateStr);
        checkDate.setHours(0, 0, 0, 0);

        for (let period of vacationPeriods) {
            const startDate = new Date(period.startDate);
            const endDate = new Date(period.endDate);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            if (checkDate >= startDate && checkDate <= endDate) {
                return true;
            }
        }
        return false;
    }

    // 날짜의 휴가 타입 가져오기
    function getDateVacationType(dateStr) {
        const checkDate = new Date(dateStr);
        checkDate.setHours(0, 0, 0, 0);

        for (let period of vacationPeriods) {
            const startDate = new Date(period.startDate);
            const endDate = new Date(period.endDate);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            if (checkDate >= startDate && checkDate <= endDate) {
                return period.type;
            }
        }
        return null;
    }

    // 날짜가 마이너스 연차에 해당하는지 체크
    function isDateInMinusPeriod(dateStr) {
        const remainingVacation = userVacationInfo ? parseFloat(userVacationInfo.remainingDays) : 12;

        // 모든 기간을 날짜순으로 정렬
        const sortedPeriods = [...vacationPeriods].sort((a, b) => {
            return new Date(a.startDate) - new Date(b.startDate);
        });

        let accumulatedDays = 0;
        const checkDate = new Date(dateStr);
        checkDate.setHours(0, 0, 0, 0);

        // 각 기간을 순회하면서 누적 일수 계산
        for (let period of sortedPeriods) {
            const startDate = new Date(period.startDate);
            const endDate = new Date(period.endDate);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            // 체크하는 날짜가 이 기간에 포함되는지 확인
            if (checkDate >= startDate && checkDate <= endDate) {
                // 이 기간의 시작 시점의 누적 일수
                const periodStartAccumulated = accumulatedDays;

                // 이 기간 내에서 체크 날짜까지의 일수 계산
                const daysUntilCheck = Math.floor((checkDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                const accumulatedAtCheck = periodStartAccumulated + daysUntilCheck;

                // 누적 일수가 잔여 연차를 초과하면 마이너스 연차
                return accumulatedAtCheck > remainingVacation;
            }

            // 다음 기간으로 넘어가기 전에 누적 일수 업데이트
            accumulatedDays += period.days;
        }

        return false;
    }

    // 경조휴가 기간인지 확인하는 함수
    function isDateInGyeongjosaPeriod(dateStr) {
        const checkDate = new Date(dateStr);
        checkDate.setHours(0, 0, 0, 0);

        for (let period of vacationPeriods) {
            // 경조사 기간인지 확인
            if (period.type && period.type.includes('경조사')) {
                const startDate = new Date(period.startDate);
                const endDate = new Date(period.endDate);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                // 체크하는 날짜가 이 기간에 포함되는지 확인
                if (checkDate >= startDate && checkDate <= endDate) {
                    return true;
                }
            }
        }

        return false;
    }

    // 달력 렌더링
    async function renderCalendar() {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const prevLastDay = new Date(currentYear, currentMonth, 0);

        // 이전달, 현재달, 다음달의 년도 공휴일 로드 (다른 년도일 수 있음)
        const prevMonthYear = new Date(currentYear, currentMonth - 1, 1).getFullYear();
        const nextMonthYear = new Date(currentYear, currentMonth + 1, 1).getFullYear();

        await Promise.all([
            ensureHolidaysLoaded(prevMonthYear),
            ensureHolidaysLoaded(currentYear),
            ensureHolidaysLoaded(nextMonthYear)
        ]);

        const firstDayOfWeek = firstDay.getDay();
        const lastDate = lastDay.getDate();
        const prevLastDate = prevLastDay.getDate();

        calendarTitle.textContent = `${currentYear}년 ${currentMonth + 1}월`;
        calendarDays.innerHTML = '';

        console.log('[DEBUG] 달력 렌더링 - holidays 객체:', holidays);
        console.log('[DEBUG] 달력 렌더링 - holidays 키 샘플:', Object.keys(holidays).slice(0, 10));

        // 이전 달 날짜
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = prevLastDate - i;
            const prevMonthDate = new Date(currentYear, currentMonth - 1, day);
            const dateStr = formatDate(prevMonthDate);
            const dayOfWeek = prevMonthDate.getDay();

            let classes = 'other-month';

            // 공휴일 체크
            if (dayOfWeek === 0) classes += ' sunday';
            if (dayOfWeek === 6) classes += ' saturday';
            if (holidays[dateStr]) {
                classes += ' holiday';
            }

            if (isDateInAddedPeriods(dateStr)) {
                classes += ' period-added';
                const vacationType = getDateVacationType(dateStr);
                if (vacationType === '반차(오전)') {
                    classes += ' half-day-am';
                } else if (vacationType === '반차(오후)') {
                    classes += ' half-day-pm';
                } else {
                    // 연차(전일)인 경우만 체크 마크 표시
                    classes += ' full-day';
                }
                // 경조휴가 기간인지 확인 (파란색)
                if (isDateInGyeongjosaPeriod(dateStr)) {
                    classes += ' gyeongjosa-period';
                }
                // 마이너스 연차 기간인지 확인 (빨간색)
                else if (isDateInMinusPeriod(dateStr)) {
                    classes += ' minus-period';
                }
            }
            if (isDateSelected(dateStr)) classes += ' selected';
            if (isDateInRange(dateStr)) classes += ' in-range';
            if (selectedDates.length > 0 && dateStr === selectedDates[0]) classes += ' range-start';
            if (selectedDates.length > 1 && dateStr === selectedDates[selectedDates.length - 1]) classes += ' range-end';

            const dayEl = createDayElement(day, classes, dateStr);
            calendarDays.appendChild(dayEl);
        }

        // 현재 달 날짜
        let holidayCount = 0;
        // 이번 달에 있어야 할 공휴일 찾기
        const expectedHolidays = Object.keys(holidays).filter(key => {
            const [year, month] = key.split('-');
            return parseInt(year) === currentYear && parseInt(month) === (currentMonth + 1);
        });
        console.log(`[DEBUG] 이번 달(${currentYear}-${currentMonth + 1}) 예상 공휴일:`, expectedHolidays);

        for (let day = 1; day <= lastDate; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const dateStr = formatDate(date);
            const dayOfWeek = date.getDay();

            // 1월 1일~4일은 특별히 디버깅
            if (currentMonth === 0 && day <= 4) {
                console.log(`[DEBUG] ${day}일 체크:`, {
                    dateStr: dateStr,
                    'holidays[dateStr]': holidays[dateStr],
                    'dateStr in holidays': (dateStr in holidays),
                    'holidays 키 타입': typeof Object.keys(holidays)[0],
                    'dateStr 타입': typeof dateStr
                });
            }

            let classes = '';

            // 오늘보다 이전 날짜인지 확인 (시각적 효과용)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const currentDate = new Date(date);
            currentDate.setHours(0, 0, 0, 0);
            if (currentDate < today) {
                classes += ' past-date';
            }

            if (isToday(date)) classes += ' today';
            if (dayOfWeek === 0) classes += ' sunday';
            if (dayOfWeek === 6) classes += ' saturday';
            if (holidays[dateStr]) {
                classes += ' holiday';
                holidayCount++;
                console.log(`[DEBUG] ✓ 공휴일 발견: ${dateStr} = ${holidays[dateStr]}`);
            }

            // 이미 신청된 연차 날짜 체크
            if (requestedDates.includes(dateStr)) {
                classes += ' already-requested';
            }

            if (isDateInAddedPeriods(dateStr)) {
                classes += ' period-added';
                const vacationType = getDateVacationType(dateStr);
                if (vacationType === '반차(오전)') {
                    classes += ' half-day-am';
                } else if (vacationType === '반차(오후)') {
                    classes += ' half-day-pm';
                } else {
                    // 연차(전일)인 경우만 체크 마크 표시
                    classes += ' full-day';
                }
                // 경조휴가 기간인지 확인 (파란색)
                if (isDateInGyeongjosaPeriod(dateStr)) {
                    classes += ' gyeongjosa-period';
                }
                // 마이너스 연차 기간인지 확인 (빨간색)
                else if (isDateInMinusPeriod(dateStr)) {
                    classes += ' minus-period';
                }
            }
            if (isDateSelected(dateStr)) classes += ' selected';
            if (isDateInRange(dateStr)) classes += ' in-range';
            if (selectedDates.length > 0 && dateStr === selectedDates[0]) classes += ' range-start';
            if (selectedDates.length > 1 && dateStr === selectedDates[selectedDates.length - 1]) classes += ' range-end';

            const dayEl = createDayElement(day, classes, dateStr);
            calendarDays.appendChild(dayEl);
        }

        console.log(`[DEBUG] 이번 달 공휴일 수: ${holidayCount} / 예상: ${expectedHolidays.length}`);


        // 다음 달 날짜
        const remainingCells = 42 - calendarDays.children.length;
        for (let day = 1; day <= remainingCells; day++) {
            const nextMonthDate = new Date(currentYear, currentMonth + 1, day);
            const dateStr = formatDate(nextMonthDate);
            const dayOfWeek = nextMonthDate.getDay();

            let classes = 'other-month';

            // 공휴일 체크
            if (dayOfWeek === 0) classes += ' sunday';
            if (dayOfWeek === 6) classes += ' saturday';
            if (holidays[dateStr]) {
                classes += ' holiday';
            }

            if (isDateInAddedPeriods(dateStr)) {
                classes += ' period-added';
                const vacationType = getDateVacationType(dateStr);
                if (vacationType === '반차(오전)') {
                    classes += ' half-day-am';
                } else if (vacationType === '반차(오후)') {
                    classes += ' half-day-pm';
                } else {
                    // 연차(전일)인 경우만 체크 마크 표시
                    classes += ' full-day';
                }
                // 경조휴가 기간인지 확인 (파란색)
                if (isDateInGyeongjosaPeriod(dateStr)) {
                    classes += ' gyeongjosa-period';
                }
                // 마이너스 연차 기간인지 확인 (빨간색)
                else if (isDateInMinusPeriod(dateStr)) {
                    classes += ' minus-period';
                }
            }
            if (isDateSelected(dateStr)) classes += ' selected';
            if (isDateInRange(dateStr)) classes += ' in-range';
            if (selectedDates.length > 0 && dateStr === selectedDates[0]) classes += ' range-start';
            if (selectedDates.length > 1 && dateStr === selectedDates[selectedDates.length - 1]) classes += ' range-end';

            const dayEl = createDayElement(day, classes, dateStr);
            calendarDays.appendChild(dayEl);
        }
    }

    // 날짜 요소 생성
    function createDayElement(day, classes, dateStr = null) {
        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${classes}`;
        dayEl.textContent = day;

        // dateStr이 있으면 클릭 가능 (다른 달 날짜도 포함)
        if (dateStr) {
            dayEl.addEventListener('click', () => selectDate(dateStr));
        }

        return dayEl;
    }

    // 날짜 선택
    async function selectDate(dateStr) {
        // 이미 신청된 날짜인지 확인
        if (requestedDates.includes(dateStr)) {
            showWarning('이미 연차가 신청된 날짜입니다.\n신청 날짜: ' + dateStr);
            return;
        }

        // 이미 기간 추가한 날짜인지 확인
        if (isDateInAddedPeriods(dateStr)) {
            showWarning('이미 추가한 휴가 기간에 포함된 날짜입니다.\n해당 기간을 삭제 후 다시 추가해주세요.');
            return;
        }

        const vacationType = vifVacationType.value;

        // 반차인 경우 단일 날짜만 선택
        if (vacationType.includes('반차')) {
            selectedDates = [dateStr];
            vifStartDate.textContent = formatDateWithDay(dateStr);
            vifEndDate.textContent = formatDateWithDay(dateStr);
        }
        // 경조사인 경우 자동으로 종료일 계산
        else if (vacationType === '경조사') {
            const selectedGyeongjo = document.querySelector('input[name="gyeongjo_type"]:checked');
            if (!selectedGyeongjo) {
                showWarning('경조사 유형을 먼저 선택해주세요.');
                return;
            }

            const days = parseInt(selectedGyeongjo.dataset.days);
            const includeHolidays = selectedGyeongjo.dataset.includeHolidays === 'true';
            const startDate = new Date(dateStr);

            let endDateStr;
            if (includeHolidays) {
                // 휴무일 포함
                let endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + days - 1);
                endDateStr = formatDate(endDate);
            } else {
                // 휴무일 미포함
                endDateStr = await calculateBusinessDaysEnd(dateStr, days);
            }

            // 시작일과 종료일 설정
            vifStartDate.textContent = formatDateWithDay(dateStr);
            vifEndDate.textContent = formatDateWithDay(endDateStr);

            // 날짜 범위 채우기
            selectedDates = fillDateRange(dateStr, endDateStr);

            // 경조사 날짜 선택 안내 숨김
            const gyeongjoDateGuideEl = document.getElementById('gyeongjo_date_guide');
            if (gyeongjoDateGuideEl) {
                gyeongjoDateGuideEl.style.display = 'none';
            }
        }
        else {
            // 연차인 경우 범위 선택
            if (selectedDates.length === 0) {
                // 첫 번째 날짜 선택
                selectedDates = [dateStr];
                vifStartDate.textContent = formatDateWithDay(dateStr);
                vifEndDate.textContent = formatDateWithDay(dateStr);
            } else if (selectedDates.length === 1) {
                // 두 번째 날짜 선택 (범위 완성)
                const startDate = new Date(selectedDates[0]);
                const endDate = new Date(dateStr);

                if (endDate < startDate) {
                    // 역순 선택시 시작일과 종료일 교체
                    selectedDates = fillDateRange(dateStr, selectedDates[0]);
                    vifStartDate.textContent = formatDateWithDay(dateStr);
                    vifEndDate.textContent = formatDateWithDay(selectedDates[selectedDates.length - 1]);
                } else {
                    selectedDates = fillDateRange(selectedDates[0], dateStr);
                    vifStartDate.textContent = formatDateWithDay(selectedDates[0]);
                    vifEndDate.textContent = formatDateWithDay(dateStr);
                }
            } else {
                // 이미 범위가 선택된 경우 초기화 후 새로 선택
                selectedDates = [dateStr];
                vifStartDate.textContent = formatDateWithDay(dateStr);
                vifEndDate.textContent = formatDateWithDay(dateStr);
            }
        }

        renderCalendar();
        await calculateVacationDays();
        updatePendingDatesWarning();
    }

    // 날짜 범위 채우기
    function fillDateRange(startStr, endStr) {
        const dates = [];
        const start = new Date(startStr);
        const end = new Date(endStr);

        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            dates.push(formatDate(date));
        }

        return dates;
    }

    // 날짜가 선택되었는지 확인
    function isDateSelected(dateStr) {
        return selectedDates.length > 0 && (
            dateStr === selectedDates[0] ||
            dateStr === selectedDates[selectedDates.length - 1]
        );
    }

    // 날짜가 범위 내에 있는지 확인
    function isDateInRange(dateStr) {
        if (selectedDates.length <= 1) return false;
        const start = selectedDates[0];
        const end = selectedDates[selectedDates.length - 1];
        return dateStr > start && dateStr < end;
    }

    // 오늘 날짜 확인
    function isToday(date) {
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
               date.getMonth() === today.getMonth() &&
               date.getDate() === today.getDate();
    }

    // 날짜 포맷 (YYYY-MM-DD)
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 연차 일수 계산 및 초과 검증
    async function calculateVacationDays() {
        currentSelectionDays = 0;

        if (!vifStartDate.textContent || vifStartDate.textContent === '-' || !vifEndDate.textContent || vifEndDate.textContent === '-') {
            // 선택이 없는 경우 (기간 추가 후): 경고 카드만 숨김 (체크박스와 사유는 유지)
            // 새로운 날짜를 선택했을 때 다시 계산하여 필요시 표시됨
            const warningCard = document.getElementById('vacation_warning_card');
            if (warningCard) {
                warningCard.style.display = 'none';
            }
            return;
        }

        const vacationType = vifVacationType.value;

        if (vacationType.includes('반차')) {
            // 반차도 영업일 검증 필요
            const startDateStr = parseDateFromDisplay(vifStartDate.textContent);
            const start = new Date(startDateStr);

            // 해당 년도의 공휴일 로드
            await ensureHolidaysLoaded(start.getFullYear());

            const dayOfWeek = start.getDay();
            const dateStr = formatDate(start);

            // 주말, 공휴일, 이미 신청한 날짜인지 확인
            if (dayOfWeek === 0 || dayOfWeek === 6 || holidays[dateStr] || requestedDates.includes(dateStr)) {
                currentSelectionDays = 0; // 영업일이 아니면 0
            } else {
                currentSelectionDays = 0.5;
            }
        } else {
            // 주말과 공휴일 제외 계산
            let workDays = 0;
            const startDateStr = parseDateFromDisplay(vifStartDate.textContent);
            const endDateStr = parseDateFromDisplay(vifEndDate.textContent);
            const start = new Date(startDateStr);
            const end = new Date(endDateStr);

            // 날짜 범위에 포함된 모든 년도의 공휴일 로드
            const startYear = start.getFullYear();
            const endYear = end.getFullYear();

            for (let year = startYear; year <= endYear; year++) {
                await ensureHolidaysLoaded(year);
            }

            for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                const dayOfWeek = date.getDay();
                const dateStr = formatDate(date);

                // 주말(토, 일), 공휴일, 이미 신청한 날짜 제외
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays[dateStr] && !requestedDates.includes(dateStr)) {
                    workDays++;
                }
            }

            currentSelectionDays = workDays;
        }

        // 현재 선택 중인 기간 + 이미 추가된 기간들의 총 일수 합산 (경조사 제외)
        const addedDays = vacationPeriods
            .filter(period => !period.type.includes('경조사'))
            .reduce((sum, period) => sum + period.days, 0);

        // 현재 선택 중인 기간이 경조사가 아닌 경우만 합산
        const currentVacationType = vifVacationType.value;

        // 경조사와 기타가 아닌 경우만 연차 초과 검증
        if (currentVacationType !== '경조사' && currentVacationType !== '기타') {
            const totalDays = currentSelectionDays + addedDays;
            checkVacationBalance(totalDays);
        } else {
            // 경조사와 기타는 연차 차감이 없으므로 경고 카드 숨김
            hideVacationWarning();
        }
    }

    // 연차 잔여 확인 및 경고 표시
    function checkVacationBalance(totalUsedDays) {
        const remainingVacation = userVacationInfo ? parseFloat(userVacationInfo.remainingDays) : 12;

        const remainingAfter = remainingVacation - totalUsedDays;

        // 신청 후 잔여 표시
        const remainingAfterRow = document.getElementById('remaining_after_row');
        const remainingAfterValue = document.getElementById('vif_remaining_after');

        if (totalUsedDays > 0) {
            remainingAfterRow.style.display = 'flex';
            remainingAfterValue.textContent = remainingAfter;

            // 음수면 빨간색, 양수면 초록색
            remainingAfterValue.classList.remove('positive', 'negative');
            if (remainingAfter < 0) {
                remainingAfterValue.classList.add('negative');
            } else {
                remainingAfterValue.classList.add('positive');
            }
        } else {
            remainingAfterRow.style.display = 'none';
        }

        // 연차 부족 시 경고 표시
        if (remainingAfter < 0) {
            showVacationWarning(Math.abs(remainingAfter));
        } else {
            hideVacationWarning();
        }
    }

    // 연차 부족 경고 표시
    function showVacationWarning(excessDays) {
        const warningCard = document.getElementById('vacation_warning_card');
        const excessDaysSpan = document.querySelector('.excess-days');
        const allowMinusCheckbox = document.getElementById('allow_minus_vacation');
        const specialReasonWrapper = document.getElementById('special_reason_wrapper');
        const specialReasonTextarea = document.getElementById('special_approval_reason');

        if (warningCard && excessDaysSpan) {
            excessDaysSpan.textContent = excessDays + '일';
            warningCard.style.display = 'block';
        }

        // 마이너스 연차 체크박스 자동 체크
        if (allowMinusCheckbox) {
            allowMinusCheckbox.checked = true;
        }

        // 특별 승인 사유 입력란 자동 표시
        if (specialReasonWrapper) {
            specialReasonWrapper.style.display = 'block';
        }

        // 사유 입력란에 자동 포커스 (사유가 비어있을 때만)
        if (specialReasonTextarea && !specialReasonTextarea.value.trim()) {
            setTimeout(() => {
                specialReasonTextarea.focus();
                // 입력란 하이라이트
                specialReasonTextarea.style.border = '2px solid #667eea';
                setTimeout(() => {
                    specialReasonTextarea.style.border = '';
                }, 2000);
            }, 300);
        }

        // 버튼 상태 업데이트
        updateAddPeriodButtonState();
    }

    // 연차 부족 경고 숨김
    function hideVacationWarning() {
        const warningCard = document.getElementById('vacation_warning_card');

        if (warningCard) {
            warningCard.style.display = 'none';
        }

        // 체크박스 및 특별 승인 사유 초기화
        const allowMinusCheckbox = document.getElementById('allow_minus_vacation');
        const specialReasonWrapper = document.getElementById('special_reason_wrapper');
        const specialReasonTextarea = document.getElementById('special_approval_reason');

        if (allowMinusCheckbox) {
            allowMinusCheckbox.checked = false;
        }
        if (specialReasonWrapper) {
            specialReasonWrapper.style.display = 'none';
        }
        if (specialReasonTextarea) {
            specialReasonTextarea.value = '';
        }

        // 버튼 상태 업데이트
        updateAddPeriodButtonState();
    }

    // 기간 추가 버튼 상태 업데이트
    function updateAddPeriodButtonState() {
        const warningCard = document.getElementById('vacation_warning_card');
        const allowMinusCheckbox = document.getElementById('allow_minus_vacation');
        const specialReasonTextarea = document.getElementById('special_approval_reason');
        const addPeriodBtn = document.getElementById('addPeriodBtn');

        // 연차 부족 경고가 표시되지 않으면 활성화
        if (!warningCard || warningCard.style.display === 'none') {
            if (addPeriodBtn) addPeriodBtn.disabled = false;
            return;
        }

        // 연차 부족 상태: 체크박스 체크와 사유 입력 여부 확인
        const isCheckboxChecked = allowMinusCheckbox && allowMinusCheckbox.checked;
        const hasReason = specialReasonTextarea && specialReasonTextarea.value.trim().length > 0;

        if (isCheckboxChecked && hasReason) {
            // 모두 충족: 버튼 활성화
            if (addPeriodBtn) addPeriodBtn.disabled = false;
        } else {
            // 미충족: 버튼 비활성화
            if (addPeriodBtn) addPeriodBtn.disabled = true;
        }
    }

    // 마이너스 연차 허용 체크박스 이벤트
    const allowMinusCheckbox = document.getElementById('allow_minus_vacation');
    const specialReasonWrapper = document.getElementById('special_reason_wrapper');

    if (allowMinusCheckbox) {
        allowMinusCheckbox.addEventListener('change', function() {
            if (this.checked) {
                specialReasonWrapper.style.display = 'block';
            } else {
                specialReasonWrapper.style.display = 'none';
                const specialReasonTextarea = document.getElementById('special_approval_reason');
                if (specialReasonTextarea) {
                    specialReasonTextarea.value = '';
                }
            }
            // 버튼 상태 업데이트
            updateAddPeriodButtonState();
        });
    }

    // 특별 승인 사유 입력 이벤트
    const specialReasonTextarea = document.getElementById('special_approval_reason');
    if (specialReasonTextarea) {
        specialReasonTextarea.addEventListener('input', function() {
            // 버튼 상태 업데이트
            updateAddPeriodButtonState();
        });
    }

    // 이전 달
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', async () => {
            if (currentYear === 2026 && currentMonth === 0) {
                Swal.fire({
                    toast: true,
                    position: 'top',
                    icon: 'info',
                    title: '서비스 게시일 이전 데이터는 <br> 조회 불가합니다.',
                    showConfirmButton: false,
                    timer: 2500,
                    timerProgressBar: true
                });
                return;
            }
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            // 년도가 변경되었을 때 공휴일 로드
            await ensureHolidaysLoaded(currentYear);
            renderCalendar();
        });
    }

    // 다음 달
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', async () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            // 년도가 변경되었을 때 공휴일 로드
            await ensureHolidaysLoaded(currentYear);
            renderCalendar();
        });
    }

    // 연차 유형 변경
    if (vifVacationType) {
        vifVacationType.addEventListener('change', async () => {
            const vacationType = vifVacationType.value;
            const gyeongjoTypeRow = document.getElementById('gyeongjo_type_row');
            const etcPaidRow = document.getElementById('etc_paid_row');
            const etcCalendarRow = document.getElementById('etc_calendar_row');
            const vacationNotice = document.getElementById('vacation_notice');
            const gyeongjoNotice = document.getElementById('gyeongjo_notice');

            // 경조사 선택 시 라디오 버튼 표시 및 안내 문구 변경
            if (vacationType === '경조사') {
                if (gyeongjoTypeRow) {
                    gyeongjoTypeRow.style.display = 'flex';
                }
                if (etcPaidRow) {
                    etcPaidRow.style.display = 'none';
                }
                if (etcCalendarRow) {
                    etcCalendarRow.style.display = 'none';
                }
                if (vacationNotice) {
                    vacationNotice.style.display = 'none';
                }
                if (gyeongjoNotice) {
                    gyeongjoNotice.style.display = 'flex';
                }
            } else if (vacationType === '기타') {
                // 기타 선택 시 무급/유급 라디오 버튼 및 캘린더 등록 체크박스 표시 및 사유 필수 표시
                if (gyeongjoTypeRow) {
                    gyeongjoTypeRow.style.display = 'none';
                    const radioButtons = document.querySelectorAll('input[name="gyeongjo_type"]');
                    radioButtons.forEach(radio => radio.checked = false);
                }
                if (etcPaidRow) {
                    etcPaidRow.style.display = 'flex';
                }
                if (etcCalendarRow) {
                    etcCalendarRow.style.display = 'block';
                }
                if (vacationNotice) {
                    vacationNotice.style.display = 'flex';
                }
                if (gyeongjoNotice) {
                    gyeongjoNotice.style.display = 'none';
                }
                // 기타 휴가: 사유 필수 표시
                const reasonBadge = document.getElementById('reason_required_badge');
                const reasonTooltipIcon = document.getElementById('reason_tooltip_icon');
                const reasonInput = document.getElementById('vif_reason');
                if (reasonBadge) {
                    reasonBadge.style.display = 'inline-block';
                }
                if (reasonTooltipIcon) {
                    reasonTooltipIcon.style.display = 'block';
                }
                // 기타 선택 시 사유 입력 필드 비우기
                if (reasonInput) {
                    reasonInput.value = '';
                    reasonInput.placeholder = '무급/유급 여부와 휴가 사유를 입력하세요 (예: 무급휴가 - 개인 사유)';
                }
            } else {
                if (gyeongjoTypeRow) {
                    gyeongjoTypeRow.style.display = 'none';
                    // 라디오 버튼 선택 해제
                    const radioButtons = document.querySelectorAll('input[name="gyeongjo_type"]');
                    radioButtons.forEach(radio => radio.checked = false);
                }
                if (etcPaidRow) {
                    etcPaidRow.style.display = 'none';
                }
                if (etcCalendarRow) {
                    etcCalendarRow.style.display = 'none';
                }
                if (vacationNotice) {
                    vacationNotice.style.display = 'flex';
                }
                if (gyeongjoNotice) {
                    gyeongjoNotice.style.display = 'none';
                }
                // 경조사 날짜 선택 안내 숨김
                const gyeongjoDateGuideEl = document.getElementById('gyeongjo_date_guide');
                if (gyeongjoDateGuideEl) {
                    gyeongjoDateGuideEl.style.display = 'none';
                }
                // 사유 필수 표시 숨김 및 기본값 복원
                const reasonBadge = document.getElementById('reason_required_badge');
                const reasonTooltipIcon = document.getElementById('reason_tooltip_icon');
                const reasonInput = document.getElementById('vif_reason');
                if (reasonBadge) {
                    reasonBadge.style.display = 'none';
                }
                if (reasonTooltipIcon) {
                    reasonTooltipIcon.style.display = 'none';
                }
                // 연차/반차 선택 시 사유 기본값으로 변경
                if (reasonInput) {
                    reasonInput.value = '개인 연차 사용';
                    reasonInput.placeholder = '휴가 사용 사유를 입력하세요';
                }
            }

            // 반차로 변경 시: 다중 선택된 날짜가 있으면 첫째 날만 유지
            if (vacationType.includes('반차') && selectedDates.length > 1) {
                const firstDate = selectedDates[0];
                selectedDates = [firstDate];
                vifStartDate.textContent = formatDateWithDay(firstDate);
                vifEndDate.textContent = formatDateWithDay(firstDate);
            }
            // 연차로 변경 시: 기존 선택 유지 (아무 것도 안 함)

            renderCalendar();
            await calculateVacationDays();
            updatePendingDatesWarning();
        });
    }

    // 선택한 기간이 유효하지 않은 이유를 사용자에게 알림
    function showInvalidPeriodMessage() {
        const startDateStr = parseDateFromDisplay(vifStartDate.textContent);
        const endDateStr = parseDateFromDisplay(vifEndDate.textContent);

        if (!startDateStr || !endDateStr) {
            showWarning('유효한 기간을 선택해주세요.');
            return;
        }

        const start = new Date(startDateStr);
        const end = new Date(endDateStr);

        let hasWeekend = false;
        let hasHoliday = false;
        let hasRequestedDate = false;

        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dayOfWeek = date.getDay();
            const dateStr = formatDate(date);

            if (dayOfWeek === 0 || dayOfWeek === 6) {
                hasWeekend = true;
            }
            if (holidays[dateStr]) {
                hasHoliday = true;
            }
            if (requestedDates.includes(dateStr)) {
                hasRequestedDate = true;
            }
        }

        // 구체적인 메시지 표시
        if (hasRequestedDate) {
            showWarning('선택한 기간에 이미 신청된 날짜가 포함되어 있습니다.\n영업일이 없는 기간은 신청할 수 없습니다.');
        } else if (hasWeekend && hasHoliday) {
            showAlert('선택한 기간이 모두 주말 또는 공휴일입니다.\n연차는 영업일에만 신청 가능합니다.');
        } else if (hasWeekend) {
            showAlert('선택한 기간이 모두 주말입니다.\n연차는 영업일에만 신청 가능합니다.');
        } else if (hasHoliday) {
            showAlert('선택한 기간이 모두 공휴일입니다.\n연차는 영업일에만 신청 가능합니다.');
        } else {
            showWarning('유효한 기간을 선택해주세요.');
        }
    }

    // 영업일만 세어서 종료일 계산 (휴무일 미포함)
    async function calculateBusinessDaysEnd(startDateStr, businessDays) {
        const startDate = new Date(startDateStr);
        let currentDate = new Date(startDate);
        let count = 0;

        // 시작일부터 영업일 세기
        const startYear = startDate.getFullYear();
        await ensureHolidaysLoaded(startYear);
        await ensureHolidaysLoaded(startYear + 1); // 년도가 넘어갈 수 있으므로

        while (count < businessDays) {
            const dateStr = formatDate(currentDate);
            const dayOfWeek = currentDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = holidays[dateStr];

            // 영업일이면 카운트
            if (!isWeekend && !isHoliday) {
                count++;
            }

            // 마지막 영업일이 아니면 다음 날로
            if (count < businessDays) {
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        return formatDate(currentDate);
    }

    // 경조사 유형 라디오 버튼 변경 - 휴무일 포함/미포함에 따라 날짜 계산
    const gyeongjoRadios = document.querySelectorAll('input[name="gyeongjo_type"]');
    const gyeongjoDateGuide = document.getElementById('gyeongjo_date_guide');

    gyeongjoRadios.forEach(radio => {
        radio.addEventListener('change', async () => {
            if (radio.checked) {
                // 신청사유 자동 설정
                const vifReasonElement = document.getElementById('vif_reason');
                if (vifReasonElement) {
                    vifReasonElement.value = '경조 휴가 사용';
                }

                // 이미 추가된 경조사 유형인지 체크
                const gyeongjoType = radio.value;
                const alreadyAdded = vacationPeriods.some(period =>
                    period.type && period.type.includes(`경조사(${gyeongjoType})`)
                );

                if (alreadyAdded) {
                    showWarning(`${gyeongjoType} 경조사는 이미 추가되었습니다.\n날짜 변경을 원하시면 기존 기간을 삭제 후 다시 추가해주세요.`);
                    radio.checked = false;
                    // 안내 메시지 숨김
                    if (gyeongjoDateGuide) {
                        gyeongjoDateGuide.style.display = 'none';
                    }
                    return;
                }

                // 안내 메시지 표시
                if (gyeongjoDateGuide) {
                    gyeongjoDateGuide.style.display = 'flex';
                }

                // 이미 시작일이 선택되어 있으면 종료일 자동 계산
                if (vifStartDate.textContent && vifStartDate.textContent !== '-') {
                    const days = parseInt(radio.dataset.days);
                    const includeHolidays = radio.dataset.includeHolidays === 'true';
                    const startDateStr = parseDateFromDisplay(vifStartDate.textContent);
                    const startDate = new Date(startDateStr);

                    let endDateStr;

                    if (includeHolidays) {
                        // 휴무일 포함: 단순히 days-1일 더함
                        let endDate = new Date(startDate);
                        endDate.setDate(endDate.getDate() + days - 1);
                        endDateStr = formatDate(endDate);
                    } else {
                        // 휴무일 미포함: 영업일만 days일 세기
                        endDateStr = await calculateBusinessDaysEnd(startDateStr, days);
                    }

                    // 종료일 설정
                    vifEndDate.textContent = formatDateWithDay(endDateStr);

                    // 선택된 날짜 범위 업데이트
                    selectedDates = fillDateRange(startDateStr, endDateStr);

                    renderCalendar();
                    await calculateVacationDays();
                }
            }
        });
    });

    // 날짜는 이제 캘린더에서 직접 선택하므로 input change 이벤트 리스너 불필요

    // 선택 초기화
    if (resetSelectionBtn) {
        resetSelectionBtn.addEventListener('click', async () => {
            selectedDates = [];
            vifStartDate.textContent = '-';
            vifEndDate.textContent = '-';
            document.getElementById('vif_reason').value = '개인 연차 사용';
            vacationPeriods = [];
            currentSelectionDays = 0;

            // vacationPeriods 초기화 후 requestedDates 재계산 → 캘린더 신청됨 표시 제거
            recalculateRequestedDates();

            // 경조사 라디오 버튼 초기화
            const gyeongjoRadios = document.querySelectorAll('input[name="gyeongjo_type"]');
            gyeongjoRadios.forEach(radio => radio.checked = false);
            const gyeongjoTypeRow = document.getElementById('gyeongjo_type_row');
            if (gyeongjoTypeRow) {
                gyeongjoTypeRow.style.display = 'none';
            }

            // 안내 문구 초기화
            const vacationNotice = document.getElementById('vacation_notice');
            const gyeongjoNotice = document.getElementById('gyeongjo_notice');
            const gyeongjoDateGuideReset = document.getElementById('gyeongjo_date_guide');
            if (vacationNotice) {
                vacationNotice.style.display = 'flex';
            }
            if (gyeongjoNotice) {
                gyeongjoNotice.style.display = 'none';
            }
            if (gyeongjoDateGuideReset) {
                gyeongjoDateGuideReset.style.display = 'none';
            }

            renderCalendar();
            await calculateVacationDays();
            updatePeriodsList();
            await updateDocumentForm();
        });
    }

    // ============================================
    // 여러 기간 추가 기능
    // ============================================

    const addPeriodBtn = document.getElementById('addPeriodBtn');
    const periodsListCard = document.getElementById('periods_list_card');
    const vacationPeriodsList = document.getElementById('vacation_periods_list');
    const totalDaysBadge = document.getElementById('total_days_badge');

    // 마이너스 연차 검증 함수 (공통 사용)
    function validateMinusVacation(days, isGyeongjosa = false, isEtc = false) {
        // 경조사·기타사유는 연차 차감 대상이 아니므로 검증 생략
        if (isGyeongjosa || isEtc) {
            return true;
        }

        // 마이너스 연차인지 확인 (잔여 연차 부족) - 경조사·기타 제외
        const remainingVacation = userVacationInfo ? parseFloat(userVacationInfo.remainingDays) : 12;
        const currentTotalDays = vacationPeriods
            .filter(p => !p.type.includes('경조사') && p.type !== '기타')
            .reduce((sum, p) => sum + p.days, 0);
        const newTotalDays = currentTotalDays + days;
        const isMinusVacation = newTotalDays > remainingVacation;

        // 마이너스 연차이고 특별승인 사유가 비어있으면
        if (isMinusVacation) {
            const specialReasonTextarea = document.getElementById('special_approval_reason');
            const allowMinusCheckbox = document.getElementById('allow_minus_vacation');

            if (!allowMinusCheckbox || !allowMinusCheckbox.checked) {
                showWarning('마이너스 연차 사용을 허용하려면 체크박스를 선택해주세요.');
                if (allowMinusCheckbox) {
                    allowMinusCheckbox.focus();
                    // 체크박스 부모 요소를 하이라이트
                    const checkboxWrapper = allowMinusCheckbox.closest('.checkbox-wrapper, .form-group, label');
                    if (checkboxWrapper) {
                        checkboxWrapper.style.animation = 'shake 0.5s';
                        setTimeout(() => {
                            checkboxWrapper.style.animation = '';
                        }, 500);
                    }
                }
                return false; // 검증 실패
            }

            if (!specialReasonTextarea || !specialReasonTextarea.value.trim()) {
                // 특별승인 사유로 포커스 이동
                if (specialReasonTextarea) {
                    specialReasonTextarea.focus();
                    // 입력란 하이라이트 애니메이션
                    specialReasonTextarea.style.border = '2px solid #dc3545';
                    specialReasonTextarea.style.animation = 'shake 0.5s';

                    // 플레이스홀더 강조
                    const originalPlaceholder = specialReasonTextarea.placeholder;
                    specialReasonTextarea.placeholder = '⚠️ 마이너스 연차 사용 시 특별승인 사유는 필수입니다!';

                    // 3초 후 원래대로
                    setTimeout(() => {
                        specialReasonTextarea.style.border = '';
                        specialReasonTextarea.style.animation = '';
                        specialReasonTextarea.placeholder = originalPlaceholder;
                    }, 3000);

                    // 스크롤 이동
                    specialReasonTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return false; // 검증 실패
            }
        }
        return true; // 검증 통과
    }

    // 기간 추가
    if (addPeriodBtn) {
        addPeriodBtn.addEventListener('click', async (e) => {
            if (!vifStartDate.textContent || vifStartDate.textContent === '-' || !vifEndDate.textContent || vifEndDate.textContent === '-') {
                showWarning('시작일과 종료일을 선택해주세요.');
                return;
            }

            // 경조사 유형 포함한 vacationType 생성
            let vacationType = vifVacationType.value;
            const isGyeongjosa = vacationType === '경조사';

            if (isGyeongjosa) {
                const selectedGyeongjo = document.querySelector('input[name="gyeongjo_type"]:checked');
                if (selectedGyeongjo) {
                    vacationType = `경조사(${selectedGyeongjo.value})`;
                } else {
                    showWarning('경조사 유형을 선택해주세요.');
                    return;
                }
            }

            // 기타 유형일 경우 사유 필수 검증
            if (vacationType === '기타') {
                const reasonInput = document.getElementById('vif_reason');
                const reason = reasonInput ? reasonInput.value.trim() : '';
                if (!reason) {
                    await showWarning('기타 휴가는 사유를 먼저 입력해주세요.\n\n무급/유급 여부와 휴가 사유를 구체적으로 작성한 후 기간을 추가해주세요.');
                    if (reasonInput) {
                        reasonInput.focus();
                        reasonInput.style.border = '2px solid #ff5252';
                        setTimeout(() => {
                            reasonInput.style.border = '';
                        }, 2000);
                    }
                    return;
                }
            }

            // 마이너스 연차 검증 (경조사·기타사유는 검증 생략)
            const isEtc = vacationType === '기타';
            if (!validateMinusVacation(currentSelectionDays, isGyeongjosa, isEtc)) {
                return;
            }
            if (currentSelectionDays <= 0) {
                showInvalidPeriodMessage();
                return;
            }

            // 날짜 범위에 포함된 모든 년도의 공휴일 로드
            const start = new Date(vifStartDate.textContent);
            const end = new Date(vifEndDate.textContent);
            const startYear = start.getFullYear();
            const endYear = end.getFullYear();

            for (let year = startYear; year <= endYear; year++) {
                await ensureHolidaysLoaded(year);
            }

            // 이미 신청된 날짜와 겹치는지 확인
            const overlappingDates = [];
            const startDateStr = parseDateFromDisplay(vifStartDate.textContent);
            const endDateStr = parseDateFromDisplay(vifEndDate.textContent);

            for (let date = new Date(startDateStr); date <= new Date(endDateStr); date.setDate(date.getDate() + 1)) {
                const dateStr = formatDate(date);
                if (requestedDates.includes(dateStr)) {
                    overlappingDates.push(dateStr);
                }
            }

            // 겹치는 날짜가 있으면 사용자에게 경고 후 확인
            if (overlappingDates.length > 0) {
                // 겹치는 날짜가 어떤 기간에 속하는지 찾기
                const overlappingPeriods = [];
                const overlappingPeriodTypes = new Set();

                for (const period of vacationPeriods) {
                    const periodStart = new Date(period.startDate);
                    const periodEnd = new Date(period.endDate);

                    let hasOverlap = false;
                    for (const dateStr of overlappingDates) {
                        const date = new Date(dateStr);
                        if (date >= periodStart && date <= periodEnd) {
                            overlappingPeriodTypes.add(period.type);
                            hasOverlap = true;
                            break;
                        }
                    }

                    if (hasOverlap) {
                        overlappingPeriods.push(period);
                    }
                }

                // 겹치는 날짜 범위를 포맷팅
                const formatOverlappingRange = () => {
                    if (overlappingDates.length === 1) {
                        const date = new Date(overlappingDates[0]);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                    } else {
                        const firstDate = new Date(overlappingDates[0]);
                        const lastDate = new Date(overlappingDates[overlappingDates.length - 1]);
                        return `${firstDate.getMonth() + 1}/${firstDate.getDate()}-${lastDate.getMonth() + 1}/${lastDate.getDate()}`;
                    }
                };

                const periodTypesList = Array.from(overlappingPeriodTypes).join(', ');
                const overlappingRange = formatOverlappingRange();

                let confirmMessage;

                // 경조사를 추가하는 경우: 기존 연차를 경조사로 대체
                if (isGyeongjosa) {
                    confirmMessage = `${overlappingRange}는 이미 ${periodTypesList}로 신청되어 있습니다.\n경조사로 변경하면 해당 날짜의 연차 차감이 취소됩니다.\n\n계속하시겠습니까?`;
                } else {
                    // 연차/반차를 추가하는 경우: 겹치는 부분 제외
                    confirmMessage = `${overlappingRange}는 이미 ${periodTypesList}로 신청되어 제외되며,\n겹치지 않는 날짜만 ${vacationType}로 신청됩니다.\n\n계속하시겠습니까?`;
                }

                if (!(await showConfirm(confirmMessage))) {
                    return;
                }

                // 경조사를 추가하는 경우: 겹치는 기존 기간들을 조정
                if (isGyeongjosa) {
                    // 겹치는 날짜들을 Set으로 변환 (빠른 조회)
                    const overlappingDatesSet = new Set(overlappingDates);

                    // 겹치는 기간들을 제거하고 분할된 새 기간들을 수집
                    const periodsToRemove = [];
                    const periodsToAdd = [];

                    for (const period of overlappingPeriods) {
                        periodsToRemove.push(period);

                        // 기존 기간의 모든 영업일을 배열로 수집
                        const periodStart = new Date(period.startDate);
                        const periodEnd = new Date(period.endDate);
                        const businessDays = [];

                        for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
                            const dateStr = formatDate(d);
                            const dayOfWeek = d.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const isHoliday = holidays[dateStr];

                            // 영업일이고 경조사와 겹치지 않는 날짜만 수집
                            if (!isWeekend && !isHoliday && !overlappingDatesSet.has(dateStr)) {
                                businessDays.push(dateStr);
                            }
                        }

                        // 연속된 영업일을 구간으로 그룹화
                        if (businessDays.length > 0) {
                            let groupStart = businessDays[0];
                            let groupEnd = businessDays[0];
                            let groupDays = 1;

                            for (let i = 1; i < businessDays.length; i++) {
                                const prevDate = new Date(businessDays[i - 1]);
                                const currDate = new Date(businessDays[i]);

                                // 연속된 날짜인지 확인 (영업일 기준, 주말/공휴일 건너뛰기 가능)
                                let isConsecutive = true;
                                for (let checkDate = new Date(prevDate); checkDate < currDate; checkDate.setDate(checkDate.getDate() + 1)) {
                                    const checkDateStr = formatDate(checkDate);
                                    const checkDayOfWeek = checkDate.getDay();
                                    const checkIsWeekend = checkDayOfWeek === 0 || checkDayOfWeek === 6;
                                    const checkIsHoliday = holidays[checkDateStr];

                                    // 영업일이 중간에 끊겼는지 확인
                                    if (!checkIsWeekend && !checkIsHoliday && checkDateStr !== formatDate(prevDate) && !businessDays.includes(checkDateStr)) {
                                        isConsecutive = false;
                                        break;
                                    }
                                }

                                if (isConsecutive) {
                                    // 같은 그룹으로 계속
                                    groupEnd = businessDays[i];
                                    groupDays++;
                                } else {
                                    // 새 그룹 시작 전에 현재 그룹 저장
                                    periodsToAdd.push({
                                        type: period.type,
                                        startDate: groupStart,
                                        endDate: groupEnd,
                                        days: period.type.includes('반차') ? 0.5 : groupDays,
                                        startDateFormatted: formatDateDisplay(new Date(groupStart)),
                                        endDateFormatted: formatDateDisplay(new Date(groupEnd))
                                    });

                                    groupStart = businessDays[i];
                                    groupEnd = businessDays[i];
                                    groupDays = 1;
                                }
                            }

                            // 마지막 그룹 저장
                            periodsToAdd.push({
                                type: period.type,
                                startDate: groupStart,
                                endDate: groupEnd,
                                days: period.type.includes('반차') ? 0.5 : groupDays,
                                startDateFormatted: formatDateDisplay(new Date(groupStart)),
                                endDateFormatted: formatDateDisplay(new Date(groupEnd))
                            });
                        }
                    }

                    // 기존 기간 제거
                    for (const period of periodsToRemove) {
                        const index = vacationPeriods.indexOf(period);
                        if (index > -1) {
                            vacationPeriods.splice(index, 1);
                        }
                    }

                    // 분할된 새 기간 추가
                    vacationPeriods.push(...periodsToAdd);

                    // requestedDates 재계산
                    recalculateRequestedDates();
                }
            }

            // 기타 유형일 경우 무급/유급 정보 가져오기
            let paidType = null;
            if (vacationType === '기타') {
                const paidTypeRadio = document.querySelector('input[name="etc_paid_type"]:checked');
                paidType = paidTypeRadio ? paidTypeRadio.value : '무급';
            }

            // 현재 신청사유 가져오기
            const currentReason = document.getElementById('vif_reason').value.trim();

            // 영업일 구간으로 자동 분리
            const splitPeriods = splitIntoBusinessDayPeriods(
                parseDateFromDisplay(vifStartDate.textContent),
                parseDateFromDisplay(vifEndDate.textContent),
                vacationType,
                paidType,
                currentReason
            );

            if (splitPeriods.length === 0) {
                showWarning('선택한 기간에 영업일이 없습니다.');
                return;
            }

            // 분리된 구간들을 중복 체크 후 추가/병합
            let mergedCount = 0;
            let duplicateCount = 0;
            let marriageDuplicate = false;

            for (const period of splitPeriods) {
                const result = addOrMergePeriod(period);
                if (result === 'marriage_duplicate') {
                    marriageDuplicate = true;
                    break; // 본인결혼 중복이면 즉시 중단
                } else if (result === 'merged') {
                    mergedCount++;
                } else if (result === 'duplicate') {
                    duplicateCount++;
                }
            }

            // 본인결혼 중복이면 여기서 종료 (선택 초기화 안 함)
            if (marriageDuplicate) {
                return;
            }

            updatePeriodsList();

            // requestedDates 재계산 (새로 추가된 기간 반영)
            recalculateRequestedDates();

            // 선택 초기화
            selectedDates = [];
            vifStartDate.textContent = '-';
            vifEndDate.textContent = '-';
            currentSelectionDays = 0;
            await renderCalendar();
            await calculateVacationDays();

            // 미추가 날짜 경고 업데이트 (선택 초기화 후)
            updatePendingDatesWarning();

            // 문서 자동 업데이트
            await updateDocumentForm();
        });
    }

    // submitGuide 클릭 시 기간 추가 버튼 클릭 효과
    const submitGuide = document.getElementById('submitGuide');
    if (submitGuide && addPeriodBtn) {
        submitGuide.addEventListener('click', () => {
            // 버튼이 disabled 상태라도 검증은 수행
            if (addPeriodBtn.disabled) {
                // 날짜 선택 여부 확인
                if (!vifStartDate.textContent || vifStartDate.textContent === '-' || !vifEndDate.textContent || vifEndDate.textContent === '-') {
                    showWarning('시작일과 종료일을 선택해주세요.');
                    return;
                }

                // 마이너스 연차 검증 실행
                if (currentSelectionDays > 0) {
                    const isEtcType = vifVacationType ? vifVacationType.value === '기타' : false;
                    const isGyeongjoType = vifVacationType ? vifVacationType.value === '경조사' : false;
                    validateMinusVacation(currentSelectionDays, isGyeongjoType, isEtcType);
                } else {
                    showInvalidPeriodMessage();
                }
            } else {
                // 버튼이 활성화 상태면 정상 클릭
                addPeriodBtn.click();
            }
        });
    }

    // 기간 추가 또는 병합
    function addOrMergePeriod(newPeriod) {
        const newStart = new Date(newPeriod.startDate);
        const newEnd = new Date(newPeriod.endDate);

        // 본인결혼 휴가 중복 체크 (인생에 한 번만 신청 가능)
        if (newPeriod.type && newPeriod.type.includes('본인결혼')) {
            const hasMarriageLeave = vacationPeriods.some(period =>
                period.type && period.type.includes('본인결혼')
            );

            if (hasMarriageLeave) {
                showWarning('결혼 휴가는 한번만 추가 가능합니다. 날짜변경을 원하실 경우, 기존 추가한 기간을 삭제 후 다시 추가 해 주세요.');
                return 'marriage_duplicate';
            }
        }

        // 기존 기간과 중복/병합 체크
        for (let i = 0; i < vacationPeriods.length; i++) {
            const existingPeriod = vacationPeriods[i];
            const existingStart = new Date(existingPeriod.startDate);
            const existingEnd = new Date(existingPeriod.endDate);

            // 완전 중복 체크 (날짜와 타입이 모두 동일)
            if (newStart.getTime() === existingStart.getTime() &&
                newEnd.getTime() === existingEnd.getTime() &&
                newPeriod.type === existingPeriod.type) {
                return 'duplicate';
            }

            // 겹치거나 인접한 경우 병합 (같은 타입인 경우만)
            if (newPeriod.type === existingPeriod.type) {
                // 하루 차이도 인접으로 간주 (예: 12/10 종료, 12/11 시작)
                const oneDayMs = 24 * 60 * 60 * 1000;
                const isOverlapping = (newStart <= existingEnd && newEnd >= existingStart);
                const isAdjacent =
                    (Math.abs(newEnd.getTime() - existingStart.getTime()) <= oneDayMs) ||
                    (Math.abs(existingEnd.getTime() - newStart.getTime()) <= oneDayMs);

                if (isOverlapping || isAdjacent) {
                    // 병합: 가장 이른 시작일과 가장 늦은 종료일 사용
                    const mergedStart = newStart < existingStart ? newStart : existingStart;
                    const mergedEnd = newEnd > existingEnd ? newEnd : existingEnd;

                    // 병합된 기간의 일수 재계산
                    const mergedStartStr = mergedStart.toISOString().split('T')[0];
                    const mergedEndStr = mergedEnd.toISOString().split('T')[0];

                    // 기존 기간의 날짜들을 requestedDates에서 임시 제거 (정확한 일수 계산을 위해)
                    const tempRemovedDates = [];
                    for (let d = new Date(existingStart); d <= existingEnd; d.setDate(d.getDate() + 1)) {
                        const dateStr = formatDate(d);
                        const index = requestedDates.indexOf(dateStr);
                        if (index > -1) {
                            requestedDates.splice(index, 1);
                            tempRemovedDates.push(dateStr);
                        }
                    }

                    // splitIntoBusinessDayPeriods로 영업일 계산
                    const tempPeriods = splitIntoBusinessDayPeriods(
                        mergedStartStr,
                        mergedEndStr,
                        newPeriod.type
                    );

                    // 분리된 기간들의 총 일수 합계
                    const mergedDays = tempPeriods.reduce((sum, p) => sum + p.days, 0);

                    // 제거했던 날짜들 복원 (다음 연산을 위해)
                    requestedDates.push(...tempRemovedDates);

                    // 기존 기간을 병합된 기간으로 교체
                    vacationPeriods[i] = {
                        startDate: mergedStartStr,
                        endDate: mergedEndStr,
                        startDateFormatted: formatDateDisplay(mergedStart),
                        endDateFormatted: formatDateDisplay(mergedEnd),
                        type: newPeriod.type,
                        days: mergedDays
                    };

                    return 'merged';
                }
            }
        }

        // 중복도 병합도 아니면 새로 추가
        vacationPeriods.push(newPeriod);
        return 'added';
    }

    /**
     * requestedDates 재계산 (초기 신청 날짜 + 현재 세션에서 추가한 기간)
     */
    function recalculateRequestedDates() {
        requestedDates = [...initialRequestedDates]; // 서버에서 로드한 초기 날짜로 시작

        // 현재 세션에서 추가한 기간들의 날짜 추가
        for (const period of vacationPeriods) {
            const start = new Date(period.startDate);
            const end = new Date(period.endDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = formatDate(d);
                if (!requestedDates.includes(dateStr)) {
                    requestedDates.push(dateStr);
                }
            }
        }
    }

    // 기간 목록 업데이트
    function updatePeriodsList() {
        const submitGuide = document.getElementById('submitGuide');
        const actionButtons = document.getElementById('actionButtons');
        const vacationSummaryCard = document.getElementById('vacation_summary_card');

        if (vacationPeriods.length === 0) {
            periodsListCard.style.display = 'none';
            if (vacationSummaryCard) vacationSummaryCard.style.display = 'none';
            // 기간이 없으면 안내 메시지 표시, 액션 버튼과 선택 초기화 버튼 숨김
            if (submitGuide) submitGuide.style.display = 'flex';
            if (actionButtons) actionButtons.style.display = 'none';
            if (resetSelectionBtn) resetSelectionBtn.style.display = 'none';
            return;
        }

        periodsListCard.style.display = 'block';
        if (vacationSummaryCard) vacationSummaryCard.style.display = 'block';
        // 기간이 추가되면 안내 메시지 숨김, 액션 버튼과 선택 초기화 버튼 표시
        if (submitGuide) submitGuide.style.display = 'none';
        if (actionButtons) actionButtons.style.display = 'flex';
        if (resetSelectionBtn) resetSelectionBtn.style.display = 'inline-flex';
        vacationPeriodsList.innerHTML = '';

        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

        vacationPeriods.forEach((period, index) => {
            const startDate = new Date(period.startDate);
            const endDate = new Date(period.endDate);

            const startFormatted = `${period.startDateFormatted} (${dayNames[startDate.getDay()]})`;
            const endFormatted = `${period.endDateFormatted} (${dayNames[endDate.getDay()]})`;
            const dateRange = startDate.getTime() === endDate.getTime()
                ? startFormatted
                : `${startFormatted} ~ ${endFormatted}`;

            const periodItem = document.createElement('div');
            periodItem.className = 'period-item';
            periodItem.innerHTML = `
                <div class="period-info">
                    <div class="period-type">${period.type}</div>
                    <div class="period-dates">${dateRange}</div>
                    <div class="period-days"><strong>${period.days}일</strong></div>
                </div>
                <button class="btn-remove-period" onclick="removePeriod(${index})">
                    <i class="fas fa-trash"></i>
                    삭제
                </button>
            `;
            vacationPeriodsList.appendChild(periodItem);
        });

        // 총 일수 계산 및 표시
        updateTotalDays();

        // 달력 업데이트 (추가된 기간 표시)
        renderCalendar();
    }

    // 미추가 날짜 경고 업데이트
    function updatePendingDatesWarning() {
        const pendingDatesWarning = document.getElementById('pending_dates_warning');
        if (!pendingDatesWarning) return;

        // 조건: 1회 이상 기간이 추가되었고, 캘린더에 선택된 날짜가 있는 경우
        if (vacationPeriods.length > 0 && selectedDates.length > 0) {
            pendingDatesWarning.style.display = 'flex';
        } else {
            pendingDatesWarning.style.display = 'none';
        }
    }

    // 총 일수 업데이트 (UI 업데이트만)
    function updateTotalDays() {
        const totalDays = vacationPeriods.reduce((sum, period) => sum + period.days, 0);
        totalDaysBadge.textContent = `총 ${totalDays}일`;

        // 신청 일수 요약 업데이트 (경조사, 기타 제외)
        const annualLeaveDays = vacationPeriods
            .filter(period => !period.type.includes('경조사') && period.type !== '기타')
            .reduce((sum, period) => sum + period.days, 0);

        const vifCalculatedDaysEl = document.getElementById('vif_calculated_days');
        const remainingAfterRow = document.getElementById('remaining_after_row');
        const vifRemainingAfterEl = document.getElementById('vif_remaining_after');
        const warningCard = document.getElementById('vacation_warning_card');

        if (vifCalculatedDaysEl) {
            vifCalculatedDaysEl.textContent = annualLeaveDays;
        }

        // 잔여 연차 계산
        if (userVacationInfo && remainingAfterRow && vifRemainingAfterEl) {
            const remainingDays = parseFloat(userVacationInfo.remainingDays);
            const afterDays = remainingDays - annualLeaveDays;

            vifRemainingAfterEl.textContent = afterDays.toFixed(1);

            // 연차 신청이 있을 때만 표시
            if (annualLeaveDays > 0) {
                remainingAfterRow.style.display = 'flex';

                // 잔여 연차가 마이너스인 경우 빨간색으로 표시
                if (afterDays < 0) {
                    vifRemainingAfterEl.style.color = '#dc3545';
                } else {
                    vifRemainingAfterEl.style.color = '#667eea';
                }
                // 경고 카드는 calculateVacationDays()에서만 관리
            } else {
                remainingAfterRow.style.display = 'none';
            }
        }
    }

    // 기간 삭제 (전역 함수로 선언)
    window.removePeriod = async function(index) {
        vacationPeriods.splice(index, 1);

        // requestedDates 재계산 (삭제된 기간 반영)
        recalculateRequestedDates();

        updatePeriodsList();

        // 달력 다시 렌더링 (삭제된 기간이 달력에서 사라지도록)
        renderCalendar();

        // 현재 선택 중인 기간 포함하여 재계산
        await calculateVacationDays();

        // 미추가 날짜 경고 업데이트
        updatePendingDatesWarning();

        // 문서 자동 업데이트
        await updateDocumentForm();
    };

    // ============================================
    // 문서 자동 업데이트 함수
    // ============================================

    async function updateDocumentForm() {
        // 기본 정보 복사
        document.getElementById('applicant').textContent = document.getElementById('vif_applicant').textContent;
        document.getElementById('department').textContent = document.getElementById('vif_department').textContent;
        document.getElementById('position').textContent = document.getElementById('vif_position').textContent;

        // 사유 복사 - 모든 기간의 사유를 통합
        const allowMinusCheckbox = document.getElementById('allow_minus_vacation');
        const specialReasonTextarea = document.getElementById('special_approval_reason');

        let reasonText = '';

        // 추가된 기간이 있으면 각 기간의 사유를 합침
        if (vacationPeriods.length > 0) {
            // 중복 사유 제거를 위해 Set 사용
            const uniqueReasons = new Set();
            vacationPeriods.forEach(period => {
                if (period.reason && period.reason.trim()) {
                    uniqueReasons.add(period.reason.trim());
                }
            });

            // 사유를 줄바꿈으로 구분해서 표시
            reasonText = Array.from(uniqueReasons).join('\n');
        } else {
            // 기간이 추가되지 않았으면 현재 입력된 사유 사용
            reasonText = document.getElementById('vif_reason').value;
        }

        // 체크박스가 체크되어 있고 특별 사유가 입력되어 있으면 문서에 포함
        if (allowMinusCheckbox && allowMinusCheckbox.checked && specialReasonTextarea && specialReasonTextarea.value.trim()) {
            reasonText = `${reasonText}\n\n[마이너스연차 특별 요청 사유]\n${specialReasonTextarea.value.trim()}`;
        }
        document.getElementById('reason').textContent = reasonText;

        // 숨겨진 필드들 (데이터 보관용)
        document.getElementById('vacation_type').value = vifVacationType.value;
        document.getElementById('start_date').value = parseDateFromDisplay(vifStartDate.textContent) || '';
        document.getElementById('end_date').value = parseDateFromDisplay(vifEndDate.textContent) || '';
        document.getElementById('days').value = vifCalculatedDays.textContent;
        document.getElementById('apply_date').value = new Date().toISOString().split('T')[0];

        // 휴가기간 포맷 생성
        let vacationPeriodText = '';
        let totalDays = 0;
        let allPeriods = [];

        if (vacationPeriods.length > 0) {
            // 추가된 기간들 사용
            allPeriods = vacationPeriods;
        } else if (vifStartDate.textContent && vifStartDate.textContent !== '-' && vifEndDate.textContent && vifEndDate.textContent !== '-') {
            // 날짜 범위에 포함된 모든 년도의 공휴일 로드
            const startDateStr = parseDateFromDisplay(vifStartDate.textContent);
            const endDateStr = parseDateFromDisplay(vifEndDate.textContent);
            const start = new Date(startDateStr);
            const end = new Date(endDateStr);
            const startYear = start.getFullYear();
            const endYear = end.getFullYear();

            for (let year = startYear; year <= endYear; year++) {
                await ensureHolidaysLoaded(year);
            }

            // 단일 기간 선택 시 영업일 구간으로 분리
            allPeriods = splitIntoBusinessDayPeriods(
                parseDateFromDisplay(vifStartDate.textContent),
                parseDateFromDisplay(vifEndDate.textContent),
                vifVacationType.value
            );

            if (allPeriods.length === 0) {
                // 선택한 기간에 영업일이 없으면 문서 초기화
                const vacationPeriodDisplay = document.getElementById('vacation_period_display');
                if (vacationPeriodDisplay) {
                    vacationPeriodDisplay.innerHTML = '';
                }
                const vacationPeriodTextarea = document.getElementById('vacation_period');
                vacationPeriodTextarea.value = '';
                return;
            }
        } else {
            // 기간이 선택되지 않은 경우 문서 초기화
            const vacationPeriodDisplay = document.getElementById('vacation_period_display');
            if (vacationPeriodDisplay) {
                vacationPeriodDisplay.innerHTML = '';
            }
            const vacationPeriodTextarea = document.getElementById('vacation_period');
            vacationPeriodTextarea.value = '';
            return;
        }

        // 잔여 연차 계산 (마이너스 연차 표시를 위해)
        // 중요: userVacationInfo.remainingDays를 직접 사용해야 기존 마이너스 연차도 반영됨
        const remainingVacation = userVacationInfo ? parseFloat(userVacationInfo.remainingDays) : 12;

        let accumulatedDays = 0; // 누적 일수
        let vacationPeriodHtml = ''; // HTML 포맷팅된 내용 (표시용)

        // 모든 기간 포맷팅
        allPeriods.forEach((period, index) => {
            const periodDays = period.days;
            const isGyeongjosa = period.type && period.type.includes('경조사');
            const isEtc = period.type === '기타';

            // 경조사와 기타가 아닌 경우만 누적 일수에 포함
            const newAccumulated = (isGyeongjosa || isEtc) ? accumulatedDays : (accumulatedDays + periodDays);

            const formatted = formatVacationPeriod(period.startDate, period.endDate, period.days);
            vacationPeriodText += formatted;
            if (index < allPeriods.length - 1) {
                vacationPeriodText += '\n';
            }

            // HTML 포맷팅: 마이너스 연차 부분 빨간색 처리
            const startDate = new Date(period.startDate);
            const endDate = new Date(period.endDate);
            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
            const startFormatted = `${startDate.getFullYear()}.${String(startDate.getMonth() + 1).padStart(2, '0')}.${String(startDate.getDate()).padStart(2, '0')} (${dayNames[startDate.getDay()]})`;
            const endFormatted = `${endDate.getFullYear()}.${String(endDate.getMonth() + 1).padStart(2, '0')}.${String(endDate.getDate()).padStart(2, '0')} (${dayNames[endDate.getDay()]})`;

            // 시작일과 종료일이 같은지 확인 (하루만 선택)
            const isSingleDay = period.startDate === period.endDate;
            const dateDisplay = isSingleDay ? startFormatted : `${startFormatted} ~ ${endFormatted}`;

            // 기타 유형인 경우 무급/유급 표시 추가
            const paidTypeDisplay = isEtc && period.paidType ? ` (${period.paidType})` : '';

            // 경조사인 경우 별도 표시 (파란색)
            if (isGyeongjosa) {
                // "경조사(본인결혼)" -> "본인결혼" 추출
                const gyeongjoType = period.type.replace('경조사(', '').replace(')', '');
                vacationPeriodHtml += `<span class="gyeongjosa-text">${dateDisplay} 경조사 ${periodDays}일 (${gyeongjoType})</span>`;
            }
            // 반차 및 일반 연차 및 기타인 경우
            else {
                // 반차인 경우 표시명 변환
                let displayType = '연차';
                if (period.type && period.type.includes('반차')) {
                    // "반차(오전)" -> "오전반차", "반차(오후)" -> "오후반차"
                    displayType = period.type.replace('반차(오전)', '오전반차').replace('반차(오후)', '오후반차');
                } else if (period.type === '기타') {
                    displayType = '기타';
                }

                // 기타 유형이고 연차 차감 안되는 경우
                if (period.type === '기타') {
                    vacationPeriodHtml += `${dateDisplay} ${displayType}${paidTypeDisplay} ${periodDays}일`;
                }
                // 기존 잔여가 양수인 경우에만 구간별 마이너스 표시
                else if (remainingVacation > 0) {
                    // 이 기간이 완전히 잔여 연차 내에 있는 경우
                    if (newAccumulated <= remainingVacation) {
                        vacationPeriodHtml += `${dateDisplay} ${displayType} ${periodDays}일`;
                    }
                    // 이 기간이 부분적으로 초과하는 경우
                    else if (accumulatedDays < remainingVacation) {
                        const normalDays = remainingVacation - accumulatedDays;
                        const minusDays = periodDays - normalDays;
                        vacationPeriodHtml += `${dateDisplay} ${displayType} ${normalDays}일 + <span style="color: #dc3545; font-weight: 700;">마이너스 ${minusDays}일</span>`;
                    }
                    // 이 기간이 완전히 초과하는 경우 (전체 빨간색)
                    else {
                        vacationPeriodHtml += `<span style="color: #dc3545; font-weight: 700;">${dateDisplay} 마이너스 ${periodDays}일</span>`;
                    }
                }
                // 기존 잔여가 음수 또는 0인 경우: 모든 기간을 마이너스로 표시
                else {
                    vacationPeriodHtml += `<span style="color: #dc3545; font-weight: 700;">${dateDisplay} 마이너스 ${periodDays}일</span>`;
                }
            }

            if (index < allPeriods.length - 1) {
                vacationPeriodHtml += '\n';
            }

            // 경조사와 기타가 아닌 경우만 총 일수에 포함
            if (!isGyeongjosa && !isEtc) {
                totalDays += periodDays;
            }
            accumulatedDays = newAccumulated;
        });

        // 총 일수 표시 (기간이 1개 이상이면 항상 표시)
        if (allPeriods.length > 0) {
            // 경조사를 제외한 연차만 표시
            if (totalDays > 0) {
                vacationPeriodText += `\n\n총 연차 ${totalDays}일`;

                // HTML: 마이너스 연차가 있는 경우 분리 표시
                if (totalDays > remainingVacation) {
                    // 기존 잔여가 양수인 경우
                    if (remainingVacation > 0) {
                        const minusTotal = totalDays - remainingVacation;
                        vacationPeriodHtml += `\n\n총 연차 ${remainingVacation}일 + <span style="color: #dc3545; font-weight: 700;">마이너스 ${minusTotal}일</span>`;
                    }
                    // 기존 잔여가 음수 또는 0인 경우 (이미 마이너스 상태)
                    // 신청하는 일수만 표시 (기존 마이너스는 합산하지 않음)
                    else {
                        vacationPeriodHtml += `\n\n<span style="color: #dc3545; font-weight: 700;">총 마이너스 ${totalDays}일</span>`;
                    }
                } else {
                    vacationPeriodHtml += `\n\n총 연차 ${totalDays}일`;
                }
            }
            // 경조사만 있는 경우 총 일수 표시하지 않음
        }

        // 표시용 div에 HTML 삽입
        const vacationPeriodDisplay = document.getElementById('vacation_period_display');
        if (vacationPeriodDisplay) {
            vacationPeriodDisplay.innerHTML = vacationPeriodHtml.replace(/\n/g, '<br>');
        }

        // 데이터 보관용 textarea에 평문 삽입
        const vacationPeriodTextarea = document.getElementById('vacation_period');
        vacationPeriodTextarea.value = vacationPeriodText;

        // 신청일 포맷 (YYYY년 MM월 DD일)
        const today = new Date();
        const applyDateText = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
        document.getElementById('apply_date_text').textContent = applyDateText;

        // 하단 신청인 이름 설정 (띄어쓰기)
        const applicantName = document.getElementById('vif_applicant').textContent;
        const spacedName = applicantName.split('').join(' ');
        document.getElementById('applicant_name_footer').textContent = spacedName;

        // 결재라인 정보는 초기화 함수에서 별도로 설정됨
    }

    // 양식에 적용 - 나중에 문서 양식 토글 섹션에서 처리

    // 달력 초기 렌더링
    if (calendarDays && vifStartDate && vifEndDate) {
        // 공휴일 로드 및 달력 초기화 (async)
        (async function initCalendar() {
            try {
                // 현재 년도 공휴일 먼저 로드
                await ensureHolidaysLoaded(currentYear);

                // 신청자 정보 초기화 - 세션 정보에서 가져옴
                const vifApplicant = document.getElementById('vif_applicant');
                const vifDepartment = document.getElementById('vif_department');
                const vifPosition = document.getElementById('vif_position');
                const vifApplyDate = document.getElementById('vif_apply_date');

                // 로그인 사용자 정보는 prefillPersonalInfo()에서 설정됨
                // 여기서는 신청일자만 설정
                if (vifApplyDate) {
                    const today = new Date();
                    vifApplyDate.textContent = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                }

                // 달력 렌더링은 setupVacationDefaultDates()에서 처리됨 (requestedDates 로드 후)
                // renderCalendar(); // 제거: 이 시점에는 requestedDates가 아직 로드되지 않음

                console.log('공휴일 데이터 로드 완료:', Object.keys(holidays).length + '건');
            } catch (error) {
                console.error('달력 초기화 중 오류:', error);
                // 오류 발생 시에도 기본 달력은 표시
                renderCalendar();
            }
        })();
    } else {
        console.warn('달력 요소를 찾을 수 없습니다:', {
            calendarDays: !!calendarDays,
            vifStartDate: !!vifStartDate,
            vifEndDate: !!vifEndDate
        });
    }

    // ============================================
    // 문서 양식 토글 기능
    // ============================================

    const documentFormToggle = document.getElementById('documentFormToggle');
    const documentFormWrapper = document.querySelector('.document-form-wrapper');

    // 기본적으로 문서 양식을 접어둠
    if (documentFormWrapper) {
        documentFormWrapper.classList.add('collapsed');
    }

    if (documentFormToggle) {
        documentFormToggle.addEventListener('click', function() {
            if (documentFormWrapper) {
                documentFormWrapper.classList.toggle('collapsed');
                // 버튼 active 상태 토글
                this.classList.toggle('active');
            }
        });
    }

    // 양식에 적용 버튼은 제거되고 자동 업데이트로 대체되었습니다

    // 휴가기간 포맷 생성 함수
    function formatVacationPeriod(startDateStr, endDateStr, days) {
        if (!startDateStr || !endDateStr) {
            return '';
        }

        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

        const startFormatted = `${startDate.getFullYear()}.${String(startDate.getMonth() + 1).padStart(2, '0')}.${String(startDate.getDate()).padStart(2, '0')} (${dayNames[startDate.getDay()]})`;
        const endFormatted = `${endDate.getFullYear()}.${String(endDate.getMonth() + 1).padStart(2, '0')}.${String(endDate.getDate()).padStart(2, '0')} (${dayNames[endDate.getDay()]})`;

        return `${startFormatted} ~ ${endFormatted} 연차 ${days}일`;
    }

    // textarea 높이 자동 조절 함수
    function autoResizeTextarea(textarea) {
        if (!textarea) return;

        // 높이를 auto로 설정하여 scrollHeight 정확히 측정
        textarea.style.height = 'auto';

        // 내용에 맞춰 높이 조절 (최소 높이 80px 유지)
        const newHeight = Math.max(80, textarea.scrollHeight);
        textarea.style.height = newHeight + 'px';
    }

    // ============================================
    // 결재라인 자동 설정 및 전자서명 기능
    // ============================================

    async function setApprovalLine() {
        try {
            // 현재 로그인한 사용자 정보 확인
            if (!userVacationInfo || !userVacationInfo.userIdx) {
                console.warn('사용자 정보가 없습니다. 기본 결재라인을 설정할 수 없습니다.');
                return;
            }

            // 담당: 현재 로그인한 사용자
            const damDangApprover = document.querySelector('.approver-name[data-role="담당"]');
            if (damDangApprover && userVacationInfo.empName) {
                damDangApprover.textContent = userVacationInfo.empName;
                damDangApprover.style.color = '#333';
            }

            // 대표이사 조회 (회사 전체 고정 - isAdmin=true인 사용자)
            const ceoResponse = await fetch('/api/users/ceo');
            const ceoApprover = document.getElementById('ceoName');
            if (ceoResponse.ok) {
                const ceo = await ceoResponse.json();
                if (ceoApprover) {
                    ceoApprover.textContent = ceo.empName;
                    ceoApprover.style.color = '#333';
                    ceoApprover.dataset.approverIdx = ceo.idx;
                    console.log('✓ 대표이사 설정:', ceo.empName);
                }
            } else if (ceoApprover) {
                ceoApprover.textContent = '대표이사';
                ceoApprover.style.color = '#999';
            }

            // 부서장: 직속 상위보고자 단건 조회
            const managerResponse = await fetch(`/api/users/${userVacationInfo.userIdx}/direct-manager`);
            const managerSelect = document.getElementById('managerSelect');
            const managerName = document.getElementById('managerName');

            if (managerResponse.ok) {
                const directManager = await managerResponse.json();
                if (managerName) {
                    managerName.textContent = directManager.empName;
                    managerName.style.color = '#333';
                    managerName.dataset.approverIdx = directManager.idx;
                    console.log('✓ 부서장 설정:', directManager.empName);
                }
            } else {
                console.warn('상위보고자를 찾을 수 없습니다.');
                if (managerName) {
                    managerName.textContent = '부서장';
                    managerName.style.color = '#999';
                }
            }
            if (managerSelect) {
                managerSelect.style.display = 'none';
            }

            console.log('✓ 결재라인 자동 설정 완료');
        } catch (error) {
            console.error('결재라인 설정 중 오류 발생:', error);
            // 오류 발생 시 기본값으로 표시
            const managerName = document.getElementById('managerName');
            if (managerName) {
                managerName.textContent = '부서장';
                managerName.style.color = '#999';
            }

            const ceoApprover = document.getElementById('ceoName');
            if (ceoApprover) {
                ceoApprover.textContent = '대표이사';
                ceoApprover.style.color = '#999';
            }
        }
    }

    // ============================================
    // 페이지 로드 시 초기화
    // ============================================

    // 개인 정보 미리 채우기
    function prefillPersonalInfo() {
        if (!userVacationInfo) {
            console.warn('사용자 연차 정보가 아직 로드되지 않았습니다.');
            return;
        }

        // 신청자 정보 카드 (좌측 상단)
        const vifApplicant = document.getElementById('vif_applicant');
        const vifDepartment = document.getElementById('vif_department');
        const vifPosition = document.getElementById('vif_position');

        if (vifApplicant) {
            if (!userVacationInfo.empName) {
                vifApplicant.textContent = '정보 없음';
                vifApplicant.style.color = '#d32f2f';
                console.error('사용자 이름 정보가 없습니다. 관리자에게 문의하세요.');
            } else {
                vifApplicant.textContent = userVacationInfo.empName;
            }
        }
        if (vifDepartment) {
            const deptName = userVacationInfo.empDeptName || userVacationInfo.empDept;
            if (!deptName) {
                vifDepartment.textContent = '부서 미지정';
                vifDepartment.style.color = '#d32f2f';
                console.error('부서 정보가 없습니다. 관리자에게 문의하세요.');
            } else {
                vifDepartment.textContent = deptName;
            }
        }
        if (vifPosition) {
            const positionName = userVacationInfo.empPositionName || userVacationInfo.empPosition;
            if (!positionName) {
                vifPosition.textContent = '직급 미지정';
                vifPosition.style.color = '#d32f2f';
                console.error('직급 정보가 없습니다. 관리자에게 문의하세요.');
            } else {
                vifPosition.textContent = positionName;
            }
        }

        // 연차 잔액 표시 (우측 상단)
        const totalVacationElement = document.querySelector('.balance-value.total');
        const usedVacationElement = document.querySelector('.balance-value.used');
        const remainingVacationElement = document.querySelector('.balance-value.remaining');

        if (totalVacationElement) {
            totalVacationElement.textContent = `${userVacationInfo.totalDays ?? 15}일`;
        }
        if (usedVacationElement) {
            usedVacationElement.textContent = `${userVacationInfo.usedDays ?? 0}일`;
        }
        if (remainingVacationElement) {
            remainingVacationElement.textContent = `${userVacationInfo.remainingDays ?? 15}일`;
        }

        // 총 연차 ⓘ 팝오버 내용 업데이트
        updateBreakdownPopover(userVacationInfo);

        // 개인 정보 (주소, 생년월일, 연락처)
        const addressField = document.getElementById('address');
        const birthDateField = document.getElementById('birth_date');
        const contactField = document.getElementById('contact');

        if (addressField) {
            addressField.textContent = userVacationInfo.empAddress || '';
        }
        if (birthDateField) {
            birthDateField.textContent = userVacationInfo.empBirth || '';
        }
        if (contactField) {
            contactField.textContent = userVacationInfo.empPhone || '';
        }

        // 소속, 직급, 신청자 정보 복사 (신청자 정보 카드에서 문서 양식으로)
        if (vifApplicant) {
            const applicantField = document.getElementById('applicant');
            if (applicantField) {
                applicantField.textContent = vifApplicant.textContent;
            }

            // 하단 신청인 이름 설정 (띄어쓰기)
            const applicantNameFooter = document.getElementById('applicant_name_footer');
            if (applicantNameFooter) {
                const spacedName = vifApplicant.textContent.split('').join(' ');
                applicantNameFooter.textContent = spacedName;
            }
        }

        if (vifDepartment) {
            const departmentField = document.getElementById('department');
            if (departmentField) {
                departmentField.textContent = vifDepartment.textContent;
            }
        }

        if (vifPosition) {
            const positionField = document.getElementById('position');
            if (positionField) {
                positionField.textContent = vifPosition.textContent;
            }
        }

        // 신청일 포맷 (YYYY년 MM월 DD일)
        const today = new Date();
        const applyDateText = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
        const applyDateTextElement = document.getElementById('apply_date_text');
        if (applyDateTextElement) {
            applyDateTextElement.textContent = applyDateText;
        }

        // 신청일 hidden field
        const applyDateField = document.getElementById('apply_date');
        if (applyDateField) {
            applyDateField.value = new Date().toISOString().split('T')[0];
        }

        // 결재라인 정보는 초기화 함수에서 별도로 설정됨
    }

    // 총 연차 구성 팝오버 내용 생성
    function updateBreakdownPopover(info) {
        const content = document.getElementById('balanceBreakdownContent');
        if (!content || !info) return;

        const n = (val) => (val !== null && val !== undefined) ? parseFloat(val) : 0;
        const year             = info.year || new Date().getFullYear();
        const annualLeaveDays  = n(info.annualLeaveDays);
        const proportionalDays = n(info.proportionalDays);
        const monthlyLeaveDays = n(info.monthlyLeaveDays);
        const compensatoryDays = n(info.compensatoryDays);
        const totalDays        = n(info.totalDays);

        const today     = new Date(); today.setHours(0, 0, 0, 0);
        const yearStart = new Date(year, 0, 1);

        let rows = '';

        if (annualLeaveDays > 0) {
            rows += `<div class="bbp-row"><span>기본연차</span><span>+15일</span></div>`;

            if (info.empJoinDate) {
                const joinDate = new Date(info.empJoinDate + 'T00:00:00');
                const pastMilestones   = [];
                const earnedThisYear   = [];
                const upcomingThisYear = [];
                let totalCounted = 0;

                for (let sy = 3; sy <= 21; sy += 2) {
                    if (totalCounted >= 10) break;
                    const mDate = new Date(joinDate);
                    mDate.setFullYear(joinDate.getFullYear() + sy);
                    const mStr = formatDate(mDate);
                    if (mDate < yearStart) {
                        pastMilestones.push({ years: sy, dateStr: mStr });
                        totalCounted++;
                    } else if (mDate.getFullYear() === year) {
                        if (mDate <= today) earnedThisYear.push({ years: sy, dateStr: mStr });
                        else upcomingThisYear.push({ years: sy, dateStr: mStr });
                        totalCounted++;
                    }
                }

                if (pastMilestones.length > 0) {
                    rows += `<div class="bbp-group"><div class="bbp-group-header">근속가산 (연초 누적 +${pastMilestones.length}일)</div>`;
                    pastMilestones.forEach(m => {
                        rows += `<div class="bbp-row bbp-sub"><span>✓ 만 ${m.years}년 (${m.dateStr})</span><span>+1일</span></div>`;
                    });
                    rows += `</div>`;
                }
                earnedThisYear.forEach(m => {
                    rows += `<div class="bbp-row bbp-earned"><span>🎉 만 ${m.years}년 (${m.dateStr}) <span class="bbp-tag-new">올해 추가</span></span><span>+1일</span></div>`;
                });
                upcomingThisYear.forEach(m => {
                    rows += `<div class="bbp-row bbp-upcoming"><span>⏳ 만 ${m.years}년 (${m.dateStr}) <span class="bbp-tag-upcoming">예정</span></span><span>+1일</span></div>`;
                });
            } else if (annualLeaveDays > 15) {
                rows += `<div class="bbp-row"><span>근속가산</span><span>+${annualLeaveDays - 15}일</span></div>`;
            }
        }

        if (proportionalDays > 0) rows += `<div class="bbp-row"><span>비례연차</span><span>+${proportionalDays}일</span></div>`;
        if (monthlyLeaveDays > 0) rows += `<div class="bbp-row"><span>월차</span><span>+${monthlyLeaveDays}일</span></div>`;
        if (compensatoryDays > 0) rows += `<div class="bbp-row"><span>보상휴가</span><span>+${compensatoryDays}일</span></div>`;

        // 다음 근속가산 예정
        let nextHtml = '';
        if (info.empJoinDate && annualLeaveDays > 0) {
            const joinDate = new Date(info.empJoinDate + 'T00:00:00');
            let counted = 0;
            for (let sy = 3; sy <= 21; sy += 2) {
                if (counted >= 10) break;
                const mDate = new Date(joinDate);
                mDate.setFullYear(joinDate.getFullYear() + sy);
                if (mDate < yearStart) { counted++; continue; }
                if (mDate.getFullYear() === year) { counted++; continue; }
                nextHtml = `<div class="bbp-row bbp-next"><span>📅 만 ${sy}년 (${formatDate(mDate)})</span><span>+1일 예정</span></div>`;
                break;
            }
        }

        content.innerHTML = `
            <div class="bbp-title">${year}년 연차 구성</div>
            <div class="bbp-divider"></div>
            ${rows || '<div class="bbp-empty">부여된 연차가 없습니다</div>'}
            <div class="bbp-divider"></div>
            <div class="bbp-row bbp-total"><span>합계</span><strong>${totalDays}일</strong></div>
            ${nextHtml ? `<div class="bbp-divider"></div><div class="bbp-next-title">다음 예정</div>${nextHtml}` : ''}
        `;
    }

    // ⓘ 버튼 hover 시 팝오버 표시
    const totalLeaveInfoBtn = document.getElementById('totalLeaveInfoBtn');
    const balanceBreakdownPopover = document.getElementById('balanceBreakdownPopover');
    if (totalLeaveInfoBtn && balanceBreakdownPopover) {
        // .vacation-balance에 backdrop-filter가 있으면 position:fixed의 containing block이
        // viewport가 아닌 해당 요소로 바뀌어 팝오버가 엉뚱한 위치에 표시됨.
        // body로 이동해 backdrop-filter 영향에서 완전히 탈출.
        document.body.appendChild(balanceBreakdownPopover);

        let hideTimer = null;

        const showPopover = () => {
            clearTimeout(hideTimer);
            // position:fixed 이므로 버튼의 뷰포트 기준 좌표로 위치 계산
            const rect = totalLeaveInfoBtn.getBoundingClientRect();
            const popoverWidth = 272;
            let left = rect.left + rect.width / 2 - popoverWidth / 2;
            // 뷰포트 밖으로 나가지 않도록 클램프
            left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8));
            balanceBreakdownPopover.style.top = (rect.bottom + 10) + 'px';
            balanceBreakdownPopover.style.left = left + 'px';
            balanceBreakdownPopover.classList.add('show');
        };
        const hidePopover = () => {
            // 버튼 → 팝오버로 마우스 이동 시 닫히지 않도록 짧은 딜레이
            hideTimer = setTimeout(() => {
                balanceBreakdownPopover.classList.remove('show');
            }, 100);
        };

        totalLeaveInfoBtn.addEventListener('mouseenter', showPopover);
        totalLeaveInfoBtn.addEventListener('mouseleave', hidePopover);
        balanceBreakdownPopover.addEventListener('mouseenter', showPopover);
        balanceBreakdownPopover.addEventListener('mouseleave', hidePopover);
    }

    // 연차신청서 페이지인 경우 초기화 (사용자 정보 로드 → 기본 날짜 설정 → 개인정보 채우기)
    (async function() {
        // 1. 사용자 연차 정보 로드
        userVacationInfo = await fetchUserVacationInfo();

        // 2. 이미 신청된 연차 날짜 로드
        requestedDates = await fetchRequestedDates();
        initialRequestedDates = [...requestedDates]; // 초기 값 복사 (수정 불가)

        // 3. 기본 날짜 설정 (3영업일 후)
        await setupVacationDefaultDates();

        // 4. 개인정보 채우기
        prefillPersonalInfo();

        // 5. 결재라인 자동 설정 (async이므로 별도로 await)
        await setApprovalLine();
    })();

});
