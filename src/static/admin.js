const state = {
  current: 'config',
};

const dom = {
  paths: document.getElementById('paths'),
  statusList: document.getElementById('status-list'),
  statusSummary: document.getElementById('status-summary'),
  editor: document.getElementById('editor'),
  message: document.getElementById('message'),
  tabConfig: document.getElementById('tab-config'),
  tabTemplate: document.getElementById('tab-template'),
  save: document.getElementById('save'),
  refresh: document.getElementById('refresh'),
  syncAll: document.getElementById('sync-all'),
};

function setMessage(text, bad = false) {
  dom.message.textContent = text;
  dom.message.classList.toggle('bad', bad);
}

function setLoading(loading) {
  dom.save.disabled = loading;
  dom.refresh.disabled = loading;
  dom.syncAll.disabled = loading;
}

function appendMeta(parent, label, value) {
  const item = document.createElement('div');
  item.className = 'meta-item';

  const labelNode = document.createElement('span');
  labelNode.className = 'meta-label';
  labelNode.textContent = label;
  item.appendChild(labelNode);

  const valueNode = document.createElement('span');
  valueNode.className = 'meta-value';
  valueNode.textContent = value || '-';
  item.appendChild(valueNode);

  parent.appendChild(item);
  return item;
}

function appendBlock(parent, className, text) {
  const node = document.createElement('div');
  node.className = className;
  node.textContent = text;
  parent.appendChild(node);
  return node;
}

function formatLocalTime(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function renderResource(resource) {
  const card = document.createElement('article');
  card.className = 'resource';

  const title = document.createElement('div');
  title.className = 'resource-title';

  const name = document.createElement('strong');
  name.textContent = resource.name || '(unnamed)';
  title.appendChild(name);

  const pill = document.createElement('span');
  pill.className = `status-pill ${resource.ready ? 'ok' : 'bad'}`;
  pill.textContent = resource.ready ? 'ready' : 'not ready';
  title.appendChild(pill);

  const syncButton = document.createElement('button');
  syncButton.type = 'button';
  syncButton.className = 'resource-sync';
  syncButton.textContent = '同步';
  syncButton.addEventListener('click', () => void syncResource(resource.index));
  title.appendChild(syncButton);
  card.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'resource-meta';
  appendMeta(meta, 'source', resource.source);
  appendMeta(meta, 'type', resource.type || '-');
  appendMeta(meta, 'format', resource.format);
  appendMeta(meta, 'content', `${resource.contentLength ?? 0} chars`);
  appendMeta(meta, 'failures', String(resource.failureCount ?? 0));
  appendMeta(meta, 'refresh', resource.refresh ? `${resource.refresh}s` : '-');
  appendMeta(meta, 'last success', formatLocalTime(resource.lastSuccessAt));
  card.appendChild(meta);

  appendBlock(card, 'resource-url', resource.from || '-');

  if (resource.lastError) {
    appendBlock(card, 'bad', `last error: ${formatLocalTime(resource.lastErrorAt)} · ${resource.lastError}`);
  }

  return card;
}

async function loadStatus() {
  const response = await fetch('/api/status');
  if (!response.ok) throw new Error(await response.text());

  const data = await response.json();
  const resources = Array.isArray(data.resources) ? data.resources : [];
  const readyCount = resources.filter((resource) => resource.ready).length;

  dom.paths.textContent = `config: ${data.configPath || '-'} · template: ${data.templatePath || '-'}`;
  dom.statusSummary.textContent = `${readyCount}/${resources.length} ready`;
  dom.statusList.replaceChildren(...resources.map(renderResource));
}

async function loadEditor() {
  const response = await fetch(`/api/${state.current}`);
  if (!response.ok) throw new Error(await response.text());

  dom.editor.value = await response.text();
  dom.tabConfig.classList.toggle('active', state.current === 'config');
  dom.tabTemplate.classList.toggle('active', state.current === 'template');
  dom.tabConfig.setAttribute('aria-selected', String(state.current === 'config'));
  dom.tabTemplate.setAttribute('aria-selected', String(state.current === 'template'));
  setMessage('');
}

async function saveEditor() {
  setLoading(true);
  try {
    const response = await fetch(`/api/${state.current}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: dom.editor.value,
    });

    const text = await response.text();
    if (!response.ok) {
      setMessage(text, true);
      return;
    }

    setMessage('已保存');
    await loadStatus();
  } finally {
    setLoading(false);
  }
}

async function syncResource(index) {
  setLoading(true);
  setMessage('正在同步...');
  try {
    const response = await fetch(`/api/sync/${index}`, { method: 'POST' });
    const text = await response.text();
    if (!response.ok) {
      setMessage(text, true);
      return;
    }

    setMessage('同步完成');
    await loadStatus();
  } finally {
    setLoading(false);
  }
}

async function syncAll() {
  setLoading(true);
  setMessage('正在同步全部上游...');
  try {
    const response = await fetch('/api/sync', { method: 'POST' });
    const text = await response.text();
    if (!response.ok) {
      setMessage(text, true);
      return;
    }

    setMessage('全部同步完成');
    await loadStatus();
  } finally {
    setLoading(false);
  }
}

async function switchEditor(target) {
  state.current = target;
  await loadEditor();
}

async function boot() {
  dom.tabConfig.addEventListener('click', () => void switchEditor('config'));
  dom.tabTemplate.addEventListener('click', () => void switchEditor('template'));
  dom.refresh.addEventListener('click', () => void loadStatus());
  dom.syncAll.addEventListener('click', () => void syncAll());
  dom.save.addEventListener('click', () => void saveEditor());

  try {
    await Promise.all([loadStatus(), loadEditor()]);
    setInterval(() => void loadStatus(), 5000);
  } catch (error) {
    setMessage(error instanceof Error ? error.message : String(error), true);
  }
}

void boot();
