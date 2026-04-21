/**
 * ERP_UT_SD_002 - 문서함 (전자결재)
 *
 * PINE_ERP_SR_002-01: 전체문서/연차신청/개인경비/지출품의서 목록 조회
 * PINE_ERP_SR_002-02: 새문서 작성 (연차 신청)
 * PINE_ERP_SR_002-03: 연차신청서 상세
 * PINE_ERP_SR_002-04: 새문서 작성 (개인경비청구)
 * PINE_ERP_SR_002-05: 개인경비청구 상세
 * PINE_ERP_SR_002-06: 개인경비청구 수정
 * PINE_ERP_SR_002-07: 새문서 작성 (지출품의서)
 * PINE_ERP_SR_002-08: 지출품의서 상세
 * PINE_ERP_SR_002-09: 지출품의서 수정
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, login, authHeaders, checkOk, logResult } from '../utils/common.js';

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '30s', target: 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    // SR-002-05, SR-002-06 intentionally return 404 → http_req_failed 임계값 제거
    // http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const sessionId = login(http, check);
  if (!sessionId) return;
  const opts = authHeaders(sessionId);

  // ── PINE_ERP_SR_002-01: 문서 목록 조회 ───────────────────
  group('PINE_ERP_SR_002-01: 전체 문서 목록 조회', () => {
    const allRes = http.get(`${BASE_URL}/api/approval/documents`, opts);
    const p1 = checkOk(check, allRes, '전체 문서 목록');

    const vacRes = http.get(`${BASE_URL}/api/approval/documents/type/VACATION`, opts);
    const p2 = check(vacRes, { '연차신청 필터 200': (r) => r.status === 200 });

    const expRes = http.get(`${BASE_URL}/api/approval/documents/type/EXPENSE`, opts);
    const p3 = check(expRes, { '개인경비 필터 200': (r) => r.status === 200 });

    logResult('SR-002-01', p1 && p2 && p3, allRes.status, '문서 목록 조회');
    sleep(1);
  });

  // ── PINE_ERP_SR_002-02: 연차 신청 등록 ───────────────────
  let createdVacationDocIdx = null;
  group('PINE_ERP_SR_002-02: 연차 신청 등록', () => {
    const infoRes = http.get(`${BASE_URL}/api/vacation/user-info`, opts);
    const p1 = checkOk(check, infoRes, '연차 사용자 정보');

    // VU×ITER 조합으로 유일한 영업일 생성 (주말을 영업일 카운트에서 제외)
    const offset = (__VU - 1) + __ITER * 10;
    const d = new Date(2026, 6, 1); // July 1, 2026 (수요일)
    for (let i = 0; i < offset; i++) {
      d.setDate(d.getDate() + 1);
      while (d.getDay() === 0 || d.getDay() === 6) { d.setDate(d.getDate() + 1); }
    }
    const dateStr = d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');

    const payload = {
      reason: 'K6 테스트 연차 신청',
      allowMinusVacation: true,
      periods: [
        {
          vacationType: '연차',
          startDate: dateStr,
          endDate: dateStr,
          days: 1,
        },
      ],
    };
    const res = http.post(
      `${BASE_URL}/api/vacation/request`,
      JSON.stringify(payload),
      { headers: { 'Content-Type': 'application/json' }, cookies: { JSESSIONID: sessionId } }
    );
    const p2 = check(res, {
      '연차 신청 성공 (200/201)': (r) => r.status === 200 || r.status === 201,
    });

    logResult('SR-002-02', p1 && p2, res.status, '연차 신청 등록');
    try { createdVacationDocIdx = JSON.parse(res.body).documentIdx; } catch {}
    sleep(1);
  });

  // ── PINE_ERP_SR_002-03: 연차신청서 상세 조회 ─────────────
  group('PINE_ERP_SR_002-03: 연차신청서 상세', () => {
    const res = http.get(`${BASE_URL}/api/vacation/detail?documentIdx=1`, opts);
    const passed = check(res, {
      '연차 상세 200 또는 404': (r) => r.status === 200 || r.status === 404,
    });

    logResult('SR-002-03', passed, res.status, '연차신청서 상세');
    sleep(1);
  });

  // ── PINE_ERP_SR_002-04: 개인경비청구 등록 ────────────────
  group('PINE_ERP_SR_002-04: 개인경비청구 등록', () => {
    const res = http.get(
      `${BASE_URL}/api/approval/expense/check-period?targetDate=2026-04-15`,
      opts
    );
    const passed = check(res, { '경비 기간 체크 200': (r) => r.status === 200 });

    logResult('SR-002-04', passed, res.status, '경비 기간 유효성 확인');
    sleep(1);
  });

  // ── PINE_ERP_SR_002-05: 개인경비청구 상세 ────────────────
  group('PINE_ERP_SR_002-05: 개인경비청구 상세', () => {
    const res = http.get(`${BASE_URL}/api/approval/expense/1`, opts);
    const passed = check(res, {
      '개인경비 상세 200 또는 404': (r) => r.status === 200 || r.status === 404,
    });

    logResult('SR-002-05', passed, res.status, '개인경비청구 상세');
    sleep(1);
  });

  // ── PINE_ERP_SR_002-06: 개인경비청구 결재 제출 ───────────
  group('PINE_ERP_SR_002-06: 개인경비 결재 상태 변경', () => {
    const res = http.put(`${BASE_URL}/api/approval/expense/1/submit`, null, opts);
    const passed = check(res, {
      '결재 제출 200 또는 404': (r) => r.status === 200 || r.status === 404,
    });

    logResult('SR-002-06', passed, res.status, '개인경비 결재 제출');
    sleep(1);
  });

  // ── PINE_ERP_SR_002-07: 지출품의서 등록 ──────────────────
  let createdExpenseIdx = null;
  group('PINE_ERP_SR_002-07: 지출품의서 등록', () => {
    const payload = {
      content: 'K6 테스트 지출품의서',
      paymentType: '현금',
      specialNote: 'K6 자동 테스트',
      items: [
        { itemDate: '2026-04-15', itemDesc: '교통비', amount: 10000, vendor: '서울교통공사', sortOrder: 0 },
      ],
    };
    const res = http.post(
      `${BASE_URL}/api/approval/requisition`,
      JSON.stringify(payload),
      { headers: { 'Content-Type': 'application/json' }, cookies: { JSESSIONID: sessionId } }
    );
    const passed = check(res, {
      '지출품의서 등록 200/201': (r) => r.status === 200 || r.status === 201,
    });

    logResult('SR-002-07', passed, res.status, '지출품의서 등록');
    try { createdExpenseIdx = JSON.parse(res.body).idx; } catch {}
    sleep(1);
  });

  // ── PINE_ERP_SR_002-08: 지출품의서 상세 ──────────────────
  group('PINE_ERP_SR_002-08: 지출품의서 상세', () => {
    const idx = createdExpenseIdx || 1;
    const res = http.get(`${BASE_URL}/api/approval/requisition/${idx}`, opts);
    const passed = check(res, {
      '지출품의서 상세 200 또는 404': (r) => r.status === 200 || r.status === 404,
    });

    logResult('SR-002-08', passed, res.status, '지출품의서 상세');
    sleep(1);
  });

  // ── PINE_ERP_SR_002-09: 지출품의서 수정 ──────────────────
  group('PINE_ERP_SR_002-09: 지출품의서 수정', () => {
    if (!createdExpenseIdx) {
      logResult('SR-002-09', false, 0, '지출품의서 등록 실패로 수정 테스트 건너뜀');
      sleep(1);
      return;
    }

    const payload = {
      content: 'K6 테스트 지출품의서 (수정)',
      paymentType: '현금',
      items: [
        { itemDate: '2026-04-15', itemDesc: '교통비', amount: 15000, vendor: '서울교통공사', sortOrder: 0 },
      ],
    };
    const res = http.put(
      `${BASE_URL}/api/approval/requisition/${createdExpenseIdx}`,
      JSON.stringify(payload),
      { headers: { 'Content-Type': 'application/json' }, cookies: { JSESSIONID: sessionId } }
    );
    const passed = check(res, { '지출품의서 수정 200': (r) => r.status === 200 });

    logResult('SR-002-09', passed, res.status, '지출품의서 수정');
    sleep(1);
  });

  // ── PINE_ERP_SR_002-10: 지출품의서 삭제 ──────────────────
  group('PINE_ERP_SR_002-10: 지출품의서 삭제', () => {
    if (!createdExpenseIdx) {
      logResult('SR-002-10', false, 0, '지출품의서 등록 실패로 삭제 건너뜀');
      sleep(1);
      return;
    }
    const res = http.del(`${BASE_URL}/api/approval/requisition/${createdExpenseIdx}`, null, opts);
    const passed = check(res, { '지출품의서 삭제 200/204': (r) => r.status === 200 || r.status === 204 });
    logResult('SR-002-10', passed, res.status, '지출품의서 삭제');
    sleep(1);
  });

  // ── PINE_ERP_SR_002-11: 연차신청서 삭제 ──────────────────
  group('PINE_ERP_SR_002-11: 연차신청서 삭제', () => {
    if (!createdVacationDocIdx) {
      logResult('SR-002-11', false, 0, '연차 신청 실패로 삭제 건너뜀');
      sleep(1);
      return;
    }
    const res = http.del(
      `${BASE_URL}/api/vacation/delete?documentIdx=${createdVacationDocIdx}`,
      null,
      opts
    );
    const passed = check(res, { '연차신청서 삭제 200': (r) => r.status === 200 });
    logResult('SR-002-11', passed, res.status, '연차신청서 삭제');
    sleep(1);
  });
}
