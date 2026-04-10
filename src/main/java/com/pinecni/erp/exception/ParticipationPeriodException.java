package com.pinecni.erp.exception;

import lombok.Getter;

import java.util.List;

/**
 * 참여연구원 활성기간 검증 실패 예외
 *
 * 발생 케이스:
 * 1) 증빙 문서 작성/수정 시 — 사용자가 해당 지출 날짜(또는 기간)에 프로젝트 참여 중이 아님
 * 2) 프로젝트 멤버 기간 단축 시 — 새 기간 밖에 이미 작성된 문서가 존재함
 *
 * conflicts 필드는 어떤 사용자/문서가 어떤 사유로 충돌했는지 상세 정보를 담는다.
 */
@Getter
public class ParticipationPeriodException extends RuntimeException {

    /**
     * 충돌 사유 코드
     * - NOT_ACTIVE_ON_DATE   : 단일 날짜 검증 실패 (회의록, 야근식대 등)
     * - NOT_ACTIVE_DURING    : 기간 검증 실패 (출장, 출장+회의)
     * - ORPHAN_DOCUMENT      : 프로젝트 수정으로 기존 문서가 새 기간 밖으로 밀려남
     */
    private final String code;

    private final List<ParticipationConflictDTO> conflicts;

    public ParticipationPeriodException(String code, String message,
                                        List<ParticipationConflictDTO> conflicts) {
        super(message);
        this.code = code;
        this.conflicts = conflicts;
    }
}
