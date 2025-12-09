import React from 'react';

interface SurveyHtmlProps {
    element: any;
}

export const SurveyHtml: React.FC<SurveyHtmlProps> = ({ element }) => {
    return (
        <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: element.html || '' }}
        />
    );
};
