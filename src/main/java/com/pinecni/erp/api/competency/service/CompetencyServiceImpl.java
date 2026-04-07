package com.pinecni.erp.api.competency.service;

import com.pinecni.erp.api.code.repository.CodeRepository;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompetencyServiceImpl implements CompetencyService {

    private final UserSchoolRepository      userSchoolRepository;
    private final UserCertificateRepository userCertificateRepository;
    private final UserCareerRepository      userCareerRepository;
    private final UserTrainingRepository    userTrainingRepository;
    private final UserRepository            userRepository;
    private final CodeRepository            codeRepository;

    // =========================================================
    // 공통 검증 헬퍼
    // =========================================================

    /** 요청자의 UserRole 조회 */
    private UserRole getUserRole(Long userIdx) {
        return userRepository.findById(userIdx)
                .map(u -> UserRole.fromCode(u.getUserRoleCode()))
                .orElse(UserRole.USER);
    }

    /** 관리자(ADMIN) 이상 여부 확인 */
    private boolean isAdminOrHigher(Long userIdx) {
        return getUserRole(userIdx).isAtLeast(UserRole.ADMIN);
    }

    /** 역량 열람자(COMPETENCY_VIEWER) 이상 여부 확인 */
    private boolean canViewCompetency(Long userIdx) {
        return getUserRole(userIdx).isAtLeast(UserRole.COMPETENCY_VIEWER);
    }

    /**
     * CUD 권한 검증 — 본인 또는 관리자만 허용
     * 허용되지 않으면 403 Forbidden 예외 발생
     */
    private void validateCudPermission(Long ownerUserIdx, Long requestingUserIdx) {
        if (!ownerUserIdx.equals(requestingUserIdx) && !isAdminOrHigher(requestingUserIdx)) {
            log.warn("CUD 권한 없음: ownerUserIdx={}, requestingUserIdx={}", ownerUserIdx, requestingUserIdx);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 또는 관리자만 수정/삭제할 수 있습니다.");
        }
    }

    /**
     * 읽기 권한 검증 — 본인 or 역량 열람자 이상(COMPETENCY_VIEWER/ADMIN/DEVELOPER)
     */
    private void validateReadPermission(Long ownerUserIdx, Long requestingUserIdx) {
        if (ownerUserIdx.equals(requestingUserIdx)) return;
        if (canViewCompetency(requestingUserIdx)) return;
        log.warn("읽기 권한 없음: ownerUserIdx={}, requestingUserIdx={}", ownerUserIdx, requestingUserIdx);
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "열람 권한이 없습니다.");
    }

    /**
     * 생성 권한 검증 — 본인 데이터 또는 관리자만 허용
     * 일반 사용자가 타인 userIdx로 생성 시도하면 403
     */
    private void validateCreatePermission(Long targetUserIdx, Long requestingUserIdx) {
        if (!targetUserIdx.equals(requestingUserIdx) && !isAdminOrHigher(requestingUserIdx)) {
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
    public List<UserSchoolDTO> getSchools(Long userIdx, Long requestingUserIdx) {
        validateReadPermission(userIdx, requestingUserIdx);
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

        validateCudPermission(entity.getUserIdx(), requestingUserIdx);

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

        validateCudPermission(entity.getUserIdx(), requestingUserIdx);

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
    public List<UserCertificateDTO> getCertificates(Long userIdx, Long requestingUserIdx) {
        validateReadPermission(userIdx, requestingUserIdx);
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

        validateCudPermission(entity.getUserIdx(), requestingUserIdx);

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

        validateCudPermission(entity.getUserIdx(), requestingUserIdx);

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
    public List<UserCareerDTO> getCareers(Long userIdx, Long requestingUserIdx) {
        validateReadPermission(userIdx, requestingUserIdx);
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

        validateCudPermission(entity.getUserIdx(), requestingUserIdx);

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

        validateCudPermission(entity.getUserIdx(), requestingUserIdx);

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
    public List<UserTrainingDTO> getTrainings(Long userIdx, Long requestingUserIdx) {
        validateReadPermission(userIdx, requestingUserIdx);
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

        validateCudPermission(entity.getUserIdx(), requestingUserIdx);

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

        validateCudPermission(entity.getUserIdx(), requestingUserIdx);

        entity.setIsDeleted(true);
        entity.setDeletedAt(LocalDateTime.now());
        entity.setDeletedUserIdx(requestingUserIdx);
        userTrainingRepository.save(entity);
    }

    // =========================================================
    // 담당자(역량 열람자) 권한 관리
    // =========================================================

    @Override
    @Transactional
    public void grantCompetencyViewerRole(Long targetUserIdx, Long adminIdx) {
        if (!isAdminOrHigher(adminIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 권한을 부여할 수 있습니다.");
        }

        User target = userRepository.findById(targetUserIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        UserRole currentRole = UserRole.fromCode(target.getUserRoleCode());

        // ADMIN/DEVELOPER는 이미 상위 권한이므로 변경 불필요 (no-op)
        if (currentRole.isAtLeast(UserRole.ADMIN)) {
            log.debug("grantCompetencyViewerRole: 이미 상위 권한 보유 — userIdx={}, role={}", targetUserIdx, currentRole);
            return;
        }

        target.setUserRoleCode(UserRole.COMPETENCY_VIEWER.getCode());
        target.setUpdatedUserIdx(adminIdx);
        userRepository.save(target);
        log.info("역량 열람자 권한 부여: userIdx={}, by adminIdx={}", targetUserIdx, adminIdx);
    }

    @Override
    @Transactional
    public void revokeCompetencyViewerRole(Long targetUserIdx, Long adminIdx) {
        if (!isAdminOrHigher(adminIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 권한을 해제할 수 있습니다.");
        }

        User target = userRepository.findById(targetUserIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        UserRole currentRole = UserRole.fromCode(target.getUserRoleCode());

        // COMPETENCY_VIEWER 만 강등 대상 — ADMIN/DEVELOPER는 건드리지 않음
        if (currentRole != UserRole.COMPETENCY_VIEWER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "역량 열람자 권한을 가진 사용자만 해제할 수 있습니다.");
        }

        target.setUserRoleCode(UserRole.USER.getCode());
        target.setUpdatedUserIdx(adminIdx);
        userRepository.save(target);
        log.info("역량 열람자 권한 해제: userIdx={}, by adminIdx={}", targetUserIdx, adminIdx);
    }

    // =========================================================
    // 역량관리 열람 페이지용 — 전체 직원 요약
    // =========================================================

    @Override
    @Transactional(readOnly = true)
    public List<UserCompetencyOverviewDTO> getCompetencyOverview(Long requestingUserIdx) {
        if (!canViewCompetency(requestingUserIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "역량관리 열람 권한이 없습니다.");
        }

        List<UserCompetencyOverviewDTO> list = userRepository.findAllWithCompetencyOverview();
        enrichWithCodeNames(list);
        return list;
    }

    /** 부서/직급 코드값 → 한글명 변환 (Code 테이블 조회 후 후처리) */
    private void enrichWithCodeNames(List<UserCompetencyOverviewDTO> list) {
        if (list.isEmpty()) return;

        Map<String, String> deptMap = new HashMap<>();
        codeRepository.findByGroupCode("C01")
                .forEach(c -> deptMap.put(c.getCode(), c.getCodeName()));

        Map<String, String> positionMap = new HashMap<>();
        codeRepository.findByGroupCode("C02")
                .forEach(c -> positionMap.put(c.getCode(), c.getCodeName()));

        for (UserCompetencyOverviewDTO dto : list) {
            if (dto.getEmpDept() != null) {
                dto.setEmpDeptName(deptMap.get(dto.getEmpDept()));
            }
            if (dto.getEmpPosition() != null) {
                dto.setEmpPositionName(positionMap.get(dto.getEmpPosition()));
            }
        }
    }

    // =========================================================
    // 엑셀 export용 통합 데이터
    // =========================================================

    @Override
    @Transactional(readOnly = true)
    public CompetencyExportDataDTO getCompetencyExportData(Long requestingUserIdx) {
        if (!canViewCompetency(requestingUserIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "역량관리 열람 권한이 없습니다.");
        }

        List<UserCompetencyOverviewDTO> users = userRepository.findAllWithCompetencyOverview();
        enrichWithCodeNames(users);

        List<UserSchoolDTO>      schools      = userSchoolRepository.findAll().stream()
                .map(UserSchoolDTO::from).toList();
        List<UserCertificateDTO> certificates = userCertificateRepository.findAll().stream()
                .map(UserCertificateDTO::from).toList();
        List<UserCareerDTO>      careers      = userCareerRepository.findAll().stream()
                .map(UserCareerDTO::from).toList();
        List<UserTrainingDTO>    trainings    = userTrainingRepository.findAll().stream()
                .map(UserTrainingDTO::from).toList();

        return CompetencyExportDataDTO.builder()
                .users(users)
                .schools(schools)
                .certificates(certificates)
                .careers(careers)
                .trainings(trainings)
                .build();
    }

    // =========================================================
    // 법정교육 일괄 등록 (관리자 전용)
    // =========================================================

    @Override
    @Transactional
    public BulkTrainingResultDTO bulkCreateTraining(BulkTrainingRequestDTO dto, Long adminIdx) {
        if (!isAdminOrHigher(adminIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 일괄 등록할 수 있습니다.");
        }

        int successCount = 0;
        List<BulkTrainingResultDTO.FailedUser> failedUsers = new ArrayList<>();

        for (Long targetUserIdx : dto.getTargetUserIdxList()) {
            User target = userRepository.findById(targetUserIdx).orElse(null);
            if (target == null || target.getDeletedAt() != null) {
                failedUsers.add(BulkTrainingResultDTO.FailedUser.builder()
                        .userIdx(targetUserIdx)
                        .empName(target != null ? target.getEmpName() : "(알 수 없음)")
                        .reason("사용자가 존재하지 않거나 삭제됨")
                        .build());
                continue;
            }

            // 중복 체크: 같은 이름/기관/이수일의 교육이 이미 등록되어 있으면 스킵
            boolean duplicate = userTrainingRepository
                    .existsByUserIdxAndTrainingNameAndTrainingOrgNameAndCompletionDate(
                            targetUserIdx, dto.getTrainingName(),
                            dto.getTrainingOrgName(), dto.getCompletionDate());
            if (duplicate) {
                failedUsers.add(BulkTrainingResultDTO.FailedUser.builder()
                        .userIdx(targetUserIdx)
                        .empName(target.getEmpName())
                        .reason("이미 동일 교육이 등록되어 있습니다")
                        .build());
                continue;
            }

            try {
                UserTraining entity = UserTraining.builder()
                        .userIdx(targetUserIdx)
                        .trainingName(dto.getTrainingName())
                        .trainingOrgName(dto.getTrainingOrgName())
                        .completionDate(dto.getCompletionDate())
                        .notes(dto.getNotes())
                        .createdUserIdx(adminIdx)
                        .updatedUserIdx(adminIdx)
                        .build();
                userTrainingRepository.save(entity);
                successCount++;
            } catch (Exception e) {
                log.error("일괄 등록 실패 — userIdx={}, reason={}", targetUserIdx, e.getMessage());
                failedUsers.add(BulkTrainingResultDTO.FailedUser.builder()
                        .userIdx(targetUserIdx)
                        .empName(target.getEmpName())
                        .reason("저장 실패: " + e.getMessage())
                        .build());
            }
        }

        log.info("법정교육 일괄 등록 완료 — training={}, 성공={}, 실패={}, adminIdx={}",
                dto.getTrainingName(), successCount, failedUsers.size(), adminIdx);

        return BulkTrainingResultDTO.builder()
                .successCount(successCount)
                .failedCount(failedUsers.size())
                .failedUsers(failedUsers)
                .build();
    }
}
