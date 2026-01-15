// 연차신청서 상세보기 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // URL에서 문서 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const documentIdx = urlParams.get('documentIdx');

    if (!documentIdx) {
        alert('문서 ID가 없습니다.');
        history.back();
        return;
    }

    // 문서 상세 정보 로드
    loadDocumentDetail(documentIdx);

    // 삭제 버튼 이벤트 리스너
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteDocument(documentIdx));
    }
});

/**
 * 문서 상세 정보 로드
 */
async function loadDocumentDetail(documentIdx) {
    try {
        const response = await fetch(`/api/vacation/detail?documentIdx=${documentIdx}`);
        if (!response.ok) {
            throw new Error('문서 조회 실패');
        }

        const data = await response.json();
        console.log('문서 상세 데이터:', data);

        // 화면에 데이터 표시
        displayDocumentInfo(data);
        displayPeriods(data.periods || []);
        displayAttachments(data.attachments || []);
    } catch (error) {
        console.error('문서 조회 오류:', error);
        alert('문서를 불러오는데 실패했습니다.');
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
    if (!confirm('이 연차신청서를 삭제하시겠습니까?\n삭제된 문서는 복구할 수 없습니다.')) {
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

        alert('연차신청서가 삭제되었습니다.');
        window.location.href = '/approval';
    } catch (error) {
        console.error('삭제 오류:', error);
        alert('삭제 처리 중 오류가 발생했습니다: ' + error.message);
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
