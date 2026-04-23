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

// ============================================
// 실패/오류 안내 표준 헬퍼 (카테고리별)
// ============================================
// 원칙: 무엇을 + 왜 + 다음 행동 — 기술 용어 금지.
// subject 는 조사 없이 호출부에서 자연스러운 명사를 넘기면 된다.
//   예) showSaveFailure('회의록'), showLoadFailure('직원 목록')

/** 서버/네트워크 일시 장애로 저장되지 않음 */
window.showSaveFailure = function(subject = '내용') {
    return Swal.fire({
        title: `${subject}을(를) 저장하지 못했습니다`,
        html: `서버와 잠시 연결되지 않아 저장이 완료되지 않았습니다.<br>` +
              `작성하신 내용은 그대로 남아 있으니 <b>다시 저장 버튼</b>을 눌러 주세요.<br>` +
              `같은 문제가 계속되면 관리자에게 문의해 주세요.`,
        icon: 'warning',
        confirmButtonText: '확인',
        confirmButtonColor: '#ff9800'
    });
};

/** 수정 저장 실패 */
window.showUpdateFailure = function(subject = '내용') {
    return Swal.fire({
        title: `${subject}을(를) 수정하지 못했습니다`,
        html: `서버와 잠시 연결되지 않아 수정이 완료되지 않았습니다.<br>` +
              `고치신 내용은 그대로 남아 있으니 <b>다시 수정 버튼</b>을 눌러 주세요.<br>` +
              `같은 문제가 계속되면 관리자에게 문의해 주세요.`,
        icon: 'warning',
        confirmButtonText: '확인',
        confirmButtonColor: '#ff9800'
    });
};

/** 삭제 실패 */
window.showDeleteFailure = function(subject = '항목') {
    return Swal.fire({
        title: `${subject}을(를) 삭제하지 못했습니다`,
        html: `서버와 잠시 연결되지 않아 삭제가 완료되지 않았습니다.<br>` +
              `<b>다시 삭제 버튼</b>을 눌러 주세요.<br>` +
              `같은 문제가 계속되면 관리자에게 문의해 주세요.`,
        icon: 'warning',
        confirmButtonText: '확인',
        confirmButtonColor: '#ff9800'
    });
};

/** 파일 다운로드/내보내기 실패 */
window.showDownloadFailure = function(subject = '파일') {
    return Swal.fire({
        title: `${subject}을(를) 내려받지 못했습니다`,
        html: `서버와 잠시 연결되지 않아 내려받기가 완료되지 않았습니다.<br>` +
              `인터넷 연결을 확인한 뒤 <b>다시 내려받기 버튼</b>을 눌러 주세요.`,
        icon: 'warning',
        confirmButtonText: '확인',
        confirmButtonColor: '#ff9800'
    });
};

/** 파일 생성(PDF 등) 실패 */
window.showGenerateFailure = function(subject = '문서') {
    return Swal.fire({
        title: `${subject}을(를) 만들지 못했습니다`,
        html: `${subject} 생성 중 문제가 생겨 파일이 만들어지지 않았습니다.<br>` +
              `<b>다시 시도</b>하거나, 계속되면 관리자에게 문의해 주세요.`,
        icon: 'warning',
        confirmButtonText: '확인',
        confirmButtonColor: '#ff9800'
    });
};

/** 파일 업로드 실패 */
window.showUploadFailure = function(subject = '파일') {
    return Swal.fire({
        title: `${subject}을(를) 올리지 못했습니다`,
        html: `업로드 중 서버와 연결되지 않았습니다.<br>` +
              `파일을 다시 선택해 올려 주세요. 크기가 너무 크거나 형식이 맞지 않는지 확인해 주세요.`,
        icon: 'warning',
        confirmButtonText: '확인',
        confirmButtonColor: '#ff9800'
    });
};

/** 파일 크기 초과 */
window.showFileTooLarge = function(limitMB) {
    return Swal.fire({
        title: '파일이 너무 큽니다',
        html: `첨부 파일은 <b>${limitMB}MB 이하</b>만 올릴 수 있습니다.<br>` +
              `파일 크기를 줄이거나 여러 개로 나누어 올려 주세요.`,
        icon: 'warning',
        confirmButtonText: '확인',
        confirmButtonColor: '#ff9800'
    });
};

/** 허용되지 않는 파일 형식 */
window.showFileTypeInvalid = function(allowedText = '') {
    return Swal.fire({
        title: '올릴 수 없는 파일 형식입니다',
        html: allowedText
            ? `${allowedText} 형식만 올릴 수 있습니다.<br>파일 형식을 확인한 뒤 다시 올려 주세요.`
            : `지원하지 않는 파일 형식입니다.<br>파일 형식을 확인한 뒤 다시 올려 주세요.`,
        icon: 'warning',
        confirmButtonText: '확인',
        confirmButtonColor: '#ff9800'
    });
};

/** 목록/상세 데이터 로드 실패 */
window.showLoadFailure = function(subject = '정보') {
    return Swal.fire({
        title: `${subject}을(를) 불러오지 못했습니다`,
        html: `서버와 잠시 연결되지 않아 ${subject}을(를) 표시하지 못했습니다.<br>` +
              `<b>페이지 새로고침(F5)</b> 후 다시 시도해 주세요.<br>` +
              `같은 문제가 계속되면 관리자에게 문의해 주세요.`,
        icon: 'warning',
        confirmButtonText: '확인',
        confirmButtonColor: '#ff9800'
    });
};

/** 권한 부족 */
window.showPermissionDenied = function(action = '이 작업') {
    return Swal.fire({
        title: '권한이 없습니다',
        html: `${action}을(를) 수행할 권한이 없습니다.<br>` +
              `필요한 경우 관리자에게 요청해 주세요.`,
        icon: 'info',
        confirmButtonText: '확인',
        confirmButtonColor: '#667eea'
    });
};

/** 필수 입력 누락 */
window.showRequiredMissing = function(fieldName) {
    return Swal.fire({
        title: `${fieldName}을(를) 입력해 주세요`,
        html: `${fieldName}은(는) 반드시 입력해야 하는 항목입니다.`,
        icon: 'info',
        confirmButtonText: '확인',
        confirmButtonColor: '#667eea'
    });
};

/** 서버/네트워크 응답 없음 (가장 범용) */
window.showServerUnavailable = function(retryHint = '잠시 후 다시 시도해 주세요.') {
    return Swal.fire({
        title: '서버에 연결할 수 없습니다',
        html: `서버와 연결되지 않습니다.<br>` +
              `인터넷 연결을 확인해 주세요.<br>${retryHint}`,
        icon: 'warning',
        confirmButtonText: '확인',
        confirmButtonColor: '#ff9800'
    });
};

console.log('✅ Common Alert Utilities loaded successfully');
