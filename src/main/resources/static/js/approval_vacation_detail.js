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
        history.back();
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
    console.log('[삭제 버튼 표시 조건 확인]');
    console.log('- 현재 로그인 사용자 idx:', currentUserIdx);
    console.log('- 문서 작성자 idx (drafterUserIdx):', data.drafterUserIdx);
    console.log('- 문서 작성자 idx (userIdx):', data.userIdx);
    console.log('- window.CURRENT_USER:', window.CURRENT_USER);

    // drafterUserIdx 또는 userIdx 둘 다 확인 (API 응답 구조에 따라 다를 수 있음)
    const documentUserIdx = data.drafterUserIdx || data.userIdx;

    if (documentUserIdx && currentUserIdx && Number(documentUserIdx) === Number(currentUserIdx)) {
        console.log('✓ 작성자 본인이므로 삭제 버튼 생성');
        createDeleteButton(data.documentIdx);
    } else {
        console.log('✗ 작성자가 아니므로 삭제 버튼 미생성');
    }
}

/**
 * 삭제 버튼 동적 생성
 */
function createDeleteButton(documentIdx) {
    const headerButtons = document.getElementById('headerButtons');
    if (headerButtons && !document.getElementById('deleteBtn')) {
        const deleteWrapper = document.createElement('div');
        deleteWrapper.className = 'button-with-tooltip';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-danger';
        deleteBtn.id = 'deleteBtn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> 삭제';
        deleteBtn.addEventListener('click', () => deleteDocument(documentIdx));

        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip-text';
        tooltip.innerHTML = `
            <i class="fas fa-info-circle"></i>
            연차신청서는 PDF로 자동 생성되므로 수정이 불가능합니다.<br>
            문서를 삭제하고 새로 작성해주세요.
        `;

        deleteWrapper.appendChild(deleteBtn);
        deleteWrapper.appendChild(tooltip);

        // 돌아가기 버튼 앞에 삽입
        headerButtons.insertBefore(deleteWrapper, headerButtons.firstChild);
        console.log('작성자이므로 삭제 버튼을 생성합니다.');
    }
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
