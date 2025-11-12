package com.pinecni.erp.api.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 프로젝트 연구비 카드 생성 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectCardCreateDTO {

    /**
     * 프로젝트 IDX (Service에서 설정)
     */
    private Long projectIdx;

    /**
     * 카드 회사 (신한카드, 국민카드, 현대카드 등)
     */
    private String cardCompany;

    /**
     * 카드 뒷 4자리
     */
    private String cardLastDigits;

    /**
     * 카드 닉네임 (선택)
     */
    private String cardNickname;
}
