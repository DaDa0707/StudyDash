import { describe, expect, it } from "vitest";

import { PRO_MONTHLY_PRODUCT_ID, grantsPro } from "../products";

describe("grantsPro", () => {
  it("Pro の商品なら true", () => {
    expect(grantsPro(PRO_MONTHLY_PRODUCT_ID)).toBe(true);
  });

  it("知らない商品には権限を与えない", () => {
    expect(grantsPro("com.example.other")).toBe(false);
    expect(grantsPro("")).toBe(false);
  });

  it("商品 ID は bundle identifier から始まる", () => {
    expect(PRO_MONTHLY_PRODUCT_ID.startsWith("com.dada0707.studydash.")).toBe(true);
  });
});
