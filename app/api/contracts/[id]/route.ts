import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Contract from '@/lib/db/models/Contract';
import { requireAuth } from '@/lib/auth/middleware';
import { canEditContract, canViewContract } from '@/lib/utils/permissions';
import { logAuditEvent } from '@/lib/services/audit';
import mongoose from 'mongoose';

// GET - Get single contract
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const contract = await Contract.findById(id)
        .populate('workspaceId', 'name')
        .populate('createdBy', 'name email')
        .lean();

      if (!contract) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      // Check if contract is active (unless user is assigned to it)
      const userId = new mongoose.Types.ObjectId(user.id);
      const assignedUsers = contract.assignedUsers || [];
      const isAssigned = assignedUsers.some((uid: any) => {
        const uidObj = uid instanceof mongoose.Types.ObjectId ? uid : new mongoose.Types.ObjectId(uid);
        return uidObj.equals(userId);
      });

      if (!contract.isActive && !isAssigned) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      // Extract companyId and workspaceId properly (handle both ObjectId and populated objects)
      const contractCompanyId = contract.companyId instanceof mongoose.Types.ObjectId
        ? contract.companyId
        : (contract.companyId as any)?._id || contract.companyId;
      
      const contractWorkspaceId = contract.workspaceId instanceof mongoose.Types.ObjectId
        ? contract.workspaceId
        : (contract.workspaceId as any)?._id || contract.workspaceId;

      // Check access using canViewContract
      const canView = await canViewContract(
        user,
        contractCompanyId,
        contractWorkspaceId,
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

      return NextResponse.json({ contract });
    } catch (error: any) {
      console.error('Error fetching contract:', error);
      console.error('Error stack:', error.stack);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch contract' },
        { status: 500 }
      );
    }
  })(req);
}

