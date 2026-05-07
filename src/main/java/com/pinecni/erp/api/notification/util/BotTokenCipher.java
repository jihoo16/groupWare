package com.pinecni.erp.api.notification.util;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Mattermost 봇 Access Token 암복호화 유틸 (AES-256-GCM).
 *
 * <p>저장 형식: Base64( IV(12B) || CIPHERTEXT || TAG(16B) )
 *
 * <p>키는 application.properties 의 {@code notification.crypto.aes-key-base64}
 * 에 보관 (Base64 디코딩 시 32B = 256bit). 키가 분실되면 기존 토큰은 복호화 불가
 * — 토큰 재등록만 하면 됨.
 *
 * <p>운영 PostgreSQL 에 pgcrypto contrib 가 설치되어 있지 않아 DB 측 암호화 대신
 * Java 측 AES-GCM 으로 처리.
 */
@Slf4j
@Component
public class BotTokenCipher {

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;
    private static final int TAG_BIT_LENGTH = 128;
    private static final int KEY_BYTES = 32;

    private final SecureRandom secureRandom = new SecureRandom();
    private final String keyBase64;
    private SecretKey secretKey;

    public BotTokenCipher(@Value("${notification.crypto.aes-key-base64}") String keyBase64) {
        this.keyBase64 = keyBase64;
    }

    @PostConstruct
    void init() {
        if (keyBase64 == null || keyBase64.isBlank()) {
            throw new IllegalStateException(
                    "notification.crypto.aes-key-base64 가 설정되지 않았습니다.");
        }
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(keyBase64);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException(
                    "notification.crypto.aes-key-base64 가 올바른 Base64 가 아닙니다.", e);
        }
        if (keyBytes.length != KEY_BYTES) {
            throw new IllegalStateException(
                    "notification.crypto.aes-key-base64 디코드 길이는 32B (AES-256) 이어야 합니다. 실제: " + keyBytes.length);
        }
        this.secretKey = new SecretKeySpec(keyBytes, ALGORITHM);
    }

    /**
     * 평문 토큰을 암호화해 Base64 문자열로 반환.
     *
     * @param plaintext 평문 토큰. null/blank 면 null 반환 (= "토큰 미설정")
     * @return Base64( IV || CIPHERTEXT_TAG ) 또는 null
     */
    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) {
            return null;
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(TAG_BIT_LENGTH, iv));
            byte[] cipherTag = cipher.doFinal(plaintext.getBytes(java.nio.charset.StandardCharsets.UTF_8));

            ByteBuffer buf = ByteBuffer.allocate(iv.length + cipherTag.length);
            buf.put(iv);
            buf.put(cipherTag);
            return Base64.getEncoder().encodeToString(buf.array());
        } catch (Exception e) {
            throw new IllegalStateException("봇 토큰 암호화에 실패했습니다.", e);
        }
    }

    /**
     * 저장된 Base64 문자열을 평문 토큰으로 복호화.
     *
     * @param encrypted DB 의 bot_token_enc 값. null/blank 이면 null 반환
     * @return 평문 토큰
     * @throws IllegalStateException 복호화 실패 (키 변경/포맷 손상/태그 불일치 등)
     */
    public String decrypt(String encrypted) {
        if (encrypted == null || encrypted.isBlank()) {
            return null;
        }
        try {
            byte[] all = Base64.getDecoder().decode(encrypted);
            if (all.length <= IV_LENGTH) {
                throw new IllegalStateException("암호문 길이가 너무 짧습니다.");
            }
            byte[] iv = new byte[IV_LENGTH];
            byte[] cipherTag = new byte[all.length - IV_LENGTH];
            System.arraycopy(all, 0, iv, 0, IV_LENGTH);
            System.arraycopy(all, IV_LENGTH, cipherTag, 0, cipherTag.length);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(TAG_BIT_LENGTH, iv));
            byte[] plain = cipher.doFinal(cipherTag);
            return new String(plain, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("봇 토큰 복호화 실패 (키 변경 또는 데이터 손상 의심)", e);
            throw new IllegalStateException("봇 토큰 복호화에 실패했습니다.", e);
        }
    }

    /** 저장된 값이 실제 토큰을 포함하고 있는지. seed 의 빈 문자열 placeholder 는 false. */
    public boolean isPresent(String encrypted) {
        return encrypted != null && !encrypted.isBlank();
    }
}
