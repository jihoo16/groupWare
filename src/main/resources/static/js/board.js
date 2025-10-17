// 전사 게시판 JavaScript

// 더미 데이터
const posts = [
    {
        id: 1,
        type: 'notice',
        important: true,
        title: '[필독] 2025년 1분기 전사 워크샵 안내',
        content: '2025년 1분기 전사 워크샵이 2월 15-16일 양일간 제주도에서 진행될 예정입니다. 모든 임직원은 필히 참석해주시기 바랍니다. 숙박 및 교통편은 회사에서 제공합니다.',
        author: '김대표',
        date: '2025-01-15 14:30',
        views: 152,
        visibility: 'all',
        requireRead: true,
        readBy: ['user1', 'user2', 'user5', 'user8'],
        unreadBy: ['currentUser', 'user3', 'user4', 'user6', 'user7']
    },
    {
        id: 2,
        type: 'notice',
        important: false,
        title: '보안 정책 업데이트 안내',
        content: '회사 보안 정책이 업데이트되었습니다. 비밀번호는 이제 90일마다 변경해야 하며, 최소 12자 이상으로 설정해야 합니다.',
        author: '박보안',
        date: '2025-01-14 10:00',
        views: 98,
        visibility: 'all',
        requireRead: false,
        readBy: [],
        unreadBy: []
    },
    {
        id: 3,
        type: 'important',
        important: true,
        title: '[중요] 프로젝트 일정 변경 공유',
        content: 'ERP 고도화 프로젝트 일정이 변경되었습니다. 1차 베타 테스트가 2월 1일에서 2월 15일로 연기됩니다. 관련 팀원분들은 일정을 조율해주시기 바랍니다.',
        author: '이CTO',
        date: '2025-01-13 16:45',
        views: 67,
        visibility: 'dev',
        requireRead: true,
        readBy: ['user1', 'user2'],
        unreadBy: ['currentUser', 'user3', 'user4']
    },
    {
        id: 4,
        type: 'normal',
        important: false,
        title: '사내 식당 메뉴 변경 안내',
        content: '다음 주부터 사내 식당 메뉴가 변경됩니다. 새로운 메뉴는 공지사항을 확인해주세요.',
        author: '강총무',
        date: '2025-01-12 11:20',
        views: 45,
        visibility: 'all',
        requireRead: false,
        comments: 5
    },
    {
        id: 5,
        type: 'normal',
        important: false,
        title: '신규 입사자 소개',
        content: '이번 주 월요일부터 마케팅팀에 신규 입사자가 합류했습니다. 오마케팅님을 환영해주세요!',
        author: '최인사',
        date: '2025-01-11 09:15',
        views: 32,
        visibility: 'all',
        requireRead: false
    },
    {
        id: 6,
        type: 'notice',
        important: true,
        title: '[긴급] 서버 점검 안내',
        content: '금일 오후 10시부터 익일 오전 2시까지 서버 점검이 진행됩니다. 해당 시간에는 시스템 접속이 불가하오니 양해 부탁드립니다.',
        author: 'IT팀',
        date: '2025-01-16 15:00',
        views: 203,
        visibility: 'all',
        requireRead: true,
        readBy: ['user1', 'user2', 'user3'],
        unreadBy: ['currentUser', 'user4', 'user5', 'user6']
    },
    {
        id: 7,
        type: 'normal',
        important: false,
        title: '2월 생일자 축하합니다',
        content: '2월 생일을 맞이하신 분들을 축하드립니다. 김개발님, 박프론트님, 정자바님 생일 축하드립니다!',
        author: '인사팀',
        date: '2025-01-10 14:00',
        views: 78,
        visibility: 'all',
        requireRead: false,
        comments: 12
    },
    {
        id: 8,
        type: 'normal',
        important: false,
        title: '주차장 이용 안내',
        content: '지하 주차장 B구역이 공사로 인해 일시적으로 사용 불가합니다. A구역 또는 C구역을 이용해주시기 바랍니다.',
        author: '관리팀',
        date: '2025-01-09 10:30',
        views: 56,
        visibility: 'all',
        requireRead: false
    },
    {
        id: 9,
        type: 'important',
        important: true,
        title: '[중요] 개인정보 보호 교육 필수 이수',
        content: '전 직원 대상 개인정보 보호 교육을 1월 말까지 필수로 이수해주시기 바랍니다. 미이수 시 인사고과에 반영될 수 있습니다.',
        author: '법무팀',
        date: '2025-01-08 09:00',
        views: 134,
        visibility: 'all',
        requireRead: true,
        readBy: ['user1', 'user5', 'user7'],
        unreadBy: ['currentUser', 'user2', 'user3', 'user4', 'user6', 'user8']
    },
    {
        id: 10,
        type: 'normal',
        important: false,
        title: '사내 도서 대여 시스템 오픈',
        content: '사내 도서관에서 도서 대여 시스템이 새롭게 오픈했습니다. 인트라넷에서 도서 검색 및 예약이 가능합니다.',
        author: '경영지원팀',
        date: '2025-01-07 16:20',
        views: 89,
        visibility: 'all',
        requireRead: false,
        comments: 8
    },
    {
        id: 11,
        type: 'normal',
        important: false,
        title: '건강검진 일정 안내',
        content: '2025년 상반기 건강검진 일정을 안내드립니다. 부서별 일정을 확인하시고 예약해주시기 바랍니다.',
        author: '인사팀',
        date: '2025-01-06 11:00',
        views: 112,
        visibility: 'all',
        requireRead: false
    },
    {
        id: 12,
        type: 'normal',
        important: false,
        title: '우수사원 선정 결과 발표',
        content: '12월 우수사원으로 개발팀 이백엔드님이 선정되셨습니다. 축하드립니다!',
        author: '인사팀',
        date: '2025-01-05 14:30',
        views: 145,
        visibility: 'all',
        requireRead: false,
        comments: 18
    },
    {
        id: 13,
        type: 'normal',
        important: false,
        title: '회의실 예약 시스템 개선',
        content: '회의실 예약 시스템이 개선되었습니다. 이제 모바일에서도 예약이 가능합니다.',
        author: 'IT팀',
        date: '2025-01-04 10:15',
        views: 67,
        visibility: 'all',
        requireRead: false
    },
    {
        id: 14,
        type: 'normal',
        important: false,
        title: '사내 동호회 모집',
        content: '축구 동호회에서 신규 회원을 모집합니다. 매주 토요일 오전 10시에 활동합니다. 관심있으신 분들은 댓글로 신청해주세요!',
        author: '박프론트',
        date: '2025-01-03 15:45',
        views: 92,
        visibility: 'all',
        requireRead: false,
        comments: 15
    },
    {
        id: 15,
        type: 'notice',
        important: false,
        title: '설 연휴 휴무 안내',
        content: '2025년 설 연휴는 1월 28일(화)부터 1월 30일(목)까지입니다. 즐거운 명절 보내세요.',
        author: '인사팀',
        date: '2025-01-02 09:00',
        views: 178,
        visibility: 'all',
        requireRead: false
    }
];

