import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkPermission } from "../dist/permissions.js";

describe("OPEN actions (execute immediately)", () => {
  const openCases = [
    ["apple_volume", "get"],
    ["apple_volume", "set"],
    ["apple_music", "play"],
    ["apple_music", "now_playing"],
    ["apple_safari", "current_url"],
    ["apple_safari", "list_tabs"],
    ["apple_sysinfo", "battery"],
    ["apple_sysinfo", "summary"],
    ["apple_clipboard", "get"],
    ["apple_apps", "list_running"],
    ["apple_finder", "list_folder"],
    ["apple_finder", "trash_count"],
    ["apple_notes", "list"],
    ["apple_notes", "read"],
    ["apple_calendar", "today"],
    ["apple_tts", "say"],
  ];

  for (const [tool, action] of openCases) {
    it(`${tool}.${action} is OPEN`, () => {
      const perm = checkPermission(tool, action);
      assert.equal(perm.level, "open");
    });
  }
});

describe("PROTECTED actions (require confirm: true)", () => {
  const protectedCases = [
    ["apple_finder", "empty_trash"],
    ["apple_finder", "delete"],
    ["apple_finder", "eject_all"],
    ["apple_finder", "rename"],
    ["apple_finder", "move"],
    ["apple_mail", "send"],
    ["apple_mail", "mark_all_read"],
    ["apple_mail", "move_to_trash"],
    ["apple_twitter", "post"],
    ["apple_twitter", "reply"],
    ["apple_twitter", "like"],
    ["apple_twitter", "retweet"],
    ["apple_messages", "send"],
    ["apple_contacts", "delete"],
    ["apple_contacts", "update_phone"],
    ["apple_notes", "delete"],
    ["apple_reminders", "delete"],
    ["apple_music", "delete_playlist"],
    ["apple_music", "remove_from_playlist"],
    ["apple_calendar", "delete_event"],
    ["apple_calendar", "modify_event"],
    ["apple_apps", "force_quit"],
    ["apple_system", "sleep"],
    ["apple_system", "eject_all_disks"],
  ];

  for (const [tool, action] of protectedCases) {
    it(`${tool}.${action} is PROTECTED`, () => {
      const perm = checkPermission(tool, action);
      assert.equal(perm.level, "protected", `Expected protected, got ${perm.level}`);
    });

    it(`${tool}.${action} has a reason`, () => {
      const perm = checkPermission(tool, action);
      assert.ok(perm.reason.length > 0, "reason should not be empty");
    });
  }
});

describe("BLOCKED actions (never executed)", () => {
  const blockedCases = [
    ["apple_system", "shutdown"],
    ["apple_system", "restart"],
    ["apple_system", "logout"],
  ];

  for (const [tool, action] of blockedCases) {
    it(`${tool}.${action} is BLOCKED`, () => {
      const perm = checkPermission(tool, action);
      assert.equal(perm.level, "blocked");
    });

    it(`${tool}.${action} has a reason`, () => {
      const perm = checkPermission(tool, action);
      assert.ok(perm.reason.length > 0);
    });
  }
});

describe("Edge cases", () => {
  it("unknown action defaults to OPEN", () => {
    const perm = checkPermission("apple_volume", "nonexistent_action");
    assert.equal(perm.level, "open");
  });

  it("unknown tool defaults to OPEN", () => {
    const perm = checkPermission("apple_fake", "fake_action");
    assert.equal(perm.level, "open");
  });
});
