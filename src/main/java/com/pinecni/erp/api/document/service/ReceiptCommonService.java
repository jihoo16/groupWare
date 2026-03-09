package com.pinecni.erp.api.document.service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

/**
 * 연구비증빙 공통 Service Interface
 * 회의록, 야근식대, 단독 출장, 출장+회의 등 모든 문서에서 공통으로 사용
 */
public interface ReceiptCommonService {

    /**
     * 통합 참석자 중복 검증
     * 같은 프로젝트, 같은 날짜에서 시간대 겹침 확인 (카드 무관)
     * 모든 문서 타입(회의록, 야근식대, 단독 출장, 출장+회의) 대상
     *
     * @param date 검증할 날짜 (yyyy-MM-dd)
     * @param attendeeIdx 참석자 IDX (users.idx 또는 external_persons.idx)
     * @param projectIdx 프로젝트 IDX
     * @param startTime 시작 시간 (HH:mm)
     * @param endTime 종료 시간 (HH:mm)
     * @param excludeReceiptIdx 제외할 문서 IDX (수정 시 자기 자신 제외)
     * @param excludeDocumentTypePrefix 제외할 문서 타입 (RCM/RCO/RCT)
     * @param isExternal 외부 인력 여부
     * @return 중복 문서 목록 (type, idx, date, startTime, endTime, projectName 등)
     */
    List<Map<String, Object>> checkDuplicateAttendee(
            String date,
            Long attendeeIdx,
            Long projectIdx,
            String startTime,
            String endTime,
            Long excludeReceiptIdx,
            String excludeDocumentTypePrefix,
            Boolean isExternal
    );

    /**
     * 시간대 겹침 여부 확인
     * @param existingStart 기존 시작 시간
     * @param existingEnd 기존 종료 시간
     * @param newStart 신규 시작 시간
     * @param newEnd 신규 종료 시간
     * @return 겹침 여부
     */
    boolean isTimeOverlapping(LocalTime existingStart, LocalTime existingEnd,
                              LocalTime newStart, LocalTime newEnd);

    /**
     * 문서 타입 prefix를 한글명으로 변환
     * @param prefix 문서 타입 prefix (RCM/RCO/RCT/RCTM)
     * @return 한글명
     */
    String getDocumentTypeName(String prefix);
}
