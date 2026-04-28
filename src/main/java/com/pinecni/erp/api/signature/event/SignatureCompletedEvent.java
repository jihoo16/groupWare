package com.pinecni.erp.api.signature.event;

/**
 * 문서의 모든 전자서명이 완료되었을 때 발행되는 이벤트.
 * <p>리스너가 카테고리 B 자동 PDF 생성을 트리거할 때 사용.</p>
 *
 * <p>발행 시점: {@code SignatureSessionServiceImpl.submitSignature()} 트랜잭션 커밋 직후
 * (TransactionPhase.AFTER_COMMIT). 메인 서명 트랜잭션이 PDF 생성에 묶이지 않도록 분리.</p>
 */
public record SignatureCompletedEvent(Long documentIdx, String documentType) {}
