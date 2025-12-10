import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SurveyRatingProps {
    element: any;
    value?: number;
    onChange?: (value: number) => void;
    error?: string;
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Smile } from 'lucide-react';

export const SurveyRating: React.FC<SurveyRatingProps> = ({ element, value, onChange, error }) => {
    const min = element.rateMin || 1;
    const max = element.rateMax || 5;
    const step = element.rateStep || 1;
    const rateType = element.rateType || 'labels';
    const displayMode = element.displayMode || 'auto';

    const rates = [];
    for (let i = min; i <= max; i += step) {
        rates.push(i);
    }

    const renderStars = () => (
        <div className="flex gap-1">
            {rates.map((rate) => (
                <button
                    key={rate}
                    type="button"
                    disabled={element.readOnly}
                    onClick={() => onChange?.(rate)}
                    className={cn(
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                        "transition-colors hover:text-yellow-400",
                        (value || 0) >= rate ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
                    )}
                >
                    <Star className={cn("h-8 w-8", (value || 0) >= rate ? "fill-current" : "")} />
                </button>
            ))}
        </div>
    );

    const renderSmileys = () => (
        <div className="flex gap-2">
            {rates.map((rate) => (
                <button
                    key={rate}
                    type="button"
                    disabled={element.readOnly}
                    onClick={() => onChange?.(rate)}
                    className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-md transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                        value === rate ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                    )}
                >
                    <Smile className={cn("h-8 w-8", value === rate ? "text-primary" : "")} />
                    <span className="text-xs">{rate}</span>
                </button>
            ))}
        </div>
    );

    const renderButtons = () => (
        <div className="flex flex-wrap gap-2">
            {rates.map((rate) => (
                <button
                    key={rate}
                    type="button"
                    disabled={element.readOnly}
                    onClick={() => onChange?.(rate)}
                    className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                        value === rate ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : ""
                    )}
                >
                    {rate}
                </button>
            ))}
        </div>
    );

    const renderDropdown = () => (
        <Select
            value={value?.toString()}
            onValueChange={(val) => onChange?.(Number(val))}
            disabled={element.readOnly}
        >
            <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
                {rates.map((rate) => (
                    <SelectItem key={rate} value={rate.toString()}>
                        {rate}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    const renderContent = () => {
        if (displayMode === 'dropdown') return renderDropdown();
        if (rateType === 'stars') return renderStars();
        if (rateType === 'smileys') return renderSmileys();
        return renderButtons();
    };

    return (
        <div className="space-y-3">
            <Label className={error ? "text-destructive" : ""}>
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

                {renderContent()}

                {element.maxRateDescription && (
                    <span className="text-sm text-muted-foreground">{element.maxRateDescription}</span>
                )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
};
