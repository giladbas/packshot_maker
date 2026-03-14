export interface Generation {
  id: string;
  user_id: string;
  prompt: string;
  aspect_ratio: string;
  resolution: string;
  num_variations: number;
  thinking_level: string;
  web_search: boolean;
  reference_images: string[];
  generated_images: string[];
  project_id: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  gemini_api_key: string;
  theme: 'dark' | 'light';
}

export const ASPECT_RATIOS = [
  '1:1', '1:4', '1:8', '2:3', '3:2', '3:4',
  '4:1', '4:3', '4:5', '5:4', '8:1',
  '9:16', '16:9', '21:9', 'auto',
] as const;

export const RESOLUTIONS = ['512px', '1K', '2K', '4K'] as const;

export const THINKING_LEVELS = ['minimal', 'high'] as const;

export type AspectRatio = typeof ASPECT_RATIOS[number];
export type Resolution = typeof RESOLUTIONS[number];
export type ThinkingLevel = typeof THINKING_LEVELS[number];
