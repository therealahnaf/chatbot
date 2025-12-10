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
    const titleLocation = element.titleLocation || 'top';

    const renderTitle = () => (
        <div className="grid gap-1.5 leading-none">
            <Label htmlFor={id} className={error ? "text-destructive" : ""}>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}
        </div>
    );

    const renderSwitch = () => (
        <div className="flex items-center space-x-2">
            {element.labelFalse && (
                <span className="text-sm text-muted-foreground">{element.labelFalse}</span>
            )}
            <Switch
                id={id}
                disabled={element.readOnly}
                checked={value || false}
                onCheckedChange={onChange}
            />
            {element.labelTrue && (
                <span className="text-sm text-muted-foreground">{element.labelTrue}</span>
            )}

            {/* The main label (if different from title, or if we want it next to the switch) */}
            {element.label && (
                <Label htmlFor={id} className="font-normal cursor-pointer ml-2">
                    {element.label}
                </Label>
            )}
        </div>
    );

    return (
        <div className={`space-y-2 ${titleLocation === 'left' ? 'flex items-center space-x-4 space-y-0' : ''}`}>
            {titleLocation !== 'hidden' && titleLocation !== 'bottom' && renderTitle()}

            {renderSwitch()}

            {titleLocation === 'bottom' && renderTitle()}

            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
};
