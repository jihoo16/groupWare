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
        saveSettingsBtn.addEventListener('click', async function() {
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
            await showSuccess('설정이 저장되었습니다.');
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
            showAlert('프로필 사진 변경 기능은 추후 구현됩니다.');
            // TODO: 파일 업로드 모달 표시
        });
    }

    // 비밀번호 변경
    const passwordChangeBtn = document.getElementById('changePasswordBtn');
    if (passwordChangeBtn) {
        passwordChangeBtn.addEventListener('click', async function() {
            const currentPassword = document.getElementById('currentPassword')?.value;
            const newPassword = document.getElementById('newPassword')?.value;
            const confirmPassword = document.getElementById('confirmPassword')?.value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                showWarning('모든 필드를 입력해주세요.');
                return;
            }

            if (newPassword.length < 8) {
                showWarning('새 비밀번호는 8자 이상이어야 합니다.');
                return;
            }

            // 비밀번호 강도 검증 (영문, 숫자, 특수문자 포함)
            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                showWarning('비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.');
                return;
            }

            if (newPassword !== confirmPassword) {
                showWarning('새 비밀번호가 일치하지 않습니다.');
                return;
            }

            console.log('비밀번호 변경 요청');
            await showSuccess('비밀번호가 성공적으로 변경되었습니다.');

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
        themeSelect.addEventListener('change', function() {
            const theme = this.value;
            console.log('테마 변경:', theme);
            // TODO: 테마 변경 적용
            showAlert(`테마가 "${this.options[this.selectedIndex].text}"로 변경됩니다.`);
        });
    }

    // 언어 변경
    const languageSelect = document.querySelector('#system .form-select:nth-of-type(2)');
    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            const language = this.value;
            console.log('언어 변경:', language);
            // TODO: 언어 변경 적용
            showAlert(`언어가 "${this.options[this.selectedIndex].text}"로 변경됩니다.`);
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
                showWarning('서명을 작성해주세요.');
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

// 역량관리 데이터 구조
const competencyData = {
    education: [],
    certificate: [],
    career: [],
    training: []
};

// 역량관리 초기화
document.addEventListener('DOMContentLoaded', function() {
    initCompetencyManagement();
});

function initCompetencyManagement() {
    // 저장된 데이터 불러오기
    loadCompetencyData();

    // 추가 버튼 이벤트 리스너
    const addButtons = document.querySelectorAll('.btn-add');
    addButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            showCompetencyForm(type);
        });
    });

    // 초기 데이터 렌더링
    renderAllCompetencies();
}

