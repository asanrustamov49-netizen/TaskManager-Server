// Хранилище данных: обычный JSON-файл вместо настоящей базы данных.
//
// Как это работает:
// - readDb() один раз читает файл и держит данные в памяти (переменная cache).
// - updateDb(fn) меняет данные в памяти и сохраняет файл на диск.
//
// Все изменения нужно делать только через updateDb, а не писать в файл напрямую.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { config } from "./config.js";
import type { DbSchema } from "./types.js";

let cache: DbSchema | null = null;

// «Очередь» записей. Каждая новая запись ждёт, пока закончится предыдущая.
// Без неё два одновременных запроса могли бы затереть изменения друг друга.
let writeQueue: Promise<void> = Promise.resolve();

export async function readDb(): Promise<DbSchema> {
  if (cache) return cache;

  try {
    const text = await readFile(config.dbPath, "utf8");
    cache = JSON.parse(text) as DbSchema;
  } catch (err) {
    // Файла ещё нет (первый запуск) — начинаем с пустой базы. Любая другая ошибка — настоящая проблема.
    const fileNotFound = (err as NodeJS.ErrnoException).code === "ENOENT";
    if (!fileNotFound) throw err;
    cache = { users: [], tasks: [] };
  }

  return cache;
}

// Пример: await updateDb((db) => { db.tasks.push(newTask); return newTask; })
// То, что вернёт функция-аргумент, вернёт и сам updateDb.
// Если функция бросит ошибку, файл не сохраняется и ошибка уходит дальше.
export function updateDb<T>(mutate: (db: DbSchema) => T): Promise<T> {
  const run = writeQueue.then(async () => {
    const db = await readDb();
    const result = mutate(db);

    // Сначала пишем во временный файл, потом переименовываем.
    // Так при сбое посреди записи старый db.json останется целым.
    await mkdir(dirname(config.dbPath), { recursive: true });
    const tmpPath = `${config.dbPath}.tmp`;
    await writeFile(tmpPath, JSON.stringify(db, null, 2));
    await rename(tmpPath, config.dbPath);

    return result;
  });

  // Следующая запись ждёт эту, даже если эта упала с ошибкой.
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}
