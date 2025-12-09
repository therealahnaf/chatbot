import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface FormElementWrapperProps {
    element: any;
    isSelected?: boolean;
    onSelect?: (element: any) => void;
    children: React.ReactNode;
}

export const FormElementWrapper: React.FC<FormElementWrapperProps> = ({
    element,
    isSelected,
    onSelect,
    children,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: element.name });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative mb-4 rounded-lg border p-4 transition-colors",
                isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50",
                isDragging && "opacity-50",
                "bg-card text-card-foreground"
            )}
            onClick={(e) => {
                e.stopPropagation();
                onSelect?.(element);
            }}
        >
            <div
                {...attributes}
                {...listeners}
                className="absolute left-2 top-1/2 -translate-y-1/2 cursor-move opacity-0 transition-opacity group-hover:opacity-100 p-2 hover:bg-accent rounded"
            >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="pl-8">
                {children}
            </div>
        </div>
    );
};