// 역량 항목 폼 표시
function showCompetencyForm(type) {
    const listContainer = document.getElementById(`${type}List`);

    // 이미 입력 중인 폼이 있는지 확인
    if (listContainer.querySelector('.competency-form')) {
        showWarning('현재 입력 중인 항목을 먼저 완료해주세요.');
        return;
    }

    let formHTML = '';

    switch(type) {
        case 'education':
            formHTML = `
                <div class="competency-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>학교명</label>
                            <input type="text" class="form-input" data-field="school" placeholder="학교명을 입력하세요">
                        </div>
                        <div class="form-group">
                            <label>전공</label>
                            <input type="text" class="form-input" data-field="major" placeholder="전공을 입력하세요">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>학위</label>
                            <select class="form-select" data-field="degree">
                                <option value="">선택하세요</option>
                                <option value="고졸">고졸</option>
                                <option value="전문학사">전문학사</option>
                                <option value="학사">학사</option>
                                <option value="석사">석사</option>
                                <option value="박사">박사</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>입학일</label>
                            <input type="date" class="form-input" data-field="startDate">
                        </div>
                        <div class="form-group">
                            <label>졸업일</label>
                            <input type="date" class="form-input" data-field="endDate">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button class="btn-secondary btn-cancel">취소</button>
                        <button class="btn-primary btn-save" data-type="${type}">저장</button>
                    </div>
                </div>
            `;
            break;

        case 'certificate':
            formHTML = `
                <div class="competency-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>자격증명</label>
                            <input type="text" class="form-input" data-field="name" placeholder="자격증명을 입력하세요">
                        </div>
                        <div class="form-group">
                            <label>발급기관</label>
                            <input type="text" class="form-input" data-field="issuer" placeholder="발급기관을 입력하세요">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>취득일</label>
                            <input type="date" class="form-input" data-field="date">
                        </div>
                        <div class="form-group">
                            <label>자격증번호</label>
                            <input type="text" class="form-input" data-field="number" placeholder="자격증번호를 입력하세요">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button class="btn-secondary btn-cancel">취소</button>
                        <button class="btn-primary btn-save" data-type="${type}">저장</button>
                    </div>
                </div>
            `;
            break;

        case 'career':
            formHTML = `
                <div class="competency-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>회사명</label>
                            <input type="text" class="form-input" data-field="company" placeholder="회사명을 입력하세요">
                        </div>
                        <div class="form-group">
                            <label>직급/직책</label>
                            <input type="text" class="form-input" data-field="position" placeholder="직급/직책을 입력하세요">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>입사일</label>
                            <input type="date" class="form-input" data-field="startDate">
                        </div>
                        <div class="form-group">
                            <label>퇴사일</label>
                            <input type="date" class="form-input" data-field="endDate">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label>주요업무</label>
                            <textarea class="form-textarea" data-field="description" rows="3" placeholder="주요업무를 입력하세요"></textarea>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button class="btn-secondary btn-cancel">취소</button>
                        <button class="btn-primary btn-save" data-type="${type}">저장</button>
                    </div>
                </div>
            `;
            break;

        case 'training':
            formHTML = `
                <div class="competency-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>교육명</label>
                            <input type="text" class="form-input" data-field="name" placeholder="교육명을 입력하세요">
                        </div>
                        <div class="form-group">
                            <label>교육기관</label>
                            <input type="text" class="form-input" data-field="institution" placeholder="교육기관을 입력하세요">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>시작일</label>
                            <input type="date" class="form-input" data-field="startDate">
                        </div>
                        <div class="form-group">
                            <label>종료일</label>
                            <input type="date" class="form-input" data-field="endDate">
                        </div>
                        <div class="form-group">
                            <label>교육시간</label>
                            <input type="number" class="form-input" data-field="hours" placeholder="시간">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button class="btn-secondary btn-cancel">취소</button>
                        <button class="btn-primary btn-save" data-type="${type}">저장</button>
                    </div>
                </div>
            `;
            break;
    }

    listContainer.insertAdjacentHTML('afterbegin', formHTML);

    // 폼 버튼 이벤트 리스너
    const form = listContainer.querySelector('.competency-form');
    const cancelBtn = form.querySelector('.btn-cancel');
    const saveBtn = form.querySelector('.btn-save');

    cancelBtn.addEventListener('click', function() {
        form.remove();
    });

    saveBtn.addEventListener('click', function() {
        saveCompetencyItem(type, form);
    });
}

// 역량 항목 저장
async function saveCompetencyItem(type, form) {
    const inputs = form.querySelectorAll('[data-field]');
    const item = {
        id: Date.now(),
        createdAt: new Date().toISOString()
    };

    let isValid = true;
    inputs.forEach(input => {
        const field = input.getAttribute('data-field');
        const value = input.value.trim();

        // 필수 필드 검증
        if (input.hasAttribute('required') && !value) {
            isValid = false;
            input.classList.add('error');
        } else {
            input.classList.remove('error');
        }

        item[field] = value;
    });

    if (!isValid) {
        showWarning('필수 항목을 입력해주세요.');
        return;
    }

    // 데이터 추가
    competencyData[type].push(item);

    // LocalStorage에 저장
    saveCompetencyData();

    // 폼 제거
    form.remove();

    // 목록 다시 렌더링
    renderCompetencyList(type);

    await showSuccess('저장되었습니다.');
}

// 역량 항목 삭제
async function deleteCompetencyItem(type, id) {
    const confirmed = await showDeleteConfirm('삭제하시겠습니까?');
    if (confirmed) {
        competencyData[type] = competencyData[type].filter(item => item.id !== id);
        saveCompetencyData();
        renderCompetencyList(type);
        await showSuccess('삭제되었습니다.');
    }
}

