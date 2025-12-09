-- ============================================
-- 외부인원 관리 테이블
-- ============================================

-- 시퀀스 생성
CREATE SEQUENCE IF NOT EXISTS external_person_sequence START WITH 1 INCREMENT BY 1;

-- 외부인원 테이블
CREATE TABLE external_person (
    idx                     BIGINT DEFAULT nextval('external_person_sequence') PRIMARY KEY,
    company_name            VARCHAR(200) NOT NULL,
    position                VARCHAR(100) NOT NULL,
    name                    VARCHAR(100) NOT NULL,
    created_user_idx        BIGINT,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_user_idx        BIGINT,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_external_person_company ON external_person(company_name);
CREATE INDEX idx_external_person_name ON external_person(name);

-- 코멘트
COMMENT ON TABLE external_person IS '외부인원 관리';
COMMENT ON COLUMN external_person.idx IS '외부인원 ID (PK)';
COMMENT ON COLUMN external_person.company_name IS '소속회사';
COMMENT ON COLUMN external_person.position IS '직급';
COMMENT ON COLUMN external_person.name IS '이름';
COMMENT ON COLUMN external_person.created_user_idx IS '생성자 ID';
COMMENT ON COLUMN external_person.created_at IS '생성일시';
COMMENT ON COLUMN external_person.updated_user_idx IS '수정자 ID';
COMMENT ON COLUMN external_person.updated_at IS '수정일시';
