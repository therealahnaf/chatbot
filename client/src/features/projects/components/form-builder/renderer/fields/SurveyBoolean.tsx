import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SurveyBooleanProps {
    element: any;
}

export const SurveyBoolean: React.FC<SurveyBooleanProps> = ({ element }) => {
    const id = element.name;

    return (
        <div className="flex items-center space-x-2">
            <Switch id={id} disabled={element.readOnly} />
            <div className="grid gap-1.5 leading-none">
                <Label htmlFor={id}>
                    {element.title || element.name}
                    {element.isRequired && <span className="text-destructive ml-1">*</span>}
                </Label>
                {element.description && (
                    <p className="text-sm text-muted-foreground">{element.description}</p>
                )}
            </div>
        </div>
    );
};
