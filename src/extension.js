// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const { ImageUnusedPj, FileDrawioPj } = require('./imageUnused');
const { FileNotePj } = require('./fileNote');
const { pasteImage } = require('./pasteImage');
const utils = require('./utils');
const { initCommand ,generalStatus} = require('./common');
const {FmObj} = require('./fileSystem');
const {CiteObj} = require('./citeManager');
const {DropImageProvider} = require('./dropImageProvider');
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	utils.Logger.channel = vscode.window.createOutputChannel('xitool-vscode', { log: true });
	context.subscriptions.push(utils.Logger.channel);
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	utils.Logger.info('Extension "xitool-vscode" is now active!');

	context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.pasteImage', pasteImage));
	initCommand(context);
	console.log("initCommand init");

	// for sidebar unused image
	const imageUnusedPj = new ImageUnusedPj(context);
	console.log("ImageUnusedPj init");
	// for sidebar file note
	const fileNotePj = new FileNotePj(context);
	console.log("FileNotePj init");
	// for sidebar file drawio
	const fileDrawioPj = new FileDrawioPj(context);
	console.log("FileDrawioPj init");
	context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.addFolder', (item) => {
        if (item){
            item.addFolder();
        }else{
            FmObj.fileSt.addFolder();
            fileNotePj.treeProvider.refreshUI();
            fileDrawioPj.treeProvider.refreshUI();
        }
    }));
	console.log("addFolder init");
	try{
		const citeObj = new CiteObj(context);
		console.log("CiteObj init");
	}catch(e){
		utils.Logger.error('CiteObj init error:'+e);
	}

	// mode 
	context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.setNoteModeWork', () => {
        vscode.commands.executeCommand('setContext', 'xitool-vscode.noteModeClean', false);
        generalStatus.setNoteModeClean(false);
		fileNotePj.treeProvider.refreshUI();
		fileDrawioPj.treeProvider.refreshUI();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('xitool-vscode.setNoteModeClean', () => {
        vscode.commands.executeCommand('setContext', 'xitool-vscode.noteModeClean', true);
        generalStatus.setNoteModeClean(true);
		fileNotePj.treeProvider.refreshUI();
		fileDrawioPj.treeProvider.refreshUI();
    }));
    vscode.commands.executeCommand('xitool-vscode.setNoteModeClean');
	console.log("setNoteModeClean init");
	// drop image to vscode
	if (utils.Config.getConfig('enableDropImage')){
		console.log('enableDropImage',utils.Config.getConfig('enableDropImage'));
		const dropImageProvider = new DropImageProvider(context);
		context.subscriptions.push(vscode.languages.registerDocumentDropEditProvider('markdown',dropImageProvider));
		console.log("DropImageProvider init");
	}
}
// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
