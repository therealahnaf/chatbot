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
    // Extract properties that shouldn't be passed to the HTML input or need remapping
    const {
        // Rendered separately or internal SurveyJS props
        title,
        description,
        isRequired,
        type: _surveyType,
        titleLocation = 'top', // Default to top

        // Mapped props
        inputType,
        readOnly,

        // Logic/Internal props to exclude from DOM
        validators,
        visibleIf,
        enableIf,
        requiredIf,
        defaultValue,
        correctAnswer,

        // Spread the rest (includes placeholder, maxLength, minLength, name, min, max, etc.)
        ...inputProps
    } = element;

    const renderLabel = () => (
        <Label className={titleLocation === 'left' ? "w-1/3 shrink-0" : ""}>
            {title || element.name}
            {isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
    );

    const renderDescription = () => (
        description && (
            <p className="text-sm text-muted-foreground">{description}</p>
        )
    );

    const renderInput = () => (
        <div className={titleLocation === 'left' ? "flex-1" : ""}>
            <Input
                {...inputProps}
                disabled={readOnly}
                type={inputType || 'text'}
                value={value || ''}
                onChange={(e) => onChange?.(e.target.value)}
                className={error ? "border-destructive" : ""}
            />
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>
    );

    if (titleLocation === 'hidden') {
        return (
            <div className="space-y-2">
                {renderDescription()}
                {renderInput()}
            </div>
        );
    }

    if (titleLocation === 'left') {
        return (
            <div className="space-y-2">
                <div className="flex gap-4 items-center">
                    {renderLabel()}
                    {renderInput()}
                </div>
                {renderDescription()}
            </div>
        );
    }

    if (titleLocation === 'bottom') {
        return (
            <div className="space-y-2">
                {renderDescription()}
                {renderInput()}
                {renderLabel()}
            </div>
        );
    }

    // Default (top)
    return (
        <div className="space-y-2">
            {renderLabel()}
            {renderDescription()}
            {renderInput()}
        </div>
    );
};
