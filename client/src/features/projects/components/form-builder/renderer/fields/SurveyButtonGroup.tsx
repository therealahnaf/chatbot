import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SurveyButtonGroupProps {
    element: any;
}

export const SurveyButtonGroup: React.FC<SurveyButtonGroupProps> = ({ element }) => {
    return (
        <div className="space-y-3">
            <Label>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}

            <div className="flex flex-wrap gap-2">
                {(element.choices || []).map((choice: any) => {
                    const value = typeof choice === 'object' ? choice.value : choice;
                    const text = typeof choice === 'object' ? choice.text : choice;

                    return (
                        <Button
                            key={value}
                            variant="outline"
                            disabled={element.readOnly}
                            className={cn(
                                // Add active state logic here
                            )}
                        >
                            {text}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
};
