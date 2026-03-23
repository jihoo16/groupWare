# 연구비 증빙 품의서 — DB 설계 가이드

> 작성일: 2026-03-23
> 대상 문서 유형: **재료비**, **장비비** (동일 테이블/파일 공유)
> DDL 파일: `docs/ddl_receipt_purchase.sql`

---

## 작업 분담

| 담당 | 범위 |
|---|---|
| **공동작업자** | `receipt_purchase` + `receipt_purchase_item` CRUD 구현 |
| **본인** | 첨부파일 처리 (`approval_files`, NAS 저장, `receipt_purchase_attachment`) |

> **공동작업자는 파일 업로드/다운로드 로직을 구현하지 않아도 됩니다.**
> 파일 관련 코드는 본인이 별도로 붙입니다.
> 단, `approval_documents` 레코드 생성 및 `document_idx` 연결은 CRUD 구현 시 포함되어야 합니다 (아래 5번 참고).

---

## 1. 핵심 설계 원칙

### 재료비 / 장비비가 파일을 하나로 공유하는 이유

두 문서 유형은 **양식이 완전히 동일**하다. 항목(날짜·적요·수량·결제대금), 첨부파일(영수증·공식문서),
기본정보(과제·신청자·카드·지급종류) 모두 차이 없음.

따라서 별도 테이블을 만들지 않고 `purchase_type` 컬럼 하나로 유형을 구분한다.

| 화면 진입 URL | `purchase_type` 저장값 | 화면 타이틀 |
|---|---|---|
| `?type=material` | `material` | 연구비 증빙 - 재료비 |
| `?type=equipment` | `equipment` | 연구비 증빙 - 장비비 |

향후 **문구비(`stationery`)**, **인터넷강의비(`internet_lecture`)** 등 동일 양식의 신규 유형이
추가될 때 **스키마 변경 없이** `purchase_type` 값만 추가하면 된다.
(`purchase_type VARCHAR(50)`, CHECK 제약 없음)

---

## 2. 테이블 구성

```
erp.approval_documents               ← 전자결재 공통 메타 (모든 전자문서 공용)
  └─ erp.receipt_purchase            ← 품의서 메인 문서 (document_idx로 연결)
       └─ erp.receipt_purchase_item  ← 품의 내역서 항목 (1문서 N항목)
  └─ erp.approval_files              ← 첨부파일 실체 (approval_documents.idx로 연결)
  └─ erp.receipt_purchase_attachment ← 첨부파일 보조 메타 (attachment_type 구분용)
```

PK 전략:
- `receipt_purchase.idx` → **Sequence** (`erp.receipt_purchase_sequence`)
- `receipt_purchase_item.idx` → **GENERATED ALWAYS AS IDENTITY**
- `receipt_purchase_attachment.idx` → **GENERATED ALWAYS AS IDENTITY**
- `approval_files.idx` → **Sequence** (`erp.approval_files_sequence`) — 기존 공용 시퀀스

---

## 3. approval_files — 첨부파일 처리 구조

### 왜 approval_files인가

이 프로젝트의 **모든 전자문서 첨부파일은 `approval_files` 테이블에 저장**된다.
파일 업로드/다운로드는 기존 `FileServiceImpl`이 담당하며,
`document_idx`(`approval_documents.idx`) 기준으로 파일을 조회·삭제한다.

```
receipt_purchase.document_idx
       ↓ (같은 값)
approval_documents.idx ←→ approval_files.document_idx
```

### approval_files 컬럼

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `idx` | BIGINT | PK (approval_files_sequence) |
| `document_idx` | BIGINT NOT NULL | FK → `erp.approval_documents.idx` |
| `original_filename` | VARCHAR(255) | 원본 파일명 |
| `stored_filename` | VARCHAR(255) | UUID 기반 저장 파일명 (`yyyyMMddHHmmss_uuid.ext`) |
| `file_path` | VARCHAR(500) | NAS 상대 경로 |
| `file_size` | BIGINT | bytes |
| `file_type` | VARCHAR(100) | MIME 타입 |
| `upload_user_idx` | BIGINT | 업로드 사용자 FK → `erp.users.idx` |
| `is_deleted` | BOOLEAN | 소프트 삭제 여부 |
| `created_at` | TIMESTAMP | 생성일시 |

