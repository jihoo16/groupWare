package com.pinecni.erp.api.code.service;

import com.pinecni.erp.api.code.repository.CodeGroupRepository;
import com.pinecni.erp.entity.CodeGroup;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * CodeGroup Service
 * 그룹코드 관리 서비스
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CodeGroupService {

    private final CodeGroupRepository codeGroupRepository;

    /**
     * 전체 그룹코드 목록 조회
     */
    public List<CodeGroup> getAllCodeGroups() {
        log.debug("전체 그룹코드 목록 조회");
        return codeGroupRepository.findAllOrdered();
    }

    /**
     * 활성화된 그룹코드 목록 조회
     */
    public List<CodeGroup> getActiveCodeGroups() {
        log.debug("활성화된 그룹코드 목록 조회");
        return codeGroupRepository.findAllActive();
    }

    /**
     * 그룹코드 상세 조회 (idx)
     */
    public Optional<CodeGroup> getCodeGroupById(Long idx) {
        log.debug("그룹코드 상세 조회: idx={}", idx);
        return codeGroupRepository.findById(idx);
    }

    /**
     * 그룹코드 상세 조회 (groupCode)
     */
    public Optional<CodeGroup> getCodeGroupByCode(String groupCode) {
        log.debug("그룹코드 상세 조회: groupCode={}", groupCode);
        return codeGroupRepository.findByGroupCode(groupCode);
    }

    /**
     * 그룹코드 생성
     */
    @Transactional
    @CacheEvict(value = "codeGroups", allEntries = true)
    public CodeGroup createCodeGroup(CodeGroup codeGroup) {
        log.info("그룹코드 생성: groupCode={}, groupName={}",
                codeGroup.getGroupCode(), codeGroup.getGroupName());

        // 중복 체크
        Optional<CodeGroup> existing = codeGroupRepository.findByGroupCode(codeGroup.getGroupCode());
        if (existing.isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 그룹코드입니다: " + codeGroup.getGroupCode());
        }

        // 기본값 설정
        if (codeGroup.getUseYn() == null || codeGroup.getUseYn().isEmpty()) {
            codeGroup.setUseYn("Y");
        }
        if (codeGroup.getSortOrder() == null) {
            codeGroup.setSortOrder(0);
        }

        return codeGroupRepository.save(codeGroup);
    }

    /**
     * 그룹코드 수정
     */
    @Transactional
    @CacheEvict(value = "codeGroups", allEntries = true)
    public CodeGroup updateCodeGroup(Long idx, CodeGroup updatedCodeGroup) {
        log.info("그룹코드 수정: idx={}", idx);

        CodeGroup codeGroup = codeGroupRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 그룹코드입니다: " + idx));

        // 그룹코드 수정 (groupCode는 변경 불가)
        codeGroup.setGroupName(updatedCodeGroup.getGroupName());
        codeGroup.setGroupNameEn(updatedCodeGroup.getGroupNameEn());
        codeGroup.setDescription(updatedCodeGroup.getDescription());
        codeGroup.setUseYn(updatedCodeGroup.getUseYn());
        codeGroup.setSortOrder(updatedCodeGroup.getSortOrder());

        return codeGroupRepository.save(codeGroup);
    }

    /**
     * 그룹코드 삭제
     */
    @Transactional
    @CacheEvict(value = "codeGroups", allEntries = true)
    public void deleteCodeGroup(Long idx) {
        log.info("그룹코드 삭제: idx={}", idx);

        CodeGroup codeGroup = codeGroupRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 그룹코드입니다: " + idx));

        codeGroupRepository.delete(codeGroup);
    }

    /**
     * 그룹코드 사용 여부 변경
     */
    @Transactional
    @CacheEvict(value = "codeGroups", allEntries = true)
    public CodeGroup toggleCodeGroupUseYn(Long idx) {
        log.info("그룹코드 사용 여부 변경: idx={}", idx);

        CodeGroup codeGroup = codeGroupRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 그룹코드입니다: " + idx));

        codeGroup.setUseYn(codeGroup.getUseYn().equals("Y") ? "N" : "Y");

        return codeGroupRepository.save(codeGroup);
    }

    /**
     * 그룹코드 존재 여부 확인
     */
    public boolean existsByGroupCode(String groupCode) {
        return codeGroupRepository.findByGroupCode(groupCode).isPresent();
    }

    /**
     * 그룹코드 유효성 검증 (활성화 상태 확인)
     */
    public boolean isGroupCodeValid(String groupCode) {
        return codeGroupRepository.findByGroupCode(groupCode)
                .filter(cg -> "Y".equals(cg.getUseYn()))
                .isPresent();
    }
}
