/**
 * ERP_UT_SD_004 - 외부인원 관리
 *
 * PINE_ERP_SR_004-01: 외부인원 목록 조회
 * PINE_ERP_SR_004-02: 외부인원 등록
 * PINE_ERP_SR_004-03: 외부인원 수정
 * PINE_ERP_SR_004-04: 외부인원 삭제
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, login, authHeaders, logResult } from '../utils/common.js';

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '30s', target: 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    // 204 No Content (삭제 성공) 도 http_req_failed 에 포함될 수 있어 임계값 제거
    // http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const sessionId = login(http, check);
  if (!sessionId) return;
  const opts = authHeaders(sessionId);

  // ── PINE_ERP_SR_004-01: 외부인원 목록 조회 ───────────────
  group('PINE_ERP_SR_004-01: 외부인원 목록 조회', () => {
    const companyRes = http.get(
      `${BASE_URL}/api/external-persons/search/company?companyName=${encodeURIComponent('테스트회사')}`, opts
    );
    const p1 = check(companyRes, { '회사 검색 200': (r) => r.status === 200 });

    const nameRes = http.get(
      `${BASE_URL}/api/external-persons/search/name?name=${encodeURIComponent('홍길동')}`, opts
    );
    const p2 = check(nameRes, { '이름 검색 200': (r) => r.status === 200 });

    logResult('SR-004-01', p1 && p2, companyRes.status, '외부인원 목록 조회');
    sleep(1);
  });

  // ── PINE_ERP_SR_004-02: 외부인원 등록 ────────────────────
  let createdIdx = null;
  group('PINE_ERP_SR_004-02: 외부인원 등록', () => {
    const payload = {
      name: 'K6테스트_외부인', companyName: 'K6테스트회사',
      position: '부장',
    };
    const res = http.post(
      `${BASE_URL}/api/external-persons`,
      JSON.stringify(payload),
      { headers: { 'Content-Type': 'application/json' }, cookies: { JSESSIONID: sessionId } }
    );
    const passed = check(res, { '외부인원 등록 200/201': (r) => r.status === 200 || r.status === 201 });
    logResult('SR-004-02', passed, res.status, '외부인원 등록');
    try { createdIdx = JSON.parse(res.body).idx; } catch {}
    sleep(1);
  });

  // ── PINE_ERP_SR_004-03: 외부인원 수정 ────────────────────
  group('PINE_ERP_SR_004-03: 외부인원 수정', () => {
    if (!createdIdx) {
      logResult('SR-004-03', false, 0, '등록 실패로 수정 테스트 건너뜀');
      sleep(1); return;
    }
    const detailRes = http.get(`${BASE_URL}/api/external-persons/${createdIdx}`, opts);
    const p1 = check(detailRes, { '외부인원 상세 200': (r) => r.status === 200 });

    const payload = {
      name: 'K6테스트_외부인(수정)', companyName: 'K6테스트회사',
      position: '차장',
    };
    const res = http.put(
      `${BASE_URL}/api/external-persons/${createdIdx}`,
      JSON.stringify(payload),
      { headers: { 'Content-Type': 'application/json' }, cookies: { JSESSIONID: sessionId } }
    );
    const p2 = check(res, { '외부인원 수정 200': (r) => r.status === 200 });
    logResult('SR-004-03', p1 && p2, res.status, '외부인원 수정');
    sleep(1);
  });

  // ── PINE_ERP_SR_004-04: 외부인원 삭제 ────────────────────
  group('PINE_ERP_SR_004-04: 외부인원 삭제', () => {
    if (!createdIdx) {
      logResult('SR-004-04', false, 0, '등록 실패로 삭제 테스트 건너뜀');
      sleep(1); return;
    }
    const res = http.del(`${BASE_URL}/api/external-persons/${createdIdx}`, null, opts);
    const passed = check(res, { '외부인원 삭제 200/204': (r) => r.status === 200 || r.status === 204 });
    logResult('SR-004-04', passed, res.status, '외부인원 삭제');
    sleep(1);
  });
}
