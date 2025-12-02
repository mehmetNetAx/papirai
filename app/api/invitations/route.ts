import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Invitation from '@/lib/db/models/Invitation';
import User from '@/lib/db/models/User';
import Contract from '@/lib/db/models/Contract';
import { sendEmailNotification } from '@/lib/services/notification';
import mongoose from 'mongoose';

// POST - Create invitation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can create invitations
    const isAdmin = ['system_admin', 'group_admin', 'company_admin'].includes(session.user.role);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { email, contractId, role = 'viewer' } = body;

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'E-posta adresi gereklidir.' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Geçersiz e-posta adresi.' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['viewer', 'contract_manager', 'legal_reviewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Geçersiz rol.' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu e-posta adresine kayıtlı bir kullanıcı zaten var.' },
        { status: 400 }
      );
    }

    // If contractId is provided, validate contract exists and user has access
    let contract = null;
    if (contractId) {
      contract = await Contract.findById(contractId).lean();
      if (!contract) {
        return NextResponse.json(
          { error: 'Sözleşme bulunamadı.' },
          { status: 404 }
        );
      }

      // Check if user can invite to this contract
      const { canEditContract } = await import('@/lib/utils/permissions');
      // Ensure allowedEditors is an array (handle Mongoose lean() results)
      let allowedEditors: (string | mongoose.Types.ObjectId)[] = [];
      const contractAllowedEditors = contract.allowedEditors as any;
      if (contractAllowedEditors) {
        if (Array.isArray(contractAllowedEditors)) {
          allowedEditors = contractAllowedEditors;
        } else {
          // Single value case - convert to array
          allowedEditors = [contractAllowedEditors];
        }
      }
      
      const canEdit = canEditContract(
        session.user,
        contract.companyId,
        contract.createdBy?.toString(),
        allowedEditors.length > 0 ? allowedEditors : undefined
      );

      if (!canEdit) {
        return NextResponse.json(
          { error: 'Bu sözleşmeye davet gönderme yetkiniz yok.' },
          { status: 403 }
        );
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await Invitation.findOne({
      email: email.toLowerCase().trim(),
      accepted: false,
      expiresAt: { $gt: new Date() },
      ...(contractId ? { contractId: new mongoose.Types.ObjectId(contractId) } : { contractId: { $exists: false } }),
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Bu e-posta adresine zaten bekleyen bir davet var.' },
        { status: 400 }
      );
    }

    // Generate token
    const token = Invitation.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Invitation expires in 7 days

    // Create invitation
    const invitation = await Invitation.create({
      email: email.toLowerCase().trim(),
      token,
      invitedBy: new mongoose.Types.ObjectId(session.user.id),
      companyId: new mongoose.Types.ObjectId(session.user.companyId),
      contractId: contractId ? new mongoose.Types.ObjectId(contractId) : undefined,
      role,
      expiresAt,
      accepted: false,
    });

    // Generate invitation link
    const invitationLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/accept-invitation/${token}`;

    // Get inviter name
    const inviter = await User.findById(session.user.id).select('name').lean();
    const inviterName = (inviter as any)?.name || 'Bir yönetici';

    // Send email
    const emailSubject = contractId 
      ? `PapirAi - Sözleşme Daveti: ${contract?.title || 'Sözleşme'}`
      : 'PapirAi - Platform Daveti';
    
    const emailBody = contractId
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Sözleşme Daveti</h2>
          <p>Merhaba,</p>
          <p><strong>${inviterName}</strong> sizi "${contract?.title || 'Bir sözleşme'}" sözleşmesine katılmak için davet ediyor.</p>
          <p>Aşağıdaki bağlantıya tıklayarak daveti kabul edebilir ve hesabınızı oluşturabilirsiniz:</p>
          <p style="margin: 30px 0;">
            <a href="${invitationLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Daveti Kabul Et
            </a>
          </p>
          <p>Veya aşağıdaki bağlantıyı tarayıcınıza kopyalayıp yapıştırabilirsiniz:</p>
          <p style="word-break: break-all; color: #666; font-size: 12px;">${invitationLink}</p>
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            <strong>Not:</strong> Bu davet 7 gün geçerlidir. Bu daveti kabul ettiğinizde, sadece bu sözleşmeyi görüntüleyebileceksiniz.
          </p>
          <p style="margin-top: 20px; color: #999; font-size: 11px;">
            Bu otomatik bir e-postadır, lütfen yanıtlamayın.
          </p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Platform Daveti</h2>
          <p>Merhaba,</p>
          <p><strong>${inviterName}</strong> sizi PapirAi platformuna katılmak için davet ediyor.</p>
          <p>Aşağıdaki bağlantıya tıklayarak daveti kabul edebilir ve hesabınızı oluşturabilirsiniz:</p>
          <p style="margin: 30px 0;">
            <a href="${invitationLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Daveti Kabul Et
            </a>
          </p>
          <p>Veya aşağıdaki bağlantıyı tarayıcınıza kopyalayıp yapıştırabilirsiniz:</p>
          <p style="word-break: break-all; color: #666; font-size: 12px;">${invitationLink}</p>
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            <strong>Not:</strong> Bu davet 7 gün geçerlidir. Bu daveti kabul ettiğinizde, görüntüleyici rolü ile sisteme dahil olacaksınız.
          </p>
          <p style="margin-top: 20px; color: #999; font-size: 11px;">
            Bu otomatik bir e-postadır, lütfen yanıtlamayın.
          </p>
        </div>
      `;

    try {
      await sendEmailNotification(
        session.user.id,
        email.toLowerCase().trim(),
        emailSubject,
        emailBody
      );
    } catch (emailError: any) {
      console.error('[Invitation] Email sending failed:', emailError);
      // Don't fail the invitation creation if email fails
    }

    return NextResponse.json(
      { 
        message: 'Davet başarıyla gönderildi.',
        invitationId: invitation._id.toString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Invitation] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Davet oluşturulurken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

// GET - List invitations (for admins)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can view invitations
    const isAdmin = ['system_admin', 'group_admin', 'company_admin'].includes(session.user.role);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'accepted', 'all'

    let query: any = {};

    // Filter by company for non-system admins
    if (session.user.role !== 'system_admin') {
      query.companyId = new mongoose.Types.ObjectId(session.user.companyId);
    }

    // Filter by status
    if (status === 'pending') {
      query.accepted = false;
      query.expiresAt = { $gt: new Date() };
    } else if (status === 'accepted') {
      query.accepted = true;
    }

    const invitations = await Invitation.find(query)
      .populate('invitedBy', 'name email')
      .populate('companyId', 'name')
      .populate('contractId', 'title')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ invitations }, { status: 200 });
  } catch (error: any) {
    console.error('[Invitation] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Davetler yüklenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

