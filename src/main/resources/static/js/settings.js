// 설정 페이지 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const toggleSwitches = document.querySelectorAll('.toggle-switch input');

    // 현재 로그인한 사용자 정보 불러오기
    loadCurrentUserProfile();

    // 전자서명 캔버스 초기화 - 보류된 서비스 (주석처리)
    // initSignatureCanvas();

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

    // 설정 저장 버튼 제거됨 (프로필 정보는 readonly, 역량관리는 개별 저장)
    // 토글 스위치 제거됨 (알림 기능 미구현)

    // 프로필 사진 변경 - 구현되지 않은 서비스 (주석처리)
    /*
    const changeAvatarBtn = document.querySelector('.btn-change-avatar');
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', async function() {
            console.log('프로필 사진 변경');
            await showAlert('프로필 사진 변경 기능은 추후 구현됩니다.');
            // TODO: 파일 업로드 모달 표시
        });
    }
    */

    // ===========================
    // 비밀번호 변경 - 실시간 검증
    // ===========================
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordMatchMessage = document.getElementById('passwordMatchMessage');

    // Password toggle buttons
    const toggleCurrentPassword = document.getElementById('toggleCurrentPassword');
    const toggleNewPassword = document.getElementById('toggleNewPassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

    // Requirement elements
    const reqLength = document.getElementById('req-length');
    const reqLetter = document.getElementById('req-letter');
    const reqNumber = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');

    // Password Toggle
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

    // Caps Lock Detection
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

    // Password Validation
    function validatePassword(password) {
        return {
            length: password.length >= 8 && password.length <= 20,
            letter: /[a-zA-Z]/.test(password),
            number: /\d/.test(password),
            special: /[@$!%*?&#]/.test(password)
        };
    }

    function updatePasswordRequirements(password) {
        if (!reqLength || !reqLetter || !reqNumber || !reqSpecial) return false;

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

    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', (e) => {
            updatePasswordRequirements(e.target.value);
            checkPasswordMatch();
        });
    }

    // Password Match Check
    function checkPasswordMatch() {
        if (!passwordMatchMessage || !confirmPasswordInput || !newPasswordInput) return false;

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

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    }

    // 비밀번호 변경
    const passwordChangeBtn = document.getElementById('changePasswordBtn');
    if (passwordChangeBtn) {
        passwordChangeBtn.addEventListener('click', async function() {
            const currentPassword = currentPasswordInput?.value;
            const newPassword = newPasswordInput?.value;
            const confirmPassword = confirmPasswordInput?.value;

            // 필드 검증
            if (!currentPassword || !newPassword || !confirmPassword) {
                await showWarning('모든 필드를 입력해주세요.');
                return;
            }

            // 비밀번호 요구사항 검증
            if (!updatePasswordRequirements(newPassword)) {
                await showWarning('비밀번호가 요구사항을 충족하지 않습니다.\n(8~20자, 영문, 숫자, 특수문자 포함)');
                return;
            }

            // 비밀번호 일치 확인
            if (!checkPasswordMatch()) {
                await showWarning('새 비밀번호가 일치하지 않습니다.');
                return;
            }

            // 현재 비밀번호와 새 비밀번호가 같은지 확인
            if (currentPassword === newPassword) {
                await showWarning('현재 비밀번호와 새 비밀번호가 동일합니다.\n다른 비밀번호를 입력해주세요.');
                return;
            }

            try {
                console.log('비밀번호 변경 API 호출');

                const response = await fetch('/api/auth/change-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        currentPassword: currentPassword,
                        newPassword: newPassword,
                        confirmPassword: confirmPassword
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    // 서버에서 반환한 에러 메시지 표시
                    await showError(data.error || '비밀번호 변경에 실패했습니다.');
                    return;
                }

                await showSuccess('비밀번호가 성공적으로 변경되었습니다.');

                // 입력 필드 초기화
                currentPasswordInput.value = '';
                newPasswordInput.value = '';
                confirmPasswordInput.value = '';

                // UI 상태 초기화
                newPasswordInput.classList.remove('error', 'success');
                confirmPasswordInput.classList.remove('error', 'success');
                passwordMatchMessage.classList.remove('show');
                if (reqLength) reqLength.classList.remove('valid');
                if (reqLetter) reqLetter.classList.remove('valid');
                if (reqNumber) reqNumber.classList.remove('valid');
                if (reqSpecial) reqSpecial.classList.remove('valid');

            } catch (error) {
                console.error('비밀번호 변경 오류:', error);
                await showError('비밀번호 변경 중 오류가 발생했습니다.');
            }
        });
    }

    // 프로필 정보 업데이트
    const updateProfileBtn = document.getElementById('updateProfileBtn');
    if (updateProfileBtn) {
        updateProfileBtn.addEventListener('click', async function() {
            const userEmail = document.getElementById('userEmail')?.value;
            const userPhone = document.getElementById('userPhone')?.value;
            const userAddress = document.getElementById('userAddress')?.value;

            // 필드 검증
            if (!userEmail || !userPhone) {
                await showWarning('이메일, 연락처는 필수 항목입니다.');
                return;
            }

            // 이메일 형식 검증
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(userEmail)) {
                await showWarning('올바른 이메일 형식을 입력해주세요.');
                return;
            }

            // 연락처 형식 검증 (숫자와 하이픈만 허용)
            const phoneRegex = /^[0-9-]+$/;
            if (!phoneRegex.test(userPhone)) {
                await showWarning('연락처는 숫자와 하이픈(-)만 입력 가능합니다.');
                return;
            }

            // 프로필 수정 확인
            const confirmed = await showConfirm(
                '전산상 근로자의 정보가 변경됩니다.<br>정말로 정보를 변경하시겠습니까?',
                '프로필 수정 확인',
                {
                    icon: 'warning',
                    confirmText: '변경',
                    confirmColor: '#ff9800'
                }
            );

            if (!confirmed) {
                return;
            }

            try {
                console.log('프로필 업데이트 API 호출');

                const response = await fetch('/api/users/me', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        empEmail: userEmail,
                        empPhone: userPhone,
                        empAddress: userAddress
                    })
                });

                if (!response.ok) {
                    const data = await response.json();
                    await showError(data.error || '프로필 업데이트에 실패했습니다.');
                    return;
                }

                const updatedUser = await response.json();
                console.log('프로필 업데이트 성공:', updatedUser);

                await showSuccess('프로필이 성공적으로 업데이트되었습니다.');

            } catch (error) {
                console.error('프로필 업데이트 오류:', error);
                await showError('프로필 업데이트 중 오류가 발생했습니다.');
            }
        });
    }

    // 시스템 설정 관련 - 구현되지 않은 서비스 (주석처리)
    /*
    // 캐시 삭제
    const deleteCacheBtn = document.querySelector('.data-section .btn-danger-outline');
    if (deleteCacheBtn) {
        deleteCacheBtn.addEventListener('click', async function() {
            const confirmed = await showConfirm('캐시 데이터를 삭제하시겠습니까?');
            if (confirmed) {
                console.log('캐시 삭제');
                await showSuccess('캐시가 삭제되었습니다.');
                // TODO: 캐시 삭제 처리
            }
        });
    }

    // 데이터 다운로드
    const downloadDataBtn = document.querySelector('.data-section .btn-secondary');
    if (downloadDataBtn) {
        downloadDataBtn.addEventListener('click', async function() {
            console.log('내 데이터 다운로드');
            await showSuccess('데이터 다운로드가 시작됩니다.');
            // TODO: 데이터 다운로드 처리
        });
    }

    // 테마 변경
    const themeSelect = document.querySelector('#system .form-select[value="light"]');
    if (themeSelect) {
        themeSelect.addEventListener('change', async function() {
            const theme = this.value;
            console.log('테마 변경:', theme);
            // TODO: 테마 변경 적용
            await showAlert(`테마가 "${this.options[this.selectedIndex].text}"로 변경됩니다.`);
        });
    }

    // 언어 변경
    const languageSelect = document.querySelector('#system .form-select:nth-of-type(2)');
    if (languageSelect) {
        languageSelect.addEventListener('change', async function() {
            const language = this.value;
            console.log('언어 변경:', language);
            // TODO: 언어 변경 적용
            await showAlert(`언어가 "${this.options[this.selectedIndex].text}"로 변경됩니다.`);
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
    */

    // 페이지 이탈 경고 제거됨 (프로필 정보 readonly, 역량관리는 개별 저장되므로 불필요)
});

