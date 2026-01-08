package com.pinecni.erp.constant;

/**
 * 전체 코드 상수 통합 관리 클래스
 * DB의 code_group 및 code 테이블 값들을 Enum으로 중앙 관리
 * 코드 하드코딩 방지 및 type-safe 보장
 */
public class CodeConstants {

    private CodeConstants() {
        // 인스턴스화 방지
    }

    /**
     * 코드 그룹 (code_group 테이블)
     */
    public enum GroupCode {
        DEPARTMENT("C01", "부서(소속)", 1),
        POSITION("C02", "직급", 2),
        LEAVE_TYPE("C03", "연차유형", 3),
        DOCUMENT_TYPE("C04", "문서유형", 4),
        DOCUMENT_STATUS("C05", "문서상태", 5),
        WORK_TYPE("C06", "근무형태", 6),
        EMPLOYMENT_STATUS("C07", "재직상태", 7),
        RANK("C08", "직위", 8),
        TEAM_TYPE("C09", "팀유형", 9);

        private final String code;
        private final String name;
        private final int sortOrder;

        GroupCode(String code, String name, int sortOrder) {
            this.code = code;
            this.name = name;
            this.sortOrder = sortOrder;
        }

        public String getCode() {
            return code;
        }

        public String getName() {
            return name;
        }

        public int getSortOrder() {
            return sortOrder;
        }

        public static GroupCode fromCode(String code) {
            for (GroupCode groupCode : values()) {
                if (groupCode.code.equals(code)) {
                    return groupCode;
                }
            }
            throw new IllegalArgumentException("Unknown group code: " + code);
        }
    }

    /**
     * 부서(소속) 코드 (C01)
     */
    public enum Department {
        PLANNING("C0101", "기획관리부", "PLANNING", 1),
        CONSULT("C0102", "컨설팅사업부", "CONSULT", 2),
        SMART_CITY("C0103", "스마트시티사업부", "SMART_CITY", 3),
        R_AND_D("C0104", "기술연구소", "R_AND_D", 4);

        private final String code;
        private final String name;
        private final String nameEn;
        private final int sortOrder;

        Department(String code, String name, String nameEn, int sortOrder) {
            this.code = code;
            this.name = name;
            this.nameEn = nameEn;
            this.sortOrder = sortOrder;
        }

        public String getCode() {
            return code;
        }

        public String getName() {
            return name;
        }

        public String getNameEn() {
            return nameEn;
        }

        public int getSortOrder() {
            return sortOrder;
        }

        public static Department fromCode(String code) {
            for (Department dept : values()) {
                if (dept.code.equals(code)) {
                    return dept;
                }
            }
            throw new IllegalArgumentException("Unknown department code: " + code);
        }
    }

    /**
     * 직급 코드 (C02)
     */
    public enum Position {
        CEO("C0201", "대표이사", "CEO", 1),
        SENIOR_EXEC("C0202", "상무", "SENIOR_EXEC", 2),
        EXECUTIVE("C0203", "이사", "EXECUTIVE", 3),
        DIRECTOR("C0204", "부장", "DIRECTOR", 4),
        SENIOR_MANAGER("C0205", "차장", "SENIOR_MANAGER", 5),
        MANAGER("C0206", "과장", "MANAGER", 6),
        ASSISTANT("C0207", "대리", "ASSISTANT", 7),
        STAFF("C0208", "사원", "STAFF", 8);

        private final String code;
        private final String name;
        private final String nameEn;
        private final int sortOrder;

        Position(String code, String name, String nameEn, int sortOrder) {
            this.code = code;
            this.name = name;
            this.nameEn = nameEn;
            this.sortOrder = sortOrder;
        }

        public String getCode() {
            return code;
        }

        public String getName() {
            return name;
        }

        public String getNameEn() {
            return nameEn;
        }

        public int getSortOrder() {
            return sortOrder;
        }

        public static Position fromCode(String code) {
            for (Position position : values()) {
                if (position.code.equals(code)) {
                    return position;
                }
            }
            throw new IllegalArgumentException("Unknown position code: " + code);
        }

