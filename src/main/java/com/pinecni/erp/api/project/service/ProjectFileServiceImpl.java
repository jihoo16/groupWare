package com.pinecni.erp.api.project.service;

import com.pinecni.erp.api.project.dto.ProjectFileDTO;
import com.pinecni.erp.api.project.repository.ProjectFileRepository;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.entity.Project;
import com.pinecni.erp.entity.ProjectFile;
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
 * 프로젝트 파일 Service 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectFileServiceImpl implements ProjectFileService {

    private final ProjectFileRepository projectFileRepository;
    private final ProjectRepository projectRepository;

    @Value("${file.base.dir}")
    private String baseDir;

    @Value("${file.storage.project.pattern}")
    private String projectPathPattern;

    // 허용되는 파일 확장자
    private static final List<String> ALLOWED_EXTENSIONS = List.of(
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
        "hwp", "txt", "jpg", "jpeg", "png", "gif", "zip", "csv", "ttl", "rdf", "json"
    );

    // 최대 파일 크기 (50MB)
    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024;

    @Override
    @Transactional
    public ProjectFileDTO uploadFile(MultipartFile file, Long projectIdx, Long uploadUserIdx) {
        log.debug("uploadFile() called - originalFilename: {}, projectIdx: {}, uploadUserIdx: {}",
            file.getOriginalFilename(), projectIdx, uploadUserIdx);

        // 파일 검증
        validateFile(file);

        // 프로젝트 존재 확인
        Project project = projectRepository.findById(projectIdx)
            .orElseThrow(() -> new RuntimeException("프로젝트를 찾을 수 없습니다. projectIdx: " + projectIdx));

        try {
            // 파일명 생성
            String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
            String storedFilename = generateStoredFilename(originalFilename);

            // 저장 경로 생성
            String relativePath = generateRelativePath(project);
            Path uploadPath = Paths.get(baseDir, relativePath);

            // 디렉토리 자동 생성
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
                log.debug("디렉토리 생성: {}", uploadPath);
            }

            // 파일 저장
            Path targetLocation = uploadPath.resolve(storedFilename);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            log.debug("파일 저장 완료: {}", targetLocation);

            // DB 저장
            ProjectFile projectFile = ProjectFile.builder()
                .projectIdx(projectIdx)
                .originalFilename(originalFilename)
                .storedFilename(storedFilename)
                .filePath(relativePath)
                .fileSize(file.getSize())
                .fileType(file.getContentType())
                .uploadUserIdx(uploadUserIdx)
                .createdAt(LocalDateTime.now())
                .isDeleted(false)
                .build();

            ProjectFile saved = projectFileRepository.save(projectFile);
            log.info("프로젝트 파일 업로드 완료 - idx: {}, originalFilename: {}",
                saved.getIdx(), originalFilename);

            return convertToDTO(saved);

        } catch (IOException e) {
            log.error("파일 저장 실패: {}", e.getMessage(), e);
            throw new RuntimeException("파일 저장에 실패했습니다: " + e.getMessage());
        }
    }

    @Override
    public Resource downloadFile(Long fileIdx) {
        log.debug("downloadFile() called - fileIdx: {}", fileIdx);

        ProjectFile projectFile = projectFileRepository.findById(fileIdx)
            .orElseThrow(() -> new RuntimeException("파일을 찾을 수 없습니다. ID: " + fileIdx));

        if (Boolean.TRUE.equals(projectFile.getIsDeleted())) {
            throw new RuntimeException("삭제된 파일입니다.");
        }

        try {
            Path filePath = Paths.get(baseDir, projectFile.getFilePath(), projectFile.getStoredFilename());
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                log.info("파일 다운로드 - fileIdx: {}, originalFilename: {}",
                    fileIdx, projectFile.getOriginalFilename());
                return resource;
            } else {
                throw new RuntimeException("파일을 읽을 수 없습니다: " + projectFile.getOriginalFilename());
            }
        } catch (Exception e) {
            log.error("파일 다운로드 실패: {}", e.getMessage(), e);
            throw new RuntimeException("파일 다운로드에 실패했습니다: " + e.getMessage());
        }
    }

    @Override
    public List<ProjectFileDTO> getFilesByProject(Long projectIdx) {
        log.debug("getFilesByProject() called - projectIdx: {}", projectIdx);

        List<ProjectFile> files = projectFileRepository.findByProjectIdx(projectIdx);

        return files.stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    @Override
    public ProjectFileDTO getFileInfo(Long fileIdx) {
        log.debug("getFileInfo() called - fileIdx: {}", fileIdx);

        ProjectFile projectFile = projectFileRepository.findById(fileIdx)
            .orElseThrow(() -> new RuntimeException("파일을 찾을 수 없습니다. ID: " + fileIdx));

        if (Boolean.TRUE.equals(projectFile.getIsDeleted())) {
            throw new RuntimeException("삭제된 파일입니다.");
        }

        return convertToDTO(projectFile);
    }

    @Override
    @Transactional
    public void deleteFile(Long fileIdx, Long deletedUserIdx) {
        log.debug("deleteFile() called - fileIdx: {}, deletedUserIdx: {}", fileIdx, deletedUserIdx);

        ProjectFile projectFile = projectFileRepository.findById(fileIdx)
            .orElseThrow(() -> new RuntimeException("파일을 찾을 수 없습니다. ID: " + fileIdx));

        // 소프트 딜리트
        projectFile.setIsDeleted(true);
        projectFileRepository.save(projectFile);

        log.info("프로젝트 파일 삭제 완료 - fileIdx: {}, originalFilename: {}",
            fileIdx, projectFile.getOriginalFilename());
    }

    /**
     * 파일 검증
     */
    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new RuntimeException("빈 파일은 업로드할 수 없습니다.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("파일 크기는 50MB를 초과할 수 없습니다.");
        }

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
     * 상대 경로 생성 (프로젝트별 디렉토리)
     * 패턴: application.properties의 file.storage.project.pattern 사용
     * 예: {projectName}/{year}/{month}
     */
    private String generateRelativePath(Project project) {
        LocalDate now = LocalDate.now();
        String year = String.valueOf(now.getYear());
        String month = String.format("%02d", now.getMonthValue());

        String sanitizedProjectName = sanitizeProjectName(project.getProjectName());

        // 패턴 변수 치환
        String path = projectPathPattern
            .replace("{year}", year)
            .replace("{month}", month)
            .replace("{projectIdx}", String.valueOf(project.getIdx()))
            .replace("{projectName}", sanitizedProjectName);

        log.debug("생성된 경로: {} (projectIdx: {}, projectName: {})",
            path, project.getIdx(), project.getProjectName());
        return path;
    }

    /**
     * 프로젝트명을 파일시스템 안전하게 변환
     */
    private String sanitizeProjectName(String projectName) {
        if (projectName == null || projectName.trim().isEmpty()) {
            return "unknown";
        }

        String sanitized = projectName.trim();
        sanitized = sanitized.replaceAll("\\s+", "-");
        sanitized = sanitized.replaceAll("[^a-zA-Z0-9가-힣\\-_]", "");
        sanitized = sanitized.replaceAll("-+", "-");
        sanitized = sanitized.replaceAll("^-+|-+$", "");

        if (sanitized.length() > 50) {
            sanitized = sanitized.substring(0, 50);
            sanitized = sanitized.replaceAll("-+$", "");
        }

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

    /**
     * Entity → DTO 변환
     */
    private ProjectFileDTO convertToDTO(ProjectFile file) {
        return ProjectFileDTO.builder()
            .idx(file.getIdx())
            .projectIdx(file.getProjectIdx())
            .originalFilename(file.getOriginalFilename())
            .storedFilename(file.getStoredFilename())
            .filePath(file.getFilePath())
            .fileSize(file.getFileSize())
            .fileType(file.getFileType())
            .description(file.getDescription())
            .uploadUserIdx(file.getUploadUserIdx())
            .createdAt(file.getCreatedAt())
            .downloadUrl("/api/project-files/download/" + file.getIdx())
            .build();
    }
}
