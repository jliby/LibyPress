import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageName = searchParams.get('name');

    if (!imageName) {
      return NextResponse.json(
        { error: 'Image name parameter is required' },
        { status: 400 }
      );
    }

    // Ensure the image path is within the images directory
    const basePath = path.join(process.cwd(), 'scripts', 'output', 'images');
    const imagePath = path.join(basePath, imageName);

    // Security check: ensure the image path is within the images directory
    if (!imagePath.startsWith(basePath)) {
      return NextResponse.json(
        { error: 'Invalid image path' },
        { status: 400 }
      );
    }

    // Check if image exists
    try {
      await fs.access(imagePath);
    } catch (error) {
      console.error(`Image not found: ${imagePath}`);
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    const imageBuffer = await fs.readFile(imagePath);
    
    // Determine content type based on file extension
    const ext = path.extname(imageName).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : 
                       ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 
                       'application/octet-stream';

    // Return the image with proper content type
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
