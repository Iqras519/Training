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
  high: "text-destructive bg-destructive/10 border-destructive/30",
  medium: "text-[hsl(38,92%,50%)] bg-[hsl(38,92%,50%)]/10 border-[hsl(38,92%,50%)]/30",
  low: "text-[hsl(160,84%,39%)] bg-[hsl(160,84%,39%)]/10 border-[hsl(160,84%,39%)]/30",
  none: "text-muted-foreground bg-muted/50 border-border",
  completed: "text-[hsl(160,84%,39%)] bg-[hsl(160,84%,39%)]/10 border-[hsl(160,84%,39%)]/30",
};

const TOOLTIP_STYLE = {
  background: "hsl(220,15%,13%)",
  border: "1px solid hsl(220,15%,22%)",
  borderRadius: "8px",
  color: "hsl(210,20%,98%)",
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
    <div className="p-6 space-y-6">
      {/* Full History Chart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Defect Detection History</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {historyLoading ? (
              <Skeleton className="w-full h-64" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={history || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="defGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(189,94%,43%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(189,94%,43%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="imgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160,84%,39%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(160,84%,39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,20%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(215,20%,55%)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(215,20%,55%)" }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="defectsFound" name="Defects Found" stroke="hsl(189,94%,43%)" fill="url(#defGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="imagesChecked" name="Images Checked" stroke="hsl(160,84%,39%)" fill="url(#imgGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Defect Distribution by Type</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
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
                      paddingAngle={3}
                    >
                      {(distribution || []).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: any) => [`${v}%`, "Share"]}
                    />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Analysis Count by Structure</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {distLoading ? (
                <Skeleton className="w-full h-52" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,20%)" />
                    <XAxis dataKey="type" tick={{ fontSize: 11, fill: "hsl(215,20%,55%)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(215,20%,55%)" }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
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
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-sm font-semibold">All Analyses</CardTitle>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs" data-testid="filter-type">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="bridge">Bridge</SelectItem>
                    <SelectItem value="road">Road</SelectItem>
                    <SelectItem value="wall">Wall</SelectItem>
                    <SelectItem value="building">Building</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs" data-testid="filter-severity">
                    <SelectValue placeholder="All Severity" />
                  </SelectTrigger>
                  <SelectContent>
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
          <CardContent className="pt-0">
            {analysesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No analyses match the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">File</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Severity</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Health Score</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Defects</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Confidence</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Speed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a, i) => (
                      <motion.tr
                        key={a.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                        data-testid={`analytics-row-${a.id}`}
                      >
                        <td className="py-2.5 px-2 text-foreground truncate max-w-[120px]">{a.fileName}</td>
                        <td className="py-2.5 px-2 capitalize text-muted-foreground">{a.structureType}</td>
                        <td className="py-2.5 px-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${SEV_CLASSES[a.severity] || SEV_CLASSES.none}`}>
                            {a.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {(a as any).healthScore !== null && (a as any).healthScore !== undefined ? (() => {
                            const hs = (a as any).healthScore;
                            let label = "Excellent";
                            let dotColor = "bg-[hsl(160,84%,39%)]";
                            let textColor = "text-[hsl(160,84%,39%)]";
                            if (hs < 50) {
                              label = "Critical";
                              dotColor = "bg-destructive";
                              textColor = "text-destructive";
                            } else if (hs < 70) {
                              label = "Moderate";
                              dotColor = "bg-[hsl(38,92%,50%)]";
                              textColor = "text-[hsl(38,92%,50%)]";
                            } else if (hs < 90) {
                              label = "Good";
                              dotColor = "bg-[hsl(189,94%,43%)]";
                              textColor = "text-[hsl(189,94%,43%)]";
                            }
                            return (
                              <div className="flex items-center justify-end gap-1.5 font-medium">
                                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                <span className={textColor}>{hs}</span>
                                <span className="text-[10px] text-muted-foreground font-normal">({label})</span>
                              </div>
                            );
                          })() : "—"}
                        </td>
                        <td className="py-2.5 px-2 text-right text-foreground">{a.defectCount ?? 0}</td>
                        <td className="py-2.5 px-2 text-right text-muted-foreground">
                          {a.confidenceScore ? `${Math.round(a.confidenceScore * 100)}%` : "—"}
                        </td>
                        <td className="py-2.5 px-2 text-right text-muted-foreground">
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
