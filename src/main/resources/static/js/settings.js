// 설정 페이지 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const toggleSwitches = document.querySelectorAll('.toggle-switch input');

    // 전자서명 캔버스 초기화
    initSignatureCanvas();

    // 탭 전환
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            // 모든 탭 비활성화
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // 선택된 탭 활성화
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // 설정 저장
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function() {
            console.log('설정 저장');

            // 모든 설정 값 수집
            const settings = {
                profile: {
                    name: document.querySelector('#profile .form-input[type="text"]')?.value,
                    email: document.querySelector('#profile .form-input[type="email"]')?.value,
                    phone: document.querySelector('#profile .form-input[type="tel"]')?.value,
                    department: document.querySelector('#profile .form-select')?.value,
                    bio: document.querySelector('#profile .form-textarea')?.value
                },
                notifications: {},
                system: {}
            };

            console.log('저장될 설정:', settings);
            showAlert('설정이 저장되었습니다.', 'success');
            // TODO: 서버에 설정 저장
        });
    }

    // 토글 스위치 변경 감지
    toggleSwitches.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const settingName = this.closest('.setting-item').querySelector('h4').textContent;
            const isEnabled = this.checked;
            console.log(`${settingName}: ${isEnabled ? '활성화' : '비활성화'}`);
            // TODO: 실시간 설정 업데이트
        });
    });

    // 프로필 사진 변경
    const changeAvatarBtn = document.querySelector('.btn-change-avatar');
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', function() {
            console.log('프로필 사진 변경');
            showAlert('프로필 사진 변경 기능은 추후 구현됩니다.', 'info');
            // TODO: 파일 업로드 모달 표시
        });
    }

    // 비밀번호 변경
    const passwordChangeBtn = document.getElementById('changePasswordBtn');
    if (passwordChangeBtn) {
        passwordChangeBtn.addEventListener('click', function() {
            const currentPassword = document.getElementById('currentPassword')?.value;
            const newPassword = document.getElementById('newPassword')?.value;
            const confirmPassword = document.getElementById('confirmPassword')?.value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                showAlert('모든 필드를 입력해주세요.', 'warning');
                return;
            }

            if (newPassword.length < 8) {
                showAlert('새 비밀번호는 8자 이상이어야 합니다.', 'warning');
                return;
            }

            // 비밀번호 강도 검증 (영문, 숫자, 특수문자 포함)
            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                showAlert('비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.', 'warning');
                return;
            }

            if (newPassword !== confirmPassword) {
                showAlert('새 비밀번호가 일치하지 않습니다.', 'warning');
                return;
            }

            console.log('비밀번호 변경 요청');
            showAlert('비밀번호가 성공적으로 변경되었습니다.', 'success');

            // 입력 필드 초기화
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';

            // TODO: 서버에 비밀번호 변경 요청
        });
    }

    // 캐시 삭제
    const deleteCacheBtn = document.querySelector('.data-section .btn-danger-outline');
    if (deleteCacheBtn) {
        deleteCacheBtn.addEventListener('click', function() {
            showConfirm('캐시 데이터를 삭제하시겠습니까?', function() {
                console.log('캐시 삭제');
                showAlert('캐시가 삭제되었습니다.', 'success');
                // TODO: 캐시 삭제 처리
            });
        });
    }

    // 데이터 다운로드
    const downloadDataBtn = document.querySelector('.data-section .btn-secondary');
    if (downloadDataBtn) {
        downloadDataBtn.addEventListener('click', function() {
            console.log('내 데이터 다운로드');
            showAlert('데이터 다운로드가 시작됩니다.', 'success');
            // TODO: 데이터 다운로드 처리
        });
    }

    // 테마 변경
    const themeSelect = document.querySelector('#system .form-select[value="light"]');
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            const theme = this.value;
            console.log('테마 변경:', theme);
            // TODO: 테마 변경 적용
            showAlert(`테마가 "${this.options[this.selectedIndex].text}"로 변경됩니다.`, 'info');
        });
    }

    // 언어 변경
    const languageSelect = document.querySelector('#system .form-select:nth-of-type(2)');
    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            const language = this.value;
            console.log('언어 변경:', language);
            // TODO: 언어 변경 적용
            showAlert(`언어가 "${this.options[this.selectedIndex].text}"로 변경됩니다.`, 'info');
        });
    }

    // 페이지당 항목 수 변경
    const itemsPerPageSelect = document.querySelector('#system .form-select:nth-of-type(3)');
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', function() {
            const itemsPerPage = this.value;
            console.log('페이지당 항목 수:', itemsPerPage);
            // TODO: 항목 수 설정 저장
        });
    }

    // 폼 입력 변경 감지
    const formInputs = document.querySelectorAll('.form-input, .form-select, .form-textarea');
    let hasChanges = false;

    formInputs.forEach(input => {
        input.addEventListener('change', function() {
            hasChanges = true;
            console.log('설정 변경됨');
        });
    });

    // 페이지 이탈 시 경고
    window.addEventListener('beforeunload', function(e) {
        if (hasChanges) {
            e.preventDefault();
            e.returnValue = '저장하지 않은 변경사항이 있습니다. 페이지를 나가시겠습니까?';
            return e.returnValue;
        }
    });

    // 저장 버튼 클릭 시 변경사항 플래그 초기화
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function() {
            hasChanges = false;
        });
    }
});

