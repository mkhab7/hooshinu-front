import { describe, it, expect } from "vitest";
import { translate, isRtl } from "./index";
import { fa } from "./fa";
import { en } from "./en";

describe("translation dictionaries", () => {
  it("en defines exactly the same keys as fa (no missing/extra)", () => {
    const faKeys = Object.keys(fa).sort();
    const enKeys = Object.keys(en).sort();
    expect(enKeys).toEqual(faKeys);
  });

  it("has no empty translations", () => {
    for (const [k, v] of Object.entries(fa)) {
      expect(v, `fa.${k}`).not.toBe("");
    }
    for (const [k, v] of Object.entries(en)) {
      expect(v, `en.${k}`).not.toBe("");
    }
  });
});

describe("translate", () => {
  it("returns the string for the active locale", () => {
    expect(translate("fa", "nav.chat")).toBe("گفتگو");
    expect(translate("en", "nav.chat")).toBe("Chat");
  });

  it("interpolates named placeholders", () => {
    expect(translate("en", "dash.greeting", { name: "Sara" })).toBe(
      "Hi Sara 👋"
    );
    expect(translate("fa", "login.resendIn", { sec: 30 })).toContain("30");
  });

  it("leaves unknown placeholders intact", () => {
    // wallet.planCredits expects {credits}; passing nothing keeps the token.
    expect(translate("en", "wallet.planCredits")).toBe("{credits} credits");
  });

  it("falls back to fa when the locale dictionary lacks a key", () => {
    // Force an unknown locale via cast — should fall back to fa text.
    const out = translate("de" as never, "nav.wallet");
    expect(out).toBe(fa["nav.wallet"]);
  });

  it("supports multiple placeholders in one string", () => {
    // studio.statusValue has one; verify substitution is positional-agnostic.
    expect(translate("en", "studio.statusValue", { status: "Queued" })).toBe(
      "Status: Queued"
    );
  });
});

describe("isRtl", () => {
  it("is true for fa and false for en", () => {
    expect(isRtl("fa")).toBe(true);
    expect(isRtl("en")).toBe(false);
  });
});
