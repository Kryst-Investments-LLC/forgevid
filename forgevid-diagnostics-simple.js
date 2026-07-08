/**
 * =========================================================
 * 🧠 ForgeVid Platform Diagnostic Script (Simple Version)
 * Checks system readiness, backend APIs, database, AI, and UI
 * Version: 1.3.0 - No external dependencies
 * =========================================================
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// Load environment variables from .env.local
function loadEnvLocal() {
  const envLocalPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    try {
      const envContent = fs.readFileSync(envLocalPath, 'utf8');
      const lines = envContent.split('\n');
      
      console.log(`📁 Reading ${lines.length} lines from .env.local`);
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        // Skip comments and empty lines
        if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
          const equalIndex = trimmedLine.indexOf('=');
          const key = trimmedLine.substring(0, equalIndex).trim();
          const value = trimmedLine.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '');
          
          if (key && value) {
            process.env[key] = value;
            console.log(`🔑 Loaded: ${key}`);
          }
        }
      }
      console.log("✅ Loaded .env.local file");
    } catch (error) {
      console.log(`❌ Error reading .env.local: ${error.message}`);
    }
  } else {
    console.log("❌ .env.local file not found");
  }
}

// Load environment variables first
loadEnvLocal();

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

console.log("\n🧠 ForgeVid Enterprise Diagnostic Tool");
console.log("=============================================\n");

/**
 * Helper to log results with colors
 */
function result(name, ok, msg = "") {
  const symbol = ok ? "✅" : "❌";
  console.log(`${symbol} ${name} ${msg}`);
  return ok;
}

/**
 * Section divider
 */
function section(title) {
  console.log(`\n=== ${title} ===`);
}

/**
 * Simple HTTP request function
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const req = protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runDiagnostics() {
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
    console.log("\n❗ Missing critical environment variables! Check your .env.local file.");
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

  /**
   * 3️⃣ API Endpoint Tests
   */
  section("API Endpoints");

  let apiPass = 0;
  for (const endpoint of CONFIG.apiEndpoints) {
    try {
      const res = await makeRequest(`${CONFIG.baseUrl}${endpoint}`);
      if (res.status >= 200 && res.status < 300) {
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
    console.log("\n⚠️  None of the API endpoints responded! Is your dev server running?");
  }

  /**
   * 4️⃣ Frontend Render Check
   */
  section("Frontend Check");

  let frontendOk = false;
  try {
    const res = await makeRequest(CONFIG.baseUrl);
    if (res.data.includes("<div") && res.data.length > 500) {
      result("Homepage", true, "HTML loaded correctly");
      frontendOk = true;
    } else {
      result("Homepage", false, "Unexpected or empty response");
    }
  } catch {
    result("Homepage", false, "Frontend not responding");
  }

  /**
   * 5️⃣ File Integrity Check
   */
  section("Core Files Integrity");

  const mustExist = [
    "app/dashboard/page.tsx",
    "app/api/videos/route.ts", 
    "prisma/schema.prisma",
    "next.config.mjs",
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
    console.log(`\n❗ Missing ${missingFiles} required project files.`);
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

  const passed = "✅ PASSED";
  const failed = "❌ FAILED";

  console.log(`
Environment Variables: ${envOk ? passed : failed}
Database: ${dbOk ? passed : failed}
API Endpoints: ${apiPass}/${CONFIG.apiEndpoints.length}
Frontend Render: ${frontendOk ? passed : failed}
AI Integrations: ${envOk ? passed : failed}
`);

  console.log("\n🧩 Recommendation:");
  console.log("1. Ensure `npm run dev` is active.");
  console.log("2. Verify `.env.local` has all keys.");
  console.log("3. If database fails, run `npx prisma migrate dev`.");
  console.log("4. Re-run this script after fixing issues.\n");

  console.log("✅ ForgeVid diagnostic completed.\n");
}

// Run the diagnostics
runDiagnostics().catch(console.error);