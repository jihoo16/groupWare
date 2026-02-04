-- =====================================================
-- Receipt Attendee 통합 테이블 마이그레이션 SQL
-- =====================================================
-- 실행 전 주의사항:
-- 1. 반드시 데이터베이스 백업을 먼저 수행하세요
-- 2. 트랜잭션 내에서 실행하고, 검증 후 COMMIT 하세요
-- 3. 기존 테이블 삭제는 검증 완료 후 수동으로 진행하세요
-- =====================================================

-- BEGIN TRANSACTION;

-- =====================================================
-- 1. 통합 참석자 테이블 생성
-- =====================================================

-- 시퀀스 생성
CREATE SEQUENCE IF NOT EXISTS erp.receipt_attendee_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- 테이블 생성
CREATE TABLE IF NOT EXISTS erp.receipt_attendee (
    idx BIGINT PRIMARY KEY DEFAULT nextval('erp.receipt_attendee_sequence'),

    -- 문서 타입 구분 (document_sequences.prefix 값)
    document_type_prefix VARCHAR(20) NOT NULL,

    -- 원본 문서 참조 (receipt_meeting.idx, receipt_overtime.idx 등)
    receipt_idx BIGINT NOT NULL,

    -- 프로젝트/카드 정보
    project_idx BIGINT,
    card_idx BIGINT,

    -- 참석자 정보 (user 테이블에서 조회)
    user_idx BIGINT,
    is_external BOOLEAN NOT NULL DEFAULT false,

    -- 시간 정보 (중복 체크용)
    document_date DATE,
    start_time TIME,
    end_time TIME,

    -- 정렬 순서
    display_order INTEGER DEFAULT 0,

    -- 회의록 전용 필드
    meeting_expense BIGINT DEFAULT 0,

    -- 야근 식대 전용 필드
    work_task VARCHAR(500),

    -- 생성/수정 정보
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_user_idx BIGINT NOT NULL,
    updated_at TIMESTAMP,
    updated_user_idx BIGINT,

    -- Soft Delete
    deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_user_idx BIGINT,

    -- 제약조건
    CONSTRAINT chk_user_idx_not_null CHECK (user_idx IS NOT NULL)
);

-- =====================================================
-- 2. 인덱스 생성
-- =====================================================

CREATE INDEX idx_ra_receipt ON erp.receipt_attendee(receipt_idx);
CREATE INDEX idx_ra_user ON erp.receipt_attendee(user_idx);
CREATE INDEX idx_ra_project ON erp.receipt_attendee(project_idx);
CREATE INDEX idx_ra_document_type ON erp.receipt_attendee(document_type_prefix);
CREATE INDEX idx_ra_document_date ON erp.receipt_attendee(document_date);
CREATE INDEX idx_ra_deleted ON erp.receipt_attendee(deleted) WHERE deleted = false;
CREATE INDEX idx_ra_card ON erp.receipt_attendee(card_idx) WHERE card_idx IS NOT NULL;

-- =====================================================
-- 3. 중복 시간 방지 제약조건 (TRIGGER 방식)
-- =====================================================
-- btree_gist extension이 없는 경우 TRIGGER를 사용하여 시간 겹침 방지

-- 중복 체크 함수 생성
CREATE OR REPLACE FUNCTION erp.check_attendee_time_overlap()
RETURNS TRIGGER AS $$
BEGIN
    -- deleted=true이거나 시간 정보가 없으면 체크 생략
    IF NEW.deleted = true OR NEW.document_date IS NULL OR NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
        RETURN NEW;
    END IF;

    -- 같은 project_idx, user_idx, card_idx에서 시간이 겹치는 레코드 확인
    IF EXISTS (
        SELECT 1
        FROM erp.receipt_attendee
        WHERE idx != COALESCE(NEW.idx, -1)  -- UPDATE 시 자기 자신 제외
          AND deleted = false
          AND project_idx = NEW.project_idx
          AND user_idx = NEW.user_idx
          AND COALESCE(card_idx, -1) = COALESCE(NEW.card_idx, -1)
          AND document_date IS NOT NULL
          AND start_time IS NOT NULL
          AND end_time IS NOT NULL
          -- 시간 겹침 체크: 두 범위가 겹치는지 확인
          AND (
              tsrange(
                  (document_date + start_time)::TIMESTAMP,
                  (document_date + end_time)::TIMESTAMP
              ) &&
              tsrange(
                  (NEW.document_date + NEW.start_time)::TIMESTAMP,
                  (NEW.document_date + NEW.end_time)::TIMESTAMP
              )
          )
    ) THEN
        RAISE EXCEPTION 'Time overlap detected: user_idx=%, project_idx=%, card_idx=%, date=%, time=%~%',
            NEW.user_idx, NEW.project_idx, NEW.card_idx, NEW.document_date, NEW.start_time, NEW.end_time
            USING ERRCODE = '23P01';  -- exclusion_violation
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (INSERT/UPDATE 시 실행)
DROP TRIGGER IF EXISTS trg_check_attendee_time_overlap ON erp.receipt_attendee;
CREATE TRIGGER trg_check_attendee_time_overlap
    BEFORE INSERT OR UPDATE ON erp.receipt_attendee
    FOR EACH ROW
    EXECUTE FUNCTION erp.check_attendee_time_overlap();

