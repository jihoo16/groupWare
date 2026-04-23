// 공통 JavaScript - 모든 페이지에서 사용

// 팝업 감지 - 사이드바 숨김 (window.opener가 있으면 팝업, iframe 안이면 레이어 팝업)
if (window.opener || window.parent !== window) {
    document.documentElement.classList.add('popup-mode');
}

/**
 * 팝업 모드 대응 리다이렉트
 * 팝업이면 부모 창 새로고침 후 팝업 닫기, 일반이면 해당 URL로 이동
 */
window.popupAwareRedirect = function(fallbackUrl) {
    if (window.opener && !window.opener.closed) {
        window.opener.location.reload();
        window.close();
    } else if (window.parent !== window) {
        // iframe 레이어 팝업인 경우 부모의 모달 닫기 및 문서 목록 새로고침
        try {
            if (typeof window.parent.closeIframeModal === 'function') {
                window.parent.closeIframeModal();
            }
            if (typeof window.parent.loadProjectDocuments === 'function') {
                const urlParams = new URLSearchParams(window.parent.location.search);
                const projectId = urlParams.get('projectId');
                if (projectId) window.parent.loadProjectDocuments(projectId);
            }
        } catch (e) {
            window.parent.location.reload();
        }
    } else {
        window.location.href = fallbackUrl;
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    const menuParents = document.querySelectorAll('.menu-parent');

    // 서브메뉴 호버로 열기/닫기
    menuParents.forEach(parent => {
        parent.addEventListener('mouseenter', function() {
            // 사이드바가 호버 상태일 때만 작동
            if (sidebar.matches(':hover')) {
                this.classList.add('open');
            }
        });

        parent.addEventListener('mouseleave', function() {
            // 마우스를 떼면 항상 닫기 (활성화 여부와 관계없이)
            this.classList.remove('open');
        });
    });

    // 대메뉴 클릭 시 페이지 이동 허용
    // (호버는 mouseenter/mouseleave로 처리되므로 click은 페이지 이동용)

    // 사이드바에서 마우스가 완전히 벗어나면 모든 서브메뉴 닫기
    sidebar.addEventListener('mouseleave', function() {
        menuParents.forEach(parent => {
            parent.classList.remove('open');
        });
    });

    // 현재 페이지에 맞는 메뉴 활성화 (좌측 사이드바만)
    const currentPath = window.location.pathname;
    const menuItems = document.querySelectorAll('.sidebar .menu-item');  // .sidebar만 선택

    menuItems.forEach(item => {
        const link = item.querySelector('a');
        if (link && link.getAttribute('href') === currentPath) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // submenu-item에 active가 있으면 상위 menu-parent에도 active 추가
    const activeSubmenuItem = document.querySelector('.submenu-item.active');
    if (activeSubmenuItem) {
        const parentMenuItem = activeSubmenuItem.closest('.menu-parent');
        if (parentMenuItem) {
            parentMenuItem.classList.add('active');
        }
    }

    // nested-submenu-item에 active가 있으면 상위 submenu-parent와 menu-parent에도 active 추가
    const activeNestedSubmenuItem = document.querySelector('.nested-submenu-item.active');
    if (activeNestedSubmenuItem) {
        const parentSubmenuItem = activeNestedSubmenuItem.closest('.submenu-parent');
        if (parentSubmenuItem) {
            parentSubmenuItem.classList.add('active');
        }
        const parentMenuItem = activeNestedSubmenuItem.closest('.menu-parent');
        if (parentMenuItem) {
            parentMenuItem.classList.add('active');
        }
    }

    // 중첩된 서브메뉴 호버로 열기/닫기
    const submenuParents = document.querySelectorAll('.submenu-parent');
    submenuParents.forEach(parent => {
        parent.addEventListener('mouseenter', function() {
            // 상위 menu-parent가 열려있을 때만 작동
            const menuParent = this.closest('.menu-parent');
            if (menuParent && menuParent.classList.contains('open')) {
                this.classList.add('open');
            }
        });

        parent.addEventListener('mouseleave', function() {
            this.classList.remove('open');
        });
    });

    // ===========================
    // Current User Info Display
    // ===========================
    function loadCurrentUserInfo() {
        // 전역 변수 CURRENT_USER에서 사용자 정보 가져오기 (layout.html에서 주입됨)
        if (!window.CURRENT_USER || !window.CURRENT_USER.idx) {
            console.warn('세션 정보가 없습니다.');
            return;
        }

        const user = window.CURRENT_USER;

        // 사용자 이름 업데이트
        const userNameEl = document.querySelector('.user-name');
        if (userNameEl && user.empName) {
            userNameEl.textContent = user.empName;
        }

        // 사용자 역할 업데이트 (userRoleCode 기준)
        const userRoleEl = document.querySelector('.user-role');
        if (userRoleEl) {
            const roleLabels = {
                'C1101': '개발자',
                'C1102': '관리자',
                'C1105': '대표',
                'C1103': '역량 열람자',
                'C1104': '사용자'
            };
            userRoleEl.textContent = roleLabels[user.userRoleCode] || '사용자';
        }

        // 대표(EXECUTIVE) — 관리자 페이지 읽기 전용 모드
        // body 클래스 + 수정/승인/삭제 UI 일괄 숨김 (백엔드에서도 차단됨)
        //
        // 숨김 대상 (CRUD 버튼) — 각 관리자 화면에서 실제로 쓰이는 클래스:
        //   연차: .btn-approve(승인) / .btn-revoke(승인철회) / .btn-delete / .btn-proxy-add(연차등록)
        //   경비: .btn-delete / .admin-upload-btn(대리업로드) / .admin-upload-guide(안내)
        //        .item-receipt-btn(항목 영수증 첨부) / .btn-remove-attachment
        //   공통: .btn-status-change / .batch-action-bar / [data-action="mutation"]
        if (user.userRoleCode === 'C1105') {
            document.body.classList.add('role-executive');
            const style = document.createElement('style');
            style.dataset.roleExecutive = 'true';
            style.textContent = `
                body.role-executive .btn-approve,
                body.role-executive .btn-revoke,
                body.role-executive .btn-delete,
                body.role-executive .btn-proxy-add,
                body.role-executive .btn-status-change,
                body.role-executive .batch-action-bar,
                body.role-executive .admin-upload-btn,
                body.role-executive .admin-upload-guide,
                body.role-executive .item-receipt-btn,
                body.role-executive .btn-remove-attachment,
                body.role-executive [data-action="mutation"] {
                    display: none !important;
                }
            `;
            document.head.appendChild(style);
        }

        console.log('현재 로그인 사용자:', user.empName, '(idx:', user.idx, ')');
    }

    // 페이지 로드 시 사용자 정보 표시
    loadCurrentUserInfo();

    // ===========================
    // Logout Button Handler
    // ===========================
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();

            // Confirm logout
            const result = await Swal.fire({
                title: '로그아웃 하시겠습니까?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#667eea',
                cancelButtonColor: '#6c757d',
                confirmButtonText: '로그아웃',
                cancelButtonText: '취소'
            });

            if (result.isConfirmed) {
                try {
                    // 서버 세션 무효화
                    await fetch('/api/auth/logout', { method: 'POST' });
                } catch (e) {
                    // 네트워크 오류가 있어도 로그아웃 진행
                }

                // Show logout message
                await Swal.fire({
                    icon: 'success',
                    title: '로그아웃 되었습니다',
                    showConfirmButton: false,
                    timer: 1500
                });

                window.location.href = '/login';
            }
        });
    }
});

