package com.pinecni.erp.api.approval.service;

import com.pinecni.erp.api.approval.dto.ApprovalDocumentDTO;
import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.ApprovalDocument;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 전자 문서 Service 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApprovalDocumentServiceImpl implements ApprovalDocumentService {

    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final UserRepository userRepository;
    private final CodeRepository codeRepository;

    @Override
    public List<ApprovalDocumentDTO> getAllDocuments() {
        log.debug("[전체 문서 조회] 시작");

        List<ApprovalDocument> documents = approvalDocumentRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc();

        List<ApprovalDocumentDTO> result = documents.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        log.debug("[전체 문서 조회] 완료 - 총 {}건", result.size());
        return result;
    }

    @Override
    public List<ApprovalDocumentDTO> getDocumentsByType(String documentType) {
        log.debug("[문서 타입별 조회] documentType: {}", documentType);

        List<ApprovalDocument> documents = approvalDocumentRepository
                .findByDocumentTypeAndDeletedAtIsNullOrderByCreatedAtDesc(documentType);

        List<ApprovalDocumentDTO> result = documents.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        log.debug("[문서 타입별 조회] 완료 - 타입: {}, 총 {}건", documentType, result.size());
        return result;
    }

    @Override
    public List<ApprovalDocumentDTO> getDocumentsByDrafter(Long drafterUserIdx) {
        log.debug("[작성자별 조회] drafterUserIdx: {}", drafterUserIdx);

        List<ApprovalDocument> documents = approvalDocumentRepository
                .findByDrafterUserIdxAndDeletedAtIsNullOrderByCreatedAtDesc(drafterUserIdx);

        List<ApprovalDocumentDTO> result = documents.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        log.debug("[작성자별 조회] 완료 - userIdx: {}, 총 {}건", drafterUserIdx, result.size());
        return result;
    }

    /**
     * Entity → DTO 변환 (사용자 정보 포함)
     */
    private ApprovalDocumentDTO convertToDTO(ApprovalDocument document) {
        ApprovalDocumentDTO dto = ApprovalDocumentDTO.builder()
                .idx(document.getIdx())
                .documentNo(document.getDocumentNo())
                .title(document.getTitle())
                .documentType(document.getDocumentType())
                .drafterUserIdx(document.getDrafterUserIdx())
                .content(document.getContent())
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .build();

        // 작성자 정보 조회 및 설정
        userRepository.findById(document.getDrafterUserIdx()).ifPresent(user -> {
            dto.setDrafterName(user.getEmpName());
            dto.setDrafterDept(user.getEmpDept());

            // 부서명 조회
            if (user.getEmpDept() != null) {
                codeRepository.findByCode(user.getEmpDept()).ifPresent(code -> {
                    dto.setDrafterDeptName(code.getCodeName());
                });
            }
        });

        return dto;
    }
}
