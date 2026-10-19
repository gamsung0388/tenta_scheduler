import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'

async function projectData(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify(document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('project').data)))
}
async function scheduleFonts(page) {
  return page.evaluate(() => {
    const stage=document.querySelector('.konvajs-content').parentElement.__vueParentComponent.__konvaNode
    const schedule=stage.getLayers()[2].children.find(node=>node.getAttr('elementId')==='schedule')
    return [...new Set(schedule.find('Text').map(node=>node.fontFamily()))].sort()
  })
}
async function downloadPng(page) {
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'PNG 다운로드',exact:true}).click()
  return fs.readFile(await(await pending).path())
}

test('schedule fonts update preview and PNG, preserve data through reload and backup, and reset to template defaults',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'이번 주 만들기'}).click()
  await page.getByRole('button',{name:'일정 추가',exact:true}).click()
  await page.getByLabel('방송 제목',{exact:true}).fill('시현과 함께하는 한글 폰트 방송')
  await page.getByLabel('일정 설명',{exact:true}).fill('이미지와 별개로 일정표 전체의 글꼴을 바꿔요.')
  await expect(page.locator('.save-state')).toHaveClass(/saved/)
  const weeks=(await projectData(page)).weeks,original=await downloadPng(page)
  await page.getByLabel('일정표 폰트',{exact:true}).selectOption('Batang')
  await expect.poll(()=>scheduleFonts(page)).toEqual(['Batang'])
  await page.locator('.canvas-toolbar').click();await page.keyboard.press('Control+z')
  await expect(page.getByLabel('일정표 폰트',{exact:true})).toHaveValue('template')
  await page.keyboard.press('Control+Shift+z');await expect(page.getByLabel('일정표 폰트',{exact:true})).toHaveValue('Batang')
  const changed=await downloadPng(page)
  expect(changed.readUInt32BE(16)).toBe(1920);expect(changed.readUInt32BE(20)).toBe(1080)
  if(process.platform==='win32')expect(changed.equals(original)).toBe(false)
  await page.getByRole('button',{name:'템플릿',exact:true}).click();await page.getByRole('button',{name:/Expelled Magic Journal/}).click()
  await page.getByRole('button',{name:'레이어',exact:true}).click();await page.getByRole('button',{name:'주간 일정표',exact:true}).click()
  await expect(page.getByLabel('일정표 폰트',{exact:true})).toHaveValue('Batang')
  await page.getByRole('button',{name:'잠금',exact:true}).click();await expect(page.getByLabel('일정표 폰트',{exact:true})).toBeDisabled()
  await page.getByRole('button',{name:'잠금 해제',exact:true}).click();await page.getByLabel('일정표 폰트',{exact:true}).selectOption('Gungsuh')
  await expect(page.locator('.save-state')).toHaveClass(/saved/);await page.reload();await expect(page.locator('.save-state')).toHaveClass(/saved/)
  await expect(page.getByLabel('일정표 폰트',{exact:true})).toHaveValue('Gungsuh');expect((await projectData(page)).weeks).toEqual(weeks)
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'프로젝트 백업',exact:true}).click();const archive=await pending
  await page.locator('input[type=file][accept=".tssproj"]').setInputFiles({name:'font.tssproj',mimeType:'application/zip',buffer:await fs.readFile(await archive.path())})
  await page.getByRole('button',{name:'복원하기',exact:true}).click();await expect(page.getByRole('dialog')).toBeHidden();await expect(page.locator('.busy-badge')).toBeHidden()
  await expect(page.getByLabel('일정표 폰트',{exact:true})).toHaveValue('Gungsuh');await expect.poll(()=>scheduleFonts(page)).toEqual(['Gungsuh'])
  expect((await projectData(page)).weeks).toEqual(weeks)
  await page.getByLabel('일정표 폰트',{exact:true}).selectOption('template')
  await expect.poll(()=>scheduleFonts(page)).toEqual(['Georgia','Malgun Gothic'])
  for(const [width,height]of [[1440,900],[1366,768]]) {
    await page.setViewportSize({width,height});await expect(page.getByLabel('일정표 폰트',{exact:true})).toBeInViewport()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  }
})
