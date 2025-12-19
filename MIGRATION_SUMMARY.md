# 📋 보고체계 관리 기능 마이그레이션 요약

## 🎯 작업 개요

**목적**: 보고체계 관리 페이지의 더미 데이터를 실제 데이터베이스와 연동

**작업일**: 2025-01-XX

---

## 📊 분석 결과

### 기존 테이블 구조
- ✅ **user 테이블**: 직원 기본 정보 저장 (emp_dept는 code 테이블 참조)
- ✅ **departments 테이블**: 부서 계층 구조
- ✅ **code 테이블**: 공통 코드 (부서 코드는 C01 그룹)

### 보고체계 관리에 필요한 데이터
- ❌ **상위 보고자 정보** (manager_idx) - 없음
- ❌ **조직 레벨** (organizational_level) - 없음
- ❌ **팀장 여부** (is_team_leader) - 없음
- ❌ **보고 체계 변경 이력** - 테이블 없음

**결론**: 새로운 컬럼 추가 및 이력 테이블 생성 필요

---

## ✅ 완료된 작업

### 1. SQL 마이그레이션 파일 작성
📄 **파일**: `src/main/resources/db/migration/V1__add_reporting_hierarchy.sql`

**포함 내용**:
- user 테이블에 4개 컬럼 추가
  - `manager_idx` (상위 보고자)
  - `organizational_level` (조직 레벨: 1~4)
  - `is_team_leader` (팀장 여부)
  - `manager_start_date` (보고자 지정일)
- 외래키 제약조건 추가
- 성능 최적화 인덱스 추가
- `reporting_hierarchy_history` 이력 테이블 생성
- 샘플 데이터 자동 설정 (직급 기반)

### 2. Entity 클래스 업데이트
📄 **파일**: `src/main/java/com/pinecni/erp/entity/User.java`

**추가된 필드**:
```java
private Long managerIdx;
private User manager;
private Integer organizationalLevel = 4;
private Boolean isTeamLeader = false;
private LocalDate managerStartDate;
```

### 3. 새로운 Entity 클래스 생성
📄 **파일**: `src/main/java/com/pinecni/erp/entity/ReportingHierarchyHistory.java`

보고체계 변경 이력을 추적하는 엔티티

### 4. 마이그레이션 가이드 작성
📄 **파일**: `src/main/resources/db/migration/README_REPORTING_HIERARCHY.md`

실행 방법, 확인 방법, 롤백 방법 등 상세 가이드 포함

---

## 🚀 다음 단계 (실행 필요)

### Step 1: 데이터베이스 백업 (필수)

```bash
# Windows (CMD)
set PGPASSWORD=rdsdap1234!%
pg_dump -h 192.168.1.165 -p 15431 -U erp_dev -d pinecni -F c -f backup_before_hierarchy_%date:~0,4%%date:~5,2%%date:~8,2%.dump

# Linux/Mac
export PGPASSWORD='rdsdap1234!%'
pg_dump -h 192.168.1.165 -p 15431 -U erp_dev -d pinecni -F c -f backup_before_hierarchy_$(date +%Y%m%d).dump
```

### Step 2: 마이그레이션 실행

**Windows (CMD)**:
```cmd
set PGPASSWORD=rdsdap1234!%
psql -h 192.168.1.165 -p 15431 -U erp_dev -d pinecni -f "C:\PRJ\erp\src\main\resources\db\migration\V1__add_reporting_hierarchy.sql"
```

**Windows (PowerShell)**:
```powershell
$env:PGPASSWORD="rdsdap1234!%"
psql -h 192.168.1.165 -p 15431 -U erp_dev -d pinecni -f "C:\PRJ\erp\src\main\resources\db\migration\V1__add_reporting_hierarchy.sql"
```

### Step 3: 마이그레이션 확인

```sql
-- 컬럼 추가 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'erp'
  AND table_name = 'user'
  AND column_name IN ('manager_idx', 'organizational_level', 'is_team_leader', 'manager_start_date');

-- 데이터 확인
SELECT emp_id, emp_name, emp_position, organizational_level, is_team_leader, manager_idx
FROM erp."user"
WHERE deleted_at IS NULL
ORDER BY organizational_level, emp_name
LIMIT 10;
```

### Step 4: 애플리케이션 재시작

마이그레이션 후 Spring Boot 애플리케이션을 재시작하여 변경사항 반영

```bash
./gradlew bootRun
```

---

## 📁 생성된 파일 목록

```
C:\PRJ\erp\
├── src\main\resources\db\migration\
│   ├── V1__add_reporting_hierarchy.sql          # 마이그레이션 SQL
│   └── README_REPORTING_HIERARCHY.md            # 상세 가이드
├── src\main\java\com\pinecni\erp\entity\
│   ├── User.java                                # 업데이트됨
│   └── ReportingHierarchyHistory.java           # 신규 생성
└── MIGRATION_SUMMARY.md                         # 본 문서
```

---

## 🔍 조직 레벨 정의

| 레벨 | 설명           | 직급 예시                        |
|------|----------------|----------------------------------|
| 1    | 대표이사       | 대표이사                         |
| 2    | 임원급         | 상무, 이사, CFO, CTO, CMO, COO   |
| 3    | 팀장급         | 팀장, 부장, 본부장               |
| 4    | 일반 직원      | 과장, 대리, 주임, 사원, 인턴     |

---

## ⚠️ 주의사항

1. **백업 필수**: 마이그레이션 전 반드시 데이터베이스 백업
2. **운영 환경**: 샘플 데이터 삽입 부분(SQL 파일 8번 섹션) 주석 처리 고려
3. **순환 참조**: 애플리케이션에서 순환 참조 검증 로직 필요
4. **테스트**: 개발 환경에서 먼저 테스트 후 운영 적용

---

## 🔄 다음 작업 (백엔드 API 구현)

마이그레이션 완료 후 다음 작업이 필요합니다:

1. **Repository 생성**
   - `ReportingHierarchyHistoryRepository.java`

2. **Service 구현**
   - `HierarchyService.java`
   - 보고체계 조회, 수정, 이력 조회 기능

3. **Controller 구현**
   - `/api/employees/hierarchy` - 보고체계 목록 조회
   - `/api/employees/{id}/manager` - 보고자 변경
   - `/api/employees/{id}/hierarchy-history` - 변경 이력 조회

4. **프론트엔드 연동**
   - `manage-hierarchy.js`의 Mock 데이터를 실제 API 호출로 교체

---

## 📞 문의

마이그레이션 또는 구현 관련 문제 발생 시 개발팀에 문의하세요.
