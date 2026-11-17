import { api } from '@/lib/api';
import { runtimePath } from '@/lib/browser';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { z } from 'zod';

const todo = z.object({
  id: z.string().uuid(),
  text: z.string().trim().min(1).max(500),
  done: z.boolean(),
  createdAt: z.string(),
});
const todoList = z.array(todo).max(500);

async function readTodos(userId: string) {
  try {
    const data = await readFile(runtimePath(userId, 'personal-todos.json'), 'utf8');
    return todoList.parse(JSON.parse(data));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function saveTodos(userId: string, items: z.infer<typeof todoList>) {
  const dir = runtimePath(userId);
  await mkdir(dir, { recursive: true });
  const temp = runtimePath(userId, 'personal-todos-' + crypto.randomUUID() + '.tmp');
  await writeFile(temp, JSON.stringify(todoList.parse(items)), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  await rename(temp, runtimePath(userId, 'personal-todos.json'));
}

export const GET = (request: Request) => api(request, async userId =>
  Response.json(await readTodos(userId), {headers: {'Cache-Control': 'no-store'}})
);
export const POST = (request: Request) => api(request, async userId => {
  const { text } = z.object({ text: z.string().trim().min(1).max(500) }).parse(await request.json());
  const items = await readTodos(userId);
  if (items.length >= 500) throw new Error('Maximum 500 personal to-dos.');
  const item = { id: crypto.randomUUID(), text, done: false, createdAt: new Date().toISOString() };
  items.push(item);
  await saveTodos(userId, items);
  return Response.json(item, {status: 201});
});
export const PATCH = (request: Request) => api(request, async userId => {
  const { id, done } = z.object({ id: z.string().uuid(), done: z.boolean() }).parse(await request.json());
  const items = await readTodos(userId);
  const item = items.find(t => t.id === id);
  if (!item) return Response.json({error: 'To-do not found'}, {status: 404});
  item.done = done;
  await saveTodos(userId, items);
  return Response.json(item);
});
export const DELETE = (request: Request) => api(request, async userId => {
  const { id } = z.object({ id: z.string().uuid() }).parse(await request.json());
  const items = await readTodos(userId);
  const next = items.filter(t => t.id !== id);
  if (next.length === items.length) return Response.json({error: 'To-do not found'}, {status: 404});
  await saveTodos(userId, next);
  return Response.json({ok: true});
});
