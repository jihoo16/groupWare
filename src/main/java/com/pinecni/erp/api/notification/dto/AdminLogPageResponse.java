package com.pinecni.erp.api.notification.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AdminLogPageResponse {

    private final List<AdminLogEntryDto> content;
    private final int  page;
    private final int  size;
    private final long totalElements;
    private final int  totalPages;
    private final boolean first;
    private final boolean last;
}
