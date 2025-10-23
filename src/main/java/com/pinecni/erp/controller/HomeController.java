package com.pinecni.erp.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

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
        return "approval-write";
    }

    @GetMapping("/approval/receipt")
    public String approvalReceipt() {
        return "approval_receipt";
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

    @GetMapping("/approval/monthly-report")
    public String approvalMonthlyReport() {
        return "approval_monthly_report";
    }

    @GetMapping("/approval/meeting")
    public String approvalMeeting() {
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

    @GetMapping("/basic-info")
    public String basicInfo() {
        return "basic-info";
    }

    @GetMapping("/login")
    public String login() {
        return "login";
    }
}
