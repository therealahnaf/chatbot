import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { GripVertical, Trash2 } from 'lucide-react';

interface FormElementWrapperProps {
    element: any;
    isSelected?: boolean;
    onSelect?: (element: any) => void;
    onDelete?: (element: any) => void;
    children: React.ReactNode;
    readOnly?: boolean;
}

export const FormElementWrapper: React.FC<FormElementWrapperProps> = ({
    element,
    isSelected,
    onSelect,
    onDelete,
    children,
    readOnly = false,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: element.name,
        disabled: readOnly,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (readOnly) {
        return (
            <div className="mb-4 p-4 border border-transparent">
                {children}
            </div>
        );
    }

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

            {onDelete && (
                <div
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-2 hover:bg-destructive/10 hover:text-destructive rounded z-10"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(element);
                    }}
                    title="Delete Element"
                >
                    <Trash2 className="h-4 w-4" />
                </div>
            )}

            <div className="pl-8">
                {children}
            </div>
        </div>
    );
};
