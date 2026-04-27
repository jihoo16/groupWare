package com.pinecni.erp.api.audit.service;

import com.pinecni.erp.api.audit.util.ClientIpResolver;
import com.pinecni.erp.constant.CodeConstants.AuditAction;
import com.pinecni.erp.constant.CodeConstants.AuditTargetType;
import com.pinecni.erp.entity.AuditLog;
import com.pinecni.erp.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.concurrent.Executor;

/**
 * 감사 로그 서비스 구현.
 *
 * <p>스레드 모델 — 공개 메서드는 호출자 스레드(동기)에서 실행되며,
 * 여기서 HttpServletRequest 의 IP·User-Agent·URL·Method 를 "먼저" 추출한다.
 * 그 다음 원시 값만 들고 {@link #auditLogExecutor} 의 Runnable 로 넘겨
 * 별도 스레드에서 insert 한다.
 *
 * <p>왜 {@code @Async} 가 아닌 수동 Executor 인가:
 * <ul>
 *   <li>{@code @Async} 는 메서드 전체를 async 로 뒤로 미루므로, 그 안에서
 *       {@code request.getHeader(...)} 를 호출하면 Tomcat 이 이미 request facade 를
 *       재활용 풀에 돌려보낸 뒤라 {@code "request object has been recycled"} 예외가 난다.</li>
 *   <li>동기 구간에서 request 필드를 완전히 복사해놓은 뒤에야 async 경계를 넘을 수 있다.</li>
 * </ul>
 *
 * <p>트랜잭션 — async 스레드에는 기존 트랜잭션 컨텍스트가 전파되지 않으므로
 * {@link TransactionTemplate} 로 {@link TransactionDefinition#PROPAGATION_REQUIRES_NEW}
 * 의 독립 트랜잭션을 직접 연다. 실패해도 호출자 트랜잭션엔 영향 없음.
 */
@Slf4j
@Service
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final Executor auditLogExecutor;
    private final TransactionTemplate auditTxTemplate;

    public AuditLogServiceImpl(AuditLogRepository auditLogRepository,
                                @Qualifier("auditLogExecutor") Executor auditLogExecutor,
                                PlatformTransactionManager transactionManager) {
        this.auditLogRepository = auditLogRepository;
        this.auditLogExecutor = auditLogExecutor;
        this.auditTxTemplate = new TransactionTemplate(transactionManager);
        this.auditTxTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    // ============================================================
    // 공개 진입점 — 동기 구간에서 request 필드 추출 후 async 전달
    // ============================================================

    @Override
    public void log(Long userIdx, AuditTargetType targetType, AuditAction action,
                    Long targetIdx, Long documentIdx, String description,
                    String detailJson, HttpServletRequest request) {
        Snapshot s = Snapshot.from(request);
        submit(userIdx, targetType, action, targetIdx, documentIdx, description, detailJson, s);
    }

    @Override
    public void log(Long userIdx, AuditTargetType targetType, AuditAction action,
                    Long targetIdx, Long documentIdx, String description,
                    HttpServletRequest request) {
        Snapshot s = Snapshot.from(request);
        submit(userIdx, targetType, action, targetIdx, documentIdx, description, null, s);
    }

    @Override
    public void logDocument(Long userIdx, AuditAction action, Long documentIdx,
                            String description, HttpServletRequest request) {
        Snapshot s = Snapshot.from(request);
        submit(userIdx, AuditTargetType.DOCUMENT, action, documentIdx, documentIdx, description, null, s);
    }

    @Override
    public void logSignature(Long userIdx, AuditAction action, Long signatureIdx,
                             Long documentIdx, String description, HttpServletRequest request) {
        Snapshot s = Snapshot.from(request);
        submit(userIdx, AuditTargetType.SIGNATURE, action, signatureIdx, documentIdx, description, null, s);
    }

    @Override
    public void logSession(Long userIdx, AuditAction action, Long sessionIdx,
                           Long documentIdx, String description, HttpServletRequest request) {
        Snapshot s = Snapshot.from(request);
        submit(userIdx, AuditTargetType.SIGNATURE_SESSION, action, sessionIdx, documentIdx, description, null, s);
    }

    @Override
    public void logFile(Long userIdx, AuditAction action, Long fileIdx,
                        Long documentIdx, String description, HttpServletRequest request) {
        Snapshot s = Snapshot.from(request);
        submit(userIdx, AuditTargetType.FILE, action, fileIdx, documentIdx, description, null, s);
    }

    @Override
    public void logUser(Long userIdx, AuditAction action, String description,
                        HttpServletRequest request) {
        Snapshot s = Snapshot.from(request);
        submit(userIdx, AuditTargetType.USER, action, userIdx, null, description, null, s);
    }

    // ============================================================
    // 내부 — auditLogExecutor 에 insert 작업 제출
    // ============================================================

    private void submit(Long userIdx, AuditTargetType targetType, AuditAction action,
                        Long targetIdx, Long documentIdx, String description,
                        String detailJson, Snapshot s) {
        if (userIdx == null || targetType == null || action == null) {
            log.warn("[AuditLog] 필수 필드 누락 — userIdx={}, targetType={}, action={}",
                    userIdx, targetType, action);
            return;
        }
        auditLogExecutor.execute(() -> {
            try {
                auditTxTemplate.executeWithoutResult(tx -> {
                    AuditLog entity = AuditLog.builder()
                            .userIdx(userIdx)
                            .targetType(targetType.getCode())
                            .action(action.getCode())
                            .targetIdx(targetIdx)
                            .documentIdx(documentIdx)
                            .description(description)
                            .detailJson(detailJson)
                            .ipAddress(s.ip)
                            .userAgent(s.userAgent)
                            .requestUrl(s.requestUrl)
                            .requestMethod(s.requestMethod)
                            .build();
                    auditLogRepository.save(entity);
                });
            } catch (Exception e) {
                log.error("[AuditLog] 기록 실패 userIdx={}, target={}/{}, action={}, doc={}: {}",
                        userIdx, targetType, targetIdx, action, documentIdx, e.getMessage(), e);
            }
        });
    }

    /**
     * HttpServletRequest 에서 IP/UA/URL/Method 를 동기 추출한 불변 스냅샷.
     * 호출자 스레드가 살아있을 때만 읽어야 한다.
     */
    private static final class Snapshot {
        final String ip;
        final String userAgent;
        final String requestUrl;
        final String requestMethod;

        private Snapshot(String ip, String userAgent, String requestUrl, String requestMethod) {
            this.ip = ip;
            this.userAgent = userAgent;
            this.requestUrl = requestUrl;
            this.requestMethod = requestMethod;
        }

        static Snapshot from(HttpServletRequest request) {
            String ip = ClientIpResolver.resolve(request);
            if (ip == null || ip.isBlank()) ip = "0.0.0.0"; // NOT NULL 제약 보호
            String ua = ClientIpResolver.userAgent(request);
            String url = request != null ? request.getRequestURI() : null;
            String method = request != null ? request.getMethod() : null;
            return new Snapshot(ip, ua, url, method);
        }
    }
}
