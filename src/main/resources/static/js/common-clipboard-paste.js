/**
 * common-clipboard-paste.js
 *
 * 클립보드 이미지 붙여넣기 + 이미지 첨부 칩 썸네일 공통 유틸
 *
 * 4개 함수 export (window 객체):
 *   - setupClipboardImagePaste(options)  : 페이지에 paste 핸들러 등록
 *   - createImageThumbFromFile(file)     : 클라이언트 File로 썸네일 <img> 생성 (blob URL)
 *   - createImageThumbFromUrl(url, name) : 서버 다운로드 URL로 썸네일 <img> 생성
 *   - revokeChipThumbs(rootEl)           : 영역 안의 모든 blob URL 정리
 *
 * 자세한 설계: docs/clipboard-image-paste-plan.md
 */
(function () {
    'use strict';

    // ============================================
    // 1. 내부 유틸
    // ============================================

    const IMAGE_EXT_RE = /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i;

    function isImageFilename(name) {
        return typeof name === 'string' && IMAGE_EXT_RE.test(name);
    }

    function formatTimestamp(d) {
        const pad = n => String(n).padStart(2, '0');
        return (
            d.getFullYear().toString() +
            pad(d.getMonth() + 1) +
            pad(d.getDate()) +
            '_' +
            pad(d.getHours()) +
            pad(d.getMinutes()) +
            pad(d.getSeconds())
        );
    }

    function safeShowToast(message, icon) {
        if (typeof window.showToast === 'function') {
            window.showToast(message, icon || 'info');
        } else {
            // 폴백 — common-alert.js가 아직 로드되지 않은 경우
            console.log('[clipboard-paste]', message);
        }
    }

    // ============================================
    // 2. setupClipboardImagePaste — 메인 헬퍼
    // ============================================

    /**
     * 페이지에 clipboard paste 핸들러를 등록한다.
     *
     * @param {Object} options
     * @param {Element} [options.listenOn=document]   - paste 이벤트를 받을 노드
     * @param {string}  [options.ignoreInside]        - 이 셀렉터에 매치되는 노드 안에서 일어난 paste는 무시
     * @param {Function} options.resolveTarget        - (event) => { addFile(file): void, label: string } | null
     *                                                  null 반환 시 활성 슬롯 없음으로 간주
     * @param {string}  [options.filenamePrefix='clipboard'] - 자동 생성 파일명 prefix
     */
    window.setupClipboardImagePaste = function (options) {
        const opt = options || {};
        const listenOn = opt.listenOn || document;
        const ignoreInside = opt.ignoreInside || 'input, textarea, [contenteditable="true"]';
        const resolveTarget = opt.resolveTarget;
        const filenamePrefix = opt.filenamePrefix || 'clipboard';

        if (typeof resolveTarget !== 'function') {
            console.warn('[clipboard-paste] resolveTarget is required');
            return;
        }

        listenOn.addEventListener('paste', function (event) {
            // (1) 텍스트 입력 필드 안의 paste는 절대 가로채지 않음
            const target = event.target;
            if (target && target.closest && target.closest(ignoreInside)) {
                return;
            }

            // (2) 클립보드에서 이미지 파일만 추출
            const cd = event.clipboardData;
            if (!cd) return;

            const imageItems = [];
            const items = cd.items || [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file' && item.type && item.type.startsWith('image/')) {
                    imageItems.push(item);
                }
            }

            // (3) 이미지가 0개인 경우 — 활성 슬롯이 있으면 친절 안내, 없으면 통과
            if (imageItems.length === 0) {
                let handler = null;
                try {
                    handler = resolveTarget(event);
                } catch (err) {
                    console.error('[clipboard-paste] resolveTarget error:', err);
                    return;
                }
                if (handler) {
                    event.preventDefault();
                    safeShowToast('텍스트는 붙여넣을 수 없습니다. 이미지를 캡처해서 다시 시도하세요.', 'info');
                }
                return;
            }

            // (4) 이미지가 1개 이상인 경우 — 활성 슬롯 확인
            let handler = null;
            try {
                handler = resolveTarget(event);
            } catch (err) {
                console.error('[clipboard-paste] resolveTarget error:', err);
                return;
            }

            if (!handler) {
                event.preventDefault();
                safeShowToast('먼저 붙여넣을 슬롯(영수증 영역 또는 지출 항목)을 클릭하세요.', 'info');
                return;
            }

            event.preventDefault();

            // (5) 각 이미지를 File로 변환 후 핸들러에 전달
            const ts = formatTimestamp(new Date());
            let added = 0;
            imageItems.forEach((item, i) => {
                const blob = item.getAsFile();
                if (!blob) return;
                const ext = (blob.type.split('/')[1] || 'png').toLowerCase().replace('jpeg', 'jpg');
                const filename =
                    imageItems.length === 1
                        ? `${filenamePrefix}_${ts}.${ext}`
                        : `${filenamePrefix}_${ts}_${i + 1}.${ext}`;
                const file = new File([blob], filename, { type: blob.type });
                try {
                    const ok = handler.addFile(file);
                    if (ok !== false) added++;
                } catch (err) {
                    console.error('[clipboard-paste] addFile error:', err);
                }
            });

            // (6) 성공 토스트
            if (added > 0) {
                const label = handler.label || '첨부';
                safeShowToast(`${label}에 이미지 ${added}개 추가됨`, 'success');
            }
        });
    };

    // ============================================
    // 3. 썸네일 유틸 — createImageThumbFromFile / Url
    // ============================================

    /**
     * 클라이언트 File 객체로 썸네일 <img> 엘리먼트 생성.
     * - file이 이미지가 아니면 null 반환 (호출자는 기존 아이콘 유지)
     * - 클릭 시 file-preview-modal 호출 (전체 미리보기)
     * - dataset.previewUrl 에 blob URL 저장 → revokeChipThumbs로 정리 가능
     *
     * @param {File} file
     * @param {Object} [options]
     * @param {Array}  [options.meta] - file-preview-modal에 함께 전달할 메타정보
     * @returns {HTMLImageElement|null}
     */
    window.createImageThumbFromFile = function (file, options) {
        if (!file || !file.type || !file.type.startsWith('image/')) return null;

        const url = URL.createObjectURL(file);
        const img = document.createElement('img');
        img.src = url;
        img.className = 'file-chip-thumb';
        img.alt = file.name;
        img.title = file.name;
        img.dataset.previewUrl = url;
        img.addEventListener('click', function (e) {
            e.stopPropagation();
            if (typeof window.openFilePreview === 'function') {
                const f = { url: url, filename: file.name };
                if (options && Array.isArray(options.meta)) f.meta = options.meta;
                window.openFilePreview([f], 0);
            }
        });
        return img;
    };

    /**
     * 서버 다운로드 URL로 썸네일 <img> 엘리먼트 생성.
     * - 수정 모드의 기존 첨부에 사용
     * - filename이 이미지 확장자가 아니면 null 반환
     *
     * @param {string} downloadUrl
     * @param {string} filename
     * @param {Object} [options]
     * @returns {HTMLImageElement|null}
     */
    window.createImageThumbFromUrl = function (downloadUrl, filename, options) {
        if (!isImageFilename(filename)) return null;

        const img = document.createElement('img');
        img.src = downloadUrl;
        img.className = 'file-chip-thumb';
        img.alt = filename;
        img.title = filename;
        img.addEventListener('click', function (e) {
            e.stopPropagation();
            if (typeof window.openFilePreview === 'function') {
                const f = { url: downloadUrl, filename: filename };
                if (options && Array.isArray(options.meta)) f.meta = options.meta;
                window.openFilePreview([f], 0);
            }
        });
        return img;
    };

    /**
     * 이미 innerHTML로 만들어진 file-item/file-chip 안의 아이콘(<i class="fas ...">)을
     * 이미지일 경우 썸네일 <img>로 교체한다. 화면별 칩 렌더러를 최소 변경으로 패치하기 위한 헬퍼.
     *
     * @param {HTMLElement} itemEl - 칩/파일아이템 컨테이너
     * @param {File|Blob|string} fileOrUrl - 클라이언트 File/Blob 또는 서버 다운로드 URL
     * @param {string} [filename] - URL을 넘긴 경우 파일명 (확장자 판단용)
     */
    window.attachThumbToFileItem = function (itemEl, fileOrUrl, filename) {
        if (!itemEl) return;
        const iconEl = itemEl.querySelector('i.fas, i.far, i.fab');
        if (!iconEl) return;

        let thumb = null;
        if (fileOrUrl && (fileOrUrl instanceof File || fileOrUrl instanceof Blob)) {
            thumb = window.createImageThumbFromFile(fileOrUrl);
        } else if (typeof fileOrUrl === 'string') {
            thumb = window.createImageThumbFromUrl(fileOrUrl, filename || '');
        }
        if (thumb) iconEl.replaceWith(thumb);
    };

    /**
     * 영역 안의 모든 썸네일 blob URL을 revoke한다.
     * 재렌더링/항목 삭제/페이지 unload 직전에 호출.
     */
    window.revokeChipThumbs = function (rootEl) {
        if (!rootEl) return;
        const thumbs = rootEl.querySelectorAll('img.file-chip-thumb[data-preview-url]');
        thumbs.forEach(function (img) {
            try {
                URL.revokeObjectURL(img.dataset.previewUrl);
            } catch (_) {
                /* noop */
            }
        });
    };

    // ============================================
    // 4. 페이지 unload 안전망
    // ============================================
    window.addEventListener('beforeunload', function () {
        window.revokeChipThumbs(document);
    });

    // ============================================
    // 5. 외부에서 쓸 수 있는 헬퍼
    // ============================================
    window.isImageFilename = window.isImageFilename || isImageFilename;
})();
