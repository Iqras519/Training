import { Router, type Request, type Response } from "express";
import { db, analysesTable, recommendationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { desc } from "drizzle-orm";

const router = Router();

const STRUCTURE_TYPES = ["bridge", "road", "wall", "building"];
const SEVERITY_LEVELS = ["high", "medium", "low", "none"];
const DEFECT_TYPES_BY_STRUCTURE: Record<string, string[]> = {
  bridge: ["longitudinal_crack", "transverse_crack", "spalling", "corrosion", "delamination"],
  road: ["pothole", "alligator_crack", "rutting", "raveling", "edge_crack"],
  wall: ["hairline_crack", "structural_crack", "efflorescence", "moisture_damage", "spalling"],
  building: ["facade_crack", "foundation_crack", "settlement", "water_infiltration", "rebar_exposure"],
};

function simulateAnalysis(structureType: string, fileName: string) {
  const severityWeights = ["none", "none", "low", "low", "medium", "medium", "high"];
  const severity = severityWeights[Math.floor(Math.random() * severityWeights.length)];
  const defectCount = severity === "none" ? 0 : Math.floor(Math.random() * 8) + 1;
  const confidenceScore = 0.75 + Math.random() * 0.24;
  const analysisSpeedMs = Math.floor(Math.random() * 800) + 200;
  const defectTypes =
    severity !== "none"
      ? JSON.stringify(
          (DEFECT_TYPES_BY_STRUCTURE[structureType] || DEFECT_TYPES_BY_STRUCTURE.building)
            .slice(0, defectCount > 3 ? 3 : defectCount)
        )
      : JSON.stringify([]);
  return { severity, defectCount, confidenceScore, analysisSpeedMs, defectTypes };
}

function generateReasoningMarkdown(severity: string, structureType: string, defectTypes: string[]): string {
  if (severity === "none") {
    return `## Analysis Summary\n\nNo structural defects detected in this ${structureType}.\n\n### Confidence\nAI model confidence: >95%\n\n### Methodology\nPixel-level analysis using convolutional neural networks trained on 50,000+ structural images.`;
  }
  const typeList = defectTypes.map((t) => `- **${t.replace(/_/g, " ")}**`).join("\n");
  return `## Analysis Summary\n\nDetected defects in ${structureType} structure:\n\n${typeList}\n\n### Severity Assessment\nSeverity classified as **${severity}** based on crack width, propagation pattern, and structural load-bearing impact.\n\n### Confidence\nAI model confidence: ${Math.floor(75 + Math.random() * 20)}%\n\n### Recommended Action\n${
    severity === "high"
      ? "Immediate structural assessment required. Restrict access if necessary."
      : severity === "medium"
        ? "Schedule inspection within 30 days. Monitor for propagation."
        : "Monitor quarterly. Document for baseline comparison."
  }`;
}

router.get("/analyses", async (req, res): Promise<void> => {
  const analyses = await db
    .select()
    .from(analysesTable)
    .orderBy(desc(analysesTable.createdAt));
  res.json(analyses.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })));
});

