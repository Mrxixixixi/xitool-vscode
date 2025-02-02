const fs = require('fs');
const mpath = require('path');
const vscode = require('vscode');
const utils = require("./utils");
// function findObjInFileStructure(fileStructure,key,rootPath){
//     const result = [];
//     if(fileStructure.subfiles[key]){
//         const file = fileStructure.subfiles[key];file.path = mpath.join(rootPath,key);
//         result.push(file);
//     }
//     for(const folder in fileStructure.subfolders){
//         result.push(...findObjInFileStructure(fileStructure.subfolders[folder],key,mpath.join(rootPath,folder)));
//     }
//     return result;
// }

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
        this.rootPath = rootPath;
        this.validateSt = validateSt;
        this.parent = parent;
        this.types = Object.keys(validateSt);

        this.types.forEach(type=>{
            this[type] = {};
            this[`has${type}`] = 0;
        });
        // fileSt: {subfolders:{folderName:FileNode},filetype:{fileName:{}},isEmpty:true}
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
        const allFiles = fs.readdirSync(this.rootPath);
        const stats = allFiles.map(file=>{
            const stat = fs.statSync(mpath.join(this.rootPath,file));
            return {name:file,isFile:stat.isFile(),isDirectory:stat.isDirectory(),...stat};
        });
        stats.filter(stat=>stat.isDirectory).filter(folder=>this.validateIgnoreFolder(folder.name)).forEach(folder=>{
            const subfolder = new FileNode(mpath.join(this.rootPath,folder.name),this.validateSt,this);
            subfolder.updateFileSt().updateNote();
            this.subfolders[folder.name] = subfolder;   
        });
        const files = stats.filter(stat=>stat.isFile);
        this.types.forEach(type=>{
            files.filter(file=>this.validateSt[type](file.name)).forEach(file=>{
                this[type][file.name] = {mtime:file.mtime,ctime:file.ctime};
            });
        });
        this.updateThisHas();
        return this;
    }

    validateIgnoreFolder(folderName){
        if(utils.Config.getConfig('ignoreFolder').some(folder=>folderName==folder)){
            return false;
        }
        return true;
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

    getAllFile(type,validate=(key,value)=>true){
        // validate: (key,value)=>true
        const files = [];
        files.push(...Object.keys(this[type]).filter(name=>validate(name,this[type][name])).map(name=>(mpath.join(this.rootPath,name))));
        Object.values(this.subfolders).forEach(subfolder=>files.push(...subfolder.getAllFile(type,validate)));
        return files;
    }

    updateNote(){
        const notes = {};
        Object.keys(this.Md).forEach(file=>{
            const name = file.replace(/\.md$/,'');
            notes[name] = {mdtime:this.Md[file].mtime,hasMd:true,status:'none'};
        });
        Object.keys(this.Html).forEach(file=>{
            const name = file.replace(/\.html$/,'');
            if(notes[name]){
                notes[name].htmltime = this.Html[file].ctime;   
                if(notes[name].htmltime > notes[name].mdtime){
                    notes[name].status = 'check';
                }else{
                    notes[name].status = 'uncheck';
                }             
            }else{
                notes[name] = {htmltime:this.Html[file].ctime,status:'conflict'};
            }
            notes[name].hasHtml = true;
        });

        this.Note = notes;        
        Object.values(this.subfolders).forEach(subfolder=>subfolder.updateNote());
        this.updateThisHas();
        return this;
    }
    // ------------
    updateFile(type,filepath=undefined){
        this[type] = {};
        const allFiles = fs.readdirSync(this.rootPath);
        allFiles.filter(file=>this.validateSt[type](file)).forEach(file=>{
            const stat = fs.statSync(mpath.join(this.rootPath,file));
            this[type][file] = {mtime:stat.mtime,ctime:stat.ctime};
        });
        switch(type.toLowerCase()){
            case 'image':
                this.shakeImage();
                break;
            case 'md':
            case 'html':
                this.updateNote();
                break;
        }
        this.updateThisHas();
        return this;
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
        if(!fs.existsSync(mpath.join(this.rootPath, folderName))){
            fs.mkdirSync(mpath.join(this.rootPath, folderName));
            this.subfolders[folderName] = new FileNode(mpath.join(this.rootPath, folderName),this.validateSt,this);
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
        this.fileSt = new FileNode(this.rootPath,
            {'Html':(name)=>name.endsWith('.html'),'Md':(name)=>name.endsWith('.md'),'Image':(name)=>/\.(png|jpg|jpeg|gif|bmp)$/i.test(name),'Drawio':(name)=>name.endsWith('.drawio')}
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
        this.shakeImageFunc = (name)=>{
            for (const item of this.mdArr){
                const mdContent = fs.readFileSync(item, 'utf8');
                if (mdContent.includes(name)){
                    return false;
                }
            }
            return true;
        };  
        this.fileSt.shakeImage();
        return this;
    }




}


const FmObj = new FileManager();
FmObj.init();

module.exports = { FmObj };