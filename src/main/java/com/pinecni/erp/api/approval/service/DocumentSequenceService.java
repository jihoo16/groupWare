package com.pinecni.erp.api.approval.service;

import com.pinecni.erp.api.approval.repository.DocumentSequenceRepository;
import com.pinecni.erp.entity.DocumentSequence;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Year;

/**
 * 문서 번호 시퀀스 관리 Service
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentSequenceService {

    private final DocumentSequenceRepository documentSequenceRepository;

    /**
     * 문서 번호 생성 및 시퀀스 증가
     * - 동시성 보장을 위해 Transactional 사용
     * - 해당 문서 타입의 시퀀스가 없으면 생성
     *
     * @param documentType 문서 타입 (예: "연구비증빙-회의록", "연차신청서")
     * @param prefix 문서 번호 prefix (예: "RCM", "VAC")
     * @param currentUserIdx 생성자 IDX
     * @return 생성된 문서 번호 (예: "RCM-2026-0001")
     */
    @Transactional
    public String generateDocumentNumber(String documentType, String prefix, Long currentUserIdx) {
        int currentYear = Year.now().getValue();

        // 해당 문서 타입 + 연도의 시퀀스 조회 또는 생성
        DocumentSequence sequence = documentSequenceRepository
                .findByDocumentTypeAndYear(documentType, currentYear)
                .orElseGet(() -> createNewSequence(documentType, prefix, currentYear, currentUserIdx));

        // 시퀀스 증가
        sequence.setLastNumber(sequence.getLastNumber() + 1);
        sequence.setCurrentSequence(sequence.getLastNumber());
        sequence.setUpdatedAt(LocalDateTime.now());
        sequence.setUpdatedUserIdx(currentUserIdx);

        // 저장
        documentSequenceRepository.save(sequence);

        // 문서 번호 생성: PREFIX-YYYY-NNNN
        String documentNumber = String.format("%s-%04d-%04d", prefix, currentYear, sequence.getLastNumber());

        log.debug("문서 번호 생성 완료 - documentType: {}, documentNumber: {}, lastNumber: {}",
                documentType, documentNumber, sequence.getLastNumber());

        return documentNumber;
    }

    /**
     * 새로운 시퀀스 생성
     */
    private DocumentSequence createNewSequence(String documentType, String prefix, int year, Long currentUserIdx) {
        log.debug("새로운 시퀀스 생성 - documentType: {}, prefix: {}, year: {}", documentType, prefix, year);

        DocumentSequence newSequence = DocumentSequence.builder()
                .documentType(documentType)
                .prefix(prefix)
                .year(year)
                .lastNumber(0)
                .currentSequence(0)
                .createdAt(LocalDateTime.now())
                .createdUserIdx(currentUserIdx)
                .updatedAt(LocalDateTime.now())
                .updatedUserIdx(currentUserIdx)
                .build();

        return documentSequenceRepository.save(newSequence);
    }

    /**
     * 특정 문서 타입의 현재 시퀀스 번호 조회
     *
     * @param documentType 문서 타입
     * @return 현재 시퀀스 번호 (없으면 0)
     */
    @Transactional(readOnly = true)
    public int getCurrentSequenceNumber(String documentType) {
        int currentYear = Year.now().getValue();

        return documentSequenceRepository
                .findByDocumentTypeAndYear(documentType, currentYear)
                .map(DocumentSequence::getLastNumber)
                .orElse(0);
    }

    /**
     * 특정 문서 타입의 시퀀스 초기화 (주의: 관리자 기능)
     *
     * @param documentType 문서 타입
     * @param currentUserIdx 수정자 IDX
     */
    @Transactional
    public void resetSequence(String documentType, Long currentUserIdx) {
        int currentYear = Year.now().getValue();

        documentSequenceRepository
                .findByDocumentTypeAndYear(documentType, currentYear)
                .ifPresent(sequence -> {
                    sequence.setLastNumber(0);
                    sequence.setCurrentSequence(0);
                    sequence.setUpdatedAt(LocalDateTime.now());
                    sequence.setUpdatedUserIdx(currentUserIdx);
                    documentSequenceRepository.save(sequence);
                    log.warn("시퀀스 초기화 - documentType: {}, year: {}, userIdx: {}",
                            documentType, currentYear, currentUserIdx);
                });
    }
}