// PATCH - Update contract
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const contract = await Contract.findById(id);

      if (!contract || !contract.isActive) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      if (!canEditContract(user, contract.companyId, contract.createdBy.toString(), contract.allowedEditors)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      const body = await req.json();
      const updates: any = {};

      // Import status transition validation
      const { isValidTransition, getValidNextStatuses } = await import('@/lib/utils/contract-status');

      if (body.title !== undefined) updates.title = body.title;
      if (body.content !== undefined) updates.content = body.content;
      if (body.status !== undefined) {
        // Validate status transition
        const currentStatus = contract.status;
        const newStatus = body.status;
        
        if (currentStatus !== newStatus) {
          if (!isValidTransition(currentStatus, newStatus)) {
            const allowedTransitions = getValidNextStatuses(currentStatus);
            return NextResponse.json(
              { error: `Geçersiz durum geçişi: ${currentStatus} -> ${newStatus}. İzin verilen geçişler: ${allowedTransitions.join(', ')}` },
              { status: 400 }
            );
          }
        }
        updates.status = body.status;
      }
      if (body.contractType !== undefined) updates.contractType = body.contractType;
      if (body.counterparty !== undefined) updates.counterparty = body.counterparty;
      if (body.startDate !== undefined) updates.startDate = body.startDate;
      if (body.endDate !== undefined) updates.endDate = body.endDate;
      if (body.renewalDate !== undefined) updates.renewalDate = body.renewalDate;
      if (body.value !== undefined) updates.value = body.value;
      if (body.currency !== undefined) updates.currency = body.currency;
      if (body.tags !== undefined) updates.tags = body.tags;
      if (body.isActive !== undefined) updates.isActive = body.isActive;
      if (body.allowedEditors !== undefined) {
        // Convert string IDs to ObjectIds
        updates.allowedEditors = Array.isArray(body.allowedEditors)
          ? body.allowedEditors.map((id: string) => new mongoose.Types.ObjectId(id))
          : [];
      }

      // Store old status before updating
      const oldStatus = contract.status;

      Object.assign(contract, updates);
      await contract.save();

      // Determine important changes for notifications
      const importantChanges: string[] = [];
      if (updates.title !== undefined) importantChanges.push('Başlık');
      if (updates.status !== undefined && oldStatus !== updates.status) importantChanges.push('Durum');
      if (updates.endDate !== undefined) importantChanges.push('Bitiş Tarihi');
      if (updates.startDate !== undefined) importantChanges.push('Başlangıç Tarihi');
      if (updates.value !== undefined) importantChanges.push('Değer');
      if (updates.currency !== undefined) importantChanges.push('Para Birimi');

      // Send notifications to assigned users and allowed editors if there are important changes
      if (importantChanges.length > 0) {
        const { createContractUpdateNotification } = await import('@/lib/services/notification');
        const ContractUserAssignment = (await import('@/lib/db/models/ContractUserAssignment')).default;
        
        // Get assigned users from ContractUserAssignment table
        const assignments = await ContractUserAssignment.find({
          contractId: contract._id,
          isActive: true,
        }).select('userId').lean();

        const userIdsToNotify = new Set<string>();
        
        // Add assigned users
        assignments.forEach((assignment: any) => {
          userIdsToNotify.add(assignment.userId.toString());
        });

        // Add allowed editors
        if (contract.allowedEditors && contract.allowedEditors.length > 0) {
          contract.allowedEditors.forEach((editorId: any) => {
            userIdsToNotify.add(editorId.toString());
          });
        }

        // Remove the user who made the update (they don't need a notification)
        userIdsToNotify.delete(user.id);

        // Send notifications
        for (const userId of userIdsToNotify) {
          try {
            await createContractUpdateNotification(
              userId,
              contract._id.toString(),
              contract.title,
              user.id,
              importantChanges
            );
          } catch (error) {
            console.error(`Error sending notification to user ${userId}:`, error);
            // Continue with other users even if one fails
          }
        }
      }

      // Log audit event for status change
      if (updates.status !== undefined && oldStatus !== updates.status) {
        await logAuditEvent({
          userId: user.id,
          action: 'update_contract_status',
          resourceType: 'contract',
          resourceId: contract._id.toString(),
          details: { 
            title: contract.title,
            oldStatus: oldStatus,
            newStatus: updates.status,
          },
        });
      }

      // Log audit event for archive action
      if (updates.isActive === false) {
        await logAuditEvent({
          userId: user.id,
          action: 'archive_contract',
          resourceType: 'contract',
          resourceId: contract._id.toString(),
          details: { title: contract.title },
        });
      }

      // Automatically sync startDate and endDate as master variables if they were updated
      if (updates.startDate !== undefined || updates.endDate !== undefined) {
        try {
          const { setMasterVariable } = await import('@/lib/services/master-variables');
          
          if (updates.startDate !== undefined && contract.startDate) {
            await setMasterVariable(
              contract._id.toString(),
              'startDate',
              contract.startDate,
              'Başlangıç Tarihi'
            );
          }
          
          if (updates.endDate !== undefined && contract.endDate) {
            await setMasterVariable(
              contract._id.toString(),
              'endDate',
              contract.endDate,
              'Bitiş Tarihi'
            );
          }
        } catch (error) {
          console.error('Error syncing master variables:', error);
          // Don't fail the contract update if master variable setting fails
        }
      }

      await logAuditEvent({
        userId: user.id,
        action: 'update_contract',
        resourceType: 'contract',
        resourceId: contract._id.toString(),
        details: { updates },
      });

      return NextResponse.json({ contract });
    } catch (error) {
      console.error('Error updating contract:', error);
      return NextResponse.json(
        { error: 'Failed to update contract' },
        { status: 500 }
      );
    }
  })(req);
}

// DELETE - Delete contract
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      const { id } = await params;
      await connectDB();

      const contract = await Contract.findById(id);

      if (!contract || !contract.isActive) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        );
      }

      if (!canEditContract(user, contract.companyId, contract.createdBy?.toString(), contract.allowedEditors)) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      contract.isActive = false;
      await contract.save();

      await logAuditEvent({
        userId: user.id,
        action: 'delete_contract',
        resourceType: 'contract',
        resourceId: contract._id.toString(),
      });

      return NextResponse.json({ message: 'Contract deleted' });
    } catch (error) {
      console.error('Error deleting contract:', error);
      return NextResponse.json(
        { error: 'Failed to delete contract' },
        { status: 500 }
      );
    }
  })(req);
}
