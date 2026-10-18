import Konva from 'konva'
import { WIDTH, HEIGHT, THEMES, DAYS, shortDate, addDays, scheduleLayout, createProject, changeTemplate, elementBounds, isOvernight } from './model'
import { assetCache, originalImages } from './assets'
const sceneStates = new WeakMap(), measurements = new Map()
const stats = { backgrounds: 0, decorations: 0, elements: 0, scheduleRows: 0, measurements: 0, draws: 0, totalMs: 0 }
export const getRenderStats = () => ({ ...stats, cachedMeasurements: measurements.size })
export const resetRenderStats = () => Object.keys(stats).forEach(key => stats[key] = 0)
export function clearTextCache() { measurements.clear() }
if (typeof document !== 'undefined') document.fonts?.addEventListener('loadingdone', clearTextCache)
const rect = (group, config) => { const n = new Konva.Rect(config); group.add(n); return n }
const line = (group, points, stroke, strokeWidth = 1, extra = {}) => group.add(new Konva.Line({ points, stroke, strokeWidth, ...extra }))
const text = (group, value, config) => { const n = new Konva.Text({ text: value, fontFamily: 'Malgun Gothic', listening: false, ...config }); group.add(n); return n }
export function fitText(group, value, box, config) {
  const { minSize = 12, ...style } = config
  style.fontFamily ||= 'Malgun Gothic'
  const key = JSON.stringify([value,box.width,box.height,style.fontFamily,style.fontSize,style.fontStyle,minSize])
  let fit = measurements.get(key)
  if (!fit) {
    stats.measurements++
    const measure = new Konva.Text({ ...style, text: value, width: box.width, wrap: 'char', lineHeight: 1.15 })
    let low = Math.round(Math.min(style.fontSize, minSize)*2), high = Math.round(style.fontSize*2), best = low
    measure.fontSize(low/2)
    const overflow = measure.height() > box.height
    while (low <= high) { const mid = Math.floor((low+high)/2); measure.fontSize(mid/2); if (measure.height() <= box.height) { best = mid; low = mid+1 } else high = mid-1 }
    fit = { fontSize: best/2, overflow }; measure.destroy(); measurements.set(key,fit)
    if (measurements.size > 1500) measurements.delete(measurements.keys().next().value)
  }
  const n = text(group, value, { ...style, x: box.x, y: box.y, width: box.width, height: box.height, wrap: 'char', lineHeight: 1.15, fontSize: fit.fontSize, ellipsis: fit.overflow })
  n.setAttr('fitOverflow', fit.overflow)
  return n
}
function backdrop(bg, decor, project) {
  const t = THEMES[project.design.templateId], journal = project.design.templateId === 'journal'
  rect(bg, { width: WIDTH, height: HEIGHT, fill: t.bg })
  rect(bg, { x: 28, y: 28, width: 1864, height: 1024, stroke: t.line, strokeWidth: 1 })
  rect(bg, { x: 38, y: 38, width: 1844, height: 1004, stroke: t.line, strokeWidth: .5 })
  rect(bg, { x: 1425, y: 38, width: 457, height: 1004, fill: journal ? '#e2dacb' : '#170d13' })
  if (!journal) {
    line(bg, [1425, 38, 1425, 1042], '#c7c0cb', 1, { opacity: .35 })
    line(bg, [1433, 38, 1433, 1042], '#6f263c', 4)
    line(decor, [1496, 112, 1652, 112], '#d9d3df', 3)
    line(decor, [1652, 112, 1808, 112], '#9d2949', 3)
  }
  if (journal) for (let y = 60; y < 1040; y += 28) line(bg, [38, y, 1880, y], '#c5b8a8', .5, { opacity: .16 })
  text(decor, 'SIHYEON  /  WEEKLY RECORD', { x: 88, y: 70, fontSize: 17, fill: t.muted, letterSpacing: 4 })
  text(decor, journal ? 'JOURNAL No. 01' : 'ACADEMY ARCHIVES', { x: 1490, y: 74, width: 325, align: 'center', fontFamily: 'Georgia', fontSize: 15, fill: t.muted, letterSpacing: 3 })
  text(decor, `${shortDate(project.activeWeek)} — ${shortDate(addDays(project.activeWeek, 6))}`, { x: 1465, y: 148, width: 377, align: 'center', fontFamily: 'Georgia', fontSize: 36, fill: t.ink })
  text(decor, project.activeWeek.slice(0, 4), { x: 1490, y: 202, width: 325, align: 'center', fontFamily: 'Georgia', fontSize: 18, fill: t.muted, letterSpacing: 8 })
  line(decor, [1494, 258, 1812, 258], t.line)
  const cx = 1652, cy = 530
  for (const radius of [161, 172, 213]) decor.add(new Konva.Circle({ x: cx, y: cy, radius, stroke: t.line, strokeWidth: radius === 172 ? 2 : 1, opacity: .65 }))
  decor.add(new Konva.RegularPolygon({ x: cx, y: cy, sides: 4, radius: 187, rotation: 45, stroke: t.line, strokeWidth: 1 }))
  decor.add(new Konva.RegularPolygon({ x: cx, y: cy, sides: 3, radius: 123, rotation: 180, stroke: t.accent, strokeWidth: 1, opacity: .65 }))
  if (journal) {
    decor.add(new Konva.Circle({ x: cx, y: cy - 10, radius: 62, fill: t.ink, opacity: .87 }))
    decor.add(new Konva.Circle({ x: cx + 28, y: cy - 29, radius: 58, fill: '#e2dacb' }))
  } else {
    decor.add(new Konva.Circle({ x: cx, y: cy, radius: 72, stroke: '#c6bfce', strokeWidth: 2, opacity: .6 }))
    decor.add(new Konva.Circle({ x: cx, y: cy, radius: 81, stroke: '#c6bfce', strokeWidth: 1, dash: [2, 8], opacity: .5 }))
    line(decor, [cx,cy-54,cx+38,cy,cx,cy+54,cx-38,cy], '#ded6e5', 2, { closed: true, fill: '#8f2341' })
    line(decor, [cx,cy-54,cx+38,cy,cx,cy], '#ba5c79', 1, { closed:true, fill:'#ca7892' })
    line(decor, [cx-38,cy,cx,cy+54,cx,cy], '#702038', 1, { closed:true, fill:'#4b142a' })
    for (const offset of [0, 12]) line(decor, [cx-68,cy+30+offset,cx-120,cy+132+offset,cx+120,cy+132+offset,cx+68,cy+30+offset], '#bdb5c5', 1, { bezier:true, opacity:.5 })
  }
  for (const [x, y] of [[cx, cy - 214], [cx - 214, cy], [cx + 214, cy], [cx, cy + 214]]) decor.add(new Konva.Star({ x, y, numPoints: 4, innerRadius: 3, outerRadius: 12, fill: t.accent }))
  if (!project.design.elements.some(e => e.type === 'image' && e.visible && e.x > 1350)) text(decor, journal ? 'THE UNWRITTEN\nCHAPTER' : 'A WEEK OF\nYOUR OWN.', { x: 1485, y: 794, width: 335, align: 'center', fontFamily: 'Georgia', fontSize: 32, lineHeight: 1.35, fill: t.muted, letterSpacing: 3 })
  line(decor, [88, 987, 1360, 987], t.line)
  text(decor, 'ALL TIMES KST  /  일정은 사정에 따라 변경될 수 있습니다.', { x: 90, y: 1006, fontSize: 15, fill: t.muted, letterSpacing: 1 })
  text(decor, 'VII', { x: 1720, y: 1003, width: 100, align: 'right', fontFamily: 'Georgia', fontSize: 20, fill: t.muted })
}
function updateSchedule(group, element, project) {
  const t = THEMES[project.design.templateId]
  const settings = project.design.scheduleSettings || {}
  group.setAttrs({ x: element.x, y: element.y, width: 1280, height: 630, scaleX: element.width/1280, scaleY: element.height/630, rotation: element.rotation })
  group._studioRows ||= new Map()
  const issues = []
  for (const row of scheduleLayout(project.weeks[project.activeWeek], 1280, 630, settings)) {
    const key = JSON.stringify([row.date,row.events,row.height,row.columns,settings,project.design.templateId])
    let saved = group._studioRows.get(row.index)
    if (saved?.key === key) { saved.node.y(row.y); issues.push(...saved.issues); continue }
    saved?.node.destroy(); stats.scheduleRows++
    const g = new Konva.Group({ y: row.y }), rowIssues = []
    group.add(g); group._studioRows.set(row.index,{ key,node:g,issues:rowIssues })
    const add = (value,box,style,kind,eventIndex) => {
      const node = fitText(g,value,box,style)
      node.setAttr('fitRole',kind)
      if (node.getAttr('fitOverflow')) rowIssues.push({ elementId: element.id, dayIndex: row.index, severity: settings.allowSummary ? 'warning' : 'error', kind:'overflow', message:`${shortDate(row.date)} 일정 ${eventIndex+1} ${kind}: 공간이 부족합니다. 내용을 줄이거나 설명·열 설정을 변경해 주세요.` })
      return node
    }
    rect(g, { width: row.width, height: row.height, fill: t.paper, cornerRadius: 3 })
    rect(g, { width: 4, height: row.height, fill: row.events.length ? t.accent : t.line })
    text(g, DAYS[row.index], { x: 26, y: (row.height - 29) / 2, fontSize: 29, fill: t.ink })
    text(g, shortDate(row.date), { x: 80, y: row.height / 2 - 23, fontFamily: 'Georgia', fontSize: 24, fill: t.ink })
    text(g, ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][row.index], { x: 82, y: row.height / 2 + 8, fontSize: 12, fill: t.muted, letterSpacing: 2 })
    line(g, [166, 17, 166, row.height - 17], t.line)
    if (!row.events.length) {
      text(g, '일정 미정', { x: 194, y: (row.height - 24) / 2, fontSize: 24, fill: t.muted })
      text(g, 'TO BE ANNOUNCED', { x: 907, y: (row.height - 12) / 2, width: 337, align: 'right', fontSize: 12, letterSpacing: 3, fill: t.muted, opacity: .65 })
    }
    row.events.forEach((event, i) => {
      const cellHeight = row.height / row.eventRows, offsetY = Math.floor(i / row.columns) * cellHeight
      const x = 190 + (i % row.columns) * row.eventWidth, width = row.eventWidth - 24
      if (i % row.columns) line(g, [x - 12, offsetY + 10, x - 12, offsetY + cellHeight - 10], t.line)
      if (i >= row.columns && i % row.columns === 0) line(g, [190, offsetY, row.width - 25, offsetY], t.line, .5)
      const state = event.status === 'off' ? 'DAY OFF' : event.status === 'tbd' ? 'TBA' : `${event.start || '시간 미정'}${event.end ? ` — ${event.end}${isOvernight(event) ? ' (+1일)' : ''}` : ''}`
      const timeHeight = Math.min(17, cellHeight * .25), titleY = 10 + timeHeight + 5
      const description = settings.showDescriptions !== false && event.description
      const available = Math.max(4,cellHeight-titleY-6)
      const descHeight = description ? Math.min(60,Math.max(0,(available-3)*.28)) : 0
      const titleHeight = Math.max(4,available-descHeight-(description ? 3 : 0))
      add(state,{ x,y:offsetY+7,width,height:timeHeight },{ fontSize:16,minSize:13,fill:event.status==='off'?t.muted:t.accent,fontStyle:'bold' },'시간',i)
      add(event.title || ({broadcast:'방송 제목을 입력해 주세요',off:'오늘은 쉬어갑니다',tbd:'일정 미정'})[event.status],{x,y:offsetY+titleY,width,height:titleHeight},{fontSize:27,minSize:18,fill:event.status==='off'?t.muted:t.ink},'제목',i)
      if (description) add(description,{x,y:offsetY+titleY+titleHeight+3,width,height:descHeight},{fontSize:14,minSize:12,fill:t.muted},'설명',i)
    })
    issues.push(...rowIssues)
  }
  group.setAttr('layoutIssues',issues)
}
export function renderProject(layers, project, interactive = false, originals = null) {
  const started = performance.now()
  let state = sceneStates.get(layers.content)
  if (!state) { state = { nodes:new Map() }; sceneStates.set(layers.content,state) }
  const bgKey = project.design.templateId
  const decorKey = JSON.stringify([bgKey,project.activeWeek,project.design.elements.some(e=>e.type==='image'&&e.visible&&e.x>1350)])
  const backgroundChanged = state.bgKey !== bgKey, decorationChanged = state.decorKey !== decorKey
  if (state.decorKey !== decorKey) {
    if (state.bgKey !== bgKey) { layers.background.destroyChildren(); stats.backgrounds++ }
    layers.decoration.destroyChildren(); stats.decorations++
    const temporary = state.bgKey === bgKey ? new Konva.Group() : layers.background
    backdrop(temporary,layers.decoration,project)
    if (temporary !== layers.background) temporary.destroy()
    state.bgKey = bgKey; state.decorKey = decorKey
  }
  const nodes = []
  const retained = new Set()
  for (const e of project.design.elements) {
    retained.add(e.id)
    let entry = state.nodes.get(e.id)
    if (entry && entry.type !== e.type) { entry.node.destroy(); entry = null }
    if (!entry) { entry = { node: e.type === 'schedule' ? new Konva.Group() : e.type === 'text' ? new Konva.Text() : new Konva.Group(), type:e.type }; state.nodes.set(e.id,entry); layers.content.add(entry.node); stats.elements++ }
    const node = entry.node, signature = JSON.stringify([e,project.design.scheduleSettings,project.design.templateId,originals?'original':assetCache.get(e.assetId)?.url])
    if (entry.signature !== signature || e.type === 'schedule') {
      if (e.type === 'schedule') updateSchedule(node,e,project)
      if (e.type === 'text') {
        const temporary = new Konva.Group(), fitted = fitText(temporary,e.text,{x:0,y:0,width:e.width,height:e.height},{ fontFamily:e.fontFamily,fontSize:e.fontSize,fontStyle:e.bold?'bold':'normal',minSize:12 })
        const overflow = fitted.getAttr('fitOverflow')
        node.setAttrs({ ...e, scaleX:1,scaleY:1,fontSize:fitted.fontSize(),fontStyle:e.bold?'bold':'normal',wrap:'char',lineHeight:1.15,verticalAlign:'middle',ellipsis:overflow })
        node.setAttr('layoutIssues',overflow ? [{ elementId:e.id,severity:project.design.scheduleSettings?.allowSummary?'warning':'error',kind:'overflow',message:`${e.name}: 텍스트 상자가 작습니다. 크기를 늘리거나 내용을 줄여 주세요.` }] : [])
        temporary.destroy()
      }
      if (e.type === 'image') {
        node.destroyChildren(); node.setAttrs({...e,scaleX:1,scaleY:1})
        const asset = assetCache.get(e.assetId), image = originals?.get(e.assetId) || asset?.image
        if (image) {
          if(e.cropMode==='cover') {
            const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,ratio=e.width/e.height
            const cw=Math.min(iw,ih*ratio),ch=Math.min(ih,iw/ratio)
            node.add(new Konva.Image({image,width:e.width,height:e.height,crop:{x:(iw-cw)*(e.cropX??.5),y:(ih-ch)*(e.cropY??.5),width:cw,height:ch}}))
          } else {
            const scale=Math.min(e.width/asset.width,e.height/asset.height),width=asset.width*scale,height=asset.height*scale
            node.add(new Konva.Image({image,x:(e.width-width)/2,y:(e.height-height)/2,width,height}))
          }
        }
        else { rect(node,{width:e.width,height:e.height,fill:'#513641',stroke:'#db879e',dash:[10,6]}); text(node,'이미지 누락',{x:12,y:12,fontSize:24,fill:'#f8eff2'}) }
        node.setAttr('layoutIssues',image ? [] : [{elementId:e.id,severity:e.visible?'error':'warning',kind:'missing',message:`${e.name}: 이미지가 누락되었습니다. 다시 업로드하거나 레이어를 삭제해 주세요.`}])
      }
      entry.signature = signature
    }
    node.setAttrs({ elementId:e.id,visible:e.visible,draggable:interactive&&!e.locked,listening:interactive }); nodes.push(node)
  }
  for (const [id,entry] of state.nodes) if (!retained.has(id)) { entry.node.destroy(); state.nodes.delete(id) }
  nodes.forEach((node,index)=>{if(node.zIndex()!==index)node.zIndex(index)})
  nodes.issues = project.design.elements.flatMap(e => {
    const own = state.nodes.get(e.id).node.getAttr('layoutIssues') || []
    if (!e.visible) return own.filter(i=>i.kind==='missing')
    const bounds = elementBounds(e), extra = bounds.x < -1 || bounds.y < -1 || bounds.x+bounds.width > WIDTH+1 || bounds.y+bounds.height > HEIGHT+1 ? [{elementId:e.id,severity:'warning',kind:'bounds',message:`${e.name}: 캔버스 밖으로 나간 부분은 출력되지 않습니다.`}] : []
    const node=state.nodes.get(e.id).node
    const small=e.type==='text'&&node.fontSize()<12 || e.type==='schedule'&&node.find('Text').some(n=>['제목','설명'].includes(n.getAttr('fitRole'))&&n.fontSize()*Math.min(e.width/1280,e.height/630)<(n.getAttr('fitRole')==='제목'?18:12))
    if(small)extra.push({elementId:e.id,severity:'warning',kind:'small',message:`${e.name}: 권장 크기보다 작은 글자가 있어요. 제목 18 px, 설명·일반 텍스트 12 px를 기준으로 가독성을 확인해 주세요.`})
    return [...own,...extra]
  })
  if(backgroundChanged)layers.background.batchDraw()
  if(decorationChanged)layers.decoration.batchDraw()
  layers.content.batchDraw()
  stats.draws++; stats.totalMs += performance.now()-started
  return nodes
}
function outputStage() {
  const container = document.createElement('div'); container.style.cssText='position:fixed;left:-99999px;top:0;width:1920px;height:1080px;pointer-events:none'; document.body.append(container)
  const stage = new Konva.Stage({container,width:WIDTH,height:HEIGHT}), layers = { background:new Konva.Layer({listening:false}),decoration:new Konva.Layer({listening:false}),content:new Konva.Layer({listening:false}) }
  Object.values(layers).forEach(layer=>stage.add(layer))
  return {stage,layers,close(){stage.destroy();container.remove()}}
}
export function inspectProject(project) { const output=outputStage(); try { return renderProject(output.layers,project).issues } finally { output.close() } }
export function projectThumbnail(project) { const output=outputStage(); try { renderProject(output.layers,project); output.stage.draw(); return output.stage.toDataURL({pixelRatio:.18}) } finally { output.close() } }
export function templateThumbnail(id) { const project=createProject(); changeTemplate(project,id); return projectThumbnail(project) }
export async function waitForFonts(project) {
  if (!document.fonts) return
  let timer
  try {
    await Promise.race([
      (async () => { await document.fonts.ready; for (const font of new Set(['Malgun Gothic', 'Georgia', ...project.design.elements.filter(e => e.type === 'text').map(e => e.fontFamily)])) await document.fonts.load(`24px "${font}"`) })(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('폰트 로딩 시간이 초과되었습니다. 다시 내보내 주세요.')), 12000) })
    ])
  } catch (error) { throw new Error(`폰트를 준비하지 못했습니다. ${error.message}`) }
  finally { clearTimeout(timer) }
}
export async function exportPng(project) {
  await waitForFonts(project)
  const issues = inspectProject(project), errors = issues.filter(i=>i.severity==='error')
  if (errors.length) throw new Error(`출력 전 점검이 필요합니다. ${errors[0].message}`)
  const originals = await originalImages(project), output=outputStage()
  try {
    renderProject(output.layers,project,false,originals); output.stage.draw()
    return await output.stage.toBlob({mimeType:'image/png',pixelRatio:1})
  } finally { output.close(); for (const image of originals.values()) image.src=''; originals.clear() }
}
