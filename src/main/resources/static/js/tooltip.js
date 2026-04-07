/**
 * 공유 툴팁 모듈
 *
 * 사용법:
 *   <button data-tip="새로고침"><i class="fas fa-sync"></i></button>
 *   <button data-tip="줄1\n줄2" data-tip-position="bottom">...</button>
 *
 * 동적 텍스트 갱신:
 *   el.dataset.tip = '서버 정상 (응답: 123ms)';
 *
 * 특징:
 *   - position: fixed → 부모 overflow:hidden|auto 영향 없음
 *   - mouseover/mouseout 위임 (자식 요소 이동 시 깜빡임 방지)
 *   - 화면 위/아래 공간 부족 시 자동 flip, 좌우 viewport 경계 클램프
 *   - DEV/LOCAL 환경 배너(.env-banner) 높이만큼 top clearance 자동 보정
 *   - 사이드바(.sidebar)는 자체 CSS-only 시스템(data-tooltip) 유지 → 무시
 *   - HTML 콘텐츠 미지원 (textContent 렌더, XSS 방지)
 *   - 리터럴 <br> → \n 변환 (속성에 직접 <br> 작성한 경우 호환)
 */
(function () {
    'use strict';

    let tipEl = null;
    let currentTarget = null;

    function getTopClearance() {
        const banner = document.querySelector('.env-banner');
        return banner ? banner.offsetHeight + 4 : 4;
    }

    function normalizeText(raw) {
        if (raw == null) return '';
        // 리터럴 <br>, <br/>, <br /> 를 줄바꿈으로 변환
        return String(raw).replace(/<br\s*\/?>/gi, '\n');
    }

    function showTooltip(target) {
        const text = normalizeText(target.getAttribute('data-tip'));
        if (!text) return;
        removeTooltip();

        tipEl = document.createElement('div');
        tipEl.className = 'app-tooltip';
        tipEl.textContent = text;
        document.body.appendChild(tipEl);

        const rect = target.getBoundingClientRect();
        const tipRect = tipEl.getBoundingClientRect();
        const position = target.getAttribute('data-tip-position') || 'top';
        const topClearance = getTopClearance();
        const margin = 8;

        let top;
        if (position === 'bottom') {
            top = rect.bottom + margin;
            // 아래 공간 부족 시 위로 flip
            if (top + tipRect.height > window.innerHeight - 4) {
                top = rect.top - tipRect.height - margin;
            }
        } else {
            top = rect.top - tipRect.height - margin;
            // 위 공간 부족(환경 배너 포함) 시 아래로 flip
            if (top < topClearance) {
                top = rect.bottom + margin;
            }
        }

        let left = rect.left + rect.width / 2 - tipRect.width / 2;
        // 좌우 viewport 경계 클램프
        if (left < 4) left = 4;
        const maxLeft = window.innerWidth - tipRect.width - 4;
        if (left > maxLeft) left = maxLeft;

        tipEl.style.top = top + 'px';
        tipEl.style.left = left + 'px';
        currentTarget = target;
    }

    function removeTooltip() {
        if (tipEl) {
            tipEl.remove();
            tipEl = null;
        }
        currentTarget = null;
    }

    document.addEventListener('mouseover', function (e) {
        if (!e.target || !e.target.closest) return;
        const target = e.target.closest('[data-tip]');
        if (!target) return;
        // 사이드바는 자체 CSS-only 툴팁(data-tooltip) 사용 → 무시
        if (target.closest('.sidebar')) return;
        if (target === currentTarget) return;
        showTooltip(target);
    });

    document.addEventListener('mouseout', function (e) {
        if (!e.target || !e.target.closest) return;
        const target = e.target.closest('[data-tip]');
        if (!target) return;
        // 자식 요소로 이동한 경우는 무시
        const related = e.relatedTarget;
        if (related && target.contains(related)) return;
        removeTooltip();
    });

    // 스크롤·리사이즈·ESC 시 정리
    window.addEventListener('scroll', removeTooltip, true);
    window.addEventListener('resize', removeTooltip);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') removeTooltip();
    });
})();
