package com.pinecni.erp.api.project.service;

import com.pinecni.erp.api.project.dto.ResearchCardDTO;
import com.pinecni.erp.api.project.repository.ProjectRepository;
import com.pinecni.erp.api.project.repository.ResearchCardRepository;
import com.pinecni.erp.entity.Project;
import com.pinecni.erp.entity.ResearchCard;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 연구비 카드 Service 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResearchCardServiceImpl implements ResearchCardService {

    private final ResearchCardRepository researchCardRepository;
    private final ProjectRepository projectRepository;

    @Override
    public List<ResearchCardDTO> getAllCards() {
        log.debug("[전체 연구비 카드 조회]");

        List<ResearchCard> cards = researchCardRepository.findAllActive();

        return cards.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<ResearchCardDTO> getCardsByCompany(String cardCompany) {
        log.debug("[카드사별 연구비 카드 조회] cardCompany: {}", cardCompany);

        List<ResearchCard> cards = researchCardRepository.findByCardCompany(cardCompany);

        return cards.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public ResearchCardDTO getCardById(Long idx) {
        log.debug("[연구비 카드 상세 조회] idx: {}", idx);

        ResearchCard card = researchCardRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("연구비 카드를 찾을 수 없습니다. idx: " + idx));

        return convertToDTO(card);
    }

    @Override
    @Transactional
    public ResearchCardDTO createCard(ResearchCardDTO cardDTO) {
        log.debug("[연구비 카드 등록] projectIdx: {}, cardCompany: {}",
                cardDTO.getProjectIdx(), cardDTO.getCardCompany());

        // 유효성 검사
        if (cardDTO.getProjectIdx() == null) {
            throw new IllegalArgumentException("프로젝트를 선택해주세요.");
        }
        if (cardDTO.getCardCompany() == null || cardDTO.getCardCompany().isEmpty()) {
            throw new IllegalArgumentException("카드사를 선택해주세요.");
        }
        if (cardDTO.getCardLastDigits() == null || cardDTO.getCardLastDigits().length() != 4) {
            throw new IllegalArgumentException("카드 뒷 4자리를 정확히 입력해주세요.");
        }

        // 프로젝트 존재 확인
        projectRepository.findById(cardDTO.getProjectIdx())
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다."));

        // Entity 생성
        ResearchCard card = ResearchCard.builder()
                .projectIdx(cardDTO.getProjectIdx())
                .cardCompany(cardDTO.getCardCompany())
                .cardLastDigits(cardDTO.getCardLastDigits())
                .cardNickname(cardDTO.getCardNickname())
                .isActive(true)
                .build();

        // 저장
        ResearchCard saved = researchCardRepository.save(card);
        log.info("[연구비 카드 등록 완료] idx: {}", saved.getIdx());

        return convertToDTO(saved);
    }

    @Override
    @Transactional
    public ResearchCardDTO updateCard(Long idx, ResearchCardDTO cardDTO) {
        log.debug("[연구비 카드 수정] idx: {}", idx);

        ResearchCard card = researchCardRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("연구비 카드를 찾을 수 없습니다. idx: " + idx));

        // 수정
        if (cardDTO.getProjectIdx() != null) {
            projectRepository.findById(cardDTO.getProjectIdx())
                    .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다."));
            card.setProjectIdx(cardDTO.getProjectIdx());
        }
        if (cardDTO.getCardCompany() != null && !cardDTO.getCardCompany().isEmpty()) {
            card.setCardCompany(cardDTO.getCardCompany());
        }
        if (cardDTO.getCardLastDigits() != null && cardDTO.getCardLastDigits().length() == 4) {
            card.setCardLastDigits(cardDTO.getCardLastDigits());
        }
        if (cardDTO.getCardNickname() != null) {
            card.setCardNickname(cardDTO.getCardNickname());
        }

        card.setUpdatedAt(LocalDateTime.now());

        ResearchCard updated = researchCardRepository.save(card);
        log.info("[연구비 카드 수정 완료] idx: {}", updated.getIdx());

        return convertToDTO(updated);
    }

    @Override
    @Transactional
    public void deleteCard(Long idx) {
        log.debug("[연구비 카드 삭제] idx: {}", idx);

        ResearchCard card = researchCardRepository.findById(idx)
                .orElseThrow(() -> new IllegalArgumentException("연구비 카드를 찾을 수 없습니다. idx: " + idx));

        // 소프트 삭제 (비활성화)
        card.setIsActive(false);
        card.setUpdatedAt(LocalDateTime.now());

        researchCardRepository.save(card);
        log.info("[연구비 카드 삭제 완료] idx: {}", idx);
    }

    /**
     * Entity → DTO 변환
     */
    private ResearchCardDTO convertToDTO(ResearchCard card) {
        ResearchCardDTO dto = ResearchCardDTO.builder()
                .idx(card.getIdx())
                .projectIdx(card.getProjectIdx())
                .cardCompany(card.getCardCompany())
                .cardLastDigits(card.getCardLastDigits())
                .cardNickname(card.getCardNickname())
                .isActive(card.getIsActive())
                .build();

        // 프로젝트 정보 추가
        if (card.getProjectIdx() != null) {
            projectRepository.findById(card.getProjectIdx()).ifPresent(project -> {
                dto.setProjectName(project.getProjectName());
            });
        }

        // 등록일 추가
        if (card.getCreatedAt() != null) {
            dto.setCreatedAt(card.getCreatedAt());
        }

        return dto;
    }
}
