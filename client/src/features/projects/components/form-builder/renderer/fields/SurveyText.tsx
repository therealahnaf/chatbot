import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SurveyTextProps {
    element: any;
}

export const SurveyText: React.FC<SurveyTextProps> = ({ element }) => {
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
            />
        </div>
    );
};
