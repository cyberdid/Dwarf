import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import {
  buildGeminiLogRecord,
  appendGeminiLog,
  readGeminiLogEntries,
  computeGeminiLogAggregates,
  isValidLogDate,
} from "./geminiLog";

dotenv.config();

// Primary Fast Gemini Model Identifier for Low-Latency Autonomous DF-AI
const GEMINI_MODEL = "gemini-3.8-flash";

const app = express();
const PORT = 3000;

// Body payload limit constrained to 512 KB
app.use(express.json({ limit: "512kb" }));

// In-memory rate limiting: maximum 20 requests per minute per IP
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function rateLimitMiddleware(maxRequests = 20, windowMs = 60 * 1000) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      "127.0.0.1";
    const now = Date.now();

    // Housekeeping: periodic cleanup of expired records to prevent unbounded memory growth
    if (rateLimitMap.size > 200) {
      for (const [key, val] of rateLimitMap.entries()) {
        if (now > val.resetAt) {
          rateLimitMap.delete(key);
        }
      }
    }

    const current = rateLimitMap.get(rawIp);
    if (!current || now > current.resetAt) {
      rateLimitMap.set(rawIp, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= maxRequests) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: "Too Many Requests",
        message: `Rate limit exceeded: maximum ${maxRequests} requests per minute from IP ${rawIp}. Please retry in ${retryAfter}s.`,
      });
    }

    current.count++;
    next();
  };
}

// Initialize Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// Health Check API - active ping test against the Gemini model
app.get("/api/health", async (_req, res) => {
  const ai = getGeminiClient();
  const hasKey = Boolean(process.env.GEMINI_API_KEY);

  if (!hasKey || !ai) {
    return res.status(503).json({
      status: "degraded",
      aiEnabled: false,
      model: GEMINI_MODEL,
      error: "GEMINI_API_KEY environment variable is not configured",
      timestamp: Date.now(),
    });
  }

  const start = Date.now();
  try {
    // Low-cost ping to verify model availability, valid API key, and model identifier
    await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: "ping",
      config: {
        maxOutputTokens: 1,
      },
    });
    const latencyMs = Date.now() - start;
    return res.json({
      status: "ok",
      aiEnabled: true,
      model: GEMINI_MODEL,
      latencyMs,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    console.error(`Gemini health check ping failed (${GEMINI_MODEL}):`, err?.message);
    return res.status(502).json({
      status: "error",
      aiEnabled: true,
      model: GEMINI_MODEL,
      latencyMs,
      error: err?.message || "Model ping failed",
      timestamp: Date.now(),
    });
  }
});

/**
 * Heuristic Rule-Based DF-AI Planner (Ben Lubar df-ai architecture)
 * Used directly or as fallback when Gemini API is offline/rate-limited
 */
