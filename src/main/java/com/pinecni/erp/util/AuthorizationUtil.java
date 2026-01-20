package com.pinecni.erp.util;

import com.pinecni.erp.entity.ApprovalDocument;
import com.pinecni.erp.exception.UnauthorizedException;
import lombok.extern.slf4j.Slf4j;

/**
 * 권한 체크를 위한 공통 유틸리티 클래스
 * - 문서 작성자 확인
 * - 세션 사용자 확인
 */
@Slf4j
public class AuthorizationUtil {

    /**
     * 현재 사용자가 문서의 작성자인지 확인
     * - 작성자가 아니면 UnauthorizedException 발생
     *
     * @param currentUserIdx 현재 로그인한 사용자 IDX (세션에서 가져옴)
     * @param document 문서 객체
     * @throws UnauthorizedException 작성자가 아닌 경우
     */
    public static void validateDocumentOwner(Long currentUserIdx, ApprovalDocument document) {
        if (currentUserIdx == null) {
            log.warn("로그인하지 않은 사용자의 문서 접근 시도");
            throw new UnauthorizedException("로그인이 필요합니다.");
        }

        if (document == null) {
            log.warn("존재하지 않는 문서 접근 시도");
            throw new UnauthorizedException("문서를 찾을 수 없습니다.");
        }

        Long drafterUserIdx = document.getDrafterUserIdx();
        if (drafterUserIdx == null || !drafterUserIdx.equals(currentUserIdx)) {
            log.warn("권한 없는 문서 접근 시도 - 문서IDX: {}, 작성자: {}, 접근시도자: {}",
                    document.getIdx(), drafterUserIdx, currentUserIdx);
            throw new UnauthorizedException("이 문서에 접근할 권한이 없습니다.");
        }

        log.debug("문서 권한 확인 성공 - 문서IDX: {}, 사용자: {}", document.getIdx(), currentUserIdx);
    }

    /**
     * 현재 사용자가 특정 사용자 IDX와 동일한지 확인
     * - 다른 사용자면 UnauthorizedException 발생
     *
     * @param currentUserIdx 현재 로그인한 사용자 IDX
     * @param targetUserIdx 확인할 대상 사용자 IDX
     * @throws UnauthorizedException 사용자가 다른 경우
     */
    public static void validateUserMatch(Long currentUserIdx, Long targetUserIdx) {
        if (currentUserIdx == null) {
            log.warn("로그인하지 않은 사용자의 접근 시도");
            throw new UnauthorizedException("로그인이 필요합니다.");
        }

        if (targetUserIdx == null || !targetUserIdx.equals(currentUserIdx)) {
            log.warn("권한 없는 접근 시도 - 현재 사용자: {}, 대상 사용자: {}",
                    currentUserIdx, targetUserIdx);
            throw new UnauthorizedException("접근할 권한이 없습니다.");
        }

        log.debug("사용자 권한 확인 성공 - 사용자: {}", currentUserIdx);
    }

    /**
     * 세션 사용자 IDX가 유효한지 확인
     * - null이면 UnauthorizedException 발생
     *
     * @param currentUserIdx 현재 로그인한 사용자 IDX
     * @throws UnauthorizedException 로그인하지 않은 경우
     */
    public static void validateLogin(Long currentUserIdx) {
        if (currentUserIdx == null) {
            log.warn("로그인하지 않은 사용자의 접근 시도");
            throw new UnauthorizedException("로그인이 필요합니다.");
        }

        log.debug("로그인 확인 성공 - 사용자: {}", currentUserIdx);
    }
}
