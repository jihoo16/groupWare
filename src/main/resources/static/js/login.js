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
        contactAdminLink.addEventListener('click', (e) => {
            e.preventDefault();
            showInfo('시스템 관리자 연락처:\n\n이메일: admin@pinecni.com\n전화: 02-1234-5678');
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

    // ===========================
    // Health Check Button
    // ===========================
    const healthCheckBtn = document.getElementById('healthCheckBtn');
    let isChecking = false;

    if (healthCheckBtn) {
        // 페이지 로드 시 자동으로 한 번 체크
        setTimeout(() => {
            performHealthCheck();
        }, 1000);

        // 버튼 클릭 시 health check 수행
        healthCheckBtn.addEventListener('click', () => {
            if (!isChecking) {
                performHealthCheck();
            }
        });

        // 30초마다 자동으로 health check
        setInterval(() => {
            performHealthCheck();
        }, 30000);
    }

    async function performHealthCheck() {
        if (isChecking) return;

        isChecking = true;
        healthCheckBtn.classList.remove('healthy', 'unhealthy');
        healthCheckBtn.classList.add('checking');

        try {
            const startTime = Date.now();

            // 간단한 health check endpoint 호출
            // /api/health 또는 /actuator/health를 호출
            const response = await fetch('/api/health', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: AbortSignal.timeout(5000) // 5초 타임아웃
            });

            const responseTime = Date.now() - startTime;

            if (response.ok) {
                // 서버가 정상 응답
                healthCheckBtn.classList.remove('checking', 'unhealthy');
                healthCheckBtn.classList.add('healthy');
                healthCheckBtn.title = `서버 정상 (응답시간: ${responseTime}ms)`;
            } else {
                // 서버가 에러 응답
                healthCheckBtn.classList.remove('checking', 'healthy');
                healthCheckBtn.classList.add('unhealthy');
                healthCheckBtn.title = `서버 오류 (HTTP ${response.status})`;
            }
        } catch (error) {
            // 네트워크 오류 또는 타임아웃
            healthCheckBtn.classList.remove('checking', 'healthy');
            healthCheckBtn.classList.add('unhealthy');

            if (error.name === 'AbortError') {
                healthCheckBtn.title = '서버 응답 없음 (타임아웃)';
            } else {
                healthCheckBtn.title = '서버 연결 실패';
            }
        } finally {
            isChecking = false;
        }
    }
});
