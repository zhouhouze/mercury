from __future__ import annotations

import hashlib
import html
import re
from dataclasses import dataclass
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urlparse

from navia_runtime.contracts import ErrorCode, utc_now


BLOCK_TAGS = {
    "article",
    "section",
    "p",
    "li",
    "pre",
    "blockquote",
    "td",
    "th",
}
HEADING_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
SKIP_TAGS = {"script", "style", "noscript", "svg"}
BLOCK_TYPE_BY_TAG = {
    "article": "section",
    "section": "section",
    "p": "paragraph",
    "li": "list_item",
    "pre": "code",
    "blockquote": "quote",
    "td": "table_cell",
    "th": "table_header",
}
MAX_PARAGRAPHS = 160
MAX_CHUNKS = 80
MAX_CHUNK_CHARS = 1400


@dataclass
class ParsedParagraph:
    text: str
    heading_path: list[str]
    block_type: str = "paragraph"
    selector: str | None = None
    href: str | None = None
    role: str | None = None


@dataclass
class ParsedImage:
    order: int
    src: str | None
    alt: str | None
    title: str | None
    aria_label: str | None
    caption: str | None
    nearby_text: str | None
    status: str


@dataclass
class ParsedHtml:
    text: str
    headings: list[dict[str, Any]]
    paragraphs: list[ParsedParagraph]
    images: list[ParsedImage]
    warnings: list[dict[str, Any]]


