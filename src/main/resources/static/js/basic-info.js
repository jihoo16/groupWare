document.addEventListener('DOMContentLoaded', function() {
    // ===========================
    // Tab Switching
    // ===========================
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');

            if (tabName === 'expenses') {
                loadExpensePolicies();
            }
        });
    });

    // ===========================
    // Expense Settings - Load & Save
    // ===========================
    const saveExpensesBtn = document.getElementById('save-expenses-btn');

    function loadExpensePolicies() {
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

    function renderExpenseTable(ranks, policies) {
        const tbody = document.getElementById('expenses-tbody');

        const policyMap = {};
        policies.forEach(policy => {
            const key = `${policy.positionCode}_${policy.expenseItemName}`;
            policyMap[key] = policy.amount || 0;
        });

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

    if (saveExpensesBtn) {
        saveExpensesBtn.addEventListener('click', () => {
            const expenseData = [];
            const rows = document.querySelectorAll('#expenses-tbody tr');

            rows.forEach(row => {
                const positionCode = row.getAttribute('data-position-code');
                if (!positionCode) return;

                row.querySelectorAll('.expense-input').forEach(input => {
                    expenseData.push({
                        positionCode: positionCode,
                        expenseItemName: input.getAttribute('data-item-name'),
                        amount: parseInt(input.value) || 0
                    });
                });
            });

            fetch('/api/fixed-expense-policies/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expenseData)
            })
            .then(response => {
                if (!response.ok) throw new Error('고정경비 저장 실패');
                return response.json();
            })
            .then(async result => {
                await showSuccess(`직급별 고정경비가 성공적으로 저장되었습니다.\n저장된 항목: ${result.count}개`);
                loadExpensePolicies();
            })
            .catch(async error => {
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
            await showSuccess('설정이 저장되었습니다.');
        });
    }

    // Initial load
    loadExpensePolicies();
});
