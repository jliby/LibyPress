import React, { useState, useEffect } from 'react';

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading content..." }) => {
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState(message);
  const [dots, setDots] = useState('');
  
  // Simulate progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        // Slow down progress as it approaches 100%
        const increment = Math.max(1, 10 * (1 - prev / 100));
        return Math.min(prev + increment, 98); // Cap at 98% to show it's still loading
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  // Animate loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Simulate file loading messages
  useEffect(() => {
    const messages = [
      "Loading content...",
      "Preparing pages...",
      "Loading images...",
      "Formatting text...",
      "Almost ready..."
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      setLoadingMessage(messages[index % messages.length]);
      index++;
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Progress steps
  const steps = [
    { threshold: 0, text: 'Initializing application' },
    { threshold: 20, text: 'Loading core modules' },
    { threshold: 40, text: 'Book metadata loaded' },
    { threshold: 60, text: 'Chapter content processed' },
    { threshold: 80, text: 'Images optimized' },
    { threshold: 95, text: 'Finalizing page rendering' },
  ];

  // Get current step
  const currentStep = steps.reduce((prev, curr) => 
    progress >= curr.threshold ? curr : prev, 
    steps[0]
  );

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-md mx-auto px-4">
      {/* Progress bar container */}
      <div className="w-full h-2 bg-black bg-opacity-10 rounded-full overflow-hidden mb-6">
        {/* Animated progress bar */}
        <div 
          className="h-full bg-black rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Current step and percentage */}
      <div className="text-center">
        <div className="text-black text-sm font-medium">
          {loadingMessage}{dots}
        </div>
        <div className="text-black text-xs mt-1">
          {progress.toFixed(0)}% complete
        </div>
      </div>
    </div>
  );
};
