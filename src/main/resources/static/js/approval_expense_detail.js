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

    // ── 편집가능 여부 ───────────────────────────────────────────
    // 작성 도구 모드 — 항상 편집/삭제 가능
    const isReadOnly = false;

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

    // (정산상태 인라인 뱃지 제거됨 — 작성 도구 모드)

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
                <tr class="expense-detail-row" data-detail-idx="${d.idx}">
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
        if (typeof window.revokeChipThumbs === 'function') window.revokeChipThumbs(signedList);
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
            if (typeof window.attachThumbToFileItem === 'function') {
                window.attachThumbToFileItem(item, `/api/approval/expense/attachments/${att.idx}/download`, att.originalFilename);
            }

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

    // 전자서명 현황 로드
    if (window.SignatureRender && doc.documentIdx) SignatureRender.load(doc.documentIdx);

    // ── 항목별 영수증 버튼 이벤트 ─────────────────────────────────
    let currentUploadDetailIdx = null;
    const hiddenInput = document.getElementById('itemReceiptHiddenInput');

    // 영수증 보기 버튼 (이미 첨부된 항목)
    function isImageName(name) {
        return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name || '');
    }
    document.querySelectorAll('.btn-view-receipt').forEach(btn => {
        btn.addEventListener('click', function() {
            const detailIdx = this.dataset.detailIdx;
            const detail = details.find(d => String(d.idx) === detailIdx);
            if (!detail || !detail.attachments || detail.attachments.length === 0) return;

            let listHtml = '<div style="text-align:left;">';
            detail.attachments.forEach(att => {
                const downloadUrl = `/api/approval/expense/attachments/${att.idx}/download`;
                const isImg = isImageName(att.originalFilename);
                const thumbHtml = isImg
                    ? `<img src="${downloadUrl}" alt="${att.originalFilename}" class="swal-receipt-thumb" data-att-url="${downloadUrl}" data-att-name="${att.originalFilename}" style="width:48px;height:48px;object-fit:cover;border:1px solid #d1d5db;border-radius:4px;cursor:zoom-in;flex-shrink:0;">`
                    : `<i class="fas ${getFileIcon(att.originalFilename)}" style="color:#667eea;width:48px;text-align:center;font-size:24px;"></i>`;
                listHtml += `
                    <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
                        ${thumbHtml}
                        <span style="flex:1;font-size:13px;word-break:break-all;">${att.originalFilename}</span>
                        <a href="${downloadUrl}" style="color:#667eea;font-size:12px;"><i class="fas fa-download"></i></a>
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
                    // 썸네일 클릭 시 file-preview-modal로 큰 미리보기
                    const thumbList = Array.from(document.querySelectorAll('.swal-receipt-thumb'));
                    const previewFiles = thumbList.map(t => ({ url: t.dataset.attUrl, filename: t.dataset.attName }));
                    thumbList.forEach((thumb, i) => {
                        thumb.addEventListener('click', function(e) {
                            e.stopPropagation();
                            if (typeof window.openFilePreview === 'function') {
                                window.openFilePreview(previewFiles, i);
                            }
                        });
                    });

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

    /** detail row에 영수증 파일 즉시 업로드 (file picker / drag&drop / paste 공유) */
    async function uploadDetailReceipts(detailIdx, fileList) {
        if (!detailIdx || !fileList || fileList.length === 0) return;

        const validFiles = Array.from(fileList).filter(f => {
            if (f.size > MAX_FILE_SIZE) {
                Swal.fire({ icon: 'warning', title: '파일 크기 초과', text: `50MB를 초과합니다: ${f.name}` });
                return false;
            }
            return true;
        });
        if (validFiles.length === 0) return;

        const formData = new FormData();
        validFiles.forEach(f => formData.append('files', f));

        try {
            const res = await fetch(`/api/approval/expense/detail/${detailIdx}/attachments`, {
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
            Swal.fire({ icon: 'error', title: '업로드 실패', text: '파일 업로드 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.' });
        }
    }

    if (hiddenInput) {
        hiddenInput.addEventListener('change', async function() {
            const targetIdx = currentUploadDetailIdx;
            if (!targetIdx || this.files.length === 0) return;
            await uploadDetailReceipts(targetIdx, this.files);
            this.value = '';
            currentUploadDetailIdx = null;
        });
    }

    // ============================================
    // 활성 detail row 추적 + drag&drop + 클립보드 paste (패턴 A-2)
    // ============================================
    if (!isReadOnly) {
        let activeDetailRow = null;

        function setActiveDetailRow(rowEl) {
            if (!rowEl || activeDetailRow === rowEl) return;
            document.querySelectorAll('.expense-detail-row.paste-active').forEach(el => {
                el.classList.remove('paste-active');
            });
            rowEl.classList.add('paste-active');
            activeDetailRow = rowEl;
        }

        // 클릭으로 활성 row 전환
        document.querySelectorAll('.expense-detail-row').forEach(row => {
            row.addEventListener('click', function() {
                setActiveDetailRow(this);
            });

            // paste 안내 뱃지 — 활성 row에서만 표시 (CSS 제어)
            const receiptCell = row.querySelector('td.receipt-cell');
            if (receiptCell && typeof window.ensurePasteHint === 'function') {
                window.ensurePasteHint(receiptCell, {
                    text: '여기에 Ctrl+V',
                    position: 'append',
                });
            }

            // drag & drop — 각 row에 직접 핸들러 등록
            row.addEventListener('dragover', function(e) {
                e.preventDefault();
                row.classList.add('drag-over');
            });
            row.addEventListener('dragleave', function(e) {
                if (!row.contains(e.relatedTarget)) row.classList.remove('drag-over');
            });
            row.addEventListener('drop', async function(e) {
                e.preventDefault();
                row.classList.remove('drag-over');
                const detailIdx = row.dataset.detailIdx;
                if (!detailIdx) return;
                await uploadDetailReceipts(detailIdx, e.dataTransfer.files);
            });
        });

        // 첫 row 기본 활성
        const firstRow = document.querySelector('.expense-detail-row');
        if (firstRow) setActiveDetailRow(firstRow);

        // 섹션 상단 paste 기능 안내 배너 (한 번만)
        if (typeof window.ensurePasteInfoBanner === 'function') {
            const tableWrapper = document.querySelector('.table-wrapper');
            if (tableWrapper && tableWrapper.parentElement) {
                const banner = window.ensurePasteInfoBanner(tableWrapper.parentElement, {
                    text: '영수증을 바로 추가하려면 <b>행을 클릭해 선택</b>한 뒤 <kbd>Ctrl</kbd>+<kbd>V</kbd> 로 이미지를 붙여넣으세요. (드래그&드롭도 가능)',
                });
                // table-wrapper 바로 앞으로 이동
                if (banner && banner.parentElement === tableWrapper.parentElement) {
                    tableWrapper.parentElement.insertBefore(banner, tableWrapper);
                }
            }
        }

        // 클립보드 paste — 활성 row에 즉시 업로드
        // 즉시 업로드 패턴 + reload 부작용이 있어, 한 paste 이벤트의 여러 파일을
        // 마이크로태스크 큐에 모아서 한 번에 업로드한다
        if (typeof window.setupClipboardImagePaste === 'function') {
            let pasteBuffer = [];
            let pasteTimer = null;
            let pasteTargetIdx = null;

            function flushPasteBuffer() {
                pasteTimer = null;
                if (!pasteTargetIdx || pasteBuffer.length === 0) {
                    pasteBuffer = [];
                    pasteTargetIdx = null;
                    return;
                }
                const dt = new DataTransfer();
                pasteBuffer.forEach(f => dt.items.add(f));
                const idx = pasteTargetIdx;
                pasteBuffer = [];
                pasteTargetIdx = null;
                uploadDetailReceipts(idx, dt.files);
            }

            window.setupClipboardImagePaste({
                resolveTarget: () => {
                    if (!activeDetailRow || !document.body.contains(activeDetailRow)) {
                        const fallback = document.querySelector('.expense-detail-row');
                        if (fallback) setActiveDetailRow(fallback);
                        else return null;
                    }
                    const detailIdx = activeDetailRow.dataset.detailIdx;
                    if (!detailIdx) return null;
                    return {
                        addFile: (file) => {
                            if (file.size > MAX_FILE_SIZE) {
                                Swal.fire({ icon: 'warning', title: '파일 크기 초과', text: `50MB를 초과합니다: ${file.name}` });
                                return false;
                            }
                            pasteTargetIdx = detailIdx;
                            pasteBuffer.push(file);
                            // 같은 paste 이벤트 내 모든 addFile 호출을 하나의 fetch로 묶음
                            if (pasteTimer === null) {
                                pasteTimer = setTimeout(flushPasteBuffer, 0);
                            }
                            return true;
                        },
                        label: '영수증',
                    };
                },
            });
        }
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
            Swal.fire({ icon: 'error', title: '업로드 실패', text: '파일 업로드 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.' });
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
    const canPrint = totalItems > 0; // 영수증 없이도 인쇄 가능

    // ── 영수증 현황 배너 ─────────────────────────────────────────
    const banner = document.getElementById('receiptStatusBanner');
    if (banner && totalItems > 0) {
        banner.style.display = '';
        if (allReceiptsComplete) {
            banner.className = 'receipt-status-banner status-complete';
            banner.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>영수증 ${itemsWithReceipt}/${totalItems}건 첨부 완료</span>`;
        } else {
            banner.className = 'receipt-status-banner status-incomplete';
            banner.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <span>영수증 ${itemsWithReceipt}/${totalItems}건 첨부 (${totalItems - itemsWithReceipt}건 미첨부)</span>`;
        }
    }

    // ── 버튼 표시 (API 200 = 본인 문서 확인됨) ───────────────────
    if (printBtn) {
        printBtn.style.display = '';
        printBtn.disabled = false;
        printBtn.classList.remove('btn-disabled');
        printBtn.removeAttribute('data-tip');
    }
    if (editBtn)   editBtn.style.display   = isReadOnly ? 'none' : '';
    if (deleteBtn) deleteBtn.style.display = isReadOnly ? 'none' : '';

    // ── 인쇄 ─────────────────────────────────────────────────────
    if (printBtn) {
        printBtn.addEventListener('click', async function () {
            if (this.disabled) return;

            // 월 1건 제출 안내
            const confirmed = await Swal.fire({
                icon: 'info',
                title: '인쇄 전 확인',
                html: '개인경비는 <strong>한 달에 한 번만</strong> 제출 가능합니다.<br>인쇄한 문서에 사인을 받아 관리부에 제출해주세요.',
                showCancelButton: true,
                confirmButtonText: '인쇄하기',
                cancelButtonText: '취소',
                confirmButtonColor: '#2563eb',
            });
            if (!confirmed.isConfirmed) return;

            if (formWrapper && formWrapper.classList.contains('collapsed')) {
                formWrapper.classList.remove('collapsed');
                if (toggleBtn) toggleBtn.classList.add('active');
            }
            setTimeout(() => {
                window.print();
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
                html: '삭제된 문서는 <strong>복구할 수 없습니다.</strong>',
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
                        text: '문서 목록으로 이동합니다.',
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
