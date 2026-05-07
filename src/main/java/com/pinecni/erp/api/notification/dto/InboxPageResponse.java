package com.pinecni.erp.api.notification.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class InboxPageResponse {

    private final List<InboxEntryDto> content;
    private final int  page;          // 0-based
    private final int  size;
    private final long totalElements;
    private final int  totalPages;
    private final long totalUnread;   // 전체 안읽음 카운트 (필터 무관)
    private final boolean first;
    private final boolean last;
}
