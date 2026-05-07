/* =========================================================
 * settings.html [알림] 탭 — Phase 1 (더미데이터)
 * 더미 = window.NOTIF_DUMMY (notification-dummy-data.js)
 * Phase 4 에서 fetch 호출로 교체 예정.
 * ========================================================= */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        // 알림 탭이 settings.html 안에 들어 있으므로, 해당 탭 컨테이너가 존재할 때만 동작
        const notifTab = document.getElementById('notification');
        if (!notifTab) return;

        renderLinkStatus();
        renderTypeGrid();
        renderQuietHours();
        bindActions();
    });

    function renderLinkStatus() {
        const link = window.NOTIF_DUMMY.MY_LINK;
        const wrap = document.getElementById('mmLinkStatus');
        if (!wrap) return;

        const isConn = link.connected && link.isActive;
        wrap.classList.toggle('disconnected', !isConn);

        const icon  = wrap.querySelector('.status-icon i');
        const text  = wrap.querySelector('.status-text');
        if (icon) icon.className = isConn ? 'fas fa-check-circle' : 'fas fa-times-circle';
        if (text) {
            text.innerHTML = isConn
                ? '<strong>연결됨</strong>마지막 발송 성공: ' + (link.lastSentAt || '없음')
                : '<strong>연결 실패</strong>' + (link.lastError || '봇 차단·미가입 의심');
        }

        // 정보 그리드
        const info = document.getElementById('mmLinkInfo');
        if (info) {
            info.innerHTML =
                '<dt>Mattermost username</dt><dd>' + escapeHtml(link.mmUsername) + ' <span style="color:#9ca3af;font-size:12px;">← 사번과 동일 (자동)</span></dd>' +
                '<dt>봇과의 DM 채널 ID</dt><dd style="font-family:monospace;font-size:12px;color:#6b7280;">' + escapeHtml(link.mmDmChannelId || '미생성') + '</dd>' +
                '<dt>캐시 갱신 시각</dt><dd>' + escapeHtml(link.cachedAt || '-') + '</dd>';
        }
    }

    function renderTypeGrid() {
        const container = document.getElementById('notifTypeGrid');
        if (!container) return;

        // 종류+채널 키로 구독 매핑
        const subs = window.NOTIF_DUMMY.MY_SUBSCRIPTIONS;
        const subMap = {};
        subs.forEach(function (s) { subMap[s.notificationType + ':' + s.channel] = s; });

        // 사용자 화면에는 1차 MVP 종류만 노출 (C1915 시스템공지는 강제발송이라 비노출)
        const visibleTypes = window.NOTIF_DUMMY.TYPES.filter(function (t) {
            return t.phase === 1 && t.code !== 'C1915';
        });

        // 헤더 행 + 종류 행들
        const header =
            '<div class="notif-grid-head">' +
            '  <div class="col-name">알림 종류</div>' +
            '  <div class="col-channel"><i class="fas fa-comment-dots" title="Mattermost"></i> MM</div>' +
            '  <div class="col-channel"><i class="fas fa-bell" title="그룹웨어 인박스"></i> 인박스</div>' +
            '</div>';

        const rows = visibleTypes.map(function (t) {
            const subMM    = subMap[t.code + ':C2101'] || {};
            const subInWeb = subMap[t.code + ':C2103'] || {};
            const disabled = t.forceSend ? 'disabled' : '';
            const rowCls   = ['notif-grid-row', t.forceSend ? 'force-send' : ''].filter(Boolean).join(' ');

            return (
                '<div class="' + rowCls + '" data-code="' + t.code + '">' +
                '  <div class="col-name">' +
                '    <div class="item-name">' + escapeHtml(t.name) + '</div>' +
                '    <div class="item-desc">' + escapeHtml(t.desc) + '</div>' +
                '  </div>' +
                '  <div class="col-channel">' +
                '    <label class="ch-toggle"><input type="checkbox" data-ch="C2101" ' + (subMM.isEnabled ? 'checked' : '') + ' ' + disabled + '><span></span></label>' +
                '  </div>' +
                '  <div class="col-channel">' +
                '    <label class="ch-toggle"><input type="checkbox" data-ch="C2103" ' + (subInWeb.isEnabled ? 'checked' : '') + ' ' + disabled + '><span></span></label>' +
                '  </div>' +
                '</div>'
            );
        }).join('');

        const note =
            '<div class="notif-grid-note">' +
            '  ※ <strong>MM</strong> 끄면 메신저로 안 옴, <strong>인박스</strong> 끄면 그룹웨어 종 아이콘에 안 뜸. ' +
            '  둘 다 끄면 그 알림은 받지 않음. ' +
            '  <span class="force-send-note">잠긴 행</span>은 시스템 공지 등 강제 발송 알림으로 끌 수 없음.' +
            '</div>';

        container.innerHTML = header + rows + note;
    }

    function renderQuietHours() {
        const q = window.NOTIF_DUMMY.MY_QUIET_HOURS;
        const enabled = document.getElementById('quietHoursEnabled');
        const start   = document.getElementById('quietHoursStart');
        const end     = document.getElementById('quietHoursEnd');
        const group   = document.getElementById('quietTimeGroup');
        if (enabled) enabled.checked = q.enabled;
        if (start)   start.value     = q.start;
        if (end)     end.value       = q.end;
        applyQuietGroupState(q.enabled);

        if (enabled && group) {
            enabled.addEventListener('change', function () {
                applyQuietGroupState(enabled.checked);
            });
        }
    }

    function applyQuietGroupState(isOn) {
        const group = document.getElementById('quietTimeGroup');
        if (group) group.classList.toggle('disabled', !isOn);
    }

    function bindActions() {
        const testBtn = document.getElementById('btnMmTest');
        if (testBtn) {
            testBtn.addEventListener('click', function () {
                Swal.fire({
                    icon: 'info',
                    title: '미리보기 화면',
                    text: '본인의 Mattermost 로 테스트 메시지를 보내는 자리입니다. 실제 발송은 다음 작업 단계에서 연결됩니다.'
                });
            });
        }

        const refreshBtn = document.getElementById('btnMmRefresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function () {
                Swal.fire({
                    icon: 'info',
                    title: '미리보기 화면',
                    text: 'Mattermost 와의 연결을 다시 맺는 자리입니다 (계정 가입을 새로 했거나 봇 차단을 풀었을 때 사용). 실제 동작은 다음 작업 단계에서 연결됩니다.'
                });
            });
        }

        const saveBtn = document.getElementById('btnNotifSave');
        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                Swal.fire({
                    icon: 'success',
                    title: '저장됨 (더미)',
                    text: '실제 저장은 다음 작업 단계에서 연결됩니다.',
                    timer: 1800,
                    showConfirmButton: false
                });
            });
        }
    }

    function escapeHtml(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
})();
