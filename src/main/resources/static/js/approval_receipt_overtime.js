// 연구비 증빙 - 야근식대 페이지 JavaScript
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
            showError('직원 데이터를 불러오는데 오류가 발생했습니다.');
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
            if (templateKey === 'receipt-overtime') {
                setupOvertimeAutoFill();
                setupDocumentFormToggle();
            }
        }
    }

    // 야근식대 자동 채우기 기능
    function setupOvertimeAutoFill() {
        const otProject = document.getElementById('ot_project');
        const otManager = document.getElementById('ot_manager');
        const otApplicant = document.getElementById('ot_applicant');
        const otApprovalDate = document.getElementById('ot_approval_date');
        const otTitle = document.getElementById('ot_title');
        const otAmount = document.getElementById('ot_amount');
        const otContent = document.getElementById('ot_content');
        const overtimePersonArea = document.getElementById('overtimePersonArea');
        const overtimePersonList = document.getElementById('overtimePersonList');

        let overtimePersons = [];

        // IT 업무 내용 목록
        const taskOptions = [
            '데이터베이스 설계',
            '백엔드 API 개발',
            '프론트엔드 UI 개발',
            '시스템 아키텍처 설계',
            '코드 리뷰 및 품질 관리',
            '버그 수정 및 디버깅',
            '테스트 코드 작성',
            '배포 및 운영 환경 구축',
            '성능 최적화',
            '보안 취약점 분석',
            '클라우드 인프라 구축',
            '마이크로서비스 개발',
            '모바일 앱 개발',
            '웹 서비스 개발',
            '알고리즘 개발',
            '데이터 분석 및 시각화',
            '머신러닝 모델 개발',
            'DevOps 파이프라인 구축',
            '기술 문서 작성',
            'CI/CD 환경 구축'
        ];

        // 야근인원 영역 클릭 시 모달 열기
        if (overtimePersonArea) {
            overtimePersonArea.addEventListener('click', function(e) {
                // 제거 버튼 클릭은 무시
                if (e.target.closest('.overtime-person-remove')) {
                    return;
                }
                openOvertimePersonModal();
            });
        }

        // 야근 인원 목록 렌더링 함수 (모달 방식)
        function renderOvertimePersonListInTemplate() {
            if (!overtimePersonList) return;

            if (overtimePersons.length === 0) {
                overtimePersonList.innerHTML = `
                    <div style="text-align: center; color: #94a3b8; font-size: 13px;">
                        <i class="fas fa-user-plus" style="font-size: 20px; margin-bottom: 6px;"></i>
                        <div>클릭하여 야근인원 추가</div>
                    </div>
                `;
            } else {
                overtimePersonList.innerHTML = overtimePersons.map(person => `
                    <div class="trip-person-item">
                        <div class="trip-person-info">
                            <span class="name">${person.name}</span>
                            <span>${person.dept}</span>
                            <span>${person.position}</span>
                        </div>
                        <button type="button" class="trip-person-remove overtime-person-remove" onclick="removeOvertimePersonInTemplate('${person.id}')">
                            <i class="fas fa-times"></i> 제거
                        </button>
                    </div>
                `).join('');
            }

            updateOvertimeTable();
            updateContentText();
        }

        // 템플릿 내에서 야근인원 제거
        window.removeOvertimePersonInTemplate = function(personId) {
            overtimePersons = overtimePersons.filter(p => p.id !== personId);
            renderOvertimePersonListInTemplate();
        };

        // 전역 함수로 등록하여 모달에서 접근 가능하게
        window.addOvertimePersonsToOvertime = function(persons) {
            persons.forEach(person => {
                if (!overtimePersons.some(p => p.id === person.id)) {
                    overtimePersons.push({
                        id: person.id,
                        name: person.name,
                        dept: person.dept,
                        position: person.position,
                        time: '18:00 ~ 21:00',
                        endTime: '21:00',
                        task: ''
                    });
                }
            });
            renderOvertimePersonListInTemplate();
        };

        // 야근 인원 목록 업데이트 함수 (기존 방식, deprecated)
        function updateOvertimePersonList() {
            renderOvertimePersonListInTemplate();
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

            const totalCount = overtimePersons.filter(p => p.name).length;

            const contentText = `야근식대\n- 인원 : 총 ${totalCount}인\n- ${names}`;
            otContent.value = contentText;

            // 품의서에도 품의 내용 표시
            document.querySelectorAll('.ot-auto-content').forEach(field => {
                field.textContent = contentText;
            });
        }


        // 금액 기반 자동 인원 계산 (1인당 15,000원, 최소 1명)
        if (otAmount) {
            otAmount.addEventListener('input', function() {
                const amount = parseInt(this.value) || 0;

                if (amount > 0) {
                    // 15,000원 미만이어도 최소 1명
                    const totalPeople = Math.max(1, Math.ceil(amount / 15000));

                    overtimePersons = [];

                    for (let i = 0; i < totalPeople; i++) {
                        overtimePersons.push({ name: '', time: '18:00 ~ 21:00', endTime: '21:00', task: '' });
                    }

                    updateOvertimePersonList();
                }

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

        // 품의일자 자동 채우기 (야근 일자와 동일하게 적용)
        if (otApprovalDate) {
            otApprovalDate.addEventListener('input', function() {
                const value = this.value;
                if (value) {
                    const [year, month, day] = value.split('-');

                    // 품의일자 형식 (년월일)
                    const formatted = `${year}년 ${month}월 ${day}일`;
                    document.querySelectorAll('.ot-auto-approval-date').forEach(field => {
                        field.textContent = formatted;
                    });

                    // 야근 일자 형식 (년 월 일) - 야근 신청서용
                    const dateFormatted = `${year}년 ${month}월 ${day}일`;
                    document.querySelectorAll('.ot-auto-date').forEach(field => {
                        field.textContent = dateFormatted;
                    });

                    // 품의서 날짜 형식 (년/월/일)
                    const dateSlashFormatted = `${year}/${month}/${day}`;
                    document.querySelectorAll('.ot-auto-date-slash').forEach(field => {
                        field.textContent = dateSlashFormatted;
                    });

                    // 전체 날짜 형식 (년. 월. 일)
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
        const payTypeInput = document.querySelector('input[name="ot_pay_type"]');
        if (payTypeInput) {
            payTypeInput.addEventListener('input', function() {
                document.querySelectorAll('.ot-auto-pay-type').forEach(field => {
                    field.textContent = this.value;
                });
            });

            // 초기값 설정
            if (payTypeInput.value) {
                document.querySelectorAll('.ot-auto-pay-type').forEach(field => {
                    field.textContent = payTypeInput.value;
                });
            }
        }

        // 금액 표시 업데이트
        function updateAmountDisplay() {
            const actualAmount = parseInt(otAmount.value) || 0;
            const quantity = overtimePersons.length;

            // 품의 내역에는 1인당 15,000원 기준으로 표시
            const displayAmount = quantity * 15000;
            const formattedDisplayAmount = displayAmount.toLocaleString('ko-KR');

            // 실제 입력 금액 (실집행 금액용)
            const formattedActualAmount = actualAmount.toLocaleString('ko-KR');

            document.querySelectorAll('.ot-auto-amount').forEach(field => {
                field.textContent = formattedDisplayAmount;
            });

            document.querySelectorAll('.ot-auto-quantity').forEach(field => {
                field.textContent = quantity;
            });

            // 실집행 금액 업데이트
            document.querySelectorAll('.ot-auto-actual-amount').forEach(field => {
                field.textContent = formattedActualAmount;
            });
        }

        // 초기값 자동 채우기
        if (otApplicant && otApplicant.value) {
            document.querySelectorAll('.ot-auto-applicant').forEach(field => {
                field.textContent = otApplicant.value;
            });
        }

        if (otManager && otManager.value) {
            document.querySelectorAll('.ot-auto-manager').forEach(field => {
                field.textContent = otManager.value;
            });
        }

        // 초기화
        overtimePersons = [];
        renderOvertimePersonListInTemplate();
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

    // 임시저장
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', function() {
            showSuccess('문서가 임시저장되었습니다.');
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
                showSuccess('결재 요청이 완료되었습니다.');
                window.location.href = '/project/documents';
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
                console.log('PDF 저장 시작 - 야근식대 페이지');

                // 로딩 모달 표시
                if (loadingModal) loadingModal.classList.add('active');
                updateProgress(0, '준비 중...');

                const templateType = 'receipt-overtime';

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
                    compress: false,  // 압축 비활성화로 최고 품질 유지
                    precision: 16     // 정밀도 향상
                });

                updateProgress(20, '문서 구조 확인 중...');

                allDivs = documentForm.querySelectorAll(':scope > div');
                console.log('찾은 div 개수:', allDivs.length);

                originalDisplays = Array.from(allDivs).map(div => div.style.display);

                if (allDivs.length < 3) {
                    showError('문서 구조를 찾을 수 없습니다. 영수증 처리(야근식대) 템플릿을 선택했는지 확인해주세요.');
                    if (loadingModal) loadingModal.classList.remove('active');
                    return;
                }

                updateProgress(30, '페이지 준비 중...');

                // 공통 정보 입력 영역 숨기고, 나머지는 모두 표시
                allDivs[0].style.display = 'none';
                allDivs[1].style.display = 'block';
                allDivs[2].style.display = 'block';

                await new Promise(resolve => setTimeout(resolve, 300));  // 렌더링 대기 시간 증가

                const renderOptions = {
                    scale: 5,  // 해상도 최대 향상 (4 → 5)
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    imageTimeout: 0,
                    removeContainer: true,
                    windowWidth: 2560,  // 더 큰 렌더링 영역
                    windowHeight: 1440,
                    letterRendering: true,  // 텍스트 렌더링 개선
                    foreignObjectRendering: false,  // 호환성 향상
                    onclone: function(clonedDoc) {
                        // 복제된 문서의 폰트 렌더링 개선
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

                updateProgress(40, '품의서 렌더링 중...');

                // 1. 품의서 페이지
                console.log('품의서 렌더링 중...');
                const proposalDiv = allDivs[1];

                if (!proposalDiv) {
                    throw new Error('품의서를 찾을 수 없습니다.');
                }

                const proposalCanvas = await window.html2canvas(proposalDiv, renderOptions);
                const canvasWidth = proposalCanvas.width;
                const canvasHeight = proposalCanvas.height;

                if (canvasWidth === 0 || canvasHeight === 0) {
                    throw new Error('Canvas 크기가 0입니다. 문서가 화면에 표시되어 있는지 확인하세요.');
                }

                updateProgress(60, '품의서 이미지 변환 중...');

                const proposalImgData = proposalCanvas.toDataURL('image/png');  // PNG로 변경 (무손실)

                // A4 페이지에 맞춰서 크기 조정 (가로 또는 세로 기준으로 맞춤)
                let imgWidth = contentWidth;
                let imgHeight = (canvasHeight * contentWidth) / canvasWidth;

                // 높이가 페이지를 넘으면 높이 기준으로 조정
                if (imgHeight > contentHeight) {
                    imgHeight = contentHeight;
                    imgWidth = (canvasWidth * contentHeight) / canvasHeight;
                }

                // 중앙 정렬
                const xOffset = margin + (contentWidth - imgWidth) / 2;
                const yOffset = margin + (contentHeight - imgHeight) / 2;

                pdf.addImage(proposalImgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
                console.log('품의서 페이지 완료');

                updateProgress(75, '야근 신청서 렌더링 중...');

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

                updateProgress(90, '야근 신청서 이미지 변환 중...');

                const overtimeImgData = overtimeCanvas.toDataURL('image/png');  // PNG로 변경 (무손실)

                // A4 페이지에 맞춰서 크기 조정
                let overtimeImgWidth = contentWidth;
                let overtimeImgHeight = (overtimeCanvasHeight * contentWidth) / overtimeCanvasWidth;

                // 높이가 페이지를 넘으면 높이 기준으로 조정
                if (overtimeImgHeight > contentHeight) {
                    overtimeImgHeight = contentHeight;
                    overtimeImgWidth = (overtimeCanvasWidth * contentHeight) / overtimeCanvasHeight;
                }

                // 중앙 정렬
                const overtimeXOffset = margin + (contentWidth - overtimeImgWidth) / 2;
                const overtimeYOffset = margin + (contentHeight - overtimeImgHeight) / 2;

                pdf.addImage(overtimeImgData, 'PNG', overtimeXOffset, overtimeYOffset, overtimeImgWidth, overtimeImgHeight);
                console.log('야근 신청서 페이지 완료');

                updateProgress(95, 'PDF 파일 생성 중...');

                // 파일명 생성
                const dateInput = document.getElementById('ot_approval_date');
                let dateStr;
                if (dateInput && dateInput.value) {
                    dateStr = dateInput.value.replace(/-/g, '');
                } else {
                    const today = new Date();
                    dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
                }
                const fileName = `${dateStr}_야근식대비.pdf`;

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

    // 야근인원 모달 관련
    const overtimePersonModal = document.getElementById('overtimePersonModal');
    const overtimePersonSearchInput = document.getElementById('overtimePersonSearchInput');

    // 초기 데이터 로드
    await loadEmployees();

    // 야근인원 목록 데이터 (직원 데이터와 동일하게 사용)
    // employees 배열을 직접 사용

    // 모달 열기 함수
    window.openOvertimePersonModal = function() {
        if (overtimePersonModal) {
            overtimePersonModal.classList.add('show');
            renderOvertimePersonList2();
        }
    };

    // 모달 닫기 함수
    window.closeOvertimePersonModal = function() {
        if (overtimePersonModal) {
            overtimePersonModal.classList.remove('show');
            // 검색 초기화
            if (overtimePersonSearchInput) {
                overtimePersonSearchInput.value = '';
                renderOvertimePersonList2('');
            }
            // 선택 초기화
            const selectedItems = document.querySelectorAll('#overtimePersonList2 .employee-item.selected');
            selectedItems.forEach(item => item.classList.remove('selected'));
        }
    };

    // 모달 외부 클릭 시 닫기
    if (overtimePersonModal) {
        overtimePersonModal.addEventListener('click', function(e) {
            if (e.target === overtimePersonModal) {
                closeOvertimePersonModal();
            }
        });
    }

    // 야근인원 목록 렌더링
    function renderOvertimePersonList2(searchText = '') {
        const overtimePersonList2El = document.getElementById('overtimePersonList2');
        if (!overtimePersonList2El) return;

        const filtered = employees.filter(person => {
            const searchStr = (person.name + person.dept + person.position).toLowerCase();
            return searchStr.includes(searchText.toLowerCase());
        });

        overtimePersonList2El.innerHTML = filtered.map(person => `
            <div class="employee-item" data-id="${person.id}" onclick="selectOvertimePerson(${person.id})">
                <div class="employee-info">
                    <div class="employee-name">${person.name}</div>
                    <div class="employee-detail">${person.position} · ${person.dept}</div>
                </div>
            </div>
        `).join('');
    }

    // 야근인원 선택
    window.selectOvertimePerson = function(personId) {
        const items = document.querySelectorAll('#overtimePersonList2 .employee-item');
        items.forEach(item => {
            if (parseInt(item.getAttribute('data-id')) === personId) {
                item.classList.toggle('selected');
            }
        });
    };

    // 검색 기능
    if (overtimePersonSearchInput) {
        overtimePersonSearchInput.addEventListener('input', function(e) {
            renderOvertimePersonList2(e.target.value);
        });
    }

    // 선택된 야근인원 추가
    window.addSelectedOvertimePersons = function() {
        const selectedItems = document.querySelectorAll('#overtimePersonList2 .employee-item.selected');
        const personsToAdd = [];

        selectedItems.forEach(item => {
            const personId = item.getAttribute('data-id');
            const person = employees.find(p => p.id === parseInt(personId));

            if (person) {
                personsToAdd.push({
                    id: personId,
                    name: person.name,
                    dept: person.dept,
                    position: person.position
                });
            }
        });

        // setupOvertimeAutoFill에서 정의된 함수 호출
        if (window.addOvertimePersonsToOvertime) {
            window.addOvertimePersonsToOvertime(personsToAdd);
        }

        // 모달 닫기
        closeOvertimePersonModal();
    };

    // 초기 템플릿 로드 (야근식대)
    loadTemplate('receipt-overtime');

    // 템플릿 전환 비활성화
    templateTreeHeaders.forEach(header => {
        header.style.pointerEvents = 'none';
    });

    // 오늘 날짜 자동 설정
    setTimeout(() => {
        const overtimeDate = document.getElementById('ot_approval_date');
        if (overtimeDate && !overtimeDate.value) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            overtimeDate.value = `${yyyy}-${mm}-${dd}`;
        }

        // 날짜 입력 필드 전체 영역 클릭 시 날짜 선택기 열기
        if (overtimeDate) {
            overtimeDate.addEventListener('click', function() {
                if (this.showPicker) {
                    this.showPicker();
                }
            });
        }
    }, 200);
});
