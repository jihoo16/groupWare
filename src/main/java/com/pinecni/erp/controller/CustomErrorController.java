package com.pinecni.erp.controller;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * 커스텀 에러 컨트롤러
 * - Spring Boot의 기본 Whitelabel Error Page를 대체
 * - 모든 에러를 커스텀 페이지로 처리
 */
@Slf4j
@Controller
public class CustomErrorController implements ErrorController {

    @RequestMapping("/error")
    public String handleError(HttpServletRequest request) {
        Object status = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);

        if (status != null) {
            int statusCode = Integer.parseInt(status.toString());

            // 404 Not Found - 커스텀 404 페이지로 리다이렉트
            if (statusCode == HttpStatus.NOT_FOUND.value()) {
                String requestUri = (String) request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
                log.warn("404 Not Found: {}", requestUri);
                return "redirect:/oops";
            }
            // 403 Forbidden - 커스텀 403 페이지로 리다이렉트
            else if (statusCode == HttpStatus.FORBIDDEN.value()) {
                String requestUri = (String) request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
                log.warn("403 Forbidden: {}", requestUri);
                return "redirect:/nope";
            }
            // 500 Internal Server Error - 커스텀 500 페이지로 리다이렉트
            else if (statusCode == HttpStatus.INTERNAL_SERVER_ERROR.value()) {
                String requestUri = (String) request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
                Throwable exception = (Throwable) request.getAttribute(RequestDispatcher.ERROR_EXCEPTION);
                log.error("500 Internal Server Error: {} - {}", requestUri,
                    exception != null ? exception.getMessage() : "Unknown error");
                return "redirect:/boom";
            }
        }

        // 기타 모든 에러 - 커스텀 404 페이지로 리다이렉트
        log.error("Unexpected error occurred");
        return "redirect:/oops";
    }
}
