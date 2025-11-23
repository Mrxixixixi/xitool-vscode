const { FileTreeDataProvider, FileItem } = require('./fileTreeDataProvider');
const vscode = require('vscode');
const utils = require('./utils');
const cm = require('./common');

class FileNoteTreeDataProvider extends FileTreeDataProvider{
    constructor(context){
        super(context,'Note',
            (file,collapsibleState,options) => new FileNoteItem(file,collapsibleState,options),
        );
    }
}

class FileNoteItem extends FileItem {
    constructor(file,collapsibleState,options) {
        super(file,collapsibleState,options);
        if(this.isFile){ 
            this.iconPath = this.getStatusIcon();
            this.command = {
                title: 'Open',
                command: 'xitool-vscode.openSource',
                arguments: [this]
            };
            if (this.data.type === 'drawio'){
                this.contextValue = 'NoteDrawioItem';
            }
        }
    }

    // Helper: Get icon based on file type and status
    getStatusIcon() {
        if(this.data.type === 'drawio'){
            return new vscode.ThemeIcon("file-media");
        }
        
        const statusIcons = {
            'check': new vscode.ThemeIcon("circle-filled", cm.cl.itemCheck),
            'uncheck': new vscode.ThemeIcon("circle-filled", cm.cl.itemUnCheck),
            'conflict': new vscode.ThemeIcon("circle-filled", cm.cl.itemConflict)
        };
        
        return statusIcons[this.data.status] || undefined;
    }
    getHtmlPath(){
        if (this.data.type === 'drawio' || this.data.status === 'conflict'){
            return this.data.status === 'conflict' ? super.getPath() : '';
        }
        return this.data.path.replace('.md','.html');
    }
    
    getMdPath(){
        if (this.data.type === 'drawio' || this.data.status === 'conflict'){
            return '';
        }
        return this.data.path;
    }

    // Helper: Get relative path from workspace root
    getRelativePath(){
        const rootPath = utils.Config.getRootPath();
        if (!rootPath) {
            return this.getPath();
        }
        const mpath = require('path');
        const fullPath = this.getPath();
        return mpath.relative(rootPath, fullPath).replace(/\\/g, '/'); // Use forward slashes for consistency
    }

    async createHtmlFile(){
        if (this.isFile){
            if (this.data.status !== 'conflict'){
                await utils.createHtmlFile(this.getMdPath());                
            }else{
                utils.Logger.error(`${this.label}.md not found.`);
                return this;
            }
        }else{
            const allFiles = this.data.getAllFile('Note',(name,value)=>value.status == 'uncheck' && value.type==='note');
            await Promise.all(allFiles.map(file=>utils.createHtmlFile(file + '.md')));            
        }
        setTimeout(() => {
            super.update('Html');
        }, 500); // HTML_EXPORT_DELAY from utils
        return this;
    }
    async replaceMathJaxPath(){
        if (this.isFile){
            if (this.data.status === 'check'){
                utils.replaceMathJaxPath(this.getHtmlPath());
                utils.Logger.info(`Replace MathJax path for ${this.label}.html successfully.`);
            }else{
                utils.Logger.error(`${this.label}.html not found.`);                
            }
        }else{
            const allFiles = this.data.getAllFile('Html');
            allFiles.forEach(file=>utils.replaceMathJaxPath(file));
        }
        return this;
    }
   
 
}

class FileNotePj {
    constructor(context){
        const treeProvider = new FileNoteTreeDataProvider(context);
        this.treeProvider = treeProvider;
        this.treeViewer = vscode.window.createTreeView('fileNote', {
            treeDataProvider: treeProvider,
        });
        context.subscriptions.push(this.treeViewer);
        
        this.registerCommands(context, treeProvider);
    }

    registerCommands(context, treeProvider) {
        const commands = [
            {
                id: 'xitool-vscode.refreshFileNote',
                handler: () => treeProvider.refresh()
            },
            {
                id: 'xitool-vscode.createHtmlFile',
                handler: (item) => item.createHtmlFile()
            },
            {
                id: 'xitool-vscode.replaceNoteMathJaxPath',
                handler: (item) => item.replaceMathJaxPath()
            },
            {
                id: 'xitool-vscode.openNoteInBrowser',
                handler: async (item) => {
                    if (item.data.status === 'check'){
                        utils.openInBrowser(item.getHtmlPath());
                    }else{
                        await item.createHtmlFile();
                        utils.openInBrowser(item.getHtmlPath());
                    }
                }
            },
            {
                id: 'xitool-vscode.openNoteHtml',
                handler: async (item) => {
                    if (item.data.status === 'conflict'){
                       await item.createHtmlFile();
                    }
                    vscode.commands.executeCommand('vscode.open', vscode.Uri.file(item.getHtmlPath()));
                }
            },
            {
                id: 'xitool-vscode.deleteNoteHtml',
                handler: (item) => {
                    if (item.data.status === 'uncheck'){
                        return;
                    }
                    item.deleteFile(item.getHtmlPath());
                }
            },
            {
                id: 'xitool-vscode.addFile',
                handler: (item) => item.addFile()
            },
            {
                id: 'xitool-vscode.copyRelativePath',
                handler: (item) => {
                    const relativePath = item.getRelativePath();
                    vscode.env.clipboard.writeText(relativePath);
                    vscode.window.showInformationMessage(`Copied: ${relativePath}`);
                }
            }
        ];

        commands.forEach(({ id, handler }) => {
            context.subscriptions.push(
                vscode.commands.registerCommand(id, handler)
            );
        });
    }
}

module.exports = {
    FileNotePj
}
