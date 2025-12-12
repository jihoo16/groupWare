package com.pinecni.erp.api.document.service;

import com.pinecni.erp.api.document.dto.MeetingMinutesCreateDTO;
import com.pinecni.erp.api.document.dto.MeetingMinutesDTO;

public interface MeetingMinutesService {

    /**
     *  회의록 생성
     */
    MeetingMinutesDTO createMeetingMinute(MeetingMinutesCreateDTO createDTO);
}
