const state = {
  config: { templates: [], upstreams: [] },
  resources: [],
  templateFiles: new Map(),
  selectedView: 'templates',
  inspector: 'config',
  selectedFilePath: '',
  selectedTarget: '',
  editingTemplateIndex: null,
  editingUpstreamIndex: null,
};

const dom = {
  configPath: document.getElementById('config-path'),
  readyPill: document.getElementById('ready-pill'),
  failedPill: document.getElementById('failed-pill'),
  templatePill: document.getElementById('template-pill'),
  refresh: document.getElementById('refresh'),
  syncAll: document.getElementById('sync-all'),
  message: document.getElementById('message'),
  templatesList: document.getElementById('templates-list'),
  upstreamsList: document.getElementById('upstreams-list'),
  filePicker: document.getElementById('file-picker'),
  fileEditor: document.getElementById('file-editor'),
  saveFile: document.getElementById('save-file'),
  nodeRawPanel: document.getElementById('node-raw-panel'),
  nodeRawTitle: document.getElementById('node-raw-title'),
  nodeRawPreview: document.getElementById('node-raw-preview'),
  refreshNodeRaw: document.getElementById('refresh-node-raw'),
  inspector: document.getElementById('inspector'),
  targetPicker: document.getElementById('target-picker'),
  refreshPreview: document.getElementById('refresh-preview'),
  templateDialog: document.getElementById('template-dialog'),
  templateForm: document.getElementById('template-form'),
  templateDialogTitle: document.getElementById('template-dialog-title'),
  templateName: document.getElementById('template-name'),
  templateTarget: document.getElementById('template-target'),
  templatePath: document.getElementById('template-path'),
  templateDelete: document.getElementById('template-delete'),
  templateCancel: document.getElementById('template-cancel'),
  upstreamDialog: document.getElementById('upstream-dialog'),
  upstreamForm: document.getElementById('upstream-form'),
  upstreamDialogTitle: document.getElementById('upstream-dialog-title'),
  upstreamName: document.getElementById('upstream-name'),
  upstreamSource: document.getElementById('upstream-source'),
  upstreamFrom: document.getElementById('upstream-from'),
  upstreamFormat: document.getElementById('upstream-format'),
  upstreamEncoding: document.getElementById('upstream-encoding'),
  upstreamRefresh: document.getElementById('upstream-refresh'),
  upstreamRetry: document.getElementById('upstream-retry'),
  upstreamRetryInterval: document.getElementById('upstream-retry-interval'),
  upstreamRetryBackoff: document.getElementById('upstream-retry-backoff'),
  upstreamNodeTemplate: document.getElementById('upstream-node-template'),
  upstreamDelete: document.getElementById('upstream-delete'),
  upstreamCancel: document.getElementById('upstream-cancel'),
};

function $(id) {
  return document.getElementById(id);
}

function setMessage(text, bad = false) {
  dom.message.textContent = text;
  dom.message.classList.toggle('bad', bad);
}

