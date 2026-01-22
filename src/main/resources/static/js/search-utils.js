/**
 * 검색 유틸리티 - 초성 검색 및 하이라이트
 *
 * 사용법:
 * const searchUtils = new SearchUtils();
 *
 * // 검색어 매칭 확인
 * if (searchUtils.matchesSearch(text, keyword)) { ... }
 *
 * // 하이라이트 적용
 * const highlighted = searchUtils.highlightText(text, keyword);
 */
class SearchUtils {
    constructor() {
        // 한글 초성 배열
        this.CHO_HANGUL = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    }

    /**
     * 한글 문자열을 초성으로 변환
     * @param {string} str - 변환할 문자열
     * @returns {string} 초성 문자열
     *
     * @example
     * getChosung('프로젝트') // 'ㅍㄹㅈㅌ'
     */
    getChosung(str) {
        if (!str) return '';

        let result = '';
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i) - 44032;
            if (code > -1 && code < 11172) {
                // 한글 유니코드 범위 내
                result += this.CHO_HANGUL[Math.floor(code / 588)];
            } else {
                // 한글이 아닌 경우 그대로 추가
                result += str.charAt(i);
            }
        }
        return result;
    }

    /**
     * 검색어가 텍스트와 매칭되는지 확인 (일반 검색 + 초성 검색)
     * @param {string} text - 검색 대상 텍스트
     * @param {string} keyword - 검색어
     * @returns {boolean} 매칭 여부
     *
     * @example
     * matchesSearch('프로젝트 주간보고', 'ㅍㅈㅌ') // true
     * matchesSearch('프로젝트 주간보고', '주간') // true
     */
    matchesSearch(text, keyword) {
        if (!text || !keyword) return true;

        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();

        // 1. 일반 텍스트 검색
        if (lowerText.includes(lowerKeyword)) {
            return true;
        }

        // 2. 초성 검색
        const chosung = this.getChosung(text);
        return chosung.includes(keyword);
    }

    /**
     * 검색어에 매칭되는 부분을 하이라이트 처리
     * @param {string} text - 하이라이트할 텍스트
     * @param {string} keyword - 검색어
     * @param {string} highlightClass - 하이라이트 CSS 클래스 (기본값: 'search-highlight')
     * @returns {string} 하이라이트가 적용된 HTML 문자열
     *
     * @example
     * highlightText('프로젝트', 'ㅍㅈ')
     * // '<mark class="search-highlight">프</mark>로<mark class="search-highlight">젝</mark>트'
     */
    highlightText(text, keyword, highlightClass = 'search-highlight') {
        if (!text || !keyword) return text;

        const lowerText = text.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();

        // 1. 일반 텍스트 매칭
        if (lowerText.includes(lowerKeyword)) {
            // 대소문자 구분 없이 매칭
            const regex = new RegExp(`(${this.escapeRegExp(keyword)})`, 'gi');
            return text.replace(regex, `<mark class="${highlightClass}">$1</mark>`);
        }

        // 2. 초성 매칭
        const chosung = this.getChosung(text);
        if (chosung.includes(keyword)) {
            let result = '';
            let keywordIndex = 0;

            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const code = text.charCodeAt(i) - 44032;

                if (code > -1 && code < 11172) {
                    // 한글인 경우
                    const cho = this.CHO_HANGUL[Math.floor(code / 588)];
                    if (keywordIndex < keyword.length && cho === keyword[keywordIndex]) {
                        result += `<mark class="${highlightClass}">${char}</mark>`;
                        keywordIndex++;
                    } else {
                        result += char;
                    }
                } else {
                    // 한글이 아닌 경우
                    result += char;
                }
            }
            return result;
        }

        return text;
    }

    /**
     * 정규식 특수문자 이스케이프
     * @param {string} string - 이스케이프할 문자열
     * @returns {string} 이스케이프된 문자열
     * @private
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 여러 필드에서 검색어 매칭 확인
     * @param {string} keyword - 검색어
     * @param {...string} texts - 검색할 텍스트들
     * @returns {boolean} 하나라도 매칭되면 true
     *
     * @example
     * matchesAny('ㅍㅈㅌ', '프로젝트', '주간보고', '작성자') // true
     */
    matchesAny(keyword, ...texts) {
        if (!keyword) return true;
        return texts.some(text => this.matchesSearch(text || '', keyword));
    }

    /**
     * 객체의 특정 필드들에서 검색어 매칭 확인
     * @param {object} obj - 검색 대상 객체
     * @param {string} keyword - 검색어
     * @param {string[]} fields - 검색할 필드명 배열
     * @returns {boolean} 매칭 여부
     *
     * @example
     * const doc = { title: '프로젝트', author: '홍길동' };
     * matchesObject(doc, 'ㅍㅈ', ['title', 'author']) // true
     */
    matchesObject(obj, keyword, fields) {
        if (!keyword || !obj) return true;
        const texts = fields.map(field => String(obj[field] || ''));
        return this.matchesAny(keyword, ...texts);
    }

    /**
     * DOM 요소에서 텍스트를 추출하고 하이라이트 적용
     * @param {HTMLElement} element - 대상 요소
     * @param {string} keyword - 검색어
     * @param {string} highlightClass - 하이라이트 CSS 클래스
     *
     * @example
     * const el = document.querySelector('.title');
     * searchUtils.highlightElement(el, 'ㅍㅈㅌ');
     */
    highlightElement(element, keyword, highlightClass = 'search-highlight') {
        if (!element || !keyword) return;

        const originalText = element.textContent;
        const highlightedHtml = this.highlightText(originalText, keyword, highlightClass);

        if (highlightedHtml !== originalText) {
            element.innerHTML = highlightedHtml;
        }
    }

    /**
     * 여러 DOM 요소에 하이라이트 적용
     * @param {NodeList|Array} elements - 대상 요소들
     * @param {string} keyword - 검색어
     * @param {string} highlightClass - 하이라이트 CSS 클래스
     *
     * @example
     * const titles = document.querySelectorAll('.doc-title');
     * searchUtils.highlightElements(titles, 'ㅍㅈㅌ');
     */
    highlightElements(elements, keyword, highlightClass = 'search-highlight') {
        if (!elements || !keyword) return;

        elements.forEach(element => {
            this.highlightElement(element, keyword, highlightClass);
        });
    }

    /**
     * 테이블 행 필터링 (검색어에 매칭되지 않는 행 숨김)
     * @param {NodeList|Array} rows - 테이블 행들
     * @param {string} keyword - 검색어
     * @param {Function} getSearchText - 행에서 검색 텍스트를 추출하는 함수
     * @returns {Array} 필터링된 행 배열
     *
     * @example
     * const rows = document.querySelectorAll('tr.data-row');
     * const filtered = searchUtils.filterTableRows(rows, 'ㅍㅈㅌ', (row) => {
     *     return row.querySelector('.title').textContent;
     * });
     */
    filterTableRows(rows, keyword, getSearchText) {
        if (!rows) return [];

        const filtered = [];

        rows.forEach(row => {
            const searchText = getSearchText ? getSearchText(row) : row.textContent;
            const matches = this.matchesSearch(searchText, keyword);

            if (matches) {
                row.style.display = '';
                filtered.push(row);
            } else {
                row.style.display = 'none';
            }
        });

        return filtered;
    }
}

// 전역에서 사용할 수 있도록 인스턴스 생성
window.SearchUtils = SearchUtils;
