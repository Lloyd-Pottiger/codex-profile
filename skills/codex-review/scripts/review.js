#!/usr/bin/env node

const { execFileSync, spawn } = require("node:child_process");
const path = require("node:path");
const readline = require("node:readline");

const USAGE = 'Usage: node review.js [--cwd <dir>] "<review-prompt>"';
const OUTPUT_FLUSH_INTERVAL_MS = 2 * 60 * 1000;

const { prompt, cwd } = parseArgs();
const reviewPrompt = buildReviewPrompt();
const server = spawn("codex", ["app-server"], {
  stdio: ["pipe", "pipe", "pipe"],
  cwd,
});

server.stderr.resume();

const state = {
  threadId: null,
  turnId: null,
  turnRequested: false,
  turnStarted: false,
  turnStartedAt: null,
  interruptRequested: false,
  interruptPending: false,
  interruptTimer: null,
  shutdownTimer: null,
  wroteBlock: false,
  lastCommentary: null,
  outputBuffer: [],
  outputFlushTimer: null,
};

server.on("error", (err) => {
  console.error(`failed to start codex app-server: ${err.message}`);
  process.exit(1);
});

server.on("close", (code, signal) => {
  flushOutput();
  clearTimer("shutdownTimer");
  clearTimer("interruptTimer");
  process.exitCode ??= typeof code === "number" ? code : signal ? 1 : 0;
});

process.on("SIGINT", () => {
  recordExitCode(1);
  flushOutput();
  scheduleInterrupt();
});

process.on("SIGTERM", () => {
  recordExitCode(1);
  flushOutput();
  shutdown(true);
});

readline.createInterface({ input: server.stdout }).on("line", onServerLine);

send("initialize", {
  clientInfo: {
    name: "review-script",
    title: "Review Script",
    version: "0.1.0",
  },
}, 0);
send("initialized", {});
send(
  "thread/start",
  {
    cwd,
    approvalPolicy: "never",
    ephemeral: true,
    sandbox: "danger-full-access",
  },
  1,
);

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 1 && (args[0] === "-h" || args[0] === "--help")) {
    console.error(USAGE);
    process.exit(0);
  }

  let cwdArg = null;
  const promptParts = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--cwd") {
      cwdArg = args[++i] ?? "";
    } else if (arg.startsWith("--cwd=")) {
      cwdArg = arg.slice("--cwd=".length);
    } else {
      promptParts.push(arg);
    }
  }

  const parsedPrompt = promptParts.join(" ").trim();
  if (!parsedPrompt || cwdArg?.trim() === "") {
    console.error(USAGE);
    process.exit(1);
  }

  return {
    prompt: parsedPrompt,
    cwd: cwdArg ? path.resolve(cwdArg) : process.cwd(),
  };
}

