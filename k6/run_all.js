/**
 * ERP 전체 통합 부하 테스트
 * 모든 시나리오를 동시에 실행 (실제 사용자 혼합 패턴 시뮬레이션)
 *
 * 실행: k6 run k6/run_all.js
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, login, authHeaders, checkOk } from './utils/common.js';

export const options = {
  scenarios: {
    // 인증 (소량 - 로그인은 자주 발생하지 않음)
    auth: {
      executor: 'constant-vus',
      vus: 2,
      duration: '1m',
      exec: 'authScenario',
    },
    // 일정 조회 (중간 - 자주 조회)
    calendar: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      exec: 'calendarScenario',
    },
    // 문서 조회 (많음 - 가장 자주 사용)
    documents: {
      executor: 'constant-vus',
      vus: 8,
      duration: '1m',
      exec: 'documentScenario',
    },
    // 연차 조회 (중간)
    vacation: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      exec: 'vacationScenario',
    },
    // 조직도 조회 (소량 - 가끔 조회)
    organization: {
      executor: 'constant-vus',
      vus: 3,
      duration: '1m',
      exec: 'organizationScenario',
    },
    // 프로젝트 조회 (중간)
    project: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      exec: 'projectScenario',
    },
  },
  thresholds: {
    // 전체 기준: 95% 요청이 1.5초 이내
    http_req_duration: ['p(95)<1500'],
    // 실패율 1% 미만
    http_req_failed: ['rate<0.01'],
    // 인증 API는 더 엄격하게
    'http_req_duration{scenario:auth}': ['p(95)<500'],
  },
};

// ── 인증 시나리오 ─────────────────────────────────────────
export function authScenario() {
  group('인증', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ empId: 'test001', password: 'Test1234!' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    check(res, { '로그인 200': (r) => r.status === 200 });
    sleep(3);
  });
}

// ── 일정 조회 시나리오 ────────────────────────────────────
export function calendarScenario() {
  const sessionId = login(http, check);
  if (!sessionId) return;
  const opts = authHeaders(sessionId);

  group('일정 조회', () => {
    const res = http.get(`${BASE_URL}/api/calendar/events/creator/1`, opts);
    checkOk(check, res, '일정 목록');
    sleep(2);
  });
}

// ── 문서 조회 시나리오 ────────────────────────────────────
export function documentScenario() {
  const sessionId = login(http, check);
  if (!sessionId) return;
  const opts = authHeaders(sessionId);

  group('문서 목록 조회', () => {
    const allRes = http.get(`${BASE_URL}/api/approval/documents`, opts);
    checkOk(check, allRes, '전체 문서');

    const projRes = http.get(`${BASE_URL}/api/approval/documents/projects`, opts);
    checkOk(check, projRes, '프로젝트 문서');

    sleep(2);
  });
}

// ── 연차 조회 시나리오 ────────────────────────────────────
export function vacationScenario() {
  const sessionId = login(http, check);
  if (!sessionId) return;
  const opts = authHeaders(sessionId);

  group('연차 조회', () => {
    const res = http.get(`${BASE_URL}/api/vacation/user-info`, opts);
    checkOk(check, res, '연차 정보');

    const histRes = http.get(`${BASE_URL}/api/vacation/history`, opts);
    checkOk(check, histRes, '연차 이력');

    sleep(2);
  });
}

// ── 조직도 조회 시나리오 ──────────────────────────────────
export function organizationScenario() {
  const sessionId = login(http, check);
  if (!sessionId) return;
  const opts = authHeaders(sessionId);

  group('조직도 조회', () => {
    const res = http.get(`${BASE_URL}/api/organization/tree`, opts);
    checkOk(check, res, '조직도 트리');
    sleep(3);
  });
}

// ── 프로젝트 조회 시나리오 ────────────────────────────────
export function projectScenario() {
  const sessionId = login(http, check);
  if (!sessionId) return;
  const opts = authHeaders(sessionId);

  group('프로젝트 조회', () => {
    const res = http.get(`${BASE_URL}/api/projects`, opts);
    checkOk(check, res, '프로젝트 목록');
    sleep(2);
  });
}

// default export (단독 실행 시 사용)
export default function () {
  documentScenario();
}
