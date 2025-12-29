package com.pinecni.erp.api.calendar.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.time.LocalDate;
import java.util.*;

/**
 * 공휴일 Service
 * Google Calendar API + Fallback 방식
 */
@Service
@Slf4j
public class HolidayService {

    private final RestTemplate restTemplate;

    @Value("${google.calendar.api.key:}")
    private String googleApiKey;

    // Already URL-encoded Calendar ID
    private static final String CALENDAR_ID_ENCODED = "ko.south_korea%23holiday%40group.v.calendar.google.com";
    private static final String CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3/calendars/";

    // 제외할 기념일 키워드 (법정 공휴일 아님)
    private static final List<String> EXCLUDED_KEYWORDS = List.of(
        "크리스마스 이브", "섣달 그믐날", "국군의날", "어버이날",
        "노동절", "스승의날", "식목일", "제헌절"
    );

    public HolidayService() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * 특정 년도 공휴일 조회 (캐시됨)
     */
    @Cacheable(value = "holidays", key = "#year")
    public Map<String, String> getHolidaysByYear(int year) {
        log.info("{}년 공휴일 데이터 로드 시작", year);

        try {
            // 1순위: Google Calendar API
            return fetchFromGoogleCalendarByYear(year);
        } catch (Exception e) {
            log.warn("{}년 Google Calendar API 실패, Fallback 데이터 사용: {}", year, e.getMessage());
            // 2순위: Fallback 데이터
            return getFallbackHolidaysByYear(year);
        }
    }

    /**
     * 모든 공휴일 조회 (캐시됨)
     * @deprecated 년도별 조회(getHolidaysByYear) 사용 권장
     */
    @Cacheable(value = "holidays", key = "'all'")
    public Map<String, String> getAllHolidays() {
        log.info("전체 공휴일 데이터 로드 시작");

        try {
            // 1순위: Google Calendar API
            return fetchFromGoogleCalendar();
        } catch (Exception e) {
            log.warn("Google Calendar API 실패, Fallback 데이터 사용: {}", e.getMessage());
            // 2순위: Fallback 데이터
            return getFallbackHolidays();
        }
    }

    /**
     * Google Calendar API에서 특정 년도 공휴일 가져오기
     */
    private Map<String, String> fetchFromGoogleCalendarByYear(int year) {
        if (googleApiKey == null || googleApiKey.isEmpty()) {
            log.warn("Google API Key가 설정되지 않음, Fallback 사용");
            return getFallbackHolidaysByYear(year);
        }

        try {
            Map<String, String> holidays = new HashMap<>();
            String timeMin = year + "-01-01T00:00:00Z";
            String timeMax = year + "-12-31T23:59:59Z";

            // Build URL string with already-encoded calendar ID
            String urlString = CALENDAR_API_BASE + CALENDAR_ID_ENCODED + "/events" +
                "?key=" + googleApiKey +
                "&timeMin=" + timeMin +
                "&timeMax=" + timeMax +
                "&singleEvents=true" +
                "&orderBy=startTime";

            // Create URI object to prevent RestTemplate from re-encoding
            URI uri = URI.create(urlString);

            log.debug("Requesting Google Calendar API for year {}", year);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(uri, Map.class);

            if (response != null && response.containsKey("items")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");

                for (Map<String, Object> item : items) {
                    String summary = (String) item.get("summary");
                    @SuppressWarnings("unchecked")
                    Map<String, Object> start = (Map<String, Object>) item.get("start");
                    String date = (String) start.get("date");

                    if (date != null && summary != null) {
                        // 제외 키워드 체크 (기념일 필터링)
                        boolean shouldExclude = EXCLUDED_KEYWORDS.stream()
                            .anyMatch(summary::contains);

                        if (!shouldExclude) {
                            // 공휴일 이름 정리
                            String cleanedName = cleanHolidayName(summary);
                            holidays.put(date, cleanedName);
                        } else {
                            log.debug("{}년 기념일 제외: {} - {}", year, date, summary);
                        }
                    }
                }
            }

            log.info("{}년 Google Calendar API에서 {} 건의 공휴일 로드 완료", year, holidays.size());
            return holidays;

        } catch (Exception e) {
            log.error("{}년 Google Calendar API 호출 실패: {}", year, e.getMessage());
            throw e;
        }
    }

    /**
     * Google Calendar API에서 공휴일 가져오기 (전체 년도)
     * @deprecated 년도별 조회 사용 권장
     */
    private Map<String, String> fetchFromGoogleCalendar() {
        log.warn("전체 년도 조회는 deprecated되었습니다. 년도별 조회를 사용하세요.");

        // 현재 년도 기준 전후 5년치만 로드 (동적)
        int currentYear = LocalDate.now().getYear();
        Map<String, String> allHolidays = new HashMap<>();

        for (int year = currentYear - 5; year <= currentYear + 5; year++) {
            try {
                Map<String, String> yearHolidays = fetchFromGoogleCalendarByYear(year);
                allHolidays.putAll(yearHolidays);
            } catch (Exception e) {
                log.warn("{}년 공휴일 로드 실패, 계속 진행", year);
            }
        }

        return allHolidays;
    }

