/* =========================================================
 * /admin/notifications/templates — 템플릿 편집 (실 API)
 * GET /api/admin/notifications/templates
 * PUT /api/admin/notifications/templates/{type}
 *
 * 미리보기는 클라이언트 측에서 [[${var}]] 자리표시자를 예시값으로 치환해서만 표시.
 * 실제 발송 시점 렌더는 서버 NotificationRenderer 가 동일한 규칙으로 수행.
 * ========================================================= */

(function () {
    'use strict';

    // 미리보기용 예시 변수 (Phase 1 더미와 동일 — 임의의 시나리오 1세트)
    const PREVIEW_VARS = {
        recipientName: '김철수', actorName: '이엘라',
        documentNo: 'VAC-20260507-003', documentTitle: '휴가신청서',
        documentTypePath: 'vacation', documentIdx: 567,
        deepLink: '/approval/vacation/567',
        eventTime: '2026-05-07 14:25:18',
        slotLabel: '부서장', actorSlotLabel: '담당',
        completedOrders: 1, totalOrders: 3,
        nextSignerName: '박영희', nextSlotLabel: '부서장',
        vacationStart: '2026-05-04', vacationEnd: '2026-05-08', vacationDays: 5,
        rejectReason: '인력 부족 기간',
        eventTitle: '주간 회의', eventStart: '2026-05-08 14:00',
        eventEnd: '2026-05-08 15:30', eventLocation: '대회의실',
        eventStartDate: '2026-05-08',
        externalPersonName: '홍길동', externalPersonAffiliation: '협력사',
        changedFields: '시작 시각',
        projectName: 'AI 시스템', memberRole: '연구원',
        participationStartDate: '2026-05-01', participationEndDate: '2026-12-31',
        projectIdx: 12,
        originalNotificationTitle: '서명 요청이 도착했습니다',
        failureReason: '봇 차단', retryLink: '/notifications/1023/retry',
        originalDeepLink: '/approval/vacation/567', originalNotificationIdx: 1023,
        announceTitle: '공지', announceBody: '본문'
    };

    let templates = [];          // [{ notificationType, notificationTypeName, title, body, link, color, isEnabled }]
    let currentType = null;
    let original = null;          // 마지막 로드 시점 값 (되돌리기용)

    document.addEventListener('DOMContentLoaded', function () {
        const root = document.getElementById('notifTemplatesRoot');
        if (!root) return;
        load();
        bindActions();
    });

    function load() {
        fetch('/api/admin/notifications/templates', { credentials: 'same-origin' })
            .then(function (res) {
                if (res.status === 403) throw new Error('FORBIDDEN');
                if (!res.ok) throw new Error('LOAD_FAILED');
                return res.json();
            })
            .then(function (data) {
                templates = data || [];
                renderList();
                if (templates.length > 0) {
                    select(currentType || templates[0].notificationType);
                }
            })
            .catch(function (err) {
                console.error('[Templates] 조회 실패', err);
                Swal.fire({ icon: 'error', title: '템플릿을 불러오지 못했습니다',
                    text: '잠시 후 다시 시도해 주세요.' });
            });
    }

    function renderList() {
        const list = document.getElementById('templateList');
        if (!list) return;

        list.innerHTML = templates.map(function (t) {
            const cls = ['template-list-item', t.isEnabled ? '' : 'disabled',
                t.notificationType === currentType ? 'active' : ''].filter(Boolean).join(' ');
            const status = t.isEnabled
                ? '<span class="item-status enabled">활성</span>'
                : '<span class="item-status disabled">비활성</span>';
            return (
                '<div class="' + cls + '" data-code="' + t.notificationType + '">' +
                '  <span class="item-name">' + escapeHtml(t.notificationTypeName || t.notificationType) + '</span>' +
                status +
                '</div>'
            );
        }).join('');

        list.onclick = function (e) {
            const item = e.target.closest('.template-list-item');
            if (item) select(item.dataset.code);
        };
    }

    function select(type) {
        currentType = type;
        const t = templates.find(function (x) { return x.notificationType === type; });
        if (!t) return;
        original = JSON.parse(JSON.stringify(t));

        document.querySelectorAll('.template-list-item').forEach(function (el) {
            el.classList.toggle('active', el.dataset.code === type);
        });

        const titleEl = document.querySelector('#templateEditor .editor-title');
        if (titleEl) titleEl.textContent = t.notificationTypeName || t.notificationType;

        setVal('tplTitle', t.title);
        setVal('tplBody',  t.body);
        setVal('tplLink',  t.link || '');
        setVal('tplColor', t.color || '');
        const cb = document.getElementById('tplEnabled');
        if (cb) cb.checked = !!t.isEnabled;

        renderVarTokens(t);
        renderPreview();
    }

    function renderVarTokens(t) {
        const wrap = document.getElementById('varTokens');
        if (!wrap) return;
        const used = extractVars((t.title || '') + ' ' + (t.body || '') + ' ' + (t.link || ''));
        wrap.innerHTML = used.length === 0
            ? '<span style="color:#9ca3af;font-size:12px;">사용 중인 변수 없음</span>'
            : used.map(function (v) {
                return '<span class="var-token">[[${' + escapeHtml(v) + '}]]</span>';
            }).join(' ');
    }

    function extractVars(text) {
        const set = new Set();
        const re = /\[\[\$\{([^}]+)\}\]\]/g;
        let m;
        while ((m = re.exec(text)) !== null) {
            set.add(m[1].trim());
        }
        return Array.from(set);
    }

    function renderPreview() {
        const wrap = document.getElementById('templatePreview');
        if (!wrap) return;
        const title = subst(getVal('tplTitle'));
        const body  = subst(getVal('tplBody'));
        wrap.innerHTML =
            '<div class="preview-label">실제 발송됐을 때 사용자에게 보이는 모양</div>' +
            '<div class="preview-mm">' +
            '  <div class="preview-title">' + escapeHtml(title) + '</div>' +
            '  <div class="preview-body" style="white-space:pre-wrap;">' + escapeHtml(body) + '</div>' +
            '</div>';
    }

    function subst(text) {
        if (!text) return '';
        return text.replace(/\[\[\$\{([^}]+)\}\]\]/g, function (_, key) {
            const v = PREVIEW_VARS[key.trim()];
            return v == null ? '[' + key.trim() + ']' : String(v);
        });
    }

    function bindActions() {
        ['tplTitle', 'tplBody'].forEach(function (id) {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', renderPreview);
        });

        document.getElementById('btnTplReset')?.addEventListener('click', function () {
            if (!original) return;
            setVal('tplTitle', original.title);
            setVal('tplBody',  original.body);
            setVal('tplLink',  original.link || '');
            setVal('tplColor', original.color || '');
            const cb = document.getElementById('tplEnabled');
            if (cb) cb.checked = !!original.isEnabled;
            renderPreview();
        });

        document.getElementById('btnTplSave')?.addEventListener('click', save);
    }

    function save() {
        if (!currentType) return;
        const cb = document.getElementById('tplEnabled');
        const payload = {
            title: getVal('tplTitle'),
            body:  getVal('tplBody'),
            link:  getVal('tplLink'),
            color: getVal('tplColor'),
            isEnabled: cb ? !!cb.checked : true
        };

        fetch('/api/admin/notifications/templates/' + encodeURIComponent(currentType), {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (res) {
                if (res.status === 403) throw new Error('FORBIDDEN');
                if (!res.ok) throw new Error('SAVE_FAILED');
                return res.json();
            })
            .then(function (saved) {
                // 로컬 캐시 갱신
                templates = templates.map(function (t) {
                    return t.notificationType === saved.notificationType ? saved : t;
                });
                renderList();
                select(saved.notificationType);
                Swal.fire({ icon: 'success', title: '저장되었습니다',
                    timer: 1200, showConfirmButton: false });
            })
            .catch(function (err) {
                console.error('[Templates] 저장 실패', err);
                Swal.fire({ icon: 'error', title: '저장에 실패했습니다',
                    text: '잠시 후 다시 시도해 주세요.' });
            });
    }

    function setVal(id, v) {
        const el = document.getElementById(id);
        if (el) el.value = v == null ? '' : v;
    }

    function getVal(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    }

    function escapeHtml(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
})();
