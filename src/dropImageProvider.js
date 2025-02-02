// drop image to vscode

const vscode = require('vscode');
const utils = require('./utils');
const mpath = require('path');

class DropImageProvider  {
	constructor(context){
		this.context = context;
	}
	async provideDocumentDropEdits(document, position, dataTransfer, token) {
		const files = await dataTransfer.get('text/uri-list').asString();
		
		const fileList = decodeURI(files).split('\r\n');
		console.log('drop fileList',fileList);
		const imagePathObj = await utils.getImageFFNAbs(true);
		const relativePath = mpath.dirname(imagePathObj.imagePath);
		const destPath = mpath.dirname(imagePathObj.imagePathAbs);
		let insertText = '';
		await utils.createDir(destPath);		
		await Promise.all(fileList.map(async (file) => {
			const filename = mpath.basename(file);
			const textPath = mpath.join(relativePath,filename);
			insertText += `![](${textPath})\n\n`;
			await vscode.workspace.fs.copy(vscode.Uri.parse(file), vscode.Uri.file(mpath.join(destPath, filename)), { overwrite: false }).then(() => {
				utils.Logger.info(`File copied: ${filename}`);				
			}).catch(err => {
				utils.Logger.error(`${err.code}: ${filename}`);
			});
		}));		
		console.log('insertText',insertText);
        return new vscode.DocumentDropEdit(insertText);
	}
}


module.exports = { DropImageProvider };