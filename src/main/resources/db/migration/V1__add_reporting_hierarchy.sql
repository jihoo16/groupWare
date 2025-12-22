-- ============================================
-- 보고체계 관리 기능 추가
-- ============================================
-- 작성일: 2025-01-XX
-- 설명:
--   1. user 테이블에 보고체계 관련 컬럼 추가
--   2. 보고체계 변경 이력 테이블 생성
--   3. 관련 인덱스 및 제약조건 생성
-- ============================================

-- ============================================
-- 1. user 테이블에 보고체계 컬럼 추가
-- ============================================

-- 1-1. 상위 보고자 (manager) 컬럼 추가
-- 직원의 직속 상사를 가리키는 FK
ALTER TABLE erp."user"
ADD COLUMN IF NOT EXISTS manager_idx BIGINT;

COMMENT ON COLUMN erp."user".manager_idx IS '상위 보고자 IDX (user.idx 참조)';

-- 1-2. 조직 레벨 (organizational_level) 컬럼 추가
-- 1: 대표, 2: 상무/이사, 3: 부장, 4: 그 이하 전부
ALTER TABLE erp."user"
ADD COLUMN IF NOT EXISTS organizational_level INTEGER DEFAULT 4;

COMMENT ON COLUMN erp."user".organizational_level IS '조직 레벨 (1:대표, 2:상무/이사, 3:부장, 4:그 이하)';

-- 1-3. 팀장 여부 (is_team_leader) 컬럼 추가
ALTER TABLE erp."user"
ADD COLUMN IF NOT EXISTS is_team_leader BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN erp."user".is_team_leader IS '팀장 여부 (true: 팀장, false: 일반)';

-- 1-4. 보고자 지정 시작일 (manager_start_date) 컬럼 추가
ALTER TABLE erp."user"
ADD COLUMN IF NOT EXISTS manager_start_date DATE;

COMMENT ON COLUMN erp."user".manager_start_date IS '현재 보고자에게 보고 시작한 날짜';

-- ============================================
-- 2. 외래키 제약조건 추가
-- ============================================

-- user.manager_idx -> user.idx FK
-- ON DELETE SET NULL: 보고자가 삭제되면 NULL로 설정 (orphan 방지)
ALTER TABLE erp."user"
DROP CONSTRAINT IF EXISTS fk_user_manager_idx;

ALTER TABLE erp."user"
ADD CONSTRAINT fk_user_manager_idx
FOREIGN KEY (manager_idx)
REFERENCES erp."user"(idx)
ON DELETE SET NULL;

-- ============================================
-- 3. 인덱스 추가 (성능 최적화)
-- ============================================