let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    renderPosts();
    setupEventListeners();
    updateFilterCounts();
});

function renderPosts() {
    const list = document.getElementById('boardList');
    list.innerHTML = '';

    const filtered = posts.filter(p => {
        if (currentFilter === 'all') return true;
        if (currentFilter === 'notice') return p.type === 'notice';
        if (currentFilter === 'important') return p.important;
        if (currentFilter === 'unread') return isUnread(p);
        return true;
    });

    filtered.forEach(post => {
        const item = document.createElement('div');
        item.className = `board-item ${post.type} ${post.important ? 'important' : ''} ${isUnread(post) ? 'unread' : ''}`;
        item.setAttribute('data-id', post.id);

        item.innerHTML = `
            <div class="item-badges">
                ${post.type === 'notice' ? '<span class="badge badge-notice">공지</span>' : ''}
                ${post.important ? '<span class="badge badge-important">중요</span>' : ''}
                ${isUnread(post) ? '<span class="badge badge-unread">읽지않음</span>' : ''}
            </div>
            <div class="item-header">
                <h3 class="item-title">
                    ${post.important ? '<i class="fas fa-exclamation-circle"></i>' : ''}
                    ${post.title}
                </h3>
                <div class="item-actions">
                    <button class="action-btn" data-action="edit" title="수정">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn" data-action="delete" title="삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <p class="item-excerpt">${post.content}</p>
            <div class="item-meta">
                <div class="meta-left">
                    <span class="meta-item">
                        <i class="fas fa-user"></i>
                        ${post.author}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-calendar"></i>
                        ${post.date}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-eye"></i>
                        ${post.views}
                    </span>
                    ${post.comments ? `<span class="meta-item"><i class="fas fa-comment"></i>${post.comments}</span>` : ''}
                    <span class="meta-item">
                        <i class="fas fa-users"></i>
                        공개범위: ${getVisibilityText(post.visibility)}
                    </span>
                </div>
                ${post.requireRead ? `
                    <div class="meta-right">
                        <span class="read-status">
                            <i class="fas fa-check-circle"></i>
                            ${post.readBy ? post.readBy.length : 0}/${(post.readBy ? post.readBy.length : 0) + (post.unreadBy ? post.unreadBy.length : 0)} 읽음
                        </span>
                    </div>
                ` : ''}
            </div>
        `;

        item.addEventListener('click', (e) => {
            if (!e.target.closest('.action-btn')) {
                showPostDetail(post.id);
            }
        });

        list.appendChild(item);
    });
}