/* 전자서명 관련 함수들 - 보류된 서비스 (주석처리)
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
        saveBtn.addEventListener('click', async function() {
            if (!hasDrawn) {
                await showWarning('서명을 작성해주세요.');
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
*/

// ============================================================
// 역량관리 - API 연동
// ============================================================

let currentUserIdx = null;

const DEGREE_TYPE_LABEL = {
    HIGH_SCHOOL: '고졸',
    ASSOCIATE:   '전문학사',
    BACHELOR:    '학사',
    MASTER:      '석사',
    DOCTOR:      '박사'
};

// type → 설정 매핑
const COMPETENCY_CONFIG = {
    education: {
        apiPath:   '/api/competency/schools',
        modalId:   'schoolModal',
        titleElId: 'schoolModalTitle',
        listId:    'educationList',
        titleAdd:  '학력 추가',
        titleEdit: '학력 수정',
        saveBtnId: 'saveSchoolBtn'
    },
    certificate: {
        apiPath:   '/api/competency/certificates',
        modalId:   'certificateModal',
        titleElId: 'certificateModalTitle',
        listId:    'certificateList',
        titleAdd:  '자격증 추가',
        titleEdit: '자격증 수정',
        saveBtnId: 'saveCertificateBtn'
    },
    career: {
        apiPath:   '/api/competency/careers',
        modalId:   'careerModal',
        titleElId: 'careerModalTitle',
        listId:    'careerList',
        titleAdd:  '경력 추가',
        titleEdit: '경력 수정',
        saveBtnId: 'saveCareerBtn'
    },
    training: {
        apiPath:   '/api/competency/trainings',
        modalId:   'trainingModal',
        titleElId: 'trainingModalTitle',
        listId:    'trainingList',
        titleAdd:  '교육이수 추가',
        titleEdit: '교육이수 수정',
        saveBtnId: 'saveTrainingBtn'
    }
};

// 역량관리 초기화
document.addEventListener('DOMContentLoaded', function() {
    initCompetencyManagement();
});

function initCompetencyManagement() {
    // 추가 버튼 → 해당 모달 열기 (추가 모드)
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.btn-add');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const type = btn.getAttribute('data-type');
        openCompetencyModal(type, null);
    });

    // 모달 닫기 버튼 / 배경 클릭 / 저장 버튼
    Object.keys(COMPETENCY_CONFIG).forEach(function(type) {
        const cfg       = COMPETENCY_CONFIG[type];
        const modal     = document.getElementById(cfg.modalId);
        const prefix    = cfg.modalId.replace('Modal', '');
        const capPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1);
        const closeBtn  = document.getElementById('close' + capPrefix + 'Modal');
        const cancelBtn = document.getElementById('cancel' + capPrefix + 'Modal');
        const saveBtn   = document.getElementById(cfg.saveBtnId);

        if (closeBtn)  closeBtn.addEventListener('click',  () => closeCompetencyModal(type));
        if (cancelBtn) cancelBtn.addEventListener('click', () => closeCompetencyModal(type));
        if (modal)     modal.addEventListener('click', function(e) {
            if (e.target === modal) closeCompetencyModal(type);
        });
        if (saveBtn)   saveBtn.addEventListener('click', () => saveCompetency(type));
    });

    // 경력 모달 — is_now 체크 시 종료일 비활성화 + 기간 자동 계산
    const isNowCheckbox        = document.getElementById('isNow');
    const careerEndDateInput   = document.getElementById('careerEndDate');
    const careerStartDateInput = document.getElementById('careerStartDate');

    if (isNowCheckbox) {
        isNowCheckbox.addEventListener('change', function() {
            const careerCategoryInput   = document.getElementById('careerCategory');
            const isIndustryCheckbox    = document.getElementById('isIndustryExperience');

            if (this.checked) {
                careerEndDateInput.value    = '';
                careerEndDateInput.disabled = true;
                // "현재 재직중 = (주) 파인씨앤아이" — 관련 필드 자동 입력 (덮어쓰기)
                // careerStartDate 는 month input 이므로 YYYY-MM 형식으로 변환
                if (currentUserJoinDate && careerStartDateInput) {
                    careerStartDateInput.value = String(currentUserJoinDate).substring(0, 7);
                    careerStartDateInput.classList.remove('error');
                }
                if (careerCategoryInput) {
                    careerCategoryInput.value = '(주) 파인씨앤아이';
                    careerCategoryInput.classList.remove('error');
                }
                if (isIndustryCheckbox) {
                    isIndustryCheckbox.checked = true;
                }
            } else {
                // 체크 해제 — 다른 경력 입력을 위해 자동 채워졌던 필드 모두 원복
                careerEndDateInput.disabled = false;
                if (careerStartDateInput) careerStartDateInput.value = '';
                if (careerCategoryInput)  careerCategoryInput.value  = '';
                if (isIndustryCheckbox)   isIndustryCheckbox.checked = false;
            }
            updateCareerPeriodDisplay();
        });
    }
    if (careerStartDateInput) careerStartDateInput.addEventListener('change', updateCareerPeriodDisplay);
    if (careerEndDateInput)   careerEndDateInput.addEventListener('change',   updateCareerPeriodDisplay);

    // 모든 date / month input — 입력 영역 아무데나 클릭하면 picker 열기
    // (기본 동작은 우측 작은 아이콘 클릭해야 열림. UX 개선)
    // 대상: 학력 졸업일, 자격증 취득일, 경력 시작/종료 월, 교육 수료일
    document.querySelectorAll('input[type="date"], input[type="month"]').forEach(input => {
        input.addEventListener('click', () => {
            if (typeof input.showPicker === 'function') {
                try { input.showPicker(); } catch (e) { /* 사용자 상호작용 외 호출 시 무시 */ }
            }
        });
    });
}

// ============================================================
// 모달 열기 / 닫기
// ============================================================

function openCompetencyModal(type, item) {
    const cfg   = COMPETENCY_CONFIG[type];
    const modal = document.getElementById(cfg.modalId);
    const title = document.getElementById(cfg.titleElId);

    if (item) {
        if (title) title.textContent = cfg.titleEdit;
        fillModalFields(type, item);
    } else {
        if (title) title.textContent = cfg.titleAdd;
        resetModalFields(type);
    }

    // 첨부파일 영역 — 학력/자격증만 적용. 수정 모드(item 있음)에서만 표시.
    setupAttachmentSection(type, item);

    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
}

