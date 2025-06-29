import React from 'react';

/**
 * TextWithLinks Component
 * 
 * Renders text that may contain markdown-style links as HTML.
 * Supports links in [text](url) format.
 */
const TextWithLinks = ({ content }) => {
  if (!content) return null;
  
  // Convert to string and ensure we have valid content
  const textContent = String(content || '');
  
  // Process markdown and render as HTML
  const html = processMarkdown(textContent);
  
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

// Simplified markdown processor
function processMarkdown(text) {
  if (!text) return '';

  // 1. Escape HTML from the input text
  const escapedText = String(text) // Ensure text is a string
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Helper function to apply inline markdown (bold, italic, strikethrough)
  function applyInlineFormatting(segment) {
    let temp = segment;
    // Process bold
    temp = temp.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    temp = temp.replace(/__(.*?)__/g, '<strong>$1</strong>');
    // Process italic
    temp = temp.replace(/\*([^\*]+?)\*/g, '<em>$1</em>');
    temp = temp.replace(/_([^_]+?)_/g, '<em>$1</em>');
    // Process strikethrough
    temp = temp.replace(/~~(.*?)~~/g, '<del>$1</del>');
    return temp;
  }

  const parts = [];
  const linkRegex = /\[(.*?)\]\((.*?)\)/g; // Regex for [text](url)
  let lastIndex = 0;
  let match;

  // 2. Iteratively find and process links
  while ((match = linkRegex.exec(escapedText)) !== null) {
    const [fullMatch, linkContent, linkUrl] = match;
    const matchStart = match.index;
    
    // Add text before the link with inline formatting applied
    if (matchStart > lastIndex) {
      const textBefore = escapedText.substring(lastIndex, matchStart);
      parts.push(applyInlineFormatting(textBefore));
    }
    
    // Process link: content can have inline formatting, but don't allow nested links
    const formattedLinkContent = applyInlineFormatting(linkContent);
    
    // Create the actual HTML link
    parts.push(`<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${formattedLinkContent}</a>`);
    
    lastIndex = matchStart + fullMatch.length;
  }
  
  // 3. Add any remaining text after the last link
  if (lastIndex < escapedText.length) {
    const remainingText = escapedText.substring(lastIndex);
    parts.push(applyInlineFormatting(remainingText));
  }
  
  return parts.join('');
}

export default TextWithLinks;
