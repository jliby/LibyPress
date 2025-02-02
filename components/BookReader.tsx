'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface BookReaderProps {
  content: string;
  nextPageContent: string;
  currentPage: number;
  totalPages: number;
  isTwoPageView: boolean;
  onPageChange: (page: number) => void;
  onTwoPageViewChange: (enabled: boolean) => void;
}

interface LineState {
  text: string;
  revealed: boolean;
  type: 'text' | 'image' | 'header';
  isEmpty: boolean;
}

export const BookReader: React.FC<BookReaderProps> = ({ 
  content, 
  nextPageContent,
  currentPage, 
  totalPages,
  isTwoPageView,
  onPageChange,
  onTwoPageViewChange
}) => {
  const [currentLines, setCurrentLines] = useState<LineState[]>([]);
  const [nextPageLines, setNextPageLines] = useState<LineState[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [nextPageLineIndex, setNextPageLineIndex] = useState(0);
  const [isProgressiveRevealEnabled, setIsProgressiveRevealEnabled] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  // Parse content into lines with reveal state
  useEffect(() => {
    const parseContent = (content: string) => {
      return content.split('\n').map(line => ({
        text: line,
        revealed: !isProgressiveRevealEnabled,
        type: line.startsWith('#') ? 'header' : line.includes('![') ? 'image' : 'text',
        isEmpty: line.trim().length === 0
      }));
    };

    setCurrentLines(parseContent(content));
    setCurrentLineIndex(0);
    
    if (nextPageContent) {
      setNextPageLines(parseContent(nextPageContent));
      setNextPageLineIndex(0);
    }
  }, [content, nextPageContent, isProgressiveRevealEnabled]);

  const revealNextLine = (lines: LineState[], currentIndex: number): [LineState[], number] => {
    const newLines = [...lines];
    let newIndex = currentIndex;

    // Reveal current line and any subsequent empty lines
    while (newIndex < newLines.length) {
      newLines[newIndex] = { ...newLines[newIndex], revealed: true };
      newIndex++;
      
      // If we just revealed a non-empty line, stop here
      if (!newLines[newIndex - 1].isEmpty) {
        break;
      }
    }

    return [newLines, newIndex];
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Handle space bar for progressive reveal
      if (event.code === 'Space' && isProgressiveRevealEnabled) {
        event.preventDefault();
        
        if (currentLineIndex < currentLines.length) {
          const [newLines, newIndex] = revealNextLine(currentLines, currentLineIndex);
          setCurrentLines(newLines);
          setCurrentLineIndex(newIndex);
        } else if (isTwoPageView && nextPageLineIndex < nextPageLines.length) {
          const [newLines, newIndex] = revealNextLine(nextPageLines, nextPageLineIndex);
          setNextPageLines(newLines);
          setNextPageLineIndex(newIndex);
        }
      }
      
      // Handle left/right arrow keys for page navigation
      if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') {
        event.preventDefault();
        
        // Right arrow moves forward
        if (event.code === 'ArrowRight') {
          if (currentPage < totalPages) {
            onPageChange(currentPage + (isTwoPageView ? 2 : 1));
            // Reset line indices for progressive reveal
            setCurrentLineIndex(0);
            setNextPageLineIndex(0);
          }
        }
        
        // Left arrow moves backward
        if (event.code === 'ArrowLeft') {
          if (currentPage > 1) {
            onPageChange(currentPage - (isTwoPageView ? 2 : 1));
            // Reset line indices for progressive reveal
            setCurrentLineIndex(0);
            setNextPageLineIndex(0);
          }
        }
      }

      // Handle up/down arrow keys for scrolling
      if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
        event.preventDefault();
        
        const scrollAmount = 100; // Adjust this value to control scroll speed
        const contentElement = contentRef.current;
        
        if (contentElement) {
          if (event.code === 'ArrowUp') {
            contentElement.scrollBy({
              top: -scrollAmount,
              behavior: 'smooth'
            });
          } else {
            contentElement.scrollBy({
              top: scrollAmount,
              behavior: 'smooth'
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [
    currentLineIndex, 
    nextPageLineIndex, 
    currentLines.length, 
    nextPageLines.length, 
    isTwoPageView, 
    isProgressiveRevealEnabled,
    currentPage,
    totalPages,
    onPageChange
  ]);

  const renderLine = (line: LineState) => {
    if (line.type === 'image' && line.revealed) {
      const match = line.text.match(/!\[(.*?)\]\((.*?)\)/);
      if (match) {
        return (
          <div className="my-4 flex justify-center">
            <img
              src={match[2]}
              alt={match[1] || 'Book illustration'}
              className="max-w-full h-auto rounded-lg shadow-md"
              style={{ maxHeight: '400px' }}
            />
          </div>
        );
      }
    }

    return (
      <div
        className={`transition-opacity duration-300 ${
          line.revealed ? 'opacity-100' : 'opacity-20'
        }`}
      >
        <ReactMarkdown>{line.text}</ReactMarkdown>
      </div>
    );
  };

  const renderPage = (lines: LineState[], pageNumber: number) => (
    <motion.div
      key={pageNumber}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="prose prose-lg max-w-none prose-headings:text-gray-800 prose-p:text-gray-600"
    >
      {lines.map((line, index) => (
        <div key={index}>
          {renderLine(line)}
        </div>
      ))}
    </motion.div>
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + (isTwoPageView ? 2 : 1));
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - (isTwoPageView ? 2 : 1));
    }
  };

  return (
    <div className="fixed left-80 right-0 top-0 bottom-0 flex items-center justify-center bg-gray-100 p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[90rem] h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden relative"
      >
        {/* Book Header */}
        <div className="sticky top-0 bg-gray-50 px-8 py-5 border-b border-gray-200 z-10">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-800">The Art of Modern Development</h1>
            <div className="flex items-center gap-6">
              {/* Progressive Reveal Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Progressive reveal</span>
                <button
                  onClick={() => {
                    setIsProgressiveRevealEnabled(!isProgressiveRevealEnabled);
                    // Reset line indices when toggling
                    setCurrentLineIndex(0);
                    setNextPageLineIndex(0);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    isProgressiveRevealEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                      isProgressiveRevealEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Two-page view</span>
                <button
                  onClick={() => onTwoPageViewChange(!isTwoPageView)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    isTwoPageView ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                      isTwoPageView ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="text-sm font-medium text-gray-500">
                Page {currentPage}{isTwoPageView && currentPage < totalPages ? `-${currentPage + 1}` : ''} of {totalPages}
              </div>
            </div>
          </div>
        </div>

        {/* Book Content */}
        <div 
          ref={contentRef}
          className="px-8 py-6 h-[calc(85vh-4.5rem-4rem)] overflow-y-auto scroll-smooth"
        >
          <AnimatePresence mode="wait">
            <div className={`grid ${isTwoPageView ? 'grid-cols-2 gap-12 mx-auto max-w-8xl' : 'grid-cols-1 max-w-4xl mx-auto'}`}>
              <div className={`${isTwoPageView ? 'border-r pr-6' : ''}`}>
                {renderPage(currentLines, currentPage)}
              </div>
              {isTwoPageView && nextPageContent && (
                <div className="pl-6">
                  {renderPage(nextPageLines, currentPage + 1)}
                </div>
              )}
            </div>
          </AnimatePresence>
        </div>

        {/* Navigation Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-50 px-8 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                currentPage === 1
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-gray-700 bg-white hover:bg-gray-100 hover:text-gray-900 hover:shadow-md'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            
            <div className="flex gap-2">
              {[...Array(totalPages)].map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => onPageChange(idx + 1)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                    (currentPage === idx + 1 || (isTwoPageView && currentPage + 1 === idx + 1))
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || (isTwoPageView && currentPage >= totalPages - 1)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                (currentPage === totalPages || (isTwoPageView && currentPage >= totalPages - 1))
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-gray-700 bg-white hover:bg-gray-100 hover:text-gray-900 hover:shadow-md'
              }`}
            >
              Next
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
