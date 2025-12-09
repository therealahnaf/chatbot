import React, { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { FormElementWrapper } from './FormElementWrapper';
import { getComponentForType } from './utils/schema-mapper';
import { PlusIcon, EditIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CustomSurveyRendererProps {
    json: any;
    onJsonChange?: (newJson: any) => void;
    onSelectElement?: (element: any) => void;
    selectedElementId?: string;
    onAddPage?: () => void;
    onDeletePage?: (index: number) => void;
    previewMode?: boolean;
    currentPage?: number;
    onPageChange?: (page: number) => void;
    hideNavigation?: boolean;
}

export const CustomSurveyRenderer: React.FC<CustomSurveyRendererProps> = ({
    json,
    onJsonChange,
    onSelectElement,
    selectedElementId,
    onAddPage,
    onDeletePage,
    previewMode = false,
    currentPage: controlledPage,
    onPageChange,
    hideNavigation = false,
}) => {
    const [internalPage, setInternalPage] = useState(0);
    const currentPage = controlledPage !== undefined ? controlledPage : internalPage;

    const [elements, setElements] = useState<any[]>([]);
    const [formValues, setFormValues] = useState<Record<string, any>>({});
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const { setNodeRef } = useDroppable({
        id: `canvas-container-${currentPage}`,
        data: { pageIndex: currentPage },
        disabled: previewMode,
    });

    useEffect(() => {
        if (json) {
            let currentElements: any[] = [];
            if (json.pages && json.pages.length > 0) {
                // Ensure currentPage is valid
                const pageIndex = Math.min(currentPage, json.pages.length - 1);
                if (pageIndex !== currentPage) {
                    if (onPageChange) onPageChange(pageIndex);
                    else setInternalPage(pageIndex);
                }
                currentElements = json.pages[pageIndex].elements || json.pages[pageIndex].questions || [];
            } else if (json.elements) {
                currentElements = json.elements;
            } else if (json.questions) {
                currentElements = json.questions;
            }
            setElements(currentElements);
        } else {
            setElements([]);
        }
    }, [json, currentPage, onPageChange]);

    const totalPages = json?.pages?.length || 0;
    const hasPages = totalPages > 0;

    const handleEditPage = () => {
        if (previewMode) return;
        if (hasPages && json.pages[currentPage]) {
            // Inject type='page' for the PropertyEditor to recognize it
            onSelectElement?.({ ...json.pages[currentPage], type: 'page' });
        } else if (!hasPages && currentPage === 0) {
            // Virtual page 1 for flat structure
            onSelectElement?.({
                name: 'page1',
                type: 'page',
                elements: json.elements || json.questions
            });
        }
    };

    const handleValueChange = (name: string, value: any) => {
        setFormValues(prev => ({ ...prev, [name]: value }));
        // Clear error when value changes
        if (formErrors[name]) {
            setFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validatePage = (): boolean => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        elements.forEach(element => {
            if (element.isRequired) {
                const value = formValues[element.name];
                if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
                    newErrors[element.name] = 'This field is required';
                    isValid = false;
                }
            }
        });

        setFormErrors(newErrors);
        return isValid;
    };

    const handleNextPage = () => {
        const nextPage = Math.min((totalPages || 1) - 1, currentPage + 1);
        if (previewMode) {
            if (validatePage()) {
                if (onPageChange) onPageChange(nextPage);
                else setInternalPage(nextPage);
            }
        } else {
            if (onPageChange) onPageChange(nextPage);
            else setInternalPage(nextPage);
        }
    };

    const handlePrevPage = () => {
        const prevPage = Math.max(0, currentPage - 1);
        if (onPageChange) onPageChange(prevPage);
        else setInternalPage(prevPage);
    };

    const isLastPage = currentPage === (totalPages || 1) - 1;

    return (
        <div className="flex flex-col min-h-full">
            {/* Survey Header */}
            {previewMode && (json.title || json.description || json.logo) && (
                <div className="p-6 bg-card border-b flex items-start gap-4">
                    {json.logo && (
                        <div className="shrink-0">
                            <img
                                src={json.logo}
                                alt="Survey Logo"
                                style={{ height: json.logoHeight || 'auto', maxHeight: '100px' }}
                                className="object-contain"
                            />
                        </div>
                    )}
                    <div className="flex-1">
                        {json.title && (
                            <h1 className="text-2xl font-bold text-foreground mb-2">{json.title}</h1>
                        )}
                        {json.description && (
                            <p className="text-muted-foreground">{json.description}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            {json.showProgressBar && previewMode && (
                <div className="w-full px-6 pb-6 pt-6">
                    <Progress value={totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0} className="h-2" />
                </div>
            )}



            <div
                ref={setNodeRef}
                className="flex-1 p-4 bg-background min-h-[200px]"
                onClick={() => !previewMode && onSelectElement?.(null)}
            >
                {previewMode ? (
                    // Render directly without SortableContext in preview mode
                    <div className="space-y-4">
                        {elements.map((element) => {
                            const Component = getComponentForType(element.type);
                            if (!Component) return null;

                            return (
                                <FormElementWrapper
                                    key={element.name}
                                    element={element}
                                    readOnly={true}
                                >
                                    <Component
                                        element={element}
                                        value={formValues[element.name]}
                                        onChange={(val: any) => handleValueChange(element.name, val)}
                                        error={formErrors[element.name]}
                                    />
                                </FormElementWrapper>
                            );
                        })}
                        {isLastPage && (
                            <div className="pt-4 flex justify-end">
                                <Button onClick={() => validatePage() && alert("Form Submitted!")}>
                                    Complete
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <SortableContext
                        items={elements.map((e) => e.name)}
                        strategy={verticalListSortingStrategy}
                    >
                        {elements.map((element) => {
                            const Component = getComponentForType(element.type);
                            if (!Component) {
                                return (
                                    <div key={element.name} className="p-4 border border-dashed border-destructive text-destructive mb-4">
                                        Unknown component type: {element.type}
                                    </div>
                                );
                            }

                            return (
                                <FormElementWrapper
                                    key={element.name}
                                    element={element}
                                    isSelected={selectedElementId === element.name}
                                    onSelect={onSelectElement}
                                >
                                    <Component element={element} />
                                </FormElementWrapper>
                            );
                        })}
                    </SortableContext>
                )}

                {elements.length === 0 && (
                    <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
                        Page is empty
                    </div>
                )}
            </div>

            {!hideNavigation && (
                <div className="p-4 flex flex-col gap-2 border-t bg-background">
                    <div className={cn("flex items-center w-full", previewMode ? "justify-end" : "justify-between")}>
                        <div className="flex items-center gap-1">
                            <button
                                className="p-1 text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md disabled:opacity-50"
                                onClick={handlePrevPage}
                                disabled={currentPage === 0}
                                title="Previous Page"
                            >
                                <ChevronLeftIcon className="h-4 w-4" />
                            </button>
                            <span className="text-sm font-medium mx-1">
                                Page {currentPage + 1} of {Math.max(1, totalPages)}
                            </span>
                            <button
                                className="p-1 text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md disabled:opacity-50"
                                onClick={handleNextPage}
                                disabled={isLastPage && !previewMode} // In preview mode, next button might be hidden or changed to submit on last page, but for now let's keep it consistent or hide if last page
                                title="Next Page"
                            >
                                <ChevronRightIcon className="h-4 w-4" />
                            </button>
                        </div>
                        {!previewMode && (
                            <div className="flex gap-1">
                                <button
                                    className="p-1 text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md"
                                    onClick={handleEditPage}
                                    title="Edit Page Properties"
                                >
                                    <EditIcon className="h-4 w-4" />
                                </button>
                                {onDeletePage && (
                                    <button
                                        className="p-1 text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md disabled:opacity-50"
                                        onClick={() => onDeletePage(currentPage)}
                                        disabled={totalPages <= 1}
                                        title="Delete Page"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                )}
                                {onAddPage && (
                                    <button
                                        className="p-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded-md"
                                        onClick={onAddPage}
                                        title="Add New Page"
                                    >
                                        <PlusIcon className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
