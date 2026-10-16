import {
  test,
  expect,
  type Locator,
  type Page,
  type Response as PlaywrightResponse,
} from '@playwright/test';
import {
  adminAvailable,
  cleanupTrackedEmails,
  confirmUserByEmail,
  createUserFixture,
  deleteUserByEmail,
  generateRecoveryTokenHash,
  getAuthMetadataByEmail,
  getProfileByEmail,
  trackEmail,
  uniqueEmail,
} from './helpers/auth-admin';

/**
 * Auth e2e — plan Phase 6 (`process/features/user-authentication/active/
 * auth-flow_05-10-26/auth-flow_PLAN_05-10-26.md`).
 *
 * Strategy decided at PLAN time and kept here:
 *  - REAL Supabase for the register → login → logout happy path and for the
 *    wrong-password / forgot-password copy checks (no network mocking).
 *  - Node-side service-role helper (`./helpers/auth-admin`) for admin-confirm,
 *    `public.users` reads (5.6/5.7), recovery `token_hash` generation and
 *    cleanup. Server-side only — never imported by app code, never exposed to
 *    `page`.
 *  - OTP full flow is skip-gated on `E2E_OTP_MAILBOX` (plan 6.5).
 *  - Cleanup deletes every created user in `finally` + `afterAll` (plan 6.7).
 *
 * EMAIL-SEND BUDGET (out-of-code constraint discovered in Phase 6): this project
 * uses Supabase's built-in email provider, which allows **2 emails per hour,
 * project-wide**, and raising it needs a dashboard/SMTP change (Phase 0
 * checklist item, user action — out of code). Each `signUp` and each
 * `resetPasswordForEmail` on a real address costs one send, so:
 *   - the two send-dependent tests run only in the desktop project of whichever
 *     config is in use (`desktop-chromium` for `apps/web/playwright.config.ts`,
 *     `chromium` for the repo-root `playwright.config.ts`), so one run spends at
 *     most 2 sends;
 *   - the mobile projects prove the same flows that do not send (login form at
 *     375px, middleware, error copy) and skip the sending ones explicitly;
 *   - a quota response from Supabase (HTTP 429 / "rate limit" body) is reported
 *     as an explicit skip instead of a failure, so a second config run in the
 *     same hour degrades to a skip rather than a red suite;
 *   - fixture users come from the admin API (no email, no quota);
 *   - set `E2E_ALLOW_EMAIL_SENDS=1` to run the sending tests in every project.
 *
 * Security assertions (plan AC-13 / R6): no test asserts on, logs, or prints
 * tokens. Assertions target UI copy, pathname, and the allowlisted `?next=`
 * value only; the after-each hygiene check fails if a token ever reaches a URL
 * or the console.
 */

const LOGIN_ERROR = 'Email hoặc mật khẩu không đúng.';
const RECOVERY_COPY = 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn. Vui lòng kiểm tra hộp thư.';
const REGISTER_SENT_COPY =
  'Đăng ký thành công! Vui lòng kiểm tra email của bạn để xác thực tài khoản.';

const REGISTER_PASSWORD = 'BusGoE2e!2026';
const FIXTURE_LOGIN_PASSWORD = 'BusGoFixture!2026';
const FIXTURE_RESET_PASSWORD = 'BusGoReset!2026';
const FIXTURE_RESET_NEW_PASSWORD = 'BusGoResetNew!2026';

/**
 * Desktop project of each checked-in config: `apps/web/playwright.config.ts`
 * (`desktop-chromium`) and the repo-root `playwright.config.ts` (`chromium`).
 * Mobile projects never spend sends.
 */
const SEND_PROJECTS = new Set(['desktop-chromium', 'chromium']);
const ALLOW_EXTRA_SENDS = process.env.E2E_ALLOW_EMAIL_SENDS === '1';

const ADMIN_SKIP_REASON =
  'service-role admin helper unavailable (SUPABASE_SERVICE_ROLE_KEY missing or rejected)';

const QUOTA_SKIP_REASON =
  'Supabase built-in email quota reached (2/hour project-wide) — sending flow already ' +
  'evidenced by an earlier run this hour; raise the dashboard limit or wait, then re-run';

function sendBudgetReason(flow: string): string {
  return (
    `${flow} sends email and the built-in provider allows 2/hour project-wide; ` +
    'it runs only in the desktop project of each config ' +
    '(set E2E_ALLOW_EMAIL_SENDS=1 to run everywhere)'
  );
}