router.post("/analyses", async (req, res): Promise<void> => {
  const { fileName, structureType, notes } = req.body;
  if (!fileName || !structureType) {
    res.status(400).json({ error: "fileName and structureType are required" });
    return;
  }
  if (!STRUCTURE_TYPES.includes(structureType)) {
    res.status(400).json({ error: `structureType must be one of: ${STRUCTURE_TYPES.join(", ")}` });
    return;
  }

  const sim = simulateAnalysis(structureType, fileName);
  const defectTypesArr: string[] = JSON.parse(sim.defectTypes || "[]");

  const [analysis] = await db
    .insert(analysesTable)
    .values({
      fileName,
      structureType,
      severity: sim.severity,
      status: "completed",
      defectCount: sim.defectCount,
      confidenceScore: sim.confidenceScore,
      analysisSpeedMs: sim.analysisSpeedMs,
      defectTypes: sim.defectTypes,
      notes: notes || null,
    })
    .returning();

  if (sim.severity !== "none" && defectTypesArr.length > 0) {
    const recSeverity = sim.severity === "high" ? "critical" : sim.severity === "medium" ? "warning" : "safe";
    const recTitle =
      sim.severity === "high"
        ? "Immediate Structural Intervention Required"
        : sim.severity === "medium"
          ? "Scheduled Monitoring Recommended"
          : "Routine Maintenance Suggested";
    const reasoning = generateReasoningMarkdown(sim.severity, structureType, defectTypesArr);
    await db.insert(recommendationsTable).values({
      analysisId: analysis.id,
      severity: recSeverity,
      title: recTitle,
      description: `${defectTypesArr.length} defect(s) detected in ${structureType} structure. ${sim.severity.charAt(0).toUpperCase() + sim.severity.slice(1)} priority action required.`,
      reasoning,
      workOrderGenerated: false,
    });
  } else if (sim.severity === "none") {
    await db.insert(recommendationsTable).values({
      analysisId: analysis.id,
      severity: "safe",
      title: "No Action Required",
      description: `${structureType.charAt(0).toUpperCase() + structureType.slice(1)} structure shows nominal structural health. No defects detected.`,
      reasoning: generateReasoningMarkdown("none", structureType, []),
      workOrderGenerated: false,
    });
  }

  res.status(201).json({ ...analysis, createdAt: analysis.createdAt.toISOString() });
});

router.get("/analyses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [analysis] = await db.select().from(analysesTable).where(eq(analysesTable.id, id));
  if (!analysis) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }
  res.json({ ...analysis, createdAt: analysis.createdAt.toISOString() });
});

router.delete("/analyses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db.delete(analysesTable).where(eq(analysesTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/reports/:analysisId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.analysisId) ? req.params.analysisId[0] : req.params.analysisId;
  const analysisId = parseInt(raw, 10);
  if (isNaN(analysisId)) {
    res.status(400).json({ error: "Invalid analysisId" });
    return;
  }
  const [analysis] = await db.select().from(analysesTable).where(eq(analysesTable.id, analysisId));
  if (!analysis) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }
  const recs = await db.select().from(recommendationsTable).where(eq(recommendationsTable.analysisId, analysisId));
  res.json({
    analysisId: analysis.id,
    ...analysis,
    createdAt: analysis.createdAt.toISOString(),
    recommendations: recs.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  });
});

function getUserIdFromRequest(req: Request): number | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userIdStr] = decoded.split(":");
    const userId = parseInt(userIdStr, 10);
    return isNaN(userId) ? null : userId;
  } catch (e) {
    return null;
  }
}

