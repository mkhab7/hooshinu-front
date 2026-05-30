import { describe, it, expect } from "vitest";
import {
  cn,
  formatNumber,
  formatToman,
  formatCredits,
  formatDateTime,
  relativeFromNow,
} from "./utils";

describe("cn", () => {
  it("merges truthy class names and drops falsy ones", () => {
    expect(cn("a", "b")).toBe("a b");
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });

  it("supports conditional object syntax", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });
});

describe("formatNumber", () => {
  it("returns a dash for nullish input", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
  });

  it("formats numbers using Persian digits", () => {
    // 123 -> Persian "۱۲۳"
    expect(formatNumber(123)).toBe("۱۲۳");
  });

  it("groups thousands", () => {
    // Should contain a grouping separator, not be the raw ASCII number.
    const out = formatNumber(1000);
    expect(out).not.toBe("1000");
    expect(out.length).toBeGreaterThanOrEqual(4);
  });
});

describe("formatToman", () => {
  it("appends the toman suffix", () => {
    expect(formatToman(5000)).toContain("تومان");
  });

  it("returns a dash for nullish input", () => {
    expect(formatToman(null)).toBe("—");
  });
});

describe("formatCredits", () => {
  it("returns a dash for nullish input", () => {
    expect(formatCredits(null)).toBe("—");
    expect(formatCredits(undefined)).toBe("—");
  });

  it("rounds to at most 3 decimal places", () => {
    // 0.0024999 -> rounds to 0.002 -> Persian "۰٫۰۰۲"
    const out = formatCredits(0.0024999);
    // Persian decimal separator is "٫"; should not show extra digits
    expect(out).not.toContain("4");
  });

  it("handles integers cleanly", () => {
    expect(formatCredits(100)).toBe("۱۰۰");
  });

  it("treats zero as a value, not nullish", () => {
    expect(formatCredits(0)).toBe("۰");
  });
});

describe("formatDateTime", () => {
  it("returns a dash for empty or invalid input", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("not-a-date")).toBe("—");
  });

  it("formats a valid ISO string to a non-empty localized string", () => {
    const out = formatDateTime("2024-01-15T10:30:00Z");
    expect(out).not.toBe("—");
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("relativeFromNow", () => {
  it("returns a dash for nullish/invalid input", () => {
    expect(relativeFromNow(null)).toBe("—");
    expect(relativeFromNow("nope")).toBe("—");
  });

  it("reports 'just now' for the current moment", () => {
    expect(relativeFromNow(new Date().toISOString())).toBe("همین حالا");
  });

  it("reports minutes for a few minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(relativeFromNow(fiveMinAgo)).toContain("دقیقه پیش");
  });

  it("reports hours for a few hours ago", () => {
    const threeHrAgo = new Date(Date.now() - 3 * 3600_000).toISOString();
    expect(relativeFromNow(threeHrAgo)).toContain("ساعت پیش");
  });

  it("reports days for a few days ago", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400_000).toISOString();
    expect(relativeFromNow(twoDaysAgo)).toContain("روز پیش");
  });

  it("falls back to an absolute date beyond ~30 days", () => {
    const longAgo = new Date(Date.now() - 60 * 86400_000).toISOString();
    const out = relativeFromNow(longAgo);
    expect(out).not.toContain("پیش");
    expect(out).not.toBe("—");
  });
});
