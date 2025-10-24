-- ============================================
-- 프로젝트 관리 모듈 DDL
-- ============================================

-- 1. 프로젝트 기본 정보 테이블
CREATE TABLE IF NOT EXISTS projects (
    project_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '프로젝트 ID',
    project_name VARCHAR(200) NOT NULL COMMENT '프로젝트명',
    client_name VARCHAR(200) COMMENT '발주사',
    project_manager_id BIGINT COMMENT '연구 책임자 ID (employees 테이블 참조)',
    start_date DATE NOT NULL COMMENT '시작일',
    end_date DATE NOT NULL COMMENT '종료일',
    project_status VARCHAR(20) NOT NULL DEFAULT 'PLANNING' COMMENT '프로젝트 상태 (PLANNING: 기획, IN_PROGRESS: 진행중, COMPLETED: 완료, ON_HOLD: 보류, CANCELLED: 취소)',
    progress_rate INT DEFAULT 0 COMMENT '진행률 (0-100)',
    description TEXT COMMENT '프로젝트 설명',
    receipt_url VARCHAR(500) COMMENT '영수증 등록 페이지 URL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    created_by BIGINT COMMENT '생성자 ID',
    updated_by BIGINT COMMENT '수정자 ID',
    is_deleted BOOLEAN DEFAULT FALSE COMMENT '삭제 여부',
    INDEX idx_project_status (project_status),
    INDEX idx_project_manager (project_manager_id),
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='프로젝트 기본 정보';

-- 2. 프로젝트 참여연구원 테이블
CREATE TABLE IF NOT EXISTS project_members (
    member_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '참여연구원 ID',
    project_id BIGINT NOT NULL COMMENT '프로젝트 ID',
    employee_id BIGINT NOT NULL COMMENT '직원 ID (employees 테이블 참조)',
    participation_start_date DATE NOT NULL COMMENT '참여 시작일',
    participation_end_date DATE COMMENT '참여 종료일',
    role VARCHAR(100) COMMENT '역할',
    is_active BOOLEAN DEFAULT TRUE COMMENT '활동 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    INDEX idx_project (project_id),
    INDEX idx_employee (employee_id),
    INDEX idx_dates (participation_start_date, participation_end_date),
    UNIQUE KEY uk_project_employee (project_id, employee_id, participation_start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='프로젝트 참여연구원';

-- 3. 연구비 카드 테이블
CREATE TABLE IF NOT EXISTS research_cards (
    card_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '카드 ID',
    project_id BIGINT NOT NULL COMMENT '프로젝트 ID',
    card_company VARCHAR(50) NOT NULL COMMENT '카드사명',
    card_last_digits CHAR(4) NOT NULL COMMENT '카드 뒷 4자리',
    card_nickname VARCHAR(100) COMMENT '카드 별칭',
    is_active BOOLEAN DEFAULT TRUE COMMENT '사용 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    created_by BIGINT COMMENT '등록자 ID',
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    INDEX idx_project (project_id),
    INDEX idx_card_company (card_company),
    INDEX idx_card_digits (card_last_digits)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='연구비 카드';

-- 4. 연계 프로젝트 테이블
CREATE TABLE IF NOT EXISTS project_relations (
    relation_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '연계 ID',
    source_project_id BIGINT NOT NULL COMMENT '소스 프로젝트 ID',
    target_project_id BIGINT NOT NULL COMMENT '연계 프로젝트 ID',
    relation_type VARCHAR(50) DEFAULT 'RELATED' COMMENT '연계 유형 (RELATED: 관련, PARENT: 상위, CHILD: 하위)',
    description VARCHAR(500) COMMENT '연계 설명',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
    FOREIGN KEY (source_project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (target_project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    INDEX idx_source_project (source_project_id),
    INDEX idx_target_project (target_project_id),
    UNIQUE KEY uk_project_relation (source_project_id, target_project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='연계 프로젝트';

-- 5. 프로젝트별 직급별 경비 설정 테이블
CREATE TABLE IF NOT EXISTS project_expense_settings (
    setting_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '설정 ID',
    project_id BIGINT NOT NULL COMMENT '프로젝트 ID',
    position_code VARCHAR(20) NOT NULL COMMENT '직급 코드 (positions 테이블 참조)',
    position_name VARCHAR(50) NOT NULL COMMENT '직급명',
    daily_allowance INT DEFAULT 0 COMMENT '출장 일비',
    meal_allowance INT DEFAULT 0 COMMENT '출장 식비',
    meeting_allowance INT DEFAULT 0 COMMENT '회의비',
    overtime_meal_allowance INT DEFAULT 0 COMMENT '야근 식대',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    INDEX idx_project (project_id),
    INDEX idx_position (position_code),
    UNIQUE KEY uk_project_position (project_id, position_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='프로젝트별 직급별 경비 설정';

-- 6. 프로젝트 첨부 파일 테이블
CREATE TABLE IF NOT EXISTS project_files (
    file_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '파일 ID',
    project_id BIGINT NOT NULL COMMENT '프로젝트 ID',
    original_filename VARCHAR(255) NOT NULL COMMENT '원본 파일명',
    stored_filename VARCHAR(255) NOT NULL COMMENT '저장된 파일명',
    file_path VARCHAR(500) NOT NULL COMMENT '파일 경로',
    file_size BIGINT NOT NULL COMMENT '파일 크기 (bytes)',
    file_type VARCHAR(100) COMMENT '파일 유형 (MIME type)',
    file_category VARCHAR(50) DEFAULT 'GENERAL' COMMENT '파일 분류 (GENERAL: 일반, PROPOSAL: 기획서, DESIGN: 디자인, REPORT: 보고서)',
    description VARCHAR(500) COMMENT '파일 설명',
    uploaded_by BIGINT COMMENT '업로드자 ID',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '업로드일시',
    is_deleted BOOLEAN DEFAULT FALSE COMMENT '삭제 여부',
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    INDEX idx_project (project_id),
    INDEX idx_uploaded_at (uploaded_at),
    INDEX idx_file_category (file_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='프로젝트 첨부 파일';

-- 7. 프로젝트 진행 이력 테이블 (선택사항 - 변경 이력 추적용)
CREATE TABLE IF NOT EXISTS project_history (
    history_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '이력 ID',
    project_id BIGINT NOT NULL COMMENT '프로젝트 ID',
    action_type VARCHAR(50) NOT NULL COMMENT '액션 유형 (CREATE: 생성, UPDATE: 수정, STATUS_CHANGE: 상태변경, DELETE: 삭제)',
    previous_status VARCHAR(20) COMMENT '이전 상태',
    new_status VARCHAR(20) COMMENT '새 상태',
    previous_progress INT COMMENT '이전 진행률',
    new_progress INT COMMENT '새 진행률',
    change_description TEXT COMMENT '변경 내용',
    changed_by BIGINT COMMENT '변경자 ID',
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '변경일시',
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    INDEX idx_project (project_id),
    INDEX idx_changed_at (changed_at),
    INDEX idx_action_type (action_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='프로젝트 진행 이력';

-- ============================================
-- 기초정보관리 참조 테이블 (이미 존재한다고 가정)
-- ============================================
-- 아래 테이블들은 이미 기초정보관리 모듈에서 생성되어 있어야 함

-- 직급 테이블 (참조용 - 실제로는 별도 파일에 존재)
CREATE TABLE IF NOT EXISTS positions (
    position_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '직급 ID',
    position_code VARCHAR(20) NOT NULL UNIQUE COMMENT '직급 코드',
    position_name VARCHAR(50) NOT NULL COMMENT '직급명',
    position_order INT NOT NULL COMMENT '직급 순서',
    salary_grade VARCHAR(20) COMMENT '급여 등급',
    is_active BOOLEAN DEFAULT TRUE COMMENT '사용 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    INDEX idx_position_code (position_code),
    INDEX idx_position_order (position_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='직급 정보';

-- 부서 테이블 (참조용 - 실제로는 별도 파일에 존재)
CREATE TABLE IF NOT EXISTS departments (
    department_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '부서 ID',
    department_code VARCHAR(20) NOT NULL UNIQUE COMMENT '부서 코드',
    department_name VARCHAR(100) NOT NULL COMMENT '부서명',
    parent_department_id BIGINT COMMENT '상위 부서 ID',
    department_order INT NOT NULL COMMENT '정렬 순서',
    is_active BOOLEAN DEFAULT TRUE COMMENT '사용 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    FOREIGN KEY (parent_department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
    INDEX idx_department_code (department_code),
    INDEX idx_parent_department (parent_department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='부서 정보';

-- 직원 테이블 (참조용 - 실제로는 인사 관리 모듈에 존재)
CREATE TABLE IF NOT EXISTS employees (
    employee_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '직원 ID',
    employee_number VARCHAR(20) NOT NULL UNIQUE COMMENT '사번',
    name VARCHAR(50) NOT NULL COMMENT '이름',
    name_eng VARCHAR(100) COMMENT '영문명',
    email VARCHAR(100) COMMENT '이메일',
    phone VARCHAR(20) COMMENT '전화번호',
    mobile VARCHAR(20) COMMENT '휴대폰',
    department_id BIGINT COMMENT '부서 ID',
    position_id BIGINT COMMENT '직급 ID',
    hire_date DATE COMMENT '입사일',
    resignation_date DATE COMMENT '퇴사일',
    employment_status VARCHAR(20) DEFAULT 'ACTIVE' COMMENT '재직 상태 (ACTIVE: 재직, RESIGNED: 퇴사, ON_LEAVE: 휴직)',
    is_active BOOLEAN DEFAULT TRUE COMMENT '활성 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
    FOREIGN KEY (position_id) REFERENCES positions(position_id) ON DELETE SET NULL,
    INDEX idx_employee_number (employee_number),
    INDEX idx_department (department_id),
    INDEX idx_position (position_id),
    INDEX idx_employment_status (employment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='직원 정보';

-- 기본 경비 설정 테이블 (참조용 - 기초정보관리 모듈)
CREATE TABLE IF NOT EXISTS default_expense_settings (
    setting_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '설정 ID',
    position_code VARCHAR(20) NOT NULL UNIQUE COMMENT '직급 코드',
    position_name VARCHAR(50) NOT NULL COMMENT '직급명',
    daily_allowance INT DEFAULT 0 COMMENT '출장 일비',
    meal_allowance INT DEFAULT 0 COMMENT '출장 식비',
    meeting_allowance INT DEFAULT 0 COMMENT '회의비',
    overtime_meal_allowance INT DEFAULT 0 COMMENT '야근 식대',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    INDEX idx_position (position_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='직급별 기본 경비 설정';
