// 연구비 증빙 - 회의록 페이지 JavaScript
document.addEventListener('DOMContentLoaded', async function() {
    // 전역 변수
    let selectedFiles = [];
    let currentUser = null; // 현재 로그인한 사용자
    let projects = []; // 프로젝트 목록
    let projectMembers = []; // 선택된 프로젝트의 팀원 목록
    let currentAttendees = []; // 현재 추가된 참석자 목록 (전역으로 이동)
    let fixedExpenses = {}; // 기초정보관리의 직급별 고정경비 (회의비)
    let selectedProject = null; // 선택된 프로젝트
    let shouldOpenCardModalAfterProject = false; // 과제 선택 후 카드 모달 자동 열기 플래그

    // DOM 요소
    const templateTreeHeaders = document.querySelectorAll('.tree-node-header[data-template]');
    const documentForm = document.getElementById('documentForm');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const saveBtn = document.getElementById('saveBtn');

    // 현재 사용자 정보 로드
    async function loadCurrentUser() {
        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                currentUser = await response.json();
            } else {
                console.error('사용자 정보 로드 실패');
            }
        } catch (error) {
            console.error('사용자 정보 로드 오류:', error);
        }
    }

    // 프로젝트 목록 로드
    async function loadProjects() {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                projects = await response.json();
            } else {
                console.error('프로젝트 목록 로드 실패');
            }
        } catch (error) {
            console.error('프로젝트 목록 로드 오류:', error);
        }
    }

    // 기초정보관리에서 직급별 고정경비 로드
    async function loadFixedExpenses() {
        try {
            const response = await fetch('/api/fixed-expense-policies');
            if (response.ok) {
                const data = await response.json();
                // 직급별로 회의비 매핑
                fixedExpenses = {};
                data.forEach(item => {
                    // expenseItemName이 '회의비'인 항목만 필터링
                    if (item.positionName && item.expenseItemName === '회의비' && item.amount) {
                        fixedExpenses[item.positionName] = item.amount;
                    }
                });
            } else {
                console.error('직급별 고정경비 로드 실패:', response.status);
            }
        } catch (error) {
            console.error('직급별 고정경비 로드 오류:', error);
        }
    }

    // 프로젝트 팀원 목록 로드
    async function loadProjectMembers(projectIdx) {
        if (!projectIdx) {
            projectMembers = [];
            return;
        }

        try {
            const response = await fetch(`/api/projects/${projectIdx}`);

            // Content-Type 확인
            const contentType = response.headers.get('content-type');

            if (response.ok && contentType && contentType.includes('application/json')) {
                const project = await response.json();
                projectMembers = project.projectMembers || [];
            } else {
                console.error('프로젝트 팀원 로드 실패 - Status:', response.status, 'Content-Type:', contentType);
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    console.error('응답 내용 (처음 200자):', text.substring(0, 200));
                }
                projectMembers = [];
            }
        } catch (error) {
            console.error('프로젝트 팀원 로드 오류:', error);
            projectMembers = [];
        }
    }

    // 페이지 로드 시 데이터 로드
    Promise.all([loadCurrentUser(), loadProjects(), loadFixedExpenses()]).then(() => {
        // 데이터 로드 후 회의록 자동 채우기 초기화
        setupReceiptAutoFill();

        // 초기화 완료 후 과제명이 비어있을 때 빨간색 테두리 표시
        setTimeout(() => {
            const commonProject = document.getElementById('common_project');
            if (commonProject && !commonProject.value) {
                commonProject.classList.add('error');
            }
        }, 100);
    });

    // ============================================
    // 템플릿 사이드바 접기/펼치기 기능
    // ============================================

    // 전체 접기/펼치기 버튼
    const toggleAllBtn = document.getElementById('toggleAllBtn');
    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', function() {
            const categories = document.querySelectorAll('.menu-category');
            const allExpanded = Array.from(categories).every(cat => cat.classList.contains('expanded'));

            categories.forEach(category => {
                if (allExpanded) {
                    category.classList.remove('expanded');
                } else {
                    category.classList.add('expanded');
                }
            });

            // 버튼 아이콘 변경
            const icon = this.querySelector('i');
            if (allExpanded) {
                icon.className = 'fas fa-chevron-up';
            } else {
                icon.className = 'fas fa-chevron-down';
            }
        });
    }

    // 각 카테고리 헤더 클릭 시 토글
    const categoryHeaders = document.querySelectorAll('.category-header');
    categoryHeaders.forEach(header => {
        header.addEventListener('click', function(e) {
            // 링크 클릭 방지
            e.preventDefault();

            const category = this.closest('.menu-category');
            category.classList.toggle('expanded');

            // 전체 버튼 상태 업데이트
            updateToggleAllButton();
        });
    });

    // 전체 버튼 상태 업데이트
    function updateToggleAllButton() {
        if (!toggleAllBtn) return;

        const categories = document.querySelectorAll('.menu-category');
        const allExpanded = Array.from(categories).every(cat => cat.classList.contains('expanded'));
        const allCollapsed = Array.from(categories).every(cat => !cat.classList.contains('expanded'));

        const icon = toggleAllBtn.querySelector('i');
        if (allCollapsed) {
            icon.className = 'fas fa-chevron-up';
        } else if (allExpanded) {
            icon.className = 'fas fa-chevron-down';
        }
    }

    // 회의록 자동 채우기 기능
    function setupReceiptAutoFill() {
        const commonProject = document.getElementById('common_project');
        const commonAuthor = document.getElementById('common_author'); // 작성자 필드
        const commonDate = document.getElementById('common_date');
        const commonStartTime = document.getElementById('common_start_time');
        const commonEndTime = document.getElementById('common_end_time');
        const commonLocation = document.getElementById('common_location');
        const commonAmount = document.getElementById('common_amount');
        const attendeeArea = document.getElementById('attendeeArea');
        const attendeeList = document.getElementById('attendeeList');

        // 로컬 변수 대신 전역 currentAttendees 사용

        // 프로젝트 선택 (클릭 시 모달 열기)
        if (commonProject) {
            commonProject.addEventListener('click', function() {
                openProjectModal();
            });
        }

        // ============================================
        // 프로젝트 선택 모달
        // ============================================
        const projectModal = document.getElementById('projectModal');
        const projectSearch = document.getElementById('projectSearch');
        const projectList = document.getElementById('projectList');

        // 초성 검색 유틸리티
        const CHO_HANGUL = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

        function getChosung(str) {
            let result = '';
            for (let i = 0; i < str.length; i++) {
                const code = str.charCodeAt(i) - 44032;
                if (code > -1 && code < 11172) {
                    result += CHO_HANGUL[Math.floor(code / 588)];
                } else {
                    result += str.charAt(i);
                }
            }
            return result;
        }

        function matchesSearch(text, keyword) {
            if (!text || !keyword) return true;
            const lowerText = text.toLowerCase();
            const lowerKeyword = keyword.toLowerCase();
            if (lowerText.includes(lowerKeyword)) return true;
            const chosung = getChosung(text);
            return chosung.includes(keyword);
        }

        function highlightText(text, keyword) {
            if (!text || !keyword) return text;
            const lowerText = text.toLowerCase();
            const lowerKeyword = keyword.toLowerCase();
            if (lowerText.includes(lowerKeyword)) {
                const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                return text.replace(regex, '<mark class="search-highlight">$1</mark>');
            }
            const chosung = getChosung(text);
            if (chosung.includes(keyword)) {
                let result = '';
                let keywordIndex = 0;
                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    const code = text.charCodeAt(i) - 44032;
                    if (code > -1 && code < 11172) {
                        const cho = CHO_HANGUL[Math.floor(code / 588)];
                        if (keywordIndex < keyword.length && cho === keyword[keywordIndex]) {
                            result += `<mark class="search-highlight">${char}</mark>`;
                            keywordIndex++;
                        } else {
                            result += char;
                        }
                    } else {
                        result += char;
                    }
                }
                return result;
            }
            return text;
        }

        // 프로젝트 목록 렌더링
        function renderProjectList(list, keyword = '') {
            if (!projectList) return;
            projectList.innerHTML = '';

            if (list.length === 0) {
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'modal-empty-state';
                emptyMessage.innerHTML = `
                    <i class="fas fa-folder-open"></i>
                    <p>${keyword ? '검색 결과가 없습니다' : '등록된 프로젝트가 없습니다'}</p>
                `;
                projectList.appendChild(emptyMessage);
                return;
            }

            list.forEach(proj => {
                const item = document.createElement('div');
                item.className = 'modal-item';
                if (selectedProject && selectedProject.idx === proj.idx) {
                    item.classList.add('selected');
                }

                const highlightedName = highlightText(proj.projectName, keyword);
                const highlightedDesc = highlightText(proj.description || '설명 없음', keyword);

                item.innerHTML = `
                    <i class="fas fa-folder"></i>
                    <div class="modal-item-info">
                        <div class="modal-item-name">${highlightedName}</div>
                        <div class="modal-item-detail">${highlightedDesc}</div>
                    </div>
                `;

                item.addEventListener('click', async function() {
                    selectedProject = proj;

                    // 프로젝트 입력 필드에 표시
                    if (commonProject) {
                        commonProject.value = proj.projectName;
                        commonProject.classList.remove('error'); // 빨간색 제거
                    }
                    const selectedProjectIdx = document.getElementById('selectedProjectIdx');
                    if (selectedProjectIdx) {
                        selectedProjectIdx.value = proj.idx;
                    }

                    // 자동 채우기
                    document.querySelectorAll('.auto-project').forEach(field => {
                        field.value = proj.projectName;
                    });

                    // 프로젝트 팀원 로드
                    if (proj.idx) {
                        await loadProjectMembers(proj.idx);
                        // 기본 작성자 설정 (낮은 직급에서 4번째)
                        setDefaultAuthor();

                        // 프로젝트 카드 목록 로드
                        await loadProjectCards(proj.idx);

                        // 카드 자동 선택 (0번째 인덱스)
                        const commonCard = document.getElementById('common_card');
                        const selectedCardIdx = document.getElementById('selectedCardIdx');

                        if (projectCards && projectCards.length > 0) {
                            // 카드가 있으면 첫 번째 카드 자동 선택
                            const firstCard = projectCards[0];
                            selectedCard = firstCard;

                            if (commonCard) {
                                commonCard.value = firstCard.cardName;
                            }
                            if (selectedCardIdx) {
                                selectedCardIdx.value = firstCard.idx;
                            }

                            console.log('첫 번째 카드 자동 선택:', firstCard.cardName);
                        } else {
                            // 카드가 없으면 비우기
                            if (commonCard) {
                                commonCard.placeholder = '클릭하여 카드 선택';
                                commonCard.value = '';
                            }
                            if (selectedCardIdx) {
                                selectedCardIdx.value = '';
                            }
                            selectedCard = null;
                        }
                    } else {
                        projectMembers = [];
                        projectCards = [];
                    }

                    closeProjectModal();

                    // 카드 모달을 열어야 하는 경우, 프로젝트 모달 닫은 후 카드 모달 열기
                    if (shouldOpenCardModalAfterProject) {
                        shouldOpenCardModalAfterProject = false;
                        setTimeout(() => {
                            openCardModal();
                        }, 100); // 모달 전환 애니메이션을 위한 약간의 지연
                    }
                });

                projectList.appendChild(item);
            });
        }

        // 프로젝트 검색
        if (projectSearch) {
            projectSearch.addEventListener('input', function() {
                const keyword = this.value.trim();
                const filtered = projects.filter(proj =>
                    matchesSearch(proj.projectName, keyword) ||
                    matchesSearch(proj.description, keyword)
                );
                renderProjectList(filtered, keyword);
            });
        }

        window.openProjectModal = function() {
            if (projectModal) {
                projectModal.classList.add('show');
                renderProjectList(projects);
                if (projectSearch) projectSearch.value = '';
            }
        };

        window.closeProjectModal = function() {
            if (projectModal) {
                projectModal.classList.remove('show');
                if (projectSearch) projectSearch.value = '';
                // 카드 모달 자동 열기 플래그 리셋
                shouldOpenCardModalAfterProject = false;
            }
        };

        // 모달 외부 클릭 시 닫기
        if (projectModal) {
            projectModal.addEventListener('click', function(e) {
                if (e.target === projectModal) {
                    closeProjectModal();
                }
            });
        }

        // ============================================
        // 카드 선택 모달
        // ============================================
        const cardModal = document.getElementById('cardModal');
        const cardSearch = document.getElementById('cardSearch');
        const cardList = document.getElementById('cardList');
        let projectCards = []; // 선택된 프로젝트의 카드 목록
        let selectedCard = null; // 선택된 카드

        // 카드 목록 로드 (프로젝트별)
        async function loadProjectCards(projectIdx) {
            try {
                const response = await fetch(`/api/projects/${projectIdx}/cards`);
                if (response.ok) {
                    projectCards = await response.json();
                } else {
                    console.error('카드 목록 로드 실패:', response.status);
                    projectCards = [];
                }
            } catch (error) {
                console.error('카드 목록 로드 오류:', error);
                projectCards = [];
            }
        }

        // 전역으로 노출 (다른 함수에서 접근 가능하도록)
        window.loadProjectCards = loadProjectCards;

        // 카드 목록 렌더링
        function renderCardList(list, keyword = '') {
            if (!cardList) return;
            cardList.innerHTML = '';

            if (list.length === 0) {
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'modal-empty-state';
                emptyMessage.innerHTML = `
                    <i class="fas fa-credit-card"></i>
                    <p>${keyword ? '검색 결과가 없습니다' : '등록된 카드가 없습니다'}</p>
                `;
                cardList.appendChild(emptyMessage);
                return;
            }

            list.forEach(card => {
                const item = document.createElement('div');
                item.className = 'modal-item';
                if (selectedCard && selectedCard.idx === card.idx) {
                    item.classList.add('selected');
                }

                const highlightedName = highlightText(card.cardName, keyword);
                const highlightedNumber = highlightText(card.cardNumber || '카드번호 없음', keyword);

                item.innerHTML = `
                    <i class="fas fa-credit-card"></i>
                    <div class="modal-item-info">
                        <div class="modal-item-name">${highlightedName}</div>
                        <div class="modal-item-detail">${highlightedNumber}</div>
                    </div>
                `;

                item.addEventListener('click', function() {
                    selectedCard = card;

                    // 카드 입력 필드에 표시
                    const commonCard = document.getElementById('common_card');
                    if (commonCard) {
                        commonCard.value = card.cardName;
                    }
                    const selectedCardIdx = document.getElementById('selectedCardIdx');
                    if (selectedCardIdx) {
                        selectedCardIdx.value = card.idx;
                    }

                    closeCardModal();
                });

                cardList.appendChild(item);
            });
        }

        // 카드 검색
        if (cardSearch) {
            cardSearch.addEventListener('input', function() {
                const keyword = this.value.trim();
                const projectIdxInput = document.getElementById('selectedProjectIdx');

                if (!projectIdxInput || !projectIdxInput.value) {
                    // 프로젝트가 선택되지 않았을 때는 프로젝트 목록에서 검색
                    renderProjectListInCardModal(keyword);
                } else {
                    // 프로젝트가 선택되었을 때는 카드 목록에서 검색
                    const filtered = projectCards.filter(card =>
                        matchesSearch(card.cardName, keyword) ||
                        matchesSearch(card.cardNumber || '', keyword)
                    );
                    renderCardList(filtered, keyword);
                }
            });
        }

        // 카드 모달에서 프로젝트 목록 렌더링
        function renderProjectListInCardModal(searchText = '') {
            if (!cardList) return;

            // 검색 필터링
            let filtered = projects;
            if (searchText) {
                filtered = projects.filter(proj =>
                    matchesSearch(proj.projectName + (proj.description || ''), searchText)
                );
            }

            if (filtered.length === 0) {
                cardList.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #94a3b8;">
                        <i class="fas fa-search" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                        ${searchText ? '검색 결과가 없습니다.' : '등록된 프로젝트가 없습니다.'}
                    </div>
                `;
                return;
            }

            // 헤더 메시지
            const headerMessage = `
                <div class="convenience-notice">
                    <div class="notice-icon">
                        <i class="fas fa-lightbulb"></i>
                    </div>
                    <div class="notice-content">
                        <div class="notice-title">프로젝트를 먼저 선택해주세요</div>
                        <div class="notice-desc">프로젝트를 선택하면 카드 목록이 표시됩니다</div>
                    </div>
                </div>
            `;

            // 프로젝트 목록
            const projectItems = filtered.map(proj => {
                const highlightedName = highlightText(proj.projectName, searchText);

                return `
                    <div class="project-item-in-attendee" data-project-idx="${proj.idx}">
                        <div class="project-item-icon">
                            <i class="fas fa-folder"></i>
                        </div>
                        <div class="project-item-info">
                            <div class="project-item-name">${highlightedName}</div>
                        </div>
                        <div class="project-item-arrow">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>
                `;
            }).join('');

            cardList.innerHTML = headerMessage + projectItems;

            // 프로젝트 클릭 이벤트
            cardList.querySelectorAll('.project-item-in-attendee').forEach(item => {
                item.addEventListener('click', async function() {
                    const projectIdx = this.getAttribute('data-project-idx');
                    const proj = projects.find(p => String(p.idx) === String(projectIdx));
                    if (!proj) return;

                    // 프로젝트 선택
                    selectedProject = proj;

                    // 프로젝트 입력 필드에 표시
                    const commonProject = document.getElementById('common_project');
                    if (commonProject) {
                        commonProject.value = proj.projectName;
                    }
                    const selectedProjectIdx = document.getElementById('selectedProjectIdx');
                    if (selectedProjectIdx) {
                        selectedProjectIdx.value = proj.idx;
                    }

                    // 자동 채우기
                    document.querySelectorAll('.auto-project').forEach(field => {
                        field.value = proj.projectName;
                    });

                    // 프로젝트 팀원 로드
                    await loadProjectMembers(proj.idx);
                    // 기본 작성자 설정
                    setDefaultAuthor();

                    // 카드 목록 로드 및 표시
                    await loadProjectCards(proj.idx);
                    renderCardList(projectCards);
                    if (cardSearch) cardSearch.value = '';
                });
            });
        }

        window.openCardModal = function() {
            const projectIdxInput = document.getElementById('selectedProjectIdx');

            if (cardModal) {
                cardModal.classList.add('show');

                if (!projectIdxInput || !projectIdxInput.value) {
                    // 프로젝트가 선택되지 않았을 때 프로젝트 목록 표시
                    renderProjectListInCardModal('');
                    if (cardSearch) cardSearch.value = '';
                } else {
                    // 프로젝트가 선택되었을 때 카드 목록 표시
                    renderCardList(projectCards);
                    if (cardSearch) cardSearch.value = '';
                }
            }
        };

        window.closeCardModal = function() {
            if (cardModal) {
                cardModal.classList.remove('show');
                if (cardSearch) cardSearch.value = '';
            }
        };

        // 모달 외부 클릭 시 닫기
        if (cardModal) {
            cardModal.addEventListener('click', function(e) {
                if (e.target === cardModal) {
                    closeCardModal();
                }
            });
        }

        // 작성자 필드 변경 시 인쇄용 템플릿 업데이트
        if (commonAuthor) {
            commonAuthor.addEventListener('input', function() {
                const authorText = this.value || '작성자 미지정';
                document.querySelectorAll('.auto-author').forEach(field => {
                    field.value = authorText;
                    if (authorText === '작성자 미지정') {
                        field.style.color = '#d32f2f';
                    } else {
                        field.style.color = '';
                    }
                });
            });
        }

        // 회의록 참석자 정보 업데이트
        function updateMeetingMinutesAttendees() {
            // 참석자 정렬 (내부 직급순 -> 외부 회사순/직급순)
            const sortedAttendees = sortAttendees(currentAttendees.filter(a => a.name && a.name.trim()));

            // 내부/외부 참석자 구분
            const internalAttendees = sortedAttendees.filter(a => a.type === 'internal');
            const externalAttendees = sortedAttendees.filter(a => a.type === 'external');

            let allAttendeesText = '';

            // 내부 참석자
            if (internalAttendees.length > 0) {
                const names = internalAttendees.map(a => a.name.trim());
                allAttendeesText = names.join(', ') + '(파인씨앤아이)';
            }

            // 외부 참석자
            if (externalAttendees.length > 0) {
                const externalTexts = externalAttendees.map(a => `${a.name.trim()}(${a.dept || '외부'})`);
                if (allAttendeesText) {
                    allAttendeesText += ', ' + externalTexts.join(', ');
                } else {
                    allAttendeesText = externalTexts.join(', ');
                }
            }

            document.querySelectorAll('.auto-all-attendees').forEach(field => {
                field.textContent = allAttendeesText;
            });

            // 참석자 명단 테이블 업데이트 (정렬된 순서대로)
            const nameFields = document.querySelectorAll('.attendee-sig-name');
            const deptFields = document.querySelectorAll('.attendee-sig-dept');

            nameFields.forEach(field => field.value = '');
            deptFields.forEach(field => field.value = '');

            sortedAttendees.forEach((attendee, idx) => {
                if (nameFields[idx]) {
                    nameFields[idx].value = attendee.name;
                }
                if (deptFields[idx]) {
                    // 외부인력은 회사명, 내부는 파인씨앤아이
                    deptFields[idx].value = attendee.type === 'internal' ? '파인씨앤아이' : attendee.dept;
                }
            });
        }

        // 회의 품의서 참석인원 업데이트
        function updateProposalAttendees() {
            const meetingPurposeRow = document.getElementById('meeting_purpose_row');
            if (!meetingPurposeRow) return;

            const meetingPurposeCell = document.querySelector('.meeting-purpose-cell');
            const meetingPurposeHeader = document.getElementById('meeting_purpose_header');

            const existingRows = document.querySelectorAll('.attendee-row');
            existingRows.forEach(row => row.remove());

            // 참석자 정렬
            const sortedAttendees = sortAttendees(currentAttendees);

            const grouped = {};
            sortedAttendees.forEach(attendee => {
                // 내부/외부 구분
                const type = attendee.type === 'internal' ? '내부' : '외부';
                const dept = attendee.type === 'internal' ? '파인씨앤아이' : attendee.dept;

                const key = `${type}_${dept}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        type: type,
                        dept: dept,
                        names: []
                    };
                }
                if (attendee.name) {
                    grouped[key].names.push(attendee.name);
                }
            });

            const groupedArray = Object.values(grouped);
            const minRows = 2;
            const rowsToAdd = Math.max(groupedArray.length, minRows);

            const totalRowspan = rowsToAdd + 1;
            if (meetingPurposeCell) {
                meetingPurposeCell.setAttribute('rowspan', totalRowspan);
            }
            if (meetingPurposeHeader) {
                meetingPurposeHeader.setAttribute('rowspan', totalRowspan);
            }

            let insertAfter = meetingPurposeRow;
            for (let i = 0; i < rowsToAdd; i++) {
                const row = document.createElement('tr');
                row.className = 'attendee-row';

                if (i < groupedArray.length) {
                    const group = groupedArray[i];
                    let nameDisplay = '';

                    if (group.names.length > 0) {
                        nameDisplay = group.names[0];
                        if (group.names.length > 1) {
                            nameDisplay += ` 외${group.names.length - 1}명`;
                        }
                    }

                    row.innerHTML = `
                        <td style="border: 1px solid #ddd; padding: 5px; text-align: center;">
                            <span>${group.type}</span>
                        </td>
                        <td style="border: 1px solid #ddd; padding: 5px; text-align: center;"><span>${group.dept || ''}</span></td>
                        <td style="border: 1px solid #ddd; padding: 5px; text-align: center;"><span>${nameDisplay}</span></td>
                    `;
                } else {
                    row.innerHTML = `
                        <td style="border: 1px solid #ddd; padding: 5px;">&nbsp;</td>
                        <td style="border: 1px solid #ddd; padding: 5px;">&nbsp;</td>
                        <td style="border: 1px solid #ddd; padding: 5px;">&nbsp;</td>
                    `;
                }

                insertAfter.parentNode.insertBefore(row, insertAfter.nextSibling);
                insertAfter = row;
            }
        }

        // 참석자 영역 클릭 시 모달 열기
        if (attendeeArea) {
            attendeeArea.addEventListener('click', function(e) {
                // 삭제 버튼 클릭은 무시
                if (e.target.closest('.attendee-remove')) {
                    return;
                }

                // 참석자 추가 버튼 클릭은 무시 (버튼 자체의 onclick이 실행됨)
                if (e.target.closest('.add-more-attendees-btn')) {
                    return;
                }

                // 참석자가 이미 있을 때는 area 클릭해도 모달 안 열림
                if (currentAttendees.length > 0) {
                    return;
                }

                // 참석자가 없을 때만 area 클릭으로 모달 열기
                openAttendeeModal();
            });
        }

        // 참석자 정렬 함수
        function sortAttendees(attendees) {
            return [...attendees].sort((a, b) => {
                // 1. 내부/외부 구분 (내부가 먼저)
                if (a.type === 'internal' && b.type === 'external') return -1;
                if (a.type === 'external' && b.type === 'internal') return 1;

                // 2. 내부 참석자끼리는 직급순 (낮은 직급부터)
                if (a.type === 'internal' && b.type === 'internal') {
                    const orderA = positionOrder[a.position] || 999;
                    const orderB = positionOrder[b.position] || 999;
                    return orderA - orderB;
                }

                // 3. 외부 참석자끼리는 회사명 가나다순, 같은 회사면 직급순
                if (a.type === 'external' && b.type === 'external') {
                    const deptA = a.dept || '';
                    const deptB = b.dept || '';

                    // 회사명 비교
                    if (deptA !== deptB) {
                        return deptA.localeCompare(deptB, 'ko');
                    }

                    // 같은 회사면 직급순
                    const orderA = positionOrder[a.position] || 999;
                    const orderB = positionOrder[b.position] || 999;
                    return orderA - orderB;
                }

                return 0;
            });
        }

        // 참석자 목록 렌더링 함수 (모달 방식)
        function renderAttendeeListInTemplate() {
            if (!attendeeList) return;

            if (currentAttendees.length === 0) {
                attendeeList.innerHTML = `
                    <div class="empty-attendee-state">
                        <i class="fas fa-user-plus"></i>
                        <div>클릭하여 참석자 추가</div>
                    </div>
                `;
                // 참석자가 없을 때 has-attendees 클래스 제거
                if (attendeeArea) {
                    attendeeArea.classList.remove('has-attendees');
                }
                // 버튼 숨기기
                hideAddAttendeeButton();
            } else {
                // 참석자 정렬
                const sortedAttendees = sortAttendees(currentAttendees);

                attendeeList.innerHTML = sortedAttendees.map(attendee => {
                    // 금액 포맷팅
                    const formattedExpense = attendee.meetingExpense
                        ? attendee.meetingExpense.toLocaleString('ko-KR') + '원'
                        : '-';

                    // 외부 참석자 뱃지
                    const externalBadge = attendee.type === 'external'
                        ? '<span class="external-badge">외부</span>'
                        : '';

                    return `
                        <div class="trip-person-item ${attendee.type === 'external' ? 'external-attendee' : ''}" onclick="removeAttendeeInTemplate('${attendee.id}')">
                            <div class="trip-person-info">
                                <span class="name">${attendee.name}${externalBadge}</span>
                                <span>${attendee.dept}</span>
                                <span>${attendee.position}</span>
                                <span style="color: #667eea; font-weight: 600;">${formattedExpense}</span>
                            </div>
                            <button type="button" class="trip-person-remove attendee-remove">
                                <i class="fas fa-times"></i> 삭제
                            </button>
                        </div>
                    `;
                }).join('');

                // 참석자가 있을 때 has-attendees 클래스 추가
                if (attendeeArea) {
                    attendeeArea.classList.add('has-attendees');
                }
                // 버튼 표시
                showAddAttendeeButton();
            }

            updateProposalAttendees();
            updateMeetingMinutesAttendees();
            updateAttendeeTotalAmount(); // 참석자 금액 합계 업데이트
        }

        // 참석자 추가 버튼 표시 함수
        function showAddAttendeeButton() {
            if (!attendeeArea) return;

            let addButton = attendeeArea.querySelector('.add-more-attendees-btn');
            if (!addButton) {
                addButton = document.createElement('button');
                addButton.type = 'button';
                addButton.className = 'add-more-attendees-btn';
                addButton.onclick = openAttendeeModal;
                addButton.innerHTML = '<i class="fas fa-user-plus"></i> 참석자 추가';
                attendeeArea.appendChild(addButton);
            }
            addButton.style.display = 'flex';
        }

        // 참석자 추가 버튼 숨기기 함수
        function hideAddAttendeeButton() {
            if (!attendeeArea) return;

            const addButton = attendeeArea.querySelector('.add-more-attendees-btn');
            if (addButton) {
                addButton.style.display = 'none';
            }
        }

        // 전역으로 등록 (모달에서 접근 가능하도록)
        window.renderAttendeeListInTemplate = renderAttendeeListInTemplate;

        // 참석자 금액 합계 계산 및 표시
        function updateAttendeeTotalAmount() {
            const totalAmountEl = document.getElementById('attendeeTotalAmount');
            const commonAmountInput = document.getElementById('common_amount');

            if (!totalAmountEl) return;

            // 참석자 회의비 합계 계산
            const totalAmount = currentAttendees.reduce((sum, attendee) => {
                return sum + (attendee.meetingExpense || 0);
            }, 0);

            // 사용 금액 가져오기 (콤마 제거 후 파싱)
            const commonAmount = commonAmountInput ? parseInt(commonAmountInput.value.replace(/,/g, '')) || 0 : 0;

            // 금액 포맷팅
            const formattedTotal = totalAmount.toLocaleString('ko-KR') + '원';

            // 합계 표시 및 색상 설정
            totalAmountEl.textContent = formattedTotal;

            // 참석자 금액 합계 아래 경고 메시지 요소 찾기 또는 생성
            let amountWarningEl = document.getElementById('amountInputWarning');
            if (!amountWarningEl) {
                amountWarningEl = document.createElement('div');
                amountWarningEl.id = 'amountInputWarning';
                amountWarningEl.style.fontSize = '13px';
                amountWarningEl.style.marginTop = '6px';
                amountWarningEl.style.display = 'none';

                // 참석자 금액 합계 아래에 삽입
                const totalAmountDisplay = totalAmountEl.parentNode;
                if (totalAmountDisplay && totalAmountDisplay.parentNode) {
                    totalAmountDisplay.parentNode.insertBefore(amountWarningEl, totalAmountDisplay.nextSibling);
                }
            }

            // 색상 및 스타일 적용
            if (totalAmount < commonAmount) {
                // 합계가 사용 금액보다 적으면 빨간색
                totalAmountEl.style.color = '#dc2626';
                totalAmountEl.style.fontWeight = 'bold';

                // 사용 금액 입력란에 빨간색 테두리 표시
                if (commonAmountInput) {
                    commonAmountInput.style.borderColor = '#dc2626';
                    commonAmountInput.style.borderWidth = '2px';
                }

                // 참석자 금액 합계 아래 경고 메시지 표시
                if (amountWarningEl) {
                    amountWarningEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> 참석자를 추가해야 합니다';
                    amountWarningEl.style.color = '#dc2626';
                    amountWarningEl.style.fontWeight = '600';
                    amountWarningEl.style.display = 'block';
                }
            } else {
                // 합계가 사용 금액과 같거나 크면 초록색
                totalAmountEl.style.color = '#16a34a';
                totalAmountEl.style.fontWeight = 'bold';

                // 사용 금액 입력란 스타일 원상복구
                if (commonAmountInput) {
                    commonAmountInput.style.borderColor = '';
                    commonAmountInput.style.borderWidth = '';
                }

                // 경고 메시지 숨김
                if (amountWarningEl) {
                    amountWarningEl.style.display = 'none';
                }
            }

            // 집행 예정 금액 업데이트 (참석자 금액 합계 그대로)
            const formattedAmount = totalAmount.toLocaleString('ko-KR') + '원';
            document.querySelectorAll('.auto-amount-display, .auto-amount-display-2').forEach(field => {
                field.textContent = formattedAmount;
            });
        }

        // 전역으로 등록 (금액 버튼에서 접근 가능하도록)
        window.updateAttendeeTotalAmount = updateAttendeeTotalAmount;

        // 템플릿 내에서 참석자 제거
        window.removeAttendeeInTemplate = function(attendeeId) {
            currentAttendees = currentAttendees.filter(a => a.id !== attendeeId);
            renderAttendeeListInTemplate();

            // 모달이 열려있으면 모달도 업데이트
            const attendeeModal = document.getElementById('attendeeModal');
            if (attendeeModal && attendeeModal.classList.contains('show')) {
                renderInternalList(internalSearchInput ? internalSearchInput.value : '');
                renderExternalList(externalSearchInput ? externalSearchInput.value : '');
            }
        };

        // 전역 함수로 등록하여 모달에서 접근 가능하게
        window.addAttendeesToMeeting = function(persons) {
            persons.forEach(person => {
                if (!currentAttendees.some(a => a.id === person.id)) {
                    currentAttendees.push(person);
                }
            });
            renderAttendeeListInTemplate();
        };

        // 과제명 자동 채우기는 위 프로젝트 선택 시 처리됨

        // 날짜/시간 자동 채우기
        function updateDateTime() {
            const dateValue = commonDate ? commonDate.value : '';
            const startTimeValue = commonStartTime ? commonStartTime.value : '';
            const endTimeValue = commonEndTime ? commonEndTime.value : '';

            if (dateValue) {
                const [year, month, day] = dateValue.split('-');
                let formattedDate = `${year}.${month}.${day}.`;
                let formattedDateProposal = `${year}.${month}.${day}.`;

                if (startTimeValue && endTimeValue) {
                    const endTimeDisplay = endTimeValue === '00:00' ? '24:00' : endTimeValue;
                    formattedDate += ` ${startTimeValue}~${endTimeDisplay}`;
                    formattedDateProposal += `\n${startTimeValue} ~ ${endTimeDisplay}`;
                } else if (startTimeValue) {
                    formattedDate += ` ${startTimeValue}`;
                    formattedDateProposal += `\n${startTimeValue}`;
                }

                document.querySelectorAll('.auto-datetime').forEach(field => {
                    field.value = formattedDate;
                });

                document.querySelectorAll('.auto-datetime-proposal').forEach(field => {
                    field.textContent = formattedDateProposal;
                });

                // 회의 품의서 - 집행 예정 금액 옆 일시 칸
                document.querySelectorAll('.auto-datetime-display').forEach(field => {
                    field.textContent = formattedDate;
                });

                // 회의 품의서 작성일
                const proposalDateElement = document.getElementById('proposal_date');
                if (proposalDateElement) {
                    const date = new Date(dateValue);
                    const dayOfWeek = date.getDay();

                    if (dayOfWeek === 1) {
                        date.setDate(date.getDate() - 3);
                    } else {
                        date.setDate(date.getDate() - 1);
                    }

                    const propYear = date.getFullYear();
                    const propMonth = String(date.getMonth() + 1).padStart(2, '0');
                    const propDay = String(date.getDate()).padStart(2, '0');
                    proposalDateElement.textContent = `${propYear}년 ${propMonth}월 ${propDay}일`;
                }
            }
        }

        if (commonDate) {
            commonDate.addEventListener('input', function() {
                updateDateTime();
                updateDocNumber();
            });
        }

        // 문서번호 업데이트 함수
        function updateDocNumber() {
            const dateValue = commonDate ? commonDate.value : '';
            if (dateValue) {
                const formattedDate = dateValue.replace(/-/g, '');
                const docNumber = `회의록-${formattedDate}-01`;

                const docNumberProposal = document.getElementById('doc_number_proposal');
                const docNumberAttendee = document.getElementById('doc_number_attendee');

                if (docNumberProposal) {
                    docNumberProposal.textContent = docNumber;
                }
                if (docNumberAttendee) {
                    docNumberAttendee.textContent = docNumber;
                }
            }
        }

        if (commonStartTime) {
            commonStartTime.addEventListener('input', updateDateTime);
        }
        if (commonEndTime) {
            commonEndTime.addEventListener('input', updateDateTime);
        }

        // 장소 자동 채우기
        if (commonLocation) {
            commonLocation.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-location').forEach(field => {
                    field.value = value;
                });
            });
        }

        // 회의 목적 자동 채우기
        const commonPurpose = document.getElementById('common_purpose');
        if (commonPurpose) {
            commonPurpose.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-purpose').forEach(field => {
                    field.value = value;
                });
                document.querySelectorAll('.auto-subject').forEach(field => {
                    field.textContent = value;
                });
            });
        }

        // 특기사항 자동 채우기
        const commonNotes = document.getElementById('common_notes');
        if (commonNotes) {
            commonNotes.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-notes').forEach(field => {
                    field.value = value;
                });
            });
        }

        // 주요 내용 자동 채우기
        const commonContent = document.getElementById('common_content');
        if (commonContent) {
            commonContent.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-content').forEach(field => {
                    field.textContent = value;
                });
            });
        }

        // 결제 방법 자동 채우기
        const commonPayment = document.getElementById('common_payment');
        if (commonPayment) {
            commonPayment.addEventListener('change', function() {
                const value = this.value;
                document.querySelectorAll('.auto-payment').forEach(field => {
                    field.value = value;
                });
            });
        }

        // 회의록 비고 자동 채우기
        const commonMinutesNotes = document.getElementById('common_minutes_notes');
        if (commonMinutesNotes) {
            commonMinutesNotes.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-minutes-notes').forEach(field => {
                    field.value = value;
                });
            });
        }

        // 사용 금액 표시 자동 채우기
        if (commonAmount) {
            // 천단위 콤마 포맷팅 함수
            function formatNumberWithComma(value) {
                // 숫자만 추출
                const numbers = value.replace(/[^\d]/g, '');
                if (!numbers) return '';
                // 천단위 콤마 추가
                return parseInt(numbers).toLocaleString('ko-KR');
            }

            // input 이벤트: 입력 중 실시간 포맷팅
            commonAmount.addEventListener('input', function(e) {
                const cursorPosition = this.selectionStart;
                const oldLength = this.value.length;

                // 포맷팅
                const formatted = formatNumberWithComma(this.value);
                this.value = formatted;

                // 커서 위치 조정 (콤마 추가로 인한 위치 변경 보정)
                const newLength = this.value.length;
                const diff = newLength - oldLength;
                this.setSelectionRange(cursorPosition + diff, cursorPosition + diff);

                // 참석자 금액 합계 색상 업데이트
                updateAttendeeTotalAmount();
            });
        }

        // 초기값 설정 함수
        function initializeDefaultValues() {
            if (commonLocation && commonLocation.value) {
                document.querySelectorAll('.auto-location').forEach(field => {
                    field.value = commonLocation.value;
                });
            }

            if (commonPayment) {
                document.querySelectorAll('.auto-payment').forEach(field => {
                    field.value = commonPayment.value;
                });
            }
        }

        // 공식 문서 양식 토글 기능 설정
        setupDocumentFormToggle();

        setTimeout(initializeDefaultValues, 100);

        // 오늘 날짜 자동 설정
        if (commonDate && !commonDate.value) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            commonDate.value = `${yyyy}-${mm}-${dd}`;
            // 날짜 설정 후 자동 채우기 트리거
            commonDate.dispatchEvent(new Event('input'));
        }

        // 날짜 입력 필드 전체 영역 클릭 시 날짜 선택기 열기
        if (commonDate) {
            commonDate.addEventListener('click', function() {
                if (this.showPicker) {
                    this.showPicker();
                }
            });
        }

        // 시작 시간 입력 필드 전체 영역 클릭 시 시간 선택기 열기
        if (commonStartTime) {
            commonStartTime.addEventListener('click', function() {
                if (this.showPicker) {
                    this.showPicker();
                }
            });
        }

        // 종료 시간 입력 필드 전체 영역 클릭 시 시간 선택기 열기
        if (commonEndTime) {
            commonEndTime.addEventListener('click', function() {
                if (this.showPicker) {
                    this.showPicker();
                }
            });
        }

        // 초기 참석자 설정
        currentAttendees = [];
        renderAttendeeListInTemplate();

        // 초기 참석자 금액 합계 업데이트
        updateAttendeeTotalAmount();
    }

    // 공식 문서 양식 토글 기능
    function setupDocumentFormToggle() {
        const documentFormToggle = document.getElementById('documentFormToggle');
        const documentFormWrapper = document.querySelector('.document-form-wrapper');

        if (documentFormToggle && documentFormWrapper) {
            documentFormToggle.addEventListener('click', function() {
                documentFormWrapper.classList.toggle('collapsed');
                documentFormToggle.classList.toggle('active');
            });
        }
    }

    // 파일 업로드
    fileInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (selectedFiles.length >= 5) {
                showWarning('최대 5개까지만 첨부 가능합니다.');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                showWarning('파일 크기는 10MB를 초과할 수 없습니다.');
                return;
            }
            selectedFiles.push(file);
        });
        updateFileList();
        fileInput.value = '';
    });

    // 드래그 앤 드롭
    fileUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = '#667eea';
        this.style.background = '#f5f7ff';
    });

    fileUploadArea.addEventListener('dragleave', function() {
        this.style.borderColor = '#ddd';
        this.style.background = 'white';
    });

    fileUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '#ddd';
        this.style.background = 'white';

        const files = Array.from(e.dataTransfer.files);
        files.forEach(file => {
            if (selectedFiles.length >= 5) {
                showWarning('최대 5개까지만 첨부 가능합니다.');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                showWarning('파일 크기는 10MB를 초과할 수 없습니다.');
                return;
            }
            selectedFiles.push(file);
        });
        updateFileList();
    });

    // 파일 목록 업데이트
    function updateFileList() {
        if (selectedFiles.length === 0) {
            fileList.innerHTML = '';
            return;
        }

        fileList.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';

            let icon = 'fa-file';
            if (file.name.match(/\.(jpg|jpeg|png|gif)$/i)) icon = 'fa-file-image';
            else if (file.name.match(/\.(pdf)$/i)) icon = 'fa-file-pdf';
            else if (file.name.match(/\.(doc|docx)$/i)) icon = 'fa-file-word';
            else if (file.name.match(/\.(xls|xlsx)$/i)) icon = 'fa-file-excel';

            item.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <button class="btn-remove-file" onclick="removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(item);
        });
    }

    // 파일 제거
    window.removeFile = function(index) {
        selectedFiles.splice(index, 1);
        updateFileList();
    };

    // PDF 생성 함수
    async function generatePdf(receiptMeetingIdx) {
        // 공식 문서 HTML 가져오기
        const documentFormContent = document.getElementById('documentFormContent');
        if (!documentFormContent) {
            throw new Error('문서 양식을 찾을 수 없습니다.');
        }

        // HTML 문자열 생성 (완전한 HTML 문서)
        const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>연구비증빙 회의록</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif;
            background: white;
            margin: 1.5cm;
        }

        .doc-title {
            text-align: center;
            font-size: 26px;
            font-weight: 700;
            color: #333;
            margin: 20px 0;
            padding-bottom: 10px;
            letter-spacing: 6px;
        }

        .form-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            margin-bottom: 20px;
        }

        .form-table th,
        .form-table td {
            border: 1px solid #000;
            padding: 10px;
            font-size: 13px;
            vertical-align: middle;
        }

        .form-table th {
            background: #f0f0f0;
            font-weight: 700;
            color: #333;
            text-align: center;
        }

        .form-table td {
            color: #333;
            text-align: center;
        }

        .form-table input,
        .form-table textarea {
            border: none;
            background: transparent;
            width: 100%;
            text-align: center;
            font-size: 13px;
        }

        @page {
            margin: 0;
            size: A4;
        }

        @media print {
            body {
                margin: 1.5cm;
            }
        }
    </style>
