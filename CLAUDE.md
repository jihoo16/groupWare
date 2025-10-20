# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Spring Boot 3.5.6 ERP application implementing 12 functional modules for HR and organizational management. The project uses Java 17, Maven, Thymeleaf templates, and vanilla JavaScript. Currently, the frontend UI is fully implemented with all templates and client-side logic, while the backend service and data access layers are in early stages.

## Build and Development Commands

### Build and Run
```bash
# Clean and build the project
mvn clean install

# Run the application
mvn spring-boot:run

# Run with specific profile (when available)
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Testing
```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=ClassName

# Run tests with coverage
mvn clean test jacoco:report
```

### Development
- Application runs on `http://localhost:8080`
- H2 Console (development): `http://localhost:8080/h2-console`
  - JDBC URL: `jdbc:h2:mem:erpdb`
  - Username: `sa`
  - Password: (empty)
- Spring Boot DevTools enabled for hot reload
- Thymeleaf caching disabled in development

## Architecture

### Current Implementation Status

**✓ Fully Implemented:**
- Frontend UI (16 Thymeleaf templates with fragments)
- Client-side logic (15 JavaScript modules)
- Styling (15 CSS modules + common styles)
- Page routing (HomeController)
- Configuration structure

**⚠ Not Yet Implemented:**
- Entity models and JPA repositories
- Service layer business logic
- REST API endpoints
- Authentication/authorization
- Data persistence layer

### MVC Architecture Pattern

```
Frontend Layer (Thymeleaf + Vanilla JS)
    ↓
Controller Layer (HomeController - page routing only)
    ↓ [Future: Service Layer]
Service Layer (Business Logic - TO BE IMPLEMENTED)
    ↓ [Future: Repository Layer]
Data Access Layer (JPA Repositories - TO BE IMPLEMENTED)
    ↓
Database (H2 dev / PostgreSQL production)
```

### Module Organization (12 Functional Modules)

1. **Approval (전자결재)** - Multi-state document workflow with 8 types
2. **HR Management (인사 관리)** - Employee CRUD with department filtering
3. **Vacation (연차 관리)** - Leave balance and request management
4. **Organization (조직도)** - Hierarchical employee tree
5. **Attendance (근태 관리)** - Clock in/out with BIO star2 integration
6. **Calendar (일정관리)** - Event management with participants
7. **Payroll (급여 관리)** - Monthly salary processing
8. **Messenger (메신저)** - Chat rooms and message history
9. **Email (메일)** - Multi-folder email management
10. **Board (게시판)** - Announcements with pagination
11. **Cloud (클라우드)** - File storage with NAS integration
12. **Settings (설정)** - User profile and preferences

### Package Structure Convention

When implementing backend components, follow this structure:

```
src/main/java/com/pinecni/erp/
├── controller/          # Controllers (HomeController exists)
├── service/            # Business logic (TO BE CREATED)
├── repository/         # JPA repositories (TO BE CREATED)
├── entity/            # JPA entities (TO BE CREATED)
├── dto/               # Data transfer objects (TO BE CREATED)
├── config/            # Configuration classes (TO BE CREATED)
└── ErpApplication.java # Main application class
```

### Frontend Structure

```
src/main/resources/
├── templates/
│   ├── fragments/
│   │   ├── layout.html      # Common <head> section
│   │   └── sidebar.html     # Navigation sidebar
│   ├── home.html            # Dashboard
│   ├── approval.html        # Approval list
│   ├── approval-write.html  # Document composition
│   └── [13 other module templates]
├── static/
│   ├── css/
│   │   ├── home.css         # Global layout and sidebar
│   │   ├── common-modal.css # Shared modal components
│   │   └── [15 module-specific CSS files]
│   └── js/
│       ├── common.js        # Sidebar interactions
│       ├── common-modal.js  # Modal handling
│       └── [15 module-specific JS files]
└── application.properties
```

