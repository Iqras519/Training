import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, CheckCircle2, AlertTriangle, ShieldCheck, Loader2, Trash2, FileImage, FileText } from "lucide-react";
import { generatePDFReport } from "@/lib/pdf-generator";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateAnalysis, useDeleteAnalysis, getListAnalysesQueryKey, customFetch } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface FileItem {
  file: File;
  id: string;
  preview: string;
}

interface AnalysisResult {
  id: number;
  fileName: string;
  structureType: string;
  severity: string;
  defectCount: number | null;
  confidenceScore: number | null;
  analysisSpeedMs: number | null;
  defectTypes: string | null;
  buildingAge?: number | null;
  numberOfFloors?: number | null;
  materialType?: string | null;
  recommendations?: {
    id: number;
    severity: string;
    title: string;
    description: string;
    reasoning?: string;
  }[];
}

const STEPS = [
  "Uploading image...",
  "Analyzing pixels...",
  "Running AI model...",
  "Generating report...",
  "Complete!",
];

const SEVERITY_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  high: { color: "text-destructive border-destructive/40 bg-destructive/10", icon: AlertTriangle, label: "High Severity" },
  medium: { color: "text-[hsl(38,92%,50%)] border-[hsl(38,92%,50%)]/40 bg-[hsl(38,92%,50%)]/10", icon: AlertTriangle, label: "Medium Severity" },
  low: { color: "text-[hsl(160,84%,39%)] border-[hsl(160,84%,39%)]/40 bg-[hsl(160,84%,39%)]/10", icon: AlertTriangle, label: "Low Severity" },
  none: { color: "text-[hsl(160,84%,39%)] border-[hsl(160,84%,39%)]/40 bg-[hsl(160,84%,39%)]/10", icon: ShieldCheck, label: "No Defects" },
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default function UploadPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [structureType, setStructureType] = useState("bridge");
  const [buildingAge, setBuildingAge] = useState("");
  const [numberOfFloors, setNumberOfFloors] = useState("");
  const [materialType, setMaterialType] = useState("Brick");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createAnalysis = useCreateAnalysis();
  const deleteAnalysis = useDeleteAnalysis();

  const addFiles = useCallback((newFiles: File[]) => {
    const imageFiles = newFiles.filter((f) => f.type.startsWith("image/"));
    const items: FileItem[] = imageFiles.map((file) => ({
      file,
      id: `${file.name}-${Date.now()}`,
      preview: URL.createObjectURL(file),
    }));
    setFiles((prev) => [...prev, ...items].slice(0, 4));
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f) URL.revokeObjectURL(f.preview);
      return prev.filter((x) => x.id !== id);
    });
  };

  const simulateProgress = () =>
    new Promise<void>((resolve) => {
      let step = 0;
      let prog = 0;
      const interval = setInterval(() => {
        prog += Math.random() * 18 + 8;
        const newStep = Math.min(Math.floor(prog / 20), STEPS.length - 1);
        setCurrentStep(newStep);
        setProgress(Math.min(prog, 95));
        if (prog >= 95) {
          clearInterval(interval);
          resolve();
        }
      }, 400);
    });

  const handleAnalyze = async () => {
    if (files.length === 0) {
      toast({ title: "No files selected", description: "Please upload at least one image", variant: "destructive" });
      return;
    }
    setIsAnalyzing(true);
    setProgress(0);
    setCurrentStep(0);
    setResult(null);

    try {
      const imageData = await fileToBase64(files[0].file);
      await simulateProgress();

      const fileName = files[0].file.name;
      const res = await customFetch<AnalysisResult>("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName,
          structureType,
          imageData,
          buildingAge: buildingAge ? parseInt(buildingAge, 10) : null,
          numberOfFloors: numberOfFloors ? parseInt(numberOfFloors, 10) : null,
          materialType,
        }),
      });

      setProgress(100);
      setCurrentStep(STEPS.length - 1);
      setTimeout(() => {
        setIsAnalyzing(false);
        setResult(res);
        queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
      }, 500);
    } catch (err: any) {
      setIsAnalyzing(false);
      setProgress(0);
      const errMsg = err?.data?.error || err?.message || "Please try again";
      toast({ title: "Analysis failed", description: errMsg, variant: "destructive" });
    }
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    setDownloadingPdf(true);
    try {
      const reportData = await customFetch<any>(`/api/reports/${result.id}`);
      generatePDFReport(reportData);
      toast({ title: "Report downloaded", description: "Your PDF report has been generated successfully." });
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err?.message || "Could not retrieve report data",
        variant: "destructive",
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDelete = () => {
    if (!result) return;
    deleteAnalysis.mutate(
      { id: result.id },
      {
        onSuccess: () => {
          setResult(null);
          setFiles([]);
          setProgress(0);
          queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
          toast({ title: "Analysis deleted" });
        },
      }
    );
  };

  const sevConf = SEVERITY_CONFIG[result?.severity || "none"] || SEVERITY_CONFIG.none;
  const SevIcon = sevConf.icon;

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Zone */}
        <div className="space-y-4">
          {/* Drag & Drop */}
          <motion.div
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => !isAnalyzing && fileInputRef.current?.click()}
            animate={{
              borderColor: isDragging ? "hsl(189,94%,43%)" : "hsl(220,15%,25%)",
              boxShadow: isDragging ? "0 0 24px rgba(6,182,212,0.25)" : "none",
            }}
            className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer min-h-[200px] transition-all bg-card"
            data-testid="dropzone"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => addFiles(Array.from(e.target.files || []))}
            />
            <motion.div
              animate={{ scale: isDragging ? 1.1 : 1 }}
              className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4"
            >
              <Upload className={`w-6 h-6 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
            </motion.div>
            <p className="text-sm font-medium text-foreground text-center">
              {isDragging ? "Drop to upload" : "Drag & drop structural images"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 text-center">or click to browse • PNG, JPG, WEBP up to 10MB</p>
          </motion.div>

          {/* Structural & Material Details */}
          <div className="space-y-4 p-4 border border-border rounded-xl bg-card">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Structure & Material Details
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Structure Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Structure Type
                </label>
                <Select value={structureType} onValueChange={setStructureType} disabled={isAnalyzing}>
                  <SelectTrigger data-testid="structure-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bridge">Bridge</SelectItem>
                    <SelectItem value="road">Road</SelectItem>
                    <SelectItem value="wall">Wall</SelectItem>
                    <SelectItem value="building">Building</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Material Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Material Type
                </label>
                <Select value={materialType} onValueChange={setMaterialType} disabled={isAnalyzing}>
                  <SelectTrigger data-testid="material-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Brick">Brick</SelectItem>
                    <SelectItem value="Reinforced Concrete">Reinforced Concrete</SelectItem>
                    <SelectItem value="Steel">Steel</SelectItem>
                    <SelectItem value="Stone">Stone</SelectItem>
                    <SelectItem value="Composite">Composite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Building Age */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Building Age (Years)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 25"
                  value={buildingAge}
                  onChange={(e) => setBuildingAge(e.target.value)}
                  disabled={isAnalyzing}
                  className="h-9"
                  data-testid="building-age-input"
                />
              </div>

              {/* Number of Floors */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Number of Floors
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 5"
                  value={numberOfFloors}
                  onChange={(e) => setNumberOfFloors(e.target.value)}
                  disabled={isAnalyzing}
                  className="h-9"
                  data-testid="number-of-floors-input"
                />
              </div>
            </div>
          </div>

          {/* File Previews */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {files.map((f) => (
                  <motion.div
                    key={f.id}
                    layout
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card"
                    data-testid={`file-item-${f.id}`}
                  >
                    <img src={f.preview} alt={f.file.name} className="w-10 h-10 object-cover rounded-md flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{f.file.name}</p>
                      <p className="text-xs text-muted-foreground">{(f.file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                      className="p-1 hover:text-destructive transition-colors text-muted-foreground"
                      disabled={isAnalyzing}
                      data-testid={`remove-file-${f.id}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || files.length === 0}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            data-testid="button-analyze"
          >
            {isAnalyzing ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Analyzing...</>
            ) : (
              <><FileImage className="w-4 h-4 mr-2" />Run AI Analysis</>
            )}
          </Button>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {/* Progress */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border-border bg-card">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm font-medium text-foreground">{STEPS[currentStep]}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between">
                      {STEPS.map((s, i) => (
                        <div
                          key={s}
                          className={`text-[10px] flex-1 text-center ${i <= currentStep ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {i <= currentStep ? "•" : "○"}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analysis Result */}
          <AnimatePresence>
            {result && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
                data-testid="analysis-result"
              >
                {/* Comparison */}
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Analysis Comparison</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3">
                      {files[0] && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 font-medium">Original Image</p>
                          <img
                            src={files[0].preview}
                            alt="Original"
                            className="w-full h-32 object-cover rounded-lg border border-border"
                          />
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 font-medium">AI Analysis</p>
                        <div
                          className={`w-full h-32 rounded-lg border-2 ${sevConf.color} flex items-center justify-center`}
                          data-testid="ai-masked-image"
                        >
                          <div className="text-center p-2">
                            <SevIcon className="w-6 h-6 mx-auto mb-1" />
                            <p className="text-xs font-bold">{result.defectCount ?? 0} defects</p>
                            <p className="text-[10px]">{result.structureType}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats */}
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium capitalize ${sevConf.color}`}>
                        {sevConf.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{result.analysisSpeedMs}ms</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-lg font-bold text-foreground">{result.defectCount ?? 0}</div>
                        <div className="text-[10px] text-muted-foreground">Defects</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-foreground">
                          {result.confidenceScore ? `${Math.round(result.confidenceScore * 100)}%` : "—"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Confidence</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-foreground capitalize">{result.structureType}</div>
                        <div className="text-[10px] text-muted-foreground">Type</div>
                      </div>
                    </div>
                    {result.defectTypes && JSON.parse(result.defectTypes).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {JSON.parse(result.defectTypes).map((dt: string) => (
                          <Badge key={dt} variant="outline" className="text-[10px] capitalize">
                            {dt.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Building & Material Details */}
                    {(result.materialType || result.buildingAge || result.numberOfFloors) && (
                      <div className="mt-4 pt-3 border-t border-border grid grid-cols-3 gap-2 text-center text-xs">
                        {result.materialType && (
                          <div>
                            <div className="font-semibold text-foreground capitalize">{result.materialType}</div>
                            <div className="text-[10px] text-muted-foreground">Material</div>
                          </div>
                        )}
                        {result.buildingAge !== null && result.buildingAge !== undefined && (
                          <div>
                            <div className="font-semibold text-foreground">{result.buildingAge} years</div>
                            <div className="text-[10px] text-muted-foreground">Age</div>
                          </div>
                        )}
                        {result.numberOfFloors !== null && result.numberOfFloors !== undefined && (
                          <div>
                            <div className="font-semibold text-foreground">{result.numberOfFloors}</div>
                            <div className="text-[10px] text-muted-foreground">Floors</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recommendations / Risk Insights */}
                    {result.recommendations && result.recommendations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border space-y-2">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Risk Insights & Actions
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {result.recommendations.map((rec) => {
                            const isCritical = rec.severity === "critical";
                            const isWarning = rec.severity === "warning";
                            return (
                              <div
                                key={rec.id}
                                className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                                  isCritical
                                    ? "bg-destructive/10 border-destructive/20 text-destructive-foreground text-left"
                                    : isWarning
                                      ? "bg-[hsl(38,92%,50%)]/10 border-[hsl(38,92%,50%)]/20 text-[hsl(38,92%,50%)]-foreground text-left"
                                      : "bg-muted/30 border-border text-left"
                                }`}
                              >
                                <div className="font-semibold flex items-center gap-1 text-foreground">
                                  {isCritical || isWarning ? (
                                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                  ) : (
                                    <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 text-[hsl(160,84%,39%)]" />
                                  )}
                                  {rec.title}
                                </div>
                                <div className="text-muted-foreground text-[11px] leading-relaxed">
                                  {rec.description}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3 text-xs border-primary text-primary hover:bg-primary/10"
                      onClick={handleDownloadPDF}
                      disabled={downloadingPdf}
                      data-testid="button-download-pdf"
                    >
                      {downloadingPdf ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                      ) : (
                        <FileText className="w-3 h-3 mr-1.5" />
                      )}
                      Download PDF Report
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full mt-3 text-xs"
                      onClick={handleDelete}
                      disabled={deleteAnalysis.isPending}
                      data-testid="button-delete-analysis"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete Analysis
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {!result && !isAnalyzing && (
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
              <FileImage className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Analysis results will appear here</p>
              <p className="text-xs mt-1">Upload images and click Run AI Analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
