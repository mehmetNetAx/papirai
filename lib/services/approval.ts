import connectDB from '@/lib/db/connection';
import Approval from '@/lib/db/models/Approval';
import Contract from '@/lib/db/models/Contract';
import User from '@/lib/db/models/User';
import Notification from '@/lib/db/models/Notification';

export interface ApprovalWorkflow {
  type: 'sequential' | 'parallel';
  approvers: string[]; // User IDs
  requiredApprovals?: number; // For parallel workflows
}

export async function createApprovalWorkflow(
  contractId: string,
  workflow: ApprovalWorkflow
): Promise<string[]> {
  await connectDB();

  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw new Error('Contract not found');
  }

  const approvalIds: string[] = [];

  if (workflow.type === 'sequential') {
    // Create approvals in sequence
    for (let i = 0; i < workflow.approvers.length; i++) {
      const approval = await Approval.create({
        contractId,
        approverId: workflow.approvers[i],
        status: i === 0 ? 'pending' : 'pending', // First one is active
        workflowStep: i + 1,
        workflowType: 'sequential',
      });
      approvalIds.push(approval._id.toString());

      // Notify first approver
      if (i === 0) {
        await Notification.create({
          userId: workflow.approvers[i],
          type: 'approval_request',
          message: `Contract "${contract.title}" requires your approval`,
          relatedResourceType: 'approval',
          relatedResourceId: approval._id,
        });
      }
    }
  } else {
    // Parallel approvals
    const required = workflow.requiredApprovals || workflow.approvers.length;

    for (const approverId of workflow.approvers) {
      const approval = await Approval.create({
        contractId,
        approverId,
        status: 'pending',
        workflowStep: 1,
        workflowType: 'parallel',
        requiredApprovals: required,
      });
      approvalIds.push(approval._id.toString());

      // Notify all approvers
      await Notification.create({
        userId: approverId,
        type: 'approval_request',
        message: `Contract "${contract.title}" requires your approval`,
        relatedResourceType: 'approval',
        relatedResourceId: approval._id,
      });
    }
  }

  // Update contract status
  contract.status = 'pending_approval';
  await contract.save();

  return approvalIds;
}

export async function approveContract(
  approvalId: string,
  userId: string,
  comments?: string
): Promise<void> {
  await connectDB();

  const approval = await Approval.findById(approvalId);
  if (!approval || approval.approverId.toString() !== userId) {
    throw new Error('Approval not found or unauthorized');
  }

  if (approval.status !== 'pending') {
    throw new Error('Approval already processed');
  }

  approval.status = 'approved';
  approval.comments = comments;
  approval.approvedAt = new Date();
  await approval.save();

  const contract = await Contract.findById(approval.contractId);

  if (approval.workflowType === 'sequential') {
    // Check if there's a next approval
    const nextApproval = await Approval.findOne({
      contractId: approval.contractId,
      workflowStep: approval.workflowStep + 1,
      status: 'pending',
    });

    if (nextApproval) {
      // Notify next approver
      await Notification.create({
        userId: nextApproval.approverId.toString(),
        type: 'approval_request',
        message: `Contract "${contract?.title}" requires your approval`,
        relatedResourceType: 'approval',
        relatedResourceId: nextApproval._id,
      });
    } else {
      // All approvals complete
      if (contract) {
        contract.status = 'approved';
        await contract.save();
      }
    }
  } else {
    // Parallel workflow - check if enough approvals
    const approvedCount = await Approval.countDocuments({
      contractId: approval.contractId,
      status: 'approved',
    });

    if (contract && approvedCount >= (approval.requiredApprovals || 0)) {
      contract.status = 'approved';
      await contract.save();
    }
  }

  // Notify contract creator
  if (contract) {
    await Notification.create({
      userId: contract.createdBy.toString(),
      type: 'approval_decision',
      message: `Your contract "${contract.title}" was approved`,
      relatedResourceType: 'contract',
      relatedResourceId: contract._id,
    });
  }
}

export async function rejectContract(
  approvalId: string,
  userId: string,
  comments?: string
): Promise<void> {
  await connectDB();

  const approval = await Approval.findById(approvalId);
  if (!approval || approval.approverId.toString() !== userId) {
    throw new Error('Approval not found or unauthorized');
  }

  approval.status = 'rejected';
  approval.comments = comments;
  await approval.save();

  const contract = await Contract.findById(approval.contractId);
  if (contract) {
    contract.status = 'draft';
    await contract.save();

    await Notification.create({
      userId: contract.createdBy.toString(),
      type: 'approval_decision',
      message: `Your contract "${contract.title}" was rejected`,
      relatedResourceType: 'contract',
      relatedResourceId: contract._id,
    });
  }
}

