/**
 * =========================================================
 * 🧠 ForgeVid Platform Diagnostic Script
 * Checks system readiness, backend APIs, database, AI, and UI
 * Version: 1.3.0
 * =========================================================
 */

const chalk = require("chalk");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CONFIG = {
  baseUrl: "http://localhost:3000",
  apiEndpoints: [
    "/api/auth/status",
    "/api/videos/list",
    "/api/ai/ping",
    "/api/templates/list",
    "/api/media/test",
    "/api/admin/health"
  ],
  requiredEnvVars: [
    "DATABASE_URL",
    "OPENAI_API_KEY",
    "ELEVENLABS_API_KEY",
    "CLOUDINARY_URL",
    "STRIPE_SECRET_KEY",
    "NEXTAUTH_SECRET"
  ],
  databaseCmd: "npx prisma db pull",
};

console.log(chalk.cyan("\n🧠 ForgeVid Enterprise Diagnostic Tool"));
console.log(chalk.gray("=============================================\n"));

/**
 * Helper to log results
 */
function result(name, ok, msg = "") {
  const symbol = ok ? chalk.green("✅") : chalk.red("❌");
  console.log(`${symbol} ${chalk.bold(name)} ${chalk.gray(msg)}`);
  return ok;
}

/**
 * Section divider
 */
function section(title) {
  console.log(chalk.yellow(`\n=== ${title} ===`));
}

/**
 * 1️⃣ Environment Variable Check
 */
section("Environment Variables");

let envOk = true;
CONFIG.requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    envOk = false;
    result(key, false, "Missing in .env.local");
  } else {
    result(key, true);
  }
});

if (!envOk) {
  console.log(chalk.red("\n❗ Missing critical environment variables! Check your .env.local file."));
}

/**
 * 2️⃣ Database Connectivity
 */
section("Database Connection");

try {
  execSync(CONFIG.databaseCmd, { stdio: "ignore" });
  result("Database", true, "Connected successfully");
} catch (err) {
  result("Database", false, "Failed to connect. Run: npx prisma migrate dev");
}

/**
 * 3️⃣ API Endpoint Tests
 */
async function testAPIEndpoints(fetch) {
  section("API Endpoints");

  let apiPass = 0;
  for (const endpoint of CONFIG.apiEndpoints) {
    try {
      const res = await fetch(`${CONFIG.baseUrl}${endpoint}`);
      if (res.ok) {
        result(endpoint, true);
        apiPass++;
      } else {
        result(endpoint, false, `HTTP ${res.status}`);
      }
    } catch {
      result(endpoint, false, "No response from server");
    }
  }

  if (apiPass === 0) {
    console.log(chalk.red("\n⚠️  None of the API endpoints responded! Is your dev server running?"));
  }
  return apiPass;
}

/**
 * 4️⃣ Frontend Render Check
 */
async function testFrontend(fetch) {
  section("Frontend Check");

  try {
    const res = await fetch(CONFIG.baseUrl);
    const html = await res.text();
    if (html.includes("<div") && html.length > 500) {
      result("Homepage", true, "HTML loaded correctly");
      return true;
    } else {
      result("Homepage", false, "Unexpected or empty response");
      return false;
    }
  } catch {
    result("Homepage", false, "Frontend not responding");
    return false;
  }
}

/**
 * Main execution function
 */
async function runDiagnostics() {
  console.log(chalk.cyan("\n🧠 ForgeVid Enterprise Diagnostic Tool"));
  console.log(chalk.gray("=============================================\n"));

  // Import fetch dynamically
  const fetch = (await import("node-fetch")).default;

  /**
   * 1️⃣ Environment Variable Check
   */
  section("Environment Variables");

  let envOk = true;
  CONFIG.requiredEnvVars.forEach((key) => {
    if (!process.env[key]) {
      envOk = false;
      result(key, false, "Missing in .env.local");
    } else {
      result(key, true);
    }
  });

  if (!envOk) {
    console.log(chalk.red("\n❗ Missing critical environment variables! Check your .env.local file."));
  }

  /**
   * 2️⃣ Database Connectivity
   */
  section("Database Connection");

  let dbOk = false;
  try {
    execSync(CONFIG.databaseCmd, { stdio: "ignore" });
    result("Database", true, "Connected successfully");
    dbOk = true;
  } catch (err) {
    result("Database", false, "Failed to connect. Run: npx prisma migrate dev");
  }

  // Test API endpoints
  const apiPass = await testAPIEndpoints(fetch);
  
  // Test frontend
  const frontendOk = await testFrontend(fetch);

  /**
   * 5️⃣ File Integrity Check
   */
  section("Core Files Integrity");

  const mustExist = [
    "app/dashboard/page.tsx",
    "app/api/videos/route.ts",
    "prisma/schema.prisma",
    "next.config.js",
    "package.json"
  ];

  let missingFiles = 0;
  for (const file of mustExist) {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      result(file, true);
    } else {
      result(file, false);
      missingFiles++;
    }
  }

  if (missingFiles > 0) {
    console.log(chalk.red(`\n❗ Missing ${missingFiles} required project files.`));
  }

  /**
   * 6️⃣ AI Integrations
   */
  section("AI Integration Status");

  const aiServices = [
    { name: "OpenAI", key: "OPENAI_API_KEY" },
    { name: "ElevenLabs", key: "ELEVENLABS_API_KEY" },
  ];

  aiServices.forEach(svc => {
    if (process.env[svc.key]) result(`${svc.name} API`, true);
    else result(`${svc.name} API`, false, "Missing key in .env.local");
  });

  /**
   * 7️⃣ Summary Report
   */
  section("Summary");

  const passed = chalk.green("✅ PASSED");
  const failed = chalk.red("❌ FAILED");

  console.log(`
${chalk.cyan("Environment Variables:")} ${envOk ? passed : failed}
${chalk.cyan("Database:")} ${dbOk ? passed : failed}
${chalk.cyan("API Endpoints:")} ${apiPass}/${CONFIG.apiEndpoints.length}
${chalk.cyan("Frontend Render:")} ${frontendOk ? passed : failed}
${chalk.cyan("AI Integrations:")} ${envOk ? passed : failed}
`);

  console.log(chalk.yellow("\n🧩 Recommendation:"));
  console.log("1. Ensure `npm run dev` is active.");
  console.log("2. Verify `.env.local` has all keys.");
  console.log("3. If database fails, run `npx prisma migrate dev`.");
  console.log("4. Re-run this script after fixing issues.\n");

  console.log(chalk.green("✅ ForgeVid diagnostic completed.\n"));
}

// Run the diagnostics
runDiagnostics().catch(console.error);