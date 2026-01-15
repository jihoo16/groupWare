package com.pinecni.erp.service;

import com.microsoft.playwright.*;
import com.microsoft.playwright.options.Media;
import com.microsoft.playwright.options.Margin;
import com.microsoft.playwright.options.WaitUntilState;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * Playwright를 사용한 PDF 생성 서비스
 * Chrome headless 브라우저로 HTML을 렌더링하여 화면과 동일한 PDF 생성
 * 동시성 제어: Semaphore를 통해 동시 PDF 생성 수 제한
 */
@Service
@Slf4j
public class PlaywrightPdfService {

    private Playwright playwright;
    private Browser browser;

    @Value("${pdf.generation.max-concurrent:2}")
    private int maxConcurrentGenerations;

    @Value("${pdf.generation.timeout-seconds:30}")
    private int timeoutSeconds;

    private Semaphore pdfGenerationSemaphore;

    /**
     * Playwright 초기화 (서비스 시작 시 한번만 실행)
     */
    @PostConstruct
    public void init() {
        try {
            log.info("[Playwright PDF Service] 초기화 시작...");

            // Semaphore 초기화 (동시 PDF 생성 수 제한)
            pdfGenerationSemaphore = new Semaphore(maxConcurrentGenerations, true);
            log.info("[Playwright PDF Service] Semaphore 초기화 완료 - 최대 동시 생성 수: {}", maxConcurrentGenerations);

            playwright = Playwright.create();

            // Chromium 브라우저 시작 (headless 모드)
            browser = playwright.chromium().launch(new BrowserType.LaunchOptions()
                    .setHeadless(true)
                    .setArgs(java.util.Arrays.asList(
                            "--disable-gpu",
                            "--no-sandbox",
                            "--disable-dev-shm-usage",
                            "--disable-setuid-sandbox"
                    ))
            );

            log.info("[Playwright PDF Service] 초기화 완료 - Chromium 브라우저 준비됨");
        } catch (Exception e) {
            log.error("[Playwright PDF Service] 초기화 실패", e);
            throw new RuntimeException("Playwright 초기화 실패. 브라우저를 설치해주세요: mvn exec:java -e -D exec.mainClass=com.microsoft.playwright.CLI -D exec.args=\"install chromium\"", e);
        }
    }

    /**
     * Playwright 종료 (서비스 종료 시)
     */
    @PreDestroy
    public void destroy() {
        if (browser != null) {
            browser.close();
            log.info("[Playwright PDF Service] 브라우저 종료");
        }
        if (playwright != null) {
            playwright.close();
            log.info("[Playwright PDF Service] Playwright 종료");
        }
    }

    /**
     * HTML 문자열을 PDF로 변환
     *
     * @param htmlContent HTML 문자열
     * @return PDF 바이트 배열
     */
    public byte[] convertHtmlToPdf(String htmlContent) throws Exception {
        return convertHtmlToPdf(htmlContent, new PdfOptions());
    }

    /**
     * URL을 직접 접속하여 PDF로 변환 (JavaScript 실행 포함)
     *
     * @param url 접속할 URL
     * @return PDF 바이트 배열
     */
    public byte[] convertUrlToPdf(String url) throws Exception {
        return convertUrlToPdf(url, new PdfOptions());
    }

