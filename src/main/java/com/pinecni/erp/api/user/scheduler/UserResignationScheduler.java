package com.pinecni.erp.api.user.scheduler;

import com.pinecni.erp.api.code.repository.CodeRepository;
import com.pinecni.erp.api.notification.dto.NotificationCreateCommand;
import com.pinecni.erp.api.notification.service.NotificationEnqueueService;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * 퇴사예정일 자동 처리 스케줄러.
 *
 * <p>매일 00:00 KST 에 planned_resignation_date <= today 인 활성 사용자를 일괄
 * 퇴사 처리한다 (서버 다운 등으로 누락된 과거 예정자도 함께 처리되도록 <= 비교).
 *
 * <p>처리 내용 (사용자 1명당):
 * <ol>
 *   <li>emp_status = '퇴사' 로 전환</li>
 *   <li>deleted_at = now() (Soft Delete)</li>
 *   <li>deleted_user_idx = planned_resignation_user_idx (예약자가 처리자)</li>
 *   <li>ADMIN+ 전원에게 C1916 알림 (INWEB 채널)</li>
 * </ol>
 *
 * <p>알림은 INWEB 채널만 — Mattermost 봇 설정 의존성을 피하고 인박스에 누적되도록.
 * 디스패처가 INWEB 행은 즉시 SENT 처리한다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class UserResignationScheduler {

    private static final DateTimeFormatter EVENT_TIME_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final String NOTIFICATION_TYPE = "C1916";
    private static final String CHANNEL_INWEB = "C2103";
    private static final String DEEP_LINK = "/hr";

    private final UserRepository userRepository;
    private final CodeRepository codeRepository;
    private final NotificationEnqueueService notificationEnqueueService;

    /**
     * 매일 00:00 KST 실행. 자정에 한 번만 도는 가벼운 작업이라 별도 분리 작업은 불필요.
     */
    @Scheduled(cron = "0 0 0 * * ?", zone = "Asia/Seoul")
    public void processPlannedResignations() {
        LocalDate today = LocalDate.now();
        log.info("=== [퇴사 자동처리] 시작 ({}) ===", today);

        List<User> targets;
        try {
            targets = userRepository.findUsersDueForAutoResignation(today);
        } catch (Exception e) {
            log.error("[퇴사 자동처리] 대상 조회 실패 ({}): {}", today, e.getMessage(), e);
            return;
        }

        if (targets.isEmpty()) {
            log.info("=== [퇴사 자동처리] 처리 대상 없음 ({}) ===", today);
            return;
        }

        int success = 0;
        int failed = 0;
        for (User user : targets) {
            try {
                processOne(user);
                success++;
            } catch (Exception e) {
                failed++;
                log.error("[퇴사 자동처리] 개별 처리 실패 — userIdx={}, empId={}, error={}",
                        user.getIdx(), user.getEmpId(), e.getMessage(), e);
            }
        }

        log.info("=== [퇴사 자동처리] 완료 ({}) — 대상={}, 성공={}, 실패={} ===",
                today, targets.size(), success, failed);
    }

    /**
     * 사용자 1명에 대한 퇴사 처리 + 알림. 각 건을 독립 트랜잭션으로 분리해 한 명 실패가 다른
     * 건을 막지 않게 한다.
     */
    @Transactional
    public void processOne(User user) {
        Long plannedByIdx = user.getPlannedResignationUserIdx();
        LocalDate plannedDate = user.getPlannedResignationDate();
        LocalDateTime now = LocalDateTime.now();

        user.setEmpStatus("퇴사");
        user.setDeletedAt(now);
        user.setDeletedUserIdx(plannedByIdx); // 예약한 ADMIN 의 idx 가 처리자
        user.setUpdatedAt(now);
        user.setUpdatedUserIdx(plannedByIdx);
        userRepository.save(user);

        log.info("[퇴사 자동처리] 처리 완료 — userIdx={}, empId={}, empName={}, plannedDate={}, plannedBy={}",
                user.getIdx(), user.getEmpId(), user.getEmpName(), plannedDate, plannedByIdx);

        // 알림 발송 — ADMIN+ 전원에게 INWEB 인박스 알림
        notifyAdmins(user, plannedDate, plannedByIdx, now);
    }

    private void notifyAdmins(User resignedUser, LocalDate plannedDate, Long plannedByIdx, LocalDateTime eventTime) {
        List<User> admins;
        try {
            admins = userRepository.findActiveAdmins();
        } catch (Exception e) {
            log.error("[퇴사 자동처리] 알림 대상(ADMIN) 조회 실패 — userIdx={}: {}",
                    resignedUser.getIdx(), e.getMessage(), e);
            return;
        }

        if (admins.isEmpty()) {
            log.warn("[퇴사 자동처리] 알림 수신 ADMIN 이 없음 — 알림 스킵 (userIdx={})", resignedUser.getIdx());
            return;
        }

        String deptName = lookupCodeName("C01", resignedUser.getEmpDept());
        String positionName = lookupCodeName("C02", resignedUser.getEmpPosition());
        String plannedByName = lookupUserName(plannedByIdx);
        String eventTimeStr = eventTime.format(EVENT_TIME_FMT);
        String plannedDateStr = plannedDate != null ? plannedDate.toString() : "-";

        for (User admin : admins) {
            try {
                notificationEnqueueService.enqueue(NotificationCreateCommand.builder()
                        .notificationType(NOTIFICATION_TYPE)
                        .channel(CHANNEL_INWEB)
                        .recipientUserIdx(admin.getIdx())
                        .actorUserIdx(plannedByIdx) // 예약한 ADMIN 이 actor (시스템 처리지만 사용자 의도가 그쪽)
                        .targetIdx(resignedUser.getIdx())
                        .variable("empName", resignedUser.getEmpName())
                        .variable("empId", resignedUser.getEmpId())
                        .variable("deptName", deptName)
                        .variable("positionName", positionName)
                        .variable("plannedDate", plannedDateStr)
                        .variable("plannedByName", plannedByName)
                        .variable("eventTime", eventTimeStr)
                        .variable("deepLink", DEEP_LINK)
                        .dedupKey("USER_AUTO_RESIGNED:" + resignedUser.getIdx() + ":" + admin.getIdx())
                        .forceSend(true)
                        .build());
            } catch (Exception e) {
                log.error("[퇴사 자동처리] 알림 발송 실패 — adminIdx={}, userIdx={}: {}",
                        admin.getIdx(), resignedUser.getIdx(), e.getMessage(), e);
            }
        }

        log.info("[퇴사 자동처리] 알림 발송 완료 — 대상 ADMIN {} 명 (userIdx={})",
                admins.size(), resignedUser.getIdx());
    }

    private String lookupCodeName(String groupCode, String code) {
        if (code == null || code.isBlank()) return "-";
        return codeRepository.findByGroupCodeAndCode(groupCode, code)
                .map(c -> c.getCodeName())
                .orElse(code);
    }

    private String lookupUserName(Long userIdx) {
        if (userIdx == null) return "시스템";
        return userRepository.findById(userIdx)
                .map(User::getEmpName)
                .orElse("(idx=" + userIdx + ")");
    }
}
