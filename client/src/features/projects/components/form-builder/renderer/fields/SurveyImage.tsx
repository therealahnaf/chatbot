import React from 'react';
import { cn } from '@/lib/utils';

interface SurveyImageProps {
    element: any;
}

export const SurveyImage: React.FC<SurveyImageProps> = ({ element }) => {
    return (
        <div className={cn("flex", {
            "justify-start": element.imageFit === "contain", // Simplify alignment for now
            "justify-center": element.imageFit === "cover",
        })}>
            <img
                src={element.imageLink}
                alt={element.altText || element.name}
                style={{
                    width: element.imageWidth ? `${element.imageWidth}px` : 'auto',
                    height: element.imageHeight ? `${element.imageHeight}px` : 'auto',
                    objectFit: element.imageFit || 'contain',
                }}
                className="max-w-full h-auto"
            />
        </div>
    );
};
