/**
 * 관리자 감사 로그 페이지
 *
 * 흐름:
 *   1. 페이지 진입 → 기본 검색(전체, 최신순, 20건/페이지)
 *   2. 필터 변경 + [조회] → /api/admin/audit-logs 호출
 *   3. 행 클릭 → 상세 모달 (detail_json + User-Agent 포함)
 *   4. [CSV 내보내기] → /api/admin/audit-logs/export (최대 10,000건)
 */
(function () {
    'use strict';

    const API_BASE = '/api/admin/audit-logs';
    let currentPage = 0;
    let currentSize = 50;

    document.addEventListener('DOMContentLoaded', () => {
        applyDefaultDateRange(); // 첫 진입 — 이번달 기본 조회
        bindFilters();
        bindModal();
        search(); // 최초 로드
    });

    /** 첫 진입 시 시작일/종료일이 비어있으면 이번달 1일 ~ 말일로 채움 */
    function applyDefaultDateRange() {
        const startEl = document.getElementById('filterStart');
        const endEl = document.getElementById('filterEnd');
        if (startEl.value || endEl.value) return; // 사용자가 이미 채워둔 경우 존중
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth(); // 0-indexed
        const pad = n => String(n).padStart(2, '0');
        const first = `${y}-${pad(m + 1)}-01`;
        const lastDay = new Date(y, m + 1, 0).getDate();
        const last = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
        startEl.value = first;
        endEl.value = last;
    }

    // =========================================================================
    // 필터 바인딩
    // =========================================================================
    function bindFilters() {
        document.getElementById('searchBtn').addEventListener('click', () => {
            currentPage = 0;
            search();
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            document.getElementById('filterStart').value = '';
            document.getElementById('filterEnd').value = '';
            document.getElementById('filterTargetType').value = '';
            document.getElementById('filterAction').value = '';
            document.getElementById('filterKeyword').value = '';
            document.getElementById('filterDocumentIdx').value = '';
            applyDefaultDateRange(); // 기본값 = 이번달
            currentPage = 0;
            search();
        });

        document.getElementById('pageSize').addEventListener('change', (e) => {
            currentSize = parseInt(e.target.value, 10) || 20;
            currentPage = 0;
            search();
        });

        // Enter 로 조회
        ['filterKeyword', 'filterDocumentIdx', 'filterStart', 'filterEnd'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('keyup', (e) => {
                    if (e.key === 'Enter') {
                        currentPage = 0;
                        search();
                    }
                });
            }
        });

        // CSV 내보내기
        document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
    }

    // =========================================================================
    // 검색
    // =========================================================================
    async function search() {
        const params = buildParams(currentPage, currentSize);

        try {
            // 키워드(이름/사번) 는 별도 resolve — /api/users/search 로 userIdx 를 얻어와 필터에 넣음
            const keyword = document.getElementById('filterKeyword').value.trim();
            if (keyword) {
                const userIdx = await resolveUserIdxByKeyword(keyword);
                if (userIdx !== null) {
                    params.set('userIdx', userIdx);
                } else {
                    // 매칭 사용자 없음 — 빈 결과로 표시
                    renderTable([]);
                    renderMeta(0);
                    renderPagination(0, 0);
                    return;
                }
            }

            const res = await fetch(`${API_BASE}?${params.toString()}`);
            if (!res.ok) throw new Error('조회 실패');
            const data = await res.json();

            renderTable(data.content || []);
            renderMeta(data.totalElements || 0);
            renderPagination(data.page || 0, data.totalPages || 0);
        } catch (e) {
            console.error('[AuditLog] 조회 오류', e);
            Swal.fire({
                icon: 'error',
                title: '조회 실패',
                text: '서명 이력을 불러오는데 실패했습니다.\n잠시 후 다시 시도해주세요.'
            });
        }
    }

    function buildParams(page, size) {
        const p = new URLSearchParams();
        const start = document.getElementById('filterStart').value;
        const end = document.getElementById('filterEnd').value;
        const targetType = document.getElementById('filterTargetType').value;
        const action = document.getElementById('filterAction').value;
        const docIdx = document.getElementById('filterDocumentIdx').value;

        if (start) p.set('start', start);
        if (end) p.set('end', end);
        if (targetType) p.set('targetType', targetType);
        if (action) p.set('action', action);
        if (docIdx) p.set('documentIdx', docIdx);
        p.set('page', String(page));
        p.set('size', String(size));
        return p;
    }

    /** 이름/사번 키워드 → users.idx. 매칭 없으면 null. */
    async function resolveUserIdxByKeyword(keyword) {
        try {
            // 기존 /api/users/search?name= 재사용 (사번 검색도 내부적으로 지원하면 통과)
            const res = await fetch(`/api/users/search?name=${encodeURIComponent(keyword)}`);
            if (!res.ok) return null;
            const list = await res.json();
            if (!Array.isArray(list) || list.length === 0) return null;
            // 사번 정확 매칭 우선, 없으면 첫 결과
            const exact = list.find(u => u.empId === keyword) || list[0];
            return exact.idx || null;
        } catch {
            return null;
        }
    }

    // =========================================================================
    // 렌더
    // =========================================================================
    function renderTable(rows) {
        const tbody = document.getElementById('auditTableBody');
        const empty = document.getElementById('emptyState');
        if (!rows.length) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';

        tbody.innerHTML = rows.map(r => {
            const when = r.createdAt ? formatDateTime(r.createdAt) : '';
            const who = [r.userName, r.userEmpId].filter(Boolean).join(' / ') || '-';
            const dept = r.userDeptName || '-';
            const targetClass = targetBadgeClass(r.targetType);
            const actionClass = actionBadgeClass(r.action);
            const docCell = r.documentNo ? escapeHtml(r.documentNo)
                    : (r.documentIdx ? `#${r.documentIdx}` : '-');
            const desc = escapeHtml(r.description || '-');
            return `<tr data-idx="${r.idx}">
                <td class="nowrap">${when}</td>
                <td class="nowrap">${escapeHtml(who)}</td>
                <td class="nowrap">${escapeHtml(dept)}</td>
                <td><span class="audit-badge ${targetClass}">${escapeHtml(r.targetTypeName || r.targetType)}</span></td>
                <td><span class="audit-badge ${actionClass}">${escapeHtml(r.actionName || r.action)}</span></td>
                <td class="description" title="${desc}">${desc}</td>
                <td class="nowrap">${docCell}</td>
                <td class="nowrap">${escapeHtml(r.ipAddress || '-')}</td>
            </tr>`;
        }).join('');

        // 행 클릭 → 상세
        tbody.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', () => openDetail(tr.dataset.idx));
        });
    }

    function renderMeta(total) {
        document.getElementById('totalCountText').innerHTML =
                `조회 결과: <strong>${total.toLocaleString()}</strong> 건`;
    }

    function renderPagination(page, totalPages) {
        const wrap = document.getElementById('pagination');
        if (totalPages <= 1) { wrap.innerHTML = ''; return; }

        const buttons = [];
        const mkBtn = (label, targetPage, opts = {}) => {
            const active = opts.active ? ' active' : '';
            const disabled = opts.disabled ? ' disabled' : '';
            const ellipsis = opts.ellipsis ? ' ellipsis' : '';
            return `<button class="page-btn${active}${ellipsis}"
                            data-page="${targetPage}"${opts.disabled ? ' disabled' : ''}>${label}</button>`;
        };

        // ‹ 이전
        buttons.push(mkBtn('‹', page - 1, { disabled: page === 0 }));

        // 페이지 번호 (현재 기준 ±2 + 처음/끝)
        const pages = [];
        const start = Math.max(0, page - 2);
        const end = Math.min(totalPages - 1, page + 2);
        if (start > 0) {
            pages.push(0);
            if (start > 1) pages.push(-1); // …
        }
        for (let p = start; p <= end; p++) pages.push(p);
        if (end < totalPages - 1) {
            if (end < totalPages - 2) pages.push(-1);
            pages.push(totalPages - 1);
        }
        pages.forEach(p => {
            if (p === -1) {
                buttons.push(mkBtn('…', -1, { ellipsis: true, disabled: true }));
            } else {
                buttons.push(mkBtn(String(p + 1), p, { active: p === page }));
            }
        });

        // › 다음
        buttons.push(mkBtn('›', page + 1, { disabled: page >= totalPages - 1 }));

        wrap.innerHTML = buttons.join('');
        wrap.querySelectorAll('.page-btn:not(.ellipsis):not(:disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                currentPage = parseInt(btn.dataset.page, 10);
                search();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    // =========================================================================
    // 상세 모달
    // =========================================================================
    function bindModal() {
        const modal = document.getElementById('auditDetailModal');
        modal.addEventListener('click', (e) => {
            if (e.target.closest('[data-close="true"]')) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
    }

    async function openDetail(idx) {
        if (!idx) return;
        try {
            const res = await fetch(`${API_BASE}/${idx}`);
            if (!res.ok) throw new Error();
            const r = await res.json();

            let detailFormatted = r.detailJson || '';
            try {
                if (detailFormatted) {
                    const parsed = JSON.parse(detailFormatted);
                    detailFormatted = JSON.stringify(parsed, null, 2);
                }
            } catch { /* not JSON, show raw */ }

            document.getElementById('auditDetailBody').innerHTML = `
                <dl class="detail-grid">
                    <dt>시각</dt>           <dd>${formatDateTime(r.createdAt)}</dd>
                    <dt>행위자</dt>         <dd>${escapeHtml(r.userName || '-')} <small>(${escapeHtml(r.userEmpId || '-')})</small></dd>
                    <dt>부서</dt>           <dd>${escapeHtml(r.userDeptName || '-')}</dd>
                    <dt>대상</dt>           <dd>${escapeHtml(r.targetTypeName || r.targetType)}${r.targetIdx ? ' <small>#' + r.targetIdx + '</small>' : ''}</dd>
                    <dt>행위</dt>           <dd>${escapeHtml(r.actionName || r.action)}</dd>
                    <dt>관련 문서</dt>       <dd>${r.documentNo ? escapeHtml(r.documentNo) + (r.documentIdx ? ' <small>#' + r.documentIdx + '</small>' : '') : (r.documentIdx ? '#' + r.documentIdx : '-')}</dd>
                    <dt>설명</dt>           <dd>${escapeHtml(r.description || '-')}</dd>
                    <dt>IP</dt>             <dd>${escapeHtml(r.ipAddress || '-')}</dd>
                    <dt>URL</dt>            <dd>${escapeHtml((r.requestMethod || '') + ' ' + (r.requestUrl || '-'))}</dd>
                    <dt>User-Agent</dt>     <dd>${escapeHtml(r.userAgent || '-')}</dd>
                    ${detailFormatted ? `<dt>Detail JSON</dt><dd><pre>${escapeHtml(detailFormatted)}</pre></dd>` : ''}
                </dl>`;
            document.getElementById('auditDetailModal').classList.add('active');
        } catch (e) {
            Swal.fire({ icon: 'error', title: '상세 조회 실패', text: '잠시 후 다시 시도해주세요.' });
        }
    }

    function closeModal() {
        document.getElementById('auditDetailModal').classList.remove('active');
    }

    // =========================================================================
    // CSV 내보내기
    // =========================================================================
    function exportCsv() {
        const params = buildParams(0, 0); // page/size 의미 없음 (서버가 MAX_EXPORT_ROWS 까지)
        params.delete('page');
        params.delete('size');
        const url = `${API_BASE}/export?${params.toString()}`;
        window.location.href = url;
    }

    // =========================================================================
    // 유틸
    // =========================================================================
    function formatDateTime(iso) {
        if (!iso) return '-';
        const d = new Date(iso);
        if (isNaN(d)) return iso;
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
               `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    function escapeHtml(s) {
        if (s == null) return '';
        const div = document.createElement('div');
        div.textContent = String(s);
        return div.innerHTML;
    }

    function targetBadgeClass(code) {
        switch (code) {
            case 'C1701': return 'target-document';
            case 'C1702': return 'target-signature';
            case 'C1703': return 'target-session';
            case 'C1704': return 'target-user';
            case 'C1705': return 'target-file';
            default: return 'target-document';
        }
    }

    function actionBadgeClass(code) {
        switch (code) {
            case 'C1801': return 'action-create';
            case 'C1802': return 'action-update';
            case 'C1803': return 'action-delete';
            case 'C1804': return 'action-sign';
            case 'C1809': return 'action-submit';
            case 'C1810': return 'action-view';
            default: return 'action-default';
        }
    }
})();
