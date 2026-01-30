package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.document.dto.ReceiptOvertimeAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptOvertimeCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptOvertimeDTO;
import com.pinecni.erp.api.document.dto.ReceiptOvertimePersonDTO;
import com.pinecni.erp.api.document.mapper.ReceiptOvertimeMapper;
import com.pinecni.erp.api.document.repository.ReceiptOvertimeAttachmentRepository;
import com.pinecni.erp.api.document.repository.ReceiptOvertimePersonRepository;
import com.pinecni.erp.api.document.repository.ReceiptOvertimeRepository;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.entity.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 연구비증빙 야근식대 Service 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReceiptOvertimeServiceImpl implements ReceiptOvertimeService {

    private final ReceiptOvertimeRepository receiptOvertimeRepository;
    private final ReceiptOvertimePersonRepository personRepository;
    private final ReceiptOvertimeAttachmentRepository attachmentRepository;
    private final ReceiptOvertimeMapper mapper;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final ProjectRepository projectRepository;

    @Value("${file.upload.path:/uploads/receipt-overtimes}")
    private String uploadPath;

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptOvertimeDTO> getAllReceiptOvertimes() {
        log.debug("전체 야근식대 목록 조회");
        return receiptOvertimeRepository.findAllByOrderByOvertimeDateDesc()
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ReceiptOvertimeDTO getReceiptOvertimeById(Long idx) {
        log.debug("야근식대 상세 조회 - idx: {}", idx);

        ReceiptOvertime entity = receiptOvertimeRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("야근식대를 찾을 수 없습니다. idx: " + idx));

        List<ReceiptOvertimePerson> persons = personRepository.findByReceiptOvertimeIdx(idx);
        List<ReceiptOvertimeAttachment> attachments = attachmentRepository.findByReceiptOvertimeIdx(idx);

        return mapper.toDTOWithDetails(entity, persons, attachments);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptOvertimeDTO> getReceiptOvertimesByProjectIdx(Long projectIdx) {
        log.debug("프로젝트별 야근식대 목록 조회 - projectIdx: {}", projectIdx);
        return receiptOvertimeRepository.findByProjectIdxOrderByOvertimeDateDesc(projectIdx)
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptOvertimeDTO> getReceiptOvertimesByAuthorIdx(Long authorIdx) {
        log.debug("작성자별 야근식대 목록 조회 - authorIdx: {}", authorIdx);
        return receiptOvertimeRepository.findByAuthorIdxOrderByOvertimeDateDesc(authorIdx)
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptOvertimeDTO> getReceiptOvertimesByStatus(String status) {
        log.debug("상태별 야근식대 목록 조회 - status: {}", status);
        return receiptOvertimeRepository.findByStatusOrderByOvertimeDateDesc(status)
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ReceiptOvertimeDTO createReceiptOvertime(ReceiptOvertimeCreateDTO createDTO) {
        log.debug("야근식대 생성 - projectIdx: {}, authorIdx: {}", createDTO.getProjectIdx(), createDTO.getAuthorIdx());

        try {
            // 1. 프로젝트 조회
            Project project = projectRepository.findById(createDTO.getProjectIdx())
                    .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다. idx: " + createDTO.getProjectIdx()));

            // 2. 문서번호 생성
            String documentNumber = generateDocumentNumber(createDTO.getProjectIdx());

            // 3. ApprovalDocument 메타데이터 저장
            String documentNo = "RECEIPT-OVERTIME-" + System.currentTimeMillis() + "-" + createDTO.getApprovalDate();
            String title = "연구비증빙 야근식대";
            if (createDTO.getDocumentTitle() != null && !createDTO.getDocumentTitle().isEmpty()) {
                title = "연구비증빙 야근식대 - " + createDTO.getDocumentTitle();
            }

            ApprovalDocument approvalDocument = ApprovalDocument.builder()
                    .documentNo(documentNo)
                    .title(title)
                    .documentType("연구비증빙(야근식대)")
                    .isProject(true)
                    .drafterUserIdx(createDTO.getAuthorIdx())
                    .content(createDTO.getDocumentContent())
                    .createdUserIdx(createDTO.getAuthorIdx())
                    .updatedUserIdx(createDTO.getAuthorIdx())
                    .build();

            ApprovalDocument savedDocument = approvalDocumentRepository.save(approvalDocument);
            log.debug("ApprovalDocument created - documentIdx: {}, documentNo: {}",
                    savedDocument.getIdx(), savedDocument.getDocumentNo());

            // 4. 야근식대 Entity 생성 및 저장
            Instant now = Instant.now();
            ReceiptOvertime entity = new ReceiptOvertime();
            entity.setProjectIdx(project);
            entity.setDocumentNumber(documentNumber);
            entity.setDocumentIdx(savedDocument.getIdx());
            entity.setAuthorIdx(createDTO.getAuthorIdx());
            entity.setAuthorName(createDTO.getAuthorName());
            entity.setOvertimeDate(createDTO.getOvertimeDate());
            entity.setApprovalDate(createDTO.getApprovalDate());
            entity.setDocumentTitle(createDTO.getDocumentTitle());
            entity.setDocumentContent(createDTO.getDocumentContent());
            entity.setTotalAmount(createDTO.getTotalAmount());
            entity.setPaymentType(createDTO.getPaymentType());
            entity.setStatus("PENDING");
            entity.setCreatedAt(now);
            entity.setUpdatedAt(now);

            entity = receiptOvertimeRepository.save(entity);

            // 5. 인원 목록 저장
            if (createDTO.getPersons() != null && !createDTO.getPersons().isEmpty()) {
                final ReceiptOvertime savedOvertime = entity;
                List<ReceiptOvertimePerson> persons = createDTO.getPersons().stream()
                        .map(dto -> {
                            ReceiptOvertimePerson person = new ReceiptOvertimePerson();
                            person.setReceiptOvertimeIdx(savedOvertime);
                            person.setName(dto.getName());
                            person.setWorkTime(dto.getWorkTime());
                            person.setWorkTask(dto.getWorkTask());
                            person.setCreatedAt(now);
                            person.setUpdatedAt(now);
                            return person;
                        })
                        .collect(Collectors.toList());
                personRepository.saveAll(persons);
            }

            // 6. 저장된 데이터 재조회
            List<ReceiptOvertimePerson> savedPersons = personRepository.findByReceiptOvertimeIdx(entity.getId());

            log.info("야근식대 생성 완료 - idx: {}, documentNumber: {}", entity.getId(), documentNumber);
            return mapper.toDTOWithDetails(entity, savedPersons, Collections.emptyList());

        } catch (Exception e) {
            log.error("연구비증빙 야근식대 생성 실패 - projectIdx: {}, authorIdx: {}, error: {}",
                    createDTO.getProjectIdx(), createDTO.getAuthorIdx(), e.getMessage(), e);
            throw new RuntimeException("연구비증빙 야근식대 저장 중 오류가 발생했습니다.\n잠시 후 다시 시도하거나 관리자에게 문의해주세요.", e);
        }
    }

    @Override
    @Transactional
    public void deleteReceiptOvertime(Long idx) {
        log.debug("야근식대 삭제 - idx: {}", idx);

        ReceiptOvertime entity = receiptOvertimeRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("야근식대를 찾을 수 없습니다. idx: " + idx));

        // 연결된 ApprovalDocument 소프트 딜리트
        if (entity.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(entity.getDocumentIdx()).ifPresent(approvalDocument -> {
                LocalDateTime now = LocalDateTime.now();
                approvalDocument.setDeletedAt(now);
                approvalDocument.setDeletedUserIdx(entity.getAuthorIdx());
                approvalDocumentRepository.save(approvalDocument);
                log.debug("ApprovalDocument soft deleted - documentIdx: {}, deletedAt: {}",
                        entity.getDocumentIdx(), now);
            });
        }

        receiptOvertimeRepository.delete(entity);
        log.info("야근식대 삭제 완료 - idx: {}", idx);
    }

    @Override
    public String generateDocumentNumber(Long projectIdx) {
        // 문서번호 형식: RO-{projectIdx}-{YYYYMMDD}-{순번}
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String prefix = String.format("RO-%d-%s", projectIdx, dateStr);

        // 같은 날짜의 문서 개수 조회하여 순번 생성
        long count = receiptOvertimeRepository.findAll().stream()
                .filter(ro -> ro.getDocumentNumber() != null && ro.getDocumentNumber().startsWith(prefix))
                .count();

        return String.format("%s-%03d", prefix, count + 1);
    }

    @Override
    @Transactional
    public List<ReceiptOvertimeAttachmentDTO> saveAttachments(Long receiptOvertimeIdx, MultipartFile[] files) {
        log.debug("첨부파일 저장 - receiptOvertimeIdx: {}, 파일 개수: {}", receiptOvertimeIdx, files != null ? files.length : 0);

        if (files == null || files.length == 0) {
            return Collections.emptyList();
        }

        // 야근식대 존재 확인
        ReceiptOvertime overtime = receiptOvertimeRepository.findById(receiptOvertimeIdx)
                .orElseThrow(() -> new IllegalArgumentException("야근식대를 찾을 수 없습니다. IDX: " + receiptOvertimeIdx));

        // 업로드 디렉토리 생성
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        String fullUploadPath = uploadPath + "/" + datePath + "/" + receiptOvertimeIdx;
        File uploadDir = new File(fullUploadPath);
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }

        List<ReceiptOvertimeAttachmentDTO> savedAttachments = new ArrayList<>();
        Instant now = Instant.now();

        for (MultipartFile file : files) {
            if (file.isEmpty()) {
                continue;
            }

            try {
                // 원본 파일명
                String originalFilename = file.getOriginalFilename();
                if (originalFilename == null) {
                    originalFilename = "unnamed_file";
                }

                // 고유 파일명 생성 (타임스탬프 + UUID)
                String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
                String uuid = UUID.randomUUID().toString().substring(0, 8);
                String extension = "";
                int dotIndex = originalFilename.lastIndexOf('.');
                if (dotIndex > 0) {
                    extension = originalFilename.substring(dotIndex);
                }
                String savingFilename = timestamp + "_" + uuid + extension;

                // 파일 저장
                Path filePath = Paths.get(fullUploadPath, savingFilename);
                Files.copy(file.getInputStream(), filePath);

                // DB 저장
                ReceiptOvertimeAttachment attachment = new ReceiptOvertimeAttachment();
                attachment.setReceiptOvertimeIdx(overtime);
                attachment.setOriginalFilename(originalFilename);
                attachment.setSavingFilename(savingFilename);
                attachment.setFilePath(filePath.toString());
                attachment.setFileSize(file.getSize());
                attachment.setFileType(file.getContentType());
                attachment.setCreatedAt(now);
                attachment.setUpdatedAt(now);

                ReceiptOvertimeAttachment saved = attachmentRepository.save(attachment);

                savedAttachments.add(mapper.toAttachmentDTO(saved));

                log.debug("첨부파일 저장 완료 - 원본명: {}, 저장명: {}", originalFilename, savingFilename);

            } catch (IOException e) {
                log.error("파일 저장 실패: {}", file.getOriginalFilename(), e);
                throw new RuntimeException("파일 저장 중 오류가 발생했습니다: " + file.getOriginalFilename(), e);
            }
        }

        return savedAttachments;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptOvertimeAttachmentDTO> getAttachmentsByReceiptOvertimeIdx(Long receiptOvertimeIdx) {
        log.debug("야근식대 첨부파일 목록 조회 - receiptOvertimeIdx: {}", receiptOvertimeIdx);

        return attachmentRepository.findByReceiptOvertimeIdx(receiptOvertimeIdx)
                .stream()
                .map(mapper::toAttachmentDTO)
                .collect(Collectors.toList());
    }
}
