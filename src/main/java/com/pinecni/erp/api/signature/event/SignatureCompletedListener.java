package com.pinecni.erp.api.signature.event;

import com.pinecni.erp.api.signature.service.AutoSignedPdfService;
import com.pinecni.erp.api.signature.service.SignatureService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * {@link SignatureCompletedEvent} 리스너 — 카테고리 B 문서의 자동 PDF 생성을 비동기로 실행.
 *
 * <p>분리 이유:
 * <ul>
 *   <li>메인 서명 트랜잭션과 PDF 생성을 분리 — PDF 실패가 서명 commit을 막지 않게</li>
 *   <li>비동기 — Playwright 호출(수 초 소요)이 모바일 응답을 지연시키지 않게</li>
 * </ul></p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SignatureCompletedListener {

    private final SignatureService signatureService;
    private final AutoSignedPdfService autoSignedPdfService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSignatureCompleted(SignatureCompletedEvent event) {
        Long documentIdx = event.documentIdx();
        try {
            // 문서의 모든 슬롯이 실제로 완료되었는지 재확인 (개별 서명 제출마다 이벤트 발행되므로)
            if (!signatureService.isAllSignaturesComplete(documentIdx)) {
                return;
            }
            if (!autoSignedPdfService.isCategoryB(event.documentType())) {
                return;
            }
            log.info("[자동 PDF] 비동기 생성 시작: documentIdx={}, docType={}",
                    documentIdx, event.documentType());
            autoSignedPdfService.generate(documentIdx);
            log.info("[자동 PDF] 비동기 생성 성공: documentIdx={}", documentIdx);
        } catch (Exception e) {
            // 실패해도 서명은 이미 완료됨 — 로그 남기고 끝.
            // 사용자는 상세 화면에서 [PDF 다시 생성하기] 버튼으로 재시도 가능.
            log.error("[자동 PDF] 비동기 생성 실패: documentIdx={}, error={}",
                    documentIdx, e.getMessage(), e);
        }
    }
}
