import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface SurveyMatrixProps {
    element: any;
}

export const SurveyMatrix: React.FC<SurveyMatrixProps> = ({ element }) => {
    return (
        <div className="space-y-3">
            <Label>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead style={{ width: element.rowTitleWidth || "200px" }}></TableHead>
                            {(element.columns || []).map((col: any) => (
                                <TableHead
                                    key={col.value || col}
                                    className="text-center"
                                    style={{ minWidth: element.columnMinWidth }}
                                >
                                    {col.text || col.value || col}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(element.rows || []).map((row: any) => (
                            <TableRow key={row.value || row}>
                                <TableCell className="font-medium">
                                    {row.text || row.value || row}
                                </TableCell>
                                {(element.columns || []).map((col: any) => {
                                    const colValue = col.value || col;
                                    const rowValue = row.value || row;
                                    const id = `${element.name}-${rowValue}-${colValue}`;

                                    return (
                                        <TableCell key={colValue} className="text-center">
                                            <div className="flex justify-center">
                                                <RadioGroupItem value={String(colValue)} id={id} />
                                            </div>
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
