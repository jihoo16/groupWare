# 프로젝트 관리 모듈 DB 설계 문서

## 개요
프로젝트 관리 및 연구비 카드 관리를 위한 데이터베이스 스키마입니다.

## 실행 순서

### 1. DDL 실행 (테이블 생성)
```sql
-- H2 Console 또는 MySQL Workbench에서 실행
source project-ddl.sql;
```

### 2. 샘플 데이터 삽입 (선택사항)
```sql
-- 개발/테스트 환경에서만 실행
source project-dml-sample.sql;
```

## 테이블 구조

### 핵심 테이블

#### 1. projects (프로젝트 기본 정보)
프로젝트의 기본 정보를 관리하는 메인 테이블

| 컬럼명 | 타입 | 설명 | 비고 |
|--------|------|------|------|
| project_id | BIGINT | 프로젝트 ID | PK, Auto Increment |
| project_name | VARCHAR(200) | 프로젝트명 | NOT NULL |
| client_name | VARCHAR(200) | 발주사 | |
| project_manager_id | BIGINT | 연구 책임자 ID | FK → employees |
| start_date | DATE | 시작일 | NOT NULL |
| end_date | DATE | 종료일 | NOT NULL |
| project_status | VARCHAR(20) | 프로젝트 상태 | PLANNING, IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED |
| progress_rate | INT | 진행률 (%) | 0-100 |
| description | TEXT | 프로젝트 설명 | |
| receipt_url | VARCHAR(500) | 영수증 등록 페이지 URL | |
| created_at | TIMESTAMP | 생성일시 | |
| updated_at | TIMESTAMP | 수정일시 | |
| created_by | BIGINT | 생성자 ID | |
| updated_by | BIGINT | 수정자 ID | |
| is_deleted | BOOLEAN | 삭제 여부 | 논리 삭제 |

**인덱스:**
- idx_project_status (project_status)
- idx_project_manager (project_manager_id)
- idx_start_date (start_date)
- idx_end_date (end_date)

#### 2. project_members (프로젝트 참여연구원)
프로젝트에 참여하는 연구원 정보

| 컬럼명 | 타입 | 설명 | 비고 |
|--------|------|------|------|
| member_id | BIGINT | 참여연구원 ID | PK, Auto Increment |
| project_id | BIGINT | 프로젝트 ID | FK → projects |
| employee_id | BIGINT | 직원 ID | FK → employees |
| participation_start_date | DATE | 참여 시작일 | NOT NULL |
| participation_end_date | DATE | 참여 종료일 | NULL 가능 (진행 중) |
| role | VARCHAR(100) | 역할 | PM, 개발자, QA 등 |
| is_active | BOOLEAN | 활동 여부 | |
| created_at | TIMESTAMP | 등록일시 | |
| updated_at | TIMESTAMP | 수정일시 | |

**제약조건:**
- UNIQUE KEY: (project_id, employee_id, participation_start_date)
- CASCADE DELETE: 프로젝트 삭제 시 함께 삭제

**인덱스:**
- idx_project (project_id)
- idx_employee (employee_id)
- idx_dates (participation_start_date, participation_end_date)

#### 3. research_cards (연구비 카드)
프로젝트별 연구비 카드 정보

| 컬럼명 | 타입 | 설명 | 비고 |
|--------|------|------|------|
| card_id | BIGINT | 카드 ID | PK, Auto Increment |
| project_id | BIGINT | 프로젝트 ID | FK → projects |
| card_company | VARCHAR(50) | 카드사명 | NOT NULL |
| card_last_digits | CHAR(4) | 카드 뒷 4자리 | NOT NULL |
| card_nickname | VARCHAR(100) | 카드 별칭 | |
| is_active | BOOLEAN | 사용 여부 | |
| created_at | TIMESTAMP | 등록일시 | |
| updated_at | TIMESTAMP | 수정일시 | |
| created_by | BIGINT | 등록자 ID | |

**보안:**
- 카드 전체 번호는 저장하지 않음 (PCI-DSS 준수)
- 뒷 4자리만 저장하여 식별용으로 사용

**인덱스:**
- idx_project (project_id)
- idx_card_company (card_company)
- idx_card_digits (card_last_digits)

#### 4. project_relations (연계 프로젝트)
프로젝트 간 연계 관계 정보

| 컬럼명 | 타입 | 설명 | 비고 |
|--------|------|------|------|
| relation_id | BIGINT | 연계 ID | PK, Auto Increment |
| source_project_id | BIGINT | 소스 프로젝트 ID | FK → projects |
| target_project_id | BIGINT | 연계 프로젝트 ID | FK → projects |
| relation_type | VARCHAR(50) | 연계 유형 | RELATED, PARENT, CHILD |
| description | VARCHAR(500) | 연계 설명 | |
| created_at | TIMESTAMP | 등록일시 | |

