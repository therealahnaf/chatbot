import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface SurveyDropdownProps {
    element: any;
}

export const SurveyDropdown: React.FC<SurveyDropdownProps> = ({ element }) => {
    return (
        <div className="space-y-2">
            <Label>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}
            <Select disabled={element.readOnly}>
                <SelectTrigger>
                    <SelectValue placeholder={element.placeholder || "Select an option"} />
                </SelectTrigger>
                <SelectContent>
                    {element.allowClear && (
                        <SelectItem value="_clear_selection_">
                            <span className="text-muted-foreground italic">Clear Selection</span>
                        </SelectItem>
                    )}
                    {(element.choices || []).map((choice: any) => {
                        const value = typeof choice === 'object' ? choice.value : choice;
                        const text = typeof choice === 'object' ? choice.text : choice;

                        return (
                            <SelectItem key={value} value={String(value)}>
                                {text}
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>
        </div>
    );
};
