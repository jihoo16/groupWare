# Receipt Attendee 통합 테이블 작업 안내

## 📌 변경 개요

기존에 문서별로 분리되어 있던 참석자 테이블을 하나로 통합했습니다.

### 변경 전 (Before)
```
receipt_meeting_attendee    → 회의록 참석자
receipt_overtime_attendee   → 야근 식대 참석자
receipt_trip_attendee       → 출장 참석자
```

### 변경 후 (After)
```
receipt_attendee            → 모든 문서의 참석자 통합 관리
```

---

## 🗂️ 통합 테이블 구조

### 테이블명
- **erp.receipt_attendee**

### 주요 컬럼

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `idx` | BIGINT | PK (시퀀스 자동 생성) |
| `document_type_prefix` | VARCHAR(20) | **문서 타입 구분** (RCM/RCO/RCT) |
| `receipt_idx` | BIGINT | 원본 문서 idx |
| `project_idx` | BIGINT | 프로젝트 IDX |
| `card_idx` | BIGINT | 카드 IDX |
| `user_idx` | BIGINT | 사용자 IDX |
| `is_external` | BOOLEAN | 외부 참석자 여부 (기본값: false) |
| `document_date` | DATE | **문서 실행 날짜** (회의일/야근일 등) |
| `start_time` | TIME | 시작 시간 |
| `end_time` | TIME | 종료 시간 |
| `display_order` | INTEGER | 정렬 순서 |
| `meeting_expense` | BIGINT | 회의비 (회의록 전용) |
| `work_task` | VARCHAR(500) | 작업 내용 (야근 식대 전용) |
| `created_at` | TIMESTAMP | 생성 일시 (NOT NULL) |
| `created_user_idx` | BIGINT | 생성자 IDX (NOT NULL) |
| `updated_at` | TIMESTAMP | 수정 일시 |
| `updated_user_idx` | BIGINT | 수정자 IDX |
| `deleted` | BOOLEAN | Soft Delete 여부 (기본값: false) |
| `deleted_at` | TIMESTAMP | 삭제 일시 |
| `deleted_user_idx` | BIGINT | 삭제자 IDX |

### 문서 타입 코드

| 코드 | 의미 | receipt_idx 참조 테이블 |
|------|------|------------------------|
| **RCM** | 회의록 (Receipt Meeting) | `receipt_meeting.idx` |
| **RCO** | 야근 식대 (Receipt Overtime) | `receipt_overtime.idx` |
| **RCT** | 출장 (Receipt Trip) | `receipt_trip.idx` |

---

## 🔄 마이그레이션 완료 사항

### ✅ 완료된 작업
1. 통합 테이블 생성 (`erp.receipt_attendee`)
2. 기존 데이터 마이그레이션 완료
   - `receipt_meeting_attendee` → RCM으로 마이그레이션
   - `receipt_overtime_attendee` → RCO으로 마이그레이션
3. 엔티티 작성 완료 (`ReceiptAttendee.java`)
4. 시간 겹침 방지 트리거 설치

### ⚠️ 기존 테이블 상태
- **기존 테이블은 아직 존재함** (백업 후 삭제 예정)
- 새로운 개발은 **반드시 `receipt_attendee` 사용**

---

## 🚨 야근 식대 작업 시 주의사항

### 1. 엔티티 변경
**기존:**
```java
ReceiptOvertimeAttendee  // ❌ 더 이상 사용하지 않음
```

**신규:**
```java
ReceiptAttendee  // ✅ 이제 이것을 사용
```

### 2. 필드 매핑 변경

| 기존 필드 | 신규 필드 | 비고 |
|----------|----------|------|
| `receipt_overtime_idx` | `receipt_idx` | 원본 문서 참조 |
| - | `document_type_prefix` | **"RCO" 고정값** |
| `user_idx` | `user_idx` | 동일 |
| - | `is_external` | **새로 추가 (기본값: false)** |
| - | `document_date` | **야근일 (overtime_date)** |
| `work_time` | ~~삭제됨~~ | **start_time/end_time으로 대체** |
| `work_task` | `work_task` | 동일 |
| `created_at` | `created_at` | 동일 |
| `updated_at` | `updated_at` | 동일 |
| - | `created_user_idx` | **새로 추가 (NOT NULL)** |
| - | `updated_user_idx` | **새로 추가** |
| - | `deleted` 등 | **Soft delete 추가** |

### 3. 중요 변경사항

#### ⭐ work_time 필드 삭제
- **기존:** `work_time` (VARCHAR) - "09:00~18:00" 형식의 문자열
- **신규:** `start_time` (TIME) + `end_time` (TIME) - 시간 데이터 타입으로 분리
- **마이그레이션:** 기존 `work_time` 데이터는 마이그레이션되지 않음 (NULL 처리)

