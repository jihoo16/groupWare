package com.pinecni.erp.api.notification.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AnnounceRequest {

    /** 공지 제목 */
    private String title;
    /** 공지 본문 (Markdown) */
    private String body;

    /**
     * 추가 INWEB 발송 여부. true 면 모든 활성 사용자에게 인박스 행도 만듦.
     * false 면 채널 한 건만 발송.
     */
    private Boolean alsoInbox;
}
