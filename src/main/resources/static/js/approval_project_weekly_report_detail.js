// 프로젝트 주간업무보고 상세 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // URL에서 문서 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const documentIdx = urlParams.get('documentIdx');

    if (!documentIdx) {
        showError('주소가 올바르지 않아 보고서를 열 수 없습니다.<br>목록에서 다시 선택해 주세요.', '보고서를 열 수 없습니다');
        history.back();
        return;
    }

    // 전역 변수 CURRENT_USER 사용 (layout.html에서 주입됨)
    if (!window.CURRENT_USER || !window.CURRENT_USER.idx) {
        console.warn('세션 정보가 없습니다.');
        window.location.href = '/login';
        return;
    }

    const currentUserIdx = window.CURRENT_USER.idx;
    console.log('현재 로그인 사용자 idx:', currentUserIdx);

    // 보고서 데이터 로드
    window.showPageLoadingOverlay();
    loadReportData(documentIdx);

    // 삭제 버튼 이벤트
    const deleteReportBtn = document.getElementById('deleteReportBtn');
    if (deleteReportBtn) {
        deleteReportBtn.addEventListener('click', function() {
            deleteReport(documentIdx);
        });
    }
});

// 보고서 데이터 로드
async function loadReportData(documentIdx) {
    try {
        const data = await window.fetchWithErrorHandling(`/api/document/weekly-report/by-document/${documentIdx}`);

        if (!data) {
            // Error already handled by fetchWithErrorHandling (404, 403, 500)
            return;
        }

        console.log('보고서 데이터:', data);

        // 데이터 화면에 표시
        displayReportData(data, documentIdx);

        // 전자서명 현황 로드
        if (window.SignatureRender) SignatureRender.load(documentIdx);

        // 로딩 오버레이 숨김
        window.hidePageLoadingOverlay();
    } catch (error) {
        console.error('[불러오기 실패] 프로젝트 주간 보고서 상세', error);
        showLoadFailure('프로젝트 주간 보고서');
        window.hidePageLoadingOverlay();
        // history.back() 대신 목록 페이지로 이동하여 무한 루프 방지
        setTimeout(() => {
            window.location.href = '/approval';
        }, 1500);
    }
}

// 보고서 데이터 화면에 표시
function displayReportData(data, documentIdx) {
    // 프로젝트명
    const projectNameEl = document.getElementById('projectName');
    if (projectNameEl) {
        projectNameEl.value = data.projectName || '-';
    }

    // 주간 달성률
    const weeklyAchievementRateEl = document.getElementById('weeklyAchievementRate');
    if (weeklyAchievementRateEl) {
        weeklyAchievementRateEl.value = data.weeklyAchievementRate !== null ? `${data.weeklyAchievementRate}%` : '0%';
    }

    // 보고자
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.value = data.userName || '-';
    }

    // 부서
    const userDeptEl = document.getElementById('userDept');
    if (userDeptEl) {
        userDeptEl.value = data.userDeptName || '-';
    }

    // 보고 기간 (요일 포함)
    const reportPeriodEl = document.getElementById('reportPeriod');
    if (reportPeriodEl) {
        reportPeriodEl.value = formatReportPeriodWithDay(data.reportPeriod);
    }

    // 금주 주요 업무
    const mainTasksEl = document.getElementById('mainTasks');
    if (mainTasksEl) {
        renderMainTasks(mainTasksEl, data.mainTasks);
    }

    // 주요 성과
    const achievementsEl = document.getElementById('achievements');
    if (achievementsEl) {
        achievementsEl.textContent = data.achievements || '-';
    }

    // 주요 이슈
    const issuesEl = document.getElementById('issues');
    if (issuesEl) {
        issuesEl.textContent = data.issues || '-';
    }

    // 차주 계획
    const nextWeekPlanEl = document.getElementById('nextWeekPlan');
    if (nextWeekPlanEl) {
        nextWeekPlanEl.textContent = data.nextWeekPlan || '-';
    }

    // 기타
    const remarksEl = document.getElementById('remarks');
    if (remarksEl) {
        remarksEl.textContent = data.remarks || '-';
    }

    // 프로젝트 멤버 여부 확인 후 수정/삭제 버튼 표시
    const currentUserIdx = window.CURRENT_USER ? window.CURRENT_USER.idx : null;

    if (currentUserIdx && data.projectIdx) {
        checkProjectMemberAndShowButtons(data.projectIdx, data.id, documentIdx, currentUserIdx);
    }

    // 첨부파일 로드
    if (data.documentIdx) {
        loadAttachedFiles(data.documentIdx);
    }
}

