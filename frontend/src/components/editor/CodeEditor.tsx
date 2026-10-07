import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  drawSelection,
} from '@codemirror/view';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { javascript } from '@codemirror/lang-javascript';
import { search, searchKeymap, openSearchPanel } from '@codemirror/search';
import {
  defaultHighlightStyle,
  syntaxHighlighting,
  bracketMatching,
  indentOnInput,
} from '@codemirror/language';

export function CodeEditor({
  value,
  path,
  onChange,
  onSave,
  readOnly = false,
  searchRequest = 0,
}: {
  value: string;
  path: string;
  onChange?: (value: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
  searchRequest?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const change = useRef(onChange);
  const save = useRef(onSave);
  change.current = onChange;
  save.current = onSave;
  useEffect(() => {
    if (!host.current) return;
    const language = /\.json$/i.test(path)
      ? json()
      : /\.[cm]?js$/i.test(path)
        ? javascript()
        : /\.ya?ml$/i.test(path)
          ? yaml()
          : [];
    view.current = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          history(),
          search({ top: true }),
          EditorState.phrases.of({
            Find: '查找',
            Replace: '替换为',
            next: '下一个',
            previous: '上一个',
            all: '选中全部',
            'match case': '区分大小写',
            regexp: '正则表达式',
            'by word': '全词匹配',
            replace: '替换',
            'replace all': '全部替换',
            close: '关闭',
          }),
          drawSelection(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          language,
          syntaxHighlighting(defaultHighlightStyle),
          bracketMatching(),
          indentOnInput(),
          EditorView.lineWrapping,
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          keymap.of([
            {
              key: 'Mod-s',
              run: () => {
                save.current?.();
                return true;
              },
            },
            indentWithTab,
            { key: 'Mod-h', run: openSearchPanel },
            ...searchKeymap,
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged)
              change.current?.(update.state.doc.toString());
          }),
          EditorView.theme({
            '&': { height: '100%', fontSize: '13px' },
            '.cm-scroller': {
              overflow: 'auto',
              fontFamily:
                '"Cascadia Code", "SFMono-Regular", Consolas, monospace',
            },
            '.cm-content': { padding: '16px 0' },
            '.cm-gutters': {
              backgroundColor: '#fafbfc',
              borderRight: '1px solid #edf0f3',
              color: '#a0a8b5',
            },
            '.cm-activeLine': { backgroundColor: '#f4f7ff' },
            '.cm-activeLineGutter': {
              backgroundColor: '#edf2ff',
              color: '#5270c0',
            },
            '&.cm-focused': { outline: 'none' },
          }),
        ],
      }),
    });
    return () => {
      view.current?.destroy();
      view.current = null;
    };
    // A file switch creates a separate editor history; keystrokes stay in the current instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, readOnly]);
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value)
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: value },
      });
  }, [value]);
  useEffect(() => {
    if (searchRequest > 0 && view.current) openSearchPanel(view.current);
  }, [searchRequest]);
  return (
    <div
      className="code-editor"
      ref={host}
      aria-label={readOnly ? '输出预览' : '文件内容编辑器'}
    />
  );
}
