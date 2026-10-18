import JSZip from 'jszip'
import { SCHEMA_VERSION, validateProject, uid, clone, LIMITS } from './model'
import { decodeAsset, referencedAssets } from './assets'
const crcTable = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n })
async function checkedBytes(entry) {
  const bytes = await entry.async('uint8array')
  let crc = -1
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8)
  if (((crc ^ -1) | 0) !== entry._data.crc32) throw new Error('프로젝트 파일의 무결성 검사에 실패했습니다. 원본 백업을 다시 선택해 주세요.')
  return bytes
}
export async function createArchive(project) {
  validateProject(project)
  const zip = new JSZip()
  const assets = referencedAssets(project)
  const manifest = JSON.stringify({ app: 'SIHYEON STUDIO', schemaVersion: SCHEMA_VERSION, project: clone(project), assets: assets.map(a => ({ id: a.id, name: a.name, path: `assets/${a.id}`, mime: a.mime })) }, null, 2)
  const manifestSize = new TextEncoder().encode(manifest).length
  if (manifestSize > LIMITS.manifestBytes || manifestSize + assets.reduce((sum,a) => sum+a.blob.size,0) > LIMITS.archiveBytes) throw new Error('복원 가능한 백업 용량을 초과했습니다. 전체 120 MB, 일정·디자인 정보 3 MB 이내로 프로젝트를 나누어 주세요.')
  zip.file('manifest.json', manifest)
  for (const a of assets) zip.file(`assets/${a.id}`, await a.blob.arrayBuffer())
  const archive = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  if (archive.size > LIMITS.archiveBytes) throw new Error('프로젝트 백업은 120 MB 이하만 저장할 수 있습니다. 프로젝트를 나누어 주세요.')
  return archive
}
export async function readArchive(file) {
  if (!file.name.toLowerCase().endsWith('.tssproj')) throw new Error('.tssproj 프로젝트 파일을 선택해 주세요.')
  if (file.size > LIMITS.archiveBytes) throw new Error('프로젝트 파일은 120 MB 이하만 가져올 수 있습니다.')
  let zip, manifest
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer(), { checkCRC32: false })
    const entries = Object.values(zip.files)
    if (entries.length > 104 || entries.some(e => e.unsafeOriginalName && e.unsafeOriginalName !== e.name)) throw new Error('unsafe')
    let size = 0
    for (const e of entries) {
      if (e.dir) { if (e.name !== 'assets/') throw new Error('unsafe'); continue }
      if (e.name !== 'manifest.json' && !/^assets\/[a-zA-Z0-9-]{1,100}$/.test(e.name)) throw new Error('unsafe')
      size += e._data?.uncompressedSize || 0
    }
    if (size > LIMITS.archiveBytes || !zip.file('manifest.json') || zip.file('manifest.json')._data.uncompressedSize > LIMITS.manifestBytes) throw new Error('size')
    manifest = JSON.parse(new TextDecoder().decode(await checkedBytes(zip.file('manifest.json'))))
  } catch { throw new Error('손상되었거나 안전하지 않은 프로젝트 파일입니다. 원본 백업을 다시 선택해 주세요.') }
  if (manifest.app !== 'SIHYEON STUDIO' || manifest.schemaVersion !== SCHEMA_VERSION) throw new Error('지원하지 않는 프로젝트 버전입니다. (schemaVersion 1 필요)')
  const project = validateProject(manifest.project)
  if (!Array.isArray(manifest.assets) || manifest.assets.length > 100) throw new Error('이미지 목록이 손상되었습니다.')
  const assets = [], seen = new Set()
  try {
    for (const a of manifest.assets) {
      if (!/^[a-zA-Z0-9-]{1,100}$/.test(a.id) || a.path !== `assets/${a.id}` || seen.has(a.id)) throw new Error('이미지 연결 정보가 올바르지 않습니다.')
      seen.add(a.id)
      const entry = zip.file(a.path)
      if (!entry) throw new Error(`이미지가 누락되었습니다: ${a.name || a.id}`)
      if (entry._data.uncompressedSize > 15 * 1024 * 1024) throw new Error('프로젝트에 15 MB를 초과하는 이미지가 있습니다.')
      assets.push(await decodeAsset(new Blob([await checkedBytes(entry)]), a.name, a.id))
    }
    for (const e of project.design.elements) if (e.type === 'image' && !seen.has(e.assetId)) throw new Error(`프로젝트 이미지가 누락되었습니다: ${e.name}`)
    // A restored copy owns new asset IDs, so it can never replace an older project's Blobs.
    const remap = new Map(assets.map(a => [a.id, uid()]))
    for (const a of assets) a.id = remap.get(a.id)
    for (const e of project.design.elements) if (e.type === 'image') e.assetId = remap.get(e.assetId)
    project.id = uid()
    return { project, assets }
  } catch (error) { assets.forEach(a => URL.revokeObjectURL(a.url)); throw error }
}
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a')
  anchor.href = url; anchor.download = name; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
