package com.pinecni.erp.util;

import com.pinecni.erp.api.user.UserRole;
import com.pinecni.erp.entity.ApprovalDocument;
import com.pinecni.erp.exception.UnauthorizedException;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;

/**
 * 권한 체크를 위한 공통 유틸리티 클래스
 */
@Slf4j
public class AuthorizationUtil {

    /** 세션에서 userRoleCode 를 읽어 UserRole 로 변환 */
    public static UserRole getCurrentRole(HttpSession session) {
        if (session == null) {
            return UserRole.USER;
        }
        Object roleCode = session.getAttribute("userRoleCode");
        if (roleCode instanceof String) {
            return UserRole.fromCode((String) roleCode);
        }
        return UserRole.USER;
    }

    public static boolean hasRoleAtLeast(HttpSession session, UserRole minimum) {
        return getCurrentRole(session).isAtLeast(minimum);
    }

    public static boolean isAdminOrHigher(HttpSession session) {
        return hasRoleAtLeast(session, UserRole.ADMIN);
    }

    public static boolean isDeveloperOnly(HttpSession session) {
        return getCurrentRole(session) == UserRole.DEVELOPER;
    }

    public static boolean canViewCompetency(HttpSession session) {
        return hasRoleAtLeast(session, UserRole.COMPETENCY_VIEWER);
    }

    public static void requireAdmin(HttpSession session) {
        if (!isAdminOrHigher(session)) {
            throw new UnauthorizedException("관리자만 접근할 수 있습니다.");
        }
    }

    public static void requireDeveloper(HttpSession session) {
        if (!isDeveloperOnly(session)) {
            throw new UnauthorizedException("개발자만 접근할 수 있습니다.");
        }
    }


    /**
     * 현재 사용자가 문서의 작성자인지 확인
     * - 관리자이거나 작성자가 아니면 UnauthorizedException 발생
     *
     * @param currentUserIdx 현재 로그인한 사용자 IDX (세션에서 가져옴)
     * @param document 문서 객체
     * @param isAdmin 관리자 여부
     * @throws UnauthorizedException 작성자가 아닌 경우
     */
    public static void validateDocumentOwner(Long currentUserIdx, ApprovalDocument document, Boolean isAdmin) {
        if (currentUserIdx == null) {
            log.warn("로그인하지 않은 사용자의 문서 접근 시도");
            throw new UnauthorizedException("로그인이 필요합니다.");
        }

        if (document == null) {
            log.warn("존재하지 않는 문서 접근 시도");
            throw new UnauthorizedException("문서를 찾을 수 없습니다.");
        }

        // 관리자는 모든 문서에 접근 가능
        if (isAdmin != null && isAdmin) {
            log.debug("관리자 권한으로 문서 접근 - 문서IDX: {}, 사용자: {}", document.getIdx(), currentUserIdx);
            return;
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
