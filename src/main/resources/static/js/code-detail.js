document.addEventListener('DOMContentLoaded', function() {
    // ===========================
    // Global Variables
    // ===========================
    const urlParams = new URLSearchParams(window.location.search);
    const groupCode = urlParams.get('groupCode');
    const groupName = urlParams.get('groupName') || groupCode;

    let currentCodes = [];
    let isEditMode = false;
    let editingCodeIdx = null;

    // Set page title
    document.getElementById('page-title').textContent = `${groupName} 상세코드 관리`;
    document.getElementById('page-subtitle').textContent = `${groupName}(${groupCode})의 하위 코드를 관리합니다`;
    document.getElementById('section-title').textContent = `${groupName} 코드 목록`;

    // ===========================
    // Load Codes
    // ===========================
    async function loadCodes() {
        try {
            const data = await window.fetchWithErrorHandling(`/api/codes?groupCode=${groupCode}`);

            if (!data) {
                // Error already handled by fetchWithErrorHandling (404, 403, 500)
                return;
            }

            currentCodes = data;
            renderCodeTable(data);

            // 로딩 오버레이 숨김
            window.hidePageLoadingOverlay();
        } catch (error) {
            console.error('코드 목록 조회 실패:', error);
            showError('코드 목록을 불러오는데 실패했습니다.');
            window.hidePageLoadingOverlay();
        }
    }

    // ===========================
    // Render Code Table
    // ===========================
    function renderCodeTable(codes) {
        const tbody = document.getElementById('codes-tbody');

        if (!Array.isArray(codes) || codes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-inbox" style="font-size: 48px; color: #ccc; display: block; margin-bottom: 10px;"></i>
                        <p style="color: #999;">등록된 코드가 없습니다.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = codes.map(code => `
            <tr data-idx="${code.idx}">
                <td>${code.sortOrder || 0}</td>
                <td>${code.code}</td>
                <td>${code.codeName}</td>
                <td>${code.codeNameEn || '-'}</td>
                <td>${code.description || '-'}</td>
                <td>
                    <span class="status-${code.useYn === 'Y' ? 'active' : 'inactive'}">
                        ${code.useYn === 'Y' ? '사용' : '미사용'}
                    </span>
                </td>
                <td>
                    <button class="btn-sm btn-edit" data-idx="${code.idx}">수정</button>
                    <button class="btn-sm btn-delete" data-idx="${code.idx}">삭제</button>
                </td>
            </tr>
        `).join('');
    }

    // Initial load
    window.showPageLoadingOverlay();
    loadCodes();

    // ===========================
    // Code Modal
    // ===========================
    const codeModal = document.getElementById('code-modal');
    const addCodeBtn = document.getElementById('add-code-btn');
    const codeModalTitle = document.getElementById('code-modal-title');
    const codeSaveBtn = document.getElementById('code-save-btn');

    // Open modal for adding new code
    addCodeBtn.addEventListener('click', () => {
        codeModalTitle.textContent = `${groupName} 코드 추가`;
        clearCodeForm();
        isEditMode = false;
        editingCodeIdx = null;
        document.getElementById('code-group-code').value = groupCode;
        document.getElementById('code-prefix').value = groupCode;
        document.getElementById('code-suffix').disabled = false;

        // Set next sort order and code suffix
        const nextSortOrder = getNextSortOrder();
        document.getElementById('code-order').value = nextSortOrder;

        const nextCodeSuffix = getNextCodeSuffix();
        document.getElementById('code-suffix').value = nextCodeSuffix;

        openModal(codeModal);
    });

    // Edit/Delete code
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit')) {
            const idx = e.target.getAttribute('data-idx');
            if (!idx) return;
            editCode(idx);
        }

        if (e.target.classList.contains('btn-delete')) {
            const idx = e.target.getAttribute('data-idx');
            if (!idx) return;
            deleteCode(idx);
        }
    });

    // Edit code
    async function editCode(idx) {
        fetch(`/api/codes/${idx}`)
            .then(response => response.json())
            .then(async code => {
                codeModalTitle.textContent = `${groupName} 코드 수정`;
                isEditMode = true;
                editingCodeIdx = idx;
                fillCodeForm(code);
                document.getElementById('code-suffix').disabled = true; // 수정 시 코드 변경 불가
                openModal(codeModal);
            })
            .catch(async error => {
                console.error('코드 조회 실패:', error);
                await showError('코드 정보를 불러오는데 실패했습니다.');
            });
    }

    // Delete code
    async function deleteCode(idx) {
        const confirmed = await showDeleteConfirm('정말 삭제하시겠습니까?');
        if (!confirmed) {
            return;
        }

        fetch(`/api/codes/${idx}`, {
            method: 'DELETE'
        })
        .then(async response => {
            if (!response.ok) {
                throw new Error('코드 삭제 실패');
            }
            await showSuccess('코드가 성공적으로 삭제되었습니다.');
            loadCodes();
        })
        .catch(async error => {
            console.error('코드 삭제 실패:', error);
            await showError('코드 삭제에 실패했습니다.');
        });
    }

    // Save code
    codeSaveBtn.addEventListener('click', async () => {
        const codePrefix = document.getElementById('code-prefix').value.trim();
        const codeSuffix = document.getElementById('code-suffix').value.trim();
        const code = codePrefix + codeSuffix;
        const codeName = document.getElementById('code-name').value.trim();

        if (!codeSuffix || !codeName) {
            await showWarning('코드와 코드명은 필수입니다.');
            return;
        }

        const formData = {
            groupCode: document.getElementById('code-group-code').value,
            code: code,
            codeName: codeName,
            codeNameEn: document.getElementById('code-name-en').value.trim() || null,
            description: document.getElementById('code-description').value.trim() || null,
            useYn: document.getElementById('code-status').value,
            sortOrder: parseInt(document.getElementById('code-order').value) || 0
        };

        if (isEditMode) {
            await updateCode(editingCodeIdx, formData);
        } else {
            await createCode(formData);
        }
    });

    // Create code
    async function createCode(data) {
        fetch('/api/codes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('코드 생성 실패');
            }
            return response.json();
        })
        .then(async () => {
            await showSuccess('코드가 성공적으로 등록되었습니다.');
            closeModal(codeModal);
            loadCodes();
        })
        .catch(async error => {
            console.error('코드 생성 실패:', error);
            await showError('코드 등록에 실패했습니다. 이미 존재하는 코드일 수 있습니다.');
        });
    }

    // Update code
    async function updateCode(idx, data) {
        fetch(`/api/codes/${idx}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('코드 수정 실패');
            }
            return response.json();
        })
        .then(async () => {
            await showSuccess('코드가 성공적으로 수정되었습니다.');
            closeModal(codeModal);
            loadCodes();
        })
        .catch(async error => {
            console.error('코드 수정 실패:', error);
            await showError('코드 수정에 실패했습니다.');
        });
    }

    // Fill form with code data
    function fillCodeForm(code) {
        document.getElementById('code-idx').value = code.idx;
        document.getElementById('code-group-code').value = code.groupCode;

        // Split code into prefix (group code) and suffix
        const prefix = code.groupCode;
        const suffix = code.code.startsWith(prefix) ? code.code.substring(prefix.length) : code.code;

        document.getElementById('code-prefix').value = prefix;
        document.getElementById('code-suffix').value = suffix;
        document.getElementById('code-name').value = code.codeName;
        document.getElementById('code-name-en').value = code.codeNameEn || '';
        document.getElementById('code-description').value = code.description || '';
        document.getElementById('code-order').value = code.sortOrder || 0;
        document.getElementById('code-status').value = code.useYn;
    }

    // Clear form
    function clearCodeForm() {
        document.getElementById('code-idx').value = '';
        document.getElementById('code-prefix').value = groupCode;
        document.getElementById('code-suffix').value = '';
        document.getElementById('code-name').value = '';
        document.getElementById('code-name-en').value = '';
        document.getElementById('code-description').value = '';
        document.getElementById('code-order').value = getNextSortOrder();
        document.getElementById('code-status').value = 'Y';
    }

    // Get next sort order
    function getNextSortOrder() {
        if (currentCodes.length === 0) {
            return 1;
        }
        const maxOrder = Math.max(...currentCodes.map(c => c.sortOrder || 0));
        return maxOrder + 1;
    }

    // Get next suggested code suffix
    function getNextCodeSuffix() {
        if (currentCodes.length === 0) {
            return '01';
        }

        // Extract suffix parts and parse as numbers
        const suffixes = currentCodes
            .map(c => {
                const prefix = groupCode;
                if (c.code.startsWith(prefix)) {
                    return c.code.substring(prefix.length);
                }
                return null;
            })
            .filter(suffix => suffix && /^\d+$/.test(suffix))
            .map(suffix => parseInt(suffix));

        if (suffixes.length === 0) {
            return '01';
        }

        const maxNum = Math.max(...suffixes);
        const nextNum = maxNum + 1;
        return String(nextNum).padStart(2, '0');
    }

    // ===========================
    // Modal Helper Functions
    // ===========================
    function openModal(modal) {
        modal.classList.add('active');
    }

    function closeModal(modal) {
        modal.classList.remove('active');
    }

    // Modal close button handlers
    document.querySelectorAll('.modal-close, .modal .btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(codeModal);
        });
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === codeModal) {
            closeModal(codeModal);
        }
    });
});
