package com.pinecni.erp.api.file.controller;

import com.pinecni.erp.api.file.dto.FileUploadDTO;
import com.pinecni.erp.api.file.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * 파일 업로드/다운로드 Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    /**
     * 파일 업로드
     *
     * @param file MultipartFile
     * @param documentIdx 문서 IDX
     * @param uploadUserIdx 업로드 사용자 IDX
     * @return FileUploadDTO
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("documentIdx") Long documentIdx,
            @RequestParam("uploadUserIdx") Long uploadUserIdx) {

        log.info("파일 업로드 요청 - filename: {}, documentIdx: {}, uploadUserIdx: {}",
            file.getOriginalFilename(), documentIdx, uploadUserIdx);

        try {
            FileUploadDTO result = fileStorageService.uploadFile(file, documentIdx, uploadUserIdx);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("파일 업로드 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("파일 업로드에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 파일 다운로드
     *
     * @param fileIdx 파일 IDX
     * @return Resource
     */
    @GetMapping("/download/{fileIdx}")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long fileIdx) {
        log.info("파일 다운로드 요청 - fileIdx: {}", fileIdx);

        try {
            // 파일 정보 조회
            FileUploadDTO fileInfo = fileStorageService.getFileInfo(fileIdx);
            String filename = fileInfo.getOriginalFilename();

            // 파일 리소스 조회
            Resource resource = fileStorageService.downloadFile(fileIdx);

            // 파일명 인코딩 (한글 지원)
            String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8.toString())
                .replaceAll("\\+", "%20");

            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"" + encodedFilename + "\"")
                .body(resource);

        } catch (UnsupportedEncodingException e) {
            log.error("파일명 인코딩 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (Exception e) {
            log.error("파일 다운로드 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * 문서별 파일 목록 조회
     *
     * @param documentIdx 문서 IDX
     * @return List<FileUploadDTO>
     */
    @GetMapping("/document/{documentIdx}")
    public ResponseEntity<?> getFilesByDocument(@PathVariable Long documentIdx) {
        log.info("문서 파일 목록 조회 요청 - documentIdx: {}", documentIdx);

        try {
            List<FileUploadDTO> files = fileStorageService.getFilesByDocument(documentIdx);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            log.error("파일 목록 조회 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("파일 목록 조회에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 파일 삭제 (소프트 딜리트)
     *
     * @param fileIdx 파일 IDX
     * @param deletedUserIdx 삭제 사용자 IDX
     * @return ResponseEntity
     */
    @DeleteMapping("/{fileIdx}")
    public ResponseEntity<?> deleteFile(
            @PathVariable Long fileIdx,
            @RequestParam("deletedUserIdx") Long deletedUserIdx) {

        log.info("파일 삭제 요청 - fileIdx: {}, deletedUserIdx: {}", fileIdx, deletedUserIdx);

        try {
            fileStorageService.deleteFile(fileIdx, deletedUserIdx);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("파일 삭제 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("파일 삭제에 실패했습니다: " + e.getMessage());
        }
    }
}
