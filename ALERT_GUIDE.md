# Alert 사용 가이드

프로젝트 전체에서 사용 가능한 공통 알림 시스템 가이드입니다.

## 목차
- [개요](#개요)
- [기본 사용법](#기본-사용법)
- [함수 목록](#함수-목록)
- [실전 예제](#실전-예제)
- [마이그레이션 가이드](#마이그레이션-가이드)

---

## 개요

기존의 `alert()`, `confirm()` 대신 **SweetAlert2** 기반의 공통 알림 시스템을 사용합니다.

**장점:**
- 🎨 일관되고 아름다운 디자인
- 📱 모바일 친화적
- ⚙️ 커스터마이징 가능
- 🔔 다양한 알림 타입 지원
- ⏱️ 자동 닫기 기능

**자동 로드:**
`fragments/layout.html`을 사용하는 모든 페이지에서 자동으로 사용 가능합니다.

---

## 기본 사용법

### 1. 일반 알림

```javascript
// 기본 알림
showAlert('저장되었습니다.');

// 제목과 함께
showAlert('저장되었습니다.', '알림');
```

### 2. 성공 메시지

```javascript
// 자동으로 2초 후 닫힘
showSuccess('파일이 업로드되었습니다.');
```

### 3. 에러 메시지

```javascript
showError('파일 업로드에 실패했습니다.');
```

### 4. 경고 메시지

```javascript
showWarning('입력값을 확인해주세요.');
```

### 5. 확인/취소 선택

```javascript
// async/await 사용
const confirmed = await showConfirm('정말 삭제하시겠습니까?');
if (confirmed) {
    // 확인 버튼 클릭 시
    console.log('삭제 진행');
} else {
    // 취소 버튼 클릭 시
    console.log('삭제 취소');
}

// .then() 사용
showConfirm('저장하시겠습니까?').then((confirmed) => {
    if (confirmed) {
        saveData();
    }
});
```

---

## 함수 목록

### Alert 함수

| 함수 | 설명 | 예시 |
|------|------|------|
| `showAlert(message, title)` | 일반 알림 | `showAlert('처리되었습니다.')` |
| `showSuccess(message, title)` | 성공 메시지 (2초 자동 닫기) | `showSuccess('저장 완료!')` |
| `showError(message, title)` | 에러 메시지 | `showError('오류가 발생했습니다.')` |
| `showWarning(message, title)` | 경고 메시지 | `showWarning('값을 확인하세요.')` |

### Confirm 함수

| 함수 | 설명 | 반환값 |
|------|------|--------|
| `showConfirm(message, title, options)` | 확인/취소 선택 | `Promise<boolean>` |
| `showDeleteConfirm(message, title)` | 삭제 확인 (빨간색) | `Promise<boolean>` |
| `showSaveConfirm(message, title)` | 저장 확인 (초록색) | `Promise<boolean>` |

### 특수 함수

| 함수 | 설명 | 예시 |
|------|------|------|
| `showLoading(message)` | 로딩 표시 | `showLoading('처리 중...')` |
| `closeLoading()` | 로딩 닫기 | `closeLoading()` |
| `showToast(message, icon)` | 토스트 알림 (우상단) | `showToast('저장됨', 'success')` |
| `showInput(title, placeholder, defaultValue)` | 텍스트 입력받기 | `const name = await showInput('이름 입력')` |
| `showTextarea(title, placeholder, defaultValue)` | 긴 텍스트 입력받기 | `const memo = await showTextarea('메모 입력')` |

---

## 실전 예제

### 예제 1: 데이터 저장

```javascript
async function saveData() {
    const confirmed = await showSaveConfirm('데이터를 저장하시겠습니까?');
    if (!confirmed) return;

    showLoading('저장 중...');

    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        closeLoading();

        if (response.ok) {
            await showSuccess('저장되었습니다!');
            location.reload();
        } else {
            showError('저장에 실패했습니다.');
        }
    } catch (error) {
        closeLoading();
        showError('서버 오류가 발생했습니다.');
    }
}
```

### 예제 2: 삭제 확인

```javascript
async function deleteItem(id) {
    const confirmed = await showDeleteConfirm(
        '이 항목을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.'
    );

    if (!confirmed) return;

    try {
        await fetch(`/api/items/${id}`, { method: 'DELETE' });
        showToast('삭제되었습니다.', 'success');
        loadItems();
    } catch (error) {
        showError('삭제에 실패했습니다.');
    }
}
```

### 예제 3: 유효성 검사

```javascript
function validateForm() {
    if (!projectInput.value) {
        showWarning('프로젝트를 선택해주세요.');
        projectInput.focus();
        return false;
    }

    if (!titleInput.value.trim()) {
        showWarning('제목을 입력해주세요.');
        titleInput.focus();
        return false;
    }

    return true;
}
```

### 예제 4: 조건부 저장 확인

```javascript
async function submitReport() {
    // 달성률이 0일 때 확인
    if (achievementRate === 0) {
        const confirmed = await showConfirm(
            '주간 달성률이 0%입니다.\n\n이대로 저장하시겠습니까?',
            '확인',
            { icon: 'warning', confirmColor: '#ff9800' }
        );
        if (!confirmed) return;
    }

    // 저장 진행
    saveReport();
}
```

### 예제 5: 사용자 입력받기

```javascript
async function addNote() {
    const note = await showTextarea('메모를 입력하세요', '여기에 입력...');

    if (note) {
        console.log('입력된 메모:', note);
        saveNote(note);
    }
}
```

### 예제 6: Toast 알림 (간단한 알림)

```javascript
// 파일 업로드 성공
showToast('파일이 업로드되었습니다.', 'success');

// 복사 완료
showToast('클립보드에 복사되었습니다.', 'info');

// 권한 없음
showToast('권한이 없습니다.', 'error');
```

---

## 마이그레이션 가이드

기존 `alert()`, `confirm()`을 새로운 함수로 변경하는 가이드입니다.

### Before & After

#### 1. 기본 Alert

**Before:**
```javascript
alert('저장되었습니다.');
```

**After:**
```javascript
showSuccess('저장되었습니다.');
// 또는
showAlert('저장되었습니다.');
```

#### 2. Confirm

**Before:**
```javascript
if (confirm('삭제하시겠습니까?')) {
    deleteItem();
}
```

**After:**
```javascript
const confirmed = await showDeleteConfirm('삭제하시겠습니까?');
if (confirmed) {
    deleteItem();
}
```

#### 3. 에러 메시지

**Before:**
```javascript
alert('❌ 오류가 발생했습니다.');
```

**After:**
```javascript
showError('오류가 발생했습니다.');
```

#### 4. 성공 메시지

**Before:**
```javascript
alert('✅ 저장되었습니다.');
```

**After:**
```javascript
showSuccess('저장되었습니다.');
```

#### 5. 경고 메시지

**Before:**
```javascript
alert('⚠️ 값을 확인해주세요.');
```

**After:**
```javascript
showWarning('값을 확인해주세요.');
```

### 함수를 async로 변경해야 하는 경우

`confirm()`을 사용하는 함수는 `async`로 변경해야 합니다.

**Before:**
```javascript
function deleteData() {
    if (confirm('삭제하시겠습니까?')) {
        // 삭제 로직
    }
}
```

**After:**
```javascript
async function deleteData() {
    const confirmed = await showDeleteConfirm('삭제하시겠습니까?');
    if (confirmed) {
        // 삭제 로직
    }
}
```

또는 `.then()` 사용:

```javascript
function deleteData() {
    showDeleteConfirm('삭제하시겠습니까?').then((confirmed) => {
        if (confirmed) {
            // 삭제 로직
        }
    });
}
```

---

## 커스터마이징

### Confirm 옵션 커스터마이징

```javascript
const confirmed = await showConfirm(
    '계속하시겠습니까?',
    '확인',
    {
        icon: 'warning',              // 아이콘 타입
        confirmText: '계속',           // 확인 버튼 텍스트
        cancelText: '중단',            // 취소 버튼 텍스트
        confirmColor: '#28a745',      // 확인 버튼 색상
        cancelColor: '#dc3545'        // 취소 버튼 색상
    }
);
```

### 직접 SweetAlert2 사용

더 복잡한 커스터마이징이 필요한 경우 `Swal` 객체를 직접 사용할 수 있습니다.

```javascript
Swal.fire({
    title: '커스텀 알림',
    html: '<b>강조 텍스트</b>와 <i>이탤릭</i>',
    icon: 'info',
    showCancelButton: true,
    confirmButtonText: 'OK',
    cancelButtonText: 'Cancel'
});
```

자세한 사용법은 [SweetAlert2 공식 문서](https://sweetalert2.github.io/)를 참고하세요.

---

## 주의사항

1. **async/await 필수**: `showConfirm()` 등의 confirm 함수는 반드시 `await`를 사용하거나 `.then()`으로 처리해야 합니다.

2. **이벤트 핸들러**: 이벤트 핸들러에서 confirm을 사용할 때는 함수를 `async`로 만들거나 별도 함수로 분리하세요.

3. **기존 alert/confirm**: 기존 `alert()`, `confirm()`도 여전히 작동하지만, 일관된 디자인을 위해 새로운 함수 사용을 권장합니다.

---

## 아이콘 타입

사용 가능한 아이콘 타입:
- `success` - 초록색 체크마크
- `error` - 빨간색 X
- `warning` - 주황색 느낌표
- `info` - 파란색 i
- `question` - 물음표

---

## 문의

Alert 시스템 관련 문의사항이 있으면 개발팀에 연락주세요.

**관련 파일:**
- `/js/common-alert.js` - 래퍼 함수 정의
- `/templates/fragments/layout.html` - SweetAlert2 CDN 로드
- `ALERT_GUIDE.md` - 이 가이드 문서
