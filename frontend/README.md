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
    files/                 # Explorer, editor panel, raw input fetching
    preview/               # Inspector panel and preview request state
  hooks/                   # Workspace persistence, actions, configuration editing
  lib/                     # HTTP client and file metadata helpers
  types/                   # API and workspace model types; no runtime behavior
  styles/                  # Base, layout, shared controls, feature styles, responsive rules
e2e/                       # Browser tests
```

`WorkspaceProvider` composes the workspace, action and dialog hooks. Shared data
and file drafts live there so navigating between feature pages preserves edits.
Feature-specific state such as raw input loading and source drag sensors stays with
the feature. The preview stays mounted while hidden to preserve its selected tab.

`InlineFileEditor` reuses `FileEditorPanel` inside source and template cards.
It receives an explicit file path so saving updates that file without navigating
to the file workspace. The standalone file workspace uses the same editor and
shared draft storage.

The file toolbar opens CodeMirror's search and replace panel. Ctrl / Cmd + F or H
opens it from the editor; it supports replacing all matches, regular expressions,
case sensitivity and whole words. Replacements participate in editor undo history.
Both source lists persist drag or arrow ordering to their configuration arrays.

`ManagedFileField` selects or creates server-owned files using `/api/admin/files`.
It is shared by local source, output template and node template settings. Library files live in
`data/` beside the active config; their resolved paths are stored in the existing
configuration schema, so resource loading and inline editing share the same path.

Keep HTTP calls out of presentation components where a feature hook can own
loading, errors and stale-request handling. Add shared components only when they
serve multiple features. `Editor` loads `CodeEditor` on demand; the CodeMirror
bundle stays outside the initial page bundle.

Styles are imported through `styles/index.css`, with responsive overrides last.
Existing class names are preserved for the browser tests. Development and test
commands are documented in the repository README.
