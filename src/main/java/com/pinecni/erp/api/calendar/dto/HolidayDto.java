package com.pinecni.erp.api.calendar.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 공휴일 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HolidayDto {

    private Long id;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate holidayDate;

    private String holidayName;

    private String holidayType;

    private Boolean isLunar;

    private Integer year;

    private String remark;
}
