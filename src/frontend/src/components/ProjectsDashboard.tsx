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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FolderOpen, Loader2, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import type { Project, backendInterface } from "../backend.d";

interface Props {
  actor: backendInterface;
  onSelectProject: (project: Project) => void;
  showNewProjectDialog?: boolean;
  onNewProjectDialogClose?: () => void;
}

export default function ProjectsDashboard({
  actor,
  onSelectProject,
  showNewProjectDialog,
  onNewProjectDialogClose,
}: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await actor.getProjects();
      setProjects(data);
    } catch {
      setError("Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (showNewProjectDialog) setDialogOpen(true);
  }, [showNewProjectDialog]);

  const openDialog = () => {
    setNewName("");
    setNewDesc("");
    setCreateError(null);
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      setCreateError("Name is required.");
      return;
    }
    try {
      setCreating(true);
      setCreateError(null);
      const id = await actor.createProject(newName.trim(), newDesc.trim());
      setDialogOpen(false);
      onNewProjectDialogClose?.();
      const refreshed = await actor.getProjects();
      setProjects(refreshed);
      const created = refreshed.find((p) => p.id === id);
      if (created) onSelectProject(created);
    } catch {
      setCreateError("Failed to create project. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await actor.deleteProject(deleteTarget.id);
      setDeleteTarget(null);
      await fetchProjects();
    } catch {
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your knowledge workspaces
          </p>
        </div>
        <Button
          onClick={openDialog}
          data-ocid="projects.primary_button"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div
          data-ocid="projects.loading_state"
          className="flex-1 flex items-center justify-center"
        >
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div
          data-ocid="projects.error_state"
          className="flex-1 flex items-center justify-center"
        >
          <p className="text-destructive text-sm">{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          data-ocid="projects.empty_state"
          className="flex-1 flex flex-col items-center justify-center gap-5"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center">
            <FolderOpen className="h-7 w-7 text-primary/60" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              No projects yet
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Create your first project to start building your knowledge base.
            </p>
          </div>
          <Button
            onClick={openDialog}
            data-ocid="projects.open_modal_button"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create your first project
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          data-ocid="projects.list"
        >
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              data-ocid={`projects.item.${i + 1}`}
              className="group relative bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all duration-200"
              onClick={() => onSelectProject(project)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground truncate">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  data-ocid={`projects.delete_button.${i + 1}`}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(project);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* New Project Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) onNewProjectDialogClose?.();
        }}
      >
        <DialogContent data-ocid="projects.dialog">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="proj-name">Name</Label>
              <Input
                id="proj-name"
                data-ocid="projects.input"
                placeholder="e.g. Research Notes"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-desc">
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="proj-desc"
                data-ocid="projects.textarea"
                placeholder="What is this project about?"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
              />
            </div>
            {createError && (
              <p
                data-ocid="projects.error_state"
                className="text-destructive text-sm"
              >
                {createError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDialogOpen(false);
                onNewProjectDialogClose?.();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              data-ocid="projects.submit_button"
            >
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {creating ? "Creating…" : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent data-ocid="projects.modal">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> and all its notes will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="projects.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="projects.confirm_button"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
