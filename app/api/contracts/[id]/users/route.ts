import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import User from '@/lib/db/models/User';
import ContractUserAssignment from '@/lib/db/models/ContractUserAssignment';
import { requireAuth } from '@/lib/auth/middleware';
import { canEditContract } from '@/lib/utils/permissions';
import { logAuditEvent } from '@/lib/services/audit';
import mongoose from 'mongoose';

// GET - Get assigned users for a contract
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const contract = await Contract.findById(id).lean();

      if (!contract) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      // Check if user can view this contract
      const { canViewContract } = await import('@/lib/utils/permissions');
      const canView = await canViewContract(
        user,
        contract.companyId,
        contract.workspaceId,
        contract.createdBy?.toString(),
        contract.allowedEditors,
        contract.assignedUsers,
        id // contractId for checking ContractUserAssignment table
      );

      if (!canView) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      // Get assigned users from ContractUserAssignment table
      const contractId = new mongoose.Types.ObjectId(id);
      const assignments = await ContractUserAssignment.find({
        contractId,
        isActive: true,
      })
        .populate('userId', 'name email companyId')
        .populate('assignedBy', 'name email')
        .lean();

      const assignedUsers = assignments
        .map((assignment: any) => {
          const user = assignment.userId;
          if (!user) return null;
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            companyId: user.companyId?._id?.toString() || user.companyId?.toString(),
            companyName: (user.companyId as any)?.name || '',
            assignedAt: assignment.assignedAt,
            assignedBy: assignment.assignedBy ? {
              id: assignment.assignedBy._id.toString(),
              name: assignment.assignedBy.name,
              email: assignment.assignedBy.email,
            } : null,
          };
        })
        .filter(Boolean);

      // Get allowed editors (still from contract.allowedEditors)
      const allowedEditorIds = contract.allowedEditors || [];
      const allowedEditors = await User.find({
        _id: { $in: allowedEditorIds },
      })
        .select('_id name email companyId')
        .populate('companyId', 'name')
        .lean();

      return NextResponse.json({
        assignedUsers,
        allowedEditors: allowedEditors.map((u: any) => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          companyId: u.companyId?._id?.toString() || u.companyId?.toString(),
          companyName: (u.companyId as any)?.name || '',
        })),
      });
    } catch (error) {
      console.error('Error fetching contract users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch contract users' },
        { status: 500 }
      );
    }
  })(req);
}

// POST - Add user to contract (assignedUsers)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const body = await req.json();
      const { userId } = body;

      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }

      const contract = await Contract.findById(id);

      if (!contract) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      // Check if user can edit this contract
      if (!canEditContract(user, contract.companyId, contract.createdBy?.toString(), contract.allowedEditors)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const contractId = new mongoose.Types.ObjectId(id);

      // Check if user is already assigned (active assignment)
      const existingAssignment = await ContractUserAssignment.findOne({
        contractId,
        userId: userObjectId,
        isActive: true,
      });

      if (existingAssignment) {
        return NextResponse.json(
          { error: 'User is already assigned to this contract' },
          { status: 400 }
        );
      }

      // Create new assignment in ContractUserAssignment table
      await ContractUserAssignment.create({
        contractId,
        userId: userObjectId,
        assignedBy: new mongoose.Types.ObjectId(user.id),
        assignedAt: new Date(),
        isActive: true,
      });

      // Also update contract.assignedUsers for backward compatibility (optional, can be removed later)
      if (!contract.assignedUsers) {
        contract.assignedUsers = [];
      }
      if (!contract.assignedUsers.some((uid: any) => {
        const uidObj = uid instanceof mongoose.Types.ObjectId ? uid : new mongoose.Types.ObjectId(uid);
        return uidObj.equals(userObjectId);
      })) {
        contract.assignedUsers.push(userObjectId);
        await contract.save();
      }

      // Create notification for assigned user (don't fail if notification creation fails)
      try {
        const { createContractAssignmentNotification } = await import('@/lib/services/notification');
        await createContractAssignmentNotification(
          userId,
          id,
          contract.title,
          user.id
        );
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Continue even if notification creation fails
      }

      await logAuditEvent({
        userId: user.id,
        action: 'assign_user_to_contract',
        resourceType: 'contract',
        resourceId: contract._id.toString(),
        details: {
          assignedUserId: userId,
          contractTitle: contract.title,
        },
      });

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Error assigning user to contract:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to assign user to contract' },
        { status: 500 }
      );
    }
  })(req);
}

// DELETE - Remove user from contract (assignedUsers)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      const { searchParams } = new URL(req.url);
      const userId = searchParams.get('userId');

      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }

      await connectDB();

      const contract = await Contract.findById(id);

      if (!contract) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      // Check if user can edit this contract
      if (!canEditContract(user, contract.companyId, contract.createdBy?.toString(), contract.allowedEditors)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const contractId = new mongoose.Types.ObjectId(id);

      // Deactivate assignment in ContractUserAssignment table (soft delete)
      const assignment = await ContractUserAssignment.findOne({
        contractId,
        userId: userObjectId,
        isActive: true,
      });

      if (assignment) {
        assignment.isActive = false;
        await assignment.save();
      }

      // Also update contract.assignedUsers for backward compatibility (optional, can be removed later)
      if (contract.assignedUsers) {
        contract.assignedUsers = contract.assignedUsers.filter((uid: any) => {
          const uidObj = uid instanceof mongoose.Types.ObjectId ? uid : new mongoose.Types.ObjectId(uid);
          return !uidObj.equals(userObjectId);
        });
        await contract.save();
      }

      await logAuditEvent({
        userId: user.id,
        action: 'remove_user_from_contract',
        resourceType: 'contract',
        resourceId: contract._id.toString(),
        details: {
          removedUserId: userId,
          contractTitle: contract.title,
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error removing user from contract:', error);
      return NextResponse.json(
        { error: 'Failed to remove user from contract' },
        { status: 500 }
      );
    }
  })(req);
}