function isUnread(post) {
    return post.requireRead && post.unreadBy && post.unreadBy.includes('currentUser');
}

function getVisibilityText(v) {
    const map = {
        'all': '전체',
        'dev': '개발팀',
        'hr': '인사팀',
        'custom': '지정'
    };
    return map[v] || v;
}

function updateFilterCounts() {
    const counts = {
        all: posts.length,
        notice: posts.filter(p => p.type === 'notice').length,
        important: posts.filter(p => p.important).length,
        unread: posts.filter(p => isUnread(p)).length
    };

    document.querySelectorAll('.filter-tab').forEach(tab => {
        const filter = tab.getAttribute('data-filter');
        const countSpan = tab.querySelector('.tab-count');
        if (countSpan && counts[filter] !== undefined) {
            countSpan.textContent = counts[filter];
        }
    });
}

function setupEventListeners() {
    // 필터 탭
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.getAttribute('data-filter');
            renderPosts();
        });
    });

    // 새 게시글 버튼
    document.getElementById('newPostBtn').addEventListener('click', () => openPostModal());

    // 검색
    document.getElementById('boardSearch').addEventListener('input', (e) => searchPosts(e.target.value));

    // 액션 버튼 (이벤트 위임)
    document.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('.action-btn');
        if (actionBtn) {
            e.stopPropagation();
            const action = actionBtn.getAttribute('data-action');
            const item = actionBtn.closest('.board-item');
            if (item) {
                const id = parseInt(item.getAttribute('data-id'));
                if (action === 'edit') editPost(id);
                else if (action === 'delete') deletePost(id);
            }
        }
    });
}

