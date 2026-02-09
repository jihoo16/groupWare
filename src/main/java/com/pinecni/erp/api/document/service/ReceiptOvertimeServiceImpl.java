package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.approval.repository.DocumentSequenceRepository;
import com.pinecni.erp.api.document.dto.ReceiptOvertimeAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptOvertimeCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptOvertimeDTO;
import com.pinecni.erp.api.document.dto.ReceiptOvertimeAttendeeDTO;
import com.pinecni.erp.api.document.mapper.ReceiptOvertimeMapper;
import com.pinecni.erp.api.document.repository.ReceiptOvertimeAttachmentRepository;
import com.pinecni.erp.api.document.repository.ReceiptAttendeeRepository;
import com.pinecni.erp.api.document.repository.ReceiptOvertimeRepository;
import com.pinecni.erp.api.project.repository.ProjectCardRepository;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
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
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private final ReceiptAttendeeRepository attendeeRepository;
    private final ReceiptOvertimeAttachmentRepository attachmentRepository;
    private final ReceiptOvertimeMapper mapper;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final DocumentSequenceRepository documentSequenceRepository;
    private final ProjectRepository projectRepository;
    private final ProjectCardRepository projectCardRepository;
    private final UserRepository userRepository;

    private static final String DOCUMENT_TYPE = "receipt_overtime"; // document_sequences.document_type
    private static final String DOCUMENT_TYPE_PREFIX = "RCO"; // 문서번호 prefix (RCO-2026-001)

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

        List<ReceiptAttendee> attendees = attendeeRepository.findByReceiptOvertimeIdx(idx);
        List<ReceiptOvertimeAttachment> attachments = attachmentRepository.findByReceiptOvertimeIdx(idx);

        ReceiptOvertimeDTO dto = mapper.toDTOWithDetails(entity, convertAttendeesToDTO(attendees), attachments);
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public ReceiptOvertimeDTO getReceiptOvertimeByDocumentIdx(Long documentIdx) {
        log.debug("ApprovalDocument IDX로 야근식대 조회 - documentIdx: {}", documentIdx);

        ReceiptOvertime entity = receiptOvertimeRepository.findByDocumentIdx(documentIdx)
                .orElseThrow(() -> new IllegalArgumentException("야근식대를 찾을 수 없습니다. documentIdx: " + documentIdx));

        List<ReceiptAttendee> attendees = attendeeRepository.findByReceiptOvertimeIdx(entity.getId());
        List<ReceiptOvertimeAttachment> attachments = attachmentRepository.findByReceiptOvertimeIdx(entity.getId());

        ReceiptOvertimeDTO dto = mapper.toDTOWithDetails(entity, convertAttendeesToDTO(attendees), attachments);
        return dto;
    }

    /**
     * ReceiptAttendee 목록을 ReceiptOvertimeAttendeeDTO 목록으로 변환
     */
    private List<ReceiptOvertimeAttendeeDTO> convertAttendeesToDTO(List<ReceiptAttendee> attendees) {
        if (attendees == null || attendees.isEmpty()) {
            return Collections.emptyList();
        }

        return attendees.stream()
                .map(attendee -> {
                    ReceiptOvertimeAttendeeDTO dto = ReceiptOvertimeAttendeeDTO.builder()
                            .idx(attendee.getIdx())
                            .receiptOvertimeIdx(attendee.getReceiptIdx())
                            .userIdx(attendee.getUserIdx())
                            .workTime(formatWorkTime(attendee.getStartTime(), attendee.getEndTime()))
                            .workTask(attendee.getWorkTask())
                            .createdAt(attendee.getCreatedAt())
                            .updatedAt(attendee.getUpdatedAt())
                            .build();

                    // 사용자 이름 조회
                    if (attendee.getUserIdx() != null) {
                        userRepository.findById(attendee.getUserIdx()).ifPresent(user -> {
                            dto.setUserName(user.getEmpName());
                        });
                    }

                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * 시작/종료 시간을 "HH:mm ~ HH:mm" 형식으로 변환
     */
    private String formatWorkTime(LocalTime startTime, LocalTime endTime) {
        if (startTime == null || endTime == null) {
            return "";
        }
        return startTime.format(DateTimeFormatter.ofPattern("HH:mm")) + " ~ " +
               endTime.format(DateTimeFormatter.ofPattern("HH:mm"));
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
        return null;
    }

    @Override
    @Transactional
    public ReceiptOvertimeDTO createReceiptOvertime(ReceiptOvertimeCreateDTO createDTO, Long currentUserIdx) {
        log.debug("야근식대 생성 - projectIdx: {}, authorIdx: {}, currentUserIdx: {}", createDTO.getProjectIdx(), createDTO.getAuthorIdx(), currentUserIdx);

        try {
            // 1. 프로젝트 조회
            Project project = projectRepository.findById(createDTO.getProjectIdx())
                    .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다. idx: " + createDTO.getProjectIdx()));

            // 2. document_sequences를 이용한 문서번호 생성 (RCO-year-number)
            String documentNo = generateDocumentNo(currentUserIdx);

            // 3. ApprovalDocument 메타데이터 저장
            // 제목 형식: 프로젝트이름 (카드번호) - YYYY-MM-DD/사용금액
            String projectName = project.getProjectName();
            String cardNumber = "";
            if (createDTO.getCardIdx() != null) {
                ProjectCard card = projectCardRepository.findById(createDTO.getCardIdx()).orElse(null);
                if (card != null) {
                    cardNumber = card.getCardLastDigits() != null ? card.getCardLastDigits() : "";
                }
            }
            String dateStr = createDTO.getApprovalDate() != null
                    ? createDTO.getApprovalDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                    : "";
            String amountStr = createDTO.getTotalAmount() != null
                    ? String.format("%,d", createDTO.getTotalAmount().longValue())
                    : "0";

            String title = String.format("%s (%s) - %s/%s원", projectName, cardNumber, dateStr, amountStr);

            ApprovalDocument approvalDocument = ApprovalDocument.builder()
                    .documentNo(documentNo)
                    .title(title)
                    .documentType("연구비증빙(야근식대)")
                    .isProject(true)
                    .drafterUserIdx(createDTO.getAuthorIdx())
                    .content(createDTO.getDocumentContent())
                    .createdUserIdx(currentUserIdx)
                    .updatedUserIdx(currentUserIdx)
                    .build();

            ApprovalDocument savedDocument = approvalDocumentRepository.save(approvalDocument);
            log.debug("ApprovalDocument created - documentIdx: {}, documentNo: {}", savedDocument.getIdx(), documentNo);

            // 4. 야근식대 Entity 생성 및 저장
            LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
            ReceiptOvertime entity = new ReceiptOvertime();
            entity.setProjectIdx(project);
            entity.setCardIdx(createDTO.getCardIdx());
            entity.setDocumentIdx(savedDocument.getIdx());
            entity.setAuthorIdx(createDTO.getAuthorIdx());
            entity.setOvertimeDate(createDTO.getOvertimeDate());
            entity.setApprovalDate(createDTO.getApprovalDate());
            entity.setDocumentTitle(createDTO.getDocumentTitle());
            entity.setDocumentContent(createDTO.getDocumentContent());
            entity.setTotalAmount(createDTO.getTotalAmount());
            entity.setCreatedAt(now);
            entity.setUpdatedAt(now);
            entity.setCreatedUserIdx(currentUserIdx);
            entity.setUpdatedUserIdx(currentUserIdx);
            entity.setIsDeleted(false);

            entity = receiptOvertimeRepository.save(entity);

            // 5. 참석자 목록 저장 (receipt_attendee 테이블)
            if (createDTO.getAttendees() != null && !createDTO.getAttendees().isEmpty()) {
                final ReceiptOvertime savedOvertime = entity;
                int displayOrder = 0;
                for (ReceiptOvertimeAttendeeDTO dto : createDTO.getAttendees()) {
                    ReceiptAttendee attendee = ReceiptAttendee.builder()
                            .documentTypePrefix(DOCUMENT_TYPE_PREFIX)
                            .receiptIdx(savedOvertime.getId())
                            .projectIdx(createDTO.getProjectIdx())
                            .cardIdx(createDTO.getCardIdx())
                            .userIdx(dto.getUserIdx())
                            .isExternal(false)
                            .documentDate(createDTO.getOvertimeDate())
                            .startTime(parseStartTime(dto.getWorkTime()))
                            .endTime(parseEndTime(dto.getWorkTime()))
                            .displayOrder(displayOrder++)
                            .workTask(dto.getWorkTask())
                            .createdAt(now)
                            .createdUserIdx(currentUserIdx)
                            .updatedAt(now)
                            .updatedUserIdx(currentUserIdx)
                            .isDeleted(false)
                            .build();
                    attendeeRepository.save(attendee);
                }
            }

            // 6. 저장된 데이터 재조회
            List<ReceiptAttendee> savedAttendees = attendeeRepository.findByReceiptOvertimeIdx(entity.getId());

            log.info("야근식대 생성 완료 - idx: {}", entity.getId());
            return mapper.toDTOWithDetails(entity, convertAttendeesToDTO(savedAttendees), Collections.emptyList());

        } catch (Exception e) {
            log.error("연구비증빙 야근식대 생성 실패 - projectIdx: {}, authorIdx: {}, error: {}",
                    createDTO.getProjectIdx(), createDTO.getAuthorIdx(), e.getMessage(), e);
            throw new RuntimeException("연구비증빙 야근식대 저장 중 오류가 발생했습니다.\n잠시 후 다시 시도하거나 관리자에게 문의해주세요.", e);
        }
    }

    /**
     * document_sequences 테이블을 이용한 문서번호 생성
     * 형식: RCO-year-number (예: RCO-2026-001)
     */
    private String generateDocumentNo(Long currentUserIdx) {
        int currentYear = LocalDateTime.now(ZoneId.of("Asia/Seoul")).getYear();
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));

        // 해당 연도의 시퀀스 조회 또는 생성
        DocumentSequence sequence = documentSequenceRepository
                .findByDocumentTypeAndYear(DOCUMENT_TYPE, currentYear)
                .orElseGet(() -> {
                    DocumentSequence newSequence = DocumentSequence.builder()
                            .documentType(DOCUMENT_TYPE)
                            .prefix(DOCUMENT_TYPE_PREFIX)
                            .year(currentYear)
                            .lastNumber(0)
                            .currentSequence(0)
                            .createdAt(now)
                            .createdUserIdx(currentUserIdx)
                            .build();
                    return documentSequenceRepository.save(newSequence);
                });

        // last_number 증가
        sequence.setLastNumber(sequence.getLastNumber() + 1);
        sequence.setUpdatedAt(now);
        sequence.setUpdatedUserIdx(currentUserIdx);
        documentSequenceRepository.save(sequence);

        // 문서번호 생성 (RCO-year-number, 3자리 패딩)
        return String.format("%s-%d-%03d", sequence.getPrefix(), sequence.getYear(), sequence.getLastNumber());
    }

    /**
     * "HH:mm ~ HH:mm" 형식에서 시작 시간 추출
     */
    private LocalTime parseStartTime(String workTime) {
        if (workTime == null || workTime.isEmpty()) {
            return null;
        }
        try {
            String[] parts = workTime.split("~");
            if (parts.length > 0) {
                return LocalTime.parse(parts[0].trim(), DateTimeFormatter.ofPattern("HH:mm"));
            }
        } catch (Exception e) {
            log.warn("시작 시간 파싱 실패: {}", workTime);
        }
        return null;
    }

    /**
     * "HH:mm ~ HH:mm" 형식에서 종료 시간 추출
     */
    private LocalTime parseEndTime(String workTime) {
        if (workTime == null || workTime.isEmpty()) {
            return null;
        }
        try {
            String[] parts = workTime.split("~");
            if (parts.length > 1) {
                return LocalTime.parse(parts[1].trim(), DateTimeFormatter.ofPattern("HH:mm"));
            }
        } catch (Exception e) {
            log.warn("종료 시간 파싱 실패: {}", workTime);
        }
        return null;
    }

    @Override
    @Transactional
    public ReceiptOvertimeDTO updateReceiptOvertime(Long idx, ReceiptOvertimeCreateDTO updateDTO, Long currentUserIdx) {
        log.debug("야근식대 수정 - idx: {}, currentUserIdx: {}", idx, currentUserIdx);

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
            LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
            entity.setCardIdx(updateDTO.getCardIdx());
            entity.setOvertimeDate(updateDTO.getOvertimeDate());
            entity.setApprovalDate(updateDTO.getApprovalDate());
            entity.setDocumentTitle(updateDTO.getDocumentTitle());
            entity.setDocumentContent(updateDTO.getDocumentContent());
            entity.setTotalAmount(updateDTO.getTotalAmount());
            entity.setUpdatedAt(now);
            entity.setUpdatedUserIdx(currentUserIdx);

            entity = receiptOvertimeRepository.save(entity);

            // 4. 기존 참석자 소프트 딜리트 후 새로 저장 (receipt_attendee 테이블)
            attendeeRepository.softDeleteByReceiptOvertimeIdx(entity.getId(), now, currentUserIdx);

            if (updateDTO.getAttendees() != null && !updateDTO.getAttendees().isEmpty()) {
                final ReceiptOvertime savedOvertime = entity;
                int displayOrder = 0;
                for (ReceiptOvertimeAttendeeDTO dto : updateDTO.getAttendees()) {
                    ReceiptAttendee attendee = ReceiptAttendee.builder()
                            .documentTypePrefix(DOCUMENT_TYPE_PREFIX)
                            .receiptIdx(savedOvertime.getId())
                            .projectIdx(updateDTO.getProjectIdx())
                            .cardIdx(updateDTO.getCardIdx())
                            .userIdx(dto.getUserIdx())
                            .isExternal(false)
                            .documentDate(updateDTO.getOvertimeDate())
                            .startTime(parseStartTime(dto.getWorkTime()))
                            .endTime(parseEndTime(dto.getWorkTime()))
                            .displayOrder(displayOrder++)
                            .workTask(dto.getWorkTask())
                            .createdAt(now)
                            .createdUserIdx(currentUserIdx)
                            .updatedAt(now)
                            .updatedUserIdx(currentUserIdx)
                            .isDeleted(false)
                            .build();
                    attendeeRepository.save(attendee);
                }
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
                    approvalDocument.setUpdatedUserIdx(currentUserIdx);
                    approvalDocumentRepository.save(approvalDocument);
                });
            }

            // 6. 저장된 데이터 재조회
            List<ReceiptAttendee> savedAttendees = attendeeRepository.findByReceiptOvertimeIdx(entity.getId());
            List<ReceiptOvertimeAttachment> attachments = attachmentRepository.findByReceiptOvertimeIdx(entity.getId());

            log.info("야근식대 수정 완료 - idx: {}", entity.getId());
            return mapper.toDTOWithDetails(entity, convertAttendeesToDTO(savedAttendees), attachments);

        } catch (Exception e) {
            log.error("연구비증빙 야근식대 수정 실패 - idx: {}, error: {}", idx, e.getMessage(), e);
            throw new RuntimeException("연구비증빙 야근식대 수정 중 오류가 발생했습니다.\n잠시 후 다시 시도하거나 관리자에게 문의해주세요.", e);
        }
    }

    @Override
    @Transactional
    public void deleteReceiptOvertime(Long idx) {
        deleteReceiptOvertime(idx, null);
    }

    @Override
    @Transactional
    public void deleteReceiptOvertime(Long idx, Long currentUserIdx) {
        log.debug("야근식대 소프트 딜리트 - idx: {}, currentUserIdx: {}", idx, currentUserIdx);

        ReceiptOvertime entity = receiptOvertimeRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("야근식대를 찾을 수 없습니다. idx: " + idx));

        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));
        Long deletedBy = currentUserIdx != null ? currentUserIdx : entity.getAuthorIdx();

        // 1. 연결된 ApprovalDocument 소프트 딜리트
        if (entity.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(entity.getDocumentIdx()).ifPresent(approvalDocument -> {
                approvalDocument.setDeletedAt(now);
                approvalDocument.setDeletedUserIdx(deletedBy);
                approvalDocumentRepository.save(approvalDocument);
                log.debug("ApprovalDocument soft deleted - documentIdx: {}, deletedAt: {}",
                        entity.getDocumentIdx(), now);
            });
        }

        // 2. 참석자 소프트 딜리트 (receipt_attendee 테이블)
        attendeeRepository.softDeleteByReceiptOvertimeIdx(entity.getId(), now, deletedBy);
        log.debug("ReceiptAttendee soft deleted - receiptOvertimeIdx: {}", entity.getId());

        // 3. 야근식대 소프트 딜리트
        entity.setIsDeleted(true);
        entity.setDeletedAt(now);
        entity.setDeletedUserIdx(deletedBy);
        receiptOvertimeRepository.save(entity);

        log.info("야근식대 소프트 딜리트 완료 - idx: {}", idx);
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
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));

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
}
