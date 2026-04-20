// 연구비 증빙 - 회의록 페이지 JavaScript

// 텍스트를 5단어씩 끊어서 줄바꿈하는 헬퍼 함수 (전역 스코프)
function formatTextWithLineBreaks(text, wordsPerLine = 5) {
    if (!text) return '';
    const words = text.split(/\s+/); // 공백으로 단어 분리
    const lines = [];
    for (let i = 0; i < words.length; i += wordsPerLine) {
        lines.push(words.slice(i, i + wordsPerLine).join(' '));
    }
    return lines.join('<br>');
}

// 문서 타입 코드를 읽기 쉬운 이름으로 변환하는 함수
function getDocumentTypeName(typeCode) {
    const typeMap = {
        'RCM': '연구비증빙-회의록',
        'RCO': '연구비증빙-야근식대',
        'RCT': '연구비증빙-단독출장',
        'RECEIPT_MEETING': '연구비증빙-회의록',
        'RECEIPT_OVERTIME': '연구비증빙-야근식대',
        'RECEIPT_TRIP': '연구비증빙-단독출장',
        '회의록': '연구비증빙-회의록',
        '야근식대': '연구비증빙-야근식대',
        '출장': '연구비증빙-단독출장'
    };
    return typeMap[typeCode] || typeCode;
}

