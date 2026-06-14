import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp,
  FileText, Zap, Calendar, Loader2, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  useListRecommendations,
  useGenerateWorkOrder,
  useSetInspectionReminder,
  getListRecommendationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Recommendation {
  id: number;
  analysisId: number;
  severity: string;
  title: string;
  description: string;
  reasoning: string;
  workOrderGenerated: boolean;
  reminderDate: string | null;
  createdAt: string;
}

const SEV_CONFIG = {
  critical: {
    cardClass: "glass-card-critical",
    badge: "text-red-400 bg-red-500/10 border-red-500/25 font-mono text-[10px] uppercase tracking-wider",
    icon: AlertTriangle,
    iconColor: "text-red-400",
    label: "Immediate Action Required",
    dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse",
  },
  warning: {
    cardClass: "glass-card-warning",
    badge: "text-amber-400 bg-amber-500/10 border-amber-500/25 font-mono text-[10px] uppercase tracking-wider",
    icon: Clock,
    iconColor: "text-amber-400",
    label: "Continuous Monitoring",
    dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse",
  },
  safe: {
    cardClass: "glass-card-safe",
    badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25 font-mono text-[10px] uppercase tracking-wider",
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
    label: "Safe / No Action",
    dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
  },
};

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-2 text-xs text-slate-300 leading-relaxed font-sans">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return <h3 key={i} className="text-xs font-bold text-cyan-400 mt-4 first:mt-0 uppercase tracking-wider font-mono">{line.slice(3)}</h3>;
        }
        if (line.startsWith("### ")) {
          return <h4 key={i} className="text-xs font-semibold text-white/95 mt-3">{line.slice(4)}</h4>;
        }
        if (line.startsWith("- **")) {
          const match = line.match(/- \*\*(.+?)\*\*(.*)/);
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="text-cyan-400 mt-1 select-none text-[10px]">•</span>
              <span>
                <strong className="text-white font-semibold">{match?.[1]}</strong>
                {match?.[2]}
              </span>
            </div>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="text-slate-500 mt-1 select-none text-[10px]">•</span>
              <span>{line.slice(2)}</span>
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-1.5" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [expanded, setExpanded] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const generateWO = useGenerateWorkOrder();
  const setReminder = useSetInspectionReminder();

  const conf = SEV_CONFIG[rec.severity as keyof typeof SEV_CONFIG] || SEV_CONFIG.safe;
  const Icon = conf.icon;

  const handleWorkOrder = () => {
    generateWO.mutate(
      { id: rec.id },
      {
        onSuccess: (res: any) => {
          queryClient.invalidateQueries({ queryKey: getListRecommendationsQueryKey() });
          toast({ title: "Work order generated", description: `Reference: ${res.reference}` });
        },
      }
    );
  };

  const handleReminder = () => {
    if (!reminderDate) return;
    setReminder.mutate(
      { id: rec.id, data: { reminderDate } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRecommendationsQueryKey() });
          toast({ title: "Reminder set", description: `Inspection scheduled for ${reminderDate}` });
          setReminderDate("");
        },
      }
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl overflow-hidden ${conf.cardClass}`}
      data-testid={`recommendation-${rec.id}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-900/60 border border-white/5`}>
            <Icon className={`w-4 h-4 ${conf.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-[10px] px-2.5 py-0.5 rounded border font-medium ${conf.badge}`}>
                {conf.label}
              </span>
              {rec.workOrderGenerated && (
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                  Work Order Created
                </span>
              )}
              {rec.reminderDate && (
                <span className="text-[10px] font-mono text-slate-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                  Reminder Scheduled: {rec.reminderDate}
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight">{rec.title}</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{rec.description}</p>
 
            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {rec.severity === "critical" && !rec.workOrderGenerated && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs bg-red-500/80 hover:bg-red-500 text-white font-medium border-0 shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all duration-200"
                  onClick={handleWorkOrder}
                  disabled={generateWO.isPending}
                  data-testid={`generate-wo-${rec.id}`}
                >
                  {generateWO.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
                  Generate Work Order
                </Button>
              )}
              {rec.severity === "warning" && !rec.reminderDate && (
                <div className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="h-7 text-xs w-36 bg-slate-950/50 border-white/10 text-white focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30 font-mono"
                    data-testid={`reminder-date-${rec.id}`}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                    onClick={handleReminder}
                    disabled={!reminderDate || setReminder.isPending}
                    data-testid={`set-reminder-${rec.id}`}
                  >
                    {setReminder.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Calendar className="w-3 h-3 mr-1" />}
                    Set Reminder
                  </Button>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200"
                data-testid={`download-report-${rec.id}`}
              >
                <FileText className="w-3 h-3 mr-1" />
                Download PDF Report
              </Button>
            </div>
 
            {/* Reasoning Accordion */}
            <div className="mt-4 border-t border-white/5 pt-3">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 hover:text-white transition-colors"
                data-testid={`toggle-reasoning-${rec.id}`}
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />}
                [AI Telemetry Reasoning]
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2.5 p-4 bg-slate-950/40 border border-white/5 rounded-lg shadow-inner backdrop-blur-sm">
                      <MarkdownContent content={rec.reasoning} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </CardContent>
    </motion.div>
  );
}

const SECTION_ORDER = ["critical", "warning", "safe"];

export default function RecommendationsPage() {
  const { data: recommendations, isLoading } = useListRecommendations({
    query: { queryKey: getListRecommendationsQueryKey() },
  });

  const queryClient = useQueryClient();

  const grouped = SECTION_ORDER.reduce<Record<string, Recommendation[]>>((acc, sev) => {
    acc[sev] = (recommendations || []).filter((r) => r.severity === sev) as Recommendation[];
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="p-6 sm:p-8 space-y-4 relative z-10">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full bg-slate-900/60 border border-white/5 rounded-xl" />
        ))}
      </div>
    );
  }

  const total = recommendations?.length || 0;

  return (
    <div className="p-6 sm:p-8 space-y-8 relative z-10">
      {/* Header summary */}
      <div className="flex items-center gap-4 flex-wrap bg-slate-950/30 border border-white/5 p-4 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>{total} active recommendation{total !== 1 ? "s" : ""} detected</span>
        </div>
        <div className="flex gap-2">
          {SECTION_ORDER.map((sev) => {
            const conf = SEV_CONFIG[sev as keyof typeof SEV_CONFIG];
            const count = grouped[sev]?.length || 0;
            if (count === 0) return null;
            return (
              <span key={sev} className={`text-[10px] px-2.5 py-0.5 rounded border font-medium ${conf.badge}`}>
                {count} {sev}
              </span>
            );
          })}
        </div>
      </div>

      {/* Sections */}
      {SECTION_ORDER.map((sev) => {
        const items = grouped[sev];
        if (!items || items.length === 0) return null;
        const conf = SEV_CONFIG[sev as keyof typeof SEV_CONFIG];
        return (
          <motion.div
            key={sev}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 pl-1">
              <div className={`w-2 h-2 rounded-full ${conf.dot}`} />
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{conf.label}</h2>
              <span className="text-xs text-slate-500 font-mono">({items.length})</span>
            </div>
            <div className="space-y-4">
              {items.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
            </div>
          </motion.div>
        );
      })}

      {total === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center glass-card rounded-2xl p-8">
          <ShieldCheck className="w-12 h-12 mb-3 text-slate-500 opacity-40" />
          <p className="text-sm font-semibold text-white">No Recommendations Yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">Analyze structures and trigger structural telemetry scans to generate AI-driven recommendation profiles.</p>
        </div>
      )}
    </div>
  );
}
