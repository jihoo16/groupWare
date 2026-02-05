// 연구비 증빙 - 야근식대 페이지 JavaScript
document.addEventListener('DOMContentLoaded', async function() {
    // 전역 변수
    let selectedApprovers = [];
    let selectedFiles = [];
    let selectedEmployee = null;
    let projects = []; // 내가 참여한 프로젝트 목록
    let selectedProject = null; // 선택된 프로젝트
    let projectMembers = []; // 선택된 프로젝트의 참여인원
    let projectCards = []; // 선택된 프로젝트의 카드 목록
    let selectedCard = null; // 선택된 카드
    let selectedApplicant = null; // 선택된 신청자
    let tempSelectedOvertimePersons = []; // 모달에서 임시 선택된 인원
    let projectExpenses = {}; // 선택된 프로젝트의 직급별 야근석식대

    // 수정 모드 관련 변수
    let isEditMode = false;
    let editingIdx = null; // 수정 중인 야근식대 idx
    let existingAttachments = []; // 기존 첨부파일 목록
    let deletedAttachmentIds = []; // 삭제 예정인 첨부파일 ID 목록

    // DOM 요소
    const templateTreeHeaders = document.querySelectorAll('.tree-node-header[data-template]');
    const categoryNodes = document.querySelectorAll('.tree-node-header.category-node');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const documentForm = document.getElementById('documentForm');
    const approverChips = document.getElementById('approverChips');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const fileUploadArea = document.getElementById('fileUploadArea');
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
    // 내가 참여한 프로젝트 로드
    // ============================================
    async function loadMyProjects() {
        const currentUserIdx = window.CURRENT_USER?.idx;
        if (!currentUserIdx) return;

        try {
            const response = await fetch(`/api/projects?memberIdx=${currentUserIdx}`);
            if (response.ok) {
                projects = await response.json();
                console.log('내 프로젝트 로드 완료:', projects.length + '건');
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
                if (project.projectExpenseSettings) {
                    project.projectExpenseSettings.forEach(setting => {
                        if (setting.positionName && setting.expenseItemName === '야근석식대' && setting.amount) {
                            projectExpenses[setting.positionName] = setting.amount;
                        }
                    });
                }
                console.log('프로젝트 참여인원 로드 완료:', projectMembers.length + '명');
                console.log('프로젝트 야근식대 경비:', projectExpenses);
            } else {
                console.error('프로젝트 참여인원 로드 실패');
                projectMembers = [];
                projectExpenses = {};
            }
        } catch (error) {
            console.error('프로젝트 참여인원 로드 오류:', error);
            projectMembers = [];
            projectExpenses = {};
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

    // ============================================
    // 수정 모드: 기존 데이터 로드
    // ============================================
    async function loadExistingData(documentIdx) {
        try {
            const data = await window.fetchWithErrorHandling(`/api/receipt-overtimes/by-document/${documentIdx}`);

            if (!data) {
                // Error already handled by fetchWithErrorHandling (404, 403, 500)
                return;
            }

            console.log('기존 야근식대 데이터 로드:', data);

            // 수정 모드 설정
            isEditMode = true;
            editingIdx = data.idx;
            existingAttachments = data.attachments || [];

            // 프로젝트 정보 설정
            if (data.projectIdx) {
                selectedProject = projects.find(p => p.idx === data.projectIdx);
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

                    await loadProjectMembers(selectedProject.idx);

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
            }

            // 지급종류 설정
            if (data.paymentType) {
                const paymentRadio = document.querySelector(`input[name="ot_payment_type"][value="${data.paymentType}"]`);
                if (paymentRadio) {
                    paymentRadio.checked = true;
                    paymentRadio.dispatchEvent(new Event('change'));
                }
            }

            // 내용 설정
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

                // 업무내용 설정 (HTML select box 옵션과 일치하도록)
                if (data.attendees[0].workTask) {
                    const otTaskSelect = document.getElementById('ot_task_select');
                    const otTaskCustom = document.getElementById('ot_task_custom');
                    // HTML의 실제 select 옵션 값들
                    const predefinedTasks = [
                        '백엔드 API 개발',
                        '프론트엔드 UI 개발',
                        '데이터베이스 설계',
                        '시스템 아키텍처 설계',
                        '버그 수정 및 디버깅',
                        '코드 리뷰 및 품질 관리',
                        '테스트 코드 작성',
                        '배포 및 운영 환경 구축',
                        '성능 최적화',
                        '기술 문서 작성'
                    ];

                    const workTask = data.attendees[0].workTask;
                    if (predefinedTasks.includes(workTask)) {
                        if (otTaskSelect) otTaskSelect.value = workTask;
                    } else {
                        if (otTaskSelect) otTaskSelect.value = 'custom';
                        if (otTaskCustom) {
                            otTaskCustom.value = workTask;
                            otTaskCustom.style.display = 'block';
                        }
                    }
                    if (otTaskSelect) otTaskSelect.dispatchEvent(new Event('change'));
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
                } else {
                    console.error('addOvertimePersonsToOvertime 함수가 없습니다.');
                }
            }

            // 첨부파일 목록 업데이트
            deletedAttachmentIds = []; // 삭제 예정 목록 초기화
            updateFileList();

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
        updateFileList();
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
                    window.location.href = '/project/documents?tab=receipt-overtime';
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

    function renderProjectList(list, keyword = '') {
        if (!projectListEl) return;
        projectListEl.innerHTML = '';

        if (list.length === 0) {
            projectListEl.innerHTML = `
                <div class="modal-empty-state" style="text-align:center; padding:40px; color:#999;">
                    <i class="fas fa-folder-open" style="font-size:32px; margin-bottom:10px;"></i>
                    <p>${keyword ? '검색 결과가 없습니다' : '참여중인 프로젝트가 없습니다'}</p>
                </div>`;
            return;
        }

        list.forEach(proj => {
            const item = document.createElement('div');
            item.className = 'employee-item';
            if (selectedProject && selectedProject.idx === proj.idx) {
                item.classList.add('selected');
            }

            const name = keyword ? highlightProjectText(proj.projectName, keyword) : proj.projectName;
            const desc = proj.description || '설명 없음';

            item.innerHTML = `
                <div class="employee-info">
                    <div class="employee-name"><i class="fas fa-folder" style="margin-right:6px; color:#667eea;"></i>${name}</div>
                    <div class="employee-detail">${desc}</div>
                </div>
            `;

            item.addEventListener('click', async function() {
                selectedProject = proj;

                const otProject = document.getElementById('ot_project');
                if (otProject) {
                    otProject.value = proj.projectName;
                    otProject.style.borderColor = '';
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
                    document.querySelectorAll('.ot-auto-manager').forEach(field => {
                        field.textContent = proj.projectManagerName;
                    });
                }

                // 프로젝트 참여인원 로드
                await loadProjectMembers(proj.idx);

                // 프로젝트 카드 목록 로드
                await loadProjectCards(proj.idx);

                // 카드 선택 초기화 및 안내 문구 표시
                selectedCard = null;
                const otCard = document.getElementById('ot_card');
                if (otCard) {
                    otCard.value = '';
                    otCard.placeholder = '클릭하여 카드 선택';
                }
                const selectedCardIdx = document.getElementById('selectedCardIdx');
                if (selectedCardIdx) selectedCardIdx.value = '';

                // 신청자 선택 초기화 및 안내 문구 표시
                selectedApplicant = null;
                const otApplicant = document.getElementById('ot_applicant');
                if (otApplicant) {
                    otApplicant.value = '';
                    otApplicant.placeholder = '클릭하여 신청자 선택';
                }
                const selectedApplicantIdx = document.getElementById('selectedApplicantIdx');
                if (selectedApplicantIdx) selectedApplicantIdx.value = '';

                closeProjectModal();
            });

            projectListEl.appendChild(item);
        });
    }

    function highlightProjectText(text, keyword) {
        if (!keyword || !text) return text;
        const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    if (projectSearch) {
        projectSearch.addEventListener('input', function() {
            const keyword = this.value.trim().toLowerCase();
            const filtered = projects.filter(proj =>
                (proj.projectName || '').toLowerCase().includes(keyword) ||
                (proj.description || '').toLowerCase().includes(keyword)
            );
            renderProjectList(filtered, this.value.trim());
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
    function renderApplicantList(list, keyword = '') {
        if (!applicantList) return;
        applicantList.innerHTML = '';

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

            const highlightedName = keyword ? highlightApplicantText(member.name, keyword) : member.name;

            item.innerHTML = `
                <div class="employee-info">
                    <div class="employee-name"><i class="fas fa-user" style="margin-right:6px; color:#667eea;"></i>${highlightedName}</div>
                    <div class="employee-detail">${member.dept || '-'} / ${member.position || '-'}</div>
                </div>
            `;

            item.addEventListener('click', function() {
                selectedApplicant = member;

                // 신청자 입력 필드에 표시
                const otApplicant = document.getElementById('ot_applicant');
                if (otApplicant) {
                    otApplicant.value = member.name;
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

    window.openApplicantModal = function() {
        const projectIdxInput = document.getElementById('selectedProjectIdx');

        if (!projectIdxInput || !projectIdxInput.value) {
            showWarning('과제를 먼저 선택해주세요.');
            return;
        }

        if (applicantModal) {
            applicantModal.classList.add('show');
            const persons = typeof getOvertimePersons === 'function' ? getOvertimePersons() : [];
            renderApplicantList(persons);
            if (applicantSearch) applicantSearch.value = '';
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
                    return `
                    <div class="trip-person-item" onclick="removeOvertimePersonInTemplate('${person.id}')">
                        <div class="trip-person-info">
                            <span class="name">${person.name}</span>
                            <span>${person.dept}</span>
                            <span>${person.position}</span>
                            <span style="color: #667eea; font-weight: 600;">${expenseText}</span>
                        </div>
                        <button type="button" class="trip-person-remove">
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
                    task: ''
                };
            });
            overtimePersons = newList;
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

        // 야근 신청서 테이블 업데이트
        function updateOvertimeTable() {
            const personRows = document.querySelectorAll('.ot-person-row');
            const timeRange = getFormattedTimeRange();
            const currentTask = getCurrentTask();

            personRows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                if (index < overtimePersons.length) {
                    const person = overtimePersons[index];
                    cells[1].textContent = person.name || '';
                    cells[2].textContent = timeRange;
                    cells[3].textContent = currentTask;
                } else {
                    cells[1].innerHTML = '&nbsp;';
                    cells[2].innerHTML = '&nbsp;';
                    cells[3].innerHTML = '&nbsp;';
                }
            });
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

        // 신청자 자동 채우기 (로그인 사용자)
        if (otApplicant && window.CURRENT_USER?.empName) {
            otApplicant.value = window.CURRENT_USER.empName;
            document.querySelectorAll('.ot-auto-applicant').forEach(field => {
                field.textContent = window.CURRENT_USER.empName;
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

        // 지급종류 라디오 버튼 자동 채우기
        const paymentTypeRadios = document.querySelectorAll('input[name="ot_payment_type"]');

        function updatePaymentTypeDisplay() {
            const selectedValue = document.querySelector('input[name="ot_payment_type"]:checked')?.value;
            const cardMark = selectedValue === 'card' ? '○' : '';
            const transferMark = selectedValue === 'transfer' ? '○' : '';

            document.querySelectorAll('.ot-auto-payment-card').forEach(field => {
                field.textContent = cardMark;
            });
            document.querySelectorAll('.ot-auto-payment-transfer').forEach(field => {
                field.textContent = transferMark;
            });
        }

        paymentTypeRadios.forEach(radio => {
            radio.addEventListener('change', updatePaymentTypeDisplay);
        });

        // 초기값 설정 (연구비카드가 기본)
        updatePaymentTypeDisplay();

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
            });
        }

        // 직접 입력 시 테이블 업데이트
        if (otTaskCustom) {
            otTaskCustom.addEventListener('input', updateOvertimeTable);
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

    // 파일 목록 업데이트 (기존 파일 + 새 파일)
    function updateFileList() {
        if (!fileList) return;

        fileList.innerHTML = '';

        // 1. 기존 파일 표시 (삭제 예정인 파일 제외)
        existingAttachments.forEach(att => {
            // 삭제 예정 목록에 있는 파일은 표시하지 않음
            if (deletedAttachmentIds.includes(att.idx)) {
                return;
            }

            const item = document.createElement('div');
            item.className = 'file-item';

            const icon = getFileIcon(att.originalFilename);
            const fileSizeKB = (att.fileSize / 1024).toFixed(1);

            item.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${att.originalFilename} (${fileSizeKB} KB)</span>
                <a href="/api/receipt-overtimes/attachments/${att.idx}/download" class="btn-download-file" download title="다운로드">
                    <i class="fas fa-download"></i>
                </a>
                <button class="btn-remove-file" onclick="removeExistingAttachment(${att.idx})" title="삭제">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(item);
        });

        // 2. 새로 선택한 파일 표시
        selectedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';

            const icon = getFileIcon(file.name);

            item.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB) <span style="color: #667eea; font-size: 11px;">[신규]</span></span>
                <button class="btn-remove-file" onclick="removeFile(${index})" title="삭제">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(item);
        });

        // 3. 파일이 하나도 없을 때 메시지 표시
        const visibleExistingFiles = existingAttachments.filter(f => !deletedAttachmentIds.includes(f.idx));
        if (visibleExistingFiles.length === 0 && selectedFiles.length === 0) {
            fileList.innerHTML = '<p style="color: #999; font-size: 12px; padding: 10px 0;">첨부된 파일이 없습니다.</p>';
        }
    }

    // 파일 제거
    window.removeFile = function(index) {
        selectedFiles.splice(index, 1);
        updateFileList();
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

            // 총 공급가액 검증
            const amountValidation = parseInt((otAmount?.value || '').replace(/,/g, '')) || 0;
            if (amountValidation <= 0) {
                showWarning('총 공급가액을 입력해주세요.');
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

            if (!taskContent) {
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

            // 지급종류
            const paymentType = document.querySelector('input[name="ot_payment_type"]:checked')?.value || 'card';

            // 금액
            const amountStr = otAmount?.value?.replace(/,/g, '') || '0';
            const amount = parseFloat(amountStr) || 0;

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
                paymentType: paymentType,
                attendees: overtimePersons.map(person => ({
                    userIdx: person.id,
                    workTime: workTimeStr,
                    workTask: taskContent
                }))
            };

            // FormData 생성
            const formData = new FormData();
            formData.append('data', JSON.stringify(data));

            // 첨부파일 추가
            if (selectedFiles && selectedFiles.length > 0) {
                selectedFiles.forEach(file => {
                    formData.append('files', file);
                });
            }

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
                        window.location.href = '/project/documents';
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

        // 총 공급가액 검증
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
        const taskValue = taskSelect?.value;
        if (!taskValue) {
            taskSelect?.classList.add('error');
            allFieldsFilled = false;
        } else {
            taskSelect?.classList.remove('error');
            if (taskValue === 'custom' && !taskCustomInput?.value) {
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
    window.openOvertimePersonModal = function() {
        if (!selectedProject) {
            showWarning('과제를 먼저 선택해주세요.');
            return;
        }
        if (overtimePersonModal) {
            // 기존 선택된 야근인원을 temp에 복사
            const currentOvertimePersons = window.getCurrentOvertimePersons ? window.getCurrentOvertimePersons() : [];
            tempSelectedOvertimePersons = currentOvertimePersons.map(p => ({
                id: String(p.id),
                name: p.name,
                dept: p.dept,
                position: p.position
            }));

            overtimePersonModal.classList.add('show');
            renderOvertimePersonList2('');
            renderSelectedOvertimeBadges();
            if (overtimePersonSearchInput) overtimePersonSearchInput.value = '';
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
    function renderOvertimePersonList2(searchText = '') {
        const overtimePersonList2El = document.getElementById('overtimePersonList2');
        if (!overtimePersonList2El) return;

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
            return `
                <div class="employee-item ${isSelected ? 'selected' : ''}"
                     data-id="${person.id}"
                     onclick="toggleOvertimePerson(${person.id})">
                    <div class="employee-info">
                        <div class="employee-name">${person.name}</div>
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
        if (!badgesEl || !countEl) return;

        countEl.textContent = tempSelectedOvertimePersons.length;

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

        // 날짜 입력 필드 전체 영역 클릭 시 날짜 선택기 열기
        if (overtimeDate) {
            overtimeDate.addEventListener('click', function() {
                if (this.showPicker) {
                    this.showPicker();
                }
            });
        }

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
            window.showPageLoadingOverlay();
            await loadExistingData(documentIdx);
        } else {
            // 신규 작성 모드 - 로딩 오버레이 숨김
            window.hidePageLoadingOverlay();
        }

        // 초기 필수 필드 검증 실행
        validateRequiredFields();
    }, 200);
});
