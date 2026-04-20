package com.pinecni.erp.api.document.repository;

import com.pinecni.erp.entity.ReceiptAttendee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * ReceiptAttendee Repository
 * 통합 참석자 조회 (회의록, 야근식대, 출장 등 모든 문서)
 */
@Repository
public interface ReceiptAttendeeRepository extends JpaRepository<ReceiptAttendee, Long> {

    // ==============================================
    // 야근식대(RCO) 전용 편의 메서드
    // ==============================================

    /**
     * 야근식대 참석자 목록 조회
     */
    default List<ReceiptAttendee> findByReceiptOvertimeIdx(Long receiptOvertimeIdx) {
        return findByReceiptIdxAndDocumentTypePrefixOrderByDisplayOrder(receiptOvertimeIdx, "RCO");
    }

    /**
     * 야근식대 참석자 소프트 딜리트
     */
    default void softDeleteByReceiptOvertimeIdx(Long receiptOvertimeIdx, LocalDateTime deletedAt, Long deletedUserIdx) {
        softDeleteByReceiptIdxAndDocumentTypePrefix(receiptOvertimeIdx, "RCO", deletedUserIdx);
    }

    // ==============================================
    // 회의록(RCM) 전용 편의 메서드
    // ==============================================

    /**
     * 회의록 참석자 목록 조회
     */
    default List<ReceiptAttendee> findByReceiptMeetingIdx(Long receiptMeetingIdx) {
        return findByReceiptIdxAndDocumentTypePrefixOrderByDisplayOrder(receiptMeetingIdx, "RCM");
    }

    /**
     * 회의록 참석자 소프트 딜리트
     */
    default void softDeleteByReceiptMeetingIdx(Long receiptMeetingIdx, LocalDateTime deletedAt, Long deletedUserIdx) {
        softDeleteByReceiptIdxAndDocumentTypePrefix(receiptMeetingIdx, "RCM", deletedUserIdx);
    }

    // ==============================================
    // 출장(RCT) 전용 편의 메서드
    // ==============================================

    /**
     * 출장 참석자 목록 조회
     */
    default List<ReceiptAttendee> findByReceiptTripIdx(Long receiptTripIdx) {
        return findByReceiptIdxAndDocumentTypePrefixOrderByDisplayOrder(receiptTripIdx, "RCT");
    }

    /**
     * 출장 참석자 소프트 딜리트
     */
    default void softDeleteByReceiptTripIdx(Long receiptTripIdx, Long deletedUserIdx) {
        softDeleteByReceiptIdxAndDocumentTypePrefix(receiptTripIdx, "RCT", deletedUserIdx);
    }

    // ==============================================
    // 출장+회의(RCTM) 전용 편의 메서드
    // ==============================================

    /**
     * 출장+회의 전체 참석자 목록 조회
     */
    default List<ReceiptAttendee> findByReceiptTripMeetingIdx(Long rtmIdx) {
        return findByReceiptIdxAndDocumentTypePrefixOrderByDisplayOrder(rtmIdx, "RCTM");
    }

    /**
     * 출장+회의 참여 구분별 참석자 조회 ('출장' 또는 '회의')
     */
    default List<ReceiptAttendee> findByReceiptTripMeetingIdxAndParticipationType(
            Long rtmIdx, String participationType) {
        return findByReceiptIdxAndDocumentTypePrefixAndParticipationTypeOrderByDisplayOrder(
                rtmIdx, "RCTM", participationType);
    }

    /**
     * 특정 세션의 회의 참석자 조회 (다중 회의 지원)
     */
    List<ReceiptAttendee> findBySessionIdxAndParticipationTypeAndIsDeletedFalseOrderByDisplayOrder(
            Long sessionIdx, String participationType);

    /**
     * 출장+회의 참석자 소프트 딜리트
     */
    default void softDeleteByReceiptTripMeetingIdx(Long rtmIdx, Long deletedUserIdx) {
        softDeleteByReceiptIdxAndDocumentTypePrefix(rtmIdx, "RCTM", deletedUserIdx);
    }

