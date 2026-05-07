package com.pinecni.erp.api.notification.service;

import com.pinecni.erp.api.notification.client.MattermostClient;
import com.pinecni.erp.api.notification.client.MattermostClient.MattermostApiException;
import com.pinecni.erp.api.notification.client.MattermostClient.MattermostErrorKind;
import com.pinecni.erp.api.notification.client.MattermostClient.MmChannel;
import com.pinecni.erp.api.notification.client.MattermostClient.MmPost;
import com.pinecni.erp.api.notification.client.MattermostClient.MmUser;
import com.pinecni.erp.api.notification.dto.BotConnectionTestResponse;
import com.pinecni.erp.api.notification.dto.TestSendResponse;
import com.pinecni.erp.api.notification.repository.NotificationSettingsRepository;
import com.pinecni.erp.api.notification.util.BotTokenCipher;
import com.pinecni.erp.api.user.repository.UserRepository;
import com.pinecni.erp.entity.NotificationSettings;
import com.pinecni.erp.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class BotConnectionTestServiceImpl implements BotConnectionTestService {

    private final NotificationSettingsRepository repository;
    private final BotTokenCipher tokenCipher;
    private final MattermostClient mmClient;
    private final UserRepository userRepository;

    private static final DateTimeFormatter HUMAN_TIME =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    @Transactional
    public BotConnectionTestResponse testConnection(Long currentUserIdx) {
        NotificationSettings settings = repository.findById(NotificationSettings.SINGLETON_IDX)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "알림 시스템 설정 행이 존재하지 않습니다."));

        // ─── 사전 점검: 입력 자체가 비어있으면 굳이 호출 안 함 ─────────────
        if (isBlank(settings.getServerUrl())) {
            return botFail("Mattermost 서버 URL 이 입력되어 있지 않습니다. 서버 URL 을 입력하고 [저장] 후 다시 테스트해 주세요.");
        }
        String plainToken;
        try {
            plainToken = tokenCipher.decrypt(settings.getBotTokenEnc());
        } catch (Exception e) {
            log.error("[봇 연결 테스트] 토큰 복호화 실패", e);
            return botFail("저장된 봇 토큰을 읽지 못했습니다. [봇 토큰 변경] 으로 토큰을 다시 입력하고 [저장] 후 시도해 주세요.");
        }
        if (plainToken == null || plainToken.isBlank()) {
            return botFail("봇 토큰이 등록되어 있지 않습니다. [봇 토큰 변경] 으로 토큰을 입력하고 [저장] 후 다시 테스트해 주세요.");
        }

        // ─── 1단계: 봇 인증 ──────────────────────────────────────────────
        MmUser me;
        try {
            me = mmClient.getMe(settings.getServerUrl(), plainToken);
        } catch (MattermostApiException e) {
            log.warn("[봇 연결 테스트] 봇 인증 실패 — kind={}, status={}, userIdx={}",
                    e.getKind(), e.getStatusCode(), currentUserIdx);
            return botFail(translateBotError(e.getKind()));
        }
        if (me == null || isBlank(me.id())) {
            return botFail("Mattermost 응답에서 봇 정보를 읽지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }

        // 봇 식별자 자동 채움 + 저장
        boolean botUserIdChanged = !me.id().equals(settings.getBotUserId());
        if (botUserIdChanged) {
            settings.setBotUserId(me.id());
            settings.setUpdatedAt(LocalDateTime.now());
            settings.setUpdatedUserIdx(currentUserIdx);
            repository.save(settings);
            log.info("[봇 연결 테스트] 봇 식별자 갱신 — botUserId={}, userIdx={}", me.id(), currentUserIdx);
        }

        String botMessage = "봇 '" + safeUsername(me) + "' 인증에 성공했습니다.";

        // ─── 2단계: 채널 접근 (채널 ID 입력돼 있을 때만) ──────────────────
        String channelId = settings.getDefaultChannelId();
        if (isBlank(channelId)) {
            return BotConnectionTestResponse.builder()
                    .success(true)
                    .botOk(true)
                    .botMessage(botMessage)
                    .botResolvedUserId(me.id())
                    .botResolvedUsername(me.username())
                    .channelChecked(false)
                    .build();
        }

        MmChannel channel;
        try {
            channel = mmClient.getChannel(settings.getServerUrl(), plainToken, channelId);
        } catch (MattermostApiException e) {
            log.warn("[봇 연결 테스트] 채널 접근 실패 — kind={}, channelId={}, userIdx={}",
                    e.getKind(), channelId, currentUserIdx);
            return BotConnectionTestResponse.builder()
                    .success(false)
                    .botOk(true)
                    .botMessage(botMessage)
                    .botResolvedUserId(me.id())
                    .botResolvedUsername(me.username())
                    .channelChecked(true)
                    .channelOk(false)
                    .channelMessage(translateChannelError(e.getKind()))
                    .build();
        }

        return BotConnectionTestResponse.builder()
                .success(true)
                .botOk(true)
                .botMessage(botMessage)
                .botResolvedUserId(me.id())
                .botResolvedUsername(me.username())
                .channelChecked(true)
                .channelOk(true)
                .channelMessage("채널 '" + safeChannelName(channel) + "' 에 접근할 수 있습니다.")
                .channelDisplayName(safeChannelName(channel))
                .build();
    }

    // =========================================================================
    // 메시지 매핑 (사용자 친화 한국어, 행동강령 포함)
    // =========================================================================

    private String translateBotError(MattermostErrorKind kind) {
        return switch (kind) {
            case UNAUTHORIZED  -> "토큰이 거부되었습니다. MM 담당자가 발급한 봇 토큰이 정확한지, 만료/회수되지 않았는지 확인해 주세요.";
            case FORBIDDEN     -> "봇 계정에 권한이 없습니다. MM 담당자에게 봇 계정 권한 설정을 확인해 달라고 요청해 주세요.";
            case TIMEOUT       -> "Mattermost 서버에 응답이 없습니다. 사내 네트워크에서 서버에 접근 가능한지 확인해 주세요.";
            case UNREACHABLE   -> "Mattermost 서버에 연결할 수 없습니다. 서버 URL 이 정확한지, 사내 네트워크가 연결돼 있는지 확인해 주세요.";
            case SERVER_ERROR  -> "Mattermost 서버가 일시적으로 응답을 못 하고 있습니다. 잠시 후 다시 시도해 주세요.";
            case NOT_FOUND     -> "Mattermost 서버 주소에서 사용자 API 를 찾지 못했습니다. 서버 URL 끝에 불필요한 경로가 붙어있지 않은지 확인해 주세요.";
            case CLIENT_ERROR  -> "Mattermost 가 요청을 거부했습니다. 서버 URL 과 토큰을 다시 확인해 주세요.";
            case UNKNOWN       -> "확인되지 않은 사유로 검증에 실패했습니다. 잠시 후 다시 시도해 주세요.";
        };
    }

    private String translateChannelError(MattermostErrorKind kind) {
        return switch (kind) {
            case NOT_FOUND     -> "채널을 찾지 못했습니다. 채널 ID 가 정확한지 확인해 주세요. (채널 이름이 아닌 26자 ID 입니다)";
            case FORBIDDEN     -> "봇이 이 채널의 멤버가 아닙니다. MM 채널 설정에서 봇을 채널 멤버로 추가해 주세요.";
            case UNAUTHORIZED  -> "토큰이 채널 접근 시점에 거부되었습니다. 토큰을 다시 확인해 주세요.";
            case TIMEOUT       -> "Mattermost 서버가 채널 조회에 응답하지 않았습니다. 잠시 후 다시 시도해 주세요.";
            case UNREACHABLE   -> "Mattermost 서버에 연결할 수 없습니다.";
            case SERVER_ERROR  -> "Mattermost 서버가 일시적으로 응답을 못 하고 있습니다. 잠시 후 다시 시도해 주세요.";
            case CLIENT_ERROR  -> "Mattermost 가 채널 조회 요청을 거부했습니다.";
            case UNKNOWN       -> "확인되지 않은 사유로 채널 검증에 실패했습니다.";
        };
    }

    private static BotConnectionTestResponse botFail(String msg) {
        return BotConnectionTestResponse.builder()
                .success(false)
                .botOk(false)
                .botMessage(msg)
                .channelChecked(false)
                .build();
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String safeUsername(MmUser u) {
        return u.username() == null || u.username().isBlank() ? "(이름 없음)" : u.username();
    }

    private static String safeChannelName(MmChannel c) {
        if (c.display_name() != null && !c.display_name().isBlank()) return c.display_name();
        if (c.name()         != null && !c.name().isBlank())         return c.name();
        return "(이름 없음)";
    }

    // =========================================================================
    // 테스트 메시지 발송 (본인 → 본인)
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public TestSendResponse sendTestMessage(Long currentUserIdx) {
        // ─── 0. 기본 정보 로드 ───────────────────────────────────────────
        NotificationSettings settings = repository.findById(NotificationSettings.SINGLETON_IDX)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "알림 시스템 설정 행이 존재하지 않습니다."));

        if (isBlank(settings.getServerUrl())) {
            return testFail("settings", "Mattermost 서버 URL 이 입력되어 있지 않습니다. 먼저 [봇 연결 테스트] 까지 통과시켜 주세요.", null);
        }
        if (isBlank(settings.getBotUserId())) {
            return testFail("settings", "봇 식별자가 비어 있습니다. 먼저 [봇 연결 테스트] 를 한 번 눌러 봇 식별자를 자동으로 채워 주세요.", null);
        }

        String plainToken;
        try {
            plainToken = tokenCipher.decrypt(settings.getBotTokenEnc());
        } catch (Exception e) {
            log.error("[테스트 발송] 토큰 복호화 실패", e);
            return testFail("token", "저장된 봇 토큰을 읽지 못했습니다. [봇 토큰 변경] 으로 다시 등록해 주세요.", null);
        }
        if (plainToken == null || plainToken.isBlank()) {
            return testFail("token", "봇 토큰이 등록되어 있지 않습니다. [봇 토큰 변경] 으로 토큰을 입력하고 [저장] 후 다시 시도해 주세요.", null);
        }

        // ─── 1. 본인 사번 확보 ───────────────────────────────────────────
        User me = userRepository.findById(currentUserIdx)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "로그인 사용자 정보를 찾을 수 없습니다."));
        String empId   = me.getEmpId();
        String empName = me.getEmpName();
        if (isBlank(empId)) {
            return testFail("user", "현재 로그인한 사용자의 사번이 비어 있습니다. 사용자 관리에서 사번을 먼저 등록해 주세요.", null);
        }

        // ─── 2. MM 사용자 조회 (사번 → MM user.id) ──────────────────────
        MmUser mmUser;
        try {
            mmUser = mmClient.getUserByUsername(settings.getServerUrl(), plainToken, empId);
        } catch (MattermostApiException e) {
            log.warn("[테스트 발송] MM 사용자 조회 실패 — kind={}, empId={}", e.getKind(), empId);
            return testFail("lookup",
                    e.getKind() == MattermostErrorKind.NOT_FOUND
                            ? "Mattermost 에 본인 계정(사번 " + empId + ") 이 등록되어 있지 않습니다. MM 담당자에게 계정 생성을 요청해 주세요."
                            : translateBotError(e.getKind()),
                    empId);
        }
        if (mmUser == null || isBlank(mmUser.id())) {
            return testFail("lookup", "Mattermost 응답에서 본인 사용자 정보를 읽지 못했습니다. 잠시 후 다시 시도해 주세요.", empId);
        }

        // ─── 3. 봇 ↔ 본인 DM 채널 생성/조회 ──────────────────────────────
        MmChannel dm;
        try {
            dm = mmClient.createDirectChannel(settings.getServerUrl(), plainToken,
                    settings.getBotUserId(), mmUser.id());
        } catch (MattermostApiException e) {
            log.warn("[테스트 발송] DM 채널 생성 실패 — kind={}, empId={}", e.getKind(), empId);
            return testFail("dm",
                    e.getKind() == MattermostErrorKind.FORBIDDEN
                            ? "봇이 DM 을 보낼 수 없습니다. MM 측에서 본인이 봇을 차단했거나 DM 을 비활성화한 경우입니다."
                            : translateBotError(e.getKind()),
                    empId);
        }
        if (dm == null || isBlank(dm.id())) {
            return testFail("dm", "Mattermost 응답에서 DM 채널 정보를 읽지 못했습니다.", empId);
        }

        // ─── 4. 메시지 발송 ──────────────────────────────────────────────
        String message = buildTestMessage(empName, empId);
        MmPost post;
        try {
            post = mmClient.postMessage(settings.getServerUrl(), plainToken, dm.id(), message);
        } catch (MattermostApiException e) {
            log.warn("[테스트 발송] 메시지 발송 실패 — kind={}, empId={}", e.getKind(), empId);
            return testFail("post", translateBotError(e.getKind()), empId);
        }

        log.info("[테스트 발송] 성공 — empId={}, postId={}, userIdx={}",
                empId, post != null ? post.id() : null, currentUserIdx);

        return TestSendResponse.builder()
                .success(true)
                .message("Mattermost 인박스로 테스트 메시지를 발송했습니다. 본인 메신저를 확인해 주세요.")
                .empId(empId)
                .mmUsername(mmUser.username())
                .mmPostId(post != null ? post.id() : null)
                .build();
    }

    private String buildTestMessage(String empName, String empId) {
        String when = LocalDateTime.now().format(HUMAN_TIME);
        return "✅ **그룹웨어 알림 시스템 테스트 메시지**\n\n" +
               "안녕하세요 " + safeName(empName) + "(" + empId + ") 님,\n" +
               "그룹웨어 알림 봇이 정상적으로 메시지를 보낼 수 있는지 확인하기 위한 테스트 메시지입니다.\n\n" +
               "- 발송 시각: " + when + "\n" +
               "- 발송 경로: 그룹웨어 → Mattermost 봇 → 본인 DM\n\n" +
               "이 메시지가 보이면 알림 시스템 설정이 정상입니다.";
    }

    private static String safeName(String n) {
        return n == null || n.isBlank() ? "(이름 없음)" : n;
    }

    private static TestSendResponse testFail(String stage, String message, String empId) {
        return TestSendResponse.builder()
                .success(false)
                .failureStage(stage)
                .message(message)
                .empId(empId)
                .build();
    }
}
