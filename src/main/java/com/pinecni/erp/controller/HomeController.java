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

    @GetMapping("/mail")
    public String mail() {
        return "mail";
    }

    @GetMapping("/approval")
    public String approval() {
        return "approval";
    }

    @GetMapping("/approval/write")
    public String approvalWrite() {
        return "approval-write";
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

    @GetMapping("/receipt")
    public String receipt() {
        return "receipt";
    }

    @GetMapping("/board")
    public String board() {
        return "board";
    }
}
