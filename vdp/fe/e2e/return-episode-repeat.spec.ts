import { test, expect } from '@playwright/test';

/**
 * E2E tests for Stage 4: Repeat payment after return
 * 
 * Coverage:
 * - Manager initiates repeat with comment (required)
 * - Provider executes repeat payment
 * - After repeat execution, can report return again (cycle)
 * - No second form created (repeat on same form)
 * - Optional provider org/account change
 */

test.describe('Return Episode - Stage 4: Repeat Payment', () => {
  test('repeat → execute → can report return again', async ({ page }) => {
    // Setup: Navigate to a form that has an active return episode
    // (In real scenario, would go through stage 1 first)
    await page.goto('/forms/test-form-repeat');
    
    // Manager initiates repeat payment
    await page.getByTestId('repeat-comment').fill('Корректировка платёжных данных');
    await page.getByTestId('repeat-submit').click();
    
    // Should see success feedback and status change
    await expect(page.getByText('Повтор инициирован')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Ожидает повторного исполнения')).toBeVisible();
    
    // Switch to provider view
    await page.goto('/forms/test-form-repeat?role=provider');
    
    // Provider executes repeat payment
    const fileChooser = page.waitForEvent('filechooser');
    await page.getByTestId('repeat-payment-file-zone').click();
    const chooser = await fileChooser;
    await chooser.setFiles({
      name: 'repeat_payment.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('repeat payment document'),
    });
    
    await page.getByTestId('repeat-execute-submit').click();
    
    // Should see success and episode closed
    await expect(page.getByText('Повтор исполнен')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Повтор завершён')).toBeVisible();
    
    // CRITICAL: Should be able to report return again (cycle)
    await page.getByTestId('return-report-amount').fill('15000.00');
    await page.getByTestId('return-report-reason').fill('Возврат после повтора');
    await page.getByTestId('return-report-submit').click();
    
    // Should see new return episode active
    await expect(page.getByText('Возврат зарегистрирован')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Активный возврат')).toBeVisible();
  });

  test('repeat with provider org change', async ({ page }) => {
    await page.goto('/forms/test-form-repeat-org-change');
    
    // Manager initiates repeat with new provider org
    await page.getByTestId('repeat-comment').fill('Смена провайдера');
    await page.getByTestId('new-provider-org').fill('org-provider-new');
    await page.getByTestId('new-account').fill('acc-new-123');
    await page.getByTestId('repeat-submit').click();
    
    // Should see success with org change indicator
    await expect(page.getByText('Повтор инициирован')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Провайдер изменён')).toBeVisible();
  });

  test('repeat without comment denied', async ({ page }) => {
    await page.goto('/forms/test-form-repeat');
    
    // Try to submit without comment
    await page.getByTestId('repeat-submit').click();
    
    // Should see error
    await expect(page.getByTestId('repeat-error')).toContainText('Комментарий обязателен');
  });

  test('repeat execution without payment file denied', async ({ page }) => {
    await page.goto('/forms/test-form-repeat?role=provider');
    
    // Try to submit without file
    await page.getByTestId('repeat-execute-submit').click();
    
    // Should see error
    await expect(page.getByTestId('repeat-execute-error')).toContainText('Приложите платёжное поручение');
  });
});
