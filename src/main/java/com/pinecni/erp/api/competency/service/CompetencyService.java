package com.pinecni.erp.api.competency.service;

import com.pinecni.erp.api.competency.dto.*;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface CompetencyService {

    // ── 학력 ──────────────────────────────────────────────────────────────
    List<UserSchoolDTO>      getSchools(Long userIdx, Long requestingUserIdx);
    UserSchoolDTO            createSchool(Long userIdx, UserSchoolRequestDTO dto, Long requestingUserIdx);
    UserSchoolDTO            updateSchool(Long idx, UserSchoolRequestDTO dto, Long requestingUserIdx);
    void                     deleteSchool(Long idx, Long requestingUserIdx);

    // ── 자격증 ────────────────────────────────────────────────────────────
    List<UserCertificateDTO> getCertificates(Long userIdx, Long requestingUserIdx);
    UserCertificateDTO       createCertificate(Long userIdx, UserCertificateRequestDTO dto, Long requestingUserIdx);
    UserCertificateDTO       updateCertificate(Long idx, UserCertificateRequestDTO dto, Long requestingUserIdx);
    void                     deleteCertificate(Long idx, Long requestingUserIdx);

    // ── 경력 ──────────────────────────────────────────────────────────────
    List<UserCareerDTO>      getCareers(Long userIdx, Long requestingUserIdx);
    UserCareerDTO            createCareer(Long userIdx, UserCareerRequestDTO dto, Long requestingUserIdx);
    UserCareerDTO            updateCareer(Long idx, UserCareerRequestDTO dto, Long requestingUserIdx);
    void                     deleteCareer(Long idx, Long requestingUserIdx);

    // ── 교육이수 ──────────────────────────────────────────────────────────
    List<UserTrainingDTO>    getTrainings(Long userIdx, Long requestingUserIdx);
    UserTrainingDTO          createTraining(Long userIdx, UserTrainingRequestDTO dto, Long requestingUserIdx);
    UserTrainingDTO          updateTraining(Long idx, UserTrainingRequestDTO dto, Long requestingUserIdx);
    void                     deleteTraining(Long idx, Long requestingUserIdx);

    // ── 담당자(역량 열람자) 권한 관리 (관리자 전용) ───────────────────────
    void grantCompetencyViewerRole(Long targetUserIdx, Long adminIdx);
    void revokeCompetencyViewerRole(Long targetUserIdx, Long adminIdx);

    // ── 병적사항 (본인 입력만 허용) ───────────────────────────────────────
    UserMilitaryServiceDTO getMilitaryService(Long userIdx, Long requestingUserIdx);
    UserMilitaryServiceDTO updateMilitaryService(Long userIdx, UserMilitaryServiceDTO dto, Long requestingUserIdx);

    // ── 학력 첨부파일 ────────────────────────────────────────────────────
    AttachmentSummaryDTO uploadSchoolAttachment(Long schoolIdx, MultipartFile file, Long requestingUserIdx);
    void                 deleteSchoolAttachment(Long attachmentIdx, Long requestingUserIdx);
    AttachmentDownloadDTO downloadSchoolAttachment(Long attachmentIdx, Long requestingUserIdx);

    // ── 자격증 첨부파일 ──────────────────────────────────────────────────
    AttachmentSummaryDTO uploadCertificateAttachment(Long certificateIdx, MultipartFile file, Long requestingUserIdx);
    void                 deleteCertificateAttachment(Long attachmentIdx, Long requestingUserIdx);
    AttachmentDownloadDTO downloadCertificateAttachment(Long attachmentIdx, Long requestingUserIdx);

    // ── 역량관리 열람 페이지용 ─────────────────────────────────────────────
    List<UserCompetencyOverviewDTO> getCompetencyOverview(Long requestingUserIdx);
    CompetencyExportDataDTO         getCompetencyExportData(Long requestingUserIdx);

    // ── 법정교육 일괄 등록 (관리자 전용) ──────────────────────────────────
    BulkTrainingResultDTO bulkCreateTraining(BulkTrainingRequestDTO dto, Long adminIdx);
}
