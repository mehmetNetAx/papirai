import { BaseIntegrationAdapter, IntegrationConfig, IntegrationData, ExtractedVariableValue } from './base';

export interface NetsisOrderData {
  siparis_no: string;
  siparis_tarih: Date;
  teslim_tarih?: Date;
  toplam_tutar: number;
  doviz_kod?: string;
  kalemler?: Array<{
    stok_kod: string;
    miktar: number;
    birim_fiyat: number;
    toplam_fiyat: number;
  }>;
  [key: string]: any;
}

/**
 * Netsis Integration Adapter
 * Supports Netsis SQL Server database connection
 */
export class NetsisAdapter extends BaseIntegrationAdapter {
  private netsisClient: any;

  constructor(config: IntegrationConfig, variableMappings: Record<string, string> = {}, fieldMappings: Record<string, string> = {}) {
    super(config, variableMappings, fieldMappings);
  }

  async connect(): Promise<boolean> {
    try {
      // Note: database is optional for testing purposes
      // In production, this would be required

      // Simulate Netsis SQL Server connection
      // In production, this would use mssql or similar
      this.netsisClient = {
        connected: true,
        database: this.config.database || 'mock-database',
        server: this.config.apiEndpoint || 'localhost',
        port: this.config.port || 1433,
      };

      return true;
    } catch (error: any) {
      console.error('Netsis connection error:', error);
      throw new Error(`Failed to connect to Netsis: ${error.message}`);
    }
  }

  async fetchData(contractId: string, variables: any[]): Promise<IntegrationData> {
    if (!this.netsisClient) {
      await this.connect();
    }

    try {
      // Query Netsis database
      // Example: SELECT * FROM SIPARIS WHERE ContractId = @contractId

      const mockData: NetsisOrderData = {
        siparis_no: `NET-${contractId.slice(-6)}`,
        siparis_tarih: new Date(),
        teslim_tarih: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        toplam_tutar: 100000,
        doviz_kod: 'TRY',
        kalemler: [
          {
            stok_kod: 'STK001',
            miktar: 100,
            birim_fiyat: 1000,
            toplam_fiyat: 100000,
          },
        ],
      };

      return mockData as IntegrationData;
    } catch (error: any) {
      console.error('Netsis data fetch error:', error);
      throw new Error(`Failed to fetch data from Netsis: ${error.message}`);
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
        case 'toplam_tutar':
        case 'tutar':
          value = (data as NetsisOrderData).toplam_tutar;
          break;
        case 'teslim_tarih':
        case 'teslimat_tarihi':
          value = (data as NetsisOrderData).teslim_tarih;
          break;
        case 'siparis_tarih':
        case 'siparis_tarihi':
          value = (data as NetsisOrderData).siparis_tarih;
          break;
        case 'doviz_kod':
        case 'doviz':
          value = (data as NetsisOrderData).doviz_kod || 'TRY';
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
        message: 'Netsis connection test successful (simulated)',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Netsis connection failed',
      };
    }
  }
}