### NAS 파일 저장 경로

`FileServiceImpl.generateRelativePath()` 가 `document_type`을 보고 경로를 자동 결정한다.
품의서는 기존 `documentType`이 없으므로 **default 패턴** 적용 예정:

```
base: /data/erp_file
path: documents/general/{userId}/{year}/{month}/
파일명: yyyyMMddHHmmss_uuid.ext
```

> `approval_documents.document_type` 에 `재료비` 또는 `장비비`를 넣으면
> 필요 시 별도 경로 패턴을 `application.properties`에 추가하여 분리 가능.

### 기존 FileServiceImpl 사용법

```java
// 파일 업로드 (approval_documents.idx 필요)
FileUploadDTO result = fileService.uploadFile(multipartFile, documentIdx, uploadUserIdx);

// 파일 목록 조회
List<FileUploadDTO> files = fileService.getFilesByDocument(documentIdx);

// 파일 삭제 (소프트)
fileService.deleteFile(fileIdx, deletedUserIdx);
```

파일 서비스 위치: `src/main/java/com/pinecni/erp/api/file/service/FileServiceImpl.java`

### receipt_purchase_attachment (보조 메타)

`approval_files`가 파일 실체를 담당하고, `receipt_purchase_attachment`는
**영수증/공식문서 구분(`attachment_type`)** 을 별도로 추적하기 위한 보조 테이블이다.

| `attachment_type` 값 | 의미 |
|---|---|
| `RECEIPT` | 영수증 |
| `DOCUMENT` | 공식문서 (세금계산서 등) |

> 이 부분은 **본인이 구현**. 공동작업자는 건드리지 않아도 됨.

---

## 4. 화면 ↔ DB 컬럼 매핑

### 4-1. `receipt_purchase` (메인 문서)

| 화면 요소 | HTML ID | DB 컬럼 | 타입 | 비고 |
|---|---|---|---|---|
| 과제명 (선택 후 hidden) | `selectedProjectIdx` | `project_idx` | BIGINT NOT NULL | FK → `erp.project.idx` |
| 사용 카드 (선택 후 hidden) | `selectedCardIdx` | `card_idx` | BIGINT | FK → `erp.project_card.idx`, NULL 허용 |
| 신청자 (선택 후 hidden) | `selectedApplicantIdx` | `author_idx` | BIGINT NOT NULL | FK → `erp.users.idx` |
| 품의명 (hidden, 자동 고정) | `pu_title` | `document_title` | VARCHAR(200) | `재료비` or `장비비` 자동 입력 |
| 품의일자 | `pu_approval_date` | `approval_date` | DATE NOT NULL | |
| 지급종류 라디오 | `paymentType` (name) | `payment_type` | VARCHAR(20) | `card` or `transfer` |
| 품의 내용 | `pu_content` | `document_content` | TEXT | |
| 총 공급대가 (자동계산, readonly) | `pu_amount` | `total_amount` | NUMERIC(15,2) | 결제대금 합계 |
| 문서 유형 (JS 전역변수) | `PURCHASE_TYPE` | `purchase_type` | VARCHAR(50) NOT NULL | `material` or `equipment` |
| 전자결재 연결 (hidden) | `pu_document_idx` | `document_idx` | BIGINT | FK → `erp.approval_documents.idx`, NULL 허용 |

> **`total_amount`** = 모든 항목의 `payment_amount` 합계. 화면에서 계산 후 저장.
> 공급가액 합계·세액 합계는 저장하지 않음 → 필요 시 `receipt_purchase_item` SUM 조회.

---

### 4-2. `receipt_purchase_item` (품의 내역서 항목)

항목 추가 버튼으로 동적으로 행을 추가. 각 행이 DB의 1개 row에 해당.

