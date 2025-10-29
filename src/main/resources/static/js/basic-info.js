document.addEventListener('DOMContentLoaded', function() {
    // ===========================
    // Global Variables
    // ===========================
    let currentSubTab = 'rank'; // rank(C02) or position(C08)
    let currentGroupCode = 'C02';
    let isEditMode = false;
    let editingCodeIdx = null;

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

            // Load data if positions tab
            if (tabName === 'positions') {
                loadCodes(currentGroupCode);
            }
        });
    });

    // ===========================
    // Sub-Tab Switching (Position/Rank)
    // ===========================
    const subTabButtons = document.querySelectorAll('.sub-tab-button');
    const subTabContents = document.querySelectorAll('.sub-tab-content');

    subTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const subTab = button.getAttribute('data-subtab');
            currentSubTab = subTab;
            currentGroupCode = (subTab === 'rank') ? 'C02' : 'C08';

            // Remove active class from all sub-tabs
            subTabButtons.forEach(btn => btn.classList.remove('active'));
            subTabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked sub-tab
            button.classList.add('active');
            document.getElementById(`${subTab}-subtab`).classList.add('active');

            // Load codes for the selected sub-tab
            loadCodes(currentGroupCode);
        });
    });

    // ===========================
    // Load Codes from API
    // ===========================
    function loadCodes(groupCode) {
        fetch(`/api/codes?groupCode=${groupCode}`)
            .then(response => response.json())
            .then(data => {
                renderCodeTable(data);
            })
            .catch(error => {
                console.error('코드 목록 조회 실패:', error);
                alert('코드 목록을 불러오는데 실패했습니다.');
            });
    }

    // ===========================
    // Render Code Table
    // ===========================
    function renderCodeTable(codes) {
        const tbodyId = currentSubTab === 'rank' ? 'rank-tbody' : 'position-tbody';
        const tbody = document.getElementById(tbodyId);

        if (codes.length === 0) {
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
    loadCodes(currentGroupCode);

    // ===========================
    // Position/Rank Modal
    // ===========================
    const positionModal = document.getElementById('position-modal');
    const addPositionBtn = document.getElementById('add-position-btn');
    const positionModalTitle = document.getElementById('position-modal-title');
    const positionSaveBtn = document.getElementById('position-save-btn');

    // Open modal for adding new code
    addPositionBtn.addEventListener('click', () => {
        const codeType = currentGroupCode === 'C02' ? '직급' : '직위';
        positionModalTitle.textContent = `${codeType} 추가`;
        clearPositionForm();
        isEditMode = false;
        editingCodeIdx = null;
        document.getElementById('position-group-code').value = currentGroupCode;
        document.getElementById('position-code').disabled = false;
        openModal(positionModal);
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
    function editCode(idx) {
        fetch(`/api/codes/${idx}`)
            .then(response => response.json())
            .then(code => {
                const codeType = code.groupCode === 'C02' ? '직급' : '직위';
                positionModalTitle.textContent = `${codeType} 수정`;
                isEditMode = true;
                editingCodeIdx = idx;
                fillPositionForm(code);
                document.getElementById('position-code').disabled = true; // 수정 시 코드 변경 불가
                openModal(positionModal);
            })
            .catch(error => {
                console.error('코드 조회 실패:', error);
                alert('코드 정보를 불러오는데 실패했습니다.');
            });
    }

    // Delete code
    function deleteCode(idx) {
        if (!confirm('정말 삭제하시겠습니까?')) {
            return;
        }

        fetch(`/api/codes/${idx}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('코드 삭제 실패');
            }
            alert('코드가 성공적으로 삭제되었습니다.');
            loadCodes(currentGroupCode);
        })
        .catch(error => {
            console.error('코드 삭제 실패:', error);
            alert('코드 삭제에 실패했습니다.');
        });
    }

    // Save code
    positionSaveBtn.addEventListener('click', () => {
        const code = document.getElementById('position-code').value.trim();
        const codeName = document.getElementById('position-name').value.trim();

        if (!code || !codeName) {
            alert('코드와 코드명은 필수입니다.');
            return;
        }

        const formData = {
            groupCode: document.getElementById('position-group-code').value,
            code: code,
            codeName: codeName,
            codeNameEn: document.getElementById('position-name-en').value.trim() || null,
            description: document.getElementById('position-description').value.trim() || null,
            useYn: document.getElementById('position-status').value,
            sortOrder: parseInt(document.getElementById('position-order').value) || 0
        };

        if (isEditMode) {
            updateCode(editingCodeIdx, formData);
        } else {
            createCode(formData);
        }
    });

    // Create code
    function createCode(data) {
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
        .then(() => {
            alert('코드가 성공적으로 등록되었습니다.');
            closeModal(positionModal);
            loadCodes(currentGroupCode);
        })
        .catch(error => {
            console.error('코드 생성 실패:', error);
            alert('코드 등록에 실패했습니다. 이미 존재하는 코드일 수 있습니다.');
        });
    }

    // Update code
    function updateCode(idx, data) {
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
        .then(() => {
            alert('코드가 성공적으로 수정되었습니다.');
            closeModal(positionModal);
            loadCodes(currentGroupCode);
        })
        .catch(error => {
            console.error('코드 수정 실패:', error);
            alert('코드 수정에 실패했습니다.');
        });
    }

    // Fill form with code data
    function fillPositionForm(code) {
        document.getElementById('position-idx').value = code.idx;
        document.getElementById('position-group-code').value = code.groupCode;
        document.getElementById('position-code').value = code.code;
        document.getElementById('position-name').value = code.codeName;
        document.getElementById('position-name-en').value = code.codeNameEn || '';
        document.getElementById('position-description').value = code.description || '';
        document.getElementById('position-order').value = code.sortOrder || 0;
        document.getElementById('position-status').value = code.useYn;
    }

    // ===========================
    // Department Modal (C01)
    // ===========================
    const departmentModal = document.getElementById('department-modal');
    const addDepartmentBtn = document.getElementById('add-department-btn');
    const departmentModalTitle = document.getElementById('department-modal-title');
    const departmentSaveBtn = document.getElementById('department-save-btn');
    let isDepartmentEditMode = false;
    let editingDepartmentIdx = null;

    // Load departments when departments tab is clicked
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (button.getAttribute('data-tab') === 'departments') {
                loadDepartments();
            }
        });
    });

    // Load departments from API
    function loadDepartments() {
        fetch('/api/codes?groupCode=C01')
            .then(response => response.json())
            .then(data => {
                renderDepartmentTable(data);
            })
            .catch(error => {
                console.error('소속 목록 조회 실패:', error);
                alert('소속 목록을 불러오는데 실패했습니다.');
            });
    }

    // Render department table
    function renderDepartmentTable(departments) {
        const tbody = document.getElementById('departments-tbody');

        if (departments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-inbox" style="font-size: 48px; color: #ccc; display: block; margin-bottom: 10px;"></i>
                        <p style="color: #999;">등록된 소속이 없습니다.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = departments.map(dept => `
            <tr data-idx="${dept.idx}">
                <td>${dept.sortOrder || 0}</td>
                <td>${dept.code}</td>
                <td>${dept.codeName}</td>
                <td>${dept.codeNameEn || '-'}</td>
                <td>${dept.description || '-'}</td>
                <td>
                    <span class="status-${dept.useYn === 'Y' ? 'active' : 'inactive'}">
                        ${dept.useYn === 'Y' ? '사용' : '미사용'}
                    </span>
                </td>
                <td>
                    <button class="btn-sm btn-edit" data-idx="${dept.idx}" data-type="department">수정</button>
                    <button class="btn-sm btn-delete" data-idx="${dept.idx}" data-type="department">삭제</button>
                </td>
            </tr>
        `).join('');
    }

    // Open modal for adding new department
    addDepartmentBtn.addEventListener('click', () => {
        departmentModalTitle.textContent = '소속 추가';
        clearDepartmentForm();
        isDepartmentEditMode = false;
        editingDepartmentIdx = null;
        document.getElementById('department-code').disabled = false;
        openModal(departmentModal);
    });

    // Edit/Delete department
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit') && e.target.getAttribute('data-type') === 'department') {
            const idx = e.target.getAttribute('data-idx');
            if (!idx) return;
            editDepartment(idx);
        }

        if (e.target.classList.contains('btn-delete') && e.target.getAttribute('data-type') === 'department') {
            const idx = e.target.getAttribute('data-idx');
            if (!idx) return;
            deleteDepartment(idx);
        }
    });

    // Edit department
    function editDepartment(idx) {
        fetch(`/api/codes/${idx}`)
            .then(response => response.json())
            .then(dept => {
                departmentModalTitle.textContent = '소속 수정';
                isDepartmentEditMode = true;
                editingDepartmentIdx = idx;
                fillDepartmentForm(dept);
                document.getElementById('department-code').disabled = true; // 수정 시 코드 변경 불가
                openModal(departmentModal);
            })
            .catch(error => {
                console.error('소속 조회 실패:', error);
                alert('소속 정보를 불러오는데 실패했습니다.');
            });
    }

    // Delete department
    function deleteDepartment(idx) {
        if (!confirm('정말 삭제하시겠습니까?')) {
            return;
        }

        fetch(`/api/codes/${idx}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('소속 삭제 실패');
            }
            alert('소속이 성공적으로 삭제되었습니다.');
            loadDepartments();
        })
        .catch(error => {
            console.error('소속 삭제 실패:', error);
            alert('소속 삭제에 실패했습니다.');
        });
    }

    // Save department
    departmentSaveBtn.addEventListener('click', () => {
        const code = document.getElementById('department-code').value.trim();
        const codeName = document.getElementById('department-name').value.trim();

        if (!code || !codeName) {
            alert('코드와 소속명은 필수입니다.');
            return;
        }

        const formData = {
            groupCode: 'C01',
            code: code,
            codeName: codeName,
            codeNameEn: document.getElementById('department-name-en').value.trim() || null,
            description: document.getElementById('department-description').value.trim() || null,
            useYn: document.getElementById('department-status').value,
            sortOrder: parseInt(document.getElementById('department-order').value) || 0
        };

        if (isDepartmentEditMode) {
            updateDepartment(editingDepartmentIdx, formData);
        } else {
            createDepartment(formData);
        }
    });

    // Create department
    function createDepartment(data) {
        fetch('/api/codes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('소속 생성 실패');
            }
            return response.json();
        })
        .then(() => {
            alert('소속이 성공적으로 등록되었습니다.');
            closeModal(departmentModal);
            loadDepartments();
        })
        .catch(error => {
            console.error('소속 생성 실패:', error);
            alert('소속 등록에 실패했습니다. 이미 존재하는 코드일 수 있습니다.');
        });
    }

    // Update department
    function updateDepartment(idx, data) {
        fetch(`/api/codes/${idx}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('소속 수정 실패');
            }
            return response.json();
        })
        .then(() => {
            alert('소속이 성공적으로 수정되었습니다.');
            closeModal(departmentModal);
            loadDepartments();
        })
        .catch(error => {
            console.error('소속 수정 실패:', error);
            alert('소속 수정에 실패했습니다.');
        });
    }

    // Fill form with department data
    function fillDepartmentForm(dept) {
        document.getElementById('department-idx').value = dept.idx;
        document.getElementById('department-code').value = dept.code;
        document.getElementById('department-name').value = dept.codeName;
        document.getElementById('department-name-en').value = dept.codeNameEn || '';
        document.getElementById('department-description').value = dept.description || '';
        document.getElementById('department-order').value = dept.sortOrder || 0;
        document.getElementById('department-status').value = dept.useYn;
    }

    // ===========================
    // Logo Upload
    // ===========================
    const logoFileInput = document.getElementById('logo-file-input');
    const logoUploadBtn = document.getElementById('logo-upload-btn');
    const logoSaveBtn = document.getElementById('logo-save-btn');
    const logoResetBtn = document.getElementById('logo-reset-btn');
    const logoImage = document.getElementById('logo-image');

    logoUploadBtn.addEventListener('click', () => {
        logoFileInput.click();
    });

    logoFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (2MB max)
            if (file.size > 2 * 1024 * 1024) {
                alert('파일 크기는 2MB를 초과할 수 없습니다.');
                return;
            }

            // Validate file type
            if (!file.type.match('image/(png|jpeg|svg\\+xml)')) {
                alert('PNG, JPG, SVG 파일만 업로드 가능합니다.');
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

    logoSaveBtn.addEventListener('click', () => {
        // TODO: Implement logo save logic (upload to server)
        alert('로고가 저장되었습니다.');
    });

    logoResetBtn.addEventListener('click', () => {
        if (confirm('로고를 초기화하시겠습니까?')) {
            logoImage.src = '/images/logo-placeholder.png';
            logoFileInput.value = '';
        }
    });

    // ===========================
    // Expense Settings - Save
    // ===========================
    const saveExpensesBtn = document.getElementById('save-expenses-btn');

    saveExpensesBtn.addEventListener('click', () => {
        const expenseData = [];
        const rows = document.querySelectorAll('#expenses-tbody tr');

        rows.forEach(row => {
            const position = row.getAttribute('data-position');
            const inputs = row.querySelectorAll('.expense-input');
            const values = Array.from(inputs).map(input => parseInt(input.value) || 0);

            expenseData.push({
                position: position,
                businessTrip: {
                    accommodation: values[0],
                    meal: values[1],
                    transportation: values[2]
                },
                meeting: {
                    meal: values[3],
                    snack: values[4]
                },
                fuel: {
                    monthly: values[5],
                    perTrip: values[6]
                },
                other: {
                    condolence: values[7],
                    overtime: values[8]
                }
            });
        });

        console.log('Expense data to save:', expenseData);
        // TODO: Implement server-side save logic

        // Format numbers with comma separator for display
        const formatNumber = (num) => num.toLocaleString('ko-KR');

        let summary = '직급별 고정경비 설정이 저장되었습니다.\n\n';
        expenseData.forEach(data => {
            summary += `[${data.position}]\n`;
            summary += `출장비: 숙박 ${formatNumber(data.businessTrip.accommodation)}원 / `;
            summary += `식비 ${formatNumber(data.businessTrip.meal)}원 / `;
            summary += `교통비 ${formatNumber(data.businessTrip.transportation)}원\n`;
            summary += `회의비: 식사 ${formatNumber(data.meeting.meal)}원 / `;
            summary += `간식 ${formatNumber(data.meeting.snack)}원\n`;
            summary += `유류비: 월 ${formatNumber(data.fuel.monthly)}원 / `;
            summary += `1회 ${formatNumber(data.fuel.perTrip)}원\n`;
            summary += `경조사비: ${formatNumber(data.other.condolence)}원 / `;
            summary += `야근식대: ${formatNumber(data.other.overtime)}원\n\n`;
        });

        alert(summary);
    });

    // Format expense inputs with thousand separator on blur
    document.querySelectorAll('.expense-input').forEach(input => {
        input.addEventListener('blur', (e) => {
            const value = parseInt(e.target.value) || 0;
            e.target.value = value;
        });

        // Allow only numbers
        input.addEventListener('keypress', (e) => {
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
            }
        });
    });

    // ===========================
    // Other Settings - Save All
    // ===========================
    const saveAllBtn = document.querySelector('.btn-save-all');

    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', () => {
            // TODO: Implement save logic for all settings
            alert('설정이 저장되었습니다.');
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

    function clearPositionForm() {
        document.getElementById('position-idx').value = '';
        document.getElementById('position-code').value = '';
        document.getElementById('position-name').value = '';
        document.getElementById('position-name-en').value = '';
        document.getElementById('position-description').value = '';
        document.getElementById('position-order').value = '0';
        document.getElementById('position-status').value = 'Y';
    }

    function clearDepartmentForm() {
        document.getElementById('department-idx').value = '';
        document.getElementById('department-code').value = '';
        document.getElementById('department-name').value = '';
        document.getElementById('department-name-en').value = '';
        document.getElementById('department-description').value = '';
        document.getElementById('department-order').value = '0';
        document.getElementById('department-status').value = 'Y';
    }

    function reorderTableRows(tbodyId) {
        const tbody = document.getElementById(tbodyId);
        const rows = Array.from(tbody.rows);

        rows.sort((a, b) => {
            const orderA = parseInt(a.cells[0].textContent);
            const orderB = parseInt(b.cells[0].textContent);
            return orderA - orderB;
        });

        // Re-append rows in sorted order
        rows.forEach(row => tbody.appendChild(row));
    }

    // Modal close button handlers
    document.querySelectorAll('.modal-close, .modal .btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(positionModal);
            closeModal(departmentModal);
        });
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === positionModal) {
            closeModal(positionModal);
        }
        if (e.target === departmentModal) {
            closeModal(departmentModal);
        }
    });
});
