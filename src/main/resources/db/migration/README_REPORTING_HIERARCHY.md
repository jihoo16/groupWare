# 보고체계 관리 기능 마이그레이션 가이드

## 📋 개요

이 마이그레이션은 ERP 시스템에 **보고체계 관리** 기능을 추가합니다.

- **대상 테이블**: `erp.user`
- **신규 테이블**: `erp.reporting_hierarchy_history`
- **마이그레이션 파일**: `V1__add_reporting_hierarchy.sql`

---

## 🎯 추가되는 기능

### 1. **보고 관계 관리**
   - 직원의 상위 보고자 지정
   - 조직도 계층 구조 표현
   - 보고자 변경 이력 추적

### 2. **조직 레벨 관리**
   - 1: 대표이사
   - 2: 임원급 (상무, 이사, CXO)
   - 3: 팀장급 (팀장, 부장, 본부장)
   - 4: 일반 직원 (과장, 대리, 사원 등)

### 3. **팀장 여부 관리**
   - 팀원을 관리하는 팀장/리더 여부 플래그

---

## 📊 데이터베이스 변경 사항

### user 테이블에 추가되는 컬럼

| 컬럼명                  | 타입      | Nullable | Default | 설명                                      |
|-------------------------|-----------|----------|---------|-------------------------------------------|
| `manager_idx`           | BIGINT    | YES      | NULL    | 상위 보고자 IDX (user.idx FK)             |
| `organizational_level`  | INTEGER   | NO       | 4       | 조직 레벨 (1~4)                           |
| `is_team_leader`        | BOOLEAN   | NO       | FALSE   | 팀장 여부                                 |
| `manager_start_date`    | DATE      | YES      | NULL    | 현재 보고자 지정 시작일                   |

### 신규 테이블: reporting_hierarchy_history

보고체계 변경 이력을 추적하는 테이블입니다.

| 컬럼명                      | 타입         | 설명                          |
|-----------------------------|--------------|-------------------------------|
| `idx`                       | BIGSERIAL    | PK                            |
| `emp_idx`                   | BIGINT       | 대상 직원 IDX                 |
| `previous_manager_idx`      | BIGINT       | 이전 보고자 IDX               |
| `new_manager_idx`           | BIGINT       | 새로운 보고자 IDX             |
| `previous_level`            | INTEGER      | 이전 조직 레벨                |
| `new_level`                 | INTEGER      | 새로운 조직 레벨              |
| `previous_is_team_leader`   | BOOLEAN      | 이전 팀장 여부                |
| `new_is_team_leader`        | BOOLEAN      | 새로운 팀장 여부              |
| `change_reason`             | VARCHAR(500) | 변경 사유                     |
| `change_date`               | TIMESTAMP    | 변경 일시                     |
| `changed_by_user_idx`       | BIGINT       | 변경 작업 수행자              |

---

## 🚀 마이그레이션 실행 방법

### 방법 1: psql 명령어로 실행 (권장)

```bash
# Windows (CMD)
set PGPASSWORD=rdsdap1234!%
psql -h 192.168.1.165 -p 15431 -U erp_dev -d pinecni -f "C:\PRJ\erp\src\main\resources\db\migration\V1__add_reporting_hierarchy.sql"

# Windows (PowerShell)
$env:PGPASSWORD="rdsdap1234!%"
psql -h 192.168.1.165 -p 15431 -U erp_dev -d pinecni -f "C:\PRJ\erp\src\main\resources\db\migration\V1__add_reporting_hierarchy.sql"

# Linux/Mac
export PGPASSWORD='rdsdap1234!%'
psql -h 192.168.1.165 -p 15431 -U erp_dev -d pinecni -f ./src/main/resources/db/migration/V1__add_reporting_hierarchy.sql
```

### 방법 2: SQL 파일 내용을 직접 복사하여 실행

1. SQL 클라이언트 (DBeaver, pgAdmin, DataGrip 등) 접속
2. `V1__add_reporting_hierarchy.sql` 파일 내용 복사
3. 쿼리 창에 붙여넣기 후 실행

