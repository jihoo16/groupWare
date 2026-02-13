// 연차신청서 상세보기 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // URL에서 문서 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const documentIdx = urlParams.get('documentIdx');

    if (!documentIdx) {
        showError('문서 ID가 없습니다.');
        history.back();
        return;
    }

    // 문서 상세 정보 로드
    window.showPageLoadingOverlay();
    loadDocumentDetail(documentIdx);
});

/**
 * 문서 상세 정보 로드
 */
async function loadDocumentDetail(documentIdx) {
    try {
        const data = await window.fetchWithErrorHandling(`/api/vacation/detail?documentIdx=${documentIdx}`);

        if (!data) {
            // Error already handled by fetchWithErrorHandling (404, 403, 500)
            return;
        }

        console.log('문서 상세 데이터:', data);

        // 화면에 데이터 표시
        displayDocumentInfo(data);
        displayPeriods(data.periods || []);
        displayAttachments(data.attachments || []);

        // 로딩 오버레이 숨김
        window.hidePageLoadingOverlay();
    } catch (error) {
        console.error('문서 조회 오류:', error);
        showError('문서를 불러오는데 실패했습니다.');
        window.hidePageLoadingOverlay();
        // history.back() 대신 목록 페이지로 이동하여 무한 루프 방지
        setTimeout(() => {
            window.location.href = '/approval';
        }, 1500);
    }
}

/**
 * 문서 기본 정보 표시
 */
function displayDocumentInfo(data) {
    document.getElementById('documentNo').value = data.documentNo || '-';
    document.getElementById('applyDate').value = formatDate(data.applyDate);
    document.getElementById('drafterName').value = data.drafterName || '-';
    document.getElementById('drafterDept').value = data.drafterDept || '-';
    document.getElementById('drafterPosition').value = data.drafterPosition || '-';
    document.getElementById('remainingDays').value = data.remainingDays ? `${data.remainingDays}일` : '-';
    document.getElementById('reason').textContent = data.reason || '사유 없음';

    // 작성자 확인 후 삭제 버튼 생성
    const currentUserIdx = window.CURRENT_USER ? window.CURRENT_USER.idx : null;
    const isAdmin = window.CURRENT_USER && window.CURRENT_USER.isAdmin === true;
    console.log('[삭제 버튼 표시 조건 확인]');
    console.log('- 현재 로그인 사용자 idx:', currentUserIdx);
    console.log('- 관리자 여부:', isAdmin);
    console.log('- 문서 작성자 idx (drafterUserIdx):', data.drafterUserIdx);
    console.log('- 문서 작성자 idx (userIdx):', data.userIdx);
    console.log('- window.CURRENT_USER:', window.CURRENT_USER);

    // drafterUserIdx 또는 userIdx 둘 다 확인 (API 응답 구조에 따라 다를 수 있음)
    const documentUserIdx = data.drafterUserIdx || data.userIdx;

    // 작성자 본인이거나 관리자인 경우 삭제 버튼 생성 (단, 이미 삭제된 문서는 제외)
    const isOwner = documentUserIdx && currentUserIdx && Number(documentUserIdx) === Number(currentUserIdx);
    const isDeleted = data.deletedAt != null;

    if ((isOwner || isAdmin) && !isDeleted) {
        console.log('✓ 작성자 본인이거나 관리자이므로 삭제 버튼 생성');
        createDeleteButton(data.documentIdx, data.periods || []);
    } else if (isDeleted) {
        console.log('✗ 이미 삭제된 문서이므로 삭제 버튼 미생성');
    } else {
        console.log('✗ 작성자가 아니고 관리자도 아니므로 삭제 버튼 미생성');
    }
}

/**
 * 삭제 버튼 동적 생성
 */
function createDeleteButton(documentIdx, periods) {
    const headerButtons = document.getElementById('headerButtons');
    if (headerButtons && !document.getElementById('deleteBtn')) {
        const deleteWrapper = document.createElement('div');
        deleteWrapper.className = 'button-with-tooltip';

        const deleteBtn = document.createElement('button');
        deleteBtn.id = 'deleteBtn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> 삭제';

        // 휴가 종료일이 지났는지 확인
        const isVacationExpired = checkIfVacationExpired(periods);

        // 관리자 여부 확인
        const isAdmin = window.CURRENT_USER && window.CURRENT_USER.isAdmin === true;

        if (isVacationExpired && !isAdmin) {
            // 휴가일이 지났지만 관리자가 아닌 경우 - 비활성화
            deleteBtn.className = 'btn-danger disabled';
            deleteBtn.disabled = true;
            deleteBtn.style.cursor = 'not-allowed';
            deleteBtn.style.opacity = '0.5';
            deleteBtn.style.backgroundColor = '#999';
            deleteBtn.style.borderColor = '#999';

            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip-text';
            tooltip.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                휴가 날짜가 지난 경우 삭제가 불가능합니다.<br>
                관리부에 문의해주세요.
            `;

            deleteWrapper.appendChild(deleteBtn);
            deleteWrapper.appendChild(tooltip);
        } else {
            // 휴가일이 지나지 않았거나 관리자인 경우 - 정상 삭제 가능
            deleteBtn.className = 'btn-danger';
            deleteBtn.addEventListener('click', () => deleteDocument(documentIdx));

            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip-text';

            if (isAdmin && isVacationExpired) {
                // 관리자가 만료된 휴가를 삭제하는 경우
                tooltip.innerHTML = `
                    <i class="fas fa-shield-alt"></i>
                    관리자 권한으로 삭제가 가능합니다.
                `;
            } else {
                // 일반적인 경우
                tooltip.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    연차신청서는 PDF로 자동 생성되므로 수정이 불가능합니다.<br>
                    문서를 삭제하고 새로 작성해주세요.
                `;
            }

            deleteWrapper.appendChild(deleteBtn);
            deleteWrapper.appendChild(tooltip);
        }

        // 돌아가기 버튼 앞에 삽입
        headerButtons.insertBefore(deleteWrapper, headerButtons.firstChild);
        console.log('작성자이므로 삭제 버튼을 생성합니다.');
    }
}