document.addEventListener('DOMContentLoaded', async function() {
    // 검색 유틸리티 (공통)
    const searchUtils = new SearchUtils();

    // 전역 변수
    let selectedReceiptFiles = [];
    let selectedDocumentFiles = [];
    let currentUser = null; // 현재 로그인한 사용자
    let projects = []; // 프로젝트 목록
    let projectMembers = []; // 선택된 프로젝트의 팀원 목록
    let currentAttendees = []; // 현재 추가된 참석자 목록 (전역으로 이동)
    let fixedExpenses = {}; // 기초정보관리의 직급별 고정경비 (회의비)
    let projectExpenseSettings = []; // 선택된 프로젝트의 직급별 경비 설정
    let selectedProject = null; // 선택된 프로젝트
    let projectCards = []; // 선택된 프로젝트의 카드 목록
    let selectedCard = null; // 선택된 카드
    let currentReceiptMeetingIdx = null; // 현재 회의록의 실제 idx (수정/삭제 시 사용)
    let shouldOpenCardModalAfterProject = false; // 과제 선택 후 카드 모달 자동 열기 플래그
    let isLoadingExistingData = false; // 기존 데이터 로딩 중 플래그 (이벤트 핸들러 초기화 방지용)
    let existingReceiptAttachments = []; // 서버에서 로드된 기존 영수증 파일 (RECEIPT)
    let existingDocumentAttachments = []; // 서버에서 로드된 기존 공식문서 파일 (DOCUMENT)
    let deletedAttachmentIds = []; // 삭제 예정 기존 첨부파일 idx 목록

    // 주요 내용 바이트 검증
    const MIN_CONTENT_BYTES = 400;
    function getByteLength(str) {
        return new TextEncoder().encode(str).length;
    }
    function updateContentByteCounter(value) {
        const statusEl = document.getElementById('contentByteStatus');
        if (!statusEl) return;
        const bytes = getByteLength(value || '');
        if (bytes >= MIN_CONTENT_BYTES) {
            statusEl.className = 'byte-status-sufficient';
            statusEl.textContent = `✓ 조건 충족 · ${bytes} bytes 입력됨`;
        } else {
            statusEl.className = 'byte-status-insufficient';
            statusEl.textContent = `최소 ${MIN_CONTENT_BYTES} bytes 필요 · 현재 ${bytes} bytes (${MIN_CONTENT_BYTES - bytes} bytes 부족)`;
        }
    }

    // DOM 요소
    const templateTreeHeaders = document.querySelectorAll('.tree-node-header[data-template]');
    const documentForm = document.getElementById('documentForm');
    const receiptInput = document.getElementById('receiptInput');
    const receiptFileList = document.getElementById('receiptFileList');
    const receiptUploadArea = document.getElementById('receiptUploadArea');
    const documentInput = document.getElementById('documentInput');
    const documentFileList = document.getElementById('documentFileList');
    const documentUploadArea = document.getElementById('documentUploadArea');
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
                    // expenseItemName이 '회의비'인 항목만 필터링 (amount가 0이어도 포함)
                    if (item.positionName && item.expenseItemName === '회의비' && item.amount != null) {
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

    // ============================================
    // 참여기간 검증 헬퍼 (회의록은 단일 날짜 검증)
    // ============================================

    /**
     * 멤버의 참여기간 [participationStartDate, participationEndDate] 가
     * 주어진 날짜를 포함하는지 검사한다.
     * - dateStr 이 비어있으면 true (날짜 미입력은 별도 검증)
     * - participationEndDate 가 null 이면 종료 미정 (무한)
     */
    function isMemberActiveOnDate(member, dateStr) {
        if (!dateStr) return true;
        if (!member || !member.participationStartDate) return false;
        const date = dateStr;
        const start = member.participationStartDate;
        if (start > date) return false;
        const end = member.participationEndDate;
        if (end && end < date) return false;
        return true;
    }

    /**
     * 멤버의 참여기간을 사용자에게 보여줄 한 줄 문자열로 포맷.
     */
    function formatMemberPeriod(member) {
        if (!member) return '';
        const s = member.participationStartDate || '?';
        const e = member.participationEndDate || '종료 미정';
        return `${s} ~ ${e}`;
    }

    /**
     * 비활성 인원 안내 메시지 — 무엇이 잘못되었는지 + 다음에 어떤 액션을 취해야 하는지 명시.
     *
     * @param {object} member       비활성 멤버 (name, participationStartDate, participationEndDate)
     * @param {string} dateLabel    날짜 필드 한글 라벨 (예: "회의 날짜")
     * @param {string} dateValue    실제 날짜 문자열
     * @param {string} roleContext  사용자 역할 ("작성자" / "참석자" 등)
     */
    function buildInactiveMemberHtml(member, dateLabel, dateValue, roleContext) {
        const name = member.name || member.employeeName || '(이름 없음)';
        const period = formatMemberPeriod(member);
        return `
            <div style="text-align:left; line-height:1.6;">
                <p style="margin-bottom:12px;">
                    <strong>${name}</strong> 님은
                    <strong>${dateValue}</strong> 에 본 프로젝트의 활성 참여연구원이 아닙니다.
                </p>
                <div style="background:#f1f5f9; padding:10px 14px; border-radius:6px; font-size:13px;">
                    <div>· ${dateLabel}: <strong>${dateValue}</strong></div>
                    <div>· ${name} 님 참여기간: <strong>${period}</strong></div>
                </div>
                <p style="margin-top:14px; margin-bottom:6px; font-weight:600;">다음 중 하나를 진행해주세요:</p>
                <ol style="margin:0; padding-left:20px; font-size:13px;">
                    <li>다른 ${roleContext}를 선택</li>
                    <li>${dateLabel}을 ${name} 님의 참여기간 내로 변경</li>
                    <li>프로젝트 관리에서 ${name} 님의 참여기간을 연장 (관리자 권한 필요)</li>
                </ol>
            </div>
        `;
    }

    async function showInactiveMemberAlert(member, dateLabel, dateValue, roleContext) {
        return Swal.fire({
            icon: 'warning',
            title: '참여기간 외 인원',
            html: buildInactiveMemberHtml(member, dateLabel, dateValue, roleContext),
            confirmButtonText: '확인',
            width: 540
        });
    }

    /**
     * 회의 날짜 변경 시 이미 선택된 참석자 + 작성자 재검증.
     * - currentAttendees 중 internal 타입 + 작성자 검사
     * - 새 날짜에 비활성인 사람이 있으면 SweetAlert 안내 + 자동 제거
     */
    async function revalidateAttendeesAgainstMeetingDate() {
        const meetingDateStr = document.getElementById('common_date')?.value || '';
        if (!meetingDateStr) return;
        if (!projectMembers || projectMembers.length === 0) return;

        const memberByEmployeeIdx = new Map();
        projectMembers.forEach(m => {
            memberByEmployeeIdx.set(String(m.employeeIdx), m);
        });

        const inactive = [];
        const inactiveIds = new Set();

        // 1) 참석자 검사
        if (Array.isArray(currentAttendees)) {
            currentAttendees.forEach(a => {
                if (a.type !== 'internal') return;
                const m = memberByEmployeeIdx.get(String(a.id));
                if (!m) return;
                if (!isMemberActiveOnDate(m, meetingDateStr)) {
                    inactive.push({ id: a.id, name: a.name, role: '참석자', period: formatMemberPeriod(m) });
                    inactiveIds.add(String(a.id));
                }
            });
        }

        // 2) 작성자 검사
        const currentAuthorId = document.getElementById('common_author_id')?.value || '';
        if (currentAuthorId) {
            const authorMember = memberByEmployeeIdx.get(String(currentAuthorId));
            if (authorMember && !isMemberActiveOnDate(authorMember, meetingDateStr)) {
                const authorName = document.getElementById('common_author')?.value || authorMember.employeeName;
                inactive.push({ id: currentAuthorId, name: authorName, role: '작성자', period: formatMemberPeriod(authorMember) });
            }
        }

        if (inactive.length === 0) return;

        const list = inactive
            .map(i => `<li><strong>${i.name}</strong> <span style="color:#64748b;">(${i.role})</span> — 참여기간: ${i.period}</li>`)
            .join('');
        const result = await Swal.fire({
            icon: 'warning',
            title: '참여기간 외 인원',
            html: `
                <div style="text-align:left; line-height:1.6;">
                    <p>변경된 회의 날짜 <strong>${meetingDateStr}</strong> 에 본 프로젝트 참여 중이 아닌 인원이 있습니다:</p>
                    <ul style="margin:8px 0 12px 16px;">${list}</ul>
                    <p style="margin-top:10px; font-weight:600;">다음 중 하나를 진행해주세요:</p>
                    <ol style="margin:0; padding-left:20px; font-size:13px;">
                        <li>위 인원을 자동 제거 ("제거" 버튼 클릭)</li>
                        <li>회의 날짜를 되돌리기 ("되돌리기" 버튼 클릭)</li>
                        <li>제거 후 작성자가 사라지면 다른 작성자를 새로 선택</li>
                    </ol>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '제거',
            cancelButtonText: '되돌리기',
            width: 540
        });

        if (result.isConfirmed) {
            // 비활성 참석자 제거
            currentAttendees = currentAttendees.filter(a => !(a.type === 'internal' && inactiveIds.has(String(a.id))));
            // 작성자가 비활성이었다면 작성자 필드도 비움
            if (currentAuthorId && inactive.some(i => String(i.id) === String(currentAuthorId) && i.role === '작성자')) {
                const authorInput = document.getElementById('common_author');
                const authorIdInput = document.getElementById('common_author_id');
                if (authorInput) authorInput.value = '';
                if (authorIdInput) authorIdInput.value = '';
            }
            if (typeof window.renderAttendeeListInTemplate === 'function') {
                window.renderAttendeeListInTemplate();
            }
        } else {
            // 날짜 되돌리기 — 사용자가 직접 다시 입력하도록 비움
            const dateInput = document.getElementById('common_date');
            if (dateInput) dateInput.value = '';
        }
    }

    // 프로젝트 팀원 목록 로드
    async function loadProjectMembers(projectIdx) {
        if (!projectIdx) {
            projectMembers = [];
            projectExpenseSettings = [];
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
            } else {
                console.error('프로젝트 팀원 로드 실패 - Status:', response.status, 'Content-Type:', contentType);
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    console.error('응답 내용 (처음 200자):', text.substring(0, 200));
                }
                projectMembers = [];
                projectExpenseSettings = [];
            }
        } catch (error) {
            console.error('프로젝트 팀원 로드 오류:', error);
            projectMembers = [];
            projectExpenseSettings = [];
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
            timer: 2000,
            timerProgressBar: true,
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
            confirmButtonColor: options.confirmColor || '#667eea'
        }).then(result => result.isConfirmed);
    }

    function showSaveConfirm(message) {
        return Swal.fire({
            icon: 'question',
            title: '저장 확인',
            text: message,
            showCancelButton: true,
            confirmButtonText: '저장',
            cancelButtonText: '취소'
        }).then(result => result.isConfirmed);
    }

    function showDeleteConfirm(itemName) {
        return Swal.fire({
            icon: 'warning',
            title: `${itemName} 삭제`,
            html: `${itemName} 문서를 삭제하시겠습니까?<br>이 작업은 되돌릴 수 없습니다.`,
            showCancelButton: true,
            confirmButtonText: '삭제',
            cancelButtonText: '취소',
            confirmButtonColor: '#ef4444'
        }).then(result => result.isConfirmed);
    }

    function showLoading(message = '처리 중...') {
        Swal.fire({
            title: message,
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    }

    function hideLoading() {
        Swal.close();
    }

    // 페이지 로드 시 데이터 로드
    Promise.all([loadCurrentUser(), loadProjects(), loadFixedExpenses(), loadPositionCodes()]).then(async () => {
        // 데이터 로드 후 회의록 자동 채우기 초기화
        setupReceiptAutoFill();

        // URL 파라미터 확인 및 상세보기 모드 처리
        // documentIdx 또는 id 파라미터 모두 지원
        const receiptMeetingId = getUrlParameter('documentIdx') || getUrlParameter('id');
        if (receiptMeetingId) {
            window.showPageLoadingOverlay();
            await loadReceiptMeetingData(receiptMeetingId);
        } else {
            // 신규 작성 모드
            // 로딩 오버레이 제거
            window.hidePageLoadingOverlay();

            // 초기화 완료 후 과제명이 비어있을 때 빨간색 테두리 표시
            setTimeout(() => {
                const commonProject = document.getElementById('common_project');
                if (commonProject && !commonProject.value) {
                    commonProject.classList.add('field-empty');
                }
            }, 100);
        }
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

        // 회의 날짜 변경 시 — 이미 선택된 참석자 중 비활성이 된 사람 자동 제거 안내
        if (commonDate) {
            commonDate.addEventListener('change', async function() {
                await revalidateAttendeesAgainstMeetingDate();
            });
        }

        // ============================================
        // 시작 시간 / 종료 시간 자동 조절 및 중복 검증
        // ============================================

        // 시간 계산 헬퍼 함수
        function addHours(timeString, hours) {
            if (!timeString) return '';
            const [h, m] = timeString.split(':').map(Number);
            let newHour = h + hours;
            if (newHour >= 24) newHour = 23;
            if (newHour < 0) newHour = 0;
            return `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }

        function subtractHours(timeString, hours) {
            return addHours(timeString, -hours);
        }

        // 참석자 중복 검증 재실행 함수 (시간 변경 시)
        async function recheckAttendees() {
            // 참석자가 없으면 스킵
            if (!currentAttendees || currentAttendees.length === 0) return;

            try {
                // checkAllAttendeesForDuplicates 함수는 나중에 정의되므로
                // window 객체를 통해 접근하거나, 타이머로 지연 실행
                setTimeout(async () => {
                    if (typeof checkAllAttendeesForDuplicates === 'function') {
                        await checkAllAttendeesForDuplicates();
                    }
                }, 100);
            } catch (error) {
                console.error('중복 검증 재실행 오류:', error);
            }
        }

        // 시작 시간 변경 시 종료 시간 자동 조절 및 min 값 설정
        if (commonStartTime) {
            commonStartTime.addEventListener('change', async function() {
                if (this.value && commonEndTime) {
                    // 종료 시간의 최소값 = 시작 시간 + 1시간
                    const minEndTime = addHours(this.value, 1);
                    commonEndTime.setAttribute('min', minEndTime);

                    // 종료 시간 = 시작 시간 + 1시간
                    commonEndTime.value = minEndTime;

                    // 종료 시간이 변경되었으므로 자동 채우기 트리거
                    commonEndTime.dispatchEvent(new Event('input'));
                }

                // 시작 시간 변경 시 참석자 목록 초기화 (기존 데이터 로딩 중이 아닐 때만)
                if (!isLoadingExistingData) {
                    currentAttendees = [];

                    // 중복되지 않은 기본 작성자만 추가
                    await setDefaultAuthor();
                } else {
                    console.log('[시작시간 change] 기존 데이터 로딩 중 - 참석자 초기화 건너뜀');
                }
            });

            // 페이지 로드 시 초기 min 값 설정
            if (commonStartTime.value && commonEndTime) {
                const minEndTime = addHours(commonStartTime.value, 1);
                commonEndTime.setAttribute('min', minEndTime);
            }
        }

        // 종료 시간 변경 시 시작 시간 자동 조절
        if (commonEndTime) {
            commonEndTime.addEventListener('change', async function() {
                if (this.value && commonStartTime) {
                    // 시작 시간 = 종료 시간 - 1시간
                    const newStartTime = subtractHours(this.value, 1);

                    // 시작 시간이 최소값(06:00)보다 작으면 조정
                    if (newStartTime < '06:00') {
                        commonStartTime.value = '06:00';
                        // 시작 시간이 조정되었으므로 종료 시간도 재조정
                        this.value = addHours('06:00', 1);
                    } else {
                        commonStartTime.value = newStartTime;
                    }

                    // 종료 시간의 최소값 업데이트
                    const minEndTime = addHours(commonStartTime.value, 1);
                    this.setAttribute('min', minEndTime);

                    // 시작 시간이 변경되었으므로 자동 채우기 트리거
                    commonStartTime.dispatchEvent(new Event('input'));
                }

                // 종료 시간 변경 시 참석자 목록 초기화 (기존 데이터 로딩 중이 아닐 때만)
                if (!isLoadingExistingData) {
                    currentAttendees = [];

                    // 중복되지 않은 기본 작성자만 추가
                    await setDefaultAuthor();
                } else {
                    console.log('[종료시간 change] 기존 데이터 로딩 중 - 참석자 초기화 건너뜀');
                }
            });
        }

        // ============================================
        // 프로젝트 선택 모달
        // ============================================
        const projectModal = document.getElementById('projectModal');
        const projectSearch = document.getElementById('projectSearch');
        const projectList = document.getElementById('projectList');

        // 검색 유틸리티 (공통 - 외부 searchUtils 인스턴스 사용)
        const matchesSearch = (text, keyword) => searchUtils.matchesSearch(text, keyword);
        const highlightText = (text, keyword) => searchUtils.highlightText(text, keyword);

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
            container.style.cssText = 'display:flex; gap:6px; padding:8px 0; border-bottom:1px solid #eee; flex-wrap:wrap; align-items:center;';
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
                projectList.parentNode.insertBefore(container, projectList.parentNode.firstElementChild);
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
                filtered = filtered.filter(proj => matchesSearch(proj.projectName || '', currentSearchKeyword));
            }
            renderProjectList(filtered, currentSearchKeyword);
        }

        // 프로젝트 목록 렌더링
        function renderProjectList(list, keyword = '') {
            if (!projectList) return;
            projectList.innerHTML = '';

            if (!list || list.length === 0) {
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
                const leader = proj.projectManagerName || proj.projectLeader || '-';
                const memberCount = proj.memberCount != null ? proj.memberCount : (proj.projectMembers ? proj.projectMembers.length : 0);
                const startDate = proj.startDate ? new Date(proj.startDate).toLocaleDateString('ko-KR') : '-';
                const endDate = proj.endDate ? new Date(proj.endDate).toLocaleDateString('ko-KR') : '-';

                item.innerHTML = `
                    <div class="modal-item-info">
                        <div class="modal-item-name">${highlightedName}</div>
                        <div class="modal-item-detail">
                            <div><i class="fas fa-user"></i> ${leader} (${memberCount}명)</div>
                            <div><i class="fas fa-calendar"></i> ${startDate} ~ ${endDate}</div>
                        </div>
                    </div>
                `;

                item.addEventListener('click', async function() {
                    selectedProject = proj;

                    // 프로젝트 입력 필드에 표시
                    if (commonProject) {
                        commonProject.value = proj.projectName;
                        commonProject.classList.remove('field-empty');
                    }
                    const selectedProjectIdx = document.getElementById('selectedProjectIdx');
                    if (selectedProjectIdx) {
                        selectedProjectIdx.value = proj.idx;
                    }

                    // 자동 채우기
                    document.querySelectorAll('.auto-project').forEach(field => {
                        field.value = proj.projectName;
                        const len = (proj.projectName || '').length;
                        if (len > 35) { field.style.fontSize = '8px'; }
                        else if (len > 25) { field.style.fontSize = '9px'; }
                        else if (len > 15) { field.style.fontSize = '10px'; }
                        else { field.style.fontSize = ''; }
                    });

                    // 프로젝트 팀원 로드
                    if (proj.idx) {
                        // 참석자 목록 초기화 (기본 작성자만 남기기)
                        currentAttendees = [];

                        await loadProjectMembers(proj.idx);
                        // 기본 작성자 설정 (낮은 직급에서 4번째)
                        await setDefaultAuthor();

                        // 프로젝트 직급별 경비 설정 로드
                        await loadProjectExpenseSettings(proj.idx);

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
                                commonCard.classList.remove('field-empty');
                            }
                            if (selectedCardIdx) {
                                selectedCardIdx.value = firstCard.idx;
                            }
                            console.log('[카드 자동선택] cardName:', firstCard.cardName, '| selectedCard:', !!selectedCard, '| field-empty 제거됨:', !commonCard?.classList.contains('field-empty'));

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
                    validateRequiredFields();

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
                currentSearchKeyword = this.value.trim();
                applyProjectFilters();
            });
        }

        window.openProjectModal = function() {
            if (projectModal) {
                selectedYear = new Date().getFullYear();
                currentSearchKeyword = '';
                projectModal.classList.add('show');
                if (projectSearch) projectSearch.value = '';
                renderYearButtons();
                applyProjectFilters();
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
                        commonCard.classList.remove('field-empty');
                    }
                    const selectedCardIdx = document.getElementById('selectedCardIdx');
                    if (selectedCardIdx) {
                        selectedCardIdx.value = card.idx;
                    }

                    closeCardModal();
                    validateRequiredFields();
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
                        commonProject.classList.remove('field-empty');
                    }
                    const selectedProjectIdx = document.getElementById('selectedProjectIdx');
                    if (selectedProjectIdx) {
                        selectedProjectIdx.value = proj.idx;
                    }

                    // 자동 채우기
                    document.querySelectorAll('.auto-project').forEach(field => {
                        field.value = proj.projectName;
                        const len = (proj.projectName || '').length;
                        if (len > 35) { field.style.fontSize = '8px'; }
                        else if (len > 25) { field.style.fontSize = '9px'; }
                        else if (len > 15) { field.style.fontSize = '10px'; }
                        else { field.style.fontSize = ''; }
                    });

                    // 참석자 목록 초기화 (기본 작성자만 남기기)
                    currentAttendees = [];

                    // 프로젝트 팀원 로드
                    await loadProjectMembers(proj.idx);

                    // 프로젝트 직급별 경비 설정 로드
                    await loadProjectExpenseSettings(proj.idx);

                    // 기본 작성자 설정
                    await setDefaultAuthor();

                    // 카드 목록 로드 및 자동 선택
                    await loadProjectCards(proj.idx);

                    // 첫 번째 카드 자동 선택
                    const commonCard = document.getElementById('common_card');
                    const selectedCardIdxEl = document.getElementById('selectedCardIdx');
                    if (projectCards && projectCards.length > 0) {
                        const firstCard = projectCards[0];
                        selectedCard = firstCard;
                        if (commonCard) {
                            commonCard.value = firstCard.cardName;
                            commonCard.classList.remove('field-empty');
                        }
                        if (selectedCardIdxEl) selectedCardIdxEl.value = firstCard.idx;
                        console.log('[카드모달→과제선택→카드 자동선택] cardName:', firstCard.cardName, '| field-empty 제거됨:', !commonCard?.classList.contains('field-empty'));
                    } else {
                        selectedCard = null;
                        if (commonCard) { commonCard.value = ''; commonCard.placeholder = '클릭하여 카드 선택'; }
                        if (selectedCardIdxEl) selectedCardIdxEl.value = '';
                    }

                    renderCardList(projectCards);
                    if (cardSearch) cardSearch.value = '';
                    validateRequiredFields();
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
            // 참석자 정렬 (외부 회사순/직급순 -> 내부 직급순)
            const sortedAttendees = sortAttendees(currentAttendees.filter(a => a.name && a.name.trim()));

            // 내부/외부 참석자 구분
            const internalAttendees = sortedAttendees.filter(a => a.type === 'internal');
            const externalAttendees = sortedAttendees.filter(a => a.type === 'external');

            let allAttendeesText = '';

            // 외부 참석자 (먼저 표시)
            if (externalAttendees.length > 0) {
                const externalTexts = externalAttendees.map(a => `${a.name.trim()}(${a.dept || '외부'})`);
                allAttendeesText = externalTexts.join(', ');
            }

            // 내부 참석자 (나중에 표시)
            if (internalAttendees.length > 0) {
                const names = internalAttendees.map(a => a.name.trim());
                const internalText = names.join(', ') + '(파인씨앤아이)';
                if (allAttendeesText) {
                    allAttendeesText += ', ' + internalText;
                } else {
                    allAttendeesText = internalText;
                }
            }

            document.querySelectorAll('.auto-all-attendees').forEach(field => {
                field.textContent = allAttendeesText;
            });

            // 참석자 명단 테이블 동적 생성 (정렬된 순서대로)
            const tbody = document.getElementById('attendee-signature-tbody');
            if (tbody) {
                // 기존 행 모두 제거
                tbody.innerHTML = '';

                // 참석자 수만큼 행 생성
                sortedAttendees.forEach((attendee, idx) => {
                    console.log(`[updateMeetingMinutesAttendees] 행 생성 ${idx + 1}/${sortedAttendees.length}:`, {
                        name: attendee.name,
                        dept: attendee.dept,
                        type: attendee.type
                    });
                    const row = document.createElement('tr');

                    // 구분
                    const typeCell = document.createElement('td');
                    const typeInput = document.createElement('input');
                    typeInput.type = 'text';
                    typeInput.className = 'attendee-sig-type';
                    typeInput.setAttribute('data-index', idx);
                    typeInput.readOnly = true;
                    typeInput.style.background = '#f9f9f9';
                    typeInput.value = attendee.type === 'internal' ? '내부' : '외부';
                    typeCell.appendChild(typeInput);

                    // 성명
                    const nameCell = document.createElement('td');
                    const nameInput = document.createElement('input');
                    nameInput.type = 'text';
                    nameInput.className = 'attendee-sig-name';
                    nameInput.setAttribute('data-index', idx);
                    nameInput.readOnly = true;
                    nameInput.style.background = '#f9f9f9';
                    nameInput.value = attendee.name;
                    nameCell.appendChild(nameInput);

                    // 소속
                    const deptCell = document.createElement('td');
                    const deptInput = document.createElement('input');
                    deptInput.type = 'text';
                    deptInput.className = 'attendee-sig-dept';
                    deptInput.setAttribute('data-index', idx);
                    deptInput.readOnly = true;
                    deptInput.style.background = '#f9f9f9';
                    deptInput.value = attendee.type === 'internal' ? '파인씨앤아이' : attendee.dept;
                    deptCell.appendChild(deptInput);

                    // 서명
                    const signCell = document.createElement('td');
                    signCell.style.padding = '30px';

                    row.appendChild(typeCell);
                    row.appendChild(deptCell);
                    row.appendChild(nameCell);
                    row.appendChild(signCell);

                    tbody.appendChild(row);
                });
            } else {
                console.error('[updateMeetingMinutesAttendees] tbody element를 찾을 수 없음!');
            }
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
                        <td style="padding: 5px; text-align: center;">
                            <span>${group.type}</span>
                        </td>
                        <td style="padding: 5px; text-align: center;"><span>${group.dept || ''}</span></td>
                        <td style="padding: 5px; text-align: center;"><span>${nameDisplay}</span></td>
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
                // 1. 내부/외부 구분 (외부가 먼저)
                if (a.type === 'external' && b.type === 'internal') return -1;
                if (a.type === 'internal' && b.type === 'external') return 1;

                // 2. 외부 참석자끼리는 회사명 가나다순, 같은 회사면 직급순 (높은 직급부터)
                if (a.type === 'external' && b.type === 'external') {
                    const deptA = a.dept || '';
                    const deptB = b.dept || '';

                    // 회사명 비교
                    if (deptA !== deptB) {
                        return deptA.localeCompare(deptB, 'ko');
                    }

                    // 같은 회사면 직급순 (높은 직급부터)
                    return getPositionSortOrder(b.position) - getPositionSortOrder(a.position);
                }

                // 3. 내부 참석자끼리는 직급순 (낮은 직급부터 - 사원 먼저)
                if (a.type === 'internal' && b.type === 'internal') {
                    return getPositionSortOrder(a.position) - getPositionSortOrder(b.position);
                }

                return 0;
            });
        }

        // 참석자 목록 렌더링 함수 (모달 방식)
        // 외부 헬퍼(revalidateAttendeesAgainstMeetingDate)에서 호출 가능하도록 window 에도 노출
        window.renderAttendeeListInTemplate = renderAttendeeListInTemplate;
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

                // 현재 작성자 ID 가져오기
                const currentAuthorId = document.getElementById('common_author_id')?.value;

                attendeeList.innerHTML = sortedAttendees.map((attendee, idx) => {
                    console.log(`[renderAttendeeListInTemplate] 참석자 ${idx + 1}/${sortedAttendees.length}:`, {
                        id: attendee.id,
                        name: attendee.name,
                        dept: attendee.dept,
                        position: attendee.position,
                        meetingExpense: attendee.meetingExpense,
                        type: attendee.type
                    });
                    // 금액 포맷팅
                    const formattedExpense = attendee.meetingExpense
                        ? attendee.meetingExpense.toLocaleString('ko-KR') + '원'
                        : '-';

                    // 외부 참석자 뱃지
                    const externalBadge = attendee.type === 'external'
                        ? '<span class="external-badge">외부</span>'
                        : '';

                    // 작성자인지 확인
                    const isAuthor = currentAuthorId && String(attendee.id) === String(currentAuthorId) && attendee.type === 'internal';
                    const authorBadge = isAuthor ? '<span class="author-badge">작성자</span>' : '';

                    // 작성자가 아닌 경우에만 클릭 이벤트와 삭제 버튼 표시
                    const clickEvent = isAuthor ? '' : `onclick="removeAttendeeInTemplate('${attendee.id}')"`;
                    const deleteButton = isAuthor
                        ? '<span class="cannot-remove-text"><i class="fas fa-lock"></i> 삭제 불가</span>'
                        : '<button type="button" class="trip-person-remove attendee-remove"><i class="fas fa-times"></i> 삭제</button>';

                    return `
                        <div class="trip-person-item ${attendee.type === 'external' ? 'external-attendee' : ''} ${isAuthor ? 'is-author' : ''}" ${clickEvent}>
                            <div class="trip-person-info">
                                <span class="name">${attendee.name}${externalBadge}${authorBadge}</span>
                                <span>${attendee.dept}</span>
                                <span>${attendee.position}</span>
                                <span style="color: #667eea; font-weight: 600;">${formattedExpense}</span>
                            </div>
                            ${deleteButton}
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
            updateAttendeeCount(); // 참석자 총 인원 수 업데이트

            // 외부인원 경고 표시
            const externalWarning = document.getElementById('externalAttendeeWarning');
            const hasExternal = currentAttendees.some(a => a.type === 'external');
            if (externalWarning) {
                externalWarning.style.display = (currentAttendees.length > 0 && !hasExternal) ? 'flex' : 'none';
            }
            if (attendeeArea) {
                if (currentAttendees.length > 0 && !hasExternal) {
                    attendeeArea.classList.add('no-external');
                } else {
                    attendeeArea.classList.remove('no-external');
                }
            }
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

        // 참석자 총 인원 수 업데이트
        function updateAttendeeCount() {
            const attendeeCountBadge = document.getElementById('attendeeCountBadge');
            if (!attendeeCountBadge) return;

            const count = currentAttendees.length;

            if (count > 0) {
                attendeeCountBadge.textContent = `${count}명`;
                attendeeCountBadge.style.display = 'inline-block';
            } else {
                attendeeCountBadge.style.display = 'none';
            }
        }

        // 프로젝트 직급별 경비 설정 불러오기
        async function loadProjectExpenseSettings(projectIdx) {
            const tooltipContent = document.getElementById('expenseTooltipContent');
            if (!tooltipContent) return;

            try {
                tooltipContent.innerHTML = '<div class="expense-tooltip-loading">불러오는 중...</div>';

                const response = await fetch(`/api/projects/${projectIdx}/expense-settings`);
                if (!response.ok) {
                    throw new Error('경비 설정 조회 실패');
                }

                const settings = await response.json();

                if (!settings || settings.length === 0) {
                    tooltipContent.innerHTML = '<div class="expense-tooltip-empty">경비 설정이 없습니다</div>';
                    return;
                }

                // 회의비 항목만 필터링 (대소문자 무시, 부분 일치)
                const meetingExpenses = settings.filter(s => {
                    const itemName = (s.expenseItemName || '').toLowerCase();
                    const itemNameEn = (s.expenseItemNameEn || '').toLowerCase();
                    return itemName.includes('회의') || itemNameEn.includes('meeting');
                });

                if (meetingExpenses.length === 0) {
                    tooltipContent.innerHTML = '<div class="expense-tooltip-empty">회의비 설정이 없습니다</div>';
                    return;
                }

                // 툴팁 HTML 생성
                let html = '<div class="expense-tooltip-header">직급별 회의비</div>';
                meetingExpenses.forEach(setting => {
                    const formattedAmount = setting.amount ? setting.amount.toLocaleString('ko-KR') : '0';
                    html += `
                        <div class="expense-tooltip-item">
                            <span class="expense-tooltip-position">${setting.positionName || setting.positionCode}</span>
                            <span class="expense-tooltip-amount">${formattedAmount}원</span>
                        </div>
                    `;
                });

                tooltipContent.innerHTML = html;

            } catch (error) {
                console.error('프로젝트 경비 설정 조회 오류:', error);
                tooltipContent.innerHTML = '<div class="expense-tooltip-empty">조회 실패</div>';
            }
        }

        // 전역으로 등록 (다른 모달에서 접근 가능하도록)
        window.updateAttendeeTotalAmount = updateAttendeeTotalAmount;
        window.loadProjectExpenseSettings = loadProjectExpenseSettings;

        // 템플릿 내에서 참석자 제거
        window.removeAttendeeInTemplate = function(attendeeId) {
            console.log('[참석자 삭제 시도]', {
                attendeeId: attendeeId,
                attendeeIdType: typeof attendeeId,
                currentAttendees: currentAttendees,
                currentAttendeesCount: currentAttendees.length
            });

            // 작성자 ID 확인
            const currentAuthorId = document.getElementById('common_author_id')?.value;

            // 작성자는 삭제 불가
            if (currentAuthorId && String(attendeeId) === String(currentAuthorId)) {
                showWarning('작성자는 참석자에서 삭제할 수 없습니다.');
                return;
            }

            // 삭제 전 참석자 수
            const beforeCount = currentAttendees.length;

            // String으로 변환하여 비교 (타입 불일치 방지)
            currentAttendees = currentAttendees.filter(a => {
                const match = String(a.id) !== String(attendeeId);
                if (!match) {
                    console.log('[삭제 대상 발견]', {
                        attendeeId: a.id,
                        attendeeName: a.name,
                        attendeeType: a.type
                    });
                }
                return match;
            });

            // 삭제 후 참석자 수
            const afterCount = currentAttendees.length;
            console.log('[삭제 완료]', {
                beforeCount: beforeCount,
                afterCount: afterCount,
                deleted: beforeCount - afterCount
            });

            renderAttendeeListInTemplate();

            // 모달이 열려있으면 모달도 업데이트
            const attendeeModal = document.getElementById('attendeeModal');
            if (attendeeModal && attendeeModal.classList.contains('show')) {
                renderInternalList(internalSearchInput ? internalSearchInput.value : '');
                renderExternalList(externalSearchInput ? externalSearchInput.value : '');
            }

            // 필수 필드 검증
            validateRequiredFields();
        };

        // 전역 함수로 등록하여 모달에서 접근 가능하게
        window.addAttendeesToMeeting = function(persons) {
            persons.forEach(person => {
                if (!currentAttendees.some(a => a.id === person.id)) {
                    currentAttendees.push(person);
                }
            });
            renderAttendeeListInTemplate();

            // 필수 필드 검증
            validateRequiredFields();
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
                let formattedDateWithTime = `${year}.${month}.${day}.`;
                let formattedDateProposal = `${year}.${month}.${day}.`;

                if (startTimeValue && endTimeValue) {
                    const endTimeDisplay = endTimeValue === '00:00' ? '24:00' : endTimeValue;
                    // 날짜 + 줄바꿈 + 시간
                    formattedDateWithTime = `${year}.${month}.${day}.\n${startTimeValue} ~ ${endTimeDisplay}`;
                    formattedDateProposal = `${year}.${month}.${day}.\n${startTimeValue} ~ ${endTimeDisplay}`;
                } else if (startTimeValue) {
                    formattedDateWithTime = `${year}.${month}.${day}.\n${startTimeValue}`;
                    formattedDateProposal = `${year}.${month}.${day}.\n${startTimeValue}`;
                }

                document.querySelectorAll('.auto-datetime').forEach(field => {
                    field.value = formattedDateWithTime;
                });

                document.querySelectorAll('.auto-datetime-proposal').forEach(field => {
                    field.textContent = formattedDateProposal;
                });

                // 회의 품의서 - 집행 예정 금액 옆 일시 칸
                document.querySelectorAll('.auto-datetime-display').forEach(field => {
                    field.textContent = formattedDate; // 날짜만 표시
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
            commonDate.addEventListener('input', async function() {
                updateDateTime();
                updateDocNumber();

                // 날짜 변경 시 참석자 목록 초기화 (기존 데이터 로딩 중이 아닐 때만)
                if (!isLoadingExistingData) {
                    currentAttendees = [];

                    // 중복되지 않은 기본 작성자만 추가
                    await setDefaultAuthor();
                } else {
                    console.log('[날짜 change] 기존 데이터 로딩 중 - 참석자 초기화 건너뜀');
                }
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
                const formattedValue = formatTextWithLineBreaks(value, 5);

                document.querySelectorAll('.auto-purpose').forEach(field => {
                    // div로 변경되었으므로 innerHTML 사용
                    field.innerHTML = formattedValue;
                });
                document.querySelectorAll('.auto-subject').forEach(field => {
                    field.textContent = value;
                });
            });
        }

        // 주요 내용 자동 채우기
        const commonContent = document.getElementById('common_content');
        if (commonContent) {
            commonContent.addEventListener('input', function() {
                updateContentByteCounter(this.value);
                const value = this.value;
                document.querySelectorAll('.auto-content').forEach(field => {
                    field.textContent = value;

                    // 내용 길이에 따라 폰트 크기 및 줄 간격 자동 조절
                    const length = value.length;
                    let fontSize = '18px';
                    let lineHeight = '1.6';

                    if (length > 1500) {
                        fontSize = '9px';
                        lineHeight = '1.4';
                    } else if (length > 1200) {
                        fontSize = '10px';
                        lineHeight = '1.4';
                    } else if (length > 900) {
                        fontSize = '11px';
                        lineHeight = '1.5';
                    } else if (length > 700) {
                        fontSize = '12px';
                        lineHeight = '1.5';
                    } else if (length > 500) {
                        fontSize = '13px';
                        lineHeight = '1.5';
                    } else if (length > 350) {
                        fontSize = '14px';
                        lineHeight = '1.6';
                    } else if (length > 250) {
                        fontSize = '15px';
                        lineHeight = '1.6';
                    } else if (length > 150) {
                        fontSize = '16px';
                        lineHeight = '1.6';
                    } else {
                        fontSize = '18px';
                        lineHeight = '1.6';
                    }

                    field.style.fontSize = fontSize;
                    field.style.lineHeight = lineHeight;
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

    // 필수 필드 검증 및 인쇄 버튼 표시/숨김
    function validateRequiredFields() {
        const printBtn = document.getElementById('printDocumentBtn');
        if (!printBtn) return;

        // 필수 필드 체크
        const projectInput = document.getElementById('common_project');
        const cardInput = document.getElementById('common_card');
        const authorInput = document.getElementById('common_author');
        const dateInput = document.getElementById('common_date');
        const startTimeInput = document.getElementById('common_start_time');
        const endTimeInput = document.getElementById('common_end_time');
        const locationInput = document.getElementById('common_location');
        const amountInput = document.getElementById('common_amount');
        const purposeInput = document.getElementById('common_purpose');
        const contentInput = document.getElementById('common_content');

        // 필수 필드 강조 처리
        if (projectInput) {
            if (projectInput.value.trim() === '') {
                projectInput.classList.add('field-empty');
            } else {
                projectInput.classList.remove('field-empty');
            }
        }

        if (cardInput) {
            if (cardInput.value.trim() === '') {
                cardInput.classList.add('field-empty');
            } else {
                cardInput.classList.remove('field-empty');
            }
        }

        if (authorInput) {
            if (authorInput.value.trim() === '') {
                authorInput.classList.add('field-empty');
            } else {
                authorInput.classList.remove('field-empty');
            }
        }

        if (dateInput) {
            if (dateInput.value.trim() === '') {
                dateInput.classList.add('field-empty');
            } else {
                dateInput.classList.remove('field-empty');
            }
        }

        // startTime, endTime은 기본값이 있고 빈 값 불가능하므로 빨간 테두리 불필요

        if (locationInput) {
            if (locationInput.value.trim() === '') {
                locationInput.classList.add('field-empty');
            } else {
                locationInput.classList.remove('field-empty');
            }
        }

        if (amountInput) {
            if (amountInput.value.trim() === '') {
                amountInput.classList.add('field-empty');
            } else {
                amountInput.classList.remove('field-empty');
            }
        }

        if (purposeInput) {
            if (purposeInput.value.trim() === '') {
                purposeInput.classList.add('field-empty');
            } else {
                purposeInput.classList.remove('field-empty');
            }
        }

        if (contentInput) {
            if (contentInput.value.trim() === '') {
                contentInput.classList.add('field-empty');
            } else {
                contentInput.classList.remove('field-empty');
            }
        }

        // 참석자 영역 강조 처리
        const attendeeArea = document.getElementById('attendeeArea');
        if (attendeeArea) {
            if (!currentAttendees || currentAttendees.length === 0) {
                attendeeArea.classList.add('field-empty');
            } else {
                attendeeArea.classList.remove('field-empty');
            }
        }

        // 모든 필드가 채워졌는지 확인
        const allFieldsFilled =
            projectInput && projectInput.value.trim() !== '' &&
            cardInput && cardInput.value.trim() !== '' &&
            authorInput && authorInput.value.trim() !== '' &&
            dateInput && dateInput.value.trim() !== '' &&
            startTimeInput && startTimeInput.value.trim() !== '' &&
            endTimeInput && endTimeInput.value.trim() !== '' &&
            locationInput && locationInput.value.trim() !== '' &&
            amountInput && amountInput.value.trim() !== '' &&
            purposeInput && purposeInput.value.trim() !== '' &&
            contentInput && contentInput.value.trim() !== '' &&
            currentAttendees && currentAttendees.length > 0;

        // 인쇄 버튼 표시/숨김
        if (allFieldsFilled) {
            printBtn.style.display = 'inline-flex';
        } else {
            printBtn.style.display = 'none';
        }
    }

    // 공식 문서 양식 토글 기능
    function setupDocumentFormToggle() {
        const documentFormToggle = document.getElementById('documentFormToggle');
        const documentFormWrapper = document.querySelector('.document-form-wrapper');
        const printBtn = document.getElementById('printDocumentBtn');

        if (documentFormToggle && documentFormWrapper) {
            documentFormToggle.addEventListener('click', function() {
                documentFormWrapper.classList.toggle('collapsed');
                documentFormToggle.classList.toggle('active');
            });
        }

        // 인쇄 버튼 이벤트
        if (printBtn) {
            printBtn.addEventListener('click', function() {
                printDocument();
            });
        }

        // 필수 필드 변경 시 검증
        const fieldsToWatch = [
            'common_project',
            'common_card',
            'common_author',
            'common_date',
            'common_start_time',
            'common_end_time',
            'common_location',
            'common_amount',
            'common_purpose',
            'common_content'
        ];

        fieldsToWatch.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', validateRequiredFields);
                field.addEventListener('change', validateRequiredFields);
            }
        });

        // 초기 검증
        validateRequiredFields();
    }

    // 주요 내용 폰트 크기 자동 조정
    function adjustContentFontSize() {
        const contentElements = document.querySelectorAll('.auto-content');

        contentElements.forEach(element => {
            const textLength = element.textContent.trim().length;
            let fontSize = 13; // 기본 크기
            let lineHeight = 1.6;

            // 텍스트 길이에 따라 폰트 크기 조정
            if (textLength > 1500) {
                fontSize = 8;
                lineHeight = 1.3;
            } else if (textLength > 1200) {
                fontSize = 10;
                lineHeight = 1.4;
            } else if (textLength > 900) {
                fontSize = 11;
                lineHeight = 1.5;
            } else if (textLength > 600) {
                fontSize = 12;
                lineHeight = 1.55;
            }

            // 스타일 적용
            element.style.fontSize = fontSize + 'px';
            element.style.lineHeight = lineHeight;
        });
    }

    // 참석자 테이블 행 높이 자동 조정 (12명 초과 시)
    function adjustAttendeeTableHeight() {
        const attendeeTable = document.getElementById('attendee-signature-table');
        const documentFormContent = document.getElementById('documentFormContent');

        if (!attendeeTable || !documentFormContent) return;

        const attendeeCount = currentAttendees ? currentAttendees.length : 0;

        // 참석자 소속(부서) 개수 카운트
        const uniqueDepts = new Set();
        if (currentAttendees && currentAttendees.length > 0) {
            currentAttendees.forEach(attendee => {
                if (attendee.dept) {
                    uniqueDepts.add(attendee.dept);
                }
            });
        }
        const deptCount = uniqueDepts.size;

        // 소속 5개 초과 시 1페이지 칸 높이 최소화를 위한 class 추가
        if (deptCount > 5) {
            documentFormContent.classList.add('many-departments');
        } else {
            documentFormContent.classList.remove('many-departments');
        }

        // 참석자 12명 초과 시 처리
        if (attendeeCount > 12) {
            // 참석자가 12명 초과 시 전체 문서에 class 추가 (CSS에서 활용)
            documentFormContent.classList.add('many-attendees');

            // 참석자가 12명 초과 시 폰트 크기 축소 및 행 높이 최소화 (최대 20명까지)
            const rows = attendeeTable.querySelectorAll('tbody tr');
            const headerRows = attendeeTable.querySelectorAll('thead tr');
            const headerCells = attendeeTable.querySelectorAll('thead th');
            const bodyCells = attendeeTable.querySelectorAll('tbody td');

            // 헤더 행 높이 및 스타일
            headerRows.forEach(row => {
                row.style.height = '20px';
                row.style.minHeight = '20px';
            });

            // 헤더 셀 스타일 (구분/성명/소속/서명 - 조금 더 크게)
            headerCells.forEach(cell => {
                cell.style.fontSize = '7px';
                cell.style.padding = '2px 3px';
                cell.style.lineHeight = '1.1';
            });

            // 참석자 행 높이 축소 (내역 부분 - 더 작게)
            rows.forEach(row => {
                row.style.height = '16px';
                row.style.minHeight = '16px';
            });

            // 참석자 내역 셀 스타일 (tbody - 80% 축소)
            bodyCells.forEach(cell => {
                cell.style.fontSize = '5px';
                cell.style.padding = '1px 2px';
                cell.style.lineHeight = '1.1';
                cell.style.minHeight = '16px';
                cell.style.height = '16px';
            });
        } else {
            // 12명 이하일 경우 class 제거
            documentFormContent.classList.remove('many-attendees');
        }
    }

    // 인쇄 함수
    function printDocument() {
        const documentFormWrapper = document.querySelector('.document-form-wrapper');

        // 문서가 접혀있으면 먼저 펼치기
        if (documentFormWrapper && documentFormWrapper.classList.contains('collapsed')) {
            documentFormWrapper.classList.remove('collapsed');
            const documentFormToggle = document.getElementById('documentFormToggle');
            if (documentFormToggle) {
                documentFormToggle.classList.add('active');
            }
        }

        // 주요 내용 폰트 크기 자동 조정
        adjustContentFontSize();

        // 참석자 테이블 행 높이 자동 조정
        adjustAttendeeTableHeight();

        // 잠시 대기 후 인쇄 (문서가 완전히 렌더링되도록)
        setTimeout(function() {
            window.print();
        }, 300);
    }

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
        if (!receiptFileList) return;
        // 재렌더 전 blob URL 정리
        if (typeof window.revokeChipThumbs === 'function') window.revokeChipThumbs(receiptFileList);
        receiptFileList.innerHTML = '';

        // 1. 기존 영수증 파일 표시 (삭제 예정 제외)
        existingReceiptAttachments.forEach(att => {
            if (deletedAttachmentIds.includes(att.idx)) return;
            const item = document.createElement('div');
            item.className = 'file-item';
            const fileSizeKB = att.fileSize ? `(${(att.fileSize / 1024).toFixed(1)} KB)` : '';
            item.innerHTML = `
                <i class="fas ${getFileIcon(att.originalFilename)}"></i>
                <span>${att.originalFilename} ${fileSizeKB}</span>
                <button class="btn-download-file" onclick="downloadAttachment(${att.idx}, '${att.originalFilename}')" data-tip="다운로드">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn-remove-file" onclick="removeExistingAttachment(${att.idx})" data-tip="삭제">
                    <i class="fas fa-times"></i>
                </button>
            `;
            // 이미지면 첫 아이콘을 썸네일로 교체
            if (typeof window.attachThumbToFileItem === 'function') {
                window.attachThumbToFileItem(item, `/api/receipt-meetings/attachments/${att.idx}/download`, att.originalFilename);
            }
            receiptFileList.appendChild(item);
        });

        // 2. 새로 선택한 영수증 파일 표시
        selectedReceiptFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <i class="fas ${getFileIcon(file.name)}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB) <span style="color: #667eea; font-size: 11px;">[신규]</span></span>
                <button class="btn-remove-file" onclick="removeReceiptFile(${index})" data-tip="삭제">
                    <i class="fas fa-times"></i>
                </button>
            `;
            if (typeof window.attachThumbToFileItem === 'function') {
                window.attachThumbToFileItem(item, file);
            }
            receiptFileList.appendChild(item);
        });

        // 3. 파일이 하나도 없으면 안내 메시지
        const visibleExisting = existingReceiptAttachments.filter(f => !deletedAttachmentIds.includes(f.idx));
        if (visibleExisting.length === 0 && selectedReceiptFiles.length === 0) {
            receiptFileList.innerHTML = '<p style="color: #999; font-size: 12px; padding: 10px 0;">첨부된 파일이 없습니다.</p>';
        }
    }

    function updateDocumentFileList() {
        if (!documentFileList) return;
        documentFileList.innerHTML = '';

        // 1. 기존 공식문서 파일 표시 (삭제 예정 제외)
        existingDocumentAttachments.forEach(att => {
            if (deletedAttachmentIds.includes(att.idx)) return;
            const item = document.createElement('div');
            item.className = 'file-item';
            const fileSizeKB = att.fileSize ? `(${(att.fileSize / 1024).toFixed(1)} KB)` : '';
            item.innerHTML = `
                <i class="fas ${getFileIcon(att.originalFilename)}"></i>
                <span>${att.originalFilename} ${fileSizeKB}</span>
                <button class="btn-download-file" onclick="downloadAttachment(${att.idx}, '${att.originalFilename}')" data-tip="다운로드">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn-remove-file" onclick="removeExistingAttachment(${att.idx})" data-tip="삭제">
                    <i class="fas fa-times"></i>
                </button>
            `;
            documentFileList.appendChild(item);
        });

        // 2. 새로 선택한 공식문서 파일 표시
        selectedDocumentFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <i class="fas ${getFileIcon(file.name)}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB) <span style="color: #667eea; font-size: 11px;">[신규]</span></span>
                <button class="btn-remove-file" onclick="removeDocumentFile(${index})" data-tip="삭제">
                    <i class="fas fa-times"></i>
                </button>
            `;
            documentFileList.appendChild(item);
        });

        // 3. 파일이 하나도 없으면 안내 메시지
        const visibleExisting = existingDocumentAttachments.filter(f => !deletedAttachmentIds.includes(f.idx));
        if (visibleExisting.length === 0 && selectedDocumentFiles.length === 0) {
            documentFileList.innerHTML = '<p style="color: #999; font-size: 12px; padding: 10px 0;">첨부된 파일이 없습니다.</p>';
        }
    }

    setupUpload(receiptInput, receiptUploadArea, selectedReceiptFiles, updateReceiptFileList);
    setupUpload(documentInput, documentUploadArea, selectedDocumentFiles, updateDocumentFileList);

    // 클립보드 이미지 붙여넣기 — 영수증 슬롯에만 적용
    if (receiptUploadArea) {
        receiptUploadArea.classList.add('paste-active');
        if (typeof window.ensurePasteHint === 'function') {
            window.ensurePasteHint(receiptUploadArea, { text: '여기에 Ctrl+V 붙여넣기' });
        }
    }
    if (typeof window.setupClipboardImagePaste === 'function') {
        window.setupClipboardImagePaste({
            resolveTarget: () => ({
                addFile: (file) => {
                    if (selectedReceiptFiles.length >= 5) {
                        showWarning('최대 5개까지만 첨부 가능합니다.');
                        return false;
                    }
                    if (file.size > 10 * 1024 * 1024) {
                        showWarning('파일 크기는 10MB를 초과할 수 없습니다.');
                        return false;
                    }
                    selectedReceiptFiles.push(file);
                    updateReceiptFileList();
                    if (receiptUploadArea) {
                        receiptUploadArea.classList.remove('paste-flash');
                        void receiptUploadArea.offsetWidth;
                        receiptUploadArea.classList.add('paste-flash');
                    }
                    return true;
                },
                label: '영수증',
            }),
        });
    }

    window.removeReceiptFile = function(index) { selectedReceiptFiles.splice(index, 1); updateReceiptFileList(); };
    window.removeDocumentFile = function(index) { selectedDocumentFiles.splice(index, 1); updateDocumentFileList(); };
    window.removeExistingAttachment = function(idx) {
        deletedAttachmentIds.push(idx);
        updateReceiptFileList();
        updateDocumentFileList();
    };

    // 기존 첨부파일 다운로드
    window.downloadAttachment = async function(fileId, fileName) {
        try {
            const response = await fetch(`/api/receipt-meetings/attachments/${fileId}/download`);
            if (!response.ok) {
                Swal.fire({ icon: 'error', title: '파일을 찾을 수 없습니다', text: '파일이 서버에 존재하지 않거나 삭제되었습니다.' });
                return;
            }
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (e) {
            Swal.fire({ icon: 'error', title: '다운로드 오류', text: '파일 다운로드 중 오류가 발생했습니다.' });
        }
    };

    // 기존 첨부파일을 타입별로 분리하여 상태 변수에 저장 후 렌더링
    function displayExistingAttachments(attachments) {
        if (!attachments || attachments.length === 0) return;
        existingReceiptAttachments = attachments.filter(a => a.attachmentType === 'RECEIPT' || !a.attachmentType);
        existingDocumentAttachments = attachments.filter(a => a.attachmentType === 'DOCUMENT');
        deletedAttachmentIds = [];
        updateReceiptFileList();
        updateDocumentFileList();
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

            // 저장 직전 중복 참석자 최종 검증
            const internalAttendeesForSave = currentAttendees.filter(a => a.type === 'internal');
            if (internalAttendeesForSave.length > 0) {
                try {
                    const attendeeIds = internalAttendeesForSave.map(a => parseInt(a.id)).filter(id => !isNaN(id));
                    if (attendeeIds.length > 0) {
                        const duplicates = await checkDuplicateAttendees(attendeeIds);

                        if (duplicates.length > 0) {
                            const duplicate = duplicates[0];
                            const meeting = duplicate.meeting;
                            const meetingDate = meeting.documentDate || '';
                            const projectName = meeting.projectName || '알 수 없는 프로젝트';
                            const documentTypePrefix = meeting.type || 'RCM';
                            const documentTypeName = meeting.typeName || documentTypePrefix;
                            const dateLabel = documentTypePrefix === 'RCM' ? '회의' : '야근';

                            let message = `저장할 수 없습니다.<br><br>`;
                            message += `동일 날짜에 이미 다른 ${documentTypeName}에 참석 중인 인원이 있습니다.<br><br>`;
                            message += `${dateLabel} 날짜: ${meetingDate}<br>`;

                            if (meeting.startTime && meeting.endTime) {
                                const timeRange = `${meeting.startTime.substring(0, 5)} ~ ${meeting.endTime.substring(0, 5)}`;
                                message += `${dateLabel} 시간: ${timeRange}<br>`;
                            }

                            message += `프로젝트: <strong>[${projectName}]</strong>`;

                            await showWarning(message);
                            return;
                        }
                    }
                } catch (error) {
                    console.error('[중복 검증 오류]', error);

                    // 사용자에게 계속 진행할지 물어봄
                    const confirmed = await showConfirm(
                        `참석자 중복 검증 중 오류가 발생했습니다.<br><br>` +
                        `오류 내용: ${error.message}<br><br>` +
                        `중복 검증 없이 계속 진행하시겠습니까?`,
                        '중복 검증 오류',
                        {
                            icon: 'warning',
                            confirmText: '계속 진행',
                            cancelText: '취소',
                            confirmColor: '#ff9800'
                        }
                    );

                    if (!confirmed) {
                        return;
                    }
                    console.log('[저장 계속] 중복 검증 스킵하고 진행');
                }
            }

            // 필수 필드 검증 (첨부파일 제외 모든 필드)
            const projectInput = document.getElementById('common_project');
            const projectIdxInput = document.getElementById('selectedProjectIdx');
            const dateInput = document.getElementById('common_date');
            const startTimeInput = document.getElementById('common_start_time');
            const endTimeInput = document.getElementById('common_end_time');
            const locationInput = document.getElementById('common_location');
            const purposeInput = document.getElementById('common_purpose');
            const contentInput = document.getElementById('common_content');

            if (!projectIdxInput || !projectIdxInput.value) {
                await showWarning('프로젝트를 선택해주세요.');
                if (projectInput) {
                    projectInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    projectInput.focus();
                }
                return;
            }

            if (!dateInput || !dateInput.value) {
                await showWarning('회의 일자를 입력해주세요.');
                dateInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                dateInput.focus();
                return;
            }

            if (!startTimeInput || !startTimeInput.value) {
                await showWarning('시작 시간을 입력해주세요.');
                startTimeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                startTimeInput.focus();
                return;
            }

            if (!endTimeInput || !endTimeInput.value) {
                await showWarning('종료 시간을 입력해주세요.');
                endTimeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                endTimeInput.focus();
                return;
            }

            // 회의 시간 범위 검증 (시작: 08:00~21:00, 종료: 10:00~22:00)
            const startTime = startTimeInput.value;
            const endTime = endTimeInput.value;
            let isTimeOutOfRange = false;
            let timeWarningMessage = '';

            // 시작 시간 범위 체크 (08:00 ~ 21:00)
            const startHour = parseInt(startTime.split(':')[0]);
            const startMinute = parseInt(startTime.split(':')[1] || 0);
            if (startHour < 8 || (startHour === 21 && startMinute > 0) || startHour > 21) {
                isTimeOutOfRange = true;
                timeWarningMessage += `시작 시간(${startTime})이 권장 범위(08:00~21:00)를 벗어났습니다.<br>`;
            }

            // 종료 시간 범위 체크 (10:00 ~ 22:00)
            const endHour = parseInt(endTime.split(':')[0]);
            const endMinute = parseInt(endTime.split(':')[1] || 0);
            if (endHour < 10 || (endHour === 22 && endMinute > 0) || endHour > 22) {
                isTimeOutOfRange = true;
                timeWarningMessage += `종료 시간(${endTime})이 권장 범위(10:00~22:00)를 벗어났습니다.<br>`;
            }

            if (!locationInput || !locationInput.value.trim()) {
                await showWarning('장소를 입력해주세요.');
                locationInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                locationInput.focus();
                return;
            }

            if (!purposeInput || !purposeInput.value.trim()) {
                await showWarning('회의 목적을 입력해주세요.');
                purposeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                purposeInput.focus();
                return;
            }

            if (!amountInput || !amountInput.value || parseInt(amountInput.value.replace(/,/g, '')) <= 0) {
                await showWarning('사용 금액을 입력해주세요.');
                amountInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                amountInput.focus();
                return;
            }

            if (!contentInput || !contentInput.value.trim()) {
                await showWarning('주요 내용을 입력해주세요.');
                contentInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                contentInput.focus();
                return;
            }

            const contentBytes = getByteLength(contentInput.value.trim());
            if (contentBytes < MIN_CONTENT_BYTES) {
                await Swal.fire({
                    icon: 'warning',
                    title: '주요 내용을 더 상세히 작성해주세요',
                    html: `현재 <b>${contentBytes}bytes</b> 입력되었습니다.<br><br>
                           회의 내용이 부실하게 작성된 경우 <b>정산 시 반려</b>될 수 있습니다.<br>
                           논의된 내용, 결정 사항, 참석자별 발언 등을 구체적으로 작성해주세요.<br><br>
                           <span style="color:#888;font-size:13px;">최소 ${MIN_CONTENT_BYTES}bytes 이상 입력 필요 (${MIN_CONTENT_BYTES - contentBytes}bytes 더 필요)</span>`,
                    confirmButtonText: '다시 작성하기'
                });
                contentInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                contentInput.focus();
                return;
            }

            if (!currentAttendees || currentAttendees.length === 0) {
                await showWarning('참석자를 1명 이상 추가해주세요.');
                const attendeeArea = document.getElementById('attendeeArea');
                if (attendeeArea) {
                    attendeeArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            const hasExternalAttendee = currentAttendees.some(a => a.type === 'external');
            if (!hasExternalAttendee) {
                await Swal.fire({
                    icon: 'error',
                    title: '외부인원 필수',
                    html: `연구비증빙 회의록은 <b>외부인원이 1명 이상</b> 참석해야 합니다.<br><br>
                           참석자 추가에서 <b>외부인원</b> 패널을 통해 추가해주세요.<br>
                           <span style="color:#888;font-size:13px;">외부인원이 없는 회의는 연구비증빙 대상이 아닙니다.</span>`,
                    confirmButtonText: '참석자 추가하기'
                });
                const attendeeArea = document.getElementById('attendeeArea');
                if (attendeeArea) {
                    attendeeArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            // 참석자 목록 변환
            const attendeeDTOs = currentAttendees.map((attendee, index) => {
                const dto = {
                    isExternal: attendee.type === 'external',
                    department: attendee.dept || null,
                    name: attendee.name,
                    userIdx: parseInt(attendee.id),
                    position: attendee.position || null,
                    displayOrder: index,
                    meetingExpense: attendee.meetingExpense || 0
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
                authorIdx: authorIdInput && authorIdInput.value ? parseInt(authorIdInput.value) : null,
                meetingDate: dateInput.value,
                startTime: startTimeInput.value + ':00',  // HH:mm:ss 형식
                endTime: endTimeInput.value + ':00',
                location: locationInput.value,
                amount: amountInput && amountInput.value ? parseInt(amountInput.value.replace(/,/g, '')) : null,
                purpose: purposeInput ? purposeInput.value : null,
                content: document.getElementById('common_content') ? document.getElementById('common_content').value : null,
                isProject: true,  // 프로젝트 관련 문서임을 명시
                attendees: attendeeDTOs
            };

            // 시간 범위 벗어남 경고
            if (isTimeOutOfRange) {
                const timeConfirmed = await showConfirm(
                    timeWarningMessage + '<br>정말 이 시간으로 저장하시겠습니까?',
                    '회의 시간 확인',
                    {
                        icon: 'warning',
                        confirmText: '저장',
                        cancelText: '취소',
                        confirmColor: '#ff9800'
                    }
                );

                if (!timeConfirmed) {
                    return;
                }
            }

            // 활동비 초과 여부 확인 (경고만, 차단 없음)
            const projIdxForBudget = parseInt(projectIdxInput.value);
            if (projIdxForBudget) {
                try {
                    const budgetRes = await fetch(`/api/projects/${projIdxForBudget}/activity-usage`);
                    if (budgetRes.ok) {
                        const budgetData = await budgetRes.json();
                        const currentAmount = amountInput && amountInput.value ? parseInt(amountInput.value.replace(/,/g, '')) || 0 : 0;
                        const newTotalSpent = (budgetData.totalSpent || 0) + currentAmount;
                        if (newTotalSpent > (budgetData.activityBudget || 0)) {
                            const excessAmount = newTotalSpent - (budgetData.activityBudget || 0);
                            const budgetResult = await Swal.fire({
                                icon: 'warning',
                                title: '활동비 초과 경고',
                                html: `등록하려는 금액(<b>${currentAmount.toLocaleString()}원</b>)을 포함하면<br>활동비 예산을 <b style="color:#ef4444;">${excessAmount.toLocaleString()}원</b> 초과합니다.<br><br>그래도 저장하시겠습니까?`,
                                showCancelButton: true,
                                confirmButtonText: '저장',
                                cancelButtonText: '취소',
                                confirmButtonColor: '#667eea'
                            });
                            if (!budgetResult.isConfirmed) return;
                        }
                    }
                } catch (e) {
                    console.warn('활동비 조회 실패:', e);
                }
            }

            const confirmed = showSaveConfirm('회의록을 저장하시겠습니까?');
                if(!confirmed)return;
            showLoading('저장 중...');
            try {
                // FormData 생성 (JSON + 파일 함께 전송)
                const formData = new FormData();

                // JSON 데이터를 문자열로 변환하여 추가
                formData.append('data', JSON.stringify(saveData));

                // 첨부파일 추가 (영수증/공식문서 분리)
                selectedReceiptFiles.forEach(file => formData.append('receiptFiles', file));
                selectedDocumentFiles.forEach(file => formData.append('documentFiles', file));

                const response = await fetch('/api/receipt-meetings', {
                    method: 'POST',
                    body: formData
                    // Content-Type 헤더는 자동으로 설정됨 (multipart/form-data)
                });

                // 인증 실패 또는 세션 만료
                if (response.status === 401 || response.status === 302 || response.redirected) {
                    hideLoading();
                    await Swal.fire({
                        icon: 'warning',
                        title: '로그인이 필요합니다',
                        text: '세션이 만료되었습니다. 다시 로그인해주세요.',
                        confirmButtonText: '로그인 페이지로 이동'
                    });
                    window.location.href = '/login';
                    return;
                }

                // 권한 없음
                if (response.status === 403) {
                    hideLoading();
                    showError('문서를 생성할 권한이 없습니다.');
                    return;
                }

                if (response.ok) {
                    const result = await response.json();

                    hideLoading();
                    await Swal.fire({
                        icon: 'success',
                        title: '저장 완료',
                        text: '회의록이 저장되었습니다.',
                        timer: 3000,
                        timerProgressBar: true,
                        showConfirmButton: true,
                        confirmButtonText: '확인',
                        allowOutsideClick: false
                    });

                    // 저장 후 목록 페이지로 이동
                    popupAwareRedirect('/project/documents');
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

    // 검색 유틸리티 (공통 - 외부 searchUtils 인스턴스 사용)
    // 이 영역은 .highlight CSS 클래스를 사용 (참석자/프로젝트 카드 모달)
    const matchesSearch = (text, keyword) => searchUtils.matchesSearch(text, keyword);
    const highlightText = (text, keyword) => searchUtils.highlightText(text, keyword, 'highlight');

    // 참석자 목록 데이터 (프로젝트 팀원에서 가져옴)
    function getAttendeePersons() {
        return projectMembers.map(member => {
            const positionName = member.employeePositionName || '-';
            const positionCode = member.employeePositionCode;
            let meetingExpense = 0;

            // 1순위: 프로젝트별 경비 설정에서 회의비 찾기
            if (projectExpenseSettings && projectExpenseSettings.length > 0 && positionCode) {
                const projectSetting = projectExpenseSettings.find(setting =>
                    setting.positionCode === positionCode &&
                    setting.expenseItemName === '회의비'
                );
                if (projectSetting && projectSetting.amount) {
                    meetingExpense = projectSetting.amount;
                } else {
                    // 2순위: 기초정보관리의 직급별 고정경비 사용
                    if (fixedExpenses[positionName]) {
                        meetingExpense = fixedExpenses[positionName];
                    }
                }
            } else {
                // 프로젝트 경비 설정이 없으면 기본 고정경비 사용
                if (fixedExpenses[positionName]) {
                    meetingExpense = fixedExpenses[positionName];
                }
            }

            return {
                id: member.employeeIdx,
                name: member.employeeName,
                position: positionName,
                dept: member.employeeDeptName || '-',
                meetingExpense: meetingExpense,
                type: 'internal',
                participationStartDate: member.participationStartDate || null,
                participationEndDate: member.participationEndDate || null
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

        // 프로젝트 목록
        const projectItems = filtered.map(proj => {
            const highlightedName = highlightText(proj.projectName, searchText);
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
                        <div class="project-item-name">${highlightedName}</div>
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
                    commonProject.classList.remove('field-empty');
                }
                const selectedProjectIdx = document.getElementById('selectedProjectIdx');
                if (selectedProjectIdx) {
                    selectedProjectIdx.value = proj.idx;
                }

                // 자동 채우기
                document.querySelectorAll('.auto-project').forEach(field => {
                    field.value = proj.projectName;
                });

                // 참석자 목록 초기화 (기본 작성자만 남기기)
                currentAttendees = [];

                // 프로젝트 팀원 로드
                await loadProjectMembers(proj.idx);

                // 프로젝트 직급별 경비 설정 로드
                await loadProjectExpenseSettings(proj.idx);

                // 기본 작성자 설정
                await setDefaultAuthor();
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
                        commonCard.classList.remove('field-empty');
                    }
                    if (selectedCardIdx) {
                        selectedCardIdx.value = firstCard.idx;
                    }
                    console.log('[참석자모달→카드 자동선택] cardName:', firstCard.cardName, '| field-empty 제거됨:', !commonCard?.classList.contains('field-empty'));
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
                validateRequiredFields();

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

        const currentAuthorId = document.getElementById('common_author_id')?.value || '';
        const meetingDateStr = document.getElementById('common_date')?.value || '';
        internalListEl.innerHTML = filtered.map(person => {
            const isSelected = tempSelectedAttendees.some(a => String(a.id) === String(person.id) && a.type === 'internal');
            const isAuthor = String(person.id) === String(currentAuthorId);
            const formattedExpense = person.meetingExpense ? person.meetingExpense.toLocaleString('ko-KR') + '원' : '-';
            const isDuplicate = duplicateAttendeesInfo[person.id];
            const isInactive = !isMemberActiveOnDate(person, meetingDateStr);

            const highlightedName = highlightText(person.name, searchText);
            const highlightedDept = highlightText(person.dept, searchText);
            const highlightedPosition = highlightText(person.position, searchText);

            // 작성자 뱃지
            const authorBadge = isAuthor ? '<span style="background:#e0e7ff; color:#4338ca; padding:2px 8px; border-radius:4px; font-size:11px; margin-left:8px; white-space:nowrap;"><i class="fas fa-user-check"></i> 작성자</span>' : '';

            // 참여기간 외 뱃지 (회색)
            let inactiveBadge = '';
            if (isInactive && meetingDateStr) {
                const tip = `참여기간: ${formatMemberPeriod(person)}`;
                inactiveBadge = `<span style="background:#e5e7eb; color:#4b5563; padding:2px 8px; border-radius:4px; font-size:11px; margin-left:8px; white-space:nowrap;" data-tip="${tip}"><i class="fas fa-calendar-times"></i> 참여기간 외</span>`;
            }

            // 중복 참석자 뱃지
            let duplicateBadge = '';
            if (isDuplicate) {
                const projectName = isDuplicate.projectName || '알 수 없는 프로젝트';
                const timeRange = isDuplicate.startTime && isDuplicate.endTime
                    ? `${isDuplicate.startTime}~${isDuplicate.endTime}`
                    : '';
                const tooltipText = `${projectName} 프로젝트 회의 (${timeRange})`;
                duplicateBadge = `<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; white-space: nowrap;" data-tip="${tooltipText}"><i class="fas fa-ban"></i> 시간 중복</span>`;
            }

            const isLocked = isAuthor || isDuplicate || isInactive;
            const lockedStyle = isLocked ? 'opacity: 0.6; cursor: not-allowed;' : '';
            const onclickAttr = isLocked ? '' : `onclick="toggleInternalAttendee(${person.id})"`;
            const checkIcon = isAuthor
                ? '<i class="fas fa-check-circle" style="color: #94a3b8; font-size: 18px; margin-left: auto;"></i>'
                : (isSelected ? '<i class="fas fa-check-circle" style="color: #10b981; font-size: 18px; margin-left: auto;"></i>' : '');

            return `
                <div class="employee-item ${isSelected ? 'selected' : ''} ${isLocked ? 'duplicate-disabled' : ''}"
                     data-id="${person.id}"
                     data-type="internal"
                     style="${lockedStyle}"
                     ${onclickAttr}>
                    <div class="employee-info">
                        <div class="employee-name">${highlightedName}${authorBadge}${inactiveBadge}${duplicateBadge}</div>
                        <div class="employee-details">${highlightedPosition} · ${highlightedDept} · ${formattedExpense}</div>
                    </div>
                    ${checkIcon}
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
            const isDuplicate = duplicateAttendeesInfo[person.idx];

            const highlightedName = highlightText(person.name, searchText);
            const highlightedCompany = highlightText(person.companyName || '-', searchText);
            const highlightedPosition = highlightText(person.position || '-', searchText);

            // 외부인원 회의비: 무조건 3만원
            const formattedExpense = '30,000원';

            // 중복 참석자 뱃지
            let duplicateBadge = '';
            if (isDuplicate) {
                const projectName = isDuplicate.projectName || '알 수 없는 프로젝트';
                const timeRange = isDuplicate.startTime && isDuplicate.endTime
                    ? `${isDuplicate.startTime}~${isDuplicate.endTime}`
                    : '';
                const tooltipText = `${projectName} 프로젝트 회의 (${timeRange})`;
                duplicateBadge = `<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; white-space: nowrap;" data-tip="${tooltipText}"><i class="fas fa-ban"></i> 시간 중복</span>`;
            }

            const disabledStyle = isDuplicate ? 'opacity: 0.5; cursor: not-allowed; pointer-events: none;' : '';

            return `
                <div class="employee-item ${isSelected ? 'selected' : ''} ${isDuplicate ? 'duplicate-disabled' : ''}"
                     data-id="${person.idx}"
                     data-type="external"
                     style="${disabledStyle}"
                     onclick="toggleExternalAttendee(${person.idx})">
                    <div class="employee-info">
                        <div class="employee-name">${highlightedName}${duplicateBadge}</div>
                        <div class="employee-details">${highlightedPosition} · ${highlightedCompany} · ${formattedExpense}</div>
                    </div>
                    ${isSelected ? '<i class="fas fa-check-circle" style="color: #10b981; font-size: 18px; margin-left: auto;"></i>' : ''}
                </div>
            `;
        }).join('');
    }

    // 내부인원 선택 토글
    window.toggleInternalAttendee = async function(personId) {
        const attendeePersons = getAttendeePersons();
        const person = attendeePersons.find(p => p.id === personId);
        if (!person) return;

        // 작성자는 렌더링에서 클릭 차단됨 (안전장치)
        const currentAuthorId = document.getElementById('common_author_id')?.value || '';
        if (String(personId) === String(currentAuthorId)) return;

        const index = tempSelectedAttendees.findIndex(a => String(a.id) === String(personId) && a.type === 'internal');

        if (index > -1) {
            // 선택 해제
            tempSelectedAttendees.splice(index, 1);
        } else {
            // 참여기간 검증 — 회의 날짜 기준 활성 멤버만 선택 가능
            const meetingDateStr = document.getElementById('common_date')?.value || '';
            if (!meetingDateStr) {
                await showWarning('회의 날짜를 먼저 입력해주세요.');
                return;
            }
            if (!isMemberActiveOnDate(person, meetingDateStr)) {
                await showInactiveMemberAlert(person, '회의 날짜', meetingDateStr, '참석자');
                return;
            }
            // 선택 시 중복 체크 - 중복이면 선택 불가
            const isDuplicate = duplicateAttendeesInfo[personId];
            if (isDuplicate) {
                const projectName = isDuplicate.projectName || '알 수 없는 프로젝트';
                const meetingDate = isDuplicate.meetingDate || '';
                const timeRange = isDuplicate.startTime && isDuplicate.endTime
                    ? `${isDuplicate.startTime} ~ ${isDuplicate.endTime}`
                    : '';

                await showWarning(
                    `<strong>${person.name}</strong> 님은 선택할 수 없습니다.<br><br>` +
                    `동일 날짜 및 시간대에 이미 다른 회의에 참석 중입니다.<br><br>` +
                    `회의 날짜: ${meetingDate}<br>` +
                    `회의 시간: ${timeRange}<br>` +
                    `프로젝트: <strong>[${projectName}]</strong>`
                );
                return; // 선택 불가
            }

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
    window.toggleExternalAttendee = async function(personIdx) {
        const person = allExternalPersons.find(p => p.idx === personIdx);
        if (!person) return;

        const index = tempSelectedAttendees.findIndex(a => parseInt(a.id) === personIdx && a.type === 'external');

        if (index > -1) {
            // 선택 해제
            tempSelectedAttendees.splice(index, 1);
        } else {
            // 선택 시 중복 체크 - 중복이면 선택 불가
            const isDuplicate = duplicateAttendeesInfo[personIdx];
            if (isDuplicate) {
                const projectName = isDuplicate.projectName || '알 수 없는 프로젝트';
                const meetingDate = isDuplicate.meetingDate || '';
                const timeRange = isDuplicate.startTime && isDuplicate.endTime
                    ? `${isDuplicate.startTime} ~ ${isDuplicate.endTime}`
                    : '';

                await showWarning(
                    `<strong>${person.name}</strong> 님은 선택할 수 없습니다.<br><br>` +
                    `동일 날짜 및 시간대에 이미 다른 회의에 참석 중입니다.<br><br>` +
                    `회의 날짜: ${meetingDate}<br>` +
                    `회의 시간: ${timeRange}<br>` +
                    `프로젝트: <strong>[${projectName}]</strong>`
                );
                return; // 선택 불가
            }

            tempSelectedAttendees.push({
                id: personIdx,
                name: person.name,
                dept: person.companyName || '-',
                position: person.position || '-',
                meetingExpense: 30000,
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

        // 금액 합계 계산 및 표시
        const totalAmount = tempSelectedAttendees.reduce((sum, person) => {
            return sum + (person.meetingExpense || 0);
        }, 0);
        const totalAmountEl = document.getElementById('selectedAttendeeTotalAmount');
        if (totalAmountEl) {
            totalAmountEl.textContent = totalAmount.toLocaleString('ko-KR');
        }

        if (tempSelectedAttendees.length === 0) {
            selectedAttendeeBadgesEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-plus"></i>
                    <span>참석자를 선택해주세요</span>
                </div>
            `;
            return;
        }

        // 현재 작성자 ID 가져오기
        const currentAuthorId = document.getElementById('common_author_id')?.value;

        selectedAttendeeBadgesEl.innerHTML = tempSelectedAttendees.map(person => {
            // 작성자인지 확인 (내부 인원만)
            const isAuthor = currentAuthorId && String(person.id) === String(currentAuthorId) && person.type === 'internal';

            // 작성자인 경우 삭제 불가 처리
            const clickEvent = isAuthor ? '' : `onclick="removeTempAttendee('${person.id}', '${person.type}')"`;
            const badgeClass = isAuthor ? 'is-author' : '';
            const authorBadge = isAuthor ? '<span class="author-tag" style="background: #667eea; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 4px;">작성자</span>' : '';
            const removeButton = isAuthor
                ? '<div class="badge-locked" style="color: #94a3b8; font-size: 11px;"><i class="fas fa-lock"></i></div>'
                : '<div class="badge-remove"><i class="fas fa-times"></i></div>';

            return `
                <div class="attendee-badge ${person.type === 'external' ? 'external' : ''} ${badgeClass}" ${clickEvent}>
                    <i class="fas fa-${person.type === 'external' ? 'user-tie' : 'user'}"></i>
                    <span class="badge-name">${person.name}${authorBadge}</span>
                    <span class="badge-info">${person.dept}</span>
                    ${removeButton}
                </div>
            `;
        }).join('');
    }

    // 임시 선택 참석자 제거
    window.removeTempAttendee = function(attendeeId, type) {
        // 작성자인지 확인 (내부 인원만)
        const currentAuthorId = document.getElementById('common_author_id')?.value;
        if (currentAuthorId && String(attendeeId) === String(currentAuthorId) && type === 'internal') {
            Swal.fire({
                icon: 'warning',
                title: '삭제 불가',
                text: '작성자는 참석자에서 제거할 수 없습니다.',
                confirmButtonText: '확인'
            });
            return;
        }

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
    // 중복 참석자 정보 저장
    let duplicateAttendeesInfo = {};

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

            // 모든 내부 참석자의 중복 여부 확인
            await checkAllAttendeesForDuplicates();

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

    // 시간 겹침 확인 함수
    function isTimeOverlap(start1, end1, start2, end2) {
        // start1-end1: 기존 회의 시간
        // start2-end2: 새로운 회의 시간
        // 겹치지 않는 경우: end1 <= start2 OR end2 <= start1
        // 겹치는 경우: NOT (겹치지 않는 경우)
        return !(end1 <= start2 || end2 <= start1);
    }

    // 모든 참석자의 중복 여부 확인 (모달 열 때)
    async function checkAllAttendeesForDuplicates() {
        duplicateAttendeesInfo = {}; // 초기화

        const date = document.getElementById('common_date')?.value;
        const startTime = document.getElementById('common_start_time')?.value;
        const endTime = document.getElementById('common_end_time')?.value;
        const projectIdx = document.getElementById('selectedProjectIdx')?.value;

        if (!date || !startTime || !endTime || !projectIdx) return;

        const attendeePersons = getAttendeePersons();
        if (!attendeePersons || attendeePersons.length === 0) return;

        const internalIds = attendeePersons
            .map(p => parseInt(p.id))
            .filter(id => !isNaN(id) && id > 0);
        const externalIds = (allExternalPersons || [])
            .map(p => parseInt(p.idx))
            .filter(id => !isNaN(id) && id > 0);
        const allPersons = [
            ...internalIds.map(id => ({ id })),
            ...externalIds.map(id => ({ id, isExternal: true }))
        ];

        const scan = await ReceiptCommon.scanDuplicatesForPersons({
            persons: allPersons,
            date,
            projectIdx,
            startTime,
            endTime,
            excludeReceiptIdx: currentReceiptMeetingIdx || undefined,
            excludeDocumentType: currentReceiptMeetingIdx ? 'RCM' : undefined
        });

        Object.keys(scan).forEach(id => {
            const info = scan[id];
            if (info) {
                duplicateAttendeesInfo[id] = {
                    meetingDate: info.raw?.meetingDate || info.date,
                    projectName: info.projectName,
                    startTime: info.startTime,
                    endTime: info.endTime
                };
            }
        });
    }

    // 중복 참석자 검증 함수 (저장 시 최종 검증)
    async function checkDuplicateAttendees(attendeeIds) {
        const date = document.getElementById('common_date')?.value;
        const startTime = document.getElementById('common_start_time')?.value;
        const endTime = document.getElementById('common_end_time')?.value;
        const projectIdx = document.getElementById('selectedProjectIdx')?.value;

        if (!date || !startTime || !endTime || !projectIdx) return [];

        const validAttendeeIds = attendeeIds.filter(id =>
            !isNaN(id) && id !== null && id !== undefined && id > 0
        );
        if (validAttendeeIds.length === 0) return [];

        const scan = await ReceiptCommon.scanDuplicatesForPersons({
            persons: validAttendeeIds.map(id => ({ id })),
            date,
            projectIdx,
            startTime,
            endTime,
            excludeReceiptIdx: currentReceiptMeetingIdx || undefined,
            excludeDocumentType: currentReceiptMeetingIdx ? 'RCM' : undefined
        });

        const duplicates = [];
        validAttendeeIds.forEach(attendeeId => {
            const info = scan[attendeeId];
            if (info) {
                duplicates.push({ attendeeId, meeting: info.raw });
            }
        });
        return duplicates;
    }

    // 선택된 참석자 추가
    window.addSelectedAttendees = async function() {
        if (tempSelectedAttendees.length === 0) {
            showWarning('참석자를 선택해주세요.');
            return;
        }

        // 내부 + 외부 참석자 모두 중복 검증
        const attendeeIdsToCheck = tempSelectedAttendees.map(a => parseInt(a.id)).filter(id => !isNaN(id));

        if (attendeeIdsToCheck.length > 0) {
            try {
                const duplicates = await checkDuplicateAttendees(attendeeIdsToCheck);
                if (duplicates.length > 0) {
                    const duplicate = duplicates[0];
                    const meeting = duplicate.meeting;
                    const meetingDate = meeting.documentDate || '';
                    const projectName = meeting.projectName || '알 수 없는 프로젝트';
                    const documentTypeCode = meeting.type || 'RCM';
                    const documentTypeName = meeting.typeName || getDocumentTypeName(documentTypeCode);

                    // 중복된 참석자 이름 찾기
                    const duplicateAttendee = tempSelectedAttendees.find(a => parseInt(a.id) === duplicate.attendeeId);
                    const attendeeName = duplicateAttendee ? duplicateAttendee.name : `ID ${duplicate.attendeeId}`;

                    let message = `<strong>참석자: ${attendeeName}</strong><br>`;
                    message += `동일 날짜/시간에 이미 다른 문서에 참석 중입니다.<br><br>`;
                    message += `문서 타입: <strong>${documentTypeName}</strong><br>`;
                    message += `날짜: ${meetingDate}<br>`;

                    if (meeting.startTime && meeting.endTime) {
                        const timeRange = `${meeting.startTime.substring(0, 5)} ~ ${meeting.endTime.substring(0, 5)}`;
                        message += `시간: ${timeRange}<br>`;
                    }

                    message += `프로젝트: <strong>[${projectName}]</strong>`;

                    await showWarning(message);
                    return;
                }
            } catch (error) {
                console.error('[참석자 선택 중 중복 검증 오류]', error);
                await showError(`중복 검증 중 오류가 발생했습니다.<br>${error.message}<br><br>다시 시도해주세요.`);
                return;
            }
        }


        // currentAttendees를 tempSelectedAttendees로 완전히 교체
        // (Modal에서 삭제된 참석자도 반영되도록)
        currentAttendees = tempSelectedAttendees.map(person => ({
            id: person.id,
            name: person.name,
            dept: person.dept,
            position: person.position,
            meetingExpense: person.meetingExpense || 0,
            type: person.type
        }));

        // 작성자가 참석자 목록에 포함되어 있는지 확인
        const currentAuthorId = document.getElementById('common_author_id')?.value;
        if (currentAuthorId) {
            const hasAuthor = currentAttendees.some(a => String(a.id) === String(currentAuthorId) && a.type === 'internal');
            if (!hasAuthor) {
                // 작성자가 빠져있으면 재선택: 1순위 로그인 사용자, 2순위 최저직급
                const internalAttendees = currentAttendees.filter(a => a.type === 'internal');
                if (internalAttendees.length > 0) {
                    const date = document.getElementById('common_date')?.value;
                    const startTime = document.getElementById('common_start_time')?.value;
                    const endTime = document.getElementById('common_end_time')?.value;
                    const projectIdx = document.getElementById('selectedProjectIdx')?.value;

                    const { author: newAuthor } = await ReceiptCommon.pickDefaultAuthor({
                        candidates: internalAttendees,
                        getPositionOrder: (m) => getPositionSortOrder(m.position),
                        loggedInUserIdx: currentUser?.idx,
                        duplicateProbe: async (cand) => {
                            if (!date || !startTime || !endTime || !projectIdx) return false;
                            return await ReceiptCommon.hasDuplicate({
                                date, attendeeIdx: cand.id, projectIdx, startTime, endTime,
                                excludeReceiptIdx: currentReceiptMeetingIdx || undefined,
                                excludeDocumentType: currentReceiptMeetingIdx ? 'RCM' : undefined
                            });
                        },
                        // 빠진 작성자 대체 재선택: 후보 중 최고직급(내림차순 끝)
                        rankStrategy: (sortedAsc) => sortedAsc[sortedAsc.length - 1]
                    });
                    if (newAuthor) {
                        document.getElementById('common_author').value = newAuthor.name;
                        document.getElementById('common_author_id').value = newAuthor.id;
                        document.querySelectorAll('.auto-author').forEach(field => { field.value = newAuthor.name; });
                        document.querySelectorAll('.auto-reporter').forEach(el => { el.textContent = newAuthor.name; });
                    }
                }
            }
        }

        // 참석자 목록 UI 업데이트
        renderAttendeeListInTemplate();

        // 필수 필드 검증
        validateRequiredFields();

        // 모달 닫기
        closeAttendeeModal();
    };

    // 작성자 모달 관련
    const authorModal = document.getElementById('authorModal');
    const authorSearchInput = document.getElementById('authorSearchInput');
    const authorListEl = document.getElementById('authorList');

    // 직급 코드 목록 (API에서 로드, sortOrder 오름차순 = 낮은 직급 먼저)
    let positionCodes = [];

    async function loadPositionCodes() {
        try {
            const response = await fetch('/api/codes/ranks?activeOnly=true');
            if (response.ok) {
                positionCodes = await response.json();
                positionCodes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            }
        } catch (e) {
            console.error('직급 코드 로드 오류:', e);
        }
    }

    // 직급명(한글) → sortOrder 반환
    function getPositionSortOrder(positionName) {
        if (!positionName) return 9999;
        const found = positionCodes.find(p => p.codeName === positionName);
        return found ? (found.sortOrder || 9999) : 9999;
    }

    // 직급으로 정렬 (낮은 직급부터)
    function sortByPosition(persons) {
        return persons.sort((a, b) =>
            getPositionSortOrder(a.position) - getPositionSortOrder(b.position)
        );
    }

    // 작성자 모달 열기
    window.openAuthorModal = async function() {
        if (authorModal) {
            authorModal.classList.add('show');
            if (authorSearchInput) authorSearchInput.value = '';

            const projectIdxInput = document.getElementById('selectedProjectIdx');
            if (!projectIdxInput || !projectIdxInput.value) {
                renderProjectListInAuthorModal('');
            } else {
                const currentProjectIdx = projectIdxInput.value;
                if (!selectedProject || String(selectedProject.idx) !== String(currentProjectIdx) || projectMembers.length === 0) {
                    await loadProjectMembers(currentProjectIdx);
                }
                await renderAuthorList('');
            }
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

    // 작성자 검색 — 프로젝트 미선택 시 프로젝트 필터
    if (authorSearchInput) {
        authorSearchInput.addEventListener('input', async function() {
            const keyword = this.value.trim();
            const projectIdxInput = document.getElementById('selectedProjectIdx');
            if (!projectIdxInput || !projectIdxInput.value) {
                renderProjectListInAuthorModal(keyword);
            } else {
                await renderAuthorList(keyword);
            }
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
                    commonProject.classList.remove('field-empty');
                }
                const selectedProjectIdx = document.getElementById('selectedProjectIdx');
                if (selectedProjectIdx) {
                    selectedProjectIdx.value = proj.idx;
                }

                // 자동 채우기
                document.querySelectorAll('.auto-project').forEach(field => {
                    field.value = proj.projectName;
                });

                // 참석자 목록 초기화 (기본 작성자만 남기기)
                currentAttendees = [];

                // 프로젝트 팀원 로드
                await loadProjectMembers(proj.idx);

                // 프로젝트 직급별 경비 설정 로드
                await loadProjectExpenseSettings(proj.idx);

                // 기본 작성자 설정
                await setDefaultAuthor();
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
                        commonCard.classList.remove('field-empty');
                    }
                    if (selectedCardIdx) {
                        selectedCardIdx.value = firstCard.idx;
                    }
                    console.log('[작성자모달→카드 자동선택] cardName:', firstCard.cardName, '| field-empty 제거됨:', !commonCard?.classList.contains('field-empty'));
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
                validateRequiredFields();

                // 검색창 비우기
                if (authorSearchInput) {
                    authorSearchInput.value = '';
                }

                // 작성자 목록 다시 렌더링 (검색어 없이)
                await renderAuthorList('');
            });
        });
    }

    // 작성자 목록 렌더링
    async function renderAuthorList(searchText = '') {
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

        // 현재 선택된 작성자 ID 가져오기
        const currentAuthorId = document.getElementById('common_author_id')?.value;

        // 회의 날짜 기준 참여기간 검증용
        const meetingDateForAuthor = document.getElementById('common_date')?.value || '';

        // 시간 중복 정보 수집 (공통 모듈 사용)
        const date = document.getElementById('common_date')?.value;
        const startTime = document.getElementById('common_start_time')?.value;
        const endTime = document.getElementById('common_end_time')?.value;
        const projectIdx = document.getElementById('selectedProjectIdx')?.value;

        let duplicateInfo = {};
        if (date && startTime && endTime && projectIdx) {
            const scan = await ReceiptCommon.scanDuplicatesForPersons({
                persons: filteredPersons.map(p => ({ id: p.id })),
                date,
                projectIdx,
                startTime,
                endTime,
                excludeReceiptIdx: currentReceiptMeetingIdx || undefined,
                excludeDocumentType: currentReceiptMeetingIdx ? 'RCM' : undefined
            });
            Object.keys(scan).forEach(id => {
                const info = scan[id];
                if (info) {
                    duplicateInfo[id] = {
                        projectName: info.projectName || '알 수 없는 프로젝트',
                        startTime: info.startTime,
                        endTime: info.endTime
                    };
                }
            });
        }

        authorListEl.innerHTML = filteredPersons.map(person => {
            const isSelected = currentAuthorId && String(person.id) === String(currentAuthorId);
            const selectedClass = isSelected ? 'selected' : '';
            const checkIcon = isSelected ? '<i class="fas fa-check-circle" style="color: #10b981; margin-left: auto;"></i>' : '';

            // 이미 참석자 목록에 있는지 표시
            const isAttendee = currentAttendees.some(a => String(a.id) === String(person.id) && a.type === 'internal');
            const attendeeBadge = isAttendee
                ? `<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; white-space: nowrap;"><i class="fas fa-user-check"></i> 참석중</span>`
                : '';

            // 시간 중복 정보 표시
            const isDuplicate = duplicateInfo[person.id];
            let duplicateBadge = '';
            if (isDuplicate) {
                const projectName = isDuplicate.projectName;
                const timeRange = `${isDuplicate.startTime}~${isDuplicate.endTime}`;
                const tooltipText = `${projectName} 프로젝트 회의 (${timeRange})`;
                duplicateBadge = `<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; white-space: nowrap;" data-tip="${tooltipText}"><i class="fas fa-exclamation-triangle"></i> 시간 중복</span>`;
            }

            // 참여기간 외 검증 (회의 날짜 기준)
            const isInactive = !isMemberActiveOnDate(person, meetingDateForAuthor);
            let inactiveBadge = '';
            if (isInactive && meetingDateForAuthor) {
                const tip = `참여기간: ${formatMemberPeriod(person)}`;
                inactiveBadge = `<span style="background:#e5e7eb; color:#4b5563; padding:2px 8px; border-radius:4px; font-size:11px; margin-left:8px; white-space:nowrap;" data-tip="${tip}"><i class="fas fa-calendar-times"></i> 참여기간 외</span>`;
            }

            const isLocked = isInactive || !!isDuplicate;
            const lockedStyle = isLocked ? 'opacity:0.55; cursor:not-allowed;' : '';
            const onclickAttr = isLocked ? '' : `onclick="selectAuthor(${person.id})"`;

            return `
                <div class="employee-item ${selectedClass}" data-id="${person.id}" data-has-conflict="${isDuplicate ? 'true' : 'false'}" data-inactive="${isInactive}" ${onclickAttr} style="${lockedStyle}">
                    <div class="employee-info">
                        <div class="employee-name">${person.name}${attendeeBadge}${inactiveBadge}${duplicateBadge}</div>
                        <div class="employee-details">${person.dept} · ${person.position}</div>
                    </div>
                    ${checkIcon}
                </div>
            `;
        }).join('');
    }

    // 작성자 선택
    window.selectAuthor = async function(personId) {
        const attendeePersons = getAttendeePersons();
        const person = attendeePersons.find(p => p.id === personId);

        if (person) {
            // 참여기간 검증 — 회의 날짜에 활성이어야 함
            const meetingDateStr = document.getElementById('common_date')?.value || '';
            if (!meetingDateStr) {
                await showWarning('회의 날짜를 먼저 입력해주세요.');
                return;
            }
            if (!isMemberActiveOnDate(person, meetingDateStr)) {
                await showInactiveMemberAlert(person, '회의 날짜', meetingDateStr, '작성자');
                return;
            }

            // 시간 중복 체크 — 중복이면 선택 불가 (안전장치: UI에서 이미 disabled 처리됨)
            const date = document.getElementById('common_date')?.value;
            const startTime = document.getElementById('common_start_time')?.value;
            const endTime = document.getElementById('common_end_time')?.value;
            const projectIdx = document.getElementById('selectedProjectIdx')?.value;

            if (date && startTime && endTime && projectIdx) {
                const docs = await ReceiptCommon.fetchDuplicateDocs({
                    date,
                    attendeeIdx: personId,
                    projectIdx,
                    startTime,
                    endTime,
                    excludeReceiptIdx: currentReceiptMeetingIdx || undefined,
                    excludeDocumentType: currentReceiptMeetingIdx ? 'RCM' : undefined
                });
                if (docs.length > 0) {
                    const m = docs[0];
                    await ReceiptCommon.showTimeConflictBlock({
                        personName: person.name,
                        projectName: m.projectName,
                        startTime: ReceiptCommon.trimHHmm(m.startTime),
                        endTime: ReceiptCommon.trimHHmm(m.endTime),
                        type: m.typeName || m.type
                    });
                    return;
                }
            }

            // 기존 작성자 ID 가져오기
            const previousAuthorId = document.getElementById('common_author_id').value;

            // 기존 작성자가 있고, 새로운 작성자와 다른 경우 참석자에서 제거
            if (previousAuthorId && String(previousAuthorId) !== String(person.id)) {
                currentAttendees = currentAttendees.filter(a =>
                    !(String(a.id) === String(previousAuthorId) && a.type === 'internal')
                );
            }

            document.getElementById('common_author').value = person.name;
            document.getElementById('common_author_id').value = person.id;

            // 인쇄용 템플릿도 업데이트
            document.querySelectorAll('.auto-author').forEach(field => {
                field.value = person.name;
                field.style.color = '';
            });

            // 새로운 작성자를 참석자 목록에 자동 추가 (중복 체크)
            if (!currentAttendees.some(a => String(a.id) === String(person.id) && a.type === 'internal')) {
                currentAttendees.push({
                    id: person.id,
                    name: person.name,
                    dept: person.dept,
                    position: person.position,
                    type: 'internal',
                    meetingExpense: person.meetingExpense || 0
                });
            }

            // 참석자 목록 UI 업데이트
            renderAttendeeListInTemplate();

            // 필수 필드 검증
            validateRequiredFields();

            closeAuthorModal();
        }
    };

    // 기본 작성자 설정 (로그인 사용자 1순위 → 낮은 직급 4번째 fallback)
    async function setDefaultAuthor() {
        const attendeePersons = getAttendeePersons();
        if (attendeePersons.length === 0) return;

        const date = document.getElementById('common_date')?.value;
        const startTime = document.getElementById('common_start_time')?.value;
        const endTime = document.getElementById('common_end_time')?.value;
        const projectIdx = document.getElementById('selectedProjectIdx')?.value;
        const startTimeInput = document.getElementById('common_start_time');

        // 중복 판정 probe (날짜/시간 미입력 시 항상 false)
        const duplicateProbe = async (cand) => {
            if (!date || !startTime || !endTime || !projectIdx) return false;
            return await ReceiptCommon.hasDuplicate({
                date,
                attendeeIdx: cand.id,
                projectIdx,
                startTime,
                endTime,
                excludeReceiptIdx: currentReceiptMeetingIdx || undefined,
                excludeDocumentType: currentReceiptMeetingIdx ? 'RCM' : undefined
            });
        };

        const { author: selectedAuthor, allBlocked } = await ReceiptCommon.pickDefaultAuthor({
            candidates: attendeePersons,
            getPositionOrder: (m) => getPositionSortOrder(m.position),
            loggedInUserIdx: currentUser?.idx,
            duplicateProbe,
            rankStrategy: 'ascStep4'
        });

        // 날짜/시간이 모두 있는데 전원 중복이면 경고 후 중단 (기존 UX 유지)
        if (allBlocked && date && startTime && endTime && projectIdx) {
            await Swal.fire({
                icon: 'warning',
                title: '시간 중복',
                html: `선택하신 시간대(<strong>${startTime} ~ ${endTime}</strong>)에<br>참석 가능한 프로젝트 멤버가 없습니다.<br><br>회의 시간을 변경해주세요.`,
                confirmButtonText: '확인'
            });
            if (startTimeInput) startTimeInput.focus();
            return;
        }

        if (selectedAuthor) {
            document.getElementById('common_author').value = selectedAuthor.name;
            document.getElementById('common_author_id').value = selectedAuthor.id;

            // 인쇄용 템플릿도 업데이트
            document.querySelectorAll('.auto-author').forEach(field => {
                field.value = selectedAuthor.name;
                field.style.color = '';
            });

            // 기본 작성자를 참석자 목록에 자동 추가 (중복 체크)
            if (!currentAttendees.some(a => String(a.id) === String(selectedAuthor.id) && a.type === 'internal')) {
                currentAttendees.push({
                    id: selectedAuthor.id,
                    name: selectedAuthor.name,
                    dept: selectedAuthor.dept,
                    position: selectedAuthor.position,
                    type: 'internal',
                    meetingExpense: selectedAuthor.meetingExpense || 0
                });

                // 참석자 목록 UI 업데이트
                renderAttendeeListInTemplate();

                // 필수 필드 검증
                validateRequiredFields();
            }
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
                    meetingExpense: 30000
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
        // 공통 함수 사용 (404 자동 처리)
        const data = await window.fetchWithErrorHandling(`/api/receipt-meetings/${id}`, {}, true);

        if (!data) {
            // 404 등으로 리다이렉트된 경우
            return;
        }

        try {
            // 실제 receipt_meeting.idx 저장 (수정/삭제 시 사용)
            currentReceiptMeetingIdx = data.idx;

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

            // 로딩 오버레이 제거
            window.hidePageLoadingOverlay();

            return data;
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            showError('데이터를 불러오는데 실패했습니다.');
            window.hidePageLoadingOverlay();
        }
    }

    function populateForm(data) {
        isLoadingExistingData = true; // 플래그 ON

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
                window.loadProjectExpenseSettings(project.idx);
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
        if (data.authorIdx && data.authorUserName) {
            if (authorInput) {
                authorInput.value = data.authorUserName;
            }
            if (authorIdInput) {
                authorIdInput.value = data.authorIdx;
            }
            // 인쇄용 템플릿도 업데이트
            document.querySelectorAll('.auto-author').forEach(field => {
                field.value = data.authorUserName;
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
            // 수정 시 활동비 비교를 위해 원래 금액 저장
            window._originalMeetingAmount = data.amount || 0;
        }

        // 목적
        const purposeInput = document.getElementById('common_purpose');
        if (purposeInput && data.purpose) {
            purposeInput.value = data.purpose;

            // .auto-purpose 필드에도 5단어씩 끊어서 표시
            const formattedPurpose = formatTextWithLineBreaks(data.purpose, 5);
            document.querySelectorAll('.auto-purpose').forEach(field => {
                field.innerHTML = formattedPurpose;
            });
        }

        // 내용
        const contentInput = document.getElementById('common_content');
        if (contentInput && data.content) {
            contentInput.value = data.content;
            updateContentByteCounter(data.content);
        }

        // 참석자 목록
        if (data.attendees && data.attendees.length > 0) {
            currentAttendees = data.attendees.map((attendee, idx) => {
                let position = attendee.position || ''; // API에서 받은 직책 정보 사용
                let dept = attendee.department || '';

                // 내부 참석자인 경우
                if (!attendee.isExternal && attendee.userIdx) {
                    dept = '파인씨앤아이'; // 내부 참석자는 소속을 파인씨앤아이로 통일
                }

                // ID: userIdx 사용 (내부/외부 모두 동일)
                const id = attendee.userIdx;
                const type = attendee.isExternal ? 'external' : 'internal';

                // meetingExpense 파싱 (문자열일 경우 콤마 제거)
                let meetingExpense = 0;
                if (attendee.meetingExpense) {
                    if (typeof attendee.meetingExpense === 'string') {
                        meetingExpense = parseInt(attendee.meetingExpense.replace(/,/g, '')) || 0;
                    } else {
                        meetingExpense = attendee.meetingExpense;
                    }
                }

                return {
                    id: id,
                    name: attendee.name,
                    dept: dept,
                    position: position,
                    meetingExpense: meetingExpense,
                    type: type
                };
            });

            // ★ 참석자 목록 먼저 렌더링 (이벤트 트리거 전에 실행하여 초기화 방지)
            renderAttendeeListInTemplate();
        }

        // 모든 input 이벤트 트리거하여 자동 채우기 활성화
        // ★ 참석자 목록 렌더링은 위에서 이미 했으므로 여기서는 제거
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

            console.log('[loadExistingData] setTimeout 완료');

            // 플래그 해제는 모든 이벤트 처리가 끝난 후
            setTimeout(async () => {
                isLoadingExistingData = false;
                console.log('[populateForm] 완료 - 기존 데이터 로딩 플래그 OFF');
                // 수정 모드 진입 즉시 검증 — 작성자/참석자가 현재 회의 날짜에 활성인지
                // (멤버 기간이 변경되어 비활성이 되었을 수 있음)
                try {
                    await revalidateAttendeesAgainstMeetingDate();
                } catch (e) {
                    console.warn('[populateForm] 참여기간 재검증 오류:', e);
                }
            }, 200);
        }, 100);

        // 첨부파일 로드 및 표시
        if (data.attachments && data.attachments.length > 0) {
            console.log('[populateForm] 첨부파일 로드:', data.attachments.length, '개');
            displayExistingAttachments(data.attachments);
        }
    }

    // 수정 버튼 이벤트
    const updateBtn = document.getElementById('updateBtn');
    if (updateBtn) {
        updateBtn.addEventListener('click', async function() {
            if (!currentReceiptMeetingIdx) {
                showError('회의록 정보를 찾을 수 없습니다.');
                return;
            }

            const projectIdxInput = document.getElementById('selectedProjectIdx');
            const dateInput = document.getElementById('common_date');
            const startTimeInput = document.getElementById('common_start_time');
            const endTimeInput = document.getElementById('common_end_time');
            const locationInput = document.getElementById('common_location');

            const projectInput = document.getElementById('common_project');

            if (!projectIdxInput || !projectIdxInput.value) {
                showWarning('프로젝트를 선택해주세요.');
                if (projectInput) {
                    projectInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    projectInput.focus();
                }
                return;
            }
            if (!dateInput || !dateInput.value) {
                showWarning('회의 일자를 입력해주세요.');
                dateInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                dateInput.focus();
                return;
            }
            if (!startTimeInput || !startTimeInput.value) {
                showWarning('시작 시간을 입력해주세요.');
                startTimeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                startTimeInput.focus();
                return;
            }
            if (!endTimeInput || !endTimeInput.value) {
                showWarning('종료 시간을 입력해주세요.');
                endTimeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                endTimeInput.focus();
                return;
            }
            if (!locationInput || !locationInput.value) {
                showWarning('장소를 입력해주세요.');
                locationInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                locationInput.focus();
                return;
            }

            const purposeInput = document.getElementById('common_purpose');
            if (!purposeInput || !purposeInput.value.trim()) {
                await showWarning('회의 목적을 입력해주세요.');
                purposeInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                purposeInput?.focus();
                return;
            }

            const amountInput = document.getElementById('common_amount');
            if (!amountInput || !amountInput.value || parseInt(amountInput.value.replace(/,/g, '')) <= 0) {
                await showWarning('사용 금액을 입력해주세요.');
                amountInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                amountInput?.focus();
                return;
            }

            const contentInput = document.getElementById('common_content');
            if (!contentInput || !contentInput.value.trim()) {
                await showWarning('주요 내용을 입력해주세요.');
                contentInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                contentInput?.focus();
                return;
            }

            const contentBytes = getByteLength(contentInput.value.trim());
            if (contentBytes < MIN_CONTENT_BYTES) {
                await Swal.fire({
                    icon: 'warning',
                    title: '주요 내용을 더 상세히 작성해주세요',
                    html: `현재 <b>${contentBytes}bytes</b> 입력되었습니다.<br><br>
                           회의 내용이 부실하게 작성된 경우 <b>정산 시 반려</b>될 수 있습니다.<br>
                           논의된 내용, 결정 사항, 참석자별 발언 등을 구체적으로 작성해주세요.<br><br>
                           <span style="color:#888;font-size:13px;">최소 ${MIN_CONTENT_BYTES}bytes 이상 입력 필요 (${MIN_CONTENT_BYTES - contentBytes}bytes 더 필요)</span>`,
                    confirmButtonText: '다시 작성하기'
                });
                contentInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                contentInput.focus();
                return;
            }

            // 회의 시간 범위 검증 (시작: 08:00~21:00, 종료: 10:00~22:00)
            const startTime = startTimeInput.value;
            const endTime = endTimeInput.value;
            let isTimeOutOfRange = false;
            let timeWarningMessage = '';

            const startHour = parseInt(startTime.split(':')[0]);
            const startMinute = parseInt(startTime.split(':')[1] || 0);
            if (startHour < 8 || (startHour === 21 && startMinute > 0) || startHour > 21) {
                isTimeOutOfRange = true;
                timeWarningMessage += `시작 시간(${startTime})이 권장 범위(08:00~21:00)를 벗어났습니다.<br>`;
            }

            const endHour = parseInt(endTime.split(':')[0]);
            const endMinute = parseInt(endTime.split(':')[1] || 0);
            if (endHour < 10 || (endHour === 22 && endMinute > 0) || endHour > 22) {
                isTimeOutOfRange = true;
                timeWarningMessage += `종료 시간(${endTime})이 권장 범위(10:00~22:00)를 벗어났습니다.<br>`;
            }

            if (isTimeOutOfRange) {
                const timeConfirmed = await showConfirm(
                    timeWarningMessage + '<br>정말 이 시간으로 수정하시겠습니까?',
                    '회의 시간 확인',
                    {
                        icon: 'warning',
                        confirmText: '수정',
                        cancelText: '취소',
                        confirmColor: '#ff9800'
                    }
                );
                if (!timeConfirmed) {
                    return;
                }
            }

            if (!currentAttendees || currentAttendees.length === 0) {
                await showWarning('참석자를 1명 이상 추가해주세요.');
                const attendeeArea = document.getElementById('attendeeArea');
                if (attendeeArea) {
                    attendeeArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            const hasExternalAttendee = currentAttendees.some(a => a.type === 'external');
            if (!hasExternalAttendee) {
                await Swal.fire({
                    icon: 'error',
                    title: '외부인원 필수',
                    html: `연구비증빙 회의록은 <b>외부인원이 1명 이상</b> 참석해야 합니다.<br><br>
                           참석자 추가에서 <b>외부인원</b> 패널을 통해 추가해주세요.<br>
                           <span style="color:#888;font-size:13px;">외부인원이 없는 회의는 연구비증빙 대상이 아닙니다.</span>`,
                    confirmButtonText: '참석자 추가하기'
                });
                const attendeeArea = document.getElementById('attendeeArea');
                if (attendeeArea) {
                    attendeeArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            // 참석자 금액 합계 검증 (빨간색 상태인지 확인)
            const totalAmountEl = document.getElementById('attendeeTotalAmount');
            if (totalAmountEl && amountInput) {
                const totalAmount = currentAttendees.reduce((sum, attendee) => {
                    return sum + (attendee.meetingExpense || 0);
                }, 0);
                const commonAmount = parseInt(amountInput.value.replace(/,/g, '')) || 0;
                if (totalAmount < commonAmount) {
                    showWarning('참석 인원을 추가해주세요.');
                    return;
                }
            }

            // 저장 직전 중복 참석자 최종 검증
            const internalAttendeesForUpdate = currentAttendees.filter(a => a.type === 'internal');
            if (internalAttendeesForUpdate.length > 0) {
                try {
                    const attendeeIds = internalAttendeesForUpdate.map(a => parseInt(a.id)).filter(id => !isNaN(id));
                    if (attendeeIds.length > 0) {
                        const duplicates = await checkDuplicateAttendees(attendeeIds);

                        if (duplicates.length > 0) {
                            // 현재 수정 중인 문서는 제외
                            const otherDuplicates = duplicates.filter(d => {
                                return !(d.meeting && d.meeting.idx && d.meeting.idx === currentReceiptMeetingIdx);
                            });

                            if (otherDuplicates.length > 0) {
                                const duplicate = otherDuplicates[0];
                                const meeting = duplicate.meeting;
                                const meetingDate = meeting.documentDate || '';
                                const projectName = meeting.projectName || '알 수 없는 프로젝트';
                                const documentTypePrefix = meeting.type || 'RCM';
                                const documentTypeName = meeting.typeName || documentTypePrefix;
                                const dateLabel = documentTypePrefix === 'RCM' ? '회의' : '야근';

                                let message = `수정할 수 없습니다.<br><br>`;
                                message += `동일 날짜에 이미 다른 ${documentTypeName}에 참석 중인 인원이 있습니다.<br><br>`;
                                message += `${dateLabel} 날짜: ${meetingDate}<br>`;

                                if (meeting.startTime && meeting.endTime) {
                                    const timeRange = `${meeting.startTime.substring(0, 5)} ~ ${meeting.endTime.substring(0, 5)}`;
                                    message += `${dateLabel} 시간: ${timeRange}<br>`;
                                }

                                message += `프로젝트: <strong>[${projectName}]</strong>`;

                                await showWarning(message);
                                return;
                            }
                        }
                    }
                } catch (error) {
                    console.error('[중복 검증 오류]', error);
                    const confirmed = await showConfirm(
                        `참석자 중복 검증 중 오류가 발생했습니다.<br><br>` +
                        `오류 내용: ${error.message}<br><br>` +
                        `중복 검증 없이 계속 진행하시겠습니까?`,
                        '중복 검증 오류',
                        {
                            icon: 'warning',
                            confirmText: '계속 진행',
                            cancelText: '취소',
                            confirmColor: '#ff9800'
                        }
                    );
                    if (!confirmed) {
                        return;
                    }
                    console.log('[수정 계속] 중복 검증 스킵하고 진행');
                }
            }

            // 활동비 초과 여부 확인 (경고만, 차단 없음)
            const projIdxForBudgetUpd = parseInt(projectIdxInput.value);
            if (projIdxForBudgetUpd) {
                try {
                    const budgetResUpd = await fetch(`/api/projects/${projIdxForBudgetUpd}/activity-usage`);
                    if (budgetResUpd.ok) {
                        const budgetDataUpd = await budgetResUpd.json();
                        const newAmountUpd = document.getElementById('common_amount')?.value
                            ? parseInt(document.getElementById('common_amount').value.replace(/,/g, '')) || 0 : 0;
                        const oldAmount = window._originalMeetingAmount || 0;
                        const adjustedSpent = (budgetDataUpd.totalSpent || 0) - oldAmount + newAmountUpd;
                        if (adjustedSpent > (budgetDataUpd.activityBudget || 0)) {
                            const excessAmount = adjustedSpent - (budgetDataUpd.activityBudget || 0);
                            const budgetResultUpd = await Swal.fire({
                                icon: 'warning',
                                title: '활동비 초과 경고',
                                html: `수정 금액(<b>${newAmountUpd.toLocaleString()}원</b>)을 포함하면<br>활동비 예산을 <b style="color:#ef4444;">${excessAmount.toLocaleString()}원</b> 초과합니다.<br><br>그래도 수정하시겠습니까?`,
                                showCancelButton: true,
                                confirmButtonText: '수정',
                                cancelButtonText: '취소',
                                confirmButtonColor: '#667eea'
                            });
                            if (!budgetResultUpd.isConfirmed) return;
                        }
                    }
                } catch (e) {
                    console.warn('활동비 조회 실패:', e);
                }
            }

            if (!(await showConfirm('회의록을 수정하시겠습니까?'))) {
                return;
            }

            const attendeeDTOs = currentAttendees.map((attendee, index) => {
                return {
                    isExternal: attendee.type === 'external',
                    department: attendee.dept || null,
                    name: attendee.name,
                    userIdx: parseInt(attendee.id),
                    position: attendee.position || null,
                    displayOrder: index,
                    meetingExpense: attendee.meetingExpense || 0
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
                authorIdx: authorIdInput?.value ? parseInt(authorIdInput.value) : null,
                meetingDate: dateInput.value,
                startTime: startTimeInput.value + ':00',
                endTime: endTimeInput.value + ':00',
                location: locationInput.value,
                amount: document.getElementById('common_amount')?.value ? parseInt(document.getElementById('common_amount').value.replace(/,/g, '')) : null,
                purpose: document.getElementById('common_purpose')?.value || null,
                content: document.getElementById('common_content')?.value || null,
                attendees: attendeeDTOs,
                deletedAttachmentIds: deletedAttachmentIds.length > 0 ? [...deletedAttachmentIds] : []
            };

            try {
                console.log('회의록 수정 시도 - idx:', currentReceiptMeetingIdx);

                // FormData로 전송 (데이터 JSON + 새 파일)
                const formData = new FormData();
                formData.append('data', JSON.stringify(updateData));
                selectedReceiptFiles.forEach(file => formData.append('receiptFiles', file));
                selectedDocumentFiles.forEach(file => formData.append('documentFiles', file));

                const response = await fetch(`/api/receipt-meetings/${currentReceiptMeetingIdx}`, {
                    method: 'PUT',
                    body: formData
                    // Content-Type 헤더는 자동으로 설정됨 (multipart/form-data)
                });

                // 인증 실패 또는 세션 만료
                if (response.status === 401 || response.status === 302 || response.redirected) {
                    await Swal.fire({
                        icon: 'warning',
                        title: '로그인이 필요합니다',
                        text: '세션이 만료되었습니다. 다시 로그인해주세요.',
                        confirmButtonText: '로그인 페이지로 이동'
                    });
                    window.location.href = '/login';
                    return;
                }

                // 권한 없음
                if (response.status === 403) {
                    showError('이 문서를 수정할 권한이 없습니다.');
                    return;
                }

                // 성공
                if (response.ok) {
                    await Swal.fire({
                        icon: 'success',
                        title: '수정 완료',
                        text: '수정되었습니다!',
                        timer: 3000,
                        timerProgressBar: true,
                        showConfirmButton: true,
                        confirmButtonText: '확인',
                        allowOutsideClick: false
                    });
                    window.location.reload();
                    return;
                }

                // 기타 오류
                const errorData = await response.json().catch(() => ({}));
                showError(errorData.error || '회의록 수정에 실패했습니다.');
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
            if (!currentReceiptMeetingIdx) {
                showError('회의록 정보를 찾을 수 없습니다.');
                return;
            }

            if (!(await showDeleteConfirm('회의록'))) {
                return;
            }

            try {
                // 현재 로그인한 사용자 정보 가져오기
                const authorIdInput = document.getElementById('common_author_id');
                const deletedUserIdx = authorIdInput ? parseInt(authorIdInput.value) : null;

                if (!deletedUserIdx) {
                    showError('사용자 정보를 찾을 수 없습니다.');
                    return;
                }

                const response = await fetch(`/api/receipt-meetings/${currentReceiptMeetingIdx}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        deletedUserIdx: deletedUserIdx
                    })
                });

                // 인증 실패 또는 세션 만료
                if (response.status === 401 || response.status === 302 || response.redirected) {
                    await Swal.fire({
                        icon: 'warning',
                        title: '로그인이 필요합니다',
                        text: '세션이 만료되었습니다. 다시 로그인해주세요.',
                        confirmButtonText: '로그인 페이지로 이동'
                    });
                    window.location.href = '/login';
                    return;
                }

                // 권한 없음
                if (response.status === 403) {
                    showError('이 문서를 삭제할 권한이 없습니다.');
                    return;
                }

                // 성공
                if (response.ok) {
                    await Swal.fire({
                        icon: 'success',
                        title: '삭제 완료',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    popupAwareRedirect('/project/documents');
                    return;
                }

                // 기타 오류
                const errorData = await response.json().catch(() => ({}));
                showError(errorData.error || '회의록 삭제에 실패했습니다.');
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
