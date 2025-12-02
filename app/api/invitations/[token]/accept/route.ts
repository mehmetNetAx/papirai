import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Invitation from '@/lib/db/models/Invitation';
import User from '@/lib/db/models/User';
import ContractUserAssignment from '@/lib/db/models/ContractUserAssignment';
import mongoose from 'mongoose';

// POST - Accept invitation and create user account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    await connectDB();

    const { token } = await params;
    const body = await request.json();
    const { name, password } = body;

    // Validate input
    if (!name || !password) {
      return NextResponse.json(
        { error: 'İsim ve şifre gereklidir.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter olmalıdır.' },
        { status: 400 }
      );
    }

    // Find valid invitation
    const invitation = await Invitation.findValidInvitation(token);

    if (!invitation) {
      return NextResponse.json(
        { error: 'Geçersiz veya süresi dolmuş davet bağlantısı.' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: invitation.email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu e-posta adresine kayıtlı bir kullanıcı zaten var.' },
        { status: 400 }
      );
    }

    // Create user account
    const user = await User.create({
      email: invitation.email,
      password,
      name,
      role: invitation.role,
      companyId: invitation.companyId,
      isActive: true,
    });

    // If invitation is contract-specific, assign user to contract
    if (invitation.contractId) {
      await ContractUserAssignment.create({
        contractId: invitation.contractId,
        userId: user._id,
        assignedBy: invitation.invitedBy,
        isActive: true,
      });
    }

    // Mark invitation as accepted
    invitation.accepted = true;
    invitation.acceptedAt = new Date();
    invitation.acceptedBy = user._id;
    await invitation.save();

    return NextResponse.json(
      { 
        message: 'Davet başarıyla kabul edildi. Hesabınız oluşturuldu.',
        userId: user._id.toString(),
        contractId: invitation.contractId?.toString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[AcceptInvitation] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Davet kabul edilirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

// GET - Get invitation details (for validation)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    await connectDB();

    const { token } = await params;

    const invitation = await Invitation.findValidInvitation(token);

    if (!invitation) {
      return NextResponse.json(
        { valid: false, error: 'Geçersiz veya süresi dolmuş davet bağlantısı.' },
        { status: 400 }
      );
    }

    // Populate related data
    await invitation.populate('invitedBy', 'name');
    await invitation.populate('companyId', 'name');
    if (invitation.contractId) {
      await invitation.populate('contractId', 'title');
    }

    return NextResponse.json(
      { 
        valid: true,
        email: invitation.email,
        role: invitation.role,
        companyName: (invitation.companyId as any).name,
        contractTitle: invitation.contractId ? (invitation.contractId as any).title : null,
        invitedByName: (invitation.invitedBy as any).name,
        expiresAt: invitation.expiresAt,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[AcceptInvitation] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Davet bilgileri alınırken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

