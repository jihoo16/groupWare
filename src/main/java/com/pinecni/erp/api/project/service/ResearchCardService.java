package com.pinecni.erp.api.project.service;

import com.pinecni.erp.api.project.dto.ResearchCardDTO;

import java.util.List;

/**
 * 연구비 카드 Service Interface
 */
public interface ResearchCardService {

    /**
     * 전체 연구비 카드 목록 조회
     */
    List<ResearchCardDTO> getAllCards();

    /**
     * 카드사별 연구비 카드 목록 조회
     */
    List<ResearchCardDTO> getCardsByCompany(String cardCompany);

    /**
     * 연구비 카드 상세 조회
     */
    ResearchCardDTO getCardById(Long idx);

    /**
     * 연구비 카드 등록
     */
    ResearchCardDTO createCard(ResearchCardDTO cardDTO);

    /**
     * 연구비 카드 수정
     */
    ResearchCardDTO updateCard(Long idx, ResearchCardDTO cardDTO);

    /**
     * 연구비 카드 삭제 (비활성화)
     */
    void deleteCard(Long idx);
}
