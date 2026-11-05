import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase')
);

// Cache Supabase client to avoid recreating connection on every upload
let cachedSupabaseClient: SupabaseClient | null = null;
function getStorageClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!cachedSupabaseClient) {
    cachedSupabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
  }
  return cachedSupabaseClient;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB tolerance
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

export class StorageService {
  /**
   * Save uploaded file (from FormData/Buffer) and return accessible URL
   */
  static async uploadImage(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    prefix: 'pickup' | 'return' = 'pickup'
  ): Promise<string> {
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error('Image exceeds 25MB maximum file size limit');
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Unsupported image type: ${mimeType}. Please upload JPEG, PNG, or WebP.`);
    }

    const ext = path.extname(originalFilename) || (mimeType === 'image/png' ? '.png' : '.jpg');
    const safeName = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}${ext}`;

    // 1. Try Supabase Storage if configured
    const supabase = getStorageClient();
    if (supabase) {
      try {
        const { error } = await supabase.storage
          .from('repair-images')
          .upload(safeName, buffer, {
            contentType: mimeType,
            upsert: true,
            cacheControl: '31536000',
          });

        if (!error) {
          const { data: publicUrlData } = supabase.storage
            .from('repair-images')
            .getPublicUrl(safeName);
          return publicUrlData.publicUrl;
        }
        console.warn('Supabase storage upload failed, falling back to local disk:', error.message);
      } catch (err) {
        console.warn('Supabase storage error, using local fallback:', err);
      }
    }

    // 2. Local disk fallback
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const filePath = path.join(UPLOADS_DIR, safeName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${safeName}`;
  }

  /**
   * Read image buffer for Excel embedding (from local file or remote url)
   */
  static async getImageBuffer(imageUrl: string): Promise<{ buffer: Buffer; extension: 'jpeg' | 'png' } | null> {
    try {
      if (imageUrl.startsWith('/uploads/')) {
        const localPath = path.join(process.cwd(), 'public', imageUrl);
        if (fs.existsSync(localPath)) {
          const buffer = fs.readFileSync(localPath);
          const ext = path.extname(localPath).toLowerCase().includes('png') ? 'png' : 'jpeg';
          return { buffer, extension: ext };
        }
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        const res = await fetch(imageUrl);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const ext = imageUrl.toLowerCase().includes('.png') ? 'png' : 'jpeg';
          return { buffer, extension: ext };
        }
      }
    } catch (err) {
      console.warn('Could not read image for Excel embed:', imageUrl, err);
    }
    return null;
  }
}

