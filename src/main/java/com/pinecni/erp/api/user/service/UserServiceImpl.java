package com.pinecni.erp.api.user.service;

import com.pinecni.erp.api.code.service.CodeService;
import com.pinecni.erp.constant.CodeConstants;
import com.pinecni.erp.api.user.dto.UserCreateDTO;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.User;
import com.pinecni.erp.api.user.dto.UserDTO;
import com.pinecni.erp.api.user.dto.UserSimpleDTO;
import com.pinecni.erp.api.user.dto.UserUpdateDTO;
import com.pinecni.erp.api.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * User Service 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final CodeService codeService;
    private final com.pinecni.erp.api.notification.service.NotificationSubscriptionService notificationSubscriptionService;

    @Override
    public List<UserSimpleDTO> getAllActiveUsers() {
        log.debug("getAllActiveUsers() called");
        return userRepository.findAllActive().stream()
                .map(userMapper::toSimpleDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<UserSimpleDTO> getAllUsers() {
        log.debug("getAllUsers() called");
        return userRepository.findAllNonDev().stream()
                .map(userMapper::toSimpleDTO)
                .collect(Collectors.toList());
    }

    @Override
    public UserDTO getUserById(Long idx) {
        log.debug("getUserById() called with idx: {}", idx);
        User user = userRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. idx: " + idx));
        return userMapper.toDTO(user);
    }

    @Override
    public UserDTO getUserByEmpId(String empId) {
        log.debug("getUserByEmpId() called with empId: {}", empId);
        User user = userRepository.findByEmpId(empId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. empId: " + empId));
        return userMapper.toDTO(user);
    }

    @Override
    public UserDTO getUserByEmail(String empEmail) {
        log.debug("getUserByEmail() called with empEmail: {}", empEmail);
        User user = userRepository.findByEmpEmail(empEmail)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. email: " + empEmail));
        return userMapper.toDTO(user);
    }

    @Override
    public List<UserSimpleDTO> getUsersByDept(String empDept) {
        log.debug("getUsersByDept() called with empDept: {}", empDept);
        return userRepository.findActiveByEmpDept(empDept).stream()
                .map(userMapper::toSimpleDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<UserSimpleDTO> getUsersByPosition(String empPosition) {
        log.debug("getUsersByPosition() called with empPosition: {}", empPosition);
        return userRepository.findActiveByEmpPosition(empPosition).stream()
                .map(userMapper::toSimpleDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<UserSimpleDTO> getHighRankManagers() {
        log.debug("getHighRankManagers() called - 대표이사/상무/이사만 조회 (sortOrder <= 3)");
        return userRepository.findActiveHighRankManagers().stream()
                .map(userMapper::toSimpleDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<UserSimpleDTO> getUsersByStatus(String empStatus) {
        log.debug("getUsersByStatus() called with empStatus: {}", empStatus);
        return userRepository.findByEmpStatus(empStatus).stream()
                .map(userMapper::toSimpleDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<UserSimpleDTO> searchUsersByName(String name) {
        log.debug("searchUsersByName() called with name: {}", name);
        return userRepository.searchByName(name).stream()
                .map(userMapper::toSimpleDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UserDTO createUser(UserCreateDTO createDTO, Long createdUserIdx) {
        log.debug("createUser() called with empId: {}", createDTO.getEmpId());

        // 사번 중복 확인 (삭제된 사용자 제외)
        if (userRepository.findActiveByEmpId(createDTO.getEmpId()).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 사번입니다: " + createDTO.getEmpId());
        }

        // 이메일 중복 확인 (삭제된 사용자 제외)
        if (userRepository.findActiveByEmpEmail(createDTO.getEmpEmail()).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 이메일입니다: " + createDTO.getEmpEmail());
        }

        // 비밀번호 해시 생성 (Salt 방식)
        String[] hashResult = generatePasswordHashWithSalt(createDTO.getPassword());
        String hashedPassword = hashResult[0]; // password 컬럼에 저장
        String salt = hashResult[1];            // password_hash 컬럼에 저장

        // Entity 생성 (password에 해시값, passwordHash에 salt 저장)
        User user = userMapper.toEntity(createDTO, hashedPassword, salt);
        user.setCreatedUserIdx(createdUserIdx);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedUserIdx(createdUserIdx);
        user.setUpdatedAt(LocalDateTime.now());

        // 부서명 → 부서 코드 변환 (empDept 기반)
        setDepartmentCode(user);

        // 저장 (먼저 저장해서 idx를 생성)
        User savedUser = userRepository.save(user);
        log.info("User created successfully. idx: {}, empId: {}, empDept: {}",
                savedUser.getIdx(), savedUser.getEmpId(), savedUser.getEmpDept());

        // 상위보고자 자동 설정 (같은 부서 내 자신보다 높은 직급 중 최고 직급자)
        autoAssignManager(savedUser);

        // 상위보고자가 설정된 경우 다시 저장
        if (savedUser.getManagerIdx() != null) {
            savedUser = userRepository.save(savedUser);
            log.info("Manager auto-assigned for user {}. Manager idx: {}",
                    savedUser.getEmpId(), savedUser.getManagerIdx());
        }

        // 알림 구독 기본 행 생성 (15종 × 2채널 = 30건). 실패해도 사용자 생성은 정상 — 운영자가
        // 나중에 /admin/notifications 권한으로도 보정 가능.
        try {
            notificationSubscriptionService.createDefaultsFor(savedUser.getIdx());
        } catch (Exception e) {
            log.warn("[알림 구독 기본 생성 실패 — 무시하고 진행] userIdx={}, error={}",
                    savedUser.getIdx(), e.getMessage());
        }

        return userMapper.toDTO(savedUser);
    }

    @Override
    @Transactional
    public UserDTO updateUser(Long idx, UserUpdateDTO updateDTO, Long updatedUserIdx) {
        log.debug("updateUser() called with idx: {}", idx);

        // 기존 사용자 조회
        User user = userRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. idx: " + idx));

        // 이메일 변경 시 중복 확인 (삭제된 사용자 제외)
        if (updateDTO.getEmpEmail() != null && !updateDTO.getEmpEmail().equals(user.getEmpEmail())) {
            if (userRepository.findActiveByEmpEmail(updateDTO.getEmpEmail()).isPresent()) {
                throw new IllegalArgumentException("이미 존재하는 이메일입니다: " + updateDTO.getEmpEmail());
            }
        }

        // 비밀번호 변경 시 해시 생성 (Salt 방식)
        String hashedPassword = null;
        String salt = null;
        if (updateDTO.getPassword() != null) {
            String[] hashResult = generatePasswordHashWithSalt(updateDTO.getPassword());
            hashedPassword = hashResult[0]; // password 컬럼에 저장
            salt = hashResult[1];            // password_hash 컬럼에 저장
        }

        // 기존 부서명 저장
        String oldDept = user.getEmpDept();

        // Entity 업데이트
        userMapper.updateEntity(user, updateDTO, hashedPassword, salt);
        user.setUpdatedUserIdx(updatedUserIdx);

        // 부서가 변경된 경우 부서 코드 재설정
        if (updateDTO.getEmpDept() != null && !updateDTO.getEmpDept().equals(oldDept)) {
            setDepartmentCode(user);
            log.info("Department changed: {} -> {}",
                    oldDept, user.getEmpDept());
        }

        // 저장
        User updatedUser = userRepository.save(user);
        log.info("User updated successfully. idx: {}, empId: {}", updatedUser.getIdx(), updatedUser.getEmpId());

        return userMapper.toDTO(updatedUser);
    }

    @Override
    @Transactional
    public void deleteUser(Long idx, Long deletedUserIdx) {
        log.debug("deleteUser() called with idx: {}", idx);

        User user = userRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. idx: " + idx));

        // Soft Delete
        user.setDeletedAt(LocalDateTime.now());
        user.setDeletedUserIdx(deletedUserIdx);
        userRepository.save(user);

        log.info("User soft deleted successfully. idx: {}, empId: {}", user.getIdx(), user.getEmpId());
    }

    @Override
    @Transactional
    public UserDTO restoreUser(Long idx) {
        log.debug("restoreUser() called with idx: {}", idx);

        User user = userRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. idx: " + idx));

        if (user.getDeletedAt() == null) {
            throw new IllegalStateException("삭제되지 않은 사용자입니다. idx: " + idx);
        }

        // 복구
        user.setDeletedAt(null);
        user.setDeletedUserIdx(null);
        User restoredUser = userRepository.save(user);

        log.info("User restored successfully. idx: {}, empId: {}", restoredUser.getIdx(), restoredUser.getEmpId());

        return userMapper.toDTO(restoredUser);
    }

    @Override
    public boolean isEmpIdDuplicate(String empId) {
        return userRepository.findActiveByEmpId(empId).isPresent();
    }

    @Override
    public boolean isEmailDuplicate(String empEmail) {
        return userRepository.findActiveByEmpEmail(empEmail).isPresent();
    }

    @Override
    public String generateNextEmployeeId() {
        log.debug("generateNextEmployeeId() called");

        // 오늘 날짜를 YYYYMMdd 형식으로 생성
        LocalDateTime now = LocalDateTime.now();
        String datePrefix = String.format("%04d%02d%02d",
                now.getYear(),
                now.getMonthValue(),
                now.getDayOfMonth());

        // 오늘 날짜로 시작하는 모든 사번 조회
        List<String> todayEmpIds = userRepository.findEmpIdsByDatePrefix(datePrefix);

        // 가장 큰 일련번호 찾기
        int maxSeq = 0;
        for (String empId : todayEmpIds) {
            if (empId.length() == 10) { // YYYYMMddnn 형식 확인
                try {
                    String seqStr = empId.substring(8, 10); // 마지막 2자리
                    int seqNum = Integer.parseInt(seqStr);
                    if (seqNum > maxSeq) {
                        maxSeq = seqNum;
                    }
                } catch (NumberFormatException e) {
                    log.warn("Invalid empId format: {}. Skipping...", empId);
                }
            }
        }

        // 다음 일련번호 생성 (01부터 시작)
        int nextSeq = maxSeq + 1;
        String nextEmpId = String.format("%s%02d", datePrefix, nextSeq);

        log.info("Generated next employee ID: {} (found {} existing IDs for today)",
                nextEmpId, todayEmpIds.size());

        return nextEmpId;
    }

    @Override
    public List<UserSimpleDTO> getManagerChain(Long userIdx) {
        log.debug("getManagerChain() called with userIdx: {}", userIdx);

        List<UserSimpleDTO> managerChain = new ArrayList<>();
        User currentUser = userRepository.findById(userIdx).orElse(null);

        if (currentUser == null) {
            log.warn("사용자를 찾을 수 없습니다. userIdx: {}", userIdx);
            return managerChain;
        }

        // 상위 보고자 체인 따라가기 (무한 루프 방지: 방문 집합 + 최대 10단계)
        Long currentManagerIdx = currentUser.getManagerIdx();
        int depth = 0;
        int maxDepth = 10;
        Set<Long> visited = new java.util.HashSet<>();
        visited.add(userIdx); // 본인 idx를 방문 목록에 추가하여 자기 자신이 체인에 포함되지 않도록 방지

        while (currentManagerIdx != null && depth < maxDepth) {
            if (visited.contains(currentManagerIdx)) {
                log.warn("상위 보고자 체인에서 순환 참조 감지. userIdx: {}, cycleIdx: {}", userIdx, currentManagerIdx);
                break;
            }

            User manager = userRepository.findById(currentManagerIdx).orElse(null);

            if (manager == null || manager.getDeletedAt() != null) {
                // 상위 보고자가 없거나 삭제된 경우 중단
                log.debug("상위 보고자를 찾을 수 없거나 삭제됨. managerIdx: {}", currentManagerIdx);
                break;
            }

            // 방문 기록
            visited.add(currentManagerIdx);

            // 상위 보고자를 리스트에 추가
            managerChain.add(userMapper.toSimpleDTO(manager));
            log.debug("상위 보고자 추가: {} (idx: {}, 직급: {})",
                    manager.getEmpName(), manager.getIdx(), manager.getEmpPosition());

            // 다음 상위 보고자로 이동
            currentManagerIdx = manager.getManagerIdx();
            depth++;
        }

        if (depth >= maxDepth) {
            log.warn("상위 보고자 체인이 최대 깊이({})를 초과했습니다. 순환 참조 가능성 있음.", maxDepth);
        }

        log.info("상위 보고자 체인 조회 완료. userIdx: {}, 상위 보고자 수: {}", userIdx, managerChain.size());
        return managerChain;
    }

    @Override
    public List<UserSimpleDTO> getSeniorUsersInDept(Long userIdx) {
        log.debug("getSeniorUsersInDept() called with userIdx: {}", userIdx);

        // 현재 사용자 조회
        User user = userRepository.findById(userIdx).orElse(null);
        if (user == null || user.getDeletedAt() != null) {
            log.warn("사용자를 찾을 수 없습니다. userIdx: {}", userIdx);
            return new ArrayList<>();
        }

        // 사용자의 직급 sortOrder 조회
        Integer userPositionSortOrder = codeService.getPositionSortOrder(user.getEmpPosition());
        log.debug("사용자 직급 sortOrder: {} (position: {})", userPositionSortOrder, user.getEmpPosition());

        // 같은 부서의 활성 사용자 조회
        List<User> deptUsers = userRepository.findActiveByEmpDept(user.getEmpDept());

        // 자신보다 높은 직급(sortOrder가 낮은) 사용자만 필터링 및 정렬
        List<UserSimpleDTO> seniorUsers = deptUsers.stream()
                .filter(u -> !u.getIdx().equals(userIdx)) // 본인 제외
                .filter(u -> {
                    Integer sortOrder = codeService.getPositionSortOrder(u.getEmpPosition());
                    return sortOrder < userPositionSortOrder; // sortOrder가 낮을수록 높은 직급
                })
                .sorted((u1, u2) -> {
                    // 1순위: 직급 순서 (sortOrder 낮은 순)
                    Integer sort1 = codeService.getPositionSortOrder(u1.getEmpPosition());
                    Integer sort2 = codeService.getPositionSortOrder(u2.getEmpPosition());
                    int sortCompare = sort1.compareTo(sort2);
                    if (sortCompare != 0) {
                        return sortCompare;
                    }

                    // 2순위: 팀장 여부 (팀장 우선)
                    int teamLeaderCompare = Boolean.compare(
                            u2.getIsTeamLeader() != null && u2.getIsTeamLeader(),
                            u1.getIsTeamLeader() != null && u1.getIsTeamLeader()
                    );
                    if (teamLeaderCompare != 0) {
                        return teamLeaderCompare;
                    }

                    // 3순위: 입사일 빠른 순
                    if (u1.getEmpJoinDate() == null && u2.getEmpJoinDate() == null) {
                        return 0;
                    }
                    if (u1.getEmpJoinDate() == null) {
                        return 1;
                    }
                    if (u2.getEmpJoinDate() == null) {
                        return -1;
                    }
                    return u1.getEmpJoinDate().compareTo(u2.getEmpJoinDate());
                })
                .map(userMapper::toSimpleDTO)
                .collect(Collectors.toList());

        log.info("같은 부서 내 상급자 조회 완료. userIdx: {}, 부서: {}, 상급자 수: {}",
                userIdx, user.getEmpDept(), seniorUsers.size());

        return seniorUsers;
    }

    @Override
    public UserSimpleDTO getDeptDirector(Long userIdx) {
        log.debug("getDeptDirector() called with userIdx: {}", userIdx);

        // 현재 사용자 조회
        User user = userRepository.findById(userIdx).orElse(null);
        if (user == null || user.getDeletedAt() != null) {
            log.warn("사용자를 찾을 수 없습니다. userIdx: {}", userIdx);
            return null;
        }

        // Code 테이블에서 "상무" 직급 코드 조회
        String directorPositionCode = codeService.getPositionCodeByName("상무");
        if (directorPositionCode == null) {
            log.warn("Code 테이블에서 '상무' 직급을 찾을 수 없습니다.");
            return null;
        }

        log.debug("상무 직급 코드: {}", directorPositionCode);

        // 소속 부서의 상무 조회
        Optional<User> director = userRepository.findActiveByEmpDeptAndEmpPosition(
                user.getEmpDept(), directorPositionCode);

        if (director.isPresent()) {
            log.info("부서 상무 조회 완료. userIdx: {}, 부서: {}, 상무: {}",
                    userIdx, user.getEmpDept(), director.get().getEmpName());
            return userMapper.toSimpleDTO(director.get());
        } else {
            log.warn("부서 상무를 찾을 수 없습니다. userIdx: {}, 부서: {}", userIdx, user.getEmpDept());
            return null;
        }
    }

    @Override
    public UserSimpleDTO getDirectManager(Long userIdx) {
        log.debug("getDirectManager() called with userIdx: {}", userIdx);
        User user = userRepository.findById(userIdx).orElse(null);
        if (user == null || user.getManagerIdx() == null) {
            return null;
        }
        return userRepository.findById(user.getManagerIdx())
                .filter(m -> m.getDeletedAt() == null)
                .map(userMapper::toSimpleDTO)
                .orElse(null);
    }

    @Override
    public UserSimpleDTO getCeo() {
        log.debug("getCeo() called");
        return userRepository.findActiveByEmpPosition(CodeConstants.Position.CEO.getCode())
                .stream()
                .findFirst()
                .map(ceo -> {
                    log.info("대표이사 조회 완료: {} (idx: {})", ceo.getEmpName(), ceo.getIdx());
                    return userMapper.toSimpleDTO(ceo);
                })
                .orElseGet(() -> {
                    log.warn("대표이사(Position.CEO={})를 찾을 수 없습니다.", CodeConstants.Position.CEO.getCode());
                    return null;
                });
    }

    /**
     * 비밀번호 해시 생성 (Salt 방식)
     *
     * @param password 평문 비밀번호
     * @return String[] {hashedPassword, salt}
     *         - hashedPassword: (password + salt)를 SHA-256 해시한 값
     *         - salt: 랜덤 생성된 salt 값
     */
    private String[] generatePasswordHashWithSalt(String password) {
        try {
            // 1. Salt 생성 (32바이트 랜덤)
            byte[] saltBytes = new byte[32];
            java.security.SecureRandom random = new java.security.SecureRandom();
            random.nextBytes(saltBytes);

            // Salt를 Hex String으로 변환
            String salt = bytesToHex(saltBytes);

            // 2. 비밀번호 + Salt를 SHA-256 해시
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String passwordWithSalt = password + salt;
            byte[] hash = digest.digest(passwordWithSalt.getBytes(StandardCharsets.UTF_8));
            String hashedPassword = bytesToHex(hash);

            log.debug("Password hash generated with salt. Salt length: {}, Hash length: {}",
                    salt.length(), hashedPassword.length());

            return new String[]{hashedPassword, salt};

        } catch (NoSuchAlgorithmException e) {
            log.error("Password hash generation failed", e);
            throw new RuntimeException("비밀번호 해시 생성 실패", e);
        }
    }

    /**
     * 비밀번호 검증 (Salt 방식)
     *
     * @param inputPassword 사용자가 입력한 평문 비밀번호
     * @param storedHash DB에 저장된 해시값 (password 컬럼)
     * @param salt DB에 저장된 salt 값 (password_hash 컬럼)
     * @return 비밀번호 일치 여부
     */
    public boolean verifyPassword(String inputPassword, String storedHash, String salt) {
        try {
            // 입력 비밀번호 + Salt를 SHA-256 해시
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String passwordWithSalt = inputPassword + salt;
            byte[] hash = digest.digest(passwordWithSalt.getBytes(StandardCharsets.UTF_8));
            String hashedInput = bytesToHex(hash);

            // 저장된 해시값과 비교
            return hashedInput.equals(storedHash);

        } catch (NoSuchAlgorithmException e) {
            log.error("Password verification failed", e);
            throw new RuntimeException("비밀번호 검증 실패", e);
        }
    }

    /**
     * Byte 배열을 Hex String으로 변환
     */
    private String bytesToHex(byte[] bytes) {
        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }

    /**
     * 부서명을 부서 코드로 변환
     * code 테이블(C01 그룹)에서 code_name으로 code 찾아서 설정
     *
     * 처리 로직:
     * 1. empDept가 이미 유효한 부서 코드(C01 그룹)라면 그대로 사용
     * 2. 부서 코드가 아니라면 부서명으로 간주하고 코드 변환 시도
     * 3. 둘 다 아니라면 에러 발생
     */
    private void setDepartmentCode(User user) {
        if (user.getEmpDept() == null || user.getEmpDept().isEmpty()) {
            log.warn("empDept is null or empty.");
            return;
        }

        String inputValue = user.getEmpDept().trim();
        log.debug("setDepartmentCode() - input value: '{}'", inputValue);

        // 1. empDept가 이미 유효한 dept_code인지 확인 (C01 그룹, 활성화된 것)
        if (codeService.isDeptCodeValid(inputValue)) {
            log.info("✓ empDept is already a valid and active dept_code: {}", inputValue);
            user.setEmpDept(inputValue);
            return;
        }

        // 입력값이 부서 코드로 존재하는지 확인 (비활성 포함)
        var deptByCode = codeService.getDepartmentByCode(inputValue);
        if (deptByCode.isPresent()) {
            var dept = deptByCode.get();
            log.error("✗ Department code '{}' exists but is NOT active. use_yn={}",
                    inputValue, dept.getUseYn());
            throw new IllegalArgumentException(
                    "비활성화된 부서입니다: " + inputValue +
                    ". 기초정보관리에서 부서를 활성화해주세요."
            );
        }

        // 2. empDept가 부서명인 경우 dept_code로 변환 시도
        log.debug("Attempting to convert department name to code: {}", inputValue);
        String deptCode = codeService.getDeptCodeByName(inputValue);

        if (deptCode != null) {
            log.info("✓ Department name converted to code: {} -> {}", inputValue, deptCode);
            user.setEmpDept(deptCode);
            return;
        }

        // 3. 부서 코드도 아니고 부서명도 아닌 경우 에러
        log.error("✗ Invalid department value: '{}'. Not found in code table (C01 group).", inputValue);
        throw new IllegalArgumentException(
                "유효하지 않은 부서입니다: " + inputValue +
                ". 기초정보관리에서 부서를 먼저 등록해주세요."
        );
    }

    /**
     * 상위보고자 자동 설정
     * 같은 부서 내에서 신규 사용자보다 높은 직급 중 최고 직급자를 자동으로 상위보고자로 설정
     *
     * 우선순위:
     * 1. 같은 부서의 활성 사용자 중
     * 2. 신규 사용자보다 높은 직급(sortOrder가 낮은) 사용자만 필터링
     * 3. 그 중 가장 높은 직급(sortOrder가 가장 낮은) 선택
     * 4. 같은 직급이 여러 명이면: 팀장(isTeamLeader=true) 우선, 그 다음 입사일 빠른 순
     *
     * @param user 신규 생성된 사용자
     */
    private void autoAssignManager(User user) {
        if (user.getEmpDept() == null || user.getEmpPosition() == null) {
            log.debug("부서 또는 직급이 설정되지 않아 상위보고자 자동 설정을 건너뜁니다.");
            return;
        }

        // 신규 사용자의 직급 sortOrder 조회
        Integer userPositionSortOrder = codeService.getPositionSortOrder(user.getEmpPosition());
        log.debug("신규 사용자 직급 sortOrder: {} (position: {})",
                userPositionSortOrder, user.getEmpPosition());

        // 레벨 1 (대표, sortOrder = 1): 상위보고자 없음
        if (userPositionSortOrder == 1) {
            log.info("대표이사는 상위보고자를 설정하지 않습니다.");
            return;
        }

        // 레벨 2 (상무/이사, sortOrder 2-3): 무조건 대표이사를 상위보고자로 설정
        if (userPositionSortOrder >= 2 && userPositionSortOrder <= 3) {
            User ceo = userRepository.findAllActive().stream()
                    .filter(u -> codeService.getPositionSortOrder(u.getEmpPosition()) == 1)
                    .findFirst()
                    .orElse(null);

            if (ceo != null) {
                user.setManagerIdx(ceo.getIdx());
                user.setManagerStartDate(user.getEmpJoinDate());
                log.info("✓ 레벨 2 상위보고자 자동 설정: {} (idx: {}) -> 대표이사: {} (idx: {})",
                        user.getEmpName(), user.getIdx(), ceo.getEmpName(), ceo.getIdx());
            } else {
                log.warn("대표이사를 찾을 수 없어 상위보고자를 설정하지 않습니다.");
            }
            return;
        }

        // 레벨 3, 4 (sortOrder 4 이상): 같은 부서의 상급자 할당
        // 같은 부서의 활성 사용자 조회 (본인 제외)
        List<User> deptUsers = userRepository.findActiveByEmpDept(user.getEmpDept()).stream()
                .filter(u -> !u.getIdx().equals(user.getIdx())) // 본인 제외
                .collect(Collectors.toList());

        if (deptUsers.isEmpty()) {
            log.info("같은 부서에 다른 활성 사용자가 없어 상위보고자를 설정하지 않습니다.");
            return;
        }

        // 자신보다 높은 직급(sortOrder가 낮은) 사용자만 필터링
        List<User> seniorUsers = deptUsers.stream()
                .filter(u -> {
                    Integer sortOrder = codeService.getPositionSortOrder(u.getEmpPosition());
                    return sortOrder < userPositionSortOrder; // sortOrder가 낮을수록 높은 직급
                })
                .collect(Collectors.toList());

        if (seniorUsers.isEmpty()) {
            log.info("같은 부서에 자신보다 높은 직급의 사용자가 없어 상위보고자를 설정하지 않습니다.");
            return;
        }

        // 가장 높은 직급(sortOrder가 가장 낮은) 찾기
        Integer minSortOrder = seniorUsers.stream()
                .map(u -> codeService.getPositionSortOrder(u.getEmpPosition()))
                .min(Integer::compareTo)
                .orElse(Integer.MAX_VALUE);

        // 최고 직급자들 중에서 선택 (팀장 우선, 입사일 빠른 순)
        User manager = seniorUsers.stream()
                .filter(u -> codeService.getPositionSortOrder(u.getEmpPosition()).equals(minSortOrder))
                .sorted((u1, u2) -> {
                    // 1순위: 팀장 여부 (팀장이 우선)
                    int teamLeaderCompare = Boolean.compare(
                            u2.getIsTeamLeader() != null && u2.getIsTeamLeader(),
                            u1.getIsTeamLeader() != null && u1.getIsTeamLeader()
                    );
                    if (teamLeaderCompare != 0) {
                        return teamLeaderCompare;
                    }

                    // 2순위: 입사일 빠른 순
                    if (u1.getEmpJoinDate() == null && u2.getEmpJoinDate() == null) {
                        return 0;
                    }
                    if (u1.getEmpJoinDate() == null) {
                        return 1;
                    }
                    if (u2.getEmpJoinDate() == null) {
                        return -1;
                    }
                    return u1.getEmpJoinDate().compareTo(u2.getEmpJoinDate());
                })
                .findFirst()
                .orElse(null);

        if (manager != null) {
            user.setManagerIdx(manager.getIdx());
            user.setManagerStartDate(user.getEmpJoinDate()); // 입사일을 보고 시작일로 설정
            log.info("✓ 상위보고자 자동 설정: {} (idx: {}) -> 상위보고자: {} (idx: {}, 직급: {}, 팀장: {})",
                    user.getEmpName(), user.getIdx(),
                    manager.getEmpName(), manager.getIdx(),
                    manager.getEmpPosition(),
                    manager.getIsTeamLeader() != null && manager.getIsTeamLeader() ? "Y" : "N");
        }
    }
}