// 첨부파일 목록 로드
async function loadAttachedFiles(documentIdx) {
    if (!documentIdx) {
        console.log('documentIdx가 없어 파일을 로드하지 않습니다.');
        return;
    }

    try {
        const response = await fetch(`/api/files/document/${documentIdx}`);

        if (!response.ok) {
            console.error('파일 목록 조회 실패');
            return;
        }

        const files = await response.json();

        const attachedFileList = document.getElementById('attachedFileList');
        if (!attachedFileList) {
            return;
        }

        if (!files || files.length === 0) {
            attachedFileList.innerHTML = '<p style="color: #999; font-size: 13px;">첨부된 파일이 없습니다.</p>';
            return;
        }

        // 파일 목록 HTML 생성
        let filesHTML = '';
        files.forEach(file => {
            let icon = 'fa-file';
            const filename = file.originalFilename.toLowerCase();
            if (filename.match(/\.(jpg|jpeg|png|gif)$/i)) icon = 'fa-file-image';
            else if (filename.match(/\.(pdf)$/i)) icon = 'fa-file-pdf';
            else if (filename.match(/\.(doc|docx)$/i)) icon = 'fa-file-word';
            else if (filename.match(/\.(xls|xlsx)$/i)) icon = 'fa-file-excel';

            const fileSizeKB = (file.fileSize / 1024).toFixed(1);

            filesHTML += `
                <div class="file-item" data-file-idx="${file.idx}" data-filename="${file.originalFilename}">
                    <i class="fas ${icon}"></i>
                    <span>${file.originalFilename} (${fileSizeKB} KB)</span>
                    <button class="btn-download-file" onclick="event.stopPropagation(); downloadFile(${file.idx}, '${file.originalFilename}')">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            `;
        });

        attachedFileList.innerHTML = filesHTML;
        console.log(`${files.length}개의 파일을 표시했습니다.`);

        // 파일 항목 클릭 이벤트 추가
        attachedFileList.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', function() {
                const fileIdx = this.getAttribute('data-file-idx');
                const filename = this.getAttribute('data-filename');
                downloadFile(parseInt(fileIdx), filename);
            });
        });

    } catch (error) {
        console.error('파일 로드 오류:', error);
    }
}


