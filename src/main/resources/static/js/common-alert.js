/**
 * Common Alert Utilities
 * SweetAlert2 기반 공통 알림 함수
 *
 * 프로젝트 전체에서 사용 가능한 alert/confirm 래퍼 함수 제공
 * 사용법은 ALERT_GUIDE.md 참조
 */

// ============================================
// 기본 Alert 함수
// ============================================

/**
 * 일반 알림 메시지
 * @param {string} message - 표시할 메시지
 * @param {string} title - 제목 (선택)
 */
window.showAlert = function(message, title = '알림') {
    return Swal.fire({
        title: title,
        html: message.replace(/\n/g, '<br>'),
        icon: 'info',
        confirmButtonText: '확인',
        confirmButtonColor: '#667eea'
    });
};

/**
 * 성공 메시지
 * @param {string} message - 표시할 메시지
 * @param {string} title - 제목 (선택)
 */
window.showSuccess = function(message, title = '성공') {
    return Swal.fire({
        title: title,
        html: message.replace(/\n/g, '<br>'),
        icon: 'success',
        confirmButtonText: '확인',
        confirmButtonColor: '#28a745',
        timer: 2000,
        timerProgressBar: true
    });
};

/**
 * 에러 메시지
 * @param {string} message - 표시할 메시지
 * @param {string} title - 제목 (선택)
 */
window.showError = function(message, title = '오류') {
    return Swal.fire({
        title: title,
        html: message.replace(/\n/g, '<br>'),
        icon: 'error',
        confirmButtonText: '확인',
        confirmButtonColor: '#dc3545'
    });
};

/**
 * 경고 메시지
 * @param {string} message - 표시할 메시지
 * @param {string} title - 제목 (선택)
 */
window.showWarning = function(message, title = '경고') {
    return Swal.fire({
        title: title,
        html: message.replace(/\n/g, '<br>'),
        icon: 'warning',
        confirmButtonText: '확인',
        confirmButtonColor: '#ff9800'
    });
};

// ============================================
// Confirm 함수
// ============================================

/**
 * 확인/취소 선택 대화상자
 * @param {string} message - 표시할 메시지
 * @param {string} title - 제목 (선택)
 * @param {object} options - 추가 옵션
 * @returns {Promise<boolean>} - 확인: true, 취소: false
 */
window.showConfirm = async function(message, title = '확인', options = {}) {
    const result = await Swal.fire({
        title: title,
        html: message.replace(/\n/g, '<br>'),
        icon: options.icon || 'question',
        showCancelButton: true,
        confirmButtonText: options.confirmText || '확인',
        cancelButtonText: options.cancelText || '취소',
        confirmButtonColor: options.confirmColor || '#667eea',
        cancelButtonColor: options.cancelColor || '#6c757d',
        reverseButtons: true
    });

    return result.isConfirmed;
};

/**
 * 삭제 확인 대화상자
 * @param {string} message - 표시할 메시지
 * @param {string} title - 제목 (선택)
 * @returns {Promise<boolean>}
 */
window.showDeleteConfirm = async function(message = '이 항목을 삭제하시겠습니까?', title = '삭제 확인') {
    const result = await Swal.fire({
        title: title,
        html: message.replace(/\n/g, '<br>'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '삭제',
        cancelButtonText: '취소',
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        reverseButtons: true
    });

    return result.isConfirmed;
};

/**
 * 저장 확인 대화상자
 * @param {string} message - 표시할 메시지
 * @param {string} title - 제목 (선택)
 * @returns {Promise<boolean>}
 */
window.showSaveConfirm = async function(message = '저장하시겠습니까?', title = '저장 확인') {
    const result = await Swal.fire({
        title: title,
        html: message.replace(/\n/g, '<br>'),
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '저장',
        cancelButtonText: '취소',
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d',
        reverseButtons: true
    });

    return result.isConfirmed;
};

// ============================================
// 특수 Alert 함수
// ============================================

/**
 * 로딩 표시
 * @param {string} message - 로딩 메시지
 */
window.showLoading = function(message = '처리 중입니다...') {
    Swal.fire({
        title: message,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
};

/**
 * 로딩 닫기
 */
window.closeLoading = function() {
    Swal.close();
};

/**
 * Toast 알림 (오른쪽 상단에 잠깐 표시되는 알림)
 * @param {string} message - 표시할 메시지
 * @param {string} icon - 아이콘 ('success', 'error', 'warning', 'info')
 */
window.showToast = function(message, icon = 'success') {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });

    Toast.fire({
        icon: icon,
        title: message
    });
};

// ============================================
// 입력 받기
// ============================================

/**
 * 텍스트 입력받기
 * @param {string} title - 제목
 * @param {string} placeholder - 입력 힌트
 * @param {string} defaultValue - 기본값
 * @returns {Promise<string|null>} - 입력값 또는 null (취소 시)
 */
window.showInput = async function(title, placeholder = '', defaultValue = '') {
    const result = await Swal.fire({
        title: title,
        input: 'text',
        inputPlaceholder: placeholder,
        inputValue: defaultValue,
        showCancelButton: true,
        confirmButtonText: '확인',
        cancelButtonText: '취소',
        confirmButtonColor: '#667eea',
        cancelButtonColor: '#6c757d',
        reverseButtons: true,
        inputValidator: (value) => {
            if (!value) {
                return '값을 입력해주세요.';
            }
        }
    });

    return result.isConfirmed ? result.value : null;
};

/**
 * Textarea 입력받기
 * @param {string} title - 제목
 * @param {string} placeholder - 입력 힌트
 * @param {string} defaultValue - 기본값
 * @returns {Promise<string|null>} - 입력값 또는 null (취소 시)
 */
window.showTextarea = async function(title, placeholder = '', defaultValue = '') {
    const result = await Swal.fire({
        title: title,
        input: 'textarea',
        inputPlaceholder: placeholder,
        inputValue: defaultValue,
        showCancelButton: true,
        confirmButtonText: '확인',
        cancelButtonText: '취소',
        confirmButtonColor: '#667eea',
        cancelButtonColor: '#6c757d',
        reverseButtons: true,
        inputValidator: (value) => {
            if (!value) {
                return '값을 입력해주세요.';
            }
        }
    });

    return result.isConfirmed ? result.value : null;
};

// ============================================
// 호환성 래퍼 (기존 alert/confirm 대체용)
// ============================================

/**
 * 기존 alert() 대체 함수
 * 기존 코드에서 alert()를 사용하는 경우 이 함수로 대체 가능
 */
window.alertCustom = function(message) {
    return showAlert(message);
};

/**
 * 기존 confirm() 대체 함수
 * 기존 코드에서 confirm()을 사용하는 경우 이 함수로 대체 가능
 */
window.confirmCustom = async function(message) {
    return await showConfirm(message);
};

console.log('✅ Common Alert Utilities loaded successfully');
