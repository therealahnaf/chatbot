import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SurveyRatingProps {
    element: any;
}

export const SurveyRating: React.FC<SurveyRatingProps> = ({ element }) => {
    const min = element.rateMin || 1;
    const max = element.rateMax || 5;
    const step = element.rateStep || 1;

    const rates = [];
    for (let i = min; i <= max; i += step) {
        rates.push(i);
    }

    return (
        <div className="space-y-3">
            <Label>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}
            <div className="flex items-center gap-4 flex-wrap">
                {element.minRateDescription && (
                    <span className="text-sm text-muted-foreground">{element.minRateDescription}</span>
                )}
                <div className="flex flex-wrap gap-2">
                    {rates.map((rate) => (
                        <button
                            key={rate}
                            type="button"
                            disabled={element.readOnly}
                            className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                                // Add active state logic here when we have value prop
                            )}
                        >
                            {rate}
                        </button>
                    ))}
                </div>
                {element.maxRateDescription && (
                    <span className="text-sm text-muted-foreground">{element.maxRateDescription}</span>
                )}
            </div>
        </div>
    );
};
