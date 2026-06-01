#!/usr/bin/env node

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

const ROOT = "C:\\Users\\HP\\Desktop\\Basis VPS\\Jobs scraper\\Jobs scraper";
const EVER_JOBS_DIR = join(ROOT, "ever-jobs");
const BOTA_SCRIPT = join(ROOT, "bota_scraper.py");
const REPORT_DIR = join(process.cwd(), "tmp", "board-audit");

const PLAYWRIGHT_BOARDS = new Set([
  "simplyhired",
  "wellfound",
  "monster",
  "dice",
  "stepstone",
  "careerbuilder",
]);

const BOTA_BOARDS = new Set(["indeed", "glassdoor", "zip_recruiter", "naukri"]);

const FREE_ZERO_CONFIG_BOARDS = [
  "linkedin",
  "remotive",
  "weworkremotely",
  "himalayas",
  "arbeitnow",
  "themuse",
  "workingnomads",
  "builtin",
  "landingjobs",
  "virtualvocations",
  "powertofly",
  "freelancercom",
  "hackernews",
  "jobspresso",
  "realworkfromanywhere",
  "remotefirstjobs",
  "duunitori",
  "jobsch",
  "mycareersfuture",
  "habrcareer",
  "pyjobs",
  "pythonjobs",
  "golangjobs",
  "railsjobs",
  "vuejobs",
  "larajobs",
  "fossjobs",
  "devopsjobs",
  "androidjobs",
  "functionalworks",
];

const FREE_ZERO_CONFIG_SECOND_PASS_BOARDS = [
  "workingnomads",
  "virtualvocations",
  "powertofly",
  "freelancercom",
  "realworkfromanywhere",
  "duunitori",
  "mycareersfuture",
  "habrcareer",
  "golangjobs",
  "vuejobs",
  "fossjobs",
  "devopsjobs",
  "androidjobs",
];

const FEED_STYLE_BOARDS = new Set([
  "virtualvocations",
  "powertofly",
  "realworkfromanywhere",
  "golangjobs",
  "vuejobs",
  "fossjobs",
  "devopsjobs",
  "androidjobs",
]);

const USED_BOARDS = [
  "linkedin",
  "indeed",
  "google",
  "remotive",
  "arbeitnow",
  "weworkremotely",
  "glassdoor",
  "zip_recruiter",
  "naukri",
  "jobsdb",
  "himalayas",
  "workingnomads",
  "themuse",
  "builtin",
  "landingjobs",
  "virtualvocations",
  "powertofly",
  "freelancercom",
  "realworkfromanywhere",
  "remotefirstjobs",
  "jobspresso",
  "nodesk",
  "fourdayweek",
  "startupjobs",
  "getonboard",
  "simplyhired",
  "wellfound",
  "monster",
  "dice",
  "stepstone",
  "careerbuilder",
];

const PROFILES = {
  india_marketing: {
    searchTerm: "marketing manager",
    country: "INDIA",
    location: "India",
    days: 30,
    hoursOld: 30 * 24,
    resultsWanted: 3,
  },
  global_smoke: {
    searchTerm: "software engineer",
    country: "USA",
    location: "United States",
    days: 14,
    hoursOld: 14 * 24,
    resultsWanted: 3,
  },
};

