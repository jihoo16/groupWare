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
import java.util.Arrays;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class PlaywrightPdfService {

    private final Object pwLock = new Object();
    /**
     * 브라우저가 정상 기동된 상태인지 추적.
     * true  = init() 성공 후 정상 동작 중
     * false = 초기화 전이거나 onDisconnected / 헬스체크 실패로 종료된 상태
     * synchronized(pwLock) 이 동시 재기동을 막으므로 쿨다운 타이머 불필요.
     */
    private volatile boolean browserReady = false;

    private Playwright playwright;
    private Browser browser;

    @Value("${pdf.generation.max-concurrent:2}")
    private int maxConcurrentGenerations;

    @Value("${pdf.generation.timeout-seconds:30}")
    private int timeoutSeconds;

    private Semaphore pdfGenerationSemaphore;

    @Value("${pdf.playwright.ws-endpoint:}")
    private String wsEndpoint;

    // Rocky에서 node는 보통 /usr/bin/node
    @Value("${pdf.playwright.node-path:}")
    private String nodePath;

    @PostConstruct
    public void init() {
        synchronized (pwLock) {
            browserReady = false; // 재기동 시작 전 플래그 리셋
            try {
                log.info("[Playwright PDF Service] 초기화 시작...");

                // Semaphore는 1번만 만들기 (재기동 시에도 유지)
                if (pdfGenerationSemaphore == null) {
                    pdfGenerationSemaphore = new Semaphore(maxConcurrentGenerations, true);
                    log.info("[Playwright PDF Service] Semaphore 초기화 완료 - 최대 동시 생성 수: {}", maxConcurrentGenerations);
                }

                // 시스템 Node 사용 (선택)
                if (nodePath != null && !nodePath.isBlank()) {
                    File nodeFile = new File(nodePath);
                    if (nodeFile.exists() && nodeFile.canExecute()) {
                        System.setProperty("playwright.nodejs.path", nodePath);
                        log.info("[Playwright PDF Service] 시스템 Node 사용 설정: {}", nodePath);
                    } else {
                        log.warn("[Playwright PDF Service] Node 경로가 유효하지 않아 내장 Node 사용. path={}", nodePath);
                    }
                }

                // 기존 리소스 정리
                try { if (browser != null) browser.close(); } catch (Exception ignore) {}
                try { if (playwright != null) playwright.close(); } catch (Exception ignore) {}

                playwright = Playwright.create();

                if (wsEndpoint != null && !wsEndpoint.isBlank()) {
                    log.info("[Playwright PDF Service] 원격 브라우저 연결 시도: {}", wsEndpoint);
                    try {
                        browser = playwright.chromium().connect(wsEndpoint);
                        log.info("[Playwright PDF Service] 원격 브라우저 연결 성공");
                    } catch (Exception e) {
                        log.error("[Playwright PDF Service] 원격 연결 실패 -> 로컬 모드로 전환", e);
                        launchLocalBrowser();
                    }
                } else {
                    launchLocalBrowser();
                }

                browser.onDisconnected(b -> {
                    log.error("[Playwright PDF] 브라우저 disconnected - Chromium/driver가 종료됨");
                    browserReady = false; // 즉시 죽음 표시 → 다음 요청에서 재기동
                });

                browserReady = true; // 모든 초기화 성공
                log.info("[Playwright PDF Service] 초기화 완료 - Chromium 브라우저 준비됨");
            } catch (Exception e) {
                browserReady = false;
                log.error("[Playwright PDF Service] 초기화 실패", e);
                throw new RuntimeException("Playwright 초기화 실패: " + e.getMessage(), e);
            }
        }
    }

    private void launchLocalBrowser() {
        log.info("[Playwright PDF Service] 로컬 Chromium 브라우저 시작 중...");
        browser = playwright.chromium().launch(new BrowserType.LaunchOptions()
                .setHeadless(true)
                .setArgs(Arrays.asList(
                        "--disable-gpu",
                        "--no-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-setuid-sandbox",
                        // 서버에서 크래시 줄이는 옵션(성능 약간 손해)
                        "--no-zygote",
                        "--single-process"
                )));
        log.info("[Playwright PDF Service] 로컬 브라우저 준비됨");
    }

    @PreDestroy
    public void destroy() {
        synchronized (pwLock) {
            browserReady = false;
            try {
                if (browser != null) {
                    browser.close();
                    log.info("[Playwright PDF Service] 브라우저 종료");
                }
            } catch (Exception ignore) {}
            try {
                if (playwright != null) {
                    playwright.close();
                    log.info("[Playwright PDF Service] Playwright 종료");
                }
            } catch (Exception ignore) {}
        }
    }

    /**
     * 브라우저 생존 체크 + 필요 시 재기동.
     *
     * 쿨다운 타이머 방식 제거 → browserReady 플래그로 상태 추적.
     * synchronized(pwLock) 이 동시 재기동을 막아주므로 별도 쿨다운 불필요.
     * - browserReady == false : 무조건 init() 호출
     * - browserReady == true  : version() 헬스체크 후 실패 시 재기동
     */
    private void ensureBrowserAlive(String reason) {
        synchronized (pwLock) {
            if (browserReady) {
                try {
                    if (browser != null) {
                        browser.version(); // 빠른 생존 체크
                        return; // 정상
                    }
                } catch (Exception ignore) {
                    // 헬스체크 실패 → 재기동으로 진행
                }
                browserReady = false;
            }

            log.warn("[Playwright PDF] 브라우저 죽음 감지 -> 재초기화. reason={}", reason);
            init(); // 실패 시 RuntimeException throw
        }
    }

    public byte[] convertHtmlToPdf(String htmlContent) throws Exception {
        return convertHtmlToPdf(htmlContent, new PdfOptions());
    }

    public byte[] convertUrlToPdf(String url) throws Exception {
        return convertUrlToPdf(url, new PdfOptions());
    }

    public byte[] convertUrlToPdf(String url, PdfOptions pdfOptions) throws Exception {
        boolean acquired = false;
        try {
            acquired = pdfGenerationSemaphore.tryAcquire(timeoutSeconds, TimeUnit.SECONDS);
            if (!acquired) throw new Exception("PDF 생성 요청이 너무 많습니다. " + timeoutSeconds + "초 후 다시 시도해주세요.");

            // 1차 시도
            try {
                return generatePdfFromUrl(url, pdfOptions);
            } catch (PlaywrightException e) {
                String msg = String.valueOf(e.getMessage());
                if (msg.contains("Browser has been closed") || msg.contains("Target page, context or browser has been closed")) {
                    log.warn("[Playwright PDF] 브라우저 종료 감지 -> 재기동 후 1회 재시도: {}", msg);
                    ensureBrowserAlive(msg);
                    return generatePdfFromUrl(url, pdfOptions); // 1회 재시도
                }
                throw e;
            }
        } finally {
            if (acquired) pdfGenerationSemaphore.release();
        }
    }

    public byte[] convertHtmlToPdf(String htmlContent, PdfOptions pdfOptions) throws Exception {
        boolean acquired = false;
        try {
            acquired = pdfGenerationSemaphore.tryAcquire(timeoutSeconds, TimeUnit.SECONDS);
            if (!acquired) throw new Exception("PDF 생성 요청이 너무 많습니다. " + timeoutSeconds + "초 후 다시 시도해주세요.");

            // 1차 시도
            try {
                return generatePdfInternal(htmlContent, pdfOptions);
            } catch (PlaywrightException e) {
                String msg = String.valueOf(e.getMessage());
                if (msg.contains("Browser has been closed") || msg.contains("Target page, context or browser has been closed")) {
                    log.warn("[Playwright PDF] 브라우저 종료 감지 -> 재기동 후 1회 재시도: {}", msg);
                    ensureBrowserAlive(msg);
                    return generatePdfInternal(htmlContent, pdfOptions); // 1회 재시도
                }
                throw e;
            }
        } finally {
            if (acquired) pdfGenerationSemaphore.release();
        }
    }

    private byte[] generatePdfFromUrl(String url, PdfOptions pdfOptions) throws Exception {
        ensureBrowserAlive("before newContext(url)");

        BrowserContext context = null;
        Page page = null;
        try {
            context = browser.newContext(new Browser.NewContextOptions().setViewportSize(1920, 1080));
            page = context.newPage();
            page.emulateMedia(new Page.EmulateMediaOptions().setMedia(Media.PRINT));

            page.navigate(url, new Page.NavigateOptions()
                    .setWaitUntil(WaitUntilState.NETWORKIDLE)
                    .setTimeout(30000));

            page.waitForTimeout(500);

            // 한글 문서라면 폰트 체크 실패 시 예외로 처리(원하면 try-catch로 완화 가능)
            page.waitForFunction("() => document.fonts && document.fonts.check('16px NanumGothic', '한글')",
                    null, new Page.WaitForFunctionOptions().setTimeout(5000));

            Page.PdfOptions options = new Page.PdfOptions()
                    .setFormat(pdfOptions.getFormat())
                    .setPrintBackground(pdfOptions.isPrintBackground())
                    .setDisplayHeaderFooter(false)
                    .setPreferCSSPageSize(false);

            if (pdfOptions.getMargin() != null) options.setMargin(pdfOptions.getMargin());
            return page.pdf(options);
        } finally {
            if (page != null) page.close();
            if (context != null) context.close();
        }
    }

    private byte[] generatePdfInternal(String htmlContent, PdfOptions pdfOptions) throws Exception {

        ensureBrowserAlive("before newContext(html)");

        BrowserContext context = null;
        Page page = null;
        try {
            context = browser.newContext(new Browser.NewContextOptions().setViewportSize(1920, 1080));
            page = context.newPage();
            page.emulateMedia(new Page.EmulateMediaOptions().setMedia(Media.PRINT));

            page.setContent(htmlContent, new Page.SetContentOptions()
                    .setWaitUntil(WaitUntilState.LOAD)
                    .setTimeout(30000));

            try {
                page.waitForFunction("() => document.fonts && document.fonts.status === 'loaded'",
                        null,
                        new Page.WaitForFunctionOptions().setTimeout(15000));
                log.info("[Playwright PDF] document.fonts loaded");
            } catch (Exception e) {
                log.warn("[Playwright PDF] document.fonts 로딩 대기 타임아웃 (계속 진행): {}", e.getMessage());
            }

            String computed = page.evaluate("() => getComputedStyle(document.body).fontFamily").toString();
            log.info("[Playwright PDF] computed body font-family={}", computed);

            Integer imgCount = ((Number) page.evaluate("() => document.images ? document.images.length : 0")).intValue();
            log.info("[Playwright PDF] image count={}", imgCount);

            Page.PdfOptions options = new Page.PdfOptions()
                    .setFormat(pdfOptions.getFormat())
                    .setPrintBackground(pdfOptions.isPrintBackground())
                    .setDisplayHeaderFooter(false)
                    .setPreferCSSPageSize(false);

            if (pdfOptions.getMargin() != null) options.setMargin(pdfOptions.getMargin());
            return page.pdf(options);
        } finally {
            if (page != null) page.close();
            if (context != null) context.close();
        }
    }

    public static class PdfOptions {
        private String format = "A4";
        private boolean printBackground = true;
        private Margin margin = new Margin()
                .setTop("1.5cm")
                .setRight("1.5cm")
                .setBottom("1.5cm")
                .setLeft("1.5cm");

        public String getFormat() { return format; }
        public PdfOptions setFormat(String format) { this.format = format; return this; }
        public boolean isPrintBackground() { return printBackground; }
        public PdfOptions setPrintBackground(boolean printBackground) { this.printBackground = printBackground; return this; }
        public Margin getMargin() { return margin; }
        public PdfOptions setMargin(Margin margin) { this.margin = margin; return this; }
    }
}