/* =========================================================
 * 알림 시스템 더미데이터 (Phase 1)
 * 모든 화면이 공유하는 mock 데이터.
 * Phase 4 에서 실제 API 호출로 대체할 때 이 파일 통째로 삭제.
 * ========================================================= */

window.NOTIF_DUMMY = (function () {

    /* ─── 알림 종류 (C19 코드) ─── */
    const TYPES = [
        { code: 'C1901', name: '서명요청',           desc: '내가 서명할 차례가 됐을 때',                 phase: 1, enabledByDefault: true,  forceSend: false },
        { code: 'C1902', name: '서명진행',           desc: '내 문서의 중간 서명 단계가 끝났을 때',       phase: 1, enabledByDefault: true,  forceSend: false },
        { code: 'C1903', name: '서명완료알림',       desc: '내 문서의 모든 서명이 끝났을 때',           phase: 1, enabledByDefault: true,  forceSend: false },
        { code: 'C1904', name: '외부참석자서명완료', desc: '내가 발급한 QR로 외부인이 서명 완료',        phase: 2, enabledByDefault: false, forceSend: false },
        { code: 'C1905', name: '연차승인',           desc: '내 연차 신청이 승인됐을 때',                 phase: 1, enabledByDefault: true,  forceSend: false },
        { code: 'C1906', name: '연차반려',           desc: '내 연차 신청이 반려됐을 때',                 phase: 1, enabledByDefault: true,  forceSend: false },
        { code: 'C1907', name: '연차관리자삭제',     desc: '관리자가 내 연차를 삭제했을 때',             phase: 1, enabledByDefault: true,  forceSend: true  },
        { code: 'C1908', name: '일정초대',           desc: '내가 일정 참여자로 등록됐을 때',             phase: 1, enabledByDefault: true,  forceSend: false },
        { code: 'C1909', name: '일정변경',           desc: '참여 중인 일정의 일시·장소가 변경됐을 때',   phase: 2, enabledByDefault: false, forceSend: false },
        { code: 'C1910', name: '일정취소',           desc: '참여 중인 일정이 취소됐을 때',               phase: 2, enabledByDefault: false, forceSend: false },
        { code: 'C1911', name: '프로젝트참여',       desc: '새 프로젝트 멤버로 등록됐을 때',             phase: 2, enabledByDefault: false, forceSend: false },
        { code: 'C1912', name: '프로젝트정보변경',   desc: '내 참여기간/역할이 바뀌었을 때',             phase: 2, enabledByDefault: false, forceSend: false },
        { code: 'C1913', name: '프로젝트제외',       desc: '프로젝트에서 제외됐을 때',                   phase: 2, enabledByDefault: false, forceSend: false },
        { code: 'C1914', name: '알림발송실패',       desc: '내가 요청한 알림이 상대방에게 도달 못 했을 때', phase: 1, enabledByDefault: true,  forceSend: true  }
    ];

    /* ─── 발송 상태 (C20 코드) ─── */
    const STATUSES = {
        C2001: { name: '대기중',     cssClass: 'status-pending'    },
        C2002: { name: '발송성공',   cssClass: 'status-sent'       },
        C2003: { name: '발송제외',   cssClass: 'status-skipped'    },
        C2004: { name: '발송실패',   cssClass: 'status-failed'     },
        C2005: { name: '재시도대기', cssClass: 'status-retry-wait' },
        C2006: { name: '만료',       cssClass: 'status-expired'    }
    };

    /* ─── 시스템 설정 (notification_settings 1행) ─── */
    const SETTINGS = {
        serverUrl: 'https://mm.pinecni.local',
        botUserId: 'ksjdnf83hg9a8s7dq3w4tx5yzn',
        botUsername: 'groupware-notifier',
        botTokenMasked: '●●●●●●●●●●●●●●●●●●●●●● a4b9',
        defaultChannelId: 'town-square',
        isEnabled: true,
        maxRetryCount: 5,
        retryBackoffSeconds: 60,
        expireAfterMinutes: 1440,
        dispatcherPausedUntil: null,
        lastBotTestAt: '2026-04-30 11:23:47',
        lastBotTestResult: 'OK'
    };

    /* ─── 본인 연결 상태 (notification_user_links) ─── */
    const MY_LINK = {
        connected: true,
        mmUsername: 'ella.kim',
        mmUserId: 'a8sd7f9q3w4er5ty',
        mmDmChannelId: 'fnq8vc2pkr3kpqa',
        cachedAt: '2026-04-30 09:14:08',
        lastSentAt: '2026-04-30 14:30:12',
        lastError: null,
        isActive: true
    };

    /* ─── 본인 구독 (notification_subscriptions)
     * 종류 × 채널 (C2101 MM + C2103 INWEB) 두 행씩.
     * 신규 사용자 가입 시 createDefaultsFor 가 만드는 행 구조와 동일.
     * ─── */
    const ACTIVE_CHANNELS = ['C2101', 'C2103'];
    const MY_SUBSCRIPTIONS = TYPES.flatMap(function (t) {
        return ACTIVE_CHANNELS.map(function (ch) {
            return {
                notificationType: t.code,
                channel: ch,                       // 'C2101' MM | 'C2103' INWEB
                isEnabled: t.enabledByDefault,
                quietHoursStart: '22:00',
                quietHoursEnd: '08:00',
                isForceSend: t.forceSend
            };
        });
    });

    const MY_QUIET_HOURS = {
        enabled: true,
        start: '22:00',
        end: '08:00'
    };

    /* ─── 템플릿 (notification_templates) ─── */
    const TEMPLATES = {
        C1901: {
            title: '📝 서명 요청이 도착했습니다',
            body: '[[${recipientName}]]님, **[[${documentTitle}]]** ([[${documentNo}]]) 문서의 **[[${slotLabel}]]** 위치 서명이 필요합니다.\n- 기안자: [[${actorName}]]\n- 요청 시각: [[${eventTime}]]\n\n🔗 [문서 보러가기]([[${deepLink}]])',
            link: '/approval/[[${documentTypePath}]]/[[${documentIdx}]]',
            color: '#1A73E8',
            isEnabled: true
        },
        C1902: {
            title: '🖊 서명이 진행 중입니다 ([[${completedOrders}]]/[[${totalOrders}]] 단계)',
            body: '[[${recipientName}]]님이 작성한 **[[${documentTitle}]]** ([[${documentNo}]]) 문서에 **[[${actorName}]]**([[${actorSlotLabel}]])님이 서명했습니다.\n- 진행도: [[${completedOrders}]]/[[${totalOrders}]] 단계 완료\n- 다음 차례: **[[${nextSignerName}]]** ([[${nextSlotLabel}]])\n- 시각: [[${eventTime}]]\n\n🔗 [문서 보러가기]([[${deepLink}]])',
            link: '/approval/[[${documentTypePath}]]/[[${documentIdx}]]',
            color: '#1A73E8',
            isEnabled: true
        },
        C1903: {
            title: '✅ 서명이 모두 완료되었습니다',
            body: '[[${recipientName}]]님이 작성한 **[[${documentTitle}]]** ([[${documentNo}]]) 문서의 모든 서명이 완료되었습니다.\n- 완료 시각: [[${eventTime}]]\n\n🔗 [문서 보러가기]([[${deepLink}]])',
            link: '/approval/[[${documentTypePath}]]/[[${documentIdx}]]',
            color: '#2E7D32',
            isEnabled: true
        },
        C1904: {
            title: '✍️ 외부 참석자가 서명을 완료했습니다',
            body: '**[[${documentTitle}]]** 의 외부 참석자 **[[${externalPersonName}]]** ([[${externalPersonAffiliation}]]) 님이 모바일에서 서명을 완료했습니다.\n- 시각: [[${eventTime}]]\n\n🔗 [문서 보러가기]([[${deepLink}]])',
            link: '/approval/[[${documentTypePath}]]/[[${documentIdx}]]',
            color: '#1A73E8',
            isEnabled: false
        },
        C1905: {
            title: '✅ 연차가 승인되었습니다',
            body: '**[[${documentTitle}]]** ([[${documentNo}]])\n- 기간: [[${vacationStart}]] ~ [[${vacationEnd}]] ([[${vacationDays}]]일)\n- 처리자: [[${actorName}]]\n- 시각: [[${eventTime}]]\n\n🔗 [내 연차 보기]([[${deepLink}]])',
            link: '/vacation',
            color: '#2E7D32',
            isEnabled: true
        },
        C1906: {
            title: '❌ 연차가 반려되었습니다',
            body: '**[[${documentTitle}]]** ([[${documentNo}]])\n- 기간: [[${vacationStart}]] ~ [[${vacationEnd}]] ([[${vacationDays}]]일)\n- 처리자: [[${actorName}]]\n- 반려사유: [[${rejectReason}]]\n- 시각: [[${eventTime}]]\n\n🔗 [내 연차 보기]([[${deepLink}]])',
            link: '/vacation',
            color: '#C62828',
            isEnabled: true
        },
        C1907: {
            title: '🗑 연차 신청이 관리자에 의해 삭제되었습니다',
            body: '**[[${documentTitle}]]** ([[${documentNo}]])\n- 기간: [[${vacationStart}]] ~ [[${vacationEnd}]]\n- 삭제자: [[${actorName}]]\n- 시각: [[${eventTime}]]\n※ 잔여 연차는 자동 복구되었습니다.\n\n🔗 [내 연차 보기]([[${deepLink}]])',
            link: '/vacation',
            color: '#C62828',
            isEnabled: true
        },
        C1908: {
            title: '📅 일정에 초대되었습니다',
            body: '[[${recipientName}]]님, **[[${eventTitle}]]** 일정에 참여자로 등록되었습니다.\n- 일시: [[${eventStart}]] ~ [[${eventEnd}]]\n- 장소: [[${eventLocation}]]\n- 등록자: [[${actorName}]]\n\n🔗 [일정 보러가기]([[${deepLink}]])',
            link: '/calendar?date=[[${eventStartDate}]]',
            color: '#7B1FA2',
            isEnabled: true
        },
        C1909: {
            title: '🔄 일정이 변경되었습니다',
            body: '**[[${eventTitle}]]** 일정이 변경되었습니다.\n- 변경 항목: [[${changedFields}]]\n- 일시: [[${eventStart}]] ~ [[${eventEnd}]]\n- 장소: [[${eventLocation}]]\n- 변경자: [[${actorName}]]\n\n🔗 [일정 보러가기]([[${deepLink}]])',
            link: '/calendar?date=[[${eventStartDate}]]',
            color: '#FB8C00',
            isEnabled: false
        },
        C1910: {
            title: '🚫 일정이 취소되었습니다',
            body: '**[[${eventTitle}]]** ([[${eventStart}]] ~ [[${eventEnd}]]) 일정이 취소되었습니다.\n- 취소자: [[${actorName}]]\n- 시각: [[${eventTime}]]',
            link: '',
            color: '#C62828',
            isEnabled: false
        },
        C1911: {
            title: '👥 프로젝트 멤버로 등록되었습니다',
            body: '**[[${projectName}]]** 프로젝트의 **[[${memberRole}]]** 역할로 **[[${participationStartDate}]] ~ [[${participationEndDate}]]** 기간 등록되었습니다.\n- 등록자: [[${actorName}]]\n- 시각: [[${eventTime}]]\n\n🔗 [프로젝트 보러가기]([[${deepLink}]])',
            link: '/project-detail?idx=[[${projectIdx}]]',
            color: '#0288D1',
            isEnabled: false
        },
        C1912: {
            title: '🔄 프로젝트 참여정보가 변경되었습니다',
            body: '**[[${projectName}]]** 프로젝트의 본인 참여정보가 변경되었습니다.\n- 변경 항목: [[${changedFields}]]\n- 참여기간: [[${participationStartDate}]] ~ [[${participationEndDate}]]\n- 역할: [[${memberRole}]]\n- 변경자: [[${actorName}]]\n- 시각: [[${eventTime}]]\n\n🔗 [프로젝트 보러가기]([[${deepLink}]])',
            link: '/project-detail?idx=[[${projectIdx}]]',
            color: '#FB8C00',
            isEnabled: false
        },
        C1913: {
            title: '🚫 프로젝트에서 제외되었습니다',
            body: '**[[${projectName}]]** 프로젝트에서 제외되었습니다.\n- 처리자: [[${actorName}]]\n- 시각: [[${eventTime}]]',
            link: '',
            color: '#C62828',
            isEnabled: false
        },
        C1914: {
            title: '⚠️ 알림이 상대방에게 전달되지 않았습니다',
            body: '**[[${recipientName}]]** 님께 보낸 알림이 전달되지 않았습니다.\n- 원본 알림: [[${originalNotificationTitle}]]\n- 사유: [[${failureReason}]]\n- 발생 시각: [[${eventTime}]]\n\n💡 상대방의 Mattermost 차단·미가입이 원인일 수 있습니다. 메신저로 직접 연락하거나 아래 버튼으로 다시 시도해보세요.\n\n🔄 [다시 보내기]([[${retryLink}]])\n🔗 [원본 화면 보기]([[${originalDeepLink}]])',
            link: '/notifications/[[${originalNotificationIdx}]]/retry',
            color: '#FB8C00',
            isEnabled: true
        }
    };

    /* ─── 발송 이력 (notifications 표) ─── */
    const LOGS = [
        {
            idx: 1024,
            type: 'C1901', typeName: '서명요청',
            recipient: { name: '김철수', empId: '2024001', dept: '개발팀' },
            actor:     { name: '이엘라', empId: '2023015', dept: '경영지원' },
            documentNo: 'VAC-20260430-003',
            status: 'C2002',
            mmPostId: 'p_xa9f7q3rk2',
            retryCount: 0,
            sentAt: '2026-04-30 14:25:18',
            createdAt: '2026-04-30 14:25:09',
            actorNotified: false,
            lastError: null
        },
        {
            idx: 1023,
            type: 'C1901', typeName: '서명요청',
            recipient: { name: '박영희', empId: '2024005', dept: '개발팀' },
            actor:     { name: '이엘라', empId: '2023015', dept: '경영지원' },
            documentNo: 'VAC-20260430-003',
            status: 'C2004',
            mmPostId: null,
            retryCount: 5,
            sentAt: null,
            createdAt: '2026-04-30 14:25:09',
            actorNotified: true,
            lastError: '상대방이 알림 봇을 차단했습니다'
        },
        {
            idx: 1022,
            type: 'C1908', typeName: '일정초대',
            recipient: { name: '최민수', empId: '2024010', dept: '디자인' },
            actor:     { name: '이엘라', empId: '2023015', dept: '경영지원' },
            documentNo: '-',
            status: 'C2005',
            mmPostId: null,
            retryCount: 2,
            sentAt: null,
            createdAt: '2026-04-30 14:00:33',
            nextAttemptAt: '2026-04-30 14:34:33',
            actorNotified: false,
            lastError: 'Mattermost 서버 일시 장애 (자동 재시도 중)'
        },
        {
            idx: 1021,
            type: 'C1905', typeName: '연차승인',
            recipient: { name: '이엘라', empId: '2023015', dept: '경영지원' },
            actor:     { name: '정부서장', empId: '2018001', dept: '경영지원' },
            documentNo: 'VAC-20260429-007',
            status: 'C2002',
            mmPostId: 'p_kd9s3kf83',
            retryCount: 0,
            sentAt: '2026-04-29 16:42:01',
            createdAt: '2026-04-29 16:41:55',
            actorNotified: false,
            lastError: null
        },
        {
            idx: 1020,
            type: 'C1908', typeName: '일정초대',
            recipient: { name: '외부참석자', empId: null, dept: '외부' },
            actor:     { name: '이엘라', empId: '2023015', dept: '경영지원' },
            documentNo: '-',
            status: 'C2003',
            mmPostId: null,
            retryCount: 0,
            sentAt: null,
            createdAt: '2026-04-29 11:30:08',
            actorNotified: false,
            lastError: '외부 참석자 (Mattermost 계정 없음)'
        },
        {
            idx: 1019,
            type: 'C1901', typeName: '서명요청',
            recipient: { name: '신입사원', empId: '2026003', dept: '개발팀' },
            actor:     { name: '박팀장', empId: '2020005', dept: '개발팀' },
            documentNo: 'PRJ-20260428-002',
            status: 'C2006',
            mmPostId: null,
            retryCount: 8,
            sentAt: null,
            createdAt: '2026-04-28 17:00:00',
            actorNotified: true,
            lastError: '발송 대기 시간(24시간) 초과로 만료'
        }
    ];

    /* ─── 재시도 페이지용 — 단일 알림 상세 ─── */
    const RETRY_TARGET = {
        idx: 1023,
        recipient: { name: '김철수', empId: '2024001', dept: '개발팀' },
        type: 'C1901',
        typeName: '서명 요청',
        documentTitle: '휴가신청서',
        documentNo: 'VAC-20260430-003',
        documentLink: '/approval/vacation/567',
        createdAt: '2026-04-30 14:25:09',
        firstAttemptAt: '2026-04-30 14:25:09',
        lastAttemptAt: '2026-04-30 14:30:12',
        retryCount: 5,
        maxRetry: 5,
        userRetryCount: 0,
        userRetryMax: 5,
        failureReason: '상대방이 알림 봇을 차단했습니다',
        canRetry: true,
        actorIdx: 2023015
    };

    /* ─── 미리보기용 더미 변수 (템플릿 편집기 미리보기) ─── */
    const PREVIEW_VARS = {
        recipientName: '김철수',
        actorName: '이엘라',
        documentNo: 'VAC-20260430-003',
        documentTitle: '휴가신청서',
        documentTypeName: '연차신청',
        documentTypePath: 'vacation',
        documentIdx: 567,
        deepLink: '/approval/vacation/567',
        eventTime: '2026-04-30 14:25:18',
        slotLabel: '부서장',
        actorSlotLabel: '담당',
        completedOrders: 1,
        totalOrders: 3,
        nextSignerName: '박영희',
        nextSlotLabel: '부서장',
        vacationStart: '2026-05-04',
        vacationEnd: '2026-05-08',
        vacationDays: 5,
        rejectReason: '인력 부족 기간 — 6월 첫째 주로 조정 요청',
        eventTitle: '주간 정기회의',
        eventStart: '2026-05-01 14:00',
        eventEnd: '2026-05-01 15:30',
        eventLocation: '대회의실',
        eventStartDate: '2026-05-01',
        eventIdx: 42,
        externalPersonName: '홍길동',
        externalPersonAffiliation: '협력사',
        changedFields: '시작 시각, 장소',
        projectName: 'AI 시스템 고도화',
        memberRole: '연구원',
        participationStartDate: '2026-05-01',
        participationEndDate: '2026-12-31',
        projectIdx: 12,
        originalNotificationTitle: '📝 서명 요청이 도착했습니다',
        failureReason: '상대방이 알림 봇을 차단했습니다',
        retryLink: '/notifications/1023/retry',
        originalDeepLink: '/approval/vacation/567',
        originalNotificationIdx: 1023
    };

    return {
        TYPES: TYPES,
        STATUSES: STATUSES,
        SETTINGS: SETTINGS,
        MY_LINK: MY_LINK,
        MY_SUBSCRIPTIONS: MY_SUBSCRIPTIONS,
        MY_QUIET_HOURS: MY_QUIET_HOURS,
        TEMPLATES: TEMPLATES,
        LOGS: LOGS,
        RETRY_TARGET: RETRY_TARGET,
        PREVIEW_VARS: PREVIEW_VARS
    };
})();
