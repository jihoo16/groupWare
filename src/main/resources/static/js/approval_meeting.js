// 회의록 작성 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수 CURRENT_USER 사용 (layout.html에서 주입됨)
    if (!window.CURRENT_USER || !window.CURRENT_USER.idx) {
        console.warn('세션 정보가 없습니다.');
        window.location.href = '/login';
        return;
    }

    const currentUserIdx = window.CURRENT_USER.idx;
    console.log('현재 로그인 사용자:', window.CURRENT_USER.empName, '(idx:', currentUserIdx, ')');

    // 전역 변수
    let projects = []; // 프로젝트 목록

    // DOM 요소
    const projectSelect = document.getElementById('projectName');
    const submitBtn = document.getElementById('submitBtn');
    const saveDraftBtn = document.getElementById('saveDraftBtn');

    // ============================================
    // 템플릿 사이드바 접기/펼치기 기능
    // ============================================

    // 전체 접기/펼치기 버튼
    const toggleAllBtn = document.getElementById('toggleAllBtn');
    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', function() {
            const categories = document.querySelectorAll('.menu-category');
            const allExpanded = Array.from(categories).every(cat => cat.classList.contains('expanded'));

            categories.forEach(category => {
                if (allExpanded) {
                    category.classList.remove('expanded');
                } else {
                    category.classList.add('expanded');
                }
            });

            // 버튼 아이콘 변경
            const icon = this.querySelector('i');
            if (allExpanded) {
                icon.className = 'fas fa-chevron-up';
            } else {
                icon.className = 'fas fa-chevron-down';
            }
        });
    }

    // 각 카테고리 헤더 클릭 시 토글
    const categoryHeaders = document.querySelectorAll('.category-header');
    categoryHeaders.forEach(header => {
        header.addEventListener('click', function(e) {
            e.preventDefault();
            const category = this.closest('.menu-category');
            category.classList.toggle('expanded');
        });
    });

    // ============================================
    // 프로젝트 목록 로드
    // ============================================
    async function loadProjects() {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                projects = await response.json();
                console.log('프로젝트 목록 로드 성공:', projects.length + '건');

                // 프로젝트 셀렉트박스 채우기
                projects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = project.idx;
                    option.textContent = project.projectName;
                    option.dataset.projectName = project.projectName;
                    projectSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('프로젝트 로드 오류:', error);
        }
    }


    // ============================================
    // 회의록 저장
    // ============================================

    // 저장 버튼
    submitBtn.addEventListener('click', async function() {
        await saveMeetingMinutes();
    });

    async function saveMeetingMinutes() {
        // 데이터 수집
        const projectIdx = projectSelect.value ? parseInt(projectSelect.value) : null;
        const projectName = projectSelect.selectedOptions[0]?.dataset.projectName || null;
        const meetingTitle = document.getElementById('meetingTitle').value;
        const meetingDatetime = document.getElementById('meetingDatetime').value;
        const location = document.getElementById('location').value;
        const participants = document.getElementById('participants').value;
        const purpose = document.getElementById('purpose').value;
        const content = document.getElementById('content').value;
        const decisions = document.getElementById('decisions').value;
        const actionItems = document.getElementById('actionItems').value;

        // 유효성 검사
        if (!meetingTitle) {
            alert('회의명을 입력해주세요.');
            return;
        }

        if (!meetingDatetime) {
            alert('회의 일시를 입력해주세요.');
            return;
        }

        // 요청 데이터 구성
        const requestData = {
            userIdx: currentUserIdx,
            projectIdx: projectIdx,
            projectName: projectName,
            meetingTitle: meetingTitle,
            meetingDatetime: new Date(meetingDatetime).toISOString(),
            location: location,
            participants: participants,
            purpose: purpose,
            content: content,
            decisions: decisions,
            actionItems: actionItems
        };

        console.log('회의록 저장 요청:', requestData);

        try {
            const response = await fetch('/api/document/meeting-minutes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('회의록 저장 성공:', result);
                alert('회의록이 저장되었습니다.');
                window.location.href = '/approval';
            } else {
                const errorText = await response.text();
                console.error('회의록 저장 실패:', errorText);
                alert('회의록 저장에 실패했습니다.');
            }
        } catch (error) {
            console.error('회의록 저장 오류:', error);
            alert('회의록 저장 중 오류가 발생했습니다.');
        }
    }

    // 임시저장
    saveDraftBtn.addEventListener('click', function() {
        alert('임시저장 기능은 추후 구현 예정입니다.');
    });

    // 페이지 로드 시 프로젝트 목록 로드
    loadProjects();
});
