'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { TrackChanges } from '@/lib/tiptap/extensions/TrackChanges';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ContractVariable {
  _id?: string;
  name: string;
  value: string | number | Date;
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean';
  taggedText: string;
  isComplianceTracked?: boolean;
}

interface GlobalVariable {
  _id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean';
  defaultValue?: string | number | Date;
  description?: string;
  category?: string;
  metadata?: {
    unit?: string;
    format?: string;
    validationRules?: Record<string, any>;
  };
}

interface AdvancedContractEditorProps {
  contractId?: string; // Optional for new contracts
  initialContent?: string;
  userId: string;
  userName: string;
  onSave?: (content: string, changeSummary?: string) => void;
  onVariableCreate?: (variable: Omit<ContractVariable, '_id'>) => Promise<void>;
  onContentChange?: (content: string) => void; // Callback for content changes (useful for new contracts)
  readOnly?: boolean;
  setContentKey?: string; // Key to trigger content update from parent
}

// Custom extension for variable markers - simplified for now
// We'll use a simpler approach with text marks

export default function AdvancedContractEditor({
  contractId,
  initialContent,
  userId,
  userName,
  onSave,
  onVariableCreate,
  onContentChange,
  readOnly = false,
  setContentKey,
}: AdvancedContractEditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [variables, setVariables] = useState<ContractVariable[]>([]);
  const [globalVariables, setGlobalVariables] = useState<GlobalVariable[]>([]);
  const [showVariableDialog, setShowVariableDialog] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [variableForm, setVariableForm] = useState({
    name: '',
    type: 'text' as ContractVariable['type'],
    value: '',
    isComplianceTracked: false,
  });
  const [showVariablesPanel, setShowVariablesPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<'contract' | 'global'>('contract');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVariableName, setSelectedVariableName] = useState<string | null>(null);
  const [showAddVariableDialog, setShowAddVariableDialog] = useState(false);
  const [variableToAdd, setVariableToAdd] = useState<{ name: string; text: string } | null>(null);
  const [showNewVariableDialog, setShowNewVariableDialog] = useState(false);
  const [newVariableForm, setNewVariableForm] = useState({
    name: '',
    type: 'text' as ContractVariable['type'],
    value: '',
    isComplianceTracked: false,
  });
  const [showEditVariableDialog, setShowEditVariableDialog] = useState(false);
  const [variableToEdit, setVariableToEdit] = useState<ContractVariable | null>(null);
  const [editVariableForm, setEditVariableForm] = useState({
    name: '',
    type: 'text' as ContractVariable['type'],
    value: '',
    isComplianceTracked: false,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [showChangeSummaryDialog, setShowChangeSummaryDialog] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [showTrackChanges, setShowTrackChanges] = useState(false); // Varsayılan olarak kapalı
  const [trackChangesEnabled, setTrackChangesEnabled] = useState(true);
  const [changes, setChanges] = useState<any[]>([]);
  const [userColor] = useState(() => {
    // Generate a consistent color for the user
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16', // lime
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  });

  // Load existing variables
  useEffect(() => {
    if (!contractId) return;
    
    const loadVariables = async () => {
      try {
        const response = await fetch(`/api/variables?contractId=${contractId}`);
        if (!response.ok) {
          console.error('Failed to fetch variables:', response.statusText);
          return;
        }
        const data = await response.json();
        if (data.variables && Array.isArray(data.variables)) {
          setVariables(data.variables);
        } else {
          console.warn('Unexpected variables response format:', data);
        }
      } catch (err) {
        console.error('Error loading variables:', err);
      }
    };
    
    loadVariables();
  }, [contractId]);

  // Create a stable set of variable names for efficient lookup
  const variableNamesSet = useMemo(() => {
    return new Set(variables.filter(v => v._id).map(v => v.name));
  }, [variables]);

  // Load global variables
  useEffect(() => {
    const loadGlobalVariables = async () => {
      try {
        const response = await fetch('/api/global-variables');
        if (!response.ok) {
          console.error('Failed to fetch global variables:', response.statusText);
          return;
        }
        const data = await response.json();
        if (data.variables && Array.isArray(data.variables)) {
          setGlobalVariables(data.variables);
        }
      } catch (err) {
        console.error('Error loading global variables:', err);
      }
    };
    
    loadGlobalVariables();
  }, []);

  // Extract variables from content ({{VariableName}} format) and merge with loaded variables
  useEffect(() => {
    if (!initialContent) return;
    
    const variablePattern = /\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g;
    const extractedVariables: Map<string, ContractVariable> = new Map();
    let match;
    
    while ((match = variablePattern.exec(initialContent)) !== null) {
      const variableName = match[1];
      if (!extractedVariables.has(variableName)) {
        extractedVariables.set(variableName, {
          name: variableName,
          type: 'text',
          value: '',
          taggedText: `{{${variableName}}}`,
          isComplianceTracked: false,
        });
      }
    }
    
    // Merge extracted variables with loaded variables
    setVariables(prev => {
      const existingNames = new Set(prev.map(v => v.name));
      const newVars = Array.from(extractedVariables.values()).filter(v => !existingNames.has(v.name));
      return [...prev, ...newVars];
    });
  }, [initialContent]);

  // Store previous content to detect changes
  const [previousContent, setPreviousContent] = useState(initialContent || '');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      TrackChanges.configure({
        userId,
        userName,
        userColor,
        enabled: trackChangesEnabled,
        onTrackChange: (change) => {
          // Store change locally for display
          if (trackChangesEnabled) {
            setChanges((prev) => [...prev, {
              ...change,
              userId,
              userName,
              userColor,
              timestamp: new Date(),
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            }]);
          }
        },
      }),
    ],
    content: initialContent || '',
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[600px] p-6',
      },
    },
    onUpdate: ({ editor }) => {
      // Update previous content for next comparison
      // Track changes will be handled by the extension's ProseMirror plugin
      const content = editor.getHTML();
      setPreviousContent(content);
      
      // Notify parent component of content changes (useful for new contracts)
      if (onContentChange) {
        onContentChange(content);
      }
    },
    onSelectionUpdate: ({ editor }) => {
      // Check if selection contains a variable
      const { from, to } = editor.state.selection;
      if (from === to) return; // No selection
      
      const selectedText = editor.state.doc.textBetween(from, to);
      const variableMatch = selectedText.match(/\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/);
      if (variableMatch) {
        setSelectedVariableName(variableMatch[1]);
        setActiveTab('contract');
      }
    },
  });

  // Helper function to find variable at position
  const findVariableAtPosition = (pos: number): string | null => {
    if (!editor) return null;
    
    try {
      const { state } = editor.view;
      const start = Math.max(0, pos - 30);
      const end = Math.min(state.doc.content.size, pos + 30);
      const textAround = state.doc.textBetween(start, end);
      
      // Find variable pattern around position
      const variablePattern = /\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g;
      let match;
      let foundVariable: string | null = null;
      let closestDistance = Infinity;
      
      while ((match = variablePattern.exec(textAround)) !== null) {
        const varStart = start + match.index;
        const varEnd = varStart + match[0].length;
        
        // Check if position is within this variable
        if (pos >= varStart && pos <= varEnd) {
          foundVariable = match[1];
          break;
        }
        
        // Track closest variable
        const distance = Math.min(Math.abs(pos - varStart), Math.abs(pos - varEnd));
        if (distance < closestDistance && distance < 20) {
          closestDistance = distance;
          foundVariable = match[1];
        }
      }
      
      return foundVariable;
    } catch (error) {
      return null;
    }
  };

  // Handle clicks on variables in the editor
  useEffect(() => {
    if (!editor) return;

    // Single click handler removed - we only want double click to select variable in panel

    const handleEditorDoubleClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      // Get the editor's DOM element
      const editorElement = editor.view.dom;
      if (!editorElement.contains(target)) return;

      // Use TipTap's positionAt method to get the position
      try {
        const pos = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (!pos) return;
        
        const foundVariable = findVariableAtPosition(pos.pos);
        
        if (foundVariable) {
          // Check if variable exists in database
          const variableExists = variableNamesSet.has(foundVariable);
          
          if (variableExists) {
            // Variable exists, just select it in panel
            setSelectedVariableName(foundVariable);
            setActiveTab('contract');
          } else {
            // Variable doesn't exist, ask user if they want to add it
            const variableText = `{{${foundVariable}}}`;
            setVariableToAdd({ name: foundVariable, text: variableText });
            setShowAddVariableDialog(true);
          }
        }
      } catch (error) {
        // Fallback: check if clicked element contains a variable
        const clickedText = target.textContent || '';
        const clickedMatch = clickedText.match(/\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/);
        if (clickedMatch) {
          const varName = clickedMatch[1];
          const variableExists = variableNamesSet.has(varName);
          
          if (variableExists) {
            setSelectedVariableName(varName);
            setActiveTab('contract');
          } else {
            setVariableToAdd({ name: varName, text: clickedMatch[0] });
            setShowAddVariableDialog(true);
          }
        }
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener('dblclick', handleEditorDoubleClick, true);

    return () => {
      editorElement.removeEventListener('dblclick', handleEditorDoubleClick, true);
    };
  }, [editor, variableNamesSet]);

  // Load initial content
  useEffect(() => {
    if (!editor || !initialContent) return;
    
    const currentContent = editor.getHTML();
    if (!currentContent || currentContent === '<p></p>' || currentContent.trim() === '') {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  // Update content when setContentKey changes (for AI generation)
  useEffect(() => {
    if (!editor || !initialContent || !setContentKey) return;
    
    // Always update when setContentKey changes (triggered by AI generation)
    // This ensures AI-generated content is properly loaded into the editor
    editor.commands.setContent(initialContent);
    // Notify parent of content change to update editorContent state
    if (onContentChange) {
      // Use setTimeout to ensure editor content is updated before notifying
      setTimeout(() => {
        onContentChange(initialContent);
      }, 100);
    }
  }, [editor, initialContent, setContentKey, onContentChange]);

  // Handle text selection for variable tagging
  const handleTextSelection = useCallback(() => {
    if (!editor || readOnly) return;
    
    const { from, to } = editor.state.selection;
    if (from !== to) {
      const selectedText = editor.state.doc.textBetween(from, to);
      setSelectedText(selectedText);
      setShowVariableDialog(true);
      setVariableForm({
        name: '',
        type: 'text',
        value: selectedText,
        isComplianceTracked: false,
      });
    }
  }, [editor, readOnly]);

  // Update existing variable
  const handleUpdateVariable = async () => {
    if (!variableToEdit || !variableToEdit._id || !contractId) return;

    try {
      const response = await fetch(`/api/variables/${variableToEdit._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editVariableForm.type,
          value: editVariableForm.value,
          isComplianceTracked: editVariableForm.isComplianceTracked,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Variable update failed');
      }

      const data = await response.json();
      const updatedVariable = data.variable;

      // Reload variables
      const varsResponse = await fetch(`/api/variables?contractId=${contractId}`);
      const varsData = await varsResponse.json();
      if (varsData.variables) {
        setVariables(varsData.variables);
      }

      // Update selected variable if it's the one being edited
      if (selectedVariableName === variableToEdit.name) {
        setSelectedVariableName(updatedVariable.name);
      }

      setShowEditVariableDialog(false);
      setVariableToEdit(null);
      setEditVariableForm({
        name: '',
        type: 'text',
        value: '',
        isComplianceTracked: false,
      });
    } catch (error: any) {
      console.error('Error updating variable:', error);
      alert(error.message || 'Değişken güncellenirken bir hata oluştu.');
    }
  };

  // Create new variable from form (without selected text)
  const handleCreateNewVariable = async () => {
    if (!editor || !newVariableForm.name || !contractId) return;

    try {
      // Create variable via API
      const response = await fetch(`/api/contracts/${contractId}/variables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVariableForm.name,
          type: newVariableForm.type,
          value: newVariableForm.value || '',
          taggedText: `{{${newVariableForm.name}}}`,
          isComplianceTracked: newVariableForm.isComplianceTracked,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Variable creation failed');
      }

      const data = await response.json();
      const newVariable = data.variable;

      // Insert variable into editor at cursor position
      const variableText = `{{${newVariable.name}}}`;
      editor.chain().focus().insertContent(variableText).run();

      // Reload variables
      const varsResponse = await fetch(`/api/variables?contractId=${contractId}`);
      const varsData = await varsResponse.json();
      if (varsData.variables) {
        setVariables(varsData.variables);
      }

      // Select the newly added variable
      setSelectedVariableName(newVariable.name);
      setActiveTab('contract');
      setShowNewVariableDialog(false);
      setNewVariableForm({
        name: '',
        type: 'text',
        value: '',
        isComplianceTracked: false,
      });
    } catch (error: any) {
      console.error('Error creating variable:', error);
      alert(error.message || 'Değişken oluşturulurken bir hata oluştu.');
    }
  };

  // Create variable from selected text
  const handleCreateVariable = async () => {
    if (!editor || !selectedText || !variableForm.name) return;

    const { from, to } = editor.state.selection;
    
    try {
      // Create variable via API
      if (onVariableCreate) {
        await onVariableCreate({
          name: variableForm.name,
          type: variableForm.type,
          value: variableForm.value || selectedText,
          taggedText: selectedText,
          isComplianceTracked: variableForm.isComplianceTracked,
        });
      } else {
        const response = await fetch('/api/variables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractId,
            name: variableForm.name,
            type: variableForm.type,
            value: variableForm.value || selectedText,
            taggedText: selectedText,
            isComplianceTracked: variableForm.isComplianceTracked,
          }),
        });

        if (!response.ok) {
          throw new Error('Variable creation failed');
        }

        const data = await response.json();
        const newVariable = data.variable;

        // Mark selected text as variable in editor (using highlight for visual indication)
        // In a full implementation, we'd use a custom mark extension
        // For now, we'll just keep the text selected and show it in the variables panel

        // Reload variables
        const varsResponse = await fetch(`/api/variables?contractId=${contractId}`);
        const varsData = await varsResponse.json();
        if (varsData.variables) {
          setVariables(varsData.variables);
        }
      }

      setShowVariableDialog(false);
      setSelectedText('');
      setVariableForm({
        name: '',
        type: 'text',
        value: '',
        isComplianceTracked: false,
      });
    } catch (error) {
      console.error('Error creating variable:', error);
      alert('Değişken oluşturulurken bir hata oluştu.');
    }
  };

  // Replace variables with their values in content
  const replaceVariablesWithValues = (htmlContent: string, vars: ContractVariable[]): string => {
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

  const handleSave = async (summary?: string) => {
    if (!editor || !onSave) return;

    setIsSaving(true);
    try {
      const content = editor.getHTML();
      await onSave(content, summary);
      router.push(`/dashboard/contracts/${contractId}`);
      router.refresh();
    } catch (error) {
      console.error('Save error:', error);
      alert('Kaydetme sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSaving(false);
    }
  };

  const insertVariable = (variable: ContractVariable) => {
    if (!editor) return;
    
    const variableText = `{{${variable.name}}}`;
    editor.chain().focus().insertContent(variableText).run();
  };

  const selectVariableInEditor = (variableName: string) => {
    if (!editor) return;
    
    const searchText = `{{${variableName}}}`;
    const { state } = editor.view;
    const doc = state.doc;
    
    // Find the variable in the document
    let found = false;
    let foundStart = -1;
    let foundEnd = -1;
    
    doc.descendants((node, pos) => {
      if (found) return false;
      
      if (node.isText) {
        const nodeText = node.text || '';
        const variableIndex = nodeText.indexOf(searchText);
        
        if (variableIndex !== -1) {
          foundStart = pos + variableIndex + 1; // +1 for the opening tag
          foundEnd = foundStart + searchText.length - 1;
          found = true;
          return false;
        }
      }
      
      return true;
    });
    
    if (found && foundStart !== -1 && foundEnd !== -1) {
      try {
        // Select the variable in the editor
        editor.chain().focus().setTextSelection({ from: foundStart, to: foundEnd }).run();
        setSelectedVariableName(variableName);
      } catch (error) {
        console.error('Error selecting variable in editor:', error);
        // Fallback: just set the selected variable name
        setSelectedVariableName(variableName);
      }
    } else {
      // Variable not found, just highlight it in the panel
      setSelectedVariableName(variableName);
    }
  };

  const addGlobalVariableToContract = async (globalVar: GlobalVariable) => {
    if (!contractId) return;

    try {
      const response = await fetch(`/api/contracts/${contractId}/variables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          globalVariableId: globalVar._id,
          value: globalVar.defaultValue || '',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409) {
          // Variable already exists, just insert it
          insertVariable({
            name: globalVar.name,
            type: globalVar.type,
            value: globalVar.defaultValue || '',
            taggedText: `{{${globalVar.name}}}`,
          });
          return;
        }
        throw new Error(error.error || 'Failed to add global variable');
      }

      const data = await response.json();
      const newVariable = data.variable;

      // Reload contract variables
      const varsResponse = await fetch(`/api/variables?contractId=${contractId}`);
      const varsData = await varsResponse.json();
      if (varsData.variables) {
        setVariables(varsData.variables);
      }

      // Insert variable into editor
      insertVariable({
        _id: newVariable._id,
        name: newVariable.name,
        type: newVariable.type,
        value: newVariable.value,
        taggedText: newVariable.taggedText,
        isComplianceTracked: newVariable.isComplianceTracked,
      });

      // Switch to contract variables tab
      setActiveTab('contract');
    } catch (error) {
      console.error('Error adding global variable to contract:', error);
      alert('Global değişken sözleşmeye eklenirken bir hata oluştu.');
    }
  };

  if (!editor) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">Editör yükleniyor...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Main Editor */}
      <div className={`flex-1 ${!showVariablesPanel && !showTrackChanges ? 'w-full' : ''}`}>
        <Card>
          <CardContent className="p-0">
            {/* Toolbar */}
            {!readOnly && (
              <div className="border-b border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Text Formatting */}
                    <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-700 pr-2 mr-2">
                      <Button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        variant={editor.isActive('bold') ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Kalın (Ctrl+B)"
                      >
                        <span className="font-bold">B</span>
                      </Button>
                      <Button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        variant={editor.isActive('italic') ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="İtalik (Ctrl+I)"
                      >
                        <em>I</em>
                      </Button>
                    </div>

                    {/* Headings */}
                    <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-700 pr-2 mr-2">
                      <Button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8 px-2"
                        title="Başlık 1"
                      >
                        H1
                      </Button>
                      <Button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8 px-2"
                        title="Başlık 2"
                      >
                        H2
                      </Button>
                      <Button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8 px-2"
                        title="Başlık 3"
                      >
                        H3
                      </Button>
                    </div>

                    {/* Lists */}
                    <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-700 pr-2 mr-2">
                      <Button
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Madde İşareti"
                      >
                        <span className="material-symbols-outlined text-base">format_list_bulleted</span>
                      </Button>
                      <Button
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Numaralı Liste"
                      >
                        <span className="material-symbols-outlined text-base">format_list_numbered</span>
                      </Button>
                    </div>

                    {/* Variable Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={handleTextSelection}
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3"
                        title="Seçili Metni Değişken Olarak İşaretle"
                      >
                        <span className="material-symbols-outlined text-base mr-1">label</span>
                        Değişken Ekle
                      </Button>
                    </div>
                  </div>

                  {/* Preview, Versions, and Save Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        if (!editor) return;
                        const content = editor.getHTML();
                        const previewContent = replaceVariablesWithValues(content, variables);
                        setShowPreview(true);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <span className="material-symbols-outlined text-base mr-1">preview</span>
                      Önizleme
                    </Button>
                        {contractId && (
                          <Button
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/contracts/${contractId}/versions`);
                                if (!response.ok) {
                                  const errorData = await response.json().catch(() => ({}));
                                  throw new Error(errorData.error || `HTTP ${response.status}`);
                                }
                                const data = await response.json();
                                if (data.versions) {
                                  setVersions(data.versions);
                                  setShowVersions(true);
                                } else {
                                  setVersions([]);
                                  setShowVersions(true);
                                }
                              } catch (error: any) {
                                console.error('Error loading versions:', error);
                                alert(`Versiyonlar yüklenirken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`);
                              }
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <span className="material-symbols-outlined text-base mr-1">history</span>
                            Versiyonlar
                          </Button>
                        )}
                    <Button
                      onClick={() => setTrackChangesEnabled(!trackChangesEnabled)}
                      variant={trackChangesEnabled ? 'default' : 'outline'}
                      size="sm"
                      title={trackChangesEnabled ? 'Değişiklik takibini kapat' : 'Değişiklik takibini aç'}
                    >
                      <span className="material-symbols-outlined text-base mr-1">
                        {trackChangesEnabled ? 'edit_note' : 'edit_off'}
                      </span>
                      {trackChangesEnabled ? 'Takip Açık' : 'Takip Kapalı'}
                    </Button>
                    {trackChangesEnabled && (
                      <Button
                        onClick={() => setShowTrackChanges(!showTrackChanges)}
                        variant={showTrackChanges ? 'default' : 'outline'}
                        size="sm"
                        title={showTrackChanges ? 'Değişiklikler panelini kapat' : 'Değişiklikler panelini aç'}
                      >
                        <span className="material-symbols-outlined text-base mr-1">track_changes</span>
                        Değişiklikler {changes.length > 0 && `(${changes.length})`}
                      </Button>
                    )}
                    {onSave && (
                      <Button 
                        onClick={() => {
                          setChangeSummary('');
                          setShowChangeSummaryDialog(true);
                        }} 
                        disabled={isSaving} 
                        size="sm"
                      >
                        <span className="material-symbols-outlined text-base mr-1">
                          {isSaving ? 'hourglass_empty' : 'save'}
                        </span>
                        {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Editor Content */}
            <div className="relative">
              <EditorContent editor={editor} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variables Panel */}
      {showVariablesPanel && (
        <div className="w-80 flex-shrink-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Değişkenler</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowVariablesPanel(false)}
                  className="h-8 w-8 p-0"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'contract' | 'global')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="contract">Sözleşme</TabsTrigger>
                  <TabsTrigger value="global">Global</TabsTrigger>
                </TabsList>
                
                <TabsContent value="contract" className="mt-3">
                  {/* Add New Variable Button */}
                  {!readOnly && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mb-3"
                      onClick={() => {
                        setNewVariableForm({
                          name: '',
                          type: 'text',
                          value: '',
                          isComplianceTracked: false,
                        });
                        setShowNewVariableDialog(true);
                      }}
                    >
                      <span className="material-symbols-outlined text-base mr-2">add</span>
                      Yeni Değişken Ekle
                    </Button>
                  )}
              {variables.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Henüz değişken yok. Metni seçip "Değişken Ekle" butonuna tıklayarak değişken oluşturabilirsiniz.
                </p>
              ) : (
                <>
                  {variables.map((variable, index) => {
                    const isFromContent = !variable._id; // Variables without _id are extracted from content
                    return (
                      <DropdownMenu key={variable._id || `extracted-${variable.name}-${index}`}>
                        <DropdownMenuTrigger asChild>
                          <div
                            className={`p-3 rounded-lg border ${
                              selectedVariableName === variable.name
                                ? 'border-primary dark:border-primary bg-primary/10 dark:bg-primary/20 ring-2 ring-primary/50'
                                : isFromContent 
                                ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/10' 
                                : 'border-gray-200 dark:border-gray-700'
                            } hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors`}
                            onClick={(e) => {
                              if (readOnly) return;
                              // Left click: insert at cursor position
                              if (e.button === 0 || !e.button) {
                                insertVariable(variable);
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                            }}
                            title={readOnly ? undefined : isFromContent ? 'Bu değişken içerikten otomatik algılandı. Sol tık: ekle, Sağ tık: menü' : 'Sol tık: ekle, Sağ tık: menü'}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {variable.type}
                                  </Badge>
                                  {variable.isComplianceTracked && (
                                    <Badge variant="outline" className="text-xs text-primary">
                                      Uyum
                                    </Badge>
                                  )}
                                  {isFromContent && (
                                    <Badge variant="outline" className="text-xs text-yellow-700 dark:text-yellow-400">
                                      Algılandı
                                    </Badge>
                                  )}
                                </div>
                                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                  {variable.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                  {variable.taggedText || `{{${variable.name}}}`}
                                </p>
                                <p className="text-xs font-medium text-primary mt-1">
                                  {variable.value instanceof Date
                                    ? new Date(variable.value).toLocaleDateString('tr-TR')
                                    : String(variable.value || (isFromContent ? 'Değer atanmadı' : 'N/A'))}
                                </p>
                              </div>
                              {!readOnly && (
                                <span className="material-symbols-outlined text-gray-400 text-sm flex-shrink-0">
                                  {isFromContent ? 'edit' : 'add_circle'}
                                </span>
                              )}
                            </div>
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              if (variable._id) {
                                // If variable exists in contract, show it in editor
                                selectVariableInEditor(variable.name);
                              } else {
                                // If variable is extracted, just insert it
                                insertVariable(variable);
                              }
                            }}
                          >
                            <span className="material-symbols-outlined text-base mr-2">visibility</span>
                            Göster
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {variable._id && !readOnly && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setVariableToEdit(variable);
                                  
                                  // Format value based on type
                                  let formattedValue = '';
                                  if (variable.value !== null && variable.value !== undefined) {
                                    if (variable.type === 'date') {
                                      // Handle Date objects or date strings
                                      if (variable.value instanceof Date) {
                                        formattedValue = new Date(variable.value).toISOString().split('T')[0];
                                      } else if (typeof variable.value === 'string') {
                                        // Try to parse and format date string
                                        const date = new Date(variable.value);
                                        if (!isNaN(date.getTime())) {
                                          formattedValue = date.toISOString().split('T')[0];
                                        } else {
                                          formattedValue = variable.value;
                                        }
                                      } else {
                                        formattedValue = String(variable.value);
                                      }
                                    } else if (variable.type === 'boolean') {
                                      // Convert boolean to string representation
                                      const boolValue = String(variable.value).toLowerCase();
                                      formattedValue = (boolValue === 'true' || boolValue === '1' || boolValue === 'yes' || boolValue === 'evet') ? 'true' : 'false';
                                    } else if (variable.type === 'number') {
                                      // Convert number to string
                                      formattedValue = String(variable.value);
                                    } else {
                                      // For text, currency, percentage - use string representation
                                      formattedValue = String(variable.value);
                                    }
                                  }
                                  
                                  setEditVariableForm({
                                    name: variable.name,
                                    type: variable.type,
                                    value: formattedValue,
                                    isComplianceTracked: variable.isComplianceTracked || false,
                                  });
                                  setShowEditVariableDialog(true);
                                }}
                              >
                                <span className="material-symbols-outlined text-base mr-2">edit</span>
                                Düzenle
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              insertVariable(variable);
                            }}
                          >
                            <span className="material-symbols-outlined text-base mr-2">add</span>
                            Cursor Pozisyonuna Ekle
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  })}
                    </>
                  )}
                </TabsContent>
                
                <TabsContent value="global" className="mt-3">
                  {/* Search for global variables */}
                  <div className="mb-3">
                    <Input
                      placeholder="Global değişken ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  
                  {globalVariables.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      Henüz global değişken tanımlanmamış.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {globalVariables
                        .filter((gv) => {
                          if (!searchTerm) return true;
                          const search = searchTerm.toLowerCase();
                          return (
                            gv.name.toLowerCase().includes(search) ||
                            gv.description?.toLowerCase().includes(search) ||
                            gv.category?.toLowerCase().includes(search)
                          );
                        })
                        .map((globalVar) => {
                          const isAlreadyAdded = variables.some((v) => v.name === globalVar.name);
                          return (
                            <DropdownMenu key={globalVar._id}>
                              <DropdownMenuTrigger asChild>
                                <div
                                  className={`p-3 rounded-lg border ${
                                    selectedVariableName === globalVar.name
                                      ? 'border-primary dark:border-primary bg-primary/10 dark:bg-primary/20 ring-2 ring-primary/50'
                                      : isAlreadyAdded
                                      ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
                                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                  } cursor-pointer transition-colors`}
                                  onClick={(e) => {
                                    if (readOnly) return;
                                    // Left click: add to contract or insert at cursor
                                    if (e.button === 0 || !e.button) {
                                      if (isAlreadyAdded) {
                                        // If already added, insert at cursor position
                                        insertVariable({
                                          name: globalVar.name,
                                          type: globalVar.type,
                                          value: globalVar.defaultValue || '',
                                          taggedText: `{{${globalVar.name}}}`,
                                        });
                                      } else {
                                        // Add to contract
                                        addGlobalVariableToContract(globalVar);
                                      }
                                    }
                                  }}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                  }}
                                  title={
                                    readOnly
                                      ? undefined
                                      : isAlreadyAdded
                                      ? 'Bu değişken zaten sözleşmeye eklenmiş. Sol tık: ekle, Sağ tık: menü'
                                      : 'Sözleşmeye eklemek için tıklayın. Sağ tık: menü'
                                  }
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="text-xs">
                                          {globalVar.type}
                                        </Badge>
                                        {globalVar.category && (
                                          <Badge variant="outline" className="text-xs text-blue-700 dark:text-blue-400">
                                            {globalVar.category}
                                          </Badge>
                                        )}
                                        {isAlreadyAdded && (
                                          <Badge variant="outline" className="text-xs text-green-700 dark:text-green-400">
                                            Eklendi
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                        {globalVar.name}
                                      </p>
                                      {globalVar.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                          {globalVar.description}
                                        </p>
                                      )}
                                      {globalVar.defaultValue && (
                                        <p className="text-xs font-medium text-primary mt-1">
                                          Varsayılan: {String(globalVar.defaultValue)}
                                        </p>
                                      )}
                                    </div>
                                    {!readOnly && !isAlreadyAdded && (
                                      <span className="material-symbols-outlined text-gray-400 text-sm flex-shrink-0">
                                        add_circle
                                      </span>
                                    )}
                                    {isAlreadyAdded && (
                                      <span className="material-symbols-outlined text-green-500 text-sm flex-shrink-0">
                                        check_circle
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {isAlreadyAdded && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        selectVariableInEditor(globalVar.name);
                                      }}
                                    >
                                      <span className="material-symbols-outlined text-base mr-2">visibility</span>
                                      Göster
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (isAlreadyAdded) {
                                      insertVariable({
                                        name: globalVar.name,
                                        type: globalVar.type,
                                        value: globalVar.defaultValue || '',
                                        taggedText: `{{${globalVar.name}}}`,
                                      });
                                    } else {
                                      addGlobalVariableToContract(globalVar);
                                    }
                                  }}
                                >
                                  <span className="material-symbols-outlined text-base mr-2">add</span>
                                  {isAlreadyAdded ? 'Cursor Pozisyonuna Ekle' : 'Sözleşmeye Ekle'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          );
                        })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Variable Creation Dialog */}
      <Dialog open={showVariableDialog} onOpenChange={setShowVariableDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-white text-gray-900 dark:text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-900">Değişken Oluştur</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-600">
              Seçili metni bir değişken olarak işaretleyin. Bu değişken uyum takibi için kullanılabilir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="variable-name">Değişken Adı *</Label>
              <Input
                id="variable-name"
                placeholder="örn. UnitPrice, DeliveryDate"
                value={variableForm.name}
                onChange={(e) => setVariableForm({ ...variableForm, name: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-600 dark:text-gray-600 mt-1">
                Değişken adı benzersiz olmalıdır (örn: UnitPrice, DeliveryDate)
              </p>
            </div>

            <div>
              <Label htmlFor="variable-type">Değişken Tipi *</Label>
              <Select
                value={variableForm.type}
                onValueChange={(value: ContractVariable['type']) =>
                  setVariableForm({ ...variableForm, type: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Metin</SelectItem>
                  <SelectItem value="number">Sayı</SelectItem>
                  <SelectItem value="date">Tarih</SelectItem>
                  <SelectItem value="currency">Para Birimi</SelectItem>
                  <SelectItem value="percentage">Yüzde</SelectItem>
                  <SelectItem value="boolean">Evet/Hayır</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="variable-value">Değer</Label>
              <Input
                id="variable-value"
                placeholder="Değişken değeri"
                value={variableForm.value}
                onChange={(e) => setVariableForm({ ...variableForm, value: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-600 dark:text-gray-600 mt-1">
                Seçili metin: &quot;{selectedText}&quot;
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="compliance-tracked"
                checked={variableForm.isComplianceTracked}
                onChange={(e) =>
                  setVariableForm({ ...variableForm, isComplianceTracked: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="compliance-tracked" className="text-sm font-normal cursor-pointer">
                Uyum takibi için izle
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVariableDialog(false)}>
              İptal
            </Button>
            <Button onClick={handleCreateVariable} disabled={!variableForm.name}>
              Değişken Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Variable Confirmation Dialog */}
      <Dialog open={showAddVariableDialog} onOpenChange={setShowAddVariableDialog}>
        <DialogContent className="sm:max-w-[450px] bg-white dark:bg-white text-gray-900 dark:text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-900">Değişken Bulunamadı</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-600">
              &quot;{variableToAdd?.name}&quot; değişkeni sözleşme değişkenleri listesinde bulunamadı.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 dark:text-gray-600">
              Bu değişkeni sözleşmeye eklemek ister misiniz?
            </p>
            {variableToAdd && (
              <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-100">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-900">
                  Değişken: <span className="font-mono text-primary">{variableToAdd.text}</span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddVariableDialog(false);
                setVariableToAdd(null);
              }}
            >
              İptal
            </Button>
            <Button
              onClick={async () => {
                if (!variableToAdd || !contractId) return;

                try {
                  // Create variable with default values
                  const response = await fetch('/api/variables', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contractId,
                      name: variableToAdd.name,
                      type: 'text', // Default type
                      value: '',
                      taggedText: variableToAdd.text,
                      isComplianceTracked: false,
                    }),
                  });

                  if (!response.ok) {
                    throw new Error('Variable creation failed');
                  }

                  const data = await response.json();
                  const newVariable = data.variable;

                  // Reload variables
                  const varsResponse = await fetch(`/api/variables?contractId=${contractId}`);
                  const varsData = await varsResponse.json();
                  if (varsData.variables) {
                    setVariables(varsData.variables);
                  }

                  // Select the newly added variable
                  setSelectedVariableName(newVariable.name);
                  setActiveTab('contract');
                  setShowAddVariableDialog(false);
                  setVariableToAdd(null);
                } catch (error) {
                  console.error('Error creating variable:', error);
                  alert('Değişken oluşturulurken bir hata oluştu.');
                }
              }}
            >
              <span className="material-symbols-outlined text-base mr-2">add</span>
              Evet, Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Variable Creation Dialog */}
      <Dialog open={showNewVariableDialog} onOpenChange={setShowNewVariableDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-white text-gray-900 dark:text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-900">Yeni Değişken Oluştur</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-600">
              Yeni bir değişken oluşturun. Değişken, sözleşme metnine cursorun bulunduğu yere otomatik olarak eklenecektir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-variable-name">Değişken Adı *</Label>
              <Input
                id="new-variable-name"
                placeholder="örn. NoticePeriod, DeliveryDate"
                value={newVariableForm.name}
                onChange={(e) => setNewVariableForm({ ...newVariableForm, name: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-600 dark:text-gray-600 mt-1">
                Değişken adı benzersiz olmalıdır (örn: NoticePeriod, DeliveryDate)
              </p>
            </div>

            <div>
              <Label htmlFor="new-variable-type">Değişken Tipi *</Label>
              <Select
                value={newVariableForm.type}
                onValueChange={(value: ContractVariable['type']) =>
                  setNewVariableForm({ ...newVariableForm, type: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Metin</SelectItem>
                  <SelectItem value="number">Sayı</SelectItem>
                  <SelectItem value="date">Tarih</SelectItem>
                  <SelectItem value="currency">Para Birimi</SelectItem>
                  <SelectItem value="percentage">Yüzde</SelectItem>
                  <SelectItem value="boolean">Evet/Hayır</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="new-variable-value">Değer</Label>
              <Input
                id="new-variable-value"
                placeholder="Değişken değeri (opsiyonel)"
                value={newVariableForm.value}
                onChange={(e) => setNewVariableForm({ ...newVariableForm, value: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-600 dark:text-gray-600 mt-1">
                Değişkenin başlangıç değeri (opsiyonel)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="new-compliance-tracked"
                checked={newVariableForm.isComplianceTracked}
                onChange={(e) =>
                  setNewVariableForm({ ...newVariableForm, isComplianceTracked: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="new-compliance-tracked" className="text-sm font-normal cursor-pointer">
                Uyum takibi için izle
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewVariableDialog(false);
                setNewVariableForm({
                  name: '',
                  type: 'text',
                  value: '',
                  isComplianceTracked: false,
                });
              }}
            >
              İptal
            </Button>
            <Button onClick={handleCreateNewVariable} disabled={!newVariableForm.name}>
              <span className="material-symbols-outlined text-base mr-2">add</span>
              Oluştur ve Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Variable Dialog */}
      <Dialog open={showEditVariableDialog} onOpenChange={setShowEditVariableDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-white text-gray-900 dark:text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-900">Değişken Düzenle</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-600">
              Değişken bilgilerini güncelleyin. Değişken adı değiştirilemez.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-variable-name">Değişken Adı</Label>
              <Input
                id="edit-variable-name"
                value={editVariableForm.name}
                disabled
                className="mt-1 bg-gray-100 dark:bg-gray-100"
              />
              <p className="text-xs text-gray-600 dark:text-gray-600 mt-1">
                Değişken adı değiştirilemez
              </p>
            </div>

            <div>
              <Label htmlFor="edit-variable-type">Değişken Tipi *</Label>
              <Select
                value={editVariableForm.type}
                onValueChange={(value: ContractVariable['type']) =>
                  setEditVariableForm({ ...editVariableForm, type: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Metin</SelectItem>
                  <SelectItem value="number">Sayı</SelectItem>
                  <SelectItem value="date">Tarih</SelectItem>
                  <SelectItem value="currency">Para Birimi</SelectItem>
                  <SelectItem value="percentage">Yüzde</SelectItem>
                  <SelectItem value="boolean">Evet/Hayır</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-variable-value">Değer</Label>
              {editVariableForm.type === 'boolean' ? (
                <Select
                  value={editVariableForm.value}
                  onValueChange={(value) => setEditVariableForm({ ...editVariableForm, value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Değer seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Evet (True)</SelectItem>
                    <SelectItem value="false">Hayır (False)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="edit-variable-value"
                  type={editVariableForm.type === 'date' ? 'date' : editVariableForm.type === 'number' ? 'number' : 'text'}
                  placeholder="Değişken değeri"
                  value={editVariableForm.value}
                  onChange={(e) => setEditVariableForm({ ...editVariableForm, value: e.target.value })}
                  className="mt-1"
                />
              )}
              <p className="text-xs text-gray-600 dark:text-gray-600 mt-1">
                Değişkenin güncel değeri görüntüleniyor
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-compliance-tracked"
                checked={editVariableForm.isComplianceTracked}
                onChange={(e) =>
                  setEditVariableForm({ ...editVariableForm, isComplianceTracked: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="edit-compliance-tracked" className="text-sm font-normal cursor-pointer">
                Uyum takibi için izle
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditVariableDialog(false);
                setVariableToEdit(null);
                setEditVariableForm({
                  name: '',
                  type: 'text',
                  value: '',
                  isComplianceTracked: false,
                });
              }}
            >
              İptal
            </Button>
            <Button onClick={handleUpdateVariable}>
              <span className="material-symbols-outlined text-base mr-2">save</span>
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sözleşme Önizleme</DialogTitle>
            <DialogDescription>
              Değişkenler değerleriyle değiştirilmiş sözleşme görünümü
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {editor && (
              <div
                className="prose prose-sm dark:prose-invert max-w-none p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                dangerouslySetInnerHTML={{
                  __html: replaceVariablesWithValues(editor.getHTML(), variables),
                }}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Kapat
            </Button>
            <Button
              onClick={() => {
                if (!editor) return;
                const content = editor.getHTML();
                const previewContent = replaceVariablesWithValues(content, variables);
                
                // Create a new window with the preview content
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>Sözleşme Önizleme</title>
                        <style>
                          body {
                            font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            max-width: 800px;
                            margin: 40px auto;
                            padding: 20px;
                            line-height: 1.6;
                            color: #333;
                          }
                          h1, h2, h3, h4, h5, h6 {
                            margin-top: 1.5em;
                            margin-bottom: 0.5em;
                          }
                          p {
                            margin-bottom: 1em;
                          }
                          @media print {
                            body {
                              margin: 0;
                              padding: 20px;
                            }
                          }
                        </style>
                      </head>
                      <body>
                        ${previewContent}
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                  setTimeout(() => {
                    printWindow.print();
                  }, 250);
                }
              }}
            >
              <span className="material-symbols-outlined text-base mr-2">print</span>
              Yazdır
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Summary Dialog */}
      <Dialog open={showChangeSummaryDialog} onOpenChange={setShowChangeSummaryDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-white text-gray-900 dark:text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-900">Değişiklik Özeti</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-600">
              Bu versiyon için bir değişiklik özeti ekleyebilirsiniz (opsiyonel)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="change-summary">Değişiklik Özeti</Label>
            <Input
              id="change-summary"
              placeholder="Örn: Ödeme koşulları güncellendi, yeni maddeler eklendi..."
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-600 dark:text-gray-600 mt-1">
              Bu özet versiyon geçmişinde görüntülenecektir
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowChangeSummaryDialog(false);
                setChangeSummary('');
              }}
            >
              İptal
            </Button>
            <Button
              onClick={() => {
                setShowChangeSummaryDialog(false);
                handleSave(changeSummary || undefined);
              }}
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Versions History Dialog */}
      <Dialog open={showVersions} onOpenChange={setShowVersions}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Versiyon Geçmişi</DialogTitle>
            <DialogDescription>
              Sözleşmenin tüm versiyonlarını görüntüleyin ve geri yükleyin
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {versions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                Henüz versiyon bulunmuyor
              </p>
            ) : (
              versions.map((version: any) => (
                <div
                  key={version._id}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-semibold">
                          v{version.versionNumber}
                        </Badge>
                        {version.changeSummary && (
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {version.changeSummary}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {version.createdBy?.name || 'Bilinmeyen Kullanıcı'} tarafından oluşturuldu
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(version.createdAt).toLocaleString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {version.changes && version.changes.length > 0 && (
                        <p className="text-xs text-primary mt-2">
                          {version.changes.length} değişiklik
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!confirm(`Versiyon ${version.versionNumber} geri yüklenecek. Bu işlem mevcut içeriği değiştirecek ve yeni bir versiyon oluşturacak. Devam etmek istiyor musunuz?`)) {
                            return;
                          }
                          
                          try {
                            const response = await fetch(
                              `/api/contracts/${contractId}/versions/${version._id}/restore`,
                              { method: 'POST' }
                            );
                            
                            if (!response.ok) {
                              const errorData = await response.json().catch(() => ({}));
                              throw new Error(errorData.error || 'Restore failed');
                            }
                            
                            alert('Versiyon başarıyla geri yüklendi. Sayfa yenilenecek ve editör güncellenecek.');
                            
                            // Reload the page to show the restored content
                            window.location.href = `/dashboard/contracts/${contractId}/edit`;
                          } catch (error: any) {
                            console.error('Error restoring version:', error);
                            alert(`Versiyon geri yüklenirken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`);
                          }
                        }}
                      >
                        <span className="material-symbols-outlined text-base mr-1">restore</span>
                        Geri Yükle
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersions(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Track Changes Sidebar */}
      {showTrackChanges && trackChangesEnabled && (
        <div className="w-80 flex-shrink-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Değişiklikler</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTrackChanges(false)}
                  className="h-8 w-8 p-0"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
              {changes.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Henüz değişiklik yok
                </p>
              ) : (
                changes.map((change, index) => (
                  <div
                    key={change.id || index}
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: change.userColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {change.userName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {change.type === 'insertion' ? 'Ekleme' : 'Silme'} •{' '}
                          {new Date(change.timestamp).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2">
                      {change.type === 'insertion' ? (
                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 p-2 rounded border-l-2 border-green-500">
                          <span className="font-semibold">Eklendi:</span> {change.content.substring(0, 100)}
                          {change.content.length > 100 && '...'}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-red-50 dark:bg-red-900/20 p-2 rounded border-l-2 border-red-500">
                          <span className="font-semibold">Silindi:</span> {(change.originalContent || change.content).substring(0, 100)}
                          {(change.originalContent || change.content).length > 100 && '...'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          if (!editor) return;
                          // Accept change:
                          // - For deletion: remove mark and delete the text (accept deletion = remove text)
                          // - For insertion: remove mark but keep text (accept insertion = keep as normal text)
                          const position = change.position || 0;
                          const length = change.length || 0;
                          const type = change.type;
                          const content = change.content || change.originalContent || '';
                          
                          if (editor.commands.acceptTrackChange({ 
                            position, 
                            length, 
                            type,
                            content: content.substring(0, 50) // Use first 50 chars for matching
                          })) {
                            // Remove from changes list
                            setChanges((prev) => prev.filter((c) => c.id !== change.id));
                          }
                        }}
                      >
                        <span className="material-symbols-outlined text-base mr-1">check</span>
                        Kabul Et
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          if (!editor) return;
                          // Reject change:
                          // - For deletion: remove mark but keep text (reject deletion = restore text)
                          // - For insertion: remove mark and delete text (reject insertion = remove text)
                          const position = change.position || 0;
                          const length = change.length || 0;
                          const type = change.type;
                          const content = change.content || change.originalContent || '';
                          
                          if (editor.commands.rejectTrackChange({ 
                            position, 
                            length, 
                            type,
                            content: content.substring(0, 50) // Use first 50 chars for matching
                          })) {
                            // Remove from changes list
                            setChanges((prev) => prev.filter((c) => c.id !== change.id));
                          }
                        }}
                      >
                        <span className="material-symbols-outlined text-base mr-1">close</span>
                        Reddet
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

