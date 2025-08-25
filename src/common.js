const vscode = require('vscode');
const utils = require('./utils');

function initCommand(context){
    context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.revealInFileExplorer', (item) => {
        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(item.getPath()));
    }));
    context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.revealPicFolder', async (item) => {
        const picFolderPath = utils.getPicFolderPath(item.getPath()).absolute;
        await utils.createDir(picFolderPath);
        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(picFolderPath));
    }));
    context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.openSource', (item) => {
        vscode.commands.executeCommand('vscode.open', vscode.Uri.file(item.getPath()));
    }));
    context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.deleteFile', (item) => {
        item.deleteFile();
    }));      

}

const cl = {
    itemCheck: new vscode.ThemeColor("status.ItemCheck"),
    itemUnCheck: new vscode.ThemeColor("status.ItemUnCheck"),
    itemConflict: new vscode.ThemeColor("status.ItemConflict"),
    cleanMode: new vscode.ThemeColor("status.CleanMode"),
    mark: new vscode.ThemeColor("status.Mark")
}

class GeneralStatus{
    constructor(){
        this.note={isCleanMode:true}
    }
    setNoteModeClean(isCleanMode){
        this.note.isCleanMode=isCleanMode;
    }
}

const generalStatus=new GeneralStatus();

module.exports = { initCommand, cl, generalStatus };
