import { test, expect } from "@playwright/test"

test.describe("Video Creation Workflow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto("/auth/login")
  await page.fill('[data-testid="email"]', "test@forgevid.com")
    await page.fill('[data-testid="password"]', "testpassword")
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL("/dashboard")
  })

  test("creates video from template", async ({ page }) => {
    // Navigate to templates
    await page.click('[data-testid="templates-nav"]')
    await expect(page).toHaveURL("/dashboard/templates")

    // Select a template
    await page.click('[data-testid="template-card"]:first-child')
    await page.click('[data-testid="use-template-button"]')

    // Should redirect to editor
    await expect(page).toHaveURL(/\/dashboard\/editor/)

    // Verify editor components are loaded
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible()
    await expect(page.locator('[data-testid="timeline"]')).toBeVisible()
    await expect(page.locator('[data-testid="tool-panel"]')).toBeVisible()
  })

  test("generates video with AI", async ({ page }) => {
    // Navigate to AI studio
    await page.click('[data-testid="ai-nav"]')
    await expect(page).toHaveURL("/dashboard/ai")

    // Fill AI prompt
    await page.fill('[data-testid="ai-prompt"]', "Create a video about sustainable technology")
    await page.selectOption('[data-testid="video-style"]', "modern")
    await page.fill('[data-testid="video-duration"]', "30")

    // Generate video
    await page.click('[data-testid="generate-button"]')

    // Wait for generation to complete
    await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible()
    await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({ timeout: 30000 })

    // Verify video was created
    await expect(page.locator('[data-testid="generated-video"]')).toBeVisible()
  })

  test("exports video in different formats", async ({ page }) => {
    // Navigate to editor with existing video
    await page.goto("/dashboard/editor?video=test-video-id")

    // Open export panel
    await page.click('[data-testid="export-button"]')
    await expect(page.locator('[data-testid="export-panel"]')).toBeVisible()

    // Select export format
    await page.selectOption('[data-testid="export-format"]', "mp4")
    await page.selectOption('[data-testid="export-quality"]', "1080p")

    // Start export
    await page.click('[data-testid="start-export-button"]')

    // Wait for export to complete
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible()
    await expect(page.locator('[data-testid="export-complete"]')).toBeVisible({ timeout: 60000 })

    // Verify download link
    await expect(page.locator('[data-testid="download-link"]')).toBeVisible()
  })

  test("collaborates on video project", async ({ page, context }) => {
    // Create new page for second user
    const secondPage = await context.newPage()

    // First user creates project
    await page.goto("/dashboard/collaborate")
    await page.click('[data-testid="create-project-button"]')
    await page.fill('[data-testid="project-name"]', "Collaboration Test")
    await page.click('[data-testid="create-button"]')

    // Get project URL
    const projectUrl = page.url()

    // Invite second user
    await page.click('[data-testid="invite-button"]')
  await page.fill('[data-testid="invite-email"]', "collaborator@forgevid.com")
    await page.click('[data-testid="send-invite-button"]')

    // Second user joins project
    await secondPage.goto(projectUrl)
    await expect(secondPage.locator('[data-testid="collaboration-workspace"]')).toBeVisible()

    // Verify real-time collaboration
    await page.fill('[data-testid="project-title"]', "Updated Title")
    await expect(secondPage.locator('[data-testid="project-title"]')).toHaveValue("Updated Title")
  })
})