#### ⭐ 사용자 정보 조회 방식 변경
- **기존:** `name`, `department` 컬럼에 직접 저장
- **신규:** `user_idx`로만 관리, `users` 테이블 조인 필요

#### ⭐ 생성자 필수 입력
- `created_user_idx`가 **NOT NULL**이므로 반드시 입력 필요

---

## 💻 코드 예제

### 야근 식대 참석자 생성 (Before → After)

#### Before (기존 방식)
```java
ReceiptOvertimeAttendee attendee = new ReceiptOvertimeAttendee();
attendee.setReceiptOvertimeIdx(overtimeId);
attendee.setUserIdx(userId);
attendee.setWorkTime("18:00~20:00");  // 문자열
attendee.setWorkTask("서버 긴급 점검");
```

#### After (신규 방식)
```java
ReceiptAttendee attendee = ReceiptAttendee.builder()
    .documentTypePrefix("RCO")  // 야근 식대 코드
    .receiptIdx(overtimeId)
    .projectIdx(projectId)      // 프로젝트 정보 추가
    .cardIdx(cardId)            // 카드 정보 추가
    .userIdx(userId)
    .isExternal(false)
    .documentDate(overtimeDate) // 야근일
    .startTime(LocalTime.of(18, 0))  // 18:00
    .endTime(LocalTime.of(20, 0))    // 20:00
    .workTask("서버 긴급 점검")
    .createdUserIdx(currentUserId)  // 필수!
    .build();
```

### 야근 식대 참석자 조회 (JPA)

```java
// Repository 메서드 예시
List<ReceiptAttendee> findByReceiptIdxAndDocumentTypePrefix(
    Long receiptIdx,
    String documentTypePrefix
);

// 사용
List<ReceiptAttendee> attendees = repository
    .findByReceiptIdxAndDocumentTypePrefix(overtimeId, "RCO");
```

### 사용자 정보 조회 (조인 필요)

```java
// JPQL 예시
@Query("""
    SELECT ra, u
    FROM ReceiptAttendee ra
    LEFT JOIN User u ON ra.userIdx = u.idx AND ra.isExternal = false
    WHERE ra.receiptIdx = :receiptIdx
      AND ra.documentTypePrefix = 'RCO'
      AND ra.deleted = false
    ORDER BY ra.displayOrder
    """)
List<Object[]> findOvertimeAttendeesWithUser(@Param("receiptIdx") Long receiptIdx);
```

---

## 🔒 시간 겹침 방지 기능

### 자동 체크
같은 `project_idx`, `user_idx`, `card_idx`에서 `document_date + start_time ~ end_time`이 겹치면 **자동으로 에러 발생**

```
예외 발생 예시:
Time overlap detected: user_idx=4, project_idx=1, card_idx=<NULL>,
date=2025-02-10, time=10:00:00~12:00:00
```

### 처리 방법
- 참석자 등록 전에 시간 중복 체크 필요
- 중복 시 사용자에게 알림 후 수정 요청

---

## 📋 체크리스트 (야근 식대 개발자용)

### 필수 작업
- [ ] `ReceiptOvertimeAttendee` → `ReceiptAttendee`로 엔티티 변경
- [ ] `document_type_prefix = "RCO"` 고정값 설정
- [ ] `work_time` 문자열 → `start_time`/`end_time` TIME 타입으로 변경
- [ ] `created_user_idx` 필수 입력 처리
- [ ] Soft delete 처리 (`deleted = false` 조건 추가)
- [ ] 사용자 정보 조회 시 `users` 테이블 조인

### 선택 작업
- [ ] 기존 `work_time` 데이터 수동 마이그레이션 (필요시)
- [ ] 시간 겹침 체크 로직 추가 (프론트엔드)

---

## 🆘 문의사항

작업 중 궁금한 점이나 문제가 발생하면:
1. 엔티티 파일 확인: `src/main/java/com/pinecni/erp/entity/ReceiptAttendee.java`
2. 마이그레이션 SQL 확인: `migration_receipt_attendee.sql`
3. 담당자에게 문의

---

## 📚 참고 자료

### 엔티티 위치
```
src/main/java/com/pinecni/erp/entity/ReceiptAttendee.java
```

### 마이그레이션 파일
```
migration_receipt_attendee.sql
```

### 기존 테이블 (참고용, 사용 금지)
- `erp.receipt_meeting_attendee` ❌
- `erp.receipt_overtime_attendee` ❌
- `erp.receipt_trip_attendee` ❌

### 신규 테이블 (반드시 사용)
- `erp.receipt_attendee` ✅

---

**작성일:** 2025-02-04
**작성자:** ERP 개발팀
**버전:** 1.0
