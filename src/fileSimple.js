
const vscode = require('vscode');
const { FileTreeDataProvider, FileItem } = require('./fileTreeDataProvider');
class UnusedImageTreeDataProvider extends FileTreeDataProvider {
	constructor(context) {
        super(context,'Image',
            (file,collapsibleState,options) => new FileItem(file,collapsibleState,options),
        );
  	}
}

class ImageUnusedPj {
    constructor(context){
        const treeProvider = new UnusedImageTreeDataProvider(context);
        this.treeProvider = treeProvider;
        this.treeViewer = vscode.window.createTreeView('imageUnused', {
            treeDataProvider: treeProvider,
        });
        context.subscriptions.push(this.treeViewer);
        // command
        context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.refreshUnusedImage', () => {
            treeProvider.refresh();
        }));
        
        context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.copyName', (item) => {
            vscode.env.clipboard.writeText(item.label);
        }));
        
    }
}

// for drawio
class FileDrawioTreeDataProvider extends FileTreeDataProvider {
    constructor(context){
        super(context,'Drawio',
            (file,collapsibleState,options) => new FileItem(file,collapsibleState,options),
        );
    }
}

class FileDrawioPj {
    constructor(context){
        const treeProvider = new FileDrawioTreeDataProvider(context);
        this.treeProvider = treeProvider;
        this.treeViewer = vscode.window.createTreeView('fileDrawio', {
            treeDataProvider: treeProvider,
        });
        context.subscriptions.push(this.treeViewer);

        context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.refreshFileDrawio', () => {
            treeProvider.refresh();
        }));
    }
}

// for code
class FileCodeTreeDataProvider extends FileTreeDataProvider {
    constructor(context){
        super(context,'Code',
            (file,collapsibleState,options) => new FileItem(file,collapsibleState,options),
        );
    }
}

class FileCodePj {
    constructor(context){
        const treeProvider = new FileCodeTreeDataProvider(context);
        this.treeProvider = treeProvider;
        this.treeViewer = vscode.window.createTreeView('fileCode', {
            treeDataProvider: treeProvider,
        });
        context.subscriptions.push(this.treeViewer);
        context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.refreshCode', () => {
            treeProvider.refresh();
        }));
    }
}

// for other
class FileOtherTreeDataProvider extends FileTreeDataProvider {
    constructor(context){
        super(context,'Other',
            (file,collapsibleState,options) => new FileItem(file,collapsibleState,options),
        );
    }
}

class FileOtherPj {
    constructor(context){
        const treeProvider = new FileOtherTreeDataProvider(context);
        this.treeProvider = treeProvider;
        this.treeViewer = vscode.window.createTreeView('fileOther', {
            treeDataProvider: treeProvider,
        });
        context.subscriptions.push(this.treeViewer);
        context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.refreshOther', () => {
            treeProvider.refresh();
        }));
    }
}

module.exports = {
    ImageUnusedPj,
    FileDrawioPj,
    FileCodePj,
    FileOtherPj
}
