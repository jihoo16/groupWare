package com.pinecni.erp.api.project.controller;

import com.pinecni.erp.api.project.dto.ProjectFileDTO;
import com.pinecni.erp.api.project.service.ProjectFileService;
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
 * 프로젝트 파일 Controller
 */
@Slf4j
@RestController
@RequestMapping("/api/project-files")
@RequiredArgsConstructor
public class ProjectFileController {

    private final ProjectFileService projectFileService;

    /**
     * 프로젝트 파일 업로드
     *
     * @param file MultipartFile
     * @param projectIdx 프로젝트 IDX
     * @param uploadUserIdx 업로드 사용자 IDX
     * @return ProjectFileDTO
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("projectIdx") Long projectIdx,
            @RequestParam("uploadUserIdx") Long uploadUserIdx) {

        log.debug("POST /api/project-files/upload - uploadFile() with filename: {}", file.getOriginalFilename());

        try {
            ProjectFileDTO result = projectFileService.uploadFile(file, projectIdx, uploadUserIdx);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("프로젝트 파일 업로드 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("파일 업로드에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 프로젝트 파일 다운로드
     *
     * @param fileIdx 파일 IDX
     * @return Resource
     */
    @GetMapping("/download/{fileIdx}")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long fileIdx) {
        log.debug("GET /api/project-files/download/{} - downloadFile()", fileIdx);

        try {
            // 파일 정보 조회
            ProjectFileDTO fileInfo = projectFileService.getFileInfo(fileIdx);
            String filename = fileInfo.getOriginalFilename();

            // 파일 리소스 조회
            Resource resource = projectFileService.downloadFile(fileIdx);

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
            log.error("프로젝트 파일 다운로드 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * 프로젝트별 파일 목록 조회
     *
     * @param projectIdx 프로젝트 IDX
     * @return List<ProjectFileDTO>
     */
    @GetMapping("/project/{projectIdx}")
    public ResponseEntity<?> getFilesByProject(@PathVariable Long projectIdx) {
        log.debug("GET /api/project-files/project/{} - getFilesByProject()", projectIdx);

        try {
            List<ProjectFileDTO> files = projectFileService.getFilesByProject(projectIdx);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            log.error("프로젝트 파일 목록 조회 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("파일 목록 조회에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 프로젝트 파일 삭제 (소프트 딜리트)
     *
     * @param fileIdx 파일 IDX
     * @param deletedUserIdx 삭제 사용자 IDX
     * @return ResponseEntity
     */
    @DeleteMapping("/{fileIdx}")
    public ResponseEntity<?> deleteFile(
            @PathVariable Long fileIdx,
            @RequestParam("deletedUserIdx") Long deletedUserIdx) {

        log.debug("DELETE /api/project-files/{} - deleteFile()", fileIdx);

        try {
            projectFileService.deleteFile(fileIdx, deletedUserIdx);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("프로젝트 파일 삭제 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("파일 삭제에 실패했습니다: " + e.getMessage());
        }
    }
}
