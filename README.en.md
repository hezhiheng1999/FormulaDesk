# FormulaDesk

A portable, offline visual LaTeX editor for AI conversations and documents. Write math with a keyboard or visual templates, inspect the result, and copy text into your preferred application.

[中文说明](README.md) · [License](LICENSE) · [Security](SECURITY.md)

[Downloads](https://github.com/hezhiheng1999/FormulaDesk/releases/latest) · [Repository](https://github.com/hezhiheng1999/FormulaDesk) · [Actions](https://github.com/hezhiheng1999/FormulaDesk/actions)

## Run

**Windows floating window:** download `formuladesk-1.5.0-win-x64.zip` from the [latest release](https://github.com/hezhiheng1999/FormulaDesk/releases/latest), extract it completely to a writable folder, and double-click `FormulaDesk.exe`. Requires Windows 10/11 x64, .NET Framework 4.8 and an existing system WebView2 Runtime. The pin starts enabled. Copy, click the destination input and paste. The separate EXE attachment requires the files from the ZIP and cannot run alone. Runtime cache is stored in the adjacent `WebView2Data` folder. To keep a formula and note, save a worksheet.

**Browser edition:** extract `formuladesk-1.5.0-portable.zip` and open `index.html`. On Windows, `open-formuladesk.cmd` opens it with the default browser. No account, API key, package manager, or background server is required.

A prepared source ZIP also contains the generated HTML. When cloning the source repository, run `python build.py` using Python 3.10+. Build dependencies are vendored, so the normal build is offline. Node.js 20+ is required only for tests.

The interface is currently in Simplified Chinese. Browser behavior outside the tested environment is not certified; see [compatibility](docs/compatibility.md) and [testing](docs/testing.md).

## Use

1. Type in the formula field, use its mathematical keyboard, or choose a template.
2. Paste existing LaTeX into the source field when convenient.
3. Optionally add variable definitions, units, or a question.
4. Copy either raw LaTeX or the formula with context, then paste and inspect it in the destination application.

If automatic copying is unavailable, select **手动复制** (manual copy), press Ctrl/Command+C, and paste. The application does not read the clipboard to verify its contents. A successful browser API response is not a guarantee of what another application will paste.

The **恢复上次内容** control restores the formula and note after clearing the editor, loading an example, or opening a worksheet. Copy important work before closing or refreshing, or save a worksheet in the Windows edition.

## Windows shortcuts and worksheets

The Windows editor adapts to the display DPI. Ctrl+Alt+F shows or hides the editor. Launching it again from the same folder activates the existing editor for the current user and login session. Ctrl+S and Ctrl+O save and open a local UTF-8 worksheet containing the original LaTeX and note. Each file operation uses a native file picker. The size limit is 1 MiB.

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
```

These checks need no third-party Python or Node packages. Packaging is a separate release step; follow [releasing](docs/releasing.md) when preparing a new version. The packager uses explicit file lists, excludes local receipts/caches, and writes SHA-256 sums. See [project status and architecture](docs/project-context.md), [development](docs/development.md), and [contributing](CONTRIBUTING.md) (in Chinese).

MIT licensed. Built on the pinned MathLive 0.111.1 release. Dependency and font notices are preserved in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt) and embedded in the standalone HTML.
