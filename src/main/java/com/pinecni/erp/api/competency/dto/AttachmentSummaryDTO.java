package com.pinecni.erp.api.competency.dto;

import com.pinecni.erp.entity.UserCertificateAttachment;
import com.pinecni.erp.entity.UserSchoolAttachment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 학력/자격증 첨부파일 요약 DTO (응답용)
 * 학력 / 자격증 양쪽에서 동일 구조로 사용
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttachmentSummaryDTO {

    private Long idx;
    private String originalFilename;
    private Long fileSize;
    private String fileType;
    private LocalDateTime uploadedAt;

    public static AttachmentSummaryDTO from(UserSchoolAttachment a) {
        return AttachmentSummaryDTO.builder()
                .idx(a.getIdx())
                .originalFilename(a.getOriginalFilename())
                .fileSize(a.getFileSize())
                .fileType(a.getFileType())
                .uploadedAt(a.getUploadedAt())
                .build();
    }

    public static AttachmentSummaryDTO from(UserCertificateAttachment a) {
        return AttachmentSummaryDTO.builder()
                .idx(a.getIdx())
                .originalFilename(a.getOriginalFilename())
                .fileSize(a.getFileSize())
                .fileType(a.getFileType())
                .uploadedAt(a.getUploadedAt())
                .build();
    }
}
