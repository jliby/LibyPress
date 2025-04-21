'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
// Removed Link import as it's not used currently
// import { motion } from 'framer-motion'; // Main motion import not needed here anymore if using MotionCanvas
// Use MotionCanvas for correct typing context
import { Canvas, useFrame } from '@react-three/fiber'; 
import { Book3D } from '@/components/Book3D'; // Import the new component
import { OrbitControls, ScrollControls, useScroll, Html } from '@react-three/drei'; // Import OrbitControls and ScrollControls
import * as THREE from 'three'; // Add THREE import
// Removed: import { LoadingSpinner } from '@/components/LoadingSpinner'; - Will add back if needed for loading state later
// Removed: import { LibraryItem, ProcessingStatus } from '@/types'; - Define locally for now
// Import motion for animation
import { motion, AnimatePresence } from 'framer-motion'; 
// Import the new Nav component
import { VerticalNav } from '@/components/VerticalNav';
// Import useRouter for navigation
import { useRouter } from 'next/navigation'; 
// ADDED: Import the new modal component
import { AddBookModal } from '@/components/AddBookModal';
// <-- ADDED: Import book data -->
import bookData from '@/data/books.json';

// Keep LibraryItem type, but use its properties for Book3D
interface LibraryItem {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  // Use hex colors for Three.js materials
  spineColor: string; 
  coverColor: string; 
  pageColor: string;  
  textColor: string;  
  // Dimensions can also be part of this type later
  coverTexturePath?: string; // <-- ADDED: Optional path for cover texture
}

// Removed BookItem and BookStack components

// --- Configuration --- 
const BOOK_WIDTH = 3.5;
const BOOK_HEIGHT = 5; 
const BOOK_DEPTH = 0.5;
const BOOK_GAP = 0.3;

// --- Updated BookStack3D Component --- 
interface BookStack3DProps {
  books: LibraryItem[];
  layoutMode: 'vertical' | 'horizontal'; // Add layout mode prop
  onClick: (book: LibraryItem) => void;
}

function BookStack3D({ books, layoutMode, onClick }: BookStack3DProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const scroll = useScroll();

  useFrame(() => {
    if (!groupRef.current) return;

    const count = books.length;
    let totalScrollDistance = 0;
    let targetY = 0;
    let targetX = 0;

    if (layoutMode === 'vertical') {
        // Original vertical logic: Move group UP as scroll.offset increases
        totalScrollDistance = (count - 1) * (BOOK_HEIGHT + BOOK_GAP);
        targetY = scroll.offset * totalScrollDistance;
        targetX = 0; // Center X
    } else { // "Horizontal" mode (Stripe layout: flat books, stacked vertically)
        // Move group UP as scroll.offset increases, using DEPTH for spacing
        totalScrollDistance = (count - 1) * (BOOK_DEPTH + BOOK_GAP); 
        targetY = scroll.offset * totalScrollDistance;
        targetX = 0; // Center X
    }
    // Apply position smoothly
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.1);
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.1);
  });

  // Calculate initial centering offset based on mode
  // For vertical, start centered. For horizontal (stripe), start centered based on depth.
  const initialYOffset = layoutMode === 'vertical' 
    ? 0 // Vertical scroll starts centered
    : (books.length - 1) * (BOOK_DEPTH + BOOK_GAP) / 2; // Center the flat stack
  const initialXOffset = 0; // Always centered horizontally initially

  return (
    <group ref={groupRef} position={[initialXOffset, initialYOffset, 0]}>
      {books.map((book, index) => {
        let xPos = 0;
        let yPos = 0;
        let rotation: [number, number, number] = [0, 0, 0];

        if (layoutMode === 'vertical') {
            // Stack vertically, standing up
            yPos = -(index * (BOOK_HEIGHT + BOOK_GAP));
            rotation = [0, 0, 0]; // Standard orientation
        } else { // "Horizontal" mode (Stripe layout: flat books, stacked vertically)
            // Stack vertically, lying flat
            yPos = -(index * (BOOK_DEPTH + BOOK_GAP)); // Use depth for vertical spacing
            // Rotate 90deg on X (lay flat), then -90deg on Z (bring spine forward)
            rotation = [THREE.MathUtils.degToRad(-90), 0, THREE.MathUtils.degToRad(-90)]; 
        }

        return (
            // No need for extra group per book if rotation is consistent in the group
            <Book3D 
                key={book.id}
                position={[xPos, yPos, 0]} 
                rotation={rotation} // Apply rotation directly to Book3D
                dimensions={[BOOK_WIDTH, BOOK_HEIGHT, BOOK_DEPTH]} 
                title={book.title}
                author={book.author}
                subtitle={book.subtitle}
                spineColor={book.spineColor}
                coverColor={book.coverColor}
                pageColor={book.pageColor}
                textColor={book.textColor}
                coverTexturePath={book.coverTexturePath} // <-- ADDED: Pass texture path
                onClick={() => {
                  console.log('Clicked book:', book.title);
                  // Navigate to reading page with book ID
                  onClick(book);
                }}
            />
        );
      })}
    </group>
  );
}

