'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface ContractPreviewProps {
  content: string;
  variables: Array<{
    name: string;
    value: any;
    type: string;
  }>;
}

// Replace variables with their values in content (for preview)
const replaceVariablesWithValues = (htmlContent: string, vars: ContractPreviewProps['variables']): string => {
  let result = htmlContent;
  
  // Create a map of variable names to their formatted values
  const variableMap = new Map<string, string>();
  
  vars.forEach((variable) => {
    if (!variable.name) return;
    
    let formattedValue = '';
    
    if (variable.value !== null && variable.value !== undefined) {
      switch (variable.type) {
        case 'date':
          if (variable.value instanceof Date) {
            formattedValue = new Date(variable.value).toLocaleDateString('tr-TR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
          } else if (typeof variable.value === 'string') {
            const date = new Date(variable.value);
            if (!isNaN(date.getTime())) {
              formattedValue = date.toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });
            } else {
              formattedValue = String(variable.value);
            }
          } else {
            formattedValue = String(variable.value);
          }
          break;
        
        case 'number':
          formattedValue = new Intl.NumberFormat('tr-TR').format(Number(variable.value));
          break;
        
        case 'currency':
          const numValue = Number(variable.value);
          formattedValue = new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
          }).format(numValue);
          break;
        
        case 'percentage':
          const percentValue = Number(variable.value);
          formattedValue = `${percentValue}%`;
          break;
        
        case 'boolean':
          const boolValue = String(variable.value).toLowerCase();
          formattedValue = (boolValue === 'true' || boolValue === '1' || boolValue === 'yes' || boolValue === 'evet') ? 'Evet' : 'Hayır';
          break;
        
        default:
          formattedValue = String(variable.value);
      }
    } else {
      formattedValue = '[Değer atanmamış]';
    }
    
    variableMap.set(variable.name, formattedValue);
  });
  
  // Replace all {{VariableName}} patterns with their values
  const variablePattern = /\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g;
  result = result.replace(variablePattern, (match, varName) => {
    const value = variableMap.get(varName);
    return value !== undefined ? value : match; // Keep original if variable not found
  });
  
  return result;
};

export default function ContractPreview({ content, variables }: ContractPreviewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'original'>('preview');

  const displayContent = viewMode === 'preview' 
    ? replaceVariablesWithValues(content, variables)
    : content;

  return (
    <Card className="border border-gray-200/80 dark:border-[#324d67]/50 bg-white dark:bg-[#192633] shadow-sm rounded-xl">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white font-display">Sözleşme İçeriği</CardTitle>
          <RadioGroup 
            value={viewMode} 
            onValueChange={(value) => setViewMode(value as 'preview' | 'original')}
            className="flex items-center gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="preview" id="preview" />
              <Label htmlFor="preview" className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 font-display">
                Önizleme
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="original" id="original" />
              <Label htmlFor="original" className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 font-display">
                Orijinal
              </Label>
            </div>
          </RadioGroup>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="prose dark:prose-invert max-w-none p-6 bg-gray-50 dark:bg-[#1f2e3d] rounded-lg border border-gray-200/50 dark:border-[#324d67]/50"
          dangerouslySetInnerHTML={{ __html: displayContent }}
        />
      </CardContent>
    </Card>
  );
}