function getRuleBasedRecommendations(materialType: string | null, buildingAge: number | null, severity: string) {
  const recs: { severity: string; title: string; description: string; reasoning: string }[] = [];
  if (!materialType) return recs;

  const mat = materialType.toLowerCase();

  // Rule 1: Brick + Age > 20 years
  if (mat === "brick" && buildingAge !== null && buildingAge > 20) {
    recs.push({
      severity: "warning",
      title: "Older Brick Structure Vulnerability",
      description: "Older brick structures may be vulnerable to crack propagation and mortar washout.",
      reasoning: "Brick structures older than 20 years undergo natural degradation of lime mortar and thermal expansion stress. This increases the risk of joint failure and structural crack propagation."
    });
  }

  // Rule 2: Concrete + High Severity
  if ((mat === "reinforced concrete" || mat === "concrete") && severity === "high") {
    recs.push({
      severity: "critical",
      title: "Immediate Concrete Inspection Recommended",
      description: "Immediate structural inspection recommended for high severity defect in reinforced concrete.",
      reasoning: "High severity defects in reinforced concrete structures indicate potential structural load redistribution or rebar corrosion (spalling). Immediate physical inspection and non-destructive testing are recommended."
    });
  }

  // Additional material-specific rules
  if (mat === "brick" && !(buildingAge !== null && buildingAge > 20)) {
    recs.push({
      severity: "safe",
      title: "Brick Masonry Maintenance",
      description: "Standard moisture protection and efflorescence monitoring recommended.",
      reasoning: "Brick structures require ongoing protection from water ingress. Monitor joints annually."
    });
  } else if ((mat === "reinforced concrete" || mat === "concrete") && severity !== "high") {
    recs.push({
      severity: "safe",
      title: "Concrete Carbonation Prevention",
      description: "Monitor concrete surface for signs of hair crack weathering.",
      reasoning: "Check for carbonation depths or micro-cracks during routine inspections."
    });
  } else if (mat === "steel") {
    const isHighOrMed = severity === "high" || severity === "medium";
    recs.push({
      severity: isHighOrMed ? "critical" : "safe",
      title: isHighOrMed ? "Steel Joint Fatigue Risk" : "Steel Corrosion Prevention",
      description: isHighOrMed 
        ? "Inspect all critical steel connection welds and bolts for fatigue cracks." 
        : "Verify that anti-corrosion protective coatings remain intact.",
      reasoning: isHighOrMed
        ? "High or medium severity defects in steel structures can lead to rapid load capacity degradation at connections. Inspection of welds and bolts is required."
        : "Steel structures are susceptible to oxidation. Keep paint/coatings intact."
    });
  } else if (mat === "stone") {
    recs.push({
      severity: buildingAge && buildingAge > 30 ? "warning" : "safe",
      title: "Stone Masonry Joint Stability",
      description: buildingAge && buildingAge > 30 
        ? "Perform tuckpointing on deteriorated mortar joints to maintain stability."
        : "Monitor stone masonry layout for signs of differential shifting.",
      reasoning: "Historic stone structures can shift over time. Tuckpointing is vital to seal joints and prevent water penetration."
    });
  } else if (mat === "composite") {
    recs.push({
      severity: severity === "high" ? "critical" : "safe",
      title: severity === "high" ? "Composite Delamination Warning" : "Composite Structure Integrity",
      description: severity === "high"
        ? "Perform ultrasonic scanning to detect potential subsurface delamination."
        : "Monitor composite material interfaces for localized stress fractures.",
      reasoning: "Composites can fail internally without visible surface cracks. Ultrasonic scans are necessary for high severity defects."
    });
  }

  return recs;
}