function buildReviewPrompt() {
  return `
# Review guidelines:

You are acting as a reviewer for a proposed code change made by another engineer.

Review the change and respond in normal Markdown. Do not return JSON, XML, a findings object, or any structured review schema.

Below are some default guidelines for determining whether the original author would appreciate the issue being flagged.
These are not the final word in determining whether an issue is a bug. In many cases, you will encounter other, more specific guidelines. These may be present elsewhere in a developer message, a user message, a file, or even elsewhere in this message.
Those guidelines should be considered to override these general instructions.

Here are the general guidelines for determining whether something is a bug and should be flagged.

1. It meaningfully impacts the accuracy, performance, security, or maintainability of the code.
2. The bug is discrete and actionable (i.e. not a general issue with the codebase or a combination of multiple issues).
3. Fixing the bug does not demand a level of rigor that is not present in the rest of the codebase (e.g. one doesn't need very detailed comments and input validation in a repository of one-off scripts in personal projects)
4. The bug was introduced in the commit (pre-existing bugs should not be flagged).
5. The author of the original PR would likely fix the issue if they were made aware of it.
6. The bug does not rely on unstated assumptions about the codebase or author's intent.
7. It is not enough to speculate that a change may disrupt another part of the codebase, to be considered a bug, one must identify the other parts of the code that are provably affected.
8. The bug is clearly not just an intentional change by the original author.

When flagging a bug, you will also provide an accompanying comment. Once again, these guidelines are not the final word on how to construct a comment -- defer to any other guidelines that you encounter.

1. The comment should be clear about why the issue is a bug.
2. The comment should appropriately communicate the severity of the issue. It should not claim that an issue is more severe than it actually is.
3. The comment should be brief. The body should be at most 1 paragraph. It should not introduce line breaks within the natural language flow unless it is necessary for the code fragment.
4. The comment should not include any chunks of code longer than 3 lines. Any code chunks should be wrapped in markdown inline code tags or a code block.
5. The comment should clearly and explicitly communicate the scenarios, environments, or inputs that are necessary for the bug to arise. The comment should immediately indicate that the issue's severity depends on these factors.
6. The comment's tone should be matter-of-fact and not accusatory or overly positive. It should read as a helpful AI assistant suggestion without sounding too much like a human reviewer.
7. The comment should be written such that the original author can immediately grasp the idea without close reading.
8. The comment should avoid excessive flattery and comments that are not helpful to the original author. The comment should avoid phrasing like "Great job ...", "Thanks for ...".

Below are some more detailed guidelines that you should apply to this specific review.

HOW MANY FINDINGS TO RETURN:

Output all findings that the original author would fix if they knew about it. If there is no finding that a person would definitely love to see and fix, prefer outputting no findings. Do not stop at the first qualifying finding. Continue until you've listed every qualifying finding.

GUIDELINES:

- Ignore trivial style unless it obscures meaning or violates documented standards.
- Use one comment per distinct issue (or a multi-line range if necessary).
- Use \`\`\`suggestion blocks ONLY for concrete replacement code (minimal lines; no commentary inside the block).
- In every \`\`\`suggestion block, preserve the exact leading whitespace of the replaced lines (spaces vs tabs, number of spaces).
- Do NOT introduce or remove outer indentation levels unless that is the actual fix.

FORMATTING GUIDELINES:

When you call out an issue, include the relevant file and line or function in prose, explain the scenario where it matters, and keep the explanation concise.
At the beginning of the finding title, tag the bug with priority level. For example "[P1] Un-padding slices along wrong tensor dimensions".
[P0] – Drop everything to fix.  Blocking release, operations, or major usage. Only use for universal issues that do not depend on any assumptions about the inputs.
[P1] – Urgent. Should be addressed in the next cycle
[P2] – Normal. To be fixed eventually
[P3] – Low. Nice to have.

If there are no actionable issues, say that directly and briefly.

PRINCIPLES:

- You are the final reviewer. You MUST NOT delegate your review work to another agent or skill like codex-review, as you are the one to do it.
- Do not ask any questions, as the user is not present to answer them.

## My request for Codex:
${prompt}`;
}

function onServerLine(line) {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }

  printError(msg);
  if ((msg.id === 1 || msg.id === 2 || msg.id === 3) && msg.error) {
    recordExitCode(1);
    shutdown();
    return;
  }

  if (msg.id === 1 && msg.result?.thread?.id) {
    const result = msg.result;
    block([
      result.thread?.cliVersion
        ? `OpenAI Codex v${result.thread.cliVersion}`
        : "OpenAI Codex",
      "--------",
      `workdir: ${result.cwd || cwd}`,
      `model: ${result.model || "unknown"}`,
      `reasoning effort: ${result.reasoningEffort || "none"}`,
      "--------",
    ].join("\n"));
    state.threadId = state.threadId ?? msg.result.thread.id;
    startTurn();
    return;
  }
  if (msg.id === 2 && msg.result?.turn?.id) {
    noteTurn(msg.result.turn.id, false);
    return;
  }

  const p = msg.params ?? {};
  switch (msg.method) {
    case "thread/started":
      if (!state.threadId && p.thread?.id) {
        state.threadId = p.thread.id;
        startTurn();
      }
      break;
    case "turn/started":
      if (
        typeof p.threadId === "string" &&
        p.threadId &&
        (!state.threadId || state.threadId === p.threadId) &&
        typeof p.turn?.id === "string" &&
        p.turn.id
      ) {
        state.threadId = p.threadId;
        noteTurn(p.turn.id, true);
      }
      break;
    case "item/completed":
      printItem(p.item);
      break;
    case "turn/completed":
      completeTurn(p.turn);
      break;
  }
}

function printError(msg) {
  const error =
    msg.error?.message ||
    msg.error ||
    (msg.method === "error" && (msg.params?.error?.message || msg.params?.error));
  if (typeof error === "string" && error.trim()) {
    process.stderr.write(`${error}\n`);
  }
}

function startTurn() {
  if (state.turnRequested || !state.threadId) {
    return;
  }
  state.turnRequested = true;
  send(
    "turn/start",
    {
      threadId: state.threadId,
      input: [{ type: "text", text: reviewPrompt }],
      cwd,
    },
    2,
  );
}

