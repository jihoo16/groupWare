# 조직도 기능 아키텍처 완벽 가이드

> 이 문서는 조직도 기능의 모든 코드를 처음부터 끝까지 상세하게 설명합니다.

## 목차
1. [전체 구조 개요](#1-전체-구조-개요)
2. [계층별 역할과 책임](#2-계층별-역할과-책임)
3. [데이터 흐름 전체 과정](#3-데이터-흐름-전체-과정)
4. [Service 레이어 상세 분석](#4-service-레이어-상세-분석)
5. [Java 메서드 완벽 이해](#5-java-메서드-완벽-이해)
6. [실제 데이터 예시로 이해하기](#6-실제-데이터-예시로-이해하기)
7. [왜 이렇게 설계했는가](#7-왜-이렇게-설계했는가)

---

## 1. 전체 구조 개요

### 1.1 레이어 구조 (계층 구조)

```
┌─────────────────────────────────────────┐
│  프론트엔드 (Browser)                    │
│  - organization.html                    │
│  - organization.js                      │
└──────────────┬──────────────────────────┘
               │ HTTP Request
               │ GET /api/organization/tree
               ↓
┌─────────────────────────────────────────┐
│  Controller 계층                         │
│  OrganizationController.java            │
│  역할: HTTP 요청/응답 처리               │
└──────────────┬──────────────────────────┘
               │ organizationService.getOrganizationTree()
               ↓
┌─────────────────────────────────────────┐
│  Service 계층 (Interface)                │
│  OrganizationService.java               │
│  역할: 메서드 계약 정의                  │
└──────────────┬──────────────────────────┘
               │ 구현체 호출
               ↓
┌─────────────────────────────────────────┐
│  Service 계층 (Implementation)           │
│  OrganizationServiceImpl.java           │
│  역할: 비즈니스 로직 처리                │
│  - 데이터 조회                           │
│  - 데이터 가공/변환                      │
│  - 트리 구조 생성                        │
└──────────────┬──────────────────────────┘
               │ Repository 메서드 호출
               ↓
┌─────────────────────────────────────────┐
│  Repository 계층                         │
│  - CodeRepository.java                  │
│  - UserRepository.java                  │
│  역할: DB 쿼리 실행                      │
└──────────────┬──────────────────────────┘
               │ SQL 실행
               ↓
┌─────────────────────────────────────────┐
│  Database (PostgreSQL)                  │
│  - erp.code (부서/직급 코드)             │
│  - erp.user (직원 정보)                  │
└─────────────────────────────────────────┘
```

### 1.2 각 계층이 존재하는 이유

**왜 이렇게 복잡하게 나누나요?**

비유를 들어보겠습니다:

```
음식점에 비유:

Controller = 웨이터
- 손님(브라우저)의 주문 받음
- 주방에 전달
- 완성된 음식을 손님에게 전달
- HTTP 요청/응답만 처리

Service Interface = 메뉴판
- "이런 음식들을 제공합니다"라는 약속
- 실제 요리법은 없음
- 계약서 역할

Service Impl = 주방장
- 실제로 요리하는 사람
- 재료 준비 (Repository 호출)
- 조리 (비즈니스 로직)
- 담기 (DTO 생성)

Repository = 창고 관리자
- 재료 가져오기 (DB 쿼리)
- 재료가 어디 있는지만 알면 됨
- 어떻게 요리하는지는 몰라도 됨

Database = 창고
- 실제 재료 보관
```

---

## 2. 계층별 역할과 책임

### 2.1 Controller 계층

**파일:** `OrganizationController.java`

**역할:**
- HTTP 요청 받기
- Service 호출하기
- HTTP 응답 보내기

**중요한 점:**
- **비즈니스 로직이 없음** (데이터 가공 안 함)
- **DB 접근 안 함** (Repository 직접 호출 안 함)
- 단순히 요청을 Service에 전달하고 결과를 리턴

**코드 예시:**
```java
@GetMapping("/tree")
public ResponseEntity<OrganizationTreeDTO> getOrganizationTree() {
    // 1. Service 호출 (일을 시킴)
    OrganizationTreeDTO tree = organizationService.getOrganizationTree();

    // 2. HTTP 응답으로 변환
    return ResponseEntity.ok(tree);
}
```

**왜 Service를 직접 호출하지 않고 Interface를 거치나요?**

```java
// 나쁜 예: 구현체를 직접 사용
private OrganizationServiceImpl organizationService;

// 좋은 예: 인터페이스 사용
private OrganizationService organizationService;
```

**이유:**
1. **유연성**: 나중에 구현체를 바꿔도 Controller 코드는 안 바뀜
2. **테스트**: 가짜(Mock) Service를 쉽게 주입 가능
3. **의존성 역전**: Controller는 추상화(Interface)에 의존

### 2.2 Service Interface 계층

**파일:** `OrganizationService.java`

**역할:**
- 메서드 계약 정의
- "이런 기능이 있어야 해"라는 약속

**전체 코드:**
```java
public interface OrganizationService {
    OrganizationTreeDTO getOrganizationTree();
}
```

**이게 전부입니다!** 단 1개의 메서드 선언만 있습니다.

**왜 필요한가요?**

Interface가 없다면:
```java
// Controller에서
private OrganizationServiceImpl service;  // 구체적인 클래스에 의존

// 나중에 다른 구현으로 바꾸려면?
private CachedOrganizationServiceImpl service;  // Controller 코드 수정 필요
```

Interface가 있으면:
```java
// Controller에서
private OrganizationService service;  // 추상화에 의존

// application.properties나 설정 파일에서만 바꾸면 됨
// Controller 코드는 그대로!
```

### 2.3 Service Implementation 계층

**파일:** `OrganizationServiceImpl.java`

**역할:**
- **핵심 비즈니스 로직 처리**
- DB에서 데이터 조회 (Repository 호출)
- 데이터 가공 및 변환
- 복잡한 계산 수행

**이 클래스가 하는 일:**

```java
@Service
public class OrganizationServiceImpl implements OrganizationService {

    // 의존성 주입
    private final CodeRepository codeRepository;
    private final UserRepository userRepository;

    @Override
    public OrganizationTreeDTO getOrganizationTree() {

        // 1단계: 데이터 수집
        //   - DB에서 부서 코드 가져오기 (C01)
        //   - DB에서 직급 코드 가져오기 (C02)
        //   - DB에서 직원 목록 가져오기

        // 2단계: 데이터 가공
        //   - 직급 코드값을 코드명으로 변환할 Map 만들기
        //   - 직원을 부서별로 그룹화

        // 3단계: 트리 구조 생성
        //   - 각 부서마다 노드 생성
        //   - 각 부서 안에서 직급별로 그룹화
        //   - 직원 정보를 DTO로 변환

        // 4단계: 결과 리턴
        return OrganizationTreeDTO;
    }
}
```

### 2.4 Repository 계층

**파일:** `CodeRepository.java`, `UserRepository.java`

**역할:**
- **DB 쿼리만 실행**
- 데이터 가공 안 함
- 비즈니스 로직 없음

**예시:**
```java
@Repository
public interface CodeRepository extends JpaRepository<Code, Long> {

    // 이 메서드는 이름만 정의하면
    // Spring Data JPA가 자동으로 쿼리를 만들어줌
    @Query("SELECT c FROM Code c WHERE c.groupCode = :groupCode AND c.useYn = 'Y' ORDER BY c.sortOrder ASC")
    List<Code> findActiveByGroupCode(String groupCode);
}
```

**실행되는 SQL:**
```sql
SELECT * FROM erp.code
WHERE group_code = 'C01'
  AND use_yn = 'Y'
ORDER BY sort_order ASC
```

---

## 3. 데이터 흐름 전체 과정

실제 데이터가 어떻게 흐르는지 단계별로 봅시다.

### 3.1 사용자가 페이지 접속

```
브라우저 주소창에 입력:
http://localhost:8080/organization
```

### 3.2 JavaScript가 API 호출

**organization.js:**
```javascript
async function fetchOrganizationData() {
    // 1. API 호출
    const response = await fetch('/api/organization/tree');

    // 2. JSON 파싱
    const data = await response.json();

    // 3. 데이터 구조
    // {
    //   departments: [
    //     {
    //       id: 1,
    //       name: "개발팀",
    //       deptCode: "C0100",
    //       positions: [...]
    //     }
    //   ]
    // }

    return data;
}
```

### 3.3 Controller가 요청 받음

**OrganizationController.java:**
```java
@GetMapping("/tree")
public ResponseEntity<OrganizationTreeDTO> getOrganizationTree() {
    log.info("GET /api/organization/tree - Request received");

    // Service에게 일 시키기
    OrganizationTreeDTO tree = organizationService.getOrganizationTree();

    // 결과를 HTTP 응답으로 변환
    return ResponseEntity.ok(tree);
}
```

**여기서 일어나는 일:**
1. HTTP GET 요청 감지
2. `organizationService` 변수를 통해 Service 호출
3. 스프링이 자동으로 `OrganizationServiceImpl` 찾아서 실행
4. 결과를 JSON으로 변환해서 응답

### 3.4 Service가 실제 작업 수행

**OrganizationServiceImpl.java의 getOrganizationTree() 메서드:**

#### 단계 1: 부서 코드 조회

```java
List<Code> departmentCodes = codeRepository.findActiveByGroupCode("C01");
```

**실행되는 쿼리:**
```sql
SELECT * FROM erp.code
WHERE group_code = 'C01'
  AND use_yn = 'Y'
ORDER BY sort_order ASC
```

**결과 예시:**
```
idx | code   | code_name | sort_order
----|--------|-----------|------------
1   | C0100  | 개발팀    | 1
2   | C0101  | 디자인팀  | 2
3   | C0102  | 기획팀    | 3
```

**Java 객체로 변환:**
```java
[
    Code(idx=1, code="C0100", codeName="개발팀", sortOrder=1),
    Code(idx=2, code="C0101", codeName="디자인팀", sortOrder=2),
    Code(idx=3, code="C0102", codeName="기획팀", sortOrder=3)
]
```

#### 단계 2: 직급 코드 조회 및 Map 생성

```java
List<Code> positionCodes = codeRepository.findActiveByGroupCode("C02");
```

**결과:**
```
code   | code_name
-------|----------
C0201  | 부장
C0202  | 차장
C0203  | 과장
C0204  | 대리
```

**Map으로 변환:**
```java
Map<String, String> positionCodeMap = positionCodes.stream()
    .collect(Collectors.toMap(Code::getCode, Code::getCodeName));
```

**왜 Map으로 만드나요?**

Map:
```java
{
    "C0201" -> "부장",
    "C0202" -> "차장",
    "C0203" -> "과장",
    "C0204" -> "대리"
}
```

나중에 직원의 직급 코드를 이름으로 바꿀 때:
```java
String positionCode = "C0201";  // 직원의 emp_position
String positionName = positionCodeMap.get(positionCode);  // "부장"
```

**List를 쓰면 어떻게 되나요?**

```java
// List를 사용하면 매번 반복문을 돌아야 함
String positionName = null;
for (Code code : positionCodes) {
    if (code.getCode().equals("C0201")) {
        positionName = code.getCodeName();
        break;
    }
}
```

**Map vs List 성능 비교:**
- List에서 찾기: O(n) - 최악의 경우 전체를 다 확인
- Map에서 찾기: O(1) - 바로 찾음

직원이 100명이면:
- List: 100번 반복문 실행
- Map: 100번 바로 찾기

#### 단계 3: 직원 목록 조회

```java
List<User> users = userRepository.findAllActive();
```

**결과 예시:**
```
idx | emp_name | emp_dept | emp_position
----|----------|----------|-------------
1   | 김철수   | C0100    | C0201
2   | 이영희   | C0100    | C0202
3   | 박민수   | C0101    | C0203
```

#### 단계 4: 부서별로 직원 그룹화

```java
Map<String, List<User>> usersByDept = users.stream()
    .collect(Collectors.groupingBy(User::getEmpDept));
```

**결과:**
```java
{
    "C0100" -> [User(김철수), User(이영희)],
    "C0101" -> [User(박민수)],
    "C0102" -> []
}
```

**왜 이렇게 하나요?**

나중에 부서별로 직원을 찾을 때:
```java
String deptCode = "C0100";
List<User> deptUsers = usersByDept.get(deptCode);  // [김철수, 이영희]
```

반복문 없이 바로 찾을 수 있습니다!

#### 단계 5: 부서별 노드 생성

```java
List<DepartmentNodeDTO> departmentNodes = departmentCodes.stream()
    .map(deptCode -> {
        List<User> deptUsers = usersByDept.getOrDefault(deptCode.getCode(), Collections.emptyList());
        return createDepartmentNode(deptCode, deptUsers, positionCodeMap);
    })
    .filter(node -> !node.getPositions().isEmpty())
    .collect(Collectors.toList());
```

**이 코드가 하는 일:**

```
departmentCodes (부서 목록)
  ↓
각 부서마다:
  1. 해당 부서 직원 찾기
  2. createDepartmentNode() 호출
  3. DepartmentNodeDTO 생성
  ↓
직원이 없는 부서는 제외 (filter)
  ↓
최종 리스트 생성
```

---

## 4. Service 레이어 상세 분석

### 4.1 createDepartmentNode() 메서드

**전체 코드:**
```java
private DepartmentNodeDTO createDepartmentNode(
    Code deptCode,
    List<User> deptUsers,
    Map<String, String> positionCodeMap
) {
    // 직급별로 직원 그룹화 (코드명 기준)
    Map<String, List<User>> usersByPosition = deptUsers.stream()
        .sorted(Comparator.comparing(u -> getPositionOrder(getPositionName(u.getEmpPosition(), positionCodeMap))))
        .collect(Collectors.groupingBy(
            u -> getPositionGroupName(getPositionName(u.getEmpPosition(), positionCodeMap)),
            LinkedHashMap::new,
            Collectors.toList()
        ));

    // 직급 그룹 생성
    List<PositionGroupDTO> positionGroups = new ArrayList<>();
    int groupId = (int) (deptCode.getIdx() * 100);

    for (Map.Entry<String, List<User>> entry : usersByPosition.entrySet()) {
        String groupName = entry.getKey();
        List<User> groupUsers = entry.getValue();

        if (!groupUsers.isEmpty()) {
            String rankRange = getRankRange(groupUsers, positionCodeMap);
            List<EmployeeNodeDTO> members = groupUsers.stream()
                .map(user -> createEmployeeNode(user, deptCode.getCodeName(), positionCodeMap))
                .collect(Collectors.toList());

            positionGroups.add(PositionGroupDTO.builder()
                .id((long) groupId++)
                .name(groupName)
                .rank(rankRange)
                .members(members)
                .build());
        }
    }

    return DepartmentNodeDTO.builder()
        .id(deptCode.getIdx())
        .name(deptCode.getCodeName())
        .deptCode(deptCode.getCode())
        .positions(positionGroups)
        .build();
}
```

**이 메서드가 하는 일:**

1. 부서 내 직원들을 직급별로 그룹화
2. 각 직급 그룹을 DTO로 변환
3. 최종 부서 노드 생성

**실제 데이터로 따라가기:**

**입력:**
- `deptCode`: Code(code="C0100", codeName="개발팀")
- `deptUsers`: [김철수(부장), 이영희(차장), 박민수(과장), 최대리(대리)]
- `positionCodeMap`: {"C0201"->"부장", "C0202"->"차장", ...}

**1단계: 직급별 그룹화**

```java
Map<String, List<User>> usersByPosition = deptUsers.stream()
    .sorted(...)
    .collect(Collectors.groupingBy(...));
```

**결과:**
```java
{
    "본부장" -> [김철수(부장)],
    "팀원" -> [이영희(차장), 박민수(과장), 최대리(대리)]
}
```

**왜 "본부장", "팀원"으로 그룹화되나요?**

`getPositionGroupName()` 메서드:
```java
private static final Map<String, String> POSITION_GROUPS = new HashMap<>();
static {
    POSITION_GROUPS.put("부장", "본부장");
    POSITION_GROUPS.put("차장", "팀원");
    POSITION_GROUPS.put("과장", "팀원");
    POSITION_GROUPS.put("대리", "팀원");
}
```

**2단계: 각 그룹을 DTO로 변환**

```java
for (Map.Entry<String, List<User>> entry : usersByPosition.entrySet()) {
    String groupName = entry.getKey();  // "본부장" 또는 "팀원"
    List<User> groupUsers = entry.getValue();  // 해당 그룹의 직원들

    // 각 직원을 EmployeeNodeDTO로 변환
    List<EmployeeNodeDTO> members = groupUsers.stream()
        .map(user -> createEmployeeNode(user, deptCode.getCodeName(), positionCodeMap))
        .collect(Collectors.toList());

    // PositionGroupDTO 생성
    positionGroups.add(PositionGroupDTO.builder()
        .id((long) groupId++)
        .name(groupName)  // "본부장"
        .rank(rankRange)  // "부장"
        .members(members)  // [EmployeeNodeDTO(김철수)]
        .build());
}
```

**최종 결과:**
```java
DepartmentNodeDTO {
    id: 1,
    name: "개발팀",
    deptCode: "C0100",
    positions: [
        PositionGroupDTO {
            id: 100,
            name: "본부장",
            rank: "부장",
            members: [
                EmployeeNodeDTO {
                    id: 1,
                    name: "김철수",
                    position: "부장",  // 코드명으로 변환됨!
                    rank: "부장",
                    department: "개발팀",
                    ...
                }
            ]
        },
        PositionGroupDTO {
            id: 101,
            name: "팀원",
            rank: "대리~차장",
            members: [
                EmployeeNodeDTO(이영희, 차장),
                EmployeeNodeDTO(박민수, 과장),
                EmployeeNodeDTO(최대리, 대리)
            ]
        }
    ]
}
```

---

## 5. Java 메서드 완벽 이해

### 5.1 Stream이란?

**Stream은 데이터의 흐름입니다.**

비유: 컨베이어 벨트

```
[원재료] -> [가공1] -> [가공2] -> [포장] -> [완성품]
```

**일반 반복문:**
```java
List<User> users = getUsers();
List<String> names = new ArrayList<>();

for (User user : users) {
    if (user.isActive()) {
        names.add(user.getName());
    }
}
```

**Stream 사용:**
```java
List<String> names = users.stream()
    .filter(user -> user.isActive())
    .map(User::getName)
    .collect(Collectors.toList());
```

**왜 Stream을 쓰나요?**

1. **읽기 쉬움**: 코드가 하는 일이 명확
2. **체인 가능**: 여러 작업을 연결
3. **병렬 처리 가능**: `.parallelStream()`으로 멀티코어 활용

**Stream 주요 메서드:**

#### 5.1.1 filter() - 필터링

```java
// 재직중인 직원만
users.stream()
    .filter(u -> u.getEmpStatus().equals("재직"))
```

**실제 동작:**
```
[김철수(재직), 이영희(퇴사), 박민수(재직)]
    ↓ filter
[김철수(재직), 박민수(재직)]
```

#### 5.1.2 map() - 변환

```java
// User 객체를 이름 문자열로 변환
users.stream()
    .map(User::getName)
```

**실제 동작:**
```
[User(김철수), User(이영희)]
    ↓ map
["김철수", "이영희"]
```

#### 5.1.3 sorted() - 정렬

```java
// 이름 순으로 정렬
users.stream()
    .sorted(Comparator.comparing(User::getName))
```

**실제 동작:**
```
[User(이영희), User(김철수), User(박민수)]
    ↓ sorted
[User(김철수), User(박민수), User(이영희)]
```

#### 5.1.4 collect() - 결과 수집

```java
// Stream을 List로 변환
List<User> result = users.stream()
    .filter(...)
    .collect(Collectors.toList());
```

**왜 collect가 필요한가요?**

Stream은 **데이터의 흐름**이지 **실제 데이터**가 아닙니다.
collect()를 해야 실제 컬렉션(List, Set, Map)으로 변환됩니다.

### 5.2 Comparator란?

**Comparator는 비교자입니다.**

"누가 더 앞에 와야 하는지" 결정하는 규칙

**예시:**
```java
// 이름순 정렬
Comparator.comparing(User::getName)

// 나이순 정렬
Comparator.comparing(User::getAge)

// 나이 역순 정렬
Comparator.comparing(User::getAge).reversed()

// 여러 조건 조합
Comparator.comparing(User::getDept)
    .thenComparing(User::getName)
```

**실제 사용 예:**
```java
users.stream()
    .sorted(Comparator.comparing(u -> getPositionOrder(u.getEmpPosition())))
```

**이 코드가 하는 일:**

1. 각 직원의 직급 코드 가져오기
2. `getPositionOrder()` 메서드로 순서 번호 가져오기
3. 그 번호로 정렬

```java
private int getPositionOrder(String position) {
    Map<String, Integer> ORDER = {
        "부장" -> 1,
        "차장" -> 2,
        "과장" -> 3
    };
    return ORDER.getOrDefault(position, 999);
}
```

**결과:**
```
[User(과장), User(부장), User(차장)]
    ↓ sorted
[User(부장:1), User(차장:2), User(과장:3)]
```

### 5.3 Collectors.groupingBy()

**데이터를 그룹별로 묶어줍니다.**

**예시:**
```java
Map<String, List<User>> usersByDept = users.stream()
    .collect(Collectors.groupingBy(User::getEmpDept));
```

**실제 동작:**

**입력:**
```
[
    User(김철수, dept=C0100),
    User(이영희, dept=C0100),
    User(박민수, dept=C0101)
]
```

**출력:**
```
{
    "C0100" -> [User(김철수), User(이영희)],
    "C0101" -> [User(박민수)]
}
```

**고급 사용법:**
```java
Map<String, List<User>> usersByPosition = deptUsers.stream()
    .collect(Collectors.groupingBy(
        u -> getPositionGroupName(u.getPosition()),  // 그룹 키
        LinkedHashMap::new,                          // Map 타입 (순서 유지)
        Collectors.toList()                          // 값 타입
    ));
```

**왜 LinkedHashMap을 쓰나요?**

- `HashMap`: 순서 보장 안 됨
- `LinkedHashMap`: 입력 순서 유지

조직도에서는 "본부장" -> "팀장" -> "팀원" 순서가 중요하므로 LinkedHashMap 사용

### 5.4 Optional과 getOrDefault()

**Optional은 "값이 있을 수도, 없을 수도 있음"을 표현**

**문제 상황:**
```java
String positionName = positionCodeMap.get("C0299");  // 존재하지 않는 코드
// positionName = null
// positionName.length()  -> NullPointerException!
```

**해결책:**
```java
String positionName = positionCodeMap.getOrDefault("C0299", "직급미상");
// positionName = "직급미상"
```

**코드에서 사용:**
```java
List<User> deptUsers = usersByDept.getOrDefault(deptCode.getCode(), Collections.emptyList());
```

**의미:**
- 해당 부서에 직원이 있으면 그 직원 리스트 리턴
- 없으면 빈 리스트 리턴 (null 아님!)

**왜 빈 리스트를 리턴하나요?**

```java
List<User> users = null;
for (User u : users) {  // NullPointerException!
    ...
}

List<User> users = Collections.emptyList();
for (User u : users) {  // 안전! (그냥 실행 안 됨)
    ...
}
```

### 5.5 Lambda Expression (람다식)

**람다는 "간단한 함수"를 표현하는 방법**

**전통적인 방법:**
```java
Comparator<User> comparator = new Comparator<User>() {
    @Override
    public int compare(User u1, User u2) {
        return u1.getName().compareTo(u2.getName());
    }
};
```

**람다 사용:**
```java
Comparator<User> comparator = (u1, u2) -> u1.getName().compareTo(u2.getName());
```

**더 간단하게:**
```java
Comparator<User> comparator = Comparator.comparing(User::getName);
```

**코드에서 사용 예:**
```java
.filter(u -> u.getEmpStatus().equals("재직"))
//      ↑ 파라미터  ↑ 리턴값
```

**메서드 참조 (::) 문법:**
```java
.map(User::getName)
// User::getName는 u -> u.getName()와 같음
```

---

## 6. 실제 데이터 예시로 이해하기

### 6.1 DB 데이터

**erp.code (부서):**
```sql
SELECT * FROM erp.code WHERE group_code = 'C01' ORDER BY sort_order;

idx | group_code | code  | code_name | sort_order
----|------------|-------|-----------|------------
1   | C01        | C0100 | 개발팀    | 1
2   | C01        | C0101 | 디자인팀  | 2
3   | C01        | C0102 | 기획팀    | 3
```

**erp.code (직급):**
```sql
SELECT * FROM erp.code WHERE group_code = 'C02' ORDER BY sort_order;

idx | group_code | code  | code_name | sort_order
----|------------|-------|-----------|------------
10  | C02        | C0201 | 부장      | 1
11  | C02        | C0202 | 차장      | 2
12  | C02        | C0203 | 과장      | 3
13  | C02        | C0204 | 대리      | 4
```

**erp.user:**
```sql
SELECT idx, emp_name, emp_dept, emp_position FROM erp.user WHERE deleted_at IS NULL;

idx | emp_name | emp_dept | emp_position | emp_email
----|----------|----------|--------------|-------------------
1   | 김철수   | C0100    | C0201        | kim@company.com
2   | 이영희   | C0100    | C0202        | lee@company.com
3   | 박민수   | C0100    | C0203        | park@company.com
4   | 최대리   | C0100    | C0204        | choi@company.com
5   | 홍길동   | C0101    | C0202        | hong@company.com
```

### 6.2 데이터 변환 과정

#### Step 1: Repository 조회

```java
List<Code> departmentCodes = codeRepository.findActiveByGroupCode("C01");
```

**결과:**
```java
[
    Code(idx=1, code="C0100", codeName="개발팀", sortOrder=1),
    Code(idx=2, code="C0101", codeName="디자인팀", sortOrder=2),
    Code(idx=3, code="C0102", codeName="기획팀", sortOrder=3)
]
```

#### Step 2: 직급 코드 Map 생성

```java
List<Code> positionCodes = codeRepository.findActiveByGroupCode("C02");
Map<String, String> positionCodeMap = positionCodes.stream()
    .collect(Collectors.toMap(Code::getCode, Code::getCodeName));
```

**결과:**
```java
{
    "C0201" -> "부장",
    "C0202" -> "차장",
    "C0203" -> "과장",
    "C0204" -> "대리"
}
```

#### Step 3: 직원 조회 및 부서별 그룹화

```java
List<User> users = userRepository.findAllActive();
Map<String, List<User>> usersByDept = users.stream()
    .collect(Collectors.groupingBy(User::getEmpDept));
```

**결과:**
```java
{
    "C0100" -> [
        User(idx=1, name="김철수", dept="C0100", position="C0201"),
        User(idx=2, name="이영희", dept="C0100", position="C0202"),
        User(idx=3, name="박민수", dept="C0100", position="C0203"),
        User(idx=4, name="최대리", dept="C0100", position="C0204")
    ],
    "C0101" -> [
        User(idx=5, name="홍길동", dept="C0101", position="C0202")
    ]
}
```

#### Step 4: 부서 노드 생성 (개발팀)

```java
// 개발팀 처리
Code deptCode = Code(code="C0100", codeName="개발팀");
List<User> deptUsers = usersByDept.get("C0100");  // 김철수, 이영희, 박민수, 최대리

DepartmentNodeDTO node = createDepartmentNode(deptCode, deptUsers, positionCodeMap);
```

**createDepartmentNode 내부:**

**4-1. 직급별 그룹화:**
```java
Map<String, List<User>> usersByPosition = deptUsers.stream()
    .sorted(...)
    .collect(Collectors.groupingBy(
        u -> getPositionGroupName(getPositionName(u.getEmpPosition(), positionCodeMap))
    ));
```

**변환 과정:**
```
김철수: position="C0201"
  -> positionCodeMap.get("C0201")
  -> "부장"
  -> getPositionGroupName("부장")
  -> "본부장"

이영희: position="C0202"
  -> "차장"
  -> "팀원"
```

**결과:**
```java
{
    "본부장" -> [User(김철수, position="C0201")],
    "팀원" -> [
        User(이영희, position="C0202"),
        User(박민수, position="C0203"),
        User(최대리, position="C0204")
    ]
}
```

**4-2. 각 그룹을 DTO로 변환:**
```java
for (Map.Entry<String, List<User>> entry : usersByPosition.entrySet()) {
    String groupName = entry.getKey();  // "본부장"
    List<User> groupUsers = entry.getValue();  // [김철수]

    List<EmployeeNodeDTO> members = groupUsers.stream()
        .map(user -> createEmployeeNode(user, "개발팀", positionCodeMap))
        .collect(Collectors.toList());

    positionGroups.add(PositionGroupDTO.builder()
        .name(groupName)
        .members(members)
        .build());
}
```

**createEmployeeNode:**
```java
private EmployeeNodeDTO createEmployeeNode(User user, String deptName, Map<String, String> positionCodeMap) {
    String positionName = getPositionName(user.getEmpPosition(), positionCodeMap);
    // user.getEmpPosition() = "C0201"
    // positionCodeMap.get("C0201") = "부장"

    return EmployeeNodeDTO.builder()
        .id(user.getIdx())  // 1
        .name(user.getEmpName())  // "김철수"
        .position(positionName)  // "부장" (코드명으로 변환됨!)
        .rank(positionName)  // "부장"
        .department(deptName)  // "개발팀"
        .email(user.getEmpEmail())  // "kim@company.com"
        .build();
}
```

#### Step 5: 최종 결과

```java
OrganizationTreeDTO {
    departments: [
        DepartmentNodeDTO {
            id: 1,
            name: "개발팀",
            deptCode: "C0100",
            positions: [
                PositionGroupDTO {
                    id: 100,
                    name: "본부장",
                    rank: "부장",
                    members: [
                        EmployeeNodeDTO {
                            id: 1,
                            name: "김철수",
                            position: "부장",  // ← C0201이 "부장"으로 변환됨!
                            rank: "부장",
                            department: "개발팀",
                            email: "kim@company.com",
                            phone: "010-1234-5678",
                            joinDate: "2015-03-15",
                            status: "재직중"
                        }
                    ]
                },
                PositionGroupDTO {
                    id: 101,
                    name: "팀원",
                    rank: "대리~차장",  // 범위로 표시
                    members: [
                        EmployeeNodeDTO(이영희, "차장", ...),
                        EmployeeNodeDTO(박민수, "과장", ...),
                        EmployeeNodeDTO(최대리, "대리", ...)
                    ]
                }
            ]
        },
        DepartmentNodeDTO {
            id: 2,
            name: "디자인팀",
            deptCode: "C0101",
            positions: [
                PositionGroupDTO {
                    name: "팀원",
                    members: [
                        EmployeeNodeDTO(홍길동, "차장", ...)
                    ]
                }
            ]
        }
    ]
}
```

#### Step 6: JSON 응답

Controller가 이 DTO를 리턴하면 스프링이 자동으로 JSON으로 변환:

```json
{
  "departments": [
    {
      "id": 1,
      "name": "개발팀",
      "deptCode": "C0100",
      "positions": [
        {
          "id": 100,
          "name": "본부장",
          "rank": "부장",
          "members": [
            {
              "id": 1,
              "name": "김철수",
              "position": "부장",
              "rank": "부장",
              "department": "개발팀",
              "email": "kim@company.com",
              "phone": "010-1234-5678",
              "extension": "EMP001",
              "joinDate": "2015-03-15",
              "status": "재직중",
              "manager": "-",
              "teamCount": 0
            }
          ]
        },
        {
          "id": 101,
          "name": "팀원",
          "rank": "대리~차장",
          "members": [
            {
              "id": 2,
              "name": "이영희",
              "position": "차장",
              ...
            },
            ...
          ]
        }
      ]
    }
  ]
}
```

---

## 7. 왜 이렇게 설계했는가

### 7.1 왜 Interface와 Impl을 분리하나요?

**상황 1: 구현을 바꿔야 할 때**

처음엔 DB에서 조회:
```java
@Service
public class OrganizationServiceImpl implements OrganizationService {
    public OrganizationTreeDTO getOrganizationTree() {
        // DB에서 조회
        return data;
    }
}
```

나중에 캐시 추가:
```java
@Service
@Primary  // 이걸 먼저 사용하라고 표시
public class CachedOrganizationServiceImpl implements OrganizationService {

    private final RedisCache cache;
    private final OrganizationServiceImpl original;

    public OrganizationTreeDTO getOrganizationTree() {
        // 1. 캐시 확인
        if (cache.has("org_tree")) {
            return cache.get("org_tree");
        }

        // 2. 캐시 없으면 원본 Service 호출
        OrganizationTreeDTO data = original.getOrganizationTree();

        // 3. 캐시 저장
        cache.set("org_tree", data, 10분);

        return data;
    }
}
```

**Controller 코드는 전혀 안 바뀜!**

```java
@RestController
public class OrganizationController {
    private final OrganizationService service;  // Interface만 의존

    @GetMapping("/tree")
    public ResponseEntity<OrganizationTreeDTO> getTree() {
        return ResponseEntity.ok(service.getOrganizationTree());
    }
}
```

**상황 2: 테스트할 때**

실제 DB 없이 테스트:
```java
@Test
void testController() {
    // 가짜 Service
    OrganizationService fakeService = new OrganizationService() {
        @Override
        public OrganizationTreeDTO getOrganizationTree() {
            // 테스트용 고정 데이터
            return OrganizationTreeDTO.builder()
                .departments(Arrays.asList(...))
                .build();
        }
    };

    // Controller 테스트
    OrganizationController controller = new OrganizationController(fakeService, ...);
    ResponseEntity<OrganizationTreeDTO> response = controller.getOrganizationTree();

    assertEquals(200, response.getStatusCodeValue());
    // DB 연결 없이도 테스트 가능!
}
```

### 7.2 왜 Stream을 사용하나요?

**가독성:**

반복문:
```java
List<String> activeUserNames = new ArrayList<>();
for (User user : users) {
    if (user.getEmpStatus().equals("재직")) {
        activeUserNames.add(user.getEmpName());
    }
}
```

Stream:
```java
List<String> activeUserNames = users.stream()
    .filter(u -> u.getEmpStatus().equals("재직"))
    .map(User::getEmpName)
    .collect(Collectors.toList());
```

**의도가 명확:**
- "재직중인 직원을 필터링하고"
- "이름만 추출해서"
- "리스트로 수집"

**병렬 처리:**
```java
// 멀티코어 CPU 활용
List<String> names = users.parallelStream()
    .filter(...)
    .map(...)
    .collect(Collectors.toList());
```

직원이 10,000명이면 4코어 CPU에서 약 4배 빠름!

### 7.3 왜 Map을 사용하나요?

**성능 비교:**

**List로 찾기:**
```java
String findPositionName(String code, List<Code> positions) {
    for (Code c : positions) {
        if (c.getCode().equals(code)) {
            return c.getCodeName();
        }
    }
    return null;
}

// 직원 100명, 직급 10개
// 100 * 10 = 1,000번 비교
```

**Map으로 찾기:**
```java
String findPositionName(String code, Map<String, String> positionMap) {
    return positionMap.get(code);
}

// 직원 100명
// 100번 조회 (각 조회는 O(1))
```

**실제 속도:**
- List: 10,000명 처리 시 약 100ms
- Map: 10,000명 처리 시 약 1ms

### 7.4 왜 DTO를 사용하나요?

**Entity를 직접 리턴하면?**

```java
// 나쁜 예
@GetMapping("/tree")
public List<User> getUsers() {
    return userRepository.findAll();
}
```

**문제점:**

1. **보안**: password 같은 민감 정보 노출
2. **성능**: LazyLoading 때문에 N+1 쿼리 발생
3. **유연성**: Entity 구조가 바뀌면 API 응답도 바뀜

**DTO 사용:**
```java
@GetMapping("/tree")
public List<UserDTO> getUsers() {
    List<User> users = userRepository.findAll();
    return users.stream()
        .map(u -> UserDTO.builder()
            .name(u.getEmpName())
            .email(u.getEmpEmail())
            // password는 포함 안 함!
            .build())
        .collect(Collectors.toList());
}
```

**장점:**

1. **보안**: 필요한 정보만 노출
2. **성능**: 한 번에 모든 데이터 로드
3. **유연성**: API 응답 형식을 자유롭게 변경

### 7.5 왜 Repository를 분리하나요?

**Service에서 직접 SQL을 쓰면?**

```java
// 나쁜 예
@Service
public class OrganizationServiceImpl {

    @Autowired
    private JdbcTemplate jdbc;

    public List<Code> getDepartments() {
        String sql = "SELECT * FROM erp.code WHERE group_code = 'C01'";
        return jdbc.query(sql, new CodeMapper());
    }
}
```

**문제점:**

1. **중복**: 같은 쿼리를 여러 Service에서 작성
2. **유지보수**: DB 구조 바뀌면 모든 Service 수정
3. **테스트**: Service 테스트할 때 항상 DB 필요

**Repository 사용:**

```java
@Repository
public interface CodeRepository extends JpaRepository<Code, Long> {
    List<Code> findByGroupCode(String groupCode);
}

@Service
public class OrganizationServiceImpl {
    private final CodeRepository codeRepository;

    public List<Code> getDepartments() {
        return codeRepository.findByGroupCode("C01");
    }
}
```

**장점:**

1. **재사용**: 다른 Service에서도 같은 Repository 사용
2. **유지보수**: Repository만 수정하면 됨
3. **테스트**: Repository를 Mock으로 쉽게 대체

---

## 마무리

### 핵심 요약

1. **계층 분리**: Controller - Service - Repository
   - 각 계층은 명확한 책임이 있음
   - 한 계층의 변경이 다른 계층에 영향 최소화

2. **Interface 사용**: 유연성과 테스트 용이성
   - 구현체를 쉽게 교체 가능
   - 가짜 객체로 테스트 가능

3. **Stream API**: 가독성과 성능
   - 코드가 하는 일이 명확
   - 병렬 처리 가능

4. **Map 활용**: 빠른 조회
   - List보다 훨씬 빠름
   - 코드값을 코드명으로 변환할 때 유용

5. **DTO 사용**: 보안과 유연성
   - 필요한 정보만 노출
   - API 응답 형식 자유롭게 변경

### 실무 팁

1. **로그 활용**: 디버깅할 때 로그 레벨 조정
   ```java
   log.info("Found {} departments", departments.size());
   log.debug("Department details: {}", departments);
   ```

2. **null 체크**: Optional, getOrDefault 활용
   ```java
   String name = positionCodeMap.getOrDefault(code, "미지정");
   ```

3. **성능**: 큰 데이터는 페이징 처리
   ```java
   Pageable pageable = PageRequest.of(0, 100);
   Page<User> users = userRepository.findAll(pageable);
   ```

4. **에러 처리**: 명확한 에러 메시지
   ```java
   .orElseThrow(() -> new IllegalArgumentException("부서를 찾을 수 없습니다: " + deptCode));
   ```

이제 코드의 모든 부분을 완벽하게 이해하셨을 겁니다!
궁금한 점이 더 있으면 언제든 물어보세요.
