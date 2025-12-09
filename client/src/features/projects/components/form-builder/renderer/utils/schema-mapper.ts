import React from 'react';
import { SurveyText } from '../fields/SurveyText';
import { SurveyComment } from '../fields/SurveyComment';
import { SurveyCheckbox } from '../fields/SurveyCheckbox';
import { SurveyRadiogroup } from '../fields/SurveyRadiogroup';
import { SurveyDropdown } from '../fields/SurveyDropdown';
import { SurveyBoolean } from '../fields/SurveyBoolean';
import { SurveyRating } from '../fields/SurveyRating';
import { SurveyPanel } from '../fields/SurveyPanel';

import { SurveyHtml } from '../fields/SurveyHtml';
import { SurveyImage } from '../fields/SurveyImage';
import { SurveyEmpty } from '../fields/SurveyEmpty';
import { SurveyExpression } from '../fields/SurveyExpression';
import { SurveyFile } from '../fields/SurveyFile';
import { SurveySignaturePad } from '../fields/SurveySignaturePad';
import { SurveyMatrix } from '../fields/SurveyMatrix';

import { SurveyMatrixDropdown } from '../fields/SurveyMatrixDropdown';
import { SurveyMatrixDynamic } from '../fields/SurveyMatrixDynamic';
import { SurveyPanelDynamic } from '../fields/SurveyPanelDynamic';
import { SurveyImagePicker } from '../fields/SurveyImagePicker';
import { SurveyTagBox } from '../fields/SurveyTagBox';
import { SurveyRanking } from '../fields/SurveyRanking';
import { SurveyButtonGroup } from '../fields/SurveyButtonGroup';
import { SurveySlider } from '../fields/SurveySlider';
import { SurveyMultipleText } from '../fields/SurveyMultipleText';
import { SurveyFlowPanel } from '../fields/SurveyFlowPanel';

export const getComponentForType = (type: string): React.FC<any> | null => {
    switch (type) {
        case 'text':
            return SurveyText;
        case 'comment':
            return SurveyComment;
        case 'checkbox':
            return SurveyCheckbox;
        case 'radiogroup':
            return SurveyRadiogroup;
        case 'dropdown':
            return SurveyDropdown;
        case 'boolean':
            return SurveyBoolean;
        case 'rating':
            return SurveyRating;
        case 'panel':
            return SurveyPanel;
        case 'flowpanel':
            return SurveyFlowPanel;
        case 'html':
            return SurveyHtml;
        case 'image':
            return SurveyImage;
        case 'empty':
            return SurveyEmpty;
        case 'expression':
            return SurveyExpression;
        case 'file':
            return SurveyFile;
        case 'signaturepad':
            return SurveySignaturePad;
        case 'matrix':
            return SurveyMatrix;
        case 'matrixdropdown':
            return SurveyMatrixDropdown;
        case 'matrixdynamic':
            return SurveyMatrixDynamic;
        case 'paneldynamic':
            return SurveyPanelDynamic;
        case 'imagepicker':
            return SurveyImagePicker;
        case 'tagbox':
            return SurveyTagBox;
        case 'ranking':
            return SurveyRanking;
        case 'buttongroup':
            return SurveyButtonGroup;
        case 'slider':
            return SurveySlider;
        case 'multipletext':
            return SurveyMultipleText;
        default:
            console.warn(`Component for type "${type}" not implemented yet.`);
            return null;
    }
};
