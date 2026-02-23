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

import java.io.File;
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

    @Value("${pdf.playwright.ws-endpoint:}")
    private String wsEndpoint;

    @Value("${pdf.playwright.node-path:/usr/sbin/node}")
    private String nodePath;

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

            // 1. 성능 최적화: 시스템 Node 사용 설정 (유효한 경로인 경우에만)
            if (nodePath != null && !nodePath.isEmpty()) {
                File nodeFile = new File(nodePath);
                if (nodeFile.exists() && nodeFile.canExecute()) {
                    System.setProperty("playwright.nodejs.path", nodePath);
                    log.info("[Playwright PDF Service] 시스템 Node 사용 설정: {}", nodePath);
                } else {
                    log.warn("[Playwright PDF Service] 설정된 Node 경로가 유효하지 않아 내장 Node를 사용합니다. (설정된 경로: {})", nodePath);
                }
            }

            connectBrowser();

            log.info("[Playwright PDF Service] 초기화 완료 - Chromium 브라우저 준비됨");
        } catch (Exception e) {
            log.error("[Playwright PDF Service] 초기화 실패", e);
            throw new RuntimeException("Playwright 초기화 실패. 브라우저를 설치해주세요: mvn exec:java -e -D exec.mainClass=com.microsoft.playwright.CLI -D exec.args=\"install chromium\"", e);
        }
    }

    /**
     * 브라우저 연결(또는 재연결)을 수행합니다.
     */
    private synchronized void connectBrowser() {
        if (browser != null && browser.isConnected()) {
            return;
        }

        log.info("[Playwright PDF Service] 브라우저 연결을 시도합니다...");

        try {
            if (browser != null) {
                try { browser.close(); } catch (Exception ignored) {}
            }
            if (playwright != null) {
                try { playwright.close(); } catch (Exception ignored) {}
            }

            playwright = Playwright.create();

            if (wsEndpoint != null && !wsEndpoint.isEmpty()) {
                log.info("[Playwright PDF Service] 원격 브라우저 연결 시도: {}", wsEndpoint);
                try {
                    browser = playwright.chromium().connect(wsEndpoint);
                    log.info("[Playwright PDF Service] 원격 브라우저 연결 성공");
                    browser.onDisconnected(b -> {
                        log.error("[Playwright PDF] 브라우저 disconnected - Chromium/driver가 종료됨");
                    });
                } catch (Exception e) {
                    log.error("[Playwright PDF Service] 원격 연결 실패, 로컬 모드로 전환합니다.", e);
                    launchLocalBrowser();
                }
            } else {
                launchLocalBrowser();
            }
        } catch (Exception e) {
            log.error("[Playwright PDF Service] 브라우저 연결 실패", e);
            throw new RuntimeException("브라우저 연결 실패", e);
        }
    }

    /**
     * 강제로 브라우저 연결을 끊고 재연결합니다.
     */
    private synchronized void forceReconnectBrowser() {
        log.warn("[Playwright PDF Service] 브라우저를 강제로 재연결합니다...");
        if (browser != null) {
            try { browser.close(); } catch (Exception ignored) {}
        }
        if (playwright != null) {
            try { playwright.close(); } catch (Exception ignored) {}
        }
        browser = null;
        playwright = null;
        connectBrowser();
    }

    /**
     * 로컬 브라우저 실행 (Fallback 용)
     */
    private void launchLocalBrowser() {
        log.info("[Playwright PDF Service] 로컬 Chromium 브라우저 시작 중...");
        browser = playwright.chromium().launch(new BrowserType.LaunchOptions()
                .setHeadless(true)
                .setArgs(java.util.Arrays.asList(
                        "--disable-gpu",
                        "--no-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-setuid-sandbox"
                ))
        );
        log.info("[Playwright PDF Service] 로컬 브라우저 준비됨");
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

            connectBrowser(); // 브라우저 연결 상태를 확인하고 필요 시 재연결

            int maxRetries = 2; // 필요 시 최대 1회 재시도 (총 2회 시도)
            Exception lastException = null;

            for (int attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    if (attempt > 1) {
                        log.warn("[Playwright PDF] PDF 생성 재시도 ({} / {}) - 브라우저 강제 재연결 중...", attempt, maxRetries);
                        forceReconnectBrowser();
                    }
                    return generatePdfFromUrl(url, pdfOptions);
                } catch (Exception e) {
                    lastException = e;
                    String msg = e.getMessage() != null ? e.getMessage() : "";
                    String causeMsg = e.getCause() != null && e.getCause().getMessage() != null ? e.getCause().getMessage() : "";

                    if (msg.contains("TargetClosedError") || causeMsg.contains("TargetClosedError") ||
                        msg.contains("Browser has been closed") || causeMsg.contains("Browser has been closed") ||
                        msg.contains("Browser closed") || causeMsg.contains("Browser closed") ||
                        msg.contains("Target page, context or browser has been closed") || causeMsg.contains("Target page, context or browser has been closed")) {
                        log.warn("[Playwright PDF] 브라우저 종료/끊김 감지 -> 재기동 후 1회 재시도 (에러: {})", msg);
                        continue;
                    }
                    throw e; // 다른 예외는 즉시 발생
                }
            }
            throw new Exception("PDF 생성 최대 재시도 횟수를 초과했습니다: " + (lastException != null ? lastException.getMessage() : ""), lastException);

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

            connectBrowser(); // 브라우저 연결 상태를 확인하고 필요 시 재연결

            int maxRetries = 2; // 필요 시 최대 1회 재시도 (총 2회 시도)
            Exception lastException = null;

            for (int attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    if (attempt > 1) {
                        log.warn("[Playwright PDF] PDF 생성 재시도 ({} / {}) - 브라우저 강제 재연결 중...", attempt, maxRetries);
                        forceReconnectBrowser();
                    }
                    return generatePdfInternal(htmlContent, pdfOptions);
                } catch (Exception e) {
                    lastException = e;
                    String msg = e.getMessage() != null ? e.getMessage() : "";
                    String causeMsg = e.getCause() != null && e.getCause().getMessage() != null ? e.getCause().getMessage() : "";

                    if (msg.contains("TargetClosedError") || causeMsg.contains("TargetClosedError") ||
                        msg.contains("Browser has been closed") || causeMsg.contains("Browser has been closed") ||
                        msg.contains("Browser closed") || causeMsg.contains("Browser closed") ||
                        msg.contains("Target page, context or browser has been closed") || causeMsg.contains("Target page, context or browser has been closed")) {
                        log.warn("[Playwright PDF] 브라우저 종료/끊김 감지 -> 재기동 후 1회 재시도 (에러: {})", msg);
                        continue;
                    }
                    throw e; // 다른 예외는 즉시 발생
                }
            }
            throw new Exception("PDF 생성 최대 재시도 횟수를 초과했습니다: " + (lastException != null ? lastException.getMessage() : ""), lastException);

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