    /**
     * 특정 년도 Fallback 공휴일 데이터
     */
    private Map<String, String> getFallbackHolidaysByYear(int year) {
        log.info("{}년 Fallback 공휴일 데이터 사용", year);
        Map<String, String> holidays = new HashMap<>();

        // 고정 공휴일 추가
        addFixedHolidays(holidays, year);

        // 음력 공휴일 (2024-2026년만 수동 추가)
        if (year == 2024) {
            addLunarHolidays2024(holidays);
        } else if (year == 2025) {
            addLunarHolidays2025(holidays);
        } else if (year == 2026) {
            addLunarHolidays2026(holidays);
        }

        log.info("{}년 Fallback 데이터 {} 건 생성", year, holidays.size());
        return holidays;
    }

    /**
     * Fallback 공휴일 데이터 (법정공휴일 + 최근 년도 음력 공휴일)
     * @deprecated 년도별 조회 사용 권장
     */
    private Map<String, String> getFallbackHolidays() {
        log.info("전체 Fallback 공휴일 데이터 사용");
        Map<String, String> holidays = new HashMap<>();

        // 2018-2030년까지 고정 공휴일 추가
        for (int year = 2018; year <= 2030; year++) {
            addFixedHolidays(holidays, year);
        }

        // 음력 공휴일 (2024-2026년만 수동 추가)
        addLunarHolidays2024(holidays);
        addLunarHolidays2025(holidays);
        addLunarHolidays2026(holidays);

        log.info("Fallback 데이터 {} 건 생성", holidays.size());
        return holidays;
    }

    /**
     * 고정 공휴일 추가 (매년 동일)
     */
    private void addFixedHolidays(Map<String, String> holidays, int year) {
        holidays.put(year + "-01-01", "신정");
        holidays.put(year + "-03-01", "삼일절");
        holidays.put(year + "-05-05", "어린이날");
        holidays.put(year + "-06-06", "현충일");
        holidays.put(year + "-08-15", "광복절");
        holidays.put(year + "-10-03", "개천절");
        holidays.put(year + "-10-09", "한글날");
        holidays.put(year + "-12-25", "크리스마스");
    }

    /**
     * 2024년 음력 공휴일
     */
    private void addLunarHolidays2024(Map<String, String> holidays) {
        holidays.put("2024-02-09", "설날 전날");
        holidays.put("2024-02-10", "설날");
        holidays.put("2024-02-11", "설날 다음 날");
        holidays.put("2024-02-12", "대체공휴일");
        holidays.put("2024-04-10", "제22대 국회의원 선거일");
        holidays.put("2024-05-06", "대체공휴일");
        holidays.put("2024-05-15", "부처님 오신 날");
        holidays.put("2024-09-16", "추석 전날");
        holidays.put("2024-09-17", "추석");
        holidays.put("2024-09-18", "추석 다음 날");
    }

    /**
     * 2025년 음력 공휴일
     */
    private void addLunarHolidays2025(Map<String, String> holidays) {
        holidays.put("2025-01-27", "임시공휴일");
        holidays.put("2025-01-28", "설날 전날");
        holidays.put("2025-01-29", "설날");
        holidays.put("2025-01-30", "설날 다음 날");
        holidays.put("2025-03-03", "대체공휴일");
        holidays.put("2025-05-05", "부처님 오신 날");
        holidays.put("2025-05-06", "대체공휴일");
        holidays.put("2025-06-03", "임시공휴일");
        holidays.put("2025-10-05", "추석 전날");
        holidays.put("2025-10-06", "추석");
        holidays.put("2025-10-07", "추석 다음 날");
        holidays.put("2025-10-08", "대체공휴일");
    }

    /**
     * 2026년 음력 공휴일 (예상)
     */
    private void addLunarHolidays2026(Map<String, String> holidays) {
        holidays.put("2026-02-16", "설날 전날");
        holidays.put("2026-02-17", "설날");
        holidays.put("2026-02-18", "설날 다음 날");
        holidays.put("2026-05-24", "부처님 오신 날");
        holidays.put("2026-05-25", "대체공휴일");
        holidays.put("2026-09-24", "추석 전날");
        holidays.put("2026-09-25", "추석");
        holidays.put("2026-09-26", "추석 다음 날");
    }

    /**
     * 공휴일 이름 정리
     */
    private String cleanHolidayName(String name) {
        if (name == null) return name;

        // "쉬는 날 XXX" → "XXX (대체공휴일)"
        if (name.startsWith("쉬는 날 ")) {
            String baseName = name.substring(5).trim();
            return baseName + " (대체공휴일)";
        }

        // "새해첫날" → "신정"
        if (name.equals("새해첫날")) {
            return "신정";
        }

        // "기독탄신일" → "크리스마스" (이미 필터링에서 처리했지만 혹시 몰라서)
        if (name.equals("기독탄신일")) {
            return "크리스마스";
        }

        return name;
    }

    /**
     * 특정 날짜가 공휴일인지 확인
     */
    public boolean isHoliday(LocalDate date) {
        Map<String, String> holidays = getAllHolidays();
        String dateStr = date.toString();
        return holidays.containsKey(dateStr);
    }

    /**
     * 특정 날짜의 공휴일 이름 가져오기
     */
    public String getHolidayName(LocalDate date) {
        Map<String, String> holidays = getAllHolidays();
        return holidays.get(date.toString());
    }
}
