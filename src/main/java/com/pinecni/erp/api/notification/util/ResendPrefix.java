package com.pinecni.erp.api.notification.util;

/**
 * 알림 재발송 시 본문/제목 앞에 붙이는 친근한 톤의 안내 문구를 한 곳에서 관리.
 *
 * <p>사용처:
 * <ul>
 *   <li>인박스 보낸 알림 [재발송] 버튼 — {@code NotificationRetryController}</li>
 *   <li>서명관리 보낸요청 탭 [다시 보내기] — {@code SignatureServiceImpl}</li>
 *   <li>관리자 알림 발송 이력 화면의 재발송 — {@code AdminNotificationController}</li>
 * </ul>
 *
 * <p>제목용은 한 줄 prefix(끝 공백), 본문용은 한 줄 띄움 prefix({@code \n\n}) 로 분리.
 * 옛 버전의 {@code [재발송]} 토큰은 본문 어디든 등장하면 통째로 제거하고,
 * 우리 prefix 자체가 중복으로 박혀 있을 수 있는 경우도 strip 후 한 번만 prepend.
 * 5회 재발송해도 prefix 누적 안 됨.
 */
public final class ResendPrefix {

    public static final String TITLE_PREFIX = "📬 알림을 놓치신 것 같아 다시 보내드려요! ";
    public static final String BODY_PREFIX  = "📬 알림을 놓치신 것 같아 다시 보내드려요!\n\n";

    private ResendPrefix() {
        // utility
    }

    /** 제목 앞에 한 줄 prefix prepend (옛/중복 prefix strip 후). */
    public static String forTitle(String text) {
        if (text == null) return null;
        return TITLE_PREFIX + strip(text);
    }

    /** 본문 앞에 한 줄 띄움 prefix prepend (옛/중복 prefix strip 후). */
    public static String forBody(String text) {
        if (text == null) return null;
        return BODY_PREFIX + strip(text);
    }

    /**
     * 본문 어디든 등장하는 옛 {@code [재발송]} 토큰(둘러싼 공백 포함)을 통째로 제거하고,
     * 시작 부분에 우리 prefix(제목용 또는 본문용)가 붙어 있으면 반복 제거.
     */
    private static String strip(String text) {
        String t = text.replaceAll("\\s*\\[재발송\\]\\s*", "");
        boolean changed = true;
        while (changed) {
            changed = false;
            for (String p : new String[]{BODY_PREFIX, TITLE_PREFIX}) {
                if (t.startsWith(p)) {
                    t = t.substring(p.length());
                    changed = true;
                    break;
                }
            }
        }
        return t;
    }
}
