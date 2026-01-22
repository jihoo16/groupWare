# SearchUtils 사용 가이드

검색 하이라이트 및 한글 초성 검색을 지원하는 공통 유틸리티입니다.

## 목차
- [설치 방법](#설치-방법)
- [기본 사용법](#기본-사용법)
- [주요 기능](#주요-기능)
- [실전 예제](#실전-예제)
- [API 레퍼런스](#api-레퍼런스)

---

## 설치 방법

### 1. HTML에 스크립트 추가
```html
<!-- search-utils.js를 다른 스크립트보다 먼저 로드 -->
<script th:src="@{/js/search-utils.js}"></script>
<script th:src="@{/js/your-script.js}"></script>
```

### 2. CSS 추가 (이미 있으면 생략)
```css
/* approval.css에 이미 정의되어 있음 */
.search-highlight {
    background: #ffeb3b;
    color: #333;
    font-weight: 600;
    padding: 2px 0;
    border-radius: 2px;
}
```

---

## 기본 사용법

### 인스턴스 생성
```javascript
// JavaScript 파일 시작 부분
const searchUtils = new SearchUtils();
```

### 검색어 매칭 확인
```javascript
const text = "프로젝트 주간보고";
const keyword = "ㅍㅈㅌ"; // 초성 검색

if (searchUtils.matchesSearch(text, keyword)) {
    console.log("매칭됨!");
}
// 출력: "매칭됨!"
```

### 하이라이트 적용
```javascript
const text = "프로젝트 주간보고";
const keyword = "ㅍㅈ";

const highlighted = searchUtils.highlightText(text, keyword);
console.log(highlighted);
// 출력: '<mark class="search-highlight">프</mark>로<mark class="search-highlight">젝</mark>트 주간보고'
```

---

## 주요 기능

### ✅ 1. 일반 텍스트 검색
```javascript
searchUtils.matchesSearch("프로젝트", "프로"); // true
searchUtils.matchesSearch("프로젝트", "로젝"); // true
searchUtils.matchesSearch("Project", "proj"); // true (대소문자 무시)
```

### ✅ 2. 한글 초성 검색
```javascript
searchUtils.matchesSearch("프로젝트", "ㅍㅈㅌ"); // true
searchUtils.matchesSearch("홍길동", "ㅎㄱㄷ"); // true
searchUtils.matchesSearch("회의록", "ㅎㅇㄹ"); // true
```

### ✅ 3. 하이라이트 자동 처리
```javascript
// 일반 검색 하이라이트
searchUtils.highlightText("프로젝트 관리", "프로");
// → '<mark class="search-highlight">프로</mark>젝트 관리'

// 초성 검색 하이라이트
searchUtils.highlightText("프로젝트 관리", "ㅍㅈ");
// → '<mark class="search-highlight">프</mark>로<mark class="search-highlight">젝</mark>트 관리'
```

### ✅ 4. 여러 필드 검색
```javascript
// 여러 필드 중 하나라도 매칭되면 true
const matched = searchUtils.matchesAny(
    "ㅍㅈ",
    "프로젝트",
    "주간보고",
    "작성자"
);
// true
```

### ✅ 5. 객체 필드 검색
```javascript
const document = {
    title: "프로젝트 주간보고",
    author: "홍길동",
    department: "개발팀"
};

// 지정한 필드들에서 검색
const matched = searchUtils.matchesObject(
    document,
    "ㅍㅈ",
    ['title', 'author', 'department']
);
// true
```

---

## 실전 예제

### 예제 1: 테이블 검색 및 하이라이트

```javascript
document.addEventListener('DOMContentLoaded', function() {
    const searchUtils = new SearchUtils();
    const searchInput = document.getElementById('searchInput');
    const tableRows = document.querySelectorAll('.data-row');

    searchInput.addEventListener('input', function() {
        const keyword = this.value.trim();

        tableRows.forEach(row => {
            const title = row.querySelector('.title').textContent;
            const author = row.querySelector('.author').textContent;

            // 검색어 매칭 확인
            const matches = searchUtils.matchesAny(keyword, title, author);

            if (matches) {
                row.style.display = '';

                // 하이라이트 적용
                row.querySelector('.title').innerHTML =
                    searchUtils.highlightText(title, keyword);
                row.querySelector('.author').innerHTML =
                    searchUtils.highlightText(author, keyword);
            } else {
                row.style.display = 'none';
            }
        });
    });
});
```

### 예제 2: 리스트 필터링 (심플 버전)

```javascript
const searchUtils = new SearchUtils();
const searchInput = document.getElementById('searchInput');

searchInput.addEventListener('input', function() {
    const keyword = this.value;
    const items = document.querySelectorAll('.list-item');

    items.forEach(item => {
        const text = item.textContent;
        const matches = searchUtils.matchesSearch(text, keyword);

        item.style.display = matches ? '' : 'none';

        if (matches && keyword) {
            item.innerHTML = searchUtils.highlightText(text, keyword);
        }
    });
});
```

### 예제 3: 모달 검색 (사용자 선택)

```javascript
const searchUtils = new SearchUtils();
let allUsers = []; // API로 받아온 전체 사용자

function searchUsers(keyword) {
    return allUsers.filter(user => {
        return searchUtils.matchesObject(
            user,
            keyword,
            ['name', 'department', 'position']
        );
    });
}

function renderUserList(keyword) {
    const filtered = searchUsers(keyword);
    const listHtml = filtered.map(user => `
        <div class="user-item">
            <div class="user-name">
                ${searchUtils.highlightText(user.name, keyword)}
            </div>
            <div class="user-dept">
                ${searchUtils.highlightText(user.department, keyword)}
            </div>
        </div>
    `).join('');

    document.getElementById('userList').innerHTML = listHtml;
}

// 검색 입력
document.getElementById('userSearch').addEventListener('input', function() {
    renderUserList(this.value);
});
```

### 예제 4: 카드 리스트 검색

```javascript
const searchUtils = new SearchUtils();

function filterCards(keyword) {
    const cards = document.querySelectorAll('.card');
    let visibleCount = 0;

    cards.forEach(card => {
        const cardData = {
            title: card.querySelector('.card-title')?.textContent || '',
            content: card.querySelector('.card-content')?.textContent || '',
            tags: card.querySelector('.card-tags')?.textContent || ''
        };

        const matches = searchUtils.matchesObject(
            cardData,
            keyword,
            ['title', 'content', 'tags']
        );

        if (matches) {
            card.style.display = '';
            visibleCount++;

            // 하이라이트 적용
            if (keyword) {
                const titleEl = card.querySelector('.card-title');
                const contentEl = card.querySelector('.card-content');

                if (titleEl) {
                    titleEl.innerHTML = searchUtils.highlightText(cardData.title, keyword);
                }
                if (contentEl) {
                    contentEl.innerHTML = searchUtils.highlightText(cardData.content, keyword);
                }
            }
        } else {
            card.style.display = 'none';
        }
    });

    // 결과 카운트 표시
    document.getElementById('resultCount').textContent = `${visibleCount}개`;
}

// 검색 입력
document.getElementById('searchInput').addEventListener('input', function() {
    filterCards(this.value);
});
```

---

## API 레퍼런스

### `matchesSearch(text, keyword)`
텍스트가 검색어와 매칭되는지 확인 (일반 검색 + 초성 검색)

**파라미터:**
- `text` (string): 검색 대상 텍스트
- `keyword` (string): 검색어

**반환값:** `boolean`

**예제:**
```javascript
searchUtils.matchesSearch("프로젝트", "ㅍㅈ"); // true
searchUtils.matchesSearch("프로젝트", "프로"); // true
```

---

### `highlightText(text, keyword, highlightClass)`
검색어에 매칭되는 부분을 하이라이트 처리

**파라미터:**
- `text` (string): 하이라이트할 텍스트
- `keyword` (string): 검색어
- `highlightClass` (string, optional): 하이라이트 CSS 클래스 (기본값: 'search-highlight')

**반환값:** `string` (HTML)

**예제:**
```javascript
searchUtils.highlightText("프로젝트", "ㅍㅈ");
// '<mark class="search-highlight">프</mark>로<mark class="search-highlight">젝</mark>트'

// 커스텀 클래스 사용
searchUtils.highlightText("프로젝트", "ㅍㅈ", "my-highlight");
// '<mark class="my-highlight">프</mark>로<mark class="my-highlight">젝</mark>트'
```

---

### `matchesAny(keyword, ...texts)`
여러 텍스트 중 하나라도 검색어와 매칭되는지 확인

**파라미터:**
- `keyword` (string): 검색어
- `...texts` (string): 검색할 텍스트들 (가변 인자)

**반환값:** `boolean`

**예제:**
```javascript
searchUtils.matchesAny("ㅍㅈ", "프로젝트", "주간보고", "작성자");
// true (첫 번째 텍스트가 매칭됨)
```

---

### `matchesObject(obj, keyword, fields)`
객체의 특정 필드들에서 검색어 매칭 확인

**파라미터:**
- `obj` (object): 검색 대상 객체
- `keyword` (string): 검색어
- `fields` (string[]): 검색할 필드명 배열

**반환값:** `boolean`

**예제:**
```javascript
const doc = {
    title: "프로젝트",
    author: "홍길동",
    content: "내용"
};

searchUtils.matchesObject(doc, "ㅍㅈ", ['title', 'author']);
// true
```

---

### `highlightElement(element, keyword, highlightClass)`
DOM 요소의 텍스트를 하이라이트 처리

**파라미터:**
- `element` (HTMLElement): 대상 요소
- `keyword` (string): 검색어
- `highlightClass` (string, optional): 하이라이트 CSS 클래스

**예제:**
```javascript
const titleEl = document.querySelector('.title');
searchUtils.highlightElement(titleEl, "ㅍㅈㅌ");
```

---

### `highlightElements(elements, keyword, highlightClass)`
여러 DOM 요소의 텍스트를 하이라이트 처리

**파라미터:**
- `elements` (NodeList|Array): 대상 요소들
- `keyword` (string): 검색어
- `highlightClass` (string, optional): 하이라이트 CSS 클래스

**예제:**
```javascript
const titles = document.querySelectorAll('.title');
searchUtils.highlightElements(titles, "ㅍㅈㅌ");
```

---

### `filterTableRows(rows, keyword, getSearchText)`
테이블 행 필터링 (검색어에 매칭되지 않는 행 숨김)

**파라미터:**
- `rows` (NodeList|Array): 테이블 행들
- `keyword` (string): 검색어
- `getSearchText` (Function, optional): 행에서 검색 텍스트를 추출하는 함수

**반환값:** `Array` (필터링된 행 배열)

**예제:**
```javascript
const rows = document.querySelectorAll('tr.data-row');

// 기본 사용 (전체 텍스트 검색)
const filtered = searchUtils.filterTableRows(rows, "ㅍㅈ");

// 커스텀 추출 함수 사용
const filtered = searchUtils.filterTableRows(rows, "ㅍㅈ", (row) => {
    return row.querySelector('.title').textContent;
});
```

---

## 주의사항

1. **순서 중요**: `search-utils.js`는 반드시 다른 스크립트보다 먼저 로드되어야 합니다.

2. **HTML 주입**: `highlightText()` 함수는 HTML을 반환하므로 `innerHTML`로 삽입해야 합니다.
   ```javascript
   // ✅ 올바른 사용
   element.innerHTML = searchUtils.highlightText(text, keyword);

   // ❌ 잘못된 사용 (하이라이트 안됨)
   element.textContent = searchUtils.highlightText(text, keyword);
   ```

3. **성능**: 대량의 데이터를 다룰 때는 디바운싱(debouncing)을 사용하세요.
   ```javascript
   let debounceTimer;
   searchInput.addEventListener('input', function() {
       clearTimeout(debounceTimer);
       debounceTimer = setTimeout(() => {
           filterData(this.value);
       }, 300); // 300ms 대기
   });
   ```

---

## 적용 가능한 화면

현재 프로젝트에서 적용 가능한 화면들:

- ✅ 프로젝트 문서함 (이미 적용됨)
- 📋 전자문서함 (approval.js)
- 👥 사용자 관리 (hr.js)
- 📅 휴가 관리 (vacation.js)
- 🏢 조직도 (organization.js)
- 💰 급여 관리 (payroll.js)
- 💬 메신저 (messenger.js)
- 📌 게시판 (board.js)
- ☁️ 클라우드 (cloud.js)
- 🎯 프로젝트 관리 (project.js)

---

## 문의
검색 기능 관련 문의사항이 있으면 개발팀에 연락주세요.
