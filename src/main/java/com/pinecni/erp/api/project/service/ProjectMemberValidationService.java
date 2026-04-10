package com.pinecni.erp.api.project.service;

import com.pinecni.erp.exception.ParticipationPeriodException;

import java.time.LocalDate;
import java.util.List;

/**
 * 프로젝트 멤버 참여기간 검증 Service
 *
 * 영수증 증빙 문서(RCM/RCT/RCO/RCTM) 작성/수정 시,
 * 등록되는 내부 참석자들이 해당 지출 날짜(또는 기간)에
 * 프로젝트에 활성 참여 중인지 검증한다.
 *
 * 외부 인원(ExternalPerson)은 검증 대상이 아니므로 호출 측에서 제외해서 넘긴다.
 *
 * 정책:
 * - 단일 날짜 검증: participationStartDate <= date AND
 *                    (participationEndDate IS NULL OR participationEndDate >= date)
 * - 기간 검증: participationStartDate <= startDate AND
 *               (participationEndDate IS NULL OR participationEndDate >= endDate)
 *   → 출장 등은 전 기간 활성이어야 등록 가능
 */
public interface ProjectMemberValidationService {

    /**
     * 단일 날짜 기준으로 내부 사용자 목록의 참여 활성 여부 검증.
     *
     * @param projectIdx          대상 프로젝트
     * @param internalUserIdxList 검증 대상 내부 사용자 IDX 리스트 (외부 인원 제외)
     * @param date                기준 날짜 (회의일/야근일/지출일 등)
     * @throws ParticipationPeriodException 한 명이라도 활성이 아니면 충돌 정보와 함께 발생
     */
    void validateActiveOn(Long projectIdx, List<Long> internalUserIdxList, LocalDate date);

    /**
     * 기간 [startDate, endDate] 전 구간 활성 여부 검증 (출장 등).
     *
     * @param projectIdx          대상 프로젝트
     * @param internalUserIdxList 검증 대상 내부 사용자 IDX 리스트 (외부 인원 제외)
     * @param startDate           기간 시작
     * @param endDate             기간 종료 (포함)
     * @throws ParticipationPeriodException 한 명이라도 전 기간 활성이 아니면 발생
     */
    void validateActiveDuring(Long projectIdx, List<Long> internalUserIdxList,
                              LocalDate startDate, LocalDate endDate);
}