---

## ✅ 마이그레이션 확인

### 1. 컬럼 추가 확인

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'erp'
  AND table_name = 'user'
  AND column_name IN ('manager_idx', 'organizational_level', 'is_team_leader', 'manager_start_date')
ORDER BY ordinal_position;
```

### 2. 제약조건 확인

```sql
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'erp.user'::regclass
  AND conname LIKE '%manager%';
```

### 3. 인덱스 확인

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'erp'
  AND tablename = 'user'
  AND (indexname LIKE '%manager%' OR indexname LIKE '%level%' OR indexname LIKE '%leader%');
```

### 4. 데이터 확인

```sql
SELECT
    emp_id,
    emp_name,
    emp_position,
    organizational_level,
    is_team_leader,
    manager_idx,
    manager_start_date
FROM erp."user"
WHERE deleted_at IS NULL
ORDER BY organizational_level, emp_dept, emp_name
LIMIT 20;
```

---

## 🔄 Entity 클래스 업데이트 필요

마이그레이션 후 **User.java** 엔티티에 다음 필드를 추가해야 합니다:

```java
@Column(name = "manager_idx")
private Long managerIdx;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "manager_idx", insertable = false, updatable = false)
private User manager;

@Column(name = "organizational_level", nullable = false)
private Integer organizationalLevel = 4;

@Column(name = "is_team_leader", nullable = false)
private Boolean isTeamLeader = false;

@Column(name = "manager_start_date")
private LocalDate managerStartDate;
```

새로운 Entity 클래스 `ReportingHierarchyHistory.java` 생성이 필요합니다.

---

## ⚠️ 주의사항

1. **백업 필수**
   - 마이그레이션 전에 반드시 데이터베이스 백업을 수행하세요
   ```bash
   pg_dump -h 192.168.1.165 -p 15431 -U erp_dev -d pinecni -F c -f backup_before_hierarchy_$(date +%Y%m%d).dump
   ```

2. **샘플 데이터**
   - SQL 파일의 8번 섹션(샘플 데이터)은 개발/테스트 환경용입니다
   - 운영 환경에서는 해당 섹션을 주석 처리하거나 삭제하세요

3. **기존 데이터 영향**
   - 기존 user 테이블의 데이터는 유지됩니다
   - 새로 추가된 컬럼은 기본값으로 설정됩니다
     - `organizational_level`: 4 (일반 직원)
     - `is_team_leader`: FALSE
     - `manager_idx`: NULL

4. **순환 참조 방지**
   - 보고자 지정 시 순환 참조가 발생하지 않도록 애플리케이션 레벨에서 검증이 필요합니다
   - 예: A → B → C → A (순환 참조)

---

## 🔧 롤백 방법

마이그레이션을 되돌려야 할 경우:

```sql
-- 1. 이력 테이블 삭제
DROP TABLE IF EXISTS erp.reporting_hierarchy_history CASCADE;
DROP SEQUENCE IF EXISTS erp.reporting_hierarchy_history_sequence;

-- 2. user 테이블 인덱스 삭제
DROP INDEX IF EXISTS erp.idx_user_manager_idx;
DROP INDEX IF EXISTS erp.idx_user_organizational_level;
DROP INDEX IF EXISTS erp.idx_user_is_team_leader;
DROP INDEX IF EXISTS erp.idx_user_dept_level;

-- 3. user 테이블 컬럼 삭제
ALTER TABLE erp."user" DROP COLUMN IF EXISTS manager_idx;
ALTER TABLE erp."user" DROP COLUMN IF EXISTS organizational_level;
ALTER TABLE erp."user" DROP COLUMN IF EXISTS is_team_leader;
ALTER TABLE erp."user" DROP COLUMN IF EXISTS manager_start_date;

COMMIT;
```

---

## 📞 문의

마이그레이션 관련 문제가 발생하면 개발팀에 문의하세요.
