package com.pinecni.erp.api.competency.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class BulkTrainingResultDTO {

    private int successCount;
    private int failedCount;
    private List<FailedUser> failedUsers;

    @Getter
    @Builder
    public static class FailedUser {
        private Long userIdx;
        private String empName;
        private String reason;
    }
}