**제약조건:**
- UNIQUE KEY: (source_project_id, target_project_id)
- CASCADE DELETE: 프로젝트 삭제 시 연계 정보도 삭제

#### 5. project_expense_settings (프로젝트별 직급별 경비 설정)
프로젝트별로 직급별 경비를 커스터마이즈하여 설정

| 컬럼명 | 타입 | 설명 | 비고 |
|--------|------|------|------|
| setting_id | BIGINT | 설정 ID | PK, Auto Increment |
| project_id | BIGINT | 프로젝트 ID | FK → projects |
| position_code | VARCHAR(20) | 직급 코드 | |
| position_name | VARCHAR(50) | 직급명 | |
| daily_allowance | INT | 출장 일비 | 원 단위 |
| meal_allowance | INT | 출장 식비 | 원 단위 |
| meeting_allowance | INT | 회의비 | 원 단위 |
| overtime_meal_allowance | INT | 야근 식대 | 원 단위 |
| created_at | TIMESTAMP | 등록일시 | |
| updated_at | TIMESTAMP | 수정일시 | |

**제약조건:**
- UNIQUE KEY: (project_id, position_code)

**참고:**
- default_expense_settings 테이블에서 기본값을 불러올 수 있음
- 프로젝트별로 커스터마이징 가능

#### 6. project_files (프로젝트 첨부 파일)
프로젝트 관련 첨부 파일 정보

| 컬럼명 | 타입 | 설명 | 비고 |
|--------|------|------|------|
| file_id | BIGINT | 파일 ID | PK, Auto Increment |
| project_id | BIGINT | 프로젝트 ID | FK → projects |
| original_filename | VARCHAR(255) | 원본 파일명 | NOT NULL |
| stored_filename | VARCHAR(255) | 저장된 파일명 | NOT NULL, UUID 등 |
| file_path | VARCHAR(500) | 파일 경로 | NOT NULL |
| file_size | BIGINT | 파일 크기 | bytes |
| file_type | VARCHAR(100) | 파일 유형 | MIME type |
| file_category | VARCHAR(50) | 파일 분류 | GENERAL, PROPOSAL, DESIGN, REPORT |
| description | VARCHAR(500) | 파일 설명 | |
| uploaded_by | BIGINT | 업로드자 ID | |
| uploaded_at | TIMESTAMP | 업로드일시 | |
| is_deleted | BOOLEAN | 삭제 여부 | 논리 삭제 |

**인덱스:**
- idx_project (project_id)
- idx_uploaded_at (uploaded_at)
- idx_file_category (file_category)

#### 7. project_history (프로젝트 진행 이력)
프로젝트 변경 이력 추적용 (선택사항)

| 컬럼명 | 타입 | 설명 | 비고 |
|--------|------|------|------|
| history_id | BIGINT | 이력 ID | PK, Auto Increment |
| project_id | BIGINT | 프로젝트 ID | FK → projects |
| action_type | VARCHAR(50) | 액션 유형 | CREATE, UPDATE, STATUS_CHANGE, DELETE |
| previous_status | VARCHAR(20) | 이전 상태 | |
| new_status | VARCHAR(20) | 새 상태 | |
| previous_progress | INT | 이전 진행률 | |
| new_progress | INT | 새 진행률 | |
| change_description | TEXT | 변경 내용 | |
| changed_by | BIGINT | 변경자 ID | |
| changed_at | TIMESTAMP | 변경일시 | |

**용도:**
- 프로젝트 변경 이력 추적
- 감사(Audit) 로그
- 진행 상황 타임라인

### 참조 테이블 (기초정보관리 모듈)

#### positions (직급 정보)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| position_id | BIGINT | 직급 ID (PK) |
| position_code | VARCHAR(20) | 직급 코드 (UNIQUE) |
| position_name | VARCHAR(50) | 직급명 |
| position_order | INT | 직급 순서 |
| salary_grade | VARCHAR(20) | 급여 등급 |
| is_active | BOOLEAN | 사용 여부 |

#### departments (부서 정보)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| department_id | BIGINT | 부서 ID (PK) |
| department_code | VARCHAR(20) | 부서 코드 (UNIQUE) |
| department_name | VARCHAR(100) | 부서명 |
| parent_department_id | BIGINT | 상위 부서 ID (Self FK) |
| department_order | INT | 정렬 순서 |
| is_active | BOOLEAN | 사용 여부 |

