# ResearchCard → ProjectCard 마이그레이션 가이드

## 개요
- **목적**: `research_card` 테이블을 `project_card`로 변경 (한글명은 "연구비카드" 유지)
- **변경 범위**: 테이블명, Entity, Repository, Service, Controller, DTO
- **API 엔드포인트**: `/api/research-cards` → `/api/project-cards`
- **한글 명칭**: "연구비카드" (변경 없음)

---

## 📋 변경 사항 요약

### 1. 데이터베이스 (DDL)
| 구분 | 변경 전 | 변경 후 |
|------|---------|---------|
| 테이블명 | `research_cards` | `project_cards` |
| 시퀀스 | `research_cards_sequence` | `project_cards_sequence` |
| 인덱스 | `idx_rc_*` | `idx_pc_*` |

### 2. Java 파일
| 파일 타입 | 변경 전 | 변경 후 |
|----------|---------|---------|
| Entity | `ResearchCard.java` | `ProjectCard.java` |
| Repository | `ResearchCardRepository.java` | `ProjectCardRepository.java` |
| DTO | `ResearchCardDTO.java` | `ProjectCardDTO.java` |
| Service | `ResearchCardService.java` | `ProjectCardService.java` |
| ServiceImpl | `ResearchCardServiceImpl.java` | `ProjectCardServiceImpl.java` |
| Controller | `ResearchCardController.java` | `ProjectCardController.java` |

### 3. API 엔드포인트
| HTTP Method | 변경 전 | 변경 후 |
|-------------|---------|---------|
| GET | `/api/research-cards` | `/api/project-cards` |
| GET | `/api/research-cards/{idx}` | `/api/project-cards/{idx}` |
| POST | `/api/research-cards` | `/api/project-cards` |
| PUT | `/api/research-cards/{idx}` | `/api/project-cards/{idx}` |
| DELETE | `/api/research-cards/{idx}` | `/api/project-cards/{idx}` |

---

## 🚀 마이그레이션 실행 순서

### Step 1: 데이터베이스 DDL 실행
```bash
# PostgreSQL에 접속
psql -h 192.168.1.165 -p 15431 -U erp_dev -d pinecni

# DDL 파일 실행
\i migration_research_card_to_project_card.sql
```

**또는 애플리케이션 실행 시 자동 적용** (JPA가 자동으로 감지하여 변경)

### Step 2: 기존 파일 삭제
```bash
# Windows PowerShell 또는 Git Bash에서 실행
cd C:\PRJ\erp

# Entity 삭제
rm src/main/java/com/pinecni/erp/entity/ResearchCard.java

# Repository 삭제
rm src/main/java/com/pinecni/erp/api/project/repository/ResearchCardRepository.java

# DTO 삭제
rm src/main/java/com/pinecni/erp/api/project/dto/ResearchCardDTO.java

# Service 삭제
rm src/main/java/com/pinecni/erp/api/project/service/ResearchCardService.java
rm src/main/java/com/pinecni/erp/api/project/service/ResearchCardServiceImpl.java

# Controller 삭제
rm src/main/java/com/pinecni/erp/api/project/controller/ResearchCardController.java
```

### Step 3: 애플리케이션 재시작
```bash
# Gradle 빌드
./gradlew clean build

# Spring Boot 재시작
./gradlew bootRun
```

---

## ✅ 검증 방법

### 1. 데이터베이스 확인
```sql
-- 테이블 이름 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'erp' AND table_name = 'project_cards';

-- 데이터 확인
SELECT COUNT(*) FROM erp.project_cards;

-- 시퀀스 확인
SELECT sequence_name FROM information_schema.sequences
WHERE sequence_schema = 'erp' AND sequence_name = 'project_cards_sequence';
```

### 2. API 테스트
```bash
# 전체 카드 조회
curl -X GET http://localhost:8080/api/project-cards

# 카드 상세 조회
curl -X GET http://localhost:8080/api/project-cards/1

# 카드 등록
curl -X POST http://localhost:8080/api/project-cards \
  -H "Content-Type: application/json" \
  -d '{
    "projectIdx": 1,
    "cardCompany": "신한카드",
    "cardLastDigits": "1234",
    "cardNickname": "프로젝트 카드 1"
  }'
```

### 3. 로그 확인
```bash
# 애플리케이션 로그에서 확인
# 성공적으로 로드되었는지 확인
grep "ProjectCard" logs/spring.log
```

---

## 📝 추가 작업 필요 사항

### 프론트엔드 수정 (JavaScript)
기존 API 호출 부분을 수정해야 합니다:

```javascript
// 변경 전
fetch('/api/research-cards')

// 변경 후
fetch('/api/project-cards')
```

**영향받는 파일 (예상):**
- `project-card.js`
- 기타 연구비 카드 관련 JavaScript 파일

---

## 🔄 롤백 방법
문제 발생 시 다음 DDL로 롤백 가능:

```sql
-- 테이블 이름 복구
ALTER TABLE IF EXISTS erp.project_cards RENAME TO research_cards;

-- 시퀀스 이름 복구
ALTER SEQUENCE IF EXISTS erp.project_cards_sequence RENAME TO research_cards_sequence;

-- 인덱스 이름 복구
ALTER INDEX IF EXISTS erp.idx_pc_project RENAME TO idx_rc_project;
ALTER INDEX IF EXISTS erp.idx_pc_company RENAME TO idx_rc_company;
ALTER INDEX IF EXISTS erp.idx_pc_digits RENAME TO idx_rc_digits;
```

---

## ⚠️ 주의사항

1. **백업 필수**: 마이그레이션 전 반드시 데이터베이스 백업
   ```bash
   pg_dump -h 192.168.1.165 -p 15431 -U erp_dev pinecni > backup_before_migration.sql
   ```

2. **운영 환경**: 운영 환경에서는 점검 시간을 확보하고 실행

3. **외래 키 제약조건**: 다른 테이블에서 `research_cards`를 참조하는 경우 함께 수정 필요

4. **캐시 초기화**: Redis 등 캐시를 사용하는 경우 캐시 데이터 초기화

---

## 📊 생성된 파일 목록

### 새로 생성된 파일
✅ `ProjectCard.java` (Entity)
✅ `ProjectCardRepository.java`
✅ `ProjectCardDTO.java`
✅ `ProjectCardService.java`
✅ `ProjectCardServiceImpl.java`
✅ `ProjectCardController.java`
✅ `migration_research_card_to_project_card.sql` (DDL)
✅ `MIGRATION_GUIDE_ResearchCard_to_ProjectCard.md` (이 문서)

### 수정된 파일
✅ `Project.java` (researchCards → projectCards)

### 삭제할 파일
❌ `ResearchCard.java`
❌ `ResearchCardRepository.java`
❌ `ResearchCardDTO.java`
❌ `ResearchCardService.java`
❌ `ResearchCardServiceImpl.java`
❌ `ResearchCardController.java`

---

## 📞 문의
- 이슈 발생 시: 개발팀에 문의
- Git 커밋 메시지 예시: `refactor: ResearchCard를 ProjectCard로 리네임`
