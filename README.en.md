# FormulaDesk

A portable, offline visual LaTeX editor for AI conversations and documents. Write math with a keyboard or visual templates, inspect the result, and copy text into your preferred application.

[中文说明](README.md) · [License](LICENSE) · [Security](SECURITY.md)

[Downloads](https://github.com/hezhiheng1999/FormulaDesk/releases/latest) · [Repository](https://github.com/hezhiheng1999/FormulaDesk) · [Actions](https://github.com/hezhiheng1999/FormulaDesk/actions)

## Run

Download a portable ZIP from the [latest release](https://github.com/hezhiheng1999/FormulaDesk/releases/latest), extract it completely, and open `index.html` in a browser. On Windows, `open-formuladesk.cmd` opens that file with the default browser. No account, API key, runtime installation, package manager, or background server is required.

A prepared source ZIP also contains the generated HTML. When cloning the source repository, run `python build.py` using Python 3.10+. Build dependencies are vendored, so the normal build is offline. Node.js 20+ is required only for tests.

The interface is currently in Simplified Chinese. Browser behavior outside the tested environment is not certified; see [compatibility](docs/compatibility.md) and [testing](docs/testing.md).

## Use

1. Type in the formula field, use its mathematical keyboard, or choose a template.
2. Paste existing LaTeX into the source field when convenient.
3. Optionally add variable definitions, units, or a question.
4. Copy either raw LaTeX or the formula with context, then paste and inspect it in the destination application.

If automatic copying is unavailable, select **手动复制** (manual copy), press Ctrl/Command+C, and paste. The application does not read the clipboard to verify its contents. A successful browser API response is not a guarantee of what another application will paste.

The **恢复上次内容** control restores the formula and note before the most recent clear/example replacement. It is not persistent history. Unsaved inputs are not stored; copy important work before closing or refreshing.

## Boundaries

- At most 10,000 JavaScript string units for a formula and separately for a note; explicit bracket/group depth and consecutive control-word chains are capped at 64. This is a resource guard, not a full TeX semantic analysis.
- Oversized, incomplete, or unknown source is retained. Previewing is paused rather than silently repairing and overwriting it.
- Formula links, HTML extension rendering, speech hooks, and remote resources are disabled.
- No AI integration, mathematical correctness checking, OCR, handwriting recognition, or full-document typesetting is provided.
- The destination controls whether LaTeX is rendered and how submitted data is processed.

## Develop

```text
node --test
python -m unittest discover -s tests -p "test_*.py"
python build.py
python checks/check_bundle.py
python tools/package_release.py
```

These checks need no third-party Python or Node packages. The release packager uses explicit file lists, excludes local receipts/caches, and writes SHA-256 sums. See [development](docs/development.md), [contributing](CONTRIBUTING.md), and [releasing](docs/releasing.md).

MIT licensed. Built on the pinned MathLive 0.111.1 release. Dependency and font notices are preserved in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt) and embedded in the standalone HTML.
