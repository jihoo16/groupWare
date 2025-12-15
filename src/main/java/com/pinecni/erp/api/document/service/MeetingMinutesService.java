package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.MeetingMinutesCreateDTO;
import com.pinecni.erp.api.document.dto.MeetingMinutesDTO;

import java.util.List;

public interface MeetingMinutesService {

    /**
     *  회의록 생성
     */
    MeetingMinutesDTO createMeetingMinute(MeetingMinutesCreateDTO createDTO);
    /**
     *  회의록 조회
     */
    List<MeetingMinutesDTO> getAllMeetingMinutes();
    /**
     *  회의록 상세 조회
     */
    MeetingMinutesDTO getMeetingMinutesById(Long meetingId);
}
