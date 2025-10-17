// 클라우드 스토리지 페이지 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // 요소 선택
    const fileGrid = document.getElementById('fileGrid');
    const fileList = document.getElementById('fileList');
    const fileListBody = document.getElementById('fileListBody');
    const viewBtns = document.querySelectorAll('.view-btn');
    const uploadBtn = document.getElementById('uploadBtn');
    const newFolderBtn = document.getElementById('newFolderBtn');
    const uploadModal = document.getElementById('uploadModal');
    const newFolderModal = document.getElementById('newFolderModal');
    const treeItems = document.querySelectorAll('.tree-item');
    const fileItems = document.querySelectorAll('.file-item');
    const selectedInfo = document.getElementById('selectedInfo');
    const selectedCount = document.getElementById('selectedCount');

    let currentView = 'grid';
    let selectedFiles = new Set();

    // ========== 보기 모드 전환 ==========
    viewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            currentView = view;

            viewBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            if (view === 'grid') {
                fileGrid.style.display = 'grid';
                fileList.style.display = 'none';
            } else {
                fileGrid.style.display = 'none';
                fileList.style.display = 'block';
                updateListView();
            }
        });
    });

    // ========== 목록 보기 업데이트 ==========
    function updateListView() {
        const items = fileGrid.querySelectorAll('.file-item');
        fileListBody.innerHTML = '';

        items.forEach(item => {
            const type = item.getAttribute('data-type');
            const name = item.getAttribute('data-name');
            const info = item.querySelector('.file-info').textContent;
            const [size, date] = info.split(' • ');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" class="file-checkbox-list"></td>
                <td>
                    <i class="fas ${getIconClass(type)}"></i>
                    ${name}
                </td>
                <td>${size || '-'}</td>
                <td>${date || '-'}</td>
                <td>
                    <button class="action-btn" title="다운로드">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="action-btn" title="공유">
                        <i class="fas fa-share-alt"></i>
                    </button>
                </td>
            `;
            fileListBody.appendChild(row);
        });
    }

    function getIconClass(type) {
        const icons = {
            'folder': 'fa-folder',
            'pdf': 'fa-file-pdf',
            'xlsx': 'fa-file-excel',
            'docx': 'fa-file-word',
            'pptx': 'fa-file-powerpoint',
            'image': 'fa-file-image',
            'zip': 'fa-file-archive'
        };
        return icons[type] || 'fa-file';
    }

    // ========== 폴더 트리 네비게이션 ==========
    treeItems.forEach(item => {
        item.addEventListener('click', function() {
            treeItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            const path = this.getAttribute('data-path');
            document.getElementById('currentPath').textContent = path === '/' ? '/ 홈' : path;

            console.log('폴더 이동:', path);
            // 실제로는 여기서 서버에서 해당 폴더의 파일 목록을 가져옵니다
        });
    });

    // ========== 파일 선택 ==========
    fileItems.forEach(item => {
        const checkbox = item.querySelector('.file-checkbox input');

        checkbox.addEventListener('change', function(e) {
            e.stopPropagation();
            const fileName = item.getAttribute('data-name');

            if (this.checked) {
                item.classList.add('selected');
                selectedFiles.add(fileName);
            } else {
                item.classList.remove('selected');
                selectedFiles.delete(fileName);
            }

            updateSelectedInfo();
        });

        item.addEventListener('dblclick', function() {
            const type = this.getAttribute('data-type');
            const name = this.getAttribute('data-name');

            if (type === 'folder') {
                console.log('폴더 열기:', name);
                // 실제로는 여기서 폴더를 열고 내용을 표시합니다
            } else {
                console.log('파일 미리보기:', name);
                // 실제로는 여기서 파일 미리보기나 다운로드를 수행합니다
            }
        });
    });

    function updateSelectedInfo() {
        if (selectedFiles.size > 0) {
            selectedInfo.style.display = 'flex';
            selectedCount.textContent = selectedFiles.size;
        } else {
            selectedInfo.style.display = 'none';
        }
    }

    // ========== 전체 선택 ==========
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.file-checkbox-list');
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
            });
        });
    }

    // ========== 선택된 파일 삭제 ==========
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', function() {
            if (selectedFiles.size === 0) return;

            showConfirm(`${selectedFiles.size}개의 항목을 삭제하시겠습니까?`, function() {
                console.log('삭제할 파일:', Array.from(selectedFiles));
                // 실제로는 여기서 서버에 삭제 요청을 보냅니다
                selectedFiles.clear();
                updateSelectedInfo();
                showAlert('선택한 항목이 삭제되었습니다.', 'success');
            });
        });
    }

    // ========== 선택된 파일 다운로드 ==========
    const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
    if (downloadSelectedBtn) {
        downloadSelectedBtn.addEventListener('click', function() {
            if (selectedFiles.size === 0) return;

            console.log('다운로드할 파일:', Array.from(selectedFiles));
            // 실제로는 여기서 서버에 다운로드 요청을 보냅니다
            showAlert(`${selectedFiles.size}개의 파일 다운로드를 시작합니다.`, 'info');
        });
    }

    // ========== 파일 검색 ==========
    const fileSearch = document.getElementById('fileSearch');
    if (fileSearch) {
        fileSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();

            fileItems.forEach(item => {
                const name = item.getAttribute('data-name').toLowerCase();
                if (name.includes(searchTerm)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

    // ========== 정렬 ==========
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', function() {
            const sortType = this.value;
            console.log('정렬 기준:', sortType);
            // 실제로는 여기서 파일 목록을 정렬합니다
            showAlert(`${sortType} 정렬 기능은 추후 구현됩니다.`, 'info');
        });
    }

    // ========== 업로드 모달 ==========
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => openModal(uploadModal));
    }

    const closeUploadModal = document.getElementById('closeUploadModal');
    const cancelUpload = document.getElementById('cancelUpload');

    if (closeUploadModal) {
        closeUploadModal.addEventListener('click', () => closeModal(uploadModal));
    }
    if (cancelUpload) {
        cancelUpload.addEventListener('click', () => closeModal(uploadModal));
    }

    // 파일 선택 버튼
    const selectFileBtn = document.getElementById('selectFileBtn');
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const uploadList = document.getElementById('uploadList');
    const startUpload = document.getElementById('startUpload');
    let uploadFiles = [];

    if (selectFileBtn && fileInput) {
        selectFileBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', function() {
            const files = Array.from(this.files);
            uploadFiles = [...uploadFiles, ...files];
            updateUploadList();
        });
    }

    // 드래그 앤 드롭
    if (uploadArea) {
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', function() {
            this.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');

            const files = Array.from(e.dataTransfer.files);
            uploadFiles = [...uploadFiles, ...files];
            updateUploadList();
        });
    }

    function updateUploadList() {
        uploadList.innerHTML = '';

        uploadFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'upload-item';

            const iconClass = getIconClass(file.name.split('.').pop());
            const fileSize = formatFileSize(file.size);

            item.innerHTML = `
                <i class="fas ${iconClass}"></i>
                <div class="upload-item-info">
                    <div class="upload-item-name">${file.name}</div>
                    <div class="upload-item-size">${fileSize}</div>
                    <div class="upload-progress">
                        <div class="upload-progress-bar" style="width: 0%"></div>
                    </div>
                </div>
                <button class="remove-upload" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            uploadList.appendChild(item);
        });

        // 파일 제거 버튼
        document.querySelectorAll('.remove-upload').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                uploadFiles.splice(index, 1);
                updateUploadList();
            });
        });

        // 업로드 버튼 활성화
        if (startUpload) {
            startUpload.disabled = uploadFiles.length === 0;
        }
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // 업로드 시작
    if (startUpload) {
        startUpload.addEventListener('click', function() {
            if (uploadFiles.length === 0) return;

            console.log('업로드 시작:', uploadFiles.map(f => f.name));

            // 시뮬레이션: 진행률 표시
            const progressBars = document.querySelectorAll('.upload-progress-bar');
            progressBars.forEach(bar => {
                let progress = 0;
                const interval = setInterval(() => {
                    progress += 10;
                    bar.style.width = progress + '%';
                    if (progress >= 100) {
                        clearInterval(interval);
                    }
                }, 200);
            });

            // 실제로는 여기서 서버에 파일을 업로드합니다
            setTimeout(() => {
                showAlert('파일 업로드가 완료되었습니다.', 'success');
                uploadFiles = [];
                updateUploadList();
                closeModal(uploadModal);
            }, 2500);
        });
    }

    // ========== 새 폴더 모달 ==========
    if (newFolderBtn) {
        newFolderBtn.addEventListener('click', () => openModal(newFolderModal));
    }

    const closeNewFolderModal = document.getElementById('closeNewFolderModal');
    const cancelNewFolder = document.getElementById('cancelNewFolder');
    const createFolder = document.getElementById('createFolder');
    const folderName = document.getElementById('folderName');

    if (closeNewFolderModal) {
        closeNewFolderModal.addEventListener('click', () => closeModal(newFolderModal));
    }
    if (cancelNewFolder) {
        cancelNewFolder.addEventListener('click', () => closeModal(newFolderModal));
    }

    if (createFolder && folderName) {
        createFolder.addEventListener('click', function() {
            const name = folderName.value.trim();

            if (!name) {
                showAlert('폴더 이름을 입력해주세요.', 'warning');
                return;
            }

            console.log('새 폴더 생성:', name);
            // 실제로는 여기서 서버에 폴더 생성 요청을 보냅니다

            showAlert(`"${name}" 폴더가 생성되었습니다.`, 'success');
            folderName.value = '';
            closeModal(newFolderModal);
        });
    }

    // ========== 개별 파일 액션 버튼 ==========
    document.addEventListener('click', function(e) {
        if (e.target.closest('.action-btn')) {
            e.stopPropagation();
            const btn = e.target.closest('.action-btn');
            const fileItem = btn.closest('.file-item');
            const fileName = fileItem ? fileItem.getAttribute('data-name') : '';

            const title = btn.getAttribute('title');

            if (title === '다운로드') {
                console.log('파일 다운로드:', fileName);
                showAlert(`"${fileName}" 다운로드 기능은 추후 NAS와 연동하여 구현됩니다.`, 'info');
            } else if (title === '공유') {
                console.log('파일 공유:', fileName);
                showAlert(`"${fileName}" 공유 기능은 추후 구현됩니다.`, 'info');
            } else if (title === '더보기') {
                console.log('파일 옵션:', fileName);
                showAlert('추가 옵션 메뉴는 추후 구현됩니다.', 'info');
            }
        }
    });

    // ========== 모달 공통 함수 ==========
    function openModal(modal) {
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modal) {
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    // 모달 배경 클릭 시 닫기
    [uploadModal, newFolderModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeModal(this);
                }
            });
        }
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (uploadModal && uploadModal.classList.contains('show')) {
                closeModal(uploadModal);
            } else if (newFolderModal && newFolderModal.classList.contains('show')) {
                closeModal(newFolderModal);
            }
        }
    });
});
