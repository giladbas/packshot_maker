'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { Nav } from '@/components/nav';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import type { Project } from '@/types';

export default function ProjectsPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [creating, setCreating] = useState(false);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  }), [session]);

  const loadProjects = useCallback(async () => {
    const res = await fetch('/api/projects', { headers: headers() });
    const data = await res.json();
    setProjects(data.projects || []);
    setLoading(false);
  }, [headers]);

  useEffect(() => {
    if (session) loadProjects();
  }, [session, loadProjects]);

  const createProject = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch('/api/projects', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName('');
    setCreating(false);
    loadProjects();
  };

  const renameProject = async (id: string) => {
    if (!editName.trim()) return;
    await fetch('/api/projects', {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ id, name: editName.trim() }),
    });
    setEditingId(null);
    loadProjects();
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Delete this project? Generations will be unlinked, not deleted.')) return;
    await fetch(`/api/projects?id=${id}`, {
      method: 'DELETE',
      headers: headers(),
    });
    loadProjects();
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg-primary pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-lg font-semibold text-fg-primary mb-4">Projects</h1>

          {/* Create Project */}
          <div className="flex gap-2 mb-6">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New project name"
              className="flex-1 px-3 py-2 bg-input-bg border border-border rounded-lg text-fg-primary text-sm placeholder:text-fg-muted"
              onKeyDown={(e) => e.key === 'Enter' && createProject()}
            />
            <button
              onClick={createProject}
              disabled={creating || !newName.trim()}
              className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Create
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg animate-shimmer" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 text-fg-muted text-sm">
              No projects yet. Create one to organize your generations.
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map(project => (
                <div
                  key={project.id}
                  className="bg-card-bg border border-border rounded-xl p-4 flex items-center justify-between animate-fade-in"
                >
                  {editingId === project.id ? (
                    <div className="flex gap-2 flex-1">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-input-bg border border-border rounded-lg text-fg-primary text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && renameProject(project.id)}
                        autoFocus
                      />
                      <button
                        onClick={() => renameProject(project.id)}
                        className="px-3 py-1.5 text-xs text-accent border border-accent/30 rounded-lg"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-xs text-fg-muted border border-border rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => router.push(`/gallery?project=${project.id}`)}
                        className="text-sm text-fg-primary hover:text-accent transition-colors text-left"
                      >
                        {project.name}
                        <span className="block text-xs text-fg-muted mt-0.5">
                          Created {new Date(project.created_at).toLocaleDateString()}
                        </span>
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditingId(project.id); setEditName(project.name); }}
                          className="px-2.5 py-1 text-xs text-fg-secondary hover:text-fg-primary border border-border rounded-lg transition-colors"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => deleteProject(project.id)}
                          className="px-2.5 py-1 text-xs text-danger hover:text-danger/80 border border-danger/30 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <Nav />
      </div>
    </AuthGuard>
  );
}
