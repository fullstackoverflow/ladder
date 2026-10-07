# Frontend structure

```text
src/
  App.tsx                  # Mounts the provider and workbench
  main.tsx                 # React entry and global style imports
  app/                     # Layout composition, navigation, shared state provider
  components/              # Shared controls, layout pieces, lazy code editor
  features/
    config/                # Dialog, source/template fields, form serialization
    sources/               # Upstream/rule lists, status cards, source sorting
    templates/             # Output template list and cards
    files/                 # Explorer, editor panel, shared file editing
    preview/               # Inspector panel and preview request state
  hooks/                   # Workspace persistence, actions, configuration editing
  lib/                     # HTTP client and file metadata helpers
  types/                   # API and workspace model types; no runtime behavior
  styles/                  # Base, layout, shared controls, feature styles, responsive rules
e2e/                       # Browser tests
```

`WorkspaceProvider` composes the workspace, action and dialog hooks. Shared data
and file drafts live there so navigating between feature pages preserves edits.
Feature-specific state such as source drag sensors stays with
the feature. The preview stays mounted while hidden to preserve its selected tab.

`InlineFileEditor` reuses `FileEditorPanel` inside source and template cards.
It receives an explicit file path so saving updates that file without navigating
to the file workspace. The standalone file workspace uses the same editor and
shared draft storage.

The file toolbar opens CodeMirror's search and replace panel. Ctrl / Cmd + F or H
opens it from the editor; it supports replacing all matches, regular expressions,
case sensitivity and whole words. Replacements participate in editor undo history.
Both source lists persist drag or arrow ordering to their configuration arrays.

`FileContentField` accepts initial text for local sources and templates. The dialog
submits settings and contents together through `/api/admin/entry`; the server
validates the entry, creates UUID files, and saves their references. Existing
entries preserve their file paths and use the card editor for content changes.
Managed files live in `data/` beside the active config. No client file upload,
filename entry, or library selection is involved.

Keep HTTP calls out of presentation components where a feature hook can own
loading, errors and stale-request handling. Add shared components only when they
serve multiple features. `Editor` loads `CodeEditor` on demand; the CodeMirror
bundle stays outside the initial page bundle.

Styles are imported through `styles/index.css`, with responsive overrides last.
Existing class names are preserved for the browser tests. Development and test
commands are documented in the repository README.