function optionalNumber(value) {
  if (value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function setOptionalNumber(input, value) {
  input.value = value === undefined || value === null ? '' : String(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function fileKey(path) {
  return String(path || '');
}

function knownFiles() {
  const files = [];
  for (const template of state.config.templates || []) {
    if (template.path) files.push({ kind: 'output', label: `output / ${template.target}`, path: template.path });
  }
  (state.config.upstreams || []).forEach((upstream, index) => {
    if (upstream.nodeTemplatePath) {
      files.push({
        kind: 'node',
        label: `node / #${index} ${upstream.name || '(unnamed)'}`,
        path: upstream.nodeTemplatePath,
        upstreamIndex: index,
        upstreamName: upstream.name || '(unnamed)',
      });
    }
  });
  return files;
}

function selectedFileMeta() {
  return knownFiles().find((file) => file.path === state.selectedFilePath);
}

function render() {
  renderStatus();
  renderTabs();
  renderTemplates();
  renderUpstreams();
  renderFiles();
  renderTargets();
  renderInspector();
}

function renderStatus() {
  const ready = state.resources.filter((resource) => resource.ready).length;
  const failed = state.resources.filter((resource) => resource.failureCount > 0 || resource.lastError).length;
  dom.configPath.textContent = `config: ${state.configPath || '-'}`;
  dom.readyPill.textContent = `${ready}/${state.resources.length} ready`;
  dom.failedPill.textContent = `${failed} failed`;
  dom.failedPill.classList.toggle('bad', failed > 0);
  dom.templatePill.textContent = `${(state.config.templates || []).length} templates`;
}

function renderTabs() {
  for (const view of ['templates', 'upstreams', 'files']) {
    $(`tab-${view}`).classList.toggle('active', state.selectedView === view);
    $(`${view}-view`).classList.toggle('active', state.selectedView === view);
  }
  $('tab-config-json').classList.toggle('active', state.inspector === 'config');
  $('tab-rendered').classList.toggle('active', state.inspector === 'rendered');
  $('tab-profiles').classList.toggle('active', state.inspector === 'profiles');
}

function card(title, meta, actions = []) {
  const node = document.createElement('article');
  node.className = 'card';
  const head = document.createElement('div');
  head.className = 'card-head';
  const strong = document.createElement('strong');
  strong.textContent = title;
  head.appendChild(strong);
  for (const action of actions) head.appendChild(action);
  node.appendChild(head);
  const info = document.createElement('p');
  info.className = 'muted mono-wrap';
  info.textContent = meta;
  node.appendChild(info);
  return node;
}

function button(text, onClick, className = '') {
  const node = document.createElement('button');
  node.type = 'button';
  node.textContent = text;
  if (className) node.className = className;
  node.addEventListener('click', onClick);
  return node;
}

function renderTemplates() {
  const nodes = (state.config.templates || []).map((template, index) => {
    const actions = [
      button('编辑', () => openTemplateDialog(index)),
      button('模板文件', () => openFile(template.path)),
    ];
    const link = document.createElement('a');
    link.className = 'button small';
    link.href = `/subscribe/${encodeURIComponent(template.target)}`;
    link.target = '_blank';
    link.textContent = '订阅';
    actions.push(link);
    return card(template.target || '(target)', template.path || '-', actions);
  });
  dom.templatesList.replaceChildren(...nodes);
}

function resourceFor(index) {
  return state.resources.find((resource) => resource.index === index);
}

function formatStatus(resource) {
  if (!resource) return 'not loaded';
  const parts = [
    resource.ready ? 'ready' : 'not ready',
    `content=${resource.contentLength ?? 0}`,
    `failures=${resource.failureCount ?? 0}`,
  ];
  if (resource.restoredFromCache) parts.push('restored-from-cache');
  if (resource.cachePath) parts.push(`cache=${resource.cachePath}`);
  if (resource.lastSuccessAt) parts.push(`success=${new Date(resource.lastSuccessAt).toLocaleString()}`);
  if (resource.lastError) parts.push(`error=${resource.lastError}`);
  return parts.join(' | ');
}

function renderUpstreams() {
  const nodes = (state.config.upstreams || []).map((upstream, index) => {
    const resource = resourceFor(index);
    const actions = [
      button('同步', () => syncOne(index)),
      button('编辑', () => openUpstreamDialog(index)),
    ];
    if (upstream.nodeTemplatePath) actions.push(button('节点模板', () => openFile(upstream.nodeTemplatePath)));
    const node = card(`#${index} ${upstream.name || '(unnamed)'}`, `${upstream.source} | ${upstream.format} | ${upstream.from}`, actions);
    const status = document.createElement('p');
    status.className = `resource-status ${resource?.ready ? 'ok' : 'bad'}`;
    status.textContent = formatStatus(resource);
    node.appendChild(status);
    return node;
  });
  dom.upstreamsList.replaceChildren(...nodes);
}

function renderFiles() {
  const files = knownFiles();
  dom.filePicker.replaceChildren(...files.map((file) => {
    const option = document.createElement('option');
    option.value = file.path;
    option.textContent = file.label;
    return option;
  }));
  if (!state.selectedFilePath && files[0]) state.selectedFilePath = files[0].path;
  dom.filePicker.value = state.selectedFilePath;
  dom.fileEditor.value = state.templateFiles.get(fileKey(state.selectedFilePath)) || '';

  const meta = selectedFileMeta();
  const isNodeTemplate = meta?.kind === 'node';
  dom.nodeRawPanel.hidden = !isNodeTemplate;
  if (isNodeTemplate) {
    dom.nodeRawTitle.textContent = `#${meta.upstreamIndex} ${meta.upstreamName}`;
  }
}

function renderTargets() {
  const templates = state.config.templates || [];
  dom.targetPicker.replaceChildren(...templates.map((template) => {
    const option = document.createElement('option');
    option.value = template.target;
    option.textContent = template.target;
    return option;
  }));
  if (!state.selectedTarget && templates[0]) state.selectedTarget = templates[0].target;
  dom.targetPicker.value = state.selectedTarget || '';
}

function renderInspector() {
  if (state.inspector === 'config') {
    dom.inspector.textContent = JSON.stringify(state.config, null, 2);
  }
}

function openTemplateDialog(index = null) {
  state.editingTemplateIndex = index;
  const template = index === null ? { name: '', target: 'clash', path: '' } : state.config.templates[index];
  dom.templateDialogTitle.textContent = index === null ? '新增模板' : `编辑 ${template.target}`;
  dom.templateName.value = template.name || '';
  dom.templateTarget.value = template.target || 'clash';
  dom.templatePath.value = template.path || '';
  dom.templateDelete.hidden = index === null;
  dom.templateDialog.showModal();
}

function openUpstreamDialog(index = null) {
  state.editingUpstreamIndex = index;
  const upstream = index === null ? { name: '', source: 'URI', from: '', format: 'yaml' } : state.config.upstreams[index];
  dom.upstreamDialogTitle.textContent = index === null ? '新增上游' : `编辑上游 #${index}`;
  dom.upstreamName.value = upstream.name || '';
  dom.upstreamSource.value = upstream.source || 'URI';
  dom.upstreamFrom.value = upstream.from || '';
  dom.upstreamFormat.value = upstream.format || 'yaml';
  dom.upstreamEncoding.value = upstream.encoding || '';
  setOptionalNumber(dom.upstreamRefresh, upstream.refresh);
  setOptionalNumber(dom.upstreamRetry, upstream.retry);
  setOptionalNumber(dom.upstreamRetryInterval, upstream.retryInterval);
  setOptionalNumber(dom.upstreamRetryBackoff, upstream.retryBackoff);
  dom.upstreamNodeTemplate.value = upstream.nodeTemplatePath || '';
  dom.upstreamDelete.hidden = index === null;
  dom.upstreamDialog.showModal();
}

function templateFromForm() {
  const base = state.editingTemplateIndex === null ? {} : state.config.templates[state.editingTemplateIndex];
  return {
    ...base,
    name: dom.templateName.value.trim(),
    target: dom.templateTarget.value,
    path: dom.templatePath.value.trim(),
  };
}

function upstreamFromForm() {
  const base = state.editingUpstreamIndex === null ? {} : state.config.upstreams[state.editingUpstreamIndex];
  const upstream = {
    ...base,
    name: dom.upstreamName.value.trim(),
    source: dom.upstreamSource.value,
    from: dom.upstreamFrom.value.trim(),
    format: dom.upstreamFormat.value,
  };
  delete upstream.encoding;
  delete upstream.nodeTemplatePath;
  delete upstream.refresh;
  delete upstream.retry;
  delete upstream.retryInterval;
  delete upstream.retryBackoff;

  if (dom.upstreamEncoding.value) upstream.encoding = dom.upstreamEncoding.value;
  if (dom.upstreamNodeTemplate.value.trim()) upstream.nodeTemplatePath = dom.upstreamNodeTemplate.value.trim();
  for (const [key, input] of [
    ['refresh', dom.upstreamRefresh],
    ['retry', dom.upstreamRetry],
    ['retryInterval', dom.upstreamRetryInterval],
    ['retryBackoff', dom.upstreamRetryBackoff],
  ]) {
    const value = optionalNumber(input.value);
    if (value !== undefined) upstream[key] = value;
  }
  return upstream;
}

function ensureFile(path) {
  const key = fileKey(path);
  if (path && !state.templateFiles.has(key)) state.templateFiles.set(key, '');
}

async function saveConfig() {
  const response = await fetch('/api/admin/config', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(state.config),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text);
  applyState(JSON.parse(text));
}

async function saveTemplateForm(event) {
  event.preventDefault();
  const template = templateFromForm();
  if (!template.name || !template.target || !template.path) return;
  if (state.editingTemplateIndex === null) state.config.templates.push(template);
  else state.config.templates[state.editingTemplateIndex] = template;
  ensureFile(template.path);
  dom.templateDialog.close();
  await saveConfig();
  setMessage('模板配置已保存');
}

async function saveUpstreamForm(event) {
  event.preventDefault();
  const upstream = upstreamFromForm();
  if (!upstream.name || !upstream.source || !upstream.from || !upstream.format) return;
  if (state.editingUpstreamIndex === null) state.config.upstreams.push(upstream);
  else state.config.upstreams[state.editingUpstreamIndex] = upstream;
  if (upstream.nodeTemplatePath) ensureFile(upstream.nodeTemplatePath);
  dom.upstreamDialog.close();
  await saveConfig();
  setMessage('上游配置已保存');
}

async function deleteTemplate() {
  const index = state.editingTemplateIndex;
  if (index === null || !confirm('删除这个模板配置？')) return;
  state.config.templates.splice(index, 1);
  dom.templateDialog.close();
  await saveConfig();
  setMessage('模板配置已删除');
}

async function deleteUpstream() {
  const index = state.editingUpstreamIndex;
  if (index === null || !confirm('删除这个上游？')) return;
  state.config.upstreams.splice(index, 1);
  dom.upstreamDialog.close();
  await saveConfig();
  setMessage('上游已删除');
}

function openFile(path) {
  if (!path) return;
  state.selectedView = 'files';
  state.selectedFilePath = path;
  ensureFile(path);
  render();
  void refreshNodeRawPreview().catch(showError);
}

async function refreshNodeRawPreview() {
  const meta = selectedFileMeta();
  if (meta?.kind !== 'node') {
    dom.nodeRawPreview.textContent = '';
    return;
  }

  const response = await fetch(`/api/admin/preview/profiles/raw/${meta.upstreamIndex}`, { method: 'POST', body: '{}' });
  const text = await response.text();
  dom.nodeRawPreview.textContent = response.ok ? JSON.stringify(JSON.parse(text), null, 2) : text;
}

async function saveCurrentFile() {
  const path = state.selectedFilePath;
  if (!path) return;
  state.templateFiles.set(fileKey(path), dom.fileEditor.value);
  const response = await fetch('/api/admin/file', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path, content: dom.fileEditor.value }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text);
  setMessage('文件已保存');
}

async function refreshPreview() {
  if (state.inspector === 'config') {
    renderInspector();
    return;
  }

  if (state.inspector === 'profiles') {
    const response = await fetch('/api/admin/preview/profiles/rendered', { method: 'POST', body: '{}' });
    const text = await response.text();
    dom.inspector.textContent = response.ok ? JSON.stringify(JSON.parse(text), null, 2) : text;
    return;
  }

  const files = Object.fromEntries(state.templateFiles.entries());
  const response = await fetch('/api/admin/preview/render', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ target: state.selectedTarget, config: state.config, files }),
  });
  dom.inspector.textContent = await response.text();
}