// 전자서명 캔버스 초기화
function initSignatureCanvas() {
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const placeholder = document.getElementById('canvasPlaceholder');
    const clearBtn = document.getElementById('clearSignature');
    const saveBtn = document.getElementById('saveSignature');

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let hasDrawn = false;

    // 캔버스 설정 (기본 선 굵기 5)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 마우스 이벤트
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // 터치 이벤트 (모바일 지원)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    function startDrawing(e) {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;

        if (!hasDrawn) {
            placeholder.classList.add('hidden');
            hasDrawn = true;
        }
    }

    function draw(e) {
        if (!isDrawing) return;

        const rect = canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        lastX = currentX;
        lastY = currentY;
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        isDrawing = true;
        lastX = touch.clientX - rect.left;
        lastY = touch.clientY - rect.top;

        if (!hasDrawn) {
            placeholder.classList.add('hidden');
            hasDrawn = true;
        }
    }

    function handleTouchMove(e) {
        e.preventDefault();
        if (!isDrawing) return;

        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const currentX = touch.clientX - rect.left;
        const currentY = touch.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();

        lastX = currentX;
        lastY = currentY;
    }

    // 지우기 버튼
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            placeholder.classList.remove('hidden');
            hasDrawn = false;
        });
    }

    // 저장 버튼 - 모달 표시
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            if (!hasDrawn) {
                showAlert('서명을 작성해주세요.', 'warning');
                return;
            }

            // 서명 데이터를 임시 저장
            window.tempSignatureData = canvas.toDataURL('image/png');

            // 동의 모달 표시
            showSignatureConfirmModal();
        });
    }

    // 서명 저장 동의 모달 처리
    initSignatureConfirmModal(ctx, canvas, placeholder, hasDrawn);

    // 저장된 서명 불러오기
    loadSavedSignature();
}

// 저장된 서명 불러오기
function loadSavedSignature() {
    const savedSignature = localStorage.getItem('userSignature');
    if (savedSignature) {
        const currentSignature = document.getElementById('currentSignature');
        if (currentSignature) {
            currentSignature.innerHTML = `<img src="${savedSignature}" alt="전자서명">`;
        }
    }
}

// 서명 저장 동의 모달 초기화
function initSignatureConfirmModal(ctx, canvas, placeholder, hasDrawn) {
    const modal = document.getElementById('signatureConfirmModal');
    const closeBtn = document.getElementById('closeSignatureModal');
    const cancelBtn = document.getElementById('cancelSignatureSave');
    const confirmBtn = document.getElementById('confirmSignatureSave');
    const consentCheckbox = document.getElementById('consentCheckbox');

    // 동의 체크박스 상태에 따라 버튼 활성화/비활성화
    if (consentCheckbox) {
        consentCheckbox.addEventListener('change', function() {
            if (confirmBtn) {
                confirmBtn.disabled = !this.checked;
            }
        });
    }

    // 취소 버튼
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            hideSignatureConfirmModal();
            window.tempSignatureData = null;
        });
    }

    // 닫기 버튼
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            hideSignatureConfirmModal();
            window.tempSignatureData = null;
        });
    }

    // 확인 버튼 - 실제 저장 처리
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            // 체크박스 확인
            if (consentCheckbox && !consentCheckbox.checked) {
                // 체크박스가 체크되지 않은 경우 강조 표시
                const checkboxContainer = document.querySelector('.consent-checkbox');
                if (checkboxContainer) {
                    checkboxContainer.classList.add('highlight');

                    // 3초 후 강조 제거
                    setTimeout(() => {
                        checkboxContainer.classList.remove('highlight');
                    }, 3000);
                }

                showAlert('동의 내용을 확인하고 체크박스를 체크해주세요.', 'warning');
                return;
            }

            if (!window.tempSignatureData) {
                showAlert('서명 데이터가 없습니다.', 'error');
                return;
            }

            // 현재 서명 영역에 표시
            const currentSignature = document.getElementById('currentSignature');
            if (currentSignature) {
                currentSignature.innerHTML = `<img src="${window.tempSignatureData}" alt="전자서명">`;
            }

            // LocalStorage에 저장
            localStorage.setItem('userSignature', window.tempSignatureData);

            // 동의 날짜 저장
            const consentDate = new Date().toISOString();
            localStorage.setItem('signatureConsentDate', consentDate);

            showAlert('서명이 저장되었습니다.', 'success');

            // 캔버스 초기화
            const signatureCanvas = document.getElementById('signatureCanvas');
            const canvasPlaceholder = document.getElementById('canvasPlaceholder');
            if (signatureCanvas && ctx) {
                ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
            }
            if (canvasPlaceholder) {
                canvasPlaceholder.classList.remove('hidden');
            }

            // 모달 닫기
            hideSignatureConfirmModal();

            // 체크박스 초기화
            if (consentCheckbox) {
                consentCheckbox.checked = false;
            }
            if (confirmBtn) {
                confirmBtn.disabled = true;
            }

            // 임시 데이터 삭제
            window.tempSignatureData = null;
        });
    }

    // 모달 배경 클릭 시 닫기
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideSignatureConfirmModal();
                window.tempSignatureData = null;
            }
        });
    }
}

// 서명 동의 모달 표시
function showSignatureConfirmModal() {
    const modal = document.getElementById('signatureConfirmModal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

// 서명 동의 모달 숨기기
function hideSignatureConfirmModal() {
    const modal = document.getElementById('signatureConfirmModal');
    const consentCheckbox = document.getElementById('consentCheckbox');
    const confirmBtn = document.getElementById('confirmSignatureSave');
    const checkboxContainer = document.querySelector('.consent-checkbox');

    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }

    // 체크박스 강조 제거
    if (checkboxContainer) {
        checkboxContainer.classList.remove('highlight');
    }

    // 체크박스와 버튼 상태 초기화
    if (consentCheckbox) {
        consentCheckbox.checked = false;
    }
    if (confirmBtn) {
        confirmBtn.disabled = true;
    }
}
