package com.pinecni.erp.api.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 연구비카드 조회 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectCardDTO {

    /**
     * 카드 IDX
     */
    private Long idx;

    /**
     * 프로젝트 IDX
     */
    private Long projectIdx;

    /**
     * 프로젝트명
     */
    private String projectName;

    /**
     * 카드 회사 (신한카드, 국민카드, 현대카드 등)
     */
    private String cardCompany;

    /**
     * 카드 뒷 4자리
     */
    private String cardLastDigits;

    /**
     * 카드 닉네임
     */
    private String cardNickname;

    /**
     * 활성 여부
     */
    private Boolean isActive;

    /**
     * 등록일
     */
    private LocalDateTime createdAt;
}
