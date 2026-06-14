import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Github, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().min(1, "Role is required"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

function MeshBackground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(6,182,212,0.15)" strokeWidth="0.5" />
        </pattern>
        <radialGradient id="glow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="rgba(6,182,212,0.2)" />
          <stop offset="100%" stopColor="rgba(6,182,212,0)" />
        </radialGradient>
      </defs>
      <rect width="400" height="600" fill="url(#grid)" />
      <rect width="400" height="600" fill="url(#glow)" />
      {/* Structural lines */}
      <motion.line
        x1="50" y1="100" x2="350" y2="100"
        stroke="rgba(6,182,212,0.3)" strokeWidth="1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      />
      <motion.line
        x1="50" y1="200" x2="350" y2="200"
        stroke="rgba(6,182,212,0.2)" strokeWidth="1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.5 }}
      />
      <motion.line
        x1="50" y1="300" x2="350" y2="300"
        stroke="rgba(6,182,212,0.2)" strokeWidth="1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1 }}
      />
      {/* Vertical grid lines */}
      <motion.line
        x1="100" y1="50" x2="100" y2="550"
        stroke="rgba(6,182,212,0.2)" strokeWidth="1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.3 }}
      />
      <motion.line
        x1="200" y1="50" x2="200" y2="550"
        stroke="rgba(6,182,212,0.3)" strokeWidth="1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.8 }}
      />
      <motion.line
        x1="300" y1="50" x2="300" y2="550"
        stroke="rgba(6,182,212,0.2)" strokeWidth="1"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1.2 }}
      />
      {/* Scan line */}
      <motion.rect
        x="0" y="0" width="400" height="2"
        fill="rgba(6,182,212,0.4)"
        initial={{ y: 0 }} animate={{ y: 600 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      {/* Corner markers */}
      <g stroke="rgba(6,182,212,0.6)" strokeWidth="1.5" fill="none">
        <path d="M 60 80 L 60 60 L 80 60" />
        <path d="M 320 80 L 320 60 L 340 60" />
        <path d="M 60 520 L 60 540 L 80 540" />
        <path d="M 320 520 L 320 540 L 340 540" />
      </g>
      {/* Data points */}
      {[
        [120, 150], [200, 180], [280, 140], [160, 250], [240, 220], [300, 280], [140, 350], [220, 320],
      ].map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={x} cy={y} r="3"
          fill="rgba(6,182,212,0.6)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.25, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", role: "Structural Engineer" },
  });

  const onLogin = async (data: LoginForm) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (res: any) => {
          login(res.token, res.user);
          setLocation("/dashboard");
        },
        onError: () => {
          toast({ title: "Login failed", description: "Invalid email or password", variant: "destructive" });
        },
      }
    );
  };

  const onRegister = async (data: RegisterForm) => {
    registerMutation.mutate(
      { data },
      {
        onSuccess: (res: any) => {
          login(res.token, res.user);
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          toast({ title: "Registration failed", description: err?.data?.error || "Please try again", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex dark relative overflow-hidden bg-[#06070a]">
      {/* Left Panel - Video Hero */}
      <div className="hidden lg:flex flex-col justify-between w-[55%] relative p-12 overflow-hidden border-r border-white/5">
        {/* Autoplay Loop Video Background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/login-bg.mp4" type="video/mp4" />
        </video>
        
        {/* Subtle dark overlay for contrast */}
        <div className="absolute inset-0 bg-slate-950/20 z-10" />

        {/* Top Header Branding */}
        <div className="relative z-20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center backdrop-blur-md">
            <ShieldCheck className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <span className="font-extrabold text-lg text-white tracking-widest uppercase font-mono">VisionBuild</span>
        </div>

        {/* Middle Branding Pitch */}
        <div className="relative z-20 my-auto max-w-lg space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
              Enterprise Defect Monitoring
            </h1>
            <p className="text-base text-slate-200 leading-relaxed font-medium mt-2">
              AI-Powered Structural Defect Detection & Infrastructure Monitoring
            </p>
          </motion.div>
        </div>

        {/* Bottom Floating Stats */}
        <div className="relative z-20 grid grid-cols-3 gap-4 text-center mt-auto w-full">
          {[
            { value: "99.2%", label: "Detection Accuracy" },
            { value: "< 500ms", label: "Analysis Speed" },
            { value: "50K+", label: "Images Analyzed" },
          ].map(({ value, label }, index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 + index * 0.1 }}
              className="backdrop-blur-md bg-slate-950/40 border border-white/10 rounded-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.37)]"
              whileHover={{ scale: 1.03, borderColor: "rgba(6, 182, 212, 0.3)", boxShadow: "0 0 15px rgba(6, 182, 212, 0.15)" }}
            >
              <div className="text-xl font-bold text-cyan-400 font-mono tracking-tight">{value}</div>
              <div className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider mt-1">{label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right Panel - Auth Card */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative blueprint-grid z-20 bg-[#06070a]">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md backdrop-blur-xl bg-slate-900/35 border border-white/5 rounded-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.55),0_0_30px_rgba(6,182,212,0.03)] relative"
        >
          {/* Logo for mobile */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4.5 h-4.5 text-cyan-400" />
            </div>
            <span className="font-bold text-white tracking-widest uppercase font-mono text-sm">VisionBuild</span>
          </div>

          {/* Tab Toggle */}
          <div className="flex gap-1 p-1 bg-slate-950/65 border border-white/5 rounded-xl mb-6">
            {["Sign In", "Create Account"].map((tab, i) => (
              <button
                key={tab}
                onClick={() => setIsLogin(i === 0)}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg font-mono uppercase tracking-widest transition-all duration-300 ${
                  isLogin === (i === 0)
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.1)]"
                    : "text-slate-400 hover:text-white border border-transparent"
                }`}
                data-testid={i === 0 ? "tab-signin" : "tab-register"}
              >
                {tab}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white tracking-tight">Welcome back</h2>
                  <p className="text-xs text-slate-400 font-mono mt-1">// Sign in to structural telemetry panel</p>
                </div>

                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="engineer@company.com"
                      className="bg-slate-950/60 border-white/10 text-white placeholder:text-slate-500 rounded-lg h-9 focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/30 transition-all duration-300"
                      data-testid="input-email"
                      {...loginForm.register("email")}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-red-400">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="bg-slate-950/60 border-white/10 text-white placeholder:text-slate-500 rounded-lg h-9 focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/30 transition-all duration-300 pr-10"
                        data-testid="input-password"
                        {...loginForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                        data-testid="toggle-password"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-red-400">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold border-0 h-10 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all duration-300 rounded-lg mt-2"
                    disabled={loginMutation.isPending}
                    data-testid="button-signin"
                  >
                    {loginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Sign In
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/5" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-mono">
                    <span className="px-3 bg-[#06070a]/80 backdrop-blur-md text-slate-500">or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: "G", label: "Google" },
                    { icon: <Github className="w-4 h-4" />, label: "GitHub" },
                  ].map(({ icon, label }) => (
                    <button
                      key={label}
                      type="button"
                      className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-white/5 bg-slate-950/40 text-slate-300 hover:border-white/15 hover:text-white hover:bg-slate-950/60 transition-all text-xs font-semibold"
                      data-testid={`oauth-${label.toLowerCase()}`}
                    >
                      {typeof icon === "string" ? (
                        <span className="font-bold text-sm text-cyan-400 font-mono">{icon}</span>
                      ) : icon}
                      {label}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white tracking-tight">Create account</h2>
                  <p className="text-xs text-slate-400 font-mono mt-1">// Join the VisionBuild telemetry network</p>
                </div>

                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono">Full Name</Label>
                    <Input
                      placeholder="Jane Smith"
                      className="bg-slate-950/60 border-white/10 text-white placeholder:text-slate-500 rounded-lg h-9 focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/30 transition-all duration-300"
                      data-testid="input-name"
                      {...registerForm.register("name")}
                    />
                    {registerForm.formState.errors.name && (
                      <p className="text-xs text-red-400">{registerForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono">Email Address</Label>
                    <Input
                      type="email"
                      placeholder="engineer@company.com"
                      className="bg-slate-950/60 border-white/10 text-white placeholder:text-slate-500 rounded-lg h-9 focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/30 transition-all duration-300"
                      data-testid="input-register-email"
                      {...registerForm.register("email")}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-xs text-red-400">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono">Role Profile</Label>
                    <Input
                      placeholder="Structural Engineer"
                      className="bg-slate-950/60 border-white/10 text-white placeholder:text-slate-500 rounded-lg h-9 focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/30 transition-all duration-300"
                      data-testid="input-role"
                      {...registerForm.register("role")}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono">Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 6 characters"
                        className="bg-slate-950/60 border-white/10 text-white placeholder:text-slate-500 rounded-lg h-9 focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/30 transition-all duration-300 pr-10"
                        data-testid="input-register-password"
                        {...registerForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-xs text-red-400">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold border-0 h-10 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all duration-300 rounded-lg mt-3"
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Account
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
