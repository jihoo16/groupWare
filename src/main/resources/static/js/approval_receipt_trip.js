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
        }
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

            try {
                console.log('PDF 저장 시작 - 출장 페이지');

                const templateType = 'receipt-trip';

                if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
                    alert('PDF 라이브러리를 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
                    return;
                }

                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');

                allDivs = documentForm.querySelectorAll(':scope > div');
                console.log('찾은 div 개수:', allDivs.length);

                originalDisplays = Array.from(allDivs).map(div => div.style.display);

                if (allDivs.length < 2) {
                    alert('문서 구조를 찾을 수 없습니다. 영수증 처리(출장) 템플릿을 선택했는지 확인해주세요.');
                    return;
                }

                // 공통 정보 입력 영역 숨기고, 출장 관련 문서만 표시
                allDivs[0].style.display = 'none';
                for (let i = 1; i < allDivs.length; i++) {
                    allDivs[i].style.display = 'block';
                }

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

                // 출장 관련 문서 페이지들 처리
                for (let i = 1; i < allDivs.length; i++) {
                    console.log(`문서 ${i} 렌더링 중...`);

                    if (i > 1) {
                        pdf.addPage();
                    }

                    const canvas = await window.html2canvas(allDivs[i], renderOptions);
                    const canvasWidth = canvas.width;
                    const canvasHeight = canvas.height;

                    if (canvasWidth === 0 || canvasHeight === 0) {
                        throw new Error('Canvas 크기가 0입니다. 문서가 화면에 표시되어 있는지 확인하세요.');
                    }

                    const imgData = canvas.toDataURL('image/jpeg', 0.95);
                    const imgHeight = (canvasHeight * contentWidth) / canvasWidth;

                    pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, imgHeight);
                    console.log(`문서 ${i} 페이지 완료`);
                }

                // 파일명 생성
                const today = new Date();
                const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
                const fileName = `${dateStr}_출장.pdf`;

                console.log('PDF 저장:', fileName);
                pdf.save(fileName);

                alert('PDF가 저장되었습니다.');
            } catch (error) {
                console.error('PDF 생성 오류:', error);
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