async function syncAll() {
  const response = await fetch('/api/sync', { method: 'POST' });
  const text = await response.text();
  if (!response.ok) throw new Error(text);
  await loadState();
  setMessage('同步完成');
}

async function syncOne(index) {
  const response = await fetch(`/api/sync/${index}`, { method: 'POST' });
  const text = await response.text();
  if (!response.ok) throw new Error(text);
  await loadState();
  setMessage(`上游 #${index} 同步完成`);
}

function applyState(data) {
  state.configPath = data.configPath;
  state.config = clone(data.config || { templates: [], upstreams: [] });
  state.resources = data.resources || [];
  state.templateFiles = new Map();
  for (const template of data.templates || []) state.templateFiles.set(fileKey(template.path), template.content || '');
  for (const nodeTemplate of data.nodeTemplates || []) state.templateFiles.set(fileKey(nodeTemplate.path), nodeTemplate.content || '');
  if (!state.selectedTarget && state.config.templates?.[0]) state.selectedTarget = state.config.templates[0].target;
  if (!state.selectedFilePath && knownFiles()[0]) state.selectedFilePath = knownFiles()[0].path;
  render();
}

async function loadState() {
  const response = await fetch('/api/admin/state');
  const text = await response.text();
  if (!response.ok) throw new Error(text);
  applyState(JSON.parse(text));
}

