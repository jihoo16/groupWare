package com.pinecni.erp.api.project.repository;

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
     * 직급별 경비 정책 목록 조회 (한 직급에 여러 경비 항목)
     */
    List<FixedExpensePolicy> findByPositionCode(String positionCode);

    /**
     * 직급 + 경비 항목명으로 조회
     */
    Optional<FixedExpensePolicy> findByPositionCodeAndExpenseItemName(String positionCode, String expenseItemName);

    /**
     * 모든 경비 정책 조회 (직급 코드 순)
     */
    List<FixedExpensePolicy> findAllByOrderByPositionCodeAscExpenseItemNameAsc();
}
