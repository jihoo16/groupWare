// 공통 알림 모달 스크립트

// 알림 모달 HTML 생성 및 추가
function initAlertModal() {
    // 이미 모달이 존재하면 리턴
    if (document.getElementById('commonAlertModal')) {
        return;
    }

    const modalHTML = `
        <div id="commonAlertModal" class="common-modal">
            <div class="common-modal-content">
                <div class="common-modal-header">
                    <div class="common-modal-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                </div>
                <div class="common-modal-body">
                    <p id="commonAlertMessage"></p>
                </div>
                <div class="common-modal-footer">
                    <button class="common-modal-btn" id="commonAlertOkBtn">확인</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // 확인 버튼 이벤트
    const okBtn = document.getElementById('commonAlertOkBtn');
    if (okBtn) {
        okBtn.addEventListener('click', function() {
            hideAlertModal();
        });
    }

    // 모달 배경 클릭 시 닫기
    const modal = document.getElementById('commonAlertModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideAlertModal();
            }
        });
    }

    // ESC 키로 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('commonAlertModal');
            if (modal && modal.classList.contains('show')) {
                hideAlertModal();
            }
        }
    });
}

// 알림 모달 표시 (기본 - 정보)
function showAlert(message, type = 'info') {
    initAlertModal();

    const modal = document.getElementById('commonAlertModal');
    const messageEl = document.getElementById('commonAlertMessage');
    const iconEl = modal.querySelector('.common-modal-icon i');

    if (messageEl) {
        messageEl.textContent = message;
    }

    // 아이콘 및 색상 변경
    if (iconEl) {
        iconEl.className = ''; // 기존 클래스 제거

        switch(type) {
            case 'success':
                iconEl.className = 'fas fa-check-circle';
                modal.querySelector('.common-modal-header').style.background = 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)';
                break;
            case 'error':
                iconEl.className = 'fas fa-exclamation-circle';
                modal.querySelector('.common-modal-header').style.background = 'linear-gradient(135deg, #f44336 0%, #ef5350 100%)';
                break;
            case 'warning':
                iconEl.className = 'fas fa-exclamation-triangle';
                modal.querySelector('.common-modal-header').style.background = 'linear-gradient(135deg, #ff9800 0%, #ffa726 100%)';
                break;
            default: // info
                iconEl.className = 'fas fa-info-circle';
                modal.querySelector('.common-modal-header').style.background = 'linear-gradient(135deg, #2196f3 0%, #42a5f5 100%)';
        }
    }

    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

// 확인 모달 표시 (콜백 함수 지원)
function showConfirm(message, onConfirm, onCancel) {
    initAlertModal();

    // 확인 모달 HTML (이미 있으면 사용, 없으면 생성)
    let confirmModal = document.getElementById('commonConfirmModal');

    if (!confirmModal) {
        const confirmHTML = `
            <div id="commonConfirmModal" class="common-modal">
                <div class="common-modal-content">
                    <div class="common-modal-header">
                        <div class="common-modal-icon">
                            <i class="fas fa-question-circle"></i>
                        </div>
                    </div>
                    <div class="common-modal-body">
                        <p id="commonConfirmMessage"></p>
                    </div>
                    <div class="common-modal-footer">
                        <button class="common-modal-btn-secondary" id="commonConfirmCancelBtn">취소</button>
                        <button class="common-modal-btn" id="commonConfirmOkBtn">확인</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', confirmHTML);
        confirmModal = document.getElementById('commonConfirmModal');

        // 모달 배경 클릭 시 닫기
        confirmModal.addEventListener('click', function(e) {
            if (e.target === confirmModal) {
                hideConfirmModal();
                if (onCancel) onCancel();
            }
        });
    }

    const messageEl = document.getElementById('commonConfirmMessage');
    const okBtn = document.getElementById('commonConfirmOkBtn');
    const cancelBtn = document.getElementById('commonConfirmCancelBtn');

    if (messageEl) {
        messageEl.textContent = message;
    }

    // 기존 이벤트 리스너 제거 후 새로 추가
    const newOkBtn = okBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    // 확인 버튼
    document.getElementById('commonConfirmOkBtn').addEventListener('click', function() {
        hideConfirmModal();
        if (onConfirm) onConfirm();
    });

    // 취소 버튼
    document.getElementById('commonConfirmCancelBtn').addEventListener('click', function() {
        hideConfirmModal();
        if (onCancel) onCancel();
    });

    if (confirmModal) {
        confirmModal.classList.add('show');
        confirmModal.style.display = 'flex';
    }
}

// 알림 모달 숨기기
function hideAlertModal() {
    const modal = document.getElementById('commonAlertModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

// 확인 모달 숨기기
function hideConfirmModal() {
    const modal = document.getElementById('commonConfirmModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

// 페이지 로드 시 모달 초기화
document.addEventListener('DOMContentLoaded', function() {
    initAlertModal();
});
