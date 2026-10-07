import * as vm from 'node:vm';
import * as yaml from 'yaml';

export function Render(template: string, data: Record<string, any>): string {
    const regex = /([ \t]*)\{\{([\s\S]+?)\}\}/g;

    const sandbox = {
        $: data,
        toYaml: (obj: any) => yaml.stringify(obj).trimEnd(),
        toJson: (obj: any) => JSON.stringify(obj, null, 2),
    };

    const context = vm.createContext(sandbox);

    return template.replace(regex, (match, indent, code, offset) => {
        try {
            const scriptStr = code.trim();
            if (!scriptStr) return '';
            
            // 执行内部逻辑
            let result = vm.runInContext(scriptStr, context);

            if (result === undefined || result === null) return '';
            
            let resultStr = typeof result === 'object' ? JSON.stringify(result) : String(result);

            if (resultStr.includes('\n')) {
                resultStr = resultStr
                    .split('\n')
                    .map((line, index) => (index === 0 ? line : indent + line))
                    .join('\n');
            }

            return indent + resultStr;
        } catch (error) {
            // 💡 1. 核心改进：计算当前报错的代码在整个模板中的【行号】
            // 通过 offset（匹配位置在整个字符串中的索引）来计算
            const beforeMatch = template.substring(0, offset);
            const lineNumber = beforeMatch.split('\n').length;

            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // 💡 2. 在控制台打印极度清晰的错误日志，方便内部排查
            console.error(`\n[Template Render Error]`);
            console.error(`↳ Location : Template Line ${lineNumber}`);
            console.error(`↳ Code     : {{ ${code.trim()} }}`);
            console.error(`↳ Reason   : ${errorMessage}\n`);

            // 💡 3. 优雅降级：不要把报错信息写进配置文件！
            // 返回一个空的注释（在 YAML 中是安全的），或者直接返回空字符串
            // 这样既保证了下游解析不报错，又在控制台留下了完美的 debug 线索
            return indent + `# [Render Error on Line ${lineNumber}]`;
        }
    });
}
