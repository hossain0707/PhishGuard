"""Read-only PDF layout and completeness checks for the controlled 75-row sample."""
import json
import sys
import pdfplumber

with pdfplumber.open(sys.argv[1]) as pdf:
    texts = []
    for number, page in enumerate(pdf.pages, 1):
        text = page.extract_text() or ""
        assert f"Page {number} of {len(pdf.pages)}" in text, f"Missing page number {number}"
        assert "Date / time" in text and "Assessment" in text, f"Missing repeated header {number}"
        for char in page.chars:
            assert char["x0"] >= 0 and char["x1"] <= page.width + 0.5, f"Horizontal clipping on page {number}"
            assert char["top"] >= 0 and char["bottom"] <= page.height + 0.5, f"Vertical clipping on page {number}"
        texts.append(text)
    assert sum(text.count("Controlled PDF test assessment") for text in texts) == 75, "Missing report rows"
    print(json.dumps({"pages": len(pdf.pages), "rows": 75, "headers": "all repeated", "clipping": "none", "page_numbers": "all present"}))
