package com.pinecni.erp.api.competency.service;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.competency.dto.*;
import com.pinecni.erp.api.competency.repository.*;
import com.pinecni.erp.api.user.UserRole;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.constant.CodeConstants.MilitaryStatus;
import com.pinecni.erp.entity.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompetencyServiceImpl implements CompetencyService {

    private final UserSchoolRepository                userSchoolRepository;
    private final UserCertificateRepository           userCertificateRepository;
    private final UserCareerRepository                userCareerRepository;
    private final UserTrainingRepository              userTrainingRepository;
    private final UserSchoolAttachmentRepository      userSchoolAttachmentRepository;
    private final UserCertificateAttachmentRepository userCertificateAttachmentRepository;
    private final UserRepository                      userRepository;
    private final CodeRepository                      codeRepository;

    @Value("${file.base.dir}")
    private String fileBaseDir;

    /** 첨부 허용 확장자 — PII가 들어가는 증명서 위주, 위험 확장자 제외 */
    private static final List<String> ALLOWED_ATTACHMENT_EXTENSIONS = List.of(
            "pdf", "jpg", "jpeg", "png", "hwp", "doc", "docx"
    );

    /** 첨부 최대 크기 (50MB) */
    private static final long MAX_ATTACHMENT_SIZE = 50L * 1024 * 1024;

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

        List<UserSchool> entities = userSchoolRepository.findByUserIdxOrderByGraduationDateDesc(userIdx);
        List<UserSchoolDTO> dtos = entities.stream().map(UserSchoolDTO::from).toList();

        // 학력 첨부파일 일괄 로드 (N+1 방지)
        if (!dtos.isEmpty()) {
            List<Long> schoolIdxList = dtos.stream().map(UserSchoolDTO::getIdx).toList();
            Map<Long, List<AttachmentSummaryDTO>> grouped =
                    userSchoolAttachmentRepository.findByUserSchoolIdxInOrderByUploadedAtAsc(schoolIdxList)
                            .stream()
                            .collect(Collectors.groupingBy(
                                    UserSchoolAttachment::getUserSchoolIdx,
                                    Collectors.mapping(AttachmentSummaryDTO::from, Collectors.toList())
                            ));
            dtos.forEach(d -> d.setAttachments(grouped.getOrDefault(d.getIdx(), Collections.emptyList())));
        }

        return dtos;
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
                .isStemMajor(Boolean.TRUE.equals(dto.getIsStemMajor()))
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
        entity.setIsStemMajor(Boolean.TRUE.equals(dto.getIsStemMajor()));
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

        List<UserCertificate> entities = userCertificateRepository.findByUserIdxOrderByIssuedDateDesc(userIdx);
        List<UserCertificateDTO> dtos = entities.stream().map(UserCertificateDTO::from).toList();

        // 자격증 첨부파일 일괄 로드 (N+1 방지)
        if (!dtos.isEmpty()) {
            List<Long> certIdxList = dtos.stream().map(UserCertificateDTO::getIdx).toList();
            Map<Long, List<AttachmentSummaryDTO>> grouped =
                    userCertificateAttachmentRepository.findByUserCertificateIdxInOrderByUploadedAtAsc(certIdxList)
                            .stream()
                            .collect(Collectors.groupingBy(
                                    UserCertificateAttachment::getUserCertificateIdx,
                                    Collectors.mapping(AttachmentSummaryDTO::from, Collectors.toList())
                            ));
            dtos.forEach(d -> d.setAttachments(grouped.getOrDefault(d.getIdx(), Collections.emptyList())));
        }

        return dtos;
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

    /** 부서/직급/병역상태 코드값 → 한글명 변환 (Code 테이블 조회 후 후처리) */
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
            if (dto.getMilitaryStatus() != null) {
                MilitaryStatus status = MilitaryStatus.fromCodeOrNull(dto.getMilitaryStatus());
                dto.setMilitaryStatusLabel(status != null ? status.getName() : null);
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
    // 병적사항 (본인 입력만 허용)
    // =========================================================

    /** 부분 날짜 정규식: YYYY / YYYY-MM / YYYY-MM-DD */
    private static final Pattern PARTIAL_DATE_PATTERN =
            Pattern.compile("^\\d{4}(-\\d{2}(-\\d{2})?)?$");

    @Override
    @Transactional(readOnly = true)
    public UserMilitaryServiceDTO getMilitaryService(Long userIdx, Long requestingUserIdx) {
        validateReadPermission(userIdx, requestingUserIdx);

        User user = userRepository.findById(userIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        return UserMilitaryServiceDTO.from(user);
    }

    @Override
    @Transactional
    public UserMilitaryServiceDTO updateMilitaryService(Long userIdx, UserMilitaryServiceDTO dto, Long requestingUserIdx) {
        // 병적사항은 본인만 수정 가능 (관리자 포함하여 대리 입력 불가)
        if (!userIdx.equals(requestingUserIdx)) {
            log.warn("병적사항 수정 권한 없음 — userIdx={}, requesting={}", userIdx, requestingUserIdx);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "병적사항은 본인만 수정할 수 있습니다.");
        }

        User user = userRepository.findById(userIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        // 1) 코드값 검증
        MilitaryStatus status = null;
        if (dto.getMilitaryStatus() != null && !dto.getMilitaryStatus().isBlank()) {
            status = MilitaryStatus.fromCodeOrNull(dto.getMilitaryStatus());
            if (status == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "유효하지 않은 병역상태 코드: " + dto.getMilitaryStatus());
            }
        }

        // 2) 부분 날짜 정규식 검증
        validatePartialDate(dto.getMilitaryEnlistDate(), "입대일");
        validatePartialDate(dto.getMilitaryDischargeDate(), "전역일");

        // 3) 병역필 / 특례필이 아닌 상태에서는 입대/전역일 입력 불가
        boolean allowsDates = status != null && status.allowsServiceDates();
        if (!allowsDates) {
            if (notBlank(dto.getMilitaryEnlistDate()) || notBlank(dto.getMilitaryDischargeDate())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "병역필 또는 특례필 상태에서만 입대일/전역일을 입력할 수 있습니다.");
            }
        }

        // 4) 두 날짜의 정밀도가 같을 때만 enlist <= discharge 검증
        String enlist = nullIfBlank(dto.getMilitaryEnlistDate());
        String discharge = nullIfBlank(dto.getMilitaryDischargeDate());
        if (enlist != null && discharge != null && enlist.length() == discharge.length()) {
            if (enlist.compareTo(discharge) > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "전역일은 입대일보다 빠를 수 없습니다.");
            }
        }

        user.setMilitaryStatus(dto.getMilitaryStatus());
        user.setMilitaryEnlistDate(allowsDates ? enlist : null);
        user.setMilitaryDischargeDate(allowsDates ? discharge : null);
        user.setMilitaryNotes(nullIfBlank(dto.getMilitaryNotes()));
        user.setUpdatedUserIdx(requestingUserIdx);

        userRepository.save(user);
        log.info("병적사항 수정 완료 — userIdx={}, status={}", userIdx, dto.getMilitaryStatus());

        return UserMilitaryServiceDTO.from(user);
    }

    private void validatePartialDate(String value, String fieldLabel) {
        if (value == null || value.isBlank()) return;
        if (!PARTIAL_DATE_PATTERN.matcher(value).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    fieldLabel + "은(는) YYYY, YYYY-MM, YYYY-MM-DD 형식으로 입력해 주세요.");
        }
    }

    private boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private String nullIfBlank(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }

    // =========================================================
    // 학력 첨부파일
    // =========================================================

    @Override
    @Transactional
    public AttachmentSummaryDTO uploadSchoolAttachment(Long schoolIdx, MultipartFile file, Long requestingUserIdx) {
        UserSchool school = userSchoolRepository.findById(schoolIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "학력 정보를 찾을 수 없습니다."));

        // 본인만 업로드 가능 (관리자도 대신 업로드 X)
        if (!school.getUserIdx().equals(requestingUserIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "학력 첨부파일은 본인만 업로드할 수 있습니다.");
        }

        validateAttachmentFile(file);

        try {
            String originalFilename = StringUtils.cleanPath(
                    file.getOriginalFilename() != null ? file.getOriginalFilename() : "untitled");
            String storedFilename = generateStoredFilename(originalFilename);

            String relativePath = String.format("competency/%d/school/%d", school.getUserIdx(), schoolIdx);
            Path uploadPath = Paths.get(fileBaseDir, relativePath);
            if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);

            Path target = uploadPath.resolve(storedFilename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            log.info("학력 첨부 저장 완료 — schoolIdx={}, file={}", schoolIdx, originalFilename);

            UserSchoolAttachment attachment = UserSchoolAttachment.builder()
                    .userSchoolIdx(schoolIdx)
                    .originalFilename(originalFilename)
                    .storedFilename(storedFilename)
                    .filePath(relativePath)
                    .fileSize(file.getSize())
                    .fileType(file.getContentType())
                    .uploadUserIdx(requestingUserIdx)
                    .isDeleted(false)
                    .build();

            return AttachmentSummaryDTO.from(userSchoolAttachmentRepository.save(attachment));
        } catch (IOException e) {
            log.error("학력 첨부 저장 실패 — schoolIdx={}, error={}", schoolIdx, e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "파일 저장에 실패했습니다.");
        }
    }

    @Override
    @Transactional
    public void deleteSchoolAttachment(Long attachmentIdx, Long requestingUserIdx) {
        UserSchoolAttachment attachment = userSchoolAttachmentRepository.findById(attachmentIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "첨부파일을 찾을 수 없습니다."));

        UserSchool school = userSchoolRepository.findById(attachment.getUserSchoolIdx())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "학력 정보를 찾을 수 없습니다."));

        // 본인만 삭제 가능
        if (!school.getUserIdx().equals(requestingUserIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "학력 첨부파일은 본인만 삭제할 수 있습니다.");
        }

        attachment.setIsDeleted(true);
        attachment.setDeletedAt(LocalDateTime.now());
        attachment.setDeletedUserIdx(requestingUserIdx);
        userSchoolAttachmentRepository.save(attachment);
        log.info("학력 첨부 삭제 — attachmentIdx={}, by userIdx={}", attachmentIdx, requestingUserIdx);
    }

    @Override
    @Transactional(readOnly = true)
    public AttachmentDownloadDTO downloadSchoolAttachment(Long attachmentIdx, Long requestingUserIdx) {
        UserSchoolAttachment attachment = userSchoolAttachmentRepository.findById(attachmentIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "첨부파일을 찾을 수 없습니다."));

        UserSchool school = userSchoolRepository.findById(attachment.getUserSchoolIdx())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "학력 정보를 찾을 수 없습니다."));

        // 본인 또는 역량열람자 이상
        validateReadPermission(school.getUserIdx(), requestingUserIdx);

        return loadFileAsResource(attachment.getFilePath(), attachment.getStoredFilename(),
                attachment.getOriginalFilename(), attachment.getFileType());
    }

    // =========================================================
    // 자격증 첨부파일
    // =========================================================

    @Override
    @Transactional
    public AttachmentSummaryDTO uploadCertificateAttachment(Long certificateIdx, MultipartFile file, Long requestingUserIdx) {
        UserCertificate cert = userCertificateRepository.findById(certificateIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "자격증 정보를 찾을 수 없습니다."));

        if (!cert.getUserIdx().equals(requestingUserIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "자격증 첨부파일은 본인만 업로드할 수 있습니다.");
        }

        validateAttachmentFile(file);

        try {
            String originalFilename = StringUtils.cleanPath(
                    file.getOriginalFilename() != null ? file.getOriginalFilename() : "untitled");
            String storedFilename = generateStoredFilename(originalFilename);

            String relativePath = String.format("competency/%d/certificate/%d", cert.getUserIdx(), certificateIdx);
            Path uploadPath = Paths.get(fileBaseDir, relativePath);
            if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);

            Path target = uploadPath.resolve(storedFilename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            log.info("자격증 첨부 저장 완료 — certIdx={}, file={}", certificateIdx, originalFilename);

            UserCertificateAttachment attachment = UserCertificateAttachment.builder()
                    .userCertificateIdx(certificateIdx)
                    .originalFilename(originalFilename)
                    .storedFilename(storedFilename)
                    .filePath(relativePath)
                    .fileSize(file.getSize())
                    .fileType(file.getContentType())
                    .uploadUserIdx(requestingUserIdx)
                    .isDeleted(false)
                    .build();

            return AttachmentSummaryDTO.from(userCertificateAttachmentRepository.save(attachment));
        } catch (IOException e) {
            log.error("자격증 첨부 저장 실패 — certIdx={}, error={}", certificateIdx, e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "파일 저장에 실패했습니다.");
        }
    }

    @Override
    @Transactional
    public void deleteCertificateAttachment(Long attachmentIdx, Long requestingUserIdx) {
        UserCertificateAttachment attachment = userCertificateAttachmentRepository.findById(attachmentIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "첨부파일을 찾을 수 없습니다."));

        UserCertificate cert = userCertificateRepository.findById(attachment.getUserCertificateIdx())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "자격증 정보를 찾을 수 없습니다."));

        if (!cert.getUserIdx().equals(requestingUserIdx)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "자격증 첨부파일은 본인만 삭제할 수 있습니다.");
        }

        attachment.setIsDeleted(true);
        attachment.setDeletedAt(LocalDateTime.now());
        attachment.setDeletedUserIdx(requestingUserIdx);
        userCertificateAttachmentRepository.save(attachment);
        log.info("자격증 첨부 삭제 — attachmentIdx={}, by userIdx={}", attachmentIdx, requestingUserIdx);
    }

    @Override
    @Transactional(readOnly = true)
    public AttachmentDownloadDTO downloadCertificateAttachment(Long attachmentIdx, Long requestingUserIdx) {
        UserCertificateAttachment attachment = userCertificateAttachmentRepository.findById(attachmentIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "첨부파일을 찾을 수 없습니다."));

        UserCertificate cert = userCertificateRepository.findById(attachment.getUserCertificateIdx())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "자격증 정보를 찾을 수 없습니다."));

        validateReadPermission(cert.getUserIdx(), requestingUserIdx);

        return loadFileAsResource(attachment.getFilePath(), attachment.getStoredFilename(),
                attachment.getOriginalFilename(), attachment.getFileType());
    }

    // =========================================================
    // 첨부파일 공통 헬퍼
    // =========================================================

    private void validateAttachmentFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일이 비어 있습니다.");
        }
        if (file.getSize() > MAX_ATTACHMENT_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "파일 크기가 50MB를 초과합니다.");
        }
        String original = file.getOriginalFilename();
        if (original == null || original.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일명이 없습니다.");
        }
        int dot = original.lastIndexOf('.');
        if (dot < 0 || dot == original.length() - 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "확장자가 없는 파일은 업로드할 수 없습니다.");
        }
        String ext = original.substring(dot + 1).toLowerCase();
        if (!ALLOWED_ATTACHMENT_EXTENSIONS.contains(ext)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "허용되지 않는 파일 형식입니다. 허용: " + ALLOWED_ATTACHMENT_EXTENSIONS);
        }
    }

    private String generateStoredFilename(String originalFilename) {
        String ext = "";
        int dot = originalFilename.lastIndexOf('.');
        if (dot >= 0) ext = originalFilename.substring(dot);
        return System.currentTimeMillis() + "_" + UUID.randomUUID().toString().replace("-", "") + ext;
    }

    private AttachmentDownloadDTO loadFileAsResource(String relativePath, String storedFilename,
                                                     String originalFilename, String contentType) {
        try {
            Path filePath = Paths.get(fileBaseDir, relativePath, storedFilename);
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "파일을 읽을 수 없습니다.");
            }
            return AttachmentDownloadDTO.builder()
                    .resource(resource)
                    .originalFilename(originalFilename)
                    .contentType(contentType != null ? contentType : "application/octet-stream")
                    .build();
        } catch (Exception e) {
            log.error("파일 로드 실패 — path={}/{}, error={}", relativePath, storedFilename, e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "파일 다운로드에 실패했습니다.");
        }
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
