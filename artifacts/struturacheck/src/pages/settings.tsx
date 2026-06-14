import { useState } from "react";
import { motion } from "framer-motion";
import { User, Bell, Shield, Moon, Sun, Monitor, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

type ThemeMode = "light" | "dark" | "system";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    email: true,
    criticalAlerts: true,
    weeklyReport: false,
    analysisComplete: true,
  });

  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    role: user?.role || "Structural Engineer",
    organization: "City Infrastructure Dept.",
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast({ title: "Settings saved", description: "Your preferences have been updated." });
  };

  const initials = profile.name
    .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const THEMES: { value: ThemeMode; label: string; icon: typeof Moon }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="p-6 sm:p-8 max-w-2xl space-y-6 relative z-10">
      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="glass-card shadow-lg">
          <CardHeader className="pb-3 border-b border-white/5 mb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              <CardTitle className="text-xs font-bold uppercase tracking-wider font-mono text-white">Profile Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14 border border-white/10 shadow-md">
                <AvatarFallback className="bg-cyan-500/20 text-cyan-400 text-lg font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-white">{profile.name}</p>
                <p className="text-xs text-slate-400 font-mono">{profile.role}</p>
                <Button variant="outline" size="sm" className="mt-2 h-6 text-[10px] font-mono border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                  Change Avatar
                </Button>
              </div>
            </div>
            <Separator className="bg-white/5" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Full Name</Label>
                <Input
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  className="h-8 text-sm bg-slate-950/50 border-white/10 text-white focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/30"
                  data-testid="settings-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Email Address</Label>
                <Input
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  type="email"
                  className="h-8 text-sm bg-slate-950/50 border-white/10 text-white focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/30"
                  data-testid="settings-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Role Profile</Label>
                <Input
                  value={profile.role}
                  onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value }))}
                  className="h-8 text-sm bg-slate-950/50 border-white/10 text-white focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/30"
                  data-testid="settings-role"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Organization</Label>
                <Input
                  value={profile.organization}
                  onChange={(e) => setProfile((p) => ({ ...p, organization: e.target.value }))}
                  className="h-8 text-sm bg-slate-950/50 border-white/10 text-white focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/30"
                  data-testid="settings-organization"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Appearance */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}>
        <Card className="glass-card shadow-lg">
          <CardHeader className="pb-3 border-b border-white/5 mb-4">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-cyan-400" />
              <CardTitle className="text-xs font-bold uppercase tracking-wider font-mono text-white">Appearance & Theme</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-lg border text-xs font-medium font-mono uppercase tracking-wider transition-all duration-300 ${
                    theme === value
                      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                      : "border-white/10 text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/20"
                  }`}
                  data-testid={`theme-${value}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }}>
        <Card className="glass-card shadow-lg">
          <CardHeader className="pb-3 border-b border-white/5 mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <CardTitle className="text-xs font-bold uppercase tracking-wider font-mono text-white">Notification Matrix</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "email", label: "Email notifications", desc: "Receive updates via email" },
              { key: "criticalAlerts", label: "Critical alerts", desc: "Immediate alerts for high-severity defects" },
              { key: "analysisComplete", label: "Analysis complete", desc: "Notify when image analysis finishes" },
              { key: "weeklyReport", label: "Weekly digest", desc: "Summary report every Monday" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
                <Switch
                  checked={notifications[key as keyof typeof notifications]}
                  onCheckedChange={(v) => setNotifications((n) => ({ ...n, [key]: v }))}
                  data-testid={`toggle-${key}`}
                  className="data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-slate-800"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Security */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
        <Card className="glass-card shadow-lg">
          <CardHeader className="pb-3 border-b border-white/5 mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <CardTitle className="text-xs font-bold uppercase tracking-wider font-mono text-white">Security & Cryptography</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Two-factor authentication</p>
                <p className="text-xs text-slate-400 mt-0.5">Add an extra layer of security</p>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs border-white/10 text-slate-300 hover:text-white hover:bg-white/5 font-mono">Enable</Button>
            </div>
            <Separator className="bg-white/5" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Change password</p>
                <p className="text-xs text-slate-400 mt-0.5">Last changed 30 days ago</p>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs border-white/10 text-slate-300 hover:text-white hover:bg-white/5 font-mono">Update</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Button
        onClick={handleSave}
        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold border-0 shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-300"
        disabled={saving}
        data-testid="button-save-settings"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Save Changes
      </Button>
    </div>
  );
}
