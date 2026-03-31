import { z } from "zod";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { setTimeout } from "node:timers/promises";
import { runAppleScript, runShell, safeAS } from "../executor.js";
import type { DomainModule } from "../types.js";

const DRAFTS_FILE = "/tmp/occ_tweet_drafts.json";

interface Draft {
  text: string;
  saved_at: string;
}

function loadDrafts(): Draft[] {
  if (!existsSync(DRAFTS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(DRAFTS_FILE, "utf-8")) as Draft[];
  } catch {
    return [];
  }
}

function saveDrafts(drafts: Draft[]): void {
  // Keep last 20 drafts
  const trimmed = drafts.slice(-20);
  writeFileSync(DRAFTS_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
}

const domain: DomainModule = {
  name: "apple_twitter",
  description:
    "Control X/Twitter via Safari. Actions: post, draft, save, list_drafts, post_draft, reply, like, retweet, feed, notifications, dm_check.",
  actions: {
    post: {
      description:
        "Post a tweet on X/Twitter via Safari (requires Safari logged into X with JS from Apple Events enabled)",
      params: z.object({
        text: z.string().describe("Tweet text (max 280 chars)"),
        auto_send: z
          .boolean()
          .optional()
          .describe("Auto-click Post button (default true)"),
      }),
      handler: async (p) => {
        const text = (p.text as string).slice(0, 280);
        const autoSend = p.auto_send !== false;
        const encoded = encodeURIComponent(text);
        const url = `https://x.com/intent/post?text=${encoded}`;

        const openR = await runAppleScript(
          `tell application "Safari"\n` +
            `  activate\n` +
            `  open location "${safeAS(url)}"\n` +
            `end tell`,
        );
        if (!openR.ok) return `Error opening Safari: ${openR.output}`;

        if (!autoSend) {
          return "Tweet compose opened — click Post to publish";
        }

        // Wait for page load
        await setTimeout(3000);

        // Click the Post button
        const clickR = await runAppleScript(
          `tell application "Safari"\n` +
            `  set js to "var btn = document.querySelector('[data-testid=tweetButton]'); btn ? (btn.click(), 'ok') : 'not found'"\n` +
            `  return do JavaScript js in current tab of window 1\n` +
            `end tell`,
        );

        if (clickR.ok && clickR.output === "ok") {
          await setTimeout(2000);
          // Close the X tab
          await runAppleScript(
            'tell application "Safari" to close current tab of window 1',
          );
          return `Tweet posted: "${text.slice(0, 80)}"`;
        }
        return "Tweet composed but not posted (button not found) — post manually";
      },
      timeout: 15_000,
    },
    draft: {
      description:
        "Create a tweet and save it as an X native draft (opens compose, types, closes, saves)",
      params: z.object({
        text: z.string().describe("Tweet text (max 280 chars)"),
      }),
      handler: async (p) => {
        const text = (p.text as string).slice(0, 280);

        // Step 1: Open compose
        await runAppleScript(
          `tell application "Safari"\n` +
            `  activate\n` +
            `  open location "https://x.com/compose/post"\n` +
            `end tell`,
        );
        await setTimeout(4000);

        // Step 2: Type via pbcopy + cmd+v (handles all characters)
        await runShell(`echo -n ${JSON.stringify(text)} | pbcopy`);
        await setTimeout(300);
        await runAppleScript(
          'tell application "System Events" to keystroke "v" using command down',
        );
        await setTimeout(1000);

        // Step 3: Click Close button
        await runAppleScript(
          `tell application "Safari"\n` +
            `  return do JavaScript "var btns = document.querySelectorAll('button[aria-label=Close]'); btns.length > 0 ? (btns[0].click(), 'ok') : 'none'" in current tab of window 1\n` +
            `end tell`,
        );
        await setTimeout(2000);

        // Step 4: Click Save (retry up to 3 times)
        let saved = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          const saveR = await runAppleScript(
            `tell application "Safari"\n` +
              `  return do JavaScript "var items = document.querySelectorAll('[role=menuitem], [role=button]'); var saved = false; items.forEach(function(i){ if(i.textContent.trim() === 'Save' && !saved){i.click(); saved = true;}}); saved ? 'saved' : 'not found'" in current tab of window 1\n` +
              `end tell`,
          );
          if (saveR.ok && saveR.output === "saved") {
            saved = true;
            break;
          }
          await setTimeout(1000);
        }

        await setTimeout(1000);

        // Step 5: Always close the tab
        await runAppleScript(
          'tell application "Safari" to close current tab of window 1',
        );

        return saved
          ? "Tweet saved to your X drafts"
          : "Tweet composed but not saved — check your X drafts";
      },
      timeout: 20_000,
    },
    save: {
      description:
        "Save the current tweet being composed in Safari to a local drafts file",
      handler: async () => {
        // Read text from the compose box
        const readR = await runAppleScript(
          `tell application "Safari"\n` +
            `  set jsCode to "var el = document.querySelector('div[data-testid=tweetTextarea_0]'); el ? el.textContent : ''"\n` +
            `  return do JavaScript jsCode in current tab of window 1\n` +
            `end tell`,
        );

        if (!readR.ok || !readR.output?.trim()) {
          return "No tweet currently being composed in Safari";
        }

        const text = readR.output.trim();

        // Save to drafts file
        const drafts = loadDrafts();
        drafts.push({ text, saved_at: new Date().toISOString() });
        saveDrafts(drafts);

        // Close the compose modal
        await runAppleScript(
          `tell application "Safari"\n` +
            `  set jsCode to "var close = document.querySelector('[data-testid=app-bar-close]') || document.querySelector('[aria-label=Close]'); close ? (close.click(), 'closed') : ''"\n` +
            `  do JavaScript jsCode in current tab of window 1\n` +
            `end tell`,
        );
        await setTimeout(500);

        return `Tweet saved (${text.length} chars) — use list_drafts to view, post_draft to post`;
      },
    },
    list_drafts: {
      description: "List locally saved tweet drafts",
      handler: async () => {
        const drafts = loadDrafts();
        if (drafts.length === 0) return "No saved drafts";

        const lines = [`Saved tweets (${drafts.length}):`, ""];
        for (let i = 0; i < drafts.length; i++) {
          const d = drafts[i];
          const text = d.text.slice(0, 100);
          const ts = d.saved_at.slice(0, 16);
          lines.push(`${i + 1}. [${ts}] "${text}"`);
        }
        return lines.join("\n");
      },
    },
    post_draft: {
      description: "Post a saved draft by number",
      params: z.object({
        num: z.number().describe("Draft number to post"),
      }),
      handler: async (p) => {
        const num = p.num as number;
        const drafts = loadDrafts();
        if (drafts.length === 0) return "No drafts";

        const idx = num - 1;
        if (idx < 0 || idx >= drafts.length) {
          return `Draft #${num} not found (you have ${drafts.length} drafts)`;
        }

        const text = drafts[idx].text;
        if (!text) return "Draft is empty";

        // Post the draft (reuse post logic)
        const encoded = encodeURIComponent(text.slice(0, 280));
        const url = `https://x.com/intent/post?text=${encoded}`;

        const openR = await runAppleScript(
          `tell application "Safari"\n` +
            `  activate\n` +
            `  open location "${safeAS(url)}"\n` +
            `end tell`,
        );
        if (!openR.ok) return `Error: ${openR.output}`;

        await setTimeout(3000);

        const clickR = await runAppleScript(
          `tell application "Safari"\n` +
            `  set js to "var btn = document.querySelector('[data-testid=tweetButton]'); btn ? (btn.click(), 'ok') : 'not found'"\n` +
            `  return do JavaScript js in current tab of window 1\n` +
            `end tell`,
        );

        let result: string;
        if (clickR.ok && clickR.output === "ok") {
          await setTimeout(2000);
          await runAppleScript(
            'tell application "Safari" to close current tab of window 1',
          );
          result = `Draft #${num} posted: "${text.slice(0, 80)}"`;
        } else {
          result =
            "Tweet composed but not posted (button not found) — post manually";
        }

        // Remove from drafts
        drafts.splice(idx, 1);
        saveDrafts(drafts);

        return result;
      },
      timeout: 15_000,
    },
    reply: {
      description: "Open a reply to a specific tweet",
      params: z.object({
        tweet_url: z
          .string()
          .describe("URL of the tweet to reply to (or tweet ID)"),
        text: z.string().describe("Reply text"),
      }),
      handler: async (p) => {
        const tweetUrl = p.tweet_url as string;
        const text = p.text as string;
        const tweetId = tweetUrl.includes("/")
          ? tweetUrl.split("/").pop()
          : tweetUrl;
        const encoded = encodeURIComponent(text);
        const url = `https://x.com/intent/post?in_reply_to=${tweetId}&text=${encoded}`;

        const r = await runAppleScript(
          `tell application "Safari"\n` +
            `  activate\n` +
            `  open location "${safeAS(url)}"\n` +
            `end tell`,
        );
        return r.ok ? "Reply composed" : `Error: ${r.output}`;
      },
    },
    like: {
      description: "Like the current tweet visible in Safari",
      handler: async () => {
        const r = await runAppleScript(
          `tell application "Safari"\n` +
            `  set jsCode to "var btns = document.querySelectorAll('button[aria-label]'); var liked = false; btns.forEach(function(b){ if(b.getAttribute('aria-label') && b.getAttribute('aria-label').match(/like|aimer/i) && !liked){ b.click(); liked = true; }}); liked ? 'liked' : 'not found';"\n` +
            `  return do JavaScript jsCode in current tab of window 1\n` +
            `end tell`,
        );
        return r.ok && r.output?.includes("liked")
          ? "Liked"
          : "Not on a tweet or already liked";
      },
    },
    retweet: {
      description: "Retweet/repost the current tweet visible in Safari",
      handler: async () => {
        const r = await runAppleScript(
          `tell application "Safari"\n` +
            `  set jsCode to "var btns = document.querySelectorAll('button[aria-label]'); var found = false; btns.forEach(function(b){ if(b.getAttribute('aria-label') && b.getAttribute('aria-label').match(/repost|retweet/i) && !found){ b.click(); found = true; }}); found ? 'clicked' : 'not found';"\n` +
            `  return do JavaScript jsCode in current tab of window 1\n` +
            `end tell`,
        );
        return r.ok && r.output?.includes("clicked")
          ? "Repost menu opened — confirm manually"
          : "Not on a tweet";
      },
    },
    feed: {
      description: "Get the latest tweets from the X timeline",
      handler: async () => {
        // Check if already on X
        const urlR = await runAppleScript(
          'tell application "Safari" to get URL of current tab of window 1',
        );
        if (!(urlR.ok && urlR.output?.includes("x.com"))) {
          await runAppleScript(
            `tell application "Safari"\n` +
              `  activate\n` +
              `  open location "https://x.com/home"\n` +
              `end tell`,
          );
          await setTimeout(5000);
        }

        // Retry loop — X loads tweets dynamically
        const script =
          `tell application "Safari"\n` +
          `  set jsCode to "var tweets = document.querySelectorAll('article div[lang]'); var r = ''; for(var i=0; i<Math.min(tweets.length,8); i++){ r += (i+1) + '. ' + tweets[i].textContent.substring(0,150) + String.fromCharCode(10) + String.fromCharCode(10); } r;"\n` +
          `  return do JavaScript jsCode in current tab of window 1\n` +
          `end tell`;

        for (let attempt = 0; attempt < 3; attempt++) {
          const r = await runAppleScript(script);
          if (r.ok && r.output) {
            return `X Timeline:\n\n${r.output.slice(0, 2000)}`;
          }
          await setTimeout(2000);
        }

        return "Unable to read X feed (page not loaded)";
      },
      timeout: 20_000,
    },
    notifications: {
      description: "Check X notification count",
      handler: async () => {
        const r = await runAppleScript(
          `tell application "Safari"\n` +
            `  set js to "document.querySelector('[data-testid=AppTabBar_Notifications_Link] [dir]')?.textContent || '0'"\n` +
            `  return do JavaScript js in current tab of window 1\n` +
            `end tell`,
        );
        if (r.ok) {
          return `X notifications: ${r.output === "0" ? "none" : r.output}`;
        }
        return "Unable to read notifications";
      },
    },
    dm_check: {
      description: "Check X DM count",
      handler: async () => {
        const r = await runAppleScript(
          `tell application "Safari"\n` +
            `  set js to "document.querySelector('[data-testid=AppTabBar_DirectMessage_Link] [dir]')?.textContent || '0'"\n` +
            `  return do JavaScript js in current tab of window 1\n` +
            `end tell`,
        );
        if (r.ok) {
          return `X DMs: ${r.output === "0" ? "none" : r.output}`;
        }
        return "Unable to read DMs";
      },
    },
  },
};

export default domain;
