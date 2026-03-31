/**
 * Tests for executor.ts pure functions: safeAS, safeAppName, safePath, safeSQL
 *
 * Run: npm test
 * Requires: npm run build (imports from dist/)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeAS, safeAppName, safePath, safeSQL } from "../dist/executor.js";

// ══════════════════════════════════════════════════════════════════
// safeAS — AppleScript string escaping
// ══════════════════════════════════════════════════════════════════

describe("safeAS", () => {
  it("escapes backslashes", () => {
    assert.equal(safeAS("path\\to\\file"), "path\\\\to\\\\file");
  });

  it("escapes double quotes", () => {
    assert.equal(safeAS('say "hello"'), 'say \\"hello\\"');
  });

  it("strips null bytes", () => {
    assert.equal(safeAS("hello\0world"), "helloworld");
  });

  it("handles combined escapes", () => {
    assert.equal(safeAS('a\\b"c\0d'), 'a\\\\b\\"cd');
  });

  it("passes through safe strings unchanged", () => {
    assert.equal(safeAS("hello world"), "hello world");
  });

  it("handles empty string", () => {
    assert.equal(safeAS(""), "");
  });
});

// ══════════════════════════════════════════════════════════════════
// safeAppName — application name sanitization
// ══════════════════════════════════════════════════════════════════

describe("safeAppName", () => {
  it("keeps alphanumeric characters", () => {
    assert.equal(safeAppName("Safari"), "Safari");
  });

  it("keeps spaces", () => {
    assert.equal(safeAppName("Google Chrome"), "Google Chrome");
  });

  it("keeps dots and hyphens", () => {
    assert.equal(safeAppName("VS-Code.app"), "VS-Code.app");
  });

  it("keeps underscores", () => {
    assert.equal(safeAppName("my_app"), "my_app");
  });

  it("strips special characters", () => {
    assert.equal(safeAppName("App;rm -rf /"), "Apprm -rf");
  });

  it("strips shell metacharacters", () => {
    assert.equal(safeAppName("App$(whoami)"), "Appwhoami");
  });

  it("strips quotes", () => {
    assert.equal(safeAppName('App"Name\'s'), "AppNames");
  });

  it("trims whitespace", () => {
    assert.equal(safeAppName("  Safari  "), "Safari");
  });
});

// ══════════════════════════════════════════════════════════════════
// safePath — path validation and sanitization
// ══════════════════════════════════════════════════════════════════

describe("safePath", () => {
  // Blocked system paths
  it("blocks /System", () => {
    assert.equal(safePath("/System/Library/Fonts"), null);
  });

  it("blocks /usr", () => {
    assert.equal(safePath("/usr/local/bin/node"), null);
  });

  it("blocks /bin", () => {
    assert.equal(safePath("/bin/sh"), null);
  });

  it("blocks /sbin", () => {
    assert.equal(safePath("/sbin/mount"), null);
  });

  it("blocks /private/var", () => {
    assert.equal(safePath("/private/var/db/something"), null);
  });

  it("blocks /Library/LaunchDaemons", () => {
    assert.equal(safePath("/Library/LaunchDaemons/evil.plist"), null);
  });

  it("blocks /Library/LaunchAgents", () => {
    assert.equal(safePath("/Library/LaunchAgents/evil.plist"), null);
  });

  // Allowed paths
  it("allows /tmp", () => {
    assert.equal(safePath("/tmp/test.txt"), "/tmp/test.txt");
  });

  it("allows /Users paths", () => {
    const result = safePath("/Users/testuser/Documents/file.txt");
    assert.equal(result, "/Users/testuser/Documents/file.txt");
  });

  it("allows /Volumes paths", () => {
    const result = safePath("/Volumes/nvme/data");
    assert.equal(result, "/Volumes/nvme/data");
  });

  // Edge cases
  it("returns null for empty string", () => {
    assert.equal(safePath(""), null);
  });

  it("expands ~ to home directory", () => {
    const result = safePath("~/Documents/test.txt");
    assert.ok(result !== null);
    assert.ok(!result.startsWith("~"), "should not start with ~");
    assert.ok(result.endsWith("/Documents/test.txt"));
  });

  it("resolves relative paths to absolute", () => {
    const result = safePath("relative/path");
    assert.ok(result !== null);
    assert.ok(result.startsWith("/"), "should be absolute");
  });
});

// ══════════════════════════════════════════════════════════════════
// safeSQL — SQLite query string escaping
// ══════════════════════════════════════════════════════════════════

describe("safeSQL", () => {
  it("escapes single quotes by doubling them", () => {
    assert.equal(safeSQL("O'Brien"), "O''Brien");
  });

  it("strips semicolons and DDL keywords", () => {
    assert.equal(safeSQL("value; DROP TABLE users"), "value   users");
  });

  it("strips SQL comments (--)", () => {
    assert.equal(safeSQL("value -- comment"), "value  comment");
  });

  it("strips null bytes", () => {
    assert.equal(safeSQL("hello\0world"), "helloworld");
  });

  it("limits output to 500 characters", () => {
    const long = "a".repeat(600);
    assert.equal(safeSQL(long).length, 500);
  });

  it("handles combined dangerous input", () => {
    const input = "'; DROP TABLE users;--\0";
    const result = safeSQL(input);
    assert.ok(!result.includes(";"), "should not contain semicolons");
    assert.ok(!result.includes("--"), "should not contain SQL comments");
    assert.ok(!result.includes("\0"), "should not contain null bytes");
  });

  it("passes through safe strings unchanged", () => {
    assert.equal(safeSQL("hello world 123"), "hello world 123");
  });

  it("strips UNION keyword", () => {
    const result = safeSQL("test' UNION SELECT * FROM msg");
    assert.ok(!result.includes("UNION"), "should strip UNION");
  });

  it("strips block comments", () => {
    const result = safeSQL("test /* comment */ OR 1=1");
    assert.ok(!result.includes("/*"), "should strip block comment open");
    assert.ok(!result.includes("*/"), "should strip block comment close");
  });

  it("neutralizes hex literals", () => {
    const result = safeSQL("test OR 0x31=0x31");
    assert.ok(!result.includes("0x31"), "should neutralize hex");
  });

  it("strips DDL keywords", () => {
    const result = safeSQL("DROP ALTER CREATE INSERT UPDATE DELETE");
    assert.equal(result.trim(), "");
  });
});

describe("safePath (extended)", () => {
  it("blocks /etc", () => {
    assert.equal(safePath("/etc/passwd"), null);
  });

  it("blocks /var", () => {
    assert.equal(safePath("/var/log/system.log"), null);
  });

  it("blocks /opt", () => {
    assert.equal(safePath("/opt/homebrew/bin"), null);
  });

  it("blocks /private/etc", () => {
    assert.equal(safePath("/private/etc/hosts"), null);
  });

  it("blocks /Library/Preferences", () => {
    assert.equal(safePath("/Library/Preferences/com.apple.plist"), null);
  });

  it("allows ~/Desktop", () => {
    const result = safePath("~/Desktop/file.txt");
    assert.ok(result !== null);
    assert.ok(result.includes("Desktop"));
  });
});