function canSendEmails(): boolean {
  return ALLOW_EXTRA_SENDS || SEND_PROJECTS.has(test.info().project.name);
}

/** `true` when Supabase refused because of the hourly email-send limit. */
async function isQuotaResponse(response: PlaywrightResponse): Promise<boolean> {
  if (response.status() === 429) return true;
  if (response.status() < 400) return false;
  try {
    return /rate limit/i.test(await response.text());
  } catch {
    return false;
  }
}

async function waitForPathname(page: Page, expected: string): Promise<void> {
  // Poll the URL directly: `waitForURL` with its default `waitUntil: 'load'`
  // can hang on this dev server when the load event is delayed, even though
  // the location already changed (seen on the recovery callback redirect).
  await expect
    .poll(() => new URL(page.url()).pathname, {
      timeout: 30_000,
      message: `expected pathname to become ${expected}`,
    })
    .toBe(expected);
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
}

/**
 * `page.goto` plus the settle steps this dev-server setup needs: wait for the
 * document to stop fetching (Next hydration finishes in this window), and
 * survive the occasional "Fast Refresh full reload" that interrupts a
 * navigation when two workers compile routes at the same time.
 */
async function gotoPath(
  page: Page,
  path: string,
  options: { allowRetry?: boolean } = {}
): Promise<void> {
  const attempt = async () => {
    // `domcontentloaded`: `load` can be held open by a slow subresource, and a
    // 45s cold `next dev` compile can exceed Playwright's default 30s.
    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
    await waitForHydration(page);
  };
  if (options.allowRetry === false) {
    await attempt();
    return;
  }
  try {
    await attempt();
  } catch (error) {
    // Retry once for the two dev-server hiccups seen in this environment: a
    // Fast Refresh reload interrupting the navigation, and a cold-compile
    // timeout. Anything else still fails on the second attempt.
    const message = String(error);
    if (!/interrupted by another navigation|Timeout/i.test(message)) throw error;
    console.log(`[gotoPath] ${path} first attempt failed (${message.split('\n')[0]}); url=${page.url()}`);
    await page.waitForTimeout(1_000);
    await attempt();
  }
}

/**
 * Wait until React has attached its own handlers to the page.
 *
 * `page.fill()` writes straight into the DOM: if hydration has not committed
 * yet, React never sees the value, its state stays empty, and the next
 * re-render (e.g. the submit that shows zod errors) wipes the field. React
 * marks every element it processed with a `__react*` key, so that key is a
 * reliable "safe to interact" signal — on this dev server hydration often
 * finishes after `networkidle` because a second Playwright worker is holding
 * the compiler busy.
 */
async function waitForHydration(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () => {
        const element = document.querySelector('input, button, form');
        return (
          !!element && Object.keys(element).some((key) => key.startsWith('__react'))
        );
      },
      undefined,
      { timeout: 20_000 }
    )
    .catch(() => undefined);
}

/**
 * Fill a controlled React input and make sure the value sticks.
 *
 * Hydration (or a Fast Refresh full reload) can commit *after* `fill()` and
 * reset the input to its initial empty state — the form then validates the
 * empty value and never reaches Supabase. Re-fill until the DOM keeps the
 * value for 250ms.
 */
async function fillStable(page: Page, locator: Locator, value: string): Promise<void> {
  for (let attempt = 1; attempt <= 20; attempt++) {
    await locator.fill(value);
    await page.waitForTimeout(250);
    if ((await locator.inputValue().catch(() => null)) === value) return;
  }
  await locator.fill(value);
}

/**
 * Fill + submit the login form.
 *
 * The dev server can complete React hydration (or a Fast Refresh full reload)
 * *after* the first field was filled, which resets a controlled input back to
 * its empty state — the form then rejects with a zod field error and never
 * reaches Supabase. Detect that outcome and submit again with fresh values now
 * that React's handlers are live.
 */
