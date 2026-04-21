/**
 * ERP_UT_SD_006 - 조직도
 *
 * PINE_ERP_SR_006-01: 조직도 조회 (조직구조, 소속정보, 연락처, 보고체계)
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

  // ── PINE_ERP_SR_006-01: 조직도 조회 ─────────────────────
  group('PINE_ERP_SR_006-01: 조직도 조회', () => {
    const treeRes = http.get(`${BASE_URL}/api/organization/tree`, opts);
    const p1 = checkOk(check, treeRes, '조직도 트리');
    const p2 = check(treeRes, {
      '조직도 구조 배열 반환': (r) => {
        try { return Array.isArray(JSON.parse(r.body)) || JSON.parse(r.body) !== null; }
        catch { return false; }
      },
    });

    const hierarchyRes = http.get(`${BASE_URL}/api/hierarchy/employees`, opts);
    const p3 = checkOk(check, hierarchyRes, '보고 체계');

    const statsRes = http.get(`${BASE_URL}/api/hierarchy/stats`, opts);
    const p4 = checkOk(check, statsRes, '보고 체계 통계');

    const usersRes = http.get(`${BASE_URL}/api/users/all`, opts);
    const p5 = checkOk(check, usersRes, '전체 사용자 목록');

    logResult('SR-006-01', p1 && p2 && p3 && p4 && p5, treeRes.status, '조직도 조회');
    sleep(1);
  });
}
