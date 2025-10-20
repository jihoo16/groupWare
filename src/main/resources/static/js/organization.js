/**
 * 조직도 페이지 - 프레젠테이션 로직
 * 샘플 데이터를 사용하여 조직도 트리를 렌더링하고 관리합니다.
 */
(function() {
    'use strict';

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
        DETAIL_TEAM_COUNT: 'detailTeamCount',
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
    // 샘플 데이터
    // ============================================
    const organizationData = {
        departments: [
            {
                id: 1,
                name: '경영지원본부',
                positions: [
                    {
                        id: 101,
                        name: '본부장',
                        rank: '임원',
                        members: [
                            {
                                id: 1001,
                                name: '김철수',
                                position: '본부장',
                                rank: '전무',
                                department: '경영지원본부',
                                email: 'kim.cs@company.com',
                                phone: '010-1234-5678',
                                extension: '1001',
                                joinDate: '2015-03-15',
                                status: '재직중',
                                manager: '-',
                                teamCount: 15
                            }
                        ]
                    },
                    {
                        id: 102,
                        name: '팀장',
                        rank: '부장',
                        members: [
                            {
                                id: 1002,
                                name: '박영희',
                                position: '인사팀장',
                                rank: '부장',
                                department: '경영지원본부 인사팀',
                                email: 'park.yh@company.com',
                                phone: '010-2345-6789',
                                extension: '1002',
                                joinDate: '2016-05-20',
                                status: '재직중',
                                manager: '김철수 전무',
                                teamCount: 5
                            },
                            {
                                id: 1003,
                                name: '이민수',
                                position: '총무팀장',
                                rank: '부장',
                                department: '경영지원본부 총무팀',
                                email: 'lee.ms@company.com',
                                phone: '010-3456-7890',
                                extension: '1003',
                                joinDate: '2017-02-10',
                                status: '재직중',
                                manager: '김철수 전무',
                                teamCount: 4
                            }
                        ]
                    },
                    {
                        id: 103,
                        name: '팀원',
                        rank: '사원~차장',
                        members: [
                            {
                                id: 1004,
                                name: '정수진',
                                position: '인사담당',
                                rank: '차장',
                                department: '경영지원본부 인사팀',
                                email: 'jung.sj@company.com',
                                phone: '010-4567-8901',
                                extension: '1004',
                                joinDate: '2018-07-01',
                                status: '재직중',
                                manager: '박영희 부장',
                                teamCount: 0
                            },
                            {
                                id: 1005,
                                name: '최동욱',
                                position: '급여담당',
                                rank: '과장',
                                department: '경영지원본부 인사팀',
                                email: 'choi.dw@company.com',
                                phone: '010-5678-9012',
                                extension: '1005',
                                joinDate: '2019-03-15',
                                status: '재직중',
                                manager: '박영희 부장',
                                teamCount: 0
                            },
                            {
                                id: 1006,
                                name: '강미래',
                                position: '총무담당',
                                rank: '대리',
                                department: '경영지원본부 총무팀',
                                email: 'kang.mr@company.com',
                                phone: '010-6789-0123',
                                extension: '1006',
                                joinDate: '2020-01-20',
                                status: '재직중',
                                manager: '이민수 부장',
                                teamCount: 0
                            },
                            {
                                id: 1007,
                                name: '윤서연',
                                position: '시설관리',
                                rank: '사원',
                                department: '경영지원본부 총무팀',
                                email: 'yoon.sy@company.com',
                                phone: '010-7890-1234',
                                extension: '1007',
                                joinDate: '2021-06-01',
                                status: '재직중',
                                manager: '이민수 부장',
                                teamCount: 0
                            }
                        ]
                    }
                ]
            },
            {
                id: 2,
                name: '개발본부',
                positions: [
                    {
                        id: 201,
                        name: '본부장',
                        rank: '임원',
                        members: [
                            {
                                id: 2001,
                                name: '장현우',
                                position: '개발본부장',
                                rank: '상무',
                                department: '개발본부',
                                email: 'jang.hw@company.com',
                                phone: '010-1111-2222',
                                extension: '2001',
                                joinDate: '2014-08-01',
                                status: '재직중',
                                manager: '-',
                                teamCount: 20
                            }
                        ]
                    },
                    {
                        id: 202,
                        name: '팀장',
                        rank: '부장',
                        members: [
                            {
                                id: 2002,
                                name: '임지훈',
                                position: 'Frontend팀장',
                                rank: '부장',
                                department: '개발본부 Frontend팀',
                                email: 'lim.jh@company.com',
                                phone: '010-2222-3333',
                                extension: '2002',
                                joinDate: '2016-09-01',
                                status: '재직중',
                                manager: '장현우 상무',
                                teamCount: 6
                            },
                            {
                                id: 2003,
                                name: '한소희',
                                position: 'Backend팀장',
                                rank: '부장',
                                department: '개발본부 Backend팀',
                                email: 'han.sh@company.com',
                                phone: '010-3333-4444',
                                extension: '2003',
                                joinDate: '2015-11-15',
                                status: '재직중',
                                manager: '장현우 상무',
                                teamCount: 8
                            }
                        ]
                    },
                    {
                        id: 203,
                        name: '팀원',
                        rank: '사원~차장',
                        members: [
                            {
                                id: 2004,
                                name: '오준석',
                                position: 'Frontend 개발',
                                rank: '차장',
                                department: '개발본부 Frontend팀',
                                email: 'oh.js@company.com',
                                phone: '010-4444-5555',
                                extension: '2004',
                                joinDate: '2017-04-01',
                                status: '재직중',
                                manager: '임지훈 부장',
                                teamCount: 0
                            },
                            {
                                id: 2005,
                                name: '신예은',
                                position: 'Frontend 개발',
                                rank: '과장',
                                department: '개발본부 Frontend팀',
                                email: 'shin.ye@company.com',
                                phone: '010-5555-6666',
                                extension: '2005',
                                joinDate: '2018-02-15',
                                status: '재직중',
                                manager: '임지훈 부장',
                                teamCount: 0
                            },
                            {
                                id: 2006,
                                name: '배준영',
                                position: 'Backend 개발',
                                rank: '차장',
                                department: '개발본부 Backend팀',
                                email: 'bae.jy@company.com',
                                phone: '010-6666-7777',
                                extension: '2006',
                                joinDate: '2017-07-20',
                                status: '재직중',
                                manager: '한소희 부장',
                                teamCount: 0
                            },
                            {
                                id: 2007,
                                name: '송하늘',
                                position: 'Backend 개발',
                                rank: '과장',
                                department: '개발본부 Backend팀',
                                email: 'song.hn@company.com',
                                phone: '010-7777-8888',
                                extension: '2007',
                                joinDate: '2019-01-10',
                                status: '재직중',
                                manager: '한소희 부장',
                                teamCount: 0
                            },
                            {
                                id: 2008,
                                name: '나윤서',
                                position: 'Backend 개발',
                                rank: '대리',
                                department: '개발본부 Backend팀',
                                email: 'na.ys@company.com',
                                phone: '010-8888-9999',
                                extension: '2008',
                                joinDate: '2020-05-01',
                                status: '재직중',
                                manager: '한소희 부장',
                                teamCount: 0
                            }
                        ]
                    }
                ]
            },
            {
                id: 3,
                name: '영업본부',
                positions: [
                    {
                        id: 301,
                        name: '본부장',
                        rank: '임원',
                        members: [
                            {
                                id: 3001,
                                name: '권민재',
                                position: '영업본부장',
                                rank: '상무',
                                department: '영업본부',
                                email: 'kwon.mj@company.com',
                                phone: '010-1212-3434',
                                extension: '3001',
                                joinDate: '2015-01-05',
                                status: '재직중',
                                manager: '-',
                                teamCount: 12
                            }
                        ]
                    },
                    {
                        id: 302,
                        name: '팀장',
                        rank: '부장',
                        members: [
                            {
                                id: 3002,
                                name: '유재석',
                                position: '영업1팀장',
                                rank: '부장',
                                department: '영업본부 영업1팀',
                                email: 'yoo.js@company.com',
                                phone: '010-5656-7878',
                                extension: '3002',
                                joinDate: '2016-03-10',
                                status: '재직중',
                                manager: '권민재 상무',
                                teamCount: 5
                            }
                        ]
                    },
                    {
                        id: 303,
                        name: '팀원',
                        rank: '사원~차장',
                        members: [
                            {
                                id: 3003,
                                name: '홍길동',
                                position: '영업담당',
                                rank: '차장',
                                department: '영업본부 영업1팀',
                                email: 'hong.gd@company.com',
                                phone: '010-9090-1212',
                                extension: '3003',
                                joinDate: '2017-06-15',
                                status: '재직중',
                                manager: '유재석 부장',
                                teamCount: 0
                            },
                            {
                                id: 3004,
                                name: '김영수',
                                position: '영업담당',
                                rank: '과장',
                                department: '영업본부 영업1팀',
                                email: 'kim.ys@company.com',
                                phone: '010-3434-5656',
                                extension: '3004',
                                joinDate: '2018-09-01',
                                status: '재직중',
                                manager: '유재석 부장',
                                teamCount: 0
                            }
                        ]
                    }
                ]
            }
        ]
    };

    // ============================================
    // 상태 관리
    // ============================================
    let currentSelectedNode = null;
    let isAllExpanded = false;

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

        if (!data.departments || data.departments.length === 0) {
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
                <span class="${CSS_CLASSES.TREE_LABEL}">${position.name} (${position.rank})</span>
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
     * 직원 상세 정보를 표시합니다.
     * @param {object} member - 직원 데이터
     */
    function showEmployeeDetail(member) {
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
        setTextContent(DOM_SELECTORS.DETAIL_TEAM_COUNT, member.teamCount > 0 ? `${member.teamCount}명` : '-');

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
     * 검색을 처리합니다.
     * @param {string} searchTerm - 검색어
     */
    function handleSearch(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const allMemberNodes = document.querySelectorAll(`.${CSS_CLASSES.TREE_NODE}.${CSS_CLASSES.MEMBER}`);

        if (term === '') {
            // 검색어가 없으면 모두 표시
            allMemberNodes.forEach(node => {
                node.style.display = '';
            });
            return;
        }

        let hasResults = false;

        allMemberNodes.forEach(node => {
            try {
                const memberData = JSON.parse(node.getAttribute('data-member'));
                const name = (memberData.name || '').toLowerCase();
                const department = (memberData.department || '').toLowerCase();
                const position = (memberData.position || '').toLowerCase();
                const rank = (memberData.rank || '').toLowerCase();

                if (name.includes(term) ||
                    department.includes(term) ||
                    position.includes(term) ||
                    rank.includes(term)) {
                    node.style.display = '';

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
    }

    /**
     * 애플리케이션을 초기화합니다.
     */
    function initialize() {
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
