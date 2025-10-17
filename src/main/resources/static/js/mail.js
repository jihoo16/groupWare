// 메일 페이지 스크립트
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = '사용자'; // 실제로는 로그인한 사용자 정보
    let currentFolder = 'inbox';
    let selectedMailId = null;

    // 샘플 메일 데이터
    const mails = [
        {
            id: 1,
            folder: 'inbox',
            from: '김대표',
            fromEmail: 'ceo@company.com',
            to: currentUser,
            subject: '2025년 1분기 실적 보고',
            body: '안녕하세요.<br><br>2025년 1분기 실적 보고서를 첨부 파일로 보내드립니다.<br>검토 후 의견 부탁드립니다.<br><br>감사합니다.',
            date: '2025-10-16 10:30',
            isRead: false,
            hasAttachment: true,
            attachments: [
                { name: '1분기_실적보고서.xlsx', size: '2.5 MB' },
                { name: '참고자료.pdf', size: '1.2 MB' }
            ]
        },
        {
            id: 2,
            folder: 'inbox',
            from: '박CMO',
            fromEmail: 'cmo@company.com',
            to: currentUser,
            subject: '신규 마케팅 캠페인 기획안',
            body: '안녕하세요.<br><br>다음 주 론칭 예정인 신규 마케팅 캠페인 기획안입니다.<br>확인 부탁드립니다.<br><br>감사합니다.',
            date: '2025-10-16 09:15',
            isRead: false,
            hasAttachment: false,
            attachments: []
        },
        {
            id: 3,
            folder: 'inbox',
            from: '이CTO',
            fromEmail: 'cto@company.com',
            to: currentUser,
            subject: '시스템 점검 안내',
            body: '안녕하세요.<br><br>이번 주말 시스템 정기 점검이 예정되어 있습니다.<br>점검 시간: 10월 19일(토) 02:00 ~ 06:00<br><br>점검 중에는 서비스 이용이 제한될 수 있습니다.<br><br>감사합니다.',
            date: '2025-10-15 16:45',
            isRead: true,
            hasAttachment: false,
            attachments: []
        },
        {
            id: 4,
            folder: 'inbox',
            from: '정지원',
            fromEmail: 'hr@company.com',
            to: currentUser,
            subject: '연차 신청 승인 완료',
            body: '안녕하세요.<br><br>신청하신 연차가 승인되었습니다.<br>사용 일자: 10월 20일 ~ 10월 21일<br><br>즐거운 휴가 되시기 바랍니다.<br><br>감사합니다.',
            date: '2025-10-15 14:20',
            isRead: true,
            hasAttachment: false,
            attachments: []
        },
        {
            id: 5,
            folder: 'inbox',
            from: '김개발',
            fromEmail: 'dev1@company.com',
            to: currentUser,
            subject: '프로젝트 진행 상황 공유',
            body: '안녕하세요.<br><br>현재 진행 중인 프로젝트 상황을 공유드립니다.<br><br>1. 요구사항 분석 완료 (100%)<br>2. 설계 진행 중 (70%)<br>3. 개발 예정<br><br>다음 주 중 설계를 완료할 예정입니다.<br><br>감사합니다.',
            date: '2025-10-15 11:30',
            isRead: true,
            hasAttachment: true,
            attachments: [
                { name: '프로젝트_진행현황.pptx', size: '3.8 MB' }
            ]
        },
        {
            id: 6,
            folder: 'sent',
            from: currentUser,
            fromEmail: 'user@company.com',
            to: '김대표',
            subject: 'Re: 2025년 1분기 실적 보고',
            body: '안녕하세요 대표님.<br><br>실적 보고서 잘 확인했습니다.<br>전반적으로 양호한 성과를 보이고 있는 것 같습니다.<br><br>다만 몇 가지 개선이 필요한 부분이 있어 내일 미팅에서 논의하면 좋을 것 같습니다.<br><br>감사합니다.',
            date: '2025-10-16 11:00',
            isRead: true,
            hasAttachment: false,
            attachments: []
        },
        {
            id: 7,
            folder: 'sent',
            from: currentUser,
            fromEmail: 'user@company.com',
            to: '박CMO',
            subject: 'Re: 신규 마케팅 캠페인 기획안',
            body: '안녕하세요.<br><br>기획안 확인했습니다.<br>전체적인 방향성은 좋은 것 같습니다.<br><br>타겟 고객층에 대한 추가 분석이 있으면 더 좋을 것 같습니다.<br><br>감사합니다.',
            date: '2025-10-16 10:00',
            isRead: true,
            hasAttachment: false,
            attachments: []
        },
        {
            id: 8,
            folder: 'drafts',
            from: currentUser,
            fromEmail: 'user@company.com',
            to: '이CTO',
            subject: '신규 기능 개발 요청',
            body: '안녕하세요.<br><br>고객 관리 시스템에 다음 기능을 추가하면 좋을 것 같습니다.<br><br>1. ',
            date: '2025-10-16 08:30',
            isRead: true,
            hasAttachment: false,
            attachments: []
        },
        {
            id: 9,
            folder: 'drafts',
            from: currentUser,
            fromEmail: 'user@company.com',
            to: '전체',
            subject: '부서 회식 공지',
            body: '안녕하세요.<br><br>이번 주 금요일 저녁 7시에 부서 회식이 있습니다.<br>',
            date: '2025-10-15 17:00',
            isRead: true,
            hasAttachment: false,
            attachments: []
        },
        {
            id: 10,
            folder: 'spam',
            from: 'marketing@promotion.com',
            fromEmail: 'marketing@promotion.com',
            to: currentUser,
            subject: '[광고] 특별 할인 이벤트',
            body: '특별 할인 이벤트를 진행합니다...',
            date: '2025-10-15 13:20',
            isRead: false,
            hasAttachment: false,
            attachments: []
        },
        {
            id: 11,
            folder: 'trash',
            from: '오래된메일',
            fromEmail: 'old@company.com',
            to: currentUser,
            subject: '삭제된 메일',
            body: '삭제된 메일입니다.',
            date: '2025-10-10 10:00',
            isRead: true,
            hasAttachment: false,
            attachments: []
        }
    ];

    // 폴더별 메일 개수 업데이트
    function updateFolderCounts() {
        const inboxCount = mails.filter(m => m.folder === 'inbox' && !m.isRead).length;
        const draftsCount = mails.filter(m => m.folder === 'drafts').length;

        // 받은메일함 뱃지
        const inboxBadge = document.querySelector('[data-folder="inbox"] .folder-count');
        if (inboxCount > 0) {
            if (inboxBadge) {
                inboxBadge.textContent = inboxCount;
                inboxBadge.style.display = 'flex';
            }
        } else {
            if (inboxBadge) {
                inboxBadge.style.display = 'none';
            }
        }

        // 임시보관함 뱃지
        const draftsBadge = document.querySelector('[data-folder="drafts"] .folder-count');
        if (draftsCount > 0) {
            if (draftsBadge) {
                draftsBadge.textContent = draftsCount;
                draftsBadge.style.display = 'flex';
            }
        } else {
            if (draftsBadge) {
                draftsBadge.style.display = 'none';
            }
        }

        // 사이드바 메일 뱃지 업데이트
        const mailBadge = document.getElementById('mailBadge');
        if (mailBadge) {
            if (inboxCount > 0) {
                mailBadge.textContent = inboxCount;
                mailBadge.style.display = 'inline-block';
            } else {
                mailBadge.style.display = 'none';
            }
        }
    }

    // 메일 목록 렌더링
    function renderMailList() {
        const mailList = document.getElementById('mailList');
        const folderTitle = document.getElementById('folderTitle');
        const mailCount = document.getElementById('mailCount');

        // 폴더별 타이틀
        const folderNames = {
            inbox: '받은메일함',
            sent: '보낸메일함',
            drafts: '임시보관함',
            spam: '스팸메일함',
            trash: '휴지통'
        };

        folderTitle.textContent = folderNames[currentFolder];

        // 현재 폴더의 메일 필터링
        const folderMails = mails.filter(m => m.folder === currentFolder);
        mailCount.textContent = `${folderMails.length}개`;

        mailList.innerHTML = '';

        if (folderMails.length === 0) {
            mailList.innerHTML = '<div style="padding: 40px; text-align: center; color: #999;">메일이 없습니다.</div>';
            return;
        }

        folderMails.forEach(mail => {
            const mailItem = document.createElement('div');
            mailItem.className = `mail-item${!mail.isRead ? ' unread' : ''}${mail.id === selectedMailId ? ' active' : ''}`;
            mailItem.setAttribute('data-mail-id', mail.id);

            const attachmentIcon = mail.hasAttachment ? '<i class="fas fa-paperclip mail-item-icon"></i>' : '';

            mailItem.innerHTML = `
                <div class="mail-item-checkbox">
                    <input type="checkbox" class="mail-checkbox">
                </div>
                <div class="mail-item-content">
                    <div class="mail-item-header">
                        <span class="mail-item-from">${mail.from}</span>
                        <span class="mail-item-date">${formatMailDate(mail.date)}</span>
                    </div>
                    <div class="mail-item-subject">
                        ${mail.subject}
                        ${attachmentIcon}
                    </div>
                    <div class="mail-item-preview">${stripHtml(mail.body)}</div>
                </div>
            `;

            mailItem.addEventListener('click', function(e) {
                if (!e.target.classList.contains('mail-checkbox')) {
                    openMail(mail.id);
                }
            });

            mailList.appendChild(mailItem);
        });

        updateFolderCounts();
    }

    // 날짜 포맷
    function formatMailDate(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const dateOnly = dateStr.split(' ')[0];
        const todayStr = formatDateString(today);
        const yesterdayStr = formatDateString(yesterday);

        if (dateOnly === todayStr) {
            return dateStr.split(' ')[1].substring(0, 5); // HH:MM
        } else if (dateOnly === yesterdayStr) {
            return '어제';
        } else {
            return dateStr.split(' ')[0].substring(5); // MM-DD
        }
    }

    function formatDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // HTML 태그 제거
    function stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    // 메일 열기
    function openMail(mailId) {
        selectedMailId = mailId;
        const mail = mails.find(m => m.id === mailId);
        if (!mail) return;

        // 읽음 처리
        mail.isRead = true;

        // UI 업데이트
        renderMailList();

        // 메일 상세 표시
        document.getElementById('mailDetailEmpty').style.display = 'none';
        document.getElementById('mailDetail').style.display = 'block';

        // 메일 정보 표시
        document.getElementById('mailSubject').textContent = mail.subject;
        document.getElementById('senderName').textContent = mail.from;
        document.getElementById('senderEmail').textContent = mail.fromEmail;
        document.getElementById('mailDate').textContent = mail.date;
        document.getElementById('mailBody').innerHTML = mail.body;

        // 첨부파일
        const attachmentsSection = document.getElementById('mailAttachments');
        const attachmentsList = document.getElementById('attachmentsList');

        if (mail.hasAttachment && mail.attachments.length > 0) {
            attachmentsSection.style.display = 'block';
            document.getElementById('attachmentCount').textContent = mail.attachments.length;

            attachmentsList.innerHTML = '';
            mail.attachments.forEach(att => {
                const attItem = document.createElement('div');
                attItem.className = 'attachment-item';
                attItem.innerHTML = `
                    <i class="fas fa-file"></i>
                    <div class="attachment-info">
                        <div class="attachment-name">${att.name}</div>
                        <div class="attachment-size">${att.size}</div>
                    </div>
                    <button class="attachment-download">
                        <i class="fas fa-download"></i>
                    </button>
                `;
                attachmentsList.appendChild(attItem);
            });
        } else {
            attachmentsSection.style.display = 'none';
        }
    }

    // 폴더 전환
    const folderItems = document.querySelectorAll('.folder-item');
    folderItems.forEach(item => {
        item.addEventListener('click', function() {
            const folder = this.getAttribute('data-folder');
            currentFolder = folder;
            selectedMailId = null;

            // 활성 폴더 표시
            folderItems.forEach(f => f.classList.remove('active'));
            this.classList.add('active');

            // 메일 상세 숨기기
            document.getElementById('mailDetailEmpty').style.display = 'flex';
            document.getElementById('mailDetail').style.display = 'none';

            renderMailList();
        });
    });

    // 메일 검색
    document.getElementById('mailSearchInput').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const mailItems = document.querySelectorAll('.mail-item');

        mailItems.forEach(item => {
            const from = item.querySelector('.mail-item-from').textContent.toLowerCase();
            const subject = item.querySelector('.mail-item-subject').textContent.toLowerCase();
            const preview = item.querySelector('.mail-item-preview').textContent.toLowerCase();

            if (from.includes(searchTerm) || subject.includes(searchTerm) || preview.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // 메일 쓰기 모달
    const composeModal = document.getElementById('composeModal');
    const composeBtn = document.getElementById('composeBtn');
    const floatingComposeBtn = document.getElementById('floatingComposeBtn');
    const closeComposeModal = document.getElementById('closeComposeModal');

    function openComposeModal() {
        composeModal.classList.add('show');
        document.getElementById('composeForm').reset();
        document.getElementById('fileList').innerHTML = '';
    }

    composeBtn.addEventListener('click', openComposeModal);

    if (floatingComposeBtn) {
        floatingComposeBtn.addEventListener('click', openComposeModal);
    }

    closeComposeModal.addEventListener('click', function() {
        composeModal.classList.remove('show');
    });

    composeModal.addEventListener('click', function(e) {
        if (e.target === this) {
            composeModal.classList.remove('show');
        }
    });

    // 메일 삭제
    document.getElementById('deleteBtn').addEventListener('click', function() {
        if (!selectedMailId) return;

        showConfirm('이 메일을 삭제하시겠습니까?', function() {
            const mail = mails.find(m => m.id === selectedMailId);
            if (mail) {
                mail.folder = 'trash';
            }

            selectedMailId = null;
            document.getElementById('mailDetailEmpty').style.display = 'flex';
            document.getElementById('mailDetail').style.display = 'none';

            renderMailList();
        });
    });

    // 파일 업로드
    const fileInput = document.getElementById('fileInput');
    const fileUploadBtn = document.getElementById('fileUploadBtn');
    const fileList = document.getElementById('fileList');

    fileUploadBtn.addEventListener('click', function() {
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        fileList.innerHTML = '';
        Array.from(this.files).forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <i class="fas fa-file"></i>
                <span class="file-name">${file.name}</span>
                <span class="file-size">(${(file.size / 1024).toFixed(1)} KB)</span>
                <button type="button" class="file-remove" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            fileList.appendChild(fileItem);
        });

        // 파일 제거 버튼
        document.querySelectorAll('.file-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                const dt = new DataTransfer();
                const files = Array.from(fileInput.files);
                files.forEach((file, i) => {
                    if (i !== index) {
                        dt.items.add(file);
                    }
                });
                fileInput.files = dt.files;
                fileInput.dispatchEvent(new Event('change'));
            });
        });
    });

    // 메일 전송
    document.getElementById('sendMailBtn').addEventListener('click', function() {
        const form = document.getElementById('composeForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const to = document.getElementById('mailTo').value;
        const cc = document.getElementById('mailCc').value;
        const subject = document.getElementById('mailSubjectInput').value;
        const content = document.getElementById('mailContent').value;

        const newMail = {
            id: mails.length + 1,
            folder: 'sent',
            from: currentUser,
            fromEmail: 'user@company.com',
            to: to,
            subject: subject,
            body: content.replace(/\n/g, '<br>'),
            date: new Date().toISOString().slice(0, 16).replace('T', ' '),
            isRead: true,
            hasAttachment: fileInput.files.length > 0,
            attachments: []
        };

        // 첨부파일 정보 추가
        Array.from(fileInput.files).forEach(file => {
            newMail.attachments.push({
                name: file.name,
                size: `${(file.size / 1024 / 1024).toFixed(1)} MB`
            });
        });

        mails.push(newMail);

        // 모달 닫기
        composeModal.classList.remove('show');

        // 보낸메일함으로 이동
        currentFolder = 'sent';
        folderItems.forEach(f => {
            if (f.getAttribute('data-folder') === 'sent') {
                f.classList.add('active');
            } else {
                f.classList.remove('active');
            }
        });

        renderMailList();
        showAlert('메일이 전송되었습니다.', 'success');
    });

    // 임시저장
    document.getElementById('saveDraftBtn').addEventListener('click', function() {
        const to = document.getElementById('mailTo').value;
        const subject = document.getElementById('mailSubjectInput').value;
        const content = document.getElementById('mailContent').value;

        if (!to && !subject && !content) {
            showAlert('저장할 내용이 없습니다.', 'warning');
            return;
        }

        const newDraft = {
            id: mails.length + 1,
            folder: 'drafts',
            from: currentUser,
            fromEmail: 'user@company.com',
            to: to || '(받는사람 없음)',
            subject: subject || '(제목 없음)',
            body: content.replace(/\n/g, '<br>'),
            date: new Date().toISOString().slice(0, 16).replace('T', ' '),
            isRead: true,
            hasAttachment: fileInput.files.length > 0,
            attachments: []
        };

        mails.push(newDraft);

        // 모달 닫기
        composeModal.classList.remove('show');

        updateFolderCounts();
        showAlert('임시 저장되었습니다.', 'success');
    });

    // 메일 상세 액션 버튼
    document.getElementById('replyBtn').addEventListener('click', function() {
        if (!selectedMailId) return;
        const mail = mails.find(m => m.id === selectedMailId);
        if (!mail) return;

        composeModal.classList.add('show');
        document.getElementById('mailTo').value = mail.fromEmail;
        document.getElementById('mailSubjectInput').value = 'Re: ' + mail.subject;
        document.getElementById('mailContent').value = '';
    });

    document.getElementById('forwardBtn').addEventListener('click', function() {
        if (!selectedMailId) return;
        const mail = mails.find(m => m.id === selectedMailId);
        if (!mail) return;

        composeModal.classList.add('show');
        document.getElementById('mailTo').value = '';
        document.getElementById('mailSubjectInput').value = 'Fw: ' + mail.subject;
        document.getElementById('mailContent').value = '\n\n----- 전달된 메시지 -----\n' + stripHtml(mail.body);
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            composeModal.classList.remove('show');
        }
    });

    // 초기 렌더링
    renderMailList();

    // 현재 페이지에 맞는 메뉴 활성화
    const currentPath = window.location.pathname;
    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(item => {
        const link = item.querySelector('a');
        if (link && link.getAttribute('href') === currentPath) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
});
