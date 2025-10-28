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
    private String empDept;
    private String empPosition;
    private String empEmail;
    private String empPhone;
    private String empStatus;
    private String profilePhotoPath;
}
