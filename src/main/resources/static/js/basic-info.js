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
        });
    });

    // ===========================
    // Position Modal
    // ===========================
    const positionModal = document.getElementById('position-modal');
    const addPositionBtn = document.getElementById('add-position-btn');
    const positionModalTitle = document.getElementById('position-modal-title');
    const positionSaveBtn = document.getElementById('position-save-btn');
    let editingPositionRow = null;

    // Open modal for adding new position
    addPositionBtn.addEventListener('click', () => {
        positionModalTitle.textContent = '직급 추가';
        clearPositionForm();
        editingPositionRow = null;
        openModal(positionModal);
    });

    // Edit position
    document.getElementById('positions-tbody').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit')) {
            const row = e.target.closest('tr');
            editingPositionRow = row;
            positionModalTitle.textContent = '직급 수정';

            // Populate form with row data
            const cells = row.cells;
            document.getElementById('position-order').value = cells[0].textContent;
            document.getElementById('position-name').value = cells[1].textContent;
            document.getElementById('position-code').value = cells[2].textContent;
            document.getElementById('position-salary-grade').value = cells[3].textContent;
            document.getElementById('position-status').value =
                cells[4].textContent.includes('사용') ? 'active' : 'inactive';

            openModal(positionModal);
        }

        // Delete position
        if (e.target.classList.contains('btn-delete')) {
            if (confirm('정말 삭제하시겠습니까?')) {
                e.target.closest('tr').remove();
                reorderTableRows('positions-tbody');
            }
        }
    });

    // Save position
    positionSaveBtn.addEventListener('click', () => {
        const name = document.getElementById('position-name').value.trim();
        const code = document.getElementById('position-code').value.trim();
        const salaryGrade = document.getElementById('position-salary-grade').value.trim();
        const order = document.getElementById('position-order').value;
        const status = document.getElementById('position-status').value;

        if (!name || !code) {
            alert('직급명과 직급코드는 필수입니다.');
            return;
        }

        if (editingPositionRow) {
            // Update existing row
            const cells = editingPositionRow.cells;
            cells[0].textContent = order;
            cells[1].textContent = name;
            cells[2].textContent = code;
            cells[3].textContent = salaryGrade;
            cells[4].innerHTML = status === 'active'
                ? '<span class="status-active">사용</span>'
                : '<span class="status-inactive">미사용</span>';
        } else {
            // Add new row
            const tbody = document.getElementById('positions-tbody');
            const newRow = tbody.insertRow();
            newRow.innerHTML = `
                <td>${order}</td>
                <td>${name}</td>
                <td>${code}</td>
                <td>${salaryGrade}</td>
                <td>${status === 'active'
                    ? '<span class="status-active">사용</span>'
                    : '<span class="status-inactive">미사용</span>'}</td>
                <td>
                    <button class="btn-sm btn-edit">수정</button>
                    <button class="btn-sm btn-delete">삭제</button>
                </td>
            `;
        }

        reorderTableRows('positions-tbody');
        closeModal(positionModal);
    });

    // ===========================
    // Department Modal
    // ===========================
    const departmentModal = document.getElementById('department-modal');
    const addDepartmentBtn = document.getElementById('add-department-btn');
    const departmentModalTitle = document.getElementById('department-modal-title');
    const departmentSaveBtn = document.getElementById('department-save-btn');
    let editingDepartmentRow = null;

    // Open modal for adding new department
    addDepartmentBtn.addEventListener('click', () => {
        departmentModalTitle.textContent = '소속 추가';
        clearDepartmentForm();
        editingDepartmentRow = null;
        openModal(departmentModal);
    });

    // Edit department
    document.getElementById('departments-tbody').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit')) {
            const row = e.target.closest('tr');
            editingDepartmentRow = row;
            departmentModalTitle.textContent = '소속 수정';

            // Populate form with row data
            const cells = row.cells;
            document.getElementById('department-order').value = cells[0].textContent;
            document.getElementById('department-name').value = cells[1].textContent;
            document.getElementById('department-code').value = cells[2].textContent;

            // Set parent department
            const parentText = cells[3].textContent;
            const parentSelect = document.getElementById('department-parent');
            for (let option of parentSelect.options) {
                if (option.textContent === parentText || (parentText === '-' && option.value === '')) {
                    option.selected = true;
                    break;
                }
            }

            document.getElementById('department-status').value =
                cells[4].textContent.includes('사용') ? 'active' : 'inactive';

            openModal(departmentModal);
        }

        // Delete department
        if (e.target.classList.contains('btn-delete')) {
            if (confirm('정말 삭제하시겠습니까?')) {
                e.target.closest('tr').remove();
                reorderTableRows('departments-tbody');
            }
        }
    });

    // Save department
    departmentSaveBtn.addEventListener('click', () => {
        const name = document.getElementById('department-name').value.trim();
        const code = document.getElementById('department-code').value.trim();
        const parentValue = document.getElementById('department-parent').value;
        const parentText = document.getElementById('department-parent').selectedOptions[0].textContent;
        const order = document.getElementById('department-order').value;
        const status = document.getElementById('department-status').value;

        if (!name || !code) {
            alert('소속명과 소속코드는 필수입니다.');
            return;
        }

        const parentDisplay = parentValue ? parentText : '-';

        if (editingDepartmentRow) {
            // Update existing row
            const cells = editingDepartmentRow.cells;
            cells[0].textContent = order;
            cells[1].textContent = name;
            cells[2].textContent = code;
            cells[3].textContent = parentDisplay;
            cells[4].innerHTML = status === 'active'
                ? '<span class="status-active">사용</span>'
                : '<span class="status-inactive">미사용</span>';
        } else {
            // Add new row
            const tbody = document.getElementById('departments-tbody');
            const newRow = tbody.insertRow();
            newRow.innerHTML = `
                <td>${order}</td>
                <td>${name}</td>
                <td>${code}</td>
                <td>${parentDisplay}</td>
                <td>${status === 'active'
                    ? '<span class="status-active">사용</span>'
                    : '<span class="status-inactive">미사용</span>'}</td>
                <td>
                    <button class="btn-sm btn-edit">수정</button>
                    <button class="btn-sm btn-delete">삭제</button>
                </td>
            `;
        }

        reorderTableRows('departments-tbody');
        closeModal(departmentModal);
    });

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
        document.getElementById('position-name').value = '';
        document.getElementById('position-code').value = '';
        document.getElementById('position-salary-grade').value = '';
        document.getElementById('position-order').value = '1';
        document.getElementById('position-status').value = 'active';
    }

    function clearDepartmentForm() {
        document.getElementById('department-name').value = '';
        document.getElementById('department-code').value = '';
        document.getElementById('department-parent').value = '';
        document.getElementById('department-order').value = '1';
        document.getElementById('department-status').value = 'active';
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
