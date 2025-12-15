package com.pinecni.erp.api.document.controller;

import com.pinecni.erp.api.auth.dto.LoginResponseDTO;
import com.pinecni.erp.api.document.dto.MeetingMinutesCreateDTO;
import com.pinecni.erp.api.document.dto.MeetingMinutesDTO;
import com.pinecni.erp.api.document.dto.MeetingMinutesUpdateDTO;
import com.pinecni.erp.api.document.service.MeetingMinutesService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/document/meeting-minutes")
@RequiredArgsConstructor
public class MeetingMinutesController {

    private final MeetingMinutesService meetingMinutesService;

    /**
     * 회의록 생성
     * POST
     */
    @PostMapping
    public ResponseEntity<MeetingMinutesDTO> createMeetingMinutes(
            @Valid @RequestBody MeetingMinutesCreateDTO createDTO) {
        log.debug("POST /api/document/meeting-minutes/");

        MeetingMinutesDTO created = meetingMinutesService.createMeetingMinute(createDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * 회의록 목록 조회
     * GET
     */
    @GetMapping
    public ResponseEntity<List<MeetingMinutesDTO>> getMeetingMinutes(){
        log.debug("GET /api/document/meeting-minutes/");

        List<MeetingMinutesDTO> reports = meetingMinutesService.getAllMeetingMinutes();
        return ResponseEntity.ok(reports);
    }
    /**
     * 회의록 목록 상세 조회
     * GET
     */
    @GetMapping("/{id}")
    public ResponseEntity<MeetingMinutesDTO> getMeetingMinutesById(@PathVariable Long id) {
        log.debug("GET /api/document/meeting-minutes/{}",id);
        MeetingMinutesDTO report = meetingMinutesService.getMeetingMinutesById(id);
        return ResponseEntity.ok(report);
    }

    /**
     * 회의록 수정
     * PUT /api/document/meeting-minutes/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<MeetingMinutesDTO> updateMeetingMinutes(
            @PathVariable Long id,
            @Valid @RequestBody MeetingMinutesUpdateDTO updateDTO,
            HttpSession session) {
        log.debug("PUT /api/document/meeting-minutes/{}", id);

        // 세션에서 로그인한 사용자 IDX 가져오기
        Long updatedUserIdx = (Long) session.getAttribute("userIdx");
        if (updatedUserIdx == null) {
            updatedUserIdx = 1L; // 기본값 (로그인 안된 경우)
        }

        log.debug("Updated by userIdx: {}", updatedUserIdx);

        MeetingMinutesDTO updated = meetingMinutesService.updateMeetingMinutes(id, updateDTO, updatedUserIdx);
        return ResponseEntity.ok(updated);
    }

}