#### employees (직원 정보)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| employee_id | BIGINT | 직원 ID (PK) |
| employee_number | VARCHAR(20) | 사번 (UNIQUE) |
| name | VARCHAR(50) | 이름 |
| email | VARCHAR(100) | 이메일 |
| department_id | BIGINT | 부서 ID (FK) |
| position_id | BIGINT | 직급 ID (FK) |
| employment_status | VARCHAR(20) | 재직 상태 |

#### default_expense_settings (직급별 기본 경비 설정)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| setting_id | BIGINT | 설정 ID (PK) |
| position_code | VARCHAR(20) | 직급 코드 |
| position_name | VARCHAR(50) | 직급명 |
| daily_allowance | INT | 출장 일비 |
| meal_allowance | INT | 출장 식비 |
| meeting_allowance | INT | 회의비 |
| overtime_meal_allowance | INT | 야근 식대 |

## ER 다이어그램

```
┌─────────────────┐
│   employees     │
│─────────────────│
│ employee_id (PK)│
│ name            │
│ department_id   │
│ position_id     │
└────────┬────────┘
         │
         │ 1:N (project_manager_id)
         │
┌────────▼────────────────────┐
│      projects               │
│─────────────────────────────│
│ project_id (PK)             │
│ project_name                │
│ client_name                 │
│ project_manager_id (FK)     │
│ project_status              │
│ progress_rate               │
│ ...                         │
└────┬───────┬───────┬────────┘
     │       │       │
     │       │       │
     │       │       └──────────┐
     │       │                  │
     │       │ 1:N              │ 1:N
     │       │                  │
┌────▼──────────────┐  ┌───────▼─────────────┐
│ project_members   │  │  research_cards     │
│───────────────────│  │─────────────────────│
│ member_id (PK)    │  │ card_id (PK)        │
│ project_id (FK)   │  │ project_id (FK)     │
│ employee_id (FK)  │  │ card_company        │
│ participation_... │  │ card_last_digits    │
└───────────────────┘  └─────────────────────┘
     │
     │ 1:N
     │
┌────▼─────────────────────┐
│ project_expense_settings │
│──────────────────────────│
│ setting_id (PK)          │
│ project_id (FK)          │
│ position_code            │
│ daily_allowance          │
│ ...                      │
└──────────────────────────┘

┌──────────────────────────┐
│  project_relations       │
│──────────────────────────│
│ relation_id (PK)         │
│ source_project_id (FK)   │
│ target_project_id (FK)   │
│ relation_type            │
└──────────────────────────┘

┌──────────────────────────┐
│    project_files         │
│──────────────────────────│
│ file_id (PK)             │
│ project_id (FK)          │
│ original_filename        │
│ stored_filename          │
│ file_path                │
└──────────────────────────┘

┌──────────────────────────┐
│   project_history        │
│──────────────────────────│
│ history_id (PK)          │
│ project_id (FK)          │
│ action_type              │
│ changed_by               │
└──────────────────────────┘
```

## 주요 비즈니스 로직

### 1. 프로젝트 생성
```sql
-- 1. 프로젝트 기본 정보 등록
INSERT INTO projects (...) VALUES (...);

-- 2. 참여연구원 등록
INSERT INTO project_members (...) VALUES (...);

-- 3. 연구비 카드 등록
INSERT INTO research_cards (...) VALUES (...);

-- 4. 직급별 경비 설정 복사 (기본값에서)
INSERT INTO project_expense_settings (project_id, position_code, ...)
SELECT ?, position_code, ... FROM default_expense_settings;

-- 5. 이력 기록
INSERT INTO project_history (project_id, action_type, ...)
VALUES (?, 'CREATE', ...);
```

### 2. 프로젝트 상태 변경
```sql
-- 상태 변경 전 이력 기록
INSERT INTO project_history (project_id, action_type, previous_status, new_status, ...)
SELECT project_id, 'STATUS_CHANGE', project_status, 'NEW_STATUS', ...
FROM projects WHERE project_id = ?;

-- 상태 업데이트
UPDATE projects
SET project_status = ?, updated_at = NOW(), updated_by = ?
WHERE project_id = ?;
```

### 3. 프로젝트 진행률 업데이트
```sql
-- 진행률 변경 전 이력 기록
INSERT INTO project_history (project_id, action_type, previous_progress, new_progress, ...)
SELECT project_id, 'UPDATE', progress_rate, ?, ...
FROM projects WHERE project_id = ?;

-- 진행률 업데이트
UPDATE projects
SET progress_rate = ?, updated_at = NOW(), updated_by = ?
WHERE project_id = ?;
```

