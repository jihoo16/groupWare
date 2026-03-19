# 지출승인서 CRUD 개발 유의사항

> 작성일: 2026-03-19
> 대상: 지출승인서(`expense_approval`) 저장 / 수정 / 삭제 / 목록 / 상세 API 구현 담당자

---

## 1. 테이블 구조 요약

```
expense_approval        (헤더, 1건)
  └── expense_detail    (지출 항목, N건 / ON DELETE CASCADE)
  └── approval_documents (공통 전자결재 문서 / document_idx FK)
```

- **DB 스키마**: `erp`
- **시퀀스**: `erp.expense_approval_sequence`, `erp.expense_detail_sequence`
- **문서번호 채번**: `erp.document_sequences` (document_type = `'지출승인서'`, prefix = `'EXP'`)
- **기안일자**: 별도 컬럼 없음 → `expense_approval.created_at` 사용
- **첨부파일**: 해당 없음 (지출승인서는 첨부파일 미지원)

---

## 2. 엔티티 현황

> `ExpenseApproval.java` / `ExpenseDetail.java` 수정 완료 — 별도 작업 불필요

---

## 3. 저장 (POST) 유의사항

### 3-1. 로그인 검증
- 모든 쓰기 API는 **세션 로그인 검증 필수**
- 비로그인 요청 → `401 Unauthorized` 반환

### 3-2. 생성자 세팅
```java
// 세션에서 로그인 사용자 idx 추출
Long loginUserIdx = /* HttpSession or SecurityContext */;

expenseApproval.setUserIdx(loginUserIdx);
expenseApproval.setCreatedUserIdx(loginUserIdx);
expenseApproval.setUpdatedUserIdx(loginUserIdx);

expenseDetail.setCreatedUserIdx(loginUserIdx);
expenseDetail.setUpdatedUserIdx(loginUserIdx);
```

### 3-3. approval_documents 등록 (필수)
목록 페이지에서 전자결재 문서를 통합 조회하므로, **저장 시 반드시 approval_documents 에 먼저 등록** 후 반환된 `idx` 를 `expense_approval.document_idx` 에 세팅해야 합니다.

```java
// 1. approval_documents 저장
ApprovalDocument doc = ApprovalDocument.builder()
    .documentNo(generatedDocNo)        // 채번된 문서번호
    .title("지출승인서")
    .documentType("지출승인서")
    .isProject(false)
    .drafterUserIdx(loginUserIdx)
    .build();
approvalDocumentRepository.save(doc);

// 2. expense_approval 에 document_idx 세팅
expenseApproval.setDocumentIdx(doc.getIdx());
expenseApproval.setDocumentNumber(generatedDocNo);
```

### 3-4. 문서번호 채번
`document_sequences` 테이블에서 `document_type = '지출승인서'` 행의 `last_number` 를 증가시켜 생성합니다.
다른 문서(연차신청서 등)의 채번 로직을 참고하세요.

```
형식: EXP-YYYY-NNNNN
예시: EXP-2025-00001
```

> **주의**: 동시성 문제 방지를 위해 `SELECT ... FOR UPDATE` 또는 `@Lock(LockModeType.PESSIMISTIC_WRITE)` 사용

### 3-5. expense_detail 저장
- `expense_date` 는 `LocalDate` 타입으로 파싱 (프론트에서 `YYYY-MM-DD` 형식으로 전송)
- `payment_method` 허용값: `'개인카드'`, `'현금'` — 그 외 값은 validation 에서 거부
- `expense_approval_idx` 는 헤더 저장 후 반환된 `idx` 세팅
- 항목이 0건이면 저장 거부

### 3-6. total_amount 계산
```java
long total = expenseDetails.stream()
    .mapToLong(ExpenseDetail::getAmount)
    .sum();
expenseApproval.setTotalAmount(total);
```

---

## 4. 목록 조회 (GET) 유의사항

- **본인 문서만** 조회: `WHERE user_idx = :loginUserIdx`
- **soft delete 제외**: `AND deleted = FALSE`
- `approval_documents` 조인하여 `document_no`, `created_at` 함께 반환
- 정렬: `created_at DESC` (최신순)

```sql
SELECT ea.*, ad.document_no
FROM erp.expense_approval ea
LEFT JOIN erp.approval_documents ad ON ea.document_idx = ad.idx
WHERE ea.user_idx = :loginUserIdx
  AND ea.deleted = FALSE
ORDER BY ea.created_at DESC;
```

---

## 5. 수정 (PUT) 유의사항

- **본인 문서 여부 검증**: `expense_approval.user_idx = loginUserIdx` 불일치 시 `403 Forbidden`
- `expense_detail` 수정 전략: **기존 항목 전체 삭제 후 재삽입** (orphanRemoval = true 활용)
- `total_amount` 재계산 후 업데이트
- `updated_at`, `updated_user_idx` 갱신
- `approval_documents` 변경사항 있으면 함께 업데이트

---

## 6. 삭제 (DELETE) 유의사항

- **soft delete** 방식 사용 (물리 삭제 금지)
- **본인 문서 여부 검증** 필수
```java
expenseApproval.softDelete(loginUserIdx); // ExpenseApproval.softDelete() 헬퍼 사용
```
- `approval_documents` 의 `deleted_at` 도 함께 세팅
- `expense_detail` 은 `ON DELETE CASCADE` 이지만 soft delete 이므로 물리 삭제되지 않음 — 헤더의 `deleted = TRUE` 로 연쇄 처리

---

## 7. 상세 조회 (GET /{idx}) 유의사항

