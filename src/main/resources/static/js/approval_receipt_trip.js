// 연구비 증빙 - 출장 페이지 JavaScript
console.log('🎯 approval_receipt_trip.js 파일 로드 시작');

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎯 DOMContentLoaded 이벤트 발생');
    // 전역 변수
    let selectedApprovers = [];
    let selectedReceiptFiles = [];
    let selectedDocumentFiles = [];
    let existingReceiptAttachments = [];   // RECEIPT 타입 기존 파일
    let existingDocumentAttachments = [];  // DOCUMENT 타입 기존 파일
    let deletedAttachmentIds = [];         // 삭제 예정 첨부파일 ID 목록
    let selectedEmployee = null;
    let currentUser = null; // 현재 로그인한 사용자
    let projects = []; // 프로젝트 목록
    let projectMembers = []; // 선택된 프로젝트의 팀원 목록
    let projectExpenseSettings = []; // 선택된 프로젝트의 직급별 경비 설정 (출장비)
    let fixedExpenses = {}; // 기초정보관리의 직급별 고정경비 (출장비)
    let fixedMealExpenses = {}; // 기초정보관리의 직급별 고정경비 (중식비)
    let currentProject = null; // 현재 선택된 프로젝트 전체 정보
    window.currentTripPersons = []; // 현재 추가된 출장 인원 목록 (전역)
    let duplicateTripPersonsInfo = {}; // 중복된 출장인원 정보 {personId: {tripDate, projectName}}
    let tripReporter = null; // 작성자 필드 (템플릿 로드 후 설정)
    let guideMealTotal = 0; // 선택 인원 기준 식비 합계
    let guideDailyTotal = 0; // 선택 인원 기준 일비 합계

    // DOM 요소
    const templateTreeHeaders = document.querySelectorAll('.tree-node-header[data-template]');
    const categoryNodes = document.querySelectorAll('.tree-node-header.category-node');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const documentForm = document.getElementById('documentForm');
    const approverChips = document.getElementById('approverChips');
    const receiptInput = document.getElementById('receiptInput');
    const receiptFileList = document.getElementById('receiptFileList');
    const receiptUploadArea = document.getElementById('receiptUploadArea');
    const documentInput = document.getElementById('documentInput');
    const documentFileList = document.getElementById('documentFileList');
    const documentUploadArea = document.getElementById('documentUploadArea');
    const approverModal = document.getElementById('approverModal');
    const employeeList = document.getElementById('employeeList');
    const approverSearch = document.getElementById('approverSearch');
    const submitBtn = document.getElementById('submitBtn');

    // 직원 데이터 (API로 로드)
    let employees = [];

    async function loadEmployees() {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const users = await response.json();
                employees = users.map(user => ({
                    id: user.idx,
                    name: user.empName,
                    position: user.empPositionName || user.empPosition || '직급 미지정',
                    dept: user.empDept || '부서 미지정'
                }));
                console.log('직원 데이터 로드 완료:', employees.length + '명');
            } else {
                console.error('직원 데이터 로드 실패:', response.status);
                showError('직원 데이터를 불러오는데 실패했습니다. 관리자에게 문의하세요.');
            }
        } catch (error) {
            console.error('직원 데이터 로드 오류:', error);
            showError('직원 데이터를 불러오는데 오류가 발생했습니다.');
        }
    }

    // 현재 사용자 정보 로드
    async function loadCurrentUser() {
        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                currentUser = await response.json();
                console.log('현재 사용자 정보:', currentUser);

                // 공통정보입력의 작성자 필드 채우기
                const tripReporter = document.getElementById('trip_reporter');
                if (tripReporter) {
                    tripReporter.value = currentUser.empName || '';
                }

                // 출장복명서의 복명자 필드 채우기
                document.querySelectorAll('.trip-auto-reporter').forEach(field => {
                    field.textContent = currentUser.empName || '';
                });
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
                // 최근 등록된 순서로 정렬 (createdAt 기준 내림차순)
                projects.sort((a, b) => {
                    const dateA = new Date(a.createdAt);
                    const dateB = new Date(b.createdAt);
                    return dateB - dateA; // 최신순
                });
                console.log('프로젝트 목록 로드 성공:', projects.length + '건');
            } else {
                console.error('프로젝트 목록 로드 실패');
            }
        } catch (error) {
            console.error('프로젝트 목록 로드 오류:', error);
        }
    }

    // 프로젝트 팀원 목록 로드
    async function loadProjectMembers(projectIdx) {
        if (!projectIdx) {
            projectMembers = [];
            projectExpenseSettings = [];
            currentProject = null;
            return;
        }

        try {
            const response = await fetch(`/api/projects/${projectIdx}`);

            // Content-Type 확인
            const contentType = response.headers.get('content-type');

            if (response.ok && contentType && contentType.includes('application/json')) {
                const project = await response.json();
                projectMembers = project.projectMembers || [];
                projectExpenseSettings = project.projectExpenseSettings || [];
                currentProject = project; // 전체 프로젝트 정보 저장
                console.log('프로젝트 팀원 로드 성공:', projectMembers.length + '명');
                console.log('팀원 데이터:', projectMembers);
                console.log('프로젝트 경비 설정 로드:', projectExpenseSettings);
                console.log('프로젝트 정보:', currentProject);
            } else {
                console.error('프로젝트 팀원 로드 실패 - Status:', response.status, 'Content-Type:', contentType);
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    console.error('응답 내용 (처음 200자):', text.substring(0, 200));
                }
                projectMembers = [];
                projectExpenseSettings = [];
                currentProject = null;
            }
        } catch (error) {
            console.error('프로젝트 팀원 로드 오류:', error);
            projectMembers = [];
            projectExpenseSettings = [];
            currentProject = null;
        }
    }

    // 기초정보관리에서 직급별 고정경비 로드 (출장비, 중식비)
    async function loadFixedExpenses() {
        try {
            const response = await fetch('/api/fixed-expense-policies');
            if (response.ok) {
                const data = await response.json();
                // 직급별로 출장비와 중식비 매핑
                fixedExpenses = {};
                fixedMealExpenses = {};
                data.forEach(item => {
                    if (item.positionName && item.amount) {
                        // 출장비
                        if (item.expenseItemName === '출장비') {
                            fixedExpenses[item.positionName] = item.amount;
                        }
                        // 중식비 (식비로 사용)
                        else if (item.expenseItemName === '중식비') {
                            fixedMealExpenses[item.positionName] = item.amount;
                        }
                    }
                });
                console.log('직급별 고정 출장비 로드:', fixedExpenses);
                console.log('직급별 고정 중식비 로드:', fixedMealExpenses);
            } else {
                console.error('직급별 고정경비 로드 실패:', response.status);
            }
        } catch (error) {
            console.error('직급별 고정경비 로드 오류:', error);
        }
    }

    // ============================================
    // SweetAlert2 유틸리티 함수들
    // ============================================

    function showSuccess(message) {
        return Swal.fire({
            icon: 'success',
            title: '성공',
            text: message,
            confirmButtonText: '확인'
        });
    }

    function showWarning(message) {
        return Swal.fire({
            icon: 'warning',
            title: '경고',
            html: message,
            confirmButtonText: '확인'
        });
    }

    function showError(message) {
        return Swal.fire({
            icon: 'error',
            title: '오류',
            html: message,
            confirmButtonText: '확인'
        });
    }

    function showConfirm(message, title = '확인', options = {}) {
        return Swal.fire({
            icon: options.icon || 'question',
            title: title,
            html: message,
            showCancelButton: true,
            confirmButtonText: options.confirmText || '확인',
            cancelButtonText: options.cancelText || '취소',
            confirmButtonColor: options.confirmColor || '#667eea',
            cancelButtonColor: options.cancelColor || '#94a3b8'
        });
    }

    function showDeleteConfirm(message = '정말 삭제하시겠습니까?') {
        return Swal.fire({
            icon: 'warning',
            title: '삭제 확인',
            html: message,
            showCancelButton: true,
            confirmButtonText: '삭제',
            cancelButtonText: '취소',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8'
        }).then(result => result.isConfirmed);
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
            }
        }
        return result;
    }

    function matchesSearch(text, keyword) {
        if (!keyword) return true;
        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();

        // 일반 검색
        if (lowerText.includes(lowerKeyword)) return true;

        // 초성 검색
        const chosung = getChosung(text);
        return chosung.includes(lowerKeyword);
    }

    // 하이라이트 처리 함수
    function highlightText(text, keyword) {
        if (!text || !keyword) return text;
        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();

        // 일반 문자열 매칭
        if (lowerText.includes(lowerKeyword)) {
            const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            return text.replace(regex, '<mark class="search-highlight">$1</mark>');
        }

        // 초성 매칭
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
    function renderProjectList(projectsToShow, keyword = '') {
        if (!projectList) return;

        if (!projectsToShow || projectsToShow.length === 0) {
            projectList.innerHTML = '<div class="empty-state">프로젝트가 없습니다.</div>';
            return;
        }

        projectList.innerHTML = '';

        projectsToShow.forEach(proj => {
            const projectName = proj.projectName || '이름 없음';
            const leader = proj.projectManagerName || '-';
            const memberCount = proj.memberCount || 0;
            const startDate = proj.startDate ? new Date(proj.startDate).toLocaleDateString('ko-KR') : '-';
            const endDate = proj.endDate ? new Date(proj.endDate).toLocaleDateString('ko-KR') : '-';

            const item = document.createElement('div');
            item.className = 'modal-item';
            item.innerHTML = `
                <div class="modal-item-info">
                    <div class="modal-item-name">${projectName}</div>
                    <div class="modal-item-detail">
                        <div><i class="fas fa-user"></i> ${leader} (${memberCount}명)</div>
                        <div><i class="fas fa-calendar"></i> ${startDate} ~ ${endDate}</div>
                    </div>
                </div>
            `;

            // 클릭 이벤트 리스너 추가
            item.addEventListener('click', async function() {
                await selectProject(proj.idx);
            });

            projectList.appendChild(item);
        });
    }

    // 프로젝트 선택
    window.selectProject = async function(projectIdx) {
        const proj = projects.find(p => p.idx == projectIdx);
        if (!proj) {
            console.error('프로젝트를 찾을 수 없습니다:', projectIdx);
            console.log('전체 프로젝트 목록:', projects);
            console.log('전체 프로젝트 수:', projects.length);
            showError(`프로젝트를 찾을 수 없습니다. (ID: ${projectIdx})<br>페이지를 새로고침해주세요.`);
            return;
        }

        console.log('프로젝트 선택:', proj);

        // 프로젝트 변경 시 출장인원 초기화
        window.currentTripPersons = [];
        console.log('프로젝트 변경으로 출장인원 초기화');

        // 프로젝트 팀원 로드
        await loadProjectMembers(projectIdx);

        // 프로젝트 입력 필드에 표시
        const tripProject = document.getElementById('trip_project');
        if (tripProject) {
            tripProject.value = proj.projectName;
            tripProject.style.borderColor = ''; // 빨간색 제거
        }
        const selectedProjectIdx = document.getElementById('selectedProjectIdx');
        if (selectedProjectIdx) {
            selectedProjectIdx.value = proj.idx;
        }

        // 출장복명서의 과제명 자동 채우기
        document.querySelectorAll('.trip-auto-project').forEach(field => {
            field.textContent = proj.projectName || '';
        });

        // 기본 작성자 자동 설정
        setDefaultReporter();

        // 프로젝트 변경 시 중복 검증 재실행
        await window.checkAllTripPersonsForDuplicates();

        // 날짜가 선택된 경우, 선택 가능한 인원이 있는지 확인
        const dateInput = document.getElementById('trip_date');
        if (dateInput && dateInput.value && projectMembers && projectMembers.length > 0) {
            // 프로젝트 팀원 전체 ID 목록
            const allMemberIds = projectMembers.map(m => m.employeeIdx);

            // 중복된 인원 ID 목록
            const duplicateIds = Object.keys(duplicateTripPersonsInfo).map(id => parseInt(id));

            // 선택 가능한 인원 수 = 전체 인원 - 중복 인원
            const availableCount = allMemberIds.filter(id => !duplicateIds.includes(id)).length;

            if (availableCount === 0) {
                await Swal.fire({
                    icon: 'warning',
                    title: '선택 가능한 인원이 없습니다',
                    html: `
                        <div style="text-align: left; line-height: 1.8;">
                            <p style="margin-bottom: 12px;">
                                <strong>${dateInput.value}</strong> 날짜에는<br>
                                모든 프로젝트 팀원이 이미 다른 일정에 참여 중입니다.
                            </p>
                            <p style="color: #64748b; font-size: 14px; margin-bottom: 8px;">
                                ▪ 회의, 야근, 출장 중 하나 이상에 참석
                            </p>
                            <p style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 6px; font-size: 14px;">
                                💡 <strong>해결 방법:</strong><br>
                                출장 날짜를 다른 날짜로 변경해주세요.
                            </p>
                        </div>
                    `,
                    confirmButtonText: '확인',
                    confirmButtonColor: '#667eea'
                });

                // 출장인원 초기화
                window.currentTripPersons = [];
                if (typeof window.renderTripPersonListInTemplate === 'function') {
                    window.renderTripPersonListInTemplate();
                }

                // 작성자 필드 초기화
                const tripReporter = document.getElementById('trip_reporter');
                if (tripReporter) {
                    tripReporter.value = '';
                    tripReporter.setAttribute('data-reporter-id', '');
                }
            }
        }

        closeProjectModal();
    };

    // ── 프로젝트 연도 필터 ──────────────────────────────────────
    let selectedYear = null;
    let currentSearchKeyword = '';

    function renderYearButtons() {
        const SERVICE_START = 2026;
        const currentYear = new Date().getFullYear();
        const recentStart = Math.max(currentYear - 2, SERVICE_START);
        const existing = document.getElementById('projectYearFilter');
        if (existing) existing.remove();
        const container = document.createElement('div');
        container.id = 'projectYearFilter';
        container.style.cssText = 'display:flex; gap:6px; padding:8px 12px; border-bottom:1px solid #eee; flex-wrap:wrap; align-items:center;';
        // 전체 버튼
        const allBtn = document.createElement('button');
        allBtn.type = 'button';
        allBtn.textContent = '전체';
        const allActive = selectedYear === null;
        allBtn.style.cssText = `padding:3px 10px; border-radius:12px; border:1px solid ${allActive ? '#667eea' : '#ddd'}; background:${allActive ? '#667eea' : 'white'}; color:${allActive ? 'white' : '#555'}; cursor:pointer; font-size:12px;`;
        allBtn.addEventListener('click', () => { selectedYear = null; renderYearButtons(); applyProjectFilters(); });
        container.appendChild(allBtn);
        // 오래된 연도 드롭다운 (서비스 시작연도 ~ 최근 3개년 이전)
        if (recentStart > SERVICE_START) {
            const select = document.createElement('select');
            const hasOldSelected = selectedYear !== null && selectedYear < recentStart;
            select.style.cssText = `padding:3px 8px; border-radius:12px; border:1px solid ${hasOldSelected ? '#667eea' : '#ddd'}; background:${hasOldSelected ? '#eef0ff' : 'white'}; color:#555; cursor:pointer; font-size:12px; outline:none;`;
            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = '연도선택';
            select.appendChild(defaultOpt);
            for (let y = SERVICE_START; y < recentStart; y++) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y + '년';
                if (selectedYear === y) opt.selected = true;
                select.appendChild(opt);
            }
            select.addEventListener('change', function() {
                if (this.value) { selectedYear = parseInt(this.value); renderYearButtons(); applyProjectFilters(); }
            });
            container.appendChild(select);
        }
        // 최근 3개년 버튼 (서비스 시작연도부터 최대 3개)
        for (let year = recentStart; year <= currentYear; year++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = year + '년';
            const isActive = selectedYear === year;
            btn.style.cssText = `padding:3px 10px; border-radius:12px; border:1px solid ${isActive ? '#667eea' : '#ddd'}; background:${isActive ? '#667eea' : 'white'}; color:${isActive ? 'white' : '#555'}; cursor:pointer; font-size:12px;`;
            btn.addEventListener('click', () => { selectedYear = year; renderYearButtons(); applyProjectFilters(); });
            container.appendChild(btn);
        }
        if (projectList && projectList.parentNode) {
            projectList.parentNode.insertBefore(container, projectList);
        }
    }

    function applyProjectFilters() {
        let filtered = projects;
        if (selectedYear !== null) {
            filtered = filtered.filter(proj => {
                const s = proj.startDate ? new Date(proj.startDate).getFullYear() : null;
                const e = proj.endDate ? new Date(proj.endDate).getFullYear() : null;
                if (s !== null && e !== null) return s <= selectedYear && e >= selectedYear;
                if (s !== null) return s <= selectedYear;
                if (e !== null) return e >= selectedYear;
                return true;
            });
        }
        if (currentSearchKeyword) {
            filtered = filtered.filter(proj =>
                matchesSearch(proj.projectName || '', currentSearchKeyword) ||
                matchesSearch(proj.projectManagerName || '', currentSearchKeyword)
            );
        }
        renderProjectList(filtered, currentSearchKeyword);
    }

    // 프로젝트 검색
    if (projectSearch) {
        projectSearch.addEventListener('input', function() {
            currentSearchKeyword = this.value.trim();
            applyProjectFilters();
        });
    }

    // 프로젝트 모달 열기
    window.openProjectModal = async function() {
        if (!projectModal) {
            console.error('projectModal 요소를 찾을 수 없습니다.');
            showError('프로젝트 선택 모달을 찾을 수 없습니다. 페이지를 새로고침해주세요.');
            return;
        }

        // 프로젝트 목록이 비어있으면 다시 로드
        if (!projects || projects.length === 0) {
            console.log('프로젝트 목록이 비어있어서 재로드합니다.');
            await loadProjects();
        }

        selectedYear = null;
        currentSearchKeyword = '';
        projectModal.classList.add('show');
        if (projectSearch) projectSearch.value = '';
        renderYearButtons();
        renderProjectList(projects);
    };

    // 프로젝트 모달 닫기
    window.closeProjectModal = function() {
        if (projectModal) {
            projectModal.classList.remove('show');
            if (projectSearch) projectSearch.value = '';
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
    // 작성자 선택 모달
    // ============================================
    const reporterModal = document.getElementById('reporterModal');
    const reporterList = document.getElementById('reporterList');

    // 작성자 선택 모달 열기
    window.openReporterModal = function() {
        console.log('🚀 openReporterModal 호출됨');
        console.log('reporterModal:', reporterModal);
        console.log('projectMembers:', projectMembers);

        if (!reporterModal) {
            console.error('❌ reporterModal 요소를 찾을 수 없습니다.');
            return;
        }

        // 프로젝트가 선택되지 않았으면 경고
        if (!projectMembers || projectMembers.length === 0) {
            console.warn('⚠️ 프로젝트가 선택되지 않음');
            showWarning('프로젝트를 먼저 선택해주세요.');
            return;
        }

        console.log('✅ 모달 열기 성공');
        reporterModal.classList.add('show');
        renderReporterList();
    };

    // 작성자 선택 모달 닫기
    window.closeReporterModal = function() {
        if (reporterModal) {
            reporterModal.classList.remove('show');
        }
    };

    // 작성자 목록 렌더링
    function renderReporterList() {
        if (!reporterList) return;

        // 출장인원이 있으면 출장인원 목록, 없으면 프로젝트 팀원 목록 표시
        let personsToShow = [];
        if (window.currentTripPersons && window.currentTripPersons.length > 0) {
            personsToShow = [...window.currentTripPersons];
        } else if (projectMembers && projectMembers.length > 0) {
            // 프로젝트 팀원 목록
            personsToShow = projectMembers.map(member => ({
                id: member.employeeIdx,
                name: member.employeeName,
                position: member.employeePositionName || '직급 미지정',
                dept: member.employeeDeptName || '부서 미지정'
            }));
        }

        if (personsToShow.length === 0) {
            reporterList.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">선택 가능한 인원이 없습니다.</div>';
            return;
        }

        // 직급순으로 정렬 (낮은 직급부터)
        const sortedPersons = sortByPosition([...personsToShow]);

        // 현재 선택된 작성자 ID
        const currentReporterId = tripReporter ? tripReporter.getAttribute('data-reporter-id') : null;

        reporterList.innerHTML = '';
        sortedPersons.forEach(person => {
            const isSelected = String(person.id) === String(currentReporterId);
            const selectedClass = isSelected ? ' selected' : '';
            const checkIcon = isSelected ? '<i class="fas fa-check-circle" style="color: #667eea; margin-left: auto;"></i>' : '';

            const item = document.createElement('div');
            item.className = `employee-item${selectedClass}`;
            item.innerHTML = `
                <div class="employee-info">
                    <div class="employee-name">${person.name}</div>
                    <div class="employee-detail">${person.position} · ${person.dept}</div>
                </div>
                ${checkIcon}
            `;

            // 클릭 이벤트 리스너 추가
            item.addEventListener('click', function() {
                selectReporter(person.id, person.name, person.position, person.dept);
            });

            reporterList.appendChild(item);
        });
    }

    // 작성자 선택
    window.selectReporter = function(reporterId, reporterName, position, dept) {
        if (tripReporter) {
            tripReporter.value = reporterName;
            tripReporter.setAttribute('data-reporter-id', reporterId);
        }

        // 출장복명서의 복명자 필드도 업데이트
        document.querySelectorAll('.trip-auto-reporter').forEach(field => {
            field.textContent = reporterName || '';
        });

        // 작성자를 출장인원에 자동 추가 (중복 체크)
        if (!window.currentTripPersons.some(p => String(p.id) === String(reporterId))) {
            window.currentTripPersons.push({
                id: String(reporterId),
                name: reporterName,
                position: position || '직급 미지정',
                dept: dept || '부서 미지정'
            });
            console.log('작성자 출장인원에 자동 추가:', reporterName);

            // 출장인원 목록 UI 업데이트
            if (typeof renderTripPersonListInTemplate === 'function') {
                renderTripPersonListInTemplate();
            }
        }

        console.log('작성자 변경:', reporterName);
        closeReporterModal();
    };

    // 모달 외부 클릭 시 닫기
    if (reporterModal) {
        reporterModal.addEventListener('click', function(e) {
            if (e.target === reporterModal) {
                closeReporterModal();
            }
        });
    }

    // 페이지 로드 시 데이터 로드
    Promise.all([loadCurrentUser(), loadProjects(), loadEmployees(), loadFixedExpenses()]).then(() => {
        console.log('초기 데이터 로드 완료');
    });

    // 직책 목록
    const positions = ['상무', '연구위원', '부장', '수석', '차장', '책임', '과장', '선임', '대리', '사원', '연구원'];

    // 작성자 기본 선택용 직급 순서 (낮은 직급부터)
    const authorPositionOrder = {
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
        '대표': 12,
        '대표이사': 12,
        // 연구원 직급
        '연구원': 1,
        '주임연구원': 2,
        '선임연구원': 3,
        '책임연구원': 4,
        '수석연구원': 5
    };

    // 직급으로 정렬 (낮은 직급부터)
    function sortByPosition(persons) {
        return persons.sort((a, b) => {
            const orderA = authorPositionOrder[a.position] || 999;
            const orderB = authorPositionOrder[b.position] || 999;
            return orderA - orderB;
        });
    }

    // 기본 작성자 설정 (출장인원 중 가장 낮은 직급)
    function setDefaultReporter() {
        // 프로젝트 팀원이 없으면 현재 사용자로 설정
        if (!projectMembers || projectMembers.length === 0) {
            const tripReporter = document.getElementById('trip_reporter');
            if (tripReporter && currentUser) {
                tripReporter.value = currentUser.empName || '';
                tripReporter.setAttribute('data-reporter-id', currentUser.idx || '');

                // 출장복명서의 복명자 필드도 업데이트
                document.querySelectorAll('.trip-auto-reporter').forEach(field => {
                    field.textContent = currentUser.empName || '';
                });
            }
            return;
        }

        // 프로젝트 팀원을 직급순으로 정렬 (높은 직급부터)
        const allMembers = projectMembers.map(member => ({
            id: member.employeeIdx,
            name: member.employeeName,
            position: member.employeePositionName || '직급 미지정',
            dept: member.employeeDeptName || '부서 미지정'
        }));

        const sortedPersons = sortByPosition([...allMembers]);
        sortedPersons.reverse(); // 높은 직급부터 정렬

        let defaultReporter;
        if (sortedPersons.length >= 3) {
            // 3명 이상이면 높은 직급순 3번째 (인덱스 2)
            defaultReporter = sortedPersons[2];
        } else {
            // 3명 미만이면 가장 낮은 직급 (마지막 사람)
            defaultReporter = sortedPersons[sortedPersons.length - 1];
        }

        if (defaultReporter) {
            const tripReporter = document.getElementById('trip_reporter');
            if (tripReporter) {
                tripReporter.value = defaultReporter.name;
                tripReporter.setAttribute('data-reporter-id', defaultReporter.id);
            }

            // 출장복명서의 복명자 필드도 업데이트
            document.querySelectorAll('.trip-auto-reporter').forEach(field => {
                field.textContent = defaultReporter.name || '';
            });

            // 작성자를 출장인원에 자동 추가 (중복 체크)
            if (!window.currentTripPersons.some(p => String(p.id) === String(defaultReporter.id))) {
                window.currentTripPersons.push(defaultReporter);
                console.log('작성자 출장인원에 자동 추가:', defaultReporter.name);

                // 출장인원 목록 UI 업데이트
                setTimeout(() => {
                    if (typeof window.renderTripPersonListInTemplate === 'function') {
                        window.renderTripPersonListInTemplate();
                    }
                }, 100);
            }

            console.log('기본 작성자 설정:', defaultReporter.name, '(직급:', defaultReporter.position + ')');
        }
    }

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

    // 템플릿 선택
    templateTreeHeaders.forEach(header => {
        header.addEventListener('click', function() {
            templateTreeHeaders.forEach(h => h.classList.remove('active'));
            this.classList.add('active');

            const template = this.getAttribute('data-template');
            loadTemplate(template);
        });
    });

    // 템플릿 로드
    function loadTemplate(templateKey) {
        const templateElement = document.getElementById('template-' + templateKey);
        if (templateElement) {
            documentForm.innerHTML = templateElement.innerHTML;
            if (templateKey === 'receipt-trip') {
                // DOM이 완전히 렌더링된 후 초기화 함수 호출
                setTimeout(() => {
                    setupTripAutoFill();
                    setupDocumentFormToggle();
                }, 0);
            }
        }
    }

    // 출장 자동 채우기 기능
    function setupTripAutoFill() {
        console.log('setupTripAutoFill 시작');

        const tripProject = document.getElementById('trip_project');
        const tripLocation = document.getElementById('trip_location');
        const tripDate = document.getElementById('trip_date');
        const tripDuration = document.getElementById('trip_duration');
        const tripPurpose = document.getElementById('trip_purpose');
        tripReporter = document.getElementById('trip_reporter'); // 전역 변수에 할당
        const tripResult = document.getElementById('trip_result');
        const tripPersonArea = document.getElementById('tripPersonArea');
        const tripPersonList = document.getElementById('tripPersonList');
        const dailyExpenseBody = document.getElementById('dailyExpenseBody');

        console.log('엘리먼트 확인:');
        console.log('- tripDate:', tripDate);
        console.log('- tripDuration:', tripDuration);
        console.log('- dailyExpenseBody:', dailyExpenseBody);

        let tripPersons = [];
        let dailyExpenses = [];

        // 프로젝트 input 클릭 시 모달 열기 이벤트 리스너 추가
        if (tripProject) {
            tripProject.addEventListener('click', openProjectModal);
        }

        // 작성자 필드 클릭 시 모달 열기 이벤트 리스너 추가
        if (tripReporter) {
            console.log('✅ trip_reporter 이벤트 리스너 등록');
            tripReporter.style.cursor = 'pointer';

            // 클릭 시 모달 열기
            tripReporter.addEventListener('click', function(e) {
                console.log('🔥 trip_reporter 클릭됨!');
                e.stopPropagation();
                openReporterModal();
            });

            // 직접 입력 방지 (복사/붙여넣기 포함)
            tripReporter.addEventListener('keydown', function(e) {
                e.preventDefault();
            });
            tripReporter.addEventListener('paste', function(e) {
                e.preventDefault();
            });
            tripReporter.addEventListener('cut', function(e) {
                e.preventDefault();
            });
        } else {
            console.error('❌ tripReporter 요소를 찾을 수 없습니다!');
        }

        // 프로젝트 선택 시 팀원 로드 및 과제명 자동 채우기
        if (tripProject) {
            tripProject.addEventListener('change', async function() {
                const projectIdx = this.value;

                if (projectIdx) {
                    // 프로젝트 팀원 로드 (currentProject도 함께 저장됨)
                    await loadProjectMembers(projectIdx);
                    console.log('프로젝트 선택:', projectIdx, '팀원 수:', projectMembers.length);

                    // 과제명 자동 채우기 (currentProject에서 가져오기)
                    if (currentProject) {
                        document.querySelectorAll('.trip-auto-project').forEach(field => {
                            field.textContent = currentProject.projectName || '';
                        });

                        // 연구책임자명 자동 채우기
                        document.querySelectorAll('.trip-auto-pi').forEach(field => {
                            field.textContent = currentProject.projectManagerName || '';
                        });
                    }
                } else {
                    projectMembers = [];
                    currentProject = null;
                    // 과제명, 연구책임자명 초기화
                    document.querySelectorAll('.trip-auto-project').forEach(field => {
                        field.textContent = '';
                    });
                    document.querySelectorAll('.trip-auto-pi').forEach(field => {
                        field.textContent = '';
                    });
                }
            });
        }

        // 출장 인원 테이블 업데이트
        function updateTripPersonDisplay() {
            const personRows = document.querySelectorAll('.trip-person-row');

            // 모든 행의 첫 3개 셀 업데이트 (최대 5명까지 지원)
            personRows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                if (index < window.currentTripPersons.length) {
                    cells[0].textContent = window.currentTripPersons[index].dept || '';
                    cells[1].textContent = window.currentTripPersons[index].position || '';
                    cells[2].textContent = window.currentTripPersons[index].name || '';
                } else {
                    cells[0].textContent = '';
                    cells[1].textContent = '';
                    cells[2].textContent = '';
                }
            });

            // 출장내용 및 결과 업데이트
            updateTripResult();
        }

        // 출장인원 영역 클릭 시 모달 열기
        if (tripPersonArea) {
            tripPersonArea.addEventListener('click', function(e) {
                // 제거 버튼 클릭은 무시
                if (e.target.closest('.trip-person-remove')) {
                    return;
                }
                // 출장인원 항목이나 추가 버튼 클릭은 무시
                if (e.target.closest('.trip-person-item') || e.target.closest('.add-more-persons-btn')) {
                    return;
                }
                // 출장인원이 있을 경우 영역 클릭으로 모달 열지 않음
                if (window.currentTripPersons.length > 0) {
                    return;
                }
                openTripPersonModal();
            });
        }

        // 직급 순서 정의
        const positionOrder = {
            '대표이사': 1,
            '이사': 2,
            '수석연구원': 3,
            '책임연구원': 4,
            '선임연구원': 5,
            '연구원': 6,
            '주임연구원': 7,
            '사원': 8
        };

        // 출장인원 정렬 함수
        function sortTripPersons(persons) {
            return [...persons].sort((a, b) => {
                // 1. 내부/외부 구분 (내부 우선)
                const typeA = a.type || 'internal';
                const typeB = b.type || 'internal';

                if (typeA === 'internal' && typeB === 'external') return -1;
                if (typeA === 'external' && typeB === 'internal') return 1;

                // 2. 내부: 직급 순으로 정렬
                if (typeA === 'internal' && typeB === 'internal') {
                    const orderA = positionOrder[a.position] || 999;
                    const orderB = positionOrder[b.position] || 999;
                    return orderA - orderB;
                }

                // 3. 외부: 회사명 순, 같은 회사면 직급 순
                if (typeA === 'external' && typeB === 'external') {
                    const deptA = a.dept || '';
                    const deptB = b.dept || '';
                    if (deptA !== deptB) {
                        return deptA.localeCompare(deptB, 'ko');
                    }
                    const orderA = positionOrder[a.position] || 999;
                    const orderB = positionOrder[b.position] || 999;
                    return orderA - orderB;
                }

                return 0;
            });
        }

        // 출장인원 목록 렌더링 함수 (모달 방식)
        window.renderTripPersonListInTemplate = function() {
            if (!tripPersonList) return;

            // tripPersonArea에 has-persons 클래스 추가/제거
            if (tripPersonArea) {
                if (window.currentTripPersons.length > 0) {
                    tripPersonArea.classList.add('has-persons');
                } else {
                    tripPersonArea.classList.remove('has-persons');
                }
            }

            if (window.currentTripPersons.length === 0) {
                tripPersonList.innerHTML = `
                    <div class="empty-attendee-state">
                        <i class="fas fa-user-plus"></i>
                        <div>클릭하여 출장인원 추가</div>
                    </div>
                `;
                hideAddPersonButton();
            } else {
                // 출장인원 정렬
                const sortedPersons = sortTripPersons(window.currentTripPersons);

                // 현재 작성자 ID 가져오기
                const currentReporterId = tripReporter ? tripReporter.getAttribute('data-reporter-id') : null;

                tripPersonList.innerHTML = sortedPersons.map(person => {
                    const externalBadge = person.type === 'external'
                        ? '<span class="external-badge">외부</span>'
                        : '';

                    // 작성자인지 확인
                    const isReporter = currentReporterId && String(person.id) === String(currentReporterId) && person.type !== 'external';
                    const reporterBadge = isReporter ? '<span class="author-badge">작성자</span>' : '';

                    // 경비 정보 계산 (내부 인원만)
                    let expenseDisplay = '';
                    if (person.type !== 'external') {
                        const positionName = person.position;
                        const mealExpense = fixedMealExpenses[positionName] || 0;
                        const dailyExpense = fixedExpenses[positionName] || 0;
                        expenseDisplay = `<span class="expense-info" style="color: #64748b; font-size: 0.85em;">
                            식비: ${mealExpense.toLocaleString()}원 | 일비: ${dailyExpense.toLocaleString()}원
                        </span>`;
                    }

                    const personClass = person.type === 'external'
                        ? 'trip-person-item external-person'
                        : 'trip-person-item';

                    // 중복 검증 결과 확인
                    const isDuplicate = duplicateTripPersonsInfo[person.id];
                    let duplicateWarning = '';
                    if (isDuplicate) {
                        let tooltipText = `이미 ${isDuplicate.date}에 ${isDuplicate.projectName} 프로젝트 ${isDuplicate.type}`;
                        if (isDuplicate.startTime && isDuplicate.endTime) {
                            tooltipText += ` (${isDuplicate.startTime} ~ ${isDuplicate.endTime})`;
                        }
                        tooltipText += '이 있습니다.';

                        duplicateWarning = `<i class="fas fa-exclamation-triangle duplicate-warning"
                                              title="${tooltipText}"
                                              style="color: #f59e0b; margin-left: 8px; cursor: help;"></i>`;
                    }

                    // 작성자가 아닌 경우에만 제거 버튼 표시
                    const removeButton = isReporter ? '' : `
                        <button type="button" class="trip-person-remove" onclick="removeTripPersonInTemplate('${person.id}')">
                            <i class="fas fa-times"></i> 제거
                        </button>
                    `;

                    return `
                        <div class="${personClass}" onclick="event.stopPropagation();">
                            <div class="trip-person-info">
                                <span class="name">${person.name}${reporterBadge}${externalBadge}${duplicateWarning}</span>
                                <span>${person.dept}</span>
                                <span>${person.position}</span>
                                ${expenseDisplay}
                            </div>
                            ${removeButton}
                        </div>
                    `;
                }).join('');

                showAddPersonButton();
            }

            updateTripPersonDisplay();

            // 가이드 행 업데이트 (경비 테이블이 있을 때만)
            if (dailyExpenseBody) {
                addExpenseGuideRow();
            }
        }

        // 출장인원 추가 버튼 표시
        function showAddPersonButton() {
            if (!tripPersonArea) return;

            let addButton = tripPersonArea.querySelector('.add-more-persons-btn');
            if (!addButton) {
                addButton = document.createElement('button');
                addButton.type = 'button';
                addButton.className = 'add-more-persons-btn';
                addButton.onclick = openTripPersonModal;
                addButton.innerHTML = '<i class="fas fa-user-plus"></i> 출장인원 추가';
                tripPersonArea.appendChild(addButton);
            }
            addButton.style.display = 'flex';
        }

        // 출장인원 추가 버튼 숨기기
        function hideAddPersonButton() {
            if (!tripPersonArea) return;

            const addButton = tripPersonArea.querySelector('.add-more-persons-btn');
            if (addButton) {
                addButton.style.display = 'none';
            }
        }

        // 템플릿 내에서 출장인원 제거
        window.removeTripPersonInTemplate = async function(personId) {
            window.currentTripPersons = window.currentTripPersons.filter(p => p.id !== personId);
            renderTripPersonListInTemplate();

            // 작성자 자동 재설정
            setDefaultReporter();

            // 중복 검증 재실행
            await window.checkAllTripPersonsForDuplicates();

            // 모달이 열려있으면 모달도 업데이트
            const tripPersonModal = document.getElementById('tripPersonModal');
            if (tripPersonModal && tripPersonModal.classList.contains('show')) {
                renderTripPersonList2();
            }
        };

        // 전역 함수로 등록하여 모달에서 접근 가능하게
        window.addTripPersonsToTrip = async function(persons) {
            persons.forEach(person => {
                if (!window.currentTripPersons.some(p => p.id === person.id)) {
                    window.currentTripPersons.push(person);
                }
            });
            renderTripPersonListInTemplate();
            // 작성자 자동 설정 (출장인원 중 가장 낮은 직급)
            setDefaultReporter();
            // 중복 검증 실행
            await window.checkAllTripPersonsForDuplicates();
        };

        // 출장인원 중복 검증 함수 (전체 - 회의/야근/출장 모두 체크)
        window.checkAllTripPersonsForDuplicates = async function() {
            duplicateTripPersonsInfo = {}; // 초기화

            const dateInput = document.getElementById('trip_date');
            const projectIdxInput = document.getElementById('selectedProjectIdx');

            if (!dateInput || !dateInput.value) {
                return; // 날짜가 없으면 검증 스킵
            }

            if (!projectIdxInput || !projectIdxInput.value) {
                return; // 프로젝트가 없으면 검증 스킵
            }

            const date = dateInput.value;
            const projectIdx = projectIdxInput.value;

            // 현재 추가된 출장인원 + 프로젝트 팀원 모두 체크 (모달용)
            const tripPersons = getTripPersons();
            const allPersonIds = tripPersons
                .map(p => parseInt(p.id))
                .filter(id => !isNaN(id) && id > 0);

            // 각 출장인원에 대해 중복 체크 (회의, 야근, 출장)
            for (const personId of allPersonIds) {
                try {
                    let duplicateFound = false;
                    let duplicateInfo = null;

                    // 통합 중복 체크 (회의, 야근, 출장 모두 한 번에)
                    try {
                        const response = await fetch(`/api/receipt-common/check-duplicate?date=${date}&attendeeIdx=${personId}&projectIdx=${projectIdx}`);
                        if (response.ok) {
                            const contentType = response.headers.get('content-type');
                            if (contentType && contentType.includes('application/json')) {
                                const duplicates = await response.json();
                                if (Array.isArray(duplicates) && duplicates.length > 0) {
                                    const duplicate = duplicates[0];
                                    duplicateInfo = {
                                        date: duplicate.documentDate,
                                        projectName: duplicate.projectName,
                                        type: duplicate.typeName || duplicate.type,
                                        startTime: duplicate.startTime ? duplicate.startTime.substring(0, 5) : '',
                                        endTime: duplicate.endTime ? duplicate.endTime.substring(0, 5) : ''
                                    };
                                    duplicateFound = true;
                                }
                            }
                        }
                    } catch (e) {
                        console.warn(`중복 체크 실패 (personId: ${personId}):`, e.message);
                    }

                    // 중복 정보 저장
                    if (duplicateFound && duplicateInfo) {
                        duplicateTripPersonsInfo[personId] = duplicateInfo;
                    }
                } catch (error) {
                    console.error(`중복 검증 오류 (personId: ${personId}):`, error);
                }
            }

            // UI 업데이트
            renderTripPersonListInTemplate();
        }

        // 출장인원 중복 검증 재실행 함수 (날짜 변경 시)
        window.recheckTripPersons = async function() {
            // 출장인원이 없으면 스킵
            if (!window.currentTripPersons || window.currentTripPersons.length === 0) return;

            try {
                await window.checkAllTripPersonsForDuplicates();
            } catch (error) {
                console.error('중복 검증 재실행 오류:', error);
            }
        };

        // 과제명 자동 채우기
        if (tripProject) {
            tripProject.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.trip-auto-project').forEach(field => {
                    field.textContent = value;
                });
            });
        }

        // 출장지 자동 채우기
        if (tripLocation) {
            tripLocation.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.trip-auto-location').forEach(field => {
                    field.textContent = value;
                });
            });
        }

        // 날짜별 비용 입력 행 생성 함수
        function generateDailyExpenseRows() {
            console.log('generateDailyExpenseRows 호출됨');
            console.log('tripDate:', tripDate);
            console.log('tripDate.value:', tripDate ? tripDate.value : 'tripDate 없음');
            console.log('dailyExpenseBody:', dailyExpenseBody);

            if (!tripDate || !tripDate.value || !dailyExpenseBody) {
                console.log('early return - 조건 불충족');
                return;
            }

            const startDate = new Date(tripDate.value);
            const duration = parseInt(tripDuration ? tripDuration.value : '0');
            const days = duration + 1; // 당일(0박) = 1일, 1박 = 2일

            console.log('날짜별 행 생성 시작 - days:', days);

            // 기존 데이터 초기화
            dailyExpenses = [];
            dailyExpenseBody.innerHTML = '';

            // 날짜별 행 생성
            for (let i = 0; i < days; i++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(currentDate.getDate() + i);

                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                const dateStr = `${year}.${month}.${day}`;

                dailyExpenses.push({
                    date: dateStr,
                    transport: 0,
                    lodging: 0,
                    meal: 0,
                    other: 0
                });

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="text-align: center; background: white; font-weight: 500;">${dateStr}</td>
                    <td style="text-align: center;">
                        <input type="number" class="expense-input" data-index="${i}" data-type="transport"
                               placeholder="0" style="width: 100%; text-align: right; padding: 5px;" min="0">
                    </td>
                    <td style="text-align: center;">
                        <input type="number" class="expense-input" data-index="${i}" data-type="lodging"
                               placeholder="0" style="width: 100%; text-align: right; padding: 5px;" min="0">
                    </td>
                    <td style="text-align: center;">
                        <input type="number" class="expense-input" data-index="${i}" data-type="meal"
                               placeholder="0" style="width: 100%; text-align: right; padding: 5px;" min="0">
                    </td>
                    <td style="text-align: center;">
                        <input type="number" class="expense-input" data-index="${i}" data-type="other"
                               placeholder="0" style="width: 100%; text-align: right; padding: 5px;" min="0">
                    </td>
                `;
                dailyExpenseBody.appendChild(row);
            }

            // 가이드 행 추가 (선택된 출장인원 합계)
            addExpenseGuideRow();

            // 입력 이벤트 리스너 추가
            document.querySelectorAll('.expense-input').forEach(input => {
                input.addEventListener('input', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    const type = this.getAttribute('data-type');
                    const value = parseInt(this.value) || 0;

                    dailyExpenses[index][type] = value;
                    updateTotalExpenses();
                });
            });

            updateTotalExpenses();
        }

        // 출장인원 합계 가이드 행 추가
        function addExpenseGuideRow() {
            if (!dailyExpenseBody) return;

            // 기존 가이드 행 제거
            const existingGuide = dailyExpenseBody.querySelector('.expense-guide-row');
            if (existingGuide) {
                existingGuide.remove();
            }

            // 선택된 출장인원이 없으면 가이드 행 추가하지 않음
            if (!window.currentTripPersons || window.currentTripPersons.length === 0) {
                return;
            }

            // 출장인원별 식비(중식비)와 일비(출장비) 합계 계산
            let totalMealGuide = 0;
            let totalDailyGuide = 0;

            window.currentTripPersons.forEach(person => {
                if (person.type !== 'external') { // 내부 인원만 계산
                    const positionName = person.position;

                    // 중식비 (식비)
                    if (fixedMealExpenses[positionName]) {
                        totalMealGuide += fixedMealExpenses[positionName];
                    }

                    // 출장비 (일비)
                    if (fixedExpenses[positionName]) {
                        totalDailyGuide += fixedExpenses[positionName];
                    }
                }
            });

            // 전역 변수에 저장 (검증용)
            guideMealTotal = totalMealGuide;
            guideDailyTotal = totalDailyGuide;

            // 가이드 행 생성
            const guideRow = document.createElement('tr');
            guideRow.className = 'expense-guide-row';
            guideRow.style.backgroundColor = '#f0f9ff';
            guideRow.style.borderTop = '2px solid #3b82f6';
            guideRow.innerHTML = `
                <td style="text-align: center; font-weight: 600; color: #1e40af; padding: 10px;">
                    선택 인원 기준 금액
                    <span class="info-tooltip info-tooltip-top" style="margin-left: 8px;">
                        <i class="fas fa-info-circle" style="color: #64748b; cursor: help; font-size: 0.9em;"></i>
                        <span class="tooltip-text">선택한 참석자 기준으로 산정된 기본 비용입니다</span>
                    </span>
                </td>
                <td style="text-align: center; color: #64748b; font-weight: 500;">
                    실비
                </td>
                <td style="text-align: center; color: #64748b; font-weight: 500;">
                    실비
                </td>
                <td style="text-align: center; color: #1e40af; font-weight: 600;">
                    ${totalMealGuide.toLocaleString()}원
                </td>
                <td style="text-align: center; color: #1e40af; font-weight: 600;">
                    ${totalDailyGuide.toLocaleString()}원
                </td>
            `;

            // 테이블 맨 위에 삽입
            dailyExpenseBody.insertBefore(guideRow, dailyExpenseBody.firstChild);
        }

        // 합계 업데이트 함수
        function updateTotalExpenses() {
            let totalTransport = 0;
            let totalLodging = 0;
            let totalMeal = 0;
            let totalOther = 0;

            dailyExpenses.forEach(expense => {
                totalTransport += expense.transport;
                totalLodging += expense.lodging;
                totalMeal += expense.meal;
                totalOther += expense.other;
            });

            const grandTotal = totalTransport + totalLodging + totalMeal + totalOther;

            // 합계 표시 (공통 입력칸)
            document.getElementById('totalTransport').textContent = totalTransport.toLocaleString();
            document.getElementById('totalLodging').textContent = totalLodging.toLocaleString();
            document.getElementById('totalMeal').textContent = totalMeal.toLocaleString();
            document.getElementById('totalOther').textContent = totalOther.toLocaleString();

            // 기준 금액 초과 검증 및 경고 표시
            const mealInputs = document.querySelectorAll('.expense-input[data-type="meal"]');
            const otherInputs = document.querySelectorAll('.expense-input[data-type="other"]');

            // 식비 검증
            if (guideMealTotal > 0 && totalMeal > guideMealTotal) {
                mealInputs.forEach(input => {
                    input.style.border = '2px solid #ef4444';
                    input.style.backgroundColor = '#fee2e2';
                });
            } else {
                mealInputs.forEach(input => {
                    input.style.border = '';
                    input.style.backgroundColor = '';
                });
            }

            // 일비 검증
            if (guideDailyTotal > 0 && totalOther > guideDailyTotal) {
                otherInputs.forEach(input => {
                    input.style.border = '2px solid #ef4444';
                    input.style.backgroundColor = '#fee2e2';
                });
            } else {
                otherInputs.forEach(input => {
                    input.style.border = '';
                    input.style.backgroundColor = '';
                });
            }

            // 품의서 소요경비 내역 (선택 인원 기준 금액)
            const proposalExpenseBody = document.getElementById('proposalExpenseBody');
            if (proposalExpenseBody && tripDate && tripDate.value) {
                proposalExpenseBody.innerHTML = '';

                // 일시 계산
                const startDate = new Date(tripDate.value);
                const duration = parseInt(tripDuration ? tripDuration.value : '0');
                let dateDisplay = '';

                if (duration === 0) {
                    // 당일치기: 날짜만 표시
                    const year = startDate.getFullYear();
                    const month = String(startDate.getMonth() + 1).padStart(2, '0');
                    const day = String(startDate.getDate()).padStart(2, '0');
                    dateDisplay = `${year}.${month}.${day}`;
                } else {
                    // 숙박: 시작일~종료일
                    const endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + duration);

                    const startYear = startDate.getFullYear();
                    const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
                    const startDay = String(startDate.getDate()).padStart(2, '0');
                    const endYear = endDate.getFullYear();
                    const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
                    const endDay = String(endDate.getDate()).padStart(2, '0');

                    dateDisplay = `${startYear}.${startMonth}.${startDay} ~ ${endYear}.${endMonth}.${endDay}`;
                }

                // 선택 인원 기준 금액 합계
                const total = guideMealTotal + guideDailyTotal;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="text-align: center; padding: 10px;">${dateDisplay}</td>
                    <td style="text-align: center; padding: 10px;">실비</td>
                    <td style="text-align: center; padding: 10px;">실비</td>
                    <td style="text-align: center; padding: 10px;">${guideMealTotal.toLocaleString()}</td>
                    <td style="text-align: center; padding: 10px;">${guideDailyTotal.toLocaleString()}</td>
                    <td style="text-align: center; padding: 10px;">${total.toLocaleString()}</td>
                `;
                proposalExpenseBody.appendChild(row);

                // 합계 칸 업데이트
                const grandTotalEl = document.querySelector('.trip-auto-grand-total');
                if (grandTotalEl) {
                    grandTotalEl.textContent = `실비 + ${total.toLocaleString()}원`;
                }
            }

            // 복명서 정산 세부내역에 날짜별 행 생성
            const reportExpenseBody = document.getElementById('reportExpenseBody');
            if (reportExpenseBody) {
                reportExpenseBody.innerHTML = '';

                // 헤더 행
                const headerRow = document.createElement('tr');
                const rowspan = dailyExpenses.length * 4 + 1; // 각 날짜당 4행(교통비, 숙박비, 식비, 기타) + 헤더
                headerRow.innerHTML = `
                    <th colspan="2" rowspan="${rowspan}">정산<br>세부내역</th>
                    <th>날짜</th>
                    <th colspan="2" style="text-align: center; background: #fafafa;">구분</th>
                    <td style="text-align: center; font-weight: bold;">금액</td>
                `;
                reportExpenseBody.appendChild(headerRow);

                // 날짜별 상세 내역
                dailyExpenses.forEach((expense, index) => {
                    // 교통비
                    const transportRow = document.createElement('tr');
                    transportRow.innerHTML = `
                        <td rowspan="4" style="text-align: center;background: white; font-weight: 500; vertical-align: middle;">${expense.date}</td>
                        <td colspan="2" style="background: white; padding: 8px; text-align: center">교통비</td>
                        <td style="text-align: center; padding: 8px; background: white;">${expense.transport.toLocaleString()}원</td>
                    `;
                    reportExpenseBody.appendChild(transportRow);

                    // 숙박비
                    const lodgingRow = document.createElement('tr');
                    lodgingRow.innerHTML = `
                        <td colspan="2" style="background: white; padding: 8px; text-align: center">숙박비</td>
                        <td style="text-align: center; padding: 8px;">${expense.lodging.toLocaleString()}원</td>
                    `;
                    reportExpenseBody.appendChild(lodgingRow);

                    // 식비
                    const mealRow = document.createElement('tr');
                    mealRow.innerHTML = `
                        <td colspan="2" style="background: white; padding: 8px; text-align: center">식비</td>
                        <td style="text-align: center; padding: 8px;">${expense.meal.toLocaleString()}원</td>
                    `;
                    reportExpenseBody.appendChild(mealRow);

                    // 기타(일비)
                    const otherRow = document.createElement('tr');
                    otherRow.innerHTML = `
                        <td colspan="2" style="background: white; padding: 8px; text-align: center">기타(일비)</td>
                        <td style="text-align: center; padding: 8px;">${expense.other.toLocaleString()}원</td>
                    `;
                    reportExpenseBody.appendChild(otherRow);
                });
            }

            // 합계 금액 표시
            document.querySelectorAll('.trip-auto-grand-total').forEach(field => {
                field.textContent = grandTotal.toLocaleString();
            });
            document.querySelectorAll('.trip-auto-total').forEach(field => {
                field.textContent = grandTotal.toLocaleString();
            });
            document.querySelectorAll('.trip-auto-request-amount').forEach(field => {
                field.textContent = grandTotal.toLocaleString();
            });
        }

        // 출장 기간 계산 함수
        function updateTripDateRange() {
            console.log('updateTripDateRange 호출됨');
            if (!tripDate || !tripDate.value) {
                console.log('updateTripDateRange early return');
                return;
            }

            const startDate = new Date(tripDate.value);
            const duration = parseInt(tripDuration ? tripDuration.value : '0');

            const [year, month, day] = tripDate.value.split('-');

            let dateRangeText = '';
            if (duration === 0) {
                // 당일
                dateRangeText = `${year}.${month}.${day}`;
            } else {
                // 1박 이상
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + duration);

                const endYear = endDate.getFullYear();
                const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
                const endDay = String(endDate.getDate()).padStart(2, '0');

                dateRangeText = `${year}.${month}.${day} ~ ${endYear}.${endMonth}.${endDay}`;
            }

            // 출장기간 표시
            document.querySelectorAll('.trip-auto-date').forEach(field => {
                field.textContent = dateRangeText;
            });

            // 출장복명서 출장기간
            document.querySelectorAll('.trip-auto-date-range').forEach(field => {
                field.textContent = dateRangeText;
            });

            // 소요경비내역 일시 (시작일만)
            const dateDotFormatted = `${year}.${month}.${day}`;
            document.querySelectorAll('.trip-auto-date-dot').forEach(field => {
                field.textContent = dateDotFormatted;
            });

            // 작성일 계산 (출장기간 -1일, 주말 제외)
            const tripDateObj = new Date(tripDate.value);
            const dayOfWeek = tripDateObj.getDay();

            let writeDate = new Date(tripDateObj);
            if (dayOfWeek === 1) { // 월요일이면 -3일 (금요일)
                writeDate.setDate(writeDate.getDate() - 3);
            } else if (dayOfWeek === 0) { // 일요일이면 -2일 (금요일)
                writeDate.setDate(writeDate.getDate() - 2);
            } else {
                writeDate.setDate(writeDate.getDate() - 1);
            }

            const writeYear = writeDate.getFullYear();
            const writeMonth = String(writeDate.getMonth() + 1).padStart(2, '0');
            const writeDay = String(writeDate.getDate()).padStart(2, '0');
            const writeFormatted = `${writeYear} 년 ${writeMonth} 월 ${writeDay} 일`;

            document.querySelectorAll('.trip-auto-write-date').forEach(field => {
                field.textContent = writeFormatted;
            });

            // 복명일자 계산 (출장 종료일 기준, YYYY년 MM월 DD일 형식)
            let reportDate = startDate;
            if (duration > 0) {
                reportDate = new Date(startDate);
                reportDate.setDate(reportDate.getDate() + duration);
            }

            const reportYear = reportDate.getFullYear();
            const reportMonth = String(reportDate.getMonth() + 1).padStart(2, '0');
            const reportDay = String(reportDate.getDate()).padStart(2, '0');

            document.querySelectorAll('.trip-auto-report-year').forEach(field => {
                field.textContent = reportYear;
            });
            document.querySelectorAll('.trip-auto-report-month').forEach(field => {
                field.textContent = reportMonth.replace(/^0/, '');
            });
            document.querySelectorAll('.trip-auto-report-day').forEach(field => {
                field.textContent = reportDay.replace(/^0/, '');
            });

            // 날짜별 비용 입력 테이블 생성
            generateDailyExpenseRows();
        }

        // 출장기간 자동 채우기 및 작성일/복명일자 계산
        if (tripDate) {
            console.log('tripDate 이벤트 리스너 추가');
            tripDate.addEventListener('change', async function() {
                console.log('tripDate change 이벤트 발생');
                updateTripDateRange();
                // 날짜 변경 시 출장인원 중복 재검증
                await window.recheckTripPersons();

                // 프로젝트가 선택된 경우, 선택 가능한 인원이 있는지 확인
                const selectedProjectIdx = document.getElementById('selectedProjectIdx');
                if (selectedProjectIdx && selectedProjectIdx.value && projectMembers && projectMembers.length > 0) {
                    // 프로젝트 팀원 전체 ID 목록
                    const allMemberIds = projectMembers.map(m => m.employeeIdx);

                    // 중복된 인원 ID 목록
                    const duplicateIds = Object.keys(duplicateTripPersonsInfo).map(id => parseInt(id));

                    // 선택 가능한 인원 수
                    const availableCount = allMemberIds.filter(id => !duplicateIds.includes(id)).length;

                    if (availableCount === 0) {
                        await Swal.fire({
                            icon: 'warning',
                            title: '선택 가능한 인원이 없습니다',
                            html: `
                                <div style="text-align: left; line-height: 1.8;">
                                    <p style="margin-bottom: 12px;">
                                        <strong>${this.value}</strong> 날짜에는<br>
                                        모든 프로젝트 팀원이 이미 다른 일정에 참여 중입니다.
                                    </p>
                                    <p style="color: #64748b; font-size: 14px; margin-bottom: 8px;">
                                        ▪ 회의, 야근, 출장 중 하나 이상에 참석
                                    </p>
                                    <p style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 6px; font-size: 14px;">
                                        💡 <strong>해결 방법:</strong><br>
                                        출장 날짜를 다른 날짜로 변경해주세요.
                                    </p>
                                </div>
                            `,
                            confirmButtonText: '확인',
                            confirmButtonColor: '#667eea'
                        });

                        // 출장인원 초기화
                        window.currentTripPersons = [];
                        if (typeof window.renderTripPersonListInTemplate === 'function') {
                            window.renderTripPersonListInTemplate();
                        }

                        // 작성자 필드 초기화
                        const tripReporter = document.getElementById('trip_reporter');
                        if (tripReporter) {
                            tripReporter.value = '';
                            tripReporter.setAttribute('data-reporter-id', '');
                        }
                    }
                }
            });
        } else {
            console.log('tripDate 엘리먼트를 찾을 수 없음!');
        }

        // 출장 기간 셀렉트 박스 이벤트
        if (tripDuration) {
            console.log('tripDuration 이벤트 리스너 추가');
            tripDuration.addEventListener('change', function() {
                console.log('tripDuration change 이벤트 발생');
                updateTripDateRange();
            });
        } else {
            console.log('tripDuration 엘리먼트를 찾을 수 없음!');
        }

        // 출장목적 자동 채우기
        if (tripPurpose) {
            tripPurpose.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.trip-auto-purpose').forEach(field => {
                    field.textContent = value;
                });
            });
        }

        // 복명자 자동 채우기
        if (tripReporter) {
            tripReporter.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.trip-auto-reporter').forEach(field => {
                    field.textContent = value;
                });

                // 출장내용 및 결과에 자동 추가
                updateTripResult();
            });

            // 초기값 설정
            if (tripReporter.value) {
                document.querySelectorAll('.trip-auto-reporter').forEach(field => {
                    field.textContent = tripReporter.value;
                });
                updateTripResult();
            }
        }

        // 출장내용 및 결과 업데이트
        function updateTripResult() {
            // 출장인원에서 이름만 가져오기 (복명자는 제외)
            const personNames = window.currentTripPersons
                .filter(person => person.name && person.name.trim())
                .map(person => person.name.trim());

            let resultText = '- 참석인원 :\n';

            if (personNames.length > 0) {
                resultText += `- ${personNames.join(', ')}(파인씨앤아이)`;
            }

            // textarea에 자동 생성된 내용 채우기 (사용자가 수정하지 않았을 때만)
            if (tripResult && !tripResult.dataset.userModified) {
                tripResult.value = resultText;
            }

            // 복명서의 출장내용 및 결과에 반영
            const displayText = tripResult ? tripResult.value : resultText;
            document.querySelectorAll('.trip-auto-result').forEach(field => {
                field.textContent = displayText;
            });
        }

        // 사용자가 직접 수정하면 자동 업데이트 중지
        if (tripResult) {
            tripResult.addEventListener('input', function() {
                this.dataset.userModified = 'true';
                // 수정된 내용을 복명서에 바로 반영
                document.querySelectorAll('.trip-auto-result').forEach(field => {
                    field.textContent = this.value;
                });
            });
        }

        // 작성일 자동 채우기
        const today = new Date();
        const writeDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}.`;
        document.querySelectorAll('.trip-auto-write-date').forEach(field => {
            field.textContent = writeDate;
        });

        // 초기 인원 설정
        window.currentTripPersons = [];
        renderTripPersonListInTemplate();
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

    // 결재자 영역 클릭 시 모달 열기
    if (approverChips) {
        approverChips.addEventListener('click', function(e) {
            // 제거 버튼 클릭은 무시
            if (e.target.closest('.btn-remove-approver')) {
                return;
            }
            loadEmployeeList();
            approverModal.classList.add('show');
        });
    }

    // 직원 목록 로드
    function loadEmployeeList() {
        employeeList.innerHTML = '';
        employees.forEach(emp => {
            const item = document.createElement('div');
            item.className = 'employee-item';
            item.innerHTML = `
                <i class="fas fa-user-circle"></i>
                <div class="employee-info">
                    <div class="employee-name">${emp.name}</div>
                    <div class="employee-detail">${emp.dept} ${emp.position}</div>
                </div>
            `;
            item.addEventListener('click', function() {
                document.querySelectorAll('.employee-item').forEach(i => i.classList.remove('selected'));
                this.classList.add('selected');
                selectedEmployee = emp;
            });
            employeeList.appendChild(item);
        });
    }

    // 직원 검색
    approverSearch.addEventListener('input', function() {
        const term = this.value.toLowerCase();
        document.querySelectorAll('.employee-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(term) ? '' : 'none';
        });
    });

    // 결재자 추가
    window.addApprover = function() {
        if (!selectedEmployee) {
            showWarning('결재자를 선택해주세요.');
            return;
        }

        if (selectedApprovers.find(a => a.id === selectedEmployee.id)) {
            showWarning('이미 추가된 결재자입니다.');
            return;
        }

        selectedApprovers.push(selectedEmployee);
        updateApproverChips();
        closeModal();
        selectedEmployee = null;
    };

    // 결재자 칩 업데이트
    function updateApproverChips() {
        if (selectedApprovers.length === 0) {
            approverChips.innerHTML = `
                <div style="text-align: center; color: #94a3b8; font-size: 13px; width: 100%;">
                    <i class="fas fa-user-plus" style="font-size: 20px; margin-bottom: 6px; display: block;"></i>
                    <div>클릭하여 결재자 추가</div>
                </div>
            `;
            return;
        }

        approverChips.innerHTML = '';
        selectedApprovers.forEach((approver, index) => {
            const chip = document.createElement('div');
            chip.className = 'approver-chip';
            chip.innerHTML = `
                <span class="order">${index + 1}</span>
                <span>${approver.name} ${approver.position}</span>
                <button class="btn-remove btn-remove-approver" onclick="removeApprover(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            approverChips.appendChild(chip);
        });
    }

    // 결재자 제거
    window.removeApprover = function(index) {
        selectedApprovers.splice(index, 1);
        updateApproverChips();
    };

    // 모달 닫기
    window.closeModal = function() {
        approverModal.classList.remove('show');
        approverSearch.value = '';
        loadEmployeeList();
    };

    // 파일 아이콘 헬퍼
    function getFileIcon(name) {
        if (name.match(/\.(jpg|jpeg|png|gif)$/i)) return 'fa-file-image';
        if (name.match(/\.(pdf)$/i)) return 'fa-file-pdf';
        if (name.match(/\.(doc|docx)$/i)) return 'fa-file-word';
        if (name.match(/\.(xls|xlsx)$/i)) return 'fa-file-excel';
        return 'fa-file';
    }

    // 업로드 영역 공통 셋업
    function setupUpload(input, area, filesArr, updateFn) {
        input.addEventListener('change', function(e) {
            Array.from(e.target.files).forEach(file => {
                if (filesArr.length >= 5) { showWarning('최대 5개까지만 첨부 가능합니다.'); return; }
                if (file.size > 10 * 1024 * 1024) { showWarning('파일 크기는 10MB를 초과할 수 없습니다.'); return; }
                filesArr.push(file);
            });
            updateFn();
            input.value = '';
        });
        area.addEventListener('dragover', function(e) { e.preventDefault(); this.style.borderColor = '#667eea'; this.style.background = '#f5f7ff'; });
        area.addEventListener('dragleave', function() { this.style.borderColor = '#ddd'; this.style.background = 'white'; });
        area.addEventListener('drop', function(e) {
            e.preventDefault(); this.style.borderColor = '#ddd'; this.style.background = 'white';
            Array.from(e.dataTransfer.files).forEach(file => {
                if (filesArr.length >= 5) { showWarning('최대 5개까지만 첨부 가능합니다.'); return; }
                if (file.size > 10 * 1024 * 1024) { showWarning('파일 크기는 10MB를 초과할 수 없습니다.'); return; }
                filesArr.push(file);
            });
            updateFn();
        });
    }

    function updateReceiptFileList() {
        receiptFileList.innerHTML = '';
        // 기존 RECEIPT 파일 표시 (삭제 예정 제외)
        existingReceiptAttachments.forEach(att => {
            if (deletedAttachmentIds.includes(att.idx)) return;
            const item = document.createElement('div');
            item.className = 'file-item existing-file';
            item.innerHTML = `
                <i class="fas ${getFileIcon(att.originalFilename)}"></i>
                <span>${att.originalFilename}</span>
                <button class="btn-download-file" onclick="downloadExistingAttachment(${att.idx}, '${att.originalFilename.replace(/'/g, "\\'")}')" title="다운로드">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn-remove-file" onclick="removeExistingAttachment(${att.idx})" title="삭제">
                    <i class="fas fa-times"></i>
                </button>
            `;
            receiptFileList.appendChild(item);
        });
        // 새로 선택한 영수증 파일 표시
        selectedReceiptFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <i class="fas ${getFileIcon(file.name)}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <button class="btn-remove-file" onclick="removeReceiptFile(${index})"><i class="fas fa-times"></i></button>
            `;
            receiptFileList.appendChild(item);
        });
    }

    function updateDocumentFileList() {
        documentFileList.innerHTML = '';
        // 기존 DOCUMENT 파일 표시 (삭제 예정 제외)
        existingDocumentAttachments.forEach(att => {
            if (deletedAttachmentIds.includes(att.idx)) return;
            const item = document.createElement('div');
            item.className = 'file-item existing-file';
            item.innerHTML = `
                <i class="fas ${getFileIcon(att.originalFilename)}"></i>
                <span>${att.originalFilename}</span>
                <button class="btn-download-file" onclick="downloadExistingAttachment(${att.idx}, '${att.originalFilename.replace(/'/g, "\\'")}')" title="다운로드">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn-remove-file" onclick="removeExistingAttachment(${att.idx})" title="삭제">
                    <i class="fas fa-times"></i>
                </button>
            `;
            documentFileList.appendChild(item);
        });
        // 새로 선택한 공식문서 파일 표시
        selectedDocumentFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <i class="fas ${getFileIcon(file.name)}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <button class="btn-remove-file" onclick="removeDocumentFile(${index})"><i class="fas fa-times"></i></button>
            `;
            documentFileList.appendChild(item);
        });
    }

    setupUpload(receiptInput, receiptUploadArea, selectedReceiptFiles, updateReceiptFileList);
    setupUpload(documentInput, documentUploadArea, selectedDocumentFiles, updateDocumentFileList);

    window.removeReceiptFile = function(index) { selectedReceiptFiles.splice(index, 1); updateReceiptFileList(); };
    window.removeDocumentFile = function(index) { selectedDocumentFiles.splice(index, 1); updateDocumentFileList(); };

    // 기존 첨부파일 다운로드
    window.downloadExistingAttachment = function(fileId, fileName) {
        const link = document.createElement('a');
        link.href = `/api/receipt-trips/attachments/${fileId}/download`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 기존 첨부파일 삭제 예약 (저장/수정 시 실제 삭제)
    window.removeExistingAttachment = function(attachmentIdx) {
        if (!deletedAttachmentIds.includes(attachmentIdx)) {
            deletedAttachmentIds.push(attachmentIdx);
        }
        updateReceiptFileList();
        updateDocumentFileList();
    };

    // 기존 첨부파일 다운로드 (하위 호환)
    window.downloadAttachment = window.downloadExistingAttachment;

    // 기존 첨부파일 상태 변수에 로드 (상세보기/수정 모드)
    function displayExistingAttachments(attachments) {
        if (!attachments || attachments.length === 0) return;
        existingReceiptAttachments   = attachments.filter(a => a.attachmentType !== 'DOCUMENT');
        existingDocumentAttachments  = attachments.filter(a => a.attachmentType === 'DOCUMENT');
        deletedAttachmentIds = [];
        updateReceiptFileList();
        updateDocumentFileList();
    }

    // 저장
    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            // 필수 필드 검증
            const selectedProjectIdxInput = document.getElementById('selectedProjectIdx');
            const dateInput = document.getElementById('trip_date');
            const locationInput = document.getElementById('trip_location');

            if (!selectedProjectIdxInput || !selectedProjectIdxInput.value) {
                showWarning('프로젝트를 선택해주세요.');
                return;
            }

            if (!dateInput || !dateInput.value) {
                showWarning('출장 일자를 입력해주세요.');
                return;
            }

            if (!locationInput || !locationInput.value) {
                showWarning('출장지를 입력해주세요.');
                return;
            }

            // 참석자 목록 변환 (현재 페이지의 전역 변수 사용)
            const attendeeDTOs = (window.currentTripPersons || []).map((person, index) => {
                const isExternal = String(person.id).startsWith('ext_');
                return {
                    isExternal: isExternal,
                    department: person.dept || null,
                    name: person.name,
                    userIdx: isExternal ? parseInt(String(person.id).replace('ext_', '')) : parseInt(person.id),
                    position: person.position || null,
                    displayOrder: index
                };
            });

            // 비용 합계 계산 (날짜별 비용에서)
            const expenseInputs = document.querySelectorAll('.expense-input');
            let totalTransportFee = 0;
            let totalAccommodationFee = 0;
            let totalMealFee = 0;
            let totalOtherFee = 0;

            expenseInputs.forEach(input => {
                const type = input.getAttribute('data-type');
                const value = parseFloat(input.value) || 0;

                if (type === 'transport') totalTransportFee += value;
                else if (type === 'lodging') totalAccommodationFee += value;
                else if (type === 'meal') totalMealFee += value;
                else if (type === 'other') totalOtherFee += value;
            });

            // 비용 기준 금액 초과 검증
            const warnings = [];
            if (guideMealTotal > 0 && totalMealFee > guideMealTotal) {
                warnings.push(`식비: ${totalMealFee.toLocaleString()}원 (기준: ${guideMealTotal.toLocaleString()}원)`);
            }
            if (guideDailyTotal > 0 && totalOtherFee > guideDailyTotal) {
                warnings.push(`일비: ${totalOtherFee.toLocaleString()}원 (기준: ${guideDailyTotal.toLocaleString()}원)`);
            }

            if (warnings.length > 0) {
                await Swal.fire({
                    icon: 'warning',
                    title: '비용 기준 초과',
                    html: `선택한 참석자 기준 금액을 초과했습니다.<br><br>${warnings.join('<br>')}<br><br>참석인원을 추가하거나 비용을 조정해주세요.`,
                    confirmButtonText: '확인'
                });
                return;
            }

            if (!(await showConfirm('출장 정보를 저장하시겠습니까?'))) {
                return;
            }

            // 저장 데이터 생성
            const saveData = {
                projectIdx: parseInt(selectedProjectIdxInput.value),
                authorIdx: currentUser ? currentUser.idx : null,
                tripDate: dateInput.value,
                startTime: '00:00:00',  // 출장은 하루 전체 사용 (중복 체크용)
                endTime: '23:59:59',    // 출장은 하루 전체 사용 (중복 체크용)
                location: locationInput.value,
                transportationFee: totalTransportFee || null,
                accommodationFee: totalAccommodationFee || null,
                mealFee: totalMealFee || null,
                otherFee: totalOtherFee || null,
                purpose: document.getElementById('trip_purpose') ? document.getElementById('trip_purpose').value : null,
                content: document.getElementById('trip_result') ? document.getElementById('trip_result').value : null,
                paymentMethod: '카드로 결제',
                isProject: true,  // 프로젝트 관련 문서임을 명시
                attendees: attendeeDTOs
            };

            console.log('저장 데이터:', saveData);

            try {
                // FormData 생성 (첨부파일 지원)
                const formData = new FormData();
                formData.append('data', JSON.stringify(saveData));

                // 첨부파일 추가
                selectedReceiptFiles.forEach(file  => formData.append('receiptFiles',  file));
                selectedDocumentFiles.forEach(file => formData.append('documentFiles', file));

                const response = await fetch('/api/receipt-trips', {
                    method: 'POST',
                    body: formData
                    // Content-Type 헤더는 자동으로 설정됨 (multipart/form-data)
                });

                if (response.ok) {
                    const result = await response.json();
                    showSuccess('출장 정보가 저장되었습니다.');
                    console.log('저장 결과:', result);
                    // 저장 후 목록 페이지로 이동
                    popupAwareRedirect('/project/documents');
                } else {
                    let errorMessage = '출장 저장에 실패했습니다.';
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
                showError('출장 저장 중 오류가 발생했습니다.');
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
                console.log('PDF 저장 시작 - 출장 페이지');

                // 로딩 모달 표시
                if (loadingModal) loadingModal.classList.add('active');
                updateProgress(0, '준비 중...');

                if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
                    showWarning('PDF 라이브러리를 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
                    if (loadingModal) loadingModal.classList.remove('active');
                    return;
                }

                updateProgress(10, 'PDF 초기화 중...');

                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({
                    orientation: 'p',
                    unit: 'mm',
                    format: 'a4',
                    compress: false,
                    precision: 16
                });

                updateProgress(20, '문서 구조 확인 중...');

                allDivs = documentForm.querySelectorAll(':scope > div');
                console.log('찾은 div 개수:', allDivs.length);

                originalDisplays = Array.from(allDivs).map(div => div.style.display);

                if (allDivs.length < 3) {
                    showError('문서 구조를 찾을 수 없습니다. 영수증 처리(출장) 템플릿을 선택했는지 확인해주세요.');
                    if (loadingModal) loadingModal.classList.remove('active');
                    return;
                }

                updateProgress(30, '페이지 준비 중...');

                // 공통 정보 입력 영역 숨기고, 출장품의서와 출장복명서만 표시
                allDivs[0].style.display = 'none';
                allDivs[1].style.display = 'block';
                allDivs[2].style.display = 'block';

                await new Promise(resolve => setTimeout(resolve, 300));

                const renderOptions = {
                    scale: 5,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    imageTimeout: 0,
                    removeContainer: true,
                    windowWidth: 2560,
                    windowHeight: 1440,
                    letterRendering: true,
                    foreignObjectRendering: false,
                    onclone: function(clonedDoc) {
                        const style = clonedDoc.createElement('style');
                        style.textContent = `
                            * {
                                -webkit-font-smoothing: antialiased !important;
                                -moz-osx-font-smoothing: grayscale !important;
                                text-rendering: optimizeLegibility !important;
                                font-smoothing: antialiased !important;
                            }
                        `;
                        clonedDoc.head.appendChild(style);
                    }
                };

                const pdfWidth = 210;
                const pdfHeight = 297;
                const margin = 5;
                const contentWidth = pdfWidth - (margin * 2);
                const contentHeight = pdfHeight - (margin * 2);

                updateProgress(40, '출장품의서 렌더링 중...');

                // 1. 출장품의서 페이지
                console.log('출장품의서 렌더링 중...');
                const proposalDiv = allDivs[1];

                if (!proposalDiv) {
                    throw new Error('출장품의서를 찾을 수 없습니다.');
                }

                const proposalCanvas = await window.html2canvas(proposalDiv, renderOptions);
                const canvasWidth = proposalCanvas.width;
                const canvasHeight = proposalCanvas.height;

                if (canvasWidth === 0 || canvasHeight === 0) {
                    throw new Error('Canvas 크기가 0입니다. 문서가 화면에 표시되어 있는지 확인하세요.');
                }

                updateProgress(55, '출장품의서 이미지 변환 중...');

                const proposalImgData = proposalCanvas.toDataURL('image/png');

                let imgWidth = contentWidth;
                let imgHeight = (canvasHeight * contentWidth) / canvasWidth;

                if (imgHeight > contentHeight) {
                    imgHeight = contentHeight;
                    imgWidth = (canvasWidth * contentHeight) / canvasHeight;
                }

                const xOffset = margin + (contentWidth - imgWidth) / 2;
                const yOffset = margin + (contentHeight - imgHeight) / 2;

                pdf.addImage(proposalImgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
                console.log('출장품의서 페이지 완료');

                updateProgress(70, '출장복명서 렌더링 중...');

                // 2. 출장복명서 페이지
                console.log('출장복명서 렌더링 중...');
                const reportDiv = allDivs[2];

                if (!reportDiv) {
                    throw new Error('출장복명서를 찾을 수 없습니다.');
                }

                pdf.addPage();
                const reportCanvas = await window.html2canvas(reportDiv, renderOptions);

                const reportCanvasWidth = reportCanvas.width;
                const reportCanvasHeight = reportCanvas.height;

                updateProgress(85, '출장복명서 이미지 변환 중...');

                const reportImgData = reportCanvas.toDataURL('image/png');

                let reportImgWidth = contentWidth;
                let reportImgHeight = (reportCanvasHeight * contentWidth) / reportCanvasWidth;

                if (reportImgHeight > contentHeight) {
                    reportImgHeight = contentHeight;
                    reportImgWidth = (reportCanvasWidth * contentHeight) / reportCanvasHeight;
                }

                const reportXOffset = margin + (contentWidth - reportImgWidth) / 2;
                const reportYOffset = margin + (contentHeight - reportImgHeight) / 2;

                pdf.addImage(reportImgData, 'PNG', reportXOffset, reportYOffset, reportImgWidth, reportImgHeight);
                console.log('출장복명서 페이지 완료');

                updateProgress(95, 'PDF 파일 생성 중...');

                // 파일명 생성
                const dateInput = document.getElementById('trip_date');
                let dateStr;
                if (dateInput && dateInput.value) {
                    dateStr = dateInput.value.replace(/-/g, '').slice(2); // YYMMDD 형식
                } else {
                    const today = new Date();
                    const yy = String(today.getFullYear()).slice(2);
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    dateStr = `${yy}${mm}${dd}`;
                }
                const fileName = `${dateStr}_출장.pdf`;

                console.log('PDF 저장:', fileName);
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
                if (allDivs && originalDisplays.length > 0) {
                    allDivs.forEach((div, index) => {
                        div.style.display = originalDisplays[index];
                    });
                }
            }
        });
    }

    // 출장인원 모달 관련
    const tripPersonModal = document.getElementById('tripPersonModal');
    const tripPersonSearchInput = document.getElementById('tripPersonSearchInput');

    // 출장인원 목록 데이터 (직원 데이터와 동일하게 사용)
    // employees 배열을 직접 사용

    // 모달 열기 함수
    window.openTripPersonModal = async function() {
        if (tripPersonModal) {
            // 프로젝트 목록이 비어있으면 다시 로드
            if (!projects || projects.length === 0) {
                console.log('프로젝트 목록이 비어있어서 재로드합니다.');
                await loadProjects();
            }

            // 모달 열 때 중복 검증 실행 (날짜와 출장인원이 있는 경우)
            await window.checkAllTripPersonsForDuplicates();

            tripPersonModal.classList.add('show');
            renderTripPersonList2();
        }
    };

    // 모달 닫기 함수
    window.closeTripPersonModal = function() {
        if (tripPersonModal) {
            tripPersonModal.classList.remove('show');
            // 검색 초기화
            if (tripPersonSearchInput) {
                tripPersonSearchInput.value = '';
                renderTripPersonList2('');
            }
            // 선택 초기화
            const selectedItems = document.querySelectorAll('#tripPersonList2 .employee-item.selected');
            selectedItems.forEach(item => item.classList.remove('selected'));
        }
    };

    // 모달 외부 클릭 시 닫기
    if (tripPersonModal) {
        tripPersonModal.addEventListener('click', function(e) {
            if (e.target === tripPersonModal) {
                closeTripPersonModal();
            }
        });
    }

    // 프로젝트 팀원 가져오기 (출장인원 선택용)
    function getTripPersons() {
        if (!projectMembers || projectMembers.length === 0) {
            return [];
        }

        return projectMembers.map(member => {
            const positionName = member.employeePositionName || '직급 미지정';
            const positionCode = member.employeePositionCode; // 직급 코드
            let tripExpense = 0;
            let mealExpense = 0;
            let isDefault = false; // 기본 경비 사용 여부

            // 출장비(일비) 계산
            // 1순위: 프로젝트별 경비 설정에서 출장비 찾기
            if (projectExpenseSettings && projectExpenseSettings.length > 0 && positionCode) {
                const projectSetting = projectExpenseSettings.find(setting =>
                    setting.positionCode === positionCode &&
                    setting.expenseItemName === '출장비'  // 정확히 '출장비'와 매칭
                );
                if (projectSetting && projectSetting.amount) {
                    tripExpense = projectSetting.amount;
                    console.log(`[${member.employeeName}] 프로젝트 출장비 적용 (${positionCode}): ${tripExpense}원`);
                } else {
                    // 2순위: 기초정보관리의 직급별 고정경비 사용
                    if (fixedExpenses[positionName]) {
                        tripExpense = fixedExpenses[positionName];
                        isDefault = true;
                        console.log(`[${member.employeeName}] 기본 출장비 적용 (${positionName}): ${tripExpense}원`);
                    }
                }
            } else {
                // 프로젝트 경비 설정이 없는 경우 바로 기본 경비 사용
                if (fixedExpenses[positionName]) {
                    tripExpense = fixedExpenses[positionName];
                    isDefault = true;
                    console.log(`[${member.employeeName}] 기본 출장비 적용 (${positionName}): ${tripExpense}원`);
                }
            }

            // 중식비(식비) 계산 - 기초정보관리에서만 가져옴
            if (fixedMealExpenses[positionName]) {
                mealExpense = fixedMealExpenses[positionName];
                console.log(`[${member.employeeName}] 중식비 적용 (${positionName}): ${mealExpense}원`);
            }

            return {
                id: member.employeeIdx,
                name: member.employeeName,
                position: positionName,
                dept: member.employeeDeptName || '부서 미지정',
                tripExpense: tripExpense,
                mealExpense: mealExpense,
                isDefaultExpense: isDefault
            };
        });
    }

    // 프로젝트 목록 렌더링 (출장인원 모달 내)
    function renderProjectListInTripPersonModal(searchText = '') {
        const tripPersonList2El = document.getElementById('tripPersonList2');
        if (!tripPersonList2El) return;

        // 검색 필터링
        let filtered = projects;
        if (searchText) {
            filtered = projects.filter(proj =>
                matchesSearch(proj.projectName || '', searchText) ||
                matchesSearch(proj.projectManagerName || '', searchText)
            );
        }

        if (filtered.length === 0) {
            tripPersonList2El.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-search" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                    ${searchText ? '검색 결과가 없습니다.' : '등록된 프로젝트가 없습니다.'}
                </div>
            `;
            return;
        }

        // 헤더 메시지 (warning card)
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
            const projectName = proj.projectName || '이름 없음';
            const leader = proj.projectManagerName || '-';
            const memberCount = proj.memberCount || 0;
            const startDate = proj.startDate ? new Date(proj.startDate).toLocaleDateString('ko-KR') : '-';
            const endDate = proj.endDate ? new Date(proj.endDate).toLocaleDateString('ko-KR') : '-';

            return `
                <div class="project-item-in-attendee" data-project-idx="${proj.idx}">
                    <div class="project-item-icon">
                        <i class="fas fa-folder"></i>
                    </div>
                    <div class="project-item-info">
                        <div class="project-item-name">${projectName}</div>
                        <div class="project-item-details">
                            <div><i class="fas fa-user"></i> ${leader} (${memberCount}명)</div>
                            <div><i class="fas fa-calendar"></i> ${startDate} ~ ${endDate}</div>
                        </div>
                    </div>
                    <div class="project-item-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            `;
        }).join('');

        tripPersonList2El.innerHTML = headerMessage + projectItems;

        // 프로젝트 항목 클릭 이벤트
        tripPersonList2El.querySelectorAll('.project-item-in-attendee').forEach(item => {
            item.addEventListener('click', async function() {
                const projectIdx = this.getAttribute('data-project-idx');
                await selectProjectInTripPersonModal(projectIdx);
            });
        });
    }

    // 출장인원 모달에서 프로젝트 선택
    async function selectProjectInTripPersonModal(projectIdx) {
        const proj = projects.find(p => p.idx == projectIdx);
        if (!proj) return;

        // 프로젝트 선택
        await selectProject(projectIdx);

        // 검색 초기화 후 인원 목록 다시 렌더링
        if (tripPersonSearchInput) {
            tripPersonSearchInput.value = '';
        }
        renderTripPersonList2('');
    }

    // 출장인원 목록 렌더링
    function renderTripPersonList2(searchText = '') {
        const tripPersonList2El = document.getElementById('tripPersonList2');
        if (!tripPersonList2El) return;

        // 프로젝트가 선택되지 않았으면 프로젝트 목록 표시
        const selectedProjectIdxInput = document.getElementById('selectedProjectIdx');
        if (!selectedProjectIdxInput || !selectedProjectIdxInput.value) {
            renderProjectListInTripPersonModal(searchText);
            return;
        }

        const tripPersons = getTripPersons(); // 프로젝트 팀원에서 가져오기

        if (tripPersons.length === 0) {
            tripPersonList2El.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;">프로젝트 팀원이 없습니다.</div>';
            return;
        }

        const filtered = tripPersons.filter(person =>
            matchesSearch(person.name + person.dept + person.position, searchText)
        );

        if (filtered.length === 0) {
            tripPersonList2El.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8;"><i class="fas fa-search" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>검색 결과가 없습니다.</div>';
            return;
        }

        tripPersonList2El.innerHTML = filtered.map(person => {
            // 이미 추가된 출장인원인지 확인
            const isAdded = window.currentTripPersons.some(p => String(p.id) === String(person.id));

            // 중복 검증 결과 확인 (회의/야근/출장)
            const isDuplicate = duplicateTripPersonsInfo[person.id];

            // 중복된 사람이거나 이미 추가된 사람은 선택 불가
            const isDisabled = isDuplicate || isAdded;
            const disabledClass = isDisabled ? ' disabled' : '';
            const addedClass = isAdded ? ' added' : '';
            const onclickAttr = isDisabled ? '' : `onclick="selectTripPerson(${person.id})"`;

            // 하이라이트 적용
            const highlightedName = highlightText(person.name, searchText);
            const highlightedDept = highlightText(person.dept, searchText);
            const highlightedPosition = highlightText(person.position, searchText);

            // 식비와 일비 표시
            const mealExpenseText = person.mealExpense ? person.mealExpense.toLocaleString('ko-KR') : '0';
            const tripExpenseText = person.tripExpense ? person.tripExpense.toLocaleString('ko-KR') : '0';
            let formattedExpense = `<div style="text-align: right; font-size: 0.9em;">
                <div style="color: #64748b;">식비: ${mealExpenseText}원</div>
                <div style="color: #64748b; margin-top: 2px;">일비: ${tripExpenseText}원</div>
            </div>`;
            if (person.isDefaultExpense && person.tripExpense > 0) {
                formattedExpense += ' <span class="default-expense-badge">(기본)</span>';
            }

            // 중복 경고 메시지
            let duplicateWarning = '';
            if (isDuplicate) {
                let tooltipText = `이미 ${isDuplicate.date}에 ${isDuplicate.projectName} 프로젝트 ${isDuplicate.type}`;
                if (isDuplicate.startTime && isDuplicate.endTime) {
                    tooltipText += ` (${isDuplicate.startTime} ~ ${isDuplicate.endTime})`;
                }
                tooltipText += '이 있어 선택할 수 없습니다.';

                duplicateWarning = `<i class="fas fa-exclamation-triangle"
                                      title="${tooltipText}"
                                      style="color: #f59e0b; margin-left: 6px; cursor: help;"></i>`;
            }

            // 이미 추가된 사람은 체크 아이콘, 그렇지 않으면 경비 표시
            let rightContent = '';
            if (isAdded) {
                rightContent = `<div class="employee-check"><i class="fas fa-check-circle" style="color: #10b981; font-size: 20px;"></i></div>`;
            } else if (isDuplicate) {
                rightContent = `<div class="employee-expense" style="color: #9ca3af;">${formattedExpense}</div>`;
            } else {
                rightContent = `<div class="employee-expense">${formattedExpense}</div>`;
            }

            return `
            <div class="employee-item${addedClass}${disabledClass}" data-id="${person.id}" ${onclickAttr}>
                <div class="employee-info">
                    <div class="employee-name">${highlightedName}${duplicateWarning}</div>
                    <div class="employee-detail">${highlightedPosition} · ${highlightedDept}</div>
                </div>
                ${rightContent}
            </div>
        `;
        }).join('');

        // 렌더링 후 선택된 인원 합계 업데이트
        updateTripPersonSelectionSummary();
    }

    // 선택된 출장인원 합계 업데이트
    function updateTripPersonSelectionSummary() {
        // 선택된 인원 + 이미 추가된 인원 모두 포함
        const selectedItems = document.querySelectorAll('#tripPersonList2 .employee-item.selected');
        const addedItems = document.querySelectorAll('#tripPersonList2 .employee-item.added');
        const summaryEl = document.getElementById('tripPersonSummary');
        const countEl = document.getElementById('selectedPersonCount');
        const mealTotalEl = document.getElementById('selectedMealTotal');
        const dailyTotalEl = document.getElementById('selectedDailyTotal');

        if (!summaryEl || !countEl || !mealTotalEl || !dailyTotalEl) return;

        // 선택된 인원과 이미 추가된 인원을 합침 (중복 제거)
        const allItems = new Set([...selectedItems, ...addedItems]);

        if (allItems.size === 0) {
            summaryEl.style.display = 'none';
            return;
        }

        const tripPersons = getTripPersons();
        let totalMeal = 0;
        let totalDaily = 0;

        allItems.forEach(item => {
            const personId = item.getAttribute('data-id');
            const person = tripPersons.find(p => String(p.id) === String(personId));
            if (person) {
                totalMeal += person.mealExpense || 0;
                totalDaily += person.tripExpense || 0;
            }
        });

        countEl.textContent = allItems.size;
        mealTotalEl.textContent = totalMeal.toLocaleString();
        dailyTotalEl.textContent = totalDaily.toLocaleString();
        summaryEl.style.display = 'block';
    }

    // 출장인원 선택
    window.selectTripPerson = function(personId) {
        const items = document.querySelectorAll('#tripPersonList2 .employee-item');
        items.forEach(item => {
            if (parseInt(item.getAttribute('data-id')) === personId) {
                // 이미 추가된 인원이거나 중복(회의/야근/출장)으로 비활성화된 인원은 선택 불가
                if (item.classList.contains('added') || item.classList.contains('disabled')) {
                    return;
                }
                item.classList.toggle('selected');
            }
        });

        // 선택 후 합계 업데이트
        updateTripPersonSelectionSummary();
    };

    // 검색 기능
    if (tripPersonSearchInput) {
        tripPersonSearchInput.addEventListener('input', function(e) {
            renderTripPersonList2(e.target.value);
        });
    }

    // 선택된 출장인원 추가
    window.addSelectedTripPersons = async function() {
        const selectedItems = document.querySelectorAll('#tripPersonList2 .employee-item.selected');

        if (selectedItems.length === 0) {
            showWarning('출장인원을 선택해주세요.');
            return;
        }

        const tripPersons = getTripPersons();
        const personsToAdd = [];

        selectedItems.forEach(item => {
            const personId = item.getAttribute('data-id');
            const person = tripPersons.find(p => String(p.id) === String(personId));

            if (person) {
                personsToAdd.push({
                    id: String(personId),
                    name: person.name,
                    dept: person.dept,
                    position: person.position
                });
            }
        });

        console.log('추가할 출장인원:', personsToAdd);

        // setupTripAutoFill에서 정의된 함수 호출 (중복 검증 포함)
        if (window.addTripPersonsToTrip) {
            await window.addTripPersonsToTrip(personsToAdd);
        }

        console.log('추가 후 currentTripPersons:', window.currentTripPersons);

        // 모달 목록 새로고침 (추가된 출장인원에 체크마크 표시 + 중복 경고)
        renderTripPersonList2();

        // 모달 닫기
        closeTripPersonModal();
    };

    // 초기 템플릿 로드 (출장)
    loadTemplate('receipt-trip');

    // 템플릿 전환 비활성화
    templateTreeHeaders.forEach(header => {
        header.style.pointerEvents = 'none';
    });

    // ============================================
    // 상세보기 모드: URL에서 ID 파라미터 확인 및 데이터 로드
    // ============================================
    function getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    async function loadReceiptTripData(id) {
        try {
            console.log('연구비증빙 출장 데이터 로드 시작 - ID:', id);
            const data = await window.fetchWithErrorHandling(`/api/receipt-trips/${id}`);

            if (!data) {
                // Error already handled by fetchWithErrorHandling (404, 403, 500)
                return;
            }

            console.log('로드된 데이터:', data);

            // 폼에 데이터 채우기
            populateForm(data);

            // 저장 버튼 숨기기, 수정/삭제 버튼 표시 (상세보기 모드)
            if (submitBtn) {
                submitBtn.style.display = 'none';
            }
            const updateBtn = document.getElementById('updateBtn');
            const deleteBtn = document.getElementById('deleteBtn');
            if (updateBtn) {
                updateBtn.style.display = 'inline-block';
            }
            if (deleteBtn) {
                deleteBtn.style.display = 'inline-block';
            }

            // 로딩 오버레이 숨김
            window.hidePageLoadingOverlay();

            return data;
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            showError('데이터를 불러오는데 실패했습니다.');
            window.hidePageLoadingOverlay();
        }
    }

    function populateForm(data) {
        console.log('폼 데이터 채우기 시작');

        // 프로젝트 선택
        const projectSelect = document.getElementById('trip_project');
        if (projectSelect && data.projectIdx) {
            projectSelect.value = data.projectIdx;
            // 프로젝트 변경 이벤트 트리거 (프로젝트명 자동 채우기)
            const changeEvent = new Event('change');
            projectSelect.dispatchEvent(changeEvent);
        }

        // 출장 일자
        const tripDate = document.getElementById('trip_date');
        if (tripDate && data.tripDate) {
            tripDate.value = data.tripDate;
        }

        // 출장 기간 (duration)은 기본값 0박으로 설정
        const tripDuration = document.getElementById('trip_duration');
        if (tripDuration) {
            tripDuration.value = '0'; // 당일
        }

        // 출장지
        const tripLocation = document.getElementById('trip_location');
        if (tripLocation && data.location) {
            tripLocation.value = data.location;
        }

        // 출장 목적
        const tripPurpose = document.getElementById('trip_purpose');
        if (tripPurpose && data.purpose) {
            tripPurpose.value = data.purpose;
        }

        // 작성자
        const tripReporter = document.getElementById('trip_reporter');
        if (tripReporter && data.authorUserName) {
            tripReporter.value = data.authorUserName;
        }

        // 출장 내용 및 결과
        const tripResult = document.getElementById('trip_result');
        if (tripResult && data.content) {
            tripResult.value = data.content;
            tripResult.dataset.userModified = 'true'; // 자동 업데이트 방지
        }

        // 출장인원 로드
        if (data.attendees && data.attendees.length > 0) {
            window.currentTripPersons = data.attendees.map(attendee => {
                let position = attendee.position || '';
                let dept = attendee.department || '';

                // 내부 참석자인 경우
                if (!attendee.isExternal && attendee.userIdx) {
                    dept = attendee.department || '파인씨앤아이';
                }

                // ID 생성: 외부는 ext_ 접두사, 내부는 userIdx
                const id = attendee.isExternal
                    ? `ext_${attendee.userIdx}`
                    : String(attendee.userIdx);

                return {
                    id: id,
                    name: attendee.name,
                    dept: dept,
                    position: position,
                    isExternal: attendee.isExternal
                };
            });

            console.log('로드된 출장인원:', window.currentTripPersons);
        }

        // 모든 input 이벤트 트리거하여 자동 채우기 활성화
        setTimeout(() => {
            // 날짜 자동 채우기
            if (tripDate) {
                tripDate.dispatchEvent(new Event('change'));
            }

            // 출장지 자동 채우기
            if (tripLocation) {
                tripLocation.dispatchEvent(new Event('input'));
            }

            // 출장 목적 자동 채우기
            if (tripPurpose) {
                tripPurpose.dispatchEvent(new Event('input'));
            }

            // 작성자 자동 채우기
            if (tripReporter) {
                tripReporter.dispatchEvent(new Event('input'));
            }

            // 출장 내용 및 결과 자동 채우기
            if (tripResult) {
                document.querySelectorAll('.trip-auto-result').forEach(field => {
                    field.textContent = tripResult.value;
                });
            }

            // 비용 데이터를 날짜별 입력 테이블의 첫 번째 행에 설정
            const dailyExpenseBody = document.getElementById('dailyExpenseBody');
            if (dailyExpenseBody && dailyExpenseBody.children.length > 0) {
                const firstRow = dailyExpenseBody.children[0];

                // 교통비
                const transportInput = firstRow.querySelector('[data-type="transport"]');
                if (transportInput && data.transportationFee) {
                    transportInput.value = data.transportationFee;
                    transportInput.dispatchEvent(new Event('input'));
                }

                // 숙박비
                const lodgingInput = firstRow.querySelector('[data-type="lodging"]');
                if (lodgingInput && data.accommodationFee) {
                    lodgingInput.value = data.accommodationFee;
                    lodgingInput.dispatchEvent(new Event('input'));
                }

                // 식비
                const mealInput = firstRow.querySelector('[data-type="meal"]');
                if (mealInput && data.mealFee) {
                    mealInput.value = data.mealFee;
                    mealInput.dispatchEvent(new Event('input'));
                }

                // 기타(일비)
                const otherInput = firstRow.querySelector('[data-type="other"]');
                if (otherInput && data.otherFee) {
                    otherInput.value = data.otherFee;
                    otherInput.dispatchEvent(new Event('input'));
                }
            }

            // 출장인원 목록 렌더링
            const tripPersonList = document.getElementById('tripPersonList');
            if (tripPersonList && window.currentTripPersons && window.currentTripPersons.length > 0) {
                tripPersonList.innerHTML = window.currentTripPersons.map(person => `
                    <div class="trip-person-item">
                        <div class="trip-person-info">
                            <span class="name">${person.name}</span>
                            <span>${person.dept}</span>
                            <span>${person.position || ''}</span>
                        </div>
                        <button type="button" class="trip-person-remove" onclick="removeTripPersonInTemplate('${person.id}')">
                            <i class="fas fa-times"></i> 제거
                        </button>
                    </div>
                `).join('');

                // 출장인원 테이블 업데이트 (공식 문서의 출장품의서)
                const personRows = document.querySelectorAll('.trip-person-row');
                personRows.forEach((row, index) => {
                    const cells = row.querySelectorAll('td');
                    if (index < window.currentTripPersons.length) {
                        cells[0].textContent = window.currentTripPersons[index].dept || '';
                        cells[1].textContent = window.currentTripPersons[index].position || '';
                        cells[2].textContent = window.currentTripPersons[index].name || '';
                    } else {
                        cells[0].textContent = '';
                        cells[1].textContent = '';
                        cells[2].textContent = '';
                    }
                });
            }

            console.log('폼 데이터 채우기 완료');
        }, 200);

        // 첨부파일 로드 및 표시
        if (data.attachments && data.attachments.length > 0) {
            console.log('[populateForm] 첨부파일 로드:', data.attachments.length, '개');
            displayExistingAttachments(data.attachments);
        }
    }

    // 오늘 날짜 자동 설정 (상세보기 모드가 아닐 때만)
    const receiptTripId = getUrlParameter('id');
    if (!receiptTripId) {
        // 신규 작성 모드 - 로딩 오버레이 숨김
        window.hidePageLoadingOverlay();

        setTimeout(() => {
            const tripDate = document.getElementById('trip_date');
            if (tripDate && !tripDate.value) {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                tripDate.value = `${yyyy}-${mm}-${dd}`;
                // 날짜 설정 후 자동 채우기 트리거
                tripDate.dispatchEvent(new Event('change'));
            }

            // 날짜 입력 필드 전체 영역 클릭 시 날짜 선택기 열기
            if (tripDate) {
                tripDate.addEventListener('click', function() {
                    if (this.showPicker) {
                        this.showPicker();
                    }
                });
            }
        }, 200);
    } else {
        // URL에 ID 파라미터가 있으면 데이터 로드
        console.log('상세보기 모드 - ID:', receiptTripId);
        window.showPageLoadingOverlay();
        setTimeout(async () => {
            await loadReceiptTripData(receiptTripId);
        }, 500);
    }

    // 수정 버튼 이벤트
    const updateBtn = document.getElementById('updateBtn');
    if (updateBtn) {
        updateBtn.addEventListener('click', async function() {
            const receiptTripId = getUrlParameter('id');
            if (!receiptTripId) {
                showError('문서 ID를 찾을 수 없습니다.');
                return;
            }

            const projectSelect = document.getElementById('trip_project');
            const dateInput = document.getElementById('trip_date');
            const locationInput = document.getElementById('trip_location');

            if (!projectSelect || !projectSelect.value) {
                showWarning('프로젝트를 선택해주세요.');
                return;
            }
            if (!dateInput || !dateInput.value) {
                showWarning('출장 일자를 입력해주세요.');
                return;
            }
            if (!locationInput || !locationInput.value) {
                showWarning('출장지를 입력해주세요.');
                return;
            }

            if (!(await showConfirm('출장 정보를 수정하시겠습니까?'))) {
                return;
            }

            // 참석자 목록 변환
            const attendeeDTOs = (window.currentTripPersons || []).map((person, index) => {
                const isExternal = String(person.id).startsWith('ext_');
                return {
                    isExternal: isExternal,
                    department: person.dept || null,
                    name: person.name,
                    userIdx: isExternal ? parseInt(String(person.id).replace('ext_', '')) : parseInt(person.id),
                    position: person.position || null,
                    displayOrder: index
                };
            });

            // 비용 합계 계산
            const expenseInputs = document.querySelectorAll('.expense-input');
            let totalTransportFee = 0;
            let totalAccommodationFee = 0;
            let totalMealFee = 0;
            let totalOtherFee = 0;

            expenseInputs.forEach(input => {
                const type = input.getAttribute('data-type');
                const value = parseFloat(input.value) || 0;

                if (type === 'transport') totalTransportFee += value;
                else if (type === 'lodging') totalAccommodationFee += value;
                else if (type === 'meal') totalMealFee += value;
                else if (type === 'other') totalOtherFee += value;
            });

            const updateData = {
                projectIdx: parseInt(projectSelect.value),
                tripDate: dateInput.value,
                location: locationInput.value,
                transportationFee: totalTransportFee || null,
                accommodationFee: totalAccommodationFee || null,
                mealFee: totalMealFee || null,
                otherFee: totalOtherFee || null,
                purpose: document.getElementById('trip_purpose')?.value || null,
                content: document.getElementById('trip_result')?.value || null,
                paymentMethod: '카드로 결제',
                attendees: attendeeDTOs
            };

            try {
                // 1. 삭제 예정 첨부파일 순차 삭제
                for (const id of deletedAttachmentIds) {
                    const delRes = await fetch(`/api/receipt-trips/attachments/${id}`, { method: 'DELETE' });
                    if (!delRes.ok) console.warn(`첨부파일(ID: ${id}) 삭제 실패`);
                }

                // 2. FormData로 수정 요청 (신규 파일 포함)
                const formData = new FormData();
                formData.append('data', JSON.stringify(updateData));
                selectedReceiptFiles.forEach(file  => formData.append('receiptFiles',  file));
                selectedDocumentFiles.forEach(file => formData.append('documentFiles', file));

                const response = await fetch(`/api/receipt-trips/${receiptTripId}`, {
                    method: 'PUT',
                    body: formData
                });

                if (response.ok) {
                    showSuccess('출장 정보가 수정되었습니다.');
                    window.location.reload();
                } else {
                    showError('출장 수정에 실패했습니다.');
                }
            } catch (error) {
                console.error('수정 오류:', error);
                showError('출장 수정 중 오류가 발생했습니다.');
            }
        });
    }

    // 삭제 버튼 이벤트
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function() {
            const receiptTripId = getUrlParameter('id');
            if (!receiptTripId) {
                showError('문서 ID를 찾을 수 없습니다.');
                return;
            }

            if (!(await showDeleteConfirm('출장 정보'))) {
                return;
            }

            try {
                const response = await fetch(`/api/receipt-trips/${receiptTripId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    showSuccess('출장 정보가 삭제되었습니다.');
                    popupAwareRedirect('/project/documents');
                } else {
                    showError('출장 삭제에 실패했습니다.');
                }
            } catch (error) {
                console.error('삭제 오류:', error);
                showError('출장 삭제 중 오류가 발생했습니다.');
            }
        });
    }

    // 과제명이 비어있을 때 빨간색 테두리 표시
    setTimeout(() => {
        const tripProject = document.getElementById('trip_project');
        if (tripProject && !tripProject.value) {
            tripProject.style.borderColor = '#ef5350';
        }
    }, 500);
});
