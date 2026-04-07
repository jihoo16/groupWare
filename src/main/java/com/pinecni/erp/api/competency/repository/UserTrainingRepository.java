package com.pinecni.erp.api.competency.repository;

import com.pinecni.erp.entity.UserTraining;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface UserTrainingRepository extends JpaRepository<UserTraining, Long> {

    List<UserTraining> findByUserIdxOrderByCompletionDateDesc(Long userIdx);

    /** 법정교육 일괄 등록 시 중복 체크용 */
    boolean existsByUserIdxAndTrainingNameAndTrainingOrgNameAndCompletionDate(
            Long userIdx, String trainingName, String trainingOrgName, LocalDate completionDate);
}
