import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { NextRequest } from "next/server";

import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";

const originalVercelUrl = process.env.VERCEL_URL;
const originalBranchUrl = process.env.VERCEL_BRANCH_URL;
const originalProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

afterEach(() => {
  if (originalVercelUrl === undefined) delete process.env.VERCEL_URL;
  else process.env.VERCEL_URL = originalVercelUrl;

  if (originalBranchUrl === undefined) delete process.env.VERCEL_BRANCH_URL;
  else process.env.VERCEL_BRANCH_URL = originalBranchUrl;

  if (originalProductionUrl === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  else process.env.VERCEL_PROJECT_PRODUCTION_URL = originalProductionUrl;
});

describe("isAllowedConversionOrigin", () => {
  it("accepts the production domain with its matching HTTPS origin", () => {
    const request = new NextRequest("https://yaju-tools.com/api/test", {
      method: "POST",
      headers: { origin: "https://yaju-tools.com" },
    });

    assert.equal(isAllowedConversionOrigin(request), true);
  });

  it("rejects an origin from another website", () => {
    const request = new NextRequest("https://yaju-tools.com/api/test", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
    });

    assert.equal(isAllowedConversionOrigin(request), false);
  });

  it("rejects a missing Origin header by default", () => {
    const request = new NextRequest("https://yaju-tools.com/api/test", {
      method: "POST",
    });

    assert.equal(isAllowedConversionOrigin(request), false);
  });

  it("allows a missing Origin only when explicitly requested", () => {
    const request = new NextRequest("https://yaju-tools.com/api/test", {
      method: "POST",
    });

    assert.equal(isAllowedConversionOrigin(request, true), true);
  });

  it("accepts the current Vercel deployment host when its Origin matches", () => {
    process.env.VERCEL_URL = "yaju-preview-example.vercel.app";

    const request = new NextRequest("https://yaju-preview-example.vercel.app/api/test", {
      method: "POST",
      headers: { origin: "https://yaju-preview-example.vercel.app" },
    });

    assert.equal(isAllowedConversionOrigin(request), true);
  });

  it("rejects an unlisted request host even when the Origin is self-consistent", () => {
    const request = new NextRequest("https://untrusted.example/api/test", {
      method: "POST",
      headers: { origin: "https://untrusted.example" },
    });

    assert.equal(isAllowedConversionOrigin(request), false);
  });

  it("allows HTTP only for localhost development origins", () => {
    const request = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });

    assert.equal(isAllowedConversionOrigin(request), true);
  });

  it("rejects HTTP origins for the production domain", () => {
    const request = new NextRequest("https://yaju-tools.com/api/test", {
      method: "POST",
      headers: { origin: "http://yaju-tools.com" },
    });

    assert.equal(isAllowedConversionOrigin(request), false);
  });
});
