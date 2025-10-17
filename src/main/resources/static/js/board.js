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
let attachedFiles = [];
let selectedEmployees = [];

// 더미 사원 데이터
const employees = [
    { id: 1, name: '김대표', department: '경영진', position: '대표이사' },
    { id: 2, name: '이CTO', department: '경영진', position: 'CTO' },
    { id: 3, name: '박보안', department: 'IT팀', position: '팀장' },
    { id: 4, name: '최인사', department: '인사팀', position: '팀장' },
    { id: 5, name: '강총무', department: '총무팀', position: '과장' },
    { id: 6, name: '김개발', department: '개발팀', position: '팀장' },
    { id: 7, name: '박프론트', department: '개발팀', position: '과장' },
    { id: 8, name: '이백엔드', department: '개발팀', position: '대리' },
    { id: 9, name: '정자바', department: '개발팀', position: '사원' },
    { id: 10, name: '오마케팅', department: '마케팅팀', position: '과장' },
    { id: 11, name: '서디자인', department: '디자인팀', position: '대리' },
    { id: 12, name: '윤기획', department: '기획팀', position: '과장' }
];

document.addEventListener('DOMContentLoaded', () => {
    renderPosts();
    setupEventListeners();
    updateFilterCounts();
});

function renderPosts() {
    const list = document.getElementById('boardList');

    const filtered = posts.filter(p => {
        if (currentFilter === 'all') return true;
        if (currentFilter === 'notice') return p.type === 'notice';
        if (currentFilter === 'important') return p.important;
        if (currentFilter === 'unread') return isUnread(p);
        return true;
    });

    if (filtered.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 60px; color: #999;">게시글이 없습니다.</div>';
        return;
    }

    list.innerHTML = `
        <div class="board-table-wrapper">
            <table class="board-table">
                <thead>
                    <tr>
                        <th style="width: 80px;">상태</th>
                        <th style="width: 150px;">분류</th>
                        <th>제목</th>
                        <th style="width: 120px;">작성자</th>
                        <th style="width: 120px;">작성일</th>
                        <th style="width: 80px;">조회</th>
                        <th style="width: 100px;">관리</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(post => `
                        <tr class="board-row ${isUnread(post) ? 'unread-row' : ''}" data-id="${post.id}" onclick="showPostDetail(${post.id})">
                            <td>
                                ${isUnread(post)
                                    ? '<span class="status-badge status-unread"><i class="fas fa-circle"></i> 안읽음</span>'
                                    : '<span class="status-badge status-read"><i class="far fa-circle"></i> 읽음</span>'}
                            </td>
                            <td>
                                <div class="post-badges">
                                    ${post.type === 'notice' ? '<span class="badge badge-notice">공지</span>' : ''}
                                    ${post.important ? '<span class="badge badge-important">중요</span>' : ''}
                                    ${!post.type === 'notice' && !post.important ? '<span class="badge badge-normal">일반</span>' : ''}
                                </div>
                            </td>
                            <td class="title-cell">
                                <div class="title-wrapper">
                                    ${post.important ? '<i class="fas fa-exclamation-circle" style="color: #f44336; margin-right: 6px;"></i>' : ''}
                                    <span class="post-title">${post.title}</span>
                                    ${post.attachments && post.attachments.length > 0 ? `<i class="fas fa-paperclip" style="margin-left: 8px; color: #999;"></i>` : ''}
                                    ${post.comments ? `<span class="comment-count"><i class="fas fa-comment"></i> ${post.comments}</span>` : ''}
                                </div>
                            </td>
                            <td class="author-cell">${post.author}</td>
                            <td class="date-cell">${post.date.split(' ')[0]}</td>
                            <td class="views-cell">${post.views}</td>
                            <td class="actions-cell" onclick="event.stopPropagation()">
                                <button class="action-btn-small" onclick="event.stopPropagation(); editPost(${post.id})" title="수정">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn-small" onclick="event.stopPropagation(); deletePost(${post.id})" title="삭제">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
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

    // 파일 목록 초기화
    attachedFiles = post && post.attachments ? [...post.attachments] : [];

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
                        <select id="visibilityScope" required onchange="handleVisibilityChange()">
                            <option value="all" ${!post || post.visibility === 'all' ? 'selected' : ''}>전체 공개</option>
                            <option value="dev" ${post && post.visibility === 'dev' ? 'selected' : ''}>개발팀</option>
                            <option value="hr" ${post && post.visibility === 'hr' ? 'selected' : ''}>인사팀</option>
                            <option value="custom" ${post && post.visibility === 'custom' ? 'selected' : ''}>사용자 지정</option>
                        </select>
                    </div>
                    <div class="form-group" id="customVisibilityGroup" style="display: none;">
                        <label>공개 대상 사원</label>
                        <button type="button" class="btn-secondary" onclick="openEmployeeSelector()" style="width: 100%; justify-content: center;">
                            <i class="fas fa-user-plus"></i> 사원 선택
                        </button>
                        <div id="selectedEmployeesList" class="selected-employees-list"></div>
                    </div>
                    <div class="form-group">
                        <label>파일 첨부</label>
                        <div class="file-upload-area" id="fileUploadArea">
                            <input type="file" id="fileInput" class="file-upload-input" multiple>
                            <label for="fileInput" class="file-upload-label">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>파일을 드래그하거나 클릭하여 업로드</p>
                                <small>여러 파일을 한번에 업로드할 수 있습니다</small>
                            </label>
                        </div>
                        <div class="attached-files" id="attachedFilesList"></div>
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

    // 파일 업로드 이벤트 설정
    setupFileUpload();

    // 기존 첨부 파일 표시
    renderAttachedFiles();

    // 공개범위 초기 설정
    handleVisibilityChange();

    // 기존 선택된 사원 표시
    if (post && post.customEmployees) {
        selectedEmployees = [...post.customEmployees];
        renderSelectedEmployees();
    }
}

