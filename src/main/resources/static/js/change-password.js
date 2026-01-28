document.addEventListener('DOMContentLoaded', async function() {
    // ===========================
    // DOM Elements
    // ===========================
    const changePasswordForm = document.getElementById('changePasswordForm');
    const currentPasswordGroup = document.getElementById('currentPasswordGroup');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const alertMessage = document.getElementById('alertMessage');
    const passwordMatchMessage = document.getElementById('passwordMatchMessage');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    // 페이지 이탈 방지 플래그
    let passwordChangeCompleted = false;

    // 최초 로그인 여부
    let isFirstLogin = false;

    // Password toggle buttons
    const toggleCurrentPassword = document.getElementById('toggleCurrentPassword');
    const toggleNewPassword = document.getElementById('toggleNewPassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

    // ===========================
    // 최초 로그인 체크
    // ===========================
    try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
            const user = await response.json();
            isFirstLogin = user.isFirstLogin || false;

            // 최초 로그인이 아니면 현재 비밀번호 필드 표시
            if (!isFirstLogin) {
                currentPasswordGroup.style.display = 'block';
                currentPasswordInput.required = true;
                currentPasswordInput.focus();
            } else {
                newPasswordInput.focus();
                // 최초 로그인 시 로그아웃 버튼 숨기기 (비밀번호 변경 우회 방지)
                if (cancelBtn) {
                    cancelBtn.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Failed to check first login status:', error);
        // 오류 시 기본적으로 새 비밀번호에 포커스
        newPasswordInput.focus();
    }

    // Requirement elements
    const reqLength = document.getElementById('req-length');
    const reqLetter = document.getElementById('req-letter');
    const reqNumber = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');

    // ===========================
    // Password Toggle
    // ===========================
    function setupPasswordToggle(toggleBtn, inputField) {
        if (toggleBtn && inputField) {
            toggleBtn.addEventListener('click', () => {
                const type = inputField.getAttribute('type') === 'password' ? 'text' : 'password';
                inputField.setAttribute('type', type);

                const icon = toggleBtn.querySelector('i');
                if (type === 'password') {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                } else {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                }
            });
        }
    }

    setupPasswordToggle(toggleCurrentPassword, currentPasswordInput);
    setupPasswordToggle(toggleNewPassword, newPasswordInput);
    setupPasswordToggle(toggleConfirmPassword, confirmPasswordInput);

    // ===========================
    // 페이지 이탈 방지
    // ===========================
    window.addEventListener('beforeunload', (e) => {
        if (!passwordChangeCompleted) {
            e.preventDefault();
            e.returnValue = ''; // Chrome에서는 이 값이 무시되지만 설정해야 함
            return ''; // 일부 브라우저에서 필요
        }
    });

    // 브라우저 뒤로가기 방지
    history.pushState(null, null, location.href);
    window.addEventListener('popstate', function(event) {
        if (!passwordChangeCompleted) {
            history.pushState(null, null, location.href);
            showAlert('비밀번호를 변경해야 다른 페이지로 이동할 수 있습니다.', 'error');
        }
    });

    // ===========================
    // Password Validation
    // ===========================
    function validatePassword(password) {
        const requirements = {
            length: password.length >= 8 && password.length <= 20,
            letter: /[a-zA-Z]/.test(password),
            number: /\d/.test(password),
            special: /[@$!%*?&#]/.test(password)
        };

        return requirements;
    }

    function updatePasswordRequirements(password) {
        const requirements = validatePassword(password);

        // Update requirement items
        reqLength.classList.toggle('valid', requirements.length);
        reqLetter.classList.toggle('valid', requirements.letter);
        reqNumber.classList.toggle('valid', requirements.number);
        reqSpecial.classList.toggle('valid', requirements.special);

        // Update input style
        if (password.length === 0) {
            newPasswordInput.classList.remove('error', 'success');
        } else if (Object.values(requirements).every(req => req)) {
            newPasswordInput.classList.remove('error');
            newPasswordInput.classList.add('success');
        } else {
            newPasswordInput.classList.remove('success');
            newPasswordInput.classList.add('error');
        }

        return Object.values(requirements).every(req => req);
    }

    newPasswordInput.addEventListener('input', (e) => {
        updatePasswordRequirements(e.target.value);
        checkPasswordMatch();
    });

    // ===========================
    // Password Match Check
    // ===========================
    function checkPasswordMatch() {
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (confirmPassword.length === 0) {
            passwordMatchMessage.classList.remove('show');
            confirmPasswordInput.classList.remove('error', 'success');
            return false;
        }

        if (newPassword === confirmPassword) {
            passwordMatchMessage.textContent = '비밀번호가 일치합니다.';
            passwordMatchMessage.classList.remove('mismatch');
            passwordMatchMessage.classList.add('match', 'show');
            confirmPasswordInput.classList.remove('error');
            confirmPasswordInput.classList.add('success');
            return true;
        } else {
            passwordMatchMessage.textContent = '비밀번호가 일치하지 않습니다.';
            passwordMatchMessage.classList.remove('match');
            passwordMatchMessage.classList.add('mismatch', 'show');
            confirmPasswordInput.classList.remove('success');
            confirmPasswordInput.classList.add('error');
            return false;
        }
    }

    confirmPasswordInput.addEventListener('input', checkPasswordMatch);

    // ===========================
    // Form Submit Handler
    // ===========================
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = currentPasswordInput.value.trim();
        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // Validation
        if (!isFirstLogin && !currentPassword) {
            showAlert('현재 비밀번호를 입력해주세요.', 'error');
            return;
        }

        if (!newPassword || !confirmPassword) {
            showAlert('새 비밀번호를 입력해주세요.', 'error');
            return;
        }

        // Password requirements check
        if (!updatePasswordRequirements(newPassword)) {
            showAlert('비밀번호가 요구사항을 충족하지 않습니다.', 'error');
            return;
        }

        // Password match check
        if (!checkPasswordMatch()) {
            showAlert('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.', 'error');
            return;
        }

        // Same password check (최초 로그인이 아닐 때만)
        if (!isFirstLogin && currentPassword === newPassword) {
            showAlert('현재 비밀번호와 새 비밀번호가 동일합니다.\n다른 비밀번호를 입력해주세요.', 'error');
            return;
        }

        // Show loading state
        changePasswordBtn.classList.add('loading');
        changePasswordBtn.disabled = true;

        try {
            // 요청 바디 구성 (최초 로그인 시 currentPassword 제외)
            const requestBody = {
                newPassword: newPassword,
                confirmPassword: confirmPassword
            };

            if (!isFirstLogin) {
                requestBody.currentPassword = currentPassword;
            }

            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || '비밀번호 변경에 실패했습니다.');
            }

            const result = await response.json();

            // 비밀번호 변경 완료 플래그 설정
            passwordChangeCompleted = true;

            // Show success message
            showAlert('비밀번호가 성공적으로 변경되었습니다.\n메인 페이지로 이동합니다...', 'success');

            // Redirect to home page
            setTimeout(() => {
                window.location.href = '/home';
            }, 2000);

        } catch (error) {
            console.error('Change password error:', error);
            showAlert(error.message || '비밀번호 변경 중 오류가 발생했습니다.\n다시 시도해주세요.', 'error');
            changePasswordBtn.classList.remove('loading');
            changePasswordBtn.disabled = false;
        }
    });

    // ===========================
    // Cancel Button Handler (로그아웃)
    // ===========================
    cancelBtn.addEventListener('click', async () => {
        const result = await Swal.fire({
            title: '로그아웃 하시겠습니까?',
            text: '비밀번호 변경을 취소하고 로그아웃합니다.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#667eea',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '로그아웃',
            cancelButtonText: '취소'
        });

        if (result.isConfirmed) {
            try {
                // 로그아웃 API 호출
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                // 로그인 페이지로 이동
                passwordChangeCompleted = true; // 페이지 이탈 방지 해제
                window.location.href = '/login';
            } catch (error) {
                console.error('Logout error:', error);
                // 로그아웃 실패해도 로그인 페이지로 이동
                passwordChangeCompleted = true;
                window.location.href = '/login';
            }
        }
    });

    // ===========================
    // Helper Functions
    // ===========================
    function showAlert(message, type = 'error') {
        alertMessage.textContent = message;
        alertMessage.className = 'alert-message show ' + type;

        setTimeout(() => {
            alertMessage.classList.remove('show');
        }, 5000);
    }
});
