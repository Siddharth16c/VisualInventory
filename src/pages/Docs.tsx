import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, BookOpen, GitGraph, Book } from 'lucide-react';
import DocsCanvas from './DocsCanvas';

// Dynamically import all markdown files from the docs folder
// Note: Vite's import.meta.glob with { as: 'raw' } fetches the string content!
const mdFiles = import.meta.glob('../../docs/*.md', { query: '?raw', import: 'default' });

export default function Docs() {
    const [docs, setDocs] = useState<Record<string, string>>({});
    const [activeDoc, setActiveDoc] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'read' | 'canvas'>('read');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDocs = async () => {
            const loaded: Record<string, string> = {};
            try {
                for (const path in mdFiles) {
                    // Extract filename from path (e.g. "../../docs/README.md" -> "README.md")
                    const filename = path.split('/').pop() || path;
                    const content = await mdFiles[path]() as string;
                    loaded[filename] = content;
                }
                setDocs(loaded);

                // Set first doc as active by default if available
                const keys = Object.keys(loaded);
                if (keys.length > 0 && !activeDoc) {
                    // Prefer README or CHANGELOG if they exist, else first alphabetical
                    const defaultDoc = keys.find(k => k.toLowerCase() === 'readme.md') ||
                        keys.find(k => k.toLowerCase() === 'changelog.md') ||
                        keys[0];
                    setActiveDoc(defaultDoc);
                }
            } catch (error) {
                console.error("Failed to load documentation files:", error);
            } finally {
                setLoading(false);
            }
        };

        loadDocs();
    }, []);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    if (Object.keys(docs).length === 0) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-surface-500 gap-4">
                <BookOpen className="h-16 w-16 opacity-30" />
                <p>No documentation files found in /docs.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] gap-4 animate-fade-in">
            {/* Toolbar */}
            <div className="flex items-center justify-between glass px-4 py-3 rounded-xl border border-surface-200">
                <h1 className="font-semibold text-surface-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-brand-500" />
                    Project Documentation
                </h1>

                <div className="flex bg-surface-100 p-1 rounded-lg border border-surface-200">
                    <button
                        onClick={() => setViewMode('read')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'read' ? 'bg-white shadow-sm text-brand-700' : 'text-surface-600 hover:text-surface-900'
                            }`}
                    >
                        <Book className="w-4 h-4" /> Read
                    </button>
                    <button
                        onClick={() => setViewMode('canvas')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'canvas' ? 'bg-white shadow-sm text-brand-700' : 'text-surface-600 hover:text-surface-900'
                            }`}
                    >
                        <GitGraph className="w-4 h-4" /> Canvas
                    </button>
                </div>
            </div>

            {viewMode === 'canvas' ? (
                <div className="flex-1 min-h-0">
                    <DocsCanvas
                        docs={docs}
                        onReadMode={(filename) => {
                            setActiveDoc(filename);
                            setViewMode('read');
                        }}
                    />
                </div>
            ) : (
                <div className="flex flex-1 min-h-0 gap-6">
                    {/* Sidebar for Docs navigation */}
                    <div className="w-64 flex-shrink-0 glass rounded-xl border border-surface-200 overflow-hidden flex flex-col hidden md:flex">
                        <div className="overflow-y-auto p-2 flex-1 space-y-1">
                            {Object.keys(docs).sort().map(filename => (
                                <button
                                    key={filename}
                                    onClick={() => setActiveDoc(filename)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${activeDoc === filename
                                        ? 'bg-brand-50 text-brand-700 font-medium'
                                        : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
                                        }`}
                                >
                                    <FileText className="w-4 h-4 opacity-70" />
                                    {filename.replace('.md', '')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Markdown Content Area */}
                    <div className="flex-1 glass rounded-xl border border-surface-200 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-surface-200 bg-surface-50/50 flex items-center justify-between">
                            <h1 className="font-semibold text-surface-900 flex items-center gap-2">
                                {activeDoc}
                            </h1>
                            {/* Mobile Dropdown */}
                            <select
                                className="md:hidden text-sm input bg-white"
                                value={activeDoc || ''}
                                onChange={(e) => setActiveDoc(e.target.value)}
                            >
                                {Object.keys(docs).sort().map(filename => (
                                    <option key={filename} value={filename}>{filename}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                            {activeDoc && docs[activeDoc] ? (
                                <div className="text-surface-900 prose prose-sm md:prose-base prose-surface max-w-4xl mx-auto dark:prose-invert">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {docs[activeDoc]}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <div className="text-center text-surface-500">Select a document to view</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
