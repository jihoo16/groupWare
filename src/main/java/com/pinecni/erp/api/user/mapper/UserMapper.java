package com.pinecni.erp.api.user.mapper;

import com.pinecni.erp.entity.User;
import com.pinecni.erp.api.user.dto.UserCreateDTO;
import com.pinecni.erp.api.user.dto.UserDTO;
import com.pinecni.erp.api.user.dto.UserSimpleDTO;
import com.pinecni.erp.api.user.dto.UserUpdateDTO;
import com.pinecni.erp.api.code.repository.CodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * User Entity <-> DTO 변환 Mapper
 */
@Component
@RequiredArgsConstructor
public class UserMapper {

    private final CodeRepository codeRepository;

    /**
     * Entity -> DTO 변환
     */
    public UserDTO toDTO(User user) {
        if (user == null) {
            return null;
        }

        UserDTO dto = UserDTO.builder()
                .idx(user.getIdx())
                .empId(user.getEmpId())
                .empName(user.getEmpName())
                .empBirth(user.getEmpBirth())
                .empGender(user.getEmpGender())
                .empEmail(user.getEmpEmail())
                .externalEmail(user.getExternalEmail())
                .empPhone(user.getEmpPhone())
                .emergencyContact(user.getEmergencyContact())
                .empAddress(user.getEmpAddress())
                .empDept(user.getEmpDept())
                .empPosition(user.getEmpPosition())
                .empJoinDate(user.getEmpJoinDate())
                .empStatus(user.getEmpStatus())
                .empWorkType(user.getEmpWorkType())
                .empNotes(user.getEmpNotes())
                .profilePhotoPath(user.getProfilePhotoPath())
                .memo(user.getMemo())
                .lastLoginDate(user.getLastLoginDate())
                .isAdmin(user.getIsAdmin())
                .createdAt(user.getCreatedAt())
                .createdUserIdx(user.getCreatedUserIdx())
                .updatedAt(user.getUpdatedAt())
                .updatedUserIdx(user.getUpdatedUserIdx())
                .build();

        // 부서 코드명 조회
        if (user.getEmpDept() != null) {
            codeRepository.findByGroupCodeAndCode("C01", user.getEmpDept())
                    .ifPresent(code -> dto.setEmpDeptName(code.getCodeName()));
        }

        // 직급 코드명 조회
        if (user.getEmpPosition() != null) {
            codeRepository.findByGroupCodeAndCode("C02", user.getEmpPosition())
                    .ifPresent(code -> dto.setEmpPositionName(code.getCodeName()));
        }

        return dto;
    }

    /**
     * Entity -> Simple DTO 변환
     */
    public UserSimpleDTO toSimpleDTO(User user) {
        if (user == null) {
            return null;
        }

        UserSimpleDTO dto = UserSimpleDTO.builder()
                .idx(user.getIdx())
                .empId(user.getEmpId())
                .empName(user.getEmpName())
                .empDept(user.getEmpDept())
                .empPosition(user.getEmpPosition())
                .empEmail(user.getEmpEmail())
                .empPhone(user.getEmpPhone())
                .empJoinDate(user.getEmpJoinDate())
                .empStatus(user.getEmpStatus())
                .profilePhotoPath(user.getProfilePhotoPath())
                .build();

        // 부서 코드명 조회
        if (user.getEmpDept() != null) {
            codeRepository.findByGroupCodeAndCode("C01", user.getEmpDept())
                    .ifPresent(code -> dto.setEmpDeptName(code.getCodeName()));
        }

        // 직급 코드명 및 sortOrder 조회
        if (user.getEmpPosition() != null) {
            codeRepository.findByGroupCodeAndCode("C02", user.getEmpPosition())
                    .ifPresent(code -> {
                        dto.setEmpPositionName(code.getCodeName());
                        dto.setEmpPositionSortOrder(code.getSortOrder());
                    });
        }

        return dto;
    }

