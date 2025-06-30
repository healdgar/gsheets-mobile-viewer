import React from 'react';
import MarkdownIt from 'markdown-it';

/**
 * TextWithLinks Component
 * 
 * Renders text that may contain markdown and line breaks as HTML.
 * Supports full markdown rendering with markdown-it and preserves line breaks.
 */
const TextWithLinks = ({ content }) => {
  if (!content) return null;
  
  // Convert to string and ensure we have valid content
  const textContent = String(content || '');
  
  // Process markdown and render as HTML
  const html = processMarkdown(textContent);
  
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

// Initialize markdown-it with line break support
const md = new MarkdownIt({
  html: true,
  breaks: true, // Convert line breaks to <br>
  linkify: true // Auto-convert URLs to links
});

// Enhanced markdown processor using markdown-it
function processMarkdown(text) {
  if (!text) return '';

  // Convert to string and handle line breaks from Google Sheets
  let processedText = String(text)
    // Handle explicit <br> tags from Google Sheets
    .replace(/<br\s*\/?>/gi, '\n')
    // Handle other common line break patterns
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Use markdown-it to process the text
  try {
    return md.render(processedText);
  } catch (error) {
    console.error('Error processing markdown:', error);
    // Fallback: just replace line breaks with <br> tags
    return processedText.replace(/\n/g, '<br>');
  }
}

export default TextWithLinks;
