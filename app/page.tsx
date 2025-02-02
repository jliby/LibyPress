'use client';

import { BookReader } from '@/components/BookReader';
import { ChatBar } from '@/components/ChatBar';
import { useState, useEffect } from 'react';

interface Page {
  number: number;
  content: string;
}

interface Chapter {
  id: number;
  title: string;
  pages: Page[];
}

interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  chapters: {
    id: number;
    title: string;
    pages: number;
  }[];
}

export default function Home() {
  const [book, setBook] = useState<Book | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [isTwoPageView, setIsTwoPageView] = useState(false);

  useEffect(() => {
    async function loadBook() {
      try {
        // Load book metadata
        const bookRes = await fetch('/api/books/modern-development');
        const bookData = await bookRes.json();
        setBook(bookData);

        // Load first chapter
        const chapterRes = await fetch('/api/books/modern-development/chapters/1');
        const chapterData = await chapterRes.json();
        setCurrentChapter(chapterData);
      } catch (error) {
        console.error('Error loading book:', error);
      } finally {
        setLoading(false);
      }
    }

    loadBook();
  }, []);

  const handlePageChange = (pageNumber: number) => {
    // Ensure we don't skip pages in two-page view
    if (isTwoPageView) {
      // If moving forward, ensure we land on odd pages (1, 3, 5, etc.)
      if (pageNumber > currentPage) {
        setCurrentPage(pageNumber % 2 === 0 ? pageNumber - 1 : pageNumber);
      } else {
        // If moving backward, ensure we land on odd pages
        setCurrentPage(pageNumber % 2 === 0 ? pageNumber - 1 : pageNumber);
      }
    } else {
      setCurrentPage(pageNumber);
    }
  };

  const handleChapterChange = async (chapterId: number) => {
    try {
      const res = await fetch(`/api/books/modern-development/chapters/${chapterId}`);
      const chapterData = await res.json();
      setCurrentChapter(chapterData);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error loading chapter:', error);
    }
  };

  const handleTwoPageViewToggle = (enabled: boolean) => {
    setIsTwoPageView(enabled);
    // When enabling two-page view, ensure we're on an odd page
    if (enabled && currentPage % 2 === 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading book...</div>
      </div>
    );
  }

  if (!book || !currentChapter) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Book not found</div>
      </div>
    );
  }

  const currentPageContent = currentChapter.pages[currentPage - 1]?.content || '';
  const nextPageContent = isTwoPageView && currentPage < currentChapter.pages.length 
    ? currentChapter.pages[currentPage]?.content 
    : '';

  return (
    <main className="min-h-screen bg-gray-100">
      <ChatBar />
      <BookReader 
        content={currentPageContent}
        nextPageContent={nextPageContent}
        currentPage={currentPage}
        totalPages={currentChapter.pages.length}
        onPageChange={handlePageChange}
        isTwoPageView={isTwoPageView}
        onTwoPageViewChange={handleTwoPageViewToggle}
      />
    </main>
  );
}
