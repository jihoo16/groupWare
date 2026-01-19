// 프로젝트 상세보기 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // URL에서 프로젝트 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');

    if (!projectId) {
        alert('프로젝트 ID가 없습니다.');
        history.back();
        return;
    }

    // 프로젝트 상세 정보 로드
    loadProjectDetail(projectId);

    // 수정 버튼 이벤트 리스너
    const editBtn = document.getElementById('editBtn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            location.href = `/project/edit/${projectId}`;
        });
    }

    // 삭제 버튼 이벤트 리스너
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteProject(projectId));
    }
});

/**
 * 프로젝트 상세 정보 로드
 */
async function loadProjectDetail(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
            throw new Error('프로젝트 조회 실패');
        }

        const data = await response.json();
        console.log('프로젝트 상세 데이터:', data);

        // 화면에 데이터 표시
        displayBasicInfo(data);
        displayBudgetInfo(data);
        displayReceiptUrl(data.receiptUrl);
        displayDescription(data.description);
        displayRelatedProjects(data.projectRelations || []);
        displayTeamMembers(data.projectMembers || []);
        displayExpenseSettings(data.projectExpenseSettings || []);
        displayAttachments(data.attachments || []);

        // 연구비 카드는 별도 API로 조회
        loadProjectCards(projectId);
    } catch (error) {
        console.error('프로젝트 조회 오류:', error);
        alert('프로젝트를 불러오는데 실패했습니다.');
        history.back();
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
    document.getElementById('equipmentBudget').textContent = formatCurrency(data.equipmentBudget || 0);
    document.getElementById('equipmentUsed').textContent = formatCurrency(data.equipmentUsed || 0);
    document.getElementById('materialBudget').textContent = formatCurrency(data.materialBudget || 0);
    document.getElementById('materialUsed').textContent = formatCurrency(data.materialUsed || 0);
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

    if (!members || members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #999;">참여연구원이 없습니다.</td></tr>';
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

        // 경비 항목명을 기준으로 매핑 (출장비, 중식비, 회의비, 야근석식대)
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
                    <i class="fas fa-file-pdf"></i>
                    <a href="${file.url}" target="_blank">${file.name}</a>
                    ${file.size ? `<span class="file-size">${formatFileSize(file.size)}</span>` : ''}
                </li>
            `).join('')}
        </ul>
    `;
}

/**
 * 프로젝트 삭제
 */
async function deleteProject(projectId) {
    if (!confirm('정말 이 프로젝트를 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('프로젝트 삭제 실패');
        }

        alert('프로젝트가 삭제되었습니다.');
        location.href = '/project';
    } catch (error) {
        console.error('프로젝트 삭제 오류:', error);
        alert('프로젝트 삭제에 실패했습니다.');
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
