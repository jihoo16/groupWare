package com.pinecni.erp.api.project.repository;

import com.pinecni.erp.entity.ProjectBudgetAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProjectBudgetAdjustmentRepository extends JpaRepository<ProjectBudgetAdjustment, Long> {
}
