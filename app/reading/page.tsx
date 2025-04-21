'use client';

import React, { useState, useEffect } from 'react';
import { BookReader } from '@/components/BookReader';
import { ChatBar } from '@/components/ChatBar';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Page {
  content: string;
  title: string;
  pageNumber: number;
  chapterNumber: number;
}

interface Chapter {
  id: number;
  title: string;
  pages: Page[];
}

interface Book {
  title: string;
  chapters: Chapter[];
}

export default function ReadingPage() { // Renamed component
  const [book, setBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [isTwoPageView, setIsTwoPageView] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isChatSidebarVisible, setIsChatSidebarVisible] = useState(false);

  // Get all pages across chapters
  const getAllPages = (book: Book | null) => {
    if (!book) return [];
    return book.chapters.reduce((acc, chapter) => {
      return [...acc, ...chapter.pages];
    }, [] as Page[]);
  };

  useEffect(() => {
    const loadBookData = async () => {
      try {
        // Load book.json
        const bookResponse = await fetch('/api/content?file=book.json');
        const bookData = await bookResponse.json();

        // Load content for all pages
        const updatedChapters = await Promise.all(
          bookData.chapters.map(async (chapter: Chapter, chapterIndex: number) => {
            const loadedPages = await Promise.all(
              chapter.pages.map(async (page: Page, pageIndex: number) => {
                const pageResponse = await fetch(`/api/content?file=${page.content}`);
                const content = await pageResponse.text();
                return {
                  ...page,
                  content,
                  chapterNumber: chapterIndex + 1
                };
              })
            );
            return {
              ...chapter,
              pages: loadedPages
            };
          })
        );

        setBook({
          ...bookData,
          chapters: updatedChapters
        });
        setLoading(false);
      } catch (error) {
        console.error('Error loading book:', error);
        setLoading(false);
      }
    };

    loadBookData();
  }, []);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleTwoPageViewToggle = (enabled: boolean) => {
    setIsTwoPageView(enabled);
  };

  const toggleChatSidebar = () => {
    setIsChatSidebarVisible(prev => !prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner message="Initializing book reader..." />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">No book data available</div>
      </div>
    );
  }

  const allPages = getAllPages(book);
  const totalPages = allPages.length;
  
  const currentPageContent = allPages[currentPage - 1]?.content || '';
  const nextPageContent = isTwoPageView && currentPage < totalPages 
    ? allPages[currentPage]?.content 
    : '';

  // Get current chapter identifier
  const getCurrentChapterIdentifier = () => {
    const chapterNumber = allPages[currentPage - 1]?.chapterNumber;
    // Use 'CHAPTER X' format as requested for the bar
    return chapterNumber ? `CHAPTER ${chapterNumber}` : 'CHAPTER ?'; 
  };

  // Calculate progress percentage
  const progressPercentage = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  // Format table of contents data
  const tableOfContents = book.chapters.map(chapter => ({
    title: chapter.title,
    pages: chapter.pages.map(page => ({
      title: page.title,
      pageNumber: page.pageNumber,
      chapterNumber: page.chapterNumber
    }))
  }));

  return (
    <main className="flex h-screen overflow-hidden">
      {/* Chat Sidebar - Conditionally render based on state */}
      {isChatSidebarVisible && (
        <div className={`${isMaximized ? 'hidden' : 'w-80'} h-full bg-gray-50 border-r border-gray-200 flex-shrink-0 z-10 transition-all duration-300 ease-in-out`}>
          <ChatBar 
            currentContent={currentPageContent}
            pageNumber={currentPage}
            totalPages={totalPages}
            chapterTitle={getCurrentChapterIdentifier()}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 h-full overflow-hidden">
        {/* Book Reader */}
        {!loading && (
          <BookReader
            content={currentPageContent}
            nextPageContent={nextPageContent}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            isTwoPageView={isTwoPageView}
            onTwoPageViewChange={handleTwoPageViewToggle}
            onMaximizeChange={setIsMaximized}
            tableOfContents={tableOfContents}
            onTextSelect={(text) => {
              // @ts-ignore // Re-add temporarily to unblock build
              if (window.handleSelectedText) {
                // @ts-ignore // Re-add temporarily to unblock build
                window.handleSelectedText(text);
              }
            }}
            onToggleChatSidebar={toggleChatSidebar}
            bookTitle={book.title}
            progressPercentage={progressPercentage}
            chapterIdentifier={getCurrentChapterIdentifier()}
          />
        )}
      </div>
    </main>
  );
} 