import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SurveyCommentProps {
    element: any;
}

export const SurveyComment: React.FC<SurveyCommentProps> = ({ element }) => {
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
            />
        </div>
    );
};
