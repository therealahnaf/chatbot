import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SurveyTextProps {
    element: any;
    value?: string;
    onChange?: (value: string) => void;
    error?: string;
}

export const SurveyText: React.FC<SurveyTextProps> = ({ element, value, onChange, error }) => {
    return (
        <div className="space-y-2">
            <Label>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}
            <Input
                placeholder={element.placeholder}
                disabled={element.readOnly}
                type={element.inputType || 'text'}
                maxLength={element.maxLength}
                value={value || ''}
                onChange={(e) => onChange?.(e.target.value)}
                className={error ? "border-destructive" : ""}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
};
