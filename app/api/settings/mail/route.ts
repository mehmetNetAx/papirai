import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import nodemailer from 'nodemailer';

// GET - Check mail settings status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can check mail settings
    if (!['system_admin', 'group_admin'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM;

    const isConfigured = !!(smtpHost && smtpPort && smtpUser && smtpPassword);

    // Try to verify connection if configured
    let connectionStatus = 'not_configured';
    let connectionError = null;

    if (isConfigured) {
      try {
        const testTransporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort || '587'),
          secure: false,
          auth: {
            user: smtpUser,
            pass: smtpPassword,
          },
        });

        await testTransporter.verify();
        connectionStatus = 'connected';
      } catch (error: any) {
        connectionStatus = 'error';
        
        // Check for Gmail App Password error
        if (error?.responseCode === 534 || error?.response?.includes('Application-specific password required')) {
          connectionError = 'Gmail App Password gerekiyor. Normal şifre çalışmaz. Lütfen Google Hesabınızda App Password oluşturun ve SMTP_PASSWORD olarak kullanın.';
        } else if (error?.code === 'EAUTH') {
          connectionError = `SMTP kimlik doğrulama hatası: ${error?.response || error?.message || 'Geçersiz kullanıcı adı veya şifre'}`;
        } else {
          connectionError = error.message || 'Bağlantı hatası';
        }
      }
    }

    return NextResponse.json({
      configured: isConfigured,
      connectionStatus,
      connectionError,
      settings: {
        host: smtpHost || '',
        port: smtpPort || '587',
        user: smtpUser ? `${smtpUser.substring(0, 3)}***` : '', // Masked
        from: smtpFrom || 'noreply@papirai.com',
      },
    });
  } catch (error: any) {
    console.error('[MailSettings] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Mail ayarları kontrol edilirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

// POST - Test mail sending
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can test mail
    if (!['system_admin', 'group_admin'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test e-posta adresi gereklidir.' },
        { status: 400 }
      );
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || 'noreply@papirai.com';

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      return NextResponse.json(
        { error: 'Mail ayarları yapılandırılmamış.' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: testEmail,
      subject: 'PapirAi - Test E-postası',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Test E-postası</h2>
          <p>Bu bir test e-postasıdır. Mail ayarlarınız doğru yapılandırılmış!</p>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            Gönderim zamanı: ${new Date().toLocaleString('tr-TR')}
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'Test e-postası başarıyla gönderildi.',
    });
  } catch (error: any) {
    console.error('[MailSettings] Test error:', error);
    
    let errorMessage = 'Test e-postası gönderilirken bir hata oluştu.';
    
    // Check for Gmail App Password error
    if (error?.responseCode === 534 || error?.response?.includes('Application-specific password required')) {
      errorMessage = 'Gmail App Password gerekiyor. Normal şifre çalışmaz. Lütfen Google Hesabınızda App Password oluşturun ve SMTP_PASSWORD olarak kullanın. Mail Ayarları sayfasındaki Gmail kılavuzunu takip edin.';
    } else if (error?.code === 'EAUTH') {
      errorMessage = `SMTP kimlik doğrulama hatası: ${error?.response || error?.message || 'Geçersiz kullanıcı adı veya şifre'}`;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}


