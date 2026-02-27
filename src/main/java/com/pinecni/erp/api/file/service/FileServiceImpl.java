package com.pinecni.erp.api.file.service;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.approval.repository.ApprovalFileRepository;
import com.pinecni.erp.api.document.repository.MonthlyReportRepository;
import com.pinecni.erp.api.document.repository.WeeklyReportRepository;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.api.file.dto.FileUploadDTO;
import com.pinecni.erp.api.file.mapper.FileMapper;
import com.pinecni.erp.entity.ApprovalDocument;
import com.pinecni.erp.entity.ApprovalFile;
import com.pinecni.erp.entity.MonthlyReport;
import com.pinecni.erp.entity.Project;
import com.pinecni.erp.entity.User;
import com.pinecni.erp.entity.WeeklyReport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 파일 저장/관리 Service 구현체
 *
 * 파일 저장 경로 구조:
 * - Base: ${file.base.dir} (application.properties에서 설정)
 * - Pattern: {base}/{pattern}/{timestamp}_{uuid}.{ext}
 * - 일반 전자문서:    /erp_file/documents/general/{year}/{month}/파일
 * - 연차신청서:       /erp_file/documents/vacation/{userId}/{year}/파일
 * - 프로젝트 주간보고: /erp_file/project/{projectIdx}/{year}/report/weekly/{documentIdx}/파일
 * - 프로젝트 월간보고: /erp_file/project/{projectIdx}/{year}/report/monthly/{documentIdx}/파일
 *
 * 프로젝트명 변환 규칙:
 * - "AI 연구 과제" → "AI-연구-과제"
 * - 공백 → 하이픈, 특수문자 제거, 최대 50자
 *
 * 특징:
 * - 상대 경로 사용으로 내부망/외부망 모두 호환
 * - 문서 타입별/프로젝트명별 디렉토리 분리
 * - 디렉토리 자동 생성 (존재하지 않을 경우)
 * - UUID 기반 파일명으로 중복 방지
 * - 소프트 삭제 (isDeleted 플래그)
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FileServiceImpl implements FileService {

    private final ApprovalFileRepository approvalFileRepository;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final WeeklyReportRepository weeklyReportRepository;
    private final MonthlyReportRepository monthlyReportRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final FileMapper fileMapper;

    @Value("${file.base.dir}")
    private String uploadDir;

    @Value("${file.storage.weekly-report.pattern}")
    private String weeklyReportPattern;

    @Value("${file.storage.general-weekly-report.pattern}")
    private String generalWeeklyReportPattern;

    @Value("${file.storage.monthly-report.pattern}")
    private String monthlyReportPattern;

    @Value("${file.storage.default.pattern}")
    private String defaultPattern;

    @Value("${file.storage.vacation.pattern}")
    private String vacationPattern;

    // 허용되는 파일 확장자
    private static final List<String> ALLOWED_EXTENSIONS = List.of(
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
        "hwp", "txt", "jpg", "jpeg", "png", "gif", "zip", "csv", "ttl", "rdf", "json"
    );

    // 최대 파일 크기 (50MB)
    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024;

    /**
     * 파일 업로드
     */
    @Override
    @Transactional
    public FileUploadDTO uploadFile(MultipartFile file, Long documentIdx, Long uploadUserIdx) {
        log.debug("uploadFile() called - originalFilename: {}, documentIdx: {}, uploadUserIdx: {}",
            file.getOriginalFilename(), documentIdx, uploadUserIdx);

        // 파일 검증
        validateFile(file);

        try {
            // 파일명 생성
            String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
            String storedFilename = generateStoredFilename(originalFilename);

            // 저장 경로 생성 (문서 타입 및 프로젝트에 따라 동적 생성)
            String relativePath = generateRelativePath(documentIdx);
            Path uploadPath = Paths.get(uploadDir, relativePath);

            // 디렉토리 자동 생성 (존재하지 않을 경우)
            // 내부망 또는 다른 환경에서도 자동으로 폴더 구조 생성
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
                log.debug("디렉토리 생성: {}", uploadPath);
            }

            // 파일 저장
            Path targetLocation = uploadPath.resolve(storedFilename);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            log.debug("파일 저장 완료: {}", targetLocation);

            // DB 저장
            ApprovalFile approvalFile = ApprovalFile.builder()
                .documentIdx(documentIdx)
                .originalFilename(originalFilename)
                .storedFilename(storedFilename)
                .filePath(relativePath)
                .fileSize(file.getSize())
                .fileType(file.getContentType())
                .uploadUserIdx(uploadUserIdx)
                .createdAt(LocalDateTime.now())
                .isDeleted(false)
                .build();

            ApprovalFile saved = approvalFileRepository.save(approvalFile);
            log.info("파일 업로드 완료 - idx: {}, originalFilename: {}",
                saved.getIdx(), originalFilename);

            return fileMapper.toDTO(saved);

        } catch (IOException e) {
            log.error("파일 저장 실패: {}", e.getMessage(), e);
            throw new RuntimeException("파일 저장에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 파일 다운로드
     */
    @Override
    public Resource downloadFile(Long fileIdx) {
        log.debug("downloadFile() called - fileIdx: {}", fileIdx);

        ApprovalFile approvalFile = approvalFileRepository.findById(fileIdx)
            .orElseThrow(() -> new RuntimeException("파일을 찾을 수 없습니다. ID: " + fileIdx));

        if (Boolean.TRUE.equals(approvalFile.getIsDeleted())) {
            throw new RuntimeException("삭제된 파일입니다.");
        }

        try {
            Path filePath = Paths.get(uploadDir, approvalFile.getFilePath(), approvalFile.getStoredFilename());
            log.debug("파일 다운로드 시도 - uploadDir: {}, filePath: {}, storedFilename: {}",
                uploadDir, approvalFile.getFilePath(), approvalFile.getStoredFilename());
            log.debug("전체 파일 경로: {}", filePath.toAbsolutePath());
            log.debug("파일 존재 여부: {}", Files.exists(filePath));

            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                log.info("파일 다운로드 성공 - fileIdx: {}, originalFilename: {}",
                    fileIdx, approvalFile.getOriginalFilename());
                return resource;
            } else {
                log.error("파일을 읽을 수 없음 - 존재: {}, 읽기가능: {}, 경로: {}",
                    resource.exists(), resource.isReadable(), filePath.toAbsolutePath());
                throw new RuntimeException("파일을 읽을 수 없습니다: " + approvalFile.getOriginalFilename());
            }
        } catch (Exception e) {
            log.error("파일 다운로드 실패: {}", e.getMessage(), e);
            throw new RuntimeException("파일 다운로드에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 문서의 파일 목록 조회
     */
    @Override
    public List<FileUploadDTO> getFilesByDocument(Long documentIdx) {
        log.debug("getFilesByDocument() called - documentIdx: {}", documentIdx);

        List<ApprovalFile> files = approvalFileRepository
            .findByDocumentIdxAndIsDeletedFalseOrderByCreatedAtDesc(documentIdx);

        return files.stream()
            .map(fileMapper::toDTO)
            .collect(Collectors.toList());
    }

    /**
     * 파일 정보 조회
     */
    @Override
    public FileUploadDTO getFileInfo(Long fileIdx) {
        log.debug("getFileInfo() called - fileIdx: {}", fileIdx);

        ApprovalFile approvalFile = approvalFileRepository.findById(fileIdx)
            .orElseThrow(() -> new RuntimeException("파일을 찾을 수 없습니다. ID: " + fileIdx));

        if (Boolean.TRUE.equals(approvalFile.getIsDeleted())) {
            throw new RuntimeException("삭제된 파일입니다.");
        }

        return fileMapper.toDTO(approvalFile);
    }

    /**
     * 파일 삭제 (소프트 딜리트)
     */
    @Override
    @Transactional
    public void deleteFile(Long fileIdx, Long deletedUserIdx) {
        log.debug("deleteFile() called - fileIdx: {}, deletedUserIdx: {}", fileIdx, deletedUserIdx);

        ApprovalFile approvalFile = approvalFileRepository.findById(fileIdx)
            .orElseThrow(() -> new RuntimeException("파일을 찾을 수 없습니다. ID: " + fileIdx));

        // 소프트 딜리트
        approvalFile.setIsDeleted(true);
        approvalFileRepository.save(approvalFile);

        log.info("파일 삭제 완료 - fileIdx: {}, originalFilename: {}",
            fileIdx, approvalFile.getOriginalFilename());
    }

    /**
     * 파일 검증
     */
    private void validateFile(MultipartFile file) {
        // 빈 파일 체크
        if (file.isEmpty()) {
            throw new RuntimeException("빈 파일은 업로드할 수 없습니다.");
        }

        // 파일 크기 체크
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("파일 크기는 50MB를 초과할 수 없습니다.");
        }

        // 파일 확장자 체크
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            throw new RuntimeException("파일명이 올바르지 않습니다.");
        }

        String extension = getFileExtension(originalFilename).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new RuntimeException("허용되지 않는 파일 형식입니다: " + extension);
        }
    }

    /**
     * 저장용 파일명 생성 (UUID 사용)
     */
    private String generateStoredFilename(String originalFilename) {
        String extension = getFileExtension(originalFilename);
        String uuid = UUID.randomUUID().toString().substring(0, 8);
        String timestamp = LocalDateTime.now().format(
            java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        return timestamp + "_" + uuid + "." + extension;
    }

    /**
     * 상대 경로 생성 (문서 타입 및 프로젝트에 따라 동적 생성)
     *
     * 패턴 예시:
     * - 프로젝트 주간업무보고: {projectIdx}/{year}/report/weekly/{documentIdx}
     * - 프로젝트 월간업무보고: {projectIdx}/{year}/report/monthly/{documentIdx}
     * - 일반 문서: general/{year}/{month}
     *
     * @param documentIdx 문서 IDX
     * @return 상대 경로 (예: 42/2026/report/weekly/101)
     *
     * Note: 디렉토리가 존재하지 않으면 uploadFile() 메서드에서 자동 생성됨
     *       projectName은 파일시스템 안전하게 변환됨 (공백→하이픈, 특수문자 제거)
     */
    private String generateRelativePath(Long documentIdx) {
        LocalDate now = LocalDate.now();
        String year = String.valueOf(now.getYear());
        String month = String.format("%02d", now.getMonthValue());

        // documentIdx로 ApprovalDocument 조회
        ApprovalDocument approvalDocument = approvalDocumentRepository.findById(documentIdx)
            .orElseThrow(() -> new RuntimeException("문서를 찾을 수 없습니다. documentIdx: " + documentIdx));

        String documentType = approvalDocument.getDocumentType();
        String pattern;
        Long projectIdx = null;
        String projectName = null;
        String userId = null;

        // 문서 타입에 따라 패턴 선택 및 프로젝트 정보 조회
        if ("주간업무보고".equals(documentType)) {
            pattern = generalWeeklyReportPattern;
            User drafter = userRepository.findById(approvalDocument.getDrafterUserIdx()).orElse(null);
            if (drafter != null && drafter.getEmpId() != null && !drafter.getEmpId().isBlank()) {
                userId = drafter.getEmpId();
            } else {
                userId = String.valueOf(approvalDocument.getDrafterUserIdx());
            }
        } else if ("프로젝트 주간업무보고".equals(documentType)) {
            pattern = weeklyReportPattern;
            // WeeklyReport에서 projectIdx 조회
            WeeklyReport weeklyReport = weeklyReportRepository.findByDocumentIdx(documentIdx)
                .orElse(null);
            if (weeklyReport != null) {
                projectIdx = weeklyReport.getProjectIdx();
                // Project에서 projectName 조회
                if (projectIdx != null) {
                    Project project = projectRepository.findById(projectIdx).orElse(null);
                    if (project != null) {
                        projectName = project.getProjectName();
                    }
                }
            }
        } else if ("프로젝트 월간업무보고".equals(documentType)) {
            pattern = monthlyReportPattern;
            MonthlyReport monthlyReport = monthlyReportRepository.findByDocumentIdx(documentIdx)
                .orElse(null);
            if (monthlyReport != null) {
                projectIdx = monthlyReport.getProjectIdx();
                if (projectIdx != null) {
                    Project project = projectRepository.findById(projectIdx).orElse(null);
                    if (project != null) {
                        projectName = project.getProjectName();
                    }
                }
            }
        } else if ("연차신청서".equals(documentType)) {
            pattern = vacationPattern;
            // 기안자의 사번(empId) 조회
            User drafter = userRepository.findById(approvalDocument.getDrafterUserIdx()).orElse(null);
            if (drafter != null && drafter.getEmpId() != null && !drafter.getEmpId().isBlank()) {
                userId = drafter.getEmpId();
            } else {
                userId = String.valueOf(approvalDocument.getDrafterUserIdx());
            }
        } else {
            // 기본 패턴 사용
            pattern = defaultPattern;
            // 기안자의 사번(empId) 조회
            User drafter = userRepository.findById(approvalDocument.getDrafterUserIdx()).orElse(null);
            if (drafter != null && drafter.getEmpId() != null && !drafter.getEmpId().isBlank()) {
                userId = drafter.getEmpId();
            } else {
                userId = String.valueOf(approvalDocument.getDrafterUserIdx());
            }
        }

        // projectName을 파일시스템 안전하게 변환
        String sanitizedProjectName = sanitizeProjectName(projectName);

        // 패턴 변수 치환
        String path = pattern
            .replace("{year}", year)
            .replace("{month}", month)
            .replace("{projectIdx}", projectIdx != null ? String.valueOf(projectIdx) : "0")
            .replace("{projectName}", sanitizedProjectName)
            .replace("{documentIdx}", String.valueOf(documentIdx))
            .replace("{userId}", userId != null ? userId : "unknown")
            .replace("{documentType}", documentType != null ? documentType : "unknown");

        log.debug("생성된 경로: {} (documentType: {}, projectIdx: {}, projectName: {}, userId: {})",
            path, documentType, projectIdx, projectName, userId);
        return path;
    }

    /**
     * 프로젝트명을 파일시스템 안전하게 변환
     *
     * 변환 규칙:
     * - 공백 → 하이픈 (-)
     * - 특수문자 제거 (영문, 숫자, 한글, 하이픈, 언더스코어만 허용)
     * - 연속된 하이픈 → 단일 하이픈
     * - 최대 길이: 50자
     * - null 또는 빈 문자열 → "unknown"
     *
     * @param projectName 원본 프로젝트명
     * @return 변환된 프로젝트명 (예: "AI 연구 과제" → "AI-연구-과제")
     */
    private String sanitizeProjectName(String projectName) {
        if (projectName == null || projectName.trim().isEmpty()) {
            return "unknown";
        }

        // 1. 앞뒤 공백 제거
        String sanitized = projectName.trim();

        // 2. 공백을 하이픈으로 변환
        sanitized = sanitized.replaceAll("\\s+", "-");

        // 3. 영문, 숫자, 한글, 하이픈, 언더스코어만 허용
        sanitized = sanitized.replaceAll("[^a-zA-Z0-9가-힣\\-_]", "");

        // 4. 연속된 하이픈을 단일 하이픈으로
        sanitized = sanitized.replaceAll("-+", "-");

        // 5. 앞뒤 하이픈 제거
        sanitized = sanitized.replaceAll("^-+|-+$", "");

        // 6. 길이 제한 (50자)
        if (sanitized.length() > 50) {
            sanitized = sanitized.substring(0, 50);
            // 마지막이 하이픈이면 제거
            sanitized = sanitized.replaceAll("-+$", "");
        }

        // 7. 빈 문자열이면 "unknown" 반환
        if (sanitized.isEmpty()) {
            return "unknown";
        }

        return sanitized;
    }

    /**
     * 파일 확장자 추출
     */
    private String getFileExtension(String filename) {
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1) {
            return "";
        }
        return filename.substring(lastDotIndex + 1);
    }
}
