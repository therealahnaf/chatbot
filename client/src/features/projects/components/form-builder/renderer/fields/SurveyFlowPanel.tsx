import React from 'react';
import { FormElementWrapper } from '../FormElementWrapper';
import { getComponentForType } from '../utils/schema-mapper';

interface SurveyFlowPanelProps {
    element: any;
    onSelect?: (element: any) => void;
    selectedId?: string;
}

export const SurveyFlowPanel: React.FC<SurveyFlowPanelProps> = ({ element, onSelect, selectedId }) => {
    return (
        <div className="mb-4">
            {(element.title || element.name) && (
                <div className="mb-2">
                    <h3 className="text-lg font-medium">
                        {element.title || element.name}
                    </h3>
                    {element.description && (
                        <p className="text-sm text-muted-foreground">{element.description}</p>
                    )}
                </div>
            )}
            <div className="flex flex-wrap gap-4">
                {(element.elements || []).map((child: any) => {
                    const Component = getComponentForType(child.type);
                    if (!Component) return null;

                    return (
                        <div key={child.name} className="flex-1 min-w-[200px]">
                            <FormElementWrapper
                                id={child.name}
                                element={child}
                                isSelected={selectedId === child.name}
                                onSelect={onSelect}
                            >
                                <Component element={child} />
                            </FormElementWrapper>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
