package com.pinecni.erp.api.user.service;

import com.pinecni.erp.entity.User;
import com.pinecni.erp.repository.UserRepository;
import com.pinecni.erp.api.user.dto.UserCreateDTO;
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

        // 비밀번호 해시 생성
        String passwordHash = generatePasswordHash(createDTO.getPassword());

        // Entity 생성
        User user = userMapper.toEntity(createDTO, passwordHash);
        user.setCreatedUserIdx(createdUserIdx);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedUserIdx(createdUserIdx);
        user.setUpdatedAt(LocalDateTime.now());

        // 저장
        User savedUser = userRepository.save(user);
        log.info("User created successfully. idx: {}, empId: {}", savedUser.getIdx(), savedUser.getEmpId());

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

        // 비밀번호 변경 시 해시 생성
        String passwordHash = null;
        if (updateDTO.getPassword() != null) {
            passwordHash = generatePasswordHash(updateDTO.getPassword());
        }

        // Entity 업데이트
        userMapper.updateEntity(user, updateDTO, passwordHash);
        user.setUpdatedUserIdx(updatedUserIdx);

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

    /**
     * 비밀번호 SHA-256 해시 생성
     */
    private String generatePasswordHash(String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            log.error("Password hash generation failed", e);
            throw new RuntimeException("비밀번호 해시 생성 실패", e);
        }
    }
}
