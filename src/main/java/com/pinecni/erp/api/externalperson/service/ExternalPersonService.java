package com.pinecni.erp.api.externalperson.service;

import com.pinecni.erp.api.externalperson.repository.ExternalPersonRepository;
import com.pinecni.erp.entity.ExternalPerson;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * ExternalPerson Service
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ExternalPersonService {

    private final ExternalPersonRepository externalPersonRepository;

    /**
     * 전체 외부인원 목록 조회
     */
    public List<ExternalPerson> getAllExternalPersons() {
        log.debug("getAllExternalPersons() called");
        return externalPersonRepository.findAllOrderByIdxDesc();
    }

    /**
     * 외부인원 단건 조회
     */
    public Optional<ExternalPerson> getExternalPersonById(Long idx) {
        log.debug("getExternalPersonById() called with idx: {}", idx);
        return externalPersonRepository.findById(idx);
    }

    /**
     * 외부인원 등록
     */
    @Transactional
    public ExternalPerson createExternalPerson(ExternalPerson externalPerson, Long currentUserIdx) {
        log.debug("createExternalPerson() called with: {}, createdUserIdx: {}", externalPerson, currentUserIdx);

        // 생성자 정보 설정
        externalPerson.setCreatedUserIdx(currentUserIdx);
        externalPerson.setUpdatedUserIdx(currentUserIdx);

        return externalPersonRepository.save(externalPerson);
    }

    /**
     * 외부인원 수정
     */
    @Transactional
    public ExternalPerson updateExternalPerson(Long idx, ExternalPerson updatedPerson, Long currentUserIdx) {
        log.debug("updateExternalPerson() called with idx: {}, data: {}, updatedUserIdx: {}", idx, updatedPerson, currentUserIdx);

        ExternalPerson existingPerson = externalPersonRepository.findById(idx)
                .orElseThrow(() -> new RuntimeException("External person not found with idx: " + idx));

        existingPerson.setCompanyName(updatedPerson.getCompanyName());
        existingPerson.setPosition(updatedPerson.getPosition());
        existingPerson.setName(updatedPerson.getName());

        // 수정자 정보 설정
        existingPerson.setUpdatedUserIdx(currentUserIdx);

        return externalPersonRepository.save(existingPerson);
    }

    /**
     * 외부인원 삭제
     */
    @Transactional
    public void deleteExternalPerson(Long idx) {
        log.debug("deleteExternalPerson() called with idx: {}", idx);

        if (!externalPersonRepository.existsById(idx)) {
            throw new RuntimeException("External person not found with idx: " + idx);
        }

        externalPersonRepository.deleteById(idx);
    }

    /**
     * 회사명으로 검색
     */
    public List<ExternalPerson> searchByCompanyName(String companyName) {
        log.debug("searchByCompanyName() called with: {}", companyName);
        return externalPersonRepository.findByCompanyNameContaining(companyName);
    }

    /**
     * 이름으로 검색
     */
    public List<ExternalPerson> searchByName(String name) {
        log.debug("searchByName() called with: {}", name);
        return externalPersonRepository.findByNameContaining(name);
    }
}
