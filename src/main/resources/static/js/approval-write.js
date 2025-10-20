// 문서 작성 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    let selectedApprovers = [];
    let selectedFiles = [];
    let selectedEmployee = null;

    // DOM 요소
    const templateItems = document.querySelectorAll('.template-item');
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

    // 문서 템플릿
    const templates = {
        'vacation': {
            title: '휴가 신청서',
            html: `
                <h2 class="doc-title">휴 가 신 청 서</h2>
                <table class="form-table">
                    <tr>
                        <th>신청자</th>
                        <td><input type="text" value="홍길동" readonly></td>
                        <th>부서</th>
                        <td><input type="text" value="개발팀" readonly></td>
                    </tr>
                    <tr>
                        <th>직급</th>
                        <td><input type="text" value="대리" readonly></td>
                        <th>신청일</th>
                        <td><input type="date" value="${new Date().toISOString().split('T')[0]}"></td>
                    </tr>
                    <tr>
                        <th>휴가 종류</th>
                        <td>
                            <select>
                                <option>연차</option>
                                <option>반차(오전)</option>
                                <option>반차(오후)</option>
                                <option>병가</option>
                                <option>경조사</option>
                            </select>
                        </td>
                        <th>기간</th>
                        <td><input type="text" placeholder="예: 1일"></td>
                    </tr>
                    <tr>
                        <th>시작일</th>
                        <td><input type="date"></td>
                        <th>종료일</th>
                        <td><input type="date"></td>
                    </tr>
                    <tr>
                        <th>사유</th>
                        <td colspan="3"><textarea placeholder="휴가 사유를 입력하세요"></textarea></td>
                    </tr>
                    <tr>
                        <th>비상연락처</th>
                        <td colspan="3"><input type="tel" placeholder="휴가 중 연락 가능한 전화번호"></td>
                    </tr>
                </table>
            `
        },
        'expense': {
            title: '지출 결의서',
            html: `
                <h2 class="doc-title">지 출 결 의 서</h2>
                <table class="form-table">
                    <tr>
                        <th>기안자</th>
                        <td><input type="text" value="홍길동" readonly></td>
                        <th>부서</th>
                        <td><input type="text" value="개발팀" readonly></td>
                    </tr>
                    <tr>
                        <th>신청일</th>
                        <td><input type="date" value="${new Date().toISOString().split('T')[0]}"></td>
                        <th>사용일</th>
                        <td><input type="date"></td>
                    </tr>
                    <tr>
                        <th>지출 항목</th>
                        <td colspan="3"><input type="text" placeholder="예: 사무용품 구매"></td>
                    </tr>
                    <tr>
                        <th>금액</th>
                        <td><input type="number" placeholder="금액 입력"></td>
                        <th>지급 방법</th>
                        <td>
                            <select>
                                <option>법인카드</option>
                                <option>개인 카드</option>
                                <option>현금</option>
                                <option>계좌이체</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th>사용 내역</th>
                        <td colspan="3"><textarea placeholder="상세 사용 내역을 입력하세요"></textarea></td>
                    </tr>
                    <tr>
                        <th>비고</th>
                        <td colspan="3"><textarea placeholder="추가 사항이 있으면 입력하세요"></textarea></td>
                    </tr>
                </table>
            `
        },
        'purchase': {
            title: '구매 요청서',
            html: `
                <h2 class="doc-title">구 매 요 청 서</h2>
                <table class="form-table">
                    <tr>
                        <th>요청자</th>
                        <td><input type="text" value="홍길동" readonly></td>
                        <th>부서</th>
                        <td><input type="text" value="개발팀" readonly></td>
                    </tr>
                    <tr>
                        <th>요청일</th>
                        <td><input type="date" value="${new Date().toISOString().split('T')[0]}"></td>
                        <th>필요일</th>
                        <td><input type="date"></td>
                    </tr>
                    <tr>
                        <th>구매 물품</th>
                        <td colspan="3"><input type="text" placeholder="물품명을 입력하세요"></td>
                    </tr>
                    <tr>
                        <th>수량</th>
                        <td><input type="number" placeholder="수량"></td>
                        <th>단가</th>
                        <td><input type="number" placeholder="단가"></td>
                    </tr>
                    <tr>
                        <th>총 금액</th>
                        <td colspan="3"><input type="number" placeholder="총 구매 금액"></td>
                    </tr>
                    <tr>
                        <th>구매 사유</th>
                        <td colspan="3"><textarea placeholder="구매가 필요한 사유를 입력하세요"></textarea></td>
                    </tr>
                    <tr>
                        <th>비고</th>
                        <td colspan="3"><textarea placeholder="선호 브랜드, 모델 등 추가 요청사항"></textarea></td>
                    </tr>
                </table>
            `
        },
        'weekly-report': {
            title: '주간 업무 보고',
            html: `
                <h2 class="doc-title">주 간 업 무 보 고</h2>
                <table class="form-table">
                    <tr>
                        <th>보고자</th>
                        <td><input type="text" value="홍길동" readonly></td>
                        <th>부서</th>
                        <td><input type="text" value="개발팀" readonly></td>
                    </tr>
                    <tr>
                        <th>보고 기간</th>
                        <td colspan="3"><input type="text" placeholder="예: 2025.01.13 ~ 2025.01.17"></td>
                    </tr>
                    <tr>
                        <th>금주 주요 업무</th>
                        <td colspan="3"><textarea placeholder="이번 주 수행한 주요 업무를 입력하세요" rows="5"></textarea></td>
                    </tr>
                    <tr>
                        <th>주요 성과</th>
                        <td colspan="3"><textarea placeholder="달성한 성과 및 결과물" rows="4"></textarea></td>
                    </tr>
                    <tr>
                        <th>주요 이슈</th>
                        <td colspan="3"><textarea placeholder="발생한 문제 및 이슈사항" rows="4"></textarea></td>
                    </tr>
                    <tr>
                        <th>차주 계획</th>
                        <td colspan="3"><textarea placeholder="다음 주 진행 예정 업무" rows="5"></textarea></td>
                    </tr>
                </table>
            `
        },
        'monthly-report': {
            title: '월간 업무 보고',
            html: `
                <h2 class="doc-title">월 간 업 무 보 고</h2>
                <table class="form-table">
                    <tr>
                        <th>보고자</th>
                        <td><input type="text" value="홍길동" readonly></td>
                        <th>부서</th>
                        <td><input type="text" value="개발팀" readonly></td>
                    </tr>
                    <tr>
                        <th>보고 월</th>
                        <td colspan="3"><input type="month" value="${new Date().toISOString().slice(0,7)}"></td>
                    </tr>
                    <tr>
                        <th>월간 주요 업무</th>
                        <td colspan="3"><textarea placeholder="이번 달 수행한 주요 업무" rows="6"></textarea></td>
                    </tr>
                    <tr>
                        <th>목표 대비 실적</th>
                        <td colspan="3"><textarea placeholder="설정한 목표와 달성 실적 비교" rows="5"></textarea></td>
                    </tr>
                    <tr>
                        <th>개선사항</th>
                        <td colspan="3"><textarea placeholder="개선이 필요한 사항" rows="4"></textarea></td>
                    </tr>
                    <tr>
                        <th>차월 계획</th>
                        <td colspan="3"><textarea placeholder="다음 달 주요 계획" rows="5"></textarea></td>
                    </tr>
                </table>
            `
        },
        'meeting': {
            title: '회의록',
            html: `
                <h2 class="doc-title">회 의 록</h2>
                <table class="form-table">
                    <tr>
                        <th>회의명</th>
                        <td colspan="3"><input type="text" placeholder="회의 제목"></td>
                    </tr>
                    <tr>
                        <th>작성자</th>
                        <td><input type="text" value="홍길동" readonly></td>
                        <th>일시</th>
                        <td><input type="datetime-local"></td>
                    </tr>
                    <tr>
                        <th>장소</th>
                        <td><input type="text" placeholder="회의 장소"></td>
                        <th>참석자</th>
                        <td><input type="text" placeholder="참석자 명단"></td>
                    </tr>
                    <tr>
                        <th>회의 목적</th>
                        <td colspan="3"><textarea placeholder="회의 목적 및 배경" rows="3"></textarea></td>
                    </tr>
                    <tr>
                        <th>회의 내용</th>
                        <td colspan="3"><textarea placeholder="논의된 주요 내용" rows="8"></textarea></td>
                    </tr>
                    <tr>
                        <th>결정 사항</th>
                        <td colspan="3"><textarea placeholder="회의를 통해 결정된 사항" rows="5"></textarea></td>
                    </tr>
                    <tr>
                        <th>Action Items</th>
                        <td colspan="3"><textarea placeholder="후속 조치 및 담당자" rows="4"></textarea></td>
                    </tr>
                </table>
            `
        },
        'business-trip': {
            title: '출장 신청서',
            html: `
                <h2 class="doc-title">출 장 신 청 서</h2>
                <table class="form-table">
                    <tr>
                        <th>신청자</th>
                        <td><input type="text" value="홍길동" readonly></td>
                        <th>부서</th>
                        <td><input type="text" value="개발팀" readonly></td>
                    </tr>
                    <tr>
                        <th>출장 유형</th>
                        <td>
                            <select>
                                <option>국내 출장</option>
                                <option>해외 출장</option>
                            </select>
                        </td>
                        <th>동반 인원</th>
                        <td><input type="number" value="1"></td>
                    </tr>
                    <tr>
                        <th>출장지</th>
                        <td colspan="3"><input type="text" placeholder="출장 목적지"></td>
                    </tr>
                    <tr>
                        <th>출장 기간</th>
                        <td><input type="date" placeholder="시작일"></td>
                        <th>~</th>
                        <td><input type="date" placeholder="종료일"></td>
                    </tr>
                    <tr>
                        <th>출장 목적</th>
                        <td colspan="3"><textarea placeholder="출장 목적 및 업무 내용" rows="4"></textarea></td>
                    </tr>
                    <tr>
                        <th>예상 경비</th>
                        <td colspan="3"><input type="number" placeholder="예상 출장 경비 (원)"></td>
                    </tr>
                    <tr>
                        <th>비고</th>
                        <td colspan="3"><textarea placeholder="추가 사항" rows="3"></textarea></td>
                    </tr>
                </table>
            `
        },
        'general': {
            title: '일반 기안서',
            html: `
                <h2 class="doc-title">기 안 서</h2>
                <table class="form-table">
                    <tr>
                        <th>기안자</th>
                        <td><input type="text" value="홍길동" readonly></td>
                        <th>부서</th>
                        <td><input type="text" value="개발팀" readonly></td>
                    </tr>
                    <tr>
                        <th>기안일</th>
                        <td colspan="3"><input type="date" value="${new Date().toISOString().split('T')[0]}"></td>
                    </tr>
                    <tr>
                        <th>제목</th>
                        <td colspan="3"><input type="text" placeholder="기안 제목"></td>
                    </tr>
                    <tr>
                        <th>기안 내용</th>
                        <td colspan="3"><textarea placeholder="기안 내용을 상세히 작성하세요" rows="15"></textarea></td>
                    </tr>
                    <tr>
                        <th>기대 효과</th>
                        <td colspan="3"><textarea placeholder="기안을 통해 기대되는 효과" rows="4"></textarea></td>
                    </tr>
                </table>
            `
        }
    };

    // 템플릿 선택
    templateItems.forEach(item => {
        item.addEventListener('click', function() {
            templateItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            const template = this.getAttribute('data-template');
            loadTemplate(template);
        });
    });

    // 템플릿 로드
    function loadTemplate(templateKey) {
        const template = templates[templateKey];
        if (template) {
            documentForm.innerHTML = template.html;
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

    // 초기 템플릿 로드
    loadTemplate('vacation');
});
