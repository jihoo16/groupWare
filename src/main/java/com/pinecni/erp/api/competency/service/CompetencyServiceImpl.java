package com.pinecni.erp.api.competency.service;

import com.pinecni.erp.api.competency.dto.*;
import com.pinecni.erp.api.competency.repository.*;
import com.pinecni.erp.api.user.UserRole;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompetencyServiceImpl implements CompetencyService {

    private final UserSchoolRepository      userSchoolRepository;
    private final UserCertificateRepository userCertificateRepository;
    private final UserCareerRepository      userCareerRepository;
    private final UserTrainingRepository    userTrainingRepository;
    private final UserRepository            userRepository;

    // =========================================================
    // 공통 검증 헬퍼
    // =========================================================

    /** 관리자(ADMIN) 이상 여부 확인 */
    private boolean isAdmin(Long userIdx) {
        return userRepository.findById(userIdx)
                .map(u -> UserRole.fromCode(u.getUserRoleCode()).isAtLeast(UserRole.ADMIN))
                .orElse(false);
    }

    /**
     * 소유권 검증 — 본인 또는 관리자만 허용
     * 허용되지 않으면 403 Forbidden 예외 발생
     */
    private void validateOwnership(Long ownerUserIdx, Long requestingUserIdx) {
        if (!ownerUserIdx.equals(requestingUserIdx) && !isAdmin(requestingUserIdx)) {
            log.warn("권한 없음: ownerUserIdx={}, requestingUserIdx={}", ownerUserIdx, requestingUserIdx);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 또는 관리자만 수정/삭제할 수 있습니다.");
        }
    }

    /**
     * 생성 권한 검증 — 본인 데이터 또는 관리자만 허용
     * 일반 사용자가 타인 userIdx로 생성 시도하면 403
     */
    private void validateCreatePermission(Long targetUserIdx, Long requestingUserIdx) {
        if (!targetUserIdx.equals(requestingUserIdx) && !isAdmin(requestingUserIdx)) {
            log.warn("생성 권한 없음: targetUserIdx={}, requestingUserIdx={}", targetUserIdx, requestingUserIdx);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 데이터만 등록할 수 있습니다.");
        }
    }

    /**
     * 경력 기간 자동 계산
     * is_now=true 이면 오늘 기준, false 이면 careerEndDate 기준
     * 반환: int[]{years, months}
     */
    private int[] calcCareerPeriod(LocalDate startDate, LocalDate endDate, Boolean isNow) {
        LocalDate end = Boolean.TRUE.equals(isNow) ? LocalDate.now() : endDate;
        if (end == null || startDate == null || !end.isAfter(startDate)) {
            return new int[]{0, 0};
        }
        Period period = Period.between(startDate, end);
        return new int[]{period.getYears(), period.getMonths()};
    }

    // =========================================================
    // 학력
    // =========================================================

    @Override
    @Transactional(readOnly = true)
    public List<UserSchoolDTO> getSchools(Long userIdx) {
        return userSchoolRepository.findByUserIdxOrderByGraduationDateDesc(userIdx)
                .stream()
                .map(UserSchoolDTO::from)
                .toList();
    }

    @Override
    @Transactional
    public UserSchoolDTO createSchool(Long userIdx, UserSchoolRequestDTO dto, Long requestingUserIdx) {
        validateCreatePermission(userIdx, requestingUserIdx);

        UserSchool entity = UserSchool.builder()
                .userIdx(userIdx)
                .schoolName(dto.getSchoolName())
                .majorName(dto.getMajorName())
                .degreeType(dto.getDegreeType())
                .graduationDate(dto.getGraduationDate())
                .notes(dto.getNotes())
                .createdUserIdx(requestingUserIdx)
                .updatedUserIdx(requestingUserIdx)
                .build();

        return UserSchoolDTO.from(userSchoolRepository.save(entity));
    }

    @Override
    @Transactional
    public UserSchoolDTO updateSchool(Long idx, UserSchoolRequestDTO dto, Long requestingUserIdx) {
        UserSchool entity = userSchoolRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "학력 정보를 찾을 수 없습니다."));

        validateOwnership(entity.getUserIdx(), requestingUserIdx);

        entity.setSchoolName(dto.getSchoolName());
        entity.setMajorName(dto.getMajorName());
        entity.setDegreeType(dto.getDegreeType());
        entity.setGraduationDate(dto.getGraduationDate());
        entity.setNotes(dto.getNotes());
        entity.setUpdatedUserIdx(requestingUserIdx);

        return UserSchoolDTO.from(userSchoolRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteSchool(Long idx, Long requestingUserIdx) {
        UserSchool entity = userSchoolRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "학력 정보를 찾을 수 없습니다."));

        validateOwnership(entity.getUserIdx(), requestingUserIdx);

        entity.setIsDeleted(true);
        entity.setDeletedAt(LocalDateTime.now());
        entity.setDeletedUserIdx(requestingUserIdx);
        userSchoolRepository.save(entity);
    }

    // =========================================================
    // 자격증
    // =========================================================

    @Override
    @Transactional(readOnly = true)
    public List<UserCertificateDTO> getCertificates(Long userIdx) {
        return userCertificateRepository.findByUserIdxOrderByIssuedDateDesc(userIdx)
                .stream()
                .map(UserCertificateDTO::from)
                .toList();
    }

    @Override
    @Transactional
    public UserCertificateDTO createCertificate(Long userIdx, UserCertificateRequestDTO dto, Long requestingUserIdx) {
        validateCreatePermission(userIdx, requestingUserIdx);

        UserCertificate entity = UserCertificate.builder()
                .userIdx(userIdx)
                .certificateName(dto.getCertificateName())
                .issuingOrgName(dto.getIssuingOrgName())
                .issuedDate(dto.getIssuedDate())
                .isExpired(dto.getIsExpired() != null ? dto.getIsExpired() : false)
                .notes(dto.getNotes())
                .createdUserIdx(requestingUserIdx)
                .updatedUserIdx(requestingUserIdx)
                .build();

        return UserCertificateDTO.from(userCertificateRepository.save(entity));
    }

    @Override
    @Transactional
    public UserCertificateDTO updateCertificate(Long idx, UserCertificateRequestDTO dto, Long requestingUserIdx) {
        UserCertificate entity = userCertificateRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "자격증 정보를 찾을 수 없습니다."));

        validateOwnership(entity.getUserIdx(), requestingUserIdx);

        entity.setCertificateName(dto.getCertificateName());
        entity.setIssuingOrgName(dto.getIssuingOrgName());
        entity.setIssuedDate(dto.getIssuedDate());
        entity.setIsExpired(dto.getIsExpired() != null ? dto.getIsExpired() : false);
        entity.setNotes(dto.getNotes());
        entity.setUpdatedUserIdx(requestingUserIdx);

        return UserCertificateDTO.from(userCertificateRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteCertificate(Long idx, Long requestingUserIdx) {
        UserCertificate entity = userCertificateRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "자격증 정보를 찾을 수 없습니다."));

        validateOwnership(entity.getUserIdx(), requestingUserIdx);

        entity.setIsDeleted(true);
        entity.setDeletedAt(LocalDateTime.now());
        entity.setDeletedUserIdx(requestingUserIdx);
        userCertificateRepository.save(entity);
    }

    // =========================================================
    // 경력
    // =========================================================

    @Override
    @Transactional(readOnly = true)
    public List<UserCareerDTO> getCareers(Long userIdx) {
        return userCareerRepository.findByUserIdxOrderByCareerStartDateDesc(userIdx)
                .stream()
                .map(UserCareerDTO::from)
                .toList();
    }

    @Override
    @Transactional
    public UserCareerDTO createCareer(Long userIdx, UserCareerRequestDTO dto, Long requestingUserIdx) {
        validateCreatePermission(userIdx, requestingUserIdx);

        int[] period = calcCareerPeriod(dto.getCareerStartDate(), dto.getCareerEndDate(), dto.getIsNow());

        UserCareer entity = UserCareer.builder()
                .userIdx(userIdx)
                .careerCategory(dto.getCareerCategory())
                .isIndustryExperience(dto.getIsIndustryExperience() != null ? dto.getIsIndustryExperience() : false)
                .careerSummary(dto.getCareerSummary())
                .careerStartDate(dto.getCareerStartDate())
                .careerEndDate(Boolean.TRUE.equals(dto.getIsNow()) ? null : dto.getCareerEndDate())
                .careerPeriodYears(period[0])
                .careerPeriodMonths(period[1])
                .isNow(dto.getIsNow() != null ? dto.getIsNow() : false)
                .notes(dto.getNotes())
                .createdUserIdx(requestingUserIdx)
                .updatedUserIdx(requestingUserIdx)
                .build();

        return UserCareerDTO.from(userCareerRepository.save(entity));
    }

    @Override
    @Transactional
    public UserCareerDTO updateCareer(Long idx, UserCareerRequestDTO dto, Long requestingUserIdx) {
        UserCareer entity = userCareerRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "경력 정보를 찾을 수 없습니다."));

        validateOwnership(entity.getUserIdx(), requestingUserIdx);

        int[] period = calcCareerPeriod(dto.getCareerStartDate(), dto.getCareerEndDate(), dto.getIsNow());

        entity.setCareerCategory(dto.getCareerCategory());
        entity.setIsIndustryExperience(dto.getIsIndustryExperience() != null ? dto.getIsIndustryExperience() : false);
        entity.setCareerSummary(dto.getCareerSummary());
        entity.setCareerStartDate(dto.getCareerStartDate());
        entity.setCareerEndDate(Boolean.TRUE.equals(dto.getIsNow()) ? null : dto.getCareerEndDate());
        entity.setCareerPeriodYears(period[0]);
        entity.setCareerPeriodMonths(period[1]);
        entity.setIsNow(dto.getIsNow() != null ? dto.getIsNow() : false);
        entity.setNotes(dto.getNotes());
        entity.setUpdatedUserIdx(requestingUserIdx);

        return UserCareerDTO.from(userCareerRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteCareer(Long idx, Long requestingUserIdx) {
        UserCareer entity = userCareerRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "경력 정보를 찾을 수 없습니다."));

        validateOwnership(entity.getUserIdx(), requestingUserIdx);

        entity.setIsDeleted(true);
        entity.setDeletedAt(LocalDateTime.now());
        entity.setDeletedUserIdx(requestingUserIdx);
        userCareerRepository.save(entity);
    }

    // =========================================================
    // 교육이수
    // =========================================================

    @Override
    @Transactional(readOnly = true)
    public List<UserTrainingDTO> getTrainings(Long userIdx) {
        return userTrainingRepository.findByUserIdxOrderByCompletionDateDesc(userIdx)
                .stream()
                .map(UserTrainingDTO::from)
                .toList();
    }

    @Override
    @Transactional
    public UserTrainingDTO createTraining(Long userIdx, UserTrainingRequestDTO dto, Long requestingUserIdx) {
        validateCreatePermission(userIdx, requestingUserIdx);

        UserTraining entity = UserTraining.builder()
                .userIdx(userIdx)
                .trainingName(dto.getTrainingName())
                .trainingOrgName(dto.getTrainingOrgName())
                .completionDate(dto.getCompletionDate())
                .notes(dto.getNotes())
                .createdUserIdx(requestingUserIdx)
                .updatedUserIdx(requestingUserIdx)
                .build();

        return UserTrainingDTO.from(userTrainingRepository.save(entity));
    }

    @Override
    @Transactional
    public UserTrainingDTO updateTraining(Long idx, UserTrainingRequestDTO dto, Long requestingUserIdx) {
        UserTraining entity = userTrainingRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "교육이수 정보를 찾을 수 없습니다."));

        validateOwnership(entity.getUserIdx(), requestingUserIdx);

        entity.setTrainingName(dto.getTrainingName());
        entity.setTrainingOrgName(dto.getTrainingOrgName());
        entity.setCompletionDate(dto.getCompletionDate());
        entity.setNotes(dto.getNotes());
        entity.setUpdatedUserIdx(requestingUserIdx);

        return UserTrainingDTO.from(userTrainingRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteTraining(Long idx, Long requestingUserIdx) {
        UserTraining entity = userTrainingRepository.findById(idx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "교육이수 정보를 찾을 수 없습니다."));

        validateOwnership(entity.getUserIdx(), requestingUserIdx);

        entity.setIsDeleted(true);
        entity.setDeletedAt(LocalDateTime.now());
        entity.setDeletedUserIdx(requestingUserIdx);
        userTrainingRepository.save(entity);
    }
}
