// SearchUtils 초기화
const searchUtils = new SearchUtils();

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

    // 데이터 저장
    let externalPersons = [];
    let currentSearchKeyword = ''; // 현재 검색어

    let editMode = false;
    let currentIdx = null;

    // 초기 로드
    loadExternalPersons();

    // 외부인원 등록 버튼 클릭
    addPersonBtn.addEventListener('click', function() {
        editMode = false;
        currentIdx = null;
        modalTitle.textContent = '외부인원 등록';
        personForm.reset();
        personModal.classList.add('show');
    });

    // 저장 버튼 클릭
    saveBtn.addEventListener('click', async function() {
        const companyName = document.getElementById('companyName').value.trim();
        const position = document.getElementById('position').value.trim();
        const personName = document.getElementById('personName').value.trim();

        // 유효성 검사
        if (!companyName) {
            showWarning('소속회사를 입력하세요.');
            return;
        }
        if (!position) {
            showWarning('직급을 입력하세요.');
            return;
        }
        if (!personName) {
            showWarning('이름을 입력하세요.');
            return;
        }

        const data = {
            companyName: companyName,
            position: position,
            name: personName
        };

        try {
            if (editMode) {
                // 수정
                await updatePerson(currentIdx, data);
                await showSuccess('수정되었습니다.');
            } else {
                // 등록
                await createPerson(data);
                await showSuccess('등록되었습니다.');
            }

            closeModal();
            loadExternalPersons();
        } catch (error) {
            showError('저장 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.');
            console.error(error);
        }
    });

    // 검색 (SearchUtils 사용 - 초성 검색 지원)
    personSearch.addEventListener('input', function() {
        const searchTerm = this.value.trim();
        currentSearchKeyword = searchTerm;

        if (!searchTerm) {
            // 검색어가 없으면 전체 목록 다시 렌더링
            loadTable();
            return;
        }

        // 필터링된 인원 목록 렌더링
        const filtered = externalPersons.filter(person =>
            searchUtils.matchesObject(
                person,
                searchTerm,
                ['companyName', 'position', 'name']
            )
        );

        renderFilteredTable(filtered);
    });

    // 테이블 로드 (SearchUtils 하이라이트 적용)
    function loadTable() {
        currentSearchKeyword = ''; // 검색어 초기화
        renderFilteredTable(externalPersons);
    }

    // 필터링된 테이블 렌더링
    function renderFilteredTable(persons) {
        personTableBody.innerHTML = '';

        if (persons.length === 0) {
            personTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <i class="fas fa-user-friends"></i>
                        <p>${currentSearchKeyword ? '검색 결과가 없습니다.' : '등록된 외부인원이 없습니다.'}</p>
                    </td>
                </tr>
            `;
            return;
        }

        persons.forEach((person, index) => {
            // 하이라이트 적용
            const companyName = currentSearchKeyword ?
                searchUtils.highlightText(person.companyName || '', currentSearchKeyword) :
                (person.companyName || '');

            const position = currentSearchKeyword ?
                searchUtils.highlightText(person.position || '', currentSearchKeyword) :
                (person.position || '');

            const name = currentSearchKeyword ?
                searchUtils.highlightText(person.name || '', currentSearchKeyword) :
                (person.name || '');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${companyName}</td>
                <td>${position}</td>
                <td>${name}</td>
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
    window.deletePerson = async function(idx) {
        if (!await showDeleteConfirm('정말 삭제하시겠습니까?')) return;

        try {
            await deletePersonApi(idx);
            await showSuccess('삭제되었습니다.');
            loadExternalPersons();
        } catch (error) {
            showError('삭제 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.');
            console.error(error);
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

    // ==================== API 호출 함수 ====================

    // 전체 외부인원 목록 조회
    async function loadExternalPersons() {
        try {
            const response = await fetch('/api/external-persons');
            if (!response.ok) throw new Error('Failed to fetch external persons');

            externalPersons = await response.json();
            loadTable();
            updateStats();
        } catch (error) {
            console.error('외부인원 목록 조회 실패:', error);
            showError('외부인원 목록을 불러오는데 실패했습니다.');
        }
    }

    // 외부인원 등록
    async function createPerson(data) {
        const response = await fetch('/api/external-persons', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Failed to create external person');
        }

        return await response.json();
    }

    // 외부인원 수정
    async function updatePerson(idx, data) {
        const response = await fetch(`/api/external-persons/${idx}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Failed to update external person');
        }

        return await response.json();
    }

    // 외부인원 삭제
    async function deletePersonApi(idx) {
        const response = await fetch(`/api/external-persons/${idx}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete external person');
        }
    }
});
