// 연차신청서 상세보기 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // URL에서 문서 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const documentIdx = urlParams.get('documentIdx');

    if (!documentIdx) {
        showError('주소가 올바르지 않아 문서를 열 수 없습니다.<br>목록에서 다시 선택해 주세요.', '문서를 열 수 없습니다');
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

        // 전자서명 현황 로드 + 결재라인 렌더 (공통 모듈)
        if (window.SignatureRender) SignatureRender.load(documentIdx);

        // 로딩 오버레이 숨김
        window.hidePageLoadingOverlay();
    } catch (error) {
        console.error('[불러오기 실패] 연차 신청서 상세', error);
        showLoadFailure('연차 신청서');
        window.hidePageLoadingOverlay();
        // history.back() 대신 목록 페이지로 이동하여 무한 루프 방지
        setTimeout(() => {
            window.location.href = '/approval';
        }, 1500);
    }
}

/**
 * 공식문서 양식에 데이터 바인딩
 */
function displayDocumentInfo(data) {
    // 공식문서 필드 바인딩
    setText('address', data.drafterAddress);
    setText('birthDate', data.drafterBirthDate);
    setText('phone', data.drafterPhone);
    setText('department', data.drafterDept);
    setText('position', data.drafterPosition);
    setText('applicantName', data.drafterName);
    setText('reason', data.reason || '사유 없음');
    setText('applicantNameFooter', data.drafterNameSpaced || data.drafterName || '-');

    // 신청일 포맷
    if (data.applyDate) {
        const d = new Date(data.applyDate);
        setText('applyDateText', `${d.getFullYear()}년 ${String(d.getMonth()+1).padStart(2,'0')}월 ${String(d.getDate()).padStart(2,'0')}일`);
    }

    // 결재라인 이름 바인딩 (role 기반)
    if (data.approvers && data.approvers.length > 0) {
        data.approvers.forEach(a => {
            if (!a.role) return;
            document.querySelectorAll(`.approver-name[data-role="${a.role}"]`).forEach(el => {
                el.textContent = a.name || '-';
            });
        });
    }

    // 상태 배너 표시 (C05 코드 기반)
    showDocumentStatusBanner(data.statusCode);

    // 인쇄 버튼 — 서명완료(C0508) 또는 승인(C0504) 시에만 활성
    const printBtn = document.getElementById('printDocBtn');
    if (printBtn) {
        const printableStatuses = ['C0508', 'C0504'];
        if (printableStatuses.includes(data.statusCode)) {
            printBtn.style.display = '';
            printBtn.addEventListener('click', () => window.print());
        } else {
            printBtn.style.display = '';
            printBtn.disabled = true;
            printBtn.style.opacity = '0.5';
            printBtn.style.cursor = 'not-allowed';
            printBtn.dataset.tip = '전자서명이 모두 완료된 후 인쇄할 수 있습니다.';
        }
    }

    // 삭제 버튼 조건 — 승인(C0504) 또는 반려(C0505)된 문서는 삭제 불가
    const currentUserIdx = window.CURRENT_USER ? window.CURRENT_USER.idx : null;
    const isAdmin = window.CURRENT_USER && ['C1101', 'C1102'].includes(window.CURRENT_USER.userRoleCode);
    const documentUserIdx = data.drafterUserIdx || data.userIdx;
    const isOwner = documentUserIdx && currentUserIdx && Number(documentUserIdx) === Number(currentUserIdx);
    const isDeleted = data.deletedAt != null;
    const isApprovedOrRejected = data.statusCode === 'C0504' || data.statusCode === 'C0505';

    if ((isOwner || isAdmin) && !isDeleted) {
        createDeleteButton(data.documentIdx, data.periods || [], data.statusCode || 'C0501');
    }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '-';
}

/**
 * 문서 상태 배너 표시 (C05 코드 기반)
 */
const STATUS_BANNER_MAP = {
    C0501: { cls: 'pending',  icon: 'fa-pen',            text: '작성완료 · 전자서명을 진행해주세요.' },
    C0506: { cls: 'pending',  icon: 'fa-signature',      text: '서명대기 · 전자서명이 요청되었습니다. 서명을 진행해주세요.' },
    C0507: { cls: 'pending',  icon: 'fa-pen-nib',        text: '서명진행중 · 일부 서명이 완료되었습니다.' },
    C0508: { cls: 'approved', icon: 'fa-file-signature', text: '서명완료 · 인쇄 후 대표이사 서면 결재를 받아주세요.' },
    C0504: { cls: 'approved', icon: 'fa-check-circle',   text: '승인 완료 · 관리자에 의해 승인된 문서입니다.' },
    C0505: { cls: 'rejected', icon: 'fa-times-circle',   text: '반려 · 관리자에 의해 반려된 문서입니다.' },
};

function showDocumentStatusBanner(statusCode) {
    const writeContainer = document.querySelector('.write-container');
    const editorArea = document.querySelector('.editor-area');
    if (!writeContainer || !editorArea) return;

    const info = STATUS_BANNER_MAP[statusCode];
    if (!info) return;

    const banner = document.createElement('div');
    banner.className = `approval-status-banner ${info.cls}`;
    banner.innerHTML = `<i class="fas ${info.icon}"></i><span>${info.text}</span>`;
    writeContainer.insertBefore(banner, editorArea);

    if (statusCode === 'C0504') editorArea.classList.add('approved-document');
}

/**
 * 삭제 버튼 동적 생성
 */
