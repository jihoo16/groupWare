// 마이페이지 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // 전자서명 캔버스 초기화
    initSignatureCanvas();

    // 비밀번호 변경 폼
    initPasswordForm();

    // 알림 설정
    initNotificationSettings();
});

// 전자서명 캔버스 초기화
function initSignatureCanvas() {
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const placeholder = document.getElementById('canvasPlaceholder');
    const clearBtn = document.getElementById('clearSignature');
    const saveBtn = document.getElementById('saveSignature');
    const lineWidthSlider = document.getElementById('lineWidth');
    const lineWidthValue = document.getElementById('lineWidthValue');
    const colorButtons = document.querySelectorAll('.color-btn');

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let hasDrawn = false;

    // 캔버스 설정
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
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

    // 선 굵기 조절
    lineWidthSlider.addEventListener('input', function() {
        ctx.lineWidth = this.value;
        lineWidthValue.textContent = this.value;
    });

    // 색상 선택
    colorButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            colorButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            ctx.strokeStyle = this.getAttribute('data-color');
        });
    });

    // 지우기 버튼
    clearBtn.addEventListener('click', function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        placeholder.classList.remove('hidden');
        hasDrawn = false;
    });

    // 저장 버튼
    saveBtn.addEventListener('click', function() {
        if (!hasDrawn) {
            alert('서명을 작성해주세요.');
            return;
        }

        // 캔버스를 이미지로 변환
        const signatureData = canvas.toDataURL('image/png');

        // 현재 서명 영역에 표시
        const currentSignature = document.getElementById('currentSignature');
        currentSignature.innerHTML = `<img src="${signatureData}" alt="전자서명">`;

        // LocalStorage에 저장
        localStorage.setItem('userSignature', signatureData);

        alert('서명이 저장되었습니다.');

        // 캔버스 초기화
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        placeholder.classList.remove('hidden');
        hasDrawn = false;
    });

    // 저장된 서명 불러오기
    loadSavedSignature();
}

// 저장된 서명 불러오기
function loadSavedSignature() {
    const savedSignature = localStorage.getItem('userSignature');
    if (savedSignature) {
        const currentSignature = document.getElementById('currentSignature');
        currentSignature.innerHTML = `<img src="${savedSignature}" alt="전자서명">`;
    }
}

// 비밀번호 변경 폼
function initPasswordForm() {
    const form = document.getElementById('passwordForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // 비밀번호 검증
        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('모든 필드를 입력해주세요.');
            return;
        }

        if (newPassword.length < 8) {
            alert('새 비밀번호는 8자 이상이어야 합니다.');
            return;
        }

        // 비밀번호 강도 검증 (영문, 숫자, 특수문자 포함)
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            alert('비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('새 비밀번호가 일치하지 않습니다.');
            return;
        }

        // TODO: 실제 API 호출로 비밀번호 변경
        console.log('비밀번호 변경:', {
            currentPassword,
            newPassword
        });

        alert('비밀번호가 성공적으로 변경되었습니다.');
        form.reset();
    });
}

// 알림 설정
function initNotificationSettings() {
    const toggles = document.querySelectorAll('.toggle-switch input');

    toggles.forEach(toggle => {
        // 저장된 설정 불러오기
        const settingKey = getSettingKey(toggle);
        const savedSetting = localStorage.getItem(settingKey);
        if (savedSetting !== null) {
            toggle.checked = savedSetting === 'true';
        }

        // 설정 변경 이벤트
        toggle.addEventListener('change', function() {
            const settingKey = getSettingKey(this);
            localStorage.setItem(settingKey, this.checked);

            const settingName = getSettingName(this);
            console.log(`${settingName} 알림:`, this.checked ? '활성화' : '비활성화');
        });
    });
}

// 토글 스위치의 설정 키 가져오기
function getSettingKey(toggle) {
    const notificationItem = toggle.closest('.notification-item');
    const title = notificationItem.querySelector('h4').textContent;
    return `notification_${title.replace(/\s/g, '_')}`;
}

// 토글 스위치의 설정 이름 가져오기
function getSettingName(toggle) {
    const notificationItem = toggle.closest('.notification-item');
    return notificationItem.querySelector('h4').textContent;
}
