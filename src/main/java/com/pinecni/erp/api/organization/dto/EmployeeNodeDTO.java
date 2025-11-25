package com.pinecni.erp.api.organization.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 직원 노드 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeNodeDTO {

    /**
     * 직원 ID (idx)
     */
    private Long id;

    /**
     * 직원명
     */
    private String name;

    /**
     * 직책 (예: "본부장", "팀장", "개발담당")
     */
    private String position;

    /**
     * 직급 (예: "전무", "부장", "차장", "과장")
     */
    private String rank;

    /**
     * 부서명 (전체 경로, 예: "개발본부 Frontend팀")
     */
    private String department;

    /**
     * 이메일
     */
    private String email;

    /**
     * 휴대전화
     */
    private String phone;

    /**
     * 내선번호
     */
    private String extension;

    /**
     * 입사일 (yyyy-MM-dd)
     */
    private String joinDate;

    /**
     * 재직 상태 (재직중, 휴직, 퇴사)
     */
    private String status;

    /**
     * 상위 보고자
     */
    private String manager;

    /**
     * 하위 팀원 수
     */
    private Integer teamCount;
}
