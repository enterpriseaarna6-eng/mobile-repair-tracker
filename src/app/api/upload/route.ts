import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { StorageService } from '@/lib/storage';

export async function POST(req: Request) {
  try {
    // Only authenticated users (technician) can upload images
    const user = await AuthService.requireUser();
    if (user.role !== 'technician') {
      return NextResponse.json(
        { error: 'Only technicians are authorized to upload repair batch images.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const prefix = (formData.get('prefix') as 'pickup' | 'return') || 'pickup';

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const imageUrl = await StorageService.uploadImage(
      buffer,
      file.name,
      file.type,
      prefix
    );

    return NextResponse.json({
      success: true,
      imageUrl,
      fileName: file.name,
      size: file.size,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Image upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