function openPostModal(postId = null) {
    const modal = document.getElementById('postModal');
    const post = postId ? posts.find(p => p.id === postId) : null;

    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h2>${post ? '게시글 수정' : '새 게시글 작성'}</h2>
                <button class="modal-close" onclick="closeModal('postModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="postForm">
                    <input type="hidden" id="postId" value="${post ? post.id : ''}">
                    <div class="form-row">
                        <div class="form-group">
                            <label>게시글 유형 <span class="required">*</span></label>
                            <select id="postType" required>
                                <option value="normal" ${!post || post.type === 'normal' ? 'selected' : ''}>일반</option>
                                <option value="notice" ${post && post.type === 'notice' ? 'selected' : ''}>공지사항</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="isImportant" ${post && post.important ? 'checked' : ''}>
                                중요 게시글 (읽음 확인 필요)
                            </label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>제목 <span class="required">*</span></label>
                        <input type="text" id="postTitle" value="${post ? post.title : ''}" placeholder="제목을 입력하세요" required>
                    </div>
                    <div class="form-group">
                        <label>내용 <span class="required">*</span></label>
                        <textarea id="postContent" rows="10" placeholder="내용을 입력하세요" required>${post ? post.content : ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>공개 범위 <span class="required">*</span></label>
                        <select id="visibilityScope" required>
                            <option value="all" ${!post || post.visibility === 'all' ? 'selected' : ''}>전체 공개</option>
                            <option value="dev" ${post && post.visibility === 'dev' ? 'selected' : ''}>개발팀</option>
                            <option value="hr" ${post && post.visibility === 'hr' ? 'selected' : ''}>인사팀</option>
                            <option value="custom">사용자 지정</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal('postModal')">취소</button>
                <button class="btn-primary" onclick="savePost()">게시하기</button>
            </div>
        </div>
    `;

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

function savePost() {
    const id = document.getElementById('postId').value;
    const newPost = {
        id: id ? parseInt(id) : posts.length + 1,
        type: document.getElementById('postType').value,
        important: document.getElementById('isImportant').checked,
        title: document.getElementById('postTitle').value,
        content: document.getElementById('postContent').value,
        author: '현재사용자',
        date: new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        views: 0,
        visibility: document.getElementById('visibilityScope').value,
        requireRead: document.getElementById('isImportant').checked,
        readBy: [],
        unreadBy: []
    };

    if (id) {
        const index = posts.findIndex(p => p.id === parseInt(id));
        posts[index] = { ...posts[index], ...newPost };
        alert('게시글이 수정되었습니다.');
    } else {
        posts.unshift(newPost);
        alert('게시글이 작성되었습니다.');
    }

    closeModal('postModal');
    renderPosts();
    updateFilterCounts();
}

function editPost(id) {
    openPostModal(id);
}

function deletePost(id) {
    if (confirm('게시글을 삭제하시겠습니까?')) {
        const index = posts.findIndex(p => p.id === id);
        posts.splice(index, 1);
        alert('게시글이 삭제되었습니다.');
        renderPosts();
        updateFilterCounts();
    }
}

function showPostDetail(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;

    const modal = document.getElementById('postDetailModal');

    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h2>게시글 상세</h2>
                <button class="modal-close" onclick="closeModal('postDetailModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="post-detail">
                    <div class="detail-badges">
                        ${post.type === 'notice' ? '<span class="badge badge-notice">공지</span>' : ''}
                        ${post.important ? '<span class="badge badge-important">중요</span>' : ''}
                    </div>
                    <h2 style="margin: 16px 0; font-size: 24px; color: #333;">${post.title}</h2>
                    <div class="item-meta" style="margin-bottom: 24px;">
                        <span class="meta-item"><i class="fas fa-user"></i>${post.author}</span>
                        <span class="meta-item"><i class="fas fa-calendar"></i>${post.date}</span>
                        <span class="meta-item"><i class="fas fa-eye"></i>${post.views}</span>
                        <span class="meta-item"><i class="fas fa-users"></i>공개범위: ${getVisibilityText(post.visibility)}</span>
                    </div>
                    <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; line-height: 1.8; min-height: 200px;">
                        ${post.content}
                    </div>
                    ${post.requireRead ? `
                        <div style="margin-top: 30px; padding: 20px; background: #e8f5e9; border-radius: 8px;">
                            <h4 style="margin: 0 0 16px 0;">읽음 확인</h4>
                            <div style="display: flex; gap: 40px; margin-bottom: 16px;">
                                <div>
                                    <span style="color: #666;">읽음:</span>
                                    <strong style="color: #4caf50; font-size: 20px; margin-left: 8px;">${post.readBy ? post.readBy.length : 0}</strong>
                                </div>
                                <div>
                                    <span style="color: #666;">읽지 않음:</span>
                                    <strong style="color: #f44336; font-size: 20px; margin-left: 8px;">${post.unreadBy ? post.unreadBy.length : 0}</strong>
                                </div>
                            </div>
                            <button class="btn-secondary" onclick="showReaders(${id})">읽은 사람 보기</button>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeModal('postDetailModal')">닫기</button>
                ${post.requireRead && isUnread(post) ? `
                    <button class="btn-primary" onclick="confirmRead(${id})">
                        <i class="fas fa-check"></i>
                        읽음 확인
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    // 조회수 증가
    if (!post.readBy || !post.readBy.includes('currentUser')) {
        post.views++;
    }
}

function confirmRead(id) {
    const post = posts.find(p => p.id === id);
    if (post && post.unreadBy) {
        post.unreadBy = post.unreadBy.filter(u => u !== 'currentUser');
        if (!post.readBy) post.readBy = [];
        post.readBy.push('currentUser');
        alert('읽음 확인이 완료되었습니다.');
        closeModal('postDetailModal');
        renderPosts();
        updateFilterCounts();
    }
}

function showReaders(id) {
    const post = posts.find(p => p.id === id);
    const modal = document.getElementById('readersModal');

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>읽은 사람 목록</h2>
                <button class="modal-close" onclick="closeModal('readersModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <h4 style="margin-bottom: 12px; color: #4caf50;">읽음 (${post.readBy ? post.readBy.length : 0}명)</h4>
                <div style="margin-bottom: 20px;">
                    ${post.readBy && post.readBy.length > 0
                        ? post.readBy.map(u => `<div style="padding: 8px; background: #e8f5e9; margin-bottom: 4px; border-radius: 4px; color: #2e7d32;">${u}</div>`).join('')
                        : '<p style="color: #999;">읽은 사람이 없습니다.</p>'}
                </div>
                <h4 style="margin-bottom: 12px; color: #f44336;">읽지 않음 (${post.unreadBy ? post.unreadBy.length : 0}명)</h4>
                <div>
                    ${post.unreadBy && post.unreadBy.length > 0
                        ? post.unreadBy.map(u => `<div style="padding: 8px; background: #ffebee; margin-bottom: 4px; border-radius: 4px; color: #c62828;">${u}</div>`).join('')
                        : '<p style="color: #999;">모두 읽었습니다.</p>'}
                </div>
            </div>
        </div>
    `;

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function searchPosts(query) {
    if (!query) {
        renderPosts();
        return;
    }

    const filtered = posts.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.content.toLowerCase().includes(query.toLowerCase()) ||
        p.author.toLowerCase().includes(query.toLowerCase())
    );

    const list = document.getElementById('boardList');
    list.innerHTML = '';

    if (filtered.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 60px; color: #999;">검색 결과가 없습니다.</div>';
        return;
    }

    filtered.forEach(post => {
        const item = document.createElement('div');
        item.className = 'board-item';
        item.innerHTML = `
            <h3 class="item-title">${post.title}</h3>
            <p class="item-excerpt">${post.content}</p>
            <div class="item-meta">
                <span class="meta-item"><i class="fas fa-user"></i>${post.author}</span>
                <span class="meta-item"><i class="fas fa-calendar"></i>${post.date}</span>
            </div>
        `;
        item.addEventListener('click', () => showPostDetail(post.id));
        list.appendChild(item);
    });
}
