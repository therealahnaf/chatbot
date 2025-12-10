import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface SurveyMultipleTextProps {
    element: any;
}

export const SurveyMultipleText: React.FC<SurveyMultipleTextProps> = ({ element }) => {
    return (
        <div className="space-y-3">
            <Label>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}

            <div className="space-y-4">
                {(element.items || []).map((item: any) => (
                    <div key={item.name} className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor={`${element.name}-${item.name}`}>
                            {item.title || item.name}
                        </Label>
                        <Input
                            type={item.inputType || "text"}
                            id={`${element.name}-${item.name}`}
                            placeholder={item.placeholder}
                            disabled={element.readOnly}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};
