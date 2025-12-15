package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.MeetingMinutesCreateDTO;
import com.pinecni.erp.api.document.dto.MeetingMinutesDTO;
import com.pinecni.erp.api.document.mapper.MeetingMinutesMapper;
import com.pinecni.erp.api.document.repository.MeetingMinutesRepository;
import com.pinecni.erp.entity.MeetingsMinutes;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
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
        // 생성 시간 설정 (Mapper에서 이미 설정되지만 명시적으로 다시 설정)
        Instant now = Instant.now();
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
        log.debug("getMeetingMinutesById");
        MeetingsMinutes report = meetingMinutesRepository.findById(id).orElse(null);
        return meetingMinutesMapper.toDTO(report);
    }
}
