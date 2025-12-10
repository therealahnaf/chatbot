import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SurveyFileProps {
    element: any;
}

export const SurveyFile: React.FC<SurveyFileProps> = ({ element }) => {
    return (
        <div className="space-y-2">
            <Label>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}
            <Input
                type="file"
                disabled={element.readOnly}
                multiple={element.allowMultiple}
                accept={element.acceptedTypes}
            />
        </div>
    );
};