function bind() {
  for (const view of ['templates', 'upstreams', 'files']) {
    $(`tab-${view}`).addEventListener('click', () => {
      state.selectedView = view;
      render();
    });
  }
  $('tab-config-json').addEventListener('click', () => {
    state.inspector = 'config';
    render();
  });
  $('tab-rendered').addEventListener('click', () => {
    state.inspector = 'rendered';
    render();
    void refreshPreview();
  });
  $('tab-profiles').addEventListener('click', () => {
    state.inspector = 'profiles';
    render();
    void refreshPreview();
  });
  $('add-template').addEventListener('click', () => openTemplateDialog());
  $('add-upstream').addEventListener('click', () => openUpstreamDialog());
  dom.templateForm.addEventListener('submit', (event) => void saveTemplateForm(event).catch(showError));
  dom.upstreamForm.addEventListener('submit', (event) => void saveUpstreamForm(event).catch(showError));
  dom.templateDelete.addEventListener('click', () => void deleteTemplate().catch(showError));
  dom.upstreamDelete.addEventListener('click', () => void deleteUpstream().catch(showError));
  dom.templateCancel.addEventListener('click', () => dom.templateDialog.close());
  dom.upstreamCancel.addEventListener('click', () => dom.upstreamDialog.close());
  dom.filePicker.addEventListener('change', () => {
    state.templateFiles.set(fileKey(state.selectedFilePath), dom.fileEditor.value);
    state.selectedFilePath = dom.filePicker.value;
    renderFiles();
    void refreshNodeRawPreview().catch(showError);
  });
  dom.fileEditor.addEventListener('input', () => {
    state.templateFiles.set(fileKey(state.selectedFilePath), dom.fileEditor.value);
  });
  dom.saveFile.addEventListener('click', () => void saveCurrentFile().catch(showError));
  dom.refreshNodeRaw.addEventListener('click', () => void refreshNodeRawPreview().catch(showError));
  dom.targetPicker.addEventListener('change', () => {
    state.selectedTarget = dom.targetPicker.value;
    void refreshPreview();
  });
  dom.refreshPreview.addEventListener('click', () => void refreshPreview().catch(showError));
  dom.refresh.addEventListener('click', () => void loadState().catch(showError));
  dom.syncAll.addEventListener('click', () => void syncAll().catch(showError));
}

function showError(error) {
  setMessage(error instanceof Error ? error.message : String(error), true);
}

async function boot() {
  bind();
  try {
    await loadState();
  } catch (error) {
    showError(error);
  }
}

void boot();
