package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ReceiptTripAttendee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ReceiptTripAttendee Repository
 * 연구비증빙 출장 참석자/동행자 조회
 */
@Repository
public interface ReceiptTripAttendeeRepository extends JpaRepository<ReceiptTripAttendee, Long> {

    /**
     * 출장별 참석자 목록 조회
     */
    List<ReceiptTripAttendee> findByReceiptTripIdxOrderByDisplayOrder(Long receiptTripIdx);

    /**
     * 출장의 모든 참석자 삭제
     */
    void deleteByReceiptTripIdx(Long receiptTripIdx);
}
