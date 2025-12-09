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
    return (
        <div className="space-y-2">
            <Label>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}
            <Textarea
                placeholder={element.placeholder}
                disabled={element.readOnly}
                rows={element.rows || 4}
                maxLength={element.maxLength}
                value={value || ''}
                onChange={(e) => onChange?.(e.target.value)}
                className={error ? "border-destructive" : ""}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
};
