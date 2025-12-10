import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SurveyCommentProps {
    element: any;
    value?: string;
    onChange?: (value: string) => void;
    error?: string;
}

export const SurveyComment: React.FC<SurveyCommentProps> = ({ element, value, onChange, error }) => {
    // Extract properties that shouldn't be passed to the HTML input or need remapping
    const {
        // Rendered separately or internal SurveyJS props
        title,
        description,
        isRequired,
        type: _surveyType,
        titleLocation = 'top', // Default to top

        // Mapped props
        readOnly,
        rows,

        // Logic/Internal props to exclude from DOM
        validators,
        visibleIf,
        enableIf,
        requiredIf,
        defaultValue,
        correctAnswer,

        // Spread the rest (includes placeholder, maxLength, minLength, name, etc.)
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
            <Textarea
                {...inputProps}
                disabled={readOnly}
                rows={rows || 4}
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
                <div className="flex gap-4 items-start">
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