const BOARD_SPECIFIC_PROFILES = {
  workingnomads: {
    searchTerm: "python engineer",
    country: "USA",
    location: "Remote",
    days: 30,
    hoursOld: 30 * 24,
    resultsWanted: 3,
  },
  virtualvocations: {
    searchTerm: "software developer",
    country: "USA",
    location: "Remote",
    days: 30,
    hoursOld: 30 * 24,
    resultsWanted: 3,
  },
  powertofly: {
    searchTerm: "software engineer",
    country: "USA",
    location: "Remote",
    days: 30,
    hoursOld: 30 * 24,
    resultsWanted: 3,
  },
  freelancercom: {
    searchTerm: "full stack developer",
    country: "USA",
    location: "Remote",
    days: 30,
    hoursOld: 30 * 24,
    resultsWanted: 3,
  },
  realworkfromanywhere: {
    searchTerm: "backend engineer",
    country: "USA",
    location: "Remote",
    days: 30,
    hoursOld: 30 * 24,
    resultsWanted: 3,
  },
  duunitori: {
    searchTerm: "software engineer",
    country: "FINLAND",
    location: "Finland",
    days: 30,
    hoursOld: 30 * 24,
    resultsWanted: 3,
  },
  mycareersfuture: {
    searchTerm: "software engineer",
    country: "SINGAPORE",
    location: "Singapore",
    days: 30,
    hoursOld: 30 * 24,
    resultsWanted: 3,
  },
  habrcareer: {
    searchTerm: "backend developer",
    country: "RUSSIA",
    location: "Russia",
    days: 30,
    hoursOld: 30 * 24,
    resultsWanted: 3,
  },
  golangjobs: {
    searchTerm: "golang engineer",
    country: "USA",
    location: "Remote",
    days: 30,
    hoursOld: 30 * 24,
    resultsWanted: 3,
  },
  vuejobs: {
    searchTerm: "vue developer",
    country: "USA",
    location: "Remote",
    days: 30,
    hoursOld: 30 * 24,
    resultsWanted: 3,
  },
  fossjobs: {
    searchTerm: "open source engineer",
    country: "USA",
    location: "Remote",
    days: 30,
    hoursOld: 30 * 24,
    resultsWanted: 3,
  },
  devopsjobs: {
    searchTerm: "devops engineer",
    country: "USA",
    location: "Remote",
    days: 30,
    hoursOld: 30 * 24,
    resultsWanted: 3,
  },
  androidjobs: {
    searchTerm: "android developer",
    country: "USA",
    location: "Remote",
    days: 30,
    hoursOld: 30 * 24,
    resultsWanted: 3,
  },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const boardsArg = args.find((arg) => arg.startsWith("--boards="));
  const profileArg = args.find((arg) => arg.startsWith("--profile="));
  const fallbackArg = args.find((arg) => arg.startsWith("--fallback="));
  const presetArg = args.find((arg) => arg.startsWith("--preset="));
  const preset = presetArg?.split("=")[1] ?? "used";
  const boardSpecific = args.includes("--board-specific");
  const presetBoards =
    preset === "free_zero_config"
      ? FREE_ZERO_CONFIG_BOARDS
      : preset === "free_zero_config_second_pass"
        ? FREE_ZERO_CONFIG_SECOND_PASS_BOARDS
        : USED_BOARDS;
  const boards = boardsArg
    ? boardsArg
        .split("=")[1]
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : presetBoards;

  return {
    boards,
    profile: profileArg?.split("=")[1] ?? "india_marketing",
    fallback: fallbackArg?.split("=")[1] ?? "global_smoke",
    preset,
    boardSpecific,
  };
}

function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      continue;
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function countCsvRows(path) {
  if (!existsSync(path)) {
    return 0;
  }
  const rows = parseCsv(readFileSync(path, "utf8"));
  return Math.max(0, rows.length - 1);
}

function inspectCsv(path) {
  if (!existsSync(path)) {
    return {
      headers: [],
      sample: null,
      hasRequiredFields: {
        title: false,
        description: false,
        datePosted: false,
        location: false,
      },
    };
  }

  const rows = parseCsv(readFileSync(path, "utf8"));
  const [headerRow, firstDataRow] = rows;
  const headers = headerRow || [];
  const record = {};

  if (headerRow && firstDataRow) {
    for (let index = 0; index < headerRow.length; index += 1) {
      record[headerRow[index]] = firstDataRow[index] ?? "";
    }
  }

  return {
    headers,
    sample: firstDataRow ? record : null,
    hasRequiredFields: {
      title: headers.includes("title"),
      description: headers.includes("description"),
      datePosted: headers.includes("datePosted"),
      location: headers.includes("location"),
    },
  };
}

function detectPython() {
  const candidates = [
    process.env.JOBS_PYTHON,
    "py",
    "python",
    "python3",
    join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python311", "python.exe"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ["-c", "import botasaurus"], {
        stdio: "ignore",
        timeout: 20_000,
      });
      return candidate;
    } catch {
      // try next
    }
  }

  return null;
}

function hasPlaywrightBrowsers() {
  const browserDir = join(process.env.USERPROFILE || "", "AppData", "Local", "ms-playwright");
  return existsSync(browserDir);
}

