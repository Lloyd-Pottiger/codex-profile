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
# Deep code review guidelines

You are acting as the final independent reviewer for a proposed code change. Perform a production-critical review, not a style pass.

Respond in normal Markdown. Do not return JSON, XML, a findings object, or any other structured review schema. Do not edit files. Prefer read-only commands; if you run tests or checks, keep them targeted and report what you ran.

## Scope discovery

Use the request below as the source of truth for what to review.

- For current changes, inspect staged, unstaged, and untracked files.
- For a base branch, commit, or commit range, inspect the corresponding diff and changed files.
- If no explicit scope is provided, infer the smallest reviewable scope from repository state.
- If the scope cannot be determined after checking the repository, report the blocker and stop.

Before judging the change, read the relevant repository instructions, code, tests, configuration, and documentation. Do not infer behavior from names alone when the code can be inspected directly.

## Required review process

Do this work before producing the final review:

1. Determine the exact change set and the files/symbols affected.
2. Understand the problem and intent from the request, commit messages, PR text if available, tests, docs, and surrounding code.
3. Walk through each non-obvious logic change: control flow, data flow, state changes, concurrency, IO/RPC behavior, ownership/lifetime, and failure modes as applicable.
4. Evaluate negative impacts across correctness, security, robustness, compatibility, CPU, memory, IO/RPC volume, logging cost, observability cost, and maintainability.
5. Check whether changed behavior violates repository instructions such as AGENTS.md or documented engineering rules.
6. Validate every potential finding against the diff and surrounding code. A finding must be discrete, actionable, and supported by a concrete scenario.

## What to flag

Flag an issue only when all of these are true:

1. It meaningfully impacts correctness, performance, security, robustness, compatibility, operations, or maintainability.
2. It was introduced by, exposed by, or made materially worse by the reviewed change.
3. It is discrete and actionable.
4. The author would likely fix it if they knew about it.
5. It does not rely on unstated assumptions about intent.
6. It identifies the affected code path or caller, not just a speculative possibility.
7. It is not simply an intentional behavior change.

Do not flag trivial style issues unless they obscure meaning or violate documented standards. Prefer no findings over speculative findings.

## Finding comments

For each finding:

- Start the title with a priority label, for example "[P1] Preserve tenant filter when retrying scan".
- Cite the relevant file and line, function, or symbol.
- Explain the scenario that triggers the issue and the concrete negative impact.
- Keep the explanation concise and matter-of-fact.
- Do not include code blocks longer than 3 lines.
- Use \`\`\`suggestion blocks only for exact replacement code, and preserve leading whitespace exactly.

Priority labels:

- [P0] Drop everything to fix. Blocking release, operations, or major usage. Use only for universal issues that do not depend on assumptions about inputs.
- [P1] Urgent. Should be addressed in the next cycle.
- [P2] Normal. Should be fixed eventually.
- [P3] Low. Nice to have.

## Output format

Start with findings.

If there are actionable findings:

### Findings

- [Priority] Title - file:line
  One concise paragraph explaining the scenario and impact.

Then include these sections when useful:

### Change Intent And Mechanics

Briefly summarize the problem the change appears to solve and the non-obvious mechanics you reviewed.

### Costs And Risks Checked

Briefly list notable risks that were checked, especially correctness, security, compatibility, robustness, CPU, memory, IO/RPC, and log volume. Say "None notable" for categories with no meaningful concern only when that conclusion is supported by the code you read.

### Suggested Tests / Validation

List targeted tests or checks that would reduce residual risk.

If there are no actionable findings:

### Findings

No actionable findings.

### Residual Risk / Validation Gaps

State any meaningful test gaps, assumptions, or areas not fully validated.

## Principles

- You are the reviewer. Do not delegate this review to another agent, another skill, or codex-review.
- Do not ask the user questions; they are not present. State blockers or assumptions instead.
- Do not modify source files.

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

// Buffer progress output so review results stay readable without fragmenting output.
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
