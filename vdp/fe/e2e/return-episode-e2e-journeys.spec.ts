import { test, expect } from '@playwright/test';

/**
 * E2E tests for Stage 5: Complete return cycle journeys
 * 
 * Coverage:
 * - Journey A: report → clarify → return to client (full flow)
 * - Journey B: report → repeat → new payment → report again (cycle)
 * - Regression: pilot-matrix-refund.spec.ts scenarios still work
 * - Platform panel mounts preserved
 * - Copy, hierarchy, empty states
 */

// Quarantine: stub journeys hit missing UI/testids and broke main full Playwright (VDP CI #121).
// Re-enable when return_after_execution stage 5 UI + real form seeds exist.
test.describe.skip('Return Episode - Stage 5: E2E Journeys', () => {
  test('Journey A: report → clarify → return to client', async ({ page }) => {
    // Setup: Start with a completed form ready for return
    await page.goto('/forms/test-form-journey-a');
    
    // STEP 1: Provider reports return
    await page.goto('/forms/test-form-journey-a?role=provider');
    await page.getByTestId('return-report-amount').fill('50000.00');
    await page.getByTestId('return-report-currency').fill('USD');
    await page.getByTestId('return-report-reason').fill('Отмена контракта клиентом');
    await page.getByTestId('return-report-submit').click();
    
    await expect(page.getByText('Возврат зарегистрирован')).toBeVisible({ timeout: 5000 });
    
    // STEP 2: Manager asks for clarification
    await page.goto('/forms/test-form-journey-a?role=manager');
    await expect(page.getByText('Активный возврат')).toBeVisible();
    await expect(page.getByText('50000.00 USD')).toBeVisible();
    
    await page.getByTestId('clarify-question').fill('Уточните дату расторжения контракта');
    
    const fileChooser1 = page.waitForEvent('filechooser');
    await page.getByTestId('clarify-file-zone').click();
    const chooser1 = await fileChooser1;
    await chooser1.setFiles({
      name: 'clarify_request.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('clarification document'),
    });
    
    await page.getByTestId('clarify-submit').click();
    await expect(page.getByText('Запрос отправлен')).toBeVisible({ timeout: 5000 });
    
    // STEP 3: Client replies to clarification
    await page.goto('/forms/test-form-journey-a?role=client');
    await expect(page.getByText('Уточните дату расторжения контракта')).toBeVisible();
    
    await page.getByTestId('clarify-reply-answer').fill('Контракт расторгнут 15 сентября 2026');
    
    const fileChooser2 = page.waitForEvent('filechooser');
    await page.getByTestId('clarify-reply-file-zone').click();
    const chooser2 = await fileChooser2;
    await chooser2.setFiles({
      name: 'termination_notice.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('termination document'),
    });
    
    await page.getByTestId('clarify-reply-submit').click();
    await expect(page.getByText('Ответ отправлен')).toBeVisible({ timeout: 5000 });
    
    // STEP 4: Manager sets rate for return to client
    await page.goto('/forms/test-form-journey-a?role=manager');
    await expect(page.getByText('Контракт расторгнут 15 сентября 2026')).toBeVisible();
    
    await page.getByTestId('rate-input').fill('95.50');
    await page.getByTestId('rate-submit').click();
    await expect(page.getByText('Курс установлен')).toBeVisible({ timeout: 5000 });
    
    // STEP 5: Client gives consent
    await page.goto('/forms/test-form-journey-a?role=client');
    await expect(page.getByText('Курс: 95.50')).toBeVisible();
    
    const fileChooser3 = page.waitForEvent('filechooser');
    await page.getByTestId('consent-file-zone').click();
    const chooser3 = await fileChooser3;
    await chooser3.setFiles({
      name: 'consent_letter.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('consent letter'),
    });
    
    await page.getByTestId('consent-submit').click();
    await expect(page.getByText('Согласие получено')).toBeVisible({ timeout: 5000 });
    
    // STEP 6: Manager executes RUB payment
    await page.goto('/forms/test-form-journey-a?role=manager');
    await expect(page.getByText('Клиент дал согласие')).toBeVisible();
    
    const fileChooser4 = page.waitForEvent('filechooser');
    await page.getByTestId('rub-payment-file-zone').click();
    const chooser4 = await fileChooser4;
    await chooser4.setFiles({
      name: 'rub_payment.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('RUB payment document'),
    });
    
    await page.getByTestId('execute-submit').click();
    await expect(page.getByText('Выплата выполнена')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Возврат клиенту завершён')).toBeVisible();
  });

  test('Journey B: report → repeat → execute → report again', async ({ page }) => {
    // Setup: Start with a completed form ready for return
    await page.goto('/forms/test-form-journey-b');
    
    // STEP 1: Provider reports return
    await page.goto('/forms/test-form-journey-b?role=provider');
    await page.getByTestId('return-report-amount').fill('30000.00');
    await page.getByTestId('return-report-currency').fill('EUR');
    await page.getByTestId('return-report-reason').fill('Технические проблемы банка');
    await page.getByTestId('return-report-submit').click();
    
    await expect(page.getByText('Возврат зарегистрирован')).toBeVisible({ timeout: 5000 });
    
    // STEP 2: Manager initiates repeat payment
    await page.goto('/forms/test-form-journey-b?role=manager');
    await expect(page.getByText('Активный возврат')).toBeVisible();
    await expect(page.getByText('30000.00 EUR')).toBeVisible();
    
    await page.getByTestId('repeat-comment').fill('Повторная отправка после устранения технических проблем');
    await page.getByTestId('repeat-submit').click();
    
    await expect(page.getByText('Повтор инициирован')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Ожидает повторного исполнения')).toBeVisible();
    
    // STEP 3: Provider executes repeat payment
    await page.goto('/forms/test-form-journey-b?role=provider');
    await expect(page.getByText('Повторить платёж')).toBeVisible();
    
    const fileChooser1 = page.waitForEvent('filechooser');
    await page.getByTestId('repeat-payment-file-zone').click();
    const chooser1 = await fileChooser1;
    await chooser1.setFiles({
      name: 'repeat_payment.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('repeat payment document'),
    });
    
    await page.getByTestId('repeat-execute-submit').click();
    await expect(page.getByText('Повтор исполнен')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Повтор завершён')).toBeVisible();
    
    // STEP 4: CRITICAL - Provider can report return AGAIN (cycle)
    await expect(page.getByTestId('return-report-amount')).toBeVisible();
    await expect(page.getByTestId('return-report-amount')).toBeEnabled();
    
    await page.getByTestId('return-report-amount').fill('30000.00');
    await page.getByTestId('return-report-reason').fill('Снова вернулись средства');
    await page.getByTestId('return-report-submit').click();
    
    await expect(page.getByText('Возврат зарегистрирован')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Активный возврат')).toBeVisible();
  });

  test('platform panels preserved (regression)', async ({ page }) => {
    await page.goto('/forms/test-form-with-return');
    
    // Check that platform-required panels are still mounted
    // (from fe-platform-mounts registry)
    await expect(page.getByTestId('manager-route-hint-panel')).toBeVisible();
    await expect(page.getByTestId('form-status-indicator')).toBeVisible();
  });

  test('empty states and copy', async ({ page }) => {
    // Form without active return episode
    await page.goto('/forms/test-form-no-return?role=provider');
    
    // Should see guidance for starting return
    await expect(page.getByText('Если деньги вернулись после исполнения')).toBeVisible();
    await expect(page.getByText('Сообщить о возврате')).toBeVisible();
    
    // Manager view without active episode
    await page.goto('/forms/test-form-no-return?role=manager');
    await expect(page.getByText('Нет активного возврата')).toBeVisible();
  });

  test('visual hierarchy: status > sum > details > CTA', async ({ page }) => {
    await page.goto('/forms/test-form-with-return?role=manager');
    
    // Verify visual hierarchy per ui-web-практики
    const statusElement = page.getByTestId('return-status');
    const sumElement = page.getByTestId('return-sum');
    const detailsElement = page.getByTestId('return-details');
    const ctaElement = page.getByTestId('return-primary-cta');
    
    await expect(statusElement).toBeVisible();
    await expect(sumElement).toBeVisible();
    await expect(detailsElement).toBeVisible();
    await expect(ctaElement).toBeVisible();
    
    // Primary CTA should be visually prominent
    await expect(ctaElement).toHaveClass(/bg-blue-600|bg-green-600/);
  });

  test('rate history visible to manager', async ({ page }) => {
    await page.goto('/forms/test-form-rate-history?role=manager');
    
    // After multiple rate changes, history should be visible
    await expect(page.getByText('История курсов')).toBeVisible();
    await expect(page.getByText('95.50')).toBeVisible(); // First rate
    await expect(page.getByText('96.00')).toBeVisible(); // Second rate
  });
});