    // ==============================================
    // 공통 메서드
    // ==============================================

    /**
     * 문서별 참석자 목록 조회 (정렬 순서대로)
     * @param receiptIdx 문서 IDX
     * @param documentTypePrefix 문서 타입 (RCM/RCO/RCT)
     * @return 참석자 목록
     */
    List<ReceiptAttendee> findByReceiptIdxAndDocumentTypePrefixOrderByDisplayOrder(
            Long receiptIdx,
            String documentTypePrefix
    );

    List<ReceiptAttendee> findByReceiptIdxAndDocumentTypePrefixAndParticipationTypeOrderByDisplayOrder(
            Long receiptIdx,
            String documentTypePrefix,
            String participationType
    );

    /**
     * 문서별 참석자 목록 조회 (내부 직원 정보 포함)
     * @param receiptIdx 문서 IDX
     * @param documentTypePrefix 문서 타입 (RCM/RCO/RCT)
     * @return [ReceiptAttendee, User] 배열 리스트
     */
    @Query("""
        SELECT ra, u
        FROM ReceiptAttendee ra
        LEFT JOIN User u ON ra.userIdx = u.idx AND ra.isExternal = false
        WHERE ra.receiptIdx = :receiptIdx
          AND ra.documentTypePrefix = :documentTypePrefix
          AND ra.isDeleted = false
        ORDER BY ra.displayOrder
        """)
    List<Object[]> findAttendeesWithUser(
            @Param("receiptIdx") Long receiptIdx,
            @Param("documentTypePrefix") String documentTypePrefix
    );

    /**
     * 문서별 참석자 목록 조회 (외부 인력 정보 포함)
     * @param receiptIdx 문서 IDX
     * @param documentTypePrefix 문서 타입 (RCM/RCO/RCT)
     * @return [ReceiptAttendee, ExternalPerson] 배열 리스트
     */
    @Query("""
        SELECT ra, ep
        FROM ReceiptAttendee ra
        LEFT JOIN ExternalPerson ep ON ra.userIdx = ep.idx AND ra.isExternal = true
        WHERE ra.receiptIdx = :receiptIdx
          AND ra.documentTypePrefix = :documentTypePrefix
          AND ra.isDeleted = false
        ORDER BY ra.displayOrder
        """)
    List<Object[]> findAttendeesWithExternalPerson(
            @Param("receiptIdx") Long receiptIdx,
            @Param("documentTypePrefix") String documentTypePrefix
    );

    /**
     * 문서별 참석자 목록 조회 (내부/외부 모두 조인)
     * @param receiptIdx 문서 IDX
     * @param documentTypePrefix 문서 타입 (RCM/RCO/RCT)
     * @return [ReceiptAttendee, User, ExternalPerson] 배열 리스트
     */
    @Query("""
        SELECT ra, u, ep
        FROM ReceiptAttendee ra
        LEFT JOIN User u ON ra.userIdx = u.idx AND ra.isExternal = false
        LEFT JOIN ExternalPerson ep ON ra.userIdx = ep.idx AND ra.isExternal = true
        WHERE ra.receiptIdx = :receiptIdx
          AND ra.documentTypePrefix = :documentTypePrefix
          AND ra.isDeleted = false
        ORDER BY ra.displayOrder
        """)
    List<Object[]> findAttendeesWithAllPersonInfo(
            @Param("receiptIdx") Long receiptIdx,
            @Param("documentTypePrefix") String documentTypePrefix
    );

