package com.pinecni.erp.api.user.dto;

import lombok.*;

/**
 * 사용자 간단 정보 DTO (목록 조회, 참조용)
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSimpleDTO {

    private Long idx;
    private String empId;
    private String empName;
    private String empDept; // 부서 코드
    private String empDeptName; // 부서 코드명
    private String empPosition; // 직급 코드
    private String empPositionName; // 직급 코드명
    private String empEmail;
    private String empPhone;
    private String empStatus;
    private String profilePhotoPath;
}
