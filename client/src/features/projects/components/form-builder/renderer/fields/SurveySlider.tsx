import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface SurveySliderProps {
    element: any;
    value?: number;
    onChange?: (value: number) => void;
    error?: string;
}

export const SurveySlider: React.FC<SurveySliderProps> = ({ element, value, onChange, error }) => {
    const min = element.min || 0;
    const max = element.max || 100;
    const step = element.step || 1;

    return (
        <div className="space-y-4">
            <div className="flex justify-between">
                <Label className={error ? "text-destructive" : ""}>
                    {element.title || element.name}
                    {element.isRequired && <span className="text-destructive ml-1">*</span>}
                </Label>
                <span className="text-sm text-muted-foreground">{value !== undefined ? value : (element.defaultValue || min)}</span>
            </div>

            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}

            <div className="pt-2">
                <Slider
                    defaultValue={[element.defaultValue || min]}
                    value={value !== undefined ? [value] : [element.defaultValue || min]}
                    onValueChange={(vals) => onChange?.(vals[0])}
                    max={max}
                    min={min}
                    step={step}
                    disabled={element.readOnly}
                    className={error ? "border-destructive" : ""}
                />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{min}</span>
                <span>{max}</span>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
};