    /**
     * CreateDTO -> Entity 변환
     *
     * @param dto 사용자 생성 DTO
     * @param hashedPassword 비밀번호 + salt를 SHA-256 해시한 값 (password 컬럼에 저장)
     * @param salt 랜덤 생성된 salt 값 (password_hash 컬럼에 저장)
     */
    public User toEntity(UserCreateDTO dto, String hashedPassword, String salt) {
        if (dto == null) {
            return null;
        }

        User user = User.builder()
                .empId(dto.getEmpId())
                .empName(dto.getEmpName())
                .empBirth(dto.getEmpBirth())
                .empGender(dto.getEmpGender())
                .empEmail(dto.getEmpEmail())
                .externalEmail(dto.getExternalEmail())
                .empPhone(dto.getEmpPhone())
                .emergencyContact(dto.getEmergencyContact())
                .empAddress(dto.getEmpAddress())
                .empDept(dto.getEmpDept())
                .empPosition(dto.getEmpPosition())
                .empJoinDate(dto.getEmpJoinDate())
                .empStatus(dto.getEmpStatus() != null ? dto.getEmpStatus() : "재직")
                .empWorkType(dto.getEmpWorkType() != null ? dto.getEmpWorkType() : "정규직")
                .empNotes(dto.getEmpNotes())
                .password(hashedPassword)     // 해시값 저장
                .passwordHash(salt)            // salt 저장
                .memo(dto.getMemo())
                .isAdmin(dto.getIsAdmin() != null ? dto.getIsAdmin() : false)
                .signatureImage(new byte[0]) // 기본값, 추후 업로드 처리
                .build();

        return user;
    }

    /**
     * UpdateDTO를 기존 Entity에 적용
     *
     * @param user 기존 사용자 엔티티
     * @param dto 수정 DTO
     * @param hashedPassword 비밀번호 + salt를 SHA-256 해시한 값 (password 컬럼에 저장)
     * @param salt 랜덤 생성된 salt 값 (password_hash 컬럼에 저장)
     */
    public void updateEntity(User user, UserUpdateDTO dto, String hashedPassword, String salt) {
        if (user == null || dto == null) {
            return;
        }

        if (dto.getEmpName() != null) {
            user.setEmpName(dto.getEmpName());
        }
        if (dto.getEmpBirth() != null) {
            user.setEmpBirth(dto.getEmpBirth());
        }
        if (dto.getEmpGender() != null) {
            user.setEmpGender(dto.getEmpGender());
        }
        if (dto.getEmpEmail() != null) {
            user.setEmpEmail(dto.getEmpEmail());
        }
        if (dto.getExternalEmail() != null) {
            user.setExternalEmail(dto.getExternalEmail());
        }
        if (dto.getEmpPhone() != null) {
            user.setEmpPhone(dto.getEmpPhone());
        }
        if (dto.getEmergencyContact() != null) {
            user.setEmergencyContact(dto.getEmergencyContact());
        }
        if (dto.getEmpAddress() != null) {
            user.setEmpAddress(dto.getEmpAddress());
        }
        if (dto.getEmpDept() != null) {
            user.setEmpDept(dto.getEmpDept());
        }
        if (dto.getEmpPosition() != null) {
            user.setEmpPosition(dto.getEmpPosition());
        }
        if (dto.getEmpJoinDate() != null) {
            user.setEmpJoinDate(dto.getEmpJoinDate());
        }
        if (dto.getEmpStatus() != null) {
            user.setEmpStatus(dto.getEmpStatus());
        }
        if (dto.getEmpWorkType() != null) {
            user.setEmpWorkType(dto.getEmpWorkType());
        }
        if (dto.getEmpNotes() != null) {
            user.setEmpNotes(dto.getEmpNotes());
        }
        if (dto.getMemo() != null) {
            user.setMemo(dto.getMemo());
        }
        if (dto.getProfilePhotoPath() != null) {
            user.setProfilePhotoPath(dto.getProfilePhotoPath());
        }
        if (hashedPassword != null && salt != null) {
            user.setPassword(hashedPassword);     // 해시값 저장
            user.setPasswordHash(salt);            // salt 저장
        }
        if (dto.getIsAdmin() != null) {
            user.setIsAdmin(dto.getIsAdmin());
        }

        user.setUpdatedAt(LocalDateTime.now());
    }
}
