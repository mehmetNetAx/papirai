import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import ComplianceCheck from '@/lib/db/models/ComplianceCheck';
import { requireAuth } from '@/lib/auth/middleware';
import { checkCompliance, getComplianceChecks, resolveComplianceCheck } from '@/lib/services/compliance';

// GET - List compliance checks
export async function GET(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const { searchParams } = new URL(req.url);
      const contractId = searchParams.get('contractId');
      const status = searchParams.get('status');

      let checks;

      if (contractId) {
        checks = await getComplianceChecks(contractId);
      } else {
        // System admin sees all compliance checks
        const query: any = {};
        if (status) {
          query.status = status;
        }
        // No additional filtering for system admin - they see all checks
        checks = await ComplianceCheck.find(query)
          .populate('contractId', 'title')
          .populate('variableId', 'name type')
          .sort({ checkedAt: -1 })
          .limit(100)
          .lean();
      }

      return NextResponse.json({ checks });
    } catch (error) {
      console.error('Error fetching compliance checks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch compliance checks' },
        { status: 500 }
      );
    }
  })(req);
}

// POST - Create compliance check
export async function POST(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const body = await req.json();
      const checkId = await checkCompliance(body);

      return NextResponse.json({ checkId }, { status: 201 });
    } catch (error: any) {
      console.error('Error creating compliance check:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create compliance check' },
        { status: 500 }
      );
    }
  })(req);
}

// PATCH - Resolve compliance check
export async function PATCH(req: NextRequest) {
  return requireAuth(async (req: NextRequest, user) => {
    try {
      await connectDB();

      const body = await req.json();
      const { checkId, resolutionNotes } = body;

      if (!checkId) {
        return NextResponse.json(
          { error: 'Check ID is required' },
          { status: 400 }
        );
      }

      const check = await resolveComplianceCheck(checkId, user.id, resolutionNotes);

      return NextResponse.json({ check });
    } catch (error: any) {
      console.error('Error resolving compliance check:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to resolve compliance check' },
        { status: 500 }
      );
    }
  })(req);
}

