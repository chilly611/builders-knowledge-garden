import { describe, it, expect } from "vitest";
import {
  CANONICAL_ENTITY_DOMAIN,
  DEFAULT_DOMAIN,
  domainForEntityType,
} from "./entity-domain.mjs";

describe("domainForEntityType — the routing law (HITL spec §4)", () => {
  it("maps the four compliance types to their locked domains", () => {
    expect(domainForEntityType("building_code")).toBe("codes");
    expect(domainForEntityType("code")).toBe("codes");
    expect(domainForEntityType("code_section")).toBe("codes");
    expect(domainForEntityType("permit_requirement")).toBe("permits");
  });

  it("defaults every non-compliance type to construction (no invented taxonomy)", () => {
    // These exist in the corpus but are deliberately out of scope for the
    // re-bucket — locking them is a separate founder decision (§4).
    expect(domainForEntityType("material")).toBe(DEFAULT_DOMAIN);
    expect(domainForEntityType("safety_regulation")).toBe(DEFAULT_DOMAIN);
    expect(domainForEntityType("architectural_style")).toBe(DEFAULT_DOMAIN);
    expect(domainForEntityType("construction_method")).toBe("construction");
  });

  it("is total: unknown / null / undefined / empty resolve to construction", () => {
    expect(domainForEntityType("totally_unknown_type")).toBe("construction");
    expect(domainForEntityType(null)).toBe("construction");
    expect(domainForEntityType(undefined)).toBe("construction");
    expect(domainForEntityType("")).toBe("construction");
  });

  it("freezes the canonical map so the routing law can't be mutated at runtime", () => {
    expect(Object.isFrozen(CANONICAL_ENTITY_DOMAIN)).toBe(true);
  });

  it("locks the compliance domains the migration drives toward (not construction)", () => {
    for (const type of ["building_code", "code", "code_section", "permit_requirement"]) {
      expect(domainForEntityType(type)).not.toBe(DEFAULT_DOMAIN);
    }
  });
});
