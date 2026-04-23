// 문서 작성 페이지 JavaScript
document.addEventListener('DOMContentLoaded', async function() {
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
                    position: user.empPosition || '직급 미지정',
                    dept: user.empDept || '부서 미지정'
                }));
                console.log('직원 데이터 로드 완료:', employees.length + '명');
            } else {
                console.error('직원 데이터 로드 실패:', response.status);
                showError('직원 데이터를 불러오는데 실패했습니다. 관리자에게 문의하세요.');
            }
        } catch (error) {
            console.error('직원 데이터 로드 오류:', error);
            showError('직원 데이터를 불러오는데 실패했습니다.\n잠시 후 다시 시도해주세요.');
        }
    }

    // 초기 데이터 로드
    loadEmployees();

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

    // 전체 접기/열기 버튼
    let allExpanded = true; // 초기 상태는 모두 펼쳐진 상태
    if (expandAllBtn) {
        expandAllBtn.addEventListener('click', function() {
            const treeNodes = document.querySelectorAll('.tree-node');

            if (allExpanded) {
                // 모두 접기
                treeNodes.forEach(node => node.classList.remove('expanded'));
                this.innerHTML = '<i class="fas fa-chevron-up"></i> 전체 펼치기';
                allExpanded = false;
            } else {
                // 모두 펼치기
                treeNodes.forEach(node => node.classList.add('expanded'));
                this.innerHTML = '<i class="fas fa-chevron-down"></i> 전체 접기';
                allExpanded = true;
            }
        });
    }

    // 카테고리 노드 토글 (트리 확장/축소)
    categoryNodes.forEach(categoryNode => {
        categoryNode.addEventListener('click', function(e) {
            const treeNode = this.closest('.tree-node');
            treeNode.classList.toggle('expanded');

            // 전체 펼치기/접기 버튼 상태 업데이트
            updateExpandAllButton();
        });
    });

    // 전체 펼치기/접기 버튼 상태 업데이트
    function updateExpandAllButton() {
        if (!expandAllBtn) return;

        const treeNodes = document.querySelectorAll('.tree-node');
        const expandedNodes = document.querySelectorAll('.tree-node.expanded');

        if (expandedNodes.length === treeNodes.length) {
            expandAllBtn.innerHTML = '<i class="fas fa-chevron-down"></i> 전체 접기';
            allExpanded = true;
        } else if (expandedNodes.length === 0) {
            expandAllBtn.innerHTML = '<i class="fas fa-chevron-up"></i> 전체 펼치기';
            allExpanded = false;
        }
    }

    // 템플릿 선택 (문서 항목 클릭)
    templateTreeHeaders.forEach(header => {
        header.addEventListener('click', function() {
            // 모든 템플릿 헤더의 active 클래스 제거
            templateTreeHeaders.forEach(h => h.classList.remove('active'));
            // 클릭한 항목에 active 클래스 추가
            this.classList.add('active');

            // 템플릿 로드
            const template = this.getAttribute('data-template');
            loadTemplate(template);
        });
    });

    // 템플릿 로드
    function loadTemplate(templateKey) {
        if (!documentForm) return;

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

    // 결재자 추가 버튼
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
    }

    // 드래그 앤 드롭
    if (fileUploadArea) {
        fileUploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderColor = '#667eea';
            this.style.background = '#f5f7ff';
        });
    }

    if (fileUploadArea) {
        fileUploadArea.addEventListener('dragleave', function() {
            this.style.borderColor = '#ddd';
            this.style.background = 'white';
        });
    }

    if (fileUploadArea) {
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
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', function() {
            showSuccess('문서가 임시저장되었습니다.');
            // 실제로는 API 호출
        });
    }

    // 제출
    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            if (selectedApprovers.length === 0) {
                showWarning('결재자를 지정해주세요.');
                return;
            }

            if (await showConfirm('결재를 요청하시겠습니까?')) {
                // 실제로는 API 호출 후 result.documentIdx를 사용
                if (window.SignatureRender) {
                    SignatureRender.afterSave({
                        documentIdx: null, // TODO: API 응답의 result.documentIdx 사용
                        redirectUrl: '/approval',
                        successMessage: '결재 요청이 완료되었습니다.'
                    });
                } else {
                    await showSuccess('결재 요청이 완료되었습니다.');
                    window.location.href = '/approval';
                }
            }
        });
    }

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
                    showWarning('영수증 처리(회의록) 또는 영수증 처리(야근식대) 템플릿을 먼저 선택해주세요.');
                    return;
                }

                // jsPDF와 html2canvas 로드 확인
                if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
                    showWarning('PDF 라이브러리를 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
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
                        showError('문서 구조를 찾을 수 없습니다. 영수증 처리(회의록) 템플릿을 선택했는지 확인해주세요.');
                        return;
                    }

                    // 공통 정보 입력 영역 숨기고, 나머지는 모두 표시
                    allDivs[0].style.display = 'none'; // 공통 정보 입력
                    allDivs[1].style.display = 'block'; // 회의 품의서
                    allDivs[2].style.display = 'block'; // 회의록
                    allDivs[3].style.display = 'block'; // 참석자 명단
                } else if (templateType === 'receipt-overtime') {
                    if (allDivs.length < 3) {
                        showError('문서 구조를 찾을 수 없습니다. 영수증 처리(야근식대) 템플릿을 선택했는지 확인해주세요.');
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

                await showSuccess('PDF가 저장되었습니다.');
            } catch (error) {
                console.error('PDF 생성 오류:', error);
                showError('문서 생성 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.');
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

    // ============================================
    // 동행 인원 선택 기능
    // ============================================

    let selectedCompanions = [];
    const companionModal = document.getElementById('companionModal');
    const companionEmpty = document.getElementById('companionEmpty');
    const companionTableWrapper = document.getElementById('companionTableWrapper');
    const companionTableBody = document.getElementById('companionTableBody');
    const btnAddCompanion = document.getElementById('btnAddCompanion');
    const closeCompanionModal = document.getElementById('closeCompanionModal');
    const cancelCompanionBtn = document.getElementById('cancelCompanionBtn');
    const confirmCompanionBtn = document.getElementById('confirmCompanionBtn');
    const companionSearch = document.getElementById('companionSearch');
    const employeeTableBody = document.getElementById('employeeTableBody');

    // 동행 인원 빈 상태 클릭
    if (companionEmpty) {
        companionEmpty.addEventListener('click', openCompanionModal);
    }

    // 인원 추가 버튼 클릭
    if (btnAddCompanion) {
        btnAddCompanion.addEventListener('click', openCompanionModal);
    }

    // 동행 인원 선택 모달 열기
    function openCompanionModal() {
        if (!companionModal) return;
        loadCompanionEmployeeList();
        companionModal.classList.add('show');
    }

    // 직원 목록 로드 (테이블 형식)
    function loadCompanionEmployeeList() {
        if (!employeeTableBody) return;

        employeeTableBody.innerHTML = '';
        employees.forEach(emp => {
            const row = document.createElement('tr');
            row.dataset.employeeId = emp.id;

            // 이미 선택된 직원인지 확인
            const isSelected = selectedCompanions.some(c => c.id === emp.id);
            if (isSelected) {
                row.classList.add('selected');
            }

            row.innerHTML = `
                <td><input type="checkbox" class="employee-checkbox" data-id="${emp.id}" ${isSelected ? 'checked' : ''}></td>
                <td>${emp.name}</td>
                <td>${emp.dept}</td>
                <td>${emp.position}</td>
            `;

            // 행 클릭 시 체크박스 토글
            row.addEventListener('click', function(e) {
                if (e.target.tagName !== 'INPUT') {
                    const checkbox = this.querySelector('.employee-checkbox');
                    checkbox.checked = !checkbox.checked;
                    this.classList.toggle('selected');
                }
            });

            // 체크박스 클릭 시 행 선택 상태 변경
            const checkbox = row.querySelector('.employee-checkbox');
            checkbox.addEventListener('change', function() {
                row.classList.toggle('selected', this.checked);
            });

            employeeTableBody.appendChild(row);
        });
    }

    // 동행 인원 검색
    if (companionSearch) {
        companionSearch.addEventListener('input', function() {
            if (!employeeTableBody) return;

            const term = this.value.toLowerCase();
            const rows = employeeTableBody.querySelectorAll('tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            });
        });
    }

    // 동행 인원 확인 버튼
    if (confirmCompanionBtn) {
        confirmCompanionBtn.addEventListener('click', function() {
            if (!employeeTableBody) return;

            const checkedBoxes = employeeTableBody.querySelectorAll('.employee-checkbox:checked');
            selectedCompanions = [];

            checkedBoxes.forEach(checkbox => {
                const empId = parseInt(checkbox.dataset.id);
                const employee = employees.find(e => e.id === empId);
                if (employee) {
                    selectedCompanions.push(employee);
                }
            });

            updateCompanionTable();
            closeCompanionModalFn();
        });
    }

    // 동행 인원 모달 닫기
    function closeCompanionModalFn() {
        if (companionModal) {
            companionModal.classList.remove('show');
        }
        if (companionSearch) {
            companionSearch.value = '';
        }
    }

    if (closeCompanionModal) {
        closeCompanionModal.addEventListener('click', closeCompanionModalFn);
    }

    if (cancelCompanionBtn) {
        cancelCompanionBtn.addEventListener('click', closeCompanionModalFn);
    }

    // 모달 배경 클릭 시 닫기
    if (companionModal) {
        companionModal.addEventListener('click', function(e) {
            if (e.target === companionModal) {
                closeCompanionModalFn();
            }
        });
    }

    // 동행 인원 테이블 업데이트
    function updateCompanionTable() {
        if (!companionEmpty || !companionTableWrapper || !companionTableBody) return;

        if (selectedCompanions.length === 0) {
            // 빈 상태 표시
            companionEmpty.style.display = 'block';
            companionTableWrapper.style.display = 'none';
            companionTableBody.innerHTML = '';
            return;
        }

        // 테이블 표시, 빈 상태 숨김
        companionEmpty.style.display = 'none';
        companionTableWrapper.style.display = 'block';

        // 테이블 내용 생성
        companionTableBody.innerHTML = '';
        selectedCompanions.forEach((companion, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${companion.name}</td>
                <td>${companion.dept}</td>
                <td>${companion.position}</td>
                <td>
                    <button type="button" class="btn-remove-companion" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            `;

            // 삭제 버튼 이벤트
            const removeBtn = row.querySelector('.btn-remove-companion');
            removeBtn.addEventListener('click', function() {
                const idx = parseInt(this.dataset.index);
                selectedCompanions.splice(idx, 1);
                updateCompanionTable();
            });

            companionTableBody.appendChild(row);
        });
    }

    // 초기 템플릿 로드 (출장신청 페이지는 템플릿 선택 기능 없음)
    // loadTemplate('vacation');
});
