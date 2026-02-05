// 프로젝트 상세보기 JavaScript
document.addEventListener('DOMContentLoaded', async function () {
    // 현재 로그인한 사용자 정보
    const currentUserIdx = window.CURRENT_USER?.idx || null;

    // URL에서 프로젝트 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');

    if (!projectId) {
        await showError('프로젝트 ID가 없습니다.');
        history.back();
        return;
    }

    // 주간업무보고 작성 버튼 초기 숨김
    const createWeeklyReportBtn = document.getElementById('createWeeklyReportBtn');
    if (createWeeklyReportBtn) {
        createWeeklyReportBtn.style.display = 'none';
    }

    // 프로젝트 상세 정보 로드
    window.showPageLoadingOverlay();
    loadProjectDetail(projectId, currentUserIdx);

    // 수정 버튼 이벤트 리스너
    const editBtn = document.getElementById('editBtn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            location.href = `/project/edit/${projectId}`;
        });
    }
    if (createWeeklyReportBtn) {
        createWeeklyReportBtn.addEventListener('click', function () {
            // 프로젝트 주간업무보고 작성 팝업
            const url = projectId
                ? `/approval/project-weekly-report?projectIdx=${projectId}`
                : '/approval/project-weekly-report';
            openWeeklyReportPopup(url);
        });
    }

    // 삭제 버튼 이벤트 리스너
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteProject(projectId));
    }

    // 상단으로 이동 버튼
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    const mainContent = document.querySelector('.main-content');
    if (scrollToTopBtn && mainContent) {
        mainContent.addEventListener('scroll', function () {
            if (mainContent.scrollTop > 300) {
                scrollToTopBtn.classList.add('visible');
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
        });
        scrollToTopBtn.addEventListener('click', function () {
            mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});

/**
 * 프로젝트 상세 정보 로드
 */
async function loadProjectDetail(projectId, currentUserIdx) {
    try {
        const data = await window.fetchWithErrorHandling(`/api/projects/${projectId}`);

        if (!data) {
            // Error already handled by fetchWithErrorHandling (404, 403, 500)
            return;
        }

        console.log('프로젝트 상세 데이터:', data);

        // 화면에 데이터 표시
        displayBasicInfo(data);
        displayBudgetInfo(data);
        displayReceiptUrl(data.receiptUrl);
        displayDescription(data.description);
        displayRelatedProjects(data.projectRelations || []);
        displayTeamMembers(data.projectMembers || []);
        displayExpenseSettings(data.projectExpenseSettings || []);

        // 현재 사용자가 프로젝트 참여자인지 확인하고 버튼 표시
        checkAndShowParticipantButtons(data.projectMembers || [], currentUserIdx);

        // 연구비 카드는 별도 API로 조회
        loadProjectCards(projectId);

        // 첨부파일 로드
        loadProjectFiles(projectId);

        // 관련 문서 로드
        loadProjectDocuments(projectId);

        // 로딩 오버레이 숨김
        window.hidePageLoadingOverlay();
    } catch (error) {
        console.error('프로젝트 조회 오류:', error);
        await showError('프로젝트를 불러오는데 실패했습니다.');
        window.hidePageLoadingOverlay();
        history.back();
    }
}

/**
 * 현재 사용자가 프로젝트 참여자인지 확인하고 주간업무보고 작성 버튼 표시
 */
function checkAndShowParticipantButtons(projectMembers, currentUserIdx) {
    const createWeeklyReportBtn = document.getElementById('createWeeklyReportBtn');
    const editBtn = document.getElementById('editBtn');
    const deleteBtn = document.getElementById('deleteBtn');

    // 로그인하지 않은 경우 모든 버튼 숨김
    if (!currentUserIdx) {
        if (createWeeklyReportBtn) createWeeklyReportBtn.style.display = 'none';
        if (editBtn) editBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
        return;
    }

    // projectMembers에서 현재 사용자가 포함되어 있는지 확인
    const isParticipant = projectMembers.some(member =>
        member.employeeIdx === currentUserIdx || member.empIdx === currentUserIdx
    );

    if (isParticipant) {
        if (createWeeklyReportBtn) createWeeklyReportBtn.style.display = 'inline-flex';
        if (editBtn) editBtn.style.display = 'inline-flex';
        if (deleteBtn) deleteBtn.style.display = 'inline-flex';
        console.log('현재 사용자가 프로젝트 참여자입니다. 버튼 표시.');
    } else {
        if (createWeeklyReportBtn) createWeeklyReportBtn.style.display = 'none';
        if (editBtn) editBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
        console.log('현재 사용자가 프로젝트 참여자가 아닙니다. 버튼 숨김.');
    }
}

/**
 * 기본 정보 표시
 */
function displayBasicInfo(data) {
    document.getElementById('projectName').value = data.projectName || '-';
    document.getElementById('clientName').value = data.clientName || '-';
    document.getElementById('projectStatus').value = getStatusLabel(data.projectStatus) || '-';
    document.getElementById('projectManager').value = data.projectManagerName || '-';
    document.getElementById('memberCount').value = data.memberCount ? `${data.memberCount}명` : '0명';
    document.getElementById('startDate').value = data.startDate || '-';
    document.getElementById('endDate').value = data.endDate || '-';
    document.getElementById('totalPeriodStart').value = data.totalPeriodStart || '-';
    document.getElementById('totalPeriodEnd').value = data.totalPeriodEnd || '-';

    // 진행률 (progressRate는 BigDecimal이므로 숫자로 변환)
    const progressRate = parseFloat(data.progressRate) || 0;
    document.getElementById('progressBar').style.width = `${progressRate}%`;
    document.getElementById('progressRate').textContent = `${progressRate.toFixed(1)}%`;
}

/**
 * 예산 정보 표시
 */
function displayBudgetInfo(data) {
    document.getElementById('activityBudget').textContent = formatCurrency(data.activityBudget || 0);
    document.getElementById('activityUsed').textContent = formatCurrency(data.activityUsed || 0);
    document.getElementById('activityRemaining').textContent = formatCurrency((data.activityBudget-data.activityUsed) || 0);
    document.getElementById('equipmentBudget').textContent = formatCurrency(data.equipmentBudget || 0);
    document.getElementById('equipmentUsed').textContent = formatCurrency(data.equipmentUsed || 0);
    document.getElementById('equipmentRemaining').textContent = formatCurrency((data.equipmentBudget-data.equipmentUsed) || 0);
    document.getElementById('materialBudget').textContent = formatCurrency(data.materialBudget || 0);
    document.getElementById('materialUsed').textContent = formatCurrency(data.materialUsed || 0);
    document.getElementById('materialRemaining').textContent = formatCurrency((data.materialBudget-data.materialUsed) || 0);
}

/**
 * 연구비 카드 로드
 */
async function loadProjectCards(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}/cards`);
        if (!response.ok) {
            throw new Error('카드 조회 실패');
        }

        const cards = await response.json();
        displayCards(cards || []);
    } catch (error) {
        console.error('카드 조회 오류:', error);
        displayCards([]);
    }
}

/**
 * 연구비 카드 표시
 */
function displayCards(cards) {
    const cardList = document.getElementById('cardList');

    if (!cards || cards.length === 0) {
        cardList.innerHTML = '<p style="text-align: center; padding: 12px; color: #999; border: 1px solid #ddd; border-radius: 6px; background: #f8f9fa;">등록된 카드가 없습니다.</p>';
        return;
    }

    cardList.innerHTML = cards.map(card => `
        <div class="card-item">
            <i class="fas fa-credit-card"></i>
            <span>${card.cardCompany || '카드회사 없음'} (${card.cardLastDigits || '****'}) ${card.cardNickname ? '- ' + card.cardNickname : ''}</span>
        </div>
    `).join('');
}

/**
 * 영수증 URL 표시
 */
function displayReceiptUrl(url) {
    const receiptUrl = document.getElementById('receiptUrl');
    if (url) {
        receiptUrl.innerHTML = `<a href="${url}" target="_blank">${url}</a>`;
        receiptUrl.style.color = '#667eea';
        receiptUrl.style.cursor = 'pointer';
    } else {
        receiptUrl.textContent = '';
    }
}

/**
 * 프로젝트 설명 표시
 */
function displayDescription(description) {
    const descElement = document.getElementById('projectDescription');
    descElement.textContent = description || '프로젝트 설명이 없습니다.';
}

/**
 * 연계 프로젝트 표시
 */
function displayRelatedProjects(projects) {
    const relatedList = document.getElementById('relatedProjectList');

    if (!projects || projects.length === 0) {
        relatedList.innerHTML = '';
        return;
    }

    relatedList.innerHTML = projects.map(project => `
        <div class="related-project-item"
             onclick="goToRelatedProject(${project.targetProjectIdx})"
             style="cursor: pointer;"
             title="클릭하여 프로젝트로 이동">
            <i class="fas fa-link"></i>
            <span class="project-title">${project.targetProjectName || '프로젝트명 없음'}</span>
            <span class="project-period">| 기간 : ${project.targetPeriod || '-'}</span>
            <i class="fas fa-external-link-alt" style="margin-left: auto; font-size: 11px; color: #868e96;"></i>
        </div>
    `).join('');
}

/**
 * 연계 프로젝트 상세 페이지로 이동
 */
function goToRelatedProject(projectIdx) {
    if (projectIdx) {
        location.href = `/project/detail?projectId=${projectIdx}`;
    }
}

/**
 * 팀원 목록 표시
 */
function displayTeamMembers(members) {
    const tbody = document.getElementById('teamTableBody');
    const countBadge = document.getElementById('teamMemberCount');
    const tableContainer = document.getElementById('teamTableContainer');
    const toggleContainer = document.getElementById('teamTableToggle');
    const toggleBtn = document.getElementById('toggleTeamBtn');

    // 총인원 표시
    const totalCount = members ? members.length : 0;
    if (countBadge) {
        countBadge.textContent = `총 ${totalCount}명`;
    }

    if (!members || members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #999;">참여연구원이 없습니다.</td></tr>';
        if (toggleContainer) toggleContainer.style.display = 'none';
        return;
    }

    tbody.innerHTML = members.map((member, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${member.employeeName || '-'}</td>
            <td>${member.employeeDeptName || '-'}</td>
            <td>${member.employeePositionName || '-'}</td>
            <td>${getRoleLabel(member.role)}</td>
            <td>${member.participationStartDate || '-'}</td>
            <td>${member.participationEndDate || '-'}</td>
        </tr>
    `).join('');

    // 7명 초과시 펼치기/접기 버튼 표시
    if (totalCount > 7) {
        if (toggleContainer) toggleContainer.style.display = 'flex';
        if (tableContainer) tableContainer.classList.add('collapsed');

        // 토글 버튼 이벤트
        if (toggleBtn) {
            toggleBtn.onclick = function() {
                const isCollapsed = tableContainer.classList.contains('collapsed');
                if (isCollapsed) {
                    tableContainer.classList.remove('collapsed');
                    tableContainer.classList.add('expanded');
                    toggleBtn.querySelector('.toggle-text').textContent = '접기';
                } else {
                    tableContainer.classList.remove('expanded');
                    tableContainer.classList.add('collapsed');
                    toggleBtn.querySelector('.toggle-text').textContent = '펼치기';
                }
            };
        }
    } else {
        if (toggleContainer) toggleContainer.style.display = 'none';
        if (tableContainer) {
            tableContainer.classList.remove('collapsed', 'expanded');
        }
    }
}

