import React from 'react';
import { Label } from '@/components/ui/label';

interface SurveyExpressionProps {
    element: any;
}

export const SurveyExpression: React.FC<SurveyExpressionProps> = ({ element }) => {
    return (
        <div className="space-y-2">
            <Label>{element.title || element.name}</Label>
            <div className="p-2 bg-muted rounded-md text-sm font-mono">
                {element.expression}
            </div>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}
        </div>
    );
};
