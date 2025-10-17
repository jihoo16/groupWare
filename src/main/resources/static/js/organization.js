// 조직도 페이지 스크립트
document.addEventListener('DOMContentLoaded', function() {
    const orgNodes = document.querySelectorAll('.org-node');
    const hoverCard = document.getElementById('hoverCard');
    let hoverTimeout = null;

    // 휴가 상태에 따라 노드에 클래스 추가
    orgNodes.forEach(node => {
        const status = node.dataset.status;
        if (status === 'vacation') {
            node.classList.add('on-vacation');
        }

        node.addEventListener('mouseenter', function(e) {
            clearTimeout(hoverTimeout);
            showHoverCard(this, e);
        });

        node.addEventListener('mouseleave', function() {
            hoverTimeout = setTimeout(() => {
                hideHoverCard();
            }, 300);
        });
    });

    // 호버 카드에 마우스가 올라가면 사라지지 않도록
    hoverCard.addEventListener('mouseenter', function() {
        clearTimeout(hoverTimeout);
    });

    hoverCard.addEventListener('mouseleave', function() {
        hideHoverCard();
    });

    function showHoverCard(node, event) {
        // 데이터 가져오기
        const name = node.dataset.name;
        const position = node.dataset.position;
        const department = node.dataset.department;
        const phone = node.dataset.phone;
        const email = node.dataset.email;
        const image = node.dataset.image;
        const status = node.dataset.status;

        // 호버 카드 내용 업데이트
        hoverCard.querySelector('.hover-name').textContent = name;
        hoverCard.querySelector('.hover-position').textContent = position;
        hoverCard.querySelector('.hover-department').textContent = department;
        hoverCard.querySelector('.hover-email').textContent = email;

        // 상태 표시
        const statusItem = hoverCard.querySelector('.hover-info-item.status');
        const statusText = hoverCard.querySelector('.hover-status');

        if (status === 'vacation') {
            statusText.textContent = '휴가중';
            statusItem.classList.add('on-vacation');
            statusText.classList.add('on-vacation');
        } else {
            statusText.textContent = '재직중';
            statusItem.classList.remove('on-vacation');
            statusText.classList.remove('on-vacation');
        }

        // 이미지 처리 (이미지가 있으면 img 태그로, 없으면 아이콘으로)
        const avatarDiv = hoverCard.querySelector('.hover-avatar');
        if (image && image.trim() !== '') {
            avatarDiv.innerHTML = `<img src="${image}" alt="${name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            avatarDiv.innerHTML = '<i class="fas fa-user-circle"></i>';
        }

        // 위치 계산
        const rect = node.getBoundingClientRect();
        const cardWidth = 320;
        const cardHeight = hoverCard.offsetHeight || 300;

        let left = rect.right + 10;
        let top = rect.top;

        // 화면 오른쪽을 벗어나면 왼쪽에 표시
        if (left + cardWidth > window.innerWidth) {
            left = rect.left - cardWidth - 10;
        }

        // 화면 아래를 벗어나면 위로 조정
        if (top + cardHeight > window.innerHeight) {
            top = window.innerHeight - cardHeight - 10;
        }

        // 화면 위를 벗어나면 아래로 조정
        if (top < 10) {
            top = 10;
        }

        hoverCard.style.left = `${left}px`;
        hoverCard.style.top = `${top}px`;
        hoverCard.classList.add('show');
    }

    function hideHoverCard() {
        hoverCard.classList.remove('show');
    }

    // 액션 버튼 이벤트
    const chatBtn = hoverCard.querySelector('.hover-action-btn.chat');
    const emailBtn = hoverCard.querySelector('.hover-action-btn.email');

    chatBtn.addEventListener('click', function() {
        const name = hoverCard.querySelector('.hover-name').textContent;
        console.log(`${name}님과 채팅 시작`);
        // 채팅 기능 연동
        showAlert(`${name}님과 채팅을 시작합니다.`, 'info');
    });

    emailBtn.addEventListener('click', function() {
        const email = hoverCard.querySelector('.hover-email').textContent;
        console.log(`${email}로 메일 보내기`);
        // 메일 기능 연동
        window.location.href = `mailto:${email}`;
    });

    // 검색 기능
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();

            orgNodes.forEach(node => {
                const name = node.dataset.name.toLowerCase();
                const department = node.dataset.department.toLowerCase();
                const position = node.dataset.position.toLowerCase();

                if (name.includes(searchTerm) ||
                    department.includes(searchTerm) ||
                    position.includes(searchTerm)) {
                    node.style.display = '';
                    node.style.opacity = '1';
                } else if (searchTerm === '') {
                    node.style.display = '';
                    node.style.opacity = '1';
                } else {
                    node.style.opacity = '0.3';
                }
            });
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
});