function createDeleteButton(documentIdx, periods, statusCode) {
    const headerButtons = document.getElementById('headerButtons');
    if (headerButtons && !document.getElementById('deleteBtn')) {
        const deleteBtn = document.createElement('button');
        deleteBtn.id = 'deleteBtn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> 삭제';

        const isVacationExpired = checkIfVacationExpired(periods);
        const isAdmin = window.CURRENT_USER && ['C1101', 'C1102'].includes(window.CURRENT_USER.userRoleCode);

        // 서명 진행중(C0507)/완료(C0508)/승인/반려 → 삭제 불가
        // C0506(서명대기)은 아직 아무도 서명 안 한 상태이므로 삭제 가능
        const signingCodes = ['C0507', 'C0508'];
        const finalCodes = ['C0504', 'C0505'];
        const isSigning = signingCodes.includes(statusCode);
        const isFinal = finalCodes.includes(statusCode);

        if (!isAdmin && isFinal) {
            disableDeleteBtn(deleteBtn, '승인/반려 처리된 문서는 삭제할 수 없습니다.\n관리부에 문의해주세요.');
        } else if (!isAdmin && isSigning) {
            disableDeleteBtn(deleteBtn, '전자서명이 진행된 문서는 삭제할 수 없습니다.\n삭제가 필요하면 관리부에 문의해주세요.');
        } else if (isVacationExpired && !isAdmin) {
            disableDeleteBtn(deleteBtn, '휴가 날짜가 지난 경우 삭제할 수 없습니다.\n관리부에 문의해주세요.');
        } else {
            deleteBtn.className = 'btn-danger';
            deleteBtn.addEventListener('click', () => deleteDocument(documentIdx));

            if (isAdmin && (isSigning || isFinal)) {
                deleteBtn.dataset.tip = '관리자 권한으로 삭제합니다.';
            } else if (isAdmin && isVacationExpired) {
                deleteBtn.dataset.tip = '관리자 권한으로 삭제가 가능합니다.';
            } else {
                deleteBtn.dataset.tip = '문서를 삭제하고 새로 작성할 수 있습니다.';
            }
        }

        headerButtons.insertBefore(deleteBtn, headerButtons.firstChild);
    }
}

function disableDeleteBtn(btn, tipText) {
    btn.className = 'btn-danger disabled';
    btn.disabled = true;
    btn.style.cursor = 'not-allowed';
    btn.style.opacity = '0.5';
    btn.style.backgroundColor = '#999';
    btn.style.borderColor = '#999';
    btn.dataset.tip = tipText;
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
    const displayEl = document.getElementById('vacationPeriodDisplay');
    if (!displayEl) return;

    if (!periods || periods.length === 0) {
        displayEl.innerHTML = '<p style="color: #999;">연차 기간 정보가 없습니다.</p>';
        return;
    }

    const dowKor = ['일', '월', '화', '수', '목', '금', '토'];
    let totalDays = 0;
    let html = '';

    periods.forEach(period => {
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);
        const days = parseFloat(period.days || 0);
        totalDays += days;

        const startStr = `${start.getFullYear()}년 ${String(start.getMonth()+1).padStart(2,'0')}월 ${String(start.getDate()).padStart(2,'0')}일 (${dowKor[start.getDay()]})`;
        const endStr = `${end.getFullYear()}년 ${String(end.getMonth()+1).padStart(2,'0')}월 ${String(end.getDate()).padStart(2,'0')}일 (${dowKor[end.getDay()]})`;
        const isSingle = period.startDate === period.endDate;

        let typeName = '연차';
        if (period.vacationType && period.vacationType.includes('반차(오전)')) typeName = '오전반차';
        else if (period.vacationType && period.vacationType.includes('반차(오후)')) typeName = '오후반차';
        else if (period.vacationType) typeName = period.vacationType;

        const dateDisplay = isSingle ? startStr : `${startStr} ~ ${endStr}`;
        html += `<div class="vacation-period-line">${dateDisplay} ${typeName} ${days}일</div>`;
    });

    const daysText = totalDays === Math.floor(totalDays) ? Math.floor(totalDays) : totalDays;
    html += `<div class="vacation-period-total">총 연차 ${daysText}일</div>`;
    displayEl.innerHTML = html;
}

/**
 * 첨부파일 표시 (레거시 PDF가 있는 경우에만)
 */
function displayAttachments(attachments) {
    if (!attachments || attachments.length === 0) return;

    const section = document.getElementById('attachmentsSection');
    const list = document.getElementById('attachmentsList');
    if (!section || !list) return;

    section.style.display = '';
    let html = '<ul class="attachment-list">';
    attachments.forEach(file => {
        html += `<li class="attachment-item">
            <i class="fas fa-file-pdf"></i>
            <a href="/api/vacation/download/${file.idx}" target="_blank">
                ${file.originalFileName || '연차신청서.pdf'}
            </a>
            <span class="file-size">${formatFileSize(file.fileSize)}</span>
        </li>`;
    });
    html += '</ul>';
    list.innerHTML = html;
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
        const isAdmin = window.CURRENT_USER && ['C1101', 'C1102'].includes(window.CURRENT_USER.userRoleCode);
        const url = isAdmin
            ? `/api/vacation/admin/documents/${documentIdx}`
            : `/api/vacation/delete?documentIdx=${documentIdx}`;

        const response = await fetch(url, {
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
        console.error('[삭제 실패] 연차 신청서', error);
        showDeleteFailure('연차 신청서');
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


