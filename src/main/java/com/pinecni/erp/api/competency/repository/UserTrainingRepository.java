package com.pinecni.erp.api.competency.repository;

import com.pinecni.erp.entity.UserTraining;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserTrainingRepository extends JpaRepository<UserTraining, Long> {

    List<UserTraining> findByUserIdxOrderByCompletionDateDesc(Long userIdx);
}
