'use client';

import React from 'react';

interface VerticalNavProps {
  items: { id: string; title?: string }[]; // Expect basic item info
  activeIndex: number; // Index of the currently centered book
  scrollToIndex: (index: number) => void; // Function to scroll to a book
}

export const VerticalNav: React.FC<VerticalNavProps> = ({ items, activeIndex, scrollToIndex }) => {
  return (
    <div className="flex flex-col space-y-1 p-2">
      {items.map((item, index) => (
        <button
          key={item.id}
          onClick={() => scrollToIndex(index)}
          title={item.title || `Item ${index + 1}`} // Tooltip for accessibility
          className={`block w-4 h-1 rounded-full transition-colors duration-200 ${ 
            index === activeIndex 
              ? 'bg-white' 
              : 'bg-gray-600 hover:bg-gray-400'
          }`}
          aria-label={`Go to ${item.title || `Item ${index + 1}`}`}
        ></button>
      ))}
    </div>
  );
}; 