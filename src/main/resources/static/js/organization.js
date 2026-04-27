/**
 * 조직도 페이지 - 프레젠테이션 로직
 * 샘플 데이터를 사용하여 조직도 트리를 렌더링하고 관리합니다.
 */
(function() {
    'use strict';

    // ============================================
    // SearchUtils 초기화
    // ============================================
    const searchUtils = new SearchUtils();
    let currentSearchKeyword = ''; // 현재 검색어

    // ============================================
    // 상수 정의
    // ============================================
    const DOM_SELECTORS = {
        ORG_TREE: 'orgTree',
        SEARCH_INPUT: 'orgSearch',
        EXPAND_ALL_BTN: 'expandAllBtn',
        DETAIL_PLACEHOLDER: 'detailPlaceholder',
        EMPLOYEE_DETAIL: 'employeeDetail',
        DETAIL_NAME: 'detailName',
        DETAIL_POSITION: 'detailPosition',
        DETAIL_STATUS: 'detailStatus',
        DETAIL_DEPARTMENT: 'detailDepartment',
        DETAIL_RANK: 'detailRank',
        DETAIL_JOIN_DATE: 'detailJoinDate',
        DETAIL_EMAIL: 'detailEmail',
        DETAIL_EXTENSION: 'detailExtension',
        DETAIL_PHONE: 'detailPhone',
        DETAIL_MANAGER: 'detailManager',
        DETAIL_TEAM_MEMBERS: 'detailTeamMembers',
        DETAIL_YEARS: 'detailYears'
    };

    const CSS_CLASSES = {
        TREE_NODE: 'tree-node',
        DEPARTMENT: 'department',
        POSITION: 'position',
        MEMBER: 'member',
        EXPANDED: 'expanded',
        ACTIVE: 'active',
        INVISIBLE: 'invisible',
        TREE_NODE_HEADER: 'tree-node-header',
        TREE_CHILDREN: 'tree-children',
        TREE_TOGGLE: 'tree-toggle',
        TREE_ICON: 'tree-icon',
        TREE_LABEL: 'tree-label',
        TREE_COUNT: 'tree-count'
    };

    const ICONS = {
        CHEVRON_RIGHT: 'fas fa-chevron-right',
        BUILDING: 'fas fa-building',
        CROWN: 'fas fa-crown',
        USER: 'fas fa-user',
        PLUS_SQUARE: 'fas fa-plus-square',
        MINUS_SQUARE: 'fas fa-minus-square'
    };

    // ============================================
    // 상태 관리 - 조직도 데이터
    // ============================================
    let organizationData = null;

    // ============================================
    // 상태 관리
    // ============================================
    let currentSelectedNode = null;
    let isAllExpanded = false;
    let currentMember = null;

    // ============================================
    // DOM 유틸리티 함수
    // ============================================

    /**
     * ID로 DOM 요소를 안전하게 가져옵니다.
     * @param {string} id - 요소 ID
     * @returns {HTMLElement|null}
     */
    function getElement(id) {
        return document.getElementById(id);
    }

    /**
     * HTML 요소를 생성합니다.
     * @param {string} tag - 태그명
     * @param {string} className - 클래스명
     * @param {object} attributes - 속성들
     * @returns {HTMLElement}
     */
    function createElement(tag, className, attributes = {}) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        return element;
    }

    /**
     * 총 인원수를 계산합니다.
     * @param {Array} positions - 직급 배열
     * @returns {number}
     */
    function calculateTotalMembers(positions) {
        return positions.reduce((sum, pos) => sum + pos.members.length, 0);
    }

    /**
     * 근속연수를 계산합니다.
     * @param {string} joinDateStr - 입사일
     * @returns {number}
     */
    function calculateYearsOfService(joinDateStr) {
        const joinDate = new Date(joinDateStr);
        const today = new Date();
        return Math.floor((today - joinDate) / (365.25 * 24 * 60 * 60 * 1000));
    }

    // ============================================
    // API 호출
    // ============================================

    /**
     * 서버에서 조직도 데이터를 가져옵니다.
     */
    async function fetchOrganizationData() {
        try {
            console.log('Fetching organization data from /api/organization/tree');
            const response = await fetch('/api/organization/tree');
            console.log('Response status:', response.status);

            if (!response.ok) {
                throw new Error('조직도 데이터를 불러올 수 없습니다.');
            }

            const data = await response.json();
            console.log('Received organization data:', data);
            console.log('Number of departments:', data.departments ? data.departments.length : 0);

            return data;
        } catch (error) {
            console.error('[조직도 로드]', error);
            showLoadFailure('조직도');
            return null;
        }
    }

    // ============================================
    // 조직도 트리 렌더링
    // ============================================

    /**
     * 조직도 트리를 구성합니다.
     * @param {object} data - 조직도 데이터
     */
    function buildOrgTree(data) {
        const orgTree = getElement(DOM_SELECTORS.ORG_TREE);
        if (!orgTree) {
            console.error('조직도 트리 요소를 찾을 수 없습니다.');
            return;
        }

        orgTree.innerHTML = '';

        if (!data || !data.departments || data.departments.length === 0) {
            orgTree.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">조직도 데이터가 없습니다.</p>';
            return;
        }

        data.departments.forEach(dept => {
            const deptNode = createDepartmentNode(dept);
            orgTree.appendChild(deptNode);
        });
    }

    /**
     * 부서 노드를 생성합니다.
     * @param {object} dept - 부서 데이터
     * @returns {HTMLElement}
     */
    function createDepartmentNode(dept) {
        const node = createElement('div', `${CSS_CLASSES.TREE_NODE} ${CSS_CLASSES.DEPARTMENT}`, {
            'data-id': dept.id
        });

        const totalMembers = calculateTotalMembers(dept.positions);

        node.innerHTML = `
            <div class="${CSS_CLASSES.TREE_NODE_HEADER}">
                <span class="${CSS_CLASSES.TREE_TOGGLE}">
                    <i class="${ICONS.CHEVRON_RIGHT}"></i>
                </span>
                <span class="${CSS_CLASSES.TREE_ICON}">
                    <i class="${ICONS.BUILDING}"></i>
                </span>
                <span class="${CSS_CLASSES.TREE_LABEL}">${dept.name}</span>
                <span class="${CSS_CLASSES.TREE_COUNT}">${totalMembers}명</span>
            </div>
            <div class="${CSS_CLASSES.TREE_CHILDREN}"></div>
        `;

        const children = node.querySelector(`.${CSS_CLASSES.TREE_CHILDREN}`);
        dept.positions.forEach(pos => {
            const posNode = createPositionNode(pos);
            children.appendChild(posNode);
        });

        attachToggleEvent(node);

        return node;
    }

    /**
     * 직급 노드를 생성합니다.
     * @param {object} position - 직급 데이터
     * @returns {HTMLElement}
     */
    function createPositionNode(position) {
        const node = createElement('div', `${CSS_CLASSES.TREE_NODE} ${CSS_CLASSES.POSITION}`, {
            'data-id': position.id
        });

        node.innerHTML = `
            <div class="${CSS_CLASSES.TREE_NODE_HEADER}">
                <span class="${CSS_CLASSES.TREE_TOGGLE}">
                    <i class="${ICONS.CHEVRON_RIGHT}"></i>
                </span>
                <span class="${CSS_CLASSES.TREE_ICON}">
                    <i class="${ICONS.CROWN}"></i>
                </span>
                <span class="${CSS_CLASSES.TREE_LABEL}">${position.name}</span>
                <span class="${CSS_CLASSES.TREE_COUNT}">${position.members.length}명</span>
            </div>
            <div class="${CSS_CLASSES.TREE_CHILDREN}"></div>
        `;

        const children = node.querySelector(`.${CSS_CLASSES.TREE_CHILDREN}`);
        position.members.forEach(member => {
            const memberNode = createMemberNode(member);
            children.appendChild(memberNode);
        });

        attachToggleEvent(node);

        return node;
    }

    /**
     * 팀원 노드를 생성합니다.
     * @param {object} member - 팀원 데이터
     * @returns {HTMLElement}
     */
    function createMemberNode(member) {
        const node = createElement('div', `${CSS_CLASSES.TREE_NODE} ${CSS_CLASSES.MEMBER}`, {
            'data-id': member.id,
            'data-member': JSON.stringify(member)
        });

        node.innerHTML = `
            <div class="${CSS_CLASSES.TREE_NODE_HEADER}">
                <span class="${CSS_CLASSES.TREE_TOGGLE} ${CSS_CLASSES.INVISIBLE}">
                    <i class="${ICONS.CHEVRON_RIGHT}"></i>
                </span>
                <span class="${CSS_CLASSES.TREE_ICON}">
                    <i class="${ICONS.USER}"></i>
                </span>
                <span class="${CSS_CLASSES.TREE_LABEL}">${member.name} ${member.rank}</span>
            </div>
        `;

        attachMemberClickEvent(node, member);

        return node;
    }

    // ============================================
    // 이벤트 핸들러
    // ============================================

    /**
     * 노드의 토글 이벤트를 연결합니다.
     * @param {HTMLElement} node - 노드 요소
     */
    function attachToggleEvent(node) {
        const header = node.querySelector(`.${CSS_CLASSES.TREE_NODE_HEADER}`);
        if (!header) return;

        header.addEventListener('click', (e) => {
            e.stopPropagation();
            node.classList.toggle(CSS_CLASSES.EXPANDED);
        });
    }

    /**
     * 팀원 노드의 클릭 이벤트를 연결합니다.
     * @param {HTMLElement} node - 노드 요소
     * @param {object} member - 팀원 데이터
     */
    function attachMemberClickEvent(node, member) {
        const header = node.querySelector(`.${CSS_CLASSES.TREE_NODE_HEADER}`);
        if (!header) return;

        header.addEventListener('click', (e) => {
            e.stopPropagation();

            // 이전 선택 해제
            if (currentSelectedNode) {
                currentSelectedNode.classList.remove(CSS_CLASSES.ACTIVE);
            }

            // 현재 선택 활성화
            header.classList.add(CSS_CLASSES.ACTIVE);
            currentSelectedNode = header;

            // 상세 정보 표시
            showEmployeeDetail(member);
        });
    }

    /**
     * 명함 텍스트를 생성합니다.
     * @param {object} member - 직원 데이터
     * @returns {string}
     */
    function buildBusinessCardText(member) {
        const nameRank = [member.name, member.rank].filter(Boolean).join(' ');
        const lines = [];
        if (nameRank) lines.push(nameRank);
        if (member.department) lines.push(member.department);
        const contacts = [];
        if (member.phone) contacts.push(`T. ${member.phone}`);
        if (member.email) contacts.push(`E. ${member.email}`);
        if (contacts.length > 0) {
            lines.push('');
            contacts.forEach(c => lines.push(c));
        }
        return lines.join('\n');
    }

    /**
     * 직원 상세 정보를 표시합니다.
     * @param {object} member - 직원 데이터
     */
    function showEmployeeDetail(member) {
        currentMember = member;
        const placeholder = getElement(DOM_SELECTORS.DETAIL_PLACEHOLDER);
        const detail = getElement(DOM_SELECTORS.EMPLOYEE_DETAIL);

        if (!placeholder || !detail) {
            console.error('상세 정보 표시 영역을 찾을 수 없습니다.');
            return;
        }

        // 플레이스홀더 숨기기
        placeholder.style.display = 'none';
        detail.style.display = 'flex';

        // 안전하게 값 설정하는 헬퍼 함수
        const setTextContent = (id, value, defaultValue = '-') => {
            const element = getElement(id);
            if (element) {
                element.textContent = value || defaultValue;
            }
        };

        // 정보 업데이트
        setTextContent(DOM_SELECTORS.DETAIL_NAME, member.name);
        setTextContent(DOM_SELECTORS.DETAIL_POSITION, member.position);
        setTextContent(DOM_SELECTORS.DETAIL_STATUS, member.status);
        setTextContent(DOM_SELECTORS.DETAIL_DEPARTMENT, member.department);
        setTextContent(DOM_SELECTORS.DETAIL_RANK, member.rank);
        setTextContent(DOM_SELECTORS.DETAIL_JOIN_DATE, member.joinDate);
        setTextContent(DOM_SELECTORS.DETAIL_EMAIL, member.email);
        setTextContent(DOM_SELECTORS.DETAIL_EXTENSION, member.extension);
        setTextContent(DOM_SELECTORS.DETAIL_PHONE, member.phone);
        setTextContent(DOM_SELECTORS.DETAIL_MANAGER, member.manager);

        // 하위 팀원 목록 렌더링
        const teamMembersContainer = getElement(DOM_SELECTORS.DETAIL_TEAM_MEMBERS);
        if (teamMembersContainer) {
            if (member.teamMembers && member.teamMembers.length > 0) {
                teamMembersContainer.innerHTML = member.teamMembers
                    .map(m => `<span class="team-member-tag">${m}</span>`)
                    .join('');
            } else {
                teamMembersContainer.innerHTML = '<span style="color:#bbb;font-size:13.8px;">-</span>';
            }
        }

        // 근속연수 계산 및 표시
        if (member.joinDate) {
            const years = calculateYearsOfService(member.joinDate);
            setTextContent(DOM_SELECTORS.DETAIL_YEARS, `${years}년`);
        } else {
            setTextContent(DOM_SELECTORS.DETAIL_YEARS, '-');
        }
    }

    /**
     * 전체 펼치기/접기를 처리합니다.
     */
    function handleExpandAll() {
        const allNodes = document.querySelectorAll(`.${CSS_CLASSES.TREE_NODE}.${CSS_CLASSES.DEPARTMENT}, .${CSS_CLASSES.TREE_NODE}.${CSS_CLASSES.POSITION}`);
        const expandAllBtn = getElement(DOM_SELECTORS.EXPAND_ALL_BTN);

        if (!expandAllBtn) return;

        if (isAllExpanded) {
            // 전체 접기
            allNodes.forEach(node => node.classList.remove(CSS_CLASSES.EXPANDED));
            expandAllBtn.innerHTML = `<i class="${ICONS.PLUS_SQUARE}"></i> 전체 펼치기`;
            isAllExpanded = false;
        } else {
            // 전체 펼치기
            allNodes.forEach(node => node.classList.add(CSS_CLASSES.EXPANDED));
            expandAllBtn.innerHTML = `<i class="${ICONS.MINUS_SQUARE}"></i> 전체 접기`;
            isAllExpanded = true;
        }
    }

    /**
     * 검색을 처리합니다. (SearchUtils 사용 - 초성 검색 지원)
     * @param {string} searchTerm - 검색어
     */
    function handleSearch(searchTerm) {
        const term = searchTerm.trim();
        currentSearchKeyword = term;
        const allMemberNodes = document.querySelectorAll(`.${CSS_CLASSES.TREE_NODE}.${CSS_CLASSES.MEMBER}`);

        if (term === '') {
            // 검색어가 없으면 모두 표시
            allMemberNodes.forEach(node => {
                node.style.display = '';
                // 하이라이트 제거
                const label = node.querySelector(`.${CSS_CLASSES.TREE_LABEL}`);
                if (label) {
                    const memberData = JSON.parse(node.getAttribute('data-member'));
                    label.innerHTML = `${memberData.name} ${memberData.rank}`;
                }
            });
            return;
        }

        let hasResults = false;

        allMemberNodes.forEach(node => {
            try {
                const memberData = JSON.parse(node.getAttribute('data-member'));

                // SearchUtils를 사용한 초성 검색
                const matchSearch = searchUtils.matchesObject(
                    memberData,
                    term,
                    ['name', 'department', 'position', 'rank']
                );

                if (matchSearch) {
                    node.style.display = '';

                    // 하이라이트 적용
                    const label = node.querySelector(`.${CSS_CLASSES.TREE_LABEL}`);
                    if (label) {
                        const highlightedName = searchUtils.highlightText(memberData.name || '', term);
                        const highlightedRank = searchUtils.highlightText(memberData.rank || '', term);
                        label.innerHTML = `${highlightedName} ${highlightedRank}`;
                    }

                    // 부모 노드들 펼치기
                    let parent = node.parentElement;
                    while (parent) {
                        if (parent.classList.contains(CSS_CLASSES.TREE_NODE)) {
                            parent.classList.add(CSS_CLASSES.EXPANDED);
                        }
                        parent = parent.parentElement;
                    }

                    hasResults = true;
                } else {
                    node.style.display = 'none';
                }
            } catch (error) {
                console.error('검색 중 오류:', error);
            }
        });

        // 검색 결과가 없으면 모든 부서/직급 노드 접기
        if (!hasResults) {
            const allNodes = document.querySelectorAll(`.${CSS_CLASSES.TREE_NODE}.${CSS_CLASSES.DEPARTMENT}, .${CSS_CLASSES.TREE_NODE}.${CSS_CLASSES.POSITION}`);
            allNodes.forEach(node => node.classList.remove(CSS_CLASSES.EXPANDED));
        }
    }

    /**
     * 첫 번째 부서를 자동으로 펼칩니다.
     */
    function expandFirstDepartment() {
        setTimeout(() => {
            const firstDept = document.querySelector(`.${CSS_CLASSES.TREE_NODE}.${CSS_CLASSES.DEPARTMENT}`);
            if (firstDept) {
                firstDept.classList.add(CSS_CLASSES.EXPANDED);
            }
        }, 100);
    }

    // ============================================
    // 초기화
    // ============================================

    /**
     * 이벤트 리스너를 초기화합니다.
     */
    function initializeEventListeners() {
        // 전체 펼치기/접기 버튼
        const expandAllBtn = getElement(DOM_SELECTORS.EXPAND_ALL_BTN);
        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', handleExpandAll);
        }

        // 검색 기능
        const searchInput = getElement(DOM_SELECTORS.SEARCH_INPUT);
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                handleSearch(this.value);
            });
        }

        // 명함 복사 버튼
        const copyCardBtn = getElement('copyCardBtn');
        if (copyCardBtn) {
            copyCardBtn.addEventListener('click', async () => {
                if (!currentMember) return;
                const text = buildBusinessCardText(currentMember);
                const copyToClipboard = async (str) => {
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(str);
                    } else {
                        const ta = document.createElement('textarea');
                        ta.value = str;
                        ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
                        document.body.appendChild(ta);
                        ta.focus();
                        ta.select();
                        const ok = document.execCommand('copy');
                        document.body.removeChild(ta);
                        if (!ok) throw new Error('execCommand failed');
                    }
                };
                try {
                    await copyToClipboard(text);
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: '명함 정보가 복사되었습니다',
                        showConfirmButton: false,
                        timer: 2000,
                        timerProgressBar: true
                    });
                } catch (e) {
                    console.error('[명함 복사]', e);
                    showWarning('명함 정보를 복사하지 못했습니다.\n브라우저 설정에서 클립보드 권한을 허용한 뒤 다시 시도해 주세요.', '복사 안내');
                }
            });
        }
    }

    /**
     * 애플리케이션을 초기화합니다.
     */
    async function initialize() {
        // 서버에서 조직도 데이터 로드
        organizationData = await fetchOrganizationData();

        // 조직도 구성
        buildOrgTree(organizationData);

        // 이벤트 리스너 초기화
        initializeEventListeners();

        // 첫 번째 부서 자동 펼치기
        expandFirstDepartment();
    }

    // DOM이 로드되면 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
