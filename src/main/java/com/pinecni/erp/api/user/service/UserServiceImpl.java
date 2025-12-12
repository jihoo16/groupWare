package com.pinecni.erp.api.user.service;

import com.pinecni.erp.api.code.service.CodeService;
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
import java.util.List;
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
        return userRepository.findAll().stream()
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

        // 사번 중복 확인
        if (userRepository.findByEmpId(createDTO.getEmpId()).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 사번입니다: " + createDTO.getEmpId());
        }

        // 이메일 중복 확인
        if (userRepository.findByEmpEmail(createDTO.getEmpEmail()).isPresent()) {
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

        // 저장
        User savedUser = userRepository.save(user);
        log.info("User created successfully. idx: {}, empId: {}, empDept: {}",
                savedUser.getIdx(), savedUser.getEmpId(), savedUser.getEmpDept());

        return userMapper.toDTO(savedUser);
    }

    @Override
    @Transactional
    public UserDTO updateUser(Long idx, UserUpdateDTO updateDTO, Long updatedUserIdx) {
        log.debug("updateUser() called with idx: {}", idx);

        // 기존 사용자 조회
        User user = userRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. idx: " + idx));

        // 이메일 변경 시 중복 확인
        if (updateDTO.getEmpEmail() != null && !updateDTO.getEmpEmail().equals(user.getEmpEmail())) {
            if (userRepository.findByEmpEmail(updateDTO.getEmpEmail()).isPresent()) {
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
        return userRepository.findByEmpId(empId).isPresent();
    }

    @Override
    public boolean isEmailDuplicate(String empEmail) {
        return userRepository.findByEmpEmail(empEmail).isPresent();
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
}
