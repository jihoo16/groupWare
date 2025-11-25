package com.pinecni.erp.api.organization.service;

import com.pinecni.erp.api.organization.dto.OrganizationTreeDTO;

/**
 * 조직도 서비스 인터페이스
 */
public interface OrganizationService {

    /**
     * 조직도 트리 데이터 조회
     *
     * @return 조직도 트리 구조
     */
    OrganizationTreeDTO getOrganizationTree();
}
