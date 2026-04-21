/**
 * ERP_UT_SD_001 - 일정관리
 *
 * PINE_ERP_SR_001-01: 일정 리스트 조회
 * PINE_ERP_SR_001-02: 일정 상세 팝업
 * PINE_ERP_SR_001-03: 일정 등록
 * PINE_ERP_SR_001-04: 일정 수정
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, loginFull, authHeaders, checkOk, logResult } from '../utils/common.js';

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '30s', target: 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<7000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const auth = loginFull(http, check);
  if (!auth) return;
  const { sessionId, userIdx } = auth;
  const opts = authHeaders(sessionId);

  // ── PINE_ERP_SR_001-01: 일정 리스트 조회 ─────────────────
  group('PINE_ERP_SR_001-01: 일정 리스트 조회', () => {
    const res = http.get(`${BASE_URL}/api/calendar/events/creator/1`, opts);
    const p1 = checkOk(check, res, '일정 리스트');

    const today = new Date().toISOString().split('T')[0];
    const holidayRes = http.get(`${BASE_URL}/api/holidays/check?date=${today}`, opts);
    const p2 = check(holidayRes, { '공휴일 체크 200': (r) => r.status === 200 });

    logResult('SR-001-01', p1 && p2, res.status, '일정 리스트 조회');
    sleep(1);
  });

  // ── PINE_ERP_SR_001-02: 일정 상세 팝업 ───────────────────
  group('PINE_ERP_SR_001-02: 일정 상세 조회', () => {
    const res = http.get(`${BASE_URL}/api/calendar/events/1`, opts);
    const passed = check(res, {
      '일정 상세 200 또는 404': (r) => r.status === 200 || r.status === 404,
    });

    logResult('SR-001-02', passed, res.status, '일정 상세 조회');
    sleep(1);
  });

  // ── PINE_ERP_SR_001-03: 일정 등록 ────────────────────────
  let createdIdx = null;
  group('PINE_ERP_SR_001-03: 일정 등록', () => {
    const payload = {
      eventTitle: 'K6 테스트 일정',
      startDate: '2026-04-20',
      endDate: '2026-04-20',
      startTime: '10:00',
      endTime: '11:00',
      eventType: 'PERSONAL',
      eventDescription: 'K6 자동 테스트로 생성된 일정',
      creatorIdx: userIdx,
      isAllDay: false,
      participants: [],
    };

    const res = http.post(
      `${BASE_URL}/api/calendar/events`,
      JSON.stringify(payload),
      { headers: { 'Content-Type': 'application/json' }, cookies: { JSESSIONID: sessionId } }
    );

    const passed = check(res, {
      '일정 등록 성공 (200/201)': (r) => r.status === 200 || r.status === 201,
    });

    logResult('SR-001-03', passed, res.status, '일정 등록');

    try { createdIdx = JSON.parse(res.body).event.idx; } catch {}
    sleep(1);
  });

  // ── PINE_ERP_SR_001-04: 일정 수정 ────────────────────────
  group('PINE_ERP_SR_001-04: 일정 수정', () => {
    if (!createdIdx) {
      logResult('SR-001-04', false, 0, '일정 등록 실패로 수정 테스트 건너뜀');
      sleep(1);
      return;
    }

    const updatePayload = {
      eventTitle: 'K6 테스트 일정 (수정됨)',
      startDate: '2026-04-20',
      endDate: '2026-04-21',
      startTime: '10:00',
      endTime: '12:00',
      eventType: 'PERSONAL',
      eventDescription: '수정된 일정',
      creatorIdx: userIdx,
      isAllDay: false,
      participants: [],
    };

    const res = http.put(
      `${BASE_URL}/api/calendar/events/${createdIdx}`,
      JSON.stringify(updatePayload),
      { headers: { 'Content-Type': 'application/json' }, cookies: { JSESSIONID: sessionId } }
    );

    const passed = check(res, { '일정 수정 성공 (200)': (r) => r.status === 200 });
    logResult('SR-001-04', passed, res.status, '일정 수정');

    // 정리: 생성한 일정 삭제 (userId 쿼리 파라미터 필수)
    http.del(`${BASE_URL}/api/calendar/events/${createdIdx}?userId=${userIdx}`, null, opts);
    sleep(1);
  });
}
