package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.repository.ReceiptAttendeeRepository;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.api.project.repository.ProjectCardRepository;
import com.pinecni.erp.entity.Project;
import com.pinecni.erp.entity.ProjectCard;
import com.pinecni.erp.entity.ReceiptAttendee;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * 연구비증빙 공통 Service 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReceiptCommonServiceImpl implements ReceiptCommonService {

    private final ReceiptAttendeeRepository receiptAttendeeRepository;
    private final ProjectRepository projectRepository;
    private final ProjectCardRepository projectCardRepository;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> checkDuplicateAttendee(
            String date,
            Long attendeeIdx,
            Long projectIdx,
            String startTime,
            String endTime,
            Long excludeReceiptIdx,
            String excludeDocumentTypePrefix,
            Boolean isExternal) {

        log.debug("통합 중복 검증 - date: {}, attendeeIdx: {}, projectIdx: {}, time: {} ~ {}, exclude: {}({})",
                date, attendeeIdx, projectIdx, startTime, endTime, excludeReceiptIdx, excludeDocumentTypePrefix);

        List<Map<String, Object>> duplicates = new ArrayList<>();

        try {
            // 필수 파라미터 검증 (카드는 필수 아님)
            if (date == null || attendeeIdx == null || projectIdx == null) {
                log.warn("필수 파라미터 누락 - date: {}, attendeeIdx: {}, projectIdx: {}",
                        date, attendeeIdx, projectIdx);
                return duplicates;
            }

            LocalDate targetDate = LocalDate.parse(date);
            LocalTime newStartTime = parseTime(startTime);
            LocalTime newEndTime = parseTime(endTime);

            // 시간이 없으면 하루 전체로 간주
            if (newStartTime == null) {
                newStartTime = LocalTime.of(0, 0);
            }
            if (newEndTime == null) {
                newEndTime = LocalTime.of(23, 59);
            }

            // 참석 내역 조회 (같은 프로젝트, 같은 날짜 - 카드 무관)
            List<ReceiptAttendee> existingAttendees;
            if (excludeReceiptIdx != null && excludeDocumentTypePrefix != null) {
                // 수정 모드: 자기 자신 제외
                existingAttendees = receiptAttendeeRepository.findByUserAndProjectAndDateExcluding(
                        attendeeIdx, projectIdx, targetDate,
                        excludeReceiptIdx, excludeDocumentTypePrefix);
            } else {
                // 생성 모드
                existingAttendees = receiptAttendeeRepository.findByUserAndProjectAndDateAllCards(
                        attendeeIdx, projectIdx, targetDate);
            }

            log.debug("기존 참석 내역 조회 결과: {}건", existingAttendees.size());

            // 프로젝트/카드 정보 캐싱
            Map<Long, String> projectNameCache = new HashMap<>();
            Map<Long, String> cardNumberCache = new HashMap<>();

            // 각 기존 참석 내역과 시간대 겹침 확인
            for (ReceiptAttendee existing : existingAttendees) {
                LocalTime existingStart = existing.getStartTime();
                LocalTime existingEnd = existing.getEndTime();

                // 기존 시간이 없으면 하루 전체로 간주
                if (existingStart == null) {
                    existingStart = LocalTime.of(0, 0);
                }
                if (existingEnd == null) {
                    existingEnd = LocalTime.of(23, 59);
                }

                // 시간대 겹침 확인
                if (isTimeOverlapping(existingStart, existingEnd, newStartTime, newEndTime)) {
                    Map<String, Object> info = new HashMap<>();
                    info.put("idx", existing.getReceiptIdx());
                    info.put("type", existing.getDocumentTypePrefix());
                    info.put("typeName", getDocumentTypeName(existing.getDocumentTypePrefix()));
                    info.put("documentDate", existing.getDocumentDate());
                    info.put("startTime", existingStart.format(TIME_FORMATTER));
                    info.put("endTime", existingEnd.format(TIME_FORMATTER));
                    info.put("projectIdx", existing.getProjectIdx());
                    info.put("cardIdx", existing.getCardIdx());

                    // 프로젝트명 조회 (캐싱)
                    String projectName = projectNameCache.computeIfAbsent(existing.getProjectIdx(), pIdx -> {
                        return projectRepository.findById(pIdx)
                                .map(Project::getProjectName)
                                .orElse("알 수 없음");
                    });
                    info.put("projectName", projectName);

                    // 카드번호 조회 (캐싱)
                    if (existing.getCardIdx() != null) {
                        String cardNumber = cardNumberCache.computeIfAbsent(existing.getCardIdx(), cIdx -> {
                            return projectCardRepository.findById(cIdx)
                                    .map(ProjectCard::getCardLastDigits)
                                    .orElse("");
                        });
                        info.put("cardNumber", cardNumber);
                    }

                    duplicates.add(info);
                    log.debug("시간 겹침 발견 - 문서타입: {}, IDX: {}, 시간: {} ~ {}",
                            existing.getDocumentTypePrefix(), existing.getReceiptIdx(),
                            existingStart, existingEnd);
                }
            }

            log.debug("통합 중복 검증 완료 - 총 {}건 중복", duplicates.size());
            return duplicates;

        } catch (Exception e) {
            log.error("통합 중복 검증 중 오류 발생: {}", e.getMessage(), e);
            return duplicates;
        }
    }

    @Override
    public boolean isTimeOverlapping(LocalTime existingStart, LocalTime existingEnd,
                                     LocalTime newStart, LocalTime newEnd) {
        if (existingStart == null || existingEnd == null || newStart == null || newEnd == null) {
            return true; // 시간 정보가 없으면 겹치는 것으로 간주
        }

        // 겹치지 않는 경우: 신규 종료가 기존 시작 이전 OR 신규 시작이 기존 종료 이후
        // 겹치는 경우: 위의 반대
        return !(newEnd.isBefore(existingStart) || newEnd.equals(existingStart) ||
                 newStart.isAfter(existingEnd) || newStart.equals(existingEnd));
    }

    @Override
    public String getDocumentTypeName(String prefix) {
        if (prefix == null) {
            return "알 수 없음";
        }
        return switch (prefix) {
            case "RCM" -> "회의록";
            case "RCO" -> "야근식대";
            case "RCT" -> "단독 출장";
            case "RCTM" -> "출장+회의";
            default -> prefix;
        };
    }

    /**
     * 시간 문자열 파싱 (HH:mm 형식)
     */
    private LocalTime parseTime(String timeStr) {
        if (timeStr == null || timeStr.isEmpty()) {
            return null;
        }
        try {
            return LocalTime.parse(timeStr, TIME_FORMATTER);
        } catch (Exception e) {
            log.warn("시간 파싱 실패: {}", timeStr);
            return null;
        }
    }
}
