package com.pinecni.erp.api.signature.service;

import com.pinecni.erp.api.approval.repository.ApprovalDocumentRepository;
import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.externalperson.repository.ExternalPersonRepository;
import com.pinecni.erp.api.signature.dto.SignatureEventMessage;
import com.pinecni.erp.api.signature.dto.SignatureSessionCreateRequest;
import com.pinecni.erp.api.signature.dto.SignatureSessionResponse;
import com.pinecni.erp.api.signature.dto.SignatureSubmitRequest;
import com.pinecni.erp.api.signature.dto.SignatureVerifyRequest;
import com.pinecni.erp.api.signature.dto.SignatureVerifyResponse;
import com.pinecni.erp.api.signature.repository.DocumentSignatureRepository;
import com.pinecni.erp.api.signature.repository.SignatureRequestRepository;
import com.pinecni.erp.api.signature.repository.SignatureSessionRepository;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.constant.CodeConstants;
import com.pinecni.erp.entity.ApprovalDocument;
import com.pinecni.erp.entity.Code;
import com.pinecni.erp.entity.DocumentSignature;
import com.pinecni.erp.entity.SignatureSession;
import com.pinecni.erp.entity.User;
import com.pinecni.erp.service.QrCodeService;
import com.pinecni.erp.service.SignatureWebSocketNotifier;
import com.pinecni.erp.util.SignatureTokenUtil;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

