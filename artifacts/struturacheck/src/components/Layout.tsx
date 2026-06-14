import { useState, useEffect, useRef, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Upload,
  BarChart3,
  ShieldAlert,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  LogOut,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/recommendations", label: "Recommendations", icon: ShieldAlert },
  { href: "/settings", label: "Settings", icon: Settings },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/upload": "Image Analysis",
  "/analytics": "Analytics",
  "/recommendations": "Recommendations",
  "/settings": "Settings",
};

function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      color: string;
    }> = [];

    const colors = [
      "rgba(6, 182, 212, 0.18)",  // Cyan
      "rgba(16, 185, 129, 0.15)",  // Emerald
      "rgba(99, 102, 241, 0.15)", // Indigo
    ];

    const resizeCanvas = () => {
      if (!canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const createParticle = () => {
      const size = Math.random() * 1.2 + 0.4;
      const x = Math.random() * canvas.width;
      const y = canvas.height + 10;
      const speedY = -(Math.random() * 0.15 + 0.05);
      const speedX = (Math.random() - 0.5) * 0.08;
      const opacity = Math.random() * 0.15 + 0.03;
      const color = colors[Math.floor(Math.random() * colors.length)];

      particles.push({ x, y, size, speedY, speedX, opacity, color });
    };

    const initParticles = () => {
      const count = Math.min(30, Math.floor((canvas.width * canvas.height) / 50000));
      for (let i = 0; i < count; i++) {
        const size = Math.random() * 1.2 + 0.4;
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const speedY = -(Math.random() * 0.15 + 0.05);
        const speedX = (Math.random() - 0.5) * 0.08;
        const opacity = Math.random() * 0.15 + 0.03;
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push({ x, y, size, speedY, speedX, opacity, color });
      }
    };

    initParticles();

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (particles.length < 40 && Math.random() < 0.02) {
        createParticle();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += p.speedX;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();

        if (p.y < -10) {
          particles.splice(i, 1);
        }
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(drawParticles);
    };

    drawParticles();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
    />
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "SC";

  const pageTitle = PAGE_TITLES[location] || "VisionBuild";

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  return (
    <div className="flex h-screen bg-slate-950 text-foreground overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="relative flex-shrink-0 flex flex-col bg-slate-950/45 backdrop-blur-xl border-r border-white/5 z-20"
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-white/5 overflow-hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <span className="font-bold text-sm text-foreground tracking-tight whitespace-nowrap">
                    VisionBuild
                  </span>
                  <p className="text-[10px] text-slate-400 whitespace-nowrap font-mono">Defect Telemetry</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 space-y-1.5 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ x: collapsed ? 0 : 4 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group relative border ${
                    isActive
                      ? "bg-cyan-500/8 text-cyan-400 border-cyan-500/15 shadow-[0_0_15px_rgba(6,182,212,0.05)]"
                      : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
                  }`}
                  data-testid={`nav-${label.toLowerCase()}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                    />
                  )}
                  <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-cyan-400 scale-105" : "text-slate-400 group-hover:text-slate-200"}`} />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        className="text-sm font-medium whitespace-nowrap"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2 py-1 bg-slate-900 border border-white/10 rounded-md text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                      {label}
                    </div>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="px-2 pb-4">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors text-sm"
            data-testid="sidebar-collapse-toggle"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Top Navbar */}
        <header className="flex-shrink-0 flex items-center justify-between h-16 px-6 bg-slate-950/25 backdrop-blur-md border-b border-white/5 relative z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-base font-semibold text-foreground tracking-tight" data-testid="page-title">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-white hover:bg-white/5" data-testid="notifications-bell">
              <Bell className="w-4 h-4" />
              <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-[9px] bg-red-500 text-white border-0">
                3
              </Badge>
            </Button>

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  data-testid="user-profile-trigger"
                >
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="bg-cyan-500/20 text-cyan-400 text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-foreground leading-none">{user?.name || "User"}</p>
                    <p className="text-[10px] text-slate-400 leading-none mt-0.5">{user?.role || "Structural Engineer"}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-card" data-testid="user-dropdown">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-semibold text-sm">{user?.name || "User"}</p>
                    <p className="text-xs text-slate-400 font-normal">{user?.email}</p>
                    <p className="text-xs text-cyan-400 font-normal mt-0.5">{user?.role || "Structural Engineer"}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem asChild data-testid="account-settings-link" className="hover:bg-white/5">
                  <Link href="/settings">
                    <User className="w-4 h-4 mr-2" />
                    Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-400 focus:text-red-400 hover:bg-red-500/10 focus:bg-red-500/10"
                  data-testid="logout-button"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto neon-app-bg blueprint-grid relative z-10">
          <FloatingParticles />
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full relative z-10"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
