// 주간업무보고 작성 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    let selectedFiles = [];

    // DOM 요소
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const submitBtn = document.getElementById('submitBtn');

    // ============================================
    // 템플릿 사이드바 접기/펼치기 기능
    // ============================================
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
            e.preventDefault();
            const category = this.closest('.menu-category');
            category.classList.toggle('expanded');
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
    // 파일 업로드 기능
    // ============================================
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
        if (selectedApprovers.length === 0) {
            alert('결재자를 지정해주세요.');
            return;
        }

        if (confirm('결재를 요청하시겠습니까?')) {
            alert('결재 요청이 완료되었습니다.');
            // 실제로는 API 호출 후 목록으로 이동
            window.location.href = '/approval';
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
});
