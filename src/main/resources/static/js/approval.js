// 결재 문서 페이지 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // 요소 선택
    const filterTabs = document.querySelectorAll('.tab-btn');
    const approvalCards = document.querySelectorAll('.approval-card');
    const newApprovalBtn = document.getElementById('newApprovalBtn');
    const viewButtons = document.querySelectorAll('.btn-view');

    // 모달 요소
    const newApprovalModal = document.getElementById('newApprovalModal');
    const approverSelectModal = document.getElementById('approverSelectModal');
    const approvalDetailModal = document.getElementById('approvalDetailModal');

    // 선택된 결재자 목록
    let selectedApprovers = [];

    // ========== 필터 탭 기능 ==========
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');

            // 탭 활성화
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // 카드 필터링
            approvalCards.forEach(card => {
                const status = card.getAttribute('data-status');

                if (filter === 'all') {
                    card.style.display = 'block';
                } else if (status === filter) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // ========== 새 결재 요청 모달 ==========
    if (newApprovalBtn) {
        newApprovalBtn.addEventListener('click', function() {
            openModal(newApprovalModal);
            selectedApprovers = [];
            updateApproverList();
        });
    }

    // 새 결재 모달 닫기
    const closeNewApprovalModal = document.getElementById('closeNewApprovalModal');
    const cancelNewApproval = document.getElementById('cancelNewApproval');

    if (closeNewApprovalModal) {
        closeNewApprovalModal.addEventListener('click', () => closeModal(newApprovalModal));
    }
    if (cancelNewApproval) {
        cancelNewApproval.addEventListener('click', () => closeModal(newApprovalModal));
    }

    // 결재자 추가 버튼
    const addApproverBtn = document.getElementById('addApproverBtn');
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

    // 파일 업로드
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

    // 새 결재 요청 폼 제출
    const newApprovalForm = document.getElementById('newApprovalForm');
    if (newApprovalForm) {
        newApprovalForm.addEventListener('submit', function(e) {
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

            console.log('새 결재 요청:', formData);

            // 성공 메시지
            showAlert('결재 요청이 성공적으로 제출되었습니다.', 'success');

            // 폼 초기화
            newApprovalForm.reset();
            selectedApprovers = [];
            selectedFiles = [];
            updateApproverList();
            updateFileList();

            closeModal(newApprovalModal);
        });
    }

    // ========== 결재 문서 상세보기 ==========
    viewButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.approval-card');
            showApprovalDetail(card);
        });
    });

    // 카드 클릭 시 상세보기
    approvalCards.forEach(card => {
        card.addEventListener('click', function() {
            showApprovalDetail(this);
        });
    });

    function showApprovalDetail(card) {
        const status = card.getAttribute('data-status');
        const type = card.querySelector('.approval-type span').textContent;
        const typeIcon = card.querySelector('.approval-type i').className;
        const title = card.querySelector('.approval-title').textContent;
        const desc = card.querySelector('.approval-desc').textContent;
        const statusBadge = card.querySelector('.status-badge').cloneNode(true);

        // 메타 정보 추출
        const metaItems = card.querySelectorAll('.meta-item');
        let drafter = '';
        let date = '';
        let amount = '';

        metaItems.forEach(item => {
            const text = item.textContent;
            if (text.includes('기안자:')) {
                drafter = text.replace('기안자:', '').trim();
            } else if (text.match(/\d{4}-\d{2}-\d{2}/)) {
                date = text.trim();
            } else if (text.includes('원')) {
                amount = text.trim();
            }
        });

        // 모달에 데이터 채우기
        document.querySelector('#approvalDetailModal .detail-type i').className = typeIcon;
        document.getElementById('detailType').textContent = type;
        document.getElementById('detailStatus').className = statusBadge.className;
        document.getElementById('detailStatus').textContent = statusBadge.textContent;
        document.getElementById('detailTitle').textContent = title;
        document.getElementById('detailDescription').textContent = desc;
        document.getElementById('detailDrafter').textContent = drafter;
        document.getElementById('detailDate').textContent = date;
        document.getElementById('detailAmount').textContent = amount || '-';

        // 반려 사유 표시/숨김
        const rejectionSection = document.getElementById('rejectionSection');
        const rejectionReason = card.querySelector('.rejection-reason');

        if (rejectionReason) {
            rejectionSection.style.display = 'block';
            document.getElementById('detailRejectionReason').innerHTML = rejectionReason.innerHTML;
        } else {
            rejectionSection.style.display = 'none';
        }

        // 결재/반려 버튼 표시 (결재 대기 상태일 때만)
        const approvalActions = document.getElementById('approvalActions');
        if (status === 'pending') {
            approvalActions.style.display = 'flex';
        } else {
            approvalActions.style.display = 'none';
        }

        openModal(approvalDetailModal);
    }

    // 상세보기 모달 닫기
    const closeDetailModal = document.getElementById('closeDetailModal');
    const closeDetailBtn = document.getElementById('closeDetailBtn');

    if (closeDetailModal) {
        closeDetailModal.addEventListener('click', () => closeModal(approvalDetailModal));
    }
    if (closeDetailBtn) {
        closeDetailBtn.addEventListener('click', () => closeModal(approvalDetailModal));
    }

    // 승인 버튼
    const approveBtn = document.getElementById('approveBtn');
    if (approveBtn) {
        approveBtn.addEventListener('click', function() {
            const comment = document.getElementById('commentInput').value;

            if (!comment.trim()) {
                showAlert('결재 의견을 입력해주세요.', 'warning');
                return;
            }

            console.log('승인:', {
                comment: comment,
                timestamp: new Date().toISOString()
            });

            showAlert('결재가 승인되었습니다.', 'success');
            closeModal(approvalDetailModal);

            // 실제로는 여기서 서버에 승인 요청을 보내고 페이지를 새로고침합니다
        });
    }

    // 반려 버튼
    const rejectBtn = document.getElementById('rejectBtn');
    if (rejectBtn) {
        rejectBtn.addEventListener('click', function() {
            const comment = document.getElementById('commentInput').value;

            if (!comment.trim()) {
                showAlert('반려 사유를 입력해주세요.', 'warning');
                return;
            }

            showConfirm('정말 반려하시겠습니까?', function() {
                console.log('반려:', {
                    comment: comment,
                    timestamp: new Date().toISOString()
                });

                showAlert('결재가 반려되었습니다.', 'success');
                closeModal(approvalDetailModal);

                // 실제로는 여기서 서버에 반려 요청을 보내고 페이지를 새로고침합니다
            });
        });
    }

    // 첨부파일 다운로드
    document.addEventListener('click', function(e) {
        if (e.target.closest('.btn-download')) {
            const attachmentItem = e.target.closest('.attachment-item');
            const fileName = attachmentItem.querySelector('span').textContent;
            console.log('파일 다운로드:', fileName);
            showAlert(`"${fileName}" 다운로드 기능은 추후 구현됩니다.`, 'info');
        }
    });

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
    [newApprovalModal, approverSelectModal, approvalDetailModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeModal(this);
                }
            });
        }
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (newApprovalModal && newApprovalModal.classList.contains('show')) {
                closeModal(newApprovalModal);
            } else if (approverSelectModal && approverSelectModal.classList.contains('show')) {
                closeModal(approverSelectModal);
            } else if (approvalDetailModal && approvalDetailModal.classList.contains('show')) {
                closeModal(approvalDetailModal);
            }
        }
    });
});
