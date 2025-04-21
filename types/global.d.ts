// types/global.d.ts
declare global {
  interface Window {
    handleSelectedText?: (text: string) => void;
  }
}

// Export {}; // Ensure this file is treated as a module if needed, but usually not necessary for global declarations 