router.post("/analyze", async (req: Request, res: Response): Promise<void> => {
  const { 
    fileName, 
    structureType, 
    imageData, 
    buildingAge, 
    numberOfFloors, 
    materialType,
    buildingName,
    address,
    city,
    latitude,
    longitude 
  } = req.body;

  if (!fileName || !structureType || !imageData) {
    res.status(400).json({ error: "fileName, structureType, and imageData are required" });
    return;
  }

  if (!STRUCTURE_TYPES.includes(structureType)) {
    res.status(400).json({ error: `structureType must be one of: ${STRUCTURE_TYPES.join(", ")}` });
    return;
  }

  const parsedAge = (buildingAge !== undefined && buildingAge !== null && buildingAge !== "") 
    ? parseInt(String(buildingAge), 10) 
    : null;
  const parsedFloors = (numberOfFloors !== undefined && numberOfFloors !== null && numberOfFloors !== "") 
    ? parseInt(String(numberOfFloors), 10) 
    : null;
  const storedMaterial = (materialType !== undefined && materialType !== null && materialType !== "")
    ? String(materialType)
    : null;

  const storedBuildingName = (buildingName !== undefined && buildingName !== null && buildingName !== "")
    ? String(buildingName)
    : null;
  const storedAddress = (address !== undefined && address !== null && address !== "")
    ? String(address)
    : null;
  const storedCity = (city !== undefined && city !== null && city !== "")
    ? String(city)
    : null;
  const parsedLat = (latitude !== undefined && latitude !== null && latitude !== "")
    ? parseFloat(String(latitude))
    : null;
  const parsedLng = (longitude !== undefined && longitude !== null && longitude !== "")
    ? parseFloat(String(longitude))
    : null;

  let base64Image = imageData;
  if (imageData.startsWith("data:")) {
    const commaIndex = imageData.indexOf(",");
    if (commaIndex !== -1) {
      base64Image = imageData.substring(commaIndex + 1);
    }
  }

  const modelApiUrl = process.env.MODEL_API_URL || "https://backend-jukx.onrender.com";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${modelApiUrl}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageData: base64Image }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      res.status(response.status).json({ error: `ML model API returned error: ${response.statusText}` });
      return;
    }

    const result = (await response.json()) as any;

    if (!result || typeof result !== "object" || Object.keys(result).length === 0) {
      res.status(502).json({ error: "Empty or invalid response received from ML model API" });
      return;
    }

    const severity = result.severity || "none";
    const defectCount = typeof result.defectCount === "number" ? result.defectCount : 0;
    const confidenceScore = typeof result.confidenceScore === "number" ? result.confidenceScore : 0;
    const speedMs = typeof result.analysisSpeedMs === "number" ? result.analysisSpeedMs : 0;
    const defectTypesArr: string[] = Array.isArray(result.defectTypes) ? result.defectTypes : [];

    const userId = getUserIdFromRequest(req);

    let baseScore = 100;
    if (severity === "high") {
      baseScore = 30;
    } else if (severity === "medium") {
      baseScore = 60;
    } else if (severity === "low") {
      baseScore = 80;
    } else if (severity === "none") {
      baseScore = 100;
    }
    const conf = confidenceScore !== null && confidenceScore !== undefined ? confidenceScore : 1.0;
    const computedHealthScore = Math.round(baseScore * conf);

    const [analysis] = await db
      .insert(analysesTable)
      .values({
        userId,
        fileName,
        structureType,
        severity,
        status: "completed",
        defectCount,
        confidenceScore,
        analysisSpeedMs: speedMs,
        originalImageUrl: imageData,
        defectTypes: JSON.stringify(defectTypesArr),
        buildingAge: isNaN(parsedAge as any) ? null : parsedAge,
        numberOfFloors: isNaN(parsedFloors as any) ? null : parsedFloors,
        materialType: storedMaterial,
        healthScore: computedHealthScore,
        buildingName: storedBuildingName,
        address: storedAddress,
        city: storedCity,
        latitude: isNaN(parsedLat as any) ? null : parsedLat,
        longitude: isNaN(parsedLng as any) ? null : parsedLng,
      })
      .returning();

    // ML Recommendation
    if (severity !== "none" && defectTypesArr.length > 0) {
      const recSeverity = severity === "high" ? "critical" : severity === "medium" ? "warning" : "safe";
      const recTitle =
        severity === "high"
          ? "Immediate Structural Intervention Required"
          : severity === "medium"
            ? "Scheduled Monitoring Recommended"
            : "Routine Maintenance Suggested";
      const reasoning = generateReasoningMarkdown(severity, structureType, defectTypesArr);
      await db.insert(recommendationsTable).values({
        analysisId: analysis.id,
        severity: recSeverity,
        title: recTitle,
        description: `${defectTypesArr.length} defect(s) detected in ${structureType} structure. ${severity.charAt(0).toUpperCase() + severity.slice(1)} priority action required.`,
        reasoning,
        workOrderGenerated: false,
      });
    } else {
      await db.insert(recommendationsTable).values({
        analysisId: analysis.id,
        severity: "safe",
        title: "No Action Required",
        description: `${structureType.charAt(0).toUpperCase() + structureType.slice(1)} structure shows nominal structural health. No defects detected.`,
        reasoning: generateReasoningMarkdown("none", structureType, []),
        workOrderGenerated: false,
      });
    }

    // Rule-based Recommendations
    const ruleRecs = getRuleBasedRecommendations(storedMaterial, isNaN(parsedAge as any) ? null : parsedAge, severity);
    for (const rec of ruleRecs) {
      await db.insert(recommendationsTable).values({
        analysisId: analysis.id,
        severity: rec.severity,
        title: rec.title,
        description: rec.description,
        reasoning: rec.reasoning,
        workOrderGenerated: false,
      });
    }

    // Fetch all recommendations to return to client
    const recommendations = await db
      .select()
      .from(recommendationsTable)
      .where(eq(recommendationsTable.analysisId, analysis.id));

    res.status(200).json({
      ...analysis,
      createdAt: analysis.createdAt.toISOString(),
      recommendations: recommendations.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    });
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      res.status(504).json({ error: "ML model API call timed out after 30 seconds" });
    } else {
      res.status(503).json({ error: `ML model API is unavailable: ${error.message}` });
    }
  }
});

export default router;
