package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 회의록 수정 요청 DTO
 * 기존 회의록 정보 업데이트 시 사용
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingMinutesUpdateDTO {

    /**
     * 프로젝트 IDX
     */
    private Long projectIdx;

    /**
     * 프로젝트명
     */
    private String projectName;

    /**
     * 회의명
     */
    private String meetingTitle;

    /**
     * 회의 일시
     */
    private LocalDateTime meetingDatetime;

    /**
     * 장소
     */
    private String location;

    /**
     * 참석자
     */
    private String participants;

    /**
     * 회의 목적
     */
    private String purpose;

    /**
     * 회의 내용
     */
    private String content;

    /**
     * 결정 사항
     */
    private String decisions;

    /**
     * Action Items
     */
    private String actionItems;
}
