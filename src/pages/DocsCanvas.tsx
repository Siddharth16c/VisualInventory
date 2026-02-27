import { useState, useCallback, useMemo, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    Handle,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Maximize2, FileText } from 'lucide-react';

// Custom Node to display Markdown content
const MarkdownNode = ({ data }: { data: { filename: string; content: string; onExpand: (filename: string) => void } }) => {
    return (
        <div className="bg-white rounded-xl shadow-xl w-[350px] border border-surface-200 overflow-hidden flex flex-col group transition-all hover:border-brand-300 hover:shadow-2xl">
            {/* Handles for connecting nodes */}
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-surface-300 border-2 border-white rounded-full transition-colors group-hover:bg-brand-500" />

            {/* Header */}
            <div className="bg-surface-50 p-3 border-b border-surface-200 flex items-center justify-between cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-4 h-4 text-brand-500 shrink-0" />
                    <span className="font-semibold text-sm text-surface-900 truncate">
                        {data.filename}
                    </span>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onExpand(data.filename);
                    }}
                    className="p-1.5 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors ml-2 shrink-0"
                    title="Read Full Document"
                >
                    <Maximize2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Content Preview */}
            <div className="p-4 h-[250px] overflow-hidden relative bg-white">
                <div className="prose prose-sm prose-surface max-w-none dark:prose-invert pointer-events-none opacity-80 scale-90 origin-top-left w-[111%] h-[111%] overflow-hidden">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {data.content}
                    </ReactMarkdown>
                </div>
                {/* Fade out at the bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-surface-300 border-2 border-white rounded-full transition-colors group-hover:bg-brand-500" />
        </div>
    );
};

const nodeTypes = {
    markdown: MarkdownNode,
};

interface DocsCanvasProps {
    docs: Record<string, string>;
    onReadMode: (filename: string) => void;
}

export default function DocsCanvas({ docs, onReadMode }: DocsCanvasProps) {
    // Generate initial nodes from docs dictionary in a grid layout
    const initialNodes: Node[] = useMemo(() => {
        let x = 0;
        let y = 0;
        const spacingX = 450;
        const spacingY = 400;
        const maxCols = 3;

        return Object.keys(docs).map((filename, index) => {
            const node: Node = {
                id: filename,
                type: 'markdown',
                position: { x, y },
                data: {
                    filename,
                    content: docs[filename],
                    onExpand: onReadMode,
                },
            };

            // Calculate grid position for next node
            x += spacingX;
            if ((index + 1) % maxCols === 0) {
                x = 0;
                y += spacingY;
            }

            return node;
        });
    }, [docs, onReadMode]);

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // Keep nodes updated if docs content changes (while preserving positions)
    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => {
                if (docs[node.id]) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            content: docs[node.id],
                            onExpand: onReadMode,
                        }
                    };
                }
                return node;
            })
        );
    }, [docs, onReadMode, setNodes]);

    const onConnect = useCallback(
        (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true } as Edge, eds)),
        [setEdges]
    );

    return (
        <div className="w-full h-full bg-surface-50 rounded-xl overflow-hidden border border-surface-200">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
                maxZoom={2}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                }}
            >
                <Background color="#ccc" gap={24} size={1} />
                <Controls className="bg-white rounded-lg shadow-sm border border-surface-200" />
                <MiniMap
                    nodeColor="#e2e8f0"
                    maskColor="rgba(255, 255, 255, 0.6)"
                    className="border border-surface-200 rounded-lg shadow-sm"
                />
            </ReactFlow>
        </div>
    );
}
