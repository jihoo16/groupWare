package com.pinecni.erp.api.user.service;

import com.pinecni.erp.api.user.dto.UserCreateDTO;
import com.pinecni.erp.api.user.dto.UserDTO;
import com.pinecni.erp.api.user.dto.UserSimpleDTO;
import com.pinecni.erp.api.user.dto.UserUpdateDTO;

import java.util.List;

/**
 * User Service Interface
 */
public interface UserService {

    /**
     * 전체 활성 사용자 목록 조회
     */
    List<UserSimpleDTO> getAllActiveUsers();

    /**
     * 전체 사용자 목록 조회 (삭제된 사용자 포함)
     */
    List<UserSimpleDTO> getAllUsers();

    /**
     * 사용자 상세 조회 (idx)
     */
    UserDTO getUserById(Long idx);

    /**
     * 사용자 조회 (사번)
     */
    UserDTO getUserByEmpId(String empId);

    /**
     * 사용자 조회 (이메일)
     */
    UserDTO getUserByEmail(String empEmail);

    /**
     * 부서별 활성 사용자 조회
     */
    List<UserSimpleDTO> getUsersByDept(String empDept);

    /**
     * 직급별 활성 사용자 조회
     */
    List<UserSimpleDTO> getUsersByPosition(String empPosition);

    /**
     * 상태별 사용자 조회
     */
    List<UserSimpleDTO> getUsersByStatus(String empStatus);

    /**
     * 이름으로 사용자 검색
     */
    List<UserSimpleDTO> searchUsersByName(String name);

    /**
     * 사용자 생성
     */
    UserDTO createUser(UserCreateDTO createDTO, Long createdUserIdx);

    /**
     * 사용자 수정
     */
    UserDTO updateUser(Long idx, UserUpdateDTO updateDTO, Long updatedUserIdx);

    /**
     * 사용자 삭제 (Soft Delete)
     */
    void deleteUser(Long idx, Long deletedUserIdx);

    /**
     * 사용자 복구
     */
    UserDTO restoreUser(Long idx);

    /**
     * 사번 중복 확인
     */
    boolean isEmpIdDuplicate(String empId);

    /**
     * 이메일 중복 확인
     */
    boolean isEmailDuplicate(String empEmail);

    /**
     * 다음 사번 생성
     * 형식: YYYYMMddnn (예: 2025120101)
     * - 오늘 날짜 기준으로 등록된 직원이 없으면 01부터 시작
     * - 같은 날짜에 이미 등록된 직원이 있으면 nn을 증가
     */
    String generateNextEmployeeId();

    /**
     * 사용자의 상위 보고자 체인 조회
     * 결재선 구성에 활용 (본인 -> 상위보고자 -> 상위보고자의 상위보고자 -> ... -> 최상위)
     * @param userIdx 사용자 idx
     * @return 상위 보고자 목록 (순서: 직속 상위 -> 최상위)
     */
    List<UserSimpleDTO> getManagerChain(Long userIdx);

    /**
     * 같은 부서 내 상급자 목록 조회
     * 부서장 선택 드롭다운에 활용
     * @param userIdx 사용자 idx
     * @return 같은 부서 내에서 자신보다 직급이 높은 사용자 목록 (직급 순서대로 정렬)
     */
    List<UserSimpleDTO> getSeniorUsersInDept(Long userIdx);
}
