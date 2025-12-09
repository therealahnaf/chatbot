import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SurveyBooleanProps {
    element: any;
    value?: boolean;
    onChange?: (value: boolean) => void;
    error?: string;
}

export const SurveyBoolean: React.FC<SurveyBooleanProps> = ({ element, value, onChange, error }) => {
    const id = element.name;

    return (
        <div className="space-y-2">
            <div className="flex items-center space-x-2">
                <Switch
                    id={id}
                    disabled={element.readOnly}
                    checked={value || false}
                    onCheckedChange={onChange}
                />
                <div className="grid gap-1.5 leading-none">
                    <Label htmlFor={id} className={error ? "text-destructive" : ""}>
                        {element.title || element.name}
                        {element.isRequired && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {element.description && (
                        <p className="text-sm text-muted-foreground">{element.description}</p>
                    )}
                </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
};
