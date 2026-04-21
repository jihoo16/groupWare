/**
 * ERP_UT_SD_005 - 연차 관리
 *
 * PINE_ERP_SR_005-01: 연차 관리 현황 조회 (총 연차, 사용, 잔여, 달력)
 * PINE_ERP_SR_005-02: 연차 현황 (연도별 현황, 비례 연차)
 * PINE_ERP_SR_005-03: 사용 연차 상세
 * PINE_ERP_SR_005-04: 잔여 연차 상세
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
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const sessionId = login(http, check);
  if (!sessionId) return;
  const opts = authHeaders(sessionId);

  // ── PINE_ERP_SR_005-01: 연차 관리 현황 ───────────────────
  group('PINE_ERP_SR_005-01: 연차 현황 조회', () => {
    const userInfoRes = http.get(`${BASE_URL}/api/vacation/user-info`, opts);
    const p1 = checkOk(check, userInfoRes, '연차 사용자 정보');
    const p2 = check(userInfoRes, {
      '총 연차 포함': (r) => {
        try { return JSON.parse(r.body).totalDays !== undefined; }
        catch { return false; }
      },
    });

    const datesRes = http.get(`${BASE_URL}/api/vacation/requested-dates`, opts);
    const p3 = checkOk(check, datesRes, '연차 신청 날짜 목록');

    const scheduleRes = http.get(`${BASE_URL}/api/vacation/accrual-schedule`, opts);
    const p4 = checkOk(check, scheduleRes, '연차 누적 스케줄');

    logResult('SR-005-01', p1 && p2 && p3 && p4, userInfoRes.status, '연차 현황 조회');
    sleep(1);
  });

  // ── PINE_ERP_SR_005-02: 연차 현황 상세 ───────────────────
  group('PINE_ERP_SR_005-02: 연차 계산 상세 (비례 연차 포함)', () => {
    const res = http.get(`${BASE_URL}/api/vacation/calculation-detail`, opts);
    const p1 = checkOk(check, res, '연차 계산 상세');
    const p2 = check(res, {
      '연차 계산 상세 응답 구조 정상': (r) => {
        try { return JSON.parse(r.body) !== null; }
        catch { return false; }
      },
    });

    logResult('SR-005-02', p1 && p2, res.status, '연차 계산 상세');
    sleep(1);
  });

  // ── PINE_ERP_SR_005-03: 사용 연차 상세 ───────────────────
  group('PINE_ERP_SR_005-03: 연차 사용 내역', () => {
    const res = http.get(`${BASE_URL}/api/vacation/history`, opts);
    const p1 = checkOk(check, res, '연차 사용 내역');
    const p2 = check(res, {
      '연차 이력 배열 반환': (r) => {
        try { return Array.isArray(JSON.parse(r.body)); }
        catch { return false; }
      },
    });

    logResult('SR-005-03', p1 && p2, res.status, '연차 사용 내역');
    sleep(1);
  });

  // ── PINE_ERP_SR_005-04: 잔여 연차 상세 ───────────────────
  group('PINE_ERP_SR_005-04: 잔여 연차 조회', () => {
    const res = http.get(`${BASE_URL}/api/vacation/user-info`, opts);
    const passed = check(res, {
      '잔여 연차 필드 존재': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.remainingDays !== undefined || body.usedDays !== undefined;
        } catch { return false; }
      },
      '응답 200': (r) => r.status === 200,
    });

    logResult('SR-005-04', passed, res.status, '잔여 연차 조회');
    sleep(1);
  });
}
