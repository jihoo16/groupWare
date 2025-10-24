package com.pinecni.erp.repository;

import com.pinecni.erp.entity.FixedExpensePolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * FixedExpensePolicy Repository
 */
@Repository
public interface FixedExpensePolicyRepository extends JpaRepository<FixedExpensePolicy, Long> {

    /**
     * 직급별 경비 정책 조회
     */
    Optional<FixedExpensePolicy> findByPositionCode(String positionCode);

    /**
     * 모든 경비 정책 조회 (직급 코드 순)
     */
    List<FixedExpensePolicy> findAllByOrderByPositionCode();
}
