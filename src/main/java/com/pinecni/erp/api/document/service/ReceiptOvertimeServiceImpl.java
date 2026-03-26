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
import java.util.Comparator;
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

    @Value("${file.base.dir}")
    private String baseDir;

    @Value("${file.project.receipt-overtime.pattern}")
    private String uploadPattern;

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
        List<ReceiptOvertimeAttachment> attachments = attachmentRepository
                .findByReceiptOvertimeIdxAndDeletedFalseOrderByIdxAsc(idx);

        ReceiptOvertimeDTO dto = mapper.toDTOWithDetails(entity, convertAttendeesToDTO(attendees), attachments);
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public ReceiptOvertimeDTO getReceiptOvertimeByDocumentIdx(Long documentIdx) {
        log.debug("ApprovalDocument IDX로 야근식대 조회 - documentIdx: {}", documentIdx);

        ReceiptOvertime entity = receiptOvertimeRepository.findByDocumentIdx(documentIdx)
                .orElseThrow(() -> new IllegalArgumentException("야근식대를 찾을 수 없습니다. documentIdx: " + documentIdx));

        List<ReceiptAttendee> attendees = attendeeRepository.findByReceiptOvertimeIdx(entity.getIdx());
        List<ReceiptOvertimeAttachment> attachments = attachmentRepository
                .findByReceiptOvertimeIdxAndDeletedFalseOrderByIdxAsc(entity.getIdx());

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
            entity.setProjectIdx(project.getIdx());
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
                            .receiptIdx(savedOvertime.getIdx())
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
            List<ReceiptAttendee> savedAttendees = attendeeRepository.findByReceiptOvertimeIdx(entity.getIdx());

            log.info("야근식대 생성 완료 - idx: {}", entity.getIdx());
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
            if (updateDTO.getProjectIdx() != null && !updateDTO.getProjectIdx().equals(entity.getProjectIdx())) {
                projectRepository.findById(updateDTO.getProjectIdx())
                        .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다. idx: " + updateDTO.getProjectIdx()));
                entity.setProjectIdx(updateDTO.getProjectIdx());
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

            // 3-1. 기존 첨부파일 표시명을 수정된 정보(카드/날짜/금액)로 갱신
            renameAttachments(entity);

            // 4. 기존 참석자 소프트 딜리트 후 새로 저장 (receipt_attendee 테이블)
            attendeeRepository.softDeleteByReceiptOvertimeIdx(entity.getIdx(), now, currentUserIdx);

            if (updateDTO.getAttendees() != null && !updateDTO.getAttendees().isEmpty()) {
                final ReceiptOvertime savedOvertime = entity;
                int displayOrder = 0;
                for (ReceiptOvertimeAttendeeDTO dto : updateDTO.getAttendees()) {
                    ReceiptAttendee attendee = ReceiptAttendee.builder()
                            .documentTypePrefix(DOCUMENT_TYPE_PREFIX)
                            .receiptIdx(savedOvertime.getIdx())
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

            // 5. ApprovalDocument 제목 업데이트 (생성 시와 동일한 형식: "프로젝트명 (카드번호) - 날짜/금액원")
            final ReceiptOvertime savedEntity = entity;
            if (savedEntity.getDocumentIdx() != null) {
                approvalDocumentRepository.findById(savedEntity.getDocumentIdx()).ifPresent(approvalDocument -> {
                    String projectName = savedEntity.getProject() != null ? savedEntity.getProject().getProjectName() : "";
                    String cardNumber = "";
                    if (savedEntity.getCardIdx() != null) {
                        ProjectCard card = projectCardRepository.findById(savedEntity.getCardIdx()).orElse(null);
                        if (card != null) {
                            cardNumber = card.getCardLastDigits() != null ? card.getCardLastDigits() : "";
                        }
                    }
                    String dateStr = updateDTO.getApprovalDate() != null
                            ? updateDTO.getApprovalDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                            : "";
                    String amountStr = updateDTO.getTotalAmount() != null
                            ? String.format("%,d", updateDTO.getTotalAmount().longValue())
                            : "0";
                    String title = String.format("%s (%s) - %s/%s원", projectName, cardNumber, dateStr, amountStr);

                    approvalDocument.setTitle(title);
                    approvalDocument.setContent(updateDTO.getDocumentContent());
                    approvalDocument.setUpdatedUserIdx(currentUserIdx);
                    approvalDocumentRepository.save(approvalDocument);
                });
            }

            // 6. 저장된 데이터 재조회
            List<ReceiptAttendee> savedAttendees = attendeeRepository.findByReceiptOvertimeIdx(entity.getIdx());
            List<ReceiptOvertimeAttachment> attachments = attachmentRepository
                    .findByReceiptOvertimeIdxAndDeletedFalseOrderByIdxAsc(entity.getIdx());

            log.info("야근식대 수정 완료 - idx: {}", entity.getIdx());
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
        attendeeRepository.softDeleteByReceiptOvertimeIdx(entity.getIdx(), now, deletedBy);
        log.debug("ReceiptAttendee soft deleted - receiptOvertimeIdx: {}", entity.getIdx());

        // 3. 첨부파일 소프트 딜리트 (receipt_overtime_attachment 테이블)
        attachmentRepository.softDeleteByReceiptOvertimeIdx(entity.getIdx(), deletedBy);
        log.debug("ReceiptOvertimeAttachment soft deleted - receiptOvertimeIdx: {}", entity.getIdx());

        // 4. 야근식대 소프트 딜리트
        entity.setIsDeleted(true);
        entity.setDeletedAt(now);
        entity.setDeletedUserIdx(deletedBy);
        receiptOvertimeRepository.save(entity);

        log.info("야근식대 소프트 딜리트 완료 - idx: {}", idx);
    }

    @Override
    @Transactional
    public List<ReceiptOvertimeAttachmentDTO> saveAttachments(Long receiptOvertimeIdx, MultipartFile[] files,
                                                              String attachmentType, Long uploadUserIdx) {
        log.debug("첨부파일 저장 - receiptOvertimeIdx: {}, 파일 개수: {}, attachmentType: {}",
                receiptOvertimeIdx, files != null ? files.length : 0, attachmentType);

        if (files == null || files.length == 0) {
            return Collections.emptyList();
        }

        // 야근식대 존재 확인
        ReceiptOvertime overtime = receiptOvertimeRepository.findById(receiptOvertimeIdx)
                .orElseThrow(() -> new IllegalArgumentException("야근식대를 찾을 수 없습니다. IDX: " + receiptOvertimeIdx));

        // 업로드 디렉토리 생성: project/{projectIdx}/{cardLastDigits}/receipt-overtime/{date}
        Long projectIdx = overtime.getProjectIdx();
        String cardLastDigits = "no-card";
        if (overtime.getCardIdx() != null) {
            ProjectCard card = projectCardRepository.findById(overtime.getCardIdx()).orElse(null);
            if (card != null && card.getCardLastDigits() != null) {
                cardLastDigits = card.getCardLastDigits();
            }
        }
        String date = overtime.getOvertimeDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String year = String.valueOf(overtime.getOvertimeDate().getYear());

        String relativePath = uploadPattern
                .replace("{projectIdx}", String.valueOf(projectIdx))
                .replace("{cardLastDigits}", cardLastDigits)
                .replace("{year}", year)
                .replace("{date}", date);
        String fullUploadPath = baseDir + File.separator + relativePath.replace("/", File.separator);
        try {
            Files.createDirectories(Paths.get(fullUploadPath));
        } catch (IOException e) {
            log.error("업로드 디렉토리 생성 실패: {}", fullUploadPath, e);
            throw new RuntimeException("업로드 디렉토리를 생성할 수 없습니다: " + fullUploadPath, e);
        }

        List<ReceiptOvertimeAttachmentDTO> savedAttachments = new ArrayList<>();

        // 표시용 파일명 기본 구성: 카드번호_yyyymmdd_사용금액_야근식대_문서종류
        String displayDateStr = overtime.getOvertimeDate().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String displayAmountStr = overtime.getTotalAmount() != null
                ? String.format("%,d원", overtime.getTotalAmount().longValue()) : "0원";
        String displayDocType = "DOCUMENT".equals(attachmentType) ? "공식문서" : "영수증";
        String displayBaseName = cardLastDigits + "_" + displayDateStr + "_" + displayAmountStr + "_야근식대_" + displayDocType;

        // 기존 파일 수 조회 → 연번 오프셋 (삭제된 파일 제외)
        long existingCount = attachmentRepository
                .countByReceiptOvertimeIdxAndAttachmentTypeAndDeletedFalse(receiptOvertimeIdx, attachmentType);

        for (MultipartFile file : files) {
            if (file.isEmpty()) {
                continue;
            }

            try {
                // 확장자 추출 (실제 업로드 파일에서)
                String actualFilename = file.getOriginalFilename();
                if (actualFilename == null) actualFilename = "unnamed_file";
                String extension = "";
                int dotIndex = actualFilename.lastIndexOf('.');
                if (dotIndex > 0) {
                    extension = actualFilename.substring(dotIndex);
                }

                // 표시용 파일명: 카드번호_yyyymmdd_사용금액_야근식대_문서종류_N.확장자 (항상 연번)
                long seq = existingCount + savedAttachments.size() + 1;
                String displayFilename = displayBaseName + "_" + seq + extension;

                // 저장용 고유 파일명 (디스크 저장, 타임스탬프+UUID)
                String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
                String uuid = UUID.randomUUID().toString().substring(0, 8);
                String storedFilename = timestamp + "_" + uuid + extension;

                // 파일 저장
                Path filePath = Paths.get(fullUploadPath, storedFilename);
                Files.copy(file.getInputStream(), filePath);

                // DB 저장
                ReceiptOvertimeAttachment attachment = ReceiptOvertimeAttachment.builder()
                        .receiptOvertimeIdx(overtime.getIdx())
                        .originalFilename(displayFilename)
                        .storedFilename(storedFilename)
                        .filePath(relativePath)
                        .fileSize(file.getSize())
                        .fileType(file.getContentType())
                        .attachmentType(attachmentType)
                        .uploadUserIdx(uploadUserIdx)
                        .deleted(false)
                        .build();

                ReceiptOvertimeAttachment saved = attachmentRepository.save(attachment);

                savedAttachments.add(mapper.toAttachmentDTO(saved));

                log.debug("첨부파일 저장 완료 - 표시명: {}, 저장명: {}", displayFilename, storedFilename);

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

        return attachmentRepository
                .findByReceiptOvertimeIdxAndDeletedFalseOrderByIdxAsc(receiptOvertimeIdx)
                .stream()
                .map(mapper::toAttachmentDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteAttachment(Long attachmentIdx, Long deletedUserIdx) {
        log.debug("첨부파일 소프트 딜리트 - attachmentIdx: {}", attachmentIdx);

        ReceiptOvertimeAttachment attachment = attachmentRepository.findById(attachmentIdx)
                .orElseThrow(() -> new IllegalArgumentException("첨부파일을 찾을 수 없습니다. idx: " + attachmentIdx));

        // 소프트 딜리트 (물리 파일은 보존)
        attachment.setDeleted(true);
        attachment.setDeletedAt(LocalDateTime.now(ZoneId.of("Asia/Seoul")));
        attachment.setDeletedUserIdx(deletedUserIdx);
        attachmentRepository.save(attachment);

        log.info("첨부파일 소프트 딜리트 완료 - attachmentIdx: {}", attachmentIdx);
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
     * 문서 수정 시 기존 첨부파일의 표시용 파일명을 최신 정보(카드번호/날짜/금액)로 갱신
     */
    private void renameAttachments(ReceiptOvertime overtime) {
        String cardLastDigits = "no-card";
        if (overtime.getCardIdx() != null) {
            ProjectCard card = projectCardRepository.findById(overtime.getCardIdx()).orElse(null);
            if (card != null && card.getCardLastDigits() != null) {
                cardLastDigits = card.getCardLastDigits();
            }
        }
        String displayDateStr = overtime.getOvertimeDate().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String displayAmountStr = overtime.getTotalAmount() != null
                ? String.format("%,d원", overtime.getTotalAmount().longValue()) : "0원";

        List<ReceiptOvertimeAttachment> allAttachments = attachmentRepository
                .findByReceiptOvertimeIdxAndDeletedFalseOrderByIdxAsc(overtime.getIdx());

        final String finalCardLastDigits = cardLastDigits;
        for (String type : new String[]{"RECEIPT", "DOCUMENT"}) {
            String displayDocType = "DOCUMENT".equals(type) ? "공식문서" : "영수증";
            String newBaseName = finalCardLastDigits + "_" + displayDateStr + "_" + displayAmountStr + "_야근식대_" + displayDocType;

            List<ReceiptOvertimeAttachment> group = allAttachments.stream()
                    .filter(a -> type.equals(a.getAttachmentType()) || (a.getAttachmentType() == null && "RECEIPT".equals(type)))
                    .sorted(Comparator.comparingLong(ReceiptOvertimeAttachment::getIdx))
                    .collect(Collectors.toList());

            for (int i = 0; i < group.size(); i++) {
                ReceiptOvertimeAttachment att = group.get(i);
                String storedName = att.getStoredFilename();
                String extension = "";
                if (storedName != null) {
                    int dot = storedName.lastIndexOf('.');
                    if (dot > 0) extension = storedName.substring(dot);
                }
                att.setOriginalFilename(newBaseName + "_" + (i + 1) + extension);
            }
            if (!group.isEmpty()) {
                attachmentRepository.saveAll(group);
            }
        }
        log.debug("첨부파일 파일명 갱신 완료 - receiptOvertimeIdx: {}", overtime.getIdx());
    }
}
