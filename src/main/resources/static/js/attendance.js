// 근태 관리 페이지 JavaScript - BIO star2 API 연동

document.addEventListener('DOMContentLoaded', function() {
    const refreshBtn = document.getElementById('refreshBtn');
    const prevWeekBtn = document.getElementById('prevWeek');
    const nextWeekBtn = document.getElementById('nextWeek');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');

    // 데이터 새로고침 버튼
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            console.log('BIO star2 데이터 새로고침');

            // 로딩 애니메이션
            const icon = this.querySelector('i');
            icon.classList.add('fa-spin');

            // TODO: BIO star2 API 호출
            setTimeout(() => {
                icon.classList.remove('fa-spin');
                showAlert('근태 데이터가 업데이트되었습니다.', 'success');
                // loadAttendanceData();
            }, 1000);
        });
    }

    // 이전 주 버튼
    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', function() {
            console.log('이전 주');
            showAlert('이전 주 데이터를 불러옵니다.', 'info');
            // TODO: 이전 주 데이터 로드
            // loadWeekData(-1);
        });
    }

    // 다음 주 버튼
    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', function() {
            console.log('다음 주');
            showAlert('다음 주 데이터를 불러옵니다.', 'info');
            // TODO: 다음 주 데이터 로드
            // loadWeekData(1);
        });
    }

    // 이전 달 버튼
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', function() {
            console.log('이전 달');
            showAlert('이전 달 기능은 추후 구현됩니다.', 'info');
            // TODO: 캘린더 이전 달로 이동
        });
    }

    // 다음 달 버튼
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', function() {
            console.log('다음 달');
            showAlert('다음 달 기능은 추후 구현됩니다.', 'info');
            // TODO: 캘린더 다음 달로 이동
        });
    }

    // 캘린더 날짜 클릭
    const days = document.querySelectorAll('.day:not(.other-month):not(.future)');
    days.forEach(day => {
        day.addEventListener('click', function() {
            const dayNumber = this.querySelector('.day-number').textContent;
            const status = this.querySelector('.day-status')?.textContent || '정보 없음';
            const time = this.querySelector('.day-time')?.textContent || '';

            console.log(`날짜 클릭: ${dayNumber}일 - ${status} ${time}`);
            showDayDetail(dayNumber, status, time);
        });
    });

    // 날짜별 상세 정보 표시
    function showDayDetail(day, status, time) {
        const detailMessage = `
[${day}일 근태 상세]

상태: ${status}
근무시간: ${time || '정보 없음'}

※ BIO star2 지문인식 장비를 통해 자동 기록됨
        `;
        showAlert(detailMessage, 'info');
        // TODO: 상세 정보 모달 구현
    }

    // BIO star2 API 데이터 로드 함수 (추후 구현)
    function loadAttendanceData() {
        console.log('BIO star2 API 호출 - 근태 데이터 로드');
        // TODO: fetch('/api/attendance/biostar2') 등으로 API 호출
        /*
        fetch('/api/attendance/biostar2')
            .then(response => response.json())
            .then(data => {
                updateWeekStats(data.weekStats);
                updateWeekRecords(data.weekRecords);
                updateCalendar(data.monthRecords);
            })
            .catch(error => {
                console.error('근태 데이터 로드 실패:', error);
            });
        */
    }

    // 주간 통계 업데이트 함수
    function updateWeekStats(stats) {
        // TODO: 주간 통계 UI 업데이트
    }

    // 주간 기록 업데이트 함수
    function updateWeekRecords(records) {
        // TODO: 주간 기록 UI 업데이트
    }

    // 캘린더 업데이트 함수
    function updateCalendar(records) {
        // TODO: 월간 캘린더 UI 업데이트
    }
});
