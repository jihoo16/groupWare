document.addEventListener('DOMContentLoaded', async function () {

    // URL에서 idx 파라미터 추출
    const params = new URLSearchParams(window.location.search);
    const idx = params.get('idx');

    if (!idx) {
        Swal.fire({ icon: 'error', title: '오류', text: '문서 정보가 없습니다.' })
            .then(() => history.back());
        return;
    }

    // ── 데이터 로드 ────────────────────────────────────────────
    let doc = null;
    try {
        const res = await fetch(`/api/approval/expense/${idx}`);
        if (res.status === 404) {
            Swal.fire({ icon: 'error', title: '없는 문서', text: '삭제되었거나 존재하지 않는 문서입니다.' })
                .then(() => history.back());
            return;
        }
        if (res.status === 403) {
            Swal.fire({ icon: 'warning', title: '접근 불가', text: '본인 문서만 조회할 수 있습니다.' })
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

    // ── 작성자 정보 로드 ────────────────────────────────────────
    let drafter = null;
    try {
        const res = await fetch(`/api/users/${doc.userIdx}`);
        if (res.ok) drafter = await res.json();
    } catch (_) {}

    // ── 기본 정보 렌더링 ────────────────────────────────────────
    const draftDate = doc.createdAt ? new Date(doc.createdAt) : null;
    const dateStr = draftDate
        ? `${draftDate.getFullYear()}.${pad(draftDate.getMonth() + 1)}.${pad(draftDate.getDate())}`
        : '-';

    document.getElementById('detailDept').textContent =
        drafter ? (drafter.empDeptName || drafter.empDept || '-') : '-';
    document.getElementById('detailName').textContent =
        drafter ? (drafter.empName || '-') : '-';
    document.getElementById('detailDate').textContent = dateStr;
    document.getElementById('detailDocumentNumber').textContent = doc.documentNumber || '-';

    // ── 지출 내역 테이블 렌더링 ─────────────────────────────────
    const details = (doc.expenseDetails || []).sort(
        (a, b) => new Date(a.expenseDate) - new Date(b.expenseDate)
    );
    const tbody = document.getElementById('detailTableBody');

    if (details.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-row">지출 내역이 없습니다</td></tr>';
    } else {
        tbody.innerHTML = details.map(d => `
            <tr>
                <td>${d.expenseDate || '-'}</td>
                <td>${d.description || '-'}</td>
                <td>${d.shopName || '-'}</td>
                <td>${d.paymentMethod || '-'}</td>
                <td style="text-align:right;">${formatAmount(d.amount)}</td>
                <td>${d.note || ''}</td>
            </tr>
        `).join('');
    }

    const total = doc.totalAmount || 0;
    document.getElementById('detailTotalAmount').textContent = '₩ ' + total.toLocaleString();

    // ── 공식 문서 미리보기 렌더링 ───────────────────────────────
    const deptName = drafter ? (drafter.empDeptName || drafter.empDept || '-') : '-';
    const name = drafter ? (drafter.empName || '-') : '-';

    document.getElementById('previewDate').textContent = dateStr;
    document.getElementById('previewDept').textContent = deptName;
    document.getElementById('previewName').textContent = name;
    document.getElementById('previewAmountKorean').textContent = '일금 ' + toKoreanAmount(total) + '원정';
    document.getElementById('previewAmountNumber').textContent = '(₩ ' + total.toLocaleString() + ')';
    document.getElementById('previewTotal').textContent = '₩ ' + total.toLocaleString();

    let cashTotal = 0, cardTotal = 0;
    const previewBody = document.getElementById('previewExpenseBody');
    if (details.length === 0) {
        previewBody.innerHTML = '<tr><td class="empty-row" colspan="6">지출 내역이 없습니다</td></tr>';
    } else {
        previewBody.innerHTML = details.map(d => {
            if (d.paymentMethod === '현금') cashTotal += (d.amount || 0);
            else cardTotal += (d.amount || 0);
            return `
                <tr>
                    <td>${d.expenseDate || '-'}</td>
                    <td>${d.description || '-'}</td>
                    <td>${d.shopName || '-'}</td>
                    <td>${d.paymentMethod || '-'}</td>
                    <td style="text-align:right;">${formatAmount(d.amount)}</td>
                    <td>${d.note || ''}</td>
                </tr>
            `;
        }).join('');
    }
    document.getElementById('previewCash').textContent = '₩ ' + cashTotal.toLocaleString();
    document.getElementById('previewCard').textContent = '₩ ' + cardTotal.toLocaleString();

    // ── 버튼 표시 (본인 문서인 경우) ────────────────────────────
    if (window.CURRENT_USER && window.CURRENT_USER.idx === doc.userIdx) {
        document.getElementById('editBtn').style.display = '';
        document.getElementById('deleteBtn').style.display = '';
        document.getElementById('printBtn').style.display = '';
    } else {
        document.getElementById('printBtn').style.display = '';
    }

    // ── 수정 버튼 ────────────────────────────────────────────────
    document.getElementById('editBtn').addEventListener('click', function () {
        window.location.href = `/approval/expense?idx=${idx}`;
    });

    // ── 삭제 버튼 ────────────────────────────────────────────────
    document.getElementById('deleteBtn').addEventListener('click', async function () {
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

    // ── 미리보기 토글 ─────────────────────────────────────────────
    const toggleBtn = document.getElementById('documentFormToggle');
    const wrapper = document.getElementById('documentFormWrapper');
    if (toggleBtn && wrapper) {
        toggleBtn.addEventListener('click', function () {
            wrapper.classList.toggle('collapsed');
            const icon = toggleBtn.querySelector('.toggle-icon');
            if (icon) icon.style.transform = wrapper.classList.contains('collapsed') ? '' : 'rotate(180deg)';
        });
    }

    // ── helpers ───────────────────────────────────────────────────
    function pad(n) { return String(n).padStart(2, '0'); }

    function formatAmount(amount) {
        if (amount == null) return '₩ 0';
        return '₩ ' + Number(amount).toLocaleString();
    }

    const KOR_UNITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    const KOR_TENS  = ['', '십', '백', '천'];
    const KOR_MEGA  = ['', '만', '억', '조'];

    function toKoreanAmount(num) {
        if (!num || num === 0) return '영';
        let result = '';
        let megaIdx = 0;
        while (num > 0) {
            const chunk = num % 10000;
            if (chunk > 0) {
                result = chunkToKorean(chunk) + KOR_MEGA[megaIdx] + result;
            }
            num = Math.floor(num / 10000);
            megaIdx++;
        }
        return result;
    }

    function chunkToKorean(n) {
        let result = '';
        for (let i = 3; i >= 0; i--) {
            const digit = Math.floor(n / Math.pow(10, i)) % 10;
            if (digit > 0) result += KOR_UNITS[digit] + KOR_TENS[i];
        }
        return result;
    }
});