### Template Pattern Convention

All templates follow this structure:

```html
<head th:replace="fragments/layout :: head('Page Title', '/css/module.css')"></head>
<div th:replace="fragments/sidebar :: sidebar('module-name')"></div>
<main class="main-content">
    <!-- Module content -->
</main>
<script th:src="@{/js/module.js}"></script>
```

### JavaScript Module Pattern

Each module JavaScript file follows:

```javascript
document.addEventListener('DOMContentLoaded', function() {
    // DOM element selection
    // Event listener attachment
    // Initialization logic
});
```

## Database Configuration

### Development (H2)
- In-memory database configured in `application.properties`
- JPA DDL auto: `update`
- SQL logging enabled with formatting
- No data persistence between restarts

### Production (PostgreSQL)
- PostgreSQL driver included in dependencies
- Switch by updating `application.properties`:
  - `spring.datasource.url`
  - `spring.datasource.driverClassName`
  - `spring.jpa.properties.hibernate.dialect`

## Key Implementation Notes

### When Adding Backend Logic

1. **Entity Creation**: Use JPA annotations with Lombok for entity classes
   - Place in `com.pinecni.erp.entity`
   - Use `@Entity`, `@Table`, `@Id`, `@GeneratedValue`
   - Leverage Lombok: `@Data`, `@NoArgsConstructor`, `@AllArgsConstructor`

2. **Repository Layer**: Extend `JpaRepository<Entity, ID>`
   - Place in `com.pinecni.erp.repository`
   - Use method naming conventions for queries

3. **Service Layer**: Implement business logic
   - Place in `com.pinecni.erp.service`
   - Annotate with `@Service`
   - Inject repositories with constructor injection

4. **Controller Updates**: Add data-handling endpoints
   - Update `HomeController.java` or create module-specific controllers
   - Use `@GetMapping`, `@PostMapping`, etc.
   - Return data to Thymeleaf via `Model` or as REST with `@ResponseBody`

### Frontend Integration Points

- Approval module: 8 document types with multi-state workflow (대기, 진행중, 완료, 반려)
- HR module: Employee data includes 14+ fields (name, department, position, phone, email, etc.)
- Attendance module: BIO star2 fingerprint device integration expected
- Cloud module: NAS storage integration (server path: 192.168.0.221, user: pinecni)
- Calendar module: Multi-day events with participant tracking

### UI Component Patterns

- **Modals**: Use structure from `common-modal.css` (header/body/footer pattern)
- **Status Badges**: Color-coded spans with classes (e.g., `.status-pending`, `.status-approved`)
- **Filters**: Client-side filtering via `data-*` attributes on table rows
- **Sidebar**: Auto-collapses to 70px, expands to 250px on hover

## Configuration Details

### File Upload
- Max file size: 50MB
- Max request size: 50MB

### Timezone
- Application timezone: Asia/Seoul
- JSON date serialization: ISO-8601 format (not timestamps)

### Logging
- Application code: DEBUG level
- Spring Web: DEBUG level
- Hibernate SQL: DEBUG with formatting

## Dependencies

Key libraries (see `pom.xml` for versions):
- Spring Boot 3.5.6 (Web, Thymeleaf, Data JPA, Validation)
- Java 17
- Lombok (annotation processing configured)
- Jackson with Java 8 time support
- H2 Database (runtime)
- PostgreSQL (runtime)
- Commons Lang3

## Common Development Patterns

### Thymeleaf Expressions
- URL expressions: `@{/path}`
- Fragment replacement: `th:replace="fragments/name :: fragment"`
- Attribute setting: `th:href`, `th:src`, `th:text`

### Lombok Usage
- Entity boilerplate reduction
- Maven compiler plugin configured with annotation processor path
- Excluded from final JAR via Spring Boot plugin

### State Management
- Client-side: DOM `data-*` attributes for filters and state
- Future server-side: Session or Spring Security context for user state