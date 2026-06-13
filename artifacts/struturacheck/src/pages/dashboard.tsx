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
      const hs = a.healthScore;

      let markerColor = "hsl(160,84%,39%)"; // Green (Excellent)
      let category = "Excellent";
      
      if (hs !== null && hs !== undefined) {
        if (hs < 50) {
          markerColor = "hsl(0,84.2%,60.2%)"; // Red (Critical)
          category = "Critical";
        } else if (hs < 70) {
          markerColor = "hsl(38,92%,50%)"; // Orange (Moderate)
          category = "Moderate";
        } else if (hs < 90) {
          markerColor = "hsl(189,94%,43%)"; // Teal (Good)
          category = "Good";
        }
      } else {
        if (a.severity === "high") {
          markerColor = "hsl(0,84.2%,60.2%)";
          category = "Critical (High Severity)";
        } else if (a.severity === "medium") {
          markerColor = "hsl(38,92%,50%)";
          category = "Moderate (Medium Severity)";
        } else if (a.severity === "low") {
          markerColor = "hsl(189,94%,43%)";
          category = "Good (Low Severity)";
        }
      }

      const customIcon = L.divIcon({
        html: `
          <div style="
            position: relative;
            width: 24px;
            height: 24px;
            background-color: ${markerColor};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 8px;
              height: 8px;
              background-color: white;
              border-radius: 50%;
            "></div>
          </div>
        `,
        className: "custom-map-pin",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
      });

      const popupContent = `
        <div class="text-xs p-1 text-slate-800 font-sans">
          <h4 class="font-bold text-sm text-slate-900" style="margin: 0 0 2px 0;">${a.buildingName || a.fileName}</h4>
          ${a.address ? `<p class="text-slate-600" style="margin: 0 0 4px 0; font-size: 10px;">${a.address}${a.city ? `, ${a.city}` : ""}</p>` : ""}
          <div style="margin-top: 6px; display: flex; align-items: center; gap: 4px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: ${markerColor};"></span>
            <span class="font-bold text-[10px]" style="color: ${markerColor}; text-transform: uppercase;">${category}</span>
            ${hs !== null && hs !== undefined ? `<span class="text-slate-400 font-semibold text-[10px]">(${hs}/100)</span>` : ""}
          </div>
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
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
          <MapPin className="w-4 h-4 text-primary" />
          Inspected Assets Location Map
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div ref={mapContainerRef} className="w-full h-[320px] rounded-lg border border-border overflow-hidden" />
        {locatedAnalyses.length === 0 && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            No location-enabled analyses found. Specify building coordinates when performing inspections to see them pinned here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const COLORS = ["hsl(189,94%,43%)", "hsl(160,84%,39%)", "hsl(38,92%,50%)", "hsl(0,84.2%,60.2%)"];

const SEVERITY_COLORS: Record<string, string> = {
  high: "text-destructive bg-destructive/10 border-destructive/30",
  medium: "text-[hsl(38,92%,50%)] bg-[hsl(38,92%,50%)]/10 border-[hsl(38,92%,50%)]/30",
  low: "text-[hsl(160,84%,39%)] bg-[hsl(160,84%,39%)]/10 border-[hsl(160,84%,39%)]/30",
  none: "text-muted-foreground bg-muted/50 border-border",
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
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {/* Total Images */}
        <motion.div variants={item}>
          <Card className="border-border bg-card overflow-hidden" data-testid="kpi-total-images">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Image className="w-4 h-4 text-primary" />
                </div>
                <div className="flex items-center gap-1 text-xs text-[hsl(160,84%,39%)]">
                  <TrendingUp className="w-3 h-3" />
                  {summary?.trendPercent !== undefined ? `+${summary.trendPercent}%` : "+12%"}
                </div>
              </div>
              {summaryLoading ? (
                <Skeleton className="h-8 w-20 mb-1" />
              ) : (
                <div className="text-3xl font-bold text-foreground">{summary?.totalImagesChecked ?? 0}</div>
              )}
              <div className="text-xs text-muted-foreground mt-1">Total Images Checked</div>
              <div className="mt-2">
                <SparkLine data={sparklineData} color="hsl(189,94%,43%)" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Defects Found */}
        <motion.div variants={item}>
          <Card className="border-border bg-card" data-testid="kpi-defects">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 text-destructive" />
                </div>
              </div>
              {summaryLoading ? (
                <Skeleton className="h-8 w-20 mb-1" />
              ) : (
                <div className="text-3xl font-bold text-foreground">{summary?.totalDefectsFound ?? 0}</div>
              )}
              <div className="text-xs text-muted-foreground mt-1">Defects Detected</div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                  High: {summary?.highSeverityCount ?? 0}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)] border border-[hsl(38,92%,50%)]/20">
                  Med: {summary?.mediumSeverityCount ?? 0}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(160,84%,39%)]/10 text-[hsl(160,84%,39%)] border border-[hsl(160,84%,39%)]/20">
                  Low: {summary?.lowSeverityCount ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Avg Speed */}
        <motion.div variants={item}>
          <Card className="border-border bg-card" data-testid="kpi-speed">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-[hsl(160,84%,39%)]/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-[hsl(160,84%,39%)]" />
                </div>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </div>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24 mb-1" />
              ) : (
                <div className="text-3xl font-bold text-foreground">
                  {Math.round(summary?.avgAnalysisSpeedMs ?? 0)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">ms</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">Avg Analysis Speed</div>
              <div className="mt-2">
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
      >
        <DashboardMap analyses={analyses || []} />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* History Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="border-border bg-card h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Defect Detection History</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {historyLoading ? (
                <Skeleton className="w-full h-48" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={history || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="defectsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(189,94%,43%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(189,94%,43%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="imagesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(160,84%,39%)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(160,84%,39%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,20%)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "hsl(215,20%,55%)" }}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(215,20%,55%)" }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(220,15%,13%)",
                        border: "1px solid hsl(220,15%,22%)",
                        borderRadius: "8px",
                        color: "hsl(210,20%,98%)",
                        fontSize: "12px",
                      }}
                    />
                    <Area type="monotone" dataKey="defectsFound" name="Defects" stroke="hsl(189,94%,43%)" fill="url(#defectsGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="imagesChecked" name="Images" stroke="hsl(160,84%,39%)" fill="url(#imagesGrad)" strokeWidth={2} />
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
          <Card className="border-border bg-card h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Defect Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={distribution || []}
                    dataKey="percentage"
                    nameKey="type"
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {(distribution || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(220,15%,13%)",
                      border: "1px solid hsl(220,15%,22%)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(210,20%,98%)",
                    }}
                    formatter={(v: any) => [`${v}%`, "Share"]}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
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
      >
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Recent Analyses</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentAnalyses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No analyses yet. Upload an image to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {recentAnalyses.map((analysis) => {
                  const isExpanded = expandedId === analysis.id;
                  return (
                    <div
                      key={analysis.id}
                      className="border border-border rounded-lg overflow-hidden bg-card"
                      data-testid={`analysis-container-${analysis.id}`}
                    >
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : analysis.id)}
                        className="flex items-center gap-4 px-3 py-2.5 hover:bg-accent/50 cursor-pointer transition-colors"
                        data-testid={`analysis-row-${analysis.id}`}
                      >
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {analysis.originalImageUrl ? (
                            <img src={analysis.originalImageUrl} alt="" className="w-8 h-8 object-cover" />
                          ) : (
                            <Image className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{analysis.fileName}</div>
                          <div className="text-xs text-muted-foreground capitalize">{analysis.structureType}</div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">{analysis.defectCount ?? 0} defects</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border capitalize font-medium ${SEVERITY_COLORS[analysis.severity] || SEVERITY_COLORS.none}`}
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
                            transition={{ duration: 0.2 }}
                            className="border-t border-border bg-accent/5 px-4 py-3 text-xs space-y-2.5 overflow-hidden"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div className="flex gap-4">
                                <div>
                                  <span className="text-muted-foreground">Confidence: </span>
                                  <span className="font-semibold text-foreground">
                                    {analysis.confidenceScore ? `${Math.round(analysis.confidenceScore * 100)}%` : "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Speed: </span>
                                  <span className="font-semibold text-foreground">
                                    {analysis.analysisSpeedMs ? `${analysis.analysisSpeedMs}ms` : "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Severity: </span>
                                  <span className="font-semibold text-foreground capitalize">
                                    {analysis.severity}
                                  </span>
                                </div>
                                {(analysis as any).materialType && (
                                  <div>
                                    <span className="text-muted-foreground">Material: </span>
                                    <span className="font-semibold text-foreground capitalize">
                                      {(analysis as any).materialType}
                                    </span>
                                  </div>
                                )}
                                {(analysis as any).buildingAge !== null && (analysis as any).buildingAge !== undefined && (
                                  <div>
                                    <span className="text-muted-foreground">Age: </span>
                                    <span className="font-semibold text-foreground">
                                      {(analysis as any).buildingAge} yrs
                                    </span>
                                  </div>
                                )}
                                {(analysis as any).numberOfFloors !== null && (analysis as any).numberOfFloors !== undefined && (
                                  <div>
                                    <span className="text-muted-foreground">Floors: </span>
                                    <span className="font-semibold text-foreground">
                                      {(analysis as any).numberOfFloors}
                                    </span>
                                  </div>
                                )}
                                {(analysis as any).healthScore !== null && (analysis as any).healthScore !== undefined && (() => {
                                  const hs = (analysis as any).healthScore;
                                  let label = "Excellent";
                                  let color = "text-[hsl(160,84%,39%)] bg-[hsl(160,84%,39%)]/10 border-[hsl(160,84%,39%)]/30";
                                  if (hs < 50) {
                                    label = "Critical";
                                    color = "text-destructive bg-destructive/10 border-destructive/30";
                                  } else if (hs < 70) {
                                    label = "Moderate";
                                    color = "text-[hsl(38,92%,50%)] bg-[hsl(38,92%,50%)]/10 border-[hsl(38,92%,50%)]/30";
                                  } else if (hs < 90) {
                                    label = "Good";
                                    color = "text-[hsl(189,94%,43%)] bg-[hsl(189,94%,43%)]/10 border-[hsl(189,94%,43%)]/30";
                                  }
                                  return (
                                    <div>
                                      <span className="text-muted-foreground">Health Score: </span>
                                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${color}`}>
                                        {hs} - {label}
                                      </span>
                                    </div>
                                  );
                                })()}
                                {(analysis as any).buildingName && (
                                  <div>
                                    <span className="text-muted-foreground">Building: </span>
                                    <span className="font-semibold text-foreground">
                                      {(analysis as any).buildingName}
                                    </span>
                                  </div>
                                )}
                                {(analysis as any).address && (
                                  <div>
                                    <span className="text-muted-foreground">Location: </span>
                                    <span className="font-semibold text-foreground">
                                      {(analysis as any).address}
                                      {(analysis as any).city ? `, ${(analysis as any).city}` : ""}
                                    </span>
                                  </div>
                                )}
                                {(analysis as any).latitude !== null && (analysis as any).latitude !== undefined && (
                                  <div>
                                    <span className="text-muted-foreground">GPS: </span>
                                    <span className="font-semibold text-foreground">
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
                                    className="w-16 h-12 object-cover rounded border border-border bg-muted"
                                  />
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs border-primary text-primary hover:bg-primary/10"
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
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                      <span className="text-muted-foreground mr-1">Defect Types:</span>
                                      {parsed.map((dt: string) => (
                                        <Badge key={dt} variant="outline" className="text-[10px] py-0 px-1.5 capitalize">
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
