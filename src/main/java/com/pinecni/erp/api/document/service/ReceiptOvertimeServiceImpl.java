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
import com.pinecni.erp.service.PdfGenerationService;
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
import java.time.ZoneId;
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
    private final PdfGenerationService pdfGenerationService;

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
    public ReceiptOvertimeDTO getReceiptOvertimeByDocumentIdx(Long documentIdx) {
        log.debug("ApprovalDocument IDX로 야근식대 조회 - documentIdx: {}", documentIdx);

        ReceiptOvertime entity = receiptOvertimeRepository.findByDocumentIdx(documentIdx)
                .orElseThrow(() -> new IllegalArgumentException("야근식대를 찾을 수 없습니다. documentIdx: " + documentIdx));

        List<ReceiptOvertimePerson> persons = personRepository.findByReceiptOvertimeIdx(entity.getId());
        List<ReceiptOvertimeAttachment> attachments = attachmentRepository.findByReceiptOvertimeIdx(entity.getId());

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
            Instant now = LocalDateTime.now().atZone(ZoneId.of("Asia/Seoul")).toInstant();
            ReceiptOvertime entity = new ReceiptOvertime();
            entity.setProjectIdx(project);
            entity.setCardIdx(createDTO.getCardIdx());
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

            // 7. PDF 생성 및 저장
            generateAndSaveReceiptOvertimePdf(createDTO, entity, savedDocument);

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
    public ReceiptOvertimeDTO updateReceiptOvertime(Long idx, ReceiptOvertimeCreateDTO updateDTO) {
        log.debug("야근식대 수정 - idx: {}", idx);

        try {
            // 1. 기존 야근식대 조회
            ReceiptOvertime entity = receiptOvertimeRepository.findById(idx)
                    .orElseThrow(() -> new IllegalArgumentException("야근식대를 찾을 수 없습니다. idx: " + idx));

            // 2. 프로젝트 변경 시 프로젝트 조회
            if (updateDTO.getProjectIdx() != null && !updateDTO.getProjectIdx().equals(entity.getProjectIdx().getIdx())) {
                Project project = projectRepository.findById(updateDTO.getProjectIdx())
                        .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다. idx: " + updateDTO.getProjectIdx()));
                entity.setProjectIdx(project);
            }

            // 3. 엔터티 수정
            Instant now = LocalDateTime.now().atZone(ZoneId.of("Asia/Seoul")).toInstant();
            entity.setCardIdx(updateDTO.getCardIdx());
            entity.setOvertimeDate(updateDTO.getOvertimeDate());
            entity.setApprovalDate(updateDTO.getApprovalDate());
            entity.setDocumentTitle(updateDTO.getDocumentTitle());
            entity.setDocumentContent(updateDTO.getDocumentContent());
            entity.setTotalAmount(updateDTO.getTotalAmount());
            entity.setPaymentType(updateDTO.getPaymentType());
            entity.setUpdatedAt(now);

            entity = receiptOvertimeRepository.save(entity);

            // 4. 기존 인원 삭제 후 새로 저장
            List<ReceiptOvertimePerson> existingPersons = personRepository.findByReceiptOvertimeIdx(entity.getId());
            personRepository.deleteAll(existingPersons);

            if (updateDTO.getPersons() != null && !updateDTO.getPersons().isEmpty()) {
                final ReceiptOvertime savedOvertime = entity;
                List<ReceiptOvertimePerson> persons = updateDTO.getPersons().stream()
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

            // 5. ApprovalDocument 제목 업데이트
            if (entity.getDocumentIdx() != null) {
                approvalDocumentRepository.findById(entity.getDocumentIdx()).ifPresent(approvalDocument -> {
                    String title = "연구비증빙 야근식대";
                    if (updateDTO.getDocumentTitle() != null && !updateDTO.getDocumentTitle().isEmpty()) {
                        title = "연구비증빙 야근식대 - " + updateDTO.getDocumentTitle();
                    }
                    approvalDocument.setTitle(title);
                    approvalDocument.setContent(updateDTO.getDocumentContent());
                    approvalDocument.setUpdatedUserIdx(updateDTO.getAuthorIdx());
                    approvalDocumentRepository.save(approvalDocument);
                });
            }

            // 6. 저장된 데이터 재조회
            List<ReceiptOvertimePerson> savedPersons = personRepository.findByReceiptOvertimeIdx(entity.getId());
            List<ReceiptOvertimeAttachment> attachments = attachmentRepository.findByReceiptOvertimeIdx(entity.getId());

            // 7. PDF 재생성 및 저장
            final ReceiptOvertime savedEntity = entity;
            if (savedEntity.getDocumentIdx() != null) {
                approvalDocumentRepository.findById(savedEntity.getDocumentIdx()).ifPresent(approvalDocument -> {
                    generateAndSaveReceiptOvertimePdf(updateDTO, savedEntity, approvalDocument);
                });
            }

            log.info("야근식대 수정 완료 - idx: {}", entity.getId());
            return mapper.toDTOWithDetails(entity, savedPersons, attachments);

        } catch (Exception e) {
            log.error("연구비증빙 야근식대 수정 실패 - idx: {}, error: {}", idx, e.getMessage(), e);
            throw new RuntimeException("연구비증빙 야근식대 수정 중 오류가 발생했습니다.\n잠시 후 다시 시도하거나 관리자에게 문의해주세요.", e);
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
        Instant now = LocalDateTime.now().atZone(ZoneId.of("Asia/Seoul")).toInstant();

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

    @Override
    @Transactional
    public void deleteAttachment(Long attachmentIdx) {
        log.debug("첨부파일 삭제 - attachmentIdx: {}", attachmentIdx);

        ReceiptOvertimeAttachment attachment = attachmentRepository.findById(attachmentIdx)
                .orElseThrow(() -> new IllegalArgumentException("첨부파일을 찾을 수 없습니다. idx: " + attachmentIdx));

        // 실제 파일 삭제
        try {
            Path filePath = Paths.get(attachment.getFilePath());
            Files.deleteIfExists(filePath);
            log.debug("파일 삭제 완료: {}", filePath);
        } catch (IOException e) {
            log.error("파일 삭제 실패: {}", attachment.getFilePath(), e);
            // 파일 삭제 실패해도 DB 레코드는 삭제 진행
        }

        // DB 레코드 삭제
        attachmentRepository.delete(attachment);
        log.info("첨부파일 삭제 완료 - attachmentIdx: {}", attachmentIdx);
    }

    @Override
    @Transactional(readOnly = true)
    public ReceiptOvertimeAttachmentDTO getAttachmentById(Long attachmentIdx) {
        log.debug("첨부파일 상세 조회 - attachmentIdx: {}", attachmentIdx);

        ReceiptOvertimeAttachment attachment = attachmentRepository.findById(attachmentIdx)
                .orElseThrow(() -> new IllegalArgumentException("첨부파일을 찾을 수 없습니다. idx: " + attachmentIdx));

        return mapper.toAttachmentDTO(attachment);
    }

    /**
     * 연구비증빙 야근식대 PDF 생성 및 저장 (품의서, 야근신청서 각각 저장)
     *
     * @param createDTO     생성 요청 DTO (렌더링된 HTML/CSS 포함)
     * @param saved         저장된 ReceiptOvertime 엔티티
     * @param savedDocument 저장된 ApprovalDocument 엔티티
     */
    private void generateAndSaveReceiptOvertimePdf(ReceiptOvertimeCreateDTO createDTO,
                                                    ReceiptOvertime saved,
                                                    ApprovalDocument savedDocument) {
        String year = String.valueOf(LocalDateTime.now().getYear());
        String projectIdx = saved.getProjectIdx() != null ? saved.getProjectIdx().getIdx().toString() : "0";
        String overtimeDate = saved.getOvertimeDate() != null ?
            saved.getOvertimeDate().format(DateTimeFormatter.ofPattern("yyyyMMdd")) :
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String renderedCss = createDTO.getRenderedCss() != null ? createDTO.getRenderedCss() : "";

        // 1. 품의서 PDF 생성
        try {
            if (createDTO.getApprovalHtml() != null && !createDTO.getApprovalHtml().isEmpty()) {
                log.info("[품의서 PDF 생성] documentIdx: {}, receiptOvertimeId: {}",
                         savedDocument.getIdx(), saved.getId());

                String fullHtml = buildFullHtml("품의서", createDTO.getApprovalHtml(), renderedCss);
                byte[] pdfBytes = pdfGenerationService.generatePdfFromRenderedHtml(fullHtml);

                String fileName = String.format("품의서_%s_%s.pdf", overtimeDate, projectIdx);
                String savePath = pdfGenerationService.saveReceiptOvertimePdf(pdfBytes, fileName, year, projectIdx);
                log.info("[품의서 PDF 저장 완료] path: {}", savePath);
            } else {
                log.warn("[품의서 PDF 생성 스킵] approvalHtml이 비어있음 - documentIdx: {}", savedDocument.getIdx());
            }
        } catch (Exception e) {
            log.error("[품의서 PDF 생성 실패] documentIdx: {}, error: {}", savedDocument.getIdx(), e.getMessage(), e);
        }

        // 2. 야근신청서 PDF 생성
        try {
            if (createDTO.getOvertimeHtml() != null && !createDTO.getOvertimeHtml().isEmpty()) {
                log.info("[야근신청서 PDF 생성] documentIdx: {}, receiptOvertimeId: {}",
                         savedDocument.getIdx(), saved.getId());

                String fullHtml = buildFullHtml("야근신청서", createDTO.getOvertimeHtml(), renderedCss);
                byte[] pdfBytes = pdfGenerationService.generatePdfFromRenderedHtml(fullHtml);

                String fileName = String.format("야근신청서_%s_%s.pdf", overtimeDate, projectIdx);
                String savePath = pdfGenerationService.saveReceiptOvertimePdf(pdfBytes, fileName, year, projectIdx);
                log.info("[야근신청서 PDF 저장 완료] path: {}", savePath);
            } else {
                log.warn("[야근신청서 PDF 생성 스킵] overtimeHtml이 비어있음 - documentIdx: {}", savedDocument.getIdx());
            }
        } catch (Exception e) {
            log.error("[야근신청서 PDF 생성 실패] documentIdx: {}, error: {}", savedDocument.getIdx(), e.getMessage(), e);
        }
    }

    /**
     * 완전한 HTML 문서 빌드 (PDF 변환용)
     */
    private String buildFullHtml(String title, String bodyHtml, String css) {
        return "<!DOCTYPE html>\n" +
                "<html lang=\"ko\">\n" +
                "<head>\n" +
                "    <meta charset=\"UTF-8\">\n" +
                "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                "    <title>" + title + "</title>\n" +
                "    <style>\n" +
                "        @page { margin: 15mm 20mm; }\n" +
                "        body { margin: 0; padding: 0; font-family: 'Malgun Gothic', sans-serif; }\n" +
                css + "\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                bodyHtml + "\n" +
                "</body>\n" +
                "</html>";
    }
}
