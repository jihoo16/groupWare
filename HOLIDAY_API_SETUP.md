# 공휴일 API 설정 가이드

대한민국 공휴일 데이터를 자동으로 로드하는 기능이 구현되었습니다.

## ✅ 안전 모드

**아무 설정 없이도 바로 동작합니다!**
- ❌ API Key 없어도 OK → 기본 공휴일 데이터 자동 사용
- ❌ 테이블 없어도 OK → Fallback 데이터 자동 반환
- ❌ DB 오류나도 OK → 예외 처리로 애플리케이션 정상 실행

더 정확한 데이터를 원하시면 아래 설정을 따라하세요.

## 📁 생성된 파일 구조

```
src/main/java/com/pinecni/erp/api/calendar/
├── entity/
│   └── Holiday.java              # 공휴일 엔티티
├── repository/
│   └── HolidayRepository.java    # 공휴일 Repository
├── service/
│   └── HolidayService.java       # 공휴일 Service (API 연동)
├── controller/
│   └── HolidayController.java    # 공휴일 REST API Controller
└── dto/
    └── HolidayDto.java           # 공휴일 DTO

src/main/resources/
├── application.properties         # API Key 설정 추가
└── static/js/
    └── calendar.js               # 공휴일 로드 기능 추가
```

## 🔑 공공데이터포털 API Key 발급

1. **공공데이터포털 회원가입**
   - https://www.data.go.kr 접속
   - 회원가입 및 로그인

2. **API 신청**
   - 검색창에 "특일 정보" 검색
   - "한국천문연구원_특일 정보" 선택
   - "활용신청" 버튼 클릭
   - 신청 목적 입력 후 신청

3. **API Key 확인**
   - 마이페이지 → 오픈API → 개발계정
   - 신청한 API의 "인증키(Encoding)" 복사

4. **application.properties 설정**
   ```properties
   # 발급받은 API Key를 아래에 입력
   holiday.api.key=YOUR_ACTUAL_API_KEY_HERE
   holiday.api.url=http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo
   ```

## 🗄️ 데이터베이스 테이블 생성 (선택사항)

**방법 1: 자동 생성 (권장 - 이미 설정됨)**

`application.properties`에 이미 설정되어 있습니다:
```properties
spring.jpa.hibernate.ddl-auto=update
```
애플리케이션 실행 시 자동으로 테이블이 생성됩니다!

**방법 2: 수동 생성**

PostgreSQL에서 다음 SQL을 실행하세요:

```sql
-- 공휴일 테이블 생성
CREATE TABLE IF NOT EXISTS erp.holiday (
    id BIGSERIAL PRIMARY KEY,
    holiday_date DATE NOT NULL UNIQUE,
    holiday_name VARCHAR(100) NOT NULL,
    holiday_type VARCHAR(50),
    is_lunar BOOLEAN,
    year INTEGER,
    remark VARCHAR(500)
);

-- 인덱스 생성
CREATE INDEX idx_holiday_date ON erp.holiday(holiday_date);
CREATE INDEX idx_holiday_year ON erp.holiday(year);

-- 코멘트 추가
COMMENT ON TABLE erp.holiday IS '공휴일 정보';
COMMENT ON COLUMN erp.holiday.holiday_date IS '공휴일 날짜';
COMMENT ON COLUMN erp.holiday.holiday_name IS '공휴일 이름';
COMMENT ON COLUMN erp.holiday.holiday_type IS '공휴일 구분 (법정공휴일, 대체공휴일 등)';
COMMENT ON COLUMN erp.holiday.is_lunar IS '음력 여부';
COMMENT ON COLUMN erp.holiday.year IS '년도';
COMMENT ON COLUMN erp.holiday.remark IS '비고';
```

## 🚀 사용 방법

### 1. 자동 로드 (권장)

캘린더 페이지를 열면 자동으로 해당 년도의 공휴일을 로드합니다.
- 데이터가 없으면 자동으로 API에서 가져옵니다
- 데이터가 있으면 DB에서 조회합니다