// 파일 다운로드
async function downloadFile(fileIdx, originalFilename) {
    try {
        const response = await fetch(`/api/files/download/${fileIdx}`);

        if (!response.ok) {
            console.error('[내려받기 실패] 파일', response.status, response.statusText, originalFilename);
            if (response.status === 404) {
                showError(`파일을 찾을 수 없습니다.<br>파일 이름: <b>${originalFilename}</b><br>파일이 삭제되었거나 저장 위치가 변경되었을 수 있으니 관리자에게 문의해 주세요.`, '파일이 없습니다');
            } else {
                showDownloadFailure(originalFilename);
            }
            return;
        }

        // 파일 다운로드
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = originalFilename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (error) {
        console.error('[내려받기 실패] 파일', error, originalFilename);
        showDownloadFailure(originalFilename);
    }
}

// 프로젝트 멤버 여부 확인 후 수정/삭제 버튼 생성
async function checkProjectMemberAndShowButtons(projectIdx, reportId, documentIdx, currentUserIdx) {
    try {
        const response = await fetch(`/api/projects/${projectIdx}/members`);
        if (!response.ok) {
            console.warn('프로젝트 멤버 조회 실패:', response.status);
            return;
        }

        const members = await response.json();
        const isMember = members.some(m => Number(m.employeeIdx) === Number(currentUserIdx));

        if (!isMember) {
            console.log('프로젝트 멤버가 아니므로 수정/삭제 버튼을 표시하지 않습니다.');
            return;
        }

        const headerButtons = document.getElementById('headerButtons');
        if (!headerButtons) return;

        const backBtn = headerButtons.querySelector('button');

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-danger';
        deleteBtn.id = 'deleteReportBtn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> 삭제';
        deleteBtn.addEventListener('click', function() {
            deleteReport(documentIdx);
        });

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-primary';
        editBtn.id = 'editReportBtn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i> 수정';
        editBtn.addEventListener('click', function() {
            window.location.href = `/approval/project-weekly-report?id=${reportId}`;
        });

        headerButtons.insertBefore(deleteBtn, backBtn);
        headerButtons.insertBefore(editBtn, deleteBtn);
        console.log('프로젝트 멤버이므로 수정/삭제 버튼을 생성합니다.');
    } catch (error) {
        console.error('프로젝트 멤버 확인 오류:', error);
    }
}

// 보고서 삭제
async function deleteReport(documentIdx) {
    const confirmed = await showDeleteConfirm('이 보고서를 삭제하시겠습니까?');
    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/document/weekly-report/by-document/${documentIdx}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await showSuccess('보고서가 삭제되었습니다.');
            popupAwareRedirect('/project/documents');
        } else {
            throw new Error('DELETE_FAILED');
        }
    } catch (error) {
        console.error('[삭제 실패] 프로젝트 주간 보고서', error);
        showDeleteFailure('프로젝트 주간 보고서');
    }
}

// 날짜에 요일 추가 (예: 2024-01-01 → 2024-01-01 (월))
function formatDateWithDay(dateStr) {
    if (!dateStr) return '';

    try {
        const date = new Date(dateStr);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayOfWeek = days[date.getDay()];

        return `${dateStr} (${dayOfWeek})`;
    } catch (error) {
        return dateStr;
    }
}

// 돌아가기: iframe 안이면 부모에서 모달 닫기, 아니면 브라우저 뒤로가기
function goBack() {
    if (window.parent !== window && typeof window.parent.closeIframeModal === 'function') {
        window.parent.closeIframeModal();
    } else {
        history.back();
    }
}

// 금주 주요업무를 항목별 분리 박스로 렌더링
function renderMainTasks(container, value) {
    container.innerHTML = '';

    let items = [];
    if (value) {
        try {
            const arr = JSON.parse(value);
            if (Array.isArray(arr) && arr.length > 0) items = arr;
        } catch (e) {}
        if (items.length === 0) items = [value];
    }

    if (items.length === 0) {
        container.textContent = '-';
        return;
    }

    if (items.length === 1) {
        container.textContent = items[0];
        return;
    }

    items.forEach((text, i) => {
        const row = document.createElement('div');
        row.className = 'main-task-detail-item';
        row.innerHTML = `<span class="task-detail-number">${i + 1}</span><span class="task-detail-text">${escapeHtml(text)}</span>`;
        container.appendChild(row);
    });
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 보고 기간에 요일 추가 (예: 2024-01-01 ~ 2024-01-07 → 2024-01-01 (월) ~ 2024-01-07 (일))
function formatReportPeriodWithDay(reportPeriod) {
    if (!reportPeriod) return '-';

    try {
        // "2024-01-01 ~ 2024-01-07" 형식으로 들어온다고 가정
        const parts = reportPeriod.split('~').map(s => s.trim());

        if (parts.length === 2) {
            const startDate = formatDateWithDay(parts[0]);
            const endDate = formatDateWithDay(parts[1]);
            return `${startDate} ~ ${endDate}`;
        }

        return reportPeriod;
    } catch (error) {
        console.error('보고 기간 포맷 오류:', error);
        return reportPeriod;
    }
}
