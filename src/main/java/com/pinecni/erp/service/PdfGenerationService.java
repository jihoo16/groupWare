package com.pinecni.erp.service;

import com.lowagie.text.DocumentException;
import com.lowagie.text.pdf.BaseFont;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.xhtmlrenderer.pdf.ITextRenderer;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * PDF 생성 서비스
 * Flying Saucer + iText를 사용하여 HTML을 PDF로 변환
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class PdfGenerationService {

    private final SpringTemplateEngine templateEngine;
    private final PlaywrightPdfService playwrightPdfService;

    @Value("${pdf.storage.path:./pdf_storage}")
    private String pdfStoragePath;

    @Value("${pdf.inline-css:true}")
    private boolean inlineCss;

    @Value("${pdf.storage.vacation.pattern:vacation/{year}/{userId}}")
    private String vacationPathPattern;

    @Value("${pdf.storage.expense.pattern:expense/{year}/{userId}}")
    private String expensePathPattern;

    @Value("${pdf.storage.meeting.pattern:meeting/{year}/{date}}")
    private String meetingPathPattern;

    @Value("${pdf.storage.project-weekly-report.pattern:project/{year}/{projectIdx}}")
    private String projectWeeklyReportPathPattern;

    @Value("${pdf.storage.receipt-meeting.pattern:receipt-meeting/{year}/{date}}")
    private String receiptMeetingPathPattern;

    @Value("${pdf.storage.receipt-overtime.pattern:receipt-overtime/{year}/{projectIdx}}")
    private String receiptOvertimePathPattern;

    /**
     * 연차신청서 Thymeleaf 템플릿을 PDF로 변환 (전체 데이터 Map 사용)
     *
     * @param pdfData PDF 생성에 필요한 모든 데이터
     * @return PDF 바이트 배열
     */
    public byte[] generateVacationPdfWithData(Map<String, Object> pdfData) throws Exception {
        String userName = (String) pdfData.getOrDefault("applicant", "");
        log.info("연차신청서 PDF 생성 시작 - 사용자: {}", userName);

        // Thymeleaf Context 생성 및 데이터 바인딩
        Context context = new Context();
        context.setVariable("applicant", pdfData.getOrDefault("applicant", ""));
        context.setVariable("department", pdfData.getOrDefault("department", ""));
        context.setVariable("position", pdfData.getOrDefault("position", ""));
        context.setVariable("address", pdfData.getOrDefault("address", ""));
        context.setVariable("birthDate", pdfData.getOrDefault("birthDate", ""));
        context.setVariable("contact", pdfData.getOrDefault("contact", ""));
        context.setVariable("reason", pdfData.getOrDefault("reason", "연차 휴가 사용."));
        context.setVariable("applyDate", pdfData.getOrDefault("applyDate", LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy년 MM월 dd일"))));
        context.setVariable("deptManagerName", pdfData.getOrDefault("deptManagerName", "-"));
        context.setVariable("ceoName", pdfData.getOrDefault("ceoName", "-"));

        // 휴가 기간 데이터 포맷팅
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> periods = (List<Map<String, Object>>) pdfData.getOrDefault("periods", new ArrayList<>());
        List<Map<String, String>> formattedPeriods = new ArrayList<>();

        for (Map<String, Object> period : periods) {
            Map<String, String> formattedPeriod = new HashMap<>();

            String type = (String) period.getOrDefault("type", "연차");
            String startDate = (String) period.get("startDate");
            String endDate = (String) period.get("endDate");
            Object daysObj = period.get("days");

            // 날짜 포맷팅
            if (startDate != null && startDate.matches("\\d{4}-\\d{2}-\\d{2}")) {
                startDate = formatDateString(startDate);
            }
            if (endDate != null && endDate.matches("\\d{4}-\\d{2}-\\d{2}")) {
                endDate = formatDateString(endDate);
            }

            formattedPeriod.put("type", type);
            formattedPeriod.put("startDate", startDate != null ? startDate : "");
            formattedPeriod.put("endDate", endDate != null ? endDate : "");
            formattedPeriod.put("days", daysObj != null ? daysObj.toString() : "0");

            formattedPeriods.add(formattedPeriod);
        }
        context.setVariable("periods", formattedPeriods);

        // Thymeleaf 템플릿 렌더링
        String htmlContent = templateEngine.process("pdf/vacation_document", context);

        // HTML을 PDF로 변환
        byte[] pdfBytes = convertHtmlToPdf(htmlContent);

        log.info("연차신청서 PDF 생성 완료 - 크기: {} bytes", pdfBytes.length);

        return pdfBytes;
    }

    /**
     * 프론트엔드에서 렌더링된 HTML을 PDF로 변환
     *
     * @param fullHtml 완전한 HTML 문서 (head, body 포함)
     * @return PDF 바이트 배열
     * @throws Exception PDF 생성 실패 시
     */
    public byte[] generatePdfFromRenderedHtml(String fullHtml) throws Exception {
        log.info("[프론트엔드 렌더링 HTML -> PDF 변환] 시작");
        return convertHtmlToPdf(fullHtml);
    }

    /**
     * 연차신청서 Thymeleaf 템플릿을 PDF로 변환 (레거시 메서드)
     *
     * @param userName     사용자 이름
     * @param userDept     부서
     * @param userPosition 직급
     * @param reason       신청 사유
     * @param periods      휴가 기간 목록
     * @return PDF 바이트 배열
     */
    public byte[] generateVacationPdf(String userName, String userDept, String userPosition,
                                       String reason, List<Map<String, Object>> periods) throws Exception {

        Map<String, Object> pdfData = new HashMap<>();
        pdfData.put("applicant", userName);
        pdfData.put("department", userDept);
        pdfData.put("position", userPosition);
        pdfData.put("reason", reason);
        pdfData.put("periods", periods);
        pdfData.put("address", "");
        pdfData.put("birthDate", "");
        pdfData.put("contact", "");

        return generateVacationPdfWithData(pdfData);
    }


    /**
     * URL을 접속하여 PDF로 변환 (Playwright 사용 - JavaScript 실행 포함)
     *
     * @param url 접속할 URL (예: http://localhost:8080/vacation/preview/123)
     * @return PDF 바이트 배열
     */
    public byte[] generatePdfFromUrl(String url) throws Exception {
        log.info("[PDF 변환] URL 접속하여 PDF 생성 시작: {}", url);

        try {
            // Playwright로 URL 접속 후 PDF 생성
            byte[] pdfBytes = playwrightPdfService.convertUrlToPdf(url);

            log.info("[PDF 변환] URL 기반 PDF 생성 완료 - 크기: {} bytes", pdfBytes.length);
            return pdfBytes;

        } catch (Exception e) {
            log.error("[PDF 변환] URL 기반 PDF 생성 실패", e);
            throw new Exception("URL 기반 PDF 생성 실패: " + e.getMessage(), e);
        }
    }

    /**
     * HTML을 PDF로 변환 (Playwright 사용 - 화면과 동일한 PDF 생성)
     */
    private byte[] convertHtmlToPdf(String htmlContent) throws Exception {
        log.info("[PDF 변환] Playwright를 사용하여 PDF 생성 시작");

        try {
            // 한글 폰트를 base64로 인코딩하여 HTML에 직접 주입
            String htmlWithFont = injectKoreanFontAsBase64(htmlContent);

            // Playwright로 HTML을 렌더링하고 PDF 생성
            byte[] pdfBytes = playwrightPdfService.convertHtmlToPdf(htmlWithFont);

            log.info("[PDF 변환] Playwright PDF 생성 완료 - 크기: {} bytes", pdfBytes.length);
            return pdfBytes;

        } catch (Exception e) {
            log.error("[PDF 변환] Playwright PDF 생성 실패, Flying Saucer로 폴백 시도", e);

            // Playwright 실패 시 Flying Saucer로 폴백
            return convertHtmlToPdfWithFlyingSaucer(htmlContent);
        }
    }

    /**
     * HTML을 PDF로 변환 (Flying Saucer + iText 사용 - 폴백용)
     */
    private byte[] convertHtmlToPdfWithFlyingSaucer(String htmlContent) throws Exception {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

        try {
            ITextRenderer renderer = new ITextRenderer();

            // 한글 폰트 설정 (여러 경로 시도)
            loadKoreanFont(renderer);

            // HTML 설정 및 렌더링
            renderer.setDocumentFromString(htmlContent);
            renderer.layout();
            renderer.createPDF(outputStream);

            log.info("HTML to PDF 변환 완료 (Flying Saucer)");

        } catch (DocumentException e) {
            log.error("PDF 생성 중 오류 발생", e);
            throw new Exception("PDF 생성 실패: " + e.getMessage(), e);
        } finally {
            try {
                outputStream.close();
            } catch (IOException e) {
                log.error("OutputStream 닫기 실패", e);
            }
        }

        return outputStream.toByteArray();
    }

    /**
     * classpath:fonts/NanumGothic.ttf 를 base64로 인코딩하여
     * <head> 안에 @font-face style 태그로 주입 (Playwright는 setContent 시 외부 경로 접근 불가)
     */
    private String injectKoreanFontAsBase64(String htmlContent) {
        String[] fontCandidates = {"fonts/NanumGothic.ttf", "fonts/malgun.ttf"};

        for (String fontPath : fontCandidates) {
            try {
                ClassPathResource fontResource = new ClassPathResource(fontPath);
                if (!fontResource.exists()) continue;

                byte[] fontBytes = fontResource.getInputStream().readAllBytes();
                String base64Font = java.util.Base64.getEncoder().encodeToString(fontBytes);
                String fontName = fontPath.contains("Nanum") ? "NanumGothic" : "MalgunGothic";

                String fontStyle = "<style>\n" +
                        "@font-face {\n" +
                        "  font-family: '" + fontName + "';\n" +
                        "  src: url('data:font/truetype;base64," + base64Font + "') format('truetype');\n" +
                        "  font-weight: normal;\n" +
                        "  font-style: normal;\n" +
                        "}\n" +
                        "body, * { font-family: '" + fontName + "', sans-serif !important; }\n" +
                        "</style>\n";

                // <head> 태그 안에 주입, 없으면 맨 앞에 추가
                if (htmlContent.contains("</head>")) {
                    htmlContent = htmlContent.replace("</head>", fontStyle + "</head>");
                } else {
                    htmlContent = fontStyle + htmlContent;
                }

                log.info("[PDF 폰트 주입] 한글 폰트 base64 주입 완료: {}", fontPath);
                return htmlContent;

            } catch (Exception e) {
                log.debug("[PDF 폰트 주입] 폰트 로드 실패: {} - {}", fontPath, e.getMessage());
            }
        }

        log.warn("[PDF 폰트 주입] 한글 폰트를 찾지 못했습니다. src/main/resources/fonts/ 에 NanumGothic.ttf 를 추가하세요.");
        return htmlContent;
    }

    /**
     * 날짜 문자열 포맷 변환 (YYYY-MM-DD -> YYYY년 MM월 DD일)
     */
    private String formatDateString(String dateStr) {
        try {
            LocalDate date = LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE);
            return date.format(DateTimeFormatter.ofPattern("yyyy년 MM월 dd일"));
        } catch (Exception e) {
            log.warn("날짜 포맷 변환 실패: {}", dateStr);
            return dateStr;
        }
    }

    /**
     * 한글 폰트 로드 (여러 경로 시도)
     */
    private void loadKoreanFont(ITextRenderer renderer) {
        String[] fontPaths = {
                // 1. 클래스패스의 fonts 디렉토리 (VM 환경, 권장)
                "fonts/NotoSansKR-Regular.ttf",
                "fonts/NanumGothic.ttf",
                "fonts/malgun.ttf",

                // 2. Windows 시스템 폰트
                "C:\\Windows\\Fonts\\malgun.ttf",
                "C:\\Windows\\Fonts\\gulim.ttc",

                // 3. Linux 시스템 폰트
                "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
                "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"
        };

        boolean fontLoaded = false;

        for (String fontPath : fontPaths) {
            try {
                // 클래스패스 리소스 시도
                if (!fontPath.startsWith("C:") && !fontPath.startsWith("/")) {
                    ClassPathResource fontResource = new ClassPathResource(fontPath);
                    if (fontResource.exists()) {
                        InputStream fontStream = fontResource.getInputStream();
                        byte[] fontBytes = fontStream.readAllBytes();
                        fontStream.close();

                        // 임시 파일로 저장 (iText가 파일 경로를 요구하므로)
                        File tempFont = File.createTempFile("font", ".ttf");
                        tempFont.deleteOnExit();
                        try (FileOutputStream fos = new FileOutputStream(tempFont)) {
                            fos.write(fontBytes);
                        }

                        renderer.getFontResolver().addFont(
                                tempFont.getAbsolutePath(),
                                BaseFont.IDENTITY_H,
                                BaseFont.EMBEDDED
                        );
                        log.info("한글 폰트 로드 성공 (클래스패스): {}", fontPath);
                        fontLoaded = true;
                        break;
                    }
                } else {
                    // 파일 시스템 경로 시도
                    File fontFile = new File(fontPath);
                    if (fontFile.exists()) {
                        renderer.getFontResolver().addFont(
                                fontPath,
                                BaseFont.IDENTITY_H,
                                BaseFont.EMBEDDED
                        );
                        log.info("한글 폰트 로드 성공 (파일 시스템): {}", fontPath);
                        fontLoaded = true;
                        break;
                    }
                }
            } catch (Exception e) {
                log.debug("폰트 로드 시도 실패: {} - {}", fontPath, e.getMessage());
            }
        }

        if (!fontLoaded) {
            log.warn("한글 폰트를 찾을 수 없습니다. 기본 폰트를 사용합니다. " +
                    "src/main/resources/fonts/ 디렉토리에 한글 폰트 파일(.ttf)을 추가하세요.");
        }
    }

    /**
     * PDF를 서버의 지정된 경로에 저장 (레거시, 하위 호환성 유지)
     *
     * @param pdfBytes PDF 바이트 배열
     * @param fileName 파일명
     * @param subDir   하위 디렉토리 (예: "vacation", "expense")
     * @return 저장된 파일 경로
     */
    public String savePdfToServer(byte[] pdfBytes, String fileName, String subDir) throws IOException {
        String targetDir = pdfStoragePath + File.separator + subDir;

        // 디렉토리 생성 (없으면 자동 생성)
        File directory = new File(targetDir);
        if (!directory.exists()) {
            boolean created = directory.mkdirs();
            if (!created) {
                throw new IOException("PDF 저장 디렉토리 생성 실패: " + targetDir +
                                    ". 디렉토리 권한을 확인하세요.");
            }
            log.info("PDF 저장 디렉토리 생성 완료: {}", targetDir);
        }

        // 파일 저장
        String filePath = targetDir + File.separator + fileName;

        try (FileOutputStream fos = new FileOutputStream(filePath)) {
            fos.write(pdfBytes);
            log.info("PDF 파일 저장 완료: {}", filePath);
        } catch (IOException e) {
            log.error("PDF 파일 저장 실패: {} - {}", filePath, e.getMessage());
            throw new IOException("PDF 파일 저장 실패: " + e.getMessage(), e);
        }

        return filePath;
    }

    /**
     * 연차신청서 PDF를 구조화된 경로에 저장
     * 경로 패턴: {basePath}/vacation/{year}/{userId}/{fileName}
     *
     * @param pdfBytes PDF 바이트 배열
     * @param fileName 파일명
     * @param year     연도 (예: 2026)
     * @param userId   사용자 ID
     * @return 저장된 파일 경로
     */
    public String saveVacationPdf(byte[] pdfBytes, String fileName, String year, String userId) throws IOException {
        // 경로 패턴 변환: vacation/{year}/{userId}
        String relativePath = vacationPathPattern
                .replace("{year}", year)
                .replace("{userId}", userId);

        String targetDir = pdfStoragePath + File.separator + relativePath.replace("/", File.separator);

        // 디렉토리 생성 (없으면 자동 생성)
        File directory = new File(targetDir);
        if (!directory.exists()) {
            boolean created = directory.mkdirs();
            if (!created) {
                throw new IOException("PDF 저장 디렉토리 생성 실패: " + targetDir +
                                    ". 디렉토리 권한을 확인하세요.");
            }
            log.info("PDF 저장 디렉토리 생성 완료: {}", targetDir);
        } else {
            log.debug("PDF 저장 디렉토리 이미 존재: {}", targetDir);
        }

        // 파일 저장
        String filePath = targetDir + File.separator + fileName;
        File file = new File(filePath);

        try (FileOutputStream fos = new FileOutputStream(file)) {
            fos.write(pdfBytes);
            log.info("연차신청서 PDF 파일 저장 완료: {}", filePath);
        } catch (IOException e) {
            log.error("PDF 파일 저장 실패: {} - {}", filePath, e.getMessage());
            throw new IOException("PDF 파일 저장 실패: " + e.getMessage(), e);
        }

        return filePath;
    }

    /**
     * 지출승인서 PDF를 구조화된 경로에 저장
     * 경로 패턴: {basePath}/expense/{year}/{userId}/{fileName}
     *
     * @param pdfBytes PDF 바이트 배열
     * @param fileName 파일명
     * @param year     연도 (예: 2026)
     * @param userId   사용자 ID
     * @return 저장된 파일 경로
     */
    public String saveExpensePdf(byte[] pdfBytes, String fileName, String year, String userId) throws IOException {
        // 경로 패턴 변환: expense/{year}/{userId}
        String relativePath = expensePathPattern
                .replace("{year}", year)
                .replace("{userId}", userId);

        String targetDir = pdfStoragePath + File.separator + relativePath.replace("/", File.separator);

        // 디렉토리 생성 (없으면 자동 생성)
        File directory = new File(targetDir);
        if (!directory.exists()) {
            boolean created = directory.mkdirs();
            if (!created) {
                throw new IOException("PDF 저장 디렉토리 생성 실패: " + targetDir +
                                    ". 디렉토리 권한을 확인하세요.");
            }
            log.info("PDF 저장 디렉토리 생성 완료: {}", targetDir);
        } else {
            log.debug("PDF 저장 디렉토리 이미 존재: {}", targetDir);
        }

        // 파일 저장
        String filePath = targetDir + File.separator + fileName;
        File file = new File(filePath);

        try (FileOutputStream fos = new FileOutputStream(file)) {
            fos.write(pdfBytes);
            log.info("지출승인서 PDF 파일 저장 완료: {}", filePath);
        } catch (IOException e) {
            log.error("PDF 파일 저장 실패: {} - {}", filePath, e.getMessage());
            throw new IOException("PDF 파일 저장 실패: " + e.getMessage(), e);
        }

        return filePath;
    }

    /**
     * 프로젝트 주간업무보고 PDF를 구조화된 경로에 저장
     * 경로 패턴: {basePath}/project/{year}/{projectIdx}/{fileName}
     *
     * @param pdfBytes   PDF 바이트 배열
     * @param fileName   파일명
     * @param year       연도 (예: 2026)
     * @param projectIdx 프로젝트 IDX
     * @return 저장된 파일 경로
     */
    public String saveWeeklyReportPdf(byte[] pdfBytes, String fileName, String year, String projectIdx) throws IOException {
        // 경로 패턴 변환: project/{year}/{projectIdx}
        String relativePath = projectWeeklyReportPathPattern
                .replace("{year}", year)
                .replace("{projectIdx}", projectIdx);

        String targetDir = pdfStoragePath + File.separator + relativePath.replace("/", File.separator);

        // 디렉토리 생성 (없으면 자동 생성)
        File directory = new File(targetDir);
        if (!directory.exists()) {
            boolean created = directory.mkdirs();
            if (!created) {
                throw new IOException("PDF 저장 디렉토리 생성 실패: " + targetDir +
                                    ". 디렉토리 권한을 확인하세요.");
            }
            log.info("PDF 저장 디렉토리 생성 완료: {}", targetDir);
        } else {
            log.debug("PDF 저장 디렉토리 이미 존재: {}", targetDir);
        }

        // 파일 저장
        String filePath = targetDir + File.separator + fileName;
        File file = new File(filePath);

        try (FileOutputStream fos = new FileOutputStream(file)) {
            fos.write(pdfBytes);
            log.info("프로젝트 주간업무보고 PDF 파일 저장 완료: {}", filePath);
        } catch (IOException e) {
            log.error("PDF 파일 저장 실패: {} - {}", filePath, e.getMessage());
            throw new IOException("PDF 파일 저장 실패: " + e.getMessage(), e);
        }

        return filePath;
    }

    /**
     * 연구비증빙 회의록 PDF를 구조화된 경로에 저장
     * 경로 패턴: {basePath}/receipt-meeting/{year}/{date}/{fileName}
     *
     * @param pdfBytes PDF 바이트 배열
     * @param fileName 파일명
     * @param year     연도 (예: 2026)
     * @param date     회의 날짜 (yyyy-MM-dd)
     * @return 저장된 파일 경로
     */
    public String saveReceiptMeetingPdf(byte[] pdfBytes, String fileName, String year, String date) throws IOException {
        // 경로 패턴 변환: receipt-meeting/{year}/{date}
        String relativePath = receiptMeetingPathPattern
                .replace("{year}", year)
                .replace("{date}", date);

        String targetDir = pdfStoragePath + File.separator + relativePath.replace("/", File.separator);

        // 디렉토리 생성 (없으면 자동 생성)
        File directory = new File(targetDir);
        if (!directory.exists()) {
            boolean created = directory.mkdirs();
            if (!created) {
                throw new IOException("PDF 저장 디렉토리 생성 실패: " + targetDir +
                                    ". 디렉토리 권한을 확인하세요.");
            }
            log.info("PDF 저장 디렉토리 생성 완료: {}", targetDir);
        } else {
            log.debug("PDF 저장 디렉토리 이미 존재: {}", targetDir);
        }

        // 파일 저장
        String filePath = targetDir + File.separator + fileName;
        File file = new File(filePath);

        try (FileOutputStream fos = new FileOutputStream(file)) {
            fos.write(pdfBytes);
            log.info("연구비증빙 회의록 PDF 파일 저장 완료: {}", filePath);
        } catch (IOException e) {
            log.error("PDF 파일 저장 실패: {} - {}", filePath, e.getMessage());
            throw new IOException("PDF 파일 저장 실패: " + e.getMessage(), e);
        }

        return filePath;
    }

    /**
     * 연구비증빙 야근식대 PDF를 구조화된 경로에 저장
     * 경로 패턴: {basePath}/receipt-overtime/{year}/{projectIdx}/{fileName}
     *
     * @param pdfBytes   PDF 바이트 배열
     * @param fileName   파일명
     * @param year       연도 (예: 2026)
     * @param projectIdx 프로젝트 IDX
     * @return 저장된 파일 경로
     */
    public String saveReceiptOvertimePdf(byte[] pdfBytes, String fileName, String year, String projectIdx) throws IOException {
        // 경로 패턴 변환: receipt-overtime/{year}/{projectIdx}
        String relativePath = receiptOvertimePathPattern
                .replace("{year}", year)
                .replace("{projectIdx}", projectIdx);

        String targetDir = pdfStoragePath + File.separator + relativePath.replace("/", File.separator);

        // 디렉토리 생성 (없으면 자동 생성)
        File directory = new File(targetDir);
        if (!directory.exists()) {
            boolean created = directory.mkdirs();
            if (!created) {
                throw new IOException("PDF 저장 디렉토리 생성 실패: " + targetDir +
                                    ". 디렉토리 권한을 확인하세요.");
            }
            log.info("PDF 저장 디렉토리 생성 완료: {}", targetDir);
        } else {
            log.debug("PDF 저장 디렉토리 이미 존재: {}", targetDir);
        }

        // 파일 저장
        String filePath = targetDir + File.separator + fileName;
        File file = new File(filePath);

        try (FileOutputStream fos = new FileOutputStream(file)) {
            fos.write(pdfBytes);
            log.info("연구비증빙 야근식대 PDF 파일 저장 완료: {}", filePath);
        } catch (IOException e) {
            log.error("PDF 파일 저장 실패: {} - {}", filePath, e.getMessage());
            throw new IOException("PDF 파일 저장 실패: " + e.getMessage(), e);
        }

        return filePath;
    }
}
