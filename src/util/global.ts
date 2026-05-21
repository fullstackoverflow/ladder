import { AsyncLocalStorage } from "async_hooks";
import { FilePath } from "./type";
import { tags } from "typia";

export interface Options {
    config: string & FilePath
    template: string & FilePath
    port: string & tags.Pattern<"^[0-9]+$">
}

let options: Options;

export function GetGlobalOptions(){
    return options;
}

export function SetGlobalOptions(ops:Options){
    options = ops;    
}