async function submitLogin(page: Page, email: string, password: string): Promise<void> {
  const emailField = page.getByLabel('Email', { exact: true });
  const passwordField = page.getByLabel('Mật khẩu', { exact: true });
  const submit = page.getByRole('button', { name: 'Đăng nhập', exact: true });
  const rejectedByValidation = page.locator(
    'input[name="email"][aria-invalid="true"], input[name="password"][aria-invalid="true"]'
  );
  const loginError = page.locator('[data-testid="login-error"]');

  for (let attempt = 1; attempt <= 3; attempt++) {
    await waitForHydration(page);
    await fillStable(page, emailField, email);
    await fillStable(page, passwordField, password);
    await submit.click();

    const deadline = Date.now() + 15_000;
    let validationRejected = false;
    while (Date.now() < deadline) {
      if (await rejectedByValidation.isVisible().catch(() => false)) {
        validationRejected = true;
        break;
      }
      if ((await loginError.isVisible().catch(() => false)) || new URL(page.url()).pathname === '/') {
        return;
      }
      await page.waitForTimeout(250);
    }
    if (!validationRejected || attempt === 3) return;
  }
}

async function openUserMenu(page: Page) {
  const trigger = page.locator('button[aria-haspopup="menu"]');
  await expect(trigger).toBeVisible({ timeout: 30_000 });
  await trigger.click();
  return trigger;
}

let adminOk = false;
let adminSkipDetail = ADMIN_SKIP_REASON;
let fixtureLoginEmail = '';
let fixtureResetEmail = '';

test.beforeAll(async () => {
  try {
    adminOk = await adminAvailable();
    if (!adminOk) return;
    fixtureLoginEmail = uniqueEmail('e2e-fixture-login');
    fixtureResetEmail = uniqueEmail('e2e-fixture-reset');
    await createUserFixture({
      email: fixtureLoginEmail,
      password: FIXTURE_LOGIN_PASSWORD,
      fullName: 'E2E Fixture Login',
    });
    await createUserFixture({
      email: fixtureResetEmail,
      password: FIXTURE_RESET_PASSWORD,
      fullName: 'E2E Fixture Reset',
    });
  } catch (error) {
    adminOk = false;
    adminSkipDetail = `${ADMIN_SKIP_REASON}: ${(error as Error).message}`;
  }
});

test.afterAll(async () => {
  await cleanupTrackedEmails();
});

/** Plan 6.7: token material must never reach a URL or the console. */
const FORBIDDEN_OBSERVATIONS = [
  'access_token=',
  'refresh_token=',
  'id_token=',
  'provider_token=',
  'email_otp',
  'otp_code',
  'eyJ', // any JWT blob (anon/service keys, session tokens)
];

const observed = new Map<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const lines: string[] = [];
  page.on('console', (message) => lines.push(`console:${message.text()}`));
  page.on('pageerror', (error) => lines.push(`pageerror:${String(error)}`));
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) lines.push(`navigated:${frame.url()}`);
  });
  observed.set(page, lines);
});

test.afterEach(async ({ page }) => {
  const lines = observed.get(page) ?? [];
  observed.delete(page);
  for (const line of lines) {
    for (const forbidden of FORBIDDEN_OBSERVATIONS) {
      expect(
        line.includes(forbidden),
        `token material leaked into ${line.slice(0, 120)}`
      ).toBe(false);
    }
  }
});

