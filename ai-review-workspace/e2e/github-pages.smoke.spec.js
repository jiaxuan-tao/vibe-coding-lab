import { expect, test } from '@playwright/test'

const appPath = '/vibe-coding-lab/ai-review-workspace/'

test('loads and refreshes focused routes below the GitHub Pages path', async ({ page }) => {
  const failures = []
  const pageErrors = []

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
  await expect(page.getByRole('heading', { name: /同学，开始今天的复习/ })).toBeVisible()

  await page.goto(`${appPath}#/home`)
  await expect(page.getByRole('heading', { name: /同学，开始今天的复习/ })).toBeVisible()

  await page.goto(`${appPath}#/notes`)
  await expect(page.getByRole('heading', { name: '学习资料' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: '学习资料' })).toBeVisible()

  expect(failures).toEqual([])
  expect(pageErrors).toEqual([])
})
