/**
 * Script to update a single master variable by ID
 */

import connectDB from '../lib/db/connection';
import ContractVariable from '../lib/db/models/ContractVariable';
import mongoose from 'mongoose';

async function updateMasterVariable() {
  try {
    await connectDB();
    console.log('Connecting to database...');

    // Update the specific variable
    const variableId = '6925c0a08afa44e345f3fbb3';
    const result = await ContractVariable.findByIdAndUpdate(
      variableId,
      {
        $set: {
          isMaster: true,
          masterType: 'endDate',
        },
      },
      { new: true }
    );

    if (result) {
      console.log('Updated variable:', {
        _id: result._id,
        name: result.name,
        isMaster: result.isMaster,
        masterType: result.masterType,
      });
    } else {
      console.log('Variable not found');
    }

    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating master variable:', error);
    process.exit(1);
  }
}

updateMasterVariable();

