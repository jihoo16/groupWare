package com.pinecni.erp.api.competency.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.core.io.Resource;

/**
 * 첨부파일 다운로드 응답 묶음 — Resource + 원본 파일명 + ContentType
 * Controller 에서 헤더 세팅에 사용
 */
@Getter
@Builder
@AllArgsConstructor
public class AttachmentDownloadDTO {
    private final Resource resource;
    private final String originalFilename;
    private final String contentType;
}
