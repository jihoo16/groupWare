// 연구비카드 관리 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 검색 유틸리티 초기화
    const searchUtils = new SearchUtils();

    // DOM 요소
    const cardGrid = document.getElementById('cardGrid');
    const addCardBtn = document.getElementById('addCardBtn');
    const cardCompanyFilter = document.getElementById('cardCompanyFilter');
    const searchInput = document.getElementById('searchInput');
    const cardModal = document.getElementById('cardModal');
    const projectInfoModal = document.getElementById('projectInfoModal');

    let allCards = []; // 전체 카드 데이터
    let allProjects = []; // 전체 프로젝트 목록
    let editingCardIdx = null; // 수정 중인 카드 IDX
    let currentSearchKeyword = ''; // 현재 검색어 저장

    // 초기 데이터 로드
    loadAllCards();
    loadProjects();

    // 카드 등록 버튼 클릭
    if (addCardBtn) {
        addCardBtn.addEventListener('click', function() {
            openCardModal();
        });
    }

    // 카드사 필터 변경
    if (cardCompanyFilter) {
        cardCompanyFilter.addEventListener('change', function() {
            filterCards();
        });
    }

    // 검색 입력
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterCards();
        });
    }

    /**
     * 전체 연구비 카드 로드
     */
    async function loadAllCards() {
        try {
            const response = await fetch('/api/project-cards');
            if (!response.ok) {
                throw new Error('카드 목록 조회 실패');
            }

            allCards = await response.json();
            console.log('연구비 카드 로드 완료:', allCards.length + '건');
            renderCards(allCards);
        } catch (error) {
            console.error('연구비 카드 로드 오류:', error);
            cardGrid.style.display = 'block';
            cardGrid.innerHTML = '<div class="card-empty-state"><i class="fas fa-credit-card"></i><p>카드 목록을 불러오는데 실패했습니다.</p></div>';
        }
    }

    /**
     * 프로젝트 목록 로드
     */
    async function loadProjects() {
        try {
            const response = await fetch('/api/projects');
            if (!response.ok) {
                throw new Error('프로젝트 목록 조회 실패');
            }

            allProjects = await response.json();
            console.log('프로젝트 로드 완료:', allProjects.length + '건');
            populateProjectSelect();
        } catch (error) {
            console.error('프로젝트 로드 오류:', error);
        }
    }

    /**
     * 프로젝트 선택 드롭다운 채우기
     */
    function populateProjectSelect() {
        const projectSelect = document.getElementById('projectSelect');
        if (!projectSelect) return;

        projectSelect.innerHTML = '<option value="">선택하세요</option>';
        allProjects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.idx;
            option.textContent = project.projectName;
            projectSelect.appendChild(option);
        });
    }

    /**
     * 카드 그리드 렌더링
     */
    function renderCards(cards) {
        if (!cards || cards.length === 0) {
            cardGrid.style.display = 'block';
            cardGrid.innerHTML = '<div class="card-empty-state"><i class="fas fa-credit-card"></i><p>등록된 연구비 카드가 없습니다.</p></div>';
            return;
        }

        cardGrid.style.display = '';
        cardGrid.innerHTML = cards.map(card => {
            console.log(card)
            // 하이라이트 적용
            const cardCompany = currentSearchKeyword ?
                searchUtils.highlightText(card.cardCompany || '-', currentSearchKeyword) :
                (card.cardCompany || '-');

            const cardLastDigits = currentSearchKeyword ?
                searchUtils.highlightText(card.cardLastDigits || '****', currentSearchKeyword) :
                (card.cardLastDigits || '****');

            const projectName = currentSearchKeyword ?
                searchUtils.highlightText(card.projectName || '-', currentSearchKeyword) :
                (card.projectName || '-');

            const isProjectDeleted = card.projectDeleted === true;
            const deletedClass = isProjectDeleted ? ' project-deleted' : '';
            const deletedBadge = isProjectDeleted ? ' <span class="badge-deleted">삭제됨</span>' : '';

            return `
                <div class="research-card-item${deletedClass}"
                     data-idx="${card.idx}"
                     data-company="${card.cardCompany || ''}"
                     data-number="${card.cardLastDigits || ''}"
                     data-project="${card.projectName || ''}"
                     data-project-id="${card.projectIdx || ''}">
                    <div class="research-card-visual" onclick="showProjectInfo(${card.projectIdx})">
                        <div class="research-card-chip">
                            <i class="fas fa-microchip"></i>
                        </div>
                        <div class="research-card-company">${cardCompany}</div>
                        <div class="research-card-company">${card.cardName}</div>
                        <div class="research-card-number">**** **** **** ${cardLastDigits}</div>
                    </div>
                    <div class="research-card-info" onclick="showProjectInfo(${card.projectIdx})">
                        <div class="info-row">
                            <span class="info-label">연결 프로젝트</span>
                            <span class="info-value">${projectName}${deletedBadge}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">등록일</span>
                            <span class="info-value">${formatDate(card.createdAt)}</span>
                        </div>
                    </div>
                    <div class="research-card-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editCard(${card.idx})" ${isProjectDeleted ? 'disabled data-tip="삭제된 프로젝트의 카드는 수정할 수 없습니다"' : ''}>
                            <i class="fas fa-edit"></i> 수정
                        </button>
                        <button class="btn btn-sm btn-delete" onclick="deleteCard(${card.idx})">
                            <i class="fas fa-trash"></i> 삭제
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 카드 필터링
     */
    function filterCards() {
        const companyFilter = cardCompanyFilter ? cardCompanyFilter.value : '';
        const searchKeyword = searchInput ? searchInput.value.trim() : '';
        currentSearchKeyword = searchKeyword; // 검색어 저장

        const filtered = allCards.filter(card => {
            // 카드사 필터
            if (companyFilter && card.cardCompany !== companyFilter) {
                return false;
            }

            // 검색 필터 (초성 검색 지원)
            if (searchKeyword) {
                return searchUtils.matchesObject(
                    card,
                    searchKeyword,
                    ['cardLastDigits', 'projectName', 'cardNickname', 'cardCompany']
                );
            }

            return true;
        });

        renderCards(filtered);
    }

    /**
     * 카드 등록/수정 모달 열기
     */
    window.openCardModal = function(cardIdx = null) {
        editingCardIdx = cardIdx;
        const modalTitle = document.getElementById('modalTitle');

        // 폼 초기화
        document.getElementById('cardCompany').value = '';
        document.getElementById('cardNumber').value = '';
        document.getElementById('cardNickname').value = '';
        document.getElementById('projectSelect').value = '';

        if (cardIdx) {
            // 수정 모드
            modalTitle.textContent = '연구비카드 수정';
            const card = allCards.find(c => c.idx === cardIdx);
            if (card) {
                document.getElementById('cardCompany').value = card.cardCompany || '';
                document.getElementById('cardNumber').value = card.cardLastDigits || '';
                document.getElementById('cardNickname').value = card.cardNickname || '';
                document.getElementById('projectSelect').value = card.projectIdx || '';
            }
        } else {
            // 등록 모드
            modalTitle.textContent = '연구비카드 등록';
        }

        cardModal.classList.add('show');
    };

    /**
     * 카드 모달 닫기
     */
    window.closeCardModal = function() {
        cardModal.classList.remove('show');
        editingCardIdx = null;
    };

    /**
     * 카드 저장
     */
    window.saveCard = async function() {
        const cardCompany = document.getElementById('cardCompany').value;
        const cardNumber = document.getElementById('cardNumber').value;
        const projectIdx = document.getElementById('projectSelect').value;

        // 유효성 검사
        if (!cardCompany) {
            showWarning('카드사를 선택해주세요.');
            return;
        }
        if (!cardNumber || cardNumber.length !== 4 || !/^\d{4}$/.test(cardNumber)) {
            showWarning('카드 뒷 4자리를 정확히 입력해주세요.');
            return;
        }
        if (!projectIdx) {
            showWarning('연결 프로젝트를 선택해주세요.');
            return;
        }

        const cardNickname = document.getElementById('cardNickname').value.trim();

        const cardData = {
            cardCompany: cardCompany,
            cardLastDigits: cardNumber,
            cardNickname: cardNickname || null,
            projectIdx: parseInt(projectIdx)
        };

        try {
            let response;
            if (editingCardIdx) {
                // 수정
                response = await fetch(`/api/project-cards/${editingCardIdx}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cardData)
                });
            } else {
                // 등록
                response = await fetch('/api/project-cards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cardData)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '저장에 실패했습니다.');
            }

            await showSuccess(editingCardIdx ? '카드가 수정되었습니다.' : '카드가 등록되었습니다.');
            closeCardModal();
            loadAllCards(); // 목록 새로고침
        } catch (error) {
            console.error('[카드 저장]', error);
            showSaveFailure('카드 정보');
        }
    };

    /**
     * 카드 수정
     */
    window.editCard = function(cardIdx) {
        openCardModal(cardIdx);
    };

    /**
     * 카드 삭제
     */
    window.deleteCard = async function(cardIdx) {
        if (!await showDeleteConfirm('이 카드를 삭제하시겠습니까?')) {
            return;
        }

        try {
            const response = await fetch(`/api/project-cards/${cardIdx}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '삭제에 실패했습니다.');
            }

            await showSuccess('카드가 삭제되었습니다.');
            loadAllCards(); // 목록 새로고침
        } catch (error) {
            console.error('[카드 삭제]', error);
            showDeleteFailure('카드');
        }
    };

    /**
     * 프로젝트 정보 모달 표시
     */
    window.showProjectInfo = async function(projectIdx) {
        if (!projectIdx) {
            showWarning('연결된 프로젝트가 없습니다.');
            return;
        }

        // 삭제된 프로젝트인지 카드 데이터에서 먼저 확인
        const card = allCards.find(c => c.projectIdx === projectIdx);
        if (card && card.projectDeleted) {
            showWarning('삭제된 프로젝트입니다.');
            return;
        }

        try {
            const response = await fetch(`/api/projects/${projectIdx}`);
            if (!response.ok) {
                if (response.status === 404) {
                    showWarning('삭제된 프로젝트입니다.');
                    return;
                }
                throw new Error('프로젝트 조회 실패');
            }

            const project = await response.json();

            // 삭제된 프로젝트 체크 (API 응답에서도 확인)
            if (project.isDeleted) {
                showWarning('삭제된 프로젝트입니다.');
                return;
            }

            // 기본 정보 표시
            document.getElementById('infoProjectName').textContent = project.projectName || '-';
            document.getElementById('infoProjectStatus').textContent = getStatusLabel(project.projectStatus);
            document.getElementById('infoProjectManager').textContent = project.projectManagerName || '-';
            document.getElementById('infoProjectPeriod').textContent =
                (project.startDate || '-') + ' ~ ' + (project.endDate || '-');
            document.getElementById('infoProjectDescription').textContent = project.description || '설명이 없습니다.';

            // 참여연구원 표시
            const membersBody = document.getElementById('infoTeamMembers');
            if (project.projectMembers && project.projectMembers.length > 0) {
                membersBody.innerHTML = project.projectMembers.map(member => `
                    <tr>
                        <td>${member.employeeName || '-'}</td>
                        <td>${member.employeeDeptName || '-'}</td>
                        <td>${member.employeePositionName || '-'}</td>
                        <td>${member.participationStartDate || '-'}</td>
                        <td>${member.participationEndDate || '-'}</td>
                        <td><span class="status-badge status-active">참여중</span></td>
                    </tr>
                `).join('');
            } else {
                membersBody.innerHTML = '<tr><td colspan="6" class="text-center">참여연구원 정보가 없습니다.</td></tr>';
            }

            projectInfoModal.classList.add('show');
        } catch (error) {
            console.error('[프로젝트 정보 조회]', error);
            showLoadFailure('프로젝트 정보');
        }
    };

    /**
     * 프로젝트 정보 모달 닫기
     */
    window.closeProjectInfoModal = function() {
        projectInfoModal.classList.remove('show');
    };

    /**
     * 상태 라벨 변환
     */
    function getStatusLabel(status) {
        const statusMap = {
            'PLANNING': '기획',
            'IN_PROGRESS': '진행중',
            'COMPLETED': '완료',
            'ON_HOLD': '보류',
            'CANCELLED': '취소'
        };
        return statusMap[status] || status || '-';
    }

    /**
     * 날짜 포맷
     */
    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', function(e) {
        if (e.target === cardModal) {
            closeCardModal();
        }
        if (e.target === projectInfoModal) {
            closeProjectInfoModal();
        }
    });
});