// --- ScrollContent Component (Modified) --- 
interface ScrollContentProps {
    books: LibraryItem[];
    layoutMode: 'vertical' | 'horizontal';
    scrollRef: React.MutableRefObject<any>; // To store scroll controls API
    onActiveIndexChange: (index: number) => void; // Callback to update parent state
    onClick: (book: LibraryItem) => void; // Add onClick prop
}

function ScrollContent({ books, layoutMode, scrollRef, onActiveIndexChange, onClick }: ScrollContentProps) {
    const scroll = useScroll();

    // Assign the scroll object to the ref passed from parent
    useEffect(() => {
        if (scrollRef) {
            scrollRef.current = scroll;
        }
    }, [scroll, scrollRef]);

    // Update activeIndex based on scroll and call parent callback
    useFrame(() => {
        const sections = books.length;
        // Slightly adjust calculation to center the active item more reliably
        const currentSection = Math.floor(scroll.offset * (sections - 1)); 
        const activeIndex = Math.min(sections - 1, Math.max(0, currentSection));

        onActiveIndexChange(activeIndex); // Report change to parent
    });

    // Only render the BookStack3D now, Nav is rendered outside
    return (
        <BookStack3D 
            books={books} 
            layoutMode={layoutMode} 
            onClick={onClick} 
        />
    );
}

