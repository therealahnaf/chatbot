import React from 'react';
import { Label } from '@/components/ui/label';

interface SurveySignaturePadProps {
    element: any;
}

export const SurveySignaturePad: React.FC<SurveySignaturePadProps> = ({ element }) => {
    return (
        <div className="space-y-2">
            <Label>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}
            <div className="border rounded-md h-40 bg-muted/20 flex items-center justify-center text-muted-foreground">
                Signature Pad Placeholder
            </div>
        </div>
    );
};
