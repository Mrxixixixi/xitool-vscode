const {Cite} = require("@citation-js/core");
require("@citation-js/plugin-bibtex");
const vscode = require('vscode');
const {Config }=require("./utils");
const mpath = require('path');
const fs = require('fs');
const utils = require("./utils");
class CiteManager{
    files = [];
    cite = undefined;
    constructor(files){
        this.loadFiles(files);
    }

    loadFiles(files){
        this.files = files;
        this.cite = new Cite(fs.readFileSync(files[0],'utf-8'),{forceType:"@bibtex/text"});
        files.slice(1).forEach(file=>{
            this.cite.add(fs.readFileSync(file,'utf-8'));
        });
        return this;
    }


    getCiteData(containedString){
        return this.cite.data.filter(item=>{            
            var cmpString = "";
            ["citation-key","title"].forEach(key=>{
                item[key]?cmpString += item[key]:null;
            });
            return cmpString.toLowerCase().includes(containedString.toLowerCase());
        });
    }

    normalizeCiteData(item){
        const nitem = {
            "author": item["author"]? item["author"].map(author=>Object.values(author).join(' ')).join(', '):'',
            "journal": item["container-title"]? item["container-title"]:"",
            "date": item["issued"]? item["issued"]["date-parts"]? `${item["issued"]["date-parts"].join('-')}`:'':'',
            "DOI": item["DOI"]? item["DOI"].startsWith("http")? item["DOI"]:`https://doi.org/${item["DOI"]}`:'',
            "title": item["title"]? item["title"]:"",
            "citation-key": item["citation-key"]? item["citation-key"]:"",
        };
        return nitem;
    }
    // format cite data for provider
    formatCiteData(nitem){
        const doiField = nitem["DOI"]? `[DOI](${nitem["DOI"]})`:''
        const dateField = nitem["date"]? `(${nitem["date"]})`:'';
        return `[^${nitem["citation-key"]}]:${nitem["title"]}, ${nitem["author"]}, ${nitem["journal"]}${dateField} ${doiField}`;
    }
    docCiteData(nitem){
        return new vscode.MarkdownString(`${nitem["title"]}\n- ${nitem["author"]}\n- [DOI](${nitem["DOI"]}) ${nitem["journal"]}(${nitem["date"]})`);
    }
}

// provider 

class CiteCompletionProvider{
    constructor(citeManager){
        this.citeManager = citeManager;
    }

    provideCompletionItems(document,position,token,context){
        const line = document.lineAt(position);    
        const text = line.text.substring(0,position.character);
        const searchText = text.substring(text.lastIndexOf('[^')+2);
        console.log("search- Text:",text,";searchText:",searchText);
        if(searchText){
               const result = this.citeManager.getCiteData(searchText);
               console.log("search-result:",result);
               return result.map(item=>{
                const nitem = this.citeManager.normalizeCiteData(item);
                const completionItem = new vscode.CompletionItem(nitem["citation-key"],vscode.CompletionItemKind.Variable);
                completionItem.filterText = nitem["citation-key"]+nitem["title"]+nitem["date"];
                // completionItem.insertText = nitem["citation-key"]; // When falsy the label is used.
                completionItem.detail = nitem["citation-key"];
                completionItem.documentation = this.citeManager.docCiteData(nitem);
                const endPosition = document.lineAt(document.lineCount - 1).range.end;
                completionItem.additionalTextEdits = document.getText().includes(this.citeManager.formatCiteData(nitem))?                  
                   []: [vscode.TextEdit.insert(endPosition,`\n${this.citeManager.formatCiteData(nitem)}`)];
                return completionItem;
               });
        }
        return [];
    }

    resolveCompletionItem(item,token){
        return null;
    }

}

class CiteObj{
    constructor(context){
        const bibPath = this.getBibFilePath();
        if(bibPath.length == 0){
            utils.Logger.info("The bibtex library not found, cite feature is disabled.");
            return;
        }
        this.citeManager = new CiteManager(bibPath);
        const citeProvider = new CiteCompletionProvider(this.citeManager);
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider("markdown",citeProvider,'^'));
        context.subscriptions.push(vscode.commands.registerCommand("xitool-vscode.reloadBibtex",()=>{
            this.citeManager.loadFiles(this.getBibFilePath());
        }));
    }

    getBibFilePath(){
        let bibPath = Config.getConfig("bibtexPath");
        if(bibPath.length == 0){            
            return utils.getAllFile(Config.getRootPath(),(filename)=>{
                return filename.endsWith(".bib");
            });
        }
        if(!mpath.isAbsolute(bibPath)){
            bibPath = mpath.join(Config.getRootPath(),bibPath);
        }
        if(!fs.existsSync(bibPath)){
            vscode.window.showErrorMessage("The bibtex library path is invalid.");
            return;
        }
        if(fs.statSync(bibPath).isDirectory()){
            return utils.getAllFile(bibPath,(filename)=>{
                return filename.endsWith(".bib");
            });
        }else{  
            return [bibPath];
        }
    }
}

module.exports = {CiteObj};