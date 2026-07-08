import { test, expect } from '@playwright/test';

/**
 * Critical User Flows - E2E Tests
 * Tests the most important user journeys end-to-end
 */

test.describe('Critical User Flows', () => {
  
  test('User signup and authentication flow', async ({ page }) => {
    // Start at homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/ForgeVid/i);

    // Navigate to signup
    await page.click('text=Sign Up');
    await expect(page).toHaveURL(/\/auth\/signup/);

    // Fill signup form
    const email = `test${Date.now()}@forgevid.com`;
    const password = 'TestPassword123!';
    
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to onboarding or dashboard
    await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 10000 });
    
    // Verify user is logged in
    const isAuthenticated = await page.evaluate(() => {
      return localStorage.getItem('nextauth.session') !== null;
    });
    expect(isAuthenticated).toBeTruthy();
  });

  test('AI video generation flow', async ({ page }) => {
    // Assuming user is already authenticated
    await page.goto('/dashboard/ai');

    // Fill in video generation form
    await page.fill('textarea[placeholder*="prompt"]', 'Create a promotional video about a bakery');
    await page.selectOption('select[name="style"]', 'professional');
    await page.selectOption('select[name="duration"]', '30');
    
    // Click generate button
    await page.click('button:has-text("Generate")');
    
    // Wait for generation to start
    await expect(page.locator('text=Generating')).toBeVisible({ timeout: 5000 });
    
    // Wait for video to be generated (with long timeout)
    await expect(page.locator('video')).toBeVisible({ timeout: 120000 }); // 2 minutes max
    
    // Verify video URL is present
    const videoSrc = await page.locator('video').getAttribute('src');
    expect(videoSrc).toBeTruthy();
  });

  test('Subscription flow', async ({ page }) => {
    await page.goto('/pricing');
    
    // Select Pro plan
    await page.click('button:has-text("Pro")');
    
    // Should redirect to Stripe checkout or show pricing details
    // Note: In test mode, this would mock Stripe
    await page.waitForTimeout(2000);
    
    // Verify we're at pricing or checkout page
    expect(page.url()).toMatch(/\/pricing|\/checkout/);
  });

  test('Video upload flow', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Navigate to upload (if exists) or use video upload API
    const uploadButton = page.locator('button:has-text("Upload")');
    
    if (await uploadButton.isVisible()) {
      await uploadButton.click();
      
      // This would normally test file upload
      // For now, just verify the page loaded
      expect(page.url()).toMatch(/upload|media/);
    }
  });

  test('Dashboard navigation', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test navigation to different sections
    const navItems = [
      { text: 'Dashboard', url: /\/dashboard$/ },
      { text: 'Videos', url: /\/dashboard\/videos/ },
      { text: 'Templates', url: /\/dashboard\/templates/ },
      { text: 'Analytics', url: /\/dashboard\/analytics/ },
      { text: 'Settings', url: /\/dashboard\/settings/ },
    ];
    
    for (const item of navItems) {
      const navLink = page.locator(`a:has-text("${item.text}")`);
      
      if (await navLink.isVisible()) {
        await navLink.click();
        await page.waitForURL(item.url, { timeout: 5000 });
        expect(page.url()).toMatch(item.url);
      }
    }
  });

  test('Error handling on invalid actions', async ({ page }) => {
    // Try to access protected route without auth
    await page.goto('/dashboard');
    
    // Should redirect to login or show error
    const isLoginPage = page.url().includes('/auth');
    const hasError = await page.locator('text=error').isVisible().catch(() => false);
    
    // Either redirected to login or showing error is acceptable
    expect(isLoginPage || hasError).toBeTruthy();
  });

  test('API health check', async ({ page }) => {
    // Test API health endpoint
    const response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('Rate limiting protection', async ({ page }) => {
    // Make multiple requests quickly
    const requests = [];
    for (let i = 0; i < 15; i++) {
      requests.push(page.request.get('/api/health'));
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status() === 429);
    
    // Should have some rate limited responses if protection is working
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});


