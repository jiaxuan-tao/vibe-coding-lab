import { expect, test } from '@playwright/test'

const appPath = '/vibe-coding-lab/ai-review-workspace/'

async function navigateTo(page, label, isMobile) {
  if (isMobile) await page.getByRole('button', { name: '打开菜单' }).click()
  await page.getByRole('button', { name: label, exact: true }).click()
}

async function expectUsableViewport(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
    rootChildren: document.querySelector('#root')?.childElementCount || 0,
  }))

  expect(dimensions.rootChildren).toBeGreaterThan(0)
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1)
}

test('completes the focused review loop below the GitHub Pages path', async ({ page }, testInfo) => {
  const failures = []
  const pageErrors = []
  const isMobile = testInfo.project.name === 'mobile'

  page.on('response', (response) => {
    if (response.url().includes(appPath) && response.status() >= 400) {
      failures.push(`${response.status()} ${response.url()}`)
    }
  })
  page.on('requestfailed', (request) => {
    if (request.url().includes(appPath)) failures.push(`request failed ${request.url()}`)
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto(appPath)
  await expect(page).toHaveURL(new RegExp(`${appPath}#/home$`))
  await expect(page.getByRole('heading', { name: '同学，开始今天的复习' })).toBeVisible()
  await expectUsableViewport(page)

  await navigateTo(page, '学习资料', isMobile)
  await expect(page.getByRole('heading', { name: '学习资料', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: '学习资料', exact: true })).toBeVisible()
  await expectUsableViewport(page)

  await navigateTo(page, '复习计划', isMobile)
  await expect(page.getByRole('heading', { name: '复习计划', exact: true })).toBeVisible()
  await page.getByPlaceholder(/输入复习主题/).fill('端到端复习计划')
  await page.getByRole('button', { name: '创建计划', exact: true }).click()
  await expect(page.getByText('端到端复习计划').first()).toBeVisible()
  await expectUsableViewport(page)

  await navigateTo(page, '记忆卡片', isMobile)
  await expect(page.getByRole('heading', { name: '记忆卡片', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '开始复习', exact: true }).first().click()
  await expect(page.getByText('数学期望 E(X) 表示什么？')).toBeVisible()
  await page.getByText('数学期望 E(X) 表示什么？').click()
  await expect(page.getByText(/表示随机变量在大量重复试验中的平均结果/)).toBeVisible()
  await page.getByRole('button', { name: /下一张/ }).click()
  await expect(page.getByText('离散型随机变量的概率和必须满足什么条件？')).toBeVisible()
  await expectUsableViewport(page)

  await navigateTo(page, '知识测验', isMobile)
  await expect(page.getByRole('heading', { name: '知识测验', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '开始测验', exact: true }).click()
  await page.getByRole('button', { name: '0', exact: true }).click()
  await expect(page.getByText('若 E(X)=3，E(2X+1) 等于多少？')).toBeVisible()
  await page.getByRole('button', { name: '4', exact: true }).click()
  await expect(page.getByText('下列哪项对方差的描述正确？')).toBeVisible()
  await page.getByRole('button', { name: '方差等于标准差', exact: true }).click()
  await expect(page.getByText('需要回看的知识点')).toBeVisible()
  await expect(page.getByRole('heading', { name: '0 / 3' })).toBeVisible()
  await expectUsableViewport(page)

  await page.getByRole('button', { name: /查看下一步建议/ }).click()
  await expect(page.getByText('测验反馈')).toBeVisible()
  await expect(page.getByText(/优先回看/)).toBeVisible()
  await expectUsableViewport(page)

  expect(failures).toEqual([])
  expect(pageErrors).toEqual([])
})
