const vscode = require('vscode');
const cm = require("./common");

// Constants
const DEBOUNCE_DELAY_REFRESH = 150;
const DEBOUNCE_DELAY_CURSOR = 100;
const HEADER_REGEX = /^(#{1,6})\s+(.+)$/;

class OutlineProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.crtSection = -1;
        this.cache = null;
        this.cachedDocumentUri = null;
        this.cachedVersion = -1;
        this.refreshTimeout = null;
        this.selectionChangeTimeout = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        vscode.window.onDidChangeActiveTextEditor(() => {
            this.clearCache();
            this.updateSectionFromCursor();
            this.refresh();
        });
        
        vscode.workspace.onDidChangeTextDocument(e => {
            if (this.isActiveMarkdownDocument(e.document)) {
                if (e.document.version !== this.cachedVersion) {
                    this.clearCache();
                    this.debouncedRefresh();
                }
            }
        });

        vscode.window.onDidChangeTextEditorSelection(e => {
            if (this.isMarkdownDocument(e.textEditor.document)) {
                this.updateSectionFromCursor(e.textEditor);
            }
        });
    }

    // Helper: Check if document is markdown
    isMarkdownDocument(document) {
        return document && document.languageId === 'markdown';
    }

    // Helper: Check if document is the active markdown editor
    isActiveMarkdownDocument(document) {
        return document === vscode.window.activeTextEditor?.document && this.isMarkdownDocument(document);
    }

    // Helper: Get active markdown editor
    getActiveMarkdownEditor() {
        const editor = vscode.window.activeTextEditor;
        return this.isMarkdownDocument(editor?.document) ? editor : null;
    }

    // Helper: Clear cache
    clearCache() {
        this.cache = null;
        this.cachedDocumentUri = null;
        this.cachedVersion = -1;
        this.crtSection = -1;
    }

    // Helper: Generic debounce function
    debounce(timeoutRef, delay, callback) {
        if (this[timeoutRef]) {
            clearTimeout(this[timeoutRef]);
        }
        this[timeoutRef] = setTimeout(callback, delay);
    }

    updateSectionFromCursor(editor = null) {
        this.debounce('selectionChangeTimeout', DEBOUNCE_DELAY_CURSOR, () => {
            const activeEditor = editor || this.getActiveMarkdownEditor();
            if (!activeEditor) {
                return;
            }
            
            const cursorLine = Math.max(0, activeEditor.selection.active.line);
            this.revealSection(cursorLine);
        });
    }

    debouncedRefresh() {
        this.debounce('refreshTimeout', DEBOUNCE_DELAY_REFRESH, () => {
            this.refresh();
        });
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    parseHeaders(document) {
        // Check cache first
        if (this.isCacheValid(document)) {
            return this.cache;
        }

        const headers = this.extractHeaders(document);
        this.calculateEndLines(headers, document.lineCount);
        headers.reverse(); // Reverse for tree building
        
        // Cache the result
        this.cache = headers;
        this.cachedDocumentUri = document.uri.toString();
        this.cachedVersion = document.version;

        return headers;
    }

    // Helper: Check if cache is valid
    isCacheValid(document) {
        return this.cache && 
               this.cachedDocumentUri === document.uri.toString() &&
               this.cachedVersion === document.version;
    }

    // Helper: Extract headers from document
    extractHeaders(document) {
        const headers = [];
        const totalLines = document.lineCount;
        
        for (let i = 0; i < totalLines; i++) {
            const line = document.lineAt(i);
            const match = line.text.trim().match(HEADER_REGEX);
            if (match) {
                headers.push({
                    title: match[2],
                    level: match[1].length,
                    position: i,
                    endLine: -1, // Will be calculated later
                });
            }
        }
        
        return headers;
    }

    // Helper: Calculate endLine for each header
    calculateEndLines(headers, totalLines) {
        for (let i = 0; i < headers.length; i++) {
            headers[i].endLine = i < headers.length - 1 
                ? headers[i + 1].position - 1 
                : totalLines - 1;
        }
    }

    revealSection(lineNumber){
        this.crtSection = lineNumber;
        this.debouncedRefresh();
    }


    getTreeItem(element) {
        return element;
    }

    getChildren(element) {
        const editor = this.getActiveMarkdownEditor();
        if (!editor || editor.document.lineCount === 0) {
            return [];
        }

        const headers = element ? element.children : this.parseHeaders(editor.document);
        const parentLevel = element ? element.level : 0;
        
        return this.buildTreeItems(headers, parentLevel);
    }

    // Helper: Build tree items from headers
    buildTreeItems(headers, parentLevel) {
        const items = [];
        const pendingChildren = [];
        const sectionOptions = { crtSection: this.crtSection };
        
        for (const header of headers) {
            if (header.level > parentLevel + 1) {
                pendingChildren.push(header);
                continue;
            }
            
            // Add current header with pending children if any exist
            const hasChildren = pendingChildren.length > 0;
            items.push(this.createHeaderItem(header, hasChildren, pendingChildren.slice(), sectionOptions));
            
            // Clear pending children after adding header
            pendingChildren.length = 0;
        }
        
        // Handle remaining pending children
        if (pendingChildren.length > 0) {
            items.push(this.createGroupHeader(pendingChildren, parentLevel, sectionOptions));
        }
        
        return items.reverse();
    }

    // Helper: Create a header tree item
    createHeaderItem(header, hasChildren, children, sectionOptions) {
        return new Header(
            header.title,
            header.level,
            header.position,
            header.endLine,
            hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            children,
            sectionOptions
        );
    }

    // Helper: Create a group header for nested children
    createGroupHeader(children, parentLevel, sectionOptions) {
        const lastChild = children[children.length - 1];
        return new Header(
            " ",
            parentLevel + 1,
            lastChild.position,
            lastChild.position,
            vscode.TreeItemCollapsibleState.Expanded,
            children,
            sectionOptions
        );
    }
}

