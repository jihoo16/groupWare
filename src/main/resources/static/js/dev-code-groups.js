document.addEventListener('DOMContentLoaded', function() {

    const codeGroupModal = document.getElementById('code-group-modal');
    const addCodeGroupBtn = document.getElementById('add-code-group-btn');
    const codeGroupModalTitle = document.getElementById('code-group-modal-title');
    const codeGroupSaveBtn = document.getElementById('code-group-save-btn');
    let isEditMode = false;
    let editingIdx = null;
    let currentCodeGroups = [];

    // ===========================
    // Load
    // ===========================
    function loadCodeGroups() {
        fetch('/api/code-groups')
            .then(response => response.json())
            .then(data => {
                const codeGroups = Array.isArray(data) ? data : (data.data || []);
                currentCodeGroups = codeGroups;
                renderTable(codeGroups);
            })
            .catch(error => {
                console.error('그룹코드 목록 조회 실패:', error);
                showError('그룹코드 목록을 불러오는데 실패했습니다.');
            });
    }

    function renderTable(codeGroups) {
        const tbody = document.getElementById('code-groups-tbody');

        if (!Array.isArray(codeGroups) || codeGroups.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px;">
                        <i class="fas fa-inbox" style="font-size: 48px; color: #ccc; display: block; margin-bottom: 10px;"></i>
                        <p style="color: #999;">등록된 그룹코드가 없습니다.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = codeGroups.map(group => `
            <tr data-idx="${group.idx}">
                <td><strong>${group.groupCode}</strong></td>
                <td>${group.groupName}</td>
                <td>${group.description || '-'}</td>
                <td>
                    <span class="status-${group.useYn === 'Y' ? 'active' : 'inactive'}">
                        ${group.useYn === 'Y' ? '사용' : '미사용'}
                    </span>
                </td>
                <td>
                    <button class="btn-sm btn-detail" data-group-code="${group.groupCode}" data-group-name="${group.groupName}">
                        <i class="fas fa-list"></i> 상세코드
                    </button>
                    <button class="btn-sm btn-edit" data-idx="${group.idx}">수정</button>
                    <button class="btn-sm btn-delete" data-idx="${group.idx}">삭제</button>
                </td>
            </tr>
        `).join('');
    }

    // ===========================
    // 버튼 이벤트 (이벤트 위임)
    // ===========================
    document.addEventListener('click', (e) => {
        const detailBtn = e.target.closest('.btn-detail');
        if (detailBtn) {
            const groupCode = detailBtn.getAttribute('data-group-code');
            const groupName = detailBtn.getAttribute('data-group-name');
            window.location.href = `/basic-info/code-detail?groupCode=${groupCode}&groupName=${encodeURIComponent(groupName)}`;
            return;
        }

        if (e.target.classList.contains('btn-edit')) {
            editCodeGroup(e.target.getAttribute('data-idx'));
        }

        if (e.target.classList.contains('btn-delete')) {
            deleteCodeGroup(e.target.getAttribute('data-idx'));
        }
    });

    // ===========================
    // 추가 버튼
    // ===========================
    addCodeGroupBtn.addEventListener('click', () => {
        codeGroupModalTitle.textContent = '그룹코드 추가';
        clearForm();
        isEditMode = false;
        editingIdx = null;
        document.getElementById('code-group-code').disabled = false;
        document.getElementById('code-group-code').value = getNextGroupCode();
        openModal();
    });

    // ===========================
    // 수정
    // ===========================
    function editCodeGroup(idx) {
        fetch(`/api/code-groups/${idx}`)
            .then(response => response.json())
            .then(group => {
                codeGroupModalTitle.textContent = '그룹코드 수정';
                isEditMode = true;
                editingIdx = idx;
                fillForm(group);
                document.getElementById('code-group-code').disabled = true;
                openModal();
            })
            .catch(async error => {
                console.error('그룹코드 조회 실패:', error);
                await showError('그룹코드 정보를 불러오는데 실패했습니다.');
            });
    }

    // ===========================
    // 삭제
    // ===========================
    async function deleteCodeGroup(idx) {
        const confirmed = await showDeleteConfirm('정말 삭제하시겠습니까?');
        if (!confirmed) return;

        fetch(`/api/code-groups/${idx}`, { method: 'DELETE' })
            .then(async response => {
                if (!response.ok) throw new Error('삭제 실패');
                await showSuccess('그룹코드가 삭제되었습니다.');
                loadCodeGroups();
            })
            .catch(async error => {
                console.error('그룹코드 삭제 실패:', error);
                await showError('그룹코드 삭제에 실패했습니다.');
            });
    }

    // ===========================
    // 저장
    // ===========================
    codeGroupSaveBtn.addEventListener('click', async () => {
        const groupCode = document.getElementById('code-group-code').value.trim();
        const groupName = document.getElementById('code-group-name').value.trim();

        if (!groupCode || !groupName) {
            await showWarning('그룹코드와 그룹명은 필수입니다.');
            return;
        }

        const formData = {
            groupCode,
            groupName,
            description: document.getElementById('code-group-description').value.trim() || null,
            useYn: document.getElementById('code-group-status').value
        };

        const url = isEditMode ? `/api/code-groups/${editingIdx}` : '/api/code-groups';
        const method = isEditMode ? 'PUT' : 'POST';

        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) throw new Error('저장 실패');
            return response.json();
        })
        .then(async () => {
            await showSuccess(isEditMode ? '그룹코드가 수정되었습니다.' : '그룹코드가 등록되었습니다.');
            closeModal();
            loadCodeGroups();
        })
        .catch(async error => {
            console.error('그룹코드 저장 실패:', error);
            await showError('저장에 실패했습니다. 이미 존재하는 코드일 수 있습니다.');
        });
    });

    // ===========================
    // 폼 헬퍼
    // ===========================
    function fillForm(group) {
        document.getElementById('code-group-idx').value = group.idx;
        document.getElementById('code-group-code').value = group.groupCode;
        document.getElementById('code-group-name').value = group.groupName;
        document.getElementById('code-group-description').value = group.description || '';
        document.getElementById('code-group-status').value = group.useYn;
    }

    function clearForm() {
        document.getElementById('code-group-idx').value = '';
        document.getElementById('code-group-code').value = '';
        document.getElementById('code-group-name').value = '';
        document.getElementById('code-group-description').value = '';
        document.getElementById('code-group-status').value = 'Y';
    }

    function getNextGroupCode() {
        if (currentCodeGroups.length === 0) return 'C01';
        const nums = currentCodeGroups
            .map(cg => cg.groupCode)
            .filter(code => /^C\d+$/.test(code))
            .map(code => parseInt(code.substring(1)));
        if (nums.length === 0) return 'C01';
        return 'C' + String(Math.max(...nums) + 1).padStart(2, '0');
    }

    // ===========================
    // 모달
    // ===========================
    function openModal() {
        codeGroupModal.classList.add('active');
    }

    function closeModal() {
        codeGroupModal.classList.remove('active');
    }

    document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    window.addEventListener('click', (e) => {
        if (e.target === codeGroupModal) closeModal();
    });

    // 초기 로드
    loadCodeGroups();
});
