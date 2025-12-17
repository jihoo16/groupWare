// 연구비 증빙 - 회의록 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    let selectedApprovers = [];
    let selectedFiles = [];
    let selectedEmployee = null;
    let currentUser = null; // 현재 로그인한 사용자
    let projects = []; // 프로젝트 목록
    let projectMembers = []; // 선택된 프로젝트의 팀원 목록
    let currentAttendees = []; // 현재 추가된 참석자 목록 (전역으로 이동)

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
    const saveDraftBtn = document.getElementById('saveDraftBtn');
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
                    position: user.empPosition || '직급 미지정',
                    dept: user.empDept || '부서 미지정'
                }));
                console.log('직원 데이터 로드 완료:', employees.length + '명');
            } else {
                console.error('직원 데이터 로드 실패:', response.status);
                alert('직원 데이터를 불러오는데 실패했습니다. 관리자에게 문의하세요.');
            }
        } catch (error) {
            console.error('직원 데이터 로드 오류:', error);
            alert('직원 데이터를 불러오는데 오류가 발생했습니다.');
        }
    }

    // 현재 사용자 정보 로드
    async function loadCurrentUser() {
        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                currentUser = await response.json();
                console.log('현재 사용자 정보:', currentUser);
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
            return;
        }

        try {
            const response = await fetch(`/api/projects/${projectIdx}`);
            if (response.ok) {
                const project = await response.json();
                projectMembers = project.projectMembers || [];
                console.log('프로젝트 팀원 로드 성공:', projectMembers.length + '명');
                console.log('팀원 데이터:', projectMembers);
            } else {
                console.error('프로젝트 팀원 로드 실패');
                projectMembers = [];
            }
        } catch (error) {
            console.error('프로젝트 팀원 로드 오류:', error);
            projectMembers = [];
        }
    }

    // 페이지 로드 시 데이터 로드
    Promise.all([loadCurrentUser(), loadProjects(), loadEmployees()]).then(() => {
        console.log('초기 데이터 로드 완료');
        // 데이터 로드 후 템플릿 초기화
        loadTemplate('receipt-meeting');
    });

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
            if (templateKey === 'receipt-meeting') {
                setupReceiptAutoFill();
            }
        }
    }

    // 회의록 자동 채우기 기능
    function setupReceiptAutoFill() {
        const commonProject = document.getElementById('common_project');
        const commonAuthor = document.getElementById('common_author'); // 작성자 필드
        const commonDate = document.getElementById('common_date');
        const commonStartTime = document.getElementById('common_start_time');
        const commonEndTime = document.getElementById('common_end_time');
        const commonLocation = document.getElementById('common_location');
        const commonAmount = document.getElementById('common_amount');
        const attendeeArea = document.getElementById('attendeeArea');
        const attendeeList = document.getElementById('attendeeList');

        // 로컬 변수 대신 전역 currentAttendees 사용

        // 프로젝트 선택 드롭다운 설정
        if (commonProject && projects.length > 0) {
            // 기존 input을 select로 변경
            const selectElement = document.createElement('select');
            selectElement.id = 'common_project';
            selectElement.style.width = '100%';
            selectElement.style.padding = '8px';
            selectElement.style.border = '1px solid #ddd';
            selectElement.style.borderRadius = '4px';

            // 기본 옵션
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '프로젝트 선택';
            selectElement.appendChild(defaultOption);

            // 프로젝트 목록 추가
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.idx;
                option.textContent = project.projectName;
                option.dataset.projectName = project.projectName;
                selectElement.appendChild(option);
            });

            // 프로젝트 선택 시 팀원 로드
            selectElement.addEventListener('change', async function() {
                const projectIdx = this.value;
                const projectName = this.options[this.selectedIndex].dataset.projectName || '';

                // 자동 채우기
                document.querySelectorAll('.auto-project').forEach(field => {
                    field.value = projectName;
                });

                // 프로젝트 팀원 로드
                if (projectIdx) {
                    await loadProjectMembers(projectIdx);
                } else {
                    projectMembers = [];
                }
            });

            // input을 select로 교체
            if (commonProject.parentNode) {
                commonProject.parentNode.replaceChild(selectElement, commonProject);
            }
        }

        // 작성자 정보 자동 입력 (수정 가능하도록)
        if (commonAuthor && currentUser) {
            commonAuthor.value = currentUser.empName || '';
            commonAuthor.removeAttribute('readonly'); // 수정 가능하게 설정
        }

        // 회의록 참석자 정보 업데이트
        function updateMeetingMinutesAttendees() {
            const internalAttendees = currentAttendees.filter(a => a.name && a.name.trim());

            let allAttendeesText = '';

            // 내부 참석자
            if (internalAttendees.length > 0) {
                const names = internalAttendees.map(a => a.name.trim());
                allAttendeesText = names.join(', ') + '(파인씨앤아이)';
            }

            document.querySelectorAll('.auto-all-attendees').forEach(field => {
                field.textContent = allAttendeesText;
            });

            // 참석자 명단 테이블 업데이트
            const nameFields = document.querySelectorAll('.attendee-sig-name');
            const deptFields = document.querySelectorAll('.attendee-sig-dept');

            const totalFields = nameFields.length;
            const rowCount = totalFields / 2;

            nameFields.forEach(field => field.value = '');
            deptFields.forEach(field => field.value = '');

            internalAttendees.forEach((attendee, idx) => {
                let fieldIndex;
                if (idx < rowCount) {
                    fieldIndex = idx * 2;
                } else {
                    fieldIndex = (idx - rowCount) * 2 + 1;
                }

                if (nameFields[fieldIndex]) {
                    nameFields[fieldIndex].value = attendee.name;
                }
                if (deptFields[fieldIndex]) {
                    deptFields[fieldIndex].value = '파인씨앤아이';
                }
            });
        }

        // 회의 품의서 참석인원 업데이트
        function updateProposalAttendees() {
            const meetingPurposeRow = document.getElementById('meeting_purpose_row');
            if (!meetingPurposeRow) return;

            const meetingPurposeCell = document.querySelector('.meeting-purpose-cell');
            const meetingPurposeHeader = document.getElementById('meeting_purpose_header');

            const existingRows = document.querySelectorAll('.attendee-row');
            existingRows.forEach(row => row.remove());

            const grouped = {};
            currentAttendees.forEach(attendee => {
                const key = `내부_${attendee.dept}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        type: '내부',
                        dept: attendee.dept,
                        names: []
                    };
                }
                if (attendee.name) {
                    grouped[key].names.push(attendee.name);
                }
            });

            const groupedArray = Object.values(grouped);
            const minRows = 2;
            const rowsToAdd = Math.max(groupedArray.length, minRows);

            const totalRowspan = rowsToAdd + 1;
            if (meetingPurposeCell) {
                meetingPurposeCell.setAttribute('rowspan', totalRowspan);
            }
            if (meetingPurposeHeader) {
                meetingPurposeHeader.setAttribute('rowspan', totalRowspan);
            }

            let insertAfter = meetingPurposeRow;
            for (let i = 0; i < rowsToAdd; i++) {
                const row = document.createElement('tr');
                row.className = 'attendee-row';

                if (i < groupedArray.length) {
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
                    row.innerHTML = `
                        <td style="border: 1px solid #ddd; padding: 5px;">&nbsp;</td>
                        <td style="border: 1px solid #ddd; padding: 5px;">&nbsp;</td>
                        <td style="border: 1px solid #ddd; padding: 5px;">&nbsp;</td>
                    `;
                }

                insertAfter.parentNode.insertBefore(row, insertAfter.nextSibling);
                insertAfter = row;
            }
        }

        // 참석자 영역 클릭 시 모달 열기
        if (attendeeArea) {
            attendeeArea.addEventListener('click', function(e) {
                // 제거 버튼 클릭은 무시
                if (e.target.closest('.attendee-remove')) {
                    return;
                }
                openAttendeeModal();
            });
        }

        // 참석자 목록 렌더링 함수 (모달 방식)
        function renderAttendeeListInTemplate() {
            if (!attendeeList) return;

            if (currentAttendees.length === 0) {
                attendeeList.innerHTML = `
                    <div style="text-align: center; color: #94a3b8; font-size: 13px;">
                        <i class="fas fa-user-plus" style="font-size: 20px; margin-bottom: 6px;"></i>
                        <div>클릭하여 참석자 추가</div>
                    </div>
                `;
            } else {
                attendeeList.innerHTML = currentAttendees.map(attendee => `
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

            updateProposalAttendees();
            updateMeetingMinutesAttendees();
        }

        // 템플릿 내에서 참석자 제거
        window.removeAttendeeInTemplate = function(attendeeId) {
            currentAttendees = currentAttendees.filter(a => a.id !== attendeeId);
            renderAttendeeListInTemplate();

            // 모달이 열려있으면 모달도 업데이트
            const attendeeModal = document.getElementById('attendeeModal');
            if (attendeeModal && attendeeModal.classList.contains('show')) {
                renderAttendeeList2();
            }
        };

        // 전역 함수로 등록하여 모달에서 접근 가능하게
        window.addAttendeesToMeeting = function(persons) {
            persons.forEach(person => {
                if (!currentAttendees.some(a => a.id === person.id)) {
                    currentAttendees.push(person);
                }
            });
            renderAttendeeListInTemplate();
        };

        // 과제명 자동 채우기는 위 프로젝트 선택 시 처리됨

        // 날짜/시간 자동 채우기
        function updateDateTime() {
            const dateValue = commonDate ? commonDate.value : '';
            const startTimeValue = commonStartTime ? commonStartTime.value : '';
            const endTimeValue = commonEndTime ? commonEndTime.value : '';

            if (dateValue) {
                const [year, month, day] = dateValue.split('-');
                let formattedDate = `${year}.${month}.${day}.`;
                let formattedDateProposal = `${year}.${month}.${day}.`;

                if (startTimeValue && endTimeValue) {
                    const endTimeDisplay = endTimeValue === '00:00' ? '24:00' : endTimeValue;
                    formattedDate += ` ${startTimeValue}~${endTimeDisplay}`;
                    formattedDateProposal += `\n${startTimeValue} ~ ${endTimeDisplay}`;
                } else if (startTimeValue) {
                    formattedDate += ` ${startTimeValue}`;
                    formattedDateProposal += `\n${startTimeValue}`;
                }

                document.querySelectorAll('.auto-datetime').forEach(field => {
                    field.value = formattedDate;
                });

                document.querySelectorAll('.auto-datetime-proposal').forEach(field => {
                    field.textContent = formattedDateProposal;
                });

                // 회의 품의서 작성일
                const proposalDateElement = document.getElementById('proposal_date');
                if (proposalDateElement) {
                    const date = new Date(dateValue);
                    const dayOfWeek = date.getDay();

                    if (dayOfWeek === 1) {
                        date.setDate(date.getDate() - 3);
                    } else {
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
            commonDate.addEventListener('input', function() {
                updateDateTime();
                updateDocNumber();
            });
        }

        // 문서번호 업데이트 함수
        function updateDocNumber() {
            const dateValue = commonDate ? commonDate.value : '';
            if (dateValue) {
                const formattedDate = dateValue.replace(/-/g, '');
                const docNumber = `회의록-${formattedDate}-01`;

                const docNumberProposal = document.getElementById('doc_number_proposal');
                const docNumberAttendee = document.getElementById('doc_number_attendee');

                if (docNumberProposal) {
                    docNumberProposal.textContent = docNumber;
                }
                if (docNumberAttendee) {
                    docNumberAttendee.textContent = docNumber;
                }
            }
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
                document.querySelectorAll('.auto-purpose').forEach(field => {
                    field.value = value;
                });
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
                const roundedAmount = Math.ceil(amount / 30000) * 30000;
                const formattedRoundedAmount = roundedAmount.toLocaleString('ko-KR') + '원';

                document.querySelectorAll('.auto-amount-display, .auto-amount-display-2').forEach(field => {
                    field.textContent = formattedRoundedAmount;
                });
            });
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

        // 공식 문서 양식 토글 기능 설정
        setupDocumentFormToggle();

        setTimeout(initializeDefaultValues, 100);

        // 초기 참석자 설정
        currentAttendees = [];
        renderAttendeeListInTemplate();
    }

    // 공식 문서 양식 토글 기능
    function setupDocumentFormToggle() {
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
                console.log('PDF 저장 시작 - 회의록 페이지');

                // 로딩 모달 표시
                if (loadingModal) loadingModal.classList.add('active');
                updateProgress(0, '준비 중...');

                const templateType = 'receipt-meeting';

                if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
                    alert('PDF 라이브러리를 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
                    if (loadingModal) loadingModal.classList.remove('active');
                    return;
                }

                updateProgress(10, 'PDF 초기화 중...');

                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');

                updateProgress(15, '문서 구조 확인 중...');

                allDivs = documentForm.querySelectorAll(':scope > div');
                console.log('찾은 div 개수:', allDivs.length);

                originalDisplays = Array.from(allDivs).map(div => div.style.display);

                if (allDivs.length < 4) {
                    alert('문서 구조를 찾을 수 없습니다. 영수증 처리(회의록) 템플릿을 선택했는지 확인해주세요.');
                    if (loadingModal) loadingModal.classList.remove('active');
                    return;
                }

                updateProgress(20, '페이지 준비 중...');

                // 접힌 문서 양식을 임시로 펼치기
                const documentFormWrapper = document.querySelector('.document-form-wrapper');
                let wasCollapsed = false;
                if (documentFormWrapper && documentFormWrapper.classList.contains('collapsed')) {
                    wasCollapsed = true;
                    documentFormWrapper.classList.remove('collapsed');
                }

                // 공통 정보 입력 영역 숨기고, 나머지는 모두 표시
                allDivs[0].style.display = 'none';
                allDivs[1].style.display = 'block';
                allDivs[2].style.display = 'block';
                allDivs[3].style.display = 'block';

                await new Promise(resolve => setTimeout(resolve, 100));

                const renderOptions = {
                    scale: 3,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    imageTimeout: 0,
                    removeContainer: true
                };

                const pdfWidth = 210;
                const pdfHeight = 297;
                const margin = 10;
                const contentWidth = pdfWidth - (margin * 2);

                updateProgress(30, '회의 품의서 렌더링 중...');

                // 1. 회의 품의서 페이지
                console.log('회의 품의서 렌더링 중...');
                const proposalDiv = allDivs[1];

                if (!proposalDiv) {
                    throw new Error('회의 품의서를 찾을 수 없습니다.');
                }

                const proposalCanvas = await window.html2canvas(proposalDiv, renderOptions);
                const canvasWidth = proposalCanvas.width;
                const canvasHeight = proposalCanvas.height;

                if (canvasWidth === 0 || canvasHeight === 0) {
                    throw new Error('Canvas 크기가 0입니다. 문서가 화면에 표시되어 있는지 확인하세요.');
                }

                updateProgress(45, '회의 품의서 이미지 변환 중...');

                const proposalImgData = proposalCanvas.toDataURL('image/jpeg', 0.95);
                const imgHeight = (canvasHeight * contentWidth) / canvasWidth;

                pdf.addImage(proposalImgData, 'JPEG', margin, margin, contentWidth, imgHeight);
                console.log('회의 품의서 페이지 완료');

                updateProgress(55, '회의록 렌더링 중...');

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

                updateProgress(70, '회의록 이미지 변환 중...');

                const minutesImgData = minutesCanvas.toDataURL('image/jpeg', 0.95);
                const minutesImgHeight = (minutesCanvasHeight * contentWidth) / minutesCanvasWidth;

                pdf.addImage(minutesImgData, 'JPEG', margin, margin, contentWidth, minutesImgHeight);
                console.log('회의록 페이지 완료');

                updateProgress(80, '참석자 명단 렌더링 중...');

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

                updateProgress(90, '참석자 명단 이미지 변환 중...');

                const attendeeImgData = attendeeCanvas.toDataURL('image/jpeg', 0.95);
                const attendeeImgHeight = (attendeeCanvasHeight * contentWidth) / attendeeCanvasWidth;

                pdf.addImage(attendeeImgData, 'JPEG', margin, margin, contentWidth, attendeeImgHeight);
                console.log('참석자 명단 페이지 완료');

                updateProgress(95, 'PDF 파일 생성 중...');

                // 파일명 생성
                const dateInput = document.getElementById('common_date');
                let dateStr;
                if (dateInput && dateInput.value) {
                    dateStr = dateInput.value.replace(/-/g, '');
                } else {
                    const today = new Date();
                    dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
                }
                const fileName = `${dateStr}_회의록.pdf`;

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
                // 원래 display 상태 복원
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

    // 참석자 모달 관련
    const attendeeModal = document.getElementById('attendeeModal');
    const attendeeSearchInput = document.getElementById('attendeeSearchInput');

    // 참석자 목록 데이터 (프로젝트 팀원에서 가져옴)
    function getAttendeePersons() {
        // projectMembers를 참석자 형식으로 변환
        return projectMembers.map(member => ({
            id: member.employeeIdx,
            name: member.employeeName,
            position: member.employeePositionName || '-',
            dept: member.employeeDeptName || '-'
        }));
    }

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

    // 참석자 목록 렌더링
    function renderAttendeeList2(searchText = '') {
        const attendeeList2El = document.getElementById('attendeeList2');
        if (!attendeeList2El) {
            console.error('attendeeList2 요소를 찾을 수 없습니다.');
            return;
        }

        const attendeePersons = getAttendeePersons(); // 프로젝트 팀원에서 가져오기

        if (attendeePersons.length === 0) {
            attendeeList2El.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">프로젝트를 선택하면 팀원 목록이 표시됩니다.</div>';
            return;
        }

        const filtered = attendeePersons.filter(person => {
            const searchStr = (person.name + person.dept + person.position).toLowerCase();
            return searchStr.includes(searchText.toLowerCase());
        });

        attendeeList2El.innerHTML = filtered.map(person => {
            // 이미 추가된 참석자인지 확인
            const isAdded = currentAttendees.some(a => String(a.id) === String(person.id));
            const addedClass = isAdded ? ' added' : '';
            const onclickAttr = isAdded ? '' : `onclick="selectAttendee(${person.id})"`;


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

    // 참석자 선택
    window.selectAttendee = function(personId) {
        const items = document.querySelectorAll('#attendeeList2 .employee-item');
        items.forEach(item => {
            if (parseInt(item.getAttribute('data-id')) === personId) {
                // 이미 추가된 참석자는 선택 불가
                if (item.classList.contains('added')) {
                    return;
                }
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

        if (selectedItems.length === 0) {
            alert('참석자를 선택해주세요.');
            return;
        }

        const personsToAdd = [];
        const attendeePersons = getAttendeePersons(); // 프로젝트 팀원에서 가져오기

        selectedItems.forEach(item => {
            const personId = item.getAttribute('data-id');
            const person = attendeePersons.find(p => String(p.id) === String(personId));

            if (person) {
                personsToAdd.push({
                    id: String(personId),
                    name: person.name,
                    dept: person.dept,
                    position: person.position
                });
            }
        });

        console.log('추가할 참석자:', personsToAdd);

        // setupReceiptAutoFill에서 정의된 함수 호출
        if (window.addAttendeesToMeeting) {
            window.addAttendeesToMeeting(personsToAdd);
        }

        console.log('추가 후 currentAttendees:', currentAttendees);

        // 모달 목록 새로고침 (추가된 참석자에 체크마크 표시)
        renderAttendeeList2();

        // 모달 닫기
        closeAttendeeModal();
    };

    // 외부인력 모달 관련
    const externalPersonModal = document.getElementById('externalPersonModal');
    const externalPersonSearchInput = document.getElementById('externalPersonSearchInput');
    const externalPersonListEl = document.getElementById('externalPersonList');
    let allExternalPersons = [];

    // 외부인력 목록 로드
    async function loadExternalPersons() {
        try {
            const response = await fetch('/api/external-persons');
            if (response.ok) {
                allExternalPersons = await response.json();
                console.log('외부인력 로드 성공:', allExternalPersons.length + '명');
                renderExternalPersonList();
            } else {
                console.error('외부인력 목록 로드 실패');
            }
        } catch (error) {
            console.error('외부인력 목록 로드 오류:', error);
        }
    }

    // 외부인력 모달 열기
    window.openExternalPersonModal = function() {
        loadExternalPersons();
        if (externalPersonModal) {
            externalPersonModal.classList.add('show');
        }
    };

    // 외부인력 모달 닫기
    window.closeExternalPersonModal = function() {
        if (externalPersonModal) {
            externalPersonModal.classList.remove('show');
            // 검색 초기화
            if (externalPersonSearchInput) {
                externalPersonSearchInput.value = '';
            }
            // 선택 초기화
            const selectedItems = document.querySelectorAll('#externalPersonList .employee-item.selected');
            selectedItems.forEach(item => item.classList.remove('selected'));
        }
    };

    // 외부인력 목록 렌더링
    function renderExternalPersonList(searchText = '') {
        if (!externalPersonListEl) return;

        if (allExternalPersons.length === 0) {
            externalPersonListEl.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">등록된 외부인력이 없습니다.</div>';
            return;
        }

        const filtered = allExternalPersons.filter(person => {
            const searchStr = (person.name + person.companyName + person.position).toLowerCase();
            return searchStr.includes(searchText.toLowerCase());
        });

        externalPersonListEl.innerHTML = filtered.map(person => {
            // 이미 추가된 외부인력인지 확인
            const isAdded = currentAttendees.some(a => String(a.id) === String('ext_' + person.idx));
            const addedClass = isAdded ? ' added' : '';
            const onclickAttr = isAdded ? '' : `onclick="selectExternalPerson(${person.idx})"`;

            return `
                <div class="employee-item${addedClass}" data-id="${person.idx}" ${onclickAttr}>
                    <div class="employee-info">
                        <div class="employee-name">${person.name}</div>
                        <div class="employee-detail">${person.position} · ${person.companyName}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 외부인력 선택
    window.selectExternalPerson = function(personIdx) {
        const items = document.querySelectorAll('#externalPersonList .employee-item');
        items.forEach(item => {
            if (parseInt(item.getAttribute('data-id')) === personIdx) {
                // 이미 추가된 외부인력은 선택 불가
                if (item.classList.contains('added')) {
                    return;
                }
                item.classList.toggle('selected');
            }
        });
    };

    // 외부인력 검색
    if (externalPersonSearchInput) {
        externalPersonSearchInput.addEventListener('input', function(e) {
            renderExternalPersonList(e.target.value);
        });
    }

    // 선택된 외부인력 추가
    window.addSelectedExternalPersons = function() {
        const selectedItems = document.querySelectorAll('#externalPersonList .employee-item.selected');

        if (selectedItems.length === 0) {
            alert('외부인력을 선택해주세요.');
            return;
        }

        const personsToAdd = [];

        selectedItems.forEach(item => {
            const personIdx = item.getAttribute('data-id');
            const person = allExternalPersons.find(p => String(p.idx) === String(personIdx));

            if (person) {
                personsToAdd.push({
                    id: 'ext_' + person.idx, // 외부인력은 'ext_' 접두사 사용
                    name: person.name,
                    dept: person.companyName,
                    position: person.position
                });
            }
        });

        console.log('추가할 외부인력:', personsToAdd);

        // 참석자로 추가
        if (window.addAttendeesToMeeting) {
            window.addAttendeesToMeeting(personsToAdd);
        }

        // 모달 닫기
        closeExternalPersonModal();
    };

    // 신규 외부인력 등록
    window.createNewExternalPerson = async function() {
        const name = prompt('외부인력 이름을 입력하세요:');
        if (!name || !name.trim()) return;

        const companyName = prompt('회사명을 입력하세요:');
        if (!companyName || !companyName.trim()) return;

        const position = prompt('직급을 입력하세요:');
        if (!position || !position.trim()) return;

        try {
            const response = await fetch('/api/external-persons', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name.trim(),
                    companyName: companyName.trim(),
                    position: position.trim()
                })
            });

            if (response.ok) {
                const newPerson = await response.json();
                alert('외부인력이 등록되었습니다.');
                console.log('신규 외부인력 등록:', newPerson);

                // 목록 새로고침
                await loadExternalPersons();
            } else {
                alert('외부인력 등록에 실패했습니다.');
            }
        } catch (error) {
            console.error('외부인력 등록 오류:', error);
            alert('외부인력 등록 중 오류가 발생했습니다.');
        }
    };

    // 모달 외부 클릭 시 닫기
    if (externalPersonModal) {
        externalPersonModal.addEventListener('click', function(e) {
            if (e.target === externalPersonModal) {
                closeExternalPersonModal();
            }
        });
    }

    // 템플릿 전환 비활성화
    templateTreeHeaders.forEach(header => {
        header.style.pointerEvents = 'none';
    });
});
