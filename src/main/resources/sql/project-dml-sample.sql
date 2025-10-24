-- ============================================
-- 프로젝트 관리 모듈 샘플 데이터 (DML)
-- ============================================

-- 기초 데이터 먼저 삽입 (참조 테이블)
-- 1. 직급 정보
INSERT INTO positions (position_code, position_name, position_order, salary_grade, is_active) VALUES
('P001', '사원', 1, '1급', TRUE),
('P002', '대리', 2, '2급', TRUE),
('P003', '과장', 3, '3급', TRUE),
('P004', '차장', 4, '4급', TRUE),
('P005', '부장', 5, '5급', TRUE),
('P006', '주임', 6, '1급', TRUE),
('P007', '선임연구원', 7, '3급', TRUE),
('P008', '책임연구원', 8, '4급', TRUE)
ON DUPLICATE KEY UPDATE position_name = VALUES(position_name);

-- 2. 부서 정보
INSERT INTO departments (department_code, department_name, parent_department_id, department_order, is_active) VALUES
('D001', '경영지원본부', NULL, 1, TRUE),
('D002', '개발본부', NULL, 2, TRUE),
('D003', '인사팀', 1, 3, TRUE),
('D004', '기획팀', 1, 4, TRUE),
('D005', '개발1팀', 2, 5, TRUE),
('D006', '개발2팀', 2, 6, TRUE),
('D007', 'QA팀', 2, 7, TRUE),
('D008', '디자인팀', 2, 8, TRUE),
('D009', '마케팅팀', 1, 9, TRUE),
('D010', '영업팀', 1, 10, TRUE)
ON DUPLICATE KEY UPDATE department_name = VALUES(department_name);

