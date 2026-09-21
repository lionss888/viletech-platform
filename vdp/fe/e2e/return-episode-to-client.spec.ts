import { test, expect } from '@playwright/test';

// Quarantine: stub against missing UI (VDP CI #121 main full suite). Re-enable with stage 3 UI.
test.describe.skip('Return Episode Stage 3: To Client', () => {
  test('return to client: rate → consent → execute', async ({ page }) => {
    // TODO: Seed data - returnEpisode.active=true, status=mgr_return_decision
    const formId = 'test-form-stage3-1';
    
    // Manager sets rate
    await page.goto(`/manager/forms/${formId}`);
    await page.getByRole('button', { name: /вернуть клиенту/i }).click();
    
    const rateInput = page.getByLabel(/курс возврата/i);
    await expect(rateInput).toBeVisible();
    await rateInput.fill('75.50');
    
    await page.getByRole('button', { name: /отправить клиенту/i }).click();
    await expect(page.getByText(/курс отправлен/i)).toBeVisible();
    
    // Client gives consent with letter
    await page.goto(`/client/forms/${formId}`);
    await expect(page.getByText('75.50')).toBeVisible();
    
    await page.getByRole('button', { name: /согласен/i }).click();
    
    // File gesture for consent letter
    const consentZone = page.getByTestId('consent-file-zone');
    await expect(consentZone).toBeVisible();
    
    const [fileChooser1] = await Promise.all([
      page.waitForEvent('filechooser'),
      consentZone.click()
    ]);
    await fileChooser1.setFiles({
      name: 'test-consent-letter.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test consent letter content')
    });
    
    await page.getByRole('button', { name: /отправить согласие/i }).click();
    await expect(page.getByText(/согласие отправлено/i)).toBeVisible();
    
    // Manager executes payment with RUB file
    await page.goto(`/manager/forms/${formId}`);
    await expect(page.getByText(/письмо-согласие/i)).toBeVisible();
    
    // File gesture for RUB payment
    const rubPaymentZone = page.getByTestId('rub-payment-file-zone');
    await expect(rubPaymentZone).toBeVisible();
    
    const [fileChooser2] = await Promise.all([
      page.waitForEvent('filechooser'),
      rubPaymentZone.click()
    ]);
    await fileChooser2.setFiles({
      name: 'test-rub-payment.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test RUB payment content')
    });
    
    await page.getByRole('button', { name: /выплатить/i }).click();
    await expect(page.getByText(/возврат завершён|выплата подтверждена/i)).toBeVisible();
    
    // Verify episode is closed
    // TODO: Check returnEpisode.to_client_closed === true, returnEpisode.active === false
  });

  test('return to client: rate → refuse → rate again', async ({ page }) => {
    // TODO: Seed data - returnEpisode.active=true, status=mgr_return_decision
    const formId = 'test-form-stage3-2';
    
    // Manager sets initial rate
    await page.goto(`/manager/forms/${formId}`);
    const rateInput = page.getByLabel(/курс возврата/i);
    await rateInput.fill('70.00');
    await page.getByRole('button', { name: /отправить/i }).click();
    await expect(page.getByText(/курс отправлен/i)).toBeVisible();
    
    // Client refuses
    await page.goto(`/client/forms/${formId}`);
    await page.getByRole('button', { name: /не согласен/i }).click();
    
    const reasonTextarea = page.getByLabel(/причина отказа/i);
    await expect(reasonTextarea).toBeVisible();
    await reasonTextarea.fill('Rate is too low');
    
    await page.getByRole('button', { name: /отправить отказ/i }).click();
    await expect(page.getByText(/отказ отправлен/i)).toBeVisible();
    
    // Manager can set rate again
    await page.goto(`/manager/forms/${formId}`);
    
    // Verify rate form is visible again (back to mgr_return_decision status)
    const rateInputAgain = page.getByLabel(/курс возврата/i);
    await expect(rateInputAgain).toBeVisible();
    
    // Verify history shows previous rate
    await expect(page.getByText('70.00')).toBeVisible();
    
    // Manager sets new rate
    await rateInputAgain.fill('75.50');
    await page.getByRole('button', { name: /отправить/i }).click();
    await expect(page.getByText(/курс отправлен/i)).toBeVisible();
    
    // Verify episode is still active (not closed by refusal)
    // TODO: Check returnEpisode.active === true
  });

  test('return to client: execution without consent denied', async ({ page }) => {
    // TODO: Seed data - returnEpisode.active=true, status=mgr_return_to_client_ready_execute
    // BUT client_consent_file_id is empty (invalid state for testing guard)
    const formId = 'test-form-stage3-3';
    
    await page.goto(`/manager/forms/${formId}`);
    
    // Try to execute without consent file present
    const rubPaymentZone = page.getByTestId('rub-payment-file-zone');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      rubPaymentZone.click()
    ]);
    await fileChooser.setFiles({
      name: 'test-rub-payment.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test RUB payment content')
    });
    
    await page.getByRole('button', { name: /выплатить/i }).click();
    
    // Should see error about missing consent
    await expect(page.getByText(/consent.*required|приложите письмо/i)).toBeVisible();
  });

  test('return to client: rate history grows', async ({ page }) => {
    // TODO: Seed data - returnEpisode.active=true, status=mgr_return_decision
    const formId = 'test-form-stage3-4';
    
    await page.goto(`/manager/forms/${formId}`);
    
    // Set first rate
    await page.getByLabel(/курс возврата/i).fill('70.00');
    await page.getByRole('button', { name: /отправить/i }).click();
    await expect(page.getByText(/курс отправлен/i)).toBeVisible();
    
    // Client refuses
    await page.goto(`/client/forms/${formId}`);
    await page.getByRole('button', { name: /не согласен/i }).click();
    await page.getByLabel(/причина/i).fill('Too low');
    await page.getByRole('button', { name: /отправить отказ/i }).click();
    
    // Manager sets second rate
    await page.goto(`/manager/forms/${formId}`);
    
    // History should show first rate
    await expect(page.getByText(/история курсов/i)).toBeVisible();
    await expect(page.getByText('70.00')).toBeVisible();
    
    await page.getByLabel(/курс возврата/i).fill('75.50');
    await page.getByRole('button', { name: /отправить/i }).click();
    
    // Reload and verify history has both rates
    await page.reload();
    const historySection = page.getByText(/история курсов/i).locator('..');
    await expect(historySection).toContainText('70.00');
    await expect(historySection).toContainText('75.50');
  });
});
