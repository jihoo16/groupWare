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
            if (this.checked) {
                careerEndDateInput.value    = '';
                careerEndDateInput.disabled = true;
            } else {
                careerEndDateInput.disabled = false;
            }
            updateCareerPeriodDisplay();
        });
    }
    if (careerStartDateInput) careerStartDateInput.addEventListener('change', updateCareerPeriodDisplay);
    if (careerEndDateInput)   careerEndDateInput.addEventListener('change',   updateCareerPeriodDisplay);
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
            document.getElementById('degreeType').value       = '';
            document.getElementById('majorName').value        = '';
            document.getElementById('graduationDate').value   = '';
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
            document.getElementById('careerIdx').value              = item.idx || '';
            document.getElementById('careerCategory').value         = item.careerCategory || '';
            document.getElementById('isIndustryExperience').checked = item.isIndustryExperience || false;
            document.getElementById('careerStartDate').value        = item.careerStartDate || '';
            document.getElementById('isNow').checked                = item.isNow || false;
            if (item.isNow) {
                document.getElementById('careerEndDate').value    = '';
                document.getElementById('careerEndDate').disabled = true;
            } else {
                document.getElementById('careerEndDate').value    = item.careerEndDate || '';
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
            const careerCategory  = document.getElementById('careerCategory').value.trim();
            const careerStartDate = document.getElementById('careerStartDate').value;
            const isNow           = document.getElementById('isNow').checked;
            const careerEndDate   = document.getElementById('careerEndDate').value;
            if (!careerCategory) {
                document.getElementById('careerCategory').classList.add('error');
                showWarning('경력분야를 입력해주세요.'); return null;
            }
            if (!careerStartDate) {
                document.getElementById('careerStartDate').classList.add('error');
                showWarning('시작일을 입력해주세요.'); return null;
            }
            if (!isNow && !careerEndDate) {
                document.getElementById('careerEndDate').classList.add('error');
                showWarning('종료일을 입력하거나 현재 재직중을 체크해주세요.'); return null;
            }
            return {
                careerCategory,
                isIndustryExperience: document.getElementById('isIndustryExperience').checked,
                careerSummary:        document.getElementById('careerSummary').value.trim() || null,
                careerStartDate,
                careerEndDate:        isNow ? null : careerEndDate,
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

    if (!items || items.length === 0) {
        listContainer.innerHTML = '<div class="empty-message">등록된 항목이 없습니다.</div>';
        return;
    }

    listContainer.innerHTML = items.map(item => {
        let mainHTML = '';
        let detailHTML = '';
        let periodHTML = '';

        switch(type) {
            case 'education':
                mainHTML   = `<strong>${item.schoolName}</strong>`;
                detailHTML = [DEGREE_TYPE_LABEL[item.degreeType] || item.degreeType, item.majorName].filter(Boolean).join(' · ');
                periodHTML = item.graduationDate ? `졸업 ${formatDate(item.graduationDate)}` : '';
                break;
            case 'certificate':
                mainHTML   = `<strong>${item.certificateName}</strong>`;
                detailHTML = item.issuingOrgName || '';
                periodHTML = `취득 ${formatDate(item.issuedDate)}`
                           + (item.isExpired ? ' <span class="badge-expired">만료</span>' : '');
                break;
            case 'career':
                mainHTML   = `<strong>${item.careerCategory}</strong>`
                           + (item.isIndustryExperience ? ' <span class="badge-industry">업계경력</span>' : '');
                detailHTML = item.careerSummary || '';
                periodHTML = `${formatDate(item.careerStartDate)} ~ ${item.isNow ? '현재' : formatDate(item.careerEndDate)}`
                           + (item.careerPeriodYears || item.careerPeriodMonths
                               ? ` · ${item.careerPeriodYears > 0 ? item.careerPeriodYears + '년 ' : ''}${item.careerPeriodMonths > 0 ? item.careerPeriodMonths + '개월' : ''}`
                               : '');
                break;
            case 'training':
                mainHTML   = `<strong>${item.trainingName}</strong>`;
                detailHTML = item.trainingOrgName || '';
                periodHTML = `이수 ${formatDate(item.completionDate)}`;
                break;
        }

        return `
        <div class="competency-item">
            <div class="item-content">
                <div class="item-main">
                    ${mainHTML}
                    ${detailHTML ? `<span class="item-detail">${detailHTML}</span>` : ''}
                </div>
                ${periodHTML ? `<div class="item-period">${periodHTML}</div>` : ''}
            </div>
            <div class="item-actions">
                <button class="btn-icon btn-edit"   onclick="openCompetencyModal('${type}', ${JSON.stringify(item).replace(/"/g, '&quot;')})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteCompetency('${type}', ${item.idx})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`;
    }).join('');
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
        loadAllCompetencies();

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