-- 3. 직원 정보 (샘플)
INSERT INTO employees (employee_number, name, name_eng, email, phone, mobile, department_id, position_id, hire_date, employment_status, is_active) VALUES
('EMP001', '김철수', 'Kim Chulsoo', 'kim.chulsoo@company.com', '02-1234-5001', '010-1234-5001', 5, 7, '2020-01-15', 'ACTIVE', TRUE),
('EMP002', '이영희', 'Lee Younghee', 'lee.younghee@company.com', '02-1234-5002', '010-1234-5002', 4, 6, '2021-03-20', 'ACTIVE', TRUE),
('EMP003', '박민수', 'Park Minsu', 'park.minsu@company.com', '02-1234-5003', '010-1234-5003', 8, 2, '2019-06-10', 'ACTIVE', TRUE),
('EMP004', '정지훈', 'Jung Jihoon', 'jung.jihoon@company.com', '02-1234-5004', '010-1234-5004', 5, 8, '2018-09-01', 'ACTIVE', TRUE),
('EMP005', '최수진', 'Choi Sujin', 'choi.sujin@company.com', '02-1234-5005', '010-1234-5005', 7, 6, '2022-02-14', 'ACTIVE', TRUE),
('EMP006', '강동원', 'Kang Dongwon', 'kang.dongwon@company.com', '02-1234-5006', '010-1234-5006', 5, 7, '2020-05-20', 'ACTIVE', TRUE),
('EMP007', '한지민', 'Han Jimin', 'han.jimin@company.com', '02-1234-5007', '010-1234-5007', 4, 2, '2021-07-12', 'ACTIVE', TRUE),
('EMP008', '송중기', 'Song Joongki', 'song.joongki@company.com', '02-1234-5008', '010-1234-5008', 5, 6, '2022-01-03', 'ACTIVE', TRUE),
('EMP009', '전지현', 'Jeon Jihyun', 'jeon.jihyun@company.com', '02-1234-5009', '010-1234-5009', 9, 3, '2019-11-15', 'ACTIVE', TRUE),
('EMP010', '현빈', 'Hyun Bin', 'hyun.bin@company.com', '02-1234-5010', '010-1234-5010', 10, 4, '2018-04-22', 'ACTIVE', TRUE),
('EMP011', '이수민', 'Lee Sumin', 'lee.sumin@company.com', '02-1234-5011', '010-1234-5011', 5, 7, '2020-08-10', 'ACTIVE', TRUE),
('EMP012', '김도현', 'Kim Dohyun', 'kim.dohyun@company.com', '02-1234-5012', '010-1234-5012', 5, 8, '2019-03-05', 'ACTIVE', TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 4. 직급별 기본 경비 설정
INSERT INTO default_expense_settings (position_code, position_name, daily_allowance, meal_allowance, meeting_allowance, overtime_meal_allowance) VALUES
('P001', '사원', 30000, 30000, 15000, 10000),
('P002', '대리', 35000, 35000, 20000, 12000),
('P003', '과장', 40000, 40000, 25000, 15000),
('P004', '차장', 50000, 50000, 30000, 18000),
('P005', '부장', 60000, 60000, 40000, 20000),
('P006', '주임', 30000, 30000, 15000, 10000),
('P007', '선임연구원', 40000, 40000, 25000, 15000),
('P008', '책임연구원', 50000, 50000, 30000, 18000)
ON DUPLICATE KEY UPDATE position_name = VALUES(position_name);

-- ============================================
-- 프로젝트 샘플 데이터
-- ============================================

-- 1. 프로젝트 기본 정보
INSERT INTO projects (project_name, client_name, project_manager_id, start_date, end_date, project_status, progress_rate, description, created_by, updated_by) VALUES
('ERP 시스템 개발', '주식회사 테크솔루션', 1, '2025-01-01', '2025-12-31', 'IN_PROGRESS', 45, '통합 ERP 시스템 개발 프로젝트. 인사, 회계, 영업 등 전사적 업무 프로세스 통합.', 1, 1),
('모바일 앱 개발', 'ABC 주식회사', 2, '2025-03-01', '2025-08-31', 'PLANNING', 10, '고객용 모바일 애플리케이션 개발. iOS 및 Android 플랫폼 지원.', 2, 2),
('홈페이지 리뉴얼', '디지털마케팅코리아', 3, '2024-10-01', '2024-12-31', 'COMPLETED', 100, '회사 공식 홈페이지 전면 리뉴얼 프로젝트. 반응형 웹 디자인 적용.', 3, 3),
('전자결재 시스템 구축', '엔터프라이즈 솔루션', 4, '2024-07-01', '2024-09-30', 'COMPLETED', 100, '전자결재 및 문서관리 시스템 구축. 워크플로우 자동화.', 4, 4),
('인사관리 시스템 고도화', '인사혁신컨설팅', 5, '2024-04-01', '2024-06-30', 'COMPLETED', 100, '기존 인사관리 시스템 고도화. 성과평가 및 교육관리 기능 추가.', 5, 5),
('AI 챗봇 개발', '스마트AI연구소', 6, '2024-02-01', '2024-05-31', 'ON_HOLD', 35, 'AI 기반 고객 서비스 챗봇 개발 프로젝트. 자연어 처리 기술 적용.', 6, 6),
('고객 포털 사이트 개발', '글로벌커머스', 7, '2023-11-01', '2024-01-31', 'COMPLETED', 100, 'B2B 고객 포털 사이트 구축. 주문관리 및 배송조회 기능.', 7, 7),
('블록체인 결제 시스템', '핀테크이노베이션', 8, '2023-08-01', '2023-10-31', 'CANCELLED', 20, '블록체인 기반 결제 시스템 개발. 프로젝트 중단됨.', 8, 8),
('데이터 분석 플랫폼', '빅데이터센터', 11, '2023-05-01', '2023-10-31', 'COMPLETED', 100, '빅데이터 수집, 분석, 시각화 플랫폼 구축.', 11, 11),
('IoT 통합 관리 시스템', 'IoT솔루션즈', 12, '2023-02-01', '2023-07-31', 'COMPLETED', 100, 'IoT 디바이스 통합 관리 시스템. 실시간 모니터링 및 제어.', 12, 12);

-- 2. 프로젝트 참여연구원
INSERT INTO project_members (project_id, employee_id, participation_start_date, participation_end_date, role, is_active) VALUES
-- ERP 시스템 개발 (프로젝트 1)
(1, 1, '2025-01-01', NULL, 'PM', TRUE),
(1, 4, '2025-01-01', NULL, '백엔드 개발', TRUE),
(1, 6, '2025-01-15', NULL, '프론트엔드 개발', TRUE),
(1, 8, '2025-02-01', NULL, 'UI/UX 디자인', TRUE),
(1, 5, '2025-02-15', NULL, 'QA', TRUE),
-- 모바일 앱 개발 (프로젝트 2)
(2, 2, '2025-03-01', NULL, 'PM', TRUE),
(2, 4, '2025-03-01', NULL, '앱 개발', TRUE),
(2, 3, '2025-03-01', NULL, 'UI/UX', TRUE),
-- 홈페이지 리뉴얼 (프로젝트 3)
(3, 3, '2024-10-01', '2024-12-31', 'PM', TRUE),
(3, 6, '2024-10-01', '2024-12-31', '웹 개발', TRUE),
(3, 3, '2024-10-15', '2024-12-31', '디자인', TRUE),
(3, 9, '2024-11-01', '2024-12-31', '마케팅', TRUE),
-- 전자결재 시스템 구축 (프로젝트 4)
(4, 4, '2024-07-01', '2024-09-30', 'PM', TRUE),
(4, 1, '2024-07-01', '2024-09-30', '시스템 설계', TRUE),
(4, 6, '2024-07-15', '2024-09-30', '개발', TRUE),
(4, 8, '2024-08-01', '2024-09-30', '개발', TRUE),
(4, 5, '2024-08-15', '2024-09-30', 'QA', TRUE),
(4, 4, '2024-07-01', '2024-09-30', '개발 지원', TRUE),
-- 인사관리 시스템 고도화 (프로젝트 5)
(5, 5, '2024-04-01', '2024-06-30', 'PM', TRUE),
(5, 1, '2024-04-01', '2024-06-30', '개발', TRUE),
(5, 2, '2024-04-15', '2024-06-30', '기획', TRUE);

-- 3. 연구비 카드
INSERT INTO research_cards (project_id, card_company, card_last_digits, card_nickname, is_active, created_by) VALUES
(1, '신한카드', '1234', 'ERP 프로젝트 메인 카드', TRUE, 1),
(1, '삼성카드', '9012', 'ERP 프로젝트 서브 카드', TRUE, 1),
(2, 'KB국민카드', '5678', '모바일 앱 프로젝트 카드', TRUE, 2),
(3, '하나카드', '3456', '홈페이지 리뉴얼 카드', TRUE, 3),
(4, '현대카드', '7890', '전자결재 시스템 카드', FALSE, 4);

-- 4. 연계 프로젝트
INSERT INTO project_relations (source_project_id, target_project_id, relation_type, description) VALUES
(1, 4, 'RELATED', 'ERP 시스템에 전자결재 시스템 통합'),
(1, 5, 'RELATED', 'ERP 시스템에 인사관리 시스템 통합'),
(2, 7, 'RELATED', '모바일 앱과 고객 포털 연동');

-- 5. 프로젝트별 직급별 경비 설정 (프로젝트 1: ERP 시스템 개발)
INSERT INTO project_expense_settings (project_id, position_code, position_name, daily_allowance, meal_allowance, meeting_allowance, overtime_meal_allowance) VALUES
(1, 'P001', '사원', 30000, 30000, 15000, 10000),
(1, 'P002', '대리', 35000, 35000, 20000, 12000),
(1, 'P003', '과장', 40000, 40000, 25000, 15000),
(1, 'P004', '차장', 50000, 50000, 30000, 18000),
(1, 'P005', '부장', 60000, 60000, 40000, 20000);

-- 6. 프로젝트 첨부 파일 (샘플)
INSERT INTO project_files (project_id, original_filename, stored_filename, file_path, file_size, file_type, file_category, description, uploaded_by) VALUES
(1, 'ERP_기획서_v1.0.pdf', 'project_1_20250101_001.pdf', '/uploads/projects/1/', 2458624, 'application/pdf', 'PROPOSAL', 'ERP 시스템 개발 기획서', 1),
(1, 'ERP_시스템_아키텍처.pptx', 'project_1_20250115_002.pptx', '/uploads/projects/1/', 5242880, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'DESIGN', '시스템 아키텍처 설계 문서', 4),
(2, '모바일앱_디자인_가이드.pdf', 'project_2_20250301_001.pdf', '/uploads/projects/2/', 3145728, 'application/pdf', 'DESIGN', 'UI/UX 디자인 가이드라인', 3),
(3, '홈페이지_리뉴얼_최종보고서.docx', 'project_3_20241231_001.docx', '/uploads/projects/3/', 1048576, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'REPORT', '프로젝트 최종 보고서', 3);

-- 7. 프로젝트 진행 이력
INSERT INTO project_history (project_id, action_type, previous_status, new_status, previous_progress, new_progress, change_description, changed_by) VALUES
(1, 'CREATE', NULL, 'PLANNING', NULL, 0, '프로젝트 생성', 1),
(1, 'STATUS_CHANGE', 'PLANNING', 'IN_PROGRESS', 0, 10, '프로젝트 착수', 1),
(1, 'UPDATE', 'IN_PROGRESS', 'IN_PROGRESS', 10, 25, '요구사항 분석 완료', 1),
(1, 'UPDATE', 'IN_PROGRESS', 'IN_PROGRESS', 25, 45, '설계 및 개발 진행 중', 1),
(2, 'CREATE', NULL, 'PLANNING', NULL, 0, '프로젝트 생성', 2),
(2, 'UPDATE', 'PLANNING', 'PLANNING', 0, 10, '기획 단계 진행 중', 2),
(3, 'CREATE', NULL, 'PLANNING', NULL, 0, '프로젝트 생성', 3),
(3, 'STATUS_CHANGE', 'PLANNING', 'IN_PROGRESS', 0, 20, '프로젝트 착수', 3),
(3, 'UPDATE', 'IN_PROGRESS', 'IN_PROGRESS', 20, 60, '개발 진행 중', 3),
(3, 'UPDATE', 'IN_PROGRESS', 'IN_PROGRESS', 60, 95, '개발 완료, 테스트 중', 3),
(3, 'STATUS_CHANGE', 'IN_PROGRESS', 'COMPLETED', 95, 100, '프로젝트 완료', 3);
