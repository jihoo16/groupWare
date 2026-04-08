document.addEventListener('DOMContentLoaded', async function () {

    // ── 헬퍼 함수 (최상단 정의 — 이후 어디서든 호출 가능) ────────
    function pad(n) { return String(n).padStart(2, '0'); }

    function formatAmount(amount) {
        if (amount == null) return '₩ 0';
        return '₩ ' + Number(amount).toLocaleString();
    }

    function formatDateForDisplay(dateStr) {
        if (!dateStr) return '-';
        const parts = dateStr.split('-');
        if (parts.length < 3) return dateStr;
        return `${parts[1]}/${parts[2]}`;
    }

    const KOR_UNITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    const KOR_TENS  = ['', '십', '백', '천'];
    const KOR_MEGA  = ['', '만', '억', '조'];

    function chunkToKorean(n) {
        let result = '';
        for (let i = 3; i >= 0; i--) {
            const digit = Math.floor(n / Math.pow(10, i)) % 10;
            if (digit > 0) result += KOR_UNITS[digit] + KOR_TENS[i];
        }
        return result;
    }

    function toKoreanAmount(num) {
        if (!num || num === 0) return '영';
        let result = '';
        let megaIdx = 0;
        while (num > 0) {
            const chunk = num % 10000;
            if (chunk > 0) result = chunkToKorean(chunk) + KOR_MEGA[megaIdx] + result;
            num = Math.floor(num / 10000);
            megaIdx++;
        }
        return result;
    }

    // ── URL 파라미터 ─────────────────────────────────────────────
    const params = new URLSearchParams(window.location.search);
    const idx = params.get('idx');

    if (!idx) {
        Swal.fire({ icon: 'error', title: '오류', text: '문서 정보가 없습니다.' })
            .then(() => history.back());
        return;
    }

    // ── DOM 참조 ──────────────────────────────────────────────────
    const toggleBtn   = document.getElementById('documentFormToggle');
    const formWrapper = document.querySelector('.document-form-wrapper');
    const printBtn    = document.getElementById('printBtn');
    const editBtn     = document.getElementById('editBtn');
    const deleteBtn   = document.getElementById('deleteBtn');

    // ── 미리보기 토글 (write 폼과 동일) ──────────────────────────
    if (toggleBtn && formWrapper) {
        toggleBtn.addEventListener('click', function () {
            formWrapper.classList.toggle('collapsed');
            this.classList.toggle('active');
        });
    }

    // ── 데이터 로드 ───────────────────────────────────────────────
    let doc = null;
    try {
        const res = await fetch(`/api/approval/expense/${idx}`);
        if (res.status === 401) { window.location.href = '/login'; return; }
        if (res.status === 403) {
            window.location.href = '/error/403';
            return;
        }
        if (res.status === 404) {
            Swal.fire({ icon: 'error', title: '없는 문서', text: '삭제되었거나 존재하지 않는 문서입니다.' })
                .then(() => history.back());
            return;
        }
        if (!res.ok) throw new Error('서버 오류');
        doc = await res.json();
    } catch (e) {
        Swal.fire({ icon: 'error', title: '오류', text: '문서를 불러오는 데 실패했습니다.' })
            .then(() => history.back());
        return;
    }

    // ── 정산상태 + 편집가능 여부 ───────────────────────────────────
    // 작성중(C1001), 반려(C1004)만 편집 가능 — 나머지(제출완료/제출확인/정산완료)는 읽기 전용.
    // 아래 렌더링/업로드/버튼 로직이 모두 isReadOnly를 참조하므로 doc 로드 직후에 선언해야 한다.
    const stCode = doc.settlementStatus || 'C1001';
    const isReadOnly = (stCode !== 'C1001' && stCode !== 'C1004');

    // ── 작성자 정보 로드 ──────────────────────────────────────────
    let drafter = null;
    try {
        const res = await fetch(`/api/users/${doc.userIdx}`);
        if (res.ok) drafter = await res.json();
    } catch (_) {}

    // ── 기본 정보 세팅 ────────────────────────────────────────────
    const draftDate  = doc.createdAt ? new Date(doc.createdAt) : null;
    const dateStr    = draftDate
        ? `${draftDate.getFullYear()}.${pad(draftDate.getMonth() + 1)}.${pad(draftDate.getDate())}`
        : '-';
    const deptName   = drafter ? (drafter.empDeptName || drafter.empDept || '-') : '-';
    const drafterName = drafter ? (drafter.empName || '-') : '-';

    document.getElementById('detailDept').textContent = deptName;
    document.getElementById('detailName').textContent = drafterName;
    document.getElementById('detailDate').textContent = dateStr;

    // ── 지출 내역 정렬 ────────────────────────────────────────────
    const details = (doc.expenseDetails || []).sort(
        (a, b) => new Date(a.expenseDate) - new Date(b.expenseDate)
    );
    const total = doc.totalAmount || 0;

    // ── 상단 지출 내역 테이블 렌더링 ──────────────────────────────
    const tbody = document.getElementById('detailTableBody');
    if (details.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-row">지출 내역이 없습니다</td></tr>';
    } else {
        tbody.innerHTML = details.map(d => {
            const attCount = (d.attachments || []).length;
            const receiptCell = attCount > 0
                ? `<button class="btn-view-receipt" data-detail-idx="${d.idx}">
                     <i class="fas fa-receipt"></i> ${attCount}건
                   </button>`
                : `<button class="btn-upload-receipt" data-detail-idx="${d.idx}">
                     <i class="fas fa-cloud-upload-alt"></i> 첨부
                   </button>`;
            return `
                <tr>
                    <td>${d.expenseDate || '-'}</td>
                    <td>${d.description || '-'}</td>
                    <td>${d.shopName || '-'}</td>
                    <td>${d.paymentMethod || '-'}</td>
                    <td style="text-align:right;">${formatAmount(d.amount)}</td>
                    <td>${d.note || ''}</td>
                    <td class="receipt-cell">${receiptCell}</td>
                </tr>
            `;
        }).join('');
    }
    document.getElementById('detailTotalAmount').textContent = '₩ ' + total.toLocaleString();

    // ── 공식 문서 미리보기 렌더링 ─────────────────────────────────
    let cashTotal = 0;
    let cardTotal = 0;

    // 헤더 정보
    document.getElementById('previewDate').textContent = dateStr;
    document.getElementById('previewDept').textContent = deptName;
    document.getElementById('previewName').textContent = drafterName;

    // 합계 금액 (한글 + 숫자)
    document.getElementById('previewAmountKorean').textContent = '일금 ' + toKoreanAmount(total) + '원정';
    document.getElementById('previewAmountNumber').textContent = '(₩ ' + total.toLocaleString() + ')';
    document.getElementById('previewTotal').textContent = '₩ ' + total.toLocaleString();

    // 지출 내역 행
    const previewBody = document.getElementById('previewExpenseBody');
    if (details.length === 0) {
        previewBody.innerHTML = '<tr><td class="empty-row" colspan="6">지출 내역이 없습니다</td></tr>';
    } else {
        previewBody.innerHTML = details.map(d => {
            const amount = d.amount || 0;
            if (d.paymentMethod === '현금') cashTotal += amount;
            else cardTotal += amount;
            return `
                <tr>
                    <td>${formatDateForDisplay(d.expenseDate)}</td>
                    <td>${d.description || '-'}</td>
                    <td>${d.shopName || '-'}</td>
                    <td>${d.paymentMethod || '-'}</td>
                    <td style="text-align:right;">${formatAmount(amount)}</td>
                    <td>${d.note || ''}</td>
                </tr>
            `;
        }).join('');
    }

    // 현금 / 카드 합계
    document.getElementById('previewCash').textContent = '₩ ' + cashTotal.toLocaleString();
    document.getElementById('previewCard').textContent = '₩ ' + cardTotal.toLocaleString();

    // 항목 수에 따라 공식 문서 내역 테이블 font 크기 자동 조절
    const previewTable = document.getElementById('previewExpenseTable');
    if (previewTable) {
        const count = details.length;
        previewTable.classList.remove('items-compact', 'items-tight', 'items-mini');
        if (count >= 31) previewTable.classList.add('items-mini');
        else if (count >= 23) previewTable.classList.add('items-tight');
        else if (count >= 16) previewTable.classList.add('items-compact');
    }

    // ── 첨부파일 렌더링 ───────────────────────────────────────────
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    function getFileIcon(name) {
        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return 'fa-file-image';
        if (/\.pdf$/i.test(name)) return 'fa-file-pdf';
        return 'fa-file';
    }

    /** 서버에서 받아온 첨부파일 목록 중 문서 전체 첨부(DOCUMENT, RECEIPT)를 하단에 렌더링 */
    function renderServerAttachments(attachments) {
        const signedList = document.getElementById('signedDocFileList');
        if (!signedList) return;
        signedList.innerHTML = '';

        (attachments || []).forEach(att => {
            // ITEM_RECEIPT는 항목별 테이블에서 표시하므로 제외
            if (att.attachmentType === 'ITEM_RECEIPT') return;

            const item = document.createElement('div');
            item.className = 'file-item';
            item.dataset.attachmentIdx = att.idx;
            item.innerHTML = `
                <i class="fas ${getFileIcon(att.originalFilename)}"></i>
                <span>${att.originalFilename} <small style="color:#94a3b8;">(${(att.fileSize / 1024).toFixed(1)} KB)</small></span>
                <button type="button" class="btn-download-file" data-tip="다운로드"><i class="fas fa-download"></i></button>
                ${isReadOnly ? '' : '<button type="button" class="btn-remove-file" data-tip="삭제"><i class="fas fa-times"></i></button>'}
            `;

            item.querySelector('.btn-download-file').addEventListener('click', () => {
                window.location.href = `/api/approval/expense/attachments/${att.idx}/download`;
            });

            item.querySelector('.btn-remove-file').addEventListener('click', async () => {
                const result = await Swal.fire({
                    title: '첨부파일을 삭제하시겠습니까?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: '삭제',
                    cancelButtonText: '취소',
                    confirmButtonColor: '#d33'
                });
                if (!result.isConfirmed) return;

                try {
                    const res = await fetch(`/api/approval/expense/attachments/${att.idx}`, { method: 'DELETE' });
                    if (res.ok) {
                        item.remove();
                    } else {
                        Swal.fire({ icon: 'error', title: '삭제 실패', text: '잠시 후 다시 시도해 주세요.' });
                    }
                } catch (_) {
                    Swal.fire({ icon: 'error', title: '삭제 실패', text: '잠시 후 다시 시도해 주세요.' });
                }
            });

            signedList.appendChild(item);
        });
    }

    renderServerAttachments(doc.attachments);

    // ── 항목별 영수증 버튼 이벤트 ─────────────────────────────────
    let currentUploadDetailIdx = null;
    const hiddenInput = document.getElementById('itemReceiptHiddenInput');

    // 영수증 보기 버튼 (이미 첨부된 항목)
    document.querySelectorAll('.btn-view-receipt').forEach(btn => {
        btn.addEventListener('click', function() {
            const detailIdx = this.dataset.detailIdx;
            const detail = details.find(d => String(d.idx) === detailIdx);
            if (!detail || !detail.attachments || detail.attachments.length === 0) return;

            let listHtml = '<div style="text-align:left;">';
            detail.attachments.forEach(att => {
                listHtml += `
                    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;">
                        <i class="fas ${getFileIcon(att.originalFilename)}" style="color:#667eea;"></i>
                        <span style="flex:1;font-size:13px;">${att.originalFilename}</span>
                        <a href="/api/approval/expense/attachments/${att.idx}/download" style="color:#667eea;font-size:12px;"><i class="fas fa-download"></i></a>
                        ${isReadOnly ? '' : `<button class="swal-delete-att" data-att-idx="${att.idx}" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;"><i class="fas fa-trash"></i></button>`}
                    </div>
                `;
            });
            listHtml += '</div>';

            Swal.fire({
                title: '항목 영수증',
                html: listHtml,
                showConfirmButton: false,
                showCloseButton: true,
                didOpen: () => {
                    document.querySelectorAll('.swal-delete-att').forEach(delBtn => {
                        delBtn.addEventListener('click', async function() {
                            const attIdx = this.dataset.attIdx;
                            const confirmResult = await Swal.fire({
                                title: '삭제하시겠습니까?',
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonText: '삭제',
                                cancelButtonText: '취소',
                                confirmButtonColor: '#d33'
                            });
                            if (!confirmResult.isConfirmed) return;
                            try {
                                const res = await fetch(`/api/approval/expense/attachments/${attIdx}`, { method: 'DELETE' });
                                if (res.ok) {
                                    Swal.fire({ icon: 'success', title: '삭제 완료', timer: 1000, showConfirmButton: false })
                                        .then(() => location.reload());
                                }
                            } catch (_) {
                                Swal.fire({ icon: 'error', title: '삭제 실패' });
                            }
                        });
                    });
                }
            });
        });
    });

    // 영수증 첨부 버튼 (아직 없는 항목)
    document.querySelectorAll('.btn-upload-receipt').forEach(btn => {
        if (isReadOnly) {
            btn.style.display = 'none';
        } else {
            btn.addEventListener('click', function() {
                currentUploadDetailIdx = this.dataset.detailIdx;
                hiddenInput.click();
            });
        }
    });

    // 영수증 보기 버튼에서도 추가 업로드 가능하도록 (더블클릭 또는 우클릭 대신 보기 팝업에서 처리)

    if (hiddenInput) {
        hiddenInput.addEventListener('change', async function() {
            if (!currentUploadDetailIdx || this.files.length === 0) return;

            const validFiles = Array.from(this.files).filter(f => {
                if (f.size > MAX_FILE_SIZE) {
                    Swal.fire({ icon: 'warning', title: '파일 크기 초과', text: `50MB를 초과합니다: ${f.name}` });
                    return false;
                }
                return true;
            });

            if (validFiles.length === 0) { this.value = ''; return; }

            const formData = new FormData();
            validFiles.forEach(f => formData.append('files', f));

            try {
                const res = await fetch(`/api/approval/expense/detail/${currentUploadDetailIdx}/attachments`, {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    Swal.fire({ icon: 'success', title: '업로드 완료', timer: 1000, showConfirmButton: false })
                        .then(() => location.reload());
                } else {
                    Swal.fire({ icon: 'error', title: '업로드 실패', text: '잠시 후 다시 시도해 주세요.' });
                }
            } catch (_) {
                Swal.fire({ icon: 'error', title: '업로드 실패', text: '파일 업로드 중 오류가 발생했습니다.' });
            }

            this.value = '';
            currentUploadDetailIdx = null;
        });
    }

    /** 새 파일을 서버에 업로드하고 목록에 추가 */
    async function uploadFiles(files, attachmentType) {
        const formData = new FormData();
        files.forEach(f => {
            formData.append(attachmentType === 'DOCUMENT' ? 'signedDocFiles' : 'receiptFiles', f);
        });

        try {
            const res = await fetch(`/api/approval/expense/${idx}/attachments`, {
                method: 'POST',
                body: formData
            });
            if (!res.ok) throw new Error();
            const updatedAttachments = await res.json();
            renderServerAttachments(updatedAttachments);
        } catch (_) {
            Swal.fire({ icon: 'error', title: '업로드 실패', text: '파일 업로드 중 오류가 발생했습니다.' });
        }
    }

    function setupUpload(inputId, areaId, attachmentType) {
        const inputEl = document.getElementById(inputId);
        const areaEl  = document.getElementById(areaId);
        if (!inputEl || !areaEl) return;

        function handleFiles(fileList) {
            const valid = Array.from(fileList).filter(f => {
                if (f.size > MAX_FILE_SIZE) {
                    Swal.fire({ icon: 'warning', title: '파일 크기 초과', text: `50MB를 초과합니다: ${f.name}` });
                    return false;
                }
                return true;
            });
            if (valid.length > 0) uploadFiles(valid, attachmentType);
        }

        inputEl.addEventListener('change', function () {
            handleFiles(this.files);
            this.value = '';
        });

        areaEl.addEventListener('dragover', function (e) {
            e.preventDefault();
            this.style.borderColor = '#667eea';
            this.style.background  = '#f5f7ff';
        });

        areaEl.addEventListener('dragleave', function (e) {
            if (!this.contains(e.relatedTarget)) {
                this.style.borderColor = '';
                this.style.background  = '';
            }
        });

        areaEl.addEventListener('drop', function (e) {
            e.preventDefault();
            this.style.borderColor = '';
            this.style.background  = '';
            handleFiles(e.dataTransfer.files);
        });
    }

    if (!isReadOnly) {
        setupUpload('signedDocInput', 'signedDocUploadArea', 'DOCUMENT');
    } else {
        // 읽기 전용: 업로드 영역 숨김
        const uploadArea = document.getElementById('signedDocUploadArea');
        if (uploadArea) uploadArea.style.display = 'none';
    }

    // ── 영수증/공식문서 첨부 현황 계산 ──────────────────────────────
    const totalItems = details.length;
    const itemsWithReceipt = details.filter(d => (d.attachments || []).length > 0).length;
    const hasOfficialDoc = (doc.attachments || []).some(a => a.attachmentType === 'DOCUMENT');
    const allReceiptsComplete = totalItems > 0 && itemsWithReceipt >= totalItems;
    const canPrint = allReceiptsComplete;

    // ── 영수증 현황 배너 ─────────────────────────────────────────
    const banner = document.getElementById('receiptStatusBanner');
    if (banner && totalItems > 0) {
        banner.style.display = '';
        if (canPrint) {
            banner.className = 'receipt-status-banner status-complete';
            banner.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>영수증 ${itemsWithReceipt}/${totalItems}건 첨부 완료 — 인쇄할 수 있습니다</span>`;
        } else {
            banner.className = 'receipt-status-banner status-incomplete';
            banner.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span>영수증 ${totalItems - itemsWithReceipt}건 미첨부 — 모든 항목에 영수증을 첨부해야 인쇄할 수 있습니다</span>`;
        }
    }

    // ── 정산상태 배너 ──────────────────────────────────────────────
    const settlementBanner = document.getElementById('settlementStatusBanner');
    if (settlementBanner) {
        const stName = doc.settlementStatusName || '작성중';
        const stComment = doc.settlementComment || '';
        const stStyles = {
            C1001: { cls: 'st-banner-drafting',      icon: 'fas fa-pen' },
            C1002: { cls: 'st-banner-submitted',     icon: 'fas fa-paper-plane' },
            C1003: { cls: 'st-banner-confirmed',     icon: 'fas fa-check-circle' },
            C1004: { cls: 'st-banner-rejected',  icon: 'fas fa-exclamation-circle' },
            C1005: { cls: 'st-banner-settled',        icon: 'fas fa-coins' },
        };
        const style = stStyles[stCode] || stStyles['C1001'];
        settlementBanner.className = `settlement-status-banner ${style.cls}`;

        let html = `<i class="${style.icon}"></i><span>정산상태: <strong>${stName}</strong></span>`;
        if (stCode === 'C1004' && stComment) {
            html += `<div class="st-reject-reason"><i class="fas fa-comment-dots"></i> <strong>반려 사유:</strong> ${stComment}</div>`;
        }
        // 반려 상태일 때 — 상세보기를 거치지 않고 바로 수정 페이지로 이동하는 버튼
        if (stCode === 'C1004') {
            html += `<button type="button" id="btnEditRejected" class="btn-edit-rejected">
                        <i class="fas fa-pen"></i> 수정하러 가기
                     </button>`;
        }
        settlementBanner.innerHTML = html;
        settlementBanner.style.display = '';

        const editRejectedBtn = document.getElementById('btnEditRejected');
        if (editRejectedBtn) {
            editRejectedBtn.addEventListener('click', () => {
                window.location.href = `/approval/expense?idx=${idx}`;
            });
        }
    }

    // ── 버튼 표시 (API 200 = 본인 문서 확인됨) ───────────────────
    if (printBtn) {
        printBtn.style.display = '';
        if (canPrint) {
            printBtn.disabled = false;
            printBtn.classList.remove('btn-disabled');
            printBtn.removeAttribute('data-tip');
        } else {
            printBtn.disabled = true;
            printBtn.classList.add('btn-disabled');
            printBtn.setAttribute('data-tip', '모든 항목에 영수증(문서/이미지)이 첨부되어야 인쇄할 수 있습니다');
        }
    }
    if (editBtn)   editBtn.style.display   = isReadOnly ? 'none' : '';
    if (deleteBtn) deleteBtn.style.display = isReadOnly ? 'none' : '';

    // ── 인쇄 (인쇄 후 자동 제출) ─────────────────────────────────
    if (printBtn) {
        printBtn.addEventListener('click', async function () {
            if (this.disabled) return;

            // 작성중/반려 → 인쇄 시 제출완료로 전환됨을 사전 안내
            if (stCode === 'C1001' || stCode === 'C1004') {
                const confirm = await Swal.fire({
                    icon: 'info',
                    title: '인쇄 및 제출',
                    html: '인쇄하면 문서가 <strong>제출완료</strong> 상태로 전환되며,<br>이후 내용 수정이 불가합니다.<br><br><small style="color:#64748b;">수정이 필요한 경우 관리부에서 반려 처리 후 가능합니다.</small>',
                    showCancelButton: true,
                    confirmButtonText: '인쇄하기',
                    cancelButtonText: '취소',
                });
                if (!confirm.isConfirmed) return;
            }

            if (formWrapper && formWrapper.classList.contains('collapsed')) {
                formWrapper.classList.remove('collapsed');
                if (toggleBtn) toggleBtn.classList.add('active');
            }
            setTimeout(() => {
                window.print();
                // 인쇄 후 작성중/반려이면 자동으로 제출완료로 전환 + 사용자에게 명시적으로 알림
                if (stCode === 'C1001' || stCode === 'C1004') {
                    fetch(`/api/approval/expense/${idx}/submit`, { method: 'PUT' })
                        .then(async res => {
                            if (res.ok) {
                                const fromLabel = stCode === 'C1004' ? '반려' : '작성중';
                                await Swal.fire({
                                    icon: 'success',
                                    title: '제출완료 상태로 변경되었습니다',
                                    html: `정산상태: <strong>${fromLabel}</strong> → <strong style="color:#2563eb;">제출완료</strong><br><small style="color:#64748b;">출력한 종이 문서에 사인을 받아 관리부에 제출해주세요.</small>`,
                                    confirmButtonText: '확인',
                                    confirmButtonColor: '#2563eb',
                                });
                                location.reload();
                            } else {
                                Swal.fire({
                                    icon: 'error',
                                    title: '상태 변경 실패',
                                    text: '인쇄는 완료되었지만 상태 전환에 실패했습니다. 새로고침 후 다시 시도해주세요.',
                                });
                            }
                        })
                        .catch(() => {
                            Swal.fire({
                                icon: 'error',
                                title: '상태 변경 실패',
                                text: '서버 통신 오류로 상태가 변경되지 않았습니다.',
                            });
                        });
                }
            }, 300);
        });
    }

    // ── 수정 ──────────────────────────────────────────────────────
    if (editBtn) {
        editBtn.addEventListener('click', function () {
            window.location.href = `/approval/expense?idx=${idx}`;
        });
    }

    // ── 삭제 ──────────────────────────────────────────────────────
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function () {
            const result = await Swal.fire({
                title: '문서를 삭제하시겠습니까?',
                html: '삭제된 문서는 <strong>복구할 수 없습니다.</strong><br><small style="color:#64748b;">결재함 목록에서도 사라집니다.</small>',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: '삭제',
                cancelButtonText: '취소',
                confirmButtonColor: '#d33'
            });
            if (!result.isConfirmed) return;

            try {
                const res = await fetch(`/api/approval/expense/${idx}`, { method: 'DELETE' });
                if (res.status === 204) {
                    await Swal.fire({
                        icon: 'success',
                        title: '문서가 삭제되었습니다',
                        text: '결재함으로 이동합니다.',
                        timer: 1500,
                        showConfirmButton: false,
                    });
                    window.location.href = '/approval';
                } else {
                    throw new Error();
                }
            } catch (_) {
                Swal.fire({ icon: 'error', title: '삭제 실패', text: '잠시 후 다시 시도해 주세요.' });
            }
        });
    }
});
