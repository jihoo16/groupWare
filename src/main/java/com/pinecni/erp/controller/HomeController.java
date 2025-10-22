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
}
