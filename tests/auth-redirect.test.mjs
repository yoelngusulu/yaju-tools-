import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../lib/auth/redirect.ts", import.meta.url),
  "utf8"
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const redirectModule = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

const { getSafeNextPath, getAuthCallbackUrl } = redirectModule;

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
