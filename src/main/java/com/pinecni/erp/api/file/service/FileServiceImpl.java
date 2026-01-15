package com.pinecni.erp.api.file.service;

import com.pinecni.erp.api.approval.repository.ApprovalFileRepository;
import com.pinecni.erp.api.file.dto.FileUploadDTO;
import com.pinecni.erp.api.file.mapper.FileMapper;
import com.pinecni.erp.entity.ApprovalFile;
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
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FileServiceImpl implements FileService {

    private final ApprovalFileRepository approvalFileRepository;
    private final FileMapper fileMapper;

    @Value("${file.upload.dir}")
    private String uploadDir;

    // 허용되는 파일 확장자
    private static final List<String> ALLOWED_EXTENSIONS = List.of(
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
        "hwp", "txt", "jpg", "jpeg", "png", "gif", "zip"
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

            // 저장 경로 생성 (년/월 기준)
            String relativePath = generateRelativePath();
            Path uploadPath = Paths.get(uploadDir, relativePath);

            // 디렉토리 생성
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
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                log.info("파일 다운로드 - fileIdx: {}, originalFilename: {}",
                    fileIdx, approvalFile.getOriginalFilename());
                return resource;
            } else {
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
     * 상대 경로 생성 (년/월)
     */
    private String generateRelativePath() {
        LocalDate now = LocalDate.now();
        return String.format("weekly-report/%d/%02d", now.getYear(), now.getMonthValue());
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
