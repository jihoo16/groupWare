package com.pinecni.erp.api.vacation.repository;

import com.pinecni.erp.entity.VacationBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VacationBalanceRepository extends JpaRepository<VacationBalance, Long> {

    /**
     * 특정 사용자의 특정 연도 잔액 조회
     */
    Optional<VacationBalance> findByUserIdxAndYear(Long userIdx, Integer year);

    /**
     * 특정 사용자의 전체 연도 잔액 조회 (이력 조회용)
     */
    List<VacationBalance> findByUserIdxOrderByYearDesc(Long userIdx);

    /**
     * 특정 연도의 전체 사용자 잔액 조회 (관리자 전체 조회용)
     */
    List<VacationBalance> findByYear(Integer year);

    /**
     * 특정 사용자의 잔액 존재 여부
     */
    boolean existsByUserIdxAndYear(Long userIdx, Integer year);

    /**
     * 특정 사용자의 모든 잔액 삭제 (사용자 삭제 시)
     */
    void deleteByUserIdx(Long userIdx);
}
