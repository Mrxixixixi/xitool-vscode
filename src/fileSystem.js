const fs = require('fs');
const mpath = require('path');
const vscode = require('vscode');
const utils = require("./utils");

class FileNode{
    subfolders = {};
    validateSt ={};
    types = [];

    Html = {};
    Md = {};
    Note = {};

    hasNote = 0;
    hasFile = 0;
    shakeImageFunc = undefined;
    constructor(rootPath,validateSt,parent=undefined){
        // validateSt: {filetype:(name)=>true}
        this.path = rootPath;
        this.validateSt = validateSt;
        this.parent = parent;
        this.types = Object.keys(validateSt);

        this.types.forEach(type=>{
            this[type] = {};
            this[`has${type}`] = 0;
        });
    }

    addHasFromSubfolder(subfolder,type=undefined){
        if(type){
            this[`has${type}`] += subfolder[`has${type}`];
        }else{
            ['File','Note',...this.types].forEach(type=>{
                this[`has${type}`] += subfolder[`has${type}`];
            });
        }
        return this;
    }

    updateThisHas(){
        this.hasFile = 0;
        this.types.forEach(type=>{
            this[`has${type}`] = Object.keys(this[type]).length;
            this.hasFile += this[`has${type}`];
        });
        this.hasNote = Object.keys(this.Note).length;
        Object.values(this.subfolders).forEach(subfolder=>{
            this.addHasFromSubfolder(subfolder);
        });
        if(this.parent){
            this.parent.updateThisHas();
        }
        return this;
    }

    clearFileSt(){
        this.subfolders = {};
        this.types.forEach(type=>{
            this[type] = {};
        });
        this.updateThisHas();
        return this;
    }

    updateFileSt(){   
        this.clearFileSt();
        const stats = this.getDirectoryStats();
        
        this.processSubfolders(stats);
        this.processFiles(stats);
        
        this.updateThisHas();
        return this;
    }

    // Helper: Get directory statistics
    getDirectoryStats() {
        const allFiles = fs.readdirSync(this.path);
        return allFiles.map(file => {
            const filePath = mpath.join(this.path, file);
            const stat = fs.statSync(filePath);
            return {
                name: file,
                isFile: stat.isFile(),
                isDirectory: stat.isDirectory(),
                ...stat
            };
        });
    }

    // Helper: Process subfolders
    processSubfolders(stats) {
        stats.filter(stat => stat.isDirectory)
            .filter(folder => this.validateIgnoreFolder(folder.name))
            .forEach(folder => {
                const subfolderPath = mpath.join(this.path, folder.name);
                const subfolder = new FileNode(subfolderPath, this.validateSt, this);
                subfolder.updateFileSt().updateNote();
                this.subfolders[folder.name] = subfolder;   
            });
    }

    // Helper: Process files
    processFiles(stats) {
        const files = stats.filter(stat => stat.isFile);
        this.types.forEach(type => {
            files.filter(file => this.validateSt[type](file.name))
                .forEach(file => {
                    this[type][file.name] = {
                        fullname: file.name,
                        path: mpath.join(this.path, file.name)
                    };
                });
        });
    }

    validateIgnoreFolder(folderName){
        const ignoreFolders = utils.Config.getConfig('ignoreFolder');
        return !ignoreFolders.some(folder => folderName === folder);
    }

    shakeFileSt(validate,type = undefined){
        let types = [];
        if(type){
            if(!this[type]){ return this;}
            types = [type];
        }else{
            types = this.types;
        }
        types.forEach(type=>{
            Object.keys(this[type]).filter(file=>!validate(file)).forEach(file=>{
                delete this[type][file];
            });
        });
        Object.values(this.subfolders).forEach(subfolder=>subfolder.shakeFileSt(validate,type));
        this.updateThisHas();
        return this;
    }

    getAllFile(type, validate = (key, value) => true){
        const files = [];
        
        // Get files from current folder
        const currentFiles = Object.keys(this[type])
            .filter(name => validate(name, this[type][name]))
            .map(name => mpath.join(this.path, name));
        files.push(...currentFiles);
        
        // Get files from subfolders recursively
        Object.values(this.subfolders).forEach(subfolder => {
            files.push(...subfolder.getAllFile(type, validate));
        });
        
        return files;
    }

    updateNote(){
        const notes = {};
        
        // Process MD files
        this.processMdFiles(notes);
        
        // Process HTML files
        this.processHtmlFiles(notes);
        
        // Process Drawio files
        this.processDrawioFiles(notes);

        this.Note = notes;        
        Object.values(this.subfolders).forEach(subfolder=>subfolder.updateNote());
        this.updateThisHas();
        return this;
    }

    // Helper: Process MD files
    processMdFiles(notes) {
        Object.keys(this.Md).forEach(file => {
            const name = file.replace(/\.md$/, '');
            notes[name] = {
                fullname: file,
                path: mpath.join(this.path, file),
                status: 'uncheck',
                type: 'note'
            };
        });
    }

