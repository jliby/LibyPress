export const fetchBooks = async () => {
  try {
    const response = await fetch('/api/books')
    if (!response.ok) throw new Error('Network response was not ok')
    return await response.json()
  } catch (error) {
    console.error('Error fetching books:', error)
    // Fallback data in case API fails
    return [
      {
        id: 'modern-development',
        title: 'The Art of Modern Development',
        author: 'Jane Dev',
        // Other properties...
      }
      // Other fallback books...
    ]
  }
} 