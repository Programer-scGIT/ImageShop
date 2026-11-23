# ImageShop

ImageShop is a browser-based raster graphics editor built with Flask, HTML, CSS, JavaScript, and the Canvas API. The interface is currently available in Russian and English, with additional language options in the application.

## Features

- Layer-based drawing with visibility, opacity, masks, and reordering.
- Brush, pencil, eraser, airbrush, glow brush, pixel brush, blur, dodge, and burn tools.
- Shapes, selections, text, fill, eyedropper, crop, and linear/radial gradient tools.
- Undo and redo, image import/export, and `.ishp` project files.
- Keyboard shortcuts and configurable interface settings.

## Requirements

- Python 3.10 or later
- pip

## Run locally

```bash
python -m venv .venv
```

Activate the virtual environment:

```bash
# macOS/Linux
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1
```

Install dependencies and start the application:

```bash
python -m pip install -r requirements.txt
python app.py
```

Open <http://127.0.0.1:5000/> in a browser. The Flask development server is intended for local development, not public production hosting.

## Publish with GitHub Pages

The editor can also run as a static site; GitHub Pages does not run the Flask server. A GitHub Actions workflow builds the static site from the Flask template whenever changes are pushed to `main` and enables Pages for the repository.

If automatic enablement is unavailable for the repository, open **Settings → Pages** and choose **GitHub Actions** as the build and deployment source. Push to `main` or run the **Deploy ImageShop to GitHub Pages** workflow manually. Once deployment succeeds, the site is available at <https://programer-scgit.github.io/ImageShop/>.

## Project layout

- `app.py` — Flask application and routes.
- `templates/` — application HTML.
- `static/css/` — interface styles.
- `static/js/` — editor, canvas tools, layers, settings, and file handling.
- `static/imageshop-icon.svg` — application icon.
- `.github/workflows/pages.yml` — automated GitHub Pages deployment.

## Notes

The editor stores user settings and optional session data in the browser. Image documents are handled locally by the browser unless the user explicitly exports them.

## License

ImageShop is distributed under the MIT License. See [LICENSE](./LICENSE).
