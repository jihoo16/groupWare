// 공통 JavaScript - 모든 페이지에서 사용

document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    const menuParents = document.querySelectorAll('.menu-parent');

    // 서브메뉴 호버로 열기/닫기
    menuParents.forEach(parent => {
        parent.addEventListener('mouseenter', function() {
            // 사이드바가 호버 상태일 때만 작동
            if (sidebar.matches(':hover')) {
                this.classList.add('open');
            }
        });

        parent.addEventListener('mouseleave', function() {
            // 마우스를 떼면 항상 닫기 (활성화 여부와 관계없이)
            this.classList.remove('open');
        });
    });

    // 대메뉴 클릭 시 페이지 이동 허용
    // (호버는 mouseenter/mouseleave로 처리되므로 click은 페이지 이동용)

    // 사이드바에서 마우스가 완전히 벗어나면 모든 서브메뉴 닫기
    sidebar.addEventListener('mouseleave', function() {
        menuParents.forEach(parent => {
            parent.classList.remove('open');
        });
    });

    // 현재 페이지에 맞는 메뉴 활성화 (좌측 사이드바만)
    const currentPath = window.location.pathname;
    const menuItems = document.querySelectorAll('.sidebar .menu-item');  // .sidebar만 선택

    menuItems.forEach(item => {
        const link = item.querySelector('a');
        if (link && link.getAttribute('href') === currentPath) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // submenu-item에 active가 있으면 상위 menu-parent에도 active 추가
    const activeSubmenuItem = document.querySelector('.submenu-item.active');
    if (activeSubmenuItem) {
        const parentMenuItem = activeSubmenuItem.closest('.menu-parent');
        if (parentMenuItem) {
            parentMenuItem.classList.add('active');
        }
    }

    // ===========================
    // Current User Info Display
    // ===========================
    function loadCurrentUserInfo() {
        // 전역 변수 CURRENT_USER에서 사용자 정보 가져오기 (layout.html에서 주입됨)
        if (!window.CURRENT_USER || !window.CURRENT_USER.idx) {
            console.warn('세션 정보가 없습니다.');
            return;
        }

        const user = window.CURRENT_USER;

        // 사용자 이름 업데이트
        const userNameEl = document.querySelector('.user-name');
        if (userNameEl && user.empName) {
            userNameEl.textContent = user.empName;
        }

        // 사용자 역할 업데이트 (is_admin 기준)
        const userRoleEl = document.querySelector('.user-role');
        if (userRoleEl) {
            userRoleEl.textContent = user.isAdmin ? '관리자' : '사용자';
        }

        console.log('현재 로그인 사용자:', user.empName, '(idx:', user.idx, ')');
    }

    // 페이지 로드 시 사용자 정보 표시
    loadCurrentUserInfo();

    // ===========================
    // Logout Button Handler
    // ===========================
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();

            // Confirm logout
            if (confirm('로그아웃 하시겠습니까?')) {
                // Clear session storage
                sessionStorage.removeItem('isLoggedIn');
                sessionStorage.removeItem('username');
                sessionStorage.removeItem('loginTime');

                // Optional: Clear local storage (remember me)
                // localStorage.removeItem('rememberedUsername');

                // Show logout message
                alert('로그아웃 되었습니다.');

                // Redirect to login page
                window.location.href = '/login';
            }
        });
    }
});
