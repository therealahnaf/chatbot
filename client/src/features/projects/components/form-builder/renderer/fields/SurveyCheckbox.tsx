import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SurveyCheckboxProps {
    element: any;
    value?: any[];
    onChange?: (value: any[]) => void;
    error?: string;
}

export const SurveyCheckbox: React.FC<SurveyCheckboxProps> = ({ element, value = [], onChange, error }) => {
    const handleCheckedChange = (checked: boolean, itemValue: any) => {
        if (!onChange) return;

        const currentValues = Array.isArray(value) ? value : [];
        if (checked) {
            onChange([...currentValues, itemValue]);
        } else {
            onChange(currentValues.filter((v: any) => v !== itemValue));
        }
    };

    return (
        <div className="space-y-3">
            <Label className={error ? "text-destructive" : ""}>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}
            <div className="space-y-2">
                {(element.choices || []).map((choice: any, index: number) => {
                    const itemValue = typeof choice === 'object' ? choice.value : choice;
                    const text = typeof choice === 'object' ? choice.text : choice;
                    const id = `${element.name}-${index}`;
                    const isChecked = Array.isArray(value) && value.includes(itemValue);

                    return (
                        <div key={itemValue} className="flex items-center space-x-2">
                            <Checkbox
                                id={id}
                                disabled={element.readOnly}
                                checked={isChecked}
                                onCheckedChange={(checked) => handleCheckedChange(checked as boolean, itemValue)}
                            />
                            <Label htmlFor={id} className="font-normal cursor-pointer">
                                {text}
                            </Label>
                        </div>
                    );
                })}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
};
