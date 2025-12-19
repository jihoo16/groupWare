package com.pinecni.erp.api.calendar.service;

import com.pinecni.erp.api.calendar.dto.HolidayDto;
import com.pinecni.erp.api.calendar.entity.Holiday;
import com.pinecni.erp.api.calendar.repository.HolidayRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * 공휴일 Service
 * 공공데이터포털 한국천문연구원 특일 정보 API 연동
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HolidayService {

    private final HolidayRepository holidayRepository;
    private final RestTemplate restTemplate;

    @Value("${holiday.api.key:YOUR_API_KEY}")
    private String apiKey;

    @Value("${holiday.api.url:http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo}")
    private String apiUrl;

    /**
     * 공공데이터포털 API를 통해 특정 년도의 공휴일 데이터 가져오기
     */
    @Transactional
    public List<HolidayDto> fetchAndSaveHolidays(Integer year) {
        log.info("공휴일 데이터 가져오기 시작: {}", year);

        try {
            // API 호출
            String url = String.format("%s?serviceKey=%s&solYear=%d&numOfRows=100",
                    apiUrl, apiKey, year);
            log.info("공공데이터 > 공휴일 조회 API. 조회 연도 >>>> {} ", year);

            String response = restTemplate.getForObject(url, String.class);

            if (response == null || response.isEmpty()) {
                log.warn("API 응답이 비어있습니다.");
                return getFallbackHolidays(year);
            }

            // XML 파싱
            List<Holiday> holidays = parseHolidayXml(response, year);

            // 기존 해당 년도 데이터 삭제
            holidayRepository.deleteByYear(year);

            // 새로운 데이터 저장
            List<Holiday> savedHolidays = holidayRepository.saveAll(holidays);

            log.info("공휴일 데이터 저장 완료: {} 건", savedHolidays.size());

            return savedHolidays.stream()
                    .map(this::convertToDto)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("공휴일 데이터 가져오기 실패: {}", e.getMessage(), e);

            // API 실패 시 기본 공휴일 데이터 사용
            return getFallbackHolidays(year);
        }
    }

    /**
     * XML 응답 파싱
     */
    private List<Holiday> parseHolidayXml(String xmlResponse, Integer year) throws Exception {
        List<Holiday> holidays = new ArrayList<>();

        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        DocumentBuilder builder = factory.newDocumentBuilder();
        Document document = builder.parse(new ByteArrayInputStream(xmlResponse.getBytes("UTF-8")));

        NodeList itemList = document.getElementsByTagName("item");

        for (int i = 0; i < itemList.getLength(); i++) {
            Element item = (Element) itemList.item(i);

            String dateStr = getElementText(item, "locdate");
            String name = getElementText(item, "dateName");
            String isHoliday = getElementText(item, "isHoliday");

            // 공휴일인 경우만 저장
            if ("Y".equals(isHoliday) && dateStr != null && !dateStr.isEmpty()) {
                Holiday holiday = new Holiday();
                holiday.setHolidayDate(LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyyMMdd")));
                holiday.setHolidayName(name);
                holiday.setHolidayType("법정공휴일");
                holiday.setIsLunar(false);
                holiday.setYear(year);
                holidays.add(holiday);
            }
        }

        return holidays;
    }

    /**
     * XML Element에서 텍스트 추출
     */
    private String getElementText(Element parent, String tagName) {
        NodeList nodeList = parent.getElementsByTagName(tagName);
        if (nodeList.getLength() > 0) {
            return nodeList.item(0).getTextContent();
        }
        return null;
    }

    /**
     * API 실패 시 사용할 기본 공휴일 데이터
     */
    @Transactional
    public List<HolidayDto> getFallbackHolidays(Integer year) {
        log.info("기본 공휴일 데이터 사용: {}", year);

        List<Holiday> holidays = new ArrayList<>();

        // 고정 공휴일
        holidays.add(createHoliday(year, 1, 1, "신정", "법정공휴일"));
        holidays.add(createHoliday(year, 3, 1, "삼일절", "법정공휴일"));
        holidays.add(createHoliday(year, 5, 5, "어린이날", "법정공휴일"));
        holidays.add(createHoliday(year, 6, 6, "현충일", "법정공휴일"));
        holidays.add(createHoliday(year, 8, 15, "광복절", "법정공휴일"));
        holidays.add(createHoliday(year, 10, 3, "개천절", "법정공휴일"));
        holidays.add(createHoliday(year, 10, 9, "한글날", "법정공휴일"));
        holidays.add(createHoliday(year, 12, 25, "크리스마스", "법정공휴일"));

        // 2025년 기준 음력 공휴일 (실제로는 매년 계산 필요)
        if (year == 2025) {
            holidays.add(createHoliday(2025, 1, 28, "설날 연휴", "법정공휴일"));
            holidays.add(createHoliday(2025, 1, 29, "설날", "법정공휴일"));
            holidays.add(createHoliday(2025, 1, 30, "설날 연휴", "법정공휴일"));
            holidays.add(createHoliday(2025, 5, 6, "부처님오신날", "법정공휴일"));
            holidays.add(createHoliday(2025, 10, 6, "추석 연휴", "법정공휴일"));
            holidays.add(createHoliday(2025, 10, 7, "추석 연휴", "법정공휴일"));
            holidays.add(createHoliday(2025, 10, 8, "추석", "법정공휴일"));
        }

        // 기존 데이터 삭제 후 저장
        holidayRepository.deleteByYear(year);
        List<Holiday> savedHolidays = holidayRepository.saveAll(holidays);

        return savedHolidays.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Holiday 객체 생성 헬퍼 메서드
     */
    private Holiday createHoliday(Integer year, int month, int day, String name, String type) {
        Holiday holiday = new Holiday();
        holiday.setHolidayDate(LocalDate.of(year, month, day));
        holiday.setHolidayName(name);
        holiday.setHolidayType(type);
        holiday.setIsLunar(false);
        holiday.setYear(year);
        return holiday;
    }

    /**
     * 특정 년도의 공휴일 조회
     * readOnly를 제거하여 내부에서 fetchAndSaveHolidays 호출 가능하도록 수정
     */
    @Transactional
    public List<HolidayDto> getHolidaysByYear(Integer year) {
        try {
            List<Holiday> holidays = holidayRepository.findByYearOrderByHolidayDateAsc(year);

            // 데이터가 없으면 가져오기
            if (holidays.isEmpty()) {
                return fetchAndSaveHolidays(year);
            }

            return holidays.stream()
                    .map(this::convertToDto)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            // 테이블이 없거나 DB 오류 시 fallback 데이터 반환 (저장하지 않음)
            log.warn("공휴일 조회 실패 (테이블 없거나 DB 오류), fallback 데이터 사용: {}", e.getMessage());
            return getFallbackHolidaysWithoutSaving(year);
        }
    }

    /**
     * 기간 내 공휴일 조회
     */
    @Transactional(readOnly = true)
    public List<HolidayDto> getHolidaysByDateRange(LocalDate startDate, LocalDate endDate) {
        try {
            List<Holiday> holidays = holidayRepository.findByDateRange(startDate, endDate);
            return holidays.stream()
                    .map(this::convertToDto)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("기간별 공휴일 조회 실패, 빈 목록 반환: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * 특정 날짜가 공휴일인지 확인
     */
    @Transactional(readOnly = true)
    public boolean isHoliday(LocalDate date) {
        try {
            return holidayRepository.existsByHolidayDate(date);
        } catch (Exception e) {
            log.warn("공휴일 확인 실패, false 반환: {}", e.getMessage());
            return false;
        }
    }

    /**
     * API 실패 또는 DB 접근 불가 시 사용할 기본 공휴일 데이터 (저장하지 않음)
     */
    private List<HolidayDto> getFallbackHolidaysWithoutSaving(Integer year) {
        log.info("Fallback 공휴일 데이터 사용 (저장 안 함): {}", year);

        List<HolidayDto> holidays = new ArrayList<>();

        // 고정 공휴일
        holidays.add(createHolidayDto(year, 1, 1, "신정", "법정공휴일"));
        holidays.add(createHolidayDto(year, 3, 1, "삼일절", "법정공휴일"));
        holidays.add(createHolidayDto(year, 5, 5, "어린이날", "법정공휴일"));
        holidays.add(createHolidayDto(year, 6, 6, "현충일", "법정공휴일"));
        holidays.add(createHolidayDto(year, 8, 15, "광복절", "법정공휴일"));
        holidays.add(createHolidayDto(year, 10, 3, "개천절", "법정공휴일"));
        holidays.add(createHolidayDto(year, 10, 9, "한글날", "법정공휴일"));
        holidays.add(createHolidayDto(year, 12, 25, "크리스마스", "법정공휴일"));

        // 2025년 기준 음력 공휴일
        if (year == 2025) {
            holidays.add(createHolidayDto(2025, 1, 28, "설날 연휴", "법정공휴일"));
            holidays.add(createHolidayDto(2025, 1, 29, "설날", "법정공휴일"));
            holidays.add(createHolidayDto(2025, 1, 30, "설날 연휴", "법정공휴일"));
            holidays.add(createHolidayDto(2025, 5, 6, "부처님오신날", "법정공휴일"));
            holidays.add(createHolidayDto(2025, 10, 6, "추석 연휴", "법정공휴일"));
            holidays.add(createHolidayDto(2025, 10, 7, "추석 연휴", "법정공휴일"));
            holidays.add(createHolidayDto(2025, 10, 8, "추석", "법정공휴일"));
        }

        return holidays;
    }

    /**
     * HolidayDto 객체 생성 헬퍼 메서드
     */
    private HolidayDto createHolidayDto(Integer year, int month, int day, String name, String type) {
        return HolidayDto.builder()
                .id(null)
                .holidayDate(LocalDate.of(year, month, day))
                .holidayName(name)
                .holidayType(type)
                .isLunar(false)
                .year(year)
                .remark(null)
                .build();
    }

    /**
     * Entity를 DTO로 변환
     */
    private HolidayDto convertToDto(Holiday holiday) {
        return HolidayDto.builder()
                .id(holiday.getId())
                .holidayDate(holiday.getHolidayDate())
                .holidayName(holiday.getHolidayName())
                .holidayType(holiday.getHolidayType())
                .isLunar(holiday.getIsLunar())
                .year(holiday.getYear())
                .remark(holiday.getRemark())
                .build();
    }
}
