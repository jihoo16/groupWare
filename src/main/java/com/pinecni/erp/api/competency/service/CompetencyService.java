package com.pinecni.erp.api.competency.service;

import com.pinecni.erp.api.competency.dto.*;

import java.util.List;

public interface CompetencyService {

    // ── 학력 ──────────────────────────────────────────────────────────────
    List<UserSchoolDTO>      getSchools(Long userIdx);
    UserSchoolDTO            createSchool(Long userIdx, UserSchoolRequestDTO dto, Long requestingUserIdx);
    UserSchoolDTO            updateSchool(Long idx, UserSchoolRequestDTO dto, Long requestingUserIdx);
    void                     deleteSchool(Long idx, Long requestingUserIdx);

    // ── 자격증 ────────────────────────────────────────────────────────────
    List<UserCertificateDTO> getCertificates(Long userIdx);
    UserCertificateDTO       createCertificate(Long userIdx, UserCertificateRequestDTO dto, Long requestingUserIdx);
    UserCertificateDTO       updateCertificate(Long idx, UserCertificateRequestDTO dto, Long requestingUserIdx);
    void                     deleteCertificate(Long idx, Long requestingUserIdx);

    // ── 경력 ──────────────────────────────────────────────────────────────
    List<UserCareerDTO>      getCareers(Long userIdx);
    UserCareerDTO            createCareer(Long userIdx, UserCareerRequestDTO dto, Long requestingUserIdx);
    UserCareerDTO            updateCareer(Long idx, UserCareerRequestDTO dto, Long requestingUserIdx);
    void                     deleteCareer(Long idx, Long requestingUserIdx);

    // ── 교육이수 ──────────────────────────────────────────────────────────
    List<UserTrainingDTO>    getTrainings(Long userIdx);
    UserTrainingDTO          createTraining(Long userIdx, UserTrainingRequestDTO dto, Long requestingUserIdx);
    UserTrainingDTO          updateTraining(Long idx, UserTrainingRequestDTO dto, Long requestingUserIdx);
    void                     deleteTraining(Long idx, Long requestingUserIdx);
}
