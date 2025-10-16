// 메신저 페이지 스크립트
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = '사용자'; // 실제로는 로그인한 사용자 정보
    let activeChatId = null;

    // 샘플 채팅방 데이터
    const chatRooms = [
        {
            id: 1,
            participant: '김대표',
            department: '경영진',
            lastMessage: '내일 회의 일정 확인 부탁드립니다.',
            lastMessageTime: '10:30',
            unreadCount: 2,
            isOnline: true,
            messages: [
                { id: 1, sender: '김대표', message: '안녕하세요', time: '09:00', date: '2025-10-16' },
                { id: 2, sender: currentUser, message: '네, 안녕하세요 대표님', time: '09:01', date: '2025-10-16' },
                { id: 3, sender: '김대표', message: '내일 회의 일정 확인 부탁드립니다.', time: '10:30', date: '2025-10-16' }
            ]
        },
        {
            id: 2,
            participant: '박CMO',
            department: '마케팅팀',
            lastMessage: '프로젝트 진행 상황 공유드립니다.',
            lastMessageTime: '어제',
            unreadCount: 0,
            isOnline: true,
            messages: [
                { id: 1, sender: '박CMO', message: '프로젝트 진행 상황 공유드립니다.', time: '15:20', date: '2025-10-15' },
                { id: 2, sender: currentUser, message: '감사합니다. 확인했습니다.', time: '15:25', date: '2025-10-15' }
            ]
        },
        {
            id: 3,
            participant: '이CTO',
            department: '개발팀',
            lastMessage: '새로운 기능 개발 완료했습니다.',
            lastMessageTime: '2일 전',
            unreadCount: 0,
            isOnline: false,
            messages: [
                { id: 1, sender: '이CTO', message: '새로운 기능 개발 완료했습니다.', time: '14:00', date: '2025-10-14' },
                { id: 2, sender: currentUser, message: '수고하셨습니다!', time: '14:05', date: '2025-10-14' }
            ]
        },
        {
            id: 4,
            participant: '정지원',
            department: '인사팀',
            lastMessage: '연차 신청 승인 완료되었습니다.',
            lastMessageTime: '3일 전',
            unreadCount: 0,
            isOnline: true,
            messages: [
                { id: 1, sender: '정지원', message: '연차 신청 승인 완료되었습니다.', time: '11:00', date: '2025-10-13' },
                { id: 2, sender: currentUser, message: '감사합니다~', time: '11:02', date: '2025-10-13' }
            ]
        }
    ];

    // 샘플 사용자 목록
    const users = [
        { id: 1, name: '김대표', department: '경영진', isOnline: true },
        { id: 2, name: '박CMO', department: '마케팅팀', isOnline: true },
        { id: 3, name: '이CTO', department: '개발팀', isOnline: false },
        { id: 4, name: '정지원', department: '인사팀', isOnline: true },
        { id: 5, name: '김개발', department: '개발팀', isOnline: true },
        { id: 6, name: '이개발', department: '개발팀', isOnline: false },
        { id: 7, name: '최디자인', department: '디자인팀', isOnline: true },
        { id: 8, name: '박기획', department: '기획팀', isOnline: false }
    ];

    // 채팅방 목록 렌더링
    function renderChatList() {
        const chatList = document.getElementById('chatList');
        chatList.innerHTML = '';

        chatRooms.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item${chat.id === activeChatId ? ' active' : ''}`;
            chatItem.setAttribute('data-chat-id', chat.id);

            const onlineClass = chat.isOnline ? 'online' : '';
            const unreadBadge = chat.unreadCount > 0 ? `<div class="chat-item-unread">${chat.unreadCount}</div>` : '';

            chatItem.innerHTML = `
                <div class="chat-item-avatar ${onlineClass}">
                    <i class="fas fa-user"></i>
                </div>
                <div class="chat-item-content">
                    <div class="chat-item-header">
                        <span class="chat-item-name">${chat.participant}</span>
                        <span class="chat-item-time">${chat.lastMessageTime}</span>
                    </div>
                    <div class="chat-item-message">${chat.lastMessage}</div>
                </div>
                ${unreadBadge}
            `;

            chatItem.addEventListener('click', function() {
                openChat(chat.id);
            });

            chatList.appendChild(chatItem);
        });
    }

    // 채팅 열기
    function openChat(chatId) {
        activeChatId = chatId;
        const chat = chatRooms.find(c => c.id === chatId);
        if (!chat) return;

        // 읽음 처리
        chat.unreadCount = 0;

        // UI 업데이트
        renderChatList();

        // 채팅 패널 표시
        document.getElementById('chatEmpty').style.display = 'none';
        document.getElementById('chatActive').style.display = 'flex';

        // 헤더 업데이트
        document.getElementById('chatParticipantName').textContent = chat.participant;
        document.getElementById('chatParticipantStatus').textContent = chat.isOnline ? '온라인' : '오프라인';

        // 메시지 렌더링
        renderMessages(chat.messages);
    }

    // 메시지 렌더링
    function renderMessages(messages) {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';

        let currentDate = '';

        messages.forEach(msg => {
            // 날짜 구분선
            if (msg.date !== currentDate) {
                currentDate = msg.date;
                const dateDiv = document.createElement('div');
                dateDiv.className = 'message-date';
                dateDiv.textContent = formatDate(msg.date);
                chatMessages.appendChild(dateDiv);
            }

            // 메시지
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.sender === currentUser ? 'sent' : 'received'}`;

            const avatarHtml = msg.sender !== currentUser ? `
                <div class="message-avatar">
                    <i class="fas fa-user"></i>
                </div>
            ` : '';

            messageDiv.innerHTML = `
                ${avatarHtml}
                <div class="message-content">
                    <div class="message-bubble">${msg.message}</div>
                    <div class="message-time">${msg.time}</div>
                </div>
            `;

            chatMessages.appendChild(messageDiv);
        });

        // 스크롤을 맨 아래로
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 날짜 포맷
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (dateStr === formatDateString(today)) {
            return '오늘';
        } else if (dateStr === formatDateString(yesterday)) {
            return '어제';
        } else {
            return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
        }
    }

    function formatDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 메시지 전송
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();

        if (!message || !activeChatId) return;

        const chat = chatRooms.find(c => c.id === activeChatId);
        if (!chat) return;

        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const date = formatDateString(now);

        const newMessage = {
            id: chat.messages.length + 1,
            sender: currentUser,
            message: message,
            time: time,
            date: date
        };

        chat.messages.push(newMessage);
        chat.lastMessage = message;
        chat.lastMessageTime = time;

        // UI 업데이트
        renderMessages(chat.messages);
        renderChatList();

        // 입력 필드 초기화
        input.value = '';
    }

    // 채팅방 검색
    document.getElementById('chatSearchInput').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const chatItems = document.querySelectorAll('.chat-item');

        chatItems.forEach(item => {
            const name = item.querySelector('.chat-item-name').textContent.toLowerCase();
            if (name.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // 새 채팅 모달
    const newChatModal = document.getElementById('newChatModal');
    const newChatBtn = document.getElementById('newChatBtn');
    const closeNewChatModal = document.getElementById('closeNewChatModal');

    newChatBtn.addEventListener('click', function() {
        renderUserList();
        newChatModal.classList.add('show');
    });

    closeNewChatModal.addEventListener('click', function() {
        newChatModal.classList.remove('show');
    });

    newChatModal.addEventListener('click', function(e) {
        if (e.target === this) {
            newChatModal.classList.remove('show');
        }
    });

    // 사용자 목록 렌더링
    function renderUserList() {
        const userList = document.getElementById('userList');
        userList.innerHTML = '';

        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';

            userItem.innerHTML = `
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-info">
                    <div class="user-name">${user.name}</div>
                    <div class="user-department">${user.department}</div>
                </div>
            `;

            userItem.addEventListener('click', function() {
                startNewChat(user);
            });

            userList.appendChild(userItem);
        });
    }

    // 새 채팅 시작
    function startNewChat(user) {
        // 이미 채팅방이 있는지 확인
        let existingChat = chatRooms.find(c => c.participant === user.name);

        if (existingChat) {
            // 기존 채팅방 열기
            openChat(existingChat.id);
        } else {
            // 새 채팅방 생성
            const newChat = {
                id: chatRooms.length + 1,
                participant: user.name,
                department: user.department,
                lastMessage: '새로운 대화를 시작하세요',
                lastMessageTime: '방금',
                unreadCount: 0,
                isOnline: user.isOnline,
                messages: []
            };

            chatRooms.unshift(newChat);
            renderChatList();
            openChat(newChat.id);
        }

        newChatModal.classList.remove('show');
    }

    // 사용자 검색
    document.getElementById('userSearchInput').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const userItems = document.querySelectorAll('.user-item');

        userItems.forEach(item => {
            const name = item.querySelector('.user-name').textContent.toLowerCase();
            const department = item.querySelector('.user-department').textContent.toLowerCase();

            if (name.includes(searchTerm) || department.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            newChatModal.classList.remove('show');
        }
    });

    // 초기 렌더링
    renderChatList();

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
