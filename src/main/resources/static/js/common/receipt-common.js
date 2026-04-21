/**
 * 연구비증빙(회의록/야근식대/출장/출장+회의) 공통 유틸
 *
 * 모든 진입점은 window.ReceiptCommon 네임스페이스로 노출.
 * 로드 전제: SweetAlert2(Swal) + common-alert.js(showWarning/showError) — fragments/layout.html 에서 전역 로드됨.
 */
(function () {
    'use strict';

    const DUP_API = '/api/receipt-common/check-duplicate';

    // ───────────────────────── 공통 유틸 ─────────────────────────

    function isTimeOverlap(s1, e1, s2, e2) {
        return s1 < e2 && s2 < e1;
    }

    function trimHHmm(t) {
        return t ? String(t).substring(0, 5) : '';
    }

    function buildDupUrl({ date, attendeeIdx, projectIdx, startTime, endTime,
                           excludeReceiptIdx, excludeDocumentType, isExternal }) {
        const params = new URLSearchParams();
        params.set('date', date);
        params.set('attendeeIdx', String(attendeeIdx));
        params.set('projectIdx', String(projectIdx));
        if (startTime) params.set('startTime', startTime);
        if (endTime) params.set('endTime', endTime);
        if (excludeReceiptIdx) {
            params.set('excludeReceiptIdx', String(excludeReceiptIdx));
            if (excludeDocumentType) params.set('excludeDocumentType', excludeDocumentType);
        }
        if (isExternal) params.set('isExternal', 'true');
        return `${DUP_API}?${params.toString()}`;
    }

    // ─────────────────────── 중복 검증 API ───────────────────────

    /**
     * 중복 문서 원자 호출.
     * startTime/endTime이 모두 있으면 시간 겹침 필터까지 적용.
     * 실패/네트워크 오류 시 [] 반환(호출부에서 별도 처리).
     */
    async function fetchDuplicateDocs(opts) {
        if (!opts || !opts.date || !opts.attendeeIdx || !opts.projectIdx) return [];
        try {
            const res = await fetch(buildDupUrl(opts));
            if (!res.ok) return [];
            const ct = res.headers.get('content-type') || '';
            if (!ct.includes('application/json')) return [];
            const list = await res.json();
            if (!Array.isArray(list) || list.length === 0) return [];

            if (opts.startTime && opts.endTime) {
                return list.filter(d => {
                    const s = trimHHmm(d.startTime);
                    const e = trimHHmm(d.endTime);
                    if (!s || !e) return false;
                    return isTimeOverlap(s, e, opts.startTime, opts.endTime);
                });
            }
            return list;
        } catch (err) {
            console.warn('[ReceiptCommon.fetchDuplicateDocs] 오류:', err);
            return [];
        }
    }

    /** 단일 bool 판정 */
    async function hasDuplicate(opts) {
        const list = await fetchDuplicateDocs(opts);
        return list.length > 0;
    }

    /**
     * 복수 인원 일괄 중복 검사.
     * @param {Object} p
     * @param {Array<{id:number, isExternal?:boolean}>} p.persons
     * @param {string} p.date
     * @param {string|number} p.projectIdx
     * @param {string} [p.startTime]
     * @param {string} [p.endTime]
     * @param {number|string} [p.excludeReceiptIdx]
     * @param {string} [p.excludeDocumentType]
     * @returns {Promise<Record<string, {date,projectName,type,startTime,endTime,raw}|null>>}
     */
    async function scanDuplicatesForPersons(p) {
        const out = {};
        if (!p || !Array.isArray(p.persons) || p.persons.length === 0) return out;
        if (!p.date || !p.projectIdx) return out;

        const results = await Promise.all(
            p.persons.map(person => fetchDuplicateDocs({
                date: p.date,
                attendeeIdx: person.id,
                projectIdx: p.projectIdx,
                startTime: p.startTime,
                endTime: p.endTime,
                excludeReceiptIdx: p.excludeReceiptIdx,
                excludeDocumentType: p.excludeDocumentType,
                isExternal: person.isExternal
            }))
        );

        p.persons.forEach((person, i) => {
            const docs = results[i];
            if (docs && docs.length > 0) {
                const d = docs[0];
                out[person.id] = {
                    date: d.documentDate || d.date || p.date,
                    projectName: d.projectName || '',
                    type: d.typeName || d.type || '',
                    startTime: trimHHmm(d.startTime),
                    endTime: trimHHmm(d.endTime),
                    raw: d,
                    allDocs: docs
                };
            } else {
                out[person.id] = null;
            }
        });

        return out;
    }

    /**
     * 특정 인원의 지정 날짜 범위(일 단위) 내 중복 존재 여부.
     * 출장+회의의 날짜 루프 전용 헬퍼(시간 미사용).
     */
    async function hasAnyDuplicateOverDateRange({ empIdx, projectIdx, startDate, durationDays,
                                                  excludeReceiptIdx, excludeDocumentType }) {
        if (!empIdx || !projectIdx || !startDate || !durationDays) return false;
        const base = new Date(startDate);
        if (isNaN(base.getTime())) return false;

        for (let i = 0; i < durationDays; i++) {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${day}`;

            const dup = await hasDuplicate({
                date: dateStr,
                attendeeIdx: empIdx,
                projectIdx: projectIdx,
                excludeReceiptIdx,
                excludeDocumentType
            });
            if (dup) return true;
        }
        return false;
    }

    // ──────────────────── 기본 작성자 선택 ────────────────────

    /**
     * 정렬된 후보에서 rank 전략에 따라 1명 선택.
     * @param {Array} sortedAsc 낮은 직급→높은 직급 순 정렬된 배열
     * @param {string|Function} strategy
     *   - 'ascStep4'  : 낮은 직급 기준 sortedAsc[3] || sortedAsc[0]
     *   - 'descStep3' : 높은 직급 기준 reverse[2] || reverse[last]
     *   - custom fn(sortedAsc) -> item
     */
    function applyRankStrategy(sortedAsc, strategy) {
        if (!sortedAsc || sortedAsc.length === 0) return null;
        if (typeof strategy === 'function') return strategy(sortedAsc);
        if (strategy === 'descStep3') {
            const reversed = [...sortedAsc].reverse();
            return reversed[2] || reversed[reversed.length - 1];
        }
        // default: ascStep4
        return sortedAsc[3] || sortedAsc[0];
    }

    /**
     * 기본 작성자 선택.
     * 1순위: 로그인 사용자가 후보에 있고 중복 아니면 그 사람
     * 2순위: 중복 없는 후보만 모아 rankStrategy 적용
     * 3순위: 전원 중복이면 전체 후보에 rankStrategy 적용
     *
     * @param {Object} p
     * @param {Array}  p.candidates            [{id, name, position, positionCode, ...}]
     * @param {Function} p.getPositionOrder    (positionCode) => number (낮을수록 낮은 직급)
     * @param {number} [p.loggedInUserIdx]
     * @param {Record<string, any>|null} [p.duplicateMap]
     *        null이면 lazy로 `duplicateProbe({id})` 호출하여 중복 판정
     * @param {Function} [p.duplicateProbe]    async (candidate) => boolean
     * @param {string|Function} [p.rankStrategy='ascStep4']
     * @returns {Promise<{author: Object|null, allBlocked: boolean}>}
     */
    async function pickDefaultAuthor(p) {
        if (!p || !Array.isArray(p.candidates) || p.candidates.length === 0) {
            return { author: null, allBlocked: false };
        }
        // getPositionOrder는 candidate 전체를 받도록 유연화(positionCode/position/name 등 어느 필드로 정렬할지 caller가 선택)
        const getOrder = typeof p.getPositionOrder === 'function'
            ? p.getPositionOrder
            : (() => 9999);

        const sortedAsc = [...p.candidates].sort((a, b) =>
            getOrder(a) - getOrder(b)
        );

        const dupMap = p.duplicateMap || null;

        async function isDup(cand) {
            if (dupMap) return !!dupMap[cand.id];
            if (typeof p.duplicateProbe === 'function') {
                try { return !!(await p.duplicateProbe(cand)); } catch { return false; }
            }
            return false;
        }

        // 1순위: 로그인 사용자
        if (p.loggedInUserIdx != null) {
            const loggedIn = sortedAsc.find(m => String(m.id) === String(p.loggedInUserIdx));
            if (loggedIn && !(await isDup(loggedIn))) {
                return { author: loggedIn, allBlocked: false };
            }
        }

        // 2순위: 중복 없는 후보
        const availability = await Promise.all(sortedAsc.map(isDup));
        const available = sortedAsc.filter((_, i) => !availability[i]);

        const strategy = p.rankStrategy || 'ascStep4';

        if (available.length > 0) {
            return { author: applyRankStrategy(available, strategy), allBlocked: false };
        }

        // 3순위: 전원 중복 → 원본 pool에서 강제 선택 (호출부에서 allBlocked로 경고 가능)
        return { author: applyRankStrategy(sortedAsc, strategy), allBlocked: true };
    }

    function sortByPositionAsc(members, getOrderFn) {
        const fn = typeof getOrderFn === 'function' ? getOrderFn : (() => 9999);
        return [...members].sort((a, b) => fn(a) - fn(b));
    }

    // ───────────────────────── 알림 ─────────────────────────

    /**
     * "시간 중복으로 선택 불가" 통일 알림.
     * 기존의 '그래도 계속하시겠습니까?' 플로우를 대체하는 단일 확인 에러 알림.
     */
    async function showTimeConflictBlock({ personName, projectName, startTime, endTime, type }) {
        const parts = [];
        if (type) parts.push(type);
        if (projectName) parts.push(`[${projectName}]`);
        const typeLabel = parts.join(' ');
        const timeLabel = (startTime && endTime) ? `(${startTime} ~ ${endTime})` : '';

        const who = personName ? `<strong>${personName}</strong>님은 ` : '';
        const detail = typeLabel
            ? `이미 ${typeLabel} ${timeLabel} 에 등록되어 있어 선택할 수 없습니다.`
            : '해당 시간대에 이미 다른 일정이 있어 선택할 수 없습니다.';

        await Swal.fire({
            icon: 'error',
            title: '시간 중복',
            html: `${who}${detail}`,
            confirmButtonText: '확인'
        });
    }

    // ─────────────────────── export ───────────────────────

    window.ReceiptCommon = {
        // API
        fetchDuplicateDocs,
        hasDuplicate,
        scanDuplicatesForPersons,
        hasAnyDuplicateOverDateRange,
        // 작성자 선택
        pickDefaultAuthor,
        sortByPositionAsc,
        // 알림
        showTimeConflictBlock,
        // util (다른 파일에서 참조할 수 있도록)
        isTimeOverlap,
        trimHHmm
    };
})();