/**
 * 휴가 시작일이 지났는지 확인 (하나라도 지난 날짜가 있으면 삭제 불가)
 */
function checkIfVacationExpired(periods) {
    if (!periods || periods.length === 0) {
        return false;
    }

    // 오늘 날짜 (시간 제외, 날짜만)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 모든 기간 중 가장 빠른 시작일 찾기
    let earliestStartDate = null;
    periods.forEach(period => {
        if (period.startDate) {
            const startDate = new Date(period.startDate);
            startDate.setHours(0, 0, 0, 0);

            if (!earliestStartDate || startDate < earliestStartDate) {
                earliestStartDate = startDate;
            }
        }
    });

    // 가장 빠른 시작일이 오늘보다 이전이면 true (삭제 불가)
    if (earliestStartDate && earliestStartDate < today) {
        console.log('휴가 시작일이 지났습니다. 삭제 불가능.');
        return true;
    }

    return false;
}

/**
 * 결재라인 표시
 */
function displayApprovalLine(approvers) {
    const table = document.getElementById('approvalLineTable');

    if (!approvers || approvers.length === 0) {
        table.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px;">결재자 정보가 없습니다.</td></tr>';
        return;
    }

    // 결재자 헤더 행
    let headerRow = '<tr>';
    approvers.forEach(approver => {
        headerRow += `<th class="approval-header">${approver.position || '결재자'}</th>`;
    });
    headerRow += '</tr>';

    // 결재자 이름 행
    let nameRow = '<tr>';
    approvers.forEach(approver => {
        nameRow += `
            <td class="approval-name-cell">
                <span class="approver-name">${approver.name || '-'}</span>
            </td>
        `;
    });
    nameRow += '</tr>';

    table.innerHTML = headerRow + nameRow;
}

/**
 * 연차 기간 표시
 */
function displayPeriods(periods) {
    const periodsList = document.getElementById('periodsList');

    if (!periods || periods.length === 0) {
        periodsList.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">연차 기간 정보가 없습니다.</p>';
        return;
    }

    let html = '<table class="periods-table"><thead><tr>';
    html += '<th>연차 유형</th><th>시작일</th><th>종료일</th><th>일수</th>';
    html += '</tr></thead><tbody>';

    let totalDays = 0;
    periods.forEach(period => {
        const isGyeongjosa = period.vacationType && period.vacationType.includes('경조사');
        const rowClass = isGyeongjosa ? 'gyeongjosa-row' : '';

        html += `<tr class="${rowClass}">`;
        html += `<td>${period.vacationType || '-'}</td>`;
        html += `<td>${formatDate(period.startDate)}</td>`;
        html += `<td>${formatDate(period.endDate)}</td>`;
        html += `<td>${period.days || 0}일</td>`;
        html += '</tr>';

        if (!isGyeongjosa) {
            totalDays += parseFloat(period.days || 0);
        }
    });

    html += '</tbody><tfoot><tr>';
    html += `<td colspan="3" style="text-align: right; font-weight: bold;">총 연차 사용</td>`;
    html += `<td style="font-weight: bold; color: #667eea;">${totalDays}일</td>`;
    html += '</tr></tfoot></table>';

    periodsList.innerHTML = html;
}

/**
 * 첨부파일 표시
 */
function displayAttachments(attachments) {
    const attachmentsList = document.getElementById('attachmentsList');

    if (!attachments || attachments.length === 0) {
        attachmentsList.innerHTML = '<p style="color: #999;">첨부파일이 없습니다.</p>';
        return;
    }

    let html = '<ul class="attachment-list">';
    attachments.forEach(file => {
        html += `
            <li class="attachment-item">
                <i class="fas fa-file-pdf"></i>
                <a href="/api/vacation/download/${file.idx}" target="_blank">
                    ${file.originalFileName || '연차신청서.pdf'}
                </a>
                <span class="file-size">${formatFileSize(file.fileSize)}</span>
            </li>
        `;
    });
    html += '</ul>';

    attachmentsList.innerHTML = html;
}

/**
 * 문서 삭제
 */
async function deleteDocument(documentIdx) {
    const confirmed = await showDeleteConfirm('이 연차신청서를 삭제하시겠습니까?', '삭제된 문서는 복구할 수 없습니다.');
    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/vacation/delete?documentIdx=${documentIdx}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '삭제 처리 실패');
        }

        await showSuccess('연차신청서가 삭제되었습니다.');
        window.location.href = '/approval';
    } catch (error) {
        console.error('삭제 오류:', error);
        showError('삭제 처리 중 오류가 발생했습니다: ' + error.message);
    }
}

// ========================================
// 유틸리티 함수
// ========================================

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getApprovalStatusClass(status) {
    switch (status) {
        case 'APPROVED': return 'approved';
        case 'REJECTED': return 'rejected';
        case 'PENDING': return 'pending';
        default: return '';
    }
}

function getApprovalStatusText(status) {
    switch (status) {
        case 'APPROVED': return '승인';
        case 'REJECTED': return '반려';
        case 'PENDING': return '대기';
        default: return '-';
    }
}
