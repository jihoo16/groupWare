// 프로젝트 주간업무보고 상세 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // URL에서 문서 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const documentIdx = urlParams.get('documentIdx');

    if (!documentIdx) {
        showError('문서 ID가 없습니다.');
        history.back();
        return;
    }

    // 보고서 데이터 로드
    loadReportData(documentIdx);

    // 수정 버튼 이벤트
    const editReportBtn = document.getElementById('editReportBtn');
    if (editReportBtn) {
        editReportBtn.addEventListener('click', function() {
            // 수정 페이지로 이동 (데이터를 query parameter로 전달)
            window.location.href = `/approval/project-weekly-report?documentIdx=${documentIdx}`;
        });
    }

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
        const response = await fetch(`/api/document/weekly-report/by-document/${documentIdx}`);

        if (!response.ok) {
            throw new Error('보고서를 불러올 수 없습니다.');
        }

        const data = await response.json();
        console.log('보고서 데이터:', data);

        // 데이터 화면에 표시
        displayReportData(data);

    } catch (error) {
        console.error('보고서 로드 오류:', error);
        showError('보고서를 불러오는 중 오류가 발생했습니다: ' + error.message);
        history.back();
    }
}

// 보고서 데이터 화면에 표시
function displayReportData(data) {
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
        mainTasksEl.textContent = data.mainTasks || '-';
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

    // 공식 PDF 로드
    if (data.documentIdx) {
        loadOfficialPdfs(data.documentIdx);
    }

    // 첨부파일 로드
    if (data.documentIdx) {
        loadAttachedFiles(data.documentIdx);
    }
}

// 공식 PDF 목록 로드
async function loadOfficialPdfs(documentIdx) {
    if (!documentIdx) {
        console.log('documentIdx가 없어 공식 PDF를 로드하지 않습니다.');
        return;
    }

    try {
        const response = await fetch(`/api/document/weekly-report/official-pdf/${documentIdx}`);

        if (!response.ok) {
            console.error('공식 PDF 목록 조회 실패');
            return;
        }

        const pdfFiles = await response.json();

        const officialPdfList = document.getElementById('officialPdfList');
        if (!officialPdfList) {
            return;
        }

        if (!pdfFiles || pdfFiles.length === 0) {
            officialPdfList.innerHTML = '<p style="color: #999; font-size: 13px;">생성된 공식 PDF가 없습니다.</p>';
            return;
        }

        // PDF 파일 목록 HTML 생성
        let pdfHTML = '';
        pdfFiles.forEach(pdf => {
            const fileSizeKB = (pdf.fileSize / 1024).toFixed(1);
            const createdAt = new Date(pdf.createdAt).toLocaleString('ko-KR');

            pdfHTML += `
                <div class="file-item">
                    <i class="fas fa-file-pdf" style="color: #e74c3c;"></i>
                    <span>${pdf.fileName} (${fileSizeKB} KB) - 생성일시: ${createdAt}</span>
                    <button class="btn-download-file" onclick="downloadOfficialPdf(${pdf.idx}, '${pdf.fileName}')">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            `;
        });

        officialPdfList.innerHTML = pdfHTML;
        console.log(`${pdfFiles.length}개의 공식 PDF를 표시했습니다.`);

    } catch (error) {
        console.error('공식 PDF 로드 오류:', error);
    }
}

// 공식 PDF 다운로드
async function downloadOfficialPdf(fileIdx, fileName) {
    try {
        const response = await fetch(`/api/document/weekly-report/download/${fileIdx}`);

        if (!response.ok) {
            if (response.status === 404) {
                showError(``❌ PDF 파일을 찾을 수 없습니다.\n\n파일: ${fileName}\n\n파일이 삭제되었거나 저장 위치가 변경되었을 수 있습니다.\n관리자에게 문의해주세요.`);
            } else {
                showError(``❌ PDF 다운로드 중 오류가 발생했습니다.\n\n파일: ${fileName}\n\n잠시 후 다시 시도해주세요.`);
            }
            console.error('PDF 다운로드 실패:', response.status, response.statusText);
            return;
        }

        // 파일 다운로드
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        console.log('공식 PDF 다운로드 성공:', fileName);

    } catch (error) {
        console.error('공식 PDF 다운로드 오류:', error);
        showError(``❌ PDF 다운로드 중 오류가 발생했습니다.\n\n파일: ${fileName}\n\n네트워크 연결을 확인하거나 관리자에게 문의해주세요.`);
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
                <div class="file-item">
                    <i class="fas ${icon}"></i>
                    <span>${file.originalFilename} (${fileSizeKB} KB)</span>
                    <button class="btn-download-file" onclick="downloadFile(${file.idx}, '${file.originalFilename}')">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            `;
        });

        attachedFileList.innerHTML = filesHTML;
        console.log(`${files.length}개의 파일을 표시했습니다.`);

    } catch (error) {
        console.error('파일 로드 오류:', error);
    }
}


// 파일 다운로드
async function downloadFile(fileIdx, originalFilename) {
    try {
        const response = await fetch(`/api/files/download/${fileIdx}`);

        if (!response.ok) {
            if (response.status === 404) {
                showError(``❌ 파일을 찾을 수 없습니다.\n\n파일: ${originalFilename}\n\n파일이 삭제되었거나 저장 위치가 변경되었을 수 있습니다.\n관리자에게 문의해주세요.`);
            } else {
                showError(``❌ 파일 다운로드 중 오류가 발생했습니다.\n\n파일: ${originalFilename}\n\n잠시 후 다시 시도해주세요.`);
            }
            console.error('파일 다운로드 실패:', response.status, response.statusText);
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
        console.error('파일 다운로드 오류:', error);
        showError(``❌ 파일 다운로드 중 오류가 발생했습니다.\n\n파일: ${originalFilename}\n\n네트워크 연결을 확인하거나 관리자에게 문의해주세요.`);
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
            window.location.href = '/project/documents';
        } else {
            throw new Error('삭제 실패');
        }
    } catch (error) {
        console.error('삭제 오류:', error);
        showError('보고서 삭제 중 오류가 발생했습니다.');
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
