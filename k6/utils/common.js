// ============================================================
// 공통 유틸리티 - 모든 시나리오에서 공유
// ============================================================

export const BASE_URL = 'http://localhost:8080';

// 로그인하고 세션 쿠키를 반환
export function login(http, check, credentials) {
  const creds = credentials || { empId: '2025020101', password: 'pine1234!@#$' };

  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify(creds),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, {
    '로그인 성공 (200)': (r) => r.status === 200,
  });

  // 세션 쿠키 추출
  const cookies = res.cookies['JSESSIONID'];
  if (!cookies || cookies.length === 0) return null;
  return cookies[0].value;
}

// 로그인하고 { sessionId, userIdx } 반환 (creatorIdx 등이 필요한 시나리오용)
export function loginFull(http, check, credentials) {
  const creds = credentials || { empId: '2025020101', password: 'pine1234!@#$' };

  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify(creds),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, { '로그인 성공 (200)': (r) => r.status === 200 });

  const cookies = res.cookies['JSESSIONID'];
  if (!cookies || cookies.length === 0) return null;

  let userIdx = null;
  try { userIdx = JSON.parse(res.body).idx; } catch {}

  return { sessionId: cookies[0].value, userIdx };
}

// 인증 헤더 (쿠키 포함)
export function authHeaders(sessionId) {
  return {
    headers: { 'Content-Type': 'application/json' },
    cookies: { JSESSIONID: sessionId },
  };
}

// 공통 응답 검증
export function checkOk(check, res, label) {
  return check(res, {
    [`${label} - 상태코드 200`]: (r) => r.status === 200,
    [`${label} - 응답시간 < 1000ms`]: (r) => r.timings.duration < 1000,
  });
}

// 시나리오 결과 로그 출력
// passed: check() 반환값(boolean), status: HTTP 상태코드, detail: 추가 메시지(선택)
export function logResult(scenarioId, passed, status, detail) {
  const icon = passed ? '✓ PASS' : '✗ FAIL';
  const msg = detail ? ` | ${detail}` : '';
  console.log(`[${scenarioId}] ${icon} (HTTP ${status})${msg}`);
}
