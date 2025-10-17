// 문서 작성 페이지 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // 요소 선택
    const approvalWriteForm = document.getElementById('approvalWriteForm');
    const addApproverBtn = document.getElementById('addApproverBtn');
    const approverSelectModal = document.getElementById('approverSelectModal');
    const cancelBtn = document.getElementById('cancelBtn');

    // 선택된 결재자 목록
    let selectedApprovers = [];

    // ========== 결재자 추가 ==========
    if (addApproverBtn) {
        addApproverBtn.addEventListener('click', () => openModal(approverSelectModal));
    }

    // 결재자 선택 모달 닫기
    const closeApproverSelectModal = document.getElementById('closeApproverSelectModal');
    if (closeApproverSelectModal) {
        closeApproverSelectModal.addEventListener('click', () => closeModal(approverSelectModal));
    }

    // 결재자 선택
    const approverItems = document.querySelectorAll('.approver-item');
    approverItems.forEach(item => {
        item.addEventListener('click', function() {
            const name = this.getAttribute('data-name');
            const position = this.getAttribute('data-position');
            const dept = this.getAttribute('data-dept');

            // 이미 선택된 결재자인지 확인
            const alreadySelected = selectedApprovers.find(a => a.name === name);

            if (!alreadySelected) {
                selectedApprovers.push({ name, position, dept });
                updateApproverList();
            }

            closeModal(approverSelectModal);
        });
    });

    // 결재자 목록 업데이트
    function updateApproverList() {
        const approverList = document.getElementById('approverList');
        approverList.innerHTML = '';

        selectedApprovers.forEach((approver, index) => {
            const approverElement = document.createElement('div');
            approverElement.className = 'selected-approver';
            approverElement.innerHTML = `
                <span>${index + 1}. ${approver.name} (${approver.position})</span>
                <button class="remove-approver" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            approverList.appendChild(approverElement);
        });

        // 결재자 제거 이벤트
        document.querySelectorAll('.remove-approver').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const index = parseInt(this.getAttribute('data-index'));
                selectedApprovers.splice(index, 1);
                updateApproverList();
            });
        });
    }

    // 결재자 검색
    const approverSearch = document.getElementById('approverSearch');
    if (approverSearch) {
        approverSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();

            approverItems.forEach(item => {
                const name = item.getAttribute('data-name').toLowerCase();
                const dept = item.getAttribute('data-dept').toLowerCase();
                const position = item.getAttribute('data-position').toLowerCase();

                if (name.includes(searchTerm) || dept.includes(searchTerm) || position.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

    // ========== 파일 업로드 ==========
    const fileInput = document.getElementById('attachment');
    const fileList = document.getElementById('fileList');
    let selectedFiles = [];

    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            selectedFiles = [...selectedFiles, ...files];
            updateFileList();
        });
    }

    function updateFileList() {
        fileList.innerHTML = '';

        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            // 파일 아이콘 선택
            let iconClass = 'fa-file';
            if (file.name.endsWith('.pdf')) iconClass = 'fa-file-pdf';
            else if (file.name.match(/\.(jpg|jpeg|png|gif)$/i)) iconClass = 'fa-file-image';
            else if (file.name.match(/\.(xls|xlsx)$/i)) iconClass = 'fa-file-excel';
            else if (file.name.match(/\.(doc|docx)$/i)) iconClass = 'fa-file-word';

            fileItem.innerHTML = `
                <i class="fas ${iconClass}"></i>
                <span>${file.name}</span>
                <button class="remove-file" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(fileItem);
        });

        // 파일 제거 이벤트
        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                selectedFiles.splice(index, 1);
                updateFileList();
            });
        });
    }

    // ========== 폼 제출 ==========
    if (approvalWriteForm) {
        approvalWriteForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // 결재선 체크
            if (selectedApprovers.length === 0) {
                showAlert('결재자를 선택해주세요.', 'warning');
                return;
            }

            // 폼 데이터 수집
            const formData = {
                type: document.getElementById('approvalType').value,
                urgency: document.getElementById('urgency').value,
                title: document.getElementById('title').value,
                description: document.getElementById('description').value,
                amount: document.getElementById('amount').value,
                startDate: document.getElementById('startDate').value,
                endDate: document.getElementById('endDate').value,
                approvers: selectedApprovers,
                files: selectedFiles.map(f => f.name)
            };

            console.log('새 문서 작성:', formData);

            // 성공 메시지
            showAlert('문서 작성이 성공적으로 제출되었습니다.', 'success');

            // 결재 문서 페이지로 이동
            setTimeout(() => {
                window.location.href = '/approval';
            }, 1500);
        });
    }

    // ========== 취소 버튼 ==========
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            if (confirm('작성 중인 내용이 있습니다. 정말 취소하시겠습니까?')) {
                window.location.href = '/approval';
            }
        });
    }

    // ========== 모달 공통 함수 ==========
    function openModal(modal) {
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modal) {
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    // 모달 배경 클릭 시 닫기
    if (approverSelectModal) {
        approverSelectModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this);
            }
        });
    }

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (approverSelectModal && approverSelectModal.classList.contains('show')) {
                closeModal(approverSelectModal);
            }
        }
    });
});

// ========== 알림 함수 ==========
function showAlert(message, type = 'info') {
    // 간단한 알림 구현 (실제로는 더 나은 알림 라이브러리 사용 권장)
    alert(message);
}
