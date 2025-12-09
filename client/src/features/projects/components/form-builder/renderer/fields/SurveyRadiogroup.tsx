import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface SurveyRadiogroupProps {
    element: any;
    value?: string;
    onChange?: (value: string) => void;
    error?: string;
}

export const SurveyRadiogroup: React.FC<SurveyRadiogroupProps> = ({ element, value, onChange, error }) => {
    return (
        <div className="space-y-3">
            <Label className={error ? "text-destructive" : ""}>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}
            <RadioGroup
                disabled={element.readOnly}
                value={value}
                onValueChange={onChange}
            >
                {(element.choices || []).map((choice: any, index: number) => {
                    const itemValue = typeof choice === 'object' ? choice.value : choice;
                    const text = typeof choice === 'object' ? choice.text : choice;
                    const id = `${element.name}-${index}`;

                    return (
                        <div key={itemValue} className="flex items-center space-x-2">
                            <RadioGroupItem value={String(itemValue)} id={id} />
                            <Label htmlFor={id} className="font-normal cursor-pointer">
                                {text}
                            </Label>
                        </div>
                    );
                })}
                {element.showOtherItem && (
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="other" id={`${element.name}-other`} />
                            <Label htmlFor={`${element.name}-other`} className="font-normal cursor-pointer">
                                {element.otherText || "Other"}
                            </Label>
                        </div>
                        {/* Ideally we would conditionally show this input when 'other' is selected, 
                            but for this renderer we'll just show it indented for now or we need state. 
                            Since this is a stateless renderer, we'll just render it. */}
                        <div className="pl-6">
                            <input
                                type="text"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder={element.otherPlaceholder || "Please specify..."}
                                disabled={element.readOnly}
                            />
                        </div>
                    </div>
                )}
            </RadioGroup>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
};