        public static Position fromSortOrder(int sortOrder) {
            for (Position position : values()) {
                if (position.sortOrder == sortOrder) {
                    return position;
                }
            }
            throw new IllegalArgumentException("Unknown position sortOrder: " + sortOrder);
        }
    }

    /**
     * 연차유형 코드 (C03)
     */
    public enum LeaveType {
        ANNUAL("C0301", "연차", "ANNUAL", 1),
        HALF_AM("C0302", "반차(오전)", "HALF_AM", 2),
        HALF_PM("C0303", "반차(오후)", "HALF_PM", 3),
        SICK("C0304", "병가", "SICK", 4),
        FAMILY("C0305", "경조사", "FAMILY", 5);

        private final String code;
        private final String name;
        private final String nameEn;
        private final int sortOrder;

        LeaveType(String code, String name, String nameEn, int sortOrder) {
            this.code = code;
            this.name = name;
            this.nameEn = nameEn;
            this.sortOrder = sortOrder;
        }

        public String getCode() {
            return code;
        }

        public String getName() {
            return name;
        }

        public String getNameEn() {
            return nameEn;
        }

        public int getSortOrder() {
            return sortOrder;
        }

        public static LeaveType fromCode(String code) {
            for (LeaveType type : values()) {
                if (type.code.equals(code)) {
                    return type;
                }
            }
            throw new IllegalArgumentException("Unknown leave type code: " + code);
        }
    }

    /**
     * 문서유형 코드 (C04)
     */
    public enum DocumentType {
        VACATION("C0401", "연차신청서", "VACATION", 1),
        EXPENSE("C0402", "지출결의서", "EXPENSE", 2),
        PURCHASE("C0403", "구매품의서", "PURCHASE", 3),
        BUSINESS_TRIP("C0404", "출장신청서", "BUSINESS_TRIP", 4);

        private final String code;
        private final String name;
        private final String nameEn;
        private final int sortOrder;

        DocumentType(String code, String name, String nameEn, int sortOrder) {
            this.code = code;
            this.name = name;
            this.nameEn = nameEn;
            this.sortOrder = sortOrder;
        }

        public String getCode() {
            return code;
        }

        public String getName() {
            return name;
        }

        public String getNameEn() {
            return nameEn;
        }

        public int getSortOrder() {
            return sortOrder;
        }

        public static DocumentType fromCode(String code) {
            for (DocumentType type : values()) {
                if (type.code.equals(code)) {
                    return type;
                }
            }
            throw new IllegalArgumentException("Unknown document type code: " + code);
        }
    }

    /**
     * 문서상태 코드 (C05)
     */
    public enum DocumentStatus {
        COMPLETED("C0501", "작성완료", "COMPLETED", 1),
        PENDING("C0502", "대기", "PENDING", 2),
        APPROVAL_REQUESTED("C0503", "승인요청", "APPROVAL_REQUESTED", 3),
        APPROVED("C0504", "승인", "APPROVED", 4),
        REJECTED("C0505", "반려", "REJECTED", 5);

        private final String code;
        private final String name;
        private final String nameEn;
        private final int sortOrder;

        DocumentStatus(String code, String name, String nameEn, int sortOrder) {
            this.code = code;
            this.name = name;
            this.nameEn = nameEn;
            this.sortOrder = sortOrder;
        }

        public String getCode() {
            return code;
        }

        public String getName() {
            return name;
        }

        public String getNameEn() {
            return nameEn;
        }

        public int getSortOrder() {
            return sortOrder;
        }

        public static DocumentStatus fromCode(String code) {
            for (DocumentStatus status : values()) {
                if (status.code.equals(code)) {
                    return status;
                }
            }
            throw new IllegalArgumentException("Unknown document status code: " + code);
        }
    }

    /**
     * 근무형태 코드 (C06)
     */
    public enum WorkType {
        FULL_TIME("C0601", "정규직", "FULL_TIME", 1),
        CONTRACT("C0602", "계약직", "CONTRACT", 2),
        INTERN("C0603", "인턴", "INTERN", 3),
        FREELANCE("C0604", "프리랜서", "FREELANCE", 4);

        private final String code;
        private final String name;
        private final String nameEn;
        private final int sortOrder;

