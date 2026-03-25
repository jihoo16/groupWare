-- =============================================
-- erp.projects 테이블에 예산 보정액 컬럼 추가
--
-- 목적: 보정값 관리 기능에서 현재 유효한 보정액을 저장
--       변경 이력은 project_budget_adjustments 테이블 참조
-- 잔액 계산식: 총액 - 사용액 + 보정액(해당 컬럼)
-- =============================================

ALTER TABLE erp.projects
    ADD COLUMN activity_budget_adjustment  NUMERIC(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN equipment_budget_adjustment NUMERIC(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN material_budget_adjustment  NUMERIC(15, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN erp.projects.activity_budget_adjustment  IS '활동비 보정액 현재 유효값 (변경 이력은 erp.project_budget_adjustments 참조)';
COMMENT ON COLUMN erp.projects.equipment_budget_adjustment IS '장비비 보정액 현재 유효값 (변경 이력은 erp.project_budget_adjustments 참조)';
COMMENT ON COLUMN erp.projects.material_budget_adjustment  IS '재료비 보정액 현재 유효값 (변경 이력은 erp.project_budget_adjustments 참조)';
