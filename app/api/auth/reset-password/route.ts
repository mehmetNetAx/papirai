import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import PasswordResetToken from '@/lib/db/models/PasswordResetToken';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    // Validate input
    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token ve yeni şifre gereklidir.' },
        { status: 400 }
      );
    }

    // Validate password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter olmalıdır.' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Find valid token
    const resetToken = await PasswordResetToken.findValidToken(token);

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı.' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findById(resetToken.userId);

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı.' },
        { status: 404 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Bu hesap aktif değil. Lütfen yöneticiye başvurun.' },
        { status: 403 }
      );
    }

    // Update password (will be hashed automatically by pre-save hook)
    user.password = newPassword;
    await user.save();

    // Mark token as used
    resetToken.used = true;
    await resetToken.save();

    return NextResponse.json(
      { message: 'Şifre başarıyla sıfırlandı.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[ResetPassword] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Şifre sıfırlama işlemi sırasında bir hata oluştu.' },
      { status: 500 }
    );
  }
}

// GET endpoint to validate token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token gereklidir.' },
        { status: 400 }
      );
    }

    await connectDB();

    const resetToken = await PasswordResetToken.findValidToken(token);

    if (!resetToken) {
      return NextResponse.json(
        { valid: false, error: 'Geçersiz veya süresi dolmuş token.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { valid: true },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[ResetPassword] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Token doğrulama sırasında bir hata oluştu.' },
      { status: 500 }
    );
  }
}

