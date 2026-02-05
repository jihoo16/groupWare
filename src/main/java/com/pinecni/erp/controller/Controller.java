package com.pinecni.erp.controller;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.calendar.service.CalendarEventService;
import com.pinecni.erp.entity.ApprovalDocument;
import com.pinecni.erp.util.AuthorizationUtil;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Slf4j
@org.springframework.stereotype.Controller
@RequiredArgsConstructor
public class Controller {

    private final CalendarEventService calendarEventService;
    private final ApprovalDocumentRepository approvalDocumentRepository;

    @GetMapping("/")
    public String root() {
        return "redirect:/home";
    }

    @GetMapping("/home")
    public String home() {
        return "home";
    }

    @GetMapping("/organization")
    public String organization() {
        return "organization";
    }

    @GetMapping("/vacation")
    public String vacation() {
        return "vacation";
    }

    @GetMapping("/calendar")
    public String calendar() {
        return "calendar";
    }

    @GetMapping("/calendar/edit")
    public String calendarEdit(@RequestParam(required = false) Long id, HttpSession session) {
        // id가 없으면 잘못된 접근 - oops 페이지로
        if (id == null) {
            log.warn("일정 수정 페이지 접근 시 id 누락");
            return "redirect:/oops";
        }

        // 현재 로그인한 사용자 정보
        Long currentUserIdx = (Long) session.getAttribute("userIdx");
        if (currentUserIdx == null) {
            log.warn("로그인하지 않은 사용자의 일정 수정 시도");
            return "redirect:/login";
        }

        try {
            // 일정 타입 확인
            var event = calendarEventService.getEventById(id);

            // 일정이 존재하지 않으면 oops 페이지로
            if (event == null) {
                log.warn("존재하지 않는 일정 수정 시도: id={}", id);
                return "redirect:/oops";
            }

            // 연차/휴가 일정은 수정 불가 - oops 페이지로 리다이렉트
            if ("leave".equals(event.getEventType())) {
                log.info("연차/휴가 일정 수정 시도 차단: id={}", id);
                return "redirect:/oops";
            }

            // 본인이 생성한 일정이 아니면 수정 불가
            if (event.getCreatorIdx() != null && !event.getCreatorIdx().equals(currentUserIdx)) {
                log.warn("다른 사용자의 일정 수정 시도: eventId={}, creatorIdx={}, currentUserIdx={}",
                    id, event.getCreatorIdx(), currentUserIdx);
                return "redirect:/oops";
            }
        } catch (Exception e) {
            log.error("일정 조회 중 오류 발생: id={}, error={}", id, e.getMessage());
            return "redirect:/oops";
        }

        return "calendar-edit";
    }

    @GetMapping("/calendar/new")
    public String calendarNew() {
        return "calendar-new";
    }

    @GetMapping("/approval")
    public String approval() {
        return "approval";
    }

    @GetMapping("/hr")
    public String hr() {
        return "hr";
    }

    // 근태 관리 - 추후 구현 예정
    /*
    @GetMapping("/attendance")
    public String attendance() {
        return "attendance";
    }
    */

    @GetMapping("/settings")
    public String settings() {
        return "settings";
    }

    @GetMapping("/approval/write")
    public String approvalWrite() {
        return "approval_vacation";
    }

    // 연구비증빙
    @GetMapping("/approval/receipt-meeting")
    public String approvalReceiptMeeting() {
        return "approval_receipt_meeting";
    }

    @GetMapping("/approval/receipt-trip")
    public String approvalReceiptTrip() {
        return "approval_receipt_trip";
    }

    @GetMapping("/approval/receipt-trip-meeting")
    public String approvalReceiptTripMeeting() {
        return "approval_receipt_trip_meeting";
    }

    @GetMapping("/approval/receipt-overtime")
    public String approvalReceiptOvertime() {
        return "approval_receipt_overtime";
    }

    // 인사
    @GetMapping("/approval/vacation")
    public String approvalVacation() {
        return "approval_vacation";
    }

    /**
     * 연차신청서 상세보기 페이지
     * - 작성자만 접근 가능
     */
    @GetMapping("/approval/vacation/detail")
    public String approvalVacationDetail(@RequestParam Long documentIdx, HttpSession session) {
        // 세션에서 현재 로그인한 사용자 IDX 조회
        Long currentUserIdx = (Long) session.getAttribute("userIdx");

        // 문서 조회
        ApprovalDocument document = approvalDocumentRepository.findById(documentIdx)
                .orElse(null);

        // 권한 체크: 작성자가 아니면 UnauthorizedException 발생 -> 404 페이지로 리다이렉트
        AuthorizationUtil.validateDocumentOwner(currentUserIdx, document);

        return "approval_vacation_detail";
    }

