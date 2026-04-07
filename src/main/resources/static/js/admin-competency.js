// 역량관리 (관리자/담당자 공용) 페이지 JavaScript

document.addEventListener('DOMContentLoaded', function () {
    // ─── 공통 검색 유틸 (초성 검색 + 하이라이트) ─────────────
    const searchUtils = new SearchUtils();

    // ─── DOM 요소 ─────────────────────────────────────────────
    const searchInput = document.getElementById('searchInput');
    const departmentFilter = document.getElementById('departmentFilter');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const tableBody = document.getElementById('competencyTableBody');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const noData = document.getElementById('noData');

    // 통계 카드
    const totalEmployeesEl = document.getElementById('totalEmployees');
    const totalSchoolsEl = document.getElementById('totalSchools');
    const totalCertificatesEl = document.getElementById('totalCertificates');
    const totalCareersEl = document.getElementById('totalCareers');
    const totalTrainingsEl = document.getElementById('totalTrainings');

    // 상세 모달
    const detailModal = document.getElementById('detailModal');
    const closeDetailModal = document.getElementById('closeDetailModal');
    const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');

    // 관리자 전용 요소 (null-safe)
    const openRoleMgmtBtn = document.getElementById('openRoleMgmtBtn');
    const openBulkTrainingBtn = document.getElementById('openBulkTrainingBtn');
    const roleMgmtModal = document.getElementById('roleMgmtModal');
    const bulkTrainingModal = document.getElementById('bulkTrainingModal');

    // ─── 전역 상태 ─────────────────────────────────────────────
    let allEmployees = [];
    let filteredEmployees = [];
    let currentSortField = 'empId';
    let currentSortOrder = 'asc';

    // ─── 초기화 ─────────────────────────────────────────────
    init();

    function init() {
        loadOverview();
        attachEventListeners();
    }

    function attachEventListeners() {
        searchInput.addEventListener('input', filterAndRender);
        departmentFilter.addEventListener('change', filterAndRender);
        exportExcelBtn.addEventListener('click', exportToExcel);

        // 정렬
        document.querySelectorAll('.competency-table th.sortable').forEach(header => {
            header.addEventListener('click', function () {
                handleSort(this.getAttribute('data-sort'));
            });
        });

        // 상세 모달 닫기
        closeDetailModal.addEventListener('click', () => closeModal(detailModal));
        closeDetailModalBtn.addEventListener('click', () => closeModal(detailModal));
        detailModal.addEventListener('click', e => {
            if (e.target === detailModal) closeModal(detailModal);
        });

        // 관리자 전용 버튼 (null-safe)
        if (openRoleMgmtBtn) {
            openRoleMgmtBtn.addEventListener('click', openRoleMgmtModal);
            document.getElementById('closeRoleMgmtModal').addEventListener('click', () => closeModal(roleMgmtModal));
            document.getElementById('closeRoleMgmtModalBtn').addEventListener('click', () => closeModal(roleMgmtModal));
            document.getElementById('roleMgmtSearchInput').addEventListener('input', renderRoleMgmtTable);
            roleMgmtModal.addEventListener('click', e => {
                if (e.target === roleMgmtModal) closeModal(roleMgmtModal);
            });
        }

        if (openBulkTrainingBtn) {
            openBulkTrainingBtn.addEventListener('click', openBulkTrainingModal);
            document.getElementById('closeBulkTrainingModal').addEventListener('click', () => closeModal(bulkTrainingModal));
            document.getElementById('cancelBulkTrainingBtn').addEventListener('click', () => closeModal(bulkTrainingModal));
            document.getElementById('submitBulkTrainingBtn').addEventListener('click', submitBulkTraining);
            document.getElementById('bulkSearchInput').addEventListener('input', renderBulkEmployeeList);
            document.getElementById('bulkDeptFilter').addEventListener('change', renderBulkEmployeeList);
            document.getElementById('bulkSelectAllCheckbox').addEventListener('change', toggleBulkSelectAll);
            bulkTrainingModal.addEventListener('click', e => {
                if (e.target === bulkTrainingModal) closeModal(bulkTrainingModal);
            });
        }
    }

    // ─── 데이터 로드 ─────────────────────────────────────────
    async function loadOverview() {
        showLoading(true);
        try {
            const res = await fetch('/api/competency/overview');
            if (!res.ok) throw new Error('목록 조회 실패');
            allEmployees = await res.json();
            populateDepartmentFilter();
            filterAndRender();
            updateStats();
        } catch (err) {
            console.error(err);
            Swal.fire({ icon: 'error', title: '오류', text: '역량 목록을 불러올 수 없습니다.' });
        } finally {
            showLoading(false);
        }
    }

    function populateDepartmentFilter() {
        const depts = [...new Set(allEmployees.map(e => e.empDeptName).filter(Boolean))];
        depts.sort();
        departmentFilter.innerHTML = '<option value="">전체 부서</option>' +
            depts.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    function updateStats() {
        totalEmployeesEl.textContent = allEmployees.length + '명';
        totalSchoolsEl.textContent = allEmployees.reduce((s, e) => s + (e.schoolCount || 0), 0) + '건';
        totalCertificatesEl.textContent = allEmployees.reduce((s, e) => s + (e.certificateCount || 0), 0) + '건';
        totalCareersEl.textContent = allEmployees.reduce((s, e) => s + (e.careerCount || 0), 0) + '건';
        totalTrainingsEl.textContent = allEmployees.reduce((s, e) => s + (e.trainingCount || 0), 0) + '건';
    }

    // ─── 필터 & 정렬 ─────────────────────────────────────────
    function filterAndRender() {
        const keyword = searchInput.value.trim();
        const dept = departmentFilter.value;

        filteredEmployees = allEmployees.filter(e => {
            const matchKeyword = !keyword ||
                searchUtils.matchesSearch(e.empName || '', keyword) ||
                searchUtils.matchesSearch(e.empId || '', keyword);
            const matchDept = !dept || e.empDeptName === dept;
            return matchKeyword && matchDept;
        });

        sortFilteredEmployees();
        renderTable();
    }

    function handleSort(field) {
        if (currentSortField === field) {
            currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortField = field;
            currentSortOrder = 'asc';
        }
        sortFilteredEmployees();
        renderTable();
    }

    function sortFilteredEmployees() {
        if (!currentSortField) return;
        filteredEmployees.sort((a, b) => {
            const va = a[currentSortField];
            const vb = b[currentSortField];
            if (va == null && vb == null) return 0;
            if (va == null) return 1;
            if (vb == null) return -1;
            let cmp;
            if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
            else cmp = String(va).localeCompare(String(vb), 'ko');
            return currentSortOrder === 'asc' ? cmp : -cmp;
        });
    }

    // ─── 테이블 렌더 ─────────────────────────────────────────
    function renderTable() {
        if (filteredEmployees.length === 0) {
            tableBody.innerHTML = '';
            noData.style.display = 'block';
            return;
        }
        noData.style.display = 'none';

        const keyword = searchInput.value.trim();
        tableBody.innerHTML = filteredEmployees.map((emp, idx) => `
            <tr data-user-idx="${emp.userIdx}">
                <td>${idx + 1}</td>
                <td>${searchUtils.highlightText(emp.empId || '', keyword)}</td>
                <td>${searchUtils.highlightText(emp.empName || '', keyword)}</td>
                <td>${escapeHtml(emp.empDeptName || '-')}</td>
                <td>${escapeHtml(emp.empPositionName || '-')}</td>
                <td>${renderRoleBadge(emp.userRoleCode)}</td>
                <td class="count-cell">${emp.schoolCount || 0}</td>
                <td class="count-cell">${emp.certificateCount || 0}</td>
                <td class="count-cell">${emp.careerCount || 0}</td>
                <td class="count-cell">${emp.trainingCount || 0}</td>
                <td><button class="btn-detail" data-user-idx="${emp.userIdx}"><i class="fas fa-search"></i></button></td>
            </tr>
        `).join('');

        tableBody.querySelectorAll('.btn-detail').forEach(btn => {
            btn.addEventListener('click', function () {
                openDetailModal(Number(this.getAttribute('data-user-idx')));
            });
        });
    }

    function renderRoleBadge(roleCode) {
        const labels = {
            'C1101': { name: '개발자', cls: 'role-dev' },
            'C1102': { name: '관리자', cls: 'role-admin' },
            'C1103': { name: '열람자', cls: 'role-viewer' },
            'C1104': { name: '일반',   cls: 'role-user' }
        };
        const info = labels[roleCode] || { name: '-', cls: '' };
        return `<span class="role-badge ${info.cls}">${info.name}</span>`;
    }

    // ─── 상세 모달 ─────────────────────────────────────────
    async function openDetailModal(userIdx) {
        const emp = allEmployees.find(e => e.userIdx === userIdx);
        if (!emp) return;

        document.getElementById('detailEmpId').textContent = emp.empId || '-';
        document.getElementById('detailEmpName').textContent = emp.empName || '-';
        document.getElementById('detailEmpDept').textContent = emp.empDeptName || '-';
        document.getElementById('detailEmpPosition').textContent = emp.empPositionName || '-';
        document.getElementById('schoolCountBadge').textContent = emp.schoolCount || 0;
        document.getElementById('certificateCountBadge').textContent = emp.certificateCount || 0;
        document.getElementById('careerCountBadge').textContent = emp.careerCount || 0;
        document.getElementById('trainingCountBadge').textContent = emp.trainingCount || 0;

        // 역량 4종 병렬 조회
        try {
            const [schools, certs, careers, trainings] = await Promise.all([
                fetchJson(`/api/competency/schools?userIdx=${userIdx}`),
                fetchJson(`/api/competency/certificates?userIdx=${userIdx}`),
                fetchJson(`/api/competency/careers?userIdx=${userIdx}`),
                fetchJson(`/api/competency/trainings?userIdx=${userIdx}`)
            ]);
            renderSchoolList(schools);
            renderCertificateList(certs);
            renderCareerList(careers);
            renderTrainingList(trainings);
        } catch (err) {
            console.error(err);
            Swal.fire({ icon: 'error', title: '오류', text: '역량 상세 정보를 불러올 수 없습니다.' });
            return;
        }

        openModal(detailModal);
    }

    function renderSchoolList(items) {
        const list = document.getElementById('detailSchoolList');
        if (!items || items.length === 0) {
            list.innerHTML = '<div class="empty-row">등록된 학력이 없습니다.</div>';
            return;
        }
        const degreeLabel = {
            HIGH_SCHOOL: '고졸', ASSOCIATE: '전문학사',
            BACHELOR: '학사', MASTER: '석사', DOCTOR: '박사'
        };
        list.innerHTML = items.map(s => `
            <div class="detail-item">
                <div class="detail-item-main">
                    <strong>${escapeHtml(s.schoolName)}</strong>
                    ${s.majorName ? ` · ${escapeHtml(s.majorName)}` : ''}
                    <span class="chip">${degreeLabel[s.degreeType] || s.degreeType || '-'}</span>
                </div>
                <div class="detail-item-sub">
                    졸업: ${formatDate(s.graduationDate)}
                    ${s.notes ? ` · ${escapeHtml(s.notes)}` : ''}
                </div>
            </div>
        `).join('');
    }

    function renderCertificateList(items) {
        const list = document.getElementById('detailCertificateList');
        if (!items || items.length === 0) {
            list.innerHTML = '<div class="empty-row">등록된 자격증이 없습니다.</div>';
            return;
        }
        list.innerHTML = items.map(c => `
            <div class="detail-item">
                <div class="detail-item-main">
                    <strong>${escapeHtml(c.certificateName)}</strong>
                    · ${escapeHtml(c.issuingOrgName)}
                    ${c.isExpired ? '<span class="chip chip-danger">만료</span>' : ''}
                </div>
                <div class="detail-item-sub">
                    취득: ${formatDate(c.issuedDate)}
                    ${c.notes ? ` · ${escapeHtml(c.notes)}` : ''}
                </div>
            </div>
        `).join('');
    }

    function renderCareerList(items) {
        const list = document.getElementById('detailCareerList');
        if (!items || items.length === 0) {
            list.innerHTML = '<div class="empty-row">등록된 경력이 없습니다.</div>';
            return;
        }
        list.innerHTML = items.map(c => `
            <div class="detail-item">
                <div class="detail-item-main">
                    <strong>${escapeHtml(c.careerCategory)}</strong>
                    ${c.isIndustryExperience ? '<span class="chip chip-primary">업계경력</span>' : ''}
                    ${c.isNow ? '<span class="chip chip-success">재직중</span>' : ''}
                </div>
                <div class="detail-item-sub">
                    ${formatDate(c.careerStartDate)} ~ ${c.isNow ? '현재' : formatDate(c.careerEndDate)}
                    · ${c.careerPeriodYears || 0}년 ${c.careerPeriodMonths || 0}개월
                </div>
                ${c.careerSummary ? `<div class="detail-item-desc">${escapeHtml(c.careerSummary)}</div>` : ''}
                ${c.notes ? `<div class="detail-item-desc">비고: ${escapeHtml(c.notes)}</div>` : ''}
            </div>
        `).join('');
    }

    function renderTrainingList(items) {
        const list = document.getElementById('detailTrainingList');
        if (!items || items.length === 0) {
            list.innerHTML = '<div class="empty-row">등록된 교육이 없습니다.</div>';
            return;
        }
        list.innerHTML = items.map(t => `
            <div class="detail-item">
                <div class="detail-item-main">
                    <strong>${escapeHtml(t.trainingName)}</strong>
                    · ${escapeHtml(t.trainingOrgName)}
                </div>
                <div class="detail-item-sub">
                    이수: ${formatDate(t.completionDate)}
                    ${t.notes ? ` · ${escapeHtml(t.notes)}` : ''}
                </div>
            </div>
        `).join('');
    }

    // ─── 엑셀 다운로드 ─────────────────────────────────────
    async function exportToExcel() {
        if (allEmployees.length === 0) {
            Swal.fire({ icon: 'warning', title: '데이터 없음', text: '내보낼 데이터가 없습니다.' });
            return;
        }

        Swal.fire({
            title: '엑셀 생성 중...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const res = await fetch('/api/competency/export-data');
            if (!res.ok) throw new Error('export 데이터 조회 실패');
            const data = await res.json();

            // 사용자 idx → 이름/사번 매핑 (각 시트에서 반복 사용)
            const userMap = new Map();
            data.users.forEach(u => userMap.set(u.userIdx, { empId: u.empId, empName: u.empName }));

            const lookupEmpId = idx => (userMap.get(idx) || {}).empId || '';
            const lookupEmpName = idx => (userMap.get(idx) || {}).empName || '';

            const wb = XLSX.utils.book_new();

            const degreeLabel = {
                HIGH_SCHOOL: '고졸', ASSOCIATE: '전문학사',
                BACHELOR: '학사', MASTER: '석사', DOCTOR: '박사'
            };

            // ─── 사람별로 역량 4종 그룹핑 ───
            const groupByUser = (list) => {
                const map = new Map();
                list.forEach(item => {
                    if (!map.has(item.userIdx)) map.set(item.userIdx, []);
                    map.get(item.userIdx).push(item);
                });
                return map;
            };
            const schoolsByUser = groupByUser(data.schools);
            const certsByUser = groupByUser(data.certificates);
            const careersByUser = groupByUser(data.careers);
            const trainingsByUser = groupByUser(data.trainings);

            // ─── 역량 항목 포맷팅 함수 ───
            const formatSchool = s => {
                const degree = degreeLabel[s.degreeType] || s.degreeType || '';
                const major = s.majorName ? ` ${s.majorName}` : '';
                const date = s.graduationDate ? ` (${s.graduationDate} 졸업)` : '';
                const note = s.notes ? ` ※ ${s.notes}` : '';
                return `· ${s.schoolName}${major} ${degree}${date}${note}`.trim();
            };
            const formatCert = c => {
                const exp = c.isExpired ? ' [만료]' : '';
                const date = c.issuedDate ? ` (${c.issuedDate})` : '';
                const note = c.notes ? ` ※ ${c.notes}` : '';
                return `· ${c.certificateName} / ${c.issuingOrgName}${date}${exp}${note}`;
            };
            const formatCareer = c => {
                const start = c.careerStartDate || '';
                const end = c.isNow ? '현재' : (c.careerEndDate || '');
                const period = `${c.careerPeriodYears || 0}년 ${c.careerPeriodMonths || 0}개월`;
                const tag = c.isIndustryExperience ? ' [업계경력]' : '';
                const lines = [`· ${c.careerCategory}${tag}`];
                lines.push(`  ${start} ~ ${end} (${period})`);
                if (c.careerSummary) lines.push(`  요약: ${c.careerSummary}`);
                if (c.notes) lines.push(`  ※ ${c.notes}`);
                return lines.join('\n');
            };
            const formatTraining = t => {
                const date = t.completionDate ? ` (${t.completionDate})` : '';
                const note = t.notes ? ` ※ ${t.notes}` : '';
                return `· ${t.trainingName} / ${t.trainingOrgName}${date}${note}`;
            };

            // ─── Sheet 1: 직원별 종합 (모든 상세 내역) ───
            const detailHeaders = ['번호', '사번', '이름', '부서', '직급', '권한', '학력', '자격증', '업계경력', '교육이수'];
            const detailRows = [detailHeaders].concat(
                data.users.map((u, i) => {
                    const schoolText = (schoolsByUser.get(u.userIdx) || []).map(formatSchool).join('\n') || '-';
                    const certText = (certsByUser.get(u.userIdx) || []).map(formatCert).join('\n') || '-';
                    const careerText = (careersByUser.get(u.userIdx) || []).map(formatCareer).join('\n\n') || '-';
                    const trainingText = (trainingsByUser.get(u.userIdx) || []).map(formatTraining).join('\n') || '-';
                    return [
                        i + 1,
                        u.empId || '',
                        u.empName || '',
                        u.empDeptName || '',
                        u.empPositionName || '',
                        roleCodeToName(u.userRoleCode),
                        schoolText,
                        certText,
                        careerText,
                        trainingText
                    ];
                })
            );
            const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
            wsDetail['!cols'] = [
                { wch: 6 },  // 번호
                { wch: 12 }, // 사번
                { wch: 10 }, // 이름
                { wch: 16 }, // 부서
                { wch: 12 }, // 직급
                { wch: 12 }, // 권한
                { wch: 50 }, // 학력
                { wch: 55 }, // 자격증
                { wch: 60 }, // 업계경력
                { wch: 50 }  // 교육이수
            ];

            // 셀에 줄바꿈 표시를 위해 wrap text + vertical top + 행 높이 자동 계산
            const detailRange = XLSX.utils.decode_range(wsDetail['!ref']);
            wsDetail['!rows'] = [];
            for (let r = detailRange.s.r; r <= detailRange.e.r; r++) {
                let maxLines = 1;
                for (let c = detailRange.s.c; c <= detailRange.e.c; c++) {
                    const cellRef = XLSX.utils.encode_cell({ r, c });
                    const cell = wsDetail[cellRef];
                    if (cell) {
                        cell.s = cell.s || {};
                        cell.s.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
                        if (typeof cell.v === 'string') {
                            const lines = cell.v.split('\n').length;
                            if (lines > maxLines) maxLines = lines;
                        }
                    }
                }
                // 행 높이: 데이터 행은 라인 수에 비례, 헤더 행은 기본
                wsDetail['!rows'][r] = { hpt: r === 0 ? 22 : Math.max(20, maxLines * 16) };
            }

            XLSX.utils.book_append_sheet(wb, wsDetail, '직원별 종합');

            // Sheet 2: 학력
            const schoolRows = [['사번', '이름', '학교명', '전공', '학위', '졸업일', '비고']].concat(
                data.schools.map(s => [
                    lookupEmpId(s.userIdx),
                    lookupEmpName(s.userIdx),
                    s.schoolName || '',
                    s.majorName || '',
                    degreeLabel[s.degreeType] || s.degreeType || '',
                    s.graduationDate || '',
                    s.notes || ''
                ])
            );
            const wsSchool = XLSX.utils.aoa_to_sheet(schoolRows);
            wsSchool['!cols'] = [
                { wch: 10 }, { wch: 10 }, { wch: 22 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 30 }
            ];
            XLSX.utils.book_append_sheet(wb, wsSchool, '학력');

            // Sheet 3: 자격증
            const certRows = [['사번', '이름', '자격증명', '발급기관', '취득일', '만료여부', '비고']].concat(
                data.certificates.map(c => [
                    lookupEmpId(c.userIdx),
                    lookupEmpName(c.userIdx),
                    c.certificateName || '',
                    c.issuingOrgName || '',
                    c.issuedDate || '',
                    c.isExpired ? '만료' : '유효',
                    c.notes || ''
                ])
            );
            const wsCert = XLSX.utils.aoa_to_sheet(certRows);
            wsCert['!cols'] = [
                { wch: 10 }, { wch: 10 }, { wch: 24 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 30 }
            ];
            XLSX.utils.book_append_sheet(wb, wsCert, '자격증');

            // Sheet 4: 업계경력
            const careerRows = [['사번', '이름', '경력분야', '업계경력', '시작일', '종료일', '재직중', '기간(년)', '기간(월)', '경력요약', '비고']].concat(
                data.careers.map(c => [
                    lookupEmpId(c.userIdx),
                    lookupEmpName(c.userIdx),
                    c.careerCategory || '',
                    c.isIndustryExperience ? 'Y' : 'N',
                    c.careerStartDate || '',
                    c.isNow ? '' : (c.careerEndDate || ''),
                    c.isNow ? 'Y' : 'N',
                    c.careerPeriodYears || 0,
                    c.careerPeriodMonths || 0,
                    c.careerSummary || '',
                    c.notes || ''
                ])
            );
            const wsCareer = XLSX.utils.aoa_to_sheet(careerRows);
            wsCareer['!cols'] = [
                { wch: 10 }, { wch: 10 }, { wch: 28 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
                { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 30 }, { wch: 30 }
            ];
            XLSX.utils.book_append_sheet(wb, wsCareer, '업계경력');

            // Sheet 5: 교육이수
            const trainingRows = [['사번', '이름', '교육명', '교육기관', '이수일', '비고']].concat(
                data.trainings.map(t => [
                    lookupEmpId(t.userIdx),
                    lookupEmpName(t.userIdx),
                    t.trainingName || '',
                    t.trainingOrgName || '',
                    t.completionDate || '',
                    t.notes || ''
                ])
            );
            const wsTraining = XLSX.utils.aoa_to_sheet(trainingRows);
            wsTraining['!cols'] = [
                { wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 30 }
            ];
            XLSX.utils.book_append_sheet(wb, wsTraining, '교육이수');

            // 파일명: {YYYYMMDD}_역량관리_전체.xlsx
            const today = new Date();
            const prefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
            XLSX.writeFile(wb, `${prefix}_역량관리_전체.xlsx`);

            Swal.close();
        } catch (err) {
            console.error(err);
            Swal.fire({ icon: 'error', title: '다운로드 실패', text: err.message });
        }
    }

    function roleCodeToName(code) {
        return { 'C1101': '개발자', 'C1102': '관리자', 'C1103': '역량 열람자', 'C1104': '일반 사용자' }[code] || '';
    }

    // ─── 역량 열람 권한 관리 모달 ─────────────────────────
    function openRoleMgmtModal() {
        renderRoleMgmtTable();
        openModal(roleMgmtModal);
    }

    function renderRoleMgmtTable() {
        const keyword = (document.getElementById('roleMgmtSearchInput').value || '').trim();
        const tbody = document.getElementById('roleMgmtTableBody');

        const filtered = allEmployees.filter(e => {
            if (!keyword) return true;
            return searchUtils.matchesSearch(e.empName || '', keyword) ||
                   searchUtils.matchesSearch(e.empId || '', keyword);
        });

        // 직급순 정렬: empPosition 코드 오름차순(C0201=대표이사가 가장 위), 동순위는 이름순
        filtered.sort((a, b) => {
            const pa = a.empPosition || 'ZZZZZ';
            const pb = b.empPosition || 'ZZZZZ';
            const cmp = pa.localeCompare(pb);
            if (cmp !== 0) return cmp;
            return (a.empName || '').localeCompare(b.empName || '', 'ko');
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-row">직원이 없습니다.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(e => {
            const isLocked = e.userRoleCode === 'C1101' || e.userRoleCode === 'C1102';
            const isViewer = e.userRoleCode === 'C1103';
            return `
                <tr>
                    <td>${searchUtils.highlightText(e.empId || '', keyword)}</td>
                    <td>${searchUtils.highlightText(e.empName || '', keyword)}</td>
                    <td>${escapeHtml(e.empDeptName || '-')}</td>
                    <td>${escapeHtml(e.empPositionName || '-')}</td>
                    <td>${renderRoleBadge(e.userRoleCode)}</td>
                    <td>
                        ${isLocked
                            ? '<i class="fas fa-lock lock-icon" data-tip="관리자/개발자는 변경 불가"></i>'
                            : `<label class="toggle-switch"><input type="checkbox" data-user-idx="${e.userIdx}" ${isViewer ? 'checked' : ''}><span class="slider"></span></label>`}
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('input[type="checkbox"][data-user-idx]').forEach(cb => {
            cb.addEventListener('change', handleViewerRoleToggle);
        });
    }

    async function handleViewerRoleToggle(e) {
        const checkbox = e.target;
        const userIdx = Number(checkbox.getAttribute('data-user-idx'));
        const grant = checkbox.checked;
        const url = `/api/competency/viewer-role/${userIdx}`;
        const method = grant ? 'POST' : 'DELETE';

        try {
            const res = await fetch(url, { method });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            // 로컬 상태 갱신
            const emp = allEmployees.find(u => u.userIdx === userIdx);
            if (emp) emp.userRoleCode = grant ? 'C1103' : 'C1104';

            Swal.fire({
                icon: 'success',
                title: grant ? '권한 부여 완료' : '권한 해제 완료',
                timer: 1500,
                showConfirmButton: false
            });

            // 메인 테이블도 갱신
            filterAndRender();
            // 모달 테이블도 재렌더
            renderRoleMgmtTable();
        } catch (err) {
            console.error(err);
            checkbox.checked = !grant; // 원복
            Swal.fire({ icon: 'error', title: '실패', text: err.message });
        }
    }

    // ─── 법정교육 일괄 등록 모달 ─────────────────────────
    let bulkSelectedUserIdxSet = new Set();

    function openBulkTrainingModal() {
        // 폼 초기화
        document.getElementById('bulkTrainingName').value = '';
        document.getElementById('bulkTrainingOrgName').value = '';
        document.getElementById('bulkCompletionDate').value = '';
        document.getElementById('bulkNotes').value = '';
        document.getElementById('bulkSearchInput').value = '';
        document.getElementById('bulkSelectAllCheckbox').checked = false;
        bulkSelectedUserIdxSet = new Set();

        // 부서 필터 채우기
        const deptFilter = document.getElementById('bulkDeptFilter');
        const depts = [...new Set(allEmployees.map(e => e.empDeptName).filter(Boolean))].sort();
        deptFilter.innerHTML = '<option value="">전체 부서</option>' +
            depts.map(d => `<option value="${d}">${d}</option>`).join('');
        deptFilter.value = '';

        document.getElementById('bulkTotalCount').textContent = allEmployees.length;
        renderBulkEmployeeList();
        openModal(bulkTrainingModal);
    }

    function getBulkFilteredEmployees() {
        const keyword = (document.getElementById('bulkSearchInput').value || '').trim();
        const dept = document.getElementById('bulkDeptFilter').value;
        return allEmployees.filter(e => {
            const matchKeyword = !keyword ||
                searchUtils.matchesSearch(e.empName || '', keyword) ||
                searchUtils.matchesSearch(e.empId || '', keyword);
            const matchDept = !dept || e.empDeptName === dept;
            return matchKeyword && matchDept;
        });
    }

    function renderBulkEmployeeList() {
        const list = document.getElementById('bulkEmployeeList');
        const filtered = getBulkFilteredEmployees();

        if (filtered.length === 0) {
            list.innerHTML = '<div class="empty-row">조건에 맞는 직원이 없습니다.</div>';
            updateBulkSelectedCount();
            return;
        }

        const keyword = (document.getElementById('bulkSearchInput').value || '').trim();
        list.innerHTML = filtered.map(e => {
            const checked = bulkSelectedUserIdxSet.has(e.userIdx) ? 'checked' : '';
            return `
                <label class="bulk-employee-row">
                    <input type="checkbox" value="${e.userIdx}" ${checked}>
                    <span class="bulk-row-info">
                        <span class="bulk-emp-id">${searchUtils.highlightText(e.empId || '', keyword)}</span>
                        <span class="bulk-emp-name">${searchUtils.highlightText(e.empName || '', keyword)}</span>
                        <span class="bulk-emp-dept">${escapeHtml(e.empDeptName || '-')}</span>
                        <span class="bulk-emp-pos">${escapeHtml(e.empPositionName || '-')}</span>
                    </span>
                </label>
            `;
        }).join('');

        list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', function () {
                const idx = Number(this.value);
                if (this.checked) bulkSelectedUserIdxSet.add(idx);
                else bulkSelectedUserIdxSet.delete(idx);
                updateBulkSelectedCount();
            });
        });

        updateBulkSelectedCount();
    }

    function toggleBulkSelectAll(e) {
        const checked = e.target.checked;
        const filtered = getBulkFilteredEmployees();
        filtered.forEach(emp => {
            if (checked) bulkSelectedUserIdxSet.add(emp.userIdx);
            else bulkSelectedUserIdxSet.delete(emp.userIdx);
        });
        renderBulkEmployeeList();
    }

    function updateBulkSelectedCount() {
        document.getElementById('bulkSelectedCount').textContent = bulkSelectedUserIdxSet.size;
    }

    async function submitBulkTraining() {
        const trainingName = document.getElementById('bulkTrainingName').value.trim();
        const trainingOrgName = document.getElementById('bulkTrainingOrgName').value.trim();
        const completionDate = document.getElementById('bulkCompletionDate').value;
        const notes = document.getElementById('bulkNotes').value.trim();

        if (!trainingName) {
            Swal.fire({ icon: 'warning', title: '입력 오류', text: '교육명을 입력하세요.' });
            return;
        }
        if (!trainingOrgName) {
            Swal.fire({ icon: 'warning', title: '입력 오류', text: '교육기관을 입력하세요.' });
            return;
        }
        if (!completionDate) {
            Swal.fire({ icon: 'warning', title: '입력 오류', text: '이수일을 선택하세요.' });
            return;
        }
        if (bulkSelectedUserIdxSet.size === 0) {
            Swal.fire({ icon: 'warning', title: '입력 오류', text: '대상 직원을 1명 이상 선택하세요.' });
            return;
        }

        const confirm = await Swal.fire({
            icon: 'question',
            title: '일괄 등록 확인',
            text: `${bulkSelectedUserIdxSet.size}명의 직원에게 '${trainingName}' 교육을 일괄 등록합니다. 진행할까요?`,
            showCancelButton: true,
            confirmButtonText: '진행',
            cancelButtonText: '취소'
        });
        if (!confirm.isConfirmed) return;

        try {
            const res = await fetch('/api/competency/trainings/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trainingName,
                    trainingOrgName,
                    completionDate,
                    notes: notes || null,
                    targetUserIdxList: Array.from(bulkSelectedUserIdxSet)
                })
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            const result = await res.json();

            let html = `
                <p>성공: <strong>${result.successCount}</strong>명</p>
                <p>실패: <strong>${result.failedCount}</strong>명</p>
            `;
            if (result.failedCount > 0) {
                html += '<ul class="bulk-failed-list" style="text-align:left;margin-top:10px;max-height:200px;overflow:auto;">';
                result.failedUsers.forEach(f => {
                    html += `<li>${escapeHtml(f.empName)}: ${escapeHtml(f.reason)}</li>`;
                });
                html += '</ul>';
            }

            await Swal.fire({
                icon: result.failedCount === 0 ? 'success' : 'warning',
                title: '일괄 등록 완료',
                html
            });

            closeModal(bulkTrainingModal);
            loadOverview(); // 목록 갱신
        } catch (err) {
            console.error(err);
            Swal.fire({ icon: 'error', title: '실패', text: err.message });
        }
    }

    // ─── 공통 헬퍼 ─────────────────────────────────────────
    function openModal(modal) {
        if (modal) modal.classList.add('active');
    }

    function closeModal(modal) {
        if (modal) modal.classList.remove('active');
    }

    function showLoading(show) {
        loadingSpinner.style.display = show ? 'block' : 'none';
    }

    function formatDate(date) {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return String(date);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async function fetchJson(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }
});