-- manager_idx 인덱스 (보고자별 직원 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_user_manager_idx
ON erp."user"(manager_idx)
WHERE manager_idx IS NOT NULL;

-- organizational_level 인덱스 (레벨별 직원 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_user_organizational_level
ON erp."user"(organizational_level);

-- is_team_leader 인덱스 (팀장 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_user_is_team_leader
ON erp."user"(is_team_leader)
WHERE is_team_leader = TRUE;

-- 복합 인덱스: 부서 + 조직레벨 (부서별 조직도 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_user_dept_level
ON erp."user"(emp_dept, organizational_level);

-- ============================================
-- 4. 보고체계 변경 이력 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS erp.reporting_hierarchy_history (
    idx BIGSERIAL PRIMARY KEY,
    emp_idx BIGINT NOT NULL,
    previous_manager_idx BIGINT,
    new_manager_idx BIGINT,
    previous_level INTEGER,
    new_level INTEGER,
    previous_is_team_leader BOOLEAN,
    new_is_team_leader BOOLEAN,
    change_reason VARCHAR(500),
    change_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    changed_by_user_idx BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_user_idx BIGINT,
    updated_at TIMESTAMP,
    updated_user_idx BIGINT
);

COMMENT ON TABLE erp.reporting_hierarchy_history IS '보고체계 변경 이력';
COMMENT ON COLUMN erp.reporting_hierarchy_history.idx IS '이력 IDX (PK)';
COMMENT ON COLUMN erp.reporting_hierarchy_history.emp_idx IS '대상 직원 IDX';
COMMENT ON COLUMN erp.reporting_hierarchy_history.previous_manager_idx IS '이전 보고자 IDX';
COMMENT ON COLUMN erp.reporting_hierarchy_history.new_manager_idx IS '새로운 보고자 IDX';
COMMENT ON COLUMN erp.reporting_hierarchy_history.previous_level IS '이전 조직 레벨';
COMMENT ON COLUMN erp.reporting_hierarchy_history.new_level IS '새로운 조직 레벨';
COMMENT ON COLUMN erp.reporting_hierarchy_history.previous_is_team_leader IS '이전 팀장 여부';
COMMENT ON COLUMN erp.reporting_hierarchy_history.new_is_team_leader IS '새로운 팀장 여부';
COMMENT ON COLUMN erp.reporting_hierarchy_history.change_reason IS '변경 사유';
COMMENT ON COLUMN erp.reporting_hierarchy_history.change_date IS '변경 일시';
COMMENT ON COLUMN erp.reporting_hierarchy_history.changed_by_user_idx IS '변경 작업 수행자 IDX';

-- ============================================
-- 5. 이력 테이블 외래키 제약조건
-- ============================================

ALTER TABLE erp.reporting_hierarchy_history
DROP CONSTRAINT IF EXISTS fk_history_emp_idx;

ALTER TABLE erp.reporting_hierarchy_history
ADD CONSTRAINT fk_history_emp_idx
FOREIGN KEY (emp_idx)
REFERENCES erp."user"(idx)
ON DELETE CASCADE;

ALTER TABLE erp.reporting_hierarchy_history
DROP CONSTRAINT IF EXISTS fk_history_previous_manager;

ALTER TABLE erp.reporting_hierarchy_history
ADD CONSTRAINT fk_history_previous_manager
FOREIGN KEY (previous_manager_idx)
REFERENCES erp."user"(idx)
ON DELETE SET NULL;

ALTER TABLE erp.reporting_hierarchy_history
DROP CONSTRAINT IF EXISTS fk_history_new_manager;

ALTER TABLE erp.reporting_hierarchy_history
ADD CONSTRAINT fk_history_new_manager
FOREIGN KEY (new_manager_idx)
REFERENCES erp."user"(idx)
ON DELETE SET NULL;

ALTER TABLE erp.reporting_hierarchy_history
DROP CONSTRAINT IF EXISTS fk_history_changed_by;

ALTER TABLE erp.reporting_hierarchy_history
ADD CONSTRAINT fk_history_changed_by
FOREIGN KEY (changed_by_user_idx)
REFERENCES erp."user"(idx)
ON DELETE SET NULL;

-- ============================================
-- 6. 이력 테이블 인덱스
-- ============================================

CREATE INDEX IF NOT EXISTS idx_hierarchy_history_emp_idx
ON erp.reporting_hierarchy_history(emp_idx);

CREATE INDEX IF NOT EXISTS idx_hierarchy_history_change_date
ON erp.reporting_hierarchy_history(change_date DESC);

CREATE INDEX IF NOT EXISTS idx_hierarchy_history_emp_date
ON erp.reporting_hierarchy_history(emp_idx, change_date DESC);

-- ============================================
-- 7. 시퀀스 생성 (JPA용)
-- ============================================

CREATE SEQUENCE IF NOT EXISTS erp.reporting_hierarchy_history_sequence
START WITH 1
INCREMENT BY 1;

-- ============================================
-- 8. 샘플 데이터 (선택사항 - 개발/테스트용)
-- ============================================
-- 실제 운영 환경에서는 아래 샘플 데이터 삽입 부분을 주석 처리하세요
-- emp_position은 C02 그룹의 코드값으로 저장되어 있으므로 code 테이블과 JOIN하여 처리

-- 대표 업데이트 (레벨 1)
UPDATE erp."user" u
SET
    organizational_level = 1,
    is_team_leader = TRUE,
    manager_idx = NULL,
    manager_start_date = NULL
FROM erp.code c
WHERE u.emp_position = c.code
  AND c.group_code = 'C02'
  AND c.code_name = '대표'
  AND u.deleted_at IS NULL;

-- 상무/이사급 업데이트 (레벨 2)
UPDATE erp."user" u
SET
    organizational_level = 2,
    is_team_leader = TRUE
FROM erp.code c
WHERE u.emp_position = c.code
  AND c.group_code = 'C02'
  AND c.code_name IN ('상무', '이사')
  AND u.deleted_at IS NULL;

-- 부장급 업데이트 (레벨 3)
UPDATE erp."user" u
SET
    organizational_level = 3,
    is_team_leader = TRUE
FROM erp.code c
WHERE u.emp_position = c.code
  AND c.group_code = 'C02'
  AND c.code_name = '부장'
  AND u.deleted_at IS NULL;

-- 그 이하 전부 (레벨 4) - 대표/상무/이사/부장이 아닌 모든 직급
UPDATE erp."user" u
SET
    organizational_level = 4,
    is_team_leader = FALSE
FROM erp.code c
WHERE u.emp_position = c.code
  AND c.group_code = 'C02'
  AND c.code_name NOT IN ('대표', '상무', '이사', '부장')
  AND u.deleted_at IS NULL;

-- ============================================
-- 9. 검증 쿼리 (마이그레이션 후 확인용)
-- ============================================

-- 컬럼 추가 확인
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'erp'
--   AND table_name = 'user'
--   AND column_name IN ('manager_idx', 'organizational_level', 'is_team_leader', 'manager_start_date')
-- ORDER BY ordinal_position;

-- 제약조건 확인
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'erp.user'::regclass
--   AND conname LIKE '%manager%';

-- 인덱스 확인
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'erp'
--   AND tablename = 'user'
--   AND indexname LIKE '%manager%' OR indexname LIKE '%level%' OR indexname LIKE '%leader%';

-- 데이터 확인
-- SELECT
--     emp_id,
--     emp_name,
--     emp_position,
--     organizational_level,
--     is_team_leader,
--     manager_idx
-- FROM erp."user"
-- WHERE deleted_at IS NULL
-- ORDER BY organizational_level, emp_dept, emp_name;

COMMIT;
