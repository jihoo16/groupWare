package com.pinecni.erp.controller;

import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Slf4j
@org.springframework.stereotype.Controller
public class Controller {

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
    public String calendarEdit() {
        return "calendar-edit";
    }

    @GetMapping("/calendar/new")
    public String calendarNew() {
        return "calendar-new";
    }

    @GetMapping("/messenger")
    public String messenger() {
        return "messenger";
    }

    @GetMapping("/approval")
    public String approval() {
        return "approval";
    }

    @GetMapping("/hr")
    public String hr() {
        return "hr";
    }

    @GetMapping("/attendance")
    public String attendance() {
        return "attendance";
    }

    @GetMapping("/payroll")
    public String payroll() {
        return "payroll";
    }

    @GetMapping("/settings")
    public String settings() {
        return "settings";
    }

    @GetMapping("/cloud")
    public String cloud() {
        return "cloud";
    }

    @GetMapping("/board")
    public String board() {
        return "board";
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

    // 지출
    @GetMapping("/approval/expense")
    public String approvalExpense() {
        return "approval_expense";
    }

    @GetMapping("/approval/purchase")
    public String approvalPurchase() {
        return "approval_purchase";
    }

    // 보고
    @GetMapping("/approval/weekly-report")
    public String approvalWeeklyReport() {
        return "approval_weekly_report";
    }

    @GetMapping("/approval/weekly-report/detail")
    public String approvalWeeklyReportDetail() {
        return "approval_weekly_report_detail";
    }

    @GetMapping("/approval/monthly-report")
    public String approvalMonthlyReport() {
        return "approval_monthly_report";
    }

    @GetMapping("/approval/monthly-report/detail")
    public String approvalMonthlyReportDetail() {
        return "approval_monthly_report_detail";
    }

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

    @GetMapping("/approval/general")
    public String approvalGeneral() {
        return "approval_general";
    }

    // 출장
    @GetMapping("/approval/business-trip")
    public String approvalBusinessTrip() {
        return "approval_business_trip";
    }

    @GetMapping("/approval/trip-report")
    public String approvalTripReport() {
        return "approval_trip_report";
    }

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

    @GetMapping("/project/edit/{id}")
    public String projectEdit() {
        return "project-edit";
    }

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
}
