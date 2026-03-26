# document_type C04xx 코드 체계 전면 통일 — 변경 내역

> 작업일: 2026-03-26
> 브랜치: v1.0

---

## 배경 / 문제

기존에 `document_type` 값이 테이블마다 제각각이었음:

| 위치 | 기존 값 예시 |
|---|---|
| `approval_documents.document_type` | `연구비증빙-회의록`, `연구비증빙 - 단독출장`, `WEEKLY_REPORT`, `주간업무보고` 혼재 |
| `document_sequences.document_type` | `receipt_meeting`, `RECEIPT_MEETING`, `RCTM`, `주간업무보고` 혼재 |
| Java 서비스 | 한글 문자열 하드코딩 |
| JS 프론트엔드 | 한글 / 영문 대문자 혼재 비교 |

이로 인해 프로젝트 문서함에서 야근식대 클릭 시 "상세 페이지가 구현되지 않았습니다" 오류 발생, 화면에 `C0408` 같은 코드값이 그대로 노출되는 버그 발생.

---

## 해결 방식

`codes` 테이블의 C04 그룹을 표준 코드로 확정하고, **모든 레이어를 C04xx 단일 체계로 통일**.

---

## 1. DB 마이그레이션 (이미 실행 완료)

실행 파일: `docs/migration_document_type.sql`

### C04xx 코드 체계 (확정)

| 코드 | 문서 타입 | prefix |
|---|---|---|
| C0401 | 지출승인서 | EXP |
| C0402 | 지출품의서 | REQ |
| C0403 | 야근식대 | RCO |
| C0404 | 단독출장 | RCT |
| C0405 | 출장+회의 | RCTM |
| C0406 | 연구비증빙-회의록 | RCM |
| C0407 | 재료비 | MAT |
| C0408 | 장비비 | EQP |
| C0409 | 주간업무보고 | WKR |
| C0410 | 프로젝트 주간업무보고 | PWKR |
| C0411 | 월간업무보고 | MOR |
| C0412 | 회의록 | MTG |
| C0413 | 연차신청서 | VAC |

### 변경된 테이블
- `codes` — C04 그룹 전체 재정의, `code_group.description` → "전자문서 유형"
- `approval_documents.document_type` — 한글/영문 → C04xx 코드로 일괄 UPDATE
- `document_sequences.document_type` — 동일하게 C04xx로 UPDATE

> ⚠️ `receipt_attendee.document_type_prefix`는 RCO/RCT/RCTM/RCM prefix 값 그대로 유지 (설계상 올바름, 변경 없음)

---

## 2. Java 백엔드

### 추가된 enum: `CodeConstants.DocumentType`
파일: `src/main/java/com/pinecni/erp/constant/CodeConstants.java`

```java
public enum DocumentType {
    EXPENSE_APPROVAL("C0401", "지출승인서", "EXPENSE_APPROVAL", "EXP", 1),
    // ... C0401 ~ C0413
}
// 사용법
CodeConstants.DocumentType.RECEIPT_MEETING.getCode()   // "C0406"
CodeConstants.DocumentType.RECEIPT_MEETING.getName()   // "연구비증빙-회의록"
CodeConstants.DocumentType.RECEIPT_MEETING.getPrefix() // "RCM"
```

### ApprovalDocumentDTO 변경
파일: `src/main/java/com/pinecni/erp/api/approval/dto/ApprovalDocumentDTO.java`

```java
private String documentType;     // C04xx 코드값 (라우팅/로직용)
private String documentTypeName; // 한글 표시명 추가 (화면 렌더링용)
```

### 변경된 Service 파일 (전부 동일한 패턴)

