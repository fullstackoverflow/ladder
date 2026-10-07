import { test, expect } from '@playwright/test';

test('local contents create UUID files in one save without upload or file selection', async ({
  page,
}) => {
  const original = await (await page.request.get('/api/admin/state')).json();
  try {
    await page.goto('/admin');
    await page.getByRole('button', { name: '新增上游', exact: true }).click();
    await page.getByLabel('名称', { exact: true }).fill('自动管理上游');
    await expect(
      page.getByRole('combobox', { name: '来源', exact: true }),
    ).toHaveValue('local');
    await expect(page.getByLabel('本地文件内容', { exact: true })).toHaveValue(
      '',
    );
    await page
      .getByRole('combobox', { name: '来源', exact: true })
      .selectOption('URI');
    await page.getByText('刷新与高级设置', { exact: true }).click();
    await expect(
      page.getByRole('combobox', { name: '编码', exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('使用节点模板', { exact: true })).toHaveCount(
      0,
    );
    await page
      .getByRole('combobox', { name: '来源', exact: true })
      .selectOption('local');
    for (const label of [
      '编码',
      '刷新间隔（秒）',
      '重试次数',
      '重试间隔（秒）',
      '退避倍数',
    ]) {
      await expect(page.getByLabel(label, { exact: true })).toHaveCount(0);
    }
    await expect(page.locator('.config-dialog .advanced')).toHaveCount(0);
    await page
      .getByRole('combobox', { name: '内容格式', exact: true })
      .selectOption('json');
    await page
      .getByLabel('本地文件内容', { exact: true })
      .fill('{"proxies":[{"name":"Managed node"}]}');
    await expect(page.locator('input[type=file]')).toHaveCount(0);
    await expect(page.getByLabel('文件名', { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole('combobox', { name: '本地文件', exact: true }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: '保存配置', exact: true }).click();
    const card = page
      .locator('.source-card')
      .filter({ has: page.getByRole('heading', { name: '自动管理上游' }) });
    await card
      .getByRole('button', { name: '编辑文件内容', exact: true })
      .click();
    await expect(card.locator('.cm-content')).toContainText('Managed node');
    const saved = await (await page.request.get('/api/admin/state')).json();
    const path = saved.config.upstreams.at(-1).from;
    expect(Object.keys(saved.config.upstreams.at(-1)).sort()).toEqual([
      'format',
      'from',
      'name',
      'source',
    ]);
    expect(path.split(/[\\/]/).at(-1)).toMatch(/^[0-9a-f-]{36}\.json$/);
    await card
      .locator('.cm-content')
      .fill('{"proxies":[{"name":"Edited managed node"}]}');
    await card.getByRole('button', { name: '保存', exact: true }).click();
    await expect(page.locator('.toast')).toContainText('文件已保存');
    await card
      .getByRole('button', { name: '编辑 自动管理上游 的配置' })
      .click();
    await page.getByLabel('名称', { exact: true }).fill('改名后的上游');
    await page.getByRole('button', { name: '保存配置', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: '改名后的上游' }),
    ).toBeVisible();
    const renamed = await (await page.request.get('/api/admin/state')).json();
    expect(renamed.config.upstreams.at(-1).from).toBe(path);
    const profiles = await (
      await page.request.post('/api/admin/preview/profiles/rendered')
    ).json();
    expect(profiles.upstreams.at(-1).proxies[0].name).toBe(
      'Edited managed node',
    );
    await page
      .getByRole('navigation')
      .getByRole('button', { name: /输出模板/ })
      .click();
    await page
      .getByRole('button', { name: '编辑 Clash 主配置 的配置' })
      .click();
    await page.getByRole('button', { name: '删除', exact: true }).click();
    await page.getByRole('button', { name: '确认删除', exact: true }).click();
    await page.getByRole('button', { name: '新增模板', exact: true }).click();
    await page.getByLabel('名称', { exact: true }).fill('新模板');
    await page
      .getByLabel('模板文件内容', { exact: true })
      .fill('marker: managed-template\n');
    await page.getByRole('button', { name: '保存配置', exact: true }).click();
    await expect(page.getByRole('heading', { name: '新模板' })).toBeVisible();
    expect(await (await page.request.get('/subscribe/clash')).text()).toBe(
      'marker: managed-template\n',
    );
  } finally {
    await page.request.put('/api/admin/config', { data: original.config });
  }
});

test('upstreams reorder by arrows and keyboard and preserve template array indices', async ({
  page,
}) => {
  const state = await (await page.request.get('/api/admin/state')).json();
  const second = {
    ...state.config.upstreams[0],
    name: '第二上游',
    from: state.config.rules[0].from,
  };
  const response = await page.request.put('/api/admin/config', {
    data: { ...state.config, upstreams: [...state.config.upstreams, second] },
  });
  expect(response.ok()).toBe(true);
  try {
    await page.goto('/admin');
    await page
      .getByRole('button', { name: '上移 第二上游', exact: true })
      .click();
    await expect(page.locator('.source-title h3').first()).toHaveText(
      '第二上游',
    );
    await expect(page.locator('.source-card').first()).toContainText(
      '$.upstreams[0]',
    );
    const saved = await (await page.request.get('/api/admin/state')).json();
    expect(
      saved.config.upstreams.map((source: { name: string }) => source.name),
    ).toEqual(['第二上游', '本地节点']);
    expect(saved.config.rules).toEqual(state.config.rules);
    const data = await (
      await page.request.post('/api/admin/preview/profiles/rendered')
    ).json();
    expect(data.upstreams[0].rules).toBeDefined();
    expect(data.upstreams[1].proxies).toBeDefined();
    await page.getByRole('textbox', { name: '搜索来源' }).fill('第二');
    await expect(
      page.getByRole('button', { name: '下移 第二上游' }),
    ).toBeDisabled();
    await page.getByRole('textbox', { name: '搜索来源' }).fill('');
    const handle = page.getByRole('button', { name: '拖动 第二上游 调整顺序' });
    await handle.focus();
    await page.keyboard.press('Space');
    await expect(handle).toHaveAttribute('aria-pressed', 'true');
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.keyboard.press('ArrowDown');
    await expect
      .poll(() =>
        page
          .locator('.source-card.dragging')
          .evaluate((element) =>
            Number(
              getComputedStyle(element).transform.match(
                /,\s*([\d.]+)\)$/,
              )?.[1] ?? 0,
            ),
          ),
      )
      .toBeGreaterThan(60);
    await page.keyboard.press('Space');
    await expect(page.locator('.source-title h3').first()).toHaveText(
      '本地节点',
    );
    await page.reload();
    await expect(page.locator('.source-title h3').first()).toHaveText(
      '本地节点',
    );
  } finally {
    await page.request.put('/api/admin/config', { data: state.config });
  }
});

test('file editor supports replace all, regex, undo and search shortcuts', async ({
  page,
}) => {
  await page.goto('/admin');
  await page.getByRole('button', { name: '编辑文件内容', exact: true }).click();
  const editor = page.locator('.inline-file-editor .cm-content');
  await editor.fill('node-1 node-2 other');
  await page.getByRole('button', { name: '查找 / 替换', exact: true }).click();
  const panel = page.locator('.cm-search');
  await panel
    .getByRole('textbox', { name: '查找', exact: true })
    .fill('node-\\d');
  await panel
    .getByRole('checkbox', { name: '正则表达式', exact: true })
    .check();
  await panel
    .getByRole('textbox', { name: '替换为', exact: true })
    .fill('proxy');
  await panel.getByRole('button', { name: '全部替换', exact: true }).click();
  await expect(editor).toHaveText('proxy proxy other');
  await expect(page.locator('.draft-badge')).toHaveText('未保存');
  await panel.getByRole('button', { name: '关闭', exact: true }).click();
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveText('node-1 node-2 other');
  await page.keyboard.press('ControlOrMeta+f');
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+h');
  await expect(
    panel.getByRole('textbox', { name: '替换为', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});

test('file content editing is available only for local sources', async ({
  page,
}) => {
  await page.route('**/api/admin/state', async (route) => {
    const response = await route.fetch();
    const state = await response.json();
    state.config.upstreams = state.config.upstreams.map((source: object) => ({
      ...source,
      source: 'URI',
      from: 'https://example.com/subscription.yaml',
    }));
    await route.fulfill({ response, json: state });
  });
  await page.goto('/admin');
  await expect(
    page.getByText('当前来源均为远程 URL。', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '编辑文件内容', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: '编辑 本地节点 的配置' }).click();
  await expect(
    page.getByRole('combobox', { name: '来源', exact: true }),
  ).toHaveValue('URI');
  await page.unroute('**/api/admin/state');
  await page.reload();
  await page.getByRole('button', { name: '编辑文件内容', exact: true }).click();
  await expect(page.locator('.inline-file-editor .cm-content')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('rules reorder by keyboard, file drafts survive navigation, and saving updates preview', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: '本地节点' })).toBeVisible();
  await page.getByRole('button', { name: '编辑文件内容', exact: true }).click();
  const editor = page.locator('.editor-panel .cm-content');
  await expect(editor).toBeVisible();
  await editor.fill('{"proxies":[{"name":"Updated node"}]}');
  await expect(page.locator('.draft-badge')).toHaveText('未保存');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /规则/ })
    .click();
  const handle = page.getByRole('button', {
    name: '拖动 个人覆盖规则 调整顺序',
  });
  await handle.focus();
  await page.keyboard.press('Space');
  await expect(handle).toHaveAttribute('aria-pressed', 'true');
  // The drag sensor measures drop targets on the next rendered frame.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await page.keyboard.press('ArrowDown');
  await expect
    .poll(async () =>
      page
        .locator('.source-card.dragging')
        .evaluate((element) =>
          Number(
            getComputedStyle(element).transform.match(/,\s*([\d.]+)\)$/)?.[1] ??
              0,
          ),
        ),
    )
    .toBeGreaterThan(60);
  await page.keyboard.press('Space');
  await expect(page.locator('.source-title h3').first()).toHaveText('通用规则');
  await page.screenshot({
    path: '.cache/ui-rules-desktop.png',
    fullPage: true,
  });
  const persisted = await page.request.get('/api/admin/state');
  expect((await persisted.json()).config.rules[0].name).toBe('通用规则');
  await page.getByRole('button', { name: '下移 通用规则' }).click();
  await expect(page.locator('.source-title h3').first()).toHaveText(
    '个人覆盖规则',
  );
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /文件编辑/ })
    .click();
  await expect(editor).toContainText('Updated node');
  await expect(page.locator('.draft-badge')).toHaveText('未保存');
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.locator('.preview-panel .cm-content')).toContainText(
    'Updated node',
  );
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+s');
  await expect(page.locator('.saved-badge')).toHaveText('已保存');
  await expect(page.locator('.toast')).toContainText('文件已保存');
  const rendered = await page.request.get('/subscribe/clash');
  expect(await rendered.text()).toContain('Updated node');
  await page.screenshot({
    path: '.cache/ui-editor-desktop.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test('source dialog, pointer sorting, deletion, and small screens remain usable', async ({
  page,
}) => {
  await page.goto('/admin');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /规则/ })
    .click();
  await page.getByRole('button', { name: '新增规则源', exact: true }).click();
  await page.getByLabel('名称', { exact: true }).fill('新增规则');
  await expect(
    page.getByRole('combobox', { name: '来源', exact: true }),
  ).toHaveValue('local');
  await page
    .getByRole('combobox', { name: '来源', exact: true })
    .selectOption('local');
  await page
    .getByLabel('本地文件内容', { exact: true })
    .fill('rules:\n  - MATCH,Proxy\n');
  await page.getByRole('button', { name: '保存配置', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '新增规则', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: '编辑 新增规则 的配置', exact: true })
    .click();
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '新增规则', exact: true }),
  ).toHaveCount(0);
  const secondName = await page
    .locator('.source-title h3')
    .nth(1)
    .textContent();
  const handle = await page
    .getByRole('button', { name: /^拖动/ })
    .first()
    .boundingBox();
  const target = await page.locator('.source-card').nth(1).boundingBox();
  expect(handle).not.toBeNull();
  expect(target).not.toBeNull();
  await page.mouse.move(
    handle!.x + handle!.width / 2,
    handle!.y + handle!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(handle!.x + 10, handle!.y + 20, { steps: 3 });
  await expect(page.locator('.source-card.dragging')).toBeVisible();
  await page.mouse.move(
    target!.x + target!.width / 2,
    target!.y + target!.height / 2,
    { steps: 10 },
  );
  await page.mouse.up();
  await expect(page.locator('.source-title h3').first()).toHaveText(
    secondName!,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBeTruthy();
  await page.screenshot({ path: '.cache/ui-rules-mobile.png', fullPage: true });
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /文件编辑/ })
    .click();
  await expect(page.locator('.editor-panel .cm-content')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBeTruthy();
  await page.screenshot({
    path: '.cache/ui-editor-mobile.png',
    fullPage: true,
  });
});

