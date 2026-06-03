import { AsyncLocalStorage } from "async_hooks";
import { FilePath } from "./type";
import { tags } from "typia";

export interface Options {
    config: string & FilePath
    port: string & tags.Pattern<"^[0-9]+$">
}