import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface SurveyMatrixDropdownProps {
    element: any;
}

export const SurveyMatrixDropdown: React.FC<SurveyMatrixDropdownProps> = ({ element }) => {
    const renderCell = (column: any, _row: any) => {
        const cellType = column.cellType || element.cellType || 'dropdown';


        if (cellType === 'text') {
            return <Input placeholder={column.placeholder} disabled={element.readOnly} />;
        }

        if (cellType === 'dropdown') {
            return (
                <Select disabled={element.readOnly}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        {(column.choices || element.choices || []).map((choice: any) => {
                            const val = typeof choice === 'object' ? choice.value : choice;
                            const text = typeof choice === 'object' ? choice.text : choice;
                            return (
                                <SelectItem key={val} value={String(val)}>{text}</SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            );
        }

        return <div className="text-muted-foreground text-sm">Unsupported cell type: {cellType}</div>;
    };

    return (
        <div className="space-y-3">
            <Label>
                {element.title || element.name}
                {element.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {element.description && (
                <p className="text-sm text-muted-foreground">{element.description}</p>
            )}
            <div className="border rounded-md overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[150px]"></TableHead>
                            {(element.columns || []).map((col: any) => (
                                <TableHead key={col.name} className="min-w-[150px]">
                                    {col.title || col.name}
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
                                {(element.columns || []).map((col: any) => (
                                    <TableCell key={col.name}>
                                        {renderCell(col, row)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
