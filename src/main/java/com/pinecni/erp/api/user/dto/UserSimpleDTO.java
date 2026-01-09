package com.pinecni.erp.api.user.dto;

import lombok.*;

import java.time.LocalDate;

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
    private Integer empPositionSortOrder; // 직급 정렬 순서
    private String empEmail;
    private String empPhone;
    private LocalDate empJoinDate; // 입사일
    private String empStatus;
    private String profilePhotoPath;
}
