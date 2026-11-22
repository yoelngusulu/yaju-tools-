import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hasPdfSignature } from "@/lib/pdf/validation";

describe("hasPdfSignature", () => {
  it("accepts a PDF header", () => {
    assert.equal(
      hasPdfSignature(new TextEncoder().encode("%PDF-1.7")),
      true
    );
  });

  it("rejects a non-PDF header", () => {
    assert.equal(
      hasPdfSignature(new TextEncoder().encode("PK\\u0003\\u0004")),
      false
    );
  });

  it("rejects data shorter than the PDF header", () => {
    assert.equal(
      hasPdfSignature(new TextEncoder().encode("%PD")),
      false
    );
  });

  it("accepts an ArrayBuffer input", () => {
    const bytes = new TextEncoder().encode("%PDF-2.0");
    assert.equal(hasPdfSignature(bytes.buffer), true);
  });
});