function generateHeuristicDfAiPlan(body: any) {
  const { fortressSummary, overworldSummary, directive } = body;
  const stocks = fortressSummary?.stocks || { food: 20, ale: 15, wood: 20, stone: 50 };
  const totalAle = stocks.totalOnMap?.ale ?? stocks.ale ?? 0;
  const inStockpileAle = stocks.inStockpile?.ale ?? 0;
  const totalWood = stocks.totalOnMap?.wood ?? stocks.wood ?? 0;
  const pop = fortressSummary?.population || 7;
  const surfaceZ = fortressSummary?.surfaceZ ?? 14;
  const undergroundZ = Math.max(0, surfaceZ - 1);
  const deepZ = Math.max(0, surfaceZ - 3);

  const mine: { x: number; y: number; z: number }[] = [];
  const chop: { x: number; y: number; z: number }[] = [];
  const build: { x: number; y: number; z: number; type: string }[] = [];
  const stockpiles: { x1: number; y1: number; x2: number; y2: number; z: number; type: string }[] = [];
  const zones: { x1: number; y1: number; x2: number; y2: number; z: number; type: string }[] = [];
  const orders: { action: string; details: string }[] = [];

  const existingBedsCount = fortressSummary?.existingBeds?.length || 0;
  const hasStill = fortressSummary?.existingWorkshops?.some((w: any) => w.type === "workshop_still");
  const hasMason = fortressSummary?.existingWorkshops?.some((w: any) => w.type === "workshop_mason");

  let thoughtEn = "";
  let thoughtUa = "";
  let statusSummary = "STABLE";

  // 1. Food & Drink Priority (df-ai rule: if drink < pop * 3, emergency brew & build Still)
  if (totalAle < pop * 3 || !hasStill) {
    statusSummary = "BOOZE_EMERGENCY";
    thoughtEn = `Booze reserves: ${totalAle} barrels total on map (${inStockpileAle} in stockpiles) for ${pop} dwarves. Prioritizing Still workshop and brewing rations.`;
    thoughtUa = `Запаси елю: ${totalAle} бочок на карті (${inStockpileAle} на складах) на ${pop} гномів. Зводимо Дистилятор (Still) та поповнюємо раціон!`;

    if (!hasStill) {
      build.push({ x: 28, y: 16, z: undergroundZ, type: "build_workshop_still" });
    }
    orders.push({ action: "brew_drink", details: "Brew 10 barrels of dwarven ale" });

    // Ensure wood for barrels
    if (fortressSummary?.nearbyTrees?.length > 0 && totalWood < 15) {
      fortressSummary.nearbyTrees.slice(0, 4).forEach((t: any) => {
        chop.push({ x: t.x, y: t.y, z: t.z });
      });
    }
  }
  // 2. Bedroom expansion priority (df-ai rule: beds >= pop)
  else if (existingBedsCount < pop) {
    statusSummary = "RESIDENTIAL_EXPANSION";
    thoughtEn = `Dwarves need personal quarters (${existingBedsCount}/${pop} beds). Excavating living wing at Z=${undergroundZ}.`;
    thoughtUa = `Гноми потребують спалень (${existingBedsCount}/${pop} ліжок). Розмічаємо житловий сектор на рівні Z=${undergroundZ}.`;

    const startX = 20;
    const startY = 12;
    for (let i = 0; i < 4; i++) {
      const rx = startX + i * 3;
      mine.push({ x: rx, y: startY, z: undergroundZ });
      mine.push({ x: rx + 1, y: startY, z: undergroundZ });
      build.push({ x: rx + 1, y: startY, z: undergroundZ, type: "build_bed" });
      build.push({ x: rx, y: startY, z: undergroundZ, type: "build_door" });
      zones.push({ x1: rx, y1: startY, x2: rx + 1, y2: startY, z: undergroundZ, type: "bedroom" });
    }
  }
  // 3. Mining & Mineral Extraction Priority (df-ai rule: find iron & gold)
  else if (fortressSummary?.unminedOres?.length > 0) {
    statusSummary = "MINERAL_DELVING";
    thoughtEn = `Prospecting unmined veins of ore in the rock strata. Excavating veins for blacksmithing and wealth.`;
    thoughtUa = `Виявлено підземні рудні пласти. Шахтарі скеровуються на видобуток заліза та золота для ковальства!`;

    fortressSummary.unminedOres.slice(0, 8).forEach((ore: any) => {
      mine.push({ x: ore.x, y: ore.y, z: ore.z });
    });

    if (!hasMason) {
      build.push({ x: 24, y: 16, z: undergroundZ, type: "build_workshop_mason" });
    }
  }
  // 4. Overworld trade / exploration if fortress is well-fed
  else if (overworldSummary?.nearbySites?.length > 0 && Math.random() < 0.3) {
    const site = overworldSummary.nearbySites[0];
    statusSummary = "OVERWORLD_DIPLOMACY";
    thoughtEn = `Fortress is thriving. Dispatching an expedition to ${site.name} for diplomatic relations and trade.`;
    thoughtUa = `Фортеця процвітає! Споряджаємо торговельну експедицію до «${site.name}» для обміну товарами.`;
    orders.push({ action: "dispatch_expedition", details: `Trade caravan to ${site.name}` });
  } else {
    // General expansion: dig central corridors
    statusSummary = "CITADEL_FORTIFYING";
    thoughtEn = `Expanding central corridors and stockpiling stone & wood for future sieges.`;
    thoughtUa = `Розширюємо головні підземні тунелі та організовуємо склади для підготовки до облог.`;

    const cx = Math.floor((fortressSummary?.surfaceZ ? 30 : 25));
    const cy = 20;
    for (let dx = -2; dx <= 2; dx++) {
      mine.push({ x: cx + dx, y: cy, z: undergroundZ });
    }
    stockpiles.push({ x1: cx - 3, y1: cy + 2, x2: cx - 1, y2: cy + 4, z: undergroundZ, type: "stone" });
  }

  return {
    source: "df-ai-heuristic-engine",
    statusSummary,
    thoughtProcessEn: thoughtEn,
    thoughtProcessUa: thoughtUa,
    commands: {
      mine,
      chop,
      build,
      stockpiles,
      zones,
      orders,
    },
    dfHackTerminalLine: `[df-ai:heuristic] Executed cycle: ${mine.length} digs, ${build.length} builds, ${chop.length} chops.`,
  };
}

