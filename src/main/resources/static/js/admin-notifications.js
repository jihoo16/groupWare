/* =========================================================
 * /admin/notifications — Mattermost 알림 시스템 설정
 * - GET /api/admin/notifications/settings
 * - PUT /api/admin/notifications/settings
 *
 * 봇 토큰은 평문이 절대 화면으로 내려오지 않음.
 * 응답의 botTokenSet 으로 "등록됨/미등록" 만 표시하고,
 * 사용자가 [봇 토큰 변경] 버튼으로 새 값을 입력했을 때만 PUT 요청에 포함.
 * ========================================================= */

(function () {
    'use strict';

    const API = '/api/admin/notifications/settings';

    // 화면 세션 동안만 보관되는 새 토큰 (저장 전 잠시 들고 있음)
    let pendingNewToken = null;

    document.addEventListener('DOMContentLoaded', function () {
        const root = document.getElementById('notifSettingsRoot');
        if (!root) return;

        bindActions();
        loadSettings();
    });

    // -------------------------------------------------------------
    // 조회
    // -------------------------------------------------------------

    function loadSettings() {
        fetch(API, { credentials: 'same-origin' })
            .then(function (res) {
                if (res.status === 403) throw new Error('FORBIDDEN');
                if (!res.ok) throw new Error('LOAD_FAILED');
                return res.json();
            })
            .then(applySettingsToForm)
            .catch(function (err) {
                if (err.message === 'FORBIDDEN') {
                    showError('알림 관리 권한이 없습니다.');
                } else {
                    showError('설정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
                }
                console.error('[알림 설정] 조회 실패', err);
            });
    }

    function applySettingsToForm(s) {
        setVal('inServerUrl',          s.serverUrl);
        setVal('inBotUserId',          s.botUserId);
        setVal('inBotUsername',        s.botUsername);
        setVal('inDefaultChannel',     s.defaultChannelId);
        setVal('inMaxRetry',           s.maxRetryCount);
        setVal('inRetryBackoff',       s.retryBackoffSeconds);
        setVal('inExpireAfterMinutes', s.expireAfterMinutes);

        // 토큰 자체는 절대 내려오지 않음 — botTokenSet 으로 placeholder 만 결정
        const tokenInput = document.getElementById('inBotToken');
        if (tokenInput) {
            tokenInput.value = '';
            tokenInput.placeholder = s.botTokenSet
                ? '●●●●●●●●●●●●●●●●●●●●●●  (등록됨 — 변경할 때만 입력)'
                : '미등록 — 봇 토큰을 입력하세요';
            tokenInput.dataset.tokenSet = s.botTokenSet ? '1' : '0';
        }
        pendingNewToken = null;

        const enabledCb = document.getElementById('inIsEnabled');
        if (enabledCb) {
            enabledCb.checked = !!s.isEnabled;
            applyKillSwitchVisuals(enabledCb.checked);
        }

        renderPauseSection(s.dispatcherPausedUntil);
    }

    // -------------------------------------------------------------
    // 저장
    // -------------------------------------------------------------

    function collectFormPayload() {
        const enabledCb = document.getElementById('inIsEnabled');
        const payload = {
            serverUrl:           getVal('inServerUrl'),
            botUsername:         getVal('inBotUsername'),
            defaultChannelId:    getVal('inDefaultChannel'),
            isEnabled:           enabledCb ? !!enabledCb.checked : null,
            maxRetryCount:       toIntOrNull(getVal('inMaxRetry')),
            retryBackoffSeconds: toIntOrNull(getVal('inRetryBackoff')),
            expireAfterMinutes:  toIntOrNull(getVal('inExpireAfterMinutes'))
        };
        if (pendingNewToken) {
            payload.botToken = pendingNewToken;
        }
        // dispatcherPausedUntil 은 [발송 일시정지] 버튼이 별도로 처리
        return payload;
    }

    function saveSettings(payload, successMessage) {
        return fetch(API, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (res) {
                if (res.status === 403) throw new Error('FORBIDDEN');
                if (!res.ok) throw new Error('SAVE_FAILED');
                return res.json();
            })
            .then(function (s) {
                applySettingsToForm(s);
                Swal.fire({
                    icon: 'success',
                    title: successMessage || '저장되었습니다',
                    timer: 1500,
                    showConfirmButton: false
                });
            })
            .catch(function (err) {
                if (err.message === 'FORBIDDEN') {
                    Swal.fire({ icon: 'error', title: '권한이 없습니다',
                        text: '알림 관리 권한이 있는 계정으로 다시 로그인해 주세요.' });
                } else {
                    Swal.fire({ icon: 'error', title: '저장에 실패했습니다',
                        text: '잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요.' });
                }
                console.error('[알림 설정] 저장 실패', err);
            });
    }

    // -------------------------------------------------------------
    // 비상 스위치
    // -------------------------------------------------------------

    function onKillSwitchChange(isOn) {
        if (!isOn) {
            // OFF 로 돌릴 때만 한 번 더 확인
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
                    saveSettings(collectFormPayload(), '발송이 중지되었습니다');
                } else {
                    document.getElementById('inIsEnabled').checked = true;
                    applyKillSwitchVisuals(true);
                }
            });
        } else {
            saveSettings(collectFormPayload(), '발송이 재개되었습니다');
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

    // -------------------------------------------------------------
    // 일시정지
    // -------------------------------------------------------------

    function renderPauseSection(pausedUntilIso) {
        const wrap = document.getElementById('pauseStatus');
        if (!wrap) return;

        const isPaused = !!pausedUntilIso && new Date(pausedUntilIso) > new Date();
        if (isPaused) {
            wrap.innerHTML =
                '<i class="fas fa-pause-circle status-icon" style="color:#d97706;"></i> ' +
                '<span class="status-text"><strong>일시정지 중</strong> — 해제 예정: ' +
                escapeHtml(formatKoreanDateTime(pausedUntilIso)) + '</span>';
        } else {
            wrap.innerHTML =
                '<i class="fas fa-play-circle status-icon" style="color:#059669;"></i> ' +
                '<span class="status-text"><strong>정상 발송 중</strong></span>';
        }
    }

    function applyPause(mins) {
        let pausedUntil = null;
        if (mins > 0) {
            const d = new Date();
            d.setMinutes(d.getMinutes() + mins);
            // 서버는 LocalDateTime 으로 받음 — 초까지의 ISO 문자열, 마지막 Z 는 빼고 보냄
            pausedUntil = toLocalDateTimeString(d);
        }
        const payload = collectFormPayload();
        payload.dispatcherPausedUntil = pausedUntil;

        const successMessage = mins === 0
            ? '일시정지가 해제되었습니다'
            : (mins + '분간 발송이 정지되었습니다');
        return saveSettings(payload, successMessage);
    }

    // -------------------------------------------------------------
    // 토큰 교체
    // -------------------------------------------------------------

    function onChangeTokenClick() {
        Swal.fire({
            title: '봇 토큰 변경',
            html:
                '<div style="text-align:left;font-size:13px;color:#4b5563;margin-bottom:8px;">' +
                'Mattermost 담당자가 발급한 봇 Access Token 을 입력하세요. ' +
                '저장 시점에 암호화되어 데이터베이스에 보관됩니다.' +
                '</div>',
            input: 'password',
            inputLabel: '새 봇 Access Token',
            inputPlaceholder: '예: qg7p8x...',
            inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
            showCancelButton: true,
            confirmButtonText: '입력 완료',
            cancelButtonText: '취소'
        }).then(function (r) {
            if (!r.isConfirmed) return;
            const t = (r.value || '').trim();
            if (!t) {
                Swal.fire({ icon: 'info', title: '입력값이 없어 변경하지 않았습니다',
                    timer: 1500, showConfirmButton: false });
                return;
            }
            pendingNewToken = t;
            const tokenInput = document.getElementById('inBotToken');
            if (tokenInput) {
                tokenInput.placeholder = '새 토큰 입력됨 — [저장] 버튼을 눌러야 적용됩니다';
            }
            Swal.fire({
                icon: 'info',
                title: '입력되었습니다',
                text: '아래 [저장] 버튼을 눌러야 실제로 반영됩니다.',
                timer: 2200,
                showConfirmButton: false
            });
        });
    }

    // -------------------------------------------------------------
    // 봇 연결 테스트
    // -------------------------------------------------------------

    function testConnection() {
        const btn = document.getElementById('btnTestBot');
        const wrap = document.getElementById('botTestResult');
        if (btn) { btn.disabled = true; btn.classList.add('is-busy'); }
        if (wrap) {
            wrap.innerHTML =
                '<div class="notif-status-row" style="background:#f3f4f6;border-color:#e5e7eb;color:#4b5563;">' +
                '  <i class="fas fa-spinner fa-spin status-icon"></i>' +
                '  <span class="status-text">Mattermost 서버에 연결 중...</span>' +
                '</div>';
        }

        fetch('/api/admin/notifications/test-connection', {
            method: 'POST',
            credentials: 'same-origin'
        })
            .then(function (res) {
                if (res.status === 403) throw new Error('FORBIDDEN');
                if (!res.ok) throw new Error('TEST_FAILED');
                return res.json();
            })
            .then(renderTestResult)
            .catch(function (err) {
                if (wrap) {
                    wrap.innerHTML = renderRow(false,
                        err.message === 'FORBIDDEN'
                            ? '알림 관리 권한이 없습니다.'
                            : '연결 검증 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
                }
                console.error('[봇 연결 테스트] 요청 실패', err);
            })
            .finally(function () {
                if (btn) { btn.disabled = false; btn.classList.remove('is-busy'); }
            });
    }

    function renderTestResult(r) {
        const wrap = document.getElementById('botTestResult');
        if (!wrap) return;

        // 봇 식별자 자동 채움 (성공 시)
        if (r.botOk && r.botResolvedUserId) {
            const idInput = document.getElementById('inBotUserId');
            if (idInput) idInput.value = r.botResolvedUserId;
            const nameInput = document.getElementById('inBotUsername');
            if (nameInput && r.botResolvedUsername) nameInput.value = r.botResolvedUsername;
        }

        let html = renderRow(r.botOk, r.botMessage);
        if (r.channelChecked) {
            html += renderRow(r.channelOk, r.channelMessage);
        }
        wrap.innerHTML = html;
    }

    function renderRow(ok, msg) {
        const cls  = ok ? 'status-ok'  : 'status-error';
        const icon = ok ? 'fa-check-circle' : 'fa-exclamation-circle';
        return '<div class="notif-status-row ' + cls + '">' +
               '  <i class="fas ' + icon + ' status-icon"></i>' +
               '  <span class="status-text">' + escapeHtml(msg || '') + '</span>' +
               '</div>';
    }

    // -------------------------------------------------------------
    // 테스트 메시지 발송 (본인 → 본인)
    // -------------------------------------------------------------

    function testSend() {
        const btn = document.getElementById('btnTestSend');
        const wrap = document.getElementById('botSendResult');
        if (btn) { btn.disabled = true; btn.classList.add('is-busy'); }
        if (wrap) {
            wrap.innerHTML =
                '<div class="notif-status-row" style="background:#f3f4f6;border-color:#e5e7eb;color:#4b5563;">' +
                '  <i class="fas fa-spinner fa-spin status-icon"></i>' +
                '  <span class="status-text">메시지 발송 중...</span>' +
                '</div>';
        }

        fetch('/api/admin/notifications/test-send', {
            method: 'POST',
            credentials: 'same-origin'
        })
            .then(function (res) {
                if (res.status === 403) throw new Error('FORBIDDEN');
                if (!res.ok) throw new Error('SEND_FAILED');
                return res.json();
            })
            .then(function (r) {
                if (wrap) wrap.innerHTML = renderRow(r.success, r.message);
            })
            .catch(function (err) {
                if (wrap) {
                    wrap.innerHTML = renderRow(false,
                        err.message === 'FORBIDDEN'
                            ? '알림 관리 권한이 없습니다.'
                            : '발송 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
                }
                console.error('[테스트 발송] 요청 실패', err);
            })
            .finally(function () {
                if (btn) { btn.disabled = false; btn.classList.remove('is-busy'); }
            });
    }

    // -------------------------------------------------------------
    // 액션 바인딩
    // -------------------------------------------------------------

    function bindActions() {
        document.getElementById('btnSaveSettings')?.addEventListener('click', function () {
            saveSettings(collectFormPayload());
        });

        document.getElementById('btnTestBot')?.addEventListener('click', testConnection);
        document.getElementById('btnTestSend')?.addEventListener('click', testSend);

        document.getElementById('btnChangeToken')?.addEventListener('click', onChangeTokenClick);

        const enabledCb = document.getElementById('inIsEnabled');
        if (enabledCb) {
            enabledCb.addEventListener('change', function () {
                onKillSwitchChange(enabledCb.checked);
            });
        }

        document.querySelectorAll('[data-pause-mins]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const mins = parseInt(this.dataset.pauseMins, 10);
                applyPause(mins);
            });
        });
    }

    // -------------------------------------------------------------
    // 유틸
    // -------------------------------------------------------------

    function showError(msg) {
        Swal.fire({ icon: 'error', title: msg });
    }

    function setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val == null ? '' : val;
    }

    function getVal(id) {
        const el = document.getElementById(id);
        return el ? el.value : null;
    }

    function toIntOrNull(s) {
        if (s == null || s === '') return null;
        const n = parseInt(s, 10);
        return Number.isFinite(n) ? n : null;
    }

    function toLocalDateTimeString(d) {
        const pad = function (n) { return String(n).padStart(2, '0'); };
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
               'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }

    function formatKoreanDateTime(iso) {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        const pad = function (n) { return String(n).padStart(2, '0'); };
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
               ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
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
