#!/usr/bin/env python3
"""ForestFPS 静态站点校验脚本。

用法：
    python tools/validate_web.py
"""

from __future__ import annotations

import pathlib
import re
import subprocess
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
SRC = WEB / "src"
REQUIRED_FILES = [
    "index.html",
    "styles.css",
    "manifest.webmanifest",
    "sw.js",
    "icons/icon.svg",
    "vendor/three/three.module.js",
    "vendor/three/three.core.js",
    "src/main.js",
    "src/game.js",
    "src/entities.js",
    "src/world.js",
    "src/models.js",
    "src/input.js",
    "src/audio.js",
    "src/utils.js",
    "src/config.js",
]

IMPORT_RE = re.compile(
    r"""from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]"""
)


def check_file(path: pathlib.Path) -> None:
    if not path.is_file():
        raise SystemExit(f"缺少文件：{path.relative_to(ROOT)}")


def resolve_import(importer: pathlib.Path, spec: str) -> pathlib.Path | None:
    if spec.startswith("../"):
        target = (importer.parent / spec).resolve()
    elif spec.startswith("./"):
        target = (importer.parent / spec).resolve()
    else:
        return None  # 仅检查本地相对导入，第三方由 vendor 提供

    candidates = [target, target.with_suffix(".js")]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return None


def main() -> int:
    for rel in REQUIRED_FILES:
        check_file(WEB / rel)

    js_files = sorted(SRC.glob("*.js"))
    if not js_files:
        raise SystemExit("web/src 下没有 JavaScript 文件")

    errors: list[str] = []
    for js in js_files:
        text = js.read_text(encoding="utf-8")
        for match in IMPORT_RE.finditer(text):
            spec = match.group(1) or match.group(2)
            if not spec or not spec.startswith((".", "/")):
                continue
            resolved = resolve_import(js, spec)
            if resolved is None:
                errors.append(f"{js.relative_to(ROOT)} 中无法解析导入：{spec}")

    if errors:
        print("导入检查失败：")
        for error in errors:
            print(f"  - {error}")
        return 1

    # 可选：调用 Node 做语法检查。Node 不可用时不视为失败。
    node = subprocess.run(
        ["node", "--version"],
        capture_output=True,
        text=True,
        check=False,
    )
    if node.returncode == 0:
        print("Node 语法检查：")
        failed = False
        for js in js_files:
            result = subprocess.run(
                ["node", "--check", str(js)],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode != 0:
                failed = True
                print(result.stderr.strip())
        if failed:
            return 1
        print("  全部通过")
    else:
        print("未检测到 Node，跳过语法检查。")

    print("ForestFPS 静态站点校验通过。")
    print(f"  入口：{WEB / 'index.html'}")
    print(f"  模块数量：{len(js_files)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