### 2. 수동 업데이트 (API 사용)

**특정 년도 공휴일 가져오기:**
```bash
curl -X POST http://localhost:8080/api/calendar/holidays/fetch/2025
```

**응답 예시:**
```json
{
  "success": true,
  "year": 2025,
  "count": 19,
  "message": "2025년 공휴일 데이터가 업데이트되었습니다.",
  "holidays": [
    {
      "id": 1,
      "holidayDate": "2025-01-01",
      "holidayName": "신정",
      "holidayType": "법정공휴일",
      "isLunar": false,
      "year": 2025,
      "remark": null
    },
    ...
  ]
}
```

### 3. 공휴일 조회 API

**년도별 조회:**
```bash
curl http://localhost:8080/api/calendar/holidays/year/2025
```

**기간별 조회:**
```bash
curl "http://localhost:8080/api/calendar/holidays/range?startDate=2025-01-01&endDate=2025-12-31"
```

**특정 날짜가 공휴일인지 확인:**
```bash
curl "http://localhost:8080/api/calendar/holidays/check?date=2025-01-01"
```

**현재 년도 공휴일 조회:**
```bash
curl http://localhost:8080/api/calendar/holidays/current
```

## 🔧 API Key 없이 사용하기

API Key를 발급받지 않아도 기본 공휴일 데이터를 사용할 수 있습니다.

HolidayService의 `getFallbackHolidays()` 메서드에서:
- 고정 공휴일 (신정, 삼일절, 어린이날, 광복절, 개천절, 한글날, 크리스마스 등)
- 2025년 음력 공휴일 (설날, 추석, 부처님오신날 등)

이 자동으로 제공됩니다.

**주의:** 2025년 이외의 연도는 음력 공휴일이 다르므로,
`getFallbackHolidays()` 메서드에 해당 년도의 음력 공휴일을 추가해야 합니다.

## 🎨 캘린더에서 공휴일 표시

캘린더에서 공휴일은 다음과 같이 표시됩니다:
- 날짜 숫자가 빨간색으로 표시
- 공휴일 이름이 날짜 아래 작은 글씨로 표시
- 주말 배경색 적용

## 🐛 문제 해결

### API 호출 실패
- API Key가 올바른지 확인
- 공공데이터포털에서 API 승인 상태 확인
- 네트워크 연결 확인

### 데이터가 표시되지 않음
- 브라우저 개발자 도구(F12) → Console에서 오류 확인
- 데이터베이스 연결 상태 확인
- 테이블이 정상적으로 생성되었는지 확인

### 로그 확인
```bash
# 애플리케이션 로그에서 공휴일 관련 로그 확인
# 예시:
# 공휴일 데이터 가져오기 시작: 2025
# 공휴일 데이터 저장 완료: 19 건
```

## 📝 참고사항

- 공공데이터포털 API는 무료이며, 일일 호출 제한이 있습니다
- 공휴일 데이터는 년도별로 DB에 캐싱되므로, 반복 호출이 최소화됩니다
- 음력 공휴일(설날, 추석 등)은 매년 날짜가 다르므로 주의가 필요합니다
- API 사용이 어려운 경우 기본 제공되는 fallback 데이터를 사용할 수 있습니다

## 🛡️ 안전성 보장

코드는 다음과 같이 안전하게 작동합니다:

1. **API Key가 없는 경우**
   - API 호출 실패 → Fallback 데이터 자동 사용
   - 고정 공휴일 8개 + 2025년 음력 공휴일 자동 제공

2. **테이블이 없는 경우**
   - `spring.jpa.hibernate.ddl-auto=update`로 자동 생성
   - 또는 DB 조회 실패 시 Fallback 데이터 반환
   - 애플리케이션 에러 없이 정상 실행

3. **DB 오류 발생 시**
   - 모든 메서드에 try-catch 적용
   - 예외 발생 시 Fallback 데이터 또는 빈 배열 반환
   - 캘린더 페이지는 정상 작동

**결론: 아무것도 설정하지 않아도 기본 공휴일이 캘린더에 표시됩니다!**
