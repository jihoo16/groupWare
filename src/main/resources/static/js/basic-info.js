document.addEventListener('DOMContentLoaded', function() {
    // ===========================
    // Tab Switching
    // ===========================
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');

            // Load data based on tab
            if (tabName === 'code-groups') {
                loadCodeGroups();
            } else if (tabName === 'expenses') {
                loadExpensePolicies();
            }
        });
    });

    // ===========================
    // Code Group Management
    // ===========================
    const codeGroupModal = document.getElementById('code-group-modal');
    const addCodeGroupBtn = document.getElementById('add-code-group-btn');
    const codeGroupModalTitle = document.getElementById('code-group-modal-title');
    const codeGroupSaveBtn = document.getElementById('code-group-save-btn');
    let isCodeGroupEditMode = false;
    let editingCodeGroupIdx = null;
    let currentCodeGroups = [];

    // Load code groups from API
    function loadCodeGroups() {
        fetch('/api/code-groups')
            .then(response => response.json())
            .then(data => {
                // Handle different response structures
                const codeGroups = Array.isArray(data) ? data : (data.data || []);
                currentCodeGroups = codeGroups;
                renderCodeGroupTable(codeGroups);
            })
            .catch(error => {
                console.error('그룹코드 목록 조회 실패:', error);
                showError('그룹코드 목록을 불러오는데 실패했습니다.');
            });
    }

    // Render code group table
    function renderCodeGroupTable(codeGroups) {
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
                    <button class="btn-sm btn-edit" data-idx="${group.idx}" data-type="code-group">수정</button>
                    <button class="btn-sm btn-delete" data-idx="${group.idx}" data-type="code-group">삭제</button>
                </td>
            </tr>
        `).join('');
    }

    // Initial load
    loadCodeGroups();

    // Open modal for adding new code group
    addCodeGroupBtn.addEventListener('click', () => {
        codeGroupModalTitle.textContent = '그룹코드 추가';
        clearCodeGroupForm();
        isCodeGroupEditMode = false;
        editingCodeGroupIdx = null;
        document.getElementById('code-group-code').disabled = false;

        // Set next group code automatically in input
        const nextGroupCode = getNextGroupCode();
        document.getElementById('code-group-code').value = nextGroupCode;

        openModal(codeGroupModal);
    });

    // Detail/Edit/Delete code group
    document.addEventListener('click', (e) => {
        // Handle detail button (including icon click)
        const detailBtn = e.target.closest('.btn-detail');
        if (detailBtn) {
            const groupCode = detailBtn.getAttribute('data-group-code');
            const groupName = detailBtn.getAttribute('data-group-name');
            if (groupCode) {
                window.location.href = `/basic-info/code-detail?groupCode=${groupCode}&groupName=${encodeURIComponent(groupName)}`;
            }
            return;
        }

        if (e.target.classList.contains('btn-edit') && e.target.getAttribute('data-type') === 'code-group') {
            const idx = e.target.getAttribute('data-idx');
            if (!idx) return;
            editCodeGroup(idx);
        }

        if (e.target.classList.contains('btn-delete') && e.target.getAttribute('data-type') === 'code-group') {
            const idx = e.target.getAttribute('data-idx');
            if (!idx) return;
            deleteCodeGroup(idx);
        }
    });

    // Edit code group
    async function editCodeGroup(idx) {
        fetch(`/api/code-groups/${idx}`)
            .then(response => response.json())
            .then(group => {
                codeGroupModalTitle.textContent = '그룹코드 수정';
                isCodeGroupEditMode = true;
                editingCodeGroupIdx = idx;
                fillCodeGroupForm(group);
                document.getElementById('code-group-code').disabled = true; // 수정 시 코드 변경 불가
                openModal(codeGroupModal);
            })
            .catch(error => {
                console.error('그룹코드 조회 실패:', error);
                await showError('그룹코드 정보를 불러오는데 실패했습니다.');
            });
    }

    // Delete code group
    async function deleteCodeGroup(idx) {
        const confirmed = await showDeleteConfirm('정말 삭제하시겠습니까?
        if (!confirmed) {
            return;
        }

        fetch(`/api/code-groups/${idx}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('그룹코드 삭제 실패');
            }
            await showSuccess('그룹코드가 성공적으로 삭제되었습니다.');
            loadCodeGroups();
        })
        .catch(error => {
            console.error('그룹코드 삭제 실패:', error);
            await showError('그룹코드 삭제에 실패했습니다.');
        });
    }

    // Save code group
    codeGroupSaveBtn.addEventListener('click', async () => {
        const groupCode = document.getElementById('code-group-code').value.trim();
        const groupName = document.getElementById('code-group-name').value.trim();

        if (!groupCode || !groupName) {
            await showWarning('그룹코드와 그룹명은 필수입니다.');
            return;
        }

        const formData = {
            groupCode: groupCode,
            groupName: groupName,
            description: document.getElementById('code-group-description').value.trim() || null,
            useYn: document.getElementById('code-group-status').value
        };

        if (isCodeGroupEditMode) {
            updateCodeGroup(editingCodeGroupIdx, formData);
        } else {
            createCodeGroup(formData);
        }
    });

    // Create code group
    async function createCodeGroup(data) {
        fetch('/api/code-groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('그룹코드 생성 실패');
            }
            return response.json();
        })
        .then(async () => {
            await showSuccess('그룹코드가 성공적으로 등록되었습니다.');
            closeModal(codeGroupModal);
            loadCodeGroups();
        })
        .catch(async error => {
            console.error('그룹코드 생성 실패:', error);
            await showError('그룹코드 등록에 실패했습니다. 이미 존재하는 코드일 수 있습니다.');
        });
    }

    // Update code group
    async function updateCodeGroup(idx, data) {
        fetch(`/api/code-groups/${idx}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('그룹코드 수정 실패');
            }
            return response.json();
        })
        .then(async () => {
            await showSuccess('그룹코드가 성공적으로 수정되었습니다.');
            closeModal(codeGroupModal);
            loadCodeGroups();
        })
        .catch(async error => {
            console.error('그룹코드 수정 실패:', error);
            await showError('그룹코드 수정에 실패했습니다.');
        });
    }

    // Fill form with code group data
    function fillCodeGroupForm(group) {
        document.getElementById('code-group-idx').value = group.idx;
        document.getElementById('code-group-code').value = group.groupCode;
        document.getElementById('code-group-name').value = group.groupName;
        document.getElementById('code-group-description').value = group.description || '';
        document.getElementById('code-group-status').value = group.useYn;
    }

    // Clear code group form
    function clearCodeGroupForm() {
        document.getElementById('code-group-idx').value = '';
        document.getElementById('code-group-code').value = '';
        document.getElementById('code-group-name').value = '';
        document.getElementById('code-group-description').value = '';
        document.getElementById('code-group-status').value = 'Y';
    }

    // Get next suggested group code
    function getNextGroupCode() {
        if (currentCodeGroups.length === 0) {
            return 'C01';
        }

        // Extract numeric parts from codes like C01, C02, C08, etc.
        const numericCodes = currentCodeGroups
            .map(cg => cg.groupCode)
            .filter(code => /^C\d+$/.test(code))
            .map(code => parseInt(code.substring(1)));

        if (numericCodes.length === 0) {
            return 'C01';
        }

        const maxNum = Math.max(...numericCodes);
        const nextNum = maxNum + 1;
        return 'C' + String(nextNum).padStart(2, '0');
    }

    // ===========================
    // Logo Upload
    // ===========================
    const logoFileInput = document.getElementById('logo-file-input');
    const logoUploadBtn = document.getElementById('logo-upload-btn');
    const logoSaveBtn = document.getElementById('logo-save-btn');
    const logoResetBtn = document.getElementById('logo-reset-btn');
    const logoImage = document.getElementById('logo-image');

    if (logoUploadBtn) {
        logoUploadBtn.addEventListener('click', () => {
            logoFileInput.click();
        });
    }

    if (logoFileInput) {
        logoFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                // Validate file size (2MB max)
                if (file.size > 2 * 1024 * 1024) {
                    await showWarning('파일 크기는 2MB를 초과할 수 없습니다.');
                    return;
                }

                // Validate file type
                if (!file.type.match('image/(png|jpeg|svg\\+xml)')) {
                    await showWarning('PNG, JPG, SVG 파일만 업로드 가능합니다.');
                    return;
                }

                // Preview image
                const reader = new FileReader();
                reader.onload = (e) => {
                    logoImage.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (logoSaveBtn) {
        logoSaveBtn.addEventListener('click', async () => {
            // TODO: Implement logo save logic (upload to server)
            await showSuccess('로고가 저장되었습니다.');
        });
    }

    if (logoResetBtn) {
        logoResetBtn.addEventListener('click', async () => {
            const confirmed = await showConfirm('로고를 초기화하시겠습니까?');
            if (confirmed) {
                logoImage.src = '/images/logo-placeholder.png';
                logoFileInput.value = '';
            }
        });
    }

    // ===========================
    // Expense Settings - Load & Save
    // ===========================
    const saveExpensesBtn = document.getElementById('save-expenses-btn');

    // Load expense policies from API
    function loadExpensePolicies() {
        // First, load active ranks (C02)
        fetch('/api/codes?groupCode=C02&activeOnly=true')
            .then(response => response.json())
            .then(ranks => {
                if (ranks.length === 0) {
                    document.getElementById('expenses-tbody').innerHTML = `
                        <tr>
                            <td colspan="9" style="text-align: center; padding: 40px;">
                                <i class="fas fa-inbox" style="font-size: 48px; color: #ccc; display: block; margin-bottom: 10px;"></i>
                                <p style="color: #999;">등록된 직급이 없습니다. 직급 관리에서 직급을 먼저 등록해주세요.</p>
                            </td>
                        </tr>
                    `;
                    return;
                }

                // Load expense policies
                return fetch('/api/fixed-expense-policies')
                    .then(response => response.json())
                    .then(policies => {
                        renderExpenseTable(ranks, policies);
                    });
            })
            .catch(error => {
                console.error('직급별 고정경비 조회 실패:', error);
                showError('직급별 고정경비를 불러오는데 실패했습니다.');
            });
    }

    // Render expense table
    function renderExpenseTable(ranks, policies) {
        const tbody = document.getElementById('expenses-tbody');

        // 새로운 구조: 각 직급 + 경비 항목 조합을 맵으로 저장
        const policyMap = {};
        policies.forEach(policy => {
            const key = `${policy.positionCode}_${policy.expenseItemName}`;
            policyMap[key] = policy.amount || 0;
        });

        // 경비 항목 목록 정의
        const expenseItems = [
            { field: 'lunchAllowance', name: '중식비' },
            { field: 'nightMealAllowance', name: '야근석식대' },
            { field: 'businessMealAllowance', name: '회의비' },
            { field: 'businessTripAllowance', name: '출장비' },
            { field: 'transitAllowance', name: '교통비' },
            { field: 'fuelAllowance', name: '유류비' },
            { field: 'holidayExpense', name: '휴일근무수당' },
            { field: 'beverageExpense', name: '음료비' }
        ];
        tbody.innerHTML = ranks.map(rank => {
            return `
                <tr data-position-code="${rank.code}">
                    <td class="position-cell">${rank.codeName}</td>
                    ${expenseItems.map(item => {
                        const key = `${rank.code}_${item.name}`;
                        const value = policyMap[key] || 0;
                        return `<td><input type="number" class="expense-input" data-field="${item.field}" data-item-name="${item.name}" value="${value}" min="0" step="1000"></td>`;
                    }).join('')}
                </tr>
            `;
        }).join('');
    }

    // Save expense policies
    if (saveExpensesBtn) {
        saveExpensesBtn.addEventListener('click', () => {
            const expenseData = [];
            const rows = document.querySelectorAll('#expenses-tbody tr');

            rows.forEach(row => {
                const positionCode = row.getAttribute('data-position-code');
                if (!positionCode) return;

                const inputs = row.querySelectorAll('.expense-input');

                // 새로운 구조: 각 경비 항목을 별도의 레코드로 저장
                inputs.forEach(input => {
                    const itemName = input.getAttribute('data-item-name');
                    const amount = parseInt(input.value) || 0;

                    expenseData.push({
                        positionCode: positionCode,
                        expenseItemName: itemName,
                        amount: amount
                    });
                });
            });

            console.log('Expense data to save:', expenseData);

            // Save to server
            fetch('/api/fixed-expense-policies/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(expenseData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('고정경비 저장 실패');
                }
                return response.json();
            })
            .then(result => {
                await showSuccess(`직급별 고정경비가 성공적으로 저장되었습니다.\n저장된 항목: ${result.count}개`);
                loadExpensePolicies(); // Reload to reflect changes
            })
            .catch(error => {
                console.error('고정경비 저장 실패:', error);
                await showError('고정경비 저장에 실패했습니다.');
            });
        });
    }

    // ===========================
    // Other Settings - Save All
    // ===========================
    const saveAllBtn = document.querySelector('.btn-save-all');

    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', async () => {
            // TODO: Implement save logic for all settings
            await showSuccess('설정이 저장되었습니다.');
        });
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
            closeModal(codeGroupModal);
        });
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === codeGroupModal) {
            closeModal(codeGroupModal);
        }
    });
});