</head>
<body>
${documentFormContent.innerHTML}
</body>
</html>
        `;

        // 서버에 PDF 생성 요청
        const response = await fetch(`/api/receipt-meetings/${receiptMeetingIdx}/generate-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ htmlContent })
        });

        if (!response.ok) {
            throw new Error('PDF 생성 요청 실패');
        }

        const result = await response.json();
        console.log('PDF 생성 완료:', result.filePath);
        return result;
    }

    // 저장
    if (saveBtn) {
        saveBtn.addEventListener('click', async function() {
            // 참석자 금액 합계 검증 (빨간색 상태인지 확인)
            const totalAmountEl = document.getElementById('attendeeTotalAmount');
            const amountInput = document.getElementById('common_amount');

            if (totalAmountEl && amountInput) {
                // 참석자 회의비 합계 계산
                const totalAmount = currentAttendees.reduce((sum, attendee) => {
                    return sum + (attendee.meetingExpense || 0);
                }, 0);

                // 사용 금액 가져오기 (콤마 제거 후 파싱)
                const commonAmount = parseInt(amountInput.value.replace(/,/g, '')) || 0;

                // 합계가 사용 금액보다 적으면 (빨간색 상태)
                if (totalAmount < commonAmount) {
                    showWarning('참석 인원을 추가해주세요.');
                    return;
                }
            }

            // 저장 직전 중복 참석자 최종 검증 (내부 참석자만)
            const internalAttendeesForSave = currentAttendees.filter(a => a.type === 'internal');
            if (internalAttendeesForSave.length > 0) {
                try {
                    const attendeeIds = internalAttendeesForSave.map(a => parseInt(a.id)).filter(id => !isNaN(id));
                    if (attendeeIds.length > 0) {
                        const duplicates = await checkDuplicateAttendees(attendeeIds);

                        if (duplicates.length > 0) {
                            const duplicate = duplicates[0];
                            const meeting = duplicate.meeting;
                            const createdAt = new Date(meeting.createdAt).toLocaleString('ko-KR');
                            const title = meeting.title || '(제목 없음)';

                            showWarning(`저장 중 중복 발견: ${createdAt}에 "${title}"에 포함된 참가자가 있어 저장할 수 없습니다.`);
                            return;
                        }
                    }
                } catch (error) {
                    console.error('중복 검증 중 오류:', error);
                    showError('참석자 중복 검증 중 오류가 발생했습니다.\n계속 진행하시겠습니까?');
                    return;
                }
            }

            // 필수 필드 검증
            const projectInput = document.getElementById('common_project');
            const projectIdxInput = document.getElementById('selectedProjectIdx');
            const dateInput = document.getElementById('common_date');
            const startTimeInput = document.getElementById('common_start_time');
            const endTimeInput = document.getElementById('common_end_time');
            const locationInput = document.getElementById('common_location');
            const purposeInput = document.getElementById('common_purpose');

            if (!projectIdxInput || !projectIdxInput.value) {
                showWarning('프로젝트를 선택해주세요.');
                return;
            }

            if (!dateInput || !dateInput.value) {
                showWarning('회의 일자를 입력해주세요.');
                return;
            }

            if (!startTimeInput || !startTimeInput.value) {
                showWarning('시작 시간을 입력해주세요.');
                return;
            }

            if (!endTimeInput || !endTimeInput.value) {
                showWarning('종료 시간을 입력해주세요.');
                return;
            }

            if (!locationInput || !locationInput.value) {
                showWarning('장소를 입력해주세요.');
                return;
            }


            // 참석자 목록 변환
            const attendeeDTOs = currentAttendees.map((attendee, index) => {
                const dto = {
                    attendeeType: attendee.type === 'external' ? '외부' : '내부',
                    department: attendee.dept || null,
                    name: attendee.name,
                    userIdx: parseInt(attendee.id),
                    position: attendee.position || null,
                    displayOrder: index
                };

                return dto;
            });

            // 작성자 정보 가져오기
            const authorIdInput = document.getElementById('common_author_id');
            const authorInput = document.getElementById('common_author');

            // 카드 정보 가져오기
            const cardIdxInput = document.getElementById('selectedCardIdx');

            // 저장 데이터 생성
            const saveData = {
                projectIdx: parseInt(projectIdxInput.value),
                cardIdx: cardIdxInput && cardIdxInput.value ? parseInt(cardIdxInput.value) : null,
                authorId: authorIdInput && authorIdInput.value ? parseInt(authorIdInput.value) : null,
                authorName: authorInput ? authorInput.value : null,
                meetingDate: dateInput.value,
                startTime: startTimeInput.value + ':00',  // HH:mm:ss 형식
                endTime: endTimeInput.value + ':00',
                location: locationInput.value,
                amount: amountInput && amountInput.value ? parseInt(amountInput.value.replace(/,/g, '')) : null,
                purpose: purposeInput ? purposeInput.value : null,
                content: document.getElementById('common_content') ? document.getElementById('common_content').value : null,
                paymentMethod: document.getElementById('common_payment') ? document.getElementById('common_payment').value : null,
                notes: document.getElementById('common_notes') ? document.getElementById('common_notes').value : null,
                minutesNotes: document.getElementById('common_minutes_notes') ? document.getElementById('common_minutes_notes').value : null,
                attendees: attendeeDTOs
            };


            const confirmed = showSaveConfirm('회의록을 저장하시겠습니까?');
                if(!confirmed)return;
            showLoading('저장 중...');
            try {
                // FormData 생성 (JSON + 파일 함께 전송)
                const formData = new FormData();

                // JSON 데이터를 문자열로 변환하여 추가
                formData.append('data', JSON.stringify(saveData));

                // 첨부파일 추가
                if (selectedFiles && selectedFiles.length > 0) {
                    selectedFiles.forEach((file) => {
                        formData.append('files', file);
                    });
                }

                const response = await fetch('/api/receipt-meetings', {
                    method: 'POST',
                    body: formData
                    // Content-Type 헤더는 자동으로 설정됨 (multipart/form-data)
                });

                if (response.ok) {
                    const result = await response.json();

                    // PDF 생성 시도 (비동기 - 실패해도 저장은 완료됨)
                    try {
                        await generatePdf(result.idx);
                    } catch (pdfError) {
                        console.error('PDF 생성 실패 (데이터는 저장됨):', pdfError);
                        // PDF 생성 실패해도 데이터는 저장되었으므로 계속 진행
                    }

                    showSuccess('회의록이 저장되었습니다.');
                    // 저장 후 목록 페이지로 이동
                    window.location.href = '/project/documents';
                } else {
                    let errorMessage = '회의록 저장에 실패했습니다.';
                    try {
                        const contentType = response.headers.get('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            const errorJson = await response.json();
                            if (errorJson.error) {
                                errorMessage += '\n\n에러 상세:\n' + errorJson.error;
                            }
                        } else {
                            const errorText = await response.text();
                            if (errorText) {
                                errorMessage += '\n\n에러 상세:\n' + errorText;
                            }
                        }
                    } catch (e) {
                        console.error('에러 메시지 파싱 실패:', e);
                    }
                    console.error('저장 실패:', response.status, errorMessage);
                    showError(errorMessage);
                }
            } catch (error) {
                console.error('저장 오류:', error);
                showError('회의록 저장 중 오류가 발생했습니다.');
            }
        });
    }

    // PDF 저장 버튼 이벤트
    const savePdfBtn = document.getElementById('savePdfBtn');
    if (savePdfBtn) {
        savePdfBtn.addEventListener('click', async function(e) {
            e.preventDefault();

            let allDivs = null;
            let originalDisplays = [];
            const loadingModal = document.getElementById('pdfLoadingModal');
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');

            // 진행도 업데이트 함수
            function updateProgress(percent, message) {
                if (progressFill) progressFill.style.width = percent + '%';
                if (progressText) progressText.textContent = `${message} (${percent}%)`;
            }

            try {

                // 로딩 모달 표시
                if (loadingModal) loadingModal.classList.add('active');
                updateProgress(0, '준비 중...');

                const templateType = 'receipt-meeting';

                if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
                    showWarning('PDF 라이브러리를 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
                    if (loadingModal) loadingModal.classList.remove('active');
                    return;
                }

                updateProgress(10, 'PDF 초기화 중...');

                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');

                updateProgress(15, '문서 구조 확인 중...');

                allDivs = documentForm.querySelectorAll(':scope > div');

                originalDisplays = Array.from(allDivs).map(div => div.style.display);

                if (allDivs.length < 4) {
                    showError('문서 구조를 찾을 수 없습니다. 영수증 처리(회의록) 템플릿을 선택했는지 확인해주세요.');
                    if (loadingModal) loadingModal.classList.remove('active');
                    return;
                }

                updateProgress(20, '페이지 준비 중...');

                // 접힌 문서 양식을 임시로 펼치기
                const documentFormWrapper = document.querySelector('.document-form-wrapper');
                let wasCollapsed = false;
                if (documentFormWrapper && documentFormWrapper.classList.contains('collapsed')) {
                    wasCollapsed = true;
                    documentFormWrapper.classList.remove('collapsed');
                }

                // 공통 정보 입력 영역 숨기고, 나머지는 모두 표시
                allDivs[0].style.display = 'none';
                allDivs[1].style.display = 'block';
                allDivs[2].style.display = 'block';
                allDivs[3].style.display = 'block';

                await new Promise(resolve => setTimeout(resolve, 100));

                const renderOptions = {
                    scale: 3,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    imageTimeout: 0,
                    removeContainer: true
                };

                const pdfWidth = 210;
                const pdfHeight = 297;
                const margin = 10;
                const contentWidth = pdfWidth - (margin * 2);

                updateProgress(30, '회의 품의서 렌더링 중...');

                // 1. 회의 품의서 페이지
                const proposalDiv = allDivs[1];

                if (!proposalDiv) {
                    throw new Error('회의 품의서를 찾을 수 없습니다.');
                }

                const proposalCanvas = await window.html2canvas(proposalDiv, renderOptions);
                const canvasWidth = proposalCanvas.width;
                const canvasHeight = proposalCanvas.height;

                if (canvasWidth === 0 || canvasHeight === 0) {
                    throw new Error('Canvas 크기가 0입니다. 문서가 화면에 표시되어 있는지 확인하세요.');
                }

                updateProgress(45, '회의 품의서 이미지 변환 중...');

                const proposalImgData = proposalCanvas.toDataURL('image/jpeg', 0.95);
                const imgHeight = (canvasHeight * contentWidth) / canvasWidth;

                pdf.addImage(proposalImgData, 'JPEG', margin, margin, contentWidth, imgHeight);

                updateProgress(55, '회의록 렌더링 중...');

                // 2. 회의록 페이지
                const minutesDiv = allDivs[2];

                if (!minutesDiv) {
                    throw new Error('회의록을 찾을 수 없습니다.');
                }

                pdf.addPage();
                const minutesCanvas = await window.html2canvas(minutesDiv, renderOptions);

                const minutesCanvasWidth = minutesCanvas.width;
                const minutesCanvasHeight = minutesCanvas.height;

                updateProgress(70, '회의록 이미지 변환 중...');

                const minutesImgData = minutesCanvas.toDataURL('image/jpeg', 0.95);
                const minutesImgHeight = (minutesCanvasHeight * contentWidth) / minutesCanvasWidth;

                pdf.addImage(minutesImgData, 'JPEG', margin, margin, contentWidth, minutesImgHeight);

                updateProgress(80, '참석자 명단 렌더링 중...');

                // 3. 참석자 명단 페이지
                const attendeeDiv = allDivs[3];

                if (!attendeeDiv) {
                    throw new Error('참석자 명단을 찾을 수 없습니다.');
                }

                pdf.addPage();
                const attendeeCanvas = await window.html2canvas(attendeeDiv, renderOptions);

                const attendeeCanvasWidth = attendeeCanvas.width;
                const attendeeCanvasHeight = attendeeCanvas.height;

                updateProgress(90, '참석자 명단 이미지 변환 중...');

                const attendeeImgData = attendeeCanvas.toDataURL('image/jpeg', 0.95);
                const attendeeImgHeight = (attendeeCanvasHeight * contentWidth) / attendeeCanvasWidth;

                pdf.addImage(attendeeImgData, 'JPEG', margin, margin, contentWidth, attendeeImgHeight);

                updateProgress(95, 'PDF 파일 생성 중...');

                // 파일명 생성
                const dateInput = document.getElementById('common_date');
                let dateStr;
                if (dateInput && dateInput.value) {
                    dateStr = dateInput.value.replace(/-/g, '');
                } else {
                    const today = new Date();
                    dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
                }
                const fileName = `${dateStr}_회의록.pdf`;

                pdf.save(fileName);

                updateProgress(100, '완료!');

                // 잠시 후 모달 닫기
                setTimeout(() => {
                    if (loadingModal) loadingModal.classList.remove('active');
                    showSuccess('PDF가 저장되었습니다.');
                }, 500);
            } catch (error) {
                console.error('PDF 생성 오류:', error);
                if (loadingModal) loadingModal.classList.remove('active');
                showError('PDF 생성 중 오류가 발생했습니다.\n' + error.message + '\n\n브라우저 콘솔(F12)을 확인해주세요.');
            } finally {
                // 원래 display 상태 복원
                if (allDivs && originalDisplays.length > 0) {
                    allDivs.forEach((div, index) => {
                        div.style.display = originalDisplays[index];
                    });
                }

                // 접혔던 문서 양식을 다시 접기
                const documentFormWrapper = document.querySelector('.document-form-wrapper');
                if (documentFormWrapper && wasCollapsed) {
                    documentFormWrapper.classList.add('collapsed');
                }
            }
        });
    }

    // 참석자 모달 관련 (2분할 구조)
    const attendeeModal = document.getElementById('attendeeModal');
    const internalSearchInput = document.getElementById('internalSearchInput');
    const externalSearchInput = document.getElementById('externalSearchInput');
    const internalListEl = document.getElementById('internalList');
    const externalListEl = document.getElementById('externalList');
    const selectedAttendeeBadgesEl = document.getElementById('selectedAttendeeBadges');
    const selectedAttendeeCountEl = document.getElementById('selectedAttendeeCount');

    // 임시 선택된 참석자 배열
    let tempSelectedAttendees = [];

    // 초성 검색 유틸리티
    const CHO_HANGUL = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

    function getChosung(str) {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i) - 44032;
            if (code > -1 && code < 11172) {
                result += CHO_HANGUL[Math.floor(code / 588)];
            }
        }
        return result;
    }

    function highlightText(text, keyword) {
        if (!keyword) return text;
        const regex = new RegExp(`(${keyword})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    function matchesSearch(text, keyword) {
        if (!keyword) return true;
        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();
        // 일반 검색
        if (lowerText.includes(lowerKeyword)) return true;
        // 초성 검색
        const chosung = getChosung(text);
        return chosung.includes(keyword);
    }

    // 참석자 목록 데이터 (프로젝트 팀원에서 가져옴)
    function getAttendeePersons() {
        return projectMembers.map(member => {
            const positionName = member.employeePositionName || '-';
            let meetingExpense = 0;
            if (fixedExpenses[positionName]) {
                meetingExpense = fixedExpenses[positionName];
            }
            return {
                id: member.employeeIdx,
                name: member.employeeName,
                position: positionName,
                dept: member.employeeDeptName || '-',
                meetingExpense: meetingExpense,
                type: 'internal'
            };
        });
    }

    // 참석자 모달 내 프로젝트 목록 렌더링 (편의 기능)
    function renderProjectListInAttendeeModal(searchText = '') {
        if (!internalListEl) return;

        // 검색 필터링
        let filtered = projects;
        if (searchText) {
            filtered = projects.filter(proj =>
                matchesSearch(proj.projectName + (proj.description || ''), searchText)
            );
        }

        if (filtered.length === 0) {
            internalListEl.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-search" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                    ${searchText ? '검색 결과가 없습니다.' : '등록된 프로젝트가 없습니다.'}
                </div>
            `;
            return;
        }

        // 헤더 메시지 (편의 기능 안내)
        const headerMessage = `
            <div class="convenience-notice">
                <div class="notice-icon">
                    <i class="fas fa-lightbulb"></i>
                </div>
                <div class="notice-content">
                    <div class="notice-title">프로젝트를 먼저 선택해주세요</div>
                    <div class="notice-desc">프로젝트를 선택하면 참여인력 목록이 표시됩니다</div>
                </div>
            </div>
        `;

        // 프로젝트 목록 (간단하게 이름만 표시)
        const projectItems = filtered.map(proj => {
            const highlightedName = highlightText(proj.projectName, searchText);

            return `
                <div class="project-item-in-attendee" data-project-idx="${proj.idx}">
                    <div class="project-item-icon">
                        <i class="fas fa-folder"></i>
                    </div>
                    <div class="project-item-info">
                        <div class="project-item-name">${highlightedName}</div>
                    </div>
                    <div class="project-item-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            `;
        }).join('');

        internalListEl.innerHTML = headerMessage + projectItems;

        // 프로젝트 클릭 이벤트
        internalListEl.querySelectorAll('.project-item-in-attendee').forEach(item => {
            item.addEventListener('click', async function() {
                const projectIdx = this.getAttribute('data-project-idx');
                const proj = projects.find(p => p.idx == projectIdx);

                if (!proj) return;

                // 프로젝트 선택 처리
                selectedProject = proj;

                // 프로젝트 입력 필드에 표시
                const commonProject = document.getElementById('common_project');
                if (commonProject) {
                    commonProject.value = proj.projectName;
                    commonProject.classList.remove('error'); // 빨간색 제거
                }
                const selectedProjectIdx = document.getElementById('selectedProjectIdx');
                if (selectedProjectIdx) {
                    selectedProjectIdx.value = proj.idx;
                }

                // 자동 채우기
                document.querySelectorAll('.auto-project').forEach(field => {
                    field.value = proj.projectName;
                });

                // 프로젝트 팀원 로드
                await loadProjectMembers(proj.idx);
                // 기본 작성자 설정
                setDefaultAuthor();
                // 프로젝트 카드 목록 로드
                await window.loadProjectCards(proj.idx);

                // 카드 선택 필드 활성화 및 첫 번째 카드 자동 선택
                const commonCard = document.getElementById('common_card');
                const selectedCardIdx = document.getElementById('selectedCardIdx');

                if (projectCards && projectCards.length > 0) {
                    // 첫 번째 카드 자동 선택
                    const firstCard = projectCards[0];
                    selectedCard = firstCard;
                    if (commonCard) {
                        commonCard.value = firstCard.cardName;
                    }
                    if (selectedCardIdx) {
                        selectedCardIdx.value = firstCard.idx;
                    }
                    console.log('첫 번째 카드 자동 선택:', firstCard.cardName);
                } else {
                    // 카드가 없는 경우 초기화
                    if (commonCard) {
                        commonCard.placeholder = '클릭하여 카드 선택';
                        commonCard.value = '';
                    }
                    if (selectedCardIdx) {
                        selectedCardIdx.value = '';
                    }
                    selectedCard = null;
                }

                // 검색창 비우기
                if (internalSearchInput) {
                    internalSearchInput.value = '';
                }

                // 팀원 목록 다시 렌더링 (검색어 없이)
                renderInternalList('');
            });
        });
    }

    // 내부인원 목록 렌더링
    function renderInternalList(searchText = '') {
        if (!internalListEl) return;

        const attendeePersons = getAttendeePersons();

        if (attendeePersons.length === 0) {
            // 프로젝트가 선택되지 않았을 때 프로젝트 목록 표시 (편의 기능)
            renderProjectListInAttendeeModal(searchText);
            return;
        }

        const filtered = attendeePersons.filter(person =>
            matchesSearch(person.name + person.dept + person.position, searchText)
        );

        if (filtered.length === 0) {
            internalListEl.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;"><i class="fas fa-search" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>검색 결과가 없습니다.</div>';
            return;
        }

        internalListEl.innerHTML = filtered.map(person => {
            const isSelected = tempSelectedAttendees.some(a => String(a.id) === String(person.id) && a.type === 'internal');
            const formattedExpense = person.meetingExpense ? person.meetingExpense.toLocaleString('ko-KR') + '원' : '-';

            const highlightedName = highlightText(person.name, searchText);
            const highlightedDept = highlightText(person.dept, searchText);
            const highlightedPosition = highlightText(person.position, searchText);

            return `
                <div class="employee-item ${isSelected ? 'selected' : ''}"
                     data-id="${person.id}"
                     data-type="internal"
                     onclick="toggleInternalAttendee(${person.id})">
                    <div class="employee-info">
                        <div class="employee-name">${highlightedName}</div>
                        <div class="employee-details">${highlightedPosition} · ${highlightedDept} · ${formattedExpense}</div>
                    </div>
                    ${isSelected ? '<i class="fas fa-check-circle" style="color: #10b981; font-size: 18px; margin-left: auto;"></i>' : ''}
                </div>
            `;
        }).join('');
    }

    // 외부인원 목록 렌더링
    function renderExternalList(searchText = '') {
        if (!externalListEl) return;

        if (!allExternalPersons || allExternalPersons.length === 0) {
            externalListEl.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;"><i class="fas fa-user-plus" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>등록된 외부인력이 없습니다.<br><small style="margin-top: 8px; display: block;">신규 등록 버튼을 클릭하세요.</small></div>';
            return;
        }

        const filtered = allExternalPersons.filter(person =>
            matchesSearch(person.name + (person.companyName || '') + (person.position || ''), searchText)
        );

        if (filtered.length === 0) {
            externalListEl.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;"><i class="fas fa-search" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>검색 결과가 없습니다.</div>';
            return;
        }

        externalListEl.innerHTML = filtered.map(person => {
            const isSelected = tempSelectedAttendees.some(a => parseInt(a.id) === person.idx && a.type === 'external');

            const highlightedName = highlightText(person.name, searchText);
            const highlightedCompany = highlightText(person.companyName || '-', searchText);
            const highlightedPosition = highlightText(person.position || '-', searchText);

            return `
                <div class="employee-item ${isSelected ? 'selected' : ''}"
                     data-id="${person.idx}"
                     data-type="external"
                     onclick="toggleExternalAttendee(${person.idx})">
                    <div class="employee-info">
                        <div class="employee-name">${highlightedName}</div>
                        <div class="employee-details">${highlightedPosition} · ${highlightedCompany}</div>
                    </div>
                    ${isSelected ? '<i class="fas fa-check-circle" style="color: #10b981; font-size: 18px; margin-left: auto;"></i>' : ''}
                </div>
            `;
        }).join('');
    }

    // 내부인원 선택 토글
    window.toggleInternalAttendee = function(personId) {
        const attendeePersons = getAttendeePersons();
        const person = attendeePersons.find(p => p.id === personId);
        if (!person) return;

        const index = tempSelectedAttendees.findIndex(a => String(a.id) === String(personId) && a.type === 'internal');
        if (index > -1) {
            tempSelectedAttendees.splice(index, 1);
        } else {
            tempSelectedAttendees.push({
                id: String(personId),
                name: person.name,
                dept: person.dept,
                position: person.position,
                meetingExpense: person.meetingExpense || 0,
                type: 'internal'
            });
        }

        renderInternalList(internalSearchInput.value);
        renderSelectedBadges();
    };

    // 외부인원 선택 토글
    window.toggleExternalAttendee = function(personIdx) {
        const person = allExternalPersons.find(p => p.idx === personIdx);
        if (!person) return;

        const index = tempSelectedAttendees.findIndex(a => parseInt(a.id) === personIdx && a.type === 'external');
        if (index > -1) {
            tempSelectedAttendees.splice(index, 1);
        } else {
            tempSelectedAttendees.push({
                id: personIdx,
                name: person.name,
                dept: person.companyName || '-',
                position: person.position || '-',
                meetingExpense: 0,
                type: 'external'
            });
        }

        renderExternalList(externalSearchInput.value);
        renderSelectedBadges();
    };

    // 선택된 참석자 뱃지 렌더링
    function renderSelectedBadges() {
        if (!selectedAttendeeBadgesEl || !selectedAttendeeCountEl) return;

        selectedAttendeeCountEl.textContent = tempSelectedAttendees.length;

        if (tempSelectedAttendees.length === 0) {
            selectedAttendeeBadgesEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-plus"></i>
                    <span>참석자를 선택해주세요</span>
                </div>
            `;
            return;
        }

        selectedAttendeeBadgesEl.innerHTML = tempSelectedAttendees.map(person => `
            <div class="attendee-badge ${person.type === 'external' ? 'external' : ''}" onclick="removeTempAttendee('${person.id}', '${person.type}')">
                <i class="fas fa-${person.type === 'external' ? 'user-tie' : 'user'}"></i>
                <span class="badge-name">${person.name}</span>
                <span class="badge-info">${person.dept}</span>
                <div class="badge-remove">
                    <i class="fas fa-times"></i>
                </div>
            </div>
        `).join('');
    }

    // 임시 선택 참석자 제거
    window.removeTempAttendee = function(attendeeId, type) {
        const index = tempSelectedAttendees.findIndex(a => String(a.id) === String(attendeeId) && a.type === type);
        if (index > -1) {
            tempSelectedAttendees.splice(index, 1);
            renderInternalList(internalSearchInput.value);
            renderExternalList(externalSearchInput.value);
            renderSelectedBadges();
        }
    };

    // 전체 선택 해제
    window.clearAllSelectedAttendees = function() {
        tempSelectedAttendees = [];
        renderInternalList(internalSearchInput.value);
        renderExternalList(externalSearchInput.value);
        renderSelectedBadges();
    };

    // 모달 열기
    window.openAttendeeModal = async function() {
        if (attendeeModal) {
            // 기존에 선택된 참석자들을 tempSelectedAttendees에 복사
            tempSelectedAttendees = currentAttendees.map(attendee => {
                return {
                    id: attendee.id,
                    name: attendee.name,
                    position: attendee.position,
                    dept: attendee.dept,
                    meetingExpense: attendee.meetingExpense || 0,
                    type: attendee.type
                };
            });

            attendeeModal.classList.add('show');

            // 외부인력 목록 로드
            await loadExternalPersons();

            renderInternalList('');
            renderExternalList('');
            renderSelectedBadges();
            if (internalSearchInput) internalSearchInput.value = '';
            if (externalSearchInput) externalSearchInput.value = '';
        }
    };

    // 모달 닫기
    window.closeAttendeeModal = function() {
        if (attendeeModal) {
            attendeeModal.classList.remove('show');
            tempSelectedAttendees = [];
        }
    };

    // 모달 외부 클릭 시 닫기
    if (attendeeModal) {
        attendeeModal.addEventListener('click', function(e) {
            if (e.target === attendeeModal) {
                closeAttendeeModal();
            }
        });
    }

    // 검색 기능
    if (internalSearchInput) {
        internalSearchInput.addEventListener('input', function(e) {
            renderInternalList(e.target.value);
        });
    }

    if (externalSearchInput) {
        externalSearchInput.addEventListener('input', function(e) {
            renderExternalList(e.target.value);
        });
    }

    // 중복 참석자 검증 함수
    async function checkDuplicateAttendees(attendeeIds) {
        const dateInput = document.getElementById('common_date');
        if (!dateInput || !dateInput.value) {
            return []; // 날짜가 없으면 검증 스킵
        }

        const date = dateInput.value; // yyyy-MM-dd 형식
        const duplicates = [];

        // NaN 필터링 및 유효성 검증
        const validAttendeeIds = attendeeIds.filter(id => {
            const isValid = !isNaN(id) && id !== null && id !== undefined && id > 0;
            if (!isValid) {
                console.warn('유효하지 않은 attendeeId 발견:', id);
            }
            return isValid;
        });

        if (validAttendeeIds.length === 0) {
            console.warn('유효한 attendeeId가 없습니다.');
            return [];
        }

        for (const attendeeId of validAttendeeIds) {
            try {
                const response = await fetch(`/api/receipt-meetings/check-duplicate?date=${date}&attendeeIdx=${attendeeId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        // 중복된 회의록이 있음
                        const meeting = data[0]; // 첫 번째 회의록 정보 사용
                        duplicates.push({
                            attendeeId: attendeeId,
                            meeting: meeting
                        });
                    }
                } else {
                    console.error(`중복 검증 API 실패 (attendeeId: ${attendeeId}):`, response.status);
                }
            } catch (error) {
                console.error(`중복 검증 중 오류 (attendeeId: ${attendeeId}):`, error);
                // 검증 실패 시 에러를 throw하여 상위에서 처리
                throw new Error(`참석자 중복 검증 중 오류가 발생했습니다 (ID: ${attendeeId})`);
            }
        }

        return duplicates;
    }

    // 선택된 참석자 추가
    window.addSelectedAttendees = async function() {
        if (tempSelectedAttendees.length === 0) {
            showWarning('참석자를 선택해주세요.');
            return;
        }

        // 내부 참석자만 중복 검증 (외부인력은 제외)
        const internalAttendees = tempSelectedAttendees.filter(a => a.type === 'internal');
        const attendeeIdsToCheck = internalAttendees.map(a => parseInt(a.id));

        if (attendeeIdsToCheck.length > 0) {
            const duplicates = await checkDuplicateAttendees(attendeeIdsToCheck);
            if (duplicates.length > 0) {
                const duplicate = duplicates[0];
                const meeting = duplicate.meeting;
                const createdAt = new Date(meeting.createdAt).toLocaleString('ko-KR');
                const title = meeting.title || '(제목 없음)';

                showWarning(`${createdAt}에 "${title}"에 포함된 참가자라 선택이 불가합니다.`);
                return;
            }
        }


        // currentAttendees에 추가 (중복 체크)
        tempSelectedAttendees.forEach(person => {
            if (!currentAttendees.some(a => String(a.id) === String(person.id))) {
                currentAttendees.push({
                    id: person.id,
                    name: person.name,
                    dept: person.dept,
                    position: person.position,
                    meetingExpense: person.meetingExpense || 0,
                    type: person.type
                });
            }
        });


        // 참석자 목록 UI 업데이트
        renderAttendeeListInTemplate();

        // 모달 닫기
        closeAttendeeModal();
    };

    // 작성자 모달 관련
    const authorModal = document.getElementById('authorModal');
    const authorSearchInput = document.getElementById('authorSearchInput');
    const authorListEl = document.getElementById('authorList');

    // 직급 순서 정의 (낮은 직급부터)
    const positionOrder = {
        '사원': 1,
        '주임': 2,
        '대리': 3,
        '과장': 4,
        '차장': 5,
        '부장': 6,
        '이사': 7,
        '상무': 8,
        '전무': 9,
        '부사장': 10,
        '사장': 11,
        '대표': 12
    };

    // 직급으로 정렬 (낮은 직급부터)
    function sortByPosition(persons) {
        return persons.sort((a, b) => {
            const orderA = positionOrder[a.position] || 999;
            const orderB = positionOrder[b.position] || 999;
            return orderA - orderB;
        });
    }

    // 작성자 모달 열기
    window.openAuthorModal = async function() {
        if (authorModal) {
            authorModal.classList.add('show');

            // 프로젝트가 이미 선택되어 있는지 확인
            const projectIdxInput = document.getElementById('selectedProjectIdx');
            if (projectIdxInput && projectIdxInput.value) {
                // 선택된 프로젝트가 변경되었거나 팀원이 로드되지 않았으면 로드
                const currentProjectIdx = projectIdxInput.value;
                if (!selectedProject || String(selectedProject.idx) !== String(currentProjectIdx) || projectMembers.length === 0) {
                    await loadProjectMembers(currentProjectIdx);
                }
            }

            renderAuthorList('');
        }
    };

    // 작성자 모달 닫기
    window.closeAuthorModal = function() {
        if (authorModal) {
            authorModal.classList.remove('show');
            if (authorSearchInput) {
                authorSearchInput.value = '';
            }
        }
    };

    // 모달 외부 클릭 시 닫기
    if (authorModal) {
        authorModal.addEventListener('click', function(e) {
            if (e.target === authorModal) {
                closeAuthorModal();
            }
        });
    }

    // 작성자 검색
    if (authorSearchInput) {
        authorSearchInput.addEventListener('input', function() {
            renderAuthorList(this.value);
        });
    }

    // 작성자 모달 내 프로젝트 목록 렌더링
    function renderProjectListInAuthorModal(searchText = '') {
        if (!authorListEl) return;

        // 검색 필터링
        let filtered = projects;
        if (searchText) {
            filtered = projects.filter(proj =>
                matchesSearch(proj.projectName + (proj.description || ''), searchText)
            );
        }

        if (filtered.length === 0) {
            authorListEl.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-search" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                    ${searchText ? '검색 결과가 없습니다.' : '등록된 프로젝트가 없습니다.'}
                </div>
            `;
            return;
        }

        // 헤더 메시지
        const headerMessage = `
            <div class="convenience-notice">
                <div class="notice-icon">
                    <i class="fas fa-lightbulb"></i>
                </div>
                <div class="notice-content">
                    <div class="notice-title">프로젝트를 먼저 선택해주세요</div>
                    <div class="notice-desc">프로젝트를 선택하면 해당 팀원 목록이 표시됩니다</div>
                </div>
            </div>
        `;

        // 프로젝트 목록
        const projectItems = filtered.map(proj => {
            const highlightedName = highlightText(proj.projectName, searchText);

            return `
                <div class="project-item-in-attendee" data-project-idx="${proj.idx}">
                    <div class="project-item-icon">
                        <i class="fas fa-folder"></i>
                    </div>
                    <div class="project-item-info">
                        <div class="project-item-name">${highlightedName}</div>
                    </div>
                    <div class="project-item-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            `;
        }).join('');

        authorListEl.innerHTML = headerMessage + projectItems;

        // 프로젝트 클릭 이벤트
        authorListEl.querySelectorAll('.project-item-in-attendee').forEach(item => {
            item.addEventListener('click', async function() {
                const projectIdx = this.getAttribute('data-project-idx');
                const proj = projects.find(p => String(p.idx) === String(projectIdx));
                if (!proj) return;

                // 프로젝트 선택
                selectedProject = proj;

                // 프로젝트 입력 필드에 표시
                const commonProject = document.getElementById('common_project');
                if (commonProject) {
                    commonProject.value = proj.projectName;
                    commonProject.classList.remove('error'); // 빨간색 제거
                }
                const selectedProjectIdx = document.getElementById('selectedProjectIdx');
                if (selectedProjectIdx) {
                    selectedProjectIdx.value = proj.idx;
                }

                // 자동 채우기
                document.querySelectorAll('.auto-project').forEach(field => {
                    field.value = proj.projectName;
                });

                // 프로젝트 팀원 로드
                await loadProjectMembers(proj.idx);
                // 기본 작성자 설정
                setDefaultAuthor();
                // 프로젝트 카드 목록 로드
                await window.loadProjectCards(proj.idx);

                // 카드 선택 필드 활성화 및 첫 번째 카드 자동 선택
                const commonCard = document.getElementById('common_card');
                const selectedCardIdx = document.getElementById('selectedCardIdx');

                if (projectCards && projectCards.length > 0) {
                    // 첫 번째 카드 자동 선택
                    const firstCard = projectCards[0];
                    selectedCard = firstCard;
                    if (commonCard) {
                        commonCard.value = firstCard.cardName;
                    }
                    if (selectedCardIdx) {
                        selectedCardIdx.value = firstCard.idx;
                    }
                    console.log('첫 번째 카드 자동 선택:', firstCard.cardName);
                } else {
                    // 카드가 없는 경우 초기화
                    if (commonCard) {
                        commonCard.placeholder = '클릭하여 카드 선택';
                        commonCard.value = '';
                    }
                    if (selectedCardIdx) {
                        selectedCardIdx.value = '';
                    }
                    selectedCard = null;
                }

                // 검색창 비우기
                if (authorSearchInput) {
                    authorSearchInput.value = '';
                }

                // 작성자 목록 다시 렌더링 (검색어 없이)
                renderAuthorList('');
            });
        });
    }

    // 작성자 목록 렌더링
    function renderAuthorList(searchText = '') {
        if (!authorListEl) return;

        const attendeePersons = getAttendeePersons();
        if (attendeePersons.length === 0) {
            // 프로젝트가 선택되지 않았을 때 프로젝트 목록 표시
            renderProjectListInAuthorModal(searchText);
            return;
        }

        // 직급순 정렬
        const sortedPersons = sortByPosition([...attendeePersons]);

        // 검색 필터링
        const filteredPersons = searchText
            ? sortedPersons.filter(p =>
                p.name.toLowerCase().includes(searchText.toLowerCase()) ||
                p.dept.toLowerCase().includes(searchText.toLowerCase()) ||
                p.position.toLowerCase().includes(searchText.toLowerCase())
            )
            : sortedPersons;

        if (filteredPersons.length === 0) {
            authorListEl.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <p>검색 결과가 없습니다.</p>
                </div>
            `;
            return;
        }

        authorListEl.innerHTML = filteredPersons.map(person => `
            <div class="employee-item" data-id="${person.id}" onclick="selectAuthor(${person.id})">
                <div class="employee-info">
                    <div class="employee-name">${person.name}</div>
                    <div class="employee-details">${person.dept} · ${person.position}</div>
                </div>
            </div>
        `).join('');
    }

    // 작성자 선택
    window.selectAuthor = function(personId) {
        const attendeePersons = getAttendeePersons();
        const person = attendeePersons.find(p => p.id === personId);

        if (person) {
            document.getElementById('common_author').value = person.name;
            document.getElementById('common_author_id').value = person.id;

            // 인쇄용 템플릿도 업데이트
            document.querySelectorAll('.auto-author').forEach(field => {
                field.value = person.name;
                field.style.color = '';
            });

            closeAuthorModal();
        }
    };

    // 기본 작성자 설정 (낮은 직급에서 4번째)
    function setDefaultAuthor() {
        const attendeePersons = getAttendeePersons();
        if (attendeePersons.length === 0) return;

        const sortedPersons = sortByPosition([...attendeePersons]);
        // 낮은 직급에서 4번째 (인덱스 3), 4명 미만이면 가장 낮은 직급 (인덱스 0)
        const defaultAuthor = sortedPersons[3] || sortedPersons[0];

        if (defaultAuthor) {
            document.getElementById('common_author').value = defaultAuthor.name;
            document.getElementById('common_author_id').value = defaultAuthor.id;

            // 인쇄용 템플릿도 업데이트
            document.querySelectorAll('.auto-author').forEach(field => {
                field.value = defaultAuthor.name;
                field.style.color = '';
            });
        }
    }

    // 외부인력 데이터
    let allExternalPersons = [];

    // 외부인력 목록 로드
    async function loadExternalPersons() {
        try {
            const response = await fetch('/api/external-persons');
            if (response.ok) {
                allExternalPersons = await response.json();
                // 모달이 열려있으면 목록 새로고침
                if (attendeeModal && attendeeModal.classList.contains('show')) {
                    renderExternalList(externalSearchInput ? externalSearchInput.value : '');
                }
            } else {
                console.error('외부인력 목록 로드 실패');
            }
        } catch (error) {
            console.error('외부인력 목록 로드 오류:', error);
        }
    }

    // 신규 외부인력 등록 모달 열기
    window.createNewExternalPerson = function() {
        const externalPersonModal = document.getElementById('externalPersonModal');
        if (externalPersonModal) {
            // 입력 필드 초기화
            document.getElementById('externalPersonName').value = '';
            document.getElementById('externalPersonCompany').value = '';
            document.getElementById('externalPersonPosition').value = '';

            externalPersonModal.classList.add('show');

            // 첫 번째 입력 필드에 포커스
            setTimeout(() => {
                document.getElementById('externalPersonName').focus();
            }, 300);
        }
    };

    // 외부인력 등록 모달 닫기
    window.closeExternalPersonModal = function() {
        const externalPersonModal = document.getElementById('externalPersonModal');
        if (externalPersonModal) {
            externalPersonModal.classList.remove('show');
        }
    };

    // 외부인력 등록 제출
    window.submitExternalPerson = async function() {
        const name = document.getElementById('externalPersonName').value.trim();
        const companyName = document.getElementById('externalPersonCompany').value.trim();
        const position = document.getElementById('externalPersonPosition').value.trim();

        // 입력 검증
        if (!name) {
            Swal.fire({
                icon: 'warning',
                title: '입력 오류',
                text: '이름을 입력하세요.'
            });
            document.getElementById('externalPersonName').focus();
            return;
        }

        if (!companyName) {
            Swal.fire({
                icon: 'warning',
                title: '입력 오류',
                text: '회사명을 입력하세요.'
            });
            document.getElementById('externalPersonCompany').focus();
            return;
        }

        if (!position) {
            Swal.fire({
                icon: 'warning',
                title: '입력 오류',
                text: '직급을 입력하세요.'
            });
            document.getElementById('externalPersonPosition').focus();
            return;
        }

        try {
            const response = await fetch('/api/external-persons', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    companyName: companyName,
                    position: position
                })
            });

            if (response.ok) {
                const newPerson = await response.json();
                showSuccess('외부인력이 등록되었습니다.');

                // 모달 닫기
                closeExternalPersonModal();

                // 신규 등록된 외부인력을 참석자로 자동 추가
                tempSelectedAttendees.push({
                    id: newPerson.idx,
                    type: 'external',
                    name: newPerson.name,
                    dept: newPerson.companyName,
                    position: newPerson.position,
                    meetingExpense: 0
                });

                renderSelectedBadges(); // 선택된 참석자 배지 업데이트

                // 목록 새로고침
                await loadExternalPersons();
            } else {
                showError('외부인력 등록에 실패했습니다.');
            }
        } catch (error) {
            console.error('외부인력 등록 오류:', error);
            showError('외부인력 등록 중 오류가 발생했습니다.');
        }
    };

    // ============================================
    // 상세보기 모드: URL에서 ID 파라미터 확인 및 데이터 로드
    // ============================================
    function getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    async function loadReceiptMeetingData(id) {
        try {
            const response = await fetch(`/api/receipt-meetings/${id}`);

            if (!response.ok) {
                throw new Error(`데이터 로드 실패: ${response.status}`);
            }

            const data = await response.json();

            // 폼에 데이터 채우기
            populateForm(data);

            // 저장 버튼 숨기기, 수정/삭제 버튼 표시 (상세보기 모드)
            if (saveBtn) {
                saveBtn.style.display = 'none';
            }
            const updateBtn = document.getElementById('updateBtn');
            const deleteBtn = document.getElementById('deleteBtn');
            if (updateBtn) {
                updateBtn.style.display = 'inline-block';
            }
            if (deleteBtn) {
                deleteBtn.style.display = 'inline-block';
            }

            return data;
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            showError('데이터를 불러오는데 실패했습니다.');
        }
    }

    function populateForm(data) {

        // 프로젝트 선택
        const projectInput = document.getElementById('common_project');
        const projectIdxInput = document.getElementById('selectedProjectIdx');
        if (data.projectIdx) {
            const project = projects.find(p => p.idx === data.projectIdx);
            if (project) {
                selectedProject = project;
                if (projectInput) {
                    projectInput.value = project.projectName;
                }
                if (projectIdxInput) {
                    projectIdxInput.value = project.idx;
                }
                // 자동 채우기
                document.querySelectorAll('.auto-project').forEach(field => {
                    field.value = project.projectName;
                });
                // 프로젝트 팀원 로드 및 카드 목록 로드
                loadProjectMembers(project.idx);
                loadProjectCards(project.idx);
            }
        }

        // 카드 정보
        const cardInput = document.getElementById('common_card');
        const cardIdxInput = document.getElementById('selectedCardIdx');
        if (data.cardIdx && data.cardName) {
            if (cardInput) {
                cardInput.value = data.cardName;
                cardInput.placeholder = '클릭하여 카드 선택';
            }
            if (cardIdxInput) {
                cardIdxInput.value = data.cardIdx;
            }
            selectedCard = { idx: data.cardIdx, cardName: data.cardName };
        }

        // 작성자 정보
        const authorInput = document.getElementById('common_author');
        const authorIdInput = document.getElementById('common_author_id');
        if (data.authorId && data.authorName) {
            if (authorInput) {
                authorInput.value = data.authorName;
            }
            if (authorIdInput) {
                authorIdInput.value = data.authorId;
            }
            // 인쇄용 템플릿도 업데이트
            document.querySelectorAll('.auto-author').forEach(field => {
                field.value = data.authorName;
                field.style.color = '';
            });
        }

        // 회의 일자
        const dateInput = document.getElementById('common_date');
        if (dateInput && data.meetingDate) {
            dateInput.value = data.meetingDate;
        }

        // 시작 시간
        const startTimeInput = document.getElementById('common_start_time');
        if (startTimeInput && data.startTime) {
            startTimeInput.value = data.startTime.substring(0, 5); // HH:mm 형식
        }

        // 종료 시간
        const endTimeInput = document.getElementById('common_end_time');
        if (endTimeInput && data.endTime) {
            endTimeInput.value = data.endTime.substring(0, 5); // HH:mm 형식
        }

        // 장소
        const locationInput = document.getElementById('common_location');
        if (locationInput && data.location) {
            locationInput.value = data.location;
        }

        // 금액
        const amountInput = document.getElementById('common_amount');
        if (amountInput && data.amount) {
            amountInput.value = data.amount;
        }

        // 목적
        const purposeInput = document.getElementById('common_purpose');
        if (purposeInput && data.purpose) {
            purposeInput.value = data.purpose;
        }

        // 내용
        const contentInput = document.getElementById('common_content');
        if (contentInput && data.content) {
            contentInput.value = data.content;
        }

        // 지불 방법
        const paymentInput = document.getElementById('common_payment');
        if (paymentInput && data.paymentMethod) {
            paymentInput.value = data.paymentMethod;
        }

        // 비고
        const notesInput = document.getElementById('common_notes');
        if (notesInput && data.notes) {
            notesInput.value = data.notes;
        }

        // 회의록 특이사항
        const minutesNotesInput = document.getElementById('common_minutes_notes');
        if (minutesNotesInput && data.minutesNotes) {
            minutesNotesInput.value = data.minutesNotes;
        }

        // 참석자 목록
        if (data.attendees && data.attendees.length > 0) {
            currentAttendees = data.attendees.map(attendee => {
                let position = attendee.position || ''; // API에서 받은 직책 정보 사용
                let dept = attendee.department || '';

                // 내부 참석자인 경우
                if (attendee.attendeeType === '내부' && attendee.userIdx) {
                    dept = '파인씨앤아이'; // 내부 참석자는 소속을 파인씨앤아이로 통일
                }

                // ID: userIdx 사용 (내부/외부 모두 동일)
                const id = attendee.userIdx;
                const type = attendee.attendeeType === '외부' ? 'external' : 'internal';

                return {
                    id: id,
                    name: attendee.name,
                    dept: dept,
                    position: position,
                    type: type
                };
            });

        }

        // 모든 input 이벤트 트리거하여 자동 채우기 활성화
        setTimeout(() => {
            // 날짜/시간 자동 채우기 트리거
            if (dateInput) {
                dateInput.dispatchEvent(new Event('input'));
            }
            if (startTimeInput) {
                startTimeInput.dispatchEvent(new Event('input'));
            }
            if (endTimeInput) {
                endTimeInput.dispatchEvent(new Event('input'));
            }

            // 장소 자동 채우기
            if (locationInput) {
                locationInput.dispatchEvent(new Event('input'));
            }

            // 목적 자동 채우기 (회의 주제로도 사용)
            if (purposeInput) {
                purposeInput.dispatchEvent(new Event('input'));
            }

            // 내용 자동 채우기
            if (contentInput) {
                contentInput.dispatchEvent(new Event('input'));
            }

            // 금액 자동 채우기
            if (amountInput) {
                amountInput.dispatchEvent(new Event('input'));
            }

            // 비고 자동 채우기
            if (notesInput) {
                notesInput.dispatchEvent(new Event('input'));
            }

            // 회의록 특이사항 자동 채우기
            if (minutesNotesInput) {
                minutesNotesInput.dispatchEvent(new Event('input'));
            }

            // 지불 방법 자동 채우기
            if (paymentInput) {
                paymentInput.dispatchEvent(new Event('change'));
            }

            // 참석자 목록 렌더링 - 이것이 회의품의서와 회의록의 참석자를 모두 업데이트함
            const attendeeListElement = document.getElementById('attendeeList');
            if (attendeeListElement) {
                if (currentAttendees.length === 0) {
                    attendeeListElement.innerHTML = `
                        <div class="empty-attendee-state">
                            <i class="fas fa-user-plus"></i>
                            <div>클릭하여 참석자 추가</div>
                        </div>
                    `;
                } else {
                    attendeeListElement.innerHTML = currentAttendees.map(attendee => `
                        <div class="trip-person-item">
                            <div class="trip-person-info">
                                <span class="name">${attendee.name}</span>
                                <span>${attendee.dept}</span>
                                <span>${attendee.position || ''}</span>
                            </div>
                            <button type="button" class="trip-person-remove attendee-remove" onclick="removeAttendeeInTemplate('${attendee.id}')">
                                <i class="fas fa-times"></i> 삭제
                            </button>
                        </div>
                    `).join('');
                }

                // 회의 품의서의 참석인원 업데이트
                const meetingPurposeRow = document.getElementById('meeting_purpose_row');
                if (meetingPurposeRow) {
                    const meetingPurposeCell = document.querySelector('.meeting-purpose-cell');
                    const meetingPurposeHeader = document.getElementById('meeting_purpose_header');

                    const existingRows = document.querySelectorAll('.attendee-row');
                    existingRows.forEach(row => row.remove());

                    const grouped = {};
                    currentAttendees.forEach(attendee => {
                        const type = attendee.type === 'external' ? '외부' : '내부';
                        const dept = attendee.type === 'external' ? attendee.dept : '파인씨앤아이';

                        const key = `${type}_${dept}`;
                        if (!grouped[key]) {
                            grouped[key] = {
                                type: type,
                                dept: dept,
                                names: []
                            };
                        }
                        if (attendee.name) {
                            grouped[key].names.push(attendee.name);
                        }
                    });

                    const groupedArray = Object.values(grouped);
                    const minRows = 2;
                    const rowsToAdd = Math.max(groupedArray.length, minRows);

                    const totalRowspan = rowsToAdd + 1;
                    if (meetingPurposeCell) {
                        meetingPurposeCell.setAttribute('rowspan', totalRowspan);
                    }
                    if (meetingPurposeHeader) {
                        meetingPurposeHeader.setAttribute('rowspan', totalRowspan);
                    }

                    let insertAfter = meetingPurposeRow;
                    for (let i = 0; i < rowsToAdd; i++) {
                        const row = document.createElement('tr');
                        row.className = 'attendee-row';

                        if (i < groupedArray.length) {
                            const group = groupedArray[i];
                            let nameDisplay = '';

                            if (group.names.length > 0) {
                                nameDisplay = group.names[0];
                                if (group.names.length > 1) {
                                    nameDisplay += ` 외${group.names.length - 1}명`;
                                }
                            }

                            row.innerHTML = `
                                <td style="border: 1px solid #ddd; padding: 5px; text-align: center;">
                                    <span>${group.type}</span>
                                </td>
                                <td style="border: 1px solid #ddd; padding: 5px; text-align: center;"><span>${group.dept || ''}</span></td>
                                <td style="border: 1px solid #ddd; padding: 5px; text-align: center;"><span>${nameDisplay}</span></td>
                            `;
                        } else {
                            row.innerHTML = `
                                <td style="border: 1px solid #ddd; padding: 5px;">&nbsp;</td>
                                <td style="border: 1px solid #ddd; padding: 5px;">&nbsp;</td>
                                <td style="border: 1px solid #ddd; padding: 5px;">&nbsp;</td>
                            `;
                        }

                        insertAfter.parentNode.insertBefore(row, insertAfter.nextSibling);
                        insertAfter = row;
                    }
                }

                // 회의록 참석자 정보 업데이트
                const internalAttendees = currentAttendees.filter(a => a.name && a.name.trim() && a.type === 'internal');
                const externalAttendees = currentAttendees.filter(a => a.name && a.name.trim() && a.type === 'external');

                let allAttendeesText = '';

                if (internalAttendees.length > 0) {
                    const names = internalAttendees.map(a => a.name.trim());
                    allAttendeesText = names.join(', ') + '(파인씨앤아이)';
                }

                if (externalAttendees.length > 0) {
                    const externalTexts = externalAttendees.map(a => `${a.name.trim()}(${a.dept || '외부'})`);
                    if (allAttendeesText) {
                        allAttendeesText += ', ' + externalTexts.join(', ');
                    } else {
                        allAttendeesText = externalTexts.join(', ');
                    }
                }

                document.querySelectorAll('.auto-all-attendees').forEach(field => {
                    field.textContent = allAttendeesText;
                });

                // 참석자 명단 테이블 채우기 (성명, 소속) - 왼쪽 열부터 채우기
                const attendeeSigNames = document.querySelectorAll('.attendee-sig-name');
                const attendeeSigDepts = document.querySelectorAll('.attendee-sig-dept');

                // 모든 필드 초기화
                attendeeSigNames.forEach(el => el.value = '');
                attendeeSigDepts.forEach(el => el.value = '');

                currentAttendees.forEach((attendee, idx) => {
                    if (idx < attendeeSigNames.length) {
                        attendeeSigNames[idx].value = attendee.name || '';

                        // 소속과 직책 함께 표시
                        let deptText = attendee.dept || '';
                        if (attendee.position && attendee.position.trim()) {
                            deptText = deptText ? `${deptText} (${attendee.position})` : attendee.position;
                        }
                        attendeeSigDepts[idx].value = deptText;
                    }
                });
            }

        }, 100);
    }

    // URL에 ID 파라미터가 있으면 데이터 로드
    const receiptMeetingId = getUrlParameter('id');
    if (receiptMeetingId) {
        // 외부인력 목록을 먼저 로드한 후 데이터 로드
        setTimeout(async () => {
            // 외부인력 목록 로드
            if (typeof loadExternalPersons === 'function') {
                await loadExternalPersons();
            }

            // 데이터 로드
            await loadReceiptMeetingData(receiptMeetingId);

            // 데이터 로드 후 참석자 목록 렌더링 (이미 선택된 참석자 표시)
            // 통합 모달 사용으로 별도 렌더링 불필요
        }, 800);
    }


    // 수정 버튼 이벤트
    const updateBtn = document.getElementById('updateBtn');
    if (updateBtn) {
        updateBtn.addEventListener('click', async function() {
            const receiptMeetingId = getUrlParameter('id');
            if (!receiptMeetingId) {
                showError('문서 ID를 찾을 수 없습니다.');
                return;
            }

            const projectIdxInput = document.getElementById('selectedProjectIdx');
            const dateInput = document.getElementById('common_date');
            const startTimeInput = document.getElementById('common_start_time');
            const endTimeInput = document.getElementById('common_end_time');
            const locationInput = document.getElementById('common_location');

            if (!projectIdxInput || !projectIdxInput.value) {
                showWarning('프로젝트를 선택해주세요.');
                return;
            }
            if (!dateInput || !dateInput.value) {
                showWarning('회의 일자를 입력해주세요.');
                return;
            }
            if (!startTimeInput || !startTimeInput.value) {
                showWarning('시작 시간을 입력해주세요.');
                return;
            }
            if (!endTimeInput || !endTimeInput.value) {
                showWarning('종료 시간을 입력해주세요.');
                return;
            }
            if (!locationInput || !locationInput.value) {
                showWarning('장소를 입력해주세요.');
                return;
            }

            if (!(await showConfirm('회의록을 수정하시겠습니까?'))) {
                return;
            }

            const attendeeDTOs = currentAttendees.map((attendee, index) => {
                return {
                    attendeeType: attendee.type === 'external' ? '외부' : '내부',
                    department: attendee.dept || null,
                    name: attendee.name,
                    userIdx: parseInt(attendee.id),
                    position: attendee.position || null,
                    displayOrder: index
                };
            });

            // 작성자 정보 가져오기
            const authorIdInput = document.getElementById('common_author_id');
            const authorInput = document.getElementById('common_author');

            // 카드 정보 가져오기
            const cardIdxInput = document.getElementById('selectedCardIdx');

            const updateData = {
                projectIdx: parseInt(projectIdxInput.value),
                cardIdx: cardIdxInput?.value ? parseInt(cardIdxInput.value) : null,
                authorId: authorIdInput?.value ? parseInt(authorIdInput.value) : null,
                authorName: authorInput?.value || null,
                meetingDate: dateInput.value,
                startTime: startTimeInput.value + ':00',
                endTime: endTimeInput.value + ':00',
                location: locationInput.value,
                amount: document.getElementById('common_amount')?.value ? parseFloat(document.getElementById('common_amount').value) : null,
                purpose: document.getElementById('common_purpose')?.value || null,
                content: document.getElementById('common_content')?.value || null,
                paymentMethod: document.getElementById('common_payment')?.value || null,
                notes: document.getElementById('common_notes')?.value || null,
                minutesNotes: document.getElementById('common_minutes_notes')?.value || null,
                attendees: attendeeDTOs
            };

            try {
                const response = await fetch(`/api/receipt-meetings/${receiptMeetingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                });

                if (response.ok) {
                    showSuccess('회의록이 수정되었습니다.');
                    window.location.reload();
                } else {
                    showError('회의록 수정에 실패했습니다.');
                }
            } catch (error) {
                console.error('수정 오류:', error);
                showError('회의록 수정 중 오류가 발생했습니다.');
            }
        });
    }

    // 삭제 버튼 이벤트
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function() {
            const receiptMeetingId = getUrlParameter('id');
            if (!receiptMeetingId) {
                showError('문서 ID를 찾을 수 없습니다.');
                return;
            }

            if (!(await showDeleteConfirm('회의록'))) {
                return;
            }

            try {
                const response = await fetch(`/api/receipt-meetings/${receiptMeetingId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    showSuccess('회의록이 삭제되었습니다.');
                    window.location.href = '/project/documents';
                } else {
                    showError('회의록 삭제에 실패했습니다.');
                }
            } catch (error) {
                console.error('삭제 오류:', error);
                showError('회의록 삭제 중 오류가 발생했습니다.');
            }
        });
    }

    // 템플릿 전환 비활성화
    templateTreeHeaders.forEach(header => {
        header.style.pointerEvents = 'none';
    });

    // ============================================
    // 금액 증가/초기화 함수
    // ============================================

    // 금액 추가 함수
    window.addAmount = function(value) {
        const amountInput = document.getElementById('common_amount');
        if (!amountInput) return;

        // 현재 금액 가져오기 (쉼표 제거)
        let currentAmount = amountInput.value.replace(/,/g, '').trim();
        currentAmount = currentAmount ? parseInt(currentAmount) : 0;

        // 새 금액 계산
        const newAmount = currentAmount + value;

        // 천단위 쉼표 포맷팅
        amountInput.value = newAmount.toLocaleString('ko-KR');

        // input 이벤트 트리거 (자동 채우기 및 경고 업데이트)
        amountInput.dispatchEvent(new Event('input'));
    };

    // 금액 초기화 함수
    window.resetAmount = function() {
        const amountInput = document.getElementById('common_amount');
        if (!amountInput) return;

        amountInput.value = '';

        // input 이벤트 트리거 (자동 채우기 및 경고 업데이트)
        amountInput.dispatchEvent(new Event('input'));
    };

});
