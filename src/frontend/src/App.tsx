import { motion } from "motion/react";

export default function App() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center space-y-3"
      >
        <h1 className="text-6xl font-bold tracking-tight text-foreground font-display">
          Hello, World
        </h1>
        <p className="text-muted-foreground text-lg">
          Welcome to KnowledgeFlow
        </p>
      </motion.div>

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
    </main>
  );
}
