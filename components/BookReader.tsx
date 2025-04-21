'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from './LoadingSpinner';

interface TableOfContentsItem {
  title: string;
  pages: {
    title: string;
    pageNumber: number;
    chapterNumber: number;
  }[];
}

interface BookReaderProps {
  content: string;
  nextPageContent?: string;
  currentPage: number;
  totalPages: number;
  bookTitle: string;
  progressPercentage: number;
  chapterIdentifier: string;
  onPageChange: (page: number) => void;
  isTwoPageView: boolean;
  onTwoPageViewChange: (enabled: boolean) => void;
  onMaximizeChange: (maximized: boolean) => void;
  tableOfContents: TableOfContentsItem[];
  onTextSelect?: (selectedText: string) => void;
  onToggleChatSidebar?: () => void;
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
  bookTitle,
  progressPercentage,
  chapterIdentifier,
  onPageChange,
  isTwoPageView,
  onTwoPageViewChange,
  onMaximizeChange,
  tableOfContents,
  onTextSelect,
  onToggleChatSidebar
}) => {
  const [currentLines, setCurrentLines] = useState<LineState[]>([]);
  const [nextPageLines, setNextPageLines] = useState<LineState[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [nextPageLineIndex, setNextPageLineIndex] = useState(0);
  const [isProgressiveRevealEnabled, setIsProgressiveRevealEnabled] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [fontSize, setFontSize] = useState(16); // Base font size in pixels
  const [fontFamily, setFontFamily] = useState('system-ui');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // Transform image URLs to use our image API
  const transformImageUrls = (markdown: string) => {
    return markdown.replace(
      /!\[([^\]]*)\]\(images\/([^)]+)\)/g,
      (match, alt, imageName) => `![${alt}](/api/image?name=${imageName})`
    );
  };

  // Parse content into lines with reveal state
  useEffect(() => {
    if (content) {
      const transformedContent = transformImageUrls(content);
      const parseContent = (content: string): LineState[] => {
        return content.split('\n').map(line => {
          const type: 'text' | 'image' | 'header' = 
            line.startsWith('#') ? 'header' : 
            line.includes('![') ? 'image' : 
            'text';
          
          return {
            text: line,
            revealed: !isProgressiveRevealEnabled,
            type,
            isEmpty: line.trim().length === 0
          };
        });
      };

      setCurrentLines(parseContent(transformedContent));
      setCurrentLineIndex(0);
    }
  }, [content, isProgressiveRevealEnabled]);

  useEffect(() => {
    if (nextPageContent && isTwoPageView) {
      const transformedContent = transformImageUrls(nextPageContent);
      const parseContent = (content: string): LineState[] => {
        return content.split('\n').map(line => {
          const type: 'text' | 'image' | 'header' = 
            line.startsWith('#') ? 'header' : 
            line.includes('![') ? 'image' : 
            'text';
          
          return {
            text: line,
            revealed: !isProgressiveRevealEnabled,
            type,
            isEmpty: line.trim().length === 0
          };
        });
      };

      setNextPageLines(parseContent(transformedContent));
      setNextPageLineIndex(0);
    } else {
      setNextPageLines([]);
    }
  }, [nextPageContent, isTwoPageView, isProgressiveRevealEnabled]);

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
            handlePageChange(currentPage + (isTwoPageView ? 2 : 1));
            // Reset line indices for progressive reveal
            setCurrentLineIndex(0);
            setNextPageLineIndex(0);
          }
        }
        
        // Left arrow moves backward
        if (event.code === 'ArrowLeft') {
          if (currentPage > 1) {
            handlePageChange(currentPage - (isTwoPageView ? 2 : 1));
            // Reset line indices for progressive reveal
            setCurrentLineIndex(0);
            setNextPageLineIndex(0);
          }
        }
      }

      // Handle up/down arrow keys for scrolling
      if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
        event.preventDefault();
        
        const scrollAmount = 200; // Adjust this value to control scroll speed
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

      // Ctrl/Cmd + Plus to increase font size
      if ((event.ctrlKey || event.metaKey) && event.key === '+') {
        event.preventDefault();
        setFontSize(prev => Math.min(prev + 1, 24)); // Min: 12px, Max: 24px
      }
      // Ctrl/Cmd + Minus to decrease font size
      if ((event.ctrlKey || event.metaKey) && event.key === '-') {
        event.preventDefault();
        setFontSize(prev => Math.max(prev - 1, 12)); // Min: 12px, Max: 24px
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

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsMaximized(!!document.fullscreenElement);
      onMaximizeChange?.(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [onMaximizeChange]);

  const toggleFullscreen = async () => {
    try {
      if (!isMaximized && containerRef.current) {
        await containerRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

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
        style={{ fontSize: `${fontSize}px` }}
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
      className="prose max-w-none prose-headings:text-gray-800 prose-p:text-gray-600"
      style={{ 
        '--tw-prose-body': `${fontSize}px`,
        '--tw-prose-headings': `${fontSize * 1.5}px`,
        fontSize: `${fontSize}px`,
        fontFamily: fontFamily
      } as React.CSSProperties}
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
      handlePageChange(currentPage + (isTwoPageView ? 2 : 1));
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - (isTwoPageView ? 2 : 1));
    }
  };

  const adjustFontSize = (delta: number) => {
    setFontSize(prev => Math.min(Math.max(prev + delta, 12), 24)); // Min: 12px, Max: 24px
  };

  const handlePageChange = async (newPage: number) => {
    setIsLoading(true);
    await onPageChange(newPage);
    setIsLoading(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const TableOfContents: React.FC<{ 
    items: TableOfContentsItem[];
    currentPage: number;
    onPageSelect: (page: number) => void;
  }> = ({ items, currentPage, onPageSelect }) => {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Table of Contents</h2>
        {items.map((chapter, index) => (
          <div key={index} className="mb-6">
            <h3 className="text-lg font-semibold mb-2">
              Chapter {chapter.pages[0]?.chapterNumber}: {chapter.title}
            </h3>
            <div className="pl-4">
              {chapter.pages.map((page) => (
                <button
                  key={page.pageNumber}
                  onClick={() => onPageSelect(page.pageNumber)}
                  className={`block w-full text-left py-1 px-2 rounded ${
                    currentPage === page.pageNumber
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  Page {page.pageNumber}: {page.title}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      
      if (selection && selectedText) {
        setSelectedText(selectedText);
        
        // Get selection coordinates
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Position the popup above the selection
        setSelectionPosition({
          x: rect.left + (rect.width / 2),
          y: rect.top - 10 // 10px above selection
        });
      } else {
        // Clear popup when no text is selected
        setSelectionPosition(null);
        setSelectedText('');
      }
    };

    // Clear selection popup when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (selectionPosition && !(e.target as HTMLElement).closest('.selection-popup')) {
        setSelectionPosition(null);
        setSelectedText('');
      }
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onTextSelect, selectionPosition]);

  // Handle sending text to chatbar
  const handleSendToChat = () => {
    if (selectedText && onTextSelect) {
      onTextSelect(selectedText);
      setSelectionPosition(null);
      setSelectedText('');
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full flex flex-col"
      style={{ fontSize: `${fontSize}px` }}
    >
      {/* Book Header - Styled like Stripe Press example */}
      {/* Updated background to #efefef, adjusted border */}
      {/* Make border darker */}
      <div className="flex-shrink-0 bg-[#efefef] px-4 sm:px-6 py-2.5 border-b border-gray-300 z-10">
        <div className="flex justify-between items-center">
          {/* Left Side: Liby Press Button */}  
          <button
              onClick={() => router.push('/')} // Navigate to root/library
              className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300 transition-colors"
            >
              LIBY PRESS
          </button>

          {/* Center: Book Title */}
          <h1 className="text-sm font-medium text-gray-600 truncate px-4">
             {bookTitle} 
          </h1>

          {/* Right Side: Chapter, Progress, Menu */}  
          <div className="flex items-center gap-3 sm:gap-4">
             {/* Chapter Identifier */} 
             <span className="text-xs font-mono uppercase text-gray-500 hidden md:inline">
                {chapterIdentifier}
              </span>
             {/* Progress Percentage - Styled like Stripe */}
             <span className="text-xs font-mono bg-gray-200 rounded-full px-2 py-0.5 text-gray-600 hidden sm:inline">
               {progressPercentage.toFixed(1)}%
             </span>
            {/* Menu/Options Button - Hamburger Icon */} 
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center text-gray-600"
                aria-label="View options"
              >
                 {/* Hamburger Icon */}
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                 </svg>
                 {/* Removed "Options" text */}
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                     // Reverted dropdown styling
                    className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 z-20"
                  >
                    {/* Font Size Controls */}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Font Size</span>
                        <div className="flex items-center gap-2 text-gray-600">
                          <button
                            onClick={() => adjustFontSize(-1)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                            disabled={fontSize <= 12}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="w-8 text-center text-sm">{fontSize}</span>
                          <button
                            onClick={() => adjustFontSize(1)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                            disabled={fontSize >= 24}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Font Style Selector */} 
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Font Style</span>
                        <select
                          value={fontFamily}
                          onChange={(e) => setFontFamily(e.target.value)}
                          className="ml-2 p-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="system-ui">System Default</option>
                          <option value="serif">Serif</option>
                          <option value="'Times New Roman'">Times New Roman</option>
                          <option value="Georgia">Georgia</option>
                          <option value="sans-serif">Sans Serif</option>
                          <option value="Arial">Arial</option>
                          <option value="Helvetica">Helvetica</option>
                          <option value="monospace">Monospace</option>
                          <option value="'Courier New'">Courier New</option>
                        </select>
                      </div>
                    </div>

                    {/* Two-page View Toggle */} 
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Two-page View</span>
                        <button
                          onClick={() => onTwoPageViewChange(!isTwoPageView)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${ 
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
                    </div>

                    {/* Progressive Reveal Toggle */} 
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Progressive Reveal</span>
                        <button
                          onClick={() => setIsProgressiveRevealEnabled(!isProgressiveRevealEnabled)}
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
                    </div>

                    {/* Chat Toggle Button moved here */} 
                    <div className="p-4 border-t border-gray-100">
                      <button
                        onClick={onToggleChatSidebar} 
                        className="w-full flex items-center justify-between text-sm text-gray-700 hover:text-blue-600"
                      >
                        <span>Toggle Chat</span>
                        {/* Use a simple chat icon */} 
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443H17.25c1.6 0 2.994-1.123 3.227-2.707.16-1.087.283-2.185.369-3.293V12a3 3 0 0 0-3-3H5.25a3 3 0 0 0-3 3v.76Z" />
                         </svg>
                      </button>
                    </div>
                     {/* Table of Contents Button moved here */} 
                     <div className="p-4 border-t border-gray-100">
                       <button
                         onClick={() => {setIsTocOpen(!isTocOpen); setIsDropdownOpen(false);}} 
                         className="w-full flex items-center justify-between text-sm text-gray-700 hover:text-blue-600"
                       >
                         <span>Table of Contents</span>
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                         </svg>
                       </button>
                     </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Selection Popup */}
      {selectionPosition && (
        <div
          className="selection-popup fixed z-50 bg-white shadow-lg rounded-lg py-2 px-3 transform -translate-x-1/2 transition-opacity duration-200"
          style={{
            left: `${selectionPosition.x}px`,
            top: `${selectionPosition.y}px`,
          }}
        >
          <button
            onClick={handleSendToChat}
            className="flex items-center space-x-2 text-sm text-gray-700 hover:text-blue-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span>Ask about this</span>
          </button>
        </div>
      )}

      {/* Main content area - takes available space */}
      {/* Added background color */}
      <div className="flex-1 flex flex-col min-h-0 relative bg-[#efefef]">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-70 z-50 flex items-center justify-center">
            <LoadingSpinner message={`Loading page ${currentPage}...`} />
          </div>
        )}

        {/* Content with fade transition */}
        <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} flex-1 flex flex-col min-h-0`}>
          {/* Book content area - takes available space */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Table of Contents Panel */}
            <AnimatePresence>
              {isTocOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="h-full bg-white border-r border-gray-200 overflow-y-auto"
                >
                  <TableOfContents items={tableOfContents} currentPage={currentPage} onPageSelect={onPageChange} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Book Content */}
            <div 
              ref={contentRef}
              className="flex-1 px-8 py-6 overflow-y-auto scroll-smooth"
            >
              <AnimatePresence mode="wait">
                <div 
                  className={`grid ${isTwoPageView ? 'grid-cols-2 gap-12 mx-auto max-w-8xl' : 'grid-cols-1 max-w-4xl mx-auto'}`}
                >
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
          </div>

          {/* Navigation Controls - always at the bottom */}
          <div className="flex-shrink-0 bg-[#efefef] px-8 py-4 border-t border-gray-300">
            <div className="flex justify-between items-center">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${ 
                  currentPage === 1
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:shadow-md' 
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              
              <div className="flex gap-2">
                {/* Previous ellipsis */}
                {currentPage > 3 && (
                  <button className="w-8 h-8 rounded-full flex items-center justify-center">
                    ...
                  </button>
                )}
                
                {/* Page numbers */}
                {[...Array(totalPages)].map((_, idx) => {
                  const pageNum = idx + 1;
                  // Show first page, last page, and 2 pages before and after current page
                  const shouldShow = 
                    pageNum === 1 || 
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 2 && pageNum <= currentPage + 2);

                  if (!shouldShow) return null;

                  return (
                    <button
                      key={idx}
                      onClick={() => onPageChange(pageNum)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${ 
                        (currentPage === pageNum || (isTwoPageView && currentPage + 1 === pageNum))
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100' 
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Next ellipsis */}
                {currentPage < totalPages - 2 && (
                  <button className="w-8 h-8 rounded-full flex items-center justify-center">
                    ...
                  </button>
                )}
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
        </div>
      </div>
    </div>
  );
};
