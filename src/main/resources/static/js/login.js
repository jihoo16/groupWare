document.addEventListener('DOMContentLoaded', function() {
    // ===========================
    // DOM Elements
    // ===========================
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const alertMessage = document.getElementById('alertMessage');
    const btnSso = document.getElementById('btn-sso');
    const contactAdminLink = document.getElementById('contact-admin');

    // ===========================
    // Password Toggle
    // ===========================
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            const icon = togglePasswordBtn.querySelector('i');
            if (type === 'password') {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            } else {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        });
    }

    // ===========================
    // Load Remembered Credentials
    // ===========================
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    if (rememberedUsername) {
        usernameInput.value = rememberedUsername;
        rememberMeCheckbox.checked = true;
    }

    // ===========================
    // Form Submit Handler
    // ===========================
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const rememberMe = rememberMeCheckbox.checked;

        // Validation
        if (!username || !password) {
            showAlert('아이디와 비밀번호를 모두 입력해주세요.', 'error');
            return;
        }

        // Show loading state
        const btnLogin = loginForm.querySelector('.btn-login');
        btnLogin.classList.add('loading');
        btnLogin.disabled = true;

        try {
            // 실제 로그인 API 호출
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    empId: username,
                    password: password,
                    rememberMe: rememberMe
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '로그인에 실패했습니다.');
            }

            const userData = await response.json();

            // Save username if remember me is checked
            if (rememberMe) {
                localStorage.setItem('rememberedUsername', username);
            } else {
                localStorage.removeItem('rememberedUsername');
            }

            // Show success message
            showAlert('로그인 성공! 메인 페이지로 이동합니다...', 'success');

            // Redirect to home page
            setTimeout(() => {
                window.location.href = '/home';
            }, 1000);

        } catch (error) {
            showAlert(error.message || '로그인에 실패했습니다. 다시 시도해주세요.', 'error');
            btnLogin.classList.remove('loading');
            btnLogin.disabled = false;
        }
    });

    // ===========================
    // SSO Login Button
    // ===========================
    if (btnSso) {
        btnSso.addEventListener('click', () => {
            // TODO: Implement SSO login logic
            showAlert('SSO 로그인 기능은 준비 중입니다.', 'error');
        });
    }

    // ===========================
    // Contact Admin Link
    // ===========================
    if (contactAdminLink) {
        contactAdminLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await showInfo('시스템 관리자 연락처:\n\n이메일: admin@pinecni.com\n전화: 02-1234-5678');
        });
    }

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


    // ===========================
    // Enter Key Support
    // ===========================
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            passwordInput.focus();
        }
    });

    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });

    // ===========================
    // Auto-focus on username input
    // ===========================
    usernameInput.focus();
});
