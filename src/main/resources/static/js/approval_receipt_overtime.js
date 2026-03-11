// 연구비 증빙 - 야근식대 페이지 JavaScript
document.addEventListener('DOMContentLoaded', async function() {
    // 전역 변수
    let selectedApprovers = [];
    let selectedReceiptFiles = [];
    let selectedDocumentFiles = [];
    let selectedEmployee = null;
    let projects = []; // 내가 참여한 프로젝트 목록
    let selectedProject = null; // 선택된 프로젝트
    let projectMembers = []; // 선택된 프로젝트의 참여인원
    let projectCards = []; // 선택된 프로젝트의 카드 목록
    let selectedCard = null; // 선택된 카드
    let selectedApplicant = null; // 선택된 신청자
    let tempSelectedOvertimePersons = []; // 모달에서 임시 선택된 인원
    let projectExpenses = {}; // 선택된 프로젝트의 직급별 야근석식대
    let allProjectExpenseSettings = []; // 전체 경비 설정 (툴팁 테이블 표시용)

    // 수정 모드 관련 변수
    let isEditMode = false;
    let editingIdx = null; // 수정 중인 야근식대 idx
    let existingReceiptAttachments = []; // 기존 영수증(RECEIPT) 첨부파일 목록
    let existingDocumentAttachments = []; // 기존 공식문서(DOCUMENT) 첨부파일 목록
    let deletedAttachmentIds = []; // 삭제 예정인 첨부파일 ID 목록

    // 중복 참석자 정보 저장 (통합 중복 검증)
    let duplicateAttendeesInfo = {};

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
    const saveDraftBtn = document.getElementById('saveDraftBtn');
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
                    position: user.empPosition || '직급 미지정',
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

    // ============================================
    // 프로젝트 목록 로드
    // ============================================
    async function loadMyProjects() {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                projects = await response.json();
                console.log('프로젝트 로드 완료:', projects.length + '건');
            } else {
                console.error('프로젝트 목록 로드 실패');
            }
        } catch (error) {
            console.error('프로젝트 목록 로드 오류:', error);
        }
    }

    // ============================================
    // 프로젝트 참여인원 및 경비 설정 로드
    // ============================================
    async function loadProjectMembers(projectIdx) {
        if (!projectIdx) {
            projectMembers = [];
            projectExpenses = {};
            allProjectExpenseSettings = [];
            renderExpenseHelpTable([]);
            return;
        }
        try {
            const response = await fetch(`/api/projects/${projectIdx}`);
            const contentType = response.headers.get('content-type');
            if (response.ok && contentType && contentType.includes('application/json')) {
                const project = await response.json();
                projectMembers = project.projectMembers || [];

                // 프로젝트별 야근석식대 경비 설정 추출
                projectExpenses = {};
                allProjectExpenseSettings = project.projectExpenseSettings || [];
                if (project.projectExpenseSettings) {
                    project.projectExpenseSettings.forEach(setting => {
                        if (setting.positionName && setting.expenseItemName === '야근석식대' && setting.amount) {
                            projectExpenses[setting.positionName] = setting.amount;
                        }
                    });
                }
                renderExpenseHelpTable(allProjectExpenseSettings);
                console.log('프로젝트 참여인원 로드 완료:', projectMembers.length + '명');
                console.log('프로젝트 야근식대 경비:', projectExpenses);
            } else {
                console.error('프로젝트 참여인원 로드 실패');
                projectMembers = [];
                projectExpenses = {};
                allProjectExpenseSettings = [];
                renderExpenseHelpTable([]);
            }
        } catch (error) {
            console.error('프로젝트 참여인원 로드 오류:', error);
            projectMembers = [];
            projectExpenses = {};
            allProjectExpenseSettings = [];
            renderExpenseHelpTable([]);
        }
    }

    function getOvertimePersons() {
        return projectMembers.map(member => {
            const positionName = member.employeePositionName || '-';
            let overtimeExpense = 0;
            if (projectExpenses[positionName]) {
                overtimeExpense = projectExpenses[positionName];
            }
            return {
                id: member.employeeIdx,
                name: member.employeeName,
                position: positionName,
                dept: member.employeeDeptName || '-',
                overtimeExpense: overtimeExpense
            };
        });
    }

    /**
     * 직급별 경비 설정 툴팁 렌더링
     */
    function renderExpenseHelpTable(settings) {
        const tooltipContent = document.getElementById('expenseTooltipContent');
        if (!tooltipContent) return;

        if (!settings || settings.length === 0) {
            tooltipContent.innerHTML = '<div class="expense-tooltip-loading" style="line-height: 1.4;">과제 선택 시<br>직급별 야근식대 정보를<br>확인하실 수 있습니다</div>';
            return;
        }

        // 야근식대 항목만 필터링
        const overtimeExpenses = settings.filter(s => {
            const name = (s.expenseItemName || '').toLowerCase();
            return name.includes('야근');
        });

        if (overtimeExpenses.length === 0) {
            tooltipContent.innerHTML = '<div class="expense-tooltip-empty">야근식대 설정이 없습니다</div>';
            return;
        }

        const sorted = overtimeExpenses.sort((a, b) => (a.positionSortOrder || 99) - (b.positionSortOrder || 99));

        let html = '<div class="expense-tooltip-header">직급별 야근식대</div>';
        sorted.forEach(setting => {
            const formattedAmount = setting.amount ? setting.amount.toLocaleString('ko-KR') : '0';
            html += `
                <div class="expense-tooltip-item">
                    <span class="expense-tooltip-position">${setting.positionName || setting.positionCode}</span>
                    <span class="expense-tooltip-amount">${formattedAmount}원</span>
                </div>
            `;
        });

        tooltipContent.innerHTML = html;
    }

    // ============================================
    // 수정 모드: 기존 데이터 로드
    // ============================================
    async function loadExistingData(documentIdx) {
        try {
            const data = await window.fetchWithErrorHandling(`/api/receipt-overtimes/by-document/${documentIdx}`);

            if (!data) {
                // Error already handled by fetchWithErrorHandling (404, 403, 500)
                const container = document.querySelector('.container');
                if (container) container.classList.add('data-loaded');
                document.documentElement.classList.remove('edit-mode-loading');
                window.hidePageLoadingOverlay();
                return;
            }

            console.log('기존 야근식대 데이터 로드:', data);

            // 수정 모드 설정
            isEditMode = true;
            editingIdx = data.idx;
            const allAttachments = data.attachments || [];
            existingReceiptAttachments = allAttachments.filter(a => a.attachmentType !== 'DOCUMENT');
            existingDocumentAttachments = allAttachments.filter(a => a.attachmentType === 'DOCUMENT');

            // 프로젝트 정보 설정
            if (data.projectIdx) {
                selectedProject = projects.find(p => Number(p.idx) === Number(data.projectIdx));

                // 내 프로젝트 목록에 없으면 직접 API 조회 (수정 모드에서 비멤버인 경우)
                if (!selectedProject) {
                    try {
                        const projResponse = await fetch(`/api/projects/${data.projectIdx}`);
                        if (projResponse.ok) {
                            selectedProject = await projResponse.json();
                            console.log('프로젝트 직접 로드 (비멤버):', selectedProject.projectName);
                        }
                    } catch (e) {
                        console.error('프로젝트 직접 로드 오류:', e);
                    }
                }

                if (selectedProject) {
                    const otProject = document.getElementById('ot_project');
                    if (otProject) {
                        otProject.value = selectedProject.projectName;
                        otProject.style.borderColor = '';
                    }
                    const selectedProjectIdx = document.getElementById('selectedProjectIdx');
                    if (selectedProjectIdx) selectedProjectIdx.value = selectedProject.idx;

                    document.querySelectorAll('.ot-auto-project').forEach(field => {
                        field.textContent = selectedProject.projectName;
                    });

                    if (selectedProject.projectManagerName) {
                        const otManager = document.getElementById('ot_manager');
                        if (otManager) otManager.value = selectedProject.projectManagerName;
                        document.querySelectorAll('.ot-auto-manager').forEach(field => {
                            field.textContent = selectedProject.projectManagerName;
                        });
                    }
                }

                // selectedProject 유무와 무관하게 참여인원 로드 (attendees 매칭을 위해 반드시 필요)
                await loadProjectMembers(data.projectIdx);

                if (selectedProject) {
                    // 카드 목록 로드
                    await loadProjectCards(selectedProject.idx);

                    // 카드 정보 설정
                    if (data.cardIdx) {
                        selectedCard = projectCards.find(c => c.idx === data.cardIdx);
                        if (selectedCard) {
                            const otCard = document.getElementById('ot_card');
                            if (otCard) {
                                otCard.value = selectedCard.cardName;
                            }
                            const selectedCardIdx = document.getElementById('selectedCardIdx');
                            if (selectedCardIdx) selectedCardIdx.value = selectedCard.idx;
                        }
                    }

                    // 신청자 정보 설정
                    if (data.authorIdx) {
                        const projectPersons = typeof getOvertimePersons === 'function' ? getOvertimePersons() : [];
                        selectedApplicant = projectPersons.find(p => Number(p.id) === Number(data.authorIdx));
                        if (selectedApplicant) {
                            const otApplicant = document.getElementById('ot_applicant');
                            if (otApplicant) {
                                otApplicant.value = selectedApplicant.name;
                            }
                            const selectedApplicantIdx = document.getElementById('selectedApplicantIdx');
                            if (selectedApplicantIdx) selectedApplicantIdx.value = selectedApplicant.id;

                            // 인쇄용 템플릿 신청자 업데이트
                            document.querySelectorAll('.ot-auto-applicant').forEach(field => {
                                field.textContent = selectedApplicant.name;
                            });
                        }
                    }
                }
            }

            // 날짜 설정
            if (data.approvalDate) {
                const otApprovalDate = document.getElementById('ot_approval_date');
                if (otApprovalDate) {
                    otApprovalDate.value = data.approvalDate;
                    otApprovalDate.dispatchEvent(new Event('input'));
                }
            }

            // 품의명 설정
            if (data.documentTitle) {
                const otTitle = document.getElementById('ot_title');
                if (otTitle) {
                    otTitle.value = data.documentTitle;
                    otTitle.dispatchEvent(new Event('input'));
                }
            }

            // 금액 설정
            if (data.totalAmount) {
                const otAmount = document.getElementById('ot_amount');
                if (otAmount) {
                    otAmount.value = data.totalAmount.toLocaleString();
                    otAmount.dispatchEvent(new Event('input'));
                }
                // 수정 시 활동비 비교를 위해 원래 금액 저장
                window._originalOvertimeAmount = data.totalAmount || 0;
            }

            // 인원 정보 로드
            if (data.attendees && data.attendees.length > 0) {
                // 시간 정보 파싱해서 설정 (예: "18:00 ~ 21:00")
                if (data.attendees[0].workTime) {
                    const timeParts = data.attendees[0].workTime.split(' ~ ');
                    if (timeParts.length === 2) {
                        const otStartTime = document.getElementById('ot_start_time');
                        const otEndTime = document.getElementById('ot_end_time');
                        if (otStartTime) otStartTime.value = timeParts[0].trim();
                        if (otEndTime) otEndTime.value = timeParts[1].trim();
                    }
                }

                // 업무내용 복원: 전체 attendee의 workTask를 select 옵션과 비교하여 기본/개별 판별
                // - select 옵션에 매칭되는 값이 있으면 → 그 값이 기본 업무내용
                // - 매칭 없으면 → 가장 많이 나오는 값(최빈값)을 직접입력 기본으로 사용
                const otTaskSelectEl = document.getElementById('ot_task_select');
                const otTaskCustomEl = document.getElementById('ot_task_custom');
                const allWorkTasks = data.attendees.map(a => (a.workTask || '').trim()).filter(t => t);
                let restoredGlobalTask = '';

                if (allWorkTasks.length > 0 && otTaskSelectEl) {
                    const selectOptions = Array.from(otTaskSelectEl.options)
                        .map(opt => opt.value)
                        .filter(v => v && v !== '' && v !== 'custom');

                    // select 옵션에 있는 값이 1개라도 있으면 → 그 값이 기본 업무내용
                    const matchedOption = selectOptions.find(opt => allWorkTasks.includes(opt));

                    if (matchedOption) {
                        restoredGlobalTask = matchedOption;
                        otTaskSelectEl.value = matchedOption;
                        if (otTaskCustomEl) otTaskCustomEl.style.display = 'none';
                        console.log('[업무내용 복원] select 옵션 매칭:', restoredGlobalTask);
                    } else {
                        // 매칭 없으면 최빈값을 직접입력(기본)으로
                        const taskFreq = {};
                        allWorkTasks.forEach(t => { taskFreq[t] = (taskFreq[t] || 0) + 1; });
                        restoredGlobalTask = Object.entries(taskFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
                        if (restoredGlobalTask) {
                            otTaskSelectEl.value = 'custom';
                            if (otTaskCustomEl) {
                                otTaskCustomEl.value = restoredGlobalTask;
                                otTaskCustomEl.style.display = 'block';
                            }
                            console.log('[업무내용 복원] 직접입력 처리(최빈값):', restoredGlobalTask);
                        }
                    }
                    otTaskSelectEl.dispatchEvent(new Event('change'));
                }

                // 프로젝트 참여인원 목록 가져오기 (부서, 직급, 금액 정보용)
                const projectPersons = typeof getOvertimePersons === 'function' ? getOvertimePersons() : [];
                console.log('프로젝트 참여인원:', projectPersons);
                console.log('서버에서 받은 attendees:', data.attendees);

                // 인원 목록을 addOvertimePersonsToOvertime 함수로 추가
                // DB에 저장된 userIdx와 프로젝트 참여인원을 매칭하여 부서, 직급, 금액 정보 가져오기
                const attendeesData = data.attendees || [];
                const personsToAdd = attendeesData.map(attendee => {
                    // 프로젝트 참여인원에서 userIdx로 매칭 (타입 변환하여 비교)
                    const matchedMember = projectPersons.find(m => Number(m.id) === Number(attendee.userIdx));
                    console.log('매칭 시도 - userIdx:', attendee.userIdx, '매칭 결과:', matchedMember);

                    if (matchedMember) {
                        return {
                            id: attendee.userIdx,
                            name: attendee.userName || matchedMember.name,
                            dept: matchedMember.dept || '-',
                            position: matchedMember.position || '-',
                            overtimeExpense: matchedMember.overtimeExpense || 0
                        };
                    } else {
                        // 매칭되는 참여인원이 없으면 기본값 사용 (서버에서 받은 userName 사용)
                        return {
                            id: attendee.userIdx,
                            name: attendee.userName || '알 수 없음',
                            dept: '-',
                            position: '-',
                            overtimeExpense: 0
                        };
                    }
                });

                console.log('추가할 인원:', personsToAdd);
                if (typeof window.addOvertimePersonsToOvertime === 'function') {
                    window.addOvertimePersonsToOvertime(personsToAdd);

                    // 인원별 개별 업무내용 복원: restoredGlobalTask와 다른 값만 개별로 설정
                    const currentPersons = window.getCurrentOvertimePersons ? window.getCurrentOvertimePersons() : [];
                    data.attendees.forEach(attendee => {
                        const taskValue = (attendee.workTask || '').trim();
                        if (taskValue && taskValue !== restoredGlobalTask) {
                            const person = currentPersons.find(p => Number(p.id) === Number(attendee.userIdx));
                            if (person) {
                                person.task = taskValue;
                            }
                        }
                    });
                    console.log('[업무내용 복원] 완료 - globalTask:', restoredGlobalTask);

                    // 변경사항 반영을 위해 다시 렌더링
                    if (typeof window.renderOvertimePersonTable === 'function') {
                        window.renderOvertimePersonTable();
                    }
                } else {
                    console.error('addOvertimePersonsToOvertime 함수가 없습니다.');
                }
            }

            // 내용 설정 (인원 로드 후에 적용해야 updateContentText()에 덮어씌워지지 않음)
            if (data.documentContent) {
                const otContent = document.getElementById('ot_content');
                if (otContent) {
                    otContent.value = data.documentContent;
                    // 품의서에도 품의 내용 반영
                    document.querySelectorAll('.ot-auto-content').forEach(field => {
                        field.textContent = data.documentContent;
                    });
                }
            }

            // 첨부파일 목록 업데이트
            deletedAttachmentIds = []; // 삭제 예정 목록 초기화
            updateReceiptFileList();
            updateDocumentFileList();

            // 버튼 텍스트 변경
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> 수정하기';
            }

            // 삭제 버튼 표시
            showDeleteButton();

            // 페이지 제목 변경
            const pageTitle = document.querySelector('.content-title');
            if (pageTitle) {
                pageTitle.textContent = '야근식대 수정';
            }

            // 수정 모드에서 필수 필드 검증 실행 (인쇄 버튼 표시)
            setTimeout(() => {
                validateRequiredFields();
            }, 500);

            // 로딩 오버레이 숨김
            window.hidePageLoadingOverlay();

        } catch (error) {
            console.error('기존 데이터 로드 실패:', error);
            showError('야근식대 데이터를 불러오는데 실패했습니다.');
            // 에러 시에도 콘텐츠 표시
            const container = document.querySelector('.container');
            if (container) container.classList.add('data-loaded');
            document.documentElement.classList.remove('edit-mode-loading');
            window.hidePageLoadingOverlay();
        }
    }

    // 파일 사이즈 포맷팅
    function formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // 파일 아이콘 결정
    function getFileIcon(filename) {
        if (!filename) return 'fa-file';
        const lowerName = filename.toLowerCase();
        if (lowerName.match(/\.(jpg|jpeg|png|gif)$/)) return 'fa-file-image';
        if (lowerName.match(/\.(pdf)$/)) return 'fa-file-pdf';
        if (lowerName.match(/\.(doc|docx)$/)) return 'fa-file-word';
        if (lowerName.match(/\.(xls|xlsx)$/)) return 'fa-file-excel';
        return 'fa-file';
    }

    // 기존 첨부파일 삭제 (저장 시에만 실제 삭제)
    window.removeExistingAttachment = async function(attachmentIdx) {
        const confirmed = await showConfirm('이 파일을 삭제하시겠습니까?');
        if (!confirmed) return;

        // 삭제 예정 목록에 추가
        if (!deletedAttachmentIds.includes(attachmentIdx)) {
            deletedAttachmentIds.push(attachmentIdx);
        }

        // 화면 업데이트
        updateReceiptFileList();
        updateDocumentFileList();
    };

    // 삭제 버튼 표시
    function showDeleteButton() {
        const deleteBtn = document.querySelector('#deleteBtn');
        deleteBtn.style.display = 'block';
        deleteBtn.addEventListener('click', handleDelete)
    }

    // 삭제 처리
    async function handleDelete() {
        if (!editingIdx) return;

        const confirmed = await showConfirm('정말로 이 야근식대를 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.');
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/receipt-overtimes/${editingIdx}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showSuccess('야근식대가 삭제되었습니다.');
                setTimeout(() => {
                    popupAwareRedirect('/project/documents');
                }, 1500);
            } else {
                const error = await response.json();
                showError(error.error || '삭제 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('야근식대 삭제 실패:', error);
            showError('삭제 중 오류가 발생했습니다.');
        }
    }

    // ============================================
    // 프로젝트 선택 모달
    // ============================================
    const projectModal = document.getElementById('projectModal');
    const projectSearch = document.getElementById('projectSearch');
    const projectListEl = document.getElementById('projectList');

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
        // 초성 검색
        const chosung = getChosung(text);
        return chosung.includes(keyword);
    }

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
        if (projectListEl && projectListEl.parentNode) {
            projectListEl.parentNode.insertBefore(container, projectListEl.parentNode.firstElementChild);
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

    function renderProjectList(list, keyword = '') {
        if (!projectListEl) return;
        projectListEl.innerHTML = '';

        if (!list || list.length === 0) {
            projectListEl.innerHTML = `
                <div class="modal-empty-state" style="text-align:center; padding:40px; color:#999;">
                    <i class="fas fa-folder-open" style="font-size:32px; margin-bottom:10px;"></i>
                    <p>${keyword ? '검색 결과가 없습니다' : '등록된 프로젝트가 없습니다'}</p>
                </div>`;
            return;
        }

        list.forEach(proj => {
            const item = document.createElement('div');
            item.className = 'modal-item';
            if (selectedProject && selectedProject.idx === proj.idx) {
                item.classList.add('selected');
            }

            const name = keyword ? highlightProjectText(proj.projectName, keyword) : proj.projectName;
            const leader = proj.projectManagerName || proj.projectLeader || '-';
            const memberCount = proj.memberCount != null ? proj.memberCount : (proj.projectMembers ? proj.projectMembers.length : 0);
            const startDate = proj.startDate ? new Date(proj.startDate).toLocaleDateString('ko-KR') : '-';
            const endDate = proj.endDate ? new Date(proj.endDate).toLocaleDateString('ko-KR') : '-';

            item.innerHTML = `
                <div class="modal-item-info">
                    <div class="modal-item-name">${name}</div>
                    <div class="modal-item-detail">
                        <div><i class="fas fa-user"></i> ${leader} (${memberCount}명)</div>
                        <div><i class="fas fa-calendar"></i> ${startDate} ~ ${endDate}</div>
                    </div>
                </div>
            `;

            item.addEventListener('click', async function() {
                selectedProject = proj;

                const otProject = document.getElementById('ot_project');
                if (otProject) {
                    otProject.value = proj.projectName;
                    otProject.classList.remove('error');
                }
                const selectedProjectIdx = document.getElementById('selectedProjectIdx');
                if (selectedProjectIdx) selectedProjectIdx.value = proj.idx;

                // 자동 채우기
                document.querySelectorAll('.ot-auto-project').forEach(field => {
                    field.textContent = proj.projectName;
                });

                // 연구책임자 자동 채우기
                const otManager = document.getElementById('ot_manager');
                if (otManager && proj.projectManagerName) {
                    otManager.value = proj.projectManagerName;
                    otManager.classList.remove('error');
                    document.querySelectorAll('.ot-auto-manager').forEach(field => {
                        field.textContent = proj.projectManagerName;
                    });
                }

                // 프로젝트 참여인원 로드
                await loadProjectMembers(proj.idx);

                // 프로젝트 카드 목록 로드
                await loadProjectCards(proj.idx);

                // 카드가 1개 이상 있으면 첫 번째 카드 자동 선택
                if (projectCards && projectCards.length > 0) {
                    selectedCard = projectCards[0];
                    const otCard = document.getElementById('ot_card');
                    if (otCard) {
                        otCard.value = projectCards[0].cardName;
                        otCard.classList.remove('error');
                    }
                    const selectedCardIdx = document.getElementById('selectedCardIdx');
                    if (selectedCardIdx) {
                        selectedCardIdx.value = projectCards[0].idx;
                    }
                } else {
                    // 카드가 없으면 초기화
                    selectedCard = null;
                    const otCard = document.getElementById('ot_card');
                    if (otCard) {
                        otCard.value = '';
                        otCard.placeholder = '클릭하여 카드 선택';
                    }
                    const selectedCardIdx = document.getElementById('selectedCardIdx');
                    if (selectedCardIdx) selectedCardIdx.value = '';
                }

                // 프로젝트 변경 시 중복 정보 초기화
                duplicateAttendeesInfo = {};

                // 신청자 선택: 로그인 사용자가 프로젝트 참여인원에 있으면 자동 설정
                const currentUserIdx = window.CURRENT_USER?.idx;
                const projectPersons = getOvertimePersons();
                const currentUserInProject = projectPersons.find(p => Number(p.id) === Number(currentUserIdx));
                const dateInput = document.getElementById('ot_approval_date');

                if (currentUserInProject) {
                    // 날짜가 이미 설정되어 있으면 중복 체크
                    let hasDuplicate = false;
                    if (dateInput?.value) {
                        const duplicates = await checkDuplicateForAttendee(currentUserInProject.id);
                        if (duplicates && duplicates.length > 0) {
                            hasDuplicate = true;
                            const docInfo = duplicates.map(d => `${d.typeName} (${d.startTime}~${d.endTime})`).join('<br>');
                            showWarning(
                                `로그인 사용자 <b>${currentUserInProject.name}</b>님은 해당 날짜에 다른 문서가 있습니다.<br><br>` +
                                `${docInfo}<br><br>` +
                                `신청자와 야근인원을 직접 선택해주세요.`
                            );
                        }
                    }

                    if (!hasDuplicate) {
                        // 중복이 없으면 자동 설정
                        selectedApplicant = currentUserInProject;
                        const otApplicant = document.getElementById('ot_applicant');
                        if (otApplicant) {
                            otApplicant.value = currentUserInProject.name;
                            otApplicant.classList.remove('error');
                        }
                        const selectedApplicantIdx = document.getElementById('selectedApplicantIdx');
                        if (selectedApplicantIdx) selectedApplicantIdx.value = currentUserInProject.id;

                        // 인쇄용 템플릿 신청자 업데이트
                        document.querySelectorAll('.ot-auto-applicant').forEach(field => {
                            field.textContent = currentUserInProject.name;
                        });

                        // 야근인원에도 자동 추가
                        if (typeof window.addOvertimePersonsToOvertime === 'function') {
                            window.addOvertimePersonsToOvertime([currentUserInProject]);
                        }
                    } else {
                        // 중복이 있으면 초기화
                        selectedApplicant = null;
                        const otApplicant = document.getElementById('ot_applicant');
                        if (otApplicant) {
                            otApplicant.value = '';
                            otApplicant.placeholder = '클릭하여 신청자 선택';
                        }
                        const selectedApplicantIdx = document.getElementById('selectedApplicantIdx');
                        if (selectedApplicantIdx) selectedApplicantIdx.value = '';
                    }
                } else {
                    // 로그인 사용자가 프로젝트 참여인원에 없는 경우 초기화
                    selectedApplicant = null;
                    const otApplicant = document.getElementById('ot_applicant');
                    if (otApplicant) {
                        otApplicant.value = '';
                        otApplicant.placeholder = '클릭하여 신청자 선택';
                    }
                    const selectedApplicantIdx = document.getElementById('selectedApplicantIdx');
                    if (selectedApplicantIdx) selectedApplicantIdx.value = '';
                }

                closeProjectModal();
                validateRequiredFields();
            });

            projectListEl.appendChild(item);
        });
    }

    function highlightProjectText(text, keyword) {
        if (!keyword || !text) return text;
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
        }
    };

    if (projectModal) {
        projectModal.addEventListener('click', function(e) {
            if (e.target === projectModal) {
                closeProjectModal();
            }
        });
    }

    // ============================================
    // 카드 선택 모달 관련
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
                console.log('카드 목록 로드 완료:', projectCards.length + '개');
            } else {
                console.error('카드 목록 로드 실패:', response.status);
                projectCards = [];
            }
        } catch (error) {
            console.error('카드 목록 로드 오류:', error);
            projectCards = [];
        }
    }

    // 카드 목록 렌더링
    function renderCardList(list, keyword = '') {
        if (!cardList) return;
        cardList.innerHTML = '';

        if (list.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'modal-empty-state';
            emptyMessage.style.cssText = 'text-align: center; padding: 40px; color: #94a3b8;';
            emptyMessage.innerHTML = `
                <i class="fas fa-credit-card" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                <p>${keyword ? '검색 결과가 없습니다' : '등록된 카드가 없습니다'}</p>
            `;
            cardList.appendChild(emptyMessage);
            return;
        }

        list.forEach(card => {
            const item = document.createElement('div');
            item.className = 'employee-item';
            if (selectedCard && selectedCard.idx === card.idx) {
                item.classList.add('selected');
            }

            const highlightedName = keyword ? highlightCardText(card.cardName, keyword) : card.cardName;
            const highlightedNumber = keyword ? highlightCardText(card.cardNumber || '카드번호 없음', keyword) : (card.cardNumber || '카드번호 없음');

            item.innerHTML = `
                <div class="employee-info">
                    <div class="employee-name"><i class="fas fa-credit-card" style="margin-right:6px; color:#667eea;"></i>${highlightedName}</div>
                    <div class="employee-detail">${highlightedNumber}</div>
                </div>
            `;

            item.addEventListener('click', function() {
                selectedCard = card;

                // 카드 입력 필드에 표시
                const otCard = document.getElementById('ot_card');
                if (otCard) {
                    otCard.value = card.cardName;
                    otCard.classList.remove('error');
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

    function highlightCardText(text, keyword) {
        if (!keyword || !text) return text;
        const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // 카드 검색
    if (cardSearch) {
        cardSearch.addEventListener('input', function() {
            const keyword = this.value.trim().toLowerCase();
            const filtered = projectCards.filter(card =>
                (card.cardName || '').toLowerCase().includes(keyword) ||
                (card.cardNumber || '').toLowerCase().includes(keyword)
            );
            renderCardList(filtered, this.value.trim());
        });
    }

    window.openCardModal = function() {
        const projectIdxInput = document.getElementById('selectedProjectIdx');

        if (!projectIdxInput || !projectIdxInput.value) {
            showWarning('과제를 먼저 선택해주세요.');
            return;
        }

        if (cardModal) {
            cardModal.classList.add('show');
            renderCardList(projectCards);
            if (cardSearch) cardSearch.value = '';
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

    // ============================================
    // 신청자 선택 모달 관련
    // ============================================
    const applicantModal = document.getElementById('applicantModal');
    const applicantSearch = document.getElementById('applicantSearch');
    const applicantList = document.getElementById('applicantList');

    // 신청자 목록 렌더링 (프로젝트 참여인원에서 선택)
    function renderApplicantList(list, keyword = '', isLoading = false) {
        if (!applicantList) return;
        applicantList.innerHTML = '';

        // 로딩 상태 표시
        if (isLoading) {
            const loadingMessage = document.createElement('div');
            loadingMessage.style.cssText = 'text-align: center; padding: 40px; color: #94a3b8;';
            loadingMessage.innerHTML = `
                <i class="fas fa-spinner fa-spin" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                <p>중복 검증 중...</p>
            `;
            applicantList.appendChild(loadingMessage);
            return;
        }

        if (list.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'modal-empty-state';
            emptyMessage.style.cssText = 'text-align: center; padding: 40px; color: #94a3b8;';
            emptyMessage.innerHTML = `
                <i class="fas fa-user" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                <p>${keyword ? '검색 결과가 없습니다' : '프로젝트 참여인원이 없습니다'}</p>
            `;
            applicantList.appendChild(emptyMessage);
            return;
        }

        list.forEach(member => {
            const item = document.createElement('div');
            item.className = 'employee-item';
            if (selectedApplicant && selectedApplicant.id === member.id) {
                item.classList.add('selected');
            }

            // 중복 체크
            const duplicateInfo = duplicateAttendeesInfo[member.id];
            const isDuplicate = duplicateInfo?.hasDuplicate;

            if (isDuplicate) {
                item.classList.add('duplicate-disabled');
                item.style.cssText = 'opacity: 0.6; cursor: not-allowed;';
            }

            const highlightedName = keyword ? highlightApplicantText(member.name, keyword) : member.name;

            // 중복 뱃지
            let duplicateBadge = '';
            if (isDuplicate) {
                const docs = duplicateInfo.documents || [];
                const docInfo = docs.map(d => `${d.typeName} (${d.startTime}~${d.endTime})`).join(', ');
                duplicateBadge = `<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; white-space: nowrap;" title="${docInfo}"><i class="fas fa-ban"></i> 시간 중복</span>`;
            }

            item.innerHTML = `
                <div class="employee-info">
                    <div class="employee-name"><i class="fas fa-user" style="margin-right:6px; color:#667eea;"></i>${highlightedName}${duplicateBadge}</div>
                    <div class="employee-detail">${member.dept || '-'} / ${member.position || '-'}</div>
                </div>
            `;

            item.addEventListener('click', function() {
                // 중복인 경우 선택 불가
                if (isDuplicate) {
                    const docs = duplicateInfo.documents || [];
                    const docInfo = docs.map(d => `${d.typeName} (${d.startTime}~${d.endTime})`).join('<br>');
                    showWarning(`${member.name}님은 이미 다른 문서에 등록되어 있습니다.<br><br>${docInfo}`);
                    return;
                }

                selectedApplicant = member;

                // 신청자 입력 필드에 표시
                const otApplicant = document.getElementById('ot_applicant');
                if (otApplicant) {
                    otApplicant.value = member.name;
                    otApplicant.classList.remove('error');
                }
                const selectedApplicantIdx = document.getElementById('selectedApplicantIdx');
                if (selectedApplicantIdx) {
                    selectedApplicantIdx.value = member.id;
                }

                // 인쇄용 템플릿 신청자 업데이트
                document.querySelectorAll('.ot-auto-applicant').forEach(field => {
                    field.textContent = member.name;
                });

                closeApplicantModal();
                validateRequiredFields();
            });

            applicantList.appendChild(item);
        });
    }

    function highlightApplicantText(text, keyword) {
        if (!keyword || !text) return text;
        const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // 신청자 검색
    if (applicantSearch) {
        applicantSearch.addEventListener('input', function() {
            const keyword = this.value.trim().toLowerCase();
            const persons = typeof getOvertimePersons === 'function' ? getOvertimePersons() : [];
            const filtered = persons.filter(member =>
                (member.name || '').toLowerCase().includes(keyword)
            );
            renderApplicantList(filtered, this.value.trim());
        });
    }

    window.openApplicantModal = async function() {
        const projectIdxInput = document.getElementById('selectedProjectIdx');
        const dateInput = document.getElementById('ot_approval_date');

        if (!projectIdxInput || !projectIdxInput.value) {
            showWarning('과제를 먼저 선택해주세요.');
            return;
        }
        if (!dateInput || !dateInput.value) {
            showWarning('날짜를 먼저 선택해주세요.');
            return;
        }

        if (applicantModal) {
            applicantModal.classList.add('show');
            if (applicantSearch) applicantSearch.value = '';

            const persons = typeof getOvertimePersons === 'function' ? getOvertimePersons() : [];

            // 중복 검증 정보 로드 후 렌더링
            renderApplicantList(persons, '', true); // 로딩 상태로 먼저 렌더링
            await loadDuplicateInfoForAllPersons();
            renderApplicantList(persons);
        }
    };

    window.closeApplicantModal = function() {
        if (applicantModal) {
            applicantModal.classList.remove('show');
            if (applicantSearch) applicantSearch.value = '';
        }
    };

    // 모달 외부 클릭 시 닫기
    if (applicantModal) {
        applicantModal.addEventListener('click', function(e) {
            if (e.target === applicantModal) {
                closeApplicantModal();
            }
        });
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
            if (templateKey === 'receipt-overtime') {
                setupOvertimeAutoFill();
                setupDocumentFormToggle();
            }
        }
    }

    // 야근식대 자동 채우기 기능
    function setupOvertimeAutoFill() {
        const otProject = document.getElementById('ot_project');
        const otManager = document.getElementById('ot_manager');
        const otApplicant = document.getElementById('ot_applicant');
        const otApprovalDate = document.getElementById('ot_approval_date');
        const otTitle = document.getElementById('ot_title');
        const otAmount = document.getElementById('ot_amount');
        const otContent = document.getElementById('ot_content');
        const otStartTime = document.getElementById('ot_start_time');
        const otEndTime = document.getElementById('ot_end_time');
        const otTaskSelect = document.getElementById('ot_task_select');
        const otTaskCustom = document.getElementById('ot_task_custom');
        const overtimePersonArea = document.getElementById('overtimePersonArea');
        const overtimePersonList = document.getElementById('overtimePersonList');

        let overtimePersons = [];

        // IT 업무 내용 목록
        const taskOptions = [
            '데이터베이스 설계',
            '백엔드 API 개발',
            '프론트엔드 UI 개발',
            '시스템 아키텍처 설계',
            '코드 리뷰 및 품질 관리',
            '버그 수정 및 디버깅',
            '테스트 코드 작성',
            '배포 및 운영 환경 구축',
            '성능 최적화',
            '보안 취약점 분석',
            '클라우드 인프라 구축',
            '마이크로서비스 개발',
            '모바일 앱 개발',
            '웹 서비스 개발',
            '알고리즘 개발',
            '데이터 분석 및 시각화',
            '머신러닝 모델 개발',
            'DevOps 파이프라인 구축',
            '기술 문서 작성',
            'CI/CD 환경 구축'
        ];

        // 야근인원 영역 클릭 시 모달 열기
        if (overtimePersonArea) {
            overtimePersonArea.addEventListener('click', function(e) {
                // 인원이 있을 때는 추가 버튼만 모달 열기
                if (overtimePersons.length > 0) {
                    if (e.target.closest('.add-more-attendees-btn')) {
                        openOvertimePersonModal();
                    }
                    return;
                }
                openOvertimePersonModal();
            });
        }

        // 야근 인원 목록 렌더링 함수 (모달 방식)
        function renderOvertimePersonListInTemplate() {
            if (!overtimePersonList) return;

            if (overtimePersons.length === 0) {
                overtimePersonList.innerHTML = `
                    <div class="empty-attendee-state">
                        <i class="fas fa-user-plus"></i>
                        <div>클릭하여 야근인원 추가</div>
                    </div>
                `;
                if (overtimePersonArea) {
                    overtimePersonArea.classList.remove('has-attendees');
                }
                hideAddOvertimeButton();
            } else {
                overtimePersonList.innerHTML = overtimePersons.map(person => {
                    const expenseText = person.overtimeExpense
                        ? person.overtimeExpense.toLocaleString('ko-KR') + '원'
                        : '-';
                    const globalTask = getCurrentTask();
                    const hasCustomTask = person.task !== null && person.task !== undefined && person.task !== '';
                    const displayTask = hasCustomTask ? person.task : (globalTask || '기본 업무내용 미설정');
                    const taskBadgeClass = hasCustomTask ? 'person-task-badge' : 'person-task-default';
                    const taskLabel = hasCustomTask ? '개별' : '기본';
                    return `
                    <div class="trip-person-item" style="cursor: default;">
                        <div class="trip-person-info" style="pointer-events: auto;">
                            <span class="name">${person.name}</span>
                            <span>${person.dept}</span>
                            <span>${person.position}</span>
                            <span style="color: #667eea; font-weight: 600;">${expenseText}</span>
                        </div>
                        <div class="person-task-row">
                            <span class="${taskBadgeClass}">${taskLabel}</span>
                            <span class="person-task-text" title="${displayTask}">${displayTask}</span>
                            <button type="button" class="btn-edit-task" onclick="event.stopPropagation(); window.editPersonTask('${person.id}')">
                                <i class="fas fa-pen"></i>
                            </button>
                        </div>
                        <button type="button" class="trip-person-remove" onclick="event.stopPropagation(); removeOvertimePersonInTemplate('${person.id}')">
                            <i class="fas fa-times"></i> 삭제
                        </button>
                    </div>
                    `;
                }).join('');

                if (overtimePersonArea) {
                    overtimePersonArea.classList.add('has-attendees');
                }
                showAddOvertimeButton();
            }

            updateOvertimeTable();
            updateContentText();
            updateOvertimeTotalAmount();

            // 인원 수 뱃지 업데이트
            const countBadge = document.getElementById('overtimeCountBadge');
            if (countBadge) {
                if (overtimePersons.length > 0) {
                    countBadge.textContent = overtimePersons.length + '명';
                    countBadge.style.display = 'inline-flex';
                } else {
                    countBadge.style.display = 'none';
                }
            }
        }

        // 야근인원 추가 버튼 표시
        function showAddOvertimeButton() {
            if (!overtimePersonArea) return;
            let addButton = overtimePersonArea.querySelector('.add-more-attendees-btn');
            if (!addButton) {
                addButton = document.createElement('button');
                addButton.type = 'button';
                addButton.className = 'add-more-attendees-btn';
                addButton.innerHTML = '<i class="fas fa-user-plus"></i> 야근인원 추가';
                overtimePersonArea.appendChild(addButton);
            }
            addButton.style.display = 'flex';
        }

        // 야근인원 추가 버튼 숨기기
        function hideAddOvertimeButton() {
            if (!overtimePersonArea) return;
            const addButton = overtimePersonArea.querySelector('.add-more-attendees-btn');
            if (addButton) addButton.style.display = 'none';
        }

        // 야근인원 식대 합계 계산 및 표시
        function updateOvertimeTotalAmount() {
            const totalAmountEl = document.getElementById('overtimeTotalAmount');
            if (!totalAmountEl) return;

            const totalExpense = overtimePersons.reduce((sum, person) => {
                return sum + (person.overtimeExpense || 0);
            }, 0);

            const commonAmount = parseInt((otAmount ? otAmount.value : '').replace(/,/g, '')) || 0;
            const formattedTotal = totalExpense.toLocaleString('ko-KR') + '원';
            totalAmountEl.textContent = formattedTotal;

            // 경고 메시지 요소
            let warningEl = document.getElementById('otAmountWarning');
            if (!warningEl) {
                warningEl = document.createElement('div');
                warningEl.id = 'otAmountWarning';
                warningEl.style.fontSize = '13px';
                warningEl.style.marginTop = '6px';
                warningEl.style.display = 'none';
                const display = totalAmountEl.parentNode;
                if (display && display.parentNode) {
                    display.parentNode.insertBefore(warningEl, display.nextSibling);
                }
            }

            if (commonAmount > 0 && totalExpense < commonAmount) {
                totalAmountEl.style.color = '#dc2626';
                totalAmountEl.style.fontWeight = 'bold';
                if (otAmount) {
                    otAmount.style.borderColor = '#dc2626';
                    otAmount.style.borderWidth = '2px';
                }
                warningEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> 야근인원을 추가해야 합니다';
                warningEl.style.color = '#dc2626';
                warningEl.style.fontWeight = '600';
                warningEl.style.display = 'block';
            } else {
                totalAmountEl.style.color = '#16a34a';
                totalAmountEl.style.fontWeight = 'bold';
                if (otAmount) {
                    otAmount.style.borderColor = '';
                    otAmount.style.borderWidth = '';
                }
                warningEl.style.display = 'none';
            }
        }

        // 전역에서 접근 가능하게 등록
        window.updateOvertimeTotalAmount = updateOvertimeTotalAmount;
        window.renderOvertimePersonTable = renderOvertimePersonListInTemplate;

        // 직급 순서 정의 (높은 순)
        const positionOrder = [
            '대표이사', '사장', '부사장', '전무', '상무', '이사',
            '부장', '차장', '과장', '대리', '주임', '사원',
            '수석연구원', '책임연구원', '선임연구원', '연구원', '연구보조원',
            '인턴', '-'
        ];

        // 직급 순서 반환 함수
        function getPositionRank(position) {
            const idx = positionOrder.findIndex(p => position && position.includes(p));
            return idx === -1 ? positionOrder.length : idx;
        }

        // 야근인원 직급순 정렬 함수
        function sortOvertimePersonsByPosition(persons) {
            return [...persons].sort((a, b) => {
                const rankA = getPositionRank(a.position);
                const rankB = getPositionRank(b.position);
                return rankA - rankB;
            });
        }

        // 전역 참조 동기화 함수
        function syncGlobalOvertimePersons() {
            window.currentOvertimePersons = overtimePersons;
        }

        // 템플릿 내에서 야근인원 제거
        window.removeOvertimePersonInTemplate = function(personId) {
            // String 변환하여 비교 (숫자/문자열 타입 불일치 방지)
            overtimePersons = overtimePersons.filter(p => String(p.id) !== String(personId));
            syncGlobalOvertimePersons();
            renderOvertimePersonListInTemplate();
        };

        // 인원별 업무내용 개별 설정 함수
        window.editPersonTask = async function(personId) {
            const person = overtimePersons.find(p => String(p.id) === String(personId));
            if (!person) return;

            const globalTask = getCurrentTask();
            const currentValue = (person.task !== null && person.task !== undefined && person.task !== '') ? person.task : '';

            const { value: newTask, isConfirmed } = await Swal.fire({
                title: `${person.name} 업무내용`,
                input: 'text',
                inputValue: currentValue,
                inputPlaceholder: globalTask || '업무 내용을 입력하세요',
                showCancelButton: true,
                confirmButtonText: '설정',
                cancelButtonText: '취소',
                confirmButtonColor: '#667eea',
                inputAttributes: {
                    style: 'font-size: 14px;'
                },
                html: `<div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
                    비워두면 기본 업무내용(${globalTask || '미설정'})이 적용됩니다.
                </div>`,
            });

            if (!isConfirmed) return;

            person.task = (newTask && newTask.trim()) ? newTask.trim() : null;
            syncGlobalOvertimePersons();
            renderOvertimePersonListInTemplate();
            validateRequiredFields();
        };

        // 전역 함수로 등록하여 모달에서 접근 가능하게
        window.addOvertimePersonsToOvertime = function(persons) {
            // 기존 인원 중 유지되는 사람은 보존, 새로운 사람은 추가
            const newList = persons.map(person => {
                const existing = overtimePersons.find(p => String(p.id) === String(person.id));
                if (existing) return existing;
                return {
                    id: person.id,
                    name: person.name,
                    dept: person.dept,
                    position: person.position,
                    overtimeExpense: person.overtimeExpense || 0,
                    time: '18:00 ~ 21:00',
                    endTime: '21:00',
                    task: null
                };
            });
            // 직급순 정렬 적용
            overtimePersons = sortOvertimePersonsByPosition(newList);
            syncGlobalOvertimePersons();
            renderOvertimePersonListInTemplate();
        };

        // 현재 야근인원 목록 반환 (모달에서 사용)
        window.getCurrentOvertimePersons = function() {
            return [...overtimePersons];
        };

        // 전역 참조용 (제출 시 사용)
        window.currentOvertimePersons = overtimePersons;

        // 야근 인원 목록 업데이트 함수 (기존 방식, deprecated)
        function updateOvertimePersonList() {
            renderOvertimePersonListInTemplate();
        }

        // 시간 포맷팅 함수 (HH:mm ~ HH:mm)
        function getFormattedTimeRange() {
            const startTime = otStartTime?.value || '';
            const endTime = otEndTime?.value || '';
            if (startTime && endTime) {
                return `${startTime} ~ ${endTime}`;
            }
            return '';
        }

        // 현재 선택된 업무 내용 가져오기
        function getCurrentTask() {
            if (!otTaskSelect) return '';
            const selectedValue = otTaskSelect.value;
            if (selectedValue === 'custom') {
                return otTaskCustom?.value || '';
            }
            return selectedValue || '';
        }

        // 야근 신청서 테이블 업데이트 (동적 행 생성)
        function updateOvertimeTable() {
            const tableBody = document.getElementById('otPersonTableBody');
            if (!tableBody) return;

            const timeRange = getFormattedTimeRange();
            const currentTask = getCurrentTask();
            const minRows = 10;
            const globalTask = getCurrentTask();
            const rowCount = Math.max(overtimePersons.length, minRows);

            let html = '';
            for (let i = 0; i < rowCount; i++) {
                const person = i < overtimePersons.length ? overtimePersons[i] : null;
                const personTask = person ? ((person.task !== null && person.task !== undefined && person.task !== '') ? person.task : globalTask) : '';
                html += `<tr class="ot-person-row">
                    <td style="text-align: center;">${i + 1}</td>
                    <td style="text-align: center;">${person ? (person.name || '') : '&nbsp;'}</td>
                    <td style="text-align: center;">${person ? timeRange : '&nbsp;'}</td>
                    <td style="text-align: center;">${person ? personTask : '&nbsp;'}</td>
                    <td style="text-align: center;">&nbsp;</td>
                    <td style="text-align: center;">&nbsp;</td>
                </tr>`;
            }
            tableBody.innerHTML = html;

            // 인원이 10명 초과 시 행 높이 축소
            if (rowCount > minRows) {
                tableBody.querySelectorAll('.ot-person-row td').forEach(td => {
                    td.style.padding = '6px 8px';
                    td.style.fontSize = '12px';
                    td.style.height = '32px';
                });
            }
        }

        // 품의 내용 텍스트 자동 업데이트
        function updateContentText() {
            if (!otContent) return;

            const names = overtimePersons
                .filter(p => p.name)
                .map(p => p.name)
                .join(', ');

            const totalCount = overtimePersons.filter(p => p.name).length;

            const contentText = `야근식대\n- 인원 : 총 ${totalCount}인\n- ${names}`;
            otContent.value = contentText;

            // 품의서에도 품의 내용 표시
            document.querySelectorAll('.ot-auto-content').forEach(field => {
                field.textContent = contentText;
            });
        }


        // 천단위 콤마 포맷팅 함수
        function formatNumberWithComma(value) {
            const numbers = value.replace(/[^\d]/g, '');
            if (!numbers) return '';
            return parseInt(numbers).toLocaleString('ko-KR');
        }

        // 금액 입력 시 포맷팅 + 문서 미리보기 반영
        if (otAmount) {
            otAmount.addEventListener('input', function() {
                const cursorPosition = this.selectionStart;
                const oldLength = this.value.length;
                const formatted = formatNumberWithComma(this.value);
                this.value = formatted;
                const newLength = this.value.length;
                const diff = newLength - oldLength;
                this.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
                updateAmountDisplay();
                updateOvertimeTotalAmount();
            });
        }

        // 과제명 클릭 시 프로젝트 선택 모달 열기
        if (otProject) {
            otProject.addEventListener('click', function() {
                openProjectModal();
            });
        }

        // 품의일자 자동 채우기 (야근 일자와 동일하게 적용)
        if (otApprovalDate) {
            otApprovalDate.addEventListener('input', function() {
                const value = this.value;
                if (value) {
                    const [year, month, day] = value.split('-');

                    // 품의일자 형식 (년월일)
                    const formatted = `${year}년 ${month}월 ${day}일`;
                    document.querySelectorAll('.ot-auto-approval-date').forEach(field => {
                        field.textContent = formatted;
                    });

                    // 야근 일자 형식 (년 월 일) - 야근 신청서용
                    const dateFormatted = `${year}년 ${month}월 ${day}일`;
                    document.querySelectorAll('.ot-auto-date').forEach(field => {
                        field.textContent = dateFormatted;
                    });

                    // 품의서 날짜 형식 (년/월/일)
                    const dateSlashFormatted = `${year}/${month}/${day}`;
                    document.querySelectorAll('.ot-auto-date-slash').forEach(field => {
                        field.textContent = dateSlashFormatted;
                    });

                    // 전체 날짜 형식 (년. 월. 일)
                    const fullFormatted = `${year}. ${month}. ${day}`;
                    document.querySelectorAll('.ot-auto-date-full').forEach(field => {
                        field.textContent = fullFormatted;
                    });
                }
            });
        }

        // 품의명 자동 채우기
        if (otTitle) {
            otTitle.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.ot-auto-title').forEach(field => {
                    field.textContent = value;
                });
                document.querySelectorAll('.ot-auto-desc').forEach(field => {
                    field.textContent = value;
                });
            });

            // 초기값 설정
            if (otTitle.value) {
                document.querySelectorAll('.ot-auto-title').forEach(field => {
                    field.textContent = otTitle.value;
                });
                document.querySelectorAll('.ot-auto-desc').forEach(field => {
                    field.textContent = otTitle.value;
                });
            }
        }

        // 품의내용 자동 채우기
        if (otContent) {
            otContent.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.ot-auto-content').forEach(field => {
                    field.textContent = value;
                });
            });

            // 초기값 설정
            if (otContent.value) {
                document.querySelectorAll('.ot-auto-content').forEach(field => {
                    field.textContent = otContent.value;
                });
            }
        }

        // 지급종류 품의서 기본값 설정 (연구비카드)
        document.querySelectorAll('.ot-auto-payment-card').forEach(field => {
            field.textContent = '○';
        });
        document.querySelectorAll('.ot-auto-payment-transfer').forEach(field => {
            field.textContent = '';
        });

        // 시작/종료 시간 변경 시 테이블 업데이트
        if (otStartTime) {
            otStartTime.addEventListener('change', updateOvertimeTable);
        }
        if (otEndTime) {
            otEndTime.addEventListener('change', updateOvertimeTable);
        }

        // 업무 내용 선택 변경 시 처리
        if (otTaskSelect) {
            otTaskSelect.addEventListener('change', function() {
                if (this.value === 'custom') {
                    otTaskCustom.style.display = 'block';
                    otTaskCustom.focus();
                } else {
                    otTaskCustom.style.display = 'none';
                    otTaskCustom.value = '';
                }
                updateOvertimeTable();
                renderOvertimePersonListInTemplate();
            });
        }

        // 직접 입력 시 테이블 및 인원 목록 업데이트
        if (otTaskCustom) {
            otTaskCustom.addEventListener('input', function() {
                updateOvertimeTable();
                renderOvertimePersonListInTemplate();
            });
        }

        // 금액 표시 업데이트
        function updateAmountDisplay() {
            const actualAmount = parseInt(otAmount.value.replace(/,/g, '')) || 0;
            const formattedAmount = actualAmount.toLocaleString('ko-KR');

            document.querySelectorAll('.ot-auto-amount').forEach(field => {
                field.textContent = formattedAmount;
            });

            // 실집행 금액 업데이트
            document.querySelectorAll('.ot-auto-actual-amount').forEach(field => {
                field.textContent = formattedAmount;
            });
        }

        // 연구책임자 초기값 자동 채우기 (프로젝트 선택 시 설정됨)
        if (otManager && otManager.value) {
            document.querySelectorAll('.ot-auto-manager').forEach(field => {
                field.textContent = otManager.value;
            });
        }

        // 초기화
        overtimePersons = [];
        renderOvertimePersonListInTemplate();
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

    // 파일 목록 업데이트 - 영수증 (기존 파일 + 새 파일)
    function updateReceiptFileList() {
        if (!receiptFileList) return;

        receiptFileList.innerHTML = '';

        // 1. 기존 파일 표시 (삭제 예정인 파일 제외)
        existingReceiptAttachments.forEach(att => {
            if (deletedAttachmentIds.includes(att.idx)) return;

            const item = document.createElement('div');
            item.className = 'file-item';
            const fileSizeKB = (att.fileSize / 1024).toFixed(1);
            item.innerHTML = `
                <i class="fas ${getFileIcon(att.originalFilename)}"></i>
                <span>${att.originalFilename} (${fileSizeKB} KB)</span>
                <button class="btn-download-file" onclick="downloadFile('/api/receipt-overtimes/attachments/${att.idx}/download', '${att.originalFilename}')" title="다운로드">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn-remove-file" onclick="removeExistingAttachment(${att.idx})" title="삭제">
                    <i class="fas fa-times"></i>
                </button>
            `;
            receiptFileList.appendChild(item);
        });

        // 2. 새로 선택한 영수증 파일 표시
        selectedReceiptFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <i class="fas ${getFileIcon(file.name)}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB) <span style="color: #667eea; font-size: 11px;">[신규]</span></span>
                <button class="btn-remove-file" onclick="removeReceiptFile(${index})" title="삭제">
                    <i class="fas fa-times"></i>
                </button>
            `;
            receiptFileList.appendChild(item);
        });

        // 3. 파일이 하나도 없을 때 메시지 표시
        const visibleExistingFiles = existingReceiptAttachments.filter(f => !deletedAttachmentIds.includes(f.idx));
        if (visibleExistingFiles.length === 0 && selectedReceiptFiles.length === 0) {
            receiptFileList.innerHTML = '<p style="color: #999; font-size: 12px; padding: 10px 0;">첨부된 파일이 없습니다.</p>';
        }
    }

    // 파일 목록 업데이트 - 공식문서
    function updateDocumentFileList() {
        if (!documentFileList) return;
        documentFileList.innerHTML = '';

        // 1. 기존 공식문서 파일 표시 (삭제 예정인 파일 제외)
        existingDocumentAttachments.forEach(att => {
            if (deletedAttachmentIds.includes(att.idx)) return;

            const item = document.createElement('div');
            item.className = 'file-item';
            const fileSizeKB = (att.fileSize / 1024).toFixed(1);
            item.innerHTML = `
                <i class="fas ${getFileIcon(att.originalFilename)}"></i>
                <span>${att.originalFilename} (${fileSizeKB} KB)</span>
                <button class="btn-download-file" onclick="downloadFile('/api/receipt-overtimes/attachments/${att.idx}/download', '${att.originalFilename}')" title="다운로드">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn-remove-file" onclick="removeExistingAttachment(${att.idx})" title="삭제">
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
                <button class="btn-remove-file" onclick="removeDocumentFile(${index})" title="삭제">
                    <i class="fas fa-times"></i>
                </button>
            `;
            documentFileList.appendChild(item);
        });

        // 3. 파일이 하나도 없을 때 메시지 표시
        const visibleExistingDocFiles = existingDocumentAttachments.filter(f => !deletedAttachmentIds.includes(f.idx));
        if (visibleExistingDocFiles.length === 0 && selectedDocumentFiles.length === 0) {
            documentFileList.innerHTML = '<p style="color: #999; font-size: 12px; padding: 10px 0;">첨부된 파일이 없습니다.</p>';
        }
    }

    setupUpload(receiptInput, receiptUploadArea, selectedReceiptFiles, updateReceiptFileList);
    setupUpload(documentInput, documentUploadArea, selectedDocumentFiles, updateDocumentFileList);

    window.removeReceiptFile = function(index) { selectedReceiptFiles.splice(index, 1); updateReceiptFileList(); };
    window.removeDocumentFile = function(index) { selectedDocumentFiles.splice(index, 1); updateDocumentFileList(); };

    window.downloadFile = async function(url, filename) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                Swal.fire({ icon: 'error', title: '파일을 찾을 수 없습니다', text: '파일이 서버에 존재하지 않거나 삭제되었습니다.' });
                return;
            }
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (e) {
            Swal.fire({ icon: 'error', title: '다운로드 오류', text: '파일 다운로드 중 오류가 발생했습니다.' });
        }
    };

    // 임시저장
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', function() {
            showSuccess('문서가 임시저장되었습니다.');
        });
    }

    // 제출 (저장하기)
    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            // 필수 입력 검증
            const projectIdx = document.getElementById('selectedProjectIdx')?.value;
            const otProject = document.getElementById('ot_project');
            const otApprovalDate = document.getElementById('ot_approval_date');
            const otTitle = document.getElementById('ot_title');
            const otAmount = document.getElementById('ot_amount');
            const otStartTime = document.getElementById('ot_start_time');
            const otEndTime = document.getElementById('ot_end_time');
            const otTaskSelect = document.getElementById('ot_task_select');
            const otTaskCustom = document.getElementById('ot_task_custom');
            const otContent = document.getElementById('ot_content');
            const otManager = document.getElementById('ot_manager');

            // 카드 입력 필드 참조
            const otCard = document.getElementById('ot_card');
            const otApplicant = document.getElementById('ot_applicant');

            if (!projectIdx) {
                showWarning('과제를 선택해주세요.');
                if (otProject) otProject.classList.add('error');
                return;
            } else {
                if (otProject) otProject.classList.remove('error');
            }

            // 카드 선택 검증
            const cardIdx = document.getElementById('selectedCardIdx')?.value;
            if (!cardIdx) {
                showWarning('사용 카드를 선택해주세요.');
                if (otCard) otCard.classList.add('error');
                return;
            } else {
                if (otCard) otCard.classList.remove('error');
            }

            // 신청자 선택 검증
            const applicantIdx = document.getElementById('selectedApplicantIdx')?.value;
            if (!applicantIdx) {
                showWarning('신청자를 선택해주세요.');
                if (otApplicant) otApplicant.classList.add('error');
                return;
            } else {
                if (otApplicant) otApplicant.classList.remove('error');
            }

            if (!otApprovalDate?.value) {
                showWarning('품의일자를 입력해주세요.');
                if (otApprovalDate) otApprovalDate.classList.add('error');
                return;
            } else {
                if (otApprovalDate) otApprovalDate.classList.remove('error');
            }

            if (!otTitle?.value) {
                showWarning('품의명을 입력해주세요.');
                if (otTitle) otTitle.classList.add('error');
                return;
            } else {
                if (otTitle) otTitle.classList.remove('error');
            }

            // 총 공급대가 검증
            const amountValidation = parseInt((otAmount?.value || '').replace(/,/g, '')) || 0;
            if (amountValidation <= 0) {
                showWarning('총 공급대가을 입력해주세요.');
                if (otAmount) otAmount.classList.add('error');
                return;
            } else {
                if (otAmount) otAmount.classList.remove('error');
            }

            // 품의내용 검증
            if (!otContent?.value || !otContent.value.trim()) {
                showWarning('품의내용을 입력해주세요.');
                if (otContent) otContent.classList.add('error');
                return;
            } else {
                if (otContent) otContent.classList.remove('error');
            }

            if (!otStartTime?.value || !otEndTime?.value) {
                showWarning('시작 시간과 종료 시간을 입력해주세요.');
                if (otStartTime && !otStartTime.value) otStartTime.classList.add('error');
                if (otEndTime && !otEndTime.value) otEndTime.classList.add('error');
                return;
            } else {
                if (otStartTime) otStartTime.classList.remove('error');
                if (otEndTime) otEndTime.classList.remove('error');
            }

            // 업무 내용 가져오기
            let taskContent = '';
            if (otTaskSelect?.value === 'custom') {
                taskContent = otTaskCustom?.value || '';
            } else {
                taskContent = otTaskSelect?.value || '';
            }

            // 야근 인원 전원이 개인 업무내용을 입력했다면 전역 셀렉트 검증 생략
            const overtimePersonsForTaskCheck = window.currentOvertimePersons || [];
            const allPersonsHaveIndividualTask = overtimePersonsForTaskCheck.length > 0 &&
                overtimePersonsForTaskCheck.every(p => p.task && p.task.trim());

            if (!taskContent && !allPersonsHaveIndividualTask) {
                showWarning('업무 내용을 선택하거나 입력해주세요.');
                if (otTaskSelect) otTaskSelect.classList.add('error');
                return;
            } else {
                if (otTaskSelect) otTaskSelect.classList.remove('error');
            }

            // 야근 인원 확인
            const overtimePersons = window.currentOvertimePersons || [];
            if (overtimePersons.length === 0) {
                showWarning('야근 인원을 추가해주세요.');
                return;
            }

            // 신청자가 야근인원에 포함되어 있는지 확인
            const isApplicantInPersons = overtimePersons.some(person =>
                Number(person.id) === Number(applicantIdx)
            );
            if (!isApplicantInPersons) {
                showWarning('신청자가 야근인원에 포함되지 않았습니다.');
                return;
            }

            // 야근인원 금액 합계 검증 (금액 입력 시 야근인원 합계가 입력 금액 이상이어야 함)
            const enteredAmount = parseInt((otAmount?.value || '').replace(/,/g, '')) || 0;
            const totalPersonExpense = overtimePersons.reduce((sum, person) => {
                return sum + (person.overtimeExpense || 0);
            }, 0);

            if (enteredAmount > 0 && totalPersonExpense < enteredAmount) {
                showWarning('야근인원을 추가해야 합니다.');
                return;
            }

            // 금액
            const amountStr = otAmount?.value?.replace(/,/g, '') || '0';
            const amount = parseInt(amountStr) || 0;

            // 저장 직전 중복 참석자 최종 검증
            try {
                const attendeeIds = overtimePersons.map(p => p.id);
                console.log('[중복 검증 시작] 검증할 참석자 IDs:', attendeeIds);
                const duplicates = await checkDuplicateBeforeSave(attendeeIds);

                if (duplicates.length > 0) {
                    const duplicate = duplicates[0];
                    const docs = duplicate.documents || [];
                    const docInfo = docs.map(d => `${d.typeName} (${d.startTime}~${d.endTime})`).join('<br>');
                    showError(
                        `<b>${duplicate.attendeeName}</b>님은 이미 다른 문서에 등록되어 있습니다.<br><br>` +
                        `${docInfo}<br><br>` +
                        `야근인원을 확인해주세요.`
                    );
                    return;
                }
                console.log('[중복 검증 완료] 중복 없음');
            } catch (error) {
                console.error('[중복 검증 오류]', error);
                const continueAnyway = await showConfirm(
                    `참석자 중복 검증 중 오류가 발생했습니다.<br><br>` +
                    `${error.message || '알 수 없는 오류'}<br><br>` +
                    `중복 검증 없이 계속 진행하시겠습니까?`,
                    '중복 검증 오류'
                );
                if (!continueAnyway) {
                    return;
                }
            }

            // 활동비 초과 여부 확인 (경고만, 차단 없음)
            if (projectIdx) {
                try {
                    const budgetRes = await fetch(`/api/projects/${projectIdx}/activity-usage`);
                    if (budgetRes.ok) {
                        const budgetData = await budgetRes.json();
                        let newTotalSpent;
                        if (isEditMode) {
                            const oldAmount = window._originalOvertimeAmount || 0;
                            newTotalSpent = (budgetData.totalSpent || 0) - oldAmount + amount;
                        } else {
                            newTotalSpent = (budgetData.totalSpent || 0) + amount;
                        }
                        if (newTotalSpent > (budgetData.activityBudget || 0)) {
                            const excessAmount = newTotalSpent - (budgetData.activityBudget || 0);
                            const budgetResult = await Swal.fire({
                                icon: 'warning',
                                title: '활동비 초과 경고',
                                html: `등록하려는 금액(<b>${amount.toLocaleString()}원</b>)을 포함하면<br>활동비 예산을 <b style="color:#ef4444;">${excessAmount.toLocaleString()}원</b> 초과합니다.<br><br>그래도 저장하시겠습니까?`,
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

            // 확인 다이얼로그
            if (!await showConfirm('야근식대를 저장하시겠습니까?')) {
                return;
            }

            // 시간 범위 문자열 생성
            const workTimeStr = `${otStartTime.value} ~ ${otEndTime.value}`;

            // 데이터 준비 (새로운 DTO 구조에 맞게)
            const data = {
                projectIdx: parseInt(projectIdx),
                cardIdx: parseInt(cardIdx),
                authorIdx: parseInt(applicantIdx),
                overtimeDate: otApprovalDate.value,
                approvalDate: otApprovalDate.value,
                documentTitle: otTitle.value,
                documentContent: otContent?.value || '',
                totalAmount: amount,
                isProject: true,  // 프로젝트 관련 문서임을 명시
                attendees: overtimePersons.map(person => ({
                    userIdx: person.id,
                    workTime: workTimeStr,
                    workTask: (person.task !== null && person.task !== undefined && person.task !== '') ? person.task : taskContent
                }))
            };

            // FormData 생성
            const formData = new FormData();
            formData.append('data', JSON.stringify(data));

            // 첨부파일 추가 (타입별 분리)
            selectedReceiptFiles.forEach(file => formData.append('receiptFiles', file));
            selectedDocumentFiles.forEach(file => formData.append('documentFiles', file));

            try {
                // API 호출 - 수정 모드일 때 PUT, 아닐 때 POST
                const url = isEditMode ? `/api/receipt-overtimes/${editingIdx}` : '/api/receipt-overtimes';
                const method = isEditMode ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();

                    // 수정 모드일 때 삭제 예정인 첨부파일 실제 삭제
                    if (isEditMode && deletedAttachmentIds.length > 0) {
                        console.log(`${deletedAttachmentIds.length}개의 첨부파일 삭제 시작`);
                        for (const attachmentIdx of deletedAttachmentIds) {
                            try {
                                const deleteResponse = await fetch(`/api/receipt-overtimes/attachments/${attachmentIdx}`, {
                                    method: 'DELETE'
                                });
                                if (!deleteResponse.ok) {
                                    console.error(`첨부파일 삭제 실패 (attachmentIdx: ${attachmentIdx})`);
                                }
                            } catch (error) {
                                console.error(`첨부파일 삭제 오류 (attachmentIdx: ${attachmentIdx}):`, error);
                            }
                        }
                    }

                    const successMessage = isEditMode
                        ? '야근식대가 수정되었습니다.'
                        : '야근식대가 저장되었습니다.';
                    showSuccess(successMessage);
                    setTimeout(() => {
                        popupAwareRedirect('/project/documents');
                    }, 2000);
                } else {
                    const error = await response.json();
                    showError(error.error || '저장 중 오류가 발생했습니다.');
                }
            } catch (error) {
                console.error('야근식대 저장 실패:', error);
                showError('저장 중 오류가 발생했습니다.\n관리자에게 문의해주세요.');
            }
        });
    }

    // ============================================
    // 필수 필드 검증 및 인쇄 버튼 표시/숨김
    // ============================================
    function validateRequiredFields() {
        const printBtn = document.getElementById('printDocumentBtn');
        if (!printBtn) return;

        // 필수 필드 체크
        const projectInput = document.getElementById('ot_project');
        const cardInput = document.getElementById('ot_card');
        const applicantInput = document.getElementById('ot_applicant');
        const dateInput = document.getElementById('ot_approval_date');
        const titleInput = document.getElementById('ot_title');
        const amountInput = document.getElementById('ot_amount');
        const startTimeInput = document.getElementById('ot_start_time');
        const endTimeInput = document.getElementById('ot_end_time');
        const taskSelect = document.getElementById('ot_task_select');
        const taskCustomInput = document.getElementById('ot_task_custom');
        const contentInput = document.getElementById('ot_content');

        let allFieldsFilled = true;

        // 과제명 검증
        if (!projectInput?.value) {
            projectInput?.classList.add('error');
            allFieldsFilled = false;
        } else {
            projectInput?.classList.remove('error');
        }

        // 사용 카드 검증
        if (!cardInput?.value) {
            cardInput?.classList.add('error');
            allFieldsFilled = false;
        } else {
            cardInput?.classList.remove('error');
        }

        // 연구책임자 검증
        const managerInput = document.getElementById('ot_manager');
        if (!managerInput?.value) {
            managerInput?.classList.add('error');
            allFieldsFilled = false;
        } else {
            managerInput?.classList.remove('error');
        }

        // 신청자 검증
        if (!applicantInput?.value) {
            applicantInput?.classList.add('error');
            allFieldsFilled = false;
        } else {
            applicantInput?.classList.remove('error');
        }

        // 품의일자 검증
        if (!dateInput?.value) {
            dateInput?.classList.add('error');
            allFieldsFilled = false;
        } else {
            dateInput?.classList.remove('error');
        }

        // 품의명 검증
        if (!titleInput?.value) {
            titleInput?.classList.add('error');
            allFieldsFilled = false;
        } else {
            titleInput?.classList.remove('error');
        }

        // 총 공급대가 검증
        const amountValue = parseInt((amountInput?.value || '').replace(/,/g, '')) || 0;
        if (amountValue <= 0) {
            amountInput?.classList.add('error');
            allFieldsFilled = false;
        } else {
            amountInput?.classList.remove('error');
        }

        // 시작/종료 시간 검증
        if (!startTimeInput?.value) {
            startTimeInput?.classList.add('error');
            allFieldsFilled = false;
        } else {
            startTimeInput?.classList.remove('error');
        }

        if (!endTimeInput?.value) {
            endTimeInput?.classList.add('error');
            allFieldsFilled = false;
        } else {
            endTimeInput?.classList.remove('error');
        }

        // 업무 내용 검증
        // 야근 인원 전원이 개인 업무내용을 입력했다면 전역 셀렉트 검증 생략
        const overtimePersonsForTask = window.currentOvertimePersons || [];
        const allPersonsHaveTask = overtimePersonsForTask.length > 0 &&
            overtimePersonsForTask.every(p => p.task && p.task.trim());

        const taskValue = taskSelect?.value;
        if (!allPersonsHaveTask && !taskValue) {
            taskSelect?.classList.add('error');
            allFieldsFilled = false;
        } else {
            taskSelect?.classList.remove('error');
            if (!allPersonsHaveTask && taskValue === 'custom' && !taskCustomInput?.value) {
                taskCustomInput?.classList.add('error');
                allFieldsFilled = false;
            } else {
                taskCustomInput?.classList.remove('error');
            }
        }

        // 품의 내용 검증
        if (!contentInput?.value || !contentInput.value.trim()) {
            contentInput?.classList.add('error');
            allFieldsFilled = false;
        } else {
            contentInput?.classList.remove('error');
        }

        // 야근 인원 검증
        const overtimePersons = window.currentOvertimePersons || [];
        const overtimePersonArea = document.getElementById('overtimePersonArea');
        if (overtimePersons.length === 0) {
            overtimePersonArea?.classList.add('error');
            allFieldsFilled = false;
        } else {
            overtimePersonArea?.classList.remove('error');
        }

        // 인쇄 버튼 표시/숨김
        if (allFieldsFilled) {
            printBtn.style.display = 'inline-flex';
        } else {
            printBtn.style.display = 'none';
        }
    }

    // 인쇄 함수
    function printDocument() {
        const documentFormWrapper = document.querySelector('.document-form-wrapper');

        // 문서가 접혀있으면 먼저 펼치기
        if (documentFormWrapper && documentFormWrapper.classList.contains('collapsed')) {
            documentFormWrapper.classList.remove('collapsed');
            const toggleBtn = document.getElementById('documentFormToggle');
            if (toggleBtn) toggleBtn.classList.add('active');
        }

        // 잠시 대기 후 인쇄 (문서가 완전히 렌더링되도록)
        setTimeout(function() {
            window.print();
        }, 300);
    }

    // 인쇄 버튼 이벤트
    const printBtn = document.getElementById('printDocumentBtn');
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            printDocument();
        });
    }

    // 필수 필드 변경 시 검증
    const fieldsToWatch = [
        'ot_project', 'ot_card', 'ot_applicant', 'ot_approval_date',
        'ot_title', 'ot_amount', 'ot_start_time', 'ot_end_time',
        'ot_task_select', 'ot_task_custom', 'ot_content'
    ];

    fieldsToWatch.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', validateRequiredFields);
            field.addEventListener('change', validateRequiredFields);
        }
    });

    // 야근인원 목록 변경 감지를 위한 전역 함수 확장
    const originalAddOvertimePersonsToOvertime = window.addOvertimePersonsToOvertime;
    window.addOvertimePersonsToOvertime = function(persons) {
        if (originalAddOvertimePersonsToOvertime) {
            originalAddOvertimePersonsToOvertime(persons);
        }
        validateRequiredFields();
    };

    const originalRemoveOvertimePersonInTemplate = window.removeOvertimePersonInTemplate;
    window.removeOvertimePersonInTemplate = function(personId) {
        if (originalRemoveOvertimePersonInTemplate) {
            originalRemoveOvertimePersonInTemplate(personId);
        }
        validateRequiredFields();
    };

    // 야근인원 모달 관련
    const overtimePersonModal = document.getElementById('overtimePersonModal');
    const overtimePersonSearchInput = document.getElementById('overtimePersonSearchInput');

    // 초기 데이터 로드
    await loadEmployees();
    await loadMyProjects();

    // ============================================
    // 야근 인원 선택 모달 (프로젝트 참여인원 기반)
    // ============================================

    // 모달 열기
    window.openOvertimePersonModal = async function() {
        if (!selectedProject) {
            showWarning('과제를 먼저 선택해주세요.');
            return;
        }
        const dateInput = document.getElementById('ot_approval_date');
        if (!dateInput?.value) {
            showWarning('날짜를 먼저 선택해주세요.');
            return;
        }
        if (overtimePersonModal) {
            // 기존 선택된 야근인원을 temp에 복사
            const currentOvertimePersons = window.getCurrentOvertimePersons ? window.getCurrentOvertimePersons() : [];
            tempSelectedOvertimePersons = currentOvertimePersons.map(p => ({
                id: String(p.id),
                name: p.name,
                dept: p.dept,
                position: p.position,
                overtimeExpense: p.overtimeExpense || 0
            }));

            overtimePersonModal.classList.add('show');
            if (overtimePersonSearchInput) overtimePersonSearchInput.value = '';

            // 중복 검증 정보 로드 후 렌더링
            renderOvertimePersonList2('', true); // 로딩 상태로 먼저 렌더링
            await loadDuplicateInfoForAllPersons();
            renderOvertimePersonList2('');
            renderSelectedOvertimeBadges();
        }
    };

    // 모달 닫기
    window.closeOvertimePersonModal = function() {
        if (overtimePersonModal) {
            overtimePersonModal.classList.remove('show');
            tempSelectedOvertimePersons = [];
        }
    };

    // 모달 외부 클릭 시 닫기
    if (overtimePersonModal) {
        overtimePersonModal.addEventListener('click', function(e) {
            if (e.target === overtimePersonModal) {
                closeOvertimePersonModal();
            }
        });
    }

    // 야근인원 목록 렌더링 (프로젝트 참여인원)
    function renderOvertimePersonList2(searchText = '', isLoading = false) {
        const overtimePersonList2El = document.getElementById('overtimePersonList2');
        if (!overtimePersonList2El) return;

        // 로딩 상태 표시
        if (isLoading) {
            overtimePersonList2El.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                    중복 검증 중...
                </div>`;
            return;
        }

        const persons = getOvertimePersons();

        if (persons.length === 0) {
            overtimePersonList2El.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-users" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                    프로젝트 참여인원이 없습니다.
                </div>`;
            return;
        }

        const filtered = persons.filter(person => {
            const searchStr = (person.name + person.dept + person.position).toLowerCase();
            return searchStr.includes((searchText || '').toLowerCase());
        });

        if (filtered.length === 0) {
            overtimePersonList2El.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-search" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>
                    검색 결과가 없습니다.
                </div>`;
            return;
        }

        overtimePersonList2El.innerHTML = filtered.map(person => {
            const isSelected = tempSelectedOvertimePersons.some(a => String(a.id) === String(person.id));
            const formattedExpense = person.overtimeExpense ? person.overtimeExpense.toLocaleString('ko-KR') + '원' : '-';

            // 중복 체크
            const duplicateInfo = duplicateAttendeesInfo[person.id];
            const isDuplicate = duplicateInfo?.hasDuplicate;
            let duplicateBadge = '';
            if (isDuplicate) {
                const docs = duplicateInfo.documents || [];
                const docInfo = docs.map(d => `${d.typeName} (${d.startTime}~${d.endTime})`).join(', ');
                const tooltipText = `시간 중복: ${docInfo}`;
                duplicateBadge = `<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; white-space: nowrap;" title="${tooltipText}"><i class="fas fa-ban"></i> 시간 중복</span>`;
            }

            return `
                <div class="employee-item ${isSelected ? 'selected' : ''} ${isDuplicate ? 'duplicate-disabled' : ''}"
                     data-id="${person.id}"
                     onclick="toggleOvertimePerson(${person.id})"
                     style="${isDuplicate ? 'opacity: 0.6; cursor: not-allowed;' : ''}">
                    <div class="employee-info">
                        <div class="employee-name">${person.name}${duplicateBadge}</div>
                        <div class="employee-detail">${person.position} · ${person.dept} · ${formattedExpense}</div>
                    </div>
                    ${isSelected ? '<i class="fas fa-check-circle" style="color: #10b981; font-size: 18px; margin-left: auto;"></i>' : ''}
                </div>
            `;
        }).join('');
    }

    // 인원 선택 토글
    window.toggleOvertimePerson = function(personId) {
        const persons = getOvertimePersons();
        const person = persons.find(p => p.id === personId);
        if (!person) return;

        // 중복 체크 - 중복이면 선택 불가
        const duplicateInfo = duplicateAttendeesInfo[personId];
        if (duplicateInfo?.hasDuplicate) {
            const docs = duplicateInfo.documents || [];
            const docInfo = docs.map(d => `${d.typeName} (${d.startTime}~${d.endTime})`).join('<br>');
            showWarning(`${person.name}님은 이미 다른 문서에 등록되어 있습니다.<br><br>${docInfo}`);
            return;
        }

        const index = tempSelectedOvertimePersons.findIndex(a => String(a.id) === String(personId));
        if (index > -1) {
            tempSelectedOvertimePersons.splice(index, 1);
        } else {
            tempSelectedOvertimePersons.push({
                id: String(personId),
                name: person.name,
                dept: person.dept,
                position: person.position,
                overtimeExpense: person.overtimeExpense || 0
            });
        }

        renderOvertimePersonList2(overtimePersonSearchInput ? overtimePersonSearchInput.value : '');
        renderSelectedOvertimeBadges();
    };

    // 선택된 인원 뱃지 렌더링
    function renderSelectedOvertimeBadges() {
        const badgesEl = document.getElementById('selectedOvertimeBadges');
        const countEl = document.getElementById('selectedOvertimeCount');
        const totalAmountEl = document.getElementById('selectedOvertimeTotalAmount');
        if (!badgesEl || !countEl) return;

        countEl.textContent = tempSelectedOvertimePersons.length;

        const totalAmount = tempSelectedOvertimePersons.reduce((sum, p) => sum + (p.overtimeExpense || 0), 0);
        if (totalAmountEl) totalAmountEl.textContent = totalAmount.toLocaleString('ko-KR');

        if (tempSelectedOvertimePersons.length === 0) {
            badgesEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-plus"></i>
                    <span>프로젝트 참여인원을 선택해주세요</span>
                </div>`;
            return;
        }

        badgesEl.innerHTML = tempSelectedOvertimePersons.map(person => `
            <div class="attendee-badge" onclick="removeTempOvertimePerson('${person.id}')">
                <i class="fas fa-user"></i>
                <span class="badge-name">${person.name}</span>
                <span class="badge-info">${person.dept}</span>
                <div class="badge-remove">
                    <i class="fas fa-times"></i>
                </div>
            </div>
        `).join('');
    }

    // 임시 선택 인원 제거
    window.removeTempOvertimePerson = function(personId) {
        const index = tempSelectedOvertimePersons.findIndex(a => String(a.id) === String(personId));
        if (index > -1) {
            tempSelectedOvertimePersons.splice(index, 1);
            renderOvertimePersonList2(overtimePersonSearchInput ? overtimePersonSearchInput.value : '');
            renderSelectedOvertimeBadges();
        }
    };

    // 전체 선택 해제
    window.clearAllSelectedOvertimePersons = function() {
        tempSelectedOvertimePersons = [];
        renderOvertimePersonList2(overtimePersonSearchInput ? overtimePersonSearchInput.value : '');
        renderSelectedOvertimeBadges();
    };

    // 검색 기능
    if (overtimePersonSearchInput) {
        overtimePersonSearchInput.addEventListener('input', function(e) {
            renderOvertimePersonList2(e.target.value);
        });
    }

    // 선택된 야근인원 추가
    window.addSelectedOvertimePersons = function() {
        if (tempSelectedOvertimePersons.length === 0) {
            showWarning('야근 인원을 선택해주세요.');
            return;
        }

        const personsToAdd = tempSelectedOvertimePersons.map(p => ({
            id: p.id,
            name: p.name,
            dept: p.dept,
            position: p.position,
            overtimeExpense: p.overtimeExpense || 0
        }));

        // setupOvertimeAutoFill에서 정의된 함수 호출
        if (window.addOvertimePersonsToOvertime) {
            window.addOvertimePersonsToOvertime(personsToAdd);
        }

        // 모달 닫기
        closeOvertimePersonModal();
    };

    // ============================================
    // 통합 중복 검증 함수 (회의록, 야근식대, 출장, 출장+회의)
    // ============================================

    /**
     * 단일 참석자 중복 검증 API 호출
     * @param {Long} attendeeId - 참석자 IDX
     * @returns {Array} 중복 문서 목록
     */
    async function checkDuplicateForAttendee(attendeeId) {
        const dateInput = document.getElementById('ot_approval_date');
        const startTimeInput = document.getElementById('ot_start_time');
        const endTimeInput = document.getElementById('ot_end_time');
        const projectIdxInput = document.getElementById('selectedProjectIdx');

        const date = dateInput?.value;
        const startTime = startTimeInput?.value;
        const endTime = endTimeInput?.value;
        const projectIdx = projectIdxInput?.value;

        // 필수값 체크 (카드는 필수 아님 - 프로젝트와 시간으로만 체크)
        if (!date || !projectIdx) {
            console.log('[중복 검증] 필수값 누락 - date:', date, 'projectIdx:', projectIdx);
            return [];
        }

        try {
            let url = `/api/receipt-common/check-duplicate?date=${date}&attendeeIdx=${attendeeId}&projectIdx=${projectIdx}`;
            if (startTime) url += `&startTime=${startTime}`;
            if (endTime) url += `&endTime=${endTime}`;
            // 수정 모드일 때 자기 자신 제외
            if (isEditMode && editingIdx) {
                url += `&excludeReceiptIdx=${editingIdx}&excludeDocumentType=RCO`;
            }

            const response = await fetch(url);
            if (response.ok) {
                return await response.json();
            } else {
                console.error('[중복 검증] API 오류:', response.status);
                return [];
            }
        } catch (error) {
            console.error('[중복 검증] 네트워크 오류:', error);
            return [];
        }
    }

    /**
     * 모든 참석자의 중복 여부 확인 (모달 열 때)
     */
    async function loadDuplicateInfoForAllPersons() {
        duplicateAttendeesInfo = {}; // 초기화

        const dateInput = document.getElementById('ot_approval_date');
        const projectIdxInput = document.getElementById('selectedProjectIdx');

        const date = dateInput?.value;
        const projectIdx = projectIdxInput?.value;

        // 필수값 체크 (카드는 필수 아님 - 프로젝트와 시간으로만 체크)
        if (!date || !projectIdx) {
            console.log('[중복 검증] 모달 열기 시 필수값 누락 - date:', date, 'projectIdx:', projectIdx);
            return;
        }

        const persons = getOvertimePersons();
        console.log(`[중복 검증] ${persons.length}명 참석자 검증 시작`);

        // 각 참석자에 대해 중복 체크
        for (const person of persons) {
            try {
                const duplicates = await checkDuplicateForAttendee(person.id);
                if (duplicates && duplicates.length > 0) {
                    // 시간대 겹침이 있는 경우
                    duplicateAttendeesInfo[person.id] = {
                        hasDuplicate: true,
                        documents: duplicates
                    };
                    console.log(`[중복 발견] ${person.name}: ${duplicates.length}건`);
                }
            } catch (error) {
                console.error(`[중복 검증 오류] ${person.name}:`, error);
            }
        }

        console.log('[중복 검증 완료] 중복 정보:', duplicateAttendeesInfo);
    }

    /**
     * 선택된 인원들의 최종 중복 검증 (저장 전)
     * @returns {Array} 중복된 참석자 목록
     */
    async function checkDuplicateBeforeSave(attendeeIds) {
        const duplicates = [];

        for (const attendeeId of attendeeIds) {
            const results = await checkDuplicateForAttendee(attendeeId);
            if (results && results.length > 0) {
                const persons = getOvertimePersons();
                const person = persons.find(p => String(p.id) === String(attendeeId));
                duplicates.push({
                    attendeeId,
                    attendeeName: person?.name || '알 수 없음',
                    documents: results
                });
            }
        }

        return duplicates;
    }

    /**
     * 시간 변경 시 중복 검증 재실행
     */
    async function revalidateDuplicates() {
        console.log('[시간 변경] 중복 검증 재실행');
        await loadDuplicateInfoForAllPersons();
        // 모달이 열려있으면 리렌더링
        if (overtimePersonModal?.classList.contains('show')) {
            renderOvertimePersonList2(overtimePersonSearchInput?.value || '');
        }
        if (applicantModal?.classList.contains('show')) {
            const persons = typeof getOvertimePersons === 'function' ? getOvertimePersons() : [];
            renderApplicantList(persons, applicantSearch?.value || '');
        }

        // 이미 선택된 신청자가 있으면 중복 검증
        const selectedApplicantIdxInput = document.getElementById('selectedApplicantIdx');
        if (selectedApplicant && selectedApplicantIdxInput?.value) {
            const duplicateInfo = duplicateAttendeesInfo[selectedApplicantIdxInput.value];
            if (duplicateInfo?.hasDuplicate) {
                const docs = duplicateInfo.documents || [];
                const docInfo = docs.map(d => `${d.typeName} (${d.startTime}~${d.endTime})`).join('<br>');
                showWarning(
                    `현재 신청자 <b>${selectedApplicant.name}</b>님이 변경된 시간대에 다른 문서가 있습니다.<br><br>` +
                    `${docInfo}<br><br>` +
                    `신청자를 변경해주세요.`
                );

                // 야근인원에서도 제거
                const applicantId = selectedApplicantIdxInput.value;
                if (typeof window.removeOvertimePersonInTemplate === 'function') {
                    window.removeOvertimePersonInTemplate(applicantId);
                }

                // 신청자 초기화
                selectedApplicant = null;
                const otApplicant = document.getElementById('ot_applicant');
                if (otApplicant) {
                    otApplicant.value = '';
                    otApplicant.classList.add('error');
                }
                if (selectedApplicantIdxInput) selectedApplicantIdxInput.value = '';
            }
        }

        // 이미 선택된 야근인원 중 중복인 사람들도 제거
        const currentOvertimePersons = window.currentOvertimePersons || [];
        for (const person of currentOvertimePersons) {
            const duplicateInfo = duplicateAttendeesInfo[person.id];
            if (duplicateInfo?.hasDuplicate) {
                console.log(`[중복 발견] 야근인원에서 제거: ${person.name}`);
                if (typeof window.removeOvertimePersonInTemplate === 'function') {
                    window.removeOvertimePersonInTemplate(person.id);
                }
            }
        }
    }

    // 시간/날짜 변경 시 중복 검증 재실행 이벤트 등록
    setTimeout(() => {
        const dateInput = document.getElementById('ot_approval_date');
        const startTimeInput = document.getElementById('ot_start_time');
        const endTimeInput = document.getElementById('ot_end_time');

        [dateInput, startTimeInput, endTimeInput].forEach(input => {
            if (input) {
                input.addEventListener('change', async () => {
                    // 날짜/시간 변경 시 중복 정보 갱신 (프로젝트만 있으면 됨, 카드 불필요)
                    if (selectedProject) {
                        await revalidateDuplicates();
                    }
                });
            }
        });
    }, 500);

    // 초기 템플릿 로드 (야근식대)
    loadTemplate('receipt-overtime');

    // 템플릿 전환 비활성화
    templateTreeHeaders.forEach(header => {
        header.style.pointerEvents = 'none';
    });

    // ============================================
    // 금액 증가/초기화 함수
    // ============================================
    window.addOtAmount = function(value) {
        const amountInput = document.getElementById('ot_amount');
        if (!amountInput) return;
        let currentAmount = amountInput.value.replace(/,/g, '').trim();
        currentAmount = currentAmount ? parseInt(currentAmount) : 0;
        const newAmount = currentAmount + value;
        amountInput.value = newAmount.toLocaleString('ko-KR');
        amountInput.dispatchEvent(new Event('input'));
    };

    window.resetOtAmount = function() {
        const amountInput = document.getElementById('ot_amount');
        if (!amountInput) return;
        amountInput.value = '';
        amountInput.dispatchEvent(new Event('input'));
    };

    // ============================================
    // 페이지 초기화 - 야근식대 폼이 직접 렌더링되므로 바로 초기화
    // ============================================
    setupOvertimeAutoFill();
    setupDocumentFormToggle();

    // 초기값 자동 설정
    setTimeout(async () => {
        // 오늘 날짜 자동 설정
        const overtimeDate = document.getElementById('ot_approval_date');
        if (overtimeDate && !overtimeDate.value) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            overtimeDate.value = `${yyyy}-${mm}-${dd}`;
            overtimeDate.dispatchEvent(new Event('input'));
        }

        // 날짜/시간 입력 필드 전체 영역 클릭 시 선택기 열기
        const dateTimeInputs = [
            document.getElementById('ot_approval_date'),
            document.getElementById('ot_start_time'),
            document.getElementById('ot_end_time')
        ];
        dateTimeInputs.forEach(input => {
            if (input) {
                input.addEventListener('click', function() {
                    if (this.showPicker) {
                        this.showPicker();
                    }
                });
            }
        });

        // 품의명 기본값 자동 채우기
        const otTitle = document.getElementById('ot_title');
        if (otTitle && otTitle.value) {
            document.querySelectorAll('.ot-auto-title').forEach(field => {
                field.textContent = otTitle.value;
            });
            document.querySelectorAll('.ot-auto-desc').forEach(field => {
                field.textContent = otTitle.value;
            });
        }

        // URL 파라미터 확인 - 수정 모드 진입
        const urlParams = new URLSearchParams(window.location.search);
        const documentIdx = urlParams.get('documentIdx');
        if (documentIdx) {
            await loadExistingData(documentIdx);
            // 데이터 로드 완료 후 콘텐츠 표시
            const container = document.querySelector('.container');
            if (container) container.classList.add('data-loaded');
            document.documentElement.classList.remove('edit-mode-loading');
        } else {
            // 신규 작성 모드 - 로딩 오버레이 숨김
            window.hidePageLoadingOverlay();
        }

        // 초기 필수 필드 검증 실행
        validateRequiredFields();
    }, 200);
});