| 화면 컬럼 | JS class | DB 컬럼 | 타입 | 비고 |
|---|---|---|---|---|
| 날짜 | `.item-date` | `item_date` | DATE | 품의일자 이하만 선택 가능 (max 제한) |
| 적요 | `.item-desc` | `item_desc` | VARCHAR(500) | **필수**, 미입력 시 빨간 테두리 |
| 수량 | `.item-qty` | `quantity` | INTEGER | **필수**, 기본값 1 |
| 과세구분 | `.item-taxtype` | `tax_type` | VARCHAR(10) DEFAULT '과세' | `과세` / `면세` / `영세` |
| 총 결제금액 | `.item-payment` | `payment_amount` | NUMERIC(15,2) | **필수**, VAT 포함 사용자 직접 입력 |
| 공급가액 | `.item-supply` | `supply_amount` | NUMERIC(15,2) | 자동계산, 사용자 편집 불가 |
| 세액 | `.item-tax` | `tax_amount` | NUMERIC(15,2) | 자동계산 + 수동 수정 가능 |
| 비고 | `.item-remark` | `remark` | VARCHAR(200) | |
| (화면 없음) | JS `sortOrder` | `sort_order` | INTEGER DEFAULT 0 | 행 순서 (0-based) |

#### 자동계산 규칙

```
과세:     공급가액 = round(결제대금 / 1.1)
          세액     = 결제대금 - 공급가액

면세/영세: 공급가액 = 결제대금
           세액     = 0
```

세액 수동 수정 시 역산:
```
공급가액 = 결제대금 - 세액
```
(업체 세금계산서 1~2원 오차 대응. 결제대금은 변경 안 함.)

> **화면 표시**: 공급가액은 plain text처럼 표시, 편집 불가.
> 세액은 평소 plain text처럼 보이지만 클릭하면 편집 가능 (관리자용 트릭).
> CSS: 공급가액 → `.item-auto-calc`, 세액 → `.item-tax`

---

## 5. approval_documents 레코드 생성 (CRUD 담당)

`receipt_purchase`를 저장할 때 `approval_documents`에도 레코드를 생성하고
그 `idx`를 `receipt_purchase.document_idx`에 저장해야 한다.
이 `document_idx`가 나중에 첨부파일을 연결하는 키가 된다.

### 다른 문서 유형의 기존 패턴 참고

야근식대, 출장비 등 다른 문서 유형도 동일한 방식으로 구현되어 있다.

```
src/main/java/com/pinecni/erp/api/document/controller/  ← Controller 위치
src/main/java/com/pinecni/erp/api/document/service/     ← Service 위치
src/main/java/com/pinecni/erp/api/document/repository/  ← Repository 위치
src/main/java/com/pinecni/erp/api/document/dto/         ← DTO 위치
```

### 저장 흐름

```
① approval_documents INSERT (문서번호 자동생성, document_type = '재료비' or '장비비')
       ↓ 반환된 idx
② receipt_purchase INSERT (document_idx = ①의 idx)
       ↓ 반환된 idx
③ receipt_purchase_item INSERT × N개 (receipt_purchase_idx = ②의 idx)
```

---

## 6. API 통신 payload 구조

프론트엔드 `buildFormData()` 함수가 `FormData`로 전송하는 구조.

### 저장/수정 요청

```json
// FormData의 'data' 필드 (JSON string)
{
  "projectIdx": 1,
  "cardIdx": 2,
  "authorIdx": 3,
  "purchaseType": "material",
  "approvalDate": "2026-03-23",
  "documentTitle": "재료비",
  "documentContent": "품의 내용 텍스트",
  "paymentType": "card",
  "totalAmount": 110000,
  "documentIdx": null,
  "items": [
    {
      "itemDate": "2026-03-23",
      "itemDesc": "노트북 충전기",
      "quantity": 1,
      "taxType": "과세",
      "paymentAmount": 110000,
      "supplyAmount": 100000,
      "taxAmount": 10000,
      "remark": "",
      "sortOrder": 0
    }
  ]
}
```

