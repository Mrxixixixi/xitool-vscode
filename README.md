# xitool-vscode README

A set of tools for markdown notebook.

## Features

### Image 

1. paste image from clipboard
2. drag and drop image to the editor
3. filter unused images

Settings:

- `enableDropImage`: Enable the drag and drop image feature.
- `imagePathPattern`: The image path for pasted and dragged images.
  - `{filename}`: The name of the file in which the image is inserted.
  - `{datetime:YYYY-MM-DD-HH-mm-ss}`: The current time.
  - `{input}`: The input from the user.
- `imageInsertText`: The text to insert in the file when pasting or dragging an image.`{imagePath}` will be replaced by the image path specified in `imagePathPattern`.



### Markdown

1. filter html files 
2. filter markdown files

### Citation

1. citation auto-complete

Settings:

- `enableCite`: Whether to enable the citation auto-complete.
- `bibtexPath`: The path of the bibtex library used for citation auto-complete. If left empty, the extension will search the working folder. If no bibtex file found, this feature will be disabled.


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