    /**
     * 특정 사용자의 특정 날짜 참석 내역 조회 (시간 겹침 체크용)
     * @param userIdx 사용자 IDX
     * @param projectIdx 프로젝트 IDX
     * @param documentDate 문서 날짜
     * @return 참석자 목록
     */
    @Query("""
        SELECT ra
        FROM ReceiptAttendee ra
        WHERE ra.userIdx = :userIdx
          AND ra.projectIdx = :projectIdx
          AND ra.documentDate = :documentDate
          AND ra.isDeleted = false
        ORDER BY ra.startTime
        """)
    List<ReceiptAttendee> findByUserAndProjectAndDate(
            @Param("userIdx") Long userIdx,
            @Param("projectIdx") Long projectIdx,
            @Param("documentDate") LocalDate documentDate
    );

    /**
     * 문서의 모든 참석자 Soft Delete
     * @param receiptIdx 문서 IDX
     * @param documentTypePrefix 문서 타입 (RCM/RCO/RCT)
     * @param deletedUserIdx 삭제자 IDX
     */
    @Modifying
    @Query("""
        UPDATE ReceiptAttendee ra
        SET ra.isDeleted = true,
            ra.deletedAt = CURRENT_TIMESTAMP,
            ra.deletedUserIdx = :deletedUserIdx
        WHERE ra.receiptIdx = :receiptIdx
          AND ra.documentTypePrefix = :documentTypePrefix
          AND ra.isDeleted = false
        """)
    void softDeleteByReceiptIdxAndDocumentTypePrefix(
            @Param("receiptIdx") Long receiptIdx,
            @Param("documentTypePrefix") String documentTypePrefix,
            @Param("deletedUserIdx") Long deletedUserIdx
    );

    /**
     * 문서의 모든 참석자 물리 삭제 (실제 삭제, 주의!)
     * @param receiptIdx 문서 IDX
     * @param documentTypePrefix 문서 타입 (RCM/RCO/RCT)
     */
    @Modifying
    @Query("""
        DELETE FROM ReceiptAttendee ra
        WHERE ra.receiptIdx = :receiptIdx
          AND ra.documentTypePrefix = :documentTypePrefix
        """)
    void deleteByReceiptIdxAndDocumentTypePrefix(
            @Param("receiptIdx") Long receiptIdx,
            @Param("documentTypePrefix") String documentTypePrefix
    );

    /**
     * 특정 프로젝트의 참석자 통계 조회
     * @param projectIdx 프로젝트 IDX
     * @param documentTypePrefix 문서 타입 (RCM/RCO/RCT)
     * @return 참석 횟수
     */
    @Query("""
        SELECT COUNT(ra)
        FROM ReceiptAttendee ra
        WHERE ra.projectIdx = :projectIdx
          AND ra.documentTypePrefix = :documentTypePrefix
          AND ra.isDeleted = false
        """)
    Long countByProjectIdxAndDocumentTypePrefix(
            @Param("projectIdx") Long projectIdx,
            @Param("documentTypePrefix") String documentTypePrefix
    );

    /**
     * 특정 사용자의 문서 참석 내역 조회
     * @param userIdx 사용자 IDX
     * @param documentTypePrefix 문서 타입 (RCM/RCO/RCT)
     * @return 참석자 목록
     */
    List<ReceiptAttendee> findByUserIdxAndDocumentTypePrefixAndIsDeletedFalseOrderByDocumentDateDesc(
            Long userIdx,
            String documentTypePrefix
    );

    // ==============================================
    // 통합 중복 검증 메서드 (모든 문서 타입 대상)
    // ==============================================

    /**
     * 특정 사용자의 특정 날짜/프로젝트/카드 참석 내역 조회 (모든 문서 타입)
     * 시간대 겹침 체크용 - 문서 타입 무관하게 조회
     * @param userIdx 사용자 IDX
     * @param projectIdx 프로젝트 IDX
     * @param cardIdx 카드 IDX
     * @param documentDate 문서 날짜
     * @return 참석자 목록
     */
    @Query("""
        SELECT ra
        FROM ReceiptAttendee ra
        WHERE ra.userIdx = :userIdx
          AND ra.projectIdx = :projectIdx
          AND ra.cardIdx = :cardIdx
          AND ra.documentDate = :documentDate
          AND ra.isDeleted = false
        ORDER BY ra.startTime
        """)
    List<ReceiptAttendee> findByUserAndProjectAndCardAndDate(
            @Param("userIdx") Long userIdx,
            @Param("projectIdx") Long projectIdx,
            @Param("cardIdx") Long cardIdx,
            @Param("documentDate") LocalDate documentDate
    );