/**
 * 직급별 경비 설정 표시
 */
function displayExpenseSettings(settings) {
    const tbody = document.getElementById('expenseSettingsBody');

    if (!settings || settings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #999;">경비 설정이 없습니다.</td></tr>';
        return;
    }

    // positionCode별로 그룹화
    const groupedSettings = {};
    settings.forEach(setting => {
        if (!groupedSettings[setting.positionCode]) {
            groupedSettings[setting.positionCode] = {
                positionName: setting.positionName || getPositionName(setting.positionCode),
                dailyAllowance: 0,
                mealAllowance: 0,
                meetingAllowance: 0,
                overtimeMeal: 0
            };
        }

        const itemName = setting.expenseItemName || '';
        const amount = setting.amount || 0;

        // 경비 항목명을 기준으로 매핑 (출장비, 중식비, 회의비, 야근식대)
        if (itemName.includes('출장')) {
            groupedSettings[setting.positionCode].dailyAllowance = amount;
        } else if (itemName.includes('식비') || itemName.includes('중식')) {
            groupedSettings[setting.positionCode].mealAllowance = amount;
        } else if (itemName.includes('회의')) {
            groupedSettings[setting.positionCode].meetingAllowance = amount;
        } else if (itemName.includes('야근')) {
            groupedSettings[setting.positionCode].overtimeMeal = amount;
        }
    });

    // 직급 순서 정렬 (P1 ~ P7)
    const sortedPositions = Object.keys(groupedSettings).sort((a, b) => {
        const orderMap = {'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4, 'P5': 5, 'P6': 6, 'P7': 7};
        return (orderMap[a] || 99) - (orderMap[b] || 99);
    });

    tbody.innerHTML = sortedPositions.map(positionCode => {
        const setting = groupedSettings[positionCode];
        return `
            <tr>
                <td class="position-name-cell">${setting.positionName}</td>
                <td>${formatCurrency(setting.dailyAllowance)}</td>
                <td>${formatCurrency(setting.mealAllowance)}</td>
                <td>${formatCurrency(setting.meetingAllowance)}</td>
                <td>${formatCurrency(setting.overtimeMeal)}</td>
            </tr>
        `;
    }).join('');
}

/**
 * 직급 코드를 한글 직급명으로 변환
 */
function getPositionName(positionCode) {
    const positionMap = {
        'C0201': '대표이사',
        'C0202': '상무',
        'C0203': '이사',
        'C0204': '부장',
        'C0205': '차장',
        'C0206': '과장',
        'C0207': '대리',
        'C0208': '사원'
    };
    return positionMap[positionCode] || positionCode;
}

/**
 * 프로젝트 첨부파일 로드
 */
async function loadProjectFiles(projectId) {
    try {
        const response = await fetch(`/api/project-files/project/${projectId}`);
        if (!response.ok) {
            throw new Error('첨부파일 조회 실패');
        }

        const files = await response.json();
        displayAttachments(files || []);
    } catch (error) {
        console.error('첨부파일 조회 오류:', error);
        displayAttachments([]);
    }
}

/**
 * 첨부파일 표시
 */
function displayAttachments(attachments) {
    const attachmentsList = document.getElementById('attachmentsList');

    if (!attachments || attachments.length === 0) {
        attachmentsList.innerHTML = '';
        return;
    }

    attachmentsList.innerHTML = `
        <ul class="attachment-list">
            ${attachments.map(file => `
                <li class="attachment-item">
                    <i class="${getFileIcon(file.originalFilename)}"></i>
                    <a href="/api/project-files/download/${file.idx}" target="_blank">${file.originalFilename}</a>
                    ${file.fileSize ? `<span class="file-size">${formatFileSize(file.fileSize)}</span>` : ''}
                </li>
            `).join('')}
        </ul>
    `;
}

/**
 * 파일 확장자에 따른 아이콘 반환
 */
function getFileIcon(filename) {
    if (!filename) return 'fas fa-file';

    const ext = filename.split('.').pop().toLowerCase();
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
        '7z': 'fas fa-file-archive',
        'txt': 'fas fa-file-alt',
        'hwp': 'fas fa-file-alt'
    };

    return iconMap[ext] || 'fas fa-file';
}