/**
 * Autonomous Gemini DF-AI Overseer Endpoint
 * Analyzes Dwarf Fortress memory & simulation state and issues DFHack commands
 */
app.post("/api/df-ai/step", rateLimitMiddleware(), async (req, res) => {
  const body = req.body || {};
  const ai = getGeminiClient();
  const cycleId = `cyc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const start = Date.now();
  const { fortressSummary, overworldSummary, directive, historyLogs } = body;

  if (!ai) {
    // If no API key configured, use the built-in Ben Lubar df-ai rule engine
    const heuristicPlan = generateHeuristicDfAiPlan(body);
    appendGeminiLog(buildGeminiLogRecord({
      cycleId,
      source: "heuristic",
      model: GEMINI_MODEL,
      latencyMs: Date.now() - start,
      ok: true,
      directive,
      fortressSummary,
      overworldSummary,
      prompt: null,
      responseRaw: null,
      usage: null,
      parsed: heuristicPlan,
    }));
    return res.json({ cycleId, ...heuristicPlan });
  }

  const systemPrompt = `You are the autonomous AI Overseer for a Dwarf Fortress game, modeled directly after Ben Lubar's legendary 'df-ai' (DFHack autonomous player plugin).
You have full authority to command the dwarves, plan architectural blueprints, excavate tunnels, fell trees, build workshops, erect bedrooms, assign stockpiles, order brewing, and dispatch world expeditions.

Your primary directive is FORTRESS SURVIVAL AND GLORY:
1. NEVER allow dwarves to die of dehydration or starvation. If ale < population * 3, prioritize drinking/brewing and building a Still ('build_workshop_still').
2. Ensure every dwarf has a bed and private bedroom to keep happiness high and prevent tantrum spirals.
3. Keep miners active: dig exploratory shafts, mine out iron/gold/adamantine veins.
4. Keep carpenters/masons supplied with wood and stone.
5. React to user directives if provided.

Given the current fortress state, formulate an immediate, actionable step plan. Return ONLY valid JSON adhering strictly to the schema.`;

  const userPrompt = `CURRENT FORTRESS SNAPSHOT:
- Calendar: Year ${fortressSummary?.year || 105}, ${fortressSummary?.season || "Spring"} ${fortressSummary?.day || 1} (Tick ${fortressSummary?.tick || 0})
- Population: ${fortressSummary?.population || 7} dwarves (${fortressSummary?.idleDwarvesCount || 0} idle)
- Wealth: ${fortressSummary?.wealth || 0}
- Surface Z-level: ${fortressSummary?.surfaceZ || 14}
- Stocks: Food: ${fortressSummary?.stocks?.totalOnMap?.food ?? fortressSummary?.stocks?.food ?? 0} (Stockpile: ${fortressSummary?.stocks?.inStockpile?.food ?? 0}), Ale: ${fortressSummary?.stocks?.totalOnMap?.ale ?? fortressSummary?.stocks?.ale ?? 0} (Stockpile: ${fortressSummary?.stocks?.inStockpile?.ale ?? 0}), Wood: ${fortressSummary?.stocks?.totalOnMap?.wood ?? fortressSummary?.stocks?.wood ?? 0}, Stone: ${fortressSummary?.stocks?.totalOnMap?.stone ?? fortressSummary?.stocks?.stone ?? 0}, Ore: ${fortressSummary?.stocks?.totalOnMap?.ore ?? fortressSummary?.stocks?.ore ?? 0}
- Existing Workshops: ${JSON.stringify(fortressSummary?.existingWorkshops || [])}
- Existing Beds: ${fortressSummary?.existingBeds?.length || 0}
- Unmined Visible Ore Veins: ${JSON.stringify(fortressSummary?.unminedOres?.slice(0, 6) || [])}
- Nearby Surface Trees: ${JSON.stringify(fortressSummary?.nearbyTrees?.slice(0, 6) || [])}
- Overworld Biome: ${overworldSummary?.biome || "mountain"}
- Nearby Settlements: ${JSON.stringify(overworldSummary?.nearbySites?.slice(0, 4) || [])}
- User Directive: ${directive || "Balanced autonomous growth (Standard df-ai)"}
- Recent Logs: ${JSON.stringify(historyLogs?.slice(-3) || [])}

Decide the best tactical and architectural commands right now!`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            statusSummary: {
              type: Type.STRING,
              description: "Short status code like BOOZE_PRIORITY, RESIDENTIAL_EXPANSION, MINING_OPERATION, DEFENSE, IDLE_PATROL",
            },
            thoughtProcessEn: {
              type: Type.STRING,
              description: "Detailed tactical explanation of the AI's thoughts in English",
            },
            thoughtProcessUa: {
              type: Type.STRING,
              description: "Detailed tactical explanation of the AI's thoughts in Ukrainian",
            },
            commands: {
              type: Type.OBJECT,
              properties: {
                mine: {
                  type: Type.ARRAY,
                  description: "Coordinates to designate for mining excavation",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      x: { type: Type.INTEGER },
                      y: { type: Type.INTEGER },
                      z: { type: Type.INTEGER },
                    },
                    required: ["x", "y", "z"],
                  },
                },
                chop: {
                  type: Type.ARRAY,
                  description: "Tree trunk coordinates to designate for chopping",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      x: { type: Type.INTEGER },
                      y: { type: Type.INTEGER },
                      z: { type: Type.INTEGER },
                    },
                    required: ["x", "y", "z"],
                  },
                },
                build: {
                  type: Type.ARRAY,
                  description: "Structures or workshops to build",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      x: { type: Type.INTEGER },
                      y: { type: Type.INTEGER },
                      z: { type: Type.INTEGER },
                      type: {
                        type: Type.STRING,
                        description: "One of: build_wall, build_door, build_bed, build_workshop_still, build_workshop_mason",
                      },
                    },
                    required: ["x", "y", "z", "type"],
                  },
                },
                stockpiles: {
                  type: Type.ARRAY,
                  description: "Stockpile zones to designate",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      x1: { type: Type.INTEGER },
                      y1: { type: Type.INTEGER },
                      x2: { type: Type.INTEGER },
                      y2: { type: Type.INTEGER },
                      z: { type: Type.INTEGER },
                      type: {
                        type: Type.STRING,
                        description: "One of: stone, wood, food, ore",
                      },
                    },
                    required: ["x1", "y1", "x2", "y2", "z", "type"],
                  },
                },
                zones: {
                  type: Type.ARRAY,
                  description: "Room zones to designate",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      x1: { type: Type.INTEGER },
                      y1: { type: Type.INTEGER },
                      x2: { type: Type.INTEGER },
                      y2: { type: Type.INTEGER },
                      z: { type: Type.INTEGER },
                      type: {
                        type: Type.STRING,
                        description: "One of: bedroom, tavern, dormitory",
                      },
                    },
                    required: ["x1", "y1", "x2", "y2", "z", "type"],
                  },
                },
                orders: {
                  type: Type.ARRAY,
                  description: "Special fortress orders",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      action: { type: Type.STRING, description: "brew_drink, craft_furniture, dispatch_expedition, summon_migrants" },
                      details: { type: Type.STRING },
                    },
                    required: ["action", "details"],
                  },
                },
              },
              required: ["mine", "chop", "build", "stockpiles", "zones", "orders"],
            },
            dfHackTerminalLine: {
              type: Type.STRING,
              description: "A retro terminal command log line, e.g. [df-ai:gemini] Blueprinting Still workshop and 6 bedrooms at Z=13",
            },
          },
          required: [
            "statusSummary",
            "thoughtProcessEn",
            "thoughtProcessUa",
            "commands",
            "dfHackTerminalLine",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const usageMeta = (response as any).usageMetadata;
    appendGeminiLog(buildGeminiLogRecord({
      cycleId,
      source: "gemini",
      model: GEMINI_MODEL,
      latencyMs: Date.now() - start,
      ok: true,
      directive,
      fortressSummary,
      overworldSummary,
      prompt: { system: systemPrompt, user: userPrompt },
      responseRaw: response.text ?? null,
      usage: usageMeta ? {
        promptTokens: usageMeta.promptTokenCount ?? 0,
        candidatesTokens: usageMeta.candidatesTokenCount ?? 0,
        totalTokens: usageMeta.totalTokenCount ?? 0,
      } : null,
      parsed,
    }));
    return res.json({
      cycleId,
      source: "gemini",
      ...parsed,
    });
  } catch (err: any) {
    const fallbackPlan = generateHeuristicDfAiPlan(body);
    appendGeminiLog(buildGeminiLogRecord({
      cycleId,
      source: "gemini-fallback",
      model: GEMINI_MODEL,
      latencyMs: Date.now() - start,
      ok: false,
      error: err?.message,
      directive,
      fortressSummary,
      overworldSummary,
      prompt: { system: systemPrompt, user: userPrompt },
      responseRaw: null,
      usage: null,
      parsed: fallbackPlan,
    }));
    console.error("Gemini DF-AI step failed, using heuristic fallback:", err?.message);
    return res.json({
      cycleId,
      ...fallbackPlan,
      source: "df-ai-heuristic-fallback",
      error: err?.message,
    });
  }
});

// Read Gemini decision logs for the in-app analytics panel and CLI parity.
app.get("/api/df-ai/logs", rateLimitMiddleware(), (req, res) => {
  const dateParam = typeof req.query.date === "string" ? req.query.date : undefined;
  if (dateParam && !isValidLogDate(dateParam)) {
    return res.status(400).json({ error: "Invalid date; expected YYYY-MM-DD" });
  }
  const limit = Math.min(1000, Math.max(1, parseInt(String(req.query.limit ?? "200"), 10) || 200));
  const all = readGeminiLogEntries({ date: dateParam });
  const aggregates = computeGeminiLogAggregates(all);
  return res.json({
    date: dateParam ?? new Date().toISOString().slice(0, 10),
    entries: all.slice(-limit).reverse(),
    aggregates,
  });
});

// Vite Middleware Integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Dwarf Fortress DF-AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
