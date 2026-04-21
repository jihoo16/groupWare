package com.pinecni.erp.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * QR 코드 생성 서비스 (ZXing 기반)
 *
 * <p>용도:
 * <ul>
 *   <li>서명 세션 URL을 QR 이미지로 인코딩</li>
 *   <li>PC 화면 모달에서 Base64 인코딩 이미지로 렌더링</li>
 * </ul>
 */
@Slf4j
@Service
public class QrCodeService {

    @Value("${signature.base-url}")
    private String baseUrl;

    @Value("${signature.qr.width:300}")
    private int defaultWidth;

    @Value("${signature.qr.height:300}")
    private int defaultHeight;

    @Value("${signature.verify.secret-key}")
    private String verifySecretKey;

    /**
     * 서명 세션 토큰 + 서명자 사번 해시로 QR 이미지 생성 (Base64 PNG)
     *
     * @param sessionToken UUID 기반 세션 토큰
     * @param signerEmpId 서명자 사번 (HMAC 해시 생성용)
     * @return "data:image/png;base64,..." 형식 문자열 (img src에 바로 사용 가능)
     */
    public String generateSignatureQrDataUrl(String sessionToken, String signerEmpId) {
        String vh = generateVerifyHash(signerEmpId, sessionToken);
        String signUrl = baseUrl + "/sign/" + sessionToken + "?vh=" + vh;
        log.debug("QR 코드 생성 (vh 포함): {}", signUrl);
        return generateQrDataUrl(signUrl, defaultWidth, defaultHeight);
    }

    /**
     * 사번 검증용 HMAC-SHA256 해시 생성
     */
    public String generateVerifyHash(String empId, String sessionToken) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(
                    verifySecretKey.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal((empId + ":" + sessionToken).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("HMAC 해시 생성 실패", e);
        }
    }

    /**
     * 사번 검증: 입력된 사번으로 생성한 해시가 QR URL의 해시와 일치하는지 확인
     */
    public boolean verifyEmpIdHash(String inputEmpId, String sessionToken, String expectedHash) {
        String computed = generateVerifyHash(inputEmpId, sessionToken);
        return computed.equals(expectedHash);
    }

    /**
     * 임의 URL/텍스트로 QR 이미지 생성 (Base64 PNG data URL)
     *
     * @param content QR에 인코딩할 문자열
     * @param width   이미지 너비 (px)
     * @param height  이미지 높이 (px)
     * @return "data:image/png;base64,..." 형식 문자열
     */
    public String generateQrDataUrl(String content, int width, int height) {
        byte[] pngBytes = generateQrPngBytes(content, width, height);
        String base64 = Base64.getEncoder().encodeToString(pngBytes);
        return "data:image/png;base64," + base64;
    }

    /**
     * 임의 URL/텍스트로 QR 이미지 생성 (PNG byte[])
     */
    public byte[] generateQrPngBytes(String content, int width, int height) {
        try {
            QRCodeWriter writer = new QRCodeWriter();

            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            hints.put(EncodeHintType.MARGIN, 1);

            BitMatrix matrix = writer.encode(content, BarcodeFormat.QR_CODE, width, height, hints);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", outputStream);
            return outputStream.toByteArray();
        } catch (WriterException | IOException e) {
            log.error("QR 코드 생성 실패: content={}, error={}", content, e.getMessage(), e);
            throw new RuntimeException("QR 코드 생성 실패", e);
        }
    }

    /**
     * 서명 페이지 베이스 URL 조회 (application.properties의 signature.base-url)
     */
    public String getBaseUrl() {
        return baseUrl;
    }
}