### 4. 프로젝트 목록 조회 (진행 중인 프로젝트)
```sql
SELECT
    p.project_id,
    p.project_name,
    p.client_name,
    p.project_status,
    p.progress_rate,
    p.start_date,
    p.end_date,
    p.description,
    e.name AS manager_name,
    COUNT(DISTINCT pm.employee_id) AS team_size
FROM projects p
LEFT JOIN employees e ON p.project_manager_id = e.employee_id
LEFT JOIN project_members pm ON p.project_id = pm.project_id AND pm.is_active = TRUE
WHERE p.project_status IN ('PLANNING', 'IN_PROGRESS')
  AND p.is_deleted = FALSE
GROUP BY p.project_id
ORDER BY p.start_date DESC;
```

### 5. 연구비 카드 조회
```sql
SELECT
    rc.card_id,
    rc.card_company,
    rc.card_last_digits,
    rc.card_nickname,
    rc.created_at,
    p.project_id,
    p.project_name,
    p.project_status,
    e.name AS manager_name
FROM research_cards rc
INNER JOIN projects p ON rc.project_id = p.project_id
LEFT JOIN employees e ON p.project_manager_id = e.employee_id
WHERE rc.is_active = TRUE
  AND p.is_deleted = FALSE
ORDER BY rc.created_at DESC;
```

## 인덱스 전략

### 성능 최적화를 위한 인덱스
1. **projects 테이블**
   - `idx_project_status`: 상태별 필터링에 사용
   - `idx_project_manager`: PM별 프로젝트 조회
   - `idx_start_date`, `idx_end_date`: 기간별 조회

2. **project_members 테이블**
   - `idx_project`: 프로젝트별 팀원 조회
   - `idx_employee`: 직원별 참여 프로젝트 조회
   - `idx_dates`: 기간별 참여 이력 조회

3. **research_cards 테이블**
   - `idx_project`: 프로젝트별 카드 조회
   - `idx_card_company`: 카드사별 필터링
   - `idx_card_digits`: 카드 번호로 검색

## 보안 고려사항

### 1. 카드 정보 보호
- 카드 전체 번호는 저장하지 않음
- 뒷 4자리만 저장하여 식별용으로만 사용
- 실제 결제 정보는 외부 결제 시스템(PG사) 이용 권장

### 2. 논리 삭제
- `is_deleted` 컬럼을 사용한 논리 삭제 (Soft Delete)
- 실제 데이터는 삭제하지 않고 플래그만 변경
- 복구 및 감사 추적 가능

### 3. 변경 이력 추적
- `project_history` 테이블로 모든 변경 사항 기록
- 감사(Audit) 로그 유지
- 누가(changed_by), 언제(changed_at), 무엇을(change_description) 변경했는지 추적

## 데이터 마이그레이션 가이드

### H2 (개발) → MySQL (운영) 마이그레이션

1. **DDL 차이점 조정**
```sql
-- H2용 AUTO_INCREMENT를 MySQL로 변환
-- H2: BIGINT AUTO_INCREMENT
-- MySQL: BIGINT AUTO_INCREMENT (동일)
```

2. **날짜/시간 함수 차이**
```sql
-- H2: CURRENT_TIMESTAMP
-- MySQL: CURRENT_TIMESTAMP (동일)
```

3. **문자셋 설정**
```sql
-- MySQL 테이블 생성 시 문자셋 명시
ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 향후 확장 가능 영역

### 1. 프로젝트 예산 관리
```sql
CREATE TABLE project_budgets (
    budget_id BIGINT PRIMARY KEY,
    project_id BIGINT,
    budget_category VARCHAR(50),  -- 인건비, 경비, 장비비 등
    budget_amount DECIMAL(15,2),
    used_amount DECIMAL(15,2),
    ...
);
```

### 2. 프로젝트 마일스톤
```sql
CREATE TABLE project_milestones (
    milestone_id BIGINT PRIMARY KEY,
    project_id BIGINT,
    milestone_name VARCHAR(200),
    target_date DATE,
    completion_date DATE,
    status VARCHAR(20),
    ...
);
```

### 3. 프로젝트 리스크 관리
```sql
CREATE TABLE project_risks (
    risk_id BIGINT PRIMARY KEY,
    project_id BIGINT,
    risk_title VARCHAR(200),
    risk_level VARCHAR(20),  -- LOW, MEDIUM, HIGH, CRITICAL
    mitigation_plan TEXT,
    ...
);
```

## 문의 및 지원
- 프로젝트 관리 모듈 개발팀
- 데이터베이스 관련 문의: DBA팀
