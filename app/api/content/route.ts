import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET() {
  try {
    // Read the mock content from chapter1.md
    const filePath = path.join(process.cwd(), 'books', 'modern-development', 'chapters', 'chapter1.md');
    const content = await fs.readFile(filePath, 'utf8');
    
    return NextResponse.json({
      content,
      currentPage: 1,
      totalPages: 5
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json(
      { error: 'Failed to load content' },
      { status: 500 }
    );
  }
}
