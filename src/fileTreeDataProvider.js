const vscode = require('vscode');
const { FmObj } = require("./fileSystem") ;
const mpath = require('path');
const cm = require("./common");
const utils = require('./utils');
const fs = require('fs');
class FileTreeDataProvider{
    rootPath = FmObj.getRootPath(); // path of the root folder
     // md files
    constructor(context,fileType,funcGetItem) {
        this.fileType = fileType;
        this.funcGetItem = funcGetItem;
        this.refresh();    
        
    }

    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            element = {data:FmObj.fileSt,path:FmObj.rootPath};
        }
        return Promise.resolve(this.getChildrenFileItem(element));
    }

    getChildrenFileItem(element) {
        const fst = element.data;
        const rootPath = element.path;
        const fileItem = [];
        for(const file in fst[this.fileType]){
            fileItem.push(this.funcGetItem(file,vscode.TreeItemCollapsibleState.None,
                {path:mpath.join(rootPath,file),data:fst[this.fileType][file],isFile:true,fileType:this.fileType,parent:fst,provider:this}));
        }
        for(const folder in fst.subfolders){ 
            if (!this.validateFolder(fst.subfolders[folder])){
                continue;
            }
            fileItem.push(this.funcGetItem(folder,vscode.TreeItemCollapsibleState.Collapsed,
                {path:mpath.join(rootPath,folder),data:fst.subfolders[folder],isFile:false,fileType:this.fileType,parent:fst,provider:this}));
        }
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
        this.path = options.path;
        this.data = options.data;
        this.isFile = options.isFile;
        this.fileType = options.fileType;
        this.parent = options.parent;
        this.provider = options.provider;
        this.tooltip = this.path;
        if(this.isFile){ 
            this.contextValue = `${this.fileType}Item`;
            this.command = {
                    title: 'Open',
                    command: 'vscode.open',
                    arguments: [vscode.Uri.file(this.path)]
                };
        }else{
            this.contextValue = `${this.fileType}FolderItem`;
        }
        if(this.contextValue != 'NoteItem'){return;}
        switch(this.data.status){
            case 'check':
                this.iconPath = new vscode.ThemeIcon("circle-filled",cm.cl.itemCheck);
                break;
            case 'uncheck':
                this.iconPath = new vscode.ThemeIcon("circle-filled",cm.cl.itemUnCheck);
                break;
            case 'conflict':
                this.iconPath = new vscode.ThemeIcon("circle-filled",cm.cl.itemConflict);
                break;
            case 'none':
                this.iconPath = new vscode.ThemeIcon("circle-outline");
                break;
        }
    }
    getPath(){
        return this.path;
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
                prompt: 'Enter the file name(without extension)',
                placeHolder: 'filename'
            });
            if (!fileName || fileName.length == 0) {
                return;
            }
            let filePath = '';
            switch(this.fileType){
                case 'Note':
                    filePath = mpath.join(this.path, `${fileName}.md`);
                    break;
                case 'Drawio':
                    filePath = mpath.join(this.path, `${fileName}.drawio`);
                    break;
                default:
                    filePath = mpath.join(this.path, fileName);
                    break;
            }
            fs.writeFileSync(filePath, '', 'utf8'); 
            setTimeout(() => {
                if (this.fileType === 'Note'){
                    this.update('Md');
                }else{
                    this.update();
                }
                this.provider.refreshUI();
            }, 500);
            
            vscode.workspace.openTextDocument(vscode.Uri.file(filePath)).then(doc => {
                vscode.window.showTextDocument(doc);
            });
        }
        return this;
    }

    async addFolder(){        
        this.data.addFolder();
        this.provider.refreshUI();
        return this;
    }

    async deleteFile(filePath=this.path){
        const result = await vscode.window.showWarningMessage(
            `Are you sure you want to delete ${mpath.basename(filePath)}?`,
            { modal: true },
            'Yes',
            'No'
        );
        if (result !== 'Yes') {
            return this;
        }
        fs.unlinkSync(filePath);
        setTimeout(() => {
            switch(mpath.extname(filePath)){
                case '.md':
                    this.update('Md');
                    break;
                case '.html':
                    this.update('Html');
                    break;
                default:
                    this.update();
                    break;
            }
            this.provider.refreshUI();
        }, 1000);
        return this;
    }
}

module.exports = { FileTreeDataProvider, FileItem };