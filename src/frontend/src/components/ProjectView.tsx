import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  LogOut,
  MessageSquare,
  Plus,
  Send,
  Settings,
  Trash2,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Note, Project, backendInterface } from "../backend";
import type { backendInterface as FullBackendInterface } from "../backend.d";

// ─── Cell types ─────────────────────────────────────────────────────────────
type MarkdownCell = { id: string; type: "markdown"; content: string };
type ChatCell = {
  id: string;
  type: "chat";
  prompt: string;
  response: string;
  contextNoteIds: string[];
  isLoading?: boolean;
};
type Cell = MarkdownCell | ChatCell;

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function parseCells(body: string): Cell[] {
  if (!body || !body.trim()) {
    return [{ id: newId(), type: "markdown", content: "" }];
  }
  try {
    const parsed = JSON.parse(body);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    /* not JSON — treat as legacy plain text */
  }
  return [{ id: newId(), type: "markdown", content: body }];
}

function serializeCells(cells: Cell[]): string {
  const clean = cells.map((c) =>
    c.type === "chat" ? { ...c, isLoading: false } : c,
  );
  return JSON.stringify(clean);
}

// ─── Props ──────────────────────────────────────────────────────────────────
interface Props {
  actor: FullBackendInterface;
  project: Project;
  onGoToDashboard: () => void;
  onNewProject: () => void;
  onSignOut: () => void;
  principalStr: string;
}

function truncatePrincipal(p: string) {
  if (p.length <= 14) return p;
  return `${p.slice(0, 6)}\u2026${p.slice(-5)}`;
}

