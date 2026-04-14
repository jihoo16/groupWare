// ===========================
// Session Check & bfcache Reset
// ===========================
async function checkSessionAndRedirect() {
    try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        if (data.isAuthenticated) {
            window.location.replace('/home');
        }
    } catch (e) {
        // 세션 확인 실패 시 로그인 페이지 유지
    }
}

// 뒤로가기(bfcache 복원) 시 버튼 상태 리셋 + 세션 재확인
window.addEventListener('pageshow', function(e) {
    if (e.persisted) {
        const btnLogin = document.querySelector('.btn-login');
        if (btnLogin) {
            btnLogin.classList.remove('loading');
            btnLogin.disabled = false;
        }
        checkSessionAndRedirect();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // 이미 로그인된 경우 홈으로 이동
    checkSessionAndRedirect();

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

        // Clear previous errors
        clearErrors();

        // Validation
        let hasError = false;

        if (!username) {
            showFieldError('username', '사번 또는 이메일을 입력해주세요.');
            hasError = true;
        }

        if (!password) {
            showFieldError('password', '비밀번호를 입력해주세요.');
            hasError = true;
        }

        if (hasError) {
            return;
        }

        // Show loading state
        const btnLogin = loginForm.querySelector('.btn-login');
        btnLogin.classList.add('loading');
        btnLogin.disabled = true;

        try {
            // 실제 로그인 API 호출
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    empId: username,
                    password: password,
                    rememberMe: rememberMe
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                // HTTP 상태 코드별 처리
                let errorData = {};

                // JSON 파싱 시도
                try {
                    const text = await response.text();
                    if (text && text.trim().startsWith('{')) {
                        errorData = JSON.parse(text);
                    }
                } catch (e) {
                    console.error('Error response parsing failed:', e);
                }

                if (response.status === 401) {
                    throw new Error(errorData.error || '사번/이메일 또는 비밀번호가 올바르지 않습니다.\n입력 정보를 확인하고 다시 시도해주세요.');
                } else if (response.status === 404) {
                    throw new Error('로그인 서비스를 찾을 수 없습니다.\n관리자에게 문의하세요.');
                } else if (response.status >= 500) {
                    throw new Error('서버에 일시적인 문제가 발생했습니다.\n잠시 후 다시 시도해주세요.');
                } else {
                    throw new Error(errorData.error || '로그인에 실패했습니다.\n잠시 후 다시 시도해주세요.');
                }
            }

            // 성공 응답 JSON 파싱 시도
            let userData;
            try {
                userData = await response.json();
            } catch (e) {
                console.error('Success response parsing failed:', e);
                throw new Error('서버 응답을 처리할 수 없습니다.\n페이지를 새로고침 후 다시 시도해주세요.');
            }

            // Save username if remember me is checked
            if (rememberMe) {
                localStorage.setItem('rememberedUsername', username);
            } else {
                localStorage.removeItem('rememberedUsername');
            }

            // 최초 로그인 시 기초정보 확인 페이지로 리다이렉트
            if (userData.isFirstLogin) {
                showAlert('최초 로그인입니다. 기초정보를 확인해주세요.', 'success');
                setTimeout(() => {
                    window.location.href = '/first-setting';
                }, 1000);
                return;
            }

            // Show success message
            showAlert('로그인 성공! 메인 페이지로 이동합니다...', 'success');

            // Redirect to home page
            setTimeout(() => {
                window.location.href = '/home';
            }, 1000);

        } catch (error) {
            console.error('Login error:', error);

            let errorMessage = '';

            // 에러 유형별 사용자 친화적 메시지
            if (error.name === 'AbortError') {
                // 타임아웃
                errorMessage = '서버 응답이 지연되고 있습니다.\n\n• 네트워크 연결을 확인해주세요\n• 잠시 후 다시 시도해주세요\n• 문제가 지속되면 관리자에게 문의하세요';
            } else if (error.name === 'SyntaxError' || error.message.includes('Unexpected token')) {
                // JSON 파싱 에러 (서버가 HTML을 반환한 경우)
                errorMessage = '서버 응답을 처리할 수 없습니다.\n\n• 페이지를 새로고침 후 다시 시도해주세요\n• 문제가 지속되면 관리자에게 문의하세요';
            } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                // 네트워크 오류
                errorMessage = '서버에 연결할 수 없습니다.\n\n• 네트워크 연결을 확인해주세요\n• 잠시 후 다시 시도해주세요';
            } else if (error.message.includes('사번') || error.message.includes('비밀번호') ||
                       error.message.includes('로그인') || error.message.includes('서버')) {
                // 사용자 친화적 메시지 (이미 처리된 에러)
                errorMessage = error.message;
            } else {
                // 기타 기술적 에러 - 사용자에게 기술적 내용 숨김
                errorMessage = '로그인 중 오류가 발생했습니다.\n\n• 페이지를 새로고침 후 다시 시도해주세요\n• 문제가 지속되면 관리자에게 문의하세요';
            }

            showAlert(errorMessage, 'error');
            btnLogin.classList.remove('loading');
            btnLogin.disabled = false;

            // 비밀번호 오류 시 비밀번호 필드 전체 선택
            if (error.message.includes('비밀번호') || error.message.includes('올바르지 않습니다')) {
                setTimeout(() => {
                    if (passwordInput) {
                        passwordInput.focus();
                        passwordInput.select();
                    }
                }, 100);
            }
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

    function showFieldError(fieldName, message) {
        const input = document.getElementById(fieldName);
        const errorElement = document.getElementById(fieldName + 'Error');

        if (input) {
            input.classList.add('error');
            input.addEventListener('input', function() {
                input.classList.remove('error');
                if (errorElement) {
                    errorElement.textContent = '';
                }
            }, { once: true });
        }

        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    function clearErrors() {
        usernameInput.classList.remove('error');
        passwordInput.classList.remove('error');
        document.getElementById('usernameError').textContent = '';
        document.getElementById('passwordError').textContent = '';
    }


    // ===========================
    // Caps Lock Detection
    // ===========================
    const capslockWarning = document.getElementById('capslockWarning');

    function updateCapsLockState(e) {
        if (capslockWarning) {
            capslockWarning.classList.toggle('show', e.getModifierState('CapsLock'));
        }
    }

    passwordInput.addEventListener('keydown', updateCapsLockState);
    passwordInput.addEventListener('keyup', updateCapsLockState);

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
                healthCheckBtn.dataset.tip = `서버 정상 (응답시간: ${responseTime}ms)`;
            } else {
                // 서버가 에러 응답
                healthCheckBtn.classList.remove('checking', 'healthy');
                healthCheckBtn.classList.add('unhealthy');
                healthCheckBtn.dataset.tip = `서버 오류 (HTTP ${response.status})`;
            }
        } catch (error) {
            // 네트워크 오류 또는 타임아웃
            healthCheckBtn.classList.remove('checking', 'healthy');
            healthCheckBtn.classList.add('unhealthy');

            if (error.name === 'AbortError') {
                healthCheckBtn.dataset.tip = '서버 응답 없음 (타임아웃)';
            } else {
                healthCheckBtn.dataset.tip = '서버 연결 실패';
            }
        } finally {
            isChecking = false;
        }
    }
});