function closeCompetencyModal(type) {
    const cfg   = COMPETENCY_CONFIG[type];
    const modal = document.getElementById(cfg.modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
    // 신규 모드 pending 파일 정리 (취소/닫기 시 메모리에 남지 않도록)
    if (pendingAttachments[type]) pendingAttachments[type] = [];
    resetModalFields(type);
}

// ============================================================
// 모달 필드 초기화 / 채우기
// ============================================================

function resetModalFields(type) {
    switch(type) {
        case 'education':
            document.getElementById('schoolIdx').value        = '';
            document.getElementById('schoolName').value       = '';
            document.getElementById('degreeType').value       = 'BACHELOR'; // 기본값: 학사
            document.getElementById('majorName').value        = '';
            document.getElementById('graduationDate').value   = '';
            document.getElementById('schoolIsStemMajor').checked = false;
            document.getElementById('schoolNotes').value      = '';
            document.getElementById('schoolName').classList.remove('error');
            document.getElementById('degreeType').classList.remove('error');
            break;
        case 'certificate':
            document.getElementById('certificateIdx').value   = '';
            document.getElementById('certificateName').value  = '';
            document.getElementById('issuingOrgName').value   = '';
            document.getElementById('issuedDate').value       = '';
            document.getElementById('isExpired').checked      = false;
            document.getElementById('certificateNotes').value = '';
            document.getElementById('certificateName').classList.remove('error');
            document.getElementById('issuingOrgName').classList.remove('error');
            document.getElementById('issuedDate').classList.remove('error');
            break;
        case 'career':
            document.getElementById('careerIdx').value           = '';
            document.getElementById('careerCategory').value      = '';
            document.getElementById('isIndustryExperience').checked = false;
            document.getElementById('careerStartDate').value     = '';
            document.getElementById('careerEndDate').value       = '';
            document.getElementById('careerEndDate').disabled    = false;
            document.getElementById('isNow').checked             = false;
            document.getElementById('careerPeriodDisplay').textContent = '-';
            document.getElementById('careerSummary').value       = '';
            document.getElementById('careerNotes').value         = '';
            document.getElementById('careerCategory').classList.remove('error');
            document.getElementById('careerStartDate').classList.remove('error');
            document.getElementById('careerEndDate').classList.remove('error');
            document.getElementById('careerSummary').classList.remove('error');
            break;
        case 'training':
            document.getElementById('trainingIdx').value        = '';
            document.getElementById('trainingName').value       = '';
            document.getElementById('trainingOrgName').value    = '';
            document.getElementById('completionDate').value     = '';
            document.getElementById('trainingNotes').value      = '';
            document.getElementById('trainingName').classList.remove('error');
            document.getElementById('trainingOrgName').classList.remove('error');
            document.getElementById('completionDate').classList.remove('error');
            break;
    }
}

function fillModalFields(type, item) {
    switch(type) {
        case 'education':
            document.getElementById('schoolIdx').value       = item.idx || '';
            document.getElementById('schoolName').value      = item.schoolName || '';
            document.getElementById('degreeType').value      = item.degreeType || '';
            document.getElementById('majorName').value       = item.majorName || '';
            document.getElementById('graduationDate').value  = item.graduationDate || '';
            document.getElementById('schoolIsStemMajor').checked = !!item.isStemMajor;
            document.getElementById('schoolNotes').value     = item.notes || '';
            break;
        case 'certificate':
            document.getElementById('certificateIdx').value   = item.idx || '';
            document.getElementById('certificateName').value  = item.certificateName || '';
            document.getElementById('issuingOrgName').value   = item.issuingOrgName || '';
            document.getElementById('issuedDate').value       = item.issuedDate || '';
            document.getElementById('isExpired').checked      = item.isExpired || false;
            document.getElementById('certificateNotes').value = item.notes || '';
            break;
        case 'career':
            // careerStartDate / careerEndDate 는 month input — LocalDate(YYYY-MM-DD) → YYYY-MM 로 자르기
            document.getElementById('careerIdx').value              = item.idx || '';
            document.getElementById('careerCategory').value         = item.careerCategory || '';
            document.getElementById('isIndustryExperience').checked = item.isIndustryExperience || false;
            document.getElementById('careerStartDate').value        = item.careerStartDate ? String(item.careerStartDate).substring(0, 7) : '';
            document.getElementById('isNow').checked                = item.isNow || false;
            if (item.isNow) {
                document.getElementById('careerEndDate').value    = '';
                document.getElementById('careerEndDate').disabled = true;
            } else {
                document.getElementById('careerEndDate').value    = item.careerEndDate ? String(item.careerEndDate).substring(0, 7) : '';
                document.getElementById('careerEndDate').disabled = false;
            }
            document.getElementById('careerSummary').value = item.careerSummary || '';
            document.getElementById('careerNotes').value   = item.notes || '';
            updateCareerPeriodDisplay();
            break;
        case 'training':
            document.getElementById('trainingIdx').value        = item.idx || '';
            document.getElementById('trainingName').value       = item.trainingName || '';
            document.getElementById('trainingOrgName').value    = item.trainingOrgName || '';
            document.getElementById('completionDate').value     = item.completionDate || '';
            document.getElementById('trainingNotes').value      = item.notes || '';
            break;
    }
}

// ============================================================
// 경력기간 자동 계산 표시
// ============================================================

function updateCareerPeriodDisplay() {
    const startVal  = document.getElementById('careerStartDate').value;
    const endVal    = document.getElementById('careerEndDate').value;
    const isNow     = document.getElementById('isNow').checked;
    const display   = document.getElementById('careerPeriodDisplay');

    if (!startVal) { display.textContent = '-'; return; }

    const start = new Date(startVal);
    const end   = isNow ? new Date() : (endVal ? new Date(endVal) : null);

    if (!end || end <= start) { display.textContent = '-'; return; }

    let years  = end.getFullYear() - start.getFullYear();
    let months = end.getMonth()    - start.getMonth();
    if (months < 0) { years--; months += 12; }

    let text = '';
    if (years > 0)  text += years  + '년 ';
    if (months > 0) text += months + '개월';
    display.textContent = text.trim() || '1개월 미만';
}

// ============================================================
// API 호출 — 목록 로드
// ============================================================

async function loadCompetency(type) {
    if (!currentUserIdx) return;
    const cfg = COMPETENCY_CONFIG[type];
    try {
        const res = await fetch(`${cfg.apiPath}?userIdx=${currentUserIdx}`);
        if (!res.ok) throw new Error();
        const items = await res.json();
        renderCompetencyList(type, items);
    } catch (e) {
        console.error(`[${type}] 목록 로드 실패`, e);
    }
}

async function loadAllCompetencies() {
    await Promise.all(Object.keys(COMPETENCY_CONFIG).map(type => loadCompetency(type)));
}

// ============================================================
// API 호출 — 저장 (추가 / 수정)
// ============================================================

async function saveCompetency(type) {
    if (!currentUserIdx) return;
    const cfg     = COMPETENCY_CONFIG[type];
    const payload = buildPayload(type);
    if (!payload) return; // 유효성 검증 실패

    const idxVal  = document.getElementById(getIdxFieldId(type)).value;
    const isEdit  = !!idxVal;
    const url     = isEdit ? `${cfg.apiPath}/${idxVal}` : `${cfg.apiPath}?userIdx=${currentUserIdx}`;
    const method  = isEdit ? 'PUT' : 'POST';

    // 학력/자격증은 첨부파일 1개 이상 필수
    if (type === 'education' || type === 'certificate') {
        if (!isEdit) {
            // 신규 — pending 파일이 1개 이상 있어야 함
            if ((pendingAttachments[type] || []).length === 0) {
                const label = type === 'education' ? '졸업증명서' : '자격증 사본';
                await showWarning(`${label} 등 첨부파일을 1개 이상 등록해 주세요.`);
                return;
            }
        } else {
            // 수정 — 모달 안 첨부 칩이 1개 이상 있어야 함
            const aCfg = ATTACHMENT_CONFIG[type];
            const list = document.getElementById(aCfg.listId);
            const count = list ? list.querySelectorAll('.attachment-chip').length : 0;
            if (count === 0) {
                const label = type === 'education' ? '졸업증명서' : '자격증 사본';
                await showWarning(`${label} 등 첨부파일을 1개 이상 등록해 주세요.`);
                return;
            }
        }
    }

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.status === 403) {
            await showWarning('본인 또는 관리자만 수정할 수 있습니다.');
            return;
        }
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            await showError(data.error || '저장에 실패했습니다.');
            return;
        }

        // 신규 등록(학력/자격증)인 경우 — pending 첨부 파일을 일괄 업로드 후 모달 닫기
        if (!isEdit && (type === 'education' || type === 'certificate')) {
            const created = await res.json().catch(() => null);
            if (created && created.idx) {
                const aCfg = ATTACHMENT_CONFIG[type];
                const pending = (pendingAttachments[type] || []).slice();
                let upFail = 0;

                for (const file of pending) {
                    try {
                        const formData = new FormData();
                        formData.append('file', file);
                        const upRes = await fetch(aCfg.uploadUrl(created.idx), {
                            method: 'POST',
                            body: formData
                        });
                        if (!upRes.ok) {
                            upFail++;
                            console.error(`[첨부] ${file.name} 업로드 실패`, upRes.status);
                        }
                    } catch (e) {
                        upFail++;
                        console.error(`[첨부] ${file.name} 업로드 오류`, e);
                    }
                }

                pendingAttachments[type] = [];
                closeCompetencyModal(type);
                await loadCompetency(type);

                if (upFail > 0) {
                    await showWarning(`저장은 완료되었으나 ${upFail}개 첨부파일 업로드에 실패했습니다.`);
                } else if (pending.length > 0) {
                    await showSuccess(`저장되었습니다. (첨부 ${pending.length}개 포함)`);
                } else {
                    await showSuccess('저장되었습니다.');
                }
                return;
            }
        }

        closeCompetencyModal(type);
        await loadCompetency(type);
        await showSuccess(isEdit ? '수정되었습니다.' : '저장되었습니다.');
    } catch (e) {
        console.error(`[${type}] 저장 실패`, e);
        await showError('저장 중 오류가 발생했습니다.');
    }
}

