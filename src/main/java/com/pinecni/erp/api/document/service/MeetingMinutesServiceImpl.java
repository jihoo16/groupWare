package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.MeetingMinutesCreateDTO;
import com.pinecni.erp.api.document.dto.MeetingMinutesDTO;
import com.pinecni.erp.api.document.dto.MeetingMinutesUpdateDTO;
import com.pinecni.erp.api.document.mapper.MeetingMinutesMapper;
import com.pinecni.erp.api.document.repository.MeetingMinutesRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.entity.MeetingsMinutes;
import com.pinecni.erp.entity.User;
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
    private final UserRepository userRepository;
    private final CodeRepository codeRepository;
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
                .map(report -> {
                    MeetingMinutesDTO dto = meetingMinutesMapper.toDTO(report);
                    // User 정보 조회 및 설정
                    userRepository.findById(report.getUserIdx()).ifPresent(user -> {
                        dto.setUserName(user.getEmpName());
                        dto.setUserDept(user.getEmpDept());
                        // 부서 이름 조회
                        if (user.getEmpDept() != null) {
                            codeRepository.findByCode(user.getEmpDept()).ifPresent(code -> {
                                dto.setUserDeptName(code.getCodeName());
                            });
                        }
                    });
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    public MeetingMinutesDTO getMeetingMinutesById(Long id){
        log.debug("getMeetingMinutesById() called - id: {}", id);
        MeetingsMinutes report = meetingMinutesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("회의록을 찾을 수 없습니다. ID: " + id));
        log.debug("MeetingsMinutes found - id: {}", report.getId());

        MeetingMinutesDTO dto = meetingMinutesMapper.toDTO(report);
        // User 정보 조회 및 설정
        userRepository.findById(report.getUserIdx()).ifPresent(user -> {
            dto.setUserName(user.getEmpName());
            dto.setUserDept(user.getEmpDept());
            // 부서 이름 조회
            if (user.getEmpDept() != null) {
                codeRepository.findByCode(user.getEmpDept()).ifPresent(code -> {
                    dto.setUserDeptName(code.getCodeName());
                });
            }
        });

        return dto;
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

    @Override
    @Transactional
    public void deleteMeetingMinutes(Long id) {
        log.debug("deleteMeetingMinutes() called - id: {}", id);

        // 존재 여부 확인
        if (!meetingMinutesRepository.existsById(id)) {
            throw new RuntimeException("회의록을 찾을 수 없습니다. ID: " + id);
        }

        meetingMinutesRepository.deleteById(id);
        log.debug("MeetingsMinutes deleted successfully - id: {}", id);
    }
}
