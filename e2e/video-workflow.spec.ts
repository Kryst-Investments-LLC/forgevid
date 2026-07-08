import { test, expect } from '@playwright/test';

test.describe('Video Creation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/auth/login');
    await page.fill('[data-testid="email"]', 'test@forgevid.com');
    await page.fill('[data-testid="password"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create video from template', async ({ page }) => {
    // Navigate to templates
    await page.click('[data-testid="templates-nav"]');
    await expect(page).toHaveURL('/dashboard/templates');

    // Select a template
    await page.click('[data-testid="template-card"]:first-child');
    await page.click('[data-testid="use-template-button"]');

    // Should redirect to editor
    await expect(page).toHaveURL(/\/dashboard\/editor/);

    // Verify editor components are loaded
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="timeline"]')).toBeVisible();
    await expect(page.locator('[data-testid="tool-panel"]')).toBeVisible();
  });

  test('should upload and process video', async ({ page }) => {
    // Navigate to video upload
    await page.click('[data-testid="upload-nav"]');
    await expect(page).toHaveURL('/dashboard/upload');

    // Upload video file
    const fileInput = page.locator('[data-testid="video-upload"]');
    await fileInput.setInputFiles('test-files/sample-video.mp4');

    // Fill in video details
    await page.fill('[data-testid="video-title"]', 'Test Video Upload');
    await page.fill('[data-testid="video-description"]', 'Test video description');

    // Submit upload
    await page.click('[data-testid="upload-button"]');

    // Wait for processing to start
    await expect(page.locator('[data-testid="processing-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="processing-status"]')).toContainText('Processing');

    // Wait for processing to complete (with timeout)
    await expect(page.locator('[data-testid="processing-status"]')).toContainText('Completed', { timeout: 30000 });

    // Verify video appears in dashboard
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="video-item"]')).toContainText('Test Video Upload');
  });

  test('should generate AI content for video', async ({ page }) => {
    // Navigate to AI studio
    await page.click('[data-testid="ai-nav"]');
    await expect(page).toHaveURL('/dashboard/ai');

    // Select video for AI processing
    await page.click('[data-testid="video-select"]');
    await page.click('[data-testid="video-option"]:first-child');

    // Generate transcript
    await page.click('[data-testid="generate-transcript"]');
    await expect(page.locator('[data-testid="transcript-result"]')).toBeVisible({ timeout: 10000 });

    // Generate summary
    await page.click('[data-testid="generate-summary"]');
    await expect(page.locator('[data-testid="summary-result"]')).toBeVisible({ timeout: 10000 });

    // Generate voiceover
    await page.click('[data-testid="generate-voiceover"]');
    await expect(page.locator('[data-testid="voiceover-result"]')).toBeVisible({ timeout: 15000 });
  });

  test('should edit video with tools', async ({ page }) => {
    // Navigate to video editor
    await page.goto('/dashboard/editor/test-video-id');

    // Test trim tool
    await page.click('[data-testid="trim-tool"]');
    await page.locator('[data-testid="timeline-handle-start"]').dragTo(page.locator('[data-testid="timeline-handle-start"]'), { targetPosition: { x: 100, y: 0 } });
    await page.locator('[data-testid="timeline-handle-end"]').dragTo(page.locator('[data-testid="timeline-handle-end"]'), { targetPosition: { x: -100, y: 0 } });
    await page.click('[data-testid="apply-trim"]');

    // Test text overlay
    await page.click('[data-testid="text-tool"]');
    await page.fill('[data-testid="text-input"]', 'Test Overlay');
    await page.click('[data-testid="add-text"]');

    // Test filter
    await page.click('[data-testid="filter-tool"]');
    await page.selectOption('[data-testid="filter-select"]', 'vintage');
    await page.click('[data-testid="apply-filter"]');

    // Verify changes are applied
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="text-overlay"]')).toContainText('Test Overlay');
  });

  test('should export video in different formats', async ({ page }) => {
    // Navigate to export page
    await page.goto('/dashboard/export/test-video-id');

    // Select export format
    await page.selectOption('[data-testid="format-select"]', 'mp4');
    await page.selectOption('[data-testid="quality-select"]', '1080p');

    // Start export
    await page.click('[data-testid="export-button"]');

    // Wait for export to complete
    await expect(page.locator('[data-testid="export-status"]')).toContainText('Exporting', { timeout: 5000 });
    await expect(page.locator('[data-testid="export-status"]')).toContainText('Completed', { timeout: 60000 });

    // Verify download link appears
    await expect(page.locator('[data-testid="download-link"]')).toBeVisible();
  });

  test('should handle collaboration features', async ({ page, context }) => {
    // Create a second browser context for collaboration
    const collaboratorContext = await context.browser()?.newContext();
    const collaboratorPage = await collaboratorContext?.newPage();

    if (!collaboratorPage) return;

    // Both users login
    await page.goto('/auth/login');
    await page.fill('[data-testid="email"]', 'user1@forgevid.com');
    await page.fill('[data-testid="password"]', 'password1');
    await page.click('[data-testid="login-button"]');

    await collaboratorPage.goto('/auth/login');
    await collaboratorPage.fill('[data-testid="email"]', 'user2@forgevid.com');
    await collaboratorPage.fill('[data-testid="password"]', 'password2');
    await collaboratorPage.click('[data-testid="login-button"]');

    // User 1 creates collaboration room
    await page.goto('/dashboard/collaboration');
    await page.click('[data-testid="create-room"]');
    await page.fill('[data-testid="room-name"]', 'Test Collaboration');
    await page.click('[data-testid="create-room-button"]');

    // Get room URL
    const roomUrl = page.url();
    const roomId = roomUrl.split('/').pop();

    // User 2 joins room
    await collaboratorPage.goto(`/dashboard/collaboration/${roomId}`);

    // Both users should see each other
    await expect(page.locator('[data-testid="collaborator"]')).toContainText('user2@forgevid.com');
    await expect(collaboratorPage.locator('[data-testid="collaborator"]')).toContainText('user1@forgevid.com');

    // Test real-time editing
    await page.click('[data-testid="edit-video"]');
    await page.fill('[data-testid="video-title"]', 'Collaborative Edit');

    // User 2 should see the change
    await expect(collaboratorPage.locator('[data-testid="video-title"]')).toHaveValue('Collaborative Edit');

    await collaboratorContext?.close();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test network error during upload
    await page.route('**/api/videos', route => route.abort());
    
    await page.goto('/dashboard/upload');
    await page.fill('[data-testid="video-title"]', 'Test Video');
    await page.click('[data-testid="upload-button"]');

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Upload failed');

    // Test AI service error
    await page.route('**/api/videos/*', route => route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'AI service unavailable' })
    }));

    await page.goto('/dashboard/ai');
    await page.click('[data-testid="generate-transcript"]');

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('AI service unavailable');
  });

  test('should respect rate limits', async ({ page }) => {
    // Make multiple rapid requests to trigger rate limiting
    const requests = [];
    for (let i = 0; i < 15; i++) {
      requests.push(
        page.request.post('http://localhost:3000/api/videos', {
          data: { title: `Test Video ${i}` }
        })
      );
    }

    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status() === 429);

    // Should have some rate limited responses
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});
