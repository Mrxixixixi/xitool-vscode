

const vscode = require('vscode');
const child_process = require('child_process');
const fs = require('fs');
const fse = require('fs-extra');
const mpath = require('path');
const {DateTime} = require('luxon');

class Logger {
	static channel;
	static info(message,...items) {
		Logger.channel.info('xitool-vscode:'+message);
		vscode.window.showInformationMessage('xitool-vscode:'+message);
	}
	static error(message,...items) {
		Logger.channel.error('xitool-vscode:'+message);
		vscode.window.showErrorMessage('xitool-vscode:'+message);
	}
}

class Config {
	static getConfig(field) {
		const result = vscode.workspace.getConfiguration('xitool-vscode')[field];
		if (typeof result === 'string') {
			return result.trim();
		}
		return result;
	}
	static getRootPath(){
		return vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
	}
}

// from cross-note 
function openInBrowser(filePath){
	if (process.platform === 'win32') {
		if (filePath.match(/^[a-zA-Z]:\\/)) {
		  filePath = 'file:///' + filePath;
		}
		if (filePath.startsWith('file:///')) {
		  return child_process.execFile('explorer.exe', [filePath]);
		} else {
		  return child_process.exec(`start ${filePath}`);
		}
	  } else if (process.platform === 'darwin') {
		child_process.execFile('open', [filePath]);
	  } else {
		child_process.execFile('xdg-open', [filePath]);
	  }
}

function replaceText(path,oldText,newText){
	try{
		const html = fs.readFileSync(path, 'utf8');
		const formattedHtml = html.replace(oldText, newText);
		fs.writeFileSync(path, formattedHtml, 'utf8');
	}catch(e){
		Logger.error(e);
		return false;
	}
	return true;
}

// function replaceAllMathJaxPath(item){
// 	if (item.isFile){
// 		replaceMathJaxPath(item.path);
// 	}else{
// 		const allFiles = getAllFile(item.path,file => file.endsWith('.html'));
// 		allFiles.forEach(file => {
// 			replaceMathJaxPath(file.path);
// 		});    
// 	}
// }

function replaceMathJaxPath(path){
	console.log("replaceMathJaxPath path:",path);
    const mathJaxPath = Config.getConfig('MathJaxPath');
    if (!mathJaxPath || mathJaxPath.length == 0){
        return;
    }   
    replaceText(path,/<script type="text\/javascript" async="" src="(.+).js"/,`<script type="text/javascript" async="" src="${mathJaxPath}"`);
}


async function createHtmlFile(path){
	if (!path.endsWith('.md')){
		return;
	}
	const filepath ='file:///'+path;
	vscode.commands.executeCommand('_crossnote.htmlExport',filepath,true).then(() => {
		setTimeout(() => {
			console.log("createHtmlFile filepath:",filepath);
			// Logger.info(` Create ${path.replace('.md','.html')} successfully.`);
			replaceMathJaxPath(path.replace('.md','.html'));
		}, 500);
	});
	return true;
}

function getAllFile(rootPath,validate){
	
	const files = fs.readdirSync(rootPath);
	const result = [];
	files.forEach(file => {
		const filePath = mpath.join(rootPath,file);
		if(fs.statSync(filePath).isDirectory()){
			result.push(...getAllFile(filePath,validate));
		}else{
			if(validate(filePath)){
				result.push(filePath);
			}
		}
	});
	return result;
}

function createDir(dirpath) {
	return new Promise((resolve, reject) => {
		fse.ensureDir(dirpath, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}



async function getImageFFNAbs(isOnlyPath=false) {
	// get file name
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}	
	if(editor.document.uri && editor.document.uri.scheme === 'untitled'){
		Logger.info('Please save the file first!');
		return;
	}
	const fullfileName = editor.document.fileName;
	const parsedFileName = mpath.parse(fullfileName);

	// handle image name
	const imagePathPattern = Config.getConfig('imagePathPattern');
	const datetime = DateTime.now().toFormat( imagePathPattern.match('{datetime:(.+?)}')[1]);
	var imagePath = imagePathPattern.replace('{filename}', parsedFileName.name).
		replace(/{datetime:(.+?)}/, datetime);	

	if (imagePath.match('{input}') && !isOnlyPath){
		const inputText = await vscode.window.showInputBox({
			placeHolder: 'input',
			prompt: '{input} of image name',
		});
		imagePath = imagePath.replace('{input}', inputText);
	}
	var imagePathAbs =imagePath
	if (!mpath.isAbsolute(imagePath)){
		imagePathAbs = mpath.join(parsedFileName.dir, imagePath);
	}
	if (mpath.extname(imagePath) == ''){
		imagePath =imagePath+'.png';
		imagePathAbs =imagePathAbs+'.png';
	}
	return {imagePath:imagePath,imagePathAbs:imagePathAbs};
}

module.exports = { Logger, Config, openInBrowser, replaceText, replaceMathJaxPath,createHtmlFile,getAllFile,createDir,getImageFFNAbs };
