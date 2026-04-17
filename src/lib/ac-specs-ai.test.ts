import { describe, expect, it } from "vitest";
import { parseAcSpecsJson } from "./ac-specs-ai";

describe("parseAcSpecsJson", () => {
  it("parses fenced JSON", () => {
    const j = '```json\n{"make":"X","model":"Y","year_from":2020,"year_to":null,"refrigerant_type":"R134a","refrigerant_weight":500,"oil_type":null,"oil_amount":null}\n```';
    const p = parseAcSpecsJson(j, null);
    expect(p?.make).toBe("X");
    expect(p?.refrigerant_weight).toBe(500);
  });

  it("falls back to customer year when year_from missing", () => {
    const j = '{"make":"A","model":"B","refrigerant_type":"R1234yf"}';
    const p = parseAcSpecsJson(j, 2019);
    expect(p?.year_from).toBe(2019);
    expect(p?.refrigerant_type).toBe("R1234yf");
  });

  it("accepts Arabic alias keys", () => {
    const j =
      '{"make":"تويوتا","model":"كورولا","نوع_الفريون":"R134a","كمية_الفريون":"450 غرام","year_from":2015}';
    const p = parseAcSpecsJson(j, null);
    expect(p?.refrigerant_weight).toBe(450);
  });
});
