import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import PasswordResetToken from '@/lib/db/models/PasswordResetToken';
import { sendEmailNotification } from '@/lib/services/notification';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'E-posta adresi gereklidir.' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return success message to prevent email enumeration
    // Don't reveal if email exists or not
    if (!user) {
      return NextResponse.json(
        { message: 'Eğer bu e-posta adresine kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi.' },
        { status: 200 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { message: 'Eğer bu e-posta adresine kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi.' },
        { status: 200 }
      );
    }

    // Invalidate any existing unused tokens for this user
    await PasswordResetToken.updateMany(
      { userId: user._id, used: false },
      { used: true }
    );

    // Generate new token
    const token = PasswordResetToken.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Save token to database
    await PasswordResetToken.create({
      userId: user._id,
      token,
      expiresAt,
      used: false,
    });

    // Generate reset link
    const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password/${token}`;

    // Send email
    const emailSubject = 'PapirAi - Şifre Sıfırlama';
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Şifre Sıfırlama Talebi</h2>
        <p>Merhaba ${user.name},</p>
        <p>Hesabınız için şifre sıfırlama talebinde bulundunuz. Aşağıdaki bağlantıya tıklayarak yeni şifrenizi belirleyebilirsiniz:</p>
        <p style="margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Şifremi Sıfırla
          </a>
        </p>
        <p>Veya aşağıdaki bağlantıyı tarayıcınıza kopyalayıp yapıştırabilirsiniz:</p>
        <p style="word-break: break-all; color: #666; font-size: 12px;">${resetLink}</p>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          <strong>Önemli:</strong> Bu bağlantı 1 saat geçerlidir. Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.
        </p>
        <p style="margin-top: 20px; color: #999; font-size: 11px;">
          Bu otomatik bir e-postadır, lütfen yanıtlamayın.
        </p>
      </div>
    `;

    try {
      await sendEmailNotification(
        user._id.toString(),
        user.email,
        emailSubject,
        emailBody
      );
    } catch (emailError: any) {
      console.error('[ForgotPassword] Email sending failed:', emailError);
      
      // Extract error message
      let errorMessage = emailError?.message || 'E-posta gönderilemedi.';
      
      // Check for Gmail App Password error
      if (emailError?.message?.includes('App Password') || emailError?.responseCode === 534) {
        errorMessage = 'Gmail App Password gerekiyor. Lütfen Google Hesabınızda App Password oluşturun ve SMTP_PASSWORD olarak kullanın. Normal şifre çalışmaz. Mail Ayarları sayfasındaki Gmail kılavuzunu takip edin.';
      }
      
      // Check if mail settings are configured
      const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
      
      if (!smtpConfigured) {
        return NextResponse.json(
          { 
            error: 'Mail ayarları yapılandırılmamış. Lütfen SMTP_HOST, SMTP_PORT, SMTP_USER ve SMTP_PASSWORD ortam değişkenlerini ayarlayın.',
            mailSettingsNotConfigured: true 
          },
          { status: 500 }
        );
      }
      
      // Mail settings configured but sending failed
      return NextResponse.json(
        { 
          error: errorMessage,
          mailError: true 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Eğer bu e-posta adresine kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[ForgotPassword] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Şifre sıfırlama talebi işlenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

