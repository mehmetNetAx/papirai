import { BaseIntegrationAdapter, IntegrationConfig, IntegrationData, ExtractedVariableValue } from './base';

export interface LogoOrderData {
  OrderNo: string;
  OrderDate: Date;
  DeliveryDate?: Date;
  TotalAmount: number;
  Currency?: string;
  Lines?: Array<{
    ItemCode: string;
    Quantity: number;
    UnitPrice: number;
    TotalPrice: number;
  }>;
  [key: string]: any;
}

/**
 * Logo Integration Adapter
 * Supports Logo Web Services API
 */
export class LogoAdapter extends BaseIntegrationAdapter {
  private logoClient: any;

  constructor(config: IntegrationConfig, variableMappings: Record<string, string> = {}, fieldMappings: Record<string, string> = {}) {
    super(config, variableMappings, fieldMappings);
  }

  async connect(): Promise<boolean> {
    try {
      // Note: apiEndpoint and database are optional for testing purposes
      // In production, these would be required

      // Simulate Logo connection
      this.logoClient = {
        connected: true,
        endpoint: this.config.apiEndpoint || 'mock-endpoint',
        database: this.config.database || 'mock-database',
      };

      return true;
    } catch (error: any) {
      console.error('Logo connection error:', error);
      throw new Error(`Failed to connect to Logo: ${error.message}`);
    }
  }

  async fetchData(contractId: string, variables: any[]): Promise<IntegrationData> {
    if (!this.logoClient) {
      await this.connect();
    }

    try {
      // Fetch orders from Logo Web Services
      // Example: POST /LogoWS/OrderService.asmx with SOAP

      const mockData: LogoOrderData = {
        OrderNo: `LOGO-${contractId.slice(-6)}`,
        OrderDate: new Date(),
        DeliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        TotalAmount: 100000,
        Currency: 'TRY',
        Lines: [
          {
            ItemCode: 'ITEM001',
            Quantity: 100,
            UnitPrice: 1000,
            TotalPrice: 100000,
          },
        ],
      };

      return mockData as IntegrationData;
    } catch (error: any) {
      console.error('Logo data fetch error:', error);
      throw new Error(`Failed to fetch data from Logo: ${error.message}`);
    }
  }

  async extractVariableValues(
    data: IntegrationData,
    variables: any[]
  ): Promise<ExtractedVariableValue[]> {
    const extracted: ExtractedVariableValue[] = [];

    for (const variable of variables) {
      const erpFieldName = this.mapVariableName(variable.name);
      let value: any = null;

      switch (erpFieldName.toLowerCase()) {
        case 'totalamount':
        case 'amount':
          value = (data as LogoOrderData).TotalAmount;
          break;
        case 'deliverydate':
        case 'delivery_date':
          value = (data as LogoOrderData).DeliveryDate;
          break;
        case 'orderdate':
        case 'order_date':
          value = (data as LogoOrderData).OrderDate;
          break;
        case 'currency':
          value = (data as LogoOrderData).Currency || 'TRY';
          break;
        default:
          value = data[erpFieldName] || data[this.fieldMappings[erpFieldName]];
      }

      if (value !== null && value !== undefined) {
        extracted.push({
          variableName: variable.name,
          value,
          source: erpFieldName,
        });
      }
    }

    return extracted;
  }

  protected getSourceType(): 'sap' | 'other_integration' {
    return 'other_integration';
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.connect();
      return {
        success: true,
        message: 'Logo connection test successful (simulated)',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Logo connection failed',
      };
    }
  }
}

