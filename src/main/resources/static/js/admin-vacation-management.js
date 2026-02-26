// 관리자 전체 연차관리 페이지 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소
    const searchInput = document.getElementById('searchInput');
    const departmentFilter = document.getElementById('departmentFilter');
    const sortFilter = document.getElementById('sortFilter');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const vacationTableBody = document.getElementById('vacationTableBody');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const noData = document.getElementById('noData');
    const detailModal = document.getElementById('detailModal');
    const closeDetailModal = document.getElementById('closeDetailModal');
    const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
    const yearTabsBar = document.getElementById('yearTabsBar');

    // 전역 변수
    let allEmployees = [];
    let filteredEmployees = [];
    let currentSortField = null;
    let currentSortOrder = 'asc';
    let currentYear = new Date().getFullYear();

    // 초기화
    init();

    function init() {
        renderYearTabs();
        loadVacationData();
        loadDepartmentFilter();
        attachEventListeners();
    }

    // ────────────────────────────────────────────────────────────
    // 연도 탭
    // ────────────────────────────────────────────────────────────
    function renderYearTabs() {
        const years = [currentYear];
        yearTabsBar.innerHTML = years.map(year => `
            <button class="year-tab${year === currentYear ? ' active' : ''}" data-year="${year}">
                ${year}년
            </button>
        `).join('');

        yearTabsBar.querySelectorAll('.year-tab').forEach(btn => {
            btn.addEventListener('click', function() {
                const selectedYear = parseInt(this.getAttribute('data-year'));
                if (selectedYear === currentYear) return;
                currentYear = selectedYear;
                yearTabsBar.querySelectorAll('.year-tab').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                loadVacationData();
            });
        });
    }

    // ────────────────────────────────────────────────────────────
    // 부서 목록 동적 로드
    // ────────────────────────────────────────────────────────────
    function loadDepartmentFilter() {
        fetch('/api/codes/departments?activeOnly=true')
            .then(res => res.json())
            .then(departments => {
                departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.codeName;
                    option.textContent = dept.codeName;
                    departmentFilter.appendChild(option);
                });
            })
            .catch(() => {});
    }

    // ────────────────────────────────────────────────────────────
    // 이벤트 리스너
    // ────────────────────────────────────────────────────────────
    function attachEventListeners() {
        searchInput.addEventListener('input', filterData);
        departmentFilter.addEventListener('change', filterData);
        sortFilter.addEventListener('change', filterData);

        exportExcelBtn.addEventListener('click', () => exportToExcel());

        closeDetailModal.addEventListener('click', closeModal);
        closeDetailModalBtn.addEventListener('click', closeModal);

        detailModal.addEventListener('click', function(e) {
            if (e.target === detailModal) closeModal();
        });

        document.querySelectorAll('.vacation-table th.sortable').forEach(header => {
            header.addEventListener('click', function() {
                handleSort(this.getAttribute('data-sort'));
            });
        });
    }

    // ────────────────────────────────────────────────────────────
    // 날짜 헬퍼
    // ────────────────────────────────────────────────────────────

    // YYYY.MM.DD 형식
    function formatDate(date) {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return String(date).replace(/-/g, '.');
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}.${m}.${day}`;
    }

    // YY.M.D 형식 (2자리 연도, zero-padding 없음) — 테이블 셀 표시용
    function formatShortDate(date) {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        const yy = String(d.getFullYear()).slice(2);
        return `${yy}.${d.getMonth() + 1}.${d.getDate()}`;
    }

    // ────────────────────────────────────────────────────────────
    // 근속가산 milestone 계산 (당해 연도 테이블용)
    // 당해 연도에 발생한 milestone: earned
    // 당해 연도 예정 milestone: upcoming
    // ────────────────────────────────────────────────────────────
    function computeSeniorityForYear(empJoinDate, year) {
        if (!empJoinDate) {
            return { earnedDate: null, earnedShort: null, upcomingDate: null, upcomingShort: null };
        }

        const joinDate  = new Date(empJoinDate);
        const yearStart = new Date(year, 0, 1);
        const today     = new Date();
        let totalCounted = 0;
        let earned = null, upcoming = null;

        for (let sy = 3; sy <= 21; sy += 2) {
            if (totalCounted >= 10) break;

            const mDate = new Date(joinDate);
            mDate.setFullYear(joinDate.getFullYear() + sy);

            if (mDate < yearStart) {
                // 과거 milestone — 카운트만 누적
                totalCounted++;
            } else if (mDate.getFullYear() === year) {
                // 당해 연도 milestone
                if (mDate <= today) earned   = mDate;
                else                upcoming = mDate;
                break; // 한 사람에 한 해 최대 1개 milestone
            } else {
                // 미래 연도 — 더 이상 currentYear 관련 없음
                break;
            }
        }

        return {
            earnedDate:    earned   ? formatDate(earned)      : null,
            earnedShort:   earned   ? formatShortDate(earned) : null,
            upcomingDate:  upcoming ? formatDate(upcoming)    : null,
            upcomingShort: upcoming ? formatShortDate(upcoming): null,
        };
    }

    // ────────────────────────────────────────────────────────────
    // 비례연차 예정 계산 (1주년 미도래 & 해당 연도에 도래하는 경우)
    // 백엔드와 동일 로직: (1주년일~12/31 일수 / 연도총일수) × 15, 반올림
    // ────────────────────────────────────────────────────────────
    function computeProportionalUpcoming(empJoinDate, year) {
        if (!empJoinDate) return null;

        const joinDate    = new Date(empJoinDate);
        const anniversary = new Date(joinDate);
        anniversary.setFullYear(joinDate.getFullYear() + 1);

        if (anniversary.getFullYear() !== year) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (anniversary <= today) return null; // 이미 도래함

        const yearEnd    = new Date(year, 11, 31);
        const msPerDay   = 24 * 60 * 60 * 1000;
        const remaining  = Math.round((yearEnd - anniversary) / msPerDay) + 1;
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        const daysInYear = isLeapYear ? 366 : 365;
        const days       = Math.round((remaining / daysInYear) * 15);

        return { date: anniversary, short: formatShortDate(anniversary), days };
    }

    // ────────────────────────────────────────────────────────────
    // 데이터 로드
    // ────────────────────────────────────────────────────────────
    async function loadVacationData() {
        showLoading();

        try {
            const response = await fetch(`/api/vacation/admin/all?year=${currentYear}`);
            if (!response.ok) throw new Error('데이터를 불러오는데 실패했습니다.');

            const data = await response.json();

            allEmployees = data.map((item) => {
                const ms     = computeSeniorityForYear(item.empJoinDate, currentYear);
                const propUp = computeProportionalUpcoming(item.empJoinDate, currentYear);

                return {
                    id: item.userIdx,
                    name: item.empName,
                    department: item.empDeptName || item.empDept || '-',
                    position: item.empPositionName || item.empPosition || '-',
                    positionCode: item.empPosition || '-',
                    preEmployment: item.preEmployment || false,

                    // 기존 alias 유지 (backwards compat)
                    totalLeave:     item.totalDays     || 0,
                    usedLeave:      item.usedDays      || 0,
                    remainingLeave: item.remainingDays || 0,
                    usageRate: item.totalDays > 0
                        ? Math.round((item.usedDays / item.totalDays) * 100) : 0,

                    // breakdown — DTO 필드명 = JS 프로퍼티명 = DB 컬럼명(snake) 대응
                    annualLeaveDays:    item.annualLeaveDays    || 0,
                    proportionalDays:   item.proportionalDays   || 0,
                    monthlyLeaveDays:   item.monthlyLeaveDays   || 0,
                    compensatoryDays:   item.compensatoryDays   || 0,
                    expiredMonthlyDays: item.expiredMonthlyDays || 0,

                    // 당해 연도 근속가산 (클라이언트 계산)
                    seniorityEarnedDate:    ms.earnedDate,    // ISO 정렬용
                    seniorityEarnedShort:   ms.earnedShort,   // "YY.M.D" 표시용
                    seniorityUpcomingDate:  ms.upcomingDate,  // ISO 정렬용
                    seniorityUpcomingShort: ms.upcomingShort, // "YY.M.D" 표시용

                    // 비례연차 예정 (1년 미만, 1주년 미도래)
                    proportionalUpcomingShort: propUp ? propUp.short : null,
                    proportionalUpcomingDays:  propUp ? propUp.days  : null,

                    // 입사일
                    empJoinDate: item.empJoinDate || null,
                    hireDate:    item.empJoinDate || '-',

                    leaveHistory: []
                };
            });

            filteredEmployees = [...allEmployees];
            hideLoading();
            renderTable();
            updateStatistics();
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            hideLoading();
            noData.style.display = 'block';
            Swal.fire({
                icon: 'error',
                title: '데이터 로드 실패',
                text: error.message || '데이터를 불러오는데 실패했습니다.'
            });
        }
    }

    // ────────────────────────────────────────────────────────────
    // 통계
    // ────────────────────────────────────────────────────────────
    function updateStatistics() {
        // 입사 전 직원은 통계에서 제외
        const activeEmployees = allEmployees.filter(e => !e.preEmployment);
        const n = activeEmployees.length;
        if (n === 0) {
            document.getElementById('totalEmployees').textContent = '0명';
            ['avgTotalLeave','avgUsedLeave','avgRemainingLeave'].forEach(id => {
                document.getElementById(id).textContent = '-';
            });
            return;
        }
        const avg = (field) =>
            (activeEmployees.reduce((s, e) => s + e[field], 0) / n).toFixed(1);

        document.getElementById('totalEmployees').textContent = `${n}명`;
        document.getElementById('avgTotalLeave').textContent    = `${avg('totalLeave')}일`;
        document.getElementById('avgUsedLeave').textContent     = `${avg('usedLeave')}일`;
        document.getElementById('avgRemainingLeave').textContent= `${avg('remainingLeave')}일`;
    }

    // ────────────────────────────────────────────────────────────
    // 검색 / 필터 / 정렬
    // ────────────────────────────────────────────────────────────

    function getChosung(str) {
        const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
        let r = '';
        for (let i = 0; i < str.length; i++) {
            const c = str.charCodeAt(i) - 0xAC00;
            r += (c > -1 && c < 11172) ? CHOSUNG[Math.floor(c / 588)] : str[i];
        }
        return r;
    }

    function matchChosung(str, search) {
        return getChosung(str.toLowerCase()).includes(search);
    }

    function handleSort(field) {
        if (currentSortField === field) {
            currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortField = field;
            currentSortOrder = 'asc';
        }
        sortDataByField(field, currentSortOrder);
        updateSortIcons();
        renderTable();
    }

    function updateSortIcons() {
        document.querySelectorAll('.vacation-table th.sortable').forEach(header => {
            const icon = header.querySelector('.sort-icon');
            if (header.getAttribute('data-sort') === currentSortField) {
                icon.className = currentSortOrder === 'asc'
                    ? 'fas fa-sort-up sort-icon active'
                    : 'fas fa-sort-down sort-icon active';
            } else {
                icon.className = 'fas fa-sort sort-icon';
            }
        });
    }

    // 숫자 정렬 대상 필드
    const NUMERIC_FIELDS = new Set([
        'totalLeave', 'usedLeave', 'remainingLeave', 'usageRate',
        'annualLeaveDays', 'proportionalDays', 'monthlyLeaveDays', 'compensatoryDays'
    ]);

    // ISO 날짜 문자열 정렬 대상 필드 (null → '' 처리)
    const DATE_STRING_FIELDS = new Set([
        'hireDate', 'seniorityEarnedDate', 'seniorityUpcomingDate'
    ]);

    function sortDataByField(field, order) {
        filteredEmployees.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];

            if (NUMERIC_FIELDS.has(field)) {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (DATE_STRING_FIELDS.has(field)) {
                aVal = aVal || '';
                bVal = bVal || '';
            } else if (field === 'position') {
                aVal = a.positionCode === '-' ? 'Z999' : a.positionCode;
                bVal = b.positionCode === '-' ? 'Z999' : b.positionCode;
                if (aVal < bVal) return order === 'asc' ? 1 : -1;
                if (aVal > bVal) return order === 'asc' ? -1 : 1;
                return 0;
            } else {
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
            }

            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
    }

    function filterData() {
        const searchTerm    = searchInput.value.trim();
        const searchLower   = searchTerm.toLowerCase();
        const deptValue     = departmentFilter.value;
        const sortValue     = sortFilter.value;

        filteredEmployees = allEmployees.filter(emp => {
            const matchSearch = !searchTerm ||
                emp.name.toLowerCase().includes(searchLower) ||
                emp.department.toLowerCase().includes(searchLower) ||
                emp.position.toLowerCase().includes(searchLower) ||
                matchChosung(emp.name, searchLower) ||
                matchChosung(emp.department, searchLower) ||
                matchChosung(emp.position, searchLower);

            return matchSearch && (!deptValue || emp.department === deptValue);
        });

        sortData(sortValue);
        renderTable(searchTerm);
    }

    function sortData(sortBy) {
        switch(sortBy) {
            case 'name':      filteredEmployees.sort((a,b) => a.name.localeCompare(b.name)); break;
            case 'total':     filteredEmployees.sort((a,b) => b.totalLeave - a.totalLeave); break;
            case 'used':      filteredEmployees.sort((a,b) => b.usedLeave - a.usedLeave); break;
            case 'remaining': filteredEmployees.sort((a,b) => b.remainingLeave - a.remainingLeave); break;
        }
    }

    // ────────────────────────────────────────────────────────────
    // 렌더링
    // ────────────────────────────────────────────────────────────

    function highlightText(text, searchTerm) {
        if (!searchTerm || !text) return text;
        const lower = searchTerm.toLowerCase();
        if (text.toLowerCase().includes(lower)) {
            const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            return text.replace(regex, '<mark class="highlight-text">$1</mark>');
        }
        if (matchChosung(text, lower)) return `<mark class="highlight-text">${text}</mark>`;
        return text;
    }

    // breakdown 열 TD (0이면 회색 -)
    function bkdCell(val, extraClass = '') {
        const n = parseFloat(val) || 0;
        const cls = `col-breakdown bkd-cell${extraClass ? ' ' + extraClass : ''}`;
        return n === 0
            ? `<td class="${cls} bkd-zero">-</td>`
            : `<td class="${cls}">${n}일</td>`;
    }

    // 근속가산 셀 (발생완료 / 예정 통합)
    function seniorityCell(emp) {
        if (emp.seniorityEarnedShort) {
            return `<td class="col-breakdown seniority-earned-cell">
                        ${emp.seniorityEarnedShort} 발생완료 <strong>+1일</strong>
                    </td>`;
        }
        if (emp.seniorityUpcomingShort) {
            return `<td class="col-breakdown seniority-upcoming-cell">
                        ${emp.seniorityUpcomingShort} 이후 <strong>+1일</strong> 예정
                    </td>`;
        }
        return `<td class="col-breakdown bkd-zero">-</td>`;
    }

    // 비례연차 셀 (이미 발생한 경우 일수 표시, 예정인 경우 예정일·예정일수 표시)
    function proportionalCell(emp) {
        if (emp.proportionalDays > 0) {
            return `<td class="col-breakdown bkd-cell">${emp.proportionalDays}일</td>`;
        }
        if (emp.proportionalUpcomingShort) {
            return `<td class="col-breakdown bkd-cell proportional-upcoming-cell">
                        ${emp.proportionalUpcomingShort} 이후 <strong>+${emp.proportionalUpcomingDays}일</strong>
                    </td>`;
        }
        return `<td class="col-breakdown bkd-cell bkd-zero">-</td>`;
    }

    function renderTable(searchTerm = '') {
        if (filteredEmployees.length === 0) {
            vacationTableBody.innerHTML = '';
            noData.style.display = 'block';
            return;
        }
        noData.style.display = 'none';

        const html = filteredEmployees.map((emp, index) => {
            const nameHtml = searchTerm ? highlightText(emp.name, searchTerm) : emp.name;
            const deptHtml = searchTerm ? highlightText(emp.department, searchTerm) : emp.department;
            const posHtml  = searchTerm ? highlightText(emp.position, searchTerm)  : emp.position;

            // 입사 전 연도: 연차 없음 표시 (colspan으로 연차 관련 컬럼 통합)
            if (emp.preEmployment) {
                return `
                    <tr class="pre-employment-row">
                        <td>${index + 1}</td>
                        <td class="employee-name">${nameHtml}</td>
                        <td>${emp.hireDate}</td>
                        <td>${deptHtml}</td>
                        <td>${posHtml}</td>
                        <td colspan="9" class="pre-employment-cell">
                            <i class="fas fa-info-circle"></i> 입사 전입니다
                        </td>
                        <td>-</td>
                    </tr>
                `;
            }

            const usageClass = emp.usageRate < 50 ? 'low' : emp.usageRate < 80 ? 'medium' : 'high';

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td class="employee-name">${nameHtml}</td>
                    <td>${emp.hireDate}</td>
                    <td>${deptHtml}</td>
                    <td>${posHtml}</td>
                    <td class="total-leave-cell"><strong>${emp.totalLeave}일</strong></td>
                    ${bkdCell(emp.annualLeaveDays)}
                    ${seniorityCell(emp)}
                    ${proportionalCell(emp)}
                    ${bkdCell(emp.monthlyLeaveDays)}
                    ${bkdCell(emp.compensatoryDays)}
                    <td>${emp.usedLeave}일</td>
                    <td><strong>${emp.remainingLeave}일</strong></td>
                    <td><span class="usage-rate ${usageClass}">${emp.usageRate}%</span></td>
                    <td><button class="btn-detail" onclick="showDetail(${emp.id})">상세보기</button></td>
                </tr>
            `;
        }).join('');

        vacationTableBody.innerHTML = html;
    }

    // ────────────────────────────────────────────────────────────
    // 상세 모달 — breakdown HTML 생성
    // ────────────────────────────────────────────────────────────
    function buildBreakdownHtml(emp) {
        const {
            annualLeaveDays, proportionalDays, monthlyLeaveDays,
            compensatoryDays, expiredMonthlyDays, empJoinDate, totalLeave,
            seniorityEarnedShort, seniorityUpcomingShort,
            proportionalUpcomingShort, proportionalUpcomingDays
        } = emp;

        const allZero = annualLeaveDays === 0 && proportionalDays === 0
                     && monthlyLeaveDays === 0 && compensatoryDays === 0;

        let html = '<div class="bkd-section">';

        // ── 기본연차 + 근속가산 ───────────────────────────────────
        if (annualLeaveDays > 0) {
            const baseDays  = Math.min(annualLeaveDays, 15);
            const seniority = Math.max(0, annualLeaveDays - 15);

            html += `<div class="bkd-group">
                        <div class="bkd-group-header">
                            <i class="fas fa-calendar-alt bkd-icon-blue"></i>
                            기본/근속가산
                            <span class="bkd-days">${annualLeaveDays}일</span>
                        </div>
                        <div class="bkd-sub">기본연차: <strong>${baseDays}일</strong></div>`;

            if (empJoinDate) {
                const joinDate  = new Date(empJoinDate);
                const yearStart = new Date(currentYear, 0, 1);
                const today     = new Date();
                const nextYear  = new Date(currentYear + 1, 0, 1);

                let pastMilestones   = [];
                let earnedThisYear   = [];
                let upcomingThisYear = [];
                let nextMilestone    = null;
                let totalCounted     = 0;

                for (let sy = 3; sy <= 21; sy += 2) {
                    if (totalCounted >= 10) break;
                    const mDate = new Date(joinDate);
                    mDate.setFullYear(joinDate.getFullYear() + sy);

                    if (mDate < yearStart) {
                        pastMilestones.push({ years: sy, dateStr: formatDate(mDate) });
                        totalCounted++;
                    } else if (mDate.getFullYear() === currentYear) {
                        if (mDate <= today) earnedThisYear.push({ years: sy, dateStr: formatDate(mDate) });
                        else upcomingThisYear.push({ years: sy, dateStr: formatDate(mDate) });
                        totalCounted++;
                    } else if (!nextMilestone && mDate >= nextYear) {
                        nextMilestone = { years: sy, dateStr: formatDate(mDate) };
                    }
                }

                if (pastMilestones.length > 0) {
                    html += `<div class="bkd-seniority-group">
                                <div class="bkd-seniority-header">근속가산: <strong>+${seniority}일</strong> (누적)</div>`;
                    pastMilestones.forEach(m => {
                        html += `<div class="bkd-seniority-item">
                                    <i class="fas fa-check-circle bkd-icon-blue"></i>
                                    만 ${m.years}년 (${m.dateStr})
                                 </div>`;
                    });
                    html += `</div>`;
                } else if (seniority > 0) {
                    html += `<div class="bkd-sub">근속가산: <strong>+${seniority}일</strong></div>`;
                }

                earnedThisYear.forEach(m => {
                    html += `<div class="bkd-seniority-new">
                                <i class="fas fa-star bkd-icon-green"></i>
                                만 ${m.years}년 (${m.dateStr})
                                <span class="bkd-tag bkd-tag-new">🎉 올해 추가</span>
                             </div>`;
                });

                upcomingThisYear.forEach(m => {
                    html += `<div class="bkd-seniority-upcoming">
                                <i class="fas fa-clock bkd-icon-yellow"></i>
                                만 ${m.years}년 (${m.dateStr})
                                <span class="bkd-tag bkd-tag-upcoming">⏳ 이번 연도 예정</span>
                                <span class="bkd-tag-note">총 연차 미반영</span>
                             </div>`;
                });

                if (nextMilestone) {
                    html += `<div class="bkd-next">
                                <i class="fas fa-arrow-right"></i>
                                다음 발생 예정: 만 ${nextMilestone.years}년 (${nextMilestone.dateStr})
                             </div>`;
                }
            } else if (seniority > 0) {
                html += `<div class="bkd-sub">근속가산: <strong>+${seniority}일</strong></div>`;
            }

            html += `</div>`;
        }

        // ── 비례연차 ─────────────────────────────────────────────
        if (proportionalDays > 0) {
            html += `<div class="bkd-group">
                        <div class="bkd-group-header">
                            <i class="fas fa-chart-pie bkd-icon-purple"></i>
                            비례연차
                            <span class="bkd-days">${proportionalDays}일</span>
                        </div>
                        <div class="bkd-sub">입사 1년 미만 재직일수 기준 산정</div>
                     </div>`;
        } else if (proportionalUpcomingShort) {
            html += `<div class="bkd-group">
                        <div class="bkd-group-header">
                            <i class="fas fa-chart-pie bkd-icon-purple"></i>
                            비례연차
                            <span class="bkd-days bkd-upcoming">예정 +${proportionalUpcomingDays}일</span>
                        </div>
                        <div class="bkd-upcoming-row">
                            <i class="fas fa-clock bkd-icon-yellow"></i>
                            ${proportionalUpcomingShort} 1주년 도래 시 발생 예정
                            <span class="bkd-tag bkd-tag-upcoming">⏳ 미발생</span>
                        </div>
                        <div class="bkd-sub">총 연차 미포함 · 1주년일~12/31 재직일수 기준</div>
                     </div>`;
        }

        // ── 월차 ─────────────────────────────────────────────────
        if (monthlyLeaveDays > 0) {
            html += `<div class="bkd-group">
                        <div class="bkd-group-header">
                            <i class="fas fa-calendar-week bkd-icon-green"></i>
                            월차
                            <span class="bkd-days">${monthlyLeaveDays}일</span>
                        </div>`;
            if (expiredMonthlyDays > 0) {
                html += `<div class="bkd-sub">부여: ${monthlyLeaveDays + expiredMonthlyDays}일 / 소멸: ${expiredMonthlyDays}일</div>`;
            }
            html += `</div>`;
        }

        // ── 보상휴가 ─────────────────────────────────────────────
        if (compensatoryDays > 0) {
            html += `<div class="bkd-group">
                        <div class="bkd-group-header">
                            <i class="fas fa-gift bkd-icon-orange"></i>
                            보상휴가
                            <span class="bkd-days">${compensatoryDays}일</span>
                        </div>
                     </div>`;
        }

        if (allZero) {
            html += `<div class="bkd-empty">연차 구성 정보가 없습니다.</div>`;
        }

        html += `<div class="bkd-total">합계: <strong>${totalLeave}일</strong></div>`;
        html += '</div>';
        return html;
    }

    // ────────────────────────────────────────────────────────────
    // 상세 모달 표시
    // ────────────────────────────────────────────────────────────
    window.showDetail = async function(employeeId) {
        const employee = allEmployees.find(emp => emp.id === employeeId);
        if (!employee) return;

        document.getElementById('detailName').textContent       = employee.name;
        document.getElementById('detailDepartment').textContent = employee.department;
        document.getElementById('detailPosition').textContent   = employee.position;
        document.getElementById('detailHireDate').textContent   = employee.hireDate;
        document.getElementById('detailYear').textContent       = currentYear;

        document.getElementById('detailTotalLeave').textContent     = `${employee.totalLeave}일`;
        document.getElementById('detailUsedLeave').textContent      = `${employee.usedLeave}일`;
        document.getElementById('detailRemainingLeave').textContent = `${employee.remainingLeave}일`;

        document.getElementById('detailBreakdown').innerHTML = buildBreakdownHtml(employee);

        // 연차 사용 이력
        try {
            const response = await fetch(`/api/vacation/history?userIdx=${employee.id}&year=${currentYear}`);
            let leaveHistory = [];
            if (response.ok) leaveHistory = await response.json();

            const filtered = leaveHistory.filter(item => item.days && parseFloat(item.days) > 0);
            const historyHtml = filtered.map(h => {
                const fmtD = s => s ? s.replace(/-/g, '.') : '';
                return `
                    <div class="history-item">
                        <div class="history-date">${fmtD(h.startDate)} ~ ${fmtD(h.endDate)}</div>
                        <div class="history-content">${parseFloat(h.days) || 0}일 사용 - ${h.vacationType || '연차'}</div>
                    </div>
                `;
            }).join('');

            document.getElementById('leaveHistoryList').innerHTML =
                historyHtml || '<p style="text-align:center;color:#999;">연차 사용 이력이 없습니다</p>';
        } catch (error) {
            console.error('연차 사용 이력 조회 실패:', error);
            document.getElementById('leaveHistoryList').innerHTML =
                '<p style="text-align:center;color:#e74c3c;">이력 조회 중 오류가 발생했습니다</p>';
        }

        detailModal.classList.add('show');
    };

    function closeModal() {
        detailModal.classList.remove('show');
    }

    // ────────────────────────────────────────────────────────────
    // 기타
    // ────────────────────────────────────────────────────────────
    function exportToExcel() {
        Swal.fire({
            icon: 'info',
            title: '준비 중',
            text: 'Excel 다운로드 기능은 준비 중입니다.',
            confirmButtonText: '확인'
        });
    }

    function showLoading() {
        loadingSpinner.style.display = 'block';
        vacationTableBody.innerHTML = '';
        noData.style.display = 'none';
    }

    function hideLoading() {
        loadingSpinner.style.display = 'none';
    }
});