// ============================================================
// API 호출 — 삭제
// ============================================================

async function deleteCompetency(type, idx) {
    const confirmed = await showDeleteConfirm('삭제하시겠습니까?');
    if (!confirmed) return;

    const cfg = COMPETENCY_CONFIG[type];
    try {
        const res = await fetch(`${cfg.apiPath}/${idx}`, { method: 'DELETE' });

        if (res.status === 403) {
            await showWarning('본인 또는 관리자만 삭제할 수 있습니다.');
            return;
        }
        if (!res.ok) throw new Error();

        await loadCompetency(type);
        await showSuccess('삭제되었습니다.');
    } catch (e) {
        console.error(`[${type}] 삭제 실패`, e);
        await showError('삭제 중 오류가 발생했습니다.');
    }
}

// ============================================================
// payload 빌드 + 유효성 검증
// ============================================================

function getIdxFieldId(type) {
    const map = { education: 'schoolIdx', certificate: 'certificateIdx', career: 'careerIdx', training: 'trainingIdx' };
    return map[type];
}

function buildPayload(type) {
    switch(type) {
        case 'education': {
            const schoolName   = document.getElementById('schoolName').value.trim();
            const degreeType   = document.getElementById('degreeType').value;
            if (!schoolName) {
                document.getElementById('schoolName').classList.add('error');
                showWarning('학교명을 입력해주세요.'); return null;
            }
            if (!degreeType) {
                document.getElementById('degreeType').classList.add('error');
                showWarning('학위구분을 선택해주세요.'); return null;
            }
            return {
                schoolName,
                degreeType,
                majorName:      document.getElementById('majorName').value.trim() || null,
                graduationDate: document.getElementById('graduationDate').value   || null,
                isStemMajor:    document.getElementById('schoolIsStemMajor').checked,
                notes:          document.getElementById('schoolNotes').value.trim() || null
            };
        }
        case 'certificate': {
            const certificateName = document.getElementById('certificateName').value.trim();
            const issuingOrgName  = document.getElementById('issuingOrgName').value.trim();
            const issuedDate      = document.getElementById('issuedDate').value;
            if (!certificateName) {
                document.getElementById('certificateName').classList.add('error');
                showWarning('자격증명을 입력해주세요.'); return null;
            }
            if (!issuingOrgName) {
                document.getElementById('issuingOrgName').classList.add('error');
                showWarning('발급기관을 입력해주세요.'); return null;
            }
            if (!issuedDate) {
                document.getElementById('issuedDate').classList.add('error');
                showWarning('취득일을 입력해주세요.'); return null;
            }
            return {
                certificateName,
                issuingOrgName,
                issuedDate,
                isExpired: document.getElementById('isExpired').checked,
                notes:     document.getElementById('certificateNotes').value.trim() || null
            };
        }
        case 'career': {
            // month input 값(YYYY-MM) → 백엔드 LocalDate 용 YYYY-MM-01 로 변환해 전송
            const careerCategory  = document.getElementById('careerCategory').value.trim();
            const careerStartMonth = document.getElementById('careerStartDate').value;  // YYYY-MM
            const isNow            = document.getElementById('isNow').checked;
            const careerEndMonth   = document.getElementById('careerEndDate').value;    // YYYY-MM
            const careerSummary    = document.getElementById('careerSummary').value.trim();
            if (!careerCategory) {
                document.getElementById('careerCategory').classList.add('error');
                showWarning('회사명을 입력해주세요.'); return null;
            }
            if (!careerStartMonth) {
                document.getElementById('careerStartDate').classList.add('error');
                showWarning('시작 월을 입력해주세요.'); return null;
            }
            if (!isNow && !careerEndMonth) {
                document.getElementById('careerEndDate').classList.add('error');
                showWarning('종료 월을 입력하거나 현재 재직중을 체크해주세요.'); return null;
            }
            if (!careerSummary) {
                document.getElementById('careerSummary').classList.add('error');
                showWarning('경력 내용을 입력해주세요.'); return null;
            }
            return {
                careerCategory,
                isIndustryExperience: document.getElementById('isIndustryExperience').checked,
                careerSummary,
                careerStartDate:      careerStartMonth ? `${careerStartMonth}-01` : null,
                careerEndDate:        (isNow || !careerEndMonth) ? null : `${careerEndMonth}-01`,
                isNow,
                notes:                document.getElementById('careerNotes').value.trim() || null
            };
        }
        case 'training': {
            const trainingName    = document.getElementById('trainingName').value.trim();
            const trainingOrgName = document.getElementById('trainingOrgName').value.trim();
            const completionDate  = document.getElementById('completionDate').value;
            if (!trainingName) {
                document.getElementById('trainingName').classList.add('error');
                showWarning('교육명을 입력해주세요.'); return null;
            }
            if (!trainingOrgName) {
                document.getElementById('trainingOrgName').classList.add('error');
                showWarning('교육기관을 입력해주세요.'); return null;
            }
            if (!completionDate) {
                document.getElementById('completionDate').classList.add('error');
                showWarning('이수일자를 입력해주세요.'); return null;
            }
            return {
                trainingName,
                trainingOrgName,
                completionDate,
                notes: document.getElementById('trainingNotes').value.trim() || null
            };
        }
    }
    return null;
}