    /**
     * URL을 직접 접속하여 PDF로 변환 (옵션 지정 가능)
     *
     * @param url 접속할 URL
     * @param pdfOptions PDF 생성 옵션
     * @return PDF 바이트 배열
     */
    public byte[] convertUrlToPdf(String url, PdfOptions pdfOptions) throws Exception {
        if (browser == null) {
            throw new IllegalStateException("Playwright 브라우저가 초기화되지 않았습니다.");
        }

        // Semaphore를 통한 동시성 제어
        boolean acquired = false;
        try {
            log.info("[Playwright PDF] PDF 생성 대기 중... (사용 가능한 슬롯 대기)");
            acquired = pdfGenerationSemaphore.tryAcquire(timeoutSeconds, TimeUnit.SECONDS);

            if (!acquired) {
                throw new Exception("PDF 생성 요청이 너무 많습니다. " + timeoutSeconds + "초 후 다시 시도해주세요.");
            }

            log.info("[Playwright PDF] PDF 생성 시작 (현재 사용 중: {}/{})",
                    maxConcurrentGenerations - pdfGenerationSemaphore.availablePermits(),
                    maxConcurrentGenerations);

            return generatePdfFromUrl(url, pdfOptions);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new Exception("PDF 생성 요청이 중단되었습니다.", e);
        } finally {
            if (acquired) {
                pdfGenerationSemaphore.release();
                log.info("[Playwright PDF] PDF 생성 완료, 슬롯 반환 (사용 가능: {}/{})",
                        pdfGenerationSemaphore.availablePermits(),
                        maxConcurrentGenerations);
            }
        }
    }

    /**
     * HTML 문자열을 PDF로 변환 (옵션 지정 가능)
     *
     * @param htmlContent HTML 문자열
     * @param pdfOptions  PDF 생성 옵션
     * @return PDF 바이트 배열
     */
    public byte[] convertHtmlToPdf(String htmlContent, PdfOptions pdfOptions) throws Exception {
        if (browser == null) {
            throw new IllegalStateException("Playwright 브라우저가 초기화되지 않았습니다.");
        }

        // Semaphore를 통한 동시성 제어
        boolean acquired = false;
        try {
            log.info("[Playwright PDF] PDF 생성 대기 중... (사용 가능한 슬롯 대기)");
            acquired = pdfGenerationSemaphore.tryAcquire(timeoutSeconds, TimeUnit.SECONDS);

            if (!acquired) {
                throw new Exception("PDF 생성 요청이 너무 많습니다. " + timeoutSeconds + "초 후 다시 시도해주세요.");
            }

            log.info("[Playwright PDF] PDF 생성 시작 (현재 사용 중: {}/{})",
                    maxConcurrentGenerations - pdfGenerationSemaphore.availablePermits(),
                    maxConcurrentGenerations);

            return generatePdfInternal(htmlContent, pdfOptions);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new Exception("PDF 생성 요청이 중단되었습니다.", e);
        } finally {
            if (acquired) {
                pdfGenerationSemaphore.release();
                log.info("[Playwright PDF] PDF 생성 완료, 슬롯 반환 (사용 가능: {}/{})",
                        pdfGenerationSemaphore.availablePermits(),
                        maxConcurrentGenerations);
            }
        }
    }

    /**
     * URL 접속 후 PDF 생성 (내부 메서드)
     */
    private byte[] generatePdfFromUrl(String url, PdfOptions pdfOptions) throws Exception {
        BrowserContext context = null;
        Page page = null;

        try {
            // 새 브라우저 컨텍스트 생성
            context = browser.newContext(new Browser.NewContextOptions()
                    .setViewportSize(1920, 1080)
            );

            // 새 페이지 생성
            page = context.newPage();

            // 인쇄 미디어 타입 설정 (CSS @media print 적용)
            page.emulateMedia(new Page.EmulateMediaOptions()
                    .setMedia(Media.PRINT)
            );

            log.info("[Playwright PDF] URL 접속 시작: {}", url);

            // URL 직접 접속 (JavaScript 실행됨)
            page.navigate(url, new Page.NavigateOptions()
                    .setWaitUntil(WaitUntilState.NETWORKIDLE)
                    .setTimeout(30000)
            );

            log.info("[Playwright PDF] 페이지 로딩 완료");

            // 추가 대기 (JavaScript 실행 완료 대기)
            page.waitForTimeout(1000);

            log.info("[Playwright PDF] JavaScript 실행 완료");

            // PDF 생성 옵션 설정
            Page.PdfOptions options = new Page.PdfOptions()
                    .setFormat(pdfOptions.getFormat())
                    .setPrintBackground(pdfOptions.isPrintBackground())
                    .setDisplayHeaderFooter(false)
                    .setPreferCSSPageSize(false);

            // 여백 설정
            if (pdfOptions.getMargin() != null) {
                options.setMargin(pdfOptions.getMargin());
            }

            // PDF 생성
            byte[] pdfBytes = page.pdf(options);

            log.info("[Playwright PDF] PDF 생성 완료 - 크기: {} bytes", pdfBytes.length);

            return pdfBytes;

        } catch (Exception e) {
            log.error("[Playwright PDF] PDF 생성 중 오류 발생", e);
            throw new Exception("PDF 생성 실패: " + e.getMessage(), e);
        } finally {
            // 리소스 정리
            if (page != null) {
                page.close();
            }
            if (context != null) {
                context.close();
            }
        }
    }

