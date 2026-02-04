package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.ReceiptAttendee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 통합 참석자 Repository
 */
@Repository
public interface ReceiptAttendeeRepository extends JpaRepository<ReceiptAttendee, Long> {

    /**
     * 문서 타입과 원본 문서 IDX로 참석자 목록 조회
     */
    List<ReceiptAttendee> findByDocumentTypePrefixAndReceiptIdx(String documentTypePrefix, Long receiptIdx);

    /**
     * 원본 문서 IDX로 참석자 목록 조회 (야근식대용 - RCO)
     */
    default List<ReceiptAttendee> findByReceiptOvertimeIdx(Long receiptOvertimeIdx) {
        return findByDocumentTypePrefixAndReceiptIdx("RCO", receiptOvertimeIdx);
    }

    /**
     * 원본 문서 IDX로 참석자 목록 조회 (회의록용 - RCM)
     */
    default List<ReceiptAttendee> findByReceiptMeetingIdx(Long receiptMeetingIdx) {
        return findByDocumentTypePrefixAndReceiptIdx("RCM", receiptMeetingIdx);
    }

    /**
     * 문서 타입과 원본 문서 IDX로 참석자 소프트 삭제
     */
    @Modifying
    @Query("UPDATE ReceiptAttendee ra SET ra.deleted = true, ra.deletedAt = :deletedAt, ra.deletedUserIdx = :deletedUserIdx " +
            "WHERE ra.documentTypePrefix = :documentTypePrefix AND ra.receiptIdx = :receiptIdx")
    void softDeleteByDocumentTypePrefixAndReceiptIdx(
            @Param("documentTypePrefix") String documentTypePrefix,
            @Param("receiptIdx") Long receiptIdx,
            @Param("deletedAt") LocalDateTime deletedAt,
            @Param("deletedUserIdx") Long deletedUserIdx);

    /**
     * 야근식대 참석자 소프트 삭제
     */
    default void softDeleteByReceiptOvertimeIdx(Long receiptOvertimeIdx, LocalDateTime deletedAt, Long deletedUserIdx) {
        softDeleteByDocumentTypePrefixAndReceiptIdx("RCO", receiptOvertimeIdx, deletedAt, deletedUserIdx);
    }

    /**
     * 프로젝트별 참석자 목록 조회
     */
    List<ReceiptAttendee> findByProjectIdx(Long projectIdx);

    /**
     * 사용자별 참석 이력 조회
     */
    List<ReceiptAttendee> findByUserIdx(Long userIdx);
}
