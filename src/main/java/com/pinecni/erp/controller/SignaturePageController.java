package com.pinecni.erp.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * 전자서명 모바일 페이지 라우팅 (세션 인증 불필요)
 *
 * <p>QR 스캔 시 진입하는 페이지. 토큰만으로 접근 가능 (WebMvcConfig에 /sign/** 예외 등록됨).
 */
@Slf4j
@Controller
public class SignaturePageController {

    /**
     * 모바일 서명 페이지
     * URL: /sign/{session_token}
     *
     * 템플릿은 JS에서 /api/signature/session/by-token/{token} 호출해서
     * 문서 정보 + 서명자 이름(마스킹) 로드.
     */
    @GetMapping("/sign/{token}")
    public String signaturePage(@PathVariable String token, Model model) {
        log.debug("모바일 서명 페이지 진입: token={}", token);
        model.addAttribute("sessionToken", token);
        return "signature";
    }
}
