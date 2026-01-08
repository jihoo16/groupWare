/**
 * 코드 관련 전역 상수 관리
 * 백엔드 API로부터 로드된 코드 상수를 캐시하고 관리
 */

// 코드 상수 캐시 (백엔드에서 로드)
let CODE_CONSTANTS = null;

/**
 * 코드 상수 로드 함수
 * 백엔드 /api/codes/constants 엔드포인트에서 코드 상수를 가져옵니다.
 *
 * @returns {Promise<Object>} 코드 상수 객체
 */
async function loadCodeConstants() {
    if (CODE_CONSTANTS) {
        return CODE_CONSTANTS; // 이미 로드된 경우 캐시 반환
    }

    try {
        const response = await fetch('/api/codes/constants');
        if (response.ok) {
            CODE_CONSTANTS = await response.json();
            console.log('코드 상수 로드 완료:', CODE_CONSTANTS);
            return CODE_CONSTANTS;
        } else {
            console.error('코드 상수 로드 실패:', response.status);
            return getDefaultCodeConstants();
        }
    } catch (error) {
        console.error('코드 상수 로드 오류:', error);
        return getDefaultCodeConstants();
    }
}

/**
 * 기본 코드 상수 (API 로드 실패 시 사용)
 */
function getDefaultCodeConstants() {
    return {
        groupCodes: {
            DEPARTMENT: 'C01',
            POSITION: 'C02',
            LEAVE_TYPE: 'C03',
            DOCUMENT_TYPE: 'C04',
            DOCUMENT_STATUS: 'C05',
            WORK_TYPE: 'C06',
            EMPLOYMENT_STATUS: 'C07',
            RANK: 'C08',
            TEAM_TYPE: 'C09'
        },
        ceoSortOrder: 1,
        positionGroupCode: 'C02'
    };
}

/**
 * 코드 상수 가져오기 (동기 방식)
 * loadCodeConstants()를 먼저 호출한 후 사용해야 합니다.
 *
 * @returns {Object} 코드 상수 객체 또는 null
 */
function getCodeConstants() {
    return CODE_CONSTANTS || getDefaultCodeConstants();
}

/**
 * 그룹 코드 가져오기
 *
 * @param {string} groupName - 그룹 이름 (예: 'DEPARTMENT', 'POSITION')
 * @returns {string} 그룹 코드 (예: 'C01', 'C02')
 */
function getGroupCode(groupName) {
    const constants = getCodeConstants();
    return constants.groupCodes?.[groupName] || null;
}

/**
 * CEO sortOrder 가져오기
 *
 * @returns {number} CEO sortOrder (기본값: 1)
 */
function getCeoSortOrder() {
    const constants = getCodeConstants();
    return constants.ceoSortOrder || 1;
}

// 전역에서 사용할 수 있도록 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadCodeConstants,
        getCodeConstants,
        getGroupCode,
        getCeoSortOrder
    };
}
