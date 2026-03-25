# 예산 보정값 관리 기능 개발 가이드

## 배경 및 목적

사업자 특성상 **부가세 복원** 등의 사유로 예산 잔액이 실제와 맞지 않는 경우가 발생함.
기존에는 `잔액 = 총액 - 사용액` 으로 단순 계산했으나, 보정값 개념을 도입하여 아래와 같이 변경.

```
잔액 = 총액 - 사용액 + 보정액
```

- **보정값 입력/관리**: 관리자 전용 (연필 아이콘 클릭 → 모달)
- **보정값 표시**: 모든 사용자에게 읽기 전용으로 노출 (숫자가 맞아 보이도록)

---

## 1. DB 변경사항

### 1-1. 기존 테이블 컬럼 추가: `erp.projects`

현재 유효한 보정값을 직접 저장. 관리자가 보정값을 수정하면 이 컬럼이 덮어씌워짐.

> SQL 파일 위치: `src/main/resources/db/migration/V2__add_budget_adjustment_to_projects.sql`

```sql
ALTER TABLE erp.projects
    ADD COLUMN activity_budget_adjustment  NUMERIC(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN equipment_budget_adjustment NUMERIC(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN material_budget_adjustment  NUMERIC(15, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN erp.projects.activity_budget_adjustment  IS '활동비 보정액 (현재 유효값. 변경 이력은 project_budget_adjustments 참조)';
COMMENT ON COLUMN erp.projects.equipment_budget_adjustment IS '장비비 보정액 (현재 유효값. 변경 이력은 project_budget_adjustments 참조)';
COMMENT ON COLUMN erp.projects.material_budget_adjustment  IS '재료비 보정액 (현재 유효값. 변경 이력은 project_budget_adjustments 참조)';
```

**왜 history 테이블이 아닌 projects 컬럼에 저장하는가?**

모달 UX가 "잔액이 얼마여야 한다"를 입력하는 방식이므로, history SUM 방식은 값이 틀려짐.

```
❌ SUM 방식 (잘못된 설계)
  1차 보정: +100,000 저장
  2차 보정: +50,000 저장
  SUM = +150,000 → 잔액이 의도한 값과 달라짐

✅ 덮어쓰기 방식 (올바른 설계)
  1차 보정: projects.activity_budget_adjustment = +100,000
  2차 보정: projects.activity_budget_adjustment = +50,000 (덮어씀)
  잔액 = 총액 - 사용액 + 50,000 → 의도한 값
```

### 1-2. 신규 테이블: `erp.project_budget_adjustments` (감사 로그용)

보정값이 변경될 때마다 이력을 기록하는 감사 로그 테이블. 잔액 계산에는 사용하지 않음.

> SQL 파일 위치: `src/main/resources/db/migration/V1__create_project_budget_adjustments.sql`
> ⚠️ 이미 DB에 적용 완료.

| 컬럼명 | 타입 | 설명 |
|---|---|---|
| `idx` | BIGINT (PK) | 시퀀스 자동 증가 |
| `project_idx` | BIGINT (FK) | `erp.projects.idx` 참조 |
| `budget_type` | VARCHAR(20) | 예산 구분: `ACTIVITY` / `EQUIPMENT` / `MATERIAL` |
| `adjustment_amount` | NUMERIC(15,2) | 해당 시점에 설정된 보정액 값 |
| `reason` | TEXT | 보정 사유 |
| `created_at` | TIMESTAMP | 생성일시 |
| `created_user_idx` | BIGINT | 생성자 (FK → erp.users.idx) |
| `updated_at` | TIMESTAMP | 수정일시 |
| `updated_user_idx` | BIGINT | 수정자 (FK → erp.users.idx) |

---

## 2. 기존 코드에서 발견된 버그 (함께 수정 필요)

### 장비비 / 재료비 사용액 분리 계산 안 됨

**파일**: `src/main/java/com/pinecni/erp/api/document/repository/ReceiptPurchaseRepository.java`

```java
// 현재 (버그): purchase_type 구분 없이 전체 합산
@Query("SELECT COALESCE(SUM(rp.totalAmount), 0) FROM ReceiptPurchase rp WHERE rp.projectIdx = :projectIdx AND rp.isDeleted = false")
BigDecimal sumAmountByProjectIdx(@Param("projectIdx") Long projectIdx);
```

