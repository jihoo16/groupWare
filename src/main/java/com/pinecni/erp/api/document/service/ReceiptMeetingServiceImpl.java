package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.ReceiptMeetingAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingUpdateDTO;
import com.pinecni.erp.api.document.mapper.ReceiptMeetingMapper;
import com.pinecni.erp.api.document.repository.ReceiptAttendeeRepository;
import com.pinecni.erp.api.project.repository.ReceiptMeetingAttachmentRepository;
import com.pinecni.erp.api.project.repository.ReceiptMeetingRepository;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.api.project.repository.ProjectCardRepository;
import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.approval.service.DocumentSequenceService;
import com.pinecni.erp.entity.ReceiptMeeting;
import com.pinecni.erp.entity.ReceiptMeetingAttachment;
import com.pinecni.erp.entity.ReceiptAttendee;
import com.pinecni.erp.entity.ApprovalDocument;
import com.pinecni.erp.entity.Project;
import com.pinecni.erp.entity.ProjectCard;
import com.pinecni.erp.service.PdfGenerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.DecimalFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 연구비증빙 회의록 Service 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReceiptMeetingServiceImpl implements ReceiptMeetingService {

    private final ReceiptMeetingRepository receiptMeetingRepository;
    private final ReceiptAttendeeRepository receiptAttendeeRepository;
    private final ReceiptMeetingAttachmentRepository attachmentRepository;
    private final ReceiptMeetingMapper mapper;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final DocumentSequenceService documentSequenceService;
    private final ProjectRepository projectRepository;
    private final ProjectCardRepository projectCardRepository;

    @Value("${file.base.dir}")
    private String baseDir;

    @Value("${file.project.receipt-meeting.pattern}")
    private String uploadPattern;

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptMeetingDTO> getAllReceiptMeetings() {
        log.debug("전체 회의록 목록 조회");
        List<ReceiptMeeting> meetings = receiptMeetingRepository.findAllByOrderByMeetingDateDesc();
        // 각 회의록에 참석자 로드
        meetings.forEach(this::loadAttendees);
        return meetings.stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ReceiptMeetingDTO getReceiptMeetingById(Long idx) {
        log.debug("회의록 상세 조회 - idx: {}", idx);

        // 먼저 documentIdx(전자결재 문서 ID)로 조회 시도
        Optional<ReceiptMeeting> entityByDocumentIdx = receiptMeetingRepository.findByDocumentIdx(idx);

        if (entityByDocumentIdx.isPresent()) {
            log.debug("documentIdx로 회의록 조회 성공 - documentIdx: {}", idx);
            ReceiptMeeting entity = receiptMeetingRepository.findByIdWithDetails(entityByDocumentIdx.get().getIdx())
                    .orElseThrow(() -> new IllegalArgumentException("회의록을 찾을 수 없습니다. idx: " + idx));
            loadAttendees(entity);
            return toDTOWithAttachments(entity);
        }

        // documentIdx로 조회 실패 시, receipt_meeting.idx로 직접 조회
        ReceiptMeeting entity = receiptMeetingRepository.findByIdWithDetails(idx)
                .orElseThrow(() -> new IllegalArgumentException("회의록을 찾을 수 없습니다. idx: " + idx));
        loadAttendees(entity);

        return toDTOWithAttachments(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptMeetingDTO> getReceiptMeetingsByProjectIdx(Long projectIdx) {
        log.debug("프로젝트별 회의록 목록 조회 - projectIdx: {}", projectIdx);
        List<ReceiptMeeting> meetings = receiptMeetingRepository.findByProjectIdxOrderByMeetingDateDesc(projectIdx);
        // 각 회의록에 참석자 로드
        meetings.forEach(this::loadAttendees);
        return meetings.stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptMeetingDTO> getReceiptMeetingsByAuthorIdx(Long authorIdx) {
        log.debug("작성자별 회의록 목록 조회 - authorIdx: {}", authorIdx);
        List<ReceiptMeeting> meetings = receiptMeetingRepository.findByAuthorIdxOrderByMeetingDateDesc(authorIdx);
        // 각 회의록에 참석자 로드
        meetings.forEach(this::loadAttendees);
        return meetings.stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ReceiptMeetingDTO createReceiptMeeting(ReceiptMeetingCreateDTO createDTO, Long currentUserIdx) {
        log.debug("회의록 생성 - projectIdx: {}, authorIdx: {}, currentUserIdx: {}", createDTO.getProjectIdx(), createDTO.getAuthorIdx(), currentUserIdx);

        try {
            // 1. 참석자 중복 검증 (저장 전 필수)
            validateAttendeeDuplicates(
                    createDTO.getMeetingDate(),
                    createDTO.getStartTime(),
                    createDTO.getEndTime(),
                    createDTO.getProjectIdx(),
                    createDTO.getAttendees(),
                    null  // 신규 생성이므로 현재 회의록 IDX 없음
            );

            // 2. 전자결재 문서번호 생성 (시퀀스 사용)
            String documentNo = documentSequenceService.generateDocumentNumber("receipt_meeting", "RCM", currentUserIdx);

            // 제목 생성: "프로젝트이름 (카드번호) - 날짜/금액"
            StringBuilder titleBuilder = new StringBuilder();

            // 프로젝트 이름
            Project project = projectRepository.findById(createDTO.getProjectIdx())
                    .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다."));
            titleBuilder.append(project.getProjectName());

            // 카드번호
            if (createDTO.getCardIdx() != null) {
                ProjectCard card = projectCardRepository.findById(createDTO.getCardIdx())
                        .orElse(null);
                if (card != null && card.getCardLastDigits() != null) {
                    titleBuilder.append(" (").append(card.getCardLastDigits()).append(")");
                }
            }

            titleBuilder.append(" - ");

            // 날짜
            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            titleBuilder.append(createDTO.getMeetingDate().format(dateFormatter));

            titleBuilder.append("/");

            // 금액
            if (createDTO.getAmount() != null) {
                DecimalFormat decimalFormat = new DecimalFormat("#,###");
                titleBuilder.append(decimalFormat.format(createDTO.getAmount())).append("원");
            } else {
                titleBuilder.append("0원");
            }

            String title = titleBuilder.toString();

            ApprovalDocument approvalDocument = ApprovalDocument.builder()
                    .documentNo(documentNo)
                    .title(title)
                    .documentType("연구비증빙-회의록")  // 화면 표시용
                    .isProject(true)  // 프로젝트 문서로 표시
                    .drafterUserIdx(createDTO.getAuthorIdx())
                    .content(createDTO.getContent())
                    .createdUserIdx(currentUserIdx)
                    .updatedUserIdx(currentUserIdx)
                    .build();

            ApprovalDocument savedDocument = approvalDocumentRepository.save(approvalDocument);
            log.debug("ApprovalDocument created - documentIdx: {}, documentNo: {}",
                    savedDocument.getIdx(), savedDocument.getDocumentNo());

            // 4. 회의록 Entity 생성 및 저장
            ReceiptMeeting entity = mapper.toEntity(createDTO);
            entity.setDocumentIdx(savedDocument.getIdx());
            entity.setCreatedUserIdx(currentUserIdx);
            entity.setUpdatedUserIdx(currentUserIdx);
            entity = receiptMeetingRepository.save(entity);

            // 5. 참석자 목록 저장 (통합 테이블 사용)
            if (createDTO.getAttendees() != null && !createDTO.getAttendees().isEmpty()) {
                final ReceiptMeeting finalEntity = entity;
                List<ReceiptAttendee> attendees = createDTO.getAttendees().stream()
                        .map(dto -> mapper.toAttendeeEntity(dto, finalEntity, currentUserIdx))
                        .collect(Collectors.toList());
                receiptAttendeeRepository.saveAll(attendees);
                log.debug("참석자 {}명 저장 완료 (통합 테이블, RCM)", attendees.size());
            }

            // 6. 저장된 데이터 재조회 (참석자 포함)
            ReceiptMeeting savedEntity = receiptMeetingRepository.findByIdWithDetails(entity.getIdx())
                    .orElseThrow(() -> new IllegalStateException("저장된 회의록을 조회할 수 없습니다."));
            loadAttendees(savedEntity); // 통합 테이블에서 참석자 로드

            log.info("회의록 생성 완료 - idx: {}, documentNo: {}", savedEntity.getIdx(), documentNo);
            return mapper.toDTO(savedEntity);

        } catch (Exception e) {
            log.error("연구비증빙 회의록 생성 실패 - projectIdx: {}, authorIdx: {}, error: {}",
                    createDTO.getProjectIdx(), createDTO.getAuthorIdx(), e.getMessage(), e);
            throw new RuntimeException("연구비증빙 회의록 저장 중 오류가 발생했습니다.\n잠시 후 다시 시도하거나 관리자에게 문의해주세요.", e);
        }
    }

    @Override
    @Transactional
    public ReceiptMeetingDTO updateReceiptMeeting(Long idx, ReceiptMeetingUpdateDTO updateDTO, Long currentUserIdx) {
        log.debug("회의록 수정 - idx: {}, currentUserIdx: {}", idx, currentUserIdx);

        // 1. 기존 회의록 조회
        ReceiptMeeting entity = receiptMeetingRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("회의록을 찾을 수 없습니다. idx: " + idx));

        // 2. 참석자 중복 검증 (수정 전 필수)
        validateAttendeeDuplicates(
                updateDTO.getMeetingDate(),
                updateDTO.getStartTime(),
                updateDTO.getEndTime(),
                updateDTO.getProjectIdx(),
                updateDTO.getAttendees(),
                idx  // 현재 회의록 IDX (자기 자신은 제외)
        );

        // 3. 회의록 정보 업데이트
        mapper.updateEntity(entity, updateDTO);
        entity.setUpdatedUserIdx(currentUserIdx);
        entity = receiptMeetingRepository.save(entity);

        // 3-1. 기존 첨부파일 표시명을 수정된 정보(카드/날짜/금액)로 갱신
        renameAttachments(entity);

        // 4. 참석자 목록 업데이트 (통합 테이블 사용, Soft Delete 후 재생성)
        if (updateDTO.getAttendees() != null) {
            // 기존 참석자 Soft Delete
            receiptAttendeeRepository.softDeleteByReceiptIdxAndDocumentTypePrefix(idx, "RCM", currentUserIdx);
            log.debug("기존 참석자 soft delete 완료 (RCM)");

            if (!updateDTO.getAttendees().isEmpty()) {
                final ReceiptMeeting finalEntity = entity;
                List<ReceiptAttendee> attendees = updateDTO.getAttendees().stream()
                        .map(dto -> mapper.toAttendeeEntity(dto, finalEntity, currentUserIdx))
                        .collect(Collectors.toList());
                receiptAttendeeRepository.saveAll(attendees);
                log.debug("참석자 {}명 재저장 완료 (통합 테이블, RCM)", attendees.size());
            }
        }

        // 5. 연결된 ApprovalDocument도 업데이트
        final Long documentIdx = entity.getDocumentIdx();
        final ReceiptMeeting finalEntity = entity; // 람다에서 사용하기 위한 final 변수
        if (documentIdx != null) {
            approvalDocumentRepository.findById(documentIdx).ifPresent(approvalDocument -> {
                // 제목 업데이트: "프로젝트이름 (카드번호) - 날짜/금액"
                StringBuilder titleBuilder = new StringBuilder();

                // 프로젝트 이름
                if (finalEntity.getProject() != null) {
                    titleBuilder.append(finalEntity.getProject().getProjectName());
                } else {
                    Project project = projectRepository.findById(finalEntity.getProjectIdx())
                            .orElse(null);
                    if (project != null) {
                        titleBuilder.append(project.getProjectName());
                    }
                }

                // 카드번호
                if (finalEntity.getCardIdx() != null) {
                    ProjectCard card = projectCardRepository.findById(finalEntity.getCardIdx())
                            .orElse(null);
                    if (card != null && card.getCardLastDigits() != null) {
                        titleBuilder.append(" (").append(card.getCardLastDigits()).append(")");
                    }
                }

                titleBuilder.append(" - ");

                // 날짜
                DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
                titleBuilder.append(finalEntity.getMeetingDate().format(dateFormatter));

                titleBuilder.append("/");

                // 금액
                if (finalEntity.getAmount() != null) {
                    DecimalFormat decimalFormat = new DecimalFormat("#,###");
                    titleBuilder.append(decimalFormat.format(finalEntity.getAmount())).append("원");
                } else {
                    titleBuilder.append("0원");
                }

                approvalDocument.setTitle(titleBuilder.toString());

                // 내용 업데이트
                if (updateDTO.getContent() != null) {
                    approvalDocument.setContent(updateDTO.getContent());
                }

                // 수정 정보 업데이트
                approvalDocument.setUpdatedUserIdx(currentUserIdx);
                approvalDocument.setUpdatedAt(LocalDateTime.now());

                approvalDocumentRepository.save(approvalDocument);
                log.debug("ApprovalDocument updated - documentIdx: {}", documentIdx);
            });
        }

        // 6. 수정된 데이터 재조회
        ReceiptMeeting updatedEntity = receiptMeetingRepository.findByIdWithDetails(idx)
                .orElseThrow(() -> new IllegalStateException("수정된 회의록을 조회할 수 없습니다."));
        loadAttendees(updatedEntity); // 통합 테이블에서 참석자 로드

        log.info("회의록 수정 완료 - idx: {}", idx);
        return mapper.toDTO(updatedEntity);
    }

    @Override
    @Transactional
    public void deleteReceiptMeeting(Long idx, Long deletedUserIdx) {
        log.debug("회의록 삭제 - idx: {}, deletedUserIdx: {}", idx, deletedUserIdx);

        ReceiptMeeting entity = receiptMeetingRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("회의록을 찾을 수 없습니다. idx: " + idx));

        LocalDateTime now = LocalDateTime.now();

        // 1. 연결된 자식 엔티티들 soft delete
        // 1-1. 참석자 soft delete (통합 테이블 사용)
        receiptAttendeeRepository.softDeleteByReceiptIdxAndDocumentTypePrefix(idx, "RCM", deletedUserIdx);
        log.debug("참석자 soft delete 완료 (통합 테이블, RCM)");

        // 1-2. 첨부파일 soft delete
        List<ReceiptMeetingAttachment> attachments = attachmentRepository.findByReceiptMeetingIdx(idx);
        attachments.forEach(attachment -> {
            attachment.setDeleted(true);
            attachment.setDeletedAt(now);
            attachment.setDeletedUserIdx(deletedUserIdx);
        });
        if (!attachments.isEmpty()) {
            attachmentRepository.saveAll(attachments);
            log.debug("첨부파일 {} 건 soft delete 완료", attachments.size());
        }

        // 2. 연결된 ApprovalDocument soft delete
        if (entity.getDocumentIdx() != null) {
            approvalDocumentRepository.findById(entity.getDocumentIdx()).ifPresent(approvalDocument -> {
                approvalDocument.setDeletedAt(now);
                approvalDocument.setDeletedUserIdx(deletedUserIdx);
                approvalDocumentRepository.save(approvalDocument);
                log.debug("ApprovalDocument soft deleted - documentIdx: {}, deletedAt: {}",
                        entity.getDocumentIdx(), now);
            });
        }

        // 3. 회의록 자체 soft delete
        entity.setIsDeleted(true);
        entity.setDeletedAt(now);
        entity.setDeletedUserIdx(deletedUserIdx);
        receiptMeetingRepository.save(entity);

        log.info("회의록 삭제 완료 - idx: {}, deletedUserIdx: {}", idx, deletedUserIdx);
    }

    @Override
    public String generateDocumentNumber(Long projectIdx) {
        // 문서번호 형식: RM-{projectIdx}-{YYYYMMDD}-{순번}
        // 예: RM-1-20250101-001

        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String prefix = String.format("RM-%d-%s", projectIdx, dateStr);

        // 같은 날짜의 문서 개수 조회하여 순번 생성 (삭제된 문서 포함)
        long count = receiptMeetingRepository.countByDocumentNumberStartingWithIncludingDeleted(prefix);

        return String.format("%s-%03d", prefix, count + 1);
    }

    /**
     * 문서 타입 prefix를 한글 이름으로 변환
     */
    private String getDocumentTypeName(String prefix) {
        if (prefix == null) return "알 수 없음";
        switch (prefix) {
            case "RCM":
                return "회의록";
            case "RCO":
                return "야근식대";
            case "RCT":
                return "출장";
            default:
                return prefix;
        }
    }

    @Override
    @Transactional
    public List<ReceiptMeetingAttachmentDTO> saveAttachments(Long receiptMeetingIdx, MultipartFile[] files, String attachmentType, Long uploadUserIdx) {
        log.debug("첨부파일 저장 - receiptMeetingIdx: {}, 타입: {}, 파일 개수: {}", receiptMeetingIdx, attachmentType, files != null ? files.length : 0);

        if (files == null || files.length == 0) {
            return Collections.emptyList();
        }

        // 회의록 존재 확인
        ReceiptMeeting meeting = receiptMeetingRepository.findById(receiptMeetingIdx)
                .orElseThrow(() -> new IllegalArgumentException("회의록을 찾을 수 없습니다. IDX: " + receiptMeetingIdx));

        // 업로드 디렉토리 생성: project/{projectIdx}/{cardLastDigits}/receipt-meeting/{date}
        Long projectIdx = meeting.getProjectIdx();
        String cardLastDigits = "no-card";
        if (meeting.getCardIdx() != null) {
            ProjectCard card = projectCardRepository.findById(meeting.getCardIdx()).orElse(null);
            if (card != null && card.getCardLastDigits() != null) {
                cardLastDigits = card.getCardLastDigits();
            }
        }
        String date = meeting.getMeetingDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String year = String.valueOf(meeting.getMeetingDate().getYear());

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

        List<ReceiptMeetingAttachmentDTO> savedAttachments = new ArrayList<>();

        // 표시용 파일명 기본 구성: 카드번호_yyyymmdd_사용금액_회의록_문서종류
        String displayDateStr = meeting.getMeetingDate().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String displayAmountStr = meeting.getAmount() != null
                ? String.format("%,d원", meeting.getAmount().longValue()) : "0원";
        String displayDocType = "DOCUMENT".equals(attachmentType) ? "공식문서" : "영수증";
        String displayBaseName = cardLastDigits + "_" + displayDateStr + "_" + displayAmountStr + "_회의록_" + displayDocType;

        // 기존 파일 수 조회 → 연번 오프셋 (덮어쓰기 방지)
        long existingCount = attachmentRepository.countByReceiptMeetingIdxAndAttachmentType(receiptMeetingIdx, attachmentType);

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

                // 표시용 파일명: 카드번호_yyyymmdd_사용금액_회의록_문서종류_N.확장자 (항상 연번)
                long seq = existingCount + savedAttachments.size() + 1;
                String displayFilename = displayBaseName + "_" + seq + extension;

                // 저장용 고유 파일명 (디스크 저장, 타임스탬프+UUID)
                String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
                String uuid = UUID.randomUUID().toString().substring(0, 8);
                String storedFileName = timestamp + "_" + uuid + extension;

                // 파일 저장
                Path filePath = Paths.get(fullUploadPath, storedFileName);
                Files.copy(file.getInputStream(), filePath);

                // DB 저장
                ReceiptMeetingAttachment attachment = ReceiptMeetingAttachment.builder()
                        .receiptMeetingIdx(receiptMeetingIdx)
                        .originalFilename(displayFilename)
                        .storedFilename(storedFileName)
                        .filePath(relativePath)
                        .fileSize(file.getSize())
                        .fileType(file.getContentType())
                        .attachmentType(attachmentType)
                        .uploadUserIdx(uploadUserIdx)
                        .build();

                ReceiptMeetingAttachment saved = attachmentRepository.save(attachment);

                // DTO 변환
                ReceiptMeetingAttachmentDTO dto = ReceiptMeetingAttachmentDTO.builder()
                        .idx(saved.getIdx())
                        .receiptMeetingIdx(saved.getReceiptMeetingIdx())
                        .originalFilename(saved.getOriginalFilename())
                        .storedFilename(saved.getStoredFilename())
                        .filePath(saved.getFilePath())
                        .fileSize(saved.getFileSize())
                        .fileType(saved.getFileType())
                        .attachmentType(saved.getAttachmentType())
                        .uploadUserIdx(saved.getUploadUserIdx())
                        .uploadedAt(saved.getUploadedAt())
                        .build();

                savedAttachments.add(dto);

                log.debug("첨부파일 저장 완료 - 표시명: {}, 저장명: {}", displayFilename, storedFileName);

            } catch (IOException e) {
                log.error("파일 저장 실패: {}", file.getOriginalFilename(), e);
                throw new RuntimeException("파일 저장 중 오류가 발생했습니다: " + file.getOriginalFilename(), e);
            }
        }

        return savedAttachments;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptMeetingAttachmentDTO> getAttachmentsByReceiptMeetingIdx(Long receiptMeetingIdx) {
        log.debug("회의록 첨부파일 목록 조회 - receiptMeetingIdx: {}", receiptMeetingIdx);

        return attachmentRepository.findByReceiptMeetingIdx(receiptMeetingIdx)
                .stream()
                .map(attachment -> ReceiptMeetingAttachmentDTO.builder()
                        .idx(attachment.getIdx())
                        .receiptMeetingIdx(attachment.getReceiptMeetingIdx())
                        .originalFilename(attachment.getOriginalFilename())
                        .storedFilename(attachment.getStoredFilename())
                        .filePath(attachment.getFilePath())
                        .fileSize(attachment.getFileSize())
                        .fileType(attachment.getFileType())
                        .attachmentType(attachment.getAttachmentType())
                        .uploadUserIdx(attachment.getUploadUserIdx())
                        .uploadedAt(attachment.getUploadedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ReceiptMeetingAttachmentDTO getAttachmentById(Long attachmentIdx) {
        log.debug("회의록 첨부파일 단건 조회 - attachmentIdx: {}", attachmentIdx);

        ReceiptMeetingAttachment attachment = attachmentRepository.findById(attachmentIdx)
                .orElseThrow(() -> new IllegalArgumentException("첨부파일을 찾을 수 없습니다. idx: " + attachmentIdx));

        return ReceiptMeetingAttachmentDTO.builder()
                .idx(attachment.getIdx())
                .receiptMeetingIdx(attachment.getReceiptMeetingIdx())
                .originalFilename(attachment.getOriginalFilename())
                .storedFilename(attachment.getStoredFilename())
                .filePath(attachment.getFilePath())
                .fileSize(attachment.getFileSize())
                .fileType(attachment.getFileType())
                .attachmentType(attachment.getAttachmentType())
                .uploadUserIdx(attachment.getUploadUserIdx())
                .uploadedAt(attachment.getUploadedAt())
                .build();
    }

    @Override
    @Transactional
    public void softDeleteAttachment(Long attachmentIdx, Long deletedUserIdx) {
        log.debug("첨부파일 소프트 딜리트 - attachmentIdx: {}", attachmentIdx);
        ReceiptMeetingAttachment attachment = attachmentRepository.findById(attachmentIdx)
                .orElseThrow(() -> new IllegalArgumentException("첨부파일을 찾을 수 없습니다. idx: " + attachmentIdx));
        attachment.setDeleted(true);
        attachment.setDeletedAt(LocalDateTime.now());
        attachment.setDeletedUserIdx(deletedUserIdx);
        attachmentRepository.save(attachment);
    }

    /**
     * 문서 수정 시 기존 첨부파일의 표시용 파일명을 최신 정보(카드번호/날짜/금액)로 갱신
     */
    private void renameAttachments(ReceiptMeeting meeting) {
        String cardLastDigits = "no-card";
        if (meeting.getCardIdx() != null) {
            ProjectCard card = projectCardRepository.findById(meeting.getCardIdx()).orElse(null);
            if (card != null && card.getCardLastDigits() != null) {
                cardLastDigits = card.getCardLastDigits();
            }
        }
        String displayDateStr = meeting.getMeetingDate().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String displayAmountStr = meeting.getAmount() != null
                ? String.format("%,d원", meeting.getAmount().longValue()) : "0원";

        List<ReceiptMeetingAttachment> allAttachments = attachmentRepository.findByReceiptMeetingIdx(meeting.getIdx());

        final String finalCardLastDigits = cardLastDigits;
        for (String type : new String[]{"RECEIPT", "DOCUMENT"}) {
            String displayDocType = "DOCUMENT".equals(type) ? "공식문서" : "영수증";
            String newBaseName = finalCardLastDigits + "_" + displayDateStr + "_" + displayAmountStr + "_회의록_" + displayDocType;

            List<ReceiptMeetingAttachment> group = allAttachments.stream()
                    .filter(a -> type.equals(a.getAttachmentType()) || (a.getAttachmentType() == null && "RECEIPT".equals(type)))
                    .sorted(Comparator.comparingLong(ReceiptMeetingAttachment::getIdx))
                    .collect(Collectors.toList());

            for (int i = 0; i < group.size(); i++) {
                ReceiptMeetingAttachment att = group.get(i);
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
        log.debug("첨부파일 파일명 갱신 완료 - receiptMeetingIdx: {}", meeting.getIdx());
    }

    /**
     * 상세 조회 전용 DTO 변환 — mapper.toDTO() 후 attachments를 명시적으로 세팅
     * 목록 조회에서는 mapper.toDTO()만 호출 (lazy load 방지)
     */
    private ReceiptMeetingDTO toDTOWithAttachments(ReceiptMeeting entity) {
        ReceiptMeetingDTO dto = mapper.toDTO(entity);
        List<ReceiptMeetingAttachmentDTO> attachments = getAttachmentsByReceiptMeetingIdx(entity.getIdx());
        dto.setAttachments(attachments);
        return dto;
    }

    /**
     * 회의록 Entity에 참석자 목록 로드 (통합 테이블에서 조회)
     *
     * @param entity 회의록 Entity
     */
    private void loadAttendees(ReceiptMeeting entity) {
        if (entity == null || entity.getIdx() == null) {
            return;
        }
        List<ReceiptAttendee> attendees = receiptAttendeeRepository
                .findByReceiptIdxAndDocumentTypePrefixOrderByDisplayOrder(entity.getIdx(), "RCM");
        entity.setAttendees(attendees);
        log.debug("참석자 {}명 로드 완료 (통합 테이블, RCM)", attendees.size());
    }

    /**
     * 시간대 겹침 확인 유틸리티 메서드
     *
     * @param start1 시작 시간 1
     * @param end1   종료 시간 1
     * @param start2 시작 시간 2
     * @param end2   종료 시간 2
     * @return 겹치면 true, 안 겹치면 false
     */
    private boolean isTimeOverlap(java.time.LocalTime start1, java.time.LocalTime end1,
                                  java.time.LocalTime start2, java.time.LocalTime end2) {
        // 시간대가 겹치는 경우: start1 < end2 && end1 > start2
        return start1.isBefore(end2) && end1.isAfter(start2);
    }

    /**
     * 참석자 중복 검증 메서드
     * - 같은 날짜, 같은 프로젝트, 겹치는 시간대에 동일 참석자가 있는지 확인
     * - 내부/외부 참석자 모두 검증
     *
     * @param meetingDate       회의 날짜
     * @param startTime         시작 시간
     * @param endTime           종료 시간
     * @param projectIdx        프로젝트 IDX
     * @param attendees         참석자 목록 (DTO)
     * @param currentMeetingIdx 현재 회의록 IDX (수정 시 자기 자신 제외용, 신규 생성 시 null)
     * @throws IllegalStateException 중복 참석자가 있을 경우
     */
    private void validateAttendeeDuplicates(
            LocalDate meetingDate,
            java.time.LocalTime startTime,
            java.time.LocalTime endTime,
            Long projectIdx,
            List<com.pinecni.erp.api.document.dto.ReceiptMeetingAttendeeDTO> attendees,
            Long currentMeetingIdx) {

        if (attendees == null || attendees.isEmpty()) {
            return; // 참석자가 없으면 검증 스킵
        }

        if (meetingDate == null || startTime == null || endTime == null) {
            return; // 필수 정보가 없으면 검증 스킵
        }

        log.debug("참석자 중복 검증 시작 (통합 테이블) - 날짜: {}, 시간: {} ~ {}, 프로젝트: {}, 참석자 수: {}",
                meetingDate, startTime, endTime, projectIdx, attendees.size());

        // 각 참석자에 대해 중복 확인
        for (com.pinecni.erp.api.document.dto.ReceiptMeetingAttendeeDTO attendee : attendees) {
            Long userIdx = attendee.getUserIdx();

            if (userIdx == null) {
                continue; // userIdx가 없는 참석자는 스킵
            }

            // 통합 테이블(receipt_attendee)에서 직접 조회
            // - 같은 프로젝트 (카드 무관)
            // - 같은 날짜
            // - 같은 사용자
            // - 시간 정보가 있는 문서 (시간대 겹침 체크)
            // - 자기 자신 제외 (수정 시)
            // is_deleted = false는 @SQLRestriction으로 자동 필터링됨
            List<ReceiptAttendee> existingAttendees = receiptAttendeeRepository.findAll().stream()
                    .filter(a -> a.getUserIdx() != null && a.getUserIdx().equals(userIdx))
                    .filter(a -> a.getProjectIdx() != null && a.getProjectIdx().equals(projectIdx))
                    .filter(a -> a.getDocumentDate() != null && a.getDocumentDate().equals(meetingDate))
                    .filter(a -> a.getStartTime() != null && a.getEndTime() != null) // 시간 정보 있는 문서만
                    .filter(a -> {
                        // 자기 자신 제외 (수정 시)
                        if (currentMeetingIdx == null) return true;
                        // RCM 타입이고 receipt_idx가 현재 회의록과 같으면 제외
                        return !"RCM".equals(a.getDocumentTypePrefix()) || !a.getReceiptIdx().equals(currentMeetingIdx);
                    })
                    .collect(Collectors.toList());

            log.debug("userIdx={} 에 대한 기존 참석 레코드: {}건", userIdx, existingAttendees.size());

            // 시간대 겹침 확인
            for (ReceiptAttendee existing : existingAttendees) {
                if (isTimeOverlap(startTime, endTime, existing.getStartTime(), existing.getEndTime())) {
                    // 중복 발견 - 상세 정보 포함하여 예외 발생
                    String attendeeName = attendee.getName() != null ? attendee.getName() : "알 수 없음";
                    String projectName = "알 수 없음";
                    if (existing.getProject() != null) {
                        projectName = existing.getProject().getProjectName();
                    } else if (existing.getProjectIdx() != null) {
                        projectName = projectRepository.findById(existing.getProjectIdx())
                                .map(Project::getProjectName)
                                .orElse("알 수 없음");
                    }

                    String documentType = getDocumentTypeName(existing.getDocumentTypePrefix());

                    String errorMessage = String.format(
                            "참석자 '%s'이(가) 같은 날짜 및 시간대에 이미 다른 문서에 참석 중입니다.\n\n" +
                                    "- 문서 유형: %s\n" +
                                    "- 날짜: %s\n" +
                                    "- 시간: %s ~ %s\n" +
                                    "- 프로젝트: [%s]\n\n" +
                                    "시간을 변경하거나 참석자를 제외해주세요.",
                            attendeeName,
                            documentType,
                            existing.getDocumentDate(),
                            existing.getStartTime(),
                            existing.getEndTime(),
                            projectName
                    );

                    log.warn("참석자 중복 발견 - userIdx: {}, name: {}, 기존 문서 타입: {}, receipt_idx: {}",
                            userIdx, attendeeName, existing.getDocumentTypePrefix(), existing.getReceiptIdx());

                    throw new IllegalStateException(errorMessage);
                }
            }
        }

        log.debug("참석자 중복 검증 완료 - 중복 없음");
    }
}