class Header extends vscode.TreeItem {
    constructor(label, level, position, endLine, collapsibleState, children, options) {
        super(label, collapsibleState);
        this.endLine = endLine;
        this.level = level;
        this.position = position;
        this.children = children;
        this.label = label;
        
        this.command = {
            command: 'xitool-vscode.revealLine',
            title: 'Jump to Header',
            arguments: [{ lineNumber: this.position }]
        };
       
        this.iconPath = this.getIconPath(options);
    }

    // Helper: Get icon path based on current section
    getIconPath(options) {
        const isCurrentSection = options && this.isInCurrentSection(options.crtSection);
        const iconColor = isCurrentSection ? cm.cl.mark : undefined;
        return new vscode.ThemeIcon('symbol-string', iconColor);
    }

    // Helper: Check if header is in current section
    isInCurrentSection(crtSection) {
        if (crtSection === undefined || crtSection < 0) {
            return false;
        }
        const sectionEnd = this.children[0] ? this.children[0].endLine : this.endLine;
        return crtSection >= this.position && crtSection <= sectionEnd;
    }
}

class OutlinePj {
    constructor(context) {
        this.outlineProvider = new OutlineProvider();
        this.treeViewer = vscode.window.createTreeView('moutline', {
            treeDataProvider: this.outlineProvider,
        });
        context.subscriptions.push(this.treeViewer);
        this.context = context;
        
        this.registerCommands(context);
    }

    registerCommands(context) {
        context.subscriptions.push(
            vscode.commands.registerCommand('xitool-vscode.revealLine', (args) => {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    editor.revealRange(
                        new vscode.Range(args.lineNumber, 0, args.lineNumber, 0), 
                        vscode.TextEditorRevealType.AtTop
                    );
                }
            })
        );
    }
}

module.exports = {OutlinePj };