/* ============================================================
 * MarkdownLite — 알림·공지 본문용 가벼운 Markdown 렌더
 *
 * - 풀 Markdown 호환 X. 사내에서 사용하는 일부 패턴만 지원.
 * - Mattermost 측 렌더는 별도 — 이 함수는 그룹웨어 화면에 표시되는 인박스/공지 미리보기 전용.
 *
 * 사용:
 *   MarkdownLite.render(text)                        // inline (굵게, 기울임, 링크, 코드, <br>)
 *   MarkdownLite.render(text, { block: true })       // + 헤딩 ## , - 리스트, 빈 줄로 단락 분리
 *
 * window.MarkdownLite 로 노출. 사용 전에 markdown-lite.js 가 먼저 로드되어 있어야 함.
 * ============================================================ */

(function () {
    'use strict';

    function escapeHtml(s) {
        const div = document.createElement('div');
        div.textContent = s == null ? '' : s;
        return div.innerHTML;
    }

    function applyInlinePatterns(html) {
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
        html = html.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
                '<a href="$2" target="_blank" rel="noopener">$1</a>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        return html;
    }

    function renderInline(text) {
        let html = escapeHtml(text);
        html = applyInlinePatterns(html);
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    function renderBlock(text) {
        let html = escapeHtml(text);

        // ## 소제목
        html = html.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');

        // - 리스트 (연속 라인을 한 그룹으로)
        html = html.replace(/(?:^|\n)((?:[-•]\s+.+(?:\n|$))+)/g, function (m, group) {
            const items = group.trim().split(/\n/).map(line =>
                    '<li>' + line.replace(/^[-•]\s+/, '') + '</li>').join('');
            return '\n<ul>' + items + '</ul>';
        });

        html = applyInlinePatterns(html);

        // 빈 줄로 단락 분리, 단락 내부 줄바꿈은 <br>
        const blocks = html.split(/\n{2,}/).map(b => {
            const trimmed = b.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('<h3>') || trimmed.startsWith('<ul>')) return trimmed;
            return '<p>' + trimmed.replace(/\n/g, '<br>') + '</p>';
        });
        return blocks.join('\n');
    }

    window.MarkdownLite = {
        render: function (text, opts) {
            if (!text) return '';
            return (opts && opts.block) ? renderBlock(text) : renderInline(text);
        }
    };
})();
