/* =========================================================
 * settings.html [알림] 탭 — Phase 4 실 API 연결
 *
 * - GET  /api/me/subscriptions
 * - PUT  /api/me/subscriptions
 *
 * Mattermost 연결 상태 카드는 발송 시 자동 확인되므로 사용자 화면에서는
 * 안내 문구로 대체. [테스트 메시지 보내기] 는 다음 슬라이스에서 본인 발송 기능 추가.
 * ========================================================= */

(function () {
    'use strict';

    // 사용자 화면에 노출할 알림 종류 (1차 MVP, force_send 잠긴 행 포함)
    const VISIBLE_TYPES = [
        { code: 'C1901', name: '서명요청',         desc: '내가 서명할 차례가 됐을 때' },
        { code: 'C1902', name: '서명진행',         desc: '내 문서의 중간 서명 단계가 끝났을 때' },
        { code: 'C1903', name: '서명완료알림',     desc: '내 문서의 모든 서명이 끝났을 때' },
        { code: 'C1905', name: '연차승인',         desc: '내 연차 신청이 승인됐을 때' },
        { code: 'C1906', name: '연차반려',         desc: '내 연차 신청이 반려됐을 때' },
        { code: 'C1907', name: '연차관리자삭제',   desc: '관리자가 내 연차를 삭제했을 때' },
        { code: 'C1908', name: '일정초대',         desc: '내가 일정 참여자로 등록됐을 때' },
        { code: 'C1914', name: '알림발송실패',     desc: '내가 요청한 알림이 상대방에게 전달 못 했을 때' }
    ];

    let currentSubscriptionsByKey = {};
    let currentForceSendByCode    = {};

    document.addEventListener('DOMContentLoaded', function () {
        const notifTab = document.getElementById('notification');
        if (!notifTab) return;

        loadLinkStatus();
        loadSubscriptions();
        bindActions();
    });

    // -------------------------------------------------------------
    // Mattermost 연결 상태
    // -------------------------------------------------------------

    function loadLinkStatus() {
        fetch('/api/me/mattermost-link', { credentials: 'same-origin' })
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (link) { renderLinkStatus(link); })
            .catch(function () { renderLinkStatus(null); });
    }

    function renderLinkStatus(link) {
        const wrap = document.getElementById('mmLinkStatus');
        const info = document.getElementById('mmLinkInfo');
        if (!wrap) return;

        if (!link || !link.connected) {
            wrap.classList.add('disconnected');
            if (link && link.lastError) {
                wrap.innerHTML =
                    '<i class="fas fa-exclamation-circle status-icon" style="color:#dc2626;"></i>' +
                    '<div class="status-text"><strong>연결 안 됨</strong>' + escapeHtml(link.lastError) + '</div>';
            } else {
                wrap.innerHTML =
                    '<i class="fas fa-info-circle status-icon" style="color:#3b82f6;"></i>' +
                    '<div class="status-text"><strong>아직 연결 안 됨</strong>첫 알림 발송 시 자동으로 봇과 연결됩니다.</div>';
            }
            if (info) info.innerHTML = '';
            return;
        }

        wrap.classList.remove('disconnected');
        wrap.innerHTML =
            '<i class="fas fa-check-circle status-icon" style="color:#059669;"></i>' +
            '<div class="status-text"><strong>연결됨</strong>봇이 본인 Mattermost 와 정상 연결되어 있습니다.</div>';

        if (info) {
            info.innerHTML =
                '<dt>봇과의 DM 채널 ID</dt>' +
                '<dd style="font-family:monospace;font-size:12px;color:#6b7280;">' +
                escapeHtml(link.mmDmChannelId || '미생성') + '</dd>' +
                '<dt>마지막 캐시 갱신</dt>' +
                '<dd>' + escapeHtml(formatTime(link.cachedAt) || '-') + '</dd>';
        }
    }

    function formatTime(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        const pad = function (n) { return String(n).padStart(2, '0'); };
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
               ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    // -------------------------------------------------------------
    // 구독 조회 + 렌더
    // -------------------------------------------------------------

    function loadSubscriptions() {
        fetch('/api/me/subscriptions', { credentials: 'same-origin' })
            .then(function (res) {
                if (!res.ok) throw new Error('LOAD_FAILED');
                return res.json();
            })
            .then(function (data) {
                currentSubscriptionsByKey = {};
                currentForceSendByCode    = {};
                (data.subscriptions || []).forEach(function (s) {
                    currentSubscriptionsByKey[s.notificationType + ':' + s.channel] = s;
                    if (s.isForceSend) currentForceSendByCode[s.notificationType] = true;
                });
                renderTypeGrid();
                renderQuietHours(data.quietHours);
            })
            .catch(function (err) {
                console.error('[Settings/알림] 조회 실패', err);
                Swal.fire({ icon: 'error', title: '알림 설정을 불러오지 못했습니다',
                    text: '잠시 후 다시 시도해 주세요.' });
            });
    }

    function renderTypeGrid() {
        const container = document.getElementById('notifTypeGrid');
        if (!container) return;

        const header =
            '<div class="notif-grid-head">' +
            '  <div class="col-name">알림 종류</div>' +
            '  <div class="col-channel"><i class="fas fa-comment-dots" title="Mattermost"></i> MM</div>' +
            '  <div class="col-channel"><i class="fas fa-bell" title="그룹웨어 인박스"></i> 인박스</div>' +
            '</div>';

        const rows = VISIBLE_TYPES.map(function (t) {
            const subMM    = currentSubscriptionsByKey[t.code + ':C2101'] || {};
            const subInWeb = currentSubscriptionsByKey[t.code + ':C2103'] || {};
            const isForce  = !!currentForceSendByCode[t.code];
            const disabled = isForce ? 'disabled' : '';
            const rowCls   = ['notif-grid-row', isForce ? 'force-send' : ''].filter(Boolean).join(' ');

            return (
                '<div class="' + rowCls + '" data-code="' + t.code + '">' +
                '  <div class="col-name">' +
                '    <div class="item-name">' + escapeHtml(t.name) + '</div>' +
                '    <div class="item-desc">' + escapeHtml(t.desc) + '</div>' +
                '  </div>' +
                '  <div class="col-channel">' +
                '    <label class="ch-toggle"><input type="checkbox" data-ch="C2101" ' +
                (subMM.isEnabled ? 'checked' : '') + ' ' + disabled + '><span></span></label>' +
                '  </div>' +
                '  <div class="col-channel">' +
                '    <label class="ch-toggle"><input type="checkbox" data-ch="C2103" ' +
                (subInWeb.isEnabled ? 'checked' : '') + ' ' + disabled + '><span></span></label>' +
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

    function renderQuietHours(qh) {
        qh = qh || { enabled: false, start: '22:00', end: '08:00' };
        const enabled = document.getElementById('quietHoursEnabled');
        const start   = document.getElementById('quietHoursStart');
        const end     = document.getElementById('quietHoursEnd');
        if (enabled) enabled.checked = !!qh.enabled;
        if (start)   start.value     = qh.start || '22:00';
        if (end)     end.value       = qh.end   || '08:00';
        applyQuietGroupState(qh.enabled);

        if (enabled) {
            enabled.addEventListener('change', function () {
                applyQuietGroupState(enabled.checked);
            });
        }
    }

    function applyQuietGroupState(isOn) {
        const group = document.getElementById('quietTimeGroup');
        if (group) group.classList.toggle('disabled', !isOn);
    }

    // -------------------------------------------------------------
    // 저장
    // -------------------------------------------------------------

    function collectPayload() {
        const subs = [];
        VISIBLE_TYPES.forEach(function (t) {
            const isForce = !!currentForceSendByCode[t.code];
            if (isForce) return; // 잠긴 행은 보내지 않음 (어차피 서버가 무시)
            const row = document.querySelector('[data-code="' + t.code + '"]');
            if (!row) return;
            const mmCb = row.querySelector('input[data-ch="C2101"]');
            const inCb = row.querySelector('input[data-ch="C2103"]');
            subs.push({ notificationType: t.code, channel: 'C2101', isEnabled: mmCb && mmCb.checked });
            subs.push({ notificationType: t.code, channel: 'C2103', isEnabled: inCb && inCb.checked });
        });

        const enabled = document.getElementById('quietHoursEnabled');
        const start   = document.getElementById('quietHoursStart');
        const end     = document.getElementById('quietHoursEnd');

        return {
            subscriptions: subs,
            quietHours: {
                enabled: enabled ? !!enabled.checked : false,
                start: start ? start.value : '22:00',
                end:   end   ? end.value   : '08:00'
            }
        };
    }

    function save() {
        fetch('/api/me/subscriptions', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(collectPayload())
        })
            .then(function (res) {
                if (!res.ok) throw new Error('SAVE_FAILED');
                return res.json();
            })
            .then(function (data) {
                currentSubscriptionsByKey = {};
                currentForceSendByCode    = {};
                (data.subscriptions || []).forEach(function (s) {
                    currentSubscriptionsByKey[s.notificationType + ':' + s.channel] = s;
                    if (s.isForceSend) currentForceSendByCode[s.notificationType] = true;
                });
                renderTypeGrid();
                renderQuietHours(data.quietHours);
                Swal.fire({ icon: 'success', title: '저장되었습니다',
                    timer: 1200, showConfirmButton: false });
            })
            .catch(function (err) {
                console.error('[Settings/알림] 저장 실패', err);
                Swal.fire({ icon: 'error', title: '저장에 실패했습니다',
                    text: '잠시 후 다시 시도해 주세요.' });
            });
    }

    // -------------------------------------------------------------
    // 액션
    // -------------------------------------------------------------

    function bindActions() {
        const saveBtn = document.getElementById('btnNotifSave');
        if (saveBtn) saveBtn.addEventListener('click', save);

        const testBtn = document.getElementById('btnMmTest');
        if (testBtn) {
            testBtn.addEventListener('click', function () {
                testBtn.disabled = true;
                fetch('/api/me/notifications/test-send', {
                    method: 'POST', credentials: 'same-origin'
                })
                    .then(function (res) {
                        if (!res.ok) throw new Error('FAIL');
                        return res.json();
                    })
                    .then(function (r) {
                        if (r.success) {
                            Swal.fire({ icon: 'success', title: '메시지를 보냈습니다',
                                text: r.message, timer: 2400, showConfirmButton: false });
                            loadLinkStatus();
                        } else {
                            Swal.fire({ icon: 'error', title: '발송에 실패했습니다',
                                text: r.message || '잠시 후 다시 시도해 주세요.' });
                        }
                    })
                    .catch(function () {
                        Swal.fire({ icon: 'error', title: '요청을 처리하지 못했습니다',
                            text: '잠시 후 다시 시도해 주세요.' });
                    })
                    .finally(function () { testBtn.disabled = false; });
            });
        }
        const refreshBtn = document.getElementById('btnMmRefresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async function () {
                const result = await Swal.fire({
                    title: 'Mattermost 연결을 다시 맺을까요?',
                    text: '저장된 연결 캐시를 비우고, 다음 알림 발송 시 새로 조회합니다.',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: '네',
                    cancelButtonText: '취소'
                });
                if (!result.isConfirmed) return;
                fetch('/api/me/notifications/refresh-link', {
                    method: 'POST', credentials: 'same-origin'
                })
                    .then(function (res) {
                        if (!res.ok) throw new Error('FAIL');
                        return res.json();
                    })
                    .then(function (link) {
                        renderLinkStatus(link);
                        Swal.fire({ icon: 'success', title: '캐시를 비웠습니다',
                            text: '다음 알림이 발생하면 새로 연결을 맺습니다.',
                            timer: 1800, showConfirmButton: false });
                    })
                    .catch(function () {
                        Swal.fire({ icon: 'error', title: '처리에 실패했습니다',
                            text: '잠시 후 다시 시도해 주세요.' });
                    });
            });
        }
    }

    // -------------------------------------------------------------
    // 유틸
    // -------------------------------------------------------------

    function escapeHtml(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
})();
