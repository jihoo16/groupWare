package com.pinecni.erp.api.document.controller;

import com.pinecni.erp.api.document.service.ReceiptCommonService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 연구비증빙 공통 Controller
 * 회의록, 야근식대, 출장, 출장+회의 등 모든 문서에서 공통으로 사용하는 API
 */
@Slf4j
@RestController
@RequestMapping("/api/receipt-common")
@RequiredArgsConstructor
public class ReceiptCommonController {

    private final ReceiptCommonService receiptCommonService;

    /**
     * 통합 참석자 중복 검증 API
     * 같은 프로젝트, 같은 날짜에서 시간대 겹침 확인 (카드 무관)
     * 모든 문서 타입(회의록, 야근식대, 출장, 출장+회의) 대상
     *
     * @param date 검증할 날짜 (yyyy-MM-dd)
     * @param attendeeIdx 참석자 IDX
     * @param projectIdx 프로젝트 IDX
     * @param startTime 시작 시간 (HH:mm) - 선택
     * @param endTime 종료 시간 (HH:mm) - 선택
     * @param excludeReceiptIdx 제외할 문서 IDX (수정 시)
     * @param excludeDocumentType 제외할 문서 타입 (RCM/RCO/RCT/RCTM)
     * @param isExternal 외부 인력 여부 (기본: false)
     * @return 중복 문서 목록
     */
    @GetMapping("/check-duplicate")
    public ResponseEntity<List<Map<String, Object>>> checkDuplicateAttendee(
            @RequestParam String date,
            @RequestParam Long attendeeIdx,
            @RequestParam Long projectIdx,
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime,
            @RequestParam(required = false) Long excludeReceiptIdx,
            @RequestParam(required = false) String excludeDocumentType,
            @RequestParam(required = false, defaultValue = "false") Boolean isExternal) {

        log.debug("통합 중복 검증 요청 - date: {}, attendeeIdx: {}, projectIdx: {}, time: {} ~ {}",
                date, attendeeIdx, projectIdx, startTime, endTime);

        List<Map<String, Object>> duplicates = receiptCommonService.checkDuplicateAttendee(
                date, attendeeIdx, projectIdx,
                startTime, endTime,
                excludeReceiptIdx, excludeDocumentType,
                isExternal);

        return ResponseEntity.ok(duplicates);
    }
}
