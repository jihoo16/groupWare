// 메뉴 토글 기능
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');

    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
        });
    }

    // 현재 페이지에 맞는 메뉴 활성화
    const currentPath = window.location.pathname;
    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(item => {
        const link = item.querySelector('a');
        if (link && link.getAttribute('href') === currentPath) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // 검색 기능 (추후 구현)
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                console.log('검색:', this.value);
                // 검색 로직 추가
            }
        });
    }

    // 알림 버튼 클릭 이벤트 (추후 구현)
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            console.log('알림 클릭');
            // 알림 패널 표시 로직 추가
        });
    }

    // 잔여 연차 카드 클릭 이벤트
    const vacationCard = document.getElementById('vacationCard');
    if (vacationCard) {
        vacationCard.addEventListener('click', function() {
            window.location.href = '/vacation';
        });
    }

    // 오늘 일정 카드 클릭 이벤트
    const todayScheduleCard = document.getElementById('todayScheduleCard');
    if (todayScheduleCard) {
        todayScheduleCard.addEventListener('click', function() {
            window.location.href = '/calendar';
        });
    }

    // 읽지 않은 메일 카드 클릭 이벤트
    const unreadMailCard = document.getElementById('unreadMailCard');
});
