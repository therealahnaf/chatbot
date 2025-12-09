import React from 'react';

interface SurveyEmptyProps {
    element: any;
}

export const SurveyEmpty: React.FC<SurveyEmptyProps> = ({ element: _element }) => {
    return (
        <div className="h-4 w-full" /> // Just a spacer
    );
};