// ============================================================
// 목록 렌더링
// ============================================================

function renderCompetencyList(type, items) {
    const cfg           = COMPETENCY_CONFIG[type];
    const listContainer = document.getElementById(cfg.listId);
    if (!listContainer) return;

    // 첨부 갱신 시 다시 찾을 수 있도록 마지막 데이터 캐시
    listContainer._lastItems = items || [];

    // 학력은 필수 — 0건이면 부모 섹션에 강조 클래스 추가
    if (type === 'education') {
        const section = listContainer.closest('.competency-section');
        if (section) {
            const isEmpty = !items || items.length === 0;
            section.classList.toggle('required-empty', isEmpty);
        }
    }

    if (!items || items.length === 0) {
        const emptyMsg = type === 'education'
            ? '<div class="empty-message empty-required">⚠ 학력은 필수 입력 사항입니다. 위의 <strong>+ 추가</strong> 버튼으로 등록해 주세요.</div>'
            : '<div class="empty-message">등록된 항목이 없습니다.</div>';
        listContainer.innerHTML = emptyMsg;
        return;
    }

    listContainer.innerHTML = items.map(item => {
        let mainHTML = '';
        let detailParts = [];   // detail + period 를 한 줄로 합침
        let attachmentsHTML = '';

        const notesHTML = item.notes
            ? `<div class="item-notes" title="${escapeAttr(item.notes)}">📝 ${escapeAttr(item.notes)}</div>`
            : '';

        switch(type) {
            case 'education': {
                mainHTML = `<strong>${escapeAttr(item.schoolName)}</strong>`
                         + (item.isStemMajor ? '<span class="chip chip-stem">이공계</span>' : '');
                const degree = DEGREE_TYPE_LABEL[item.degreeType] || item.degreeType;
                if (degree) detailParts.push(escapeAttr(degree));
                if (item.majorName) detailParts.push(escapeAttr(item.majorName));
                if (item.graduationDate) detailParts.push(`졸업 ${formatDate(item.graduationDate)}`);
                attachmentsHTML = renderInlineAttachmentChips('school', item.attachments);
                break;
            }
            case 'certificate': {
                mainHTML = `<strong>${escapeAttr(item.certificateName)}</strong>`
                         + (item.isExpired ? '<span class="chip chip-expired">만료</span>' : '');
                if (item.issuingOrgName) detailParts.push(escapeAttr(item.issuingOrgName));
                if (item.issuedDate) detailParts.push(`취득 ${formatDate(item.issuedDate)}`);
                attachmentsHTML = renderInlineAttachmentChips('certificate', item.attachments);
                break;
            }
            case 'career': {
                mainHTML = `<strong>${escapeAttr(item.careerCategory)}</strong>`
                         + (item.isIndustryExperience ? '<span class="chip chip-industry">업계경력</span>' : '')
                         + (item.isNow ? '<span class="chip chip-now">재직중</span>' : '');
                if (item.careerSummary) detailParts.push(escapeAttr(item.careerSummary));
                const period = `${formatDate(item.careerStartDate)} ~ ${item.isNow ? '현재' : formatDate(item.careerEndDate)}`;
                const yearsMonths = (item.careerPeriodYears || item.careerPeriodMonths)
                    ? ` (${item.careerPeriodYears > 0 ? item.careerPeriodYears + '년 ' : ''}${item.careerPeriodMonths > 0 ? item.careerPeriodMonths + '개월' : ''})`
                    : '';
                detailParts.push(period + yearsMonths);
                break;
            }
            case 'training': {
                mainHTML = `<strong>${escapeAttr(item.trainingName)}</strong>`;
                if (item.trainingOrgName) detailParts.push(escapeAttr(item.trainingOrgName));
                if (item.completionDate) detailParts.push(`이수 ${formatDate(item.completionDate)}`);
                break;
            }
        }

        const detailLine = detailParts.length > 0
            ? `<div class="item-detail-line">${detailParts.join(' · ')}</div>`
            : '';

        const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');

        return `
        <div class="competency-item competency-item-v2">
            <div class="item-main">
                <div class="item-main-line">${mainHTML}</div>
                ${detailLine}
                ${attachmentsHTML}
                ${notesHTML}
            </div>
            <div class="item-actions">
                <button class="btn-icon btn-edit"   onclick="openCompetencyModal('${type}', ${itemJson})" title="수정">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteCompetency('${type}', ${item.idx})" title="삭제">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`;
    }).join('');

    // 첨부 칩 클릭 → 미리보기 모달 (event delegation, 한 번만 등록)
    if (!listContainer._attachmentBound) {
        listContainer.addEventListener('click', e => {
            const chip = e.target.closest('.attachment-inline-chip');
            if (!chip) return;
            e.preventDefault();
            e.stopPropagation();
            const url  = chip.getAttribute('data-url');
            const name = chip.getAttribute('data-name');
            if (window.openFilePreview) {
                window.openFilePreview([{ url, filename: name }], 0);
            }
        });
        listContainer._attachmentBound = true;
    }
}

/** 학력/자격증 행 아래에 첨부 칩들을 풀어서 출력 (클릭 시 미리보기) */
function renderInlineAttachmentChips(kind, attachments) {
    if (!attachments || attachments.length === 0) return '';
    const baseUrl = kind === 'school'
        ? '/api/competency/schools/attachments'
        : '/api/competency/certificates/attachments';
    const chips = attachments.map(a => `
        <button type="button" class="attachment-inline-chip"
                data-url="${baseUrl}/${a.idx}/download"
                data-name="${escapeAttr(a.originalFilename)}"
                title="클릭해서 미리보기">
            <i class="fas fa-paperclip"></i>
            <span>${escapeAttr(a.originalFilename)}</span>
        </button>
    `).join('');
    return `<div class="item-attachments-inline">${chips}</div>`;
}

// 역량 데이터 저장 (localStorage 제거 — API 사용으로 대체)
function saveCompetencyData() {}

// 역량 데이터 불러오기 (localStorage 제거 — API 사용으로 대체)
function loadCompetencyData() {}

