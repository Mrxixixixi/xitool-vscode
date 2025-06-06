# xitool-vscode README

A set of tools for markdown notebook.

## Features

### Image 

1. paste image from clipboard, the default keybinding is `ctrl+alt+v`.
2. drag and drop image to the editor (hold `shift` to drag and drop).
3. filter unused images

Settings:

- `enableDropImage`: Enable the drag and drop image feature.
- `imagePathPattern`: The image path for pasted and dragged images.
  - `{filename}`: The name of the file in which the image is inserted.
  - `{datetime:yyyy-LL-dd-hh-mm-ss}`: The current time. Ref to https://luxon.nodejs.cn/formatting for other supported formats.
  - `{input}`: The input from the user.
- `imageInsertText`: The text to insert in the file when pasting or dragging an image.`{imagePath}` will be replaced by the image path specified in `imagePathPattern`.

Attention:

- The name of images should not contain spaces or Chinese characters.

### Markdown

1. filter html files 
2. filter markdown files

### Citation

1. citation auto-complete

Settings:

- `enableCite`: Whether to enable the citation auto-complete.
- `bibtexPath`: The path of the bibtex library(.bib) used for citation auto-complete. If left empty, the extension will search the working folder. If no bibtex file found, this feature will be disabled.
- `citePattern`: The pattern of the citation. `{title}`, `{author}`, `{journal}`, `{date}`, `{DOI}`,`volume`,`page`.

Attention:

- Make sure each terms in the bibtex file has citation key.
- To enable quick suggestion for Markdown, add into `settings.json`:

```json
"[markdown]": {
  "editor.quickSuggestions": true
}
```

### MathJax

1. replace MathJax library in html files

Settings:

- `mathJaxPath`: The path of the MathJax library. This is used to for replacing the mathjax library in the html files.


## reference

- The feature of pasting image from clipboard is inspired by [Paste Image](https://github.com/mushanshitiancai/vscode-paste-image).
- The feature of creating html files from markdown files requires the extension [Markdown Preview Enhanced](https://github.com/shd101wyy/vscode-markdown-preview-enhanced).

## Release Notes

### 0.0.3

Initial release of xitool-vscode.

---

**Enjoy!**