class _ReadableHtmlParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._skip_depth = 0
        self._current_tag: str | None = None
        self._buffer: list[str] = []
        self._current_heading: tuple[int, str] | None = None
        self._heading_stack: list[tuple[int, str]] = []
        self._text_parts: list[str] = []
        self._last_text: str | None = None
        self.headings: list[dict[str, Any]] = []
        self.paragraphs: list[ParsedParagraph] = []
        self.images: list[ParsedImage] = []
        self.warnings: list[dict[str, Any]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        normalized = tag.lower()
        if normalized in SKIP_TAGS:
            self._skip_depth += 1
            return
        if self._skip_depth:
            return
        if normalized == "img":
            self._capture_image(attrs)
            return
        if normalized in HEADING_TAGS or normalized in BLOCK_TAGS:
            self._flush_buffer()
            self._current_tag = normalized
            self._buffer = []

    def handle_endtag(self, tag: str) -> None:
        normalized = tag.lower()
        if normalized in SKIP_TAGS and self._skip_depth:
            self._skip_depth -= 1
            return
        if self._skip_depth:
            return
        if normalized == self._current_tag:
            self._flush_buffer()
            self._current_tag = None

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        text = normalize_text(data)
        if not text:
            return
        self._text_parts.append(text)
        self._last_text = text
        if self._current_tag:
            self._buffer.append(text)

    def close(self) -> None:
        self._flush_buffer()
        super().close()

    def result(self) -> ParsedHtml:
        return ParsedHtml(
            text=normalize_text("\n".join(self._text_parts)),
            headings=self.headings,
            paragraphs=self.paragraphs,
            images=self.images,
            warnings=self.warnings,
        )

    def _flush_buffer(self) -> None:
        if not self._current_tag or not self._buffer:
            self._buffer = []
            return
        text = normalize_text(" ".join(self._buffer))
        self._buffer = []
        if not text:
            return
        if self._current_tag in HEADING_TAGS:
            level = int(self._current_tag[1:])
            self.headings.append({"level": level, "text": text})
            self._heading_stack = [item for item in self._heading_stack if item[0] < level]
            self._heading_stack.append((level, text))
            self._current_heading = (level, text)
            return
        self.paragraphs.append(
            ParsedParagraph(
                text=text,
                heading_path=[item[1] for item in self._heading_stack],
                block_type=BLOCK_TYPE_BY_TAG.get(self._current_tag, "paragraph"),
            )
        )

    def _capture_image(self, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {key.lower(): normalize_text(value or "") for key, value in attrs}
        src = first_non_empty(attr_map.get("src"), attr_map.get("data-src")) or None
        alt = first_non_empty(attr_map.get("alt")) or None
        title = first_non_empty(attr_map.get("title")) or None
        aria_label = first_non_empty(attr_map.get("aria-label")) or None
        readable = first_non_empty(alt, title, aria_label)
        status = "metadata_available" if readable else "unknown_metadata"
        image = ParsedImage(
            order=len(self.images),
            src=src,
            alt=alt,
            title=title,
            aria_label=aria_label,
            caption=None,
            nearby_text=self._last_text,
            status=status,
        )
        self.images.append(image)
        if readable:
            text = f"Image metadata: {readable}"
            self._text_parts.append(text)
            self.paragraphs.append(
                ParsedParagraph(
                    text=text,
                    heading_path=[item[1] for item in self._heading_stack],
                    block_type="image_metadata",
                )
            )
            return
        self.warnings.append(
            {
                "code": "IMAGE_METADATA_UNKNOWN",
                "message": "Image has no DOM-readable alt, title, or aria-label metadata.",
                "order": image.order,
                "recoverable": True,
            }
        )


def build_structured_page_context(input_data: dict[str, Any]) -> dict[str, Any]:
    session_id = read_str(input_data, "sessionId", "session_id") or ""
    url = read_str(input_data, "url") or ""
    title = read_str(input_data, "title") or domain_from_url(url) or "Untitled"
    domain = read_str(input_data, "domain") or domain_from_url(url) or "unknown"
    captured_at = read_str(input_data, "capturedAt", "captured_at") or utc_now()
    html_input = read_str(input_data, "html")
    parsed_html = parse_html(html_input) if html_input else ParsedHtml(text="", headings=[], paragraphs=[], images=[], warnings=[])

    cleaned_text = first_non_empty(
        read_str(input_data, "cleanedText", "cleaned_text"),
        parsed_html.text,
        read_str(input_data, "visibleText", "visible_text"),
        read_str(input_data, "selectedText", "selected_text"),
    )
    cleaned_text = normalize_text(cleaned_text)
    if not cleaned_text or len(cleaned_text) < 24:
        return error_result(ErrorCode.PAGE_CONTEXT_REQUIRED, "Page has no readable text.")

    headings = normalize_headings(input_data.get("headings") or parsed_html.headings)
    content_hash = "sha256_" + hashlib.sha256(canonical_hash_text(url, title, cleaned_text).encode("utf-8")).hexdigest()
    page_id = read_str(input_data, "pageId", "page_id") or "page_" + content_hash.removeprefix("sha256_")[:16]

    dom_signals = input_data.get("dom_signals")
    signal_paragraphs = dom_signal_paragraphs(dom_signals)
    if signal_paragraphs and (
        dom_signal_has_hint(dom_signals, "bili_video_detail")
        or dom_signal_has_hint(dom_signals, "bili_home_feed")
        or dom_signal_has_hint(dom_signals, "xhs_note_detail")
        or dom_signal_has_hint(dom_signals, "xhs_home_feed")
        or dom_signal_has_hint(dom_signals, "guancha_article_detail")
    ):
        parsed_paragraphs = signal_paragraphs
    else:
        parsed_paragraphs = signal_paragraphs + (parsed_html.paragraphs or split_text_into_paragraphs(cleaned_text))
    paragraphs = build_paragraphs(page_id, parsed_paragraphs)
    heading_tree = build_heading_tree(headings, paragraphs)
    chunks = build_chunks(page_id, paragraphs)
    annotations = build_annotations(paragraphs)
    summary_draft = build_summary_draft(title, paragraphs, chunks)

    structured_page = {
        "pageId": page_id,
        "sessionId": session_id,
        "url": url,
        "title": title,
        "domain": domain,
        "capturedAt": captured_at,
        "contentHash": content_hash,
        "metadata": build_metadata(input_data.get("metadata"), url, title, cleaned_text, paragraphs, headings, input_data.get("dom_signals")),
        "imageMetadata": build_image_metadata(parsed_html.images),
        "headingTree": heading_tree,
        "paragraphs": paragraphs,
        "chunks": chunks,
        "annotations": annotations,
        "summaryDraft": summary_draft,
    }
    return {"ok": True, "structuredPage": structured_page, "error": None, "warnings": parsed_html.warnings}


def parse_html(markup: str) -> ParsedHtml:
    parser = _ReadableHtmlParser()
    parser.feed(markup)
    parser.close()
    return parser.result()


def normalize_headings(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    headings: list[dict[str, Any]] = []
    for item in value[:80]:
        if not isinstance(item, dict):
            continue
        text = normalize_text(str(item.get("text") or ""))
        if not text:
            continue
        try:
            level = int(item.get("level") or 1)
        except (TypeError, ValueError):
            level = 1
        headings.append({"level": max(1, min(level, 6)), "text": text[:180]})
    return headings


def build_paragraphs(page_id: str, parsed_paragraphs: list[ParsedParagraph]) -> list[dict[str, Any]]:
    paragraphs: list[dict[str, Any]] = []
    for index, item in enumerate(parsed_paragraphs[:MAX_PARAGRAPHS]):
        text = normalize_text(item.text)
        min_length = 4 if item.role in {"bili_video_title", "bili_video_author", "bili_video_stats", "xhs_note_title", "xhs_note_author", "xhs_note_stats", "guancha_article_title", "guancha_article_meta"} else 16
        if len(text) < min_length:
            continue
        paragraph_id = f"pg_{page_id}_{len(paragraphs) + 1:04d}"
        paragraphs.append(
            {
                "paragraphId": paragraph_id,
                "pageId": page_id,
                "order": len(paragraphs),
                "text": text[:2400],
                "headingPath": item.heading_path[:6],
                "sourceBlockType": item.block_type,
                **({"selector": item.selector} if item.selector else {}),
                **({"href": item.href} if item.href else {}),
                **({"domSignalRole": item.role} if item.role else {}),
            }
        )
    return paragraphs


def dom_signal_paragraphs(value: Any) -> list[ParsedParagraph]:
    if not isinstance(value, dict):
        return []
    paragraphs: list[ParsedParagraph] = []
    seen: set[str] = set()
    bili_video_detail = dom_signal_has_hint(value, "bili_video_detail")
    bili_home_feed = dom_signal_has_hint(value, "bili_home_feed")
    xhs_note_detail = dom_signal_has_hint(value, "xhs_note_detail")
    xhs_home_feed = dom_signal_has_hint(value, "xhs_home_feed")
    guancha_article_detail = dom_signal_has_hint(value, "guancha_article_detail")

    for item in value.get("blocks", []) if isinstance(value.get("blocks"), list) else []:
        if not isinstance(item, dict):
            continue
        role = read_optional_str(item.get("role"))
        if bili_home_feed and role in {"bili_comment", "bili_recommendation", "bili_danmaku", "bili_promo", "auth_block"}:
            continue
        if bili_video_detail and role in {"bili_comment", "bili_recommendation", "bili_danmaku", "bili_promo"}:
            continue
        if xhs_note_detail and role in {"bili_comment", "xhs_comment", "xhs_footer", "xhs_sidebar", "xhs_feed_container", "auth_block"}:
            continue
        if xhs_home_feed and role in {"xhs_comment", "xhs_footer", "xhs_sidebar", "xhs_feed_container", "auth_block"}:
            continue
        if guancha_article_detail and role in {"guancha_comment", "guancha_recommendation", "guancha_video", "guancha_sidebar", "auth_block"}:
            continue
        text = normalize_text(str(item.get("text") or ""))
        min_length = 4 if role in {"bili_video_title", "bili_video_author", "bili_video_stats", "xhs_note_title", "xhs_note_author", "xhs_note_stats", "guancha_article_title", "guancha_article_meta"} else 16
        if len(text) < min_length:
            continue
        key = text[:140]
        if key in seen:
            continue
        seen.add(key)
        paragraphs.append(
            ParsedParagraph(
                text=text[:700],
                heading_path=["DOM signals", str(item.get("role") or "visible block")],
                block_type="list_item" if str(item.get("role") or "").endswith("card") else "section",
                selector=read_optional_str(item.get("selector")),
                href=read_optional_str(item.get("href")),
                role=role,
            )
        )

    for item in value.get("links", []) if isinstance(value.get("links"), list) else []:
        if not isinstance(item, dict):
            continue
        role = read_optional_str(item.get("role")) or "link"
        text = normalize_text(str(item.get("text") or ""))
        if role in {"profile_link"}:
            continue
        href = read_optional_str(item.get("href"))
        if len(text) < 4 or not href:
            continue
        if xhs_note_detail and role not in {"content_link"}:
            continue
        if role in {"auth_link", "link"} and len(text) < 8:
            continue
        line = f"{text} ({href})"
        key = line[:160]
        if key in seen:
            continue
        seen.add(key)
        paragraphs.append(
            ParsedParagraph(
                text=line[:520],
                heading_path=["DOM signals", role],
                block_type="list_item",
                selector=read_optional_str(item.get("selector")),
                href=href,
                role=role,
            )
        )
        if len(paragraphs) >= 80:
            break

    for item in value.get("meta", []) if isinstance(value.get("meta"), list) else []:
        if not isinstance(item, dict):
            continue
        name = normalize_text(str(item.get("name") or ""))
        content = normalize_text(str(item.get("content") or ""))
        if not name or len(content) < 12:
            continue
        key = f"{name}:{content[:120]}"
        if key in seen:
            continue
        seen.add(key)
        paragraphs.append(ParsedParagraph(text=f"{name}: {content}"[:520], heading_path=["DOM signals", "metadata"], block_type="paragraph", role="metadata"))
        if len(paragraphs) >= 100:
            break

    return paragraphs[:100]


def dom_signal_has_hint(value: Any, hint: str) -> bool:
    if not isinstance(value, dict):
        return False
    hints = value.get("pageStateHints")
    return isinstance(hints, list) and hint in {str(item) for item in hints}


def build_heading_tree(headings: list[dict[str, Any]], paragraphs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    heading_tree: list[dict[str, Any]] = []
    stack: list[dict[str, Any]] = []
    for index, heading in enumerate(headings):
        level = int(heading["level"])
        node = {
            "headingId": f"hd_{index + 1:04d}",
            "level": level,
            "text": heading["text"],
            "order": index,
            "paragraphIds": [],
        }
        while stack and int(stack[-1]["level"]) >= level:
            stack.pop()
        if stack:
            node["parentHeadingId"] = stack[-1]["headingId"]
        stack.append(node)
        heading_tree.append(node)

    for node in heading_tree:
        text = str(node["text"])
        node["paragraphIds"] = [p["paragraphId"] for p in paragraphs if text in p.get("headingPath", [])]
    return heading_tree


def build_chunks(page_id: str, paragraphs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    current: list[dict[str, Any]] = []
    current_chars = 0
    for paragraph in paragraphs:
        text = str(paragraph["text"])
        if current and current_chars + len(text) > MAX_CHUNK_CHARS:
            chunks.append(chunk_from_paragraphs(page_id, len(chunks), current))
            current = []
            current_chars = 0
        current.append(paragraph)
        current_chars += len(text)
    if current:
        chunks.append(chunk_from_paragraphs(page_id, len(chunks), current))

    for chunk in chunks[:MAX_CHUNKS]:
        for paragraph_id in chunk["paragraphIds"]:
            for paragraph in paragraphs:
                if paragraph["paragraphId"] == paragraph_id:
                    paragraph["chunkId"] = chunk["chunkId"]
    return chunks[:MAX_CHUNKS]


def chunk_from_paragraphs(page_id: str, order: int, paragraphs: list[dict[str, Any]]) -> dict[str, Any]:
    text = "\n".join(str(item["text"]) for item in paragraphs)
    first = paragraphs[0]
    return {
        "chunkId": f"ck_{page_id}_{order + 1:04d}",
        "pageId": page_id,
        "headingPath": first.get("headingPath", []),
        "text": text[:2200],
        "tokenEstimate": max(1, len(text) // 4),
        "order": order,
        "paragraphIds": [str(item["paragraphId"]) for item in paragraphs],
    }


def build_annotations(paragraphs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    annotations: list[dict[str, Any]] = []
    for paragraph in paragraphs:
        text = str(paragraph["text"])
        density = density_score(text)
        role = classify_role(text)
        importance = "high" if density >= 0.55 and len(text) >= 120 else "medium" if density >= 0.32 else "low"
        labels = [role]
        if paragraph.get("headingPath"):
            labels.append("sectioned")
        annotations.append(
            {
                "paragraphId": paragraph["paragraphId"],
                "chunkId": paragraph.get("chunkId"),
                "labels": labels,
                "importance": importance,
                "densityScore": density,
                "role": role,
                "confidence": 0.72 if role != "unknown" else 0.45,
            }
        )
    return annotations


def build_summary_draft(title: str, paragraphs: list[dict[str, Any]], chunks: list[dict[str, Any]]) -> dict[str, Any]:
    top_paragraphs = sorted(paragraphs, key=lambda p: density_score(str(p["text"])), reverse=True)[:5]
    key_points = [str(item["text"])[:180] for item in top_paragraphs[:4]]
    tldr_source = top_paragraphs[0]["text"] if top_paragraphs else paragraphs[0]["text"]
    return {
        "format": "json",
        "title": title,
        "tldr": str(tldr_source)[:240],
        "keyPoints": key_points,
        "structure": [
            {
                "headingPath": chunk.get("headingPath", []),
                "paragraphIds": chunk.get("paragraphIds", []),
                "summary": str(chunk.get("text", ""))[:180],
            }
            for chunk in chunks[:6]
        ],
        "suggestedQuestions": [
            "这篇内容的核心观点是什么？",
            "哪些段落最值得深入阅读？",
            "可以把这篇内容整理成思维导图吗？",
        ],
    }


def split_text_into_paragraphs(text: str) -> list[ParsedParagraph]:
    raw_parts = [normalize_text(part) for part in re.split(r"(?:\n{2,}|\r\n{2,})", text) if normalize_text(part)]
    if len(raw_parts) <= 1:
        raw_parts = sentence_windows(text)
    return [ParsedParagraph(text=part, heading_path=[], block_type="paragraph") for part in raw_parts[:MAX_PARAGRAPHS]]


def build_image_metadata(images: list[ParsedImage]) -> list[dict[str, Any]]:
    return [
        {
            "order": image.order,
            "src": image.src,
            "alt": image.alt,
            "title": image.title,
            "ariaLabel": image.aria_label,
            "caption": image.caption,
            "nearbyText": image.nearby_text,
            "status": image.status,
        }
        for image in images
    ]


def sentence_windows(text: str) -> list[str]:
    sentences = [part.strip() for part in re.split(r"(?<=[。！？.!?])\s+", text) if part.strip()]
    if len(sentences) <= 1:
        return [text[index : index + 700].strip() for index in range(0, len(text), 700) if text[index : index + 700].strip()]
    windows: list[str] = []
    current: list[str] = []
    current_chars = 0
    for sentence in sentences:
        if current and current_chars + len(sentence) > 700:
            windows.append(normalize_text(" ".join(current)))
            current = []
            current_chars = 0
        current.append(sentence)
        current_chars += len(sentence)
    if current:
        windows.append(normalize_text(" ".join(current)))
    return windows


def build_metadata(raw_metadata: Any, url: str, title: str, text: str, paragraphs: list[dict[str, Any]], headings: list[dict[str, Any]], dom_signals: Any = None) -> dict[str, Any]:
    metadata = raw_metadata.copy() if isinstance(raw_metadata, dict) else {}
    metadata.update(
        {
            "contentType": metadata.get("contentType") or infer_content_type(url, title, text),
            "wordCount": word_count(text),
            "paragraphCount": len(paragraphs),
            "headingCount": len(headings),
        }
    )
    if "language" not in metadata:
        metadata["language"] = "zh" if re.search(r"[\u4e00-\u9fff]", text) else "en"
    if isinstance(dom_signals, dict):
        hints = [str(item) for item in dom_signals.get("pageStateHints", []) if isinstance(item, str)]
        if hints:
            metadata["pageStateHints"] = sorted(set(hints))
        metadata["domSignalBlockCount"] = len(dom_signals.get("blocks", [])) if isinstance(dom_signals.get("blocks"), list) else 0
        metadata["domSignalLinkCount"] = len(dom_signals.get("links", [])) if isinstance(dom_signals.get("links"), list) else 0
    return metadata


def read_optional_str(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    text = normalize_text(value)
    return text or None


def infer_content_type(url: str, title: str, text: str) -> str:
    lowered = f"{url} {title} {text[:500]}".lower()
    if "github.com" in lowered or "readme" in lowered:
        return "readme"
    if "docs" in lowered or "documentation" in lowered or "api" in lowered:
        return "documentation"
    if "search" in lowered or "result" in lowered:
        return "search_result"
    return "article"


def classify_role(text: str) -> str:
    lowered = text.lower()
    if re.search(r"\b(for example|example|例如|举例)\b", lowered):
        return "example"
    if re.search(r"\b(step|first|second|procedure|步骤|首先|然后)\b", lowered):
        return "procedure"
    if re.search(r"\b(evidence|data|study|research|according to|证据|数据|研究)\b", lowered):
        return "evidence"
    if re.search(r"\b(argue|claim|therefore|because|观点|认为|因此|因为)\b", lowered):
        return "argument"
    if re.search(r"\b(is|are|means|defined as|定义|是指|意味着)\b", lowered):
        return "definition"
    if len(text) < 90:
        return "summary"
    return "unknown"


def density_score(text: str) -> float:
    words = re.findall(r"[\w\u4e00-\u9fff]+", text.lower())
    if not words:
        return 0.0
    unique_ratio = len(set(words)) / max(1, len(words))
    length_factor = min(1.0, len(text) / 500)
    score = (unique_ratio * 0.65) + (length_factor * 0.35)
    return round(max(0.0, min(1.0, score)), 3)


def word_count(text: str) -> int:
    chinese_chars = re.findall(r"[\u4e00-\u9fff]", text)
    latin_words = re.findall(r"[A-Za-z0-9_]+", text)
    return len(chinese_chars) + len(latin_words)


def normalize_text(value: str) -> str:
    text = html.unescape(value).replace("\xa0", " ")
    return text.encode("utf-8", errors="replace").decode("utf-8").strip()


def canonical_hash_text(url: str, title: str, text: str) -> str:
    return "\n".join([url.strip(), title.strip(), re.sub(r"\s+", " ", text).strip()])


def read_str(data: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def first_non_empty(*values: str | None) -> str:
    for value in values:
        if value and value.strip():
            return value.strip()
    return ""


def domain_from_url(url: str) -> str | None:
    parsed = urlparse(url)
    return parsed.netloc or None


def error_result(code: ErrorCode, message: str) -> dict[str, Any]:
    return {
        "ok": False,
        "structuredPage": None,
        "error": {"code": code.value, "message": message, "recoverable": True},
        "warnings": [],
    }
