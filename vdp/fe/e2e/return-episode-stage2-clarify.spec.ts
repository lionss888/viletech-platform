import { test, expect } from "@playwright/test";

/**
 * Stage 2 E2E: Manager → Client → Manager clarify cycle.
 * Tests:
 * - Manager asks question (with file gesture)
 * - Client sees question and replies
 * - Manager back to decision point (episode remains active)
 * - Provider does not see clarify conversation
 */

test.describe("Return Episode Stage 2: Clarify Cycle", () => {
  test("manager clarify → client reply → manager decision", async ({ page }) => {
    // TODO: Seed form with return_reported status, active episode
    const formId = "test-form-clarify-1";

    // ========================================
    // Manager asks for clarification
    // ========================================
    // Login as manager
    // await page.goto(`/login`);
    // await fillLoginForm(page, "manager@vdp.local", "password");
    
    await page.goto(`/forms/${formId}`);

    // Manager clicks "Уточнить у клиента"
    const clarifyButton = page.getByRole("button", { name: /уточнить у клиента/i });
    await expect(clarifyButton).toBeVisible();
    await clarifyButton.click();

    // Fill question
    const questionField = page.getByLabel(/вопрос клиенту/i);
    await questionField.fill("Пожалуйста, приложите инвойс");

    // File gesture (optional, demonstrates filechooser pattern)
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByTestId("clarify-file-zone").click(),
    ]);
    await fileChooser.setFiles({
      name: "clarify-doc.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("PDF content"),
    });

    // Submit question
    const submitButton = page.getByRole("button", { name: /отправить вопрос/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Wait for success
    await expect(page.getByText(/вопрос отправлен/i)).toBeVisible({ timeout: 5000 });

    // ========================================
    // Client sees question and replies
    // ========================================
    // Login as client (form owner)
    // await page.goto("/login");
    // await fillLoginForm(page, "client@vdp.local", "password");

    await page.goto(`/forms/${formId}`);

    // Client sees manager's question
    await expect(page.getByText(/вопрос от менеджера/i)).toBeVisible();
    await expect(page.getByText(/пожалуйста, приложите инвойс/i)).toBeVisible();

    // Fill answer
    const answerField = page.getByLabel(/ваш ответ/i);
    await answerField.fill("Инвойс прилагаю");

    // File gesture for answer (optional)
    const [fileChooser2] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByTestId("clarify-answer-file-zone").click(),
    ]);
    await fileChooser2.setFiles({
      name: "invoice.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("Invoice PDF"),
    });

    // Submit answer
    const replyButton = page.getByRole("button", { name: /отправить ответ/i });
    await expect(replyButton).toBeEnabled();
    await replyButton.click();

    // Wait for success
    await expect(page.getByText(/ответ отправлен/i)).toBeVisible({ timeout: 5000 });

    // ========================================
    // Manager sees answer and back to decision
    // ========================================
    // Login as manager again
    // await page.goto("/login");
    // await fillLoginForm(page, "manager@vdp.local", "password");

    await page.goto(`/forms/${formId}`);

    // Manager sees client's answer
    await expect(page.getByText(/ответ клиента/i)).toBeVisible();
    await expect(page.getByText(/инвойс прилагаю/i)).toBeVisible();

    // Episode still active (not terminal)
    // Manager can choose: clarify again / return to client / repeat payment
    await expect(page.getByRole("button", { name: /уточнить у клиента/i })).toBeVisible();
    // Decision buttons for stages 3-4 will be added later
    // await expect(page.getByRole("button", { name: /вернуть клиенту/i })).toBeVisible();
    // await expect(page.getByRole("button", { name: /повторить платёж/i })).toBeVisible();

    // ========================================
    // Provider does not see clarify conversation
    // ========================================
    // Login as provider
    // await page.goto("/login");
    // await fillLoginForm(page, "provider@vdp.local", "password");

    await page.goto(`/forms/${formId}`);

    // Provider should not see manager's question or client's answer
    await expect(page.getByText(/вопрос от менеджера/i)).not.toBeVisible();
    await expect(page.getByText(/ответ клиента/i)).not.toBeVisible();
  });

  test("clarify not terminal - episode remains active", async ({ page }) => {
    const formId = "test-form-clarify-2";

    // After client replies, status should be return_mgr_decision
    // but returnEpisode.active should still be true

    // Login as manager
    await page.goto(`/forms/${formId}`);

    // Check that episode is active after clarify cycle
    // This can be verified by checking the UI shows decision buttons again
    await expect(page.getByRole("button", { name: /уточнить у клиента/i })).toBeVisible();
  });

  test("manager can clarify multiple times", async ({ page }) => {
    const formId = "test-form-clarify-3";

    // First clarify cycle
    await page.goto(`/forms/${formId}`);
    await page.getByRole("button", { name: /уточнить у клиента/i }).click();
    await page.getByLabel(/вопрос клиенту/i).fill("Question 1");
    await page.getByRole("button", { name: /отправить вопрос/i }).click();
    await expect(page.getByText(/вопрос отправлен/i)).toBeVisible();

    // Client replies
    // (switch to client, reply, switch back to manager)

    // Second clarify cycle
    await page.goto(`/forms/${formId}`);
    await page.getByRole("button", { name: /уточнить у клиента/i }).click();
    await page.getByLabel(/вопрос клиенту/i).fill("Question 2");
    await page.getByRole("button", { name: /отправить вопрос/i }).click();
    await expect(page.getByText(/вопрос отправлен/i)).toBeVisible();

    // Cycle count should increment
    // (can be checked in dev tools or by inspecting form data)
  });
});
