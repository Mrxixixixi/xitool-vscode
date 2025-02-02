const vscode = require('vscode');
const fs = require('fs-extra');
const path = require('path');
const { Logger, Config } = require('./utils');
const { spawn } = require('child_process');
const utils = require('./utils');
async function pasteImage() {

	const imagePath = await utils.getImageFFNAbs();
	console.log('pasteImage::imagePath', imagePath);
	console.log('imagePath.imagePathAbs', path.dirname(imagePath.imagePathAbs));
	utils.createDir(path.dirname(imagePath.imagePathAbs)).then(() => {
		console.log('createDir', path.dirname(imagePath.imagePathAbs));
		saveImage(imagePath.imagePathAbs, (imagePathAbs, imagePathFromScript) => {
			console.log('imagePathFromScript', imagePathFromScript);
			if (imagePathFromScript=='no image') {
				Logger.info('No image found in clipboard!');
				return;
			}
			const editor = vscode.window.activeTextEditor;
			const imageTextPattern = Config.getConfig('imageInsertText');
			console.log('editor', editor);
			editor.edit((editBuilder) => {
				editBuilder.insert(editor.selection.start, imageTextPattern.replace('{imagePath}', imagePath.imagePath));
			});
		});
	}).catch((err) => {
		Logger.error(err);
	})

}





// from https://github.com/mushanshitiancai/vscode-paste-image.git
function saveImage(imageFFNAbs, cb) {
	if (!imageFFNAbs) return;
	console.log('saveImage', imageFFNAbs);
	let platform = process.platform;
	console.log('platform', platform);
	if (platform === 'win32') {
		// Windows
		const scriptPath = path.join(__dirname, '../res/pc.ps1');
		console.log('windows', scriptPath);
		let command = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
		let powershellExisted = fs.existsSync(command)
		if (!powershellExisted) {
			command = "powershell"
		}
		console.log('command', command);
		const powershell = spawn(command, [
			'-noprofile',
			'-noninteractive',
			'-nologo',
			'-sta',
			'-executionpolicy', 'unrestricted',
			'-windowstyle', 'hidden',
			'-file', scriptPath,
			imageFFNAbs
		]);
		console.log('powershell', powershell);
		powershell.on('error', function (e) {
			Logger.error(e);
		});
		powershell.on('exit', function (code, signal) {
			console.log('powershell exit', code, signal);
		});
		powershell.stderr.on('data', function (data) {
			console.log('powershell stderr', data);
		});
		powershell.stdout.on('data', function (data) {
			console.log('powershell data', data);
			cb(imageFFNAbs,  data.toString().trim());
		});
	}
	else if (platform === 'darwin') {
		// Mac
		let scriptPath = path.join(__dirname, '../res/mac.applescript');

		let ascript = spawn('osascript', [scriptPath, imageFFNAbs]);
		ascript.on('error', function (e) {
			Logger.error(e);
		});
		ascript.on('exit', function (code, signal) {
			// console.log('exit',code,signal);
		});
		ascript.stdout.on('data', function (data) {
			cb(imageFFNAbs,  data.toString().trim());
		});
	} else {
		// Linux 

		let scriptPath = path.join(__dirname, '../res/linux.sh');

		let ascript = spawn('sh', [scriptPath, imageFFNAbs]);
		ascript.on('error', function (e) {
			Logger.error(e);
		});
		ascript.on('exit', function (code, signal) {
			// console.log('exit',code,signal);
		});
		ascript.stdout.on('data', function (data) {
			let result = data.toString().trim();
			if (result == "no xclip") {
				Logger.error('You need to install xclip command first.');
				return;
			}
			cb(imageFFNAbs,  result);
		});
	}
}




module.exports = { pasteImage };
