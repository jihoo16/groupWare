package com.pinecni.erp.api.project.service;

import com.pinecni.erp.api.project.dto.ProjectCardDTO;

import java.util.List;

/**
 * 연구비카드 Service Interface
 */
public interface ProjectCardService {

    /**
     * 전체 연구비카드 목록 조회
     */
    List<ProjectCardDTO> getAllCards();

    /**
     * 카드사별 연구비카드 목록 조회
     */
    List<ProjectCardDTO> getCardsByCompany(String cardCompany);

    /**
     * 연구비카드 상세 조회
     */
    ProjectCardDTO getCardById(Long idx);

    /**
     * 연구비카드 등록
     */
    ProjectCardDTO createCard(ProjectCardDTO cardDTO);

    /**
     * 연구비카드 수정
     */
    ProjectCardDTO updateCard(Long idx, ProjectCardDTO cardDTO);

    /**
     * 연구비카드 삭제 (비활성화)
     */
    void deleteCard(Long idx);
}