/**
 * 서명 세션 서비스 구현체
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SignatureSessionServiceImpl implements SignatureSessionService {

    private final SignatureSessionRepository signatureSessionRepository;
    private final DocumentSignatureRepository documentSignatureRepository;
    private final SignatureRequestRepository signatureRequestRepository;
    private final ApprovalDocumentRepository approvalDocumentRepository;
    private final UserRepository userRepository;
    private final CodeRepository codeRepository;
    private final ExternalPersonRepository externalPersonRepository;
    private final SignatureTokenUtil tokenUtil;
    private final QrCodeService qrCodeService;
    private final SignatureWebSocketNotifier wsNotifier;
    private final SignatureService signatureService;

    @Value("${signature.session.ttl-seconds:300}")
    private int sessionTtlSeconds;

    @Value("${signature.verify.max-fail-count:5}")
    private int maxFailCount;

    // ============================================================
    // 세션 생성
    // ============================================================

    @Override
    @Transactional
    public SignatureSessionResponse createSession(SignatureSessionCreateRequest request,
                                                   Long loginUserIdx,
                                                   String ipAddress) {
        Long documentIdx = request.getDocumentIdx();
        String signatureSlot = request.getSignatureSlot();

        // 1. 문서 존재 확인
        ApprovalDocument document = approvalDocumentRepository.findById(documentIdx)
                .orElseThrow(() -> new EntityNotFoundException("문서를 찾을 수 없습니다: " + documentIdx));

        // 2. 로그인 사용자가 이 슬롯의 서명자인지 확인
        Optional<DocumentSignature> docSigOpt = documentSignatureRepository
                .findByDocumentIdxAndSignerUserIdxAndSignatureSlot(documentIdx, loginUserIdx, signatureSlot);

        if (docSigOpt.isEmpty()) {
            // 이 문서에 본인 서명칸이 있는지 확인
            List<DocumentSignature> mySlots = documentSignatureRepository
                    .findByDocumentIdxOrderBySignatureOrderAscIdxAsc(documentIdx).stream()
                    .filter(ds -> loginUserIdx.equals(ds.getSignerUserIdx()) && ds.getLinkedSignatureIdx() == null)
                    .toList();
            if (mySlots.isEmpty()) {
                throw new IllegalStateException("이 문서에 본인의 서명칸이 없습니다.\n서명 대상자가 아닌 경우 서명할 수 없습니다.");
            } else {
                String mySlotNames = mySlots.stream()
                        .map(ds -> codeRepository.findByCode(ds.getSignatureSlot())
                                .map(c -> c.getCodeName()).orElse(ds.getSignatureSlot()))
                        .distinct().collect(java.util.stream.Collectors.joining(", "));
                throw new IllegalStateException("이 서명칸은 다른 결재자의 서명 칸입니다.\n본인의 서명칸: " + mySlotNames);
            }
        }

        DocumentSignature docSig = docSigOpt.get();

        // 3. 연동 서명 슬롯은 자동으로 메인으로 리다이렉트 (에러 대신 UX 흐름 끊지 않음)
        //    예: 신청자=참석자 겸임 → 참석자 셀 클릭해도 신청자(메인) 슬롯으로 QR 생성
        //    UI는 이미 메인 슬롯을 넘기도록 되어 있지만, 방어적으로 백엔드에서도 처리
        if (docSig.getLinkedSignatureIdx() != null) {
            DocumentSignature mainRow = documentSignatureRepository.findById(docSig.getLinkedSignatureIdx())
                    .orElseThrow(() -> new IllegalStateException(
                            "연동된 결재란을 찾을 수 없습니다.\n관리자에게 문의해주세요."));
            log.info("연동 슬롯 요청 → 메인으로 자동 전환: linkedSlot={}, mainSlot={}",
                    docSig.getSignatureSlot(), mainRow.getSignatureSlot());
            docSig = mainRow;
            signatureSlot = mainRow.getSignatureSlot();
        }

        // 4. 이미 서명 완료된 칸은 거부
        if (CodeConstants.DocumentSignatureStatus.COMPLETED.getCode().equals(docSig.getStatus())) {
            throw new IllegalStateException("이미 서명이 완료된 칸입니다.");
        }

        // 5. 차례가 왔는지 확인 (requested_at이 설정되어 있어야 함)
        if (docSig.getRequestedAt() == null) {
            throw new IllegalStateException("아직 서명 차례가 아닙니다.\n이전 단계 결재자의 서명이 완료되어야 합니다.");
        }

        // 6. 기존 PENDING 세션 취소 (동일 문서+서명자)
        List<SignatureSession> existingPending = signatureSessionRepository
                .findByDocumentIdxAndSignerUserIdxAndStatus(
                        documentIdx, loginUserIdx,
                        CodeConstants.SignatureSessionStatus.QR_CREATED.getCode());
        for (SignatureSession old : existingPending) {
            old.setStatus(CodeConstants.SignatureSessionStatus.CANCELLED.getCode());
            log.debug("기존 PENDING 세션 취소: token={}", old.getSessionToken());
        }

        // 7. 새 세션 생성
        String token = tokenUtil.generateToken();
        LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(sessionTtlSeconds);

        SignatureSession session = SignatureSession.builder()
                .sessionToken(token)
                .documentIdx(documentIdx)
                .signerUserIdx(loginUserIdx)
                .status(CodeConstants.SignatureSessionStatus.QR_CREATED.getCode())
                .verifyFailCount(0)
                .expiresAt(expiresAt)
                .createdUserIdx(loginUserIdx)
                .build();

        session = signatureSessionRepository.save(session);
        log.info("서명 세션 생성: token={}, documentIdx={}, signerUserIdx={}, slot={}",
                token, documentIdx, loginUserIdx, signatureSlot);

        // 8. 서명자 사번 조회 + QR 이미지 생성 (사번 해시 포함)
        User signerUser = userRepository.findById(loginUserIdx)
                .orElseThrow(() -> new EntityNotFoundException("서명자 정보를 찾을 수 없습니다"));
        String qrDataUrl = qrCodeService.generateSignatureQrDataUrl(token, signerUser.getEmpId());

        // 9. 응답 빌드
        return buildResponse(session, document, signatureSlot, qrDataUrl, false);
    }

    // ============================================================
    // 외부인 세션 생성 (사번 2차 인증 스킵)
    // ============================================================

    @Override
    @Transactional
    public SignatureSessionResponse createExternalSession(Long documentIdx,
                                                           Long externalPersonIdx,
                                                           Long loginUserIdx,
                                                           String ipAddress) {
        // 1. 문서 존재 확인
        ApprovalDocument document = approvalDocumentRepository.findById(documentIdx)
                .orElseThrow(() -> new EntityNotFoundException("문서를 찾을 수 없습니다: " + documentIdx));

        // 2. 외부인 서명 행 조회 (is_external=true + signer_user_idx=externalPersonIdx)
        List<DocumentSignature> rows = documentSignatureRepository
                .findByDocumentIdxOrderBySignatureOrderAscIdxAsc(documentIdx);
        DocumentSignature docSig = rows.stream()
                .filter(ds -> Boolean.TRUE.equals(ds.getIsExternal())
                        && externalPersonIdx.equals(ds.getSignerUserIdx())
                        && ds.getLinkedSignatureIdx() == null)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "해당 외부 참석자의 서명 칸을 찾을 수 없습니다."));

        // 3. 이미 서명 완료 / 차례 아님 검증
        if (CodeConstants.DocumentSignatureStatus.COMPLETED.getCode().equals(docSig.getStatus())) {
            throw new IllegalStateException("이미 서명이 완료된 칸입니다.");
        }
        if (docSig.getRequestedAt() == null) {
            throw new IllegalStateException(
                    "아직 서명 차례가 아닙니다.\n이전 단계 결재자의 서명이 완료되어야 합니다.");
        }

        // 4. 동일 문서+외부인의 기존 PENDING 세션 취소
        List<SignatureSession> existingPending = signatureSessionRepository
                .findByDocumentIdxAndSignerUserIdxAndStatus(
                        documentIdx, externalPersonIdx,
                        CodeConstants.SignatureSessionStatus.QR_CREATED.getCode());
        for (SignatureSession old : existingPending) {
            if (Boolean.TRUE.equals(old.getIsExternal())) {
                old.setStatus(CodeConstants.SignatureSessionStatus.CANCELLED.getCode());
            }
        }

        // 5. 외부 세션 생성 (is_external=true)
        String token = tokenUtil.generateToken();
        LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(sessionTtlSeconds);

        SignatureSession session = SignatureSession.builder()
                .sessionToken(token)
                .documentIdx(documentIdx)
                .signerUserIdx(externalPersonIdx)
                .status(CodeConstants.SignatureSessionStatus.QR_CREATED.getCode())
                .verifyFailCount(0)
                .expiresAt(expiresAt)
                .createdUserIdx(loginUserIdx)
                .isExternal(true)
                .build();

        session = signatureSessionRepository.save(session);
        log.info("외부인 서명 세션 생성: token={}, documentIdx={}, externalPersonIdx={}",
                token, documentIdx, externalPersonIdx);

        // 6. QR 생성 (사번 해시 필요 없음 — 외부는 인증 스킵)
        String qrDataUrl = qrCodeService.generateSignatureQrDataUrl(token, null);

        // 7. 응답
        return buildResponse(session, document, docSig.getSignatureSlot(), qrDataUrl, false);
    }

    // ============================================================
    // 세션 정보 조회 (토큰 기반, 모바일)
    // ============================================================

    @Override
    public SignatureSessionResponse getSessionByToken(String token) {
        if (!tokenUtil.isValidFormat(token)) {
            throw new IllegalArgumentException("잘못된 토큰 형식");
        }

        SignatureSession session = signatureSessionRepository.findBySessionToken(token)
                .orElseThrow(() -> new EntityNotFoundException("세션을 찾을 수 없습니다"));

        // 만료 체크 (expires_at 경과 시 자동 EXPIRED 처리 시도)
        checkAndMarkExpired(session);

        ApprovalDocument document = approvalDocumentRepository.findById(session.getDocumentIdx())
                .orElseThrow(() -> new EntityNotFoundException("문서를 찾을 수 없습니다"));

        // 서명 슬롯 정보 조회 (document_signatures에서 역추적)
        // 외부/내부 세션 구분해서 매칭해야 external_person.idx ↔ users.idx 숫자 충돌 방지
        boolean sessionIsExternal = Boolean.TRUE.equals(session.getIsExternal());
        List<DocumentSignature> docSigs = documentSignatureRepository
                .findByDocumentIdxOrderBySignatureOrderAscIdxAsc(session.getDocumentIdx());
        String signatureSlot = docSigs.stream()
                .filter(ds -> ds.getSignerUserIdx().equals(session.getSignerUserIdx())
                        && ds.getLinkedSignatureIdx() == null
                        && Boolean.TRUE.equals(ds.getIsExternal()) == sessionIsExternal)
                .map(DocumentSignature::getSignatureSlot)
                .findFirst()
                .orElse(null);

        boolean verified = CodeConstants.SignatureSessionStatus.VERIFIED.getCode().equals(session.getStatus())
                || CodeConstants.SignatureSessionStatus.COMPLETED.getCode().equals(session.getStatus());

        return buildResponse(session, document, signatureSlot, null, verified);
    }

    // ============================================================
    // QR 스캔 처리
    // ============================================================

    @Override
    @Transactional
    public SignatureSessionResponse scanSession(String token, String ipAddress, String userAgent) {
        SignatureSession session = signatureSessionRepository.findBySessionToken(token)
                .orElseThrow(() -> new EntityNotFoundException("세션을 찾을 수 없습니다"));

        checkAndMarkExpired(session);

        String currentStatus = session.getStatus();

        // 이미 SCANNED/VERIFIED/COMPLETED 상태면 기존 정보 반환 (멱등성)
        if (CodeConstants.SignatureSessionStatus.QR_CREATED.getCode().equals(currentStatus)) {
            LocalDateTime nowTs = LocalDateTime.now();
            session.setScannedAt(nowTs);
            session.setScannedIp(ipAddress);
            session.setScannedUserAgent(userAgent);

            // 외부인 세션: 사번 2차 인증 스킵 — 스캔과 동시에 VERIFIED로 전이
            if (Boolean.TRUE.equals(session.getIsExternal())) {
                session.setStatus(CodeConstants.SignatureSessionStatus.VERIFIED.getCode());
                session.setVerifiedAt(nowTs);
                signatureSessionRepository.save(session);
                log.info("외부인 QR 스캔 + 자동 인증 완료: token={}, ip={}", token, ipAddress);

                // PC에 SCANNED + VERIFIED 이벤트 연속 발송 (기존 진행바 UX와 일치)
                wsNotifier.sendSessionEvent(token, SignatureEventMessage.builder()
                        .eventType("SCANNED")
                        .sessionToken(token)
                        .documentIdx(session.getDocumentIdx())
                        .timestamp(nowTs)
                        .build());
                wsNotifier.sendSessionEvent(token, SignatureEventMessage.builder()
                        .eventType("VERIFIED")
                        .sessionToken(token)
                        .documentIdx(session.getDocumentIdx())
                        .timestamp(nowTs)
                        .build());
            } else {
                session.setStatus(CodeConstants.SignatureSessionStatus.SCANNED.getCode());
                signatureSessionRepository.save(session);
                log.info("QR 스캔 처리: token={}, ip={}", token, ipAddress);

                wsNotifier.sendSessionEvent(token, SignatureEventMessage.builder()
                        .eventType("SCANNED")
                        .sessionToken(token)
                        .documentIdx(session.getDocumentIdx())
                        .timestamp(nowTs)
                        .build());
            }
        }

        return getSessionByToken(token);
    }

    // ============================================================
    // 사번 2차 인증
    // ============================================================

    @Override
    @Transactional
    public SignatureVerifyResponse verifySession(String token,
                                                  SignatureVerifyRequest request,
                                                  String ipAddress) {
        SignatureSession session = signatureSessionRepository.findBySessionToken(token)
                .orElseThrow(() -> new EntityNotFoundException("세션을 찾을 수 없습니다"));

        checkAndMarkExpired(session);

        // 상태 확인: SCANNED만 인증 진입 가능 (이미 VERIFIED면 재인증 불필요)
        String currentStatus = session.getStatus();
        if (CodeConstants.SignatureSessionStatus.VERIFIED.getCode().equals(currentStatus)) {
            // 이미 인증 완료 - 바로 성공 반환
            User signer = userRepository.findById(session.getSignerUserIdx())
                    .orElseThrow(() -> new EntityNotFoundException("서명자를 찾을 수 없습니다"));
            return SignatureVerifyResponse.builder()
                    .success(true)
                    .status(currentStatus)
                    .failCount(session.getVerifyFailCount())
                    .maxFailCount(maxFailCount)
                    .sessionExpired(false)
                    .signerNameFull(signer.getEmpName())
                    .build();
        }

        if (!CodeConstants.SignatureSessionStatus.SCANNED.getCode().equals(currentStatus)) {
            throw new IllegalStateException("인증 가능한 세션 상태가 아닙니다: " + currentStatus);
        }

        // 서명자 사번 검증 (HMAC 해시 + DB 이중 검증)
        User signer = userRepository.findById(session.getSignerUserIdx())
                .orElseThrow(() -> new EntityNotFoundException("서명자를 찾을 수 없습니다"));

        String inputEmpId = request.getEmpId() == null ? "" : request.getEmpId().trim();
        String verifyHash = request.getVerifyHash(); // QR URL의 vh 파라미터

        // 빈 사번 입력 차단
        if (inputEmpId.isEmpty()) {
            throw new IllegalStateException("사번을 입력해주세요.");
        }

        // 서명자 사번이 DB에 없는 경우 차단
        if (signer.getEmpId() == null || signer.getEmpId().isBlank()) {
            log.error("서명자 사번 미등록: signerUserIdx={}", session.getSignerUserIdx());
            throw new IllegalStateException("서명자의 사번이 등록되지 않았습니다.\n관리부에 문의해주세요.");
        }

        boolean matched;
        if (verifyHash != null && !verifyHash.isBlank()) {
            // QR URL 해시 기반 검증 (HMAC-SHA256)
            matched = qrCodeService.verifyEmpIdHash(inputEmpId, token, verifyHash);
        } else {
            // 해시 없는 경우 DB 기반 폴백 (레거시 호환)
            matched = signer.getEmpId().equals(inputEmpId);
        }

        if (matched) {
            // 인증 성공
            session.setStatus(CodeConstants.SignatureSessionStatus.VERIFIED.getCode());
            session.setVerifiedAt(LocalDateTime.now());
            signatureSessionRepository.save(session);

            log.info("사번 2차 인증 성공: token={}, signer={}", token, signer.getEmpId());

            wsNotifier.sendSessionEvent(token, SignatureEventMessage.builder()
                    .eventType("VERIFIED")
                    .sessionToken(token)
                    .documentIdx(session.getDocumentIdx())
                    .timestamp(LocalDateTime.now())
                    .build());

            return SignatureVerifyResponse.builder()
                    .success(true)
                    .status(session.getStatus())
                    .failCount(session.getVerifyFailCount())
                    .maxFailCount(maxFailCount)
                    .sessionExpired(false)
                    .signerNameFull(signer.getEmpName())
                    .build();
        }

        // 인증 실패
        session.setVerifyFailCount(session.getVerifyFailCount() + 1);
        int failCount = session.getVerifyFailCount();
        boolean expired = false;

        if (failCount >= maxFailCount) {
            session.setStatus(CodeConstants.SignatureSessionStatus.EXPIRED.getCode());
            expired = true;
            log.warn("사번 인증 실패 {}회 초과, 세션 만료 처리: token={}", maxFailCount, token);
        } else {
            log.info("사번 인증 실패: token={}, failCount={}", token, failCount);
        }

        signatureSessionRepository.save(session);

        wsNotifier.sendSessionEvent(token, SignatureEventMessage.builder()
                .eventType(expired ? "EXPIRED" : "VERIFY_FAILED")
                .sessionToken(token)
                .documentIdx(session.getDocumentIdx())
                .timestamp(LocalDateTime.now())
                .message("사번 불일치 (" + failCount + "/" + maxFailCount + ")")
                .build());

        return SignatureVerifyResponse.builder()
                .success(false)
                .status(session.getStatus())
                .failCount(failCount)
                .maxFailCount(maxFailCount)
                .sessionExpired(expired)
                .message(expired
                        ? "인증 실패 횟수 초과로 세션이 만료되었습니다. PC에서 QR을 다시 생성해주세요."
                        : "사번이 일치하지 않습니다. (" + failCount + "/" + maxFailCount + ")")
                .build();
    }

    // ============================================================
    // 서명 제출
    // ============================================================

    @Override
    @Transactional
    public void submitSignature(String token,
                                 SignatureSubmitRequest request,
                                 String ipAddress,
                                 String userAgent) {
        SignatureSession session = signatureSessionRepository.findBySessionToken(token)
                .orElseThrow(() -> new EntityNotFoundException("세션을 찾을 수 없습니다"));

        checkAndMarkExpired(session);

        // 상태 검증: VERIFIED 상태에서만 서명 제출 가능
        if (!CodeConstants.SignatureSessionStatus.VERIFIED.getCode().equals(session.getStatus())) {
            throw new IllegalStateException("서명 제출 가능한 세션 상태가 아닙니다: " + session.getStatus());
        }

        // Base64 이미지 디코딩
        byte[] imageBytes = decodeBase64Image(request.getSignatureImageBase64());
        if (imageBytes.length == 0) {
            throw new IllegalArgumentException("빈 서명 이미지");
        }

        Long documentIdx = session.getDocumentIdx();
        Long signerUserIdx = session.getSignerUserIdx();
        boolean sessionIsExternal = Boolean.TRUE.equals(session.getIsExternal());

        // 해당 서명자의 document_signatures 행 조회 (linked 없는 행만 메인)
        // 외부/내부 구분 필수 — external_person.idx ↔ users.idx 숫자 충돌 방지
        List<DocumentSignature> docSigs = documentSignatureRepository
                .findByDocumentIdxOrderBySignatureOrderAscIdxAsc(documentIdx);

        DocumentSignature mainRow = docSigs.stream()
                .filter(ds -> ds.getSignerUserIdx().equals(signerUserIdx)
                        && ds.getLinkedSignatureIdx() == null
                        && CodeConstants.DocumentSignatureStatus.PENDING.getCode().equals(ds.getStatus())
                        && Boolean.TRUE.equals(ds.getIsExternal()) == sessionIsExternal)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("서명할 메인 슬롯이 없습니다"));

        LocalDateTime now = LocalDateTime.now();
        List<Long> completedIdxList = new ArrayList<>();

        // 1. 메인 행 서명 처리
        mainRow.setStatus(CodeConstants.DocumentSignatureStatus.COMPLETED.getCode());
        mainRow.setSignatureImage(imageBytes);
        mainRow.setSignedAt(now);
        mainRow.setSignatureSessionIdx(session.getIdx());
        documentSignatureRepository.saveAndFlush(mainRow);
        completedIdxList.add(mainRow.getIdx());
        log.info("서명 완료: documentIdx={}, slot={}, signerUserIdx={}",
                documentIdx, mainRow.getSignatureSlot(), signerUserIdx);

        // 2. 연동 서명 처리 (linked_signature_idx가 이 행을 가리키는 하위 행들)
        List<DocumentSignature> linkedRows = documentSignatureRepository
                .findByLinkedSignatureIdx(mainRow.getIdx());
        for (DocumentSignature linked : linkedRows) {
            linked.setStatus(CodeConstants.DocumentSignatureStatus.COMPLETED.getCode());
            linked.setSignatureImage(imageBytes);
            linked.setSignedAt(now);
            linked.setSignatureSessionIdx(session.getIdx());
            documentSignatureRepository.saveAndFlush(linked);
            completedIdxList.add(linked.getIdx());
            log.info("연동 서명 자동 완료: linkedIdx={}, slot={}",
                    linked.getIdx(), linked.getSignatureSlot());
        }

        // 3. signature_sessions 상태 COMPLETED
        session.setStatus(CodeConstants.SignatureSessionStatus.COMPLETED.getCode());
        session.setCompletedAt(now);
        signatureSessionRepository.save(session);

        // 4. signature_requests 완료 처리 (메인 + 연동)
        signatureRequestRepository.markCompletedByDocumentSignatureIdx(mainRow.getIdx());
        for (DocumentSignature linked : linkedRows) {
            signatureRequestRepository.markCompletedByDocumentSignatureIdx(linked.getIdx());
        }

        // 5. 순차 서명 단계 전진 (현재 order 전원 완료 시 다음 단계 활성화)
        signatureService.advanceToNextOrder(documentIdx, mainRow.getSignatureOrder());

        // 6. PC에 WebSocket "COMPLETED" 이벤트 발송
        String imageDataUrl = "data:image/png;base64," + Base64.getEncoder().encodeToString(imageBytes);
        // 프론트 토스트 알림용 부가 정보
        String slotLabel = codeRepository.findByGroupCodeAndCode(
                        CodeConstants.GroupCode.SIGNATURE_SLOT.getCode(), mainRow.getSignatureSlot())
                .map(Code::getCodeName).orElse(mainRow.getSignatureSlot());
        // 외부/내부 분기해 서명자 이름 조회
        String signerName = sessionIsExternal
                ? externalPersonRepository.findById(signerUserIdx)
                        .map(ep -> ep.getName()).orElse("")
                : userRepository.findById(signerUserIdx)
                        .map(User::getEmpName).orElse("");

        SignatureEventMessage event = SignatureEventMessage.builder()
                .eventType("COMPLETED")
                .sessionToken(token)
                .documentIdx(documentIdx)
                .signatureSlot(mainRow.getSignatureSlot())
                .signatureSlotLabel(slotLabel)
                .signerName(signerName)
                .signatureImageDataUrl(imageDataUrl)
                .signedDocumentSignatureIdxList(completedIdxList)
                .timestamp(now)
                .build();

        wsNotifier.sendSessionEvent(token, event);
        wsNotifier.sendDocumentEvent(documentIdx, event);
    }

    // ============================================================
    // 세션 취소
    // ============================================================

    @Override
    @Transactional
    public void cancelSession(String token, Long loginUserIdx) {
        SignatureSession session = signatureSessionRepository.findBySessionToken(token)
                .orElseThrow(() -> new EntityNotFoundException("세션을 찾을 수 없습니다"));

        // 세션 생성자만 취소 가능
        if (!session.getCreatedUserIdx().equals(loginUserIdx)) {
            throw new IllegalStateException("세션 생성자만 취소할 수 있습니다");
        }

        // 이미 종료 상태면 무시
        CodeConstants.SignatureSessionStatus status =
                CodeConstants.SignatureSessionStatus.fromCodeOrNull(session.getStatus());
        if (status != null && status.isTerminal()) {
            return;
        }

        session.setStatus(CodeConstants.SignatureSessionStatus.CANCELLED.getCode());
        signatureSessionRepository.save(session);

        wsNotifier.sendSessionEvent(token, SignatureEventMessage.builder()
                .eventType("CANCELLED")
                .sessionToken(token)
                .documentIdx(session.getDocumentIdx())
                .timestamp(LocalDateTime.now())
                .build());

        log.info("서명 세션 취소: token={}", token);
    }

    // ============================================================
    // 헬퍼 메서드
    // ============================================================

    /**
     * 만료 시각 지났는데 상태가 살아있으면 EXPIRED 처리
     */
    private void checkAndMarkExpired(SignatureSession session) {
        CodeConstants.SignatureSessionStatus status =
                CodeConstants.SignatureSessionStatus.fromCodeOrNull(session.getStatus());
        if (status != null && status.isTerminal()) {
            return;
        }
        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            session.setStatus(CodeConstants.SignatureSessionStatus.EXPIRED.getCode());
            signatureSessionRepository.save(session);
            log.info("세션 만료 자동 처리: token={}", session.getSessionToken());
        }
    }

    /**
     * "data:image/png;base64,..." prefix 제거 후 byte[] 변환
     */
    private byte[] decodeBase64Image(String base64String) {
        if (base64String == null) return new byte[0];
        String payload = base64String.trim();
        int commaIdx = payload.indexOf(',');
        if (payload.startsWith("data:") && commaIdx > 0) {
            payload = payload.substring(commaIdx + 1);
        }
        try {
            return Base64.getDecoder().decode(payload);
        } catch (IllegalArgumentException e) {
            log.error("Base64 디코딩 실패: {}", e.getMessage());
            throw new IllegalArgumentException("잘못된 서명 이미지 형식");
        }
    }

    /**
     * 응답 DTO 빌드 공통 로직
     */
    private SignatureSessionResponse buildResponse(SignatureSession session,
                                                    ApprovalDocument document,
                                                    String signatureSlot,
                                                    String qrDataUrl,
                                                    boolean verified) {
        boolean isExternal = Boolean.TRUE.equals(session.getIsExternal());

        String signerName;
        String positionName = "";
        String signerCompany = null;

        if (isExternal) {
            // 외부인: external_person에서 이름/소속 조회
            var ep = externalPersonRepository.findById(session.getSignerUserIdx()).orElse(null);
            signerName = ep != null ? ep.getName() : "외부 인원";
            positionName = ep != null && ep.getPosition() != null ? ep.getPosition() : "";
            signerCompany = ep != null ? ep.getCompanyName() : null;
        } else {
            User signer = userRepository.findById(session.getSignerUserIdx()).orElse(null);
            signerName = signer != null ? signer.getEmpName() : "알 수 없음";
            positionName = signer != null && signer.getEmpPosition() != null
                    ? codeRepository.findByGroupCodeAndCode(
                            CodeConstants.GroupCode.POSITION.getCode(), signer.getEmpPosition())
                            .map(Code::getCodeName).orElse("")
                    : "";
        }

        String signerNameFull = signerName + (positionName.isEmpty() ? "" : " " + positionName);
        // 외부인은 사번 인증이 없으므로 마스킹 불필요 — 풀네임 그대로 보여줘 본인 확인 돕기
        String signerNameMasked = isExternal
                ? signerNameFull
                : maskName(signerName) + (positionName.isEmpty() ? "" : " " + positionName);

        String slotLabel = null;
        if (signatureSlot != null) {
            slotLabel = codeRepository.findByGroupCodeAndCode(
                    CodeConstants.GroupCode.SIGNATURE_SLOT.getCode(), signatureSlot)
                    .map(Code::getCodeName).orElse(null);
        }

        String docTypeName = codeRepository.findByGroupCodeAndCode(
                CodeConstants.GroupCode.DOCUMENT_TYPE.getCode(), document.getDocumentType())
                .map(Code::getCodeName).orElse(document.getDocumentType());

        return SignatureSessionResponse.builder()
                .sessionToken(session.getSessionToken())
                .qrDataUrl(qrDataUrl)
                .expiresAt(session.getExpiresAt())
                .status(session.getStatus())
                .documentIdx(document.getIdx())
                .documentNo(document.getDocumentNo())
                .documentTitle(document.getTitle())
                .documentType(document.getDocumentType())
                .documentTypeName(docTypeName)
                .signatureSlot(signatureSlot)
                .signatureSlotLabel(slotLabel)
                .signerNameMasked(signerNameMasked)
                .signerNameFull((verified || isExternal) ? signerNameFull : null)
                .verifyFailCount(session.getVerifyFailCount())
                .verified(verified || isExternal)
                .isExternal(isExternal)
                .signerCompany(signerCompany)
                .build();
    }

    /**
     * 이름 마스킹: 홍길동 → 홍**, 홍 → 홍, 김 철수 → 김**
     */
    private String maskName(String name) {
        if (name == null || name.isEmpty()) return "";
        if (name.length() == 1) return name;
        if (name.length() == 2) return name.charAt(0) + "*";
        return name.charAt(0) + "*".repeat(name.length() - 1);
    }
}
