import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface SurveyTagBoxProps {
    element: any;
}

export const SurveyTagBox: React.FC<SurveyTagBoxProps> = ({ element }) => {
    // Mock selected values
    const selectedValues = element.defaultValue || [];

    return (
        <div className="space-y-3">
            <Label>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-2">
                {selectedValues.map((val: string) => (
                    <Badge key={val} variant="secondary" className="gap-1">
                        {val}
                        <X className="h-3 w-3 cursor-pointer hover:text-destructive" />
                    </Badge>
                ))}
            </div>

            <Select disabled={element.readOnly}>
                <SelectTrigger>
                    <SelectValue placeholder={element.placeholder || "Select tags..."} />
                </SelectTrigger>
                <SelectContent>
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