function noteTurn(turnId, started) {
  state.turnId = turnId;
  state.turnStarted = started;
  state.turnStartedAt = state.turnStartedAt ?? Date.now();
  if (state.interruptPending) {
    state.interruptPending = false;
    scheduleInterrupt();
  }
}

function printItem(item) {
  if (
    item?.type !== "agentMessage" ||
    typeof item.text !== "string" ||
    !item.text.trim()
  ) {
    return;
  }

  if (item.phase === "commentary") {
    printCommentary(item.text);
  } else {
    block(item.text);
  }
}

function completeTurn(turn) {
  if (!state.turnRequested) {
    return;
  }

  state.turnStarted = false;
  state.turnId = null;
  state.turnStartedAt = null;
  state.lastCommentary = null;

  if (turn?.status && turn.status !== "completed") {
    recordExitCode(1);
    printError({ error: turn.error });
  } else {
    recordExitCode(0);
  }
  shutdown();
}

function printCommentary(text) {
  const trimmed = typeof text === "string" ? text.trim() : "";
  const header =
    trimmed.match(/\*\*([\s\S]*?)\*\*/)?.[1]?.trim() ||
    trimmed.split(/\r?\n/).find((line) => line.trim())?.trim();
  if (!header || header === state.lastCommentary) {
    return;
  }

  state.lastCommentary = header;
  const seconds = state.turnStartedAt
    ? Math.floor((Date.now() - state.turnStartedAt) / 1000)
    : 0;
  const minutes = Math.floor(seconds / 60);
  const elapsed =
    seconds < 60
      ? `${seconds}s`
      : minutes < 60
        ? `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`
        : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(
            2,
            "0",
          )}m ${String(seconds % 60).padStart(2, "0")}s`;
  block(`@${elapsed}: ${header}`);
}

function scheduleInterrupt() {
  setImmediate(() => {
    if (state.interruptRequested) {
      return;
    } else if (requestInterrupt()) {
      return;
    } else if (state.turnRequested || state.threadId) {
      state.interruptPending = true;
    } else {
      shutdown(true);
    }
  });
}

// buffer output and flush every X minutes, so that agents will not be frequently awaken up,
// reduce token usage.
function flushOutput() {
  clearTimer("outputFlushTimer");
  if (state.outputBuffer.length === 0) {
    return;
  }

  process.stdout.write(state.outputBuffer.join(""));
  state.outputBuffer = [];
}

function requestInterrupt() {
  if (
    !state.threadId ||
    !state.turnId ||
    !state.turnStarted ||
    state.interruptRequested
  ) {
    return false;
  }

  state.interruptRequested = true;
  send("turn/interrupt", { threadId: state.threadId, turnId: state.turnId }, 3);
  state.interruptTimer = setTimeout(() => shutdown(true), 10000);
  state.interruptTimer.unref();
  return true;
}

function shutdown(resetTimer = false) {
  flushOutput();
  clearTimer("interruptTimer");
  if (resetTimer) {
    clearTimer("shutdownTimer");
  }
  if (state.shutdownTimer) {
    return;
  }

  if (!server.stdin.destroyed) {
    server.stdin.end();
  }
  state.shutdownTimer = setTimeout(() => {
    if (server.exitCode === null && server.signalCode === null) {
      server.kill("SIGTERM");
      setTimeout(() => {
        if (server.exitCode === null && server.signalCode === null) {
          server.kill("SIGKILL");
        }
      }, 1000).unref();
    }
  }, 1500);
  state.shutdownTimer.unref();
}

function clearTimer(name) {
  if (state[name]) {
    clearTimeout(state[name]);
    state[name] = null;
  }
}

function recordExitCode(code) {
  process.exitCode = Math.max(process.exitCode ?? 0, code);
}

function block(text) {
  if (state.wroteBlock) {
    state.outputBuffer.push("\n");
  }
  state.outputBuffer.push(text.endsWith("\n") ? text : `${text}\n`);
  state.wroteBlock = true;
  scheduleOutputFlush();
}

function scheduleOutputFlush() {
  if (state.outputFlushTimer || state.outputBuffer.length === 0) {
    return;
  }

  state.outputFlushTimer = setTimeout(() => {
    state.outputFlushTimer = null;
    flushOutput();
  }, OUTPUT_FLUSH_INTERVAL_MS);
  state.outputFlushTimer.unref();
}

function send(method, params, id) {
  const message = { method };
  if (id !== undefined) message.id = id;
  if (params !== undefined) message.params = params;
  server.stdin.write(`${JSON.stringify(message)}\n`);
}
