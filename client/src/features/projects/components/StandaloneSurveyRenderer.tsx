import React, { useMemo } from 'react';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
// Import SurveyJS styles - this is a library dependency, not a project file dependency
import 'survey-core/survey-core.min.css';
import { LayeredLightPanelless } from "survey-core/themes";

/**
 * Props for the StandaloneSurveyRenderer
 */
interface StandaloneSurveyRendererProps {
    /**
     * The SurveyJS JSON schema defining the form.
     * This is the only required data to render the form.
     */
    json: any;

    /**
     * Optional callback when the form is submitted
     */
    onComplete?: (data: any) => void;
}

/**
 * StandaloneSurveyRenderer
 * 
 * A completely self-contained component that renders a form based on a JSON schema.
 * It has NO dependencies on other project files (stores, custom hooks, types, etc.).
 * It only relies on the external 'survey-react-ui' and 'survey-core' libraries.
 * 
 * Usage:
 * <StandaloneSurveyRenderer 
 *   json={mySurveyJson} 
 *   onComplete={(data) => console.log(data)} 
 * />
 */
export const StandaloneSurveyRenderer: React.FC<StandaloneSurveyRendererProps> = ({
    json,
    onComplete
}) => {
    // Create the SurveyJS Model. 
    // We use JSON.stringify(json) as the dependency to ensure the model is ONLY recreated
    // when the actual content changes, not just when the object reference changes.
    // This prevents the form from resetting (and losing focus) if the parent re-renders.
    const survey = useMemo(() => {
        const model = new Model(json);

        // Explicitly ensure the mode is set to edit (interactive)
        model.mode = 'edit';

        // Attach the onComplete handler if provided
        if (onComplete) {
            model.onComplete.add((sender: any) => {
                onComplete(sender.data);
            });
        }

        model.applyTheme(LayeredLightPanelless);

        return model;
    }, [JSON.stringify(json), onComplete]);

    // Render the Survey component from the library
    return (
        <div style={{ width: '100%', height: '100%', background: '#fff' }}>
            <Survey model={survey} />
        </div>
    );
};

export default StandaloneSurveyRenderer;
