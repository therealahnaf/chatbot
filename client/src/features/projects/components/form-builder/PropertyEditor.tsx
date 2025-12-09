import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PropertyEditorProps {
    element: any;
    onUpdate: (updates: any) => void;
    onDelete?: () => void;
}

export const PropertyEditor: React.FC<PropertyEditorProps> = ({ element, onUpdate, onDelete }) => {
    if (!element) {
        return (
            <div className="p-4 text-center text-muted-foreground text-sm">
                Select an element to edit its properties.
            </div>
        );
    }

    const handleChange = (key: string, value: any) => {
        onUpdate({ ...element, [key]: value });
    };

    const handleChoiceChange = (index: number, key: string, value: string) => {
        const newChoices = [...(element.choices || [])];
        // Ensure choice is an object if it's currently a string (SurveyJS supports both, but we prefer objects for editing)
        if (typeof newChoices[index] === 'string') {
            newChoices[index] = { value: newChoices[index], text: newChoices[index] };
        }
        newChoices[index] = { ...newChoices[index], [key]: value };
        handleChange('choices', newChoices);
    };

    const addChoiceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const addChoice = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (addChoiceTimeoutRef.current) return;

        addChoiceTimeoutRef.current = setTimeout(() => {
            addChoiceTimeoutRef.current = null;
        }, 300);

        const newChoices = [...(element.choices || [])];
        // Use a random value to ensure uniqueness even if called multiple times rapidly
        const val = `item_${Math.floor(Math.random() * 100000)}`;
        newChoices.push({ value: val, text: 'New Item' });
        handleChange('choices', newChoices);
    };

    const removeChoice = (index: number) => {
        const newChoices = [...(element.choices || [])];
        newChoices.splice(index, 1);
        handleChange('choices', newChoices);
    };

    return (
        <div className="flex flex-col h-full border-l bg-muted">
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {/* Common Properties */}
                    <div className="space-y-4">

                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={element.title || ''}
                                onChange={(e) => handleChange('title', e.target.value)}
                                className="bg-white"
                            />
                        </div>
                        {element.type !== 'survey' && (
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={element.description || ''}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    className="min-h-[80px] bg-white"
                                />
                            </div>
                        )}
                        {element.type !== 'survey' && (
                            <div className="space-y-2">
                                <Label htmlFor="visibleIf">Visible If (Expression)</Label>
                                <Input
                                    id="visibleIf"
                                    value={element.visibleIf || ''}
                                    onChange={(e) => handleChange('visibleIf', e.target.value)}
                                    className="bg-white"
                                    placeholder="{question} = 'value'"
                                />
                            </div>
                        )}
                        {element.type !== 'survey' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="titleLocation">Title Location</Label>
                                    <Select
                                        value={element.titleLocation || 'default'}
                                        onValueChange={(val) => handleChange('titleLocation', val)}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default">Default</SelectItem>
                                            <SelectItem value="top">Top</SelectItem>
                                            <SelectItem value="bottom">Bottom</SelectItem>
                                            <SelectItem value="left">Left</SelectItem>
                                            <SelectItem value="hidden">Hidden</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="isRequired">Is Required?</Label>
                                    <Switch
                                        id="isRequired"
                                        checked={element.isRequired || false}
                                        onCheckedChange={(checked) => handleChange('isRequired', checked)}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Type Specific Properties */}
                    {(element.type === 'text' || element.type === 'comment') && (
                        <div className="space-y-4 border-t pt-4">
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Text Options</h4>
                            <div className="space-y-2">
                                <Label htmlFor="placeholder">Placeholder</Label>
                                <Input
                                    id="placeholder"
                                    value={element.placeholder || ''}
                                    onChange={(e) => handleChange('placeholder', e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxLength">Max Length</Label>
                                <Input
                                    id="maxLength"
                                    type="number"
                                    value={element.maxLength || ''}
                                    onChange={(e) => handleChange('maxLength', parseInt(e.target.value) || undefined)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="showNumber">Show Number</Label>
                                <Switch
                                    id="showNumber"
                                    checked={element.showNumber !== false}
                                    onCheckedChange={(checked) => handleChange('showNumber', checked)}
                                />
                            </div>
                            {element.type === 'text' && (
                                <div className="space-y-2">
                                    <Label htmlFor="inputType">Input Type</Label>
                                    <Select
                                        value={element.inputType || 'text'}
                                        onValueChange={(val) => handleChange('inputType', val)}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="text">Text</SelectItem>
                                            <SelectItem value="number">Number</SelectItem>
                                            <SelectItem value="email">Email</SelectItem>
                                            <SelectItem value="date">Date</SelectItem>
                                            <SelectItem value="password">Password</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    )}

                    {(element.type === 'dropdown' || element.type === 'radiogroup' || element.type === 'checkbox' || element.type === 'ranking') && (
                        <div className="space-y-4 border-t pt-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold uppercase text-muted-foreground">Choices</h4>
                                <Button type="button" variant="ghost" size="sm" onClick={addChoice} className="h-6 px-2">
                                    <Plus size={14} /> Add
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {(element.choices || []).map((choice: any, idx: number) => {
                                    const choiceText = typeof choice === 'object' ? choice.text : choice;
                                    const choiceValue = typeof choice === 'object' ? choice.value : choice;
                                    return (
                                        <div key={idx} className="flex gap-2 items-start">
                                            <div className="flex-1 flex gap-2">
                                                <div className="flex-1">
                                                    <Input
                                                        className="h-7 text-xs bg-white"
                                                        placeholder="Value"
                                                        value={choiceValue}
                                                        onChange={(e) => handleChoiceChange(idx, 'value', e.target.value)}
                                                        title="Value"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <Input
                                                        className="h-7 text-xs bg-white"
                                                        placeholder="Text"
                                                        value={choiceText}
                                                        onChange={(e) => handleChoiceChange(idx, 'text', e.target.value)}
                                                        title="Text"
                                                    />
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => removeChoice(idx)}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    );
                                })}
                                {(!element.choices || element.choices.length === 0) && (
                                    <div className="text-xs text-muted-foreground italic">No choices defined.</div>
                                )}
                            </div>

                            {/* Radiogroup Specific */}
                            {element.type === 'radiogroup' && (
                                <div className="space-y-4 border-t pt-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="showOtherItem">Show "Other" Option</Label>
                                        <Switch
                                            id="showOtherItem"
                                            checked={element.showOtherItem || false}
                                            onCheckedChange={(checked) => handleChange('showOtherItem', checked)}
                                        />
                                    </div>
                                    {element.showOtherItem && (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="otherText">"Other" Text</Label>
                                                <Input
                                                    id="otherText"
                                                    value={element.otherText || 'Other'}
                                                    onChange={(e) => handleChange('otherText', e.target.value)}
                                                    className="bg-white"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="otherPlaceholder">"Other" Placeholder</Label>
                                                <Input
                                                    id="otherPlaceholder"
                                                    value={element.otherPlaceholder || ''}
                                                    onChange={(e) => handleChange('otherPlaceholder', e.target.value)}
                                                    className="bg-white"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Dropdown Specific */}
                            {element.type === 'dropdown' && (
                                <div className="space-y-4 border-t pt-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="allowClear">Allow Clear</Label>
                                        <Switch
                                            id="allowClear"
                                            checked={element.allowClear || false}
                                            onCheckedChange={(checked) => handleChange('allowClear', checked)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {element.type === 'boolean' && (
                        <div className="space-y-4 border-t pt-4">
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Boolean Options</h4>
                            <div className="space-y-2">
                                <Label htmlFor="labelTrue">Label True</Label>
                                <Input
                                    id="labelTrue"
                                    value={element.labelTrue || ''}
                                    onChange={(e) => handleChange('labelTrue', e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="labelFalse">Label False</Label>
                                <Input
                                    id="labelFalse"
                                    value={element.labelFalse || ''}
                                    onChange={(e) => handleChange('labelFalse', e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                        </div>
                    )}

                    {element.type === 'rating' && (
                        <div className="space-y-4 border-t pt-4">
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Rating Options</h4>
                            <div className="space-y-2">
                                <Label htmlFor="minRateDescription">Min Rate Description</Label>
                                <Input
                                    id="minRateDescription"
                                    value={element.minRateDescription || ''}
                                    onChange={(e) => handleChange('minRateDescription', e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxRateDescription">Max Rate Description</Label>
                                <Input
                                    id="maxRateDescription"
                                    value={element.maxRateDescription || ''}
                                    onChange={(e) => handleChange('maxRateDescription', e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                        </div>
                    )}

                    {element.type === 'matrix' && (
                        <div className="space-y-4 border-t pt-4">
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Matrix Options</h4>
                            <div className="space-y-2">
                                <Label htmlFor="columnMinWidth">Column Min Width</Label>
                                <Input
                                    id="columnMinWidth"
                                    value={element.columnMinWidth || ''}
                                    onChange={(e) => handleChange('columnMinWidth', e.target.value)}
                                    className="bg-white"
                                    placeholder="e.g. 40px"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rowTitleWidth">Row Title Width</Label>
                                <Input
                                    id="rowTitleWidth"
                                    value={element.rowTitleWidth || ''}
                                    onChange={(e) => handleChange('rowTitleWidth', e.target.value)}
                                    className="bg-white"
                                    placeholder="e.g. 300px"
                                />
                            </div>
                            {/* Matrix Columns and Rows editing would go here - simplified for now */}
                            <div className="text-xs text-muted-foreground">
                                Columns and Rows editing is supported via JSON for complex structures.
                            </div>
                        </div>
                    )}

                    {element.type === 'page' && (
                        <div className="space-y-4 border-t pt-4">
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Page Settings</h4>
                            <div className="space-y-2">
                                <Label htmlFor="name">Name (ID)</Label>
                                <Input
                                    id="name"
                                    value={element.name || ''}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={element.title || ''}
                                    onChange={(e) => handleChange('title', e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={element.description || ''}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    className="min-h-[80px] bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="visibleIf">Visible If (Expression)</Label>
                                <Input
                                    id="visibleIf"
                                    value={element.visibleIf || ''}
                                    onChange={(e) => handleChange('visibleIf', e.target.value)}
                                    className="bg-white"
                                    placeholder="{question} = 'value'"
                                />
                            </div>
                        </div>
                    )}

                    {/* Survey Root Properties (when no type or type is survey) */}
                    {(!element.type || element.type === 'survey') && element.pages && (
                        <div className="space-y-4 border-t pt-4">
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Survey Settings</h4>
                            <div className="space-y-2">
                                <Label htmlFor="logo">Logo URL</Label>
                                <Input
                                    id="logo"
                                    value={element.logo || ''}
                                    onChange={(e) => handleChange('logo', e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="logoHeight">Logo Height</Label>
                                <Input
                                    id="logoHeight"
                                    value={element.logoHeight || ''}
                                    onChange={(e) => handleChange('logoHeight', e.target.value)}
                                    className="bg-white"
                                    placeholder="e.g. 60px"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="showProgressBar">Show Progress Bar</Label>
                                <Switch
                                    id="showProgressBar"
                                    checked={element.showProgressBar || false}
                                    onCheckedChange={(checked) => handleChange('showProgressBar', checked)}
                                />
                            </div>
                            {element.showProgressBar && (
                                <div className="space-y-2">
                                    <Label htmlFor="progressBarType">Progress Bar Type</Label>
                                    <Select
                                        value={element.progressBarType || 'pages'}
                                        onValueChange={(val) => handleChange('progressBarType', val)}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pages">Pages</SelectItem>
                                            <SelectItem value="questions">Questions</SelectItem>
                                            <SelectItem value="requiredQuestions">Required Questions</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="headerView">Header View</Label>
                                <Select
                                    value={element.headerView || 'basic'}
                                    onValueChange={(val) => handleChange('headerView', val)}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="basic">Basic</SelectItem>
                                        <SelectItem value="advanced">Advanced</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="widthMode">Width Mode</Label>
                                <Select
                                    value={element.widthMode || 'auto'}
                                    onValueChange={(val) => handleChange('widthMode', val)}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">Auto</SelectItem>
                                        <SelectItem value="static">Static</SelectItem>
                                        <SelectItem value="responsive">Responsive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {element.widthMode === 'static' && (
                                <div className="space-y-2">
                                    <Label htmlFor="width">Width</Label>
                                    <Input
                                        id="width"
                                        value={element.width || ''}
                                        onChange={(e) => handleChange('width', e.target.value)}
                                        className="bg-white"
                                        placeholder="e.g. 800px"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="p-4 border-t bg-muted/20">
                <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={onDelete}
                >
                    <Trash2 size={16} />
                    Delete Element
                </Button>
            </div>
        </div>
    );
};
