import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SurveyCheckboxProps {
    element: any;
    value?: any[];
    onChange?: (value: any[]) => void;
    error?: string;
}

export const SurveyCheckbox: React.FC<SurveyCheckboxProps> = ({ element, value = [], onChange, error }) => {
    const {
        title,
        description,
        isRequired,
        choices = [],
        showSelectAllItem,
        showNoneItem,
        showOtherItem,
        colCount = 0,
        titleLocation = 'top',
        readOnly,
        // otherText, noneText, selectAllText could be supported too
    } = element;

    const handleCheckedChange = (checked: boolean, itemValue: any) => {
        if (!onChange) return;

        let currentValues = Array.isArray(value) ? [...value] : [];

        if (itemValue === 'none') {
            // If "None" is selected, clear everything else and set "none"
            // If "None" is deselected, just remove it
            if (checked) {
                onChange(['none']);
            } else {
                onChange([]);
            }
            return;
        }

        if (itemValue === 'selectAll') {
            // If "Select All" is selected, select all choices (excluding none)
            // If deselected, clear all (except none if it was somehow there, but it shouldn't be)
            if (checked) {
                const allValues = choices.map((c: any) => typeof c === 'object' ? c.value : c);
                if (showOtherItem) allValues.push('other');
                onChange(allValues);
            } else {
                onChange([]);
            }
            return;
        }

        // Normal item or "other"
        if (checked) {
            // Remove 'none' if it exists when selecting a normal item
            currentValues = currentValues.filter(v => v !== 'none');
            currentValues.push(itemValue);
        } else {
            currentValues = currentValues.filter(v => v !== itemValue);
        }

        onChange(currentValues);
    };

    // Helper to check if "Select All" should be visually checked
    const isSelectAllChecked = () => {
        if (!Array.isArray(value)) return false;
        if (value.includes('none')) return false;
        // Check if all standard choices are selected
        const allChoiceValues = choices.map((c: any) => typeof c === 'object' ? c.value : c);
        const allSelected = allChoiceValues.every((v: any) => value.includes(v));
        // If "other" is shown, it usually doesn't strictly need to be selected for "Select All" in some implementations,
        // but often "Select All" means *all* defined choices. SurveyJS behavior varies slightly but let's stick to choices.
        return allSelected && allChoiceValues.length > 0;
    };

    const renderLabel = () => (
        <Label className={titleLocation === 'left' ? "w-1/3 shrink-0" : ""}>
            {title || element.name}
            {isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
    );

    const renderDescription = () => (
        description && (
            <p className="text-sm text-muted-foreground">{description}</p>
        )
    );

    const renderOptions = () => {
        const gridClass = colCount > 0
            ? `grid gap-2 grid-cols-${colCount}` // Note: Tailwind needs safelisted classes or dynamic style for arbitrary cols. 
            // For safety with standard Tailwind config, we might need style or limited classes.
            // Let's use style for grid-template-columns to be safe if colCount > 4 or not safelisted.
            : "space-y-2";

        const gridStyle = colCount > 0 ? { display: 'grid', gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`, gap: '0.5rem' } : {};

        return (
            <div className={colCount === 0 ? "space-y-2" : ""} style={gridStyle}>
                {showSelectAllItem && (
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id={`${element.name}-selectAll`}
                            disabled={readOnly}
                            checked={isSelectAllChecked()}
                            onCheckedChange={(checked) => handleCheckedChange(checked as boolean, 'selectAll')}
                        />
                        <Label htmlFor={`${element.name}-selectAll`} className="font-normal cursor-pointer">
                            {element.selectAllText || "Select All"}
                        </Label>
                    </div>
                )}

                {choices.map((choice: any, index: number) => {
                    const itemValue = typeof choice === 'object' ? choice.value : choice;
                    const text = typeof choice === 'object' ? choice.text : choice;
                    const id = `${element.name}-${index}`;
                    const isChecked = Array.isArray(value) && value.includes(itemValue);

                    return (
                        <div key={itemValue} className="flex items-center space-x-2">
                            <Checkbox
                                id={id}
                                disabled={readOnly}
                                checked={isChecked}
                                onCheckedChange={(checked) => handleCheckedChange(checked as boolean, itemValue)}
                            />
                            <Label htmlFor={id} className="font-normal cursor-pointer">
                                {text}
                            </Label>
                        </div>
                    );
                })}

                {showOtherItem && (
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id={`${element.name}-other`}
                            disabled={readOnly}
                            checked={Array.isArray(value) && value.includes('other')}
                            onCheckedChange={(checked) => handleCheckedChange(checked as boolean, 'other')}
                        />
                        <Label htmlFor={`${element.name}-other`} className="font-normal cursor-pointer">
                            {element.otherText || "Other (describe)"}
                        </Label>
                    </div>
                )}

                {showNoneItem && (
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id={`${element.name}-none`}
                            disabled={readOnly}
                            checked={Array.isArray(value) && value.includes('none')}
                            onCheckedChange={(checked) => handleCheckedChange(checked as boolean, 'none')}
                        />
                        <Label htmlFor={`${element.name}-none`} className="font-normal cursor-pointer">
                            {element.noneText || "None"}
                        </Label>
                    </div>
                )}
            </div>
        );
    };

    if (titleLocation === 'hidden') {
        return (
            <div className="space-y-3">
                {renderDescription()}
                {renderOptions()}
                {error && <p className="text-sm text-destructive mt-1">{error}</p>}
            </div>
        );
    }

    if (titleLocation === 'left') {
        return (
            <div className="space-y-3">
                <div className="flex gap-4 items-start">
                    {renderLabel()}
                    <div className="flex-1">
                        {renderOptions()}
                        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
                    </div>
                </div>
                {renderDescription()}
            </div>
        );
    }

    if (titleLocation === 'bottom') {
        return (
            <div className="space-y-3">
                {renderDescription()}
                {renderOptions()}
                {renderLabel()}
                {error && <p className="text-sm text-destructive mt-1">{error}</p>}
            </div>
        );
    }

    // Default (top)
    return (
        <div className="space-y-3">
            {renderLabel()}
            {renderDescription()}
            {renderOptions()}
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>
    );
};
