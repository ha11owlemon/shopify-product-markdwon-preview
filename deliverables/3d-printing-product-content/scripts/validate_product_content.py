#!/usr/bin/env python3
"""Validate deterministic constraints in product-content JSON."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


BULLET_PATTERN = re.compile(r"^[^:\n]+: [^\n]+$")


def error(errors: list[str], message: str) -> None:
    errors.append(message)


def validate_bullets(errors: list[str], version_id: str, key: str, bullets: object) -> None:
    if not isinstance(bullets, list) or len(bullets) != 5:
        error(errors, f"{version_id}.{key} must contain exactly 5 bullets")
        return
    for index, bullet in enumerate(bullets, start=1):
        if not isinstance(bullet, str) or not BULLET_PATTERN.fullmatch(bullet):
            error(errors, f"{version_id}.{key}[{index}] must match 'Short title: content'")


def validate(data: object) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    if not isinstance(data, dict):
        return ["root value must be a JSON object"], warnings

    versions = data.get("content_versions")
    if not isinstance(versions, list) or len(versions) != 3:
        error(errors, "content_versions must contain exactly 3 versions")
        return errors, warnings

    for index, version in enumerate(versions, start=1):
        version_id = f"content_versions[{index}]"
        if not isinstance(version, dict):
            error(errors, f"{version_id} must be an object")
            continue
        title = version.get("listing_title_en")
        if not isinstance(title, str):
            error(errors, f"{version_id}.listing_title_en must be a string")
        elif not 110 <= len(title) <= 128:
            error(errors, f"{version_id}.listing_title_en is {len(title)} characters; expected 110–128")

        for key in ("listing_title_zh", "seo_meta_title_en", "seo_meta_title_zh"):
            if not isinstance(version.get(key), str) or not version[key].strip():
                error(errors, f"{version_id}.{key} must be a non-empty string")

        meta_title = version.get("seo_meta_title_en")
        if isinstance(meta_title, str) and meta_title.strip() and not 50 <= len(meta_title) <= 60:
            warnings.append(f"{version_id}.seo_meta_title_en is {len(meta_title)} characters; recommended 50–60")

        validate_bullets(errors, version_id, "bullets_en", version.get("bullets_en"))
        validate_bullets(errors, version_id, "bullets_zh", version.get("bullets_zh"))

    assessment = data.get("product_assessment")
    if not isinstance(assessment, dict):
        error(errors, "product_assessment must be an object")
    evidence = data.get("evidence")
    if not isinstance(evidence, list):
        error(errors, "evidence must be an array")
    elif data.get("research_status") == "verified" and not evidence:
        error(errors, "verified research_status requires at least one evidence item")
    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Path to the result JSON file")
    args = parser.parse_args()
    try:
        data = json.loads(args.input.read_text(encoding="utf-8"))
    except FileNotFoundError:
        print(json.dumps({"status": "needs_revision", "errors": ["input file not found"]}, ensure_ascii=False))
        return 2
    except json.JSONDecodeError as exc:
        print(json.dumps({"status": "needs_revision", "errors": [f"invalid JSON: {exc.msg}"]}, ensure_ascii=False))
        return 2

    errors, warnings = validate(data)
    report = {"status": "passed" if not errors else "needs_revision", "errors": errors, "warnings": warnings}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