// 공개범위 변경 처리
function handleVisibilityChange() {
    const scope = document.getElementById('visibilityScope');
    const customGroup = document.getElementById('customVisibilityGroup');

    if (scope && customGroup) {
        if (scope.value === 'custom') {
            customGroup.style.display = 'block';
        } else {
            customGroup.style.display = 'none';
        }
    }
}

// 사원 선택 모달 열기
function openEmployeeSelector() {
    const modal = document.getElementById('employeeSelectorModal');
    if (!modal) {
        createEmployeeSelectorModal();
        return;
    }

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    renderEmployeeList();
}

// 사원 선택 모달 생성
function createEmployeeSelectorModal() {
    const modalHtml = `
        <div id="employeeSelectorModal" class="modal show">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>공개 대상 사원 선택</h2>
                    <button class="modal-close" onclick="closeEmployeeSelector()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="employee-search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="employeeSearch" placeholder="이름 또는 부서로 검색..." oninput="searchEmployees()">
                    </div>
                    <div class="employee-selection-area">
                        <div class="employee-list-panel">
                            <h4>사원 목록</h4>
                            <div id="employeeListContainer" class="employee-list"></div>
                        </div>
                        <div class="selected-panel">
                            <h4>선택된 사원 (<span id="selectedCount">0</span>명)</h4>
                            <div id="selectedEmployeesContainer" class="selected-list"></div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeEmployeeSelector()">취소</button>
                    <button class="btn-primary" onclick="confirmEmployeeSelection()">
                        <i class="fas fa-check"></i> 확인
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
    renderEmployeeList();
}

// 사원 목록 렌더링
function renderEmployeeList(searchTerm = '') {
    const container = document.getElementById('employeeListContainer');
    if (!container) return;

    const filtered = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    container.innerHTML = filtered.map(emp => `
        <div class="employee-item ${selectedEmployees.find(e => e.id === emp.id) ? 'selected' : ''}"
             onclick="toggleEmployeeSelection(${emp.id})">
            <div class="employee-info">
                <div class="employee-avatar-small">${emp.name.charAt(0)}</div>
                <div class="employee-details">
                    <div class="employee-name-small">${emp.name}</div>
                    <div class="employee-dept-small">${emp.department} · ${emp.position}</div>
                </div>
            </div>
            <div class="employee-checkbox">
                <i class="fas ${selectedEmployees.find(e => e.id === emp.id) ? 'fa-check-circle' : 'fa-circle'}"></i>
            </div>
        </div>
    `).join('');

    renderSelectedEmployeesInModal();
}

// 사원 검색
function searchEmployees() {
    const searchTerm = document.getElementById('employeeSearch').value;
    renderEmployeeList(searchTerm);
}

// 사원 선택/해제 토글
function toggleEmployeeSelection(empId) {
    const employee = employees.find(e => e.id === empId);
    if (!employee) return;

    const index = selectedEmployees.findIndex(e => e.id === empId);
    if (index > -1) {
        selectedEmployees.splice(index, 1);
    } else {
        selectedEmployees.push(employee);
    }

    renderEmployeeList(document.getElementById('employeeSearch')?.value || '');
}

// 모달 내 선택된 사원 렌더링
function renderSelectedEmployeesInModal() {
    const container = document.getElementById('selectedEmployeesContainer');
    const countSpan = document.getElementById('selectedCount');

    if (countSpan) {
        countSpan.textContent = selectedEmployees.length;
    }

    if (!container) return;

    if (selectedEmployees.length === 0) {
        container.innerHTML = '<div class="empty-message">선택된 사원이 없습니다</div>';
        return;
    }

    container.innerHTML = selectedEmployees.map(emp => `
        <div class="selected-employee-item">
            <div class="employee-info">
                <div class="employee-avatar-small">${emp.name.charAt(0)}</div>
                <div class="employee-details">
                    <div class="employee-name-small">${emp.name}</div>
                    <div class="employee-dept-small">${emp.department}</div>
                </div>
            </div>
            <button class="remove-employee-btn" onclick="event.stopPropagation(); toggleEmployeeSelection(${emp.id})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// 사원 선택 모달 닫기
function closeEmployeeSelector() {
    const modal = document.getElementById('employeeSelectorModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// 사원 선택 확인
function confirmEmployeeSelection() {
    renderSelectedEmployees();
    closeEmployeeSelector();
}

// 폼에 선택된 사원 렌더링
function renderSelectedEmployees() {
    const container = document.getElementById('selectedEmployeesList');
    if (!container) return;

    if (selectedEmployees.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="selected-employees-tags">
            ${selectedEmployees.map(emp => `
                <span class="employee-tag">
                    ${emp.name} (${emp.department})
                    <i class="fas fa-times" onclick="removeSelectedEmployee(${emp.id})"></i>
                </span>
            `).join('')}
        </div>
    `;
}

// 선택된 사원 제거
function removeSelectedEmployee(empId) {
    selectedEmployees = selectedEmployees.filter(e => e.id !== empId);
    renderSelectedEmployees();
}

function closeModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

function savePost() {
    const id = document.getElementById('postId').value;
    const visibility = document.getElementById('visibilityScope').value;

    const newPost = {
        id: id ? parseInt(id) : posts.length + 1,
        type: document.getElementById('postType').value,
        important: document.getElementById('isImportant').checked,
        title: document.getElementById('postTitle').value,
        content: document.getElementById('postContent').value,
        author: '현재사용자',
        date: new Date().toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        views: 0,
        visibility: visibility,
        requireRead: document.getElementById('isImportant').checked,
        readBy: [],
        unreadBy: [],
        attachments: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
        customEmployees: visibility === 'custom' && selectedEmployees.length > 0 ? [...selectedEmployees] : undefined
    };

    if (id) {
        const index = posts.findIndex(p => p.id === parseInt(id));
        posts[index] = { ...posts[index], ...newPost };
        showAlert('게시글이 수정되었습니다.', 'success');
    } else {
        posts.unshift(newPost);
        showAlert('게시글이 작성되었습니다.', 'success');
    }

    // 첨부 파일 목록 초기화
    attachedFiles = [];
    // 선택된 사원 목록 초기화
    selectedEmployees = [];

    closeModal('postModal');
    renderPosts();
    updateFilterCounts();
}

function editPost(id) {
    openPostModal(id);
}

function deletePost(id) {
    showConfirm('게시글을 삭제하시겠습니까?', function() {
        const index = posts.findIndex(p => p.id === id);
        posts.splice(index, 1);
        showAlert('게시글이 삭제되었습니다.', 'success');
        renderPosts();
        updateFilterCounts();
    });
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
                    ${post.attachments && post.attachments.length > 0 ? `
                        <div style="margin-top: 24px;">
                            <h4 style="margin: 0 0 12px 0; font-size: 15px; color: #333;">
                                <i class="fas fa-paperclip"></i> 첨부 파일 (${post.attachments.length})
                            </h4>
                            <div class="attached-files">
                                ${post.attachments.map(file => `
                                    <div class="attached-file" style="cursor: pointer;" onclick="downloadFile('${file.name}')">
                                        <div class="file-info">
                                            <div class="file-icon">
                                                <i class="${getFileIcon(file.name)}"></i>
                                            </div>
                                            <div class="file-details">
                                                <div class="file-name">${file.name}</div>
                                                <div class="file-size">${file.size}</div>
                                            </div>
                                        </div>
                                        <i class="fas fa-download" style="color: #667eea; font-size: 18px;"></i>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
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
        showAlert('읽음 확인이 완료되었습니다.', 'success');
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

// 파일 업로드 설정
function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('fileUploadArea');

    if (!fileInput || !uploadArea) return;

    // 파일 선택 이벤트
    fileInput.addEventListener('change', handleFileSelect);

    // 드래그 앤 드롭 이벤트
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        handleFiles(files);
    });
}

// 파일 선택 처리
function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

// 파일 처리
function handleFiles(files) {
    Array.from(files).forEach(file => {
        const fileObj = {
            name: file.name,
            size: formatFileSize(file.size),
            type: file.type,
            file: file
        };
        attachedFiles.push(fileObj);
    });

    renderAttachedFiles();
}

// 첨부 파일 목록 렌더링
function renderAttachedFiles() {
    const filesList = document.getElementById('attachedFilesList');
    if (!filesList) return;

    if (attachedFiles.length === 0) {
        filesList.innerHTML = '';
        return;
    }

    filesList.innerHTML = attachedFiles.map((file, index) => `
        <div class="attached-file">
            <div class="file-info">
                <div class="file-icon">
                    <i class="${getFileIcon(file.name)}"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${file.size}</div>
                </div>
            </div>
            <button class="file-remove" onclick="removeFile(${index})">
                <i class="fas fa-times"></i> 삭제
            </button>
        </div>
    `).join('');
}

// 파일 삭제
function removeFile(index) {
    attachedFiles.splice(index, 1);
    renderAttachedFiles();
}

// 파일 크기 포맷
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 파일 아이콘 가져오기
function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const iconMap = {
        'pdf': 'fas fa-file-pdf',
        'doc': 'fas fa-file-word',
        'docx': 'fas fa-file-word',
        'xls': 'fas fa-file-excel',
        'xlsx': 'fas fa-file-excel',
        'ppt': 'fas fa-file-powerpoint',
        'pptx': 'fas fa-file-powerpoint',
        'jpg': 'fas fa-file-image',
        'jpeg': 'fas fa-file-image',
        'png': 'fas fa-file-image',
        'gif': 'fas fa-file-image',
        'zip': 'fas fa-file-archive',
        'rar': 'fas fa-file-archive',
        'txt': 'fas fa-file-alt',
        'csv': 'fas fa-file-csv'
    };
    return iconMap[ext] || 'fas fa-file';
}

// 파일 다운로드
function downloadFile(fileName) {
    // TODO: 실제 파일 다운로드 구현
    console.log('파일 다운로드:', fileName);
    showAlert(`"${fileName}" 파일을 다운로드합니다.`, 'info');
}
