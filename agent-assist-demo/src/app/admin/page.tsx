'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { KnowledgeStats, DocumentInfo } from '@/lib/types';
import { getKnowledgeStats, getDocuments, loadSampleDocuments, checkRAGHealth, searchKnowledge } from '@/lib/rag-service';

// B5: Highlight matching text component
function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-500/30 text-yellow-200 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

// B5: Search suggestion item
interface SearchSuggestion {
  type: 'document' | 'category' | 'recent';
  value: string;
  label: string;
  icon: string;
}

export default function AdminPage() {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [ragConnected, setRagConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // B5: Smart search state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // B5: Generate search suggestions
  const suggestions = useMemo((): SearchSuggestion[] => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      // Show recent searches when query is empty
      return recentSearches.slice(0, 3).map(s => ({
        type: 'recent' as const,
        value: s,
        label: s,
        icon: '🕐'
      }));
    }

    const query = searchQuery.toLowerCase();
    const results: SearchSuggestion[] = [];

    // Match categories
    if (stats?.categories) {
      Object.keys(stats.categories)
        .filter(cat => cat.toLowerCase().includes(query))
        .slice(0, 2)
        .forEach(cat => {
          results.push({
            type: 'category',
            value: cat,
            label: `Category: ${cat}`,
            icon: '📁'
          });
        });
    }

    // Match document titles
    documents
      .filter(doc => doc.title.toLowerCase().includes(query))
      .slice(0, 4)
      .forEach(doc => {
        results.push({
          type: 'document',
          value: doc.title,
          label: doc.title,
          icon: '📄'
        });
      });

    return results.slice(0, 5);
  }, [searchQuery, documents, stats, recentSearches]);

  // B5: Handle suggestion selection
  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.value);
    setShowSuggestions(false);
    // Add to recent searches
    if (!recentSearches.includes(suggestion.value)) {
      setRecentSearches(prev => [suggestion.value, ...prev].slice(0, 5));
    }
  };

  // B5: Handle search submit
  const handleSearchSubmit = () => {
    if (searchQuery.trim() && !recentSearches.includes(searchQuery)) {
      setRecentSearches(prev => [searchQuery, ...prev].slice(0, 5));
    }
    setShowSuggestions(false);
  };

  // B5: Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const healthy = await checkRAGHealth();
    setRagConnected(healthy);

    if (healthy) {
      const [statsData, docsData] = await Promise.all([
        getKnowledgeStats(),
        getDocuments(),
      ]);
      setStats(statsData);
      setDocuments(docsData);
    }
    setIsLoading(false);
  };

  const handleLoadSamples = async () => {
    setIsLoadingSamples(true);
    setMessage(null);

    const success = await loadSampleDocuments();

    if (success) {
      setMessage({ type: 'success', text: 'Sample documents loaded successfully!' });
      await loadData();
    } else {
      setMessage({ type: 'error', text: 'Failed to load sample documents. Is the RAG backend running?' });
    }

    setIsLoadingSamples(false);
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-white">Knowledge Admin</h1>
                <p className="text-sm text-slate-400">Manage your RAG knowledge base</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${ragConnected ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <div className={`w-2 h-2 rounded-full ${ragConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-sm ${ragConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {ragConnected ? 'RAG Connected' : 'RAG Offline'}
                </span>
              </div>
              <button
                onClick={loadData}
                className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600 transition-all text-sm"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Message Banner */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {!ragConnected ? (
          /* RAG Not Connected State */
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">RAG Backend Not Connected</h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Start the Python RAG backend to manage your knowledge base. The backend provides vector search and document management.
            </p>
            <div className="bg-slate-800/50 rounded-xl p-4 max-w-lg mx-auto text-left">
              <p className="text-sm text-slate-400 mb-2">Start the backend:</p>
              <code className="block bg-slate-900/50 px-4 py-2 rounded-lg text-cyan-400 text-sm font-mono">
                cd knowledge-backend && python api.py
              </code>
            </div>
          </div>
        ) : isLoading ? (
          /* Loading State */
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Loading knowledge base...</p>
          </div>
        ) : (
          /* Main Content */
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                <div className="text-3xl font-bold text-white">{stats?.unique_documents || 0}</div>
                <div className="text-sm text-slate-400">Documents</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                <div className="text-3xl font-bold text-white">{stats?.total_chunks || 0}</div>
                <div className="text-sm text-slate-400">Chunks</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                <div className="text-3xl font-bold text-white">{Object.keys(stats?.categories || {}).length}</div>
                <div className="text-sm text-slate-400">Categories</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                <div className="text-sm font-medium text-cyan-400 truncate">{stats?.embedding_model || 'N/A'}</div>
                <div className="text-sm text-slate-400">Embedding Model</div>
              </div>
            </div>

            {/* Categories */}
            {stats?.categories && Object.keys(stats.categories).length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.categories).map(([cat, count]) => (
                    <span
                      key={cat}
                      className="px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 text-sm text-slate-300"
                    >
                      {cat}: <span className="text-cyan-400">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mb-8 flex items-center gap-4">
              <button
                onClick={handleLoadSamples}
                disabled={isLoadingSamples}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isLoadingSamples ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Load Sample Documents
                  </>
                )}
              </button>
              <span className="text-sm text-slate-500">
                Loads 10 Genesys documentation samples into the knowledge base
              </span>
            </div>

            {/* Documents List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Documents</h3>
                {/* B5: Smart search with typeahead */}
                <div className="relative">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchSubmit();
                        } else if (e.key === 'Escape') {
                          setShowSuggestions(false);
                        }
                      }}
                      placeholder="Search documents..."
                      className="pl-10 pr-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 w-72 transition-all"
                      aria-label="Search documents"
                      aria-expanded={showSuggestions}
                      aria-haspopup="listbox"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        aria-label="Clear search"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* B5: Suggestions dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-20"
                      role="listbox"
                    >
                      {recentSearches.length > 0 && !searchQuery && (
                        <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-700">
                          Recent searches
                        </div>
                      )}
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={`${suggestion.type}-${suggestion.value}-${index}`}
                          onClick={() => handleSelectSuggestion(suggestion)}
                          className="w-full px-3 py-2.5 text-left flex items-center gap-2 hover:bg-slate-700/50 transition-colors text-sm"
                          role="option"
                        >
                          <span className="text-base">{suggestion.icon}</span>
                          <span className="text-slate-300 truncate flex-1">
                            <HighlightedText text={suggestion.label} highlight={searchQuery} />
                          </span>
                          <span className="text-xs text-slate-500 capitalize">{suggestion.type}</span>
                        </button>
                      ))}
                      {searchQuery && (
                        <div className="px-3 py-2 border-t border-slate-700 text-xs text-slate-500 flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">Enter</kbd>
                          to search
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {filteredDocuments.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-slate-400">No documents found</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {documents.length === 0 ? 'Load sample documents to get started' : 'Try a different search term'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">
                            {/* B5: Highlighted matching text */}
                            <HighlightedText text={doc.title} highlight={searchQuery} />
                          </h4>
                          <div className="flex items-center gap-3 mt-1 text-sm">
                            <span className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">
                              <HighlightedText text={doc.category} highlight={searchQuery} />
                            </span>
                            <span className="text-slate-500">{doc.chunks} chunks</span>
                            {doc.url && (
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Source
                              </a>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-slate-500 font-mono opacity-50 group-hover:opacity-100 transition-opacity">{doc.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
