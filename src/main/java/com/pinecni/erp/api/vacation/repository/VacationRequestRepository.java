package com.pinecni.erp.api.vacation.repository;

import com.pinecni.erp.entity.VacationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * VacationRequest Repository
 */
@Repository
public interface VacationRequestRepository extends JpaRepository<VacationRequest, Long> {

    /**
     * 사용자별 연차 신청 조회 (최신순, 삭제되지 않은 문서만)
     */
    @Query("SELECT v FROM VacationRequest v " +
            "JOIN ApprovalDocument ad ON v.documentIdx = ad.idx " +
            "WHERE v.userIdx = :userIdx " +
            "AND ad.deletedAt IS NULL " +
            "ORDER BY v.createdAt DESC")
    List<VacationRequest> findByUserIdx(Long userIdx);

    /**
     * 연차 유형별 조회 (삭제되지 않은 문서만)
     */
    @Query("SELECT v FROM VacationRequest v " +
            "JOIN ApprovalDocument ad ON v.documentIdx = ad.idx " +
            "WHERE v.vacationType = :vacationType " +
            "AND ad.deletedAt IS NULL " +
            "ORDER BY v.createdAt DESC")
    List<VacationRequest> findByVacationType(String vacationType);

    /**
     * 기간별 연차 신청 조회 (삭제되지 않은 문서만)
     */
    @Query("SELECT v FROM VacationRequest v " +
            "JOIN ApprovalDocument ad ON v.documentIdx = ad.idx " +
            "WHERE v.startDate <= :endDate " +
            "AND v.endDate >= :startDate " +
            "AND ad.deletedAt IS NULL " +
            "ORDER BY v.startDate")
    List<VacationRequest> findByDateRange(LocalDate startDate, LocalDate endDate);

    /**
     * 사용자의 기간별 연차 신청 조회 (삭제되지 않은 문서만)
     */
    @Query("SELECT v FROM VacationRequest v " +
            "JOIN ApprovalDocument ad ON v.documentIdx = ad.idx " +
            "WHERE v.userIdx = :userIdx " +
            "AND v.startDate <= :endDate " +
            "AND v.endDate >= :startDate " +
            "AND ad.deletedAt IS NULL")
    List<VacationRequest> findByUserIdxAndDateRange(Long userIdx,
                                                     LocalDate startDate,
                                                     LocalDate endDate);

    /**
     * 사용자의 연간 연차 사용 내역 (삭제되지 않은 문서만)
     */
    @Query("SELECT v FROM VacationRequest v " +
            "JOIN ApprovalDocument ad ON v.documentIdx = ad.idx " +
            "WHERE v.userIdx = :userIdx " +
            "AND YEAR(v.startDate) = :year " +
            "AND ad.deletedAt IS NULL " +
            "ORDER BY v.startDate DESC")
    List<VacationRequest> findByUserIdxAndYear(Long userIdx, int year);

    /**
     * 사용자의 연간 총 사용 연차 일수 합계 (삭제되지 않은 문서만)
     */
    @Query("SELECT COALESCE(SUM(v.days), 0) FROM VacationRequest v " +
            "JOIN ApprovalDocument ad ON v.documentIdx = ad.idx " +
            "WHERE v.userIdx = :userIdx " +
            "AND YEAR(v.startDate) = :year " +
            "AND ad.deletedAt IS NULL")
    BigDecimal sumDaysByUserIdxAndYear(Long userIdx, int year);

    /**
     * 사용자의 특정 연차 유형 신청 이력 확인 (경조사 등, 삭제되지 않은 문서만)
     * - vacationType에 특정 문자열이 포함되어 있는지 확인
     * - 예: vacationType="본인결혼" -> "경조사(본인결혼)" 검색
     */
    @Query("SELECT CASE WHEN COUNT(v) > 0 THEN true ELSE false END " +
            "FROM VacationRequest v " +
            "JOIN ApprovalDocument ad ON v.documentIdx = ad.idx " +
            "WHERE v.userIdx = :userIdx " +
            "AND v.vacationType LIKE CONCAT('%', :vacationType, '%') " +
            "AND ad.deletedAt IS NULL")
    boolean existsByUserIdxAndVacationTypeContaining(Long userIdx, String vacationType);

    /**
     * 특정 날짜(cutoffDate) 이전에 시작한 연차 일수 합계 (경조사·기타 제외)
     * 만료일 기준 FIFO 계산 시 "만료일 이전 사용분" 산출에 사용.
     */
    @Query("SELECT COALESCE(SUM(v.days), 0) FROM VacationRequest v " +
            "JOIN ApprovalDocument ad ON v.documentIdx = ad.idx " +
            "WHERE v.userIdx = :userIdx " +
            "AND YEAR(v.startDate) = :year " +
            "AND v.startDate <= :cutoffDate " +
            "AND ad.deletedAt IS NULL " +
            "AND v.vacationType NOT LIKE '%경조사%' " +
            "AND v.vacationType <> '기타'")
    BigDecimal sumDaysUsedOnOrBefore(@Param("userIdx") Long userIdx,
                                     @Param("year") int year,
                                     @Param("cutoffDate") LocalDate cutoffDate);

    /**
     * 문서 IDX로 연차 신청 목록 조회
     * - 한 문서에 여러 개의 연차 기간이 있을 수 있음
     */
    @Query("SELECT v FROM VacationRequest v WHERE v.documentIdx = :documentIdx " +
            "ORDER BY v.startDate")
    List<VacationRequest> findByDocumentIdx(Long documentIdx);

    /**
     * 문서 IDX에 해당하는 모든 연차 신청 행의 승인 상태를 일괄 업데이트
     * - 한 문서에 여러 기간이 있을 수 있으므로 documentIdx 기준으로 일괄 처리
     */
    @Modifying
    @Query("UPDATE VacationRequest v SET " +
            "v.isApproved = :isApproved, " +
            "v.approvedAt = :approvedAt, " +
            "v.approvedUserIdx = :approvedUserIdx " +
            "WHERE v.documentIdx = :documentIdx")
    int updateApprovalByDocumentIdx(@Param("documentIdx") Long documentIdx,
                                    @Param("isApproved") Boolean isApproved,
                                    @Param("approvedAt") LocalDateTime approvedAt,
                                    @Param("approvedUserIdx") Long approvedUserIdx);
}
