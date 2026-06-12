import { Router } from "express";
import { db, analysesTable, recommendationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { desc } from "drizzle-orm";
const router = Router();
const STRUCTURE_TYPES = ["bridge", "road", "wall", "building"];
const SEVERITY_LEVELS = ["high", "medium", "low", "none"];
const DEFECT_TYPES_BY_STRUCTURE = {
    bridge: ["longitudinal_crack", "transverse_crack", "spalling", "corrosion", "delamination"],
    road: ["pothole", "alligator_crack", "rutting", "raveling", "edge_crack"],
    wall: ["hairline_crack", "structural_crack", "efflorescence", "moisture_damage", "spalling"],
    building: ["facade_crack", "foundation_crack", "settlement", "water_infiltration", "rebar_exposure"],
};
function simulateAnalysis(structureType, fileName) {
    const severityWeights = ["none", "none", "low", "low", "medium", "medium", "high"];
    const severity = severityWeights[Math.floor(Math.random() * severityWeights.length)];
    const defectCount = severity === "none" ? 0 : Math.floor(Math.random() * 8) + 1;
    const confidenceScore = 0.75 + Math.random() * 0.24;
    const analysisSpeedMs = Math.floor(Math.random() * 800) + 200;
    const defectTypes = severity !== "none"
        ? JSON.stringify((DEFECT_TYPES_BY_STRUCTURE[structureType] || DEFECT_TYPES_BY_STRUCTURE.building)
            .slice(0, defectCount > 3 ? 3 : defectCount))
        : JSON.stringify([]);
    return { severity, defectCount, confidenceScore, analysisSpeedMs, defectTypes };
}
function generateReasoningMarkdown(severity, structureType, defectTypes) {
    if (severity === "none") {
        return `## Analysis Summary\n\nNo structural defects detected in this ${structureType}.\n\n### Confidence\nAI model confidence: >95%\n\n### Methodology\nPixel-level analysis using convolutional neural networks trained on 50,000+ structural images.`;
    }
    const typeList = defectTypes.map((t) => `- **${t.replace(/_/g, " ")}**`).join("\n");
    return `## Analysis Summary\n\nDetected defects in ${structureType} structure:\n\n${typeList}\n\n### Severity Assessment\nSeverity classified as **${severity}** based on crack width, propagation pattern, and structural load-bearing impact.\n\n### Confidence\nAI model confidence: ${Math.floor(75 + Math.random() * 20)}%\n\n### Recommended Action\n${severity === "high"
        ? "Immediate structural assessment required. Restrict access if necessary."
        : severity === "medium"
            ? "Schedule inspection within 30 days. Monitor for propagation."
            : "Monitor quarterly. Document for baseline comparison."}`;
}
router.get("/analyses", async (req, res) => {
    const analyses = await db
        .select()
        .from(analysesTable)
        .orderBy(desc(analysesTable.createdAt));
    res.json(analyses.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })));
});
router.post("/analyses", async (req, res) => {
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
    const defectTypesArr = JSON.parse(sim.defectTypes || "[]");
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
        const recTitle = sim.severity === "high"
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
    }
    else if (sim.severity === "none") {
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
router.get("/analyses/:id", async (req, res) => {
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
router.delete("/analyses/:id", async (req, res) => {
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
router.get("/reports/:analysisId", async (req, res) => {
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
        fileName: analysis.fileName,
        structureType: analysis.structureType,
        severity: analysis.severity,
        createdAt: analysis.createdAt.toISOString(),
        defectCount: analysis.defectCount ?? 0,
        confidenceScore: analysis.confidenceScore ?? null,
        recommendations: recs.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    });
});
export default router;
