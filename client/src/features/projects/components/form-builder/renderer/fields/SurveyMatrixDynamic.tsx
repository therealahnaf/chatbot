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
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface SurveyMatrixDynamicProps {
    element: any;
}

export const SurveyMatrixDynamic: React.FC<SurveyMatrixDynamicProps> = ({ element }) => {
    // Mock rows for preview
    const rowCount = element.rowCount || 2;
    const rows = Array.from({ length: rowCount }, (_, i) => ({ value: i + 1, text: `Row ${i + 1}` }));

    const renderCell = (column: any, _rowIndex: number) => {
        const cellType = column.cellType || element.cellType || 'text'; // Default to text for dynamic matrix usually

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

        if (cellType === 'checkbox') {
            // Simple checkbox implementation for matrix cell
            return <Input type="checkbox" className="h-4 w-4" disabled={element.readOnly} />;
        }

        return <div className="text-muted-foreground text-sm">Unsupported: {cellType}</div>;
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
                            {(element.columns || []).map((col: any) => (
                                <TableHead key={col.name} className="min-w-[150px]">
                                    {col.title || col.name}
                                </TableHead>
                            ))}
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((_row, rowIndex) => (
                            <TableRow key={rowIndex}>
                                {(element.columns || []).map((col: any) => (
                                    <TableCell key={col.name}>
                                        {renderCell(col, rowIndex)}
                                    </TableCell>
                                ))}
                                <TableCell>
                                    <Button variant="ghost" size="icon" disabled={element.readOnly}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <Button variant="outline" size="sm" className="mt-2" disabled={element.readOnly}>
                <Plus className="h-4 w-4 mr-2" />
                {element.addRowText || "Add Row"}
            </Button>
        </div>
    );
};
