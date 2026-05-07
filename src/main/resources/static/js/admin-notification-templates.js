/* =========================================================
 * /admin/notifications/templates — 템플릿 편집 (Phase 1)
 * ========================================================= */

(function () {
    'use strict';

    let currentCode = null;

    document.addEventListener('DOMContentLoaded', function () {
        const root = document.getElementById('notifTemplatesRoot');
        if (!root) return;

        renderTemplateList();
        // 첫 활성 항목을 기본 선택
        const first = window.NOTIF_DUMMY.TYPES.find(function (t) { return t.enabledByDefault; });
        if (first) selectTemplate(first.code);

        bindEditorActions();
    });

    function renderTemplateList() {
        const list = document.getElementById('templateList');
        if (!list) return;

        const tmpls = window.NOTIF_DUMMY.TEMPLATES;
        list.innerHTML = window.NOTIF_DUMMY.TYPES.map(function (t) {
            const tpl = tmpls[t.code] || {};
            const cls = ['template-list-item', tpl.isEnabled ? '' : 'disabled'].filter(Boolean).join(' ');
            const status = tpl.isEnabled ? '<span class="item-status enabled">활성</span>' : '<span class="item-status disabled">비활성</span>';
            return (
                '<div class="' + cls + '" data-code="' + t.code + '">' +
                '  <span class="item-name">' + escapeHtml(t.name) + '</span>' +
                status +
                '</div>'
            );
        }).join('');

        list.addEventListener('click', function (e) {
            const item = e.target.closest('.template-list-item');
            if (item) selectTemplate(item.dataset.code);
        });
    }

    function selectTemplate(code) {
        currentCode = code;
        const tmpls = window.NOTIF_DUMMY.TEMPLATES;
        const types = window.NOTIF_DUMMY.TYPES;
        const tpl = tmpls[code];
        const meta = types.find(function (t) { return t.code === code; });
        if (!tpl || !meta) return;

        // 활성 표시
        document.querySelectorAll('.template-list-item').forEach(function (el) {
            el.classList.toggle('active', el.dataset.code === code);
        });

        // 헤더
        const titleEl = document.querySelector('#templateEditor .editor-title');
        if (titleEl) titleEl.textContent = meta.name;

        // 입력 필드
        setVal('tplTitle',   tpl.title);
        setVal('tplBody',    tpl.body);
        setVal('tplLink',    tpl.link);
        setVal('tplColor',   tpl.color);
        const cb = document.getElementById('tplEnabled');
        if (cb) cb.checked = tpl.isEnabled;

        // 변수 토큰
        renderVarTokens(tpl);
        // 미리보기
        renderPreview();
    }

    function renderVarTokens(tpl) {
        const wrap = document.getElementById('varTokens');
        if (!wrap) return;
        const used = extractVars(tpl.title + ' ' + tpl.body + ' ' + (tpl.link || ''));
        wrap.innerHTML = used.map(function (v) {
            return '<span class="var-token" data-var="' + v + '">[[${' + v + '}]]</span>';
        }).join('');

        wrap.addEventListener('click', function (e) {
            const tok = e.target.closest('.var-token');
            if (!tok) return;
            const ta = document.getElementById('tplBody');
            if (!ta) return;
            const insert = '[[${' + tok.dataset.var + '}]]';
            const start = ta.selectionStart, end = ta.selectionEnd;
            ta.value = ta.value.slice(0, start) + insert + ta.value.slice(end);
            ta.focus();
            ta.selectionStart = ta.selectionEnd = start + insert.length;
            renderPreview();
        });
    }

    function extractVars(s) {
        const out = new Set();
        const re = /\[\[\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}\]\]/g;
        let m;
        while ((m = re.exec(s || '')) !== null) out.add(m[1]);
        return Array.from(out);
    }

    function renderPreview() {
        const titleSrc = document.getElementById('tplTitle')?.value || '';
        const bodySrc  = document.getElementById('tplBody')?.value  || '';
        const vars = window.NOTIF_DUMMY.PREVIEW_VARS;

        const renderedTitle = thymeleafRender(titleSrc, vars);
        const renderedBody  = thymeleafRender(bodySrc,  vars);

        const out = document.getElementById('templatePreview');
        if (!out) return;

        out.innerHTML =
            '<div class="preview-label">실제 발송됐을 때 사용자에게 보이는 모양</div>' +
            '<div class="preview-mm">' +
            '  <div class="preview-title">' + escapeHtml(renderedTitle) + '</div>' +
            '  <div class="preview-body">' + escapeHtml(renderedBody) + '</div>' +
            '</div>';
    }

    function thymeleafRender(s, vars) {
        return (s || '').replace(/\[\[\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}\]\]/g, function (_, name) {
            return (vars[name] != null) ? String(vars[name]) : '[[${' + name + '}]]';
        });
    }

    function bindEditorActions() {
        ['tplTitle', 'tplBody', 'tplLink'].forEach(function (id) {
            document.getElementById(id)?.addEventListener('input', renderPreview);
        });

        document.getElementById('btnTplSave')?.addEventListener('click', function () {
            if (!currentCode) return;
            Swal.fire({
                icon: 'success',
                title: '저장됨 (더미)',
                text: '실제 저장은 다음 작업 단계에서 연결됩니다.',
                timer: 1800,
                showConfirmButton: false
            });
        });

        document.getElementById('btnTplReset')?.addEventListener('click', function () {
            if (currentCode) selectTemplate(currentCode);
        });
    }

    function setVal(id, val) {
        const el = document.getElementById(id);
        if (el && val != null) el.value = val;
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
