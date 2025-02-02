import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: { bookId: string } }
) {
  try {
    const bookPath = path.join(process.cwd(), 'books', params.bookId, 'book.json');
    const bookData = await fs.readFile(bookPath, 'utf-8');
    return NextResponse.json(JSON.parse(bookData));
  } catch (error) {
    return NextResponse.json(
      { error: 'Book not found' },
      { status: 404 }
    );
  }
}
