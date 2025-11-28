import { BaseIntegrationAdapter } from './base';
import { SAPAdapter } from './sap';
import { NebimAdapter } from './nebim';
import { LogoAdapter } from './logo';
import { NetsisAdapter } from './netsis';
import { IntegrationConfig } from './base';

/**
 * Factory to create integration adapters
 */
export function createIntegrationAdapter(
  type: 'sap' | 'nebim' | 'logo' | 'netsis' | 'custom',
  config: IntegrationConfig,
  variableMappings: Record<string, string> = {},
  fieldMappings: Record<string, string> = {}
): BaseIntegrationAdapter {
  switch (type) {
    case 'sap':
      return new SAPAdapter(config, variableMappings, fieldMappings);
    case 'nebim':
      return new NebimAdapter(config, variableMappings, fieldMappings);
    case 'logo':
      return new LogoAdapter(config, variableMappings, fieldMappings);
    case 'netsis':
      return new NetsisAdapter(config, variableMappings, fieldMappings);
    default:
      throw new Error(`Unsupported integration type: ${type}`);
  }
}

