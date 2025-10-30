# API Layer Architecture Guide

이 문서는 ERP 프로젝트의 API/Service 계층 아키텍처와 개발 가이드를 설명합니다.

## 목차
1. [아키텍처 개요](#아키텍처-개요)
2. [Interface + Impl 패턴](#interface--impl-패턴)
3. [패키지 구조](#패키지-구조)
4. [호출 흐름](#호출-흐름)
5. [IntelliJ 코드 탐색 팁](#intellij-코드-탐색-팁)
6. [새 모듈 추가 가이드](#새-모듈-추가-가이드)
7. [예제: User 모듈](#예제-user-모듈)

---

## 아키텍처 개요

이 프로젝트는 **계층형 아키텍처**를 사용하며, 각 계층은 명확한 책임을 가집니다.

```
┌─────────────────────────────────────────────┐
│  Controller Layer (REST API)                │  ← HTTP 요청/응답 처리
│  - @RestController                          │
│  - ResponseEntity<DTO>                      │
└─────────────────┬───────────────────────────┘
                  │ Interface 타입으로 의존
┌─────────────────▼───────────────────────────┐
│  Service Layer (비즈니스 로직)                │  ← 트랜잭션, 비즈니스 규칙
│  - Interface: 계약 정의                      │
│  - Impl: 실제 구현                           │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Repository Layer (데이터 접근)              │  ← DB CRUD
│  - JpaRepository 상속                       │
│  - Spring Data JPA가 구현체 자동 생성        │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Entity Layer (도메인 모델)                  │  ← DB 테이블 매핑
│  - @Entity, @Table                          │
│  - JPA 어노테이션                            │
└─────────────────────────────────────────────┘
```

**보조 컴포넌트:**
- **DTO (Data Transfer Object)**: 계층 간 데이터 전송
- **Mapper**: Entity ↔ DTO 변환 로직 분리

---

## Interface + Impl 패턴

### 왜 이 패턴을 사용하는가?

이 프로젝트는 **Service 계층에서 Interface + Impl 패턴**을 사용합니다.

#### 사용 이유:

1. **계층 분리 원칙 (Dependency Inversion Principle)**
   - Controller는 구체 클래스가 아닌 추상화(Interface)에 의존
   - 구현체 변경 시 Controller 수정 불필요

2. **명확한 계약 정의**
   - Interface는 Service가 제공하는 기능의 "계약서"
   - Javadoc으로 메서드 의도를 명확히 문서화

3. **엔터프라이즈 표준 패턴**
   - Java EE, Spring 프로젝트의 전통적 패턴
   - 팀 코딩 컨벤션 일관성 유지

4. **미래 확장성**
   - 여러 구현체가 필요한 경우 대비
   - 테스트용/운영용 구현체 분리 가능

### 구조 예시:

```java
// 1. Interface: 계약 정의
public interface UserService {
    List<UserSimpleDTO> getAllActiveUsers();
    UserDTO getUserById(Long idx);
    UserDTO createUser(UserCreateDTO dto, Long createdUserIdx);
}

// 2. Implementation: 실제 구현
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Override
    public List<UserSimpleDTO> getAllActiveUsers() {
        return userRepository.findAllActive().stream()
                .map(userMapper::toSimpleDTO)
                .collect(Collectors.toList());
    }
    // ... 나머지 구현
}

// 3. Controller: Interface 타입으로 의존
@RestController
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;  // Interface 타입

    @GetMapping
    public ResponseEntity<List<UserSimpleDTO>> getAllActiveUsers() {
        return ResponseEntity.ok(userService.getAllActiveUsers());
    }
}
```

### Spring의 의존성 주입 동작:

```java
// Controller에서 선언
private final UserService userService;  // Interface 타입

// Spring이 실제로 주입하는 객체
UserService userService = new UserServiceImpl(userRepository, userMapper);
//          ↑ Interface 타입        ↑ 실제 구현체 인스턴스
```

**동작 원리:**
1. Spring ApplicationContext가 `UserService` 타입 빈을 찾음
2. `UserServiceImpl`이 `UserService`를 구현하고 있음을 발견
3. `UserServiceImpl` 인스턴스를 생성하여 주입

---

## 패키지 구조

### 모듈별 패키지 구성:

```
com.pinecni.erp.api.{module}/
├── controller/
│   └── {Module}Controller.java       ← REST API 엔드포인트
├── service/
│   ├── {Module}Service.java          ← Service Interface
│   └── {Module}ServiceImpl.java      ← Service 구현체
├── dto/
│   ├── {Module}DTO.java              ← 전체 정보 DTO
│   ├── {Module}SimpleDTO.java        ← 간략 정보 DTO (목록용)
│   ├── {Module}CreateDTO.java        ← 생성 요청 DTO
│   └── {Module}UpdateDTO.java        ← 수정 요청 DTO
└── mapper/
    └── {Module}Mapper.java           ← Entity ↔ DTO 변환

공통 패키지 (모듈 외부):
com.pinecni.erp/
├── entity/
│   └── {Module}.java                 ← JPA Entity
└── repository/
    └── {Module}Repository.java       ← JPA Repository
```

### DTO 구분 기준:

| DTO 타입 | 용도 | 포함 필드 |
|---------|------|----------|
| **{Module}DTO** | 상세 조회, 생성/수정 응답 | 모든 필드 (비밀번호 제외) |
| **{Module}SimpleDTO** | 목록 조회, 검색 결과 | 핵심 필드만 (idx, 이름, 부서 등) |
| **{Module}CreateDTO** | 생성 요청 | 입력 필드 + 유효성 검증 |
| **{Module}UpdateDTO** | 수정 요청 | 변경 가능 필드 (모두 nullable) |

---

## 호출 흐름

### 전체 요청 처리 흐름:

```
[HTTP 요청]
GET /api/users
    ↓
┌─────────────────────────────────────────────┐
│ UserController.getAllActiveUsers()          │
│ - @GetMapping                               │
│ - 요청 검증 및 파라미터 매핑                  │
└────────────────┬────────────────────────────┘
                 │ userService.getAllActiveUsers() 호출
                 │ (Interface 타입이지만 실제로는 Impl 실행)
┌────────────────▼────────────────────────────┐
│ UserServiceImpl.getAllActiveUsers()         │
│ - @Transactional(readOnly = true)          │
│ - 비즈니스 로직 수행                         │
└────────────────┬────────────────────────────┘
                 │ userRepository.findAllActive() 호출
┌────────────────▼────────────────────────────┐
│ UserRepository.findAllActive()              │
│ - @Query("SELECT u FROM User u WHERE ...")  │
│ - Spring Data JPA가 SQL 생성 및 실행        │
└────────────────┬────────────────────────────┘
                 │ List<User> 반환
┌────────────────▼────────────────────────────┐
│ UserMapper.toSimpleDTO(user)                │
│ - Entity → DTO 변환                         │
│ - 필요한 필드만 복사                         │
└────────────────┬────────────────────────────┘
                 │ List<UserSimpleDTO> 반환
┌────────────────▼────────────────────────────┐
│ UserController                              │
│ - ResponseEntity.ok(users) 반환             │
└─────────────────────────────────────────────┘
    ↓
[HTTP 응답]
200 OK
[{idx: 1, empName: "홍길동", ...}, ...]
```

### 코드 레벨 호출 흐름:

```java
// 1. Controller: 요청 받기
@GetMapping
public ResponseEntity<List<UserSimpleDTO>> getAllActiveUsers() {
    List<UserSimpleDTO> users = userService.getAllActiveUsers();
    return ResponseEntity.ok(users);
}

// 2. Service: 비즈니스 로직
@Override
@Transactional(readOnly = true)
public List<UserSimpleDTO> getAllActiveUsers() {
    return userRepository.findAllActive()     // DB 조회
            .stream()
            .map(userMapper::toSimpleDTO)     // 변환
            .collect(Collectors.toList());
}

// 3. Repository: DB 접근
@Query("SELECT u FROM User u WHERE u.deletedAt IS NULL")
List<User> findAllActive();
// → SQL: SELECT * FROM users WHERE deleted_at IS NULL

// 4. Mapper: Entity → DTO
public UserSimpleDTO toSimpleDTO(User user) {
    return UserSimpleDTO.builder()
            .idx(user.getIdx())
            .empName(user.getEmpName())
            .empDept(user.getEmpDept())
            .build();
}
```

---

## IntelliJ 코드 탐색 팁

### 문제: Ctrl+Click이 Interface로 이동

```java
// Controller에서
private final UserService userService;
//            ↑ Ctrl+Click
// → UserService.java (Interface) 열림
// → 구현체로 바로 이동 안 됨!
```

### 해결: 구현체로 이동하는 방법

#### 방법 1: Go to Implementation (추천)
```
1. UserService 위에 커서 놓기
2. Ctrl+Alt+B 누르기
   (Mac: Cmd+Option+B)
3. UserServiceImpl.java 열림
```

#### 방법 2: 왼쪽 아이콘 클릭
```
public interface UserService {
🟢  List<UserSimpleDTO> getAllActiveUsers();
↑ 이 아이콘 클릭 → 구현체로 이동
```

#### 방법 3: Navigate 메뉴
```
1. UserService 위에 커서
2. Navigate → Implementation(s) 클릭
```

### 유용한 단축키:

| 단축키 | 기능 | 설명 |
|-------|------|------|
| `Ctrl+Click` | Go to Declaration | 선언부로 이동 (Interface) |
| `Ctrl+Alt+B` | Go to Implementation | 구현체로 이동 (Impl) |
| `Ctrl+Alt+Left` | 이전 위치로 이동 | 탐색 히스토리 뒤로 |
| `Ctrl+Shift+F` | 전체 파일 검색 | 텍스트로 찾기 |
| `Ctrl+N` | 클래스 찾기 | 클래스명으로 파일 열기 |

---

## 새 모듈 추가 가이드

### Step 1: Entity 및 Repository 생성

```java
// 1. Entity 생성
// 위치: com.pinecni.erp.entity.Product.java
@Entity
@Table(name = "products")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idx;

    private String productName;
    private Integer price;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}

// 2. Repository 생성
// 위치: com.pinecni.erp.repository.ProductRepository.java
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByProductNameContaining(String name);
}
```

### Step 2: API 패키지 구조 생성

```
com.pinecni.erp.api.product/
├── controller/
├── service/
├── dto/
└── mapper/
```

### Step 3: DTO 작성

```java
// 위치: com.pinecni.erp.api.product.dto.ProductDTO.java
@Data
@Builder
public class ProductDTO {
    private Long idx;
    private String productName;
    private Integer price;
    private LocalDateTime createdAt;
}

// 위치: com.pinecni.erp.api.product.dto.ProductSimpleDTO.java
@Data
@Builder
public class ProductSimpleDTO {
    private Long idx;
    private String productName;
    private Integer price;
}

// 위치: com.pinecni.erp.api.product.dto.ProductCreateDTO.java
@Data
public class ProductCreateDTO {
    @NotBlank(message = "상품명은 필수입니다")
    private String productName;

    @Min(value = 0, message = "가격은 0 이상이어야 합니다")
    private Integer price;
}

// 위치: com.pinecni.erp.api.product.dto.ProductUpdateDTO.java
@Data
public class ProductUpdateDTO {
    private String productName;
    private Integer price;
}
```

### Step 4: Mapper 작성

```java
// 위치: com.pinecni.erp.api.product.mapper.ProductMapper.java
@Component
public class ProductMapper {

    public ProductDTO toDTO(Product product) {
        if (product == null) return null;
        return ProductDTO.builder()
                .idx(product.getIdx())
                .productName(product.getProductName())
                .price(product.getPrice())
                .createdAt(product.getCreatedAt())
                .build();
    }

    public ProductSimpleDTO toSimpleDTO(Product product) {
        if (product == null) return null;
        return ProductSimpleDTO.builder()
                .idx(product.getIdx())
                .productName(product.getProductName())
                .price(product.getPrice())
                .build();
    }

    public Product toEntity(ProductCreateDTO dto) {
        if (dto == null) return null;
        return Product.builder()
                .productName(dto.getProductName())
                .price(dto.getPrice())
                .createdAt(LocalDateTime.now())
                .build();
    }

    public void updateEntity(Product product, ProductUpdateDTO dto) {
        if (product == null || dto == null) return;
        if (dto.getProductName() != null) {
            product.setProductName(dto.getProductName());
        }
        if (dto.getPrice() != null) {
            product.setPrice(dto.getPrice());
        }
    }
}
```

### Step 5: Service Interface 작성

```java
// 위치: com.pinecni.erp.api.product.service.ProductService.java
public interface ProductService {

    /**
     * 전체 상품 목록 조회
     */
    List<ProductSimpleDTO> getAllProducts();

    /**
     * 상품 상세 조회
     */
    ProductDTO getProductById(Long idx);

    /**
     * 상품명 검색
     */
    List<ProductSimpleDTO> searchByName(String name);

    /**
     * 상품 생성
     */
    ProductDTO createProduct(ProductCreateDTO createDTO);

    /**
     * 상품 수정
     */
    ProductDTO updateProduct(Long idx, ProductUpdateDTO updateDTO);

    /**
     * 상품 삭제
     */
    void deleteProduct(Long idx);
}
```

### Step 6: Service Implementation 작성

```java
// 위치: com.pinecni.erp.api.product.service.ProductServiceImpl.java
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final ProductMapper productMapper;

    @Override
    public List<ProductSimpleDTO> getAllProducts() {
        log.debug("getAllProducts() called");
        return productRepository.findAll().stream()
                .map(productMapper::toSimpleDTO)
                .collect(Collectors.toList());
    }

    @Override
    public ProductDTO getProductById(Long idx) {
        log.debug("getProductById() called with idx: {}", idx);
        Product product = productRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다: " + idx));
        return productMapper.toDTO(product);
    }

    @Override
    public List<ProductSimpleDTO> searchByName(String name) {
        log.debug("searchByName() called with name: {}", name);
        return productRepository.findByProductNameContaining(name).stream()
                .map(productMapper::toSimpleDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ProductDTO createProduct(ProductCreateDTO createDTO) {
        log.debug("createProduct() called with name: {}", createDTO.getProductName());
        Product product = productMapper.toEntity(createDTO);
        Product savedProduct = productRepository.save(product);
        log.info("Product created successfully. idx: {}", savedProduct.getIdx());
        return productMapper.toDTO(savedProduct);
    }

    @Override
    @Transactional
    public ProductDTO updateProduct(Long idx, ProductUpdateDTO updateDTO) {
        log.debug("updateProduct() called with idx: {}", idx);
        Product product = productRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다: " + idx));
        productMapper.updateEntity(product, updateDTO);
        Product updatedProduct = productRepository.save(product);
        log.info("Product updated successfully. idx: {}", updatedProduct.getIdx());
        return productMapper.toDTO(updatedProduct);
    }

    @Override
    @Transactional
    public void deleteProduct(Long idx) {
        log.debug("deleteProduct() called with idx: {}", idx);
        Product product = productRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다: " + idx));
        productRepository.delete(product);
        log.info("Product deleted successfully. idx: {}", idx);
    }
}
```

### Step 7: Controller 작성

```java
// 위치: com.pinecni.erp.api.product.controller.ProductController.java
@Slf4j
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;  // Interface 타입으로 주입

    /**
     * 전체 상품 목록 조회
     * GET /api/products
     */
    @GetMapping
    public ResponseEntity<List<ProductSimpleDTO>> getAllProducts() {
        log.debug("GET /api/products - getAllProducts()");
        List<ProductSimpleDTO> products = productService.getAllProducts();
        return ResponseEntity.ok(products);
    }

    /**
     * 상품 상세 조회
     * GET /api/products/{idx}
     */
    @GetMapping("/{idx}")
    public ResponseEntity<ProductDTO> getProductById(@PathVariable Long idx) {
        log.debug("GET /api/products/{} - getProductById()", idx);
        ProductDTO product = productService.getProductById(idx);
        return ResponseEntity.ok(product);
    }

    /**
     * 상품명 검색
     * GET /api/products/search?name={name}
     */
    @GetMapping("/search")
    public ResponseEntity<List<ProductSimpleDTO>> searchByName(@RequestParam String name) {
        log.debug("GET /api/products/search?name={} - searchByName()", name);
        List<ProductSimpleDTO> products = productService.searchByName(name);
        return ResponseEntity.ok(products);
    }

    /**
     * 상품 생성
     * POST /api/products
     */
    @PostMapping
    public ResponseEntity<ProductDTO> createProduct(@Valid @RequestBody ProductCreateDTO createDTO) {
        log.debug("POST /api/products - createProduct() with name: {}", createDTO.getProductName());
        ProductDTO product = productService.createProduct(createDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(product);
    }

    /**
     * 상품 수정
     * PUT /api/products/{idx}
     */
    @PutMapping("/{idx}")
    public ResponseEntity<ProductDTO> updateProduct(
            @PathVariable Long idx,
            @Valid @RequestBody ProductUpdateDTO updateDTO) {
        log.debug("PUT /api/products/{} - updateProduct()", idx);
        ProductDTO product = productService.updateProduct(idx, updateDTO);
        return ResponseEntity.ok(product);
    }

    /**
     * 상품 삭제
     * DELETE /api/products/{idx}
     */
    @DeleteMapping("/{idx}")
    public ResponseEntity<Map<String, String>> deleteProduct(@PathVariable Long idx) {
        log.debug("DELETE /api/products/{} - deleteProduct()", idx);
        productService.deleteProduct(idx);
        Map<String, String> response = new HashMap<>();
        response.put("message", "상품이 삭제되었습니다.");
        return ResponseEntity.ok(response);
    }

    /**
     * Exception Handler
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn("IllegalArgumentException: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception e) {
        log.error("Unexpected error occurred", e);
        Map<String, String> error = new HashMap<>();
        error.put("error", "서버 오류가 발생했습니다.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
```

---

## 예제: User 모듈

현재 구현된 User 모듈은 이 패턴의 완벽한 예제입니다.

### 디렉토리 구조:
```
com.pinecni.erp.api.user/
├── controller/
│   └── UserController.java          (235 lines)
├── service/
│   ├── UserService.java             (89 lines - Interface)
│   └── UserServiceImpl.java         (238 lines - Implementation)
├── dto/
│   ├── UserDTO.java                 (전체 필드 18개)
│   ├── UserSimpleDTO.java           (핵심 필드 9개)
│   ├── UserCreateDTO.java           (입력 필드 + @Valid 검증)
│   └── UserUpdateDTO.java           (변경 가능 필드, 모두 nullable)
└── mapper/
    └── UserMapper.java              (Entity ↔ DTO 변환)

공통:
com.pinecni.erp.entity.User.java     (JPA Entity)
com.pinecni.erp.repository.UserRepository.java
```

### API 엔드포인트 (14개):

#### 조회 (9개)
- `GET /api/users` - 전체 활성 사용자 목록
- `GET /api/users/all` - 전체 사용자 (삭제 포함)
- `GET /api/users/{idx}` - 사용자 상세
- `GET /api/users/emp-id/{empId}` - 사번으로 조회
- `GET /api/users/email/{empEmail}` - 이메일로 조회
- `GET /api/users/dept/{empDept}` - 부서별 조회
- `GET /api/users/position/{empPosition}` - 직급별 조회
- `GET /api/users/status/{empStatus}` - 상태별 조회
- `GET /api/users/search?name={name}` - 이름 검색

#### 생성/수정/삭제 (3개)
- `POST /api/users` - 사용자 생성
- `PUT /api/users/{idx}` - 사용자 수정
- `DELETE /api/users/{idx}` - 사용자 삭제 (Soft Delete)

#### 기타 (2개)
- `POST /api/users/{idx}/restore` - 사용자 복구
- `GET /api/users/check/emp-id/{empId}` - 사번 중복 확인
- `GET /api/users/check/email/{empEmail}` - 이메일 중복 확인

### 주요 특징:

1. **Soft Delete 패턴**
   - `deletedAt`, `deletedUserIdx` 필드 사용
   - 물리 삭제 대신 논리 삭제
   - 복구 기능 제공

2. **비밀번호 해시**
   - SHA-256 해시 생성 (UserServiceImpl:222-237)
   - 평문 비밀번호는 DTO에만 존재

3. **감사 필드 (Audit Fields)**
   - `createdAt`, `createdUserIdx`
   - `updatedAt`, `updatedUserIdx`
   - 모든 생성/수정 시 자동 기록

4. **트랜잭션 관리**
   - 클래스 레벨: `@Transactional(readOnly = true)`
   - 쓰기 메서드: `@Transactional` (readOnly=false)

5. **예외 처리**
   - `IllegalArgumentException`: 400 Bad Request
   - `IllegalStateException`: 409 Conflict
   - `Exception`: 500 Internal Server Error

### 코드 참조:

```java
// Service Interface 예시 (UserService.java:13-89)
public interface UserService {
    List<UserSimpleDTO> getAllActiveUsers();
    UserDTO getUserById(Long idx);
    UserDTO createUser(UserCreateDTO createDTO, Long createdUserIdx);
    // ... 14개 메서드
}

// Service Implementation 예시 (UserServiceImpl.java:29-238)
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Override
    public List<UserSimpleDTO> getAllActiveUsers() {
        return userRepository.findAllActive().stream()
                .map(userMapper::toSimpleDTO)
                .collect(Collectors.toList());
    }
    // ... 구현
}

// Controller 예시 (UserController.java:26-234)
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;  // Interface 타입

    @GetMapping
    public ResponseEntity<List<UserSimpleDTO>> getAllActiveUsers() {
        List<UserSimpleDTO> users = userService.getAllActiveUsers();
        return ResponseEntity.ok(users);
    }
    // ... 14개 엔드포인트
}
```

---

## 코딩 컨벤션

### 1. 네이밍 규칙

| 타입 | 규칙 | 예시 |
|------|------|------|
| Interface | `{Module}Service` | `UserService` |
| Implementation | `{Module}ServiceImpl` | `UserServiceImpl` |
| Controller | `{Module}Controller` | `UserController` |
| DTO | `{Module}DTO`, `{Module}SimpleDTO` | `UserDTO`, `UserSimpleDTO` |
| Mapper | `{Module}Mapper` | `UserMapper` |
| Entity | `{Module}` | `User`, `Product` |
| Repository | `{Module}Repository` | `UserRepository` |

### 2. 어노테이션 순서

```java
// Service Implementation
@Slf4j                               // 1. Lombok 로깅
@Service                             // 2. Spring 스테레오타입
@RequiredArgsConstructor             // 3. Lombok 생성자 주입
@Transactional(readOnly = true)      // 4. 트랜잭션 (클래스 레벨)
public class UserServiceImpl implements UserService {
    // ...
}

// Controller
@Slf4j                               // 1. Lombok 로깅
@RestController                      // 2. Spring 컨트롤러
@RequestMapping("/api/users")        // 3. 기본 경로
@RequiredArgsConstructor             // 4. Lombok 생성자 주입
public class UserController {
    // ...
}
```

### 3. 메서드 순서

**Service/Controller:**
1. 조회 메서드 (GET)
2. 생성 메서드 (POST)
3. 수정 메서드 (PUT)
4. 삭제 메서드 (DELETE)
5. 유틸리티 메서드 (private)

### 4. 로깅 규칙

```java
// Controller: 엔드포인트 + 메서드명
log.debug("GET /api/users/{} - getUserById()", idx);

// Service: 메서드명 + 파라미터
log.debug("getUserById() called with idx: {}", idx);

// 성공 로그 (INFO)
log.info("User created successfully. idx: {}, empId: {}", idx, empId);

// 예외 로그 (WARN/ERROR)
log.warn("IllegalArgumentException: {}", e.getMessage());
log.error("Unexpected error occurred", e);
```

### 5. 트랜잭션 규칙

```java
// 클래스 레벨: readOnly=true (조회용)
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    // 조회 메서드는 별도 어노테이션 불필요
    public UserDTO getUserById(Long idx) { ... }

    // 쓰기 메서드만 @Transactional 오버라이드
    @Override
    @Transactional  // readOnly=false (기본값)
    public UserDTO createUser(UserCreateDTO createDTO) { ... }
}
```

---

## 참고 자료

- [CLAUDE.md](../../../../../CLAUDE.md) - 전체 프로젝트 구조
- [Spring Data JPA 공식 문서](https://spring.io/projects/spring-data-jpa)
- [Spring Web MVC 공식 문서](https://docs.spring.io/spring-framework/reference/web/webmvc.html)

---

## 문서 업데이트

- **작성일**: 2025-10-28
- **최종 수정**: 2025-10-28
- **작성자**: Development Team
- **버전**: 1.0
