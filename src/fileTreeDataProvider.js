const vscode = require('vscode');
const { FmObj } = require("./fileSystem") ;
const mpath = require('path');
const cm = require("./common");
const utils = require('./utils');
const fs = require('fs');

// Constants
const FILE_UPDATE_DELAY = 500;
const FILE_DELETE_DELAY = 1000;
class FileTreeDataProvider{
    constructor(context,fileType,funcGetItem) {
        this.fileType = fileType;
        this.funcGetItem = funcGetItem;
    }

    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        // Ensure file system is initialized before accessing (lazy init)
        // Accessing FmObj.fileSt will trigger initialization if needed
        if (!element) {
            element = {data:FmObj.fileSt,path:FmObj.rootPath};
        }
        return Promise.resolve(this.getChildrenFileItem(element));
    }

    getChildrenFileItem(element) {
        const fst = element.data;
        const fileItem = [];
        Object.keys(fst[this.fileType]).forEach(file=>{
            fileItem.push(this.funcGetItem(file,vscode.TreeItemCollapsibleState.None,
                {data:fst[this.fileType][file],isFile:true,fileType:this.fileType,parent:fst,provider:this}));
        });
        Object.keys(fst.subfolders).forEach(folder=>{
            if (!this.validateFolder(fst.subfolders[folder])){
                return;
            }
            fileItem.push(this.funcGetItem(folder,vscode.TreeItemCollapsibleState.Collapsed,
                {data:fst.subfolders[folder],isFile:false,fileType:this.fileType,parent:fst,provider:this}));
        });
        return fileItem;
    }

    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;

    refresh() {
        FmObj.updateFileSt();
        this._onDidChangeTreeData.fire();
    }

    refreshUI(){
        this._onDidChangeTreeData.fire();
    }

    validateFolder(folder){
        if (folder[`has${this.fileType}`]){
            return true;
        }
        if (cm.generalStatus.note.isCleanMode ||this.fileType == 'Image'){
            return false;
        }
        let folderLevel = 0; let currentFolder = folder;
        while(currentFolder.parent){
            currentFolder = currentFolder.parent;
            folderLevel++;
        }
        if(folderLevel <= utils.Config.getConfig('workingFolderLevel')){
            return true;
        }
        return false;
    }

}

class FileItem extends vscode.TreeItem {
    constructor(label,collapsibleState,options) {
        super(label,collapsibleState);
        this.data = options.data;
        this.isFile = options.isFile;
        this.fileType = options.fileType;
        this.parent = options.parent;
        this.provider = options.provider;
        this.tooltip = this.getPath();
        if(this.isFile){ 
            this.contextValue = `${this.fileType}Item`;
            this.command = {
                    title: 'Open',
                    command: 'vscode.open',
                    arguments: [vscode.Uri.file(this.getPath())]
                };
        }else{
            this.contextValue = `${this.fileType}FolderItem`;
        }
    }
    getPath(){
        return this.data.path;
    }

    // Helper: Validate note file extension
    isValidNoteExtension(fileName) {
        return fileName.endsWith('.drawio') || fileName.endsWith('.drawio.png') || fileName.endsWith('.drawio.svg') || fileName.endsWith('.html') || fileName.endsWith('.md');
    }
    
    update(type = this.fileType){
        if (this.isFile){
            this.parent.updateFile(type);
        }else{
            this.data.updateFile(type);
        }
        this.provider.refreshUI();
        return this;
    }
    async addFile(){
        if (!this.isFile){
            const fileName = await vscode.window.showInputBox({
                prompt: 'Enter the file name(with extension .md, .drawio, .drawio.png, .drawio.svg)',
                placeHolder: 'filename'
            });
            if (!fileName || fileName.length == 0) {
                return;
            }
            const filePath = mpath.join(this.getPath(), fileName);
            
            // Validate file extension for Note type
            if (this.fileType === 'Note' && !this.isValidNoteExtension(fileName)) {
                vscode.window.showErrorMessage('Invalid extension: Only .drawio and .md are valid for Note files.');
                return;
            }
            fs.writeFileSync(filePath, '', 'utf8'); 
            setTimeout(() => {
                this.update();
                this.provider.refreshUI();
            }, FILE_UPDATE_DELAY);

            vscode.commands.executeCommand('vscode.open', vscode.Uri.file(filePath));
            
        }
        return this;
    }

    async addFolder(){        
        this.data.addFolder();
        this.provider.refreshUI();
        return this;
    }

    async deleteFile(filePath=this.getPath()){
        const result = await vscode.window.showWarningMessage(
            `Are you sure you want to delete ${filePath}?`,
            { modal: true },
            'Yes',
            'No'
        );
        if (result !== 'Yes') {
            return this;
        }
        fs.unlinkSync(filePath);
        setTimeout(() => {
            this.update();
            this.provider.refreshUI();
        }, FILE_DELETE_DELAY);
        return this;
    }
}

module.exports = { FileTreeDataProvider, FileItem };