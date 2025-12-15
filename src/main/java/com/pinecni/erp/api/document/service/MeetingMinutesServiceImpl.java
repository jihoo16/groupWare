package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.MeetingMinutesCreateDTO;
import com.pinecni.erp.api.document.dto.MeetingMinutesDTO;
import com.pinecni.erp.api.document.dto.MeetingMinutesUpdateDTO;
import com.pinecni.erp.api.document.mapper.MeetingMinutesMapper;
import com.pinecni.erp.api.document.repository.MeetingMinutesRepository;
import com.pinecni.erp.entity.MeetingsMinutes;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MeetingMinutesServiceImpl implements MeetingMinutesService {
private final MeetingMinutesRepository meetingMinutesRepository;
    private final MeetingMinutesMapper meetingMinutesMapper;
    @Override
    @Transactional
    public MeetingMinutesDTO createMeetingMinute(MeetingMinutesCreateDTO createDTO) {
        log.debug("createMeetingMinute");

        // DTO → Entity 변환
        MeetingsMinutes meetingMinute = meetingMinutesMapper.toEntity(createDTO);
        // 생성 시간 설정
        LocalDateTime now = LocalDateTime.now();
        meetingMinute.setCreatedAt(now);
        meetingMinute.setUpdatedAt(now);

        // 생성자 정보 설정
        if(meetingMinute.getCreatedUserIdx()==null){
            meetingMinute.setCreatedUserIdx(createDTO.getUserIdx());
        }

        // 저장
        MeetingsMinutes saved = meetingMinutesRepository.save(meetingMinute);
     return meetingMinutesMapper.toDTO(saved);
    }

    @Override
    public List<MeetingMinutesDTO> getAllMeetingMinutes(){
        log.debug("getAllMeetingMinutes");
        List<MeetingsMinutes> reports = meetingMinutesRepository.findAllOrderByCreatedAtDesc();
        return reports.stream()
                .map(meetingMinutesMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public MeetingMinutesDTO getMeetingMinutesById(Long id){
        log.debug("getMeetingMinutesById() called - id: {}", id);
        MeetingsMinutes report = meetingMinutesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("회의록을 찾을 수 없습니다. ID: " + id));
        log.debug("MeetingsMinutes found - id: {}", report.getId());
        return meetingMinutesMapper.toDTO(report);
    }

    @Override
    @Transactional
    public MeetingMinutesDTO updateMeetingMinutes(Long id, MeetingMinutesUpdateDTO updateDTO, Long updatedUserIdx) {
        log.debug("updateMeetingMinutes() called - id: {}, updatedUserIdx: {}", id, updatedUserIdx);

        // 기존 Entity 조회
        MeetingsMinutes meeting = meetingMinutesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("회의록을 찾을 수 없습니다. ID: " + id));

        // UpdateDTO로 Entity 업데이트
        meetingMinutesMapper.updateEntity(meeting, updateDTO, updatedUserIdx);

        // 저장 (dirty checking에 의해 자동 업데이트)
        MeetingsMinutes updated = meetingMinutesRepository.save(meeting);
        log.debug("MeetingsMinutes updated successfully - id: {}", updated.getId());

        // Entity → DTO 변환
        return meetingMinutesMapper.toDTO(updated);
    }

}
