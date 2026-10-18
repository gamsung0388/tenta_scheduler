<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import Konva from 'konva'
import { useProjectStore } from '../stores/project'
import { useEditorStore } from '../stores/editor'
import { renderProject } from '../lib/renderer'
import { assetCache } from '../lib/assets'
import { WIDTH, HEIGHT, GEOMETRY, elementBounds } from '../lib/model'
const project = useProjectStore(), editor = useEditorStore()
const stageRef = ref(), bg = ref(), decor = ref(), content = ref(), ui = ref(), host = ref()
let observer, transformer, nodes = [], frame, verticalGuide, horizontalGuide
const stageConfig = computed(() => ({ width: WIDTH * editor.zoom, height: HEIGHT * editor.zoom, scaleX: editor.zoom, scaleY: editor.zoom }))
function fit() {
  if (!host.value || !editor.fit) return
  editor.zoom = Math.max(.1, Math.min((host.value.clientWidth - 80) / WIDTH, (host.value.clientHeight - 84) / HEIGHT, 1))
}
function select() {
  if (!transformer) return
  const e = project.elements.find(e => e.id === editor.selection)
  const node = nodes.find(n => n.getAttr('elementId') === editor.selection)
  transformer.nodes(editor.mode === 'design' && e?.visible && !e.locked && node ? [node] : [])
  transformer.keepRatio(!!(e?.type === 'image' && e.keepRatio)); transformer.forceUpdate()
  ui.value?.getNode().batchDraw()
}
async function draw() {
  await nextTick()
  if (!bg.value) return
  transformer?.nodes([])
  nodes = renderProject({ background: bg.value.getNode(), decoration: decor.value.getNode(), content: content.value.getNode() }, project.data, editor.mode === 'design')
  editor.issues = nodes.issues
  nodes.forEach(node => {
    const id = node.getAttr('elementId')
    node.off('.editor')
    node.on('click.editor tap.editor', event => { event.cancelBubble = true; editor.selection = id })
    node.on('dragstart.editor', () => { editor.selection = id })
    node.on('dragmove.editor', event => {
      verticalGuide.visible(false); horizontalGuide.visible(false)
      const e = project.elements.find(e=>e.id===id)
      if (!editor.snapping || event.evt?.altKey) return
      const b = elementBounds(e), threshold = 6/editor.zoom
      for (const [axis,size,total,offset,guide] of [['x',b.width,WIDTH,b.minX,verticalGuide],['y',b.height,HEIGHT,b.minY,horizontalGuide]]) {
        const targets=[-offset,(total-size)/2-offset,total-size-offset], value=node[axis](), nearest=targets.reduce((a,v)=>Math.abs(v-value)<Math.abs(a-value)?v:a,targets[0])
        if (Math.abs(nearest-value)<=threshold) { node[axis](nearest); const coordinate=nearest===targets[0]?0:nearest===targets[1]?total/2:total; guide.points(axis==='x'?[coordinate,0,coordinate,HEIGHT]:[0,coordinate,WIDTH,coordinate]); guide.visible(true) }
      }
      ui.value.getNode().batchDraw()
    })
    node.on('dragend.editor', () => { verticalGuide.visible(false); horizontalGuide.visible(false); project.updateElement(id, { x: Math.round(node.x()), y: Math.round(node.y()) }) })
    node.on('transformend.editor', () => {
      const e = project.elements.find(e => e.id === id)
      const baseW = e.type === 'schedule' ? 1280 : node.width(), baseH = e.type === 'schedule' ? 630 : node.height()
      const width = Math.max(GEOMETRY.minSize, baseW * node.scaleX())
      const height = e.type === 'image' && e.keepRatio ? width * e.height / e.width : Math.max(GEOMETRY.minSize, baseH * node.scaleY())
      project.updateElement(id, { x: Math.round(node.x()), y: Math.round(node.y()), width, height, rotation: Math.round(node.rotation()) })
    })
  })
  select()
}
function queueDraw() { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw) }
function clear(event) { if (event.target === stageRef.value.getNode() || event.target.getLayer() === bg.value.getNode()) editor.selection = null }
onMounted(() => {
  transformer = new Konva.Transformer({ rotateEnabled: true, flipEnabled: false, borderStroke: '#de9ab0', anchorStroke: '#802d4b', anchorFill: '#fff2f5', anchorSize: 8, borderStrokeWidth: 1.5, padding: 3, boundBoxFunc: (oldBox, newBox) => newBox.width < GEOMETRY.minSize * editor.zoom || newBox.height < GEOMETRY.minSize * editor.zoom ? oldBox : newBox })
  verticalGuide = new Konva.Line({stroke:'#e4acc5',strokeWidth:1,dash:[8,5],listening:false,visible:false})
  horizontalGuide = verticalGuide.clone()
  ui.value.getNode().add(verticalGuide,horizontalGuide)
  ui.value.getNode().add(transformer)
  observer = new ResizeObserver(fit); observer.observe(host.value); fit(); draw()
  document.fonts?.ready.then(queueDraw)
})
watch(() => [project.revision, editor.mode, assetCache.size], queueDraw)
watch(() => [editor.selection, editor.mode], select)
watch(() => editor.fit, fit)
onBeforeUnmount(() => { cancelAnimationFrame(frame); observer?.disconnect(); transformer?.destroy() })
defineExpose({ fit })
</script>
<template>
  <div ref="host" class="canvas-viewport" :class="{ designing: editor.mode === 'design' }" @pointerdown.self="editor.selection = null">
    <div class="canvas-paper" :style="{ width: `${WIDTH * editor.zoom}px`, height: `${HEIGHT * editor.zoom}px` }">
      <v-stage ref="stageRef" :config="stageConfig" @mousedown="clear" @touchstart="clear">
        <v-layer ref="bg" :config="{ listening: false }" />
        <v-layer ref="decor" :config="{ listening: false }" />
        <v-layer ref="content" />
        <v-layer ref="ui" />
      </v-stage>
      <div v-if="editor.guides" class="safe-area" aria-hidden="true"></div>
    </div>
  </div>
</template>