### FormData 파일 필드 (참고용 — 파일 처리는 본인 담당)

| FormData key | 내용 |
|---|---|
| `data` | 위 JSON string |
| `receiptFiles` | 영수증 파일 (복수) |
| `documentFiles` | 공식문서 파일 (복수) |
| `deletedAttachmentIds` | 수정 시 삭제할 첨부파일 idx 배열 (JSON string) |

### 수정 모드 진입

URL 파라미터 `?type=material&documentIdx=123` 형태로 진입.
`loadDocument(documentIdx)` 호출 → API에서 문서 조회 → `populateForm(data)`로 화면 복원.

---

## 7. 소프트 삭제

| 테이블 | 삭제 컬럼 |
|---|---|
| `receipt_purchase` | `is_deleted BOOLEAN`, `deleted_at`, `deleted_user_idx` |
| `receipt_purchase_attachment` | `deleted BOOLEAN`, `deleted_at`, `deleted_user_idx` |
| `approval_files` | `is_deleted BOOLEAN` |
| `receipt_purchase_item` | 소프트 삭제 없음 — 문서 삭제 시 함께 처리 |

`ReceiptPurchase` Entity에 `@SQLRestriction("is_deleted = false")` 적용됨
→ 일반 조회에서 삭제된 문서는 자동 제외.

---

## 8. CRUD 구현 시 주의사항

1. **저장 순서**: `approval_documents` → `receipt_purchase` → `receipt_purchase_item` 순서로 저장.
   트랜잭션 하나로 묶을 것.

2. **항목 수정**: `receipt_purchase_item`은 기존 전체 삭제 후 재insert 방식 권장.
   (정렬 순서 변경 추적이 복잡하므로)

3. **파일 관련 코드 불필요**: Controller에서 `receiptFiles`, `documentFiles` 파라미터를
   받는 구조만 만들어두고 실제 처리 로직은 구현하지 않아도 됨.
   (null 처리 또는 TODO 주석으로 남겨두기)

4. **합계 조회**: `total_amount`는 결제대금 합계만 저장.
   공급가액·세액 합계가 필요하면:
   ```sql
   SELECT
       SUM(payment_amount) AS total_payment,
       SUM(supply_amount)  AS total_supply,
       SUM(tax_amount)     AS total_tax
   FROM erp.receipt_purchase_item
   WHERE receipt_purchase_idx = :idx;
   ```

5. **purchase_type 필터**: 재료비만 조회 시 `WHERE purchase_type = 'material'`.
   인덱스 `idx_receipt_purchase_type` 활용 가능.

---

## 9. Entity / 파일 위치

| 클래스 | 파일 |
|---|---|
| `ReceiptPurchase` | `src/main/java/com/pinecni/erp/entity/ReceiptPurchase.java` |
| `ReceiptPurchaseItem` | `src/main/java/com/pinecni/erp/entity/ReceiptPurchaseItem.java` |
| `ReceiptPurchaseAttachment` | `src/main/java/com/pinecni/erp/entity/ReceiptPurchaseAttachment.java` |
| `ApprovalFile` | `src/main/java/com/pinecni/erp/entity/ApprovalFile.java` |
| `ApprovalDocument` | `src/main/java/com/pinecni/erp/entity/ApprovalDocument.java` |
| `FileServiceImpl` | `src/main/java/com/pinecni/erp/api/file/service/FileServiceImpl.java` |

### 화면/템플릿 파일

| 역할 | 파일 |
|---|---|
| HTML 템플릿 | `src/main/resources/templates/approval_receipt_purchase.html` |
| CSS | `src/main/resources/static/css/approval_receipt_purchase.css` |
| JavaScript | `src/main/resources/static/js/approval_receipt_purchase.js` |

> 재료비(`?type=material`)와 장비비(`?type=equipment`) 모두 **위 3개 파일 하나씩만 사용**.
> 서버에서 `purchaseType` 변수를 Thymeleaf로 전달 → JS 전역변수 `PURCHASE_TYPE`에 주입됨.
