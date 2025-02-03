// for Cite

const vscode = require('vscode');
const mpath = require('path');


class FileCiteTreeDataProvider  {
    constructor(context,dataStore){
        this.dataStore = dataStore;
    }

    getTreeItem(element) {
        return element;
    }

    getChildren(element) {
        if (element) {
            return Promise.resolve([]);;
        }
        const fileItem = [];
        this.dataStore.files.forEach(item => {
            fileItem.push(new FileCiteItem(item));
        });
        return Promise.resolve(fileItem);
    }

    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;

    update(dataStore){
        this.dataStore = dataStore;
        this._onDidChangeTreeData.fire();
    }
}
class FileCiteItem extends vscode.TreeItem {
    constructor(filePath){
        const parsedPath = mpath.parse(filePath);
        super(parsedPath.base, vscode.TreeItemCollapsibleState.None);
        this.path = filePath;
        this.tooltip = this.path;
        this.contextValue = 'CiteItem';
        this.command = {
            title: 'Open',
            command: 'vscode.open',
            arguments: [vscode.Uri.file(this.path)]
        };
    }

    getPath(){
        return this.path;
    }
}

module.exports = {
    FileCiteTreeDataProvider
}
