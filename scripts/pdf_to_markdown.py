import os
import pdfplumber
import re
from PIL import Image
import io
import hashlib
from tqdm import tqdm
import json

class PDFToMarkdown:
    def __init__(self, pdf_path, output_dir):
        self.pdf_path = pdf_path
        self.output_dir = output_dir
        self.images_dir = os.path.join(output_dir, "images")
        os.makedirs(self.images_dir, exist_ok=True)
        self.book_metadata = {}
        self.current_page_number = 1

    def save_image(self, image_data, page_num):
        # Convert image data to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Generate unique filename based on image content
        image_hash = hashlib.md5(image_data).hexdigest()[:10]
        image_filename = f"image_{page_num}_{image_hash}.png"
        image_path = os.path.join(self.images_dir, image_filename)
        
        # Save image
        image.save(image_path, "PNG")
        return os.path.join("images", image_filename)

    def get_text_blocks(self, page):
        """Extract text while preserving layout and line breaks"""
        text_blocks = []
        last_y1 = None
        current_line = []

        # Extract words with their positions
        words = page.extract_words(x_tolerance=3, y_tolerance=3)
        
        for word in words:
            if last_y1 is None:
                current_line.append(word)
            else:
                # If the word is on a new line (y position differs significantly)
                if abs(word['top'] - last_y1) > 3:
                    # Add the current line to blocks and start a new line
                    if current_line:
                        text_blocks.append(' '.join(w['text'] for w in current_line))
                    current_line = [word]
                else:
                    current_line.append(word)
            
            last_y1 = word['top']

        # Add the last line if it exists
        if current_line:
            text_blocks.append(' '.join(w['text'] for w in current_line))

        return text_blocks

    def create_page_file(self, chapter_num, page_num, content, title=""):
        # Create chapter directory if it doesn't exist
        chapter_dir = os.path.join(self.output_dir, "chapters", str(chapter_num), "pages")
        os.makedirs(chapter_dir, exist_ok=True)
        
        # Create page file
        page_file = os.path.join(chapter_dir, f"{page_num}.md")
        with open(page_file, "w", encoding="utf-8") as f:
            f.write(content)
        
        # Return relative path for book.json
        return os.path.join("chapters", str(chapter_num), "pages", f"{page_num}.md")

    def process_page(self, page, page_num, chapter_num, chapter_title):
        # Get text blocks preserving layout
        text_blocks = self.get_text_blocks(page)
        markdown_content = []
        images = []
        
        # Process each text block
        for block in text_blocks:
            if block.strip():
                markdown_content.append(block)
        
        # Extract images
        for image in page.images:
            try:
                image_data = image.get('stream', b'').get_data()
                image_path = self.save_image(image_data, page_num)
                images.append(image_path)
                markdown_content.append(f"\n![Image {page_num}]({image_path})\n")
            except Exception as e:
                print(f"Error processing image on page {page_num}: {e}")

        # Join content with proper spacing
        content = "\n\n".join(markdown_content)
        
        # Create page file and get relative path
        page_path = self.create_page_file(
            chapter_num, 
            self.current_page_number,
            content,
            title=f"Page {self.current_page_number}"
        )
        
        # Create page metadata
        page_data = {
            "content": page_path,
            "title": f"Page {self.current_page_number}",
            "pageNumber": self.current_page_number,
            "chapterNumber": chapter_num
        }
        
        self.current_page_number += 1
        return page_data

    def detect_chapter_title(self, text):
        """Try to detect if text is a chapter title"""
        if not text:
            return False
        
        first_line = text.split('\n')[0].strip()
        return (first_line.lower().startswith('chapter') or
                first_line.isupper() or
                len(first_line) < 50)

    def convert(self):
        with pdfplumber.open(self.pdf_path) as pdf:
            # Initialize book metadata
            book_title = os.path.splitext(os.path.basename(self.pdf_path))[0]
            self.book_metadata = {
                "id": book_title.lower(),
                "title": book_title,
                "author": "Unknown",
                "description": f"Converted from {os.path.basename(self.pdf_path)}",
                "chapters": []
            }
            
            # Process each page
            print("Converting PDF to Markdown and generating book structure...")
            current_chapter = None
            chapter_num = 1
            chapter_pages = []
            
            for page_num, page in enumerate(tqdm(pdf.pages)):
                # Try to detect chapter title from first line
                first_text = page.extract_text().split('\n')[0] if page.extract_text() else ""
                
                if self.detect_chapter_title(first_text):
                    # Save previous chapter if exists
                    if current_chapter and chapter_pages:
                        self.book_metadata["chapters"].append({
                            "id": chapter_num,
                            "title": current_chapter,
                            "pages": chapter_pages
                        })
                        chapter_num += 1
                        chapter_pages = []
                    
                    current_chapter = first_text.strip()
                
                if not current_chapter:
                    current_chapter = f"Chapter {chapter_num}"
                
                # Process page
                page_data = self.process_page(
                    page,
                    page_num,
                    chapter_num,
                    current_chapter
                )
                chapter_pages.append(page_data)
            
            # Add final chapter
            if current_chapter and chapter_pages:
                self.book_metadata["chapters"].append({
                    "id": chapter_num,
                    "title": current_chapter,
                    "pages": chapter_pages
                })
            
            # Save book.json
            book_json_path = os.path.join(self.output_dir, "book.json")
            with open(book_json_path, "w", encoding="utf-8") as f:
                json.dump(self.book_metadata, f, indent=2, ensure_ascii=False)
            
            print(f"\nBook structure created:")
            print(f"- book.json: {book_json_path}")
            print(f"- Images directory: {self.images_dir}")
            print(f"- Chapters directory: {os.path.join(self.output_dir, 'chapters')}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Convert PDF to structured Markdown book")
    parser.add_argument("pdf_path", help="Path to the PDF file")
    parser.add_argument("--output-dir", default="output", help="Output directory for book structure")
    
    args = parser.parse_args()
    
    converter = PDFToMarkdown(args.pdf_path, args.output_dir)
    converter.convert()
