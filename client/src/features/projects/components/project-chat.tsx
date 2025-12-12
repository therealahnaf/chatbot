import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Send, User, Bot, Plus, Settings, ChevronLeft, ChevronRight, Edit, Trash, SquarePen, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { chatApi, type ChatMessage } from '@/lib/api/chat.api'
import { cn } from '@/lib/utils'
import { CustomSurveyRenderer } from './form-builder/renderer/CustomSurveyRenderer'
import { Toolbox, ToolboxItem } from './form-builder/toolbox/Toolbox'
import { PropertyEditor } from './form-builder/PropertyEditor'
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    DragStartEvent,
    DragEndEvent,
    closestCenter,
    pointerWithin,
    CollisionDetection
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Streamdown } from 'streamdown';
import type { BundledTheme } from 'shiki';

const themes = ['github-light', 'github-dark'] as [BundledTheme, BundledTheme];

interface ProjectChatProps {
    projectId: string
}

export function ProjectChat({ projectId }: ProjectChatProps) {
    const [input, setInput] = useState('')
    const [threadId, setThreadId] = useState<string>('')
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isDialogOpen, setIsDialogOpen] = useState(true)
    const [tempThreadId, setTempThreadId] = useState('')
    const [socket, setSocket] = useState<WebSocket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [surveyJson, setSurveyJson] = useState<any>(null)
    const [isSurveyFullScreen, setIsSurveyFullScreen] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [activeDragItem, setActiveDragItem] = useState<any>(null)
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
    const [builderPage, setBuilderPage] = useState(0)
    const [activeTab, setActiveTab] = useState("builder")
    const scrollRef = useRef<HTMLDivElement>(null)

    // Check if the form has any content
    const hasElements = surveyJson?.pages?.some((p: any) => (p.elements?.length > 0 || p.questions?.length > 0)) || surveyJson?.elements?.length > 0 || surveyJson?.questions?.length > 0;
    // Welcome state is when there are no elements and no chat messages
    const isWelcomeState = !hasElements && messages.length === 0;

    // Query for threads (can be removed if not used elsewhere, but maybe keep for future)
    // const { data: threadsData, refetch: refetchThreads } = useQuery({
    //     queryKey: ['chat-threads'],
    //     queryFn: chatApi.getThreads,
    // })

    // Query for history (still useful for initial load)
    const { data: historyData, refetch: refetchHistory, isFetching: isHistoryLoading } = useQuery({
        queryKey: ['chat-history', threadId],
        queryFn: () => chatApi.getHistory(threadId),
        enabled: false,
    })

    // Update messages when history is loaded
    useEffect(() => {
        if (historyData) {
            if (historyData.history) {
                setMessages(historyData.history)
            }
            if (historyData.final_json) {
                try {
                    const parsed = typeof historyData.final_json === 'string' ? JSON.parse(historyData.final_json) : historyData.final_json
                    setSurveyJson(parsed)
                } catch (e) {
                    console.error("Failed to parse history final JSON:", e)
                }
            }
        }
    }, [historyData])

    // Debugging messages
    useEffect(() => {
        console.log("Current messages:", messages)
        messages.forEach(m => console.log("Message type:", m.type))
    }, [messages])

    useEffect(() => {
        console.log("Current surveyJson:", surveyJson)
    }, [surveyJson])

    // Fetch history when threadId is set via dialog
    useEffect(() => {
        if (threadId && !isDialogOpen) {
            refetchHistory()
        }
    }, [threadId, isDialogOpen, refetchHistory])

    // WebSocket Connection
    useEffect(() => {
        if (!threadId) return

        // Close existing socket if any
        if (socket) {
            socket.close()
        }

        const wsUrl = `ws://localhost:8000/api/v1/formzed-chat/ws/${threadId}`
        console.log(`Connecting to WebSocket: ${wsUrl}`)

        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
            console.log('Connected to chat WebSocket')
            setIsConnected(true)
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                if (data.history) {
                    setMessages(data.history)
                }

                if (data.final_json) {
                    console.log("Received final JSON:", data.final_json)
                    try {
                        const parsed = typeof data.final_json === 'string' ? JSON.parse(data.final_json) : data.final_json
                        setSurveyJson(parsed)
                    } catch (e) {
                        console.error("Failed to parse final JSON:", e)
                    }
                }

                if (data.error) {
                    console.error("WebSocket error:", data.error)
                }
            } catch (e) {
                console.error("Failed to parse WebSocket message:", e)
            }
        }

        ws.onclose = () => {
            console.log('Disconnected from chat WebSocket')
            setIsConnected(false)
        }

        ws.onerror = (error) => {
            console.error("WebSocket error:", error)
        }

        setSocket(ws)

        return () => {
            ws.close()
        }
    }, [threadId])

    const handleConfirmThreadId = () => {
        let finalThreadId = tempThreadId.trim()
        if (!finalThreadId) {
            // Generate a random UUID if empty
            finalThreadId = crypto.randomUUID()
            setTempThreadId(finalThreadId)
        }

        if (finalThreadId !== threadId) {
            setMessages([])
            setSurveyJson(null)
        }

        setThreadId(finalThreadId)
        setIsDialogOpen(false)
    }

    const handleSend = () => {
        if (!input.trim()) return

        // Optimistically add user message
        const userMsg: ChatMessage = { type: 'human', content: input }
        setMessages((prev) => [...prev, userMsg])

        if (socket && socket.readyState === WebSocket.OPEN) {
            // If we have a survey JSON, send it along with the message to enable editing context
            // Check if we have actual content to send context
            let hasContent = false;
            if (surveyJson) {
                if (surveyJson.elements?.length > 0 || surveyJson.questions?.length > 0) {
                    hasContent = true;
                } else if (surveyJson.pages?.length > 0) {
                    // Check if we have multiple pages or a single page with content
                    if (surveyJson.pages.length > 1) {
                        hasContent = true;
                    } else {
                        // Single page
                        const page = surveyJson.pages[0];
                        if ((page.elements?.length > 0) || (page.questions?.length > 0)) {
                            hasContent = true;
                        }
                    }
                }
            }

            if (hasContent) {
                const payload = {
                    message: input,
                    current_json: surveyJson
                };
                socket.send(JSON.stringify(payload));
            } else {
                // Backward compatibility or empty state
                socket.send(input);
            }
        } else {
            console.error("Socket not connected")
        }

        setInput('')
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const renderChatInput = (className?: string, autoFocus: boolean = false) => (
        <div className={cn("flex w-full gap-2", className)}>
            <Input
                placeholder={isWelcomeState ? "Describe your form to start..." : "Type your message..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!isConnected}
                className="h-9 shadow-sm bg-background"
                autoFocus={autoFocus}
            />
            <Button
                onClick={handleSend}
                disabled={!isConnected || !input.trim()}
                size="icon"
                className="h-9 w-9 shrink-0 shadow-sm"
            >
                <Send size={16} />
            </Button>
        </div>
    );



    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        if (active.data.current?.type === 'toolbox-item') {
            setActiveDragItem(active.data.current);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null);
        if (!over) return;

        // 1. Handle Toolbox Drop
        if (active.data.current?.type === 'toolbox-item') {
            const type = active.data.current.elementType;
            const newElement = {
                type,
                name: `${type}_${Date.now()}`,
                title: `New ${type}`,
            };

            setSurveyJson((prev: any) => {
                const newJson = prev ? JSON.parse(JSON.stringify(prev)) : { elements: [] };

                // Ensure page structure
                if (!newJson.pages || newJson.pages.length === 0) {
                    const existingElements = newJson.elements || newJson.questions || [];
                    newJson.pages = [{
                        name: 'page1',
                        elements: existingElements
                    }];
                    delete newJson.elements;
                    delete newJson.questions;
                }

                // Determine target page
                let targetPageIndex = 0; // Default to first page
                if (over.data.current?.pageIndex !== undefined) {
                    targetPageIndex = over.data.current.pageIndex;
                } else if (typeof over.id === 'string' && over.id.startsWith('canvas-container-')) {
                    targetPageIndex = parseInt(over.id.split('-')[2], 10);
                } else {
                    // Try to find which page contains the 'over' element
                    newJson.pages.forEach((page: any, index: number) => {
                        const arr = page.elements || page.questions;
                        if (arr && arr.some((e: any) => e.name === over.id)) {
                            targetPageIndex = index;
                        }
                    });
                }

                if (newJson.pages[targetPageIndex]) {
                    const page = newJson.pages[targetPageIndex];
                    if (!page.elements) page.elements = [];

                    const overIndex = page.elements.findIndex((e: any) => e.name === over.id);
                    if (overIndex !== -1) {
                        // Insert before the hovered element
                        page.elements.splice(overIndex, 0, newElement);
                    } else {
                        // Append to end
                        page.elements.push(newElement);
                    }
                }

                return newJson;
            });
            return;
        }

        // 2. Handle Reordering
        if (active.id !== over.id) {
            setSurveyJson((prev: any) => {
                // Deep clone to avoid mutation and ensure React detects changes
                const newJson = prev ? JSON.parse(JSON.stringify(prev)) : { elements: [] };

                // Helper to reorder within an array
                const reorderInArray = (arr: any[]) => {
                    const oldIndex = arr.findIndex((item) => item.name === active.id);
                    const newIndex = arr.findIndex((item) => item.name === over.id);
                    if (oldIndex !== -1 && newIndex !== -1) {
                        return arrayMove(arr, oldIndex, newIndex);
                    }
                    return arr;
                };

                // Find the page containing the active element
                if (newJson.pages) {
                    newJson.pages.forEach((page: any) => {
                        const arr = page.elements || page.questions;
                        if (arr) {
                            // Check if both elements are in this page (reordering within page)
                            const hasActive = arr.some((e: any) => e.name === active.id);
                            const hasOver = arr.some((e: any) => e.name === over.id);

                            if (hasActive) {
                                if (hasOver) {
                                    // Standard reorder
                                    if (page.elements) page.elements = reorderInArray(page.elements);
                                    if (page.questions) page.questions = reorderInArray(page.questions);
                                } else if (typeof over.id === 'string' && over.id.startsWith('canvas-container-')) {
                                    // Dropped on container background -> move to end
                                    const targetPageIndex = parseInt(over.id.split('-')[2], 10);
                                    // Only if it's the same page (or we support moving between pages, but user said "one single page only")
                                    // Assuming we are viewing one page, so targetPageIndex should match current page
                                    // But let's be safe: if we found active in this page, and dropped on THIS page's container
                                    // We can check if the container ID matches this page index? 
                                    // Actually, we don't have page index easily here in forEach unless we use index.
                                    // But we can just move to end if we are sure.

                                    // Simplified: Just move to end if dropped on container and active is in this page
                                    // (Assuming drag is constrained to current page view)
                                    const oldIndex = arr.findIndex((item: any) => item.name === active.id);
                                    if (oldIndex !== -1) {
                                        const item = arr.splice(oldIndex, 1)[0];
                                        arr.push(item);
                                    }
                                }
                            }
                        }
                    });
                } else {
                    // Flat structure (fallback)
                    if (newJson.elements) newJson.elements = reorderInArray(newJson.elements);
                    if (newJson.questions) newJson.questions = reorderInArray(newJson.questions);
                }

                return newJson;
            });
        }
    };

    const handleElementSelect = (element: any) => {
        if (!element) {
            setSelectedElementId(null);
            return;
        }
        // FormElementWrapper passes the whole element object
        const elementId = element.name || element;
        setSelectedElementId(typeof elementId === 'string' ? elementId : elementId.name);

        if (!isSidebarOpen) {
            setIsSidebarOpen(true);
        }
    };

    const getSelectedElement = () => {
        if (!surveyJson) return null;

        if (!selectedElementId) {
            return { ...surveyJson, type: 'survey' };
        }

        const findRecursive = (container: any): any => {
            const elements = container.elements || container.questions;
            if (elements) {
                const found = elements.find((el: any) => el.name === selectedElementId);
                if (found) return found;

                for (const el of elements) {
                    const nested = findRecursive(el);
                    if (nested) return nested;
                }
            }
            return null;
        };

        if (surveyJson.pages) {
            // Check if selectedElementId is a page name
            const page = surveyJson.pages.find((p: any) => p.name === selectedElementId);
            if (page) return { ...page, type: 'page' };

            for (const page of surveyJson.pages) {
                const found = findRecursive(page);
                if (found) return found;
            }
        } else {
            return findRecursive(surveyJson);
        }
        return null;
    };

    const handleElementUpdate = (updatedElement: any) => {
        setSurveyJson((prev: any) => {
            const newJson = JSON.parse(JSON.stringify(prev));

            // Handle survey root update
            if (updatedElement.type === 'survey') {
                const { type, ...rest } = updatedElement;
                // Merge updates into root
                Object.assign(newJson, rest);
                return newJson;
            }

            const updateRecursive = (container: any): boolean => {
                const elements = container.elements || container.questions;
                if (elements) {
                    const idx = elements.findIndex((el: any) => el.name === selectedElementId);
                    if (idx !== -1) {
                        elements[idx] = updatedElement;
                        return true;
                    }
                    // Recurse into elements (e.g. panels)
                    for (const el of elements) {
                        if (updateRecursive(el)) return true;
                    }
                }
                return false;
            };

            if (newJson.pages) {
                // Check if updating a page
                const pageIndex = newJson.pages.findIndex((p: any) => p.name === selectedElementId);
                if (pageIndex !== -1) {
                    // Preserve elements when updating page properties
                    const { type, ...rest } = updatedElement; // Remove injected type
                    newJson.pages[pageIndex] = { ...newJson.pages[pageIndex], ...rest };
                    return newJson;
                }

                for (const page of newJson.pages) {
                    if (updateRecursive(page)) break;
                }
            } else {
                updateRecursive(newJson);
            }

            return newJson;
        });

        // If the name changed, update the selection so we don't lose focus
        if (updatedElement.name !== selectedElementId) {
            setSelectedElementId(updatedElement.name);
        }
    };

    const handleElementDelete = (elementToDelete?: any) => {
        const targetId = elementToDelete ? (elementToDelete.name || elementToDelete) : selectedElementId;
        if (!targetId) return;

        setSurveyJson((prev: any) => {
            const newJson = JSON.parse(JSON.stringify(prev));

            const deleteRecursive = (container: any): boolean => {
                const elements = container.elements || container.questions;
                if (elements) {
                    const idx = elements.findIndex((el: any) => el.name === targetId);
                    if (idx !== -1) {
                        elements.splice(idx, 1);
                        return true;
                    }
                    for (const el of elements) {
                        if (deleteRecursive(el)) return true;
                    }
                }
                return false;
            };

            if (newJson.pages) {
                // Check if deleting a page
                const pageIndex = newJson.pages.findIndex((p: any) => p.name === targetId);
                if (pageIndex !== -1) {
                    if (newJson.pages.length > 1) {
                        newJson.pages.splice(pageIndex, 1);
                    }
                    return newJson;
                }

                for (const page of newJson.pages) {
                    if (deleteRecursive(page)) break;
                }
            } else {
                deleteRecursive(newJson);
            }

            return newJson;
        });

        if (targetId === selectedElementId) {
            setSelectedElementId(null);
        }
    };

    const handleAddPage = () => {
        setSurveyJson((prev: any) => {
            const newJson = prev ? JSON.parse(JSON.stringify(prev)) : { pages: [] };
            if (!newJson.pages) {
                // Convert single page to multi-page if needed, or just init pages
                if (newJson.elements || newJson.questions) {
                    newJson.pages = [{
                        name: 'page1',
                        elements: newJson.elements || newJson.questions
                    }];
                    delete newJson.elements;
                    delete newJson.questions;
                } else {
                    newJson.pages = [];
                }
            }

            const newPageName = `page${newJson.pages.length + 1}`;
            newJson.pages.push({
                name: newPageName,
                elements: []
            });
            return newJson;
        });
    };

    const handleDeletePage = (index: number) => {
        setSurveyJson((prev: any) => {
            const newJson = JSON.parse(JSON.stringify(prev));
            if (newJson.pages && newJson.pages.length > 1) {
                newJson.pages.splice(index, 1);
            }
            return newJson;
        });
    };

    const handleEditPage = () => {
        if (!surveyJson) return;
        const totalPages = surveyJson.pages?.length || 0;
        const hasPages = totalPages > 0;

        if (hasPages && surveyJson.pages[builderPage]) {
            handleElementSelect({ ...surveyJson.pages[builderPage], type: 'page' });
        } else if (!hasPages && builderPage === 0) {
            handleElementSelect({
                name: 'page1',
                type: 'page',
                elements: surveyJson.elements || surveyJson.questions
            });
        }
    };

    // Custom collision detection strategy
    const customCollisionDetection: CollisionDetection = (args) => {
        // First, check for pointer collisions (most intuitive)
        const pointerCollisions = pointerWithin(args);

        // Filter out the active element itself from collisions
        // This prevents the "stuck" behavior where it detects itself and doesn't move
        const filteredCollisions = pointerCollisions.filter(c => c.id !== args.active.id);

        if (filteredCollisions.length > 0) {
            return filteredCollisions;
        }

        // Fallback to closestCenter (better for vertical lists than corners)
        return closestCenter(args);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create new Form</DialogTitle>
                        <DialogDescription>
                            Enter a name for the form to load an existing conversation or start a new one.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={tempThreadId}
                            onChange={(e) => setTempThreadId(e.target.value)}
                            placeholder="Form Name"
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={handleConfirmThreadId}>Start</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex h-[85vh]">
                {/* Sidebar */}
                <div
                    className={cn(
                        "shrink-0 transition-all duration-500 ease-in-out overflow-hidden",
                        activeTab === 'builder' ? "w-64 mr-4 opacity-100" : "w-0 mr-0 opacity-0"
                    )}
                >
                    <Card className="flex flex-col w-64 h-full bg-muted">
                        <CardContent className="flex-1 p-0 overflow-hidden">
                            <ScrollArea className="h-full">
                                <Toolbox />
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
                {/* Center: Canvas */}
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
                        <div className="px-4 pt-2">
                            <TabsList className="grid w-[200px] grid-cols-2">
                                <TabsTrigger value="builder">Builder</TabsTrigger>
                                <TabsTrigger value="preview">Preview</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="builder" className="flex-1 p-4 h-full overflow-hidden data-[state=inactive]:hidden flex flex-col max-w-5xl mx-auto w-full">
                            {isHistoryLoading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <p>Loading form...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => setBuilderPage(Math.max(0, builderPage - 1))}
                                                disabled={builderPage === 0}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <span className="text-sm font-medium mx-2">
                                                Page {builderPage + 1} of {Math.max(1, surveyJson?.pages?.length || 0)}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => setBuilderPage(Math.min((surveyJson?.pages?.length || 1) - 1, builderPage + 1))}
                                                disabled={builderPage >= (surveyJson?.pages?.length || 1) - 1}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={handleEditPage}
                                                title="Edit Page Properties"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                onClick={() => handleDeletePage(builderPage)}
                                                disabled={(surveyJson?.pages?.length || 0) <= 1}
                                                title="Delete Page"
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-primary hover:text-primary"
                                                onClick={handleAddPage}
                                                title="Add New Page"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <Card className="flex-1 flex flex-col overflow-hidden shadow-sm">
                                        <div className="flex-1 overflow-y-auto relative">
                                            <CustomSurveyRenderer
                                                json={surveyJson || { elements: [] }}
                                                onJsonChange={setSurveyJson}
                                                onSelectElement={handleElementSelect}
                                                selectedElementId={selectedElementId || undefined}
                                                onAddPage={handleAddPage}
                                                onDeletePage={handleDeletePage}
                                                currentPage={builderPage}
                                                onPageChange={setBuilderPage}
                                                hideNavigation={true}
                                                hideEmptyState={isWelcomeState}
                                                onDeleteElement={handleElementDelete}
                                            />

                                            {isWelcomeState && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px] z-10">
                                                    <div className="max-w-md w-full p-6 space-y-8 text-center">
                                                        <div className="space-y-2">
                                                            <h3 className="text-lg font-medium text-foreground">
                                                                Start building your form
                                                            </h3>
                                                            <p className="text-sm text-muted-foreground">
                                                                Drag and drop elements from the toolbox on the left
                                                            </p>
                                                        </div>

                                                        <div className="relative">
                                                            <div className="absolute inset-0 flex items-center">
                                                                <span className="w-full border-t" />
                                                            </div>
                                                            <div className="relative flex justify-center text-xs uppercase">
                                                                <span className="bg-background px-2 text-muted-foreground">
                                                                    Or
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <p className="text-sm text-muted-foreground">
                                                                Describe your form to AI
                                                            </p>
                                                            <div className="p-1 bg-background rounded-lg shadow-lg border">
                                                                {renderChatInput("", true)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </>
                            )}
                        </TabsContent>

                        <TabsContent value="preview" className="flex-1 p-4 h-full overflow-hidden data-[state=inactive]:hidden max-w-5xl mx-auto w-full">
                            <Card className="h-full flex flex-col overflow-hidden shadow-sm">
                                <div className="flex-1 overflow-y-auto">
                                    <CustomSurveyRenderer
                                        json={surveyJson || { elements: [] }}
                                        previewMode={true}
                                    />
                                </div>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right Sidebar: Chat & Property Editor */}
                <div
                    className={cn(
                        "shrink-0 transition-all duration-500 ease-in-out overflow-hidden",
                        activeTab === 'builder' ? "w-80 ml-4 opacity-100" : "w-0 ml-0 opacity-0"
                    )}
                >
                    <Card className="w-80 flex flex-col h-full border-l bg-background overflow-hidden">
                        <Tabs defaultValue="chat" className="flex flex-col h-full">
                            <div className="px-4 pt-4">
                                <TabsList className="w-full grid grid-cols-2">
                                    <TabsTrigger value="chat" className="flex items-center gap-2">
                                        <Bot className="w-4 h-4" />
                                        AI
                                    </TabsTrigger>
                                    <TabsTrigger value="properties" className="flex items-center gap-2">
                                        <Settings className="w-4 h-4" />
                                        Properties
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 data-[state=active]:flex mt-2">
                                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")} />
                                        <span className="truncate max-w-[150px]" title={threadId}>
                                            {isConnected ? 'Connected' : 'Disconnected'}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => {
                                            setTempThreadId(threadId)
                                            setIsDialogOpen(true)
                                        }}
                                        title="Chat Settings"
                                    >
                                        <SquarePen className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="flex-1 overflow-hidden relative">
                                    <ScrollArea className="h-full p-4" ref={scrollRef}>
                                        <div className="space-y-4">
                                            {messages.length === 0 && (
                                                <div className="text-center text-muted-foreground py-8 text-sm">
                                                    Hi! I can help you build your form. Just type what you need.
                                                </div>
                                            )}
                                            {messages
                                                .filter(msg => msg.type === 'human' || msg.type === 'ai')
                                                .map((msg, index) => (
                                                    <div
                                                        key={index}
                                                        className={cn(
                                                            "flex items-start gap-2 max-w-[90%]",
                                                            msg.type === 'human' ? "ml-auto flex-row-reverse" : "mr-auto"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                                                            msg.type === 'human' ? "bg-primary text-primary-foreground" : "bg-muted"
                                                        )}>
                                                            {msg.type === 'human' ? <User size={12} /> : <Bot size={12} />}
                                                        </div>
                                                        <div className={cn(
                                                            "rounded-lg p-2 px-3 text-sm whitespace-pre-wrap",
                                                            msg.type === 'human'
                                                                ? "bg-primary text-primary-foreground"
                                                                : "bg-muted"
                                                        )}>
                                                            {msg.type === 'ai' ? (
                                                                <Streamdown shikiTheme={themes}>
                                                                    {msg.content}
                                                                </Streamdown>
                                                            ) : (
                                                                msg.content
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </ScrollArea>
                                </div>

                                <div className="p-3 border-t bg-background">
                                    {!isWelcomeState && renderChatInput()}
                                    {isWelcomeState && (
                                        <div className="text-xs text-center text-muted-foreground py-2">
                                            Use the chat input in the center of the screen to start.
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="properties" className="flex-1 min-h-0 overflow-auto mt-0">
                                <PropertyEditor
                                    element={getSelectedElement()}
                                    onUpdate={handleElementUpdate}
                                />
                            </TabsContent>
                        </Tabs>
                    </Card>
                </div>
            </div>

            <Dialog open={isSurveyFullScreen} onOpenChange={setIsSurveyFullScreen}>
                <DialogContent className="sm:max-w-[70vw] w-full h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Survey Full Screen Preview</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto relative">
                        {surveyJson && (
                            <CustomSurveyRenderer
                                json={surveyJson}
                                onJsonChange={setSurveyJson}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <DragOverlay>
                {activeDragItem ? (
                    <div className="opacity-80 rotate-3 cursor-grabbing">
                        <ToolboxItem
                            type={activeDragItem.elementType}
                            label={activeDragItem.elementType} // We might want a better label mapping here, but type works for now or we can pass label in data
                            icon={null} // Icon is tricky to pass through data unless we map it again. For now, just text or simple box.
                        />
                        {/* Better: Map type to icon/label again or pass it in data */}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext >
    )
}