        WorkType(String code, String name, String nameEn, int sortOrder) {
            this.code = code;
            this.name = name;
            this.nameEn = nameEn;
            this.sortOrder = sortOrder;
        }

        public String getCode() {
            return code;
        }

        public String getName() {
            return name;
        }

        public String getNameEn() {
            return nameEn;
        }

        public int getSortOrder() {
            return sortOrder;
        }

        public static WorkType fromCode(String code) {
            for (WorkType type : values()) {
                if (type.code.equals(code)) {
                    return type;
                }
            }
            throw new IllegalArgumentException("Unknown work type code: " + code);
        }
    }

    /**
     * 재직상태 코드 (C07)
     */
    public enum EmploymentStatus {
        ACTIVE("C0701", "재직", "ACTIVE", 1),
        LEAVE("C0702", "휴직", "LEAVE", 2),
        RESIGNED("C0703", "퇴사", "RESIGNED", 3);

        private final String code;
        private final String name;
        private final String nameEn;
        private final int sortOrder;

        EmploymentStatus(String code, String name, String nameEn, int sortOrder) {
            this.code = code;
            this.name = name;
            this.nameEn = nameEn;
            this.sortOrder = sortOrder;
        }

        public String getCode() {
            return code;
        }

        public String getName() {
            return name;
        }

        public String getNameEn() {
            return nameEn;
        }

        public int getSortOrder() {
            return sortOrder;
        }

        public static EmploymentStatus fromCode(String code) {
            for (EmploymentStatus status : values()) {
                if (status.code.equals(code)) {
                    return status;
                }
            }
            throw new IllegalArgumentException("Unknown employment status code: " + code);
        }
    }

    /**
     * 직위 코드 (C08)
     */
    public enum Rank {
        RESEARCHER("C0801", "연구원", "RESEARCHER", 1),
        SENIOR_RESEARCHER("C0802", "선임연구원", "SENIOR_RESEARCHER", 2),
        PRINCIPAL_RESEARCHER("C0803", "책임연구원", "PRINCIPAL_RESEARCHER", 3),
        CHIEF_RESEARCHER("C0804", "수석연구원", "CHIEF_RESEARCHER", 4),
        INSTITUTE_DIRECTOR("C0805", "연구소장", "INSTITUTE_DIRECTOR", 5);

        private final String code;
        private final String name;
        private final String nameEn;
        private final int sortOrder;

        Rank(String code, String name, String nameEn, int sortOrder) {
            this.code = code;
            this.name = name;
            this.nameEn = nameEn;
            this.sortOrder = sortOrder;
        }

        public String getCode() {
            return code;
        }

        public String getName() {
            return name;
        }

        public String getNameEn() {
            return nameEn;
        }

        public int getSortOrder() {
            return sortOrder;
        }

        public static Rank fromCode(String code) {
            for (Rank rank : values()) {
                if (rank.code.equals(code)) {
                    return rank;
                }
            }
            throw new IllegalArgumentException("Unknown rank code: " + code);
        }
    }

    /**
     * 팀유형 코드 (C09)
     */
    public enum TeamType {
        DIVISION("DEPT_DIVISION", "본부", "Division", 1),
        TEAM("DEPT_TEAM", "팀", "Team", 2),
        PART("DEPT_PART", "파트", "Part", 3),
        GROUP("DEPT_GROUP", "그룹", "Group", 4);

        private final String code;
        private final String name;
        private final String nameEn;
        private final int sortOrder;

        TeamType(String code, String name, String nameEn, int sortOrder) {
            this.code = code;
            this.name = name;
            this.nameEn = nameEn;
            this.sortOrder = sortOrder;
        }

        public String getCode() {
            return code;
        }

        public String getName() {
            return name;
        }

        public String getNameEn() {
            return nameEn;
        }

        public int getSortOrder() {
            return sortOrder;
        }

        public static TeamType fromCode(String code) {
            for (TeamType type : values()) {
                if (type.code.equals(code)) {
                    return type;
                }
            }
            throw new IllegalArgumentException("Unknown team type code: " + code);
        }
    }
}