// 역량 항목 수정
function editCompetencyItem(type, id) {
    const item = competencyData[type].find(item => item.id === id);
    if (!item) return;

    // TODO: 수정 폼 표시 및 처리
    showAlert('수정 기능은 추후 구현됩니다.');
}

// 역량 목록 렌더링
function renderCompetencyList(type) {
    const listContainer = document.getElementById(`${type}List`);
    const items = competencyData[type];

    // 기존 항목 제거 (폼 제외)
    const existingItems = listContainer.querySelectorAll('.competency-item');
    existingItems.forEach(item => item.remove());

    if (items.length === 0) {
        listContainer.innerHTML = '<div class="empty-message">등록된 항목이 없습니다.</div>';
        return;
    }

    let itemsHTML = '';
    items.forEach(item => {
        let contentHTML = '';

        switch(type) {
            case 'education':
                contentHTML = `
                    <div class="competency-item">
                        <div class="item-content">
                            <div class="item-main">
                                <strong>${item.school || '-'}</strong>
                                <span class="item-detail">${item.major || '-'} | ${item.degree || '-'}</span>
                            </div>
                            <div class="item-period">
                                ${formatDate(item.startDate)} ~ ${formatDate(item.endDate)}
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="btn-icon btn-edit" onclick="editCompetencyItem('${type}', ${item.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete" onclick="deleteCompetencyItem('${type}', ${item.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                break;

            case 'certificate':
                contentHTML = `
                    <div class="competency-item">
                        <div class="item-content">
                            <div class="item-main">
                                <strong>${item.name || '-'}</strong>
                                <span class="item-detail">${item.issuer || '-'}</span>
                            </div>
                            <div class="item-period">
                                ${formatDate(item.date)} | ${item.number || '-'}
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="btn-icon btn-edit" onclick="editCompetencyItem('${type}', ${item.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete" onclick="deleteCompetencyItem('${type}', ${item.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                break;

            case 'career':
                contentHTML = `
                    <div class="competency-item">
                        <div class="item-content">
                            <div class="item-main">
                                <strong>${item.company || '-'}</strong>
                                <span class="item-detail">${item.position || '-'}</span>
                            </div>
                            <div class="item-period">
                                ${formatDate(item.startDate)} ~ ${formatDate(item.endDate)}
                            </div>
                            ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                        </div>
                        <div class="item-actions">
                            <button class="btn-icon btn-edit" onclick="editCompetencyItem('${type}', ${item.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete" onclick="deleteCompetencyItem('${type}', ${item.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                break;

            case 'training':
                contentHTML = `
                    <div class="competency-item">
                        <div class="item-content">
                            <div class="item-main">
                                <strong>${item.name || '-'}</strong>
                                <span class="item-detail">${item.institution || '-'}</span>
                            </div>
                            <div class="item-period">
                                ${formatDate(item.startDate)} ~ ${formatDate(item.endDate)}
                                ${item.hours ? ` | ${item.hours}시간` : ''}
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="btn-icon btn-edit" onclick="editCompetencyItem('${type}', ${item.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete" onclick="deleteCompetencyItem('${type}', ${item.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                break;
        }

        itemsHTML += contentHTML;
    });

    listContainer.innerHTML = itemsHTML;
}

// 모든 역량 목록 렌더링
function renderAllCompetencies() {
    renderCompetencyList('education');
    renderCompetencyList('certificate');
    renderCompetencyList('career');
    renderCompetencyList('training');
}

// 역량 데이터 저장
function saveCompetencyData() {
    localStorage.setItem('competencyData', JSON.stringify(competencyData));
}

// 역량 데이터 불러오기
function loadCompetencyData() {
    const savedData = localStorage.getItem('competencyData');
    if (savedData) {
        const parsed = JSON.parse(savedData);
        Object.assign(competencyData, parsed);
    }
}

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

                showWarning('동의 내용을 확인하고 체크박스를 체크해주세요.');
                return;
            }

            if (!window.tempSignatureData) {
                showError('서명 데이터가 없습니다.');
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
