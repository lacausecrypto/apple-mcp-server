/**
 * Tests for registry.ts — domain registration and schema building
 *
 * Run: npm test
 * Requires: npm run build (imports from dist/)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getDomains, buildInputSchema } from "../dist/registry.js";

// ══════════════════════════════════════════════════════════════════
// getDomains — domain listing
// ══════════════════════════════════════════════════════════════════

describe("getDomains", () => {
  const domains = getDomains();

  it("returns exactly 31 domains", () => {
    assert.equal(domains.length, 31);
  });

  it("each domain has a name", () => {
    for (const d of domains) {
      assert.ok(typeof d.name === "string" && d.name.length > 0, `domain missing name`);
    }
  });

  it("each domain has a description", () => {
    for (const d of domains) {
      assert.ok(
        typeof d.description === "string" && d.description.length > 0,
        `${d.name} missing description`,
      );
    }
  });

  it("each domain has at least 1 action", () => {
    for (const d of domains) {
      const actionCount = Object.keys(d.actions).length;
      assert.ok(actionCount >= 1, `${d.name} has 0 actions`);
    }
  });

  it("all domain names start with apple_", () => {
    for (const d of domains) {
      assert.ok(d.name.startsWith("apple_"), `${d.name} does not start with apple_`);
    }
  });

  it("total action count is 303", () => {
    let total = 0;
    for (const d of domains) {
      total += Object.keys(d.actions).length;
    }
    assert.equal(total, 303);
  });

  it("each action has a description", () => {
    for (const d of domains) {
      for (const [actionName, actionDef] of Object.entries(d.actions)) {
        assert.ok(
          typeof actionDef.description === "string" && actionDef.description.length > 0,
          `${d.name}.${actionName} missing description`,
        );
      }
    }
  });

  it("each action has a handler function", () => {
    for (const d of domains) {
      for (const [actionName, actionDef] of Object.entries(d.actions)) {
        assert.equal(
          typeof actionDef.handler,
          "function",
          `${d.name}.${actionName} handler is not a function`,
        );
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// buildInputSchema — JSON Schema generation
// ══════════════════════════════════════════════════════════════════

describe("buildInputSchema", () => {
  const domains = getDomains();

  it("returns valid JSON Schema object for each domain", () => {
    for (const d of domains) {
      const schema = buildInputSchema(d);
      assert.equal(schema.type, "object", `${d.name} schema type should be object`);
      assert.ok(
        Array.isArray(schema.required) && schema.required.includes("action"),
        `${d.name} schema should require "action"`,
      );
      assert.ok(
        typeof schema.properties === "object",
        `${d.name} schema should have properties`,
      );
    }
  });

  it("action property is a string enum with correct values", () => {
    for (const d of domains) {
      const schema = buildInputSchema(d);
      const actionProp = schema.properties.action;
      assert.equal(actionProp.type, "string", `${d.name} action should be string type`);
      assert.ok(Array.isArray(actionProp.enum), `${d.name} action should have enum`);

      const expectedActions = Object.keys(d.actions);
      assert.deepEqual(
        actionProp.enum,
        expectedActions,
        `${d.name} action enum mismatch`,
      );
    }
  });

  it("action enum has a description listing all actions", () => {
    for (const d of domains) {
      const schema = buildInputSchema(d);
      const actionProp = schema.properties.action;
      assert.ok(
        typeof actionProp.description === "string" && actionProp.description.length > 0,
        `${d.name} action enum should have description`,
      );
    }
  });

  it("specific domain check: apple_volume has 7 action values", () => {
    const volume = domains.find((d) => d.name === "apple_volume");
    assert.ok(volume, "apple_volume domain should exist");
    const schema = buildInputSchema(volume);
    assert.equal(schema.properties.action.enum.length, 7);
  });

  it("specific domain check: apple_system has 30 action values", () => {
    const system = domains.find((d) => d.name === "apple_system");
    assert.ok(system, "apple_system domain should exist");
    const schema = buildInputSchema(system);
    assert.equal(schema.properties.action.enum.length, 30);
  });
});
