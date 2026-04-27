/**
 * 공통 파일 미리보기 모달
 *
 * 사용:
 *   window.openFilePreview([
 *       { url: '/api/.../download/123', filename: 'invoice.pdf' },
 *       {
 *           url: '/api/.../download/124',
 *           filename: 'receipt.jpg',
 *           // (선택) 파일과 함께 보여줄 메타정보 — 검증용 비교 데이터
 *           meta: [
 *               { label: '지출일', value: '2026-04-01' },
 *               { label: '적요',   value: '야근식대' },
 *               { label: '금액',   value: '12,000원' }
 *           ]
 *       }
 *   ], 0);
 *
 * - PDF / 이미지(jpg, png, gif, webp, bmp, svg) 는 모달 안에서 렌더링
 * - 그 외 파일은 "미리보기 불가" 메시지 + 다운로드 안내
 * - 여러 파일이면 좌우 화살표 + 키보드(←/→)로 네비게이션
 * - ESC 로 닫기
 *
 * 백엔드 다운로드 API 가 application/octet-stream 으로 응답하더라도
 * fetch → blob 후 확장자로 추론한 MIME 타입을 다시 부여하므로 inline 렌더링이 가능하다.
 */
(function () {
    'use strict';

    let currentFiles = [];
    let currentIndex = 0;
    let currentBlobUrl = null;

    const MIME_MAP = {
        pdf: 'application/pdf',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        bmp: 'image/bmp',
        svg: 'image/svg+xml',
    };

    const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];

    function getExt(name) {
        if (!name) return '';
        const i = name.lastIndexOf('.');
        return i >= 0 ? name.substring(i + 1).toLowerCase() : '';
    }

    function getMime(name) {
        return MIME_MAP[getExt(name)] || 'application/octet-stream';
    }

    function isPreviewable(name) {
        const ext = getExt(name);
        return ext === 'pdf' || IMAGE_EXTS.includes(ext);
    }

    function isImage(name) {
        return IMAGE_EXTS.includes(getExt(name));
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function clearBlobUrl() {
        if (currentBlobUrl) {
            URL.revokeObjectURL(currentBlobUrl);
            currentBlobUrl = null;
        }
    }

    function ensureModal() {
        let overlay = document.getElementById('filePreviewOverlay');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'filePreviewOverlay';
        overlay.className = 'file-preview-overlay';
        overlay.innerHTML = `
            <div class="file-preview-modal" role="dialog" aria-modal="true">
                <div class="file-preview-header">
                    <div class="file-preview-title">
                        <i class="fas fa-file"></i>
                        <span class="file-preview-filename"></span>
                        <span class="file-preview-counter"></span>
                    </div>
                    <button type="button" class="file-preview-close" aria-label="닫기">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="file-preview-meta" style="display:none;"></div>
                <div class="file-preview-body">
                    <button type="button" class="file-preview-nav file-preview-prev" aria-label="이전 파일">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <div class="file-preview-content"></div>
                    <button type="button" class="file-preview-nav file-preview-next" aria-label="다음 파일">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="file-preview-footer">
                    <button type="button" class="file-preview-download">
                        <i class="fas fa-download"></i> 다운로드
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
        overlay.querySelector('.file-preview-close').addEventListener('click', closeModal);
        overlay.querySelector('.file-preview-prev').addEventListener('click', () => navigate(-1));
        overlay.querySelector('.file-preview-next').addEventListener('click', () => navigate(1));
        overlay.querySelector('.file-preview-download').addEventListener('click', downloadCurrent);

        return overlay;
    }

    function navigate(delta) {
        const n = currentFiles.length;
        if (n <= 1) return;
        currentIndex = (currentIndex + delta + n) % n;
        renderCurrent();
    }

    function downloadCurrent() {
        const f = currentFiles[currentIndex];
        if (!f) return;
        const a = document.createElement('a');
        a.href = f.url;
        if (f.filename) a.download = f.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    async function renderCurrent() {
        const overlay = document.getElementById('filePreviewOverlay');
        if (!overlay) return;

        const f = currentFiles[currentIndex];
        if (!f) return;

        overlay.querySelector('.file-preview-filename').textContent = f.filename || '파일';
        const counter = overlay.querySelector('.file-preview-counter');
        counter.textContent = currentFiles.length > 1 ? `(${currentIndex + 1} / ${currentFiles.length})` : '';

        // 메타 정보 (지출일/적요/금액 등 검증용 비교 데이터) 렌더링
        const metaEl = overlay.querySelector('.file-preview-meta');
        if (Array.isArray(f.meta) && f.meta.length > 0) {
            metaEl.innerHTML = f.meta.map(m => `
                <div class="file-preview-meta-item">
                    <span class="file-preview-meta-label">${escapeHtml(m.label)}</span>
                    <span class="file-preview-meta-value">${escapeHtml(m.value)}</span>
                </div>
            `).join('');
            metaEl.style.display = '';
        } else {
            metaEl.innerHTML = '';
            metaEl.style.display = 'none';
        }

        const showNav = currentFiles.length > 1;
        overlay.querySelector('.file-preview-prev').style.display = showNav ? '' : 'none';
        overlay.querySelector('.file-preview-next').style.display = showNav ? '' : 'none';

        const content = overlay.querySelector('.file-preview-content');
        clearBlobUrl();

        if (!isPreviewable(f.filename)) {
            content.innerHTML = `
                <div class="file-preview-unsupported">
                    <i class="fas fa-file-alt"></i>
                    <p>이 파일 형식은 미리보기를 지원하지 않습니다.</p>
                    <p class="file-preview-unsupported-name">${escapeHtml(f.filename || '')}</p>
                    <p class="file-preview-hint">아래 다운로드 버튼을 이용해주세요.</p>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="file-preview-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>파일을 불러오는 중...</span>
            </div>
        `;

        // 비동기 로드 도중 사용자가 빠르게 다음 파일로 이동했을 때
        // 이전 fetch 결과로 화면을 덮어쓰지 않도록 인덱스 비교
        const requestedIndex = currentIndex;

        try {
            const res = await fetch(f.url);
            if (!res.ok) throw new Error('파일을 불러올 수 없습니다.');
            const blob = await res.blob();

            if (requestedIndex !== currentIndex) return; // 사용자가 그 사이 다른 파일로 이동함

            const typedBlob = new Blob([blob], { type: getMime(f.filename) });
            currentBlobUrl = URL.createObjectURL(typedBlob);

            if (isImage(f.filename)) {
                content.innerHTML = `<img src="${currentBlobUrl}" alt="${escapeHtml(f.filename)}" class="file-preview-image">`;
            } else {
                content.innerHTML = `<iframe src="${currentBlobUrl}" class="file-preview-iframe" title="${escapeHtml(f.filename)}"></iframe>`;
            }
        } catch (err) {
            console.error('[파일 미리보기]', err);
            if (requestedIndex !== currentIndex) return;
            content.innerHTML = `
                <div class="file-preview-unsupported">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>파일을 표시할 수 없습니다.</p>
                    <p class="file-preview-hint">파일을 내려받아 확인하거나, 창을 닫고 다시 열어 주세요.</p>
                </div>
            `;
        }
    }

    function closeModal() {
        const overlay = document.getElementById('filePreviewOverlay');
        if (overlay) overlay.classList.remove('active');
        clearBlobUrl();
        document.removeEventListener('keydown', handleKey);
    }

    function handleKey(e) {
        if (e.key === 'Escape') closeModal();
        else if (e.key === 'ArrowLeft') navigate(-1);
        else if (e.key === 'ArrowRight') navigate(1);
    }

    /**
     * 파일 미리보기 모달을 띄운다.
     * @param {Array<{url: string, filename: string}>} files - 미리보기할 파일 배열
     * @param {number} [startIndex=0] - 시작 인덱스
     */
    window.openFilePreview = function (files, startIndex = 0) {
        if (!files || files.length === 0) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'info', title: '파일 없음', text: '미리보기할 파일이 없습니다.' });
            }
            return;
        }
        currentFiles = files.filter(f => f && f.url);
        if (currentFiles.length === 0) return;
        currentIndex = Math.max(0, Math.min(startIndex, currentFiles.length - 1));

        const overlay = ensureModal();
        overlay.classList.add('active');
        document.addEventListener('keydown', handleKey);
        renderCurrent();
    };
})();