    /**
     * 연차신청서 PDF 미리보기 (Playwright용)
     * JavaScript가 실행되는 완전한 페이지
     */
    @GetMapping("/approval/vacation/pdf-preview/{documentId}")
    public String vacationPdfPreview(@org.springframework.web.bind.annotation.PathVariable Long documentId, Model model) {
        log.info("[PDF 미리보기] 문서 ID: {}", documentId);
        model.addAttribute("documentId", documentId);
        model.addAttribute("pdfPreviewMode", true);
        return "approval_vacation";
    }

    // 지출 - 추후 구현 예정
    /*
    @GetMapping("/approval/expense")
    public String approvalExpense() {
        return "approval_expense";
    }

    @GetMapping("/approval/purchase")
    public String approvalPurchase() {
        return "approval_purchase";
    }
    */

    // 보고 - 추후 구현 예정 (주간업무보고, 월간업무보고, 회의록 작성)
    /*
    @GetMapping("/approval/weekly-report")
    public String approvalWeeklyReport() {
        return "approval_weekly_report";
    }
    */

    @GetMapping("/approval/weekly-report/detail")
    public String approvalWeeklyReportDetail() {
        return "approval_weekly_report_detail";
    }

    @GetMapping("/approval/project-weekly-report")
    public String approvalProjectWeeklyReport() {
        return "approval_project_weekly_report";
    }

    @GetMapping("/approval/project-weekly-report/detail")
    public String approvalProjectWeeklyReportDetail() {
        return "approval_project_weekly_report_detail";
    }

    /*
    @GetMapping("/approval/monthly-report")
    public String approvalMonthlyReport() {
        return "approval_monthly_report";
    }
    */

    @GetMapping("/approval/monthly-report/detail")
    public String approvalMonthlyReportDetail() {
        return "approval_monthly_report_detail";
    }

    /*
    @GetMapping("/approval/meeting")
    public String approvalMeeting(Model model, HttpSession session) {
        // 세션에서 사용자 이름 가져오기
        String empName = (String) session.getAttribute("empName");
        Long userIdxLong = (Long) session.getAttribute("userIdx");
        String userIdx = userIdxLong != null ? userIdxLong.toString() : "";
        log.debug(userIdx);
        model.addAttribute("userName", empName != null ? empName : "");
        model.addAttribute("userIdx", userIdx);
        return "approval_meeting";
    }
    */

    @GetMapping("/approval/meeting/detail")
    public String approvalMeetingDetail(Model model, HttpSession session) {
        // 세션에서 사용자 정보 가져오기
        Long userIdxLong = (Long) session.getAttribute("userIdx");
        String userIdx = userIdxLong != null ? userIdxLong.toString() : "";

        model.addAttribute("userIdx", userIdx);
        return "approval_meeting_detail";
    }

    /*
    @GetMapping("/approval/general")
    public String approvalGeneral() {
        return "approval_general";
    }
    */

    // 출장 - 추후 구현 예정
    /*
    @GetMapping("/approval/business-trip")
    public String approvalBusinessTrip() {
        return "approval_business_trip";
    }

    @GetMapping("/approval/trip-report")
    public String approvalTripReport() {
        return "approval_trip_report";
    }
    */

    @GetMapping("/project")
    public String project() {
        return "project";
    }

    @GetMapping("/project/new")
    public String projectNew() {
        return "project-new";
    }

    @GetMapping("/project/card")
    public String projectCard() {
        return "project-card";
    }

    @GetMapping("/project/documents")
    public String projectDocuments() {
        return "project-documents";
    }

    @GetMapping("/project/edit/{id}")
    public String projectEdit() {
        return "project-edit";
    }

    @GetMapping("/project/detail")
    public String projectDetail() {
        return "project-detail";
    }

    // 팀 관리 - 추후 구현 예정
    /*
    @GetMapping("/team")
    public String team() {
        return "team";
    }

    @GetMapping("/team/new")
    public String teamNew() {
        return "team-new";
    }

    @GetMapping("/team/edit/{id}")
    public String teamEdit() {
        return "team-edit";
    }
    */

    @GetMapping("/basic-info")
    public String basicInfo() {
        return "basic-info";
    }

    @GetMapping("/basic-info/code-detail")
    public String codeDetail() {
        return "code-detail";
    }

    @GetMapping("/manage-hierarchy")
    public String manageHierarchy() {
        return "manage-hierarchy";
    }

    @GetMapping("/external-person")
    public String externalPerson() {
        return "external-person";
    }

    @GetMapping("/login")
    public String login() {
        return "login";
    }

    @GetMapping("/change-password")
    public String changePassword(HttpSession session) {
        // 로그인 확인
        Long userIdx = (Long) session.getAttribute("userIdx");
        if (userIdx == null) {
            return "redirect:/login";
        }
        return "change-password";
    }

    @GetMapping("/oops")
    public String notFound() {
        return "404";
    }

    @GetMapping("/deleted")
    public String deleted() {
        return "deleted";
    }

    @GetMapping("/error/403")
    public String forbidden() {
        return "403";
    }

    @GetMapping("/error/500")
    public String serverError() {
        return "500";
    }
}
