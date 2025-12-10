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

import { Input } from '@/components/ui/input';

export const SurveyDropdown: React.FC<SurveyDropdownProps> = ({ element, value, onChange, error }) => {
    // Ensure value is a string for comparison
    const currentValue = value ? String(value) : '';

    const handleValueChange = (val: string) => {
        if (onChange) {
            // If user selects "clear", we send empty string
            if (val === '_clear_selection_') {
                onChange('');
            } else {
                onChange(val);
            }
        }
    };

    // Determine placeholder text
    const placeholderText = (element.showOptionsCaption && element.optionsCaption)
        ? element.optionsCaption
        : (element.placeholder || "Select an option");

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
                value={currentValue}
                onValueChange={handleValueChange}
            >
                <SelectTrigger className={error ? "border-destructive" : ""}>
                    <SelectValue placeholder={placeholderText} />
                </SelectTrigger>
                <SelectContent>
                    {element.allowClear && (
                        <SelectItem value="_clear_selection_">
                            <span className="text-muted-foreground italic">Clear Selection</span>
                        </SelectItem>
                    )}

                    {/* Standard Choices */}
                    {(element.choices || []).map((choice: any) => {
                        const itemValue = typeof choice === 'object' ? choice.value : choice;
                        const text = typeof choice === 'object' ? choice.text : choice;
                        return (
                            <SelectItem key={itemValue} value={String(itemValue)}>
                                {text}
                            </SelectItem>
                        );
                    })}

                    {/* None Option */}
                    {element.showNoneItem && (
                        <SelectItem value="none">
                            {element.noneText || "None"}
                        </SelectItem>
                    )}

                    {/* Other Option */}
                    {element.showOtherItem && (
                        <SelectItem value="other">
                            {element.otherText || "Other"}
                        </SelectItem>
                    )}
                </SelectContent>
            </Select>

            {/* Other Input */}
            {element.showOtherItem && currentValue === 'other' && (
                <div className="mt-2">
                    <Input
                        type="text"
                        placeholder={element.otherPlaceholder || "Please specify..."}
                        disabled={element.readOnly}
                    // In a real app, we'd probably want to store this 'other' text separately or combined with the value
                    // For this renderer, we'll just show the input.
                    />
                </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
};
