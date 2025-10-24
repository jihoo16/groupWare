// 연구비 증빙 - 출장 페이지 JavaScript
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

    // 출장 자동 채우기 기능
    function setupTripAutoFill() {
        const tripProject = document.getElementById('trip_project');
        const tripLocation = document.getElementById('trip_location');
        const tripDate = document.getElementById('trip_date');
        const tripPurpose = document.getElementById('trip_purpose');
        const tripTransport = document.getElementById('trip_transport');
        const tripLodging = document.getElementById('trip_lodging');
        const tripMeal = document.getElementById('trip_meal');
        const tripOther = document.getElementById('trip_other');
        const tripReporter = document.getElementById('trip_reporter');
        const tripResult = document.getElementById('trip_result');
        const addTripPersonBtn = document.getElementById('addTripPersonBtn');
        const removeTripPersonBtn = document.getElementById('removeTripPersonBtn');
        const tripPersonList = document.getElementById('tripPersonList');

        let tripPersons = [];

        // 출장 인원 목록 업데이트 함수
        function updateTripPersonList() {
            tripPersonList.innerHTML = '';
            tripPersons.forEach((person, index) => {
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;';

                const positionOptions = positions.map(pos =>
                    `<option value="${pos}" ${person.position === pos ? 'selected' : ''}>${pos}</option>`
                ).join('');

                row.innerHTML = `
                    <input type="checkbox" data-index="${index}" class="trip-checkbox" style="width: 18px; height: 18px; cursor: pointer;">
                    <input type="text" data-index="${index}" class="trip-dept" placeholder="부서명" value="${person.dept || ''}" style="flex: 1; padding: 5px;">
                    <select data-index="${index}" class="trip-position" style="flex: 1; padding: 5px;">
                        <option value="">직책 선택</option>
                        ${positionOptions}
                    </select>
                    <input type="text" data-index="${index}" class="trip-name" placeholder="성명" value="${person.name || ''}" style="flex: 1; padding: 5px;">
                `;
                tripPersonList.appendChild(row);
            });

            // 이벤트 리스너 추가
            document.querySelectorAll('.trip-dept, .trip-position, .trip-name').forEach(el => {
                el.addEventListener('input', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    if (this.classList.contains('trip-dept')) {
                        tripPersons[index].dept = this.value;
                    } else if (this.classList.contains('trip-position')) {
                        tripPersons[index].position = this.value;
                    } else if (this.classList.contains('trip-name')) {
                        tripPersons[index].name = this.value;
                    }
                    updateTripPersonDisplay();
                });

                el.addEventListener('change', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    if (this.classList.contains('trip-position')) {
                        tripPersons[index].position = this.value;
                        updateTripPersonDisplay();
                    }
                });
            });

            updateTripPersonDisplay();
        }

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

        // 인원 추가 버튼
        if (addTripPersonBtn) {
            addTripPersonBtn.addEventListener('click', function() {
                if (tripPersons.length >= 5) {
                    alert('최대 5명까지만 추가할 수 있습니다.');
                    return;
                }
                tripPersons.push({ dept: '연구소', position: '', name: '' });
                updateTripPersonList();
            });
        }

        // 인원 제거 버튼
        if (removeTripPersonBtn) {
            removeTripPersonBtn.addEventListener('click', function() {
                const checkboxes = document.querySelectorAll('.trip-checkbox:checked');
                if (checkboxes.length === 0) {
                    alert('제거할 인원을 선택해주세요.');
                    return;
                }

                const indicesToRemove = Array.from(checkboxes)
                    .map(cb => parseInt(cb.getAttribute('data-index')))
                    .sort((a, b) => b - a);

                indicesToRemove.forEach(index => {
                    tripPersons.splice(index, 1);
                });

                updateTripPersonList();
            });
        }

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

        // 출장기간 자동 채우기 및 작성일/복명일자 계산
        if (tripDate) {
            tripDate.addEventListener('input', function() {
                const value = this.value;
                if (value) {
                    const [year, month, day] = value.split('-');

                    // 출장품의서 출장기간 형식 (YYYY.MM.DD)
                    const dateDotFormatted = `${year}.${month}.${day}`;
                    document.querySelectorAll('.trip-auto-date').forEach(field => {
                        field.textContent = dateDotFormatted;
                    });

                    // 출장복명서 출장기간 형식 (YYYY.MM.DD)
                    document.querySelectorAll('.trip-auto-date-range').forEach(field => {
                        field.textContent = dateDotFormatted;
                    });

                    // 소요경비내역 일시 (YYYY.MM.DD)
                    document.querySelectorAll('.trip-auto-date-dot').forEach(field => {
                        field.textContent = dateDotFormatted;
                    });

                    // 작성일 계산 (출장기간 -1일, 주말 제외)
                    const tripDateObj = new Date(value);
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

                    // 복명일자 계산 (출장기간과 동일, YYYY년 MM월 DD일 형식)
                    document.querySelectorAll('.trip-auto-report-year').forEach(field => {
                        field.textContent = year;
                    });
                    document.querySelectorAll('.trip-auto-report-month').forEach(field => {
                        field.textContent = month.replace(/^0/, '');
                    });
                    document.querySelectorAll('.trip-auto-report-day').forEach(field => {
                        field.textContent = day.replace(/^0/, '');
                    });
                }
            });
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

        // 금액 계산 함수
        function calculateTotal() {
            const transport = parseInt(tripTransport.value) || 0;
            const lodging = parseInt(tripLodging.value) || 0;
            const meal = parseInt(tripMeal.value) || 0;
            const other = parseInt(tripOther.value) || 0;

            const total = transport + lodging + meal + other;

            // 날짜 가져오기
            const dateValue = tripDate ? tripDate.value : '';
            let dateLabel = '';
            if (dateValue) {
                const [year, month, day] = dateValue.split('-');
                dateLabel = `(${month}/${day})`;
            }

            // 교통비
            document.querySelectorAll('.trip-auto-transport').forEach(field => {
                field.textContent = transport.toLocaleString('ko-KR');
            });
            document.querySelectorAll('.trip-auto-transport-label').forEach(field => {
                field.textContent = `교통비${dateLabel}`;
            });

            // 숙박비
            document.querySelectorAll('.trip-auto-lodging').forEach(field => {
                field.textContent = lodging.toLocaleString('ko-KR');
            });
            document.querySelectorAll('.trip-auto-lodging-label').forEach(field => {
                field.textContent = `숙박비${dateLabel}`;
            });

            // 식비
            document.querySelectorAll('.trip-auto-meal').forEach(field => {
                field.textContent = meal.toLocaleString('ko-KR');
            });
            document.querySelectorAll('.trip-auto-meal-label').forEach(field => {
                field.textContent = `식비${dateLabel}`;
            });

            // 기타
            document.querySelectorAll('.trip-auto-other').forEach(field => {
                field.textContent = other.toLocaleString('ko-KR');
            });

            // 합계
            document.querySelectorAll('.trip-auto-total').forEach(field => {
                field.textContent = total.toLocaleString('ko-KR');
            });

            // 출장신청금액 (복명서에서 사용)
            document.querySelectorAll('.trip-auto-request-amount').forEach(field => {
                field.textContent = total.toLocaleString('ko-KR') + ' 원';
            });

            // 차액 계산
            document.querySelectorAll('.trip-auto-diff').forEach(field => {
                field.textContent = '0 원';
            });
        }

        // 각 금액 입력 필드에 이벤트 리스너 추가
        if (tripTransport) {
            tripTransport.addEventListener('input', calculateTotal);
            // 초기값 설정
            calculateTotal();
        }
        if (tripLodging) {
            tripLodging.addEventListener('input', calculateTotal);
        }
        if (tripMeal) {
            tripMeal.addEventListener('input', calculateTotal);
        }
        if (tripOther) {
            tripOther.addEventListener('input', calculateTotal);
        }
        if (tripDate) {
            tripDate.addEventListener('input', calculateTotal);
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
            const personNames = tripPersons
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

        // 초기 인원 설정
        tripPersons = [
            { dept: '연구소', position: '', name: '' }
        ];
        updateTripPersonList();
    }

    // 결재자 추가 버튼
    addApproverBtn.addEventListener('click', function() {
        loadEmployeeList();
        approverModal.classList.add('show');
    });

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
                console.log('PDF 저장 시작 - 출장 페이지');

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

                if (allDivs.length < 3) {
                    alert('문서 구조를 찾을 수 없습니다. 영수증 처리(출장) 템플릿을 선택했는지 확인해주세요.');
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

    // 초기 템플릿 로드 (출장)
    loadTemplate('receipt-trip');

    // 템플릿 전환 비활성화
    templateTreeHeaders.forEach(header => {
        header.style.pointerEvents = 'none';
    });
});
