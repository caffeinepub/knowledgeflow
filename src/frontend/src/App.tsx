import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Loader2, LogIn, LogOut, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type {
  backendInterface as FullBackendInterface,
  Project,
} from "./backend.d";
import ProjectView from "./components/ProjectView";
import ProjectsDashboard from "./components/ProjectsDashboard";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";

function truncatePrincipal(principal: string): string {
  if (principal.length <= 14) return principal;
  return `${principal.slice(0, 6)}\u2026${principal.slice(-5)}`;
}

export default function App() {
  const { login, clear, loginStatus, identity, isInitializing, isLoggingIn } =
    useInternetIdentity();
  const { actor, isFetching: isActorFetching } = useActor();

  const principal = identity?.getPrincipal();
  const isAuthenticated = principal && !principal.isAnonymous();

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

  const footer = (
    <footer className="absolute bottom-6 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()}. Built with love using{" "}
      <a
        href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2 hover:text-foreground transition-colors"
      >
        caffeine.ai
      </a>
    </footer>
  );

  if (isInitializing) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          data-ocid="app.loading_state"
          className="flex items-center gap-2 text-muted-foreground"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </motion.div>
        {footer}
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
        {/* Subtle background grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, oklch(0.55 0.22 270) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Glow orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-primary/5 blur-[80px] pointer-events-none" />

        <AnimatePresence>
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative z-10 flex flex-col items-center gap-8 px-6 text-center"
          >
            {/* Logo mark */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
              className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-glow"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                aria-label="KnowledgeFlow mind map logo"
                role="img"
                className="text-primary"
              >
                <title>KnowledgeFlow mind map logo</title>
                <circle cx="14" cy="14" r="3" fill="currentColor" />
                <circle cx="6" cy="7" r="2" fill="currentColor" opacity="0.6" />
                <circle
                  cx="22"
                  cy="7"
                  r="2"
                  fill="currentColor"
                  opacity="0.6"
                />
                <circle
                  cx="6"
                  cy="21"
                  r="2"
                  fill="currentColor"
                  opacity="0.6"
                />
                <circle
                  cx="22"
                  cy="21"
                  r="2"
                  fill="currentColor"
                  opacity="0.6"
                />
                <line
                  x1="14"
                  y1="14"
                  x2="6"
                  y2="7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity="0.4"
                />
                <line
                  x1="14"
                  y1="14"
                  x2="22"
                  y2="7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity="0.4"
                />
                <line
                  x1="14"
                  y1="14"
                  x2="6"
                  y2="21"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity="0.4"
                />
                <line
                  x1="14"
                  y1="14"
                  x2="22"
                  y2="21"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity="0.4"
                />
              </svg>
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight text-foreground font-display">
                KnowledgeFlow
              </h1>
              <p className="text-muted-foreground text-base max-w-xs">
                Your personal knowledge base — notes, mind maps, and AI-powered
                insights.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center gap-3"
            >
              <Button
                size="lg"
                onClick={login}
                disabled={isLoggingIn}
                data-ocid="auth.primary_button"
                className="gap-2 px-8 shadow-glow"
              >
                {isLoggingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {isLoggingIn ? "Signing in…" : "Sign in securely"}
              </Button>
              {loginStatus === "loginError" && (
                <p
                  data-ocid="auth.error_state"
                  className="text-destructive text-xs"
                >
                  Sign-in failed. Please try again.
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Powered by Internet Identity — no passwords required.
              </p>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {footer}
      </main>
    );
  }

  // Authenticated state — wait for actor
  if (isActorFetching || !actor) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          data-ocid="app.loading_state"
          className="flex items-center gap-2 text-muted-foreground"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Connecting…</span>
        </motion.div>
      </main>
    );
  }

  const principalStr = principal!.toString();

  if (selectedProject) {
    return (
      <>
        <ProjectView
          actor={actor as unknown as FullBackendInterface}
          project={selectedProject}
          onGoToDashboard={() => setSelectedProject(null)}
          onNewProject={() => {
            setSelectedProject(null);
            setShowNewProjectDialog(true);
          }}
          onSignOut={clear}
          principalStr={principalStr}
        />
        <Toaster />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar for dashboard */}
      <header className="flex items-center justify-between px-6 h-12 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <svg
            width="20"
            height="20"
            viewBox="0 0 28 28"
            fill="none"
            className="text-primary"
          >
            <title>KnowledgeFlow</title>
            <circle cx="14" cy="14" r="3" fill="currentColor" />
            <circle cx="6" cy="7" r="2" fill="currentColor" opacity="0.6" />
            <circle cx="22" cy="7" r="2" fill="currentColor" opacity="0.6" />
            <circle cx="6" cy="21" r="2" fill="currentColor" opacity="0.6" />
            <circle cx="22" cy="21" r="2" fill="currentColor" opacity="0.6" />
            <line
              x1="14"
              y1="14"
              x2="6"
              y2="7"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.4"
            />
            <line
              x1="14"
              y1="14"
              x2="22"
              y2="7"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.4"
            />
            <line
              x1="14"
              y1="14"
              x2="6"
              y2="21"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.4"
            />
            <line
              x1="14"
              y1="14"
              x2="22"
              y2="21"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.4"
            />
          </svg>
          <span className="text-sm font-semibold font-display text-foreground">
            KnowledgeFlow
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div
            data-ocid="auth.panel"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/60 border border-border text-xs text-muted-foreground"
          >
            <User className="h-3 w-3 text-primary" />
            <span className="font-mono">{truncatePrincipal(principalStr)}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            data-ocid="auth.secondary_button"
            className="gap-1.5 text-muted-foreground hover:text-foreground text-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </header>

      <ProjectsDashboard
        actor={actor as unknown as FullBackendInterface}
        onSelectProject={setSelectedProject}
        showNewProjectDialog={showNewProjectDialog}
        onNewProjectDialogClose={() => setShowNewProjectDialog(false)}
      />

      <footer className="text-center text-xs text-muted-foreground py-4 border-t border-border">
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          caffeine.ai
        </a>
      </footer>
      <Toaster />
    </div>
  );
}