function runEverJobsBoard(board, profile, outputCsv) {
  const payload = {
    searchTerm: profile.searchTerm,
    country: profile.country,
    location: profile.location,
    hoursOld: profile.hoursOld,
    resultsWanted: profile.resultsWanted,
    isRemote: false,
    siteType: [board],
    linkedinFetchDescription: board === "linkedin",
    proxies: process.env.JOBS_PROXY ? [process.env.JOBS_PROXY] : undefined,
  };

  const result = spawnSync(
    "node",
    ["cli-run.cjs", "search", "--stdin", "-f", "csv", "-o", outputCsv],
    {
      cwd: EVER_JOBS_DIR,
      input: JSON.stringify(payload),
      encoding: "utf8",
      timeout: 180_000,
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  return {
    exitCode: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function runEverJobsBoardWithoutSearch(board, profile, outputCsv) {
  const payload = {
    country: profile.country,
    location: profile.location,
    hoursOld: profile.hoursOld,
    resultsWanted: profile.resultsWanted,
    isRemote: true,
    siteType: [board],
    proxies: process.env.JOBS_PROXY ? [process.env.JOBS_PROXY] : undefined,
  };

  const result = spawnSync(
    "node",
    ["cli-run.cjs", "search", "--stdin", "-f", "csv", "-o", outputCsv],
    {
      cwd: EVER_JOBS_DIR,
      input: JSON.stringify(payload),
      encoding: "utf8",
      timeout: 180_000,
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  return {
    exitCode: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function resolveProfile(board, profile, boardSpecific) {
  if (!boardSpecific) {
    return profile;
  }
  return BOARD_SPECIFIC_PROFILES[board] ?? profile;
}

function runBotaBoard(board, profile, outputCsv, pythonExe) {
  const tempDir = mkdtempSync(join(tmpdir(), "board-audit-bota-"));
  const configPath = join(tempDir, "config.json");

  writeFileSync(
    configPath,
    JSON.stringify({
      searchTerm: profile.searchTerm,
      country: profile.country,
      location: profile.location,
      days: profile.days,
      resultsWanted: profile.resultsWanted,
      sites: [board],
      outputCsv,
      headless: true,
      budgetSec: 120,
    }),
    "utf8",
  );

  const result = spawnSync(pythonExe, [BOTA_SCRIPT, configPath], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 10 * 1024 * 1024,
  });

  rmSync(tempDir, { recursive: true, force: true });

  return {
    exitCode: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function extractReason(board, stderr, rowCount, exitCode, profileName, pythonExe, playwrightReady) {
  const text = `${stderr}`.toLowerCase();

  if (BOTA_BOARDS.has(board) && !pythonExe) {
    return "Botasaurus Python environment not available";
  }
  if (PLAYWRIGHT_BOARDS.has(board) && !playwrightReady) {
    return "Playwright browser binaries are not installed locally";
  }
  if (text.includes("cloudflare")) {
    return "Blocked by Cloudflare or anti-bot protection";
  }
  if (text.includes("api key")) {
    return "This source needs an API key or token";
  }
  if (text.includes("companyslug") || text.includes("company slug")) {
    return "This source needs a company slug";
  }
  if (text.includes("etimedout") || text.includes("timed out") || text.includes("timeout")) {
    return "Upstream host timed out from this machine";
  }
  if (
    text.includes("unable to connect") ||
    text.includes("econnrefused") ||
    text.includes("econnreset") ||
    text.includes("enotfound") ||
    text.includes("network is unreachable")
  ) {
    return "Upstream host is unreachable from this machine";
  }
  if (text.includes("403") || text.includes("forbidden")) {
    return "Blocked by the source host or anti-bot protection";
  }
  if (text.includes("404") || text.includes("not found")) {
    return "The upstream feed or endpoint looks moved or dead";
  }
  if (text.includes("timeout")) {
    return "Timed out while scraping";
  }
  if (exitCode && exitCode !== 0) {
    return `Command failed with exit code ${exitCode}`;
  }
  if (rowCount === 0 && profileName === "india_marketing") {
    return "No rows for the India marketing query";
  }
  if (rowCount === 0) {
    return "No rows for the smoke-test query";
  }
  return "Working";
}

function classifyResult(board, primaryRows, fallbackRows, reason) {
  if (primaryRows > 0) {
    return "working_for_use_case";
  }
  if (fallbackRows > 0) {
    return "working_but_not_for_current_query";
  }
  if (PLAYWRIGHT_BOARDS.has(board) && reason.includes("Playwright")) {
    return "needs_setup";
  }
  if (reason.includes("API key") || reason.includes("company slug") || reason.includes("Python")) {
    return "needs_setup";
  }
  return "failing_or_unreliable";
}

function main() {
  const { boards, profile, fallback, preset, boardSpecific } = parseArgs();
  const primaryProfile = PROFILES[profile];
  const fallbackProfile = PROFILES[fallback];

  if (!primaryProfile || !fallbackProfile) {
    throw new Error("Unknown profile name.");
  }

  mkdirSync(REPORT_DIR, { recursive: true });

  const pythonExe = detectPython();
  const playwrightReady = hasPlaywrightBrowsers();
  const results = [];

  for (const board of boards) {
    const boardPrimaryProfile = resolveProfile(board, primaryProfile, boardSpecific);
    const boardFallbackProfile = resolveProfile(board, fallbackProfile, boardSpecific);
    const primaryCsv = join(REPORT_DIR, `${board}-${profile}.csv`);
    const fallbackCsv = join(REPORT_DIR, `${board}-${fallback}.csv`);
    let effectiveFallbackCsv = fallbackCsv;

    let primaryRun;
    if (BOTA_BOARDS.has(board)) {
      primaryRun = pythonExe
        ? runBotaBoard(board, boardPrimaryProfile, primaryCsv, pythonExe)
        : { exitCode: 1, stdout: "", stderr: "No Python/Botasaurus environment available." };
    } else {
      primaryRun = runEverJobsBoard(board, boardPrimaryProfile, primaryCsv);
    }

    const primaryRows = countCsvRows(primaryCsv);

    let fallbackRun = { exitCode: null, stdout: "", stderr: "" };
    let fallbackRows = 0;

    if (primaryRows === 0) {
      if (BOTA_BOARDS.has(board)) {
        fallbackRun = pythonExe
          ? runBotaBoard(board, boardFallbackProfile, fallbackCsv, pythonExe)
          : { exitCode: 1, stdout: "", stderr: "No Python/Botasaurus environment available." };
      } else {
        fallbackRun = runEverJobsBoard(board, boardFallbackProfile, fallbackCsv);
      }
      fallbackRows = countCsvRows(fallbackCsv);

      if (fallbackRows === 0 && FEED_STYLE_BOARDS.has(board)) {
        const feedFallbackCsv = join(REPORT_DIR, `${board}-${fallback}-feed.csv`);
        const feedFallbackRun = runEverJobsBoardWithoutSearch(
          board,
          boardFallbackProfile,
          feedFallbackCsv,
        );
        const feedRows = countCsvRows(feedFallbackCsv);
        if (feedRows > fallbackRows) {
          fallbackRun = feedFallbackRun;
          fallbackRows = feedRows;
          effectiveFallbackCsv = feedFallbackCsv;
        }
      }
    }

    const reason = extractReason(
      board,
      [primaryRun.stderr, fallbackRun.stderr].filter(Boolean).join("\n"),
      primaryRows || fallbackRows,
      primaryRun.exitCode ?? fallbackRun.exitCode,
      profile,
      pythonExe,
      playwrightReady,
    );

    const status = classifyResult(board, primaryRows, fallbackRows, reason);
    const primaryInspection = inspectCsv(primaryCsv);
    const fallbackInspection = inspectCsv(effectiveFallbackCsv);

    results.push({
      board,
      engine: BOTA_BOARDS.has(board) ? "botasaurus" : "ever_jobs",
      status,
      primaryProfile: profile,
      primaryProfileInput: boardPrimaryProfile,
      primaryRows,
      fallbackProfile: fallback,
      fallbackProfileInput: boardFallbackProfile,
      fallbackRows,
      reason,
      primaryExitCode: primaryRun.exitCode,
      fallbackExitCode: fallbackRun.exitCode,
      primaryErrorPreview: primaryRun.stderr.slice(0, 300),
      fallbackErrorPreview: fallbackRun.stderr.slice(0, 300),
      primaryHeaders: primaryInspection.headers,
      fallbackHeaders: fallbackInspection.headers,
      requiredFieldCoverage: {
        title: primaryInspection.hasRequiredFields.title || fallbackInspection.hasRequiredFields.title,
        description:
          primaryInspection.hasRequiredFields.description || fallbackInspection.hasRequiredFields.description,
        datePosted:
          primaryInspection.hasRequiredFields.datePosted || fallbackInspection.hasRequiredFields.datePosted,
        location:
          primaryInspection.hasRequiredFields.location || fallbackInspection.hasRequiredFields.location,
      },
      sampleRecord: primaryInspection.sample || fallbackInspection.sample,
    });

    console.log(
      `${board.padEnd(20)} | ${status.padEnd(28)} | ${String(primaryRows).padStart(2)} primary | ${String(fallbackRows).padStart(2)} fallback | ${reason}`,
    );
  }

  const outputPath = join(REPORT_DIR, `board-audit-${Date.now()}.json`);
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        preset,
        boardSpecific,
        primaryProfile: profile,
        fallbackProfile: fallback,
        pythonExe,
        playwrightReady,
        results,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`\nSaved audit report to ${outputPath}`);
}

main();
