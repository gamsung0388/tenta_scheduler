import Dexie from 'dexie'
import { clone, validateProject } from './model'
export const db = new Dexie('sihyeon-studio-v1')
db.version(1).stores({ projects: 'id,updatedAt', assets: 'id', snapshots: '++id,projectId,createdAt', preferences: 'key' })
export async function getCurrentProject() {
  const pref = await db.preferences.get('lastProject')
  if (!pref) return null
  const raw = await db.projects.get(pref.value)
  if (!raw) throw new Error('마지막 프로젝트를 찾지 못했습니다. 백업 파일로 복원해 주세요.')
  return { ...validateProject(raw), storageVersion: raw.storageVersion || 0 }
}
export class SaveConflictError extends Error { constructor() { super('다른 탭에서 이 프로젝트를 변경했습니다. 최신 작업을 열거나 현재 작업을 사본으로 저장해 주세요.'); this.name = 'SaveConflictError' } }
export async function readProject(id) { const raw = await db.projects.get(id); if (!raw) throw new Error('프로젝트를 찾지 못했습니다.'); return { ...validateProject(raw), storageVersion: raw.storageVersion || 0 } }
export async function saveProject(project, assets = [], expectedVersion = null) {
  const data = clone(project)
  return db.transaction('rw', db.projects, db.assets, db.snapshots, db.preferences, async () => {
    const existing = await db.projects.get(data.id)
    if ((expectedVersion === null && existing) || (expectedVersion !== null && (!existing || (existing.storageVersion || 0) !== expectedVersion))) throw new SaveConflictError()
    const version = (existing?.storageVersion || 0) + 1
    if (assets.length) await db.assets.bulkPut(assets.map(({ id, name, mime, width, height, blob }) => ({ id, name, mime, width, height, blob })))
    await db.projects.put({ ...data, storageVersion: version })
    await db.preferences.put({ key: 'lastProject', value: data.id })
    const old = await db.snapshots.where('projectId').equals(data.id).sortBy('createdAt')
    const addSnapshot = !old.length || Date.now() - old.at(-1).createdAt >= 30000
    if (addSnapshot) await db.snapshots.add({ projectId: data.id, createdAt: Date.now(), data })
    if (old.length + Number(addSnapshot) > 10) await db.snapshots.bulkDelete(old.slice(0, old.length + Number(addSnapshot) - 10).map(x => x.id))
    return version
  })
}
export async function listSnapshots() {
  const entries = await db.snapshots.orderBy('createdAt').reverse().toArray()
  return entries.flatMap(entry => { try { return [{ ...entry, data: validateProject(entry.data) }] } catch { return [] } })
}
const referenced = project => project?.design?.elements?.filter(e => e.type === 'image').map(e => e.assetId) || []
export async function cleanUnusedAssets(liveProjects = []) {
  return db.transaction('rw', db.projects, db.snapshots, db.assets, async () => {
    const projects = await db.projects.toArray(), snapshots = await db.snapshots.toArray()
    const used = new Set([...projects, ...snapshots.map(s => s.data), ...liveProjects].flatMap(referenced))
    const assets = await db.assets.toArray(), unused = assets.filter(a => !used.has(a.id))
    await db.assets.bulkDelete(unused.map(a => a.id))
    return unused.map(a => a.id)
  })
}
