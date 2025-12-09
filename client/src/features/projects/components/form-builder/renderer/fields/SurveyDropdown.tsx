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
    value?: string;
    onChange?: (value: string) => void;
    error?: string;
}

export const SurveyDropdown: React.FC<SurveyDropdownProps> = ({ element, value, onChange, error }) => {
    return (
        <div className="space-y-2">
            <Label className={error ? "text-destructive" : ""}>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}
            <Select
                disabled={element.readOnly}
                value={value}
                onValueChange={onChange}
            >
                <SelectTrigger className={error ? "border-destructive" : ""}>
                    <SelectValue placeholder={element.placeholder || "Select an option"} />
                </SelectTrigger>
                <SelectContent>
                    {element.allowClear && (
                        <SelectItem value="_clear_selection_">
                            <span className="text-muted-foreground italic">Clear Selection</span>
                        </SelectItem>
                    )}
                    {(element.choices || []).map((choice: any) => {
                        const itemValue = typeof choice === 'object' ? choice.value : choice;
                        const text = typeof choice === 'object' ? choice.text : choice;

                        return (
                            <SelectItem key={itemValue} value={String(itemValue)}>
                                {text}
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
};
