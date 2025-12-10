import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { getComponentForType } from '../utils/schema-mapper';

interface SurveyPanelDynamicProps {
    element: any;
}

export const SurveyPanelDynamic: React.FC<SurveyPanelDynamicProps> = ({ element }) => {
    // Mock panels for preview
    const panelCount = element.panelCount || 1;
    const panels = Array.from({ length: panelCount }, (_, i) => i);

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <Label>
                    {element.title || element.name}
                    {element.isRequired && <span className="text-destructive ml-1">*</span>}
                </Label>
                {element.description && (
                    <p className="text-sm text-muted-foreground">{element.description}</p>
                )}
            </div>

            {panels.map((index) => (
                <Card key={index} className="relative border-dashed">
                    <div className="absolute right-2 top-2 z-10">
                        <Button variant="ghost" size="icon" disabled={element.readOnly}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-medium">
                            {element.templateTitle ? `${element.templateTitle} ${index + 1}` : `Panel ${index + 1}`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {(element.templateElements || element.elements || []).map((child: any) => {
                                const Component = getComponentForType(child.type);
                                if (!Component) return null;

                                // We don't make children draggable inside a dynamic panel preview for now
                                // to avoid nesting sortables complexity in this view
                                return (
                                    <div key={child.name} className="p-2 border rounded-md bg-background">
                                        <Component element={child} />
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            ))}

            <Button variant="outline" size="sm" disabled={element.readOnly}>
                <Plus className="h-4 w-4 mr-2" />
                {element.panelAddText || "Add Panel"}
            </Button>
        </div>
    );
};
