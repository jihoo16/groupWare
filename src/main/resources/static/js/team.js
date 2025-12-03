// 팀 관리 페이지 스크립트
document.addEventListener('DOMContentLoaded', function() {
    // 현재 사용자 정보 (TODO: 실제로는 세션에서 가져와야 함)
    const currentUser = {
        idx: 1,
        name: '사용자'
    };

    // 상태 변수
    let allTeams = [];
    let currentFilter = 'all';
    let currentView = 'grid';
    let selectedTeamIdx = null;

    // DOM 요소
    const newTeamBtn = document.getElementById('newTeamBtn');
    const teamSearchInput = document.getElementById('teamSearchInput');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const viewBtns = document.querySelectorAll('.view-btn');
    const retryBtn = document.getElementById('retryBtn');

    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const teamGrid = document.getElementById('teamGrid');
    const teamList = document.getElementById('teamList');
    const teamTableBody = document.getElementById('teamTableBody');
    const teamCount = document.getElementById('teamCount');

    // 모달 요소
    const teamDetailModal = document.getElementById('teamDetailModal');
    const closeDetailModal = document.getElementById('closeDetailModal');
    const closeDetailBtn = document.getElementById('closeDetailBtn');
    const editTeamBtn = document.getElementById('editTeamBtn');

    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const closeDeleteModal = document.getElementById('closeDeleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    // 초기 로드
    loadTeams();

    // 이벤트 리스너
    newTeamBtn.addEventListener('click', () => {
        window.location.href = '/team/new';
    });

    teamSearchInput.addEventListener('input', function() {
        filterAndRenderTeams();
    });

    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.getAttribute('data-filter');
            filterAndRenderTeams();
        });
    });

    viewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            viewBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentView = this.getAttribute('data-view');
            renderTeams(getFilteredTeams());
        });
    });

    if (retryBtn) {
        retryBtn.addEventListener('click', loadTeams);
    }

    // 모달 닫기
    closeDetailModal.addEventListener('click', () => {
        teamDetailModal.classList.remove('active');
    });

    closeDetailBtn.addEventListener('click', () => {
        teamDetailModal.classList.remove('active');
    });

    closeDeleteModal.addEventListener('click', () => {
        deleteConfirmModal.classList.remove('active');
    });

    cancelDeleteBtn.addEventListener('click', () => {
        deleteConfirmModal.classList.remove('active');
    });

    editTeamBtn.addEventListener('click', () => {
        if (selectedTeamIdx) {
            window.location.href = `/team/edit/${selectedTeamIdx}`;
        }
    });

    confirmDeleteBtn.addEventListener('click', () => {
        if (selectedTeamIdx) {
            deleteTeam(selectedTeamIdx);
        }
    });

    // 모달 배경 클릭 시 닫기
    teamDetailModal.addEventListener('click', (e) => {
        if (e.target === teamDetailModal) {
            teamDetailModal.classList.remove('active');
        }
    });

    deleteConfirmModal.addEventListener('click', (e) => {
        if (e.target === deleteConfirmModal) {
            deleteConfirmModal.classList.remove('active');
        }
    });

    // 팀 목록 로드
    async function loadTeams() {
        showLoading();

        try {
            const response = await fetch('/api/teams?active=Y');

            if (!response.ok) {
                throw new Error('팀 목록 로드 실패');
            }

            allTeams = await response.json();
            console.log('Loaded teams:', allTeams);

            filterAndRenderTeams();

        } catch (error) {
            console.error('팀 로드 중 오류:', error);
            showError();
        }
    }

    // 필터링된 팀 가져오기
    function getFilteredTeams() {
        let filtered = [...allTeams];

        // 필터 적용
        switch (currentFilter) {
            case 'my-created':
                filtered = filtered.filter(team => team.creatorIdx === currentUser.idx);
                break;
            case 'my-teams':
                filtered = filtered.filter(team =>
                    team.members && team.members.some(m => m.memberIdx === currentUser.idx)
                );
                break;
            case 'leader':
                filtered = filtered.filter(team => team.teamLeaderIdx === currentUser.idx);
                break;
        }

        // 검색어 적용
        const searchTerm = teamSearchInput.value.toLowerCase().trim();
        if (searchTerm) {
            filtered = filtered.filter(team =>
                team.teamName.toLowerCase().includes(searchTerm)
            );
        }

        return filtered;
    }

    // 필터링 및 렌더링
    function filterAndRenderTeams() {
        const filtered = getFilteredTeams();
        renderTeams(filtered);
    }

    // 팀 목록 렌더링
    function renderTeams(teams) {
        hideAllStates();

        if (teams.length === 0) {
            showEmpty();
            return;
        }

        teamCount.textContent = teams.length;

        if (currentView === 'grid') {
            renderGridView(teams);
            teamGrid.style.display = 'grid';
        } else {
            renderListView(teams);
            teamList.style.display = 'block';
        }
    }

    // 그리드 뷰 렌더링
    function renderGridView(teams) {
        teamGrid.innerHTML = teams.map(team => `
            <div class="team-card" data-team-idx="${team.idx}">
                <div class="team-card-header">
                    <div>
                        <h3 class="team-card-title">${team.teamName}</h3>
                        <span class="team-type-badge ${team.teamType}">${getTeamTypeLabel(team.teamType)}</span>
                    </div>
                    <span class="status-badge ${team.isActive === 'Y' ? 'active' : 'inactive'}">
                        ${team.isActive === 'Y' ? '활성' : '비활성'}
                    </span>
                </div>
                <p class="team-card-description">${team.teamDescription || '설명 없음'}</p>
                <div class="team-card-info">
                    <div class="team-info-item">
                        <i class="fas fa-crown"></i>
                        <span>리더: ${team.teamLeaderName || '미지정'}</span>
                    </div>
                    <div class="team-info-item">
                        <i class="fas fa-users"></i>
                        <span>멤버: ${team.memberCount || 0}명</span>
                    </div>
                    <div class="team-info-item">
                        <i class="fas fa-calendar"></i>
                        <span>${formatDate(team.createdAt)}</span>
                    </div>
                </div>
                <div class="team-card-footer">
                    <button class="btn btn-sm btn-secondary view-detail-btn" data-team-idx="${team.idx}">
                        <i class="fas fa-eye"></i> 상세보기
                    </button>
                    <div class="team-card-actions">
                        <button class="btn-icon edit-btn" data-team-idx="${team.idx}" title="수정">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon danger delete-btn" data-team-idx="${team.idx}" title="삭제">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        attachCardEventListeners();
    }

    // 리스트 뷰 렌더링
    function renderListView(teams) {
        if (teams.length === 0) {
            // 빈 행 표시 (클릭 가능)
            teamTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="8">
                        <i class="fas fa-users"></i> 팀을 추가해주세요
                    </td>
                </tr>
            `;

            // 빈 행 클릭 이벤트
            const emptyRow = teamTableBody.querySelector('.empty-row');
            emptyRow.addEventListener('click', function() {
                window.location.href = '/team/new';
            });
        } else {
            teamTableBody.innerHTML = teams.map((team, index) => `
                <tr data-team-idx="${team.idx}">
                    <td>${index + 1}</td>
                    <td class="team-name-cell view-detail-btn" data-team-idx="${team.idx}">${team.teamName}</td>
                    <td><span class="team-type-badge ${team.teamType}">${getTeamTypeLabel(team.teamType)}</span></td>
                    <td>${team.teamLeaderName || '미지정'}</td>
                    <td>${team.memberCount || 0}명</td>
                    <td>${formatDate(team.createdAt)}</td>
                    <td><span class="status-badge ${team.isActive === 'Y' ? 'active' : 'inactive'}">${team.isActive === 'Y' ? '활성' : '비활성'}</span></td>
                    <td>
                        <div class="team-table-actions">
                            <button class="btn-icon edit-btn" data-team-idx="${team.idx}" title="수정">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon danger delete-btn" data-team-idx="${team.idx}" title="삭제">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            attachCardEventListeners();
        }
    }

    // 카드 이벤트 리스너 부착
    function attachCardEventListeners() {
        // 카드 클릭 시 상세보기
        document.querySelectorAll('.team-card').forEach(card => {
            card.addEventListener('click', function(e) {
                const teamIdx = parseInt(this.getAttribute('data-team-idx'));
                showTeamDetail(teamIdx);
            });
        });

        // 상세보기 버튼 클릭 (카드 클릭과 동일하게 동작)
        document.querySelectorAll('.view-detail-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const teamIdx = parseInt(this.getAttribute('data-team-idx'));
                showTeamDetail(teamIdx);
            });
        });

        // 수정 버튼은 이벤트 전파 중지
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const teamIdx = parseInt(this.getAttribute('data-team-idx'));
                window.location.href = `/team/edit/${teamIdx}`;
            });
        });

        // 삭제 버튼은 이벤트 전파 중지
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const teamIdx = parseInt(this.getAttribute('data-team-idx'));
                showDeleteConfirm(teamIdx);
            });
        });
    }

    // 팀 상세 보기
    async function showTeamDetail(teamIdx) {
        try {
            const response = await fetch(`/api/teams/${teamIdx}`);

            if (!response.ok) {
                throw new Error('팀 상세 정보 로드 실패');
            }

            const team = await response.json();
            selectedTeamIdx = team.idx;

            // 모달에 데이터 채우기
            document.getElementById('modalTeamName').textContent = team.teamName;
            document.getElementById('detailTeamName').textContent = team.teamName;
            document.getElementById('detailTeamType').textContent = getTeamTypeLabel(team.teamType);
            document.getElementById('detailTeamLeader').textContent = team.teamLeaderName || '미지정';
            document.getElementById('detailCreator').textContent = team.creatorName || '알 수 없음';
            document.getElementById('detailCreatedAt').textContent = formatDateTime(team.createdAt);
            document.getElementById('detailStatus').textContent = team.isActive === 'Y' ? '활성' : '비활성';
            document.getElementById('detailDescription').textContent = team.teamDescription || '설명 없음';
            document.getElementById('detailMemberCount').textContent = team.memberCount || 0;

            // 멤버 목록 렌더링
            const memberList = document.getElementById('detailMemberList');
            if (team.members && team.members.length > 0) {
                memberList.innerHTML = team.members.map(member => `
                    <div class="member-item">
                        <div class="member-info">
                            <div class="member-avatar">${getInitial(member.memberName)}</div>
                            <div class="member-details">
                                <div class="member-name">${member.memberName}</div>
                                <div class="member-role">
                                    ${member.memberDeptName || '부서 미지정'} ·
                                    ${member.memberPositionName || '직급 미지정'}
                                    ${member.role ? ` · ${member.role}` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                memberList.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">팀원이 없습니다.</p>';
            }

            teamDetailModal.classList.add('active');

        } catch (error) {
            console.error('팀 상세 정보 로드 중 오류:', error);
            alert('팀 정보를 불러오는데 실패했습니다.');
        }
    }

    // 삭제 확인 모달 표시
    function showDeleteConfirm(teamIdx) {
        selectedTeamIdx = teamIdx;
        deleteConfirmModal.classList.add('active');
    }

    // 팀 삭제
    async function deleteTeam(teamIdx) {
        try {
            const response = await fetch(`/api/teams/${teamIdx}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('팀 삭제 실패');
            }

            deleteConfirmModal.classList.remove('active');
            selectedTeamIdx = null;

            // 목록 새로고침
            await loadTeams();

            alert('팀이 삭제되었습니다.');

        } catch (error) {
            console.error('팀 삭제 중 오류:', error);
            alert('팀 삭제에 실패했습니다.');
        }
    }

    // 상태 표시 함수들
    function showLoading() {
        hideAllStates();
        loadingState.style.display = 'block';
    }

    function showError() {
        hideAllStates();
        errorState.style.display = 'block';
    }

    function showEmpty() {
        hideAllStates();
        teamCount.textContent = '0';

        // 리스트 뷰인 경우 빈 테이블 표시, 그리드 뷰인 경우 빈 그리드 표시
        if (currentView === 'list') {
            teamList.style.display = 'block';
            renderListView([]);
        } else {
            teamGrid.style.display = 'grid';
            teamGrid.innerHTML = `
                <div class="empty-grid-message">
                    <i class="fas fa-users-slash"></i>
                    <p>등록된 팀이 없습니다.</p>
                    <p class="empty-grid-hint">클릭하여 팀 추가</p>
                </div>
            `;

            // 빈 그리드 클릭 이벤트
            const emptyMessage = teamGrid.querySelector('.empty-grid-message');
            emptyMessage.addEventListener('click', function() {
                window.location.href = '/team/new';
            });
        }
    }

    function hideAllStates() {
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
        teamGrid.style.display = 'none';
        teamList.style.display = 'none';
    }

    // 유틸리티 함수들
    function getTeamTypeLabel(type) {
        const labels = {
            'custom': '일반',
            'project': '프로젝트',
            'temporary': '임시'
        };
        return labels[type] || type;
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR');
    }

    function formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('ko-KR');
    }

    function getInitial(name) {
        if (!name) return '?';
        return name.charAt(0);
    }
});
