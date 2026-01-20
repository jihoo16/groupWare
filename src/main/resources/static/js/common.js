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

    // nested-submenu-item에 active가 있으면 상위 submenu-parent와 menu-parent에도 active 추가
    const activeNestedSubmenuItem = document.querySelector('.nested-submenu-item.active');
    if (activeNestedSubmenuItem) {
        const parentSubmenuItem = activeNestedSubmenuItem.closest('.submenu-parent');
        if (parentSubmenuItem) {
            parentSubmenuItem.classList.add('active');
        }
        const parentMenuItem = activeNestedSubmenuItem.closest('.menu-parent');
        if (parentMenuItem) {
            parentMenuItem.classList.add('active');
        }
    }

    // 중첩된 서브메뉴 호버로 열기/닫기
    const submenuParents = document.querySelectorAll('.submenu-parent');
    submenuParents.forEach(parent => {
        parent.addEventListener('mouseenter', function() {
            // 상위 menu-parent가 열려있을 때만 작동
            const menuParent = this.closest('.menu-parent');
            if (menuParent && menuParent.classList.contains('open')) {
                this.classList.add('open');
            }
        });

        parent.addEventListener('mouseleave', function() {
            this.classList.remove('open');
        });
    });

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

// ===========================
// 유틸리티 함수들 (전역)
// ===========================

/**
 * 숫자를 한국 통화 형식으로 포맷팅 (천단위 콤마 + 원)
 * @param {number|string} value - 포맷팅할 숫자
 * @param {boolean} showUnit - '원' 단위 표시 여부 (기본값: true)
 * @returns {string} 포맷팅된 문자열 (예: "1,234,567원" 또는 "1,234,567")
 */
function formatCurrency(value, showUnit = true) {
    if (value === null || value === undefined || value === '') {
        return showUnit ? '0원' : '0';
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
        return showUnit ? '0원' : '0';
    }

    const formatted = Math.floor(numValue).toLocaleString('ko-KR');
    return showUnit ? formatted + '원' : formatted;
}

/**
 * 숫자를 천단위 콤마로 포맷팅 (단위 없음)
 * @param {number|string} value - 포맷팅할 숫자
 * @returns {string} 포맷팅된 문자열 (예: "1,234,567")
 */
function formatNumber(value) {
    return formatCurrency(value, false);
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 * @param {string|Date} date - 포맷팅할 날짜
 * @returns {string} 포맷팅된 날짜 문자열
 */
function formatDate(date) {
    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * 날짜 범위 포맷팅 (YYYY-MM-DD ~ YYYY-MM-DD)
 * @param {string|Date} startDate - 시작일
 * @param {string|Date} endDate - 종료일
 * @returns {string} 포맷팅된 날짜 범위 문자열
 */
function formatDateRange(startDate, endDate) {
    const start = formatDate(startDate);
    const end = formatDate(endDate);

    if (!start && !end) return '';
    if (!start) return end;
    if (!end) return start;

    return `${start} ~ ${end}`;
}
