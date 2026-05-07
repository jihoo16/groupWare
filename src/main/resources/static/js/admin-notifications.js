/* =========================================================
 * /admin/notifications — 시스템 설정 (Phase 1, 더미)
 * ========================================================= */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        const root = document.getElementById('notifSettingsRoot');
        if (!root) return;

        loadSettings();
        bindActions();
    });

    function loadSettings() {
        const s = window.NOTIF_DUMMY.SETTINGS;

        setVal('inServerUrl',           s.serverUrl);
        setVal('inBotUserId',           s.botUserId);
        setVal('inBotUsername',         s.botUsername);
        setVal('inBotToken',            s.botTokenMasked);
        setVal('inDefaultChannel',      s.defaultChannelId);
        setVal('inMaxRetry',            s.maxRetryCount);
        setVal('inRetryBackoff',        s.retryBackoffSeconds);
        setVal('inExpireAfterMinutes',  s.expireAfterMinutes);

        const enabledCb = document.getElementById('inIsEnabled');
        if (enabledCb) {
            enabledCb.checked = s.isEnabled;
            applyKillSwitchVisuals(s.isEnabled);
            enabledCb.addEventListener('change', function () {
                onKillSwitchChange(enabledCb.checked);
            });
        }

        renderPauseSection(s.dispatcherPausedUntil);
        renderTestPanel(s.lastBotTestAt, s.lastBotTestResult);
    }

    function onKillSwitchChange(isOn) {
        if (!isOn) {
            // 끄려고 할 때 — 위험한 동작이므로 한번 더 확인
            Swal.fire({
                title: '정말 알림 발송을 멈추겠습니까?',
                html: '<p style="text-align:left;">이 스위치를 끄면 <strong>사내 모든 직원에게 가는 모든 알림이 즉시 차단</strong>됩니다.<br>비상 상황에서만 사용하세요.</p>',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: '네, 끕니다',
                cancelButtonText: '취소',
                confirmButtonColor: '#dc2626'
            }).then(function (r) {
                if (r.isConfirmed) {
                    applyKillSwitchVisuals(false);
                    Swal.fire({ icon: 'success', title: '발송 중지됨 (더미)', text: '실제 저장은 다음 작업 단계에서 연결됩니다.', timer: 1800, showConfirmButton: false });
                } else {
                    // 취소 시 토글 복원
                    document.getElementById('inIsEnabled').checked = true;
                }
            });
        } else {
            applyKillSwitchVisuals(true);
            Swal.fire({ icon: 'success', title: '발송 재개됨 (더미)', timer: 1500, showConfirmButton: false });
        }
    }

    function applyKillSwitchVisuals(isOn) {
        const row = document.getElementById('killSwitchRow');
        const txt = document.getElementById('killSwitchStateText');
        if (row) {
            row.classList.toggle('is-on', isOn);
            row.classList.toggle('is-off', !isOn);
        }
        if (txt) txt.textContent = isOn ? '가동 중' : '긴급 정지됨';
    }

    function renderPauseSection(pausedUntil) {
        const wrap = document.getElementById('pauseStatus');
        if (!wrap) return;

        const isPaused = !!pausedUntil && new Date(pausedUntil) > new Date();
        wrap.innerHTML = isPaused
            ? '<i class="fas fa-pause-circle status-icon" style="color:#d97706;"></i> ' +
              '<span class="status-text"><strong>일시정지 중</strong> — 해제 예정: ' + escapeHtml(pausedUntil) + '</span>'
            : '<i class="fas fa-play-circle status-icon" style="color:#059669;"></i> ' +
              '<span class="status-text"><strong>정상 발송 중</strong></span>';
    }

    function renderTestPanel(at, result) {
        const wrap = document.getElementById('botTestResult');
        if (!wrap) return;

        wrap.innerHTML =
            '<div class="notif-status-row status-ok">' +
            '  <i class="fas fa-check-circle status-icon"></i>' +
            '  <div class="status-text">' +
            '    <strong>봇 \'groupware-notifier\' 인증 성공</strong>' +
            '    마지막 테스트: ' + escapeHtml(at) +
            '  </div>' +
            '</div>';
    }

    function bindActions() {
        document.getElementById('btnSaveSettings')?.addEventListener('click', function () {
            Swal.fire({
                icon: 'success',
                title: '저장됨 (더미)',
                text: '실제 저장은 다음 작업 단계에서 연결됩니다.',
                timer: 1800,
                showConfirmButton: false
            });
        });

        document.getElementById('btnTestBot')?.addEventListener('click', function () {
            Swal.fire({
                icon: 'info',
                title: '미리보기 화면',
                text: '봇 계정이 정상 연결됐는지, 채널에 메시지를 보낼 권한이 있는지 확인하는 자리입니다. 실제 검증은 다음 작업 단계에서 연결됩니다.'
            });
        });

        document.getElementById('btnChangeToken')?.addEventListener('click', function () {
            Swal.fire({
                title: '봇 토큰 교체',
                input: 'password',
                inputLabel: '새 Bot Access Token',
                inputPlaceholder: 'qg7p8x... (26자)',
                showCancelButton: true,
                confirmButtonText: '교체'
            });
        });

        // 일시정지 버튼들
        document.querySelectorAll('[data-pause-mins]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const mins = parseInt(this.dataset.pauseMins, 10);
                const label = mins === 0 ? '즉시 해제' : (mins + '분 정지');
                Swal.fire({
                    icon: 'info',
                    title: label,
                    text: '실제 정지 처리는 다음 작업 단계에서 연결됩니다.',
                    timer: 1500,
                    showConfirmButton: false
                });
            });
        });
    }

    function setVal(id, val) {
        const el = document.getElementById(id);
        if (el && val != null) el.value = val;
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
