const { FileTreeDataProvider, FileItem } = require('./fileTreeDataProvider');
const vscode = require('vscode');
const utils = require('./utils');

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
            this.command = {
                title: 'Open',
                command: 'xitool-vscode.openSource',
                arguments: [this]
            };
        }
    }
    getHtmlPath(){
        return this.path+'.html';
    }
    getMdPath(){
        if(this.isFile){
            return this.path+'.md';
        }else{
            return super.getPath();
        }
    }
    getPath(){
        if(this.data.hasMd){
            return this.getMdPath();
        }else{
            return this.getHtmlPath();
        }
    }
    async createHtmlFile(){
        if (this.isFile){
            if (this.data.hasMd){
                await utils.createHtmlFile(this.getMdPath());                
            }else{
                vscode.window.showErrorMessage(`${this.label}.md not found.`);
                return this;
            }
        }else{
            const allFiles = this.data.getAllFile('Note',(name,value)=>value.status == 'uncheck');
            await Promise.all(allFiles.map(file=>utils.createHtmlFile(file+'.md')));            
        }
        setTimeout(() => {
            super.update('Html');
        }, 500);
        return this;
    }
    async replaceMathJaxPath(){
        if (this.isFile){
            if (this.data.hasHtml){
                utils.replaceMathJaxPath(this.getHtmlPath());
                vscode.window.showInformationMessage(`Replace MathJax path for ${this.label}.html successfully.`);
            }else{
                vscode.window.showErrorMessage(`${this.label}.html not found.`);
                
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
        // command
        // for all
        context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.refreshFileNote', () => {
            treeProvider.refresh();
        }));
        context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.createHtmlFile', (item) => {
          
            item.createHtmlFile();
        }));
        context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.replaceNoteMathJaxPath', (item) => {
            item.replaceMathJaxPath();
        }));
        //for file
        context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.openNoteInBrowser', async (item) => {
            if (item.data.hasHtml){
                utils.openInBrowser(item.getHtmlPath());
            }else{
                await item.createHtmlFile();
                utils.openInBrowser(item.getHtmlPath());
            }
        }));
        context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.openNoteHtml', (item) => {
            if (!item.data.hasHtml){
                item.createHtmlFile();
            }
            vscode.commands.executeCommand('vscode.open', vscode.Uri.file(item.getHtmlPath()));
        }));
        context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.deleteNoteHtml', (item) => {
            item.deleteFile(item.getHtmlPath());
        }));
        context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.deleteNoteMd', (item) => {
            item.deleteFile(item.getMdPath());
        }));
        // for folder
        context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.addFile', (item) => {
            item.addFile();
        }));
    }
}

module.exports = {
    FileNotePj
}
