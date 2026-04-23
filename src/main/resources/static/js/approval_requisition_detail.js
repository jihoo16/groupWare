document.addEventListener('DOMContentLoaded', async function () {

    // ── 헬퍼 함수 ────────────────────────────────────────────────
    function pad(n) { return String(n).padStart(2, '0'); }

    function formatAmount(amount) {
        if (amount == null) return '₩ 0';
        return '₩ ' + Number(amount).toLocaleString('ko-KR');
    }

    function formatDateForDisplay(dateStr) {
        if (!dateStr) return '-';
        const parts = dateStr.split('-');
        if (parts.length < 3) return dateStr;
        return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
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
        showError('주소가 올바르지 않아 문서를 열 수 없습니다.<br>목록에서 다시 선택해 주세요.', '문서를 열 수 없습니다')
            .then(() => history.back());
        return;
    }

    // ── DOM 참조 ──────────────────────────────────────────────────
    const toggleBtn    = document.getElementById('documentFormToggle');
    const formWrapper  = document.querySelector('.document-form-wrapper');
    const printBtn     = document.getElementById('printBtn');
    const editBtn      = document.getElementById('editBtn');
    const deleteBtn    = document.getElementById('deleteBtn');

    // ── 미리보기 토글 ─────────────────────────────────────────────
    if (toggleBtn && formWrapper) {
        toggleBtn.addEventListener('click', function () {
            formWrapper.classList.toggle('collapsed');
            this.classList.toggle('active');
        });
    }

    // ── 데이터 로드 ───────────────────────────────────────────────
    let doc = null;
    try {
        const res = await fetch(`/api/approval/requisition/${idx}`);
        if (res.status === 401) { window.location.href = '/login'; return; }
        if (res.status === 403) {
            Swal.fire({ icon: 'warning', title: '접근 불가', text: '본인 문서만 조회할 수 있습니다.' })
                .then(() => history.back());
            return;
        }
        if (res.status === 404) {
            showError('이미 삭제되었거나 존재하지 않는 문서입니다.<br>목록에서 다시 확인해 주세요.', '문서를 찾을 수 없습니다')
                .then(() => history.back());
            return;
        }
        if (!res.ok) throw new Error('SERVER_ERROR');
        doc = await res.json();
    } catch (e) {
        console.error('[불러오기 실패] 품의서 상세', e);
        showLoadFailure('품의서').then(() => history.back());
        return;
    }

    // ── 기본 정보 세팅 ────────────────────────────────────────────
    const draftDate = doc.createdAt ? new Date(doc.createdAt) : null;
    const dateStr = draftDate
        ? `${draftDate.getFullYear()}.${pad(draftDate.getMonth() + 1)}.${pad(draftDate.getDate())}`
        : '-';

    document.getElementById('detailDept').textContent          = doc.authorDept || '-';
    document.getElementById('detailName').textContent          = doc.authorName || '-';
    document.getElementById('detailDate').textContent          = dateStr;

    // ── 품의 내용 ─────────────────────────────────────────────────
    document.getElementById('detailContent').textContent = doc.content || '-';

    // ── 아이템 정렬 ───────────────────────────────────────────────
    const items = (doc.items || []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const total = doc.totalAmount || 0;

    // ── 상단 지출 예정 내역 테이블 ────────────────────────────────
    const tbody = document.getElementById('detailTableBody');
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-row">지출 예정 내역이 없습니다</td></tr>';
    } else {
        tbody.innerHTML = items.map(item => `
            <tr>
                <td>${item.itemDate || '-'}</td>
                <td>${item.itemDesc || '-'}</td>
                <td>${item.vendor || '-'}</td>
                <td style="text-align:right; padding-right:20px;">${formatAmount(item.amount)}</td>
                <td>${item.remark || ''}</td>
            </tr>
        `).join('');
    }

    document.getElementById('detailTotalAmount').textContent = '₩ ' + Number(total).toLocaleString('ko-KR');

    // ── 지급종류 / 특이사항 ───────────────────────────────────────
    document.getElementById('detailPaymentType').textContent  = doc.paymentType || '-';
    document.getElementById('detailSpecialNote').textContent  = doc.specialNote || '-';

    // ── 공식 문서 미리보기 렌더링 ─────────────────────────────────
    document.getElementById('previewContent').textContent = doc.content || '-';

    // 지출 예정 내역 (미리보기)
    const previewBody = document.getElementById('previewItemBody');
    if (items.length === 0) {
        previewBody.innerHTML = '<tr><td class="empty-preview-row" colspan="5">내역이 없습니다</td></tr>';
    } else {
        previewBody.innerHTML = items.map(item => `
            <tr>
                <td>${formatDateForDisplay(item.itemDate)}</td>
                <td style="text-align:left; padding-left:8px;">${item.itemDesc || '-'}</td>
                <td>${item.vendor || '-'}</td>
                <td style="text-align:right;">${formatAmount(item.amount)}</td>
                <td>${item.remark || ''}</td>
            </tr>
        `).join('');
    }

    // 계 (한글 + 숫자)
    const totalNum = Number(total);
    document.getElementById('previewTotalAmount').textContent =
        '일금 ' + toKoreanAmount(totalNum) + '원정  (₩ ' + totalNum.toLocaleString('ko-KR') + ')';

    // 지급종류 체크표시
    const pt = doc.paymentType || '';
    const ptChecked = { '현금': '&nbsp;&nbsp;', '사업비카드': '&nbsp;&nbsp;', '개인카드': '&nbsp;&nbsp;' };
    if (ptChecked.hasOwnProperty(pt)) ptChecked[pt] = '✓';
    document.getElementById('previewPaymentType').innerHTML =
        `현금( ${ptChecked['현금']} ) / 사업비카드( ${ptChecked['사업비카드']} ) / 개인카드( ${ptChecked['개인카드']} )`;

    // 특이사항
    document.getElementById('previewSpecialNote').textContent = doc.specialNote || '';

    // 일자 / 성명
    document.getElementById('previewDocDate').textContent   = dateStr;
    document.getElementById('previewDocDateTop').textContent = dateStr;
    document.getElementById('previewApplicant').textContent = doc.authorName || '-';

    // 전자서명 현황 로드
    if (window.SignatureRender && doc.documentIdx) SignatureRender.load(doc.documentIdx);

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
            window.location.href = `/approval/requisition?idx=${idx}`;
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
                const res = await fetch(`/api/approval/requisition/${idx}`, { method: 'DELETE' });
                if (res.status === 204) {
                    await Swal.fire({ icon: 'success', title: '삭제 완료', timer: 1200, showConfirmButton: false });
                    window.location.href = '/approval';
                } else {
                    throw new Error('DELETE_FAILED');
                }
            } catch (err) {
                console.error('[삭제 실패] 품의서', err);
                showDeleteFailure('품의서');
            }
        });
    }
});
