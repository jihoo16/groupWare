package com.pinecni.erp.api.competency.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class BulkTrainingRequestDTO {

    @NotBlank(message = "교육명은 필수입니다")
    @Size(max = 200)
    private String trainingName;

    @NotBlank(message = "교육기관은 필수입니다")
    @Size(max = 200)
    private String trainingOrgName;

    @NotNull(message = "이수일자는 필수입니다")
    private LocalDate completionDate;

    private String notes;

    @NotEmpty(message = "대상 직원을 1명 이상 선택해야 합니다")
    private List<Long> targetUserIdxList;
}
