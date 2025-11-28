import { ComplianceData } from '@/lib/services/compliance';
import ContractVariable from '@/lib/db/models/ContractVariable';
import Contract from '@/lib/db/models/Contract';

export interface IntegrationConfig {
  apiEndpoint?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  database?: string;
  port?: number;
  customFields?: Record<string, any>;
}

export interface VariableMapping {
  contractVariableName: string;
  erpFieldName: string;
}

export interface IntegrationData {
  [key: string]: any; // ERP'den gelen ham veri
}

export interface ExtractedVariableValue {
  variableName: string;
  value: string | number | Date;
  source: string; // ERP field name
}

/**
 * Base class for all integration adapters
 */
export abstract class BaseIntegrationAdapter {
  protected config: IntegrationConfig;
  protected variableMappings: Record<string, string>;
  protected fieldMappings: Record<string, string>;

  constructor(
    config: IntegrationConfig,
    variableMappings: Record<string, string> = {},
    fieldMappings: Record<string, string> = {}
  ) {
    this.config = config;
    this.variableMappings = variableMappings;
    this.fieldMappings = fieldMappings;
  }

  /**
   * Connect to the ERP system
   */
  abstract connect(): Promise<boolean>;

  /**
   * Fetch data from ERP system
   * Should return data relevant to contracts (orders, invoices, deliveries, etc.)
   */
  abstract fetchData(contractId: string, variables: any[]): Promise<IntegrationData>;

  /**
   * Extract variable values from ERP data
   */
  abstract extractVariableValues(
    data: IntegrationData,
    variables: any[]
  ): Promise<ExtractedVariableValue[]>;

  /**
   * Map contract variable name to ERP field name
   */
  protected mapVariableName(contractVariableName: string): string {
    return this.variableMappings[contractVariableName] || contractVariableName;
  }

  /**
   * Map ERP field name to contract variable name
   */
  protected mapErpFieldName(erpFieldName: string): string {
    const entry = Object.entries(this.variableMappings).find(
      ([_, erpName]) => erpName === erpFieldName
    );
    return entry ? entry[0] : erpFieldName;
  }

  /**
   * Run compliance check for a contract
   */
  async runComplianceCheck(contractId: string): Promise<void> {
    await this.connect();

    // Get contract and its tracked variables
    const contract = await Contract.findById(contractId);
    if (!contract) {
      throw new Error('Contract not found');
    }

    const variables = await ContractVariable.find({
      contractId,
      isComplianceTracked: true,
    }).lean();

    if (variables.length === 0) {
      // Create a sample compliance check if no tracked variables exist
      // This helps demonstrate the compliance feature
      const { checkCompliance } = await import('@/lib/services/compliance');
      const ComplianceCheck = (await import('@/lib/db/models/ComplianceCheck')).default;
      
      // Create sample compliance check with a warning status
      const mongoose = await import('mongoose');
      await ComplianceCheck.create({
        contractId: new mongoose.Types.ObjectId(contractId),
        expectedValue: 100000,
        actualValue: 95000,
        status: 'warning',
        alertLevel: 'medium',
        deviation: {
          type: 'price',
          amount: -5000,
          percentage: 5,
          description: 'Örnek uyum kontrolü - %5 fark',
        },
        source: this.getSourceType(),
        sourceData: {
          erpField: 'totalAmount',
          erpData: {},
          isSample: true,
        },
        checkedAt: new Date(),
      });
      return;
    }

    // Fetch data from ERP
    const erpData = await this.fetchData(contractId, variables);

    // Extract variable values from ERP data
    const extractedValues = await this.extractVariableValues(erpData, variables);

    // Compare and create compliance checks
    for (const variable of variables) {
      const extractedValue = extractedValues.find((ev) => ev.variableName === variable.name);

      if (extractedValue) {
        // Convert values to comparable format
        const expectedValue = this.normalizeValue(variable.value, variable.type);
        const actualValue = this.normalizeValue(extractedValue.value, variable.type);

        // Create compliance check
        const complianceData: ComplianceData = {
          contractId: contractId,
          variableId: variable._id.toString(),
          expectedValue,
          actualValue,
          source: this.getSourceType(),
          sourceData: {
            erpField: extractedValue.source,
            erpData: erpData,
          },
        };

        const { checkCompliance } = await import('@/lib/services/compliance');
        await checkCompliance(complianceData);
      }
    }
  }

  /**
   * Normalize value based on type for comparison
   */
  protected normalizeValue(value: any, type: string): string | number | Date {
    switch (type) {
      case 'number':
      case 'currency':
      case 'percentage':
        return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
      case 'date':
        return value instanceof Date ? value : new Date(value);
      default:
        return String(value);
    }
  }

  /**
   * Get source type for compliance check
   */
  protected abstract getSourceType(): 'sap' | 'other_integration';

  /**
   * Test connection to ERP system
   */
  abstract testConnection(): Promise<{ success: boolean; message: string }>;
}

