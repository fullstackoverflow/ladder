export async function request<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
  });
  const content = await response.text();
  if (!response.ok) throw new Error(content || `请求失败 (${response.status})`);
  try {
    return JSON.parse(content) as T;
  } catch {
    return content as T;
  }
}
