'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { Nav } from '@/components/nav';
import { ImageModal } from '@/components/image-modal';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import type { Generation, Project } from '@/types';

export default function GalleryPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filterProject, setFilterProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [modalImage, setModalImage] = useState<string | null>(null);

  const headers = useCallback(() => ({
    'Authorization': `Bearer ${session?.access_token}`,
  }), [session]);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      fetch('/api/generations', { headers: headers() }).then(r => r.json()),
      fetch('/api/projects', { headers: headers() }).then(r => r.json()),
    ]).then(([genData, projData]) => {
      setGenerations(genData.generations || []);
      setProjects(projData.projects || []);
      setLoading(false);
    });
  }, [session, headers]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    const url = filterProject
      ? `/api/generations?projectId=${filterProject}`
      : '/api/generations';
    fetch(url, { headers: headers() })
      .then(r => r.json())
      .then(data => {
        setGenerations(data.generations || []);
        setLoading(false);
      });
  }, [filterProject, session, headers]);

  const downloadImage = async (imageUrl: string) => {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `packshot-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rerunGeneration = (gen: Generation) => {
    const params = new URLSearchParams({
      prompt: gen.prompt,
      aspectRatio: gen.aspect_ratio,
      resolution: gen.resolution,
      numVariations: String(gen.num_variations),
      thinkingLevel: gen.thinking_level,
      webSearch: String(gen.web_search),
      projectId: gen.project_id || '',
    });
    router.push(`/generate?${params.toString()}`);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg-primary pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-fg-primary">Gallery</h1>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="px-3 py-1.5 bg-input-bg border border-border rounded-lg text-fg-primary text-xs"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg animate-shimmer" />
              ))}
            </div>
          ) : generations.length === 0 ? (
            <div className="text-center py-16 text-fg-muted text-sm">
              No generations yet. Start creating!
            </div>
          ) : (
            <div className="space-y-6">
              {generations.map(gen => (
                <div key={gen.id} className="bg-card-bg border border-border rounded-xl p-4 animate-fade-in">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-fg-primary truncate">{gen.prompt}</p>
                      <p className="text-xs text-fg-muted mt-0.5">
                        {gen.aspect_ratio} · {gen.resolution} · {new Date(gen.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => rerunGeneration(gen)}
                      className="ml-3 px-2.5 py-1 text-xs text-accent hover:text-accent-hover border border-accent/30 rounded-lg transition-colors"
                    >
                      Re-run
                    </button>
                  </div>
                  <div className={`grid gap-2 ${gen.generated_images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {gen.generated_images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setModalImage(img)}
                        className="rounded-lg overflow-hidden border border-border hover:border-accent transition-colors"
                      >
                        <img src={img} alt="" className="w-full h-auto" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Nav />

        {modalImage && (
          <ImageModal
            imageUrl={modalImage}
            onClose={() => setModalImage(null)}
            onDownload={() => downloadImage(modalImage)}
          />
        )}
      </div>
    </AuthGuard>
  );
}
