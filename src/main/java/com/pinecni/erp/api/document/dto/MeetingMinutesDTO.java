package com.pinecni.erp.api.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingMinutesDTO {
    /**
     * 회의록 IDX
     */
    private Long idx;

    /**
     * 작성자 IDX
     */
    private Long userIdx;

    /**
     * 작성자 이름
     */
    private String userName;

    /**
     * 작성자 부서 코드
     */
    private String userDept;

    /**
     * 작성자 부서 이름
     */
    private String userDeptName;

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
    private LocalDateTime meetingDatetime;

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
    private LocalDateTime createdAt;

    /**
     * 수정자 Idx
     */
    private Long updatedUserIdx;
    /**
     * 수정자 일시
     */
    private LocalDateTime updatedAt;
}
