import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import {
    Type,
    MessageSquare,
    CheckSquare,
    CircleDot,
    List,
    ToggleLeft,
    Star,
    FileUp
} from 'lucide-react';

export interface ToolboxItemProps {
    type: string;
    label: string;
    icon: React.ReactNode;
}

export const ToolboxItem: React.FC<ToolboxItemProps> = ({ type, label, icon }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `toolbox-${type}`,
        data: {
            type: 'toolbox-item',
            elementType: type,
        },
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "flex items-center gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-colors",
                isDragging && "opacity-50 ring-2 ring-primary"
            )}
        >
            <div className="text-muted-foreground">
                {icon}
            </div>
            <span className="text-sm font-medium">{label}</span>
        </div>
    );
};

export const Toolbox: React.FC = () => {
    const items = [
        { type: 'text', label: 'Single Input', icon: <Type size={16} /> },
        { type: 'comment', label: 'Comment', icon: <MessageSquare size={16} /> },
        { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare size={16} /> },
        { type: 'radiogroup', label: 'Radio Group', icon: <CircleDot size={16} /> },
        { type: 'dropdown', label: 'Dropdown', icon: <List size={16} /> },
        { type: 'boolean', label: 'Boolean', icon: <ToggleLeft size={16} /> },
        { type: 'rating', label: 'Rating', icon: <Star size={16} /> },
        { type: 'file', label: 'File Upload', icon: <FileUp size={16} /> },
    ];

    return (
        <div className="flex flex-col gap-2 p-2">
            <div className="grid grid-cols-1 gap-2">
                {items.map((item) => (
                    <ToolboxItem
                        key={item.type}
                        type={item.type}
                        label={item.label}
                        icon={item.icon}
                    />
                ))}
            </div>
        </div>
    );
};
