// IndexedDBの薄いPromiseラッパ。外部ライブラリ非依存。
const DB_NAME = 'kanji-quest'
const DB_VERSION = 2

export const STORE_NAMES = [
  'profiles',
  'kanjiProgress',
  'strokeSamples',
  'testResults',
  'testSessions',
  'practiceSessions',
  'unknownKanji',
  'coinHistory',
  'ownedCharacters',
  'dexEntries',
  'gachaHistory',
  'activityFeed',
  'settings',
] as const

export type StoreName = (typeof STORE_NAMES)[number]

let dbPromise: Promise<IDBDatabase> | null = null

export function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      const mk = (name: string, opts?: IDBObjectStoreParameters): IDBObjectStore => {
        if (db.objectStoreNames.contains(name)) return req.transaction!.objectStore(name)
        return db.createObjectStore(name, opts)
      }
      mk('profiles', { keyPath: 'id' })
      const progress = mk('kanjiProgress', { keyPath: ['profileId', 'char'] })
      if (!progress.indexNames.contains('byProfile')) progress.createIndex('byProfile', 'profileId')
      const samples = mk('strokeSamples', { keyPath: 'id', autoIncrement: true })
      if (!samples.indexNames.contains('byProfile')) samples.createIndex('byProfile', 'profileId')
      const tests = mk('testResults', { keyPath: 'id', autoIncrement: true })
      if (!tests.indexNames.contains('byProfile')) tests.createIndex('byProfile', 'profileId')
      const sessions = mk('testSessions', { keyPath: ['profileId', 'testKey'] })
      if (!sessions.indexNames.contains('byProfile')) sessions.createIndex('byProfile', 'profileId')
      const practice = mk('practiceSessions', { keyPath: ['profileId', 'stageId'] })
      if (!practice.indexNames.contains('byProfile')) practice.createIndex('byProfile', 'profileId')
      const unknown = mk('unknownKanji', { keyPath: ['profileId', 'char'] })
      if (!unknown.indexNames.contains('byProfile')) unknown.createIndex('byProfile', 'profileId')
      const coins = mk('coinHistory', { keyPath: 'id', autoIncrement: true })
      if (!coins.indexNames.contains('byProfile')) coins.createIndex('byProfile', 'profileId')
      const owned = mk('ownedCharacters', { keyPath: 'id', autoIncrement: true })
      if (!owned.indexNames.contains('byProfile')) owned.createIndex('byProfile', 'profileId')
      const dex = mk('dexEntries', { keyPath: ['profileId', 'speciesId', 'stage'] })
      if (!dex.indexNames.contains('byProfile')) dex.createIndex('byProfile', 'profileId')
      const gacha = mk('gachaHistory', { keyPath: 'id', autoIncrement: true })
      if (!gacha.indexNames.contains('byProfile')) gacha.createIndex('byProfile', 'profileId')
      mk('activityFeed', { keyPath: 'id', autoIncrement: true })
      mk('settings', { keyPath: 'key' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
  })
  return dbPromise
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
  })
}

async function withStore<T>(name: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await getDb()
  const tx = db.transaction(name, mode)
  const result = promisify(fn(tx.objectStore(name)))
  return result
}

export function dbGet<T>(name: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return withStore(name, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>)
}

export function dbPut(name: StoreName, value: unknown): Promise<IDBValidKey> {
  return withStore(name, 'readwrite', (s) => s.put(value))
}

export function dbAdd(name: StoreName, value: unknown): Promise<IDBValidKey> {
  return withStore(name, 'readwrite', (s) => s.add(value))
}

export function dbDelete(name: StoreName, key: IDBValidKey): Promise<undefined> {
  return withStore(name, 'readwrite', (s) => s.delete(key)) as Promise<undefined>
}

export function dbClear(name: StoreName): Promise<undefined> {
  return withStore(name, 'readwrite', (s) => s.clear()) as Promise<undefined>
}

export function dbGetAll<T>(name: StoreName): Promise<T[]> {
  return withStore(name, 'readonly', (s) => s.getAll() as IDBRequest<T[]>)
}

export function dbCount(name: StoreName): Promise<number> {
  return withStore(name, 'readonly', (s) => s.count())
}

export async function dbIndexAll<T>(name: StoreName, indexName: string, key: IDBValidKey): Promise<T[]> {
  const db = await getDb()
  const tx = db.transaction(name, 'readonly')
  return promisify(tx.objectStore(name).index(indexName).getAll(key) as IDBRequest<T[]>)
}

export async function dbIndexKeys(name: StoreName, indexName: string, key: IDBValidKey): Promise<IDBValidKey[]> {
  const db = await getDb()
  const tx = db.transaction(name, 'readonly')
  return promisify(tx.objectStore(name).index(indexName).getAllKeys(key))
}
