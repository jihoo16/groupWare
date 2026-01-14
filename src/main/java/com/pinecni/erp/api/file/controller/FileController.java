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


}
