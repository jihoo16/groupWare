/**
 * ERP_UT_SD_000 - 인증 관리
 *
 * PINE_ERP_SR_000-01: 로그인 성공
 * PINE_ERP_SR_000-02: 로그인 실패
 * PINE_ERP_SR_000-03: 로그아웃
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, logResult } from '../utils/common.js';

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '30s', target: 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    // SR_000-02가 의도적으로 401을 반환하므로 http_req_failed 임계값 제거
    // http_req_failed: ['rate<0.01'],
  },
};

export default function () {

  // ── PINE_ERP_SR_000-01: 로그인 성공 ──────────────────────
  group('PINE_ERP_SR_000-01: 로그인 성공', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ empId: '2025020101', password: 'pine1234!@#$' }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    const passed = check(res, {
      '상태코드 200': (r) => r.status === 200,
      '응답에 empId 포함': (r) => {
        try { return JSON.parse(r.body).empId !== undefined; }
        catch { return false; }
      },
      '로그인 후 홈으로 이동 가능': (r) => r.status === 200,
    });

    logResult('SR-000-01', passed, res.status, '로그인 성공');
    sleep(1);
  });

  // ── PINE_ERP_SR_000-02: 로그인 실패 ──────────────────────
  group('PINE_ERP_SR_000-02: 로그인 실패 (잘못된 비밀번호)', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ empId: 'test001', password: 'wrongpassword' }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    const passed = check(res, {
      '로그인 실패 시 401 반환': (r) => r.status === 401,
      '에러 메시지 포함': (r) => {
        try { return JSON.parse(r.body).error !== undefined; }
        catch { return false; }
      },
    });

    logResult('SR-000-02', passed, res.status, '로그인 실패 처리');
    sleep(1);
  });

  // ── PINE_ERP_SR_000-03: 로그아웃 ─────────────────────────
  group('PINE_ERP_SR_000-03: 로그아웃', () => {
    // 먼저 로그인 (rememberMe:true 여야 K6에서 JSESSIONID 쿠키를 읽을 수 있음)
    // Spring AuthController는 rememberMe=true 일 때만 Set-Cookie 헤더에 JSESSIONID를 명시적으로 추가함
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ empId: '2025020101', password: 'pine1234!@#$', rememberMe: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    const cookies = loginRes.cookies['JSESSIONID'];
    if (!cookies || cookies.length === 0) {
      logResult('SR-000-03', false, loginRes.status, '로그인 실패 - 로그아웃 테스트 불가');
      return;
    }
    const sessionId = cookies[0].value;

    // 로그아웃
    const logoutRes = http.post(
      `${BASE_URL}/api/auth/logout`,
      null,
      { cookies: { JSESSIONID: sessionId } }
    );

    // 로그아웃 후 인증 필요 API 접근 시 401
    const checkRes = http.get(
      `${BASE_URL}/api/auth/me`,
      { cookies: { JSESSIONID: sessionId } }
    );

    const passed = check(logoutRes, { '로그아웃 200': (r) => r.status === 200 }) &&
                   check(checkRes,  { '로그아웃 후 세션 무효 (401)': (r) => r.status === 401 });

    logResult('SR-000-03', passed, logoutRes.status, '로그아웃');
    sleep(1);
  });
}