    /**
     * 특정 사용자의 특정 날짜/프로젝트 참석 내역 조회 (모든 문서 타입, 카드 무관)
     * @param userIdx 사용자 IDX
     * @param projectIdx 프로젝트 IDX
     * @param documentDate 문서 날짜
     * @return 참석자 목록
     */
    @Query("""
        SELECT ra
        FROM ReceiptAttendee ra
        WHERE ra.userIdx = :userIdx
          AND ra.projectIdx = :projectIdx
          AND ra.documentDate = :documentDate
          AND ra.isDeleted = false
        ORDER BY ra.startTime
        """)
    List<ReceiptAttendee> findByUserAndProjectAndDateAllCards(
            @Param("userIdx") Long userIdx,
            @Param("projectIdx") Long projectIdx,
            @Param("documentDate") LocalDate documentDate
    );

    /**
     * 특정 문서 제외하고 중복 검증 (수정 시 사용)
     * @param userIdx 사용자 IDX
     * @param projectIdx 프로젝트 IDX
     * @param cardIdx 카드 IDX
     * @param documentDate 문서 날짜
     * @param excludeReceiptIdx 제외할 문서 IDX
     * @param excludeDocumentTypePrefix 제외할 문서 타입
     * @return 참석자 목록
     */
    @Query("""
        SELECT ra
        FROM ReceiptAttendee ra
        WHERE ra.userIdx = :userIdx
          AND ra.projectIdx = :projectIdx
          AND ra.cardIdx = :cardIdx
          AND ra.documentDate = :documentDate
          AND ra.isDeleted = false
          AND NOT (ra.receiptIdx = :excludeReceiptIdx AND ra.documentTypePrefix = :excludeDocumentTypePrefix)
        ORDER BY ra.startTime
        """)
    List<ReceiptAttendee> findByUserAndProjectAndCardAndDateExcluding(
            @Param("userIdx") Long userIdx,
            @Param("projectIdx") Long projectIdx,
            @Param("cardIdx") Long cardIdx,
            @Param("documentDate") LocalDate documentDate,
            @Param("excludeReceiptIdx") Long excludeReceiptIdx,
            @Param("excludeDocumentTypePrefix") String excludeDocumentTypePrefix
    );

    /**
     * 특정 문서 제외하고 중복 검증 (수정 시 사용, 카드 무관)
     * @param userIdx 사용자 IDX
     * @param projectIdx 프로젝트 IDX
     * @param documentDate 문서 날짜
     * @param excludeReceiptIdx 제외할 문서 IDX
     * @param excludeDocumentTypePrefix 제외할 문서 타입
     * @return 참석자 목록
     */
    @Query("""
        SELECT ra
        FROM ReceiptAttendee ra
        WHERE ra.userIdx = :userIdx
          AND ra.projectIdx = :projectIdx
          AND ra.documentDate = :documentDate
          AND ra.isDeleted = false
          AND NOT (ra.receiptIdx = :excludeReceiptIdx AND ra.documentTypePrefix = :excludeDocumentTypePrefix)
        ORDER BY ra.startTime
        """)
    List<ReceiptAttendee> findByUserAndProjectAndDateExcluding(
            @Param("userIdx") Long userIdx,
            @Param("projectIdx") Long projectIdx,
            @Param("documentDate") LocalDate documentDate,
            @Param("excludeReceiptIdx") Long excludeReceiptIdx,
            @Param("excludeDocumentTypePrefix") String excludeDocumentTypePrefix
    );

