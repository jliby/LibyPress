import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'File parameter is required' },
        { status: 400 }
      );
    }

    // Ensure the file path is within the books directory
    const basePath = path.join(process.cwd(), 'scripts', 'output');
    const filePath = path.join(basePath, file);

    // Security check: ensure the file path is within the books directory
    if (!filePath.startsWith(basePath)) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error(`File not found: ${filePath}`);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const content = await fs.readFile(filePath, 'utf8');
    
    // If it's a JSON file, parse it
    if (file.endsWith('.json')) {
      return NextResponse.json(JSON.parse(content));
    }
    
    // Otherwise return the raw content
    return new NextResponse(content);
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json(
      { error: 'Failed to load content' },
      { status: 500 }
    );
  }
}
