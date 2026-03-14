import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

const RESOLUTION_MAP: Record<string, string> = {
  '512px': '512x512',
  '1K': '1024x1024',
  '2K': '2048x2048',
  '4K': '4096x4096',
};

export async function POST(req: NextRequest) {
  try {
    // Verify auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's API key from settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('gemini_api_key')
      .eq('user_id', user.id)
      .single();

    if (!settings?.gemini_api_key) {
      return NextResponse.json(
        { error: 'Please set your Gemini API key in Settings' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { prompt, aspectRatio, resolution, numVariations, thinkingLevel, webSearch, referenceImages } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Build the request parts
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    // Add reference images first
    if (referenceImages && referenceImages.length > 0) {
      for (const base64 of referenceImages) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: base64,
          },
        });
      }
    }

    // Add text prompt
    parts.push({ text: prompt });

    // Build generation config
    const generationConfig: Record<string, unknown> = {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: aspectRatio || '1:1',
      },
    };

    // Add thinking config inside generationConfig
    if (thinkingLevel === 'high') {
      generationConfig.thinkingConfig = { thinkingBudget: 8192 };
    }

    // Build the Gemini API request
    const geminiBody: Record<string, unknown> = {
      contents: [{ parts }],
      generationConfig,
    };

    // Add tools for web search
    if (webSearch) {
      geminiBody.tools = [{ googleSearch: {} }];
    }

    // Generate images (make multiple calls if more than 1 variation)
    const images: string[] = [];
    const calls = numVariations || 1;

    const promises = Array.from({ length: calls }, () =>
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${settings.gemini_api_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiBody),
        }
      )
    );

    const responses = await Promise.all(promises);

    for (const response of responses) {
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        const errMsg = errData?.error?.message || `Gemini API error: ${response.status}`;
        return NextResponse.json({ error: errMsg }, { status: response.status });
      }

      const data = await response.json();

      // Extract images from response
      if (data.candidates) {
        for (const candidate of data.candidates) {
          if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData) {
                const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                images.push(dataUrl);
              }
            }
          }
        }
      }
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: 'No images were generated. Try a different prompt.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ images });
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
