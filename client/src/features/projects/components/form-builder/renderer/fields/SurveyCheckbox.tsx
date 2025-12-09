import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SurveyCheckboxProps {
    element: any;
}

export const SurveyCheckbox: React.FC<SurveyCheckboxProps> = ({ element }) => {
    return (
        <div className="space-y-3">
            <Label>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}
            <div className="space-y-2">
                {(element.choices || []).map((choice: any, index: number) => {
                    const value = typeof choice === 'object' ? choice.value : choice;
                    const text = typeof choice === 'object' ? choice.text : choice;
                    const id = `${element.name}-${index}`;

                    return (
                        <div key={value} className="flex items-center space-x-2">
                            <Checkbox id={id} disabled={element.readOnly} />
                            <Label htmlFor={id} className="font-normal cursor-pointer">
                                {text}
                            </Label>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
