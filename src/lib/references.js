export const REFERENCE_IMAGES = [
  { id: 'uniform', file: 'sihyeon-uniform.png', name: '텐타시현 · 제복 클로즈업' },
  { id: 'scene', file: 'sihyeon-scene.png', name: '텐타시현 · 장면 이미지' }
]
export const referenceUrl = ref => `${import.meta.env.BASE_URL}references/${ref.file}`
