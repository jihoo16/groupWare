#!/usr/bin/env python3
"""
페이지별 CSS 파일에서 공통 버튼/섹션 클래스 중복 정의를 제거.
common-buttons.css가 canonical. 페이지별 파일은 삭제 대상.

브레이스 카운터로 중첩 안전 처리. 비대상 블록의 멀티라인 셀렉터는 그대로 보존.
"""
import re
import sys
from pathlib import Path

TARGET_CLASSES = {
    "btn-primary", "btn-secondary", "btn-danger", "btn-outline",
    "btn-print", "btn-back", "btn-add", "btn-cancel",
    "btn-confirm", "btn-reset", "btn-lg", "btn-sm",
    "btn-edit", "btn-delete",
    "section-title", "section-header",
}

def is_target_selector(selector: str) -> bool:
    """
    selector에 .btn-xxx / .section-xxx 등 대상 클래스가 하나라도 포함되면 True.
    조건: 해당 클래스 바로 뒤에 알파벳·숫자·하이픈이 이어지지 않아야 함(.btn-primary-large 등 제외).
    """
    for cls in TARGET_CLASSES:
        # .cls 다음에 단어문자가 오면 매칭 안 함 (.btn-primary-large 방지)
        if re.search(r"\." + re.escape(cls) + r"(?![a-zA-Z0-9_-])", selector):
            return True
    return False


def strip_for_braces(s: str) -> str:
    """중괄호 카운트를 위해 문자열/싱글라인 주석 제거(단순)."""
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.DOTALL)
    s = re.sub(r'"[^"]*"', '""', s)
    s = re.sub(r"'[^']*'", "''", s)
    return s


def count_braces(line: str):
    s = strip_for_braces(line)
    return s.count("{"), s.count("}")


