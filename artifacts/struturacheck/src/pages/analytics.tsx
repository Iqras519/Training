import { useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useGetStatsHistory,
  useGetDefectDistribution,
  useListAnalyses,
  getGetStatsHistoryQueryKey,
  getGetDefectDistributionQueryKey,
  getListAnalysesQueryKey,
} from "@workspace/api-client-react";

const COLORS = ["hsl(189,94%,43%)", "hsl(160,84%,39%)", "hsl(38,92%,50%)", "hsl(0,84.2%,60.2%)"];

const SEV_CLASSES: Record<string, string> = {
  high: "text-red-400 bg-red-500/10 border-red-500/30 font-mono shadow-[0_0_10px_rgba(239,68,68,0.1)]",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/30 font-mono shadow-[0_0_10px_rgba(245,158,11,0.1)]",
  low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 font-mono shadow-[0_0_10px_rgba(16,185,129,0.1)]",
  none: "text-slate-400 bg-slate-500/10 border-slate-500/30 font-mono",
  completed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 font-mono",
};

const TOOLTIP_STYLE = {
  background: "rgba(13, 15, 22, 0.85)",
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: "8px",
  color: "rgba(255, 255, 255, 0.9)",
  fontSize: "12px",
};

export default function AnalyticsPage() {
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: history, isLoading: historyLoading } = useGetStatsHistory({
    query: { queryKey: getGetStatsHistoryQueryKey() },
  });
  const { data: distribution, isLoading: distLoading } = useGetDefectDistribution({
    query: { queryKey: getGetDefectDistributionQueryKey() },
  });
  const { data: analyses, isLoading: analysesLoading } = useListAnalyses({
    query: { queryKey: getListAnalysesQueryKey() },
  });

  const filtered = (analyses || []).filter((a) => {
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (typeFilter !== "all" && a.structureType !== typeFilter) return false;
    return true;
  });

  const barData = (distribution || []).map((d, i) => ({
    ...d,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <div className="relative min-h-full p-6 sm:p-8 space-y-8 z-10">
      {/* Full History Chart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="glass-card shadow-lg">
          <CardHeader className="pb-3 border-b border-white/5">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">Defect Detection History</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {historyLoading ? (
              <Skeleton className="w-full h-64" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={history || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="defGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(189,94%,43%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(189,94%,43%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="imgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160,84%,39%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160,84%,39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "rgba(255, 255, 255, 0.5)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "rgba(255, 255, 255, 0.5)" }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="defectsFound" name="Defects Found" stroke="hsl(189,94%,43%)" fill="url(#defGrad)" strokeWidth={2.5} isAnimationActive={true} animationDuration={1400} animationEasing="ease-out" />
                  <Area type="monotone" dataKey="imagesChecked" name="Images Checked" stroke="hsl(160,84%,39%)" fill="url(#imgGrad)" strokeWidth={2.5} isAnimationActive={true} animationDuration={1400} animationEasing="ease-out" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}>
          <Card className="glass-card shadow-lg">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Defect Distribution by Type</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {distLoading ? (
                <Skeleton className="w-full h-52" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={distribution || []}
                      dataKey="percentage"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      isAnimationActive={true}
                      animationDuration={1300}
                      animationEasing="ease-out"
                    >
                      {(distribution || []).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: any) => [`${v}%`, "Share"]}
                    />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }}>
          <Card className="glass-card shadow-lg">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Analysis Count by Structure</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {distLoading ? (
                <Skeleton className="w-full h-52" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                    <XAxis dataKey="type" tick={{ fontSize: 11, fill: "rgba(255, 255, 255, 0.5)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "rgba(255, 255, 255, 0.5)" }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1400} animationEasing="ease-out">
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Analyses Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
        <Card className="glass-card shadow-lg">
          <CardHeader className="pb-3 border-b border-white/5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">All Analyses Log</CardTitle>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs border-white/10 bg-slate-950/40 text-slate-200" data-testid="filter-type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent className="glass-card">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="bridge">Bridge</SelectItem>
                    <SelectItem value="road">Road</SelectItem>
                    <SelectItem value="wall">Wall</SelectItem>
                    <SelectItem value="building">Building</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs border-white/10 bg-slate-950/40 text-slate-200" data-testid="filter-severity">
                    <SelectValue placeholder="All Severity" />
                  </SelectTrigger>
                  <SelectContent className="glass-card">
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {analysesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-mono text-sm">
                // No telemetry entries match the active criteria filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">File</th>
                      <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Type</th>
                      <th className="text-left py-2.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Severity</th>
                      <th className="text-right py-2.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Health Score</th>
                      <th className="text-right py-2.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Defects</th>
                      <th className="text-right py-2.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Confidence</th>
                      <th className="text-right py-2.5 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Speed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a, i) => (
                      <motion.tr
                        key={a.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-white/5 bg-slate-950/20 hover:bg-slate-950/40 hover:border-white/10 transition-all duration-200"
                        data-testid={`analytics-row-${a.id}`}
                      >
                        <td className="py-3 px-3 text-white font-medium truncate max-w-[120px]">{a.fileName}</td>
                        <td className="py-3 px-3 capitalize text-slate-300 font-mono text-xs">{a.structureType}</td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${SEV_CLASSES[a.severity] || SEV_CLASSES.none}`}>
                            {a.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {(a as any).healthScore !== null && (a as any).healthScore !== undefined ? (() => {
                            const hs = (a as any).healthScore;
                            let label = "Excellent";
                            let dotColor = "bg-emerald-400";
                            let textColor = "text-emerald-400";
                            if (hs < 50) {
                              label = "Critical";
                              dotColor = "bg-red-400";
                              textColor = "text-red-400";
                            } else if (hs < 70) {
                              label = "Moderate";
                              dotColor = "bg-amber-400";
                              textColor = "text-amber-400";
                            } else if (hs < 90) {
                              label = "Good";
                              dotColor = "bg-cyan-400";
                              textColor = "text-cyan-400";
                            }
                            return (
                              <div className="flex items-center justify-end gap-1.5 font-semibold">
                                <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
                                <span className={textColor}>{hs}</span>
                                <span className="text-[10px] text-slate-400 font-normal font-mono">({label})</span>
                              </div>
                            );
                          })() : "—"}
                        </td>
                        <td className="py-3 px-3 text-right text-white font-mono">{a.defectCount ?? 0}</td>
                        <td className="py-3 px-3 text-right text-slate-300 font-mono">
                          {a.confidenceScore ? `${Math.round(a.confidenceScore * 100)}%` : "—"}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-300 font-mono">
                          {a.analysisSpeedMs ? `${a.analysisSpeedMs}ms` : "—"}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