- **본인 문서 여부 검증** (또는 관리자 권한)
- `expense_detail` 목록은 `expense_date ASC` (과거순) 정렬하여 반환
- `deleted = TRUE` 인 문서는 `404 Not Found` 반환

---

## 8. API 엔드포인트 권장 설계

| Method | URL | 설명 |
|---|---|---|
| `POST` | `/api/approval/expense` | 지출승인서 저장 |
| `GET` | `/api/approval/expense` | 목록 조회 (본인 것만) |
| `GET` | `/api/approval/expense/{idx}` | 상세 조회 |
| `PUT` | `/api/approval/expense/{idx}` | 수정 |
| `DELETE` | `/api/approval/expense/{idx}` | 삭제 (soft delete) |

---

## 9. 프론트엔드 전송 데이터 구조 참고

```json
{
  "userIdx": null,
  "expenseDetails": [
    {
      "expenseDate": "2025-03-19",
      "description": "야근식대",
      "shopName": "홍길동식당",
      "paymentMethod": "개인카드",
      "amount": 35000,
      "note": ""
    },
    {
      "expenseDate": "2025-03-18",
      "description": "퀵비",
      "shopName": "퀵서비스",
      "paymentMethod": "현금",
      "amount": 10000,
      "note": "[현금사용]"
    }
  ]
}
```

> `userIdx` 는 프론트에서 `null` 로 전송 — **반드시 서버에서 세션 기반으로 세팅**할 것
> `created_at` 은 서버 `@PrePersist` 에서 자동 세팅 — 프론트 전송 불필요

---

## 10. 화면 필드 ↔ DB 컬럼 매핑

### 10-1. 기본 정보 섹션

| 화면 레이블 | HTML 요소 | 테이블 | 컬럼 | 비고 |
|---|---|---|---|---|
| 부서/팀 | `#applicantDept` | — | — | 세션 사용자 기준 조회 후 화면 표시만, 저장 안 함 |
| 기안자 | `#applicantName` | — | — | 세션 사용자 기준 조회 후 화면 표시만, 저장 안 함 |
| 기안일자 | `#documentDate` | `expense_approval` | `created_at` | 서버 `@PrePersist` 자동 세팅 — 프론트 전송 불필요 |

> 기안자의 실제 저장 값은 `expense_approval.user_idx` (세션에서 서버가 세팅)

---

### 10-2. 지출 내역 섹션 (`expense_detail` — N건)

| 화면 레이블 | CSS 클래스 | 테이블 | 컬럼 | 타입 | 비고 |
|---|---|---|---|---|---|
| 날짜 | `.date-input` | `expense_detail` | `expense_date` | `LocalDate` | 프론트 전송 형식: `YYYY-MM-DD` |
| 적요 | `.description-input` | `expense_detail` | `description` | `VARCHAR(500)` | |
| 상호 | `.shop-input` | `expense_detail` | `shop_name` | `VARCHAR(200)` | 필수값 |
| 결제수단 | `.payment-method-select` | `expense_detail` | `payment_method` | `VARCHAR(20)` | `'개인카드'` / `'현금'` 만 허용 |
| 금액 | `.amount-input` | `expense_detail` | `amount` | `BIGINT` | 숫자만, 콤마 제거 후 전송 |
| 비고 | `.note-input` | `expense_detail` | `note` | `VARCHAR(200)` | 현금 선택 시 `[현금사용]` 자동 입력 |
| 총 합계 | `#totalAmountDisplay` | `expense_approval` | `total_amount` | `BIGINT` | 프론트 표시용, 서버에서 직접 계산·저장 |

---

### 10-3. 서버에서만 처리 (프론트 전송 불필요)

| 컬럼 | 테이블 | 세팅 방식 |
|---|---|---|
| `user_idx` | `expense_approval` | 세션에서 추출 |
| `created_user_idx` | `expense_approval` | 세션에서 추출 |
| `updated_user_idx` | `expense_approval` | 세션에서 추출 |
| `created_at` | `expense_approval` | `@PrePersist` 자동 |
| `updated_at` | `expense_approval` | `@PreUpdate` 자동 |
| `document_idx` | `expense_approval` | `approval_documents` 저장 후 반환된 idx 세팅 |
| `document_number` | `expense_approval` | `EXP-YYYY-NNNNN` 채번 후 세팅 |
| `total_amount` | `expense_approval` | `expense_detail.amount` 합산 후 세팅 |
| `expense_approval_idx` | `expense_detail` | 헤더 저장 후 반환된 idx 세팅 |
| `created_user_idx` | `expense_detail` | 세션에서 추출 |
| `updated_user_idx` | `expense_detail` | 세션에서 추출 |

---

## 11. 프론트엔드 UI 유의사항

### 10-1. PDF 생성 없음
- 지출승인서는 **PDF 생성 기능 불필요** (구현하지 않아도 됨)
- 문서 미리보기 → PDF 변환 로직은 제외

### 10-2. 인쇄 버튼
- **인쇄하기 버튼은 유지** (PDF 대신 브라우저 인쇄 사용)
- 영수증처리(`approval_expense`) 의 인쇄 버튼 구현 방식을 그대로 참고

### 10-3. 수정 가능 구조
- 저장된 문서를 **수정·재저장할 수 있어야 함**
- 영수증처리와 동일하게 상세 조회 진입 시 수정/삭제 버튼 노출, 수정 버튼 클릭 시 편집 모드 전환 방식으로 구현
- 수정 모드 진입 → 기존 데이터 폼에 populate → PUT API 호출 흐름 동일하게 적용