// ===========================
// 유틸리티 함수들 (전역)
// ===========================

/**
 * 숫자를 한국 통화 형식으로 포맷팅 (천단위 콤마 + 원)
 * @param {number|string} value - 포맷팅할 숫자
 * @param {boolean} showUnit - '원' 단위 표시 여부 (기본값: true)
 * @returns {string} 포맷팅된 문자열 (예: "1,234,567원" 또는 "1,234,567")
 */
function formatCurrency(value, showUnit = true) {
    if (value === null || value === undefined || value === '') {
        return showUnit ? '0원' : '0';
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
        return showUnit ? '0원' : '0';
    }

    const formatted = Math.floor(numValue).toLocaleString('ko-KR');
    return showUnit ? formatted + '원' : formatted;
}

/**
 * 숫자를 천단위 콤마로 포맷팅 (단위 없음)
 * @param {number|string} value - 포맷팅할 숫자
 * @returns {string} 포맷팅된 문자열 (예: "1,234,567")
 */
function formatNumber(value) {
    return formatCurrency(value, false);
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 * @param {string|Date} date - 포맷팅할 날짜
 * @returns {string} 포맷팅된 날짜 문자열
 */
function formatDate(date) {
    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * 날짜 범위 포맷팅 (YYYY-MM-DD ~ YYYY-MM-DD)
 * @param {string|Date} startDate - 시작일
 * @param {string|Date} endDate - 종료일
 * @returns {string} 포맷팅된 날짜 범위 문자열
 */
function formatDateRange(startDate, endDate) {
    const start = formatDate(startDate);
    const end = formatDate(endDate);

    if (!start && !end) return '';
    if (!start) return end;
    if (!end) return start;

    return `${start} ~ ${end}`;
}

// ============================================
// 공통 API 호출 및 404 처리 유틸리티
// ============================================

/**
 * 페이지 로딩 오버레이 표시
 * @param {string} message - 로딩 메시지 (기본값: "데이터 불러오는 중...")
 */
window.showPageLoadingOverlay = function(message = '데이터 불러오는 중...') {
    // 이미 오버레이가 있으면 재사용
    let overlay = document.getElementById('pageLoadingOverlay');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'pageLoadingOverlay';
        overlay.innerHTML = `
            <div style="text-align: center;">
                <div class="spinner"></div>
                <div class="loading-message">${message}</div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
};

/**
 * 페이지 로딩 오버레이 숨기기
 */
window.hidePageLoadingOverlay = function() {
    const overlay = document.getElementById('pageLoadingOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
};

/**
 * 공통 API 호출 래퍼 (404 자동 처리)
 * @param {string} url - API URL
 * @param {Object} options - fetch options
 * @param {boolean} autoHandle404 - 404 자동 처리 여부 (기본값: true)
 * @returns {Promise<any>} - API 응답 데이터
 */
window.fetchWithErrorHandling = async function(url, options = {}, autoHandle404 = true) {
    try {
        console.log(`[API 호출] ${url}`);
        const response = await fetch(url, options);

        if (!response.ok) {
            console.error(`[API 실패] ${response.status} - ${url}`);

            // 404 자동 처리 - 문서/데이터가 없는 경우
            if (response.status === 404 && autoHandle404) {
                console.log('[404 감지] 문서 삭제/미존재 페이지로 리다이렉트');
                // 로딩 오버레이 해제
                if (window.hidePageLoadingOverlay) {
                    window.hidePageLoadingOverlay();
                }
                window.location.replace('/nothing');
                return null; // 리다이렉트 중이므로 null 반환
            }

            // 403 Forbidden 처리 - 커스텀 403 페이지로 리다이렉트
            if (response.status === 403) {
                console.log('[403 감지] 접근 권한 없음 페이지로 리다이렉트');
                // 로딩 오버레이 해제
                if (window.hidePageLoadingOverlay) {
                    window.hidePageLoadingOverlay();
                }
                window.location.replace('/nope');
                return null;
            }

            // 500 서버 에러 - 커스텀 500 페이지로 리다이렉트
            if (response.status === 500) {
                console.log('[500 감지] 서버 오류 페이지로 리다이렉트');
                // 로딩 오버레이 해제
                if (window.hidePageLoadingOverlay) {
                    window.hidePageLoadingOverlay();
                }
                window.location.replace('/boom');
                return null;
            }

            // 기타 에러
            const errorText = await response.text();
            console.error(`[API 실패] ${url} status=${response.status} body=${errorText}`);
            throw new Error('LOAD_FAILURE');
        }

        const data = await response.json();
        console.log(`[API 성공] ${url}`);
        return data;

    } catch (error) {
        console.error(`[API 오류] ${url}:`, error);
        throw error;
    }
};

/**
 * 상세 페이지 데이터 로드 (로딩 오버레이 + 404 처리 자동)
 * @param {string} url - API URL
 * @param {Function} onSuccess - 성공 시 콜백 (data를 인자로 받음)
 * @param {Function} onError - 에러 시 콜백 (선택사항)
 */
window.loadDetailPageData = async function(url, onSuccess, onError) {
    try {
        // 로딩 오버레이는 이미 HTML에 있다고 가정
        const data = await fetchWithErrorHandling(url, {}, true);

        if (data) {
            await onSuccess(data);
            hidePageLoadingOverlay();
        }
        // data가 null이면 이미 리다이렉트 중

    } catch (error) {
        console.error('[상세 페이지 로드] 데이터', error);
        hidePageLoadingOverlay();

        if (onError) {
            onError(error);
        } else {
            await showLoadFailure('정보');
        }
    }
};

// ============================================
// 구현되지 않은 페이지 링크 클릭 방지
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // data-disabled="true" 속성을 가진 모든 링크에 클릭 이벤트 추가
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a[data-disabled="true"]');
        if (link) {
            e.preventDefault();
            Swal.fire({
                icon: 'info',
                title: '준비 중입니다',
                text: '해당 기능은 추후 구현 예정입니다.',
                confirmButtonText: '확인'
            });
        }
    });
});
