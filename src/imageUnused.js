
const vscode = require('vscode');
const { FileTreeDataProvider, FileItem } = require('./fileTreeDataProvider');
class UnusedImageTreeDataProvider extends FileTreeDataProvider {
	constructor(context) {
        super(context,'Image',
            (file,collapsibleState,options) => new ImageItem(file,collapsibleState,options),
        );
  	}
}

class ImageItem extends FileItem {
	constructor( label, collapsibleState, options
) {
		super(label, collapsibleState,options);       
        if (this.isFile){
            this.command = {
                title: 'Open',
                command: 'vscode.open',
                arguments: [vscode.Uri.file(this.path)]
            };
        }

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
            (file,collapsibleState,options) => new FileDrawioItem(file,collapsibleState,options),
        );
    }
}
class FileDrawioItem extends ImageItem {
    constructor(label, collapsibleState, options){
        super(label, collapsibleState, options);
        if (this.isFile){
            this.command = {
                title: 'Open',
                command: 'vscode.open',
                arguments: [vscode.Uri.file(this.path)]
            };
        }
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

module.exports = {
    ImageUnusedPj,
    FileDrawioPj
}
