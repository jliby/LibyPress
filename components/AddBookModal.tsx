'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AddBookFormData {
  title: string;
  author: string;
  subtitle?: string;
  spineColor: string;
  coverColor: string;
  pageColor: string;
  textColor: string;
  pdfFile: File | null;
}

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: AddBookFormData) => void;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<AddBookFormData>({
    title: '',
    author: '',
    subtitle: '',
    spineColor: '#555555', // Default grey
    coverColor: '#aaaaaa', // Default light grey
    pageColor: '#f0f0f0', // Default off-white
    textColor: '#ffffff', // Default white
    pdfFile: null,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AddBookFormData, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name as keyof AddBookFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, pdfFile: e.target.files![0] }));
      if (errors.pdfFile) {
         setErrors(prev => ({ ...prev, pdfFile: undefined }));
      }
    } else {
      setFormData((prev) => ({ ...prev, pdfFile: null }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AddBookFormData, string>> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.author.trim()) newErrors.author = 'Author is required';
    if (!formData.pdfFile) newErrors.pdfFile = 'PDF file is required';
    // Basic hex color validation (starts with #, 7 chars long)
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexRegex.test(formData.spineColor)) newErrors.spineColor = 'Invalid hex color (e.g., #RRGGBB)';
    if (!hexRegex.test(formData.coverColor)) newErrors.coverColor = 'Invalid hex color';
    if (!hexRegex.test(formData.pageColor)) newErrors.pageColor = 'Invalid hex color';
    if (!hexRegex.test(formData.textColor)) newErrors.textColor = 'Invalid hex color';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
      // Optionally reset form here or let the parent handle closing/resetting
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose} // Close on backdrop click
        >
          <motion.div
            className="bg-[#2d2627] text-white rounded-lg shadow-xl w-full max-w-lg p-6 md:p-8 relative overflow-y-auto max-h-[90vh]"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors z-10 p-1 rounded-full hover:bg-white/10"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-semibold mb-6">Add New Book</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-[#3a3031] border ${errors.title ? 'border-red-500' : 'border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent`}
                  required
                />
                 {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>

              {/* Author */}
              <div>
                <label htmlFor="author" className="block text-sm font-medium text-gray-300 mb-1">Author</label>
                <input
                  type="text"
                  id="author"
                  name="author"
                  value={formData.author}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-[#3a3031] border ${errors.author ? 'border-red-500' : 'border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent`}
                  required
                />
                {errors.author && <p className="text-red-500 text-xs mt-1">{errors.author}</p>}
              </div>

              {/* Subtitle (Optional) */}
              <div>
                <label htmlFor="subtitle" className="block text-sm font-medium text-gray-300 mb-1">Subtitle <span className="text-xs text-gray-500">(Optional)</span></label>
                <input
                  type="text"
                  id="subtitle"
                  name="subtitle"
                  value={formData.subtitle}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#3a3031] border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              {/* Color Inputs (Grid Layout) */}
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label htmlFor="coverColor" className="block text-sm font-medium text-gray-300 mb-1">Cover Color</label>
                   <input type="text" id="coverColor" name="coverColor" value={formData.coverColor} onChange={handleChange} placeholder="#RRGGBB" className={`w-full px-3 py-2 bg-[#3a3031] border ${errors.coverColor ? 'border-red-500' : 'border-gray-600'} rounded-md focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-transparent`} required />
                   {errors.coverColor && <p className="text-red-500 text-xs mt-1">{errors.coverColor}</p>}
                 </div>
                 <div>
                   <label htmlFor="spineColor" className="block text-sm font-medium text-gray-300 mb-1">Spine Color</label>
                   <input type="text" id="spineColor" name="spineColor" value={formData.spineColor} onChange={handleChange} placeholder="#RRGGBB" className={`w-full px-3 py-2 bg-[#3a3031] border ${errors.spineColor ? 'border-red-500' : 'border-gray-600'} rounded-md focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-transparent`} required />
                   {errors.spineColor && <p className="text-red-500 text-xs mt-1">{errors.spineColor}</p>}
                 </div>
                 <div>
                   <label htmlFor="pageColor" className="block text-sm font-medium text-gray-300 mb-1">Page Color</label>
                   <input type="text" id="pageColor" name="pageColor" value={formData.pageColor} onChange={handleChange} placeholder="#RRGGBB" className={`w-full px-3 py-2 bg-[#3a3031] border ${errors.pageColor ? 'border-red-500' : 'border-gray-600'} rounded-md focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-transparent`} required />
                   {errors.pageColor && <p className="text-red-500 text-xs mt-1">{errors.pageColor}</p>}
                 </div>
                 <div>
                   <label htmlFor="textColor" className="block text-sm font-medium text-gray-300 mb-1">Text Color</label>
                   <input type="text" id="textColor" name="textColor" value={formData.textColor} onChange={handleChange} placeholder="#RRGGBB" className={`w-full px-3 py-2 bg-[#3a3031] border ${errors.textColor ? 'border-red-500' : 'border-gray-600'} rounded-md focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-transparent`} required />
                   {errors.textColor && <p className="text-red-500 text-xs mt-1">{errors.textColor}</p>}
                 </div>
              </div>

              {/* PDF File Input */}
              <div>
                <label htmlFor="pdfFile" className="block text-sm font-medium text-gray-300 mb-1">PDF File</label>
                <input
                  type="file"
                  id="pdfFile"
                  name="pdfFile"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className={`w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-pink-600/20 file:text-pink-300 hover:file:bg-pink-600/30 ${errors.pdfFile ? 'border border-red-500 rounded-md p-1' : ''}`}
                  required
                />
                {errors.pdfFile && <p className="text-red-500 text-xs mt-1">{errors.pdfFile}</p>}
                {formData.pdfFile && <p className="text-xs text-gray-400 mt-1">Selected: {formData.pdfFile.name}</p>}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 mr-3 bg-gray-600/50 text-gray-300 rounded-md hover:bg-gray-600/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors"
                >
                  Add Book
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 