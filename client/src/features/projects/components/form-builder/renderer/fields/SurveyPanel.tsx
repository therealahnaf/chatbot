import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormElementWrapper } from '../FormElementWrapper';
import { getComponentForType } from '../utils/schema-mapper';

interface SurveyPanelProps {
    element: any;
    onSelect?: (element: any) => void;
    selectedId?: string;
}

export const SurveyPanel: React.FC<SurveyPanelProps> = ({ element, onSelect, selectedId }) => {
    return (
        <Card className="mb-4">
            {(element.title || element.name) && (
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">
                        {element.title || element.name}
                    </CardTitle>
                    {element.description && (
                        <p className="text-sm text-muted-foreground">{element.description}</p>
                    )}
                </CardHeader>
            )}
            <CardContent>
                <div className="space-y-4">
                    {(element.elements || []).map((child: any) => {
                        const Component = getComponentForType(child.type);
                        if (!Component) return null;

                        return (
                            <FormElementWrapper
                                key={child.name}
                                id={child.name}
                                element={child}
                                isSelected={selectedId === child.name}
                                onSelect={onSelect}
                            >
                                <Component element={child} />
                            </FormElementWrapper>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};
