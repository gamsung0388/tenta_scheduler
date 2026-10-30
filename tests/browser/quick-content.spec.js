import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'

const data = page => page.evaluate(() => JSON.parse(JSON.stringify(document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('project').data)))
async function start(page) { await page.goto('/'); await page.getByRole('button',{name:'이번 주 만들기'}).click(); await expect(page.locator('.save-state')).toHaveClass(/saved/) }
const quick = (page, title) => page.getByRole('button',{name:`${title} 간편 추가`,exact:true})

test('quick content appends independent events to the selected day, handles day off and enforces six events',async({page})=>{
  await start(page)
  for(const [width,height]of [[1440,900],[1366,768]]) {
    await page.setViewportSize({width,height});await expect(quick(page,'안듣텐')).toBeInViewport()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  }
  await page.getByLabel('간편 입력 시작 시간',{exact:true}).fill('21:30')
  await quick(page,'안듣텐').click();await quick(page,'안듣텐').click();await quick(page,'휴방').click()
  let project=await data(page),events=project.weeks[project.activeWeek][0].events
  expect(events.map(event=>[event.title,event.status,event.start])).toEqual([['안듣텐','broadcast','21:30'],['안듣텐','broadcast','21:30'],['휴방','off','']])
  expect(new Set(events.map(event=>event.id)).size).toBe(3)
  await page.getByLabel('방송 제목',{exact:true}).first().fill('이미 작성한 일정')
  await quick(page,'시네티').click();await quick(page,'텐해줘').click();await quick(page,'월드컵').click()
  await expect(quick(page,'노래뱅')).toBeDisabled();expect((await data(page)).weeks[project.activeWeek][0].events[0].title).toBe('이미 작성한 일정')
  await page.locator('.canvas-toolbar').click();await page.keyboard.press('Control+z');await expect(quick(page,'노래뱅')).toBeEnabled()
  await page.keyboard.press('Control+Shift+z');await expect(quick(page,'노래뱅')).toBeDisabled()
  await page.locator('.day-strip button').nth(1).click();await page.getByLabel('간편 입력 시작 시간',{exact:true}).fill('')
  await quick(page,'노래뱅').click();project=await data(page)
  expect(project.weeks[project.activeWeek][0].events).toHaveLength(6)
  expect(project.weeks[project.activeWeek][1].events[0]).toMatchObject({title:'노래뱅',start:''})
})

test('personal content persists and is included in a project backup with undoable removal',async({page})=>{
  await start(page);await quick(page,'종합게임').click()
  await page.getByLabel('방송 제목',{exact:true}).fill('시현과 함께하는 게임')
  await page.getByLabel('일정 설명',{exact:true}).fill('시청자 참여 · 새 게임')
  await page.getByRole('button',{name:'일정 1 내 콘텐츠로 저장',exact:true}).click()
  await expect(page.getByRole('button',{name:'시현과 함께하는 게임 내 콘텐츠 추가',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'일정 1 내 콘텐츠로 저장',exact:true}).click()
  await expect(page.locator('.toast.error').last()).toContainText('이미 같은 콘텐츠')
  expect((await data(page)).contentPresets).toHaveLength(1)
  await expect(page.locator('.save-state')).toHaveClass(/saved/);await page.reload();await expect(page.locator('.save-state')).toHaveClass(/saved/)
  await page.locator('.day-strip button').nth(2).click();await page.getByLabel('간편 입력 시작 시간',{exact:true}).fill('19:15')
  await page.getByRole('button',{name:'시현과 함께하는 게임 내 콘텐츠 추가',exact:true}).click()
  let project=await data(page)
  expect(project.weeks[project.activeWeek][2].events[0]).toMatchObject({title:'시현과 함께하는 게임',description:'시청자 참여 · 새 게임',start:'19:15'})
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'프로젝트 백업',exact:true}).click();const file=await pending
  await page.locator('input[type=file][accept=".tssproj"]').setInputFiles({name:'content.tssproj',mimeType:'application/zip',buffer:await fs.readFile(await file.path())})
  await page.getByRole('button',{name:'복원하기',exact:true}).click();await expect(page.getByRole('dialog')).toBeHidden();await expect(page.locator('.busy-badge')).toBeHidden()
  expect((await data(page)).contentPresets).toEqual(project.contentPresets)
  await page.getByRole('button',{name:'시현과 함께하는 게임 내 콘텐츠 삭제',exact:true}).click()
  await expect(page.getByRole('button',{name:'시현과 함께하는 게임 내 콘텐츠 추가',exact:true})).toHaveCount(0)
  await page.locator('.canvas-toolbar').click();await page.keyboard.press('Control+z')
  await expect(page.getByRole('button',{name:'시현과 함께하는 게임 내 콘텐츠 추가',exact:true})).toBeVisible()
  await page.setViewportSize({width:1440,height:900});await page.locator('.tool-panel').evaluate(element=>element.scrollTop=0)
  await page.screenshot({path:'test-results/quick-content.png'})
})