| 파일 | 변경 내용 |
|---|---|
| `ApprovalDocumentServiceImpl` | `convertToDTO()`에서 코드→한글명 변환, 재료비/장비비 제목 생성 버그 수정 |
| `ExpenseApprovalServiceImpl` | `DOC_TYPE = DocumentType.EXPENSE_APPROVAL` enum 사용 |
| `ExpenseRequisitionServiceImpl` | `DOC_TYPE = DocumentType.EXPENSE_REQUEST` |
| `ReceiptOvertimeServiceImpl` | `DOC_TYPE = DocumentType.RECEIPT_OVERTIME` |
| `ReceiptTripServiceImpl` | `DOC_TYPE = DocumentType.RECEIPT_TRIP` |
| `ReceiptTripMeetingServiceImpl` | `DOC_TYPE = DocumentType.RECEIPT_TRIP_MEETING` |
| `ReceiptMeetingServiceImpl` | `DocumentType.RECEIPT_MEETING.getCode()` 등 |
| `ReceiptPurchaseServiceImpl` | `DocumentType.RECEIPT_MATERIAL / RECEIPT_EQUIPMENT` |
| `WeeklyReportServiceImpl` | `DocumentType.WEEKLY_REPORT / PROJECT_WEEKLY_REPORT` |
| `MonthlyReportServiceImpl` | `DocumentType.MONTHLY_REPORT` |
| `MeetingMinutesServiceImpl` | `DocumentType.MEETING_MINUTES` |
| `VacationServiceImpl` | `DocumentType.VACATION` |
| `FileServiceImpl` | 파일 경로 빌드 시 `docTypeEnum.getName()` (한글명) 사용하여 기존 경로 유지 |

---

## 3. JS 프론트엔드

### 원칙
- `doc.documentType` — C04xx 코드 (라우팅/비교 전용)
- `doc.documentTypeName` — 한글명 (화면 출력 전용)
- 화면에 코드값이 절대 노출되지 않도록 `documentTypeName || documentType` 패턴 사용

### 변경된 파일

**`approval.js`**
- `PROJECT_DOCUMENT_TYPES` 배열: 한글 변형 10개 → C04xx 7개 (`C0403`~`C0410`)
- 문서 분류 필터: `=== '주간업무보고'` → `=== 'C0409'` 등
- `getCategoryFromDocumentType()`, `getIconFromDocumentType()`: Korean 키 → C04xx 키
- 문서 목록 렌더링: `${doc.documentType}` → `${doc.documentTypeName || doc.documentType}`

**`home.js`**
- `PROJECT_DOCUMENT_TYPES` 배열: Korean → C04xx

**`project-documents.js`**
- `isMeeting`, `isTrip` 비교: `'연구비증빙-회의록'` → `'C0406'`, `'연구비증빙 - 단독출장'` → `'C0404'`

**`project-detail.js`**
- API 호출 파라미터: `documentType=WEEKLY_REPORT` → `C0410`, `documentTypes=RECEIPT_MEETING,...` → `C0406,C0404,C0403`
- `getExpenseDocIcon()`: 구 영문 키 → C04xx
- `goToDocument()` switch: 구 영문 케이스 → C04xx (RECEIPT_TRIP C0404 라우팅 분리 수정 포함)
- `getDocumentTypeLabel()`: 구 영문 키 → C04xx

**`approval_receipt_meeting.js`**
- 중복 참석자 경고 메시지: `meeting.meetingDate` → `meeting.documentDate`, `meeting.type === '회의록'` → prefix 비교 (`=== 'RCM'`), `meeting.typeName` 사용

---

## 주의사항 / 앞으로 신규 문서 타입 추가 시

1. `CodeConstants.DocumentType` enum에 항목 추가 (코드, 한글명, prefix, sortOrder)
2. DB `codes` 테이블에 INSERT (C04xx 코드)
3. 신규 Service에서 `DOC_TYPE.getCode()` / `DOC_TYPE.getPrefix()` / `DOC_TYPE.getName()` 사용
4. JS에서 C04xx 코드로 비교, 화면 출력은 반드시 `documentTypeName` 사용
