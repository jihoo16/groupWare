-- User 테이블에 관리자 여부 컬럼 추가
-- 작성일: 2025-12-12

-- 1. is_admin 컬럼 추가 (기본값: false)
ALTER TABLE erp."user"
ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. is_admin 컬럼에 주석 추가
COMMENT ON COLUMN erp."user".is_admin IS '홈페이지 관리자 여부 (true: 관리자, false: 일반 사용자)';

-- 3. is_admin 컬럼에 인덱스 추가 (관리자 조회 성능 향상)
CREATE INDEX idx_user_is_admin ON erp."user"(is_admin);

-- 4. 확인 쿼리
-- SELECT idx, emp_id, emp_name, is_admin FROM erp."user" ORDER BY idx;
