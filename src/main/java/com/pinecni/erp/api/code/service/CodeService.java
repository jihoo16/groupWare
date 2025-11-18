package com.pinecni.erp.api.code.service;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.entity.Code;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Code Service
 * 직급(C02), 직위(C08) 등 코드 관리 서비스
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CodeService {

    private final CodeRepository codeRepository;

    /**
     * 그룹별 코드 목록 조회
     */
    public List<Code> getCodesByGroupCode(String groupCode) {
        log.debug("그룹별 코드 목록 조회: groupCode={}", groupCode);
        return codeRepository.findByGroupCode(groupCode);
    }

    /**
     * 활성화된 코드 목록 조회
     */
    public List<Code> getActiveCodesByGroupCode(String groupCode) {
        log.debug("활성화된 코드 목록 조회: groupCode={}", groupCode);
        return codeRepository.findActiveByGroupCode(groupCode);
    }

    /**
     * 코드 상세 조회 (idx)
     */
    public Optional<Code> getCodeById(Long idx) {
        log.debug("코드 상세 조회: idx={}", idx);
        return codeRepository.findById(idx);
    }

    /**
     * 코드 상세 조회 (groupCode + code)
     */
    public Optional<Code> getCodeByGroupCodeAndCode(String groupCode, String code) {
        log.debug("코드 상세 조회: groupCode={}, code={}", groupCode, code);
        return codeRepository.findByGroupCodeAndCode(groupCode, code);
    }

    /**
     * 코드 생성
     */
    @Transactional
    public Code createCode(Code code) {
        log.info("코드 생성: groupCode={}, code={}, codeName={}",
                code.getGroupCode(), code.getCode(), code.getCodeName());

        // 중복 체크
        Optional<Code> existing = codeRepository.findByGroupCodeAndCode(
                code.getGroupCode(), code.getCode());
        if (existing.isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 코드입니다: " + code.getCode());
        }

        // 기본값 설정
        if (code.getUseYn() == null || code.getUseYn().isEmpty()) {
            code.setUseYn("Y");
        }
        if (code.getSortOrder() == null) {
            code.setSortOrder(0);
        }

        return codeRepository.save(code);
    }

    /**
     * 코드 수정
     */
    @Transactional
    public Code updateCode(Long idx, Code updatedCode) {
        log.info("코드 수정: idx={}", idx);

        Code code = codeRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 코드입니다: " + idx));

        // 코드 수정 (groupCode, code는 변경 불가)
        code.setCodeName(updatedCode.getCodeName());
        code.setCodeNameEn(updatedCode.getCodeNameEn());
        code.setDescription(updatedCode.getDescription());
        code.setUseYn(updatedCode.getUseYn());
        code.setSortOrder(updatedCode.getSortOrder());

        return codeRepository.save(code);
    }

    /**
     * 코드 삭제
     */
    @Transactional
    public void deleteCode(Long idx) {
        log.info("코드 삭제: idx={}", idx);

        Code code = codeRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 코드입니다: " + idx));

        codeRepository.delete(code);
    }

    /**
     * 코드 사용 여부 변경
     */
    @Transactional
    public Code toggleCodeUseYn(Long idx) {
        log.info("코드 사용 여부 변경: idx={}", idx);

        Code code = codeRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 코드입니다: " + idx));

        code.setUseYn(code.getUseYn().equals("Y") ? "N" : "Y");

        return codeRepository.save(code);
    }

    /**
     * 직급 목록 조회 (C02)
     */
    public List<Code> getRanks() {
        return getCodesByGroupCode("C02");
    }

    /**
     * 활성화된 직급 목록 조회 (C02)
     */
    public List<Code> getActiveRanks() {
        return getActiveCodesByGroupCode("C02");
    }

    /**
     * 직위 목록 조회 (C08)
     */
    public List<Code> getPositions() {
        return getCodesByGroupCode("C08");
    }

    /**
     * 부서 목록 조회 (C01)
     */
    public List<Code> getDepartments() {
        return getCodesByGroupCode("C01");
    }

    /**
     * 활성화된 부서 목록 조회 (C01)
     */
    public List<Code> getActiveDepartments() {
        return getActiveCodesByGroupCode("C01");
    }
}
