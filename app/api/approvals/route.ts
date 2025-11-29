import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Approval from '@/lib/db/models/Approval';
import { requireAuth } from '@/lib/auth/middleware';
import { createApprovalWorkflow, approveContract, rejectContract } from '@/lib/services/approval';

// GET - List approvals
export async function GET(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const { searchParams } = new URL(req.url);
      const contractId = searchParams.get('contractId');
      const status = searchParams.get('status');

      let query: any = {};

      if (contractId) {
        query.contractId = contractId;
      } else if (user.role === 'system_admin') {
        // System admin sees all approvals
        // No filter needed
      } else {
        // Get user's pending approvals
        query.approverId = user.id;
      }

      if (status) {
        query.status = status;
      } else {
        query.status = 'pending';
      }

      const approvals = await Approval.find(query)
        .populate('contractId', 'title status')
        .populate('approverId', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json({ approvals });
    } catch (error) {
      console.error('Error fetching approvals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch approvals' },
        { status: 500 }
      );
    }
  })(req);
}

// POST - Create approval workflow
export async function POST(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const body = await req.json();
      const { contractId, workflow } = body;

      if (!contractId || !workflow) {
        return NextResponse.json(
          { error: 'Contract ID and workflow are required' },
          { status: 400 }
        );
      }

      const approvalIds = await createApprovalWorkflow(contractId, workflow);

      return NextResponse.json({ approvalIds }, { status: 201 });
    } catch (error: any) {
      console.error('Error creating approval workflow:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create approval workflow' },
        { status: 500 }
      );
    }
  })(req);
}

// PATCH - Approve or reject
export async function PATCH(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const body = await req.json();
      const { approvalId, action, comments } = body;

      if (!approvalId || !action) {
        return NextResponse.json(
          { error: 'Approval ID and action are required' },
          { status: 400 }
        );
      }

      if (action === 'approve') {
        await approveContract(approvalId, user.id, comments);
      } else if (action === 'reject') {
        await rejectContract(approvalId, user.id, comments);
      } else {
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
      }

      return NextResponse.json({ message: 'Approval processed' });
    } catch (error: any) {
      console.error('Error processing approval:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to process approval' },
        { status: 500 }
      );
    }
  })(req);
}

