import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FreeformData } from '../../types/routine';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start writing...',
  disabled = false,
  className = ''
}) => {
  const [isFormatting, setIsFormatting] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      setSelectedText(selection.toString());
    } else {
      setSelectedText('');
    }
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    onChange(target.innerHTML);
  }, [onChange]);

  const executeCommand = (command: string, value?: string) => {
    setIsFormatting(true);
    document.execCommand(command, false, value);
    setIsFormatting(false);
    
    // Update content after command execution
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertList = (ordered: boolean) => {
    executeCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList');
  };

  const formatText = (format: 'bold' | 'italic' | 'underline') => {
    executeCommand(format);
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  const clearFormatting = () => {
    executeCommand('removeFormat');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle common keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          formatText('bold');
          break;
        case 'i':
          e.preventDefault();
          formatText('italic');
          break;
        case 'u':
          e.preventDefault();
          formatText('underline');
          break;
        case 'k':
          e.preventDefault();
          insertLink();
          break;
      }
    }
  };

  return (
    <div className={`rich-text-editor border rounded-lg ${className}`}>
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap gap-1">
        <div className="flex items-center space-x-1">
          {/* Text Formatting */}
          <button
            onClick={() => formatText('bold')}
            className="p-1 text-sm font-bold border rounded hover:bg-gray-100 transition-colors"
            title="Bold (Ctrl+B)"
            disabled={disabled}
          >
            B
          </button>
          <button
            onClick={() => formatText('italic')}
            className="p-1 text-sm italic border rounded hover:bg-gray-100 transition-colors"
            title="Italic (Ctrl+I)"
            disabled={disabled}
          >
            I
          </button>
          <button
            onClick={() => formatText('underline')}
            className="p-1 text-sm underline border rounded hover:bg-gray-100 transition-colors"
            title="Underline (Ctrl+U)"
            disabled={disabled}
          >
            U
          </button>
        </div>

        <div className="border-l mx-1"></div>

        {/* Lists */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => insertList(false)}
            className="p-1 text-sm border rounded hover:bg-gray-100 transition-colors"
            title="Bullet List"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => insertList(true)}
            className="p-1 text-sm border rounded hover:bg-gray-100 transition-colors"
            title="Numbered List"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          </button>
        </div>

        <div className="border-l mx-1"></div>

        {/* Additional Tools */}
        <div className="flex items-center space-x-1">
          <button
            onClick={insertLink}
            className="p-1 text-sm border rounded hover:bg-gray-100 transition-colors"
            title="Insert Link (Ctrl+K)"
            disabled={disabled || !selectedText}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
          <button
            onClick={clearFormatting}
            className="p-1 text-sm border rounded hover:bg-gray-100 transition-colors"
            title="Clear Formatting"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className={`p-3 min-h-32 focus:outline-none ${content ? '' : 'rich-text-placeholder'}`}
        style={{ minHeight: '8rem' }}
        dangerouslySetInnerHTML={{ __html: content }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
        role="textbox"
        aria-label="Rich text editor"
        aria-multiline="true"
      />

      {/* Character Count */}
      <div className="border-t p-2 text-xs text-gray-500 text-right">
        {content.replace(/<[^>]*>/g, '').length} characters
      </div>
    </div>
  );
};

export default RichTextEditor;