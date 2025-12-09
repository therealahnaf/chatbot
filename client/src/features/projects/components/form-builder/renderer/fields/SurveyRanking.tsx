import React from 'react';
import { Label } from '@/components/ui/label';
import { GripVertical } from 'lucide-react';

interface SurveyRankingProps {
    element: any;
}

export const SurveyRanking: React.FC<SurveyRankingProps> = ({ element }) => {
    return (
        <div className="space-y-3">
            <Label>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}

            <div className="space-y-2">
                {(element.choices || []).map((choice: any, index: number) => {
                    const value = typeof choice === 'object' ? choice.value : choice;
                    const text = typeof choice === 'object' ? choice.text : choice;

                    return (
                        <div key={value} className="flex items-center gap-2 p-3 border rounded-md bg-card hover:bg-accent/50 cursor-grab active:cursor-grabbing">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                                {index + 1}
                            </div>
                            <span className="flex-1">{text}</span>
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