// --- LibraryPage Component (Modified) --- 
export default function LibraryPage() {
  const router = useRouter(); // Get router instance
  // Simplified state for the new design
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>(bookData); // Will be populated with mock data initially
  // Ensure initial layout mode is vertical
  const [layoutMode, setLayoutMode] = useState<'vertical' | 'horizontal'>('vertical');
  // Add state for search bar expansion
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null); // Ref for input focus
  // Add state for active nav index
  const [activeIndex, setActiveIndex] = useState(0);
  // Ref to hold the scroll object from useScroll
  const scrollRef = useRef<any>(null);
  // Add state for bottom controls HUD
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Add state for detail modal
  const [selectedBook, setSelectedBook] = useState<LibraryItem | null>(null);
  // ADDED: State for Add Book modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // <-- ADDED: State for filtered books -->
  const [filteredBooks, setFilteredBooks] = useState<LibraryItem[]>([]);
  // <-- ADDED: Ref for OrbitControls -->
  const controlsRef = useRef<any>(null);
  // <-- ADDED: State for auto-rotation -->
  const [isAutoRotating, setIsAutoRotating] = useState(false); // Default: off
  // <-- ADDED: State for zoom control -->
  const [isZoomEnabled, setIsZoomEnabled] = useState(false); // Default: off

  // --- Calculate Scroll Pages (Moved Up) --- 
  // Calculate BEFORE conditional returns to obey Rules of Hooks
  const scrollPages = useMemo(() => {
    const itemsPerPage = layoutMode === 'vertical' ? 2 : 4; // Estimate how many books fit roughly per viewport height
    return Math.max(1, Math.ceil(libraryItems.length / itemsPerPage));
  }, [layoutMode, libraryItems.length]);

  useEffect(() => {
    // Simulate fetching data - replace with actual fetch if needed later
    setIsLoading(false);
  }, []);

  useEffect(() => {
     setIsLoading(false);
     // Focus input when search expands
     if (isSearchExpanded && searchInputRef.current) {
         searchInputRef.current.focus();
     }
  }, [isSearchExpanded]);

  // <-- ADDED: useEffect for filtering books based on searchQuery -->
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredBooks(libraryItems); // Show all if query is empty
      return;
    }

    const results = libraryItems.filter(book => 
      book.title.toLowerCase().includes(query) ||
      (book.author && book.author.toLowerCase().includes(query)) ||
      (book.subtitle && book.subtitle.toLowerCase().includes(query))
    );
    setFilteredBooks(results);
  }, [searchQuery, libraryItems]);

  // Removed functions: fetchLibraryItems, handlePdfUploadSuccess, handlePdfUploadError, openDetailModal, closeDetailModal, handleDeleteBook, handleUpdateBook


  // Removed: Filtered items logic, categories


  if (isLoading) {
    // Basic loading state for now
    return <div className="flex justify-center items-center min-h-screen bg-black text-white">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen bg-black text-red-500">Error: {error}</div>;
  }

  const toggleLayoutMode = () => {
    setLayoutMode(prev => prev === 'vertical' ? 'horizontal' : 'vertical');
  };

  // --- Callback for ScrollContent to update activeIndex --- 
  const handleActiveIndexChange = (index: number) => {
    setActiveIndex(index);
  };

  // --- Function for VerticalNav to trigger scroll --- 
  const handleScrollRequest = (index: number) => {
    if (scrollRef.current?.el && libraryItems.length > 1) {
       // Use the ORIGINAL list length for calculating scroll offset
       const originalListLength = libraryItems.length;
       if (originalListLength <= 1) return; // Avoid division by zero

       const targetOffset = index / (originalListLength - 1); 
       const scrollHeight = scrollRef.current.el.scrollHeight;
       const clientHeight = scrollRef.current.el.clientHeight;
       const maxScrollTop = scrollHeight - clientHeight;
       const targetScrollTop = targetOffset * maxScrollTop;
        
        scrollRef.current.el.scrollTo({ 
            top: targetScrollTop,
            behavior: 'smooth' 
        });
    }
  };

  // --- Function to handle book click for modal ---
  const handleBookClick = (book: LibraryItem) => {
    console.log('Opening detail modal for:', book.title);
    setSelectedBook(book);
  };

  const closeDetailModal = () => {
    setSelectedBook(null);
  };

  // ADDED: Handlers for Add Book modal
  const openAddModal = () => {
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleAddBookSubmit = (formData: any) => { // Use 'any' for now, refine AddBookFormData if needed
    console.log('--- Submitting New Book --- ');
    console.log('Title:', formData.title);
    console.log('Author:', formData.author);
    console.log('Subtitle:', formData.subtitle);
    console.log('Cover Color:', formData.coverColor);
    console.log('Spine Color:', formData.spineColor);
    console.log('Page Color:', formData.pageColor);
    console.log('Text Color:', formData.textColor);
    console.log('PDF File:', formData.pdfFile ? formData.pdfFile.name : 'No file');
    
    // --- TODO: Implement Actual Upload and Processing --- 
    // 1. Send formData.pdfFile and metadata to a backend API endpoint.
    // 2. Backend processes PDF, stores data.
    // 3. Update libraryItems state with the new book from backend response or refetch.
    
    // --- Placeholder: Add to mock data locally --- 
    const newBook: LibraryItem = {
      id: String(Date.now()), // Simple unique ID for now
      title: formData.title,
      author: formData.author,
      subtitle: formData.subtitle,
      coverColor: formData.coverColor,
      spineColor: formData.spineColor,
      pageColor: formData.pageColor,
      textColor: formData.textColor,
    };
    setLibraryItems(prev => [...prev, newBook]); 
    // -----------------------------------------

    closeAddModal(); // Close modal after submission
  };

    return (
     <div className="min-h-screen bg-[#201819] text-white flex flex-col relative overflow-hidden">
         {/* Header remains */}
         <header className="absolute top-8 left-8 z-10">
            {/* Apply rainbow animation classes here, animate only on hover */}
            <div className="text-2xl font-serif italic bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent bg-size-300 hover:animate-gradient">Liby Press AI</div>
             <div className="text-sm text-gray-400">Ideas for progress</div>
         </header>
        
         {/* Combined Top Center Controls */}
         <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-4 p-2">
             {/* Centered Layout Toggle Icon Button */}
              <button
                 onClick={toggleLayoutMode}
                 // Removed absolute positioning classes
                 className="p-2 rounded-md hover:bg-gray-700/50 transition-colors"
                 aria-label={`Switch to ${layoutMode === 'vertical' ? 'Horizontal' : 'Vertical'} View`}
             >
                  <div className="w-6 h-6 flex flex-col items-center justify-center space-y-1">
                     {layoutMode === 'vertical' ? (
                         <>
                             <div className="w-5 h-0.5 bg-white"></div>
                             <div className="w-5 h-0.5 bg-white"></div>
                             <div className="w-5 h-0.5 bg-white"></div>
                         </>
                     ) : (
                         <div className="flex space-x-1">
                              <div className="w-0.5 h-5 bg-white"></div>
                              <div className="w-0.5 h-5 bg-white"></div>
                              <div className="w-0.5 h-5 bg-white"></div>
      </div>
        )}
      </div>
                </button>

             {/* Animated Search - Now positioned within the flex container */}
             {/* Removed outer positioning div */}
             <motion.div
                 // Removed absolute positioning from here
                 className="relative flex items-center bg-black/50 backdrop-blur-md rounded-full shadow-lg border border-white/10 overflow-hidden"
                 initial={{ width: '3rem', height: '3rem', paddingLeft: '0.5rem', paddingRight: '0.5rem' }} 
                 animate={{ 
                     width: isSearchExpanded ? '28rem' : '3rem', 
                     height: '3rem', 
                     paddingLeft: isSearchExpanded ? '0.5rem' : '0.5rem', 
                     paddingRight: isSearchExpanded ? '0.5rem' : '0.5rem' 
                 }}
                 transition={{ type: 'spring', stiffness: 200, damping: 25 }}
             >
                 {/* Icon Button always visible */}
                <button 
                     onClick={() => setIsSearchExpanded(!isSearchExpanded)} 
                     className="focus:outline-none flex-shrink-0 z-20 hover:bg-white/10 rounded-full flex items-center justify-center h-full w-[2rem]"
                     aria-label={isSearchExpanded ? "Close Search" : "Open Search"}
                 >
                     <svg 
                         className="w-5 h-5 text-gray-200" 
                         fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                         viewBox="0 0 24 24" stroke="currentColor"
                     >
                          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                      </svg>
                 </button>
                 
                 {/* Input appears inside */}
                 <AnimatePresence>
                     {isSearchExpanded && (
                         <motion.input 
                             ref={searchInputRef} 
                             key="search-input"
                             type="text" 
                             value={searchQuery}
                             onChange={(e) => setSearchQuery(e.target.value)}
                             onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                 e.preventDefault(); // Prevent form submission if any
                                 if (filteredBooks.length > 0) {
                                   const firstMatchId = filteredBooks[0].id;
                                   const originalIndex = libraryItems.findIndex(book => book.id === firstMatchId);
                                   if (originalIndex !== -1) {
                                     handleScrollRequest(originalIndex);
                                     setIsSearchExpanded(false); // Close search bar
                                     setSearchQuery(''); // Clear search query
                                   }
                                 } else {
                                     // Maybe provide feedback if no results?
                                     console.log("No books found for query:", searchQuery);
                                 }
                               }
                             }}
                             placeholder="Search Books..." 
                             className="flex-grow bg-transparent text-white placeholder-gray-400 focus:outline-none text-lg ml-1 pr-2"
                             initial={{ opacity: 0 }}
                             animate={{ opacity: 1 }}
                             exit={{ opacity: 0 }}
                             transition={{ delay: 0.1, duration: 0.1 }} 
                         />
                     )}
                 </AnimatePresence>
             </motion.div>
             </div>

         {/* Top Right Controls */}
         <div className="absolute top-8 right-8 z-10 flex items-center gap-3">
              {/* User Profile Icon Button (was Settings) */}
              <button 
                  onClick={() => router.push('/profile')} // Navigate to profile page
                  className="p-2 bg-white/10 border border-white/20 text-white rounded-full hover:bg-white/20 transition-colors"
                  aria-label="User Profile" // Updated aria-label
              >
                  {/* User Icon SVG */}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
              </button>
              {/* Add Book Button - UPDATED onClick */}
              <button 
                 onClick={openAddModal} // Open the new modal
                 className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                 Add Book
              </button>
         </div>

        {/* Vertical Nav - Rendered OUTSIDE Canvas */}
        <div className="absolute top-1/2 left-8 transform -translate-y-1/2 z-10">
             <VerticalNav 
                items={filteredBooks} // <-- Use filtered books
                activeIndex={activeIndex} 
                scrollToIndex={handleScrollRequest} // Use the new handler
        />
      </div>

        {/* Bottom Center Controls HUD */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 flex justify-center items-center">
            <motion.div
                className="flex items-center justify-center bg-black/50 backdrop-blur-md border border-white/10 shadow-lg overflow-hidden"
                // Animate size and shape based on expanded state
                initial={false} // Don't animate on initial load
                animate={{
                    width: isControlsExpanded ? 'auto' : '3rem', 
                    height: '3rem',
                    borderRadius: isControlsExpanded ? '1rem' : '9999px', // Pill -> Circle
                    paddingLeft: isControlsExpanded ? '1rem' : '0.5rem',
                    paddingRight: isControlsExpanded ? '1rem' : '0.5rem'
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
                {/* Toggle Button (Always Visible) */}
                <button 
                    onClick={() => setIsControlsExpanded(!isControlsExpanded)} 
                    className="p-1 focus:outline-none flex-shrink-0 hover:bg-white/10 rounded-full flex items-center justify-center z-20"
                    aria-label={isControlsExpanded ? "Close Controls" : "Open Controls"}
                    style={{ width: '2rem', height: '2rem' }} 
                >
                    {/* Simple Controls Icon (e.g., sliders) */}
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-gray-200">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                    </svg>
                  </button>

                {/* Expanded Controls (Placeholders) */}
                <AnimatePresence>
                    {isControlsExpanded && (
                        <motion.div 
                            className="flex items-center gap-4 ml-3"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ delay: 0.1, duration: 0.2 }}
                        >
                            {/* Zoom Toggle Button */}
                            <button 
                                onClick={() => setIsZoomEnabled(!isZoomEnabled)}
                                className={`text-sm whitespace-nowrap px-2 py-1 rounded ${isZoomEnabled ? 'bg-white/20' : 'bg-white/10 opacity-60'} hover:bg-white/30 transition-colors`}
                            >
                                {isZoomEnabled ? 'Zoom On' : 'Zoom Off'}
                            </button>
                            {/* Orientation Toggle Button */}
                            <button 
                                onClick={() => setIsAutoRotating(!isAutoRotating)}
                                className={`text-sm whitespace-nowrap px-2 py-1 rounded ${isAutoRotating ? 'bg-pink-600/50' : 'bg-white/10'} hover:bg-white/20 transition-colors`}
                            >
                                {isAutoRotating ? 'Stop Rotate' : 'Auto Rotate'}
                            </button>
                            {/* Reset Button */}
                            <button 
                                onClick={() => {
                                    controlsRef.current?.reset();
                                    setIsAutoRotating(false);
                                }}
                                className="text-sm whitespace-nowrap px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                Reset View
                            </button>
                         </motion.div>
                     )}
                 </AnimatePresence>
            </motion.div>
      </div>

        {/* Main content area - Revert back to Canvas */}
        <div className="flex-grow flex items-center justify-center">
             <Canvas 
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} 
                shadows // Enable shadows on the Canvas
                // Camera position and field of view
                camera={{ position: [0, 0, 9], fov: 40 }} 
             >
                 {/* Wrap BookStack3D with ScrollControls */}
                 <Suspense fallback={null}>
                    <ScrollControls pages={scrollPages} damping={0.25}> 
                     {/* Pass ref and callback down */}
                     <ScrollContent 
                        books={filteredBooks} // <-- Use filtered books
                        layoutMode={layoutMode} 
                        scrollRef={scrollRef} 
                        onActiveIndexChange={handleActiveIndexChange} 
                        onClick={handleBookClick} 
                     />
                    </ScrollControls>
                 </Suspense>
                 {/* Lighting (can stay here or move into ScrollContent if preferred) */} 
                 <ambientLight intensity={0.5} /> 
                 <directionalLight 
                   position={[8, 5, 8]} 
                   intensity={1.0} 
                   castShadow 
                   shadow-mapSize-width={2048} 
                   shadow-mapSize-height={2048}
                   shadow-camera-far={30}
                   shadow-camera-left={-10}
                   shadow-camera-right={10}
                   shadow-camera-top={10}
                   shadow-camera-bottom={-10}
                   shadow-bias={-0.0005} 
                />
                <directionalLight 
                    position={[-5, 4, -5]} 
                    intensity={0.2} 
                />
                {/* Add OrbitControls for camera interaction */}
                <OrbitControls 
                   ref={controlsRef} 
                   enableZoom={isZoomEnabled}
                   enablePan={true} // Allow panning for better exploration
                   autoRotate={isAutoRotating} 
                   autoRotateSpeed={0.5} 
                />
             </Canvas>
          </div>

        {/* Modal Pop-up */}  
        <AnimatePresence>
          {selectedBook && (
            <motion.div 
              // Remove flex centering and padding from outer container
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 overflow-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDetailModal} // Close on backdrop click
            >
              {/* Modal Content (Stop propagation to prevent closing when clicking content) */}
              <motion.div 
                // Remove max-w, max-h, rounded, shadow. Keep padding for content spacing.
                className="bg-[#201819] text-white w-full h-full flex flex-col md:flex-row overflow-hidden relative p-6 md:p-8"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
              >
                {/* Close Button */}  
                <button 
                  onClick={closeDetailModal}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                  aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* 3D View Container */} 
                <div className="w-full md:w-1/2 h-64 md:h-auto mb-4 md:mb-0 md:mr-8 flex-shrink-0">
                  <Canvas shadows camera={{ position: [0, 1, 8], fov: 50 }}>
                    <Suspense fallback={null}>
                      <ambientLight intensity={0.8} />
                      <directionalLight 
                        position={[5, 5, 5]} 
                        intensity={1.5} 
                        castShadow
                        shadow-mapSize-width={1024}
                        shadow-mapSize-height={1024}
                      />
                      <Book3D 
                         position={[0, 0, 0]} // Center the book
                         dimensions={[BOOK_WIDTH * 1.2, BOOK_HEIGHT * 1.2, BOOK_DEPTH * 1.2]} // Slightly larger 
                         title={selectedBook.title}
                         author={selectedBook.author}
                         subtitle={selectedBook.subtitle}
                         spineColor={selectedBook.spineColor}
                         coverColor={selectedBook.coverColor}
                         pageColor={selectedBook.pageColor}
                         textColor={selectedBook.textColor}
                         coverTexturePath={selectedBook.coverTexturePath} // <-- ADDED: Pass texture path
                         // No onClick needed for the modal view
                       />
                      <OrbitControls enableZoom={true} enablePan={true} autoRotate autoRotateSpeed={0.5} />
                    </Suspense>
                  </Canvas>
                </div>

                {/* Text Details Container */} 
                <div className="w-full md:w-1/2 flex flex-col justify-center overflow-y-auto">
                  <h2 className="text-3xl font-serif italic mb-1">{selectedBook.title}</h2>
                  {selectedBook.subtitle && (
                    <h3 className="text-lg text-gray-400 mb-3">{selectedBook.subtitle}</h3>
                  )}
                  {selectedBook.author && (
                    <p className="text-md text-gray-300 mb-6">By {selectedBook.author}</p>
                  )}
                  {/* Placeholder for actual description */}
                  <p className="text-gray-400 text-sm leading-relaxed">
                    [Placeholder for book description or summary. Add a 'description' field to LibraryItem to display actual content here.]
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                   </p>
                   {/* Add Read Now Button */}
                   <button 
                      onClick={() => router.push('/reading')} // Navigate to /reading
                      className="mt-6 px-6 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors self-start flex items-center gap-2"
                    >
                      Read Now
                      {/* Optional Arrow Icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </button>
                   {/* Add more details or actions here if needed */}
                 </div>
               </motion.div>
            </motion.div>
           )}
        </AnimatePresence>

        {/* ADDED: Render the Add Book Modal */}
        <AddBookModal 
          isOpen={isAddModalOpen}
          onClose={closeAddModal}
          onSubmit={handleAddBookSubmit}
        />

    </div>
  );
}

// Removed: ProcessingStatusIndicator, PdfUpload, BookDetailModal components (or their placeholders)
// These components are not used in the new design yet.