    /**
     * 실제 PDF 생성 로직 (내부 메서드)
     */
    private byte[] generatePdfInternal(String htmlContent, PdfOptions pdfOptions) throws Exception {
        BrowserContext context = null;
        Page page = null;

        try {
            // 새 브라우저 컨텍스트 생성
            context = browser.newContext(new Browser.NewContextOptions()
                    .setViewportSize(1920, 1080)
            );

            // 새 페이지 생성
            page = context.newPage();

            // 인쇄 미디어 타입 설정 (CSS @media print 적용)
            page.emulateMedia(new Page.EmulateMediaOptions()
                    .setMedia(Media.PRINT)
            );

            // HTML 콘텐츠 설정 (baseURL 지정으로 상대 경로 리소스 로드 가능)
            page.setContent(htmlContent, new Page.SetContentOptions()
                    .setWaitUntil(WaitUntilState.NETWORKIDLE)
            );

            // CSS 파일 로드 대기 (네트워크 안정화)
            try {
                page.waitForLoadState(com.microsoft.playwright.options.LoadState.NETWORKIDLE);
            } catch (Exception e) {
                log.warn("[Playwright PDF] 네트워크 안정화 대기 타임아웃 (무시하고 계속): {}", e.getMessage());
            }

            log.info("[Playwright PDF] HTML 렌더링 완료");

            // PDF 생성 옵션 설정
            Page.PdfOptions options = new Page.PdfOptions()
                    .setFormat(pdfOptions.getFormat())
                    .setPrintBackground(pdfOptions.isPrintBackground())
                    .setDisplayHeaderFooter(false)
                    .setPreferCSSPageSize(false);

            // 여백 설정
            if (pdfOptions.getMargin() != null) {
                options.setMargin(pdfOptions.getMargin());
            }

            // PDF 생성
            byte[] pdfBytes = page.pdf(options);

            log.info("[Playwright PDF] PDF 생성 완료 - 크기: {} bytes", pdfBytes.length);

            return pdfBytes;

        } catch (Exception e) {
            log.error("[Playwright PDF] PDF 생성 중 오류 발생", e);
            throw new Exception("PDF 생성 실패: " + e.getMessage(), e);
        } finally {
            // 리소스 정리
            if (page != null) {
                page.close();
            }
            if (context != null) {
                context.close();
            }
        }
    }

    /**
     * PDF 생성 옵션 클래스
     */
    public static class PdfOptions {
        private String format = "A4";
        private boolean printBackground = true;
        private Margin margin;

        public PdfOptions() {
            // 기본 여백: 1.5cm
            this.margin = new Margin()
                    .setTop("1.5cm")
                    .setRight("1.5cm")
                    .setBottom("1.5cm")
                    .setLeft("1.5cm");
        }

        public String getFormat() {
            return format;
        }

        public PdfOptions setFormat(String format) {
            this.format = format;
            return this;
        }

        public boolean isPrintBackground() {
            return printBackground;
        }

        public PdfOptions setPrintBackground(boolean printBackground) {
            this.printBackground = printBackground;
            return this;
        }

        public Margin getMargin() {
            return margin;
        }

        public PdfOptions setMargin(Margin margin) {
            this.margin = margin;
            return this;
        }
    }
}
