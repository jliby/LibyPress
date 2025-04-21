import React, { useEffect, useState } from 'react';

function ReadingBookView() {
    const [book, setBook] = useState(null);

    useEffect(() => {
        // Fetch the book data for "Modern Development"
        fetch('/api/books/modern-development')
            .then(res => res.json())
            .then(data => setBook(data));
    }, []);

    if (!book) return <div>Loading book...</div>;

    return (
        <div>
            <h1>{book.title}</h1>
            <h2>by {book.author}</h2>
            <div>{book.content}</div>
        </div>
    );
}

export default ReadingBookView; 