// 날짜 포맷팅
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
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
        confirmBtn.addEventListener('click', async function() {
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

                await showWarning('동의 내용을 확인하고 체크박스를 체크해주세요.');
                return;
            }

            if (!window.tempSignatureData) {
                await showError('서명 데이터가 없습니다.');
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

            await showSuccess('서명이 저장되었습니다.');

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

// 현재 로그인한 사용자 정보 불러오기
async function loadCurrentUserProfile() {
    try {
        const response = await fetch('/api/users/me');

        if (response.status === 401) {
            console.error('로그인이 필요합니다.');
            await showError('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
            window.location.href = '/login';
            return;
        }

        if (!response.ok) {
            throw new Error('사용자 정보를 불러오는데 실패했습니다.');
        }

        const user = await response.json();
        console.log('현재 사용자 정보:', user);

        // 역량관리 — 현재 사용자 idx 저장 후 목록 로드
        currentUserIdx = user.idx;
        currentUserGender = user.empGender || null;
        currentUserJoinDate = user.empJoinDate || null;
        currentUserName = user.empName || null;
        loadAllCompetencies();

        // 병적사항 — 코드 옵션 로드 후 현재 값 로드
        initMilitaryService();

        // 폼 필드에 데이터 채우기
        const userNameDiv = document.getElementById('userName');
        const userPositionDiv = document.getElementById('userPosition');
        const userDeptDiv = document.getElementById('userDept');
        const userBirthDiv = document.getElementById('userBirth');
        const userEmailInput = document.getElementById('userEmail');
        const userPhoneInput = document.getElementById('userPhone');
        const userAddressInput = document.getElementById('userAddress');

        // 이름, 직급, 부서, 생년월일은 읽기 전용 div
        if (userNameDiv) userNameDiv.textContent = user.empName || '-';
        if (userPositionDiv) userPositionDiv.textContent = user.empPositionName || user.empPosition || '-';
        if (userDeptDiv) userDeptDiv.textContent = user.empDeptName || user.empDept || '-';
        if (userBirthDiv) userBirthDiv.textContent = user.empBirth || '-';

        // 이메일, 연락처, 주소는 편집 가능한 input
        if (userEmailInput) userEmailInput.value = user.empEmail || '';
        if (userPhoneInput) userPhoneInput.value = user.empPhone || '';
        if (userAddressInput) userAddressInput.value = user.empAddress || '';

    } catch (error) {
        console.error('사용자 정보 로드 오류:', error);
        await showError('사용자 정보를 불러오는데 오류가 발생했습니다.');
    }
}

// ============================================================
// 병적사항 (본인 입력만 가능)
// ============================================================

/** 입대일/전역일 입력이 가능한 코드값 — 병역필(C1201) / 특례필(C1204) */
const MILITARY_DATE_ALLOWED_CODES = ['C1201', 'C1204'];

/** 부분 날짜 정규식 — YYYY / YYYY-MM / YYYY-MM-DD */
const PARTIAL_DATE_REGEX = /^\d{4}(-\d{2}(-\d{2})?)?$/;

/** 성별별 병역구분 기본값 — 미설정 사용자에게 자동 적용 */
const MILITARY_DEFAULT_BY_GENDER = {
    '남': 'C1201', // 병역필
    '여': 'C1205'  // 해당사항없음
};

/** 현재 사용자의 성별 (loadCurrentUserProfile 에서 채워짐) */
let currentUserGender = null;

/** 현재 사용자의 입사일 (loadCurrentUserProfile 에서 채워짐) — 경력 "현재 재직중" 체크 시 시작일 자동 입력용 */
let currentUserJoinDate = null;

/** 현재 사용자의 이름 (loadCurrentUserProfile 에서 채워짐) — 첨부파일 자동 명명용 */
let currentUserName = null;

async function initMilitaryService() {
    if (!currentUserIdx) return;

    // 1) 코드 옵션 로드
    await loadMilitaryStatusOptions();

    // 2) 병역구분 변경 시 입대일/전역일 토글 + dirty 표시
    const statusSelect = document.getElementById('militaryStatus');
    if (statusSelect) {
        statusSelect.addEventListener('change', () => {
            toggleMilitaryDateRows();
            markMilitaryDirty();
        });
    }

    // 3) 저장 버튼
    const saveBtn = document.getElementById('saveMilitaryBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveMilitaryService);
    }

    // 4) 입력 필드 변경 감지 → dirty 표시
    ['militaryEnlistDate', 'militaryDischargeDate', 'militaryNotes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', markMilitaryDirty);
    });

    // 5) 현재 값 로드
    await loadMilitaryService();
}

/** 카드 상태를 dirty(수정 중)로 전환 */
function markMilitaryDirty() {
    const card   = document.getElementById('militaryServiceCard');
    const badge  = document.getElementById('militaryStateBadge');
    const saveBtn = document.getElementById('saveMilitaryBtn');
    if (!card) return;

    if (card.getAttribute('data-state') === 'dirty') return; // 이미 dirty
    card.setAttribute('data-state', 'dirty');
    if (badge) badge.innerHTML = '<i class="fas fa-pencil-alt"></i> 수정 중 — 저장 필요';
    if (saveBtn) saveBtn.disabled = false;
}

/** 카드 상태를 clean(저장됨)으로 전환 */
function markMilitaryClean() {
    const card   = document.getElementById('militaryServiceCard');
    const badge  = document.getElementById('militaryStateBadge');
    const saveBtn = document.getElementById('saveMilitaryBtn');
    if (!card) return;

    card.setAttribute('data-state', 'clean');
    if (badge) badge.innerHTML = '<i class="fas fa-check-circle"></i> 저장됨';
    if (saveBtn) saveBtn.disabled = true;
}

async function loadMilitaryStatusOptions() {
    try {
        const res = await fetch('/api/codes?groupCode=C12&activeOnly=true');
        if (!res.ok) throw new Error('코드 조회 실패');
        const codes = await res.json();

        const select = document.getElementById('militaryStatus');
        if (!select) return;

        // 기존 옵션 제거 (placeholder 제외)
        while (select.options.length > 1) select.remove(1);

        codes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.code;
            opt.textContent = c.codeName;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error('[병적사항] 코드 로드 실패', e);
    }
}

async function loadMilitaryService() {
    try {
        const res = await fetch(`/api/competency/military/${currentUserIdx}`);
        if (!res.ok) {
            console.error('[병적사항] 조회 실패', res.status);
            return;
        }
        const dto = await res.json();

        // DB에 저장된 값이 있으면 그대로 — clean 상태
        // 비어있으면 성별별 기본값을 화면에만 채우고 — dirty 상태로 (사용자가 저장 버튼을 눌러야 DB 반영)
        const hasSavedValue = !!dto.militaryStatus;
        const initialStatus = dto.militaryStatus
            || MILITARY_DEFAULT_BY_GENDER[currentUserGender]
            || '';

        document.getElementById('militaryStatus').value         = initialStatus;
        document.getElementById('militaryEnlistDate').value     = dto.militaryEnlistDate || '';
        document.getElementById('militaryDischargeDate').value  = dto.militaryDischargeDate || '';
        document.getElementById('militaryNotes').value          = dto.militaryNotes || '';

        toggleMilitaryDateRows();

        if (hasSavedValue) {
            markMilitaryClean();
        } else if (initialStatus) {
            // 성별 기본값이 자동 채워졌지만 아직 DB에 저장되지 않은 상태
            markMilitaryDirty();
        } else {
            markMilitaryClean();
        }
    } catch (e) {
        console.error('[병적사항] 조회 오류', e);
    }
}

function toggleMilitaryDateRows() {
    const status = document.getElementById('militaryStatus').value;
    const allowed = MILITARY_DATE_ALLOWED_CODES.includes(status);

    const enlistRow    = document.getElementById('militaryEnlistRow');
    const dischargeRow = document.getElementById('militaryDischargeRow');
    const notesRow     = document.getElementById('militaryNotesRow');

    if (enlistRow)    enlistRow.style.display    = allowed ? '' : 'none';
    if (dischargeRow) dischargeRow.style.display = allowed ? '' : 'none';

    // 입대일/전역일 비활성 상태에서는 값도 비움
    if (!allowed) {
        document.getElementById('militaryEnlistDate').value    = '';
        document.getElementById('militaryDischargeDate').value = '';
    }

    // 비고는 "해당사항없음(C1205)" 일 때는 적을 게 없으므로 숨김 + 값 비움
    const showNotes = status !== 'C1205';
    if (notesRow) notesRow.style.display = showNotes ? '' : 'none';
    if (!showNotes) {
        document.getElementById('militaryNotes').value = '';
    }
}

// ============================================================
// 학력/자격증 첨부파일 (본인만 업로드/삭제, 미리보기)
//
// 신규 등록 모드: 파일을 메모리(pendingAttachments)에 보관 → 학력/자격증 저장 후 idx 받아 일괄 업로드
// 수정 모드:     파일 선택 시 즉시 업로드 (idx 가 이미 있음)
// ============================================================

const ATTACHMENT_CONFIG = {
    education: {
        sectionId: 'schoolAttachmentSection',
        listId:    'schoolAttachmentList',
        inputId:   'schoolAttachmentInput',
        idxFieldId:'schoolIdx',
        uploadUrl: idx => `/api/competency/schools/${idx}/attachments`,
        deleteUrl: aIdx => `/api/competency/schools/attachments/${aIdx}`,
        downloadUrl: aIdx => `/api/competency/schools/attachments/${aIdx}/download`
    },
    certificate: {
        sectionId: 'certificateAttachmentSection',
        listId:    'certificateAttachmentList',
        inputId:   'certificateAttachmentInput',
        idxFieldId:'certificateIdx',
        uploadUrl: idx => `/api/competency/certificates/${idx}/attachments`,
        deleteUrl: aIdx => `/api/competency/certificates/attachments/${aIdx}`,
        downloadUrl: aIdx => `/api/competency/certificates/attachments/${aIdx}/download`
    }
};

/** 신규 등록 모드에서 임시 보관할 파일들 (학력/자격증 저장 후 일괄 업로드) */
const pendingAttachments = { education: [], certificate: [] };

function setupAttachmentSection(type, item) {
    const cfg = ATTACHMENT_CONFIG[type];
    if (!cfg) return; // 경력/교육은 첨부 없음

    const section = document.getElementById(cfg.sectionId);
    const list    = document.getElementById(cfg.listId);
    const input   = document.getElementById(cfg.inputId);
    if (!section || !list || !input) return;

    section.style.display = '';

    // 이전 change 핸들러 제거를 위해 input 노드 교체
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    // 드롭존(파일 선택 + 드래그앤드롭) 활성화
    const dropzone = section.querySelector('.file-dropzone');
    setupDropzone(dropzone, newInput);

    if (!item || !item.idx) {
        // 신규 등록 모드 — 메모리 보관, 저장 시 일괄 업로드
        pendingAttachments[type] = [];
        renderPendingAttachmentList(type);
        newInput.addEventListener('change', () => addPendingAttachments(type, newInput));
    } else {
        // 수정 모드 — 즉시 업로드
        renderAttachmentList(type, item.attachments || []);
        newInput.addEventListener('change', () => uploadAttachments(type, item.idx, newInput));
    }
}

/** 드롭존 — 드래그앤드롭으로 input.files 채우고 change 이벤트 트리거 */
function setupDropzone(dropzoneEl, inputEl) {
    if (!dropzoneEl || !inputEl) return;

    ['dragenter', 'dragover'].forEach(evt => {
        dropzoneEl.addEventListener(evt, e => {
            e.preventDefault();
            e.stopPropagation();
            dropzoneEl.classList.add('dragover');
        });
    });

    ['dragleave', 'dragend'].forEach(evt => {
        dropzoneEl.addEventListener(evt, e => {
            e.preventDefault();
            e.stopPropagation();
            dropzoneEl.classList.remove('dragover');
        });
    });

    dropzoneEl.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneEl.classList.remove('dragover');

        const files = e.dataTransfer && e.dataTransfer.files;
        if (!files || files.length === 0) return;

        // input.files 에 직접 set (DataTransfer 우회)
        const dt = new DataTransfer();
        Array.from(files).forEach(f => dt.items.add(f));
        inputEl.files = dt.files;

        // 기존 change 핸들러 (addPendingAttachments / uploadAttachments) 호출
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    });
}

