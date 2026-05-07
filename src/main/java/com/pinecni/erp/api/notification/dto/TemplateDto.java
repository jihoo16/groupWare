package com.pinecni.erp.api.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TemplateDto {

    /** C19 알림유형 */
    private String  notificationType;

    /** 한글 표시명 */
    private String  notificationTypeName;

    private String  title;
    private String  body;
    private String  link;
    private String  color;
    private Boolean isEnabled;
}
