import { jsPDF } from "jspdf";

export interface PDFReportData {
  id: number;
  fileName: string;
  structureType: string;
  severity: string;
  defectCount: number;
  confidenceScore: number | null;
  analysisSpeedMs: number;
  defectTypes: string | null;
  originalImageUrl?: string;
  createdAt: string;
  recommendations?: {
    id: number;
    severity: string;
    title: string;
    description: string;
    reasoning?: string;
  }[];
}

export function generatePDFReport(data: PDFReportData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;

  // Colors
  const darkSlate = [30, 41, 59]; // #1e293b
  const lightSlate = [241, 245, 249]; // #f1f5f9
  const cyanAccent = [6, 182, 212]; // #06b6d4
  const textDark = [15, 23, 42]; // #0f172a
  const textMuted = [100, 116, 139]; // #64748b
  const borderGray = [226, 232, 240]; // #e2e8f0

  // Severity Colors
  const severityColors: Record<string, number[]> = {
    high: [239, 68, 68],    // #ef4444
    medium: [245, 158, 11],  // #f59e0b
    low: [16, 185, 129],    // #10b981
    none: [100, 116, 139],   // #64748b
  };

  const severityLabels: Record<string, string> = {
    high: "CRITICAL RISK",
    medium: "MODERATE RISK",
    low: "LOW RISK",
    none: "NOMINAL",
  };

  const sevColor = severityColors[data.severity] || severityColors.none;
  const sevLabel = severityLabels[data.severity] || "UNKNOWN";

  // Calculate Health Score
  let healthScore = 100;
  if (data.severity === "high") {
    healthScore = Math.max(10, 100 - (data.defectCount || 1) * 15 - 35);
  } else if (data.severity === "medium") {
    healthScore = Math.max(45, 100 - (data.defectCount || 1) * 10 - 15);
  } else if (data.severity === "low") {
    healthScore = Math.max(75, 100 - (data.defectCount || 1) * 5 - 5);
  }

  // Helper: Draw Header Banner
  doc.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.rect(0, 0, pageWidth, 28, "F");

  // Cyan brand indicator strip
  doc.setFillColor(cyanAccent[0], cyanAccent[1], cyanAccent[2]);
  doc.rect(0, 28, pageWidth, 1.5, "F");

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("VISIONBUILD AI", margin, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text("STRUCTURAL HEALTH REPORT", pageWidth - margin - 55, 18);

  // -------------------------------------------------------------
  // METADATA BLOCK
  // -------------------------------------------------------------
  let y = 42;
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Structural Assessment Certificate", margin, y);

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  
  const dateStr = new Date(data.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  
  doc.text(`File Target: ${data.fileName}`, margin, y);
  doc.text(`Inspection Date: ${dateStr}`, pageWidth - margin - 75, y);

  y += 6;
  doc.text(`System ID: VB-INFRA-${data.id.toString().padStart(6, "0")}`, margin, y);
  doc.text("Entity: City Infrastructure Dept.", pageWidth - margin - 75, y);

  // Divider
  y += 5;
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  // -------------------------------------------------------------
  // CORE METRICS GRID (Two Columns)
  // -------------------------------------------------------------
  y += 8;
  const colWidth = (pageWidth - 2 * margin - 6) / 2; // ~87mm

  // Box 1: Assessment Metrics
  doc.setFillColor(lightSlate[0], lightSlate[1], lightSlate[2]);
  doc.roundedRect(margin, y, colWidth, 42, 2, 2, "F");

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CORE METRICS", margin + 6, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);

  doc.text(`Structure Category:`, margin + 6, y + 16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(data.structureType.toUpperCase(), margin + colWidth - 25, y + 16);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Defect Count:`, margin + 6, y + 24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`${data.defectCount} detected`, margin + colWidth - 25, y + 24);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Model Confidence:`, margin + 6, y + 32);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(
    data.confidenceScore ? `${Math.round(data.confidenceScore * 100)}%` : "N/A",
    margin + colWidth - 25,
    y + 32
  );

  // Box 2: Health Rating
  doc.setFillColor(lightSlate[0], lightSlate[1], lightSlate[2]);
  doc.roundedRect(margin + colWidth + 6, y, colWidth, 42, 2, 2, "F");

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("HEALTH ASSESSMENT", margin + colWidth + 12, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Diagnostic Severity:`, margin + colWidth + 12, y + 16);
  
  // Severity Badge/Highlight
  doc.setFillColor(sevColor[0], sevColor[1], sevColor[2]);
  doc.roundedRect(margin + colWidth + colWidth - 28, y + 12, 22, 5, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(sevLabel, margin + colWidth + colWidth - 26, y + 15.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Integrity Rating:`, margin + colWidth + 12, y + 24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`${healthScore}/100`, margin + colWidth + colWidth - 18, y + 24);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Analysis Latency:`, margin + colWidth + 12, y + 32);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`${data.analysisSpeedMs} ms`, margin + colWidth + colWidth - 18, y + 32);

  // -------------------------------------------------------------
  // VISUAL EVIDENCE & DEFECT DETAILS
  // -------------------------------------------------------------
  y += 50;

  // Column left: Image thumbnail
  const imgWidth = 80;
  const imgHeight = 55;

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Visual Evidence", margin, y);

  if (data.originalImageUrl) {
    try {
      // Draw thumbnail box border
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.rect(margin - 1, y + 3.5, imgWidth + 2, imgHeight + 2);
      
      // Determine base64 type
      let format = "JPEG";
      if (data.originalImageUrl.includes("image/png")) format = "PNG";
      
      doc.addImage(data.originalImageUrl, format, margin, y + 4.5, imgWidth, imgHeight);
    } catch (e) {
      // Fallback if image fails to render
      doc.setFillColor(lightSlate[0], lightSlate[1], lightSlate[2]);
      doc.rect(margin, y + 4, imgWidth, imgHeight, "F");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text("Image rendering not supported", margin + 15, y + 30);
    }
  } else {
    doc.setFillColor(lightSlate[0], lightSlate[1], lightSlate[2]);
    doc.rect(margin, y + 4, imgWidth, imgHeight, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text("No visual evidence uploaded", margin + 20, y + 30);
  }

  // Column right: Defect Details
  const rightColX = margin + imgWidth + 8;
  const rightColWidth = pageWidth - rightColX - margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Detection Details", rightColX, y);

  let defectY = y + 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text("Acoustic / Visual Defect Types:", rightColX, defectY);

  defectY += 6;
  if (data.defectTypes) {
    try {
      const parsed: string[] = JSON.parse(data.defectTypes);
      if (Array.isArray(parsed) && parsed.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        
        parsed.forEach((dt, idx) => {
          const cleanLabel = dt.replace(/_/g, " ").toUpperCase();
          doc.text(`• ${cleanLabel}`, rightColX + 2, defectY + idx * 5.5);
        });
      } else {
        doc.setFont("helvetica", "italic");
        doc.text("No specific types identified", rightColX + 2, defectY);
      }
    } catch (e) {
      doc.setFont("helvetica", "italic");
      doc.text("No specific types identified", rightColX + 2, defectY);
    }
  } else {
    doc.setFont("helvetica", "italic");
    doc.text("No defects detected in current scan", rightColX + 2, defectY);
  }

  // -------------------------------------------------------------
  // MAINTENANCE ACTION PLAN (Recommendations)
  // -------------------------------------------------------------
  y += 68;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text("AI Prescribed Actions & Recommendations", margin, y);

  y += 5;
  const recList = data.recommendations || [];
  if (recList.length > 0) {
    recList.slice(0, 2).forEach((rec, idx) => {
      const cardY = y + idx * 26;
      doc.setFillColor(lightSlate[0], lightSlate[1], lightSlate[2]);
      doc.roundedRect(margin, cardY, pageWidth - 2 * margin, 22, 1.5, 1.5, "F");

      // Recommendation Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(rec.title, margin + 4, cardY + 6);

      // Recommendation Severity badge
      const recSevColor = severityColors[rec.severity === "critical" ? "high" : rec.severity === "warning" ? "medium" : "low"] || severityColors.none;
      doc.setFillColor(recSevColor[0], recSevColor[1], recSevColor[2]);
      doc.circle(margin + 4 + doc.getTextWidth(rec.title) + 5, cardY + 4.5, 1.5, "F");

      // Recommendation Description
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      
      // Multi-line split for description to prevent overflow
      const splitDesc = doc.splitTextToSize(rec.description, pageWidth - 2 * margin - 8);
      doc.text(splitDesc, margin + 4, cardY + 12);
    });
  } else {
    doc.setFillColor(lightSlate[0], lightSlate[1], lightSlate[2]);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 15, 1.5, 1.5, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text("No high-priority recommendations required. Continue regular inspections.", margin + 4, y + 9);
  }

  // -------------------------------------------------------------
  // FOOTER BLOCK
  // -------------------------------------------------------------
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(
    "Generated by VisionBuild AI Structural Inspection System",
    margin,
    pageHeight - 12
  );
  
  doc.text(
    "Confidential Document • For Engineering Review Only",
    pageWidth - margin - 75,
    pageHeight - 12
  );

  // Trigger browser download
  const cleanFileName = data.fileName.split(".")[0] || "structural";
  doc.save(`VisionBuild_Report_${cleanFileName}_${data.id}.pdf`);
}
