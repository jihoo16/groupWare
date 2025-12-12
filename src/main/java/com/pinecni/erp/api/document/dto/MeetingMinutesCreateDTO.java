package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MeetingMinutesCreateDTO {

    /**
     * 작성자 IDX
     */
    private Long userIdx;

    /**
     * 프로젝트 IDX
     */
    private Long projectIdx;

    /**
     * 프로젝트 명
     */
    private String projectName;

    /**
     * 회의 명
     */
    private String meetingTitle;

    /**
     * 회의 일시
     */
    private Instant meetingDatetime;

    /**
     * 회의 장소
     */
    private String location;

    /**
     * 참석자 명단
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
     * 후속 조치
     */
    private String actionItems;

    /**
     * 생성자 Idx
     */
    private Long createdUserIdx;

    /**
     * 생성자 일시
     */
    private Instant createdAt;

    /**
     * 수정자 Idx
     */
    private Long updatedUserIdx;
    /**
     * 수정자 일시
     */
    private Instant updatedAt;
}
