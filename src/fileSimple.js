const vscode = require('vscode');
const { FileTreeDataProvider, FileItem } = require('./fileTreeDataProvider');

// Helper: Create a simple file tree provider
function createSimpleFileTreeProvider(fileType) {
    return class extends FileTreeDataProvider {
        constructor(context) {
            super(context, fileType, (file, collapsibleState, options) => 
                new FileItem(file, collapsibleState, options)
            );
        }
    };
}

// Helper: Create a file project with tree view and refresh command
function createFileProject(viewId, fileType, refreshCommandId, additionalCommands = []) {
    const TreeDataProvider = createSimpleFileTreeProvider(fileType);
    
    return class {
        constructor(context) {
            const treeProvider = new TreeDataProvider(context);
            this.treeProvider = treeProvider;
            this.treeViewer = vscode.window.createTreeView(viewId, {
                treeDataProvider: treeProvider,
            });
            context.subscriptions.push(this.treeViewer);
            
            // Register refresh command
            context.subscriptions.push(
                vscode.commands.registerCommand(refreshCommandId, () => {
                    treeProvider.refresh();
                })
            );
            
            // Register additional commands
            additionalCommands.forEach(({ commandId, handler }) => {
                context.subscriptions.push(
                    vscode.commands.registerCommand(commandId, handler)
                );
            });
        }
    };
}

class ImageUnusedPj extends createFileProject('imageUnused', 'Image', 'xitool-vscode.refreshUnusedImage', [
    {
        commandId: 'xitool-vscode.copyName',
        handler: (item) => vscode.env.clipboard.writeText(item.label)
    }
]) {}

class FileDrawioPj extends createFileProject('fileDrawio', 'Drawio', 'xitool-vscode.refreshFileDrawio') {}

class FileCodePj extends createFileProject('fileCode', 'Code', 'xitool-vscode.refreshCode') {}

class FileOtherPj extends createFileProject('fileOther', 'Other', 'xitool-vscode.refreshOther') {}

module.exports = {
    ImageUnusedPj,
    FileDrawioPj,
    FileCodePj,
    FileOtherPj
}
