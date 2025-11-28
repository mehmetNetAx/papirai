import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import ContractVariable from '@/lib/db/models/ContractVariable';
import { requireAuth } from '@/lib/auth/middleware';
import mongoose from 'mongoose';

// POST - Fix existing master variables by adding isMaster and masterType fields
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const contractObjectId = new mongoose.Types.ObjectId(id);

      // Master variable name mappings
      const masterVariableNames: Record<string, string> = {
        'Bitiş Tarihi': 'endDate',
        'Başlangıç Tarihi': 'startDate',
        'Fesih Süresi': 'terminationPeriod',
        'Fesih İçin Son Tarih': 'terminationDeadline',
        'Sözleşme Tutarı': 'contractValue',
        'Para Birimi': 'currency',
        'Yenileme Tarihi': 'renewalDate',
        'Karşı Taraf': 'counterparty',
        'Sözleşme Tipi': 'contractType',
      };

      let updated = 0;
      const updates: any[] = [];

      // First, find all variables for this contract to debug
      const allVariables = await ContractVariable.find({
        contractId: contractObjectId,
      }).lean();
      console.log(`Found ${allVariables.length} total variables for contract ${id}`);
      console.log('Variable names:', allVariables.map(v => ({ name: v.name, isMaster: v.isMaster, masterType: v.masterType })));

      // Update by exact name match
      for (const [name, masterType] of Object.entries(masterVariableNames)) {
        const query = {
          contractId: contractObjectId,
          name: name,
          $or: [
            { isMaster: { $exists: false } },
            { isMaster: false },
            { masterType: { $exists: false } },
          ],
        };
        
        console.log(`Checking for variable: ${name} (${masterType})`);
        console.log('Query:', JSON.stringify(query, null, 2));
        
        const matchingVars = await ContractVariable.find(query).lean();
        console.log(`Found ${matchingVars.length} matching variables`);
        
        const result = await ContractVariable.updateMany(
          query,
          {
            $set: {
              isMaster: true,
              masterType: masterType,
            },
          }
        );

        console.log(`Update result for ${name}:`, {
          matched: result.matchedCount,
          modified: result.modifiedCount,
        });

        if (result.modifiedCount > 0) {
          updates.push({ name, masterType, count: result.modifiedCount });
          updated += result.modifiedCount;
        }
      }
      
      // Also try to update any variable that matches the name pattern but might have different casing
      const result2 = await ContractVariable.updateMany(
        {
          contractId: contractObjectId,
          name: { $regex: 'Bitiş Tarihi', $options: 'i' },
          $or: [
            { isMaster: { $exists: false } },
            { isMaster: false },
            { masterType: { $exists: false } },
          ],
        },
        {
          $set: {
            isMaster: true,
            masterType: 'endDate',
          },
        }
      );
      
      if (result2.modifiedCount > 0) {
        console.log(`Updated ${result2.modifiedCount} variables with regex match`);
        updated += result2.modifiedCount;
      }

      // Force update ALL variables with matching names regardless of current state
      for (const [name, masterType] of Object.entries(masterVariableNames)) {
        const forceResult = await ContractVariable.updateMany(
          {
            contractId: contractObjectId,
            name: name,
          },
          {
            $set: {
              isMaster: true,
              masterType: masterType,
            },
          }
        );
        
        if (forceResult.modifiedCount > 0) {
          console.log(`Force updated ${forceResult.modifiedCount} variables for ${name}`);
          // Don't double count
          const alreadyCounted = updates.some(u => u.name === name);
          if (!alreadyCounted) {
            updated += forceResult.modifiedCount;
            updates.push({ name, masterType, count: forceResult.modifiedCount, forced: true });
          }
        }
      }

      // Verify the updates
      const afterUpdate = await ContractVariable.find({
        contractId: contractObjectId,
        isMaster: true,
      }).lean();
      console.log(`After update, found ${afterUpdate.length} master variables`);

      return NextResponse.json({
        success: true,
        updated,
        updates,
        message: `Updated ${updated} master variable(s)`,
        verified: afterUpdate.length,
      });
    } catch (error: any) {
      console.error('Error fixing master variables:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fix master variables' },
        { status: 500 }
      );
    }
  })(req);
}