    // ==============================================
    // 참여기간 검증용 — Orphan 조회 (프로젝트 멤버 기간 단축 시 사용)
    // ==============================================

    /**
     * 특정 프로젝트 멤버의 새 참여기간 [newStart, newEnd] 밖에 위치한
     * 기존 참석자 레코드 조회 (orphan 검출용).
     *
     * - 외부 인원(isExternal = true)은 검증 대상이 아니므로 제외
     * - newEnd 가 NULL 이면 종료일 무한대로 간주 (시작일 이전만 체크)
     *
     * 구현 노트:
     *   PostgreSQL 은 prepared statement 의 untyped 파라미터를 IS NOT NULL 만으로
     *   추론할 수 없어 단일 쿼리로 두 케이스를 표현하면 "could not determine data type"
     *   에러가 발생한다. 따라서 newEnd 유무에 따라 두 쿼리를 분기한다.
     *
     * @param projectIdx  프로젝트 IDX
     * @param employeeIdx 멤버(직원) IDX
     * @param newStart    새 참여 시작일 (NOT NULL)
     * @param newEnd      새 참여 종료일 (NULL = 무한)
     * @return 새 기간 밖에 위치한 참석자 레코드 목록
     */
    default List<ReceiptAttendee> findOrphanedByMemberPeriod(
            Long projectIdx, Long employeeIdx, LocalDate newStart, LocalDate newEnd) {
        if (newEnd == null) {
            return findOrphanedByMemberPeriodOpenEnded(projectIdx, employeeIdx, newStart);
        }
        return findOrphanedByMemberPeriodBoundedEnd(projectIdx, employeeIdx, newStart, newEnd);
    }

    @Query("""
        SELECT ra
        FROM ReceiptAttendee ra
        WHERE ra.projectIdx = :projectIdx
          AND ra.userIdx = :employeeIdx
          AND ra.isExternal = false
          AND ra.isDeleted = false
          AND ra.documentDate < :newStart
        ORDER BY ra.documentDate
        """)
    List<ReceiptAttendee> findOrphanedByMemberPeriodOpenEnded(
            @Param("projectIdx") Long projectIdx,
            @Param("employeeIdx") Long employeeIdx,
            @Param("newStart") LocalDate newStart
    );

    @Query("""
        SELECT ra
        FROM ReceiptAttendee ra
        WHERE ra.projectIdx = :projectIdx
          AND ra.userIdx = :employeeIdx
          AND ra.isExternal = false
          AND ra.isDeleted = false
          AND (ra.documentDate < :newStart OR ra.documentDate > :newEnd)
        ORDER BY ra.documentDate
        """)
    List<ReceiptAttendee> findOrphanedByMemberPeriodBoundedEnd(
            @Param("projectIdx") Long projectIdx,
            @Param("employeeIdx") Long employeeIdx,
            @Param("newStart") LocalDate newStart,
            @Param("newEnd") LocalDate newEnd
    );

    /**
     * 특정 프로젝트의 내부 사용자 참석 레코드 전체 조회 (외부 인원 제외).
     * 멤버 비활성화(삭제) 시 — 해당 사용자의 모든 attendee 가 orphan 후보가 된다.
     */
    @Query("""
        SELECT ra
        FROM ReceiptAttendee ra
        WHERE ra.projectIdx = :projectIdx
          AND ra.userIdx = :employeeIdx
          AND ra.isExternal = false
          AND ra.isDeleted = false
        ORDER BY ra.documentDate
        """)
    List<ReceiptAttendee> findInternalByProjectAndUser(
            @Param("projectIdx") Long projectIdx,
            @Param("employeeIdx") Long employeeIdx
    );

    List<ReceiptAttendee> findByReceiptIdxAndDocumentTypePrefixAndIsExternalFalse(
            Long receiptIdx, String documentTypePrefix);
}