/** 신규 모드: 파일 input 변경 시 메모리에 누적 (자동 명명 적용) */
function addPendingAttachments(type, inputEl) {
    const files = Array.from(inputEl.files || []);
    let added = 0;
    files.forEach(f => {
        if (f.size > 50 * 1024 * 1024) {
            showWarning(`${f.name}: 50MB를 초과합니다.`);
            return;
        }
        const seq = pendingAttachments[type].length + 1;
        const renamed = renameAttachmentFile(type, f, seq);
        pendingAttachments[type].push(renamed);
        added++;
    });
    inputEl.value = '';
    if (added > 0) renderPendingAttachmentList(type);
}

/**
 * 첨부파일 이름 자동 생성
 *  - 학력:   "{학교명}_{본인이름}_졸업증명서[_N].{ext}"
 *  - 자격증: "{자격증명}_{본인이름}_자격증사본[_N].{ext}"
 *
 * 필수 정보(학교명/자격증명/본인이름)가 비어있으면 원본 파일명 유지.
 */
function renameAttachmentFile(type, file, sequenceNum) {
    if (!file || !currentUserName) return file;

    let prefix = '';
    let label  = '';
    if (type === 'education') {
        prefix = (document.getElementById('schoolName')?.value || '').trim();
        label  = '졸업증명서';
    } else if (type === 'certificate') {
        prefix = (document.getElementById('certificateName')?.value || '').trim();
        label  = '자격증사본';
    } else {
        return file; // 다른 타입은 적용 안 함
    }

    if (!prefix) return file; // 학교명/자격증명 미입력 시 원본 유지

    // 파일시스템에 안전하지 않은 문자 제거 (윈도우 + 리눅스 공통 금지문자)
    const sanitize = s => s.replace(/[\\/:*?"<>|\s]+/g, '');
    const safePrefix = sanitize(prefix);
    const safeName   = sanitize(currentUserName);

    // 확장자 추출
    const dot = file.name.lastIndexOf('.');
    const ext = dot >= 0 ? file.name.substring(dot + 1).toLowerCase() : '';

    const seqSuffix = sequenceNum > 1 ? `_${sequenceNum}` : '';
    const newName = ext
        ? `${safePrefix}_${safeName}_${label}${seqSuffix}.${ext}`
        : `${safePrefix}_${safeName}_${label}${seqSuffix}`;

    // File 객체로 wrap (File 생성자 미지원 환경 대비 try)
    try {
        return new File([file], newName, { type: file.type, lastModified: file.lastModified });
    } catch (e) {
        // 일부 구형 브라우저에서 File 생성자 실패 시 원본 반환
        console.warn('[첨부] 파일명 변경 실패, 원본 사용', e);
        return file;
    }
}

/** 신규 모드: 메모리 보관 파일 칩 렌더링 */
function renderPendingAttachmentList(type) {
    const cfg = ATTACHMENT_CONFIG[type];
    const list = document.getElementById(cfg.listId);
    if (!list) return;

    const files = pendingAttachments[type] || [];

    if (files.length === 0) {
        list.innerHTML = '<li class="attachment-empty attachment-empty-required">⚠ 필수 — 위의 파일 선택 버튼으로 1개 이상 첨부해 주세요. 저장 시 함께 업로드됩니다.</li>';
        return;
    }

    list.innerHTML = files.map((f, i) => `
        <li class="attachment-chip attachment-pending">
            <span class="attachment-preview-btn" style="cursor:default;">
                <i class="fas fa-paperclip"></i>
                <span>${escapeAttr(f.name)}</span>
                <span class="attachment-size">${formatFileSize(f.size)}</span>
            </span>
            <button type="button" class="attachment-delete-btn" data-pending-idx="${i}" title="삭제">
                <i class="fas fa-times"></i>
            </button>
        </li>
    `).join('');

    list.querySelectorAll('.attachment-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pendingIdx = Number(btn.getAttribute('data-pending-idx'));
            pendingAttachments[type].splice(pendingIdx, 1);
            renderPendingAttachmentList(type);
        });
    });
}

