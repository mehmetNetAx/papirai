import { BaseIntegrationAdapter, IntegrationConfig, IntegrationData, ExtractedVariableValue } from './base';

export interface NebimOrderData {
  siparisNo: string;
  siparisTarihi: Date;
  teslimatTarihi?: Date;
  toplamTutar: number;
  doviz?: string;
  kalemler?: Array<{
    stokKodu: string;
    miktar: number;
    birimFiyat: number;
    toplamFiyat: number;
  }>;
  [key: string]: any;
}

/**
 * Nebim Integration Adapter
 * Supports Nebim Web API
 */
export class NebimAdapter extends BaseIntegrationAdapter {
  private nebimClient: any;

  constructor(config: IntegrationConfig, variableMappings: Record<string, string> = {}, fieldMappings: Record<string, string> = {}) {
    super(config, variableMappings, fieldMappings);
  }

  async connect(): Promise<boolean> {
    try {
      // Note: apiEndpoint and apiKey are optional for testing purposes
      // In production, these would be required

      // Simulate Nebim connection
      this.nebimClient = {
        connected: true,
        endpoint: this.config.apiEndpoint || 'mock-endpoint',
        apiKey: this.config.apiKey || 'mock-key',
      };

      return true;
    } catch (error: any) {
      console.error('Nebim connection error:', error);
      throw new Error(`Failed to connect to Nebim: ${error.message}`);
    }
  }

  async fetchData(contractId: string, variables: any[]): Promise<IntegrationData> {
    if (!this.nebimClient) {
      await this.connect();
    }

    try {
      // Fetch orders from Nebim Web API
      // Example: POST /api/orders with API key authentication

      const mockData: NebimOrderData = {
        siparisNo: `NEB-${contractId.slice(-6)}`,
        siparisTarihi: new Date(),
        teslimatTarihi: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        toplamTutar: 100000,
        doviz: 'TRY',
        kalemler: [
          {
            stokKodu: 'STK001',
            miktar: 100,
            birimFiyat: 1000,
            toplamFiyat: 100000,
          },
        ],
      };

      return mockData as IntegrationData;
    } catch (error: any) {
      console.error('Nebim data fetch error:', error);
      throw new Error(`Failed to fetch data from Nebim: ${error.message}`);
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
        case 'toplamtutar':
        case 'tutar':
        case 'fiyat':
          value = (data as NebimOrderData).toplamTutar;
          break;
        case 'teslimattarihi':
        case 'teslimat_tarihi':
          value = (data as NebimOrderData).teslimatTarihi;
          break;
        case 'siparistarihi':
        case 'siparis_tarihi':
          value = (data as NebimOrderData).siparisTarihi;
          break;
        case 'doviz':
          value = (data as NebimOrderData).doviz || 'TRY';
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
        message: 'Nebim connection test successful (simulated)',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Nebim connection failed',
      };
    }
  }
}

