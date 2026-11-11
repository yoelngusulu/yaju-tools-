import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

function toDataUrl(source) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}

const redirectSource = await readFile(
  new URL("../lib/auth/redirect.ts", import.meta.url),
  "utf8"
);
const redirectModuleUrl = toDataUrl(redirectSource);
const redirectModule = await import(redirectModuleUrl);
const callbackSource = await readFile(
  new URL("../lib/auth/callback.ts", import.meta.url),
  "utf8"
);
const callbackModuleUrl = toDataUrl(
  callbackSource.replaceAll('"./redirect"', JSON.stringify(redirectModuleUrl))
);
const callbackModule = await import(callbackModuleUrl);

const {
  getSafeNextPath,
  getAuthCallbackUrl,
  getRecoveryCallbackUrl,
  getCanonicalCallbackUrl,
  getAllowedAuthOrigin,
  getAuthCallbackOrigin,
  isAllowedAuthHost,
} = redirectModule;
const { getAuthCallbackDestination } = callbackModule;

test("accepts the explicitly approved internal destinations", () => {
  assert.equal(getSafeNextPath("/dashboard"), "/dashboard");
  assert.equal(getSafeNextPath("/update-password"), "/update-password");
  assert.equal(getSafeNextPath("/checkout/premium"), "/checkout/premium");
});

test("falls back for external and protocol-relative destinations", () => {
  assert.equal(getSafeNextPath("https://example.com"), "/dashboard");
  assert.equal(getSafeNextPath("//example.com"), "/dashboard");
  assert.equal(getSafeNextPath("///example.com"), "/dashboard");
});

test("rejects slash-backslash and repeated backslash redirect bypasses", () => {
  assert.equal(getSafeNextPath("/\\example.com"), "/dashboard");
  assert.equal(getSafeNextPath("/\\\\example.com"), "/dashboard");
  assert.equal(getSafeNextPath("/\\\\\\\\example.com"), "/dashboard");
});

test("rejects encoded path separators and path-normalization tricks", () => {
  assert.equal(getSafeNextPath("/%2f%2fexample.com"), "/dashboard");
  assert.equal(getSafeNextPath("/%5cexample.com"), "/dashboard");
  assert.equal(getSafeNextPath("/%2F%5Cexample.com"), "/dashboard");
  assert.equal(getSafeNextPath("/../update-password"), "/dashboard");
  assert.equal(getSafeNextPath("/%2e%2e/update-password"), "/dashboard");
});

test("rejects query strings, fragments, controls, whitespace and malformed input", () => {
  assert.equal(getSafeNextPath("/dashboard?next=https://example.com"), "/dashboard");
  assert.equal(getSafeNextPath("/update-password#external"), "/dashboard");
  assert.equal(getSafeNextPath("\u0000/dashboard"), "/dashboard");
  assert.equal(getSafeNextPath(" /dashboard"), "/dashboard");
  assert.equal(getSafeNextPath(""), "/dashboard");
  assert.equal(getSafeNextPath(null), "/dashboard");
  assert.equal(getSafeNextPath("/".repeat(600)), "/dashboard");
  assert.equal(getSafeNextPath("/not-an-approved-page"), "/dashboard");
});

test("builds callback URLs on the canonical YAJU origin", () => {
  const callback = new URL(getAuthCallbackUrl("/update-password"));

  assert.equal(callback.origin, "https://yaju-tools.com");
  assert.equal(callback.pathname, "/auth/callback");
  assert.equal(callback.searchParams.get("next"), "/update-password");
});

test("does not propagate an attacker-controlled redirect into the callback URL", () => {
  const callback = new URL(getAuthCallbackUrl("/\\\\example.com"));

  assert.equal(callback.origin, "https://yaju-tools.com");
  assert.equal(callback.pathname, "/auth/callback");
  assert.equal(callback.searchParams.get("next"), "/dashboard");
});

test("sends recovery callback URLs to the canonical host with the reset destination", () => {
  const callback = new URL(getRecoveryCallbackUrl("test-recovery-code"));

  assert.equal(callback.origin, "https://yaju-tools.com");
  assert.equal(callback.pathname, "/auth/callback");
  assert.equal(callback.searchParams.get("next"), "/update-password");
  assert.equal(callback.searchParams.get("code"), "test-recovery-code");
});

test("recovery form is served only on a permitted auth host", () => {
  assert.equal(isAllowedAuthHost("yaju-tools.com", false), true);
  assert.equal(isAllowedAuthHost("YAJU-TOOLS.COM", false), true);
  assert.equal(isAllowedAuthHost("yaju-tools.vercel.app", false), false);
  assert.equal(isAllowedAuthHost(null, false), false);
  assert.equal(isAllowedAuthHost("localhost:3000", true), true);
});

test("canonicalizes callback requests before code exchange and validates next", () => {
  const callback = getCanonicalCallbackUrl(
    "https://yaju-tools.vercel.app/auth/callback?code=test-code&next=%2Fupdate-password"
  );

  assert.equal(callback.origin, "https://yaju-tools.com");
  assert.equal(callback.pathname, "/auth/callback");
  assert.equal(callback.searchParams.get("next"), "/update-password");
  assert.equal(callback.searchParams.get("code"), "test-code");

  const rejected = getCanonicalCallbackUrl(
    "https://yaju-tools.vercel.app/auth/callback?code=test-code&next=%2F%5Cexample.com"
  );
  assert.equal(rejected.searchParams.get("next"), "/dashboard");
});