test('invalid file drafts show a recoverable preview error', async ({
  page,
}) => {
  await page.goto('/admin');
  await page.getByRole('button', { name: '编辑文件内容', exact: true }).click();
  const editor = page.locator('.editor-panel .cm-content');
  await expect(editor).toBeVisible();
  await editor.fill('{ invalid json');
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.locator('.preview-error')).toBeVisible();
  await editor.fill('{"proxies":[]}');
  await page.getByRole('button', { name: '刷新预览', exact: true }).click();
  await expect(page.locator('.preview-error')).toHaveCount(0);
  await expect(page.locator('.preview-panel .cm-content')).toContainText(
    'proxies: []',
  );
});

test('local upstream, rule and template files edit inline and save to their own paths', async ({
  page,
}) => {
  await page.goto('/admin');
  await page.getByRole('button', { name: '编辑文件内容', exact: true }).click();
  const editor = page.locator('.inline-file-editor .cm-content');
  await expect(editor).toBeVisible();
  await expect(
    page
      .getByRole('navigation')
      .getByRole('button', { name: '上游', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await editor.fill('{"proxies":[{"name":"Inline node"}]}');
  await page.getByRole('button', { name: '收起文件编辑器' }).click();
  await expect(editor).toHaveCount(0);
  await page.getByRole('button', { name: '编辑文件内容', exact: true }).click();
  await expect(editor).toContainText('Inline node');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.locator('.saved-badge')).toHaveText('已保存');
  const nodes = await page.request.post('/api/admin/preview/profiles/rendered');
  expect((await nodes.json()).upstreams[0].proxies[0].name).toBe('Inline node');
  await page.screenshot({
    path: '.cache/ui-inline-upstream.png',
    fullPage: true,
  });
  await page
    .getByRole('navigation')
    .getByRole('button', { name: '规则', exact: true })
    .click();
  const before = await (await page.request.get('/api/admin/state')).json();
  const rule = page.locator('.source-card').filter({
    has: page.getByRole('heading', { name: '个人覆盖规则', exact: true }),
  });
  await rule.getByRole('button', { name: '编辑文件内容', exact: true }).click();
  await expect(editor).toBeVisible();
  await expect(
    page
      .getByRole('navigation')
      .getByRole('button', { name: '规则', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await editor.fill(
    '{"rules":["DOMAIN,inline.example,DIRECT"],"metadata":"keep"}',
  );
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.locator('.saved-badge')).toHaveText('已保存');
  const after = await (await page.request.get('/api/admin/state')).json();
  expect(
    after.config.rules.map((source: { name: string }) => source.name),
  ).toEqual(before.config.rules.map((source: { name: string }) => source.name));
  const rules = await (
    await page.request.post('/api/admin/preview/profiles/rendered')
  ).json();
  expect(rules.rules).toContainEqual({
    rules: ['DOMAIN,inline.example,DIRECT'],
    metadata: 'keep',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBeTruthy();
  await page.screenshot({
    path: '.cache/ui-inline-rules-mobile.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole('navigation')
    .getByRole('button', { name: '输出模板', exact: true })
    .click();
  await page.getByRole('button', { name: '编辑模板', exact: true }).click();
  await expect(editor).toBeVisible();
  await expect(
    page
      .getByRole('navigation')
      .getByRole('button', { name: '输出模板', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await editor.fill('marker: inline-template\n');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.locator('.saved-badge')).toHaveText('已保存');
  expect(await (await page.request.get('/subscribe/clash')).text()).toBe(
    'marker: inline-template\n',
  );
});
