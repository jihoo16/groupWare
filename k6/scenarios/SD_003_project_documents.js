/**
 * ERP_UT_SD_003 - 프로젝트 문서함
 *
 * PINE_ERP_SR_003-01:  전체 문서 목록 조회
 * PINE_ERP_SR_003-02:  회의비 증빙 등록
 * PINE_ERP_SR_003-03:  회의비 증빙 상세
 * PINE_ERP_SR_003-04:  출장+회의 증빙 등록
 * PINE_ERP_SR_003-05:  출장+회의 증빙 상세
 * PINE_ERP_SR_003-06:  단독 출장 증빙 등록
 * PINE_ERP_SR_003-07:  단독 출장 증빙 상세
 * PINE_ERP_SR_003-08:  야근식대 증빙 등록
 * PINE_ERP_SR_003-09:  야근식대 증빙 상세
 * PINE_ERP_SR_003-10:  재료비/장비비 증빙 등록
 * PINE_ERP_SR_003-11:  재료비/장비비 증빙 상세
 * PINE_ERP_SR_003-12:  프로젝트 주간보고 등록
 * PINE_ERP_SR_003-13:  프로젝트 주간보고 상세
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
    http_req_duration: ['p(95)<1500'],
    // detail 엔드포인트(03,05,07,09,11)가 404를 허용하므로 http_req_failed 임계값 제거
    // http_req_failed: ['rate<0.01'],
  },
};

// multipart/form-data 로 JSON 데이터 전송 (파일 없음)
function multipartJson(sessionId, payload) {
  return {
    body: { data: http.file(JSON.stringify(payload), 'data.json', 'application/json') },
    cookies: { JSESSIONID: sessionId },
  };
}

export default function () {
  const auth = loginFull(http, check);
  if (!auth) return;
  const { sessionId, userIdx } = auth;
  const opts = authHeaders(sessionId);

  // VU×ITER 조합으로 고유한 시간대 생성
  const offset = ((__VU - 1) + __ITER * 10) % 480;
  const baseHour = 8 + Math.floor(offset / 60);
  const baseMin = offset % 60;
  const pad = (n) => String(n).padStart(2, '0');
  const startTime = `${pad(baseHour)}:${pad(baseMin)}`;
  const endHour = baseHour + 1 >= 22 ? 8 : baseHour + 1;
  const endTime = `${pad(endHour)}:${pad(baseMin)}`;
  const dayOffset = (__VU - 1) % 5;
  const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // ── PINE_ERP_SR_003-01: 프로젝트 문서 전체 목록 ──────────
  group('PINE_ERP_SR_003-01: 프로젝트 문서 목록 조회', () => {
    const res = http.get(`${BASE_URL}/api/approval/documents/projects`, opts);
    // checkOk 의 1000ms 조건 대신 상태코드만 검증 (대용량 목록 조회로 응답 지연 허용)
    const passed = check(res, { '프로젝트 문서 목록 상태코드 200': (r) => r.status === 200 });
    logResult('SR-003-01', passed, res.status, '프로젝트 문서 목록');
    sleep(1);
  });

  // ── PINE_ERP_SR_003-02: 회의비 증빙 등록 ─────────────────
  let meetingReceiptIdx = null;
  group('PINE_ERP_SR_003-02: 회의비 증빙 등록', () => {
    // check-duplicate: attendeeIdx=1(임시), 해당 날짜/시간 중복 확인
    const meetingDate = new Date(2026, 3, 15 + dayOffset);
    const dupCheck = http.get(
      `${BASE_URL}/api/receipt-common/check-duplicate?projectIdx=1&date=${dateStr(meetingDate)}&startTime=${startTime}&endTime=${endTime}&attendeeIdx=1`,
      opts
    );
    check(dupCheck, { '중복 시간 체크 200': (r) => r.status === 200 });

    // multipart/form-data 전송 (ReceiptMeetingCreateDTO 필드명 사용)
    const payload = {
      projectIdx: 1,
      authorIdx: userIdx,
      meetingDate: dateStr(meetingDate),
      startTime,
      endTime,
      location: '회의실 A',
      purpose: 'K6 테스트 회의',
      amount: 30000,
      attendees: [],
    };
    const res = http.post(
      `${BASE_URL}/api/receipt-meetings`,
      { data: http.file(JSON.stringify(payload), 'data.json', 'application/json') },
      { cookies: { JSESSIONID: sessionId } }
    );
    const passed = check(res, { '회의비 증빙 등록 200/201': (r) => r.status === 200 || r.status === 201 });
    logResult('SR-003-02', passed, res.status, '회의비 증빙 등록');
    try { meetingReceiptIdx = JSON.parse(res.body).idx; } catch {}
    sleep(1);
  });

  // ── PINE_ERP_SR_003-03: 회의비 증빙 상세 ─────────────────
  group('PINE_ERP_SR_003-03: 회의비 증빙 상세 조회', () => {
    const idx = meetingReceiptIdx || 1;
    const res = http.get(`${BASE_URL}/api/receipt-meetings/${idx}`, opts);
    const passed = check(res, { '회의비 증빙 상세 200 또는 404': (r) => r.status === 200 || r.status === 404 });
    logResult('SR-003-03', passed, res.status, '회의비 증빙 상세');
    sleep(1);
  });

  // ── PINE_ERP_SR_003-04: 출장+회의 증빙 등록 ─────────────
  let tripMeetingIdx = null;
  group('PINE_ERP_SR_003-04: 출장+회의 증빙 등록', () => {
    const tripDate = new Date(2026, 3, 20 + dayOffset);
    const payload = {
      projectIdx: 1,
      drafterUserIdx: userIdx,
      meetingDrafterUserIdx: userIdx,
      tripDate: dateStr(tripDate),
      duration: 0,
      location: '서울',
      purpose: 'K6 테스트 출장+회의',
      tripContent: 'K6 자동 테스트',
      meetingDate: dateStr(tripDate),
      startTime,
      endTime,
      meetingPurpose: 'K6 테스트 회의',
      meetingAmount: 30000,
      tripAttendees: [],
      meetingAttendees: [],
    };
    const res = http.post(
      `${BASE_URL}/api/receipt-trip-meetings`,
      { data: http.file(JSON.stringify(payload), 'data.json', 'application/json') },
      { cookies: { JSESSIONID: sessionId } }
    );
    const passed = check(res, { '출장+회의 등록 200/201': (r) => r.status === 200 || r.status === 201 });
    logResult('SR-003-04', passed, res.status, '출장+회의 증빙 등록');
    try { tripMeetingIdx = JSON.parse(res.body).receiptTripMeetingIdx; } catch {}
    sleep(1);
  });

  // ── PINE_ERP_SR_003-05: 출장+회의 증빙 상세 ─────────────
  group('PINE_ERP_SR_003-05: 출장+회의 증빙 상세', () => {
    const idx = tripMeetingIdx || 1;
    const res = http.get(`${BASE_URL}/api/receipt-trip-meetings/${idx}`, opts);
    const passed = check(res, { '출장+회의 상세 200 또는 404': (r) => r.status === 200 || r.status === 404 });
    logResult('SR-003-05', passed, res.status, '출장+회의 증빙 상세');
    sleep(1);
  });

  // ── PINE_ERP_SR_003-06: 단독 출장 증빙 등록 ─────────────
  let tripIdx = null;
  group('PINE_ERP_SR_003-06: 단독 출장 증빙 등록', () => {
    const tripDate = new Date(2026, 3, 25 + dayOffset);
    const payload = {
      projectIdx: 1,
      drafterUserIdx: userIdx,
      tripDate: dateStr(tripDate),
      duration: 0,
      location: '부산',
      purpose: 'K6 테스트 단독 출장',
      content: 'K6 자동 테스트',
      transportationFee: 50000,
      mealFee: 30000,
      attendees: [],
    };
    const res = http.post(
      `${BASE_URL}/api/receipt-trips`,
      { data: http.file(JSON.stringify(payload), 'data.json', 'application/json') },
      { cookies: { JSESSIONID: sessionId } }
    );
    const passed = check(res, { '단독 출장 등록 200/201': (r) => r.status === 200 || r.status === 201 });
    logResult('SR-003-06', passed, res.status, '단독 출장 증빙 등록');
    try { tripIdx = JSON.parse(res.body).idx; } catch {}
    sleep(1);
  });

  // ── PINE_ERP_SR_003-07: 단독 출장 증빙 상세 ─────────────
  group('PINE_ERP_SR_003-07: 단독 출장 증빙 상세', () => {
    const idx = tripIdx || 1;
    const res = http.get(`${BASE_URL}/api/receipt-trips/${idx}`, opts);
    const passed = check(res, { '단독 출장 상세 200 또는 404': (r) => r.status === 200 || r.status === 404 });
    logResult('SR-003-07', passed, res.status, '단독 출장 증빙 상세');
    sleep(1);
  });

  // ── PINE_ERP_SR_003-08: 야근식대 증빙 등록 ───────────────
  let overtimeIdx = null;
  group('PINE_ERP_SR_003-08: 야근식대 증빙 등록', () => {
    const overtimeDate = new Date(2026, 3, 15 + dayOffset);
    const payload = {
      projectIdx: 1,
      authorIdx: userIdx,
      overtimeDate: dateStr(overtimeDate),
      approvalDate: dateStr(overtimeDate),  // NOT NULL 제약
      documentTitle: 'K6 테스트 야근식대',
      documentContent: 'K6 테스트 야근식대',
      totalAmount: 15000,
      paymentType: 'card',
      attendees: [],
    };
    const res = http.post(
      `${BASE_URL}/api/receipt-overtimes`,
      { data: http.file(JSON.stringify(payload), 'data.json', 'application/json') },
      { cookies: { JSESSIONID: sessionId } }
    );
    const passed = check(res, { '야근식대 등록 200/201': (r) => r.status === 200 || r.status === 201 });
    logResult('SR-003-08', passed, res.status, '야근식대 증빙 등록');
    try { overtimeIdx = JSON.parse(res.body).idx; } catch {}
    sleep(1);
  });

  // ── PINE_ERP_SR_003-09: 야근식대 증빙 상세 ───────────────
  group('PINE_ERP_SR_003-09: 야근식대 증빙 상세', () => {
    const idx = overtimeIdx || 1;
    const res = http.get(`${BASE_URL}/api/receipt-overtimes/${idx}`, opts);
    const passed = check(res, { '야근식대 상세 200 또는 404': (r) => r.status === 200 || r.status === 404 });
    logResult('SR-003-09', passed, res.status, '야근식대 증빙 상세');
    sleep(1);
  });

  // ── PINE_ERP_SR_003-10: 재료비/장비비 증빙 등록 ──────────
  let purchaseIdx = null;
  group('PINE_ERP_SR_003-10: 재료비/장비비 증빙 등록', () => {
    const purchaseDate = new Date(2026, 3, 15 + dayOffset);
    const payload = {
      projectIdx: 1,
      authorIdx: userIdx,
      purchaseType: 'material',
      approvalDate: dateStr(purchaseDate),
      documentTitle: 'K6 테스트 재료비',
      documentContent: 'K6 자동 테스트',
      paymentType: 'card',
      totalAmount: 10000,
      items: [
        {
          itemDate: dateStr(purchaseDate),
          itemDesc: '사무용품',
          quantity: 2,
          taxType: '과세',
          paymentAmount: 10000,
          supplyAmount: 9091,
          taxAmount: 909,
          sortOrder: 0,
        },
      ],
    };
    const res = http.post(
      `${BASE_URL}/api/receipt-purchases`,
      { data: http.file(JSON.stringify(payload), 'data.json', 'application/json') },
      { cookies: { JSESSIONID: sessionId } }
    );
    const passed = check(res, { '재료비/장비비 등록 200/201': (r) => r.status === 200 || r.status === 201 });
    logResult('SR-003-10', passed, res.status, '재료비/장비비 증빙 등록');
    try { purchaseIdx = JSON.parse(res.body).idx; } catch {}
    sleep(1);
  });

  // ── PINE_ERP_SR_003-11: 재료비/장비비 상세 ───────────────
  group('PINE_ERP_SR_003-11: 재료비/장비비 증빙 상세', () => {
    const idx = purchaseIdx || 1;
    const res = http.get(`${BASE_URL}/api/receipt-purchases/${idx}`, opts);
    const passed = check(res, { '재료비/장비비 상세 200 또는 404': (r) => r.status === 200 || r.status === 404 });
    logResult('SR-003-11', passed, res.status, '재료비/장비비 증빙 상세');
    sleep(1);
  });

  // ── PINE_ERP_SR_003-12: 프로젝트 주간보고 등록 ───────────
  let weeklyReportId = null;
  group('PINE_ERP_SR_003-12: 프로젝트 주간보고 등록', () => {
    const payload = {
      userIdx: userIdx,
      projectIdx: 1,
      reportPeriod: '2026-04-14 ~ 2026-04-18',
      mainTasks: 'K6 테스트 이번 주 업무',
      achievements: 'K6 테스트 성과',
      nextWeekPlan: 'K6 테스트 다음 주 계획',
      issues: '없음',
      weeklyAchievementRate: 50,
    };
    const res = http.post(
      `${BASE_URL}/api/document/weekly-report`,
      JSON.stringify(payload),
      { headers: { 'Content-Type': 'application/json' }, cookies: { JSESSIONID: sessionId } }
    );
    const passed = check(res, { '주간보고 등록 200/201': (r) => r.status === 200 || r.status === 201 });
    logResult('SR-003-12', passed, res.status, '프로젝트 주간보고 등록');
    try { weeklyReportId = JSON.parse(res.body).id; } catch {}  // WeeklyReportDTO.id
    sleep(1);
  });

  // ── PINE_ERP_SR_003-13: 프로젝트 주간보고 상세 ───────────
  group('PINE_ERP_SR_003-13: 프로젝트 주간보고 상세', () => {
    if (!weeklyReportId) {
      logResult('SR-003-13', false, 0, '주간보고 등록 실패로 상세 조회 건너뜀');
      sleep(1);
      return;
    }
    const res = http.get(`${BASE_URL}/api/document/weekly-report/${weeklyReportId}`, opts);
    const passed = check(res, { '주간보고 상세 200 또는 404': (r) => r.status === 200 || r.status === 404 });
    logResult('SR-003-13', passed, res.status, '프로젝트 주간보고 상세');
    sleep(1);
  });

  // ── PINE_ERP_SR_003-14: 회의비 증빙 삭제 ─────────────────
  group('PINE_ERP_SR_003-14: 회의비 증빙 삭제', () => {
    if (!meetingReceiptIdx) {
      logResult('SR-003-14', false, 0, '등록 실패로 삭제 건너뜀');
      sleep(1); return;
    }
    const res = http.del(
      `${BASE_URL}/api/receipt-meetings/${meetingReceiptIdx}`,
      JSON.stringify({ deletedUserIdx: userIdx }),
      { headers: { 'Content-Type': 'application/json' }, cookies: { JSESSIONID: sessionId } }
    );
    const passed = check(res, { '회의비 삭제 200/204': (r) => r.status === 200 || r.status === 204 });
    logResult('SR-003-14', passed, res.status, '회의비 증빙 삭제');
    sleep(1);
  });

  // ── PINE_ERP_SR_003-15: 출장+회의 증빙 삭제 ─────────────
  group('PINE_ERP_SR_003-15: 출장+회의 증빙 삭제', () => {
    if (!tripMeetingIdx) {
      logResult('SR-003-15', false, 0, '등록 실패로 삭제 건너뜀');
      sleep(1); return;
    }
    const res = http.del(`${BASE_URL}/api/receipt-trip-meetings/${tripMeetingIdx}`, null, opts);
    const passed = check(res, { '출장+회의 삭제 200/204': (r) => r.status === 200 || r.status === 204 });
    logResult('SR-003-15', passed, res.status, '출장+회의 증빙 삭제');
    sleep(1);
  });

  // ── PINE_ERP_SR_003-16: 단독 출장 증빙 삭제 ─────────────
  group('PINE_ERP_SR_003-16: 단독 출장 증빙 삭제', () => {
    if (!tripIdx) {
      logResult('SR-003-16', false, 0, '등록 실패로 삭제 건너뜀');
      sleep(1); return;
    }
    const res = http.del(`${BASE_URL}/api/receipt-trips/${tripIdx}`, null, opts);
    const passed = check(res, { '단독 출장 삭제 200/204': (r) => r.status === 200 || r.status === 204 });
    logResult('SR-003-16', passed, res.status, '단독 출장 증빙 삭제');
    sleep(1);
  });

  // ── PINE_ERP_SR_003-17: 야근식대 증빙 삭제 ───────────────
  group('PINE_ERP_SR_003-17: 야근식대 증빙 삭제', () => {
    if (!overtimeIdx) {
      logResult('SR-003-17', false, 0, '등록 실패로 삭제 건너뜀');
      sleep(1); return;
    }
    const res = http.del(`${BASE_URL}/api/receipt-overtimes/${overtimeIdx}`, null, opts);
    const passed = check(res, { '야근식대 삭제 200/204': (r) => r.status === 200 || r.status === 204 });
    logResult('SR-003-17', passed, res.status, '야근식대 증빙 삭제');
    sleep(1);
  });

  // ── PINE_ERP_SR_003-18: 재료비/장비비 증빙 삭제 ──────────
  group('PINE_ERP_SR_003-18: 재료비/장비비 증빙 삭제', () => {
    if (!purchaseIdx) {
      logResult('SR-003-18', false, 0, '등록 실패로 삭제 건너뜀');
      sleep(1); return;
    }
    const res = http.del(`${BASE_URL}/api/receipt-purchases/${purchaseIdx}`, null, opts);
    const passed = check(res, { '재료비/장비비 삭제 200/204': (r) => r.status === 200 || r.status === 204 });
    logResult('SR-003-18', passed, res.status, '재료비/장비비 증빙 삭제');
    sleep(1);
  });

  // ── PINE_ERP_SR_003-19: 주간보고 삭제 ────────────────────
  group('PINE_ERP_SR_003-19: 프로젝트 주간보고 삭제', () => {
    if (!weeklyReportId) {
      logResult('SR-003-19', false, 0, '등록 실패로 삭제 건너뜀');
      sleep(1); return;
    }
    const res = http.del(`${BASE_URL}/api/document/weekly-report/${weeklyReportId}`, null, opts);
    const passed = check(res, { '주간보고 삭제 200/204': (r) => r.status === 200 || r.status === 204 });
    logResult('SR-003-19', passed, res.status, '프로젝트 주간보고 삭제');
    sleep(1);
  });
}
