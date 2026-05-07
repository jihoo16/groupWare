package com.pinecni.erp.api.notification.service;

import com.pinecni.erp.api.notification.dto.RenderedMessage;
import com.pinecni.erp.api.notification.repository.NotificationTemplateRepository;
import com.pinecni.erp.entity.NotificationTemplate;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.StringTemplateResolver;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * 알림 종류(C19) 별 템플릿에 변수를 채워 최종 메시지를 만든다.
 *
 * <p>Thymeleaf {@link SpringTemplateEngine} 의 TEXT 모드를 사용 — HTML 이스케이프 없이
 * Markdown / 일반 텍스트 그대로 출력. {@code [[${변수명}]]} 형태가 SpringEL 로 치환됨.
 *
 * <p><b>Spring</b>TemplateEngine 을 쓰는 이유: 기본 {@code TemplateEngine} 은 OGNL 라이브러리에
 * 의존하는데 Spring Boot 의 thymeleaf-spring6 가 OGNL 없이 SpringEL 로 동작하므로 OGNL 이
 * 클래스패스에 없어 NoClassDefFoundError 가 난다. SpringTemplateEngine 은 SpringStandardDialect
 * (SpringEL 기반) 을 기본 탑재한다.
 *
 * <p>템플릿 자체는 {@code notification_templates} 테이블에서 조회.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationRenderer {

    private final NotificationTemplateRepository templateRepository;

    private SpringTemplateEngine engine;

    @PostConstruct
    void init() {
        StringTemplateResolver resolver = new StringTemplateResolver();
        resolver.setTemplateMode(TemplateMode.TEXT);
        // DB 템플릿이라 캐시 의미 작음 (변경되면 즉시 반영되어야 함)
        resolver.setCacheable(false);

        SpringTemplateEngine engine = new SpringTemplateEngine();
        engine.setTemplateResolver(resolver);
        this.engine = engine;
    }

    /**
     * 알림 유형 + 변수맵 → 렌더된 제목/본문/링크.
     *
     * @param notificationType C19 코드
     * @param variables 템플릿 변수 (예: documentTitle, recipientName, eventTime)
     * @throws ResponseStatusException 템플릿 행 없거나 비활성 상태인 경우
     */
    public RenderedMessage render(String notificationType, Map<String, Object> variables) {
        NotificationTemplate tpl = templateRepository.findByNotificationType(notificationType)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "알림 템플릿을 찾을 수 없습니다: " + notificationType));

        if (Boolean.FALSE.equals(tpl.getIsEnabled())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "비활성 상태인 알림 유형입니다: " + notificationType);
        }

        Context ctx = new Context();
        if (variables != null) {
            variables.forEach(ctx::setVariable);
        }

        String title   = engine.process(safe(tpl.getTitleTemplate()), ctx).trim();
        String body    = engine.process(safe(tpl.getBodyTemplate()),  ctx);
        String linkUrl = tpl.getLinkTemplate() == null
                ? null
                : engine.process(tpl.getLinkTemplate(), ctx).trim();

        return new RenderedMessage(title, body, linkUrl);
    }

    private static String safe(String s) {
        return s == null ? "" : s;
    }
}