test("callback success exchanges the code and redirects to an allowlisted path on the canonical host", async () => {
  let exchangeCalled = false;
  const destination = await getAuthCallbackDestination(
    "https://yaju-tools.com/auth/callback?code=test-code&next=%2Fcheckout%2Fpremium",
    async () => {
      exchangeCalled = true;
      return { error: null };
    }
  );

  assert.equal(exchangeCalled, true);
  assert.equal(destination.origin, "https://yaju-tools.com");
  assert.equal(destination.pathname, "/checkout/premium");
});

test("missing callback code does not exchange a code and falls back safely", async () => {
  let exchangeCalled = false;
  const destination = await getAuthCallbackDestination(
    "https://yaju-tools.com/auth/callback?next=%2Fnot-approved",
    async () => {
      exchangeCalled = true;
      return { error: null };
    }
  );

  assert.equal(exchangeCalled, false);
  assert.equal(destination.origin, "https://yaju-tools.com");
  assert.equal(destination.pathname, "/login");
  assert.equal(destination.searchParams.get("error"), "auth-callback");
});

test("missing recovery code preserves the recovery error path on the canonical host", async () => {
  const destination = await getAuthCallbackDestination(
    "https://yaju-tools.com/auth/callback?next=%2Fupdate-password",
    async () => ({ error: null })
  );

  assert.equal(destination.origin, "https://yaju-tools.com");
  assert.equal(destination.pathname, "/forgot-password");
  assert.equal(destination.searchParams.get("error"), "missing-code");
});

test("rejected callback code returns a safe recovery error", async () => {
  const destination = await getAuthCallbackDestination(
    "https://yaju-tools.com/auth/callback?code=test-code&next=%2Fupdate-password",
    async () => ({ error: new Error("invalid test code") })
  );

  assert.equal(destination.origin, "https://yaju-tools.com");
  assert.equal(destination.pathname, "/forgot-password");
  assert.equal(destination.searchParams.get("error"), "reset-link-invalid");
});

test("successful recovery preserves update-password as the callback destination", async () => {
  const destination = await getAuthCallbackDestination(
    "https://yaju-tools.com/auth/callback?code=test-code&next=%2Fupdate-password",
    async () => ({ error: null })
  );

  assert.equal(destination.origin, "https://yaju-tools.com");
  assert.equal(destination.pathname, "/update-password");
  assert.equal(destination.search, "");
  assert.equal(destination.hash, "");
});


test("allows only the canonical production host for authentication pages", () => {
  assert.equal(isAllowedAuthHost("yaju-tools.com", false), true);
  assert.equal(isAllowedAuthHost("YAJU-TOOLS.COM", false), true);
  assert.equal(isAllowedAuthHost("yaju-tools.vercel.app", false), false);
  assert.equal(isAllowedAuthHost("preview.example.com", false), false);
  assert.equal(isAllowedAuthHost("yaju-tools.com.attacker.example", false), false);
  assert.equal(isAllowedAuthHost(null, false), false);
});

test("allows loopback authentication hosts only when local development is enabled", () => {
  assert.equal(isAllowedAuthHost("localhost:3000", true), true);
  assert.equal(isAllowedAuthHost("127.0.0.1:3000", true), true);
  assert.equal(isAllowedAuthHost("[::1]:3000", true), true);

  assert.equal(isAllowedAuthHost("localhost:3000", false), false);
  assert.equal(isAllowedAuthHost("yaju-tools.vercel.app", true), false);
  assert.equal(isAllowedAuthHost("attacker.example", true), false);
  assert.equal(isAllowedAuthHost("localhost:3000/path", true), false);
});

test("uses a local callback origin only for explicitly allowed loopback origins", () => {
  assert.equal(
    getAllowedAuthOrigin("http://localhost:3000", true),
    "http://localhost:3000"
  );
  assert.equal(
    getAllowedAuthOrigin("http://127.0.0.1:3000", true),
    "http://127.0.0.1:3000"
  );
  assert.equal(
    getAllowedAuthOrigin("http://localhost:3000", false),
    null
  );
  assert.equal(
    getAuthCallbackOrigin("https://preview.example.com", true),
    "https://yaju-tools.com"
  );

  const localCallback = new URL(
    getAuthCallbackUrl("/update-password", "http://localhost:3000", true)
  );
  assert.equal(localCallback.origin, "http://localhost:3000");
  assert.equal(localCallback.pathname, "/auth/callback");
  assert.equal(
    localCallback.searchParams.get("next"),
    "/update-password"
  );

  const previewCallback = new URL(
    getAuthCallbackUrl(
      "/update-password",
      "https://yaju-preview.vercel.app",
      true
    )
  );
  assert.equal(previewCallback.origin, "https://yaju-tools.com");
});

test("keeps a localhost callback response on the same local auth origin", async () => {
  let exchangeCalled = false;
  const destination = await getAuthCallbackDestination(
    "http://localhost:3000/auth/callback?code=local-test&next=%2Fupdate-password",
    async () => {
      exchangeCalled = true;
      return { error: null };
    },
    "http://localhost:3000"
  );

  assert.equal(exchangeCalled, true);
  assert.equal(destination.origin, "http://localhost:3000");
  assert.equal(destination.pathname, "/update-password");
});
