package com.pinecni.erp.api.notification.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class SentPageResponse {

    private final List<SentEntryDto> content;
    private final int  page;
    private final int  size;
    private final long totalElements;
    private final int  totalPages;
    private final boolean first;
    private final boolean last;
}