// ─── Settings Modal ──────────────────────────────────────────────────────────
function SettingsModal({
  actor,
  open,
  onClose,
}: {
  actor: FullBackendInterface;
  open: boolean;
  onClose: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("glm-4");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    actor
      .getLLMSettings()
      .then((s) => {
        if (s) {
          setApiKey(s.apiKey);
          setModel(s.model);
        } else {
          setApiKey("");
          setModel("glm-4");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, actor]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await actor.saveLLMSettings(apiKey.trim(), model.trim() || "glm-4");
      toast.success("LLM settings saved");
      onClose();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-ocid="settings.dialog" className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            LLM Settings
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="llm-apikey">API Key</Label>
              <Input
                id="llm-apikey"
                type="password"
                data-ocid="settings.input"
                placeholder="Your GLM API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Stored securely in the canister, tied to your identity.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="llm-model">Model</Label>
              <Input
                id="llm-model"
                data-ocid="settings.input"
                placeholder="glm-4"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || !apiKey.trim()}
            data-ocid="settings.save_button"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {saving ? "Saving\u2026" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Context Note Picker ─────────────────────────────────────────────────────
function ContextPicker({
  notes,
  selected,
  onChange,
}: {
  notes: Note[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-ocid="chat.context_button"
          className="h-7 text-xs gap-1.5 font-normal"
        >
          <BookOpen className="h-3 w-3" />
          Context notes
          {selected.length > 0 && (
            <span className="ml-1 bg-primary/15 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        data-ocid="chat.context_popover"
        className="w-64 p-2"
        align="start"
      >
        {notes.length === 0 ? (
          <p className="text-xs text-muted-foreground p-2">
            No notes available
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-2 pb-1">
              Include as context
            </p>
            {notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => toggle(note.id)}
                className="flex w-full items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
              >
                <Checkbox
                  checked={selected.includes(note.id)}
                  onCheckedChange={() => toggle(note.id)}
                  data-ocid="chat.context_checkbox"
                />
                <span className="truncate">{note.title || "Untitled"}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Markdown Cell ───────────────────────────────────────────────────────────
function MarkdownCellEditor({
  cell,
  onChange,
}: {
  cell: MarkdownCell;
  onChange: (content: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [autoResize]);

  return (
    <textarea
      ref={ref}
      data-ocid="notes.textarea"
      className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40 resize-none text-sm leading-relaxed font-mono min-h-[60px] py-2"
      placeholder="Write markdown\u2026"
      value={cell.content}
      onChange={(e) => {
        onChange(e.target.value);
        autoResize();
      }}
      rows={3}
    />
  );
}

// ─── Chat Cell ───────────────────────────────────────────────────────────────
function ChatCellEditor({
  cell,
  notes,
  onUpdate,
  onRun,
}: {
  cell: ChatCell;
  notes: Note[];
  onUpdate: (updates: Partial<ChatCell>) => void;
  onRun: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ContextPicker
          notes={notes}
          selected={cell.contextNoteIds}
          onChange={(ids) => onUpdate({ contextNoteIds: ids })}
        />
        {cell.contextNoteIds.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {cell.contextNoteIds.length} note
            {cell.contextNoteIds.length > 1 ? "s" : ""} in context
          </span>
        )}
      </div>
      <div className="flex gap-2 items-end">
        <Textarea
          data-ocid="chat.textarea"
          className="flex-1 min-h-[72px] text-sm font-mono resize-none bg-muted/30"
          placeholder="Ask the LLM\u2026"
          value={cell.prompt}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              if (cell.prompt.trim() && !cell.isLoading) onRun();
            }
          }}
        />
        <Button
          size="sm"
          onClick={onRun}
          data-ocid="chat.primary_button"
          disabled={!cell.prompt.trim() || !!cell.isLoading}
          className="gap-1.5 shrink-0"
        >
          {cell.isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {cell.isLoading ? "Running" : "Run"}
        </Button>
      </div>
      {(cell.isLoading || cell.response) && (
        <div className="rounded-md bg-muted/40 border border-border/60 p-3">
          {cell.isLoading ? (
            <div
              data-ocid="chat.loading_state"
              className="flex items-center gap-2 text-muted-foreground text-xs"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking\u2026
            </div>
          ) : (
            <p
              data-ocid="chat.success_state"
              className="text-sm whitespace-pre-wrap leading-relaxed text-foreground"
            >
              {cell.response}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Cell wrapper ────────────────────────────────────────────────────────────
function CellWrapper({
  cell,
  index,
  total,
  notes,
  onUpdate,
  onDelete,
  onInsertBelow,
  onChangeType,
  onRun,
}: {
  cell: Cell;
  index: number;
  total: number;
  notes: Note[];
  onUpdate: (updates: Partial<Cell>) => void;
  onDelete: () => void;
  onInsertBelow: (type: "markdown" | "chat") => void;
  onChangeType: (type: "markdown" | "chat") => void;
  onRun?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      data-ocid={`cell.item.${index + 1}`}
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Cell */}
      <div
        className={`rounded-lg border transition-colors ${
          cell.type === "chat"
            ? "border-primary/30 bg-primary/[0.03]"
            : "border-border/60 bg-background"
        } p-4`}
      >
        {/* Cell header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {cell.type === "chat" ? (
              <MessageSquare className="h-3 w-3 text-primary/70" />
            ) : (
              <FileText className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {cell.type === "chat" ? "LLM" : "Markdown"}
            </span>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-muted-foreground"
              onClick={() =>
                onChangeType(cell.type === "chat" ? "markdown" : "chat")
              }
            >
              Switch to {cell.type === "chat" ? "Markdown" : "LLM"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              data-ocid={`cell.delete_button.${index + 1}`}
              disabled={total <= 1}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {cell.type === "markdown" ? (
          <MarkdownCellEditor
            cell={cell}
            onChange={(content) => onUpdate({ content } as Partial<Cell>)}
          />
        ) : (
          <ChatCellEditor
            cell={cell as ChatCell}
            notes={notes}
            onUpdate={(updates) => onUpdate(updates as Partial<Cell>)}
            onRun={onRun ?? (() => {})}
          />
        )}
      </div>

      {/* Add cell affordance */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 py-1.5 px-2"
          >
            <div className="flex-1 h-px bg-border/40" />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-muted-foreground gap-1"
              onClick={() => onInsertBelow("markdown")}
              data-ocid={`cell.add_markdown_button.${index + 1}`}
            >
              <Plus className="h-3 w-3" />
              Markdown
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-muted-foreground gap-1"
              onClick={() => onInsertBelow("chat")}
              data-ocid={`cell.add_chat_button.${index + 1}`}
            >
              <Plus className="h-3 w-3" />
              LLM
            </Button>
            <div className="flex-1 h-px bg-border/40" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ProjectView({
  actor,
  project,
  onGoToDashboard,
  onNewProject,
  onSignOut,
  principalStr,
}: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [cells, setCells] = useState<Cell[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [newNoteDialog, setNewNoteDialog] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [creatingNote, setCreatingNote] = useState(false);

  const [deleteNoteTarget, setDeleteNoteTarget] = useState<Note | null>(null);
  const [deletingNote, setDeletingNote] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      setLoadingNotes(true);
      const data = await actor.getNotes(project.id);
      setNotes(data);
    } catch {
      // silently fail
    } finally {
      setLoadingNotes(false);
    }
  }, [actor, project.id]);

  useEffect(() => {
    fetchNotes();
    setSelectedNote(null);
  }, [fetchNotes]);

  const selectNote = (note: Note) => {
    setSelectedNote(note);
    setEditTitle(note.title);
    setCells(parseCells(note.body));
    setSaveStatus("idle");
  };

  const scheduleAutoSave = useCallback(
    (noteId: string, title: string, cellsSnapshot: Cell[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveStatus("saving");
      saveTimer.current = setTimeout(async () => {
        try {
          const body = serializeCells(cellsSnapshot);
          await actor.updateNote(noteId, title, body);
          setSaveStatus("saved");
          setNotes((prev) =>
            prev.map((n) => (n.id === noteId ? { ...n, title, body } : n)),
          );
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch {
          setSaveStatus("idle");
        }
      }, 800);
    },
    [actor],
  );

  const handleTitleChange = (val: string) => {
    setEditTitle(val);
    if (selectedNote) scheduleAutoSave(selectedNote.id, val, cells);
  };

  const updateCells = (updated: Cell[]) => {
    setCells(updated);
    if (selectedNote) scheduleAutoSave(selectedNote.id, editTitle, updated);
  };

  const updateCell = (id: string, updates: Partial<Cell>) => {
    updateCells(
      cells.map((c) => (c.id === id ? ({ ...c, ...updates } as Cell) : c)),
    );
  };

  const updateCellImmediate = (id: string, updates: Partial<Cell>) => {
    setCells((prev) =>
      prev.map((c) => (c.id === id ? ({ ...c, ...updates } as Cell) : c)),
    );
  };

  const deleteCell = (id: string) => {
    if (cells.length <= 1) return;
    updateCells(cells.filter((c) => c.id !== id));
  };

  const insertCellBelow = (afterId: string, type: "markdown" | "chat") => {
    const idx = cells.findIndex((c) => c.id === afterId);
    const newCell: Cell =
      type === "markdown"
        ? { id: newId(), type: "markdown", content: "" }
        : {
            id: newId(),
            type: "chat",
            prompt: "",
            response: "",
            contextNoteIds: [],
          };
    const next = [...cells];
    next.splice(idx + 1, 0, newCell);
    updateCells(next);
  };

  const changeType = (id: string, type: "markdown" | "chat") => {
    const newCell: Cell =
      type === "markdown"
        ? { id, type: "markdown", content: "" }
        : { id, type: "chat", prompt: "", response: "", contextNoteIds: [] };
    updateCells(cells.map((c) => (c.id === id ? newCell : c)));
  };

  const selectedNoteRef = useRef(selectedNote);
  selectedNoteRef.current = selectedNote;
  const editTitleRef = useRef(editTitle);
  editTitleRef.current = editTitle;

  const runChatCell = async (id: string) => {
    const cell = cells.find((c) => c.id === id) as ChatCell | undefined;
    if (!cell || !cell.prompt.trim()) return;

    updateCellImmediate(id, { isLoading: true, response: "" });

    try {
      const response = await actor.callLLM(
        [{ role: "user", content: cell.prompt }],
        cell.contextNoteIds,
      );
      setCells((prev) => {
        const updated = prev.map((c) =>
          c.id === id ? ({ ...c, response, isLoading: false } as Cell) : c,
        );
        const note = selectedNoteRef.current;
        if (note) {
          setTimeout(() => {
            scheduleAutoSave(note.id, editTitleRef.current, updated);
          }, 0);
        }
        return updated;
      });
    } catch (err: unknown) {
      updateCellImmediate(id, { isLoading: false });
      const msg =
        err instanceof Error && err.message.toLowerCase().includes("api")
          ? err.message
          : "LLM call failed. Make sure your API key is set in Settings.";
      toast.error(msg);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) return;
    try {
      setCreatingNote(true);
      const id = await actor.createNote(project.id, newNoteTitle.trim(), "");
      setNewNoteDialog(false);
      setNewNoteTitle("");
      const refreshed = await actor.getNotes(project.id);
      setNotes(refreshed);
      const created = refreshed.find((n) => n.id === id);
      if (created) selectNote(created);
    } catch {
      // silently fail
    } finally {
      setCreatingNote(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteTarget) return;
    try {
      setDeletingNote(true);
      await actor.deleteNote(deleteNoteTarget.id);
      if (selectedNote?.id === deleteNoteTarget.id) setSelectedNote(null);
      setDeleteNoteTarget(null);
      await fetchNotes();
    } catch {
      setDeleteNoteTarget(null);
    } finally {
      setDeletingNote(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-ocid="nav.dropdown_menu"
              className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors"
            >
              <span className="font-display truncate max-w-[200px]">
                {project.name}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem data-ocid="nav.link" onClick={onGoToDashboard}>
              All Projects
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              data-ocid="nav.open_modal_button"
              onClick={onNewProject}
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              New Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/60 border border-border text-xs text-muted-foreground">
            <User className="h-3 w-3 text-primary" />
            <span className="font-mono">{truncatePrincipal(principalStr)}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            data-ocid="settings.open_modal_button"
            className="gap-1.5 text-muted-foreground hover:text-foreground text-xs"
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            data-ocid="auth.secondary_button"
            className="gap-1.5 text-muted-foreground hover:text-foreground text-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 border-r border-border flex flex-col bg-sidebar">
          <div className="px-3 py-3 border-b border-border">
            <Button
              size="sm"
              variant="ghost"
              data-ocid="notes.open_modal_button"
              className="w-full justify-start gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => {
                setNewNoteTitle("");
                setNewNoteDialog(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              New Note
            </Button>
          </div>
          <ScrollArea className="flex-1">
            {loadingNotes ? (
              <div
                data-ocid="notes.loading_state"
                className="flex items-center justify-center p-6"
              >
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : notes.length === 0 ? (
              <div
                data-ocid="notes.empty_state"
                className="p-4 text-center text-xs text-muted-foreground"
              >
                No notes yet
              </div>
            ) : (
              <div className="p-2 space-y-0.5" data-ocid="notes.list">
                {notes.map((note, i) => (
                  <button
                    key={note.id}
                    type="button"
                    data-ocid={`notes.item.${i + 1}`}
                    onClick={() => selectNote(note)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors group flex items-center justify-between gap-2 ${
                      selectedNote?.id === note.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {note.title || "Untitled"}
                      </span>
                    </span>
                    <button
                      type="button"
                      data-ocid={`notes.delete_button.${i + 1}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteNoteTarget(note);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Main notebook panel */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedNote ? (
              <motion.div
                key={selectedNote.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col min-h-0"
              >
                {/* Note toolbar */}
                <div className="flex items-center justify-between px-6 py-2 border-b border-border shrink-0">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    {saveStatus === "saving" && (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving\u2026
                      </>
                    )}
                    {saveStatus === "saved" && (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Saved
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => {
                        const newCell: Cell = {
                          id: newId(),
                          type: "markdown",
                          content: "",
                        };
                        updateCells([...cells, newCell]);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      Markdown
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                      onClick={() => {
                        const newCell: Cell = {
                          id: newId(),
                          type: "chat",
                          prompt: "",
                          response: "",
                          contextNoteIds: [],
                        };
                        updateCells([...cells, newCell]);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      LLM Cell
                    </Button>
                  </div>
                </div>

                {/* Title */}
                <div className="px-8 pt-6 pb-0 shrink-0">
                  <input
                    data-ocid="notes.input"
                    className="w-full text-2xl font-bold font-display bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
                    placeholder="Untitled"
                    value={editTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                  />
                  <Separator className="mt-4" />
                </div>

                {/* Cells */}
                <ScrollArea className="flex-1">
                  <div className="px-8 py-4 space-y-2">
                    {cells.map((cell, i) => (
                      <CellWrapper
                        key={cell.id}
                        cell={cell}
                        index={i}
                        total={cells.length}
                        notes={notes}
                        onUpdate={(updates) => updateCell(cell.id, updates)}
                        onDelete={() => deleteCell(cell.id)}
                        onInsertBelow={(type) => insertCellBelow(cell.id, type)}
                        onChangeType={(type) => changeType(cell.id, type)}
                        onRun={
                          cell.type === "chat"
                            ? () => runChatCell(cell.id)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </ScrollArea>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                data-ocid="notes.empty_state"
                className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8"
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    No note selected
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Select a note from the sidebar or create one
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  data-ocid="notes.open_modal_button"
                  className="gap-2"
                  onClick={() => {
                    setNewNoteTitle("");
                    setNewNoteDialog(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Note
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* New Note Dialog */}
      <Dialog open={newNoteDialog} onOpenChange={setNewNoteDialog}>
        <DialogContent data-ocid="notes.dialog">
          <DialogHeader>
            <DialogTitle>New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              data-ocid="notes.input"
              placeholder="Note title"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateNote()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewNoteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateNote}
              disabled={creatingNote || !newNoteTitle.trim()}
              data-ocid="notes.submit_button"
            >
              {creatingNote ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {creatingNote ? "Creating\u2026" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Note Confirmation */}
      <AlertDialog
        open={!!deleteNoteTarget}
        onOpenChange={(open) => !open && setDeleteNoteTarget(null)}
      >
        <AlertDialogContent data-ocid="notes.modal">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteNoteTarget?.title || "Untitled"}</strong> will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="notes.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="notes.confirm_button"
              onClick={handleDeleteNote}
              disabled={deletingNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingNote ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings Modal */}
      <SettingsModal
        actor={actor}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
