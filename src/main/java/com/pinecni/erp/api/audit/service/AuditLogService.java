package com.pinecni.erp.api.audit.service;

import com.pinecni.erp.constant.CodeConstants.AuditAction;
import com.pinecni.erp.constant.CodeConstants.AuditTargetType;
import jakarta.servlet.http.HttpServletRequest;

/**
 * 감사 로그 기록 서비스
 *
 * <p>모든 호출은 비동기(@Async, audit-log 전용 스레드풀)로 처리되어
 * 메인 비즈니스 트랜잭션과 분리됨. 로그 기록 실패는 비즈니스 로직에
 * 영향을 주지 않는다.
 *
 * <p>설계 섹션 11-1 참조 — 14종 액션.
 */
public interface AuditLogService {

    /**
     * 단건 기록 (가장 범용)
     *
     * @param userIdx     행위자 users.idx (NOT NULL)
     * @param targetType  C17 대상 유형
     * @param action      C18 행위
     * @param targetIdx   대상 레코드 PK (nullable — 예: 로그인은 대상 없음)
     * @param documentIdx 관련 문서 idx (nullable — 문서 관련 행위면 채움)
     * @param description 사람이 읽는 설명 (nullable)
     * @param detailJson  상세 JSON 문자열 (nullable — before/after 등)
     * @param request     요청 객체 (IP/User-Agent/URL/Method 추출용, nullable 허용)
     */
    void log(Long userIdx,
             AuditTargetType targetType,
             AuditAction action,
             Long targetIdx,
             Long documentIdx,
             String description,
             String detailJson,
             HttpServletRequest request);

    /**
     * 간편 오버로드 — 설명만 남기고 상세 JSON은 생략
     */
    void log(Long userIdx,
             AuditTargetType targetType,
             AuditAction action,
             Long targetIdx,
             Long documentIdx,
             String description,
             HttpServletRequest request);

    /**
     * 문서 관련 간편 오버로드 — documentIdx 로 targetIdx 도 함께 기록
     */
    void logDocument(Long userIdx,
                     AuditAction action,
                     Long documentIdx,
                     String description,
                     HttpServletRequest request);

    /**
     * 서명 관련 간편 오버로드
     */
    void logSignature(Long userIdx,
                      AuditAction action,
                      Long signatureIdx,
                      Long documentIdx,
                      String description,
                      HttpServletRequest request);

    /**
     * 서명 세션 관련 간편 오버로드
     */
    void logSession(Long userIdx,
                    AuditAction action,
                    Long sessionIdx,
                    Long documentIdx,
                    String description,
                    HttpServletRequest request);

    /**
     * 파일 관련 간편 오버로드
     */
    void logFile(Long userIdx,
                 AuditAction action,
                 Long fileIdx,
                 Long documentIdx,
                 String description,
                 HttpServletRequest request);

    /**
     * 사용자 계정 관련 간편 오버로드 (로그인/로그아웃)
     */
    void logUser(Long userIdx,
                 AuditAction action,
                 String description,
                 HttpServletRequest request);
}
