package com.pinecni.erp.api.calendar.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 공휴일 엔티티
 */
@Entity
@Table(name = "holiday", schema = "erp")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Holiday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 공휴일 날짜
     */
    @Column(name = "holiday_date", nullable = false, unique = true)
    private LocalDate holidayDate;

    /**
     * 공휴일 이름
     */
    @Column(name = "holiday_name", nullable = false, length = 100)
    private String holidayName;

    /**
     * 공휴일 구분 (법정공휴일, 대체공휴일, 기타)
     */
    @Column(name = "holiday_type", length = 50)
    private String holidayType;

    /**
     * 음력 여부
     */
    @Column(name = "is_lunar")
    private Boolean isLunar;

    /**
     * 년도
     */
    @Column(name = "year")
    private Integer year;

    /**
     * 비고
     */
    @Column(name = "remark", length = 500)
    private String remark;
}