/**
 * 프로젝트 삭제
 */
async function deleteProject(projectId) {
    const confirmed = await showDeleteConfirm('정말 이 프로젝트를 삭제하시겠습니까?');
    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('프로젝트 삭제 실패');
        }

        await showSuccess('프로젝트가 삭제되었습니다.');
        location.href = '/project';
    } catch (error) {
        console.error('프로젝트 삭제 오류:', error);
        await showError('프로젝트 삭제에 실패했습니다.');
    }
}

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
    return statusMap[status] || status;
}

/**
 * 역할 라벨 변환
 */
function getRoleLabel(role) {
    const roleMap = {
        'PI': '연구책임자',
        'PRACTITIONER': '실무자',
        'RESEARCHER': '연구원'
    };
    return roleMap[role] || role || '-';
}

/**
 * 통화 포맷 (천 단위 콤마)
 */
function formatCurrency(value) {
    if (!value) return '0';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 날짜 포맷
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
}

/**
 * 파일 크기 포맷
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 프로젝트 관련 문서 로드
 */
async function loadProjectDocuments(projectId) {
    try {
        // 주간업무보고 로드
        const weeklyResponse = await fetch(`/api/approval/documents/project/${projectId}?documentType=WEEKLY_REPORT`);
        if (weeklyResponse.ok) {
            const weeklyData = await weeklyResponse.json();
            displayWeeklyReports(weeklyData || []);
        } else {
            displayWeeklyReports([]);
        }

        // 연구비증빙 로드 (회의록, 출장, 야근식대)
        const expenseResponse = await fetch(`/api/approval/documents/project/${projectId}?documentTypes=RECEIPT_MEETING,BUSINESS_TRIP,RECEIPT_OVERTIME`);
        if (expenseResponse.ok) {
            const expenseData = await expenseResponse.json();
            displayExpenseReports(expenseData || []);
        } else {
            displayExpenseReports([]);
        }
    } catch (error) {
        console.error('관련 문서 로드 오류:', error);
        // 에러 시에도 빈 상태로 표시
        displayWeeklyReports([]);
        displayExpenseReports([]);
    }
}

