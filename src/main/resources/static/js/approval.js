// 결재 문서 페이지 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const filterTabs = document.querySelectorAll('.tab-btn');
    const approvalCards = document.querySelectorAll('.approval-card');
    const newApprovalBtn = document.getElementById('newApprovalBtn');

    // 필터 탭 클릭 이벤트
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');

            // 탭 활성화
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // 카드 필터링
            approvalCards.forEach(card => {
                const status = card.getAttribute('data-status');

                if (filter === 'all') {
                    card.style.display = 'block';
                } else if (status === filter) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // 상세보기 버튼 클릭 이벤트
    const viewButtons = document.querySelectorAll('.btn-view');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.approval-card');
            const title = card.querySelector('.approval-title').textContent;
            console.log('상세보기:', title);
            // TODO: 상세 모달 구현
            alert('결재 문서 상세보기 기능은 추후 구현됩니다.');
        });
    });

    // 새 결재 요청 버튼
    if (newApprovalBtn) {
        newApprovalBtn.addEventListener('click', function() {
            console.log('새 결재 요청');
            // TODO: 결재 작성 모달 구현
            alert('결재 요청 작성 기능은 추후 구현됩니다.');
        });
    }

    // 카드 전체 클릭 시에도 상세보기
    approvalCards.forEach(card => {
        card.addEventListener('click', function() {
            const viewBtn = this.querySelector('.btn-view');
            if (viewBtn) {
                viewBtn.click();
            }
        });
    });
});
