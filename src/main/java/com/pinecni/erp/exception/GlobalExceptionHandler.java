package com.pinecni.erp.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.ModelAndView;

/**
 * 전역 예외 핸들러
 * - UnauthorizedException 발생 시 404 페이지로 리다이렉트
 */
@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    /**
     * UnauthorizedException 처리
     * - 404 페이지로 리다이렉트
     */
    @ExceptionHandler(UnauthorizedException.class)
    public ModelAndView handleUnauthorizedException(UnauthorizedException ex) {
        log.warn("UnauthorizedException 발생: {}", ex.getMessage());

        // 404 페이지로 리다이렉트
        ModelAndView mav = new ModelAndView();
        mav.setViewName("redirect:/oops");
        return mav;
    }

    /**
     * IllegalArgumentException 처리 (선택)
     * - 잘못된 요청 파라미터 등에 대해서도 404 처리
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ModelAndView handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("IllegalArgumentException 발생: {}", ex.getMessage());

        // 404 페이지로 리다이렉트
        ModelAndView mav = new ModelAndView();
        mav.setViewName("redirect:/oops");
        return mav;
    }
}