    // Helper: Process HTML files
    processHtmlFiles(notes) {
        Object.keys(this.Html).forEach(file => {
            const name = file.replace(/\.html$/, '');
            if(notes[name]){
                notes[name].status = 'check';
            }else{
                notes[name] = {
                    fullname: file,
                    path: mpath.join(this.path, file),
                    status: 'conflict',
                    type: 'note'
                };
            }
        });
    }

    // Helper: Process Drawio files
    processDrawioFiles(notes) {
        const drawioFiles = this['Drawio'];
        if(drawioFiles){
            Object.keys(drawioFiles).forEach(file => {
                notes[file] = {
                    fullname: file,
                    path: mpath.join(this.path, file),
                    type: 'drawio'
                };
            });
        }
    }
    // ------------
    updateFile(type){
        const allFiles = fs.readdirSync(this.path);
        type = this.normalizeType(type);
        let atype = [];
        if (type === 'Note'){
            atype=['Md','Html','Drawio'];
        }else{
            atype = [type];
        }
        atype.forEach(type=>{
            this[type] = {};
        });
        atype.forEach(type=>{
            allFiles.filter(file => this.validateSt[type](file)).forEach(file => {
                this[type][file] = {};
            });
        });
        
        this.handleFileTypeUpdate(type);
        this.updateThisHas();
        return this;
    }

    // Helper: Normalize type string (capitalize first letter)
    normalizeType(type) {
        if (typeof type === 'string' && type.length > 0) {
            return type.charAt(0).toUpperCase() + type.slice(1);
        }
        return type;
    }

    // Helper: Handle file type specific updates
    handleFileTypeUpdate(type) {
        const typeLower = type.toLowerCase();
        if (typeLower === 'image') {
            this.shakeImage();
        } else if (typeLower === 'note') {
            this.updateNote();
        }
    }  
    shakeImage(){
        this.shakeFileSt(FmObj.shakeImageFunc,'Image');
        return this;
    }
    // folder
    async addFolder(){  
        const folderName = await vscode.window.showInputBox({
            prompt: 'Enter the folder name',
            placeHolder: 'foldername'
        });
        if (!folderName || folderName.length == 0) {
            return this;
        }      
        if(!fs.existsSync(mpath.join(this.path, folderName))){
            fs.mkdirSync(mpath.join(this.path, folderName));
            this.subfolders[folderName] = new FileNode(mpath.join(this.path, folderName),this.validateSt,this);
        }
        return this;
    }
}

class FileManager{
    rootPath = '';
    fileSt = undefined;
    shakeImageFunc = undefined;
    constructor(){
        this.updateRootPath();
        const codeExtList = utils.Config.getConfig('codeExtension');
        const otherExtList = utils.Config.getConfig('otherExtension');
        this.fileSt = new FileNode(this.rootPath,
            {'Html':(name)=>name.endsWith('.html'),'Md':(name)=>name.endsWith('.md'),'Image':(name)=>/\.(png|jpg|jpeg|gif|bmp)$/i.test(name),
                'Drawio':(name)=>name.endsWith('.drawio')||name.endsWith('.drawio.png')||name.endsWith('.drawio.svg'),'Bibtex':(name)=>name.endsWith('.bib'),
                'Code':(name)=>codeExtList.some(ending=>name.endsWith(ending)),'Other':(name)=>otherExtList.some(ending=>name.endsWith(ending))}
        );
    }
    init(){
        this.updateFileSt();
    }
    updateRootPath(){
        this.rootPath = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
        return this;
    }
    getRootPath(){
        return this.rootPath;
    }
    updateFileSt(){
        this.fileSt.updateFileSt().updateNote();
        this.mdArr = this.fileSt.getAllFile('Md');
        this.shakeImageFunc = this.createShakeImageFunction();
        this.fileSt.shakeImage();
        return this;
    }

    // Helper: Create function to check if image is used in markdown files
    createShakeImageFunction() {
        return (name) => {
            for (const item of this.mdArr){
                const mdContent = fs.readFileSync(item, 'utf8');
                if (mdContent.includes(name)){
                    return false;
                }
            }
            return true;
        };
    }
}


const FmObj = new FileManager();
// Defer initialization - don't scan file system at module load time
// Will be initialized lazily when first accessed
let isInitialized = false;
let isInitializing = false;

// Store the original fileSt value (FileNode instance created in constructor)
const fileStValue = FmObj.fileSt;

const originalInit = FmObj.init.bind(FmObj);
FmObj.init = function() {
    if (!isInitialized && !isInitializing) {
        isInitializing = true;
        originalInit();
        isInitialized = true;
        isInitializing = false;
    }
    return this;
};

// Override fileSt property with a getter that triggers lazy initialization
Object.defineProperty(FmObj, 'fileSt', {
    get: function() {
        if (!isInitialized && !isInitializing) {
            FmObj.init();
        }
        // Return the original fileSt value (FileNode instance)
        // updateFileSt() modifies this instance but doesn't replace it
        return fileStValue;
    },
    set: function(value) {
        // Allow setting, though it's rarely done
        Object.defineProperty(this, 'fileSt', {
            value: value,
            writable: true,
            configurable: true,
            enumerable: true
        });
    },
    configurable: true,
    enumerable: true
});

module.exports = { FmObj };