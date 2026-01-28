package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.ReceiptMeetingAttachmentDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingCreateDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingDTO;
import com.pinecni.erp.api.document.dto.ReceiptMeetingUpdateDTO;
import com.pinecni.erp.api.document.mapper.ReceiptMeetingMapper;
import com.pinecni.erp.api.document.repository.ReceiptMeetingOfficialPdfRepository;
import com.pinecni.erp.api.project.repository.ReceiptMeetingAttachmentRepository;
import com.pinecni.erp.api.project.repository.ReceiptMeetingAttendeeRepository;
import com.pinecni.erp.api.project.repository.ReceiptMeetingRepository;
import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.entity.ReceiptMeeting;
import com.pinecni.erp.entity.ReceiptMeetingAttachment;
import com.pinecni.erp.entity.ReceiptMeetingAttendee;
import com.pinecni.erp.entity.ReceiptMeetingOfficialPdf;
import com.pinecni.erp.entity.ApprovalDocument;
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
    private final ReceiptMeetingAttendeeRepository attendeeRepository;
    private final ReceiptMeetingAttachmentRepository attachmentRepository;
    private final ReceiptMeetingOfficialPdfRepository pdfRepository;
    private final ReceiptMeetingMapper mapper;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final PdfGenerationService pdfGenerationService;

    @Value("${file.upload.path:/uploads/receipt-meetings}")
    private String uploadPath;

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptMeetingDTO> getAllReceiptMeetings() {
        log.debug("전체 회의록 목록 조회");
        return receiptMeetingRepository.findAllByOrderByMeetingDateDesc()
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ReceiptMeetingDTO getReceiptMeetingById(Long idx) {
        log.debug("회의록 상세 조회 - idx: {}", idx);

        ReceiptMeeting entity = receiptMeetingRepository.findByIdWithDetails(idx)
                .orElseThrow(() -> new IllegalArgumentException("회의록을 찾을 수 없습니다. idx: " + idx));

        return mapper.toDTO(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptMeetingDTO> getReceiptMeetingsByProjectIdx(Long projectIdx) {
        log.debug("프로젝트별 회의록 목록 조회 - projectIdx: {}", projectIdx);
        return receiptMeetingRepository.findByProjectIdxOrderByMeetingDateDesc(projectIdx)
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptMeetingDTO> getReceiptMeetingsByAuthorIdx(Long authorIdx) {
        log.debug("작성자별 회의록 목록 조회 - authorIdx: {}", authorIdx);
        return receiptMeetingRepository.findByAuthorIdxOrderByMeetingDateDesc(authorIdx)
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReceiptMeetingDTO> getReceiptMeetingsByStatus(String status) {
        log.debug("상태별 회의록 목록 조회 - status: {}", status);
        return receiptMeetingRepository.findByStatusOrderByMeetingDateDesc(status)
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ReceiptMeetingDTO createReceiptMeeting(ReceiptMeetingCreateDTO createDTO) {
        log.debug("회의록 생성 - projectIdx: {}, authorIdx: {}", createDTO.getProjectIdx(), createDTO.getAuthorIdx());

        try {
            // 1. 문서번호 생성
            String documentNumber = generateDocumentNumber(createDTO.getProjectIdx());

        // 2. ApprovalDocument 메타데이터 저장
        String documentNo = "RECEIPT-MEETING-" + System.currentTimeMillis() + "-" + createDTO.getAuthorIdx();
        String title = "연구비증빙 회의록";
        if (createDTO.getPurpose() != null && !createDTO.getPurpose().isEmpty()) {
            title = "연구비증빙 회의록 - " + createDTO.getPurpose();
        }

        ApprovalDocument approvalDocument = ApprovalDocument.builder()
                .documentNo(documentNo)
                .title(title)
                .documentType("연구비증빙-회의록")
                .drafterUserIdx(createDTO.getAuthorIdx())
                .content(createDTO.getContent())
                .createdUserIdx(createDTO.getAuthorIdx())
                .updatedUserIdx(createDTO.getAuthorIdx())
                .build();

        ApprovalDocument savedDocument = approvalDocumentRepository.save(approvalDocument);
        log.debug("ApprovalDocument created - documentIdx: {}, documentNo: {}",
                  savedDocument.getIdx(), savedDocument.getDocumentNo());

        // 3. 회의록 Entity 생성 및 저장
        ReceiptMeeting entity = mapper.toEntity(createDTO);
        entity.setDocumentNumber(documentNumber);
        entity.setDocumentIdx(savedDocument.getIdx());
        entity = receiptMeetingRepository.save(entity);

        // 3. 참석자 목록 저장
        if (createDTO.getAttendees() != null && !createDTO.getAttendees().isEmpty()) {
            final Long receiptMeetingIdx = entity.getIdx();
            List<ReceiptMeetingAttendee> attendees = createDTO.getAttendees().stream()
                    .map(dto -> mapper.toAttendeeEntity(dto, receiptMeetingIdx))
                    .collect(Collectors.toList());
            attendeeRepository.saveAll(attendees);
        }

            // 4. 저장된 데이터 재조회 (참석자 포함)
            ReceiptMeeting savedEntity = receiptMeetingRepository.findByIdWithDetails(entity.getIdx())
                    .orElseThrow(() -> new IllegalStateException("저장된 회의록을 조회할 수 없습니다."));

            log.info("회의록 생성 완료 - idx: {}, documentNumber: {}", savedEntity.getIdx(), documentNumber);
            return mapper.toDTO(savedEntity);

        } catch (Exception e) {
            log.error("연구비증빙 회의록 생성 실패 - projectIdx: {}, authorIdx: {}, error: {}",
                      createDTO.getProjectIdx(), createDTO.getAuthorIdx(), e.getMessage(), e);
            throw new RuntimeException("연구비증빙 회의록 저장 중 오류가 발생했습니다.\n잠시 후 다시 시도하거나 관리자에게 문의해주세요.", e);
        }
    }

    @Override
    @Transactional
    public ReceiptMeetingDTO updateReceiptMeeting(Long idx, ReceiptMeetingUpdateDTO updateDTO) {
        log.debug("회의록 수정 - idx: {}", idx);

        // 1. 기존 회의록 조회
        ReceiptMeeting entity = receiptMeetingRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("회의록을 찾을 수 없습니다. idx: " + idx));

        // 2. 회의록 정보 업데이트
        mapper.updateEntity(entity, updateDTO);
        entity = receiptMeetingRepository.save(entity);

        // 3. 참석자 목록 업데이트 (기존 삭제 후 재생성)
        if (updateDTO.getAttendees() != null) {
            attendeeRepository.deleteByReceiptMeetingIdx(idx);

            if (!updateDTO.getAttendees().isEmpty()) {
                List<ReceiptMeetingAttendee> attendees = updateDTO.getAttendees().stream()
                        .map(dto -> mapper.toAttendeeEntity(dto, idx))
                        .collect(Collectors.toList());
                attendeeRepository.saveAll(attendees);
            }
        }

        // 4. 연결된 ApprovalDocument도 업데이트
        final Long documentIdx = entity.getDocumentIdx();
        final Long authorIdx = entity.getAuthorIdx();
        if (documentIdx != null) {
            approvalDocumentRepository.findById(documentIdx).ifPresent(approvalDocument -> {
                // 제목 업데이트
                String title = "연구비증빙 회의록";
                if (updateDTO.getPurpose() != null && !updateDTO.getPurpose().isEmpty()) {
                    title = "연구비증빙 회의록 - " + updateDTO.getPurpose();
                }
                approvalDocument.setTitle(title);

                // 내용 업데이트
                if (updateDTO.getContent() != null) {
                    approvalDocument.setContent(updateDTO.getContent());
                }

                // 수정 정보 업데이트
                approvalDocument.setUpdatedUserIdx(authorIdx);
                approvalDocument.setUpdatedAt(LocalDateTime.now());

                approvalDocumentRepository.save(approvalDocument);
                log.debug("ApprovalDocument updated - documentIdx: {}", documentIdx);
            });
        }

        // 5. 수정된 데이터 재조회
        ReceiptMeeting updatedEntity = receiptMeetingRepository.findByIdWithDetails(idx)
                .orElseThrow(() -> new IllegalStateException("수정된 회의록을 조회할 수 없습니다."));

        log.info("회의록 수정 완료 - idx: {}", idx);
        return mapper.toDTO(updatedEntity);
    }

    @Override
    @Transactional
    public void deleteReceiptMeeting(Long idx) {
        log.debug("회의록 삭제 - idx: {}", idx);

        ReceiptMeeting entity = receiptMeetingRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("회의록을 찾을 수 없습니다. idx: " + idx));

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

        receiptMeetingRepository.delete(entity);
        log.info("회의록 삭제 완료 - idx: {}", idx);
    }

    @Override
    public String generateDocumentNumber(Long projectIdx) {
        // 문서번호 형식: RM-{projectIdx}-{YYYYMMDD}-{순번}
        // 예: RM-1-20250101-001

        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String prefix = String.format("RM-%d-%s", projectIdx, dateStr);

        // 같은 날짜의 문서 개수 조회하여 순번 생성
        long count = receiptMeetingRepository.findAll().stream()
                .filter(rm -> rm.getDocumentNumber() != null && rm.getDocumentNumber().startsWith(prefix))
                .count();

        return String.format("%s-%03d", prefix, count + 1);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> findDuplicateAttendee(String date, Long attendeeIdx) {
        log.debug("중복 참석자 검증 - date: {}, attendeeIdx: {}", date, attendeeIdx);

        try {
            // 날짜 파싱
            LocalDate meetingDate = LocalDate.parse(date);

            // 해당 날짜의 모든 회의록 조회
            List<ReceiptMeeting> meetings = receiptMeetingRepository.findAll().stream()
                    .filter(rm -> rm.getMeetingDate() != null && rm.getMeetingDate().equals(meetingDate))
                    .collect(Collectors.toList());

            List<Map<String, Object>> duplicates = new ArrayList<>();

            // 각 회의록의 참석자 확인
            for (ReceiptMeeting meeting : meetings) {
                List<ReceiptMeetingAttendee> attendees = attendeeRepository.findByReceiptMeetingIdxOrderByDisplayOrder(meeting.getIdx());

                // 해당 참석자가 포함되어 있는지 확인
                boolean hasDuplicate = attendees.stream()
                        .anyMatch(attendee -> attendee.getUserIdx().equals(attendeeIdx));

                if (hasDuplicate) {
                    Map<String, Object> info = new HashMap<>();
                    info.put("idx", meeting.getIdx());
                    info.put("title", meeting.getPurpose()); // purpose를 제목으로 사용
                    info.put("createdAt", meeting.getCreatedAt());
                    duplicates.add(info);
                }
            }

            return duplicates;
        } catch (Exception e) {
            log.error("중복 참석자 검증 중 오류 발생: {}", e.getMessage(), e);
            return List.of();
        }
    }

    @Override
    @Transactional
    public List<ReceiptMeetingAttachmentDTO> saveAttachments(Long receiptMeetingIdx, MultipartFile[] files, Long uploadUserIdx) {
        log.debug("첨부파일 저장 - receiptMeetingIdx: {}, 파일 개수: {}", receiptMeetingIdx, files != null ? files.length : 0);

        if (files == null || files.length == 0) {
            return Collections.emptyList();
        }

        // 회의록 존재 확인
        ReceiptMeeting meeting = receiptMeetingRepository.findById(receiptMeetingIdx)
                .orElseThrow(() -> new IllegalArgumentException("회의록을 찾을 수 없습니다. IDX: " + receiptMeetingIdx));

        // 업로드 디렉토리 생성
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        String fullUploadPath = uploadPath + "/" + datePath + "/" + receiptMeetingIdx;
        File uploadDir = new File(fullUploadPath);
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }

        List<ReceiptMeetingAttachmentDTO> savedAttachments = new ArrayList<>();

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
                String savedFilename = timestamp + "_" + uuid + extension;

                // 파일 저장
                Path filePath = Paths.get(fullUploadPath, savedFilename);
                Files.copy(file.getInputStream(), filePath);

                // DB 저장
                ReceiptMeetingAttachment attachment = ReceiptMeetingAttachment.builder()
                        .receiptMeetingIdx(receiptMeetingIdx)
                        .fileName(originalFilename)
                        .filePath(filePath.toString())
                        .fileSize(file.getSize())
                        .fileType(file.getContentType())
                        .uploadUserIdx(uploadUserIdx)
                        .build();

                ReceiptMeetingAttachment saved = attachmentRepository.save(attachment);

                // DTO 변환
                ReceiptMeetingAttachmentDTO dto = ReceiptMeetingAttachmentDTO.builder()
                        .idx(saved.getIdx())
                        .receiptMeetingIdx(saved.getReceiptMeetingIdx())
                        .fileName(saved.getFileName())
                        .filePath(saved.getFilePath())
                        .fileSize(saved.getFileSize())
                        .fileType(saved.getFileType())
                        .uploadUserIdx(saved.getUploadUserIdx())
                        .uploadedAt(saved.getUploadedAt())
                        .build();

                savedAttachments.add(dto);

                log.debug("첨부파일 저장 완료 - 원본명: {}, 저장명: {}", originalFilename, savedFilename);

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
                        .fileName(attachment.getFileName())
                        .filePath(attachment.getFilePath())
                        .fileSize(attachment.getFileSize())
                        .fileType(attachment.getFileType())
                        .uploadUserIdx(attachment.getUploadUserIdx())
                        .uploadedAt(attachment.getUploadedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public String generateAndSavePdf(Long receiptMeetingIdx, String htmlContent, Long createdUserIdx) throws Exception {
        log.debug("연구비증빙 회의록 PDF 생성 시작 - receiptMeetingIdx: {}", receiptMeetingIdx);

        // 1. 회의록 조회
        ReceiptMeeting meeting = receiptMeetingRepository.findById(receiptMeetingIdx)
                .orElseThrow(() -> new IllegalArgumentException("회의록을 찾을 수 없습니다. IDX: " + receiptMeetingIdx));

        // 2. HTML을 PDF로 변환
        byte[] pdfBytes = pdfGenerationService.generatePdfFromRenderedHtml(htmlContent);

        // 3. PDF 파일 정보 생성
        String year = String.valueOf(LocalDate.now().getYear());
        String date = meeting.getMeetingDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String fileName = String.format("회의록_%s_%s.pdf",
                meeting.getDocumentNumber() != null ? meeting.getDocumentNumber() : receiptMeetingIdx,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")));

        // 4. PDF 파일 저장
        String filePath = pdfGenerationService.saveReceiptMeetingPdf(pdfBytes, fileName, year, date);

        // 5. DB에 PDF 메타데이터 저장
        ReceiptMeetingOfficialPdf pdfEntity = ReceiptMeetingOfficialPdf.builder()
                .receiptMeetingIdx(receiptMeetingIdx)
                .filePath(filePath)
                .fileName(fileName)
                .fileSize((long) pdfBytes.length)
                .createdUserIdx(createdUserIdx)
                .build();

        pdfRepository.save(pdfEntity);

        log.info("연구비증빙 회의록 PDF 생성 및 저장 완료 - filePath: {}", filePath);

        return filePath;
    }
}
