import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Send, User, Bot, Settings, Maximize2, MessageSquare, Plus, PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { chatApi, type ChatMessage } from '@/lib/api/chat.api'
import { cn } from '@/lib/utils'
import StandaloneSurveyRenderer from './StandaloneSurveyRenderer'
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
    const scrollRef = useRef<HTMLDivElement>(null)

    // Query for threads
    const { data: threadsData, refetch: refetchThreads } = useQuery({
        queryKey: ['chat-threads'],
        queryFn: chatApi.getThreads,
    })

    // Query for history (still useful for initial load)
    const { data: historyData, refetch: refetchHistory } = useQuery({
        queryKey: ['chat-history', threadId],
        queryFn: () => chatApi.getHistory(threadId),
        enabled: false,
    })

    // Update messages when history is loaded
    useEffect(() => {
        if (historyData?.history) {
            setMessages(historyData.history)
        }
    }, [historyData])

    // Debugging messages
    useEffect(() => {
        console.log("Current messages:", messages)
        messages.forEach(m => console.log("Message type:", m.type))
    }, [messages])

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
        setThreadId(finalThreadId)
        setIsDialogOpen(false)
    }

    const handleSend = () => {
        if (!input.trim()) return

        // Optimistically add user message
        const userMsg: ChatMessage = { type: 'human', content: input }
        setMessages((prev) => [...prev, userMsg])

        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(input)
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

    const startNewChat = () => {
        const newThreadId = crypto.randomUUID()
        setThreadId(newThreadId)
        setMessages([])
        setSurveyJson(null)
        refetchThreads()
    }

    const selectThread = (id: string) => {
        setThreadId(id)
        setSurveyJson(null) // Reset survey when switching threads, it will reload if history has it? 
        // Actually history load doesn't currently bring back final_json, only messages. 
        // If we want to restore survey, we'd need to fetch it or re-parse from last message if it's there.
        // For now, just switching chat history.
    }

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    return (
        <>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Chat Name</DialogTitle>
                        <DialogDescription>
                            Enter a name for the chat to load an existing conversation or start a new one.
                            Leave empty to generate an ID automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={tempThreadId}
                            onChange={(e) => setTempThreadId(e.target.value)}
                            placeholder="Thread ID (optional)"
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={handleConfirmThreadId}>Start Chat</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex h-[85vh] gap-4">
                {/* Sidebar */}
                <Card className={cn("flex flex-col shrink-0 transition-all duration-300", isSidebarOpen ? "w-64" : "w-16")}>
                    <CardHeader className={cn("pb-3 flex flex-row items-center", isSidebarOpen ? "justify-between" : "justify-center px-2")}>
                        {isSidebarOpen && <span className="font-semibold">Chats</span>}
                        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} title={isSidebarOpen ? "Collapse" : "Expand"}>
                            <PanelLeft size={16} />
                        </Button>
                    </CardHeader>
                    <div className={cn("px-4 pb-2", !isSidebarOpen && "px-2")}>
                        <Button
                            onClick={startNewChat}
                            className={cn("w-full gap-2", isSidebarOpen ? "justify-start" : "justify-center px-0")}
                            title="New Chat"
                        >
                            <Plus size={16} />
                            {isSidebarOpen && "New Chat"}
                        </Button>
                    </div>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="flex flex-col p-2 gap-1">
                                {threadsData?.threads.map((tid) => (
                                    <Button
                                        key={tid}
                                        variant={threadId === tid ? "secondary" : "ghost"}
                                        className={cn(
                                            "h-auto py-3",
                                            isSidebarOpen ? "justify-start px-4 text-left" : "justify-center px-2"
                                        )}
                                        onClick={() => selectThread(tid)}
                                        title={tid}
                                    >
                                        <MessageSquare className={cn("h-4 w-4 shrink-0", isSidebarOpen && "mr-2")} />
                                        {isSidebarOpen && <span className="truncate text-xs">{tid}</span>}
                                    </Button>
                                ))}
                                {(!threadsData?.threads || threadsData.threads.length === 0) && (
                                    <div className="text-center text-muted-foreground text-xs py-4">
                                        {isSidebarOpen ? "No history found" : "..."}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Chat Area */}
                <Card className={cn("flex flex-col flex-1 min-w-0", surveyJson ? "w-1/3" : "")}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle>Chat with Formzed</CardTitle>
                            <div className="flex items-center gap-2">
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                    <span className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")} />
                                    <span className="truncate max-w-[150px] text-xs" title={threadId}>
                                        {threadId || 'New'}
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setTempThreadId(threadId)
                                        setIsDialogOpen(true)
                                    }}
                                >
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <ScrollArea className="h-full p-4" ref={scrollRef}>
                            <div className="space-y-4">
                                {messages.length === 0 && (
                                    <div className="text-center text-muted-foreground py-8">
                                        Start a conversation...
                                    </div>
                                )}
                                {messages
                                    .filter(msg => {
                                        console.log('Filtering message:', msg.type, msg.content.substring(0, 20));
                                        return msg.type === 'human' || msg.type === 'ai';
                                    })
                                    .map((msg, index) => (
                                        <div
                                            key={index}
                                            className={cn(
                                                "flex items-start gap-2 max-w-[80%]",
                                                msg.type === 'human' ? "ml-auto flex-row-reverse" : "mr-auto"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                                msg.type === 'human' ? "bg-primary text-primary-foreground" : "bg-muted"
                                            )}>
                                                {msg.type === 'human' ? <User size={16} /> : <Bot size={16} />}
                                            </div>
                                            <div className={cn(
                                                "rounded-lg p-3 text-sm whitespace-pre-wrap",
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
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                        <div className="flex w-full gap-2">
                            <Input
                                placeholder="Type your message..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={!isConnected}
                            />
                            <Button
                                onClick={handleSend}
                                disabled={!isConnected || !input.trim()}
                                size="icon"
                            >
                                <Send size={18} />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>

                {surveyJson && (
                    <Card className="w-1/2 flex flex-col shrink-0">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle>Survey Preview</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsSurveyFullScreen(true)}
                                >
                                    <Maximize2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                JSON Loaded: {Object.keys(surveyJson).length} keys
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 overflow-hidden relative">
                            <div className="absolute inset-0 overflow-auto">
                                <StandaloneSurveyRenderer
                                    json={surveyJson}
                                    onComplete={(data) => console.log("Survey Completed:", data)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Dialog open={isSurveyFullScreen} onOpenChange={setIsSurveyFullScreen}>
                <DialogContent className="sm:max-w-[70vw] w-full h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Survey Full Screen Preview</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto relative">
                        {surveyJson && (
                            <StandaloneSurveyRenderer
                                json={surveyJson}
                                onComplete={(data) => console.log("Survey Completed:", data)}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