function renderAttachmentList(type, attachments) {
    const cfg = ATTACHMENT_CONFIG[type];
    const list = document.getElementById(cfg.listId);
    if (!list) return;

    if (!attachments || attachments.length === 0) {
        const msg = (type === 'education' || type === 'certificate')
            ? '<li class="attachment-empty attachment-empty-required">⚠ 필수 — 첨부파일이 없습니다. 위의 파일 선택 버튼으로 1개 이상 등록해 주세요.</li>'
            : '<li class="attachment-empty">첨부된 파일이 없습니다.</li>';
        list.innerHTML = msg;
        return;
    }

    list.innerHTML = attachments.map(a => `
        <li class="attachment-chip">
            <button type="button" class="attachment-preview-btn" data-idx="${a.idx}" data-name="${escapeAttr(a.originalFilename)}">
                <i class="fas fa-file"></i>
                <span>${escapeAttr(a.originalFilename)}</span>
                <span class="attachment-size">${formatFileSize(a.fileSize)}</span>
            </button>
            <button type="button" class="attachment-delete-btn" data-idx="${a.idx}" title="삭제">
                <i class="fas fa-times"></i>
            </button>
        </li>
    `).join('');

    // 미리보기 버튼
    list.querySelectorAll('.attachment-preview-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const aIdx = btn.getAttribute('data-idx');
            const name = btn.getAttribute('data-name');
            if (window.openFilePreview) {
                window.openFilePreview([{ url: cfg.downloadUrl(aIdx), filename: name }], 0);
            }
        });
    });

    // 삭제 버튼
    list.querySelectorAll('.attachment-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteAttachment(type, btn.getAttribute('data-idx')));
    });
}

async function uploadAttachments(type, parentIdx, inputEl) {
    const cfg = ATTACHMENT_CONFIG[type];
    const files = Array.from(inputEl.files || []);
    if (files.length === 0) return;

    // 현재 모달의 기존 첨부 개수 다음 번호부터 sequence 부여 (수정 모드)
    const list = document.getElementById(cfg.listId);
    const existingCount = list ? list.querySelectorAll('.attachment-chip').length : 0;

    let success = 0;
    let i = 0;
    for (const file of files) {
        i++;
        if (file.size > 50 * 1024 * 1024) {
            await showWarning(`${file.name}: 50MB를 초과합니다.`);
            continue;
        }
        try {
            const renamed = renameAttachmentFile(type, file, existingCount + i);
            const formData = new FormData();
            formData.append('file', renamed);
            const res = await fetch(cfg.uploadUrl(parentIdx), { method: 'POST', body: formData });
            if (res.status === 403) {
                await showWarning('본인만 업로드할 수 있습니다.');
                break;
            }
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                await showError(data.error || `${file.name}: 업로드 실패`);
                continue;
            }
            success++;
        } catch (e) {
            console.error('[첨부] 업로드 오류', e);
            await showError(`${file.name}: 업로드 중 오류가 발생했습니다.`);
        }
    }

    inputEl.value = '';

    if (success > 0) {
        // 목록 다시 로드해서 최신 attachments 로 렌더링
        await loadCompetency(type);
        const refreshed = findCompetencyItemByIdx(type, parentIdx);
        if (refreshed) renderAttachmentList(type, refreshed.attachments || []);
    }
}

async function deleteAttachment(type, attachmentIdx) {
    const cfg = ATTACHMENT_CONFIG[type];

    // 학력/자격증 첨부는 필수 — 마지막 1개는 삭제 막기
    if (type === 'education' || type === 'certificate') {
        const list = document.getElementById(cfg.listId);
        const count = list ? list.querySelectorAll('.attachment-chip').length : 0;
        if (count <= 1) {
            await showWarning('첨부파일은 최소 1개 이상 등록되어 있어야 합니다. 새 파일을 추가한 후 삭제해 주세요.');
            return;
        }
    }

    const confirmed = await showDeleteConfirm('이 첨부파일을 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
        const res = await fetch(cfg.deleteUrl(attachmentIdx), { method: 'DELETE' });
        if (res.status === 403) {
            await showWarning('본인만 삭제할 수 있습니다.');
            return;
        }
        if (!res.ok) {
            await showError('삭제에 실패했습니다.');
            return;
        }

        // 목록 다시 로드
        const idxField = document.getElementById(cfg.idxFieldId);
        const parentIdx = idxField ? Number(idxField.value) : null;
        await loadCompetency(type);
        if (parentIdx) {
            const refreshed = findCompetencyItemByIdx(type, parentIdx);
            if (refreshed) renderAttachmentList(type, refreshed.attachments || []);
        }
        await showSuccess('첨부파일이 삭제되었습니다.');
    } catch (e) {
        console.error('[첨부] 삭제 오류', e);
        await showError('삭제 중 오류가 발생했습니다.');
    }
}

function findCompetencyItemByIdx(type, idx) {
    const cfg = COMPETENCY_CONFIG[type];
    const listEl = document.getElementById(cfg.listId);
    if (!listEl || !listEl._lastItems) return null;
    return (listEl._lastItems || []).find(i => Number(i.idx) === Number(idx));
}

function formatFileSize(bytes) {
    if (bytes == null) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function escapeAttr(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function saveMilitaryService() {
    if (!currentUserIdx) return;

    const status        = document.getElementById('militaryStatus').value;
    const enlistDate    = document.getElementById('militaryEnlistDate').value.trim();
    const dischargeDate = document.getElementById('militaryDischargeDate').value.trim();
    const notes         = document.getElementById('militaryNotes').value.trim();

    // 1) 부분 날짜 형식 검증
    if (enlistDate && !PARTIAL_DATE_REGEX.test(enlistDate)) {
        await showWarning('입대일은 YYYY, YYYY-MM, YYYY-MM-DD 형식으로 입력해주세요.');
        return;
    }
    if (dischargeDate && !PARTIAL_DATE_REGEX.test(dischargeDate)) {
        await showWarning('전역일은 YYYY, YYYY-MM, YYYY-MM-DD 형식으로 입력해주세요.');
        return;
    }

    // 2) 두 날짜 모두 같은 정밀도일 때 enlist <= discharge 비교
    if (enlistDate && dischargeDate && enlistDate.length === dischargeDate.length) {
        if (enlistDate > dischargeDate) {
            await showWarning('전역일은 입대일보다 빠를 수 없습니다.');
            return;
        }
    }

    const payload = {
        militaryStatus:         status || null,
        militaryEnlistDate:     enlistDate || null,
        militaryDischargeDate:  dischargeDate || null,
        militaryNotes:          notes || null
    };

    try {
        const res = await fetch(`/api/competency/military/${currentUserIdx}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.status === 403) {
            await showWarning('병적사항은 본인만 수정할 수 있습니다.');
            return;
        }

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            await showError(data.error || '병적사항 저장에 실패했습니다.');
            return;
        }

        markMilitaryClean();
        await showSuccess('병적사항이 저장되었습니다.');
    } catch (e) {
        console.error('[병적사항] 저장 오류', e);
        await showError('병적사항 저장 중 오류가 발생했습니다.');
    }
}
