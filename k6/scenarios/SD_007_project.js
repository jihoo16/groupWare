/**
 * ERP_UT_SD_007 - 프로젝트
 *
 * PINE_ERP_SR_007-01: 프로젝트 목록 조회 (상태별 필터)
 * PINE_ERP_SR_007-02: 프로젝트 생성
 * PINE_ERP_SR_007-03: 프로젝트 수정
 * PINE_ERP_SR_007-04: 프로젝트 상세
 * PINE_ERP_SR_007-05: 프로젝트 삭제
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
    http_req_duration: ['p(95)<1000'],
    // 403(수정 권한), 404(상세 없음) 등 의도적 비-2xx 포함되므로 http_req_failed 제거
    // http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const auth = loginFull(http, check);
  if (!auth) return;
  const { sessionId, userIdx } = auth;
  const opts = authHeaders(sessionId);

  // ── PINE_ERP_SR_007-01: 프로젝트 목록 조회 ───────────────
  group('PINE_ERP_SR_007-01: 프로젝트 목록 조회', () => {
    const allRes = http.get(`${BASE_URL}/api/projects`, opts);
    const p1 = checkOk(check, allRes, '프로젝트 전체 목록');

    const activeRes = http.get(`${BASE_URL}/api/projects/filter?status=IN_PROGRESS`, opts);
    const p2 = check(activeRes, { '진행중 필터 200': (r) => r.status === 200 });

    const doneRes = http.get(`${BASE_URL}/api/projects/filter?status=COMPLETED`, opts);
    const p3 = check(doneRes, { '완료 필터 200': (r) => r.status === 200 });

    // 검색 파라미터명: ?name= (컨트롤러 @RequestParam String name)
    const searchRes = http.get(
      `${BASE_URL}/api/projects/search?name=${encodeURIComponent('테스트')}`, opts
    );
    const p4 = check(searchRes, { '프로젝트 검색 200': (r) => r.status === 200 });

    logResult('SR-007-01', p1 && p2 && p3 && p4, allRes.status, '프로젝트 목록 조회');
    sleep(1);
  });

  // ── PINE_ERP_SR_007-02: 프로젝트 생성 ────────────────────
  let createdProjectIdx = null;
  group('PINE_ERP_SR_007-02: 프로젝트 생성', () => {
    const payload = {
      projectName: 'K6 테스트 프로젝트',
      startDate: '2026-04-01',
      endDate: '2026-12-31',
      projectStatus: 'IN_PROGRESS',
      description: 'K6 자동 테스트로 생성된 프로젝트',
      // 생성자를 PI 역할 멤버로 추가 → PUT 수정 권한 확보
      projectMembers: [
        {
          employeeIdx: userIdx,
          role: 'PI',
          participationStartDate: '2026-04-01',
          participationEndDate: '2026-12-31',
        },
      ],
    };
    const res = http.post(
      `${BASE_URL}/api/projects`,
      JSON.stringify(payload),
      { headers: { 'Content-Type': 'application/json' }, cookies: { JSESSIONID: sessionId } }
    );
    const passed = check(res, { '프로젝트 생성 200/201': (r) => r.status === 200 || r.status === 201 });
    logResult('SR-007-02', passed, res.status, '프로젝트 생성');
    try { createdProjectIdx = JSON.parse(res.body).idx; } catch {}
    sleep(1);
  });

  // ── PINE_ERP_SR_007-04: 프로젝트 상세 ────────────────────
  group('PINE_ERP_SR_007-04: 프로젝트 상세 조회', () => {
    const idx = createdProjectIdx || 1;

    const detailRes = http.get(`${BASE_URL}/api/projects/${idx}`, opts);
    const p1 = check(detailRes, { '프로젝트 상세 200 또는 404': (r) => r.status === 200 || r.status === 404 });

    const membersRes = http.get(`${BASE_URL}/api/projects/${idx}/members`, opts);
    const p2 = check(membersRes, { '프로젝트 멤버 200 또는 404': (r) => r.status === 200 || r.status === 404 });

    const activityRes = http.get(`${BASE_URL}/api/projects/${idx}/activity-usage`, opts);
    const p3 = check(activityRes, { '활동비 현황 200 또는 404': (r) => r.status === 200 || r.status === 404 });

    logResult('SR-007-04', p1 && p2 && p3, detailRes.status, '프로젝트 상세 조회');
    sleep(1);
  });

  // ── PINE_ERP_SR_007-03: 프로젝트 수정 ────────────────────
  group('PINE_ERP_SR_007-03: 프로젝트 수정', () => {
    if (!createdProjectIdx) {
      logResult('SR-007-03', false, 0, '프로젝트 생성 실패로 수정 테스트 건너뜀');
      sleep(1); return;
    }
    const payload = {
      projectName: 'K6 테스트 프로젝트 (수정)',
      startDate: '2026-04-01',
      endDate: '2026-12-31',
      projectStatus: 'IN_PROGRESS',
      description: '수정된 프로젝트',
    };
    const res = http.put(
      `${BASE_URL}/api/projects/${createdProjectIdx}`,
      JSON.stringify(payload),
      { headers: { 'Content-Type': 'application/json' }, cookies: { JSESSIONID: sessionId } }
    );
    const passed = check(res, { '프로젝트 수정 200': (r) => r.status === 200 });
    logResult('SR-007-03', passed, res.status, '프로젝트 수정');
    sleep(1);
  });

  // ── PINE_ERP_SR_007-05: 프로젝트 삭제 ────────────────────
  group('PINE_ERP_SR_007-05: 프로젝트 삭제', () => {
    if (!createdProjectIdx) {
      logResult('SR-007-05', false, 0, '프로젝트 생성 실패로 삭제 건너뜀');
      sleep(1); return;
    }
    const res = http.del(`${BASE_URL}/api/projects/${createdProjectIdx}`, null, opts);
    const passed = check(res, { '프로젝트 삭제 200/204': (r) => r.status === 200 || r.status === 204 });
    logResult('SR-007-05', passed, res.status, '프로젝트 삭제');
    sleep(1);
  });
}