def process_text(text: str):
    lines = text.split("\n")
    out = []
    depth = 0
    # 현재 드롭 중이면 해당 블록 시작 depth (그 depth로 돌아오면 드롭 종료)
    drop_start_depth = None
    # 멀티라인 셀렉터 버퍼 (원본 라인 배열 그대로)
    selector_buf: list[str] = []
    removed = []

    # 멀티라인 주석 추적
    in_comment = False

    for raw in lines:
        # 주석 상태 추적 — 단순한 /* ... */ 추적 (네스트 불허)
        scan = raw
        # 주석 완결 제거 (같은 라인 내 /*...*/)
        scan_for_depth = strip_for_braces(scan)
        # 다중라인 주석 열림/닫힘
        open_c = scan.count("/*") - scan.count("*/")  # 이 라인에 새로 열린/닫힌 수
        # 매우 단순한 처리: 라인 시작이 주석 중이면 이후 */까지는 무시
        line_effective = scan
        if in_comment:
            # 라인에 */ 있으면 그 뒤부터 유효
            idx = scan.find("*/")
            if idx >= 0:
                in_comment = False
                line_effective = scan[idx + 2:]
            else:
                # 전체가 주석
                if drop_start_depth is not None:
                    # 드롭 중이면 라인 무시 (주석 포함)
                    pass
                else:
                    # 유지
                    if selector_buf:
                        # 셀렉터 buffer가 있으면 먼저 flush
                        out.extend(selector_buf)
                        selector_buf = []
                    out.append(raw)
                continue

        # 주석 외 라인 기준 브레이스 카운트
        clean = strip_for_braces(line_effective)
        opens = clean.count("{")
        closes = clean.count("}")

        # 주석 오픈 체크 (라인 중간에 /*... 이후 */ 없이 끝나면 in_comment = True)
        tmp = re.sub(r"/\*.*?\*/", "", line_effective, flags=re.DOTALL)
        if tmp.count("/*") > 0:
            in_comment = True

        if drop_start_depth is not None:
            # 드롭 중 — 라인 스킵. depth만 업데이트
            depth += opens - closes
            if depth <= drop_start_depth:
                # 블록 종료
                drop_start_depth = None
            continue

        if opens == 0 and closes == 0:
            # 중괄호 없는 라인. 내용이 있으면 셀렉터 후보로 buffer에 축적
            stripped = line_effective.strip()
            if stripped == "" or stripped.startswith(("/*", "//", "*", "@")):
                # 빈 줄/주석/at-rule 단독 — buffer 유지하고 현재 라인은 out 또는 buffer?
                # 셀렉터 buffer가 있다면 함께 유지하려면 buffer에도 추가 해야 셀렉터가 주석 분리 가능...
                # 간단화: 빈 줄은 buffer 초기화, 주석은 그냥 out으로
                if stripped == "":
                    # 셀렉터 buffer가 있으면 그 뒤 공백으로 보이니 flush
                    if selector_buf:
                        out.extend(selector_buf)
                        selector_buf = []
                    out.append(raw)
                else:
                    # 주석/at-rule
                    if selector_buf:
                        out.extend(selector_buf)
                        selector_buf = []
                    out.append(raw)
            else:
                # 셀렉터 일부일 가능성 — buffer에 축적
                selector_buf.append(raw)
            continue

        # 중괄호가 있는 라인
        if opens > 0:
            # 이 라인에 블록 시작
            # 셀렉터 = buffer + 현재 라인의 첫 '{' 앞부분
            brace_idx = line_effective.find("{")
            # raw에서의 brace_idx와 line_effective의 brace_idx는 in_comment 처리 후 다를 수 있음
            # 여기선 in_comment=False 상황이므로 raw와 line_effective 동일
            raw_brace_idx = raw.find("{")
            current_selector_part = raw[:raw_brace_idx]
            full_selector = "\n".join(selector_buf + [current_selector_part]).strip()

            # @media, @keyframes, @supports, @font-face 등 at-rule 블록은 유지 (내부는 재귀적 처리)
            is_at_rule = full_selector.lstrip().startswith("@")

            if not is_at_rule and is_target_selector(full_selector) and depth == 0:
                # 탑레벨 대상 블록 — 드롭
                drop_start_depth = depth
                removed.append(full_selector[:120].replace("\n", " "))
                selector_buf = []
                depth += opens - closes
                continue
            elif not is_at_rule and is_target_selector(full_selector) and depth > 0:
                # 중첩 대상 블록 (예: @media 내부의 .btn-xxx)
                drop_start_depth = depth
                removed.append(full_selector[:120].replace("\n", " ") + " (nested)")
                selector_buf = []
                depth += opens - closes
                continue
            else:
                # 유지. buffer flush 후 현재 라인 output
                if selector_buf:
                    out.extend(selector_buf)
                    selector_buf = []
                out.append(raw)
                depth += opens - closes
                continue
        else:
            # closes만 있는 라인 ('}')
            depth += opens - closes
            if depth < 0:
                depth = 0
            if selector_buf:
                out.extend(selector_buf)
                selector_buf = []
            out.append(raw)
            continue

    # 마지막에 buffer 남아있으면 flush
    if selector_buf:
        out.extend(selector_buf)

    new_text = "\n".join(out)
    # 빈 줄 3개 이상을 2개로 정리
    new_text = re.sub(r"\n{3,}", "\n\n", new_text)
    return new_text, removed


def main():
    css_dir = Path("C:/PRJ/erp/src/main/resources/static/css")
    skip = {"common-buttons.css"}

    total = 0
    file_count = 0
    for css in sorted(css_dir.glob("*.css")):
        if css.name in skip:
            continue
        original = css.read_text(encoding="utf-8")
        new_text, removed = process_text(original)
        if removed:
            css.write_text(new_text, encoding="utf-8")
            print(f"[{css.name}] {len(removed)} blocks removed")
            total += len(removed)
            file_count += 1

    print(f"\n=== {file_count} files modified, {total} blocks removed ===")

if __name__ == "__main__":
    main()
