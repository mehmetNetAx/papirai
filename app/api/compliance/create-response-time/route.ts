import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import ComplianceCheck from '@/lib/db/models/ComplianceCheck';
import Contract from '@/lib/db/models/Contract';
import ContractVariable from '@/lib/db/models/ContractVariable';
import { requireAuth } from '@/lib/auth/middleware';
import mongoose from 'mongoose';

// POST - Create response time compliance checks for a specific contract
export async function POST(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const body = await req.json();
      const { contractId } = body;

      if (!contractId) {
        return NextResponse.json(
          { error: 'Contract ID is required' },
          { status: 400 }
        );
      }

      // Find the contract
      const contract = await Contract.findById(new mongoose.Types.ObjectId(contractId));
      if (!contract) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      console.log(`Found contract: ${contract.title}`);

      // Find or create ResponseTime variable
      let responseTimeVariable = await ContractVariable.findOne({
        contractId: contractId,
        $or: [
          { name: 'ResponseTime' },
          { name: 'responseTime' },
          { name: 'RESPONSE_TIME' },
          { name: /response.*time/i },
        ],
      });

      if (!responseTimeVariable) {
        console.log('ResponseTime variable not found. Creating it...');
        
        responseTimeVariable = await ContractVariable.create({
          contractId: contractId,
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
        
        console.log(`Created ResponseTime variable: ${responseTimeVariable._id}`);
      } else {
        console.log(`Found ResponseTime variable: ${responseTimeVariable.name} (${responseTimeVariable._id})`);
      }

      // Create 3 compliance check records
      const complianceChecks = [
        {
          contractId: contractId,
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
          contractId: contractId,
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
          contractId: contractId,
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

      const createdChecks = [];
      for (const checkData of complianceChecks) {
        const check = await ComplianceCheck.create(checkData);
        createdChecks.push({
          id: check._id.toString(),
          status: check.status,
          alertLevel: check.alertLevel,
          expectedValue: check.expectedValue,
          actualValue: check.actualValue,
        });
        console.log(`Created compliance check: ${check._id} - Status: ${check.status}, Alert: ${check.alertLevel}`);
      }

      return NextResponse.json({
        message: 'Successfully created 3 compliance check records for ResponseTime variable',
        checks: createdChecks,
      }, { status: 201 });
    } catch (error: any) {
      console.error('Error creating compliance checks:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create compliance checks' },
        { status: 500 }
      );
    }
  })(req);
}

