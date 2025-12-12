package com.pinecni.erp.api.document.controller;

import com.pinecni.erp.api.document.dto.MeetingMinutesCreateDTO;
import com.pinecni.erp.api.document.dto.MeetingMinutesDTO;
import com.pinecni.erp.api.document.service.MeetingMinutesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/document/meeting-minutes")
@RequiredArgsConstructor
public class MeetingMinutesController {

    private final MeetingMinutesService meetingMinutesService;

    @PostMapping
    public ResponseEntity<MeetingMinutesDTO> createMeetingMinutes(@Valid @RequestBody MeetingMinutesCreateDTO createDTO) {
        log.debug("POST /api/document/meeting-minutes/");

        MeetingMinutesDTO created = meetingMinutesService.createMeetingMinute(createDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

}
