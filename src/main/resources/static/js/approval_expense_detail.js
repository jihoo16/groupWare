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
            Swal.fire({ icon: 'warning', title: '접근 불가', text: '본인 문서만 조회할 수 있습니다.' })
                .then(() => history.back());
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
                <button type="button" class="btn-download-file" title="다운로드"><i class="fas fa-download"></i></button>
                <button type="button" class="btn-remove-file" title="삭제"><i class="fas fa-times"></i></button>
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
                        <button class="swal-delete-att" data-att-idx="${att.idx}" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;"><i class="fas fa-trash"></i></button>
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
        btn.addEventListener('click', function() {
            currentUploadDetailIdx = this.dataset.detailIdx;
            hiddenInput.click();
        });
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

    setupUpload('signedDocInput', 'signedDocUploadArea', 'DOCUMENT');

    // ── 버튼 표시 (API 200 = 본인 문서 확인됨) ───────────────────
    if (printBtn)  printBtn.style.display  = '';
    if (editBtn)   editBtn.style.display   = '';
    if (deleteBtn) deleteBtn.style.display = '';

    // ── 인쇄 ──────────────────────────────────────────────────────
    if (printBtn) {
        printBtn.addEventListener('click', function () {
            if (formWrapper && formWrapper.classList.contains('collapsed')) {
                formWrapper.classList.remove('collapsed');
                if (toggleBtn) toggleBtn.classList.add('active');
            }
            setTimeout(() => window.print(), 300);
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
                title: '삭제하시겠습니까?',
                text: '삭제된 문서는 복구할 수 없습니다.',
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
                    await Swal.fire({ icon: 'success', title: '삭제 완료', timer: 1200, showConfirmButton: false });
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
