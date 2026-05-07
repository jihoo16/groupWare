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
public class QuietHoursDto {

    private Boolean enabled;
    /** "HH:mm" — 시작 시각 */
    private String  start;
    /** "HH:mm" — 종료 시각 */
    private String  end;
}