**수정 필요**: `purchase_type`별로 분리 조회하는 메서드 추가

```java
@Query("SELECT COALESCE(SUM(rp.totalAmount), 0) FROM ReceiptPurchase rp " +
       "WHERE rp.projectIdx = :projectIdx AND rp.purchaseType = :purchaseType AND rp.isDeleted = false")
BigDecimal sumAmountByProjectIdxAndPurchaseType(@Param("projectIdx") Long projectIdx,
                                                @Param("purchaseType") String purchaseType);
```

> `ReceiptPurchase.purchaseType` 값: `"material"` (재료비), `"equipment"` (장비비)

---

## 3. 추가 필요한 API

### 3-1. 보정값 저장

**엔드포인트**: `POST /api/projects/{projectIdx}/budget-adjustments`

**Request Body**:
```json
{
  "budgetType": "ACTIVITY",
  "adjustmentAmount": 100000,
  "reason": "부가세 복원"
}
```

- `budgetType`: `ACTIVITY` / `EQUIPMENT` / `MATERIAL`
- `adjustmentAmount`: 프론트에서 `잔액입력값 - (총액 - 사용액)` 으로 자동 계산 후 전송
- `reason`: 필수값

**서버에서 처리할 내용**:
1. `erp.projects` 의 해당 보정액 컬럼을 `adjustmentAmount` 값으로 **UPDATE**
2. `erp.project_budget_adjustments` 에 이력 **INSERT**

**권한**: 관리자(`isAdmin = true`)만 허용

**Response**: 200 OK

---

## 4. 기존 API 수정사항

### 프로젝트 상세/목록 조회 응답에 필드 추가 필요

**엔드포인트**: `GET /api/projects/{projectIdx}`

`ProjectDTO` 에 아래 필드 추가:

```java
// projects 테이블 컬럼 직접 매핑
private BigDecimal activityAdjustment;   // projects.activity_budget_adjustment
private BigDecimal equipmentAdjustment;  // projects.equipment_budget_adjustment
private BigDecimal materialAdjustment;   // projects.material_budget_adjustment

// 사용액 예산 구분별 분리 (현재 누락)
private BigDecimal equipmentUsed;        // receipt_purchase SUM WHERE purchase_type = 'equipment'
private BigDecimal materialUsed;         // receipt_purchase SUM WHERE purchase_type = 'material'
```

**잔액 계산 (서버 or 클라이언트 어디서 해도 무방)**:
```
활동비 잔액  = activity_budget  - activityUsed  + activity_budget_adjustment
장비비 잔액  = equipment_budget - equipmentUsed + equipment_budget_adjustment
재료비 잔액  = material_budget  - materialUsed  + material_budget_adjustment
```

---

## 5. 프론트 연동 포인트

프론트는 이미 아래 필드명으로 데이터를 받을 준비가 되어 있음.
API 응답에 해당 필드만 추가하면 바로 화면에 반영됨.

| 프론트 필드명 | 매핑할 값 |
|---|---|
| `data.activityAdjustment` | `projects.activity_budget_adjustment` |
| `data.equipmentAdjustment` | `projects.equipment_budget_adjustment` |
| `data.materialAdjustment` | `projects.material_budget_adjustment` |
| `data.equipmentUsed` | `receipt_purchase` SUM (`purchase_type = 'equipment'`) |
| `data.materialUsed` | `receipt_purchase` SUM (`purchase_type = 'material'`) |

> 위 필드가 없거나 `null` 이면 프론트에서 `0` 으로 처리하므로 기존 화면은 정상 동작함.

---

## 6. 관련 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `templates/project-detail.html` | 예산 테이블 세로 변환, 연필 아이콘, 모달 2개 추가 |
| `static/js/project-detail.js` | 모달 열기/닫기, 보정액 자동계산 로직 |
| `static/css/project-detail.css` | 세로 테이블, 연필 아이콘, 모달 스타일 |
| `db/migration/V1__create_project_budget_adjustments.sql` | 이력 테이블 DDL (적용 완료) |
| `db/migration/V2__add_budget_adjustment_to_projects.sql` | projects 보정액 컬럼 추가 DDL **(미적용, 실행 필요)** |
