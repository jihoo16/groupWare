package com.pinecni.erp.api.signature.service;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.document.repository.ReceiptOvertimeAttachmentRepository;
import com.pinecni.erp.api.document.repository.ReceiptOvertimeRepository;
import com.pinecni.erp.api.project.repository.ProjectCardRepository;
import com.pinecni.erp.constant.CodeConstants;
import com.pinecni.erp.entity.ApprovalDocument;
import com.pinecni.erp.entity.ProjectCard;
import com.pinecni.erp.entity.ReceiptOvertime;
import com.pinecni.erp.entity.ReceiptOvertimeAttachment;
import com.pinecni.erp.service.PlaywrightPdfService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;

/**
 * 카테고리 B (대표이사 수기 서명 불필요) 문서의 전자서명 완료 시점에
 * 자동으로 공식 양식 PDF를 생성·저장·등록하는 서비스.
 *
 * <p>대상 문서 5종: C0403 야근식대 / C0404 단독출장 / C0405 출장+회의 /
 *                 C0406 회의록 / C0410 프로젝트 주간보고</p>
 *
 * <p>처리 흐름:
 * <ol>
 *   <li>마지막 서명자가 모바일에서 서명 제출 → 트랜잭션 커밋 후 이벤트 발행</li>
 *   <li>리스너가 이 서비스의 {@link #generate(Long)} 호출 (@Async)</li>
 *   <li>Playwright 가 자기 자신(127.0.0.1:8080)의 상세 페이지 접속하여 PDF 변환</li>
 *   <li>기존 첨부 경로/테이블에 attachment_type=AUTO_SIGNED_PDF 로 INSERT</li>
 * </ol></p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AutoSignedPdfService {

    public static final String ATTACHMENT_TYPE = "AUTO_SIGNED_PDF";

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final PlaywrightPdfService playwrightPdfService;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final ProjectCardRepository projectCardRepository;
    private final ReceiptOvertimeRepository receiptOvertimeRepository;
    private final ReceiptOvertimeAttachmentRepository receiptOvertimeAttachmentRepository;

    @Value("${pdf.internal.base-url:http://127.0.0.1:8080}")
    private String internalBaseUrl;

    @Value("${pdf.internal.token:}")
    private String internalPdfToken;

    @Value("${file.base.dir}")
    private String baseDir;

    @Value("${file.project.receipt-overtime.pattern}")
    private String overtimePattern;

    /**
     * 해당 문서가 카테고리 B 인지 판별.
     */
    public boolean isCategoryB(String documentType) {
        if (documentType == null) return false;
        return CodeConstants.DocumentType.RECEIPT_OVERTIME.getCode().equals(documentType)
                || CodeConstants.DocumentType.RECEIPT_TRIP.getCode().equals(documentType)
                || CodeConstants.DocumentType.RECEIPT_TRIP_MEETING.getCode().equals(documentType)
                || CodeConstants.DocumentType.RECEIPT_MEETING.getCode().equals(documentType)
                || CodeConstants.DocumentType.PROJECT_WEEKLY_REPORT.getCode().equals(documentType);
    }

    /**
     * 문서의 자동 서명 PDF 생성 + 저장 + 첨부 등록.
     *
     * <p>실패 시 RuntimeException 으로 던짐 — 호출부(이벤트 리스너 / 재시도 컨트롤러)가
     * 로그·사용자 응답 처리 책임.</p>
     *
     * <p>이미 AUTO_SIGNED_PDF 첨부가 존재하면 새 파일로 재생성하고 기존 행은 soft delete 처리
     * (재시도 시 깔끔한 상태 유지).</p>
     */
    @Transactional
    public void generate(Long documentIdx) {
        ApprovalDocument document = approvalDocumentRepository.findById(documentIdx)
                .orElseThrow(() -> new IllegalArgumentException("문서를 찾을 수 없습니다: " + documentIdx));
        String docType = document.getDocumentType();
        if (!isCategoryB(docType)) {
            log.info("[자동 PDF] 카테고리 B 아님 — 생략: documentIdx={}, docType={}", documentIdx, docType);
            return;
        }

        log.info("[자동 PDF] 생성 시작: documentIdx={}, docType={}, documentNo={}",
                documentIdx, docType, document.getDocumentNo());

        CodeConstants.DocumentType type = CodeConstants.DocumentType.fromCodeOrNull(docType);
        if (type == null) {
            log.warn("[자동 PDF] 알 수 없는 문서 유형 — 생략: documentIdx={}, docType={}", documentIdx, docType);
            return;
        }
        switch (type) {
            case RECEIPT_OVERTIME -> generateReceiptOvertime(document);
            // TODO: 나머지 4종 (TRIP / TRIP_MEETING / MEETING / PROJECT_WEEKLY_REPORT) 후속 구현
            default -> log.warn("[자동 PDF] 핸들러 미구현 — 생략: documentIdx={}, docType={}", documentIdx, docType);
        }
    }

    /**
     * 자동 서명 PDF 첨부가 이미 존재하는지 확인 (UI 표시 분기용).
     */
    public boolean hasFinalPdf(Long documentIdx) {
        return findFinalPdfInfo(documentIdx) != null;
    }

    /**
     * 자동 서명 PDF 첨부 정보 조회 (다운로드 URL 포함).
     * 없으면 null 반환.
     */
    public FinalPdfInfo findFinalPdfInfo(Long documentIdx) {
        ApprovalDocument doc = approvalDocumentRepository.findById(documentIdx).orElse(null);
        if (doc == null) return null;
        String docType = doc.getDocumentType();
        if (CodeConstants.DocumentType.RECEIPT_OVERTIME.getCode().equals(docType)) {
            return receiptOvertimeRepository.findByDocumentIdx(documentIdx)
                    .flatMap(ro -> receiptOvertimeAttachmentRepository
                            .findByReceiptOvertimeIdxAndDeletedFalseOrderByIdxAsc(ro.getIdx())
                            .stream()
                            .filter(a -> ATTACHMENT_TYPE.equals(a.getAttachmentType()))
                            .reduce((first, second) -> second)) // 가장 최신
                    .map(a -> new FinalPdfInfo(
                            a.getIdx(),
                            a.getOriginalFilename(),
                            "/api/receipt-overtimes/attachments/" + a.getIdx() + "/download",
                            a.getCreatedAt()))
                    .orElse(null);
        }
        // TODO: 나머지 4종
        return null;
    }

    /** 자동 서명 PDF 첨부 정보 DTO */
    public record FinalPdfInfo(Long attachmentIdx, String fileName, String downloadUrl, LocalDateTime createdAt) {}

    // ============================================================
    // C0403 야근식대 핸들러
    // ============================================================

    private void generateReceiptOvertime(ApprovalDocument document) {
        Long documentIdx = document.getIdx();
        ReceiptOvertime overtime = receiptOvertimeRepository.findByDocumentIdx(documentIdx)
                .orElseThrow(() -> new IllegalStateException("야근식대 본문을 찾을 수 없습니다: documentIdx=" + documentIdx));

        // 1. 경로 구성
        String cardLastDigits = resolveCardLastDigits(overtime.getCardIdx());
        String dateStr = overtime.getOvertimeDate() != null
                ? overtime.getOvertimeDate().format(DATE_FMT)
                : LocalDate.now().format(DATE_FMT);
        String year = dateStr.substring(0, 4);
        String relativePath = overtimePattern
                .replace("{projectIdx}", String.valueOf(overtime.getProjectIdx()))
                .replace("{cardLastDigits}", cardLastDigits)
                .replace("{year}", year)
                .replace("{date}", dateStr);
        Path targetDir = Paths.get(baseDir, relativePath.split("/"));
        ensureDir(targetDir);

        // 2. 파일명: {문서번호}_signed.pdf (중복 시 _1, _2 ...)
        String safeDocNo = sanitize(document.getDocumentNo());
        String fileName = resolveUniqueFilename(targetDir, safeDocNo + "_signed.pdf");

        // 3. PDF 생성 (Playwright 가 상세페이지 접속 → 인쇄 모드 PDF)
        String detailUrl = internalBaseUrl + "/approval/receipt-overtime/detail?documentIdx=" + documentIdx;
        byte[] pdfBytes;
        try {
            pdfBytes = playwrightPdfService.convertUrlToPdfWithHeaders(
                    detailUrl,
                    Map.of("X-Internal-PDF-Token", internalPdfToken),
                    new PlaywrightPdfService.PdfOptions());
        } catch (Exception e) {
            throw new RuntimeException("PDF 생성에 실패했습니다. 잠시 후 [PDF 다시 생성하기]을 눌러 주세요. (사유: "
                    + e.getMessage() + ")", e);
        }

        // 4. 파일 저장
        Path filePath = targetDir.resolve(fileName);
        try {
            Files.write(filePath, pdfBytes);
        } catch (IOException e) {
            throw new RuntimeException("PDF 파일 저장에 실패했습니다. 서버 디스크 상태 확인이 필요합니다.", e);
        }
        log.info("[자동 PDF] 저장 완료: {} ({} bytes)", filePath, pdfBytes.length);

        // 5. 기존 AUTO_SIGNED_PDF 행 soft delete (재생성 케이스)
        receiptOvertimeAttachmentRepository
                .findByReceiptOvertimeIdxAndDeletedFalseOrderByIdxAsc(overtime.getIdx())
                .stream()
                .filter(a -> ATTACHMENT_TYPE.equals(a.getAttachmentType()))
                .forEach(a -> {
                    a.setDeleted(true);
                    a.setDeletedAt(LocalDateTime.now());
                    receiptOvertimeAttachmentRepository.save(a);
                });

        // 6. 새 첨부 INSERT
        ReceiptOvertimeAttachment attachment = ReceiptOvertimeAttachment.builder()
                .receiptOvertimeIdx(overtime.getIdx())
                .originalFilename(fileName)
                .storedFilename(fileName)
                .filePath(filePath.toString())
                .fileSize((long) pdfBytes.length)
                .fileType("application/pdf")
                .attachmentType(ATTACHMENT_TYPE)
                .uploadUserIdx(document.getDrafterUserIdx())
                .deleted(false)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        receiptOvertimeAttachmentRepository.save(attachment);
        log.info("[자동 PDF] 첨부 등록 완료: receiptOvertimeIdx={}, attachmentIdx={}",
                overtime.getIdx(), attachment.getIdx());
    }

    // ============================================================
    // 공통 헬퍼
    // ============================================================

    private String resolveCardLastDigits(Long cardIdx) {
        if (cardIdx == null) return "noCard";
        return projectCardRepository.findById(cardIdx)
                .map(ProjectCard::getCardLastDigits)
                .orElse("noCard");
    }

    private void ensureDir(Path dir) {
        try {
            Files.createDirectories(dir);
        } catch (IOException e) {
            throw new RuntimeException("저장 폴더 생성에 실패했습니다: " + dir, e);
        }
    }

    /** 파일명에 부적합한 문자 제거 */
    private String sanitize(String raw) {
        if (raw == null || raw.isBlank()) return "document";
        return raw.replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    private String resolveUniqueFilename(Path targetDir, String fileName) {
        Path candidate = targetDir.resolve(fileName);
        if (!Files.exists(candidate)) return fileName;
        int dot = fileName.lastIndexOf('.');
        String base = dot >= 0 ? fileName.substring(0, dot) : fileName;
        String ext = dot >= 0 ? fileName.substring(dot) : "";
        for (int i = 1; i < 10000; i++) {
            String next = base + "_" + i + ext;
            if (!Files.exists(targetDir.resolve(next))) return next;
        }
        return fileName;
    }
}
