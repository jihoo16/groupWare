document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소
    const addPersonBtn = document.getElementById('addPersonBtn');
    const personModal = document.getElementById('personModal');
    const personForm = document.getElementById('personForm');
    const saveBtn = document.getElementById('saveBtn');
    const personSearch = document.getElementById('personSearch');
    const personTableBody = document.getElementById('personTableBody');
    const modalTitle = document.getElementById('modalTitle');

    // 통계 요소
    const totalCount = document.getElementById('totalCount');
    const companyCount = document.getElementById('companyCount');

    // Mock 데이터 (실제로는 서버에서 가져옴)
    let externalPersons = [
        { idx: 1, companyName: '(주)테크솔루션', position: '부장', name: '김철수' },
        { idx: 2, companyName: '글로벌시스템즈', position: '차장', name: '이영희' },
        { idx: 3, companyName: '(주)테크솔루션', position: '과장', name: '박민수' },
        { idx: 4, companyName: '스마트코리아', position: '이사', name: '정수진' },
        { idx: 5, companyName: '디지털웨이브', position: '부장', name: '최동욱' }
    ];

    let editMode = false;
    let currentIdx = null;

    // 초기 로드
    loadTable();
    updateStats();

    // 외부인원 등록 버튼 클릭
    addPersonBtn.addEventListener('click', function() {
        editMode = false;
        currentIdx = null;
        modalTitle.textContent = '외부인원 등록';
        personForm.reset();
        personModal.classList.add('show');
    });

    // 저장 버튼 클릭
    saveBtn.addEventListener('click', function() {
        const companyName = document.getElementById('companyName').value.trim();
        const position = document.getElementById('position').value.trim();
        const personName = document.getElementById('personName').value.trim();

        // 유효성 검사
        if (!companyName) {
            alert('소속회사를 입력하세요.');
            return;
        }
        if (!position) {
            alert('직급을 입력하세요.');
            return;
        }
        if (!personName) {
            alert('이름을 입력하세요.');
            return;
        }

        if (editMode) {
            // 수정
            const person = externalPersons.find(p => p.idx === currentIdx);
            if (person) {
                person.companyName = companyName;
                person.position = position;
                person.name = personName;
                alert('수정되었습니다.');
            }
        } else {
            // 등록
            const newIdx = externalPersons.length > 0
                ? Math.max(...externalPersons.map(p => p.idx)) + 1
                : 1;

            externalPersons.push({
                idx: newIdx,
                companyName: companyName,
                position: position,
                name: personName
            });
            alert('등록되었습니다.');
        }

        closeModal();
        loadTable();
        updateStats();
    });

    // 검색
    personSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const rows = personTableBody.querySelectorAll('tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });

    // 테이블 로드
    function loadTable() {
        personTableBody.innerHTML = '';

        if (externalPersons.length === 0) {
            personTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <i class="fas fa-user-friends"></i>
                        <p>등록된 외부인원이 없습니다.</p>
                    </td>
                </tr>
            `;
            return;
        }

        externalPersons.forEach((person, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${person.companyName}</td>
                <td>${person.position}</td>
                <td>${person.name}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn-edit" onclick="editPerson(${person.idx})">
                            <i class="fas fa-edit"></i> 수정
                        </button>
                        <button class="btn-delete" onclick="deletePerson(${person.idx})">
                            <i class="fas fa-trash"></i> 삭제
                        </button>
                    </div>
                </td>
            `;
            personTableBody.appendChild(row);
        });
    }

    // 통계 업데이트
    function updateStats() {
        totalCount.textContent = externalPersons.length;

        // 고유 회사 수 계산
        const uniqueCompanies = new Set(externalPersons.map(p => p.companyName));
        companyCount.textContent = uniqueCompanies.size;
    }

    // 수정
    window.editPerson = function(idx) {
        const person = externalPersons.find(p => p.idx === idx);
        if (!person) return;

        editMode = true;
        currentIdx = idx;
        modalTitle.textContent = '외부인원 수정';

        document.getElementById('companyName').value = person.companyName;
        document.getElementById('position').value = person.position;
        document.getElementById('personName').value = person.name;

        personModal.classList.add('show');
    };

    // 삭제
    window.deletePerson = function(idx) {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        const index = externalPersons.findIndex(p => p.idx === idx);
        if (index > -1) {
            externalPersons.splice(index, 1);
            alert('삭제되었습니다.');
            loadTable();
            updateStats();
        }
    };

    // 모달 닫기
    window.closeModal = function() {
        personModal.classList.remove('show');
        personForm.reset();
        editMode = false;
        currentIdx = null;
    };

    // 모달 외부 클릭 시 닫기
    personModal.addEventListener('click', function(e) {
        if (e.target === personModal) {
            closeModal();
        }
    });
});
