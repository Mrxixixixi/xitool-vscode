const vscode = require('vscode');
const cm = require("./common");
class OutlineProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.crtSection = -1; // Current section line number
        // Register editor change listener
        vscode.window.onDidChangeActiveTextEditor(() => {
            this.crtSection = -1; // Reset current section when editor changes
            this.refresh();
        });
        
        // Register document change listener
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document === vscode.window.activeTextEditor?.document) {
                this.refresh();
            }
        });
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    revealSection(lineNumber){
        this.crtSection = lineNumber;
        this.refresh();
    }


    getTreeItem(element) {
        return element;
    }

    getChildren(element) {
        console.log('OutlinePj getChildren', element);
        const childElems = [];
        const childrens =element? element.children:[];
        if (!element) {
            if (!vscode.window.activeTextEditor || 
                vscode.window.activeTextEditor.document.languageId !== 'markdown') {
                return [];
            }

            const document = vscode.window.activeTextEditor.document;
            const totalLines = document.lineCount;
            if (totalLines === 0) {
                return [];
            }
            
            // Parse all headers first
            for (let i = totalLines-1; i >-1; i--) {
                const match = document.lineAt(i).text.trim().match(/^(#{1,6})\s+(.+)$/);
                if (!match) {
                    continue; // Skip lines that are not headers
                }                
                childrens.push({
                    title: match[2],
                    level: match[1].length,
                    position: i,
                    endLine: childrens.length > 0 ? childrens.at(-1).position-1 : totalLines-1,
                });
            }
        }
        console.log('OutlinePj getChildren childrens', childrens);
        const parentLevel =element? element.level: 0;
        const childchildren = [];
        for (const child of childrens) {
            if (child.level> parentLevel+1){
                childchildren.push(child);
                continue;
            }
            childElems.push(new Header(
                child.title,
                child.level,
                child.position,
                child.endLine,
                childchildren.length >0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                childchildren.slice(),
                { crtSection:this.crtSection}
            ));
            childchildren.length = 0; // Reset for next sibling            
        }
        if (childchildren.length > 0) {
            childElems.push(new Header(
                " ",
                parentLevel + 1,
                childrens.at(-1).position,
                childrens.at(-1).position,
                vscode.TreeItemCollapsibleState.Expanded,
                childchildren,
                { crtSection:this.crtSection}
            ));
        }
        console.log('OutlinePj getChildren childElems', childElems);
        return childElems.reverse(); // Reverse to maintain order from top to bottom
    }
}

class Header extends vscode.TreeItem {
    constructor(label, level, position, endLine,collapsibleState, children,options) {
        super(label, collapsibleState);
        this.endLine = endLine;
        this.level = level;
        this.position = position;
        this.children = children;
        this.label = label;
        
        this.command = {
            command: 'xitool-vscode.revealLine',
            title: 'Jump to Header',
            arguments: [{
                lineNumber: this.position,               
            }]
        };
       
        if (options && (options.crtSection >= this.position) && (options.crtSection <= (this.children[0]? this.children[0].endLine:endLine))) {
            console.log('OutlinePj Header current section', this,  options.crtSection);
            this.iconPath = new vscode.ThemeIcon('symbol-string',cm.cl.mark);
        }else {
            this.iconPath = new vscode.ThemeIcon('symbol-string');
        }
    }

}

class OutlinePj {
    constructor(context) {
        console.log('OutlinePj init');
        this.outlineProvider = new OutlineProvider();
        this.treeViewer = vscode.window.createTreeView('moutline', {
            treeDataProvider: this.outlineProvider,
        });
        context.subscriptions.push(this.treeViewer);
        
        // Register commands
        context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.revealLine', (args) => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                editor.revealRange(new vscode.Range(args.lineNumber,0,args.lineNumber,0), vscode.TextEditorRevealType.AtTop);
            }
        }));

        context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.revealOutline', (args) => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const pos = editor.selection.start.line;
                this.outlineProvider.revealSection(pos);
                console.log('revealSection', pos);
            }
        }));
    }
}

module.exports = {OutlinePj };