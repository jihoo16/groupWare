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
    const submitBtnText = document.getElementById('submitBtnText');
    const cancelBtn = document.getElementById('cancelBtn');

    // 기초정보 패널
    const infoPanel = document.getElementById('infoPanel');
    const infoConfirmCheckbox = document.getElementById('infoConfirmCheckbox');

    // 기본 정보 표시 필드
    const displayEmpId = document.getElementById('displayEmpId');
    const displayEmpName = document.getElementById('displayEmpName');
    const displayEmpDept = document.getElementById('displayEmpDept');
    const displayEmpPosition = document.getElementById('displayEmpPosition');
    const displayEmpEmail = document.getElementById('displayEmpEmail');
    const displayEmpPhone = document.getElementById('displayEmpPhone');
    const displayEmpJoinDate = document.getElementById('displayEmpJoinDate');

    // 추가 정보 입력 필드
    const empBirthInput = document.getElementById('empBirth');
    const empAddressInput = document.getElementById('empAddress');

    // 생년월일: 수동 입력 차단, 클릭 시 달력 오픈
    empBirthInput.addEventListener('keydown', (e) => e.preventDefault());
    empBirthInput.addEventListener('click', () => {
        try { empBirthInput.showPicker(); } catch (e) { /* 구형 브라우저 무시 */ }
    });
    const externalEmailInput = document.getElementById('externalEmail');
    const emergencyContactInput = document.getElementById('emergencyContact');

    // 페이지 이탈 방지 플래그
    let passwordChangeCompleted = false;

    // 최초 로그인 여부 및 현재 사용자 정보
    let isFirstLogin = false;
    let currentUser = null;

    // Password toggle buttons
    const toggleCurrentPassword = document.getElementById('toggleCurrentPassword');
    const toggleNewPassword = document.getElementById('toggleNewPassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

    // ===========================
    // 사용자 정보 로드 및 페이지 구성
    // ===========================
    try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
            currentUser = await response.json();
            isFirstLogin = currentUser.lastLoginDate === null || currentUser.lastLoginDate === undefined;

            if (isFirstLogin) {
                // 최초 로그인: 기초정보 패널 표시, 현재 비밀번호 숨김
                infoPanel.style.display = '';
                currentPasswordGroup.style.display = 'none';
                cancelBtn.style.display = 'none';

                // 관리자가 등록한 정보 표시 (textContent로 plain text 출력)
                displayEmpId.textContent = currentUser.empId || '-';
                displayEmpName.textContent = currentUser.empName || '-';
                displayEmpDept.textContent = currentUser.empDeptName || '-';
                displayEmpPosition.textContent = currentUser.empPositionName || '-';
                displayEmpEmail.textContent = currentUser.empEmail || '-';
                displayEmpPhone.textContent = currentUser.empPhone || '-';
                displayEmpJoinDate.textContent = currentUser.empJoinDate || '-';
                document.getElementById('displayEmpGender').textContent = currentUser.empGender || '-';

                // 이미 입력된 값이 있으면 채우기
                if (currentUser.empBirth) empBirthInput.value = currentUser.empBirth;
                if (currentUser.empAddress) empAddressInput.value = currentUser.empAddress;
                if (currentUser.externalEmail) externalEmailInput.value = currentUser.externalEmail;
                if (currentUser.emergencyContact) emergencyContactInput.value = currentUser.emergencyContact;

                newPasswordInput.focus();
            } else {
                // 일반 비밀번호 변경: 기초정보 패널 숨김, 헤더 변경, 현재 비밀번호 표시
                infoPanel.style.display = 'none';
                document.getElementById('mainLayout').classList.add('single-mode');
                currentPasswordGroup.style.display = 'block';
                currentPasswordInput.required = true;
                submitBtnText.textContent = '비밀번호 변경';
                cancelBtn.style.display = '';

                // 헤더 변경 (비밀번호 변경 모드)
                document.getElementById('headerIcon').innerHTML = '<i class="fas fa-key"></i>';
                document.getElementById('pageTitle').textContent = '비밀번호 변경';
                document.getElementById('pageSubtitle').textContent = '안전한 계정 사용을 위해 비밀번호를 변경해주세요.';

                currentPasswordInput.focus();
            }
        }
    } catch (error) {
        console.error('Failed to load user info:', error);
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
                icon.classList.toggle('fa-eye', type === 'password');
                icon.classList.toggle('fa-eye-slash', type === 'text');
            });
        }
    }

    setupPasswordToggle(toggleCurrentPassword, currentPasswordInput);
    setupPasswordToggle(toggleNewPassword, newPasswordInput);
    setupPasswordToggle(toggleConfirmPassword, confirmPasswordInput);

    // ===========================
    // Caps Lock Detection
    // ===========================
    const capslockWarning = document.getElementById('capslockWarning');

    function updateCapsLockState(e) {
        if (capslockWarning) {
            capslockWarning.classList.toggle('show', e.getModifierState('CapsLock'));
        }
    }

    [currentPasswordInput, newPasswordInput, confirmPasswordInput].forEach(input => {
        if (input) {
            input.addEventListener('keydown', updateCapsLockState);
            input.addEventListener('keyup', updateCapsLockState);
        }
    });

    // ===========================
    // 페이지 이탈 방지
    // ===========================
    window.addEventListener('beforeunload', (e) => {
        if (!passwordChangeCompleted) {
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    });

    history.pushState(null, null, location.href);
    window.addEventListener('popstate', function() {
        if (!passwordChangeCompleted) {
            history.pushState(null, null, location.href);
            showAlert('비밀번호를 변경해야 다른 페이지로 이동할 수 있습니다.', 'error');
        }
    });

    // ===========================
    // Password Validation
    // ===========================
    function validatePassword(password) {
        return {
            length: password.length >= 8 && password.length <= 20,
            letter: /[a-zA-Z]/.test(password),
            number: /\d/.test(password),
            special: /[@$!%*?&#]/.test(password)
        };
    }

    function updatePasswordRequirements(password) {
        const req = validatePassword(password);

        reqLength.classList.toggle('valid', req.length);
        reqLetter.classList.toggle('valid', req.letter);
        reqNumber.classList.toggle('valid', req.number);
        reqSpecial.classList.toggle('valid', req.special);

        if (password.length === 0) {
            newPasswordInput.classList.remove('error', 'success');
        } else if (Object.values(req).every(r => r)) {
            newPasswordInput.classList.remove('error');
            newPasswordInput.classList.add('success');
        } else {
            newPasswordInput.classList.remove('success');
            newPasswordInput.classList.add('error');
        }

        return Object.values(req).every(r => r);
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

        // 유효성 검사 (Swal alert + 확인 시 해당 필드 focus)
        if (!isFirstLogin && !currentPassword) {
            await alertAndFocus('현재 비밀번호를 입력해주세요.', currentPasswordInput);
            return;
        }

        if (!newPassword) {
            await alertAndFocus('새 비밀번호를 입력해주세요.', newPasswordInput);
            return;
        }

        if (!updatePasswordRequirements(newPassword)) {
            await alertAndFocus('비밀번호가 요구사항을 충족하지 않습니다.\n(8~20자, 영문, 숫자, 특수문자 포함)', newPasswordInput);
            return;
        }

        if (!confirmPassword) {
            await alertAndFocus('비밀번호 확인을 입력해주세요.', confirmPasswordInput);
            return;
        }

        if (!checkPasswordMatch()) {
            await alertAndFocus('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.', confirmPasswordInput);
            return;
        }

        if (!isFirstLogin && currentPassword === newPassword) {
            await alertAndFocus('현재 비밀번호와 새 비밀번호가 동일합니다.\n다른 비밀번호를 입력해주세요.', newPasswordInput);
            return;
        }

        // 최초 로그인 시 기초정보 검증
        if (isFirstLogin) {
            if (!infoConfirmCheckbox.checked) {
                await alertAndFocus('등록된 정보가 정확함을 확인해주세요.', infoConfirmCheckbox);
                return;
            }
            if (!empBirthInput.value.trim()) {
                await alertAndFocus('생년월일을 입력해주세요.', empBirthInput);
                return;
            }
            if (empBirthInput.value === '1990-01-01') {
                const confirm = await Swal.fire({
                    icon: 'question',
                    title: '생년월일 확인',
                    text: '생년월일이 1990년 01월 01일(기본값)로 되어 있습니다. 실제 생년월일이 맞습니까?',
                    confirmButtonText: '맞습니다',
                    cancelButtonText: '수정하겠습니다',
                    showCancelButton: true,
                    confirmButtonColor: '#667eea',
                    cancelButtonColor: '#ef4444',
                    returnFocus: false
                });
                if (!confirm.isConfirmed) {
                    empBirthInput.focus();
                    return;
                }
            }
if (!empAddressInput.value.trim()) {
                await alertAndFocus('주소를 입력해주세요.', empAddressInput);
                return;
            }
        }

        // 로딩 상태
        changePasswordBtn.classList.add('loading');
        changePasswordBtn.disabled = true;

        try {
            // 1. 최초 로그인 시 기초정보를 먼저 저장 (비밀번호 변경 전 - lastLoginDate가 null인 상태)
            if (isFirstLogin && currentUser) {
                const userUpdateData = {
                    empBirth: empBirthInput.value.trim(),
                    empAddress: empAddressInput.value.trim(),
                    externalEmail: externalEmailInput.value.trim() || null,
                    emergencyContact: emergencyContactInput.value.trim() || null
                };

                const userUpdateResponse = await fetch('/api/users/me', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userUpdateData)
                });

                if (!userUpdateResponse.ok) {
                    const errorData = await userUpdateResponse.json().catch(() => ({}));
                    throw new Error(errorData.error || '사용자 정보 업데이트에 실패했습니다.');
                }
            }

            // 2. 비밀번호 변경 (이 시점에 lastLoginDate가 설정됨)
            const passwordRequestBody = {
                newPassword: newPassword,
                confirmPassword: confirmPassword
            };
            if (!isFirstLogin) {
                passwordRequestBody.currentPassword = currentPassword;
            }

            const passwordResponse = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(passwordRequestBody)
            });

            if (!passwordResponse.ok) {
                const errorData = await passwordResponse.json().catch(() => ({}));
                throw new Error(errorData.error || '비밀번호 변경에 실패했습니다.');
            }

            // 완료
            passwordChangeCompleted = true;

            const successMsg = isFirstLogin
                ? '비밀번호 변경 및 정보 입력이 완료되었습니다.\n메인 페이지로 이동합니다...'
                : '비밀번호가 성공적으로 변경되었습니다.\n메인 페이지로 이동합니다...';
            showAlert(successMsg, 'success');

            setTimeout(() => { window.location.href = '/home'; }, 2000);

        } catch (error) {
            console.error('Form submit error:', error);
            showAlert(error.message || '처리 중 오류가 발생했습니다.\n다시 시도해주세요.', 'error');
            changePasswordBtn.classList.remove('loading');
            changePasswordBtn.disabled = false;
        }
    });

    // ===========================
    // 로그아웃 버튼
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
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
            passwordChangeCompleted = true;
            window.location.href = '/login';
        }
    });

    // ===========================
    // Helper Functions
    // ===========================
    function showAlert(message, type = 'error') {
        alertMessage.textContent = message;
        alertMessage.className = 'alert-message show ' + type;
        setTimeout(() => { alertMessage.classList.remove('show'); }, 5000);
    }

    async function alertAndFocus(message, targetElement) {
        await Swal.fire({
            icon: 'warning',
            title: '입력 확인',
            text: message,
            confirmButtonText: '확인',
            confirmButtonColor: '#667eea',
            returnFocus: false
        });
        if (targetElement) {
            targetElement.focus();
        }
    }
});
