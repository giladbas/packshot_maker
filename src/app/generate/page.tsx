'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { Nav } from '@/components/nav';
import { ImageModal } from '@/components/image-modal';
import { ASPECT_RATIOS, RESOLUTIONS, THINKING_LEVELS } from '@/types';
import type { AspectRatio, Resolution, ThinkingLevel } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <GeneratePageContent />
    </Suspense>
  );
}

function GeneratePageContent() {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [resolution, setResolution] = useState<Resolution>('2K');
  const [numVariations, setNumVariations] = useState(1);
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('minimal');
  const [webSearch, setWebSearch] = useState(false);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load projects on mount
  useEffect(() => {
    supabase.from('projects').select('id, name').order('name').then(({ data }) => {
      if (data) setProjects(data);
    });
  }, []);

  // Hydrate from URL params (re-run from gallery)
  useEffect(() => {
    const p = searchParams.get('prompt');
    if (p) setPrompt(p);
    const ar = searchParams.get('aspectRatio');
    if (ar && ASPECT_RATIOS.includes(ar as AspectRatio)) setAspectRatio(ar as AspectRatio);
    const res = searchParams.get('resolution');
    if (res && RESOLUTIONS.includes(res as Resolution)) setResolution(res as Resolution);
    const nv = searchParams.get('numVariations');
    if (nv) setNumVariations(Number(nv));
    const tl = searchParams.get('thinkingLevel');
    if (tl && THINKING_LEVELS.includes(tl as ThinkingLevel)) setThinkingLevel(tl as ThinkingLevel);
    const ws = searchParams.get('webSearch');
    if (ws === 'true') setWebSearch(true);
    const pid = searchParams.get('projectId');
    if (pid) setProjectId(pid);
  }, [searchParams]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 14 - referenceImages.length;
    const toAdd = files.slice(0, remaining);

    setReferenceFiles(prev => [...prev, ...toAdd]);

    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setReferenceImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [referenceImages.length]);

  const removeReference = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
    setReferenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError('');
    setResults([]);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          resolution,
          numVariations,
          thinkingLevel,
          webSearch,
          referenceImages: referenceImages.map(img => {
            const base64 = img.split(',')[1];
            return base64;
          }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setResults(data.images);

      // Auto-save to gallery
      await fetch('/api/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          resolution,
          numVariations,
          thinkingLevel,
          webSearch,
          referenceImages: [],
          generatedImages: data.images,
          projectId,
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setGenerating(false);
    }
  };

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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg-primary pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-lg font-semibold text-fg-primary mb-4">Generate</h1>

          {/* Prompt */}
          <div className="mb-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create..."
              className="w-full px-3 py-3 bg-input-bg border border-border rounded-lg text-fg-primary text-sm placeholder:text-fg-muted resize-none h-28"
              disabled={generating}
            />
          </div>

          {/* Reference Images */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-fg-secondary mb-2">
              Reference Images ({referenceImages.length}/14)
            </label>
            <div className="flex flex-wrap gap-2">
              {referenceImages.map((img, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeReference(i)}
                    className="absolute top-0 right-0 w-5 h-5 bg-danger text-white text-xs flex items-center justify-center rounded-bl-lg"
                  >
                    x
                  </button>
                </div>
              ))}
              {referenceImages.length < 14 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-lg border border-dashed border-border text-fg-muted hover:text-fg-secondary hover:border-fg-muted flex items-center justify-center text-xl transition-colors"
                >
                  +
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Aspect Ratio */}
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1.5">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-fg-primary text-sm"
                disabled={generating}
              >
                {ASPECT_RATIOS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Resolution */}
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1.5">Resolution</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as Resolution)}
                className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-fg-primary text-sm"
                disabled={generating}
              >
                {RESOLUTIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Variations */}
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1.5">Variations</label>
              <select
                value={numVariations}
                onChange={(e) => setNumVariations(Number(e.target.value))}
                className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-fg-primary text-sm"
                disabled={generating}
              >
                {[1, 2, 3, 4].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1.5">Project</label>
              <select
                value={projectId || ''}
                onChange={(e) => setProjectId(e.target.value || null)}
                className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-fg-primary text-sm"
                disabled={generating}
              >
                <option value="">None</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-3 mb-4">
            {/* Thinking Level */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-fg-secondary">Thinking</label>
              <button
                onClick={() => setThinkingLevel(t => t === 'minimal' ? 'high' : 'minimal')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  thinkingLevel === 'high'
                    ? 'bg-accent text-white'
                    : 'bg-bg-tertiary text-fg-secondary'
                }`}
                disabled={generating}
              >
                {thinkingLevel === 'high' ? 'High' : 'Minimal'}
              </button>
            </div>

            {/* Web Search */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-fg-secondary">Web Search</label>
              <button
                onClick={() => setWebSearch(w => !w)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  webSearch
                    ? 'bg-accent text-white'
                    : 'bg-bg-tertiary text-fg-secondary'
                }`}
                disabled={generating}
              >
                {webSearch ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-all active:scale-[0.98]"
          >
            {generating ? 'Generating...' : 'Generate'}
          </button>

          {error && (
            <p className="mt-3 text-danger text-sm">{error}</p>
          )}

          {/* Loading Shimmer */}
          {generating && (
            <div className={`grid gap-3 mt-6 ${numVariations > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {Array.from({ length: numVariations }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg animate-shimmer" />
              ))}
            </div>
          )}

          {/* Results */}
          {results.length > 0 && !generating && (
            <div className={`grid gap-3 mt-6 animate-fade-in ${results.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {results.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setModalImage(img)}
                  className="rounded-lg overflow-hidden border border-border hover:border-accent transition-colors"
                >
                  <img src={img} alt={`Generated ${i + 1}`} className="w-full h-auto" />
                </button>
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
