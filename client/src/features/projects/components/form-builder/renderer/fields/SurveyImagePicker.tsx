import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface SurveyImagePickerProps {
    element: any;
}

export const SurveyImagePicker: React.FC<SurveyImagePickerProps> = ({ element }) => {
    return (
        <div className="space-y-3">
            <Label>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}
            <div className="flex flex-wrap gap-4">
                {(element.choices || []).map((choice: any, index: number) => {
                    const value = typeof choice === 'object' ? choice.value : choice;
                    const text = typeof choice === 'object' ? choice.text : choice; // Text might not be shown in image picker usually
                    const imageLink = choice.imageLink || '';

                    return (
                        <div
                            key={value}
                            className={cn(
                                "relative group cursor-pointer border-2 rounded-lg overflow-hidden transition-all hover:border-primary",
                                // Mock selection state
                                index === 0 ? "border-primary" : "border-transparent"
                            )}
                            style={{
                                width: element.imageWidth ? `${element.imageWidth}px` : '200px',
                                height: element.imageHeight ? `${element.imageHeight}px` : '150px',
                            }}
                        >
                            {imageLink ? (
                                <img
                                    src={imageLink}
                                    alt={text || value}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                                    No Image
                                </div>
                            )}

                            {/* Selection Indicator */}
                            <div className={cn(
                                "absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 opacity-0 transition-opacity",
                                index === 0 ? "opacity-100" : "group-hover:opacity-50"
                            )}>
                                <Check className="h-4 w-4" />
                            </div>

                            {element.showLabel && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-center text-sm truncate">
                                    {text || value}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
