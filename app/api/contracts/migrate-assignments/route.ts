import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import ContractUserAssignment from '@/lib/db/models/ContractUserAssignment';
import { requireAuth } from '@/lib/auth/middleware';
import mongoose from 'mongoose';

// POST - Migrate existing contract.assignedUsers to ContractUserAssignment table
export async function POST(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      // Only system admins can run migration
      if (user.role !== 'system_admin') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      await connectDB();

      // Find all contracts with assignedUsers
      const contracts = await Contract.find({
        assignedUsers: { $exists: true, $ne: [] },
      }).lean();

      let migrated = 0;
      let skipped = 0;
      let errors = 0;

      for (const contract of contracts) {
        const contractId = contract._id;
        const assignedUserIds = contract.assignedUsers || [];

        for (const userId of assignedUserIds) {
          try {
            const userIdObj = userId instanceof mongoose.Types.ObjectId 
              ? userId 
              : new mongoose.Types.ObjectId(userId);

            // Check if assignment already exists
            const existing = await ContractUserAssignment.findOne({
              contractId,
              userId: userIdObj,
              isActive: true,
            });

            if (existing) {
              skipped++;
              continue;
            }

            // Create new assignment
            await ContractUserAssignment.create({
              contractId,
              userId: userIdObj,
              assignedBy: contract.createdBy || new mongoose.Types.ObjectId(user.id),
              assignedAt: contract.createdAt || new Date(),
              isActive: true,
            });

            migrated++;
          } catch (error: any) {
            console.error(`Error migrating assignment for contract ${contractId}, user ${userId}:`, error);
            errors++;
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Migration completed',
        stats: {
          contractsProcessed: contracts.length,
          assignmentsMigrated: migrated,
          assignmentsSkipped: skipped,
          errors,
        },
      });
    } catch (error) {
      console.error('Error migrating assignments:', error);
      return NextResponse.json(
        { error: 'Failed to migrate assignments' },
        { status: 500 }
      );
    }
  })(req);
}

