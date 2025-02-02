import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { bookId: string; chapterId: string } }
) {
  try {
    // Get the book metadata
    const bookPath = path.join(process.cwd(), 'books', params.bookId, 'book.json');
    const bookData = JSON.parse(await fs.readFile(bookPath, 'utf-8'));
    
    // Find the chapter
    const chapter = bookData.chapters.find(
      (ch: any) => ch.id === parseInt(params.chapterId)
    );
    
    if (!chapter) {
      throw new Error('Chapter not found');
    }

    // Get all pages for this chapter
    const chapterDir = path.join(process.cwd(), 'books', params.bookId, 'chapters', params.chapterId, 'pages');
    const pages = [];
    
    for (let i = 1; i <= chapter.pages; i++) {
      const pagePath = path.join(chapterDir, `${i}.md`);
      const content = await fs.readFile(pagePath, 'utf-8');
      pages.push({
        number: i,
        content
      });
    }
    
    return NextResponse.json({
      ...chapter,
      pages
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Chapter not found' },
      { status: 404 }
    );
  }
}
