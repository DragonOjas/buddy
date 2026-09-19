import React, { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';

interface MarkdownViewProps {
  content: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Parse code blocks vs regular markdown chunks
  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, match.index),
      });
    }
    parts.push({
      type: 'code',
      language: match[1] || 'plaintext',
      content: match[2].trimEnd(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(lastIndex),
    });
  }

  // Format inline markdown (bold, italic, inline code, links, bullet points, headers)
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');

    return lines.map((line, lIdx) => {
      // Empty line
      if (!line.trim()) {
        return <div key={lIdx} className="h-2.5" />;
      }

      // Headers
      if (line.startsWith('### ')) {
        return (
          <h3 key={lIdx} className="text-base font-bold text-slate-100 mt-3 mb-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
            {renderInlineSpans(line.replace('### ', ''))}
          </h3>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={lIdx} className="text-lg font-bold text-slate-100 mt-4 mb-2 pb-1 border-b border-slate-800/80">
            {renderInlineSpans(line.replace('## ', ''))}
          </h2>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <h1 key={lIdx} className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mt-4 mb-2">
            {renderInlineSpans(line.replace('# ', ''))}
          </h1>
        );
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        return (
          <blockquote key={lIdx} className="border-l-2 border-purple-500/60 pl-3 py-1 my-1.5 text-slate-300 italic bg-purple-950/20 rounded-r">
            {renderInlineSpans(line.replace('> ', ''))}
          </blockquote>
        );
      }

      // Unordered lists
      if (line.match(/^[-*]\s+/)) {
        return (
          <div key={lIdx} className="flex items-start gap-2 my-1 pl-1">
            <span className="text-purple-400 mt-1.5 text-xs select-none">•</span>
            <div className="flex-1 text-slate-200 leading-relaxed text-sm">
              {renderInlineSpans(line.replace(/^[-*]\s+/, ''))}
            </div>
          </div>
        );
      }

      // Numbered lists
      const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        return (
          <div key={lIdx} className="flex items-start gap-2 my-1 pl-1">
            <span className="text-blue-400 font-semibold text-xs mt-0.5 min-w-[1.25rem] select-none">
              {numMatch[1]}.
            </span>
            <div className="flex-1 text-slate-200 leading-relaxed text-sm">
              {renderInlineSpans(numMatch[2])}
            </div>
          </div>
        );
      }

      // Regular paragraph
      return (
        <p key={lIdx} className="my-1.5 text-slate-200 leading-relaxed text-sm">
          {renderInlineSpans(line)}
        </p>
      );
    });
  };

  const renderInlineSpans = (raw: string) => {
    // Process bold (**...**), italics (*...*), inline code (`...`), links ([text](url))
    const tokens: React.ReactNode[] = [];
    let remaining = raw;
    let keyIdx = 0;
    let plainBuffer = '';

    const flushPlainBuffer = () => {
      if (plainBuffer) {
        tokens.push(plainBuffer);
        plainBuffer = '';
      }
    };

    while (remaining.length > 0) {
      // Bold
      const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
      if (boldMatch) {
        flushPlainBuffer();
        tokens.push(
          <strong key={keyIdx++} className="font-semibold text-slate-100">
            {boldMatch[2]}
          </strong>
        );
        remaining = remaining.substring(boldMatch[0].length);
        continue;
      }

      // Inline code
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        flushPlainBuffer();
        tokens.push(
          <code
            key={keyIdx++}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-800 text-purple-300 font-mono text-xs border border-slate-700/50"
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.substring(codeMatch[0].length);
        continue;
      }

      // Link
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        flushPlainBuffer();
        tokens.push(
          <a
            key={keyIdx++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors font-medium"
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.substring(linkMatch[0].length);
        continue;
      }

      // Italics
      const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
      if (italicMatch) {
        flushPlainBuffer();
        tokens.push(
          <em key={keyIdx++} className="italic text-slate-300">
            {italicMatch[2]}
          </em>
        );
        remaining = remaining.substring(italicMatch[0].length);
        continue;
      }

      // Accumulate plain char
      plainBuffer += remaining[0];
      remaining = remaining.substring(1);
    }

    flushPlainBuffer();
    return tokens;
  };

  return (
    <div className="space-y-2 text-sm selection:bg-purple-500/20">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <div
              key={index}
              className="my-3 rounded-lg overflow-hidden border border-slate-800 bg-[#0d1117] shadow-lg shadow-black/30"
            >
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#161b22] border-b border-slate-800/80 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-purple-300">
                  <Terminal className="w-3.5 h-3.5 text-purple-400" />
                  <span>{part.language || 'code'}</span>
                </div>
                <button
                  id={`copy-code-btn-${index}`}
                  onClick={() => handleCopyCode(part.content, index)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-700/60 text-slate-300 hover:text-white transition-colors text-[11px]"
                  title="Copy code"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed scrollbar-thin">
                <code>{part.content}</code>
              </pre>
            </div>
          );
        }

        return <div key={index}>{renderFormattedText(part.content)}</div>;
      })}
    </div>
  );
};
