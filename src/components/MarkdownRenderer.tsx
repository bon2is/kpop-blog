'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// YouTube Embed Component
function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="relative w-full aspect-video my-6 rounded-xl overflow-hidden shadow-lg">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}

// Custom link component that handles YouTube embeds
function CustomLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  if (!href) return <>{children}</>;

  // Check if this is a YouTube link
  const youtubeId = extractYouTubeId(href);
  if (youtubeId) {
    // Check if this is a standalone YouTube link (not inline text)
    const childText = React.Children.toArray(children).join('');
    const isStandaloneLink = childText === href || childText.includes('youtube.com') || childText.includes('youtu.be');

    if (isStandaloneLink) {
      return <YouTubeEmbed videoId={youtubeId} />;
    }
  }

  // Regular external link - cyan/sky blue like original articles
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sky-500 hover:text-sky-600 transition-colors"
    >
      {children}
    </a>
  );
}

// Custom paragraph component to handle YouTube embeds in paragraphs
function CustomParagraph({ children }: { children?: React.ReactNode }) {
  // Check if paragraph contains only a YouTube embed
  const childArray = React.Children.toArray(children);

  if (childArray.length === 1) {
    const child = childArray[0];
    if (React.isValidElement(child) && child.type === YouTubeEmbed) {
      return <>{child}</>;
    }
  }

  // Clean, readable paragraph with generous line height like original
  return (
    <p className="mb-6 text-lg leading-[1.8] text-gray-800">
      {children}
    </p>
  );
}

// Custom heading components for better visual hierarchy
function CustomH2({ children }: { children?: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b-2 border-pink-200">
      {children}
    </h2>
  );
}

function CustomH3({ children }: { children?: React.ReactNode }) {
  return (
    <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3 flex items-center gap-2">
      <span className="w-1 h-6 bg-pink-500 rounded-full" />
      {children}
    </h3>
  );
}

// Custom blockquote for tips and notes
function CustomBlockquote({ children }: { children?: React.ReactNode }) {
  return (
    <blockquote className="my-6 border-l-4 border-pink-500 bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-r-lg">
      <div className="text-gray-700 italic">{children}</div>
    </blockquote>
  );
}

// Create context to track list type
const ListContext = React.createContext<'ul' | 'ol'>('ul');

// Custom list components
function CustomUl({ children }: { children?: React.ReactNode }) {
  return (
    <ListContext.Provider value="ul">
      <ul className="my-4 space-y-2 pl-0 list-none">
        {children}
      </ul>
    </ListContext.Provider>
  );
}

function CustomOl({ children }: { children?: React.ReactNode }) {
  return (
    <ListContext.Provider value="ol">
      <ol className="my-4 space-y-2 list-decimal pl-6 marker:text-pink-600 marker:font-semibold">
        {children}
      </ol>
    </ListContext.Provider>
  );
}

// Custom list item - uses context to determine bullet style
function CustomLi({ children }: { children?: React.ReactNode }) {
  const listType = React.useContext(ListContext);

  if (listType === 'ol') {
    return <li className="text-gray-700 pl-2">{children}</li>;
  }

  return (
    <li className="flex items-start gap-3 text-gray-700">
      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-pink-500 flex-shrink-0" />
      <span className="flex-1">{children}</span>
    </li>
  );
}

// Custom horizontal rule
function CustomHr() {
  return (
    <hr className="my-8 border-none h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
  );
}

// Custom strong/bold
function CustomStrong({ children }: { children?: React.ReactNode }) {
  return <strong className="font-bold text-gray-900">{children}</strong>;
}

// Custom code for inline code
function CustomCode({ children }: { children?: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 bg-gray-100 text-pink-600 rounded text-sm font-mono">
      {children}
    </code>
  );
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const components: Components = {
    a: CustomLink as Components['a'],
    p: CustomParagraph as Components['p'],
    h2: CustomH2 as Components['h2'],
    h3: CustomH3 as Components['h3'],
    blockquote: CustomBlockquote as Components['blockquote'],
    ul: CustomUl as Components['ul'],
    ol: CustomOl as Components['ol'],
    li: CustomLi as Components['li'],
    hr: CustomHr as Components['hr'],
    strong: CustomStrong as Components['strong'],
    code: CustomCode as Components['code'],
  };

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