/**
 * 주간업무보고 목록 표시
 */
function displayWeeklyReports(reports) {
    const listContainer = document.getElementById('weeklyReportList');
    const countElement = document.getElementById('weeklyReportCount');

    const totalCount = reports.length || 0;
    countElement.textContent = `${totalCount}건`;

    if (!reports || reports.length === 0) {
        listContainer.innerHTML = '<p class="empty-message">문서가 없습니다.</p>';
        return;
    }

    // 최신순 정렬
    const sorted = [...reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    listContainer.innerHTML = sorted.slice(0, 5).map(doc => `
        <div class="document-item" onclick="goToDocument('${doc.documentType}', ${doc.idx})">
            <div class="document-item-icon">
                <i class="fas fa-file-alt"></i>
            </div>
            <div class="document-item-info">
                <div class="document-item-title">${doc.title || '제목 없음'}</div>
                <div class="document-item-meta">${doc.drafterName || '-'} · ${formatDocumentDate(doc.createdAt)}</div>
            </div>
        </div>
    `).join('');
}

/**
 * 연구비증빙 목록 표시
 */
function displayExpenseReports(reports) {
    const listContainer = document.getElementById('expenseReportList');
    const countElement = document.getElementById('expenseReportCount');

    const totalCount = reports.length || 0;
    countElement.textContent = `${totalCount}건`;

    if (!reports || reports.length === 0) {
        listContainer.innerHTML = '<p class="empty-message">문서가 없습니다.</p>';
        return;
    }

    listContainer.innerHTML = reports.slice(0, 5).map(doc => `
        <div class="document-item" onclick="goToDocument('${doc.documentType}', ${doc.idx})">
            <div class="document-item-icon">
                <i class="fas fa-receipt"></i>
            </div>
            <div class="document-item-info">
                <div class="document-item-title">${doc.title || '제목 없음'}</div>
                <div class="document-item-meta">${getDocumentTypeLabel(doc.documentType)} · ${doc.drafterName || '-'} · ${formatDocumentDate(doc.createdAt)}</div>
            </div>
        </div>
    `).join('');
}

/**
 * 문서 상세 페이지로 이동
 */
async function goToDocument(documentType, sourceDocumentId) {
    if (!sourceDocumentId) return;

    let url;
    switch (documentType) {
        case 'WEEKLY_REPORT':
            url = `/approval/project-weekly-report/detail?documentIdx=${sourceDocumentId}`;
            openWeeklyReportPopup(url);
            return;
        case 'MEETING_MINUTES':
        case 'BUSINESS_TRIP':
        case 'RECEIPT_MEETING':
            await showWarning('상세 페이지 구현 중입니다.');
            return;
        case 'RECEIPT_OVERTIME':
            url = `/approval/receipt-overtime?documentIdx=${sourceDocumentId}`;
            openWeeklyReportPopup(url);
            return;
        default:
            url = `/approval/detail?documentId=${sourceDocumentId}`;
    }

    window.open(url, '_blank');
}

/**
 * 주간업무보고 팝업 열기
 */
function openWeeklyReportPopup(url) {
    const width = 1200;
    const height = 800;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    window.open(url, 'weeklyReportPopup', `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`);
}

/**
 * 더보기 클릭 시 문서 목록으로 이동
 */
function viewMoreDocuments(type) {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');

    const width = 1200;
    const height = 800;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    if (type === 'weekly') {
        window.open(`/project/documents?projectId=${projectId}&tab=weekly`, 'projectDocumentsPopup', `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`);
    } else if (type === 'expense') {
        window.open(`/project/documents?projectId=${projectId}&tab=expense`, 'projectDocumentsPopup', `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`);
    }
}

/**
 * 문서 상태 클래스 반환
 */
function getStatusClass(status) {
    const classMap = {
        'APPROVED': 'approved',
        'PENDING': 'pending',
        'REJECTED': 'rejected',
        'IN_PROGRESS': 'pending',
        'DRAFT': 'pending'
    };
    return classMap[status] || 'pending';
}

/**
 * 문서 상태 라벨 반환
 */
function getDocumentStatusLabel(status) {
    const statusMap = {
        'DRAFT': '임시저장',
        'PENDING': '대기',
        'IN_PROGRESS': '진행중',
        'APPROVED': '승인',
        'REJECTED': '반려'
    };
    return statusMap[status] || status || '-';
}

/**
 * 문서 유형 라벨 반환
 */
function getDocumentTypeLabel(type) {
    const typeMap = {
        'WEEKLY_REPORT': '프로젝트 주간업무보고',
        'MEETING_MINUTES': '회의록',
        'BUSINESS_TRIP': '출장',
        'RECEIPT_MEETING': '회의록',
        'RECEIPT_OVERTIME': '야근식대'
    };
    return typeMap[type] || type || '-';
}

/**
 * 문서 날짜 포맷
 */
function formatDocumentDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}
