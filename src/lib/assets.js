import { shallowReactive } from 'vue'
import { LIMITS, uid } from './model'
import { db } from './storage'
export const assetCache = shallowReactive(new Map())
export function sniffRaster(bytes) {
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10) return 'image/png'
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg'
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp'
  throw new Error('PNG, JPG, WEBP 이미지 파일만 사용할 수 있습니다. SVG와 실행 파일은 지원하지 않습니다.')
}
export async function decodeAsset(blob, name, id = uid()) {
  if (!(blob instanceof Blob) || !blob.size || blob.size > LIMITS.assetBytes) throw new Error('이미지는 15 MB 이하의 파일을 선택해 주세요.')
  const mime = sniffRaster(new Uint8Array(await blob.slice(0, 12).arrayBuffer()))
  const safeBlob = new Blob([blob], { type: mime })
  const url = URL.createObjectURL(safeBlob)
  const image = new Image()
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('이미지 로딩 시간이 초과되었습니다. 다른 파일을 선택해 주세요.')), 12000)
      image.onload = () => { clearTimeout(timer); resolve() }
      image.onerror = () => { clearTimeout(timer); reject(new Error('이미지 파일을 읽을 수 없습니다. 파일이 손상되었는지 확인해 주세요.')) }
      image.src = url
    })
    if (!image.naturalWidth || image.naturalWidth > 8192 || image.naturalHeight > 8192) throw new Error('이미지의 가로·세로는 각각 8192 px 이하여야 합니다.')
    const width = image.naturalWidth, height = image.naturalHeight
    const scale = Math.min(1, 768 / width, 768 / height)
    const preview = document.createElement('canvas'); preview.width = Math.max(1, Math.round(width*scale)); preview.height = Math.max(1, Math.round(height*scale))
    preview.getContext('2d').drawImage(image, 0, 0, preview.width, preview.height)
    const thumbnail = await new Promise(resolve => preview.toBlob(resolve, 'image/png'))
    const previewUrl = URL.createObjectURL(thumbnail)
    image.src = ''; URL.revokeObjectURL(url)
    return { id, name: String(name).slice(0, 100), mime, width, height, blob: safeBlob, image: preview, url: previewUrl, dirty: true }
  } catch (error) { URL.revokeObjectURL(url); throw error }
}
export function registerAsset(asset) { if (assetCache.has(asset.id)) URL.revokeObjectURL(assetCache.get(asset.id).url); assetCache.set(asset.id, asset) }
export function clearAssets() { for (const a of assetCache.values()) URL.revokeObjectURL(a.url); assetCache.clear() }
export function releaseAsset(id) { const asset = assetCache.get(id); if (asset) { URL.revokeObjectURL(asset.url); asset.image.width = 0; asset.image.height = 0; assetCache.delete(id) } }
export const dirtyAssets = () => [...assetCache.values()].filter(a => a.dirty)
export function markAssetsSaved(saved) { for (const asset of saved) if (assetCache.get(asset.id)?.blob === asset.blob) asset.dirty = false }
export async function loadProjectAssets(project) {
  const missing = []
  const ids = [...new Set(project.design.elements.filter(e => e.type === 'image').map(e => e.assetId))]
  for (const id of ids) {
    if (assetCache.has(id)) continue
    try {
      const a = await db.assets.get(id)
      if (!a) throw new Error('missing')
      const asset = await decodeAsset(a.blob, a.name, id); asset.dirty = false; registerAsset(asset)
    } catch { missing.push(id) }
  }
  return missing
}
export function referencedAssets(project, visibleOnly = false) {
  return [...new Set(project.design.elements.filter(e => e.type === 'image' && (!visibleOnly || e.visible)).map(e => e.assetId))].map(id => {
    const a = assetCache.get(id)
    if (!a) throw new Error('프로젝트의 이미지가 누락되었습니다. 해당 이미지 레이어를 삭제하거나 다시 업로드해 주세요.')
    return a
  })
}
export async function originalImages(project) {
  const assets = referencedAssets(project, true), images = new Map()
  if (assets.reduce((sum, a) => sum + a.width*a.height, 0) > LIMITS.exportPixels) throw new Error('출력할 이미지의 총 픽셀 수가 너무 큽니다. 일부 이미지를 숨기거나 원본 크기를 줄여 주세요. (96 MP 제한)')
  try {
    for (const a of assets) {
      const url = URL.createObjectURL(a.blob), image = new Image()
      let timer
      try { await Promise.race([image.decode ? (image.src = url, image.decode()) : new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url }), new Promise((_, reject) => {timer=setTimeout(() => reject(new Error('원본 이미지 로딩 시간이 초과되었습니다.')), 12000)})]); images.set(a.id, image) }
      finally { clearTimeout(timer);URL.revokeObjectURL(url) }
    }
    return images
  } catch (error) { for (const image of images.values()) image.src = ''; throw error }
}
