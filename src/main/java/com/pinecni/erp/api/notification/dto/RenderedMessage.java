package com.pinecni.erp.api.notification.dto;

/**
 * NotificationRenderer 출력 — 템플릿에 변수를 채워 만든 최종 문자열들.
 */
public record RenderedMessage(String title, String body, String linkUrl) {
}
