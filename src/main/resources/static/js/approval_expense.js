// 문서 작성 페이지 JavaScript
document.addEventListener('DOMContentLoaded', async function() {
    // 전역 변수
    let selectedApprovers = [];
    let selectedEmployee = null;
    let editIdx = null; // 수정 모드일 때 문서 idx

    // 첨부파일 관련 변수 (편집 모드 로드 전에 선언 필요)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    let itemReceiptFiles = { 0: [] };  // 항목별 영수증 { itemIndex: [File, ...] }
    let signedDocFiles = [];
    let deletedAttachmentIds = [];

    // DOM 요소
    const templateTreeHeaders = document.querySelectorAll('.tree-node-header[data-template]');
    const categoryNodes = document.querySelectorAll('.tree-node-header.category-node');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const documentForm = document.getElementById('documentForm');
    const addApproverBtn = document.getElementById('addApproverBtn');
    const approverChips = document.getElementById('approverChips');
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
            showError('직원 데이터를 불러오는데 오류가 발생했습니다.');
        }
    }

    // 로그인한 사용자 정보 로드
    function loadCurrentUserInfo() {
        if (window.CURRENT_USER && window.CURRENT_USER.idx) {
            const user = window.CURRENT_USER;

            // 부서/팀 표시 (부서명 우선, 없으면 부서 코드)
            const deptElement = document.getElementById('applicantDept');
            if (deptElement) {
                const deptName = user.empDeptName || user.empDept || '-';
                deptElement.textContent = deptName;
            }

            // 기안자 이름 표시
            const nameElement = document.getElementById('applicantName');
            if (nameElement) {
                nameElement.textContent = user.empName || '-';
            }

            console.log('로그인 사용자 정보 로드:', user.empName, user.empDeptName || user.empDept);

            // 미리보기 업데이트
            if (typeof updatePreview === 'function') {
                updatePreview();
            }
        } else {
            console.warn('로그인 정보가 없습니다.');
        }
    }

    // 초기 데이터 로드
    loadEmployees();
    loadCurrentUserInfo();

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


    // 입력값 검증
    function validateForm() {
        // 지출 내역 확인
        const expenseItems = document.querySelectorAll('.expense-item');
        if (expenseItems.length === 0) {
            showWarning('최소 1개의 지출 항목을 추가해주세요.');
            return false;
        }

        let hasValidItem = false;

        for (let i = 0; i < expenseItems.length; i++) {
            const item = expenseItems[i];
            const itemNumber = i + 1;

            const dateInput = item.querySelector('.date-input');
            const descInput = item.querySelector('.description-input');
            const shopInput = item.querySelector('.shop-input');
            const amountInput = item.querySelector('.amount-input');

            // 모든 필드가 비어있으면 건너뛰기 (빈 항목은 무시)
            const isEmpty = !dateInput?.value && !descInput?.value && !shopInput?.value && !amountInput?.value;
            if (isEmpty) {
                continue;
            }

            // 하나라도 입력된 경우 모든 필수 필드 검증
            if (!dateInput || !dateInput.value) {
                dateInput?.focus();
                return false;
            }

            if (!descInput || !descInput.value.trim()) {
                descInput?.focus();
                return false;
            }

            if (!shopInput || !shopInput.value.trim()) {
                shopInput?.focus();
                return false;
            }

            if (!amountInput || !amountInput.value.trim()) {
                amountInput?.focus();
                return false;
            }

            hasValidItem = true;
        }

        // 모든 항목이 비어있는 경우
        if (!hasValidItem) {
            showWarning('최소 1개의 지출 항목을 입력해주세요.');
            return false;
        }

        return true;
    }

    // 제출
    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            // 입력값 검증
            if (!validateForm()) {
                return;
            }

            const confirmed = await showConfirm('저장하시겠습니까?');
            if (confirmed) {
                try {
                    // 폼 데이터 수집
                    const formData = collectFormData();

                    // API 호출 (수정: PUT, 신규: POST)
                    const apiUrl = editIdx
                        ? `/api/approval/expense/${editIdx}`
                        : '/api/approval/expense';
                    const apiMethod = editIdx ? 'PUT' : 'POST';

                    const multipart = new FormData();
                    multipart.append('data', new Blob([JSON.stringify(formData)], { type: 'application/json' }));

                    // 항목별 영수증: DOM 순서대로 formIdx에 맞춰 전송
                    document.querySelectorAll('.expense-item').forEach((item, formIdx) => {
                        const dataIdx = item.dataset.itemIndex;
                        const files = itemReceiptFiles[dataIdx] || [];
                        files.forEach(f => multipart.append(`itemReceiptFiles_${formIdx}`, f));
                    });

                    signedDocFiles.forEach(f => multipart.append('signedDocFiles', f));

                    const response = await fetch(apiUrl, {
                        method: apiMethod,
                        body: multipart
                    });

                    if (!response.ok) {
                        throw new Error(`서버 응답 오류: ${response.status}`);
                    }

                    const result = await response.json();
                    console.log('지출승인서 저장 완료:', result);

                    if (window.SignatureRender && !editIdx) {
                        SignatureRender.afterSave({
                            documentIdx: result.documentIdx || result.idx,
                            redirectUrl: '/approval',
                            successMessage: '문서가 저장되었습니다.'
                        });
                    } else {
                        await Swal.fire({
                            icon: 'success',
                            title: editIdx ? '수정 완료' : '저장 완료',
                            text: editIdx ? '문서가 수정되었습니다.' : '문서가 저장되었습니다.',
                            confirmButtonText: '확인',
                            confirmButtonColor: '#28a745',
                        });
                        if (editIdx) {
                            window.location.href = `/approval/expense/detail?idx=${editIdx}`;
                        } else {
                            window.location.href = '/approval';
                        }
                    }
                } catch (error) {
                    console.error('저장 중 오류 발생:', error);
                    showError('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
                }
            }
        });
    }
    // 폼 데이터 수집 함수
    function collectFormData() {
        // 기본 정보
        const documentDate = document.getElementById('documentDate')?.dataset?.isoDate || '';
        const content      = document.getElementById('requestContent')?.value.trim() || '';

        // 사용자 정보 (세션에서 가져올 것이므로 프론트에서는 null로 전송)
        const userIdx = window.CURRENT_USER?.idx || null;

        // 지출 항목 수집
        const expenseItems = document.querySelectorAll('.expense-item');
        const expenseDetails = [];

        expenseItems.forEach((item, idx) => {
            const dateInput    = item.querySelector('.date-input')?.value;
            const descInput    = item.querySelector('.description-input')?.value.trim();
            const shopInput    = item.querySelector('.shop-input')?.value.trim();
            const pmInput      = item.querySelector('.payment-method-select')?.value || '개인카드';
            const amountInput  = item.querySelector('.amount-input')?.value.trim();
            const noteInput    = item.querySelector('.note-input')?.value.trim();

            // 빈 항목은 제외
            if (dateInput && descInput && shopInput && amountInput) {
                expenseDetails.push({
                    expenseDate:   dateInput,
                    description:   descInput,
                    shopName:      shopInput,
                    paymentMethod: pmInput,
                    amount:        parseInt(amountInput.replace(/,/g, ''), 10),
                    note:          noteInput || '',
                    sortOrder:     idx
                });
            }
        });

        const result = {
            userIdx: userIdx,
            documentDate: documentDate,
            content: content,
            expenseDetails: expenseDetails
        };
        if (deletedAttachmentIds.length > 0) {
            result.deletedAttachmentIds = deletedAttachmentIds;
        }
        return result;
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

                showSuccess('PDF가 저장되었습니다.');
            } catch (error) {
                console.error('PDF 생성 오류:', error);
                showError('PDF 생성 중 오류가 발생했습니다.\n' + error.message + '\n\n브라우저 콘솔(F12)을 확인해주세요.');
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
    // 지출품의서 전용 기능
    // ============================================

    // 오늘 날짜 자동 입력
    const autoTodayFields = document.querySelectorAll('.auto-today');
    const today = new Date().toISOString().split('T')[0];
    autoTodayFields.forEach(field => {
        field.value = today;
    });

    // 구버전 코드 삭제됨 - 새버전은 1670줄 이후 참조

    // 금액 합계 계산
    function calculateTotal() {
        const amountInputs = document.querySelectorAll('.amount-input');
        let total = 0;

        amountInputs.forEach(input => {
            const value = input.value.replace(/,/g, '');
            const amount = parseInt(value) || 0;
            total += amount;
        });

        // 합계 표시
        const totalAmountField = document.getElementById('totalAmount');
        const totalAmountCopyField = document.getElementById('totalAmountCopy');
        const formattedTotal = total.toLocaleString('ko-KR');

        if (totalAmountField) {
            totalAmountField.value = formattedTotal;
        }
        if (totalAmountCopyField) {
            totalAmountCopyField.value = formattedTotal;
        }

        // 한글 금액 변환
        updateKoreanAmount(total);
    }

    // 숫자를 한글로 변환
    function numberToKorean(num) {
        if (num === 0) return '영';

        const units = ['', '만', '억', '조'];
        const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
        const positions = ['', '십', '백', '천'];

        let result = '';
        let unitIndex = 0;

        while (num > 0) {
            const part = num % 10000;
            if (part > 0) {
                let partStr = '';
                let tempPart = part;
                let posIndex = 0;

                while (tempPart > 0) {
                    const digit = tempPart % 10;
                    if (digit > 0) {
                        if (digit === 1 && posIndex > 0) {
                            partStr = positions[posIndex] + partStr;
                        } else {
                            partStr = digits[digit] + positions[posIndex] + partStr;
                        }
                    }
                    tempPart = Math.floor(tempPart / 10);
                    posIndex++;
                }

                result = partStr + units[unitIndex] + result;
            }
            num = Math.floor(num / 10000);
            unitIndex++;
        }

        return result;
    }

    // 한글 금액 업데이트
    function updateKoreanAmount(total) {
        const koreanAmountSpan = document.getElementById('amountKorean');
        const amountNumberSpan = document.getElementById('amountNumber');

        if (koreanAmountSpan && amountNumberSpan) {
            const koreanText = total > 0 ? '일금 ' + numberToKorean(total) + '원' : '일금';
            koreanAmountSpan.textContent = koreanText;
            amountNumberSpan.textContent = '(₩ ' + total.toLocaleString('ko-KR') + ')';
        }
    }

    // ============================================
    // 새로운 구조: 입력 영역 + 미리보기 토글
    // ============================================

    // 미리보기 토글 버튼
    const documentFormToggle = document.getElementById('documentFormToggle');
    const documentFormWrapper = document.querySelector('.document-form-wrapper');

    if (documentFormToggle && documentFormWrapper) {
        documentFormToggle.addEventListener('click', function() {
            documentFormWrapper.classList.toggle('collapsed');
            this.classList.toggle('active');
        });
    }

    // 오늘 날짜를 YYYY-MM-DD 형식으로 반환
    function getTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 날짜 형식 변환 (YYYY-MM-DD → MM/DD)
    function formatDateForDisplay(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}/${day}`;
    }

    // 실시간 미리보기 업데이트
    function updatePreview() {
        // 기본 정보 업데이트
        const dept    = document.getElementById('applicantDept')?.textContent || '';
        const name    = document.getElementById('applicantName')?.textContent || '';
        const docDate = document.getElementById('documentDate')?.dataset?.isoDate || '';

        document.querySelectorAll('.auto-dept').forEach(el => { el.textContent = dept || '-'; });
        document.querySelectorAll('.auto-applicant').forEach(el => { el.textContent = name || '-'; });

        if (docDate) {
            const date = new Date(docDate);
            const formatted = date.getFullYear() + '. ' +
                              String(date.getMonth() + 1).padStart(2, '0') + '. ' +
                              String(date.getDate()).padStart(2, '0');
            document.querySelectorAll('.auto-date').forEach(el => { el.textContent = formatted; });
            document.querySelectorAll('.auto-doc-date').forEach(el => { el.textContent = formatted; });
        }

        // 지출 내역 테이블 업데이트
        updatePreviewTable();

        // 결제수단 표시 동기화 (payment method가 바뀔 때 현금/카드 재분류)
        syncPaymentAmountDisplay();
    }

    // 항목별 결제수단에 따라 현금/카드 금액 칸 업데이트
    function syncPaymentAmountDisplay() {
        let cashTotal = 0;
        let cardTotal = 0;

        document.querySelectorAll('.expense-item').forEach(item => {
            const pm  = item.querySelector('.payment-method-select')?.value || '';
            const val = item.querySelector('.amount-input')?.value.replace(/[^0-9]/g, '') || '';
            const amt = val ? parseInt(val) : 0;
            if (pm === '현금') {
                cashTotal += amt;
            } else {
                cardTotal += amt;
            }
        });

        const cashEl = document.getElementById('cashAmountDisplay');
        const cardEl = document.getElementById('cardAmountDisplay');
        if (cashEl) cashEl.textContent = cashTotal > 0 ? '₩ ' + cashTotal.toLocaleString('ko-KR') : '';
        if (cardEl) cardEl.textContent = cardTotal > 0 ? '₩ ' + cardTotal.toLocaleString('ko-KR') : '';
    }

    // 지출 내역 미리보기 테이블 업데이트
    function updatePreviewTable() {
        const previewBody = document.getElementById('expensePreviewBody');
        if (!previewBody) return;

        const expenseItems = document.querySelectorAll('.expense-item');

        previewBody.innerHTML = '';

        if (expenseItems.length === 0) {
            previewBody.innerHTML = '<tr><td class="empty-row" colspan="5">지출 내역이 없습니다</td></tr>';
            return;
        }

        // 항목 데이터 수집
        const rows = [];
        expenseItems.forEach(item => {
            const dateVal   = item.querySelector('.date-input')?.value || '';
            const descVal   = item.querySelector('.description-input')?.value || '';
            const shopVal   = item.querySelector('.shop-input')?.value || '';
            const pmVal     = item.querySelector('.payment-method-select')?.value || '';
            const amountVal = item.querySelector('.amount-input')?.value || '';
            const noteVal   = item.querySelector('.note-input')?.value || '';

            if (dateVal || descVal || shopVal || amountVal) {
                rows.push({ dateVal, descVal, shopVal, pmVal, amountVal, noteVal });
            }
        });

        // 공식문서에는 지출일 오름차순(과거순) 정렬
        rows.sort((a, b) => (a.dateVal < b.dateVal ? -1 : a.dateVal > b.dateVal ? 1 : 0));

        let hasData = rows.length > 0;
        rows.forEach(({ dateVal, descVal, shopVal, pmVal, amountVal, noteVal }) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="text-align: center;">${formatDateForDisplay(dateVal)}</td>
                <td>${descVal || '-'}</td>
                <td style="text-align: center;">${shopVal || '-'}</td>
                <td style="text-align: center;">${pmVal || '-'}</td>
                <td style="text-align: right;">${amountVal || '-'}</td>
                <td style="text-align: center;">${noteVal || '-'}</td>
            `;
            previewBody.appendChild(row);
        });

        if (!hasData) {
            previewBody.innerHTML = '<tr><td class="empty-row" colspan="6">입력된 지출 내역이 없습니다</td></tr>';
        }
    }

    // 지출 항목 추가
    let itemCounter = 1;
    const expenseItemsContainer = document.getElementById('expenseItemsContainer');
    const addRowBtnNew = document.getElementById('addRowBtn');

    const addRowBtnBottom = document.getElementById('addRowBtnBottom');
    if (addRowBtnBottom) {
        addRowBtnBottom.addEventListener('click', function() {
            addRowBtnNew?.click();
        });
    }

    if (addRowBtnNew && expenseItemsContainer) {
        addRowBtnNew.addEventListener('click', function() {
            itemCounter++;
            const newItem = document.createElement('div');
            newItem.className = 'expense-item';
            newItem.draggable = true;
            newItem.dataset.itemIndex = itemCounter;
            itemReceiptFiles[itemCounter] = [];
            newItem.innerHTML = `
                <span class="expense-item-number" title="드래그하여 순서 변경"><i class="fas fa-grip-vertical drag-handle-icon"></i><span class="item-num-text">${itemCounter}</span></span>
                <div class="expense-item-body">
                    <div class="form-row">
                        <div class="form-group" style="flex: 0 0 180px;">
                            <label><i class="fas fa-calendar-day"></i> 날짜</label>
                            <input type="text" class="form-input date-input expense-date-picker" placeholder="날짜 선택" readonly>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label><i class="fas fa-edit"></i> 적요</label>
                            <input type="text" class="form-input description-input" placeholder="지출 내역 입력">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label><i class="fas fa-store"></i> 상호</label>
                            <input type="text" class="form-input shop-input" placeholder="상호명 입력">
                        </div>
                        <div class="form-group" style="flex: 0 0 180px;">
                            <label><i class="fas fa-won-sign"></i> 금액</label>
                            <input type="text" class="form-input amount-input" placeholder="금액 입력" inputmode="numeric">
                        </div>
                        <div class="form-group" style="flex: 0 0 150px;">
                            <label><i class="fas fa-sticky-note"></i> 비고</label>
                            <input type="text" class="form-input note-input" placeholder="">
                        </div>
                        <div class="form-group" style="flex: 0 0 120px;">
                            <label><i class="fas fa-credit-card"></i> 결제수단</label>
                            <select class="form-input payment-method-select">
                                <option value="개인카드" selected>개인카드</option>
                                <option value="현금">현금</option>
                            </select>
                        </div>
                    </div>
                    <div class="item-receipt-row">
                        <div class="item-receipt-section" data-item-index="${itemCounter}">
                            <label class="item-receipt-btn">
                                <i class="fas fa-receipt"></i> 영수증 첨부
                                <input type="file" class="item-receipt-input" data-item-index="${itemCounter}" hidden accept="image/*,.pdf" multiple>
                            </label>
                            <div class="item-receipt-list"></div>
                        </div>
                    </div>
                </div>
                <button type="button" class="btn-remove-item" onclick="removeExpenseItem(this)">
                    <i class="fas fa-times"></i>
                </button>
            `;
            expenseItemsContainer.appendChild(newItem);
            setupItemReceiptInput(newItem);

            // 이전 항목의 날짜를 새 항목에 복사
            const allItems = expenseItemsContainer.querySelectorAll('.expense-item');
            const prevItem = allItems[allItems.length - 2];
            const prevDate = prevItem?.querySelector('.date-input')?.value || todayIso;
            const newDateInput = newItem.querySelector('.date-input');
            if (newDateInput) setDateInput(newDateInput, prevDate);

            // 새 항목을 활성으로 — 다음 paste 흐름 자동 연결
            if (typeof setActiveExpenseItem === 'function') setActiveExpenseItem(newItem);

            updateItemNumbers();
            updatePreview();
        });
    }

    // 항목 번호 재정렬 (전역 함수로 선언하여 HTML onclick에서 사용 가능)
    window.removeExpenseItem = function(button) {
        const item = button.closest('.expense-item');
        const container = document.getElementById('expenseItemsContainer');
        if (container && container.children.length > 1) {
            const idx = item.dataset.itemIndex;
            if (idx !== undefined) delete itemReceiptFiles[idx];
            // 활성 항목이었으면 다른 항목으로 이전
            const wasActive = (typeof activeExpenseItem !== 'undefined') && activeExpenseItem === item;
            item.remove();
            if (wasActive) {
                const next = container.querySelector('.expense-item');
                if (next && typeof setActiveExpenseItem === 'function') setActiveExpenseItem(next);
            }
            updateItemNumbers();
            calculateTotal();
            updatePreview();
        } else {
            showWarning('최소 1개의 항목은 유지되어야 합니다.');
        }
    };

    function updateItemNumbers() {
        const items = document.querySelectorAll('.expense-item');
        items.forEach((item, index) => {
            const numText = item.querySelector('.item-num-text');
            if (numText) {
                numText.textContent = index + 1;
            }
        });
        itemCounter = items.length;
    }

    // 입력 필드 변경 시 실시간 미리보기 업데이트 및 금액 포맷팅
    document.addEventListener('input', function(e) {
        // 일반 입력 필드 미리보기 업데이트
        if (e.target.matches('#requestContent, .date-input, .description-input, .shop-input, .note-input')) {
            updatePreview();
        }

        // 금액 입력 시 자동 포맷팅 + 합계 재계산 + 미리보기 업데이트
        if (e.target.classList.contains('amount-input')) {
            let value = e.target.value.replace(/[^0-9]/g, '');
            if (value) {
                e.target.value = parseInt(value).toLocaleString('ko-KR');
            }
            calculateTotal();
            updatePreview();
        }
    });

    // 결제수단 변경 시 처리
    document.addEventListener('change', function(e) {
        if (e.target.matches('.payment-method-select')) {
            const item = e.target.closest('.expense-item');
            const noteInput = item?.querySelector('.note-input');
            if (noteInput) {
                if (e.target.value === '현금') {
                    // 비어있거나 이전 자동입력값이면 [현금사용] 세팅
                    if (!noteInput.value.trim() || noteInput.value === '[현금사용]') {
                        noteInput.value = '[현금사용]';
                    }
                } else {
                    // 현금 아닌 것으로 바꿀 때 [현금사용] 자동입력값이면 제거
                    if (noteInput.value === '[현금사용]') {
                        noteInput.value = '';
                    }
                }
            }
            updatePreview();
        }
    });

    // 합계 계산 함수 개선
    const originalCalculateTotal = window.calculateTotal || function() {};

    calculateTotal = function() {
        let total = 0;
        const amountInputs = document.querySelectorAll('.amount-input');

        amountInputs.forEach(input => {
            const value = input.value.replace(/[^0-9]/g, '');
            if (value) {
                total += parseInt(value);
            }
        });

        // 입력 영역 합계 표시
        const totalDisplay = document.getElementById('totalAmountDisplay');
        if (totalDisplay) {
            totalDisplay.textContent = '₩ ' + total.toLocaleString('ko-KR');
        }

        // 미리보기 영역 합계 표시
        const autoTotals = document.querySelectorAll('.auto-total, .auto-total-copy');
        autoTotals.forEach(el => {
            el.textContent = '₩ ' + total.toLocaleString('ko-KR');
        });

        // 한글 금액 업데이트
        if (typeof updateKoreanAmount === 'function') {
            updateKoreanAmount(total);
        }

        // 결제수단에 따라 현금/카드 금액 표시
        syncPaymentAmountDisplay(total);

        return total;
    };

    // ============================================
    // 날짜 선택 모달 (Calendar Modal)
    // ============================================

    let currentCalendarYear = new Date().getFullYear();
    let currentCalendarMonth = new Date().getMonth();
    let activeInput = null; // 현재 선택 중인 input 요소
    let holidays = {}; // 공휴일 데이터 (년도별 캐시)
    let loadedYears = new Set(); // 로드된 년도 목록
    let vacationDates = []; // 휴가 날짜 목록 (YYYY-MM-DD 형식)

    const dateModal = document.getElementById('dateModal');
    const dateCalendarTitle = document.getElementById('dateCalendarTitle');
    const dateCalendarDays = document.getElementById('dateCalendarDays');
    const datePrevMonth = document.getElementById('datePrevMonth');
    const dateNextMonth = document.getElementById('dateNextMonth');

    // 공휴일 데이터 로드
    async function loadHolidaysByYear(year) {
        try {
            const response = await fetch(`/api/holidays?year=${year}`);
            if (!response.ok) {
                throw new Error(`${year}년 공휴일 데이터를 불러오는데 실패했습니다.`);
            }
            const yearHolidays = await response.json();
            console.log(`[Expense] ${year}년 공휴일 로드 완료:`, Object.keys(yearHolidays).length, '건');
            return yearHolidays;
        } catch (error) {
            console.error(`[Expense] ${year}년 공휴일 로드 실패:`, error);
            return {};
        }
    }

    // 특정 년도 공휴일 보장 (없으면 로드)
    async function ensureHolidaysLoaded(year) {
        if (!loadedYears.has(year)) {
            const yearHolidays = await loadHolidaysByYear(year);
            Object.assign(holidays, yearHolidays); // 기존 holidays 객체에 병합
            loadedYears.add(year);
            console.log(`[Expense] ${year}년 공휴일 캐시 추가`);
        }
    }

    // 휴가 날짜 데이터 로드
    async function loadVacationDates() {
        try {
            if (!window.CURRENT_USER || !window.CURRENT_USER.idx) {
                console.warn('[Expense] 로그인 정보가 없어 휴가 날짜를 불러올 수 없습니다.');
                return [];
            }

            const currentUser = window.CURRENT_USER;
            const currentYear = new Date().getFullYear();

            const response = await fetch(`/api/vacation/requested-dates?userIdx=${currentUser.idx}&year=${currentYear}`);
            if (!response.ok) {
                throw new Error('휴가 날짜를 가져오는데 실패했습니다.');
            }

            const dates = await response.json();
            console.log(`[Expense] 휴가 날짜 로드 완료:`, dates.length + '건');
            return dates;
        } catch (error) {
            console.error('[Expense] 휴가 날짜 로드 실패:', error);
            return [];
        }
    }

    // 날짜 포맷 함수
    function formatDateForInput(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    function formatDateForDisplay(dateStr) {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${month}/${day}`;
    }

    function formatDateFull(year, month, day) {
        return `${year}년 ${month + 1}월 ${day}일`;
    }

    // 오늘 날짜 체크
    function isToday(year, month, day) {
        const today = new Date();
        return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
    }

    // 미래 날짜 체크
    function isFutureDate(year, month, day) {
        const checkDate = new Date(year, month, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate > today;
    }

    // 공휴일 및 휴가 데이터 업데이트 (달력이 이미 렌더링된 후)
    function updateCalendarHolidays() {
        const allDays = dateCalendarDays.querySelectorAll('.date-calendar-day');

        allDays.forEach(dayEl => {
            const day = parseInt(dayEl.textContent);
            let dateStr;

            if (dayEl.classList.contains('other-month')) {
                // 이전달 또는 다음달 날짜 계산
                const firstDayOfWeek = new Date(currentCalendarYear, currentCalendarMonth, 1).getDay();
                const prevLastDate = new Date(currentCalendarYear, currentCalendarMonth, 0).getDate();

                if (day > 15) {
                    // 이전 달 날짜
                    const prevMonth = currentCalendarMonth - 1;
                    const prevYear = prevMonth < 0 ? currentCalendarYear - 1 : currentCalendarYear;
                    const prevMonthActual = prevMonth < 0 ? 11 : prevMonth;
                    dateStr = formatDateForInput(prevYear, prevMonthActual, day);
                } else {
                    // 다음 달 날짜
                    const nextMonth = currentCalendarMonth + 1;
                    const nextYear = nextMonth > 11 ? currentCalendarYear + 1 : currentCalendarYear;
                    const nextMonthActual = nextMonth > 11 ? 0 : nextMonth;
                    dateStr = formatDateForInput(nextYear, nextMonthActual, day);
                }
            } else {
                // 현재 달 날짜
                dateStr = formatDateForInput(currentCalendarYear, currentCalendarMonth, day);
            }

            // 공휴일 체크 및 클래스 추가
            if (holidays[dateStr] && !dayEl.classList.contains('holiday')) {
                dayEl.classList.add('holiday');
                console.log(`[Expense] ✓ 공휴일 업데이트: ${dateStr} = ${holidays[dateStr]}`);
            }

            // 휴가 날짜 체크 및 클래스 추가
            if (vacationDates.includes(dateStr) && !dayEl.classList.contains('vacation-day')) {
                dayEl.classList.add('vacation-day');
                console.log(`[Expense] ✓ 휴가 날짜 업데이트: ${dateStr}`);
            }
        });
    }

    // 달력 렌더링
    async function renderDateCalendar() {
        const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1);
        const lastDay = new Date(currentCalendarYear, currentCalendarMonth + 1, 0);
        const prevLastDay = new Date(currentCalendarYear, currentCalendarMonth, 0);

        // 이전달, 현재달, 다음달의 년도 공휴일 비동기 로드 (기다리지 않음)
        const prevMonthYear = new Date(currentCalendarYear, currentCalendarMonth - 1, 1).getFullYear();
        const nextMonthYear = new Date(currentCalendarYear, currentCalendarMonth + 1, 1).getFullYear();

        // 공휴일 및 휴가 데이터 백그라운드 로딩
        Promise.all([
            ensureHolidaysLoaded(prevMonthYear),
            ensureHolidaysLoaded(currentCalendarYear),
            ensureHolidaysLoaded(nextMonthYear),
            loadVacationDates().then(dates => { vacationDates = dates; })
        ]).then(() => {
            // 공휴일 및 휴가 데이터 로드 완료 후 달력 업데이트
            updateCalendarHolidays();
        });

        const firstDayOfWeek = firstDay.getDay();
        const lastDate = lastDay.getDate();
        const prevLastDate = prevLastDay.getDate();

        dateCalendarTitle.textContent = `${currentCalendarYear}년 ${currentCalendarMonth + 1}월`;
        dateCalendarDays.innerHTML = '';

        // 현재 선택된 날짜
        let selectedDateStr = activeInput ? activeInput.value : '';

        // 이전 달 날짜
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = prevLastDate - i;
            const prevMonthDate = new Date(currentCalendarYear, currentCalendarMonth - 1, day);
            const prevYear = prevMonthDate.getFullYear();
            const prevMonth = prevMonthDate.getMonth();
            const dateStr = formatDateForInput(prevYear, prevMonth, day);
            const dayOfWeek = prevMonthDate.getDay();

            let classes = 'date-calendar-day other-month';

            // 주말 체크
            if (dayOfWeek === 0) classes += ' sunday';
            if (dayOfWeek === 6) classes += ' saturday';

            // 선택된 날짜 표시
            if (dateStr === selectedDateStr) {
                classes += ' selected';
            }

            // 미래 날짜 체크
            if (isFutureDate(prevYear, prevMonth, day)) {
                classes += ' future-date';
            }

            const dayEl = document.createElement('div');
            dayEl.className = classes;
            dayEl.textContent = day;

            // 미래 날짜와 휴가 날짜가 아닌 경우만 클릭 가능
            if (!isFutureDate(prevYear, prevMonth, day) && !vacationDates.includes(dateStr)) {
                dayEl.addEventListener('click', () => {
                    selectCalendarDate(prevYear, prevMonth, day);
                });
            }

            dateCalendarDays.appendChild(dayEl);
        }

        // 현재 달 날짜
        for (let day = 1; day <= lastDate; day++) {
            const dayEl = document.createElement('div');
            const dayOfWeek = new Date(currentCalendarYear, currentCalendarMonth, day).getDay();

            let classes = 'date-calendar-day';

            if (isToday(currentCalendarYear, currentCalendarMonth, day)) {
                classes += ' today';
            }
            if (dayOfWeek === 0) {
                classes += ' sunday';
            }
            if (dayOfWeek === 6) {
                classes += ' saturday';
            }
            if (isFutureDate(currentCalendarYear, currentCalendarMonth, day)) {
                classes += ' future-date';
            }

            // 선택된 날짜 표시
            const dateStr = formatDateForInput(currentCalendarYear, currentCalendarMonth, day);
            if (dateStr === selectedDateStr) {
                classes += ' selected';
            }

            dayEl.className = classes;
            dayEl.textContent = day;

            // 미래 날짜와 휴가 날짜가 아닌 경우만 클릭 가능
            if (!isFutureDate(currentCalendarYear, currentCalendarMonth, day) && !vacationDates.includes(dateStr)) {
                dayEl.addEventListener('click', () => {
                    selectCalendarDate(currentCalendarYear, currentCalendarMonth, day);
                });
            }

            dateCalendarDays.appendChild(dayEl);
        }

        // 다음 달 날짜
        const remainingCells = 42 - dateCalendarDays.children.length;
        for (let day = 1; day <= remainingCells; day++) {
            const nextMonthDate = new Date(currentCalendarYear, currentCalendarMonth + 1, day);
            const nextYear = nextMonthDate.getFullYear();
            const nextMonth = nextMonthDate.getMonth();
            const dateStr = formatDateForInput(nextYear, nextMonth, day);
            const dayOfWeek = nextMonthDate.getDay();

            let classes = 'date-calendar-day other-month';

            // 주말 체크
            if (dayOfWeek === 0) classes += ' sunday';
            if (dayOfWeek === 6) classes += ' saturday';

            // 선택된 날짜 표시
            if (dateStr === selectedDateStr) {
                classes += ' selected';
            }

            // 미래 날짜 체크
            if (isFutureDate(nextYear, nextMonth, day)) {
                classes += ' future-date';
            }

            const dayEl = document.createElement('div');
            dayEl.className = classes;
            dayEl.textContent = day;

            // 미래 날짜와 휴가 날짜가 아닌 경우만 클릭 가능
            if (!isFutureDate(nextYear, nextMonth, day) && !vacationDates.includes(dateStr)) {
                dayEl.addEventListener('click', () => {
                    selectCalendarDate(nextYear, nextMonth, day);
                });
            }

            dateCalendarDays.appendChild(dayEl);
        }
    }

    // 날짜 선택
    function selectCalendarDate(year, month, day) {
        if (!activeInput) return;

        const dateStr = formatDateForInput(year, month, day);

        // 휴가 날짜인 경우 선택 불가
        if (vacationDates.includes(dateStr)) {
            showWarning('휴가 기간에는 지출을 신청할 수 없습니다.');
            return;
        }

        const displayStr = formatDateForDisplay(dateStr);

        activeInput.value = dateStr;
        activeInput.setAttribute('data-display', displayStr);

        // 미리보기 업데이트
        updatePreview();

        // 필수 필드 재검증 (input 이벤트가 발생하지 않으므로 직접 호출)
        if (typeof validateRequiredFields === 'function') validateRequiredFields();

        // 모달 닫기
        closeDateModal();
    }

    // 모달 열기
    async function openDateModal(inputElement) {
        activeInput = inputElement;
        dateModal.classList.add('show');

        // 현재 선택된 날짜가 있으면 해당 월로 이동
        if (inputElement.value) {
            const [year, month] = inputElement.value.split('-');
            currentCalendarYear = parseInt(year);
            currentCalendarMonth = parseInt(month) - 1;
        } else {
            // 없으면 오늘 날짜의 년/월로 설정
            const today = new Date();
            currentCalendarYear = today.getFullYear();
            currentCalendarMonth = today.getMonth();
        }

        await renderDateCalendar();
    }

    // 모달 닫기
    window.closeDateModal = function() {
        dateModal.classList.remove('show');
        activeInput = null;
    };

    // 이전 달
    if (datePrevMonth) {
        datePrevMonth.addEventListener('click', async () => {
            currentCalendarMonth--;
            if (currentCalendarMonth < 0) {
                currentCalendarMonth = 11;
                currentCalendarYear--;
            }
            await renderDateCalendar();
        });
    }

    // 다음 달
    if (dateNextMonth) {
        dateNextMonth.addEventListener('click', async () => {
            currentCalendarMonth++;
            if (currentCalendarMonth > 11) {
                currentCalendarMonth = 0;
                currentCalendarYear++;
            }
            await renderDateCalendar();
        });
    }

    // 모달 배경 클릭 시 닫기
    if (dateModal) {
        dateModal.addEventListener('click', (e) => {
            if (e.target === dateModal) {
                closeDateModal();
            }
        });
    }

    // 날짜 입력 필드 초기화
    function initializeDateInputs() {
        // 모든 날짜 입력 필드에 이벤트 리스너 추가
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('expense-date-picker')) {
                e.preventDefault();
                openDateModal(e.target);
            }
        });
    }

    // 오늘 날짜 ISO 문자열 (YYYY-MM-DD)
    const todayIso = new Date().toISOString().split('T')[0];

    // 기안일자 오늘 날짜 고정 세팅
    const docDateEl = document.getElementById('documentDate');
    if (docDateEl && docDateEl.tagName === 'DIV') {
        const now = new Date();
        const display = now.getFullYear() + '. ' +
                        String(now.getMonth() + 1).padStart(2, '0') + '. ' +
                        String(now.getDate()).padStart(2, '0');
        docDateEl.textContent = display;
        docDateEl.dataset.isoDate = todayIso;
    }

    // 날짜 입력 필드에 ISO 날짜 세팅 헬퍼
    function setDateInput(input, isoDate) {
        input.value = isoDate;
        input.setAttribute('data-display', formatDateForDisplay(isoDate));
        input.classList.remove('field-empty');
    }

    // 첫 번째 지출 항목 날짜 기본값: 오늘
    const firstDateInput = document.querySelector('.expense-date-picker');
    if (firstDateInput) {
        setDateInput(firstDateInput, todayIso);
    }

    // 초기화
    initializeDateInputs();
    updateItemNumbers();
    updatePreview();
    calculateTotal();

    // 클립보드 paste 활성 항목 추적용 상태
    // (수정 모드 렌더 직후 setActiveExpenseItem 을 호출해야 하므로 edit 블록보다 먼저 선언)
    let activeExpenseItem = null;

    // ============================================
    // 수정 모드: URL ?idx= 파라미터가 있으면 기존 데이터 로드
    // ============================================
    const _urlParams = new URLSearchParams(window.location.search);
    editIdx = _urlParams.get('idx');

    // 신규 작성 시에만 기간 중복 체크
    if (!editIdx) {
        try {
            const periodRes = await fetch('/api/approval/expense/check-period');
            if (periodRes.ok) {
                const periodData = await periodRes.json();
                if (periodData.exists) {
                    await Swal.fire({
                        icon: 'info',
                        title: '이번 달 개인경비 문서가 이미 있습니다',
                        html: `기간 <b>${periodData.periodStart} ~ ${periodData.periodEnd}</b> 내<br>이미 작성된 문서가 있어 해당 문서로 이동합니다.<br><small style="color:#64748b;">개인경비는 월 1건으로 관리됩니다.</small>`,
                        confirmButtonText: '확인'
                    });
                    window.location.href = `/approval/expense?idx=${periodData.documentIdx}`;
                    return;
                }
            }
        } catch (e) {
            console.warn('기간 중복 체크 실패:', e);
        }
    }

    if (editIdx) {
        // 페이지 제목 변경
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) pageTitle.innerHTML = '<i class="fas fa-won-sign"></i> 문서 수정 > 개인경비청구';

        try {
            const res = await fetch(`/api/approval/expense/${editIdx}`);
            if (res.status === 401) { window.location.href = '/login'; return; }
            if (res.status === 403) {
                await showWarning('본인 문서만 수정할 수 있습니다.');
                history.back();
                return;
            }
            if (!res.ok) throw new Error(`API ${res.status}`);

            const doc = await res.json();

            // 지출 내역 오름차순 정렬
            const details = (doc.expenseDetails || []).slice().sort(
                (a, b) => new Date(a.expenseDate) - new Date(b.expenseDate)
            );

            // 기존 항목 전부 제거 후 재생성
            const container = document.getElementById('expenseItemsContainer');
            if (container && details.length > 0) {
                container.innerHTML = '';

                details.forEach((d, i) => {
                    const div = document.createElement('div');
                    div.className = 'expense-item';
                    div.draggable = true;
                    div.dataset.itemIndex = i;
                    itemReceiptFiles[i] = [];
                    div.innerHTML = `
                        <span class="expense-item-number" title="드래그하여 순서 변경"><i class="fas fa-grip-vertical drag-handle-icon"></i><span class="item-num-text">${i + 1}</span></span>
                        <div class="expense-item-body">
                            <div class="form-row">
                                <div class="form-group" style="flex: 0 0 180px;">
                                    <label><i class="fas fa-calendar-day"></i> 날짜</label>
                                    <input type="text" class="form-input date-input expense-date-picker" placeholder="날짜 선택" readonly>
                                </div>
                                <div class="form-group" style="flex: 1;">
                                    <label><i class="fas fa-edit"></i> 적요</label>
                                    <input type="text" class="form-input description-input" placeholder="지출 내역 입력">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group" style="flex: 1;">
                                    <label><i class="fas fa-store"></i> 상호</label>
                                    <input type="text" class="form-input shop-input" placeholder="상호명 입력">
                                </div>
                                <div class="form-group" style="flex: 0 0 180px;">
                                    <label><i class="fas fa-won-sign"></i> 금액</label>
                                    <input type="text" class="form-input amount-input" placeholder="금액 입력" inputmode="numeric">
                                </div>
                                <div class="form-group" style="flex: 0 0 150px;">
                                    <label><i class="fas fa-sticky-note"></i> 비고</label>
                                    <input type="text" class="form-input note-input" placeholder="">
                                </div>
                                <div class="form-group" style="flex: 0 0 120px;">
                                    <label><i class="fas fa-credit-card"></i> 결제수단</label>
                                    <select class="form-input payment-method-select">
                                        <option value="개인카드">개인카드</option>
                                        <option value="현금">현금</option>
                                    </select>
                                </div>
                            </div>
                            <div class="item-receipt-row">
                                <div class="item-receipt-section" data-item-index="${i}">
                                    <label class="item-receipt-btn">
                                        <i class="fas fa-receipt"></i> 영수증 첨부
                                        <input type="file" class="item-receipt-input" data-item-index="${i}" hidden accept="image/*,.pdf" multiple>
                                    </label>
                                    <div class="item-receipt-list"></div>
                                </div>
                            </div>
                        </div>
                        <button type="button" class="btn-remove-item" onclick="removeExpenseItem(this)">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    container.appendChild(div);
                    setupItemReceiptInput(div);

                    // 각 필드에 값 세팅 (XSS 방지를 위해 .value로 직접 세팅)
                    const dateInput   = div.querySelector('.date-input');
                    const descInput   = div.querySelector('.description-input');
                    const shopInput   = div.querySelector('.shop-input');
                    const pmSelect    = div.querySelector('.payment-method-select');
                    const amountInput = div.querySelector('.amount-input');
                    const noteInput   = div.querySelector('.note-input');

                    if (dateInput && d.expenseDate) setDateInput(dateInput, d.expenseDate);
                    if (descInput)   descInput.value   = d.description   || '';
                    if (shopInput)   shopInput.value   = d.shopName      || '';
                    if (pmSelect)    pmSelect.value    = d.paymentMethod  || '개인카드';
                    if (amountInput) amountInput.value = d.amount ? Number(d.amount).toLocaleString('ko-KR') : '';
                    if (noteInput)   noteInput.value   = d.note          || '';

                    // 기존 항목별 영수증 렌더링
                    if (d.attachments && d.attachments.length > 0) {
                        renderItemServerAttachments(div, d.attachments);
                    }
                });
            }

            itemCounter = details.length;
            updateItemNumbers();
            calculateTotal();
            updatePreview();
            setTimeout(validateRequiredFields, 100);

            // 기존 첨부파일 렌더링
            renderServerAttachments(doc.attachments || []);

            // 수정 모드 렌더 후 첫 항목 활성화 (paste 흐름 자동 연결)
            const firstItemAfterRender = document.querySelector('.expense-item');
            if (firstItemAfterRender && typeof setActiveExpenseItem === 'function') {
                setActiveExpenseItem(firstItemAfterRender);
            }

        } catch (e) {
            console.error('[expense-edit] load failed:', e);
            showError('문서를 불러오는 데 실패했습니다.');
        }
    }

    // ============================================
    // 필수 필드 검증 (빨간 테두리 표시용)
    // ============================================

    // 필수 필드 전체 검증 — 빨간 테두리 부여 및 allFilled 반환
    // 저장 로직(validateForm)과 동일한 정책:
    //  - 완전히 빈 항목은 무시 (빨간 테두리 안 붙임)
    //  - 일부라도 입력된 항목은 4개 필드(날짜/적요/상호/금액) 모두 필수
    //  - 최소 1개의 완전한 항목 필요
    function validateRequiredFields() {
        let allFilled = true;

        const expenseItems = document.querySelectorAll('.expense-item');
        let hasCompleteItem = false;

        expenseItems.forEach(item => {
            const dateInput   = item.querySelector('.date-input');
            const descInput   = item.querySelector('.description-input');
            const shopInput   = item.querySelector('.shop-input');
            const amountInput = item.querySelector('.amount-input');

            const dateFilled   = !!dateInput?.value;
            const descFilled   = !!(descInput?.value?.trim());
            const shopFilled   = !!(shopInput?.value?.trim());
            const amountFilled = !!amountInput?.value;

            const isFullyEmpty = !dateFilled && !descFilled && !shopFilled && !amountFilled;

            if (isFullyEmpty) {
                // 완전히 빈 항목: 빨간 테두리 지우고 건너뛰기
                [dateInput, descInput, shopInput, amountInput].forEach(el => el?.classList.remove('field-empty'));
                return;
            }

            // 일부 입력된 항목: 빈 필드마다 빨간 테두리
            if (!dateFilled)   { dateInput?.classList.add('field-empty');   allFilled = false; } else dateInput?.classList.remove('field-empty');
            if (!descFilled)   { descInput?.classList.add('field-empty');   allFilled = false; } else descInput?.classList.remove('field-empty');
            if (!shopFilled)   { shopInput?.classList.add('field-empty');   allFilled = false; } else shopInput?.classList.remove('field-empty');
            if (!amountFilled) { amountInput?.classList.add('field-empty'); allFilled = false; } else amountInput?.classList.remove('field-empty');

            if (dateFilled && descFilled && shopFilled && amountFilled) {
                hasCompleteItem = true;
            }
        });

        if (!hasCompleteItem) allFilled = false;

        // 영수증·공식문서 첨부는 선택사항 (인쇄 도구 모드)
        // 인쇄 버튼은 작성/수정 페이지에서 항상 disabled (HTML에서 세팅됨, 상세 페이지에서만 인쇄)

        return allFilled;
    }

    // 필수 필드 이벤트 바인딩 (document 이벤트는 동적 항목도 처리)
    document.addEventListener('input', function(e) {
        if (e.target.matches('.date-input, .description-input, .shop-input, .amount-input')) {
            validateRequiredFields();
        }
    });


    // 항목 추가/삭제 시에도 재검증 (addRowBtn click 에 append)
    if (addRowBtnNew) {
        addRowBtnNew.addEventListener('click', function() {
            // 항목 추가 후 재검증 (기존 click 핸들러 이후 실행)
            setTimeout(validateRequiredFields, 0);
        });
    }

    // removeExpenseItem 래핑 — 삭제 후 재검증
    const _origRemoveExpenseItem = window.removeExpenseItem;
    window.removeExpenseItem = function(button) {
        _origRemoveExpenseItem(button);
        validateRequiredFields();
    };

    // 저장 버튼 — validateRequiredFields 재검증 후 진행
    const submitBtnHeader = document.getElementById('submitBtn');
    if (submitBtnHeader) {
        submitBtnHeader.addEventListener('click', function(e) {
            const isValid = validateRequiredFields();
            if (!isValid) {
                e.stopImmediatePropagation();
                const firstEmpty = document.querySelector('.field-empty');
                if (firstEmpty) {
                    showWarning('빨간 테두리로 표시된 빈 칸을 모두 채워주세요.');
                    firstEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstEmpty.focus({ preventScroll: true });
                } else {
                    showWarning('지출 항목을 먼저 입력해주세요.');
                    const firstDate = document.querySelector('.expense-item .date-input');
                    if (firstDate) {
                        firstDate.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        firstDate.focus({ preventScroll: true });
                    }
                }
            }
        }, true); // capture phase — 기존 핸들러보다 먼저 실행
    }

    // 인쇄 버튼 — 월 1건 제출 안내 후 window.print()
    const printBtnHeader = document.getElementById('printBtn');
    if (printBtnHeader) {
        printBtnHeader.addEventListener('click', async function() {
            // 검증
            if (!validateRequiredFields()) {
                const firstEmpty = document.querySelector('.field-empty');
                if (firstEmpty) {
                    // 일부 빈 칸 존재
                    showWarning('인쇄하기 전에 빨간 테두리로 표시된 빈 칸을 모두 채워주세요.');
                    firstEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstEmpty.focus({ preventScroll: true });
                } else {
                    // 모든 항목이 빈 상태
                    showWarning('지출 항목을 먼저 입력해주세요.');
                    const firstDate = document.querySelector('.expense-item .date-input');
                    if (firstDate) {
                        firstDate.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        firstDate.focus({ preventScroll: true });
                    }
                }
                return;
            }

            const confirmed = await Swal.fire({
                icon: 'info',
                title: '인쇄 전 확인',
                html: '개인경비는 <strong>한 달에 한 번만</strong> 제출 가능합니다.<br>인쇄한 문서에 사인을 받아 관리부에 제출해주세요.',
                showCancelButton: true,
                confirmButtonText: '인쇄하기',
                cancelButtonText: '취소',
                confirmButtonColor: '#2563eb',
            });
            if (!confirmed.isConfirmed) return;

            // 미리보기 접혀있으면 펼친 뒤 인쇄
            if (documentFormWrapper && documentFormWrapper.classList.contains('collapsed')) {
                documentFormWrapper.classList.remove('collapsed');
                if (documentFormToggle) documentFormToggle.classList.add('active');
            }
            setTimeout(() => { window.print(); }, 300);
        });
    }

    // 페이지 로드 시 초기 검증
    setTimeout(validateRequiredFields, 300);

    // ============================================
    // 첨부파일 업로드 (항목별 영수증 + 서명완료 공식문서)
    // ============================================

    /** 항목별 영수증 input change 이벤트 바인딩 + drag&drop */
    function setupItemReceiptInput(itemEl) {
        const input = itemEl.querySelector('.item-receipt-input');
        if (!input) return;

        // 단일 파일 추가 헬퍼 (change/drop/paste 모두 공유)
        function addFileToItem(file, idx) {
            if (file.size > MAX_FILE_SIZE) {
                showWarning(`파일 크기가 50MB를 초과합니다: ${file.name}`);
                return false;
            }
            if (!itemReceiptFiles[idx]) itemReceiptFiles[idx] = [];
            itemReceiptFiles[idx].push(file);
            return true;
        }

        input.addEventListener('change', function() {
            const idx = this.dataset.itemIndex;
            Array.from(this.files).forEach(file => addFileToItem(file, idx));
            this.value = '';
            rerenderItemReceipts(itemEl, idx);
            validateRequiredFields();
        });

        // drag & drop — 기존에는 빠져 있던 입력 방식 (§3.5 / §7-2)
        const section = itemEl.querySelector('.item-receipt-section');
        if (section) {
            // paste 안내 뱃지 — 활성 항목에서만 표시 (CSS 제어)
            if (typeof window.ensurePasteHint === 'function') {
                const hint = window.ensurePasteHint(section, {
                    text: '여기에 Ctrl+V 붙여넣기',
                    position: 'prepend',
                });
                // 영수증 첨부 버튼 다음 자리로 재배치
                const btn = section.querySelector(':scope > .item-receipt-btn');
                if (hint && btn && btn.parentElement === section) {
                    section.insertBefore(hint, btn.nextSibling);
                }
            }

            section.addEventListener('dragover', function(e) {
                e.preventDefault();
                section.classList.add('drag-over');
            });
            section.addEventListener('dragleave', function(e) {
                if (!section.contains(e.relatedTarget)) {
                    section.classList.remove('drag-over');
                }
            });
            section.addEventListener('drop', function(e) {
                e.preventDefault();
                section.classList.remove('drag-over');
                const idx = section.dataset.itemIndex;
                Array.from(e.dataTransfer.files).forEach(file => addFileToItem(file, idx));
                rerenderItemReceipts(itemEl, idx);
                validateRequiredFields();
            });
        }
    }

    // ============================================
    // 클립보드 이미지 붙여넣기 (패턴 A-1)
    // 활성 항목 추적 — 가장 최근 클릭/포커스된 .expense-item
    // (activeExpenseItem 변수는 파일 상단에서 선언됨)
    // ============================================

    function setActiveExpenseItem(itemEl) {
        if (!itemEl) return;
        if (activeExpenseItem === itemEl) return;
        // 모든 항목에서 .paste-active 제거 후 현재만 추가
        document.querySelectorAll('.expense-item.paste-active').forEach(el => {
            el.classList.remove('paste-active');
        });
        itemEl.classList.add('paste-active');
        activeExpenseItem = itemEl;
    }

    function setupExpenseItemPasteTracking() {
        const container = document.getElementById('expenseItemsContainer');
        if (!container) return;

        // 클릭/포커스로 활성 항목 전환
        container.addEventListener('focusin', function(e) {
            const item = e.target.closest('.expense-item');
            if (item) setActiveExpenseItem(item);
        });
        container.addEventListener('click', function(e) {
            const item = e.target.closest('.expense-item');
            if (item) setActiveExpenseItem(item);
        });

        // 페이지 진입 시 첫 항목 기본 활성
        const firstItem = container.querySelector('.expense-item');
        if (firstItem) setActiveExpenseItem(firstItem);

        // paste 핸들러 등록
        if (typeof window.setupClipboardImagePaste === 'function') {
            window.setupClipboardImagePaste({
                resolveTarget: () => {
                    if (!activeExpenseItem || !document.body.contains(activeExpenseItem)) {
                        // 활성 항목이 사라졌으면 첫 항목으로 폴백
                        const first = container.querySelector('.expense-item');
                        if (first) setActiveExpenseItem(first);
                        else return null;
                    }
                    const idx = activeExpenseItem.dataset.itemIndex;
                    const itemNumber = activeExpenseItem.querySelector('.item-num-text')?.textContent || '';
                    return {
                        addFile: (file) => {
                            if (file.size > MAX_FILE_SIZE) {
                                showWarning(`파일 크기가 50MB를 초과합니다: ${file.name}`);
                                return false;
                            }
                            if (!itemReceiptFiles[idx]) itemReceiptFiles[idx] = [];
                            itemReceiptFiles[idx].push(file);
                            rerenderItemReceipts(activeExpenseItem, idx);
                            validateRequiredFields();
                            // flash
                            activeExpenseItem.classList.remove('paste-flash');
                            void activeExpenseItem.offsetWidth;
                            activeExpenseItem.classList.add('paste-flash');
                            return true;
                        },
                        label: `지출 항목 ${itemNumber}`,
                    };
                },
            });
        }
    }

    /** 항목 내 영수증 파일 목록 렌더링 (서버 기존 파일 보존) */
    function rerenderItemReceipts(itemEl, idx) {
        const listEl = itemEl.querySelector('.item-receipt-list');
        if (!listEl) return;

        // 재렌더 직전 — 새 파일 칩의 blob URL 정리 (서버 칩은 건드리지 않음)
        listEl.querySelectorAll('.file-chip:not(.file-chip-server)').forEach(el => {
            if (typeof window.revokeChipThumbs === 'function') window.revokeChipThumbs(el);
            el.remove();
        });

        const files = itemReceiptFiles[idx] || [];
        files.forEach((file, fileIdx) => {
            const chip = document.createElement('span');
            chip.className = 'file-chip';

            // 이미지면 썸네일, 아니면 기존 아이콘
            const thumb = (typeof window.createImageThumbFromFile === 'function')
                ? window.createImageThumbFromFile(file) : null;
            if (thumb) {
                chip.appendChild(thumb);
            } else {
                const icon = document.createElement('i');
                icon.className = `fas ${getFileIcon(file.name)}`;
                chip.appendChild(icon);
            }

            const nameSpan = document.createElement('span');
            nameSpan.className = 'chip-name';
            nameSpan.textContent = file.name;
            chip.appendChild(nameSpan);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn-remove-chip';
            removeBtn.dataset.tip = '삭제';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.addEventListener('click', () => {
                if (typeof window.revokeChipThumbs === 'function') window.revokeChipThumbs(chip);
                itemReceiptFiles[idx].splice(fileIdx, 1);
                rerenderItemReceipts(itemEl, idx);
                validateRequiredFields();
            });
            chip.appendChild(removeBtn);

            listEl.appendChild(chip);
        });
    }

    /** 수정 모드 - 서버에서 받아온 기존 첨부파일을 하단에 렌더링 (DOCUMENT + RECEIPT) */
    function renderServerAttachments(attachments) {
        if (!attachments || attachments.length === 0) return;

        attachments.forEach(att => {
            // ITEM_RECEIPT는 항목별로 표시하므로 제외
            if (att.attachmentType === 'ITEM_RECEIPT') return;

            const listEl = document.getElementById('signedDocFileList');
            if (!listEl) return;

            const item = document.createElement('div');
            item.className = 'file-item';
            item.dataset.attachmentIdx = att.idx;
            item.innerHTML = `
                <i class="fas ${getFileIcon(att.originalFilename)}"></i>
                <span>${att.originalFilename} <small style="color:#94a3b8;">(${(att.fileSize / 1024).toFixed(1)} KB)</small></span>
                <button type="button" class="btn-download-file" data-tip="다운로드" style="background:none;border:none;cursor:pointer;color:#667eea;padding:3px 6px;font-size:13px;"><i class="fas fa-download"></i></button>
                <button type="button" class="btn-remove-file" data-tip="삭제"><i class="fas fa-times"></i></button>
            `;
            item.querySelector('.btn-download-file').addEventListener('click', () => {
                window.location.href = `/api/approval/expense/attachments/${att.idx}/download`;
            });
            item.querySelector('.btn-remove-file').addEventListener('click', () => {
                deletedAttachmentIds.push(att.idx);
                item.remove();
                validateRequiredFields();
            });
            listEl.appendChild(item);
        });
    }

    /** 수정 모드 - 항목별 기존 영수증을 해당 항목 내부에 렌더링 */
    function renderItemServerAttachments(itemEl, detailAttachments) {
        if (!detailAttachments || detailAttachments.length === 0) return;
        const listEl = itemEl.querySelector('.item-receipt-list');
        if (!listEl) return;

        detailAttachments.forEach(att => {
            const chip = document.createElement('span');
            chip.className = 'file-chip file-chip-server';
            chip.dataset.attachmentIdx = att.idx;

            const downloadUrl = `/api/approval/expense/attachments/${att.idx}/download`;

            // 이미지면 썸네일, 아니면 기존 아이콘
            const thumb = (typeof window.createImageThumbFromUrl === 'function')
                ? window.createImageThumbFromUrl(downloadUrl, att.originalFilename) : null;
            if (thumb) {
                chip.appendChild(thumb);
            } else {
                const icon = document.createElement('i');
                icon.className = `fas ${getFileIcon(att.originalFilename)}`;
                chip.appendChild(icon);
            }

            const nameSpan = document.createElement('span');
            nameSpan.className = 'chip-name';
            nameSpan.textContent = att.originalFilename;
            chip.appendChild(nameSpan);

            const downloadBtn = document.createElement('button');
            downloadBtn.type = 'button';
            downloadBtn.className = 'btn-download-chip';
            downloadBtn.dataset.tip = '다운로드';
            downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
            downloadBtn.addEventListener('click', () => {
                window.location.href = downloadUrl;
            });
            chip.appendChild(downloadBtn);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn-remove-chip';
            removeBtn.dataset.tip = '삭제';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.addEventListener('click', () => {
                deletedAttachmentIds.push(att.idx);
                chip.remove();
                validateRequiredFields();
            });
            chip.appendChild(removeBtn);

            listEl.appendChild(chip);
        });
    }

    function getFileIcon(name) {
        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return 'fa-file-image';
        if (/\.pdf$/i.test(name)) return 'fa-file-pdf';
        return 'fa-file';
    }

    function setupUpload(inputId, areaId, listId, filesArr, rerender) {
        const inputEl = document.getElementById(inputId);
        const areaEl  = document.getElementById(areaId);
        const listEl  = document.getElementById(listId);
        if (!inputEl || !areaEl || !listEl) return;

        function addFiles(files) {
            Array.from(files).forEach(file => {
                if (file.size > MAX_FILE_SIZE) {
                    showWarning(`파일 크기가 50MB를 초과합니다: ${file.name}`);
                    return;
                }
                filesArr.push(file);
            });
            rerender();
            validateRequiredFields();
        }

        inputEl.addEventListener('change', function() {
            addFiles(this.files);
            this.value = '';
        });

        areaEl.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderColor = '#667eea';
            this.style.background = '#f5f7ff';
        });

        areaEl.addEventListener('dragleave', function(e) {
            if (!this.contains(e.relatedTarget)) {
                this.style.borderColor = '';
                this.style.background = '';
            }
        });

        areaEl.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.borderColor = '';
            this.style.background = '';
            addFiles(e.dataTransfer.files);
        });
    }

    function renderUploadList(listId, filesArr, rerender) {
        const listEl = document.getElementById(listId);
        if (!listEl) return;
        listEl.innerHTML = '';
        filesArr.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <i class="fas ${getFileIcon(file.name)}"></i>
                <span>${file.name} <small style="color:#94a3b8;">(${(file.size / 1024).toFixed(1)} KB)</small></span>
                <button type="button" class="btn-remove-file" data-tip="삭제"><i class="fas fa-times"></i></button>
            `;
            item.querySelector('.btn-remove-file').addEventListener('click', () => {
                filesArr.splice(index, 1);
                rerender();
                validateRequiredFields();
            });
            listEl.appendChild(item);
        });
    }

    function rerenderSignedDoc() { renderUploadList('signedDocFileList', signedDocFiles, rerenderSignedDoc); }

    setupUpload('signedDocInput', 'signedDocUploadArea', 'signedDocFileList', signedDocFiles, rerenderSignedDoc);

    // 초기 항목(index=0)의 영수증 input 바인딩 (수정 모드에서는 이미 설정됨)
    if (!editIdx) {
        const firstItem = document.querySelector('.expense-item[data-item-index="0"]');
        if (firstItem) setupItemReceiptInput(firstItem);
    }

    // paste 기능 안내 배너 — 지출 내역 섹션 상단에 한 번만 주입
    const _itemsContainer = document.getElementById('expenseItemsContainer');
    if (_itemsContainer && _itemsContainer.parentElement && typeof window.ensurePasteInfoBanner === 'function') {
        const banner = window.ensurePasteInfoBanner(_itemsContainer.parentElement, {
            text: '영수증 이미지는 <b>원하는 항목을 클릭해 선택</b>한 뒤 <kbd>Ctrl</kbd>+<kbd>V</kbd> 로 바로 붙여넣을 수 있어요. (드래그&드롭, 파일선택도 가능)',
        });
        // .section-header 바로 뒤, items-container 바로 앞으로 이동
        if (banner && banner.parentElement === _itemsContainer.parentElement) {
            _itemsContainer.parentElement.insertBefore(banner, _itemsContainer);
        }
    }

    // ===========================
    // 지출 항목 Drag & Drop 순서 변경
    // ===========================
    (function initExpenseItemDragDrop() {
        const container = document.getElementById('expenseItemsContainer');
        if (!container) return;

        let dragItem = null;
        let handleClicked = false;

        // 드래그 핸들(.expense-item-number)에서만 드래그 허용
        container.addEventListener('mousedown', function(e) {
            const handle = e.target.closest('.expense-item-number');
            handleClicked = !!handle;
        });

        container.addEventListener('dragstart', function(e) {
            const item = e.target.closest('.expense-item');
            if (!item || !handleClicked) {
                e.preventDefault();
                return;
            }
            dragItem = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', ''); // Firefox 호환
        });

        container.addEventListener('dragover', function(e) {
            // 항목 순서 변경 중이 아니면(= 파일 드래그 등) 개입하지 않음
            if (!dragItem) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const afterElement = getDragAfterElement(container, e.clientY);
            if (afterElement) {
                container.insertBefore(dragItem, afterElement);
            } else {
                container.appendChild(dragItem);
            }
        });

        container.addEventListener('drop', function(e) {
            // 항목 순서 변경 drop만 처리, 파일 drop은 하위 핸들러에 위임
            if (!dragItem) return;
            e.preventDefault();
        });

        container.addEventListener('dragend', function(e) {
            if (dragItem) {
                dragItem.classList.remove('dragging');
                dragItem = null;
                handleClicked = false;
                updateItemNumbers();
                updatePreview();
            }
        });

        function getDragAfterElement(container, y) {
            const items = [...container.querySelectorAll('.expense-item:not(.dragging)')];
            return items.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset, element: child };
                }
                return closest;
            }, { offset: Number.NEGATIVE_INFINITY }).element || null;
        }
    })();

    // 클립보드 paste 활성 항목 추적 + 핸들러 등록
    setupExpenseItemPasteTracking();
});
