// 설정 페이지 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const toggleSwitches = document.querySelectorAll('.toggle-switch input');

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
            alert('설정이 저장되었습니다.');
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
            alert('프로필 사진 변경 기능은 추후 구현됩니다.');
            // TODO: 파일 업로드 모달 표시
        });
    }

    // 비밀번호 변경
    const passwordChangeBtn = document.querySelector('.password-section .btn-secondary');
    if (passwordChangeBtn) {
        passwordChangeBtn.addEventListener('click', function() {
            const currentPassword = document.querySelector('.password-section input[type="password"]:nth-of-type(1)')?.value;
            const newPassword = document.querySelector('.password-section input[type="password"]:nth-of-type(2)')?.value;
            const confirmPassword = document.querySelector('.password-section input[type="password"]:nth-of-type(3)')?.value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                alert('모든 필드를 입력해주세요.');
                return;
            }

            if (newPassword !== confirmPassword) {
                alert('새 비밀번호가 일치하지 않습니다.');
                return;
            }

            console.log('비밀번호 변경 요청');
            alert('비밀번호가 변경되었습니다.');
            // TODO: 서버에 비밀번호 변경 요청
        });
    }

    // 캐시 삭제
    const deleteCacheBtn = document.querySelector('.data-section .btn-danger-outline');
    if (deleteCacheBtn) {
        deleteCacheBtn.addEventListener('click', function() {
            if (confirm('캐시 데이터를 삭제하시겠습니까?')) {
                console.log('캐시 삭제');
                alert('캐시가 삭제되었습니다.');
                // TODO: 캐시 삭제 처리
            }
        });
    }

    // 데이터 다운로드
    const downloadDataBtn = document.querySelector('.data-section .btn-secondary');
    if (downloadDataBtn) {
        downloadDataBtn.addEventListener('click', function() {
            console.log('내 데이터 다운로드');
            alert('데이터 다운로드가 시작됩니다.');
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
            alert(`테마가 "${this.options[this.selectedIndex].text}"로 변경됩니다.`);
        });
    }

    // 언어 변경
    const languageSelect = document.querySelector('#system .form-select:nth-of-type(2)');
    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            const language = this.value;
            console.log('언어 변경:', language);
            // TODO: 언어 변경 적용
            alert(`언어가 "${this.options[this.selectedIndex].text}"로 변경됩니다.`);
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
