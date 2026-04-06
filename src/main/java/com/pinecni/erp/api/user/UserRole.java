package com.pinecni.erp.api.user;

/**
 * 사용자 권한 코드 Enum
 *
 * <p>DB: erp.code 테이블의 group_code = 'C11' 그룹에 해당하는 4개 코드값과 매핑.
 * <ul>
 *   <li>C1101 = DEVELOPER (최상위)</li>
 *   <li>C1102 = ADMIN</li>
 *   <li>C1103 = COMPETENCY_VIEWER (역량 열람자 / 담당자)</li>
 *   <li>C1104 = USER (일반 사용자, 기본값)</li>
 * </ul>
 *
 * <p><strong>주의:</strong> 코드 번호(C11<b>01</b>~C11<b>04</b>)는 상위 권한이 작은 숫자부터,
 * level 값은 상위 권한이 큰 숫자(DEVELOPER=4)입니다. 두 값의 방향이 반대이므로
 * 권한 비교는 반드시 {@link #isAtLeast(UserRole)} 또는 {@link #getLevel()} 을
 * 사용해야 하며, {@link #getCode()} 로 얻은 문자열로 크기 비교하면 안 됩니다.
 *
 * <p>사용 예:
 * <pre>
 * UserRole role = UserRole.fromCode(user.getUserRoleCode());  // "C1102" → ADMIN
 * if (role.isAtLeast(UserRole.ADMIN)) { ... }                 // ADMIN/DEVELOPER → true
 * user.setUserRoleCode(UserRole.COMPETENCY_VIEWER.getCode()); // "C1103"
 * </pre>
 */
public enum UserRole {

    /** 개발자 — 최상위 권한, 그룹코드 설정 등 개발자 전용 메뉴 접근 가능 */
    DEVELOPER        ("C1101", 4),

    /** 관리자 — 사용자/연차/경비/보고체계/기초정보 관리 */
    ADMIN            ("C1102", 3),

    /** 역량 열람자 (담당자) — 전체 직원 역량 정보 읽기 전용 열람 */
    COMPETENCY_VIEWER("C1103", 2),

    /** 일반 사용자 — 본인 정보/역량만 관리 (기본값) */
    USER             ("C1104", 1);

    /** DB erp.code.code 값 (group_code = 'C11') */
    private final String code;

    /** 권한 계층 — 값이 클수록 상위 권한 */
    private final int level;

    UserRole(String code, int level) {
        this.code = code;
        this.level = level;
    }

    public String getCode() {
        return code;
    }

    public int getLevel() {
        return level;
    }

    /**
     * 이 역할이 주어진 최소 요구 역할 이상인지 판단 (계층 비교).
     *
     * <p>예: {@code UserRole.ADMIN.isAtLeast(UserRole.COMPETENCY_VIEWER)} → {@code true}
     *
     * @param required 최소 요구 역할
     * @return this.level >= required.level 이면 true
     */
    public boolean isAtLeast(UserRole required) {
        return this.level >= required.level;
    }

    /**
     * DB 코드값(C11xx) 문자열을 Enum으로 변환.
     * null 이거나 알 수 없는 코드면 {@link #USER}(최저 권한)로 fallback.
     *
     * @param code DB erp.code.code 값
     * @return 매칭되는 UserRole, 없으면 USER
     */
    public static UserRole fromCode(String code) {
        if (code == null) {
            return USER;
        }
        for (UserRole role : values()) {
            if (role.code.equals(code)) {
                return role;
            }
        }
        return USER;
    }
}