-- =====================================================
-- 4. 데이터 마이그레이션
-- =====================================================

-- 마이그레이션 중 트리거 비활성화 (기존 데이터 중복 허용)
ALTER TABLE erp.receipt_attendee DISABLE TRIGGER trg_check_attendee_time_overlap;

-- 4-1. receipt_meeting_attendee 데이터 마이그레이션
INSERT INTO erp.receipt_attendee (
    idx,
    document_type_prefix,
    receipt_idx,
    project_idx,
    card_idx,
    user_idx,
    is_external,
    document_date,
    start_time,
    end_time,
    display_order,
    meeting_expense,
    work_task,
    created_at,
    created_user_idx,
    updated_at,
    updated_user_idx,
    deleted,
    deleted_at,
    deleted_user_idx
)
SELECT
    rma.idx,
    'RCM' AS document_type_prefix,  -- 회의록 prefix (실제 값으로 수정 필요)
    rma.receipt_meeting_idx AS receipt_idx,
    rm.project_idx,
    rm.card_idx,
    rma.user_idx,
    COALESCE(rma.is_external, false) AS is_external,
    rm.meeting_date AS document_date,
    rm.start_time,
    rm.end_time,
    COALESCE(rma.display_order, 0) AS display_order,
    COALESCE(rma.meeting_expense, 0) AS meeting_expense,
    NULL AS work_task,
    rma.created_at,
    rm.created_user_idx AS created_user_idx,  -- meeting 테이블에서 가져옴
    rm.updated_at,  -- meeting 테이블에서 가져옴
    rm.updated_user_idx,  -- meeting 테이블에서 가져옴
    COALESCE(rma.deleted, false) AS deleted,
    rma.deleted_at,
    rma.deleted_user_idx
FROM erp.receipt_meeting_attendee rma
LEFT JOIN erp.receipt_meeting rm ON rma.receipt_meeting_idx = rm.idx
WHERE rm.idx IS NOT NULL;  -- JOIN 성공한 데이터만

-- 시퀀스 값 업데이트 (meeting_attendee의 최대 idx 반영)
SELECT setval('erp.receipt_attendee_sequence',
    (SELECT COALESCE(MAX(idx), 1) FROM erp.receipt_attendee)
);

-- 4-2. receipt_overtime_attendee 데이터 마이그레이션
INSERT INTO erp.receipt_attendee (
    document_type_prefix,
    receipt_idx,
    project_idx,
    card_idx,
    user_idx,
    is_external,
    document_date,
    start_time,
    end_time,
    display_order,
    meeting_expense,
    work_task,
    created_at,
    created_user_idx,
    updated_at,
    updated_user_idx,
    deleted,
    deleted_at,
    deleted_user_idx
)
SELECT
    'RCO' AS document_type_prefix,  -- 야근 식대 prefix (실제 값으로 수정 필요)
    roa.receipt_overtime_idx AS receipt_idx,
    ro.project_idx,
    ro.card_idx,
    roa.user_idx,
    false AS is_external,  -- 기존 overtime_attendee는 isExternal 필드 없음
    ro.overtime_date AS document_date,
    NULL AS start_time,  -- 야근 식대는 시간 정보 없음
    NULL AS end_time,  -- 야근 식대는 시간 정보 없음
    0 AS display_order,
    0 AS meeting_expense,
    roa.work_task,
    roa.created_at::TIMESTAMP AS created_at,
    ro.created_user_idx AS created_user_idx,  -- overtime 테이블에서 가져옴
    roa.updated_at::TIMESTAMP AS updated_at,  -- overtime_attendee 테이블에서 가져옴
    ro.updated_user_idx AS updated_user_idx,  -- overtime 테이블에서 가져옴
    false AS deleted,  -- 기존 overtime_attendee는 soft delete 없음
    NULL AS deleted_at,
    NULL AS deleted_user_idx
FROM erp.receipt_overtime_attendee roa
LEFT JOIN erp.receipt_overtime ro ON roa.receipt_overtime_idx = ro.idx
WHERE ro.idx IS NOT NULL;  -- JOIN 성공한 데이터만

-- 시퀀스 값 최종 업데이트
SELECT setval('erp.receipt_attendee_sequence',
    (SELECT COALESCE(MAX(idx), 1) FROM erp.receipt_attendee)
);

-- 마이그레이션 완료 후 트리거 다시 활성화
ALTER TABLE erp.receipt_attendee ENABLE TRIGGER trg_check_attendee_time_overlap;

-- =====================================================
-- 5. 데이터 검증 쿼리
-- =====================================================

-- 마이그레이션 전후 데이터 개수 비교
SELECT
    'receipt_meeting_attendee' AS source_table,
    COUNT(*) AS original_count,
    (SELECT COUNT(*) FROM erp.receipt_attendee WHERE document_type_prefix = 'MTG') AS migrated_count
