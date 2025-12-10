package com.pinecni.erp.api.calendar.scheduler;

import com.pinecni.erp.api.calendar.service.HolidayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * 공휴일 데이터 자동 갱신 스케줄러
 * 매일 UTC 00:00에 공공데이터포털에서 공휴일 데이터를 가져와 DB에 저장
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class HolidayScheduler {

    private final HolidayService holidayService;

    /**
     * 매일 UTC 00:00에 실행
     * 현재 년도와 다음 년도의 공휴일 데이터를 자동으로 가져옴
     */
    @Scheduled(cron = "0 0 0 * * ?", zone = "UTC")
    public void updateHolidayData() {
        log.info("=== 공휴일 데이터 자동 갱신 시작 ===");

        try {
            int currentYear = LocalDate.now().getYear();
            int nextYear = currentYear + 1;

            // 현재 년도 공휴일 가져오기
            log.info("{}년 공휴일 데이터 가져오는 중...", currentYear);
            holidayService.fetchAndSaveHolidays(currentYear);
            log.info("{}년 공휴일 데이터 저장 완료", currentYear);

            // 다음 년도 공휴일 가져오기 (연말 대비)
            log.info("{}년 공휴일 데이터 가져오는 중...", nextYear);
            holidayService.fetchAndSaveHolidays(nextYear);
            log.info("{}년 공휴일 데이터 저장 완료", nextYear);

            log.info("=== 공휴일 데이터 자동 갱신 완료 ===");
        } catch (Exception e) {
            log.error("공휴일 데이터 자동 갱신 실패: {}", e.getMessage(), e);
        }
    }

    /**
     * 애플리케이션 시작 시 즉시 실행 (초기 데이터 로드)
     * 서버 시작 후 10초 뒤에 실행
     */
    @Scheduled(initialDelay = 10000, fixedDelay = Long.MAX_VALUE)
    public void initialHolidayDataLoad() {
        log.info("=== 공휴일 데이터 초기 로드 시작 ===");

        try {
            int currentYear = LocalDate.now().getYear();
            int nextYear = currentYear + 1;

            // 현재 년도와 다음 년도의 공휴일 데이터 확인 및 로드
            log.info("{}년, {}년 공휴일 데이터 초기 로드 중...", currentYear, nextYear);

            holidayService.fetchAndSaveHolidays(currentYear);
            holidayService.fetchAndSaveHolidays(nextYear);

            log.info("=== 공휴일 데이터 초기 로드 완료 ===");
        } catch (Exception e) {
            log.error("공휴일 데이터 초기 로드 실패: {}", e.getMessage(), e);
        }
    }
}
