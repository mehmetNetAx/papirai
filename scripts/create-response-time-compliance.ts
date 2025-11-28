import mongoose from 'mongoose';
import connectDB from '../lib/db/connection';
import ComplianceCheck from '../lib/db/models/ComplianceCheck';
import Contract from '../lib/db/models/Contract';
import ContractVariable from '../lib/db/models/ContractVariable';

async function createResponseTimeCompliance() {
  try {
    await connectDB();

    // Use the provided contract ID
    const contractId = '69242513c762df48baae4004';
    
    // Try finding by ID first
    let contract = await Contract.findById(new mongoose.Types.ObjectId(contractId));
    
    if (!contract) {
      // Try finding by title as fallback
      contract = await Contract.findOne({ 
        $or: [
          { title: /yazılım.*danışmanlık/i },
          { title: /danışmanlık.*yazılım/i },
          { title: /software.*consulting/i },
          { title: /consulting.*software/i },
        ]
      });
      
      if (!contract) {
        // List all contracts to help debug
        const allContracts = await Contract.find({}).select('_id title').limit(20).lean();
        console.log('Available contracts:');
        allContracts.forEach((c: any) => {
          console.log(`  - ${c._id}: ${c.title}`);
        });
        console.error(`\n❌ Contract with ID ${contractId} not found`);
        process.exit(1);
      }
    }

    console.log(`Found contract: ${contract.title}`);

    // Use the found contract's ID
    const actualContractId = contract._id.toString();
    console.log(`Using contract ID: ${actualContractId}`);

    // Find ResponseTime variable
    const responseTimeVariable = await ContractVariable.findOne({
      contractId: actualContractId,
      $or: [
        { name: 'ResponseTime' },
        { name: 'responseTime' },
        { name: 'RESPONSE_TIME' },
        { name: /response.*time/i },
      ],
    });

    if (!responseTimeVariable) {
      console.log('ResponseTime variable not found. Creating it...');
      
      // Create the variable if it doesn't exist
      const newVariable = await ContractVariable.create({
        contractId: actualContractId,
        name: 'ResponseTime',
        value: '2',
        type: 'number',
        taggedText: '{{ResponseTime}}',
        metadata: {
          unit: 'hours',
          description: 'Yanıt süresi (saat)',
        },
        isComplianceTracked: true,
      });
      
      console.log(`Created ResponseTime variable: ${newVariable._id}`);
      
      // Use the new variable ID
      const variableId = newVariable._id;
      
      // Create 3 compliance check records
      const complianceChecks = [
        {
          contractId: actualContractId,
          variableId: variableId,
          expectedValue: 2, // 2 saat
          actualValue: 3, // 3 saat
          status: 'non_compliant' as const,
          alertLevel: 'high' as const,
          deviation: {
            type: 'other' as const,
            amount: 1, // 1 saat fazla
            percentage: 50, // %50 fazla
            description: 'Yanıt süresi 2 saat olması gerekirken 3 saat sonra yanıt verilmiştir. %50 gecikme.',
          },
          source: 'manual' as const,
          sourceData: {
            incidentId: 'INC-001',
            reportedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 gün önce
            responseAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 saat sonra
          },
          checkedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          contractId: actualContractId,
          variableId: variableId,
          expectedValue: 2, // 2 saat
          actualValue: 2.5, // 2.5 saat
          status: 'non_compliant' as const,
          alertLevel: 'medium' as const,
          deviation: {
            type: 'other' as const,
            amount: 0.5, // 0.5 saat fazla
            percentage: 25, // %25 fazla
            description: 'Yanıt süresi 2 saat olması gerekirken 2.5 saat sonra yanıt verilmiştir. %25 gecikme.',
          },
          source: 'manual' as const,
          sourceData: {
            incidentId: 'INC-002',
            reportedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 gün önce
            responseAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000), // 2.5 saat sonra
          },
          checkedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          contractId: actualContractId,
          variableId: variableId,
          expectedValue: 2, // 2 saat
          actualValue: 5, // 5 saat
          status: 'non_compliant' as const,
          alertLevel: 'critical' as const,
          deviation: {
            type: 'other' as const,
            amount: 3, // 3 saat fazla
            percentage: 150, // %150 fazla
            description: 'Yanıt süresi 2 saat olması gerekirken 5 saat sonra yanıt verilmiştir. %150 gecikme. Kritik seviye uyumsuzluk.',
          },
          source: 'manual' as const,
          sourceData: {
            incidentId: 'INC-003',
            reportedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 gün önce
            responseAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000), // 5 saat sonra
          },
          checkedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      ];

      for (const checkData of complianceChecks) {
        const check = await ComplianceCheck.create(checkData);
        console.log(`Created compliance check: ${check._id} - Status: ${check.status}, Alert: ${check.alertLevel}`);
      }

      console.log('\n✅ Successfully created 3 compliance check records for ResponseTime variable');
    } else {
      console.log(`Found ResponseTime variable: ${responseTimeVariable.name} (${responseTimeVariable._id})`);
      console.log(`Current value: ${responseTimeVariable.value}`);

      // Create 3 compliance check records
      const complianceChecks = [
        {
          contractId: actualContractId,
          variableId: responseTimeVariable._id,
          expectedValue: 2, // 2 saat
          actualValue: 3, // 3 saat
          status: 'non_compliant' as const,
          alertLevel: 'high' as const,
          deviation: {
            type: 'other' as const,
            amount: 1, // 1 saat fazla
            percentage: 50, // %50 fazla
            description: 'Yanıt süresi 2 saat olması gerekirken 3 saat sonra yanıt verilmiştir. %50 gecikme.',
          },
          source: 'manual' as const,
          sourceData: {
            incidentId: 'INC-001',
            reportedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 gün önce
            responseAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 saat sonra
          },
          checkedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          contractId: actualContractId,
          variableId: responseTimeVariable._id,
          expectedValue: 2, // 2 saat
          actualValue: 2.5, // 2.5 saat
          status: 'non_compliant' as const,
          alertLevel: 'medium' as const,
          deviation: {
            type: 'other' as const,
            amount: 0.5, // 0.5 saat fazla
            percentage: 25, // %25 fazla
            description: 'Yanıt süresi 2 saat olması gerekirken 2.5 saat sonra yanıt verilmiştir. %25 gecikme.',
          },
          source: 'manual' as const,
          sourceData: {
            incidentId: 'INC-002',
            reportedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 gün önce
            responseAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000), // 2.5 saat sonra
          },
          checkedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          contractId: actualContractId,
          variableId: responseTimeVariable._id,
          expectedValue: 2, // 2 saat
          actualValue: 5, // 5 saat
          status: 'non_compliant' as const,
          alertLevel: 'critical' as const,
          deviation: {
            type: 'other' as const,
            amount: 3, // 3 saat fazla
            percentage: 150, // %150 fazla
            description: 'Yanıt süresi 2 saat olması gerekirken 5 saat sonra yanıt verilmiştir. %150 gecikme. Kritik seviye uyumsuzluk.',
          },
          source: 'manual' as const,
          sourceData: {
            incidentId: 'INC-003',
            reportedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 gün önce
            responseAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000), // 5 saat sonra
          },
          checkedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      ];

      for (const checkData of complianceChecks) {
        const check = await ComplianceCheck.create(checkData);
        console.log(`Created compliance check: ${check._id} - Status: ${check.status}, Alert: ${check.alertLevel}`);
      }

      console.log('\n✅ Successfully created 3 compliance check records for ResponseTime variable');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating compliance checks:', error);
    process.exit(1);
  }
}

createResponseTimeCompliance();

