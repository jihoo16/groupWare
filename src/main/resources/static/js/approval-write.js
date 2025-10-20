// 문서 작성 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    let selectedApprovers = [];
    let selectedFiles = [];
    let selectedEmployee = null;

    // DOM 요소
    const templateItems = document.querySelectorAll('.template-item');
    const documentForm = document.getElementById('documentForm');
    const addApproverBtn = document.getElementById('addApproverBtn');
    const approverChips = document.getElementById('approverChips');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const approverModal = document.getElementById('approverModal');
    const employeeList = document.getElementById('employeeList');
    const approverSearch = document.getElementById('approverSearch');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const submitBtn = document.getElementById('submitBtn');

    // 샘플 직원 데이터
    const employees = [
        { id: 1, name: '김철수', position: '전무', dept: '경영지원본부' },
        { id: 2, name: '박영희', position: '부장', dept: '경영지원본부 인사팀' },
        { id: 3, name: '이민수', position: '부장', dept: '경영지원본부 총무팀' },
        { id: 4, name: '장현우', position: '상무', dept: '개발본부' },
        { id: 5, name: '임지훈', position: '부장', dept: '개발본부 Frontend팀' },
        { id: 6, name: '한소희', position: '부장', dept: '개발본부 Backend팀' },
        { id: 7, name: '권민재', position: '상무', dept: '영업본부' },
        { id: 8, name: '유재석', position: '부장', dept: '영업본부 영업1팀' }
    ];

    // 문서 템플릿
    const templates = {
        'vacation': {
            title: '휴가 신청서',
            html: `
                <h2 class="doc-title">휴 가 신 청 서</h2>
                <table class="form-table">
                    <tr>
                        <th>신청자</th>
                        <td><input type="text" value="홍길동" readonly></td>
                        <th>부서</th>
                        <td><input type="text" value="개발팀" readonly></td>
                    </tr>
                    <tr>
                        <th>직급</th>
                        <td><input type="text" value="대리" readonly></td>
                        <th>신청일</th>
                        <td><input type="date" value="${new Date().toISOString().split('T')[0]}"></td>
                    </tr>
                    <tr>
                        <th>휴가 종류</th>
                        <td>
                            <select>
                                <option>연차</option>
                                <option>반차(오전)</option>
                                <option>반차(오후)</option>
                                <option>병가</option>
                                <option>경조사</option>
                            </select>
                        </td>
                        <th>기간</th>
                        <td><input type="text" placeholder="예: 1일"></td>
                    </tr>
                    <tr>
                        <th>시작일</th>
                        <td><input type="date"></td>
                        <th>종료일</th>
                        <td><input type="date"></td>
                    </tr>
                    <tr>
                        <th>사유</th>
                        <td colspan="3"><textarea placeholder="휴가 사유를 입력하세요"></textarea></td>
                    </tr>
                    <tr>
                        <th>비상연락처</th>
                        <td colspan="3"><input type="tel" placeholder="휴가 중 연락 가능한 전화번호"></td>
                    </tr>
                </table>
            `
        },
        'expense': {
            title: '지출 결의서',
            html: `
                <h2 class="doc-title">지 출 결 의 서</h2>
                <table class="form-table">
                    <tr>
                        <th>기안자</th>
                        <td><input type="text" value="홍길동" readonly></td>
                        <th>부서</th>
                        <td><input type="text" value="개발팀" readonly></td>
                    </tr>
                    <tr>
                        <th>신청일</th>
                        <td><input type="date" value="${new Date().toISOString().split('T')[0]}"></td>
                        <th>사용일</th>
                        <td><input type="date"></td>
                    </tr>
                    <tr>
                        <th>지출 항목</th>
                        <td colspan="3"><input type="text" placeholder="예: 사무용품 구매"></td>
                    </tr>
                    <tr>
                        <th>금액</th>
                        <td><input type="number" placeholder="금액 입력"></td>
                        <th>지급 방법</th>
                        <td>
                            <select>
                                <option>법인카드</option>
                                <option>개인 카드</option>
                                <option>현금</option>
                                <option>계좌이체</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th>사용 내역</th>
                        <td colspan="3"><textarea placeholder="상세 사용 내역을 입력하세요"></textarea></td>
                    </tr>
                    <tr>
                        <th>비고</th>
                        <td colspan="3"><textarea placeholder="추가 사항이 있으면 입력하세요"></textarea></td>
                    </tr>
                </table>
            `
        },
        'purchase': {
            title: '구매 요청서',
            html: `
                <h2 class="doc-title">구 매 요 청 서</h2>
                <table class="form-table">
                    <tr>
                        <th>요청자</th>
                        <td><input type="text" value="홍길동" readonly></td>
                        <th>부서</th>
                        <td><input type="text" value="개발팀" readonly></td>
                    </tr>
                    <tr>
                        <th>요청일</th>
                        <td><input type="date" value="${new Date().toISOString().split('T')[0]}"></td>
                        <th>필요일</th>
                        <td><input type="date"></td>
                    </tr>
                    <tr>
                        <th>구매 물품</th>
                        <td colspan="3"><input type="text" placeholder="물품명을 입력하세요"></td>
                    </tr>
                    <tr>
                        <th>수량</th>
                        <td><input type="number" placeholder="수량"></td>
                        <th>단가</th>
                        <td><input type="number" placeholder="단가"></td>
                    </tr>
                    <tr>
                        <th>총 금액</th>
                        <td colspan="3"><input type="number" placeholder="총 구매 금액"></td>
                    </tr>
                    <tr>
                        <th>구매 사유</th>
                        <td colspan="3"><textarea placeholder="구매가 필요한 사유를 입력하세요"></textarea></td>
                    </tr>
                    <tr>
                        <th>비고</th>
                        <td colspan="3"><textarea placeholder="선호 브랜드, 모델 등 추가 요청사항"></textarea></td>
                    </tr>
                </table>
            `
        },
        'weekly-report': {
            title: '주간 업무 보고',
            html: `
                <h2 class="doc-title">주 간 업 무 보 고</h2>
                <table class="form-table">
                    <tr>
                        <th>보고자</th>
                        <td><input type="text" value="홍길동" readonly></td>
                        <th>부서</th>
                        <td><input type="text" value="개발팀" readonly></td>
                    </tr>
                    <tr>
                        <th>보고 기간</th>
                        <td colspan="3"><input type="text" placeholder="예: 2025.01.13 ~ 2025.01.17"></td>
                    </tr>
                    <tr>
                        <th>금주 주요 업무</th>
                        <td colspan="3"><textarea placeholder="이번 주 수행한 주요 업무를 입력하세요" rows="5"></textarea></td>
                    </tr>
                    <tr>
                        <th>주요 성과</th>
                        <td colspan="3"><textarea placeholder="달성한 성과 및 결과물" rows="4"></textarea></td>
                    </tr>
                    <tr>
                        <th>주요 이슈</th>
                        <td colspan="3"><textarea placeholder="발생한 문제 및 이슈사항" rows="4"></textarea></td>
                    </tr>
                    <tr>
                        <th>차주 계획</th>
                        <td colspan="3"><textarea placeholder="다음 주 진행 예정 업무" rows="5"></textarea></td>
                    </tr>
                </table>
            `
        },
        'monthly-report': {
            title: '월간 업무 보고',
            html: `
                <h2 class="doc-title">월 간 업 무 보 고</h2>
                <table class="form-table">
                    <tr>
                        <th>보고자</th>
                        <td><input type="text" value="홍길동" readonly></td>
                        <th>부서</th>
                        <td><input type="text" value="개발팀" readonly></td>
                    </tr>
                    <tr>
                        <th>보고 월</th>
                        <td colspan="3"><input type="month" value="${new Date().toISOString().slice(0,7)}"></td>
                    </tr>
                    <tr>
                        <th>월간 주요 업무</th>
                        <td colspan="3"><textarea placeholder="이번 달 수행한 주요 업무" rows="6"></textarea></td>
                    </tr>
                    <tr>
                        <th>목표 대비 실적</th>
                        <td colspan="3"><textarea placeholder="설정한 목표와 달성 실적 비교" rows="5"></textarea></td>
                    </tr>
                    <tr>
                        <th>개선사항</th>
                        <td colspan="3"><textarea placeholder="개선이 필요한 사항" rows="4"></textarea></td>
                    </tr>
                    <tr>
                        <th>차월 계획</th>
                        <td colspan="3"><textarea placeholder="다음 달 주요 계획" rows="5"></textarea></td>
                    </tr>
                </table>
            `
        },
        'meeting': {
            title: '회의록',
            html: `
                <h2 class="doc-title">회 의 록</h2>
                <table class="form-table">
                    <tr>
                        <th>회의명</th>
                        <td colspan="3"><input type="text" placeholder="회의 제목"></td>
                    </tr>
                    <tr>
                        <th>작성자</th>
                        <td><input type="text" value="홍길동" readonly></td>
                        <th>일시</th>
                        <td><input type="datetime-local"></td>
                    </tr>
                    <tr>
                        <th>장소</th>
                        <td><input type="text" placeholder="회의 장소"></td>
                        <th>참석자</th>
                        <td><input type="text" placeholder="참석자 명단"></td>
                    </tr>
                    <tr>
                        <th>회의 목적</th>
                        <td colspan="3"><textarea placeholder="회의 목적 및 배경" rows="3"></textarea></td>
                    </tr>
                    <tr>
                        <th>회의 내용</th>
                        <td colspan="3"><textarea placeholder="논의된 주요 내용" rows="8"></textarea></td>
                    </tr>
                    <tr>
                        <th>결정 사항</th>
                        <td colspan="3"><textarea placeholder="회의를 통해 결정된 사항" rows="5"></textarea></td>
                    </tr>
                    <tr>
                        <th>Action Items</th>
                        <td colspan="3"><textarea placeholder="후속 조치 및 담당자" rows="4"></textarea></td>
                    </tr>
                </table>
            `
        },
        'business-trip': {
            title: '출장 신청서',
            html: `
                <h2 class="doc-title">출 장 신 청 서</h2>
                <table class="form-table">
                    <tr>
                        <th>신청자</th>
                        <td><input type="text" value="홍길동" readonly></td>
                        <th>부서</th>
                        <td><input type="text" value="개발팀" readonly></td>
                    </tr>
                    <tr>
                        <th>출장 유형</th>
                        <td>
                            <select>
                                <option>국내 출장</option>
                                <option>해외 출장</option>
                            </select>
                        </td>
                        <th>동반 인원</th>
                        <td><input type="number" value="1"></td>
                    </tr>
                    <tr>
                        <th>출장지</th>
                        <td colspan="3"><input type="text" placeholder="출장 목적지"></td>
                    </tr>
                    <tr>
                        <th>출장 기간</th>
                        <td><input type="date" placeholder="시작일"></td>
                        <th>~</th>
                        <td><input type="date" placeholder="종료일"></td>
                    </tr>
                    <tr>
                        <th>출장 목적</th>
                        <td colspan="3"><textarea placeholder="출장 목적 및 업무 내용" rows="4"></textarea></td>
                    </tr>
                    <tr>
                        <th>예상 경비</th>
                        <td colspan="3"><input type="number" placeholder="예상 출장 경비 (원)"></td>
                    </tr>
                    <tr>
                        <th>비고</th>
                        <td colspan="3"><textarea placeholder="추가 사항" rows="3"></textarea></td>
                    </tr>
                </table>
            `
        },
        'general': {
            title: '일반 기안서',
            html: `
                <h2 class="doc-title">기 안 서</h2>
                <table class="form-table">
                    <tr>
                        <th>기안자</th>
                        <td><input type="text" value="홍길동" readonly></td>
                        <th>부서</th>
                        <td><input type="text" value="개발팀" readonly></td>
                    </tr>
                    <tr>
                        <th>기안일</th>
                        <td colspan="3"><input type="date" value="${new Date().toISOString().split('T')[0]}"></td>
                    </tr>
                    <tr>
                        <th>제목</th>
                        <td colspan="3"><input type="text" placeholder="기안 제목"></td>
                    </tr>
                    <tr>
                        <th>기안 내용</th>
                        <td colspan="3"><textarea placeholder="기안 내용을 상세히 작성하세요" rows="15"></textarea></td>
                    </tr>
                    <tr>
                        <th>기대 효과</th>
                        <td colspan="3"><textarea placeholder="기안을 통해 기대되는 효과" rows="4"></textarea></td>
                    </tr>
                </table>
            `
        },
        'receipt': {
            title: '영수증 처리',
            html: `
                <div style="background: #f8f9fa; border: 2px solid #e8e8e8; border-radius: 10px; padding: 20px; margin-bottom: 30px;">
                    <div style="margin-bottom: 15px;">
                        <h4 style="font-size: 16px; font-weight: 700; color: #333; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-edit" style="color: #667eea;"></i> 공통 정보 입력
                        </h4>
                    </div>
                    <table class="form-table" style="background: white;">
                        <tr>
                            <th style="width: 150px;">과제명</th>
                            <td colspan="3"><input type="text" id="common_project" placeholder="과제명을 입력하세요"></td>
                        </tr>
                        <tr>
                            <th>작성자</th>
                            <td><input type="text" id="common_author" value="홍길동" readonly></td>
                            <th>회의 일자</th>
                            <td><input type="date" id="common_date"></td>
                        </tr>
                        <tr>
                            <th>시작 시간</th>
                            <td><input type="time" id="common_start_time"></td>
                            <th>종료 시간</th>
                            <td><input type="time" id="common_end_time"></td>
                        </tr>
                        <tr>
                            <th>장소</th>
                            <td colspan="3"><input type="text" id="common_location" placeholder="회의 장소를 입력하세요"></td>
                        </tr>
                        <tr>
                            <th>사용 금액</th>
                            <td colspan="3">
                                <input type="number" id="common_amount" placeholder="사용 금액을 입력하세요 (원)" style="width: 300px; padding: 5px;">
                                <small style="color: #666; margin-left: 10px;">* 1인당 30,000원 기준으로 참석자가 자동 계산됩니다</small>
                            </td>
                        </tr>
                        <tr>
                            <th>참석자</th>
                            <td colspan="3">
                                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 5px; margin-bottom: 10px;">
                                    <button type="button" id="addAttendeeBtn" style="width: 30px; height: 30px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 18px; padding: 0;">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                    <button type="button" id="removeAttendeeBtn" style="width: 30px; height: 30px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 18px; padding: 0;">
                                        <i class="fas fa-minus"></i>
                                    </button>
                                </div>
                                <div id="attendeeList"></div>
                            </td>
                        </tr>
                    </table>
                </div>

                <div style="background: white; border: 2px solid #e0e0e0; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
                    <h2 class="doc-title">회 의 품 의 서</h2>
                    <div style="text-align: left; margin-bottom: 20px; font-size: 14px;">
                        작성일 : <span id="proposal_date"></span>
                    </div>
                    <table class="form-table">
                    <tr>
                        <th colspan="3">과제명</th>
                        <td colspan="9"><input type="text" class="auto-project" placeholder="과제명을 입력하세요" readonly style="background: #f9f9f9;"></td>
                    </tr>
                    <tr>
                        <th colspan="3">참석인원</th>
                        <th colspan="1">장소</th>
                        <th colspan="1">회의 일시</th>
                        <th colspan="1">회의 목적</th>
                    </tr>
                    <tr>
                        <th>내외구분</th>
                        <th>소속</th>
                        <th>성명</th>
                        <td class="auto-location-cell" colspan="1" rowspan="1" style="vertical-align: top;"><input type="text" class="auto-location" placeholder="회의 장소" readonly style="background: #f9f9f9;"></td>
                        <td class="auto-datetime-cell" colspan="1" rowspan="1" style="vertical-align: top;"><input type="text" class="auto-datetime" placeholder="예: 2025.01.20. 14:00~18:00" readonly style="background: #f9f9f9;"></td>
                        <td class="meeting-purpose-cell" colspan="1" rowspan="1" style="vertical-align: top;"><textarea placeholder="회의 목적" rows="3"></textarea></td>
                    </tr>
                    <tbody id="proposal_attendees">
                    </tbody>
                    <tr>
                        <th colspan="9" style="background: #f0f0f0; padding: 15px;">소요 경비 내역 (원)</th>
                    </tr>
                    <tr>
                        <th>일시</th>
                        <th>회의비</th>
                        <th>교통비</th>
                        <th>식비</th>
                        <th>기타(일비)</th>
                        <th colspan="2">계</th>
                    </tr>
                    <tr>
                        <td><input type="date"></td>
                        <td><input type="number" placeholder="0"></td>
                        <td><input type="number" placeholder="0"></td>
                        <td><input type="number" placeholder="0"></td>
                        <td><input type="number" placeholder="0"></td>
                        <td colspan="2"><input type="number" placeholder="0" readonly style="background: #f9f9f9;"></td>
                    </tr>
                    <tr>
                        <td><input type="date"></td>
                        <td><input type="number" placeholder="0"></td>
                        <td><input type="number" placeholder="0"></td>
                        <td><input type="number" placeholder="0"></td>
                        <td><input type="number" placeholder="0"></td>
                        <td colspan="2"><input type="number" placeholder="0" readonly style="background: #f9f9f9;"></td>
                    </tr>
                    <tr>
                        <td><input type="date"></td>
                        <td><input type="number" placeholder="0"></td>
                        <td><input type="number" placeholder="0"></td>
                        <td><input type="number" placeholder="0"></td>
                        <td><input type="number" placeholder="0"></td>
                        <td colspan="2"><input type="number" placeholder="0" readonly style="background: #f9f9f9;"></td>
                    </tr>
                    <tr>
                        <th>합계</th>
                        <td colspan="4"><input type="number" placeholder="0" readonly style="background: #f9f9f9;"></td>
                        <td colspan="2"></td>
                    </tr>
                    <tr>
                        <th>특기사항</th>
                        <td colspan="6"><textarea placeholder="특기사항을 입력하세요" rows="2"></textarea></td>
                    </tr>
                    <tr>
                        <th>결제</th>
                        <td colspan="6">
                            <select style="width: 200px;">
                                <option>카드로 결제</option>
                                <option>현금으로 결제</option>
                                <option>계좌이체</option>
                                <option>법인카드</option>
                            </select>
                        </td>
                    </tr>
                </table>
                </div>

                <div style="background: white; border: 2px solid #e0e0e0; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
                    <h2 class="doc-title">회 의 록</h2>
                    <table class="form-table">
                    <tr>
                        <th>세부 업무명</th>
                        <td colspan="2"><input type="text" class="auto-project" placeholder="세부 업무명" readonly style="background: #f9f9f9;"></td>
                        <th>작성자</th>
                        <td><input type="text" class="auto-author" value="홍길동" readonly style="background: #f9f9f9;"></td>
                    </tr>
                    <tr>
                        <th>일시</th>
                        <td colspan="2"><input type="text" class="auto-datetime" placeholder="예: 2025.01.20. 14:00~18:00" readonly style="background: #f9f9f9;"></td>
                        <th>장소</th>
                        <td><input type="text" class="auto-location" placeholder="회의 장소" readonly style="background: #f9f9f9;"></td>
                    </tr>
                    <tr>
                        <th rowspan="2">참석자</th>
                        <th colspan="4">참여 기관</th>
                    </tr>
                    <tr>
                        <td colspan="4"><textarea placeholder="참여 기관 및 참석자를 입력하세요 (예: 홍길동(회사명), 김철수(회사명))" rows="3"></textarea></td>
                    </tr>
                    <tr>
                        <th colspan="5" style="background: #f0f0f0; padding: 15px;">내용</th>
                    </tr>
                    <tr>
                        <td colspan="5"><textarea placeholder="회의 주제 및 주요 내용을 입력하세요" rows="10" style="text-align: left; vertical-align: top;"></textarea></td>
                    </tr>
                    <tr>
                        <th>비고</th>
                        <td colspan="4"><textarea placeholder="추가 사항" rows="3"></textarea></td>
                    </tr>
                </table>
                </div>

                <div style="background: white; border: 2px solid #e0e0e0; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
                    <h2 class="doc-title">참 석 자 명 단</h2>
                    <table class="form-table">
                    <tr>
                        <th>세부업무명</th>
                        <td colspan="2"><input type="text" class="auto-project" placeholder="세부 업무명" readonly style="background: #f9f9f9;"></td>
                        <th>작성자</th>
                        <td><input type="text" class="auto-author" value="홍길동" readonly style="background: #f9f9f9;"></td>
                    </tr>
                    <tr>
                        <th>일시</th>
                        <td colspan="2"><input type="text" class="auto-datetime" placeholder="예: 2025.01.20. 14:00~18:00" readonly style="background: #f9f9f9;"></td>
                        <th>장소</th>
                        <td><input type="text" class="auto-location" placeholder="회의 장소" readonly style="background: #f9f9f9;"></td>
                    </tr>
                </table>
                <table class="form-table" style="margin-top: 20px;">
                    <tr>
                        <th>성명</th>
                        <th>소속</th>
                        <th>서명</th>
                        <th>성명</th>
                        <th>소속</th>
                        <th>서명</th>
                    </tr>
                    <tr>
                        <td><input type="text"></td>
                        <td><input type="text"></td>
                        <td style="padding: 30px;"></td>
                        <td><input type="text"></td>
                        <td><input type="text"></td>
                        <td style="padding: 30px;"></td>
                    </tr>
                    <tr>
                        <td><input type="text"></td>
                        <td><input type="text"></td>
                        <td style="padding: 30px;"></td>
                        <td><input type="text"></td>
                        <td><input type="text"></td>
                        <td style="padding: 30px;"></td>
                    </tr>
                    <tr>
                        <td><input type="text"></td>
                        <td><input type="text"></td>
                        <td style="padding: 30px;"></td>
                        <td><input type="text"></td>
                        <td><input type="text"></td>
                        <td style="padding: 30px;"></td>
                    </tr>
                    <tr>
                        <td><input type="text"></td>
                        <td><input type="text"></td>
                        <td style="padding: 30px;"></td>
                        <td><input type="text"></td>
                        <td><input type="text"></td>
                        <td style="padding: 30px;"></td>
                    </tr>
                    <tr>
                        <td><input type="text"></td>
                        <td><input type="text"></td>
                        <td style="padding: 30px;"></td>
                        <td><input type="text"></td>
                        <td><input type="text"></td>
                        <td style="padding: 30px;"></td>
                    </tr>
                </table>
                </div>
            `
        }
    };

    // 템플릿 선택
    templateItems.forEach(item => {
        item.addEventListener('click', function() {
            templateItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            const template = this.getAttribute('data-template');
            loadTemplate(template);
        });
    });

    // 템플릿 로드
    function loadTemplate(templateKey) {
        const template = templates[templateKey];
        if (template) {
            documentForm.innerHTML = template.html;

            // 영수증 처리 템플릿인 경우 자동 채우기 이벤트 리스너 추가
            if (templateKey === 'receipt') {
                setupReceiptAutoFill();
            }
        }
    }

    // 영수증 처리 자동 채우기 기능
    function setupReceiptAutoFill() {
        const commonProject = document.getElementById('common_project');
        const commonDate = document.getElementById('common_date');
        const commonStartTime = document.getElementById('common_start_time');
        const commonEndTime = document.getElementById('common_end_time');
        const commonLocation = document.getElementById('common_location');
        const commonAmount = document.getElementById('common_amount');
        const addAttendeeBtn = document.getElementById('addAttendeeBtn');
        const removeAttendeeBtn = document.getElementById('removeAttendeeBtn');
        const attendeeList = document.getElementById('attendeeList');

        let attendees = [];

        // 참석자 목록 업데이트 함수
        function updateAttendeeList() {
            attendeeList.innerHTML = '';
            attendees.forEach((attendee, index) => {
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;';
                row.innerHTML = `
                    <input type="checkbox" data-index="${index}" class="attendee-checkbox" style="width: 18px; height: 18px; cursor: pointer;">
                    <select data-index="${index}" class="attendee-type" style="padding: 5px; width: 80px;">
                        <option value="내부" ${attendee.type === '내부' ? 'selected' : ''}>내부</option>
                        <option value="외부" ${attendee.type === '외부' ? 'selected' : ''}>외부</option>
                    </select>
                    <input type="text" data-index="${index}" class="attendee-dept" placeholder="소속" value="${attendee.dept || ''}" style="flex: 2; padding: 5px;">
                    <input type="text" data-index="${index}" class="attendee-name" placeholder="성명" value="${attendee.name || ''}" style="flex: 1; padding: 5px;">
                `;
                attendeeList.appendChild(row);
            });

            // 이벤트 리스너 추가
            document.querySelectorAll('.attendee-type, .attendee-dept, .attendee-name').forEach(el => {
                el.addEventListener('input', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    if (this.classList.contains('attendee-type')) {
                        attendees[index].type = this.value;
                    } else if (this.classList.contains('attendee-dept')) {
                        attendees[index].dept = this.value;
                    } else if (this.classList.contains('attendee-name')) {
                        attendees[index].name = this.value;
                    }
                    updateProposalAttendees();
                });
            });

            // 체크박스 change 이벤트도 추가
            document.querySelectorAll('.attendee-type').forEach(el => {
                el.addEventListener('change', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    attendees[index].type = this.value;
                    updateProposalAttendees();
                });
            });

            updateProposalAttendees();
        }

        // 회의 품의서 참석인원 업데이트
        function updateProposalAttendees() {
            const tbody = document.getElementById('proposal_attendees');
            if (!tbody) return;

            // 기존 참석자 행들 제거
            while (tbody.rows.length > 0) {
                tbody.deleteRow(0);
            }

            // 새로운 참석자 행 추가
            attendees.forEach((attendee, index) => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>
                        <select>
                            <option ${attendee.type === '내부' ? 'selected' : ''}>내부</option>
                            <option ${attendee.type === '외부' ? 'selected' : ''}>외부</option>
                        </select>
                    </td>
                    <td><input type="text" value="${attendee.dept || ''}" readonly style="background: #f9f9f9;"></td>
                    <td><input type="text" value="${attendee.name || ''}" readonly style="background: #f9f9f9;"></td>
                `;
            });

            // rowspan 업데이트
            const totalRows = attendees.length;
            const locationCell = document.querySelector('.auto-location-cell');
            const datetimeCell = document.querySelector('.auto-datetime-cell');
            const purposeCell = document.querySelector('.meeting-purpose-cell');

            if (locationCell) locationCell.setAttribute('rowspan', totalRows);
            if (datetimeCell) datetimeCell.setAttribute('rowspan', totalRows);
            if (purposeCell) purposeCell.setAttribute('rowspan', totalRows);
        }

        // 참석자 추가 버튼
        if (addAttendeeBtn) {
            addAttendeeBtn.addEventListener('click', function() {
                attendees.push({ type: '내부', dept: '', name: '' });
                updateAttendeeList();
            });
        }

        // 참석자 제거 버튼 - 체크된 항목만 제거
        if (removeAttendeeBtn) {
            removeAttendeeBtn.addEventListener('click', function() {
                const checkboxes = document.querySelectorAll('.attendee-checkbox:checked');
                if (checkboxes.length === 0) {
                    alert('제거할 참석자를 선택해주세요.');
                    return;
                }

                // 체크된 인덱스를 역순으로 정렬하여 제거 (뒤에서부터 제거해야 인덱스 꼬임 방지)
                const indicesToRemove = Array.from(checkboxes)
                    .map(cb => parseInt(cb.getAttribute('data-index')))
                    .sort((a, b) => b - a);

                indicesToRemove.forEach(index => {
                    attendees.splice(index, 1);
                });

                updateAttendeeList();
            });
        }

        // 사용 금액 기반 자동 참석자 계산
        if (commonAmount) {
            commonAmount.addEventListener('input', function() {
                const amount = parseInt(this.value) || 0;

                if (amount > 0) {
                    // 1인당 30,000원 기준으로 인원 계산
                    const totalPeople = Math.ceil(amount / 30000);

                    // 외부 1명 + 내부 나머지
                    const externalCount = 1;
                    const internalCount = totalPeople - externalCount;

                    // 참석자 배열 초기화
                    attendees = [];

                    // 외부 1명 추가
                    attendees.push({ type: '외부', dept: '', name: '' });

                    // 내부 인원 추가
                    for (let i = 0; i < internalCount; i++) {
                        attendees.push({ type: '내부', dept: '', name: '' });
                    }

                    updateAttendeeList();
                }
            });
        }

        // 과제명 자동 채우기
        if (commonProject) {
            commonProject.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-project').forEach(field => {
                    field.value = value;
                });
            });
        }

        // 날짜/시간 자동 채우기
        function updateDateTime() {
            const dateValue = commonDate ? commonDate.value : '';
            const startTimeValue = commonStartTime ? commonStartTime.value : '';
            const endTimeValue = commonEndTime ? commonEndTime.value : '';

            if (dateValue) {
                // 날짜를 "YYYY.MM.DD." 형식으로 변환
                const [year, month, day] = dateValue.split('-');
                let formattedDate = `${year}.${month}.${day}.`;

                // 시작시간과 종료시간을 24시간 형태로 변환 (00:00~24:00)
                if (startTimeValue && endTimeValue) {
                    // 종료시간이 00:00이면 24:00으로 표시
                    const endTimeDisplay = endTimeValue === '00:00' ? '24:00' : endTimeValue;
                    formattedDate += ` ${startTimeValue}~${endTimeDisplay}`;
                } else if (startTimeValue) {
                    formattedDate += ` ${startTimeValue}`;
                }

                // 모든 일시 필드에 입력
                document.querySelectorAll('.auto-datetime').forEach(field => {
                    field.value = formattedDate;
                });

                // 회의 품의서 작성일 = 날짜 - 1일 (0000년 00월 00일 형식)
                const proposalDateElement = document.getElementById('proposal_date');
                if (proposalDateElement) {
                    const date = new Date(dateValue);
                    date.setDate(date.getDate() - 1);
                    const propYear = date.getFullYear();
                    const propMonth = String(date.getMonth() + 1).padStart(2, '0');
                    const propDay = String(date.getDate()).padStart(2, '0');
                    proposalDateElement.textContent = `${propYear}년 ${propMonth}월 ${propDay}일`;
                }
            }
        }

        if (commonDate) {
            commonDate.addEventListener('input', updateDateTime);
        }
        if (commonStartTime) {
            commonStartTime.addEventListener('input', updateDateTime);
        }
        if (commonEndTime) {
            commonEndTime.addEventListener('input', updateDateTime);
        }

        // 장소 자동 채우기
        if (commonLocation) {
            commonLocation.addEventListener('input', function() {
                const value = this.value;
                document.querySelectorAll('.auto-location').forEach(field => {
                    field.value = value;
                });
            });
        }

        // 초기화 - 빈 목록으로 시작 (금액 입력 시 자동 생성)
        updateAttendeeList();
    }

    // 결재자 추가 버튼
    addApproverBtn.addEventListener('click', function() {
        loadEmployeeList();
        approverModal.classList.add('show');
    });

    // 직원 목록 로드
    function loadEmployeeList() {
        employeeList.innerHTML = '';
        employees.forEach(emp => {
            const item = document.createElement('div');
            item.className = 'employee-item';
            item.innerHTML = `
                <i class="fas fa-user-circle"></i>
                <div class="employee-info">
                    <div class="employee-name">${emp.name}</div>
                    <div class="employee-detail">${emp.dept} ${emp.position}</div>
                </div>
            `;
            item.addEventListener('click', function() {
                document.querySelectorAll('.employee-item').forEach(i => i.classList.remove('selected'));
                this.classList.add('selected');
                selectedEmployee = emp;
            });
            employeeList.appendChild(item);
        });
    }

    // 직원 검색
    approverSearch.addEventListener('input', function() {
        const term = this.value.toLowerCase();
        document.querySelectorAll('.employee-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(term) ? '' : 'none';
        });
    });

    // 결재자 추가
    window.addApprover = function() {
        if (!selectedEmployee) {
            alert('결재자를 선택해주세요.');
            return;
        }

        if (selectedApprovers.find(a => a.id === selectedEmployee.id)) {
            alert('이미 추가된 결재자입니다.');
            return;
        }

        selectedApprovers.push(selectedEmployee);
        updateApproverChips();
        closeModal();
        selectedEmployee = null;
    };

    // 결재자 칩 업데이트
    function updateApproverChips() {
        if (selectedApprovers.length === 0) {
            approverChips.innerHTML = '<div class="empty-message">결재자를 추가해주세요</div>';
            return;
        }

        approverChips.innerHTML = '';
        selectedApprovers.forEach((approver, index) => {
            const chip = document.createElement('div');
            chip.className = 'approver-chip';
            chip.innerHTML = `
                <span class="order">${index + 1}</span>
                <span>${approver.name} ${approver.position}</span>
                <button class="btn-remove" onclick="removeApprover(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            approverChips.appendChild(chip);
        });
    }

    // 결재자 제거
    window.removeApprover = function(index) {
        selectedApprovers.splice(index, 1);
        updateApproverChips();
    };

    // 모달 닫기
    window.closeModal = function() {
        approverModal.classList.remove('show');
        approverSearch.value = '';
        loadEmployeeList();
    };

    // 파일 업로드
    fileInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (selectedFiles.length >= 5) {
                alert('최대 5개까지만 첨부 가능합니다.');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                alert('파일 크기는 10MB를 초과할 수 없습니다.');
                return;
            }
            selectedFiles.push(file);
        });
        updateFileList();
        fileInput.value = '';
    });

    // 드래그 앤 드롭
    fileUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = '#667eea';
        this.style.background = '#f5f7ff';
    });

    fileUploadArea.addEventListener('dragleave', function() {
        this.style.borderColor = '#ddd';
        this.style.background = 'white';
    });

    fileUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '#ddd';
        this.style.background = 'white';

        const files = Array.from(e.dataTransfer.files);
        files.forEach(file => {
            if (selectedFiles.length >= 5) {
                alert('최대 5개까지만 첨부 가능합니다.');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                alert('파일 크기는 10MB를 초과할 수 없습니다.');
                return;
            }
            selectedFiles.push(file);
        });
        updateFileList();
    });

    // 파일 목록 업데이트
    function updateFileList() {
        if (selectedFiles.length === 0) {
            fileList.innerHTML = '';
            return;
        }

        fileList.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';

            let icon = 'fa-file';
            if (file.name.match(/\.(jpg|jpeg|png|gif)$/i)) icon = 'fa-file-image';
            else if (file.name.match(/\.(pdf)$/i)) icon = 'fa-file-pdf';
            else if (file.name.match(/\.(doc|docx)$/i)) icon = 'fa-file-word';
            else if (file.name.match(/\.(xls|xlsx)$/i)) icon = 'fa-file-excel';

            item.innerHTML = `
                <i class="fas ${icon}"></i>
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <button class="btn-remove-file" onclick="removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(item);
        });
    }

    // 파일 제거
    window.removeFile = function(index) {
        selectedFiles.splice(index, 1);
        updateFileList();
    };

    // 임시저장
    saveDraftBtn.addEventListener('click', function() {
        alert('문서가 임시저장되었습니다.');
        // 실제로는 API 호출
    });

    // 제출
    submitBtn.addEventListener('click', function() {
        if (selectedApprovers.length === 0) {
            alert('결재자를 지정해주세요.');
            return;
        }

        if (confirm('결재를 요청하시겠습니까?')) {
            alert('결재 요청이 완료되었습니다.');
            // 실제로는 API 호출 후 목록으로 이동
            window.location.href = '/approval';
        }
    });

    // 초기 템플릿 로드
    loadTemplate('vacation');
});
