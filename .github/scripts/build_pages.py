from pathlib import Path
import shutil
import sys


ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = ROOT / "templates" / "index.html"
REPLACEMENTS = {
    "{{ url_for('static', filename='imageshop-icon.svg') }}": "static/imageshop-icon.svg",
    "{{ url_for('static', filename='css/style.css') }}": "static/css/style.css",
    "{{ url_for('static', filename='js/main.js') }}": "static/js/main.js",
}


def build(destination: Path) -> None:
    html = TEMPLATE.read_text(encoding="utf-8")
    for template_url, static_url in REPLACEMENTS.items():
        html = html.replace(template_url, static_url)
    if "{{" in html or "}}" in html:
        raise ValueError("Unresolved Flask template expression in index.html")

    destination.mkdir(parents=True, exist_ok=True)
    (destination / "index.html").write_text(html, encoding="utf-8")
    (destination / ".nojekyll").touch()
    (destination / "static").mkdir(exist_ok=True)
    shutil.copytree(ROOT / "static", destination / "static", dirs_exist_ok=True)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: build_pages.py DESTINATION")
    build(Path(sys.argv[1]).resolve())
