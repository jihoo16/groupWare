// 문서 작성 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    let selectedApprovers = [];
    let selectedFiles = [];
    let selectedEmployee = null;
    let userVacationInfo = null; // 사용자 연차 정보 (API에서 가져옴)

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
     * 현재 로그인한 사용자 정보를 가져옴
     * @returns {Promise<Object>} 로그인한 사용자 정보
     */
    async function getCurrentUser() {
        try {
            const response = await fetch('/api/auth/me');
            if (!response.ok) {
                throw new Error('로그인 정보를 가져오는데 실패했습니다.');
            }
            const data = await response.json();
            console.log('현재 로그인 사용자:', data);
            return data;
        } catch (error) {
            console.error('로그인 사용자 조회 실패:', error);
            return null;
        }
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
            alert('사용자 정보를 불러오는데 실패했습니다. 다시 로그인해주세요.');
            // 로그인 페이지로 리다이렉트
            window.location.href = '/login';
            return null;
        }
    }

    // 3영업일 후 날짜 계산 (주말 제외)
    function getBusinessDaysLater(businessDays) {
        let date = new Date();
        let count = 0;

        while (count < businessDays) {
            date.setDate(date.getDate() + 1);
            const dayOfWeek = date.getDay();
            // 토요일(6), 일요일(0) 제외
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                count++;
            }
        }

        return date.toISOString().split('T')[0];
    }

    // 연차신청서 기본 날짜 설정 (3영업일 후)
    async function setupVacationDefaultDates() {
        const defaultDate = getBusinessDaysLater(3);

        const startDateInput = document.getElementById('vif_start_date');
        const endDateInput = document.getElementById('vif_end_date');

        if (startDateInput && endDateInput) {
            // 날짜 설정
            startDateInput.value = defaultDate;
            endDateInput.value = defaultDate;

            // 달력을 해당 날짜의 년/월로 이동
            const dateObj = new Date(defaultDate);
            currentYear = dateObj.getFullYear();
            currentMonth = dateObj.getMonth();

            // 선택된 날짜 배열 업데이트
            selectedDates = [defaultDate];

            // 달력 UI 업데이트 및 일수 계산
            if (typeof renderCalendar === 'function') {
                renderCalendar();
            }
            if (typeof calculateVacationDays === 'function') {
                await calculateVacationDays();
            }

            console.log('3영업일 후 날짜 자동 설정 완료:', defaultDate);
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
                    alert('제거할 참석자를 선택해주세요.');
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
                    alert('제거할 인원을 선택해주세요.');
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
            alert('결재자를 선택해주세요.');
            return;
        }

        if (selectedApprovers.find(a => a.id === selectedEmployee.id)) {
            alert('이미 추가된 결재자입니다.');
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

    // 임시저장
    saveDraftBtn.addEventListener('click', function() {
        alert('문서가 임시저장되었습니다.');
        // 실제로는 API 호출
    });

    // 제출
    submitBtn.addEventListener('click', function() {
        // 휴가기간 표시 영역 확인
        const vacationPeriodDisplay = document.getElementById('vacation_period_display');
        if (!vacationPeriodDisplay || !vacationPeriodDisplay.innerHTML.trim()) {
            alert('휴가 기간을 추가해주세요.');
            return;
        }

        if (confirm('연차 신청서를 저장하시겠습니까?')) {
            alert('연차 신청서가 저장되었습니다.');
            // 실제로는 API 호출 후 목록으로 이동
            // window.location.href = '/approval';
        }
    });

    // PDF 저장 버튼 이벤트
    const savePdfBtn = document.getElementById('savePdfBtn');
    if (savePdfBtn) {
        savePdfBtn.addEventListener('click', async function(e) {
            e.preventDefault();

            // 상태 복원을 위한 변수들을 외부에 선언
            let allDivs = null;
            let originalDisplays = [];

            try {
                console.log('PDF 저장 시작');

                // 현재 활성화된 문서 양식 확인
                const activeTemplate = document.querySelector('.tree-node-header.active');
                const templateType = activeTemplate ? activeTemplate.getAttribute('data-template') : null;

                if (!activeTemplate || (templateType !== 'receipt-meeting' && templateType !== 'receipt-overtime')) {
                    alert('영수증 처리(회의록) 또는 영수증 처리(야근식대) 템플릿을 먼저 선택해주세요.');
                    return;
                }

                // jsPDF와 html2canvas 로드 확인
                if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
                    alert('PDF 라이브러리를 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
                    return;
                }

                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');

                // documentForm 내의 모든 최상위 div 찾기
                allDivs = documentForm.querySelectorAll(':scope > div');
                console.log('찾은 div 개수:', allDivs.length);

                // 원래 display 스타일 저장
                originalDisplays = Array.from(allDivs).map(div => div.style.display);

                // 템플릿 타입별로 다른 처리
                if (templateType === 'receipt-meeting') {
                    if (allDivs.length < 4) {
                        alert('문서 구조를 찾을 수 없습니다. 영수증 처리(회의록) 템플릿을 선택했는지 확인해주세요.');
                        return;
                    }

                    // 공통 정보 입력 영역 숨기고, 나머지는 모두 표시
                    allDivs[0].style.display = 'none'; // 공통 정보 입력
                    allDivs[1].style.display = 'block'; // 회의 품의서
                    allDivs[2].style.display = 'block'; // 회의록
                    allDivs[3].style.display = 'block'; // 참석자 명단
                } else if (templateType === 'receipt-overtime') {
                    if (allDivs.length < 3) {
                        alert('문서 구조를 찾을 수 없습니다. 영수증 처리(야근식대) 템플릿을 선택했는지 확인해주세요.');
                        return;
                    }

                    // 공통 정보 입력 영역 숨기고, 나머지는 모두 표시
                    allDivs[0].style.display = 'none'; // 공통 정보 입력
                    allDivs[1].style.display = 'block'; // 품의서
                    allDivs[2].style.display = 'block'; // 야근 신청서
                }

                // 잠시 대기하여 DOM 업데이트 완료
                await new Promise(resolve => setTimeout(resolve, 100));

                // 공통 렌더링 옵션
                const renderOptions = {
                    scale: 3, // 고해상도
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    imageTimeout: 0,
                    removeContainer: true
                };

                // PDF 페이지 설정 (A4, 여백 포함)
                const pdfWidth = 210; // A4 width in mm
                const pdfHeight = 297; // A4 height in mm
                const margin = 10; // 여백 10mm
                const contentWidth = pdfWidth - (margin * 2);

                let fileName = '';

                if (templateType === 'receipt-meeting') {
                    // 회의록 PDF 생성
                    // 1. 회의 품의서 페이지
                    console.log('회의 품의서 렌더링 중...');
                    const proposalDiv = allDivs[1];

                    if (!proposalDiv) {
                        throw new Error('회의 품의서를 찾을 수 없습니다.');
                    }

                    console.log('회의 품의서 div 크기:', proposalDiv.offsetWidth, 'x', proposalDiv.offsetHeight);

                    const proposalCanvas = await window.html2canvas(proposalDiv, renderOptions);
                    console.log('Canvas 생성 완료:', proposalCanvas.width, 'x', proposalCanvas.height);

                    const canvasWidth = proposalCanvas.width;
                    const canvasHeight = proposalCanvas.height;

                    if (canvasWidth === 0 || canvasHeight === 0) {
                        throw new Error('Canvas 크기가 0입니다. 문서가 화면에 표시되어 있는지 확인하세요.');
                    }

                    const proposalImgData = proposalCanvas.toDataURL('image/jpeg', 0.95);
                    const imgHeight = (canvasHeight * contentWidth) / canvasWidth;

                    pdf.addImage(proposalImgData, 'JPEG', margin, margin, contentWidth, imgHeight);
                    console.log('회의 품의서 페이지 완료');

                    // 2. 회의록 페이지
                    console.log('회의록 렌더링 중...');
                    const minutesDiv = allDivs[2];

                    if (!minutesDiv) {
                        throw new Error('회의록을 찾을 수 없습니다.');
                    }

                    pdf.addPage();
                    const minutesCanvas = await window.html2canvas(minutesDiv, renderOptions);

                    const minutesCanvasWidth = minutesCanvas.width;
                    const minutesCanvasHeight = minutesCanvas.height;

                    const minutesImgData = minutesCanvas.toDataURL('image/jpeg', 0.95);
                    const minutesImgHeight = (minutesCanvasHeight * contentWidth) / minutesCanvasWidth;

                    pdf.addImage(minutesImgData, 'JPEG', margin, margin, contentWidth, minutesImgHeight);
                    console.log('회의록 페이지 완료');

                    // 3. 참석자 명단 페이지
                    console.log('참석자 명단 렌더링 중...');
                    const attendeeDiv = allDivs[3];

                    if (!attendeeDiv) {
                        throw new Error('참석자 명단을 찾을 수 없습니다.');
                    }

                    pdf.addPage();
                    const attendeeCanvas = await window.html2canvas(attendeeDiv, renderOptions);

                    const attendeeCanvasWidth = attendeeCanvas.width;
                    const attendeeCanvasHeight = attendeeCanvas.height;

                    const attendeeImgData = attendeeCanvas.toDataURL('image/jpeg', 0.95);
                    const attendeeImgHeight = (attendeeCanvasHeight * contentWidth) / attendeeCanvasWidth;

                    pdf.addImage(attendeeImgData, 'JPEG', margin, margin, contentWidth, attendeeImgHeight);
                    console.log('참석자 명단 페이지 완료');

                    // 파일명 생성
                    const dateInput = document.getElementById('common_date');
                    let dateStr;
                    if (dateInput && dateInput.value) {
                        dateStr = dateInput.value.replace(/-/g, '');
                    } else {
                        const today = new Date();
                        dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
                    }
                    fileName = `${dateStr}_회의록.pdf`;
                } else if (templateType === 'receipt-overtime') {
                    // 야근식대 PDF 생성
                    // 1. 품의서 페이지
                    console.log('품의서 렌더링 중...');
                    const proposalDiv = allDivs[1];

                    if (!proposalDiv) {
                        throw new Error('품의서를 찾을 수 없습니다.');
                    }

                    console.log('품의서 div 크기:', proposalDiv.offsetWidth, 'x', proposalDiv.offsetHeight);

                    const proposalCanvas = await window.html2canvas(proposalDiv, renderOptions);
                    console.log('Canvas 생성 완료:', proposalCanvas.width, 'x', proposalCanvas.height);

                    const canvasWidth = proposalCanvas.width;
                    const canvasHeight = proposalCanvas.height;

                    if (canvasWidth === 0 || canvasHeight === 0) {
                        throw new Error('Canvas 크기가 0입니다. 문서가 화면에 표시되어 있는지 확인하세요.');
                    }

                    const proposalImgData = proposalCanvas.toDataURL('image/jpeg', 0.95);
                    const imgHeight = (canvasHeight * contentWidth) / canvasWidth;

                    pdf.addImage(proposalImgData, 'JPEG', margin, margin, contentWidth, imgHeight);
                    console.log('품의서 페이지 완료');

                    // 2. 야근 신청서 페이지
                    console.log('야근 신청서 렌더링 중...');
                    const overtimeDiv = allDivs[2];

                    if (!overtimeDiv) {
                        throw new Error('야근 신청서를 찾을 수 없습니다.');
                    }

                    pdf.addPage();
                    const overtimeCanvas = await window.html2canvas(overtimeDiv, renderOptions);

                    const overtimeCanvasWidth = overtimeCanvas.width;
                    const overtimeCanvasHeight = overtimeCanvas.height;

                    const overtimeImgData = overtimeCanvas.toDataURL('image/jpeg', 0.95);
                    const overtimeImgHeight = (overtimeCanvasHeight * contentWidth) / overtimeCanvasWidth;

                    pdf.addImage(overtimeImgData, 'JPEG', margin, margin, contentWidth, overtimeImgHeight);
                    console.log('야근 신청서 페이지 완료');

                    // 파일명 생성
                    const dateInput = document.getElementById('ot_date');
                    let dateStr;
                    if (dateInput && dateInput.value) {
                        dateStr = dateInput.value.replace(/-/g, '');
                    } else {
                        const today = new Date();
                        dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
                    }
                    fileName = `${dateStr}_야근식대비.pdf`;
                }

                console.log('PDF 저장:', fileName);
                pdf.save(fileName);

                alert('PDF가 저장되었습니다.');
            } catch (error) {
                console.error('PDF 생성 오류:', error);
                alert('PDF 생성 중 오류가 발생했습니다.\n' + error.message + '\n\n브라우저 콘솔(F12)을 확인해주세요.');
            } finally {
                // 에러 발생 여부와 관계없이 항상 원래 스타일 복원
                if (allDivs && originalDisplays.length > 0) {
                    allDivs.forEach((div, index) => {
                        div.style.display = originalDisplays[index];
                    });
                }
            }
        });
    }

    // 초기 템플릿 로드
    loadTemplate('vacation');

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
    let holidays = {};

    // 여러 기간 관리
    let vacationPeriods = []; // 추가된 휴가 기간 목록

    // 영업일 구간으로 분리하는 함수
    function splitIntoBusinessDayPeriods(startDate, endDate, vacationType) {
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
                endDateFormatted: formatDateDisplay(new Date(endDate))
            }];
        }

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = formatDate(d);
            const dayOfWeek = d.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = holidays[dateStr];

            if (!isWeekend && !isHoliday) {
                // 영업일
                if (!currentPeriodStart) {
                    currentPeriodStart = new Date(d);
                }
                currentPeriodEnd = new Date(d);
                currentDays++;
            } else {
                // 주말 또는 공휴일 - 현재 구간 저장
                if (currentPeriodStart && currentDays > 0) {
                    periods.push({
                        type: vacationType,
                        startDate: formatDate(currentPeriodStart),
                        endDate: formatDate(currentPeriodEnd),
                        days: currentDays,
                        startDateFormatted: formatDateDisplay(currentPeriodStart),
                        endDateFormatted: formatDateDisplay(currentPeriodEnd)
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
                endDateFormatted: formatDateDisplay(currentPeriodEnd)
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

    // 공휴일 데이터 로드 (API 호출)
    async function loadHolidays(year) {
        try {
            const response = await fetch(`/api/calendar/holidays/year/${year}`);
            if (!response.ok) {
                throw new Error('공휴일 데이터를 불러오는데 실패했습니다.');
            }

            const data = await response.json();
            console.log('[DEBUG] API 응답:', data);

            if (data.success && data.holidays) {
                console.log('[DEBUG] 첫 번째 공휴일 원본 데이터:', data.holidays[0]);
                console.log('[DEBUG] holidayDate 타입:', typeof data.holidays[0]?.holidayDate);
                console.log('[DEBUG] holidayDate 값:', data.holidays[0]?.holidayDate);

                // holidays 배열을 객체로 변환 (날짜 -> 공휴일명)
                const holidayMap = {};
                data.holidays.forEach(holiday => {
                    // LocalDate가 배열로 오는 경우 처리
                    let dateStr;
                    if (Array.isArray(holiday.holidayDate)) {
                        // [2025, 1, 29] 형식인 경우
                        const [year, month, day] = holiday.holidayDate;
                        dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    } else if (typeof holiday.holidayDate === 'string') {
                        // 이미 문자열인 경우
                        dateStr = holiday.holidayDate;
                    } else {
                        console.warn('[DEBUG] 예상치 못한 날짜 형식:', holiday.holidayDate);
                        return;
                    }
                    holidayMap[dateStr] = holiday.holidayName;
                });

                console.log('[DEBUG] 변환된 공휴일 맵 샘플:', Object.entries(holidayMap).slice(0, 5));
                console.log('[DEBUG] 공휴일 맵 총 개수:', Object.keys(holidayMap).length);
                return holidayMap;
            }
            return {};
        } catch (error) {
            console.error('공휴일 로드 실패:', error);
            return {};
        }
    }

    // 달력에 필요한 년도의 공휴일 로드
    async function ensureHolidaysLoaded(year) {
        // 해당 년도 공휴일이 없으면 로드
        const yearHolidays = await loadHolidays(year);
        holidays = { ...holidays, ...yearHolidays };
        console.log(`[DEBUG] ensureHolidaysLoaded 완료 - ${year}년 공휴일:`, Object.keys(holidays).length, '건');
        console.log('[DEBUG] holidays 객체 샘플:', Object.entries(holidays).slice(0, 3));
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
        const totalVacation = userVacationInfo ? parseFloat(userVacationInfo.totalDays) : 15;
        const usedVacation = userVacationInfo ? parseFloat(userVacationInfo.usedDays) : 3;
        const remainingVacation = totalVacation - usedVacation;

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

    // 달력 렌더링
    function renderCalendar() {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const prevLastDay = new Date(currentYear, currentMonth, 0);

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
                if (isDateInMinusPeriod(dateStr)) {
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
                if (isDateInMinusPeriod(dateStr)) {
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
                if (isDateInMinusPeriod(dateStr)) {
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
        const vacationType = vifVacationType.value;

        // 반차인 경우 단일 날짜만 선택
        if (vacationType.includes('반차')) {
            selectedDates = [dateStr];
            vifStartDate.value = dateStr;
            vifEndDate.value = dateStr;
        } else {
            // 연차인 경우 범위 선택
            if (selectedDates.length === 0) {
                // 첫 번째 날짜 선택
                selectedDates = [dateStr];
                vifStartDate.value = dateStr;
                vifEndDate.value = dateStr;
            } else if (selectedDates.length === 1) {
                // 두 번째 날짜 선택 (범위 완성)
                const startDate = new Date(selectedDates[0]);
                const endDate = new Date(dateStr);

                if (endDate < startDate) {
                    // 역순 선택시 시작일과 종료일 교체
                    selectedDates = fillDateRange(dateStr, selectedDates[0]);
                    vifStartDate.value = dateStr;
                    vifEndDate.value = selectedDates[selectedDates.length - 1];
                } else {
                    selectedDates = fillDateRange(selectedDates[0], dateStr);
                    vifEndDate.value = dateStr;
                }
            } else {
                // 이미 범위가 선택된 경우 초기화 후 새로 선택
                selectedDates = [dateStr];
                vifStartDate.value = dateStr;
                vifEndDate.value = dateStr;
            }
        }

        renderCalendar();
        await calculateVacationDays();
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
        let currentPeriodDays = 0;

        if (!vifStartDate.value || !vifEndDate.value) {
            vifCalculatedDays.textContent = '0';
            // 이미 추가된 기간들만 있는 경우에도 검증
            const addedDays = vacationPeriods.reduce((sum, period) => sum + period.days, 0);
            checkVacationBalance(addedDays);
            return;
        }

        const vacationType = vifVacationType.value;

        if (vacationType.includes('반차')) {
            currentPeriodDays = 0.5;
            vifCalculatedDays.textContent = '0.5';
        } else {
            // 주말과 공휴일 제외 계산
            let workDays = 0;
            const start = new Date(vifStartDate.value);
            const end = new Date(vifEndDate.value);

            // 날짜 범위에 포함된 모든 년도의 공휴일 로드
            const startYear = start.getFullYear();
            const endYear = end.getFullYear();

            for (let year = startYear; year <= endYear; year++) {
                await ensureHolidaysLoaded(year);
            }

            for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                const dayOfWeek = date.getDay();
                const dateStr = formatDate(date);

                // 주말(토, 일)과 공휴일 제외
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays[dateStr]) {
                    workDays++;
                }
            }

            currentPeriodDays = workDays;
            vifCalculatedDays.textContent = workDays;
        }

        // 현재 선택 중인 기간 + 이미 추가된 기간들의 총 일수 합산
        const addedDays = vacationPeriods.reduce((sum, period) => sum + period.days, 0);
        const totalDays = currentPeriodDays + addedDays;

        // 연차 초과 검증 (전체 합산 일수로)
        checkVacationBalance(totalDays);
    }

    // 연차 잔여 확인 및 경고 표시
    function checkVacationBalance(totalUsedDays) {
        const totalVacation = userVacationInfo ? parseFloat(userVacationInfo.totalDays) : 15;
        const usedVacation = userVacationInfo ? parseFloat(userVacationInfo.usedDays) : 3;
        const remainingVacation = totalVacation - usedVacation;

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

            // 반차로 변경 시: 다중 선택된 날짜가 있으면 첫째 날만 유지
            if (vacationType.includes('반차') && selectedDates.length > 1) {
                const firstDate = selectedDates[0];
                selectedDates = [firstDate];
                vifStartDate.value = firstDate;
                vifEndDate.value = firstDate;
            }
            // 연차로 변경 시: 기존 선택 유지 (아무 것도 안 함)

            renderCalendar();
            await calculateVacationDays();
        });
    }

    // 날짜 입력 필드 변경
    if (vifStartDate) {
        vifStartDate.addEventListener('change', async () => {
            if (vifStartDate.value) {
                selectedDates = [vifStartDate.value];
                if (vifEndDate.value && vifEndDate.value >= vifStartDate.value) {
                    selectedDates = fillDateRange(vifStartDate.value, vifEndDate.value);
                }
                renderCalendar();
                await calculateVacationDays();
            }
        });
    }

    if (vifEndDate) {
        vifEndDate.addEventListener('change', async () => {
            if (vifEndDate.value && vifStartDate.value) {
                if (vifEndDate.value < vifStartDate.value) {
                    alert('종료일은 시작일보다 이전일 수 없습니다.');
                    vifEndDate.value = vifStartDate.value;
                }
                selectedDates = fillDateRange(vifStartDate.value, vifEndDate.value);
                renderCalendar();
                await calculateVacationDays();
            }
        });
    }

    // 선택 초기화
    if (resetSelectionBtn) {
        resetSelectionBtn.addEventListener('click', async () => {
            selectedDates = [];
            vifStartDate.value = '';
            vifEndDate.value = '';
            document.getElementById('vif_reason').value = '';
            renderCalendar();
            await calculateVacationDays();
        });
    }

    // ============================================
    // 여러 기간 추가 기능
    // ============================================

    const addPeriodBtn = document.getElementById('addPeriodBtn');
    const periodsListCard = document.getElementById('periods_list_card');
    const vacationPeriodsList = document.getElementById('vacation_periods_list');
    const totalDaysBadge = document.getElementById('total_days_badge');

    // 기간 추가
    if (addPeriodBtn) {
        addPeriodBtn.addEventListener('click', async (e) => {
            // 버튼이 비활성화되어 있으면 실행하지 않음
            if (addPeriodBtn.disabled) {
                e.preventDefault();
                return;
            }

            if (!vifStartDate.value || !vifEndDate.value) {
                alert('시작일과 종료일을 선택해주세요.');
                return;
            }

            const days = parseFloat(vifCalculatedDays.textContent);
            if (days <= 0) {
                alert('유효한 기간을 선택해주세요.');
                return;
            }

            // 날짜 범위에 포함된 모든 년도의 공휴일 로드
            const start = new Date(vifStartDate.value);
            const end = new Date(vifEndDate.value);
            const startYear = start.getFullYear();
            const endYear = end.getFullYear();

            for (let year = startYear; year <= endYear; year++) {
                await ensureHolidaysLoaded(year);
            }

            // 영업일 구간으로 자동 분리
            const splitPeriods = splitIntoBusinessDayPeriods(
                vifStartDate.value,
                vifEndDate.value,
                vifVacationType.value
            );

            if (splitPeriods.length === 0) {
                alert('선택한 기간에 영업일이 없습니다.');
                return;
            }

            // 분리된 구간들을 중복 체크 후 추가/병합
            let mergedCount = 0;
            let duplicateCount = 0;

            splitPeriods.forEach(period => {
                const result = addOrMergePeriod(period);
                if (result === 'merged') {
                    mergedCount++;
                } else if (result === 'duplicate') {
                    duplicateCount++;
                }
            });

            updatePeriodsList();

            // 선택 초기화
            selectedDates = [];
            vifStartDate.value = '';
            vifEndDate.value = '';
            vifCalculatedDays.textContent = '0';
            renderCalendar();
            await calculateVacationDays();

            // 문서 자동 업데이트
            await updateDocumentForm();
        });
    }

    // 기간 추가 또는 병합
    function addOrMergePeriod(newPeriod) {
        const newStart = new Date(newPeriod.startDate);
        const newEnd = new Date(newPeriod.endDate);

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
                    const mergedDays = calculateBusinessDays(
                        mergedStart.toISOString().split('T')[0],
                        mergedEnd.toISOString().split('T')[0],
                        newPeriod.type
                    );

                    // 기존 기간을 병합된 기간으로 교체
                    vacationPeriods[i] = {
                        startDate: mergedStart.toISOString().split('T')[0],
                        endDate: mergedEnd.toISOString().split('T')[0],
                        startDateFormatted: formatDate(mergedStart.toISOString().split('T')[0]),
                        endDateFormatted: formatDate(mergedEnd.toISOString().split('T')[0]),
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

    // 기간 목록 업데이트
    function updatePeriodsList() {
        if (vacationPeriods.length === 0) {
            periodsListCard.style.display = 'none';
            return;
        }

        periodsListCard.style.display = 'block';
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

    // 총 일수 업데이트 (UI 업데이트만)
    function updateTotalDays() {
        const totalDays = vacationPeriods.reduce((sum, period) => sum + period.days, 0);
        totalDaysBadge.textContent = `총 ${totalDays}일`;
    }

    // 기간 삭제 (전역 함수로 선언)
    window.removePeriod = async function(index) {
        vacationPeriods.splice(index, 1);
        updatePeriodsList();

        // 현재 선택 중인 기간 포함하여 재계산
        await calculateVacationDays();

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

        // 사유 복사 (마이너스 연차일 경우 특별 사유 추가)
        const warningCard = document.getElementById('vacation_warning_card');
        const specialReasonTextarea = document.getElementById('special_approval_reason');
        const vifReason = document.getElementById('vif_reason').value;

        let reasonText = vifReason;
        if (warningCard && warningCard.style.display !== 'none' && specialReasonTextarea && specialReasonTextarea.value.trim()) {
            reasonText = `${vifReason}\n\n[마이너스연차 특별 요청 사유]\n${specialReasonTextarea.value.trim()}`;
        }
        document.getElementById('reason').value = reasonText;

        // 숨겨진 필드들 (데이터 보관용)
        document.getElementById('vacation_type').value = vifVacationType.value;
        document.getElementById('start_date').value = vifStartDate.value;
        document.getElementById('end_date').value = vifEndDate.value;
        document.getElementById('days').value = vifCalculatedDays.textContent;
        document.getElementById('apply_date').value = new Date().toISOString().split('T')[0];

        // 휴가기간 포맷 생성
        let vacationPeriodText = '';
        let totalDays = 0;
        let allPeriods = [];

        if (vacationPeriods.length > 0) {
            // 추가된 기간들 사용
            allPeriods = vacationPeriods;
        } else if (vifStartDate.value && vifEndDate.value) {
            // 날짜 범위에 포함된 모든 년도의 공휴일 로드
            const start = new Date(vifStartDate.value);
            const end = new Date(vifEndDate.value);
            const startYear = start.getFullYear();
            const endYear = end.getFullYear();

            for (let year = startYear; year <= endYear; year++) {
                await ensureHolidaysLoaded(year);
            }

            // 단일 기간 선택 시 영업일 구간으로 분리
            allPeriods = splitIntoBusinessDayPeriods(
                vifStartDate.value,
                vifEndDate.value,
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
        const totalVacation = userVacationInfo ? parseFloat(userVacationInfo.totalDays) : 15;
        const usedVacation = userVacationInfo ? parseFloat(userVacationInfo.usedDays) : 3;
        const remainingVacation = totalVacation - usedVacation;

        let accumulatedDays = 0; // 누적 일수
        let vacationPeriodHtml = ''; // HTML 포맷팅된 내용 (표시용)

        // 모든 기간 포맷팅
        allPeriods.forEach((period, index) => {
            const periodDays = period.days;
            const newAccumulated = accumulatedDays + periodDays;

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

            // 이 기간이 완전히 잔여 연차 내에 있는 경우
            if (newAccumulated <= remainingVacation) {
                vacationPeriodHtml += `${startFormatted} ~ ${endFormatted} 연차 ${periodDays}일`;
            }
            // 이 기간이 부분적으로 초과하는 경우
            else if (accumulatedDays < remainingVacation) {
                const normalDays = remainingVacation - accumulatedDays;
                const minusDays = periodDays - normalDays;
                vacationPeriodHtml += `${startFormatted} ~ ${endFormatted} 연차 ${normalDays}일 + <span style="color: #dc3545; font-weight: 700;">마이너스 ${minusDays}일</span>`;
            }
            // 이 기간이 완전히 초과하는 경우 (전체 빨간색)
            else {
                vacationPeriodHtml += `<span style="color: #dc3545; font-weight: 700;">${startFormatted} ~ ${endFormatted} 마이너스 ${periodDays}일</span>`;
            }

            if (index < allPeriods.length - 1) {
                vacationPeriodHtml += '\n';
            }

            totalDays += periodDays;
            accumulatedDays = newAccumulated;
        });

        // 총 일수 표시
        if (allPeriods.length > 1) {
            vacationPeriodText += `\n\n총 연차 ${totalDays}일`;

            // HTML: 마이너스 연차가 있는 경우 분리 표시
            if (totalDays > remainingVacation) {
                const minusTotal = totalDays - remainingVacation;
                vacationPeriodHtml += `\n\n총 연차 ${remainingVacation}일 + <span style="color: #dc3545; font-weight: 700;">마이너스 ${minusTotal}일</span>`;
            } else {
                vacationPeriodHtml += `\n\n총 연차 ${totalDays}일`;
            }
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

        // 결재라인 정보 자동 설정 (실제로는 서버에서 불러와야 함)
        setApprovalLine();
    }

    // 양식에 적용 - 나중에 문서 양식 토글 섹션에서 처리

    // 달력 초기 렌더링
    if (calendarDays && vifStartDate && vifEndDate) {
        // 공휴일 로드 및 달력 초기화 (async)
        (async function initCalendar() {
            try {
                // 현재 년도 공휴일 먼저 로드
                await ensureHolidaysLoaded(currentYear);

                // 신청자 정보 초기화 (실제로는 로그인 사용자 정보로 채워야 함)
                const vifApplicant = document.getElementById('vif_applicant');
                const vifDepartment = document.getElementById('vif_department');
                const vifPosition = document.getElementById('vif_position');
                const vifApplyDate = document.getElementById('vif_apply_date');

                if (vifApplicant) vifApplicant.textContent = '홍길동';
                if (vifDepartment) vifDepartment.textContent = '개발팀';
                if (vifPosition) vifPosition.textContent = '대리';
                if (vifApplyDate) {
                    const today = new Date();
                    vifApplyDate.textContent = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                }

                // 달력 렌더링
                renderCalendar();

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

    function setApprovalLine() {
        // 실제로는 로그인 사용자 정보 기반으로 서버에서 결재라인을 가져와야 함
        // 테스트용 더미 데이터
        const approvalLine = [
            { role: '담당', name: '홍길동', id: 'user001' },
            { role: '부서장', name: '김부장', id: 'manager001' },
            { role: '대표이사', name: '이대표', id: 'ceo001' }
        ];

        approvalLine.forEach(approver => {
            // 결재자 이름 설정
            const nameSpan = document.querySelector(`.approver-name[data-role="${approver.role}"]`);
            if (nameSpan) {
                nameSpan.textContent = approver.name;
            }

            // 결재 셀에 approver-id 설정
            const signCell = document.querySelector(`.approval-sign-cell[data-role="${approver.role}"]`);
            if (signCell) {
                signCell.setAttribute('data-approver-id', approver.id);
            }
        });
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
            vifApplicant.textContent = userVacationInfo.empName || '홍길동';
        }
        if (vifDepartment) {
            vifDepartment.textContent = userVacationInfo.empDeptName || userVacationInfo.empDept || '개발팀';
        }
        if (vifPosition) {
            vifPosition.textContent = userVacationInfo.empPositionName || userVacationInfo.empPosition || '대리';
        }

        // 연차 잔액 표시 (우측 상단)
        const totalVacationElement = document.querySelector('.balance-value.total');
        const usedVacationElement = document.querySelector('.balance-value.used');
        const remainingVacationElement = document.querySelector('.balance-value.remaining');

        if (totalVacationElement) {
            totalVacationElement.textContent = `${userVacationInfo.totalDays || 15}일`;
        }
        if (usedVacationElement) {
            usedVacationElement.textContent = `${userVacationInfo.usedDays || 3}일`;
        }
        if (remainingVacationElement) {
            remainingVacationElement.textContent = `${userVacationInfo.remainingDays || 12}일`;
        }

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

        // 결재라인 정보 자동 설정
        setApprovalLine();
    }

    // 연차신청서 페이지인 경우 초기화 (사용자 정보 로드 → 기본 날짜 설정 → 개인정보 채우기)
    (async function() {
        // 1. 사용자 연차 정보 로드
        userVacationInfo = await fetchUserVacationInfo();

        // 2. 기본 날짜 설정 (3영업일 후)
        await setupVacationDefaultDates();

        // 3. 개인정보 채우기
        prefillPersonalInfo();
    })();

});
