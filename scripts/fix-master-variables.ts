/**
 * Script to fix existing master variables that don't have isMaster and masterType fields
 * Run this script to update existing records in the database
 */

import connectDB from '../lib/db/connection';
import ContractVariable from '../lib/db/models/ContractVariable';

async function fixMasterVariables() {
  try {
    await connectDB();
    console.log('Connecting to database...');

    // Find all variables that should be master variables based on their names
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

    // First, update by exact name match
    for (const [name, masterType] of Object.entries(masterVariableNames)) {
      const result = await ContractVariable.updateMany(
        {
          name: name,
          $or: [
            { isMaster: { $exists: false } },
            { isMaster: false },
            { masterType: { $exists: false } },
          ],
        },
        {
          $set: {
            isMaster: true,
            masterType: masterType,
          },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`Updated ${result.modifiedCount} records for ${name} (${masterType})`);
        updated += result.modifiedCount;
      }
    }

    // Also check for partial name matches
    for (const [name, masterType] of Object.entries(masterVariableNames)) {
      const result = await ContractVariable.updateMany(
        {
          name: { $regex: name, $options: 'i' },
          $or: [
            { isMaster: { $exists: false } },
            { isMaster: false },
            { masterType: { $exists: false } },
          ],
        },
        {
          $set: {
            isMaster: true,
            masterType: masterType,
          },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`Updated ${result.modifiedCount} records matching "${name}" (${masterType})`);
        updated += result.modifiedCount;
      }
    }

    // Also update any variables that have masterType but not isMaster
    const result2 = await ContractVariable.updateMany(
      {
        masterType: { $exists: true },
        $or: [
          { isMaster: { $exists: false } },
          { isMaster: false },
        ],
      },
      {
        $set: {
          isMaster: true,
        },
      }
    );

    if (result2.modifiedCount > 0) {
      console.log(`Updated ${result2.modifiedCount} records that had masterType but not isMaster`);
      updated += result2.modifiedCount;
    }

    console.log(`\nTotal records updated: ${updated}`);
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing master variables:', error);
    process.exit(1);
  }
}

fixMasterVariables();