FROM erp.receipt_meeting_attendee
UNION ALL
SELECT
    'receipt_overtime_attendee' AS source_table,
    COUNT(*) AS original_count,
    (SELECT COUNT(*) FROM erp.receipt_attendee WHERE document_type_prefix = 'OT') AS migrated_count
FROM erp.receipt_overtime_attendee;

-- 총 레코드 수 확인
SELECT
    'Total migrated records' AS description,
    COUNT(*) AS count
FROM erp.receipt_attendee;

-- user_idx가 NULL인 레코드 확인 (있으면 안됨)
SELECT
    'NULL user_idx records' AS description,
    COUNT(*) AS count
FROM erp.receipt_attendee
WHERE user_idx IS NULL;

-- Soft delete 상태별 개수
SELECT
    deleted,
    COUNT(*) AS count
FROM erp.receipt_attendee
GROUP BY deleted;

-- 시간 겹침 중복 데이터 확인 (있으면 정리 필요)
SELECT
    project_idx,
    user_idx,
    card_idx,
    document_date,
    start_time,
    end_time,
    COUNT(*) AS duplicate_count,
    STRING_AGG(idx::TEXT, ', ') AS duplicate_idx_list
FROM erp.receipt_attendee
WHERE deleted = false
  AND document_date IS NOT NULL
  AND start_time IS NOT NULL
  AND end_time IS NOT NULL
GROUP BY project_idx, user_idx, card_idx, document_date, start_time, end_time
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- =====================================================
-- 6. 기존 테이블 백업 (선택사항)
-- =====================================================

-- 검증 완료 후 실행
-- CREATE TABLE erp.receipt_meeting_attendee_backup_20260204 AS
-- SELECT * FROM erp.receipt_meeting_attendee;

-- CREATE TABLE erp.receipt_overtime_attendee_backup_20260204 AS
-- SELECT * FROM erp.receipt_overtime_attendee;

-- =====================================================
-- 7. 기존 테이블 삭제 (검증 완료 후 수동 실행)
-- =====================================================

-- DROP TABLE IF EXISTS erp.receipt_meeting_attendee CASCADE;
-- DROP TABLE IF EXISTS erp.receipt_overtime_attendee CASCADE;
-- DROP SEQUENCE IF EXISTS erp.receipt_meeting_attendee_sequence;

-- =====================================================
-- 8. 코멘트 추가
-- =====================================================

COMMENT ON TABLE erp.receipt_attendee IS '통합 참석자 테이블 - 회의록, 야근식대 등 모든 문서의 참석자 관리';
COMMENT ON COLUMN erp.receipt_attendee.document_type_prefix IS '문서 타입 구분 (document_sequences.prefix 값, 예: RCM, OT, TRIP)';
COMMENT ON COLUMN erp.receipt_attendee.receipt_idx IS '원본 문서 idx (receipt_meeting.idx, receipt_overtime.idx 등)';
COMMENT ON COLUMN erp.receipt_attendee.is_external IS '외부 참석자 여부 (true: external_persons.idx, false: users.idx)';
COMMENT ON COLUMN erp.receipt_attendee.document_date IS '문서 실행 날짜 (회의일, 야근일 등)';
COMMENT ON COLUMN erp.receipt_attendee.start_time IS '시작 시간 (TIME 타입, 회의록 등에서 사용)';
COMMENT ON COLUMN erp.receipt_attendee.end_time IS '종료 시간 (TIME 타입, 회의록 등에서 사용)';
COMMENT ON COLUMN erp.receipt_attendee.meeting_expense IS '회의비 (회의록 전용, 참석자별 회의 비용)';
COMMENT ON COLUMN erp.receipt_attendee.work_task IS '작업 내용 (야근 식대 전용)';
COMMENT ON COLUMN erp.receipt_attendee.created_at IS '생성 일시';
COMMENT ON COLUMN erp.receipt_attendee.created_user_idx IS '생성자 IDX';
COMMENT ON COLUMN erp.receipt_attendee.updated_at IS '수정 일시';
COMMENT ON COLUMN erp.receipt_attendee.updated_user_idx IS '수정자 IDX';
COMMENT ON COLUMN erp.receipt_attendee.deleted IS 'Soft Delete 여부';
COMMENT ON COLUMN erp.receipt_attendee.deleted_at IS '삭제 일시';
COMMENT ON COLUMN erp.receipt_attendee.deleted_user_idx IS '삭제자 IDX';

-- 함수 및 트리거 코멘트
COMMENT ON FUNCTION erp.check_attendee_time_overlap() IS '참석자 시간 겹침 체크 함수 - 같은 프로젝트/사용자/카드에서 날짜+시간 중복 방지';
COMMENT ON TRIGGER trg_check_attendee_time_overlap ON erp.receipt_attendee IS '참석자 INSERT/UPDATE 시 시간 겹침 체크 트리거';

-- COMMIT;

-- =====================================================
-- 완료 메시지
-- =====================================================
-- SELECT '마이그레이션이 완료되었습니다. 위 검증 쿼리를 실행하여 데이터를 확인하세요.' AS message;