test.describe('Authentication (real Supabase)', () => {
  // Plan 6.3 + Phase 5.6/5.7 evidence.
  test('register → admin-confirm → login → logout → protected redirect', async ({ page }) => {
    test.skip(!adminOk, adminSkipDetail);
    test.skip(!canSendEmails(), sendBudgetReason('register'));

    const email = uniqueEmail('e2e-register');
    const fullName = 'E2E Register User';
    trackEmail(email);

    try {
      // Plan 5.7: a hostile client can put `role` in signUp metadata — inject it
      // into the real signup request so the trigger is exercised with it.
      // NOTE: the URL predicate (not a glob) is required — signup carries a
      // `?redirect_to=…` query, and Playwright globs are anchored to the full URL.
      await page.route(
        (url) => url.pathname === '/auth/v1/signup',
        async (route) => {
          const body = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>;
          body.data = { ...(body.data as Record<string, unknown> | undefined), role: 'ADMIN' };
          await route.continue({ postData: JSON.stringify(body) });
        }
      );

      await gotoPath(page, '/register');
      await fillStable(page, page.getByLabel('Họ và tên', { exact: true }), fullName);
      await fillStable(page, page.getByLabel('Email', { exact: true }), email);
      await fillStable(page, page.getByLabel('Mật khẩu', { exact: true }), REGISTER_PASSWORD);
      await fillStable(page, page.getByLabel('Xác nhận mật khẩu', { exact: true }), REGISTER_PASSWORD);

      const signupResponse = page
        .waitForResponse(
          (response) =>
            response.url().includes('/auth/v1/signup') &&
            response.request().method() === 'POST',
          { timeout: 45_000 }
        )
        .catch(() => null);
      await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();

      const response = await signupResponse;
      if (response && (await isQuotaResponse(response))) {
        test.skip(true, QUOTA_SKIP_REASON);
      }

      const sentAlert = page.locator('[data-testid="confirmation-sent"]');
      const errorAlert = page.locator('[data-testid="register-error"]');
      await expect(sentAlert.or(errorAlert)).toBeVisible({ timeout: 45_000 });
      if (await errorAlert.isVisible()) {
        throw new Error(
          `register failed (status ${response?.status() ?? 'n/a'}; check email-send quota / ` +
            `redirect allowlist): ${(await errorAlert.textContent()) ?? ''}`
        );
      }
      // autoconfirm=false (plan P6) → confirmation state + resend cooldown.
      await expect(sentAlert).toContainText(REGISTER_SENT_COPY);
      await expect(page.getByRole('button', { name: /Gửi lại sau \d+s/ })).toBeVisible();

      // Plan 5.6: the AFTER INSERT trigger wrote exactly one public.users row.
      const rows = await getProfileByEmail(email);
      // eslint-disable-next-line no-console -- evidence line for the plan handoff
      console.log(`[5.6] public.users rows for register email: ${JSON.stringify(rows)}`);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        email,
        full_name: fullName,
        role: 'PASSENGER',
      });

      // Plan 5.7: crafted metadata arrived, DB role stayed PASSENGER.
      const metadata = await getAuthMetadataByEmail(email);
      expect(metadata?.role, 'tampered signUp metadata must be stored verbatim').toBe('ADMIN');
      // eslint-disable-next-line no-console -- evidence line for the plan handoff
      console.log(
        `[5.7] auth.users.raw_user_meta_data.role=${String(metadata?.role)} → public.users.role=${rows[0].role}`
      );
      expect(rows[0].role).toBe('PASSENGER');

      // Admin-confirm (dashboard "Confirm email" stays off — plan P6/Phase 0).
      expect(await confirmUserByEmail(email)).toBe(true);

      // Plan 6.3: wrong password first → generic copy, no enumeration.
      await gotoPath(page, '/login');
      await submitLogin(page, email, 'not-the-real-password');
      await expect(page.locator('[data-testid="login-error"]')).toHaveText(LOGIN_ERROR, {
        timeout: 15_000,
      });

      // Then the real credentials.
      await fillStable(page, page.getByLabel('Mật khẩu', { exact: true }), REGISTER_PASSWORD);
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await waitForPathname(page, '/');

      // AC-04: header swaps to the user menu.
      const trigger = await openUserMenu(page);
      const menu = page.locator('[role="menu"]');
      await expect(menu).toContainText(email);
      await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
      await expect(page.getByRole('link', { name: 'Đăng nhập', exact: true })).toBeVisible({
        timeout: 30_000,
      });
      await expect(trigger).toHaveCount(0);

      // AC-03: protected path while signed out → /login with a safe next.
      await gotoPath(page, '/settings');
      const redirected = new URL(page.url());
      expect(redirected.pathname).toBe('/login');
      expect(redirected.searchParams.get('next')).toBe('/settings');
    } finally {
      await deleteUserByEmail(email).catch(() => undefined);
    }
  });

  // Plan 6.4 — the one other test that spends an email send.
  test('forgot-password: identical copy for unknown/known email + recovery reset', async ({
    page,
  }) => {
    // Two full recovery rounds plus a token-minted reset exceed the 120s default
    // on this dev server (cold route compiles).
    test.setTimeout(180_000);
    test.skip(!adminOk, adminSkipDetail);
    test.skip(!canSendEmails(), sendBudgetReason('forgot-password'));

    let unknownCopy = '';
    let knownCopy = '';
    try {
      unknownCopy = await requestRecovery(page, uniqueEmail('e2e-unknown'));
      knownCopy = await requestRecovery(page, fixtureResetEmail);
    } catch (error) {
      if (error instanceof QuotaExhaustedError) test.skip(true, QUOTA_SKIP_REASON);
      throw error;
    }
    expect(knownCopy).toBe(unknownCopy);
    expect(knownCopy).toBe(RECOVERY_COPY);

    // Plan 6.4 optional full reset via generateLink → token_hash callback path
    // (no SMTP needed; the token is navigated with, never printed or asserted).
    // Recovery tokens are single-use, so any navigation failure is retried with
    // a freshly minted token rather than the consumed one.
    for (let attempt = 1; attempt <= 2; attempt++) {
      const tokenHash = await generateRecoveryTokenHash(fixtureResetEmail);
      expect(tokenHash, 'admin.generateLink must return a token hash').toBeTruthy();
      try {
        await gotoPath(
          page,
          `/auth/callback?token_hash=${encodeURIComponent(tokenHash as string)}&type=recovery&next=/reset-password`,
          { allowRetry: false }
        );
        await waitForPathname(page, '/reset-password');
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        console.log(
          `[forgot] reset-link navigation failed (${String(error).split('\n')[0]}); retrying with a fresh token`
        );
      }
    }
    await fillStable(
      page,
      page.getByLabel('Mật khẩu mới', { exact: true }),
      FIXTURE_RESET_NEW_PASSWORD
    );
    await fillStable(
      page,
      page.getByLabel('Xác nhận mật khẩu mới', { exact: true }),
      FIXTURE_RESET_NEW_PASSWORD
    );
    await page.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
    await waitForPathname(page, '/');

    // AC-09: the new password works for a subsequent login.
    await page.context().clearCookies();
    await gotoPath(page, '/login');
    await submitLogin(page, fixtureResetEmail, FIXTURE_RESET_NEW_PASSWORD);
    await waitForPathname(page, '/');
  });

  test('login → header menu → logout; authed /login redirects home', async ({ page }) => {
    test.skip(!adminOk, adminSkipDetail);

    await gotoPath(page, '/login');
    await submitLogin(page, fixtureLoginEmail, FIXTURE_LOGIN_PASSWORD);
    await waitForPathname(page, '/');

    const trigger = await openUserMenu(page);
    await expect(page.locator('[role="menu"]')).toContainText(fixtureLoginEmail);
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // AC-03: authenticated users hitting /login go home.
    await gotoPath(page, '/login');
    await waitForPathname(page, '/');

    await openUserMenu(page);
    await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
    await expect(page.getByRole('link', { name: 'Đăng nhập', exact: true })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('wrong password and unknown email produce the identical generic error', async ({ page }) => {
    test.skip(!adminOk, adminSkipDetail);

    const alert = page.locator('[data-testid="login-error"]');

    await gotoPath(page, '/login');
    await submitLogin(page, fixtureLoginEmail, 'definitely-not-the-password');
    await expect(alert).toHaveText(LOGIN_ERROR, { timeout: 15_000 });
    const wrongPasswordCopy = (await alert.textContent()) ?? '';

    await submitLogin(page, uniqueEmail('e2e-unknown'), 'definitely-not-the-password');
    await expect(alert).toHaveText(LOGIN_ERROR, { timeout: 15_000 });
    const unknownEmailCopy = (await alert.textContent()) ?? '';

    expect(unknownEmailCopy).toBe(wrongPasswordCopy);
  });

  test('middleware: public routes stay open, protected ones redirect safely', async ({ page }) => {
    const publicPaths = [
      '/',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/verify-otp',
    ];
    for (const pathname of publicPaths) {
      await gotoPath(page, pathname);
      expect(new URL(page.url()).pathname, `${pathname} must remain public`).toBe(pathname);
    }

    // The loop ends on /verify-otp, so re-enter the reset-password route before
    // asserting its own no-session guard.
    await gotoPath(page, '/reset-password');
    await expect(page.locator('[data-testid="no-recovery-session"]')).toBeVisible({
      timeout: 30_000,
    });

    await gotoPath(page, '/settings');
    let redirected = new URL(page.url());
    expect(redirected.pathname).toBe('/login');
    expect(redirected.searchParams.get('next')).toBe('/settings');

    await gotoPath(page, '/settings?tab=1');
    redirected = new URL(page.url());
    expect(redirected.pathname).toBe('/login');
    expect(redirected.searchParams.get('next')).toBe('/settings?tab=1');

    // Failed callback lands on the generic login error (no details in the URL).
    await gotoPath(page, '/auth/callback');
    redirected = new URL(page.url());
    expect(redirected.pathname).toBe('/login');
    expect(redirected.searchParams.get('error')).toBe('1');
  });

  test('unsafe ?next= values fall back to / after login', async ({ page }) => {
    test.skip(!adminOk, adminSkipDetail);

    const unsafeValues = ['//evil.com', 'https://evil.com', '/%2f%2fevil.com'];
    for (const unsafe of unsafeValues) {
      await page.context().clearCookies();
      await gotoPath(page, `/login?next=${encodeURIComponent(unsafe)}`);
      await submitLogin(page, fixtureLoginEmail, FIXTURE_LOGIN_PASSWORD);
      await waitForPathname(page, '/');
      expect(new URL(page.url()).pathname, `next=${unsafe} must not be honoured`).toBe('/');
    }
  });

  // Plan 6.5 — skip-gated on a real mailbox (E2E_OTP_MAILBOX is unset here, so
  // this reports as an explicit skip; component tests carry the always-on proof).
  test('email OTP: request → verify with a real mailbox', async ({ page }) => {
    test.skip(
      !process.env.E2E_OTP_MAILBOX,
      'No SMTP mailbox configured (E2E_OTP_MAILBOX not set)'
    );
    test.skip(!adminOk, adminSkipDetail);

    // E2E_OTP_MAILBOX contract: an HTTP endpoint that returns the newest OTP for
    // an address as plain text, e.g. `https://mailbox.local/latest?email=…`.
    const mailbox = process.env.E2E_OTP_MAILBOX as string;
    const email = fixtureResetEmail;

    await gotoPath(page, `/verify-otp?email=${encodeURIComponent(email)}`);
    await page.getByRole('button', { name: 'Gửi mã OTP', exact: true }).click();
    await expect(page.locator('[data-testid="otp-sent"]')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('button', { name: /Gửi lại sau \d+s/ })).toBeVisible();

    let code = '';
    for (let attempt = 0; attempt < 30; attempt++) {
      const response = await fetch(`${mailbox}?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        code = (await response.text()).trim();
        if (/^\d{6}$/.test(code)) break;
      }
      await page.waitForTimeout(2000);
    }
    expect(code, 'mailbox did not return a 6-digit code').toMatch(/^\d{6}$/);

    await fillStable(page, page.getByLabel('Mã OTP', { exact: true }), code);
    await page.getByRole('button', { name: 'Xác thực', exact: true }).click();
    await waitForPathname(page, '/');
  });
});

/** Supabase refused a send because the hourly email quota is spent. */
class QuotaExhaustedError extends Error {
  constructor() {
    super('email quota exhausted');
  }
}

async function requestRecovery(page: Page, email: string): Promise<string> {
  const startedAt = Date.now();
  const log = (message: string): void => {
    console.log(`[recover ${email.split('@')[0].slice(-8)}] ${message} +${Date.now() - startedAt}ms`);
  };
  await gotoPath(page, '/forgot-password');
  log(`goto done url=${page.url()}`);
  try {
    await fillStable(page, page.getByLabel('Email', { exact: true }), email);
  } catch (error) {
    const body = await page
      .locator('body')
      .innerText()
      .then((text) => text.slice(0, 220).replace(/\s+/g, ' '))
      .catch(() => '(unreadable)');
    log(`FILL FAILED url=${page.url()} body=${body}`);
    throw error;
  }
  log('filled');

  const recoverResponse = page
    .waitForResponse(
      (response) =>
        response.url().includes('/auth/v1/recover') && response.request().method() === 'POST',
      { timeout: 45_000 }
    )
    .catch(() => null);
  await page.getByRole('button', { name: 'Gửi hướng dẫn', exact: true }).click();
  log('clicked');

  const response = await recoverResponse;
  log(`recover response=${response ? String(response.status()) : 'none'}`);
  if (response && (await isQuotaResponse(response))) throw new QuotaExhaustedError();

  const sentAlert = page.locator('[data-testid="recovery-sent"]');
  const errorAlert = page.locator('[data-testid="forgot-error"]');
  await expect(sentAlert.or(errorAlert)).toBeVisible({ timeout: 45_000 });
  log('alert visible');
  if (await errorAlert.isVisible()) {
    throw new Error(
      `recovery request failed (status ${response?.status() ?? 'n/a'}; check email-send ` +
        `quota / redirect allowlist): ${(await errorAlert.textContent()) ?? ''}`
    );
  }
  await expect(sentAlert).toHaveText(RECOVERY_COPY, { timeout: 15_000 });
  return (await sentAlert.textContent()) ?? '';
}