//            page.waitForFunction("() => document.fonts && document.fonts.status === 'loaded'");
//            log.info("[Playwright PDF] 웹폰트 로딩 완료");

            page.waitForFunction("() => document.fonts && document.fonts.check('16px NanumGothic', '한글')");
            log.info("[Playwright PDF] NanumGothic 체크 통과");

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

            // HTML 콘텐츠 설정 (baseURL 지정으로 정적 리소스 및 폰트 로드 가능)
            page.setContent(htmlContent, new Page.SetContentOptions()
                    .setWaitUntil(WaitUntilState.LOAD) // NETWORKIDLE -> LOAD 로 완화
                    .setTimeout(30000) // 15s -> 30s 로 증가
            );

            // CSS 파일 로드 대기 (기본 리소스 로딩 완료 대기)
            try {
                page.waitForLoadState(com.microsoft.playwright.options.LoadState.LOAD);
            } catch (Exception e) {
                log.warn("[Playwright PDF] 페이지 로드 대기 타임아웃 (무시하고 계속): {}", e.getMessage());
            }

            log.info("[Playwright PDF] HTML 렌더링 완료");

//            page.waitForFunction("() => document.fonts && document.fonts.status === 'loaded'");
//            log.info("[Playwright PDF] 웹폰트 로딩 완료");

            // 폰트 로딩 확인 (최대 3초 대기)
            try {
                page.waitForFunction("() => document.fonts && document.fonts.check('16px NanumGothic', '한글')",
                        null,
                        new Page.WaitForFunctionOptions().setTimeout(3000));
                log.info("[Playwright PDF] NanumGothic 로딩 확인됨");
            } catch (Exception e) {
                log.warn("[Playwright PDF] NanumGothic 로딩 시간 초과 또는 실패 (기본 폰트 사용): {}", e.getMessage());
            }

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
