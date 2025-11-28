/**
 * This script creates compliance check records via API
 * Run this after the Next.js server is running
 */

const CONTRACT_ID = '69242513c762df48baae4004';
const API_BASE = 'http://localhost:3000/api';

async function createComplianceCheck(data: any) {
  const response = await fetch(`${API_BASE}/compliance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create compliance check: ${error}`);
  }

  return response.json();
}

async function findOrCreateVariable(contractId: string) {
  // First, try to find existing ResponseTime variable
  // This would require authentication, so we'll create it via the compliance check
  // The compliance service will handle variable creation if needed
  return null;
}

async function main() {
  console.log('Creating compliance check records for ResponseTime...\n');

  const complianceChecks = [
    {
      contractId: CONTRACT_ID,
      expectedValue: 2, // 2 saat
      actualValue: 3, // 3 saat
      source: 'manual' as const,
      sourceData: {
        incidentId: 'INC-001',
        description: 'Yanıt süresi 2 saat olması gerekirken 3 saat sonra yanıt verilmiştir. %50 gecikme.',
      },
    },
    {
      contractId: CONTRACT_ID,
      expectedValue: 2, // 2 saat
      actualValue: 2.5, // 2.5 saat
      source: 'manual' as const,
      sourceData: {
        incidentId: 'INC-002',
        description: 'Yanıt süresi 2 saat olması gerekirken 2.5 saat sonra yanıt verilmiştir. %25 gecikme.',
      },
    },
    {
      contractId: CONTRACT_ID,
      expectedValue: 2, // 2 saat
      actualValue: 5, // 5 saat
      source: 'manual' as const,
      sourceData: {
        incidentId: 'INC-003',
        description: 'Yanıt süresi 2 saat olması gerekirken 5 saat sonra yanıt verilmiştir. %150 gecikme. Kritik seviye uyumsuzluk.',
      },
    },
  ];

  for (const checkData of complianceChecks) {
    try {
      const result = await createComplianceCheck(checkData);
      console.log(`✅ Created compliance check: ${result.checkId}`);
    } catch (error: any) {
      console.error(`❌ Error creating compliance check: ${error.message}`);
    }
  }

  console.log('\n✅ Done!');
}

// Note: This script requires authentication
// You'll need to run this from the browser console or use a tool like Postman
// with proper authentication cookies
console.log(`
⚠️  This script requires authentication.
To use it:
1. Open your browser and log in to the application
2. Open the browser console (F12)
3. Copy and paste the main() function calls with fetch requests
4. Or use the API directly with proper authentication headers
`);

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).createResponseTimeCompliance = main;
}

main().catch(console.error);

