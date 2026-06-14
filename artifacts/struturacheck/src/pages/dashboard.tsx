import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Activity, ShieldAlert, Clock, Image, FileText, Loader2, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { generatePDFReport } from "@/lib/pdf-generator";
import {
  useGetStatsSummary,
  useGetStatsHistory,
  useGetDefectDistribution,
  useListAnalyses,
  getGetStatsSummaryQueryKey,
  getGetStatsHistoryQueryKey,
  getGetDefectDistributionQueryKey,
  getListAnalysesQueryKey,
  customFetch,
} from "@workspace/api-client-react";

interface DashboardMapProps {
  analyses: any[];
}

function DashboardMap({ analyses }: DashboardMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  const locatedAnalyses = (analyses || []).filter(
    (a) => a.latitude !== null && a.longitude !== null && a.latitude !== undefined && a.longitude !== undefined
  );

  // 1. Initialize map once on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([20, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapRef.current = map;

    // Force recalculation of container size after mounting to prevent gray/invisible tiles
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersGroupRef.current = null;
      }
    };
  }, []);

  // 2. Update markers and view bounds dynamically
  const locatedKey = locatedAnalyses.map((a) => `${a.id}-${a.latitude}-${a.longitude}-${a.severity}-${a.healthScore}`).join(",");

  useEffect(() => {
    const map = mapRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    if (locatedAnalyses.length === 0) {
      map.setView([20, 0], 2);
      return;
    }

    const bounds = L.latLngBounds(locatedAnalyses.map(a => [Number(a.latitude), Number(a.longitude)]));
    map.fitBounds(bounds, { maxZoom: 12, padding: [40, 40] });

    locatedAnalyses.forEach((a) => {
      const lat = Number(a.latitude);
      const lng = Number(a.longitude);

      // Severity-based marker colors:
      // High severity -> Red marker
      // Medium severity -> Yellow marker
      // Low/None severity -> Green marker
      let markerColor = "#10b981"; // Emerald Green for Low/None
      if (a.severity === "high") {
        markerColor = "#ef4444"; // Red
      } else if (a.severity === "medium") {
        markerColor = "#f59e0b"; // Amber Yellow
      }

      const customIcon = L.divIcon({
        html: `
          <div style="
            position: relative;
            width: 22px;
            height: 22px;
            background-color: ${markerColor};
            border: 2px solid rgba(255, 255, 255, 0.95);
            border-radius: 50%;
            box-shadow: 0 0 15px ${markerColor};
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div class="map-pulse-ring" style="background-color: ${markerColor};"></div>
            <div style="
              width: 6px;
              height: 6px;
              background-color: white;
              border-radius: 50%;
            "></div>
          </div>
        `,
        className: "custom-map-pin",
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -11],
      });

      const formatDate = (dateStr: string | Date) => {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, "0");
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };

      const capitalize = (str: string) => {
        if (!str) return "—";
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      };

      const buildingNameVal = a.buildingName || a.fileName;
      const structTypeVal = capitalize(a.structureType);
      const materialTypeVal = a.materialType ? capitalize(a.materialType) : "Unknown";
      const severityVal = capitalize(a.severity);
      const confidenceVal = a.confidenceScore ? `${Math.round(a.confidenceScore * 100)}%` : "—";
      const dateVal = a.createdAt ? formatDate(a.createdAt) : "—";

      const popupContent = `
        <div class="text-xs p-2.5 text-slate-200 font-sans leading-relaxed bg-slate-950/95 border border-white/10 rounded-lg shadow-xl" style="min-width: 160px; backdrop-filter: blur(4px);">
          <h4 class="font-bold text-sm text-white border-b border-white/5 pb-1 mb-1.5" style="margin: 0;">${buildingNameVal}</h4>
          <p style="margin: 0; color: #94a3b8;">Type: <span style="color: #cbd5e1; font-weight: 500;">${structTypeVal}</span></p>
          <p style="margin: 0; color: #94a3b8;">Material: <span style="color: #cbd5e1; font-weight: 500;">${materialTypeVal}</span></p>
          <p style="margin: 4px 0 0 0; color: #94a3b8;">Severity: <span style="font-weight: 600; color: ${markerColor};">${severityVal}</span></p>
          <p style="margin: 0; color: #94a3b8;">Confidence: <span style="color: #e2e8f0; font-weight: 500;">${confidenceVal}</span></p>
          <p style="margin: 0; color: #94a3b8;">Date: <span style="color: #e2e8f0; font-weight: 500;">${dateVal}</span></p>
        </div>
      `;

      L.marker([lat, lng], { icon: customIcon })
        .addTo(markersGroup)
        .bindPopup(popupContent);
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [locatedKey]);

  return (
    <Card className="glass-card shadow-lg shadow-cyan-500/5">
      <CardHeader className="pb-3 border-b border-white/5">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground tracking-wider uppercase">
          <MapPin className="w-4 h-4 text-cyan-400 animate-pulse" />
          Inspected Assets Geospatial Telemetry
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 dark-map-container">
        <div ref={mapContainerRef} className="w-full h-[340px] rounded-lg border border-white/10 overflow-hidden shadow-inner" />
        {locatedAnalyses.length === 0 && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center font-mono">
            // No location-enabled analyses found. Coordinate mapping inactive.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const COLORS = ["hsl(189,94%,43%)", "hsl(160,84%,39%)", "hsl(38,92%,50%)", "hsl(0,84.2%,60.2%)"];

const SEVERITY_COLORS: Record<string, string> = {
  high: "text-red-400 bg-red-500/10 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]",
  low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
  none: "text-slate-400 bg-slate-500/10 border-slate-500/30",
};

function SparkLine({ data, color }: { data: number[]; color: string }) {
  const sparkData = data.map((v, i) => ({ v, i }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} fill={`url(#sg-${color})`} strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };


function AnimatedCounter({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }

    const duration = 1000;
    const startTime = performance.now();

    const updateCount = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeProgress = progress * (2 - progress);
      const current = Math.floor(easeProgress * (end - start) + start);
      
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(updateCount);
  }, [value]);

  return <>{count.toLocaleString()}</>;
}

export default function DashboardPage() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const { toast } = useToast();

  const handleDownloadPDF = async (analysisId: number) => {
    setDownloadingId(analysisId);
    try {
      const reportData = await customFetch<any>(`/api/reports/${analysisId}`);
      generatePDFReport(reportData);
      toast({ title: "Report downloaded", description: "Your PDF report has been generated successfully." });
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err?.message || "Could not retrieve report data",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const { data: summary, isLoading: summaryLoading } = useGetStatsSummary({
    query: { queryKey: getGetStatsSummaryQueryKey() },
  });
  const { data: history, isLoading: historyLoading } = useGetStatsHistory({
    query: { queryKey: getGetStatsHistoryQueryKey() },
  });
  const { data: distribution } = useGetDefectDistribution({
    query: { queryKey: getGetDefectDistributionQueryKey() },
  });
  const { data: analyses } = useListAnalyses({
    query: { queryKey: getListAnalysesQueryKey() },
  });

  const recentAnalyses = analyses?.slice(0, 6) || [];
  const sparklineData = history?.slice(-8).map((h) => h.defectsFound) || [0, 2, 1, 3, 2, 4, 3, 5];

  return (
    <div className="relative min-h-full p-6 sm:p-8 space-y-8 z-10">

      {/* KPI Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10"
      >
        {/* Total Images */}
        <motion.div variants={item}>
          <Card className="glass-card card-glow-cyan overflow-hidden" data-testid="kpi-total-images">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Image className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold font-mono">
                  <TrendingUp className="w-3 h-3" />
                  {summary?.trendPercent !== undefined ? `+${summary.trendPercent}%` : "+12%"}
                </div>
              </div>
              {summaryLoading ? (
                <Skeleton className="h-8 w-20 mb-1" />
              ) : (
                <div className="text-3xl font-bold text-foreground tracking-tight">
                  <AnimatedCounter value={summary?.totalImagesChecked ?? 0} />
                </div>
              )}
              <div className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">Total Images Checked</div>
              <div className="mt-4">
                <SparkLine data={sparklineData} color="hsl(189,94%,43%)" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Defects Found */}
        <motion.div variants={item}>
          <Card className="glass-card card-glow-destructive" data-testid="kpi-defects">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                </div>
              </div>
              {summaryLoading ? (
                <Skeleton className="h-8 w-20 mb-1" />
              ) : (
                <div className="text-3xl font-bold text-foreground tracking-tight">
                  <AnimatedCounter value={summary?.totalDefectsFound ?? 0} />
                </div>
              )}
              <div className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">Defects Detected</div>
              <div className="flex gap-2 mt-4 flex-wrap">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  High: {summary?.highSeverityCount ?? 0}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Med: {summary?.mediumSeverityCount ?? 0}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Low: {summary?.lowSeverityCount ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Avg Speed */}
        <motion.div variants={item}>
          <Card className="glass-card card-glow-success" data-testid="kpi-speed">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-emerald-400" />
                </div>
                <Activity className="w-4 h-4 text-slate-400" />
              </div>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24 mb-1" />
              ) : (
                <div className="text-3xl font-bold text-foreground tracking-tight">
                  <AnimatedCounter value={Math.round(summary?.avgAnalysisSpeedMs ?? 0)} />
                  <span className="text-sm font-normal text-slate-400 ml-1">ms</span>
                </div>
              )}
              <div className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">Avg Analysis Speed</div>
              <div className="mt-4">
                <SparkLine data={[350, 410, 390, 480, 420, 380, 360, 395]} color="hsl(160,84%,39%)" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Central Map Row */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="relative z-10"
      >
        <DashboardMap analyses={analyses || []} />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* History Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="glass-card shadow-lg h-full">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider">Defect Detection History</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {historyLoading ? (
                <Skeleton className="w-full h-48" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={history || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="defectsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(189,94%,43%)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(189,94%,43%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="imagesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(160,84%,39%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(160,84%,39%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "rgba(255, 255, 255, 0.5)" }}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "rgba(255, 255, 255, 0.5)" }} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(13, 15, 22, 0.85)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "8px",
                        color: "rgba(255, 255, 255, 0.9)",
                        fontSize: "12px",
                      }}
                    />
                    <Area type="monotone" dataKey="defectsFound" name="Defects" stroke="hsl(189,94%,43%)" fill="url(#defectsGrad)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="imagesChecked" name="Images" stroke="hsl(160,84%,39%)" fill="url(#imagesGrad)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Distribution Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <Card className="glass-card shadow-lg h-full">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider">Defect Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={distribution || []}
                    dataKey="percentage"
                    nameKey="type"
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {(distribution || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(13, 15, 22, 0.85)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "rgba(255, 255, 255, 0.9)",
                    }}
                    formatter={(v: any) => [`${v}%`, "Share"]}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Analyses */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.3 }}
        className="relative z-10"
      >
        <Card className="glass-card shadow-lg">
          <CardHeader className="pb-3 border-b border-white/5">
            <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider">Recent Analyses Log</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {recentAnalyses.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm font-mono">
                // No telemetry logs recorded. Initiate image upload.
              </div>
            ) : (
              <div className="space-y-3">
                {recentAnalyses.map((analysis) => {
                  const isExpanded = expandedId === analysis.id;
                  return (
                    <div
                      key={analysis.id}
                      className={`border rounded-lg overflow-hidden transition-all duration-300 ${
                        isExpanded
                          ? "border-cyan-500/30 bg-slate-950/60 shadow-[0_0_20px_rgba(6,182,212,0.08)]"
                          : "border-white/5 bg-slate-950/20 hover:border-white/15 hover:bg-slate-950/40"
                      }`}
                      data-testid={`analysis-container-${analysis.id}`}
                    >
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : analysis.id)}
                        className="flex items-center gap-4 px-4 py-3 cursor-pointer select-none"
                        data-testid={`analysis-row-${analysis.id}`}
                      >
                        <div className="w-9 h-9 rounded bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
                          {analysis.originalImageUrl ? (
                            <img src={analysis.originalImageUrl} alt="" className="w-full h-full object-cover transition-transform duration-300 hover:scale-110" />
                          ) : (
                            <Image className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{analysis.fileName}</div>
                          <div className="text-xs text-slate-400 capitalize">{analysis.structureType}</div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span className="text-xs text-slate-400 font-mono">{analysis.defectCount ?? 0} defects</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded border capitalize font-medium ${SEVERITY_COLORS[analysis.severity] || SEVERITY_COLORS.none}`}
                            data-testid={`severity-${analysis.id}`}
                          >
                            {analysis.severity}
                          </span>
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="border-t border-white/5 bg-slate-950/45 px-4 py-4 text-xs space-y-3.5 overflow-hidden"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div className="flex flex-wrap gap-x-6 gap-y-2">
                                <div>
                                  <span className="text-slate-400">Confidence: </span>
                                  <span className="font-semibold text-white">
                                    {analysis.confidenceScore ? `${Math.round(analysis.confidenceScore * 100)}%` : "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400">Speed: </span>
                                  <span className="font-semibold text-white">
                                    {analysis.analysisSpeedMs ? `${analysis.analysisSpeedMs}ms` : "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400">Severity: </span>
                                  <span className="font-semibold text-white capitalize">
                                    {analysis.severity}
                                  </span>
                                </div>
                                {(analysis as any).materialType && (
                                  <div>
                                    <span className="text-slate-400">Material: </span>
                                    <span className="font-semibold text-white capitalize">
                                      {(analysis as any).materialType}
                                    </span>
                                  </div>
                                )}
                                {(analysis as any).buildingAge !== null && (analysis as any).buildingAge !== undefined && (
                                  <div>
                                    <span className="text-slate-400">Age: </span>
                                    <span className="font-semibold text-white">
                                      {(analysis as any).buildingAge} yrs
                                    </span>
                                  </div>
                                )}
                                {(analysis as any).numberOfFloors !== null && (analysis as any).numberOfFloors !== undefined && (
                                  <div>
                                    <span className="text-slate-400">Floors: </span>
                                    <span className="font-semibold text-white">
                                      {(analysis as any).numberOfFloors}
                                    </span>
                                  </div>
                                )}
                                {(analysis as any).healthScore !== null && (analysis as any).healthScore !== undefined && (() => {
                                  const hs = (analysis as any).healthScore;
                                  let label = "Excellent";
                                  let color = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
                                  if (hs < 50) {
                                    label = "Critical";
                                    color = "text-red-400 bg-red-500/10 border-red-500/30";
                                  } else if (hs < 70) {
                                    label = "Moderate";
                                    color = "text-amber-400 bg-amber-500/10 border-amber-500/30";
                                  } else if (hs < 90) {
                                    label = "Good";
                                    color = "text-cyan-400 bg-cyan-500/10 border-cyan-500/30";
                                  }
                                  return (
                                    <div>
                                      <span className="text-slate-400">Health Score: </span>
                                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${color}`}>
                                        {hs} - {label}
                                      </span>
                                    </div>
                                  );
                                })()}
                                {(analysis as any).buildingName && (
                                  <div>
                                    <span className="text-slate-400">Building: </span>
                                    <span className="font-semibold text-white">
                                      {(analysis as any).buildingName}
                                    </span>
                                  </div>
                                )}
                                {(analysis as any).address && (
                                  <div>
                                    <span className="text-slate-400">Location: </span>
                                    <span className="font-semibold text-white">
                                      {(analysis as any).address}
                                      {(analysis as any).city ? `, ${(analysis as any).city}` : ""}
                                    </span>
                                  </div>
                                )}
                                {(analysis as any).latitude !== null && (analysis as any).latitude !== undefined && (
                                  <div>
                                    <span className="text-slate-400">GPS: </span>
                                    <span className="font-semibold text-white font-mono">
                                      {Number((analysis as any).latitude).toFixed(4)}, {Number((analysis as any).longitude).toFixed(4)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-3">
                                {analysis.originalImageUrl && (
                                  <img
                                    src={analysis.originalImageUrl}
                                    alt="Analysis Preview"
                                    className="w-16 h-12 object-cover rounded border border-white/10 bg-slate-900"
                                  />
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadPDF(analysis.id);
                                  }}
                                  disabled={downloadingId === analysis.id}
                                  data-testid={`button-download-pdf-${analysis.id}`}
                                >
                                  {downloadingId === analysis.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                                  )}
                                  PDF Report
                                </Button>
                              </div>
                            </div>

                            {analysis.defectTypes && (() => {
                              try {
                                const parsed = JSON.parse(analysis.defectTypes);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                  return (
                                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
                                      <span className="text-slate-400 mr-1">Defect Types:</span>
                                      {parsed.map((dt: string) => (
                                        <Badge key={dt} variant="outline" className="text-[10px] py-0 px-2 capitalize border-white/10 text-slate-300">
                                          {dt.replace(/_/g, " ")}
                                        </Badge>
                                      ))}
                                    </div>
                                  );
                                }
                              } catch (e) {}
                              return null;
                            })()}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
