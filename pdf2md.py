#!/usr/bin/env python3

import os
import argparse
from pdf2image import convert_from_path
import pytesseract
from PIL import Image
import anthropic
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def process_page_with_claude(client, page_text, page_num):
    """Process page text with Claude AI to improve formatting and structure."""
    system_prompt = """You are an expert at converting raw text into well-formatted markdown.
    Your task is to:
    1. Clean up any OCR artifacts or errors
    2. Format the text with proper markdown syntax (headers, lists, etc.)
    3. Preserve the original structure and hierarchy of the content
    4. Ensure figures and images stay on the same page as their references
    5. Return only the processed markdown text without any explanations
    
    Important: Keep your response focused and concise. Do not add any commentary."""
    
    message = f"Convert this text from page {page_num} to clean, well-formatted markdown:\n\n{page_text}"
    
    response = client.messages.create(
        model="claude-3-opus-20240229",
        max_tokens=4000,
        temperature=0,
        system=system_prompt,
        messages=[{"role": "user", "content": message}]
    )
    
    return response.content[0].text

def extract_text_from_image(image):
    """Extract text from an image using OCR."""
    return pytesseract.image_to_string(image)

def convert_pdf_to_markdown(pdf_path, output_dir, api_key):
    """Convert PDF to markdown with OCR and AI processing."""
    # Create output directory if it doesn't exist
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Initialize Anthropic client
    client = anthropic.Client(api_key=api_key)
    
    # Convert PDF to images
    images = convert_from_path(pdf_path)
    
    # Process each page
    for i, image in enumerate(images, start=1):
        print(f"Processing page {i}...")
        
        # Extract text using OCR
        page_text = extract_text_from_image(image)
        
        # Process text with Claude
        markdown_text = process_page_with_claude(client, page_text, i)
        
        # Save the markdown file
        output_file = output_dir / f"page_{i:03d}.md"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(markdown_text)
        
        # Save the image
        image_file = output_dir / f"page_{i:03d}.png"
        image.save(image_file, "PNG")
        
        print(f"Saved page {i} to {output_file}")

def main():
    parser = argparse.ArgumentParser(description="Convert PDF to Markdown with OCR and AI processing")
    parser.add_argument("pdf_path", help="Path to the PDF file")
    parser.add_argument("output_dir", help="Directory to save markdown files")
    parser.add_argument("--api-key", help="Anthropic API key", default=os.getenv("ANTHROPIC_API_KEY"))
    
    args = parser.parse_args()
    
    if not args.api_key:
        raise ValueError("Please provide an Anthropic API key via --api-key or ANTHROPIC_API_KEY environment variable")
    
    convert_pdf_to_markdown(args.pdf_path, args.output_dir, args.api_key)

if __name__ == "__main__":
    main()