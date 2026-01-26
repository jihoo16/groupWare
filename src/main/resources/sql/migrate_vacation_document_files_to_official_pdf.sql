-- ============================================
-- vacation_document_files 테이블을 vacation_official_pdf로 마이그레이션
-- ============================================

-- 1. 기존 테이블 이름 변경
ALTER TABLE IF EXISTS erp.vacation_document_files
    RENAME TO vacation_official_pdf;

-- 2. 기존 시퀀스 삭제 (있다면)
DROP SEQUENCE IF EXISTS erp.vacation_document_files_idx_seq CASCADE;

-- 3. 새로운 시퀀스 생성
CREATE SEQUENCE IF NOT EXISTS erp.vacation_official_pdf_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- 4. 현재 테이블의 최대 idx 값을 확인하고 시퀀스 값 설정
-- 테이블에 데이터가 있는 경우, 시퀀스를 최대값 + 1로 설정
DO $$
DECLARE
    max_idx INTEGER;
BEGIN
    -- 테이블이 존재하고 데이터가 있는지 확인
    SELECT COALESCE(MAX(idx), 0) INTO max_idx FROM erp.vacation_official_pdf;

    -- 시퀀스를 최대값 + 1로 설정
    IF max_idx > 0 THEN
        PERFORM setval('erp.vacation_official_pdf_sequence', max_idx);
    END IF;
END $$;

-- 5. 기존 인덱스 이름 변경 (있다면)
DO $$
BEGIN
    -- document_idx 인덱스 변경
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'erp' AND indexname = 'idx_vacation_document_files_document_idx') THEN
        ALTER INDEX erp.idx_vacation_document_files_document_idx
            RENAME TO idx_vacation_official_pdf_document_idx;
    END IF;

    -- created_at 인덱스 변경
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'erp' AND indexname = 'idx_vacation_document_files_created_at') THEN
        ALTER INDEX erp.idx_vacation_document_files_created_at
            RENAME TO idx_vacation_official_pdf_created_at;
    END IF;
END $$;

-- 6. 제약조건 이름 변경 (있다면)
DO $$
BEGIN
    -- Primary Key 제약조건 변경
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vacation_document_files_pkey' AND connamespace = 'erp'::regnamespace) THEN
        ALTER TABLE erp.vacation_official_pdf
            RENAME CONSTRAINT vacation_document_files_pkey TO vacation_official_pdf_pkey;
    END IF;
END $$;

-- 7. 마이그레이션 확인
SELECT
    'vacation_official_pdf' as table_name,
    COUNT(*) as record_count,
    (SELECT last_value FROM erp.vacation_official_pdf_sequence) as sequence_value
FROM erp.vacation_official_pdf;

-- 인덱스 확인
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'erp'
AND tablename = 'vacation_official_pdf';
